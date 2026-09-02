const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: String, required: true },

    checkInTime: { type: Date },
    checkOutTime: { type: Date },

    method: {
      type: String,
      enum: ["ble", "face", "manual"],
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "late", "absent", "unverified"],
      default: "present",
    },

    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },

    notes: { type: String },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);