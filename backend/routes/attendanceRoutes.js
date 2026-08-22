const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const sendEmail = require("../utils/sendEmail");
const { requireAuth, requireRole } = require("../middleware/auth");

function todayString() {
  return new Date().toISOString().split("T")[0];
}

const LATE_CUTOFF_HOUR = 9;

router.post("/checkin/ble", async (req, res) => {
  try {
    const { bleId } = req.body;
    if (!bleId) return res.status(400).json({ error: "bleId is required" });

    const student = await Student.findOne({ bleId });
    if (!student) {
      return res.status(404).json({ error: "No student found with this BLE ID" });
    }

    const date = todayString();

    const existingRecord = await AttendanceRecord.findOne({ student: student._id, date });
    if (existingRecord) {
      return res.status(200).json({
        message: `${student.name} already marked ${existingRecord.status} today at ${existingRecord.checkInTime}`,
        record: existingRecord,
      });
    }

    const now = new Date();
    const isLate = now.getHours() >= LATE_CUTOFF_HOUR + 1 || (now.getHours() === LATE_CUTOFF_HOUR && now.getMinutes() > 0);

    const record = new AttendanceRecord({
      student: student._id,
      date,
      checkInTime: now,
      method: "ble",
      status: isLate ? "late" : "present",
      confidence: "high",
    });

    await record.save();

    console.log(`Attendance marked: ${student.name} - ${record.status} at ${now.toLocaleTimeString()}`);

    res.status(201).json({ message: "Attendance marked", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while marking attendance" });
  }
});

router.post("/checkout/ble", async (req, res) => {
  try {
    const { bleId } = req.body;
    if (!bleId) return res.status(400).json({ error: "bleId is required" });

    const student = await Student.findOne({ bleId });
    if (!student) return res.status(404).json({ error: "No student found with this BLE ID" });

    const date = todayString();
    const record = await AttendanceRecord.findOneAndUpdate(
      { student: student._id, date },
      { checkOutTime: new Date() },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ error: "No check-in record found for today to check out from" });
    }

    res.json({ message: "Checkout recorded", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while recording checkout" });
  }
});

router.post("/manual", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const { studentId, status, date } = req.body;
    if (!studentId || !status) {
      return res.status(400).json({ error: "studentId and status are required" });
    }

    const targetDate = date || todayString();

    const record = await AttendanceRecord.findOneAndUpdate(
      { student: studentId, date: targetDate },
      {
        student: studentId,
        date: targetDate,
        status,
        method: "manual",
        confidence: "high",
        checkInTime: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Attendance manually updated", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during manual attendance update" });
  }
});

router.get("/today", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ date: todayString() })
      .populate("student", "name studentId email")
      .sort({ checkInTime: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching today's attendance" });
  }
});

router.get("/history/:studentId", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "student" && req.user.id !== req.params.studentId) {
      return res.status(403).json({ error: "You can only view your own attendance history" });
    }

    const records = await AttendanceRecord.find({ student: req.params.studentId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching attendance history" });
  }
});

router.post("/notify-absentees", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const date = todayString();
    const presentStudentIds = (await AttendanceRecord.find({ date })).map((r) => r.student.toString());

    const absentStudents = await Student.find({
      role: "student",
      _id: { $nin: presentStudentIds },
    });

    const results = [];
    for (const student of absentStudents) {
      if (student.email) {
        const result = await sendEmail(
          student.email,
          "Attendance Alert",
          `${student.name} was not marked present today (${date}). Please contact the class teacher if this is unexpected.`
        );
        results.push({ student: student.name, ...result });
      }
    }

    res.json({ message: `Checked ${absentStudents.length} absent students`, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while notifying absentees" });
  }
});

module.exports = router;