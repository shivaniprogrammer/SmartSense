const mongoose = require("mongoose");

// One document = one class period: a specific teacher teaching a specific
// subject to a specific class/section, on a specific day/period/time.
//
// A teacher will have MULTIPLE Timetable documents if they teach more than one
// class or more than one period — their "individual timetable" is just every
// document where teacherId matches them.
const timetableSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },

    subject: { type: String, required: true },       // e.g. "Advanced Data Structures and Algorithms"
    subjectCode: { type: String, required: true },    // e.g. "ADSA"

    classSection: { type: String, required: true },   // e.g. "CSE F" — must match constants/classSections.js

    day: {
      type: String,
      required: true,
      enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    },
    period: { type: Number, required: true },         // e.g. 1, 2, 3...

    startTime: { type: String, required: true },      // e.g. "1:30"
    endTime: { type: String, required: true },         // e.g. "2:15"

    // Optional — shown on the teacher's timetable if available, per the new
    // login-flow requirement ("any existing classroom information if available").
    room: { type: String, default: null },
  },
  { timestamps: true }
);

timetableSchema.index({ teacherId: 1, day: 1, period: 1 }, { unique: true });
timetableSchema.index({ classSection: 1, day: 1, period: 1 });

module.exports = mongoose.model("Timetable", timetableSchema);