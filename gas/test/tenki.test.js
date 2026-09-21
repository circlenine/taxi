/**
 * 天気の記録（007-Tenki.gs）を確かめる。
 *   実行: node gas/test/tenki.test.js
 *
 * ★天気は「毎日ためる」ことが命です。1日でも抜けると、
 *   その日の乗車はぜんぶ「天気なし」になり、比べられなくなります。
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

let cache = {};
ctx.CacheService = { getScriptCache: () => ({
  get: k => (k in cache ? cache[k] : null),
  put: (k, v) => { cache[k] = v; },
  remove: k => { delete cache[k]; } }) };

let fetched = [], reply = { code: 200, body: '[]' };
ctx.UrlFetchApp = { fetch: (url, opt) => {
  fetched.push(url);
  if (reply.throw) throw new Error(reply.throw);
  return { getResponseCode: () => reply.code, getContentText: () => reply.body };
} };

// にせのスプシ（天気タブだけ）
const rows = [];
let made = 0;
const fakeSheet = () => ({
  // 「何行目から・何列ぶん」を、ちゃんと見て返す（本物と同じように）
  getRange: (r0, c0, n, w) => ({
    setValues: () => ({ setFontWeight: () => ({ setBackground: () => ({ setWrap: () => {} }) }) }),
    getValues: () => rows.slice((r0 || 2) - 2, (r0 || 2) - 2 + (n || rows.length))
                         .map(r => r.slice((c0 || 1) - 1, (c0 || 1) - 1 + (w || 1)))
  }),
  setFrozenRows: () => {}, setColumnWidth: () => {},
  getLastRow: () => rows.length + 1,
  appendRow: r => { rows.push(r); }
});
const sheetObj = fakeSheet();
ctx.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: n => (made ? sheetObj : null),
    insertSheet: n => { made = 1; return sheetObj; } }),
  getUi: () => { throw new Error('no ui'); }
};

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '007-Tenki.gs'), 'utf8'), ctx);

let fail = 0;
const ok = (c, m, extra) => {
  if (!c) { fail++; console.log('NG  ', m, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', m);
};

console.log('■ 日付の形と、雨かどうかの見分け');
{
  ok(ctx.tkKey_(new Date(2026, 8, 3)) === '2026-09-03', '★日付は 2026-09-03 の形（並べ替えられるように）');
  ok(ctx.tkIsRain_('くもり時々雨') === true, '★「雨」が入っていれば、雨あつかい');
  ok(ctx.tkIsRain_('雪') === true, '  雪も、雨あつかい（路面が濡れて、歩かなくなるため）');
  ok(ctx.tkIsRain_('晴れ') === false, '  晴れは、雨ではない');
  ok(ctx.tkIsRain_('') === false, '  空でも落ちない');
  ok(ctx.tkIsRain_(null) === false, '  null でも落ちない');
}

console.log('\n■ 気象庁のデータから、天気・降水確率・気温を取り出す');
{
  reply = { code: 200, body: JSON.stringify([
    { timeSeries: [
      { areas: [{ area: { name: '大阪' }, weathers: ['くもり　のち　雨', '晴れ', '晴れ'] }] },
      { areas: [{ area: { name: '大阪' }, pops: ['10', '30', '60', '50', '20'] }] },
      { areas: [{ area: { name: '大阪' }, temps: ['21', '28'] }] }
    ]}
  ]) };
  const w = ctx.tkFetch_();
  ok(w && w.weather === 'くもり　のち　雨', '★きょうの天気を取れる', w && w.weather);
  ok(w && w.pop === '60', '★きょうの降水確率は、いちばん大きいものを取る', w && w.pop);
  ok(w && w.tmin === '21' && w.tmax === '28', '  気温は 最低・最高の順', w);

  reply = { code: 500, body: '' };
  ok(ctx.tkFetch_() === null, '★取れないときは null（うその天気を作らない）');
  reply = { code: 200, body: 'こわれた中身' };
  ok(ctx.tkFetch_() === null, '  中身がこわれていても、落ちない');
  reply = { throw: 'つながらない' };
  ok(ctx.tkFetch_() === null, '  つながらなくても、落ちない');
}

console.log('\n■ 1日1行だけ、ためる');
{
  rows.length = 0; props = {}; cache = {}; fetched.length = 0;
  reply = { code: 200, body: JSON.stringify([
    { timeSeries: [
      { areas: [{ area: { name: '大阪' }, weathers: ['雨'] }] },
      { areas: [{ area: { name: '大阪' }, pops: ['80'] }] },
      { areas: [{ area: { name: '大阪' }, temps: ['18', '22'] }] }
    ]}
  ]) };
  ok(ctx.tkRecordToday() === true, '★きょうのぶんを ためる');
  ok(rows.length === 1, '  1行だけ入る', rows.length);
  ok(rows[0][2] === '雨' && rows[0][3] === '雨', '  天気と「雨か」が入る', rows[0]);
  ok(rows[0][8] === '気象庁（予報）', '★出所も必ず書く（実測ではないため）');
  ok(vm.runInContext('TK_TAB', ctx) === '天気',
     '★タブ名は「天気」だけ（絵文字なし・全角2文字以内）');
  ok(ctx.tkRecordToday() === false, '★同じ日は、二度ためない');
  ok(rows.length === 1, '  行も増えない');
}

console.log('\n■ 18:00〜翌05:00 のあいだに、その日のぶんだけ取りにいく');
{
  const Real = Date;
  const mk = (day, h) => { const D = function (...a) { return a.length ? new Real(...a) : new Real(2026, 8, day, h, 0); };
                    D.prototype = Real.prototype; D.now = () => new Real(2026, 8, day, h, 0).getTime(); return D; };

  rows.length = 0; props = {}; cache = {};
  ctx.Date = mk(21, 12);
  ok(ctx.tkInWindow_() === false, '★昼（12時）は、取りにいかない');
  ok(ctx.tkTick_() === false, '  何もしない');
  ok(rows.length === 0, '  1行もためない');

  ctx.Date = mk(21, 18);
  ok(ctx.tkInWindow_() === true, '★18:00 から、取りにいく（ご指示）');
  ok(ctx.tkTick_() === true, '  取りにいく');
  ok(rows.length === 1, '  1行ためる');
  ok(rows[0][0] === '2026-09-21', '  その日（9/21）のぶんとして入る', rows[0][0]);
  ok(ctx.tkTick_() === false, '★取れた日は、もう取りにいかない');

  /*
   * ★深夜2時に取ったぶんは、前の日（営業日）のものです。
   *   営業日は 17:00〜翌16:59。ここを取りちがえると、
   *   レポートで雨の日と晴れの日が入れかわります
   */
  rows.length = 0; props = {}; cache = {};
  ctx.Date = mk(22, 2);
  ok(ctx.tkInWindow_() === true, '★深夜2時も、まだ取りにいく（翌05:00まで）');
  ok(ctx.tkTick_() === true, '  取りにいく');
  ok(rows[0][0] === '2026-09-21', '★深夜のぶんは、前の日（9/21）としてためる', rows[0][0]);

  ctx.Date = mk(22, 5);
  ok(ctx.tkInWindow_() === false, '★朝5時をすぎたら、もう取らない');
  ctx.Date = Real;
}

console.log('\n■ ためた天気を、日付で引ける');
{
  rows.length = 0; made = 1;
  rows.push(['2026-09-20', '日', '晴れ', '', '10', '30', '22', '', '気象庁（予報）']);
  rows.push(['2026-09-21', '月', '雨', '雨', '80', '24', '19', '', '気象庁（予報）']);
  const m = ctx.tkLoadAll_();
  ok(m['2026-09-21'] && m['2026-09-21'].rain === true, '★雨の日は rain:true');
  ok(m['2026-09-20'] && m['2026-09-20'].rain === false, '  晴れの日は rain:false');
  ok(m['2026-09-20'].weather === '晴れ', '  天気の言葉も引ける');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
