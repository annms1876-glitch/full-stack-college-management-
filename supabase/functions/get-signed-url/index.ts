import { callerClient, authenticatedUser, consumeLimit, publicConfig } from "../_shared/supabase.ts";
import { boundedText, corsHeaders, jsonResponse } from "../_shared/http.ts";
import { readObjectHead, signatureMatchesMime, sniffMime, UPLOAD_ALLOWLIST } from "../_shared/file-signature.ts";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ASSIGNMENT_PATH = new RegExp(`^assignments/${UUID}/${UUID}/${UUID}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$`, "i");
const POST_MEDIA_PATH = new RegExp(`^${UUID}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$`, "i");
const DEFAULT_TTL = 120;
const MIN_TTL = 30;
const MAX_TTL = 300;

type Target = { bucket: "assignments" | "post-media"; path: string; mimeType: string | null };

function validPath(bucket: string, objectPath: string): boolean {
  if (!objectPath || objectPath.length > 512) return false;
  if (objectPath.startsWith("/") || objectPath.includes("..") || objectPath.includes("//")) return false;
  if (/\s/.test(objectPath)) return false;
  return bucket === "assignments" ? ASSIGNMENT_PATH.test(objectPath) : POST_MEDIA_PATH.test(objectPath);
}

/**
 * Prove access with the caller's own JWT so RLS (not this function) decides who
 * may reference a private object. A missing row means "not authorized".
 */
async function resolveTarget(
  caller: ReturnType<typeof callerClient>,
  bucket: "assignments" | "post-media",
  objectPath: string,
): Promise<Target | null> {
  if (bucket === "assignments") {
    const { data, error } = await caller
      .from("assignment_submissions")
      .select("mime_type")
      .eq("file_path", objectPath)
      .maybeSingle();
    if (error || !data) return null;
    const mimeType = typeof data.mime_type === "string" ? data.mime_type : null;
    if (mimeType && !UPLOAD_ALLOWLIST.has(mimeType)) return null;
    return { bucket, path: objectPath, mimeType };
  }
  const { data, error } = await caller
    .from("posts")
    .select("id")
    .contains("media_urls", [objectPath])
    .maybeSingle();
  if (error || !data) return null;
  return { bucket, path: objectPath, mimeType: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const caller = callerClient(auth);
    const user = await authenticatedUser(caller);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
    if (!await consumeLimit(caller, "get-signed-url", 30, 60)) return jsonResponse({ error: "Rate limit exceeded" }, 429);

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await req.json();
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return jsonResponse({ error: "Invalid request" }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const bucket = body.bucket;
    const objectPath = typeof body.path === "string" ? boundedText(body.path, 512) : "";
    const requestedTtl = Number(body.expires_in ?? DEFAULT_TTL);
    if (bucket !== "assignments" && bucket !== "post-media") {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    if (!validPath(bucket, objectPath)) return jsonResponse({ error: "Invalid request" }, 400);
    const expiresIn = Number.isFinite(requestedTtl)
      ? Math.min(MAX_TTL, Math.max(MIN_TTL, Math.trunc(requestedTtl)))
      : DEFAULT_TTL;

    const target = await resolveTarget(caller, bucket, objectPath);
    // Deliberately identical response for "does not exist" and "not yours".
    if (!target) return jsonResponse({ error: "Forbidden" }, 403);

    // Magic-byte verification before a short-lived URL is minted. The ranged GET
    // runs with the caller's JWT, so Storage RLS applies a second time.
    const { url, anon } = publicConfig();
    const token = auth.slice("Bearer ".length).trim();
    const head = await readObjectHead(url, anon, `Bearer ${token}`, target.bucket, target.path);
    if (!head) return jsonResponse({ error: "Attachment unavailable" }, 503);
    const sniffed = sniffMime(head);
    if (!sniffed || !UPLOAD_ALLOWLIST.has(sniffed) || !signatureMatchesMime(sniffed, target.mimeType)) {
      return jsonResponse({ error: "File content does not match its declared type" }, 422);
    }

    const { data, error } = await caller.storage.from(target.bucket).createSignedUrl(target.path, expiresIn);
    if (error || !data?.signedUrl) return jsonResponse({ error: "Signed URL unavailable" }, 503);
    return jsonResponse({ signedUrl: data.signedUrl, expiresIn, mimeType: sniffed });
  } catch {
    return jsonResponse({ error: "Service unavailable" }, 503);
  }
});
