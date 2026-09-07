// One-time seed script. Run with:
//   node backend/seed/seedTimetable.js
//
// Creates real teacher accounts matching the CSE F course-allotment sheet you
// provided, and populates a full CSE F weekly timetable from it. Also adds a
// small starter timetable for the other classes (CSE A, CSE B, CSE C, ECE A,
// IT A, EEE A) so the "a teacher can teach multiple classes" behavior is
// demonstrated — these are lightweight placeholders, not full 40-period grids;
// add more real periods for them later via POST /api/timetable (admin only).
//
// Safe to re-run: teachers are upserted by email, timetable entries are
// upserted by {teacherId, day, period}, so running this twice won't create
// duplicates.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const Timetable = require("../models/Timetable");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";
const DEFAULT_PASSWORD = "Teacher@123"; // change these accounts' passwords after first login if needed

// ---- Teachers, matching the course-allotment sheet ----
// facultySubjects can hold more than one code here even though the self-service
// "select-faculty-role" UI only allows picking one — these are seeded directly,
// bypassing that UI restriction, because the real sheet shows a couple of
// faculty covering more than one subject/activity.
const TEACHERS = [
  { key: "elayarani", name: "Dr. Elayarani", email: "elayarani@smartsense.edu", facultyType: "subject", facultySubjects: ["DM"] },
  { key: "maheswari", name: "Mrs. Maheswari", email: "maheswari@smartsense.edu", facultyType: "subject", facultySubjects: ["CN"] },
  { key: "karthik", name: "Mr. Karthik M", email: "karthikm@smartsense.edu", facultyType: "subject", facultySubjects: ["ADSA"] },
  { key: "adlin", name: "Ms. Adlin Jibisha", email: "adlinjibisha@smartsense.edu", facultyType: "subject", facultySubjects: ["FAIML", "TT"] },
  { key: "kavitha", name: "Dr. Kavitha", email: "kavitha@smartsense.edu", facultyType: "subject", facultySubjects: ["ESD"] },
  { key: "sushmitha", name: "Ms. Sushmitha", email: "sushmitha@smartsense.edu", facultyType: "coordinator", coordinatorClass: "CSE F" },
  { key: "adeline", name: "Dr. J.S. Adeline Johnsana", email: "adeline@smartsense.edu", facultyType: "subject", facultySubjects: ["CSD"] },
  { key: "anibernish", name: "Ms. Ani Bernish T", email: "anibernisht@smartsense.edu", facultyType: "subject", facultySubjects: ["AT"] },
  { key: "sindhu", name: "Ms. Sindhu S", email: "sindhus@smartsense.edu", facultyType: "subject", facultySubjects: ["NPTEL"] },
  { key: "swathi", name: "Ms. Swathi", email: "swathi@smartsense.edu", facultyType: "subject", facultySubjects: ["COUN"] },
];

const SUBJECT_TITLES = {
  DM: "Discrete Mathematics",
  CN: "Computer Networks",
  ADSA: "Advanced Data Structures and Algorithms",
  FAIML: "Fundamentals of Artificial Intelligence and Machine Learning",
  ESD: "Embedded System Design",
  OOPJ: "Object Oriented Programming using Java",
  CSD: "Career Skill Development III",
  AT: "Aptitude Test",
  TT: "Technical Test",
  NPTEL: "NPTEL",
  LC: "Leet Code",
  COUN: "Counselling",
};

const PERIOD_TIMES = {
  1: ["8.15", "9.05"],
  2: ["9.05", "9.55"],
  3: ["10.10", "11.00"],
  4: ["11.00", "11.50"],
  5: ["11.50", "12.40"],
  6: ["1.30", "2.15"],
  7: ["2.15", "3.00"],
  8: ["3.00", "3.45"],
};

const CSE_F_GRID = {
  MONDAY: ["CN", "ESD", "ADSA", "DM", "FAIML", "DM", "OOPJ", "FAIML"],
  TUESDAY: ["AT", "CN", "FAIML", "DM", "COUN", "OOPJ", "ESD", "ESD"],
  WEDNESDAY: ["FAIML", "CN", "DM", "ADSA", "OOPJ", "ADSA", "ADSA", "ADSA"],
  THURSDAY: ["TT", "CN", "FAIML", "CSD", "CSD", "ESD", "OOPJ", "LC"],
  FRIDAY: ["ESD", "CN", "OOPJ", "FAIML", "DM", "NPTEL", "OOPJ", "ESD"],
};

const SUBJECT_TEACHER = {
  DM: "elayarani",
  CN: "maheswari",
  ADSA: "karthik",
  FAIML: "adlin",
  TT: "adlin",
  ESD: "kavitha",
  OOPJ: "sushmitha",
  LC: "sushmitha",
  CSD: "adeline",
  AT: "anibernish",
  NPTEL: "sindhu",
  COUN: "swathi",
};

