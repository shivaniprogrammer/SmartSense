package com.smartsense.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Java version of utils/sendEmail.js: tries Brevo first (works for any
 * recipient), falls back to Resend (only works for your own verified
 * test email) if Brevo isn't configured or fails.
 */
@Service
public class EmailService {

    @Value("${email.brevo-api-key:}")
    private String brevoApiKey;

    @Value("${email.brevo-from:smartsense.attendance.tracker@gmail.com}")
    private String brevoFrom;

    @Value("${email.resend-api-key:}")
    private String resendApiKey;

    @Value("${email.resend-from:SmartSense <onboarding@resend.dev>}")
    private String resendFrom;

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper mapper = new ObjectMapper();

    public EmailResult sendEmail(String to, String subject, String text, String html) {
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            EmailResult result = sendWithBrevo(to, subject, text, html);
            if (result.success) {
                System.out.println("[Email] Sent via Brevo to " + to + ": \"" + subject + "\"");
                return result;
            }
            if (!result.skipped) {
                System.err.println("[Email] Brevo error: " + result.error);
            }
        }

        if (resendApiKey != null && !resendApiKey.isBlank()) {
            EmailResult result = sendWithResend(to, subject, text, html);
            if (result.success) {
                System.out.println("[Email] Sent via Resend to " + to + ": \"" + subject + "\"");
                return result;
            }
            if (!result.skipped) {
                System.err.println("[Email] Resend error: " + result.error);
            }
        }

        if ((brevoApiKey == null || brevoApiKey.isBlank()) && (resendApiKey == null || resendApiKey.isBlank())) {
            System.out.println("[Email skipped] No email provider configured");
            EmailResult r = new EmailResult();
            r.skipped = true;
            return r;
        }

        EmailResult r = new EmailResult();
        r.success = false;
        r.error = "All email transports failed";
        return r;
    }

    private EmailResult sendWithBrevo(String to, String subject, String text, String html) {
        EmailResult result = new EmailResult();
        try {
            Map<String, Object> sender = new HashMap<>();
            sender.put("name", "SmartSense");
            sender.put("email", brevoFrom);

            Map<String, Object> recipient = new HashMap<>();
            recipient.put("email", to);

            Map<String, Object> body = new HashMap<>();
            body.put("sender", sender);
            body.put("to", List.of(recipient));
            body.put("subject", subject);
            body.put("textContent", text);
            if (html != null) body.put("htmlContent", html);

            String response = restClient.post()
                    .uri("https://api.brevo.com/v3/smtp/email")
                    .header("api-key", brevoApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        throw new RuntimeException("Brevo returned status " + res.getStatusCode());
                    })
                    .body(String.class);

            JsonNode node = mapper.readTree(response);
            result.success = true;
            result.id = node.has("messageId") ? node.get("messageId").asText() : null;
        } catch (Exception e) {
            result.success = false;
            result.error = e.getMessage();
        }
        return result;
    }

    private EmailResult sendWithResend(String to, String subject, String text, String html) {
        EmailResult result = new EmailResult();
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("from", resendFrom);
            body.put("to", to);
            body.put("subject", subject);
            body.put("text", text);
            if (html != null) body.put("html", html);

            String response = restClient.post()
                    .uri("https://api.resend.com/emails")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + resendApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        throw new RuntimeException("Resend returned status " + res.getStatusCode());
                    })
                    .body(String.class);

            JsonNode node = mapper.readTree(response);
            result.success = true;
            result.id = node.has("id") ? node.get("id").asText() : null;
        } catch (Exception e) {
            result.success = false;
            result.error = e.getMessage();
        }
        return result;
    }

    public static class EmailResult {
        public boolean success;
        public boolean skipped;
        public String id;
        public String error;
    }
}
