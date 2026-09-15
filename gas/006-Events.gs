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
 *
 *  [V004ver]
 *   ・リンクを「押せるボタン」にして、送るのを1通だけにした
 *     いままでは 絵1通＋URLの文字1通 の2通だった。
 *     ボタンの高さは LINE でいちばん小さい "sm"（40px前後）。
 *     これより小さくする指定は LINE に無く、あっても指で押しづらい。
 *     横に2つずつ並べて、たてに伸びないようにしてある。
 *   ・1通が10KBを超えそうなときは、細かい話 → 助言 → 件数 の順に削る
 *     （削ったことは必ず書き添える）
 *   ・公演名から、来る人の年代・男女比の「推定」をAIに聞くようにした
 *     知らない催しには「不明」と答えさせ、知ったかぶりをさせない。
 *     自社の記録（実績）とは、色も言葉も分けて出す。
 *   ・ホテルの予定表の写真を、オプチャのスクショと取り違えないようにした
 *     ①「ホテル」と打ってから写真を送る（「↑ホテル」で直前のぶんを読み直す）
 *     ② 合図が無くても、乗車記録が1件も読めなかったときだけ読み直す
 *   ・毎日16:45の自動発信を作った（はじめは切ってある）
 *     その日に出すものが1件も無ければ、1通も送らない。
 *     同じ日に二度は送らない。送り先が分からなければ送らない。
 * ================================================================
 */

/** このファイルのバージョン */
const EV_VERSION = "V004ver";

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

/** 自動で送る時刻（16:45）。5分おきに時計を見て、この時刻を過ぎたら1回だけ送る */
const EV_SEND_HOUR = 16;
const EV_SEND_MIN  = 45;
/** 送る時刻をどれだけ過ぎたら、その日はもうあきらめるか（分） */
const EV_SEND_WINDOW = 45;

/** Flex（絵）1通の上限。LINEの決まりは10KB。ぶつからないよう手前で止める */
const EV_FLEX_MAX = 9500;

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

  // 3行目：自社の記録から言えること（これは「実績」。確かな数字）
  if (ev.stats) rows.push({ "type": "text", "text": ev.stats, "size": "xxs", "color": "#5f6368", "wrap": true, "margin": "xs" });

  // 4行目：客層の見当（これは「推定」。当たり外れがあるので、実績とは色も言葉も分ける）
  if (ev.guess) rows.push({ "type": "text", "text": "👥 推定：" + ev.guess, "size": "xxs", "color": "#8d6e63", "wrap": true, "margin": "xs" });

  // 5行目：この1件についての助言
  if (ev.advice) rows.push({ "type": "text", "text": "▶ " + ev.advice, "size": "xs", "color": "#1b5e20", "wrap": true, "margin": "sm", "weight": "bold" });

  const box = { "type": "box", "layout": "vertical", "backgroundColor": "#f6f1f9",
                "paddingAll": "10px", "cornerRadius": "md", "margin": "sm", "contents": rows };
  // 箱ごと押しても、その会場のページが開く（下のボタンと、どちらからでも行ける）
  if (ev.url) box.action = { "type": "uri", "label": ev.venue, "uri": ev.url };
  return box;
}


/* ============ リンクのボタン ============ */
/*
 * URLを文字で並べると、それだけで画面が埋まってしまう。
 * 押せるボタンにして、絵の中に入れてしまう（送るのは1通だけで済む）。
 *
 * 大きさは LINE でいちばん小さい "sm"（高さ40px前後）。
 * これより小さくする指定は LINE に無く、あっても指で押しづらくなるので、
 * ここで止めている。横に2つずつ並べて、たてに伸びないようにしている。
 */

/** ボタンの文字。長い会場名は入りきらないので詰める */
function evBtnLabel_(name) {
  const s = String(name || "").replace(/[\s\u3000]/g, "");
  return s.length > 9 ? s.slice(0, 8) + "…" : (s || "ページ");
}

