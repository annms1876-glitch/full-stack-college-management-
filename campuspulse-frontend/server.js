const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const SUPABASE_RUNTIME_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || "",
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
};
function publicPortalUrl(value, fallback) {
  try {
    const url = new URL(value || fallback);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
  } catch { return fallback; }
}
const PORTAL_RUNTIME_CONFIG = {
  facultyPortalUrl: publicPortalUrl(process.env.FACULTY_PORTAL_URL, "http://127.0.0.1:3001/"),
  adminPortalUrl: publicPortalUrl(process.env.ADMIN_PORTAL_URL, "http://127.0.0.1:3002/"),
};
const DEMO_ACCOUNTS = require("../scripts/demo-accounts.json");
let SUPABASE_HOST = "";
try { SUPABASE_HOST = new URL(SUPABASE_RUNTIME_CONFIG.supabaseUrl).hostname; } catch {}
const DEMO_MODE_ENABLED = process.env.NODE_ENV !== "production"
  && process.env.CAMPUSPULSE_DEMO_MODE === "true"
  && ["localhost", "127.0.0.1", "::1"].includes(SUPABASE_HOST);
const LISTEN_HOST = DEMO_MODE_ENABLED ? "127.0.0.1" : "0.0.0.0";
const ROUTES = {
  "/": "/home.html",
  "/home": "/home.html",
  "/index.html": "/home.html",
  "/feed": "/screens/light/feed.html",
  "/login": "/screens/light/login.html",
  "/faculty": "/screens/light/faculty.html",
  "/profile": "/screens/light/profile.html",
  "/study": "/screens/light/study.html",
  "/clubs": "/screens/light/clubs.html",
  "/dark/feed": "/screens/dark/feed.html",
  "/dark/login": "/screens/dark/login.html",
  "/dark/faculty": "/screens/dark/faculty.html",
  "/dark/profile": "/screens/dark/profile.html",
  "/dark/study": "/screens/dark/study.html",
  "/dark/clubs": "/screens/dark/clubs.html",
};
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const IMAGE_REPLACEMENTS = {
  "ALJJyrDerPS2l3M99": "/manus-storage/async-images/tIMMXbdwAHVy5Nlq2fTO0K/image-1.webp",
  "ALJJyrBWzizFfB_K": "/manus-storage/async-images/tIMMXbdwAHVy5Nlq2fTO0K/image-1.webp",
  "ALJJyrD27Av7MK_": "/brand/campus-logo-144-712f764a4b82.webp",
  "ALJJyrBXDQY-wzzb": "/manus-storage/async-images/tIMMXbdwAHVy5Nlq2fTO0K/image-2.webp",
  "ALJJyrC_eoL-ICo": "/manus-storage/async-images/tIMMXbdwAHVy5Nlq2fTO0K/image-3.webp",
  "ALJJyrDF4dExuwU9": "/manus-storage/async-images/tIMMXbdwAHVy5Nlq2fTO0K/image-4.webp",
  "ALJJyrABqBD-QY0j": "/manus-storage/async-images/tIMMXbdwAHVy5Nlq2fTO0K/image-5.webp",
};

const server = http.createServer((req, res) => {
  let endpoint = "";
  try { endpoint = new URL(req.url, "http://localhost").pathname; } catch {}
  if (endpoint === "/api/config") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Method Not Allowed" }));
    }
    const payload = JSON.stringify({ ...SUPABASE_RUNTIME_CONFIG, ...PORTAL_RUNTIME_CONFIG }).replace(/</g, "\\u003c");
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    return res.end(req.method === "HEAD" ? undefined : payload);
  }
  if (endpoint === "/api/demo-accounts") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Method Not Allowed" }));
    }
    if (!DEMO_MODE_ENABLED) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      return res.end(req.method === "HEAD" ? undefined : JSON.stringify({ error: "Not found" }));
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    return res.end(req.method === "HEAD" ? undefined : JSON.stringify({ accounts: DEMO_ACCOUNTS.map(({ role, email, password }) => ({ role, email, password })) }));
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Method Not Allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Bad Request");
  }

  const mappedPath = ROUTES[pathname] || pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${mappedPath}`);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(error.code === "ENOENT" ? "Not Found" : "Internal Server Error");
    }

    let body = buffer;
    if (path.extname(filePath) === ".html") {
      let html = buffer.toString("utf8");
      html = html.replace(/https:\/\/lh3\.googleusercontent\.com\/aida\/[^"'\s)<>]+/g, (url) => {
        const replacement = Object.entries(IMAGE_REPLACEMENTS).find(([key]) => url.includes(key));
        return replacement ? replacement[1] : url;
      });
      if (!/^\/screens\/(?:light|dark)\/login\.html$/.test(mappedPath)) {
        html = html.replace(/<\/body>/i, `<script type="module" src="/app.js"></script></body>`);
      }
      if (!html.includes('src="/theme-toggle.js"')) {
        html = html.replace(/<\/body>/i, `<script type="module" src="/theme-toggle.js"></script></body>`);
      }
      body = Buffer.from(html);
    }
    const fingerprintedAsset = /-[a-f0-9]{12}\.(?:css|js|png|jpe?g|webp)$/i.test(path.basename(filePath));
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": fingerprintedAsset ? "public, max-age=31536000, immutable" : "no-cache",
      "Content-Length": body.length,
    });
    res.end(req.method === "HEAD" ? undefined : body);
  });
});

server.listen(PORT, LISTEN_HOST, () => {
  console.log(`CampusPulse listening on ${LISTEN_HOST}:${PORT}`);
});
