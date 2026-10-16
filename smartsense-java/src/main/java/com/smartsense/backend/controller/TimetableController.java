package com.smartsense.backend.controller;

import com.smartsense.backend.model.Timetable;
import com.smartsense.backend.security.AuthUtil;
import com.smartsense.backend.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetable")
@CrossOrigin(origins = "*")
public class TimetableController {

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

        Criteria criteria = Criteria.where("teacherId").is(user.getId());
        if (day != null && !day.isBlank()) {
            criteria = criteria.and("day").is(day.toUpperCase());
        }

        Query query = new Query(criteria).with(Sort.by(Sort.Direction.ASC, "period"));
        return mongoTemplate.find(query, Timetable.class);
    }
}