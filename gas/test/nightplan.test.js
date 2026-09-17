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
  /*
   * ★00〜03時台は、ほかの時間と ひとくくりにしない（まーくさんのご指示）。
   *   前は「01〜04時台 難波」と4時間をまとめていた。
   *   まとめると その4時間の平均が1つの数字になり、
   *   01時に行けばよいのか03時に行けばよいのかが分からない。
   *   深夜は1時間ごとに動きがまるで違うので、いちばん知りたいところが消えていた
   */
  eq(ctx.nightSpan_(segs[0]), '20〜22時台', '★20〜22時台は、これまでどおり1つにまとまる');
  eq(segs[0].name, '新地4', '  乗り場も正しい');
  eq(segs[0].count, 11, '  件数は足し合わせる');
  eq(segs[0].avg, Math.round((12000 * 5 + 10000 * 3 + 8000 * 3) / 11), '  平均は件数で重みづけする');
  eq(segs[0].wait, 15, '  待ち時間は区間の平均');
  eq(ctx.nightSpan_(segs[1]), '23時台', '★23時台は、00時台とまとめない');
  const spans = segs.map(x => ctx.nightSpan_(x));
  ['00時台', '01時台', '02時台', '03時台'].forEach(function (sp) {
    eq(spans.indexOf(sp) !== -1, true, '★' + sp + 'は、それだけで1行になる');
  });
  eq(spans.filter(x => /〜/.test(x) && /0[0-3]時台$/.test(x)).length, 0,
     '★「01〜04時台」のような、深夜をまたぐまとめ方はしない');
  eq(segs.filter(x => x.from === 4).length, 1, '  04時台も1行ある');
  // 1時間ずつなので、その時間の件数・平均がそのまま出る
  const s01 = segs.filter(x => x.from === 1)[0];
  eq(s01.name, '難波', '  01時台の乗り場');
  eq(s01.count, 3, '★01時台の件数が、そのまま出る');
  eq(s01.avg, 6000, '★01時台の平均が、そのまま出る');
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
  has(ctx.nightLine_(segs[1]), 'データ不足（3件以上で表示）', '文にすると「データ不足（3件以上で表示）」と出る（言い方は全部これひとつ）');
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

