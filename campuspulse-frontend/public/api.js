import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateUploadFile, UPLOAD_ALLOWLIST } from "/file-signature.js";
let config = {};
try { const response = await fetch("/api/config", { cache: "no-store" }); if (response.ok) config = await response.json(); } catch {}
export const configured = Boolean(config.supabaseUrl && config.publishableKey);
export const supabase = configured ? createClient(config.supabaseUrl, config.publishableKey) : null;
const client = () => { if (!supabase) throw new Error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to enable backend features."); return supabase; };
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
    if (error) throw new Error(data?.error || error.message || "Could not create a download link.");
    if (data?.error) throw new Error(data.error);
    return data;
  },
  openSignedUrl: async (bucket, path) => { const { signedUrl } = await api.signedUrl(bucket, path); window.open(signedUrl, "_blank", "noopener,noreferrer"); return signedUrl; },
  uploadLimits: () => ({ mime: [...UPLOAD_ALLOWLIST], maxBytes: 26214400 }),
};
export { result, currentUser };
