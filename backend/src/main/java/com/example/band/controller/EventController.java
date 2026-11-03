package com.example.band.controller;

import com.example.band.model.Event;
import com.example.band.repo.EventRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
public class EventController {
  private final EventRepository repo;

  public EventController(EventRepository repo) {
    this.repo = repo;
  }

  @GetMapping("/api/events")
  public List<Event> list() { return repo.findAll(); }

  @GetMapping("/api/events/{id}")
  public Event get(@PathVariable Long id) { return repo.findById(id).orElseThrow(); }

  @PreAuthorize("hasRole('ADMIN')")
  @PostMapping("/api/admin/events")
  public Event create(@RequestBody Event e) {
    e.setId(null);
    e.setCreatedAt(Instant.now());
    return repo.save(e);
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PutMapping("/api/admin/events/{id}")
  public Event update(@PathVariable Long id, @RequestBody Event e) {
    Event existing = repo.findById(id).orElseThrow();
    existing.setTitle(e.getTitle());
    existing.setVenue(e.getVenue());
    existing.setStartAt(e.getStartAt());
    existing.setPrice(e.getPrice());
    existing.setTotalStock(e.getTotalStock());
    existing.setRemainingStock(e.getRemainingStock());
    existing.setShowPost(e.getShowPost());
    return repo.save(existing);
  }
}
