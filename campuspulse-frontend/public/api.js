import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateUploadFile, UPLOAD_ALLOWLIST } from "/file-signature.js";
let config = {};
try { const response = await fetch("/api/config", { cache: "no-store" }); if (response.ok) config = await response.json(); } catch {}
export const configured = Boolean(config.supabaseUrl && config.publishableKey);
export const supabase = configured ? createClient(config.supabaseUrl, config.publishableKey) : null;
const client = () => { if (!supabase) throw new Error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to enable backend features."); return supabase; };
const storageBase = String(config.supabaseUrl || "").replace(/\/+$/, "");
const storagePublicUrl = (bucket, path) => `${storageBase}/storage/v1/object/public/${bucket}/${String(path || "").split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
const missingStorageMessage = (bucket) => new Error(`Uploads need the "${bucket}" storage bucket. Run supabase/migrations/202611260011_study_hub_and_campus_uploads.sql in the Supabase SQL editor, then reload.`);
const result = async (promise) => { const { data, error } = await promise; if (error) throw error; return data; };
const currentUser = async () => { const { data, error } = await client().auth.getUser(); if (error) throw error; if (!data.user) throw new Error("Sign in to continue."); return data.user; };
const safeName = (name) => String(name || "upload").replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\./g, "_").slice(0, 180) || "upload";
const extensionOf = (name) => (safeName(name).match(/\.([A-Za-z0-9]{1,10})$/) || [, "bin"])[1].toLowerCase();
export const api = {
  signUp: ({ email, password, fullName, collegeId }) => client().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: (fullName || "").trim().slice(0, 160), ...(collegeId ? { college_id: collegeId } : {}) } } }),
  signIn: ({ email, password }) => client().auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),
  resetPassword: (email) => client().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${location.origin}/login` }),
  updatePassword: (password) => client().auth.updateUser({ password }),
  signOut: () => client().auth.signOut(), session: () => client().auth.getSession(), onAuth: (cb) => configured ? supabase.auth.onAuthStateChange(cb) : { data: { subscription: { unsubscribe() {} } } },
  profile: async (id) => result(client().from("profiles").select("*").eq("id", id).single()),
  feed: async () => result(client().from("posts").select("*,author:profiles!posts_author_id_fkey(id,full_name,avatar_url)").order("created_at", { ascending: false }).limit(30)),
  clubs: async () => result(client().from("clubs").select("*,owner:profiles!clubs_owner_id_fkey(id,full_name,avatar_url),club_members(user_id,role)").order("name")),
  faculty: async () => result(client().from("profiles").select("id,full_name,avatar_url,bio,role").eq("role", "faculty").order("full_name")),
  like: async (postId, enabled) => { const c=client(), { data: { user } } = await c.auth.getUser(); if (!user) throw new Error("Sign in to like posts."); return result(enabled ? c.from("likes").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true }) : c.from("likes").delete().match({ post_id: postId, user_id: user.id })); },
  save: async (postId, enabled) => { const c=client(), { data: { user } } = await c.auth.getUser(); if (!user) throw new Error("Sign in to save posts."); return result(enabled ? c.from("saved_posts").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true }) : c.from("saved_posts").delete().match({ post_id: postId, user_id: user.id })); },
  joinClub: async (clubId, joining) => { const c=client(), { data: { user } } = await c.auth.getUser(); if (!user) throw new Error("Sign in to join a club."); return result(joining ? c.from("club_members").upsert({ club_id: clubId, user_id: user.id, role: "member" }, { onConflict: "club_id,user_id", ignoreDuplicates: true }) : c.from("club_members").delete().match({ club_id: clubId, user_id: user.id })); },
  rsvp: async (eventId, status = "going") => { const c=client(), { data: { user } } = await c.auth.getUser(); if (!user) throw new Error("Sign in to RSVP."); return result(c.from("event_rsvps").upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: "event_id,user_id" })); },
  events: async (limit = 30) => result(client().from("events")
    .select("id,title,description,starts_at,ends_at,location,capacity,club:clubs!events_club_id_fkey(id,name)")
    .gte("starts_at", new Date(Date.now() - 2 * 864e5).toISOString())
    .order("starts_at", { ascending: true }).limit(Math.min(50, Math.max(1, limit)))),
  myRsvps: async () => result(client().from("event_rsvps")
    .select("event_id,status,event:events!event_rsvps_event_id_fkey(id,title,starts_at,ends_at,location)")),
  unrsvp: async (eventId) => { const c = client(), user = await currentUser(); return result(c.from("event_rsvps").delete().match({ event_id: eventId, user_id: user.id })); },

  // ---- Live coursework reads (RLS scopes every row to this student) ----
  notices: async (limit = 20) => result(client().from("notices").select("id,title,body,audience,published_at,author:profiles!notices_author_id_fkey(id,full_name)").order("published_at", { ascending: false }).limit(Math.min(50, Math.max(1, limit)))),
  myCourses: async () => {
    const c = client(), user = await currentUser();
    const rows = await result(c.from("course_enrollments")
      .select("status,enrolled_at,course:courses!course_enrollments_course_id_fkey(id,code,title,term,faculty:profiles!courses_faculty_id_fkey(id,full_name))")
      .eq("student_id", user.id).eq("status", "active"));
    return (rows || []).filter((row) => row.course).sort((a, b) => String(a.course.code).localeCompare(String(b.course.code)));
  },
  assignments: async () => {
    const c = client();
    const enrollments = await api.myCourses();
    const courseIds = enrollments.map((row) => row.course.id);
    if (!courseIds.length) return [];
    return result(c.from("assignments").select("id,course_id,title,description,due_at,max_points,allow_late,created_at,course:courses(id,code,title,term)").in("course_id", courseIds).order("due_at", { ascending: true }));
  },
  mySubmissions: async () => {
    const c = client(), user = await currentUser();
    return result(c.from("assignment_submissions").select("id,assignment_id,file_path,file_name,file_size,mime_type,submitted_at,status,grade,feedback").eq("student_id", user.id).order("submitted_at", { ascending: false }));
  },
  /** Upload coursework to the private assignments bucket, then record the row. */
  submitAssignment: async ({ assignment, courseId, file }) => {
    const c = client(), user = await currentUser();
    const checked = await validateUploadFile(file);
    if (!checked.ok) throw new Error(checked.message);
    const path = `assignments/${courseId}/${assignment.id}/${user.id}/${crypto.randomUUID()}.${extensionOf(file.name)}`;
    const up = await c.storage.from("assignments").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) throw up.error;
    const row = await c.from("assignment_submissions").insert({ assignment_id: assignment.id, student_id: user.id, file_path: path, file_name: safeName(file.name).slice(0, 255), file_size: file.size, mime_type: file.type }).select("id,assignment_id,file_path,file_name,file_size,mime_type,submitted_at,status,grade,feedback").single();
    if (row.error) throw new Error(`${row.error.message} (the uploaded object stays private and unreferenced)`);
    return row.data;
  },
  /** Short-lived, RLS-checked, magic-byte-verified download URL from Edge code. */
  signedUrl: async (bucket, path) => {
    await currentUser();
    const { data, error } = await client().functions.invoke("get-signed-url", { body: { bucket, path } });
    if (error) {
      // Surface the function's own 403/422 message instead of the generic non-2xx text.
      let message = data?.error || error.message || "Could not create a download link.";
      try { const body = await error.context?.json?.(); if (body?.error) message = body.error; } catch {}
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },
  openSignedUrl: async (bucket, path) => { const { signedUrl } = await api.signedUrl(bucket, path); window.open(signedUrl, "_blank", "noopener,noreferrer"); return signedUrl; },
  // ---- Student social feed, stories and self-service profile ----
  myProfile: async () => { const user = await currentUser(); return result(client().from("profiles").select("id,full_name,avatar_url,bio,role,college_id").eq("id", user.id).single()); },
  feedPosts: async (limit = 30) => result(client().from("posts")
    .select("id,body,media_urls,visibility,created_at,author:profiles!posts_author_id_fkey(id,full_name,avatar_url,role),likes(count),comments(count)")
    .order("created_at", { ascending: false }).limit(Math.min(50, Math.max(1, limit)))),
  myLikes: async () => { const user = await currentUser(); return result(client().from("likes").select("post_id").eq("user_id", user.id)); },
  mySaves: async () => { const user = await currentUser(); return result(client().from("saved_posts").select("post_id").eq("user_id", user.id)); },
  commentsFor: async (postId) => result(client().from("comments")
    .select("id,body,created_at,author:profiles!comments_author_id_fkey(id,full_name,avatar_url)")
    .eq("post_id", postId).order("created_at", { ascending: true }).limit(50)),
  addComment: async (postId, body) => {
    const c = client(), user = await currentUser(), text = String(body || "").trim();
    if (!text) throw new Error("Write a comment first.");
    return result(c.from("comments").insert({ post_id: postId, author_id: user.id, body: text.slice(0, 5000) })
      .select("id,body,created_at,author:profiles!comments_author_id_fkey(id,full_name,avatar_url)").single());
  },
  /** Create a post, upload any attachments to campus-uploads, then link them. */
  createPost: async ({ body, visibility = "college", files = [] }) => {
    const c = client(), user = await currentUser(), text = String(body || "").trim();
    const picked = Array.from(files || []).slice(0, 10);
    if (!text && !picked.length) throw new Error("Write something or attach a file first.");
    const profile = await result(c.from("profiles").select("college_id").eq("id", user.id).single());
    if (!profile?.college_id) throw new Error("Your profile has no college linked yet, so posts cannot be created. Ask a college administrator to set your college.");
    const created = await result(c.from("posts")
      .insert({ author_id: user.id, college_id: profile.college_id, body: text, visibility, media_urls: [] })
      .select("id,created_at").single());
    if (!picked.length) return created;
    const urls = [];
    try {
      for (const file of picked) {
        const checked = await validateUploadFile(file);
        if (!checked.ok) throw new Error(checked.message);
        const path = `${user.id}/posts/${crypto.randomUUID()}-${safeName(file.name).slice(0, 150)}`;
        const up = await c.storage.from("campus-uploads").upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw /bucket/i.test(up.error.message || "") ? missingStorageMessage("campus-uploads") : up.error;
        urls.push(storagePublicUrl("campus-uploads", path));
      }
      return await result(c.from("posts").update({ media_urls: urls }).eq("id", created.id).select("id,created_at").single());
    } catch (error) {
      await c.from("posts").delete().eq("id", created.id);
      throw error;
    }
  },
  deletePost: async (postId) => { const user = await currentUser(); return result(client().from("posts").delete().match({ id: postId, author_id: user.id })); },
  stories: async () => result(client().from("stories")
    .select("id,caption,media_path,media_type,created_at,expires_at,author:profiles!stories_author_id_fkey(id,full_name,avatar_url)")
    .order("created_at", { ascending: false }).limit(40)),
  createStory: async ({ caption, file }) => {
    const c = client(), user = await currentUser(), text = String(caption || "").trim();
    if (!text && !file) throw new Error("Add a caption or a photo first.");
    if (file && !["image/png", "image/jpeg"].includes(file.type)) throw new Error("Story photos must be PNG or JPEG.");
    if (file && file.size > 26214400) throw new Error("Story photos must be 25 MiB or smaller.");
    const profile = await result(c.from("profiles").select("college_id").eq("id", user.id).single());
    if (!profile?.college_id) throw new Error("Your profile has no college linked yet, so stories cannot be created. Ask a college administrator to set your college.");
    let mediaPath = null, mediaType = null;
    if (file) {
      mediaPath = `${user.id}/stories/${crypto.randomUUID()}.${extensionOf(file.name)}`;
      const up = await c.storage.from("campus-uploads").upload(mediaPath, file, { contentType: file.type, upsert: false });
      if (up.error) throw /bucket/i.test(up.error.message || "") ? missingStorageMessage("campus-uploads") : up.error;
      mediaType = file.type;
    }
    return result(c.from("stories")
      .insert({ author_id: user.id, college_id: profile.college_id, caption: text.slice(0, 1000), media_path: mediaPath, media_type: mediaType })
      .select("id,caption,media_path,media_type,created_at,expires_at").single());
  },
  deleteStory: async (storyId) => { const user = await currentUser(); return result(client().from("stories").delete().match({ id: storyId, author_id: user.id })); },
  /** Update the columns RLS allows a student to edit, plus an optional avatar. */
  updateProfile: async ({ fullName, bio, avatarFile }) => {
    const c = client(), user = await currentUser(), patch = {};
    if (typeof fullName === "string") {
      const name = fullName.trim();
      if (!name) throw new Error("Your name cannot be empty.");
      patch.full_name = name.slice(0, 160);
    }
    if (typeof bio === "string") {
      if (bio.length > 2000) throw new Error("Your bio must be 2000 characters or fewer.");
      patch.bio = bio.trim();
    }
    if (avatarFile) {
      if (!["image/png", "image/jpeg"].includes(avatarFile.type)) throw new Error("Profile photos must be PNG or JPEG.");
      const checked = await validateUploadFile(avatarFile);
      if (!checked.ok) throw new Error(checked.message);
      const path = `${user.id}/avatar-${Date.now()}.${extensionOf(avatarFile.name)}`;
      const up = await c.storage.from("avatars").upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
      if (up.error) throw /bucket/i.test(up.error.message || "") ? missingStorageMessage("avatars") : up.error;
      patch.avatar_url = storagePublicUrl("avatars", path);
    }
    if (!Object.keys(patch).length) throw new Error("Nothing to update.");
    return result(c.from("profiles").update(patch).eq("id", user.id).select("id,full_name,avatar_url,bio,role,college_id").single());
  },
  // ---- Study hub: peer doubts, votes and shared study files ----
  doubts: async (limit = 30) => result(client().from("doubts")
    .select("id,title,body,category,anonymous,attachment_url,attachment_name,created_at,author:profiles!doubts_author_id_fkey(id,full_name,avatar_url),doubt_votes(user_id),doubt_answers(id,body,created_at,author:profiles!doubt_answers_author_id_fkey(id,full_name,avatar_url))")
    .order("created_at", { ascending: false }).limit(Math.min(50, Math.max(1, limit)))),
  addDoubtAnswer: async (doubtId, body) => {
    const c = client(), user = await currentUser(), text = String(body || "").trim();
    if (!text) throw new Error("Write your solution first.");
    return result(c.from("doubt_answers").insert({ doubt_id: doubtId, author_id: user.id, body: text.slice(0, 3000) })
      .select("id,body,created_at,author:profiles!doubt_answers_author_id_fkey(id,full_name,avatar_url)").single());
  },
  addDoubt: async ({ title, body, category, anonymous, file }) => {
    const c = client(), user = await currentUser(), cleanTitle = String(title || "").trim();
    if (!cleanTitle) throw new Error("Write a short question title first.");
    const profile = await result(c.from("profiles").select("college_id").eq("id", user.id).single());
    if (!profile?.college_id) throw new Error("Your profile has no college linked yet, so questions cannot be posted. Ask a college administrator to set your college.");
    let attachmentUrl = null, attachmentName = null;
    if (file) {
      const checked = await validateUploadFile(file);
      if (!checked.ok) throw new Error(checked.message);
      const path = `${user.id}/notes/${crypto.randomUUID()}-${safeName(file.name).slice(0, 150)}`;
      const up = await c.storage.from("campus-uploads").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw /bucket/i.test(up.error.message || "") ? missingStorageMessage("campus-uploads") : up.error;
      attachmentUrl = storagePublicUrl("campus-uploads", path);
      attachmentName = safeName(file.name);
    }
    return result(c.from("doubts").insert({
      author_id: user.id, college_id: profile.college_id, title: cleanTitle.slice(0, 200),
      body: String(body || "").trim().slice(0, 5000),
      category: String(category || "General").slice(0, 60),
      anonymous: Boolean(anonymous), attachment_url: attachmentUrl, attachment_name: attachmentName,
    }).select("id,title,body,category,anonymous,attachment_url,attachment_name,created_at").single());
  },
  voteDoubt: async (doubtId, enabled) => {
    const user = await currentUser(), c = client();
    return result(enabled
      ? c.from("doubt_votes").upsert({ doubt_id: doubtId, user_id: user.id }, { onConflict: "doubt_id,user_id", ignoreDuplicates: true })
      : c.from("doubt_votes").delete().match({ doubt_id: doubtId, user_id: user.id }));
  },
  studyResources: async (category) => {
    let query = client().from("study_resources")
      .select("id,title,description,category,course_code,file_path,file_name,file_size,mime_type,created_at,uploader:profiles!study_resources_uploader_id_fkey(id,full_name)")
      .order("created_at", { ascending: false }).limit(60);
    if (category) query = query.eq("category", category);
    return result(query);
  },
  addStudyResource: async ({ title, description, category, courseCode, file }) => {
    const c = client(), user = await currentUser(), cleanTitle = String(title || "").trim();
    if (!cleanTitle) throw new Error("Give this material a title.");
    if (!file) throw new Error("Choose a file to upload.");
    const checked = await validateUploadFile(file);
    if (!checked.ok) throw new Error(checked.message);
    const profile = await result(c.from("profiles").select("college_id").eq("id", user.id).single());
    if (!profile?.college_id) throw new Error("Your profile has no college linked yet, so files cannot be uploaded. Ask a college administrator to set your college.");
    const path = `${user.id}/notes/${crypto.randomUUID()}-${safeName(file.name).slice(0, 150)}`;
    const up = await c.storage.from("campus-uploads").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) throw /bucket/i.test(up.error.message || "") ? missingStorageMessage("campus-uploads") : up.error;
    const allowed = ["notes", "summary", "elibrary", "paper"];
    return result(c.from("study_resources").insert({
      uploader_id: user.id, college_id: profile.college_id,
      title: cleanTitle.slice(0, 200),
      description: String(description || "").trim().slice(0, 2000),
      category: allowed.includes(category) ? category : "notes",
      course_code: String(courseCode || "").trim().slice(0, 40),
      file_path: path, file_name: safeName(file.name).slice(0, 255),
      file_size: file.size, mime_type: file.type,
    }).select("id,title,description,category,course_code,file_path,file_name,file_size,mime_type,created_at").single());
  },
  deleteStudyResource: async (id) => { const user = await currentUser(); return result(client().from("study_resources").delete().match({ id, uploader_id: user.id })); },
  storagePublicUrl,
  uploadLimits: () => ({ mime: [...UPLOAD_ALLOWLIST], maxBytes: 26214400 }),
};
export { result, currentUser, storagePublicUrl };
