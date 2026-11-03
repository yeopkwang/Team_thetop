package com.example.band.controller;

import com.example.band.model.Video;
import com.example.band.repo.VideoRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/videos")
public class VideoController {
  private final VideoRepository repo;

  public VideoController(VideoRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<Video> list() {
    return repo.findAll();
  }
}
