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

/*
 * ★記録用スプシの開き方は、001-Code の mainSS_ にまとめてあります。
 *   ここは 001 を読み込まないので、同じ働きのものを置きます。
 *   本物と同じで「くっついていれば そのまま、離れていれば IDで開く」。
 */
vm.runInContext('function mainSS_(){' +
  ' try { var a = SpreadsheetApp.getActiveSpreadsheet(); if (a) return a; } catch (e) {}' +
  ' try { var id = PropertiesService.getScriptProperties().getProperty("MAIN_SS_ID");' +
  '       if (id) return SpreadsheetApp.openById(id); } catch (e) {}' +
  ' return null; }', ctx);

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
  // ★らんの番号は、コードの決まり（TK_C_*）から引く。決め打ちにしない
  const C = n => vm.runInContext('TK_C_' + n, ctx) - 1;
  ok(rows[0][C('WEA')] === '雨' && rows[0][C('RAIN')] === '雨',
     '  天気と「雨か」が入る', rows[0]);
  ok(rows[0][C('SRC')] === '気象庁（予報）', '★出所も必ず書く（実測ではないため）');
  ok(rows[0][C('ICON')] === '☔️', '★絵文字が入る（ご指示）', rows[0][C('ICON')]);
  ok(rows[0].length === vm.runInContext('TK_COLS', ctx),
     '★らんの数が、見出しとそろっている', rows[0].length);
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
  // [日付,曜日,絵,天気,雨か,夜の雨%,実測mm,夜の内訳,最高,最低,夜気温,警報,取得,出所]
  rows.push(['2026-09-20', '日', '☀️', '晴れ', '',  '10', '', '', '30', '22', '', '', '', '気象庁（予報）']);
  rows.push(['2026-09-21', '月', '☔️', '雨',   '雨', '80', '', '', '24', '19', '', '', '', '気象庁（予報）']);
  const m = ctx.tkLoadAll_();
  ok(m['2026-09-21'] && m['2026-09-21'].rain === true, '★雨の日は rain:true');
  ok(m['2026-09-20'] && m['2026-09-20'].rain === false, '  晴れの日は rain:false');
  ok(m['2026-09-20'].weather === '晴れ', '  天気の言葉も引ける');
  ok(m['2026-09-20'].icon === '☀️', '  絵文字も引ける');
  ok(m['2026-09-21'].sure === false, '★実測が入っていなければ sure:false（予報のまま）');
}

console.log('\n■ ★実測があれば、予報より実測を信じる');
/*
 * ★ここが、この仕組みでいちばん大事なところです。
 *   予報で「雨」でも、実際に降らなかった日はあります。
 *   その日を雨の日として数えたまま
 *   「雨の日は1件あたり￥◯◯」と出したら、結論ごと外れます。
 */
{
  rows.length = 0; made = 1;
  // 予報は「雨」。でも実測は 0.0mm → 降らなかった
  rows.push(['2026-09-20', '日', '☔️', '雨', '雨', '80', 0, '', '24', '19', '20.1', '', '', '気象庁（予報＋実測で確認）']);
  // 予報は「くもり」。でも実測は 3.5mm → 降った
  rows.push(['2026-09-21', '月', '☁️', 'くもり', '', '20', 3.5, '21時 3.5', '26', '20', '21.0', '', '', '気象庁（予報＋実測で確認）']);
  const m = ctx.tkLoadAll_();
  ok(m['2026-09-20'].rain === false,
     '★★予報が「雨」でも、実測 0mm なら 雨ではない');
  ok(m['2026-09-21'].rain === true,
     '★★予報が「くもり」でも、実測 3.5mm なら 雨');
  ok(m['2026-09-20'].sure === true && m['2026-09-21'].sure === true,
     '　 実測で確かめたことが分かる（sure:true）');
  ok(m['2026-09-21'].mm === 3.5, '　 降った量も引ける');
  ok(m['2026-09-21'].hours === '21時 3.5', '★いつ降ったかも引ける（時間帯べつ）');
  ok(m['2026-09-21'].tnight === '21.0', '★夜の気温も引ける');
}

console.log('\n■ 絵文字は、いちばん困るものを先に見る');
{
  const I = ctx.tkIcon_;
  ok(I('晴れのちくもり 一時雨') === '☔️', '★雨が入っていれば ☔️（晴れが先にあっても）');
  ok(I('くもり時々雷雨') === '⛈', '★雷は ⛈');
  ok(I('雪') === '❄️', '雪は ❄️');
  ok(I('晴れ時々くもり') === '🌤', '晴れとくもりは 🌤');
  ok(I('くもり') === '☁️', 'くもりは ☁️');
  ok(I('晴れ') === '☀️', '晴れは ☀️');
  ok(I('') === '', '空なら空');
}

console.log('\n■ 夜の降水確率は、時間帯を見て決める');
{
  rows.length = 0; props = {}; cache = {}; fetched.length = 0;
  reply = { code: 200, body: JSON.stringify([
    { timeSeries: [
      { areas: [{ area: { name: '大阪' }, weathers: ['くもり'] }] },
      { timeDefines: ['2026-09-21T00:00:00+09:00', '2026-09-21T06:00:00+09:00',
                      '2026-09-21T12:00:00+09:00', '2026-09-21T18:00:00+09:00'],
        areas: [{ area: { name: '大阪' }, pops: ['10', '20', '30', '70'] }] },
      { areas: [{ area: { name: '大阪' }, temps: ['18', '22'] }] }
    ]}
  ]) };
  const w = ctx.tkFetch_();
  ok(w.popEve === '70', '★18〜24時のぶんを、そこだけ取り出す（' + w.popEve + '）');
  ok(w.popNight === '10', '★0〜6時のぶんも（' + w.popNight + '）');
  /*
   * ★並びを決め打ちにすると、夕方の値を夜の値として出してしまいます。
   *   夜に取ると、過ぎた時間帯は入っていないことがあります
   */
  ok(w.pop === '70', '　 1日ぶんの最大も、これまでどおり出る');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
