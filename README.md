# SeatLock

SeatLock is a React frontend built with Vite and an Express backend. React renders event discovery, account forms, the live seat map, mock checkout, and booking history.

## Run locally

1. Install dependencies with `npm ci`.
2. Build the frontend with `npm run build:react`.
3. Start Express with `npm start` and open `http://localhost:5000`.

For frontend development, keep Express running and run `npm run dev:react` in another terminal. Open the Vite URL ending in `/react/`. Vite proxies the API to Express.

## PostgreSQL (local)

Requires Node.js 24 and a PostgreSQL database owned by the `seatlock_app` login.
Copy `.env.example` to `.env` and replace the password placeholder locally (percent-encode reserved URL characters in the password). Restart with `npm start`; startup applies `db/001-booking.sql`.

For catalog events, new holds and confirmed test orders use PostgreSQL. The built-in race demo stays isolated in memory and uses the legacy JSON file for its bookings. Existing JSON history remains readable but is not imported into PostgreSQL inventory. Accounts still use local JSON and demo authentication; do not expose this server publicly. Without `DATABASE_URL` the app uses the original local demo storage.

## Files

- `frontend/` contains the React screens and event catalog.
- `css/` contains the shared and screen-specific styles.
- `server.js` serves the React build and APIs, including the live seat stream.
- `users.json` and `bookings.json` are local demo storage and are not served as static files.
- The original HTML and browser scripts remain in the repository for reference. Requests to the old page URLs now load the equivalent React screens.

## Review the migration

Try search and category filters, sign up with a test account, and confirm that sign-in returns you to the seat map. Open the same event in two tabs to check live updates, release and expiry, then confirm a mock booking and check My Bookings. The concurrency demo is available from the demo seat map.

This is a local demo: passwords are stored in plain text, API authorization needs hardening, and seat inventory resets on server restart even though booking history persists. Use test credentials only; no real payments or tickets are issued.
