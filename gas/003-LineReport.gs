/**
 * ================================================================
 *  LINE画像（Flex Message）＋ まとめスプシ レポート作成
 *
 *  ★★★  L007ver  （2026/09/06）  ★★★
 *
 *  ファイル記号: C=001-Code.gs / L=003-LineReport.gs / E=002-Extras.gs
 *  直したら数字を1つ増やし、下の履歴に何を直したか書く。
 *  いま動いているバージョンは メニュー「ℹ️ バージョンを確認」で見られる。
 *
 *  [L007ver]
 *  ▼ LINEの絵（Flex Message）
 *   ・【曜日・時間】を【時間詳細】に作り直した
 *     前：🔥新地4 (16件/平￥5,273) [(月) 23:37, (月) 23:34, …30個]
 *     今：[23:51] 🔥新地4 （15件／平均￥6,758／最高￥18,960）
 *     時刻は「いちばん高かった乗車の時刻」を1つだけ。最高額も出す
 *     時刻を全部ならべると読めないうえ、Flexの上限50KBにも近づいて危なかった
 *   ・パーセントを帯の「中」に出すようにした（前は帯の上に左詰めで、色と数字が対応しなかった）
 *     細すぎて中に書けないぶんは、帯の下に小さく添える
 *   ・件数の内訳を読めるようにした（北7:41/北4:41 → 北7 41件 ・ 北4 41件）
 *   ・絵を組み立てるところを buildReportFlex_ に切り出し、テストで形を確かめるようにした
 *     送ってみるまで分からない、という状態をなくす
 *
 *  ▼ まとめスプシ（ダッシュボード）
 *   ・タブ名を「📈 8/16(日)～9/15(火)」にした（前は開始日だけだった）
 *   ・スマホで読める幅にした。1列 50px（26列＝1,300px）→ 16px（416px）
 *     文字は 8pt → 11〜14pt。横に広げず、縦に伸ばす
 *   ・「－」だけの行と列を作らないようにした
 *     アツい×避ける表は曜日区分ごとに縦に積み、記録がある時間帯だけ出す
 *     ヒートマップも、記録がある曜日だけ列にする
 *   ・グラフを直した。●を 4px → 12px、線を 1px → 2px の点線、日付の一覧は下へ
 *   ・🤖 傾向と対策：AIの呼び方を「乗り場ごとに1回」→「まとめて1回」にした
 *     20か所あれば20回呼んでいたので、無料枠の回数制限にすぐ当たって全行エラーになっていた
 *     それでも失敗したときは、数字から作った文を出す（エラー文を並べない）
 *   ・備考の表示崩れを直した。手で入れた改行をつなげ、横いっぱいの行に中央ぞろえで出す
 *
 *  [L006ver]
 *   ・そうさボタン [7]「レポートをLINEに送る」を足した（スマホから期間を決めて送れる）
 *     ・「説明」タブの ▼レポートの期間 ／ ▼レポートの送り先 を読む
 *     ・期間はプルダウンから選べる。無い期間は 260716-0815 のように打ち込む
 *     ・末尾に t を付けると自分だけ、h を付けるとグループ（例 260716-0815t）
 *     ・グループ（本番）は1回目では送らず、3分以内にもう一度チェックで確定
 *     ・本番で送ったあとは、送り先らんを自動で「自分だけ」に戻す
 *   ・メニューのレポート送信も、宛先の決め方を上とそろえた
 *     （テストの宛先を、設定タブ「テスト送信先（自分のLINE）」から読む）
 *   ・メニューに「🗺 乗り場にマップリンクを貼る／行き先を確認する」を足した
 *
 *  [L005ver]
 *   ・ファイル名を 003-LineReport.gs にした（中身の動きは変えていない）
 *
 *  [L004ver]
 *   ・裏メッセージの文面を「設定」タブから変えられるようにした
 *     {期間} が 8/16(日)～9/15(月) に置き換わる
 *     Code.gs の設定が読めないときは、今までの文面のまま
 *
 *  [L003ver]
 *   ・バージョン確認の表示を K → C に変更（Code.gs に合わせた）
 *
 *  [L002ver]
 *   ・setupReportMenu のポップアップを削除（毎回出て邪魔だったため）
 *   ・起動時トリガーが setupReportMenu に向いていた場合も自動で直すようにした
 *     （そのままだと毎回作り直しが走り、メニューが二重に出ることがある）
 *
 *  [L001ver] v185 のレポート部分を取り出して作り直したもの
 *   ・鍵をコードから追い出した（LINEトークン・Geminiキーは設定に保存）
 *   ・友だち全員への配信を止めた（送信先未設定ならエラーで停止）
 *   ・プルダウンに曜日を入れ、記録がある月までしか作らないようにした
 *   ・裏メッセージを「📈8/16(日)～9/2(水)レポート作成 byシバンニ」に
 *   ・廃止済みの gemini-1.5-flash を差し替え（AI分析が全行エラーだった原因）
 *   ・AIのエラー文を、原因が分かる形にした（404=モデル / 403=鍵 / 429=制限）
 *   ・グラフをA〜Z列の幅に合わせ、下に25行ぶん空けて重なりを解消
 *   ・コード.gs を触らずメニューを出せるようにした（setupReportMenu）
 * ================================================================
 */

/** このファイルのバージョン */
const LR_VERSION = "L007ver";


/* ============ 鍵（コードに書かない） ============ */

/**
 * LINEチャネルアクセストークン。
 * v232 のメニュー「🔑 LINEトークンを設定」で保存したものを使う。
 */
function getLineToken_() {
  const t = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
  if (!t) throw new Error("LINEトークンが未設定です。メニュー「🔑 LINEトークンを設定」から登録してください。");
  return t;
}

/**
 * Gemini APIキー。
 * メニュー「🤖 Geminiキーを設定」から保存する。
 */
function getGeminiKey_() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "";
}

/**
 * 使うGeminiのモデル名。
 * Googleは古いモデルを次々に止めるので、コードを触らず差し替えられるようにしておく。
 * スクリプトプロパティ GEMINI_MODEL に入れると、そちらが優先される。
 *
 * ※v185 が使っていた gemini-1.5-flash は既に廃止済みで、呼ぶと 404 が返る。
 *   ダッシュボードの「傾向と対策」が全行エラーになっていた原因はこれ。
 */
function getGeminiModel_() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL")
      || "gemini-3.1-flash-lite";
}

/** メニューから実行してモデル名を変える */
function menuSetGeminiModel() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt("Geminiのモデル名",
    "今: " + getGeminiModel_() + "\n\n例: gemini-3.1-flash-lite / gemini-3.5-flash",
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const v = res.getResponseText().trim();
  if (!v) return;
  PropertiesService.getScriptProperties().setProperty("GEMINI_MODEL", v);
  ui.alert("保存しました: " + v);
}

/** メニューから実行してGeminiのキーを保存する */
function menuSetGeminiKey() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt("Gemini APIキー", "APIキーを貼り付けてください。", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const k = res.getResponseText().trim();
  if (!k) return;
  PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", k);
  ui.alert("保存しました。");
}

/* ============ レポート専用の定数・道具 ============ */

const GRAPH_COLORS = ["#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
                      "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabed4"];

const TAB_COLORS = { "北7": "#e3f2fd", "北4": "#e8eaf6", "北他": "#e0f7fa",
                     "ﾐﾅﾐ": "#fce4ec", "関空": "#fff3e0", "ほか": "#f5f5f5" };

/** 祝日判定。HOLIDAYS は v232 側の定義を使う */
function isHolidayFunc(dateObj) {
  return HOLIDAYS.includes((dateObj.getMonth() + 1) + "/" + dateObj.getDate());
}

function normalizeStr(str) {
  if (!str) return "";
  let s = str.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
  }).trim();
  s = s.replace(/大丸乗り場|大丸乗場/g, "大丸");
  s = s.replace(/アポロワンビル/g, "アポロビル");
  return s;
}

function removeStreetSuffix(str) { return str ? str.replace(/(筋|通り|町|橋)$/, "") : ""; }

function toHalfWidthKana(str) {
  if (!str) return "";
  const kanaMap = { "ガ": "ｶﾞ", "ギ": "ｷﾞ", "グ": "ｸﾞ", "ゲ": "ｹﾞ", "ゴ": "ｺﾞ", "ザ": "ｻﾞ", "ジ": "ｼﾞ", "ズ": "ｽﾞ", "ゼ": "ｾﾞ", "ゾ": "ｿﾞ", "ダ": "ﾀﾞ", "ヂ": "ﾁﾞ", "ヅ": "ﾂﾞ", "デ": "ﾃﾞ", "ド": "ﾄﾞ", "バ": "ﾊﾞ", "ビ": "ﾋﾞ", "ブ": "ﾌﾞ", "ベ": "ﾍﾞ", "ボ": "ﾎﾞ", "パ": "ﾊﾟ", "ピ": "ﾋﾟ", "プ": "ﾌﾟ", "ペ": "ﾍﾟ", "ポ": "ﾎﾟ", "ヴ": "ｳﾞ", "ア": "ｱ", "イ": "ｲ", "ウ": "ｳ", "エ": "ｴ", "オ": "ｵ", "カ": "ｶ", "キ": "ｷ", "ク": "ｸ", "ケ": "ｹ", "コ": "ｺ", "サ": "ｻ", "シ": "ｼ", "ス": "ｽ", "セ": "ｾ", "ソ": "ｿ", "タ": "ﾀ", "チ": "ﾁ", "ツ": "ﾂ", "テ": "ﾃ", "ト": "ﾄ", "ナ": "ﾅ", "ニ": "ﾆ", "ヌ": "ﾇ", "ネ": "ﾈ", "ノ": "ﾉ", "ハ": "ﾊ", "ヒ": "ﾋ", "フ": "ﾌ", "ヘ": "ﾍ", "ホ": "ﾎ", "マ": "ﾏ", "ミ": "ﾐ", "ム": "ﾑ", "メ": "ﾒ", "モ": "ﾓ", "ヤ": "ﾔ", "ユ": "ﾕ", "ヨ": "ﾖ", "ラ": "ﾗ", "リ": "ﾘ", "ル": "ﾙ", "レ": "ﾚ", "ロ": "ﾛ", "ワ": "ﾜ", "ヲ": "ｦ", "ン": "ﾝ", "ー": "ｰ" };
  let reg = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');
  return str.replace(reg, function (match) { return kanaMap[match]; });
}

function getGridRange(sheet, startRow, startColIndex, rowCount, colSpanArray) {
  let ranges = []; let currentC = startColIndex;
  for (let i = 0; i < colSpanArray.length; i++) {
    let rng = sheet.getRange(startRow, currentC, rowCount, colSpanArray[i]);
    ranges.push(rng); currentC += colSpanArray[i];
  }
  return ranges;
}

/* ============ メニュー ============ */

/**
 * 「📊 レポート」メニューを足す。
 *
 * onOpen は1つのプロジェクトに1つしか置けない。統合スクリプト側に既に
 * onOpen があるので、そちらは触らず、この関数を「起動時トリガー」から
 * 呼んでもらう形にしている。
 *   エディタ左の ⏰（トリガー）→「トリガーを追加」
 *   → 実行する関数: onOpenReport
 *   → イベントのソース: スプレッドシートから
 *   → イベントの種類: 起動時
 *
 * 同じプロジェクトに 002-Extras があれば、それも一緒に出す。
 */
