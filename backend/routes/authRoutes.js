const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

router.post("/register", async (req, res) => {
  try {
    const { name, studentId, email, password, parentEmail, role } = req.body;

    if (!name || !studentId || !email || !password) {
      return res.status(400).json({ error: "name, studentId, email, and password are required" });
    }

    const existing = await Student.findOne({ $or: [{ email }, { studentId }] });
    if (existing) {
      return res.status(409).json({ error: "A user with this email or studentId already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      name,
      studentId,
      email,
      password: hashedPassword,
      parentEmail,
      role: role === "teacher" ? "teacher" : "student",
    });

    await newStudent.save();

    res.status(201).json({
      message: "Registered successfully. Next step: complete BLE enrollment.",
      studentId: newStudent._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await Student.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "dev-secret-change-this",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, role: user.role, studentId: user.studentId },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;