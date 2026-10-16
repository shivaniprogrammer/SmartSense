package com.smartsense.backend.controller;

import com.smartsense.backend.model.AttendanceRecord;
import com.smartsense.backend.model.Student;
import com.smartsense.backend.repository.StudentRepository;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final StudentRepository studentRepo;
    private final MongoTemplate mongoTemplate;

    public AttendanceController(StudentRepository studentRepo, MongoTemplate mongoTemplate) {
        this.studentRepo = studentRepo;
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/student-id/{studentId}")
    public List<AttendanceRecord> getByStudentId(@PathVariable String studentId) {
        List<Object> possibleValues = new ArrayList<>();
        possibleValues.add(studentId); // records that store the roll number

        Optional<Student> studentOpt = studentRepo.findByStudentId(studentId);
        if (studentOpt.isPresent()) {
            String mongoId = studentOpt.get().getId();
            possibleValues.add(mongoId); // _id stored as text
            if (ObjectId.isValid(mongoId)) {
                possibleValues.add(new ObjectId(mongoId)); // _id stored as ObjectId
            }
        }

        Query query = new Query(Criteria.where("student").in(possibleValues))
                .with(Sort.by(Sort.Direction.DESC, "date"));

        return mongoTemplate.find(query, AttendanceRecord.class);
    }

        @GetMapping("/today")
    public List<AttendanceRecord> today() {
        String today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).toString();
        Query query = new Query(Criteria.where("date").is(today));
        return mongoTemplate.find(query, AttendanceRecord.class);
    }
}