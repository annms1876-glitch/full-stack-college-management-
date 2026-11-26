// CampusPulse student social layer.
//
// Loaded by /app.js on every student screen. It replaces the static sample
// feed cards with rows the signed-in student can actually act on: posts with
// attachments, likes, saves, comments, 24-hour stories, and the self-service
// profile editor. Every network call goes through /api.js, so Row Level
// Security — not this file — decides what a student may read or write.
import { api, supabase, configured } from "/api.js";

const dark = location.pathname.startsWith("/dark/");
const routePath = location.pathname.replace(/\/$/, "") || "/";
const isFeed = routePath.endsWith("/feed");
const isProfile = routePath.endsWith("/profile");

// Full literal class names per theme so Tailwind's scanner generates both sets.
const C = dark
  ? {
      card: "bg-dark-surface-container-lowest border-dark-outline-variant/60",
      inset: "bg-dark-surface-container-low border-dark-outline-variant/50",
      input: "bg-dark-surface-container-low border-dark-outline-variant/60 text-dark-on-surface placeholder:text-dark-on-surface-variant",
      text: "text-dark-on-surface",
      muted: "text-dark-on-surface-variant",
      primary: "bg-dark-primary text-dark-on-primary",
      primaryText: "text-dark-primary",
      hoverPrimary: "hover:text-dark-primary",
      chip: "bg-dark-surface-container text-dark-on-surface border-dark-outline-variant/60",
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
      hoverPrimary: "hover:text-light-primary",
      chip: "bg-light-surface-container text-light-on-surface border-light-outline-variant/60",
      border: "border-light-outline-variant/60",
      divider: "border-light-outline-variant/50",
      hover: "hover:bg-light-surface-container",
      fallback: "bg-light-primary-container text-light-on-primary-container",
    };

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name, size = "text-[22px]") => `<span class="material-symbols-outlined ${size}" aria-hidden="true">${name}</span>`;

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
  if (/Could not find the table|schema cache/i.test(message) && /stor/i.test(message)) {
    return "Stories need the latest database migration. Run supabase/migrations/202611260010_student_stories_and_uploads.sql in Supabase, then reload.";
  }
  if (/Bucket not found|bucket/i.test(message) && /upload|attach|story|photo/i.test(message)) {
    return "Uploads need the campus-uploads bucket. Run supabase/migrations/202611260010_student_stories_and_uploads.sql in Supabase, then reload.";
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

const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => (part[0] || "").toUpperCase()).join("") || "?";

function avatarHtml(profile, size = "w-10 h-10") {
  const name = profile?.full_name || "CampusPulse";
  if (profile?.avatar_url) {
    return `<img src="${esc(profile.avatar_url)}" alt="${esc(name)}" class="${size} rounded-full object-cover border ${C.border} shrink-0">`;
  }
  return `<span class="${size} rounded-full ${C.fallback} flex items-center justify-center font-title text-title-sm shrink-0">${esc(initials(name))}</span>`;
}

