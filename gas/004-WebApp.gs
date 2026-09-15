/**
 * ================================================================
 *  みんなの記録ページ（004-WebApp.gs）
 *
 *  ★★★  W007ver  （2026/09/06）  ★★★
 *
 *  ファイル記号: C=001-Code.gs / E=002-Extras.gs / L=003-LineReport.gs / W=004-WebApp.gs
 *  直したら数字を1つ増やし、下の履歴に何を直したか書く。
 *
 *  [W007ver] 乗り場をタップすると Googleマップ が開くようにした
 *   ・記録カードの乗り場名と、乗り場ランキングの名前がリンクになる
 *   ・行き先の表は 002-Extras.gs（MapLink）のもの。入っていなければただの文字のまま
 *   ・1件ずつURLを持たせるとページが重くなるので、出てくる乗り場の種類ぶんだけ渡す
 *  [W006ver] LINEへの送信を「まず自分だけ」→「グループ」の2段階にした
 *   ・メニューからは、送る前に必ず聞く（自分だけ／グループ／やめる）
 *   ・そうさタブからは、1回目は自分だけ。3分以内にもう1回でグループへ
 *   ・グループに送るのは取り消せないので、一発で飛ばないようにする
 *  [W005ver] ダイアログが出ない環境でも使えるようにした
 *   ・URLと診断結果を「説明」タブの Z3・Z4 に書き出す（あとから何度でも見られる）
 *   ・トーストでも出す（ダイアログより出やすい）
 *   ・メニューから直接 LINE に送れるようにした（写し間違えようがない）
 *  [W004ver] URLの画面で「本当に開けるか」を実際に叩いて確かめるようにした
 *   ・公開中のURLをログインなしで取りにいき、うちのページが返るか見る
 *   ・返らないときは、理由（doGetが無い／ログインを求められる／デプロイが無い）と直し方を出す
 *  [W003ver] URLの出し方を直した
 *   ・リンクとして押せる／コピーボタンつきの画面にした（前は文字だけで触れなかった）
 *   ・「このURLをグループLINEに送る」ボタンを付けた。トーク上ではリンクになる
 *  [W002ver] 鍵をかけられるようにした（設定タブの「ページを見られるメール」「ページの合言葉」）
 *   ・合言葉は一度入れれば、その端末では次から聞かない
 *   ・鍵がかかっているあいだは、記録を1件もページに渡さない
 *  [W001ver] みんなの記録ページ（ウェブアプリ）の最初の版
 *   ・📊 立ち回り … 時間帯別／曜日区分別の平均、乗り場ランキング、ロングマップ
 *   ・📋 記録     … 日別のカード表示（オプチャも色分けして混ぜる）
 *   ・🏆 ランキング … 期間の個人別 売上・件数・平均・ロング率・出勤日数
 *
 *  ※このファイルは tools/build_webapp.py が作ります。直すのは
 *    gas/parts/WebApp.gs と gas/parts/webapp.html のほうです。
 * ================================================================
 */

const WB_VERSION = "W007ver";

/** 何日ぶんを持っていくか。古い記録まで全部見たいときは URL に ?all=1 を付ける */
const WB_DAYS = 190;

