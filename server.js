const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { installPostgresBooking } = require("./postgres-booking");
const { installPostgresAccounts } = require("./postgres-accounts");

if (fs.existsSync(path.join(__dirname, ".env"))) require("node:process").loadEnvFile(path.join(__dirname, ".env"));

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
const frontendDir = path.join(__dirname, "dist");
app.use("/react/assets", express.static(path.join(frontendDir, "assets")));
app.get("/favicon.svg", (req, res) => res.sendFile(path.join(__dirname, "favicon.svg")));
app.get(["/", "/react", "/index.html", "/auth.html", "/seats.html", "/bookings.html"], (req, res, next) => {
  res.sendFile(path.join(frontendDir, "index.html"), (error) => {
    if (!error) return;
    if (error.code === "ENOENT") return res.status(503).send("Run npm run build:react to build SeatLock.");
    next(error);
  });
});

const USERS_FILE = path.join(__dirname, "users.json");
const BOOKINGS_FILE = path.join(__dirname, "bookings.json");

function readBookings() {
  try {
    const data = fs.readFileSync(BOOKINGS_FILE, "utf-8");
    const bookings = data.trim() ? JSON.parse(data) : [];
    if (!Array.isArray(bookings)) throw new Error("Bookings data must be an array.");
    return bookings;
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

const postgresAccounts = installPostgresAccounts(app, USERS_FILE);

app.get("/api/users/:id/bookings", async (req, res) => {
  const accountId = Number(req.params.id);
  if (!Number.isSafeInteger(accountId) || accountId <= 0) {
    return res.status(400).json({ success: false, error: "Invalid user ID." });
  }

  try {
    const stored = postgresBooking ? await postgresBooking.history(accountId) : [];
    const bookings = [...stored, ...readBookings().filter((booking) => booking.accountId === accountId)]
      .sort((a, b) => Date.parse(b.bookedAt) - Date.parse(a.bookedAt));
    res.json({ success: true, bookings });
  } catch (err) {
    console.error("Could not read bookings:", err);
    res.status(500).json({ success: false, error: "Could not load your bookings." });
  }
});

// =====================================================================
//  SEAT MAP + TEMPORARY HOLDS  (in-memory for now, resets on restart)
// =====================================================================
const HOLD_MS = 60 * 1000; // hold lasts 60s (short so evaluators can watch it expire)
const ROWS = ["A", "B", "C", "D", "E", "F"];
const COLS = 10;

const seatStore = {}; // { eventId: { A1: {status, heldBy, holdExpiresAt, bookedBy}, ... } }
const sseClients = new Set(); // { res, eventId }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freshSeat() {
  return { status: "available", heldBy: null, holdExpiresAt: null, bookedBy: null };
}

function getSeats(eventId) {
  if (!seatStore[eventId]) {
    seatStore[eventId] = {};
    for (const r of ROWS) {
      for (let c = 1; c <= COLS; c++) seatStore[eventId][`${r}${c}`] = freshSeat();
    }
  }
  return seatStore[eventId];
}

// ---------- real-time push (Server-Sent Events) ----------
function broadcast(eventId, type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of sseClients) {
    if (c.eventId === eventId) c.res.write(msg);
  }
}

function logEvent(eventId, message, level = "info") {
  console.log(`[${level}] ${message}`);
  broadcast(eventId, "log", { time: new Date().toISOString(), message, level });
}

function pushSeat(eventId, seatId) {
  broadcast(eventId, "seat", { seatId, seat: getSeats(eventId)[seatId] });
}

app.get("/api/events/:eventId/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.write("retry: 2000\n\n");

  const client = { res, eventId: req.params.eventId };
  sseClients.add(client);
  req.on("close", () => sseClients.delete(client));
});

// ---------- the two versions of "hold a seat" ----------

