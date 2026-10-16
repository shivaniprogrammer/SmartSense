package com.smartsense.backend.controller;

import com.smartsense.backend.model.Student;
import com.smartsense.backend.repository.StudentRepository;
import com.smartsense.backend.security.JwtUtil;
import com.smartsense.backend.service.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final StudentRepository studentRepository;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public AuthController(StudentRepository studentRepository, EmailService emailService, JwtUtil jwtUtil) {
        this.studentRepository = studentRepository;
        this.emailService = emailService;
        this.jwtUtil = jwtUtil;
    }

    private String generateOtp() {
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    private boolean emailDelivered(EmailService.EmailResult result) {
        return result != null && result.success && !result.skipped;
    }

    private EmailService.EmailResult sendOtpEmail(String toEmail, String otp, String subject) {
        String text = "Your SmartSense verification code is " + otp + ". It expires in 10 minutes.";
        String html = "<div style=\"font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;\">"
                + "<h2 style=\"color:#4f46e5;\">SmartSense</h2>"
                + "<p>Your verification code is:</p>"
                + "<div style=\"font-size:36px;font-weight:800;letter-spacing:8px;color:#4f46e5;\">" + otp + "</div>"
                + "<p>This code expires in <strong>10 minutes</strong>.</p></div>";
        return emailService.sendEmail(toEmail, subject, text, html);
    }

    // ---- Register ----
    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String studentId = body.get("studentId");
        String email = body.get("email");
        String password = body.get("password");
        String role = body.get("role");

        if (name == null || email == null || password == null || role == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name, email, password and role are required");
        }
        if ("student".equals(role) && (studentId == null || studentId.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "studentId is required for student registration");
        }

        String normalizedEmail = email.toLowerCase().trim();
        Optional<Student> existingOpt = studentRepository.findByEmail(normalizedEmail);

        if (existingOpt.isPresent()) {
            Student existing = existingOpt.get();
            if (existing.isEmailVerified()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
            }

            String otp = generateOtp();
            existing.setName(name.trim());
            existing.setPassword(passwordEncoder.encode(password));
            existing.setRole(role);
            existing.setStudentId("student".equals(role) ? studentId.trim() : null);
            existing.setOtpCode(otp);
            existing.setOtpExpiry(Instant.now().plus(10, ChronoUnit.MINUTES));
            existing.setEmailVerified(false);
            studentRepository.save(existing);

            EmailService.EmailResult emailResult = sendOtpEmail(normalizedEmail, otp, "Your SmartSense verification code");
            boolean sent = emailDelivered(emailResult);

            Map<String, Object> resp = new HashMap<>();
            resp.put("message", sent
                    ? "Verification code sent to your email."
                    : "Account created, but we couldn't send the verification email right now. Use 'Resend Code' on the next screen to try again.");
            resp.put("email", normalizedEmail);
            resp.put("role", existing.getRole());
            return resp;
        }

        if ("student".equals(role) && studentRepository.findByStudentId(studentId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This student ID is already registered");
        }

        Student student = new Student();
        student.setName(name.trim());
        student.setStudentId("student".equals(role) ? studentId.trim() : null);
        student.setEmail(normalizedEmail);
        student.setPassword(passwordEncoder.encode(password));
        student.setRole(role);

        String otp = generateOtp();
        student.setOtpCode(otp);
        student.setOtpExpiry(Instant.now().plus(10, ChronoUnit.MINUTES));
        student.setEmailVerified(false);

        studentRepository.save(student);

        EmailService.EmailResult emailResult = sendOtpEmail(normalizedEmail, otp, "Your SmartSense verification code");
        boolean sent = emailDelivered(emailResult);

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", sent
                ? "Account created. Check your email for the verification code."
                : "Account created, but we couldn't send the verification email right now. Use 'Resend Code' on the next screen to try again.");
        resp.put("email", normalizedEmail);
        resp.put("role", student.getRole());
        return resp;
    }

    // ---- Verify OTP ----
    @PostMapping("/verify-otp")
    public Map<String, String> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || otp == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and otp are required");
        }

        String normalizedEmail = email.toLowerCase().trim();
        Student student = studentRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email"));

        if (student.isEmailVerified()) {
            return Map.of("message", "Email already verified");
        }
        if (student.getOtpCode() == null || student.getOtpExpiry() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending verification for this account. Please resend code.");
        }
        if (student.getOtpExpiry().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code has expired. Please resend code.");
        }
        if (!student.getOtpCode().equals(otp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect code");
        }

        student.setEmailVerified(true);
        student.setOtpCode(null);
        student.setOtpExpiry(null);
        studentRepository.save(student);

        return Map.of("message", "Email verified successfully");
    }

    // ---- Resend OTP ----
    @PostMapping("/resend-otp")
    public Map<String, Object> resendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        }

        String normalizedEmail = email.toLowerCase().trim();
        Student student = studentRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email"));

        if (student.isEmailVerified()) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Email already verified");
            resp.put("alreadyVerified", true);
            return resp;
        }

        String otp = generateOtp();
        student.setOtpCode(otp);
        student.setOtpExpiry(Instant.now().plus(10, ChronoUnit.MINUTES));
        studentRepository.save(student);

        EmailService.EmailResult emailResult = sendOtpEmail(normalizedEmail, otp, "Your SmartSense verification code");
        if (!emailDelivered(emailResult)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Couldn't send the code right now. Please try again in a moment.");
        }

        return Map.of("message", "New code sent");
    }

    // ---- Login ----
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        String role = body.get("role");

        if (email == null || password == null || role == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email, password and role are required");
        }

        String normalizedEmail = email.toLowerCase().trim();
        Student student = studentRepository.findByEmail(normalizedEmail).orElse(null);

        if (student == null || !student.getRole().equals(role)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials for this role");
        }
        if (!student.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Please verify your email before logging in");
        }
        if (!passwordEncoder.matches(password, student.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtUtil.generateToken(student);

        Map<String, Object> user = new HashMap<>();
        user.put("id", student.getId());
        user.put("name", student.getName());
        user.put("email", student.getEmail());
        user.put("role", student.getRole());

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Login successful");
        resp.put("token", token);
        resp.put("user", user);
        return resp;
    }

    // ---- Forgot Password: Step 1 ----
    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String role = body.get("role");

        if (email == null || role == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and role are required");
        }

        String normalizedEmail = email.toLowerCase().trim();
        Optional<Student> studentOpt = studentRepository.findByEmail(normalizedEmail)
                .filter(s -> s.getRole().equals(role));

        if (studentOpt.isEmpty()) {
            return Map.of("message", "If an account exists, a reset code has been sent.");
        }

        Student student = studentOpt.get();
        String otp = generateOtp();
        student.setResetOtp(otp);
        student.setResetOtpExpiry(Instant.now().plus(10, ChronoUnit.MINUTES));
        studentRepository.save(student);

        sendOtpEmail(normalizedEmail, otp, "Your SmartSense password reset code");

        return Map.of("message", "If an account exists, a reset code has been sent.");
    }

    // ---- Forgot Password: Step 2 ----
    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String newPassword = body.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email, otp and newPassword are required");
        }
        if (newPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        String normalizedEmail = email.toLowerCase().trim();
        Student student = studentRepository.findByEmail(normalizedEmail).orElse(null);

        if (student == null || student.getResetOtp() == null || student.getResetOtpExpiry() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending reset request. Please request a new code.");
        }
        if (Instant.now().isAfter(student.getResetOtpExpiry())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code has expired. Please request a new one.");
        }
        if (!student.getResetOtp().equals(otp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect code. Please try again.");
        }

        student.setPassword(passwordEncoder.encode(newPassword));
        student.setResetOtp(null);
        student.setResetOtpExpiry(null);
        studentRepository.save(student);

        return Map.of("message", "Password reset successfully. You can now log in.");
    }
}
