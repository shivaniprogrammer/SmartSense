package com.smartsense.backend.security;

import java.util.List;

/**
 * Equivalent to req.user in your Express middleware.
 * Populated by JwtAuthFilter, read by controllers via AuthUtil.
 */
public class CurrentUser {
    private String id;
    private String role;

    // Populated later by loadFacultyScope-equivalent logic where needed
    private String facultyType;
    private List<String> facultySubjects;
    private String coordinatorClass;

    public CurrentUser(String id, String role) {
        this.id = id;
        this.role = role;
    }

    public String getId() { return id; }
    public String getRole() { return role; }

    public String getFacultyType() { return facultyType; }
    public void setFacultyType(String facultyType) { this.facultyType = facultyType; }

    public List<String> getFacultySubjects() { return facultySubjects; }
    public void setFacultySubjects(List<String> facultySubjects) { this.facultySubjects = facultySubjects; }

    public String getCoordinatorClass() { return coordinatorClass; }
    public void setCoordinatorClass(String coordinatorClass) { this.coordinatorClass = coordinatorClass; }

    public boolean isSubjectScoped() {
        return "teacher".equals(role) && "subject".equals(facultyType)
                && facultySubjects != null && !facultySubjects.isEmpty();
    }
}
