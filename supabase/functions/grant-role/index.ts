import { createClient } from "npm:@supabase/supabase-js@2";
import { callerClient, authenticatedUser, consumeLimit, publicConfig } from "../_shared/supabase.ts";
import { boundedText, corsHeaders, isUuid, jsonResponse } from "../_shared/http.ts";

const roles = new Set(["student", "faculty", "admin"]);
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
  try {
    const caller = callerClient(auth);
    const user = await authenticatedUser(caller);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    if (!await consumeLimit(caller, "grant-role", 10, 60)) return jsonResponse({ error: "Rate limit exceeded" }, 429);
    // Admin authority is read from the database under caller JWT/RLS, never user_metadata or JWT claims.
    const { data: actor, error: actorError } = await caller.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (actorError || actor?.role !== "admin") return jsonResponse({ error: "Forbidden" }, 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid request" }, 400); }
    const targetId = body.user_id;
    const newRole = body.role;
    const collegeId = body.college_id === null ? null : body.college_id;
    if (!isUuid(targetId) || typeof newRole !== "string" || !roles.has(newRole) || (collegeId !== null && !isUuid(collegeId))) {
      return jsonResponse({ error: "Invalid role assignment" }, 400);
    }
    const { url } = publicConfig();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return jsonResponse({ error: "Service unavailable" }, 503);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (collegeId) {
      const { data: college, error } = await admin.from("colleges").select("id").eq("id", collegeId).maybeSingle();
      if (error || !college) return jsonResponse({ error: "College not found" }, 400);
    }
    const { data: before, error: readError } = await admin.from("profiles").select("role,college_id").eq("id", targetId).maybeSingle();
    if (readError || !before) return jsonResponse({ error: "User not found" }, 404);
    const { error: updateError } = await admin.from("profiles").update({ role: newRole, college_id: collegeId }).eq("id", targetId);
    if (updateError) return jsonResponse({ error: "Role update failed" }, 500);
    const { error: auditError } = await admin.from("role_change_audit").insert({
      subject_user_id: targetId, actor_user_id: user.id, old_role: before.role, new_role: newRole,
      reason: boundedText(body.reason, 2000) || null,
    });
    if (auditError) {
      // Compensate so a missing audit row never accompanies an accepted change.
      await admin.from("profiles").update({ role: before.role, college_id: before.college_id }).eq("id", targetId);
      return jsonResponse({ error: "Role update failed" }, 500);
    }
    return jsonResponse({ success: true });
  } catch {
    return jsonResponse({ error: "Service unavailable" }, 503);
  }
});
