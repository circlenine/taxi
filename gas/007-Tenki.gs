/**
 * ================================================================
 *  天気の記録（007-Tenki.gs）
 *
 *  ★★★  T005ver  （2026/09/25）  ★★★
 *
 *  [T005ver]
 *   ・📋 見出しが古いまま残るのを直した（ご指摘で気づきました）
 *     ★まーくさんの天気タブは、見出しが9つ・中身が14こでした。
 *       気温のらんに別のものが入っているように見えていました。
 *     ★見出しは「タブを作るとき」にしか書いていませんでした。
 *       らんを9つから14こに増やしたとき、
 *       すでにタブがある人の見出しは、そのまま残りました。
 *     ★開くたびに見て、ちがえば書き直します。
 *       らんが足りなければ、先に増やします。
 *     ★中身のほうは触りません。古い形の行を並べ替えると、
 *       かえって取り違えるためです。
 *
 *  [T004ver]
 *   ・☀️ 天気タブに絵文字のらんを足した（ご指示）
 *     ★スマホで表を見るとき、字より絵のほうが速く分かります。
 *     ★いちばん困るものを先に見ます（「晴れのち一時雨」は ☔️）。
 *   ・🌙 夜（18〜24時／0〜6時）の降水確率を、別に出すようにした
 *     ★走るのは夜です。昼に降っても、夜に上がっていれば関係ありません。
 *     ★時刻は文字からそのまま読みます。new Date に渡すと、
 *       動かす場所の時差で 18時が 9時になり、夜のぶんを拾えません。
 *   ・⚠️ 警報・注意報（台風のときはここに出ます）を足した
 *     ★こちらで言葉を組み立てず、気象庁の文をそのまま写します。
 *       コードを自分で言葉に直すと、台風の日に
 *       「大雨警報」を「雷注意報」と書きかねません。
 *   ・📏 翌朝、アメダス（実測）で「実際に降ったか」を確かめるようにした
 *     ★ここが、いちばん大事なところです。
 *       これまでは予報だけで「雨の日」を決めていました。
 *       予報が外れた日を雨として数えたまま
 *       「雨の日は1件あたり￥◯◯」と出したら、結論ごと外れます。
 *       実測があれば、雨かどうかは実測で決め直します。
 *     ★予報の言葉は消しません。「予報は雨だったが降らなかった」ことも、
 *       あとで役に立つためです。
 *
 *  [T003ver]
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
/** このファイルのバージョン（先頭の ★★★ と必ずそろえる） */
const TK_VERSION = "T005ver";

const TK_TAB = "天気";

/*
 * 天気タブの らんの番号（1から数える）。
 * ★ここと、見出しを作るところが ずれると、
 *   気温のらんに降水量が入るような事故になります。必ず両方 直すこと。
 */
const TK_C_DATE  = 1;   // 日付
const TK_C_DOW   = 2;   // 曜日
const TK_C_ICON  = 3;   // 絵
const TK_C_WEA   = 4;   // 天気（予報）
const TK_C_RAIN  = 5;   // 雨か
const TK_C_POPN  = 6;   // 夜の雨%
const TK_C_MM    = 7;   // 実測mm
const TK_C_HOURS = 8;   // 夜の内訳
const TK_C_TMAX  = 9;   // 最高気温
const TK_C_TMIN  = 10;  // 最低気温
const TK_C_TNIGHT= 11;  // 夜の気温
const TK_C_WARN  = 12;  // 警報・注意報
const TK_C_AT    = 13;  // 取った時刻
const TK_C_SRC   = 14;  // 出所
const TK_COLS    = 14;

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

/* ================================================================
 *  実測で裏を取る（ここが今回いちばん大事なところ）
 *
 *  ★これまでは「予報」だけをためていました。
 *    けれどレポートでは「雨の日は1件あたり ￥◯◯」と言い切ります。
 *    予報が外れていたら、その結論ごと外れます。
 *    「雨予報だったが降らなかった日」を雨の日として数えていたら、
 *    出した数字は、ただの見当ちがいです。
 *    上の人に見せる資料で、それは通りません。
 *
 *  ★なので、翌朝に「実際どうだったか」を取りにいって、上書きします。
 *    気象庁のアメダス（実測）は、鍵なしで読めます。
 *    雨かどうかは、実測があれば実測で決めます。
 * ================================================================ */

