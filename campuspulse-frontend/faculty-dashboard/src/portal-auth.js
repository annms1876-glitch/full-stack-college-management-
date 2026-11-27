import { createClerkSupabaseClient } from '../../../shared/auth/clerk-supabase.js'

const sdkPromise = import('@supabase/supabase-js')
const CONFIG_KEY = 'campuspulse:faculty-runtime-config'
const DEMO_KEY = 'campuspulse:faculty-demo'
const AUTH_TIMEOUT_MS = 8000
const AUTH_TIMEOUT_SECONDS = AUTH_TIMEOUT_MS / 1000
// Demo is opt-in by query string, so a production preview can be reviewed without
// credentials. The demo session has no Supabase client and every write is gated by
// `live()`. Normal visits still use Clerk/Supabase authentication.
const LOCAL_DEV_BYPASS = import.meta.env.DEV || new URLSearchParams(location.search).get('demo') === '1'

function timeoutError(message) {
  const error = new Error(message)
  error.name = 'TimeoutError'
  return error
}

function withTimeout(promise, message) {
  let timer
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(timeoutError(message)), AUTH_TIMEOUT_MS) })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Show what actually broke: a wrong password, a stalled Supabase project and a
// profile row that is not linked to Clerk must not look the same on screen.
function describeError(error) {
  if (!error) return 'no error details were returned'
  if (error.name === 'TimeoutError') return error.message
  if (Array.isArray(error.errors) && error.errors.length) {
    return error.errors
      .map(({ message, longMessage, code }) => [longMessage || message, code ? `code ${code}` : ''].filter(Boolean).join(' ') || 'unknown Clerk error')
      .join('; ')
  }
  const message = error.message || String(error)
  const extra = []
  if (error.code) extra.push(`code ${error.code}`)
  if (error.details) extra.push(String(error.details))
  if (error.hint) extra.push(`hint: ${error.hint}`)
  return extra.length ? `${message} (${extra.join(', ')})` : message
}

async function loadClerk(config) {
  if (!config.clerkPublishableKey) throw new Error('Set CLERK_PUBLISHABLE_KEY to enable CampusPulse sign-in.')
  if (!window.Clerk) {
    await withTimeout(new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js'
      script.async = true
      script.onload = resolve
      script.onerror = () => reject(new Error('Unable to load the CampusPulse sign-in service from cdn.jsdelivr.net.'))
      document.head.append(script)
    }), `The sign-in service did not load within ${AUTH_TIMEOUT_SECONDS}s. Your network may be blocking cdn.jsdelivr.net.`)
  }
  const clerk = window.Clerk
  await withTimeout(clerk.load({ publishableKey: config.clerkPublishableKey }), `Secure sign-in setup timed out after ${AUTH_TIMEOUT_SECONDS}s. Check the Clerk publishable key and retry.`)
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
  let result
  try {
    result = await withTimeout(
      client.from('profiles').select('id, full_name, role, college_id, bio').eq('clerk_user_id', user.id).single(),
      `Profile check timed out after ${AUTH_TIMEOUT_SECONDS}s: Supabase did not answer the profiles request. Check the deployed SUPABASE_URL and publishable key, and that the project is not paused.`,
    )
  } catch (error) {
    throw error?.name === 'TimeoutError' ? error : new Error(`Could not run the CampusPulse profile check: ${describeError(error)}.`)
  }
  const { data, error } = result
  if (error) throw new Error(`Could not verify your CampusPulse profile: ${describeError(error)}. Confirm the Clerk identity mapping and profile provisioning.`)
  if (!data) throw new Error('No CampusPulse profile is linked to this Clerk account. Confirm profiles.clerk_user_id is populated by the Clerk identity migration.')
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
    let response
    try {
      response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) })
    } catch (error) {
      throw new Error(`Runtime configuration did not load within ${AUTH_TIMEOUT_SECONDS}s (${describeError(error)}). Check that this deployment serves /api/config.`)
    }
    if (!response.ok) throw new Error(`The runtime authentication configuration endpoint returned HTTP ${response.status}.`)
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
    const [{ createClient }] = await withTimeout(
      Promise.all([sdkPromise]),
      `The Supabase browser bundle did not finish loading within ${AUTH_TIMEOUT_SECONDS}s. Reload the page; if this repeats, the deployed build is missing an asset.`,
    )
    if (clerk.session) {
      client = createClerkSupabaseClient({ createClient, clerk, config })
      const profile = await verifyRole(client, clerk.user, 'faculty')
      onAuthorized({ user: userForPortal(clerk.user), profile, client, clerk })
    }
    return { clerk, client }
  })()

  clientPromise.catch((error) => {
    if (LOCAL_DEV_BYPASS && /configuration|CLERK_PUBLISHABLE_KEY|SUPABASE_URL/i.test(error.message || '')) { enterDemo(); return }
    const message = describeError(error) || 'Authentication setup failed.'
    authView(message)
    setMessage(message, true)
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
      let attemptedClerk = null
      try {
        const { clerk: activeClerk, client: activeClient } = await clientPromise
        attemptedClerk = activeClerk
        const formData = new FormData(form)
        const result = await withTimeout(
          activeClerk.client.signIn.create({ identifier: String(formData.get('email')).trim().toLowerCase(), password: String(formData.get('password')) }),
          `Sign-in timed out after ${AUTH_TIMEOUT_SECONDS}s: the sign-in service did not answer. Check your connection and that the Clerk publishable key is correct.`,
        )
        if (result.status !== 'complete' || !result.createdSessionId) throw new Error(`Clerk could not complete sign-in (status: ${result.status || 'unknown'}). Check the account and try again.`)
        await withTimeout(
          activeClerk.setActive({ session: result.createdSessionId }),
          `Activating your session timed out after ${AUTH_TIMEOUT_SECONDS}s. Please retry sign-in.`,
        )
        const signedInClient = activeClient || createClerkSupabaseClient({ createClient: (await sdkPromise).createClient, clerk: activeClerk, config: await readConfig() })
        const profile = await verifyRole(signedInClient, activeClerk.user, 'faculty')
        onAuthorized({ user: userForPortal(activeClerk.user), profile, client: signedInClient, clerk: activeClerk })
      } catch (error) {
        // A failed role check leaves a live Clerk session behind; clear it so the
        // next attempt starts clean, but never let that cleanup hang the form.
        if (attemptedClerk?.session) await withTimeout(attemptedClerk.signOut(), `Sign-out did not answer within ${AUTH_TIMEOUT_SECONDS}s; continuing.`).catch(() => {})
        setMessage(describeError(error) || 'Unable to sign in. Check the account and try again.', true)
      } finally {
        button.disabled = false
        button.textContent = 'Sign in'
      }
    })
  }
  wireForm()
}
