/**
 * ================================================================
 *  イベント情報あつめ（006-Events.gs）
 *
 *  ★★★  V002ver  （2026/09/15）  ★★★
 *
 *  ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *               W=004-WebApp / U=005-Updater / V=006-Events
 *
 *  [V002ver]
 *   ・調べた結果を、まーく個人のLINEにだけ送れるようにした（テスト送信）
 *     せまいセルで読むより読みやすく、そのままコピーして渡せる
 *     グループへは送らない。送り先は「テスト送信先（自分のLINE）」
 *   ・長い文は、行の途中で切らずに分けて送る（LINEは1通5,000文字まで）
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
const EV_VERSION = "V002ver";

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

/* ============ LINEに送る ============ */
/*
 * ★ここは必ず「自分だけ」から始める。
 *   グループに一度送ったものは取り消せない。
 *   まだ読み取りが完成していないうちに、みんなに変なものが飛ぶのがいちばん困る。
 *   グループへ送るのは、レポートと同じく「もう一度チェック」で確かめてからにする。
 */

/** テストの宛先（まーく個人のLINE） */
function evTestTarget_() {
  // レポート側と同じ決まりを使う（設定タブ「テスト送信先（自分のLINE）」→ 登録済みの「ﾏｰｸ」）
  if (typeof rpTestTarget_ === "function") {
    const v = rpTestTarget_();
    if (v) return v;
  }
  try {
    for (const id in SENDER_MAP) { if (SENDER_MAP[id] === "ﾏｰｸ") return id; }
  } catch (e) {}
  return "";
}

/** グループの宛先 */
function evGroupTarget_() {
  if (typeof rpGroupTarget_ === "function") return rpGroupTarget_();
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    return sh ? String(sh.getRange("Z1").getValue() || "").trim() : "";
  } catch (e) { return ""; }
}

/**
 * 長い文を、LINEが受け取れる長さに分ける。
 * 1通5,000文字まで。行の途中では切らない（読めなくなるため）。
 */
function evSplitText_(text, max) {
  const limit = max || 4500;
  const out = [];
  let cur = "";
  String(text).split("\n").forEach(function (line) {
    // 1行だけで長すぎるときは、そこだけ仕方なく切る。
    // このあと改行を1文字足すので、その1文字ぶんを残しておく
    while (line.length > limit - 1) {
      if (cur) { out.push(cur); cur = ""; }
      out.push(line.slice(0, limit - 1));
      line = line.slice(limit - 1);
    }
    if ((cur + line + "\n").length > limit) { out.push(cur); cur = ""; }
    cur += line + "\n";
  });
  if (cur.trim()) out.push(cur);
  return out.length ? out : [""];
}

/**
 * 文字をLINEに送る。where は "test"（自分だけ）か "group"（みんな）。
 * 送れたら ""、送れなければ理由を返す。
 */
function evSend_(text, where) {
  const to = (where === "group") ? evGroupTarget_() : evTestTarget_();
  if (!to) {
    return where === "group"
      ? "グループの送り先が分かりません（グループLINEに何か1つ投稿すると覚えます）"
      : "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  }
  const parts = evSplitText_(text);
  // 1回の送信でならべられるのは5通まで
  const messages = parts.slice(0, 5).map(function (t, i) {
    return { type: "text", text: (parts.length > 1 ? "（" + (i + 1) + "/" + Math.min(parts.length, 5) + "）\n" : "") + t };
  });
  try {
    if (typeof lrPush_ === "function") { lrPush_(to, messages); return ""; }
    // 003-LineReport が古いときの逃げ道
    const token = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
    if (!token) return "LINEトークンが未設定です";
    const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post", muteHttpExceptions: true,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      payload: JSON.stringify({ to: to, messages: messages })
    });
    const code = res.getResponseCode();
    return (code >= 200 && code < 300) ? "" : "LINEに送れませんでした（" + code + "）";
  } catch (e) {
    return "LINEに送れませんでした（" + (e && e.message ? e.message : e) + "）";
  }
}

/**
 * 調べた結果を、自分のLINEにだけ送る。
 * スプレッドシートのせまいセルで読むより、LINEのほうが読みやすく、
 * そのままコピーして人に渡せる。
 */
function evProbeSendToMe() {
  const text = evProbeAll();
  const err = evSend_("🔎 イベント情報の調査（テスト送信・自分だけ）\n\n" + text, "test");
  return { text: text, err: err };
}

/* ============ メニュー／そうさボタン ============ */

/**
 * そうさボタン [9] の中身。
 * 結果らんに出しつつ、自分のLINEにも送る（グループには絶対に送らない）。
 */
function panelEventProbe() {
  const r = evProbeSendToMe();
  const head = r.err
    ? "⚠️ 自分のLINEには送れませんでした：" + r.err
    : "📱 同じ内容を、まーく個人のLINEにだけ送りました（テスト送信）";
  return head + "\n\n" + r.text;
}

/**
 * イベントのお知らせを、自分のLINEにだけ送ってみる（テスト）。
 * 読み取りがまだのうちは、調査の結果を送る。
 */
function menuEventTestSend() {
  const r = evProbeSendToMe();
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🧪 イベント情報のテスト送信",
      r.err ? "送れませんでした：\n" + r.err
            : "まーく個人のLINEにだけ送りました。\nグループには送っていません。",
      ui.ButtonSet.OK);
  } catch (e) {}
  return r.err ? "❌ " + r.err : "🧪 まーく個人のLINEにだけ送りました（グループには送っていません）";
}

/** メニューから調べる（結果は自分のLINEにも送る） */
function menuEventProbe() {
  const r = evProbeSendToMe();
  const text = (r.err ? "⚠️ 自分のLINEには送れませんでした：" + r.err
                      : "📱 同じ内容を、まーく個人のLINEにだけ送りました") + "\n\n" + r.text;
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
