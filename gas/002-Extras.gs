/**
 * ================================================================
 *  追加機能 まとめ（Extras.gs）
 *
 *  ★★★  E005ver  （2026/09/06）  ★★★
 *
 *  ファイル記号: C=001-Code.gs / L=003-LineReport.gs / E=002-Extras.gs
 *  直したら数字を1つ増やし、下の履歴に何を直したか書く。
 *  いま動いているバージョンは メニュー「ℹ️ バージョンを確認」で見られる。
 *
 *  [E005ver] 乗り場 → Googleマップ（MapLink）を、このファイルに同梱した
 *   ・G列の乗り場をタップすると Googleマップ が開く
 *   ・001-Code.gs の整形が終わるたびに、自動で貼り直す
 *   ・行き先が違うものは メニュー「🗺 マップの行き先を確認する」で一覧できる
 *  [E004ver] ファイル名を 002-Extras.gs にした（中身の動きは変えていない）
 *  [E003ver] 金額の区分（ショート・ロングの境目）を「設定」タブから変えられるようにした
 *  [E002ver] ファイル記号を K → C に変更（Code.gs に合わせた）
 *
 *  [E001ver] 3つの追加機能をまとめた最初の版
 *   ・🎯 立ち回り分析（曜日区分×時間帯×乗り場、待ち時間あたりの効率）
 *   ・🏷 オプチャ印（検索してチェックで指定。印は設定に保存され整形で消えない）
 *   ・📐 グラフの大きさをZ列に合わせる
 *   ・金額区分は ショート≦￥4,999 / ミドル〜￥9,999 / ロング≧￥10,000
 *
 *  ★このファイル1つで、下の3つが入ります。
 *    ・Strategy … 🎯 立ち回り分析
 *    ・Opucha   … 🏷 オプチャ印を検索して付ける／外す
 *    ・ChartFit … 📐 まとめスプシのグラフをZ列の幅に揃える
 *    ・MapLink  … 🗺 G列の乗り場をタップで Googleマップ
 *
 *  ★記録用スプシの Apps Script に「新しいファイル」として追加してください。
 *    コード.gs は触りません。LineReport.gs とも名前は衝突しません。
 *
 *  ★メニューは LineReport.gs の onOpenReport が自動で拾って並べます。
 * ================================================================
 */

/** このファイルのバージョン */
const EX_VERSION = "E005ver";


/* ##############################################################
   立ち回り分析（元 Strategy.gs）
   ############################################################## */

/**
 * ================================================================
 *  立ち回り分析（Strategy.gs）
 *
 *  ★記録用スプシの Apps Script プロジェクトに別ファイルとして追加。
 *    統合スクリプト（v223/v232）の定数・関数を使う。
 *
 *  「何曜日の、何時に、どの乗り場に着ければ良いか」を記録から出す。
 *
 *  【金額の区分】
 *    ショート … ￥4,999以下
 *    ミドル   … ￥5,000〜￥9,999
 *    ロング   … ￥10,000以上
 *
 *  【自社 / オプチャ の見分け方】
 *    Opucha.gs の印（メニュー「🏷 オプチャ印を付ける／外す」で指定したもの）で判定する。
 *    タブや列からは機械的に判定できないため。
 *      ・LINE連携前の記録は A列が空のまま個人タブに入っている（自社実績）
 *      ・過去にLINEのメッセージで送ったオプチャ情報も個人タブに入っている
 *      ・関空タブにも自社の乗車が混ざっている
 *    Opucha.gs が無い場合は、全件を自社として扱う。
 * ================================================================
 */

// 金額の区分。「設定」タブ（Code.gs）で変えられる。読めないときはこの値
const ST_SHORT_MAX = 4999;    // これ以下がショート
const ST_LONG_MIN  = 10000;   // これ以上がロング

/** ショートの上限。「設定」タブがあればそちらを使う */
function stShortMax_() {
  return (typeof cfgShortMax_ === "function") ? cfgShortMax_() : ST_SHORT_MAX;
}
/** ロングの下限。「設定」タブがあればそちらを使う */
function stLongMin_() {
  return (typeof cfgLongMin_ === "function") ? cfgLongMin_() : ST_LONG_MIN;
}
const ST_HOURS = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29];  // 20時〜翌5時
const ST_MIN_N = 3;           // 立ち回り候補として出す最低件数
const ST_SHRINK_K = 4;        // 件数が少ない枠を全体平均へ寄せる強さ

/* ============ 区分 ============ */

function stBand_(money) {
  if (money >= stLongMin_())  return "ロング";
  if (money > stShortMax_())  return "ミドル";
  return "ショート";
}

/** 営業時間の並び。20〜29（29 = 翌5時台） */
function stSlot_(hh) { return hh < 17 ? hh + 24 : hh; }
function stHourLabel_(slot) { return (slot < 24 ? slot : slot - 24) + "時"; }

/** 平日 / 金曜 / 土曜 / 日祝 */
function stDayType_(date) {
  const w = date.getDay();
  if (w === 0 || isHoliday_(date)) return "日祝";
  if (w === 6) return "土曜";
  if (w === 5) return "金曜";
  return "平日";
}
const ST_DAY_TYPES = ["平日", "金曜", "土曜", "日祝"];
const ST_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 件数が少ない枠の平均を、全体平均へ寄せる。
 * 1件だけの￥25,000がいきなり1位に来ると、立ち回りの判断を誤るため。
 * 件数が増えるほど実際の平均に近づく。
 */
function stShrink_(sum, n, globalAvg) {
  return (sum + ST_SHRINK_K * globalAvg) / (n + ST_SHRINK_K);
}

/* ============ 集計 ============ */

/** 期間内の乗車を集める。startD/endD 省略で全期間 */
function stCollect_(startD, endD) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rows = [];
  const seen = {};
  // Opucha.gs の印を使う。無ければ全件を自社として扱う
  const hasMark = (typeof opuIsOpucha_ === "function");
  const marks = hasMark ? opuMarks_() : {};

  const read = function (name, isPersonal) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;

    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
      const date = r[C_DATE - 1];
      if (!(date instanceof Date)) return;
      if (startD && date < startD) return;
      if (endD && date > endD) return;

      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money) || money <= 0) return;

      const tm = String(r[C_TIME - 1]).match(/(\d{1,2}):(\d{2})/);
      if (!tm) return;                                   // 時刻不明は時間帯に置けない
      const hh = parseInt(tm[1], 10);

      const place = String(r[C_PLACE - 1]).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      const rideKey = ymdOf_(date) + "|" + tm[0] + "|" + money;
      const dupKey = rideKey + "|" + normalizePlace_(place);
      if (seen[dupKey]) return;
      seen[dupKey] = true;

      const w = String(r[C_WAIT - 1]).replace(/[^0-9]/g, "");
      const who = String(r[C_SENDER - 1]).trim();
      rows.push({
        date: date, hh: hh, time: tm[0], money: money, place: place,
        wait: w === "" ? null : parseInt(w, 10),
        tab: name, rideKey: rideKey, who: who,
        isOpu: hasMark ? opuIsOpucha_(who, rideKey, marks) : false,
        slot: stSlot_(hh), band: stBand_(money),
        dayType: stDayType_(date), dow: ST_WEEKDAYS[date.getDay()]
      });
    });
  };

  PERSONAL_TABS.forEach(function (n) { read(n, true); });
  ALL_TABS.forEach(function (n) { if (PERSONAL_TABS.indexOf(n) === -1) read(n, false); });

  const own = [], opu = [];
  rows.forEach(function (x) { (x.isOpu ? opu : own).push(x); });

  return { all: rows, own: own, opu: opu, hasMark: hasMark };
}

