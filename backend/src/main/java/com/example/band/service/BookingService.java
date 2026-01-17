package com.example.band.service;

import com.example.band.model.Booking;
import com.example.band.model.Event;
import com.example.band.model.Ticket;
import com.example.band.model.User;
import com.example.band.repo.BookingRepository;
import com.example.band.repo.EventRepository;
import com.example.band.repo.TicketRepository;
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

  public BookingService(EventRepository eventRepo, BookingRepository bookingRepo, TicketRepository ticketRepo) {
    this.eventRepo = eventRepo;
    this.bookingRepo = bookingRepo;
    this.ticketRepo = ticketRepo;
  }

  @Transactional
  public Booking createBooking(User user, Long eventId, int quantity) {
    Event event = eventRepo.findById(eventId).orElseThrow(() -> new IllegalArgumentException("event not found"));
    if (quantity < 1) throw new IllegalArgumentException("quantity must be >=1");
    if (event.getRemainingStock() < quantity) throw new IllegalStateException("not enough stock");
    event.setRemainingStock(event.getRemainingStock() - quantity);
    Booking booking = new Booking();
    booking.setUser(user);
    booking.setEvent(event);
    booking.setQuantity(quantity);
    booking.setStatus(Booking.Status.CONFIRMED);
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
}
