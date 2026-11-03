(function () {
  "use strict";

  const state = {
    shows: [],
    loading: true,
    error: null,
    selectedSession: null,
    qty: 1,
    message: "",
  };

  function getBookPanel() {
    return document.getElementById("tab-book");
  }

  function getQty() {
    const input = document.getElementById("book-qty");
    if (!input) return state.qty;
    const qty = Number(input.value || 1);
    return Number.isFinite(qty) ? qty : state.qty;
  }

  function groupEventsToShows(events) {
    const byShow = new Map();
    const safeEvents = Array.isArray(events) ? events : [];

    safeEvents.forEach((event) => {
      const showId = event.showPost?.id || "show-" + event.id;
      const current = byShow.get(showId) || {
        id: String(showId),
        title: event.showPost?.title || event.title || "Show",
        description: event.showPost?.content || "",
        sessions: [],
      };

      const totalCapacity = Number(event.totalStock || 0);
      const remaining = Number(event.remainingStock || 0);
      const soldQty = Math.max(0, totalCapacity - remaining);

      current.sessions.push({
        id: String(event.id),
        title: event.title || "Session",
        date: event.startAt,
        totalCapacity,
        soldQty,
      });

      byShow.set(showId, current);
    });

    return Array.from(byShow.values());
  }

  function sessionButtonHtml(session) {
    const remaining = Math.max(0, Number(session.totalCapacity) - Number(session.soldQty));
    const selectedClass = state.selectedSession === session.id ? "active" : "";
    const dateText = session.date ? new Date(session.date).toLocaleString("ko-KR") : "-";

    return (
      '<button class="book-session-btn ' +
      selectedClass +
      '" data-session-id="' +
      session.id +
      '">' +
      '<div><strong>' +
      escapeHtml(session.title) +
      "</strong><div class=\"muted\">" +
      escapeHtml(dateText) +
      "</div></div>" +
      '<div class="muted">Remaining ' +
      remaining +
      "</div>" +
      "</button>"
    );
  }

  function showCardHtml(show) {
    const description = show.description ? '<p class="muted">' + escapeHtml(show.description) + "</p>" : "";
    const sessions = show.sessions.map(sessionButtonHtml).join("");
    return (
      '<div class="card show-card">' +
      "<h3>" +
      escapeHtml(show.title) +
      "</h3>" +
      description +
      '<div class="show-sessions">' +
      sessions +
      "</div>" +
      "</div>"
    );
  }

  function renderBookUi() {
    const panel = getBookPanel();
    if (!panel) return;

    const headHtml =
      '<div class="book-top">' +
      '<div class="book-head-copy">' +
      '<p class="book-eyebrow">Ticket Reservation</p>' +
      '<h2 class="book-title">Book a Show</h2>' +
      '<p class="book-subtitle">Select a show session and create your reservation.</p>' +
      "</div>" +
      '<button class="btn" id="book-go-my" type="button">My Ticket</button>' +
      "</div>";

    if (state.loading) {
      panel.innerHTML =
        '<div id="book-app-root" class="container book-screen">' +
        headHtml +
        '<section class="card"><p class="muted">Loading...</p></section>' +
        "</div>";
      bindStaticActions();
      return;
    }

    if (state.error) {
      panel.innerHTML =
        '<div id="book-app-root" class="container book-screen">' +
        headHtml +
        '<section class="card"><p class="muted">Error: ' +
        escapeHtml(state.error) +
        "</p></section>" +
        "</div>";
      bindStaticActions();
      return;
    }

    panel.innerHTML =
      '<div id="book-app-root" class="container book-screen">' +
      headHtml +
      '<section class="card book-list-card">' +
      '<div class="book-show-list">' +
      state.shows.map(showCardHtml).join("") +
      "</div>" +
      "</section>" +
      '<section class="card book-action-card">' +
      '<div class="book-action-row">' +
      '<input id="book-qty" type="number" min="1" max="2" value="' +
      String(state.qty) +
      '" />' +
      '<button class="btn" id="book-btn" type="button">Create Reservation</button>' +
      "</div>" +
      '<div id="book-msg" class="muted">' +
      escapeHtml(state.message || "") +
      "</div>" +
      "</section>" +
      "</div>";

    panel.querySelectorAll(".book-session-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        state.selectedSession = btn.getAttribute("data-session-id");
        renderBookUi();
      });
    });

    bindStaticActions();
    bindSubmitButton();
    bindQtyInput();
  }

  async function loadShows() {
    state.loading = true;
    state.error = null;
    renderBookUi();

    try {
      const events = await apiGet("/events");
      state.shows = groupEventsToShows(events);
    } catch (e) {
      state.error = e && (e.error || e.message) ? e.error || e.message : "Failed to load show data.";
    } finally {
      state.loading = false;
      renderBookUi();
    }
  }

  async function submitBooking() {
    state.message = "";
    if (!state.selectedSession) {
      state.message = "Select a session first.";
      renderBookUi();
      return;
    }

    if (!localStorage.getItem("token")) {
      state.message = "Login is required before booking.";
      renderBookUi();
      if (typeof showTab === "function") showTab("login");
      return;
    }

    const qty = getQty();
    state.qty = qty;
    if (qty < 1) {
      state.message = "Quantity must be at least 1.";
      renderBookUi();
      return;
    }

    state.message = "Creating reservation...";
    renderBookUi();
    try {
      const payload = await apiPost("/bookings", {
        eventId: Number(state.selectedSession),
        quantity: qty,
      });

      localStorage.setItem("latestTicket", JSON.stringify(payload));
      localStorage.setItem("hasBooked", "1");
      state.message = "Reservation created. Check My Ticket.";
      renderBookUi();

      if (typeof renderMyTicket === "function") renderMyTicket(payload);
      if (typeof showTab === "function") showTab("my");
    } catch (e) {
      state.message = e && (e.error || e.message) ? e.error || e.message : "Booking failed.";
      renderBookUi();
    }
  }

  function bindSubmitButton() {
    const submitButton = document.getElementById("book-btn");
    if (!submitButton) return;
    submitButton.onclick = submitBooking;
  }

  function bindQtyInput() {
    const qtyInput = document.getElementById("book-qty");
    if (!qtyInput) return;
    qtyInput.addEventListener("change", function (event) {
      const nextQty = Number(event.target.value || state.qty);
      state.qty = Number.isFinite(nextQty) ? nextQty : state.qty;
    });
  }

  function bindStaticActions() {
    const myButton = document.getElementById("book-go-my");
    if (!myButton) return;
    myButton.onclick = function () {
      if (typeof showTab === "function") showTab("my");
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function init() {
    loadShows();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
