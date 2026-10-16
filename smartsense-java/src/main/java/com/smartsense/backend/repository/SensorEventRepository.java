package com.smartsense.backend.repository;

import com.smartsense.backend.model.SensorEvent;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SensorEventRepository extends MongoRepository<SensorEvent, String> {

    List<SensorEvent> findTop10ByOrderByReceivedAtDesc();
}
