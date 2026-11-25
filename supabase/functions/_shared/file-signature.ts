// File signature (magic byte) verification shared by CampusPulse Edge code.
// Browser uploads are sniffed locally too, but this server-side check is the
// authoritative one: a signed URL is only issued when the stored bytes match a
// document allowlist, and (for submissions) the declared MIME type.

export type SniffedMime =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "application/zip"
  | "application/msword";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value);

const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

/** Inspect the leading bytes of a file and return the detected MIME type. */
export function sniffMime(bytes: Uint8Array): SniffedMime | null {
  if (!bytes || bytes.length < 4) return null;
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // OOXML (.docx) and .zip share the PK\x03\x04 container header.
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "application/zip";
  if (startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) return "application/zip";
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "application/msword"; // legacy OLE
  if (startsWith(bytes, ascii("{\\rtf"))) return null; // RTF is not an allowed upload type
  return null;
}

const ZIP_BACKED = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** True when the sniffed bytes are an acceptable representation of the declared type. */
export function signatureMatchesMime(sniffed: SniffedMime | null, declared: string | null): boolean {
  if (!sniffed) return false;
  if (!declared) return true; // no declared type to compare against (post media)
  if (sniffed === declared) return true;
  if (sniffed === "application/zip") return ZIP_BACKED.has(declared);
  return false;
}

export const UPLOAD_ALLOWLIST: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "application/zip",
  "application/x-zip-compressed",
]);

/** Read the first bytes of a private Storage object via a ranged authenticated GET. */
export async function readObjectHead(
  supabaseUrl: string,
  anonKey: string,
  callerToken: string,
  bucket: string,
  objectPath: string,
): Promise<Uint8Array | null> {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodedPath}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: callerToken,
      Range: "bytes=0-15",
    },
    redirect: "error",
  });
  if (!response.ok && response.status !== 206) return null;
  const buffer = new Uint8Array(await response.arrayBuffer());
  return buffer.length ? buffer : null;
}
