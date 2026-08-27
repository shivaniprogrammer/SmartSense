const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Student = require("../models/Student");
const generateToken = require("../utils/generateToken");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 8000,
});
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"SmartSense" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your verification code",
    text: `Your SmartSense verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your SmartSense verification code is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`,
  });
}

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
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const student = await Student.create({
      name,
      studentId: role === "student" ? studentId : undefined,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      otpCode: otp,
      otpExpiry,
      emailVerified: false,
    });

    try {
      await sendOtpEmail(normalizedEmail, otp);
    } catch (mailErr) {
      console.error("Failed to send OTP email:", mailErr.message);
      // Account is still created; user can use "resend code" once mail issue is fixed
    }

    res.status(201).json({
      message: "Account created. Check your email for the verification code.",
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

    await sendOtpEmail(normalizedEmail, otp);

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
      return res.status(403).json({ error: "Please verify your email before logging in" });
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