function stSum_(list) { return list.reduce(function (a, x) { return a + x.money; }, 0); }
function stAvg_(list) { return list.length ? Math.round(stSum_(list) / list.length) : 0; }
function stCount_(list, band) {
  return list.filter(function (x) { return x.band === band; }).length;
}

/* ============ 立ち回り候補（曜日区分 × 時間帯 × 乗り場） ============ */

function stTachimawari_(own) {
  if (!own.length) return [];
  const globalAvg = stSum_(own) / own.length;

  const g = {};
  own.forEach(function (x) {
    const k = x.dayType + "|" + x.slot + "|" + (normalizePlace_(x.place) || "?");
    if (!g[k]) g[k] = { dayType: x.dayType, slot: x.slot, names: {}, list: [] };
    g[k].names[x.place] = (g[k].names[x.place] || 0) + 1;
    g[k].list.push(x);
  });

  const out = [];
  Object.keys(g).forEach(function (k) {
    const v = g[k];
    if (v.list.length < ST_MIN_N) return;
    const names = Object.keys(v.names).sort(function (a, b) { return v.names[b] - v.names[a]; });
    const waits = v.list.filter(function (x) { return x.wait !== null; });
    out.push({
      dayType: v.dayType, slot: v.slot, place: names[0],
      n: v.list.length,
      avg: stAvg_(v.list),
      score: Math.round(stShrink_(stSum_(v.list), v.list.length, globalAvg)),
      long: stCount_(v.list, "ロング"),
      mid: stCount_(v.list, "ミドル"),
      short: stCount_(v.list, "ショート"),
      wait: waits.length ? Math.round(waits.reduce(function (a, x) { return a + x.wait; }, 0) / waits.length) : null,
      waitN: waits.length
    });
  });
  return out.sort(function (a, b) { return b.score - a.score || b.n - a.n; });
}

/* ============ 待ち時間あたりの効率（乗り場別） ============ */

/**
 * 「平均売上が高い乗り場 ＝ 良い乗り場」とは限らない。
 * 待ち時間が長ければ、1晩に取れる本数が減る。
 * 待ち1時間あたりいくらになるかで並べ直す。
 * 待ち時間が記録されている行だけが対象。
 */
function stEfficiency_(own, minN) {
  const g = {};
  own.forEach(function (x) {
    if (x.wait === null) return;
    const k = normalizePlace_(x.place) || "?";
    if (!g[k]) g[k] = { names: {}, list: [] };
    g[k].names[x.place] = (g[k].names[x.place] || 0) + 1;
    g[k].list.push(x);
  });

  const out = [];
  Object.keys(g).forEach(function (k) {
    const v = g[k];
    if (v.list.length < (minN || 5)) return;
    const names = Object.keys(v.names).sort(function (a, b) { return v.names[b] - v.names[a]; });
    const totalWait = v.list.reduce(function (a, x) { return a + x.wait; }, 0);
    out.push({
      place: names[0], n: v.list.length,
      avg: stAvg_(v.list),
      wait: Math.round(totalWait / v.list.length),
      // 待ち0分ばかりだと割り算が壊れるので、最低1分として扱う
      perHour: Math.round(stSum_(v.list) / Math.max(totalWait, v.list.length) * 60),
      long: stCount_(v.list, "ロング")
    });
  });
  return out.sort(function (a, b) { return b.perHour - a.perHour; });
}

/* ============ 曜日ごと（木曜など特定曜日の癖を見る） ============ */

function stByWeekday_(own) {
  const g = {};
  ST_WEEKDAYS.forEach(function (d) { g[d] = []; });
  own.forEach(function (x) { g[x.dow].push(x); });

  return ST_WEEKDAYS.map(function (d) {
    const v = g[d];
    const waits = v.filter(function (x) { return x.wait !== null; });
    return {
      dow: d, n: v.length, avg: stAvg_(v),
      long: stCount_(v, "ロング"),
      longRate: v.length ? stCount_(v, "ロング") / v.length : 0,
      wait: waits.length ? Math.round(waits.reduce(function (a, x) { return a + x.wait; }, 0) / waits.length) : null
    };
  }).filter(function (r) { return r.n > 0; });
}

/** ある曜日を時間帯で割る（木曜の医師関係のような動きを探す） */
function stWeekdayHours_(own, dow) {
  const v = own.filter(function (x) { return x.dow === dow; });
  return ST_HOURS.map(function (h) {
    const s = v.filter(function (x) { return x.slot === h; });
    const names = {};
    s.forEach(function (x) { names[x.place] = (names[x.place] || 0) + 1; });
    const top = Object.keys(names).sort(function (a, b) { return names[b] - names[a]; });
    return { slot: h, n: s.length, avg: stAvg_(s), long: stCount_(s, "ロング"),
             top: top.slice(0, 2).map(function (p) { return p + "×" + names[p]; }).join(" / ") };
  }).filter(function (r) { return r.n > 0; });
}

/* ============ ロングマップ（オプチャ込み） ============ */

function stLongMap_(all) {
  const g = {};
  all.forEach(function (x) {
    const k = normalizePlace_(x.place) || "?";
    if (!g[k]) g[k] = { names: {}, own: [], opu: [] };
    g[k].names[x.place] = (g[k].names[x.place] || 0) + 1;
    (x.isOpu ? g[k].opu : g[k].own).push(x);
  });

  return Object.keys(g).map(function (k) {
    const v = g[k];
    const names = Object.keys(v.names).sort(function (a, b) { return v.names[b] - v.names[a]; });
    const list = v.own.concat(v.opu);
    return {
      place: names[0], n: list.length,
      ownLong: stCount_(v.own, "ロング"),
      opuLong: stCount_(v.opu, "ロング"),
      long: stCount_(list, "ロング"),
      max: list.length ? Math.max.apply(null, list.map(function (x) { return x.money; })) : 0,
      avg: stAvg_(list)
    };
  }).filter(function (r) { return r.long > 0; })
    .sort(function (a, b) { return b.long - a.long || b.max - a.max; });
}

/* ============ 入口 ============ */

function buildStrategy(startD, endD) {
  const c = stCollect_(startD, endD);
  return {
    all: c.all, own: c.own, opu: c.opu, hasMark: c.hasMark,
    tachimawari: stTachimawari_(c.own),
    efficiency: stEfficiency_(c.own, 5),
    byWeekday: stByWeekday_(c.own),
    longMap: stLongMap_(c.all)
  };
}

/* ============ メニュー ============ */