function onOpenReport() {
  const m = SpreadsheetApp.getUi().createMenu("📊 レポート");
  m.addItem("📤 レポートを手動送信", "showReportDialog");
  if (typeof menuStrategy === "function") m.addItem("🎯 立ち回り分析", "menuStrategy");
  if (typeof menuOpucha === "function")   m.addItem("🏷 オプチャ印を付ける／外す", "menuOpucha");
  if (typeof menuChartFit === "function") m.addItem("📐 グラフの大きさを揃える", "menuChartFit");
  if (typeof menuMapLinksApply === "function") {
    m.addItem("🗺 乗り場にマップリンクを貼る", "menuMapLinksApply");
    m.addItem("🗺 マップの行き先を確認する", "menuMapLinksCheck");
  }
  m.addSeparator();
  m.addItem("👥 グループIDを設定", "menuSetGroupId");
  m.addItem("🤖 Geminiキーを設定", "menuSetGeminiKey");
  m.addItem("🤖 Geminiのモデルを変える", "menuSetGeminiModel");
  m.addSeparator();
  m.addItem("ℹ️ バージョンを確認", "menuShowVersions");
  m.addToUi();
}

/**
 * いま動いているバージョンを表示する。
 * 手元のファイルと実際に動いているものがずれていないか、これで確かめられる。
 */
function menuShowVersions() {
  const rows = [];
  rows.push("001-Code       : " +
    (typeof CODE_VERSION === "string" ? CODE_VERSION : "入っていません"));
  rows.push("002-Extras     : " +
    (typeof EX_VERSION === "string" ? EX_VERSION : "入っていません"));
  rows.push("003-LineReport : " + LR_VERSION);

  const msg = "いま動いているバージョン\n──────────────\n" + rows.join("\n");
  SpreadsheetApp.getUi().alert(msg);
}

/**
 * ★これを1回だけ実行すれば、メニューが出るようになります。
 *   エディタ上部の関数選択で setupReportMenu を選び、▶実行 を押すだけ。
 *   ⏰（トリガー）の画面を触る必要はありません。
 *
 * 二重に作らないよう、既にあるものは消してから作り直します。
 */
function setupReportMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 起動時トリガーを作り直す。
  // setupReportMenu 自身に向いたトリガーがあると毎回作り直しが走るので、それも消す
  // （メニューが二重に出る原因にもなる）。
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const f = t.getHandlerFunction();
    if (f === "onOpenReport" || f === "setupReportMenu") {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  ScriptApp.newTrigger("onOpenReport").forSpreadsheet(ss).onOpen().create();

  // ポップアップは出さない。メニューが出ること自体が結果なので、確認は要らない。
  // （起動時トリガーが誤ってこの関数に向いていても、毎回ポップアップが出ないようにする）
  try { onOpenReport(); } catch (e) { console.log("メニュー作成: " + e.message); }
  console.log("setupReportMenu: 古いトリガー" + removed + "個を消し、onOpenReport を1つ設定しました");
}

/* ============ 期間（16日〜翌月15日） ============ */

const LR_DOW = ["日", "月", "火", "水", "木", "金", "土"];

/** その日が属する営業期間の開始日。16日起点 */
function lrPeriodStart_(d) {
  return (d.getDate() >= 16)
    ? new Date(d.getFullYear(), d.getMonth(), 16)
    : new Date(d.getFullYear(), d.getMonth() - 1, 16);
}

function lrFull_(d)  { return d.getFullYear() + "/" + pad2_(d.getMonth() + 1) + "/" + pad2_(d.getDate()) + "(" + LR_DOW[d.getDay()] + ")"; }
function lrShort_(d) { return pad2_(d.getMonth() + 1) + "/" + pad2_(d.getDate()) + "(" + LR_DOW[d.getDay()] + ")"; }
function lrAlt_(d)   { return (d.getMonth() + 1) + "/" + d.getDate() + "(" + LR_DOW[d.getDay()] + ")"; }
function lrVal_(d)   { return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate(); }

/**
 * プルダウンに出す期間を、新しい → 古い の順で作る。
 * 先頭は今期（16日〜今日）。それ以降は 16日〜翌月15日。
 * 記録が残っている月までしか作らない。
 */
function lrPeriodsFrom_(minDate, today) {
  const out = [];
  const cur = lrPeriodStart_(today);
  out.push({
    value: lrVal_(cur) + "-" + lrVal_(today),
    label: lrFull_(cur) + " ～ " + lrShort_(today) + "（今期）"
  });
  if (!minDate) return out;

  const limit = lrPeriodStart_(minDate);
  let s = cur, guard = 0;
  while (s.getTime() > limit.getTime() && guard++ < 240) {
    const ps = new Date(s.getFullYear(), s.getMonth() - 1, 16);
    const pe = new Date(s.getFullYear(), s.getMonth(), 15);
    out.push({ value: lrVal_(ps) + "-" + lrVal_(pe),
               label: lrFull_(ps) + " ～ " + lrShort_(pe) });
    s = ps;
  }
  return out;
}

/** 画面から呼ばれる。記録の一番古い営業日を調べて期間一覧を返す */
function getReportPeriods() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let minD = null;
  ALL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    // B列(営業日)とF列(金額)を見る。金額が無い行は年見出しなので数えない
    sh.getRange(START_ROW, C_DATE, last - START_ROW + 1, C_MONEY - C_DATE + 1)
      .getValues().forEach(function (r) {
        const d = r[0];
        if (!(d instanceof Date)) return;
        if (d.getFullYear() < 2020 || d.getFullYear() > 2035) return;
        if (String(r[C_MONEY - C_DATE]).replace(/[^0-9]/g, "") === "") return;
        if (!minD || d < minD) minD = d;
      });
  });
  return JSON.stringify(lrPeriodsFrom_(minD, new Date()));
}

/** 送信先のグループIDを設定する（説明タブ Z1） */
function menuSetGroupId() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
  if (!sh) { ui.alert("説明タブが見つかりません。"); return; }
  const cur = String(sh.getRange("Z1").getValue() || "");
  const res = ui.prompt("グループLINEのID",
    "レポートを送るグループのID（C から始まる文字列）を貼り付けてください。\n現在: " + (cur || "未設定"),
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const v = res.getResponseText().trim();
  if (!v) return;
  sh.getRange("Z1").setValue(v);
  ui.alert("保存しました。（説明タブ Z1）");
}

/* ============ 📤 レポート送信UI ============ */

function showReportDialog() {
  const htmlContent = `<!DOCTYPE html><html><head><base target="_top"><style>
    body { font-family: sans-serif; padding: 15px; color: #333; margin: 0; }
    h3 { font-size: 16px; margin: 0 0 5px 0; color: #333; display: flex; align-items: center; }
    .line { border-bottom: 2px solid #1155ca; margin-bottom: 15px; }
    .radio-group { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; font-size: 14px; }
    .radio-group label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
    select, input[type="date"] { width: 100%; font-size: 14px; padding: 10px; margin-bottom: 15px; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc; }
    .date-inputs { display: none; align-items: center; gap: 10px; margin-bottom: 15px; }
    .date-inputs input { width: 45%; margin-bottom: 0; }
    .test-box { background-color: #f9fbe7; border: 1px solid #c0ca33; padding: 12px; border-radius: 5px; margin-bottom: 15px; }
    .test-box label { color: #d93025; font-weight: bold; font-size: 13px; display: flex; align-items: center; gap: 5px; cursor: pointer; }
    button { background-color: #1155ca; color: white; border: none; font-weight: bold; cursor: pointer; padding: 12px; border-radius: 5px; width: 100%; font-size: 14px; }
    .progress-container { width: 100%; background: #e0e0e0; border-radius: 5px; margin-top: 10px; display: none; height: 18px; overflow: hidden; }
    .progress-bar { width: 0%; height: 100%; background: #34a853; transition: width 0.3s; }
    .status-text { font-size: 13px; margin-top: 5px; text-align: center; display: none; font-weight: bold; }
  </style></head><body>
    <h3>📊 レポート期間指定 & 送信</h3>\n    <div style="font-size:11px;color:#999;margin:-4px 0 6px">${LR_VERSION}</div>
    <div class="line"></div>
    <div class="radio-group">
      <label><input type="radio" name="mode" value="select" checked onchange="toggle()"> 📅 期間選択</label>
      <label><input type="radio" name="mode" value="custom" onchange="toggle()"> ✍️ 日付指定</label>
    </div>
    <div id="selectArea"><select id="periodSelect"></select></div>
    <div id="customArea" class="date-inputs">
      <input type="date" id="startDate"><span>～</span><input type="date" id="endDate">
    </div>
    <div class="test-box">
      <label><input type="checkbox" id="testMode" checked> 🛠️ マーク個人のLINEのみに送信 (テスト用)</label>
    </div>
    <button id="sendBtn" onclick="send()">LINEへ送信する</button>
    <div class="progress-container" id="pCont"><div class="progress-bar" id="pBar"></div></div>
    <div class="status-text" id="pText">処理中...</div>
    <script>
      function toggle() {
        var mode = document.querySelector('input[name="mode"]:checked').value;
        document.getElementById('selectArea').style.display = mode === 'select' ? 'block' : 'none';
        document.getElementById('customArea').style.display = mode === 'custom' ? 'flex' : 'none';
      }
      window.onload = function() {
        var s = document.getElementById('periodSelect');
        s.add(new Option('読み込み中…', ''));
        google.script.run.withSuccessHandler(function(js){
          var list = JSON.parse(js); s.innerHTML = '';
          if (!list.length) { s.add(new Option('記録がありません', '')); return; }
          list.forEach(function(p){ s.add(new Option(p.label, p.value)); });
        }).withFailureHandler(function(e){
          s.innerHTML = ''; s.add(new Option('期間を読めません: ' + e.message, ''));
        }).getReportPeriods();
      };
      function send() {
        var mode = document.querySelector('input[name="mode"]:checked').value;
        var val = mode === "select" ? document.getElementById('periodSelect').value : (document.getElementById('startDate').value.replace(/-/g, '/') + "-" + document.getElementById('endDate').value.replace(/-/g, '/'));
        var isTest = document.getElementById('testMode').checked;

        document.getElementById('sendBtn').style.display = 'none';
        document.getElementById('pCont').style.display = 'block';
        document.getElementById('pText').style.display = 'block';

        let progress = 0; let pBar = document.getElementById('pBar'); let pText = document.getElementById('pText');

        let interval = setInterval(() => {
          progress += 1.5;
          if (progress > 95) progress = 95;
          pBar.style.width = progress + '%';
          pText.innerText = "処理中... (推定残り" + Math.max(1, Math.round(60 - (progress / 1.5))) + "秒)";
        }, 1000);

        google.script.run
          .withSuccessHandler(function(res){
            clearInterval(interval);
            if(res && res.status === "error") {
                pBar.style.backgroundColor = '#d93025'; pBar.style.width = '100%'; pText.style.color = '#d93025';
                pText.innerText = "❌ エラー: " + res.message;
            } else {
                pBar.style.width = '100%'; pText.innerText = "✅ 送信完了！"; pText.style.color = "#2e7d32";
                setTimeout(() => google.script.host.close(), 1500);
            }
          })
          .withFailureHandler(function(error){
            clearInterval(interval); pBar.style.backgroundColor = '#d93025'; pBar.style.width = '100%'; pText.style.color = '#d93025';
            pText.innerText = "❌ スクリプトエラー: " + error.message;
          })
          .executeManualReportFromUI(val, isTest);
      }
    </script></body></html>`;
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(htmlContent).setWidth(380).setHeight(360), '📤 レポート送信');
}

function executeManualReportFromUI(val, isTest) {
  try {
    const parts = val.split('-'); const sParts = parts[0].split('/'); const eParts = parts[1].split('/');
    let startD = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10), 0, 0, 0);
    let endD = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10), 23, 59, 59);
    let targetId = isTest ? rpTestTarget_() : rpGroupTarget_();
    if (!targetId) return { status: "error", message: isTest
      ? "自分の送り先が未設定です（設定タブ「テスト送信先（自分のLINE）」）"
      : "グループの送り先が未設定です（メニュー「👥 グループIDを設定」）" };
    sendCustomReport(targetId, startD, endD);
    return { status: "success" };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}

