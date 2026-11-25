import { callerClient, authenticatedUser, publicConfig } from "../_shared/supabase.ts";
import { corsHeaders, isUuid, jsonResponse } from "../_shared/http.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedBuckets = new Set(["assignments", "post-media"]);
const safePath = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 500 && !value.includes("..") && !value.startsWith("/");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
  try {
    const caller = callerClient(authorization);
    const user = await authenticatedUser(caller);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => null);
    const bucket = body?.bucket;
    const path = body?.path;
    if (!allowedBuckets.has(bucket) || !safePath(path)) return jsonResponse({ error: "Invalid file reference" }, 400);

    if (bucket === "assignments") {
      const parts = path.split("/");
      if (parts.length !== 5 || parts[0] !== "assignments" || !isUuid(parts[1]) || !isUuid(parts[2]) || !isUuid(parts[3])) return jsonResponse({ error: "Invalid assignment path" }, 400);
      const { data, error } = await caller.from("assignment_submissions").select("id,file_path,assignment:assignments!inner(course_id)").eq("file_path", path).maybeSingle();
      if (error || !data || data.file_path !== path || data.assignment?.course_id !== parts[1]) return jsonResponse({ error: "Forbidden" }, 403);
    } else {
      const [postId] = path.split("/");
      if (!isUuid(postId)) return jsonResponse({ error: "Invalid post-media path" }, 400);
      const { data, error } = await caller.from("posts").select("id").eq("id", postId).maybeSingle();
      if (error || !data) return jsonResponse({ error: "Forbidden" }, 403);
    }
    const { url } = publicConfig();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return jsonResponse({ error: "Service unavailable" }, 503);
    const storage = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await storage.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return jsonResponse({ error: "Could not issue signed URL" }, 500);
    return jsonResponse({ signedUrl: data.signedUrl, expiresIn: 300 });
  } catch { return jsonResponse({ error: "Invalid request" }, 400); }
});