/** ブラウザからページを開いたとき */
function doGet(e) {
  const all = !!(e && e.parameter && e.parameter.all);
  const gate = wbGate_();

  let data;
  if (gate.mode !== "ok") {
    // 見せてよい相手か決まるまで、記録は1件も渡さない
    data = { ok: false, gate: gate.mode, error: gate.msg, who: gate.who || "" };
  } else {
    try {
      data = wbCollect_(all);
    } catch (err) {
      data = { ok: false, error: (err && err.message) || String(err) };
      try { logErr_("webapp", err); } catch (e2) {}
    }
  }

  // < を逃がしておく。乗り場名などに </script> が混ざってもページが壊れないように
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // 差し込みは関数で返す。文字列で渡すと $& などが特別扱いされて中身が化ける
  const html = WB_HTML.replace("/*__DATA__*/null", function () { return json; });

  return HtmlService.createHtmlOutput(html)
    .setTitle("僕はグールだ｜みんなの記録")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 合言葉を入れてもらったときに、ページから呼ばれる。
 * 合っていれば記録を返す。合っていなければ何も返さない。
 */
function wbFetch(code, all) {
  const pass = String(wbCfg_("ページの合言葉", "")).trim();
  if (!pass) return JSON.stringify({ ok: false, error: "合言葉は設定されていません" });
  if (String(code || "").trim() !== pass) {
    return JSON.stringify({ ok: false, gate: "pass", error: "合言葉がちがいます" });
  }
  try {
    return JSON.stringify(wbCollect_(!!all));
  } catch (err) {
    try { logErr_("webapp", err); } catch (e2) {}
    return JSON.stringify({ ok: false, error: (err && err.message) || String(err) });
  }
}

/** 「設定」タブの値。001-Code.gs が無いときのために既定値も受け取る */
function wbCfg_(key, def) {
  try {
    if (typeof cfg_ === "function") {
      const v = cfg_(key);
      return (v === undefined || v === null) ? def : v;
    }
  } catch (e) {}
  return def;
}

/**
 * 見せてよい相手かを決める。
 *   ok    … 見せる
 *   pass  … 合言葉を聞く
 *   deny  … このメールは許していない
 *   setup … メールで制限したいのに、デプロイの設定がそれに向いていない
 *
 * メールでの制限は、デプロイの「実行するユーザー」を
 * 「ウェブアプリにアクセスしているユーザー」にしていないと、
 * 相手のメールが取れないので効かない。そのときは合言葉に切り替える。
 */
function wbGate_() {
  const emails = String(wbCfg_("ページを見られるメール", "")).trim();
  const pass   = String(wbCfg_("ページの合言葉", "")).trim();
  if (!emails && !pass) return { mode: "ok" };            // 鍵なし

  if (emails) {
    const allow = emails.split(/[,、\s]+/)
      .map(function (x) { return x.trim().toLowerCase(); })
      .filter(String);
    let who = "";
    try { who = String(Session.getActiveUser().getEmail() || "").toLowerCase(); } catch (e) {}

    if (who) {
      if (allow.indexOf(who) !== -1) return { mode: "ok" };
      return { mode: "deny", who: who,
               msg: "このアカウントでは開けません。管理者に連絡してください。" };
    }
    // メールが取れなかった
    if (!pass) {
      return { mode: "setup",
               msg: "メールでの制限を効かせるには、デプロイの設定を直す必要があります。" };
    }
  }

  if (pass) return { mode: "pass", msg: "合言葉を入れてください" };
  return { mode: "ok" };
}

/** 公開されているページのURL。まだなら空 */
function wbUrl_() {
  try { return ScriptApp.getService().getUrl() || ""; } catch (e) { return ""; }
}

/** いまの鍵の状態を、ひとことで */
function wbLockText_() {
  const g = wbGate_();
  if (g.mode === "pass")  return "🔒 合言葉あり";
  if (g.mode === "setup") return "⚠️ メール制限を入れていますが、デプロイ設定が合っていません";
  if (g.mode === "deny" || g.mode === "ok") {
    const em = String(wbCfg_("ページを見られるメール", "")).trim();
    const pw = String(wbCfg_("ページの合言葉", "")).trim();
    if (em) return "🔒 メールで制限中";
    if (pw) return "🔒 合言葉あり";
  }
  return "🔓 鍵なし（URLを知っている人は誰でも見られます）";
}

/**
 * ページのURLを出す。
 * 前は ui.alert に文字で出していたが、それだとコピーもタップもできなかった。
 * リンクとコピーボタンを置いた画面にする。
 */
function menuWebAppUrl() {
  const ui = SpreadsheetApp.getUi();
  const url = wbUrl_();

  if (!url) {
    ui.alert("📱 みんなの記録ページ",
      "まだ公開されていません。\n\n" +
      "Apps Script の画面で\n" +
      "　右上「デプロイ」→「新しいデプロイ」\n" +
      "　種類：ウェブアプリ\n" +
      "　次のユーザーとして実行：自分\n" +
      "　アクセスできるユーザー：全員\n" +
      "で公開すると、ここにURLが出ます。", ui.ButtonSet.OK);
    return;
  }

  const lock = wbLockText_();
  wbWriteInfo_(url, "");     // ダイアログが出なくても、URLは説明タブに残る
  const html =
    '<style>' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;' +
      'font-size:13px;padding:14px;margin:0;color:#202124}' +
    'a.u{display:block;word-break:break-all;background:#e8f0fe;border:1px solid #c6dafc;' +
      'border-radius:10px;padding:12px;color:#1155cc;text-decoration:none;font-size:12px;' +
      'line-height:1.6}' +
    'button{width:100%;margin-top:9px;border:0;border-radius:10px;padding:12px;' +
      'font-size:14px;font-weight:700;color:#fff;background:#1a73e8}' +
    'button.g{background:#06c755}button.w{background:#5f6368}' +
    '.lock{background:#f1f3f4;border-radius:9px;padding:9px 11px;margin:11px 0;font-size:12px}' +
    '.ok{color:#188038;font-weight:700;min-height:18px;margin-top:8px;text-align:center}' +
    '.note{color:#5f6368;font-size:11px;margin-top:11px;line-height:1.7}' +
    '</style>' +
    '<a class="u" href="' + wbEsc_(url) + '" target="_blank" rel="noopener">' +
      wbEsc_(url) + '</a>' +
    '<button onclick="cp()">📋 URLをコピー</button>' +
    '<button class="g" onclick="toLine()">💬 このURLをグループLINEに送る</button>' +
    '<div class="ok" id="ok"></div>' +
    '<div class="lock">' + wbEsc_(lock) + '</div>' +
    '<div class="note">・上のURLをタップすると、別のタブで開きます。<br>' +
      '・古い記録まで全部見たいときは、うしろに <b>?all=1</b> を付けます。<br>' +
      '・エラーが出るときは、Apps Script で「デプロイ」→「デプロイを管理」→ 鉛筆 →' +
      ' バージョン「新バージョン」→ デプロイ、をしてください。' +
      'ファイルを足したあとは、これをしないと反映されません。</div>' +
    '<script>' +
    'var U=' + JSON.stringify(url) + ';' +
    'function say(t){document.getElementById("ok").textContent=t;}' +
    'function cp(){' +
      'if(navigator.clipboard&&navigator.clipboard.writeText){' +
        'navigator.clipboard.writeText(U).then(function(){say("コピーしました");},' +
        'function(){fb();});}else{fb();}}' +
    'function fb(){var t=document.createElement("textarea");t.value=U;document.body.appendChild(t);' +
      't.select();try{document.execCommand("copy");say("コピーしました");}' +
      'catch(e){say("コピーできませんでした。URLを長押しして選んでください");}' +
      'document.body.removeChild(t);}' +
    'function toLine(){say("送信中…");' +
      'google.script.run.withSuccessHandler(function(m){say(m);})' +
      '.withFailureHandler(function(e){say("送れませんでした："+(e&&e.message?e.message:e));})' +
      '.wbSendUrlToLine();}' +
    '</script>';

  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(400).setHeight(430),
    "📱 みんなの記録ページ");
}

function wbEsc_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 公開されているURLを、実際に開いてみて確かめる。
 * 推測で原因を当てにいくより、1回叩いたほうが早い。
 *
 * ここからの取得はログインしていない状態なので、
 * 「アクセスできるユーザー：全員」でなければ、みんなと同じように弾かれる。
 * つまり、メンバーが見る状態をそのまま再現できる。
 */
function wbSelfTest_() {
  const url = wbUrl_();
  if (!url) {
    return { ok: false, url: "",
      title: "まだ公開されていません",
      how: "「デプロイ」→「新しいデプロイ」→ 種類：ウェブアプリ で公開してください。" };
  }

  let code = 0, body = "";
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    code = res.getResponseCode();
    body = String(res.getContentText() || "").slice(0, 4000);
  } catch (e) {
    return { ok: false, url: url,
      title: "URLを開けませんでした",
      how: (e && e.message) || String(e) };
  }

  if (body.indexOf("wbapp-ok") !== -1) {
    return { ok: true, url: url,
      title: "ページはちゃんと開けます（" + WB_VERSION + "）",
      how: "スマホで開けないなら、ブラウザに残っている古い中身が原因かもしれません。" +
           "画面を引き下げて読み込み直すか、別のブラウザで試してください。" };
  }

  // 目印が無い ＝ うちのページが返っていない。中身から理由を見分ける
  let title = "うちのページが返ってきていません（" + code + "）";
  let how = "";

  if (body.indexOf("doGet") !== -1 ||
      body.indexOf("スクリプト関数が見つかりません") !== -1 ||
      body.indexOf("Script function not found") !== -1) {
    how = "公開されているバージョンに doGet がありません。\n" +
          "004-WebApp を貼る前にデプロイした状態です。\n" +
          "→「デプロイ」→「デプロイを管理」→ 鉛筆 → バージョン「新バージョン」→ デプロイ";
  } else if (code === 401 || code === 403 ||
             body.indexOf("accounts.google.com") !== -1 ||
             body.indexOf("ServiceLogin") !== -1) {
    title = "ログインを求められています（" + code + "）";
    how = "「アクセスできるユーザー」が「全員」になっていません。\n" +
          "→「デプロイを管理」→ 鉛筆 → アクセスできるユーザー：全員 → デプロイ";
  } else if (code === 404 ||
             body.indexOf("ファイルを開くことができません") !== -1 ||
             body.indexOf("Sorry, unable to open the file") !== -1) {
    how = "そのURLのデプロイが見つかりません。消したか、URLが古いかです。\n" +
          "→「デプロイ」→「新しいデプロイ」で作り直し、出てきた新しいURLを使ってください。\n" +
          "　この画面の上に出ているURLが、いま正しいURLです。";
  } else {
    how = "原因を絞りきれませんでした。\n" +
          "→ まず「デプロイを管理」→ 鉛筆 → バージョン「新バージョン」→ デプロイ を試してください。";
  }
  return { ok: false, url: url, title: title, how: how, peek: body.slice(0, 200) };
}

