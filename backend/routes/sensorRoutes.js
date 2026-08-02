const express = require("express");
const router = express.Router();
const SensorEvent = require("../models/SensorEvent");
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");

// ---- Motion + door sensor (already working, unchanged) ----
router.post("/sensor-data", async (req, res) => {
  try {
    const { motionDetected, doorOpen, deviceId } = req.body;

    if (typeof motionDetected !== "boolean" || typeof doorOpen !== "boolean") {
      return res.status(400).json({
        error: "motionDetected and doorOpen must both be true/false booleans",
      });
    }

    const event = new SensorEvent({
      motionDetected,
      doorOpen,
      deviceId: deviceId || "esp32-01",
    });

    await event.save();

    console.log(
      `[${new Date().toLocaleTimeString()}] Motion: ${motionDetected} | Door: ${doorOpen}`
    );

    res.status(201).json({ message: "Event logged", event });
  } catch (err) {
    console.error("Error saving sensor event:", err.message);
    res.status(500).json({ error: "Server error while saving event" });
  }
});

router.get("/sensor-data/recent", async (req, res) => {
  try {
    const events = await SensorEvent.find().sort({ receivedAt: -1 }).limit(10);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Server error while fetching events" });
  }
});

// ---- BLE scan -> marks the matching student present for today ----
router.post("/ble-scan", async (req, res) => {
  try {
    const { bleId } = req.body;

    if (!bleId) {
      return res.status(400).json({ error: "bleId is required" });
    }

    const student = await Student.findOne({ bleId });

    if (!student) {
      // Not an error from the reader's point of view -- just an unrecognized/unenrolled device.
      // 200 (not 404) so the scanner doesn't treat this as a hardware/connection fault.
      return res.status(200).json({ message: "No enrolled student matches this bleId", matched: false });
    }

    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    const existing = await AttendanceRecord.findOne({ student: student._id, date: today });

    if (existing) {
      // Already marked today -- don't overwrite checkInTime on every re-scan.
      return res.status(200).json({
        message: `${student.name} already marked present today`,
        matched: true,
        student: student.name,
        record: existing,
      });
    }

    const record = await AttendanceRecord.create({
      student: student._id,
      date: today,
      checkInTime: new Date(),
      method: "ble",
      status: "present",
      confidence: "high",
    });

    console.log(`[${new Date().toLocaleTimeString()}] BLE scan matched ${student.name} (${bleId}) -> marked present`);

    res.status(201).json({
      message: `${student.name} marked present`,
      matched: true,
      student: student.name,
      record,
    });
  } catch (err) {
    console.error("Error processing BLE scan:", err.message);
    res.status(500).json({ error: "Server error while processing BLE scan" });
  }
});

module.exports = router;