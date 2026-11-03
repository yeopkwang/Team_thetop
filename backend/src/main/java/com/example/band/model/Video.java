package com.example.band.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "youtube_videos")
public class Video {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private String title;
  private String youtubeId;
  private String description;
  private Instant createdAt = Instant.now();

  public Video() {}
  public Video(String title, String youtubeId, String description) {
    this.title = title;
    this.youtubeId = youtubeId;
    this.description = description;
  }

  // getters and setters
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getYoutubeId() { return youtubeId; }
  public void setYoutubeId(String youtubeId) { this.youtubeId = youtubeId; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
