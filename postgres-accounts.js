const { createHash, randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");

const deriveKey = promisify(scrypt);
const normalizeEmail = (email) => email.trim().toLowerCase();
const profile = (row) => ({ id: Number(row.id), fullName: row.full_name, email: row.email });
const sessionCookie = "seatlock_session";
const lifetime = 60 * 60 * 24 * 7;
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
const requestToken = (req) => req.headers.cookie?.match(/(?:^|;\s*)seatlock_session=([a-f0-9]{64})(?:;|$)/)?.[1];

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function matchesPassword(password, hash) {
  const [algorithm, salt, digest] = hash.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(digest)) return false;
  return timingSafeEqual(await deriveKey(password, salt, 64), Buffer.from(digest, "hex"));
}

function installPostgresAccounts(app, usersFile, { hosted = false } = {}) {
  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
    : null;
  pool?.on("error", (error) => console.error("Idle account database connection failed:", error.code || error.name));
  const fail = (res, status, error) => res.status(status).json({ success: false, error });
  const route = (handler) => async (req, res, next) => {
    if (!pool) return fail(res, 503, "Set DATABASE_URL to enable SeatLock accounts.");
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error("Account operation failed:", error.code || error.name);
      fail(res, 500, "Account storage is unavailable.");
    }
  };
  const validPassword = (value) => typeof value === "string" && value.length > 0 && value.length <= 1024;
  const cookieOptions = { httpOnly: true, secure: hosted, sameSite: "lax", path: "/" };

  const authenticate = route(async (req, res, next) => {
    const token = requestToken(req);
    if (!token) return fail(res, 401, "Sign in to continue.");
    const { rows: [account] } = await pool.query(
      `SELECT accounts.id, accounts.full_name, accounts.email FROM seatlock_sessions sessions
       JOIN seatlock_accounts accounts ON accounts.id = sessions.account_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
      [tokenHash(token)]
    );
    if (!account) return fail(res, 401, "Sign in to continue.");
    req.account = profile(account);
    next();
  });

  app.get("/api/session", authenticate, (req, res) => {
    res.set("Cache-Control", "no-store").json({ user: req.account });
  });
  app.post("/api/logout", route(async (req, res) => {
    const token = requestToken(req);
    if (token) await pool.query("DELETE FROM seatlock_sessions WHERE token_hash = $1", [tokenHash(token)]);
    res.clearCookie(sessionCookie, cookieOptions).json({ success: true });
  }));

  app.post("/api/signup", route(async (req, res) => {
    const { fullName, email, password } = req.body || {};
    if (typeof fullName !== "string" || !fullName.trim() || typeof email !== "string" || !email.trim() || !validPassword(password)) {
      return fail(res, 400, "Name, email and password are required.");
    }
    const result = await pool.query(
      `INSERT INTO seatlock_accounts (full_name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING RETURNING id, full_name, email`,
      [fullName.trim(), normalizeEmail(email), await hashPassword(password)]
    );
    if (!result.rowCount) return fail(res, 400, "Email already registered.");
    res.json({ success: true, message: "Account created successfully.", user: profile(result.rows[0]) });
  }));

  app.post("/api/login", route(async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || !email.trim() || !validPassword(password)) {
      return fail(res, 400, "Email and password are required.");
    }
    const { rows: [account] } = await pool.query(
      "SELECT id, full_name, email, password_hash FROM seatlock_accounts WHERE email = $1",
      [normalizeEmail(email)]
    );
    if (!account || !(await matchesPassword(password, account.password_hash))) {
      return fail(res, 401, "Invalid email or password.");
    }
    const token = randomBytes(32).toString("hex");
    await pool.query("DELETE FROM seatlock_sessions WHERE expires_at <= now() OR token_hash = $1", [tokenHash(requestToken(req) || token)]);
    await pool.query("INSERT INTO seatlock_sessions VALUES ($1, $2, now() + $3::integer * interval '1 second')",
      [tokenHash(token), account.id, lifetime]);
    res.cookie(sessionCookie, token, { ...cookieOptions, maxAge: lifetime * 1000 });
    res.json({ success: true, message: "Login successful.", user: profile(account) });
  }));

  if (!pool) return null;
  return {
    authenticate,
    async start() {
      const migration = await readFile(path.join(__dirname, "db", "002-accounts.sql"), "utf8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(10222002)");
        await client.query(migration);
        const claim = await client.query(
          "INSERT INTO seatlock_account_imports VALUES ('users.json') ON CONFLICT DO NOTHING"
        );
        if (claim.rowCount && !hosted) {
          const contents = await readFile(usersFile, "utf8").catch((error) => {
            if (error.code === "ENOENT") return "";
            throw error;
          });
          const users = contents.trim() ? JSON.parse(contents) : [];
          if (!Array.isArray(users)) throw new Error("Invalid legacy account file.");
          for (const user of users) {
            if (!Number.isSafeInteger(user.id) || user.id <= 0 || !validPassword(user.password)) {
              throw new Error("Invalid legacy account.");
            }
            await client.query(
              "INSERT INTO seatlock_accounts (id, full_name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, COALESCE($5, now()))",
              [user.id, user.fullName, normalizeEmail(user.email), await hashPassword(user.password), user.createdAt ?? null]
            );
          }
          if (users.length) await client.query(
            "SELECT setval(pg_get_serial_sequence('seatlock_accounts', 'id'), (SELECT max(id) FROM seatlock_accounts))"
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { installPostgresAccounts };
