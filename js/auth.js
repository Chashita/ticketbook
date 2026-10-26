// The same form supports both modes; the query string selects which fields appear.
const params = new URLSearchParams(window.location.search);
const isSignup = params.get("mode") === "signup";
const authPage = document.querySelector("#auth-page");
const authForm = document.querySelector("#auth-form");

if (authPage && authForm) {
  const title = document.querySelector("#auth-title");
  const intro = document.querySelector("#auth-intro");
  const kicker = document.querySelector("#auth-kicker");
  const submitButton = document.querySelector("#auth-submit");
  const switchText = document.querySelector("#auth-switch");
  const notice = document.querySelector("#auth-notice");
  const options = document.querySelector("#login-options");

  // Hide account-creation fields on sign-in and update all mode-specific copy.
  document.querySelectorAll("[data-signup-only]").forEach((element) => {
    element.hidden = !isSignup;
  });
  authPage.classList.toggle("auth-signup", isSignup);
  authPage.classList.toggle("auth-login", !isSignup);
  options.hidden = isSignup;

  if (isSignup) {
    kicker.textContent = "YOUR NEXT CHAPTER";
    title.innerHTML = "Join the <em>guest list.</em>";
    intro.textContent = "Create an account to keep your event plans together.";
    document.querySelector("#password").placeholder = "At least 8 characters";
    document.querySelector("#password").autocomplete = "new-password";
    submitButton.innerHTML = 'Create account <span aria-hidden="true">&#8594;</span>';
    switchText.innerHTML = 'Already have an account? <a href="./auth.html?mode=login">Sign in</a>';
    document.title = "SeatLock — Create an Account";
  } else {
    title.innerHTML = "Welcome <em>back.</em>";
    submitButton.innerHTML = 'Sign in <span aria-hidden="true">&#8594;</span>';
    switchText.innerHTML = 'New to SeatLock? <a href="./auth.html?mode=signup">Create an account</a>';
    document.title = "SeatLock — Sign In";
  }

  function showError(fieldName, message) {
    const field = authForm.elements.namedItem(fieldName);
    const errorMessage = document.querySelector(`[data-error-for="${fieldName}"]`);
    if (!field || !errorMessage) return;

    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", errorMessage.id || `error-${fieldName}`);
    errorMessage.id = `error-${fieldName}`;
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    field.closest(".auth-field, .terms-area")?.classList.add("has-error");
  }

  function clearError(fieldName) {
    const field = authForm.elements.namedItem(fieldName);
    const errorMessage = document.querySelector(`[data-error-for="${fieldName}"]`);
    field?.removeAttribute("aria-invalid");
    field?.removeAttribute("aria-describedby");
    if (errorMessage) {
      errorMessage.textContent = "";
      errorMessage.hidden = true;
    }
    field?.closest(".auth-field, .terms-area")?.classList.remove("has-error");
  }

  authForm.addEventListener("input", (event) => {
    const name = event.target.name;
    if (name) clearError(name);
    notice.textContent = "";
  });
  authForm.addEventListener("change", (event) => {
    if (event.target.name) clearError(event.target.name);
  });

  // Toggle password visibility without changing the field's value.
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = document.getElementById(button.dataset.passwordToggle);
      const visible = field.type === "password";
      field.type = visible ? "text" : "password";
      button.setAttribute("aria-pressed", String(visible));
      button.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${field.labels[0].textContent.toLowerCase()}`);
      button.textContent = visible ? "◉" : "◎";
    });
  });

  document.querySelector("#forgot-password").addEventListener("click", (event) => {
    event.preventDefault();
    notice.textContent = "Password reset is not connected in this preview.";
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    notice.textContent = "";
    const values = new FormData(authForm);
    const name = String(values.get("fullName") || "").trim();
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    const confirmPassword = String(values.get("confirmPassword") || "");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasErrors = false;

    // Validate each field and keep errors adjacent to the field they describe.
    if (isSignup && !name) {
      showError("fullName", "Enter your full name.");
      hasErrors = true;
    }
    if (!email) {
      showError("email", "Enter your email address.");
      hasErrors = true;
    } else if (!emailPattern.test(email)) {
      showError("email", "Enter a valid email address.");
      hasErrors = true;
    }
    if (!password) {
      showError("password", "Enter your password.");
      hasErrors = true;
    } else if (isSignup && password.length < 8) {
      showError("password", "Use at least 8 characters.");
      hasErrors = true;
    }
    if (isSignup && !confirmPassword) {
      showError("confirmPassword", "Confirm your password.");
      hasErrors = true;
    } else if (isSignup && password !== confirmPassword) {
      showError("confirmPassword", "Passwords do not match.");
      hasErrors = true;
    }
    if (isSignup && !values.get("terms")) {
      showError("terms", "Accept the terms to continue.");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    submitButton.disabled = true;
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = isSignup ? "Creating account..." : "Signing in...";

    try {
      const endpoint = isSignup ? "http://localhost:5000/api/signup" : "http://localhost:5000/api/login";
      const body = isSignup
        ? { fullName: name, email, password }
        : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        notice.textContent = data.error || "Something went wrong.";
        return;
      }

      notice.textContent = data.message || (isSignup ? "Account created successfully." : "Login successful.");
      authForm.elements.password.value = "";
      if (isSignup) authForm.elements.confirmPassword.value = "";

      if (!isSignup && data.user) {
        localStorage.setItem("seatlockUser", JSON.stringify(data.user));
      }
      
      // Optionally redirect after success
      setTimeout(() => {
        if (isSignup) {
          window.location.href = "./auth.html?mode=login";
        } else {
          window.location.href = "./index.html";
        }
      }, 1000);
    } catch (error) {
      notice.textContent = "Cannot connect to backend. Make sure server is running on http://localhost:5000";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  });
}