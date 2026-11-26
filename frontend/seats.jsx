import React, { useEffect, useState } from "react";
import { page } from "./navigation";
import { formatINR, seatPrice } from "./events";

function tabIdentity(accountId) {
  const key = `seatlock-tab-${accountId}`;
  const identity = sessionStorage.getItem(key) || crypto.randomUUID();
  sessionStorage.setItem(key, identity);
  return identity;
}

export function Seats({ account, params }) {
  const eventId = params.get("event") || "demo";
  const title = params.get("title") || (eventId === "demo" ? "Demo seat map" : eventId);
  const api = `/api/events/${encodeURIComponent(eventId)}`;
  const [userId] = useState(() => tabIdentity(account.id));
  const [map, setMap] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [clock, setClock] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [testOutcome, setTestOutcome] = useState("approved");
  const paypalOrderId = params.has("paypalCanceled") ? null : params.get("token");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const stream = new EventSource(api + "/stream");
    const timer = setInterval(() => setClock(Date.now()), 250);
    let snapshot;
    let queued = [];
    let ready = false;

    async function refresh() {
      snapshot?.abort();
      const request = new AbortController();
      snapshot = request;
      ready = false;
      queued = [];
      try {
        const response = await fetch(api + "/seats", { signal: request.signal });
        if (!response.ok) throw new Error("Could not load the seat map.");
        const data = await response.json();
        if (request.signal.aborted) return;
        const seats = { ...data.seats };
        for (const update of queued) seats[update.seatId] = update.seat;
        setMap({ ...data, seats, offset: data.serverNow - Date.now() });
        setLoadError("");
        ready = true;
        queued = [];
      } catch (error) {
        if (!request.signal.aborted) setLoadError(error.message);
      }
    }

    stream.onopen = () => { setConnected(true); refresh(); };
    stream.onerror = () => setConnected(false);
    stream.addEventListener("reset", refresh);
    stream.addEventListener("seat", (event) => {
      const update = JSON.parse(event.data);
      if (!ready) {
        queued.push(update);
        return;
      }
      setMap((previous) => ({ ...previous, seats: { ...previous.seats, [update.seatId]: update.seat } }));
    });
    stream.addEventListener("log", (event) => {
      const entry = JSON.parse(event.data);
      setLogs((previous) => [entry, ...previous].slice(0, 80));
    });
    return () => { stream.close(); snapshot?.abort(); clearInterval(timer); };
  }, [api]);

  async function action(path, body = {}, report) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(api + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Seat action failed.");
      if (report) setMessage(report(data));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  const now = clock + (map?.offset || 0);
  const holds = Object.entries(map?.seats || {}).filter(([, seat]) => seat.status === "held" && seat.heldBy === userId && seat.holdExpiresAt > now);
  const seconds = holds.length ? Math.ceil((Math.min(...holds.map(([, seat]) => seat.holdExpiresAt)) - now) / 1000) : 0;
  const unavailable = pending || !connected || Boolean(loadError);
  const price = seatPrice(eventId);
  const labels = { available: "Available", mine: "Held by you", held: "Held by someone else", booked: "Booked" };

  return (
    <main className="seat-page">
      <header className="seat-topbar"><a href={page()}>← Back to events</a><span className="who">Signed in as <strong>{account.fullName}</strong></span></header>
      <div className="seat-layout">
        <section>
          <h1>Pick your <em>seats.</em></h1>
          <p className="hint">{title} · Click a seat to hold it. Click again to release it.</p>
          <p role="status">{loadError || (!connected ? "Connecting to live seats…" : !map ? "Loading seats…" : "Live seat map")}</p>
          <div className="stage">STAGE</div>
          <div className="seat-grid">
            {map?.rows.map((row) => (
              <div className="seat-row" key={row}>
                <span className="row-label">{row}</span>
                {Array.from({ length: map.cols }, (_, index) => {
                  const id = `${row}${index + 1}`;
                  const seat = map.seats[id];
                  const status = seat.status === "held" && seat.heldBy === userId ? "mine" : seat.status;
                  return <button key={id} className={`seat ${status}`} disabled={unavailable || status === "booked" || status === "held"} aria-label={`${id}: ${labels[status]}`} onClick={() => action(`/seats/${id}/${status === "mine" ? "release" : "hold"}`)}>{index + 1}</button>;
                })}
              </div>
            ))}
          </div>
          <div className="legend">{Object.entries(labels).map(([status, label]) => <span key={status}><i className={`dot ${status}`} />{label}</span>)}</div>
        </section>
        <aside>
          <section className="card">
            <h2>Your holds</h2>
            <ul className="my-holds">{holds.map(([id]) => <li key={id}>{id}</li>)}</ul>
            <p className="timer">{seconds ? `Hold expires in ${seconds}s` : "No active holds"}</p>
            <p>{price === null ? "No test pricing available" : `${holds.length} × ${formatINR(price)} · Total ${formatINR(price * holds.length)}`}</p>
            <p className="hint">Sandbox checkout. No real money is charged.</p>
            <label className="sandbox-outcome">Test result
              <select value={testOutcome} onChange={(event) => setTestOutcome(event.target.value)}>
                <option value="approved">Approve payment</option>
                <option value="declined">Decline payment</option>
              </select>
            </label>
            <button className="btn primary" disabled={unavailable || !seconds || price === null} onClick={() => action("/book", { accountId: Number(account.id), testOutcome }, (data) => {
              setConfirmed(true);
              return `Test order ${data.booking.id} confirmed · ${formatINR(data.booking.payment.amount)}`;
            })}>Place test order</button>
            {map?.paypalSeatPrice && (
              <div className="sandbox-outcome">
                <p className="hint">PayPal Sandbox uses a separate demo price: US${map.paypalSeatPrice} per seat. No real charge.</p>
                {params.has("paypalCanceled") && <p role="status">PayPal checkout canceled.</p>}
                {paypalOrderId && !confirmed ? (
                  <button className="btn ghost" disabled={pending} onClick={() => action("/book", {
                    accountId: Number(account.id), paypalOrderId,
                  }, (data) => {
                    setConfirmed(true);
                    return `PayPal test order confirmed · US$${data.booking.payment.amount.toFixed(2)}`;
                  })}>Confirm PayPal test order</button>
                ) : (
                  <button className="btn ghost" disabled={unavailable || !seconds} onClick={() => action("/paypal", {
                    accountId: Number(account.id),
                  }, (data) => {
                    location.assign(data.approvalUrl);
                    return "Opening PayPal Sandbox…";
                  })}>PayPal Sandbox · US${map.paypalSeatPrice * holds.length}</button>
                )}
              </div>
            )}
            <p className="msg" role="status">{message}</p>
            {confirmed && <a className="experience-link" href={page("bookings")}>View my bookings →</a>}
          </section>
          {eventId === "demo" && (
            <details className="card">
              <summary>Concurrency demo</summary>
              <div className="btn-row">{["safe", "unsafe"].map((mode) => (
                <button key={mode} className="btn ghost" disabled={unavailable} onClick={() => action("/race", { mode }, (result) => `Seat ${result.seatId}: ${result.winners} winner(s), ${result.rejected} rejected.`)}>{mode} demo</button>
              ))}</div>
              <button className="btn ghost" disabled={unavailable} onClick={() => {
                if (window.confirm("Reset the demo seat map and delete its bookings?")) action("/reset", {}, () => "Demo reset.");
              }}>Reset demo</button>
              <ul className="log">{logs.map((entry, index) => <li key={`${entry.time}-${index}`}>{entry.message}</li>)}</ul>
            </details>
          )}
        </aside>
      </div>
    </main>
  );
}
