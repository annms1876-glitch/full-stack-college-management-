(() => {
  "use strict";

  const screens = ["feed", "login", "faculty", "profile", "study", "clubs"];
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  const darkMode = currentPath.startsWith("/dark/");
  const themePrefix = darkMode ? "/dark" : "";
  const knownRoutes = new Set([
    "/", ...screens.map((screen) => `/${screen}`),
    ...screens.map((screen) => `/dark/${screen}`),
  ]);

  const routeFor = (screen) => `${themePrefix}/${screen}`;

  if (currentPath === "/" && localStorage.getItem("campuspulse-theme") === "dark") {
    window.location.replace("/dark/feed");
    return;
  }
  if (darkMode) localStorage.setItem("campuspulse-theme", "dark");
  else if (currentPath !== "/") localStorage.setItem("campuspulse-theme", "light");

  function showToast(message) {
    let toast = document.getElementById("campuspulse-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "campuspulse-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      Object.assign(toast.style, {
        position: "fixed", left: "50%", bottom: "88px", zIndex: "10000",
        transform: "translateX(-50%)", maxWidth: "min(90vw, 420px)",
        padding: "11px 16px", borderRadius: "999px", background: darkMode ? "#34343a" : "#1a1b21",
        color: "#fff", font: "500 13px/1.35 'Instrument Sans', sans-serif",
        boxShadow: "0 8px 28px rgba(0,0,0,.18)", opacity: "0", transition: "opacity 120ms ease-out",
        pointerEvents: "none", textAlign: "center",
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = "1";
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.style.opacity = "0"; }, 2300);
  }

  function navTarget(anchor) {
    const icon = anchor.querySelector(".material-symbols-outlined, .material-symbols-rounded, .material-icons");
    const iconName = (icon?.textContent || "").trim().toLowerCase();
    const label = (anchor.textContent || "").trim().toLowerCase();
    const oldHref = (anchor.getAttribute("href") || "").toLowerCase();
    if (iconName === "home" || oldHref.includes("home-feed") || oldHref === "#home") return "feed";
    if (iconName === "groups" || oldHref === "#clubs" || label.includes("clubs")) return "clubs";
    if (iconName === "school" || oldHref === "#study" || label.includes("study")) return "study";
    if (iconName === "search" || oldHref.includes("search/") || oldHref === "#search" || label === "search") return "faculty";
    if (label.includes("profile") || oldHref.includes("student-profile") || oldHref === "#profile") return "profile";
    return null;
  }

  document.querySelectorAll("a").forEach((anchor) => {
    const target = navTarget(anchor);
    if (!target) return;
    anchor.setAttribute("href", routeFor(target));
    anchor.addEventListener("click", (event) => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        window.location.assign(routeFor(target));
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      const screen = screens.find((item) => currentPath.endsWith(`/${item}`)) || "feed";
      const nextTheme = darkMode ? "light" : "dark";
      localStorage.setItem("campuspulse-theme", nextTheme);
      window.location.assign(`${nextTheme === "dark" ? "/dark" : ""}/${screen}` || "/");
    }
  });

  document.querySelectorAll(".like-btn").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const liked = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!liked));
      button.classList.toggle("text-story-rose", !liked);
      const icon = button.querySelector(".material-symbols-outlined");
      if (icon) icon.style.fontVariationSettings = !liked ? "'FILL' 1" : "'FILL' 0";
      const count = [...button.querySelectorAll("span")].find((item) => /^\s*[\d,.]+\s*$/.test(item.textContent));
      if (count) {
        const value = Number(count.textContent.replace(/[^\d]/g, "")) + (liked ? -1 : 1);
        count.textContent = String(Math.max(0, value));
      }
    });
  });

  document.querySelectorAll(".save-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const icon = button.querySelector(".material-symbols-outlined");
      if (!icon) return;
      const saved = icon.textContent.trim() === "bookmark";
      icon.textContent = saved ? "bookmark_border" : "bookmark";
      button.setAttribute("aria-pressed", String(!saved));
      showToast(saved ? "Removed from saved items" : "Saved for later");
    });
  });

  document.querySelectorAll(".feed-filter-chip").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.textContent.trim().toLowerCase() === "all"));
    button.addEventListener("click", () => {
      const selected = button.textContent.trim();
      const chips = [...document.querySelectorAll(".feed-filter-chip")];
      chips.forEach((chip) => {
        const active = chip === button;
        chip.setAttribute("aria-pressed", String(active));
        chip.classList.toggle(`bg-${darkMode ? "dark" : "light"}-primary`, active);
        chip.classList.toggle(`text-${darkMode ? "dark" : "light"}-on-primary`, active);
        chip.classList.toggle(`bg-${darkMode ? "dark" : "light"}-surface-container-lowest`, !active);
        chip.classList.toggle(`text-${darkMode ? "dark" : "light"}-on-surface-variant`, !active);
        chip.classList.toggle("border", !active);
      });
      const aliases = {
        "official notices": /official|office of academic affairs|exam cell/i,
        academics: /academic|exam|semester|attendance|lab internals|study/i,
        events: /hackvit|event|auditorium|cultural|club/i,
        placements: /placement|internship|atlassian|razorpay|stipend/i,
        "student community": /student|ananya|rohan|library|community/i,
      };
      const filter = aliases[selected.toLowerCase()];
      document.querySelectorAll(".feed-post").forEach((post) => {
        post.hidden = Boolean(filter && !filter.test(post.textContent || ""));
      });
    });
  });

  document.querySelectorAll(".share-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const article = button.closest(".feed-post");
      const title = article?.querySelector("h2, h3")?.textContent?.trim() || "CampusPulse post";
      try {
        if (navigator.share) await navigator.share({ title, url: window.location.href });
        else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href);
        showToast("Post link ready to share");
      } catch (error) {
        if (error?.name !== "AbortError") showToast("Share this campus post with a friend");
      }
    });
  });

  document.querySelectorAll("button").forEach((button) => {
    const label = (button.getAttribute("aria-label") || button.textContent || "").trim().toLowerCase();
    if (/register|join club|join event/.test(label)) {
      button.addEventListener("click", () => {
        const registered = button.dataset.registered === "true";
        button.dataset.registered = String(!registered);
        button.setAttribute("aria-pressed", String(!registered));
        if (button.dataset.registered === "true") {
          button.textContent = "Registered";
          showToast("You’re on the list. See you there!");
        } else {
          button.textContent = "Register";
          showToast("Registration cancelled");
        }
      });
    }
  });

  window.CampusPulse = Object.freeze({
    theme: darkMode ? "dark" : "light",
    routes: Object.freeze(Object.fromEntries(screens.map((screen) => [screen, routeFor(screen)]))),
    toggleTheme() {
      const screen = screens.find((item) => currentPath.endsWith(`/${item}`)) || "feed";
      const nextTheme = darkMode ? "light" : "dark";
      localStorage.setItem("campuspulse-theme", nextTheme);
      window.location.assign(`${nextTheme === "dark" ? "/dark" : ""}/${screen}` || "/");
    },
  });
})();
