const express = require("express");
const Timetable = require("../models/Timetable");
const router = express.Router();
const SensorEvent = require("../models/SensorEvent");
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const sendTelegramMessage = require("../utils/sendTelegram");
// ---- Motion + door sensor (already working, unchanged) ----
router.post("/ble-scan", async (req, res) => {
  try {
    const { bleId, status } = req.body;
    if (!bleId) return res.status(400).json({ error: "bleId is required" });

    const student =
      (await Student.findOne({ bleId })) ||
      (await Student.findOne({ bleId: bleId.toUpperCase() })) ||
      (await Student.findOne({ bleId: bleId.toLowerCase() }));

    if (!student) {
      return res.status(200).json({ message: "No enrolled student matches this bleId", matched: false });
    }

    const { date, day, minutes, timeText } = getIstInfo();
    const period = currentPeriod(minutes, day);

    if (!period) {
      if (status !== "absent") {
        student.lastSeenAt = new Date();
        await student.save();
      }
      return res.status(200).json({ message: "No class running now, nothing saved", matched: true, student: student.name });
    }

    const existing = await AttendanceRecord.findOne({ student: student._id, date, period });

    // ESP32 says the device went silent
    if (status === "absent") {
      if (existing && existing.status !== "absent") {
        existing.status = "absent";
        existing.checkOutTime = new Date();
        await existing.save();
        sendTelegramMessage(`⚠️ ${student.name} marked absent in period ${period} at ${timeText} (Bluetooth not detected).`);
      }
      return res.status(200).json({ message: "absent noted", matched: true, student: student.name, period });
    }

    // Normal "present" scan
    student.lastSeenAt = new Date();
    await student.save();

    if (existing) {
      if (existing.status === "absent") {
        existing.status = "present";
        existing.checkOutTime = null;
        await existing.save();
        sendTelegramMessage(`✅ ${student.name} is back, present in period ${period} at ${timeText}`);
        return res.status(200).json({ message: `${student.name} present again`, matched: true, student: student.name, period, record: existing });
      }
      return res.status(200).json({ message: `${student.name} already marked for period ${period}`, matched: true, student: student.name, period, record: existing });
    }

    const subject = await subjectFor(student, day, period);
    const late = minutes - PERIOD_TIMES[period][0] > LATE_AFTER_MIN;

    const record = await AttendanceRecord.create({
      student: student._id,
      date,
      period,
      subject,
      checkInTime: new Date(),
      method: "ble",
      status: late ? "late" : "present",
      confidence: "high",
    });

    sendTelegramMessage(`${late ? "🕒" : "✅"} ${student.name} ${late ? "late" : "present"} in period ${period}${subject ? " (" + subject + ")" : ""} at ${timeText}`);

    res.status(201).json({ message: `${student.name} marked ${record.status}`, matched: true, student: student.name, period, record });
  } catch (err) {
    console.error("Error processing BLE scan:", err.message);
    res.status(500).json({ error: "Server error while processing BLE scan" });
  }
});
// Period start/end in minutes after midnight (index = period number)
const PERIOD_TIMES = [
  null,
  [495, 545],  // 1: 8:15  - 9:05
  [545, 595],  // 2: 9:05  - 9:55
  [610, 660],  // 3: 10:10 - 11:00
  [660, 710],  // 4: 11:00 - 11:50
  [710, 760],  // 5: 11:50 - 12:40
  [810, 855],  // 6: 1:30  - 2:15
  [855, 900],  // 7: 2:15  - 3:00
  [900, 945],  // 8: 3:00  - 3:45
];
const LATE_AFTER_MIN = 10; // scan more than 10 min after period start = late

function getIstInfo() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    date: now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    day: get("weekday").toUpperCase(), // MONDAY ... SUNDAY
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    timeText: now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
  };
}

// Returns 1..8, or null when no class is running.
// TEST_PERIOD (env var) forces a period, so you can test outside class hours.
function currentPeriod(minutes, day) {
  if (process.env.TEST_PERIOD) return Number(process.env.TEST_PERIOD);
  if (day === "SATURDAY" || day === "SUNDAY") return null;
  for (let p = 1; p <= 8; p++) {
    if (minutes >= PERIOD_TIMES[p][0] && minutes < PERIOD_TIMES[p][1]) return p;
  }
  return null;
}

async function subjectFor(student, day, period) {
  const section = student.classSection || "CSE F";
  const entry = await Timetable.findOne({ classSection: section, day, period });
  return entry ? entry.subjectCode : null;
}
// ==========================================
// AUTOMATIC ABSENCE CHECKER
// ==========================================

// For testing: 2 minutes
const ABSENCE_TIMEOUT = 2 * 60 * 1000;

setInterval(async () => {
  try {
    const { date, day, minutes } = getIstInfo();
    const period = currentPeriod(minutes, day);
    if (!period) return;

    const cutoffTime = new Date(Date.now() - ABSENCE_TIMEOUT);
    const students = await Student.find({
      role: "student",
      bleId: { $exists: true, $ne: null },
      lastSeenAt: { $ne: null, $lt: cutoffTime },
    });

    for (const student of students) {
      const attendance = await AttendanceRecord.findOne({ student: student._id, date, period });
      if (attendance && (attendance.status === "present" || attendance.status === "late")) {
        attendance.status = "absent";
        attendance.checkOutTime = new Date();
        await attendance.save();
        console.log(`${student.name} -> ABSENT (period ${period})`);
        sendTelegramMessage(`⚠️ ${student.name} marked absent in period ${period}: Bluetooth not detected for 2 minutes.`);
      }
    }
  } catch (err) {
    console.error("Absence checker error:", err.message);
  }
}, 30 * 1000);
module.exports = router;