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
  private static final int TARGET_TOTAL_STOCK = 106;

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
      a.setPhone("010-0000-0000");
      a.setPassword(enc.encode("password"));
      a.setRole(User.Role.ADMIN);
      return userRepo.save(a);
    });
    userRepo.findByEmail("user@example.com").orElseGet(() -> {
      User u = new User();
      u.setEmail("user@example.com");
      u.setName("Sample User");
      u.setPhone("010-1111-1111");
      u.setPassword(enc.encode("password"));
      u.setRole(User.Role.USER);
      return userRepo.save(u);
    });

    if (showRepo.count() == 0) {
      showRepo.saveAll(List.of(
          new ShowPost("Spring Concert", "Band spring concert notice", "/uploads/sample-poster.png"),
          new ShowPost("Summer Festival", "Outdoor stage", "/uploads/sample-poster.png"),
          new ShowPost("Autumn Small Theater", "Emotional concert", "/uploads/sample-poster.png")
      ));
    }
    if (videoRepo.count() == 0) {
      videoRepo.saveAll(List.of(
          new Video("Live 1", "dQw4w9WgXcQ", "First live"),
          new Video("Live 2", "LXb3EKWsInQ", "Second live"),
          new Video("Live 3", "3JZ_D3ELwOQ", "Third live")
      ));
    }
    if (eventRepo.count() == 0) {
      ShowPost first = showRepo.findAll().get(0);
      Event e = new Event();
      e.setTitle("작전명;문 4 1회차");
      e.setShowPost(first);
      e.setStartAt(LocalDateTime.now().plusDays(7).toInstant(ZoneOffset.UTC));
      e.setVenue("DGT 아트센터");
      e.setPrice(30000);
      e.setTotalStock(TARGET_TOTAL_STOCK);
      e.setRemainingStock(TARGET_TOTAL_STOCK);
      eventRepo.save(e);
    } else {
      Event e = eventRepo.findAll().get(0);
      boolean changed = false;
      if (looksCorrupt(e.getTitle()) || looksCorrupt(e.getVenue())
          || "Spring Concert Session 1".equals(e.getTitle())
          || "Hongdae Club".equals(e.getVenue())) {
        e.setTitle("작전명;문 4 1회차");
        e.setVenue("DGT 아트센터");
        changed = true;
      }

      if (e.getTotalStock() != TARGET_TOTAL_STOCK) {
        int sold = Math.max(0, e.getTotalStock() - e.getRemainingStock());
        int adjustedRemaining = Math.max(0, TARGET_TOTAL_STOCK - sold);
        e.setTotalStock(TARGET_TOTAL_STOCK);
        e.setRemainingStock(adjustedRemaining);
        changed = true;
      } else if (e.getRemainingStock() > e.getTotalStock()) {
        e.setRemainingStock(e.getTotalStock());
        changed = true;
      }

      if (changed) {
        eventRepo.save(e);
      }
    }
  }

  private boolean looksCorrupt(String s) {
    if (s == null || s.isBlank()) return true;
    if (s.contains("�")) return true;
    return s.matches(".*[\\u0100-\\u024F\\u1E00-\\u1EFF].*");
  }
}
