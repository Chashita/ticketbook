import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../css/base.css";
import "../css/site.css";
import "../css/bookings.css";
import "../css/discover.css";
import "../css/auth.css";
import "../css/seats.css";
import "./app.css";
import { Discover } from "./discover";
import { Account } from "./account";
import { Seats } from "./seats";
import { page, signIn } from "./navigation";
import { formatINR } from "./events";

function readAccount() {
  try {
    return JSON.parse(localStorage.getItem("seatlockUser"));
  } catch {
    return null;
  }
}

function BookingCard({ booking }) {
  const bookedAt = new Date(booking.bookedAt);
  return (
    <article className="booking-card">
      <div>
        <h2>{booking.eventTitle || booking.eventId || "Event"}</h2>
        <p className="booking-seats">
          Seats: {Array.isArray(booking.seats) ? booking.seats.join(", ") : "Unavailable"}
        </p>
      </div>
      <div className="booking-meta">
        <span className="booking-status">{booking.status || "Confirmed"}</span>
        {booking.payment?.mode === "sandbox" && <p>Test payment · {formatINR(booking.payment.amount)}</p>}
        {booking.payment?.mode === "paypal-sandbox" && <p>PayPal Sandbox · US$${booking.payment.amount.toFixed(2)}</p>}
        <p>{Number.isNaN(bookedAt.getTime()) ? "Date unavailable" : bookedAt.toLocaleString()}</p>
      </div>
    </article>
  );
}

function BookingsPage() {
  const [account] = useState(readAccount);
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  const accountId = account?.id;

  useEffect(() => {
    if (!accountId) {
      location.replace(signIn());
      return;
    }

    const controller = new AbortController();
    async function loadBookings() {
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(accountId)}/bookings`, {
          signal: controller.signal,
        });
        if (!response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("The bookings API is unavailable. Start the backend and refresh.");
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load your bookings.");
        if (!Array.isArray(data.bookings)) throw new Error("The bookings response was invalid.");
        setBookings(data.bookings);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message || "Could not load your bookings.");
      }
    }
    loadBookings();
    return () => controller.abort();
  }, [accountId]);

  if (!accountId) return null;

  return (
    <main className="bookings-page">
      <header className="bookings-topbar">
        <a href={page()}>← Back to events</a>
        <span>Signed in as <strong>{account.fullName || account.email || "your account"}</strong></span>
      </header>
      <section aria-labelledby="bookings-title">
        <span className="section-label">YOUR SEATLOCK ACCOUNT</span>
        <h1 id="bookings-title">My <em>bookings.</em></h1>
        <p className="bookings-intro">Your confirmed tickets, all in one place.</p>
        <p className={`bookings-status${error ? " error" : ""}`} role="status">
          {error || (bookings === null ? "Loading your bookings…" : "")}
        </p>
        <div className="bookings-list">
          {bookings?.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
        </div>
        {bookings?.length === 0 && (
          <div className="bookings-empty">
            <h2>No bookings yet</h2>
            <p>When you book seats, your confirmed tickets will show up here.</p>
            <a className="browse-events" href={page() + "#events"}>Browse events →</a>
          </div>
        )}
      </section>
    </main>
  );
}

function App() {
  const [account, setAccount] = useState(readAccount);
  const params = new URLSearchParams(location.search);
  const legacyScreens = { "/auth.html": "account", "/seats.html": "seats", "/bookings.html": "bookings" };
  const screen = params.get("screen") || legacyScreens[location.pathname] || "discover";
  const needsSignIn = screen === "seats" && !account?.id;

  useEffect(() => {
    if (needsSignIn) location.replace(signIn());
    const titles = { discover: "Live Events", account: "Your Account", seats: "Pick Seats", bookings: "My Bookings" };
    document.title = `SeatLock — ${titles[screen] || titles.discover}`;
  }, [screen, needsSignIn]);

  if (needsSignIn) return null;
  if (screen === "account") return <Account params={params} />;
  if (screen === "seats") return <Seats account={account} params={params} />;
  if (screen === "bookings") return <BookingsPage />;
  return <Discover account={account} logout={() => {
    localStorage.removeItem("seatlockUser");
    setAccount(null);
  }} />;
}

createRoot(document.getElementById("root")).render(<App />);
