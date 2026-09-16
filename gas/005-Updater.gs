/**
 * ================================================================
 *  コードの自動更新（005-Updater.gs）
 *
 *  ★★★  U025ver  （2026/09/16）  ★★★
 *
 *  [U025ver]
 *   ・LINEから「コード更新」と打つだけで、GitHubの新しいコードを取り込めるようにした
 *     ★スマホしか無いのに、コードを1本ずつ貼り替えるのは無理がある、というご指摘。
 *       取り込みの仕掛け（[1]）はもとからあったので、LINEからも押せるようにした。
 *       これで貼り替えそのものが要らなくなる。
 *     ・まーくさんだけ。必ず2段階（何が入るかを見せて、「はい」で始める）
 *     ・取り込みは2〜3分かかる。LINEの受け口の中でやると、
 *       LINEが「返事が無い」と思って同じ合図を送り直し、二重に取り込んでしまう。
 *       1秒後に1回だけ動く見張りを置いて、取り込みは裏でやる。
 *       終わったら結果をLINEに送り、その見張りは自分で片づける
 *
 *  [U024ver]
 *   ・そうさパネルの説明を、新しい流れに直した
 *     16:30 にまーくさんへ確認用 → 手直し → 17:00 にグループ
 *
 *  [U023ver]
 *   ・「なおして」の返事も、叫ぶ系のデスノートネタにそろえた
 *
 *  [U022ver]
 *   ・「なおして」の返事にも、デスノートのネタを散らした
 *
 *  [U021ver]
 *   ・「なおして」の返事を短くした（LINEに出るため）
 *
 *  [U020ver]
 *   ・「なおして」で、見張りだけでなく
 *     「毎日17時の自動チェック」「毎月のレポート自動送信」も一緒にそろえる
 *     止まっていると困るしかけは、直すときに一度に見るほうが確実なため
 *
 *  [U019ver]
 *   ・説明タブへの書き読みを I列 に合わせた
 *
 *  [U018ver]
 *   ・見張りが止まったとき、スマホだけで直せるようにした
 *     いままで入れ直す道は「見張りの中」と「メニュー」しか無く、
 *     見張りが止まったら誰も入れ直さないうえ、
 *     スマホのスプシのアプリにはメニューが出ないので、
 *     外出先では手も足も出なかった。
 *     LINEに「なおして」と打てば入れ直せるようにした（001-Code）
 *   ・見張りが動くたびに足あとを残すようにした（最後に動いた時刻が分かる）
 *   ・見張りを軽くした。押されているものが無いときは、
 *     チェックのらん1列だけを読んで帰る（前は6列ぶん読んでいた）
 *     1分おきに走るので、ここが重いと1日ぶんの持ち時間を食いつぶす
 *
 *  [U017ver]
 *   ・前の名前のファイルが消えずに残ることがあったのを直した
 *     更新は変わっていないファイルを読み飛ばすので、
 *     新しい名前を入れたあとにもう一度押しても
 *     「これから入ってくるもの」が空になり、前の名前が残り続けていた。
 *     もう入っているかどうかも見るようにしたので、次に押せば必ず片づく
 *
 *  [U016ver]
 *   ・ボタン [13]「読み取れているものの一覧を見る」を足した
 *
 *  [U015ver]
 *   ・ファイル名が変わったときに、前の名前のファイルを消すようにした
 *     更新は「新しい名前のファイルを足す」だけなので、これが無いと
 *     前の名前のファイルが残る。どちらにも同じ const が書いてあるため
 *     Apps Script はプロジェクト全体を止めてしまう。
 *     UPD_RENAMED（新しい名前 → 前の名前）に書いておけば、自動で消える
 *   ・確認の画面と、終わったあとの知らせに「名前が変わったので消す」を出す
 *
 *  [U014ver]
 *   ・ボタン [11]「きょうのイベントを試し送りする」を足した
 *   ・ボタン [12]「イベントの自動発信を入切する」を足した
 *     1回押すと今の状態が出るだけ。3分以内にもう1回で切り替わる
 *
 *  [U013ver]
 *   ・ボタン [10]「イベントの絵の見本を見る」を足した
 *
 *  [U012ver]
 *   ・ボタン [9]「イベント情報を調べる」を足した（中身は 006-Events.gs）
 *
 *  [U011ver]
 *   ・[1] が「置き場所が見つかりません」で止まっていたのを直した
 *     何も決めていないと "main" という枝を見にいくが、そこには main が無かった。
 *     決めていないときは、GitHubに既定の枝を聞いて、それを使うようにした
 *   ・置き場・枝・フォルダを、設定タブからも決められるようにした
 *     （スマホだけで直せるように。鍵だけは人に見られては困るのでシートに置かない）
 *   ・[2] の表示を、次に何をすればよいか分かる形にした
 *
 *  [U010ver]
 *   ・ボタン [8]「自動送信の状態を見る」を足した
 *     毎月のレポート送信が本当に仕込まれているかを、スマホから確かめられる
 *     入っていなければ、その場で入れ直す
 *
 *  [U009ver]
 *   ・更新の結果を、そうさボタンの結果らんにも出すようにした
 *     前は「終わりました」だけで、何が入れ替わったのか分からなかった
 *     （説明タブのZ5を見にいくしかなく、スマホからは確かめづらかった）
 *     これで「入れ替え：appsscript、003-LineReport」まで読める
 *
 *  [U008ver]
 *   ・ボタン [7]「レポートをLINEに送る」を足した（中身は 003-LineReport.gs）
 *     ・すぐ上に「▼ レポートの期間」「▼ レポートの送り先」の2行を置く
 *     ・期間はプルダウンから選ぶ。無い期間は 260716-0815 のように打ち込める
 *     ・送り先は 🧪自分だけ（テスト）／👥グループ全員（本番）の2つだけ
 *   ・コードを更新したあと、増えたボタンを自分で足すようにした
 *     更新中に動いているのは古いコードなので、その場では新しいボタンを知らない。
 *     次の1分おきの見張りで足す。スマホにはメニューが無いので、これが無いと
 *     新しいボタンを永久に使えないままになる
 *   ・チェックのらんを守る範囲を、置いてある行から決めるようにした
 *     個数で数えていたので、あいだに入力らんを挟むと
 *     いちばん下のボタンだけ誰でも押せる状態になっていた
 *   ・「止まった」とみなす時間を、ボタンごとに変えられるようにした
 *     レポートは集計に何分もかかるので、2分半では早すぎる（[7]は7分）
 *
 *  [U007ver]
 *   ・[5] を「1回目は自分だけ／3分以内にもう1回でグループ」に変えた
 *     チェックひとつでグループ全員に飛ぶのは、取り消せないので危ない
 *   ・ボタンが文字を返したときは、それも結果らんに出すようにした
 *
 *  [U006ver]
 *   ・「更新できる状態か調べる」が、名前を並べるだけなのに
 *     ぜんぶのファイル（約400KB）を読み込んでいた。名前だけ見るようにした
 *     これが原因で90秒を超え、見張りが「止まった」と誤って言っていた
 *   ・変わっていないファイルは読み込まないようにした（GitHubのshaで見分ける）
 *     ふだんの更新は1ファイルだけになるので、ぐっと速くなる
 *   ・止まったかどうかの見分け方を「最後に動きがあってからの時間」に変えた
 *     途中で息をしていれば止まったと言わない。息が止まって2分半で知らせる
 *   ・長い結果は、文字の量にあわせて行の高さを自動でひろげる
 *   ・結果を空にするときは、行の高さをもとに戻す
 *
 *  [U005ver]
 *   ・チェックを押したときに「推定 約〇秒」を必ず出すようにした
 *     何も出ないと、いつ終わるのか分からないため
 *   ・「コードを更新する」は、途中の段階も出す（読み込み中／保存中／書き込み中…）
 *   ・終わらないまま止まったときに、それが分かるようにした
 *     1分おきの見張りが、動きっぱなしのものを見つけて
 *     「終わりませんでした」と理由の候補を出す
 *   ・押したときに、まず結果らんを空にしてから始めるようにした
 *     前の結果が残っていると、今のものか前のものか分からなくなるため
 *
 *  [U004ver]
 *   ・「前のコードに戻す」でも、デプロイをやり直すようにした
 *     コードだけ戻してもデプロイが古いままだと、
 *     実際に動いているもの（LINEの受け口・みんなの記録ページ）は
 *     壊れた版のまま。戻したことにならなかった
 *
 *  [U003ver]
 *   ・ボタンの名前を「[1] コードを更新する」のように番号つきにした
 *     絵文字より番号のほうが、やりとりで取り違えにくいため
 *   ・並び順を、スプシに置いてあるとおりの番号順にそろえた
 *     （3=全タブ整形、4=前のコードに戻す、5=URLをLINE、6=ページ確認）
 *   ・文言で見分けるのに加えて、番号でも見分けられるようにした
 *     文言を書き換えて分からなくなっても、番号が残っていれば動く
 *
 *  [U002ver]
 *   ・「そうさ」タブを作るのをやめ、「説明」タブに間借りする形にした
 *     行は insertRowsBefore で差し込むので、もとの中身は消えない
 *   ・置き場所を決め打ちにするのをやめた
 *     見出し（▼ チェックを入れると動きます）を目印に、行も列も探す
 *     更新情報を上に足して行がずれても、動かしても、そのまま動く
 *   ・どのボタンかを「行の順番」ではなく「書いてある文言」で決めるようにした
 *     順番で決めていたため、名前と動くものがずれる不具合があった
 *   ・ボタンの間に空の行があってもよいようにした（押し間違い防止の空行）
 *   ・結果らんも「結果」と書いてある行を探して、そのすぐ下に書く
 *     セルが結合されていても、そのまとまりの左上に書く
 *   ・ボタンはいつも6つ。入れていない機能は押したときに知らせる
 *   ・重複や読めない行があるときは、こちらでは直さず、直し方だけ知らせる
 *   ・チェックのらんだけを保護する（説明タブ全体は保護しない）
 *   ・チェックは文字サイズ50・行の高さ70で置く（スマホで押しやすいように）
 *
 *  [U001ver] 最初の版（コードの自動更新／そうさボタン）
 *
 *  ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *               W=004-WebApp / U=005-Updater / V=006-Venue
 *  ※記号は、ファイル名の頭文字にそろえています。
 *               W=004-WebApp / U=005-Updater
 *
 *  やること:
 *    ① 新しいコードを読む（GitHub から、または Googleドライブから）
 *    ② いまのプロジェクトの中身をドライブに保存する（もどせるように）
 *    ③ Apps Script API を使って、自分自身を書き換える
 *    ④ ウェブアプリのデプロイも新しい版にやり直す
 *
 *  つまり、スマホでボタンを1つ押すだけで更新が終わる。
 *  貼り替えもデプロイのやり直しも要らなくなる。
 *
 *  ── 使えるようにするまで（最初の1回だけ）──
 *   1. ブラウザで script.google.com/home/usersettings を開き、
 *      「Google Apps Script API」を ON にする
 *   2. このファイルと 001-Code を貼る
 *   3. appsscript.json に権限を書き足す（README を見てください）
 *   4. メニュー「🔑 GitHubの鍵を設定」で、置き場所と鍵を入れる
 *      （ドライブから読ませたいときは、この手順は要らない）
 *   5. メニュー「🔄 コードを更新する」を1回押して、承認画面を通す
 *
 *  ── 壊れたときは ──
 *   メニュー「⏪ 前のコードに戻す」で、書き換える直前の状態に戻せる。
 *   それも効かないときは、ドライブの「taxi-gas/backup」に
 *   日時つきで全ファイルが残っているので、そこから手で貼り直す。
 * ================================================================
 */

