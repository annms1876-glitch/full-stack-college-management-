// CampusPulse clubs & events: live event cards, real RSVPs and "My Activity".
//
// The clubs screen shipped sample events whose Register button only said
// "event registration is not connected". public.events and public.event_rsvps
// already exist, so this replaces the sample cards with the college's real
// events and persists each RSVP under the student's own JWT.
import { api, configured } from "/api.js";

const dark = location.pathname.startsWith("/dark/");
const routePath = location.pathname.replace(/\/$/, "") || "/";
const isClubs = routePath.endsWith("/clubs");

const C = dark
  ? {
      card: "bg-dark-surface-container-lowest border-dark-outline-variant/60",
      text: "text-dark-on-surface",
      muted: "text-dark-on-surface-variant",
      primary: "bg-dark-primary text-dark-on-primary",
      primaryText: "text-dark-primary",
      chip: "bg-dark-secondary-container text-dark-on-secondary-container",
      border: "border-dark-outline-variant/40",
      hover: "hover:bg-dark-surface-container",
    }
  : {
      card: "bg-light-surface-container-lowest border-light-outline-variant/60",
      text: "text-light-on-surface",
      muted: "text-light-on-surface-variant",
      primary: "bg-light-primary text-light-on-primary",
      primaryText: "text-light-primary",
      chip: "bg-light-secondary-container text-light-on-secondary-container",
      border: "border-light-outline-variant/40",
      hover: "hover:bg-light-surface-container",
    };

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name, size = "text-[20px]") => `<span class="material-symbols-outlined ${size}" aria-hidden="true">${name}</span>`;

function toast(message) {
  let el = document.getElementById("campuspulse-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "campuspulse-toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    Object.assign(el.style, {
      position: "fixed", left: "50%", bottom: "88px", zIndex: 10001, transform: "translateX(-50%)",
      maxWidth: "min(90vw,420px)", padding: "11px 16px", borderRadius: "999px",
      background: "#345f47", color: "#fffefa", font: '500 13px/1.35 "DM Sans",sans-serif',
      boxShadow: "0 8px 28px #0003",
    });
    document.body.append(el);
  }
  el.textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.remove(), 3800);
}

function friendly(error) {
  const message = String(error?.message || error || "Something went wrong. Please try again.");
  if (/Could not find the table/i.test(message)) return "This screen needs its database tables. Run the migrations in supabase/migrations, then reload.";
  if (/row-level security|permission denied/i.test(message)) return "Your account is not allowed to do that. Ask your college admin to link your profile.";
  if (/Sign in to continue|Sign in to RSVP/i.test(message)) return "Sign in to CampusPulse to register for events.";
  return message;
}

