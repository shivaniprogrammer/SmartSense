const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const { requireAuth, requireRole } = require("../middleware/auth");
const { loadFacultyScope, requireCoordinatorLevel } = require("../middleware/facultyScope");
const sendEmail = require("../utils/sendEmail");

const LOW_ATTENDANCE_THRESHOLD = 75; // percent

async function sendLowAttendanceEmail(student, percent, threshold) {
  const text = `${student.name}'s attendance has dropped to ${percent}%, below the required ${threshold}%. Please take action to improve attendance.`;
  const html = `
    <p>This is an automated attendance alert.</p>
    <p><strong>${student.name}</strong> (${student.studentId}) currently has an attendance of
    <strong>${percent}%</strong>, which is below the required ${threshold}%.</p>
    <p>Please take steps to improve attendance going forward.</p>
  `;

  const result = await sendEmail(
    student.email,
    `Attendance Alert: ${student.name} is at ${percent}%`,
    text,
    html
  );

  if (!result.success && !result.skipped) {
    console.error(`Failed to send low-attendance email to ${student.email}:`, result.error);
  }

  return result.success === true;
}

// Teacher/admin triggers a check across all students; emails anyone below threshold.
// This is a class-wide action, so it's reserved for the Class Coordinator (or admin,
// or a legacy teacher account with no faculty role set) via requireCoordinatorLevel —
// a subject-scoped teacher gets a 403 here.
router.post("/low-attendance-check", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, requireCoordinatorLevel, async (req, res) => {
  try {
    const threshold = req.body.threshold || LOW_ATTENDANCE_THRESHOLD;
    const students = await Student.find({ role: "student" });
    const results = [];
    for (const student of students) {
      const records = await AttendanceRecord.find({ student: student._id });
      const total = records.length;
      if (total === 0) continue; // no attendance data yet, skip
      const presentCount = records.filter(
        (r) => r.status === "present" || r.status === "late"
      ).length;
      const percent = Math.round((presentCount / total) * 1000) / 10;
      if (percent < threshold) {
        const sent = await sendLowAttendanceEmail(student, percent, threshold);
        results.push({ student: student.name, email: student.email, percent, alertSent: sent });
      }
    }
    res.json({
      message: `Checked ${students.length} students. ${results.length} below ${threshold}%.`,
      threshold,
      alerted: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while checking attendance" });
  }
});

module.exports = router;