const isImage = (url) => /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(String(url || ""));
const mediaUrl = (value) => (/^https?:\/\//i.test(String(value || "")) ? value : api.storagePublicUrl("campus-uploads", value));
const fileNameOf = (url) => {
  try {
    const last = decodeURIComponent(String(url).split("?")[0].split("/").pop() || "attachment");
    const stripped = last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
    const [, base, extension] = stripped.match(/^(.*?)(\.[A-Za-z0-9]{1,10})?$/) || [, stripped, ""];
    return `${(base || stripped).replace(/_/g, " ")}${extension || ""}` || "attachment";
  } catch { return "attachment"; }
};

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
        <button type="button" data-close aria-label="Close" class="w-9 h-9 rounded-full flex items-center justify-center ${C.hover} ${C.text}">${icon("close", "text-[20px]")}</button>
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

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------
function buildComposer(profile) {
  const section = document.createElement("section");
  section.className = "px-gutter-lg";
  section.setAttribute("aria-label", "Create a post");
  section.innerHTML = `
    <form class="feed-composer rounded-lg border ${C.card} p-gutter-lg flex flex-col gap-gutter-sm" data-composer>
      <div class="flex items-start gap-gutter-md">
        ${avatarHtml(profile, "w-10 h-10")}
        <textarea name="body" rows="3" maxlength="10000" aria-label="Post text" placeholder="Share something with your campus…" class="flex-1 resize-y rounded-md border px-3 py-2 font-body text-body-md ${C.input}"></textarea>
      </div>
      <div class="flex flex-wrap items-center gap-gutter-sm">
        <button type="button" data-attach class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-label text-label-md ${C.chip} ${C.hover}">
          ${icon("attach_file", "text-[18px]")}Attach documents
        </button>
        <input type="file" name="files" multiple class="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip">
        <span class="font-body text-body-sm ${C.muted}" data-file-list>PDF, DOC, DOCX, PNG, JPEG or ZIP · up to 25 MiB each</span>
        <span class="flex-1"></span>
        <select name="visibility" aria-label="Who can see this post" class="rounded-full border px-3 py-1.5 font-label text-label-md ${C.input}">
          <option value="college">My college</option>
          <option value="public">Anyone on CampusPulse</option>
        </select>
        <button type="submit" class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-label text-label-md ${C.primary}">
          ${icon("send", "text-[18px]")}Post
        </button>
      </div>
    </form>`;
  const form = section.querySelector("[data-composer]");
  const input = form.querySelector('input[type="file"]');
  const summary = form.querySelector("[data-file-list]");
  form.querySelector("[data-attach]").addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const files = input.files ? [...input.files] : [];
    summary.textContent = files.length
      ? `${files.length} file${files.length === 1 ? "" : "s"} selected · ${files.map((file) => file.name).join(", ")}`
      : "PDF, DOC, DOCX, PNG, JPEG or ZIP · up to 25 MiB each";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const files = input.files ? [...input.files] : [];
    if (!form.body.value.trim() && !files.length) { toast("Write something or attach a document first."); form.body.focus(); return; }
    await withBusy(button, "Posting…", async () => {
      await api.createPost({ body: form.body.value, visibility: form.visibility.value, files });
      form.reset();
      summary.textContent = "PDF, DOC, DOCX, PNG, JPEG or ZIP · up to 25 MiB each";
      toast("Posted to your campus feed.");
      await loadFeed();
      document.querySelector('section[aria-label="Campus Feed"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  return section;
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------
const countOf = (rows) => (Array.isArray(rows) ? Number(rows[0]?.count ?? 0) : 0);

function postCard(post, state) {
  const author = post.author || {};
  const media = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  const images = media.filter(isImage);
  const documents = media.filter((url) => !isImage(url));
  const likeCount = countOf(post.likes);
  const commentCount = countOf(post.comments);
  const role = author.role === "faculty" ? "Faculty" : author.role === "admin" ? "Administration" : "Student";
  const imageGrid = images.length
    ? `<div class="px-gutter-lg pb-gutter-sm grid ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"} gap-gutter-sm">${images.map((url) => `<img src="${esc(mediaUrl(url))}" alt="Post attachment" loading="lazy" class="w-full rounded-md object-cover max-h-[320px]">`).join("")}</div>`
    : "";
  const documentList = documents.length
    ? `<div class="px-gutter-lg pb-gutter-md flex flex-col gap-gutter-xs">${documents.map((url) => `<a href="${esc(mediaUrl(url))}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 font-label text-label-md ${C.inset} ${C.hover} ${C.text}">${icon("description", "text-[18px]")}${esc(fileNameOf(url))}</a>`).join("")}</div>`
    : "";
  return `
    <article data-post-id="${esc(post.id)}" data-category="community" class="feed-post rounded-lg border ${C.card} overflow-hidden flex flex-col">
      <header class="flex items-center justify-between px-gutter-lg py-gutter-md">
        <div class="flex items-center gap-gutter-md min-w-0">
          ${avatarHtml(author, "w-10 h-10")}
          <div class="flex flex-col min-w-0">
            <h2 class="font-title text-title-sm ${C.text} truncate">${esc(author.full_name || "CampusPulse member")}</h2>
            <p class="font-body text-body-sm ${C.muted}">${esc(role)} · <span class="font-mono text-mono-sm tabular-nums">${esc(timeAgo(post.created_at))}</span></p>
          </div>
        </div>
        ${post.visibility === "public" ? `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${C.chip}"><span class="font-label text-label-sm">Public</span></span>` : ""}
      </header>
      ${post.body ? `<div class="px-gutter-lg pb-gutter-md"><p class="font-body text-body-md ${C.text} whitespace-pre-line">${esc(post.body)}</p></div>` : ""}
      ${imageGrid}
      ${documentList}
      <div class="flex items-center justify-between px-gutter-lg py-gutter-md border-t ${C.divider}">
        <div class="flex items-center gap-gutter-lg">
          <button type="button" data-like aria-pressed="${state.liked}" aria-label="${state.liked ? "Unlike post" : "Like post"}" class="inline-flex items-center gap-1.5 ${state.liked ? "text-story-rose" : C.text} transition-colors duration-state-change">
            ${icon(state.liked ? "favorite" : "favorite_border")}
            <span class="font-mono text-mono-sm tabular-nums" data-like-count>${likeCount}</span>
          </button>
          <button type="button" data-comment-toggle aria-label="Show comments" class="inline-flex items-center gap-1.5 ${C.text} ${C.hoverPrimary} transition-colors duration-state-change">
            ${icon("chat_bubble_outline")}
            <span class="font-mono text-mono-sm tabular-nums" data-comment-count>${commentCount}</span>
          </button>
          <button type="button" data-share aria-label="Share post" class="inline-flex items-center gap-1.5 ${C.text} ${C.hoverPrimary} transition-colors duration-state-change">
            ${icon("send")}
          </button>
        </div>
        <button type="button" data-save aria-pressed="${state.saved}" aria-label="${state.saved ? "Remove from saved" : "Save post"}" class="inline-flex items-center justify-center ${state.saved ? C.primaryText : C.text} ${C.hover} rounded-full w-9 h-9 transition-colors duration-state-change">
          ${icon(state.saved ? "bookmark" : "bookmark_border")}
        </button>
      </div>
      <div class="comment-drawer hidden border-t ${C.divider} px-gutter-lg py-gutter-md ${dark ? "bg-dark-surface-container-low/50" : "bg-light-surface-container-low/50"}" data-comment-drawer>
        <div class="flex flex-col gap-gutter-sm" data-comment-list></div>
        <form class="flex items-center gap-gutter-sm mt-gutter-md" data-comment-form>
          <input name="body" maxlength="5000" aria-label="Write a comment" placeholder="Add a comment…" class="flex-1 rounded-full border px-3 py-2 font-body text-body-sm ${C.input}">
          <button type="submit" class="inline-flex items-center gap-1 rounded-full px-3 py-2 font-label text-label-md ${C.primary}">${icon("send", "text-[16px]")}Send</button>
        </form>
      </div>
    </article>`;
}

const emptyFeed = () => `
  <div class="rounded-lg border ${C.card} p-gutter-xl text-center flex flex-col items-center gap-gutter-sm">
    ${icon("forum", "text-[32px]")}
    <p class="font-title text-title-md ${C.text}">No posts in your college yet</p>
    <p class="font-body text-body-sm ${C.muted}">Use the composer above to share the first update, document or question with your campus.</p>
  </div>`;

async function loadFeed() {
  const section = document.querySelector('section[aria-label="Campus Feed"]');
  if (!section) return;
  const [posts, likes, saves] = await Promise.all([api.feedPosts(), api.myLikes(), api.mySaves()]);
  const liked = new Set((likes || []).map((row) => row.post_id));
  const saved = new Set((saves || []).map((row) => row.post_id));
  section.innerHTML = (posts || []).length
    ? posts.map((post) => postCard(post, { liked: liked.has(post.id), saved: saved.has(post.id) })).join("")
    : emptyFeed();
  section.dataset.live = "true";
}

async function toggleLike(button) {
  const card = button.closest("[data-post-id]");
  if (!card) { toast("Sign in to CampusPulse to like posts."); return; }
  const enabled = button.getAttribute("aria-pressed") !== "true";
  const count = button.querySelector("[data-like-count]");
  button.disabled = true;
  try {
    await api.like(card.dataset.postId, enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Unlike post" : "Like post");
    const glyph = button.querySelector(".material-symbols-outlined");
    if (glyph) {
      glyph.textContent = enabled ? "favorite" : "favorite_border";
      glyph.style.fontVariationSettings = enabled ? "'FILL' 1" : "'FILL' 0";
    }
    button.classList.toggle("text-story-rose", enabled);
    if (count) count.textContent = String(Math.max(0, Number(count.textContent || 0) + (enabled ? 1 : -1)));
    toast(enabled ? "Post liked." : "Like removed.");
  } catch (error) { toast(friendly(error)); }
  finally { button.disabled = false; }
}

async function toggleSave(button) {
  const card = button.closest("[data-post-id]");
  if (!card) { toast("Sign in to CampusPulse to save posts."); return; }
  const enabled = button.getAttribute("aria-pressed") !== "true";
  button.disabled = true;
  try {
    await api.save(card.dataset.postId, enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Remove from saved" : "Save post");
    const glyph = button.querySelector(".material-symbols-outlined");
    if (glyph) { glyph.textContent = enabled ? "bookmark" : "bookmark_border"; glyph.style.fontVariationSettings = enabled ? "'FILL' 1" : "'FILL' 0"; }
    button.classList.toggle(C.primaryText, enabled);
    button.classList.toggle(C.text, !enabled);
    toast(enabled ? "Post saved." : "Removed from saved posts.");
  } catch (error) { toast(friendly(error)); }
  finally { button.disabled = false; }
}

function renderComments(list, rows) {
  list.innerHTML = (rows || []).length
    ? rows.map((comment) => `
        <p class="font-body text-body-sm ${C.text}"><span class="font-title text-title-sm">${esc(comment.author?.full_name || "CampusPulse member")}</span> ${esc(comment.body)} <span class="font-mono text-mono-sm ${C.muted}">${esc(timeAgo(comment.created_at))}</span></p>`).join("")
    : `<p class="font-body text-body-sm ${C.muted}">No comments yet — start the conversation.</p>`;
}

async function openComments(card) {
  const list = card.querySelector("[data-comment-list]");
  if (!list) return;
  const drawer = card.querySelector("[data-comment-drawer]");
  drawer?.classList.remove("hidden");
  if (card.dataset.commentsLoaded === "true") return;
  list.innerHTML = `<p class="font-body text-body-sm ${C.muted}">Loading comments…</p>`;
  try {
    renderComments(list, await api.commentsFor(card.dataset.postId));
    card.dataset.commentsLoaded = "true";
  } catch (error) {
    list.innerHTML = `<p class="font-body text-body-sm ${C.muted}">${esc(friendly(error))}</p>`;
  }
}

async function addComment(form) {
  const card = form.closest("[data-post-id]");
  const body = form.body.value.trim();
  if (!card || !body) { if (form.body) form.body.focus(); return; }
  const button = form.querySelector('button[type="submit"]');
  await withBusy(button, "Sending…", async () => {
    const comment = await api.addComment(card.dataset.postId, body);
    form.reset();
    const list = card.querySelector("[data-comment-list]");
    if (list) {
      if (!list.querySelector("p")) renderComments(list, []);
      const empty = list.querySelector("p");
      if (empty && /No comments yet/.test(empty.textContent || "")) empty.remove();
      const row = document.createElement("p");
      row.className = `font-body text-body-sm ${C.text}`;
      row.innerHTML = `<span class="font-title text-title-sm">${esc(comment.author?.full_name || "You")}</span> ${esc(comment.body)} <span class="font-mono text-mono-sm ${C.muted}">just now</span>`;
      list.append(row);
    }
    const count = card.querySelector("[data-comment-count]");
    if (count) count.textContent = String(Number(count.textContent || 0) + 1);
    toast("Comment posted.");
  });
}

function sharePost(button) {
  const card = button.closest("[data-post-id]");
  const url = `${location.origin}/feed${card ? `#post-${card.dataset.postId}` : ""}`;
  if (navigator.share) {
    navigator.share({ title: "CampusPulse post", url }).catch((error) => {
      if (error?.name !== "AbortError") toast("Could not share this post.");
    });
    return;
  }
  navigator.clipboard?.writeText(url).then(() => toast("Link copied to your clipboard.")).catch(() => toast("Could not copy the link."));
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------
function storyButton(story) {
  const author = story.author || {};
  const label = String(author.full_name || "Campus").split(/\s+/)[0];
  const photo = story.media_path
    ? `<img src="${esc(api.storagePublicUrl("campus-uploads", story.media_path))}" alt="${esc(author.full_name || "Campus story")}" class="w-14 h-14 rounded-full object-cover">`
    : `<span class="w-14 h-14 rounded-full ${C.fallback} flex items-center justify-center">${icon("auto_stories", "text-[24px]")}</span>`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "story-trigger flex flex-col items-center gap-gutter-xs shrink-0 w-16";
  button.dataset.storyId = story.id;
  button.dataset.storyAuthor = author.full_name || "CampusPulse";
  button.dataset.storyCaption = story.caption || "";
  button.dataset.storyMedia = story.media_path ? api.storagePublicUrl("campus-uploads", story.media_path) : "";
  button.dataset.storyLabel = label;
  button.innerHTML = `
    <div class="p-0.5 rounded-full bg-gradient-to-tr from-light-primary via-story-rose to-accent">
      <div class="p-0.5 rounded-full ${dark ? "bg-dark-surface-container-lowest" : "bg-light-surface-container-lowest"}">${photo}</div>
    </div>
    <span class="font-body text-body-sm ${C.text} text-center leading-tight truncate w-16">${esc(label)}</span>`;
  return button;
}

async function loadStories() {
  const tray = document.querySelector('section[aria-label="Campus Stories"] .no-scrollbar');
  if (!tray) return;
  const own = tray.querySelector('[data-story-title="Add Campus Story"]');
  let rows = [];
  try { rows = await api.stories(); }
  catch (error) {
    if (/stories|schema cache/i.test(String(error?.message || ""))) console.warn("CampusPulse stories unavailable:", error.message);
    return;
  }
  tray.querySelectorAll("[data-story-id]").forEach((node) => node.remove());
  const nodes = (rows || []).map(storyButton);
  if (own && nodes.length) own.after(...nodes);
}

function openStoryModal({ author, caption, media, label }) {
  const modal = document.getElementById("story-modal");
  if (!modal) return;
  const set = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  set("story-modal-category", "Campus Story");
  set("story-modal-author", author || "CampusPulse");
  set("story-modal-title", label || author || "Campus story");
  set("story-modal-body", caption || "Shared a photo with your campus.");
  let mediaBox = document.getElementById("story-modal-media");
  if (!mediaBox) {
    mediaBox = document.createElement("div");
    mediaBox.id = "story-modal-media";
    mediaBox.className = "px-gutter-xl pb-gutter-xl";
    document.getElementById("story-modal-body")?.after(mediaBox);
  }
  mediaBox.innerHTML = media ? `<img src="${esc(media)}" alt="${esc(author || "Campus story")}" class="w-full rounded-lg object-cover max-h-[380px]">` : "";
  modal.classList.remove("hidden");
}

async function openStoryComposer() {
  let profile = null;
  try { profile = await api.myProfile(); } catch { /* the composer still works without an avatar */ }
  const overlay = modalShell("Add to your story", `
    <form data-story-form class="flex flex-col gap-gutter-md">
      <div class="flex items-center gap-gutter-md">
        ${avatarHtml(profile, "w-10 h-10")}
        <p class="font-body text-body-sm ${C.muted}">Visible to your college for 24 hours.</p>
      </div>
      <textarea name="caption" rows="3" maxlength="1000" aria-label="Story caption" placeholder="What's happening on campus?" class="w-full rounded-md border px-3 py-2 font-body text-body-md ${C.input}"></textarea>
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.text}">
        Photo (PNG or JPEG)
        <input type="file" name="photo" accept=".png,.jpg,.jpeg,image/png,image/jpeg" class="font-body text-body-sm ${C.muted}">
      </label>
      <button type="submit" class="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 font-label text-label-md ${C.primary}">Share story</button>
    </form>`);
  const form = overlay.querySelector("[data-story-form]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const file = form.photo.files && form.photo.files[0] ? form.photo.files[0] : null;
    await withBusy(button, "Sharing…", async () => {
      await api.createStory({ caption: form.caption.value, file });
      overlay.remove();
      toast("Story shared with your campus.");
      await loadStories();
    });
  });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
function applyProfileToPage(profile, email) {
  const identity = document.querySelector('section[aria-label="Student Identity"]');
  if (!identity) return;
  const heading = identity.querySelector("h1");
  if (heading && profile.full_name) heading.textContent = profile.full_name;
  const image = identity.querySelector("img");
  if (image && profile.avatar_url) { image.src = profile.avatar_url; image.alt = profile.full_name || "Profile photo"; }
  const emailLine = [...identity.querySelectorAll("p")].find((node) => /@/.test(node.textContent || ""));
  if (emailLine && email) emailLine.textContent = email;
  if (profile.bio) {
    let bio = identity.querySelector("[data-profile-bio]");
    if (!bio) {
      bio = document.createElement("p");
      bio.dataset.profileBio = "";
      bio.className = `font-body text-body-sm ${C.muted}`;
      (emailLine || heading)?.after(bio);
    }
    bio.textContent = profile.bio;
  }
}

function openProfileEditor(profile, email) {
  const overlay = modalShell("Edit profile", `
    <form data-profile-form class="flex flex-col gap-gutter-md">
      <div class="flex items-center gap-gutter-md">
        <img data-avatar-preview src="${esc(profile.avatar_url || "/brand/campus-logo-144-712f764a4b82.webp")}" alt="Profile photo preview" class="w-16 h-16 rounded-full object-cover border ${C.border}">
        <label class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-label text-label-md ${C.chip} ${C.hover} cursor-pointer">
          ${icon("photo_camera", "text-[18px]")}Change photo
          <input type="file" name="avatar" accept=".png,.jpg,.jpeg,image/png,image/jpeg" class="hidden">
        </label>
      </div>
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.text}">Full name
        <input name="fullName" value="${esc(profile.full_name || "")}" maxlength="160" required class="w-full rounded-md border px-3 py-2 font-body text-body-md ${C.input}">
      </label>
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.text}">Bio
        <textarea name="bio" rows="4" maxlength="2000" placeholder="Branch, year, interests, clubs…" class="w-full rounded-md border px-3 py-2 font-body text-body-md ${C.input}">${esc(profile.bio || "")}</textarea>
      </label>
      <label class="flex flex-col gap-gutter-xs font-label text-label-md ${C.muted}">Signed-in email
        <input value="${esc(email || "")}" disabled class="w-full rounded-md border px-3 py-2 font-body text-body-sm ${C.input} opacity-70">
      </label>
      <button type="submit" class="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 font-label text-label-md ${C.primary}">Save changes</button>
    </form>`);
  const form = overlay.querySelector("[data-profile-form]");
  const preview = form.querySelector("[data-avatar-preview]");
  form.avatar.addEventListener("change", () => {
    const file = form.avatar.files && form.avatar.files[0];
    if (file) preview.src = URL.createObjectURL(file);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const file = form.avatar.files && form.avatar.files[0] ? form.avatar.files[0] : null;
    await withBusy(button, "Saving…", async () => {
      const updated = await api.updateProfile({ fullName: form.fullName.value, bio: form.bio.value, avatarFile: file });
      applyProfileToPage(updated, email);
      overlay.remove();
      toast("Profile updated.");
    });
  });
}

function openDigitalId(profile, email) {
  modalShell("Digital student ID", `
    <div class="rounded-xl border p-gutter-lg flex flex-col gap-gutter-md ${C.inset}">
      <div class="flex items-center justify-between">
        <span class="font-headline text-headline-md ${C.text}">CampusPulse</span>
        <span class="font-mono text-mono-sm uppercase ${C.muted}">${esc(profile.role || "student")}</span>
      </div>
      <div class="flex items-center gap-gutter-md">
        ${avatarHtml(profile, "w-16 h-16")}
        <div class="min-w-0">
          <p class="font-title text-title-lg ${C.text}">${esc(profile.full_name || "CampusPulse member")}</p>
          <p class="font-body text-body-sm ${C.muted} break-all">${esc(email || "Signed-in account")}</p>
        </div>
      </div>
      <p class="font-body text-body-sm ${C.muted}">Valid for the current academic year. Show this card at campus gates and exam halls.</p>
    </div>`);
}

// ---------------------------------------------------------------------------
// Screen wiring
// ---------------------------------------------------------------------------
function wireGlobalControls() {
  document.querySelectorAll("#btn-messages").forEach((button) => {
    button.addEventListener("click", () => toast("Direct messages are not part of this build yet — use comments and clubs to connect."));
  });
  const notifications = document.getElementById("btn-notifications");
  if (notifications && !document.getElementById("notif-drawer")) {
    notifications.addEventListener("click", () => location.assign(`${dark ? "/dark" : ""}/feed?notifications=1`));
  }
}

function wireFeedEvents() {
  document.addEventListener("click", (event) => {
    const like = event.target.closest("[data-like]");
    if (like) { event.preventDefault(); toggleLike(like); return; }
    const save = event.target.closest("[data-save]");
    if (save) { event.preventDefault(); toggleSave(save); return; }
    const comment = event.target.closest("[data-comment-toggle]");
    if (comment) {
      const card = comment.closest("[data-post-id]");
      if (card) { event.preventDefault(); openComments(card); }
      return;
    }
    const share = event.target.closest("[data-share]");
    if (share) { event.preventDefault(); sharePost(share); return; }
    const chip = event.target.closest(".feed-filter-chip");
    if (chip) {
      const filter = chip.getAttribute("data-filter") || "all";
      document.querySelectorAll('section[aria-label="Campus Feed"] .feed-post').forEach((card) => {
        const categories = (card.getAttribute("data-category") || "").split(/\s+/);
        card.classList.toggle("hidden", filter !== "all" && !categories.includes(filter));
      });
    }
  });
  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-comment-form]");
    if (!form) return;
    event.preventDefault();
    addComment(form);
  });
  // Story tray clicks: live stories open the shared viewer, and "Your Story"
  // opens the composer instead of the archived sample-story modal.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".story-trigger");
    if (!trigger) return;
    if (trigger.dataset.storyId) {
      event.stopPropagation();
      openStoryModal({ author: trigger.dataset.storyAuthor, caption: trigger.dataset.storyCaption, media: trigger.dataset.storyMedia, label: trigger.dataset.storyLabel });
    } else if (trigger.dataset.storyTitle === "Add Campus Story") {
      event.stopPropagation();
      openStoryComposer();
    }
  }, true);
}

async function initFeed() {
  const { data, error } = await supabase.auth.getSession();
  if (error) { toast(friendly(error)); return; }
  if (!data?.session) return;
  let profile = null;
  try { profile = await api.myProfile(); } catch (profileError) { toast(friendly(profileError)); }
  const feedSection = document.querySelector('section[aria-label="Campus Feed"]');
  if (profile && feedSection?.parentElement) feedSection.parentElement.insertBefore(buildComposer(profile), feedSection);
  await Promise.all([loadFeed(), loadStories()]).catch((error) => toast(friendly(error)));
  if (new URLSearchParams(location.search).has("notifications")) document.getElementById("btn-notifications")?.click();
  wireFeedEvents();
}

async function initProfile() {
  let profile = null, email = "";
  try {
    const { data } = await supabase.auth.getUser();
    email = data?.user?.email || "";
    profile = await api.myProfile();
    applyProfileToPage(profile, email);
  } catch (error) { toast(friendly(error)); }
  const edit = document.getElementById("btn-edit-profile");
  edit?.addEventListener("click", () => (profile ? openProfileEditor(profile, email) : toast("Sign in to edit your profile.")));
  const digitalId = [...document.querySelectorAll("button")].find((button) => /digital id/i.test(button.textContent || ""));
  digitalId?.addEventListener("click", () => (profile ? openDigitalId(profile, email) : toast("Sign in to view your digital ID.")));
}

if (configured) {
  wireGlobalControls();
  if (isFeed) initFeed().catch((error) => toast(friendly(error)));
  if (isProfile) initProfile().catch((error) => toast(friendly(error)));
}
