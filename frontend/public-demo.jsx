import React, { useState } from "react";
import { Discover } from "./discover";
import { events, eventSlug, formatINR, seatPrice } from "./events";
import { page } from "./navigation";

const storageKey = "seatlock-public-demo-orders";
const rows = ["A", "B", "C", "D", "E", "F"];
const columns = Array.from({ length: 10 }, (_, index) => index + 1);

function readOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function PublicDemo() {
  const params = new URLSearchParams(location.search);
  const screen = params.get("screen");
  const eventId = params.get("event") || "demo";
  const event = events.find((item) => eventSlug(item) === eventId);
  const title = event?.title || "Demo seat map";
  const price = seatPrice(eventId);
  const [orders, setOrders] = useState(readOrders);
  const [selected, setSelected] = useState([]);
  const [outcome, setOutcome] = useState("approved");
  const [message, setMessage] = useState("");
  const booked = new Set(orders.filter((order) => order.eventId === eventId).flatMap((order) => order.seats));

  function checkout() {
    if (outcome === "declined") return setMessage("Test payment declined. Your seats are still selected.");
    const latest = readOrders();
    if (latest.some((order) => order.eventId === eventId && order.seats.some((seat) => selected.includes(seat)))) {
      setOrders(latest);
      setSelected([]);
      return setMessage("A selected seat was already booked in this browser. Pick seats again.");
    }
    const order = { id: crypto.randomUUID(), eventId, title, seats: selected, total: price * selected.length };
    const next = [order, ...latest];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      return setMessage("Demo orders require browser storage. Enable it and try again.");
    }
    setOrders(next);
    setSelected([]);
    setMessage(`Test booking confirmed: ${order.seats.join(", ")}.`);
  }

  if (screen === "bookings") {
    return (
      <main className="bookings-page">
        <header className="bookings-topbar"><a href={page()}>← Back to events</a><span>Public demo</span></header>
        <h1>My demo bookings</h1>
        <p>These test orders are stored only in this browser.</p>
        {!orders.length && <p>No demo bookings yet.</p>}
        <div className="bookings-list">{orders.map((order) => (
          <article key={order.id} className="booking-card"><div><h2>{order.title}</h2><p>Seats: {order.seats.join(", ")}</p></div><p>{formatINR(order.total)} · Simulated</p></article>
        ))}</div>
      </main>
    );
  }

  if (screen !== "seats" || price === null) return <Discover demo />;

  return (
    <main className="seat-page">
      <header className="seat-topbar"><a href={page()}>← Back to events</a><a href={page("bookings")}>My Demo Bookings →</a></header>
      <div className="seat-layout">
        <section>
          <h1>{title}</h1>
          <p className="hint">Public demo · Seats are not shared across visitors.</p>
          <div className="stage">STAGE</div>
          <div className="seat-grid">{rows.map((row) => (
            <div key={row} className="seat-row"><span className="row-label">{row}</span>{columns.map((column) => {
              const seat = row + column;
              const active = selected.includes(seat);
              const taken = booked.has(seat);
              return <button key={seat} className={`seat ${taken ? "booked" : active ? "mine" : "available"}`} aria-label={taken ? `${seat} booked` : seat} aria-pressed={active} disabled={taken} onClick={() => setSelected((previous) => active ? previous.filter((item) => item !== seat) : [...previous, seat])}>{column}</button>;
            })}</div>
          ))}</div>
        </section>
        <aside className="card">
          <h2>Simulated checkout</h2>
          <p>{selected.length ? selected.join(", ") : "Select seats to start."}</p>
          <p>Total: {formatINR(price * selected.length)}</p>
          <label className="sandbox-outcome">Test result
            <select value={outcome} onChange={(change) => setOutcome(change.target.value)}>
              <option value="approved">Approve payment</option><option value="declined">Decline payment</option>
            </select>
          </label>
          <button className="btn primary" disabled={!selected.length} onClick={checkout}>Place test order</button>
          <p role="status" className="msg">{message}</p>
          <p className="hint">No accounts, card details, or real payments.</p>
        </aside>
      </div>
    </main>
  );
}