const UPD_VERSION = "U023ver";

/** ドライブ上の置き場所（GitHubを使わないときの読み元） */
const UPD_FOLDER  = "taxi-gas";
/** 書き換える前の保存先。ここは GitHub を使うときも使う */
const UPD_BACKUP  = "backup";

/** Apps Script API の入口 */
const UPD_API = "https://script.googleapis.com/v1/projects/";

/** 拡張子 → Apps Script 上の種類 */
function updType_(name) {
  if (/\.html$/i.test(name)) return "HTML";
  if (/\.json$/i.test(name)) return "JSON";
  return "SERVER_JS";
}
/** ファイル名から拡張子を落とす（Apps Script 上の名前にする） */
function updBase_(name) { return String(name).replace(/\.(gs|js|html|json)$/i, ""); }


/* ============ 読み元（GitHub か ドライブか） ============ */
/*
 * GitHub の鍵を入れてあれば GitHub から、無ければドライブから読む。
 * 鍵は ScriptProperties にしまう。コードにもシートにも書かない。
 */

function updProps_() { return PropertiesService.getScriptProperties(); }

/** 設定タブから読む（無ければ ""）。鍵だけはここに置かない */
function updCfg_(key) {
  try { return typeof cfg_ === "function" ? String(cfg_(key) || "").trim() : ""; }
  catch (e) { return ""; }
}

function updRepo_() {
  return updProps_().getProperty("GH_REPO") || updCfg_("コードの置き場（GitHub）") || "";
}
function updPath_() {
  return updProps_().getProperty("GH_PATH") || updCfg_("コードのフォルダ") || "gas";
}
function updToken_()  { return updProps_().getProperty("GH_TOKEN")  || ""; }

/**
 * どの枝（ブランチ）から読むか。
 *
 * ★ここで詰まっていた：
 *   何も決めていないと "main" を見にいくが、このリポジトリに main は無い。
 *   そのため [1] を押しても「置き場所が見つかりません」で止まっていた。
 *   決めていないときは、GitHubに「この置き場の既定の枝はどれ？」と聞いて、それを使う。
 *   一度聞いたら覚えておく（毎回聞かない）。
 */
function updBranch_() {
  const pr = updProps_();
  const set = pr.getProperty("GH_BRANCH") || updCfg_("コードの枝（ブランチ）");
  if (set) return set;

  const cached = pr.getProperty("GH_BRANCH_AUTO");
  if (cached) return cached;

  try {
    const info = JSON.parse(updGh_("https://api.github.com/repos/" + updRepo_(), false));
    if (info && info.default_branch) {
      pr.setProperty("GH_BRANCH_AUTO", info.default_branch);
      return info.default_branch;
    }
  } catch (e) { logErr_("updBranch", e); }
  return "main";
}

/** いまどこから読むか */
function updSource_() { return (updRepo_() && updToken_()) ? "github" : "drive"; }

/** GitHub を叩く */
function updGh_(url, raw) {
  const res = UrlFetchApp.fetch(url, {
    headers: {
      "Authorization": "Bearer " + updToken_(),
      "Accept": raw ? "application/vnd.github.raw" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "taxi-gas-updater"
    },
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    let why = res.getContentText().slice(0, 200);
    try { why = JSON.parse(res.getContentText()).message; } catch (e) {}
    if (code === 401) why = "鍵が違うか、期限切れです（" + why + "）";
    if (code === 404) why = "置き場所が見つかりません。" +
      "リポジトリ名・ブランチ・フォルダ名と、鍵にそのリポジトリの読み取り権限があるかを見てください（" + why + "）";
    throw new Error("GitHub (" + code + ") " + why);
  }
  return res.getContentText();
}

/** GitHub のフォルダにあるコードのファイル一覧（中身は読まない） */
function updListGitHub_() {
  const base = "https://api.github.com/repos/" + updRepo_() + "/contents/";
  const dir = JSON.parse(updGh_(
    base + encodeURI(updPath_()) + "?ref=" + encodeURIComponent(updBranch_()), false));
  if (!Array.isArray(dir)) throw new Error("フォルダではありませんでした：" + updPath_());

  const out = [];
  dir.forEach(function (e) {
    if (e.type !== "file") return;
    if (!/\.(gs|html|json)$/i.test(e.name)) return;
    out.push({ name: updBase_(e.name), type: updType_(e.name),
               path: e.path, sha: e.sha });
  });
  return out;
}

/**
 * 前に取り込んだときの目印（GitHubのsha）。
 * これと同じなら、そのファイルは変わっていないので読みに行かない。
 * ぜんぶで400KBほどあるので、毎回ぜんぶ読むと時間がかかりすぎる。
 */
function updShas_() {
  try {
    return JSON.parse(updProps_().getProperty("GH_SHAS") || "{}");
  } catch (e) { return {}; }
}
function updSaveShas_(map) {
  try { updProps_().setProperty("GH_SHAS", JSON.stringify(map)); } catch (e) {}
}

/**
 * GitHub から、変わったファイルだけ中身を読む。
 * 戻り値は { files: 読んだもの, skipped: 変わっていなかった名前, shas: 新しい目印 }
 */
function updReadGitHub_() {
  const base = "https://api.github.com/repos/" + updRepo_() + "/contents/";
  const list = updListGitHub_();
  const old = updShas_();
  const files = [], skipped = [], shas = {};

  list.forEach(function (e, i) {
    shas[e.name] = e.sha;
    if (old[e.name] && old[e.name] === e.sha) { skipped.push(e.name); return; }
    updBeat_("読み込み中… " + e.name + "（" + (i + 1) + "/" + list.length + "）");
    files.push({
      name: e.name, type: e.type,
      source: updGh_(base + encodeURI(e.path) + "?ref=" +
                     encodeURIComponent(updBranch_()), true)
    });
  });
  return { files: files, skipped: skipped, shas: shas };
}

/** 名前だけ調べる（「更新できる状態か調べる」用。中身は読まない） */
function updListNew_() {
  if (updSource_() === "github") {
    return updListGitHub_().map(function (e) { return e.name; });
  }
  const folder = updFolder_();
  const seen = {};
  const it = folder.getFiles();
  while (it.hasNext()) {
    const nm = it.next().getName();
    if (/\.(gs|html|json)$/i.test(nm)) seen[updBase_(nm)] = 1;
  }
  return Object.keys(seen);
}

/** 新しいコードを読む。読み元は自動で決まる */
function updReadNew_() {
  if (updSource_() === "github") return updReadGitHub_();
  return { files: updReadDrive_(), skipped: [], shas: null };
}

/** GitHub の置き場所と鍵を入れる */
function menuSetGitHub() {
  const ui = SpreadsheetApp.getUi();
  const ask = function (title, msg, cur) {
    const r = ui.prompt(title, msg + (cur ? "\n\nいま：" + cur : ""), ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return null;
    return r.getResponseText().trim();
  };

  const repo = ask("🔑 GitHub 1/4", "リポジトリ名（例：circlenine/test）", updRepo_());
  if (repo === null) return;
  const branch = ask("🔑 GitHub 2/4", "ブランチ名", updBranch_());
  if (branch === null) return;
  const path = ask("🔑 GitHub 3/4", "コードが入っているフォルダ（例：gas）", updPath_());
  if (path === null) return;
  const token = ask("🔑 GitHub 4/4",
    "アクセストークン（github_pat_… で始まるもの）\n" +
    "空のままにすると、いまの鍵をそのまま使います。", updToken_() ? "設定済み" : "未設定");
  if (token === null) return;

  const pr = updProps_();
  if (repo)   pr.setProperty("GH_REPO", repo);
  if (branch) pr.setProperty("GH_BRANCH", branch);
  if (path)   pr.setProperty("GH_PATH", path);
  if (token)  pr.setProperty("GH_TOKEN", token);

  // ちゃんと読めるか、その場で試す
  try {
    const n = updReadGitHub_();
    updTell_("✅ GitHub につながりました",
      "見つかったファイル：" + n.map(function (f) { return f.name; }).join("、"));
  } catch (e) {
    updTell_("❌ つながりませんでした", e.message);
  }
}


/* ================================================================
 *  LINEから「コード更新」と打って、そのまま取り込む
 *
 *  ★スマホしか無いのに、コードを1本ずつ貼り替えるのは無理がある。
 *    GitHubから取り込む仕掛け（[1]）はもとからあるので、
 *    それをLINEからも押せるようにする。これで貼り替えは要らなくなる。
 *
 *  ★取り込みは2〜3分かかる。LINEの受け口の中でそのままやると、
 *    LINEが「返事が無い」と思って同じ合図を送り直してくる。
 *    すると二重に取り込んでしまう。
 *    そこで「1秒後に1回だけ動く見張り」を置いて、すぐ返事を返し、
 *    取り込みそのものは裏でやる。終わったら結果を送る。
 * ================================================================ */

/** LINEから頼まれた取り込みを、裏で1回だけ動かす */
function updRunFromLine_() {
  const pr = updProps_();
  const to = pr.getProperty("UPD_LINE_TO") || "";
  pr.deleteProperty("UPD_LINE_TO");

  // 自分（この一度きりの見張り）を片づける。残すと見張りの数を食う
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === "updRunFromLine_") ScriptApp.deleteTrigger(t);
    });
  } catch (e) {}

  let out = "";
  try { out = menuUpdateCode() || "終わりました"; }
  catch (e) { out = "❌ 取り込みに失敗しました\n" + (e && e.message ? e.message : e); }

  if (to && typeof lrPush_ === "function") {
    try { lrPush_(to, [{ type: "text", text: String(out).slice(0, 4900) }]); } catch (e) {}
  }
}

/**
 * LINEからの「コード更新」を受ける。扱ったら true。
 * まーくさん以外からは受けない。必ず2段階で確かめる。
 */
