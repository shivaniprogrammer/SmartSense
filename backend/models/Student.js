const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
   studentId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },

    bleId: { type: String, unique: true, sparse: true },

    enrollmentComplete: { type: Boolean, default: false },

    emailVerified: { type: Boolean, default: false },
    otpCode: { type: String },
    otpExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);