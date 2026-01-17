package com.example.band.repo;

import com.example.band.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
  List<Ticket> findByBookingId(Long bookingId);
  List<Ticket> findByBookingUserId(Long userId);
  List<Ticket> findByBookingEventId(Long eventId);
  Optional<Ticket> findByTicketCode(String code);
}