/** 画面から呼ぶ用 */
function wbSelfTest() { return JSON.stringify(wbSelfTest_()); }


/* ============ ダイアログに頼らない出し方 ============ */
/*
 * スマホだと、メニューから出すダイアログが表示されないことがある。
 * そこで「ダイアログを使わない道」を用意する。
 *   ・LINEに送る     … トーク上でリンクになる。文字を写し間違える余地がない
 *   ・セルに書き出す … 説明タブのZ3・Z4に残る。あとから何度でも見られる
 *   ・トーストで出す … ダイアログより出やすい
 */

/** 説明タブのZ3にURL、Z4に診断結果を書いておく（あとから見られるように） */
function wbWriteInfo_(url, diag) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    if (!sh) return;
    sh.getRange("Y3").setValue("ページURL");
    sh.getRange("Z3").setValue(url || "（まだ公開されていません）");
    if (diag) {
      sh.getRange("Y4").setValue("最後の診断");
      sh.getRange("Z4").setValue(diag);
    }
  } catch (e) { /* 書けなくても本題は止めない */ }
}

/** ダイアログを出そうとする。出せない環境では黙って諦める */
function wbAlert_(title, body) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, body, ui.ButtonSet.OK);
  } catch (e) {}
}

/**
 * ページが開けるか調べて、結果をトーストと説明タブに出す。
 * ダイアログが出ない環境でも、結果がセルに残る。
 */
function menuWebAppCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const r = wbSelfTest_();
  const head = (r.ok ? "✅ " : "❌ ") + r.title;
  const body = (r.url ? r.url + "\n" : "") + (r.how || "");

  wbWriteInfo_(r.url, head + "\n" + (r.how || "") +
    (r.peek ? "\n──────\n返ってきた中身の頭：" + r.peek : ""));

  ss.toast(body.slice(0, 400), head, 30);
  wbAlert_(head, body + "\n\n──────────────\n" +
    "この内容は「説明」タブの Z3・Z4 にも書いてあります。");
}

/**
 * URLをグループLINEに送る。ダイアログを開かずに、その場で送る。
 * LINEのトーク上ではリンクになるので、写し間違えようがない。
 */
/**
 * メニューから送るとき。ここでは画面が出せるので、送る前に必ず聞く。
 */
function menuWebAppSendLine() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const url = wbUrl_();
  wbWriteInfo_(url, "");
  if (!url) {
    wbAlert_("💬 まだ公開されていません",
      "先に「デプロイ」→「新しいデプロイ」でページを公開してください。");
    return;
  }

  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  let where = "test";
  if (ui) {
    const a = ui.alert("💬 ページのURLをLINEに送る",
      "まず自分のLINEにだけ送って、見え方を確かめますか？\n\n" +
      "「はい」… 自分だけに送る（テスト）\n" +
      "「いいえ」… グループ全員に送る（取り消せません）",
      ui.ButtonSet.YES_NO_CANCEL);
    if (a === ui.Button.CANCEL) return;
    where = (a === ui.Button.YES) ? "test" : "group";
  }

  const msg = wbSendUrlToLine(where);
  ss.toast(url, "💬 " + msg, 20);
  wbAlert_("💬 " + msg,
    url + "\n\n──────────────\nこのURLは「説明」タブの Z3 にも書いてあります。");
}

/**
 * 「そうさ」タブのチェックから送るとき。
 * 画面が出せないので、2回押してもらうことで確認の代わりにする。
 *   1回目 … 自分だけに送る（テスト）
 *   3分以内にもう1回 … グループへ送る
 */
function menuWebAppSendLineStep() {
  const pr = PropertiesService.getScriptProperties();
  const now = new Date().getTime();
  const at = parseInt(pr.getProperty("WB_SEND_ARMED"), 10);
  const armed = at > 0 && (now - at) < 3 * 60 * 1000;

  if (armed) {
    pr.deleteProperty("WB_SEND_ARMED");
    return "👥 " + wbSendUrlToLine("group");
  }

  const msg = wbSendUrlToLine("test");
  pr.setProperty("WB_SEND_ARMED", String(now));
  return "🧪 " + msg +
    "\n▶ グループ全員に送るなら、3分以内にもう一度チェックしてください。\n" +
    "　 何もしなければ、グループには送りません。";
}

/* ---------- LINEへの送信 ---------- */
/*
 * グループへ送るのは、みんなに届いてしまう＝取り消せない操作。
 * チェックひとつで一発で飛ぶのは危ないので、
 *   1回目 … 自分だけに送る（テスト）
 *   3分以内にもう1回 … グループへ送る
 * という形にしてある。押し間違いでグループに飛ぶことがない。
 */

/** テスト送信の宛先（自分のLINE）。設定タブがあればそちらを優先 */
function wbTestTarget_() {
  const v = String(wbCfg_("テスト送信先（自分のLINE）", "")).trim();
  if (v) return v;
  // 001-Code.gs の登録済み一覧から「ﾏｰｸ」を探す
  try {
    for (const id in SENDER_MAP) {
      if (SENDER_MAP[id] === "ﾏｰｸ") return id;
    }
  } catch (e) {}
  return "";
}

/** グループの宛先（説明タブ Z1） */
function wbGroupTarget_() {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    return sh ? String(sh.getRange("Z1").getValue() || "").trim() : "";
  } catch (e) { return ""; }
}

/** 送る文面 */
function wbUrlMessage_(url) {
  const pass = String(wbCfg_("ページの合言葉", "")).trim();
  return "📱 みんなの記録ページ\n" + url +
    (pass ? "\n\n合言葉は各自に伝えます（このメッセージには書きません）" : "");
}

/** 実際に送る。宛先が無ければ送らない（全員配信に落ちないように） */
function wbPushLine_(to, text) {
  if (!to) return "宛先が分かりませんでした";
  const token = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN") || "";
  if (!token) return "LINEトークンが未設定です（メニュー「🔑 LINEトークンを設定」）";

  const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    payload: JSON.stringify({ to: to, messages: [{ type: "text", text: text }] }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    let why = res.getContentText().slice(0, 120);
    try { why = JSON.parse(res.getContentText()).message; } catch (e) {}
    return "送れませんでした（" + res.getResponseCode() + "）" + why;
  }
  return "";
}

/**
 * ページのURLをLINEに送る。
 * where は "test"（自分だけ）か "group"（グループ全員）。
 */
