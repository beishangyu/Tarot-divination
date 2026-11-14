/* 本地静态服务器：用于本地预览与自动化测试。 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const rel = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}).listen(PORT, "127.0.0.1", () => {
  console.log("静态服务器已启动：http://127.0.0.1:" + PORT + "/");
});
