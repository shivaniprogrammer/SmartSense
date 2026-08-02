const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const Request = require("../models/Request");
const AttendanceRecord = require("../models/AttendanceRecord");
const { requireAuth, requireRole } = require("../middleware/auth");

const NOTIFY_EMAIL = process.env.REQUEST_NOTIFY_EMAIL || "shivu9328.s.h@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendRequestNotification(studentName, request) {
  try {
    await transporter.sendMail({
      from: `"SmartSense" <${process.env.EMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      subject: `New ${request.type === "od" ? "OD" : "Leave"} request from ${studentName}`,
      text: `${studentName} has submitted a ${request.type} request from ${request.fromDate} to ${request.toDate}.\n\nReason: ${request.reason}`,
      html: `
        <p><strong>${studentName}</strong> has submitted a new ${request.type === "od" ? "On Duty" : "Leave"} request.</p>
        <p><strong>From:</strong> ${request.fromDate}<br/>
           <strong>To:</strong> ${request.toDate}<br/>
           <strong>Reason:</strong> ${request.reason}</p>
      `,
    });
  } catch (err) {
    console.error("Failed to send request notification email:", err.message);
    // Don't block the request submission if the email fails
  }
}

function dateRange(fromDate, toDate) {
  const dates = [];
  let current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Student submits a leave/OD request
router.post("/", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const { type, fromDate, toDate, reason } = req.body;

    if (!type || !fromDate || !toDate || !reason) {
      return res.status(400).json({ error: "type, fromDate, toDate and reason are required" });
    }

    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ error: "toDate cannot be before fromDate" });
    }

    const request = new Request({
      student: req.user.id,
      type,
      fromDate,
      toDate,
      reason,
    });

    await request.save();

    // Fire-and-forget: don't make the student wait on the email to complete
    sendRequestNotification(req.user.name || "A student", request);

    res.status(201).json({ message: "Request submitted for teacher approval", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while submitting request" });
  }
});

// Student views their own requests
router.get("/mine", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const requests = await Request.find({ student: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching your requests" });
  }
});

// Teacher views pending requests
router.get("/pending", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const requests = await Request.find({ status: "pending" })
      .populate("student", "name studentId email")
      .sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching pending requests" });
  }
});

// Teacher views all requests
router.get("/", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const requests = await Request.find()
      .populate("student", "name studentId email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching requests" });
  }
});

// Teacher approves -> marks attendance present for each date in range
router.patch("/:id/approve", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    request.status = "approved";
    request.reviewedBy = req.user.id;
    request.reviewNote = req.body.reviewNote || "";
    await request.save();

    const dates = dateRange(request.fromDate, request.toDate);

    for (const date of dates) {
      await AttendanceRecord.findOneAndUpdate(
        { student: request.student, date },
        {
          student: request.student,
          date,
          status: "present",
          method: request.type, // "leave" or "od"
          confidence: "high",
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Request approved and attendance updated", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while approving request" });
  }
});

// Teacher rejects
router.patch("/:id/reject", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    request.status = "rejected";
    request.reviewedBy = req.user.id;
    request.reviewNote = req.body.reviewNote || "";
    await request.save();

    res.json({ message: "Request rejected", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while rejecting request" });
  }
});

module.exports = router;