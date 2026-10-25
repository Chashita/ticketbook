import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Music2,
  Search,
  X,
} from "lucide-react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import AuthPage from "./AuthPage.jsx";
import "./App.css";

const categories = ["All Events", "Concerts", "Festivals", "Comedy", "Theatre"];

const events = [
  {
    title: "The Sound of Tomorrow",
    category: "Concerts",
    location: "Mumbai, India",
    venue: "Mahalaxmi Racecourse",
    date: "15 Nov 2026",
    time: "7:00 PM",
    price: "₹1,499",
    image: "photo-1501386761578-eac5c94b800a",
    tag: "LIVE MUSIC",
    description:
      "An open-air night of boundary-pushing sounds, guest artists, and a Mumbai skyline after dark.",
  },
  {
    title: "Electric Nights Festival",
    category: "Festivals",
    location: "Delhi, India",
    venue: "Jawaharlal Nehru Stadium",
    date: "22 Nov 2026",
    time: "4:00 PM",
    price: "₹2,299",
    image: "photo-1459749411175-04bf5292ceea",
    tag: "FESTIVAL",
    description:
      "A full evening of live sets and electronic music, bringing a new generation of artists together.",
  },
  {
    title: "An Evening of Laughter",
    category: "Comedy",
    location: "Bengaluru, India",
    venue: "The Comedy Theatre",
    date: "29 Nov 2026",
    time: "8:00 PM",
    price: "₹799",
    image: "photo-1585699324551-f6c309eedeca",
    tag: "ON STAGE",
    description:
      "A sharp, intimate stand-up showcase featuring fresh voices and a few familiar faces.",
  },
  {
    title: "The Last Train Home",
    category: "Theatre",
    location: "Pune, India",
    venue: "The Creative Adda",
    date: "06 Dec 2026",
    time: "6:30 PM",
    price: "₹999",
    image: "photo-1507676184212-d03ab07a01bf",
    tag: "THEATRE",
    description:
      "A contemporary stage story about the people we meet, the places we leave, and finding our way back.",
  },
  {
    title: "Indie After Hours",
    category: "Concerts",
    location: "Hyderabad, India",
    venue: "Heart Cup Coffee, Jubilee Hills",
    date: "12 Dec 2026",
    time: "6:00 PM",
    price: "₹1,199",
    image: "photo-1506157786151-b8491531f063",
    tag: "LIVE MUSIC",
    description:
      "An evening showcase of independent artists, intimate sets, and new sounds from across the city.",
  },
  {
    title: "Midnight Frequencies",
    category: "Festivals",
    location: "Goa, India",
    venue: "Hilltop, Vagator",
    date: "19 Dec 2026",
    time: "5:00 PM",
    price: "₹2,799",
    image: "photo-1470229722913-7c0e2dbbafd3",
    tag: "OPEN AIR",
    description:
      "An open-air electronic music gathering with late-evening sets in the hills of Vagator.",
  },
  {
    title: "The Good Room",
    category: "Comedy",
    location: "Mumbai, India",
    venue: "Canvas Laugh Club",
    date: "10 Jan 2027",
    time: "7:30 PM",
    price: "₹699",
    image: "photo-1524368535928-5b5e00ddc76b",
    tag: "COMEDY",
    description:
      "A relaxed stand-up night with a rotating line-up of sharp comics and new material.",
  },
  {
    title: "A Small Room of Stories",
    category: "Theatre",
    location: "Delhi, India",
    venue: "India Habitat Centre",
    date: "17 Jan 2027",
    time: "7:00 PM",
    price: "₹1,099",
    image: "photo-1503095396549-807759245b35",
    tag: "ON STAGE",
    description:
      "A close-up theatre evening told through monologues, music, and stories gathered from the city.",
  },
];

