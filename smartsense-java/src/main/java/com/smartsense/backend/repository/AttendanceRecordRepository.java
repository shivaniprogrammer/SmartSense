package com.smartsense.backend.repository;

import com.smartsense.backend.model.AttendanceRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends MongoRepository<AttendanceRecord, String> {

    Optional<AttendanceRecord> findByStudentAndDate(String student, String date);

    List<AttendanceRecord> findByDate(String date);

    List<AttendanceRecord> findByDateAndSubject(String date, String subject);

    List<AttendanceRecord> findByDateAndSubjectIn(String date, List<String> subjects);

    List<AttendanceRecord> findByStudentOrderByDateDesc(String student);

    List<AttendanceRecord> findByStudentInAndDate(List<String> studentIds, String date);

    long countByDateAndStatusIn(String date, List<String> statuses);
}
