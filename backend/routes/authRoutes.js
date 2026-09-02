const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

async function sendOtpEmail(toEmail, otp, subject = "Your SmartSense verification code") {
  const text = `Your SmartSense verification code is ${otp}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">SmartSense</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Smart Classroom Management</p>
      </div>
      <div style="padding: 24px; background-color: #f8fafc; border-radius: 10px; text-align: center; border: 1px solid #eef2f6;">
        <p style="font-size: 15px; color: #1e293b; margin: 0 0 14px 0;">Your verification code is:</p>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; padding: 8px 0;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #64748b; margin: 14px 0 0 0;">This code expires in <strong>10 minutes</strong>.</p>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center;">If you did not request this verification code, please ignore this email.</p>
    </div>
  `;
  return sendEmail(toEmail, subject, text, html);
}

function emailDelivered(emailResult) {
  return emailResult && emailResult.success === true && !emailResult.skipped;
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

    console.log(`[SmartSense OTP] Password reset code for ${normalizedEmail}: ${otp}`);

    const emailResult = await sendOtpEmail(
      normalizedEmail,
      otp,
      "Your SmartSense password reset code"
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
      if (existingUser.emailVerified) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      // Existing unverified account: update user credentials and issue fresh OTP
      if (role === "student" && studentId) {
        const idConflict = await Student.findOne({ studentId, email: { $ne: normalizedEmail } });
        if (idConflict) {
          return res.status(409).json({ error: "This student ID is already registered to another account" });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.role = role;
      existingUser.studentId = role === "student" ? studentId.trim() : undefined;
      existingUser.otpCode = otp;
      existingUser.otpExpiry = otpExpiry;
      existingUser.emailVerified = false;
      await existingUser.save();

      console.log(`[SmartSense OTP] Fresh registration OTP for unverified ${normalizedEmail}: ${otp}`);
      const emailResult = await sendOtpEmail(normalizedEmail, otp);
      const emailActuallySent = emailDelivered(emailResult);

      return res.status(200).json({
        message: emailActuallySent
          ? "Verification code sent to your email."
          : "Account created, but we couldn't send the verification email right now. Use 'Resend Code' on the next screen to try again.",
        email: normalizedEmail,
        role: existingUser.role,
      });
    }

    if (role === "student") {
      const existingStudentId = await Student.findOne({ studentId });
      if (existingStudentId) {
        return res.status(409).json({ error: "This student ID is already registered" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const student = await Student.create({
      name: name.trim(),
      studentId: role === "student" ? studentId.trim() : undefined,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      otpCode: otp,
      otpExpiry,
      emailVerified: false,
    });

    console.log(`[SmartSense OTP] Registration OTP for ${normalizedEmail}: ${otp}`);
    const emailResult = await sendOtpEmail(normalizedEmail, otp);
    const emailActuallySent = emailDelivered(emailResult);

    res.status(201).json({
      message: emailActuallySent
        ? "Account created. Check your email for the verification code."
        : "Account created, but we couldn't send the verification email right now. Use 'Resend Code' on the next screen to try again.",
      email: normalizedEmail,
      role: student.role,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(409).json({ error: `This ${field} is already in use` });
    }
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
      return res.status(200).json({ message: "Email already verified", alreadyVerified: true });
    }

    const otp = generateOtp();
    student.otpCode = otp;
    student.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await student.save();

    console.log(`[SmartSense OTP] Resent registration OTP for ${normalizedEmail}: ${otp}`);
    const emailResult = await sendOtpEmail(normalizedEmail, otp);

    if (!emailDelivered(emailResult)) {
      console.error("Failed to send OTP email:", emailResult.error || "email skipped");
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

    if (!student.emailVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in"
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const otp = generateOtp();
    student.loginOtp = otp;
    student.loginOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await student.save();

    console.log(`[SmartSense OTP] Login OTP for ${normalizedEmail}: ${otp}`);
    const emailResult = await sendOtpEmail(
      normalizedEmail,
      otp,
      "Your SmartSense login code"
    );
    if (!emailDelivered(emailResult)) {
      console.error("Failed to send login OTP email:", emailResult.error || "email skipped");
      return res.status(502).json({ error: "Couldn't send the login code. Please try again in a moment." });
    }

    res.json({
      requiresOtp: true,
      email: normalizedEmail,
      message: "Check your email for the login code.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ---- Verify login OTP ----
router.post("/verify-login-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "email and otp are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student || !student.loginOtp || !student.loginOtpExpiry) {
      return res.status(400).json({ error: "No pending login code. Please sign in again." });
    }

    if (student.loginOtpExpiry < new Date()) {
      return res.status(400).json({ error: "Code has expired. Please sign in again." });
    }

    if (student.loginOtp !== otp) {
      return res.status(400).json({ error: "Incorrect code" });
    }

    student.loginOtp = undefined;
    student.loginOtpExpiry = undefined;
    await student.save();

    const token = generateToken(student);
    res.json({
      message: "Login verified",
      token,
      user: { id: student._id, name: student.name, email: student.email, role: student.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login verification" });
  }
});

// ---- Resend login OTP ----
router.post("/resend-login-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student || !student.loginOtp) {
      return res.status(400).json({ error: "No pending login. Please sign in again." });
    }

    const otp = generateOtp();
    student.loginOtp = otp;
    student.loginOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await student.save();

    console.log(`[SmartSense OTP] Resent login OTP for ${normalizedEmail}: ${otp}`);
    const emailResult = await sendOtpEmail(normalizedEmail, otp, "Your SmartSense login code");
    if (!emailDelivered(emailResult)) {
      console.error("Failed to send login OTP email:", emailResult.error || "email skipped");
      return res.status(502).json({ error: "Couldn't send the login code. Please try again in a moment." });
    }

    res.json({ message: "New login code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while resending login code" });
  }
});

module.exports = router;