function menuStrategy() {
  const html = '<!DOCTYPE html><html><head><base target="_top"><style>' +
    'body{font-family:sans-serif;padding:15px;color:#333;font-size:13px}' +
    'h3{font-size:15px;margin:0 0 8px;border-bottom:2px solid #b45f06;padding-bottom:6px}' +
    '.d{font-size:12px;color:#666;margin-bottom:10px;line-height:1.7}' +
    'select,input[type=date]{width:100%;font-size:14px;padding:8px;margin-bottom:10px;' +
    'box-sizing:border-box;border:1px solid #ccc;border-radius:4px}' +
    '.rg{display:flex;gap:14px;margin-bottom:10px}' +
    '.cu{display:none;gap:8px;align-items:center}.cu input{width:46%}' +
    'button{width:100%;padding:12px;margin-top:8px;background:#b45f06;color:#fff;border:none;' +
    'border-radius:5px;font-weight:bold;font-size:15px;cursor:pointer}' +
    '#r{width:100%;height:300px;font-size:11px;font-family:monospace;margin-top:10px;box-sizing:border-box}' +
    '</style></head><body>' +
    '<h3>🎯 立ち回り分析</h3>' +
    '<div class="d">何曜日の何時に、どの乗り場が良いかを記録から出します。<br>' +
    '<b>スプシもLINEも変更しません。</b></div>' +
    '<div class="rg">' +
    '<label><input type="radio" name="m" value="s" checked onchange="tg()"> 📅 期間選択</label>' +
    '<label><input type="radio" name="m" value="c" onchange="tg()"> ✍️ 日付指定</label></div>' +
    '<div id="sa"><select id="ps"></select></div>' +
    '<div id="ca" class="cu"><input type="date" id="sd"><span>～</span><input type="date" id="ed"></div>' +
    '<button id="b" onclick="go()">立ち回りを見る</button>' +
    progressWidget_() +
    '<textarea id="r" readonly></textarea>' +
    '<button onclick="cp()" style="background:#666">📋 結果をコピー</button>' +
    '<script>' +
    'function tg(){var m=document.querySelector(\'input[name="m"]:checked\').value;' +
    'document.getElementById("sa").style.display=m==="s"?"block":"none";' +
    'document.getElementById("ca").style.display=m==="c"?"flex":"none";}' +
    '(function(){var s=document.getElementById("ps"),t=new Date();' +
    's.add(new Option("全期間（おすすめ）","all"));' +
    'var cY=t.getFullYear(),cM=t.getMonth()+1,cD=t.getDate();' +
    'var sY=cY,sM=cM; if(cD<=15){sM--; if(sM===0){sM=12;sY--;}}' +
    's.add(new Option(sY+"/"+("0"+sM).slice(-2)+"/16 ～ "+("0"+cM).slice(-2)+"/"+("0"+cD).slice(-2)+" (今期)",' +
    'sY+"/"+sM+"/16-"+cY+"/"+cM+"/"+cD));' +
    'for(var i=0;i<12;i++){var eY=sY,eM=sM,hM=eM-1,hY=eY; if(hM===0){hM=12;hY--;}' +
    's.add(new Option(hY+"/"+("0"+hM).slice(-2)+"/16 ～ "+("0"+eM).slice(-2)+"/15",' +
    'hY+"/"+hM+"/16-"+eY+"/"+eM+"/15")); sY=hY;sM=hM;}})();' +
    'function go(){var m=document.querySelector(\'input[name="m"]:checked\').value;' +
    'var v=m==="s"?document.getElementById("ps").value:' +
    '(document.getElementById("sd").value.replace(/-/g,"/")+"-"+document.getElementById("ed").value.replace(/-/g,"/"));' +
    'document.getElementById("b").disabled=true;progShow();' +
    'google.script.run.withSuccessHandler(function(t){document.getElementById("r").value=t;' +
    'progDone("完了しました");document.getElementById("b").disabled=false;})' +
    '.withFailureHandler(function(e){progFail(e.message);document.getElementById("b").disabled=false;})' +
    '.runStrategy(v);}' +
    'function cp(){var t=document.getElementById("r");t.select();' +
    'try{document.execCommand("copy");alert("コピーしました");}catch(e){alert("長押しで選択してコピー");}}' +
    '</scr' + 'ipt></body></html>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(580).setHeight(700), "🎯 立ち回り分析");
}

function stPad_(s, n) {
  s = String(s);
  let w = 0;
  for (let i = 0; i < s.length; i++) w += /[\x00-\x7F｡-ﾟ]/.test(s.charAt(i)) ? 1 : 2;
  return s + Array(Math.max(1, n - w + 1)).join(" ");
}
function stYen_(n) { return "¥" + Number(n).toLocaleString(); }

function runStrategy(val) {
  progClear_();
  progSet_(10, "記録を読み込んでいます");

  let startD = null, endD = null, label = "全期間";
  if (val && val !== "all") {
    const p = String(val).split("-");
    const s = p[0].split("/"), e = p[1].split("/");
    startD = new Date(+s[0], +s[1] - 1, +s[2], 0, 0, 0);
    endD   = new Date(+e[0], +e[1] - 1, +e[2], 23, 59, 59);
    label = fmtDate_(startD) + " 〜 " + fmtDate_(endD);
  }

  const S = buildStrategy(startD, endD);
  progSet_(60, "集計しています");
  if (!S.own.length) return "この期間に集計できる乗車がありませんでした。";

  const own = S.own;
  let out = "■ 期間: " + label + "\n";
  out += "■ 自社 " + own.length + "件 ／ オプチャ " + S.opu.length + "件\n";
  out += "■ ショート≦" + stYen_(ST_SHORT_MAX) + " ／ ミドル〜" + stYen_(ST_LONG_MIN - 1) +
         " ／ ロング≧" + stYen_(ST_LONG_MIN) + "\n";
  out += "  全体 平均" + stYen_(stAvg_(own)) +
         "  ショート" + stCount_(own, "ショート") +
         " ミドル" + stCount_(own, "ミドル") +
         " ロング" + stCount_(own, "ロング") +
         "（ロング率 " + (stCount_(own, "ロング") / own.length * 100).toFixed(1) + "%）\n";

  // ---- 1. 立ち回り候補 ----
  out += "\n══════════════════════\n";
  out += "【1】立ち回り候補（曜日区分 × 時間帯 × 乗り場）\n";
  out += ST_MIN_N + "件以上ある枠だけ。補正後の高い順\n\n";
  out += stPad_("曜日", 6) + stPad_("時", 6) + stPad_("乗り場", 16) +
         stPad_("件数", 6) + stPad_("実平均", 10) + stPad_("補正後", 10) + "ロング\n";
  S.tachimawari.slice(0, 20).forEach(function (r) {
    out += stPad_(r.dayType, 6) + stPad_(stHourLabel_(r.slot), 6) +
           stPad_(r.place.length > 7 ? r.place.slice(0, 7) + "…" : r.place, 16) +
           stPad_(r.n + "件", 6) + stPad_(stYen_(r.avg), 10) + stPad_(stYen_(r.score), 10) +
           r.long + "件" + (r.wait !== null ? "  待ち" + r.wait + "分" : "") + "\n";
  });
  out += "\n  ※補正後 = 件数が少ない枠を全体平均へ寄せた値。\n";
  out += "    1件だけの高額が上位に来ないようにするため。件数も必ず見てください。\n";

  // ---- 2. 待ち時間あたりの効率 ----
  out += "\n══════════════════════\n";
  out += "【2】待ち時間あたりの効率（乗り場別・5件以上）\n";
  out += "平均売上が高くても、待ちが長ければ1晩の本数が減ります\n\n";
  out += stPad_("乗り場", 16) + stPad_("件数", 6) + stPad_("平均売上", 10) +
         stPad_("平均待ち", 9) + "待ち1時間あたり\n";
  S.efficiency.slice(0, 12).forEach(function (r) {
    out += stPad_(r.place.length > 7 ? r.place.slice(0, 7) + "…" : r.place, 16) +
           stPad_(r.n + "件", 6) + stPad_(stYen_(r.avg), 10) +
           stPad_(r.wait + "分", 9) + stYen_(r.perHour) + "\n";
  });
  out += "\n  ※待ち時間が記録されている行だけが対象です。\n";

  // ---- 3. 曜日ごと ----
  out += "\n══════════════════════\n";
  out += "【3】曜日ごと（特定曜日の癖を見る）\n\n";
  out += stPad_("曜", 4) + stPad_("件数", 7) + stPad_("平均", 10) +
         stPad_("ロング", 8) + stPad_("ロング率", 10) + "平均待ち\n";
  S.byWeekday.forEach(function (r) {
    out += stPad_(r.dow, 4) + stPad_(r.n + "件", 7) + stPad_(stYen_(r.avg), 10) +
           stPad_(r.long + "件", 8) + stPad_((r.longRate * 100).toFixed(1) + "%", 10) +
           (r.wait !== null ? r.wait + "分" : "-") + "\n";
  });

  // 一番ロング率の高い曜日を時間帯で割ってみせる
  let best = null;
  S.byWeekday.forEach(function (r) {
    if (r.n >= 20 && (!best || r.longRate > best.longRate)) best = r;
  });
  if (best) {
    out += "\n  ── " + best.dow + "曜（ロング率" + (best.longRate * 100).toFixed(1) +
           "%）を時間帯で割ると ──\n";
    stWeekdayHours_(own, best.dow).forEach(function (h) {
      out += "   " + stPad_(stHourLabel_(h.slot), 6) + stPad_(h.n + "件", 6) +
             stPad_(stYen_(h.avg), 10) + stPad_("ロング" + h.long, 9) + h.top + "\n";
    });
  }

  // ---- 4. ロングマップ ----
  out += "\n══════════════════════\n";
  out += "【4】ロングマップ（オプチャ込み）\n\n";
  out += stPad_("乗り場", 18) + stPad_("ロング", 8) + stPad_("自社", 6) +
         stPad_("ｵﾌﾟﾁｬ", 7) + stPad_("全件", 7) + "最高額\n";
  S.longMap.slice(0, 15).forEach(function (r) {
    out += stPad_(r.place.length > 8 ? r.place.slice(0, 8) + "…" : r.place, 18) +
           stPad_(r.long + "件", 8) + stPad_(r.ownLong, 6) + stPad_(r.opuLong, 7) +
           stPad_(r.n + "件", 7) + stYen_(r.max) + "\n";
  });

  const untapped = S.longMap.filter(function (r) { return r.ownLong === 0 && r.opuLong > 0; });
  if (untapped.length) {
    out += "\n  ── オプチャにしか無いロング（＝まだ自社で取れていない）──\n";
    untapped.forEach(function (r) {
      out += "   " + stPad_(r.place, 22) + "最高" + stYen_(r.max) + "\n";
    });
  }

  out += "\n══════════════════════\n";
  out += "【判定について】\n";
  if (S.hasMark) {
    out += "オプチャ = メニュー「🏷 オプチャ印を付ける／外す」で指定した乗車。\n";
    out += "印が0件のうちは、全件が自社として集計されます。\n";
  } else {
    out += "Opucha.gs が入っていないため、全件を自社として集計しました。\n";
  }

  progSet_(100, "完了");
  return out;
}


