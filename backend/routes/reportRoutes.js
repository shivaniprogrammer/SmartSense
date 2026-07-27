const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const { requireAuth, requireRole } = require("../middleware/auth");

function todayString() {
  return new Date().toISOString().split("T")[0];
}

router.get("/summary", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const date = todayString();
    const totalStudents = await Student.countDocuments({ role: "student" });
    const todayRecords = await AttendanceRecord.find({ date });

    const presentCount = todayRecords.filter((r) => r.status === "present").length;
    const lateCount = todayRecords.filter((r) => r.status === "late").length;
    const absentCount = totalStudents - todayRecords.length;

    const currentlyIn = todayRecords.filter((r) => r.checkInTime && !r.checkOutTime).length;

    res.json({
      totalStudents,
      presentToday: presentCount,
      lateToday: lateCount,
      absentToday: absentCount,
      currentlyInRoom: currentlyIn,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error fetching summary" });
  }
});

router.get("/weekly-trend", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    const trend = [];
    for (const day of days) {
      const count = await AttendanceRecord.countDocuments({
        date: day,
        status: { $in: ["present", "late"] },
      });
      trend.push({ date: day, presentCount: count });
    }

    res.json(trend);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching weekly trend" });
  }
});

module.exports = router;