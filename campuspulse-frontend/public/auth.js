// Optional Supabase Auth client helper. This module is intentionally not imported
// by app.js; UI wiring remains a separate task. Provide runtime config through
// window.CAMPUSPULSE_SUPABASE_CONFIG or window.CAMPUSPULSE_ENV before importing.
import { createClient } from "/vendor/supabase-js.js";

const config = globalThis.CAMPUSPULSE_SUPABASE_CONFIG || globalThis.CAMPUSPULSE_ENV || {};
const supabaseUrl = config.supabaseUrl || config.SUPABASE_URL;
const publishableKey = config.publishableKey || config.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error("CampusPulse Supabase runtime config requires supabaseUrl and publishableKey");
}
if (typeof supabaseUrl !== "string" || typeof publishableKey !== "string") {
  throw new TypeError("CampusPulse Supabase runtime config values must be strings");
}

const supabase = createClient(supabaseUrl, publishableKey);

/** Create a student account; never send a role claim. collegeId is optional and
 * is verified against email domain by the auth.users database trigger. */
export function signUp({ email, password, fullName = "", collegeId = null }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const options = { data: { full_name: String(fullName).trim().slice(0, 160) } };
  if (collegeId !== null && collegeId !== undefined && String(collegeId).trim()) {
    options.data.college_id = String(collegeId).trim();
  }
  return supabase.auth.signUp({ email: normalizedEmail, password, options });
}

export function signInWithPassword({ email, password }) {
  return supabase.auth.signInWithPassword({ email: String(email || "").trim().toLowerCase(), password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback) {
  if (typeof callback !== "function") throw new TypeError("callback must be a function");
  return supabase.auth.onAuthStateChange(callback);
}