// SAFE: check + write happen in the same synchronous block (no await in between),
// so Node cannot switch to another request halfway through. This is the "critical section".
function holdSafe(eventId, seatId, userId) {
  const seat = getSeats(eventId)[seatId];
  if (!seat) return { ok: false, code: 404, error: "Seat not found." };

  if (seat.status !== "available") {
    logEvent(eventId, `${userId} tried ${seatId} but it is already ${seat.status}`, "warn");
    return { ok: false, code: 409, error: `Seat ${seatId} was just taken.` };
  }

  seat.status = "held";
  seat.heldBy = userId;
  seat.holdExpiresAt = Date.now() + HOLD_MS;
  pushSeat(eventId, seatId);
  logEvent(eventId, `${userId} HELD ${seatId}`, "ok");
  return { ok: true, seat };
}

// UNSAFE: check, then await (simulates a slow DB read/write), then write.
// Many requests can pass the check before any of them writes -> double booking.
async function holdNaive(eventId, seatId, userId) {
  const seat = getSeats(eventId)[seatId];
  if (!seat) return { ok: false, code: 404, error: "Seat not found." };

  if (seat.status === "available") {
    await sleep(50); // <-- the gap where the race condition lives

    if (seat.heldBy && seat.heldBy !== userId) {
      logEvent(eventId, `DOUBLE BOOKING on ${seatId}: ${userId} overwrote ${seat.heldBy}`, "danger");
    }
    seat.status = "held";
    seat.heldBy = userId;
    seat.holdExpiresAt = Date.now() + HOLD_MS;
    pushSeat(eventId, seatId);
    return { ok: true, seat };
  }
  return { ok: false, code: 409, error: `Seat ${seatId} was just taken.` };
}

// ---------- routes ----------
const postgresBooking = process.env.DATABASE_URL
  ? installPostgresBooking(app, { broadcast, rows: ROWS, cols: COLS, holdMs: HOLD_MS })
  : null;

app.get("/api/events/:eventId/seats", (req, res) => {
  res.json({
    success: true,
    serverNow: Date.now(),
    holdMs: HOLD_MS,
    rows: ROWS,
    cols: COLS,
    seats: getSeats(req.params.eventId),
  });
});

app.post("/api/events/:eventId/seats/:seatId/hold", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: "userId required." });
  const r = holdSafe(req.params.eventId, req.params.seatId, userId);
  if (!r.ok) return res.status(r.code).json({ success: false, error: r.error });
  res.json({ success: true, seat: r.seat });
});

app.post("/api/events/:eventId/seats/:seatId/release", (req, res) => {
  const { eventId, seatId } = req.params;
  const { userId } = req.body;
  const seat = getSeats(eventId)[seatId];

  if (!seat) return res.status(404).json({ success: false, error: "Seat not found." });
  if (seat.status !== "held" || seat.heldBy !== userId) {
    return res.status(403).json({ success: false, error: "You don't hold this seat." });
  }

  Object.assign(seat, freshSeat());
  pushSeat(eventId, seatId);
  logEvent(eventId, `${userId} RELEASED ${seatId}`, "info");
  res.json({ success: true });
});

// Mock payment: turns this user's still-valid holds into bookings.
app.post("/api/events/:eventId/book", async (req, res) => {
  const { eventId } = req.params;
  const { userId, testOutcome } = req.body;
  const accountId = Number(req.body.accountId);
  if (!Number.isSafeInteger(accountId) || accountId <= 0) {
    return res.status(400).json({ success: false, error: "A valid account ID is required." });
  }

  let catalog;
  try {
    catalog = await import("./frontend/events.js");
  } catch (error) {
    return res.status(500).json({ success: false, error: "Event catalog unavailable." });
  }
  const price = catalog.seatPrice(eventId);
  if (price === null) return res.status(404).json({ success: false, error: "Event not found." });
  if (testOutcome !== "approved" && testOutcome !== "declined") {
    return res.status(400).json({ success: false, error: "Choose a sandbox payment result." });
  }
  const seats = getSeats(eventId);
  const now = Date.now();

  const mine = Object.keys(seats).filter(
    (id) => seats[id].status === "held" && seats[id].heldBy === userId && seats[id].holdExpiresAt > now
  );

  if (mine.length === 0) {
    logEvent(eventId, `${userId} tried to pay but has no valid hold (expired?)`, "warn");
    return res.status(409).json({ success: false, error: "Your hold expired. Please pick seats again." });
  }

  if (testOutcome === "declined") {
    return res.status(402).json({ success: false, error: "Test payment declined. Your holds are still active until they expire." });
  }

  const booking = {
    id: `${accountId}-${now}`,
    accountId,
    eventId,
    eventTitle: catalog.events.find((event) => catalog.eventSlug(event) === eventId)?.title || "Demo seat map",
    seats: mine,
    bookedAt: new Date(now).toISOString(),
    status: "Confirmed",
    payment: { mode: "sandbox", status: "approved", currency: "INR", amount: price * mine.length },
  };
  try {
    const bookings = readBookings();
    bookings.push(booking);
    writeBookings(bookings);
  } catch (err) {
    console.error("Could not save booking:", err);
    return res.status(500).json({ success: false, error: "Could not save your booking. Please try again." });
  }

  for (const id of mine) {
    seats[id].status = "booked";
    seats[id].bookedBy = userId;
    seats[id].heldBy = null;
    seats[id].holdExpiresAt = null;
    pushSeat(eventId, id);
  }
  logEvent(eventId, `${userId} BOOKED ${mine.join(", ")}`, "ok");
  res.json({ success: true, seats: mine, booking });
});

