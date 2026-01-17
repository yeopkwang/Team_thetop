package com.example.band.service;

import com.example.band.model.User;
import com.example.band.repo.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService implements org.springframework.security.core.userdetails.UserDetailsService {
  private final UserRepository repo;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  public UserService(UserRepository repo) {
    this.repo = repo;
  }

  public User signup(String email, String name, String rawPassword) {
    if (repo.findByEmail(email).isPresent()) throw new IllegalArgumentException("email exists");
    User u = new User();
    u.setEmail(email);
    u.setName(name);
    u.setPassword(encoder.encode(rawPassword));
    return repo.save(u);
  }

  public boolean checkPassword(User user, String raw) {
    return encoder.matches(raw, user.getPassword());
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    return repo.findByEmail(username).orElseThrow(() -> new UsernameNotFoundException("not found"));
  }
}
