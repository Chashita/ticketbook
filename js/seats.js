(() => {
  const params = new URLSearchParams(location.search);

  function getSignedInUser() {
    try {
      const user = JSON.parse(localStorage.getItem("seatlockUser"));
      return user && user.id ? user : null;
    } catch {
      return null;
    }
  }

  function hasSignedInUser() {
    return Boolean(getSignedInUser());
  }

  function requireSignedIn() {
    if (hasSignedInUser()) return true;
    const signInUrl = new URL("./auth.html", window.location.href);
    signInUrl.searchParams.set("mode", "login");
    signInUrl.searchParams.set("returnTo", `${location.pathname}${location.search}`);
    window.location.replace(signInUrl.href);
    return false;
  }

  if (!requireSignedIn()) return;

  const eventId = params.get("event") || "demo";

  // Each browser tab = one "user". (Later you can replace this with the logged-in user.)

  let userId = sessionStorage.getItem("seatlockUser");
  if (!userId) {
    let name = "guest";
    try {
      const saved = JSON.parse(localStorage.getItem("seatlockUser"));
      if (saved && saved.fullName) name = saved.fullName.split(" ")[0].toLowerCase();
    } catch (e) {}
    userId = name + "-" + Math.random().toString(36).slice(2, 6);
    sessionStorage.setItem("seatlockUser", userId);
  }
  document.getElementById("who").textContent = userId;

  const title = params.get("title");
  if (title) document.querySelector(".hint").textContent =
    `${title} — click a seat to hold it for 60 seconds. Open a second tab to see another user.`;

  const $ = (id) => document.getElementById(id);
  const api = `/api/events/${encodeURIComponent(eventId)}`;

  let seats = {};
  let rows = [], cols = 0;
  let clockOffset = 0; // serverTime - clientTime, so countdowns are accurate

  async function post(path, body = {}) {
    if (!requireSignedIn()) {
      return { ok: false, status: 401, data: { error: "Sign in to continue." } };
    }
    const res = await fetch(api + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // ---------- rendering ----------
  function seatClass(s) {
    if (s.status === "booked") return "booked";
    if (s.status === "held") return s.heldBy === userId ? "mine" : "held";
    return "available";
  }

  function buildGrid() {
    const grid = $("seat-grid");
    grid.innerHTML = "";
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "seat-row";
      row.innerHTML = `<span class="row-label">${r}</span>`;
      for (let c = 1; c <= cols; c++) {
        const id = `${r}${c}`;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "seat available";
        b.dataset.seat = id;
        b.textContent = c;
        b.addEventListener("click", () => onSeatClick(id));
        row.appendChild(b);
      }
      grid.appendChild(row);
    });
  }

  function paintSeat(id, flash = false) {
    const b = document.querySelector(`[data-seat="${id}"]`);
    if (!b || !seats[id]) return;
    const cls = seatClass(seats[id]);
    b.className = `seat ${cls}` + (flash ? " flash" : "");
    b.disabled = cls === "held" || cls === "booked";
    b.title = `${id} — ${seats[id].status}` + (seats[id].heldBy ? ` by ${seats[id].heldBy}` : "");
  }

  function paintAll() {
    Object.keys(seats).forEach((id) => paintSeat(id));
    paintMyHolds();
  }

  function myHolds() {
    return Object.keys(seats).filter((id) => seats[id].status === "held" && seats[id].heldBy === userId);
  }

  function paintMyHolds() {
    const mine = myHolds();
    $("my-holds").innerHTML = mine.map((id) => `<li>${id}</li>`).join("");
    $("confirm-btn").disabled = mine.length === 0;
    if (mine.length === 0) $("timer").textContent = "";
  }

  // countdown, updates 4x per second
  setInterval(() => {
    const mine = myHolds();
    if (!mine.length) return;
    const now = Date.now() + clockOffset;
    const soonest = Math.min(...mine.map((id) => seats[id].holdExpiresAt));
    const left = Math.max(0, Math.ceil((soonest - now) / 1000));
    $("timer").textContent = `Hold expires in ${left}s`;
  }, 250);

  function addLog({ time, message, level }) {
    const li = document.createElement("li");
    const t = new Date(time).toLocaleTimeString();
    li.innerHTML = `<span class="t">${t}</span><span class="${level}"></span>`;
    li.lastChild.textContent = message; // textContent = safe against HTML injection
    const log = $("log");
    log.prepend(li);
    while (log.children.length > 80) log.lastChild.remove();
  }

  // ---------- actions ----------
  async function onSeatClick(id) {
    const msg = $("booking-msg");
    msg.textContent = "";
    msg.className = "msg";
    const s = seats[id];

    if (s.status === "held" && s.heldBy === userId) {
      await post(`/seats/${id}/release`);
      return;
    }
    const r = await post(`/seats/${id}/hold`);
    if (!r.ok) {
      msg.textContent = r.data.error || "Could not hold seat.";
      msg.className = "msg error";
    }
  }

  $("confirm-btn").addEventListener("click", async () => {
    const msg = $("booking-msg");
    const user = getSignedInUser();
    if (!user) {
      requireSignedIn();
      return;
    }
    const r = await post("/book", {
      accountId: Number(user.id),
      eventTitle: params.get("title") || eventId,
    });
    if (r.ok) {
      msg.textContent = `Booked: ${r.data.seats.join(", ")} (mock payment)`;
      msg.className = "msg success";
      $("view-bookings").hidden = false;
    } else {
      msg.textContent = r.data.error || "Booking failed.";
      msg.className = "msg error";
      $("view-bookings").hidden = true;
    }
  });

  async function runRace(mode) {
    const out = $("race-result");
    out.className = "race-result";
    out.textContent = "Running 20 simultaneous requests…";
    const r = await post("/race", { mode });
    if (!r.ok) {
      out.textContent = r.data.error || "Race failed.";
      return;
    }
    const d = r.data;
    out.textContent = `Seat ${d.seatId}: ${d.total} requests → ${d.winners} winner(s), ${d.rejected} rejected` +
      (d.winners > 1 ? "  ✖ DOUBLE BOOKING!" : "  ✔ exactly one winner");
    out.classList.add(d.winners > 1 ? "bad" : "good");
  }
  $("race-unsafe").addEventListener("click", () => runRace("unsafe"));
  $("race-safe").addEventListener("click", () => runRace("safe"));
  $("reset-btn").addEventListener("click", () => post("/reset"));

  // ---------- load + live updates ----------
  async function load() {
    const res = await fetch(api + "/seats");
    const data = await res.json();
    seats = data.seats;
    rows = data.rows;
    cols = data.cols;
    clockOffset = data.serverNow - Date.now();
    buildGrid();
    paintAll();
  }

  function connectStream() {
    const es = new EventSource(api + "/stream");
    es.addEventListener("seat", (e) => {
      const { seatId, seat } = JSON.parse(e.data);
      seats[seatId] = seat;
      paintSeat(seatId, true);
      paintMyHolds();
    });
    es.addEventListener("log", (e) => addLog(JSON.parse(e.data)));
    es.addEventListener("reset", () => load());
  }

  load().then(connectStream);
})();