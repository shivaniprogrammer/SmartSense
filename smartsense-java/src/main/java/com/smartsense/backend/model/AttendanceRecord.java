package com.smartsense.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "attendancerecords")
public class AttendanceRecord {

    @Id
    private String id;

    private String student; // Student._id as a string reference

    private String date; // "YYYY-MM-DD"

    private Instant checkInTime;
    private Instant checkOutTime;

    private String method;     // "ble" | "manual"
    private String status;     // "present" | "late" | "absent"
    private String confidence; // "high" | ...

    private String subject;
    private Integer period;

    private Instant createdAt;
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudent() { return student; }
    public void setStudent(String student) { this.student = student; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public Instant getCheckInTime() { return checkInTime; }
    public void setCheckInTime(Instant checkInTime) { this.checkInTime = checkInTime; }

    public Instant getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(Instant checkOutTime) { this.checkOutTime = checkOutTime; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public Integer getPeriod() { return period; }
    public void setPeriod(Integer period) { this.period = period; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
