/**
 * ================================================================
 *  オプチャ印の管理（Opucha.gs）
 *
 *  ★記録用スプシの Apps Script プロジェクトに別ファイルとして追加。
 *
 *  【なぜ必要か】
 *    オプチャ情報は、タブや列を見ても機械的に判定できない。
 *      ・LINE連携前の記録は A列が空のまま個人タブに入っている（自社実績）
 *      ・過去にLINEのメッセージで送ったオプチャ情報も個人タブに入っている
 *      ・関空タブにも自社の乗車が混ざっている
 *    つまり「どれがオプチャか」は人が決めるしかない。
 *    そのための、検索してチェックを付ける画面。
 *
 *  【印の持ち方】
 *    本体は スクリプトプロパティ（OPUCHA_MARKS）に置く。
 *      { "2026-05-21|23:48|1300": "元のA列の値", ... }
 *    整形（formatTab_）や連動タブの作り直しで消えないようにするため。
 *    見た目としては A列に「ｵﾌﾟﾁｬ」と表示する。印を外すと元の値に戻る。
 *
 *  【今後の運用】
 *    LINEの画像スクショから読み取ったものは、自動でオプチャ扱いにする予定。
 *    それ以外（過去分・手打ち分）は、この画面から指定する。
 * ================================================================
 */

const OPU_LABEL   = "ｵﾌﾟﾁｬ";       // A列に表示する印
const OPU_PROP    = "OPUCHA_MARKS"; // スクリプトプロパティのキー
const OPU_MAX_HIT = 300;            // 一度に一覧表示する上限

/* ============ 印の保存 ============ */

let _opuCache = null;

function opuMarks_() {
  if (_opuCache) return _opuCache;
  const raw = PropertiesService.getScriptProperties().getProperty(OPU_PROP);
  try { _opuCache = raw ? JSON.parse(raw) : {}; } catch (e) { _opuCache = {}; }
  return _opuCache;
}

function opuSaveMarks_(m) {
  PropertiesService.getScriptProperties().setProperty(OPU_PROP, JSON.stringify(m));
  _opuCache = m;
}

/** 1回の乗車を表すキー。乗り場は表記ゆれで変わるので使わない */
function opuRideKey_(date, time, money) {
  return ymdOf_(date) + "|" + String(time).trim() + "|" + money;
}

/** その行がオプチャかどうか。印リストが本体、A列の表記は補助 */
function opuIsOpucha_(who, rideKey, marks) {
  const m = marks || opuMarks_();
  if (Object.prototype.hasOwnProperty.call(m, rideKey)) return true;
  return toFullKana_(String(who || "")).replace(/[\s　]/g, "").indexOf("オプチャ") !== -1;
}

/* ============ 乗車を集める ============ */

/**
 * 全タブを読んで、乗車1件につき1つにまとめる。
 * 同じ乗車が個人タブとエリアタブの両方にあっても1件として扱う。
 */
function opuCollect_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const marks = opuMarks_();
  const byKey = {};

  ALL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;

    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r, i) {
      const date = r[C_DATE - 1];
      if (!(date instanceof Date)) return;
      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money)) return;
      const tm = String(r[C_TIME - 1]).match(/(\d{1,2}):(\d{2})/);
      const time = tm ? tm[0] : String(r[C_TIME - 1]).trim();
      const key = opuRideKey_(date, time, money);

      if (!byKey[key]) {
        byKey[key] = {
          key: key, date: date, time: time, money: money,
          place: String(r[C_PLACE - 1]).replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
          method: String(r[C_METHOD - 1]).replace(/\n/g, " ").trim(),
          other: String(r[C_OTHER - 1]).replace(/\n/g, " ").trim(),
          who: String(r[C_SENDER - 1]).trim(),
          tabs: [], rows: []
        };
      }
      const b = byKey[key];
      if (b.tabs.indexOf(name) === -1) b.tabs.push(name);
      b.rows.push({ tab: name, row: START_ROW + i });
      // A列に名前が入っている行があれば、そちらを代表にする（写しはA列が空のことがある）
      const w = String(r[C_SENDER - 1]).trim();
      if (!b.who && w) b.who = w;
      if (!b.place) b.place = String(r[C_PLACE - 1]).replace(/\n/g, " ").trim();
    });
  });

  const list = Object.keys(byKey).map(function (k) {
    const b = byKey[k];
    b.isOpucha = opuIsOpucha_(b.who, b.key, marks);
    return b;
  });
  list.sort(function (a, b) {
    return b.date.getTime() - a.date.getTime() || b.money - a.money;
  });
  return list;
}

