const { randomUUID } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");

const catalog = import("./frontend/events.js");
const text = (value, limit) => typeof value === "string" && value.trim().length <= limit ? value.trim() : "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function installEvents(app, authenticate, isAdmin) {
  const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }) : null;
  pool?.on("error", (error) => console.error("Idle event database connection failed:", error.code || error.name));
  const fail = (res, status, error) => res.status(status).json({ success: false, error });
  const wrap = (handler) => async (req, res) => {
    try { await handler(req, res); } catch (error) {
      console.error("Event operation failed:", error.code || error.name);
      fail(res, 500, "Could not complete the event request.");
    }
  };
  const admin = (req, res, next) => isAdmin(req.account)
    ? next() : fail(res, 403, "Admin access is required.");
  const stored = (row) => ({ ...row.listing, id: row.id, active: row.active });
  const group = "/api/admin/events";

  app.get("/api/catalog", wrap(async (req, res) => {
    const { events, eventSlug } = await catalog;
    const listings = pool
      ? (await pool.query("SELECT * FROM seatlock_events WHERE active ORDER BY id")).rows.map(stored)
      : events.map((event) => ({ ...event, id: eventSlug(event) }));
    res.json({ events: listings });
  }));

  app.post("/api/listing-requests", wrap(async (req, res) => {
    if (!pool) return fail(res, 503, "Event submissions are unavailable.");
    const body = req.body || {};
    const details = {
      organizer: text(body.organizer, 120), email: text(body.email, 254), title: text(body.title, 120),
      city: text(body.city, 100), date: text(body.date, 40), description: text(body.description, 2000),
    };
    if (!emailPattern.test(details.email) || !details.organizer || !details.title || !details.city || !details.description) {
      return fail(res, 400, "Enter your contact email, organizer name, event title, city and details.");
    }
    const result = await pool.query("INSERT INTO seatlock_listing_requests (details) VALUES ($1) RETURNING id", [details]);
    res.status(201).json({ id: result.rows[0].id });
  }));

  app.get(group, authenticate, admin, wrap(async (req, res) => {
    const [events, requests] = await Promise.all([
      pool.query("SELECT * FROM seatlock_events ORDER BY active DESC, id"),
      pool.query("SELECT * FROM seatlock_listing_requests ORDER BY submitted_at DESC, id DESC LIMIT 100"),
    ]);
    res.json({ events: events.rows.map(stored), requests: requests.rows });
  }));

  async function save(req, res) {
    const body = req.body || {};
    const price = Number(body.price);
    const listing = {
      title: text(body.title, 120), category: text(body.category, 60), location: text(body.location, 100),
      venue: text(body.venue, 120), date: text(body.date, 40), time: text(body.time, 40),
      description: text(body.description, 2000), tag: text(body.tag, 40),
    };
    const image = text(body.image, 80);
    if (!Object.values(listing).every(Boolean) || !Number.isSafeInteger(price) || price < 1 || price > 1000000 ||
        (image && !/^photo-[\w-]+$/.test(image))) {
      return fail(res, 400, "Complete all required fields and enter a price in whole rupees.");
    }
    const { formatINR } = await catalog;
    listing.price = formatINR(price);
    listing.image = image || "photo-1459749411175-04bf5292ceea";
    const result = req.params.id
      ? await pool.query("UPDATE seatlock_events SET listing = $2 WHERE id = $1 RETURNING *", [req.params.id, listing])
      : await pool.query("INSERT INTO seatlock_events (id, listing) VALUES ($1, $2) RETURNING *", [randomUUID(), listing]);
    if (!result.rowCount) return fail(res, 404, "Event not found.");
    res.json({ event: stored(result.rows[0]) });
  }
  app.post(group, authenticate, admin, wrap(save));
  app.put(group + "/:id", authenticate, admin, wrap(save));
  app.patch(group + "/:id", authenticate, admin, wrap(async (req, res) => {
    if (typeof req.body?.active !== "boolean") return fail(res, 400, "Choose whether to publish the event.");
    const result = await pool.query("UPDATE seatlock_events SET active = $2 WHERE id = $1 RETURNING *", [req.params.id, req.body.active]);
    if (!result.rowCount) return fail(res, 404, "Event not found.");
    res.json({ event: stored(result.rows[0]) });
  }));

  return {
    async start() {
      if (!pool) return;
      const migration = await readFile(path.join(__dirname, "db", "004-events.sql"), "utf8");
      const { events, eventSlug } = await catalog;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(10222004)");
        await client.query(migration);
        for (const event of events) await client.query(
          "INSERT INTO seatlock_events (id, listing) VALUES ($1, $2) ON CONFLICT DO NOTHING", [eventSlug(event), event]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally { client.release(); }
    },
    async get(eventId) {
      const result = await pool.query("SELECT listing FROM seatlock_events WHERE id = $1 AND active", [eventId]);
      return result.rows[0]?.listing;
    },
  };
}

module.exports = { installEvents };
