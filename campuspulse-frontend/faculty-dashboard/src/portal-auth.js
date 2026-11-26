import { createClient } from '@supabase/supabase-js';

const CONFIG_KEY = 'campuspulse:portal-config';
const DEMO_KEY = 'campuspulse:faculty-demo';
const AUTH_TIMEOUT_MS = 8000;
const LOCAL_DEV_BYPASS = import.meta.env.DEV;

function withTimeout(promise, message) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function authView(message = '') {
  const root = document.querySelector('#app');
  root.innerHTML = `<main class="portal-auth"><section class="portal-auth-card"><a class="portal-auth-brand" href="/">CampusPulse <span>Faculty Portal</span></a><p class="portal-auth-kicker">Faculty workspace</p><h1>Sign in to continue</h1><p class="portal-auth-copy">Use your faculty account. Access is checked against your trusted CampusPulse profile.</p><form id="portal-login-form" class="portal-auth-form"><label>Email address<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Sign in</button></form><div class="anonymous-demo-card"><p><strong>Just exploring?</strong> Open the faculty sample dashboard without an account.</p><button id="portal-anonymous-demo" class="anonymous-demo-button" type="button">Continue as anonymous demo</button><small>Local sample content only. No Supabase session, live records, or backend changes.</small></div><p id="portal-auth-message" class="portal-auth-message" role="status" aria-live="polite"></p><p class="portal-auth-help">For local testing, seed the local Supabase instance and use the faculty credentials listed in the repository README. Portal access is still checked against the role stored in your trusted CampusPulse profile.</p></section></main>`;
  if (message) setMessage(message, true);
}

function setMessage(text, isError = false) {
  const message = document.querySelector('#portal-auth-message');
  if (!message) return;
  message.textContent = text;
  message.dataset.error = String(isError);
}

async function verifyRole(client, user, expectedRole) {
  const { data, error } = await client.from('profiles').select('id, full_name, role, college_id, bio').eq('id', user.id).single();
  if (error) throw new Error(`Could not verify your CampusPulse profile: ${error.message}. Confirm migrations are applied and the account is provisioned.`);
  if (data?.role !== expectedRole) throw new Error(`This account has the ${data?.role || 'unassigned'} role. The faculty portal requires a faculty profile.`);
  return data;
}

export async function startPortalAuth({ onAuthorized }) {
  authView();
  const enterDemo = () => {
    sessionStorage.setItem(DEMO_KEY, '1');
    onAuthorized({ user: { id: 'local-faculty-demo', email: 'anonymous-faculty@example.invalid' }, profile: { id: 'local-faculty-demo', full_name: 'Anonymous Faculty Demo', role: 'faculty' }, client: null, demo: true });
  };
  document.querySelector('#portal-anonymous-demo')?.addEventListener('click', enterDemo);
  if (sessionStorage.getItem(DEMO_KEY) === '1') {
    enterDemo();
    return;
  }
  // The anonymous demo is an explicit opt-in during local development so a
  // seeded local Supabase session can still sign in normally.
  if (LOCAL_DEV_BYPASS && new URLSearchParams(location.search).get('demo') === '1') {
    enterDemo();
    return;
  }

  // The login form is usable straight away: the runtime config, the Supabase
  // client and the session check load alongside it instead of blocking first paint.
  let activeClient = null;
  const clientPromise = (async () => {
    let config;
    try {
      const cached = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || 'null');
      if (cached && cached.supabaseUrl && cached.publishableKey) config = cached;
    } catch { config = null; }
    if (!config) {
      const response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) });
      if (!response.ok) throw new Error('Runtime Supabase configuration endpoint is unavailable.');
      const payload = await response.json();
      if (!payload.supabaseUrl || !payload.publishableKey) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in this portal process, then restart Vite.');
      config = { supabaseUrl: payload.supabaseUrl, publishableKey: payload.publishableKey };
      try { sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch { /* private mode */ }
    }
    const client = createClient(config.supabaseUrl, config.publishableKey);
    activeClient = client;
    const { data: { session }, error } = await withTimeout(client.auth.getSession(), 'Secure session restore timed out. Please retry sign-in.');
    if (error) throw error;
    if (session && session.user) {
      const profile = await verifyRole(client, session.user, 'faculty');
      onAuthorized({ user: session.user, profile, client });
    }
    return client;
  })();
  clientPromise.catch((error) => {
    if (LOCAL_DEV_BYPASS && (!activeClient || /configuration|SUPABASE_URL/i.test(error.message || ''))) {
      enterDemo();
      return;
    }
    authView(error.message || 'Authentication setup failed.');
    setMessage(error.message || 'Authentication setup failed.', true);
    document.querySelector('#portal-anonymous-demo')?.addEventListener('click', enterDemo);
    wireForm();
  });

  function wireForm() {
    const form = document.querySelector('#portal-login-form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Checking…';
      setMessage('');
      let client = null;
      try {
        client = await clientPromise;
        const formData = new FormData(form);
        const { data, error } = await client.auth.signInWithPassword({ email: String(formData.get('email')).trim().toLowerCase(), password: String(formData.get('password')) });
        if (error) throw error;
        if (!data.user) throw new Error('Supabase did not return an authenticated user.');
        const profile = await verifyRole(client, data.user, 'faculty');
        onAuthorized({ user: data.user, profile, client });
      } catch (error) {
        if (client) await client.auth.signOut().catch(() => {});
        setMessage(error.message || 'Unable to sign in. Check the account and try again.', true);
      } finally {
        button.disabled = false;
        button.textContent = 'Sign in';
      }
    });
  }
  wireForm();
}
