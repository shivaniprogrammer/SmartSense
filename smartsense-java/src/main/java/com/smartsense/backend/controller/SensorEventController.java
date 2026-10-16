package com.smartsense.backend.controller;

import com.smartsense.backend.model.AttendanceRecord;
import com.smartsense.backend.model.Student;
import com.smartsense.backend.repository.AttendanceRecordRepository;
import com.smartsense.backend.repository.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/sensor-event")
@CrossOrigin(origins = "*")
public class SensorEventController {

    private final AttendanceRecordRepository attendanceRepo;
    private final StudentRepository studentRepo;

    public SensorEventController(AttendanceRecordRepository attendanceRepo,
                                 StudentRepository studentRepo) {
        this.attendanceRepo = attendanceRepo;
        this.studentRepo = studentRepo;
    }

    @PostMapping
    public ResponseEntity<?> receive(@RequestBody Map<String, String> body) {
        String bleId = body.get("bleId");
        String status = body.get("status");

        if (bleId == null || bleId.isBlank() || status == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "bleId or status missing"));
        }

        // The ESP32 may send the address in lower or upper case, so try both
        Optional<Student> studentOpt = studentRepo.findByBleId(bleId);
        if (studentOpt.isEmpty()) studentOpt = studentRepo.findByBleId(bleId.toUpperCase());
        if (studentOpt.isEmpty()) studentOpt = studentRepo.findByBleId(bleId.toLowerCase());
        if (studentOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Unknown BLE ID: " + bleId));
        }

        String studentMongoId = studentOpt.get().getId();
        String today = LocalDate.now(ZoneId.of("Asia/Kolkata")).toString();
        Instant now = Instant.now();

        Optional<AttendanceRecord> existing =
                attendanceRepo.findByStudentAndDate(studentMongoId, today);

        if ("present".equalsIgnoreCase(status)) {
            AttendanceRecord record;
            if (existing.isPresent()) {
                record = existing.get();
                record.setStatus("present");
                record.setCheckOutTime(null);   // student is back
            } else {
                record = new AttendanceRecord();
                record.setStudent(studentMongoId);
                record.setDate(today);
                record.setCheckInTime(now);
                record.setMethod("ble");
                record.setStatus("present");
                record.setConfidence("high");
                record.setCreatedAt(now);
            }
            record.setUpdatedAt(now);
            attendanceRepo.save(record);
            return ResponseEntity.ok(Map.of("result", "present saved"));
        }

        if ("absent".equalsIgnoreCase(status)) {
            if (existing.isPresent()) {
                AttendanceRecord record = existing.get();
                record.setCheckOutTime(now);    // device went silent = left
                record.setUpdatedAt(now);
                attendanceRepo.save(record);
            }
            return ResponseEntity.ok(Map.of("result", "absent noted"));
        }

        return ResponseEntity.badRequest().body(Map.of("error", "status must be present or absent"));
    }
}