console.log('\n■ 記録が少ない乗り場は、数字は出すが「おすすめ」にはしない');
// ★2件しかない乗り場を「おすすめ」と出していたのが、そもそもの間違い。
//   たまたま高い1本があれば、それだけで1位になってしまう。
//   かといって丸ごと消すと、01〜03時台のように記録の薄い時間が空欄になり、
//   「その時間は走れない」と読めてしまう。それもうそになる。
//   出すが、データ不足だと断る。そして軸には据えない。
{
  const t = tl({});
  t['平日'][20] = { best: { name: 'ｺﾅﾝ像', avg: 18000, count: 2, wait: 5, max: 30000, at: '20:10' }, worst: null };
  t['平日'][21] = { best: { name: '新地4', avg: 9000,  count: 8, wait: 20, max: 15000, at: '21:30' }, worst: null };
  const segs = ctx.buildNightPlan_(t, DAY_TYPES)['平日'];

  const konan = segs.find(s => s.name === 'ｺﾅﾝ像');
  eq(!!konan, true, '2件しかない乗り場も、数字は出す（隠さない）');
  eq(konan && konan.thin, true, '  ただし「データ不足」の印が付く');
  has(ctx.nightLine_(konan), 'データ不足（3件以上で表示）', '  文にも必ずそう書く');
  has(ctx.nightLine_(konan), '狙い目：[20:10]', '  狙い目の時刻は出す（抜け落ちさせない）');
  has(ctx.nightLine_(konan), '平均￥18,000', '  平均も出す');

  const shinchi = segs.find(s => s.name === '新地4');
  eq(!!shinchi, true, '8件ある乗り場は、そのまま出す');
  eq(shinchi && !shinchi.thin, true, '  こちらには印が付かない');
  eq(G('LR_NIGHT_MIN_N'), 3, 'おすすめにする最低ラインは3件');

  // ★いちばん大事なところ。18,000円のほうが高いが、2件なので軸にはしない
  const head = ctx.nightHeadline_(segs);
  has(head, '新地4', '軸は、記録が十分にあるほうにする');
  eq(head.indexOf('ｺﾅﾝ像'), -1, '2件しかない乗り場を「軸は」と言い切らない');

  // 3件あれば、ふつうに出す（ちょうど境目）
  const t2 = tl({});
  t2['平日'][20] = { best: { name: 'ｺﾅﾝ像', avg: 18000, count: 3, wait: 5, max: 30000, at: '20:10' }, worst: null };
  const s2 = ctx.buildNightPlan_(t2, DAY_TYPES)['平日'].find(s => s.name === 'ｺﾅﾝ像');
  eq(!!s2 && !s2.thin, true, 'ちょうど3件なら、印は付かない');

  // 同じ乗り場でも、確かなぶんと データ不足のぶんは、ひとつにまとめない
  const t3 = tl({});
  t3['平日'][20] = { best: { name: '梅田', avg: 9000, count: 8, wait: 20, max: 15000, at: '20:30' }, worst: null };
  t3['平日'][21] = { best: { name: '梅田', avg: 9000, count: 1, wait: 20, max: 15000, at: '21:30' }, worst: null };
  const s3 = ctx.buildNightPlan_(t3, DAY_TYPES)['平日'].filter(x => x.name === '梅田');
  eq(s3.length, 2, '確かなぶんと データ不足のぶんは、別の区間として出す');
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


console.log('\n■ 記録が無い深夜は、まとめてよい');
{
  /*
   * ★1行ずつにするのは「記録があるところ」だけ。
   *   記録の無い時間まで1行ずつにすると、「00時台：－」「01時台：－」…と、
   *   何も言っていない行が4行も並ぶ。それは ただ読みにくいだけ
   */
  const plan = ctx.buildNightPlan_(tl({ 平日: { 20: ['新地4', 12000, 5] } }), DAY_TYPES);
  const segs = plan['平日'];
  const empty = segs.filter(x => !x.name);
  eq(empty.length, 1, '★記録が無いところは、まとめて1つの区間のまま');
  eq(ctx.nightSpan_(empty[0]), '21〜04時台', '  「21〜04時台」とひとまとめ');

  // 記録があるところは、これまでどおり1時間ずつ
  const plan2 = ctx.buildNightPlan_(tl({ 平日: {
    0: ['難波', 6000, 3], 1: ['難波', 6000, 3], 2: ['難波', 6000, 3]
  } }), DAY_TYPES);
  const named = plan2['平日'].filter(x => x.name).map(x => ctx.nightSpan_(x));
  eq(named, ['00時台', '01時台', '02時台'], '★記録があるところは、1時間ずつ別の行');

  // 20〜22時台のような、深夜でないところは これまでどおりまとまる
  const plan3 = ctx.buildNightPlan_(tl({ 平日: {
    20: ['新地4', 9000, 3], 21: ['新地4', 9000, 3], 22: ['新地4', 9000, 3]
  } }), DAY_TYPES);
  eq(ctx.nightSpan_(plan3['平日'].filter(x => x.name)[0]), '20〜22時台',
     '★深夜でない時間は、これまでどおり1つにまとまる');

  // どの時間を1行ずつにするかは、1か所で決めてある
  eq(G('LR_NIGHT_SOLO'), [0, 1, 2, 3], '★1行ずつにするのは 00〜03時台');
  eq(ctx.lrNightSolo_(0), true, '  00時台は1行ずつ');
  eq(ctx.lrNightSolo_(3), true, '  03時台も1行ずつ');
  eq(ctx.lrNightSolo_(4), false, '  04時台は、まとめてよい');
  eq(ctx.lrNightSolo_(23), false, '  23時台も、まとめてよい');
  eq(ctx.lrNightSolo_(null), false, 'null でも落ちない');
}

console.log('\n■ コナン像前は、一晩の流し方に出さない');
{
  /*
   * ★まーくさんからのご指示。
   *   一晩の流し方は「この順に流してください」という道すじなので、
   *   ここに出すことは「そこへ行ってください」と言うことになる。
   *   数字そのもの（個別の乗り場の表・ヒートマップ）は消さない
   */
  eq(ctx.lrNightNg_('コナン像前'), true, '★コナン像前は、道すじに出してはいけない');
  eq(ctx.lrNightNg_('コナン像'), false, '  ちがう書き方は、そのままでは当たらない');
  eq(ctx.lrNightNg_('新地4'), false, 'ふつうの乗り場は、これまでどおり出す');
  eq(ctx.lrNightNg_(''), false, '空でも落ちない');
  eq(ctx.lrNightNg_(null), false, 'null でも落ちない');

  // ① 1位がコナン像前でも、道すじには出さない
  const t1 = tl({ 平日: { 20: ['コナン像前', 20000, 9], 21: ['新地4', 9000, 5] } });
  const p1 = ctx.buildNightPlan_(t1, DAY_TYPES)['平日'];
  eq(p1.filter(s => s.name === 'コナン像前').length, 0,
     '★1位がコナン像前でも、道すじには1つも出さない');
  eq(p1.filter(s => s.name === '新地4').length, 1, '  ほかの乗り場は、これまでどおり出る');

  /*
   * ② 2位以下にちゃんとした乗り場があるなら、そちらを出す。
   *    1位を消すだけだと、その時間帯がまるごと空欄になり
   *    「その時間は走れない」と読めてしまう
   */
  const t2 = tl({ 平日: { 22: ['新地4', 9000, 5] } });
  t2['平日'][22].night = { name: '新地4', avg: 9000, count: 5, wait: 0, max: 0, at: '' };
  t2['平日'][22].best  = { name: 'コナン像前', avg: 20000, count: 9, wait: 0, max: 0, at: '' };
  const p2 = ctx.buildNightPlan_(t2, DAY_TYPES)['平日'];
  const s22 = p2.filter(s => s.from <= 22 && s.to >= 22 && s.name)[0];
  eq(s22 ? s22.name : '', '新地4', '★コナン像前を外したあとの1位（2位の乗り場）を出す');

  // ③ 道すじ用の選び直しが無い古い形でも、最後の関所で外す
  const t3 = tl({ 平日: { 23: ['コナン像前', 20000, 9] } });
  const p3 = ctx.buildNightPlan_(t3, DAY_TYPES)['平日'];
  eq(p3.filter(s => s.name === 'コナン像前').length, 0,
     '★選び直しが無い形でも、最後の関所で必ず外す');
}

console.log('\n■ 一晩の流し方の1行は、大事なところだけ太字にする');
{
  /*
   * ★ぜんぶ同じ細さの字だと、どこが大事なのか分からない（まーくさんのご指示）。
   *   大事なのは ①乗り場名 ②狙い目の時刻 ③平均金額 ④（最高￥〇）の4つ
   */
  const R = ctx.nightRichParts_;
  const seg = { from: 23, to: 23, name: '新地7', count: 5, avg: 4150, max: 5700,
                wait: 27, at: '23:57', thin: false };
  const p = R(seg);
  const txt = p.map(x => x.t).join('');
  const bold = p.filter(x => x.b).map(x => x.t);

  eq(txt.indexOf('23時台') === 0, true, '時間帯から始まる');
  eq(bold.some(t => t.indexOf('新地7') !== -1), true, '★乗り場名は太字');
  eq(bold.some(t => t.indexOf('狙い目：[23:57]') !== -1), true, '★狙い目の時刻も太字');
  eq(bold.some(t => t.indexOf('平均￥4,150') !== -1), true, '★平均金額も太字');
  eq(bold.some(t => t.indexOf('（最高￥5,700）') !== -1), true,
     '★最高金額は、平均のすぐうしろに（ ）で添えて太字');
  // 並び順（乗り場名 → 狙い目 → 平均 → （最高））
  eq(txt.indexOf('新地7') < txt.indexOf('狙い目'), true, '★乗り場名 → 狙い目 の順');
  eq(txt.indexOf('狙い目') < txt.indexOf('平均￥'), true, '★狙い目 → 平均金額 の順');
  eq(txt.indexOf('平均￥') < txt.indexOf('（最高'), true, '★平均金額 → （最高￥〇）の順');

  // 件数・待ち時間は、細い字のまま（全部太字にすると太字の意味が無くなる）
  eq(p.filter(x => x.b).some(t => String(t.t).indexOf('件') !== -1 && String(t.t).indexOf('狙い目') === -1), false,
     '★件数は、太字にしない');
  eq(p.filter(x => x.b).some(t => String(t.t).indexOf('待ち平均') !== -1), false,
     '★待ち時間も、太字にしない');
  eq(txt.indexOf('5件') !== -1, true, '  でも、件数はちゃんと出す');
  eq(txt.indexOf('待ち平均27分') !== -1, true, '  待ち時間も出す');

  // 色が付いていること（どこが何の数字かを、色でも分ける）
  eq(new Set(p.filter(x => x.b).map(x => x.c)).size >= 3, true,
     '★太字のところは、色でも見分けられる');

  // 1件しかないときは「平均」と呼ばない／「最高」も出さない（同じ数字なので）
  const one = R({ from: 1, to: 1, name: 'ドン15', count: 1, avg: 1250, max: 1250,
                  wait: 0, at: '01:11', thin: true });
  const t1 = one.map(x => x.t).join('');
  eq(t1.indexOf('売上￥1,250') !== -1, true, '★1件なら「売上」（1件の平均は平均ではない）');
  eq(t1.indexOf('平均￥'), -1, '  「平均」とは書かない');
  eq(t1.indexOf('（最高'), -1, '★1件なら「最高」も出さない（同じ数字なので）');
  eq(t1.indexOf('データ不足') !== -1, true, '  記録が薄いことは、必ず断る');

  // 乗り場が決まらない時間帯
  const none = R({ from: 20, to: 20, name: '', count: 0, avg: 0, max: 0, wait: 0, at: '', thin: false });
  eq(none.map(x => x.t).join('').indexOf('データ不足') !== -1, true, '記録が無ければ、そう書く');
  eq(none.some(x => x.b), false, '  そのときは、太字にするものが無い');

  // ★作っただけで、使っていなければ意味がない。使っているところも見る
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '003-LineReport.gs'), 'utf8');
  eq(src.indexOf('nightRichParts_(x).forEach') !== -1, true,
     '★まとめスプシの【平日】【金曜】の行で、ちゃんと使っている');
  /*
   * ★「軸は」は、出す文からは消えていること。
   *   （履歴や説明の中に「前はこう書いていた」と残っているのは、消さなくてよい）
   */
  eq(/"軸は/.test(src) || /'軸は/.test(src) || /\[\s*"軸は/.test(src), false,
     '★出す文に「軸は」は、もう使っていない');
  eq(src.indexOf('"いちばん稼げているのは ') !== -1, true,
     '  代わりに「いちばん稼げているのは」と書く');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
