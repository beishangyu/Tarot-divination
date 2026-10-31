(function () {
  "use strict";

  const allCards = window.TAROT_CARDS || [];
  const cardById = new Map(allCards.map(function (card) { return [card.id, card]; }));

  const QUESTION_TYPES = {
    love: {
      label: "感情",
      icon: "♡",
      opening: "这段感情议题的核心不只是对方会不会怎样，更在于你如何理解需要、边界和相互回应。",
      advice: "把牌面当作沟通与自省的提示，而不是替对方表态。"
    },
    career: {
      label: "事业",
      icon: "◇",
      opening: "这组牌关注你在工作中的位置、长期方向和可投入的资源，而不只是短期输赢。",
      advice: "优先选择能积累能力、信誉或选择权的行动。"
    },
    study: {
      label: "学业",
      icon: "△",
      opening: "学业议题通常与节奏、方法、注意力和长期目标有关，牌面适合用来检查当前策略。",
      advice: "把大目标拆成今天可以完成的学习单元。"
    },
    wealth: {
      label: "财运",
      icon: "⬡",
      opening: "财富议题需要把感受与事实放在一起看，包括收入、支出、风险承受力和长期安全感。",
      advice: "塔罗不能替代财务数据，请谨慎对待高风险决定。"
    },
    social: {
      label: "人际",
      icon: "◎",
      opening: "人际关系的答案往往藏在互动模式里，包括谁在靠近、谁在退后，以及你如何表达边界。",
      advice: "观察持续的行动，不必只凭一次情绪或一句话做结论。"
    },
    general: {
      label: "综合",
      icon: "✦",
      opening: "这组牌会从多个层面观察问题，重点不是给出绝对答案，而是帮助你看见当下最值得留意的线索。",
      advice: "先选择一件今天能做的小事，让理解进入现实。"
    }
  };

  const QUESTION_EXAMPLES = {
    love: [
      "我该如何理解这段关系近期出现的变化？",
      "在这段关系里，我更需要照顾自己的哪一部分？",
      "我可以怎样建立更健康的亲密边界？"
    ],
    career: [
      "当前工作上，我最值得关注的机会与风险是什么？",
      "我该如何规划接下来三个月的事业方向？",
      "现在是否适合推动职业上的转变？"
    ],
    study: [
      "我该如何调整目前的学习方法和节奏？",
      "影响我专注力的核心问题是什么？",
      "面对接下来的考试，我应该如何分配精力？"
    ],
    wealth: [
      "我当前的财务状态最需要留意什么？",
      "我该如何调整储蓄与消费之间的平衡？",
      "面对新的收入机会，我需要先评估哪些因素？"
    ],
    social: [
      "我该怎样理解和某位朋友近期的疏远？",
      "在人际关系中，我需要建立怎样的边界？",
      "我该如何改善团队里的沟通方式？"
    ],
    general: [
      "此刻我最需要看清的主题是什么？",
      "下一步我该把注意力放在哪里？",
      "我该如何面对目前这段不确定的时期？"
    ]
  };

  const SPREADS = {
    single: {
      id: "single",
      name: "单张牌",
      count: 1,
      description: "适合今日指引或一个需要迅速看清的核心问题。",
      positions: [
        {
          name: "核心指引",
          meaning: "回应你此刻最值得看见的主题。",
          prompt: "先记录第一感受，再看它与你问题中的哪个部分相呼应。"
        }
      ]
    },
    timeline: {
      id: "timeline",
      name: "三张牌 · 时间流",
      count: 3,
      description: "从过去、现在到未来，理解事情如何形成，以及接下来可能走向哪里。",
      positions: [
        {
          name: "过去",
          meaning: "已经发生并仍在影响你的基础。",
          prompt: "这里显示的是形成今日局面的经验、选择或情绪。"
        },
        {
          name: "现在",
          meaning: "当下最真实、最需要被看见的状态。",
          prompt: "这里提醒你辨认目前正在重复或正在变化的模式。"
        },
        {
          name: "未来",
          meaning: "沿当前方向继续时较可能出现的趋势。",
          prompt: "它不是注定结果，而是若保持当下选择，事情可能展开的方向。"
        }
      ]
    },
    decision: {
      id: "decision",
      name: "三张牌 · 行动牌阵",
      count: 3,
      description: "围绕情况、可采取的行动和可能结果，适合正在做决定的人。",
      positions: [
        {
          name: "情况",
          meaning: "问题真实所处的环境与关键矛盾。",
          prompt: "这条线索帮助你减少对局势的误判。"
        },
        {
          name: "行动",
          meaning: "你当下较有能力采取的态度或做法。",
          prompt: "行动建议不等于命令，请选择与你的价值一致且可执行的部分。"
        },
        {
          name: "结果",
          meaning: "若持续采取该行动，较可能形成的走向。",
          prompt: "结果会随现实变化而调整，重点是从中看见选择的力量。"
        }
      ]
    },
    five: {
      id: "five",
      name: "五张牌 · 深入梳理",
      count: 5,
      description: "从现状、阻碍、建议、趋势到结果，完整观察问题的多个层面。",
      positions: [
        {
          name: "现状",
          meaning: "目前最需要承认的现实状态。",
          prompt: "先把事实、感受和推测分开来看。"
        },
        {
          name: "阻碍",
          meaning: "让事情难以推进的内在或外在因素。",
          prompt: "阻碍并不一定是敌人，它也可能在保护某种尚未被看见的需要。"
        },
        {
          name: "建议",
          meaning: "此刻较有帮助的态度、行动或沟通方式。",
          prompt: "试着把建议落实成一个可在七天内执行的小步骤。"
        },
        {
          name: "趋势",
          meaning: "在现有选择下，局面可能发展的方向。",
          prompt: "趋势是提醒，不是保证；它可以随你的行动改变。"
        },
        {
          name: "结果",
          meaning: "综合当前能量后，较可能形成的阶段性结果。",
          prompt: "把结果理解为一次复盘节点，而不是不可更改的终点。"
        }
      ]
    },
    celtic: {
      id: "celtic",
      name: "简化凯尔特十字",
      count: 6,
      description: "保留凯尔特十字的观察逻辑，用六张牌梳理现状、挑战、根基与建议。",
      positions: [
        {
          name: "现状",
          meaning: "你正置身其中的核心局面。",
          prompt: "这张牌描述的是此刻的中心主题。"
        },
        {
          name: "挑战",
          meaning: "横切现状、需要正面处理的阻力。",
          prompt: "看清挑战，是为了选择更有效的回应，而不是制造恐惧。"
        },
        {
          name: "根基",
          meaning: "问题下面更深的历史或心理基础。",
          prompt: "这里可能连接着长期形成的信念与习惯。"
        },
        {
          name: "近期过去",
          meaning: "刚刚过去、仍有余波的影响。",
          prompt: "留意最近发生的事件如何塑造了当前判断。"
        },
        {
          name: "可能趋势",
          meaning: "如果延续现有节奏，接下来较可能发生什么。",
          prompt: "趋势用于提前准备，不是用来限制你的选择。"
        },
        {
          name: "可行建议",
          meaning: "综合牌阵后最适合尝试的行动方向。",
          prompt: "选择一个足够小、今天或本周就能开始的行动。"
        }
      ]
    }
  };

  const STORAGE_KEY = "stella-tarot-history-v1";

  const state = {
    question: "",
    questionType: "general",
    spreadId: "single",
    spread: SPREADS.single,
    deck: [],
    shuffled: false,
    cut: false,
    drawn: [],
    revealMode: false,
    summary: [],
    saved: false,
    busy: false,
    toastTimer: null
  };

  const elements = {
    stepper: document.getElementById("stepper"),
    views: {
      welcome: document.getElementById("view-welcome"),
      question: document.getElementById("view-question"),
      spread: document.getElementById("view-spread"),
      ritual: document.getElementById("view-ritual"),
      draw: document.getElementById("view-draw"),
      reading: document.getElementById("view-reading")
    },
    startReading: document.getElementById("start-reading"),
    brandHome: document.getElementById("brand-home"),
    questionInput: document.getElementById("question-input"),
    questionCount: document.getElementById("question-count"),
    questionError: document.getElementById("question-error"),
    questionTypes: document.getElementById("question-types"),
    questionExamples: document.getElementById("question-examples"),
    questionBack: document.getElementById("question-back"),
    questionNext: document.getElementById("question-next"),
    spreadGrid: document.getElementById("spread-grid"),
    spreadQuestionPreview: document.getElementById("spread-question-preview"),
    spreadBack: document.getElementById("spread-back"),
    spreadNext: document.getElementById("spread-next"),
    ritualStatus: document.getElementById("ritual-status"),
    deckStack: document.getElementById("deck-stack"),
    shuffleButton: document.getElementById("shuffle-button"),
    cutButton: document.getElementById("cut-button"),
    ritualBack: document.getElementById("ritual-back"),
    toDrawButton: document.getElementById("to-draw-button"),
    drawStepLabel: document.getElementById("draw-step-label"),
    drawTitle: document.getElementById("draw-title"),
    drawStatus: document.getElementById("draw-status"),
    drawProgressNumber: document.getElementById("draw-progress-number"),
    drawProgressTotal: document.getElementById("draw-progress-total"),
    drawDeck: document.getElementById("draw-deck"),
    deckRemaining: document.getElementById("deck-remaining"),
    drawActionTitle: document.getElementById("draw-action-title"),
    drawActionCopy: document.getElementById("draw-action-copy"),
    drawNext: document.getElementById("draw-next"),
    drawGrid: document.getElementById("draw-grid"),
    drawFinish: document.getElementById("draw-finish"),
    startReveal: document.getElementById("start-reveal"),
    readingCta: document.getElementById("reading-cta"),
    readingQuestion: document.getElementById("reading-question"),
    readingSummary: document.getElementById("reading-summary"),
    readingCards: document.getElementById("reading-cards"),
    saveReading: document.getElementById("save-reading"),
    restartReading: document.getElementById("restart-reading"),
    historyOpen: document.getElementById("history-open"),
    historyDialog: document.getElementById("history-dialog"),
    historyClose: document.getElementById("history-close"),
    historyList: document.getElementById("history-list"),
    historyClear: document.getElementById("history-clear"),
    historyDetailDialog: document.getElementById("history-detail-dialog"),
    historyDetailClose: document.getElementById("history-detail-close"),
    historyDetailContent: document.getElementById("history-detail-content"),
    toast: document.getElementById("toast")
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(function () {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

  function showView(name) {
    Object.keys(elements.views).forEach(function (key) {
      elements.views[key].hidden = key !== name;
    });

    const stepForView = {
      question: "question",
      spread: "spread",
      ritual: "ritual",
      draw: "draw",
      reading: "reading"
    };

    elements.stepper.hidden = name === "welcome";
    updateStepper(stepForView[name] || "");
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function updateStepper(activeStep) {
    const order = ["question", "spread", "ritual", "draw", "reading"];
    const activeIndex = order.indexOf(activeStep);
    document.querySelectorAll(".step-item").forEach(function (item) {
      const itemIndex = order.indexOf(item.dataset.step);
      item.classList.toggle("is-active", item.dataset.step === activeStep);
      item.classList.toggle("is-done", activeIndex > -1 && itemIndex < activeIndex);
      item.setAttribute("aria-current", item.dataset.step === activeStep ? "step" : "false");
    });
  }

  function renderQuestionTypes() {
    elements.questionTypes.innerHTML = Object.keys(QUESTION_TYPES).map(function (key) {
      const type = QUESTION_TYPES[key];
      return [
        '<button class="choice-option' + (state.questionType === key ? " is-selected" : "") + '"',
        ' type="button" data-question-type="' + key + '"',
        ' aria-pressed="' + (state.questionType === key ? "true" : "false") + '">',
        '<span aria-hidden="true">' + type.icon + "</span>",
        "<b>" + type.label + "</b>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderQuestionExamples() {
    const examples = QUESTION_EXAMPLES[state.questionType] || QUESTION_EXAMPLES.general;
    elements.questionExamples.innerHTML = examples.map(function (question) {
      return '<button class="example-chip" type="button" data-example="' + escapeHtml(question) + '">' +
        escapeHtml(question) +
        "</button>";
    }).join("");
  }

  function renderSpreads() {
    elements.spreadGrid.innerHTML = Object.keys(SPREADS).map(function (key) {
      const spread = SPREADS[key];
      const positions = spread.positions.map(function (position) {
        return "<span>" + escapeHtml(position.name) + "</span>";
      }).join("");

      return [
        '<button class="spread-option' + (state.spreadId === key ? " is-selected" : "") + '"',
        ' type="button" data-spread="' + key + '" aria-pressed="' + (state.spreadId === key ? "true" : "false") + '">',
        '<span class="spread-option-top">',
        "<h3>" + escapeHtml(spread.name) + "</h3>",
        '<span class="spread-count">' + spread.count + " 张</span>",
        "</span>",
        "<p>" + escapeHtml(spread.description) + "</p>",
        '<span class="position-preview">' + positions + "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function setQuestionType(type) {
    if (!QUESTION_TYPES[type]) {
      return;
    }
    state.questionType = type;
    renderQuestionTypes();
    renderQuestionExamples();
  }

  function updateQuestionPreview() {
    const preview = state.question
      ? "你的问题是：“" + state.question + "”"
      : "请选择一个适合梳理问题的牌阵。";
    elements.spreadQuestionPreview.textContent = preview;
  }

  function validateQuestion() {
    const question = elements.questionInput.value.trim();
    if (question.length < 4) {
      elements.questionError.textContent = "请至少写下 4 个字，让问题更具体。";
      elements.questionInput.focus();
      return false;
    }

    elements.questionError.textContent = "";
    state.question = question;
    state.questionType = state.questionType || "general";
    state.saved = false;
    updateQuestionPreview();
    return true;
  }

  function shuffleArray(source) {
    const array = source.slice();
    for (let index = array.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = array[index];
      array[index] = array[swapIndex];
      array[swapIndex] = current;
    }
    return array;
  }

  function resetDeckVisual() {
    elements.deckStack.classList.remove("is-shuffling", "is-cutting");
    void elements.deckStack.offsetWidth;
  }

  function updateRitualControls() {
    elements.cutButton.disabled = state.busy || !state.shuffled;
    elements.toDrawButton.disabled = state.busy || !state.shuffled || !state.cut;
  }

  function shuffleDeck() {
    if (state.busy) {
      return;
    }

    state.busy = true;
    state.deck = shuffleArray(allCards);
    state.drawn = [];
    state.revealMode = false;
    state.shuffled = false;
    state.cut = false;
    state.saved = false;
    resetDeckVisual();
    elements.deckStack.classList.add("is-shuffling");
    elements.ritualStatus.textContent = "牌正在洗匀，也让问题暂时离开急于求答案的惯性。";
    updateRitualControls();

    const duration = reducedMotion() ? 80 : 980;
    window.setTimeout(function () {
      elements.deckStack.classList.remove("is-shuffling");
      state.shuffled = true;
      state.busy = false;
      elements.ritualStatus.textContent = "牌已洗匀。请切牌，让节奏从准备进入选择。";
      updateRitualControls();
    }, duration);
  }

  function cutDeck() {
    if (state.busy || !state.shuffled) {
      return;
    }

    state.busy = true;
    state.cut = false;
    resetDeckVisual();
    elements.deckStack.classList.add("is-cutting");
    elements.ritualStatus.textContent = "切牌完成中，牌的次序已经固定。";
    updateRitualControls();

    const duration = reducedMotion() ? 80 : 780;
    window.setTimeout(function () {
      elements.deckStack.classList.remove("is-cutting");
      state.cut = true;
      state.busy = false;
      elements.ritualStatus.textContent = "仪式完成。现在可以从 78 张牌中抽取本次所需牌数。";
      updateRitualControls();
    }, duration);
  }

  function startDrawing() {
    if (!state.shuffled || !state.cut) {
      showToast("请先完成洗牌与切牌。");
      return;
    }

    state.drawn = [];
    state.revealMode = false;
    state.saved = false;
    elements.drawStepLabel.textContent = "STEP 04 · 抽牌";
    elements.drawTitle.textContent = "从牌堆中抽取属于此刻的牌";
    elements.drawActionTitle.textContent = "点击牌堆或下方按钮";
    elements.drawActionCopy.textContent = "每次抽取都会从完整牌组中移除该牌，本次占卜不会重复。";
    elements.startReveal.hidden = false;
    elements.startReveal.disabled = true;
    elements.readingCta.hidden = true;
    elements.drawFinish.hidden = true;
    renderDrawView();
    showView("draw");
  }

  function drawNextCard() {
    const total = state.spread.count;
    if (state.drawn.length >= total || !state.deck.length) {
      return;
    }

    const card = state.deck.pop();
    state.drawn.push({
      card: card,
      reversed: Math.random() < 0.5,
      revealed: false,
      positionIndex: state.drawn.length
    });
    renderDrawView();

    const completed = state.drawn.length === total;
    elements.startReveal.disabled = !completed;
    elements.drawFinish.hidden = !completed;
    if (completed) {
      elements.drawActionTitle.textContent = "本次所需牌数已经完成";
      elements.drawActionCopy.textContent = "点击下方按钮，再逐张翻开牌面并记录第一感受。";
      elements.drawStatus.textContent = "已抽 " + total + " / " + total + " 张，可以开始翻牌。";
    }
  }

  function cardFrontMarkup(card, reversed) {
    const secondary = card.arcana === "大阿卡纳"
      ? card.arcana
      : card.arcana + " · " + card.suit;
    const orientation = reversed ? "逆位" : "正位";

    return [
      '<span class="card-face card-front' + (reversed ? " is-reversed" : "") + '">',
      '<span class="card-front-meta"><span>' + escapeHtml(card.number) + "</span><span>" + escapeHtml(card.element) + "</span></span>",
      '<span class="card-symbol" aria-hidden="true">' + card.symbol + "</span>",
      '<span class="card-front-name"><b>' + escapeHtml(card.name) + "</b><small>" + escapeHtml(secondary) + "</small></span>",
      '<span class="orientation-tag' + (reversed ? " is-reversed" : "") + '">' + orientation + "</span>",
      "</span>"
    ].join("");
  }

  function cardFaceMarkup(card, reversed) {
    return [
      '<span class="card-inner">',
      '<span class="card-face card-back"><span class="card-back-center" aria-hidden="true">✦</span></span>',
      cardFrontMarkup(card, reversed),
      "</span>"
    ].join("");
  }

  function drawCardMarkup(item, index) {
    const position = state.spread.positions[index];
    const canFlip = state.revealMode && !item.revealed;
    const orientation = item.reversed ? "逆位" : "正位";
    const label = item.revealed
      ? cardFrontLabel(item.card, orientation)
      : "第 " + (index + 1) + " 张牌，等待翻开";

    return [
      '<div class="card-slot" data-slot="' + index + '">',
      '<button class="tarot-card' + (item.revealed ? " flipped" : "") + '" type="button"',
      ' data-card-index="' + index + '" aria-label="' + escapeHtml(label) + '"',
      ' aria-pressed="' + (item.revealed ? "true" : "false") + '"',
      canFlip ? "" : " disabled",
      ">",
      cardFaceMarkup(item.card, item.reversed),
      "</button>",
      '<div class="slot-label"><b>' + escapeHtml(position.name) + "</b>",
      '<span class="reveal-name">' + escapeHtml(item.revealed ? item.card.name + " · " + orientation : (state.revealMode ? "点击翻开" : "等待翻开")) + "</span></div>",
      "</div>"
    ].join("");
  }

  function cardFrontLabel(card, orientation) {
    return card.name + "，" + orientation + "，位于" + card.arcana;
  }

  function renderDrawView() {
    const total = state.spread.count;
    const drawn = state.drawn.length;
    elements.drawProgressTotal.textContent = "/ " + total;
    elements.drawProgressNumber.textContent = String(drawn);
    elements.deckRemaining.textContent = String(state.deck.length);
    elements.drawGrid.dataset.count = String(total);
    elements.drawGrid.innerHTML = state.drawn.map(drawCardMarkup).join("");

    if (!state.revealMode) {
      elements.drawStatus.textContent = "已抽 " + drawn + " / " + total + " 张";
    }

    const completed = drawn === total;
    elements.drawDeck.disabled = completed;
    elements.drawNext.disabled = completed;
    elements.drawNext.textContent = completed ? "已完成抽牌" : "抽取下一张";
  }

  function startRevealMode() {
    if (state.drawn.length !== state.spread.count) {
      return;
    }

    state.revealMode = true;
    elements.startReveal.hidden = true;
    elements.readingCta.hidden = true;
    elements.drawStepLabel.textContent = "STEP 04 · 翻牌";
    elements.drawTitle.textContent = "逐张翻牌，先听见自己的第一反应";
    elements.drawActionTitle.textContent = "点击任意牌背翻牌";
    elements.drawActionCopy.textContent = "翻牌没有固定顺序。先留意你看到牌名前的感觉，再阅读牌义。";
    elements.drawStatus.textContent = "已翻开 0 / " + state.spread.count + " 张";
    renderDrawView();
  }

  function flipCard(index) {
    const item = state.drawn[index];
    if (!state.revealMode || !item || item.revealed) {
      return;
    }

    item.revealed = true;
    const button = elements.drawGrid.querySelector('[data-card-index="' + index + '"]');
    const slot = elements.drawGrid.querySelector('[data-slot="' + index + '"]');
    if (button) {
      button.classList.add("flipped");
      button.setAttribute("aria-pressed", "true");
      button.disabled = true;
      button.setAttribute("aria-label", cardFrontLabel(item.card, item.reversed ? "逆位" : "正位"));
    }
    if (slot) {
      const revealName = slot.querySelector(".reveal-name");
      if (revealName) {
        revealName.textContent = item.card.name + " · " + (item.reversed ? "逆位" : "正位");
      }
    }

    const revealedCount = state.drawn.filter(function (draw) { return draw.revealed; }).length;
    elements.drawStatus.textContent = "已翻开 " + revealedCount + " / " + state.spread.count + " 张";

    if (revealedCount === state.spread.count) {
      elements.readingCta.hidden = false;
      elements.drawActionTitle.textContent = "所有牌已经翻开";
      elements.drawActionCopy.textContent = "完整解读会综合问题类型、牌阵位置、正逆位与关键词。";
      elements.readingCta.focus();
    }
  }

  function miniCardMarkup(card, reversed) {
    return [
      '<div class="tarot-card flipped" aria-hidden="true">',
      cardFaceMarkup(card, reversed),
      "</div>"
    ].join("");
  }

  function keywordsFor(card, reversed) {
    return reversed ? card.keywordsReversed : card.keywordsUpright;
  }

  function meaningFor(card, reversed) {
    return reversed ? card.meaningReversed : card.meaningUpright;
  }

  function buildPositionInterpretation(item, index, spread, questionType) {
    const position = spread.positions[index];
    const keywordText = keywordsFor(item.card, item.reversed).join("、");
    const orientationText = item.reversed ? "逆位" : "正位";
    const typeAdvice = QUESTION_TYPES[questionType].advice;

    return (
      "在“" + position.name + "”这个位置上，" + item.card.name + "以" + orientationText + "出现，关键词是" +
      keywordText + "。" + meaningFor(item.card, item.reversed) + " " + position.prompt + " " + typeAdvice
    );
  }

  function buildSummary(spread, questionType, items) {
    const uprightCount = items.filter(function (item) { return !item.reversed; }).length;
    const reversedCount = items.length - uprightCount;
    const majorCount = items.filter(function (item) { return item.card.arcana === "大阿卡纳"; }).length;
    const suitCounts = {};

    items.forEach(function (item) {
      if (item.card.suitKey) {
        suitCounts[item.card.suitKey] = (suitCounts[item.card.suitKey] || 0) + 1;
      }
    });

    const dominantSuit = Object.keys(suitCounts).sort(function (a, b) {
      return suitCounts[b] - suitCounts[a];
    })[0];
    const suitTheme = dominantSuit ? window.TAROT_SUITS[dominantSuit].theme : "";
    const orientationParagraph = reversedCount > uprightCount
      ? "逆位较多，提示这件事可能仍处在消化、调整或尚未完全展开的阶段。逆位不代表坏事，更像是在邀请你先处理内在阻力，再决定外部行动。"
      : uprightCount > reversedCount
        ? "正位较多，说明可用的资源与方向已经比较明显，重点是愿意稳定行动，而不是继续等待一个毫无风险的时刻。"
        : "正位与逆位接近，显示外部条件与内在准备正在拉扯。你可以一边推进，一边保留复盘和修正的空间。";
    const majorParagraph = majorCount >= Math.ceil(items.length / 2)
      ? "大阿卡纳占比较高，这更像一个涉及方向、信念或成长阶段的问题，短期技巧之外，还需要回到你真正重视的价值。"
      : suitTheme
        ? "牌面较集中在“" + suitTheme + "”这一主题，适合从这个角度观察具体现实，而不只停留在猜测结果。"
        : "牌面没有明显集中于单一主题，说明这个问题同时受到情感、思考与现实条件影响。";
    const positionLine = items.map(function (item, index) {
      const keywords = keywordsFor(item.card, item.reversed).slice(0, 2).join("、");
      return "“" + spread.positions[index].name + "”是" + item.card.name + "（" +
        (item.reversed ? "逆位" : "正位") + "，" + keywords + "）";
    }).join("；");
    const opening = QUESTION_TYPES[questionType].opening;
    const closing = "综合来看，不必把牌面当成结论。更容易帮助你的是：把 " +
      items.reduce(function (keywords, item) {
        return keywords.concat(keywordsFor(item.card, item.reversed).slice(0, 1));
      }, []).slice(0, 5).join("、") +
      " 这些关键词放回现实，观察它们分别对应哪些事实、感受和可执行选择。";

    return [
      opening + "你选择的是“" + spread.name + "”，问题焦点为：“" + state.question + "”。",
      "各牌位依次显示：" + positionLine + "。",
      orientationParagraph + majorParagraph,
      closing
    ];
  }

  function readingCardsMarkup(items, spread) {
    return items.map(function (item, index) {
      const position = spread.positions[index];
      const keywords = keywordsFor(item.card, item.reversed);
      const interpretation = buildPositionInterpretation(item, index, spread, state.questionType);

      return [
        '<article class="reading-card">',
        '<div class="mini-card">' + miniCardMarkup(item.card, item.reversed) + "</div>",
        '<div class="reading-content">',
        '<div class="position-name">' + escapeHtml(position.name) + " · " + (item.reversed ? "逆位" : "正位") + "</div>",
        "<h3>" + escapeHtml(item.card.name) + "<span>" + escapeHtml(item.card.number + " · " + item.card.arcana + (item.card.suit ? " · " + item.card.suit : "")) + "</span></h3>",
        '<div class="keyword-list">' + keywords.map(function (keyword) {
          return "<span>" + escapeHtml(keyword) + "</span>";
        }).join("") + "</div>",
        "<p>" + escapeHtml(interpretation) + "</p>",
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function showReading() {
    if (state.drawn.length !== state.spread.count || !state.drawn.every(function (item) { return item.revealed; })) {
      showToast("请先逐张翻开全部牌面。");
      return;
    }

    state.summary = buildSummary(state.spread, state.questionType, state.drawn);
    state.saved = false;
    elements.readingQuestion.textContent = "问题类型：" + QUESTION_TYPES[state.questionType].label + " · 牌阵：" + state.spread.name + " · “" + state.question + "”";
    elements.readingSummary.innerHTML = state.summary.map(function (paragraph) {
      return "<p>" + escapeHtml(paragraph) + "</p>";
    }).join("");
    elements.readingCards.innerHTML = readingCardsMarkup(state.drawn, state.spread);
    elements.saveReading.disabled = false;
    elements.saveReading.textContent = "保存本次记录";
    showView("reading");
  }

  function resetReading() {
    state.question = "";
    state.questionType = "general";
    state.spreadId = "single";
    state.spread = SPREADS.single;
    state.deck = [];
    state.shuffled = false;
    state.cut = false;
    state.drawn = [];
    state.revealMode = false;
    state.summary = [];
    state.saved = false;
    state.busy = false;

    elements.questionInput.value = "";
    elements.questionCount.textContent = "0";
    elements.questionError.textContent = "";
    elements.ritualStatus.textContent = "点击洗牌，想象你把注意力慢慢收回到这个问题上。";
    elements.drawGrid.innerHTML = "";
    elements.drawFinish.hidden = true;
    elements.readingCta.hidden = true;
    elements.startReveal.hidden = false;
    elements.startReveal.disabled = true;
    elements.saveReading.disabled = false;
    elements.saveReading.textContent = "保存本次记录";
    resetDeckVisual();
    renderQuestionTypes();
    renderQuestionExamples();
    renderSpreads();
    updateQuestionPreview();
    updateRitualControls();
    showView("welcome");
  }

  function getHistory() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(records) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 10)));
      return true;
    } catch (error) {
      showToast("浏览器暂时无法保存记录。");
      return false;
    }
  }

  function makeRecord() {
    const now = new Date();
    return {
      id: now.getTime().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      createdAt: now.toISOString(),
      question: state.question,
      questionType: state.questionType,
      spreadId: state.spreadId,
      spreadName: state.spread.name,
      summary: state.summary.slice(),
      cards: state.drawn.map(function (item, index) {
        return {
          cardId: item.card.id,
          reversed: item.reversed,
          positionIndex: index
        };
      })
    };
  }

  function saveCurrentReading() {
    if (!state.summary.length || state.saved) {
      return;
    }

    const record = makeRecord();
    const history = [record].concat(getHistory()).slice(0, 10);
    if (!saveHistory(history)) {
      return;
    }

    state.saved = true;
    elements.saveReading.disabled = true;
    elements.saveReading.textContent = "已保存到历史记录";
    renderHistory();
    showToast("本次占卜已保存，仅保存在当前浏览器。");
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "时间未知";
    }
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function renderHistory() {
    const history = getHistory();
    if (!history.length) {
      elements.historyList.innerHTML = '<div class="history-empty">还没有保存过占卜记录。</div>';
      elements.historyClear.disabled = true;
      return;
    }

    elements.historyClear.disabled = false;
    elements.historyList.innerHTML = history.map(function (record) {
      const type = QUESTION_TYPES[record.questionType] || QUESTION_TYPES.general;
      const spread = SPREADS[record.spreadId] || { name: record.spreadName || "未知牌阵" };
      return [
        '<article class="history-item">',
        "<div>",
        '<time datetime="' + escapeHtml(record.createdAt) + '">' + escapeHtml(formatDate(record.createdAt)) + "</time>",
        "<h3>" + escapeHtml(record.question) + "</h3>",
        "<p>" + escapeHtml(type.label + " · " + spread.name + " · " + record.cards.length + " 张牌") + "</p>",
        "</div>",
        '<div class="history-item-actions">',
        '<button class="small-action" type="button" data-history-action="view" data-id="' + escapeHtml(record.id) + '">查看</button>',
        '<button class="small-action danger" type="button" data-history-action="delete" data-id="' + escapeHtml(record.id) + '">删除</button>',
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function openHistory() {
    renderHistory();
    if (typeof elements.historyDialog.showModal === "function") {
      elements.historyDialog.showModal();
    } else {
      elements.historyDialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function recordToDrawItems(record) {
    return record.cards.map(function (entry, index) {
      const card = cardById.get(entry.cardId);
      if (!card) {
        return null;
      }
      return {
        card: card,
        reversed: Boolean(entry.reversed),
        revealed: true,
        positionIndex: index
      };
    }).filter(Boolean);
  }

  function openHistoryDetail(id) {
    const record = getHistory().find(function (item) { return item.id === id; });
    if (!record) {
      showToast("没有找到这条记录。");
      return;
    }

    const spread = SPREADS[record.spreadId] || SPREADS.single;
    const items = recordToDrawItems(record);
    const summary = Array.isArray(record.summary) ? record.summary : [];
    const type = QUESTION_TYPES[record.questionType] || QUESTION_TYPES.general;

    elements.historyDetailContent.innerHTML = [
      '<div class="history-detail-body">',
      '<div class="detail-meta">',
      "<div><span>时间</span><b>" + escapeHtml(formatDate(record.createdAt)) + "</b></div>",
      "<div><span>类型</span><b>" + escapeHtml(type.label) + "</b></div>",
      "<div><span>牌阵</span><b>" + escapeHtml(spread.name) + "</b></div>",
      "</div>",
      "<h3>" + escapeHtml(record.question) + "</h3>",
      summary.length ? '<div class="detail-summary">' + summary.map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") + "</div>" : "",
      items.map(function (item, index) {
        const position = spread.positions[index] || { name: "牌位 " + (index + 1) };
        return [
          '<div class="detail-card-row">',
          '<div class="mini-card">' + miniCardMarkup(item.card, item.reversed) + "</div>",
          "<div>",
          "<h3>" + escapeHtml(position.name + " · " + item.card.name + (item.reversed ? " · 逆位" : " · 正位")) + "</h3>",
          "<p>" + escapeHtml(meaningFor(item.card, item.reversed)) + "</p>",
          "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");

    if (typeof elements.historyDetailDialog.showModal === "function") {
      elements.historyDetailDialog.showModal();
    } else {
      elements.historyDetailDialog.setAttribute("open", "");
    }
  }

  function deleteHistoryRecord(id) {
    const nextHistory = getHistory().filter(function (record) { return record.id !== id; });
    saveHistory(nextHistory);
    renderHistory();
    showToast("记录已删除。");
  }

  function clearHistory() {
    if (!getHistory().length) {
      return;
    }
    if (!window.confirm("确定要删除全部历史记录吗？此操作无法撤销。")) {
      return;
    }
    saveHistory([]);
    renderHistory();
    showToast("历史记录已清空。");
  }

  function bindEvents() {
    elements.startReading.addEventListener("click", function () {
      showView("question");
      elements.questionInput.focus();
    });

    elements.brandHome.addEventListener("click", resetReading);
    elements.questionBack.addEventListener("click", function () { showView("welcome"); });
    elements.spreadBack.addEventListener("click", function () { showView("question"); });
    elements.ritualBack.addEventListener("click", function () { showView("spread"); });

    elements.questionInput.addEventListener("input", function () {
      elements.questionCount.textContent = String(elements.questionInput.value.length);
      if (elements.questionError.textContent) {
        elements.questionError.textContent = "";
      }
    });

    elements.questionTypes.addEventListener("click", function (event) {
      const button = event.target.closest("[data-question-type]");
      if (button) {
        setQuestionType(button.dataset.questionType);
      }
    });

    elements.questionExamples.addEventListener("click", function (event) {
      const button = event.target.closest("[data-example]");
      if (!button) {
        return;
      }
      elements.questionInput.value = button.dataset.example;
      elements.questionCount.textContent = String(elements.questionInput.value.length);
      elements.questionError.textContent = "";
      elements.questionInput.focus();
    });

    elements.questionNext.addEventListener("click", function () {
      if (validateQuestion()) {
        renderSpreads();
        updateQuestionPreview();
        showView("spread");
      }
    });

    elements.spreadGrid.addEventListener("click", function (event) {
      const button = event.target.closest("[data-spread]");
      if (!button) {
        return;
      }
      state.spreadId = button.dataset.spread;
      state.spread = SPREADS[state.spreadId];
      state.deck = [];
      state.shuffled = false;
      state.cut = false;
      state.drawn = [];
      renderSpreads();
      updateRitualControls();
    });

    elements.spreadNext.addEventListener("click", function () {
      updateQuestionPreview();
      elements.ritualStatus.textContent = "点击洗牌，想象你把注意力慢慢收回到这个问题上。";
      state.shuffled = false;
      state.cut = false;
      state.drawn = [];
      updateRitualControls();
      showView("ritual");
    });

    elements.shuffleButton.addEventListener("click", shuffleDeck);
    elements.cutButton.addEventListener("click", cutDeck);
    elements.toDrawButton.addEventListener("click", startDrawing);
    elements.drawDeck.addEventListener("click", drawNextCard);
    elements.drawNext.addEventListener("click", drawNextCard);
    elements.startReveal.addEventListener("click", startRevealMode);
    elements.readingCta.addEventListener("click", showReading);
    elements.restartReading.addEventListener("click", resetReading);
    elements.saveReading.addEventListener("click", saveCurrentReading);

    elements.drawGrid.addEventListener("click", function (event) {
      const cardButton = event.target.closest("[data-card-index]");
      if (cardButton) {
        flipCard(Number(cardButton.dataset.cardIndex));
      }
    });

    elements.historyOpen.addEventListener("click", openHistory);
    elements.historyClose.addEventListener("click", function () { closeDialog(elements.historyDialog); });
    elements.historyDetailClose.addEventListener("click", function () { closeDialog(elements.historyDetailDialog); });
    elements.historyClear.addEventListener("click", clearHistory);

    elements.historyList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-history-action]");
      if (!button) {
        return;
      }
      if (button.dataset.historyAction === "view") {
        openHistoryDetail(button.dataset.id);
      }
      if (button.dataset.historyAction === "delete") {
        deleteHistoryRecord(button.dataset.id);
      }
    });

    [elements.historyDialog, elements.historyDetailDialog].forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
          closeDialog(dialog);
        }
      });
    });
  }

  function init() {
    renderQuestionTypes();
    renderQuestionExamples();
    renderSpreads();
    updateQuestionPreview();
    updateRitualControls();
    renderHistory();
    bindEvents();
    showView("welcome");

    if (allCards.length !== 78) {
      elements.welcomeNote = document.querySelector(".welcome-note");
      if (elements.welcomeNote) {
        elements.welcomeNote.textContent = "牌库载入不完整，请刷新页面后重试。";
      }
    }
  }

  init();
})();