// Demo: N simulated users hit ONE seat at the same instant.
app.post("/api/events/:eventId/race", async (req, res) => {
  const { eventId } = req.params;
  const mode = req.body.mode === "unsafe" ? "unsafe" : "safe";
  const total = 20;
  const seats = getSeats(eventId);

  const free = Object.keys(seats).filter((id) => seats[id].status === "available");
  if (free.length === 0) {
    return res.status(409).json({ success: false, error: "No free seats left. Click Reset first." });
  }
  const seatId = free[Math.floor(Math.random() * free.length)];

  logEvent(eventId, `RACE START (${mode.toUpperCase()}): ${total} users -> ${seatId}`, "info");

  const attempts = Array.from({ length: total }, (_, i) =>
    mode === "unsafe"
      ? holdNaive(eventId, seatId, `bot-${i + 1}`)
      : Promise.resolve().then(() => holdSafe(eventId, seatId, `bot-${i + 1}`))
  );
  const results = await Promise.all(attempts);

  const winners = results.filter((r) => r.ok).length;
  logEvent(
    eventId,
    `RACE END (${mode.toUpperCase()}): ${winners} winner(s), ${total - winners} rejected`,
    winners === 1 ? "ok" : "danger"
  );
  res.json({ success: true, mode, seatId, total, winners, rejected: total - winners });
});

app.post("/api/events/:eventId/reset", (req, res) => {
  const { eventId } = req.params;
  try {
    const bookings = readBookings().filter((booking) => booking.eventId !== eventId);
    writeBookings(bookings);
  } catch (err) {
    console.error("Could not reset event bookings:", err);
    return res.status(500).json({ success: false, error: "Could not reset event bookings." });
  }

  delete seatStore[eventId];
  getSeats(eventId);
  broadcast(eventId, "reset", {});
  logEvent(eventId, "Event reset by admin", "info");
  res.json({ success: true });
});

// ---------- background sweeper: releases expired holds every second ----------
setInterval(() => {
  const now = Date.now();
  for (const eventId of Object.keys(seatStore)) {
    for (const [seatId, seat] of Object.entries(seatStore[eventId])) {
      if (seat.status === "held" && seat.holdExpiresAt <= now) {
        const prev = seat.heldBy;
        Object.assign(seat, freshSeat());
        pushSeat(eventId, seatId);
        logEvent(eventId, `Hold on ${seatId} by ${prev} EXPIRED, seat released`, "warn");
      }
    }
  }
}, 1000);

async function start() {
  if (postgresAccounts) await postgresAccounts.start();
  if (postgresBooking) await postgresBooking.start();
  app.listen(PORT, () => {
    console.log(`SeatLock backend running at http://localhost:${PORT} (${postgresBooking ? "PostgreSQL" : "local demo"} storage)`);
  });
}

start().catch((error) => {
  console.error("SeatLock startup failed:", error.code || error.name);
  process.exit(1);
});
