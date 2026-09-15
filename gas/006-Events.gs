/**
 * ================================================================
 *  イベント情報あつめ（006-Events.gs）
 *
 *  ★★★  V003ver  （2026/09/15）  ★★★
 *
 *  ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *               W=004-WebApp / U=005-Updater / V=006-Events
 *
 *  [V003ver]
 *   ・LINEの絵（Flex Message）で出す形にした。レポートの青とは分けて紫にする
 *     裏メッセージは「🎪〇/〇(曜)イベント等情報 byシバンニ」
 *   ・URLは絵の中だけでなく、文字のメッセージでも残す
 *     絵の中のリンクは押せるが、URLの文字は見えず、長押しでコピーもできないため
 *   ・出す条件を入れた
 *     ・18:00〜翌04:00 に動きがあるものだけ（終わりの時刻を優先して見る）
 *     ・小さすぎてタクシーに響かないものは省く
 *   ・自社の記録から、その乗り場の 件数・平均・待ち・客層（男女比・年代）を出す
 *     備考に書いてある「男性40代」などを数えている。母数が少なければ出さない
 *   ・助言は、確かめようのない話を書かない作りにした
 *     終わる時刻から決まること と、自社の記録から言えることだけ
 *   ・見本を自分のLINEにだけ送れるようにした（見た目を決めてもらうため）
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
const EV_VERSION = "V003ver";

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

/* ============ 会場のこと ============ */
/*
 * 会場ごとに決まっていること（入る人数・近くの乗り場）は、ここに書いておく。
 * ホームページから取れるのは「いつ・何があるか」だけなので、
 * 「どれくらいの規模か」はこちらで持っておかないと判断できない。
 */
const EV_VENUES = {
  "大阪城ホール":           { cap: 16000, near: ["森ノ宮", "京橋", "大阪城公園"], type: "ホール" },
  "京セラドーム":           { cap: 36000, near: ["ドーム前", "大正", "難波"],     type: "ドーム" },
  "インテックス大阪":       { cap: 20000, near: ["中ふ頭", "コスモスクエア"],     type: "展示場" },
  "パナソニックスタジアム": { cap: 40000, near: ["万博記念公園", "山田"],         type: "スタジアム" },
  "万博記念公園":           { cap: 30000, near: ["万博記念公園迎賓館前ロータリー", "万博記念公園"], type: "野外" },
  "長居スタジアム":         { cap: 47000, near: ["長居", "鶴ヶ丘"],               type: "スタジアム" },
  "ワントゥワン":           { cap: 0,     near: [],                               type: "バラシ" },
  "帝国ホテル":             { cap: 0,     near: ["帝国"],                         type: "ホテル" },
  "リーガロイヤルホテル":   { cap: 0,     near: ["中之島", "リーガ"],             type: "ホテル" }
};

/** 対象にする時間帯（この中に「終わり」か「始まり」が入っていれば出す） */
const EV_FROM_HOUR = 18;   // 18:00
const EV_TO_HOUR   = 28;   // 翌04:00（24＋4）

/** これ未満の見込み人数は、タクシーの数に響かないので出さない */
const EV_MIN_PEOPLE = 300;

/* ============ 出すかどうかの判断 ============ */