/* ##############################################################
   オプチャ印（元 Opucha.gs）
   ############################################################## */

/**
 * ================================================================
 *  オプチャ印の管理（Opucha.gs）
 *
 *  ★記録用スプシの Apps Script プロジェクトに別ファイルとして追加。
 *
 *  【なぜ必要か】
 *    オプチャ情報は、タブや列を見ても機械的に判定できない。
 *      ・LINE連携前の記録は A列が空のまま個人タブに入っている（自社実績）
 *      ・過去にLINEのメッセージで送ったオプチャ情報も個人タブに入っている
 *      ・関空タブにも自社の乗車が混ざっている
 *    つまり「どれがオプチャか」は人が決めるしかない。
 *    そのための、検索してチェックを付ける画面。
 *
 *  【印の持ち方】
 *    本体は スクリプトプロパティ（OPUCHA_MARKS）に置く。
 *      { "2026-05-21|23:48|1300": "元のA列の値", ... }
 *    整形（formatTab_）や連動タブの作り直しで消えないようにするため。
 *    見た目としては A列に「ｵﾌﾟﾁｬ」と表示する。印を外すと元の値に戻る。
 *
 *  【今後の運用】
 *    LINEの画像スクショから読み取ったものは、自動でオプチャ扱いにする予定。
 *    それ以外（過去分・手打ち分）は、この画面から指定する。
 * ================================================================
 */

const OPU_LABEL   = "ｵﾌﾟﾁｬ";       // A列に表示する印
const OPU_PROP    = "OPUCHA_MARKS"; // スクリプトプロパティのキー
const OPU_MAX_HIT = 300;            // 一度に一覧表示する上限

/* ============ 印の保存 ============ */

let _opuCache = null;

function opuMarks_() {
  if (_opuCache) return _opuCache;
  const raw = PropertiesService.getScriptProperties().getProperty(OPU_PROP);
  try { _opuCache = raw ? JSON.parse(raw) : {}; } catch (e) { _opuCache = {}; }
  return _opuCache;
}

function opuSaveMarks_(m) {
  PropertiesService.getScriptProperties().setProperty(OPU_PROP, JSON.stringify(m));
  _opuCache = m;
}

/** 1回の乗車を表すキー。乗り場は表記ゆれで変わるので使わない */
function opuRideKey_(date, time, money) {
  return ymdOf_(date) + "|" + String(time).trim() + "|" + money;
}

/** その行がオプチャかどうか。印リストが本体、A列の表記は補助 */
function opuIsOpucha_(who, rideKey, marks) {
  const m = marks || opuMarks_();
  if (Object.prototype.hasOwnProperty.call(m, rideKey)) return true;
  return toFullKana_(String(who || "")).replace(/[\s　]/g, "").indexOf("オプチャ") !== -1;
}

/* ============ 乗車を集める ============ */

/**
 * 全タブを読んで、乗車1件につき1つにまとめる。
 * 同じ乗車が個人タブとエリアタブの両方にあっても1件として扱う。
 */
function opuCollect_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const marks = opuMarks_();
  const byKey = {};

  ALL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;

    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r, i) {
      const date = r[C_DATE - 1];
      if (!(date instanceof Date)) return;
      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money)) return;
      const tm = String(r[C_TIME - 1]).match(/(\d{1,2}):(\d{2})/);
      const time = tm ? tm[0] : String(r[C_TIME - 1]).trim();
      const key = opuRideKey_(date, time, money);

      if (!byKey[key]) {
        byKey[key] = {
          key: key, date: date, time: time, money: money,
          place: String(r[C_PLACE - 1]).replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
          method: String(r[C_METHOD - 1]).replace(/\n/g, " ").trim(),
          other: String(r[C_OTHER - 1]).replace(/\n/g, " ").trim(),
          who: String(r[C_SENDER - 1]).trim(),
          tabs: [], rows: []
        };
      }
      const b = byKey[key];
      if (b.tabs.indexOf(name) === -1) b.tabs.push(name);
      b.rows.push({ tab: name, row: START_ROW + i });
      // A列に名前が入っている行があれば、そちらを代表にする（写しはA列が空のことがある）
      const w = String(r[C_SENDER - 1]).trim();
      if (!b.who && w) b.who = w;
      if (!b.place) b.place = String(r[C_PLACE - 1]).replace(/\n/g, " ").trim();
    });
  });

  const list = Object.keys(byKey).map(function (k) {
    const b = byKey[k];
    b.isOpucha = opuIsOpucha_(b.who, b.key, marks);
    return b;
  });
  list.sort(function (a, b) {
    return b.date.getTime() - a.date.getTime() || b.money - a.money;
  });
  return list;
}

/* ============ 検索 ============ */

/**
 * 条件で絞る。
 *   word     … 乗り場・そのほか・乗車方法・A列・日付 のどれかに含まれる語（空白区切りでAND）
 *   minMoney / maxMoney … 金額の範囲
 *   from / to … 営業日の範囲（yyyy-mm-dd）
 *   onlyOpucha … 今オプチャになっている行だけ
 *   tab      … 特定のタブに入っている行だけ
 */
