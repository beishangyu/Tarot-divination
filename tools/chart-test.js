/* 校验：八宫卦序、纳甲、六神、干支换算是否与传统规则一致。 */
global.window = {};
require("D:\\Code\\Tarot-divination\\liuyao-data.js");
require("D:\\Code\\Tarot-divination\\liuyao-chart.js");

const chart = window.LIUYAO_CHART;
const data = window.LIUYAO_DATA;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed += 1;
  console.log((ok ? "  ok    " : "  FAIL  ") + name + (detail ? "  → " + detail : ""));
}

/* 1. 京房八宫卦序（传统标准表） */
const CANONICAL = {
  "乾宫": ["乾为天", "天风姤", "天山遁", "天地否", "风地观", "山地剥", "火地晋", "火天大有"],
  "坎宫": ["坎为水", "水泽节", "水雷屯", "水火既济", "泽火革", "雷火丰", "地火明夷", "地水师"],
  "艮宫": ["艮为山", "山火贲", "山天大畜", "山泽损", "火泽睽", "天泽履", "风泽中孚", "风山渐"],
  "震宫": ["震为雷", "雷地豫", "雷水解", "雷风恒", "地风升", "水风井", "泽风大过", "泽雷随"],
  "巽宫": ["巽为风", "风天小畜", "风火家人", "风雷益", "天雷无妄", "火雷噬嗑", "山雷颐", "山风蛊"],
  "离宫": ["离为火", "火山旅", "火风鼎", "火水未济", "山水蒙", "风水涣", "天水讼", "天火同人"],
  "坤宫": ["坤为地", "地雷复", "地泽临", "地天泰", "雷天大壮", "泽天夬", "水天需", "水地比"],
  "兑宫": ["兑为泽", "泽水困", "泽地萃", "泽山咸", "水山蹇", "地山谦", "雷山小过", "雷泽归妹"]
};

const table = chart.buildPalaceTable(data.trigrams);
const POSITION_ORDER = ["本宫", "一世", "二世", "三世", "四世", "五世", "游魂", "归魂"];
const byPalace = {};
Object.keys(table).forEach((key) => {
  const info = table[key];
  byPalace[info.palace] = byPalace[info.palace] || [];
  const lower = Object.values(data.trigrams).find((t) => t.lines.join("") === key.slice(0, 3));
  const upper = Object.values(data.trigrams).find((t) => t.lines.join("") === key.slice(3, 6));
  const hex = data.hexagrams[upper.id + ":" + lower.id];
  byPalace[info.palace].push({
    name: hex.name,
    position: info.position,
    shi: info.shiIndex + 1,
    ying: info.yingIndex + 1
  });
});
Object.keys(byPalace).forEach((palace) => {
  byPalace[palace].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));
});

Object.keys(CANONICAL).forEach((palace) => {
  const actual = (byPalace[palace] || []).map((item) => item.name);
  const expected = CANONICAL[palace];
  check(palace + " 卦序一致",
    JSON.stringify(actual) === JSON.stringify(expected),
    JSON.stringify(actual));
});

check("八宫共 64 卦", Object.keys(table).length === 64, Object.keys(table).length + " 卦");

/* 2. 世应位置（抽查乾宫八卦） */
const qianPalace = byPalace["乾宫"];
const expectedShi = [6, 1, 2, 3, 4, 5, 4, 3];
check("乾宫世爻位置正确",
  JSON.stringify(qianPalace.map((i) => i.shi)) === JSON.stringify(expectedShi),
  JSON.stringify(qianPalace.map((i) => i.shi)));
const expectedYing = [3, 4, 5, 6, 1, 2, 1, 6];
check("乾宫应爻位置正确",
  JSON.stringify(qianPalace.map((i) => i.ying)) === JSON.stringify(expectedYing),
  JSON.stringify(qianPalace.map((i) => i.ying)));

/* 3. 纳甲（抽查：乾为天 应为 甲子寅辰午申戌） */
const branches = chart.branchesFor("qian", "qian").map((b) => b.zhi).join("");
check("乾卦纳甲 甲子寅辰午申戌", branches === "子寅辰午申戌", branches);
const kunBranches = chart.branchesFor("kun", "kun").map((b) => b.zhi).join("");
check("坤卦纳甲 未巳卯亥酉未", kunBranches === "未巳卯亥酉未", kunBranches);
const genBranches = chart.branchesFor("gen", "gen").map((b) => b.zhi).join("");
check("艮卦纳甲 辰午申戌子寅", genBranches === "辰午申戌子寅", genBranches);

/* 4. 六亲（世爻属木时：父母水、兄弟木、子孙火、妻财土、官鬼金） */
const relatives = chart.relativesFor(
  [{ zhi: "子", element: "水" }, { zhi: "寅", element: "木" }, { zhi: "午", element: "火" },
   { zhi: "申", element: "金" }, { zhi: "辰", element: "土" }, { zhi: "戌", element: "土" }],
  "木");
check("六亲推算（以木为主）",
  JSON.stringify(relatives.map((r) => r.relative)) === JSON.stringify(["父母", "兄弟", "子孙", "官鬼", "妻财", "妻财"]),
  JSON.stringify(relatives.map((r) => r.relative)));

/* 5. 六神（甲日顺行、乙日逆行） */
check("甲日六神顺行",
  JSON.stringify(chart.spiritsFor(0)) === JSON.stringify(["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"]),
  chart.spiritsFor(0).join(" "));
check("乙日六神逆行",
  JSON.stringify(chart.spiritsFor(1)) === JSON.stringify(["青龙", "玄武", "白虎", "螣蛇", "勾陈", "朱雀"]),
  chart.spiritsFor(1).join(" "));
check("壬日玄武起",
  chart.spiritsFor(8)[0] === "玄武", chart.spiritsFor(8).join(" "));

/* 6. 干支换算 */
const cases = [
  ["2000-01-01", "戊午"],
  ["2024-02-10", "甲辰"],
  ["2026-11-14", null]
];
cases.forEach(([date, expected]) => {
  const gz = chart.dayGanZhi(chart.parseDate(date));
  const ok = expected ? gz.ganzhi === expected : true;
  check("日干支 " + date + " = " + gz.ganzhi, ok, expected ? "期望 " + expected : "（无参照）");
});

console.log(failed === 0 ? "\n全部校验通过" : "\n失败 " + failed + " 项");
process.exit(failed ? 1 : 0);
