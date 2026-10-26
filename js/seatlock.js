// Event data used by the cards and the event details dialog.
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
    description: "An open-air night of boundary-pushing sounds, guest artists, and a Mumbai skyline after dark.",
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
    description: "A full evening of live sets and electronic music, bringing a new generation of artists together.",
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
    description: "A sharp, intimate stand-up showcase featuring fresh voices and a few familiar faces.",
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
    description: "A contemporary stage story about the people we meet, the places we leave, and finding our way back.",
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
    description: "An evening showcase of independent artists, intimate sets, and new sounds from across the city.",
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
    description: "An open-air electronic music gathering with late-evening sets in the hills of Vagator.",
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
    description: "A relaxed stand-up night with a rotating line-up of sharp comics and new material.",
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
    description: "A close-up theatre evening told through monologues, music, and stories gathered from the city.",
  },
];

const grid = document.querySelector("#event-grid");

if (grid) {
  const searchInput = document.querySelector("#event-search");
  const categoryButtons = [...document.querySelectorAll("[data-category]")];
  const emptyState = document.querySelector("#empty-state");
  const detailsDialog = document.querySelector("#event-dialog");
  const bookingDialog = document.querySelector("#booking-dialog");
  let activeCategory = "All Events";
  let lastDetailsTrigger = null;
  let lastBookingTrigger = null;
  let activeBookingEvent = null;
  let ticketQuantity = 1;

  // Render cards from the event list, keeping their content in one data source.
  function renderEvents() {
    const query = searchInput.value.trim().toLowerCase();
    const filteredEvents = events.filter((event) => {
      const searchableText = `${event.title} ${event.category} ${event.location} ${event.venue}`.toLowerCase();
      const categoryMatches = activeCategory === "All Events" || event.category === activeCategory;
      return categoryMatches && searchableText.includes(query);
    });

    grid.innerHTML = filteredEvents.map((event, index) => `
      <article class="event-card event-card-${index + 1}">
        <div class="event-image-wrap">
          <img src="https://images.unsplash.com/${event.image}?auto=format&fit=crop&w=1000&q=85" alt="${event.title} live event" loading="${index > 1 ? "lazy" : "eager"}" />
          <span class="event-tag">${event.tag}</span>
        </div>
        <div class="event-details">
          <div class="event-meta">
            <span><span aria-hidden="true">&#9635;</span> ${event.date}</span>
            <span>${event.category}</span>
          </div>
          <h3>${event.title}</h3>
          <div class="event-footer">
            <span class="event-location"><span aria-hidden="true">&#9679;</span> ${event.location}</span>
            <span class="event-price">From ${event.price}</span>
          </div>
          <div class="event-actions">
            <button class="event-action-button details-button" type="button" data-event-action="details" data-event-title="${event.title}">
              View details
            </button>
            <button class="event-action-button book-now-button" type="button" data-event-action="book" data-event-title="${event.title}">
              Book now <span aria-hidden="true">&#8594;</span>
            </button>
          </div>
        </div>
      </article>
    `).join("");

    emptyState.hidden = filteredEvents.length > 0;
  }

  function showEventDetails(event, trigger) {
    lastDetailsTrigger = trigger;
    document.querySelector("#dialog-category").textContent = `${event.category} · ${event.date}`;
    document.querySelector("#dialog-title").textContent = event.title;
    document.querySelector("#dialog-description").textContent = event.description;
    document.querySelector("#dialog-venue").textContent = event.venue;
    document.querySelector("#dialog-location").textContent = event.location;
    document.querySelector("#dialog-time").textContent = event.time;
    document.querySelector("#dialog-price").textContent = event.price;
    detailsDialog.hidden = false;
    detailsDialog.classList.add("is-open");
    document.querySelector("#dialog-close").focus();
  }

  function closeDialog(dialog, trigger) {
    dialog.hidden = true;
    dialog.classList.remove("is-open");
    trigger?.focus();
  }

  function formatRupees(amount) {
    return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
  }

  function updateBookingSummary() {
    const unitPrice = Number(activeBookingEvent.price.replace(/[^\d]/g, ""));
    document.querySelector("#ticket-quantity").textContent = String(ticketQuantity);
    document.querySelector("#booking-subtotal").textContent = formatRupees(unitPrice * ticketQuantity);
  }

  function showBooking(event, trigger) {
    activeBookingEvent = event;
    lastBookingTrigger = trigger;
    ticketQuantity = 1;
    document.querySelector("#booking-category").textContent = `${event.category} · ${event.date}`;
    document.querySelector("#booking-title").textContent = event.title;
    document.querySelector("#ticket-unit-price").textContent = `${event.price} per ticket`;
    document.querySelector("#booking-feedback").textContent = "";
    const continueButton = document.querySelector("#booking-continue");
    continueButton.disabled = false;
    continueButton.innerHTML = 'Continue to checkout <span aria-hidden="true">&#8594;</span>';
    updateBookingSummary();
    bookingDialog.hidden = false;
    bookingDialog.classList.add("is-open");
    document.querySelector("#booking-close").focus();
  }

  function closeDetailsDialog() {
    closeDialog(detailsDialog, lastDetailsTrigger);
  }

  function closeBookingDialog() {
    closeDialog(bookingDialog, lastBookingTrigger);
  }

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      categoryButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      renderEvents();
    });
  });

  searchInput.addEventListener("input", renderEvents);
  document.querySelector("#clear-filters").addEventListener("click", () => {
    activeCategory = "All Events";
    searchInput.value = "";
    categoryButtons.forEach((button) => {
      const selected = button.dataset.category === activeCategory;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderEvents();
    searchInput.focus();
  });

  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-event-action]");
    if (!trigger) return;
    const selectedEvent = events.find((item) => item.title === trigger.dataset.eventTitle);
    if (!selectedEvent) return;
    if (trigger.dataset.eventAction === "details") {
      showEventDetails(selectedEvent, trigger);
    } else {
      showBooking(selectedEvent, trigger);
    }
  });

  document.querySelector("#dialog-close").addEventListener("click", closeDetailsDialog);
  detailsDialog.addEventListener("click", (event) => {
    if (event.target === detailsDialog) closeDetailsDialog();
  });
  document.querySelector("#booking-close").addEventListener("click", closeBookingDialog);
  bookingDialog.addEventListener("click", (event) => {
    if (event.target === bookingDialog) closeBookingDialog();
  });
  document.querySelector("#ticket-decrease").addEventListener("click", () => {
    ticketQuantity = Math.max(1, ticketQuantity - 1);
    updateBookingSummary();
  });
  document.querySelector("#ticket-increase").addEventListener("click", () => {
    ticketQuantity = Math.min(8, ticketQuantity + 1);
    updateBookingSummary();
  });
  document.querySelector("#booking-continue").addEventListener("click", (event) => {
    const subtotal = document.querySelector("#booking-subtotal").textContent;
    const ticketLabel = ticketQuantity === 1 ? "ticket" : "tickets";
    document.querySelector("#booking-feedback").textContent = `Selection ready: ${ticketQuantity} ${ticketLabel} for ${activeBookingEvent.title}, ${subtotal}. Checkout and reservation are not connected, so no tickets have been booked.`;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Checkout unavailable";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!detailsDialog.hidden) closeDetailsDialog();
    if (!bookingDialog.hidden) closeBookingDialog();
  });

  renderEvents();
}