const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const { requireAuth, requireRole } = require("../middleware/auth");
const { loadFacultyScope } = require("../middleware/facultyScope");

const CSE_F_ROSTER_SIZE = 68;

function todayString() {
  return new Date().toISOString().split("T")[0];
}

router.get("/summary", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, async (req, res) => {
  try {
    const date = todayString();
    if (req.user.facultyType === "coordinator" && req.user.coordinatorClass === "CSE F") {
      const roster = await Student.find({
        role: "student",
        $or: [
          { classSection: "CSE F" },
          { classSection: null },
          { classSection: { $exists: false } },
        ],
      }).select("_id classSection");
      const rosterIds = new Set(roster.map((student) => String(student._id)));
      const todayRecords = await AttendanceRecord.find({ date }).populate("student", "_id classSection");
      const statusesByStudent = new Map();
      todayRecords.forEach((record) => {
        const student = record.student;
        if (!student || (student.classSection && student.classSection !== "CSE F")) return;
        const id = String(student._id);
        if (!rosterIds.has(id)) return;
        const statuses = statusesByStudent.get(id) || new Set();
        statuses.add(record.status);
        statusesByStudent.set(id, statuses);
      });

      let presentToday = 0, lateToday = 0;
      statusesByStudent.forEach((statuses) => {
        if (statuses.has("present")) presentToday++;
        else if (statuses.has("late")) lateToday++;
      });
      const activeStudentIds = new Set();
      todayRecords.forEach((record) => {
        if (
          record.checkInTime &&
          !record.checkOutTime &&
          record.student &&
          rosterIds.has(String(record.student._id)) &&
          (!record.student.classSection || record.student.classSection === "CSE F")
        ) {
          activeStudentIds.add(String(record.student._id));
        }
      });

      return res.json({
        totalStudents: CSE_F_ROSTER_SIZE,
        presentToday,
        lateToday,
        absentToday: Math.max(0, CSE_F_ROSTER_SIZE - presentToday - lateToday),
        currentlyInRoom: activeStudentIds.size,
      });
    }

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