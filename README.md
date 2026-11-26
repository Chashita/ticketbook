# SeatLock

SeatLock is a React frontend built with Vite and an Express backend. React renders event discovery, account forms, the live seat map, mock checkout, and booking history.

## Run locally

1. Install dependencies with `npm ci`.
2. Build the frontend with `npm run build:react`.
3. Start Express with `npm start` and open `http://localhost:5000`.

For frontend development, keep Express running and run `npm run dev:react` in another terminal. Open the Vite URL ending in `/react/`. Vite proxies the API to Express.

## PostgreSQL (local)

Requires Node.js 24 and a PostgreSQL database owned by the `seatlock_app` login.
Copy `.env.example` to `.env` and replace the password placeholder locally (percent-encode reserved URL characters in the password). Restart with `npm start`; startup applies the SQL migrations in `db/`.

PostgreSQL stores logins, catalog seat holds, and confirmed test orders. On first startup against a database, existing accounts in `users.json` are imported with the same IDs and salted password hashes. The file is not changed or used for login afterward. After verifying the import, remove or securely archive that plaintext file. Sign-up and login require `DATABASE_URL`.

The local race demo still uses in-memory seats and JSON bookings. Existing JSON history remains readable but is not imported into PostgreSQL inventory. The main app uses an HTTP-only session cookie; PostgreSQL stores only the session token hash. Catalog booking actions and booking history require a signed-in account.

## Deploy the school demo on Render

Authorize the `Shadow-rage/SeatLock` repository in Render. Select **New → Blueprint**, choose the repo's `main` branch, and apply `render.yaml`. It provisions a free web service and private PostgreSQL database. Use the web service's HTTPS URL for both login and booking. The static GitHub Pages demo is separate.

Hosted mode uses fresh accounts, disables the local race/reset endpoint, and does not import local users. Leave the PayPal environment variables unset for mock checkout.

To demonstrate contention, create two different accounts on two devices, open the same catalog event at the same Render URL, and click the same available seat. Only one account should hold it. Confirm the winner's mock order and check that the other device sees the seat as booked.

## PayPal Sandbox (optional)

In your private `.env`, add `PAYPAL_SANDBOX_CLIENT_ID` and `PAYPAL_SANDBOX_SECRET` from the Default Application in **Sandbox** (not Live). Set `PAYPAL_SANDBOX_RETURN_ORIGIN` to the exact origin you open SeatLock on, normally `http://localhost:5000`. Keep the existing `DATABASE_URL`, rebuild the React app, and restart Express.

Sign in to SeatLock, pick a catalog event, hold a seat, and select **PayPal Sandbox**. Use a **sandbox personal buyer account** to approve payment. Return in the same browser tab and click **Confirm PayPal test order**. Checkout uses a clearly separate USD 5-per-seat demo price, and no real money moves. The original INR mock checkout is still available offline.

This is not production payments: the app does not reconcile captures after crashes or seat expiry and does not use webhooks or production-grade session authorization. The PayPal API host is hardcoded to Sandbox.

## Files

- `frontend/` contains the React screens and event catalog.
- `css/` contains the shared and screen-specific styles.
- `server.js` serves the React build and APIs, including the live seat stream.
- `users.json` and `bookings.json` are local demo storage and are not served as static files.
- The original HTML and browser scripts remain in the repository for reference. Requests to the old page URLs now load the equivalent React screens.

## Review the migration

Try search and category filters, sign up with a test account, and confirm that sign-in returns you to the seat map. Open the same event in two tabs to check live updates, release and expiry, then confirm a mock booking and check My Bookings. The concurrency demo is available from the demo seat map.

This is a local demo: passwords are stored in plain text, API authorization needs hardening, and seat inventory resets on server restart even though booking history persists. Use test credentials only; no real payments or tickets are issued.
