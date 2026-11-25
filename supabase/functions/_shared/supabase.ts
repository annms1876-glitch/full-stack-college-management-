import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function publicConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Supabase configuration unavailable");
  return { url, anon };
}

export function callerClient(authHeader: string): SupabaseClient {
  const { url, anon } = publicConfig();
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticatedUser(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function consumeLimit(client: SupabaseClient, action: string, maxRequests: number, windowSeconds: number) {
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user) throw new Error("Rate limit unavailable");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Rate limit unavailable");
  const trusted = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await trusted.rpc("consume_user_rate_limit", {
    p_user_id: identity.user.id,
    p_action: action,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate limit unavailable");
  return data === true;
}