function opuFilter_(list, c) {
  const words = String(c.word || "").split(/[\s　]+/).filter(String)
    .map(function (w) { return toFullKana_(w).toUpperCase(); });
  const from = c.from ? new Date(c.from.replace(/-/g, "/") + " 00:00:00") : null;
  const to   = c.to   ? new Date(c.to.replace(/-/g, "/") + " 23:59:59")   : null;
  const min  = c.minMoney ? parseInt(c.minMoney, 10) : null;
  const max  = c.maxMoney ? parseInt(c.maxMoney, 10) : null;

  return list.filter(function (x) {
    if (c.onlyOpucha && !x.isOpucha) return false;
    if (c.tab && x.tabs.indexOf(c.tab) === -1) return false;
    if (from && x.date < from) return false;
    if (to && x.date > to) return false;
    if (min !== null && !isNaN(min) && x.money < min) return false;
    if (max !== null && !isNaN(max) && x.money > max) return false;
    if (words.length) {
      const hay = toFullKana_([
        x.place, x.other, x.method, x.who, x.tabs.join(" "),
        fmtDate_(x.date), x.time
      ].join(" ")).toUpperCase();
      for (let i = 0; i < words.length; i++) {
        if (hay.indexOf(words[i]) === -1) return false;
      }
    }
    return true;
  });
}

/* ============ 印を付ける／外す ============ */

/**
 * 指定した乗車キーの印を更新して、A列の表示も直す。
 * 戻り値 { marked, unmarked, cells }
 */
function opuApply_(setKeys, clearKeys) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const marks = opuMarks_();
  const all = opuCollect_();
  const byKey = {};
  all.forEach(function (x) { byKey[x.key] = x; });

  let marked = 0, unmarked = 0, cells = 0;
  const writes = [];   // {tab, row, value}

  (setKeys || []).forEach(function (k) {
    const x = byKey[k];
    if (!x) return;
    if (!Object.prototype.hasOwnProperty.call(marks, k)) {
      // 元のA列の値を覚えておく（印を外したときに戻すため）
      marks[k] = x.who === OPU_LABEL ? "" : x.who;
      marked++;
    }
    x.rows.forEach(function (p) { writes.push({ tab: p.tab, row: p.row, value: OPU_LABEL }); });
  });

  (clearKeys || []).forEach(function (k) {
    const x = byKey[k];
    if (!x) return;
    const orig = Object.prototype.hasOwnProperty.call(marks, k) ? marks[k] : "";
    if (Object.prototype.hasOwnProperty.call(marks, k)) { delete marks[k]; unmarked++; }
    x.rows.forEach(function (p) { writes.push({ tab: p.tab, row: p.row, value: orig }); });
  });

  // タブごとにまとめて書く
  const byTab = {};
  writes.forEach(function (w) { (byTab[w.tab] = byTab[w.tab] || []).push(w); });
  Object.keys(byTab).forEach(function (tab) {
    const sh = ss.getSheetByName(tab);
    if (!sh) return;
    byTab[tab].forEach(function (w) {
      sh.getRange(w.row, C_SENDER).setValue(w.value);
      cells++;
    });
  });

  opuSaveMarks_(marks);
  return { marked: marked, unmarked: unmarked, cells: cells };
}

/* ============ 画面 ============ */

function menuOpucha() {
  const html = '<!DOCTYPE html><html><head><base target="_top"><style>' +
    'body{font-family:sans-serif;padding:12px;color:#333;font-size:13px;margin:0}' +
    'h3{font-size:15px;margin:0 0 6px;border-bottom:2px solid #b45f06;padding-bottom:6px}' +
    '.d{font-size:11px;color:#666;margin-bottom:10px;line-height:1.6}' +
    'input,select{width:100%;font-size:15px;padding:9px;box-sizing:border-box;' +
    'border:1px solid #ccc;border-radius:5px;margin-bottom:8px}' +
    '.two{display:flex;gap:8px}.two>*{flex:1}' +
    'label.ck{display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:8px}' +
    'button{width:100%;padding:13px;margin-top:6px;border:none;border-radius:5px;' +
    'font-weight:bold;font-size:15px;cursor:pointer;color:#fff}' +
    '#bs{background:#1155ca}#ba{background:#b45f06}' +
    '#list{max-height:300px;overflow:auto;border:1px solid #ddd;border-radius:5px;margin-top:8px}' +
    '.it{display:flex;align-items:flex-start;gap:8px;padding:8px;border-bottom:1px solid #eee}' +
    '.it:last-child{border-bottom:none}' +
    '.it input{width:22px;height:22px;flex:0 0 22px;margin:2px 0 0}' +
    '.tx{flex:1;line-height:1.5;font-size:12px}' +
    '.m{font-weight:bold}.p{color:#111}.s{color:#888;font-size:11px}' +
    '.on{background:#fdf0e3}' +
    '#msg{font-size:12px;margin-top:8px;white-space:pre-wrap;background:#f7f7f7;' +
    'padding:8px;border-radius:5px}' +
    '</style></head><body>' +
    '<h3>🏷 オプチャ印を付ける／外す</h3>' +
    '<div class="d">どれがオプチャ情報かを指定します。<br>' +
    '検索 → チェックを付け外し → 反映、の順です。<br>' +
    '<b>チェックが付いている＝オプチャ</b>。一覧に出ている行だけが反映されます。</div>' +
    '<input id="w" placeholder="検索（乗り場・そのほか・日付など／空白でAND）">' +
    '<div class="two"><input id="mn" type="number" placeholder="金額 下限"><input id="mx" type="number" placeholder="金額 上限"></div>' +
    '<div class="two"><input id="f" type="date"><input id="t" type="date"></div>' +
    '<select id="tb"><option value="">全タブ</option></select>' +
    '<label class="ck"><input type="checkbox" id="oo" style="width:20px;height:20px"> 今オプチャの行だけ表示</label>' +
    '<button id="bs" onclick="search()">検索する</button>' +
    '<div id="list"></div>' +
    '<button id="ba" onclick="apply()" style="display:none">この内容で反映する</button>' +
    '<div id="msg"></div>' +
    '<script>' +
    'var DATA=[];' +
    '(function(){var s=document.getElementById("tb");' +
    '["北7","北4","北他","ﾐﾅﾐ","ほか","関空","ﾊﾞﾗｼ","ﾀﾞｲｽｹ","ｼｭﾝ","ｶｲﾄ","ｱﾅﾙ","ﾏｰｸ"]' +
    '.forEach(function(n){s.add(new Option(n,n));});})();' +
    'function search(){' +
    'var b=document.getElementById("bs");b.disabled=true;b.innerText="検索中…";' +
    'document.getElementById("msg").innerText="";' +
    'google.script.run.withSuccessHandler(render).withFailureHandler(function(e){' +
    'b.disabled=false;b.innerText="検索する";' +
    'document.getElementById("msg").innerText="エラー: "+e.message;})' +
    '.runOpuchaSearch(JSON.stringify({word:document.getElementById("w").value,' +
    'minMoney:document.getElementById("mn").value,maxMoney:document.getElementById("mx").value,' +
    'from:document.getElementById("f").value,to:document.getElementById("t").value,' +
    'tab:document.getElementById("tb").value,onlyOpucha:document.getElementById("oo").checked}));}' +
    'function render(js){' +
    'var b=document.getElementById("bs");b.disabled=false;b.innerText="検索する";' +
    'var o=JSON.parse(js);DATA=o.items;' +
    'var L=document.getElementById("list");L.innerHTML="";' +
    'document.getElementById("ba").style.display=DATA.length?"block":"none";' +
    'if(!DATA.length){L.innerHTML=\'<div class="it"><div class="tx">該当なし</div></div>\';' +
    'document.getElementById("msg").innerText=o.note||"";return;}' +
    'DATA.forEach(function(x,i){' +
    'var d=document.createElement("div");d.className="it"+(x.o?" on":"");' +
    'd.innerHTML=\'<input type="checkbox" id="c\'+i+\'"\'+(x.o?" checked":"")+\'>\'+' +
    '\'<div class="tx"><span class="m">\'+x.d+\' \'+x.tm+\'</span> <span class="m">¥\'+x.y+\'</span>\'+' +
    '\'<br><span class="p">\'+x.p+\'</span>\'+' +
    '\'<br><span class="s">\'+x.s+\'</span></div>\';' +
    'L.appendChild(d);});' +
    'document.getElementById("msg").innerText=o.note||"";}' +
    'function apply(){' +
    'var set=[],clr=[];' +
    'DATA.forEach(function(x,i){var c=document.getElementById("c"+i);' +
    'if(!c)return; if(c.checked&&!x.o)set.push(x.k); if(!c.checked&&x.o)clr.push(x.k);});' +
    'if(!set.length&&!clr.length){document.getElementById("msg").innerText="変更がありません。";return;}' +
    'if(!confirm("オプチャ印を付ける: "+set.length+"件\\n外す: "+clr.length+"件\\nよろしいですか？"))return;' +
    'var b=document.getElementById("ba");b.disabled=true;b.innerText="反映中…";' +
    'google.script.run.withSuccessHandler(function(m){' +
    'b.disabled=false;b.innerText="この内容で反映する";' +
    'document.getElementById("msg").innerText=m;search();})' +
    '.withFailureHandler(function(e){b.disabled=false;b.innerText="この内容で反映する";' +
    'document.getElementById("msg").innerText="エラー: "+e.message;})' +
    '.runOpuchaApply(JSON.stringify({set:set,clear:clr}));}' +
    '</scr' + 'ipt></body></html>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(480).setHeight(720), "🏷 オプチャ印");
}