/* ============ 📱 そうさボタンから、期間を決めてレポートを送る ============ */
/*
 * スマホのスプレッドシートアプリからは、メニューもダイアログも出せない。
 * そこで「説明」タブに置いた
 *
 *   ▼ レポートの期間   [ 今期（8/16〜9/6） ]  ← プルダウン。打ち込みもできる
 *   ▼ レポートの送り先 [ 🧪 自分だけ（テスト） ]
 *   ☑ [7] レポートをLINEに送る
 *
 * の3行で送る。プルダウンで選ぶのが基本で、そこに無い期間は
 *   260716-0815   （2026/7/16〜8/15）
 *   260716-0815t  （末尾 t ＝ 自分だけ／h ＝ グループ）
 * のように打ち込めば、そのとおりに送る。
 *
 * ★グループに送るのは取り消せないので、本番のときは
 *   1回目のチェックでは送らず、確認だけを出す。
 *   3分以内にもう一度チェックすると、そこではじめて送る。
 */

/** 「まず自分だけ」のときの宛先 */
function rpTestTarget_() {
  try {
    const v = String(cfg_("テスト送信先（自分のLINE）") || "").trim();
    if (v) return v;
  } catch (e) {}
  try {
    for (const id in SENDER_MAP) { if (SENDER_MAP[id] === "ﾏｰｸ") return id; }
  } catch (e) {}
  return "";
}

/** グループLINEの宛先（説明タブ Z1） */
function rpGroupTarget_() {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    return sh ? String(sh.getRange("Z1").getValue() || "").trim() : "";
  } catch (e) { return ""; }
}

/* ---- 期間の読み取り ---- */

/** 全角の数字・記号を半角にそろえる */
function rpHalf_(s) {
  return String(s == null ? "" : s)
    .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/[／]/g, "/").replace(/[．]/g, ".")
    .replace(/[－ー―‐]/g, "-").replace(/[　]/g, " ")
    .trim();
}

/**
 * 「260716」「0716」「2026/7/16」などを日付にする。読めなければ null。
 * 数字だけのときの決まりは、日付メモと同じ。
 *   4桁 = 月日（年は今年）／6桁 = 年月日（西暦の下2桁）／8桁 = 年月日
 * 区切りがあるときは桁数は自由。
 */
function rpDate_(str, defYear, endOfDay) {
  const t = rpHalf_(str).replace(/[年月]/g, "/").replace(/日$/, "");
  let y = defYear, mo = null, d = null;

  const sep = t.split(/[\/\.\-]/).filter(function (x) { return x !== ""; });
  if (sep.length >= 2 && /[\/\.\-]/.test(t)) {
    const n = sep.map(function (x) { return parseInt(x, 10); });
    if (n.some(isNaN)) return null;
    if (n.length === 2) { mo = n[0]; d = n[1]; }
    else { y = n[0] < 100 ? 2000 + n[0] : n[0]; mo = n[1]; d = n[2]; }
  } else {
    const g = t.replace(/[^0-9]/g, "");
    if (g.length === 4)      { mo = +g.slice(0, 2); d = +g.slice(2); }
    else if (g.length === 6) { y = 2000 + (+g.slice(0, 2)); mo = +g.slice(2, 4); d = +g.slice(4); }
    else if (g.length === 8) { y = +g.slice(0, 4); mo = +g.slice(4, 6); d = +g.slice(6); }
    else return null;
  }
  if (!(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31)) return null;
  if (!(y >= 2020 && y <= 2035)) return null;

  const out = endOfDay ? new Date(y, mo - 1, d, 23, 59, 59) : new Date(y, mo - 1, d, 0, 0, 0);
  // 2月31日のような、ありえない日をはじく
  if (out.getMonth() !== mo - 1 || out.getDate() !== d) return null;
  return out;
}

/**
 * 期間らんの文字を読む。
 * 戻り値 { from, to, label, dest } … dest は "test" / "group" / null（指定なし）
 * 読めなければ { err: "…" }
 */
function rpParseRange_(raw, today) {
  const now = today || new Date();
  let t = rpHalf_(raw);
  if (!t) return { err: "期間が空です" };

  // 末尾の t（自分だけ）／h（グループ）
  let dest = null;
  const md = t.match(/[\s]*(テスト|本番|[thTH])$/);
  if (md) {
    const k = md[1].toLowerCase();
    dest = (k === "t" || k === "テスト") ? "test" : "group";
    t = t.slice(0, t.length - md[0].length).trim();
  }
  // 「今期（8/16〜9/6）」のような、かっこ書きの飾りは読み飛ばす
  const key = t.replace(/[（(].*$/, "").replace(/[\s]/g, "");

  const ps = (typeof lrPeriodStart_ === "function")
    ? lrPeriodStart_(now)
    : new Date(now.getFullYear(), now.getMonth() - (now.getDate() >= 16 ? 0 : 1), 16);

  const mk = function (from, to, label) {
    return { from: from, to: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59),
             label: label, dest: dest };
  };
  if (/^(今期|今回|今)$/.test(key))   return mk(ps, now, "今期");
  if (/^(前期|先期|前回)$/.test(key)) {
    const a = new Date(ps.getFullYear(), ps.getMonth() - 1, 16);
    return mk(a, new Date(ps.getFullYear(), ps.getMonth(), 15), "前期");
  }
  if (/^(今日|本日|きょう)$/.test(key)) return mk(new Date(now.getFullYear(), now.getMonth(), now.getDate()), now, "今日");
  if (/^(昨日|きのう)$/.test(key)) {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return mk(y, y, "昨日");
  }
  if (/^(今月)$/.test(key)) return mk(new Date(now.getFullYear(), now.getMonth(), 1), now, "今月");
  if (/^(先月|前月)$/.test(key)) {
    const a = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return mk(a, new Date(now.getFullYear(), now.getMonth(), 0), "先月");
  }
  if (/^(全部|ぜんぶ|すべて|全期間)$/.test(key)) {
    return mk(new Date(2020, 0, 1), now, "全部");
  }

  // ここからは日付を打ち込んだとき
  let parts = t.split(/[〜～~–—]|to/);
  if (parts.length !== 2) {
    const bits = t.split("-").filter(function (x) { return x !== ""; });
    if (bits.length === 2)      parts = bits;
    else if (bits.length === 6) parts = [bits.slice(0, 3).join("/"), bits.slice(3).join("/")];
    else if (bits.length === 4 && /^\d{1,2}$/.test(bits[1]))
      parts = [bits.slice(0, 2).join("/"), bits.slice(2).join("/")];
    else parts = [t];
  }

  const from = rpDate_(parts[0], now.getFullYear(), false);
  if (!from) return { err: rpHowTo_(raw) };
  if (parts.length === 1) {
    return { from: from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate(), 23, 59, 59),
             label: "1日ぶん", dest: dest };
  }
  // 終わりの日に年が書いていなければ、始まりの年に合わせる
  let to = rpDate_(parts[1], from.getFullYear(), true);
  if (!to) return { err: rpHowTo_(raw) };
  // 年をまたぐ書き方（1216-0115）は、終わりを翌年とみなす。
  // ただし翌年にして3か月より長くなるものは、打ち間違いとみなして直してもらう
  // （0815-0716 は「11か月ぶん」ではなく、前後を逆に打ったと考えるほうが自然）
  if (to.getTime() < from.getTime() && String(parts[1]).replace(/[^0-9]/g, "").length <= 4) {
    const next = new Date(to.getFullYear() + 1, to.getMonth(), to.getDate(), 23, 59, 59);
    if (next.getTime() - from.getTime() <= 92 * 24 * 60 * 60 * 1000) to = next;
  }
  if (to.getTime() < from.getTime()) return { err: "終わりの日が、始まりの日より前になっています：" + raw };
  return { from: from, to: to, label: null, dest: dest };
}

/** 読めなかったときの、書き方の案内 */
function rpHowTo_(raw) {
  return "期間が読めませんでした：「" + String(raw).slice(0, 30) + "」\n" +
    "プルダウンから選ぶか、次のように打ってください。\n" +
    "　260716-0815　… 2026/7/16 〜 8/15（月日は4桁）\n" +
    "　260716-260815　… 年をまたぐときは、終わりにも年を付ける\n" +
    "　2026/7/16-2026/8/15　… 区切りを入れる書き方でもOK\n" +
    "　今期／前期／今日／昨日／今月／先月　… 言葉でもOK\n" +
    "末尾に t を付けると自分だけ、h を付けるとグループに送ります（例 260716-0815t）";
}

/** 送り先らんの文字を "test" / "group" にする */
function rpParseDest_(raw) {
  const t = rpHalf_(raw).replace(/[\s]/g, "");
  if (!t) return null;
  if (/(グループ|本番|みんな|全員|h$)/i.test(t)) return "group";
  if (/(自分|テスト|ひとり|t$)/i.test(t)) return "test";
  return null;
}

function rpFmt_(d) {
  return d.getFullYear() + "/" + pad2_(d.getMonth() + 1) + "/" + pad2_(d.getDate()) +
    "(" + LR_DOW[d.getDay()] + ")";
}

/**
 * そうさボタン [7] の中身。
 * 「説明」タブの入力らんを読んで、その期間のレポートを送る。
 * 何が起きたかを文字で返す（そうさボタンの結果らんに出る）。
 */
function menuSendReportPanel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("説明");

  // 入力らんを読む。005-Updater.gs が入っていないときは、既定（今期・自分だけ）
  let pTxt = "今期", dTxt = "";
  if (sh && typeof panelInputGet_ === "function") {
    pTxt = panelInputGet_(sh, PANEL_IN_PERIOD) || "今期";
    dTxt = panelInputGet_(sh, PANEL_IN_DEST) || "";
  }

  const r = rpParseRange_(pTxt, new Date());
  if (r.err) return "⚠️ " + r.err;

  // 送り先は、期間らんの末尾（t/h）＞ 送り先らん ＞ 自分だけ、の順で決める
  const dest = r.dest || rpParseDest_(dTxt) || "test";
  const span = rpFmt_(r.from) + " 〜 " + rpFmt_(r.to);

  const to = (dest === "group") ? rpGroupTarget_() : rpTestTarget_();
  if (!to) {
    return dest === "group"
      ? "❌ グループの送り先が分かりません（メニュー「👥 グループIDを設定」で入れてください）"
      : "❌ 自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」に入れてください）";
  }

  // グループに送るのは取り消せない。1回目は送らず、もう一度チェックしてもらう
  if (dest === "group") {
    const pr = PropertiesService.getScriptProperties();
    const armed = pr.getProperty("RP_ARMED");
    const okNow = armed && armed.split("|")[0] === span &&
      (new Date().getTime() - parseInt(armed.split("|")[1], 10)) < 3 * 60 * 1000;
    if (!okNow) {
      pr.setProperty("RP_ARMED", span + "|" + new Date().getTime());
      return "👥 本番（グループ全員）で送ろうとしています\n" +
        "　期間：" + span + "\n" +
        "　まだ送っていません。よければ3分以内に、もう一度チェックしてください。\n" +
        "　何もしなければ送りません。自分だけに送るなら、送り先らんを" +
        "「🧪 自分だけ（テスト）」に戻してください。";
    }
    pr.deleteProperty("RP_ARMED");
  }

  if (typeof updProgress_ === "function") updProgress_("集計しています（" + span + "）");
  sendCustomReport(to, r.from, r.to);
  if (typeof updBeat_ === "function") updBeat_("送信しました");

  // 本番で送ったあとは、送り先らんを「自分だけ」に戻す。
  // 戻しておかないと、次にうっかりチェックしたときも本番になってしまう
  if (dest === "group" && sh && typeof panelInputSet_ === "function") {
    try { panelInputSet_(sh, PANEL_IN_DEST, PANEL_DEST_TEST); } catch (e) {}
  }

  return (dest === "group" ? "👥 グループ全員に送りました" : "🧪 自分だけに送りました（テスト）") +
    "\n　期間：" + span + (r.label ? "（" + r.label + "）" : "");
}

/* ============ 集計 → Flex Message → LINE送信 ============ */

