const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const { requireAuth, requireRole } = require("../middleware/auth");

router.post("/enroll/ble", requireAuth, async (req, res) => {
  try {
    const { bleId } = req.body;
    if (!bleId) return res.status(400).json({ error: "bleId is required" });

    const existing = await Student.findOne({ bleId });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(409).json({ error: "This BLE ID is already linked to another account" });
    }

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { bleId, enrollmentComplete: true },
      { new: true }
    );

    res.json({ message: "BLE ID enrolled successfully", bleId: student.bleId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during BLE enrollment" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password");
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching profile" });
  }
});

router.get("/", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const students = await Student.find({ role: "student" }).select("-password");
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching students" });
  }
});

module.exports = router;