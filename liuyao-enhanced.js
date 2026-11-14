/* 六爻增强版：三枚铜钱规则、六爻成卦、动爻变卦、六十四卦简读。 */
(function () {
  "use strict";

  const tarotApi = window.TarotApp;
  const data = window.LIUYAO_DATA;
  const chart = window.LIUYAO_CHART;
  const view = document.getElementById("view-liuyao");
  const previousExtra = window.ExtraDivination;
  const previousHistoryRenderer = previousExtra && previousExtra.renderHistoryDetail;

  if (!tarotApi || !data || !view || !chart) {
    return;
  }

  const escapeHtml = tarotApi.escapeHtml;
  const lineNames = data.lineNames;
  let palaceTable = null;

  function getPalaceTable() {
    if (!palaceTable) {
      palaceTable = chart.buildPalaceTable(data.trigrams);
    }
    return palaceTable;
  }

  const state = {
    question: "",
    type: "general",
    castDate: "",
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

  function playSound(name) {
    if (window.AudioKit) {
      window.AudioKit.play(name);
    }
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

  function collectElements() {
    elements.stepper = document.getElementById("liuyao-stepper");
    elements.question = document.getElementById("liuyao-question");
    elements.questionCount = document.getElementById("liuyao-question-count");
    elements.questionError = document.getElementById("liuyao-question-error");
    elements.types = document.getElementById("liuyao-types");
    elements.examples = document.getElementById("liuyao-examples");
    elements.questionNext = document.getElementById("liuyao-question-next");
    elements.castDate = document.getElementById("liuyao-cast-date");
    elements.stepQuestion = document.getElementById("liuyao-step-question");
    elements.stepCast = document.getElementById("liuyao-step-cast");
    elements.stepResult = document.getElementById("liuyao-step-result");
    elements.castTitle = document.getElementById("liuyao-cast-title");
    elements.castStatus = document.getElementById("liuyao-cast-status");
    elements.castSummary = document.getElementById("liuyao-cast-summary");
    elements.count = document.getElementById("liuyao-count");
    elements.coinStage = document.getElementById("liuyao-coin-stage");
    elements.stack = document.getElementById("liuyao-stack");
    elements.coinResults = document.getElementById("liuyao-coin-results");
    elements.castButton = document.getElementById("liuyao-cast-button");
    elements.auto = document.getElementById("liuyao-auto");
    elements.skip = document.getElementById("liuyao-skip");
    elements.castBack = document.getElementById("liuyao-cast-back");
    elements.resultButton = document.getElementById("liuyao-result-button");
    elements.result = document.getElementById("liuyao-result");
    elements.copy = document.getElementById("liuyao-copy");
    elements.save = document.getElementById("liuyao-save");
    elements.restart = document.getElementById("liuyao-restart");
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
        ' data-liuyao-type="' + key + '" aria-pressed="' + (selected ? "true" : "false") + '">',
        '<span aria-hidden="true">' + type.icon + "</span><b>" + escapeHtml(type.label) + "</b>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderExamples() {
    const examples = data.examples[state.type] || data.examples.general;
    elements.examples.innerHTML = examples.map(function (question) {
      return '<button class="example-chip" type="button" data-liuyao-example="' +
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
    playSound("coin");
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
    playSound("coin");
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

  /* ---------- 装卦：八宫、纳甲、世应、六亲、六神 ---------- */

  function buildChartFor(lines, spirits) {
    const info = getPalaceTable()[chart.linesKey(lines)];
    if (!info) {
      return null;
    }
    const lower = trigramByLines(lines.slice(0, 3));
    const upper = trigramByLines(lines.slice(3, 6));
    if (!lower || !upper) {
      return null;
    }
    const branches = chart.branchesFor(lower.id, upper.id);
    const shiElement = branches[info.shiIndex].element;
    const relatives = chart.relativesFor(branches, shiElement);
    return {
      palace: info.palace,
      position: info.position,
      shiIndex: info.shiIndex,
      yingIndex: info.yingIndex,
      shiElement: shiElement,
      lines: branches.map(function (branch, index) {
        return {
          zhi: branch.zhi,
          element: branch.element,
          relative: relatives[index].relative,
          spirit: spirits[index],
          isShi: index === info.shiIndex,
          isYing: index === info.yingIndex
        };
      })
    };
  }

  function buildChartBundle(originalPattern, changedPattern) {
    const day = chart.dayGanZhi(chart.parseDate(state.castDate));
    const spirits = chart.spiritsFor(day.ganIndex);
    return {
      date: chart.formatDate(chart.parseDate(state.castDate)),
      gan: day.gan,
      zhi: day.zhi,
      ganzhi: day.ganzhi,
      original: buildChartFor(originalPattern, spirits),
      changed: buildChartFor(changedPattern, spirits)
    };
  }

  function chartRowMarkup(line, index, yang, isChanging) {
    const mark = line.isShi ? "世" : line.isYing ? "应" : "";
    const bars = yang ? "<span></span>" : "<span></span><span></span>";
    return [
      '<div class="chart-row' + (line.isShi ? " is-shi" : "") + (isChanging ? " is-changing" : "") + '">',
      '<span class="chart-cell chart-position">' + escapeHtml(lineNames[index]) + "</span>",
      '<span class="chart-cell chart-spirit">' + escapeHtml(line.spirit) + "</span>",
      '<span class="chart-cell chart-relative">' + escapeHtml(line.relative) + "</span>",
      '<span class="chart-cell chart-branch"><b>' + escapeHtml(line.zhi) + "</b><small>" +
        escapeHtml(line.element) + "</small></span>",
      '<span class="chart-cell chart-yao"><i class="yao-line ' + (yang ? "is-yang" : "is-yin") + '">' +
        bars + "</i></span>",
      '<span class="chart-cell chart-mark">' + mark + "</span>",
      "</div>"
    ].join("");
  }

  function chartCardMarkup(label, chartInfo, lines, changingIndexes) {
    if (!chartInfo) {
      return "";
    }
    const rows = [];
    for (let index = 5; index >= 0; index -= 1) {
      rows.push(chartRowMarkup(chartInfo.lines[index], index, lines[index] === 1,
        changingIndexes.indexOf(index) > -1));
    }
    return [
      '<article class="chart-card">',
      "<header>",
      "<b>" + escapeHtml(label) + "</b>",
      "<span>" + escapeHtml(chartInfo.palace + " · " + chartInfo.position + "卦") + "</span>",
      "</header>",
      '<div class="chart-table">',
      '<div class="chart-row chart-head"><span class="chart-cell">爻位</span>' +
        '<span class="chart-cell">六神</span><span class="chart-cell">六亲</span>' +
        '<span class="chart-cell">纳甲</span><span class="chart-cell">爻象</span>' +
        '<span class="chart-cell">世应</span></div>',
      rows.join(""),
      "</div>",
      '<p class="chart-note">世爻五行属' + escapeHtml(chartInfo.shiElement) +
        "，以此为「我」定六亲；应爻在" + escapeHtml(lineNames[chartInfo.yingIndex]) + "。</p>",
      "</article>"
    ].join("");
  }

  function chartSectionMarkup(bundle, originalPattern, changedPattern, changingIndexes) {
    if (!bundle) {
      return "";
    }
    return [
      '<section class="result-section">',
      "<h4>六亲六神装卦</h4>",
      '<p class="method-hint">起卦日 ' + escapeHtml(bundle.date) + "，" + escapeHtml(bundle.ganzhi) +
        "日。六神以日干起，阳日顺行、阴日逆行；六亲以世爻五行为「我」；世应依京房八宫卦序。</p>",
      '<div class="chart-pair">',
      chartCardMarkup("本卦", bundle.original, originalPattern, changingIndexes),
      chartCardMarkup("变卦", bundle.changed, changedPattern, []),
      "</div>",
      "</section>"
    ].join("");
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
      chart: buildChartBundle(originalPattern, changedPattern),
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
      chartSectionMarkup(result.chart, originalPattern, changedPattern, result.changingIndexes),
      '<section class="result-section"><h4>综合解卦</h4>' + result.summary.map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</section>",
      '<section class="result-section"><h4>六十四卦域别简读</h4><div class="domain-reading-grid">' +
        domainGridMarkup(result.originalDomainReadings) + "</div></section>",
      '<p class="liuyao-disclaimer">六爻排盘为简化版：已含六亲、六神与世应，未实现月建日辰旺衰、用神取用与神煞体系；仅供娱乐与自我反思。</p>'
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
    if (state.result.chart && state.result.chart.original) {
      lines.push("", "起卦日：" + state.result.chart.date + " " + state.result.chart.ganzhi + "日");
      lines.push("本卦卦宫：" + state.result.chart.original.palace + " · " +
        state.result.chart.original.position + "卦，世在" + lineNames[state.result.chart.original.shiIndex]);
      state.result.chart.original.lines.forEach(function (line, index) {
        lines.push(lineNames[index] + "：" + line.spirit + " · " + line.relative + " · " +
          line.zhi + "（" + line.element + "）" +
          (line.isShi ? " · 世" : line.isYing ? " · 应" : ""));
      });
    }
    lines.push("", state.result.summary.join("\n\n"), "", "六爻排盘为简化版：已含六亲、六神与世应，未实现月建日辰旺衰、用神取用与神煞体系；仅供娱乐与自我反思。");
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
      result.chart ? chartSectionMarkup(result.chart, originalPattern, changedPattern,
        result.changingIndexes || []) : "",
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
      const button = event.target.closest("[data-liuyao-type]");
      if (!button) {
        return;
      }
      state.type = button.dataset.liuyaoType;
      renderTypes();
      renderExamples();
    });
    elements.examples.addEventListener("click", function (event) {
      const button = event.target.closest("[data-liuyao-example]");
      if (!button) {
        return;
      }
      elements.question.value = button.dataset.liuyaoExample;
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
      state.castDate = elements.castDate ? elements.castDate.value : "";
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
    collectElements();
    state.castDate = chart.formatDate(new Date());
    if (elements.castDate) {
      elements.castDate.value = state.castDate;
    }
    renderTypes();
    renderExamples();
    resetCoinVisual();
    renderStack(-1);
    resetFlow();
    bind();
  }

  init();
})();
