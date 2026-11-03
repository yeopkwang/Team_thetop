package com.example.band.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "show_posts")
public class ShowPost {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private String title;
  @Column(columnDefinition = "TEXT")
  private String content;
  private String posterUrl;
  private Instant createdAt = Instant.now();
  private Instant updatedAt = Instant.now();
  private Long authorAdminId;

  public ShowPost() {}
  public ShowPost(String title, String content, String posterUrl) {
    this.title = title;
    this.content = content;
    this.posterUrl = posterUrl;
  }

  // getters and setters
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getContent() { return content; }
  public void setContent(String content) { this.content = content; }
  public String getPosterUrl() { return posterUrl; }
  public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getAuthorAdminId() { return authorAdminId; }
  public void setAuthorAdminId(Long authorAdminId) { this.authorAdminId = authorAdminId; }
}
