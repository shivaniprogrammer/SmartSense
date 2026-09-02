const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

let gmailTransporter = null;

function getGmailTransporter() {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");
  if (!user || !pass) return null;

  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      pool: true,
      maxConnections: 3,
    });
  }
  return { transporter: gmailTransporter, user };
}

async function sendWithGmail(to, subject, text, html) {
  const config = getGmailTransporter();
  if (!config) return { skipped: true };

  const { transporter, user } = config;
  const mailOptions = {
    from: `"SmartSense" <${user}>`,
    to,
    subject,
    text,
  };
  if (html) {
    mailOptions.html = html;
  }

  await transporter.sendMail(mailOptions);
  return { success: true };
}

async function sendWithResend(to, subject, text, html) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return { skipped: true };

  try {
    const resend = new Resend(apiKey);
    const from = process.env.EMAIL_FROM || "SmartSense <onboarding@resend.dev>";
    const payload = { from, to, subject, text };
    if (html) payload.html = html;

    const { data, error } = await resend.emails.send(payload);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: data && data.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function sendEmail(to, subject, text, html) {
  // 1. Try Gmail first if configured (reliable for any domain with app password)
  const gmailConfig = getGmailTransporter();
  if (gmailConfig) {
    try {
      const gmailResult = await sendWithGmail(to, subject, text, html);
      if (gmailResult.success) {
        console.log(`[Email] Sent via Gmail to ${to}: "${subject}"`);
        return gmailResult;
      }
    } catch (err) {
      console.error("[Email] Gmail send error:", err.message);
    }
  }

  // 2. Fallback to Resend if RESEND_API_KEY is configured
  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (resendKey) {
    const resendResult = await sendWithResend(to, subject, text, html);
    if (resendResult.success) {
      console.log(`[Email] Sent via Resend to ${to}: "${subject}"`);
      return resendResult;
    }
    if (!resendResult.skipped) {
      console.error("[Email] Resend error:", resendResult.error);
    }
  }

  if (!gmailConfig && !resendKey) {
    console.warn("[Email skipped] No EMAIL_USER/EMAIL_PASS or RESEND_API_KEY configured in .env");
    return { skipped: true };
  }

  return { success: false, error: "All email transports failed" };
}

module.exports = sendEmail;
