const https = require("https");

function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("[Telegram skipped — TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set in .env]");
    return;
  }

  const message = encodeURIComponent(text);
  const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${message}`;

  https.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log("Telegram message sent:", text);
    } else {
      console.error("Telegram send failed, status:", res.statusCode);
    }
  }).on("error", (err) => {
    console.error("Telegram send error:", err.message);
  });
}

module.exports = sendTelegramMessage;