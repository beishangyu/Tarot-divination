/* 模块路由：在塔罗、小六壬、六爻三个模块之间切换，并兼容旧版本保存的历史记录。 */
(function () {
  "use strict";

  const tarotApi = window.TarotApp;
  const liuyaoData = window.LIUYAO_DATA;

  if (!tarotApi || !liuyaoData) {
    return;
  }

  const escapeHtml = tarotApi.escapeHtml;

  const elements = {
    tabs: Array.from(document.querySelectorAll(".module-tab")),
    homeCards: Array.from(document.querySelectorAll(".home-module-card")),
    liurenView: document.getElementById("view-liuren"),
    liuyaoView: document.getElementById("view-liuyao")
  };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- 模块切换 ---------- */

  function activateModule(name) {
    elements.tabs.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.module === name);
    });
    elements.homeCards.forEach(function (button) {
      button.classList.toggle("is-selected", button.dataset.module === name);
    });

    elements.liurenView.hidden = name !== "liuren";
    elements.liuyaoView.hidden = name !== "liuyao";

    if (name === "tarot") {
      tarotApi.restoreTarotView();
    } else {
      tarotApi.hideTarotViews();
    }

    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function showHome() {
    activateModule("tarot");
    tarotApi.showView("welcome");
  }

  /* ---------- 旧版历史记录渲染（兼容 v1 存档） ---------- */

  function historyMetaMarkup(record) {
    return [
      '<div class="detail-meta">',
      "<div><span>时间</span><b>" + escapeHtml(tarotApi.formatDate(record.createdAt)) + "</b></div>",
      "<div><span>类型</span><b>" + escapeHtml(record.questionTypeLabel || "综合") + "</b></div>",
      "<div><span>方法</span><b>" + escapeHtml(record.spreadName || "传统占课") + "</b></div>",
      "</div>"
    ].join("");
  }

  function yaoRowMarkup(line, index, newestIndex) {
    const name = liuyaoData.lineNames[index];
    if (!line) {
      return [
        '<div class="yao-row is-placeholder">',
        "<span>" + escapeHtml(name) + "</span>",
        '<div class="yao-line is-yang"><span></span></div>',
        "<span>待摇</span>",
        "</div>"
      ].join("");
    }

    const lineBars = line.yang ? "<span></span>" : "<span></span><span></span>";
    const stateText = line.name + (line.changing ? " · 动" : "");
    return [
      '<div class="yao-row' + (line.yang ? " is-yang" : " is-yin") +
        (line.changing ? " is-changing" : "") +
        (index === newestIndex ? " is-new" : "") + '">',
      "<span>" + escapeHtml(name) + "</span>",
      '<div class="yao-line ' + (line.yang ? "is-yang" : "is-yin") + '">' + lineBars + "</div>",
      "<span>" + escapeHtml(stateText) + "</span>",
      "</div>"
    ].join("");
  }

  function hexagramVisualMarkup(lines, compact) {
    const rows = lines.map(function (yang) {
      const bars = yang ? "<span></span>" : "<span></span><span></span>";
      return '<div class="yao-line ' + (yang ? "is-yang" : "is-yin") + '">' + bars + "</div>";
    }).join("");
    return '<div class="hexagram-visual' + (compact ? " compact" : "") + '">' + rows + "</div>";
  }

  function renderLiurenHistory(record, container) {
    const result = record.result || {};
    const steps = Array.isArray(result.path) ? result.path : [];
    container.innerHTML = [
      '<div class="extra-history-detail">',
      historyMetaMarkup(record),
      "<h3>" + escapeHtml(record.question) + "</h3>",
      '<div class="extra-history-result"><b>最终落宫 · ' +
        escapeHtml(result.palaceName || record.resultName || "未记录") + "</b><p>" +
        escapeHtml((result.attribute || "") + " · " + ((result.keywords || []).join("、"))) + "</p></div>",
      steps.length ? '<div class="result-path">' + steps.map(function (item) {
        return "<div><span>" + escapeHtml(item.stageLabel || "") + "</span><b>" +
          escapeHtml(String(item.number || "") + " · " + (item.palaceName || "")) + "</b><small>三数路径</small></div>";
      }).join("") + "</div>" : "",
      '<div class="extra-history-summary">' + (record.summary || []).map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</div>",
      "</div>"
    ].join("");
  }

  function renderLiuyaoHistory(record, container) {
    const result = record.result || {};
    const lines = Array.isArray(result.lines) ? result.lines : [];
    const originalPattern = lines.map(function (line) { return line.yang ? 1 : 0; });
    const changedPattern = lines.map(function (line) {
      if (!line.changing) {
        return line.yang ? 1 : 0;
      }
      return line.yang ? 0 : 1;
    });
    const lineRows = lines.map(function (line, index) {
      return yaoRowMarkup(line, index, -1);
    }).join("");

    container.innerHTML = [
      '<div class="extra-history-detail">',
      historyMetaMarkup(record),
      "<h3>" + escapeHtml(record.question) + "</h3>",
      '<div class="extra-history-result"><b>' +
        escapeHtml(result.originalName || record.resultName || "六爻记录") + "</b><p>变卦：" +
        escapeHtml(result.changedName || "未记录") + " · 动爻 " +
        escapeHtml(String((result.changingIndexes || []).length)) + " 个</p></div>",
      lines.length ? '<div class="hexagram-pair">' +
        '<article class="hexagram-card">' + hexagramVisualMarkup(originalPattern, true) +
        "<div><h4>本卦</h4><p>" + escapeHtml(result.originalName || "") + "</p></div></article>" +
        '<article class="hexagram-card">' + hexagramVisualMarkup(changedPattern, true) +
        "<div><h4>变卦</h4><p>" + escapeHtml(result.changedName || "") + "</p></div></article>" +
        "</div>" : "",
      lines.length ? '<div class="hexagram-stack">' + lineRows + "</div>" : "",
      '<div class="extra-history-summary">' + (record.summary || []).map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</div>",
      "</div>"
    ].join("");
  }

  function renderHistoryDetail(record, container) {
    if (record.type === "liuren") {
      renderLiurenHistory(record, container);
      return true;
    }
    if (record.type === "liuyao") {
      renderLiuyaoHistory(record, container);
      return true;
    }
    return false;
  }

  /* ---------- 事件绑定 ---------- */

  function bindEvents() {
    document.addEventListener("click", function (event) {
      const moduleButton = event.target.closest("[data-module]");
      if (moduleButton) {
        activateModule(moduleButton.dataset.module);
        return;
      }

      const homeButton = event.target.closest("[data-home-module]");
      if (homeButton) {
        if (homeButton.hasAttribute("data-module")) {
          activateModule(homeButton.dataset.module);
        } else {
          showHome();
        }
      }
    });

    document.getElementById("brand-home").addEventListener("click", function () {
      activateModule("tarot");
    });
  }

  window.ExtraDivination = {
    renderHistoryDetail: renderHistoryDetail,
    activateModule: activateModule
  };

  bindEvents();
})();
