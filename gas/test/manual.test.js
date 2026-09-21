/**
 * マニュアルのスプシ（008-Manual.gs）を確かめる。
 *   実行: node gas/test/manual.test.js
 *
 * ★なぜこれが要るのか
 *   手順書を .md で置いていましたが、スマホで開くと
 *   字が小さく・横に流れ・表が崩れて、読めたものではありませんでした。
 *   見られないところに書いても、無いのと同じです。
 *
 *   スプシに移したので、こんどは
 *   「タブの名前が長くて探せない」「作り直したら古い説明が残った」
 *   といった、スマホで効いてくるところを見ます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);

let props = {};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; },
  getProperties: () => Object.assign({}, props) }) };

/* ---- 偽のスプシ ---- */
function mkSheet(name) {
  const sh = {
    _name: name, _vals: [], _widths: {}, _fmt: [], _merged: [], _cleared: 0,
    getName: () => sh._name,
    clear: () => { sh._vals = []; sh._fmt = []; sh._merged = []; sh._cleared++; return sh; },
    clearNotes: () => sh,
    setColumnWidth: (c, w) => { sh._widths[c] = w; return sh; },
    autoResizeRows: () => sh,
    setFrozenRows: () => sh,
    getRange: (r, c, nr, nc) => mkRange(sh, r, c, nr || 1, nc || 1)
  };
  return sh;
}
function mkRange(sh, r, c, nr, nc) {
  const rg = {
    setValues: v => { sh._vals = v.slice(); return rg; },
    setValue: () => rg,
    clear: () => rg,
    merge: () => { sh._merged.push(r + ':' + c + 'x' + nc); return rg; },
    setWrap: v => { sh._fmt.push({ r: r, k: 'wrap', v: v }); return rg; },
    setVerticalAlignment: () => rg,
    setHorizontalAlignment: () => rg,
    setFontSize: () => rg,
    setFontFamily: () => rg,
    setFontColor: () => rg,
    setFontWeight: v => { sh._fmt.push({ r: r, k: 'bold', v: v }); return rg; },
    setBackground: v => { sh._fmt.push({ r: r, k: 'bg', v: v }); return rg; }
  };
  return rg;
}
const books = {};
function mkBook(id, name) {
  const sheets = [mkSheet('シート1')];
  const ss = {
    _id: id, _name: name,
    getId: () => id,
    getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
    getSheets: () => sheets.slice(),
    getSheetByName: n => sheets.filter(s => s._name === n)[0] || null,
    insertSheet: n => { const s = mkSheet(n); sheets.push(s); return s; },
    deleteSheet: s => { const i = sheets.indexOf(s); if (i >= 0) sheets.splice(i, 1); },
    setActiveSheet: s => { ss._active = s; return s; },
    moveActiveSheet: pos => {
      const s = ss._active; if (!s) return;
      const i = sheets.indexOf(s); if (i >= 0) sheets.splice(i, 1);
      sheets.splice(Math.max(0, pos - 1), 0, s);
    }
  };
  books[id] = ss;
  return ss;
}
let made = 0;
ctx.SpreadsheetApp = {
  create: n => mkBook('SSID' + (++made), n),
  openById: id => { if (!books[id]) throw new Error('開けません'); return books[id]; }
};

let pushed = [], replied = [];
vm.runInContext('var pu = [], rep = [];', ctx);
ctx.lrPush_ = (to, msgs) => { pushed.push({ to: to, msgs: msgs }); };
ctx.lineReply_ = (tok, text) => { replied.push(String(text)); };
ctx.updMe_ = () => 'Umark';
ctx.updCodeVers_ = () => 'C059/U098';

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '008-Manual.gs'), 'utf8'), ctx);
const F = n => vm.runInContext(n, ctx);

let ng = 0;
function t(cond, label, extra) {
  if (cond) { console.log('  ok   ' + label); return; }
  ng++; console.log('  NG   ' + label + (extra ? '  … ' + extra : ''));
}
function has(hay, needle, label) {
  t(String(hay).indexOf(needle) !== -1, label, String(hay).slice(0, 100));
}

