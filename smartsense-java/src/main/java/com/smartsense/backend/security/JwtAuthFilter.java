package com.smartsense.backend.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Equivalent to requireAuth in middleware/auth.js, but runs on EVERY request.
 * It doesn't reject unauthenticated requests itself (some routes are public,
 * like /api/auth/login) -- it just attaches the CurrentUser to the request
 * if a valid token is present. Individual controllers then check AuthUtil
 * for whether a user is required.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String CURRENT_USER_ATTR = "currentUser";

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtUtil.parseToken(token);
                String id = claims.get("id", String.class);
                String role = claims.get("role", String.class);
                request.setAttribute(CURRENT_USER_ATTR, new CurrentUser(id, role));
            } catch (Exception e) {
                // Invalid/expired token -- just leave currentUser unset.
                // AuthUtil.requireAuth() will reject it with 401 for routes that need it.
            }
        }

        filterChain.doFilter(request, response);
    }
}
