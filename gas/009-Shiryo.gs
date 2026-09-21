/**
 * ================================================================
 *  イベント参考資料（009-Shiryo.gs）
 *
 *  ★★★  S001ver  （2026/09/21）  ★★★
 *
 *  [S001ver]
 *   ・📊 イベントごとの参考資料スプシを作るようにした（ご指示）
 *     ★アーティストの公式ページ・客層・自社の実績を1か所にまとめ、
 *       その場で判断できるようにします。
 *
 *  ★★ いちばん大事な決まり ★★
 *
 *  **作り話でグラフを作らない。**
 *
 *  グラフにしてよいのは、数えられるもの（自社の記録）だけです。
 *  AIに聞いた「客層の見当」は、数えたものではありません。
 *  それを円グラフにすると、根拠のない数字が
 *  「20代女性 45%」のような、いかにも正確そうな姿で独り歩きします。
 *  上の人に見せる資料で、それは絶対に通りません。
 *
 *  なので、このスプシは はっきり2つに分けます。
 *    ・実績 … 自社の記録を数えたもの。グラフにする
 *    ・推定 … AIの見当。文字だけ。グラフにしない
 *
 *  ★数えた母数（何件のうち何件か）も、かならず書きます。
 *    1件の記録から作った円グラフは、100%と0%にしかなりません。
 *    それは「分かった」ではなく「分かっていない」ことの表れです。
 * ================================================================ */

/** このファイルのバージョン（先頭の ★★★ と必ずそろえる） */
const SH_VERSION = "S001ver";

/** 参考資料スプシを覚えておく名札と、その題 */
const SH_SS_KEY  = "SH_SHIRYO_SS";
const SH_SS_NAME = "📊 イベント参考資料";

/** 円グラフを出してよい、いちばん少ない件数 */
const SH_PIE_MIN = 5;
/** 棒グラフを出してよい、いちばん少ない件数 */
const SH_BAR_MIN = 3;

/** 記録用スプシの列（0から数える）。vnPlaceStats_ と同じ並び */
const SH_COL_WAIT  = 3;   // 待ち時間
const SH_COL_TIME  = 4;   // 乗せた時刻
const SH_COL_PRICE = 5;   // 料金
const SH_COL_PLACE = 6;   // 乗り場
const SH_COL_MEMO1 = 7;   // 備考
const SH_COL_MEMO2 = 8;   // 備考（つづき）

/** 参考資料スプシを開く。無ければ作る */
function shBook_() {
  const pr = PropertiesService.getScriptProperties();
  const id = pr.getProperty(SH_SS_KEY) || "";
  if (id) {
    try { return SpreadsheetApp.openById(id); }
    catch (e) { /* 消された・開けない。下で作り直す */ }
  }
  const ss = SpreadsheetApp.create(SH_SS_NAME);
  pr.setProperty(SH_SS_KEY, ss.getId());
  return ss;
}

/* ================================================================
 *  自社の記録を数える（ここだけが「確かな数字」）
 * ================================================================ */

/**
 * その乗り場の記録を、細かく数える。
 *
 * ★vnPlaceStats_ は合計しか返しません。
 *   グラフにするには、時間帯ごと・年代ごとの内訳が要ります。
 *   数えるもとは同じ（記録用スプシの各自のタブ）です。
 *
 * names … 乗り場の名前（会場の近くのもの）
 */
