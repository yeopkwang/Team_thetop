package com.example.band.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "events")
public class Event {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne
  private ShowPost showPost;
  private String title;
  private Instant startAt;
  private String venue;
  private int price;
  private int totalStock;
  private int remainingStock;
  private Instant createdAt = Instant.now();

  // getters and setters
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public ShowPost getShowPost() { return showPost; }
  public void setShowPost(ShowPost showPost) { this.showPost = showPost; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public Instant getStartAt() { return startAt; }
  public void setStartAt(Instant startAt) { this.startAt = startAt; }
  public String getVenue() { return venue; }
  public void setVenue(String venue) { this.venue = venue; }
  public int getPrice() { return price; }
  public void setPrice(int price) { this.price = price; }
  public int getTotalStock() { return totalStock; }
  public void setTotalStock(int totalStock) { this.totalStock = totalStock; }
  public int getRemainingStock() { return remainingStock; }
  public void setRemainingStock(int remainingStock) { this.remainingStock = remainingStock; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
