/**
 * ================================================================
 *  天気の記録（007-Tenki.gs）
 *
 *  ★★★  T003ver  （2026/09/21）  ★★★
 *
 *  ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *               W=004-WebApp / U=005-Updater / V=006-Venue / T=007-Tenki
 *  ※記号は、ファイル名の頭文字にそろえています（T=Tenki）。
 *
 *  [T003ver]
 *   ・🔣 似た天気の絵文字でも通るようにした（☀☀️🌞🌤⛅☁☔🌧）
 *     ★☀️のつもりで🌞を送って、何も返らないことがありました
 *
 *  [T002ver]
 *   ・🕕 取りにいく時間帯を 18:00〜翌05:00 にした（ご指示）
 *     ★夜のあいだに何度でも試せるようにしました。
 *       1日でも抜けると、その日の乗車がぜんぶ「天気なし」になります
 *   ・🗓 深夜に取ったぶんは、前の日（営業日）としてためるようにした
 *     ★営業日は 17:00〜翌16:59 です。ここを取りちがえると、
 *       レポートで雨の日と晴れの日が入れかわります
 *   ・🏷 タブ名を「天気」にした（絵文字をやめた）（ご指示）
 *     ★記録用スプシのタブ名は、絵文字なし・全角2文字以内にそろえます
 *
 *  [T001ver]
 *   ・☔ 毎日の天気を、記録用スプシの「天気」タブに自動でためる（まーくさんのご指示）
 *     ★雨の日に動くのは、みんな体で分かっていることです。
 *       でも、それが数字になっていませんでした。
 *       「雨の金曜23時台は平均いくらか」を言えるようにするには、
 *       まず その日が雨だったかどうかを、毎日ためておく必要があります。
 *     ★1日でも抜けると、その日の乗車はぜんぶ「天気なし」になります。
 *       ですので、取りに行くのは1日1回ではなく、
 *       その日のうちに 何度か試します（取れたら、その日はもう試しません）。
 *
 *  ★どこから取るか
 *     気象庁（jma.go.jp）が だれでも使える形で出している予報のデータです。
 *     鍵（APIキー）は要りません。お金もかかりません。
 *       https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json
 *     270000 は大阪府の番号です。
 *
 *  ★「予報」であって「実測」ではありません
 *     夜（20時以降）に取るので、その日の天気としては ほぼ合っています。
 *     ただし、実測ではないことは、資料にも必ず書きます。
 *     （実測は、気象庁のアメダスから取れますが、
 *       10分ごとの細かい数字で、量も多く、いまは そこまで要りません）
 * ================================================================
 */

/*
 * 天気をためるタブの名前。
 *
 * ★記録用スプシのタブ名は「絵文字なし・全角2文字以内」にします
 *   （まーくさんのご指示）。タブが多く、絵文字や長い名前が混ざると
 *   スマホでは タブの行がすぐ埋まって、目当てのものを探せません。
 */
const TK_TAB = "天気";

/** 気象庁の予報データ（大阪府＝270000） */
const TK_URL = "https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json";

/** 大阪市のあるところ（「大阪府」の中の どの区域か） */
const TK_AREA = "大阪";

/** 最後に記録した営業日を覚えておく場所 */
const TK_LAST_KEY = "TK_LAST_YMD";

/*
 * 天気を取りにいく時間帯（まーくさんのご指示）。
 *   18:00 〜 翌05:00
 *
 * ★夜のうちに取ります。昼に取ると、その日の天気がまだ決まっていません。
 * ★朝5時まで試すのは、1日でも抜けると
 *   その日の乗車がぜんぶ「天気なし」になるためです。
 *   夜のあいだに何度でも試せるようにしてあります。
 */
const TK_FROM_HOUR = 18;   // この時刻から
const TK_TO_HOUR   = 5;    // 翌朝この時刻まで

/** いま、取りにいってよい時間帯か */
function tkInWindow_(d) {
  const h = (d || new Date()).getHours();
  return (h >= TK_FROM_HOUR) || (h < TK_TO_HOUR);
}

/**
 * その天気が「どの営業日のものか」。
 *
 * ★営業日は 17:00〜翌16:59 です。
 *   深夜2時に取った天気は、前の日（営業日）のものです。
 *   ここを取りちがえると、レポートで日付が1日ずれて、
 *   雨の日と晴れの日が入れかわってしまいます。
 */
