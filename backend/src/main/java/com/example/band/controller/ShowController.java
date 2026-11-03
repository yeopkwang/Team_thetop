package com.example.band.controller;

import com.example.band.model.ShowPost;
import com.example.band.repo.ShowPostRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

@RestController
public class ShowController {
  private final ShowPostRepository repo;

  public ShowController(ShowPostRepository repo) {
    this.repo = repo;
  }

  @GetMapping("/api/shows")
  public List<ShowPost> list() {
    return repo.findAllByOrderByCreatedAtDesc();
  }

  @GetMapping("/api/shows/{id}")
  public ShowPost get(@PathVariable Long id) {
    return repo.findById(id).orElseThrow();
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PostMapping("/api/admin/shows")
  public ShowPost create(@RequestBody ShowPost post) {
    post.setId(null);
    post.setCreatedAt(Instant.now());
    post.setUpdatedAt(Instant.now());
    return repo.save(post);
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PutMapping("/api/admin/shows/{id}")
  public ShowPost update(@PathVariable Long id, @RequestBody ShowPost post) {
    ShowPost existing = repo.findById(id).orElseThrow();
    existing.setTitle(post.getTitle());
    existing.setContent(post.getContent());
    existing.setPosterUrl(post.getPosterUrl());
    existing.setUpdatedAt(Instant.now());
    return repo.save(existing);
  }

  @PreAuthorize("hasRole('ADMIN')")
  @DeleteMapping("/api/admin/shows/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    repo.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PostMapping("/api/admin/shows/{id}/poster")
  public ShowPost upload(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws Exception {
    ShowPost existing = repo.findById(id).orElseThrow();
    Path dir = Path.of("uploads");
    Files.createDirectories(dir);
    String filename = "poster-" + id + "-" + file.getOriginalFilename();
    Path target = dir.resolve(filename);
    file.transferTo(target);
    existing.setPosterUrl("/uploads/" + filename);
    existing.setUpdatedAt(Instant.now());
    return repo.save(existing);
  }
}