function updHandleNote_(ev) {
  const t = String((ev && ev.message && ev.message.text) || "").trim().replace(/[\s\u3000]/g, "");
  if (!/^(コード更新|コードを更新|更新|アップデート|コード取り込み)$/.test(t)) return false;

  const uid = (ev.source && ev.source.userId) || "";
  let me = "";
  try { if (typeof rpTestTarget_ === "function") me = rpTestTarget_(); } catch (e) {}
  if (!me) { try { for (const id in SENDER_MAP) { if (SENDER_MAP[id] === "ﾏｰｸ") me = id; } } catch (e) {} }
  if (!me || uid !== me) return false;

  const reply = (ev && ev.replyToken) || "";
  const say = function (x) { if (typeof lineReply_ === "function") lineReply_(reply, x); };
  const c = CacheService.getScriptCache();
  const k = "UPDOK_" + uid;

  // 1段目：何が入るのかを見せて、聞き返す
  if (!c.get(k)) {
    let where = "";
    try {
      where = updSource_() === "github"
        ? "GitHub（" + updRepo_() + " / " + updBranch_() + "）" : "ドライブ";
    } catch (e) { where = "（読み元が分かりません）"; }
    let names = "";
    try { names = updListNew_().join("、"); } catch (e) { names = "（一覧を読めませんでした：" + (e && e.message ? e.message : e) + "）"; }
    c.put(k, "1", 300);
    say("🔄 コードを取り込みます。よろしいですか\n" +
        "読み元：" + where + "\n" +
        "対象：" + (names || "なし") + "\n" +
        "・書き換える前に、いまのコードをドライブに保存します\n" +
        "・よければ5分以内に「はい」と返してください");
    return true;
  }
  return false;
}

/**
 * 「はい」を受けて、実際に取り込みを始める。扱ったら true。
 * 上の updHandleNote_ で聞き返したあと、5分以内のときだけ効く。
 */
function updHandleYes_(ev) {
  const t = String((ev && ev.message && ev.message.text) || "").trim().replace(/[\s\u3000]/g, "");
  if (!/^(はい|ハイ|OK|ok|お願い|おねがい)$/.test(t)) return false;
  const uid = (ev.source && ev.source.userId) || "";
  const c = CacheService.getScriptCache();
  const k = "UPDOK_" + uid;
  if (!c.get(k)) return false;                 // 聞き返していないなら、ただの雑談
  c.remove(k);

  const reply = (ev && ev.replyToken) || "";
  try { updProps_().setProperty("UPD_LINE_TO", uid); } catch (e) {}
  try {
    // 1秒後に1回だけ動く見張り。LINEの受け口はここですぐ終わらせる
    ScriptApp.newTrigger("updRunFromLine_").timeBased().after(1000).create();
  } catch (e) {
    if (typeof lineReply_ === "function") {
      lineReply_(reply, "🔍 くそっ!!!!やられた!!!!　取り込みを始められません：" + (e && e.message ? e.message : e));
    }
    return true;
  }
  if (typeof lineReply_ === "function") {
    lineReply_(reply, "ジェバンニが一晩でやってくれます…\n" +
                      "取り込みを始めました。2〜3分で結果をお送りします");
  }
  return true;
}


/* ============ メニューから呼ぶもの ============ */

/**
 * ドライブに置いてある新しいコードで、このプロジェクトを更新する。
 * 何を入れ替えるかを見せて、確認してから書き込む。
 */
function menuUpdateCode() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}

  const where = updSource_() === "github"
    ? "GitHub（" + updRepo_() + " / " + updBranch_() + " / " + updPath_() + "）"
    : "ドライブ（" + UPD_FOLDER + "）";

  updProgress_("新しいコードを読み込んでいます…", 160);
  let got;
  try {
    got = updReadNew_();
  } catch (e) {
    return updTell_("❌ " + where + " を読めませんでした", e.message);
  }
  const neu = got.files;
  if (!neu.length && !got.skipped.length) {
    return updTell_("📂 新しいコードがありません",
      where + " に .gs のファイルが見つかりませんでした。");
  }
  if (!neu.length) {
    return updTell_("✅ すでに最新です",
      "前に取り込んだときから、どれも変わっていません。\n（" +
      got.skipped.join("、") + "）");
  }

  // いまの中身を取る（ここで API が使えるかどうかも分かる）
  let cur;
  try {
    cur = updGetProject_();
  } catch (e) {
    return updTell_("❌ Apps Script API を使えませんでした",
      e.message + "\n\n" +
      "ブラウザで script.google.com/home/usersettings を開き、\n" +
      "「Google Apps Script API」を ON にしてください。");
  }

  // 何が変わるかを数える
  const byName = {};
  cur.files.forEach(function (f) { byName[f.name] = f; });
  const add = [], mod = [], same = [];
  neu.forEach(function (f) {
    const old = byName[f.name];
    if (!old) add.push(f.name);
    else if (String(old.source) !== String(f.source)) mod.push(f.name);
    else same.push(f.name);
  });

  // 名前が変わったせいで消すもの
  const stale = updStale_(neu, cur.files);

  if (!add.length && !mod.length && !stale.length) {
    return updTell_("✅ すでに最新です", "入れ替えるものはありませんでした。");
  }

  if (ui) {
    const a = ui.alert("🔄 コードを更新する",
      "入れ替える：" + (mod.join("、") || "なし") + "\n" +
      "新しく足す：" + (add.join("、") || "なし") + "\n" +
      (stale.length ? "名前が変わったので消す：" + stale.join("、") + "\n" : "") +
      "そのまま　：" + (same.join("、") || "なし") + "\n\n" +
      "書き換える前に、いまのコードをドライブに保存します。\n" +
      "進めますか？", ui.ButtonSet.YES_NO);
    if (a !== ui.Button.YES) return;
  }

  updProgress_("いまのコードを保存しています…", 70);
  ss.toast("いまのコードを保存しています…", "🔄 更新中", 60);
  updBeat_("保存中");

  // ① まず今の中身を保存する。戻せないまま壊すのがいちばん困る
  let backupName = "";
  try {
    backupName = updBackup_(cur);
  } catch (e) {
    return updTell_("❌ バックアップできませんでした",
      "危ないので中止しました。\n" + e.message);
  }

  // ② 差し替える。ドライブに無いファイルはそのまま残す。
  //    ただし、名前が変わったファイルの「前の名前」だけは落とす
  //    （両方あると、同じ const を2回宣言することになって全部止まる）
  const merged = cur.files.filter(function (f) {
    return stale.indexOf(f.name) === -1;
  }).map(function (f) {
    for (let i = 0; i < neu.length; i++) {
      if (neu[i].name === f.name) return neu[i];
    }
    return f;
  });
  neu.forEach(function (f) {
    if (!byName[f.name]) merged.push(f);
  });

  updProgress_("コードを書き込んでいます…", 45);
  ss.toast("コードを書き込んでいます…", "🔄 更新中", 60);
  updBeat_("書き込み中");
  try {
    updPutProject_(merged);
  } catch (e) {
    return updTell_("❌ 書き込めませんでした",
      e.message + "\n\nコードは元のままです。（保存：" + backupName + "）");
  }

  // 書き込めたので、次から「変わっていないもの」を読まずに済むよう目印を覚える
  if (got.shas) updSaveShas_(got.shas);

  // ③ ウェブアプリのデプロイもやり直す
  updProgress_("デプロイをやり直しています…", 30);
  let dep = "";
  try {
    dep = updRedeploy_();
  } catch (e) {
    dep = "デプロイのやり直しは失敗しました（" + e.message + "）";
  }

  return updTell_("✅ 更新しました（" + (mod.length + add.length) + "件）",
    "入れ替え：" + (mod.join("、") || "なし") + "\n" +
    "追加　　：" + (add.join("、") || "なし") + "\n" +
    (stale.length ? "消した　：" + stale.join("、") + "（名前が変わったため）\n" : "") +
    (got.skipped.length ? "変更なし：" + got.skipped.join("、") + "\n" : "") +
    dep + "\n\n" +
    "戻すときはメニュー「⏪ 前のコードに戻す」。\n" +
    "保存：" + UPD_FOLDER + "/" + UPD_BACKUP + "/" + backupName);
}

/** 書き換える直前の状態に戻す */
function menuRestoreCode() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}

  let files, from;
  try {
    const b = updLatestBackup_();
    files = b.files; from = b.name;
  } catch (e) {
    return updTell_("❌ 戻せませんでした", e.message);
  }

  if (ui) {
    const a = ui.alert("⏪ 前のコードに戻す",
      from + "\nの状態に戻します。よろしいですか？", ui.ButtonSet.YES_NO);
    if (a !== ui.Button.YES) return;
  }
  try {
    updPutProject_(files);
  } catch (e) {
    return updTell_("❌ 戻せませんでした", e.message);
  }

  // コードを戻しただけでは、実際に動いているものは古いまま。
  // LINEの受け口も みんなの記録ページも、デプロイした版で動いているので、
  // ここでやり直さないと「戻した」ことにならない。
  let dep = "";
  try { dep = updRedeploy_(); }
  catch (e) { dep = "⚠️ デプロイのやり直しに失敗しました（" + e.message + "）\n" +
                    "　　コードは戻っていますが、動いているものは古いままです。\n" +
                    "　　「デプロイを管理」→ 鉛筆 → 新バージョン → デプロイ をしてください。"; }

  updTell_("⏪ 戻しました", from + " の状態にしました。\n" + dep);
}

/** いまのコードを、ドライブに保存しておくだけ */
function menuBackupCode() {
  let name = "";
  try {
    name = updBackup_(updGetProject_());
  } catch (e) {
    return updTell_("❌ 保存できませんでした", e.message);
  }
  updTell_("💾 保存しました", UPD_FOLDER + "/" + UPD_BACKUP + "/" + name);
}

/** いまの状態を見る（APIが使えるか、ドライブに何があるか） */
function menuUpdateStatus() {
  const L = [];
  L.push("このファイル：" + UPD_VERSION);

  try {
    const cur = updGetProject_();
    L.push("✅ Apps Script API：使えます");
    L.push("　いまのファイル：" +
      cur.files.map(function (f) { return f.name; }).join("、"));
  } catch (e) {
    L.push("❌ Apps Script API：使えません");
    L.push("　" + e.message);
    L.push("　script.google.com/home/usersettings で ON にしてください");
  }

  L.push("");
  if (updSource_() === "github") {
    L.push("読み元：GitHub");
    L.push("　置き場：" + updRepo_());
    L.push("　枝　　：" + updBranch_() +
      (updProps_().getProperty("GH_BRANCH") || updCfg_("コードの枝（ブランチ）") ? "" : "（自動で調べたもの）"));
    L.push("　フォルダ：" + updPath_());
  } else {
    L.push("読み元：Googleドライブ　" + UPD_FOLDER);
    L.push("");
    L.push("⚠️ GitHubから読む用意ができていません。");
    if (!updRepo_()) L.push("　・置き場が未設定 → 設定タブ「コードの置き場（GitHub）」に circlenine/test と入れてください");
    if (!updToken_()) {
      L.push("　・鍵が未設定 → ここだけはパソコンかスマホのブラウザで、");
      L.push("　　メニュー「🔄 コードの更新 → 🔑 GitHubの鍵を設定」から入れてください。");
      L.push("　　（鍵は他人に見られてはいけないので、シートには置けません。1回だけの作業です）");
    }
  }

  try {
    // ここは名前が分かればよい。中身まで読むと時間がかかりすぎる
    const names = updListNew_();
    L.push(names.length
      ? "　見つかったファイル：" + names.join("、")
      : "　.gs のファイルが見つかりません");
  } catch (e) {
    L.push("　読めません：" + e.message);
  }

  updTell_("🔧 自動更新の状態", L.join("\n"));
}


/* ============ 中身 ============ */