/** 画面から呼ばれる。検索結果をJSONで返す */
function runOpuchaSearch(criteriaJson) {
  const c = JSON.parse(criteriaJson || "{}");
  const all = opuCollect_();
  const hit = opuFilter_(all, c);
  const shown = hit.slice(0, OPU_MAX_HIT);

  const items = shown.map(function (x) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const sub = [];
    if (x.who) sub.push("A列:" + x.who);
    if (x.method) sub.push(x.method);
    if (x.other) sub.push(x.other);
    sub.push(x.tabs.join("・"));
    return {
      k: x.k = x.key,
      o: x.isOpucha ? 1 : 0,
      d: fmtDate_(x.date) + "(" + days[x.date.getDay()] + ")",
      tm: x.time,
      y: x.money.toLocaleString(),
      p: x.place || "(乗り場なし)",
      s: sub.join(" / ")
    };
  });

  const nOpu = all.filter(function (x) { return x.isOpucha; }).length;
  let note = "全 " + all.length + "件（うち今オプチャ " + nOpu + "件）\n";
  note += "検索ヒット " + hit.length + "件";
  if (hit.length > shown.length) {
    note += " → 上から " + shown.length + "件だけ表示しています。絞り込んでください。";
  }
  return JSON.stringify({ items: items, note: note });
}

/** 画面から呼ばれる。印を反映する */
function runOpuchaApply(selJson) {
  const s = JSON.parse(selJson || "{}");
  const r = opuApply_(s.set || [], s.clear || []);
  const marks = opuMarks_();
  let msg = "✅ 反映しました\n";
  msg += "オプチャにした: " + r.marked + "件\n";
  msg += "オプチャを外した: " + r.unmarked + "件\n";
  msg += "書き換えたセル: " + r.cells + "個（同じ乗車が複数タブにあるため件数より多くなります）\n";
  msg += "現在のオプチャ合計: " + Object.keys(marks).length + "件";
  return msg;
}

/* ============ 他のスクリプトから使う ============ */

/** 乗車キーの集合（Strategy.gs などが参照する） */
function opuKeySet() { return opuMarks_(); }


/* ##############################################################
   グラフの大きさ（元 ChartFit.gs）
   ############################################################## */

/**
 * ================================================================
 *  グラフのサイズ・位置を揃える（ChartFit.gs）
 *
 *  ★記録用スプシの Apps Script プロジェクトに別ファイルとして追加。
 *    （まとめスプシ側にはコードを置かず、こちらから ID 指定で操作する）
 *
 *  ダッシュボードのグラフが
 *    ・A列から始まっていない（中途半端な位置に浮いている）
 *    ・幅がバラバラで、Z列まで使っている表と揃っていない
 *    ・高さが足りず、次のセクションの見出しに重なる
 *  という状態になっているのを、まとめて直す。
 *
 *  グラフの幅は「A列〜Z列の実際の列幅の合計」に合わせる。
 *  列幅を変えても自動で追随する。
 * ================================================================
 */

/** まとめスプシのID（URLの /d/ と /edit の間） */
const CF_SUMMARY_SS_ID = "1A20PNddktpFilQ2VhIPjklODDQr6CPa9QE16YOGnURg";

const CF_LAST_COL   = 26;    // Z列まで
const CF_MARGIN_PX  = 2;     // 右端に残す余白
const CF_RATIO      = 0.42;  // 高さ = 幅 × これ
const CF_MIN_HEIGHT = 260;
const CF_MAX_HEIGHT = 520;
const CF_ROW_PX     = 21;    // 行の高さ（BASE_H と同じ）

/* ============ 計算（シートに触らない部分） ============ */

/** 幅から高さを決める。極端に縦長／横長にならないよう上下で止める */
function cfHeightFor_(width) {
  const h = Math.round(width * CF_RATIO);
  return Math.min(CF_MAX_HEIGHT, Math.max(CF_MIN_HEIGHT, h));
}

/** そのグラフが何行ぶんの高さになるか（重なり判定に使う） */
function cfRowsNeeded_(height) {
  return Math.ceil(height / CF_ROW_PX);
}

/** A列〜指定列の幅の合計 */
function cfWidthOf_(sheet, lastCol) {
  let w = 0;
  const n = Math.min(lastCol, sheet.getMaxColumns());
  for (let c = 1; c <= n; c++) w += sheet.getColumnWidth(c);
  return w;
}

/* ============ 実際に直す ============ */

/**
 * 1枚のシートのグラフを全部そろえる。
 * 戻り値 { n, width, height, items:[...] }
 *   items … 直した内容と、下に何行必要かの記録
 */
function cfFitSheet_(sheet) {
  const charts = sheet.getCharts();
  const width  = Math.max(200, cfWidthOf_(sheet, CF_LAST_COL) - CF_MARGIN_PX);
  const height = cfHeightFor_(width);
  const rows   = cfRowsNeeded_(height);
  const items  = [];

  charts.forEach(function (chart) {
    const info = chart.getContainerInfo();
    const from = {
      row: info.getAnchorRow(), col: info.getAnchorColumn(),
      x: info.getOffsetX(), y: info.getOffsetY()
    };

    // 常にA列の左端から始めて、幅をZ列に合わせる
    const rebuilt = chart.modify()
      .setPosition(from.row, 1, 0, 0)
      .setOption("width", width)
      .setOption("height", height)
      .build();
    sheet.updateChart(rebuilt);

    items.push({
      row: from.row,
      movedFrom: (from.col !== 1 || from.x !== 0 || from.y !== 0)
        ? ("列" + from.col + " +" + from.x + "," + from.y) : "",
      needRows: rows
    });
  });

  return { n: charts.length, width: width, height: height, rows: rows, items: items };
}