const dayFormat = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
const timeRange = (event) => {
  const start = dayFormat(event.starts_at);
  if (!event.ends_at) return start;
  const end = new Date(event.ends_at);
  return Number.isNaN(end.getTime()) ? start : `${start} – ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
};

// The filter chips are Hackathons / Workshops / Cultural / Sports; events have no
// category column, so derive one from the title and hosting club.
function categoryOf(event) {
  const hay = `${event.title || ""} ${event.club?.name || ""} ${event.description || ""}`.toLowerCase();
  if (/hackathon|hack-a|build|coding contest|ctf/.test(hay)) return "hackathon";
  if (/workshop|bootcamp|lab|training|seminar|session|tutorial/.test(hay)) return "workshop";
  if (/cultural|music|dance|fest|drama|art|audition/.test(hay)) return "cultural";
  if (/sport|tournament|cricket|football|basketball|athletic|marathon|run/.test(hay)) return "sports";
  return "other";
}

let me = null;
let registered = new Set();

function eventCard(event) {
  const going = registered.has(event.id);
  const seats = Number.isFinite(Number(event.capacity)) && Number(event.capacity) > 0 ? `${event.capacity} seats` : "Open entry";
  return `
    <article data-ecat="${esc(categoryOf(event))}" data-event-id="${esc(event.id)}" class="event-card rounded-lg border ${C.card} flex flex-col">
      <div class="p-gutter-lg flex flex-col gap-gutter-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="font-label text-label-sm px-2.5 py-0.5 rounded-full ${C.chip}">${esc(event.club?.name || "Campus event")}</span>
          <span class="font-mono text-mono-sm ${C.primaryText} tabular-nums">${esc(timeRange(event))}</span>
        </div>
        <h2 class="font-title text-title-md ${C.text}">${esc(event.title)}</h2>
        ${event.description ? `<p class="font-body text-body-md ${C.muted} whitespace-pre-line">${esc(event.description).slice(0, 600)}</p>` : ""}
        <div class="flex items-center gap-gutter-lg ${C.muted} pt-1">
          <span class="inline-flex items-center gap-1 font-body text-body-sm">${icon("location_on", "text-[16px]")}${esc(event.location || "Campus")}</span>
          <span class="inline-flex items-center gap-1 font-body text-body-sm">${icon("groups", "text-[16px]")}${esc(seats)}</span>
        </div>
        <div class="pt-gutter-sm border-t ${C.border} flex items-center justify-between">
          <span class="font-body text-body-sm ${C.muted}">${going ? "Your seat is reserved" : "RSVP saves to your activity"}</span>
          <button type="button" data-rsvp data-registered="${going}" class="rounded-full px-4 py-2 font-label text-label-md transition-colors duration-state-change ${going ? `${C.chip} ${C.hover}` : C.primary}">
            ${going ? "Registered ✓" : "Register Now"}
          </button>
        </div>
      </div>
    </article>`;
}

const emptyEvents = () => `
  <article class="rounded-lg border ${C.card} p-gutter-lg flex flex-col gap-gutter-xs">
    <p class="font-title text-title-md ${C.text}">No upcoming events yet</p>
    <p class="font-body text-body-sm ${C.muted}">When your faculty or clubs publish an event it appears here, and Register Now saves your RSVP.</p>
  </article>`;

async function toggleRsvp(button) {
  const card = button.closest("[data-event-id]");
  if (!card) return;
  const isRegistered = button.getAttribute("data-registered") === "true";
  const next = !isRegistered;
  button.disabled = true;
  try {
    if (next) await api.rsvp(card.dataset.eventId, "going");
    else await api.unrsvp(card.dataset.eventId);
    if (next) registered.add(card.dataset.eventId); else registered.delete(card.dataset.eventId);
    button.setAttribute("data-registered", String(next));
    button.textContent = next ? "Registered ✓" : "Register Now";
    button.className = `rounded-full px-4 py-2 font-label text-label-md transition-colors duration-state-change ${next ? `${C.chip} ${C.hover}` : C.primary}`;
    toast(next ? "You're registered. It's in My Activity." : "Registration cancelled.");
    await loadActivity();
  } catch (error) { toast(friendly(error)); }
  finally { button.disabled = false; }
}

async function loadEvents() {
  const panel = document.getElementById("ce-panel-events");
  if (!panel) return;
  const events = await api.events();
  panel.querySelectorAll(".event-card").forEach((node) => node.remove());
  const html = (events || []).length ? events.map(eventCard).join("") : emptyEvents();
  const chips = panel.querySelector(".ecat-chip")?.parentElement;
  if (chips) chips.insertAdjacentHTML("afterend", html);
  else panel.insertAdjacentHTML("beforeend", html);
  panel.dataset.live = "true";
}

async function loadActivity() {
  const panel = document.getElementById("ce-panel-my");
  if (!panel) return;
  const blocks = [...panel.querySelectorAll(":scope > div")];
  if (!blocks.length) return;
  const [rsvps, clubs] = await Promise.all([api.myRsvps(), api.clubs()]);
  registered = new Set((rsvps || []).map((row) => row.event_id));

  // One holder per block, so repeat loads replace rows instead of stacking them.
  const slot = (block) => {
    block.querySelectorAll(":scope > article").forEach((node) => node.remove());
    let holder = block.querySelector("[data-slot]");
    if (!holder) {
      holder = document.createElement("div");
      holder.dataset.slot = "";
      holder.className = "flex flex-col gap-gutter-sm";
      block.append(holder);
    }
    return holder;
  };

  const registrationBlock = slot(blocks[0]);
  const myEvents = (rsvps || []).filter((row) => row.event).sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at));
  registrationBlock.innerHTML = myEvents.length
    ? myEvents.map((row) => `
      <article class="rounded-lg border ${C.card} p-gutter-md flex items-center justify-between gap-gutter-md">
        <div class="min-w-0">
          <p class="font-title text-title-sm ${C.text}">${esc(row.event.title)}</p>
          <p class="font-body text-body-sm ${C.muted}">${esc(timeRange(row.event))} • ${esc(row.event.location || "Campus")}</p>
        </div>
        <span class="font-label text-label-sm px-2.5 py-0.5 rounded-full shrink-0 ${C.chip}">${esc(row.status === "going" ? "Confirmed" : row.status)}</span>
      </article>`).join("")
    : `<p class="font-body text-body-sm ${C.muted}">No registrations yet — RSVP to an event from the Events tab.</p>`;

  const clubBlock = slot(blocks[1]);
  const mine = (clubs || []).filter((club) => me && (club.club_members || []).some((member) => member.user_id === me.id));
  clubBlock.innerHTML = mine.length
    ? mine.map((club) => `
      <article class="rounded-lg border ${C.card} p-gutter-md flex items-center justify-between gap-gutter-md">
        <div class="min-w-0">
          <p class="font-title text-title-sm ${C.text}">${esc(club.name)}</p>
          <p class="font-body text-body-sm ${C.muted}">${esc(club.description || "Member")}</p>
        </div>
        <span class="font-label text-label-sm ${C.primaryText} shrink-0">Active</span>
      </article>`).join("")
    : `<p class="font-body text-body-sm ${C.muted}">You haven't joined a club yet — browse the Clubs tab.</p>`;
}

function wireEvents() {
  const panel = document.getElementById("ce-panel-events");
  if (!panel) return;
  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rsvp]");
    if (button) { event.preventDefault(); toggleRsvp(button); }
  });
}

async function initClubs() {
  let signedIn = false;
  try {
    const { data } = await api.session();
    signedIn = Boolean(data?.user);
    if (data?.user) me = await api.myProfile();
  } catch { /* the API call below reports the real problem */ }
  wireEvents();
  if (!signedIn) {
    const panel = document.getElementById("ce-panel-events");
    if (panel) {
      panel.querySelectorAll(".event-card").forEach((node) => node.remove());
      const chips = panel.querySelector(".ecat-chip")?.parentElement;
      const card = `
        <article class="rounded-lg border ${C.card} p-gutter-lg flex flex-col gap-gutter-sm">
          <p class="font-title text-title-md ${C.text}">Sign in to CampusPulse</p>
          <p class="font-body text-body-sm ${C.muted}">Sign in to see your college's events, register with one tap and follow your clubs.</p>
          <a href="/login" class="inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2 font-label text-label-md ${C.primary}">Sign in</a>
        </article>`;
      if (chips) chips.insertAdjacentHTML("afterend", card); else panel.insertAdjacentHTML("beforeend", card);
    }
    return;
  }
  try {
    await loadActivity();
    await loadEvents();
    if (me) await loadActivity(); // refresh states now that RSVPs are known
  } catch (error) { toast(friendly(error)); }
}

if (configured && isClubs) initClubs().catch((error) => toast(friendly(error)));
