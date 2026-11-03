package com.example.band.service;

import com.example.band.model.Ticket;
import com.example.band.repo.TicketRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class CheckinService {
  private final TicketRepository ticketRepo;

  public CheckinService(TicketRepository ticketRepo) {
    this.ticketRepo = ticketRepo;
  }

  public Ticket checkIn(String ticketCode, Long adminId) {
    Ticket t = ticketRepo.findByTicketCode(ticketCode).orElseThrow(() -> new IllegalArgumentException("ticket not found"));
    if (t.getCheckedInAt() != null) throw new IllegalStateException("already checked-in");
    t.setCheckedInAt(Instant.now());
    t.setCheckinByAdminId(adminId);
    return ticketRepo.save(t);
  }
}