function sendCustomReport(targetId, customStartD, customEndD) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let startD = customStartD, endD = customEndD;
  const daysStr = ["日", "月", "火", "水", "木", "金", "土"]; const DAY_TYPES = ["平日", "金曜", "土曜", "日祝"];
  let totalRidesCount = 0; let tabRidesCount = { "北7":0, "北4":0, "北他":0, "ﾐﾅﾐ":0, "関空":0, "ほか":0 };
  let areaStats = {}; DAY_TYPES.forEach(dt => { areaStats[dt] = { "北": {l:0, m:0, s:0, t:0, sales:0, lSum:0, mSum:0, sSum:0, waitSum:0, waitCount:0, lWait:0, lWaitC:0, mWait:0, mWaitC:0, sWait:0, sWaitC:0, spots:{}}, "ﾐﾅﾐ": {l:0, m:0, s:0, t:0, sales:0, lSum:0, mSum:0, sSum:0, waitSum:0, waitCount:0, lWait:0, lWaitC:0, mWait:0, mWaitC:0, sWait:0, sWaitC:0, spots:{}}, "ほか": {l:0, m:0, s:0, t:0, sales:0, lSum:0, mSum:0, sSum:0, waitSum:0, waitCount:0, lWait:0, lWaitC:0, mWait:0, mWaitC:0, sWait:0, sWaitC:0, spots:{}} }; });

  let spotStats = {}; let spotHotData = {}; let spotDayBreakdown = {}; let timelineStats = {}; DAY_TYPES.forEach(dt => { timelineStats[dt] = {}; [20,21,22,23,0,1,2,3,4,5].forEach(h => { timelineStats[dt][h] = {}; }); });
  let spotHeatmapSales = {}; let spotHeatmapTimes = {}; let recordsForGraph = []; let ticketRides = []; let avoidRides = []; let reproRides = [];
  const avoidWords = ["ゲロ", "ガキ", "障割", "カス", "ババア", "ジジイ", "元3"];

  PERSONAL_TABS.forEach(tabName => {
    let sheet = ss.getSheetByName(tabName); if (!sheet || sheet.getMaxRows() < 4) return;
    let dataVals = sheet.getRange(4, 1, sheet.getMaxRows() - 3, 10).getValues(); let displayVals = sheet.getRange(4, 1, sheet.getMaxRows() - 3, 10).getDisplayValues();
    let currentYear = startD.getFullYear();
    for (let r = 0; r < dataVals.length; r++) {
      let rawDate = dataVals[r][1]; let rDate = null;
      if (Object.prototype.toString.call(rawDate) === "[object Date]") { rDate = rawDate; } else if (displayVals[r][1]) { let mm = displayVals[r][1].match(/^(\d+)\/(\d+)/); if (mm) rDate = new Date(currentYear, parseInt(mm[1], 10) - 1, parseInt(mm[2], 10), 12, 0, 0); }
      if (!rDate || rDate < startD || rDate > endD) continue;
      let memo = String(dataVals[r][7]); let remarks = String(dataVals[r][8]); let place = normalizeStr(String(dataVals[r][6]));
      if (remarks.includes("バラシ") || place.includes("バラシ")) continue;
      let price = parseInt(String(dataVals[r][5]).replace(/[^0-9]/g, ''), 10); if (isNaN(price) || price === 0) continue;
      let hr = -1, min = 0, exactTimeStr = ""; let tm = displayVals[r][4].match(/^(\d+):(\d+)/); if (tm) { hr = parseInt(tm[1], 10); min = parseInt(tm[2], 10); exactTimeStr = ("0"+hr).slice(-2) + ":" + ("0"+min).slice(-2); }
      let waitMinutes = parseInt(String(dataVals[r][3]).replace(/[^0-9]/g, ''), 10); if(isNaN(waitMinutes)) waitMinutes = 0;
      let dayOfWeek = rDate.getDay(); let dayType = "平日"; if (isHolidayFunc(rDate) || dayOfWeek === 0) dayType = "日祝"; else if (dayOfWeek === 6) dayType = "土曜"; else if (dayOfWeek === 5) dayType = "金曜";

      let dateStr = `${rDate.getMonth()+1}/${rDate.getDate()}`; let timeStr = `${daysStr[dayOfWeek]}曜 ${exactTimeStr}`;

      if ((memo.includes("チケ") || memo.includes("チケット") || remarks.includes("チケ") || remarks.includes("チケット")) && price >= 5000) { ticketRides.push([dateStr, timeStr, place, price, waitMinutes > 0 ? waitMinutes+"分" : "－", tabName + ": " + memo + " " + remarks]); }
      if (avoidWords.some(w => memo.includes(w) || remarks.includes(w)) || price <= 999) { avoidRides.push([dateStr, timeStr, place, price, waitMinutes > 0 ? waitMinutes+"分" : "－", tabName + ": " + memo + " " + remarks]); }
      if (memo.includes("再現性") || remarks.includes("再現性") || (remarks.trim() !== "" && price >= 5000)) { reproRides.push([dateStr, timeStr, place, price, waitMinutes > 0 ? waitMinutes+"分" : "－", tabName + ": " + memo + " " + remarks]); }

      let specificCat = "ほか"; let searchPlace = removeStreetSuffix(place); let comb = (remarks + " " + place).toUpperCase();
      if (comb.includes("関空") || place.toUpperCase().includes("KIX")) specificCat = "関空"; else if (place.includes("新地7")) specificCat = "北7"; else if (place.includes("新地4")) specificCat = "北4"; else if (place.includes("ドン") || SOUTH_WORDS.some(w => searchPlace.includes(w))) specificCat = "ﾐﾅﾐ"; else if (place.includes("新地") || NORTH_WORDS.some(w => searchPlace.includes(w))) specificCat = "北他";
      let broadArea = (specificCat === "北7" || specificCat === "北4" || specificCat === "北他") ? "北" : (specificCat === "ﾐﾅﾐ" ? "ﾐﾅﾐ" : "ほか");
      totalRidesCount++; if (tabRidesCount[specificCat] !== undefined) tabRidesCount[specificCat]++; else tabRidesCount["ほか"]++;

      let sKey = `${specificCat}|${place}`; let aSt = areaStats[dayType][broadArea];
      aSt.t++; aSt.sales += price; if(waitMinutes > 0) { aSt.waitSum += waitMinutes; aSt.waitCount++; }
      if (!aSt.spots[place]) aSt.spots[place] = {l:0, m:0, s:0, lSum:0, mSum:0, sSum:0, lTimes:{}, mTimes:{}, sTimes:{}};
      let exactDStr = hr !== -1 ? `(${daysStr[dayOfWeek]}) ${exactTimeStr}` : "";

      if (price >= 10000) { aSt.l++; aSt.lSum += price; aSt.spots[place].l++; aSt.spots[place].lSum += price; if(waitMinutes>0){ aSt.lWait += waitMinutes; aSt.lWaitC++; } if(exactDStr) { aSt.spots[place].lTimes[exactDStr] = (aSt.spots[place].lTimes[exactDStr] || 0) + 1; } }
      else if (price >= 5000) { aSt.m++; aSt.mSum += price; aSt.spots[place].m++; aSt.spots[place].mSum += price; if(waitMinutes>0){ aSt.mWait += waitMinutes; aSt.mWaitC++; } if(exactDStr) { aSt.spots[place].mTimes[exactDStr] = (aSt.spots[place].mTimes[exactDStr] || 0) + 1; } }
      else { aSt.s++; aSt.sSum += price; aSt.spots[place].s++; aSt.spots[place].sSum += price; if(waitMinutes>0){ aSt.sWait += waitMinutes; aSt.sWaitC++; } if(exactDStr) { aSt.spots[place].sTimes[exactDStr] = (aSt.spots[place].sTimes[exactDStr] || 0) + 1; } }

      if (!spotStats[sKey]) spotStats[sKey] = {count: 0, sales: 0, waitSum: 0, waitCount: 0, heatmapValidCount: 0};
      spotStats[sKey].count++; spotStats[sKey].sales += price; if(waitMinutes > 0) { spotStats[sKey].waitSum += waitMinutes; spotStats[sKey].waitCount++; }

      if(!spotDayBreakdown[sKey]) { spotDayBreakdown[sKey] = {}; DAY_TYPES.forEach(dt => spotDayBreakdown[sKey][dt] = {c:0, s:0, waits:[], exactTimes:[]}); }
      spotDayBreakdown[sKey][dayType].c++; spotDayBreakdown[sKey][dayType].s += price;
      if (waitMinutes > 0) spotDayBreakdown[sKey][dayType].waits.push(waitMinutes);
      if (hr !== -1) spotDayBreakdown[sKey][dayType].exactTimes.push(`${daysStr[dayOfWeek]}曜 ${exactTimeStr}`);

      if (hr !== -1) {
        if(!spotHotData[sKey]) spotHotData[sKey] = {}; let dhKey = `${dayOfWeek}|${hr}`;
        if(!spotHotData[sKey][dhKey]) spotHotData[sKey][dhKey] = {count: 0, sales: 0, times: []};
        spotHotData[sKey][dhKey].count++; spotHotData[sKey][dhKey].sales += price; spotHotData[sKey][dhKey].times.push(exactTimeStr);
        let isHeatmapValidTime = [20,21,22,23,0,1,2,3,4,5].includes(hr); if(isHeatmapValidTime) spotStats[sKey].heatmapValidCount++;

        if(timelineStats[dayType][hr]) {
          if(!timelineStats[dayType][hr][place]) timelineStats[dayType][hr][place] = {count: 0, sales: 0, waitSum: 0, waitCount: 0, times: [], max: 0, at: ""};
          const tls = timelineStats[dayType][hr][place];
          tls.count++; tls.sales += price; tls.times.push(`(${daysStr[dayOfWeek]}) ${exactTimeStr}`);
          // いちばん高かった乗車と、その時刻。これを「オススメの時刻」として出す。
          // 時刻を全部ならべると読めないので、代表を1つだけにする
          if (price > tls.max) { tls.max = price; tls.at = exactTimeStr; }
          if(waitMinutes > 0) { tls.waitSum += waitMinutes; tls.waitCount++; }
        }
        if(isHeatmapValidTime) {
          if(!spotHeatmapSales[sKey]) { spotHeatmapSales[sKey] = {}; spotHeatmapTimes[sKey] = {}; }
          if(!spotHeatmapSales[sKey][dayOfWeek]) { spotHeatmapSales[sKey][dayOfWeek] = {}; spotHeatmapTimes[sKey][dayOfWeek] = {}; }
          if(!spotHeatmapSales[sKey][dayOfWeek][hr]) { spotHeatmapSales[sKey][dayOfWeek][hr] = 0; spotHeatmapTimes[sKey][dayOfWeek][hr] = []; }

          spotHeatmapSales[sKey][dayOfWeek][hr] += price;
          spotHeatmapTimes[sKey][dayOfWeek][hr].push({ time: exactTimeStr, dateStr: dateStr });
        }
        let sortHr = hr < 16 ? hr + 24 : hr; let timeDec = sortHr + (min / 60);
        if (timeDec >= 20 && timeDec <= 29) recordsForGraph.push({ dateStr: dateStr, timeDec: timeDec, price: price, spotName: place, dayOfWeek: dayOfWeek });
      }
    }
  });

  function getBestTimeStr(timesObj) { if(!timesObj) return ""; let maxC = 0, bestT = ""; for(let t in timesObj) { if(timesObj[t] > maxC) { maxC = timesObj[t]; bestT = t; } } return bestT ? " [" + bestT + "]" : ""; }

  let finalTimeline = {}; DAY_TYPES.forEach(dt => finalTimeline[dt] = {});
  let targetHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  DAY_TYPES.forEach(dType => {
    targetHours.forEach(hr => {
      let spots = timelineStats[dType][hr]; let candidates = [];
      for(let pName in spots) { if(spots[pName].count >= 2) { candidates.push({name: pName, count: spots[pName].count, avg: spots[pName].sales / spots[pName].count, wait: spots[pName].waitCount > 0 ? Math.round(spots[pName].waitSum / spots[pName].waitCount) : 0, times: spots[pName].times, max: spots[pName].max, at: spots[pName].at }); } }
      let bSpot = null, wSpot = null;
      if(candidates.length > 0) { candidates.sort((a,b) => b.avg - a.avg); bSpot = candidates[0]; let avoidCands = candidates.slice(1).filter(c => c.avg <= 1500 || c.avg <= (bSpot.avg - 2000)); if(avoidCands.length > 0) { avoidCands.sort((a,b) => a.avg - b.avg); wSpot = avoidCands[0]; } }
      finalTimeline[dType][hr] = { best: bSpot, worst: wSpot };
    });
  });

  let dashboardUrl = updateDetailedDashboard(ss, startD, endD, recordsForGraph, areaStats, spotHeatmapSales, spotHeatmapTimes, spotStats, spotHotData, spotDayBreakdown, finalTimeline, totalRidesCount, tabRidesCount, DAY_TYPES, ticketRides, avoidRides, reproRides, getBestTimeStr);

  const periodStr = `${startD.getMonth()+1}/${startD.getDate()}(${daysStr[startD.getDay()]})～${endD.getMonth()+1}/${endD.getDate()}(${daysStr[endD.getDay()]})`;
  const flexMessage = buildReportFlex_({
    periodStr: periodStr, totalRidesCount: totalRidesCount, tabRidesCount: tabRidesCount,
    DAY_TYPES: DAY_TYPES, areaStats: areaStats, finalTimeline: finalTimeline,
    targetHours: targetHours, dashboardUrl: dashboardUrl, getBestTimeStr: getBestTimeStr
  });
  // 裏メッセージ（通知やトーク一覧に出る文字）
  // 文面は Code.gs の「設定」タブから変えられる。読めないときは今までの文面
  const span = lrAlt_(startD) + "～" + lrAlt_(endD);
  let altText = "📈" + span + "レポート作成 byシバンニ";
  if (typeof cfgAltText_ === "function") {
    const tpl = String(cfgAltText_() || "");
    if (tpl) altText = tpl.indexOf("{期間}") !== -1 ? tpl.split("{期間}").join(span) : tpl + span;
  }
  let messages = [ { type: "flex", altText: altText, contents: flexMessage } ];
  const token = getLineToken_();
  // 送信先が無いときに broadcast（公式アカウントの友だち全員に配信）へ落ちないようにする。
  // グループへ送るにはグループIDが要る。未設定なら止める。
  if (!targetId) {
    throw new Error("送信先が未設定です。メニュー「👥 グループIDを設定」から登録してください。" +
                    "（友だち全員への配信を防ぐため中止しました）");
  }
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    payload: JSON.stringify({ to: targetId, messages: messages })
  });
}