/* ============ 検索 ============ */

/**
 * 条件で絞る。
 *   word     … 乗り場・そのほか・乗車方法・A列・日付 のどれかに含まれる語（空白区切りでAND）
 *   minMoney / maxMoney … 金額の範囲
 *   from / to … 営業日の範囲（yyyy-mm-dd）
 *   onlyOpucha … 今オプチャになっている行だけ
 *   tab      … 特定のタブに入っている行だけ
 */
function opuFilter_(list, c) {
  const words = String(c.word || "").split(/[\s　]+/).filter(String)
    .map(function (w) { return toFullKana_(w).toUpperCase(); });
  const from = c.from ? new Date(c.from.replace(/-/g, "/") + " 00:00:00") : null;
  const to   = c.to   ? new Date(c.to.replace(/-/g, "/") + " 23:59:59")   : null;
  const min  = c.minMoney ? parseInt(c.minMoney, 10) : null;
  const max  = c.maxMoney ? parseInt(c.maxMoney, 10) : null;

  return list.filter(function (x) {
    if (c.onlyOpucha && !x.isOpucha) return false;
    if (c.tab && x.tabs.indexOf(c.tab) === -1) return false;
    if (from && x.date < from) return false;
    if (to && x.date > to) return false;
    if (min !== null && !isNaN(min) && x.money < min) return false;
    if (max !== null && !isNaN(max) && x.money > max) return false;
    if (words.length) {
      const hay = toFullKana_([
        x.place, x.other, x.method, x.who, x.tabs.join(" "),
        fmtDate_(x.date), x.time
      ].join(" ")).toUpperCase();
      for (let i = 0; i < words.length; i++) {
        if (hay.indexOf(words[i]) === -1) return false;
      }
    }
    return true;
  });
}

/* ============ 印を付ける／外す ============ */

/**
 * 指定した乗車キーの印を更新して、A列の表示も直す。
 * 戻り値 { marked, unmarked, cells }
 */
function opuApply_(setKeys, clearKeys) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const marks = opuMarks_();
  const all = opuCollect_();
  const byKey = {};
  all.forEach(function (x) { byKey[x.key] = x; });

  let marked = 0, unmarked = 0, cells = 0;
  const writes = [];   // {tab, row, value}

  (setKeys || []).forEach(function (k) {
    const x = byKey[k];
    if (!x) return;
    if (!Object.prototype.hasOwnProperty.call(marks, k)) {
      // 元のA列の値を覚えておく（印を外したときに戻すため）
      marks[k] = x.who === OPU_LABEL ? "" : x.who;
      marked++;
    }
    x.rows.forEach(function (p) { writes.push({ tab: p.tab, row: p.row, value: OPU_LABEL }); });
  });

  (clearKeys || []).forEach(function (k) {
    const x = byKey[k];
    if (!x) return;
    const orig = Object.prototype.hasOwnProperty.call(marks, k) ? marks[k] : "";
    if (Object.prototype.hasOwnProperty.call(marks, k)) { delete marks[k]; unmarked++; }
    x.rows.forEach(function (p) { writes.push({ tab: p.tab, row: p.row, value: orig }); });
  });

  // タブごとにまとめて書く
  const byTab = {};
  writes.forEach(function (w) { (byTab[w.tab] = byTab[w.tab] || []).push(w); });
  Object.keys(byTab).forEach(function (tab) {
    const sh = ss.getSheetByName(tab);
    if (!sh) return;
    byTab[tab].forEach(function (w) {
      sh.getRange(w.row, C_SENDER).setValue(w.value);
      cells++;
    });
  });

  opuSaveMarks_(marks);
  return { marked: marked, unmarked: unmarked, cells: cells };
}

/* ============ 画面 ============ */

