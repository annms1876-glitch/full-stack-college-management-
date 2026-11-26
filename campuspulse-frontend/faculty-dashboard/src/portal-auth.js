import { createClerkSupabaseClient } from '../../../shared/auth/clerk-supabase.js'

const sdkPromise = import('@supabase/supabase-js')
const CONFIG_KEY = 'campuspulse:faculty-runtime-config'
const DEMO_KEY = 'campuspulse:faculty-demo'
const AUTH_TIMEOUT_MS = 8000
const LOCAL_DEV_BYPASS = import.meta.env.DEV

function withTimeout(promise, message) {
  let timer
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS) })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function loadClerk(config) {
  if (!config.clerkPublishableKey) throw new Error('Set CLERK_PUBLISHABLE_KEY to enable CampusPulse sign-in.')
  if (!window.Clerk) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js'
      script.async = true
      script.onload = resolve
      script.onerror = () => reject(new Error('Unable to load the CampusPulse sign-in service.'))
      document.head.append(script)
    })
  }
  const clerk = window.Clerk
  await withTimeout(clerk.load({ publishableKey: config.clerkPublishableKey }), 'Secure sign-in setup timed out. Please retry.')
  return clerk
}

function authView(message = '') {
  const root = document.querySelector('#app')
  root.innerHTML = `<main class="portal-auth"><section class="portal-auth-card"><a class="portal-auth-brand" href="/">CampusPulse <span>Faculty Portal</span></a><p class="portal-auth-kicker">Faculty workspace</p><h1>Sign in to continue</h1><p class="portal-auth-copy">Use your faculty account. Access is checked against your trusted CampusPulse profile.</p><form id="portal-login-form" class="portal-auth-form"><label>Email address<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Sign in</button></form><div class="anonymous-demo-card"><p><strong>Just exploring?</strong> Open the faculty sample dashboard without an account.</p><button id="portal-anonymous-demo" class="anonymous-demo-button" type="button">Continue as anonymous demo</button><small>Local sample content only. No Supabase session, live records, or backend changes.</small></div><p id="portal-auth-message" class="portal-auth-message" role="status" aria-live="polite"></p><p class="portal-auth-help">Sign in with the faculty account provisioned in Clerk. Portal access is checked against the trusted CampusPulse profile.</p></section></main>`
  if (message) setMessage(message, true)
}

function setMessage(text, isError = false) {
  const message = document.querySelector('#portal-auth-message')
  if (!message) return
  message.textContent = text
  message.dataset.error = String(isError)
}

async function verifyRole(client, user, expectedRole) {
  const { data, error } = await client.from('profiles').select('id, full_name, role, college_id, bio').eq('clerk_user_id', user.id).single()
  if (error) throw new Error(`Could not verify your CampusPulse profile: ${error.message}. Confirm the Clerk identity mapping and profile provisioning.`)
  if (data?.role !== expectedRole) throw new Error(`This account has the ${data?.role || 'unassigned'} role. The faculty portal requires a faculty profile.`)
  return data
}

async function readConfig() {
  let config
  try {
    const cached = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || 'null')
    if (cached?.clerkPublishableKey && cached?.supabaseUrl && cached?.publishableKey) config = cached
  } catch { config = null }
  if (!config) {
    const response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) })
    if (!response.ok) throw new Error('Runtime authentication configuration endpoint is unavailable.')
    const payload = await response.json()
    if (!payload.clerkPublishableKey || !payload.supabaseUrl || !payload.publishableKey) throw new Error('Set CLERK_PUBLISHABLE_KEY, SUPABASE_URL, and SUPABASE_PUBLISHABLE_KEY in this portal process, then restart Vite.')
    config = { clerkPublishableKey: payload.clerkPublishableKey, supabaseUrl: payload.supabaseUrl, publishableKey: payload.publishableKey }
    try { sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config)) } catch { /* private mode */ }
  }
  return config
}

function userForPortal(user) {
  return { id: user.id, email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '' }
}

export async function startPortalAuth({ onAuthorized }) {
  authView()
  const enterDemo = () => {
    sessionStorage.setItem(DEMO_KEY, '1')
    onAuthorized({ user: { id: 'local-faculty-demo', email: 'anonymous-faculty@example.invalid' }, profile: { id: 'local-faculty-demo', full_name: 'Anonymous Faculty Demo', role: 'faculty' }, client: null, demo: true })
  }
  document.querySelector('#portal-anonymous-demo')?.addEventListener('click', enterDemo)
  if (sessionStorage.getItem(DEMO_KEY) === '1') { enterDemo(); return }
  if (LOCAL_DEV_BYPASS && new URLSearchParams(location.search).get('demo') === '1') { enterDemo(); return }

  let clerk = null
  let client = null
  const clientPromise = (async () => {
    const config = await readConfig()
    clerk = await loadClerk(config)
    const [{ createClient }] = await Promise.all([sdkPromise])
    if (clerk.session) {
      client = createClerkSupabaseClient({ createClient, clerk, config })
      const profile = await verifyRole(client, clerk.user, 'faculty')
      onAuthorized({ user: userForPortal(clerk.user), profile, client, clerk })
    }
    return { clerk, client }
  })()

  clientPromise.catch((error) => {
    if (LOCAL_DEV_BYPASS && /configuration|CLERK_PUBLISHABLE_KEY|SUPABASE_URL/i.test(error.message || '')) { enterDemo(); return }
    authView(error.message || 'Authentication setup failed.')
    setMessage(error.message || 'Authentication setup failed.', true)
    document.querySelector('#portal-anonymous-demo')?.addEventListener('click', enterDemo)
    wireForm()
  })

  function wireForm() {
    const form = document.querySelector('#portal-login-form')
    if (!form) return
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (!form.reportValidity()) return
      const button = form.querySelector('button[type="submit"]')
      button.disabled = true
      button.textContent = 'Checking…'
      setMessage('')
      try {
        const { clerk: activeClerk, client: activeClient } = await clientPromise
        const formData = new FormData(form)
        const result = await activeClerk.client.signIn.create({ identifier: String(formData.get('email')).trim().toLowerCase(), password: String(formData.get('password')) })
        if (result.status !== 'complete' || !result.createdSessionId) throw new Error('Clerk could not complete sign-in. Check the account and try again.')
        await activeClerk.setActive({ session: result.createdSessionId })
        const signedInClient = activeClient || createClerkSupabaseClient({ createClient: (await sdkPromise).createClient, clerk: activeClerk, config: await readConfig() })
        const profile = await verifyRole(signedInClient, activeClerk.user, 'faculty')
        onAuthorized({ user: userForPortal(activeClerk.user), profile, client: signedInClient, clerk: activeClerk })
      } catch (error) {
        setMessage(error.message || 'Unable to sign in. Check the account and try again.', true)
      } finally {
        button.disabled = false
        button.textContent = 'Sign in'
      }
    })
  }
  wireForm()
}
