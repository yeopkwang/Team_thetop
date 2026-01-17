package com.example.band.controller;

import com.example.band.model.Booking;
import com.example.band.model.Ticket;
import com.example.band.model.User;
import com.example.band.repo.BookingRepository;
import com.example.band.repo.TicketRepository;
import com.example.band.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class BookingController {
  private final BookingService bookingService;
  private final BookingRepository bookingRepo;
  private final TicketRepository ticketRepo;

  public BookingController(BookingService bookingService, BookingRepository bookingRepo, TicketRepository ticketRepo) {
    this.bookingService = bookingService;
    this.bookingRepo = bookingRepo;
    this.ticketRepo = ticketRepo;
  }

  public record BookingReq(Long eventId, int quantity) {}

  @PostMapping("/api/bookings")
  public ResponseEntity<?> create(@AuthenticationPrincipal User user, @RequestBody BookingReq req) {
    try {
      Booking b = bookingService.createBooking(user, req.eventId(), req.quantity());
      List<Ticket> tickets = ticketRepo.findByBookingId(b.getId());
      return ResponseEntity.ok(Map.of("booking", b, "tickets", tickets));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    } catch (IllegalStateException e) {
      return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
    }
  }

  @GetMapping("/api/my/bookings")
  public List<Booking> myBookings(@AuthenticationPrincipal User user) {
    return bookingRepo.findByUserId(user.getId());
  }

  @GetMapping("/api/my/tickets")
  public List<Ticket> myTickets(@AuthenticationPrincipal User user) {
    return ticketRepo.findByBookingUserId(user.getId());
  }

  @GetMapping("/api/my/tickets/{id}")
  public Ticket ticket(@PathVariable Long id, @AuthenticationPrincipal User user) {
    Ticket t = ticketRepo.findById(id).orElseThrow();
    if (!t.getBooking().getUser().getId().equals(user.getId())) throw new RuntimeException("forbidden");
    return t;
  }
}
