/* 六爻装卦辅助：纳甲、八宫卦序、世应、六亲、六神与干支换算。 */
(function () {
  "use strict";

  const GAN = "甲乙丙丁戊己庚辛壬癸";
  const ZHI = "子丑寅卯辰巳午未申酉戌亥";

  /* 地支五行：子水丑土、寅木卯木、辰土巳火、午火未土、申金酉金、戌土亥水 */
  const ZHI_ELEMENT = {
    子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
    午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水"
  };

  const ELEMENT_GENERATES = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const ELEMENT_OVERCOMES = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

  /* 八宫纳甲：阳卦（乾坎艮震）顺行，阴卦（巽离坤兑）逆行 */
  const NAJIA = {
    qian: { gan: "甲", lower: ["子", "寅", "辰"], upper: ["午", "申", "戌"], palace: "乾宫" },
    kan: { gan: "戊", lower: ["寅", "辰", "午"], upper: ["申", "戌", "子"], palace: "坎宫" },
    gen: { gan: "丙", lower: ["辰", "午", "申"], upper: ["戌", "子", "寅"], palace: "艮宫" },
    zhen: { gan: "庚", lower: ["子", "寅", "辰"], upper: ["午", "申", "戌"], palace: "震宫" },
    xun: { gan: "辛", lower: ["丑", "亥", "酉"], upper: ["未", "巳", "卯"], palace: "巽宫" },
    li: { gan: "己", lower: ["卯", "丑", "亥"], upper: ["酉", "未", "巳"], palace: "离宫" },
    kun: { gan: "乙", lower: ["未", "巳", "卯"], upper: ["亥", "酉", "未"], palace: "坤宫" },
    dui: { gan: "丁", lower: ["巳", "卯", "丑"], upper: ["亥", "酉", "未"], palace: "兑宫" }
  };

  const SIX_SPIRITS = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];

  function linesKey(lines) {
    return lines.join("");
  }

  function flip(lines, indexes) {
    const result = lines.slice();
    indexes.forEach(function (index) {
      result[index] = result[index] ? 0 : 1;
    });
    return result;
  }

  /* 依据八宫规则生成「卦象 → 卦宫 + 世爻」的完整对照表 */
  function buildPalaceTable(trigrams) {
    const table = {};
    Object.keys(NAJIA).forEach(function (trigramKey) {
      const base = trigrams[trigramKey].lines.concat(trigrams[trigramKey].lines);
      const steps = [
        { name: "本宫", shi: 6, lines: base },
        { name: "一世", shi: 1, lines: flip(base, [0]) },
        { name: "二世", shi: 2, lines: flip(base, [0, 1]) },
        { name: "三世", shi: 3, lines: flip(base, [0, 1, 2]) },
        { name: "四世", shi: 4, lines: flip(base, [0, 1, 2, 3]) },
        { name: "五世", shi: 5, lines: flip(base, [0, 1, 2, 3, 4]) },
        { name: "游魂", shi: 4, lines: flip(base, [0, 1, 2, 4]) },
        { name: "归魂", shi: 3, lines: flip(base, [4]) }
      ];
      steps.forEach(function (step) {
        const key = linesKey(step.lines);
        if (!table[key]) {
          table[key] = {
            palace: NAJIA[trigramKey].palace,
            position: step.name,
            shiIndex: step.shi - 1,
            yingIndex: step.shi + 3 > 6 ? step.shi - 4 : step.shi + 2
          };
        }
      });
    });
    return table;
  }

  /* 纳甲：返回每爻的地支与五行（下卦三爻 + 上卦三爻） */
  function branchesFor(lowerTrigram, upperTrigram) {
    const lower = NAJIA[lowerTrigram];
    const upper = NAJIA[upperTrigram];
    const list = lower.lower.concat(upper.upper);
    return list.map(function (zhi) {
      return { zhi: zhi, element: ZHI_ELEMENT[zhi] };
    });
  }

  /* 六亲：以世爻五行为「我」 */
  function relativesFor(branches, shiElement) {
    return branches.map(function (branch) {
      const element = branch.element;
      let relative = "";
      if (ELEMENT_GENERATES[element] === shiElement) {
        relative = "父母";
      } else if (element === shiElement) {
        relative = "兄弟";
      } else if (ELEMENT_GENERATES[shiElement] === element) {
        relative = "子孙";
      } else if (ELEMENT_OVERCOMES[shiElement] === element) {
        relative = "妻财";
      } else if (ELEMENT_OVERCOMES[element] === shiElement) {
        relative = "官鬼";
      }
      return {
        zhi: branch.zhi,
        element: element,
        relative: relative
      };
    });
  }

  /* 六神：日干起，阳日顺行、阴日逆行 */
  function spiritsFor(ganIndex) {
    const startIndex = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5][ganIndex];
    const forward = ganIndex % 2 === 0;
    const result = [];
    for (let offset = 0; offset < 6; offset += 1) {
      const position = forward
        ? (startIndex + offset) % 6
        : (startIndex - offset + 6) % 6;
      result.push(SIX_SPIRITS[position]);
    }
    return result;
  }

  /* 公历 → 儒略日 → 日干支 */
  function julianDay(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) -
      Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  function dayGanZhi(date) {
    const jdn = julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const ganIndex = (jdn + 9) % 10;
    const zhiIndex = (jdn + 1) % 12;
    return {
      ganIndex: ganIndex,
      zhiIndex: zhiIndex,
      gan: GAN[ganIndex],
      zhi: ZHI[zhiIndex],
      ganzhi: GAN[ganIndex] + ZHI[zhiIndex]
    };
  }

  function parseDate(value) {
    if (!value) {
      return new Date();
    }
    const parts = String(value).split("-").map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) {
      return new Date();
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  window.LIUYAO_CHART = {
    GAN: GAN,
    ZHI: ZHI,
    ZHI_ELEMENT: ZHI_ELEMENT,
    SIX_SPIRITS: SIX_SPIRITS,
    buildPalaceTable: buildPalaceTable,
    branchesFor: branchesFor,
    relativesFor: relativesFor,
    spiritsFor: spiritsFor,
    dayGanZhi: dayGanZhi,
    parseDate: parseDate,
    formatDate: formatDate,
    linesKey: linesKey
  };
})();