/** 結果を、出せる場所ぜんぶに出す（スマホだとダイアログが出ないことがある） */
function updTell_(title, body) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(String(body).slice(0, 400), title, 30); } catch (e) {}
  try { infoSet_(INFO_ROW.UPDATE, title + "\n" + body, "最後の更新"); } catch (e) {}
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, body, ui.ButtonSet.OK);
  } catch (e) {}

  // そうさボタンの結果らんにも、そのまま出せるように返す。
  // 返さないと「終わりました」だけになって、何が入れ替わったのか
  // スマホからは確かめられなかった（説明タブのZ5を見るしかなかった）
  return title + "\n" + body;
}

/** ドライブの「taxi-gas」フォルダ。無ければ作る */
function updFolder_() {
  const it = DriveApp.getFoldersByName(UPD_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(UPD_FOLDER);
}

/** その中の「backup」フォルダ。無ければ作る */
function updBackupFolder_() {
  const parent = updFolder_();
  const it = parent.getFoldersByName(UPD_BACKUP);
  return it.hasNext() ? it.next() : parent.createFolder(UPD_BACKUP);
}

/**
 * ドライブから新しいコードを読む。
 * 同じ名前が何個かあったら、いちばん新しいものを使う。
 * （ドライブは同名ファイルを何個でも置けてしまうため）
 */
function updReadDrive_() {
  const folder = updFolder_();
  const best = {};
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const nm = f.getName();
    if (!/\.(gs|html|json)$/i.test(nm)) continue;
    const base = updBase_(nm);
    const t = f.getLastUpdated().getTime();
    if (!best[base] || t > best[base].t) best[base] = { t: t, f: f, nm: nm };
  }
  return Object.keys(best).map(function (base) {
    return {
      name: base,
      type: updType_(best[base].nm),
      source: best[base].f.getBlob().getDataAsString("UTF-8")
    };
  });
}

/** Apps Script API を叩く */
function updApi_(path, method, payload) {
  const opt = {
    method: method,
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    contentType: "application/json",
    muteHttpExceptions: true
  };
  if (payload) opt.payload = JSON.stringify(payload);

  const res = UrlFetchApp.fetch(UPD_API + ScriptApp.getScriptId() + path, opt);
  const code = res.getResponseCode();
  const txt = res.getContentText();
  if (code < 200 || code >= 300) {
    let why = txt.slice(0, 200);
    try { why = JSON.parse(txt).error.message; } catch (e) {}
    throw new Error("(" + code + ") " + why);
  }
  return JSON.parse(txt);
}

/** いまのプロジェクトの中身を取る */
function updGetProject_() {
  const r = updApi_("/content", "get", null);
  return { files: r.files || [] };
}

/** プロジェクトの中身を書き換える */
function updPutProject_(files) {
  if (!files || !files.length) throw new Error("書き込む中身がありません");
  // appsscript.json を落とすとプロジェクトが壊れるので、必ず入っているか確かめる
  let hasManifest = false;
  files.forEach(function (f) { if (f.name === "appsscript") hasManifest = true; });
  if (!hasManifest) throw new Error("appsscript が入っていません（危ないので中止）");

  const body = files.map(function (f) {
    return { name: f.name, type: f.type, source: f.source };
  });
  updApi_("/content", "put", { files: body });
}

/** いまの中身を、日時つきでドライブに保存する */
function updBackup_(cur) {
  const folder = updBackupFolder_();
  const now = new Date();
  const stamp = now.getFullYear() + pad2_(now.getMonth() + 1) + pad2_(now.getDate()) + "_" +
                pad2_(now.getHours()) + pad2_(now.getMinutes()) + pad2_(now.getSeconds());
  const sub = folder.createFolder(stamp);
  cur.files.forEach(function (f) {
    const ext = f.type === "HTML" ? ".html" : (f.type === "JSON" ? ".json" : ".gs");
    sub.createFile(f.name + ext, f.source, "text/plain");
  });
  // 古いものを増やしすぎない（10個まで残す）
  try { updTrimBackups_(folder, 10); } catch (e) {}
  return stamp;
}

/** バックアップは新しいほうから n 個だけ残す */
function updTrimBackups_(folder, n) {
  const list = [];
  const it = folder.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    list.push({ f: f, t: f.getDateCreated().getTime() });
  }
  list.sort(function (a, b) { return b.t - a.t; });
  list.slice(n).forEach(function (x) { x.f.setTrashed(true); });
}

/** いちばん新しいバックアップを読む */
function updLatestBackup_() {
  const folder = updBackupFolder_();
  let best = null;
  const it = folder.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    const t = f.getDateCreated().getTime();
    if (!best || t > best.t) best = { t: t, f: f };
  }
  if (!best) throw new Error("保存されたコードがありません");

  const files = [];
  const fi = best.f.getFiles();
  while (fi.hasNext()) {
    const f = fi.next();
    files.push({
      name: updBase_(f.getName()),
      type: updType_(f.getName()),
      source: f.getBlob().getDataAsString("UTF-8")
    });
  }
  if (!files.length) throw new Error("保存されたコードが空でした");
  return { name: best.f.getName(), files: files };
}

/**
 * ウェブアプリのデプロイを、新しい版でやり直す。
 * これをしないと、コードを直してもページは古いままになる。
 */
function updRedeploy_() {
  const deps = updApi_("/deployments", "get", null).deployments || [];
  // @HEAD（作業中の版）は触らない。公開しているものだけ相手にする
  const live = deps.filter(function (d) {
    const c = d.deploymentConfig || {};
    return c.versionNumber;
  });
  if (!live.length) {
    return "デプロイがまだありません（ウェブページを使うなら「新しいデプロイ」を1回してください）";
  }

  const ver = updApi_("/versions", "post",
    { description: "自動更新 " + new Date().toISOString() });

  let n = 0;
  live.forEach(function (d) {
    updApi_("/deployments/" + d.deploymentId, "put", {
      deploymentConfig: {
        scriptId: ScriptApp.getScriptId(),
        versionNumber: ver.versionNumber,
        manifestFileName: "appsscript",
        description: d.deploymentConfig.description || ""
      }
    });
    n++;
  });
  return "デプロイもやり直しました（版 " + ver.versionNumber + " / " + n + "件）";
}


/* ================================================================
 *  そうさパネル
 *
 *  スマホの「Googleスプレッドシート」アプリでは、
 *  この手のメニューが最初から出ない。ボタン（図形）も押せない。
 *  でも「セルにチェックを入れる」ことはできる。
 *
 *  そこで、チェックを入れたら動く形にする。
 *  　・チェックした瞬間に動く（onEdit のトリガー）
 *  　・それが効かない機種のために、1分おきの見張りも置く
 *  どちらか片方でも効けば動く。二重に動かないよう鍵をかけてある。
 * ================================================================ */

/**
 * ボタンを置く場所。
 * 新しいタブは作らず、「説明」タブの8行目から下だけを使う。
 * 8行目より上には、グループIDなど大事なものが入っているので絶対に触らない。
 */
const PANEL_TAB       = "説明";
const PANEL_FIRST_ROW = 8;    // まだ置いていないときに、はじめて置く行
const PANEL_CHK_COL   = 2;    // はじめて置くときのチェックの列（B。A列は余白として使っている）
const PANEL_CHK_SIZE  = 50;   // チェックの大きさ（スマホで押しやすいように）
const PANEL_CHK_H     = 70;   // チェックの行の高さ
const PANEL_GAP_MAX   = 4;    // ボタンの間に空けてよい行数（押し間違い防止の空行用）
const PANEL_RESULT_H  = 42;   // 結果らんの、ふだんの高さ
const PANEL_STALL_SEC = 150;  // 何秒うんともすんとも言わなければ「止まった」とみなすか
const PANEL_HEAD      = "▼ チェックを入れると動きます（終わると自動で外れます）";
// 見出しを探すときの手がかり。文言を少し直しても見つけられるようにしておく
const PANEL_MARK      = "チェックを入れると動きます";
const PANEL_SCAN      = 300;  // 見出しをどこまで探すか（行）

/**
 * 上から順に並べるボタン。
 *
 * 入れていない機能も含めて、いつも同じ6つを並べる。
 * ここで数が変わると、結果らんの行も保護する範囲もずれてしまうため。
 * 押されたときに「まだ入っていません」と知らせるほうが、ずっと分かりやすい。
 */
function panelItems_() {
  return [
    { key: "コードを更新",         label: "[1] コードを更新する",        fn: "menuUpdateCode",
      sec: 180,
      note: "GitHubの新しいコードを取り込み、デプロイもやり直します" },
    { key: "更新できる状態",       label: "[2] 更新できる状態か調べる",  fn: "menuUpdateStatus",
      sec: 20,
      note: "APIが使えるか、どこから読むかを見ます" },
    { key: "全タブをまとめて整形", label: "[3] 全タブをまとめて整形する", fn: "menuFormatAll",
      sec: 150,
      note: "並び順・色・行の高さを整えます" },
    { key: "前のコードに戻す",     label: "[4] 前のコードに戻す",        fn: "menuRestoreCode",
      sec: 70,
      note: "更新で壊れたとき用。直前の状態に戻します" },
    { key: "URLをLINE",            label: "[5] ページのURLをLINEに送る",
      fn: "menuWebAppSendLineStep", sec: 20,
      note: "1回目は自分だけ。3分以内にもう1回でグループ全員へ" },
    { key: "開けるか調べる",       label: "[6] ページが開けるか調べる",  fn: "menuWebAppCheck",
      sec: 30,
      note: "みんなの記録ページが本当に開けるか、実際に試します" },
    { key: "レポートをLINE",       label: "[7] レポートをLINEに送る",    fn: "menuSendReportPanel",
      sec: 90, stall: 420,
      note: "すぐ上の「期間」と「送り先」のとおりに送ります。" +
            "グループ（本番）は、もう一度チェックで確定します" },
    { key: "自動送信の状態",       label: "[8] 自動送信の状態を見る",    fn: "panelAutoReportStatus",
      sec: 20,
      note: "毎月の自動送信が入っているかを見ます。入っていなければ入れ直します。" +
            "まとめスプシを誰が見られるかも出し、足りない人がいれば足します" },
    // key は、ほかのボタンの文言に含まれない言葉にする。
    // 「イベント」だけだと [10] の文言にも含まれてしまい、同じボタンだと誤解される
    { key: "イベント情報を調べ",   label: "[9] イベント情報を調べる",    fn: "panelVenueProbe",
      sec: 60, stall: 240,
      note: "大阪城ホールなどのページが読めるか確かめ、結果をまーく個人のLINEにも送ります" },
    { key: "イベントの絵の見本",   label: "[10] イベントの絵の見本を見る", fn: "menuVenueSample",
      sec: 25,
      note: "どんな見た目でイベント情報が届くか、まーく個人のLINEにだけ送って見せます" },
    { key: "きょうのイベントを試",  label: "[11] きょうのイベントを試し送りする", fn: "menuVenueTestSend",
      sec: 45, stall: 180,
      note: "きょう17:00に出るはずの中身を、そのまままーく個人のLINEにだけ送ります" },
    { key: "イベントの自動発信",   label: "[12] イベントの自動発信を入切する", fn: "panelVenueAuto",
      sec: 20,
      note: "16:30にまーくさんへ確認用、17:00にグループへ送るかどうかを切り替えます。" +
            "1回押すと今の状態が出るだけ。3分以内にもう1回で切り替わります" },
    { key: "読み取れているもの",   label: "[13] 読み取れているものの一覧を見る", fn: "panelVenueList",
      sec: 70, stall: 240,
      note: "各ページから、きょうのぶんが実際に何件読めているかを出します。" +
            "読んだ元の文字もそのまま出るので、外していればすぐ分かります" }
  ];
}

