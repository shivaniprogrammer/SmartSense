package com.smartsense.backend.repository;

import com.smartsense.backend.model.Student;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends MongoRepository<Student, String> {

    Optional<Student> findByEmail(String email);

    Optional<Student> findByBleId(String bleId);

    Optional<Student> findByStudentId(String studentId);

    List<Student> findByRole(String role);

    long countByRole(String role);

    List<Student> findByRoleAndClassSectionIsNull(String role);

    List<Student> findByRoleAndClassSection(String role, String classSection);

    // "unassigned OR in this class" — used by the coordinator assignment screen
    List<Student> findByRoleAndClassSectionInOrRoleAndClassSectionIsNull(
            String role1, List<String> classSections, String role2);

    // Devices that have gone silent longer than the cutoff (used by the absence checker)
    @Query("{ 'role': ?0, 'bleId': { $ne: null }, 'lastSeenAt': { $ne: null, $lt: ?1 } }")
    List<Student> findSilentDevices(String role, Instant cutoff);
}
