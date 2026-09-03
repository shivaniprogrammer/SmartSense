const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Resend } = require("resend");

async function sendWithBrevo(to, subject, text, html) {
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  if (!apiKey) return { skipped: true };

  const fromEmail = process.env.EMAIL_FROM || "shivanisivakumar0903@gmail.com";

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: "SmartSense", email: fromEmail },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `Brevo returned status ${response.status}` };
    }

    return { success: true, id: data.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function sendWithResend(to, subject, text, html) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return { skipped: true };

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM || "SmartSense <onboarding@resend.dev>";
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
  // 1. Try Brevo first (works for any recipient once sender is verified)
  const brevoKey = (process.env.BREVO_API_KEY || "").trim();
  if (brevoKey) {
    const brevoResult = await sendWithBrevo(to, subject, text, html);
    if (brevoResult.success) {
      console.log(`[Email] Sent via Brevo to ${to}: "${subject}"`);
      return brevoResult;
    }
    if (!brevoResult.skipped) {
      console.error("[Email] Brevo error:", brevoResult.error);
    }
  }

  // 2. Fallback to Resend (only works for your own verified test email)
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

  if (!brevoKey && !resendKey) {
    console.warn("[Email skipped] No BREVO_API_KEY or RESEND_API_KEY configured in .env");
    return { skipped: true };
  }

  return { success: false, error: "All email transports failed" };
}

module.exports = sendEmail;