function shCollect_(names) {
  const out = {
    n: 0, sum: 0, max: 0,
    waitSum: 0, waitN: 0,
    byHour: {},          // 時間帯（時） → { n, sum }
    byAge: {},           // 「20代」 → 件数
    bySex: {},           // 「男性」「女性」 → 件数
    byPlace: {},         // 乗り場 → { n, sum }
    memoN: 0,            // 備考に人のことが書いてあった件数（＝客層の母数）
    spots: (names || []).slice(0, 6)
  };
  let ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return out; }
  if (!ss || !names || !names.length) return out;

  const want = names.map(function (n) { return String(n).replace(/[\s　]/g, ""); });
  const tabs = (typeof PERSONAL_TABS !== "undefined") ? PERSONAL_TABS : [];

  tabs.forEach(function (tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() < 4) return;
    const n = sh.getLastRow() - 3;
    let vals, disp;
    try {
      vals = sh.getRange(4, 1, n, 11).getValues();
      disp = sh.getRange(4, 1, n, 11).getDisplayValues();
    } catch (e) { return; }

    for (let r = 0; r < n; r++) {
      const place = String(vals[r][SH_COL_PLACE] || "").replace(/[\s　\n]/g, "");
      if (!place) continue;
      let hitName = "";
      for (let i = 0; i < want.length; i++) {
        if (place.indexOf(want[i]) !== -1) { hitName = want[i]; break; }
      }
      if (!hitName) continue;

      const price = parseInt(String(vals[r][SH_COL_PRICE]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(price) || price <= 0) continue;

      out.n++; out.sum += price;
      if (price > out.max) out.max = price;

      if (!out.byPlace[hitName]) out.byPlace[hitName] = { n: 0, sum: 0 };
      out.byPlace[hitName].n++; out.byPlace[hitName].sum += price;

      const w = parseInt(String(vals[r][SH_COL_WAIT]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(w) && w > 0) { out.waitSum += w; out.waitN++; }

      let h = null;
      try {
        if (typeof vnHourOf_ === "function") h = vnHourOf_(String(disp[r][SH_COL_TIME] || ""));
      } catch (e) { h = null; }
      if (h !== null) {
        if (!out.byHour[h]) out.byHour[h] = { n: 0, sum: 0 };
        out.byHour[h].n++; out.byHour[h].sum += price;
      }

      /*
       * ★客層は「備考に書いてあったものだけ」です。
       *   書いてある件数（母数）を必ず数えます。
       *   30件のうち3件にしか書いていないのに
       *   「女性が67%」と出すのは、うそに近い言い方です。
       */
      const memo = String(vals[r][SH_COL_MEMO1] || "") + " " + String(vals[r][SH_COL_MEMO2] || "");
      let wrote = false;
      if (/男性|男の/.test(memo)) { out.bySex["男性"] = (out.bySex["男性"] || 0) + 1; wrote = true; }
      if (/女性|女の/.test(memo)) { out.bySex["女性"] = (out.bySex["女性"] || 0) + 1; wrote = true; }
      const age = memo.match(/(\d0)\s*代/);
      if (age) { out.byAge[age[1] + "代"] = (out.byAge[age[1] + "代"] || 0) + 1; wrote = true; }
      if (wrote) out.memoN++;
    }
  });
  return out;
}

/* ================================================================
 *  アーティストのリンク
 * ================================================================ */

/**
 * 公演名から、アーティストの名前らしいところを取り出す。
 *
 * ★「〇〇 LIVE TOUR 2026」の「LIVE TOUR 2026」は要りません。
 *   検索に付けると、かえって見つからなくなります。
 */
function shArtistName_(title) {
  let t = String(title == null ? "" : title).trim();
  if (!t) return "";
  // 全角の記号を、区切りとして扱う
  t = t.replace(/[『』「」【】〈〉《》]/g, " ");
  // ツアー名・公演回などを落とす
  t = t.replace(/\b(LIVE|TOUR|CONCERT|ARENA|DOME|HALL|FES(TIVAL)?|ZEPP)\b/gi, " ");
  t = t.replace(/(ライブ|ツアー|コンサート|公演|来日|追加|大阪|day\s*\d+)/gi, " ");
  t = t.replace(/\b(19|20)\d{2}\b/g, " ");            // 年
  t = t.replace(/[～~\-–—:：\/|]+/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 40);
}

/**
 * アーティストの手がかりリンクを作る。
 *
 * ★ここは、はっきりさせておかなければいけません。
 *   「公式ページのURL」を、こちらが知っているわけではありません。
 *   知らないものを「公式」と言って出すのは、いちばんやってはいけないことです。
 *   だから出すのは「探しに行く入り口」です。そう書いて出します。
 *
 * ★会場のページに本人へのリンクが載っていれば、それは確かなものなので
 *   「会場ページに載っていたリンク」として、別に出します。
 */
