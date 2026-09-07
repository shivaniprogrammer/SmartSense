const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const CLASS_SECTIONS = require("../constants/classSections");
const { requireAuth, requireRole } = require("../middleware/auth");
const { loadFacultyScope } = require("../middleware/facultyScope");

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

// ---- Class/section list ----
router.get("/class-sections", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  res.json({ classSections: CLASS_SECTIONS });
});

// ---- Students without a class yet, so the Coordinator has someone to assign ----
// (Also useful for re-assigning: returns everyone, with their current class shown.)
router.get(
  "/unassigned",
  requireAuth,
  requireRole("teacher", "admin"),
  loadFacultyScope,
  async (req, res) => {
    try {
      // A Class Coordinator only manages their own class's roster. Since students
      // aren't assigned to a class until this very action, "their roster" means:
      // everyone still unassigned, plus anyone already assigned to their class
      // (so they can also see/fix existing assignments).
      let query = { role: "student" };

      if (req.user.role === "teacher") {
        if (req.user.facultyType !== "coordinator" || !req.user.coordinatorClass) {
          return res.status(403).json({ error: "Only a Class Coordinator can manage class assignments." });
        }
        query = {
          role: "student",
          $or: [{ classSection: null }, { classSection: req.user.coordinatorClass }],
        };
      }

      const students = await Student.find(query).select("-password").sort({ name: 1 });
      res.json({ students });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching students" });
    }
  }
);

// ---- Assign a student's class/section ----
// The student registration form never asks for this — it's set here, separately,
// by the Class Coordinator (or an admin). Students cannot change their own class.
// A Coordinator can ONLY assign students into their own coordinatorClass — never
// any other class — enforced server-side below.
router.patch(
  "/:id/class",
  requireAuth,
  requireRole("teacher", "admin"),
  loadFacultyScope,
  async (req, res) => {
    try {
      const { classSection } = req.body;

      if (!classSection) {
        return res.status(400).json({ error: "classSection is required" });
      }

      const validCodes = CLASS_SECTIONS.map((c) => c.code);
      if (!validCodes.includes(classSection)) {
        return res.status(400).json({ error: "Unknown class/section" });
      }

      if (req.user.role === "teacher") {
        if (req.user.facultyType !== "coordinator" || !req.user.coordinatorClass) {
          return res.status(403).json({ error: "Only a Class Coordinator can assign classes." });
        }
        if (classSection !== req.user.coordinatorClass) {
          return res.status(403).json({ error: "You can only assign students to your own class." });
        }
      }

      const student = await Student.findOneAndUpdate(
        { _id: req.params.id, role: "student" },
        { classSection },
        { new: true }
      ).select("-password");

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      res.json({ message: "Class assigned", student });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error while assigning class" });
    }
  }
);

module.exports = router;