/**
 * 🚕 一晩の流し方（003-LineReport.gs）を確かめる。
 *   実行: node gas/test/nightplan.test.js
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);
vm.runInContext('function logErr_(){}', ctx);
ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) };
ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); } };
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8'), ctx);

let fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fail++; console.log('FAIL', msg, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); }
  else console.log('ok  ', msg);
};
// const で作ったものは ctx に生えないので、中で評価して取り出す
const G = name => vm.runInContext(name, ctx);
const has = (got, want, msg) => eq(String(got).indexOf(want) !== -1, true, msg);

const DAY_TYPES = ['平日', '金曜', '土曜', '日祝'];
const HOURS = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

/** finalTimeline を組み立てる。spots は { 時: [乗り場, 平均, 件数, 待ち] } */
function tl(spec) {
  const t = {};
  DAY_TYPES.forEach(dt => {
    t[dt] = {};
    HOURS.forEach(hr => {
      const v = (spec[dt] || {})[hr];
      t[dt][hr] = { best: v ? { name: v[0], avg: v[1], count: v[2] || 2, wait: v[3] || 0, max: 0, at: '' } : null,
                    worst: null };
    });
  });
  return t;
}

console.log('■ 同じ乗り場が続く時間は、1つにまとめる');
{
  const plan = ctx.buildNightPlan_(tl({ 平日: {
    20: ['新地4', 12000, 5, 20], 21: ['新地4', 10000, 3, 10], 22: ['新地4', 8000, 2, 15],
    23: ['梅田', 9000, 4, 12], 0: ['梅田', 9000, 2, 8],
    1: ['難波', 6000, 2], 2: ['難波', 6000, 2], 3: ['難波', 6000, 2], 4: ['難波', 6000, 2]
  } }), DAY_TYPES);
  const segs = plan['平日'];
  eq(segs.length, 3, '9つの時間帯が3つの区間になる');
  eq(ctx.nightSpan_(segs[0]), '20〜22時台', '1つめは 20〜22時台');
  eq(segs[0].name, '新地4', '  乗り場も正しい');
  eq(segs[0].count, 10, '  件数は足し合わせる');
  eq(segs[0].avg, Math.round((12000 * 5 + 10000 * 3 + 8000 * 2) / 10), '  平均は件数で重みづけする');
  eq(segs[0].wait, 15, '  待ち時間は区間の平均');
  eq(ctx.nightSpan_(segs[1]), '23〜00時台', '2つめは 23〜00時台（日をまたいでもつながる）');
  eq(ctx.nightSpan_(segs[2]), '01〜04時台', '3つめは 01〜04時台');
  eq(ctx.nightMoves_(segs), 2, '動くのは2回（区間3つ − 1）');
}

console.log('\n■ 20:00〜翌04:00 だけを見る');
{
  const plan = ctx.buildNightPlan_(tl({ 平日: { 20: ['あ', 1000], 5: ['ごご5時', 9999] } }), DAY_TYPES);
  const names = plan['平日'].map(s => s.name);
  eq(names.indexOf('ごご5時'), -1, '05時台は、この道すじには入れない');
  eq(G('LR_NIGHT_HOURS').length, 9, '見るのは9つの時間帯（20〜04）');
  eq(G('LR_NIGHT_HOURS')[0], 20, '  はじめは20時台');
  eq(G('LR_NIGHT_HOURS')[8], 4, '  おわりは04時台');
}

console.log('\n■ 記録が無い時間帯も、抜け落ちさせない');
{
  const plan = ctx.buildNightPlan_(tl({ 平日: { 20: ['新地4', 12000], 23: ['梅田', 9000] } }), DAY_TYPES);
  const segs = plan['平日'];
  eq(segs.map(s => ctx.nightSpan_(s) + ':' + (s.name || '－')).join(' / '),
     '20時台:新地4 / 21〜22時台:－ / 23時台:梅田 / 00〜04時台:－',
     '記録が無いところは「－」の区間としてそのまま残る');
  eq(ctx.nightMoves_(segs), 1, '動く回数には、記録なしの区間を数えない');
  has(ctx.nightLine_(segs[1]), '記録なし', '文にすると「記録なし」と出る');
}

console.log('\n■ 1行の文にする');
{
  const plan = ctx.buildNightPlan_(tl({ 平日: { 20: ['新地4', 12345, 4, 18] } }), DAY_TYPES);
  const line = ctx.nightLine_(plan['平日'][0]);
  has(line, '20時台', '時間帯が入る');
  has(line, '新地4', '乗り場が入る');
  has(line, '￥12,345', '金額はカンマ付き');
  has(line, '待18分', '待ち時間も入る');
}

console.log('\n■ 同じ乗り場は、どの曜日区分でも同じ色');
{
  const plan = ctx.buildNightPlan_(tl({
    平日: { 20: ['新地4', 1000], 21: ['梅田', 1000] },
    土曜: { 20: ['梅田', 1000], 21: ['新地4', 1000] }
  }), DAY_TYPES);
  const c = ctx.nightColors_(plan, DAY_TYPES);
  eq(c['新地4'] !== c['梅田'], true, 'ちがう乗り場はちがう色');
  eq(typeof c['新地4'], 'string', '色が決まっている');
  eq(G('LR_PLAN_BG').every(x => /^#[0-9a-f]{6}$/.test(x)), true, '色はすべて #rrggbb の形');
  // 白地で読めるよう、どれも明るい色にしてある
  const bright = G('LR_PLAN_BG').every(x => {
    const r = parseInt(x.slice(1, 3), 16), g = parseInt(x.slice(3, 5), 16), b = parseInt(x.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 220;
  });
  eq(bright, true, 'どれも薄い色（黒い文字が読める）');
}

console.log('\n■ マス目のどこに何が入るか');
{
  const plan = ctx.buildNightPlan_(tl({ 平日: {
    20: ['新地4', 12000], 21: ['新地4', 12000], 23: ['梅田', 9000] } }), DAY_TYPES);
  const segs = plan['平日'];
  eq(ctx.nightAt_(segs, 20).name, '新地4', '20時台は新地4');
  eq(ctx.nightAt_(segs, 21).name, '新地4', '21時台も新地4（同じ区間）');
  eq(ctx.nightAt_(segs, 22).name, '', '22時台は記録なし');
  eq(ctx.nightAt_(segs, 23).name, '梅田', '23時台は梅田');
  eq(ctx.nightAt_(segs, 3).name, '', '03時台も記録なし');
  eq(ctx.nightAt_(segs, 20).from, 20, '区間のはじまりが分かる（金額はここにだけ出す）');
}

console.log('\n■ 記録が1件も無くても落ちない');
{
  const plan = ctx.buildNightPlan_(tl({}), DAY_TYPES);
  eq(Object.keys(plan).length, 4, '4つの曜日区分ぶん返る');
  eq(plan['平日'].length, 1, '  中身は「ぜんぶ記録なし」の1区間');
  eq(ctx.nightMoves_(plan['平日']), 0, '  動く回数は0');
  eq(ctx.buildNightPlan_({}, DAY_TYPES)['平日'].length, 1, 'finalTimeline が空でも落ちない');
  eq(ctx.buildNightPlan_(tl({}), []) && Object.keys(ctx.buildNightPlan_(tl({}), [])).length, 0,
     '曜日区分が空でも落ちない');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