function wbSendUrlToLine(where) {
  const url = wbUrl_();
  if (!url) return "まだ公開されていません";

  if (where === "group") {
    const to = wbGroupTarget_();
    if (!to) return "グループの送信先が未設定です（メニュー「👥 グループIDを設定」）";
    const err = wbPushLine_(to, wbUrlMessage_(url));
    return err || "グループLINEに送りました";
  }

  const to = wbTestTarget_();
  if (!to) return "テストの送信先（自分のLINE）が分かりませんでした";
  const err = wbPushLine_(to, "【テスト送信】\n" + wbUrlMessage_(url));
  return err || "自分のLINEにだけ送りました（テスト）";
}

/* ============ 記録を集める ============ */

/** 「設定」タブがあればそれを、無ければ既定値を使う */
function wbShortMax_() { return (typeof cfgShortMax_ === "function") ? cfgShortMax_() : 4999; }
function wbLongMin_()  { return (typeof cfgLongMin_  === "function") ? cfgLongMin_()  : 10000; }
function wbBizStart_() { return (typeof cfgBizStart_ === "function") ? cfgBizStart_() : 17; }

/** 平日 / 金曜 / 土曜 / 日祝 */
function wbDayType_(d) {
  const w = d.getDay();
  const hol = (typeof isHoliday_ === "function") ? isHoliday_(d) : false;
  if (w === 0 || hol) return "日祝";
  if (w === 6) return "土曜";
  if (w === 5) return "金曜";
  return "平日";
}

/** 17時起点の枠。00:30 は 24、05:00 は 29 になる */
function wbSlot_(hh) { return hh < wbBizStart_() ? hh + 24 : hh; }

/**
 * 個人タブ＝自社の記録、エリアタブと関空・ﾊﾞﾗｼの「ｵﾌﾟﾁｬ」行＝オプチャ情報。
 * エリアタブには個人タブの写しも入っているので、同じ乗車を二度数えないようにする。
 */
function wbCollect_(all) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const since = all ? null : new Date(Date.now() - WB_DAYS * 86400000);

  const own = [], opu = [];
  const seen = {};
  let minD = null, maxD = null;

  const read = function (name, personal) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;

    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
      const d = r[C_DATE - 1];
      if (!(d instanceof Date)) return;

      const who = String(r[C_SENDER - 1]).trim();
      const isOpu = (typeof toFullKana_ === "function")
        ? toFullKana_(who).replace(/[\s　]/g, "").indexOf("オプチャ") !== -1
        : who.indexOf("ｵﾌﾟﾁｬ") !== -1 || who.indexOf("オプチャ") !== -1;

      // 個人タブは自社ぶんだけ、それ以外のタブはオプチャぶんだけ拾う。
      // こうすると、エリアタブに入っている写しを数えずに済む。
      if (personal ? isOpu : !isOpu) return;

      if (minD === null || d < minD) minD = d;
      if (maxD === null || d > maxD) maxD = d;
      if (since && d < since) return;

      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money) || money <= 0) return;

      const tm = String(r[C_TIME - 1]).match(/(\d{1,2}):(\d{2})/);
      if (!tm) return;

      const place = String(r[C_PLACE - 1]).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      const key = (isOpu ? "O" : "S") + "|" + wbYmd_(d) + "|" + tm[0] + "|" + money + "|" + place;
      if (seen[key]) return;
      seen[key] = true;

      const w = String(r[C_WAIT - 1]).replace(/[^0-9]/g, "");
      const rec = {
        w: isOpu ? "ｵﾌﾟﾁｬ" : who,
        d: wbYmd_(d),
        t: tm[0],
        m: money,
        p: place,
        o: String(r[C_OTHER - 1]).replace(/\n/g, " ").trim().slice(0, 60),
        k: String(r[C_MARK - 1]).trim(),
        wt: w === "" ? null : parseInt(w, 10),
        y: wbDayType_(d),
        s: wbSlot_(parseInt(tm[1], 10))
      };
      (isOpu ? opu : own).push(rec);
    });
  };

  PERSONAL_TABS.forEach(function (n) { read(n, true); });
  AREA_TABS.concat(FLAG_TABS).forEach(function (n) { read(n, false); });

  return {
    ok: true,
    updated: wbNow_(),
    all: !!all,
    days: WB_DAYS,
    shortMax: wbShortMax_(),
    longMin: wbLongMin_(),
    members: PERSONAL_TABS.slice(),
    periods: wbPeriods_(minD, maxD),
    own: own,
    opu: opu,
    map: wbMapUrls_(own, opu)
  };
}

/**
 * 乗り場名 → Googleマップ のURL。
 *
 * 1件ずつURLを持たせると、同じ乗り場を何百回も書くことになってページが重くなる。
 * 出てくる乗り場の種類だけ（せいぜい数十）を表にして渡し、
 * 画面側で名前から引く。
 * 002-Extras.gs（MapLink）が入っていないときは空の表を返す。画面側は
 * 表に無い乗り場をただの文字として出すので、それでも何も壊れない。
 */
function wbMapUrls_(own, opu) {
  const out = {};
  if (typeof mapUrlFor_ !== "function") return out;
  const add = function (list) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i].p;
      if (!p || out[p] !== undefined) continue;
      try { out[p] = mapUrlFor_(p) || ""; } catch (e) { out[p] = ""; }
    }
  };
  add(own); add(opu);
  return out;
}

function wbYmd_(d) {
  return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate());
}

function wbNow_() {
  const n = new Date();
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return (n.getMonth() + 1) + "/" + n.getDate() + "(" + w[n.getDay()] + ") " +
         pad2_(n.getHours()) + ":" + pad2_(n.getMinutes());
}

/**
 * 期間の一覧（16日〜翌15日）。新しいものが先。
 * レポートの期間プルダウンと同じ区切りにそろえてある。
 */
function wbPeriods_(minD, maxD) {
  const out = [];
  const today = maxD && maxD > new Date() ? maxD : new Date();
  const start = function (d) {
    return d.getDate() >= 16 ? new Date(d.getFullYear(), d.getMonth(), 16)
                             : new Date(d.getFullYear(), d.getMonth() - 1, 16);
  };
  const lab = function (a, b) {
    const w = ["日", "月", "火", "水", "木", "金", "土"];
    return (a.getMonth() + 1) + "/" + a.getDate() + "(" + w[a.getDay()] + ")〜" +
           (b.getMonth() + 1) + "/" + b.getDate() + "(" + w[b.getDay()] + ")";
  };

  let s = start(today);
  out.push({ from: wbYmd_(s), to: wbYmd_(today), label: lab(s, today) + "（今期）" });

  const limit = minD ? start(minD) : new Date(today.getFullYear(), today.getMonth() - 11, 16);
  let guard = 0;
  while (s.getTime() > limit.getTime() && guard++ < 60) {
    const ps = new Date(s.getFullYear(), s.getMonth() - 1, 16);
    const pe = new Date(s.getFullYear(), s.getMonth(), 15);
    out.push({ from: wbYmd_(ps), to: wbYmd_(pe), label: lab(ps, pe) });
    s = ps;
  }
  return out;
}


/* ============ ページ本体 ============ */

