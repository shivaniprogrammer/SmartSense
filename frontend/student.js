const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    studentId: { type: String, required: true, unique: true }, // roll number / college ID
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // hashed, never store plain text
    parentEmail: { type: String }, // for absence notifications
    role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },

    // BLE identity — the token/ID this student's phone broadcasts
    bleId: { type: String, unique: true, sparse: true },

    // Denormalized flag so you can quickly find "who hasn't finished enrollment yet"
    // (for now this just means "has a bleId set" — face enrollment comes later)
    enrollmentComplete: { type: Boolean, default: false },

    // Email verification via OTP, done once at registration
    emailVerified: { type: Boolean, default: false },
    otpCode: { type: String },
    otpExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);