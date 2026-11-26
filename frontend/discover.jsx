import React, { useRef, useState } from "react";
import { events, eventSlug } from "./events";
import { page } from "./navigation";

const categories = ["All Events", ...new Set(events.map((event) => event.category))];
const cities = new Set(events.map((event) => event.location));
const featured = events.find((event) => event.tag === "FESTIVAL") || events[0];

function seatsFor(event) {
  return page("seats", {
    event: eventSlug(event),
    title: event.title,
  });
}

export function Discover({ account, logout, demo = false }) {
  const [category, setCategory] = useState("All Events");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const filtered = events.filter((event) =>
    (category === "All Events" || event.category === category) &&
    [event.title, event.location, event.venue, event.category].join(" ").toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="website discover-edition">
      <header className="navbar" id="top">
        <a className="logo" href={page()}><span className="logo-mark">S</span><span className="logo-word">Seat<span>Lock</span><i>.</i></span></a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#events">Discover Events</a>
          <a href="#categories">Categories</a>
          <a href={page("bookings")}>My Bookings</a>
          <a href={page("race")}>Race Lab</a>
          {demo && <a href={page("seats")}>Seat Map</a>}
        </nav>
        <div className="nav-account-actions">
          {demo ? <span className="section-label">PUBLIC DEMO</span> : account ? <><span>{account.fullName}</span><button className="nav-button" onClick={logout}>Sign out</button></> : (
            <><a className="nav-signup" href={page("account", { mode: "signup" })}>Sign up</a><a className="nav-button" href={page("account")}>Sign in →</a></>
          )}
        </div>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-content">
            <div className="eyebrow">THE SEATLOCK EVENT GUIDE</div>
            <h1 id="hero-title">Out for<br /><span>the night.</span></h1>
            <p>Gigs, comedy and theatre across {cities.size} cities. Find a show, pick your seats, and make a night of it.</p>
            <div className="hero-cta-group">
              <a className="hero-button" href="#events">Discover events →</a>
              <a className="hero-button-secondary" href="#categories">Browse categories →</a>
            </div>
            <div className="hero-stats">
              {[[events.length, "Listed events"], [cities.size, "Cities"], [categories.length - 1, "Categories"]].map(([count, label]) => (
                <div key={label} className="stat-item"><span className="stat-number">{count}</span><span className="stat-label">{label}</span></div>
              ))}
            </div>
          </div>
          <a className="featured-ticket" href={seatsFor(featured)}>
            <span className="featured-label">On the bill / {featured.category}</span>
            <strong>{featured.title}</strong>
            <span>{featured.date} · {featured.location.split(",")[0]}</span>
            <span className="featured-arrow" aria-hidden="true">↗</span>
          </a>
        </section>
        <section className="events-section" id="events" aria-labelledby="events-title">
          <div className="section-heading"><div><span className="section-label">THE LISTINGS</span><h2 id="events-title">What’s <em>on.</em></h2></div></div>
          <div className="event-toolbar">
            <div className="categories" id="categories">
              {categories.map((item) => <button key={item} className={`category-button${item === category ? " active" : ""}`} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label className="search-box"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search events, cities, or venues" placeholder="Search events, cities, venues" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          </div>
          <p className="event-results" role="status">Showing {filtered.length} of {events.length} events</p>
          <div className="event-grid">
            {filtered.map((event) => (
              <article className="event-card" key={event.title}>
                <div className="event-image-wrap">
                  <img src={`https://images.unsplash.com/${event.image}?auto=format&fit=crop&w=1000&q=85`} alt="" loading="lazy" />
                  <span className="event-tag">{event.tag}</span>
                </div>
                <div className="event-details">
                  <div className="event-meta"><span>{event.date}</span><span>{event.category}</span></div>
                  <h3>{event.title}</h3>
                  <p className="edition-venue">{event.venue}</p>
                  <div className="event-footer"><span className="event-location">{event.location}</span><span className="event-price">From {event.price}</span></div>
                  <div className="event-actions">
                    <button className="event-action-button" onClick={() => { setSelected(event); dialog.current.showModal(); }}>View details</button>
                    <a className="event-action-button book-now-button" href={seatsFor(event)}>Book now →</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && <div className="empty-state"><h3>No events found</h3><button className="text-button" onClick={() => { setQuery(""); setCategory("All Events"); }}>Clear filters</button></div>}
        </section>
      </main>
      <footer className="edition-footer" aria-labelledby="footer-title">
        <div className="edition-footer-heading">
          <div>
            <span className="section-label">SEATLOCK / AFTER HOURS</span>
            <h2 id="footer-title">Find your next night out.</h2>
          </div>
          <a className="edition-footer-top" href="#top">Back to top <span aria-hidden="true">↑</span></a>
        </div>
        <div className="edition-footer-grid">
          <section aria-labelledby="footer-explore">
            <h3 id="footer-explore">Explore the listings</h3>
            <div className="edition-footer-categories">
              {categories.slice(1).map((item) => (
                <a key={item} href="#events-title" onClick={() => { setQuery(""); setCategory(item); }}>
                  {item} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </section>
          <section aria-labelledby="footer-help">
            <h3 id="footer-help">Booking help</h3>
            <details><summary>How does seat selection work?</summary><p>{demo ? "Select seats to try checkout. Demo selections are not shared with other visitors." : "Select a seat to hold it for 60 seconds. Select it again to release it, or confirm before the timer expires."}</p></details>
            <details><summary>Where are my bookings?</summary><p>{demo ? "Open " : "Sign in and open "}<a href={page("bookings")}>My Bookings</a> to see your confirmed seats{demo ? " on this browser" : ""}.</p></details>
          </section>
        </div>
        <p className="edition-footer-note">SeatLock demo · No real payments or tickets. <a href={page("race")}>Try the booking Race Lab ↗</a></p>
      </footer>
      <dialog ref={dialog} className="react-event-dialog" aria-labelledby="detail-title">
        {selected && <><form method="dialog"><button className="text-button" aria-label="Close event details">Close ×</button></form><h2 id="detail-title">{selected.title}</h2><p>{selected.date} · {selected.time}</p><p>{selected.venue} · {selected.location}</p><p>{selected.description}</p><a className="hero-button" href={seatsFor(selected)}>Pick seats · from {selected.price} →</a></>}
      </dialog>
    </div>
  );
}