function menuOpucha() {
  const html = '<!DOCTYPE html><html><head><base target="_top"><style>' +
    'body{font-family:sans-serif;padding:12px;color:#333;font-size:13px;margin:0}' +
    'h3{font-size:15px;margin:0 0 6px;border-bottom:2px solid #b45f06;padding-bottom:6px}' +
    '.d{font-size:11px;color:#666;margin-bottom:10px;line-height:1.6}' +
    'input,select{width:100%;font-size:15px;padding:9px;box-sizing:border-box;' +
    'border:1px solid #ccc;border-radius:5px;margin-bottom:8px}' +
    '.two{display:flex;gap:8px}.two>*{flex:1}' +
    'label.ck{display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:8px}' +
    'button{width:100%;padding:13px;margin-top:6px;border:none;border-radius:5px;' +
    'font-weight:bold;font-size:15px;cursor:pointer;color:#fff}' +
    '#bs{background:#1155ca}#ba{background:#b45f06}' +
    '#list{max-height:300px;overflow:auto;border:1px solid #ddd;border-radius:5px;margin-top:8px}' +
    '.it{display:flex;align-items:flex-start;gap:8px;padding:8px;border-bottom:1px solid #eee}' +
    '.it:last-child{border-bottom:none}' +
    '.it input{width:22px;height:22px;flex:0 0 22px;margin:2px 0 0}' +
    '.tx{flex:1;line-height:1.5;font-size:12px}' +
    '.m{font-weight:bold}.p{color:#111}.s{color:#888;font-size:11px}' +
    '.on{background:#fdf0e3}' +
    '#msg{font-size:12px;margin-top:8px;white-space:pre-wrap;background:#f7f7f7;' +
    'padding:8px;border-radius:5px}' +
    '</style></head><body>' +
    '<h3>🏷 オプチャ印を付ける／外す</h3>' +
    '<div class="d">どれがオプチャ情報かを指定します。<br>' +
    '検索 → チェックを付け外し → 反映、の順です。<br>' +
    '<b>チェックが付いている＝オプチャ</b>。一覧に出ている行だけが反映されます。</div>' +
    '<input id="w" placeholder="検索（乗り場・そのほか・日付など／空白でAND）">' +
    '<div class="two"><input id="mn" type="number" placeholder="金額 下限"><input id="mx" type="number" placeholder="金額 上限"></div>' +
    '<div class="two"><input id="f" type="date"><input id="t" type="date"></div>' +
    '<select id="tb"><option value="">全タブ</option></select>' +
    '<label class="ck"><input type="checkbox" id="oo" style="width:20px;height:20px"> 今オプチャの行だけ表示</label>' +
    '<button id="bs" onclick="search()">検索する</button>' +
    '<div id="list"></div>' +
    '<button id="ba" onclick="apply()" style="display:none">この内容で反映する</button>' +
    '<div id="msg"></div>' +
    '<script>' +
    'var DATA=[];' +
    '(function(){var s=document.getElementById("tb");' +
    JSON.stringify(AREA_TABS.concat(FLAG_TABS, PERSONAL_TABS)) +
    '.forEach(function(n){s.add(new Option(n,n));});})();' +
    'function search(){' +
    'var b=document.getElementById("bs");b.disabled=true;b.innerText="検索中…";' +
    'document.getElementById("msg").innerText="";' +
    'google.script.run.withSuccessHandler(render).withFailureHandler(function(e){' +
    'b.disabled=false;b.innerText="検索する";' +
    'document.getElementById("msg").innerText="エラー: "+e.message;})' +
    '.runOpuchaSearch(JSON.stringify({word:document.getElementById("w").value,' +
    'minMoney:document.getElementById("mn").value,maxMoney:document.getElementById("mx").value,' +
    'from:document.getElementById("f").value,to:document.getElementById("t").value,' +
    'tab:document.getElementById("tb").value,onlyOpucha:document.getElementById("oo").checked}));}' +
    'function render(js){' +
    'var b=document.getElementById("bs");b.disabled=false;b.innerText="検索する";' +
    'var o=JSON.parse(js);DATA=o.items;' +
    'var L=document.getElementById("list");L.innerHTML="";' +
    'document.getElementById("ba").style.display=DATA.length?"block":"none";' +
    'if(!DATA.length){L.innerHTML=\'<div class="it"><div class="tx">該当なし</div></div>\';' +
    'document.getElementById("msg").innerText=o.note||"";return;}' +
    'DATA.forEach(function(x,i){' +
    'var d=document.createElement("div");d.className="it"+(x.o?" on":"");' +
    'd.innerHTML=\'<input type="checkbox" id="c\'+i+\'"\'+(x.o?" checked":"")+\'>\'+' +
    '\'<div class="tx"><span class="m">\'+x.d+\' \'+x.tm+\'</span> <span class="m">¥\'+x.y+\'</span>\'+' +
    '\'<br><span class="p">\'+x.p+\'</span>\'+' +
    '\'<br><span class="s">\'+x.s+\'</span></div>\';' +
    'L.appendChild(d);});' +
    'document.getElementById("msg").innerText=o.note||"";}' +
    'function apply(){' +
    'var set=[],clr=[];' +
    'DATA.forEach(function(x,i){var c=document.getElementById("c"+i);' +
    'if(!c)return; if(c.checked&&!x.o)set.push(x.k); if(!c.checked&&x.o)clr.push(x.k);});' +
    'if(!set.length&&!clr.length){document.getElementById("msg").innerText="変更がありません。";return;}' +
    'if(!confirm("オプチャ印を付ける: "+set.length+"件\\n外す: "+clr.length+"件\\nよろしいですか？"))return;' +
    'var b=document.getElementById("ba");b.disabled=true;b.innerText="反映中…";' +
    'google.script.run.withSuccessHandler(function(m){' +
    'b.disabled=false;b.innerText="この内容で反映する";' +
    'document.getElementById("msg").innerText=m;search();})' +
    '.withFailureHandler(function(e){b.disabled=false;b.innerText="この内容で反映する";' +
    'document.getElementById("msg").innerText="エラー: "+e.message;})' +
    '.runOpuchaApply(JSON.stringify({set:set,clear:clr}));}' +
    '</scr' + 'ipt></body></html>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(480).setHeight(720), "🏷 オプチャ印");
}

