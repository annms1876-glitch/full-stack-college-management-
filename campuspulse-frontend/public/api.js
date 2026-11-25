import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
let config = {};
try { const response = await fetch("/api/config", { cache: "no-store" }); if (response.ok) config = await response.json(); } catch {}
export const configured = Boolean(config.supabaseUrl && config.publishableKey);
export const supabase = configured ? createClient(config.supabaseUrl, config.publishableKey) : null;
const client = () => { if (!supabase) throw new Error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to enable backend features."); return supabase; };
const result = async (promise) => { const { data, error } = await promise; if (error) throw error; return data; };
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
};
export { result };
