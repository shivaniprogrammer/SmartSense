const express = require("express");
const router = express.Router();
const SensorEvent = require("../models/SensorEvent");

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

module.exports = router;