/* ---- [7] の入力らん（プルダウン） ---- */

/** 入力らんの見出し。この文字でセルを探すので、変えると読めなくなる */
const PANEL_IN_PERIOD = "▼ レポートの期間";
const PANEL_IN_DEST   = "▼ レポートの送り先";
const PANEL_DEST_TEST  = "🧪 自分だけ（テスト）";
const PANEL_DEST_GROUP = "👥 グループ全員（本番）";

/**
 * 期間のプルダウンに出す一覧。
 *
 * 記録を読みにいかない。読むと（全タブ走査で）数秒かかり、
 * ボタンを置くたびに待たされるため。16日起点の期間を、こよみだけで作る。
 */
function panelPeriodChoices_(today) {
  const now = today || new Date();
  const dow = ["日", "月", "火", "水", "木", "金", "土"];
  const md = function (d) { return (d.getMonth() + 1) + "/" + d.getDate() + "(" + dow[d.getDay()] + ")"; };

  const ps = (typeof lrPeriodStart_ === "function")
    ? lrPeriodStart_(now)
    : new Date(now.getFullYear(), now.getMonth() - (now.getDate() >= 16 ? 0 : 1), 16);

  const out = ["今期（" + md(ps) + "〜" + md(now) + "）"];
  for (let i = 1; i <= 12; i++) {
    const a = new Date(ps.getFullYear(), ps.getMonth() - i, 16);
    const b = new Date(ps.getFullYear(), ps.getMonth() - i + 1, 15);
    out.push((i === 1 ? "前期（" : (a.getFullYear() + "年 ")) +
             md(a) + "〜" + md(b) + (i === 1 ? "）" : ""));
  }
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  out.push("今日（" + md(now) + "）");
  out.push("昨日（" + md(y) + "）");
  out.push("今月");
  out.push("先月");
  return out;
}

/**
 * 見出しの文字からセルを探して、そのすぐ右のセルを返す。無ければ null。
 * 行も列も決め打ちにしない（見やすいように動かしても付いていけるように）。
 */
function panelInputCell_(sh, label) {
  if (!sh) return null;
  try {
    const hit = sh.createTextFinder(label).matchEntireCell(false).findNext();
    if (hit) return { row: hit.getRow(), col: hit.getColumn() + 1 };
  } catch (e) {}
  return null;
}

/** 入力らんの中身を読む。無ければ "" */
function panelInputGet_(sh, label) {
  const c = panelInputCell_(sh, label);
  if (!c) return "";
  try { return String(sh.getRange(c.row, c.col).getValue() || "").trim(); }
  catch (e) { return ""; }
}

/** 入力らんに書き込む */
function panelInputSet_(sh, label, value) {
  const c = panelInputCell_(sh, label);
  if (!c) return false;
  try { sh.getRange(c.row, c.col).setValue(value); return true; }
  catch (e) { return false; }
}

/** 期間のプルダウンを作り直す（日が変われば中身も変わるので、置くたびに入れ直す） */
function panelSetPeriodList_(sh) {
  const c = panelInputCell_(sh, PANEL_IN_PERIOD);
  if (!c) return false;
  try {
    // 「打ち込みもできる」ようにする（setAllowInvalid(true)）。
    // 一覧に無い期間は 260716-0815 のように打てば、そのとおりに送れる。
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(panelPeriodChoices_(), true)
      .setAllowInvalid(true)
      .setHelpText("一覧から選ぶか、260716-0815 のように打ってください（末尾 t=自分だけ / h=グループ）")
      .build();
    sh.getRange(c.row, c.col).setDataValidation(rule);
    return true;
  } catch (e) { logErr_("panelSetPeriodList", e); return false; }
}

/** 送り先のプルダウン（2つだけ。打ち込みは受け付けない） */
function panelSetDestList_(sh) {
  const c = panelInputCell_(sh, PANEL_IN_DEST);
  if (!c) return false;
  try {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList([PANEL_DEST_TEST, PANEL_DEST_GROUP], true)
      .setAllowInvalid(false)
      .setHelpText("グループ（本番）は、チェックしたあともう一度チェックで確定します")
      .build();
    sh.getRange(c.row, c.col).setDataValidation(rule);
    return true;
  } catch (e) { logErr_("panelSetDestList", e); return false; }
}

/**
 * [7] の入力らん（期間・送り先）を用意する。
 *
 * すでに置いてあれば、プルダウンの中身だけ入れ直して、位置も文言も触らない。
 * 無ければ [7] のすぐ上に2行だけ差し込む。
 * ここも clear() は絶対にしない（もともと入っているものを消さないため）。
 */
function panelEnsureInputs_(sh) {
  if (!sh) return false;
  if (panelInputCell_(sh, PANEL_IN_PERIOD)) {
    panelSetPeriodList_(sh); panelSetDestList_(sh);
    return false;
  }

  // [7] の行を探す。無ければ、いちばん下のボタンの下に置く
  const rows = panelReadRows_(sh);
  let at = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].item && rows[i].item.key === "レポートをLINE") { at = rows[i].row; break; }
  }
  if (!at) at = panelLastRow_(sh);
  if (!at) return false;

  const top = panelTop_(sh);
  const chk = panelChkCol_(sh, top);
  sh.insertRowsBefore(at, 2);

  sh.getRange(at,     chk + 1).setValue(PANEL_IN_PERIOD);
  sh.getRange(at + 1, chk + 1).setValue(PANEL_IN_DEST);
  sh.getRange(at,     chk + 2).setValue("今期");
  sh.getRange(at + 1, chk + 2).setValue(PANEL_DEST_TEST);
  sh.getRange(at, chk + 1, 2, 1).setFontWeight("bold").setFontSize(11)
    .setVerticalAlignment("middle");
  sh.getRange(at, chk + 2, 2, 1).setFontSize(12).setVerticalAlignment("middle")
    .setHorizontalAlignment("left").setWrap(true);
  // チェックの列は空にしておく。ここにチェックがあると、
  // ボタンの行と間違えて実行してしまう
  try { sh.getRange(at, chk, 2, 1).clearDataValidations().setValue(""); } catch (e) {}
  try { sh.setRowHeights(at, 2, 34); } catch (e) {}

  panelSetPeriodList_(sh);
  panelSetDestList_(sh);
  return true;
}

/** 「約1分30秒」のような、読みやすい形にする */
function updSecText_(sec) {
  const n = Math.max(1, Math.round(sec));
  if (n < 60) return "約" + n + "秒";
  const m = Math.floor(n / 60), r = n % 60;
  return "約" + m + "分" + (r ? r + "秒" : "");
}

/** その機能がどのファイルに入っているか（入っていないときの案内用） */
/*
 * 名前が変わったファイルの表（新しい名前 → 前の名前）。
 *
 * ★これが無いと、名前を変えたときにプロジェクトが丸ごと止まる。
 *   更新は「新しい名前のファイルを足す」だけなので、前の名前のファイルが残る。
 *   どちらにも同じ const が書いてあるため、Apps Script は
 *   「Identifier 'VN_VERSION' has already been declared」で
 *   プロジェクト全体を動かさなくなる。
 *   そこで、新しい名前が入ってくるときは、前の名前のほうを消す。
 *
 *   ★ファイル名を変えたら、必ずここに1行足すこと。
 */
const UPD_RENAMED = {
  "006-Venue": "006-Events"
};

/**
 * 名前が変わったせいで要らなくなったファイルの名前をならべる。
 *
 * ★「これから入ってくる」だけでなく「もう入っている」ときも消す。
 *   更新は、変わっていないファイルを読み飛ばす作りになっている。
 *   そのため、新しい名前を入れたあとにもう一度押しても
 *   「これから入ってくるもの」は空になり、前の名前がずっと残ってしまっていた。
 *   もう入っているかどうかも見れば、次に押したときに必ず片づく。
 */
function updStale_(newFiles, curFiles) {
  const coming = {}, have = {}, out = [];
  (newFiles || []).forEach(function (f) { coming[f.name] = 1; });
  (curFiles  || []).forEach(function (f) { have[f.name] = 1; });
  for (const now in UPD_RENAMED) {
    const before = UPD_RENAMED[now];
    if ((coming[now] || have[now]) && have[before] && out.indexOf(before) === -1) out.push(before);
  }
  return out;
}

const PANEL_FROM = {
  menuUpdateCode:     "005-Updater",
  menuUpdateStatus:   "005-Updater",
  menuFormatAll:      "001-Code",
  menuRestoreCode:    "005-Updater",
  menuWebAppSendLineStep: "004-WebApp",
  menuWebAppCheck:    "004-WebApp",
  menuSendReportPanel: "003-LineReport",
  panelAutoReportStatus: "003-LineReport",
  panelVenueProbe: "006-Venue",
  menuVenueSample: "006-Venue",
  menuVenueTestSend: "006-Venue",
  panelVenueAuto: "006-Venue",
  panelVenueList: "006-Venue"
};

/** その関数がこのプロジェクトに入っているか */
function panelHas_(name) {
  try { return eval("typeof " + name) === "function"; }
  catch (e) { return false; }
}

/**
 * その文言が、どのボタンのことかを見分ける。
 *
 * 行の順番で決めない。順番で決めると、途中に足したり並べ替えたりしたときに
 * 「書いてある名前」と「動くもの」がずれてしまう。実際にそれで
 * 「全タブをまとめて整形する」を押すと別のものが動く状態になっていた。
 * 書いてある文言で決めれば、並べ替えても足しても、見たとおりに動く。
 */
function panelItemOf_(text) {
  const t = String(text == null ? "" : text).replace(/[\s\u3000]/g, "");
  if (!t) return null;
  const items = panelItems_();

  // まずは書いてある言葉で。人が読んでいるのはこちらなので、こちらを優先する
  for (let i = 0; i < items.length; i++) {
    if (t.indexOf(items[i].key.replace(/[\s\u3000]/g, "")) !== -1) return items[i];
  }

  // 言葉で分からなければ、先頭の [1] のような番号で。
  // 文言をうっかり書き換えてしまっても、番号が残っていれば動く
  const m = t.match(/^[\[［(（]?([1-9])[\]］)）\.。]/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= items.length) return items[n - 1];
  }
  return null;
}

/**
 * 置いてあるボタンを、上から順に読む。
 * 戻り値は [{ row, value, text, item }]。item が null なら、どれのことか分からない行。
 *
 * ボタンの間に空の行があってもよい（押し間違い防止に空けることがあるため）。
 * 「結果」と書いてある行まで来たら、そこで終わり。
 * 空の行が続いたときも、そこで終わりとみなす。
 */