/**
 * LINEに送る絵（Flex Message）を組み立てる。
 *
 * 集計とは切り離してある。スプレッドシートを触らないので、
 * これだけをテストで実際に組み立てて、形がこわれていないか確かめられる。
 * 送ってみるまで分からない、という状態にはしない。
 */
function buildReportFlex_(o) {
  const periodStr = o.periodStr, totalRidesCount = o.totalRidesCount, tabRidesCount = o.tabRidesCount;
  const DAY_TYPES = o.DAY_TYPES, areaStats = o.areaStats, finalTimeline = o.finalTimeline;
  const targetHours = o.targetHours, dashboardUrl = o.dashboardUrl;
  const getBestTimeStr = o.getBestTimeStr || function () { return ""; };
  let flexContents = [];
  flexContents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#fff4e5", "paddingAll": "10px", "cornerRadius": "md", "contents": [ { "type": "text", "text": `📊 この期間の総乗車数: ${totalRidesCount}件`, "weight": "bold", "size": "sm", "color": "#e65100" }, { "type": "text", "text": `北7 ${tabRidesCount["北7"]}件 ・ 北4 ${tabRidesCount["北4"]}件 ・ 北他 ${tabRidesCount["北他"]}件 ・ ﾐﾅﾐ ${tabRidesCount["ﾐﾅﾐ"]}件 ・ 関空 ${tabRidesCount["関空"]}件 ・ ほか ${tabRidesCount["ほか"]}件`, "size": "xxs", "color": "#666666", "wrap": true, "margin": "xs" } ] });
  flexContents.push({ "type": "separator", "margin": "md" }, { "type": "text", "text": "🔥アツいエリア【パーセント・実績】", "weight": "bold", "size": "sm", "color": "#1155ca", "margin": "md" });

  DAY_TYPES.forEach(type => {
    let areaRanks = [];
    ["北", "ﾐﾅﾐ", "ほか"].forEach(area => {
      let d = areaStats[type][area]; if(d.t > 0) { areaRanks.push({ name: area, lR: d.l/d.t, score: d.t <= 1 ? -100 : (d.l/d.t), l: d.l, m: d.m, s: d.s, t: d.t, avg: Math.round(d.sales/d.t), wait: d.waitCount > 0 ? Math.round(d.waitSum/d.waitCount) : 0, lA: d.l>0?Math.round(d.lSum/d.l):0, mA: d.m>0?Math.round(d.mSum/d.m):0, sA: d.s>0?Math.round(d.sSum/d.s):0, lW: d.lWaitC>0?Math.round(d.lWait/d.lWaitC):0, mW: d.mWaitC>0?Math.round(d.mWait/d.mWaitC):0, sW: d.sWaitC>0?Math.round(d.sWait/d.sWaitC):0, spots: d.spots }); }
    });
    areaRanks.sort((a,b) => b.score - a.score);
    if(areaRanks.length > 0) {
      let boxContents = [ { "type": "text", "text": `【${type}】`, "size": "sm", "weight": "bold", "color": "#333333", "margin": "sm" } ];
      areaRanks.forEach((r, i) => {
        let lrP = Math.round(r.lR*100); let mrP = Math.round((r.m/r.t)*100); let srP = Math.round((r.s/r.t)*100); let rankStr = r.t > 1 ? (i < 3 ? ["🥇","🥈","🥉"][i] : "") : "(参考)";
        let bestL = "-", bestM = "-", worstS = "-"; let bcL = 0, bcM = 0, bcS = 999999;
        for(let sn in r.spots) { let st = r.spots[sn]; if(st.l > bcL) { bcL = st.l; bestL = sn; } if(st.m > bcM) { bcM = st.m; bestM = sn; } if(st.s > 0 && (st.sSum/st.s) < bcS) { bcS = st.sSum/st.s; worstS = sn; } }
        boxContents.push({ "type": "text", "text": `${rankStr} ${r.name} （${r.t}件 ／ 平均売上￥${r.avg.toLocaleString()} ／ 平均待ち${r.wait}分）`, "size": "xs", "weight": "bold", "color": "#1155ca", "margin": "md", "wrap": true });

        // 帯の「中」に ◯◯% を書く。
        // 前は帯の上に左詰めで並べていたので、どの色が何%なのか分からなかった。
        // ただし細い帯に文字を入れるとはみ出すので、入る幅があるときだけ入れる。
        const percentBars = [];
        const tooThin = [];
        [[lrP, "#d93025", "ﾛﾝｸﾞ"], [mrP, "#3b82f6", "ﾐﾄﾞﾙ"], [srP, "#aaaaaa", "ｼｮｰﾄ"]].forEach(function (x) {
          const pct = x[0], color = x[1], name = x[2];
          if (pct <= 0) return;
          let inner = [];
          if (pct >= 26)      inner = [{ "type": "text", "text": `${name}${pct}%`, "size": "xxs", "weight": "bold", "color": "#ffffff", "align": "center", "gravity": "center", "adjustMode": "shrink-to-fit" }];
          else if (pct >= 12) inner = [{ "type": "text", "text": `${pct}%`,        "size": "xxs", "weight": "bold", "color": "#ffffff", "align": "center", "gravity": "center", "adjustMode": "shrink-to-fit" }];
          else tooThin.push(`${name}${pct}%`);
          percentBars.push({ "type": "box", "layout": "vertical", "justifyContent": "center", "backgroundColor": color, "flex": pct, "contents": inner });
        });
        if (percentBars.length > 0) { boxContents.push({ "type": "box", "layout": "horizontal", "cornerRadius": "md", "height": "22px", "margin": "xs", "contents": percentBars }); } else { boxContents.push({ "type": "box", "layout": "horizontal", "cornerRadius": "md", "height": "22px", "margin": "xs", "contents": [ { "type": "box", "layout": "vertical", "backgroundColor": "#cccccc", "flex": 1, "contents": [] } ] }); }
        // 帯が細すぎて中に書けなかったぶんだけ、下に小さく添える
        if (tooThin.length > 0) { boxContents.push({ "type": "text", "text": `細い帯：${tooThin.join(" ・ ")}`, "size": "xxs", "color": "#888888", "margin": "xs", "wrap": true }); }

        let lTxt = `ﾛﾝｸﾞ：${r.l}件/平均￥${r.lA.toLocaleString()}/待ち${r.lW}分` + (bestL !== "-" ? `\n(🔥アツい：${toHalfWidthKana(bestL)}${getBestTimeStr(r.spots[bestL].lTimes)})` : "");
        let mTxt = `ﾐﾄﾞﾙ：${r.m}件/平均￥${r.mA.toLocaleString()}/待ち${r.mW}分` + (bestM !== "-" ? `\n(🔥アツい：${toHalfWidthKana(bestM)}${getBestTimeStr(r.spots[bestM].mTimes)})` : "");
        let sTxt = `ｼｮｰﾄ：${r.s}件/平均￥${r.sA.toLocaleString()}/待ち${r.sW}分` + (worstS !== "-" ? `\n(⚠️避ける：${toHalfWidthKana(worstS)}${getBestTimeStr(r.spots[worstS].sTimes)})` : "");
        boxContents.push({ "type": "text", "text": lTxt, "size": "xxs", "color": "#d93025", "wrap": true, "margin": "xs", "weight": "bold" }, { "type": "text", "text": mTxt, "size": "xxs", "color": "#3b82f6", "wrap": true, "margin": "xs", "weight": "bold" }, { "type": "text", "text": sTxt, "size": "xxs", "color": "#666666", "wrap": true, "margin": "xs", "weight": "bold" });
      });
      flexContents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#f4f4f4", "paddingAll": "10px", "margin": "sm", "cornerRadius": "md", "contents": boxContents });
    }
  });

  flexContents.push({ "type": "separator", "margin": "lg" }, { "type": "text", "text": "🔥アツい ✖️ ⚠️避ける【時間詳細】", "weight": "bold", "size": "sm", "color": "#34a853", "margin": "md", "wrap": true });
  //
  // 1行 ＝ 1つの時間帯。頭に「行くならこの時刻」を1つだけ出す。
  //
  // 前は、その乗り場で拾った時刻を全部ならべていた（[(月) 23:37, (月) 23:34, …]）。
  // 30個も時刻が並ぶと、結局いつ行けばいいのか読み取れないうえ、
  // Flex Message の大きさ（50KB）にも近づいて危なかった。
  // 代表の1時刻＝「いちばん高かった乗車の時刻」と、最高額を出す形にする。
  const timeLine_ = function (mark, markColor, sp, withMax) {
    const head = sp.at ? `[${sp.at}] ` : "";
    let body = `（${sp.count}件／平均￥${Math.round(sp.avg).toLocaleString()}`;
    if (withMax && sp.max > 0) body += `／最高￥${sp.max.toLocaleString()}`;
    body += "）";
    return { "type": "text", "size": "xs", "margin": "sm", "wrap": true, "contents": [
      { "type": "span", "text": head, "weight": "bold", "color": markColor },
      { "type": "span", "text": mark, "color": "#444444" },
      { "type": "span", "text": `${toHalfWidthKana(sp.name)} `, "weight": "bold", "color": "#000000" },
      { "type": "span", "text": body, "color": "#444444" }
    ]};
  };
  DAY_TYPES.forEach(dType => {
    let tLines = []; targetHours.forEach(hr => {
      const b = finalTimeline[dType][hr].best; const w = finalTimeline[dType][hr].worst;
      // アツいほうは「最高いくらまで出たか」まで出す。避けるほうは行かないので出さない
      if (b) tLines.push(timeLine_("🔥", "#2e7d32", b, true));
      if (w) tLines.push(timeLine_("⚠️", "#b45f06", w, false));
    });
    if(tLines.length === 0) tLines.push({ "type": "text", "text": "データ不足", "size": "xs" });
    flexContents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#e8f5e9", "paddingAll": "8px", "margin": "sm", "cornerRadius": "md", "contents": [ { "type": "text", "text": `【${dType}】`, "size": "xs", "weight": "bold", "color": "#2e7d32", "margin": "none" }, ...tLines ] });
  });

  return { "type": "bubble", "size": "giga", "header": { "type": "box", "layout": "vertical", "backgroundColor": "#1155ca", "paddingAll": "15px", "contents": [ { "type": "text", "text": `📈 【${periodStr}】分析・戦略レポート`, "weight": "bold", "color": "#ffffff", "size": "md", "wrap": true } ] }, "body": { "type": "box", "layout": "vertical", "paddingAll": "12px", "spacing": "none", "contents": flexContents }, "footer": { "type": "box", "layout": "vertical", "paddingAll": "15px", "contents": [ { "type": "button", "style": "primary", "color": "#d93025", "action": { "type": "uri", "label": "🚨ボタンを押せッ!!!!(スプシへ移動)🚨", "uri": dashboardUrl } } ] } };
}

