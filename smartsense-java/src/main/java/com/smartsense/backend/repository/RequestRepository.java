package com.smartsense.backend.repository;

import com.smartsense.backend.model.Request;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RequestRepository extends MongoRepository<Request, String> {

    List<Request> findByStatusOrderByCreatedAtAsc(String status);

    List<Request> findAllByOrderByCreatedAtDesc();

    List<Request> findByStudentOrderByCreatedAtDesc(String student);
}
