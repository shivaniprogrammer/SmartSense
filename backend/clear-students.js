require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");
const AttendanceRecord = require("./models/AttendanceRecord");
const Request = require("./models/Request");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Find all student-role accounts first, so we know which IDs to clean up elsewhere
    const students = await Student.find({ role: "student" }).select("_id name email");
    const studentIds = students.map((s) => s._id);

    console.log(`Found ${students.length} student account(s) to remove:`);
    students.forEach((s) => console.log(`  - ${s.name} (${s.email})`));

    // Delete their attendance records
    const attendanceResult = await AttendanceRecord.deleteMany({ student: { $in: studentIds } });
    console.log(`Deleted ${attendanceResult.deletedCount} attendance record(s)`);

    // Delete their leave/OD requests
    const requestResult = await Request.deleteMany({ student: { $in: studentIds } });
    console.log(`Deleted ${requestResult.deletedCount} leave/OD request(s)`);

    // Finally delete the student accounts themselves (teacher/admin accounts are untouched)
    const studentResult = await Student.deleteMany({ role: "student" });
    console.log(`Deleted ${studentResult.deletedCount} student account(s)`);

    await mongoose.disconnect();
    console.log("Done. Teacher/admin accounts were left untouched.");
  })
  .catch((err) => {
    console.error("Error:", err.message);
  });