import { api, portalUrls } from "/api.js";

const $ = (selector) => document.querySelector(selector);
const message = $("#auth-message");
const panels = [$("#panel-login"), $("#panel-signup"), $("#panel-reset")];
const tabs = [...document.querySelectorAll("[data-auth-tab]")];
const formLogin = $("#login-form");
const formSignup = $("#signup-form");
const roleSuccess = $("#role-success");

function announce(text, error = false) {
  if (!message) return;
  message.textContent = text;
  message.dataset.error = String(error);
}
function setTab(name) {
  const signup = name === "signup";
  tabs.forEach((tab) => {
    const active = tab.dataset.authTab === name;
    tab.setAttribute("aria-selected", String(active));
    document.getElementById(tab.getAttribute("aria-controls")).classList.toggle("is-hidden", !active);
  });
  $("#auth-title").textContent = signup ? "Create your account" : "Welcome back";
  $("#auth-subtitle").textContent = signup ? "Start with a student account. Your college community is next." : "Sign in with your CampusPulse email and password.";
  announce("");
}
function setBusy(button, busy, originalText) {
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  button.textContent = busy ? "Please wait…" : originalText;
}
async function roleAfterAuth(user) {
  const profile = await api.profile(user.id);
  const role = profile?.role;
  if (!["student", "faculty", "admin"].includes(role)) throw new Error("Your account profile has no valid CampusPulse role. Ask an administrator to check the profile setup.");
  return { role, name: profile.full_name || user.user_metadata?.full_name || "there" };
}
function showRoleConfirmation(role, name) {
  $("#panel-login").classList.add("is-hidden");
  $("#panel-signup").classList.add("is-hidden");
  document.querySelector(".auth-tabs").classList.add("is-hidden");
  $("#demo-box").classList.add("is-hidden");
  roleSuccess.classList.remove("is-hidden");
  $("#role-success-title").textContent = `You're in, ${name}.`;
  const copy = {
    student: "Your student account is ready. Continue to your CampusPulse feed.",
    faculty: "Your faculty role is verified. Open the separate faculty portal and sign in there; sessions are not shared between apps.",
    admin: "Your admin role is verified. Open the separate admin portal and sign in there; sessions are not shared between apps.",
  };
  $("#role-success-copy").textContent = copy[role];
  const continueLink = $("#role-continue");
  if (role === "student") {
    continueLink.href = "/feed";
    continueLink.classList.remove("is-hidden");
  } else {
    continueLink.classList.add("is-hidden");
  }
  const portalLink = $("#role-portal-link");
  if (role === "faculty" || role === "admin") {
    portalLink.href = role === "faculty" ? portalUrls.faculty : portalUrls.admin;
    portalLink.textContent = role === "faculty" ? "Open Faculty Portal ↗" : "Open Admin Portal ↗";
    portalLink.classList.remove("is-hidden");
  } else {
    portalLink.classList.add("is-hidden");
  }
}
async function finishSignIn(user) {
  try {
    const { role, name } = await roleAfterAuth(user);
    if (role === "student") {
      location.replace("/feed");
      return;
    }
    showRoleConfirmation(role, name);
  } catch (error) {
    announce(`You authenticated successfully, but your CampusPulse profile could not be loaded: ${error.message}. Check that migrations are applied.`, true);
  }
}

tabs.forEach((tab) => tab.addEventListener("click", () => setTab(tab.dataset.authTab)));
formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!formLogin.reportValidity()) return;
  const button = $("#login-submit");
  const original = "Log in to CampusPulse ↗";
  setBusy(button, true, original);
  try {
    const { data, error } = await api.signIn({ email: $("#login-identifier").value, password: $("#signin-password").value });
    if (error) throw error;
    if (!data.user) throw new Error("Sign-in did not return a user. Check your email-confirmation and password settings.");
    await finishSignIn(data.user);
  } catch (error) {
    announce(error.message || "Unable to sign in. Check the email and password, then try again.", true);
  } finally { setBusy(button, false, original); }
});
formSignup.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!formSignup.reportValidity()) return;
  const button = $("#signup-submit");
  const original = "Create student account ↗";
  setBusy(button, true, original);
  try {
    const { data, error } = await api.signUp({ email: $("#signup-email").value, password: $("#signup-password").value, fullName: $("#signup-name").value });
    if (error) throw error;
    if (data.session && data.user) await finishSignIn(data.user);
    else announce("Account created. Check your email for the confirmation link before signing in.");
  } catch (error) {
    announce(error.message || "Unable to create the account. Please try again.", true);
  } finally { setBusy(button, false, original); }
});
$("#login-password-toggle").addEventListener("click", (event) => {
  const input = $("#signin-password");
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  event.currentTarget.textContent = visible ? "Hide" : "Show";
  event.currentTarget.setAttribute("aria-label", visible ? "Hide password" : "Show password");
});
$("#login-forgot").addEventListener("click", async () => {
  const email = $("#login-identifier").value.trim();
  if (!email) { announce("Enter your email address first, then choose Forgot password?", true); $("#login-identifier").focus(); return; }
  try {
    const { error } = await api.resetPassword(email);
    if (error) throw error;
    announce("If this email belongs to an account, Supabase will send a password-reset link. Check your inbox.");
  } catch (error) { announce(error.message || "Could not request a password-reset email.", true); }
});
$("#reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  try {
    const { error } = await api.updatePassword($("#reset-password").value);
    if (error) throw error;
    announce("Password updated. You can now sign in with your new password.");
    $("#panel-reset").classList.add("is-hidden");
    $("#panel-login").classList.remove("is-hidden");
  } catch (error) { announce(error.message || "Could not update the password.", true); }
});
api.onAuth((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    panels.forEach((panel) => panel.classList.add("is-hidden"));
    $(".auth-tabs").classList.add("is-hidden");
    $("#demo-box").classList.add("is-hidden");
    $("#auth-title").classList.add("is-hidden");
    $("#auth-subtitle").classList.add("is-hidden");
    $("#panel-reset").classList.remove("is-hidden");
    announce("Choose a new password for your account.");
  } else if (event === "SIGNED_IN" && session?.user && !roleSuccess.classList.contains("is-hidden")) {
    document.documentElement.dataset.authenticated = "true";
  }
});
$("#role-signout").addEventListener("click", async () => {
  try {
    const { error } = await api.signOut();
    if (error) throw error;
    location.replace("/login");
  } catch (error) { announce(error.message || "Unable to sign out.", true); }
});

fetch("/api/demo-accounts", { cache: "no-store" }).then(async (response) => {
  if (!response.ok) return;
  const { accounts = [] } = await response.json();
  if (!accounts.length) return;
  const box = $("#demo-box");
  const list = $("#demo-list");
  box.classList.remove("is-hidden");
  accounts.forEach((account) => {
    const row = document.createElement("div");
    row.className = "demo-account";
    const details = document.createElement("div");
    const role = document.createElement("b");
    role.textContent = `${account.role[0].toUpperCase()}${account.role.slice(1)} demo`;
    const credentials = document.createElement("code");
    credentials.textContent = `${account.email} · ${account.password}`;
    details.append(role, credentials);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Use account";
    button.addEventListener("click", () => {
      setTab("login");
      $("#login-identifier").value = account.email;
      $("#signin-password").value = account.password;
      $("#signin-password").focus();
    });
    row.append(details, button);
    list.append(row);
  });
}).catch(() => {});
