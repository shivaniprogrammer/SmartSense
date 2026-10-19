const express = require("express");
const router = express.Router();
const SensorEvent = require("../models/SensorEvent");
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const sendTelegramMessage = require("../utils/sendTelegram");
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

router.post("/ble-scan", async (req, res) => {
  try {
    const { bleId, status } = req.body;

    if (!bleId) {
      return res.status(400).json({ error: "bleId is required" });
    }

    // Try the address as sent, then upper and lower case
    const student =
      (await Student.findOne({ bleId })) ||
      (await Student.findOne({ bleId: bleId.toUpperCase() })) ||
      (await Student.findOne({ bleId: bleId.toLowerCase() }));

    if (!student) {
      return res.status(200).json({ message: "No enrolled student matches this bleId", matched: false });
    }

    // Use Indian date so scans before 5:30 AM don't land on yesterday
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const timeText = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
    const existing = await AttendanceRecord.findOne({ student: student._id, date: today });

    // ESP32 says the device went silent
    if (status === "absent") {
      if (existing && existing.status === "present") {
        existing.status = "absent";
        existing.checkOutTime = new Date();
        await existing.save();
        sendTelegramMessage(`⚠️ ${student.name} marked absent at ${timeText} (Bluetooth not detected).`);
      }
      return res.status(200).json({ message: "absent noted", matched: true, student: student.name });
    }

    // Normal "present" scan
    student.lastSeenAt = new Date();
    await student.save();

    if (existing) {
      if (existing.status === "absent") {
        existing.status = "present";
        existing.checkOutTime = null;
        await existing.save();
        sendTelegramMessage(`✅ ${student.name} is back, marked present at ${timeText}`);
        return res.status(200).json({ message: `${student.name} marked present again`, matched: true, student: student.name, record: existing });
      }
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

    console.log(`[${timeText}] BLE scan matched ${student.name} (${bleId}) -> marked present`);
    sendTelegramMessage(`✅ ${student.name} marked present at ${timeText}`);

    res.status(201).json({ message: `${student.name} marked present`, matched: true, student: student.name, record });
  } catch (err) {
    console.error("Error processing BLE scan:", err.message);
    res.status(500).json({ error: "Server error while processing BLE scan" });
  }
});
// ==========================================
// AUTOMATIC ABSENCE CHECKER
// ==========================================

// For testing: 2 minutes
const ABSENCE_TIMEOUT = 2 * 60 * 1000;

// Check every 30 seconds
setInterval(async () => {
  try {
    const cutoffTime = new Date(Date.now() - ABSENCE_TIMEOUT);

    const students = await Student.find({
      role: "student",
      bleId: { $exists: true, $ne: null },
      lastSeenAt: { $ne: null, $lt: cutoffTime },
    });

    const today = new Date().toISOString().split("T")[0];

    for (const student of students) {

      const attendance = await AttendanceRecord.findOne({
        student: student._id,
        date: today,
      });

      if (!attendance) {
        continue;
      }

      if (attendance.status === "present") {

        attendance.status = "absent";

        await attendance.save();

        console.log(
          `[${new Date().toLocaleTimeString()}] ${student.name} -> ABSENT`
        );

        sendTelegramMessage(
          `⚠️ ${student.name} marked absent because Bluetooth was not detected for 2 minutes.`
        );
      }
    }

  } catch (err) {
    console.error("Absence checker error:", err.message);
  }
}, 30 * 1000);

module.exports = router;