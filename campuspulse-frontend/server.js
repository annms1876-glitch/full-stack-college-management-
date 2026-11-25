const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const ROUTES = {
  "/": "/screens/light/feed.html",
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
      body = Buffer.from(html.replace(/<\/body>/i, '<script src="/app.js"></script></body>'));
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CampusPulse listening on 0.0.0.0:${PORT}`);
});
