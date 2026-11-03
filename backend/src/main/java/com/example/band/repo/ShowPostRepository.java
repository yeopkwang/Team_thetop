package com.example.band.repo;

import com.example.band.model.ShowPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShowPostRepository extends JpaRepository<ShowPost, Long> {
  List<ShowPost> findAllByOrderByCreatedAtDesc();
}
