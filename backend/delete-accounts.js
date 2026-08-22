require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");
const AttendanceRecord = require("./models/AttendanceRecord");
const Request = require("./models/Request");
const SensorEvent = require("./models/SensorEvent");
const User = require("./models/User");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB at", MONGO_URI);
    // Delete student and teacher accounts
    const studentResult = await Student.deleteMany({});
    console.log(`Deleted ${studentResult.deletedCount} account(s) from Student collection`);
    // Delete attendance records
    const attendanceResult = await AttendanceRecord.deleteMany({});
    console.log(`Deleted ${attendanceResult.deletedCount} attendance record(s)`);
    // Delete leave/OD requests
    const requestResult = await Request.deleteMany({});
    console.log(`Deleted ${requestResult.deletedCount} leave/OD request(s)`);
    // Delete sensor events
    const sensorResult = await SensorEvent.deleteMany({});
    console.log(`Deleted ${sensorResult.deletedCount} sensor event(s)`);
    // Delete users if any exist in the legacy User collection
    const userResult = await User.deleteMany({});
    console.log(`Deleted ${userResult.deletedCount} user(s) from User collection`);
    console.log("Database successfully cleared.");
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error during database cleanup:", err.message);
    process.exit(1);
  });
