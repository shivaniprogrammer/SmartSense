package com.smartsense.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;

/**
 * Called at the top of controller methods, equivalent to putting
 * requireAuth / requireRole("teacher", "admin") in the Express route.
 *
 * Example:
 *   CurrentUser user = AuthUtil.requireAuth(request);
 *   AuthUtil.requireRole(user, "teacher", "admin");
 */
public class AuthUtil {

    public static CurrentUser getCurrentUser(HttpServletRequest request) {
        return (CurrentUser) request.getAttribute(JwtAuthFilter.CURRENT_USER_ATTR);
    }

    public static CurrentUser requireAuth(HttpServletRequest request) {
        CurrentUser user = getCurrentUser(request);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No token provided. Please log in.");
        }
        return user;
    }

    public static void requireRole(CurrentUser user, String... allowedRoles) {
        List<String> allowed = Arrays.asList(allowedRoles);
        if (!allowed.contains(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You don't have permission to do this.");
        }
    }
}
