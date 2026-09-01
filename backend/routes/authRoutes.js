const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

async function sendOtpEmail(toEmail, otp) {
  return sendEmail(
    toEmail,
    "Your SmartSense verification code",
    `Your SmartSense verification code is ${otp}. It expires in 10 minutes.`
  );
}

// ---- Forgot Password: Step 1 - request a reset code ----
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: "email and role are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail, role });

    if (!student) {
      // Don't reveal whether the account exists - just say "sent" either way
      return res.status(200).json({ message: "If an account exists, a reset code has been sent." });
    }
    const otp = generateOtp();
    student.resetOtp = otp;
    student.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await student.save();

    const emailResult = await sendEmail(
      normalizedEmail,
      "Your SmartSense password reset code",
      `Your password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`
    );

    if (!emailResult.success && !emailResult.skipped) {
      console.error("Failed to send reset email:", emailResult.error);
    }

    res.status(200).json({ message: "If an account exists, a reset code has been sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while processing your request" });
  }
});

// ---- Forgot Password: Step 2 - verify code + set new password ----
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "email, otp and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student || !student.resetOtp || !student.resetOtpExpiry) {
      return res.status(400).json({ error: "No pending reset request. Please request a new code." });
    }

    if (new Date() > student.resetOtpExpiry) {
      return res.status(400).json({ error: "Code has expired. Please request a new one." });
    }

    if (student.resetOtp !== otp) {
      return res.status(400).json({ error: "Incorrect code. Please try again." });
    }

    student.password = await bcrypt.hash(newPassword, 10);
    student.resetOtp = undefined;
    student.resetOtpExpiry = undefined;
    await student.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while resetting password" });
  }
});

// ---- Register ----
router.post("/register", async (req, res) => {
  try {
    const { name, studentId, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "name, email, password and role are required" });
    }

    if (role === "student" && !studentId) {
      return res.status(400).json({ error: "studentId is required for student registration" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await Student.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = role === "student"
      ? generateOtp()
      : undefined;

    const otpExpiry = role === "student"
      ? new Date(Date.now() + 10 * 60 * 1000)
      : undefined;

    const student = await Student.create({
      name,
      studentId: role === "student" ? studentId : undefined,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      otpCode: otp,
      otpExpiry,
      emailVerified: role === "teacher",
    });

    let emailResult = { success: true };
    if (role === "student") {
      emailResult = await sendOtpEmail(normalizedEmail, otp);
      if (!emailResult.success && !emailResult.skipped) {
        console.error("Failed to send OTP email:", emailResult.error);
      }
    }

    const emailActuallySent = role === "student" ? (emailResult.success === true) : true;

    res.status(201).json({
      message: role === "student"
        ? (emailActuallySent
            ? "Account created. Check your email for the verification code."
            : "Account created, but we couldn't send the verification email right now. Use 'Resend Code' on the next screen to try again.")
        : "Teacher account created successfully. You can now log in.",
      email: normalizedEmail,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// ---- Verify OTP ----
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "email and otp are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    if (student.emailVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    if (!student.otpCode || !student.otpExpiry) {
      return res.status(400).json({ error: "No pending verification for this account. Please resend code." });
    }

    if (student.otpExpiry < new Date()) {
      return res.status(400).json({ error: "Code has expired. Please resend code." });
    }

    if (student.otpCode !== otp) {
      return res.status(400).json({ error: "Incorrect code" });
    }

    student.emailVerified = true;
    student.otpCode = undefined;
    student.otpExpiry = undefined;
    await student.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during verification" });
  }
});

// ---- Resend OTP ----
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    if (student.emailVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    const otp = generateOtp();
    student.otpCode = otp;
    student.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await student.save();

    const emailResult = await sendOtpEmail(normalizedEmail, otp);

    if (!emailResult.success && !emailResult.skipped) {
      console.error("Failed to send OTP email:", emailResult.error);
      return res.status(502).json({ error: "Couldn't send the code right now. Please try again in a moment." });
    }

    res.json({ message: "New code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while resending code" });
  }
});

// ---- Login ----
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "email, password and role are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student || student.role !== role) {
      return res.status(401).json({ error: "Invalid credentials for this role" });
    }

    if (role === "student" && !student.emailVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in"
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(student);
    res.json({
      token,
      user: { id: student._id, name: student.name, email: student.email, role: student.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;