console.log('\n■ タブの名前（スマホでいちばん効くところ）');
{
  const ss = F('mnBuild_')();
  const names = ss.getSheets().map(s => s.getName());
  t(names.join('／') === '目次／合図／満杯／読取／予定／困り',
    '★目次のとおりの並びになる（' + names.join('／') + '）', names.join('／'));

  /*
   * ★タブの名前は「絵文字なし・全角2文字以内」（決まりごと）。
   *   記録用スプシはタブが多く、長い名前や絵文字が混ざると、
   *   スマホではタブの行がすぐ埋まって、目当てのものを探せません
   */
  names.forEach(function (n) {
    t(n.length <= 2, '★「' + n + '」は全角2文字以内');
    t(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(n), '　 「' + n + '」に絵文字が無い');
  });

  t(names.indexOf('シート1') === -1, '★はじめにできる空のタブは残さない');
}

console.log('\n■ 作り直すたびに、まるごと入れ替える');
{
  /*
   * ★書き足す形にすると、直したはずの古い説明が下に残ります。
   *   どちらが正しいのか分からない手順書は、無いより たちが悪いです
   */
  const ss = F('mnBuild_')();
  const sh = ss.getSheetByName('満杯');
  const n1 = sh._cleared;
  const rows1 = sh._vals.length;
  F('mnBuild_')();
  t(sh._cleared > n1, '★毎回 まっさらにしてから書く');
  t(sh._vals.length === rows1, '　 行が増えていかない（' + sh._vals.length + '行）');
  t(Object.keys(books).length === 1, '★スプシを何個も作らない（1個を使い回す）');
}

console.log('\n■ 中身（読む人がいちばん知りたいところ）');
{
  const ss = F('mnBuild_')();
  const text = function (tab) {
    return ss.getSheetByName(tab)._vals.map(r => r.join(' ')).join('\n');
  };

  // 満杯のタブ
  const full = text('満杯');
  has(full, '[15] 古いデプロイを片づける', '★満杯：押すボタンを、番号と名前で書く');
  has(full, '3分以内', '　 2回目が要ることを書く');
  has(full, '使用中', '★満杯：使用中を残すことを、目で確かめさせる');
  has(full, '消す入り口を、Googleは出していません',
      '★満杯：できないことを、できるように書かない');
  /*
   * ★満杯のときは、LINEの受け口が古いコードのまま動きます。
   *   新しく足した合図は、いくら送っても届きません。
   *   「LINEで直してください」と書くのは、いちばん不親切です
   */
  has(full, 'LINEで「❗」と送っても、何も返ってきません',
      '★満杯：❗が効かないことを、先に書いておく');
  has(full, 'スプシのボタンからやってください',
      '★満杯：直し方は、いつでも効くスプシのほうへ案内する');
  t(full.indexOf('直し方：LINEで') === -1,
    '　 直し方としてLINEを案内しない', full.slice(0, 80));

  // 読取のタブ
  const read = text('読取');
  has(read, 'ニューオータニ', '★読取：会場の名前が出る');
  has(read, 'ワントゥワン', '　 もう1つの会場も');
  has(read, '一覧に日付が無いのが、正しい姿', '★読取：⚠️ が出ても異常ではないと書く');
  has(read, '開場', '★読取：開場と開演の取りちがえに注意させる');

  // 予定のタブ
  const plan = text('予定');
  has(plan, 'タクシーのリマインダー', '★予定：付ける名前を、そのまま書く');
  has(plan, '全角の縦棒', '★予定：半角と全角の取りちがえを、先に書く');
  has(plan, '許可', '★予定：はじめの1回だけ出る確認を、先に書く');

  // 合図のタブ
  const sign = text('合図');
  ['📈', '🎪', '📅', '📒', '📄', '☀️', '❌', '⏳', '❗', '❓'].forEach(function (e) {
    has(sign, e, '　 合図に ' + e + ' が載っている');
  });

  // 困りのタブ
  const help = text('困り');
  has(help, '[14] LINEの調子を調べる', '★困り：いちばん先に押すものを書く');
}

