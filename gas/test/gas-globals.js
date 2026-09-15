/**
 * テスト用のスタブ。
 * 統合スクリプト（Code.gs / v232）から、Report.gs が実際に呼んでいる
 * ものだけを抜き出した写しです。本番では統合スクリプト側が使われます。
 */

const START_ROW = 4, LAST_COL = 11;
const C_SENDER = 1, C_DATE = 2, C_START = 3, C_WAIT = 4,
      C_TIME = 5, C_MONEY = 6, C_PLACE = 7, C_METHOD = 8,
      C_OTHER = 9, C_LINK = 10, C_MARK = 11;
const PERSONAL_TABS = ["ﾀﾞｲｽｹ", "ｼｭﾝ", "ｶｲﾄ", "ｱﾅﾙ", "ﾏｰｸ", "ｼﾞﾝ"];
const AREA_TABS = ["北7", "北4", "北他", "ﾐﾅﾐ", "ほか"];
const FLAG_TABS = ["関空", "ﾊﾞﾗｼ"];
const ALL_TABS = PERSONAL_TABS.concat(AREA_TABS, FLAG_TABS);

const REPORT_MERGE_RULES = [
  { from: /^江坂$/,              to: "江坂駅前タクシー乗り場" },
  { from: /^天満モスバーガー前$/, to: "天満" },
  { from: /^ドン2.+$/,           to: "ドン2" }
];

const KANA_H2F = {
  "ｶﾞ":"ガ","ｷﾞ":"ギ","ｸﾞ":"グ","ｹﾞ":"ゲ","ｺﾞ":"ゴ","ｻﾞ":"ザ","ｼﾞ":"ジ","ｽﾞ":"ズ","ｾﾞ":"ゼ","ｿﾞ":"ゾ",
  "ﾀﾞ":"ダ","ﾁﾞ":"ヂ","ﾂﾞ":"ヅ","ﾃﾞ":"デ","ﾄﾞ":"ド","ﾊﾞ":"バ","ﾋﾞ":"ビ","ﾌﾞ":"ブ","ﾍﾞ":"ベ","ﾎﾞ":"ボ",
  "ﾊﾟ":"パ","ﾋﾟ":"ピ","ﾌﾟ":"プ","ﾍﾟ":"ペ","ﾎﾟ":"ポ","ｳﾞ":"ヴ",
  "ｱ":"ア","ｲ":"イ","ｳ":"ウ","ｴ":"エ","ｵ":"オ","ｶ":"カ","ｷ":"キ","ｸ":"ク","ｹ":"ケ","ｺ":"コ",
  "ｻ":"サ","ｼ":"シ","ｽ":"ス","ｾ":"セ","ｿ":"ソ","ﾀ":"タ","ﾁ":"チ","ﾂ":"ツ","ﾃ":"テ","ﾄ":"ト",
  "ﾅ":"ナ","ﾆ":"ニ","ﾇ":"ヌ","ﾈ":"ネ","ﾉ":"ノ","ﾊ":"ハ","ﾋ":"ヒ","ﾌ":"フ","ﾍ":"ヘ","ﾎ":"ホ",
  "ﾏ":"マ","ﾐ":"ミ","ﾑ":"ム","ﾒ":"メ","ﾓ":"モ","ﾔ":"ヤ","ﾕ":"ユ","ﾖ":"ヨ",
  "ﾗ":"ラ","ﾘ":"リ","ﾙ":"ル","ﾚ":"レ","ﾛ":"ロ","ﾜ":"ワ","ｦ":"ヲ","ﾝ":"ン",
  "ｧ":"ァ","ｨ":"ィ","ｩ":"ゥ","ｪ":"ェ","ｫ":"ォ","ｯ":"ッ","ｬ":"ャ","ｭ":"ュ","ｮ":"ョ","ｰ":"ー"
};

function toFullKana_(str) {
  let s = String(str);
  Object.keys(KANA_H2F).sort(function (a, b) { return b.length - a.length; })
    .forEach(function (k) { s = s.split(k).join(KANA_H2F[k]); });
  return s;
}

function normalizePlace_(str) {
  let s = toFullKana_(String(str).replace(/\n/g, ""));
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
  });
  s = s.toUpperCase();
  s = s.replace(/[\s　・･、。．\.,\-–—_（）\(\)「」『』【】]/g, "");
  s = s.replace(/(タクシー)?(乗り場|乗場|ノリバ|のりば)$/, "");
  s = s.replace(/(ドンキホーテ|ドンキ)/g, "ドン");
  return s;
}

const HOLIDAYS = [
  "1/1","1/2","1/3","1/12","2/11","2/23","3/20","3/21","4/29","5/3","5/4","5/5","5/6",
  "7/19","7/20","8/11","8/13","8/14","8/15","8/16","9/20","9/21","9/22","9/23",
  "10/11","10/12","11/3","11/23","12/31"
];
function isHoliday_(d) {
  return HOLIDAYS.indexOf((d.getMonth() + 1) + "/" + d.getDate()) !== -1;
}

function pad2_(n) { return ("0" + n).slice(-2); }
function fmtDate_(d) { return (d.getMonth() + 1) + "/" + d.getDate(); }
const ymdOf_ = function (d) {
  return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate());
};
function progSet_() {}
function progClear_() {}