function tkBizDate_(d) {
  const t = d || new Date();
  if (t.getHours() < TK_TO_HOUR) {
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  }
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

/** 日付を「2026-09-21」の形にする（並べ替えと、引き当てに使う） */
function tkKey_(d) {
  const t = d || new Date();
  return t.getFullYear() + "-" +
         ("0" + (t.getMonth() + 1)).slice(-2) + "-" +
         ("0" + t.getDate()).slice(-2);
}

/** 「雨」と呼ぶかどうか。天気の言葉の中に、雨・雪が入っていれば雨あつかい */
function tkIsRain_(text) {
  const t = String(text == null ? "" : text);
  if (!t) return false;
  // ★「降水確率」の文字だけで雨と決めない。天気の言葉そのものを見る
  return /(雨|雪|みぞれ|ゆき|あめ)/.test(t);
}

/**
 * 気象庁から、今日の天気を取ってくる。
 * 取れなければ null（取れないこと自体は、めずらしくありません）。
 */
function tkFetch_() {
  let res;
  try {
    res = UrlFetchApp.fetch(TK_URL, { muteHttpExceptions: true, followRedirects: true });
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("tkFetch", e);
    return null;
  }
  if (res.getResponseCode() !== 200) return null;

  let j;
  try { j = JSON.parse(res.getContentText()); } catch (e) { return null; }
  if (!Array.isArray(j) || !j.length) return null;

  const out = { weather: "", pop: "", tmax: "", tmin: "" };
  try {
    const ts = (j[0] && j[0].timeSeries) || [];

    // ① 天気の言葉（今日・明日・明後日 の3つが入っている。先頭が今日）
    const w = ts[0];
    if (w && w.areas) {
      const a = tkPickArea_(w.areas);
      if (a && a.weathers && a.weathers.length) out.weather = String(a.weathers[0] || "");
    }

    // ② 降水確率（6時間ごと。今日のぶんの、いちばん大きいものを取る）
    const p = ts[1];
    if (p && p.areas) {
      const a = tkPickArea_(p.areas);
      if (a && a.pops && a.pops.length) {
        let mx = -1;
        a.pops.slice(0, 4).forEach(function (x) {
          const n = parseInt(x, 10);
          if (!isNaN(n) && n > mx) mx = n;
        });
        if (mx >= 0) out.pop = String(mx);
      }
    }

    // ③ 気温（最低・最高の順で入っている）
    const t = ts[2];
    if (t && t.areas) {
      const a = tkPickArea_(t.areas);
      if (a && a.temps && a.temps.length >= 2) {
        out.tmin = String(a.temps[0] || "");
        out.tmax = String(a.temps[1] || "");
      }
    }
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("tkParse", e);
  }
  return out.weather ? out : null;
}

/** 「大阪」の区域を選ぶ。見つからなければ、いちばん上のものを使う */
function tkPickArea_(areas) {
  if (!areas || !areas.length) return null;
  for (let i = 0; i < areas.length; i++) {
    const nm = String((areas[i].area && areas[i].area.name) || "");
    if (nm.indexOf(TK_AREA) !== -1) return areas[i];
  }
  return areas[0];
}

/** 天気タブを用意する（無ければ作る） */
function tkSheet_() {
  let ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return null; }
  if (!ss) return null;
  let sh = ss.getSheetByName(TK_TAB);
  if (sh) return sh;
  sh = ss.insertSheet(TK_TAB);
  const head = ["日付", "曜日", "天気", "雨か", "降水確率(%)", "最高気温", "最低気温",
                "取った時刻", "出所"];
  sh.getRange(1, 1, 1, head.length).setValues([head])
    .setFontWeight("bold").setBackground("#dbe5f1").setWrap(true);
  sh.setFrozenRows(1);
  [96, 48, 200, 56, 96, 80, 80, 130, 120]
    .forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  return sh;
}

/** その日のぶんが、もう入っているか */
function tkHasDay_(sh, key) {
  try {
    const last = sh.getLastRow();
    if (last < 2) return false;
    const vals = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === key) return true;
    }
  } catch (e) {}
  return false;
}

/**
 * 今日の天気を1行ためる。
 * ためたら true、何もしなければ false。
 *
 * ★同じ日を二度ためません（先に入っていれば、何もしません）。
 */
function tkRecordToday() {
  const now = new Date();
  // ★深夜に取ったぶんは、前の日（営業日）としてためます
  const biz = tkBizDate_(now);
  const key = tkKey_(biz);
  const sh = tkSheet_();
  if (!sh) return false;
  if (tkHasDay_(sh, key)) return false;

  const w = tkFetch_();
  if (!w) return false;

  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const hhmm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
  sh.appendRow([key, days[biz.getDay()], w.weather, tkIsRain_(w.weather) ? "雨" : "",
                w.pop, w.tmax, w.tmin, tkKey_(now) + " " + hhmm, "気象庁（予報）"]);
  try {
    PropertiesService.getScriptProperties().setProperty(TK_LAST_KEY, key);
  } catch (e) {}
  return true;
}

/**
 * ボタンの見張り（1分おき）から呼ばれる、軽い入り口。
 *
 * ★夜（20時以降）に、その日のぶんがまだ無いときだけ取りにいきます。
 *   1日1回にしぼらず「取れるまで試す」形にしてあるのは、
 *   1日でも抜けると、その日の乗車がぜんぶ「天気なし」になるためです。
 *   取れたら、その日はもう試しません。
 */
