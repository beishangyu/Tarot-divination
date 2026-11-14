/* 截图工具：驱动 Chrome 走完流程并保存 PNG，用于人工核对视觉效果。 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 8124;
const DEBUG_PORT = 9334;

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function startServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, rel === "/" ? "index.html" : rel.replace(/^\/+/, ""));
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

async function connect(url) {
  let targets = [];
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/list");
      targets = await res.json();
      if (targets.some((t) => t.type === "page" && t.webSocketDebuggerUrl)) break;
    } catch (e) { /* wait */ }
    await sleep(250);
  }
  const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
  let id = 1;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const current = id++;
    pending.set(current, { resolve, reject });
    ws.send(JSON.stringify({ id: current, method, params: params || {} }));
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await sleep(1200);
  return {
    send: send,
    async evaluate(expression) {
      const r = await send("Runtime.evaluate", { expression: "(function(){" + expression + "})()", returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    },
    async shot(file) {
      const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    },
    close: () => ws.close()
  };
}

(async function main() {
  const target = process.argv[2] || "liuyao";
  const server = await startServer();
  const profile = path.join(os.tmpdir(), "opencode", "chrome-shot-" + Date.now());
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=" + DEBUG_PORT, "--user-data-dir=" + profile,
    "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });

  let page;
  const outDir = path.join(ROOT, "tools", "screenshots");
  fs.mkdirSync(outDir, { recursive: true });
  try {
    page = await connect("http://127.0.0.1:" + PORT + "/index.html");

    if (target === "liuyao") {
      await page.evaluate(`
        window.ExtraDivination.activateModule('liuyao');
        var q = document.getElementById('liuyao-question');
        q.value = '这次合作能否顺利推进？';
        q.dispatchEvent(new Event('input', {bubbles:true}));
        document.getElementById('liuyao-question-next').click();
        document.getElementById('liuyao-auto').click();
        return true;`);
      await sleep(2000);
      await page.evaluate("document.getElementById('liuyao-result-button').click(); return true;");
      await sleep(600);
      await page.evaluate(`
        var el = document.querySelector('#liuyao-result .chart-pair');
        if (el) { el.scrollIntoView({block:'start'}); }
        return true;`);
      await sleep(400);
      await page.shot(path.join(outDir, "liuyao-chart.png"));
      console.log("已保存 tools/screenshots/liuyao-chart.png");
    }

    if (target === "liuyao-mobile") {
      await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await page.evaluate(`
        window.ExtraDivination.activateModule('liuyao');
        var q = document.getElementById('liuyao-question');
        q.value = '这次合作能否顺利推进？';
        q.dispatchEvent(new Event('input', {bubbles:true}));
        document.getElementById('liuyao-question-next').click();
        document.getElementById('liuyao-auto').click();
        return true;`);
      await sleep(2000);
      await page.evaluate("document.getElementById('liuyao-result-button').click(); return true;");
      await sleep(600);
      await page.evaluate(`
        var el = document.querySelector('#liuyao-result .chart-pair');
        if (el) { el.scrollIntoView({block:'start'}); }
        return true;`);
      await sleep(400);
      await page.shot(path.join(outDir, "liuyao-chart-mobile.png"));
      console.log("已保存 tools/screenshots/liuyao-chart-mobile.png");
    }

    if (target === "liuren") {
      await page.evaluate(`
        window.ExtraDivination.activateModule('liuren');
        var q = document.getElementById('liuren-question');
        q.value = '这次工作变动是否值得推进？';
        q.dispatchEvent(new Event('input', {bubbles:true}));
        document.getElementById('liuren-question-next').click();
        document.querySelector('[data-liuren-method="number"]').click();
        var one = document.getElementById('liuren-number-one');
        var two = document.getElementById('liuren-number-two');
        var three = document.getElementById('liuren-number-three');
        one.value='8'; one.dispatchEvent(new Event('input',{bubbles:true}));
        two.value='17'; two.dispatchEvent(new Event('input',{bubbles:true}));
        three.value='26'; three.dispatchEvent(new Event('input',{bubbles:true}));
        document.getElementById('liuren-calculate').click();
        return true;`);
      await sleep(1500);
      await page.evaluate("document.getElementById('liuren-result-button').click(); return true;");
      await sleep(600);
      await page.shot(path.join(outDir, "liuren-result.png"));
      console.log("已保存 tools/screenshots/liuren-result.png");
    }
  } finally {
    if (page) page.close();
    chrome.kill();
    server.close();
  }
})();
