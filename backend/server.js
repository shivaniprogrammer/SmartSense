const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const sensorRoutes = require("./routes/sensorRoutes");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const reportRoutes = require("./routes/reportRoutes");
const requestRoutes = require("./routes/requestRoutes");
const lowAttendanceRoutes = require("./routes/lowAttendanceRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use("/api", sensorRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/alerts", lowAttendanceRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running", time: new Date().toISOString() });
});

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    
    // Sync Student model indexes to ensure sparse unique index for studentId
    const Student = require("./models/Student");
    try {
      await Student.syncIndexes();
      console.log("Database indexes synced successfully");
    } catch (err) {
      console.warn("Index sync warning:", err.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`View recent sensor events at http://localhost:${PORT}/index.html`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
      process.exit(1); 
  });