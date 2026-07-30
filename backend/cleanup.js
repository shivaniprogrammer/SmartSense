require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance-tracker";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to database");

    const result = await Student.deleteOne({ email: "rythmbytez@gmail.com" });

    if (result.deletedCount > 0) {
      console.log("Deleted successfully:", result);
    } else {
      console.log("No matching user found with that email.");
    }

    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Connection failed:", err.message);
  });