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

/**
 * finalTimeline を組み立てる。spots は { 時: [乗り場, 平均, 件数, 待ち] }
 * 件数を書かなければ3件（＝出せる最低ライン）にする
 */
function tl(spec) {
  const t = {};
  DAY_TYPES.forEach(dt => {
    t[dt] = {};
    HOURS.forEach(hr => {
      const v = (spec[dt] || {})[hr];
      t[dt][hr] = { best: v ? { name: v[0], avg: v[1], count: v[2] || 3, wait: v[3] || 0, max: 0, at: '' } : null,
                    worst: null };
    });
  });
  return t;
}

console.log('■ 同じ乗り場が続く時間は、1つにまとめる');
{
  const plan = ctx.buildNightPlan_(tl({ 平日: {
    20: ['新地4', 12000, 5, 20], 21: ['新地4', 10000, 3, 10], 22: ['新地4', 8000, 3, 15],
    23: ['梅田', 9000, 4, 12], 0: ['梅田', 9000, 3, 8],
    1: ['難波', 6000, 3], 2: ['難波', 6000, 3], 3: ['難波', 6000, 3], 4: ['難波', 6000, 3]
  } }), DAY_TYPES);
  const segs = plan['平日'];
  eq(segs.length, 3, '9つの時間帯が3つの区間になる');
  eq(ctx.nightSpan_(segs[0]), '20〜22時台', '1つめは 20〜22時台');
  eq(segs[0].name, '新地4', '  乗り場も正しい');
  eq(segs[0].count, 11, '  件数は足し合わせる');
  eq(segs[0].avg, Math.round((12000 * 5 + 10000 * 3 + 8000 * 3) / 11), '  平均は件数で重みづけする');
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
  has(line, '平均￥12,345', '金額は「平均￥」の形（カンマ付き）');
  has(line, '待ち平均18分', '待ち時間も「平均」と書く');
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

console.log('\n■ 狙い目の詳細時間（その区間でいちばん高かった乗車の時刻）');
{
  // 21時台に最高額が出た区間 → 狙い目はその時刻になる
  const t = tl({});
  t['平日'][20] = { best: { name: '新地4', avg: 10000, count: 3, wait: 20, max: 15000, at: '20:41' }, worst: null };
  t['平日'][21] = { best: { name: '新地4', avg: 12000, count: 3, wait: 10, max: 28000, at: '21:37' }, worst: null };
  t['平日'][22] = { best: { name: '新地4', avg: 9000,  count: 3, wait: 10, max: 9000,  at: '22:10' }, worst: null };
  const seg = ctx.buildNightPlan_(t, DAY_TYPES)['平日'][0];
  eq(seg.max, 28000, '区間でいちばん高かった額を持つ');
  eq(seg.at, '21:37', '  その時刻が狙い目になる（区間の先頭の時刻ではない）');
  eq(ctx.nightAim_(seg), '狙い目：[21:37]', '「狙い目：」を付けて、時刻は［］で囲む');

  const line = ctx.nightLine_(seg);
  has(line, '20〜22時台', '時間帯が入る');
  has(line, '新地4', '乗り場名が入る');
  has(line, '狙い目：[21:37]', '狙い目の詳細時間が入る（［］付き）');
  has(line, '最高￥28,000', '最高額も入る（狙い目の根拠）');
  has(line, '平均￥', '金額には「平均」と必ず書く（合計や最高額と取り違えないため）');
  eq(/(^|[^均高])￥/.test(line), false, '　何の金額か分からない「￥」は、1つも出さない');
  eq(ctx.nightAim_({ name: 'あ', at: '' }), '', '時刻が取れていなければ、何も出さない');
  eq(ctx.nightLine_({ from: 1, to: 2, name: '' }).indexOf('狙い目'), -1, '記録なしの区間には付けない');
}

console.log('\n■ 記録が少ない乗り場は「おすすめ」にしない');
// ★ここが今回いちばん大事。2件しかない乗り場を「おすすめ」と出していた。
//   たまたま高い1本があれば、それだけで1位になってしまう。
{
  const t = tl({});
  t['平日'][20] = { best: { name: 'ｺﾅﾝ像', avg: 18000, count: 2, wait: 5, max: 30000, at: '20:10' }, worst: null };
  t['平日'][21] = { best: { name: '新地4', avg: 9000,  count: 8, wait: 20, max: 15000, at: '21:30' }, worst: null };
  const segs = ctx.buildNightPlan_(t, DAY_TYPES)['平日'];

  const names = segs.map(s => s.name);
  eq(names.indexOf('ｺﾅﾝ像'), -1, '2件しかない乗り場は、道すじに出さない');
  eq(names.indexOf('新地4') !== -1, true, '8件ある乗り場は出す');
  eq(G('LR_NIGHT_MIN_N'), 3, '出す最低ラインは3件');

  // 3件あれば出す（ちょうど境目）
  const t2 = tl({});
  t2['平日'][20] = { best: { name: 'ｺﾅﾝ像', avg: 18000, count: 3, wait: 5, max: 30000, at: '20:10' }, worst: null };
  eq(ctx.buildNightPlan_(t2, DAY_TYPES)['平日'].map(s => s.name).indexOf('ｺﾅﾝ像') !== -1, true,
     'ちょうど3件なら出す');
}

console.log('\n■ 何件にもとづく数字かを、必ず出す');
{
  const t = tl({});
  t['平日'][20] = { best: { name: '新地4', avg: 9000, count: 8, wait: 20, max: 15000, at: '20:30' }, worst: null };
  const seg = ctx.buildNightPlan_(t, DAY_TYPES)['平日'][0];
  has(ctx.nightLine_(seg), '8件', '件数が入る（読む人が自分で確かめられるように）');
  has(ctx.nightLine_(seg), '平均￥9,000', '2件以上なら「平均」');
}

console.log('\n■ 1件しかないものを「平均」と呼ばない');
{
  const t = tl({});
  t['平日'][20] = { best: { name: '新地4', avg: 9000, count: 1, wait: 0, max: 9000, at: '20:30' }, worst: null };
  // 1件は そもそも出ない（3件未満）ので、呼び方だけを直接確かめる
  eq(ctx.nightMoneyLabel_({ count: 1 }), '売上', '1件なら「売上」');
  eq(ctx.nightMoneyLabel_({ count: 2 }), '平均', '2件以上なら「平均」');
  const one = { from: 20, to: 20, name: '新地4', count: 1, avg: 9000, wait: 0, max: 9000, at: '20:30' };
  has(ctx.nightLine_(one), '売上￥9,000', '文にも「売上」と出る');
  eq(ctx.nightLine_(one).indexOf('平均￥'), -1, '  「平均」とは書かない');
  eq(ctx.nightLine_(one).indexOf('最高￥'), -1, '  1件なら「最高」も書かない（同じ数字なので）');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
