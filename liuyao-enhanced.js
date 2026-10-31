/* 六爻增强版：三枚铜钱规则、六爻成卦、动爻变卦、六十四卦简读。 */
(function () {
  "use strict";

  const tarotApi = window.TarotApp;
  const data = window.LIUYAO_DATA;
  const view = document.getElementById("view-liuyao");
  const previousExtra = window.ExtraDivination;
  const previousHistoryRenderer = previousExtra && previousExtra.renderHistoryDetail;

  if (!tarotApi || !data || !view) {
    return;
  }

  const escapeHtml = tarotApi.escapeHtml;
  const lineNames = data.lineNames;
  const state = {
    question: "",
    type: "general",
    lines: [],
    pending: null,
    busy: false,
    timer: null,
    skipAnimations: false,
    result: null,
    saved: false,
    revealTimers: []
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

  function typeLabel() {
    return data.types[state.type] ? data.types[state.type].label : "综合";
  }

  function typeAction() {
    const actions = {
      general: "先抓住最需要处理的主要矛盾，把卦意落到一个可验证的小行动。",
      career: "把重点放在职责、资源、协作和时间节点上，先处理影响推进的条件。",
      love: "观察双方持续回应和真实边界，不用一次卦象替任何一方作最终表态。",
      wealth: "先核实收支、风险和兑现条件，涉及资金时以真实数据为准。",
      study: "把趋势转成具体学习调整，优先改善节奏、方法和反馈闭环。",
      social: "先辨清事实、立场和边界，再决定靠近、等待或保持距离。"
    };
    return actions[state.type] || actions.general;
  }

  function renderShell() {
    view.innerHTML = [
      '<div class="section-heading">',
      '<p class="eyebrow">LIU YAO · 三枚铜钱</p>',
      "<h2>六爻起卦</h2>",
      "<p>从初爻到上爻依次摇动六次，再观察本卦、动爻、变卦和问题方向的简读。</p>",
      "</div>",
      '<nav class="mini-stepper" id="liuyao2-stepper" aria-label="六爻进度">',
      '<div class="mini-step is-active" data-step="question"><span>1</span><b>提问</b></div>',
      '<div class="mini-step" data-step="cast"><span>2</span><b>摇卦</b></div>',
      '<div class="mini-step" data-step="result"><span>3</span><b>解卦</b></div>',
      "</nav>",
      '<div class="extra-step" id="liuyao2-step-question">',
      '<div class="form-block">',
      '<label for="liuyao2-question">你想占问的事情</label>',
      '<textarea id="liuyao2-question" rows="4" maxlength="160" placeholder="例如：面对接下来的项目，我最应该关注什么？"></textarea>',
      '<div class="field-meta"><span class="field-error" id="liuyao2-question-error" role="alert"></span>',
      '<span><b id="liuyao2-question-count">0</b>/160</span></div>',
      "</div>",
      '<fieldset class="choice-group"><legend>占问类型</legend><div class="choice-grid extra-choice-grid" id="liuyao2-types"></div></fieldset>',
      '<div class="example-block"><div class="subheading"><h3>示例问题</h3><span>点击即可填入</span></div><div class="example-list" id="liuyao2-examples"></div></div>',
      '<p class="liuyao-disclaimer">六爻排盘为简化版，未完整实现专业纳甲、六亲、六神、神煞体系；仅供娱乐与自我反思。</p>',
      '<div class="view-actions"><button class="text-button" type="button" data-home-module>返回首页</button><button class="primary-button" id="liuyao2-question-next" type="button">进入摇卦 <span aria-hidden="true">→</span></button></div>',
      "</div>",
      '<div class="extra-step" id="liuyao2-step-cast" hidden>',
      '<div class="cast-intro"><div><p class="eyebrow">STEP 02 · 六次成卦</p><h3 id="liuyao2-cast-title">摇第一爻</h3><p id="liuyao2-cast-status" aria-live="polite">每次模拟三枚铜钱正反，从初爻依次向上生成六爻。</p></div><button class="text-button" id="liuyao2-skip" type="button">跳过动画</button></div>',
      '<div class="liuyao-rule-panel">',
      '<div class="coin-rule"><b>三背</b><div><strong>老阳 · 动爻</strong><span>阳爻变化为阴爻</span></div></div>',
      '<div class="coin-rule"><b>三字</b><div><strong>老阴 · 动爻</strong><span>阴爻变化为阳爻</span></div></div>',
      '<div class="coin-rule"><b>两背一字</b><div><strong>少阳 · 静爻</strong><span>保持为阳爻</span></div></div>',
      '<div class="coin-rule"><b>两字一背</b><div><strong>少阴 · 静爻</strong><span>保持为阴爻</span></div></div>',
      "</div>",
      '<div class="liuyao-cast-summary"><div><h3>铜钱落爻</h3><p id="liuyao2-cast-summary">尚未摇卦</p></div><div class="liuyao-count-large"><span id="liuyao2-count">0</span><small> / 6 爻</small></div></div>',
      '<div class="coin-stage" id="liuyao2-coin-stage" aria-hidden="true"><span class="coin coin-1">背</span><span class="coin coin-2">字</span><span class="coin coin-3">背</span></div>',
      '<div class="liuyao-cast-layout"><div class="hexagram-stack" id="liuyao2-stack" aria-label="六爻从下到上排列"></div><div class="cast-copy"><div class="coin-result-list" id="liuyao2-coin-results"></div></div></div>',
      '<div class="cast-actions"><button class="text-button" id="liuyao2-cast-back" type="button">返回修改问题</button><button class="primary-button" id="liuyao2-cast-button" type="button">摇第一爻</button><button class="secondary-button" id="liuyao2-auto" type="button">自动摇完六爻</button><button class="primary-button" id="liuyao2-result-button" type="button" disabled>查看解卦结果 <span aria-hidden="true">→</span></button></div>',
      "</div>",
      '<div class="extra-step" id="liuyao2-step-result" hidden><div id="liuyao2-result"></div><div class="result-actions"><button class="secondary-button" id="liuyao2-copy" type="button">复制解读文本</button><button class="secondary-button" id="liuyao2-save" type="button">保存本次记录</button><button class="primary-button" id="liuyao2-restart" type="button">重新起卦</button></div></div>'
    ].join("");
  }

  function collectElements() {
    elements.stepper = document.getElementById("liuyao2-stepper");
    elements.question = document.getElementById("liuyao2-question");
    elements.questionCount = document.getElementById("liuyao2-question-count");
    elements.questionError = document.getElementById("liuyao2-question-error");
    elements.types = document.getElementById("liuyao2-types");
    elements.examples = document.getElementById("liuyao2-examples");
    elements.questionNext = document.getElementById("liuyao2-question-next");
    elements.stepQuestion = document.getElementById("liuyao2-step-question");
    elements.stepCast = document.getElementById("liuyao2-step-cast");
    elements.stepResult = document.getElementById("liuyao2-step-result");
    elements.castTitle = document.getElementById("liuyao2-cast-title");
    elements.castStatus = document.getElementById("liuyao2-cast-status");
    elements.castSummary = document.getElementById("liuyao2-cast-summary");
    elements.count = document.getElementById("liuyao2-count");
    elements.coinStage = document.getElementById("liuyao2-coin-stage");
    elements.stack = document.getElementById("liuyao2-stack");
    elements.coinResults = document.getElementById("liuyao2-coin-results");
    elements.castButton = document.getElementById("liuyao2-cast-button");
    elements.auto = document.getElementById("liuyao2-auto");
    elements.skip = document.getElementById("liuyao2-skip");
    elements.castBack = document.getElementById("liuyao2-cast-back");
    elements.resultButton = document.getElementById("liuyao2-result-button");
    elements.result = document.getElementById("liuyao2-result");
    elements.copy = document.getElementById("liuyao2-copy");
    elements.save = document.getElementById("liuyao2-save");
    elements.restart = document.getElementById("liuyao2-restart");
  }

  function setStep(stepName) {
    elements.stepQuestion.hidden = stepName !== "question";
    elements.stepCast.hidden = stepName !== "cast";
    elements.stepResult.hidden = stepName !== "result";
    const order = ["question", "cast", "result"];
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
        ' data-liuyao2-type="' + key + '" aria-pressed="' + (selected ? "true" : "false") + '">',
        '<span aria-hidden="true">' + type.icon + "</span><b>" + escapeHtml(type.label) + "</b>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderExamples() {
    const examples = data.examples[state.type] || data.examples.general;
    elements.examples.innerHTML = examples.map(function (question) {
      return '<button class="example-chip" type="button" data-liuyao2-example="' +
        escapeHtml(question) + '">' + escapeHtml(question) + "</button>";
    }).join("");
  }

  function tossThreeCoins() {
    const coins = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5].map(function (isBack) {
      return isBack ? "背" : "字";
    });
    const backs = coins.filter(function (coin) { return coin === "背"; }).length;
    let name = "";
    let yang = false;
    let changing = false;

    if (backs === 3) {
      name = "老阳";
      yang = true;
      changing = true;
    } else if (backs === 2) {
      name = "少阳";
      yang = true;
    } else if (backs === 1) {
      name = "少阴";
      yang = false;
    } else {
      name = "老阴";
      yang = false;
      changing = true;
    }

    return {
      coins: coins,
      backs: backs,
      name: name,
      yang: yang,
      changing: changing
    };
  }

  function renderCoinVisual(result) {
    Array.from(elements.coinStage.children).forEach(function (coin, index) {
      const isBack = result.coins[index] === "背";
      coin.className = "coin coin-" + (index + 1) + (isBack ? " is-yang" : " is-yin");
      coin.textContent = result.coins[index];
    });
  }

  function resetCoinVisual() {
    Array.from(elements.coinStage.children).forEach(function (coin, index) {
      coin.className = "coin coin-" + (index + 1);
      coin.textContent = ["背", "字", "背"][index];
    });
  }

  function yaoRowMarkup(line, index, newestIndex) {
    const name = lineNames[index];
    if (!line) {
      return [
        '<div class="yao-row is-placeholder">',
        "<span>" + escapeHtml(name) + "</span>",
        '<div class="yao-line is-yang"><span></span></div>',
        "<span>待摇</span>",
        "</div>"
      ].join("");
    }
    const bars = line.yang ? "<span></span>" : "<span></span><span></span>";
    return [
      '<div class="yao-row' + (line.yang ? " is-yang" : " is-yin") +
        (line.changing ? " is-changing" : "") +
        (index === newestIndex ? " is-new" : "") + '">',
      "<span>" + escapeHtml(name) + "</span>",
      '<div class="yao-line ' + (line.yang ? "is-yang" : "is-yin") + '">' + bars + "</div>",
      "<span>" + escapeHtml(line.name + (line.changing ? " · 动" : "")) + "</span>",
      "</div>"
    ].join("");
  }

  function renderStack(newestIndex) {
    const rows = [];
    for (let index = 0; index < 6; index += 1) {
      rows.push(yaoRowMarkup(state.lines[index], index, newestIndex));
    }
    elements.stack.innerHTML = rows.join("");
  }

  function renderCoinResults() {
    if (!state.lines.length) {
      elements.coinResults.innerHTML = '<p class="method-hint">每次铜钱结果会依次记录在这里。</p>';
      return;
    }
    elements.coinResults.innerHTML = state.lines.map(function (line, index) {
      return [
        '<div class="coin-result-row">',
        "<b>" + escapeHtml(lineNames[index]) + "</b>",
        '<div class="mini-coins">' + line.coins.map(function (coin) {
          return '<span class="mini-coin' + (coin === "字" ? " is-char" : "") + '">' +
            escapeHtml(coin) + "</span>";
        }).join("") + "</div>",
        "<span>" + escapeHtml(line.name + " · " + (line.yang ? "阳爻" : "阴爻") +
          (line.changing ? " · 动爻" : " · 静爻")) + "</span>",
        "</div>"
      ].join("");
    }).join("");
  }

  function updateCastControls() {
    const count = state.lines.length;
    setText(elements.count, String(count));
    elements.auto.disabled = state.busy || count >= 6;
    elements.resultButton.disabled = count < 6;

    if (count >= 6) {
      setText(elements.castTitle, "六爻已成");
      elements.castButton.textContent = "查看解卦结果";
      elements.castButton.disabled = false;
    } else {
      setText(elements.castTitle, "摇第" + (count + 1) + "爻");
      elements.castButton.textContent = "摇第" + (count + 1) + "爻";
      elements.castButton.disabled = state.busy;
    }
  }

  function finishPending() {
    if (!state.pending) {
      return;
    }
    window.clearTimeout(state.timer);
    const pending = state.pending;
    state.pending = null;
    state.busy = false;
    state.lines.push({
      coins: pending.coins.slice(),
      backs: pending.backs,
      name: pending.name,
      yang: pending.yang,
      changing: pending.changing
    });
    elements.coinStage.classList.remove("is-tossing");
    renderStack(state.lines.length - 1);
    renderCoinResults();
    updateCastControls();
    const line = state.lines[state.lines.length - 1];
    elements.castSummary.textContent = "第 " + state.lines.length + " 爻：" + line.name +
      "，" + line.coins.join(" · ") + (line.changing ? "，为动爻" : "，为静爻");
    elements.castStatus.textContent = state.lines.length >= 6
      ? "六爻已经由下到上完成。未确认前不会自动进入解卦。"
      : "已摇 " + state.lines.length + "/6 爻，继续摇下一爻。";
  }

  function castLine() {
    if (state.lines.length >= 6) {
      showResult();
      return;
    }
    if (state.busy) {
      return;
    }
    const result = tossThreeCoins();
    state.pending = result;
    state.busy = true;
    renderCoinVisual(result);
    elements.coinStage.classList.remove("is-tossing");
    void elements.coinStage.offsetWidth;
    elements.coinStage.classList.add("is-tossing");
    elements.castButton.disabled = true;
    elements.auto.disabled = true;
    elements.castStatus.textContent = "第 " + (state.lines.length + 1) +
      " 爻铜钱已落，正在记录爻象。";
    elements.castSummary.textContent = "铜钱结果：" + result.coins.join(" · ");

    const duration = reducedMotion() || state.skipAnimations ? 60 : 680;
    state.timer = window.setTimeout(finishPending, duration);
  }

  function skipAnimation() {
    state.skipAnimations = true;
    if (state.pending) {
      finishPending();
      tarotApi.showToast("已跳过本爻动画。");
    } else {
      tarotApi.showToast("后续摇卦动画将快速完成。");
    }
  }

  function autoComplete() {
    if (state.pending) {
      finishPending();
    }
    while (state.lines.length < 6) {
      const result = tossThreeCoins();
      state.lines.push({
        coins: result.coins.slice(),
        backs: result.backs,
        name: result.name,
        yang: result.yang,
        changing: result.changing
      });
    }
    renderStack(5);
    renderCoinResults();
    updateCastControls();
    elements.castSummary.textContent = "六爻已自动摇完，请确认铜钱结果后进入解卦。";
    elements.castStatus.textContent = "已摇 6/6 爻。结果不会自动跳转。";
  }

  function linesEqual(left, right) {
    return left.length === right.length && left.every(function (value, index) {
      return value === right[index];
    });
  }

  function trigramByLines(lines) {
    return Object.keys(data.trigrams).map(function (key) {
      return data.trigrams[key];
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
    return data.hexagrams[upper.id + ":" + lower.id] || null;
  }

  function hexagramVisualMarkup(lines, compact) {
    const rows = lines.map(function (yang) {
      const bars = yang ? "<span></span>" : "<span></span><span></span>";
      return '<div class="yao-line ' + (yang ? "is-yang" : "is-yin") + '">' + bars + "</div>";
    }).join("");
    return '<div class="hexagram-visual' + (compact ? " compact" : "") + '">' + rows + "</div>";
  }

  function buildResult() {
    const originalPattern = state.lines.map(function (line) { return line.yang ? 1 : 0; });
    const changedPattern = state.lines.map(function (line) {
      return line.changing ? (line.yang ? 0 : 1) : (line.yang ? 1 : 0);
    });
    const original = hexagramByLines(originalPattern);
    const changed = hexagramByLines(changedPattern);
    const changingIndexes = state.lines.reduce(function (indexes, line, index) {
      if (line.changing) {
        indexes.push(index);
      }
      return indexes;
    }, []);
    const noChange = changingIndexes.length === 0;
    const changingText = noChange
      ? "这是一卦静卦，六爻都没有动。以本卦卦意为主，当前结构相对稳定。"
      : "动爻为" + changingIndexes.map(function (index) {
        return lineNames[index];
      }).join("、") + "，翻转后得到变卦“" + changed.name + "”。“" +
        original.brief + "”向“" + changed.brief + "”转化。";
    const selectedReading = state.type === "general"
      ? original.brief
      : original.domainReadings[state.type];
    const summary = [
      "现状：" + original.name + "（第 " + original.number + " 卦，上" +
        original.upperTrigram.name + "下" + original.lowerTrigram.name + "）。" + original.brief,
      "变化趋势：" + changingText,
      "建议：" + selectedReading + " " + typeAction()
    ];
    if (changingIndexes.length > 2) {
      summary.push("动爻较多，变化较大，宜抓主要矛盾。先处理最影响结果的一到两个关键条件，不必同时回应全部变化。");
    }

    return {
      originalKey: original.key,
      originalName: original.name,
      originalNumber: original.number,
      originalSymbol: original.symbol,
      originalBrief: original.brief,
      originalUpper: original.upperTrigram,
      originalLower: original.lowerTrigram,
      originalDomainReadings: original.domainReadings,
      changedKey: changed.key,
      changedName: changed.name,
      changedNumber: changed.number,
      changedSymbol: changed.symbol,
      changedBrief: changed.brief,
      changedUpper: changed.upperTrigram,
      changedLower: changed.lowerTrigram,
      changedDomainReadings: changed.domainReadings,
      changingIndexes: changingIndexes.slice(),
      changingPositions: changingIndexes.map(function (index) { return lineNames[index]; }),
      noChange: noChange,
      lines: state.lines.map(function (line) {
        return {
          coins: line.coins.slice(),
          backs: line.backs,
          name: line.name,
          yang: line.yang,
          changing: line.changing
        };
      }),
      summary: summary
    };
  }

  function domainGridMarkup(domainReadings) {
    const labels = {
      career: "事业",
      love: "感情",
      wealth: "财运",
      study: "学业",
      social: "人际"
    };
    return Object.keys(labels).map(function (key) {
      return '<div class="domain-reading-item"><b>' + labels[key] + "简读</b><p>" +
        escapeHtml(domainReadings[key]) + "</p></div>";
    }).join("");
  }

  function resultHexagramCard(label, hexagram, lines, domainText) {
    return [
      '<article class="hexagram-reading-card">',
      "<small>" + escapeHtml(label) + "</small>",
      '<div class="hexagram-reading-head">',
      hexagramVisualMarkup(lines, true),
      "<div><h4>" + escapeHtml(hexagram.symbol + " " + hexagram.name) + "</h4>",
      "<p>第 " + escapeHtml(String(hexagram.number)) + " 卦 · 上" +
        escapeHtml(hexagram.upperTrigram.name) + "下" + escapeHtml(hexagram.lowerTrigram.name) + "</p></div>",
      "</div>",
      "<p>" + escapeHtml(domainText || hexagram.brief) + "</p>",
      "</article>"
    ].join("");
  }

  function renderResult() {
    const result = state.result;
    const originalPattern = result.lines.map(function (line) { return line.yang ? 1 : 0; });
    const changedPattern = result.lines.map(function (line) {
      return line.changing ? (line.yang ? 0 : 1) : (line.yang ? 1 : 0);
    });
    const original = data.hexagrams[result.originalKey];
    const changed = data.hexagrams[result.changedKey];
    const movementMarkup = result.changingPositions.length
      ? '<div class="movement-line-list">' + result.changingPositions.map(function (position) {
        return "<span>" + escapeHtml(position) + "动</span>";
      }).join("") + "</div>"
      : '<div class="static-hexagram-note">静卦，以本卦卦意为主。</div>';

    elements.result.innerHTML = [
      '<article class="liuyao-result-hero">',
      "<div>",
      '<p class="eyebrow">本卦 · 第 ' + escapeHtml(String(result.originalNumber)) + " 卦</p>",
      "<h3>" + escapeHtml(result.originalSymbol + " " + result.originalName) + "</h3>",
      "<p>" + escapeHtml(typeLabel() + "占问 · 上" + result.originalUpper.name +
        "下" + result.originalLower.name + " · 动爻 " + result.changingIndexes.length + " 个") + "</p>",
      '<div class="hexagram-tags"><span>本卦 ' + escapeHtml(result.originalName) +
        "</span><span>变卦 " + escapeHtml(result.changedName) + "</span><span>" +
        escapeHtml(result.noChange ? "静卦" : "有动爻") + "</span></div>",
      "</div>",
      '<div class="hexagram-symbol-large">' + escapeHtml(result.originalSymbol) + "</div>",
      "</article>",
      '<section class="result-section"><h4>本卦与变卦</h4><div class="liuyao-two-grid">' +
        resultHexagramCard("本卦", original, originalPattern, result.originalDomainReadings[state.type] || original.brief) +
        resultHexagramCard("变卦", changed, changedPattern, result.changedDomainReadings[state.type] || changed.brief) +
        "</div>",
      '<div><h4 class="liuren-calculation-title">动爻位置</h4>' + movementMarkup + "</div></section>",
      '<section class="result-section"><h4>六爻原象</h4><div class="hexagram-stack result-stack">' +
        result.lines.map(function (line, index) {
          return yaoRowMarkup(line, index, -1);
        }).join("") + "</div></section>",
      '<section class="result-section"><h4>综合解卦</h4>' + result.summary.map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</section>",
      '<section class="result-section"><h4>六十四卦域别简读</h4><div class="domain-reading-grid">' +
        domainGridMarkup(result.originalDomainReadings) + "</div></section>",
      '<p class="liuyao-disclaimer">六爻排盘为简化版，未完整实现专业纳甲、六亲、六神、神煞体系；仅供娱乐与自我反思。</p>'
    ].join("");

    elements.result.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function showResult() {
    if (state.lines.length !== 6) {
      tarotApi.showToast("请先完成六次摇卦。");
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
      type: "liuyao",
      createdAt: currentIso(),
      question: state.question,
      questionType: state.type,
      questionTypeLabel: typeLabel(),
      resultName: state.result.originalName +
        (state.result.noChange ? "（静卦）" : " → " + state.result.changedName),
      spreadName: "三枚铜钱六爻起卦",
      summary: state.result.summary.slice(),
      result: state.result
    };
    if (!tarotApi.addHistoryRecord(record)) {
      return;
    }
    state.saved = true;
    elements.save.disabled = true;
    elements.save.textContent = "已保存到历史记录";
    tarotApi.showToast("六爻起卦已保存。");
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

  function copyResult() {
    if (!state.result) {
      return;
    }
    const lines = [
      "星夜三占 · 六爻起卦",
      "问题：" + state.question,
      "类型：" + typeLabel(),
      "本卦：" + state.result.originalName,
      "变卦：" + state.result.changedName,
      "动爻：" + (state.result.changingPositions.length
        ? state.result.changingPositions.join("、")
        : "无（静卦）"),
      ""
    ];
    state.result.lines.forEach(function (line, index) {
      lines.push(lineNames[index] + "：" + line.coins.join(" · ") + "，" + line.name +
        (line.changing ? "，动爻" : "，静爻"));
    });
    lines.push("", state.result.summary.join("\n\n"), "", "六爻排盘为简化版，未完整实现专业纳甲、六亲、六神、神煞体系；仅供娱乐与自我反思。");
    copyText(lines.join("\n"));
  }

  function resetFlow() {
    state.revealTimers.forEach(window.clearTimeout);
    state.revealTimers = [];
    window.clearTimeout(state.timer);
    state.lines = [];
    state.pending = null;
    state.busy = false;
    state.result = null;
    state.saved = false;
    elements.castSummary.textContent = "尚未摇卦";
    elements.castStatus.textContent = "每次模拟三枚铜钱正反，从初爻依次向上生成六爻。";
    elements.coinResults.innerHTML = '<p class="method-hint">每次铜钱结果会依次记录在这里。</p>';
    elements.result.innerHTML = "";
    elements.save.disabled = false;
    elements.save.textContent = "保存本次记录";
    resetCoinVisual();
    renderStack(-1);
    updateCastControls();
    setStep("question");
  }

  function renderNewHistory(record, container) {
    const result = record.result || {};
    if (!Array.isArray(result.lines) || result.lines.length !== 6 || !result.originalKey) {
      return false;
    }
    const original = data.hexagrams[result.originalKey];
    const changed = data.hexagrams[result.changedKey];
    if (!original || !changed) {
      return false;
    }
    const originalPattern = result.lines.map(function (line) { return line.yang ? 1 : 0; });
    const changedPattern = result.lines.map(function (line) {
      return line.changing ? (line.yang ? 0 : 1) : (line.yang ? 1 : 0);
    });
    container.innerHTML = [
      '<div class="extra-history-detail">',
      '<div class="detail-meta">',
      "<div><span>时间</span><b>" + escapeHtml(tarotApi.formatDate(record.createdAt)) + "</b></div>",
      "<div><span>类型</span><b>" + escapeHtml(record.questionTypeLabel || "综合") + "</b></div>",
      "<div><span>动爻</span><b>" + escapeHtml(String((result.changingIndexes || []).length)) + " 个</b></div>",
      "</div>",
      "<h3>" + escapeHtml(record.question) + "</h3>",
      '<div class="extra-history-result"><b>' + escapeHtml(result.originalName) +
        (result.noChange ? "（静卦）" : " → " + escapeHtml(result.changedName)) +
        "</b><p>本卦第 " + escapeHtml(String(result.originalNumber)) + " 卦</p></div>",
      '<div class="liuyao-two-grid">' +
        resultHexagramCard("本卦", original, originalPattern, original.brief) +
        resultHexagramCard("变卦", changed, changedPattern, changed.brief) +
        "</div>",
      '<div class="hexagram-stack">' + result.lines.map(function (line, index) {
        return yaoRowMarkup(line, index, -1);
      }).join("") + "</div>",
      '<div class="extra-history-summary">' + (record.summary || []).map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</div>",
      '<div class="domain-reading-grid">' + domainGridMarkup(original.domainReadings) + "</div>",
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
      const button = event.target.closest("[data-liuyao2-type]");
      if (!button) {
        return;
      }
      state.type = button.dataset.liuyao2Type;
      renderTypes();
      renderExamples();
    });
    elements.examples.addEventListener("click", function (event) {
      const button = event.target.closest("[data-liuyao2-example]");
      if (!button) {
        return;
      }
      elements.question.value = button.dataset.liuyao2Example;
      setText(elements.questionCount, String(elements.question.value.length));
      elements.question.focus();
    });
    elements.questionNext.addEventListener("click", function () {
      const question = elements.question.value.trim();
      if (question.length < 4) {
        elements.questionError.textContent = "请至少写下 4 个字，让占问更具体。";
        elements.question.focus();
        return;
      }
      state.question = question;
      resetFlow();
      setStep("cast");
    });
    elements.castButton.addEventListener("click", castLine);
    elements.auto.addEventListener("click", autoComplete);
    elements.skip.addEventListener("click", skipAnimation);
    elements.castBack.addEventListener("click", function () {
      setStep("question");
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
        if (record.type === "liuyao" && renderNewHistory(record, container)) {
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
    resetCoinVisual();
    renderStack(-1);
    resetFlow();
    bind();
  }

  init();
})();
