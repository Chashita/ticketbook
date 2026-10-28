# SeatLock

SeatLock uses plain HTML, CSS, browser JavaScript, and a small Express server. It does not need React, Vite, or a build step.

## Run locally

From this directory, run `npm start` and open `http://localhost:5000`. The server provides the authentication, seat selection, and booking-history APIs; opening the HTML files directly or using Live Server will not connect to those APIs.

## Project structure

- `index.html` contains the event discovery page.
- `auth.html` contains the sign-in and sign-up page layouts.
- `bookings.html` shows confirmed bookings for the signed-in account.
- `server.js` serves the site and its API.
- `bookings.json` stores confirmed booking history.
- `css/` contains the base, site, and authentication styles.
- `js/` contains event, authentication, seat-selection, and booking-history behavior.
- `favicon.svg` is the site icon.

Payments are mocked; no real tickets are issued. Confirmed bookings are saved in `bookings.json`.
