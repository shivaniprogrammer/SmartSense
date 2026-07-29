require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    const result = await Student.deleteMany({ studentId: "CSE352" });
    console.log(`Deleted ${result.deletedCount} document(s) with studentId "CSE352"`);

    await mongoose.disconnect();
    console.log("Done.");
  })
  .catch((err) => {
    console.error("Error:", err.message);
  });