console.log('\n■ 1行は、スマホで読める長さに収める');
{
  /*
   * ★べた書きの長い文は、細い画面では折り返しだらけになって、
   *   どこが1つのまとまりなのか分からなくなります（ご指摘）
   */
  const ss = F('mnBuild_')();
  // ★画面に出る文（URLなど）は、こちらで短くできないので外します
  let worst = '', worstN = 0;
  ss.getSheets().forEach(function (sh) {
    sh._vals.forEach(function (r) {
      const b = String(r[1] || '');
      if (/https?:\/\//.test(b)) return;
      if (b.length > worstN) { worstN = b.length; worst = b; }
    });
  });
  t(worstN <= 42, '★いちばん長い行でも42文字まで（' + worstN + '文字）', worst);
}

console.log('\n■ 手順には、かならず番号を振る');
{
  const ss = F('mnBuild_')();
  ['満杯', '読取', '予定'].forEach(function (tab) {
    const sh = ss.getSheetByName(tab);
    const nums = sh._vals.filter(function (r) { return /^[0-9]+$/.test(String(r[0])); });
    t(nums.length >= 3, '★「' + tab + '」に、番号つきの手順が3つ以上ある（' +
      nums.length + '個）');
  });
}

console.log('\n■ 📘 でURLを返す（作り直しはしない）');
{
  F('mnBuild_')();
  replied.length = 0;
  const n = Object.keys(books).length;
  t(F('mnHandleCmd_')({ message: { text: '📘' },
      source: { userId: 'Umark' }, replyToken: 'r' }) === true, '★「📘」を受ける');
  has(replied[0], 'https://docs.google.com/spreadsheets/', '★URLを返す');
  has(replied[0], '目次／合図／満杯／読取／予定／困り', '　 何のタブがあるかも返す');
  t(Object.keys(books).length === n,
    '★読むだけのときに、作り直さない（開いていたタブが目次に戻るため）');

  // ほかの人には返さない
  t(F('mnHandleCmd_')({ message: { text: '📘' },
      source: { userId: 'Uother' }, replyToken: 'r' }) === false, '★ほかの人には、返さない');

  // まだ作っていないときは、作り方を出す
  delete props['MN_MANUAL_SS'];
  Object.keys(books).forEach(function (k) { delete books[k]; });
  replied.length = 0;
  F('mnHandleCmd_')({ message: { text: 'マニュアル' },
    source: { userId: 'Umark' }, replyToken: 'r' });
  has(replied[0], '[16]', '★まだ無ければ、作り方（[16]）を出す');
}

console.log('\n■ [16] のボタン');
{
  props = {}; pushed.length = 0;
  Object.keys(books).forEach(function (k) { delete books[k]; });
  const out = String(F('panelManual')());
  has(out, '作り直しました', '★結果らんに、済んだと出る');
  has(out, 'https://docs.google.com/spreadsheets/', '　 URLも出る');
  t(out.split('\n').filter(function (x) { return x.indexOf('・') === 0; }).length >= 2,
    '★行の頭に「・」を付けて並べる（スマホで目が追えるように）', out);
  t(pushed.length === 1, '★LINEにもURLを送る（スマホでは押せるほうが早い）');
  has(pushed[0].msgs[0].text, 'https://docs.google.com/spreadsheets/', '　 LINEにもURL');
}

console.log('\n■ バージョン');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '008-Manual.gs'), 'utf8');
  const head = (src.match(/★★★\s+(M\d+ver)/) || [])[1] || '';
  t(head === vm.runInContext('MN_VERSION', ctx),
    '★先頭のバージョンと MN_VERSION が同じ（' + head + '）');
}

console.log(ng ? '\n✗ ' + ng + '件 失敗\n' : '\n✓ すべて通りました\n');
process.exit(ng ? 1 : 0);
