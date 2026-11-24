const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");

function installPostgresBooking(app, { broadcast, rows, cols, holdMs }) {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  pool.on("error", (error) => console.error("Idle PostgreSQL connection failed:", error.code || error.name));
  const catalog = import("./frontend/events.js");
  const seatIds = rows.flatMap((row) => Array.from({ length: cols }, (_, index) => row + (index + 1)));
  const snapshot = (row) => ({
    status: row?.order_id ? "booked" : row?.held_by ? "held" : "available",
    heldBy: row?.held_by ?? null,
    holdExpiresAt: row?.expires_at?.getTime() ?? null,
    bookedBy: null,
  });
  const notify = (eventId, row) => broadcast(eventId, "seat", { seatId: row.seat_id, seat: snapshot(row) });
  const fail = (res, status, error) => res.status(status).json({ success: false, error });
  const wrap = (handler) => async (req, res, next) => {
    if (req.params.eventId === "demo") return next();
    try {
      await handler(req, res);
    } catch (error) {
      console.error("PostgreSQL booking operation failed:", error.code || error.name);
      fail(res, 500, "Booking storage is unavailable.");
    }
  };
  const eventRoute = (handler) => wrap(async (req, res) => {
    const { eventId } = req.params;
    const { seatPrice } = await catalog;
    if (seatPrice(eventId) === null) return fail(res, 404, "Event not found.");
    if (req.params.seatId && !seatIds.includes(req.params.seatId)) return fail(res, 404, "Seat not found.");
    return handler(req, res);
  });
  const validHolder = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;
  const route = "/api/events/:eventId";

  app.get(route + "/seats", eventRoute(async (req, res) => {
    const result = await pool.query(
      "SELECT * FROM seatlock_seats WHERE event_id = $1 AND (order_id IS NOT NULL OR expires_at > clock_timestamp())",
      [req.params.eventId]
    );
    const seats = Object.fromEntries(seatIds.map((seatId) => [seatId, snapshot()]));
    for (const row of result.rows) seats[row.seat_id] = snapshot(row);
    res.json({ success: true, serverNow: Date.now(), holdMs, rows, cols, seats });
  }));

  app.post(route + "/seats/:seatId/hold", eventRoute(async (req, res) => {
    const { eventId, seatId } = req.params;
    const { userId } = req.body;
    if (!validHolder(userId)) return fail(res, 400, "A valid hold ID is required.");
    const result = await pool.query(
      `INSERT INTO seatlock_seats (event_id, seat_id, held_by, expires_at)
       VALUES ($1, $2, $3, clock_timestamp() + $4::integer * interval '1 millisecond')
       ON CONFLICT (event_id, seat_id) DO UPDATE
       SET held_by = EXCLUDED.held_by, expires_at = clock_timestamp() + $4::integer * interval '1 millisecond'
       WHERE seatlock_seats.order_id IS NULL
         AND (seatlock_seats.expires_at IS NULL OR seatlock_seats.expires_at <= clock_timestamp())
       RETURNING *`, [eventId, seatId, userId, holdMs]
    );
    if (!result.rowCount) return fail(res, 409, "That seat is already held or booked.");
    notify(eventId, result.rows[0]);
    res.json({ success: true, seat: snapshot(result.rows[0]) });
  }));

  app.post(route + "/seats/:seatId/release", eventRoute(async (req, res) => {
    const { eventId, seatId } = req.params;
    if (!validHolder(req.body.userId)) return fail(res, 400, "A valid hold ID is required.");
    const result = await pool.query(
      "UPDATE seatlock_seats SET held_by = NULL, expires_at = NULL WHERE event_id = $1 AND seat_id = $2 AND held_by = $3 RETURNING *",
      [eventId, seatId, req.body.userId]
    );
    if (!result.rowCount) return fail(res, 403, "You don't hold this seat.");
    notify(eventId, result.rows[0]);
    res.json({ success: true });
  }));

  app.post(route + "/book", eventRoute(async (req, res) => {
    const { eventId } = req.params;
    const { userId, testOutcome } = req.body;
    const accountId = Number(req.body.accountId);
    if (!validHolder(userId) || !Number.isSafeInteger(accountId) || accountId <= 0) {
      return fail(res, 400, "Valid account and hold IDs are required.");
    }
    if (!["approved", "declined"].includes(testOutcome)) return fail(res, 400, "Choose a sandbox payment result.");
    if (testOutcome === "declined") return fail(res, 402, "Test payment declined. Your holds remain active until they expire.");
    const { events, eventSlug, seatPrice } = await catalog;
    const id = randomUUID();
    const bookedAt = new Date().toISOString();
    const client = await pool.connect();
    let booking;
    let updated;
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO seatlock_orders (id, account_id, event_id, receipt, booked_at) VALUES ($1, $2, $3, '{}'::jsonb, $4)",
        [id, accountId, eventId, bookedAt]
      );
      updated = await client.query(
        `UPDATE seatlock_seats SET held_by = NULL, expires_at = NULL, order_id = $3
         WHERE event_id = $1 AND held_by = $2 AND expires_at > clock_timestamp() AND order_id IS NULL RETURNING *`,
        [eventId, userId, id]
      );
      if (!updated.rowCount) {
        await client.query("ROLLBACK");
        return fail(res, 409, "No active holds. Please select seats again.");
      }
      const seats = updated.rows.map((row) => row.seat_id).sort();
      booking = {
        id, accountId, eventId, bookedAt, seats, status: "Confirmed",
        eventTitle: events.find((event) => eventSlug(event) === eventId).title,
        payment: { mode: "sandbox", status: "approved", currency: "INR", amount: seatPrice(eventId) * seats.length },
      };
      await client.query("UPDATE seatlock_orders SET receipt = $2 WHERE id = $1", [id, booking]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    for (const row of updated.rows) notify(eventId, row);
    res.json({ success: true, seats: booking.seats, booking });
  }));

  for (const action of ["race", "reset"]) {
    app.post(route + "/" + action, wrap((req, res) => fail(res, 403, "This action is available only in the demo.")));
  }

  let sweeping = false;
  return {
    async start() {
      await pool.query(readFileSync(path.join(__dirname, "db", "001-booking.sql"), "utf8"));
      setInterval(async () => {
        if (sweeping) return;
        sweeping = true;
        try {
          const result = await pool.query(
            "UPDATE seatlock_seats SET held_by = NULL, expires_at = NULL WHERE expires_at <= clock_timestamp() RETURNING *"
          );
          for (const row of result.rows) notify(row.event_id, row);
        } catch (error) {
          console.error("PostgreSQL hold expiry failed:", error.code || error.name);
        } finally {
          sweeping = false;
        }
      }, 1000).unref();
    },
    async history(accountId) {
      const result = await pool.query(
        "SELECT receipt FROM seatlock_orders WHERE account_id = $1 ORDER BY booked_at DESC",
        [accountId]
      );
      return result.rows.map((row) => row.receipt);
    },
  };
}

module.exports = { installPostgresBooking };
