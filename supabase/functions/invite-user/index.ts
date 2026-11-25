import { createClient } from "npm:@supabase/supabase-js@2";
import { callerClient, authenticatedUser, consumeLimit, publicConfig } from "../_shared/supabase.ts";
import { boundedText, corsHeaders, isUuid, jsonResponse } from "../_shared/http.ts";

const inviteRoles = new Set(["faculty", "admin"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestBody = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const caller = callerClient(auth);
    const user = await authenticatedUser(caller);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    if (!await consumeLimit(caller, "invite-user", 5, 60)) return jsonResponse({ error: "Rate limit exceeded" }, 429);

    // Read privilege from profiles under the caller's JWT/RLS, never from user metadata.
    const { data: actor, error: actorError } = await caller
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (actorError || actor?.role !== "admin") return jsonResponse({ error: "Forbidden" }, 403);

    let body: RequestBody;
    try {
      const parsed: unknown = await req.json();
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return jsonResponse({ error: "Invalid request" }, 400);
      }
      body = parsed as RequestBody;
    } catch {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const { url } = publicConfig();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return jsonResponse({ error: "Service unavailable" }, 503);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    if (body.action === "list_colleges") {
      const { data, error } = await admin.from("colleges").select("id,name").order("name").limit(100);
      if (error) return jsonResponse({ error: "College list unavailable" }, 500);
      return jsonResponse({ colleges: data ?? [] });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fullName = boundedText(body.full_name, 160);
    const role = body.role;
    const collegeId = body.college_id === undefined ? null : body.college_id;
    if (
      email.length > 254 || !emailPattern.test(email) || !fullName ||
      typeof role !== "string" || !inviteRoles.has(role) ||
      (collegeId !== null && !isUuid(collegeId))
    ) {
      return jsonResponse({ error: "Enter a valid name, email, faculty/admin role, and college." }, 400);
    }

    let collegeDomain: string | null = null;
    if (collegeId) {
      const { data: college, error } = await admin.from("colleges")
        .select("id,domain")
        .eq("id", collegeId)
        .maybeSingle();
      if (error || !college) return jsonResponse({ error: "College not found" }, 400);
      collegeDomain = String(college.domain).trim().toLowerCase();
      const emailDomain = email.split("@").at(-1)?.toLowerCase();
      if (emailDomain !== collegeDomain) {
        return jsonResponse({ error: "The email domain must match the selected college." }, 400);
      }
    }

    // The auth bootstrap trigger creates a student-default profile from this
    // metadata; the trusted service client changes its role immediately below.
    const inviteOptions = {
      data: {
        full_name: fullName,
        ...(collegeId ? { college_id: collegeId } : {}),
      },
    };
    const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, inviteOptions);
    const invitedUser = invitation?.user;
    if (inviteError || !invitedUser) {
      return jsonResponse({ error: "Invitation could not be created. Check that the address is new and email delivery is configured." }, 400);
    }

    const { data: before, error: profileReadError } = await admin.from("profiles")
      .select("role,college_id")
      .eq("id", invitedUser.id)
      .maybeSingle();
    if (profileReadError || !before) {
      await admin.auth.admin.deleteUser(invitedUser.id);
      return jsonResponse({ error: "The invited profile could not be initialized." }, 500);
    }

    const { error: profileUpdateError } = await admin.from("profiles")
      .update({ role, college_id: collegeId, full_name: fullName })
      .eq("id", invitedUser.id);
    if (profileUpdateError) {
      await admin.auth.admin.deleteUser(invitedUser.id);
      return jsonResponse({ error: "The invited profile could not be assigned." }, 500);
    }

    const { error: auditError } = await admin.from("role_change_audit").insert({
      subject_user_id: invitedUser.id,
      actor_user_id: user.id,
      old_role: before.role,
      new_role: role,
      reason: "Trusted administrator invitation",
    });
    if (auditError) {
      await admin.auth.admin.deleteUser(invitedUser.id);
      return jsonResponse({ error: "The invitation could not be audited and was cancelled." }, 500);
    }

    return jsonResponse({ success: true, invited: true, user_id: invitedUser.id });
  } catch {
    return jsonResponse({ error: "Service unavailable" }, 503);
  }
});