function panelReadRows_(sh) {
  const top = panelTop_(sh);
  if (!top) return [];
  const chk = panelChkCol_(sh, top);
  const limit = Math.min(panelItems_().length * 3 + 8, sh.getMaxRows() - top + 1);
  if (limit <= 0) return [];

  const grid = sh.getRange(top, 1, limit, 6).getValues();
  const out = [];
  let blank = 0;
  for (let i = 0; i < limit; i++) {
    const row = grid[i];

    // 「結果」の行に来たら、ボタンはそこまで
    let isResult = false;
    for (let c = 0; c < 6; c++) {
      if (String(row[c]).trim() === "結果") { isResult = true; break; }
    }
    if (isResult) break;

    const v = row[chk - 1];
    if (v === true || v === false) {
      out.push({ row: top + i, value: v,
                 text: String(row[chk]), item: panelItemOf_(row[chk]) });
      blank = 0;
    } else {
      blank++;
      if (blank >= PANEL_GAP_MAX) break;   // ずっと空なら、そこで終わり
    }
  }
  return out;
}

/**
 * 押されているボタンの行だけを探す（軽い版）。
 *
 * panelReadRows_ は6列ぶん読んで文言まで調べるので、
 * 1分おきに走らせるには重い。ここはチェックのらん1列だけを見る。
 */
function panelPendingRow_(sh) {
  try {
    const top = panelTop_(sh);
    if (!top) return 0;
    const chk = panelChkCol_(sh, top);
    const limit = Math.min(panelItems_().length * 3 + 8, sh.getMaxRows() - top + 1);
    if (limit <= 0) return 0;
    const col = sh.getRange(top, chk, limit, 1).getValues();
    let blank = 0;
    for (let i = 0; i < limit; i++) {
      const v = col[i][0];
      if (v === true) return top + i;
      if (v === false) { blank = 0; continue; }
      blank++;
      if (blank >= PANEL_GAP_MAX) return 0;
    }
  } catch (e) { logErr_("panelPendingRow", e); }
  return 0;
}

/** ボタンの最後の行。無ければ 0 */
function panelLastRow_(sh) {
  const rows = panelReadRows_(sh);
  return rows.length ? rows[rows.length - 1].row : 0;
}

/** 並びを確かめる。足りないもの・重複・読めない行を返す */
function panelCheck_(sh) {
  const rows = panelReadRows_(sh);
  const seen = {}, dup = [], unknown = [];
  rows.forEach(function (r) {
    if (!r.item) { unknown.push(r); return; }
    if (seen[r.item.key]) dup.push(r);
    else seen[r.item.key] = r.row;
  });
  const missing = panelItems_().filter(function (x) { return !seen[x.key]; });
  return { rows: rows, missing: missing, dup: dup, unknown: unknown, seen: seen };
}

/** ボタンが占める行数（見出し・空き行・結果らんを含む） */
function panelRows_() { return panelItems_().length + 4; }

/**
 * 見出しが何行目にあるかを探す。無ければ 0。
 *
 * 行の位置を決め打ちにしない。見やすいように動かされても、
 * 見出しさえ残っていれば追いかけられるようにしておく。
 * 毎回シートを走査すると重いので、見つけた行は覚えておき、
 * 次からはそこだけ確かめる。
 */
function panelHeadRow_(sh) {
  const pr = PropertiesService.getScriptProperties();
  const cached = parseInt(pr.getProperty("PANEL_ROW"), 10);
  if (cached > 0 && panelIsHead_(sh, cached)) return cached;

  // シート全体から探す。上に行が増えても、何行増えても見つかる
  try {
    const hit = sh.createTextFinder(PANEL_MARK).matchEntireCell(false).findNext();
    if (hit) {
      const row = hit.getRow();
      pr.setProperty("PANEL_ROW", String(row));
      return row;
    }
  } catch (e) {
    // 古い環境などで使えないときは、A〜F列を順に見ていく
    const last = Math.min(sh.getMaxRows(), PANEL_SCAN);
    const grid = sh.getRange(1, 1, last, 6).getValues();
    for (let i = 0; i < grid.length; i++) {
      for (let c = 0; c < 6; c++) {
        if (String(grid[i][c]).indexOf(PANEL_MARK) !== -1) {
          pr.setProperty("PANEL_ROW", String(i + 1));
          return i + 1;
        }
      }
    }
  }
  pr.deleteProperty("PANEL_ROW");
  return 0;
}

/** その行が見出しか（列は決め打ちにしない。A〜F のどこかにあればよい） */
function panelIsHead_(sh, row) {
  try {
    if (row < 1 || row > sh.getMaxRows()) return false;
    const cols = sh.getRange(row, 1, 1, 6).getValues()[0];
    for (let c = 0; c < cols.length; c++) {
      if (String(cols[c]).indexOf(PANEL_MARK) !== -1) return true;
    }
    return false;
  } catch (e) { return false; }
}

/**
 * チェックが入っている列を見つける。
 *
 * 列を決め打ちにしない。A列を余白に使っていたり、
 * 見やすいように動かしたりしていても、そのまま動くようにするため。
 * 見出しの次の行で、いちばん左にある true/false のセルを探す。
 * 見つからなければ、はじめて置くときの列（B）を使う。
 */
function panelChkCol_(sh, top) {
  try {
    const row = sh.getRange(top, 1, 1, 6).getValues()[0];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === true || row[c] === false) return c + 1;
    }
  } catch (e) {}
  return PANEL_CHK_COL;
}

/** ラベルの列（チェックのすぐ右）／説明の列（そのまた右） */
function panelLabelCol_(sh, top) { return panelChkCol_(sh, top) + 1; }
function panelNoteCol_(sh, top)  { return panelChkCol_(sh, top) + 2; }

/** ボタンが始まる行。まだ置いていなければ 0 */
function panelTop_(sh) {
  const h = panelHeadRow_(sh);
  return h ? h + 1 : 0;
}

/**
 * 結果を書くセル。まだ置いていなければ null。
 *
 * 「結果」と書いてある行を、ボタンの下から探す。
 * 見つかれば、そのすぐ下の同じ列に書く。列を動かしていても付いていける。
 */
function panelResultCell_(sh) {
  const top = panelTop_(sh);
  if (!top) return null;
  const last = panelLastRow_(sh);
  const from = (last || top + panelItems_().length - 1) + 1;
  const room = Math.min(PANEL_GAP_MAX + 4, sh.getMaxRows() - from + 1);
  if (room > 0) {
    const grid = sh.getRange(from, 1, room, 6).getValues();
    for (let i = 0; i < grid.length; i++) {
      for (let c = 0; c < 6; c++) {
        if (String(grid[i][c]).trim() === "結果") {
          return { row: from + i + 1, col: c + 1 };
        }
      }
    }
  }
  // 見つからなければ、置いたときの並びで数える
  return { row: top + panelItems_().length + 2, col: panelChkCol_(sh, top) + 1 };
}

/** 結果を書く行（テストや案内で使う） */
function panelResultRow_(sh) {
  const c = panelResultCell_(sh);
  return c ? c.row : 0;
}

/**
 * 「説明」タブの8行目から下に、ボタンを置く。
 *
 * ここは既に使われているタブなので、clear() は絶対にしない。
 * 置こうとしている場所に見覚えのないものが入っていたら、
 * 上書きせずに中止する。消してしまうほうが困るため。
 */
function menuMakePanel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(PANEL_TAB);
  if (!sh) {
    return updTell_("❌ 「" + PANEL_TAB + "」タブがありません",
      "ボタンは「" + PANEL_TAB + "」タブに置きます。");
  }

  const items = panelItems_();
  const already = panelHeadRow_(sh);

  // すでに置いてあるなら、並べ直さない。
  // 見やすいように動かしたり、セルを結合したりしているかもしれないので、
  // こちらから書き換えると、その工夫を壊してしまう。
  if (already) {
    const chk = panelCheck_(sh);
    const locked = panelProtect_(sh);
    panelInstall_();

    // 直すところがあれば、こちらで書き換えず、どこを直せばよいかを伝える。
    // 見た目を整えてもらっているので、勝手に並べ直すほうが困る。
    if (chk.dup.length || chk.unknown.length) {
      const L = [];
      L.push("ボタン：" + (already + 1) + "行目から" + chk.rows.length + "行");
      L.push("");
      if (chk.dup.length) {
        L.push("同じものが2つあります");
        chk.dup.forEach(function (r) {
          L.push("　" + r.row + "行目：" + r.item.label +
                 "（" + chk.seen[r.item.key] + "行目にもあります）");
        });
        L.push("");
      }
      if (chk.unknown.length) {
        L.push("どのボタンか分からない行");
        chk.unknown.forEach(function (r) {
          L.push("　" + r.row + "行目：" + r.text.slice(0, 24));
        });
        L.push("");
      }
      if (chk.missing.length) {
        L.push("足りないもの（" + chk.missing.length + "個）");
        chk.missing.forEach(function (x) { L.push("　" + x.label); });
        L.push("");
        L.push("上の行の文言を、この「足りないもの」に書き換えてください。");
        L.push("チェックは書いてある文言を見て動くので、それだけで直ります。");
      } else {
        L.push("いらない行は、行ごと消してください。");
      }
      return updTell_("⚠️ ボタンの並びを直してください", L.join("\n"));
    }

    const added = panelSync_(sh, already);
    const madeIn = panelEnsureInputs_(sh);
    PropertiesService.getScriptProperties().setProperty("PANEL_SETUP_VER", UPD_VERSION);
    return updTell_("🧰 ボタンはもう置いてあります（" + already + "行目）",
      "ボタン：" + (already + 1) + "行目から" + panelReadRows_(sh).length + "個\n" +
      "結果らん：" + panelResultRow_(sh) + "行目\n\n" +
      (added ? "足りなかった " + added + "個のボタンを足しました。\n"
             : "そろっています。並びはそのままにしました。\n") +
      (madeIn ? "[7] の上に「レポートの期間」「レポートの送り先」を足しました。\n"
              : "期間のプルダウンを、今日の日付に合わせて入れ直しました。\n") +
      "見やすいように動かしたり結合したりしていても、そのまま使えます。\n" +
      "見張りのしくみを入れ直しました。\n\n" +
      (locked ? "🔒 チェックのらんは、あなただけが触れるようにしてあります。"
              : "⚠️ 保護をかけられませんでした。編集できる人なら誰でも押せます。"));
  }

  // --- ここからは、はじめて置くとき ---
  // 既にある行に書き込むのではなく、行そのものを新しく差し込む。
  // こうすれば、もともと入っているものを消してしまう心配がない。
  const head = PANEL_FIRST_ROW;
  const need = panelRows_();
  sh.insertRowsBefore(head, need);

  const chk   = PANEL_CHK_COL;
  const label = chk + 1;
  const note  = chk + 2;

  sh.getRange(head, label).setValue(PANEL_HEAD).setFontWeight("bold").setFontSize(11);

  const top = head + 1;
  for (let i = 0; i < items.length; i++) {
    sh.getRange(top + i, label).setValue(items[i].label);
    sh.getRange(top + i, note).setValue(items[i].note);
  }
  // チェックは大きく。スマホの指でも押しやすいように
  sh.getRange(top, chk, items.length, 1).insertCheckboxes()
    .setFontSize(PANEL_CHK_SIZE)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.getRange(top, label, items.length, 1).setFontWeight("bold").setFontSize(12);
  sh.getRange(top, note,  items.length, 1).setFontSize(9).setFontColor("#5f6368");
  sh.getRange(top, label, items.length, 2).setVerticalAlignment("middle").setWrap(true);
  try { sh.setRowHeights(top, items.length, PANEL_CHK_H); } catch (e) {}

  const rr = top + items.length + 2;
  sh.getRange(rr - 1, label).setValue("結果").setFontWeight("bold");
  sh.getRange(rr, label).setValue("（まだ何も動かしていません）")
    .setFontSize(10).setVerticalAlignment("top").setWrap(true);
  try { sh.setRowHeight(rr, 120); } catch (e) {}

  PropertiesService.getScriptProperties().setProperty("PANEL_ROW", String(head));

  // [7]（レポート送信）の上に、期間と送り先の入力らんを置く
  panelEnsureInputs_(sh);

  const locked = panelProtect_(sh);
  panelInstall_();
  PropertiesService.getScriptProperties().setProperty("PANEL_SETUP_VER", UPD_VERSION);

  updTell_("🧰 ボタンを置きました（" + PANEL_TAB + "タブ " + head + "行目から）",
    "スマホのスプレッドシートアプリからは、ここのチェックで動かせます。\n" +
    "（アプリではメニューが出ないため）\n\n" +
    "チェックを入れると動き、終わると自動でチェックが外れて、下に結果が出ます。\n" +
    "行は新しく差し込んだので、もともと入っていたものは何も消していません。\n" +
    "見やすいように動かしたり、セルを結合したり、列を変えたりしても大丈夫です。\n\n" +
    (locked
      ? "🔒 チェックのらんは、あなただけが触れるように保護しました。"
      : "⚠️ 保護をかけられませんでした。\n" +
        "　　このままだと、編集できる人なら誰でもチェックを押せます。"));
}

