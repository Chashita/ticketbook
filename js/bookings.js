(() => {
  let user;
  try {
    user = JSON.parse(localStorage.getItem("seatlockUser"));
  } catch {
    user = null;
  }

  if (!user || !user.id) {
    const signInUrl = new URL("./auth.html", window.location.href);
    signInUrl.searchParams.set("mode", "login");
    signInUrl.searchParams.set("returnTo", `${location.pathname}${location.search}`);
    window.location.replace(signInUrl.href);
    return;
  }

  const status = document.getElementById("bookings-status");
  const list = document.getElementById("bookings-list");
  const empty = document.getElementById("bookings-empty");
  document.getElementById("account-name").textContent = user.fullName || user.email || "your account";
  const apiBase = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : location.origin;

  function makeBookingCard(booking) {
    const card = document.createElement("article");
    card.className = "booking-card";

    const details = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = booking.eventTitle || booking.eventId || "Event";
    const seats = document.createElement("p");
    seats.className = "booking-seats";
    seats.textContent = `Seats: ${Array.isArray(booking.seats) ? booking.seats.join(", ") : "Unavailable"}`;
    details.append(title, seats);

    const meta = document.createElement("div");
    meta.className = "booking-meta";
    const badge = document.createElement("span");
    badge.className = "booking-status";
    badge.textContent = booking.status || "Confirmed";
    const date = document.createElement("p");
    const bookedAt = new Date(booking.bookedAt);
    date.textContent = Number.isNaN(bookedAt.getTime())
      ? "Date unavailable"
      : bookedAt.toLocaleString();
    meta.append(badge, date);

    card.append(details, meta);
    return card;
  }

  async function loadBookings() {
    status.textContent = "Loading your bookings…";
    status.classList.remove("error");
    empty.hidden = true;
    list.replaceChildren();

    try {
      const response = await fetch(`${apiBase}/api/users/${encodeURIComponent(user.id)}/bookings`);
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The bookings API is unavailable. Restart the backend with `npm start`, then refresh.");
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your bookings.");
      if (!Array.isArray(data.bookings)) throw new Error("The bookings response was invalid.");

      status.textContent = "";
      if (data.bookings.length === 0) {
        empty.hidden = false;
        return;
      }

      data.bookings.forEach((booking) => list.appendChild(makeBookingCard(booking)));
    } catch (error) {
      status.textContent = error.message || "Could not load your bookings.";
      status.classList.add("error");
    }
  }

  loadBookings();
})();
