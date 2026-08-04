require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");
const AttendanceRecord = require("./models/AttendanceRecord");

const TARGET_EMAIL = "shivanisivakumar0903@gmail.com";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    const student = await Student.findOne({ email: TARGET_EMAIL });
    if (!student) {
      console.log(`No student found with email ${TARGET_EMAIL}. Register them first.`);
      await mongoose.disconnect();
      return;
    }

    const record = await AttendanceRecord.create({
      student: student._id,
      date: new Date().toISOString().split("T")[0],
      method: "manual",
      status: "absent",
      confidence: "high",
    });

    console.log(`Created an absent record for ${student.name} (${student.email}):`);
    console.log(record);

    await mongoose.disconnect();
    console.log("Done.");
  })
  .catch((err) => {
    console.error("Error:", err.message);
  });