function shArtistLinks_(title, venueUrl) {
  const name = shArtistName_(title);
  const out = [];
  if (!name) return out;
  const q = encodeURIComponent(name);
  out.push({ label: "名前で探す（Google）", sure: false,
             url: "https://www.google.com/search?q=" + q });
  out.push({ label: "公式サイトを探す", sure: false,
             url: "https://www.google.com/search?q=" + q + "+" + encodeURIComponent("公式サイト") });
  out.push({ label: "X（旧Twitter）で探す", sure: false,
             url: "https://x.com/search?q=" + q });
  out.push({ label: "動画で見る（YouTube）", sure: false,
             url: "https://www.youtube.com/results?search_query=" + q });
  if (venueUrl) {
    out.push({ label: "会場のページ（確かなもの）", sure: true, url: String(venueUrl) });
  }
  return out;
}

/* ================================================================
 *  タブを書く
 * ================================================================ */

/** 1つのタブを、まるごと書き直す。古い説明が下に残らないように */
function shWriteTab_(ss, name, rows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  try { sh.getCharts().forEach(function (c) { sh.removeChart(c); }); } catch (e) {}
  sh.clear();
  if (!rows.length) return sh;
  const w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  const grid = rows.map(function (r) {
    const a = r.slice();
    while (a.length < w) a.push("");
    return a;
  });
  sh.getRange(1, 1, grid.length, w).setValues(grid);
  sh.setColumnWidth(1, 150);
  for (let c = 2; c <= w; c++) sh.setColumnWidth(c, 110);
  sh.getRange(1, 1, grid.length, w).setWrap(true).setVerticalAlignment("top");
  return sh;
}

/** 見出しの行を、青くする */
function shHead_(sh, row, w) {
  try {
    sh.getRange(row, 1, 1, w).setBackground("#1a73e8").setFontColor("#ffffff")
      .setFontWeight("bold");
  } catch (e) {}
}

/**
 * 目次のタブ。その日のイベントを並べる。
 */
function shTocRows_(day, list) {
  const rows = [];
  const ymd = (day.getMonth() + 1) + "/" + day.getDate();
  rows.push(["📊 イベント参考資料　" + ymd, ""]);
  rows.push(["", ""]);
  rows.push(["この資料の読み方", ""]);
  rows.push(["実績", "自社の記録を数えたもの。グラフにしています"]);
  rows.push(["推定", "AIの見当。数えたものではありません。グラフにしません"]);
  rows.push(["参考", "探しに行く入口。公式と決まったものではありません"]);
  rows.push(["", ""]);
  rows.push(["きょうのイベント", ""]);
  if (!list.length) rows.push(["（ありません）", ""]);
  list.forEach(function (e, i) {
    rows.push([(i + 1) + "．" + String(e.venue || ""),
               String(e.title || "").slice(0, 40)]);
  });
  rows.push(["", ""]);
  rows.push(["作った日時", new Date().toLocaleString("ja-JP")]);
  return rows;
}

/**
 * 実績のタブ。自社の記録を数えたものだけを置く。
 * 戻り値は、グラフを付ける場所の情報。
 */
