/**
 * ================================================================
 *  イベント情報あつめ（006-Events.gs）
 *
 *  ★★★  V001ver  （2026/09/15）  ★★★
 *
 *  ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *               W=004-WebApp / U=005-Updater / V=006-Events
 *
 *  [V001ver]
 *   ・まずは「そのページが機械で読めるのか」を調べるところだけ作った。
 *     読み取りの中身は、この調査の結果を見てから書く。
 *
 *  ★なぜいきなり読み取りを書かないのか
 *    ホームページは、次の2種類にはっきり分かれる。
 *      ① そのまま文字が入っている  → 読める
 *      ② 開いたあとに中身を作る（JavaScript）→ 読めない
 *    Apps Script が取れるのは「開く前の生のHTML」だけなので、②は何をしても読めない。
 *    どちらなのかは、実際に取ってみないと分からない。
 *    「作ったけど動かない」を繰り返さないために、先に調べる。
 * ================================================================
 */

/** このファイルのバージョン */
const EV_VERSION = "V001ver";

/**
 * 見にいく先の一覧。
 * kind … "event"（イベント）/ "barasi"（バラシ）/ "hotel"（ホテル）
 */
const EV_SOURCES = [
  { name: "大阪城ホール",         kind: "event",  url: "https://www.osaka-johall.com/event/" },
  { name: "京セラドーム",         kind: "event",  url: "https://www.kyoceradome-osaka.jp/schedule/" },
  { name: "インテックス大阪",     kind: "event",  url: "https://www.intex-osaka.com/jp/event/" },
  { name: "パナソニックスタジアム", kind: "event", url: "https://suitacityfootballstadium.jp/schedule/" },
  { name: "万博記念公園",         kind: "event",  url: "https://live-events.a-jp.org/soko/plc/318.html" },
  { name: "長居スタジアム",       kind: "event",  url: "https://live-events.a-jp.org/soko/plc/149.html" },
  { name: "ワントゥワン",         kind: "barasi", url: "https://onetoone-jp.com/schedule.php" }
];

/* ============ 調べる ============ */

/**
 * それぞれのページを実際に取ってきて、機械で読めるかどうかを見る。
 *
 * 見るところ：
 *   ・ちゃんと返ってくるか（HTTPの番号）
 *   ・中身の大きさ
 *   ・今日・明日の日付が、生のHTMLの中に文字として入っているか
 *     → 入っていれば ① 読める。入っていなければ ② JavaScript で作っている疑い
 *   ・Googleカレンダーを埋め込んでいないか
 *     → 埋め込んでいれば、HTMLを解析するより、カレンダーを直接読むほうが確実
 */
function evProbeAll() {
  const now = new Date();
  const out = [];
  out.push("🔎 イベント情報のページを調べました（" + evDateLabel_(now) + "）");
  out.push("");

  EV_SOURCES.forEach(function (src) {
    if (typeof updBeat_ === "function") updBeat_("調査 " + src.name);
    out.push("■ " + src.name + "（" + src.kind + "）");
    const r = evProbeOne_(src, now);
    r.forEach(function (line) { out.push("　" + line); });
    out.push("");
  });

  out.push("■ 帝国ホテル / リーガロイヤルホテル");
  out.push("　ホームページに出ていない紙の資料なので、取りにいく先がありません。");
  out.push("　写真をLINEに送って読み取る形にするのが現実的です（後述）。");

  return out.join("\n");
}

/** 1つぶんを調べる。戻り値は行の配列 */
function evProbeOne_(src, now) {
  const L = [];
  let res;
  try {
    res = UrlFetchApp.fetch(src.url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TaxiReport/1.0)" }
    });
  } catch (e) {
    L.push("❌ つながりませんでした：" + (e && e.message ? e.message : e));
    return L;
  }

  const code = res.getResponseCode();
  let html = "";
  try { html = res.getContentText(); } catch (e) {
    try { html = res.getContentText("Shift_JIS"); } catch (e2) { html = ""; }
  }
  L.push("返事：" + code + " ／ 大きさ：" + Math.round(html.length / 1024) + "KB");
  if (code !== 200 || !html) { L.push("❌ 中身が取れませんでした"); return L; }

  // 文字化けしていないか（日本語がまったく無ければ、文字の種類が違う）
  if (!/[ぁ-んァ-ン一-龥]/.test(html)) {
    L.push("⚠️ 日本語が見当たりません（文字の種類が違うかもしれません）");
  }

  // Googleカレンダーを埋め込んでいるか
  if (/calendar\.google\.com/.test(html)) {
    const m = html.match(/calendar\.google\.com\/calendar\/[^"'\s]*/);
    L.push("📅 Googleカレンダーを使っています → こちらを直接読むのが確実");
    if (m) L.push("　" + m[0].slice(0, 120));
  }

  // 今日・明日・今月の日付が、文字として入っているか
  const hits = [];
  [0, 1, 2].forEach(function (d) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    evDatePatterns_(t).forEach(function (p) {
      if (html.indexOf(p) !== -1 && hits.indexOf(p) === -1) hits.push(p);
    });
  });
  if (hits.length) {
    L.push("✅ 日付が文字として入っています（" + hits.slice(0, 5).join("・") + "）");
    L.push("　→ 読み取りを作れます");
  } else {
    L.push("⚠️ 今日・明日の日付が見当たりません");
    // JavaScript で作っている疑いがあるか
    const scripts = (html.match(/<script/gi) || []).length;
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    L.push("　文字の量：" + text.length + "文字 ／ script の数：" + scripts);
    if (text.length < 500) L.push("　→ 開いたあとに中身を作る作り（JavaScript）の可能性が高いです");
    else L.push("　→ 中身はありますが、日付の書き方が違うのかもしれません");
    L.push("　見えている文字の先頭：" + text.slice(0, 80));
  }
  return L;
}

/** その日を表す、ありがちな書き方をならべる */
function evDatePatterns_(d) {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const p2 = function (n) { return ("0" + n).slice(-2); };
  return [
    y + "-" + p2(m) + "-" + p2(day),
    y + "/" + p2(m) + "/" + p2(day),
    y + "/" + m + "/" + day,
    y + "年" + m + "月" + day + "日",
    m + "月" + day + "日",
    p2(m) + "/" + p2(day),
    m + "/" + day
  ];
}

/** 「9/15(月)」の形 */
function evDateLabel_(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return (d.getMonth() + 1) + "/" + d.getDate() + "(" + w[d.getDay()] + ")";
}

/* ============ メニュー／そうさボタン ============ */

/** そうさボタン [9] の中身 */
function panelEventProbe() {
  return evProbeAll();
}

/** メニューから調べる */
function menuEventProbe() {
  const text = evProbeAll();
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    if (sh) { sh.getRange("Y7").setValue("イベント調査"); sh.getRange("Z7").setValue(text); }
  } catch (e) {}
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🔎 イベント情報の調査", text.slice(0, 1400), ui.ButtonSet.OK);
  } catch (e) {}
  return text;
}
