// Browser-side file signature (magic byte) inspection for CampusPulse uploads.
// Mirrors supabase/functions/_shared/file-signature.ts. The Edge function is the
// authoritative check; this module stops obviously mislabelled files early so a
// student is not left with a failed upload and an orphaned Storage object.

export const UPLOAD_ALLOWLIST = Object.freeze([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "application/zip",
  "application/x-zip-compressed",
]);

export const MAX_UPLOAD_BYTES = 26214400;

const ZIP_BACKED = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const startsWith = (bytes, signature, offset = 0) => signature.every((value, index) => bytes[offset + index] === value);

/** Detect the MIME type of a Blob/File from its first 16 bytes. */
export async function sniffFileType(file) {
  if (!file || typeof file.slice !== "function") return null;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes.length < 4) return null;
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "application/zip";
  if (startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) return "application/zip";
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "application/msword";
  return null;
}

/** True when the detected bytes are an acceptable representation of the declared type. */
export function signatureMatchesMime(sniffed, declared) {
  if (!sniffed) return false;
  if (!declared) return true;
  if (sniffed === declared) return true;
  if (sniffed === "application/zip") return ZIP_BACKED.has(declared);
  return false;
}

/**
 * Validate a candidate submission file before upload.
 * Returns { ok: true, mimeType } or { ok: false, message }.
 */
export async function validateUploadFile(file) {
  if (!file) return { ok: false, message: "Choose a file to upload." };
  if (file.size < 1) return { ok: false, message: "The selected file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "Files must be 25 MiB or smaller." };
  if (!UPLOAD_ALLOWLIST.includes(file.type)) {
    return { ok: false, message: "Allowed files are PDF, DOC, DOCX, PNG, JPEG, or ZIP." };
  }
  const sniffed = await sniffFileType(file);
  if (!signatureMatchesMime(sniffed, file.type)) {
    return { ok: false, message: "That file's contents do not match its type. Rename it correctly or export it again." };
  }
  return { ok: true, mimeType: file.type, sniffed };
}
