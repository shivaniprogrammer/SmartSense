package com.smartsense.backend.controller;

import com.smartsense.backend.model.Timetable;
import com.smartsense.backend.security.AuthUtil;
import com.smartsense.backend.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;


@RestController
@RequestMapping("/api/timetable")
@CrossOrigin(origins = "*")
public class TimetableController {

    private static final Logger log = LoggerFactory.getLogger(TimetableController.class);

    private final MongoTemplate mongoTemplate;

    public TimetableController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    // GET /api/timetable/me            -> whole week
    // GET /api/timetable/me?day=MONDAY -> one day
    @GetMapping("/me")
    public List<Timetable> mine(HttpServletRequest request,
                                @RequestParam(required = false) String day) {
        CurrentUser user = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(user, "teacher", "admin");

        log.info("Fetching timetable for teacherId={}, role={}, day={}",
                user.getId(), user.getRole(), day);

        // Match teacherId whether it was stored as a String or as an ObjectId
        List<Object> idVariants = new ArrayList<>();
        idVariants.add(user.getId());
        if (ObjectId.isValid(user.getId())) {
            idVariants.add(new ObjectId(user.getId()));
        }

        Criteria criteria = Criteria.where("teacherId").in(idVariants);
        if (day != null && !day.isBlank()) {
            criteria = criteria.and("day").is(day.toUpperCase());
        }

        Query query = new Query(criteria).with(Sort.by(Sort.Direction.ASC, "period"));
        List<Timetable> result = mongoTemplate.find(query, Timetable.class);

        log.info("Found {} periods", result.size());

        if (result.isEmpty()) {
            long total = mongoTemplate.count(new Query(), Timetable.class);
            log.warn("No periods matched. Total documents in timetables collection: {}", total);
        }

        return result;
    }
}