/** "21:30" → 21.5。翌日にまたぐものは 24 を足す（"01:00" → 25） */
function evHourOf_(hhmm) {
  const m = String(hhmm || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
  if (h < 12) h += 24;          // 0〜11時は「翌日」とみなす
  return h;
}

/**
 * 18:00〜翌04:00 にかかるか。
 * 終わりの時刻を優先して見る（タクシーが動くのは終演のとき）。
 * 時刻が分からないものは、捨てずに「時間不明」として残す（判断は人がする）。
 */
function evInTimeRange_(ev) {
  const end = evHourOf_(ev.end);
  const start = evHourOf_(ev.start);
  if (end === null && start === null) return true;        // 分からないものは残す
  const h = (end !== null) ? end : start;
  return h >= EV_FROM_HOUR && h <= EV_TO_HOUR;
}

/**
 * タクシーの数に響く規模かどうか。
 * 人数が分かればそれで、分からなければ会場の大きさで見る。
 */
function evBigEnough_(ev) {
  if (ev.people > 0) return ev.people >= EV_MIN_PEOPLE;
  const v = EV_VENUES[ev.venue];
  if (v && v.type === "ホテル") return true;               // 宴会は人数が書いてある前提
  if (v && v.cap >= 3000) return true;                     // 大きな会場は、まず響く
  return true;                                             // 分からないものは消さない
}

/* ============ 自社の記録から言えること ============ */

/**
 * その乗り場について、自社の記録から分かることを集める。
 *
 * ★ここが「説得力のあるアドバイス」のもと。
 *   よそから持ってきた一般論ではなく、自分たちが実際に稼いだ数字だけを使う。
 *   記録が無ければ「記録なし」と正直に言う（それらしい作り話はしない）。
 */
function evPlaceStats_(names, fromHour, toHour) {
  const out = { count: 0, sales: 0, waitSum: 0, waitCount: 0, max: 0,
                male: 0, female: 0, ages: {}, place: "" };
  let ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return out; }
  if (!ss || !names || !names.length) return out;

  const want = names.map(function (n) { return String(n).replace(/[\s　]/g, ""); });
  const tabs = (typeof PERSONAL_TABS !== "undefined") ? PERSONAL_TABS : [];

  tabs.forEach(function (tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() < 4) return;
    const n = sh.getLastRow() - 3;
    const vals = sh.getRange(4, 1, n, 11).getValues();
    const disp = sh.getRange(4, 1, n, 11).getDisplayValues();

    for (let r = 0; r < n; r++) {
      const place = String(vals[r][6] || "").replace(/[\s　\n]/g, "");
      if (!place) continue;
      let hit = false;
      for (let i = 0; i < want.length; i++) {
        if (place.indexOf(want[i]) !== -1) { hit = true; if (!out.place) out.place = want[i]; break; }
      }
      if (!hit) continue;

      // 時間帯でしぼる（終演まわりの時間だけ見たいとき）
      if (fromHour != null) {
        const h = evHourOf_(String(disp[r][4] || ""));
        if (h === null || h < fromHour || h > toHour) continue;
      }

      const price = parseInt(String(vals[r][5]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(price) || price <= 0) continue;
      out.count++; out.sales += price;
      if (price > out.max) out.max = price;
      const w = parseInt(String(vals[r][3]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(w) && w > 0) { out.waitSum += w; out.waitCount++; }

      // 備考に書いてある「男性40代」などを数える
      const memo = String(vals[r][7] || "") + " " + String(vals[r][8] || "");
      if (/男性|男の/.test(memo)) out.male++;
      if (/女性|女の/.test(memo)) out.female++;
      const age = memo.match(/(\d0)\s*代/);
      if (age) out.ages[age[1] + "代"] = (out.ages[age[1] + "代"] || 0) + 1;
    }
  });
  return out;
}

/** 集めた記録を、読める1〜2行にする。記録が無ければ "" */
function evStatsLine_(st) {
  if (!st || st.count === 0) return "";
  const avg = Math.round(st.sales / st.count);
  let t = `自社の記録：${st.count}件 平均￥${avg.toLocaleString()}`;
  if (st.max > avg) t += ` 最高￥${st.max.toLocaleString()}`;
  if (st.waitCount > 0) t += ` 待ち${Math.round(st.waitSum / st.waitCount)}分`;

  // 客層。備考に書いてあるぶんだけ数えたものなので、母数も一緒に出す
  const sex = st.male + st.female;
  const parts = [];
  if (sex >= 3) {
    parts.push(`男${Math.round(st.male / sex * 100)}% 女${Math.round(st.female / sex * 100)}%`);
  }
  const ageKeys = Object.keys(st.ages).sort(function (a, b) { return st.ages[b] - st.ages[a]; });
  if (ageKeys.length) {
    const total = ageKeys.reduce(function (a, k) { return a + st.ages[k]; }, 0);
    if (total >= 3) parts.push(ageKeys.slice(0, 2).map(function (k) {
      return k + " " + Math.round(st.ages[k] / total * 100) + "%";
    }).join(" / "));
  }
  if (parts.length) t += `\n客層（備考に書いてあるぶん）：${parts.join("・")}`;
  return t;
}

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

/* ============ LINEの絵（Flex Message） ============ */
/*
 * ★レポートとは色を変える。
 *   毎月のレポート＝青、こちらのイベント＝紫。
 *   同じ色だと、トークをさかのぼったときにどちらか分からなくなる。
 *
 * ★リンクの出し方について
 *   Flex の中では、押すと開く形にはできるが、URLの文字そのものは見えないし、
 *   長押しでコピーもできない。
 *   あとから見返して人に渡したいので、絵のあとに URL だけのテキストも1通送る。
 *   （1回の送信でまとめて届くので、通知は1回）
 */

const EV_COLOR_HEAD = "#6a1b9a";   // 紫（レポートの青 #1155ca と分ける）
const EV_COLOR_SUB  = "#7b1fa2";
const EV_COLOR_TEXT = "#4a148c";

/** 「9/16(水)」 */
function evDayLabel_(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return (d.getMonth() + 1) + "/" + d.getDate() + "(" + w[d.getDay()] + ")";
}

/** 裏メッセージ（通知やトーク一覧に出る文字） */
function evAltText_(d) {
  return "🎪" + evDayLabel_(d) + "イベント等情報 byシバンニ";
}

/** 1件ぶんの箱 */
function evCard_(ev) {
  const v = EV_VENUES[ev.venue] || {};
  const rows = [];

  // 1行目：会場と時間
  const when = ev.start && ev.end ? `${ev.start}〜${ev.end}`
             : ev.end   ? `${ev.end} 終了`
             : ev.start ? `${ev.start} 開始`
             : "時間不明";
  rows.push({ "type": "text", "size": "sm", "wrap": true, "contents": [
    { "type": "span", "text": (ev.icon || "📍") + " " + ev.venue, "weight": "bold", "color": EV_COLOR_TEXT },
    { "type": "span", "text": "　" + when, "weight": "bold", "color": "#b71c1c" }
  ]});

  // 2行目：何があるか・規模
  const size = [];
  if (ev.people > 0) size.push(ev.people.toLocaleString() + "人");
  else if (v.cap > 0) size.push("最大" + v.cap.toLocaleString() + "人の会場");
  const what = [ev.title].concat(size).filter(String).join("／");
  if (what) rows.push({ "type": "text", "text": what, "size": "xs", "color": "#333333", "wrap": true, "margin": "xs" });

  // 3行目：自社の記録から言えること
  if (ev.stats) rows.push({ "type": "text", "text": ev.stats, "size": "xxs", "color": "#5f6368", "wrap": true, "margin": "xs" });

  // 4行目：この1件についての助言
  if (ev.advice) rows.push({ "type": "text", "text": "▶ " + ev.advice, "size": "xs", "color": "#1b5e20", "wrap": true, "margin": "sm", "weight": "bold" });

  const box = { "type": "box", "layout": "vertical", "backgroundColor": "#f6f1f9",
                "paddingAll": "10px", "cornerRadius": "md", "margin": "sm", "contents": rows };
  // 箱ごと押すと、その会場のページが開く
  if (ev.url) {
    box.action = { "type": "uri", "label": ev.venue, "uri": ev.url };
    rows.push({ "type": "text", "text": "（ここを押すと公式ページ）", "size": "xxs", "color": "#7b1fa2", "margin": "xs" });
  }
  return box;
}

/**
 * イベントのお知らせを組み立てる。
 * 戻り値は LINE に渡すメッセージの配列（絵＋URLのテキスト）。
 */
function evBuildMessages_(day, events, note) {
  const alt = evAltText_(day);
  const contents = [];

  contents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#f3e5f5",
    "paddingAll": "10px", "cornerRadius": "md", "contents": [
      { "type": "text", "text": "対象は 18:00〜翌04:00 に動きがあるものだけです", "size": "xxs", "color": "#6a1b9a", "wrap": true },
      { "type": "text", "text": "小さすぎてタクシーに響かないものは省いています", "size": "xxs", "color": "#6a1b9a", "wrap": true, "margin": "xs" }
    ]});

  const kinds = [["event", "🎤 イベント"], ["barasi", "🔧 バラシ（搬出）"], ["hotel", "🍽 ホテル宴会"]];
  let shown = 0;
  kinds.forEach(function (k) {
    const list = (events || []).filter(function (e) { return (e.kind || "event") === k[0]; });
    if (!list.length) return;
    contents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": k[1], "weight": "bold", "size": "sm", "color": EV_COLOR_SUB, "margin": "md" });
    list.forEach(function (e) { contents.push(evCard_(e)); shown++; });
  });

  if (!shown) {
    contents.push({ "type": "text", "text": "この日に、18:00〜翌04:00 で拾えるイベントは見つかりませんでした。",
      "size": "sm", "color": "#666666", "wrap": true, "margin": "lg" });
  }
  if (note) {
    contents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": note, "size": "xxs", "color": "#b71c1c", "wrap": true, "margin": "md" });
  }

  const bubble = {
    "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": EV_COLOR_HEAD, "paddingAll": "15px",
      "contents": [ { "type": "text", "text": "🎪 " + evDayLabel_(day) + " イベント等情報",
        "weight": "bold", "color": "#ffffff", "size": "md", "wrap": true } ] },
    "body": { "type": "box", "layout": "vertical", "paddingAll": "12px", "spacing": "none", "contents": contents }
  };

  const msgs = [{ type: "flex", altText: alt, contents: bubble }];

  // URLは、あとから見返せるように文字でも残す
  const urls = [];
  (events || []).forEach(function (e) {
    if (e.url && urls.indexOf(e.venue + "\n" + e.url) === -1) urls.push(e.venue + "\n" + e.url);
  });
  if (urls.length) {
    msgs.push({ type: "text",
      text: "🔗 " + evDayLabel_(day) + " の情報もと（押すと開きます／長押しでコピーできます）\n\n" + urls.join("\n\n") });
  }
  return msgs;
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
 * 見本のイベントを作る。
 *
 * 読み取りがまだできていないので、まずは「どんな見た目で届くか」を
 * 決めてもらうための見本。数字は自社の記録から引いてくるので、
 * 客層や平均は本物（記録が無ければ「記録なし」と出る）。
 */
