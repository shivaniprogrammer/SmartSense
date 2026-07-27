const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    type: { type: String, enum: ["leave", "od"], required: true },
    fromDate: { type: String, required: true }, // YYYY-MM-DD
    toDate: { type: String, required: true }, // YYYY-MM-DD
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);