/** アメダス（実測）の観測所。大阪＝62078 */
const TK_AMEDAS_ID = "62078";
const TK_AMEDAS_URL = "https://www.jma.go.jp/bosai/amedas/data/point/";

/** 警報・注意報（大阪府＝270000）。台風のときは、ここに出ます */
const TK_WARN_URL = "https://www.jma.go.jp/bosai/warning/data/warning/270000.json";

/** これ以上 降ったら「雨だった」とみなす（mm）。にわか雨のひと降りを拾うため */
const TK_RAIN_MM = 0.5;

/** 実測を取りにいく時間帯（翌朝）。夜のぶんが出そろってから */
const TK_FIX_FROM = 6;
const TK_FIX_TO   = 12;

/** 実測を覚えておく場所 */
const TK_FIX_KEY = "TK_FIXED_YMD";

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

/**
 * 天気の言葉から、絵文字を1つ決める（まーくさんのご指示）。
 *
 * ★スマホで表を見るとき、字より絵のほうが速く分かります。
 *   「くもり時々雨」を目で読むより、☔️が1つ見えるほうが早いです。
 *
 * ★見る順が大事です。
 *   「晴れのちくもり一時雨」は、雨が入っているので ☔️ にします。
 *   いちばん強いもの（困るもの）を先に見ます。
 */