function evSampleEvents_() {
  const mk = function (venue, kind, icon, title, start, end, people, url) {
    const v = EV_VENUES[venue] || {};
    const st = evPlaceStats_(v.near, EV_FROM_HOUR, EV_TO_HOUR);
    const line = evStatsLine_(st);
    return { venue: venue, kind: kind, icon: icon, title: title, start: start, end: end,
             people: people, url: url,
             stats: line || "自社の記録：この乗り場の記録はまだありません",
             advice: evAdvice_(venue, end, st) };
  };
  return [
    mk("京セラドーム", "event", "🏟", "コンサート", "18:00", "21:00", 0,
       "https://www.kyoceradome-osaka.jp/schedule/"),
    mk("大阪城ホール", "event", "🎤", "コンサート", "18:30", "20:45", 0,
       "https://www.osaka-johall.com/event/"),
    mk("ワントゥワン", "barasi", "🔧", "搬出（バラシ）", "22:00", "", 0,
       "https://onetoone-jp.com/schedule.php"),
    mk("リーガロイヤルホテル", "hotel", "🍽", "就任披露・周年記念", "", "21:00", 300, "")
  ];
}

/**
 * その1件についての助言。
 *
 * ★ここは、根拠のあることしか書かない。
 *   「若い女性が多いので…」のような、確かめようのない話は書かない。
 *   書くのは、終わる時刻から決まること と、自社の記録から言えることだけ。
 */
