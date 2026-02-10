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
import java.util.stream.Collectors;

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
  public record ResetUserTicketsReq(String email) {}

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

  @GetMapping("/api/admin/bookings/pending")
  public ResponseEntity<?> pendingBookings(@AuthenticationPrincipal User user) {
    if (user == null || user.getRole() != User.Role.ADMIN) {
      return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
    }
    List<Booking> bookings = bookingRepo.findByStatus(Booking.Status.PAYMENT_PENDING);
    List<Map<String, Object>> result = bookings.stream().map(b -> Map.of(
        "booking", b,
        "tickets", ticketRepo.findByBookingId(b.getId())
    )).collect(Collectors.toList());
    return ResponseEntity.ok(result);
  }

  @PostMapping("/api/admin/bookings/{id}/confirm")
  public ResponseEntity<?> confirmBooking(@PathVariable Long id, @AuthenticationPrincipal User user) {
    if (user == null || user.getRole() != User.Role.ADMIN) {
      return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
    }
    Booking b = bookingRepo.findById(id).orElseThrow();
    b.setStatus(Booking.Status.CONFIRMED);
    bookingRepo.save(b);
    List<Ticket> tickets = ticketRepo.findByBookingId(b.getId());
    return ResponseEntity.ok(Map.of("booking", b, "tickets", tickets));
  }

  @PostMapping("/api/admin/users/reset-tickets")
  public ResponseEntity<?> resetUserTickets(@AuthenticationPrincipal User user, @RequestBody ResetUserTicketsReq req) {
    if (user == null || user.getRole() != User.Role.ADMIN) {
      return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
    }
    try {
      BookingService.ResetStats stats = bookingService.resetUserTicketsByEmail(req.email());
      return ResponseEntity.ok(Map.of(
          "email", req.email(),
          "removedBookings", stats.removedBookings(),
          "restoredQuantity", stats.restoredQuantity()
      ));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }
}
