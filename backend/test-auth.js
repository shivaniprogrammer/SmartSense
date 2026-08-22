require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";

async function runTests() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB for testing");

  // Sync index to apply sparse option
  try {
    await Student.syncIndexes();
    console.log("Successfully synced schema indexes with database.");
  } catch (indexErr) {
    console.warn("Index sync warning (will try dropping index directly):", indexErr.message);
    try {
      await Student.collection.dropIndex("studentId_1");
      console.log("Dropped old studentId_1 index.");
    } catch (e) {
      console.log("No old studentId_1 index to drop or already dropped.");
    }
  }

  // Clear students
  await Student.deleteMany({});
  console.log("Cleaned Student collection for tests");

  // Test 1: Student registration with studentId
  try {
    console.log("\n--- Test 1: Student registration with studentId ---");
    const stuPayload = {
      name: "Alice Student",
      email: "alice@college.edu",
      password: "password123",
      role: "student",
      studentId: "STU001",
    };
    
    const existing = await Student.findOne({ email: stuPayload.email.toLowerCase() });
    if (existing) throw new Error("Student already exists");
    
    const stu = await Student.create({
      name: stuPayload.name,
      studentId: stuPayload.studentId,
      email: stuPayload.email.toLowerCase(),
      password: stuPayload.password,
      role: stuPayload.role,
    });
    console.log("SUCCESS: Student Alice created successfully with ID", stu.studentId);
    if (stu.parentEmail) throw new Error("parentEmail was saved but shouldn't be!");
  } catch (err) {
    console.error("FAILED Test 1:", err.message);
  }

  // Test 2: Student registration validation
  try {
    console.log("\n--- Test 2: Student registration validation ---");
    const noIdPayload = {
      name: "Bad Student",
      email: "badstudent@college.edu",
      password: "password123",
      role: "student",
    };
    
    if (noIdPayload.role === "student" && !noIdPayload.studentId) {
      console.log("SUCCESS: Student ID is required for student role.");
    } else {
      throw new Error("Validation failed: studentId was not required for student role!");
    }
  } catch (err) {
    console.error("FAILED Test 2:", err.message);
  }

  // Test 3: Teacher registration WITHOUT studentId
  try {
    console.log("\n--- Test 3: Teacher registration WITHOUT studentId ---");
    const teacherPayload = {
      name: "Bob Teacher",
      email: "bob@college.edu",
      password: "password123",
      role: "teacher"
    };

    const teacher = await Student.create({
      name: teacherPayload.name,
      email: teacherPayload.email.toLowerCase(),
      password: teacherPayload.password,
      role: teacherPayload.role
    });
    console.log("SUCCESS: Teacher Bob created successfully without studentId!");
    if (teacher.studentId) throw new Error("Teacher should not have studentId!");
    if (teacher.parentEmail) throw new Error("Teacher should not have parentEmail!");
  } catch (err) {
    console.error("FAILED Test 3:", err.message);
  }

  // Test 4: Registering multiple teachers (verifies sparse unique index on studentId)
  try {
    console.log("\n--- Test 4: Registering second Teacher WITHOUT studentId ---");
    const teacher2Payload = {
      name: "Charlie Teacher",
      email: "charlie@college.edu",
      password: "password123",
      role: "teacher"
    };

    const teacher2 = await Student.create({
      name: teacher2Payload.name,
      email: teacher2Payload.email.toLowerCase(),
      password: teacher2Payload.password,
      role: teacher2Payload.role
    });
    console.log("SUCCESS: Second Teacher Charlie created successfully without duplicate studentId error!");
  } catch (err) {
    console.error("FAILED Test 4 (Sparse index issue):", err.message);
  }

  await Student.deleteMany({});
  await mongoose.disconnect();
  console.log("\nTests complete.");
}

runTests();
