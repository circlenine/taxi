/**
 * LINEの絵（Flex）が、細い画面でも切れずに読めるかを確かめる。
 *   実行: node gas/test/flex.test.js
 *
 * ★なぜ、このテストが要るのか
 *   2026/10/16、時間の欄を「82ピクセル」と決め打ちで作りました。
 *   そこに「17:00〜21:00」を入れたので、入りきらずに
 *   「17:00〜…」と切れて届きました。まーく様の画面だけでなく、
 *   受け取る人 全員がそう見えます。
 *   入らないのは、作る前から分かることでした。防げたミスです。
 *
 * ★ここで見ているのは、置き場のいちばん上にある errand.json です。
 *   だいちゃんからのまとめを絵にして届けるとき、毎回ここを通ります。
 */
const fs = require('fs'), path = require('path');

let fail = 0;
const t = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fail++; };

const file = path.join(__dirname, '..', '..', 'errand.json');
if (!fs.existsSync(file)) {
  console.log('\n（いま届ける絵はありません。確かめるものがないので、ここは通します）');
  process.exit(0);
}
const j = JSON.parse(fs.readFileSync(file, 'utf8'));

if (j.do !== 'flex-note' || !j.flex) {
  console.log('\n（いまのおつかいは絵ではありません。ここは通します）');
  process.exit(0);
}

const flex = j.flex;
const all = [];
(function walk(x) {
  if (Array.isArray(x)) return x.forEach(walk);
  if (x && typeof x === 'object') { all.push(x); Object.keys(x).forEach(k => walk(x[k])); }
})(flex);

console.log('\n■ 細い画面でも、字が切れないこと');

/*
 * ★大きさを決め打ちしない。
 *   画面の広さは、機種によって違います。
 *   「82ピクセル」と決め打ちすると、字が入らない機種で切れます。
 *   割合（flex）で置けば、広さに合わせて伸び縮みします。
 */
const fixed = all.filter(x => x.width || x.height);
t(fixed.length === 0,
  '★★大きさを決め打ちしているところが無い（' +
  fixed.map(x => x.width || x.height).join(',') + '）');

/*
 * ★字は、かならず折り返す。
 *   折り返さない字は、入りきらないと「…」で切れます。
 */
const noWrap = all.filter(x => x.type === 'text' && !x.wrap);
t(noWrap.length === 0,
  '★★折り返さない字が無い（' + noWrap.map(x => String(x.text).slice(0, 12)).join('／') + '）');

console.log('\n■ 横いっぱいに出ること（横スクロールはしない）');
t(flex.size === 'giga', '★横はいちばん広い形（giga）');

console.log('\n■ 時間は2行で出すこと');
/*
 * ★「17:00〜21:00」を1行に入れると、細い画面で切れます。
 *   「17:00〜」と「21:00」の2行に分ければ、どの機種でも入ります。
 *   まーく様のご指示：「00:00〜／00:00 にもできるように」
 */
const rows = (flex.body && flex.body.contents || [])
  .filter(x => x.type === 'box' && x.layout === 'horizontal');
t(rows.length > 0, '時間の行がある（' + rows.length + '件）');

rows.forEach(function (r, i) {
  const left = r.contents[0], right = r.contents[1];
  const texts = (left.contents || []).filter(x => x.type === 'text');
  const name = (((right.contents || [])[0] || {}).text || '（名前なし）').slice(0, 14);
  t(texts.length === 2, '★' + name + '：時間が2行になっている');
  t(/〜$/.test(texts[0].text || ''), '　 1行目が「〜」で終わる（' + texts[0].text + '）');
  t((texts[0].text || '').length <= 7 && (texts[1] ? texts[1].text.length : 0) <= 7,
    '　 1行ぶんが短い（切れない長さ）');
  /*
   * ★左右は割合で分ける。
   *   左（時間）が広すぎると、右（中身）がやせて読みにくくなります。
   */
  t(left.flex > 0 && right.flex > 0, '　 左右を割合で分けている');
  t(left.flex < right.flex, '　 中身のほうを広くとっている');
});

console.log('\n■ だれが教えてくれた情報かが、題に出ること');
/*
 * ★まーく様のご指示（2026/10/16）：
 *   「だいちゃんが共有してくれてるので、1番上のタイトルには
 *     だいちゃん版 と付け加えてください」
 * ★教えてくれた人の名前は、メモの from に書きます。
 *   書いてあれば、題に「〇〇版」が入っていることを見ます。
 *   人からいただいた情報を、こちらの手柄のように出さないためです。
 */
const title = (((flex.header || {}).contents || [])[0] || {}).text || '';
if (j.from) {
  t(title.indexOf(j.from + '版') !== -1,
    '★★題に「' + j.from + '版」が入っている（' + title + '）');
  t(String(j.alt || '').indexOf(j.from + '版') !== -1,
    '　 一覧に出る文にも入っている');
} else {
  console.log('（教えてくれた人の控えが無いので、ここは見ません）');
}

console.log('\n■ LINEの決まりに収まること');
const len = JSON.stringify(flex).length;
t(len < 10000, '★1枚で 10,000文字まで（いま ' + len + '文字）');

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
