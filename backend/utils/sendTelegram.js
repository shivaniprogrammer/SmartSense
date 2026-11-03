const https = require("https");

function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("[Telegram skipped — TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set in .env]");
    return Promise.resolve({ sent: false, configured: false });
  }

  const body = new URLSearchParams({ chat_id: chatId, text }).toString();
  return new Promise((resolve) => {
    const request = https.request({
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { responseBody += chunk; });
      response.on("end", () => {
        let result;
        try {
          result = JSON.parse(responseBody);
        } catch (err) {
          console.error("Telegram returned an invalid response:", err.message);
          resolve({ sent: false, configured: true });
          return;
        }
        if (response.statusCode === 200 && result.ok) {
          console.log("Telegram message sent.");
          resolve({ sent: true, configured: true });
          return;
        }
        console.error("Telegram send failed, status:", response.statusCode);
        resolve({ sent: false, configured: true });
      });
    });

    request.setTimeout(10000, () => { request.destroy(new Error("Telegram request timed out")); });
    request.on("error", (err) => {
      console.error("Telegram send error:", err.message);
      resolve({ sent: false, configured: true });
    });
    request.end(body);
  });
}

module.exports = sendTelegramMessage;