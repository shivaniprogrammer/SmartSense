const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    method: { type: String, default: "ble" }, // ble | manual | leave
    status: { type: String, default: "present" }, // present | late | absent
    confidence: { type: String, default: "high" },
    subject: { type: String, default: null },
    period: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);