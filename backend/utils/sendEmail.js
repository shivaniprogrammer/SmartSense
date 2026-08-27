const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 8000,
});

async function sendEmail(to, subject, text) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("[Email skipped — no EMAIL_USER/EMAIL_PASS set in .env]");
    console.log(`Would have sent to ${to}: ${subject} — ${text}`);
    return { skipped: true };
  }

  try {
    await transporter.sendMail({
      from: `"Attendance Tracker" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}: ${subject}`);
    return { success: true };
  } catch (err) {
    console.error("Email failed to send:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = sendEmail;