/** ボタン1つぶん */
function evLinkBtn_(name, url) {
  return {
    "type": "box", "layout": "vertical", "flex": 1,
    "backgroundColor": "#ede7f6", "cornerRadius": "md",
    "borderWidth": "1px", "borderColor": "#b39ddb",
    "contents": [{
      "type": "button", "style": "link", "height": "sm", "color": EV_COLOR_HEAD,
      "action": { "type": "uri", "label": evBtnLabel_(name), "uri": url }
    }]
  };
}

/** ボタンを、横に2つずつ並べる */
function evLinkRows_(events) {
  const seen = {}, btns = [];
  (events || []).forEach(function (e) {
    if (!e.url || seen[e.url]) return;
    seen[e.url] = true;
    btns.push(evLinkBtn_(e.venue, e.url));
  });
  const rows = [];
  for (let i = 0; i < btns.length; i += 2) {
    const pair = btns.slice(i, i + 2);
    // 1つだけ余ったときは、右側を空けて幅をそろえる（ボタンが横に伸びない）
    if (pair.length === 1) {
      pair.push({ "type": "box", "layout": "vertical", "flex": 1, "contents": [{ "type": "filler" }] });
    }
    rows.push({ "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "sm", "contents": pair });
  }
  return rows;
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
  // もとのページへ行けるボタン（文字で並べるとかさばるので、押せる形にする）
  const links = evLinkRows_(events);
  if (links.length) {
    contents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": "🔗 もとのページ（押すと開きます）", "size": "xxs",
        "color": EV_COLOR_SUB, "weight": "bold", "margin": "md" });
    links.forEach(function (r) { contents.push(r); });
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

  return [{ type: "flex", altText: alt, contents: bubble }];
}


/**
 * 1通に収まるかを見て、入らなければ細かい話から削る。
 *
 * ★LINEの絵（Flex）は1通10KBまで。文字数ではなくバイト数で数える。
 *   ここを見誤ると「Too large flex message」で1通も届かない。
 *   削る順は、細かい話 → 助言 → 件数。いちばん大事な
 *   「どこで・何時に終わるか」は最後まで残す。
 */
function evFitMessages_(day, events, note) {
  const size = function (msg) {
    const json = JSON.stringify(msg);
    try { if (typeof lrBytes_ === "function") return lrBytes_(json); } catch (e) {}
    return json.length * 3;                       // 逃げ道（多めに見積もる）
  };
  const copy = function (list, drop) {
    return list.map(function (e) {
      const c = {};
      for (const k in e) c[k] = e[k];
      drop.forEach(function (k) { c[k] = ""; });
      return c;
    });
  };

  let evs = (events || []).slice();
  let msgs = evBuildMessages_(day, evs, note);
  if (size(msgs[0]) <= EV_FLEX_MAX) return msgs;

  // ① 客層の行（実績・推定）を落とす
  evs = copy(evs, ["stats", "guess"]);
  msgs = evBuildMessages_(day, evs, note);
  if (size(msgs[0]) <= EV_FLEX_MAX) return msgs;

  // ② 助言も落とす
  evs = copy(evs, ["advice"]);
  msgs = evBuildMessages_(day, evs, note);
  if (size(msgs[0]) <= EV_FLEX_MAX) return msgs;

  // ③ それでも入らなければ件数を減らし、減らしたことを必ず書き添える
  while (evs.length > 1 && size(evBuildMessages_(day, evs, note)[0]) > EV_FLEX_MAX) evs.pop();
  const cut = evs.length < events.length ? (events.length - evs.length) : 0;
  const add = cut ? "※ 長くなりすぎるため、ほかに" + cut + "件を省きました。" : "";
  return evBuildMessages_(day, evs, (note ? note + " " : "") + add);
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
  const mk = function (venue, kind, icon, title, start, end, people, url, guess) {
    const v = EV_VENUES[venue] || {};
    const st = evPlaceStats_(v.near, EV_FROM_HOUR, EV_TO_HOUR);
    const line = evStatsLine_(st);
    return { venue: venue, kind: kind, icon: icon, title: title, start: start, end: end,
             people: people, url: url,
             stats: line || "自社の記録：この乗り場の記録はまだありません",
             guess: guess || "",
             advice: evAdvice_(venue, end, st) };
  };
  return [
    mk("京セラドーム", "event", "🏟", "コンサート", "18:00", "21:00", 0,
       "https://www.kyoceradome-osaka.jp/schedule/", "20〜30代女性が中心。男女比おおよそ2:8（見本）"),
    mk("大阪城ホール", "event", "🎤", "コンサート", "18:30", "20:45", 0,
       "https://www.osaka-johall.com/event/", "30〜40代が中心。男女ほぼ半々（見本）"),
    mk("ワントゥワン", "barasi", "🔧", "搬出（バラシ）", "22:00", "", 0,
       "https://onetoone-jp.com/schedule.php", ""),
    mk("リーガロイヤルホテル", "hotel", "🍽", "就任披露・周年記念", "", "21:00", 300, "", "")
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
  const note = "※ これは見た目を決めるための見本です。「推定」の行は見本用の文です。" +
    "ページの読み取りはこれから作ります（[9] の調査結果を見てから）。";
  const msgs = evFitMessages_(day, events, note);
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

/* ============ 客層の見当（推定）============ */
/*
 * ★ここは「推定」であって「実績」ではない。だから必ずそう書いて出す。
 *
 * X（旧Twitter）のハッシュタグを数える案は、調べたうえで採らなかった。
 *   ・検索できるのは有料のAPI（月200ドル〜）だけ。画面をそのまま読む方法は
 *     ログインが要るので、Apps Script からは取れない
 *   ・そもそも、書き込んだ人の年齢・性別は公開されていない。数を数えても
 *     「20代女性が何％」は出てこない（出せば、それは作り話になる）
 *
 * 代わりに、公演名（アーティスト名・催し名）から、世の中で知られている
 * 客層の傾向をAIに答えさせている。知らないものには「不明」と言わせて、
 * 知ったかぶりをさせない。同じ公演を何度も聞かないよう、答えは覚えておく。
 */

/** 覚えておくための名札（公演名から作る） */
function evAudKey_(title) {
  const t = String(title || "").trim();
  if (!t) return "";
  try {
    const b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, t, Utilities.Charset.UTF_8);
    let h = "";
    for (let i = 0; i < 6; i++) h += ("0" + (b[i] & 255).toString(16)).slice(-2);
    return "EVAUD_" + h;
  } catch (e) { return ""; }
}

/**
 * 公演名から、来る人の年代・男女比のおおまかな見当をAIに聞く。
 * 分からなければ空文字を返す（無理に埋めない）。
 */
function evAudienceGuess_(title, venue) {
  const t = String(title || "").trim();
  if (!t || t.length < 2) return "";
  const key = evAudKey_(t);
  const pr = PropertiesService.getScriptProperties();
  if (key) {
    const hit = pr.getProperty(key);
    if (hit !== null) return hit === "-" ? "" : hit;   // "-" は「聞いたけど分からなかった」印
  }

  let apiKey = "", model = "";
  try {
    if (typeof getGeminiKey_ !== "function") return "";
    apiKey = getGeminiKey_();
    model  = (typeof getGeminiModel_ === "function") ? getGeminiModel_() : "gemini-3.1-flash-lite";
  } catch (e) { return ""; }
  if (!apiKey) return "";

  const prompt =
    "次の催しに来る人の、年代と男女のおおよその比率を答えてください。\n" +
    "催し：「" + t + "」" + (venue ? "（会場：" + venue + "）" : "") + "\n" +
    "決まり：\n" +
    "・知らない催し・アーティストなら、推測せず「不明」とだけ答える\n" +
    "・分かる場合だけ、35文字以内の1行で答える（例：20〜30代女性が中心。男女比おおよそ2:8）\n" +
    "・前置き、言い訳、記号、改行は書かない";

  let out = "";
  try {
    const res = UrlFetchApp.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model +
      ":generateContent?key=" + encodeURIComponent(apiKey),
      { method: "post", contentType: "application/json", muteHttpExceptions: true,
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    if (res.getResponseCode() === 200) {
      out = String(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text || "").trim();
    }
  } catch (e) { if (typeof logErr_ === "function") logErr_("evAudience", e); }

  out = out.replace(/[\r\n]+/g, " ").slice(0, 60);
  if (!out || out.indexOf("不明") === 0) out = "";
  if (key) { try { pr.setProperty(key, out || "-"); } catch (e) {} }
  return out;
}


/* ============ ホテルの資料（LINEに送られた画像）============ */
/*
 * 帝国ホテル・リーガロイヤルの宴会予定は、FAXで届く社内の紙なので
 * ホームページには無い。グループLINEに写真を送ってもらって読み取る。
 *
 * ★ここがいちばん気をつけたところ。
 *   いまの決まりでは「画像＝オプチャのスクショ」なので、そのままだと
 *   ホテルの資料がオプチャの乗車記録として書き込まれてしまう。
 *   取り違えないように、二段構えにしてある。
 *     ①「ホテル」と打ってから写真を送る（打った人の合図が最優先）
 *     ② 合図が無くても、オプチャの記録が1件も読めなかったときだけ
 *        ホテルの資料として読み直す（ふつうのオプチャ画像には触れない）
 */

const EV_HOTEL_PROMPT =
  "これはホテルの宴会・催事の予定表（社内資料やFAXの紙）の写真です。\n" +
  "写っている予定を全部抜き出してください。\n" +
  "出力は JSON の配列だけ。前置きも説明も書かないでください。\n" +
  "各要素の形:\n" +
  '{"date":"9/16","hotel":"帝国ホテル","name":"催しの名前","room":"会場名","start":"18:00","end":"20:30","people":300}\n' +
  "・date は月/日。年は書かない。日付が1つだけ大きく書いてあるなら、全部それを使う\n" +
  "・hotel は「帝国ホテル」か「リーガロイヤルホテル」。紙に書いていなければ空文字\n" +
  "・start は開始、end は終了。片方しか無ければもう片方は空文字\n" +
  "・people は人数の数値だけ。書いていなければ null\n" +
  "・宴会・催事でないもの（レストランの営業案内など）は含めない\n" +
  "・1件も無ければ [] だけを返す";

/** 写真をホテルの資料として読む。戻り値は読み取れた予定の配列 */
function evHotelFromImage_(messageId) {
  if (!messageId) throw new Error("画像のIDが取れませんでした");
  if (typeof geminiReady_ !== "function" || typeof getToken_ !== "function") {
    throw new Error("001-Code が古いので読み取れません");
  }
  const g = geminiReady_();

  const res = UrlFetchApp.fetch(
    "https://api-data.line.me/v2/bot/message/" + encodeURIComponent(messageId) + "/content",
    { headers: { "Authorization": "Bearer " + getToken_() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error("画像を取得できませんでした（" + res.getResponseCode() + "）");
  }
  const blob = res.getBlob();

  const out = UrlFetchApp.fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + g.model +
    ":generateContent?key=" + encodeURIComponent(g.key),
    { method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ parts: [
        { text: EV_HOTEL_PROMPT },
        { inline_data: { mime_type: blob.getContentType() || "image/jpeg",
                         data: Utilities.base64Encode(blob.getBytes()) } }
      ]}]})});
  if (out.getResponseCode() !== 200) throw new Error("AIが読めませんでした（" + out.getResponseCode() + "）");

  let text = "";
  try { text = JSON.parse(out.getContentText()).candidates[0].content.parts[0].text; }
  catch (e) { throw new Error("AIの返事を読めませんでした"); }
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr;
  try { arr = JSON.parse(m[0]); } catch (e) { return []; }
  return Array.isArray(arr) ? arr : [];
}

