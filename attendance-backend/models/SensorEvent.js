const mongoose = require("mongoose");

const sensorEventSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    default: "esp32-01",
  },
  motionDetected: {
    type: Boolean,
    required: true,
  },
  doorOpen: {
    type: Boolean,
    required: true,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SensorEvent", sensorEventSchema);