/** まとめスプシ（または現在のスプシ）の全シートを直す */
function cfFitAll_(ss) {
  const out = { sheets: [], total: 0 };
  ss.getSheets().forEach(function (sh) {
    const r = cfFitSheet_(sh);
    if (!r.n) return;
    out.sheets.push({ name: sh.getName(), r: r });
    out.total += r.n;
  });
  return out;
}

/* ============ メニュー ============ */

function menuChartFit() {
  runnerDialog_({
    title: "📐 グラフの大きさをZ列に合わせる",
    color: "#188038",
    desc: "まとめスプシの全タブのグラフを、<br>" +
          "<b>A列の左端から Z列の右端まで</b>の幅にそろえます。<br>" +
          "高さは幅に合わせて自動で決まります（" + CF_MIN_HEIGHT + "〜" + CF_MAX_HEIGHT + "px）。<br><br>" +
          "グラフの下に空き行が足りない場合は、必要な行数を報告します。",
    applyLabel: "全部そろえる",
    fn: "runChartFit",
    h: 240, height: 620
  });
}

function runChartFit(_apply) {
  progClear_();
  progSet_(5, "まとめスプシを開いています");

  let ss;
  try {
    ss = SpreadsheetApp.openById(CF_SUMMARY_SS_ID);
  } catch (e) {
    return "⚠️ まとめスプシを開けませんでした。\n" +
           "CF_SUMMARY_SS_ID が正しいか、共有設定を確認してください。\n\n" + e.message;
  }

  const sheets = ss.getSheets();
  let total = 0;
  let body = "";
  sheets.forEach(function (sh, i) {
    progSet_(Math.round(10 + 85 * i / sheets.length), sh.getName() + " を調整中");
    let r;
    try { r = cfFitSheet_(sh); } catch (e) { body += sh.getName() + " : エラー " + e.message + "\n"; return; }
    if (!r.n) return;
    total += r.n;
    body += "【" + sh.getName() + "】グラフ " + r.n + "個\n";
    body += "  幅 " + r.width + "px × 高さ " + r.height + "px（" + r.rows + "行ぶん）\n";
    const moved = r.items.filter(function (x) { return x.movedFrom; });
    if (moved.length) {
      body += "  位置を直した: " + moved.length + "個\n";
      moved.slice(0, 5).forEach(function (x) {
        body += "    " + x.row + "行目（" + x.movedFrom + " → A列）\n";
      });
    }
  });

  progSet_(100, "完了");
  if (!total) return "グラフが1つも見つかりませんでした。";

  return "✅ グラフ " + total + "個をZ列の幅にそろえました\n" +
         "──────────────\n" + body +
         "\n──────────────\n" +
         "※グラフの下に " + cfRowsNeeded_(cfHeightFor_(1000)) +
         "行前後の空きが無いと、次の見出しに重なります。\n" +
         "レポート生成側で、グラフの下に空き行を確保する必要があります。";
}

/** 今どうなっているかを見るだけ（変更しない） */
function menuChartInspect() {
  runnerDialog_({
    title: "🔎 グラフの現状を見る",
    color: "#0b5394",
    desc: "まとめスプシのグラフが、今どの位置・どの大きさかを一覧にします。<br>" +
          "<b>変更はしません。</b>",
    applyLabel: "一覧を出す",
    fn: "runChartInspect",
    h: 240, height: 620
  });
}

function runChartInspect(_apply) {
  progClear_();
  let ss;
  try {
    ss = SpreadsheetApp.openById(CF_SUMMARY_SS_ID);
  } catch (e) {
    return "⚠️ まとめスプシを開けませんでした。\n" + e.message;
  }

  let out = "";
  ss.getSheets().forEach(function (sh) {
    const charts = sh.getCharts();
    if (!charts.length) return;
    const zWidth = cfWidthOf_(sh, CF_LAST_COL);
    out += "【" + sh.getName() + "】A〜Z列の幅 = " + zWidth + "px\n";
    charts.forEach(function (c, i) {
      const info = c.getContainerInfo();
      const w = c.getOptions().get("width");
      const h = c.getOptions().get("height");
      out += "  グラフ" + (i + 1) + ": " + info.getAnchorRow() + "行 " +
             info.getAnchorColumn() + "列 (+" + info.getOffsetX() + "," + info.getOffsetY() + ")" +
             "  " + w + "×" + h + "px\n";
      if (info.getAnchorColumn() !== 1) out += "      ⚠️ A列から始まっていません\n";
      if (Math.abs(Number(w) - zWidth) > 40) out += "      ⚠️ Z列の幅と合っていません\n";
    });
    out += "\n";
  });

  return out || "グラフが1つも見つかりませんでした。";
}


/* ##############################################################
   乗り場→Googleマップ（元 MapLink.gs）
   ############################################################## */

/**
 * ================================================================
 *  G列の乗り場名 → Googleマップ リンク（MapLink.gs）
 *
 *  ★E005ver から 002-Extras.gs に同梱されました。
 *    単体で貼る必要はありません（tools/build_extras.py が束ねます）。
 *
 *  ★001-Code.gs（C024ver 以降）の formatTab_ が、整形の最後に
 *    applyMapLinks_(sheet) を呼びます。整形のたびに貼り直されるので、
 *    リンクが消えることはありません。
 *    設定タブの「乗り場にマップリンクを付ける」を いいえ にすると貼りません。
 *
 *  G列は formatTab_ が毎回 setValues で書き戻すため、
 *  =HYPERLINK() の数式では消えてしまう。そこでリッチテキストの
 *  リンクとして貼り、整形の最後に貼り直す方式にしている。
 * ================================================================
 */

/** 対応表に無い乗り場は、この語を頭に付けて検索する */
const MAP_AREA_HINT = "大阪市 ";

/**
 * 乗り場名 → Googleマップの行き先。
 *   キー … normalizePlace_() を通した名前
 *   値   … { q: "検索語" }      … その語でマップ検索
 *          { lat: 34.6, lng: 135.5 } … 座標で一発表示（こちらが正確）
 *          { q: "...", check: true } … 場所が確定していないもの
 *
 * ★ check:true は「たぶんここ」で入れてあるだけです。
 *    メニュー「🗺 マップの行き先を確認する」で一覧を出して、
 *    違うものを教えてください。座標に置き換えます。
 */
const MAP_PLACES = {
  // --- 地名・施設名がそのまま通るもの ---
  "天満":       { q: "大阪 天満駅" },
  "堂山":       { q: "大阪市北区堂山町" },
  "大丸":       { q: "大丸心斎橋店" },
  "センタラ":   { q: "センタラグランドホテル大阪" },
  "セントレジス": { q: "セントレジスホテル大阪" },
  "ニューオータニ": { q: "ホテルニューオータニ大阪" },
  "帝国":       { q: "帝国ホテル大阪" },
  "お初":       { q: "露天神社 お初天神" },
  "船大工":     { q: "大阪 船大工通り" },
  "アスエアリーナ": { q: "アスエアリーナ大阪" },
  "コナン像前": { q: "大阪 コナン像", check: true },
  "扇町":       { q: "大阪 扇町駅" },
  "南森町":     { q: "大阪 南森町駅" },
  "淀屋橋":     { q: "大阪 淀屋橋駅" },
  "西梅田":     { q: "大阪 西梅田駅" },
  "東梅田":     { q: "大阪 東梅田駅" },
  "中津":       { q: "大阪 中津駅" },
  "福島":       { q: "大阪 福島駅" },
  "野田":       { q: "大阪 野田駅" },
  "難波":       { q: "大阪 難波駅" },
  "心斎橋":     { q: "大阪 心斎橋駅" },
  "日本橋":     { q: "大阪 日本橋駅" },
  "長堀橋":     { q: "大阪 長堀橋駅" },
  "天神橋筋六丁目": { q: "天神橋筋六丁目駅" },
  "天六":       { q: "天神橋筋六丁目駅" },
  "江坂":       { q: "大阪 江坂駅" },
  "放出駅":     { q: "放出駅" },
  "北伊丹":     { q: "北伊丹駅" },
  "万博記念公園迎賓館前ロータリー": { q: "万博記念公園 迎賓館" },

  // --- ここから下は業界用語。場所が確定していません ---
  "新地1":  { q: "北新地", check: true },
  "新地2":  { q: "北新地", check: true },
  "新地4":  { q: "北新地", check: true },
  "新地5":  { q: "北新地", check: true },
  "新地7":  { q: "北新地", check: true },
  "新地15": { q: "北新地", check: true },
  "新地16": { q: "北新地", check: true },
  "新地17": { q: "北新地", check: true },
  "ガチマネプラ": { q: "大阪 マネケンプラザ", check: true },
  "乗場マネプラ": { q: "大阪 マネケンプラザ", check: true },
  "ドン":   { q: "ドン・キホーテ 道頓堀店", check: true },
  "ドン2":  { q: "ドン・キホーテ 道頓堀店", check: true },
  "ドン15": { q: "ドン・キホーテ", check: true },
  "八幡出口": { q: "阪神高速 八幡出口", check: true }
};

