package com.example.band.util;

import com.example.band.model.*;
import com.example.band.repo.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Component
public class DataLoader implements CommandLineRunner {
  private final UserRepository userRepo;
  private final ShowPostRepository showRepo;
  private final VideoRepository videoRepo;
  private final EventRepository eventRepo;

  public DataLoader(UserRepository userRepo, ShowPostRepository showRepo, VideoRepository videoRepo, EventRepository eventRepo) {
    this.userRepo = userRepo;
    this.showRepo = showRepo;
    this.videoRepo = videoRepo;
    this.eventRepo = eventRepo;
  }

  @Override
  public void run(String... args) {
    BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
    userRepo.findByEmail("admin@example.com").orElseGet(() -> {
      User a = new User();
      a.setEmail("admin@example.com");
      a.setName("Admin");
      a.setPassword(enc.encode("password"));
      a.setRole(User.Role.ADMIN);
      return userRepo.save(a);
    });
    userRepo.findByEmail("user@example.com").orElseGet(() -> {
      User u = new User();
      u.setEmail("user@example.com");
      u.setName("Sample User");
      u.setPassword(enc.encode("password"));
      u.setRole(User.Role.USER);
      return userRepo.save(u);
    });

    if (showRepo.count() == 0) {
      showRepo.saveAll(List.of(
          new ShowPost("봄맞이 공연", "밴드의 봄맞이 공연 안내", "/uploads/sample-poster.png"),
          new ShowPost("여름 페스티벌", "야외 무대", "/uploads/sample-poster.png"),
          new ShowPost("가을 소극장", "감성 공연", "/uploads/sample-poster.png")
      ));
    }
    if (videoRepo.count() == 0) {
      videoRepo.saveAll(List.of(
          new Video("라이브 1", "dQw4w9WgXcQ", "첫 라이브"),
          new Video("라이브 2", "LXb3EKWsInQ", "두번째"),
          new Video("라이브 3", "3JZ_D3ELwOQ", "세번째")
      ));
    }
    if (eventRepo.count() == 0) {
      ShowPost first = showRepo.findAll().get(0);
      Event e = new Event();
      e.setTitle("봄맞이 1회차");
      e.setShowPost(first);
      e.setStartAt(LocalDateTime.now().plusDays(7).toInstant(ZoneOffset.UTC));
      e.setVenue("홍대 클럽");
      e.setPrice(30000);
      e.setTotalStock(50);
      e.setRemainingStock(50);
      eventRepo.save(e);
    }
  }
}
