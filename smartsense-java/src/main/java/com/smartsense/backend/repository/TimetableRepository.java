package com.smartsense.backend.repository;

import com.smartsense.backend.model.Timetable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TimetableRepository extends MongoRepository<Timetable, String> {

    List<Timetable> findBySubjectCodeIn(List<String> subjectCodes);

    List<Timetable> findByClassSection(String classSection);

    List<Timetable> findByTeacherIdAndClassSectionNot(String teacherId, String classSection);

    Optional<Timetable> findBySubjectCodeAndClassSectionAndTeacherId(
            String subjectCode, String classSection, String teacherId);
}
