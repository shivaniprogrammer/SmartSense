package com.smartsense.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "students")
public class Student {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true, sparse = true)
    private String studentId;

    @Indexed(unique = true)
    private String email;

    private String password;

    private String role = "student"; // "student" | "teacher" | "admin"

    @Indexed(unique = true, sparse = true)
    private String bleId;

    private boolean enrollmentComplete = false;

    private boolean emailVerified = false;
    private String otpCode;
    private Instant otpExpiry;

    private String resetOtp;
    private Instant resetOtpExpiry;

    // "subject" | "coordinator"
    private String facultyType;
    private List<String> facultySubjects = new ArrayList<>();
    private boolean facultySetupComplete = false;

    private String classSection;

    private Instant lastSeenAt;

    private Instant createdAt;
    private Instant updatedAt;

    // --- Getters and setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getBleId() { return bleId; }
    public void setBleId(String bleId) { this.bleId = bleId; }

    public boolean isEnrollmentComplete() { return enrollmentComplete; }
    public void setEnrollmentComplete(boolean enrollmentComplete) { this.enrollmentComplete = enrollmentComplete; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public String getOtpCode() { return otpCode; }
    public void setOtpCode(String otpCode) { this.otpCode = otpCode; }

    public Instant getOtpExpiry() { return otpExpiry; }
    public void setOtpExpiry(Instant otpExpiry) { this.otpExpiry = otpExpiry; }

    public String getResetOtp() { return resetOtp; }
    public void setResetOtp(String resetOtp) { this.resetOtp = resetOtp; }

    public Instant getResetOtpExpiry() { return resetOtpExpiry; }
    public void setResetOtpExpiry(Instant resetOtpExpiry) { this.resetOtpExpiry = resetOtpExpiry; }

    public String getFacultyType() { return facultyType; }
    public void setFacultyType(String facultyType) { this.facultyType = facultyType; }

    public List<String> getFacultySubjects() { return facultySubjects; }
    public void setFacultySubjects(List<String> facultySubjects) { this.facultySubjects = facultySubjects; }

    public boolean isFacultySetupComplete() { return facultySetupComplete; }
    public void setFacultySetupComplete(boolean facultySetupComplete) { this.facultySetupComplete = facultySetupComplete; }

    public String getClassSection() { return classSection; }
    public void setClassSection(String classSection) { this.classSection = classSection; }

    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
