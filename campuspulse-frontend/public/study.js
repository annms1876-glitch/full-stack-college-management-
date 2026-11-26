// CampusPulse study hub: peer doubts, votes, solutions, and shared study files.
//
// Loaded by /app.js on every student screen; it only runs on /study (both
// themes). Everything it renders comes from Supabase under Row Level Security,
// so the sample cards on the screen are replaced with real, actionable rows.
import { api, configured } from "/api.js";

const dark = location.pathname.startsWith("/dark/");
const routePath = location.pathname.replace(/\/$/, "") || "/";
const isStudy = routePath.endsWith("/study");

// Full literal class names per theme so Tailwind's scanner emits both sets.
const C = dark
  ? {
      card: "bg-dark-surface-container-lowest border-dark-outline-variant/60",
      inset: "bg-dark-surface-container-low border-dark-outline-variant/50",
      input: "bg-dark-surface-container-low border-dark-outline-variant/60 text-dark-on-surface placeholder:text-dark-on-surface-variant",
      text: "text-dark-on-surface",
      muted: "text-dark-on-surface-variant",
      primary: "bg-dark-primary text-dark-on-primary",
      primaryText: "text-dark-primary",
      chip: "bg-dark-secondary-container text-dark-on-secondary-container",
      border: "border-dark-outline-variant/60",
      divider: "border-dark-outline-variant/50",
      hover: "hover:bg-dark-surface-container",
      fallback: "bg-dark-primary-container text-dark-on-primary-container",
    }
  : {
      card: "bg-light-surface-container-lowest border-light-outline-variant/60",
      inset: "bg-light-surface-container-low border-light-outline-variant/50",
      input: "bg-light-surface-container-low border-light-outline-variant/60 text-light-on-surface placeholder:text-light-on-surface-variant",
      text: "text-light-on-surface",
      muted: "text-light-on-surface-variant",
      primary: "bg-light-primary text-light-on-primary",
      primaryText: "text-light-primary",
      chip: "bg-light-secondary-container text-light-on-secondary-container",
      border: "border-light-outline-variant/60",
      divider: "border-light-outline-variant/40",
      hover: "hover:bg-light-surface-container",
      fallback: "bg-light-primary-container text-light-on-primary-container",
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
  if (/Could not find the table|schema cache/i.test(message) && /stud|doubt/i.test(message)) {
    return "The study hub needs its database tables. Run supabase/migrations/202611260011_study_hub_and_campus_uploads.sql in Supabase, then reload.";
  }
  if (/Bucket not found|bucket/i.test(message) && /upload|attach|file/i.test(message)) {
    return "Uploads need the campus-uploads bucket. Run supabase/migrations/202611260011_study_hub_and_campus_uploads.sql in Supabase, then reload.";
  }
  if (/row-level security|permission denied|new row violates/i.test(message)) {
    return "Your account is not allowed to do that. Check that your profile is linked to a college.";
  }
  if (/Sign in to continue/i.test(message)) return "Sign in to CampusPulse to do that.";
  return message;
}

async function withBusy(button, busyText, task) {
  if (!button || button.disabled) return;
  const original = button.innerHTML;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = busyText;
  try { await task(); }
  catch (error) { toast(friendly(error)); }
  finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = original;
  }
}

function timeAgo(value) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

const fileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1048576).toFixed(1)} MB`;
};
const fileNameOf = (url) => {
  try {
    const last = decodeURIComponent(String(url).split("?")[0].split("/").pop() || "file");
    const stripped = last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
    const [, base, extension] = stripped.match(/^(.*?)(\.[A-Za-z0-9]{1,10})?$/) || [, stripped, ""];
    return `${(base || stripped).replace(/_/g, " ")}${extension || ""}` || "file";
  } catch { return "file"; }
};
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => (part[0] || "").toUpperCase()).join("") || "?";

function avatarHtml(profile, size = "w-9 h-9") {
  const name = profile?.full_name || "CampusPulse";
  if (profile?.avatar_url) return `<img src="${esc(profile.avatar_url)}" alt="${esc(name)}" class="${size} rounded-full object-cover border ${C.border} shrink-0">`;
  return `<span class="${size} rounded-full ${C.fallback} flex items-center justify-center font-title text-title-sm shrink-0">${esc(initials(name))}</span>`;
}

function modalShell(title, innerHtml) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-gutter-lg";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title);
  overlay.innerHTML = `
    <div class="w-full max-w-[430px] max-h-[88vh] overflow-y-auto rounded-xl border ${C.card} flex flex-col">
      <header class="flex items-center justify-between px-gutter-lg py-gutter-md border-b ${C.divider}">
        <h2 class="font-headline text-headline-md ${C.text}">${esc(title)}</h2>
        <button type="button" data-close aria-label="Close" class="w-9 h-9 rounded-full flex items-center justify-center ${C.hover} ${C.text}">${icon("close")}</button>
      </header>
      <div class="p-gutter-lg flex flex-col gap-gutter-md">${innerHtml}</div>
    </div>`;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-close]")) overlay.remove();
  });
  const onKey = (event) => {
    if (!overlay.isConnected) return document.removeEventListener("keydown", onKey);
    if (event.key === "Escape") overlay.remove();
  };
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  return overlay;
}

let me = null;

// ---------------------------------------------------------------------------
// Doubts
// ---------------------------------------------------------------------------
function answerRows(answers) {
  return (answers || []).map((answer) => `
    <p class="font-body text-body-sm ${C.text}">
      <span class="font-title text-title-sm">${esc(answer.author?.full_name || "CampusPulse member")}</span>
      ${esc(answer.body)}
      <span class="font-mono text-mono-sm ${C.muted}">${esc(timeAgo(answer.created_at))}</span>
    </p>`).join("");
}

function doubtCard(doubt) {
  const votes = Array.isArray(doubt.doubt_votes) ? doubt.doubt_votes : [];
  const voted = Boolean(me && votes.some((vote) => vote.user_id === me.id));
  const author = doubt.anonymous ? "Anonymous Student" : (doubt.author?.full_name || "CampusPulse member");
  const subtitle = doubt.anonymous ? "Identity hidden" : (doubt.author?.full_name ? "Student" : "CampusPulse member");
  const answers = Array.isArray(doubt.doubt_answers) ? doubt.doubt_answers : [];
  return `
    <article data-qcat="${esc(doubt.category)}" data-doubt-id="${esc(doubt.id)}" class="doubt-card rounded-lg border ${C.card} p-gutter-lg flex flex-col gap-gutter-md">
      <header class="flex items-center justify-between gap-gutter-sm">
        <div class="flex items-center gap-gutter-sm min-w-0">
          ${doubt.anonymous ? `<span class="w-9 h-9 rounded-full ${C.fallback} flex items-center justify-center shrink-0">${icon("visibility_off", "text-[18px]")}</span>` : avatarHtml(doubt.author)}
          <div class="min-w-0">
            <p class="font-title text-title-sm ${C.text} truncate">${esc(author)}</p>
            <p class="font-body text-body-sm ${C.muted}">${esc(subtitle)} • ${esc(timeAgo(doubt.created_at))}</p>
          </div>
        </div>
        <span class="font-label text-label-sm px-2.5 py-0.5 rounded-full shrink-0 ${C.chip}">${esc(doubt.category)}</span>
      </header>

      <div class="flex flex-col gap-gutter-xs">
        <h2 class="font-title text-title-md ${C.text}">${esc(doubt.title)}</h2>
        ${doubt.body ? `<p class="font-body text-body-md ${C.muted} whitespace-pre-line">${esc(doubt.body)}</p>` : ""}
        ${doubt.attachment_url ? `<a href="${esc(doubt.attachment_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 font-label text-label-md ${C.primaryText}">${icon("attach_file", "text-[16px]")}${esc(doubt.attachment_name ? fileNameOf(doubt.attachment_name) : fileNameOf(doubt.attachment_url))}</a>` : ""}
      </div>

      ${answers.length ? `<div class="rounded-md border ${C.divider} ${C.inset} p-gutter-md flex flex-col gap-gutter-xs">${answerRows(answers)}</div>` : ""}

      <footer class="flex items-center justify-between pt-gutter-sm border-t ${C.divider}">
        <button type="button" data-doubt-vote aria-pressed="${voted}" aria-label="${voted ? "Remove your vote" : "Upvote this question"}" class="inline-flex items-center gap-1.5 ${voted ? C.primaryText : C.muted} ${C.hover} rounded-full px-2 py-1">
          ${icon("thumb_up", "text-[18px]")}
          <span class="font-mono text-mono-sm tabular-nums" data-vote-count>${votes.length}</span>
        </button>
        <button type="button" data-doubt-answer class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-label text-label-md ${C.chip} ${C.hover}">
          ${icon("reply", "text-[16px]")}Add Solution
        </button>
      </footer>
    </article>`;
}

const signInCard = (message) => `
  <article class="rounded-lg border ${C.card} p-gutter-lg flex flex-col gap-gutter-sm">
    <p class="font-title text-title-md ${C.text}">Sign in to CampusPulse</p>
    <p class="font-body text-body-sm ${C.muted}">${esc(message)}</p>
    <a href="/login" class="inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2 font-label text-label-md ${C.primary}">Sign in</a>
  </article>`;

const emptyDoubts = () => `
  <article class="rounded-lg border ${C.card} p-gutter-lg flex flex-col gap-gutter-xs">
    <p class="font-title text-title-md ${C.text}">No questions in your college yet</p>
    <p class="font-body text-body-sm ${C.muted}">Ask the first doubt above — your batchmates can answer it here.</p>
  </article>`;

async function loadDoubts() {
  const list = document.getElementById("doubt-feed-list");
  if (!list) return;
  const rows = await api.doubts();
  list.innerHTML = (rows || []).length ? rows.map(doubtCard).join("") : emptyDoubts();
  list.dataset.live = "true";
}

async function toggleVote(button) {
  const card = button.closest("[data-doubt-id]");
  if (!card) return;
  const enabled = button.getAttribute("aria-pressed") !== "true";
  const count = button.querySelector("[data-vote-count]");
  button.disabled = true;
  try {
    await api.voteDoubt(card.dataset.doubtId, enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Remove your vote" : "Upvote this question");
    button.classList.toggle(C.primaryText, enabled);
    button.classList.toggle(C.muted, !enabled);
    if (count) count.textContent = String(Math.max(0, Number(count.textContent || 0) + (enabled ? 1 : -1)));
  } catch (error) { toast(friendly(error)); }
  finally { button.disabled = false; }
}

function openAnswerComposer(doubtId) {
  const overlay = modalShell("Add a solution", `
    <form data-answer-form class="flex flex-col gap-gutter-md">
      <textarea name="body" rows="4" maxlength="3000" required aria-label="Your solution" placeholder="Explain the approach, formula or code fix…" class="w-full rounded-md border px-3 py-2 font-body text-body-md ${C.input}"></textarea>
      <button type="submit" class="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 font-label text-label-md ${C.primary}">Post solution</button>
    </form>`);
  const form = overlay.querySelector("[data-answer-form]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    await withBusy(button, "Posting…", async () => {
      await api.addDoubtAnswer(doubtId, form.body.value);
      overlay.remove();
      toast("Solution posted.");
      await loadDoubts();
    });
  });
}

function wireDoubts() {
  const panel = document.getElementById("study-panel-doubts");
  if (!panel) return;

  // Attachment picker for the question composer.
  const attach = [...panel.querySelectorAll("button")].find((button) => /attach/i.test(button.textContent || ""));
  let picker = panel.querySelector('input[data-doubt-file]');
  let attachment = null;
  if (attach && !picker) {
    picker = document.createElement("input");
    picker.type = "file";
    picker.dataset.doubtFile = "";
    picker.className = "hidden";
    picker.accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip";
    attach.after(picker);
    attach.addEventListener("click", () => picker.click());
    picker.addEventListener("change", () => {
      attachment = picker.files && picker.files[0] ? picker.files[0] : null;
      toast(attachment ? `Attached ${attachment.name}` : "Attachment removed.");
    });
  }

  const submit = document.getElementById("submit-doubt-btn");
  submit?.addEventListener("click", async () => {
    const title = document.getElementById("doubt-title");
    const body = document.getElementById("doubt-desc");
    const category = document.getElementById("doubt-category");
    if (!title || !String(title.value || "").trim()) {
      toast("Write a short question title first.");
      title?.focus();
      return;
    }
    const anonymous = panel.querySelector('.identity-toggle[aria-pressed="true"]')?.dataset.mode === "anonymous";
    await withBusy(submit, "Posting…", async () => {
      await api.addDoubt({
        title: title.value,
        body: body ? body.value : "",
        category: category ? category.value : "General",
        anonymous,
        file: attachment,
      });
      title.value = "";
      if (body) body.value = "";
      attachment = null;
      if (picker) picker.value = "";
      toast("Question posted to your campus.");
      await loadDoubts();
    });
  });

  document.addEventListener("click", (event) => {
    const vote = event.target.closest("[data-doubt-vote]");
    if (vote) { event.preventDefault(); toggleVote(vote); return; }
    const answer = event.target.closest("[data-doubt-answer]");
    if (answer) {
      event.preventDefault();
      const card = answer.closest("[data-doubt-id]");
      if (card) openAnswerComposer(card.dataset.doubtId);
    }
  });
}

// ---------------------------------------------------------------------------
// Shared study files (notes, summaries, e-library)
// ---------------------------------------------------------------------------
const SECTIONS = [
  { panel: "study-panel-notes", category: "notes", label: "Upload notes" },
  { panel: "study-panel-summaries", category: "summary", label: "Upload summary" },
  { panel: "study-panel-elibrary", category: "elibrary", label: "Upload material" },
];

function resourceCard(resource) {
  const url = api.storagePublicUrl("campus-uploads", resource.file_path);
  const name = resource.file_path ? fileNameOf(resource.file_path) : resource.file_name;
  return `
    <article data-resource-id="${esc(resource.id)}" class="rounded-lg border ${C.card} p-gutter-lg flex items-center justify-between gap-gutter-md">
      <div class="min-w-0">
        <span class="font-mono text-mono-sm ${C.primaryText}">${esc(resource.course_code || resource.category)} • ${esc(fileSize(resource.file_size))}</span>
        <h3 class="font-title text-title-md ${C.text} mt-0.5">${esc(resource.title)}</h3>
        <p class="font-body text-body-sm ${C.muted}">${esc(resource.description || `Shared by ${resource.uploader?.full_name || "a student"}`)} · ${esc(timeAgo(resource.created_at))}</p>
      </div>
      <a href="${esc(url)}" download="${esc(name)}" target="_blank" rel="noopener noreferrer" aria-label="Download ${esc(resource.title)}" class="w-10 h-10 rounded-full ${C.chip} flex items-center justify-center shrink-0 ${C.hover}">
        ${icon("download")}
      </a>
    </article>`;
}

const emptySection = (message) => `
  <article class="rounded-lg border ${C.card} p-gutter-lg">
    <p class="font-body text-body-sm ${C.muted}">${esc(message)}</p>
  </article>`;

function openUpload(category) {
  const title = category === "notes" ? "Upload notes" : category === "summary" ? "Upload a lecture summary" : "Upload study material";
  const overlay = modalShell(title, `
    <form data-upload-form class="flex flex-col gap-gutter-md">
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.text}">Title
        <input name="title" maxlength="200" required placeholder="Process Sync & Deadlocks" class="w-full rounded-md border px-3 py-2 font-body text-body-md ${C.input}">
      </label>
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.text}">Course code
        <input name="courseCode" maxlength="40" placeholder="CS301" class="w-full rounded-md border px-3 py-2 font-body text-body-md ${C.input}">
      </label>
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.text}">Description
        <textarea name="description" rows="3" maxlength="2000" placeholder="Units covered, faculty handout, anything useful…" class="w-full rounded-md border px-3 py-2 font-body text-body-md ${C.input}"></textarea>
      </label>
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.text}">File (PDF, DOC, DOCX, PNG, JPEG or ZIP · 25 MiB max)
        <input type="file" name="file" required accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" class="font-body text-body-sm ${C.muted}">
      </label>
      <button type="submit" class="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 font-label text-label-md ${C.primary}">Upload file</button>
    </form>`);
  const form = overlay.querySelector("[data-upload-form]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const file = form.file.files && form.file.files[0] ? form.file.files[0] : null;
    if (!file) { toast("Choose a file to upload."); return; }
    await withBusy(button, "Uploading…", async () => {
      await api.addStudyResource({ title: form.title.value, courseCode: form.courseCode.value, description: form.description.value, category, file });
      overlay.remove();
      toast("File shared with your campus.");
      await loadResources();
    });
  });
}

function ensureUploadButton(panel, category, label) {
  let button = [...panel.querySelectorAll("button")].find((candidate) => /contribute|upload/i.test(candidate.textContent || ""));
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = `inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 font-label text-label-md ${C.primary}`;
    button.innerHTML = `${icon("upload_file", "text-[16px]")}${esc(label)}`;
    const heading = panel.querySelector("h2");
    if (heading) {
      if (heading.parentElement && heading.parentElement.children.length === 1) {
        const row = document.createElement("div");
        row.className = "flex items-center justify-between gap-gutter-md";
        heading.before(row);
        row.append(heading, button);
      } else {
        heading.after(button);
      }
    } else {
      panel.prepend(button);
    }
  }
  button.addEventListener("click", () => openUpload(category));
}

async function loadResources() {
  let rows = [];
  try { rows = await api.studyResources(); }
  catch (error) { toast(friendly(error)); return; }
  for (const section of SECTIONS) {
    const panel = document.getElementById(section.panel);
    if (!panel) continue;
    panel.querySelectorAll(":scope > article").forEach((node) => node.remove());
    const items = (rows || []).filter((row) => row.category === section.category);
    const html = items.length ? items.map(resourceCard).join("") : emptySection(
      section.category === "notes" ? "No notes shared yet — upload the first set." :
      section.category === "summary" ? "No lecture summaries yet — upload one above." :
      "No e-library material yet — upload papers, e-books or references.",
    );
    panel.insertAdjacentHTML("beforeend", html);
  }
}

async function initStudy() {
  let signedIn = false;
  try {
    const { data: user } = await api.currentUser();
    signedIn = Boolean(data?.user);
    if (data?.user) {
      me = await api.myProfile();
      const identityLabel = document.getElementById("identity-label");
      if (identityLabel) identityLabel.innerHTML = `Posting as <strong>${esc(me.full_name || "you")}</strong>`;
      const identityAvatar = document.getElementById("identity-avatar");
      if (identityAvatar && me.avatar_url) { identityAvatar.src = me.avatar_url; identityAvatar.alt = me.full_name || "Your profile"; }
      // The screen's own toggle rewrites the label with a sample name; keep it real.
      document.querySelectorAll(".identity-toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => {
          const label = document.getElementById("identity-label");
          if (label) label.innerHTML = `Posting as <strong>${esc(me.full_name || "you")}</strong>`;
        });
      });
    }
  } catch (error) { toast(friendly(error)); }

  wireDoubts();
  for (const section of SECTIONS) {
    const panel = document.getElementById(section.panel);
    if (panel) ensureUploadButton(panel, section.category, section.label);
  }

  // A signed-out visitor gets a clear prompt instead of a permissions toast.
  if (!signedIn) {
    const list = document.getElementById("doubt-feed-list");
    if (list) list.innerHTML = signInCard("Sign in to ask questions, vote and read your batchmates' solutions.");
    for (const section of SECTIONS) {
      const panel = document.getElementById(section.panel);
      if (!panel) continue;
      panel.querySelectorAll(":scope > article").forEach((node) => node.remove());
      panel.insertAdjacentHTML("beforeend", emptySection("Sign in to download and share notes, summaries and e-library files."));
    }
    return;
  }

  await Promise.all([loadDoubts(), loadResources()]);
}

if (configured && isStudy) initStudy().catch((error) => toast(friendly(error)));