function shStatsRows_(list, stats) {
  const rows = [];
  rows.push(["■ 実績（自社の記録を数えたもの）", "", "", ""]);
  rows.push(["※ 会場そのものではなく、会場の近くの乗り場の記録です", "", "", ""]);
  rows.push(["", "", "", ""]);

  list.forEach(function (e, i) {
    const st = stats[i] || {};
    rows.push([(i + 1) + "．" + String(e.venue || ""), String(e.title || "").slice(0, 30), "", ""]);
    rows.push(["　数えた乗り場", (st.spots || []).join("・") || "（決めていません）", "", ""]);
    if (!st.n) {
      rows.push(["　記録", "まだありません（0件）", "", ""]);
      rows.push(["", "", "", ""]);
      return;
    }
    rows.push(["　件数", st.n + "件", "", ""]);
    rows.push(["　平均", "￥" + Math.round(st.sum / st.n).toLocaleString(), "", ""]);
    rows.push(["　最高", "￥" + st.max.toLocaleString(), "", ""]);
    rows.push(["　待ち時間",
               st.waitN ? Math.round(st.waitSum / st.waitN) + "分（" + st.n + "件中" +
                          st.waitN + "件に記入）"
                        : "書いてある記録がありません", "", ""]);
    rows.push(["", "", "", ""]);
  });
  return rows;
}

/** 時間帯の表（棒グラフのもと）。行は [時, 件数, 平均] */
function shHourTable_(st) {
  const out = [["時間帯", "件数", "平均（円）"]];
  const keys = Object.keys(st.byHour || {}).map(Number).sort(function (a, b) { return a - b; });
  keys.forEach(function (h) {
    const v = st.byHour[h];
    out.push([("0" + (h % 24)).slice(-2) + "時台", v.n, Math.round(v.sum / v.n)]);
  });
  return out;
}

/** 年代の表（円グラフのもと）。行は [年代, 件数] */
function shAgeTable_(st) {
  const out = [["年代", "件数"]];
  Object.keys(st.byAge || {}).sort().forEach(function (k) {
    out.push([k, st.byAge[k]]);
  });
  return out;
}

/** 男女の表（円グラフのもと） */
function shSexTable_(st) {
  const out = [["男女", "件数"]];
  Object.keys(st.bySex || {}).forEach(function (k) { out.push([k, st.bySex[k]]); });
  return out;
}

/**
 * グラフを1つ足す。
 *
 * ★件数が少なすぎるときは、グラフを作りません。
 *   1件から作った円グラフは 100% にしかならず、
 *   「たくさん調べた結果」に見えてしまいます。いちばん危ない見え方です。
 */
function shAddChart_(sh, kind, row, col, nRows, nCols, title, at) {
  /*
   * ★ここは2つの「少なすぎ」を、取りちがえないようにします。
   *     ① 数えたもとの件数が少なすぎる（母数）
   *     ② グラフの項目が少なすぎる（1本しかない棒、1切れしかない円）
   *   ①は呼ぶ側で見ます（そこにしか母数の数字が無いので）。
   *   ここで見るのは②だけです。
   *   前はここで①の数字（5件）を項目数と比べていて、
   *   記録が6件あってもグラフが1つも出ませんでした。
   */
  if (nRows - 1 < 2) return false;
  try {
    const b = sh.newChart()
      .addRange(sh.getRange(row, col, nRows, nCols))
      .setPosition(at.row, at.col, 0, 0)
      .setOption("title", title)
      .setOption("width", 380)
      .setOption("height", 240);
    if (kind === "pie") b.setChartType(Charts.ChartType.PIE);
    else b.setChartType(Charts.ChartType.COLUMN);
    sh.insertChart(b.build());
    return true;
  } catch (e) { return false; }
}

/* ================================================================
 *  組み立て
 * ================================================================ */

/**
 * その日の参考資料を作り直す。
 * list … [{venue, title, url, near:[乗り場名]}]
 */