function tkTick_() {
  try {
    const now = new Date();
    if (!tkInWindow_(now)) return false;          // 18:00〜翌05:00 のあいだだけ
    const key = tkKey_(tkBizDate_(now));
    let last = "";
    try { last = PropertiesService.getScriptProperties().getProperty(TK_LAST_KEY) || ""; } catch (e) {}
    if (last === key) return false;               // きょうのぶんは、もう取れている

    // 立て続けに気象庁へ聞きにいかないよう、10分に1回までにする
    try {
      const cc = CacheService.getScriptCache();
      if (cc.get("TK_WAIT")) return false;
      cc.put("TK_WAIT", "1", 600);
    } catch (e) {}

    return tkRecordToday();
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("tkTick", e);
    return false;
  }
}

/**
 * ためてある天気を、日付で引けるように まとめて読む。
 *   戻り値：{ "2026-09-21": { weather:"くもり", rain:true, pop:"60", tmax:"28", tmin:"21" }, … }
 *
 * ★1回読んだら、そのまま使い回します（レポートを作るたびに何度も読まないため）。
 */
function tkLoadAll_() {
  const map = {};
  let sh;
  try { sh = tkSheet_(); } catch (e) { return map; }
  if (!sh) return map;
  try {
    const last = sh.getLastRow();
    if (last < 2) return map;
    const vals = sh.getRange(2, 1, last - 1, 7).getValues();
    vals.forEach(function (r) {
      const k = String(r[0] == null ? "" : r[0]).trim();
      if (!k) return;
      map[k] = { weather: String(r[2] || ""), rain: String(r[3] || "").indexOf("雨") !== -1,
                 pop: String(r[4] || ""), tmax: String(r[5] || ""), tmin: String(r[6] || "") };
    });
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("tkLoadAll", e);
  }
  return map;
}

/**
 * 「天気」とLINEに送られたときの受け口（まーくさんだけ）。
 * いまためてある中身と、きょうのぶんが取れているかを返します。
 */
function tkHandleCmd_(ev) {
  const t = String((ev && ev.message && ev.message.text) || "").trim()
    .replace(/[\s　]/g, "");
  /*
   * ★LINEからの呼び出しは、絵文字ひとつで済む形にそろえます
   *   （まーくさんのご指示）。走りながら打つので、字を打たせないのが一番です。
   */
  //   ★似た絵文字でも通します。☀️のつもりで🌞を送って、
  //     何も返らないことがありました（打ちまちがいは必ず起きます）
  if (!/^(☀|☀️|🌞|🌤|🌤️|🌥|🌥️|⛅|⛅️|🌦|🌦️|☁|☁️|☔|🌧|🌧️|天気|てんき|weather)$/.test(t)) return false;
  const uid = (ev && ev.source && ev.source.userId) || "";
  let me = "";
  try { if (typeof rpTestTarget_ === "function") me = rpTestTarget_(); } catch (e) {}
  if (!me || uid !== me) return false;
  const reply = (ev && ev.replyToken) || "";
  const say = function (x) { if (typeof lineReply_ === "function") lineReply_(reply, x); };

  const map = tkLoadAll_();
  const keys = Object.keys(map).sort();
  const today = tkKey_(tkBizDate_(new Date()));
  const L = ["☀️ 天気の記録", ""];
  L.push("ためてあるぶん：" + keys.length + "日");
  if (keys.length) {
    L.push("　いちばん古い：" + keys[0]);
    L.push("　いちばん新しい：" + keys[keys.length - 1]);
    const rain = keys.filter(function (k) { return map[k].rain; }).length;
    L.push("　そのうち雨の日：" + rain + "日");
  }
  L.push("");
  if (map[today]) {
    L.push("きょう（" + today + "）：" + map[today].weather +
           (map[today].rain ? "／雨" : "") +
           (map[today].pop ? "／降水" + map[today].pop + "%" : ""));
  } else {
    L.push("きょう（" + today + "）は、まだ取れていません。");
    L.push("　※ " + TK_FROM_HOUR + ":00〜翌" + ("0" + TK_TO_HOUR).slice(-2) +
           ":00 のあいだに、自動で取りにいきます。");
  }
  L.push("");
  L.push("※ 気象庁の「予報」です（実測ではありません）。");
  L.push("※ " + TK_FROM_HOUR + ":00〜翌" + ("0" + TK_TO_HOUR).slice(-2) +
         ":00 に取るので、その日の天気としては ほぼ合っています。");
  L.push("※ 深夜に取ったぶんは、営業日（17:00〜翌16:59）に合わせて、前の日としてためます。");
  say(L.join("\n"));
  return true;
}

/** メニューから手で取るとき用 */
function menuTenkiNow() {
  const got = tkRecordToday();
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("☀️ 天気の記録",
      got ? "きょうのぶんを ためました。" : "きょうのぶんは、もう入っているか、取れませんでした。",
      ui.ButtonSet.OK);
  } catch (e) {}
  return got ? "☀️ きょうのぶんを ためました" : "☀️ きょうのぶんは、もう入っているか、取れませんでした";
}