function tkIcon_(text) {
  const t = String(text == null ? "" : text);
  if (!t) return "";
  if (/(雷|かみなり)/.test(t)) return "⛈";
  if (/(雪|ゆき|みぞれ)/.test(t)) return "❄️";
  if (/(雨|あめ)/.test(t)) return "☔️";
  if (/(くもり|曇)/.test(t) && /(晴|はれ)/.test(t)) return "🌤";
  if (/(くもり|曇)/.test(t)) return "☁️";
  if (/(晴|はれ)/.test(t)) return "☀️";
  return "🌡";
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

  /*
   * ★タクシーが走るのは夜です（18:00〜翌05:00）。
   *   昼に雨が降っても、夜に上がっていれば関係ありません。
   *   1日ぶんの降水確率を1つ出すだけでは、材料として足りません。
   *   だから、夜の時間帯だけを別に出します。
   */
  const out = { weather: "", pop: "", tmax: "", tmin: "",
                popEve: "", popNight: "", popsRaw: [] };
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

        /*
         * ★降水確率は6時間ごとに、0-6／6-12／12-18／18-24 の順で並びます。
         *   夜に取ると、もう過ぎた時間帯は入っていないことがあるので、
         *   「いくつ入っているか」で、どこが何時のぶんかを決めます。
         *   ここを決め打ちにすると、夕方の値を夜の値として出してしまいます。
         */
        out.popsRaw = a.pops.slice(0, 4).map(function (x) { return String(x); });
        const tm = (p.timeDefines || []).slice(0, 4);
        a.pops.slice(0, 4).forEach(function (x, i) {
          /*
           * ★時刻は、文字からそのまま読みます（new Date は使いません）。
           *   気象庁の時刻は「2026-09-21T18:00:00+09:00」の形で、
           *   いつも日本時間です。
           *   new Date に渡すと、動かす場所の時差で 18時が 9時になり、
           *   夜のぶんを1つも拾えません（実際そうなりました）。
           */
          const hh = parseInt(String(tm[i] || "").slice(11, 13), 10);
          if (hh === 18) out.popEve = String(x);        // 18〜24時
          if (hh === 0)  out.popNight = String(x);      // 0〜6時（翌朝ぶん）
        });
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

/**
 * 警報・注意報を取ってくる。台風のときは、ここに出ます。
 *
 * ★こちらで言葉を組み立てません。
 *   気象庁が出している文を、そのまま写します。
 *   コード番号を自分で言葉に直すと、直しそこねたときに
 *   「大雨警報」を「雷注意報」と書いてしまいます。
 *   台風の日にそれをやると、取り返しがつきません。
 *
 * ★取れなくても、天気の記録そのものは止めません。空を返します。
 */
function tkWarn_() {
  let res;
  try {
    res = UrlFetchApp.fetch(TK_WARN_URL, { muteHttpExceptions: true, followRedirects: true });
  } catch (e) { return ""; }
  if (res.getResponseCode() !== 200) return "";
  let j;
  try { j = JSON.parse(res.getContentText()); } catch (e) { return ""; }

  // ★気象庁が用意している「読める文」を、順に探します
  const cands = [];
  try { if (j.headlineText) cands.push(String(j.headlineText)); } catch (e) {}
  try { if (j.text) cands.push(String(j.text)); } catch (e) {}
  try {
    (j.headline || []).forEach(function (h) {
      if (h && h.text) cands.push(String(h.text));
    });
  } catch (e) {}
  const hit = cands.filter(function (x) { return x && x.trim(); })[0] || "";
  return hit.replace(/\s+/g, " ").trim().slice(0, 120);
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

/* ================================================================
 *  アメダス（実測）で、夜の雨を確かめる
 * ================================================================ */

/**
 * 夜（18:00〜翌05:00）に、実際どうだったかを取ってくる。
 *
 * ★アメダスは3時間ずつのファイルに分かれています。
 *   夜をまたぐので、当日の18時・21時と、翌日の00時・03時を読みます。
 *   4回に分けて読むのは、そういう形で置かれているからです。
 *
 * 戻り値 { mm, temp, hours } … 取れなければ null
 *   mm    … 夜のあいだの降水量の合計
 *   temp  … 夜のあいだの気温の平均
 *   hours … 「18時台は0.5mm」のような、時間ごとの内訳
 */
function tkAmedasNight_(bizDate) {
  const d = bizDate || new Date();
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const ymd = function (x) {
    return x.getFullYear() + ("0" + (x.getMonth() + 1)).slice(-2) +
           ("0" + x.getDate()).slice(-2);
  };
  // 当日18時・21時のファイルと、翌日00時・03時のファイル
  const files = [[ymd(d), "18"], [ymd(d), "21"], [ymd(next), "00"], [ymd(next), "03"]];

  let mm = 0, tSum = 0, tN = 0, got = 0;
  const hours = {};
  files.forEach(function (f) {
    let res;
    try {
      res = UrlFetchApp.fetch(TK_AMEDAS_URL + TK_AMEDAS_ID + "/" + f[0] + "_" + f[1] + ".json",
                              { muteHttpExceptions: true, followRedirects: true });
    } catch (e) { return; }
    if (res.getResponseCode() !== 200) return;
    let j;
    try { j = JSON.parse(res.getContentText()); } catch (e) { return; }
    got++;

    Object.keys(j).forEach(function (k) {
      const v = j[k] || {};
      const hh = parseInt(String(k).slice(8, 10), 10);
      if (isNaN(hh)) return;
      /*
       * ★夜の時間だけを数えます（18時〜翌4時台）。
       *   ファイルには前後のぶんも混じるので、ここで しぼらないと
       *   昼に降った雨まで「夜の雨」に足してしまいます。
       */
      const inNight = (hh >= TK_FROM_HOUR) || (hh < TK_TO_HOUR);
      if (!inNight) return;

      try {
        const p = v.precipitation10m;
        if (p && p.length && typeof p[0] === "number") {
          mm += p[0];
          hours[hh] = Math.round(((hours[hh] || 0) + p[0]) * 10) / 10;
        }
      } catch (e) {}
      try {
        const t = v.temp;
        if (t && t.length && typeof t[0] === "number") { tSum += t[0]; tN++; }
      } catch (e) {}
    });
  });

  if (!got) return null;                       // 1つも読めなかった＝実測なし
  return { mm: Math.round(mm * 10) / 10,
           temp: tN ? Math.round(tSum / tN * 10) / 10 : null,
           hours: hours };
}

/** 夜の内訳を、読める1行にする（「18時 0.5／21時 2.0」） */
function tkHoursLine_(hours) {
  const ks = Object.keys(hours || {}).map(Number).sort(function (a, b) {
    // 夜の並び（18,19,…,23,0,1,…,4）にそろえる
    const na = a < TK_TO_HOUR ? a + 24 : a;
    const nb = b < TK_TO_HOUR ? b + 24 : b;
    return na - nb;
  });
  const out = [];
  ks.forEach(function (h) {
    if (!hours[h]) return;                     // 降っていない時間は出さない（長くなるだけ）
    out.push(h + "時 " + hours[h]);
  });
  return out.join("／");
}

/** 天気タブを用意する（無ければ作る） */
/*
 * ★らんの並びは TK_C_* と、かならずそろえます。
 *   ずれると、気温のらんに降水量が入るような事故になります。
 */
const TK_HEAD = ["日付", "曜日", "絵", "天気（予報）", "雨か",
                 "夜の雨%", "実測mm", "夜の内訳",
                 "最高気温", "最低気温", "夜の気温",
                 "警報・注意報", "取った時刻", "出所"];
const TK_WIDTH = [96, 44, 44, 180, 52, 70, 68, 150, 70, 70, 70, 220, 120, 150];

/**
 * 見出しが、いまの らんの数と合っているか見て、ちがえば書き直す。
 *
 * ★まーくさんの天気タブが、こうなっていました。
 *     見出し … 9つ（古い形）
 *     中身　 … 14こ（いまの形）
 *   見出しだけ古いので、気温のらんに別のものが入っているように見えます。
 *
 * ★なぜ こうなったか
 *   見出しは「タブを作るとき」にしか書いていませんでした。
 *   らんを9つから14こに増やしたとき、
 *   すでにタブがある人の見出しは、そのまま残りました。
 *   作り直しのときだけ直る、というのは直っていないのと同じです。
 *
 * ★中身のほうは触りません。
 *   古い形で入っている行を、こちらで並べ替えると、
 *   かえって取り違えます。見出しだけ、正しくします。
 */
function tkFixHead_(sh) {
  if (!sh) return false;
  try {
    // らんが足りなければ、先に増やす
    const need = TK_HEAD.length;
    const have = sh.getMaxColumns();
    if (have < need) sh.insertColumnsAfter(have, need - have);

    const now = sh.getRange(1, 1, 1, need).getValues()[0];
    let same = true;
    for (let i = 0; i < need; i++) {
      if (String(now[i] == null ? "" : now[i]).trim() !== TK_HEAD[i]) { same = false; break; }
    }
    if (same) return false;

    sh.getRange(1, 1, 1, need).setValues([TK_HEAD])
      .setFontWeight("bold").setBackground("#dbe5f1").setWrap(true);
    try { sh.setFrozenRows(1); } catch (e) {}
    TK_WIDTH.forEach(function (w, i) {
      try { sh.setColumnWidth(i + 1, w); } catch (e) {}
    });
    return true;
  } catch (e) { return false; }
}

function tkSheet_() {
  let ss;
  try { ss = mainSS_(); } catch (e) { return null; }
  if (!ss) return null;
  let sh = ss.getSheetByName(TK_TAB);
  /*
   * ★もう在るときも、見出しを見ます（ご指摘で気づきました）。
   *   作るときにしか書いていなかったので、
   *   らんを増やしたあとも、古い見出しのままでした。
   */
  if (sh) { tkFixHead_(sh); return sh; }
  sh = ss.insertSheet(TK_TAB);
  tkFixHead_(sh);
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

  // 警報・注意報（台風のときは、ここに出ます）。取れなくても止めません
  let warn = "";
  try { warn = tkWarn_(); } catch (e) { warn = ""; }

  /*
   * ★夜の降水確率は、18〜24時と 0〜6時のうち、大きいほうを出します。
   *   走るのは夜なので、夜のどこかで降るなら、それは「降る日」です。
   */
  const pe = parseInt(w.popEve, 10), pn = parseInt(w.popNight, 10);
  let popN = "";
  if (!isNaN(pe) || !isNaN(pn)) {
    popN = String(Math.max(isNaN(pe) ? -1 : pe, isNaN(pn) ? -1 : pn));
  }

  const row = [];
  row[TK_C_DATE - 1]  = key;
  row[TK_C_DOW - 1]   = days[biz.getDay()];
  row[TK_C_ICON - 1]  = tkIcon_(w.weather);
  row[TK_C_WEA - 1]   = w.weather;
  row[TK_C_RAIN - 1]  = tkIsRain_(w.weather) ? "雨" : "";
  row[TK_C_POPN - 1]  = popN;
  row[TK_C_MM - 1]    = "";        // 実測は、翌朝に入れます
  row[TK_C_HOURS - 1] = "";
  row[TK_C_TMAX - 1]  = w.tmax;
  row[TK_C_TMIN - 1]  = w.tmin;
  row[TK_C_TNIGHT - 1]= "";
  row[TK_C_WARN - 1]  = warn;
  row[TK_C_AT - 1]    = tkKey_(now) + " " + hhmm;
  row[TK_C_SRC - 1]   = "気象庁（予報）";
  for (let i = 0; i < TK_COLS; i++) if (row[i] === undefined) row[i] = "";
  sh.appendRow(row);
  try {
    PropertiesService.getScriptProperties().setProperty(TK_LAST_KEY, key);
  } catch (e) {}
  return true;
}

/**
 * 前の営業日の行に、実測を書き入れる。
 *
 * ★ここが、この仕組みでいちばん大事なところです。
 *   予報で「雨」と書いてあっても、実際に降らなかった日はあります。
 *   その日を雨の日として数えたまま「雨の日は1件あたり￥◯◯」と
 *   出したら、その結論ごと外れています。
 *   実測が取れたら、雨かどうかを実測で決め直します。
 *
 * ★予報の言葉は消しません（上書きしません）。
 *   「予報は雨だったが、降らなかった」こと自体が、あとで役に立つためです。
 *   指示されていないものを、勝手に消さない、という決まりでもあります。
 */
function tkFixDay_(bizDate) {
  const sh = tkSheet_();
  if (!sh) return false;
  const key = tkKey_(bizDate);

  // その日の行をさがす
  let row = 0;
  try {
    const last = sh.getLastRow();
    if (last < 2) return false;
    const vals = sh.getRange(2, TK_C_DATE, last - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === key) { row = i + 2; break; }
    }
  } catch (e) { return false; }
  if (!row) return false;

  // もう実測が入っていれば、何もしない
  try {
    const cur = String(sh.getRange(row, TK_C_MM).getValue() || "").trim();
    if (cur !== "") return false;
  } catch (e) {}

  let a;
  try { a = tkAmedasNight_(bizDate); } catch (e) { a = null; }
  if (!a) return false;

  try {
    sh.getRange(row, TK_C_MM).setValue(a.mm);
    sh.getRange(row, TK_C_HOURS).setValue(tkHoursLine_(a.hours));
    if (a.temp !== null) sh.getRange(row, TK_C_TNIGHT).setValue(a.temp);
    // ★雨かどうかを、実測で決め直す
    sh.getRange(row, TK_C_RAIN).setValue(a.mm >= TK_RAIN_MM ? "雨" : "");
    sh.getRange(row, TK_C_SRC).setValue("気象庁（予報＋実測で確認）");
  } catch (e) { return false; }
  return true;
}

/** 実測を取りにいってよい時間帯か（翌朝） */
function tkFixWindow_(d) {
  const h = (d || new Date()).getHours();
  return h >= TK_FIX_FROM && h < TK_FIX_TO;
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

    /*
     * ★朝は「実測の取り入れ」をします。
     *   夜の雨が出そろうのは、夜が明けてからです。
     *   ここを夜にやると、まだ降っていない雨を「降らなかった」と
     *   書き込んでしまいます。
     */
    if (tkFixWindow_(now)) {
      const yKey = tkKey_(tkBizDate_(new Date(now.getFullYear(), now.getMonth(),
                                              now.getDate() - 1, 12, 0, 0)));
      let done = "";
      try { done = PropertiesService.getScriptProperties().getProperty(TK_FIX_KEY) || ""; } catch (e) {}
      if (done !== yKey) {
        try {
          const cc = CacheService.getScriptCache();
          if (!cc.get("TK_FIXWAIT")) {
            cc.put("TK_FIXWAIT", "1", 600);
            const ok = tkFixDay_(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
            if (ok) {
              try { PropertiesService.getScriptProperties().setProperty(TK_FIX_KEY, yKey); } catch (e) {}
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    }

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
    const vals = sh.getRange(2, 1, last - 1, TK_COLS).getValues();
    vals.forEach(function (r) {
      const k = String(r[TK_C_DATE - 1] == null ? "" : r[TK_C_DATE - 1]).trim();
      if (!k) return;
      const mmRaw = r[TK_C_MM - 1];
      const mm = (mmRaw === "" || mmRaw === null || mmRaw === undefined)
        ? null : Number(mmRaw);
      /*
       * ★雨かどうかは、実測があれば実測で決めます。
       *   予報が外れた日を雨として数えたままでは、
       *   「雨の日は1件あたり￥◯◯」という結論ごと外れます。
       */
      const rain = (mm !== null && !isNaN(mm))
        ? (mm >= TK_RAIN_MM)
        : (String(r[TK_C_RAIN - 1] || "").indexOf("雨") !== -1);
      map[k] = {
        weather: String(r[TK_C_WEA - 1] || ""),
        icon:    String(r[TK_C_ICON - 1] || ""),
        rain:    rain,
        sure:    (mm !== null && !isNaN(mm)),     // 実測で確かめたか
        mm:      (mm !== null && !isNaN(mm)) ? mm : null,
        hours:   String(r[TK_C_HOURS - 1] || ""),
        pop:     String(r[TK_C_POPN - 1] || ""),
        tmax:    String(r[TK_C_TMAX - 1] || ""),
        tmin:    String(r[TK_C_TMIN - 1] || ""),
        tnight:  String(r[TK_C_TNIGHT - 1] || ""),
        warn:    String(r[TK_C_WARN - 1] || "")
      };
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
  const rain = keys.filter(function (k) { return map[k].rain; }).length;
  const sure = keys.filter(function (k) { return map[k].sure; }).length;

  const L = [];
  L.push("☀️ 天気の記録");
  L.push("・ためたぶん：" + keys.length + "日");
  if (keys.length) {
    L.push("・雨の日：" + rain + "日");
    L.push("・実測で確かめた：" + sure + "日");
  }
  L.push("");

  // きょうの1行（絵文字つき）
  const w = map[today];
  if (w) {
    L.push("きょう " + (w.icon || "") + " " + w.weather);
    const bits = [];
    if (w.pop) bits.push("夜の雨 " + w.pop + "%");
    if (w.mm !== null && w.mm !== undefined) bits.push("実測 " + w.mm + "mm");
    if (w.tnight) bits.push("夜 " + w.tnight + "℃");
    if (bits.length) L.push("・" + bits.join("／"));
    if (w.hours) L.push("・降った時間：" + w.hours);
    if (w.warn) L.push("⚠️ " + w.warn);
    L.push("・" + (w.sure ? "実測で確かめました" : "まだ予報のままです（翌朝に確かめます）"));
  } else {
    L.push("きょう（" + today + "）は、まだ取れていません");
    L.push("・" + TK_FROM_HOUR + ":00〜翌0" + TK_TO_HOUR + ":00 に、自動で取ります");
  }
  L.push("");
  L.push("※ 夜（" + TK_FROM_HOUR + ":00〜翌0" + TK_TO_HOUR + ":00）に予報を取り、");
  L.push("　 翌朝にアメダス（実測）で雨かどうかを確かめ直しています。");
  L.push("※ 深夜のぶんは、営業日（17:00〜翌16:59）に合わせて前の日としてためます。");
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