function shBuild_(day, list) {
  const d = day || new Date();
  const evs = (list || []).slice(0, 8);      // 1日にそんなに多くはない。多すぎても読めない
  const ss = shBook_();

  // それぞれの会場について、自社の記録を数える
  const stats = evs.map(function (e) {
    let near = e.near;
    if (!near || !near.length) {
      try {
        const v = (typeof VN_VENUES !== "undefined") ? VN_VENUES[e.venue] : null;
        near = (v && v.near) ? v.near : [];
      } catch (err) { near = []; }
    }
    try { return shCollect_(near); } catch (err) { return { n: 0, spots: near || [] }; }
  });

  /* ---- 目次 ---- */
  shWriteTab_(ss, "目次", shTocRows_(d, evs));
  try { shHead_(ss.getSheetByName("目次"), 1, 2); } catch (e) {}

  /* ---- 実績（グラフあり） ---- */
  const stRows = shStatsRows_(evs, stats);
  const stSh = shWriteTab_(ss, "実績", stRows);
  try { shHead_(stSh, 1, 4); } catch (e) {}

  // 時間帯の表とグラフを、下に足す
  let at = stRows.length + 2;
  evs.forEach(function (e, i) {
    const st = stats[i] || {};
    if (!st.n) return;
    const tbl = shHourTable_(st);
    try {
      stSh.getRange(at, 1, 1, 1).setValue("■ " + (i + 1) + "．" + e.venue + "　時間帯べつ（実績）");
      stSh.getRange(at, 1, 1, 3).setBackground("#e8f0fe").setFontWeight("bold");
      stSh.getRange(at + 1, 1, tbl.length, 3).setValues(tbl);
    } catch (err) {}
    // ★母数（記録の件数）が少なすぎるときは、グラフにしません
    if (st.n >= SH_BAR_MIN) {
      shAddChart_(stSh, "bar", at + 1, 1, tbl.length, 2,
                  e.venue + "　時間帯べつの件数（自社の記録 " + st.n + "件）",
                  { row: at + 1, col: 5 });
    }
    at += tbl.length + 14;
  });

  /* ---- 客層 ---- */
  const kRows = [];
  kRows.push(["■ 客層", "", "", ""]);
  kRows.push(["※ 実績＝備考に書いてあった記録を数えたもの", "", "", ""]);
  kRows.push(["※ 推定＝AIの見当。数えたものではありません", "", "", ""]);
  kRows.push(["", "", "", ""]);
  const kSh = shWriteTab_(ss, "客層", kRows);
  try { shHead_(kSh, 1, 4); } catch (e) {}

  let kAt = kRows.length + 1;
  evs.forEach(function (e, i) {
    const st = stats[i] || {};
    try {
      kSh.getRange(kAt, 1).setValue((i + 1) + "．" + e.venue + "　" +
                                    String(e.title || "").slice(0, 30));
      kSh.getRange(kAt, 1, 1, 4).setBackground("#e8f0fe").setFontWeight("bold");
    } catch (err) {}
    kAt++;

    /*
     * ★母数を、いちばん先に書きます。
     *   「30件のうち3件にしか書いていない」と分かって はじめて、
     *   その内訳を どれくらい信じてよいかが決まります。
     */
    const memoN = st.memoN || 0;
    try {
      kSh.getRange(kAt, 1).setValue("実績の母数");
      kSh.getRange(kAt, 2).setValue(
        (st.n || 0) + "件のうち " + memoN + "件に、人のことが書いてありました");
      kAt++;
    } catch (err) {}

    if (memoN >= SH_PIE_MIN) {
      const sex = shSexTable_(st), age = shAgeTable_(st);
      try {
        kSh.getRange(kAt, 1, sex.length, 2).setValues(sex);
        kSh.getRange(kAt, 4, age.length, 2).setValues(age);
      } catch (err) {}
      shAddChart_(kSh, "pie", kAt, 1, sex.length, 2,
                  e.venue + "　男女（自社の記録 " + memoN + "件）", { row: kAt, col: 7 });
      shAddChart_(kSh, "pie", kAt, 4, age.length, 2,
                  e.venue + "　年代（自社の記録 " + memoN + "件）", { row: kAt + 13, col: 7 });
      kAt += Math.max(sex.length, age.length) + 14;
    } else {
      try {
        kSh.getRange(kAt, 1).setValue("実績のグラフ");
        kSh.getRange(kAt, 2).setValue(
          "作りません（" + memoN + "件では少なすぎて、割合に意味がありません）");
      } catch (err) {}
      kAt += 2;
    }

    // 推定は、文字だけ。グラフにはしない
    let guess = "";
    try {
      if (typeof vnTopicInfo_ === "function") {
        const ti = vnTopicInfo_(e.title, e.venue);
        guess = (ti && ti.audience) ? ti.audience : "";
      }
    } catch (err) {}
    try {
      kSh.getRange(kAt, 1).setValue("推定（AIの見当）");
      kSh.getRange(kAt, 2).setValue(guess || "分かりませんでした");
      kSh.getRange(kAt, 1, 1, 4).setBackground("#fff8e1");
      kAt += 2;
    } catch (err) {}
  });

  /* ---- 参考（リンク） ---- */
  const pRows = [];
  pRows.push(["■ 参考（探しに行く入口）", "", ""]);
  pRows.push(["※ 「探す」は検索の入口です。公式と決まったものではありません", "", ""]);
  pRows.push(["", "", ""]);
  evs.forEach(function (e) {
    pRows.push([String(e.venue || ""), String(e.title || "").slice(0, 30), ""]);
    const name = shArtistName_(e.title);
    pRows.push(["　読み取った名前", name || "（読み取れませんでした）", ""]);
    shArtistLinks_(e.title, e.url).forEach(function (L) {
      pRows.push(["　" + (L.sure ? "◎ " : "　") + L.label, L.url, ""]);
    });
    pRows.push(["", "", ""]);
  });
  const pSh = shWriteTab_(ss, "参考", pRows);
  try { shHead_(pSh, 1, 3); } catch (e) {}
  try { pSh.setColumnWidth(2, 420); } catch (e) {}

  // はじめにできる空のタブは落とす
  try {
    ["シート1", "Sheet1"].forEach(function (n) {
      const s0 = ss.getSheetByName(n);
      if (s0 && ss.getSheets().length > 1) ss.deleteSheet(s0);
    });
  } catch (e) {}
  try { ss.setActiveSheet(ss.getSheetByName("目次")); } catch (e) {}
  return ss;
}

