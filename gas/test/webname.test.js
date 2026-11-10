/**
 * 記録を「だれの名義で入れるか」を確かめる（web/app.js）。
 *   実行: node gas/test/webname.test.js
 *
 * ★なぜ、このテストが要るのか（2026/11/10）
 *   スプシの人ごとのタブの名前は、半角カナです（ﾀﾞｲｽｹ・ｼｭﾝ・ﾏｰｸ）。
 *   台帳に入っている名前は、全角です（ダイスケ・シュン・マーク）。
 *   この2つを結びつける係がこわれていて、
 *   **ほとんどの記録が「取り込んだ人」の名義で入る**ところでした。
 *   売上が人ごとに狂います。いちばん重い間違いです。
 *
 *   こわれていた理由は3つ。
 *     ・濁点（ﾀﾞ）が、1文字にまとまっていなかった
 *     ・小さい字（ｭ）が、直っていなかった
 *     ・長音（ｰ）が、直っていなかった
 */
const fs = require('fs'), path = require('path');

let fail = 0;
const ok = (c, m, got) => {
  if (c) console.log('ok   ' + m);
  else { fail++; console.log('FAIL ' + m + (got === undefined ? '' : '　→ ' + JSON.stringify(got))); }
};

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'web', 'app.js'), 'utf8');
const a = src.indexOf('/* --nkey-start--');
const b = src.indexOf('/* --nkey-end-- */');
ok(a !== -1 && b > a, '★名前をそろえる係が、ちゃんと見つかる');
if (a === -1 || b <= a) { console.log('\n☓ 1件 こけました'); process.exit(1); }

const body = src.slice(src.indexOf('v =>', a), b).trim().replace(/;\s*$/, '');
const nkey = eval('(' + body + ')');

/* スプシのタブ名（半角カナ） ↔ 台帳の名前（全角） */
console.log('■ スプシのタブ名と、台帳の名前が結びつく');
[
  ['ﾀﾞｲｽｹ', 'ダイスケ', '★★★濁点（ﾀﾞ）が、1文字にまとまる'],
  ['ｼﾞﾝ',   'ジン',     '★★★濁点（ｼﾞ）も同じ'],
  ['ｼｭﾝ',   'シュン',   '★★★小さい字（ｭ）が直る'],
  ['ﾏｰｸ',   'マーク',   '★★★長音（ｰ）が直る'],
  ['ｶｲﾄ',   'カイト',   '　 ふつうのカナ'],
  ['ｱﾅﾙ',   'アナル',   '　 ふつうのカナ'],
  ['ﾊﾟﾊﾟ',  'パパ',     '　 半濁点（ﾊﾟ）も直る']
].forEach(([h, z, msg]) => ok(nkey(h) === nkey(z), msg, [nkey(h), nkey(z)]));

console.log('■ 別の人を、同じ人だと思わない');
ok(nkey('ﾀﾞｲｽｹ') !== nkey('ﾀｲｽｹ'),
   '★★★濁点のある・なしは、別の名前（まとめると人を取りちがえる）');
ok(nkey('マーク') !== nkey('カイト'), '　 ちがう名前は、ちがうまま');

console.log('■ 空っぽでも落ちない');
ok(nkey('') === '', '　 空');
ok(nkey(null) === '', '　 何も渡されない');
ok(nkey(undefined) === '', '　 未設定');
ok(nkey('  マ ーク  ') === nkey('マーク'), '　 すき間は気にしない');

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
