package com.example.band.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tickets")
public class Ticket {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  private Booking booking;

  @Column(unique = true)
  private String ticketCode;

  private String qrPayload;

  private Instant checkedInAt;
  private Long checkinByAdminId;

  // getters and setters
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Booking getBooking() { return booking; }
  public void setBooking(Booking booking) { this.booking = booking; }
  public String getTicketCode() { return ticketCode; }
  public void setTicketCode(String ticketCode) { this.ticketCode = ticketCode; }
  public String getQrPayload() { return qrPayload; }
  public void setQrPayload(String qrPayload) { this.qrPayload = qrPayload; }
  public Instant getCheckedInAt() { return checkedInAt; }
  public void setCheckedInAt(Instant checkedInAt) { this.checkedInAt = checkedInAt; }
  public Long getCheckinByAdminId() { return checkinByAdminId; }
  public void setCheckinByAdminId(Long checkinByAdminId) { this.checkinByAdminId = checkinByAdminId; }
}
