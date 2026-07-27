const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    studentId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    parentEmail: { type: String },
    role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },

    bleId: { type: String, unique: true, sparse: true },

    enrollmentComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
