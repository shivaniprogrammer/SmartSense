const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const Timetable = require("../models/Timetable");
const sendEmail = require("../utils/sendEmail");
const { requireAuth, requireRole } = require("../middleware/auth");
const { loadFacultyScope, isSubjectScoped, requireCoordinatorLevel } = require("../middleware/facultyScope");

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

// ---- Which subject+class "sessions" this teacher is allowed to view ----
router.get("/sessions", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const entries = await Timetable.find({});
      const sessions = uniqueSessions(entries);
      return res.json({ sessions });
    }

    if (isSubjectScoped(req.user)) {
      const entries = await Timetable.find({ subjectCode: { $in: req.user.facultySubjects } });
      const sessions = uniqueSessions(entries);
      return res.json({ sessions });
    }

    if (req.user.facultyType === "coordinator" && req.user.coordinatorClass) {
      const ownClassEntries = await Timetable.find({ classSection: req.user.coordinatorClass });
      const ownTeachingElsewhere = await Timetable.find({
        teacherId: req.user.id,
        classSection: { $ne: req.user.coordinatorClass },
      });
      const sessions = uniqueSessions(ownClassEntries.concat(ownTeachingElsewhere));
      return res.json({ sessions });
    }

    res.json({ sessions: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching sessions" });
  }
});

function uniqueSessions(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = e.subjectCode + "|" + e.classSection;
    if (!map.has(key)) {
      map.set(key, { subject: e.subject, subjectCode: e.subjectCode, classSection: e.classSection });
    }
  }
  return Array.from(map.values());
}

// ---- Attendance for one specific subject+class "session" ----
router.get("/", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, async (req, res) => {
  try {
    const date = req.query.date || todayString();
    const { classSection, subject } = req.query;

    if (!classSection || !subject) {
      return res.status(400).json({ error: "classSection and subject are required" });
    }

    if (req.user.role !== "admin") {
      const allowed = await isAllowedForSession(req.user, classSection, subject);
      if (!allowed) {
        return res.status(403).json({ error: "You are not assigned to this subject/class." });
      }
    }

    const studentsInClass = await Student.find({ role: "student", classSection }).select("_id");
    const studentIds = studentsInClass.map((s) => s._id);

    const records = await AttendanceRecord.find({
      date,
      subject,
      student: { $in: studentIds },
    })
      .populate("student", "name studentId email classSection")
      .sort({ checkInTime: 1 });

    res.json({ classSection, subject, date, records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching attendance" });
  }
});

// A Coordinator gets full access to their own class (any subject), and — for
// any OTHER class — only the exact subject/class sessions a real Timetable row
// proves they personally teach. A subject-scoped teacher likewise only passes
// for a real Timetable row matching their own subject.
async function isAllowedForSession(user, classSection, subjectCode) {
  if (user.facultyType === "coordinator") {
    if (user.coordinatorClass === classSection) return true;
    const entry = await Timetable.findOne({
      subjectCode,
      classSection,
      teacherId: user.id,
    });
    return !!entry;
  }
  if (isSubjectScoped(user)) {
    if (!user.facultySubjects.includes(subjectCode)) return false;
    const entry = await Timetable.findOne({
      subjectCode,
      classSection,
      teacherId: user.id,
    });
    return !!entry;
  }
  return false;
}

router.post("/manual", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, async (req, res) => {
  try {
    const { studentId, status, date, subject, classSection, period } = req.body;
    if (!studentId || !status) {
      return res.status(400).json({ error: "studentId and status are required" });
    }

    const targetDate = date || todayString();

    if (req.user.role !== "admin" && subject && classSection) {
      const allowed = await isAllowedForSession(req.user, classSection, subject);
      if (!allowed) {
        return res.status(403).json({ error: "You can only mark attendance for your own subject/class." });
      }
    }

    const update = {
      student: studentId,
      date: targetDate,
      status,
      method: "manual",
      confidence: "high",
      checkInTime: new Date(),
    };
    if (subject) update.subject = subject;
    if (period) update.period = period;

    const record = await AttendanceRecord.findOneAndUpdate(
      { student: studentId, date: targetDate },
      update,
      { upsert: true, new: true }
    );

    res.json({ message: "Attendance manually updated", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during manual attendance update" });
  }
});

router.get("/today", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, async (req, res) => {
  try {
    const query = { date: todayString() };
    if (isSubjectScoped(req.user)) {
      query.subject = { $in: req.user.facultySubjects };
    }
    const records = await AttendanceRecord.find(query)
      .populate("student", "name studentId email classSection")
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

router.post("/notify-absentees", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, requireCoordinatorLevel, async (req, res) => {
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