/**
 * イベント通知に入れる「参考資料」のURL。
 * 作れなければ空文字（通知そのものは、絶対に止めない）。
 */
function shLinkFor_(day, list) {
  try { return shBuild_(day, list).getUrl(); }
  catch (e) {
    try { logErr_("shLink", e); } catch (e2) {}
    return "";
  }
}

/**
 * 「📊」… 参考資料を作り直して、URLを返す（まーくさんだけ）。扱ったら true。
 */
function shHandleCmd_(ev) {
  const t = String((ev && ev.message && ev.message.text) || "").trim()
    .replace(/[\s　️]/g, "");
  if (!/^(📊|参考資料|資料まとめ|客層)$/.test(t)) return false;
  const uid = (ev && ev.source && ev.source.userId) || "";
  const me = (typeof updMe_ === "function") ? updMe_() : "";
  if (!me || uid !== me) return false;
  const reply = (ev && ev.replyToken) || "";

  /*
   * ★きょうの分だけを見ます。
   *   ホームページから読み取ったものと、写真から読んだもの（ホテル・会場）を
   *   合わせて使います。読めなくても、空のまま資料は作ります
   *   （「何も無い」ことが分かるほうが、何も出ないより ずっとよいので）。
   */
  const now = new Date();
  let list = [];
  const add = function (fn) {
    try {
      if (typeof fn === "function") (fn(now) || []).forEach(function (x) { list.push(x); });
    } catch (e) {}
  };
  add(typeof vnScrapeAll_ === "function" ? vnScrapeAll_ : null);
  add(typeof vnHotelForDay_ === "function" ? vnHotelForDay_ : null);
  add(typeof vnHallForDay_ === "function" ? vnHallForDay_ : null);

  let url = "";
  try { url = shBuild_(now, list).getUrl(); } catch (e) { url = ""; }
  if (typeof lineReply_ === "function") {
    lineReply_(reply, url
      ? "📊 イベント参考資料\n" +
        "・タブ：目次／実績／客層／参考\n" +
        "・グラフは、自社の記録だけで作っています\n" +
        "\n" + url
      : "📊 作れませんでした\n・もう一度お試しください");
  }
  return true;
}
