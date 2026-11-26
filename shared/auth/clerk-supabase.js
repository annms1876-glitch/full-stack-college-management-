/**
 * Browser-safe Supabase adapter for Clerk sessions.
 *
 * The Clerk session remains the source of authentication. Supabase JS receives
 * short-lived Clerk JWTs through accessToken and must not create or persist a
 * Supabase Auth session. The Clerk JWT template must be named "supabase".
 */

const SUPABASE_JWT_TEMPLATE = "supabase";

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function requireCreateClient(createClient) {
  if (typeof createClient !== "function") {
    throw new TypeError("createClient must be the Supabase JS createClient function");
  }
  return createClient;
}

function requireClerkSession(clerk) {
  const session = clerk?.session;
  if (!session || typeof session.getToken !== "function") {
    throw new TypeError("A signed-in Clerk session with getToken() is required");
  }
  return session;
}

/**
 * Create a Supabase client authorized by the current Clerk session.
 *
 * `createClient` is injected so this module stays browser-safe and works with
 * either the bundled Supabase JS build or a Vite dependency. The callback is
 * evaluated by Supabase for each request, allowing token refresh by Clerk.
 */
export function createClerkSupabaseClient({ createClient, clerk, config = {} } = {}) {
  const makeClient = requireCreateClient(createClient);
  const session = requireClerkSession(clerk);
  const url = requireString(config.supabaseUrl || config.SUPABASE_URL, "SUPABASE_URL");
  const publishableKey = requireString(
    config.publishableKey || config.SUPABASE_PUBLISHABLE_KEY,
    "SUPABASE_PUBLISHABLE_KEY",
  );

  return makeClient(url, publishableKey, {
    accessToken: async () => {
      const token = await session.getToken({ template: SUPABASE_JWT_TEMPLATE });
      if (!token) throw new Error("Clerk did not return a Supabase JWT");
      return token;
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export { SUPABASE_JWT_TEMPLATE };
