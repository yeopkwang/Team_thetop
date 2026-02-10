package com.example.band.service;

import com.example.band.model.Booking;
import com.example.band.model.Event;
import com.example.band.model.Ticket;
import com.example.band.model.User;
import com.example.band.repo.BookingRepository;
import com.example.band.repo.EventRepository;
import com.example.band.repo.TicketRepository;
import com.example.band.repo.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class BookingService {
  private final EventRepository eventRepo;
  private final BookingRepository bookingRepo;
  private final TicketRepository ticketRepo;
  private final UserRepository userRepo;

  public BookingService(EventRepository eventRepo, BookingRepository bookingRepo, TicketRepository ticketRepo, UserRepository userRepo) {
    this.eventRepo = eventRepo;
    this.bookingRepo = bookingRepo;
    this.ticketRepo = ticketRepo;
    this.userRepo = userRepo;
  }

  @Transactional
  public Booking createBooking(User user, Long eventId, int quantity) {
    Event event = eventRepo.findById(eventId).orElseThrow(() -> new IllegalArgumentException("event not found"));
    if (quantity < 1) throw new IllegalArgumentException("quantity must be >=1");
    if (quantity > 2) throw new IllegalArgumentException("최대 2장까지 예매 가능합니다.");
    if (event.getRemainingStock() < quantity) throw new IllegalStateException("not enough stock");
    event.setRemainingStock(event.getRemainingStock() - quantity);
    Booking booking = new Booking();
    booking.setUser(user);
    booking.setEvent(event);
    booking.setQuantity(quantity);
    booking.setStatus(Booking.Status.PAYMENT_PENDING);
    booking.setCreatedAt(Instant.now());
    Booking saved = bookingRepo.save(booking);
    for (int i = 0; i < quantity; i++) {
      Ticket t = new Ticket();
      t.setBooking(saved);
      t.setTicketCode(UUID.randomUUID().toString());
      t.setQrPayload(t.getTicketCode());
      ticketRepo.save(t);
    }
    return saved;
  }

  public List<Booking> userBookings(User user) {
    return bookingRepo.findByUserId(user.getId());
  }

  public record ResetStats(int removedBookings, int restoredQuantity) {}

  @Transactional
  public ResetStats resetUserTicketsByEmail(String email) {
    User user = userRepo.findByEmail(email)
        .orElseThrow(() -> new IllegalArgumentException("user not found"));
    List<Booking> bookings = bookingRepo.findByUserId(user.getId());
    if (bookings.isEmpty()) return new ResetStats(0, 0);

    int restored = 0;
    for (Booking booking : bookings) {
      Event event = booking.getEvent();
      int qty = booking.getQuantity();
      if (event != null) {
        int updated = Math.min(event.getRemainingStock() + qty, event.getTotalStock());
        event.setRemainingStock(updated);
        eventRepo.save(event);
      }
      restored += qty;
      ticketRepo.deleteAll(ticketRepo.findByBookingId(booking.getId()));
    }
    bookingRepo.deleteAll(bookings);
    return new ResetStats(bookings.size(), restored);
  }
}
