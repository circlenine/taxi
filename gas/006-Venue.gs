/**
 * ================================================================
 *  会場・イベント情報あつめ（006-Venue.gs）
 *
 *  ★★★  V016ver  （2026/09/16）  ★★★
 *
 *  ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *               W=004-WebApp / U=005-Updater / V=006-Venue
 *  ※記号は、ファイル名の頭文字にそろえています（V=Venue）。
 *
 *  [V016ver]
 *   ・グループの宛先も、形を確かめてから使うようにした
 *     見出しが混ざったままLINEに渡すと、理由の分からない400になるため
 *
 *  [V015ver]
 *   ・イベントの絵にも、送る前の掃除（lrClean_）をかけた
 *     レポートで、中身が空の span のせいで1通も届かない事故があったため
 *
 *  [V014ver]
 *   ・LINEの返事を、叫ぶ系のデスノートネタにそろえた
 *     ノートに書きました。あと〇分…／くそっ!!!!やられた!!!!／
 *     わ…私は仰せの通りに…／だ…ダメだ…／早くなんとかしないと…
 *
 *  [V013ver]
 *   ・LINEの返事に、デスノートのネタを散らした（短いまま）
 *     ★命令口調にしない。ネタを知らない人が読んでも、
 *       ただの丁寧な返事として通じる言い回しだけにする
 *
 *  [V012ver]
 *   ・LINEの返事を、ぜんぶ短くしてジェバンニ調にそろえた
 *
 *  [V011ver]
 *   ・公式アカウントからの返事を減らした
 *     ここは雑談のグループなので、合図のたびに口を出すと邪魔になる。
 *     「↓ホテル」などの合図には、もう何も返さない（黙って待つ）
 *   ・読み取れたときの返事を3行にした
 *     「以下のイベント情報をジェバンニが〇秒で確認しました／件数：〇件／場所：〇〇」
 *   ・読み取れなかったときの返事も1行にした
 *
 *  [V010ver]
 *   ・説明タブへの書き読みを I列 に合わせた
 *
 *  [V009ver]
 *   ・イベントの見張りを 5分おき → 15分おき にした
 *     5分おきだと1日に288回も動く。Googleが1日にくれる「決められた時間」は
 *     決まっていて、1分おきのボタンの見張りと合わせると使い切ってしまい、
 *     見張りごと止まる（実際に止まった）。
 *     届く時刻は 16:45〜17:00 ごろ、お知らせは予定時刻から15分以内になる
 *
 *  [V008ver]
 *   ・イベントの枠そのものを、公式ページへのボタンにした
 *     下にリンクを別に並べるのはやめた。どのリンクがどの催しのものかを
 *     目で探させることになるうえ、場所も文字数も食っていた。
 *     枠の中に「👆 この枠を押すと「〇〇」の公式ページが開きます」と書いて、
 *     押せることが必ず分かるようにしてある
 *   ・URLの無い催し（ホテルの資料など）には、案内も行き先も付けない
 *     押しても何も起きないボタンほど、たちの悪いものはないため
 *
 *  [V007ver]
 *   ・ホームページの読み取りを作った（vnScrapeAll_）
 *     「その日の日付が書いてある行を見つけて、その周りを読む」やり方にした。
 *     サイトごとに決め打ちすると、向こうの作りが変わった日から黙って
 *     何も出なくなるため。9/15・9月15日・09-15 のどれでも読む
 *     終わりの時刻が書いていなければ、会場の種類から見積もる（予想と明記）
 *   ・[13]「読み取れているものの一覧を見る」を足した
 *     何件読めたか、読んだ元の文字まで出す。外していればすぐ分かる
 *   ・事前のお知らせを3つから選べるようにした（催しごとのボタン）
 *     ⏰カレンダー … 押すと予定として登録できるリンクを返す
 *                    （Androidの標準は「Googleカレンダー」。iPhoneでも同じ）
 *     💬Discord   … みんなのDiscordへ流す
 *     📱自分のLINE … 押した人の個人LINEにだけ届く
 *     知らせるのは「終わりの◯分前」（設定「イベントのお知らせは何分前」／既定60）
 *   ・1通に入りきらないときは、催しを落とす前にボタンのほうを消すようにした
 *     ボタンを絵の中にそのまま入れると1件1,700バイトかかり、
 *     見本4件で12,358バイト（上限10,000）になって催しが1件消えていた。
 *     押されたあとにリンクを返す形にして1件450バイトに縮めた
 *
 *  [V006ver] ファイル名を 006-Events.gs → 006-Venue.gs にした
 *   ・「Events」と「Extras」は、どちらも E で始まって紛らわしかった。
 *     記号は V のままなので、これでファイル名の頭文字と記号がそろった（V=Venue）
 *   ・関数の頭も ev○○ → vn○○ に、定数も EV_ → VN_ にそろえた
 *   ・中身の動きは何も変えていない
 *   ・V005ver 以前は 006-Events.gs という名前でした（同じファイルのことです）
 *
 *  [V005ver]
 *   ・ホテルの合図を増やした。矢印のきまりは日付メモ（「↓0904」）と同じ
 *     「↓帝国」… 紙にホテル名が無い帝国ホテルの資料を、帝国ホテルとして読む
 *     「↓ホテル」「↓🏨」… 紙のタイトルからホテル名を読む
 *     「↑…」にすると、直前に送った写真を読み直す
 *   ・合図を出したうえでの写真は、読めなかったときも黙らずに伝える
 *     （合図の無い写真は、読めなければ黙る。雑談の写真に返さないため）
 *   ・公演名から「知っておくと良いこと」「触れない方が良いこと」も聞くようにした
 *     訃報・脱退・不祥事・負けた試合など、車内で触れると空気が悪くなることを
 *     赤字で出す。1通に入りきらないときも、ここだけは最後まで残す
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
 * ================================================================
 */

/** このファイルのバージョン */
const VN_VERSION = "V016ver";

/**
 * 見にいく先の一覧。
 * kind … "event"（イベント）/ "barasi"（バラシ）/ "hotel"（ホテル）
 */
