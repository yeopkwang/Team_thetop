package com.example.band.controller;

import com.example.band.model.User;
import com.example.band.repo.UserRepository;
import com.example.band.service.JwtService;
import com.example.band.service.UserService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserService userService;
  private final AuthenticationManager authManager;
  private final JwtService jwtService;
  private final UserRepository userRepo;

  public AuthController(UserService userService, AuthenticationManager authManager, JwtService jwtService, UserRepository userRepo) {
    this.userService = userService;
    this.authManager = authManager;
    this.jwtService = jwtService;
    this.userRepo = userRepo;
  }

  public record SignupRequest(@NotBlank String email, @NotBlank String name, @NotBlank String password) {}

  @PostMapping("/signup")
  public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
    User u = userService.signup(req.email(), req.name(), req.password());
    String token = jwtService.generateToken(u.getEmail());
    return ResponseEntity.ok(Map.of("token", token, "user", u));
  }

  public record LoginRequest(String email, String password) {}

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    Authentication auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(req.email(), req.password()));
    User u = (User) auth.getPrincipal();
    return ResponseEntity.ok(Map.of("token", jwtService.generateToken(u.getEmail()), "user", u));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(Authentication auth) {
    if (auth == null) return ResponseEntity.status(401).build();
    User u = userRepo.findByEmail(auth.getName()).orElseThrow();
    return ResponseEntity.ok(Map.of("user", u));
  }
}
