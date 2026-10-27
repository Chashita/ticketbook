const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post("/api/signup", (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, error: "All fields are required." });
  }

  const users = readUsers();
  const exists = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (exists) {
    return res.status(400).json({ success: false, error: "Email already registered." });
  }

  const newUser = {
    id: Date.now(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password: password,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  return res.json({
    success: true,
    message: "Account created successfully.",
    user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email },
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }

  const users = readUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid email or password." });
  }

  return res.json({
    success: true,
    message: "Login successful.",
    user: { id: user.id, fullName: user.fullName, email: user.email },
  });
});

// PUT - Update entire user
app.put("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const { fullName, email, password } = req.body;

  let users = readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  // Check if email already taken by another user
  if (email) {
    const emailExists = users.find(
      (u) => u.id !== userId && u.email.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({ success: false, error: "Email already taken." });
    }
  }

  users[userIndex] = {
    ...users[userIndex],
    fullName: fullName ? fullName.trim() : users[userIndex].fullName,
    email: email ? email.trim().toLowerCase() : users[userIndex].email,
    password: password || users[userIndex].password,
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);
  const { password: _, ...safeUser } = users[userIndex];
  res.json({ success: true, message: "User updated successfully.", user: safeUser });
});

// PATCH - Update user partially
app.patch("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const updates = req.body;

  let users = readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  // Check if email already taken by another user
  if (updates.email) {
    const emailExists = users.find(
      (u) => u.id !== userId && u.email.toLowerCase() === updates.email.toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({ success: false, error: "Email already taken." });
    }
  }

  if (updates.fullName) updates.fullName = updates.fullName.trim();
  if (updates.email) updates.email = updates.email.trim().toLowerCase();

  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);
  const { password: _, ...safeUser } = users[userIndex];
  res.json({ success: true, message: "User updated successfully.", user: safeUser });
});

app.get("/api/users", (req, res) => {
  const users = readUsers();
  const safe = users.map(({ password, ...rest }) => rest);
  res.json({ success: true, users: safe });
});

app.get("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  const { password, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
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
app.post("/api/events/:eventId/book", (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body;
  const seats = getSeats(eventId);
  const now = Date.now();

  const mine = Object.keys(seats).filter(
    (id) => seats[id].status === "held" && seats[id].heldBy === userId && seats[id].holdExpiresAt > now
  );

  if (mine.length === 0) {
    logEvent(eventId, `${userId} tried to pay but has no valid hold (expired?)`, "warn");
    return res.status(409).json({ success: false, error: "Your hold expired. Please pick seats again." });
  }

  for (const id of mine) {
    seats[id].status = "booked";
    seats[id].bookedBy = userId;
    seats[id].heldBy = null;
    seats[id].holdExpiresAt = null;
    pushSeat(eventId, id);
  }
  logEvent(eventId, `${userId} BOOKED ${mine.join(", ")}`, "ok");
  res.json({ success: true, seats: mine });
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

app.listen(PORT, () => {
  console.log(`SeatLock backend running at http://localhost:${PORT}`);
});
