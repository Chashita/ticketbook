import React, { useEffect, useState } from "react";
import { page } from "./navigation";

const maximumTraffic = 1000;
const steps = [
  "All requests arrive for seat A1 at the same time.",
  "Unsafe: every request reads “available” before any request writes. Safe: PostgreSQL checks and updates the seat atomically.",
  "The unsafe flow can confirm the same seat multiple times. The safe flow confirms one request and rejects the rest.",
];

export function RaceLab() {
  const [traffic, setTraffic] = useState("100");
  const [run, setRun] = useState(null);
  const [step, setStep] = useState(0);
  const total = Number(traffic);
  const valid = Number.isInteger(total) && total >= 1 && total <= maximumTraffic;
  const running = run !== null && step < 2;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setStep((previous) => previous + 1), 700);
    return () => clearTimeout(timer);
  }, [run, running, step]);

  function start(event) {
    event.preventDefault();
    if (!valid || running) return;
    setStep(0);
    setRun({ total });
  }

  return (
    <main className="seat-page race-lab">
      <header className="seat-topbar"><a href={page()}>← Back to events</a><span className="section-label">INTERACTIVE DEMO</span></header>
      <h1>Seat booking <em>Race Lab.</em></h1>
      <p>What happens when everyone tries to book seat A1? Compare two booking strategies under the same burst of traffic.</p>
      <form className="card race-controls" onSubmit={start}>
        <label htmlFor="race-traffic">Simultaneous requests for seat A1 (1–{maximumTraffic.toLocaleString("en-IN")})</label>
        <input id="race-traffic" type="number" min="1" max={maximumTraffic} step="1" required value={traffic} disabled={running} onChange={(event) => setTraffic(event.target.value)} />
        <div className="race-presets" aria-label="Traffic presets">
          {[2, 20, 100, 500, 1000].map((count) => <button className="btn ghost" type="button" key={count} disabled={running} aria-pressed={total === count} onClick={() => setTraffic(String(count))}>{count}</button>)}
        </div>
        <button type="submit" className="btn primary" disabled={!valid || running}>{running ? "Simulating…" : "Run comparison"}</button>
      </form>
      <p role="status" className="race-progress">{run ? steps[step] : "Choose a request count to start."}</p>
      {run && !running && (
        <div className="race-lab-results" key={run.total}>
          <section className="card">
            <h2>Unsafe · check then write</h2>
            <p className="race-metric">{run.total.toLocaleString("en-IN")} confirmed</p>
            <p>{(run.total - 1).toLocaleString("en-IN")} duplicate confirmations · 0 rejected</p>
            <p className="hint">Each request acted on the same stale snapshot of A1.</p>
          </section>
          <section className="card">
            <h2>Safe · atomic seat claim</h2>
            <p className="race-metric">1 confirmed</p>
            <p>{(run.total - 1).toLocaleString("en-IN")} rejected · 0 duplicate confirmations</p>
            <p className="hint">Once the first request claims A1, the conditional update rejects the rest.</p>
          </section>
        </div>
      )}
      <p className="hint">Browser-only simulation of a worst-case overlap, not a load test. It sends no booking requests and changes no inventory.</p>
    </main>
  );
}
