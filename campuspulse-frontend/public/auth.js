import { createClient } from "/vendor/supabase-js.js";
import { createClerkSupabaseClient } from "/shared/auth/clerk-supabase.js";

const configKey = "campuspulse:runtime-config";
let config = {};
try { config = JSON.parse(sessionStorage.getItem(configKey) || "{}") || {}; } catch { config = {}; }
if (!config.clerkPublishableKey || !config.supabaseUrl || !config.publishableKey) {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (response.ok) config = await response.json();
    if (config.clerkPublishableKey && config.supabaseUrl && config.publishableKey) sessionStorage.setItem(configKey, JSON.stringify(config));
  } catch { config = {}; }
}

let clerk;
let supabase;
const clerkReady = (async () => {
  if (!config.clerkPublishableKey) throw new Error("Set CLERK_PUBLISHABLE_KEY to enable CampusPulse sign-in.");
  if (!window.Clerk) await new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"; script.async = true;
    script.onload = resolve; script.onerror = () => reject(new Error("Unable to load the CampusPulse sign-in service.")); document.head.append(script);
  });
  clerk = window.Clerk; await clerk.load({ publishableKey: config.clerkPublishableKey }); return clerk;
})();
export const configured = Boolean(config.clerkPublishableKey && config.supabaseUrl && config.publishableKey);
export const clerkSession = () => clerk?.session || null;
export async function getClerk() { return clerkReady; }
export async function getClerkUser() { const c = await clerkReady; return c.user || null; }
export async function getSupabase() { const c = await clerkReady; if (!c.session) throw new Error("Sign in to continue."); if (!supabase) supabase = createClerkSupabaseClient({ createClient, clerk: c, config }); return supabase; }
function authResult(data = null, error = null) { return { data, error }; }
function clerkErrorResult(error) { return authResult(null, error); }
function fullNameParts(fullName = "") { const parts = String(fullName).trim().split(/\s+/).filter(Boolean); return { firstName: parts.shift() || undefined, lastName: parts.join(" ") || undefined }; }
export async function signIn({ email, password }) { try { const c = await clerkReady; const result = await c.client.signIn.create({ identifier: String(email || "").trim().toLowerCase(), password }); if (result.status === "complete") await c.setActive({ session: result.createdSessionId }); return authResult({ user: c.user, session: c.session }); } catch (error) { return clerkErrorResult(error); } }
export async function signUp({ email, password, fullName = "" }) { try { const c = await clerkReady; const result = await c.client.signUp.create({ emailAddress: String(email || "").trim().toLowerCase(), password, ...fullNameParts(fullName) }); if (result.status === "complete") await c.setActive({ session: result.createdSessionId }); else if (result.verifications?.emailAddress?.status === "pending") await c.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" }); return authResult({ user: c.user, session: c.session, status: result.status }); } catch (error) { return clerkErrorResult(error); } }
let resetSignIn;
export async function resetPassword(email) { try { const c = await clerkReady; resetSignIn = c.client.signIn; await resetSignIn.create({ identifier: String(email || "").trim().toLowerCase() }); await resetSignIn.prepareFirstFactor({ strategy: "reset_password_email_code" }); return authResult({ pending: true }); } catch (error) { return clerkErrorResult(error); } }
export async function updatePassword(password, code) { try { if (!resetSignIn) throw new Error("Request a password-reset email first."); const result = await resetSignIn.attemptFirstFactor({ strategy: "reset_password_email_code", code: String(code || "").trim() }); await resetSignIn.resetPassword({ password }); if (result.createdSessionId) { const c = await clerkReady; await c.setActive({ session: result.createdSessionId }); } return authResult({ user: (await clerkReady).user }); } catch (error) { return clerkErrorResult(error); } }
export async function signOut() { try { await (await clerkReady).signOut(); return authResult(null); } catch (error) { return clerkErrorResult(error); } }
export async function session() { try { const c = await clerkReady; return authResult({ session: c.session ? { user: c.user } : null, user: c.user }); } catch (error) { return clerkErrorResult(error); } }
export function onAuth(callback) { clerkReady.then((c) => { callback(c.session ? "SIGNED_IN" : "SIGNED_OUT", c.session ? { user: c.user } : null); c.addListener(({ session: nextSession, user }) => callback(nextSession ? "SIGNED_IN" : "SIGNED_OUT", nextSession ? { user } : null)); }).catch((error) => callback("SIGNED_OUT", null, error)); return { data: { subscription: { unsubscribe() {} } } }; }
export { config };