function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All Events");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      activeCategory === "All Events" || event.category === activeCategory;
    const searchableText = [
      event.title,
      event.category,
      event.location,
      event.venue,
    ]
      .join(" ")
      .toLowerCase();

    return matchesCategory && searchableText.includes(searchQuery.trim().toLowerCase());
  });

  useEffect(() => {
    if (!selectedEvent) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setSelectedEvent(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedEvent]);

  return (
    <div className="website">
      <header className="navbar">
        <a className="logo" href="#top" aria-label="SeatLock home">
          <span className="logo-mark" aria-hidden="true">S</span>
          <span className="logo-word">Seat<span>Lock</span><i>.</i></span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#events">Discover Events</a>
          <a href="#categories">Categories</a>
          <a href="#bookings">My Bookings</a>
        </nav>

        <div className="nav-account-actions">
          <Link className="nav-signup" to="/signup">Sign up</Link>
          <Link className="nav-button" to="/login">
            Sign in <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-content">
            <div className="eyebrow">
              <span className="live-dot" /> THE CITY IS YOURS
            </div>

            <h1 id="hero-title">
              Life happens
              <br />
              <span>outside.</span>
            </h1>

            <p>
              Find the nights, sounds, and stories that stay with you long after
              the lights come up.
            </p>

            <a href="#events" className="hero-button">
              Discover events <ArrowRight size={18} aria-hidden="true" />
            </a>

            <div className="hero-note" aria-label="Curated culture, music, and experiences">
              <span className="hero-line" />
              CULTURE · MUSIC · EXPERIENCES
            </div>
          </div>

          <div className="hero-side-label" aria-hidden="true">A GOOD NIGHT, WELL FOUND</div>
        </section>

        <section className="events-section" id="events" aria-labelledby="events-title">
          <div className="section-heading">
            <div>
              <span className="section-label">A LITTLE CLOSER TO YOUR NEXT NIGHT OUT</span>
              <h2 id="events-title">Find your <em>scene.</em></h2>
            </div>
            <p>Good nights become great memories.</p>
          </div>

          <div className="event-toolbar">
            <div className="categories" id="categories" aria-label="Filter events by category">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-button ${
                    activeCategory === category ? "active" : ""
                  }`}
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <label className="search-box">
              <Search size={19} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search events, cities, venues"
                aria-label="Search events, cities, or venues"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="event-grid" aria-live="polite">
              {filteredEvents.map((event, index) => (
                <article
                  className={`event-card event-card-${index + 1}`}
                  key={event.title}
                >
                  <div className="event-image-wrap">
                    <img
                      src={`https://images.unsplash.com/${event.image}?auto=format&fit=crop&w=1000&q=85`}
                      alt={`${event.title} live event`}
                      loading={index > 1 ? "lazy" : "eager"}
                    />
                    <span className="event-tag">{event.tag}</span>
                  </div>

                  <div className="event-details">
                    <div className="event-meta">
                      <span><CalendarDays size={15} aria-hidden="true" /> {event.date}</span>
                      <span>{event.category}</span>
                    </div>
                    <h3>{event.title}</h3>
                    <div className="event-footer">
                      <span className="event-location">
                        <MapPin size={16} aria-hidden="true" /> {event.location}
                      </span>
                      <span className="event-price">From {event.price}</span>
                    </div>
                    <button
                      className="event-details-button"
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                    >
                      Book now <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <h3>No events found</h3>
              <p>Try a different search or browse all event categories.</p>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setActiveCategory("All Events");
                  setSearchQuery("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section className="experience-section" aria-labelledby="experience-title">
          <div className="experience-icon"><Music2 size={25} aria-hidden="true" /></div>
          <span className="section-label">MORE THAN JUST A TICKET</span>
          <h2 id="experience-title">Make room for <em>memories.</em></h2>
          <p>
            From the first beat to the final encore, find an experience worth
            making time for.
          </p>
          <a className="experience-link" href="#events">
            Find your next event <ArrowRight size={17} aria-hidden="true" />
          </a>
        </section>

        <section className="booking-note" id="bookings" aria-labelledby="bookings-title">
          <div>
            <span className="section-label">YOUR SEATLOCK ACCOUNT</span>
            <h2 id="bookings-title">Your plans, all in one place.</h2>
          </div>
          <p>
            Account sign-in and booking history are not connected in this
            preview. Event information and starting prices are shown for
            discovery only.
          </p>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <a className="logo" href="#top" aria-label="SeatLock home">
              <span className="logo-mark" aria-hidden="true">S</span>
              <span className="logo-word">Seat<span>Lock</span><i>.</i></span>
            </a>
            <p>Find the nights worth stepping out for.</p>
            <span className="footer-tagline">MADE FOR THE MOMENTS THAT MATTER.</span>
          </div>

          <nav className="footer-column" aria-label="Explore">
            <h2>Explore</h2>
            <a href="#events">Discover events</a>
            <a href="#categories">Browse categories</a>
          </nav>

          <nav className="footer-column" aria-label="Your account">
            <h2>Your account</h2>
            <a href="#bookings">My bookings</a>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create an account</Link>
          </nav>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SeatLock</span>
          <span>Events shown for discovery. Booking and availability are not connected.</span>
        </div>
      </footer>

      {selectedEvent && (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedEvent(null);
        }}>
          <section
            className="info-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <button
              className="dialog-close"
              type="button"
              aria-label="Close dialog"
              onClick={() => setSelectedEvent(null)}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <span className="section-label">{selectedEvent.category} · {selectedEvent.date}</span>
            <h2 id="dialog-title">{selectedEvent.title}</h2>
            <p>{selectedEvent.description}</p>
            <dl className="dialog-event-meta">
              <div><dt>Venue</dt><dd>{selectedEvent.venue}</dd></div>
              <div><dt>Location</dt><dd>{selectedEvent.location}</dd></div>
              <div><dt>Doors</dt><dd>{selectedEvent.time}</dd></div>
              <div><dt>Starting price</dt><dd>{selectedEvent.price}</dd></div>
            </dl>
            <p className="dialog-note">
              Online booking is not connected in this preview. This event
              information does not confirm availability or reserve a ticket.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />
        <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
