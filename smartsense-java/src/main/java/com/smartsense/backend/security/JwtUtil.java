package com.smartsense.backend.security;

import com.smartsense.backend.model.Student;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private static final Duration EXPIRY = Duration.ofDays(7); // matches the Node "7d" expiry

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Student student) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + EXPIRY.toMillis());

        return Jwts.builder()
                .claim("id", student.getId())
                .claim("role", student.getRole())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key())
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