const WB_HTML = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>僕はグールだ｜みんなの記録</title>
<style>
:root{
  --bg:#0a0e17; --card:#121a28; --card2:#0e1522; --line:#22304a;
  --fg:#e8eef7; --dim:#8ca0be; --dim2:#5f7392;
  --blue:#38bdf8; --orange:#fb923c; --green:#34d399; --purple:#a78bfa; --red:#f87171;
  --gold:#fbbf24;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:var(--bg);color:var(--fg);
  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;
  font-size:14px;line-height:1.5;padding-bottom:76px}
h2{font-size:15px;margin:0 0 10px}
a{color:var(--blue)}

/* --- 上のバー --- */
header{position:sticky;top:0;z-index:20;background:rgba(10,14,23,.94);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:10px 12px}
.hrow{display:flex;align-items:center;gap:8px}
.logo{font-weight:800;font-size:15px;letter-spacing:.02em}
.stamp{margin-left:auto;font-size:11px;color:var(--dim2)}
.reload{background:none;border:1px solid var(--line);color:var(--dim);
  border-radius:8px;padding:4px 9px;font-size:11px}

/* --- 絞り込み --- */
.filters{display:flex;gap:6px;overflow-x:auto;padding:8px 12px 0;scrollbar-width:none}
.filters::-webkit-scrollbar{display:none}
select{background:var(--card);color:var(--fg);border:1px solid var(--line);
  border-radius:9px;padding:7px 9px;font-size:12px;max-width:64vw;flex:none}
