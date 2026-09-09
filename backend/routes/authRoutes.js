const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const SUBJECTS = require("../constants/subjects");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const { requireAuth } = require("../middleware/auth");

const CLASS_COORDINATOR_LABEL = "Class Coordinator";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

async function sendOtpEmail(toEmail, otp) {
  const text = `Your SmartSense verification code is ${otp}. It expires in 10 minutes.`;
  const html = `<p>Your SmartSense verification code is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`;
  return sendEmail(toEmail, "Your verification code", text, html);
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

    const emailResult = await sendOtpEmail(normalizedEmail, otp);
    if (!emailResult.success && !emailResult.skipped) {
      console.error("Failed to send OTP email:", emailResult.error);
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

    const emailResult = await sendOtpEmail(normalizedEmail, otp);
    if (!emailResult.success && !emailResult.skipped) {
      console.error("Failed to resend OTP email:", emailResult.error);
      return res.status(502).json({ error: "Couldn't send the code right now. Please try again in a moment." });
    }

    res.json({ message: "New code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while resending code" });
  }
});

// ---- List available subjects + Class Coordinator option ----
router.get("/subjects", async (req, res) => {
  res.json({ subjects: SUBJECTS, coordinatorOption: CLASS_COORDINATOR_LABEL });
});

// ---- Teacher selects faculty role (Coordinator vs Other Faculty Teacher) ----
router.post("/select-faculty-role", async (req, res) => {
  try {
    const { email, facultyType, subjects } = req.body;

    if (!email || !facultyType) {
      return res.status(400).json({ error: "email and facultyType are required" });
    }

    if (!["subject", "coordinator"].includes(facultyType)) {
      return res.status(400).json({ error: 'facultyType must be "subject" or "coordinator"' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const teacher = await Student.findOne({ email: normalizedEmail, role: "teacher" });

    if (!teacher) {
      return res.status(404).json({ error: "No teacher account found with this email" });
    }

    if (!teacher.emailVerified) {
      return res.status(403).json({ error: "Please verify your email before selecting a faculty role" });
    }

    if (facultyType === "subject") {
      const selectedSubjects = Array.isArray(subjects)
        ? subjects.map((s) => String(s).trim()).filter(Boolean)
        : typeof subjects === "string" && subjects.trim()
        ? [subjects.trim()]
        : [];

      if (selectedSubjects.length === 0) {
        return res.status(400).json({ error: "Select the subject you are responsible for" });
      }
      if (selectedSubjects.length > 1) {
        return res.status(400).json({ error: "Select only one subject" });
      }

      const validCodes = SUBJECTS.map((s) => s.code);
      if (!validCodes.includes(selectedSubjects[0])) {
        return res.status(400).json({ error: "Unknown subject" });
      }

      teacher.facultyType = "subject";
      teacher.facultySubjects = selectedSubjects;
    } else {
      teacher.facultyType = "coordinator";
      teacher.facultySubjects = [];
    }

    teacher.facultySetupComplete = true;
    await teacher.save();

    res.json({
      message:
        facultyType === "coordinator"
          ? "You're set up as the Class Coordinator."
          : "Faculty subject saved.",
      facultyType: teacher.facultyType,
      facultySubjects: teacher.facultySubjects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while saving faculty role" });
  }
});

// ---- Current user's profile (fresh from DB) ----
router.get("/me", requireAuth, async (req, res) => {
  try {
    const account = await Student.findById(req.user.id).select("-password -otpCode -otpExpiry");
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json({ user: account });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
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
    const user = { id: student._id, name: student.name, email: student.email, role: student.role };

    if (student.role === "teacher") {
      user.facultyType = student.facultyType || null;
      user.facultySubjects = student.facultySubjects || [];
      user.facultySetupComplete = student.facultySetupComplete === undefined
        ? true
        : student.facultySetupComplete;
    }

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;