/** "9/16" と基準日から、その年の日付を決める（年またぎも見る） */
function evHotelDate_(md, base) {
  const m = String(md || "").match(/(\d{1,2})\s*[\/月]\s*(\d{1,2})/);
  if (!m) return new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const mo = parseInt(m[1], 10) - 1, da = parseInt(m[2], 10);
  let y = base.getFullYear();
  // 12月に「1/3」と書いてあれば翌年、1月に「12/30」と書いてあれば前年
  if (base.getMonth() === 11 && mo === 0) y += 1;
  if (base.getMonth() === 0  && mo === 11) y -= 1;
  return new Date(y, mo, da);
}

/** 日付の名札（覚えておくときの鍵） */
function evHotelKey_(d) {
  return "EVH_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

/**
 * 読み取った予定を、日付ごとに覚えておく。
 * 同じ予定を二度書かない（同じホテル・同じ名前・同じ開始時刻なら1つ）。
 * 戻り値は「何件しまったか」。
 */
function evHotelSave_(list, base) {
  const pr = PropertiesService.getScriptProperties();
  const byDay = {};
  (list || []).forEach(function (x) {
    const d = evHotelDate_(x.date, base);
    const k = evHotelKey_(d);
    (byDay[k] = byDay[k] || []).push(x);
  });

  let wrote = 0;
  for (const k in byDay) {
    let cur = [];
    try { cur = JSON.parse(pr.getProperty(k) || "[]"); } catch (e) { cur = []; }
    const seen = {};
    cur.forEach(function (x) { seen[(x.hotel || "") + "|" + (x.name || "") + "|" + (x.start || "")] = 1; });
    byDay[k].forEach(function (x) {
      const id = (x.hotel || "") + "|" + (x.name || "") + "|" + (x.start || "");
      if (seen[id]) return;
      seen[id] = 1;
      cur.push(x);
      wrote++;
    });
    try { pr.setProperty(k, JSON.stringify(cur.slice(0, 40))); } catch (e) {}
  }
  return wrote;
}

/** その日のホテルの予定を、イベントの形にして返す */
function evHotelForDay_(d) {
  let list = [];
  try { list = JSON.parse(PropertiesService.getScriptProperties().getProperty(evHotelKey_(d)) || "[]"); }
  catch (e) { list = []; }
  return list.map(function (x) {
    const hotel = String(x.hotel || "").indexOf("帝国") >= 0 ? "帝国ホテル"
                : String(x.hotel || "") ? "リーガロイヤルホテル" : "ホテル";
    const title = [x.name, x.room].filter(String).join("／");
    return { venue: hotel, kind: "hotel", icon: "🍽", title: title,
             start: String(x.start || ""), end: String(x.end || ""),
             people: Number(x.people) > 0 ? Number(x.people) : 0, url: "" };
  });
}

/**
 * 写真を「ホテルの資料」として読んで、しまって、返事の文を作る。
 * 読めなければ空文字を返す（＝ホテルの資料ではなかった）。
 */
function evHotelTry_(messageId, base) {
  let list = [];
  try { list = evHotelFromImage_(messageId); }
  catch (e) { if (typeof logErr_ === "function") logErr_("evHotelTry", e); return ""; }
  if (!list.length) return "";
  const n = evHotelSave_(list, base || new Date());
  const lines = list.slice(0, 8).map(function (x) {
    const when = [x.start, x.end].filter(String).join("〜") || "時間不明";
    return "・" + [x.date, x.hotel, x.name].filter(String).join(" ") + "　" + when +
           (Number(x.people) > 0 ? "　" + Number(x.people).toLocaleString() + "人" : "");
  });
  return "🍽 ホテルの予定として読み取りました（" + n + "件）\n" + lines.join("\n") +
         (list.length > 8 ? "\n…ほか" + (list.length - 8) + "件" : "") +
         "\n\n※ 乗車記録には入れていません。当日16:45のイベント案内に出ます。";
}

/** 「ホテル」と打ったときの合図を覚える（15分だけ） */
function evHotelHintSet_(userId) {
  try { CacheService.getScriptCache().put("EVKIND_" + (userId || "anon"), "hotel", 900); } catch (e) {}
}

/** 合図が出ているか（1回見たら消す） */
function evHotelHintGet_(userId) {
  try {
    const c = CacheService.getScriptCache();
    const k = "EVKIND_" + (userId || "anon");
    const v = c.get(k);
    if (v) { c.remove(k); return true; }
  } catch (e) {}
  return false;
}

/**
 * 「ホテル」「↑ホテル」と打たれたときの受け口。
 * 001-Code の文字の処理から呼ばれる。扱ったら true を返す。
 */
function evHandleNote_(ev, sentAt) {
  const t = String((ev.message && ev.message.text) || "").trim();
  if (!/^[↑↓]?\s*(ホテル|ほてる)\s*$/.test(t)) return false;
  const uid = (ev.source && ev.source.userId) || "anon";
  const reply = ev.replyToken || "";

  if (t.charAt(0) === "↑") {
    // 先に写真を送ってしまったとき用。直前の写真を読み直す
    let mid = "";
    try { mid = CacheService.getScriptCache().get("LASTIMG_" + uid) || ""; } catch (e) {}
    if (!mid) {
      if (typeof lineReply_ === "function") lineReply_(reply, "直前の写真が見つかりませんでした。もう一度送ってください。");
      return true;
    }
    const msg = evHotelTry_(mid, sentAt || new Date());
    if (typeof lineReply_ === "function") {
      lineReply_(reply, msg || "ホテルの予定としては読み取れませんでした。");
    }
    return true;
  }

  evHotelHintSet_(uid);
  if (typeof lineReply_ === "function") {
    lineReply_(reply, "🍽 つぎに送る写真は、ホテルの予定として読みます（15分以内）。\n" +
                      "乗車記録には入れません。");
  }
  return true;
}

/**
 * 写真が来たときの受け口。合図が出ていればホテルとして読む。
 * 扱ったら true（＝オプチャとしては読まない）。
 */
function evHandleImage_(ev, sentAt) {
  const uid = (ev.source && ev.source.userId) || "anon";
  if (!evHotelHintGet_(uid)) return false;
  const mid = (ev.message && ev.message.id) || "";
  try { CacheService.getScriptCache().put("LASTIMG_" + uid, mid, 3600); } catch (e) {}
  const msg = evHotelTry_(mid, sentAt || new Date());
  if (typeof lineReply_ === "function") {
    lineReply_(ev.replyToken || "",
      msg || "ホテルの予定としては読み取れませんでした。もう一度、明るいところで撮ってみてください。");
  }
  return true;
}


/* ============ その日の分をそろえる ============ */

/** イベント1件に、実績・推定・助言を足す */
function evDecorate_(e) {
  const v = EV_VENUES[e.venue] || {};
  const st = evPlaceStats_(v.near, EV_FROM_HOUR, EV_TO_HOUR);
  const c = {};
  for (const k in e) c[k] = e[k];
  c.stats  = evStatsLine_(st) || "自社の記録：この乗り場の記録はまだありません";
  c.advice = evAdvice_(e.venue, e.end, st);
  try { c.guess = evAudienceGuess_(e.title, e.venue); } catch (err) { c.guess = ""; }
  return c;
}

/**
 * その日に出すイベントをそろえる。
 *
 * いまのところ、確かに取れるのは「LINEで送ってもらったホテルの資料」だけ。
 * ホームページの読み取りは [9] の調査結果を見てから作る。
 * 作ったら evScrapeAll_ という名前で足せば、ここが勝手に拾う。
 */
function evTodayEvents_(day) {
  let out = [];
  try { out = out.concat(evHotelForDay_(day)); } catch (e) { if (typeof logErr_ === "function") logErr_("evHotel", e); }
  if (typeof evScrapeAll_ === "function") {
    try { out = out.concat(evScrapeAll_(day) || []); } catch (e) { if (typeof logErr_ === "function") logErr_("evScrape", e); }
  }
  return out.filter(evInTimeRange_).filter(evBigEnough_).map(evDecorate_);
}


/* ============ 毎日16:45の自動発信 ============ */
/*
 * ★グループに出ていくものなので、いちばん厳しくしてある。
 *   ・スイッチが「はい」のときしか送らない（はじめは切ってある）
 *   ・その日の分が1件も無ければ、1通も送らない（空の通知で鳴らさない）
 *   ・同じ日に二度送らない（送った印を残す）
 *   ・送り先が分からなければ送らない。友だち全員への配信は絶対にしない
 */

/** 自動発信が入っているか */
function evAutoOn_() {
  const p = PropertiesService.getScriptProperties().getProperty("EV_AUTO");
  if (p === "1") return true;
  if (p === "0") return false;
  try { if (typeof cfg_ === "function") return cfg_("イベント情報を自動で送る") === "はい"; } catch (e) {}
  return false;                       // 何も決まっていなければ「送らない」
}

/** 自動発信の入切（true で入、false で切） */
function evAutoSet_(on) {
  PropertiesService.getScriptProperties().setProperty("EV_AUTO", on ? "1" : "0");
  if (on) ensureEventDailyTrigger_(false);
  return on;
}

/** 「もう今日は送った」の印 */
function evSentKey_(d) {
  return "EVSENT_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

/**
 * 5分おきに呼ばれて、16:45 を過ぎていたらその日の分を1回だけ送る。
 *
 * Apps Script の「毎日この時刻」は前後に30分ほどずれることがあるため、
 * 5分おきに時計を見る形にしてある（16:45〜16:50 に届く）。
 */
function eventDailyJob() {
  let lock = null;
  try {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;
  } catch (e) { lock = null; }
  try {
    if (!evAutoOn_()) return;

    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const from = EV_SEND_HOUR * 60 + EV_SEND_MIN;
    if (mins < from || mins > from + EV_SEND_WINDOW) return;

    const pr = PropertiesService.getScriptProperties();
    const key = evSentKey_(now);
    if (pr.getProperty(key)) return;                    // その日はもう済んでいる

    const events = evTodayEvents_(now);
    if (!events.length) { pr.setProperty(key, "none"); return; }   // 無い日は送らない

    const to = evGroupTarget_();
    if (!to) {
      if (typeof logErr_ === "function") logErr_("eventDaily", new Error("グループの送り先が分かりません"));
      return;                                            // 印は残さない（分かったら送れるように）
    }
    if (typeof lrPush_ !== "function") return;
    lrPush_(to, evFitMessages_(now, events, ""));
    pr.setProperty(key, "1");
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("eventDaily", e);
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (e) {} }
  }
}

/** 5分おきの見張りを用意する（重ねて作らない） */
function ensureEventDailyTrigger_(force) {
  let list = [];
  try { list = ScriptApp.getProjectTriggers(); } catch (e) { return false; }
  let keep = null;
  list.forEach(function (t) {
    if (t.getHandlerFunction() !== "eventDailyJob") return;
    if (keep || force) { try { ScriptApp.deleteTrigger(t); } catch (e) {} }
    else keep = t;
  });
  if (keep && !force) return true;
  try {
    ScriptApp.newTrigger("eventDailyJob").timeBased().everyMinutes(5).create();
    return true;
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("evTrigger", e);
    return false;
  }
}

/** いまの状態を、そのまま読める文にする */
function evAutoStatusText_() {
  const L = [];
  const on = evAutoOn_();
  L.push(on ? "✅ 自動発信：入っています" : "⏸ 自動発信：切ってあります");
  L.push("送る時刻：毎日 " + EV_SEND_HOUR + ":" + ("0" + EV_SEND_MIN).slice(-2) +
         "（実際に届くのは " + EV_SEND_HOUR + ":" + ("0" + EV_SEND_MIN).slice(-2) +
         "〜" + EV_SEND_HOUR + ":" + ("0" + (EV_SEND_MIN + 5)).slice(-2) + "ごろ）");
  L.push("その日に出すものが1件も無ければ、1通も送りません");

  let has = false;
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === "eventDailyJob") has = true;
    });
  } catch (e) {}
  L.push(has ? "時計の見張り：✅ できています" : "時計の見張り：❌ ありません（入にすると作られます）");

  const to = evGroupTarget_();
  L.push(to ? "送り先：✅ グループを覚えています" : "送り先：❌ 分かりません（グループLINEに何か1つ投稿すると覚えます）");

  const today = evTodayEvents_(new Date());
  L.push("きょう出せるもの：" + today.length + "件" +
         (today.length ? "（" + today.map(function (e) { return e.venue; }).join("・") + "）" : ""));
  if (typeof evScrapeAll_ !== "function") {
    L.push("※ ホームページの読み取りはまだ作っていません。いまはLINEで送ったホテルの資料だけが出ます。");
  }
  return L.join("\n");
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
 * きょう16:45に出るはずのものを、そのまま自分のLINEにだけ送ってみる（テスト）。
 * グループに出す前に、本物と同じ中身を自分の目で確かめられる。
 */
