// Profile display logic for logged in user
const navActions = document.getElementById("nav-account-actions");

function renderProfile() {
  if (!navActions) return;
  
  try {
    const userData = localStorage.getItem("seatlockUser");
    if (!userData) {
      navActions.innerHTML = `
        <a class="nav-signup" href="./auth.html?mode=signup">Sign up</a>
        <a class="nav-button" href="./auth.html?mode=login">
          Sign in <span class="icon-arrow" aria-hidden="true">&#8594;</span>
        </a>
      `;
      return;
    }
    
    const user = JSON.parse(userData);
    const initials = user.fullName
      ? user.fullName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "U";
    
    navActions.innerHTML = `
      <div class="profile-dropdown">
        <button class="profile-trigger" id="profile-trigger" aria-haspopup="true" aria-expanded="false">
          <div class="profile-avatar">${initials}</div>
          <div class="profile-info">
            <span class="profile-name">${user.fullName || "User"}</span>
            <span class="profile-id">ID: ${user.id}</span>
          </div>
          <span class="profile-caret">▾</span>
        </button>
        <div class="profile-menu" id="profile-menu" role="menu">
          <div class="profile-menu-header">
            <div class="profile-avatar large">${initials}</div>
            <div>
              <div class="profile-menu-name">${user.fullName || "User"}</div>
              <div class="profile-menu-email">${user.email}</div>
              <div class="profile-menu-id">User ID: ${user.id}</div>
            </div>
          </div>
          <div class="profile-menu-divider"></div>
          <a href="./bookings.html" class="profile-menu-item" role="menuitem">My Bookings</a>
          <button class="profile-menu-item logout-btn" id="logout-btn" role="menuitem">Logout</button>
        </div>
      </div>
    `;
    
    const trigger = document.getElementById("profile-trigger");
    const menu = document.getElementById("profile-menu");
    const logoutBtn = document.getElementById("logout-btn");
    
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains("show");
      menu.classList.toggle("show");
      trigger.setAttribute("aria-expanded", String(!isOpen));
    });
    
    document.addEventListener("click", (e) => {
      if (!navActions.contains(e.target)) {
        menu.classList.remove("show");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("seatlockUser");
      window.location.reload();
    });
  } catch (err) {
    console.error("Error rendering profile:", err);
  }
}

document.addEventListener("DOMContentLoaded", renderProfile);