const VN_SOURCES = [
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
const VN_VENUES = {
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
const VN_FROM_HOUR = 18;   // 18:00
const VN_TO_HOUR   = 28;   // 翌04:00（24＋4）

/** これ未満の見込み人数は、タクシーの数に響かないので出さない */
const VN_MIN_PEOPLE = 300;

/** 自動で送る時刻（16:45）。5分おきに時計を見て、この時刻を過ぎたら1回だけ送る */
const VN_SEND_HOUR = 16;
const VN_SEND_MIN  = 45;
/** 送る時刻をどれだけ過ぎたら、その日はもうあきらめるか（分） */
const VN_SEND_WINDOW = 45;

/** Flex（絵）1通の上限。LINEの決まりは10KB。ぶつからないよう手前で止める */
const VN_FLEX_MAX = 9500;

/* ============ 出すかどうかの判断 ============ */

/** "21:30" → 21.5。翌日にまたぐものは 24 を足す（"01:00" → 25） */
function vnHourOf_(hhmm) {
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
function vnInTimeRange_(ev) {
  const end = vnHourOf_(ev.end);
  const start = vnHourOf_(ev.start);
  if (end === null && start === null) return true;        // 分からないものは残す
  const h = (end !== null) ? end : start;
  return h >= VN_FROM_HOUR && h <= VN_TO_HOUR;
}

/**
 * タクシーの数に響く規模かどうか。
 * 人数が分かればそれで、分からなければ会場の大きさで見る。
 */
function vnBigEnough_(ev) {
  if (ev.people > 0) return ev.people >= VN_MIN_PEOPLE;
  const v = VN_VENUES[ev.venue];
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
function vnPlaceStats_(names, fromHour, toHour) {
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
        const h = vnHourOf_(String(disp[r][4] || ""));
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
function vnStatsLine_(st) {
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
function vnProbeAll() {
  const now = new Date();
  const out = [];
  out.push("🔎 イベント情報のページを調べました（" + vnDateLabel_(now) + "）");
  out.push("");

  VN_SOURCES.forEach(function (src) {
    if (typeof updBeat_ === "function") updBeat_("調査 " + src.name);
    out.push("■ " + src.name + "（" + src.kind + "）");
    const r = vnProbeOne_(src, now);
    r.forEach(function (line) { out.push("　" + line); });
    out.push("");
  });

  out.push("■ 帝国ホテル / リーガロイヤルホテル");
  out.push("　ホームページに出ていない紙の資料なので、取りにいく先がありません。");
  out.push("　写真をLINEに送って読み取る形にするのが現実的です（後述）。");

  return out.join("\n");
}

/** 1つぶんを調べる。戻り値は行の配列 */
function vnProbeOne_(src, now) {
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
    vnDatePatterns_(t).forEach(function (p) {
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
function vnDatePatterns_(d) {
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
function vnDateLabel_(d) {
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

const VN_COLOR_HEAD = "#6a1b9a";   // 紫（レポートの青 #1155ca と分ける）
const VN_COLOR_SUB  = "#7b1fa2";
const VN_COLOR_TEXT = "#4a148c";

/** 「9/16(水)」 */
function vnDayLabel_(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return (d.getMonth() + 1) + "/" + d.getDate() + "(" + w[d.getDay()] + ")";
}

/** 裏メッセージ（通知やトーク一覧に出る文字） */
function vnAltText_(d) {
  return "🎪" + vnDayLabel_(d) + "イベント等情報 byシバンニ";
}

/** 1件ぶんの箱 */
function vnCard_(ev, idx, day, noBells) {
  const v = VN_VENUES[ev.venue] || {};
  const rows = [];

  // 1行目：会場と時間
  const when = ev.start && ev.end ? `${ev.start}〜${ev.end}`
             : ev.end   ? `${ev.end} 終了`
             : ev.start ? `${ev.start} 開始`
             : "時間不明";
  rows.push({ "type": "text", "size": "sm", "wrap": true, "contents": [
    { "type": "span", "text": (ev.icon || "📍") + " " + ev.venue, "weight": "bold", "color": VN_COLOR_TEXT },
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

  // 5行目：知っておくと話が弾むこと
  if (ev.know) rows.push({ "type": "text", "text": "💬 話題：" + ev.know, "size": "xxs", "color": "#00695c", "wrap": true, "margin": "xs" });

  // 6行目：触れない方がよいこと（ここは赤。ひと目で分かるように）
  if (ev.avoid) rows.push({ "type": "text", "text": "🚫 触れない：" + ev.avoid, "size": "xxs", "color": "#c62828", "wrap": true, "margin": "xs", "weight": "bold" });

  // 5行目：この1件についての助言
  if (ev.advice) rows.push({ "type": "text", "text": "▶ " + ev.advice, "size": "xs", "color": "#1b5e20", "wrap": true, "margin": "sm", "weight": "bold" });

  const box = { "type": "box", "layout": "vertical", "backgroundColor": "#f6f1f9",
                "paddingAll": "10px", "cornerRadius": "md", "margin": "sm", "contents": rows };
  // お知らせの受け取り方を3つならべる（時間が分かっている催しだけ）
  if (day && !noBells && (ev.start || ev.end) && ev.kind !== "barasi") {
    rows.push({ "type": "text", "text": "お知らせ：⏰カレンダー ／ 💬Discord ／ 📱自分のLINE",
                "size": "xxs", "color": "#7b1fa2", "margin": "sm" });
    rows.push(vnBellRow_(ev, idx, day));
  }
  // ★この枠そのものがボタン。押すと、その催しの公式ページが開く。
  //   下にリンクのボタンを別に並べるのはやめた。
  //   「どのリンクがどの催しのものか」を目で探させることになるうえ、
  //   場所も文字数も食う。催しの枠を押せば、その催しのページへ行くのが素直。
  //   押せることが分からないと意味がないので、必ず案内を出す。
  if (ev.url) {
    box.action = { "type": "uri", "label": vnBtnLabel_(ev.venue), "uri": ev.url };
    rows.push({ "type": "box", "layout": "vertical", "backgroundColor": "#ede7f6",
      "cornerRadius": "md", "paddingAll": "6px", "margin": "sm", "contents": [
        { "type": "text", "size": "xxs", "color": VN_COLOR_HEAD, "weight": "bold", "wrap": true,
          "text": "👆 この枠を押すと「" + ev.venue + "」の公式ページが開きます" }
      ]});
  }
  return box;
}


/* ============ ボタンの文字 ============ */

/** ボタンや行き先の名前。長い会場名は入りきらないので詰める */
function vnBtnLabel_(name) {
  const t = String(name || "").replace(/[\s\u3000]/g, "");
  return t.length > 9 ? t.slice(0, 8) + "…" : (t || "ページ");
}

/**
 * イベントのお知らせを組み立てる。
 * 戻り値は LINE に渡すメッセージの配列（絵＋URLのテキスト）。
 */
function vnBuildMessages_(day, events, note, noBells) {
  const alt = vnAltText_(day);
  const contents = [];

  contents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#f3e5f5",
    "paddingAll": "10px", "cornerRadius": "md", "contents": [
      { "type": "text", "text": "対象は 18:00〜翌04:00 に動きがあるものだけです", "size": "xxs", "color": "#6a1b9a", "wrap": true },
      { "type": "text", "text": "小さすぎてタクシーに響かないものは省いています", "size": "xxs", "color": "#6a1b9a", "wrap": true, "margin": "xs" },
      { "type": "text", "text": "👆 各イベントの枠を押すと、その公式ページが開きます", "size": "xxs", "color": "#6a1b9a", "wrap": true, "margin": "xs", "weight": "bold" }
    ]});

  const kinds = [["event", "🎤 イベント"], ["barasi", "🔧 バラシ（搬出）"], ["hotel", "🍽 ホテル宴会"]];
  let shown = 0;
  kinds.forEach(function (k) {
    const list = (events || []).filter(function (e) { return (e.kind || "event") === k[0]; });
    if (!list.length) return;
    contents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": k[1], "weight": "bold", "size": "sm", "color": VN_COLOR_SUB, "margin": "md" });
    list.forEach(function (e) {
      contents.push(vnCard_(e, (events || []).indexOf(e), day, noBells));
      shown++;
    });
  });

  if (!shown) {
    contents.push({ "type": "text", "text": "この日に、18:00〜翌04:00 で拾えるイベントは見つかりませんでした。",
      "size": "sm", "color": "#666666", "wrap": true, "margin": "lg" });
  }
  if (note) {
    contents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": note, "size": "xxs", "color": "#b71c1c", "wrap": true, "margin": "md" });
  }

  // ★送る前に、中身が空のところを取りのぞく。
  //   LINEは text が空の span／text、contents が空の box を受け付けない。
  //   1つでも混じっていると 400 で、その通がまるごと届かない
  const body = (typeof lrClean_ === "function") ? lrClean_(contents) : contents;

  const bubble = {
    "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": VN_COLOR_HEAD, "paddingAll": "15px",
      "contents": [ { "type": "text", "text": "🎪 " + vnDayLabel_(day) + " イベント等情報",
        "weight": "bold", "color": "#ffffff", "size": "md", "wrap": true } ] },
    "body": { "type": "box", "layout": "vertical", "paddingAll": "12px", "spacing": "none", "contents": body }
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
function vnFitMessages_(day, events, note) {
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
  let bells = false;                    // お知らせボタンを消したか

  let msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= VN_FLEX_MAX) return msgs;

  // ① 客層の行（実績・推定）と話題を落とす。
  //    「触れない方がよいこと」だけは、トラブルに直結するので最後まで残す
  evs = copy(evs, ["stats", "guess", "know"]);
  msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= VN_FLEX_MAX) return msgs;

  // ② お知らせボタンを消す。
  //    ★催しを1件まるごと落とすくらいなら、ボタンのほうを先に消す。
  //      「あることを知らせる」のが本題で、ボタンはその次だから。
  bells = true;
  msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= VN_FLEX_MAX) return msgs;

  // ③ 助言も落とす
  evs = copy(evs, ["advice"]);
  msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= VN_FLEX_MAX) return msgs;

  // ④ それでも入らなければ件数を減らし、減らしたことを必ず書き添える
  while (evs.length > 1 && size(vnBuildMessages_(day, evs, note, bells)[0]) > VN_FLEX_MAX) evs.pop();
  const cut = evs.length < events.length ? (events.length - evs.length) : 0;
  const add = cut ? "※ 長くなりすぎるため、ほかに" + cut + "件を省きました。" : "";
  return vnBuildMessages_(day, evs, (note ? note + " " : "") + add, bells);
}

/* ============ LINEに送る ============ */
/*
 * ★ここは必ず「自分だけ」から始める。
 *   グループに一度送ったものは取り消せない。
 *   まだ読み取りが完成していないうちに、みんなに変なものが飛ぶのがいちばん困る。
 *   グループへ送るのは、レポートと同じく「もう一度チェック」で確かめてからにする。
 */

/** テストの宛先（まーく個人のLINE） */
function vnTestTarget_() {
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
function vnGroupTarget_() {
  if (typeof rpGroupTarget_ === "function") return rpGroupTarget_();
  try {
    const v = (typeof infoGet_ === "function") ? infoGet_(INFO_ROW.GROUP) : "";
    return (typeof isLineTarget_ === "function") ? isLineTarget_(v) : v;
  } catch (e) { return ""; }
}

/**
 * 長い文を、LINEが受け取れる長さに分ける。
 * 1通5,000文字まで。行の途中では切らない（読めなくなるため）。
 */
function vnSplitText_(text, max) {
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
function vnSend_(text, where) {
  const to = (where === "group") ? vnGroupTarget_() : vnTestTarget_();
  if (!to) {
    return where === "group"
      ? "グループの送り先が分かりません（グループLINEに何か1つ投稿すると覚えます）"
      : "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  }
  const parts = vnSplitText_(text);
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
function vnSampleEvents_() {
  const mk = function (venue, kind, icon, title, start, end, people, url, guess, know, avoid) {
    const v = VN_VENUES[venue] || {};
    const st = vnPlaceStats_(v.near, VN_FROM_HOUR, VN_TO_HOUR);
    const line = vnStatsLine_(st);
    return { venue: venue, kind: kind, icon: icon, title: title, start: start, end: end,
             people: people, url: url,
             stats: line || "自社の記録：この乗り場の記録はまだありません",
             guess: guess || "", know: know || "", avoid: avoid || "",
             advice: vnAdvice_(venue, end, st) };
  };
  return [
    mk("京セラドーム", "event", "🏟", "コンサート", "18:00", "21:00", 0,
       "https://www.kyoceradome-osaka.jp/schedule/", "20〜30代女性が中心。男女比おおよそ2:8（見本）",
       "デビュー20周年の記念公演。初日です（見本）",
       "昨年脱退したメンバーの話（見本）"),
    mk("大阪城ホール", "event", "🎤", "コンサート", "18:30", "20:45", 0,
       "https://www.osaka-johall.com/event/", "30〜40代が中心。男女ほぼ半々（見本）",
       "大阪公演は3年ぶり（見本）", ""),
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
function vnAdvice_(venue, end, st) {
  const v = VN_VENUES[venue] || {};
  const L = [];
  const h = vnHourOf_(end);
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
function vnSendSampleToMe() {
  const day = new Date();
  const events = vnSampleEvents_();
  const note = "※ これは見た目を決めるための見本です。「推定」の行は見本用の文です。" +
    "ページの読み取りはこれから作ります（[9] の調査結果を見てから）。";
  vnDaySave_(day, events);
  const msgs = vnFitMessages_(day, events, note);
  const to = vnTestTarget_();
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
function vnProbeSendToMe() {
  const text = vnProbeAll();
  const err = vnSend_("🔎 イベント情報の調査（テスト送信・自分だけ）\n\n" + text, "test");
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
function vnAudKey_(title) {
  const t = String(title || "").trim();
  if (!t) return "";
  try {
    const b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, t, Utilities.Charset.UTF_8);
    let h = "";
    for (let i = 0; i < 6; i++) h += ("0" + (b[i] & 255).toString(16)).slice(-2);
    return "VNAUD_" + h;
  } catch (e) { return ""; }
}

/**
 * 公演名から、次の3つをまとめてAIに聞く。
 *   audience … 来る人の年代・男女比のおおよそ（推定）
 *   know     … 知っておくと話が弾む、いま話題になっていること
 *   avoid    … 触れない方がいいこと（訃報・活動休止・不祥事・対戦相手のことなど）
 *
 * ★avoid がいちばん大事。
 *   お客さんが盛り上がって乗ってきたところに、こちらが地雷を踏むと
 *   その場でトラブルになる。「知らないなら黙る」が正解なので、
 *   AIにも知らないものには「不明」と答えさせている。
 *
 * 1回の呼び出しで3つとも取る（回数制限に当たらないように）。
 * 同じ公演は覚えておいて、二度は聞かない。
 */
function vnTopicInfo_(title, venue) {
  const empty = { audience: "", know: "", avoid: "" };
  const t = String(title || "").trim();
  if (!t || t.length < 2) return empty;

  const key = vnAudKey_(t);
  const pr = PropertiesService.getScriptProperties();
  if (key) {
    const hit = pr.getProperty(key);
    if (hit !== null) {
      try { return JSON.parse(hit); } catch (e) { return empty; }
    }
  }

  let apiKey = "", model = "";
  try {
    if (typeof getGeminiKey_ !== "function") return empty;
    apiKey = getGeminiKey_();
    model  = (typeof getGeminiModel_ === "function") ? getGeminiModel_() : "gemini-3.1-flash-lite";
  } catch (e) { return empty; }
  if (!apiKey) return empty;

  const prompt =
    "あなたは大阪のタクシー運転手に情報を渡す係です。\n" +
    "次の催しについて、車内での会話に役立つことを答えてください。\n" +
    "催し：「" + t + "」" + (venue ? "（会場：" + venue + "）" : "") + "\n" +
    "出力は JSON ひとつだけ。前置きも説明も書かないでください。\n" +
    '{"audience":"","know":"","avoid":""}\n' +
    "・audience … 来場者の年代と男女のおおよその比率。35文字以内\n" +
    "・know … 知っておくと話が弾むこと（最新の話題、記念の公演、初日や千秋楽など）。50文字以内\n" +
    "・avoid … 触れない方がよいこと（メンバーの訃報・脱退・活動休止・不祥事・けが・\n" +
    "　　　　　負けた試合・対戦相手の話題など、言うと空気が悪くなること）。50文字以内\n" +
    "決まり：\n" +
    "・知らない催し・アーティストなら、推測せず、3つとも空文字にする\n" +
    "・確かでないことは書かない。うわさ、憶測、古い情報は書かない\n" +
    "・avoid に書くことが無ければ空文字にする（無理に埋めない）";

  let out = empty;
  try {
    const res = UrlFetchApp.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model +
      ":generateContent?key=" + encodeURIComponent(apiKey),
      { method: "post", contentType: "application/json", muteHttpExceptions: true,
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    if (res.getResponseCode() === 200) {
      const text = String(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text || "");
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const j = JSON.parse(m[0]);
        out = { audience: vnClean_(j.audience), know: vnClean_(j.know), avoid: vnClean_(j.avoid) };
      }
    }
  } catch (e) { if (typeof logErr_ === "function") logErr_("vnTopic", e); }

  if (key) { try { pr.setProperty(key, JSON.stringify(out)); } catch (e) {} }
  return out;
}

/** AIの返事を、そのまま出せる形に整える（「不明」は空にする） */
function vnClean_(v) {
  let s = String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim();
  if (!s) return "";
  if (/^(不明|なし|特になし|わかりません|分かりません|-|ー)$/.test(s)) return "";
  return s.slice(0, 60);
}

/** 年代・男女比だけがほしいとき（今までの呼び名を残しておく） */
function vnAudienceGuess_(title, venue) {
  return vnTopicInfo_(title, venue).audience;
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

/*
 * ホテルの合図に使える言葉。
 *   ↓ を付ける／付けない … これから送る写真のこと
 *   ↑ を付ける          … 直前に送った写真のこと（オプチャの「↑0904」と同じ）
 *
 * 帝国ホテルの資料には紙にホテル名が書かれていないので、
 * 「帝国」と打ってもらったら、そのまま帝国ホテルとして読む（force）。
 */
const VN_HOTEL_WORDS = [
  { re: /^(帝国|ていこく|帝国ホテル)$/,                     force: "帝国ホテル" },
  { re: /^(リーガ|りーが|リーガロイヤル|リーガロイヤルホテル)$/, force: "リーガロイヤルホテル" },
  { re: /^(ホテル|ほてる|🏨)$/,                              force: "" }
];

/** 打たれた文字が、ホテルの合図かどうかを見る */
function vnHotelWord_(text) {
  const t = String(text || "").trim().replace(/[\s\u3000]/g, "");
  const m = t.match(/^([↑↓⬆⬇])?(.+)$/);
  if (!m) return null;
  const body = m[2];
  for (let i = 0; i < VN_HOTEL_WORDS.length; i++) {
    if (VN_HOTEL_WORDS[i].re.test(body)) {
      return { up: (m[1] === "↑" || m[1] === "⬆"), force: VN_HOTEL_WORDS[i].force };
    }
  }
  return null;
}

const VN_HOTEL_PROMPT =
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

/**
 * 写真をホテルの資料として読む。戻り値は読み取れた予定の配列。
 * force にホテル名を渡すと、そのホテルのものとして読む
 * （帝国ホテルの資料は紙にホテル名が無いため）。
 */
function vnHotelFromImage_(messageId, force) {
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
        { text: VN_HOTEL_PROMPT +
                (force ? "\n・このホテルは「" + force + "」です。hotel には必ず「" + force + "」と入れてください" : "") },
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
function vnHotelDate_(md, base) {
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
function vnHotelKey_(d) {
  return "VNH_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

/**
 * 読み取った予定を、日付ごとに覚えておく。
 * 同じ予定を二度書かない（同じホテル・同じ名前・同じ開始時刻なら1つ）。
 * 戻り値は「何件しまったか」。
 */
function vnHotelSave_(list, base, force) {
  const pr = PropertiesService.getScriptProperties();
  const byDay = {};
  (list || []).forEach(function (x) {
    if (force) x.hotel = force;
    const d = vnHotelDate_(x.date, base);
    const k = vnHotelKey_(d);
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
function vnHotelForDay_(d) {
  let list = [];
  try { list = JSON.parse(PropertiesService.getScriptProperties().getProperty(vnHotelKey_(d)) || "[]"); }
  catch (e) { list = []; }
  return list.map(function (x) {
    const raw = String(x.hotel || "");
    const hotel = raw.indexOf("帝国") >= 0 ? "帝国ホテル"
                : raw.indexOf("リーガ") >= 0 ? "リーガロイヤルホテル"
                : raw ? raw : "ホテル";
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
function vnHotelTry_(messageId, base, force) {
  const t0 = Date.now();                 // 読み取りにかかった時間を出すため
  let list = [];
  try { list = vnHotelFromImage_(messageId, force); }
  catch (e) { if (typeof logErr_ === "function") logErr_("vnHotelTry", e); return ""; }
  if (!list.length) return "";
  const n = vnHotelSave_(list, base || new Date(), force);

  // 場所の名前を、重ならないようにならべる
  const seen = {}, places = [];
  list.forEach(function (x) {
    const nm = String(force || x.hotel || "").trim();
    if (!nm || seen[nm]) return;
    seen[nm] = 1; places.push(nm);
  });

  // ★ここは雑談のグループに出る。短く、3行で終える
  const sec = Math.max(0.1, Math.round((Date.now() - t0) / 100) / 10);
  return "以下のイベント情報をジェバンニが" + sec + "秒でやってくれました\n" +
         "件数：" + n + "件\n" +
         "場所：" + (places.join("・") || "（読み取れず）");
}

/** 合図を覚える（15分だけ）。force は「帝国ホテル」など、決め打ちするホテル名 */
function vnHotelHintSet_(userId, force) {
  try { CacheService.getScriptCache().put("VNKIND_" + (userId || "anon"), "hotel|" + (force || ""), 900); }
  catch (e) {}
}

/**
 * 合図が出ているか（1回見たら消す）。
 * 出ていれば { force: "帝国ホテル" } の形、出ていなければ null。
 */
function vnHotelHintGet_(userId) {
  try {
    const c = CacheService.getScriptCache();
    const k = "VNKIND_" + (userId || "anon");
    const v = c.get(k);
    if (v) {
      c.remove(k);
      const i = String(v).indexOf("|");
      return { force: i >= 0 ? String(v).slice(i + 1) : "" };
    }
  } catch (e) {}
  return null;
}

/**
 * 「帝国」「↓ホテル」「↑🏨」などと打たれたときの受け口。
 * 001-Code の文字の処理から呼ばれる。扱ったら true を返す。
 *
 *   ↓ を付ける／付けない … これから送る写真のこと
 *   ↑ を付ける          … 直前に送った写真のこと
 */
function vnHandleNote_(ev, sentAt) {
  const w = vnHotelWord_((ev.message && ev.message.text) || "");
  if (!w) return false;
  const uid = (ev.source && ev.source.userId) || "anon";
  const reply = ev.replyToken || "";
  const nameOf = w.force || "ホテル";

  if (w.up) {
    // 先に写真を送ってしまったとき用。直前の写真を読み直す
    let mid = "";
    try { mid = CacheService.getScriptCache().get("LASTIMG_" + uid) || ""; } catch (e) {}
    if (!mid) {
      if (typeof lineReply_ === "function") lineReply_(reply, "🔍 だ…ダメだ…直前の写真がない…");
      return true;
    }
    const msg = vnHotelTry_(mid, sentAt || new Date(), w.force);
    // 打った人が自分で合図を出しているので、読めなかったときも黙らずに伝える（1行だけ）
    if (typeof lineReply_ === "function") {
      lineReply_(reply, msg || ("🔍 くそっ!!!!やられた!!!!　" + nameOf +
        "の予定が読めません。明るいところなら、いけるかもしれません"));
    }
    return true;
  }

  // ★ここでは何も返さない。
  //   グループは雑談の場なので、合図のたびに公式アカウントが口を出すと邪魔になる。
  //   写真が届いて、読み取れたときにだけ返す。
  vnHotelHintSet_(uid, w.force);
  return true;
}

/**
 * 写真が来たときの受け口。合図が出ていればホテルとして読む。
 * 扱ったら true（＝オプチャとしては読まない）。
 */
function vnHandleImage_(ev, sentAt) {
  const uid = (ev.source && ev.source.userId) || "anon";
  const hint = vnHotelHintGet_(uid);
  if (!hint) return false;
  const mid = (ev.message && ev.message.id) || "";
  try { CacheService.getScriptCache().put("LASTIMG_" + uid, mid, 3600); } catch (e) {}
  const msg = vnHotelTry_(mid, sentAt || new Date(), hint.force);
  // 合図を出したうえでの写真なので、読めなかったときも黙らずに伝える（1行だけ）
  if (typeof lineReply_ === "function") {
    lineReply_(ev.replyToken || "",
      msg || ("🔍 くそっ!!!!やられた!!!!　" + (hint.force || "ホテル") +
        "の予定が読めません。明るいところなら、いけるかもしれません"));
  }
  return true;
}


/* ============ ホームページの読み取り ============ */
/*
 * ★ここは「どのサイトにも、だいたい効く」書き方にしてある。
 *   サイトごとに合わせて書くほうが正確だが、
 *   ・こちらからは各サイトの中身を確かめられない（通信が塞がれている）
 *   ・サイトの作りは、向こうの都合で勝手に変わる
 *   ので、決め打ちにすると、変わった日から黙って何も出なくなる。
 *
 *   そこで「その日の日付が書いてある行を見つけて、その周りを読む」という
 *   いちばん壊れにくいやり方にした。読めたものは [13] の一覧で
 *   そのまま目で確かめられるので、外していればすぐ分かる。
 */

/** &nbsp; などを、ふつうの文字に戻す */
function vnEntity_(t) {
  return String(t)
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#0*39;/g, "'")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); });
}

/** HTMLを「行のならんだ文字」にする。表の1行＝1件のことが多いので、行を残す */
function vnLines_(html) {
  let t = String(html || "");
  t = t.replace(/<script[\s\S]*?<\/script>/gi, " ")
       .replace(/<style[\s\S]*?<\/style>/gi, " ")
       .replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<\s*br[^>]*>/gi, "\n")
       .replace(/<\/(p|div|li|tr|h[1-6]|dt|dd|section|article|table)\s*>/gi, "\n")
       .replace(/<\/(td|th)\s*>/gi, "　");
  t = t.replace(/<[^>]+>/g, " ");
  t = vnEntity_(t);
  return t.split("\n")
    .map(function (x) { return x.replace(/[ \t ]+/g, " ").trim(); })
    .filter(function (x) { return x !== ""; });
}

/** その日を表す書き方（9月15日 / 9/15 / 09-15）にあたるか */
function vnDateRe_(d) {
  const m = d.getMonth() + 1, day = d.getDate();
  const p2 = function (n) { return ("0" + n).slice(-2); };
  return new RegExp(
    "(^|[^0-9])(" +
    m + "\\s*月\\s*" + day + "\\s*日" + "|" +
    m + "\\s*[\\/／.]\\s*" + day + "|" +
    p2(m) + "\\s*[\\/／.\\-]\\s*" + p2(day) +
    ")([^0-9]|$)");
}

/** 「何かの日付が書いてある行」か（次の日の始まりを見つけるため） */
function vnAnyDateRe_() {
  return /(\d{1,2}\s*月\s*\d{1,2}\s*日|\d{1,2}\s*[\/／]\s*\d{1,2})/;
}

/** 行のかたまりから、催しの名前になりそうなところを拾う */
function vnTitleOf_(block) {
  let best = "";
  block.join("　").split(/[　|｜/]/).forEach(function (piece) {
    const t = piece.replace(/\s+/g, " ").trim();
    if (t.length < 3 || t.length > 40) return;
    if (/^\d/.test(t)) return;                                  // 日付・時刻だけの断片
    if (/^(開場|開演|開始|終了|終演|キックオフ|試合|予定|詳細|チケット|一覧|カレンダー|お知らせ)$/.test(t)) return;
    if (!/[ぁ-んァ-ヶ一-龥A-Za-z]/.test(t)) return;
    if (t.length > best.length) best = t;
  });
  return best;
}

/** 会場の種類から、終わりのおおよその時刻を見積もる（書いていないとき用） */
function vnGuessEnd_(venue, start) {
  const v = VN_VENUES[venue] || {};
  const h = vnHourOf_(start);
  if (h === null) return "";
  const add = v.type === "スタジアム" ? 2.0
            : v.type === "ドーム" || v.type === "ホール" || v.type === "野外" ? 2.5
            : v.type === "展示場" ? 1.0 : 2.0;
  const t = h + add;
  const hh = Math.floor(t) % 24, mm = Math.round((t % 1) * 60);
  return ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2);
}

/** 1つのサイトから、その日のぶんを読む。戻り値は {events, note} */
function vnScrapeOne_(src, day) {
  const out = { events: [], note: "", size: 0, code: 0 };
  let res;
  try {
    res = UrlFetchApp.fetch(src.url, {
      muteHttpExceptions: true, followRedirects: true,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TaxiReport/1.0)" }
    });
  } catch (e) {
    out.note = "❌ つながりませんでした（" + (e && e.message ? e.message : e) + "）";
    return out;
  }
  out.code = res.getResponseCode();
  let html = "";
  try { html = res.getContentText(); }
  catch (e) { try { html = res.getContentText("Shift_JIS"); } catch (e2) { html = ""; } }
  out.size = html.length;
  if (out.code !== 200 || !html) { out.note = "❌ 中身が取れませんでした（" + out.code + "）"; return out; }

  const lines = vnLines_(html);
  const joined = lines.join("").length;
  if (joined < 500) {
    out.note = "❌ 開いたあとに中身を作る作り（JavaScript）のようで、文字が取れません（" + joined + "文字）";
    return out;
  }

  const dre = vnDateRe_(day), any = vnAnyDateRe_();
  const starts = [];
  lines.forEach(function (ln, i) { if (dre.test(ln)) starts.push(i); });
  if (!starts.length) {
    out.note = "⚠️ その日の日付が見当たりません（ページに載っていないか、日付の書き方が違います）";
    return out;
  }

  starts.slice(0, 5).forEach(function (i) {
    // 日付の行から、次の日付の行の手前まで（最大6行）をひとかたまりとして読む
    const block = [lines[i]];
    for (let j = i + 1; j < lines.length && block.length < 6; j++) {
      if (any.test(lines[j])) break;
      block.push(lines[j]);
    }
    const text = block.join("　");
    const times = (text.match(/\d{1,2}:\d{2}/g) || []);
    let start = "", end = "";
    const kick = text.match(/(キックオフ|開演|試合開始)[^0-9]{0,6}(\d{1,2}:\d{2})/);
    const fin  = text.match(/(終了|終演)[^0-9]{0,6}(\d{1,2}:\d{2})/);
    if (kick) start = kick[2];
    else if (times.length) start = times[0];
    if (fin) end = fin[2];
    else if (times.length >= 2 && times[1] !== start) end = times[1];

    let guessed = false;
    if (!end && start) { end = vnGuessEnd_(src.name, start); guessed = !!end; }

    out.events.push({
      venue: src.name, kind: src.kind || "event",
      icon: src.kind === "barasi" ? "🔧" : "🎤",
      title: vnTitleOf_(block) || "（名前を読み取れませんでした）",
      start: start, end: end, endGuess: guessed, people: 0, url: src.url,
      raw: text.slice(0, 120)
    });
  });

  if (!out.events.length) out.note = "⚠️ 日付は見つかりましたが、中身を読み取れませんでした";
  return out;
}

/** 全部のサイトから、その日のぶんを読む（vnTodayEvents_ がここを拾う） */
function vnScrapeAll_(day) {
  const out = [];
  VN_SOURCES.forEach(function (src) {
    try {
      vnScrapeOne_(src, day).events.forEach(function (e) { out.push(e); });
    } catch (e) { if (typeof logErr_ === "function") logErr_("vnScrape:" + src.name, e); }
  });
  return out;
}

/**
 * いま何が読み取れているかの一覧。
 * 「読めているつもりで、実は何も読めていない」を防ぐための画面。
 */
function vnReadStatus_(day) {
  const d = day || new Date();
  const L = ["🔎 " + vnDayLabel_(d) + " の読み取り状況", ""];
  let total = 0;

  VN_SOURCES.forEach(function (src) {
    let r;
    try { r = vnScrapeOne_(src, d); }
    catch (e) { r = { events: [], note: "❌ " + (e && e.message ? e.message : e) }; }
    L.push("■ " + src.name);
    if (r.events.length) {
      total += r.events.length;
      L.push("　✅ " + r.events.length + "件 読めました");
      r.events.forEach(function (e) {
        const when = e.start && e.end ? e.start + "〜" + e.end + (e.endGuess ? "(終わりは予想)" : "")
                   : e.start ? e.start + " 開始" : "時間を読み取れず";
        L.push("　・" + e.title + "　" + when);
        L.push("　　（読んだ文字：" + e.raw + "）");
      });
      const kept = r.events.filter(vnInTimeRange_).length;
      if (kept < r.events.length) {
        L.push("　※ このうち " + (r.events.length - kept) + "件は 18:00〜翌04:00 の外なので出しません");
      }
    } else {
      L.push("　" + (r.note || "⚠️ 読めませんでした"));
    }
    L.push("");
  });

  const hotel = vnHotelForDay_(d);
  L.push("■ ホテル（LINEで送られた資料）");
  if (hotel.length) {
    total += hotel.length;
    hotel.forEach(function (h) {
      L.push("　・" + h.venue + "　" + h.title + "　" +
             ([h.start, h.end].filter(String).join("〜") || "時間不明"));
    });
  } else {
    L.push("　まだ届いていません（「↓帝国」と打ってから写真を送ってください）");
  }
  L.push("");
  L.push("合計 " + total + "件 読めました。");
  L.push("※ 中身がおかしければ、そのまま教えてください。読み方を直します。");
  return L.join("\n");
}


/* ============ 事前のお知らせ（3つの受け取り方）============ */
/*
 * 「その日ぜんぶ」を朝に1回もらっても、夜には忘れている。
 * 気になる催しだけ、稼ぎどきの少し前にもう一度知らせる。
 *
 * 受け取り方は3つ。イベントごとにボタンで選ぶ。
 *   ⏰ カレンダー … スマホのカレンダーに予定として入れる
 *                  （Android の標準は「Googleカレンダー」。iPhone でも同じボタンで入る）
 *   💬 Discord   … みんなのDiscordに流す
 *   📱 自分のLINE … 押した人の個人LINEにだけ届く
 *
 * ★知らせるのは「終わりの◯分前」。
 *   稼ぎどきは終演のときなので、始まりではなく終わりを基準にする。
 *   終わりが分からない催しだけ、始まりを基準にする。
 */

/** 何分前に知らせるか（設定「イベントのお知らせは何分前」／既定60分） */
function vnLeadMin_() {
  try {
    if (typeof cfg_ === "function") {
      const v = parseInt(cfg_("イベントのお知らせは何分前"), 10);
      if (v >= 5 && v <= 300) return v;
    }
  } catch (e) {}
  return 60;
}

/** その日のイベントを覚えておく（ボタンが押されたとき、どれのことか分かるように） */
function vnDayKey_(d) {
  return "VNDAY_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}
function vnDaySave_(d, events) {
  const slim = (events || []).map(function (e) {
    return { venue: e.venue, title: e.title, start: e.start, end: e.end, url: e.url };
  });
  try { PropertiesService.getScriptProperties().setProperty(vnDayKey_(d), JSON.stringify(slim)); } catch (e) {}
}
function vnDayLoad_(d) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(vnDayKey_(d)) || "[]"); }
  catch (e) { return []; }
}

/** その催しで「知らせるべき時刻」（終わりの◯分前。分からなければ始まりの◯分前） */
function vnRemindAt_(ev, day) {
  const base = ev.end || ev.start;
  const h = vnHourOf_(base);
  if (h === null) return 0;
  const t = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  // vnHourOf_ は 0〜11時を +24 して返す（翌日あつかい）
  t.setHours(0, 0, 0, 0);
  const ms = t.getTime() + Math.round(h * 60) * 60000 - vnLeadMin_() * 60000;
  return ms;
}

/** Googleカレンダーに予定を入れるためのURL */
function vnCalUrl_(ev, day) {
  const z = function (n) { return ("0" + n).slice(-2); };
  const at = function (hhmm, fallbackHour) {
    const h = vnHourOf_(hhmm);
    const use = (h === null) ? fallbackHour : h;
    // 日本時間 → 世界標準時（9時間ひく）
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    d.setHours(0, 0, 0, 0);
    const ms = d.getTime() + Math.round(use * 60) * 60000 - 9 * 3600000;
    const u = new Date(ms);
    return u.getUTCFullYear() + z(u.getUTCMonth() + 1) + z(u.getUTCDate()) + "T" +
           z(u.getUTCHours()) + z(u.getUTCMinutes()) + "00Z";
  };
  const s = at(ev.start || ev.end, 20);
  const e = at(ev.end || ev.start, 22);
  const v = VN_VENUES[ev.venue] || {};
  const title = "🚕 " + ev.venue + "　" + (ev.title || "");
  const detail = [
    ev.start || ev.end ? "時間：" + [ev.start, ev.end].filter(String).join("〜") : "",
    v.near && v.near.length ? "近い乗り場：" + v.near.join("・") : "",
    ev.url || ""
  ].filter(String).join("\n");
  return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
         "&text=" + encodeURIComponent(title) +
         "&dates=" + s + "/" + e +
         "&details=" + encodeURIComponent(detail) +
         "&location=" + encodeURIComponent(ev.venue);
}

/*
 * お知らせのボタン3つ。
 *
 * ★どれも「押したら合図を送るだけ」のボタンにしてある。
 *   カレンダーのリンクをボタンに直接입れると、URLが長いので
 *   1件あたり1,700バイトにもなり、催しが1通に入りきらなくなる。
 *   （実測：見本4件で12,358バイト。LINEの上限は10,000バイト）
 *   押されたあとに、返事としてリンクを送る形にすれば 1件450バイトで済む。
 *   ひと手間増えるが、催しが丸ごと消えるよりずっとよい。
 */
function vnBellBtn_(mark, label, ymd, idx) {
  return { "type": "button", "style": "link", "height": "sm", "color": VN_COLOR_HEAD,
           "action": { "type": "postback", "label": label,
                       "data": "vn=" + mark + "&d=" + ymd + "&i=" + idx } };
}

function vnBellRow_(ev, idx, day) {
  const ymd = day.getFullYear() + ("0" + (day.getMonth() + 1)).slice(-2) + ("0" + day.getDate()).slice(-2);
  return { "type": "box", "layout": "horizontal", "margin": "xs",
    "backgroundColor": "#ffffff", "cornerRadius": "md",
    "borderWidth": "1px", "borderColor": "#b39ddb",
    "contents": [
      vnBellBtn_("cal", "⏰予定", ymd, idx),
      vnBellBtn_("dc",  "💬DC",  ymd, idx),
      vnBellBtn_("me",  "📱自分", ymd, idx)
    ]};
}

/* ---- 予約のしまい場所 ---- */

function vnRemQueue_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty("VN_REMIND") || "[]"); }
  catch (e) { return []; }
}
function vnRemSave_(list) {
  try {
    PropertiesService.getScriptProperties()
      .setProperty("VN_REMIND", JSON.stringify((list || []).slice(0, 60)));
  } catch (e) {}
}

/** 予約を1つ足す。同じ人・同じ催し・同じ知らせ方なら二重にしない */
function vnRemAdd_(at, how, to, ev) {
  const list = vnRemQueue_();
  const id = how + "|" + to + "|" + ev.venue + "|" + (ev.title || "");
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return false;
  list.push({ id: id, at: at, how: how, to: to,
              venue: ev.venue, title: ev.title || "", start: ev.start || "", end: ev.end || "",
              url: ev.url || "" });
  vnRemSave_(list);
  return true;
}

/** 知らせる文 */
function vnRemText_(r) {
  const v = VN_VENUES[r.venue] || {};
  const when = r.end ? r.end + " 終了" : (r.start ? r.start + " 開始" : "時間不明");
  return "⏰ 早くなんとかしないと…\n" +
         "🎪 " + r.venue + (r.title ? "　" + r.title : "") + "\n" +
         "🕒 " + when + "\n" +
         (v.near && v.near.length ? "📍 近い乗り場：" + v.near.join("・") + "\n" : "") +
         (r.url ? r.url : "");
}

/** Discord に流す（送り先は スクリプトプロパティ DISCORD_WEBHOOK にだけ置く） */
function vnDiscord_(text) {
  const url = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK") || "";
  if (!url) return "Discordの送り先が未設定です（メニュー「💬 Discordの送り先を設定」）";
  try {
    const res = UrlFetchApp.fetch(url, {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ content: text })
    });
    const c = res.getResponseCode();
    return (c >= 200 && c < 300) ? "" : "Discordに送れませんでした（" + c + "）";
  } catch (e) { return "Discordに送れませんでした（" + (e && e.message ? e.message : e) + "）"; }
}

/** 時間が来た予約を送る。5分おきの見張りから呼ばれる */
function vnRemindTick_() {
  const list = vnRemQueue_();
  if (!list.length) return;
  const now = Date.now();
  const keep = [];
  list.forEach(function (r) {
    if (r.at > now) { keep.push(r); return; }
    // 3時間以上すぎたものは、もう送らない（止まっていた間のぶんが一気に飛ばないように）
    if (now - r.at > 3 * 3600000) return;
    try {
      if (r.how === "dc") vnDiscord_(vnRemText_(r));
      else if (typeof lrPush_ === "function") lrPush_(r.to, [{ type: "text", text: vnRemText_(r) }]);
    } catch (e) { if (typeof logErr_ === "function") logErr_("vnRemind", e); }
  });
  vnRemSave_(keep);
}

/**
 * ボタンが押されたときの受け口（001-Code のウェブフックから呼ばれる）。
 * 扱ったら true。
 */
function vnHandlePostback_(ev) {
  const data = (ev && ev.postback && ev.postback.data) || "";
  if (String(data).indexOf("vn=") !== 0) return false;
  const q = {};
  String(data).split("&").forEach(function (kv) {
    const i = kv.indexOf("=");
    if (i > 0) q[kv.slice(0, i)] = kv.slice(i + 1);
  });
  const reply = (ev && ev.replyToken) || "";
  const say = function (t) { if (typeof lineReply_ === "function") lineReply_(reply, t); };

  const ymd = String(q.d || "");
  if (!/^\d{8}$/.test(ymd)) { say("わけがわからない…　どの日のことでしょう"); return true; }
  const day = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
  const list = vnDayLoad_(day);
  const item = list[Number(q.i)];
  if (!item) { say("だ…ダメだ…その催しが見つからない…"); return true; }

  // ⏰ カレンダー … リンクを返事で送る（ボタンに直接入れると長すぎるため）
  if (q.vn === "cal") {
    const v = VN_VENUES[item.venue] || {};
    say("⏰ わ…私は仰せの通りに…\n" +
        "🎪 " + item.venue + (item.title ? "　" + item.title : "") + "\n" +
        "🕒 " + ([item.start, item.end].filter(String).join("〜") || "時間不明") + "\n" +
        (v.near && v.near.length ? "📍 " + v.near.join("・") + "\n" : "") +
        vnCalUrl_(item, day));
    return true;
  }

  const at = vnRemindAt_(item, day);
  if (!at) { say("⏰ だ…ダメだ…時間が分からない…"); return true; }

  const lead = vnLeadMin_();
  const base = item.end ? "終わり" : "始まり";
  if (at <= Date.now()) {
    // もう過ぎている。いま1回だけ送る
    const r = { how: q.vn, to: (ev.source && ev.source.userId) || "", venue: item.venue,
                title: item.title, start: item.start, end: item.end, url: item.url };
    const err = (q.vn === "dc") ? vnDiscord_(vnRemText_(r))
              : (typeof lrPush_ === "function" && r.to) ? (lrPush_(r.to, [{ type: "text", text: vnRemText_(r) }]), "")
              : "送り先が分かりませんでした";
    say(err ? "⚠️ " + err : "⏰ 遅い!!!! …が、いま届けました。計★画★通★り");
    return true;
  }

  const to = (q.vn === "dc") ? "discord" : ((ev.source && ev.source.userId) || "");
  if (q.vn === "me" && !to) { say("うわあああ!!!! 送り先が分からない!!!!"); return true; }
  const added = vnRemAdd_(at, q.vn, to, item);
  const hhmm = ("0" + new Date(at).getHours()).slice(-2) + ":" + ("0" + new Date(at).getMinutes()).slice(-2);
  const mins = Math.max(1, Math.round((at - Date.now()) / 60000));
  say(added
    ? "⏰ ノートに書きました。あと" + mins + "分…\n" +
      hhmm + " に" + (q.vn === "dc" ? "Discordへ" : "あなたのLINEへ") +
      "（" + item.venue + " の" + base + "の" + lead + "分前）"
    : "⏰ それはもうノートに書いてある");
  return true;
}

/** Discordの送り先を決める（メニュー） */
function menuVenueDiscord() {
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return "画面から実行してください"; }
  const now = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK") || "";
  const r = ui.prompt("💬 Discordの送り先",
    "Discord の チャンネル設定 → 連携サービス → ウェブフック で作った URL を貼ってください。\n" +
    "（空のまま OK を押すと、Discordへの通知を止めます）\n\n" +
    "いま：" + (now ? "設定ずみ" : "未設定"), ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return "そのままにしました";
  const v = String(r.getResponseText() || "").trim();
  const pr = PropertiesService.getScriptProperties();
  if (!v) { pr.deleteProperty("DISCORD_WEBHOOK"); return "💬 Discordへの通知を止めました"; }
  if (v.indexOf("https://discord.com/api/webhooks/") !== 0 &&
      v.indexOf("https://discordapp.com/api/webhooks/") !== 0) {
    ui.alert("⚠️ これは Discord のウェブフックのURLではないようです。\n" +
             "https://discord.com/api/webhooks/… で始まるものを貼ってください。");
    return "❌ 入れませんでした";
  }
  pr.setProperty("DISCORD_WEBHOOK", v);
  const err = vnDiscord_("✅ つながりました（テスト送信）");
  ui.alert(err ? "入れましたが、送れませんでした：\n" + err
               : "✅ 入れました。Discordにテストを1件送りました。");
  return err ? "⚠️ " + err : "✅ Discordの送り先を入れました";
}


/* ============ その日の分をそろえる ============ */

/** イベント1件に、実績・推定・助言を足す */
function vnDecorate_(e) {
  const v = VN_VENUES[e.venue] || {};
  const st = vnPlaceStats_(v.near, VN_FROM_HOUR, VN_TO_HOUR);
  const c = {};
  for (const k in e) c[k] = e[k];
  c.stats  = vnStatsLine_(st) || "自社の記録：この乗り場の記録はまだありません";
  c.advice = vnAdvice_(e.venue, e.end, st);
  try {
    const ti = vnTopicInfo_(e.title, e.venue);
    c.guess = ti.audience; c.know = ti.know; c.avoid = ti.avoid;
  } catch (err) { c.guess = ""; c.know = ""; c.avoid = ""; }
  return c;
}

/**
 * その日に出すイベントをそろえる。
 *
 * いまのところ、確かに取れるのは「LINEで送ってもらったホテルの資料」だけ。
 * ホームページの読み取りは [9] の調査結果を見てから作る。
 * 作ったら vnScrapeAll_ という名前で足せば、ここが勝手に拾う。
 */
function vnTodayEvents_(day) {
  let out = [];
  try { out = out.concat(vnHotelForDay_(day)); } catch (e) { if (typeof logErr_ === "function") logErr_("vnHotel", e); }
  if (typeof vnScrapeAll_ === "function") {
    try { out = out.concat(vnScrapeAll_(day) || []); } catch (e) { if (typeof logErr_ === "function") logErr_("vnScrape", e); }
  }
  return out.filter(vnInTimeRange_).filter(vnBigEnough_).map(vnDecorate_);
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
function vnAutoOn_() {
  const p = PropertiesService.getScriptProperties().getProperty("VN_AUTO");
  if (p === "1") return true;
  if (p === "0") return false;
  try { if (typeof cfg_ === "function") return cfg_("イベント情報を自動で送る") === "はい"; } catch (e) {}
  return false;                       // 何も決まっていなければ「送らない」
}

/** 自動発信の入切（true で入、false で切） */
function vnAutoSet_(on) {
  PropertiesService.getScriptProperties().setProperty("VN_AUTO", on ? "1" : "0");
  if (on) vnEnsureDailyTrigger_(false);
  return on;
}

/** 「もう今日は送った」の印 */
function vnSentKey_(d) {
  return "VNSENT_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

/**
 * 15分おきに呼ばれて、16:45 を過ぎていたらその日の分を1回だけ送る。
 *
 * Apps Script の「毎日この時刻」は前後に30分ほどずれることがあるため、
 * 時計を見る形にしてある（16:45〜17:00 ごろに届く）。
 */
function venueDailyJob() {
  let lock = null;
  try {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;
  } catch (e) { lock = null; }
  try {
    // ★お知らせの予約は、自動発信が切ってあっても届ける。
    //   これは「自分で押した人」への約束なので、全体の入切とは別。
    try { vnRemindTick_(); } catch (e) { if (typeof logErr_ === "function") logErr_("vnRemindTick", e); }

    if (!vnAutoOn_()) return;

    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const from = VN_SEND_HOUR * 60 + VN_SEND_MIN;
    if (mins < from || mins > from + VN_SEND_WINDOW) return;

    const pr = PropertiesService.getScriptProperties();
    const key = vnSentKey_(now);
    if (pr.getProperty(key)) return;                    // その日はもう済んでいる

    const events = vnTodayEvents_(now);
    if (!events.length) { pr.setProperty(key, "none"); return; }   // 無い日は送らない

    const to = vnGroupTarget_();
    if (!to) {
      if (typeof logErr_ === "function") logErr_("eventDaily", new Error("グループの送り先が分かりません"));
      return;                                            // 印は残さない（分かったら送れるように）
    }
    if (typeof lrPush_ !== "function") return;
    vnDaySave_(now, events);          // ボタンが押されたとき、どの催しか引けるように
    lrPush_(to, vnFitMessages_(now, events, ""));
    pr.setProperty(key, "1");
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("eventDaily", e);
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (e) {} }
  }
}

/** 5分おきの見張りを用意する（重ねて作らない） */
function vnEnsureDailyTrigger_(force) {
  let list = [];
  try { list = ScriptApp.getProjectTriggers(); } catch (e) { return false; }
  let keep = null;
  list.forEach(function (t) {
    const fn = t.getHandlerFunction();
    // V006ver で名前が変わった。前の名前のままの見張りは迷子なので消す
    if (fn === "eventDailyJob") { try { ScriptApp.deleteTrigger(t); } catch (e) {} return; }
    if (fn !== "venueDailyJob") return;
    if (keep || force) { try { ScriptApp.deleteTrigger(t); } catch (e) {} }
    else keep = t;
  });
  if (keep && !force) return true;
  try {
    // ★15分おき。5分おきにすると、1日に288回も動く。
    //   Googleが1日にくれる「決められた時間」は決まっていて、
    //   1分おきのボタンの見張りと合わせると使い切ってしまい、
    //   見張りごと止まってしまう（実際に止まった）。
    ScriptApp.newTrigger("venueDailyJob").timeBased().everyMinutes(15).create();
    return true;
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("vnTrigger", e);
    return false;
  }
}

/** いまの状態を、そのまま読める文にする */
function vnAutoStatusText_() {
  const L = [];
  const on = vnAutoOn_();
  L.push(on ? "✅ 自動発信：入っています" : "⏸ 自動発信：切ってあります");
  L.push("送る時刻：毎日 " + VN_SEND_HOUR + ":" + ("0" + VN_SEND_MIN).slice(-2) +
         "（実際に届くのは " + VN_SEND_HOUR + ":" + ("0" + VN_SEND_MIN).slice(-2) +
         "〜" + (VN_SEND_HOUR + 1) + ":00 ごろ）");
  L.push("その日に出すものが1件も無ければ、1通も送りません");

  let has = false;
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === "venueDailyJob") has = true;
    });
  } catch (e) {}
  L.push(has ? "時計の見張り：✅ できています（15分おき）"
             : "時計の見張り：❌ ありません（入にすると作られます）");

  const to = vnGroupTarget_();
  L.push(to ? "送り先：✅ グループを覚えています" : "送り先：❌ 分かりません（グループLINEに何か1つ投稿すると覚えます）");

  const today = vnTodayEvents_(new Date());
  L.push("きょう出せるもの：" + today.length + "件" +
         (today.length ? "（" + today.map(function (e) { return e.venue; }).join("・") + "）" : ""));
  if (typeof vnScrapeAll_ !== "function") {
    L.push("※ ホームページの読み取りはまだ作っていません。いまはLINEで送ったホテルの資料だけが出ます。");
  }
  return L.join("\n");
}


/* ============ メニュー／そうさボタン ============ */

/**
 * そうさボタン [9] の中身。
 * 結果らんに出しつつ、自分のLINEにも送る（グループには絶対に送らない）。
 */
function panelVenueProbe() {
  const r = vnProbeSendToMe();
  const head = r.err
    ? "⚠️ 自分のLINEには送れませんでした：" + r.err
    : "📱 同じ内容を、まーく個人のLINEにだけ送りました（テスト送信）";
  return head + "\n\n" + r.text;
}

/**
 * きょう16:45に出るはずのものを、そのまま自分のLINEにだけ送ってみる（テスト）。
 * グループに出す前に、本物と同じ中身を自分の目で確かめられる。
 */
function menuVenueTestSend() {
  const err = vnSendTodayToMe();
  const n = vnTodayEvents_(new Date()).length;
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
function menuVenueSample() {
  const err = vnSendSampleToMe();
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
function menuVenueProbe() {
  const r = vnProbeSendToMe();
  const text = (r.err ? "⚠️ 自分のLINEには送れませんでした：" + r.err
                      : "📱 同じ内容を、まーく個人のLINEにだけ送りました") + "\n\n" + r.text;
  try { infoSet_(INFO_ROW.EVENT, text, "イベント調査"); } catch (e) {}
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
function panelVenueAuto() {
  const c = CacheService.getScriptCache();
  const on = vnAutoOn_();
  const want = on ? "切る" : "入れる";

  if (c.get("VN_AUTO_STEP") === (on ? "off" : "on")) {
    c.remove("VN_AUTO_STEP");
    vnAutoSet_(!on);
    return (on ? "⏸ 自動発信を切りました。"
               : "✅ 自動発信を入れました。") +
      "\n\n" + vnAutoStatusText_();
  }

  c.put("VN_AUTO_STEP", on ? "off" : "on", 180);
  return vnAutoStatusText_() +
    "\n\n──────\n" +
    "▶ " + want + "には、3分以内にもう一度チェックしてください。\n" +
    "（1回押しただけでは変わりません。グループに出ていくものなので、わざと2回にしています）";
}

/** メニューから、自動発信の状態を見る／入切する */
function menuVenueAuto() {
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return vnAutoStatusText_(); }
  const res = ui.alert("🎪 イベント情報の自動発信",
    vnAutoStatusText_() + "\n\n──────────\n「はい」で入れます。「いいえ」で切ります。",
    ui.ButtonSet.YES_NO_CANCEL);
  if (res === ui.Button.YES) {
    vnAutoSet_(true);
    ui.alert("✅ 入れました", vnAutoStatusText_(), ui.ButtonSet.OK);
    return "✅ 入れました";
  }
  if (res === ui.Button.NO) {
    vnAutoSet_(false);
    ui.alert("⏸ 切りました", vnAutoStatusText_(), ui.ButtonSet.OK);
    return "⏸ 切りました";
  }
  return "そのままにしました";
}

/**
 * 「きょう送るはずのもの」を、自分のLINEにだけ送ってみる。
 * グループに出す前に、中身を自分の目で確かめるための道。
 */
function vnSendTodayToMe() {
  const day = new Date();
  const events = vnTodayEvents_(day);
  const to = vnTestTarget_();
  if (!to) return "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  if (typeof lrPush_ !== "function") return "003-LineReport が古いので送れません";
  const note = "※ これはテスト送信です（まーく個人のみ）。グループには送っていません。";
  try {
    vnDaySave_(day, events);
    lrPush_(to, vnFitMessages_(day, events, note));
    return "";
  } catch (e) { return (e && e.message ? e.message : String(e)); }
}


/* ============ [13] 読み取れているものの一覧 ============ */

/**
 * いま何が読み取れているかを、そのまま見せる。
 *
 * ★「動いているつもりで、実は何も読めていない」がいちばん怖い。
 *   読んだ元の文字までそのまま出すので、外していれば目で分かる。
 */
function panelVenueList() {
  const text = vnReadStatus_(new Date());
  const err = vnSend_(text, "test");
  return (err ? "⚠️ 自分のLINEには送れませんでした：" + err
              : "📱 同じ内容を、まーく個人のLINEにだけ送りました") + "\n\n" + text;
}

/** メニューからも見られるようにする */
function menuVenueList() {
  const text = vnReadStatus_(new Date());
  const err = vnSend_(text, "test");
  try { infoSet_(INFO_ROW.READ, text, "読み取り状況"); } catch (e) {}
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🔎 読み取れているものの一覧", text.slice(0, 1400), ui.ButtonSet.OK);
  } catch (e) {}
  return err ? "❌ " + err : text;
}
