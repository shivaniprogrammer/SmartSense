const express = require("express");
const router = express.Router();
const Timetable = require("../models/Timetable");
const CLASS_SECTIONS = require("../constants/classSections");
const SUBJECTS = require("../constants/subjects");
const { requireAuth, requireRole } = require("../middleware/auth");
const { loadFacultyScope, isSubjectScoped } = require("../middleware/facultyScope");

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function sortByDayThenPeriod(a, b) {
  const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
  if (dayDiff !== 0) return dayDiff;
  return a.period - b.period;
}

// ---- A teacher's own individual timetable ----
// - Class Coordinator: every period for their assigned class (coordinatorClass),
//   across all subjects, PLUS any periods where they personally teach a
//   different class/section (e.g. Ms. Sushmitha coordinates CSE F but also
//   teaches OOPJ to CSE A and CSE B).
// - Subject-scoped "Other Faculty Teacher": ONLY the periods for the one subject
//   they picked, across whichever classes it's scheduled in.
router.get("/me", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, async (req, res) => {
  try {
    let entries;

    if (req.user.role === "admin") {
      entries = await Timetable.find({});
    } else if (isSubjectScoped(req.user)) {
      entries = await Timetable.find({ subjectCode: { $in: req.user.facultySubjects } });
    } else if (req.user.facultyType === "coordinator") {
      if (!req.user.coordinatorClass) {
        return res.json({ classSection: null, timetable: [] });
      }
      const ownClassEntries = await Timetable.find({ classSection: req.user.coordinatorClass });
      const ownTeachingElsewhere = await Timetable.find({
        teacherId: req.user.id,
        classSection: { $ne: req.user.coordinatorClass },
      });
      entries = ownClassEntries.concat(ownTeachingElsewhere);
    } else {
      // Legacy teacher account with no faculty role set yet — no periods to show
      // until they complete faculty-role setup.
      entries = [];
    }

    entries = entries.slice().sort(sortByDayThenPeriod);
    res.json({ timetable: entries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching timetable" });
  }
});

// ---- Full timetable for one class/section (admin, or a Coordinator viewing their own class) ----
router.get("/class/:classSection", requireAuth, requireRole("teacher", "admin"), loadFacultyScope, async (req, res) => {
  try {
    const { classSection } = req.params;

    const validCodes = CLASS_SECTIONS.map((c) => c.code);
    if (!validCodes.includes(classSection)) {
      return res.status(400).json({ error: "Unknown class/section" });
    }

    if (req.user.role === "teacher") {
      const isThisClassesCoordinator =
        req.user.facultyType === "coordinator" && req.user.coordinatorClass === classSection;
      if (!isThisClassesCoordinator) {
        return res.status(403).json({ error: "You don't have permission to view this class's timetable." });
      }
    }

    const entries = (await Timetable.find({ classSection })).sort(sortByDayThenPeriod);
    res.json({ classSection, timetable: entries });
  } catch (err) {
    res.status(500).json({ error: "Server error fetching class timetable" });
  }
});

// ---- Admin: create a timetable entry ----
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { teacherId, subject, subjectCode, classSection, day, period, startTime, endTime, room } = req.body;

    if (!teacherId || !subject || !subjectCode || !classSection || !day || !period || !startTime || !endTime) {
      return res.status(400).json({ error: "teacherId, subject, subjectCode, classSection, day, period, startTime and endTime are required" });
    }

    const validClassCodes = CLASS_SECTIONS.map((c) => c.code);
    if (!validClassCodes.includes(classSection)) {
      return res.status(400).json({ error: "Unknown class/section" });
    }

    const validSubjectCodes = SUBJECTS.map((s) => s.code);
    if (!validSubjectCodes.includes(subjectCode)) {
      return res.status(400).json({ error: "Unknown subject code" });
    }

    const entry = await Timetable.create({
      teacherId, subject, subjectCode, classSection,
      day: String(day).toUpperCase(), period, startTime, endTime,
      room: room || null,
    });

    res.status(201).json({ message: "Timetable entry created", entry });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "This teacher already has a class scheduled at that day/period" });
    }
    res.status(500).json({ error: "Server error creating timetable entry" });
  }
});

// ---- Admin: delete a timetable entry ----
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const deleted = await Timetable.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Timetable entry not found" });
    res.json({ message: "Timetable entry deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error deleting timetable entry" });
  }
});

module.exports = router;