function menuEventTestSend() {
  const err = evSendTodayToMe();
  const n = evTodayEvents_(new Date()).length;
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🧪 イベント情報のテスト送信",
      err ? "送れませんでした：\n" + err
          : "まーく個人のLINEにだけ送りました（きょうの分：" + n + "件）。\n" +
            "グループには送っていません。",
      ui.ButtonSet.OK);
  } catch (e) {}
  return err ? "❌ " + err
             : "🧪 きょうの分（" + n + "件）を、まーく個人のLINEにだけ送りました（グループには送っていません）";
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


/* ============ 自動発信の入切（ボタン・メニュー）============ */

/**
 * そうさボタン [11] の中身。
 *
 * ★グループに出ていくものを入切するボタンなので、1回押しただけでは変わらない。
 *   1回目は、いまの状態を見せるだけ。
 *   3分以内にもう一度チェックしたときに、はじめて切り替わる。
 *   （[5] のグループ送信と同じ決まりにしてある）
 */
function panelEventAuto() {
  const c = CacheService.getScriptCache();
  const on = evAutoOn_();
  const want = on ? "切る" : "入れる";

  if (c.get("EV_AUTO_STEP") === (on ? "off" : "on")) {
    c.remove("EV_AUTO_STEP");
    evAutoSet_(!on);
    return (on ? "⏸ 自動発信を切りました。"
               : "✅ 自動発信を入れました。") +
      "\n\n" + evAutoStatusText_();
  }

  c.put("EV_AUTO_STEP", on ? "off" : "on", 180);
  return evAutoStatusText_() +
    "\n\n──────\n" +
    "▶ " + want + "には、3分以内にもう一度チェックしてください。\n" +
    "（1回押しただけでは変わりません。グループに出ていくものなので、わざと2回にしています）";
}