/* ============ リンクを作る ============ */

/**
 * 検索に使える形に均す。
 * G列の折り返しの改行は、元はスペースだった場所に入っている。
 * 消してしまうと「セントレジス西向き」のように語がくっついて検索が外れるので、
 * スペースに戻す。
 */
function mapPlaceText_(place) {
  return String(place == null ? "" : place)
    .replace(/\n/g, " ")
    .replace(/[\s　]+/g, " ")
    .trim();
}

/** 乗り場名から Googleマップ の URL を作る。空欄なら "" */
function mapUrlFor_(place) {
  const raw = mapPlaceText_(place);
  if (!raw) return "";

  const g = MAP_PLACES[normalizePlace_(raw)];
  if (g && typeof g.lat === "number" && typeof g.lng === "number") {
    // 座標が分かっているものは、検索を挟まず一発でその地点を開く
    return "https://www.google.com/maps/search/?api=1&query=" + g.lat + "," + g.lng;
  }
  const q = (g && g.q) ? g.q : (MAP_AREA_HINT + raw);
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
}

/** その乗り場が「場所が確定していない」ものか */
function mapNeedsCheck_(place) {
  const g = MAP_PLACES[normalizePlace_(mapPlaceText_(place))];
  return !g || !!g.check;
}

/* ============ シートに貼る ============ */

/**
 * G列にマップリンクを貼る。貼った件数を返す。
 * 文字サイズ・色・太字は今の見た目のまま保つ（リンクの青字・下線にしない）。
 */
function applyMapLinks_(sheet) {
  if (!sheet) return 0;
  const last = sheet.getLastRow();
  if (last < START_ROW) return 0;

  const n = last - START_ROW + 1;
  const rg = sheet.getRange(START_ROW, C_PLACE, n, 1);
  const vals = rg.getValues();
  const sizes = rg.getFontSizes();
  // いまの見た目をそのまま残す。リンクにすると既定では青字＋下線になるが、
  // 表の中で乗り場だけ色が変わると読みにくいので、元の太さ・色のままにする
  const weights = rg.getFontWeights();
  const colors  = rg.getFontColors();

  const out = [];
  let linked = 0;
  for (let i = 0; i < n; i++) {
    const text = String(vals[i][0] == null ? "" : vals[i][0]);
    const style = SpreadsheetApp.newTextStyle()
      .setFontSize(sizes[i][0] || 8)
      .setBold(String(weights[i][0]) === "bold")
      .setUnderline(false)
      .setForegroundColor(colors[i][0] || "#000000")
      .build();

    let b = SpreadsheetApp.newRichTextValue().setText(text);
    const url = mapUrlFor_(text);
    if (text !== "" && url) { b = b.setLinkUrl(url); linked++; }
    out.push([b.setTextStyle(style).build()]);
  }
  rg.setRichTextValues(out);
  return linked;
}

/* ============ メニュー ============ */

function menuMapLinksApply() {
  runnerDialog_({
    title: "🗺 乗り場にマップリンクを貼る",
    color: "#188038",
    desc: "全タブのG列（乗り場）に、Googleマップへのリンクを貼ります。<br>" +
          "見た目（文字サイズ・色）は変わりません。タップでマップが開きます。<br><br>" +
          "※ふだんは整形のたびに自動で貼られます。ここは貼り直したいとき用です。",
    applyLabel: "リンクを貼る",
    fn: "runMapLinksApply",
    h: 200
  });
}

function runMapLinksApply(_apply) {
  progClear_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let total = 0, body = "";
  ALL_TABS.forEach(function (name, i) {
    progSet_(Math.round(5 + 90 * i / ALL_TABS.length), name + "タブにリンクを貼っています");
    const sh = ss.getSheetByName(name);
    if (!sh) { body += name + " : （タブなし）\n"; return; }
    let n = 0;
    try { n = applyMapLinks_(sh); } catch (e) { logErr_("mapLink:" + name, e); }
    total += n;
    body += name + " : " + n + "件\n";
  });
  progSet_(100, "完了");
  return "✅ " + total + "件の乗り場にマップリンクを貼りました\n──────────────\n" + body +
         "\n※整形のたびに自動で貼り直されます（001-Code.gs C024ver 以降）。";
}

/**
 * 今どこへ飛ぶことになっているかの一覧。
 * 「⚠️要確認」が付いているものを教えてもらえれば、座標に直せる。
 */
function menuMapLinksCheck() {
  runnerDialog_({
    title: "🗺 マップの行き先を確認する",
    color: "#0b5394",
    desc: "乗り場ごとに、今どこへ飛ぶ設定になっているかを出します。<br>" +
          "<b>⚠️</b> が付いているものは場所が確定していません。<br>" +
          "違うものがあれば、この一覧をコピーして教えてください。",
    applyLabel: "一覧を出す",
    fn: "runMapLinksCheck",
    h: 260, height: 660
  });
}

function runMapLinksCheck(_apply) {
  progClear_();
  progSet_(10, "乗り場を集計中");
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 個人タブだけ見れば、写しの分を数えずに済む
  const count = {}, disp = {};
  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, C_PLACE, last - START_ROW + 1, 1).getValues().forEach(function (r) {
      const raw = String(r[0]).replace(/\n/g, "").trim();
      if (!raw) return;
      const k = normalizePlace_(raw);
      count[k] = (count[k] || 0) + 1;
      if (!disp[k]) disp[k] = raw;
    });
  });

  const keys = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
  const ng = keys.filter(function (k) { return mapNeedsCheck_(disp[k]); });

  let out = "■ 乗り場 " + keys.length + "種類\n";
  out += "■ ⚠️ 場所が確定していないもの: " + ng.length + "種類\n";
  out += "──────────────\n";
  keys.forEach(function (k) {
    const g = MAP_PLACES[k];
    const mark = mapNeedsCheck_(disp[k]) ? "⚠️" : "　";
    let to;
    if (g && typeof g.lat === "number") to = "座標 " + g.lat + "," + g.lng;
    else if (g && g.q) to = g.q;
    else to = MAP_AREA_HINT + disp[k] + "（対応表になし）";
    out += mark + " " + disp[k] + " (" + count[k] + "件)\n        → " + to + "\n";
  });
  out += "\n──────────────\n";
  out += "⚠️ の行き先が違うものを教えてください。\n";
  out += "Googleマップで長押し → 座標をコピー、でもOKです。";

  progSet_(100, "完了");
  return out;
}
