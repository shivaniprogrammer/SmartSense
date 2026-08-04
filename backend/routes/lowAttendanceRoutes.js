const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const { requireAuth, requireRole } = require("../middleware/auth");

const LOW_ATTENDANCE_THRESHOLD = 75; // percent

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendLowAttendanceEmail(student, percent, threshold) {
  const recipients = [student.email];
  if (student.parentEmail) recipients.push(student.parentEmail);

  try {
    await transporter.sendMail({
      from: `"SmartSense" <${process.env.EMAIL_USER}>`,
      to: recipients.join(","),
      subject: `Attendance Alert: ${student.name} is at ${percent}%`,
      text: `${student.name}'s attendance has dropped to ${percent}%, below the required ${threshold}%. Please take action to improve attendance.`,
      html: `
        <p>This is an automated attendance alert.</p>
        <p><strong>${student.name}</strong> (${student.studentId}) currently has an attendance of
        <strong>${percent}%</strong>, which is below the required ${threshold}%.</p>
        <p>Please take steps to improve attendance going forward.</p>
      `,
    });
    return true;
  } catch (err) {
    console.error(`Failed to send low-attendance email to ${student.email}:`, err.message);
    return false;
  }
}

// Teacher/admin triggers a check across all students; emails anyone below threshold
router.post("/low-attendance-check", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
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