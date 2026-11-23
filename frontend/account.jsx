import React, { useState } from "react";
import { page } from "./navigation";

export function Account({ params }) {
  const signup = params.get("mode") === "signup";
  const returnTo = params.get("returnTo") || page();
  const modeUrl = (mode) => page("account", { mode, returnTo });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch(signup ? "/api/signup" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      if (signup) {
        location.assign(modeUrl("login"));
        return;
      }
      localStorage.setItem("seatlockUser", JSON.stringify(data.user));
      const destination = new URL(returnTo, location.origin);
      location.assign(destination.origin === location.origin ? destination.href : page());
    } catch (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-topbar"><a className="auth-brand" href={page()}>SeatLock.</a><a className="back-home" href={page()}>← Back to events</a></header>
      <section className="react-auth-panel">
        <span className="section-label">{signup ? "YOUR NEXT NIGHT STARTS HERE" : "GOOD TO HAVE YOU BACK"}</span>
        <h1>{signup ? "Create an account." : "Welcome back."}</h1>
        <form className="react-auth-form" onSubmit={submit}>
          {signup && <label>Full name<input name="fullName" autoComplete="name" required /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type={visible ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required /></label>
          <label className="react-auth-toggle"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Show password</label>
          <button className="hero-button" disabled={pending}>{pending ? "Please wait…" : signup ? "Create account →" : "Sign in →"}</button>
          {error && <p role="alert">{error}</p>}
        </form>
        <a className="experience-link" href={modeUrl(signup ? "login" : "signup")}>{signup ? "Already have an account? Sign in" : "New to SeatLock? Create an account"}</a>
      </section>
    </main>
  );
}
