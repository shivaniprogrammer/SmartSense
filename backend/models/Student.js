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

    // --- Teacher faculty role (set right after OTP verification for teachers) ---
    // "subject"     -> teacher is faculty for one or more specific subjects only
    // "coordinator" -> teacher is the Class Coordinator, same access as the full Teacher Dashboard
    facultyType: { type: String, enum: ["subject", "coordinator"], default: undefined },
    // Only populated when facultyType === "subject"
    facultySubjects: { type: [String], default: [] },
    // Tracks whether the teacher has completed the post-OTP faculty role selection step.
    // Existing/legacy teacher accounts (created before this field existed) will simply have
    // this as `undefined`, which is treated the same as `true` so nothing breaks for them.
    facultySetupComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);