/* ============ 🤖 Gemini「傾向と対策」 ============ */

function generateAIText(avgSales, count, waitAvg, timesArr) {
  if (count <= 1) return "データ不足のため判断保留。";
  const key = getGeminiKey_();
  if (!key) return "【AI未設定】GEMINI_API_KEY が未登録です。";
  const model = getGeminiModel_();
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   model + ":generateContent?key=" + encodeURIComponent(key);
  const prompt = `あなたはプロのタクシードライバー専用のデータ分析AIです。以下の実績データをもとに、大阪の夜勤タクシードライバー（20:00〜04:00）に向けた今後の戦略やアドバイスを、簡潔に「30文字以内」で出力してください。
  ・平均売上: ${avgSales}円
  ・今月乗車件数: ${count}件
  ・平均待ち時間: ${waitAvg}分
  ・アツい乗車時間帯: ${timesArr.join(", ")}`;

  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };

  try {
    const res = UrlFetchApp.fetch(endpoint, options);
    const code = res.getResponseCode();
    const body = res.getContentText();
    const json = JSON.parse(body);

    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      const aiText = json.candidates[0].content.parts[0].text.trim();
      return aiText.replace(/\r?\n/g, ' ');
    }

    // 何が起きたか分かるように、原因をそのまま出す。
    // 「データが取得できませんでした」だけだと、モデル廃止なのかキー切れなのか分からない。
    const why = (json.error && json.error.message) ? json.error.message : body.slice(0, 120);
    if (code === 404) {
      return "【モデル " + model + " が見つかりません】廃止された可能性。「Geminiのモデルを変える」で変更してください";
    }
    if (code === 400 || code === 403) {
      return "【APIキーの問題 " + code + "】" + why;
    }
    if (code === 429) return "【回数制限】しばらく待って再実行してください";
    return "【AIエラー " + code + "】" + why;
  } catch(e) {
    return "【通信エラー】" + (e && e.message ? e.message : e);
  }
}

/**
 * 乗り場ぶんの「傾向と対策」を、1回のリクエストでまとめて作る。
 *
 * 前は乗り場ごとに1回ずつ呼んでいた。20か所あれば20回で、
 * 無料枠の回数制限（429）にすぐ当たるうえ、1回1〜2秒かかるので
 * レポート作成そのものが何十秒も延びていた。
 * ぜんぶ1回のリクエストにまとめれば、制限にも当たらず速い。
 *
 * 返ってこなかったときは、エラー文をそのまま出さずに
 * 数字から作った文章（aiFallback_）を入れる。
 * 「【AI分析エラー】データが取得できませんでした」が全行に並ぶより、ずっと役に立つ。
 *
 * 戻り値は items と同じ長さの配列。
 */
function generateAIBatch_(items) {
  const out = items.map(function (it) { return aiFallback_(it); });
  if (!items.length) return out;

  const key = getGeminiKey_();
  if (!key) {
    out[0] = "【AI未設定】メニュー「🤖 Geminiキーを設定」から登録してください。／" + out[0];
    return out;
  }
  const model = getGeminiModel_();
  const lines = items.map(function (it, i) {
    return `${i + 1}. ${it.name}：平均売上${it.avgSales}円／${it.count}件／平均待ち${it.waitAvg}分` +
           (it.times && it.times.length ? `／よく出る時刻 ${it.times.slice(0, 6).join(" ")}` : "");
  }).join("\n");

  const prompt = "あなたは大阪の夜勤タクシードライバー（20:00〜翌05:00）専用のデータ分析AIです。\n" +
    "下の乗り場ごとに、今後の立ち回りの助言を1つずつ作ってください。\n" +
    "・1件につき日本語30文字以内、1行\n" +
    "・「1. 助言」のように、頭に番号を付ける\n" +
    "・番号の数と順番は、下の一覧とぴったり合わせる\n" +
    "・前置き、まとめ、記号の装飾は書かない\n\n" + lines;

  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   model + ":generateContent?key=" + encodeURIComponent(key);
  const options = { method: "post", contentType: "application/json",
                    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                    muteHttpExceptions: true };

  let body = "", code = 0;
  // 回数制限（429）や一時的な不調は、少し待てば通ることが多い
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    if (typeof updBeat_ === "function") updBeat_("AI分析");
    try {
      const res = UrlFetchApp.fetch(endpoint, options);
      code = res.getResponseCode(); body = res.getContentText();
      if (code === 200) break;
      if (code !== 429 && code < 500) break;      // 直らない種類のエラーなら、待っても同じ
    } catch (e) { body = String(e && e.message ? e.message : e); }
    Utilities.sleep(2000 * (tryNo + 1));
  }

  let text = "";
  try {
    const json = JSON.parse(body);
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      text = String(json.candidates[0].content.parts[0].text || "");
    } else if (json.error && json.error.message) {
      out[0] = aiWhy_(code, model, json.error.message) + "／" + out[0];
      return out;
    }
  } catch (e) {}
  if (!text) { out[0] = aiWhy_(code, model, String(body).slice(0, 120)) + "／" + out[0]; return out; }

  // 「3. 〜」の形で返ってくるので、番号で行き先を決める。
  // 番号がずれても、ほかの行を巻き込まないようにする
  text.split(/\r?\n/).forEach(function (ln) {
    const m = ln.match(/^\s*(\d{1,3})\s*[.、:：)]\s*(.+)$/);
    if (!m) return;
    const idx = parseInt(m[1], 10) - 1;
    const val = m[2].replace(/^[-*・\s]+/, "").trim();
    if (idx >= 0 && idx < out.length && val) out[idx] = val;
  });
  return out;
}

/** AIが使えなかった理由を、そのまま分かる形にする */
function aiWhy_(code, model, why) {
  if (code === 404) return "【モデル " + model + " が見つかりません】メニュー「🤖 Geminiのモデルを変える」で変更してください";
  if (code === 400 || code === 403) return "【APIキーの問題 " + code + "】" + why;
  if (code === 429) return "【回数制限】しばらく待って、もう一度レポートを作ってください";
  if (!code) return "【通信エラー】" + why;
  return "【AIエラー " + code + "】" + why;
}

/**
 * AIが使えないときに出す、数字だけで作る「傾向と対策」。
 * AIより気は利かないが、エラー文が並ぶより役に立つ。
 */
function aiFallback_(it) {
  const a = it.avgSales, c = it.count, w = it.waitAvg;
  const L = [];
  if (a >= 15000)      L.push("高単価。最優先で狙う");
  else if (a >= 10000) L.push("ロング帯。積極的に");
  else if (a >= 5000)  L.push("平均以上。悪くない");
  else if (a >= 2500)  L.push("単価低め。空いていれば");
  else                 L.push("単価が低い。長居しない");
  if (w > 0) {
    const perHour = w > 0 ? Math.round(a / w * 60) : 0;
    L.push(`待ち${w}分＝時給換算￥${perHour.toLocaleString()}`);
    if (w >= 30 && a < 8000) L.push("待ち負けなので回送推奨");
  } else {
    L.push("待ち記録なし");
  }
  if (c <= 2) L.push("件数が少なく判断は保留");
  if (it.times && it.times.length) L.push(`狙い目 ${it.times[0]}`);
  return L.join("／");
}

/* ============ 📊 まとめスプシ ダッシュボード作成 ============ */
/*
 * ★スマホで読めることを最優先にしている。
 *
 *  前は A〜Z列 を 50px で作っていた（1,300px）。iPhone の画面は 400px ほどしかないので、
 *  全体を見ようとすると3分の1まで縮まり、文字が読めなかった。
 *  そこで 1列 16px（26列 ＝ 416px）にして、横は画面いっぱい・縦に長く伸びる形にした。
 *  文字も 8pt → 11〜14pt に上げている。
 *
 *  ★「－」だけの行と列は作らない。
 *  前は 10時間 × 8列 を必ず並べていたので、中身が4件でも70マスの表になっていた。
 *  記録がある時間帯・曜日だけを出す。
 */

/** 1列の幅（px）。26列で iPhone の画面幅におさまるようにしてある */
const DB_COL_W = 16;
/** 列の数（＝横いっぱいのマージ幅） */
const DB_COLS  = 26;

/** 文字数から、折り返したときの行数を見積もる（全角2・半角1で数える） */
function dbLines_(text, widthPx, fontSize) {
  const t = String(text == null ? "" : text);
  const per = Math.max(4, Math.floor(widthPx / (fontSize * 0.62)));
  let n = 0;
  t.split("\n").forEach(function (ln) {
    let w = 0;
    for (let i = 0; i < ln.length; i++) w += ln.charCodeAt(i) < 0x100 ? 1 : 2;
    n += Math.max(1, Math.ceil(w / per));
  });
  return n;
}

/** その行に入る文字量から、行の高さを決める */
function dbFit_(sheet, row, cells, minH) {
  let lines = 1;
  cells.forEach(function (c) {
    lines = Math.max(lines, dbLines_(c.text, c.span * DB_COL_W - 6, c.size || 11));
  });
  sheet.setRowHeight(row, Math.min(400, Math.max(minH || 28, lines * 16 + 10)));
}

/**
 * よけいな空白・改行をつぶす（備考の表示崩れ対策）。
 *
 * 元のセルには手で入れた改行が何個も入っている。
 * 「男性4 ⏎ ⏎ ⏎ 0代」のように語の途中で折り返してあるので、
 * 改行をスペースに変えると「男性4 0代」と割れてしまう。
 * 改行はスペースにせず、そのままつなげる。ふつうのスペースだけ1つに詰める。
 */
function dbTidy_(text) {
  const SP = "[ \\t\\u3000]";
  return String(text == null ? "" : text)
    .replace(new RegExp(SP + "*[\\r\\n]+" + SP + "*", "g"), "")   // 改行はつなげる
    .replace(new RegExp(SP + "+", "g"), " ")                      // 空白は1つに
    .replace(/ *[、,] */g, "、")
    .trim();
}