function evAdvice_(venue, end, st) {
  const v = EV_VENUES[venue] || {};
  const L = [];
  const h = evHourOf_(end);
  if (h !== null) {
    const m = Math.floor((h - 0.5) % 24), mm = Math.round(((h - 0.5) % 1) * 60);
    L.push(("0" + m).slice(-2) + ":" + ("0" + mm).slice(-2) + "ごろから動きはじめます");
  }
  if (v.near && v.near.length) L.push("近いのは " + v.near.join("・"));
  if (st && st.count >= 3) {
    const avg = Math.round(st.sales / st.count);
    if (st.waitCount > 0) {
      const w = Math.round(st.waitSum / st.waitCount);
      L.push(`この乗り場は普段 待ち${w}分・平均￥${avg.toLocaleString()}。1時間待ちに直すと￥${Math.round(avg / w * 60).toLocaleString()}のペース`);
    } else {
      L.push(`この乗り場は普段 平均￥${avg.toLocaleString()}`);
    }
  } else {
    L.push("この乗り場の記録がまだ少ないので、実績からの判断はできません");
  }
  return L.join("。");
}

/** 見本を、自分のLINEにだけ送る（見た目を決めてもらうため） */
function evSendSampleToMe() {
  const day = new Date();
  const events = evSampleEvents_();
  const note = "※ これは見た目を決めるための見本です。" +
    "ページの読み取りはこれから作ります（[9] の調査結果を見てから）。";
  const msgs = evBuildMessages_(day, events, note);
  const to = evTestTarget_();
  if (!to) return "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  try {
    if (typeof lrPush_ === "function") lrPush_(to, msgs);
    else return "003-LineReport が古いので送れません";
    return "";
  } catch (e) { return (e && e.message ? e.message : String(e)); }
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

/** 見本のイベント情報を、自分のLINEにだけ送る（メニュー） */
function menuEventSample() {
  const err = evSendSampleToMe();
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🎪 イベント情報の見本",
      err ? "送れませんでした：\n" + err
          : "まーく個人のLINEにだけ送りました。\n見た目を見て、直したいところを教えてください。",
      ui.ButtonSet.OK);
  } catch (e) {}
  return err ? "❌ " + err : "🎪 見本をまーく個人のLINEにだけ送りました（グループには送っていません）";
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