.chips{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{flex:none;background:var(--card);border:1px solid var(--line);color:var(--dim);
  border-radius:999px;padding:6px 13px;font-size:12px;white-space:nowrap}
.chip.on{background:#0b3a52;border-color:var(--blue);color:#bae6fd;font-weight:700}

main{padding:4px 12px 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:13px;margin-bottom:11px}
.card.blue{border-color:#1d4ed8aa;box-shadow:0 0 0 1px #1d4ed822}
.card.orange{border-color:#c2570caa;box-shadow:0 0 0 1px #c2570c22}
.chead{display:flex;align-items:baseline;gap:7px;margin-bottom:11px}
.chead b{font-size:14px}
.chead .sub{font-size:11px;color:var(--dim2)}
.badge{margin-left:auto;background:var(--card2);border:1px solid var(--line);
  border-radius:9px;padding:4px 9px;font-size:11px;color:var(--dim);text-align:right}
.badge i{font-style:normal;color:var(--fg);font-weight:700}

/* --- 数字カード --- */
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:11px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;
  padding:10px 8px;text-align:center}
.kpi .l{font-size:10px;color:var(--dim2)}
.kpi .v{font-size:17px;font-weight:800;margin-top:3px}
.kpi .v small{font-size:11px;font-weight:600;color:var(--dim)}

/* --- 縦棒グラフ --- */
.bars{display:flex;align-items:flex-end;gap:3px;height:130px;padding-top:16px}
.bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;
  align-items:center;height:100%;position:relative}
.bar .fill{width:100%;border-radius:5px 5px 2px 2px;min-height:2px;
  background:linear-gradient(180deg,#7dd3fc,#0369a1)}
.bar.top .fill{background:linear-gradient(180deg,#fff,#38bdf8);
  box-shadow:0 0 10px #38bdf877}
.bar.o .fill{background:linear-gradient(180deg,#fdba74,#c2410c)}
.bar.o.top .fill{background:linear-gradient(180deg,#fff,#fb923c);
  box-shadow:0 0 10px #fb923c77}
.bar .n{position:absolute;top:-15px;font-size:9px;color:var(--dim2);white-space:nowrap}
.bar.top .n{color:var(--fg);font-weight:700}
.xaxis{display:flex;gap:3px;margin-top:5px}
.xaxis span{flex:1;text-align:center;font-size:9px;color:var(--dim2)}

/* --- 横棒（ランキング） --- */
.rank{display:flex;flex-direction:column;gap:9px}
.rrow .t{display:flex;align-items:baseline;gap:6px;font-size:12px;margin-bottom:4px}
.rrow .t .nm{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rrow .t .r{margin-left:auto;color:var(--dim);font-size:11px;flex:none}
.rrow .t .r b{color:var(--fg);font-size:13px}
.track{height:7px;background:var(--card2);border-radius:99px;overflow:hidden;display:flex}
.track i{display:block;height:100%}
.seg-s{background:#334966}.seg-m{background:#0284c7}.seg-l{background:var(--gold)}
.legend{display:flex;gap:11px;font-size:10px;color:var(--dim2);margin-top:9px}
.legend i{display:inline-block;width:9px;height:9px;border-radius:3px;
  margin-right:4px;vertical-align:-1px}

/* --- 記録カード --- */
.day{display:flex;align-items:baseline;gap:8px;margin:16px 2px 8px}
.day .d{font-size:15px;font-weight:800}
.day .s{font-size:11px;color:var(--dim2)}
.day .tot{margin-left:auto;font-size:13px;font-weight:800;color:var(--orange)}
.ride{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--green);
  border-radius:11px;padding:10px 12px;margin-bottom:7px}
.ride.opu{border-left-color:var(--purple)}
.ride.warn{border-left-color:var(--red)}
.r1{display:flex;align-items:center;gap:8px}
.r1 .tm{font-variant-numeric:tabular-nums;color:var(--dim);font-size:12px}
.r1 .who{font-size:10px;color:var(--dim2);border:1px solid var(--line);
  border-radius:6px;padding:1px 6px}
.r1 .yen{margin-left:auto;font-size:19px;font-weight:800;color:var(--orange);
  font-variant-numeric:tabular-nums}
.r2{margin-top:6px;font-size:13px;font-weight:600}
.r3{margin-top:3px;font-size:11px;color:var(--dim2)}

/* 乗り場をタップすると Googleマップ が開く。
   青字にすると表が読みにくいので、色は本文のままで 📍 だけを目印にする。
   指で押す場所なので、上下に少し余白を持たせて当たりを広くする。 */
a.mapl{color:inherit;text-decoration:none;display:inline-block;padding:2px 0}
a.mapl .pin{font-size:11px;margin-right:3px;opacity:.75}
a.mapl:active{opacity:.55}
.tag{display:inline-block;font-size:10px;border-radius:6px;padding:1px 7px;margin-left:6px}
.tag.l{background:#442f04;color:var(--gold)}
.tag.m{background:#082f49;color:#7dd3fc}
.tag.s{background:#1e293b;color:var(--dim)}

/* --- 下のタブ --- */
nav{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;
  background:rgba(10,14,23,.97);backdrop-filter:blur(10px);
  border-top:1px solid var(--line);padding:7px 0 max(7px,env(safe-area-inset-bottom))}
nav button{flex:1;background:none;border:0;color:var(--dim2);
  font-size:10px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:3px}
nav button .ic{font-size:19px;line-height:1}
nav button.on{color:var(--blue)}
.empty{text-align:center;color:var(--dim2);padding:40px 20px;font-size:13px}
.note{font-size:11px;color:var(--dim2);margin-top:9px}
.err{background:#3f1d1d;border:1px solid #7f1d1d;border-radius:12px;padding:13px;
  color:#fecaca;font-size:13px}

/* --- 合言葉 --- */
.gate{max-width:340px;margin:16vh auto 0;text-align:center;padding:0 20px}
.gate .ic{font-size:40px}
.gate h1{font-size:17px;margin:14px 0 6px}
.gate p{font-size:12px;color:var(--dim2);margin:0 0 18px;line-height:1.7}
.gate input{width:100%;background:var(--card);border:1px solid var(--line);
  color:var(--fg);border-radius:11px;padding:13px;font-size:16px;text-align:center;
  letter-spacing:.12em}
.gate button{width:100%;margin-top:10px;background:var(--blue);border:0;color:#04202e;
  border-radius:11px;padding:13px;font-size:15px;font-weight:800}
.gate .ng{color:#fca5a5;font-size:12px;margin-top:11px;min-height:18px}
</style></head><body>
<!--wbapp-ok-->

<header>
  <div class="hrow">
    <span class="logo">🚕 みんなの記録</span>
    <span class="stamp" id="stamp"></span>
    <button class="reload" onclick="location.reload()">更新</button>
  </div>
</header>

<div class="filters">
  <select id="period" onchange="draw()"></select>
  <select id="member" onchange="draw()"></select>
</div>
<div class="chips" id="dayChips"></div>

<main id="view"></main>

<nav>
  <button id="nav-a" class="on" onclick="go('a')"><span class="ic">📊</span>立ち回り</button>
  <button id="nav-b" onclick="go('b')"><span class="ic">📋</span>記録</button>
  <button id="nav-c" onclick="go('c')"><span class="ic">🏆</span>ランキング</button>
</nav>

<script>
const DATA = /*__DATA__*/null;
let tab = 'a', dayType = '全部';

const yen = n => '¥' + Math.round(n).toLocaleString();
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const WD = ['日','月','火','水','木','金','土'];
const dObj = s => { const p = String(s).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); };
const dLabel = s => { const d = dObj(s);
  return (d.getMonth()+1) + '/' + d.getDate() + '(' + WD[d.getDay()] + ')'; };
const band = m => m >= D.longMin ? 'l' : (m > D.shortMax ? 'm' : 's');
const bandName = { l:'ロング', m:'ミドル', s:'ショート' };
const slotLabel = s => (s < 24 ? s : s - 24) + '時';

/* 乗り場名を、タップで Googleマップ が開くリンクにする。
   行き先が分からない乗り場（表に無い・002-Extras.gs が未導入）は、
   今までどおりただの文字で出す。押せないだけで、表示は変わらない。 */
function mapLink(place, cls) {
  const t = esc(place || '（乗り場不明）');
  const u = (D && D.map) ? D.map[place] : '';
  if (!place || !u) return cls ? '<span class="' + cls + '">' + t + '</span>' : t;
  return '<a class="mapl' + (cls ? ' ' + cls : '') + '" href="' + esc(u) +
    '" target="_blank" rel="noopener"><span class="pin">📍</span>' + t + '</a>';
}

/* ---------- 起動 ---------- */
let D = DATA;          // 合言葉で読み直したときは、こちらが入れ替わる

function boot() {
  if (D && D.ok) return start();

  const g = D && D.gate;
  if (g === 'pass')  return askPass();
  if (g === 'deny')  return gateMsg('🚫', '開けません',
    'ログイン中のアカウント：' + esc(D.who || '不明') + '<br>' +
    'このアカウントは許可されていません。<br>別のアカウントで開くか、管理者に連絡してください。');
  if (g === 'setup') return gateMsg('⚠️', '設定が足りません',
    'メールでの制限を効かせるには、Apps Script の<br>' +
    '「デプロイを管理」→ 実行するユーザー を<br>' +
    '<b>ウェブアプリにアクセスしているユーザー</b><br>に変えてください。<br><br>' +
    'かんたんに済ませたい場合は、設定タブの<br><b>ページの合言葉</b>を使ってください。');

  document.getElementById('view').innerHTML =
    '<div class="err">記録を読み込めませんでした。<br>' +
    esc((D && D.error) || '原因不明') + '</div>';
}

/** 上のバーと下のタブを隠して、案内だけ出す */
function gateOnly(html) {
  document.querySelector('header').style.display = 'none';
  document.querySelector('nav').style.display = 'none';
  document.querySelectorAll('.filters, .chips').forEach(function (el) {
    el.style.display = 'none';
  });
  document.getElementById('view').innerHTML = html;
}
function gateMsg(ic, title, body) {
  gateOnly('<div class="gate"><div class="ic">' + ic + '</div><h1>' + title + '</h1>' +
           '<p>' + body + '</p></div>');
}

/** 合言葉を聞く。一度通れば、その端末では覚えておく */
function askPass() {
  gateOnly('<div class="gate"><div class="ic">🔒</div>' +
    '<h1>みんなの記録</h1>' +
    '<p>合言葉を入れてください。<br>一度入れれば、この端末では次から聞きません。</p>' +
    '<input id="pw" type="password" inputmode="text" autocomplete="off" placeholder="合言葉">' +
    '<button id="go">開く</button><div class="ng" id="ng"></div></div>');

  const box = document.getElementById('pw');
  const btn = document.getElementById('go');
  const send = function () {
    const v = (box.value || '').trim();
    if (!v) return;
    btn.disabled = true; btn.textContent = '確認中…';
    document.getElementById('ng').textContent = '';
    tryPass(v, false);
  };
  btn.onclick = send;
  box.onkeydown = function (ev) { if (ev.key === 'Enter') send(); };

  // 前に通った合言葉があれば、黙って試す
  let saved = '';
  try { saved = localStorage.getItem('wbpass') || ''; } catch (e) {}
  if (saved) { btn.disabled = true; btn.textContent = '確認中…'; tryPass(saved, true); }
  else { try { box.focus(); } catch (e) {} }
}

function tryPass(code, quiet) {
  google.script.run
    .withSuccessHandler(function (txt) {
      let r = null;
      try { r = JSON.parse(txt); } catch (e) {}
      if (r && r.ok) {
        try { localStorage.setItem('wbpass', code); } catch (e) {}
        D = r;
        document.querySelector('header').style.display = '';
        document.querySelector('nav').style.display = '';
        document.querySelectorAll('.filters, .chips').forEach(function (el) {
          el.style.display = '';
        });
        start();
        return;
      }
      // 合わなかった。覚えていたものが古いだけなら、消してもう一度聞く
      try { localStorage.removeItem('wbpass'); } catch (e) {}
      if (quiet) { askPass(); return; }
      const b = document.getElementById('go');
      if (b) { b.disabled = false; b.textContent = '開く'; }
      const ng = document.getElementById('ng');
      if (ng) ng.textContent = (r && r.error) || '開けませんでした';
    })
    .withFailureHandler(function (err) {
      const b = document.getElementById('go');
      if (b) { b.disabled = false; b.textContent = '開く'; }
      const ng = document.getElementById('ng');
      if (ng) ng.textContent = '通信できませんでした：' + (err && err.message ? err.message : err);
    })
    .wbFetch(code, false);
}

/* ---------- 中身を組み立てる ---------- */
function start() {
  document.getElementById('stamp').textContent = D.updated;

  const ps = document.getElementById('period');
  ps.innerHTML = D.periods.map((p, i) =>
    '<option value="' + i + '">' + esc(p.label) + '</option>').join('');

  document.getElementById('member').innerHTML =
    '<option value="">全員</option>' +
    D.members.map(m => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join('');

  document.getElementById('dayChips').innerHTML =
    ['全部','平日','金曜','土曜','日祝'].map(d =>
      '<button class="chip' + (d === '全部' ? ' on' : '') + '" data-d="' + d +
      '" onclick="setDay(this)">' + d + '</button>').join('');

  draw();
}
function setDay(el) {
  dayType = el.dataset.d;
  document.querySelectorAll('#dayChips .chip')
    .forEach(c => c.classList.toggle('on', c === el));
  draw();
}
function go(t) {
  tab = t;
  ['a','b','c'].forEach(k =>
    document.getElementById('nav-' + k).classList.toggle('on', k === t));
  document.getElementById('member').style.display = (t === 'c') ? 'none' : '';
  document.getElementById('dayChips').style.display = (t === 'b') ? 'none' : '';
  window.scrollTo(0, 0);
  draw();
}

/* ---------- 絞り込み ---------- */
function pick() {
  const p = D.periods[+document.getElementById('period').value] || D.periods[0];
  const mem = document.getElementById('member').value;
  const f = r => r.d >= p.from && r.d <= p.to
    && (tab === 'b' || dayType === '全部' || r.y === dayType);
  const own = D.own.filter(r => f(r) && (!mem || r.w === mem));
  const opu = D.opu.filter(f);
  return { p: p, own: own, opu: opu, mem: mem };
}

/* ---------- 描く ---------- */
function draw() {
  const s = pick();
  const v = document.getElementById('view');
  v.innerHTML = tab === 'a' ? viewA(s) : tab === 'b' ? viewB(s) : viewC(s);
}

/* ===== ① 立ち回り ===== */
function viewA(s) {
  const rows = s.own;
  if (!rows.length) return empty('この期間の記録がありません');

  const sum = rows.reduce((a, r) => a + r.m, 0);
  const longN = rows.filter(r => band(r.m) === 'l').length;
  const H = [];

  H.push('<div class="kpis">' +
    kpi('件数', rows.length + '<small>件</small>') +
    kpi('平均売上', yen(sum / rows.length)) +
    kpi('ロング率', Math.round(longN / rows.length * 100) + '<small>%</small>') +
    '</div>');

  // 時間帯別（17時〜翌5時）
  const slots = [];
  for (let x = 17; x <= 29; x++) slots.push(x);
  H.push(barCard('⏰ 時間帯別 平均売上', '1時間ごと', slots.map(x => {
    const g = rows.filter(r => r.s === x);
    return { k: slotLabel(x), n: g.length,
             v: g.length ? g.reduce((a, r) => a + r.m, 0) / g.length : 0 };
  }), false));

  // 曜日区分別
  H.push(barCard('📅 曜日区分別 平均売上', '1回あたり',
    ['平日','金曜','土曜','日祝'].map(t => {
      const g = s.own.filter(r => r.y === t);   // ここは区分の比較なので絞らない
      return { k: t, n: g.length,
               v: g.length ? g.reduce((a, r) => a + r.m, 0) / g.length : 0 };
    }), true));

  H.push(placeCard('📍 乗り場ランキング（自社）', rows, '平均売上の高い順。3件以上のみ'));

  // ロングマップ（オプチャ込み・件数）
  const map = s.own.concat(s.opu).filter(r => band(r.m) === 'l');
  H.push(longMapCard(map, s.opu.length));

  return H.join('');
}

function kpi(l, v) {
  return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div></div>';
}
function empty(t) { return '<div class="empty">' + esc(t) + '</div>'; }

function barCard(title, sub, items, orange) {
  const max = Math.max.apply(null, items.map(i => i.v).concat([1]));
  const best = items.reduce((a, b) => b.v > a.v ? b : a, items[0]);
  const bars = items.map(i =>
    '<div class="bar' + (orange ? ' o' : '') + (i === best && i.v > 0 ? ' top' : '') + '">' +
      (i.v > 0 ? '<span class="n">' + Math.round(i.v / 100) / 10 + '千</span>' : '') +
      '<span class="fill" style="height:' + (i.v / max * 100) + '%"></span></div>').join('');
  const xs = items.map(i => '<span>' + esc(i.k) + '</span>').join('');
  return '<div class="card ' + (orange ? 'orange' : 'blue') + '">' +
    '<div class="chead"><b>' + title + '</b><span class="sub">' + sub + '</span>' +
    '<span class="badge">最高：' + esc(best.k) + '<br><i>' + yen(best.v) + '</i></span></div>' +
    '<div class="bars">' + bars + '</div><div class="xaxis">' + xs + '</div>' +
    '<div class="note">棒の上は平均売上（千円）。' +
      items.map(i => i.n).reduce((a, b) => a + b, 0) + '件ぶん</div></div>';
}

function placeCard(title, rows, sub) {
  const by = {};
  rows.forEach(r => {
    const p = r.p || '（不明）';
    (by[p] = by[p] || []).push(r);
  });
  let list = Object.keys(by).map(p => {
    const g = by[p];
    const sum = g.reduce((a, r) => a + r.m, 0);
    const c = { s:0, m:0, l:0 };
    g.forEach(r => c[band(r.m)]++);
    const waits = g.filter(r => r.wt != null).map(r => r.wt);
    const w = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null;
    return { p: p, n: g.length, avg: sum / g.length, c: c, w: w };
  }).filter(x => x.n >= 3).sort((a, b) => b.avg - a.avg).slice(0, 12);

  if (!list.length) return '<div class="card"><div class="chead"><b>' + title +
    '</b></div>' + empty('3件以上ある乗り場がまだありません') + '</div>';

  const rowsHtml = list.map(x =>
    '<div class="rrow"><div class="t">' + mapLink(x.p, 'nm') +
    '<span class="r">' + x.n + '件' + (x.w != null ? ' / 待' + Math.round(x.w) + '分' : '') +
    ' <b>' + yen(x.avg) + '</b></span></div>' +
    '<div class="track">' +
      seg(x.c.s, x.n, 's') + seg(x.c.m, x.n, 'm') + seg(x.c.l, x.n, 'l') +
    '</div></div>').join('');

  return '<div class="card"><div class="chead"><b>' + title + '</b>' +
    '<span class="sub">' + sub + '</span></div>' +
    '<div class="rank">' + rowsHtml + '</div>' +
    '<div class="legend">' +
      '<span><i class="seg-s"></i>ショート</span>' +
      '<span><i class="seg-m"></i>ミドル</span>' +
      '<span><i class="seg-l"></i>ロング</span></div></div>';
}
function seg(n, tot, cls) {
  return n ? '<i class="seg-' + cls + '" style="width:' + (n / tot * 100) + '%"></i>' : '';
}

function longMapCard(rows, opuTotal) {
  if (!rows.length) return '<div class="card orange"><div class="chead">' +
    '<b>🗺 ロングマップ</b><span class="sub">オプチャ込み</span></div>' +
    empty('この期間のロングがありません') + '</div>';

  const by = {};
  rows.forEach(r => {
    const p = r.p || '（不明）';
    by[p] = by[p] || { n: 0, o: 0, sum: 0 };
    by[p].n++; by[p].sum += r.m;
    if (r.w === 'ｵﾌﾟﾁｬ') by[p].o++;
  });
  const list = Object.keys(by).map(p => ({ p: p, ...by[p] }))
    .sort((a, b) => b.n - a.n).slice(0, 15);
  const max = list[0].n;

  const html = list.map(x =>
    '<div class="rrow"><div class="t"><span class="nm">' + esc(x.p) + '</span>' +
    '<span class="r">' + (x.o ? 'ｵﾌﾟﾁｬ' + x.o + ' / ' : '') + '平均' +
    yen(x.sum / x.n) + ' <b>' + x.n + '件</b></span></div>' +
    '<div class="track"><i class="seg-l" style="width:' + (x.n / max * 100) + '%"></i>' +
    '</div></div>').join('');

  return '<div class="card orange"><div class="chead"><b>🗺 ロングマップ</b>' +
    '<span class="sub">￥' + D.longMin.toLocaleString() + '以上・オプチャ込み</span>' +
    '<span class="badge">ロング<br><i>' + rows.length + '件</i></span></div>' +
    '<div class="rank">' + html + '</div>' +
    '<div class="note">オプチャ情報 ' + opuTotal + '件を含めた件数分布です。' +
    '自社の平均売上には入れていません。</div></div>';
}

/* ===== ② 記録 ===== */
function viewB(s) {
  const rows = s.own.concat(s.opu).slice().sort((a, b) =>
    a.d === b.d ? rank(b.t) - rank(a.t) : (a.d < b.d ? 1 : -1));
  if (!rows.length) return empty('この期間の記録がありません');

  const H = [];
  let cur = '';
  let dayRows = [];
  const flush = () => {
    if (!dayRows.length) return;
    const tot = dayRows.filter(r => r.w !== 'ｵﾌﾟﾁｬ').reduce((a, r) => a + r.m, 0);
    H.push('<div class="day"><span class="d">' + dLabel(cur) + '</span>' +
      '<span class="s">' + dayRows.length + '件</span>' +
      (tot ? '<span class="tot">' + yen(tot) + '</span>' : '') + '</div>');
    H.push(dayRows.map(rideCard).join(''));
    dayRows = [];
  };
  rows.forEach(r => { if (r.d !== cur) { flush(); cur = r.d; } dayRows.push(r); });
  flush();
  return H.join('');
}
function rank(t) { const p = t.split(':'); let h = +p[0]; if (h < 17) h += 24;
  return h * 60 + (+p[1]); }

function rideCard(r) {
  const b = band(r.m);
  const opu = r.w === 'ｵﾌﾟﾁｬ';
  const warn = r.k === '⚠️';
  return '<div class="ride' + (opu ? ' opu' : '') + (warn ? ' warn' : '') + '">' +
    '<div class="r1"><span class="tm">' + esc(r.t) + '</span>' +
    '<span class="who">' + esc(r.w) + '</span>' +
    (r.wt != null ? '<span class="who">待' + r.wt + '分</span>' : '') +
    '<span class="yen">' + yen(r.m) + '</span></div>' +
    '<div class="r2">' + mapLink(r.p) +
    '<span class="tag ' + b + '">' + bandName[b] + '</span></div>' +
    (r.o ? '<div class="r3">' + esc(r.o) + '</div>' : '') + '</div>';
}

/* ===== ③ ランキング ===== */
function viewC(s) {
  const rows = D.own.filter(r => r.d >= s.p.from && r.d <= s.p.to
    && (dayType === '全部' || r.y === dayType));
  if (!rows.length) return empty('この期間の記録がありません');

  const by = {};
  rows.forEach(r => {
    by[r.w] = by[r.w] || { n: 0, sum: 0, l: 0, days: {} };
    by[r.w].n++; by[r.w].sum += r.m; by[r.w].days[r.d] = 1;
    if (band(r.m) === 'l') by[r.w].l++;
  });
  const list = Object.keys(by).map(w => {
    const x = by[w];
    const days = Object.keys(x.days).length;
    return { w: w, n: x.n, sum: x.sum, avg: x.sum / x.n,
             lr: x.l / x.n * 100, days: days, per: x.sum / days };
  }).sort((a, b) => b.sum - a.sum);

  const max = list[0].sum;
  const medal = ['🥇','🥈','🥉'];

  const H = ['<div class="kpis">' +
    kpi('のべ件数', rows.length + '<small>件</small>') +
    kpi('合計売上', yen(rows.reduce((a, r) => a + r.m, 0))) +
    kpi('全体平均', yen(rows.reduce((a, r) => a + r.m, 0) / rows.length)) +
    '</div>'];

  H.push('<div class="card"><div class="chead"><b>🏆 売上ランキング</b>' +
    '<span class="sub">' + esc(s.p.label.replace('（今期）','')) + '</span></div><div class="rank">' +
    list.map((x, i) =>
      '<div class="rrow"><div class="t"><span class="nm">' +
      (medal[i] || (i + 1) + '.') + ' ' + esc(x.w) + '</span>' +
      '<span class="r">' + x.days + '日 / ' + x.n + '件 <b>' + yen(x.sum) + '</b></span></div>' +
      '<div class="track"><i class="seg-l" style="width:' + (x.sum / max * 100) + '%"></i></div>' +
      '</div>').join('') + '</div></div>');

  H.push('<div class="card"><div class="chead"><b>📈 中身くらべ</b>' +
    '<span class="sub">1回あたり・1日あたり</span></div><div class="rank">' +
    list.slice().sort((a, b) => b.avg - a.avg).map(x =>
      '<div class="rrow"><div class="t"><span class="nm">' + esc(x.w) + '</span>' +
      '<span class="r">日' + yen(x.per) + ' / ロング' + Math.round(x.lr) + '% ' +
      '<b>' + yen(x.avg) + '</b></span></div>' +
      '<div class="track"><i class="seg-m" style="width:' +
      (x.avg / list.reduce((a, b) => Math.max(a, b.avg), 1) * 100) + '%"></i></div>' +
      '</div>').join('') + '</div>' +
    '<div class="note">太字は1回あたりの平均売上。日＝出勤1日あたり。</div></div>');

  return H.join('');
}

boot();
</script></body></html>
`;