function updateDetailedDashboard(mainSS, startD, endD, recordsForGraph, areaStats, spotHeatmapSales, spotHeatmapTimes, spotStats, spotHotData, spotDayBreakdown, finalTimeline, totalRidesCount, tabRidesCount, DAY_TYPES, ticketRides, avoidRides, reproRides, getBestTimeStr) {
  let descSheet = mainSS.getSheetByName("説明"); let dashboardId = descSheet ? descSheet.getRange("Z2").getValue() : ""; let dbSS;
  try { if (dashboardId) dbSS = SpreadsheetApp.openById(dashboardId); else throw new Error(); } catch(e) { dbSS = SpreadsheetApp.create("☣️僕はグールだッシュボード☣️"); if (descSheet) descSheet.getRange("Z2").setValue(dbSS.getId()); }

  const daysStr = ["日", "月", "火", "水", "木", "金", "土"];
  // タブ名は「📈 8/16(日)～9/15(火)」。いつからいつまでか、タブを見ただけで分かるように
  const periodTab = `${startD.getMonth()+1}/${startD.getDate()}(${daysStr[startD.getDay()]})～${endD.getMonth()+1}/${endD.getDate()}(${daysStr[endD.getDay()]})`;
  const tabName = `📈 ${periodTab}`;

  // グラフ。横はシートの幅に合わせ、縦長にする（スマホで見るため）
  const CHART_W = DB_COLS * DB_COL_W - 2;
  const CHART_H = 460;
  const CHART_ROWS = Math.ceil(CHART_H / 21) + 1;   // この行数だけ空けないと次の見出しに重なる

  let sheet = dbSS.getSheetByName(tabName) || dbSS.insertSheet(tabName, 0);
  sheet.clear(); sheet.getCharts().forEach(c => sheet.removeChart(c));
  let maxR = sheet.getMaxRows(); if(maxR < 900) sheet.insertRowsAfter(maxR, 900 - maxR);
  // clear() では結合は外れない。前の割りつけが残っていると新しい表と衝突するので、必ずほどく
  try { sheet.getRange(1, 1, sheet.getMaxRows(), DB_COLS).breakApart(); } catch (e) {}
  for(let i=1; i<=DB_COLS; i++) sheet.setColumnWidth(i, DB_COL_W);

  /** 横いっぱいの見出し行 */
  function dbTitle_(row, text, bg, size) {
    sheet.getRange(row, 1, 1, DB_COLS).merge().setValue(text)
      .setFontSize(size || 12).setFontWeight("bold").setBackground(bg)
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    dbFit_(sheet, row, [{ text: text, span: DB_COLS, size: size || 12 }], 30);
  }

  let curRow = 1;
  dbTitle_(curRow, `📈 ${periodTab}\n営業ダッシュボード（全${totalRidesCount}件）`, "#e3f2fd", 14); curRow++;
  sheet.getRange(curRow, 1, 1, DB_COLS).merge()
    .setValue(`北7 ${tabRidesCount["北7"]}件 ・ 北4 ${tabRidesCount["北4"]}件 ・ 北他 ${tabRidesCount["北他"]}件\nﾐﾅﾐ ${tabRidesCount["ﾐﾅﾐ"]}件 ・ 関空 ${tabRidesCount["関空"]}件 ・ ほか ${tabRidesCount["ほか"]}件`)
    .setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.setRowHeight(curRow, 40); curRow += 2;

  /* ---------- 🔥アツい ✖️ ⚠️避ける【時間詳細】 ---------- */
  // 曜日区分ごとに縦に積む。横に9列ならべると、スマホでは1マス40pxになって読めない
  dbTitle_(curRow, "🔥アツい乗り場 ✖️ ⚠️避ける乗り場【時間詳細】\n(アツい=平均売上が最高 / 避ける=平均￥1,500以下、又はアツいより￥2,000以上低い)", "#d9ead3", 12); curRow++;

  const TL_SPANS = [6, 10, 10];
  let targetHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  DAY_TYPES.forEach(dType => {
    // 記録がある時間帯だけ出す。「－」だけの行を並べても読むところが無い
    const hours = targetHours.filter(hr => finalTimeline[dType][hr].best || finalTimeline[dType][hr].worst);
    dbTitle_(curRow, `【${dType}】`, "#e8f5e9", 12); curRow++;
    if (hours.length === 0) {
      sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue("この曜日区分は記録がありません")
        .setFontSize(11).setFontColor("#999999").setHorizontalAlignment("center").setVerticalAlignment("middle");
      sheet.setRowHeight(curRow, 28); curRow++;
      return;
    }
    const hRng = getGridRange(sheet, curRow, 1, 1, TL_SPANS);
    ["時間帯", "🔥 アツい", "⚠️ 避ける"].forEach(function (t, i) {
      hRng[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
    });
    sheet.setRowHeight(curRow, 28); curRow++;

    const from = curRow;
    hours.forEach(hr => {
      const b = finalTimeline[dType][hr].best, w = finalTimeline[dType][hr].worst;
      // 時刻は代表の1つだけ。全部ならべても、結局いつ行けばいいのか分からない
      const txt = function (sp, withMax) {
        if (!sp) return "－";
        let t = (sp.at ? `[${sp.at}]\n` : "") + sp.name + `\n${sp.count}件 平均￥${Math.round(sp.avg).toLocaleString()}`;
        if (withMax && sp.max > 0) t += `\n最高￥${sp.max.toLocaleString()}`;
        return t;
      };
      const bT = txt(b, true), wT = txt(w, false);
      const rngs = getGridRange(sheet, curRow, 1, 1, TL_SPANS);
      rngs[0].merge().setValue(`${("0"+hr).slice(-2)}時台`).setFontSize(12).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
      rngs[1].merge().setValue(bT).setFontSize(11).setFontWeight("bold").setWrap(true)
        .setHorizontalAlignment("center").setVerticalAlignment("middle")
        .setBackground(b ? "#f4cccc" : "#ffffff").setFontColor(b ? "#990000" : "#b7b7b7");
      rngs[2].merge().setValue(wT).setFontSize(11).setFontWeight("bold").setWrap(true)
        .setHorizontalAlignment("center").setVerticalAlignment("middle")
        .setBackground(w ? "#f3f3f3" : "#ffffff").setFontColor(w ? "#434343" : "#b7b7b7");
      dbFit_(sheet, curRow, [{ text: bT, span: TL_SPANS[1], size: 11 }, { text: wT, span: TL_SPANS[2], size: 11 }], 44);
      curRow++;
    });
    sheet.getRange(from - 1, 1, curRow - from + 1, DB_COLS)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  });
  curRow++;

  /* ---------- 乗り場ごとのヒートマップとグラフ ---------- */
  let datesArr = Array.from(new Set(recordsForGraph.map(r => r.dateStr))).sort();
  let dateColorMap = {}; datesArr.forEach((d, i) => { dateColorMap[d] = GRAPH_COLORS[i % GRAPH_COLORS.length]; });

  let daysOrder = [1, 2, 3, 4, 5, 6, 0]; let heatmapSpotNames = []; let hiddenDataRow = 800;
  for (let key in spotStats) {
    if(spotStats[key].heatmapValidCount >= 3 && spotHeatmapSales[key]) {
      let parts = key.split("|"); let tName = parts[0]; let spotName = parts[1];

      // 記録がある曜日・時間帯だけを出す。空っぽの列を並べると、1マスが細くなって読めない
      const useDays = daysOrder.filter(d => spotHeatmapSales[key][d] &&
        targetHours.some(hr => spotHeatmapSales[key][d][hr] > 0));
      const useHours = targetHours.filter(hr => useDays.some(d => spotHeatmapSales[key][d] && spotHeatmapSales[key][d][hr] > 0));
      // 出すものが無ければ、下の「個別乗り場 実績」に回す（どこにも出ないのがいちばん困る）
      if (useDays.length === 0 || useHours.length === 0) continue;
      heatmapSpotNames.push(spotName);

      dbTitle_(curRow, `🔥 【${spotName}】曜日×時間帯別ヒートマップ\n(条件: 20〜29時台で月間3件以上の実績)`, TAB_COLORS[tName] || "#fce5cd", 12); curRow++;

      // 時間帯のらん＋曜日のぶんで、横26列をきっちり分ける
      const hmFirst = Math.max(4, DB_COLS - Math.floor((DB_COLS - 4) / useDays.length) * useDays.length);
      const hmEach = Math.floor((DB_COLS - hmFirst) / useDays.length);
      const hmSpans = [hmFirst].concat(useDays.map(() => hmEach));
      const rest = DB_COLS - hmSpans.reduce((a, b) => a + b, 0);
      if (rest > 0) hmSpans.push(rest);

      const hRngs = getGridRange(sheet, curRow, 1, 1, hmSpans);
      ["時間帯"].concat(useDays.map(d => daysStr[d] + "曜")).forEach(function (t, i) {
        hRngs[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
      });
      if (rest > 0) hRngs[hmSpans.length - 1].merge().setBackground("#cccccc");
      sheet.setRowHeight(curRow, 28); curRow++;

      let hmAvgSalesList = [];
      useHours.forEach(hr => { useDays.forEach(d => { let s = (spotHeatmapSales[key][d] && spotHeatmapSales[key][d][hr]) ? spotHeatmapSales[key][d][hr] : 0; let tArr = (spotHeatmapTimes[key][d] && spotHeatmapTimes[key][d][hr]) ? spotHeatmapTimes[key][d][hr] : []; let avg = s > 0 ? Math.round(s / tArr.length) : 0; if (avg > 0) hmAvgSalesList.push(avg); }); });
      let top3 = [...new Set(hmAvgSalesList)].sort((a,b)=>b-a).slice(0,3);

      const hmFrom = curRow;
      useHours.forEach(hr => {
        let rngs = getGridRange(sheet, curRow, 1, 1, hmSpans);
        rngs[0].merge().setValue(`${("0"+hr).slice(-2)}時台`).setFontSize(12).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
        let colIdx = 1; let cellTexts = [];
        useDays.forEach(d => {
          let s = (spotHeatmapSales[key][d] && spotHeatmapSales[key][d][hr]) ? spotHeatmapSales[key][d][hr] : 0;
          let timesArr = (spotHeatmapTimes[key][d] && spotHeatmapTimes[key][d][hr]) ? spotHeatmapTimes[key][d][hr] : [];
          let avgSales = s > 0 ? Math.round(s / timesArr.length) : 0;
          let cell = rngs[colIdx].merge().setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontSize(11);

          if (avgSales > 0) {
            let matchedColor = dateColorMap[timesArr[0].dateStr] || "#333333";
            let rankIdx = top3.indexOf(avgSales);
            let cellText = `平均￥${avgSales.toLocaleString()}\n[${timesArr.map(t => t.time).join(", ")}]`;
            if (rankIdx !== -1) cellText += `\n${["🥇","🥈","🥉"][rankIdx]}`;
            cellTexts.push(cellText);

            const nl = cellText.indexOf("\n");
            const nl2 = cellText.indexOf("\n", nl + 1);
            let rt = SpreadsheetApp.newRichTextValue().setText(cellText);
            rt.setTextStyle(0, nl, SpreadsheetApp.newTextStyle().setBold(true).setFontSize(11).setForegroundColor("#000000").build());
            rt.setTextStyle(nl + 1, nl2 === -1 ? cellText.length : nl2,
              SpreadsheetApp.newTextStyle().setBold(true).setFontSize(10).setForegroundColor(matchedColor).build());

            if (rankIdx === 0) cell.setBackground("#f4cccc"); else if (rankIdx === 1) cell.setBackground("#fff2cc"); else if (rankIdx === 2) cell.setBackground("#cfe2f3"); else cell.setBackground("#ffffff");
            cell.setRichTextValue(rt.build());
          } else { cell.setValue("－").setFontColor("#b7b7b7").setBackground("#ffffff"); }
          colIdx++;
        });
        if (rest > 0) rngs[hmSpans.length - 1].merge();
        dbFit_(sheet, curRow, cellTexts.map(t => ({ text: t, span: hmEach, size: 11 })), 40);
        curRow++;
      });
      sheet.getRange(hmFrom - 1, 1, curRow - hmFrom + 1, DB_COLS)
        .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

      let chartPlaced = false;
      let recs = recordsForGraph.filter(r => r.spotName === spotName);
      if(recs.length > 0) {
        let header = ["時間"]; datesArr.forEach(d => { header.push("'" + d); }); let table = [header];
        let times = Array.from(new Set(recs.map(r => r.timeDec))).sort((a,b) => a - b);
        for(let t of times) { let row = [t]; for(let d of datesArr) { let rec = recs.find(r => r.timeDec === t && r.dateStr === d); row.push(rec ? rec.price : null); } table.push(row); }
        if (table.length > 1) {
          let dataRng = sheet.getRange(hiddenDataRow, 1, table.length, header.length); sheet.getRange(hiddenDataRow, 1, 1, header.length).setNumberFormat('@'); dataRng.setValues(table);
          // 線は点線のまま、●をしっかり見える大きさにする（前は4pxで、点が見えなかった）
          let seriesOpt = {}; for (let i = 0; i < datesArr.length; i++) { seriesOpt[i] = { lineWidth: 2, lineDashStyle: [3, 5], pointShape: 'circle', pointSize: 12, color: dateColorMap[datesArr[i]], labelInLegend: datesArr[i] }; }
          let customTicks = []; for(let i=20; i<=29.1; i+=0.5) { customTicks.push(Math.round(i*1000)/1000); }
          let maxP = Math.max(...recs.map(r=>r.price)) || 10000; let vStep = maxP > 20000 ? 5000 : 2000; let vTicks = []; for(let v=0; v<=maxP+vStep; v+=vStep) vTicks.push(v);

          let chart = sheet.newChart().asLineChart().addRange(dataRng).setPosition(curRow, 1, 0, 0)
            .setOption('title', `📈 【${spotName}】時刻別の売上`)
            .setOption('titleTextStyle', { fontSize: 14, bold: true })
            .setOption('hAxis', {title: '時間', minValue: 20, maxValue: 29, ticks: customTicks, gridlines: {color: '#e0e0e0'}, textStyle: {fontSize: 11}})
            .setOption('vAxis', {title: '売上', format: '￥#,##0', ticks: vTicks, gridlines: {color: '#e0e0e0'}, textStyle: {fontSize: 11}})
            .setOption('series', seriesOpt).setOption('useFirstColumnAsDomain', true).setOption('headers', 1)
            // 横が狭いので、日付の一覧は右ではなく下に置く
            .setOption('legend', {position: 'bottom', textStyle: {fontSize: 11}})
            .setOption('chartArea', {left: '16%', top: '12%', width: '80%', height: '62%'}).setOption('interpolateNulls', true)
            .setOption('width', CHART_W).setOption('height', CHART_H).build();
          sheet.insertChart(chart); hiddenDataRow += 40; chartPlaced = true;
        }
      }
      curRow += chartPlaced ? CHART_ROWS : 2;
    }
  }

  /* ---------- 個別乗り場 実績（1か所を2行つかって縦長に） ---------- */
  dbTitle_(curRow, "🔥 個別乗り場 実績 (条件: ヒートマップ基準にとどかない、月間1〜2件の乗り場)", "#cfe2f3", 12); curRow++;
  const SP_SPANS = [4, 8, 6, 4, 4];
  let shRngs = getGridRange(sheet, curRow, 1, 1, SP_SPANS);
  ["タブ", "乗り場名", "🔥アツい時間", "待ち時間", "件数/平均"].forEach(function (t, i) {
    shRngs[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  });
  sheet.setRowHeight(curRow, 34); curRow++;

  let spotRowsData = [];
  for (let key in spotStats) {
    let p = key.split("|"); let tab = p[0], name = p[1]; if(heatmapSpotNames.includes(name)) continue; let d = spotStats[key];
    spotRowsData.push({tab: tab, name: name, d: d, avgSales: Math.round(d.sales / d.count), key: key});
  }
  const tOrder = {"北7":1, "北4":2, "北他":3, "ﾐﾅﾐ":4, "関空":5, "ほか":6};
  spotRowsData.sort((a,b) => (tOrder[a.tab]||99) - (tOrder[b.tab]||99) || b.avgSales - a.avgSales);

  // AIは乗り場ごとに呼ばず、1回でまとめて作る（回数制限に当たらないように）
  for (let item of spotRowsData) {
    item.bestT = "データ不足"; item.allTimes = [];
    if(spotHotData[item.key]) {
      let bC=-1, bS=-1;
      for(let dh in spotHotData[item.key]) {
        let hd = spotHotData[item.key][dh];
        item.allTimes.push(...hd.times);
        if(hd.count > bC || (hd.count===bC && hd.sales>bS)) {
          bC=hd.count; bS=hd.sales; let p2=dh.split("|");
          item.bestT=`(${daysStr[p2[0]]}) ${("0"+p2[1]).slice(-2)}時台\n${bC}件 平均￥${Math.round(bS/bC).toLocaleString()}\n[${Array.from(new Set(hd.times)).sort().join(", ")}]`;
        }
      }
    }
    let wArrAll = []; item.waitText = "";
    if(spotDayBreakdown[item.key]) {
      DAY_TYPES.forEach(dt => {
        if(spotDayBreakdown[item.key][dt] && spotDayBreakdown[item.key][dt].waits.length>0) {
          let wArr = spotDayBreakdown[item.key][dt].waits; wArrAll.push(...wArr);
          item.waitText += `${dt} ${Math.round(wArr.reduce((a,b)=>a+b,0)/wArr.length)}分\n`;
        }
      });
    }
    if(!item.waitText) item.waitText = "記録なし";
    item.overallWait = wArrAll.length > 0 ? Math.round(wArrAll.reduce((a,b)=>a+b,0)/wArrAll.length) : 0;
  }

  const aiTexts = generateAIBatch_(spotRowsData.map(function (it) {
    return { name: it.name, avgSales: it.avgSales, count: it.d.count,
             waitAvg: it.overallWait, times: Array.from(new Set(it.allTimes)).sort() };
  }));

  const spFrom = curRow;
  spotRowsData.forEach(function (item, i) {
    let priceStyleText = `計${item.d.count}件\n平均￥${item.avgSales.toLocaleString()}`;
    let drngs = getGridRange(sheet, curRow, 1, 1, SP_SPANS);
    drngs[0].merge().setValue(item.tab).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground(TAB_COLORS[item.tab]||"#ffffff").setFontWeight("bold");
    drngs[1].merge().setValue(item.name).setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
    drngs[2].merge().setValue(item.bestT).setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
    drngs[3].merge().setValue(item.waitText.trim()).setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    let pCell = drngs[4].merge().setValue(priceStyleText).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
    if(item.avgSales >= 20000) pCell.setFontColor("#990000"); else if(item.avgSales >= 10000) pCell.setFontColor("#b45f06"); else if(item.avgSales >= 5000) pCell.setFontColor("#0b5394"); else pCell.setFontColor("#4b0082");
    dbFit_(sheet, curRow, [{ text: item.bestT, span: SP_SPANS[2], size: 10 },
                           { text: item.waitText, span: SP_SPANS[3], size: 10 },
                           { text: item.name, span: SP_SPANS[1], size: 12 }], 44);
    curRow++;

    // 🤖 は横いっぱいの行にする。狭いらんに押し込むと、長い文が読めない
    const ai = "🤖 " + aiTexts[i];
    sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue(ai)
      .setFontSize(11).setFontWeight("bold").setFontColor("#274e13").setBackground("#f6fbf2")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    dbFit_(sheet, curRow, [{ text: ai, span: DB_COLS, size: 11 }], 28);
    curRow++;
  });
  if(spotRowsData.length === 0) {
    sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue("該当データなし")
      .setFontSize(11).setFontColor("#999999").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(curRow, 28); curRow++;
  }
  sheet.getRange(spFrom - 1, 1, curRow - spFrom + 1, DB_COLS)
    .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  curRow++;

  /* ---------- 特別な一覧（再現したい・チケット・避けたい） ---------- */
  function createSpecialTable(title, dataArr, startRow, bgC, isAvoid) {
    let row = startRow;
    sheet.setRowHeight(row, 14); row++;
    dbTitle_(row, (isAvoid ? "⚠️ " : "🔥 ") + title, bgC, 12); row++;

    const hSpans = [4, 7, 7, 4, 4];
    let hRngs = getGridRange(sheet, row, 1, 1, hSpans);
    ["タブ", "乗り場名", "日付・曜日・時間", "待ち", "金額"].forEach(function (t, i) {
      hRngs[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    });
    sheet.setRowHeight(row, 34);
    const from = row; row++;

    dataArr.sort((a,b) => isAvoid ? a[3] - b[3] : b[3] - a[3]);

    if(dataArr.length > 0) {
      for(let i=0; i<dataArr.length; i++) {
        const rData = dataArr[i];
        const tabN = String(rData[5]).split(":")[0];
        const dRngs = getGridRange(sheet, row, 1, 1, hSpans);
        dRngs[0].merge().setValue(tabN).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground(TAB_COLORS[tabN] || "#ffffff");
        dRngs[1].merge().setValue(rData[2]).setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
        dRngs[2].merge().setValue(rData[0]+"\n"+rData[1]).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
        dRngs[3].merge().setValue(rData[4]).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle");

        const priceCell = dRngs[4].merge().setValue(rData[3]).setNumberFormat('￥#,##0').setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold");
        if (isAvoid && rData[3] <= 999) {
          dRngs.forEach(rng => { rng.setBackground("#f3f3f3").setFontColor("#434343"); });
          priceCell.setBackground("#f3f3f3").setFontColor("#434343");
        } else {
          if (rData[3] >= 20000) { priceCell.setBackground("#f4cccc").setFontColor("#990000"); } else if (rData[3] >= 10000) { priceCell.setBackground("#fff2cc").setFontColor("#b45f06"); } else if (rData[3] >= 5000) { priceCell.setBackground("#cfe2f3").setFontColor("#0b5394"); }
        }
        dbFit_(sheet, row, [{ text: rData[2], span: hSpans[1], size: 12 },
                            { text: rData[0]+"\n"+rData[1], span: hSpans[2], size: 11 }], 40);
        row++;

        // 備考は横いっぱいの行に、中央ぞろえで置く。
        // 元のセルには手で入れた改行が何個も入っているので、空白はひとつにつぶす。
        // （前は狭いらんに生のまま入れていたので、上と下に文字が離れて表示が崩れていた）
        const memo = dbTidy_(String(rData[5]).substring(String(rData[5]).indexOf(":")+1));
        if (memo) {
          sheet.getRange(row, 1, 1, DB_COLS).merge().setValue("📝 " + memo)
            .setFontSize(11).setFontColor("#333333").setBackground("#fbfbfb")
            .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
          dbFit_(sheet, row, [{ text: "📝 " + memo, span: DB_COLS, size: 11 }], 26);
          row++;
        }
      }
    } else {
      sheet.getRange(row, 1, 1, DB_COLS).merge().setValue("データなし")
        .setFontSize(11).setFontColor("#999999").setHorizontalAlignment("center").setVerticalAlignment("middle");
      sheet.setRowHeight(row, 28); row++;
    }
    sheet.getRange(from, 1, row - from, DB_COLS)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
    return row;
  }

  curRow = createSpecialTable("再現したい乗車 一覧 (条件: 再現性を含む 又は 備考ありで￥5,000以上)", reproRides, curRow, "#cfe2f3", false);
  curRow = createSpecialTable("チケット乗車 一覧 (条件: 備考にチケを含み、かつ￥5,000以上)", ticketRides, curRow, "#fff2cc", false);
  curRow = createSpecialTable("避けたい乗車 一覧 (条件: NGワードを含む 又は ￥999以下)", avoidRides, curRow, "#f4cccc", true);

  // 見出しがスクロールしても消えないように
  try { sheet.setFrozenRows(1); } catch (e) {}
  return dbSS.getUrl();
}
