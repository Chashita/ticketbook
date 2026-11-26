import React, { useEffect, useState } from "react";
import { page } from "./navigation";

async function request(path, method = "GET", body) {
  const response = await fetch(path, {
    method,
    ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}

function Field({ name, label, value, type = "text", optional = false, limit = 120 }) {
  return <label>{label}{type === "textarea"
    ? <textarea name={name} defaultValue={value} required={!optional} maxLength={limit} rows={4} />
    : <input name={name} type={type} defaultValue={value} required={!optional} maxLength={limit} min={type === "number" ? 1 : undefined} max={type === "number" ? 1000000 : undefined} />}</label>;
}

function Workspace({ title, eyebrow, children }) {
  return <main className="organizer-workspace">
    <header className="seat-topbar"><a href={page()}>← Back to events</a><span className="section-label">SEATLOCK</span></header>
    <span className="section-label">{eyebrow}</span><h1>{title}</h1>
    {children}
  </main>;
}

export function ListingRequest() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const data = await request("/api/listing-requests", "POST", Object.fromEntries(new FormData(form)));
      setStatus(`Request #${data.id} received. It goes to the SeatLock team for review; your event is not published yet.`);
      form.reset();
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }

  return <Workspace title="List your event" eyebrow="FOR ORGANIZERS">
    <p>Hosting a concert, show, or workshop? Tell us what you’re planning. We’ll review the details and use your email to follow up.</p>
    <form className="card organizer-form" onSubmit={submit}>
      <Field name="organizer" label="Organizer or team name" />
      <Field name="email" label="Contact email" type="email" limit={254} />
      <Field name="title" label="Event title" />
      <Field name="city" label="City" limit={100} />
      <Field name="date" label="Proposed date (optional)" type="date" optional />
      <Field name="description" label="Tell us about your event" type="textarea" limit={2000} />
      <button className="btn primary" disabled={busy}>{busy ? "Sending…" : "Submit listing request"}</button>
      {status && <p role="status" className="msg success">{status}</p>}
      {error && <p role="alert" className="msg error">{error}</p>}
    </form>
  </Workspace>;
}

const eventFields = [
  ["title", "Event title"], ["category", "Category"], ["location", "City / location"],
  ["venue", "Venue"], ["date", "Date"], ["time", "Time"], ["tag", "Card label"],
];

export function AdminEvents({ account }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const admin = account?.isAdmin === true;
  const endpoint = "/api/admin/events";

  useEffect(() => {
    if (!admin) return;
    let current = true;
    request(endpoint).then((result) => { if (current) setData(result); })
      .catch((error) => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [admin]);

  async function change(path, method, body, message, reset = false) {
    setBusy(true);
    setStatus("");
    setError("");
    try {
      await request(path, method, body);
      setStatus(message);
      if (reset) { setEditing(null); setVersion((previous) => previous + 1); }
      setData(await request(endpoint));
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }

  function save(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    return change(editing?.id ? `${endpoint}/${encodeURIComponent(editing.id)}` : endpoint,
      editing?.id ? "PUT" : "POST", body, editing?.id ? "Event updated." : "Event published.", true);
  }

  if (!admin) return <Workspace title="Admin access required" eyebrow="EVENT ADMIN"><p>This account isn’t authorized to manage events. Your account ID: <strong>{account.id}</strong>.</p><a className="experience-link" href={page("account", { returnTo: page("admin") })}>Sign in with an admin account →</a></Workspace>;
  return <Workspace title="Event management" eyebrow="EVENT ADMIN">
    <div className="organizer-layout">
      <section className="card">
        <h2>{editing?.id ? "Edit event" : "Add an event"}</h2>
        <form key={version} className="organizer-form" onSubmit={save}>
          {eventFields.map(([name, label]) => <Field key={name} name={name} label={label} value={editing?.[name]} limit={["category", "location", "date", "time", "tag"].includes(name) ? { category: 60, location: 100, date: 40, time: 40, tag: 40 }[name] : 120} />)}
          <Field name="price" label="Price per seat (₹)" type="number" value={editing?.price?.replace(/[^0-9]/g, "")} />
          <Field name="image" label="Unsplash photo ID (optional)" value={editing?.image} optional limit={80} />
          <Field name="description" label="Event description" type="textarea" value={editing?.description} limit={2000} />
          <button className="btn primary" disabled={busy}>{editing?.id ? "Save changes" : "Publish event"}</button>
          {editing && <button type="button" className="btn ghost" disabled={busy} onClick={() => { setEditing(null); setVersion((previous) => previous + 1); }}>Clear form</button>}
          {status && <p role="status">{status}</p>}
          {error && <p role="alert" className="msg error">{error}</p>}
        </form>
      </section>
      <div>
        <section className="card"><h2>Catalog</h2>
          {!data && !error && <p role="status">Loading events…</p>}
          {data?.events.map((event) => <div className="organizer-record" key={event.id}>
            <strong>{event.title}</strong><span>{event.active ? "Published" : "Unlisted"} · {event.date}</span>
            <div className="btn-row">
              <button className="btn ghost" disabled={busy} onClick={() => { setEditing(event); setVersion((previous) => previous + 1); }}>Edit</button>
              <button className="btn ghost" disabled={busy} onClick={() => change(`${endpoint}/${encodeURIComponent(event.id)}`, "PATCH", { active: !event.active }, event.active ? "Event unlisted; previous bookings are preserved." : "Event relisted.")}>{event.active ? "Unlist" : "Relist"}</button>
            </div>
          </div>)}
        </section>
        <section className="card"><h2>Organizer requests</h2>
          {data?.requests.length === 0 && <p>No requests yet.</p>}
          {data?.requests.map(({ id, details }) => <div className="organizer-record" key={id}>
            <strong>#{id} · {details.title}</strong>
            <span>{details.organizer} · {details.city} {details.date && `· ${details.date}`}</span>
            <p>{details.description}</p>
            <a className="experience-link" href={`mailto:${encodeURIComponent(details.email)}`}>{details.email}</a>
            <button className="btn ghost" disabled={busy} onClick={() => { setEditing({ title: details.title, location: details.city, date: details.date, description: details.description }); setVersion((previous) => previous + 1); }}>Use as draft</button>
          </div>)}
        </section>
      </div>
    </div>
  </Workspace>;
}