/**
 * すでに置いてあるボタンが、いまの一覧より少なければ足す。
 * すでにあるぶんの見た目（結合・書式・文言）は触らない。
 * 戻り値は足した個数。
 */
function panelSync_(sh, headRow) {
  const items = panelItems_();
  const top = headRow + 1;

  const chk   = panelChkCol_(sh, top);
  const label = chk + 1;
  const note  = chk + 2;

  const st = panelCheck_(sh);
  const miss = st.missing;
  const last = panelLastRow_(sh);
  if (!last || !miss.length) return 0;

  const add = miss.length;
  // 最後のボタンのすぐ下に足す。こうすると、上の行の書式を引き継いでくれる
  sh.insertRowsAfter(last, add);

  for (let i = 0; i < miss.length; i++) {
    sh.getRange(last + 1 + i, label).setValue(miss[i].label);
    sh.getRange(last + 1 + i, note).setValue(miss[i].note);
  }
  sh.getRange(last + 1, chk, add, 1).insertCheckboxes()
    .setFontSize(PANEL_CHK_SIZE)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  try { sh.setRowHeights(last + 1, add, PANEL_CHK_H); } catch (e) {}
  return add;
}

/**
 * チェックのらん（ボタンが並んでいるぶんだけ）。
 *
 * 個数で数えない。あいだに空行や入力らん（期間・送り先）を挟むと、
 * 個数で数えた範囲からいちばん下のボタンがはみ出して、
 * そこだけ誰でも押せる状態になってしまう。
 * 実際に置いてある「いちばん下のボタン」までを守る。
 */
function panelCheckRange_(sh) {
  const top = panelTop_(sh);
  if (!top) return null;
  const last = panelLastRow_(sh);
  const n = Math.max((last ? last - top + 1 : panelItems_().length), 1);
  return sh.getRange(top, panelChkCol_(sh, top), n, 1);
}

/**
 * チェックのらんだけを、自分だけが触れるようにする。
 *
 * ここのチェックは、コードの更新や巻き戻しを走らせるスイッチなので、
 * 編集できる人なら誰でも押せる状態にしておきたくない。
 * 「説明」タブ全体ではなく、チェックのらんだけを守る
 * （他の行は今までどおり、みんなが読み書きできる）。
 * スクリプト自身は所有者として動くので、保護があっても書き込める。
 */
function panelProtect_(sh) {
  try {
    const rg = panelCheckRange_(sh);
    if (!rg) return false;
    const a1 = rg.getA1Notation();
    const DESC = "そうさボタン（作った人だけが押せます）";
    // 前にかけた保護が残っていたら、いったん外す。
    // 行が増えて範囲が変わっていることがあるので、場所だけでなく説明文でも見る
    sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
      try {
        if (!p.canEdit()) return;
        if (p.getRange().getA1Notation() === a1 || p.getDescription() === DESC) p.remove();
      } catch (e) {}
    });
    const p = rg.protect().setDescription(DESC);
    const others = p.getEditors();
    if (others && others.length) p.removeEditors(others);
    if (p.canDomainEdit()) p.setDomainEdit(false);
    return true;
  } catch (e) {
    logErr_("panelProtect", e);
    return false;
  }
}

/** いま保護がかかっているかを見る */
function panelIsProtected_(sh) {
  try {
    const rg = panelCheckRange_(sh);
    if (!rg) return false;
    const a1 = rg.getA1Notation();
    const ps = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].getRange().getA1Notation() === a1) return true;
    }
    return false;
  } catch (e) { return false; }
}

/*
 * ★見張りが止まったときに、スマホだけで直せるようにする。
 *
 *   いままで、見張り（1分おき）を入れ直す道は
 *   「panelWatch の中」と「メニュー」しか無かった。
 *   見張りが止まったら入れ直す人がいないうえ、
 *   スマホのスプシのアプリにはメニューが出ないので、
 *   外出先では手も足も出ない状態になっていた。
 *
 *   ・見張りが動くたびに足あとを残す（panelBeatWatch_）
 *   ・足あとが古い、または見張りが消えていたら、入れ直す（panelRepair_）
 *   ・LINEに「なおして」と打てば、そこからでも入れ直せる（001-Code）
 *     LINEのウェブフックは時計の見張りではないので、
 *     見張りが全部止まっていても動く。これが最後の逃げ道になる。
 */

/** 見張りが動いた足あとを残す */
function panelBeatWatch_() {
  try { PropertiesService.getScriptProperties().setProperty("PANEL_WATCH_AT", String(Date.now())); }
  catch (e) {}
}

/** 見張りが最後に動いてからの秒数。一度も動いていなければ -1 */
function panelWatchQuiet_() {
  try {
    const v = PropertiesService.getScriptProperties().getProperty("PANEL_WATCH_AT");
    if (!v) return -1;
    return Math.round((Date.now() - Number(v)) / 1000);
  } catch (e) { return -1; }
}

/** 見張りのしくみが、ちゃんと入っているか */
function panelTriggersOk_() {
  try {
    let edit = false, watch = false;
    ScriptApp.getProjectTriggers().forEach(function (t) {
      const f = t.getHandlerFunction();
      if (f === "panelOnEdit") edit = true;
      if (f === "panelWatch")  watch = true;
    });
    return edit && watch;
  } catch (e) { return false; }
}

/**
 * 見張りを入れ直して、いまの様子を文にして返す。
 * メニューからも、LINEの「なおして」からも、ここを呼ぶ。
 */
function panelRepair_() {
  const L = [];
  const quiet = panelWatchQuiet_();
  L.push(quiet < 0 ? "見張り：一度も動いた記録がありません"
                   : "見張り：最後に動いたのは " + updSecText_(quiet) + "前");
  const had = panelTriggersOk_();
  L.push(had ? "しくみ：ありました" : "しくみ：ありませんでした");
  try {
    panelInstall_();
    L.push("✅ 見張りを立て直した。死神が1分おきに張り付きます。計★画★通★り");

    // ついでに、止まっていると困るしかけも全部そろえる。
    // 「なおして」は “ぜんぶ直す” 合図なので、ここで一度に見る
    if (typeof ensureAutoFormatTrigger_ === "function") {
      L.push(ensureAutoFormatTrigger_(false)
        ? "✅ 毎日17時の自動チェックを入れました"
        : "✅ 毎日17時の自動チェック：入っています");
    }
    if (typeof ensureAutoReportTrigger_ === "function") {
      L.push(ensureAutoReportTrigger_(false)
        ? "✅ 毎月のレポート自動送信を入れました"
        : "✅ 毎月のレポート自動送信：入っています");
    }
  } catch (e) {
    L.push("❌ うわあああ!!!! 立て直せない!!!!：" + (e && e.message ? e.message : e));
    L.push("　→ ブラウザでスプシを開き、メニューから1回動かして承認を通してください");
    return L.join("\n");
  }
  if (quiet > 600 || !had) {
    L.push("");
    L.push("※ 長く止まっていました。Googleの1日ぶんの持ち時間を使い切ると");
    L.push("　見張りは止まります。日付が変われば、また動きます。");
  }
  L.push("");
  L.push("チェックを一度はずして、入れ直してみてください。");
  return L.join("\n");
}

/** メニューから、見張りを入れ直す */
function menuPanelRepair() {
  const text = panelRepair_();
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🔧 ボタンの見張りを入れ直す", text, ui.ButtonSet.OK);
  } catch (e) {}
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PANEL_TAB);
    if (sh) panelSay_(sh, "🔧 " + text);
  } catch (e) {}
  return text;
}

/** チェックを見張るしくみを入れる（すでにあれば入れ直す） */
function panelInstall_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const f = t.getHandlerFunction();
    if (f === "panelOnEdit" || f === "panelWatch") ScriptApp.deleteTrigger(t);
  });
  // ① チェックした瞬間に動く
  ScriptApp.newTrigger("panelOnEdit").forSpreadsheet(ss).onEdit().create();
  // ② ①が効かない機種向けの保険。1分おきに見にいく
  ScriptApp.newTrigger("panelWatch").timeBased().everyMinutes(1).create();
}

/** 見張りを止める（1分おきの実行が気になるとき用） */
function menuPanelWatchOff() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "panelWatch") { ScriptApp.deleteTrigger(t); n++; }
  });
  updTell_("⏸ 1分おきの見張りを止めました（" + n + "件）",
    "チェックした瞬間に動くほう（onEdit）は残っています。\n" +
    "スマホアプリから効かなくなったら、「🧰 そうさボタンを置く」で入れ直してください。");
}

/** チェックされた瞬間に呼ばれる */
function panelOnEdit(e) {
  try {
    if (!e || !e.range) return;
    if (e.range.getSheet().getName() !== PANEL_TAB) return;
    if (String(e.value).toUpperCase() !== "TRUE") return;
    const sh = e.range.getSheet();
    const top = panelTop_(sh);
    if (!top) return;
    if (e.range.getColumn() !== panelChkCol_(sh, top)) return;
    const row = e.range.getRow();
    const last = panelLastRow_(sh);
    if (!last || row < top || row > last) return;
    panelRun_(row);
  } catch (err) { logErr_("panelOnEdit", err); }
}

