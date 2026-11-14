/* 交互式浏览器回归测试：用 CDP 驱动真实 Chrome，跑通三个模块的完整流程。 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 8123;
const DEBUG_PORT = 9333;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8"
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------- 静态服务器 ---------- */

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const rel = url === "/" ? "index.html" : url.replace(/^\/+/, "");
    const filePath = path.join(ROOT, rel);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

/* ---------- CDP 客户端 ---------- */

async function connect(targetUrl) {
  let targets = [];
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/list");
      targets = await res.json();
      if (targets.some((t) => t.type === "page" && t.webSocketDebuggerUrl)) {
        break;
      }
    } catch (error) {
      /* 等待 Chrome 启动 */
    }
    await sleep(250);
  }
  const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!page) {
    throw new Error("未找到可用的 CDP 页面目标");
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(new Error(msg.error.message));
      } else {
        resolve(msg.result);
      }
    }
  });

  function send(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: targetUrl });
  await sleep(1200);

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression: "(function(){" + expression + "})()",
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      throw new Error("页面异常：" + (result.exceptionDetails.exception
        ? result.exceptionDetails.exception.description
        : result.exceptionDetails.text));
    }
    return result.result.value;
  }

  return { evaluate, close: () => ws.close() };
}

/* ---------- 断言 ---------- */

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: detail || "" });
  console.log((ok ? "  ok    " : "  FAIL  ") + name + (detail ? "  → " + detail : ""));
}

/* ---------- 场景 ---------- */