/** メニューから、自動発信の状態を見る／入切する */
function menuEventAuto() {
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return evAutoStatusText_(); }
  const res = ui.alert("🎪 イベント情報の自動発信",
    evAutoStatusText_() + "\n\n──────────\n「はい」で入れます。「いいえ」で切ります。",
    ui.ButtonSet.YES_NO_CANCEL);
  if (res === ui.Button.YES) {
    evAutoSet_(true);
    ui.alert("✅ 入れました", evAutoStatusText_(), ui.ButtonSet.OK);
    return "✅ 入れました";
  }
  if (res === ui.Button.NO) {
    evAutoSet_(false);
    ui.alert("⏸ 切りました", evAutoStatusText_(), ui.ButtonSet.OK);
    return "⏸ 切りました";
  }
  return "そのままにしました";
}

/**
 * 「きょう送るはずのもの」を、自分のLINEにだけ送ってみる。
 * グループに出す前に、中身を自分の目で確かめるための道。
 */
function evSendTodayToMe() {
  const day = new Date();
  const events = evTodayEvents_(day);
  const to = evTestTarget_();
  if (!to) return "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  if (typeof lrPush_ !== "function") return "003-LineReport が古いので送れません";
  const note = "※ これはテスト送信です（まーく個人のみ）。グループには送っていません。";
  try {
    lrPush_(to, evFitMessages_(day, events, note));
    return "";
  } catch (e) { return (e && e.message ? e.message : String(e)); }
}
