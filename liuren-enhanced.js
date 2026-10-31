/* 小六壬增强版：时间起课、报数起课、完整计算过程与统一历史记录。 */
(function () {
  "use strict";

  const tarotApi = window.TarotApp;
  const data = window.LIUREN_DATA;
  const view = document.getElementById("view-liuren");
  const previousExtra = window.ExtraDivination;
  const previousHistoryRenderer = previousExtra && previousExtra.renderHistoryDetail;

  if (!tarotApi || !data || !view) {
    return;
  }

  const escapeHtml = tarotApi.escapeHtml;
  const palaces = data.palaces;
  const hourOptions = [
    { label: "子时（23:00-00:59）", index: 0 },
    { label: "丑时（01:00-02:59）", index: 1 },
    { label: "寅时（03:00-04:59）", index: 2 },
    { label: "卯时（05:00-06:59）", index: 3 },
    { label: "辰时（07:00-08:59）", index: 4 },
    { label: "巳时（09:00-10:59）", index: 5 },
    { label: "午时（11:00-12:59）", index: 6 },
    { label: "未时（13:00-14:59）", index: 7 },
    { label: "申时（15:00-16:59）", index: 8 },
    { label: "酉时（17:00-18:59）", index: 9 },
    { label: "戌时（19:00-20:59）", index: 10 },
    { label: "亥时（21:00-22:59）", index: 11 }
  ];

  const state = {
    question: "",
    type: "general",
    method: "",
    time: {
      month: 1,
      day: 1,
      hourIndex: 0,
      confirmed: false,
      source: "manual"
    },
    numbers: ["", "", ""],
    calculation: null,
    result: null,
    saved: false,
    revealTimers: [],
    step: "question"
  };

  const elements = {};

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function currentIso() {
    return new Date().toISOString();
  }

  function parseIntOrNull(value) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sequenceFrom(startIndex, count) {
    const result = [];
    for (let index = 0; index < count; index += 1) {
      result.push((startIndex + index) % 6);
    }
    return result;
  }

  function compactSequence(startIndex, count) {
    if (count <= 7) {
      return sequenceFrom(startIndex, count);
    }
    const first = [0, 1, 2].map(function (offset) {
      return (startIndex + offset) % 6;
    });
    const last = [0, 1, 2].map(function (offset) {
      return (startIndex + count - 3 + offset) % 6;
    });
    return first.concat([-1]).concat(last);
  }

  function sequenceMarkup(startIndex, count) {
    return compactSequence(startIndex, count).map(function (index) {
      if (index === -1) {
        return '<span class="ellipsis">…</span>';
      }
      return "<span>" + escapeHtml(palaces[index].name) + "</span>";
    }).join("");
  }

  function fortuneClass(fortune) {
    if (fortune === "吉") {
      return "good";
    }
    if (fortune === "凶") {
      return "caution";
    }
    return "neutral";
  }

  function typeLabel() {
    return data.types[state.type] ? data.types[state.type].label : "综合";
  }

  function renderShell() {
    view.innerHTML = [
      '<div class="section-heading">',
      '<p class="eyebrow">XIAO LIU REN · 六宫占课</p>',
      "<h2>小六壬占课</h2>",
      "<p>从提问、选择起课方式，到查看每一步落宫计算和最终三宫解读。</p>",
      "</div>",
      '<nav class="mini-stepper" id="liuren2-stepper" aria-label="小六壬进度">',
      '<div class="mini-step is-active" data-step="question"><span>1</span><b>提问</b></div>',
      '<div class="mini-step" data-step="method"><span>2</span><b>方式</b></div>',
      '<div class="mini-step" data-step="calculate"><span>3</span><b>计算</b></div>',
      '<div class="mini-step" data-step="result"><span>4</span><b>解课</b></div>',
      "</nav>",
      '<div class="extra-step" id="liuren2-step-question">',
      '<div class="form-block">',
      '<label for="liuren2-question">你想占问的事情</label>',
      '<textarea id="liuren2-question" rows="4" maxlength="160" placeholder="例如：这次工作变动是否值得推进？"></textarea>',
      '<div class="field-meta"><span class="field-error" id="liuren2-question-error" role="alert"></span>',
      '<span><b id="liuren2-question-count">0</b>/160</span></div>',
      "</div>",
      '<fieldset class="choice-group"><legend>占问类型</legend><div class="choice-grid extra-choice-grid" id="liuren2-types"></div></fieldset>',
      '<div class="example-block"><div class="subheading"><h3>示例问题</h3><span>点击即可填入</span></div><div class="example-list" id="liuren2-examples"></div></div>',
      '<p class="method-hint">小六壬为传统民俗简化方法，仅供文化体验与自我反思。</p>',
      '<div class="view-actions"><button class="text-button" type="button" data-home-module>返回首页</button><button class="primary-button" id="liuren2-question-next" type="button">选择起课方式 <span aria-hidden="true">→</span></button></div>',
      "</div>",
      '<div class="extra-step" id="liuren2-step-method" hidden>',
      '<div class="cast-intro"><div><p class="eyebrow">STEP 02 · 选择起课方式</p><h3>时间起课或报数起课</h3><p>确定方式后先计算宫位，再单独查看三宫解读。</p></div></div>',
      '<div class="liuren-method-grid" id="liuren2-method-grid">',
      '<button class="liuren-method-card" type="button" data-liuren2-method="time" aria-pressed="false"><span aria-hidden="true">时</span><b>时间起课</b><small>手动确认农历月、农历日和时辰</small></button>',
      '<button class="liuren-method-card" type="button" data-liuren2-method="number" aria-pressed="false"><span aria-hidden="true">数</span><b>报数起课</b><small>输入三个正整数，分别从大安开始顺数</small></button>',
      "</div>",
      '<div class="method-panel" id="liuren2-time-panel" hidden>',
      '<div class="traditional-warning"><b>农历日期为简化换算，请手动确认。</b><p>页面内置的是简化参考值，不代表精密万年历。使用当前时间时，必须由你检查并确认后才参与计算。</p></div>',
      '<div class="liuren-input-grid">',
      '<label><span>农历月</span><input id="liuren2-lunar-month" type="number" min="1" max="12" inputmode="numeric" value="1"></label>',
      '<label><span>农历日</span><input id="liuren2-lunar-day" type="number" min="1" max="30" inputmode="numeric" value="1"></label>',
      '<label><span>时辰</span><select id="liuren2-hour">' + hourOptions.map(function (option) {
        return '<option value="' + option.index + '">' + escapeHtml(option.label) + "</option>";
      }).join("") + "</select></label>",
      "</div>",
      '<div class="lunar-confirm-row"><button class="secondary-button" id="liuren2-current-time" type="button">使用当前时间简化值</button>',
      '<label class="confirm-check"><input id="liuren2-lunar-confirm" type="checkbox"><span>我已手动确认以上农历月、日和时辰</span></label></div>',
      '<p class="method-hint" id="liuren2-time-hint" aria-live="polite">请先填写并确认农历日期。</p>',
      "</div>",
      '<div class="method-panel" id="liuren2-number-panel" hidden>',
      '<div class="liuren-input-grid three-numbers">',
      '<label><span>第一数 · 起因</span><input id="liuren2-number-one" type="number" min="1" step="1" inputmode="numeric" placeholder="例如 8"></label>',
      '<label><span>第二数 · 过程</span><input id="liuren2-number-two" type="number" min="1" step="1" inputmode="numeric" placeholder="例如 17"></label>',
      '<label><span>第三数 · 结果</span><input id="liuren2-number-three" type="number" min="1" step="1" inputmode="numeric" placeholder="例如 26"></label>',
      "</div>",
      '<p class="method-hint" id="liuren2-number-hint" aria-live="polite">第一数从大安起顺数；第二数从第一宫继续顺数；第三数从第二宫继续顺数。</p>',
      "</div>",
      '<div class="cast-actions"><button class="text-button" id="liuren2-method-back" type="button">返回修改问题</button><button class="primary-button" id="liuren2-calculate" type="button" disabled>开始计算 <span aria-hidden="true">→</span></button></div>',
      "</div>",
      '<div class="extra-step" id="liuren2-step-calculate" hidden>',
      '<div class="cast-intro"><div><p class="eyebrow">STEP 03 · 起课计算</p><h3 id="liuren2-calculate-title">逐宫计算</h3><p id="liuren2-calculate-status" aria-live="polite">每一步都会展示起始宫、顺数值、计算公式和落宫。</p></div><button class="text-button" id="liuren2-skip" type="button">跳过动画</button></div>',
      '<div class="liuren-board"><div class="liuren-wheel" id="liuren2-wheel" aria-hidden="true"><span class="liuren-wheel-center">六<br>宫</span></div><div class="liuren-path" id="liuren2-path" aria-label="起课路径"></div></div>',
      '<div class="liuren-calculation-detail" id="liuren2-calculation-detail" aria-live="polite"></div>',
      '<div class="cast-actions"><button class="text-button" id="liuren2-calculate-back" type="button">返回修改方式</button><button class="primary-button" id="liuren2-result-button" type="button" disabled>查看三宫解读 <span aria-hidden="true">→</span></button></div>',
      "</div>",
      '<div class="extra-step" id="liuren2-step-result" hidden><div id="liuren2-result"></div><div class="result-actions"><button class="secondary-button" id="liuren2-copy" type="button">复制解读文本</button><button class="secondary-button" id="liuren2-save" type="button">保存本次记录</button><button class="primary-button" id="liuren2-restart" type="button">重新起课</button></div></div>'
    ].join("");
  }

  function collectElements() {
    elements.stepper = document.getElementById("liuren2-stepper");
    elements.question = document.getElementById("liuren2-question");
    elements.questionCount = document.getElementById("liuren2-question-count");
    elements.questionError = document.getElementById("liuren2-question-error");
    elements.types = document.getElementById("liuren2-types");
    elements.examples = document.getElementById("liuren2-examples");
    elements.questionNext = document.getElementById("liuren2-question-next");
    elements.stepQuestion = document.getElementById("liuren2-step-question");
    elements.stepMethod = document.getElementById("liuren2-step-method");
    elements.stepCalculate = document.getElementById("liuren2-step-calculate");
    elements.stepResult = document.getElementById("liuren2-step-result");
    elements.methodGrid = document.getElementById("liuren2-method-grid");
    elements.timePanel = document.getElementById("liuren2-time-panel");
    elements.numberPanel = document.getElementById("liuren2-number-panel");
    elements.lunarMonth = document.getElementById("liuren2-lunar-month");
    elements.lunarDay = document.getElementById("liuren2-lunar-day");
    elements.hour = document.getElementById("liuren2-hour");
    elements.lunarConfirm = document.getElementById("liuren2-lunar-confirm");
    elements.currentTime = document.getElementById("liuren2-current-time");
    elements.timeHint = document.getElementById("liuren2-time-hint");
    elements.numberOne = document.getElementById("liuren2-number-one");
    elements.numberTwo = document.getElementById("liuren2-number-two");
    elements.numberThree = document.getElementById("liuren2-number-three");
    elements.numberHint = document.getElementById("liuren2-number-hint");
    elements.methodBack = document.getElementById("liuren2-method-back");
    elements.calculate = document.getElementById("liuren2-calculate");
    elements.calculateTitle = document.getElementById("liuren2-calculate-title");
    elements.calculateStatus = document.getElementById("liuren2-calculate-status");
    elements.wheel = document.getElementById("liuren2-wheel");
    elements.path = document.getElementById("liuren2-path");
    elements.calculationDetail = document.getElementById("liuren2-calculation-detail");
    elements.skip = document.getElementById("liuren2-skip");
    elements.calculateBack = document.getElementById("liuren2-calculate-back");
    elements.resultButton = document.getElementById("liuren2-result-button");
    elements.result = document.getElementById("liuren2-result");
    elements.copy = document.getElementById("liuren2-copy");
    elements.save = document.getElementById("liuren2-save");
    elements.restart = document.getElementById("liuren2-restart");
  }

  function setStep(stepName) {
    state.step = stepName;
    elements.stepQuestion.hidden = stepName !== "question";
    elements.stepMethod.hidden = stepName !== "method";
    elements.stepCalculate.hidden = stepName !== "calculate";
    elements.stepResult.hidden = stepName !== "result";

    const order = ["question", "method", "calculate", "result"];
    const activeIndex = order.indexOf(stepName);
    elements.stepper.querySelectorAll(".mini-step").forEach(function (item) {
      const itemIndex = order.indexOf(item.dataset.step);
      item.classList.toggle("is-active", item.dataset.step === stepName);
      item.classList.toggle("is-done", itemIndex < activeIndex);
      item.setAttribute("aria-current", item.dataset.step === stepName ? "step" : "false");
    });
  }

  function renderTypes() {
    elements.types.innerHTML = Object.keys(data.types).map(function (key) {
      const type = data.types[key];
      const selected = key === state.type;
      return [
        '<button class="choice-option' + (selected ? " is-selected" : "") + '" type="button"',
        ' data-liuren2-type="' + key + '" aria-pressed="' + (selected ? "true" : "false") + '">',
        '<span aria-hidden="true">' + type.icon + "</span><b>" + escapeHtml(type.label) + "</b>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderExamples() {
    const examples = data.examples[state.type] || data.examples.general;
    elements.examples.innerHTML = examples.map(function (question) {
      return '<button class="example-chip" type="button" data-liuren2-example="' +
        escapeHtml(question) + '">' + escapeHtml(question) + "</button>";
    }).join("");
  }

  function renderMethodSelection() {
    elements.methodGrid.querySelectorAll("[data-liuren2-method]").forEach(function (button) {
      const selected = button.dataset.liuren2Method === state.method;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    elements.timePanel.hidden = state.method !== "time";
    elements.numberPanel.hidden = state.method !== "number";
    updateCalculateButton();
  }

  function readTimeValues() {
    return {
      month: clamp(parseIntOrNull(elements.lunarMonth.value) || 1, 1, 12),
      day: clamp(parseIntOrNull(elements.lunarDay.value) || 1, 1, 30),
      hourIndex: clamp(parseIntOrNull(elements.hour.value) || 0, 0, 11)
    };
  }

  function readNumberValues() {
    return [
      parseIntOrNull(elements.numberOne.value),
      parseIntOrNull(elements.numberTwo.value),
      parseIntOrNull(elements.numberThree.value)
    ];
  }

  function updateCalculateButton() {
    if (state.method === "time") {
      elements.calculate.disabled = !elements.lunarConfirm.checked;
      return;
    }
    if (state.method === "number") {
      const values = readNumberValues();
      elements.calculate.disabled = !values.every(function (value) {
        return Number.isInteger(value) && value > 0;
      });
      return;
    }
    elements.calculate.disabled = true;
  }

  function setManualConfirmation(value) {
    state.time.confirmed = value;
    elements.lunarConfirm.checked = value;
    updateCalculateButton();
  }

  function updateTimeHint(message) {
    if (message) {
      elements.timeHint.textContent = message;
      return;
    }
    elements.timeHint.textContent = state.time.confirmed
      ? "已确认，将按你填写的农历月、日和时辰计算。"
      : "农历日期为简化换算，请手动确认后再开始计算。";
  }

  function useCurrentTime() {
    const now = new Date();
    const approximateMonth = clamp(now.getMonth() + 1, 1, 12);
    const approximateDay = clamp(now.getDate(), 1, 30);
    const approximateHourIndex = Math.floor((((now.getHours() + 1) % 24) / 2));

    elements.lunarMonth.value = String(approximateMonth);
    elements.lunarDay.value = String(approximateDay);
    elements.hour.value = String(approximateHourIndex);
    state.time.source = "current";
    setManualConfirmation(false);
    updateTimeHint("已填入当前时间的简化参考值。农历日期为简化换算，请手动核对并勾选确认。");
  }

  function selectMethod(method) {
    state.method = method;
    state.calculation = null;
    state.result = null;
    renderMethodSelection();
    if (method === "time") {
      updateTimeHint();
      elements.lunarMonth.focus();
    } else {
      elements.numberHint.textContent = "第一数从大安起顺数；第二数从第一宫继续顺数；第三数从第二宫继续顺数。";
      elements.numberOne.focus();
    }
  }

  function validateQuestion() {
    const question = elements.question.value.trim();
    if (question.length < 4) {
      elements.questionError.textContent = "请至少写下 4 个字，让占问更具体。";
      elements.question.focus();
      return false;
    }
    elements.questionError.textContent = "";
    state.question = question;
    return true;
  }

  function startMethodStep() {
    if (!validateQuestion()) {
      return;
    }
    state.saved = false;
    state.calculation = null;
    state.result = null;
    renderMethodSelection();
    setStep("method");
  }

  function buildTimeCalculation() {
    const values = readTimeValues();
    const firstIndex = (values.month - 1) % 6;
    const secondIndex = (firstIndex + values.day - 1) % 6;
    const thirdIndex = (secondIndex + values.hourIndex) % 6;
    const hour = hourOptions[values.hourIndex];
    const steps = [
      {
        dimension: "第一宫 · 起因 / 天时",
        valueLabel: "农历" + values.month + "月",
        title: "从大安起正月，顺数到农历" + values.month + "月",
        fromIndex: 0,
        count: values.month,
        resultIndex: firstIndex,
        formula: "(0 + " + values.month + " - 1) % 6 = " + firstIndex,
        detail: "以“大安”作为正月第一宫，沿六宫顺序顺数，落宫为“" +
          palaces[firstIndex].name + "”，作为起因与天时。"
      },
      {
        dimension: "第二宫 · 过程 / 地利",
        valueLabel: "农历" + values.day + "日",
        title: "从" + palaces[firstIndex].name + "起初一，顺数到农历" + values.day + "日",
        fromIndex: firstIndex,
        count: values.day,
        resultIndex: secondIndex,
        formula: "(" + firstIndex + " + " + values.day + " - 1) % 6 = " + secondIndex,
        detail: "以第一宫落宫作为初一，沿六宫顺序顺数到农历" + values.day +
          "日，落宫为“" + palaces[secondIndex].name + "”，作为过程与地利。"
      },
      {
        dimension: "第三宫 · 结果 / 人和",
        valueLabel: hour.label,
        title: "从" + palaces[secondIndex].name + "起子时，顺数到" + hour.label,
        fromIndex: secondIndex,
        count: values.hourIndex + 1,
        resultIndex: thirdIndex,
        formula: "(" + secondIndex + " + " + values.hourIndex + ") % 6 = " + thirdIndex,
        detail: "以第二宫落宫作为子时起点，按子、丑、寅、卯依次顺数到" + hour.label +
          "，落宫为“" + palaces[thirdIndex].name + "”，作为结果与人和。"
      }
    ];

    return {
      method: "time",
      methodLabel: "时间起课",
      inputs: values,
      steps: steps,
      indices: [firstIndex, secondIndex, thirdIndex]
    };
  }

  function buildNumberCalculation() {
    const values = readNumberValues();
    const dimensions = ["第一宫 · 起因 / 天时", "第二宫 · 过程 / 地利", "第三宫 · 结果 / 人和"];
    let fromIndex = 0;
    const steps = values.map(function (number, position) {
      const startIndex = fromIndex;
      const resultIndex = (startIndex + number - 1) % 6;
      const startPalace = palaces[startIndex];
      const resultPalace = palaces[resultIndex];
      const formula = position === 0
        ? "(0 + " + number + " - 1) % 6 = " + resultIndex
        : "(" + startIndex + " + " + number + " - 1) % 6 = " + resultIndex;
      const detail = position === 0
        ? "从大安作为第 1 宫开始顺数，数字 " + number + " 按六宫循环后落“" +
          resultPalace.name + "”。"
        : "以" + (position === 1 ? "第一宫" : "第二宫") + "的落宫“" + startPalace.name +
          "”为起点继续顺数 " + number + "，不回到大安，按六宫循环后落“" +
          resultPalace.name + "”。";
      fromIndex = resultIndex;
      return {
        dimension: dimensions[position],
        valueLabel: "报数 " + number,
        title: position === 0
          ? "从大安起顺数 " + number + "，落" + resultPalace.name
          : "从" + startPalace.name + "继续顺数 " + number + "，落" + resultPalace.name,
        fromIndex: startIndex,
        count: number,
        resultIndex: resultIndex,
        formula: formula,
        detail: detail
      };
    });

    return {
      method: "number",
      methodLabel: "报数起课",
      inputs: { numbers: values },
      steps: steps,
      indices: steps.map(function (step) { return step.resultIndex; })
    };
  }

  function renderWheel(activeIndex) {
    elements.wheel.querySelectorAll(".palace-node").forEach(function (node) {
      node.remove();
    });

    palaces.forEach(function (palace, index) {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      const node = document.createElement("div");
      node.className = "palace-node";
      node.dataset.liuren2Palace = String(index);
      node.style.left = (50 + Math.cos(angle) * 36) + "%";
      node.style.top = (50 + Math.sin(angle) * 36) + "%";
      node.innerHTML = "<b>" + escapeHtml(palace.name) + "</b><small>" +
        escapeHtml(palace.element + " · " + palace.short) + "</small>";
      elements.wheel.appendChild(node);
    });

    if (state.calculation) {
      const visited = new Set(state.calculation.indices);
      elements.wheel.querySelectorAll(".palace-node").forEach(function (node) {
        const index = Number(node.dataset.liuren2Palace);
        node.classList.toggle("is-visited", visited.has(index));
        node.classList.toggle("is-current", index === activeIndex);
      });
    }
  }

  function renderPath() {
    if (!state.calculation) {
      elements.path.innerHTML = '<div class="path-placeholder">尚未起课</div>';
      return;
    }
    elements.path.innerHTML = state.calculation.steps.map(function (step, index) {
      const palace = palaces[step.resultIndex];
      return [
        '<div class="path-item">',
        "<span>" + escapeHtml(palace.symbol) + "</span>",
        "<div><b>" + escapeHtml(["起因", "过程", "结果"][index] + " · " + palace.name) + "</b>",
        "<small>" + escapeHtml(step.valueLabel + " · " + palace.keywords.slice(0, 2).join("、")) + "</small></div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function revealCalculation() {
    state.revealTimers.forEach(window.clearTimeout);
    state.revealTimers = [];
    elements.calculationDetail.querySelectorAll(".calculation-step").forEach(function (step) {
      step.classList.add("is-revealed");
    });
    elements.resultButton.disabled = false;
    elements.calculateStatus.textContent = "三宫计算完成。请查看每一步的落宫结果，再进入综合解读。";
  }

  function renderCalculation() {
    renderWheel(state.calculation.indices[2]);
    renderPath();
    elements.calculationDetail.innerHTML = state.calculation.steps.map(function (step, index) {
      return [
        '<article class="calculation-step" data-calculation-step="' + index + '">',
        '<div class="calculation-step-head"><span>' + escapeHtml(step.dimension) + "</span><small>" +
          escapeHtml(step.valueLabel) + "</small></div>",
        "<h4>" + escapeHtml(step.title) + "</h4>",
        "<p>" + escapeHtml(step.detail) + "</p>",
        "<code>" + escapeHtml(step.formula) + "</code>",
        '<div class="calculation-palace-line">',
        sequenceMarkup(step.fromIndex, step.count),
        "</div>",
        "</article>"
      ].join("");
    }).join("");

    elements.resultButton.disabled = true;
    if (reducedMotion()) {
      revealCalculation();
      return;
    }
    state.revealTimers = state.calculation.steps.map(function (_, index) {
      return window.setTimeout(function () {
        const step = elements.calculationDetail.querySelector('[data-calculation-step="' + index + '"]');
        if (step) {
          step.classList.add("is-revealed");
        }
      }, index * 180);
    });
    state.revealTimers.push(window.setTimeout(revealCalculation, state.calculation.steps.length * 180));
  }

  function startCalculation() {
    if (state.method === "time") {
      if (!elements.lunarConfirm.checked) {
        tarotApi.showToast("请先确认简化农历日期。");
        elements.lunarConfirm.focus();
        return;
      }
      state.time = Object.assign({}, readTimeValues(), {
        confirmed: true,
        source: state.time.source
      });
      state.calculation = buildTimeCalculation();
    } else if (state.method === "number") {
      const values = readNumberValues();
      if (!values.every(function (value) { return Number.isInteger(value) && value > 0; })) {
        tarotApi.showToast("请输入三个正整数。");
        return;
      }
      state.numbers = values;
      state.calculation = buildNumberCalculation();
    } else {
      tarotApi.showToast("请先选择起课方式。");
      return;
    }

    state.result = null;
    state.saved = false;
    elements.calculateTitle.textContent = state.calculation.methodLabel + "计算过程";
    elements.calculateStatus.textContent = "正在展示三步落宫计算。";
    renderCalculation();
    setStep("calculate");
  }

  function palaceData(palace) {
    return {
      id: palace.id,
      name: palace.name,
      element: palace.element,
      fortune: palace.fortune,
      keywords: palace.keywords.slice(),
      stateDescription: palace.stateDescription,
      judgment: palace.judgment,
      advice: palace.advice,
      typeAdvice: palace.areas[state.type] || palace.areas.general
    };
  }

  function buildResult() {
    const calculation = state.calculation;
    const first = palaces[calculation.indices[0]];
    const second = palaces[calculation.indices[1]];
    const third = palaces[calculation.indices[2]];
    const type = data.types[state.type] || data.types.general;
    const fortuneScore = [first, second, third].reduce(function (score, palace) {
      return score + (palace.fortune === "吉" ? 1 : palace.fortune === "凶" ? -1 : 0);
    }, 0);
    const trend = fortuneScore >= 2
      ? "三宫整体偏积极，事情具备推进条件，但仍需把有利趋势落实为现实行动。"
      : fortuneScore <= -2
        ? "三宫整体偏谨慎，当前更适合核对事实、控制风险，不必为了尽快得到结果而勉强推进。"
        : "三宫吉凶参半，事情并非单一走向，适合一边观察反馈，一边保留调整空间。";
    const finalSpecial = third.id === "kongwang"
      ? "结果宫落在“空亡”，提示当前预期可能落空、信息不足或时机未成熟。先暂停追加投入，核实关键承诺和真实行动。"
      : third.id === "chikou"
        ? "结果宫落在“赤口”，提示最终可能涉及争议、误会或沟通摩擦。重要事项要留下记录，并避免在情绪中定输赢。"
        : third.id === "suxi"
          ? "结果宫落在“速喜”，提示消息、回应或进展可能加快。及时沟通和行动有利，但仍要核对细节，避免忙中出错。"
          : "结果宫不在空亡、赤口或速喜，仍应以第三宫的宫意为主，结合前两宫判断趋势是否能够稳定落地。";
    const combination = first.combinationHints[second.id] + " " + second.combinationHints[third.id];
    const summary = [
      type.opening + "你占问的是：“" + state.question + "”。本次采用" +
        calculation.methodLabel + "，计算过程已经固定。",
      "第一宫“起因 / 天时”为" + first.name + "，五行属" + first.element + "，倾向" +
        first.fortune + "。这表示事情开始时带有“" + first.keywords.slice(0, 3).join("、") +
        "”的特点，" + first.stateDescription,
      "第二宫“过程 / 地利”为" + second.name + "，五行属" + second.element + "，倾向" +
        second.fortune + "。过程更容易呈现“" + second.keywords.slice(0, 3).join("、") +
        "”的状态，" + second.stateDescription,
      "第三宫“结果 / 人和”为" + third.name + "，五行属" + third.element + "，倾向" +
        third.fortune + "。" + finalSpecial + " " + trend,
      "三宫组合提示：" + combination + " 结合" + type.label +
        "占问，" + (third.areas[state.type] || third.areas.general) + " " +
        "可执行建议：" + third.advice
    ];

    return {
      method: calculation.method,
      methodLabel: calculation.methodLabel,
      inputs: calculation.inputs,
      calculationSteps: calculation.steps,
      palaces: calculation.indices.map(function (index) {
        return palaceData(palaces[index]);
      }),
      finalPalaceId: third.id,
      resultName: first.name + " → " + second.name + " → " + third.name,
      combination: combination,
      trend: trend,
      summary: summary
    };
  }

  function palaceCardMarkup(item, index) {
    const dimensions = ["第一宫 · 起因 / 天时", "第二宫 · 过程 / 地利", "第三宫 · 结果 / 人和"];
    return [
      '<article class="liuren-three-card">',
      '<span class="dimension">' + escapeHtml(dimensions[index]) + "</span>",
      "<h4>" + escapeHtml(item.name) + "</h4>",
      '<span class="fortune ' + fortuneClass(item.fortune) + '">' + escapeHtml(item.fortune) + "</span>",
      "<p>" + escapeHtml(item.stateDescription) + "</p>",
      '<div class="result-tags">' + item.keywords.map(function (keyword) {
        return "<span>" + escapeHtml(keyword) + "</span>";
      }).join("") + "</div>",
      '<p class="method-hint">' + escapeHtml(item.typeAdvice) + "</p>",
      "</article>"
    ].join("");
  }

  function calculationHistoryMarkup(result) {
    return result.calculationSteps.map(function (step) {
      return [
        '<div class="calculation-step is-revealed">',
        '<div class="calculation-step-head"><span>' + escapeHtml(step.dimension) + "</span><small>" +
          escapeHtml(step.valueLabel) + "</small></div>",
        "<h4>" + escapeHtml(step.title) + "</h4>",
        "<p>" + escapeHtml(step.detail) + "</p>",
        "<code>" + escapeHtml(step.formula) + "</code>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderResult() {
    const result = state.result;
    const final = result.palaces[2];
    const methodInput = result.method === "time"
      ? "农历" + result.inputs.month + "月" + result.inputs.day + "日 · " +
        hourOptions[result.inputs.hourIndex].label
      : result.inputs.numbers.join(" / ");

    elements.result.innerHTML = [
      '<article class="result-hero">',
      "<div>",
      '<p class="eyebrow">最终三宫 · ' + escapeHtml(result.methodLabel) + "</p>",
      "<h3>" + escapeHtml(final.name) + "</h3>",
      "<p>" + escapeHtml(typeLabel() + "占问 · " + methodInput) + "</p>",
      '<div class="result-tags">' + result.palaces.map(function (item, index) {
        return "<span>" + escapeHtml(["起因", "过程", "结果"][index] + " " + item.name) + "</span>";
      }).join("") + "</div>",
      "</div>",
      '<div class="result-seal">三宫<br>已定</div>',
      "</article>",
      '<section class="result-section result-palaces-section"><h4>三宫分位</h4><div class="liuren-three-grid">' +
        result.palaces.map(palaceCardMarkup).join("") + "</div></section>",
      '<section class="result-section"><h4>起课计算过程</h4><div class="calculation-step-list">' +
        calculationHistoryMarkup(result) + "</div></section>",
      '<section class="result-section"><h4>综合解读</h4>' + result.summary.map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</section>",
      '<section class="result-section"><h4>组合提示</h4><p>' + escapeHtml(result.combination) + "</p></section>"
    ].join("");
  }

  function showResult() {
    if (!state.calculation) {
      tarotApi.showToast("请先完成起课计算。");
      return;
    }
    state.result = buildResult();
    state.saved = false;
    elements.save.disabled = false;
    elements.save.textContent = "保存本次记录";
    renderResult();
    setStep("result");
  }

  function saveResult() {
    if (!state.result || state.saved) {
      return;
    }
    const record = {
      id: tarotApi.createRecordId(),
      type: "liuren",
      createdAt: currentIso(),
      question: state.question,
      questionType: state.type,
      questionTypeLabel: typeLabel(),
      method: state.result.method,
      methodLabel: state.result.methodLabel,
      resultName: state.result.resultName,
      spreadName: "小六壬占课 · " + state.result.methodLabel,
      summary: state.result.summary.slice(),
      result: state.result
    };

    if (!tarotApi.addHistoryRecord(record)) {
      return;
    }
    state.saved = true;
    elements.save.disabled = true;
    elements.save.textContent = "已保存到历史记录";
    tarotApi.showToast("小六壬占课已保存。");
  }

  function copyResult() {
    if (!state.result) {
      return;
    }
    const result = state.result;
    const lines = [
      "星夜三占 · 小六壬占课",
      "问题：" + state.question,
      "类型：" + typeLabel(),
      "起课方式：" + result.methodLabel,
      "三宫：" + result.resultName,
      ""
    ];
    result.calculationSteps.forEach(function (step, index) {
      lines.push((index + 1) + ". " + step.dimension + "：" + step.title);
      lines.push("   计算公式：" + step.formula);
    });
    lines.push("", result.summary.join("\n\n"), "", "小六壬为传统民俗简化方法，仅供文化体验与自我反思。");
    copyText(lines.join("\n"));
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

  function resetFlow() {
    state.revealTimers.forEach(window.clearTimeout);
    state.revealTimers = [];
    state.method = "";
    state.calculation = null;
    state.result = null;
    state.saved = false;
    state.time.confirmed = false;
    elements.lunarConfirm.checked = false;
    elements.calculate.disabled = true;
    elements.resultButton.disabled = true;
    elements.save.disabled = false;
    elements.save.textContent = "保存本次记录";
    elements.calculationDetail.innerHTML = "";
    elements.path.innerHTML = '<div class="path-placeholder">尚未起课</div>';
    renderWheel(-1);
    renderMethodSelection();
    setStep("question");
  }

  function renderNewHistory(record, container) {
    const result = record.result || {};
    if (!Array.isArray(result.palaces) || result.palaces.length !== 3) {
      return false;
    }
    const meta = [
      '<div class="detail-meta">',
      "<div><span>时间</span><b>" + escapeHtml(tarotApi.formatDate(record.createdAt)) + "</b></div>",
      "<div><span>类型</span><b>" + escapeHtml(record.questionTypeLabel || "综合") + "</b></div>",
      "<div><span>方式</span><b>" + escapeHtml(record.methodLabel || result.methodLabel || "小六壬") + "</b></div>",
      "</div>"
    ].join("");
    container.innerHTML = [
      '<div class="extra-history-detail">',
      meta,
      "<h3>" + escapeHtml(record.question) + "</h3>",
      '<div class="extra-history-result"><b>' + escapeHtml(result.resultName || record.resultName) +
        "</b><p>" + escapeHtml(result.trend || "三宫已保存") + "</p></div>",
      '<div class="liuren-three-grid">' + result.palaces.map(palaceCardMarkup).join("") + "</div>",
      '<div class="calculation-step-list">' + calculationHistoryMarkup(result) + "</div>",
      '<div class="extra-history-summary">' + (record.summary || []).map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</div>",
      "</div>"
    ].join("");
    return true;
  }

  function bind() {
    elements.question.addEventListener("input", function () {
      setText(elements.questionCount, String(elements.question.value.length));
      elements.questionError.textContent = "";
    });

    elements.types.addEventListener("click", function (event) {
      const button = event.target.closest("[data-liuren2-type]");
      if (!button) {
        return;
      }
      state.type = button.dataset.liuren2Type;
      renderTypes();
      renderExamples();
    });

    elements.examples.addEventListener("click", function (event) {
      const button = event.target.closest("[data-liuren2-example]");
      if (!button) {
        return;
      }
      elements.question.value = button.dataset.liuren2Example;
      setText(elements.questionCount, String(elements.question.value.length));
      elements.question.focus();
    });

    elements.questionNext.addEventListener("click", startMethodStep);

    elements.methodGrid.addEventListener("click", function (event) {
      const button = event.target.closest("[data-liuren2-method]");
      if (button) {
        selectMethod(button.dataset.liuren2Method);
      }
    });

    elements.methodBack.addEventListener("click", function () {
      setStep("question");
    });

    elements.currentTime.addEventListener("click", useCurrentTime);
    elements.lunarMonth.addEventListener("input", function () {
      state.time.source = "manual";
      setManualConfirmation(false);
      updateTimeHint("农历日期为简化换算，请手动核对并勾选确认。");
    });
    elements.lunarDay.addEventListener("input", function () {
      state.time.source = "manual";
      setManualConfirmation(false);
      updateTimeHint("农历日期为简化换算，请手动核对并勾选确认。");
    });
    elements.hour.addEventListener("change", function () {
      state.time.source = "manual";
      setManualConfirmation(false);
      updateTimeHint("时辰已修改，请再次确认后开始计算。");
    });
    elements.lunarConfirm.addEventListener("change", function () {
      state.time.confirmed = elements.lunarConfirm.checked;
      updateTimeHint();
      updateCalculateButton();
    });

    [elements.numberOne, elements.numberTwo, elements.numberThree].forEach(function (input) {
      input.addEventListener("input", function () {
        const values = readNumberValues();
        const valid = values.every(function (value) {
          return Number.isInteger(value) && value > 0;
        });
        elements.numberHint.textContent = valid
          ? "三个报数已填写，将依次从上一宫继续顺数并按六宫循环。"
          : "三个数字都必须是正整数。";
        updateCalculateButton();
      });
    });

    elements.calculate.addEventListener("click", startCalculation);
    elements.skip.addEventListener("click", function () {
      revealCalculation();
      tarotApi.showToast("已跳过计算展示动画。");
    });
    elements.calculateBack.addEventListener("click", function () {
      setStep("method");
    });
    elements.resultButton.addEventListener("click", showResult);
    elements.save.addEventListener("click", saveResult);
    elements.copy.addEventListener("click", copyResult);
    elements.restart.addEventListener("click", function () {
      resetFlow();
      elements.question.focus();
    });

    if (previousExtra) {
      previousExtra.renderHistoryDetail = function (record, container) {
        if (record.type === "liuren" && renderNewHistory(record, container)) {
          return true;
        }
        return previousHistoryRenderer ? previousHistoryRenderer(record, container) : false;
      };
    }
  }

  function init() {
    renderShell();
    collectElements();
    renderTypes();
    renderExamples();
    renderWheel(-1);
    renderPath();
    resetFlow();
    bind();
  }

  init();
})();
