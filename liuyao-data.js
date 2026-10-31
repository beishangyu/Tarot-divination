/* 六爻所需八卦、六十四卦、问题类型与爻位数据。 */
(function () {
  "use strict";

  const trigrams = {
    qian: { id: "qian", name: "乾", symbol: "☰", element: "金", nature: "天", lines: [1, 1, 1] },
    dui: { id: "dui", name: "兑", symbol: "☱", element: "金", nature: "泽", lines: [1, 1, 0] },
    li: { id: "li", name: "离", symbol: "☲", element: "火", nature: "火", lines: [1, 0, 1] },
    zhen: { id: "zhen", name: "震", symbol: "☳", element: "木", nature: "雷", lines: [1, 0, 0] },
    xun: { id: "xun", name: "巽", symbol: "☴", element: "木", nature: "风", lines: [0, 1, 1] },
    kan: { id: "kan", name: "坎", symbol: "☵", element: "水", nature: "水", lines: [0, 1, 0] },
    gen: { id: "gen", name: "艮", symbol: "☶", element: "土", nature: "山", lines: [0, 0, 1] },
    kun: { id: "kun", name: "坤", symbol: "☷", element: "土", nature: "地", lines: [0, 0, 0] }
  };

  const hexagramRows = [
    ["qian", "qian", "乾为天", 1, "刚健进取，宜自强不息，但过度刚强也容易失去回旋余地。"],
    ["qian", "dui", "天泽履", 10, "谨慎守礼，按规则前行，越接近目标越要留意脚下。"],
    ["qian", "li", "天火同人", 13, "同心协作，公开沟通有利，寻求共同目标比执着差异更重要。"],
    ["qian", "zhen", "天雷无妄", 25, "守正自然，避免投机和妄动，真实行动会带来清楚反馈。"],
    ["qian", "xun", "天风姤", 44, "不期而遇的变化出现，需要辨清来意、边界与长期影响。"],
    ["qian", "kan", "天水讼", 6, "意见相争，宜停止情绪化对抗，用证据和规则处理分歧。"],
    ["qian", "gen", "天山遁", 33, "适时退避不是失败，而是保存实力，等待更合适的位置。"],
    ["qian", "kun", "天地否", 12, "上下不通，沟通和推进都容易受阻，宜守不宜强求。"],

    ["dui", "qian", "泽天夬", 43, "决断在即，需要明确立场，但应在事实充分后再采取行动。"],
    ["dui", "dui", "兑为泽", 58, "喜悦沟通，真诚交流有利，轻松表达也能化解紧张。"],
    ["dui", "li", "泽火革", 49, "利于革新，但改变需要共识与时机，不宜只凭一时冲动。"],
    ["dui", "zhen", "泽雷随", 17, "顺势跟随，选对方向和对象最重要，不必事事争夺主导。"],
    ["dui", "xun", "泽风大过", 28, "承担已经过重，需要减压、求助或调整结构，避免继续硬撑。"],
    ["dui", "kan", "泽水困", 47, "处境受限，资源和耐心都被考验，宜守心待时，减少无效消耗。"],
    ["dui", "gen", "泽山咸", 31, "相互感应，真诚接触有利，但快速靠近仍要保留边界。"],
    ["dui", "kun", "泽地萃", 45, "资源汇聚，适合凝聚共识、整合力量，也要防止人多口杂。"],

    ["li", "qian", "火天大有", 14, "丰盛有成，适合分享成果并守住原则，越成功越需要清醒。"],
    ["li", "dui", "火泽睽", 38, "分歧明显，先求同存异，不必勉强所有人理解同一件事。"],
    ["li", "li", "离为火", 30, "依附光明，保持清楚认知与边界，也要避免过度消耗热情。"],
    ["li", "zhen", "火雷噬嗑", 21, "需要明确规则，处理障碍、纠纷和含糊承诺，宜依法依理。"],
    ["li", "xun", "火风鼎", 50, "更新格局，适合稳中求变，把旧结构转化成新的秩序。"],
    ["li", "kan", "火水未济", 64, "事情尚未完成，不宜过早松懈，耐心收尾比重新开始更重要。"],
    ["li", "gen", "火山旅", 56, "身处旅途或过渡期，宜谨慎适应，不把临时状态当成永久归宿。"],
    ["li", "kun", "火地晋", 35, "渐入光明，适合积极前行，用持续表现获得认可。"],

    ["zhen", "qian", "雷天大壮", 34, "力量充足，但强盛时更要节制，避免依靠气势压过别人。"],
    ["zhen", "dui", "雷泽归妹", 54, "关系位置尚未稳定，忌仓促许诺，应先确认角色与长期意愿。"],
    ["zhen", "li", "雷火丰", 55, "盛大丰盈，成果与关注同时增加，盛时更要控制节奏。"],
    ["zhen", "zhen", "震为雷", 51, "震动与警醒来临，先稳住情绪，再处理突发消息。"],
    ["zhen", "xun", "雷风恒", 32, "长期坚持，稳定和可持续比短期速度更重要。"],
    ["zhen", "kan", "雷水解", 40, "困难开始缓解，适合及时处理遗留问题，让局面真正松动。"],
    ["zhen", "gen", "雷山小过", 62, "可以处理小事，不宜越界冒进，细节上的谦慎会带来安全。"],
    ["zhen", "kun", "雷地豫", 16, "顺势筹备，在轻松氛围中保持警觉，提前安排比临时应对有利。"],

    ["xun", "qian", "风天小畜", 9, "力量尚小，宜积累、克制和整理资源，暂不急于一次突破。"],
    ["xun", "dui", "风泽中孚", 61, "诚信感通，坦白与一致的行动最能打破隔阂。"],
    ["xun", "li", "风火家人", 37, "先安内部，明确角色、责任与沟通方式，外部问题才容易处理。"],
    ["xun", "zhen", "风雷益", 42, "利于增益，行动与分享并行，改善结构会带来更大回报。"],
    ["xun", "xun", "巽为风", 57, "柔顺渗透，适合持续沟通与渐进影响，但不要失去自身立场。"],
    ["xun", "kan", "风水涣", 59, "涣散需要重新聚合，适合化解隔阂、疏通信息和情绪。"],
    ["xun", "gen", "风山渐", 53, "循序渐进，稳固发展，关系或计划都需要时间扎根。"],
    ["xun", "kun", "风地观", 20, "观察为先，先看后动，了解环境和他人反应再决定行动。"],

    ["kan", "qian", "水天需", 5, "等待时机，做好准备而不躁进，条件成熟后再推进更有把握。"],
    ["kan", "dui", "水泽节", 60, "节制有度，建立规则与预算，适度限制会带来更大自由。"],
    ["kan", "li", "水火既济", 63, "事情已有初步成果，谨慎守成，防止小问题重新演变成波动。"],
    ["kan", "zhen", "水雷屯", 3, "起步艰难，需要耐心整合资源，先解决眼前的基础问题。"],
    ["kan", "xun", "水风井", 48, "修井养源，更新长期基础和共同资源，不宜只做表面修补。"],
    ["kan", "kan", "坎为水", 29, "风险重重，守正谨慎前行，每一步都要确认安全和退路。"],
    ["kan", "gen", "水山蹇", 39, "前路受阻，宜求助、绕行或暂缓，不必独自对抗全部困难。"],
    ["kan", "kun", "水地比", 8, "亲近互助，选择可靠伙伴，关系建立在长期一致的行动上。"],

    ["gen", "qian", "山天大畜", 26, "蓄力待发，先积累能力和资源，克制之后才适合进取。"],
    ["gen", "dui", "山泽损", 41, "有所减损，主动舍弃小利，反而可能成就更大的整体目标。"],
    ["gen", "li", "山火贲", 22, "重视形式与表达，但最终仍需回到内容和真实价值。"],
    ["gen", "zhen", "山雷颐", 27, "养正养身，注意言语、饮食和信息摄入，也关注真正滋养你的关系。"],
    ["gen", "xun", "山风蛊", 18, "整治积弊，先查问题根源，旧结构需要被清理而非继续遮掩。"],
    ["gen", "kan", "山水蒙", 4, "启蒙求知，虚心请教有利，承认不知道是获得答案的第一步。"],
    ["gen", "gen", "艮为山", 52, "当止则止，安静整理内心和边界，停下来也是重要行动。"],
    ["gen", "kun", "山地剥", 23, "旧局逐步剥落，宜守不宜强留，先保护核心资源与身心。"],

    ["kun", "qian", "地天泰", 11, "上下通畅，适合稳健推进、沟通合作，珍惜已经形成的良性循环。"],
    ["kun", "dui", "地泽临", 19, "机会临近，主动关怀和实际支持有利，宜以温和方式接近目标。"],
    ["kun", "li", "地火明夷", 36, "光明受损，宜低调保存实力，不急于在不安全环境中证明自己。"],
    ["kun", "zhen", "地雷复", 24, "一阳来复，适合从小处重新开始，不必要求立刻恢复全部状态。"],
    ["kun", "xun", "地风升", 46, "逐步上升，依靠积累、师友和稳定行动，慢反而更稳。"],
    ["kun", "kan", "地水师", 7, "组织行动，纪律、信任和统一目标很重要，避免各自为战。"],
    ["kun", "gen", "地山谦", 15, "谦逊受益，低姿态更容易成事，但谦逊不等于否定自己的价值。"],
    ["kun", "kun", "坤为地", 2, "厚德承载，宜配合、耐心与务实，先让事情落地再谈远大目标。"]
  ];

  const elementGuidance = {
    金: "重视规则、取舍与执行边界",
    木: "关注生长节奏、协作与持续投入",
    水: "保留弹性、倾听反馈并控制风险",
    火: "辨识热度、时机与表达方式",
    土: "先稳住基础、资源与长期承诺"
  };

  const domainTemplates = {
    career: function (brief, upper, lower) {
      return "事业上，可借" + upper.nature + "在上、" + lower.nature +
        "在下的结构理解推进条件。" + brief + " 行动时宜" +
        elementGuidance[upper.element] + "，同时" + elementGuidance[lower.element] + "。";
    },
    love: function (brief, upper, lower) {
      return "感情上，关系会同时受到" + upper.nature + "与" + lower.nature +
        "两种力量影响。" + brief + " 沟通时宜" +
        elementGuidance[upper.element] + "，也需" + elementGuidance[lower.element] + "。";
    },
    wealth: function (brief, upper, lower) {
      return "财运上，宜先核对资源流动与现实条件。" + brief + " 处理钱款时宜" +
        elementGuidance[upper.element] + "，并" + elementGuidance[lower.element] + "。";
    },
    study: function (brief, upper, lower) {
      return "学业上，可把" + upper.nature + "与" + lower.nature +
        "理解成方法与环境之间的配合。" + brief + " 学习安排宜" +
        elementGuidance[upper.element] + "，同时" + elementGuidance[lower.element] + "。";
    },
    social: function (brief, upper, lower) {
      return "人际上，宜观察彼此立场、边界和持续行动。" + brief + " 互动中宜" +
        elementGuidance[upper.element] + "，并" + elementGuidance[lower.element] + "。";
    }
  };

  const hexagrams = {};
  hexagramRows.forEach(function (row) {
    const upper = row[0];
    const lower = row[1];
    const upperTrigram = trigrams[upper];
    const lowerTrigram = trigrams[lower];
    const brief = row[4];
    hexagrams[upper + ":" + lower] = {
      key: upper + ":" + lower,
      upper: upper,
      lower: lower,
      upperTrigram: {
        id: upperTrigram.id,
        name: upperTrigram.name,
        symbol: upperTrigram.symbol,
        nature: upperTrigram.nature,
        element: upperTrigram.element
      },
      lowerTrigram: {
        id: lowerTrigram.id,
        name: lowerTrigram.name,
        symbol: lowerTrigram.symbol,
        nature: lowerTrigram.nature,
        element: lowerTrigram.element
      },
      name: row[2],
      number: row[3],
      symbol: String.fromCodePoint(0x4DC0 + row[3] - 1),
      brief: brief,
      domainReadings: {
        career: domainTemplates.career(brief, upperTrigram, lowerTrigram),
        love: domainTemplates.love(brief, upperTrigram, lowerTrigram),
        wealth: domainTemplates.wealth(brief, upperTrigram, lowerTrigram),
        study: domainTemplates.study(brief, upperTrigram, lowerTrigram),
        social: domainTemplates.social(brief, upperTrigram, lowerTrigram)
      }
    };
  });

  const types = {
    general: {
      label: "综合",
      icon: "✦",
      opening: "六爻占卦适合观察事情的条件、变化动力与阶段趋势，不宜把它当作单一结果承诺。"
    },
    career: {
      label: "事业",
      icon: "◇",
      opening: "事业卦重点观察资源、协作、执行条件和变化方向，适合用来调整工作策略。"
    },
    study: {
      label: "学业",
      icon: "△",
      opening: "学业卦重点观察专注、方法、环境与阶段准备，适合用来校准学习节奏。"
    },
    love: {
      label: "感情",
      icon: "♡",
      opening: "感情卦重点观察互动回应、关系位置与现实边界，不替任何一方作绝对表态。"
    },
    wealth: {
      label: "财运",
      icon: "⬡",
      opening: "财运卦重点观察资源流动、风险与投入节奏，不能代替真实财务分析和专业建议。"
    },
    social: {
      label: "人际",
      icon: "◎",
      opening: "人际卦重点观察沟通立场、关系变化与第三方影响，宜结合持续行动判断。"
    }
  };

  const examples = {
    general: [
      "这件事接下来的主要变化是什么？",
      "当前局面里，我该主动还是等待？",
      "这件事最关键的条件是否已经成熟？"
    ],
    career: [
      "面对接下来的项目，我最应该关注什么？",
      "当前工作变动有哪些机会与风险？",
      "我应该如何调整事业上的行动策略？"
    ],
    study: [
      "这次考试最需要调整的部分是什么？",
      "我目前的学习方法是否合适？",
      "接下来一个月应如何安排学习重点？"
    ],
    love: [
      "这段关系目前的互动变化意味着什么？",
      "我该如何处理我们之间的沟通问题？",
      "这段感情下一步最值得观察什么？"
    ],
    wealth: [
      "我当前财务状态最需要注意什么？",
      "这项投入是否具备继续了解的条件？",
      "接下来应该如何安排收支与储蓄？"
    ],
    social: [
      "这次人际矛盾的关键在哪里？",
      "我和某位朋友的关系会如何变化？",
      "我应该怎样改善团队沟通？"
    ]
  };

  window.LIUYAO_DATA = {
    trigrams: trigrams,
    hexagrams: hexagrams,
    types: types,
    examples: examples,
    lineNames: ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"]
  };
})();
