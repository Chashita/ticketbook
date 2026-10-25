import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import "./AuthPage.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </div>
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    remember: false,
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode]);

  function updateField(field) {
    return (event) => {
      const nextValue =
        event.target.type === "checkbox" ? event.target.checked : event.target.value;
      setValues((current) => ({ ...current, [field]: nextValue }));
      setErrors((current) => ({ ...current, [field]: "" }));
      setNotice("");
    };
  }

  function validate() {
    const nextErrors = {};

    if (isSignup && !values.fullName.trim()) {
      nextErrors.fullName = "Enter your full name.";
    }
    if (!values.email.trim()) {
      nextErrors.email = "Enter your email address.";
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!values.password) {
      nextErrors.password = "Enter your password.";
    } else if (isSignup && values.password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    }
    if (isSignup && !values.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (isSignup && values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (isSignup && !values.terms) {
      nextErrors.terms = "Accept the terms to continue.";
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setValues((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
      setNotice(
        "Your details are valid. Authentication is not connected, so no account or session was created.",
      );
    } else {
      setNotice("");
    }
  }

  function showResetNotice(event) {
    event.preventDefault();
    setNotice("Password reset is not connected in this preview.");
  }

  return (
    <main className={`auth-page ${isSignup ? "auth-signup" : "auth-login"}`}>
      <header className="auth-topbar">
        <Link className="auth-brand" to="/" aria-label="SeatLock home">
          <span className="auth-brand-mark" aria-hidden="true">S</span>
          <span>Seat<span>Lock</span><i>.</i></span>
        </Link>
        <Link className="back-home" to="/">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to home
        </Link>
      </header>

      <div className="auth-layout">
        <aside className="auth-editorial" aria-label="SeatLock event experiences">
          <div className="auth-editorial-content">
            <span className="auth-kicker">A PASS TO THE UNEXPECTED</span>
            <p className="auth-editorial-title">
              The best stories
              <br />
              happen <em>out there.</em>
            </p>
            <p className="auth-editorial-caption">
              Find your people. Find your night. Make it one to remember.
            </p>
          </div>
          <span className="auth-editorial-index">SEATLOCK&nbsp;&nbsp; / &nbsp;&nbsp;EST. FOR THE MOMENT</span>
        </aside>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-form-wrap">
            <span className="section-label">
              {isSignup ? "YOUR NEXT CHAPTER" : "GOOD TO HAVE YOU BACK"}
            </span>
            <h1 id="auth-title">
              {isSignup ? <>Join the <em>guest list.</em></> : <>Welcome <em>back.</em></>}
            </h1>
            <p className="auth-intro">
              {isSignup
                ? "Create an account to keep your event plans together."
                : "Sign in to pick up where your next night out begins."}
            </p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {isSignup && (
                <div className={`auth-field${errors.fullName ? " has-error" : ""}`}>
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={values.fullName}
                    onChange={updateField("fullName")}
                    placeholder="Your name"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    required
                  />
                  {errors.fullName && (
                    <p className="field-error" id="fullName-error">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div className={`auth-field${errors.email ? " has-error" : ""}`}>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={updateField("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  required
                />
                {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
              </div>

              <PasswordField
                id="password"
                label="Password"
                value={values.password}
                onChange={updateField("password")}
                placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                error={errors.password}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />

              {isSignup ? (
                <PasswordField
                  id="confirmPassword"
                  label="Confirm password"
                  value={values.confirmPassword}
                  onChange={updateField("confirmPassword")}
                  placeholder="Re-enter your password"
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
              ) : (
                <div className="auth-options">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={values.remember}
                      onChange={updateField("remember")}
                    />
                    <span>Remember me</span>
                  </label>
                  <a className="auth-inline-link" href="#forgot-password" onClick={showResetNotice}>
                    Forgot password?
                  </a>
                </div>
              )}

              {isSignup && (
                <div className="terms-area">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={values.terms}
                      onChange={updateField("terms")}
                      aria-invalid={Boolean(errors.terms)}
                      aria-describedby={errors.terms ? "terms-error" : undefined}
                    />
                    <span>
                      I agree to the Terms and Conditions
                    </span>
                  </label>
                  {errors.terms && <p className="field-error" id="terms-error">{errors.terms}</p>}
                </div>
              )}

              <button className="auth-submit" type="submit">
                {isSignup ? "Create account" : "Sign in"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>

              <p className="auth-notice" role="status" aria-live="polite">{notice}</p>
            </form>

            <p className="auth-switch">
              {isSignup ? "Already have an account?" : "New to SeatLock?"}{" "}
              <Link to={isSignup ? "/login" : "/signup"}>
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
            <p className="auth-disclaimer">
              Frontend preview only. No credentials are sent or saved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