const scenarios = [
  {
    name: "塔罗牌占卜",
    async run(page) {
      await page.evaluate("document.getElementById('start-reading').click(); return true;");
      await sleep(150);
      check("塔罗进入提问步骤",
        await page.evaluate("return !document.getElementById('view-question').hidden;"));

      await page.evaluate(`
        var input = document.getElementById('question-input');
        input.value = '我该如何理解当前的工作机会？';
        input.dispatchEvent(new Event('input', {bubbles:true}));
        document.getElementById('question-next').click();
        return true;`);
      await sleep(150);
      check("塔罗进入牌阵步骤",
        await page.evaluate("return !document.getElementById('view-spread').hidden;"));

      await page.evaluate("document.getElementById('spread-next').click(); return true;");
      await sleep(150);
      check("塔罗进入洗牌步骤",
        await page.evaluate("return !document.getElementById('view-ritual').hidden;"));

      await page.evaluate("document.getElementById('shuffle-button').click(); return true;");
      await sleep(1200);
      await page.evaluate("document.getElementById('cut-button').click(); return true;");
      await sleep(1200);
      await page.evaluate("document.getElementById('merge-deck-button').click(); return true;");
      await sleep(1200);
      await page.evaluate("document.getElementById('to-draw-button').click(); return true;");
      await sleep(300);
      check("塔罗扇形牌阵已展开",
        await page.evaluate("return document.querySelectorAll('#fan-deck [data-fan-index]').length > 0;"));

      await page.evaluate(`
        var card = document.querySelector('#fan-deck [data-fan-index]');
        card.click();
        return true;`);
      await sleep(1200);
      await page.evaluate("document.getElementById('start-reveal').click(); return true;");
      await sleep(300);
      await page.evaluate(`
        var card = document.querySelector('#draw-grid [data-card-index]');
        card.click();
        return true;`);
      await sleep(1600);
      check("塔罗翻牌完成",
        await page.evaluate("return !document.getElementById('reading-cta').hidden;"));
      await page.evaluate("document.getElementById('reading-cta').click(); return true;");
      await sleep(400);
      check("塔罗解读已生成",
        await page.evaluate("return document.getElementById('reading-cards').children.length > 0;"));

      await page.evaluate("document.getElementById('save-reading').click(); return true;");
      await sleep(200);
      const stored = await page.evaluate(
        "var raw = localStorage.getItem('stella-tarot-history-v1'); return raw ? JSON.parse(raw) : [];");
      check("塔罗记录已写入 localStorage",
        stored.length === 1 && stored[0].type === "tarot",
        "共 " + stored.length + " 条");
    }
  },
  {
    name: "小六壬占课",
    async run(page) {
      await page.evaluate("window.ExtraDivination.activateModule('liuren'); return true;");
      await sleep(200);
      check("小六壬视图已显示",
        await page.evaluate("return !document.getElementById('view-liuren').hidden;"));

      await page.evaluate(`
        var input = document.getElementById('liuren-question');
        input.value = '这次工作变动是否值得推进？';
        input.dispatchEvent(new Event('input', {bubbles:true}));
        document.getElementById('liuren-question-next').click();
        return true;`);
      await sleep(200);
      check("小六壬进入起课方式",
        await page.evaluate("return !document.getElementById('liuren-step-method').hidden;"));

      await page.evaluate(`
        document.querySelector('[data-liuren-method="number"]').click();
        var one = document.getElementById('liuren-number-one');
        var two = document.getElementById('liuren-number-two');
        var three = document.getElementById('liuren-number-three');
        one.value = '8'; one.dispatchEvent(new Event('input', {bubbles:true}));
        two.value = '17'; two.dispatchEvent(new Event('input', {bubbles:true}));
        three.value = '26'; three.dispatchEvent(new Event('input', {bubbles:true}));
        return true;`);
      await sleep(150);
      check("小六壬开始计算按钮已启用",
        await page.evaluate("return !document.getElementById('liuren-calculate').disabled;"));

      await page.evaluate("document.getElementById('liuren-calculate').click(); return true;");
      await sleep(1500);
      check("小六壬计算过程已展示",
        await page.evaluate("return document.querySelectorAll('#liuren-calculation-detail .calculation-step').length === 3;"));

      await page.evaluate("document.getElementById('liuren-result-button').click(); return true;");
      await sleep(300);
      check("小六壬三宫解读已生成",
        await page.evaluate("return document.querySelectorAll('#liuren-result .liuren-three-grid .palace-card, #liuren-result .liuren-three-grid > *').length === 3;"));

      await page.evaluate("document.getElementById('liuren-save').click(); return true;");
      await sleep(200);
      const stored = await page.evaluate(
        "var raw = localStorage.getItem('stella-tarot-history-v1'); return raw ? JSON.parse(raw) : [];");
      const liuren = stored.filter((r) => r.type === "liuren");
      check("小六壬记录已写入 localStorage",
        liuren.length === 1 && Array.isArray(liuren[0].result.palaces),
        "共 " + stored.length + " 条");
    }
  },
  {
    name: "六爻起卦",
    async run(page) {
      await page.evaluate("window.ExtraDivination.activateModule('liuyao'); return true;");
      await sleep(200);
      check("六爻视图已显示",
        await page.evaluate("return !document.getElementById('view-liuyao').hidden;"));

      await page.evaluate(`
        var input = document.getElementById('liuyao-question');
        input.value = '面对接下来的项目，我最应该关注什么？';
        input.dispatchEvent(new Event('input', {bubbles:true}));
        document.getElementById('liuyao-question-next').click();
        return true;`);
      await sleep(200);
      check("六爻进入摇卦步骤",
        await page.evaluate("return !document.getElementById('liuyao-step-cast').hidden;"));

      await page.evaluate("document.getElementById('liuyao-auto').click(); return true;");
      await sleep(2500);
      check("六爻已摇满六爻",
        await page.evaluate("return document.getElementById('liuyao-count').textContent === '6';"));

      await page.evaluate("document.getElementById('liuyao-result-button').click(); return true;");
      await sleep(300);
      check("六爻本卦与变卦已展示",
        await page.evaluate("return document.querySelectorAll('#liuyao-result .hexagram-reading-card').length >= 2;"));

      check("六亲六神装卦表已生成",
        await page.evaluate("return document.querySelectorAll('#liuyao-result .chart-card').length === 2;"),
        await page.evaluate("return document.querySelectorAll('#liuyao-result .chart-row').length + ' 行';"));

      const chartInfo = await page.evaluate(`
        var rows = Array.from(document.querySelectorAll('#liuyao-result .chart-card:first-child .chart-row:not(.chart-head)'));
        var relatives = rows.map(function (r) { return r.querySelector('.chart-relative').textContent; });
        var spirits = rows.map(function (r) { return r.querySelector('.chart-spirit').textContent; });
        var marks = rows.map(function (r) { return r.querySelector('.chart-mark').textContent; });
        var branches = rows.map(function (r) { return r.querySelector('.chart-branch b').textContent; });
        return { relatives: relatives, spirits: spirits, marks: marks, branches: branches };`);

      const relatives = ["父母", "兄弟", "子孙", "妻财", "官鬼"];
      check("六亲取值合法",
        chartInfo.relatives.length === 6 && chartInfo.relatives.every((r) => relatives.indexOf(r) > -1),
        chartInfo.relatives.join(" "));
      check("六神取值合法",
        chartInfo.spirits.length === 6 &&
        chartInfo.spirits.every((s) => ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"].indexOf(s) > -1),
        chartInfo.spirits.join(" "));
      check("世应标记唯一且成对",
        chartInfo.marks.filter((m) => m === "世").length === 1 &&
        chartInfo.marks.filter((m) => m === "应").length === 1,
        chartInfo.marks.join(" "));
      check("纳甲地支已填入",
        chartInfo.branches.length === 6 && chartInfo.branches.every((z) => z.length === 1),
        chartInfo.branches.join(" "));

      await page.evaluate("document.getElementById('liuyao-save').click(); return true;");
      await sleep(200);
      const stored = await page.evaluate(
        "var raw = localStorage.getItem('stella-tarot-history-v1'); return raw ? JSON.parse(raw) : [];");
      const liuyao = stored.filter((r) => r.type === "liuyao");
      check("六爻记录已写入 localStorage",
        liuyao.length === 1 && Array.isArray(liuyao[0].result.lines),
        "共 " + stored.length + " 条");
    }
  },
  {
    name: "历史记录面板",
    async run(page) {
      await page.evaluate("document.getElementById('history-open').click(); return true;");
      await sleep(300);
      check("历史面板已打开",
        await page.evaluate("return document.getElementById('history-dialog').hasAttribute('open');"));
      check("历史面板列出三条记录",
        await page.evaluate("return document.querySelectorAll('#history-list .history-item').length === 3;"),
        await page.evaluate("return document.querySelectorAll('#history-list .history-item').length + ' 条';"));

      await page.evaluate(`
        document.querySelector('[data-history-filter="liuyao"]').click();
        return true;`);
      await sleep(200);
      check("按六爻筛选只剩一条",
        await page.evaluate("return document.querySelectorAll('#history-list .history-item').length === 1;"));

      await page.evaluate(`
        document.querySelector('#history-list [data-history-action="view"]').click();
        return true;`);
      await sleep(300);
      check("记录详情可打开",
        await page.evaluate("return document.getElementById('history-detail-content').children.length > 0;"));
      check("六爻历史详情保留装卦表",
        await page.evaluate("return document.querySelectorAll('#history-detail-content .chart-row').length === 14;"),
        await page.evaluate("return document.querySelectorAll('#history-detail-content .chart-row').length + ' 行';"));
    }
  }
];

/* ---------- 主流程 ---------- */

(async function main() {
  const server = await startServer();
  const profile = path.join(os.tmpdir(), "opencode", "chrome-e2e-" + Date.now());
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=" + DEBUG_PORT,
    "--user-data-dir=" + profile,
    "--window-size=1280,900",
    "about:blank"
  ], { stdio: "ignore" });

  let page;
  try {
    page = await connect("http://127.0.0.1:" + PORT + "/index.html");
    for (const scenario of scenarios) {
      console.log("\n[" + scenario.name + "]");
      try {
        await scenario.run(page);
      } catch (error) {
        check(scenario.name + " 执行中断", false, error.message);
      }
    }
  } finally {
    if (page) {
      page.close();
    }
    chrome.kill();
    server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n通过 " + (results.length - failed.length) + " / " + results.length);
  if (failed.length) {
    console.log("失败项：");
    failed.forEach((r) => console.log("  - " + r.name + (r.detail ? " (" + r.detail + ")" : "")));
  }
  process.exit(failed.length ? 1 : 0);
})();
