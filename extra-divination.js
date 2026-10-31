(function () {
  "use strict";

  const tarotApi = window.TarotApp;
  const liurenData = window.LIUREN_DATA;
  const liuyaoData = window.LIUYAO_DATA;

  if (!tarotApi || !liurenData || !liuyaoData) {
    return;
  }

  const escapeHtml = tarotApi.escapeHtml;
  const reducedMotion = function () {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  const elements = {
    tabs: Array.from(document.querySelectorAll(".module-tab")),
    homeCards: Array.from(document.querySelectorAll(".home-module-card")),
    liurenView: document.getElementById("view-liuren"),
    liuyaoView: document.getElementById("view-liuyao"),
    liurenStepper: document.getElementById("liuren-stepper"),
    liuyaoStepper: document.getElementById("liuyao-stepper"),
    liurenQuestion: document.getElementById("liuren-question"),
    liurenQuestionCount: document.getElementById("liuren-question-count"),
    liurenQuestionError: document.getElementById("liuren-question-error"),
    liurenTypes: document.getElementById("liuren-types"),
    liurenExamples: document.getElementById("liuren-examples"),
    liurenQuestionNext: document.getElementById("liuren-question-next"),
    liurenStepQuestion: document.getElementById("liuren-step-question"),
    liurenStepCast: document.getElementById("liuren-step-cast"),
    liurenStepResult: document.getElementById("liuren-step-result"),
    liurenCastTitle: document.getElementById("liuren-cast-title"),
    liurenCastStatus: document.getElementById("liuren-cast-status"),
    liurenWheel: document.getElementById("liuren-wheel"),
    liurenPath: document.getElementById("liuren-path"),
    liurenCastButton: document.getElementById("liuren-cast-button"),
    liurenCastBack: document.getElementById("liuren-cast-back"),
    liurenSkip: document.getElementById("liuren-skip"),
    liurenResult: document.getElementById("liuren-result"),
    liurenCopy: document.getElementById("liuren-copy"),
    liurenSave: document.getElementById("liuren-save"),
    liurenRestart: document.getElementById("liuren-restart"),
    liuyaoQuestion: document.getElementById("liuyao-question"),
    liuyaoQuestionCount: document.getElementById("liuyao-question-count"),
    liuyaoQuestionError: document.getElementById("liuyao-question-error"),
    liuyaoTypes: document.getElementById("liuyao-types"),
    liuyaoExamples: document.getElementById("liuyao-examples"),
    liuyaoQuestionNext: document.getElementById("liuyao-question-next"),
    liuyaoStepQuestion: document.getElementById("liuyao-step-question"),
    liuyaoStepCast: document.getElementById("liuyao-step-cast"),
    liuyaoStepResult: document.getElementById("liuyao-step-result"),
    liuyaoCastTitle: document.getElementById("liuyao-cast-title"),
    liuyaoCastStatus: document.getElementById("liuyao-cast-status"),
    liuyaoStack: document.getElementById("liuyao-stack"),
    liuyaoCount: document.getElementById("liuyao-count"),
    liuyaoLastResult: document.getElementById("liuyao-last-result"),
    coinStage: document.getElementById("coin-stage"),
    liuyaoCastButton: document.getElementById("liuyao-cast-button"),
    liuyaoAuto: document.getElementById("liuyao-auto"),
    liuyaoCastBack: document.getElementById("liuyao-cast-back"),
    liuyaoSkip: document.getElementById("liuyao-skip"),
    liuyaoResult: document.getElementById("liuyao-result"),
    liuyaoCopy: document.getElementById("liuyao-copy"),
    liuyaoSave: document.getElementById("liuyao-save"),
    liuyaoRestart: document.getElementById("liuyao-restart")
  };

  const liurenState = {
    question: "",
    type: "general",
    stage: 0,
    path: [],
    busy: false,
    pending: null,
    timer: null,
    skipAnimations: false,
    result: null,
    saved: false
  };

  const liuyaoState = {
    question: "",
    type: "general",
    lines: [],
    busy: false,
    pending: null,
    timer: null,
    skipAnimations: false,
    result: null,
    saved: false
  };

  const typeActions = {
    general: "先选择一个今天能够验证的小行动，让卦意回到现实条件。",
    career: "把解读落到职责、资源、协作和时间节点上，再决定是否推进。",
    study: "把解读转成一项具体学习调整，例如节奏、材料或复盘方式。",
    love: "先观察持续行动和真实沟通，不用一次卦象替关系下最终结论。",
    wealth: "涉及资金时以真实数据和风险承受力为准，避免因卦象放大冲动。",
    social: "先确认事实和彼此边界，再决定靠近、等待或保持距离。"
  };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function currentIso() {
    return new Date().toISOString();
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function renderChoiceButtons(container, typeMap, selected, attributeName) {
    if (!container) {
      return;
    }
    container.innerHTML = Object.keys(typeMap).map(function (key) {
      const type = typeMap[key];
      const selectedClass = key === selected ? " is-selected" : "";
      return [
        '<button class="choice-option' + selectedClass + '" type="button"',
        " " + attributeName + '="' + key + '"',
        ' aria-pressed="' + (key === selected ? "true" : "false") + '">',
        '<span aria-hidden="true">' + type.icon + "</span>",
        "<b>" + escapeHtml(type.label) + "</b>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderExamples(container, examples, attributeName) {
    if (!container) {
      return;
    }
    container.innerHTML = examples.map(function (question) {
      return '<button class="example-chip" type="button" ' + attributeName + '="' +
        escapeHtml(question) + '">' + escapeHtml(question) + "</button>";
    }).join("");
  }

  function activateModule(name) {
    elements.tabs.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.module === name);
    });
    elements.homeCards.forEach(function (button) {
      button.classList.toggle("is-selected", button.dataset.module === name);
    });

    const isTarot = name === "tarot";
    elements.liurenView.hidden = name !== "liuren";
    elements.liuyaoView.hidden = name !== "liuyao";

    if (isTarot) {
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

  function setMiniStep(stepper, activeStep) {
    const order = ["question", "cast", "result"];
    const activeIndex = order.indexOf(activeStep);
    stepper.querySelectorAll(".mini-step").forEach(function (item) {
      const itemIndex = order.indexOf(item.dataset.step);
      item.classList.toggle("is-active", item.dataset.step === activeStep);
      item.classList.toggle("is-done", itemIndex < activeIndex);
      item.setAttribute("aria-current", item.dataset.step === activeStep ? "step" : "false");
    });
  }

  function setLiurenStep(stepName) {
    elements.liurenStepQuestion.hidden = stepName !== "question";
    elements.liurenStepCast.hidden = stepName !== "cast";
    elements.liurenStepResult.hidden = stepName !== "result";
    setMiniStep(elements.liurenStepper, stepName);
  }

  function setLiuyaoStep(stepName) {
    elements.liuyaoStepQuestion.hidden = stepName !== "question";
    elements.liuyaoStepCast.hidden = stepName !== "cast";
    elements.liuyaoStepResult.hidden = stepName !== "result";
    setMiniStep(elements.liuyaoStepper, stepName);
  }

  function validateQuestion(input, errorElement) {
    const question = input.value.trim();
    if (question.length < 4) {
      errorElement.textContent = "请至少写下 4 个字，让占问更具体。";
      input.focus();
      return "";
    }
    errorElement.textContent = "";
    return question;
  }

  function copyText(text) {
    const fallback = function () {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }
      document.body.removeChild(textarea);
      tarotApi.showToast(copied ? "解读文本已复制。" : "当前浏览器无法自动复制，请手动选择文本。");
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        tarotApi.showToast("解读文本已复制。");
      }).catch(fallback);
      return;
    }
    fallback();
  }

  function renderLiurenTypes() {
    renderChoiceButtons(elements.liurenTypes, liurenData.types, liurenState.type, "data-liuren-type");
  }

  function renderLiurenExamples() {
    const examples = liurenData.examples[liurenState.type] || liurenData.examples.general;
    renderExamples(elements.liurenExamples, examples, "data-liuren-example");
  }

  function renderLiuyaoTypes() {
    renderChoiceButtons(elements.liuyaoTypes, liuyaoData.types, liuyaoState.type, "data-liuyao-type");
  }

  function renderLiuyaoExamples() {
    const examples = liuyaoData.examples[liuyaoState.type] || liuyaoData.examples.general;
    renderExamples(elements.liuyaoExamples, examples, "data-liuyao-example");
  }

  function renderLiurenWheel() {
    elements.liurenWheel.querySelectorAll(".palace-node").forEach(function (node) {
      node.remove();
    });

    liurenData.palaces.forEach(function (palace, index) {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      const node = document.createElement("div");
      node.className = "palace-node";
      node.dataset.palaceIndex = String(index);
      node.style.left = (50 + Math.cos(angle) * 36) + "%";
      node.style.top = (50 + Math.sin(angle) * 36) + "%";
      node.innerHTML = "<b>" + escapeHtml(palace.name) + "</b><small>" +
        escapeHtml(palace.element + " · " + palace.short) + "</small>";
      elements.liurenWheel.appendChild(node);
    });

    const finalIndex = liurenState.path.length
      ? liurenState.path[liurenState.path.length - 1].palaceIndex
      : -1;
    const visited = new Set(liurenState.path.map(function (item) { return item.palaceIndex; }));
    elements.liurenWheel.querySelectorAll(".palace-node").forEach(function (node) {
      const index = Number(node.dataset.palaceIndex);
      node.classList.toggle("is-visited", visited.has(index));
      node.classList.toggle("is-current", index === finalIndex);
    });
  }

  function renderLiurenPath() {
    if (!liurenState.path.length) {
      elements.liurenPath.innerHTML = '<div class="path-placeholder">三数尚未落宫</div>';
      return;
    }
    elements.liurenPath.innerHTML = liurenState.path.map(function (item) {
      const palace = liurenData.palaces[item.palaceIndex];
      return [
        '<div class="path-item">',
        "<span>" + escapeHtml(palace.symbol) + "</span>",
        "<div><b>" + escapeHtml(item.stageLabel + " · " + item.number + "数落" + palace.name) + "</b>",
        "<small>" + escapeHtml(palace.attribute + " · " + palace.keywords.slice(0, 2).join("、")) + "</small></div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function updateLiurenCastControls() {
    const labels = ["定月宫", "定日宫", "定时宫"];
    elements.liurenCastButton.disabled = liurenState.busy;
    if (liurenState.stage >= 3) {
      elements.liurenCastButton.textContent = "查看解课结果";
      elements.liurenCastButton.disabled = false;
      elements.liurenCastTitle.textContent = "三宫已定";
      return;
    }
    elements.liurenCastButton.textContent = labels[liurenState.stage];
    elements.liurenCastTitle.textContent = "先定" + labels[liurenState.stage].slice(1);
  }

  function resetLiurenCast() {
    window.clearTimeout(liurenState.timer);
    liurenState.stage = 0;
    liurenState.path = [];
    liurenState.busy = false;
    liurenState.pending = null;
    liurenState.result = null;
    liurenState.saved = false;
    elements.liurenCastButton.disabled = false;
    elements.liurenCastStatus.textContent = "静心片刻，点击下方按钮完成第一次落宫。";
    elements.liurenResult.innerHTML = "";
    elements.liurenSave.disabled = false;
    elements.liurenSave.textContent = "保存本次记录";
    renderLiurenWheel();
    renderLiurenPath();
    updateLiurenCastControls();
  }

  function animateLiurenPalace(index) {
    elements.liurenWheel.querySelectorAll(".palace-node").forEach(function (node) {
      node.classList.remove("is-active-step");
    });
    const node = elements.liurenWheel.querySelector('[data-palace-index="' + index + '"]');
    if (node && !reducedMotion() && !liurenState.skipAnimations) {
      node.classList.add("is-active-step");
      window.setTimeout(function () {
        node.classList.remove("is-active-step");
      }, 700);
    }
  }

  function finishLiurenPending() {
    if (!liurenState.pending) {
      return;
    }
    window.clearTimeout(liurenState.timer);
    const pending = liurenState.pending;
    liurenState.pending = null;
    liurenState.busy = false;
    liurenState.path.push({
      stageIndex: liurenState.stage,
      stageLabel: ["月数", "日数", "时数"][liurenState.stage],
      number: pending.number,
      palaceIndex: pending.palaceIndex
    });
    liurenState.stage += 1;
    renderLiurenWheel();
    renderLiurenPath();
    updateLiurenCastControls();

    if (liurenState.stage >= 3) {
      elements.liurenCastStatus.textContent = "月、日、时三数已经落宫。结果暂不自动展示，请确认后再查看。";
    } else {
      elements.liurenCastStatus.textContent = "本次落位已记录。继续完成下一次落宫。";
    }
  }

  function castLiurenStep() {
    if (liurenState.stage >= 3) {
      showLiurenResult();
      return;
    }
    if (liurenState.busy) {
      return;
    }

    const number = randomInt(1, 6);
    const previousIndex = liurenState.path.length
      ? liurenState.path[liurenState.path.length - 1].palaceIndex
      : 0;
    const palaceIndex = (previousIndex + number - 1) % 6;
    liurenState.pending = { number: number, palaceIndex: palaceIndex };
    liurenState.busy = true;
    elements.liurenCastButton.disabled = true;
    animateLiurenPalace(palaceIndex);
    elements.liurenCastStatus.textContent = "第 " + (liurenState.stage + 1) +
      " 次数为 " + number + "，正在落入宫殿。";

    const duration = reducedMotion() || liurenState.skipAnimations ? 60 : 640;
    liurenState.timer = window.setTimeout(finishLiurenPending, duration);
  }

  function skipLiurenAnimation() {
    liurenState.skipAnimations = true;
    if (liurenState.pending) {
      finishLiurenPending();
      elements.liurenCastStatus.textContent = "已跳过动画，本次落宫结果已经完成。";
    } else {
      tarotApi.showToast("后续起课动画将快速完成。");
    }
  }

  function buildLiurenResult() {
    const finalStep = liurenState.path[2];
    const palace = liurenData.palaces[finalStep.palaceIndex];
    const type = liurenData.types[liurenState.type] || liurenData.types.general;
    const areaText = palace.areas[liurenState.type] || palace.areas.general;
    const pathText = liurenState.path.map(function (item) {
      return ["月数", "日数", "时数"][item.stageIndex] + " " + item.number + " → " +
        liurenData.palaces[item.palaceIndex].name;
    }).join("；");
    const summary = [
      type.opening + "你占问的是：“" + liurenState.question + "”。",
      "三数路径为：" + pathText + "。最终落宫为“" + palace.name + "”，五行属" +
        palace.element + "，主要关键词是" + palace.keywords.join("、") + "。",
      "断课提示：" + palace.judgment + areaText,
      "行动建议：" + palace.advice + typeActions[liurenState.type]
    ];

    return {
      palaceId: palace.id,
      palaceName: palace.name,
      element: palace.element,
      attribute: palace.attribute,
      keywords: palace.keywords.slice(),
      judgment: palace.judgment,
      advice: palace.advice,
      areaText: areaText,
      summary: summary,
      path: liurenState.path.map(function (item) {
        return {
          stageIndex: item.stageIndex,
          stageLabel: item.stageLabel,
          number: item.number,
          palaceIndex: item.palaceIndex,
          palaceName: liurenData.palaces[item.palaceIndex].name
        };
      })
    };
  }

  function renderLiurenResult() {
    const result = liurenState.result;
    const pathMarkup = result.path.map(function (item) {
      return [
        "<div>",
        "<span>" + escapeHtml(item.stageLabel) + "</span>",
        "<b>" + escapeHtml(item.number + " · " + item.palaceName) + "</b>",
        "<small>第 " + (item.stageIndex + 1) + " 次落宫</small>",
        "</div>"
      ].join("");
    }).join("");

    elements.liurenResult.innerHTML = [
      '<article class="result-hero">',
      "<div>",
      '<p class="eyebrow">最终落宫</p>',
      "<h3>" + escapeHtml(result.palaceName) + "</h3>",
      "<p>" + escapeHtml(liurenData.types[liurenState.type].label + "占问 · " + result.attribute) + "</p>",
      '<div class="result-tags">' + result.keywords.map(function (keyword) {
        return "<span>" + escapeHtml(keyword) + "</span>";
      }).join("") + "</div>",
      "</div>",
      '<div class="result-seal">' + escapeHtml(result.palaceName.slice(0, 1)) + "<br>" +
        escapeHtml(result.element) + "</div>",
      "</article>",
      '<section class="result-section"><h4>三数路径</h4><div class="result-path">' +
        pathMarkup + "</div></section>",
      '<section class="result-section"><h4>综合解课</h4>' + result.summary.map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</section>",
      '<section class="result-section"><h4>宫位断语</h4><p>' +
        escapeHtml(result.judgment) + "</p><p>" + escapeHtml(result.areaText) + "</p></section>"
    ].join("");
  }

  function showLiurenResult() {
    if (liurenState.path.length !== 3) {
      tarotApi.showToast("请先完成三次落宫。");
      return;
    }
    liurenState.result = buildLiurenResult();
    liurenState.saved = false;
    elements.liurenSave.disabled = false;
    elements.liurenSave.textContent = "保存本次记录";
    renderLiurenResult();
    setLiurenStep("result");
  }

  function saveLiurenResult() {
    if (!liurenState.result || liurenState.saved) {
      return;
    }
    const record = {
      id: tarotApi.createRecordId(),
      type: "liuren",
      createdAt: currentIso(),
      question: liurenState.question,
      questionType: liurenState.type,
      questionTypeLabel: liurenData.types[liurenState.type].label,
      resultName: liurenState.result.palaceName,
      spreadName: "小六壬三数起课",
      summary: liurenState.result.summary.slice(),
      result: liurenState.result
    };

    if (!tarotApi.addHistoryRecord(record)) {
      return;
    }
    liurenState.saved = true;
    elements.liurenSave.disabled = true;
    elements.liurenSave.textContent = "已保存到历史记录";
    tarotApi.showToast("小六壬占课已保存。");
  }

  function liurenCopyText() {
    if (!liurenState.result) {
      return;
    }
    const text = [
      "星夜三占 · 小六壬占课",
      "问题：" + liurenState.question,
      "类型：" + liurenData.types[liurenState.type].label,
      "最终落宫：" + liurenState.result.palaceName,
      "关键词：" + liurenState.result.keywords.join("、"),
      "",
      liurenState.result.summary.join("\n\n"),
      "",
      "本工具仅供传统文化体验、娱乐与自我反思，不构成专业建议。"
    ].join("\n");
    copyText(text);
  }

  function restartLiuren() {
    resetLiurenCast();
    setLiurenStep("question");
    elements.liurenQuestion.focus();
  }

  function tossThreeCoins() {
    const coins = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5];
    const heads = coins.filter(Boolean).length;
    const value = 6 + heads;
    const yang = value === 7 || value === 9;
    const changing = value === 6 || value === 9;
    const name = value === 6 ? "老阴" : value === 7 ? "少阳" : value === 8 ? "少阴" : "老阳";

    return {
      coins: coins,
      heads: heads,
      value: value,
      name: name,
      yang: yang,
      changing: changing
    };
  }

  function renderCoinVisual(result) {
    Array.from(elements.coinStage.children).forEach(function (coin, index) {
      const isHead = result.coins[index];
      coin.className = "coin coin-" + (index + 1) + (isHead ? " is-yang" : " is-yin");
      coin.textContent = isHead ? "阳" : "阴";
    });
  }

  function resetCoinVisual() {
    Array.from(elements.coinStage.children).forEach(function (coin, index) {
      coin.className = "coin coin-" + (index + 1);
      coin.textContent = ["乾", "坤", "易"][index];
    });
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

  function renderLiuyaoStack(newestIndex) {
    const rows = [];
    for (let index = 0; index < 6; index += 1) {
      rows.push(yaoRowMarkup(liuyaoState.lines[index], index, newestIndex));
    }
    elements.liuyaoStack.innerHTML = rows.join("");
  }

  function updateLiuyaoControls() {
    const count = liuyaoState.lines.length;
    setText(elements.liuyaoCount, String(count));
    elements.liuyaoAuto.disabled = liuyaoState.busy || count >= 6;
    if (count >= 6) {
      elements.liuyaoCastButton.disabled = false;
      elements.liuyaoCastButton.textContent = "查看解卦结果";
      elements.liuyaoCastTitle.textContent = "六爻已成";
    } else {
      elements.liuyaoCastButton.disabled = liuyaoState.busy;
      elements.liuyaoCastButton.textContent = "摇第" + (count + 1) + "爻";
      elements.liuyaoCastTitle.textContent = "摇第" + (count + 1) + "爻";
    }
  }

  function resetLiuyaoCast() {
    window.clearTimeout(liuyaoState.timer);
    liuyaoState.lines = [];
    liuyaoState.busy = false;
    liuyaoState.pending = null;
    liuyaoState.result = null;
    liuyaoState.saved = false;
    elements.liuyaoLastResult.textContent = "尚未起卦";
    elements.liuyaoCastStatus.textContent = "点击摇卦，三枚铜钱会生成一条由下至上的爻线。";
    elements.liuyaoResult.innerHTML = "";
    elements.liuyaoSave.disabled = false;
    elements.liuyaoSave.textContent = "保存本次记录";
    resetCoinVisual();
    renderLiuyaoStack(-1);
    updateLiuyaoControls();
  }

  function finishLiuyaoPending() {
    if (!liuyaoState.pending) {
      return;
    }
    window.clearTimeout(liuyaoState.timer);
    const pending = liuyaoState.pending;
    liuyaoState.pending = null;
    liuyaoState.busy = false;
    const line = {
      value: pending.value,
      name: pending.name,
      yang: pending.yang,
      changing: pending.changing
    };
    liuyaoState.lines.push(line);
    elements.coinStage.classList.remove("is-tossing");
    elements.liuyaoLastResult.textContent = liuyaoData.lineNames[liuyaoState.lines.length - 1] +
      "：" + line.name + " " + line.value + (line.changing ? "，动爻" : "");
    renderLiuyaoStack(liuyaoState.lines.length - 1);
    updateLiuyaoControls();

    if (liuyaoState.lines.length >= 6) {
      elements.liuyaoCastStatus.textContent = "六爻已经由下至上摇完，请确认后查看本卦、动爻与变卦。";
    } else {
      elements.liuyaoCastStatus.textContent = "第 " + liuyaoState.lines.length +
        " 爻已经完成，继续摇下一爻。";
    }
  }

  function castLiuyaoLine() {
    if (liuyaoState.lines.length >= 6) {
      showLiuyaoResult();
      return;
    }
    if (liuyaoState.busy) {
      return;
    }

    const result = tossThreeCoins();
    liuyaoState.pending = result;
    liuyaoState.busy = true;
    renderCoinVisual(result);
    elements.coinStage.classList.remove("is-tossing");
    void elements.coinStage.offsetWidth;
    elements.coinStage.classList.add("is-tossing");
    elements.liuyaoCastButton.disabled = true;
    elements.liuyaoAuto.disabled = true;
    elements.liuyaoCastStatus.textContent = "第 " + (liuyaoState.lines.length + 1) +
      " 爻正在摇动，三枚铜钱已经落下。";

    const duration = reducedMotion() || liuyaoState.skipAnimations ? 60 : 680;
    liuyaoState.timer = window.setTimeout(finishLiuyaoPending, duration);
  }

  function skipLiuyaoAnimation() {
    liuyaoState.skipAnimations = true;
    if (liuyaoState.pending) {
      finishLiuyaoPending();
      elements.liuyaoCastStatus.textContent = "已跳过动画，本爻结果已经记录。";
    } else {
      tarotApi.showToast("后续摇卦动画将快速完成。");
    }
  }

  function autoCompleteLiuyao() {
    if (liuyaoState.pending) {
      finishLiuyaoPending();
    }
    while (liuyaoState.lines.length < 6) {
      const result = tossThreeCoins();
      liuyaoState.lines.push({
        value: result.value,
        name: result.name,
        yang: result.yang,
        changing: result.changing
      });
    }
    elements.liuyaoLastResult.textContent = "六爻已自动完成";
    elements.liuyaoCastStatus.textContent = "六爻已经自动摇完。结果不会自动跳转，请确认后查看解卦。";
    renderLiuyaoStack(5);
    updateLiuyaoControls();
  }

  function linesEqual(left, right) {
    return left.length === right.length && left.every(function (value, index) {
      return value === right[index];
    });
  }

  function trigramByLines(lines) {
    return Object.keys(liuyaoData.trigrams).map(function (key) {
      return liuyaoData.trigrams[key];
    }).find(function (trigram) {
      return linesEqual(lines, trigram.lines);
    });
  }

  function hexagramByLines(lines) {
    const lower = trigramByLines(lines.slice(0, 3));
    const upper = trigramByLines(lines.slice(3, 6));
    if (!lower || !upper) {
      return null;
    }
    return liuyaoData.hexagrams[upper.id + ":" + lower.id] || null;
  }

  function hexagramVisualMarkup(lines, compact) {
    const rows = lines.map(function (yang) {
      const bars = yang ? "<span></span>" : "<span></span><span></span>";
      return '<div class="yao-line ' + (yang ? "is-yang" : "is-yin") + '">' + bars + "</div>";
    }).join("");
    return '<div class="hexagram-visual' + (compact ? " compact" : "") + '">' + rows + "</div>";
  }

  function buildLiuyaoResult() {
    const originalPattern = liuyaoState.lines.map(function (line) { return line.yang ? 1 : 0; });
    const changedPattern = liuyaoState.lines.map(function (line) {
      if (!line.changing) {
        return line.yang ? 1 : 0;
      }
      return line.yang ? 0 : 1;
    });
    const original = hexagramByLines(originalPattern);
    const changed = hexagramByLines(changedPattern);
    const changingIndexes = liuyaoState.lines.reduce(function (indexes, line, index) {
      if (line.changing) {
        indexes.push(index);
      }
      return indexes;
    }, []);
    const type = liuyaoData.types[liuyaoState.type] || liuyaoData.types.general;
    const changingText = changingIndexes.length
      ? "动爻位于" + changingIndexes.map(function (index) {
        return liuyaoData.lineNames[index];
      }).join("、") + "。变卦为“" + changed.name + "”，提示事情会从本卦的条件向这一方向转化。"
      : "本卦没有动爻，表示当前结构相对稳定，宜以本卦主旨和现实条件为主。";
    const summary = [
      type.opening + "你占问的是：“" + liuyaoState.question + "”。",
      "本卦为第 " + original.number + " 卦“" + original.name + "”，上卦为" +
        liuyaoData.trigrams[original.upper].name + "，下卦为" +
        liuyaoData.trigrams[original.lower].name + "。" + original.brief,
      changingText,
      "综合观察：" + original.brief + (changed.key !== original.key ?
        " 变卦“" + changed.name + "”进一步提示：" + changed.brief : "") +
        typeActions[liuyaoState.type]
    ];

    return {
      originalKey: original.key,
      originalName: original.name,
      originalNumber: original.number,
      originalUpper: original.upper,
      originalLower: original.lower,
      changedKey: changed.key,
      changedName: changed.name,
      changedNumber: changed.number,
      changedUpper: changed.upper,
      changedLower: changed.lower,
      changingIndexes: changingIndexes,
      lines: liuyaoState.lines.map(function (line) {
        return {
          value: line.value,
          name: line.name,
          yang: line.yang,
          changing: line.changing
        };
      }),
      summary: summary
    };
  }

  function renderLiuyaoResult() {
    const result = liuyaoState.result;
    const originalTrigramText = liuyaoData.trigrams[result.originalUpper].symbol + " " +
      liuyaoData.trigrams[result.originalUpper].nature + " / " +
      liuyaoData.trigrams[result.originalLower].symbol + " " +
      liuyaoData.trigrams[result.originalLower].nature;
    const changedTrigramText = liuyaoData.trigrams[result.changedUpper].symbol + " " +
      liuyaoData.trigrams[result.changedUpper].nature + " / " +
      liuyaoData.trigrams[result.changedLower].symbol + " " +
      liuyaoData.trigrams[result.changedLower].nature;
    const lineRows = liuyaoState.lines.map(function (line, index) {
      return yaoRowMarkup(line, index, -1);
    }).join("");

    elements.liuyaoResult.innerHTML = [
      '<article class="hexagram-result-hero">',
      "<div>",
      '<p class="eyebrow">本卦 · 第 ' + result.originalNumber + " 卦</p>",
      "<h3>" + escapeHtml(result.originalName) + "</h3>",
      "<p>" + escapeHtml(originalTrigramText + " · " + liuyaoData.types[liuyaoState.type].label + "占问") + "</p>",
      '<div class="hexagram-tags">',
      "<span>本卦 " + escapeHtml(result.originalName) + "</span>",
      "<span>变卦 " + escapeHtml(result.changedName) + "</span>",
      "<span>动爻 " + result.changingIndexes.length + " 个</span>",
      "</div>",
      "</div>",
      '<div class="result-seal">六爻<br>成卦</div>',
      "</article>",
      '<section class="result-section"><h4>六爻原象</h4><div class="liuyao-cast-layout">' +
        '<div class="hexagram-stack result-stack">' + lineRows + "</div>" +
        '<div class="cast-copy"><div class="cast-progress"><b>' +
        escapeHtml(String(6 - result.changingIndexes.length)) + "</b><span>/ 6 静爻</span></div>" +
        "<p>" + escapeHtml(result.changingIndexes.length ? "红色爻线为动爻" : "本次没有动爻") + "</p></div></div></section>",
      '<section class="result-section"><h4>本卦与变卦</h4><div class="hexagram-pair">',
      '<article class="hexagram-card">' + hexagramVisualMarkup(
        result.lines.map(function (line) { return line.yang ? 1 : 0; }), true
      ) + "<div><h4>" + escapeHtml(result.originalName) + "</h4><p>" +
        escapeHtml(originalTrigramText + "。" + liuyaoData.hexagrams[result.originalKey].brief) + "</p></div></article>",
      '<article class="hexagram-card">' + hexagramVisualMarkup(
        result.lines.map(function (line) {
          if (!line.changing) {
            return line.yang ? 1 : 0;
          }
          return line.yang ? 0 : 1;
        }), true
      ) + "<div><h4>" + escapeHtml(result.changedName) + "</h4><p>" +
        escapeHtml(changedTrigramText + "。" + liuyaoData.hexagrams[result.changedKey].brief) + "</p></div></article>",
      "</div></section>",
      '<section class="result-section"><h4>综合解卦</h4>' + result.summary.map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</section>"
    ].join("");
  }

  function showLiuyaoResult() {
    if (liuyaoState.lines.length !== 6) {
      tarotApi.showToast("请先完成六次摇卦。");
      return;
    }
    liuyaoState.result = buildLiuyaoResult();
    liuyaoState.saved = false;
    elements.liuyaoSave.disabled = false;
    elements.liuyaoSave.textContent = "保存本次记录";
    renderLiuyaoResult();
    setLiuyaoStep("result");
  }

  function saveLiuyaoResult() {
    if (!liuyaoState.result || liuyaoState.saved) {
      return;
    }
    const result = liuyaoState.result;
    const record = {
      id: tarotApi.createRecordId(),
      type: "liuyao",
      createdAt: currentIso(),
      question: liuyaoState.question,
      questionType: liuyaoState.type,
      questionTypeLabel: liuyaoData.types[liuyaoState.type].label,
      resultName: result.originalName + (result.changedKey !== result.originalKey ? " → " + result.changedName : ""),
      spreadName: "三枚铜钱六爻起卦",
      summary: result.summary.slice(),
      result: result
    };

    if (!tarotApi.addHistoryRecord(record)) {
      return;
    }
    liuyaoState.saved = true;
    elements.liuyaoSave.disabled = true;
    elements.liuyaoSave.textContent = "已保存到历史记录";
    tarotApi.showToast("六爻起卦已保存。");
  }

  function liuyaoCopyText() {
    if (!liuyaoState.result) {
      return;
    }
    const result = liuyaoState.result;
    const text = [
      "星夜三占 · 六爻起卦",
      "问题：" + liuyaoState.question,
      "类型：" + liuyaoData.types[liuyaoState.type].label,
      "本卦：" + result.originalName,
      "变卦：" + result.changedName,
      "动爻：" + (result.changingIndexes.length
        ? result.changingIndexes.map(function (index) { return liuyaoData.lineNames[index]; }).join("、")
        : "无"),
      "",
      result.summary.join("\n\n"),
      "",
      "本工具仅供传统文化体验、娱乐与自我反思，不构成专业建议。"
    ].join("\n");
    copyText(text);
  }

  function restartLiuyao() {
    resetLiuyaoCast();
    setLiuyaoStep("question");
    elements.liuyaoQuestion.focus();
  }

  function historyMetaMarkup(record) {
    return [
      '<div class="detail-meta">',
      "<div><span>时间</span><b>" + escapeHtml(tarotApi.formatDate(record.createdAt)) + "</b></div>",
      "<div><span>类型</span><b>" + escapeHtml(record.questionTypeLabel || "综合") + "</b></div>",
      "<div><span>方法</span><b>" + escapeHtml(record.spreadName || "传统占课") + "</b></div>",
      "</div>"
    ].join("");
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

    if (elements.liurenQuestionNext && elements.liurenCastButton) {
      elements.liurenQuestion.addEventListener("input", function () {
        setText(elements.liurenQuestionCount, String(elements.liurenQuestion.value.length));
        elements.liurenQuestionError.textContent = "";
      });

      elements.liurenTypes.addEventListener("click", function (event) {
        const button = event.target.closest("[data-liuren-type]");
        if (!button) {
          return;
        }
        liurenState.type = button.dataset.liurenType;
        renderLiurenTypes();
        renderLiurenExamples();
      });

      elements.liurenExamples.addEventListener("click", function (event) {
        const button = event.target.closest("[data-liuren-example]");
        if (!button) {
          return;
        }
        elements.liurenQuestion.value = button.dataset.liurenExample;
        setText(elements.liurenQuestionCount, String(elements.liurenQuestion.value.length));
        elements.liurenQuestion.focus();
      });

      elements.liurenQuestionNext.addEventListener("click", function () {
        const question = validateQuestion(elements.liurenQuestion, elements.liurenQuestionError);
        if (!question) {
          return;
        }
        liurenState.question = question;
        resetLiurenCast();
        setLiurenStep("cast");
      });

      elements.liurenCastButton.addEventListener("click", castLiurenStep);
      elements.liurenSkip.addEventListener("click", skipLiurenAnimation);
      elements.liurenCastBack.addEventListener("click", function () {
        setLiurenStep("question");
      });
      elements.liurenRestart.addEventListener("click", restartLiuren);
      elements.liurenSave.addEventListener("click", saveLiurenResult);
      elements.liurenCopy.addEventListener("click", liurenCopyText);
    }

    if (elements.liuyaoQuestion && !document.getElementById("liuyao-enhanced-marker")) {
      elements.liuyaoQuestion.addEventListener("input", function () {
        setText(elements.liuyaoQuestionCount, String(elements.liuyaoQuestion.value.length));
        elements.liuyaoQuestionError.textContent = "";
      });

      elements.liuyaoTypes.addEventListener("click", function (event) {
        const button = event.target.closest("[data-liuyao-type]");
        if (!button) {
          return;
        }
        liuyaoState.type = button.dataset.liuyaoType;
        renderLiuyaoTypes();
        renderLiuyaoExamples();
      });

      elements.liuyaoExamples.addEventListener("click", function (event) {
        const button = event.target.closest("[data-liuyao-example]");
        if (!button) {
          return;
        }
        elements.liuyaoQuestion.value = button.dataset.liuyaoExample;
        setText(elements.liuyaoQuestionCount, String(elements.liuyaoQuestion.value.length));
        elements.liuyaoQuestion.focus();
      });

      elements.liuyaoQuestionNext.addEventListener("click", function () {
        const question = validateQuestion(elements.liuyaoQuestion, elements.liuyaoQuestionError);
        if (!question) {
          return;
        }
        liuyaoState.question = question;
        resetLiuyaoCast();
        setLiuyaoStep("cast");
      });

      elements.liuyaoCastButton.addEventListener("click", castLiuyaoLine);
      elements.liuyaoAuto.addEventListener("click", autoCompleteLiuyao);
      elements.liuyaoSkip.addEventListener("click", skipLiuyaoAnimation);
      elements.liuyaoCastBack.addEventListener("click", function () {
        setLiuyaoStep("question");
      });
      elements.liuyaoRestart.addEventListener("click", restartLiuyao);
      elements.liuyaoSave.addEventListener("click", saveLiuyaoResult);
      elements.liuyaoCopy.addEventListener("click", liuyaoCopyText);
    }
  }

  function init() {
    const legacyLiuren = !document.getElementById("liuren-enhanced-marker");
    if (legacyLiuren) {
      renderLiurenTypes();
      renderLiurenExamples();
      renderLiurenWheel();
      renderLiurenPath();
      resetLiurenCast();
      setLiurenStep("question");
    }
    const legacyLiuyao = !document.getElementById("liuyao-enhanced-marker");
    if (legacyLiuyao) {
      renderLiuyaoTypes();
      renderLiuyaoExamples();
      resetLiuyaoCast();
      setLiuyaoStep("question");
    }
    bindEvents();
  }

  window.ExtraDivination = {
    renderHistoryDetail: renderHistoryDetail,
    activateModule: activateModule
  };

  init();
})();
