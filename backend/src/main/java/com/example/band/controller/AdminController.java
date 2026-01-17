package com.example.band.controller;

import com.example.band.model.Booking;
import com.example.band.model.Ticket;
import com.example.band.model.User;
import com.example.band.repo.BookingRepository;
import com.example.band.repo.TicketRepository;
import com.example.band.service.CheckinService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/admin")
public class AdminController {
  private final BookingRepository bookingRepo;
  private final TicketRepository ticketRepo;
  private final CheckinService checkinService;

  public AdminController(BookingRepository bookingRepo, TicketRepository ticketRepo, CheckinService checkinService) {
    this.bookingRepo = bookingRepo;
    this.ticketRepo = ticketRepo;
    this.checkinService = checkinService;
  }

  @GetMapping("/bookings")
  public List<Booking> listBookings() { return bookingRepo.findAll(); }

  @GetMapping("/tickets")
  public List<Ticket> tickets(@RequestParam(required = false) Long eventId) {
    return eventId == null ? ticketRepo.findAll() : ticketRepo.findByBookingEventId(eventId);
  }

  public record CheckReq(String ticketCode) {}

  @PostMapping("/checkin")
  public ResponseEntity<?> checkin(@RequestBody CheckReq req, @AuthenticationPrincipal User admin) {
    try {
      Ticket t = checkinService.checkIn(req.ticketCode(), admin.getId());
      return ResponseEntity.ok(Map.of("ticket", t));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
    } catch (IllegalStateException e) {
      return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
    }
  }
}