/** 画面から呼ばれる。検索結果をJSONで返す */
function runOpuchaSearch(criteriaJson) {
  const c = JSON.parse(criteriaJson || "{}");
  const all = opuCollect_();
  const hit = opuFilter_(all, c);
  const shown = hit.slice(0, OPU_MAX_HIT);

  const items = shown.map(function (x) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const sub = [];
    if (x.who) sub.push("A列:" + x.who);
    if (x.method) sub.push(x.method);
    if (x.other) sub.push(x.other);
    sub.push(x.tabs.join("・"));
    return {
      k: x.k = x.key,
      o: x.isOpucha ? 1 : 0,
      d: fmtDate_(x.date) + "(" + days[x.date.getDay()] + ")",
      tm: x.time,
      y: x.money.toLocaleString(),
      p: x.place || "(乗り場なし)",
      s: sub.join(" / ")
    };
  });

  const nOpu = all.filter(function (x) { return x.isOpucha; }).length;
  let note = "全 " + all.length + "件（うち今オプチャ " + nOpu + "件）\n";
  note += "検索ヒット " + hit.length + "件";
  if (hit.length > shown.length) {
    note += " → 上から " + shown.length + "件だけ表示しています。絞り込んでください。";
  }
  return JSON.stringify({ items: items, note: note });
}

/** 画面から呼ばれる。印を反映する */
function runOpuchaApply(selJson) {
  const s = JSON.parse(selJson || "{}");
  const r = opuApply_(s.set || [], s.clear || []);
  const marks = opuMarks_();
  let msg = "✅ 反映しました\n";
  msg += "オプチャにした: " + r.marked + "件\n";
  msg += "オプチャを外した: " + r.unmarked + "件\n";
  msg += "書き換えたセル: " + r.cells + "個（同じ乗車が複数タブにあるため件数より多くなります）\n";
  msg += "現在のオプチャ合計: " + Object.keys(marks).length + "件";
  return msg;
}

/* ============ 他のスクリプトから使う ============ */

/** 乗車キーの集合（Strategy.gs などが参照する） */
function opuKeySet() { return opuMarks_(); }
