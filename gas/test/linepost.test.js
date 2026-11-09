/**
 * LINEから届いたときの入口（doPost）を確かめる。
 *   実行: node gas/test/linepost.test.js
 *
 * ★なぜ要るか（2026/11/9）
 *   LINEは「そこへちゃんと届くか」を確かめるとき、
 *   中身の無い知らせを1つ送ってきます。
 *   ところが、こちらは
 *     ・順番待ちを最大20秒
 *     ・そのあと、まるごと診る
 *   をやってから返事をしていました。LINEは待ってくれません。
 *   実際に「受け取れませんでした（REQUEST_TIMEOUT）」と出ました。
 *
 *   ここが速くないと、「届くかどうか」の見張りそのものが
 *   あてにならなくなります。見張りの土台の話です。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) console.log('ok  ', msg);
  else { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
};

/** 偽の世界をつくる */
function build() {
  const ctx = { console };
  vm.createContext(ctx);
  ctx.log = [];
  ctx.props = {};
  ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in ctx.props ? ctx.props[k] : null),
    getProperties: () => Object.assign({}, ctx.props),
    setProperty: (k, v) => { ctx.props[k] = String(v); },
    deleteProperty: k => { delete ctx.props[k]; } }) };
  ctx.LockService = { getScriptLock: () => ({
    waitLock: () => { ctx.log.push('順番待ち'); },
    tryLock: () => true,
    releaseLock: () => {} }) };
  ctx.ContentService = {
    MimeType: { JSON: 'json' },
    createTextOutput: (t) => ({ _t: t, setMimeType: () => ({ _t: t }) })
  };
  ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); } };
  ctx.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) };
  ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '' }) };
  ctx.ScriptApp = { getProjectTriggers: () => [], newTrigger: () => ({}) };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8'), ctx);
  // 重たいところは、呼ばれたかどうかだけ見られるように差しかえる
  vm.runInContext('function panelHealWatch_(){ log.push("見張りを診る"); }', ctx);
  vm.runInContext('function updDoctorTick_(){ log.push("まるごと診る"); }', ctx);
  vm.runInContext('function handleEvent_(ev){ log.push("記録を入れる"); }', ctx);
  vm.runInContext('function logErr_(){}', ctx);
  return ctx;
}

const post = (ctx, body) =>
  vm.runInContext('doPost', ctx)({ postData: { contents: JSON.stringify(body) } });

console.log('■ 中身の無い知らせ（LINEの「届きますか」）には、すぐ返事する');
{
  const c = build();
  const r = post(c, { destination: 'Uxxxx', events: [] });
  ok(String(r && r._t).indexOf('ok') !== -1, '　 ちゃんと「ok」を返す', r && r._t);
  ok(c.log.indexOf('順番待ち') === -1,
     '★★★順番待ち（最大20秒）をしない', c.log);
  ok(c.log.indexOf('まるごと診る') === -1,
     '★★★「まるごと診る」もしない（ここが遅さの元だった）', c.log);
  ok(c.log.length === 0, '　 つまり、何もせずに すぐ返す', c.log);
}

console.log('■ events そのものが無いときも、すぐ返事する');
{
  const c = build();
  post(c, { destination: 'Uxxxx' });
  ok(c.log.length === 0, '★中身が無ければ、やることは無い', c.log);
}

console.log('■ ほんものの知らせは、これまでどおり ぜんぶやる');
{
  const c = build();
  const r = post(c, { events: [{ type: 'message', message: { type: 'text', text: '新地7' } }] });
  ok(String(r && r._t).indexOf('ok') !== -1, '　 「ok」を返す');
  ok(c.log.indexOf('記録を入れる') !== -1, '★記録を入れる', c.log);
  ok(c.log.indexOf('まるごと診る') !== -1, '★まるごと診るのも、ちゃんとやる', c.log);
  ok(c.props['LAST_LINE'], '　 届いた時刻を残す');
}

console.log('■ 記録を入れるほうが、まるごと診るより先');
{
  /*
   * ★診るのに時間がかかると、LINEが待ちきれずに同じものを送り直します。
   *   先に書いてしまえば、送り直されても困りません。
   */
  const c = build();
  post(c, { events: [{ type: 'message' }] });
  const a = c.log.indexOf('記録を入れる');
  const b = c.log.indexOf('まるごと診る');
  ok(a !== -1 && b !== -1 && a < b,
     '★★★記録が先、診るのがあと', c.log);
}

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