const OTHER_CLASS_ENTRIES = [
  { teacherKey: "elayarani", subject: "DM", classSection: "CSE A", day: "MONDAY", period: 1 },
  { teacherKey: "maheswari", subject: "CN", classSection: "CSE A", day: "MONDAY", period: 2 },
  { teacherKey: "karthik", subject: "ADSA", classSection: "CSE B", day: "TUESDAY", period: 1 },
  { teacherKey: "adlin", subject: "FAIML", classSection: "CSE B", day: "TUESDAY", period: 2 },
  { teacherKey: "kavitha", subject: "ESD", classSection: "CSE C", day: "MONDAY", period: 3 },
  { teacherKey: "sushmitha", subject: "OOPJ", classSection: "CSE C", day: "MONDAY", period: 4 },
  { teacherKey: "adeline", subject: "CSD", classSection: "ECE A", day: "MONDAY", period: 1 },
  { teacherKey: "anibernish", subject: "AT", classSection: "IT A", day: "MONDAY", period: 1 },
  { teacherKey: "sindhu", subject: "NPTEL", classSection: "EEE A", day: "MONDAY", period: 1 },
  { teacherKey: "swathi", subject: "COUN", classSection: "EEE A", day: "MONDAY", period: 2 },
  { teacherKey: "sushmitha", subject: "OOPJ", classSection: "CSE A", day: "TUESDAY", period: 9, startTime: "11:00", endTime: "12:40" },
  { teacherKey: "sushmitha", subject: "OOPJ", classSection: "CSE B", day: "WEDNESDAY", period: 9, startTime: "1:00", endTime: "2:30" },
];

async function upsertTeacher(t) {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const update = {
    name: t.name,
    email: t.email,
    role: "teacher",
    emailVerified: true,
    facultyType: t.facultyType,
    facultySetupComplete: true,
  };

  if (t.facultyType === "subject") {
    update.facultySubjects = t.facultySubjects;
    update.coordinatorClass = null;
  } else {
    update.facultySubjects = [];
    update.coordinatorClass = t.coordinatorClass;
  }

  const existing = await Student.findOne({ email: t.email });
  if (existing) {
    Object.assign(existing, update);
    await existing.save();
    return existing;
  }

  const created = await Student.create({ ...update, password: hashedPassword });
  return created;
}

async function upsertTimetableEntry({ teacherId, subjectCode, classSection, day, period, startTime, endTime }) {
  const times = startTime && endTime ? [startTime, endTime] : PERIOD_TIMES[period];
  await Timetable.findOneAndUpdate(
    { teacherId, day, period },
    {
      teacherId,
      subject: SUBJECT_TITLES[subjectCode],
      subjectCode,
      classSection,
      day,
      period,
      startTime: times[0],
      endTime: times[1],
    },
    { upsert: true, new: true }
  );
}

async function run() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected. Seeding...");

  const teacherDocsByKey = {};
  for (const t of TEACHERS) {
    const doc = await upsertTeacher(t);
    teacherDocsByKey[t.key] = doc;
    console.log(`Teacher ready: ${t.name} (${t.email}) — ${t.facultyType}`);
  }

  let cseFCount = 0;
  for (const [day, periods] of Object.entries(CSE_F_GRID)) {
    for (let i = 0; i < periods.length; i++) {
      const period = i + 1;
      const subjectCode = periods[i];
      const teacherKey = SUBJECT_TEACHER[subjectCode];
      const teacherDoc = teacherDocsByKey[teacherKey];

      await upsertTimetableEntry({
        teacherId: teacherDoc._id,
        subjectCode,
        classSection: "CSE F",
        day,
        period,
      });
      cseFCount++;
    }
  }
  console.log(`CSE F timetable seeded: ${cseFCount} periods.`);

  for (const entry of OTHER_CLASS_ENTRIES) {
    const teacherDoc = teacherDocsByKey[entry.teacherKey];
    await upsertTimetableEntry({
      teacherId: teacherDoc._id,
      subjectCode: entry.subject,
      classSection: entry.classSection,
      day: entry.day,
      period: entry.period,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
  }
  console.log(`Starter periods seeded for CSE A, CSE B, CSE C, ECE A, IT A, EEE A: ${OTHER_CLASS_ENTRIES.length} periods.`);

  console.log("\nSeeded teacher accounts (all use the same password for testing):");
  console.log(`Password: ${DEFAULT_PASSWORD}`);
  TEACHERS.forEach((t) => console.log(`  ${t.email}  (${t.name})`));

  await mongoose.disconnect();
  console.log("\nDone. Disconnected from MongoDB.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});