/**
 * コードを更新したあと、増えたボタンを自分で足す。
 *
 * 更新中に動いているのは「古いコード」なので、更新のその場では
 * 新しいボタンのことを知らない。次に1分おきの見張りが動いたとき、
 * そこではじめて新しいコードとして動く。そのときに足す。
 * スマホからはメニューを開けないので、ここが自動でやらないと、
 * 新しいボタンを永久に使えないままになってしまう。
 */
function panelAutoSync_(sh) {
  const pr = PropertiesService.getScriptProperties();
  if (pr.getProperty("PANEL_SETUP_VER") === UPD_VERSION) return;
  try {
    const head = panelHeadRow_(sh);
    if (!head) { pr.setProperty("PANEL_SETUP_VER", UPD_VERSION); return; }
    const added = panelSync_(sh, head);
    const made  = panelEnsureInputs_(sh);
    if (added || made) {
      panelProtect_(sh);
      panelSay_(sh, "🧰 新しいボタンを足しました（" +
        panelItems_().slice(-Math.max(added, 1)).map(function (x) { return x.label; }).join("、") +
        "）\n押す前に、すぐ上の「期間」と「送り先」を確かめてください。");
    }
    pr.setProperty("PANEL_SETUP_VER", UPD_VERSION);
  } catch (e) {
    logErr_("panelAutoSync", e);
    pr.setProperty("PANEL_SETUP_VER", UPD_VERSION);   // 毎分やり直さない
  }
}

/** 1分おきの見張り。onEdit が効かない機種のための保険 */
function panelWatch() {
  try {
    panelBeatWatch_();                 // 「見張りは生きている」の足あと

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PANEL_TAB);
    if (!sh) return;

    // 動きっぱなしになっていないか、先に見る
    if (panelCheckStuck_(sh)) return;

    // ★まずチェックのらんだけを読む。
    //   1分おきに走るので、ここが重いと1日ぶんの持ち時間を食いつぶす。
    //   押されているものが無ければ、ここで帰る（読むのは1列だけ）
    const hit = panelPendingRow_(sh);
    if (hit) { panelRun_(hit); return; }             // 1回に1つだけ

    // コードが新しくなっていたら、増えたボタンをここで足す。
    // 押されているものが無いときだけ。行を差し込むと下のボタンが動くので、
    // 押した行と実際に動く行がずれてしまう
    panelAutoSync_(sh);
  } catch (err) { logErr_("panelWatch", err); }
}

/**
 * その行のボタンを実行する。
 * onEdit と見張りの両方から呼ばれるので、二重に動かないよう鍵をかける。
 */
function panelRun_(row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(PANEL_TAB);
  if (!sh) return;

  const top = panelTop_(sh);
  if (!top || row < top) return;

  const chk = panelChkCol_(sh, top);
  // ボタンの無い行（間の空行など）なら、何もしない
  const cur = sh.getRange(row, chk).getValue();
  if (cur !== true && cur !== false) return;

  // その行に書いてある文言から、どのボタンかを決める
  const text = sh.getRange(row, chk + 1).getValue();
  const item = panelItemOf_(text);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;      // だれかが動かしている最中

  try {
    // 先にチェックを外す。ここで外しておかないと、
    // 見張りが同じものをもう一度動かしてしまう
    sh.getRange(row, chk).setValue(false);

    // 前の結果が残っていると、今のものか前のものか分からなくなる。まず空にする
    panelClear_(sh);

    if (!item) {
      panelSay_(sh, "⚠️ この行が何をするボタンか分かりません：「" +
        String(text).slice(0, 30) + "」\n" +
        "文言を、下のどれかに書き換えてください：\n" +
        panelItems_().map(function (x) { return "　" + x.label; }).join("\n"));
      return;
    }

    if (!panelHas_(item.fn)) {
      panelSay_(sh, "⚠️ " + item.label + " はまだ使えません（" +
        (PANEL_FROM[item.fn] || "対応するファイル") + " を入れてください）");
      return;
    }

    panelMarkStart_(row, item);
    const t0 = new Date().getTime();
    panelSay_(sh, "⏳ " + item.label + " を実行中…（推定 " +
      updSecText_(item.sec || 60) + "）");

    let out = "";
    try {
      const fn = eval(item.fn);
      const said = fn();
      const took = Math.round((new Date().getTime() - t0) / 1000);
      out = "✅ " + item.label + " が終わりました（" + updSecText_(took) + "）" +
        (typeof said === "string" && said ? "\n" + said : "");
    } catch (err) {
      logErr_("panel:" + item.fn, err);
      out = "❌ " + item.label + " に失敗しました\n" + (err && err.message ? err.message : err);
    }
    panelMarkEnd_();
    panelSay_(sh, out);
  } finally {
    panelMarkEnd_();
    try { lock.releaseLock(); } catch (e) {}
  }
}

/** 全角を2、半角を1として数える（行の高さを見積もるため） */
function updWidth_(str) {
  const t = String(str);
  let w = 0;
  for (let i = 0; i < t.length; i++) {
    w += t.charCodeAt(i) < 0x100 ? 1 : 2;
  }
  return w;
}

/**
 * 結果らんの行の高さを、文字の量に合わせる。
 * 長い文が下に隠れてしまうと、読めないので意味がない。
 */
function panelFitRow_(sh, row, col, text) {
  try {
    let r = row, c1 = col, c2 = col;
    const rg = sh.getRange(row, col);
    if (rg.isPartOfMerge()) {
      const m = rg.getMergedRanges()[0];
      r = m.getRow(); c1 = m.getColumn(); c2 = c1 + m.getNumColumns() - 1;
    }
    let w = 0;
    for (let c = c1; c <= c2; c++) { try { w += sh.getColumnWidth(c); } catch (e) {} }
    if (w <= 0) w = 400;

    const per = Math.max(12, Math.floor(w / 7));   // 1行に入るおおよその文字ぶん
    let lines = 0;
    String(text).split("\n").forEach(function (ln) {
      lines += Math.max(1, Math.ceil(updWidth_(ln) / per));
    });
    sh.setRowHeight(r, Math.min(600, Math.max(PANEL_RESULT_H, lines * 19 + 12)));
  } catch (e) {}
}

/** 結果らんを空にして、行の高さもふだんに戻す */
function panelClear_(sh) {
  if (!sh) return;
  try {
    const cell = panelResultCell_(sh);
    if (!cell) return;
    let rg = sh.getRange(cell.row, cell.col);
    let r = cell.row;
    try {
      if (rg.isPartOfMerge()) {
        const m = rg.getMergedRanges();
        if (m && m.length) { rg = m[0].getCell(1, 1); r = m[0].getRow(); }
      }
    } catch (e) {}
    rg.setValue("");
    try { sh.setRowHeight(r, PANEL_RESULT_H); } catch (e) {}
    SpreadsheetApp.flush();
  } catch (e) {}
}

/**
 * いま動いているものを覚えておく／消す。
 * 1分おきの見張りが「動きっぱなしになっていないか」を見るために使う。
 */
function panelMarkStart_(row, item) {
  try {
    PropertiesService.getScriptProperties().setProperty("PANEL_RUNNING",
      JSON.stringify({ row: row, label: item.label, sec: item.sec || 60,
                       stall: item.stall || PANEL_STALL_SEC,
                       at: new Date().getTime() }));
  } catch (e) {}
}
function panelMarkEnd_() {
  try { PropertiesService.getScriptProperties().deleteProperty("PANEL_RUNNING"); }
  catch (e) {}
}
function panelMarkGet_() {
  try {
    const v = PropertiesService.getScriptProperties().getProperty("PANEL_RUNNING");
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

/**
 * 「まだ生きています」と伝えるだけ。画面には出さない。
 * 見張りは、これが途切れた時間で「止まった」かどうかを見分ける。
 */
function updBeat_(what) {
  try {
    const m = panelMarkGet_();
    if (!m) return;
    m.at = new Date().getTime();
    if (what) m.step = String(what).slice(0, 60);
    PropertiesService.getScriptProperties()
      .setProperty("PANEL_RUNNING", JSON.stringify(m));
  } catch (e) {}
}

/**
 * 途中経過を出す。長くかかるものは、いま何をしているかが見えたほうがよい。
 * パネルから動かしているときだけ書く。あわせて「生きています」も伝える。
 */
function updProgress_(text, restSec) {
  try {
    if (!panelMarkGet_()) return;
    updBeat_(text);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PANEL_TAB);
    if (!sh) return;
    panelSay_(sh, "⏳ " + text +
      (restSec ? "（のこり " + updSecText_(restSec) + "）" : ""));
  } catch (e) {}
}

/**
 * 動きっぱなしになっていないか見る。
 *
 * 途中で止まると（承認が済んでいない／通信が切れた など）、
 * 「実行中…」のまま何も起きなくなる。それがいちばん困るので、
 * 見込みの3倍たっても終わっていなければ、止まったものとみなして知らせる。
 * 戻り値 true なら、今回はここまで（新しいものは動かさない）。
 */
function panelCheckStuck_(sh) {
  const m = panelMarkGet_();
  if (!m) return false;

  // 「始めてから」ではなく「最後に動きがあってから」で見る。
  // 時間のかかるものを、動いている最中に止まったと言ってしまわないように。
  // 待ってよい長さは、ボタンによって違う（レポートは集計に何分もかかる）
  const quiet = Math.round((new Date().getTime() - (m.at || 0)) / 1000);
  if (quiet < (m.stall || PANEL_STALL_SEC)) return true;   // まだ息をしている。邪魔しない

  panelMarkEnd_();
  panelSay_(sh,
    "❌ " + (m.label || "さっきのもの") + " が終わりませんでした（" +
    (m.step ? "「" + m.step + "」のところで " : "") +
    updSecText_(quiet) + "、動きがありません）\n" +
    "考えられること：\n" +
    "　・承認がまだ済んでいない\n" +
    "　　→ パソコンかブラウザでスプシを開き、メニューから同じものを1回動かして、\n" +
    "　　　承認画面を通してください（スマホのアプリからは承認できません）\n" +
    "　・通信が途中で切れた → もう一度チェックしてみてください\n" +
    "　・時間がかかりすぎた → タブの行数が多いと、整形は数分かかることがあります");
  return true;
}

/**
 * 結果らんに書く。
 * セルが結合されていることがあるので、そのまとまりの左上に書く。
 * （結合の左上以外に書こうとすると、そこで止まってしまうため）
 */
function panelSay_(sh, text) {
  if (!sh) return;
  try {
    const cell = panelResultCell_(sh);
    if (!cell) return;
    let rg = sh.getRange(cell.row, cell.col);
    try {
      if (rg.isPartOfMerge()) {
        const m = rg.getMergedRanges();
        if (m && m.length) rg = m[0].getCell(1, 1);
      }
    } catch (e) {}
    const now = new Date();
    const body = pad2_(now.getHours()) + ":" + pad2_(now.getMinutes()) + "  " + text;
    rg.setValue(body);
    panelFitRow_(sh, cell.row, cell.col, body);
    SpreadsheetApp.flush();
  } catch (e) {}
}
