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

console.log('\n■ 時間は〈クルマを着ける時刻〉であること（いちばん大事）');
/*
 * ★2026/10/16、まーく様に言われたことです。
 *   「大阪城ホールは終演予定時間に行かなければタクシー需要ないのに
 *     開始時間に向かってどうするんですか」
 *
 *   開演18:30・終演21:00〜21:30 の公演に「18:30〜」と書いて出しました。
 *   18:30 は客が入っていく時刻です。乗務員が行くべきなのは、
 *   客が出てくる時刻です。まるで逆のことを案内していました。
 *   これは見た目の不具合ではなく、資料の中身そのものの誤りです。
 *   1日の売上がまるで変わります。
 *
 * ★だから、ここでは「形」ではなく「中身」を見ます。
 *   本文に「開演HH:MM」と書いてあるのに、その時刻が
 *   左の時間欄に出ていたら、また同じ誤りです。落とします。
 */
const rows = (flex.body && flex.body.contents || [])
  .filter(x => x.type === 'box' && x.layout === 'horizontal');
t(rows.length > 0, '時間の行がある（' + rows.length + '件）');

const textsOf = b => {
  const out = [];
  (function w(x) {
    if (Array.isArray(x)) return x.forEach(w);
    if (x && typeof x === 'object') {
      if (x.type === 'text') out.push(String(x.text || ''));
      Object.keys(x).forEach(k => w(x[k]));
    }
  })(b);
  return out;
};

rows.forEach(function (r) {
  const left = r.contents[0], right = r.contents[1];
  const lt = textsOf(left), rt = textsOf(right);
  const name = (rt[0] || '（名前なし）').slice(0, 14);

  // ★★ここが本体。開演時刻を、着け時刻のところに出していないか
  const opens = (rt.join(' ').match(/開演\s*(\d{1,2}:\d{2})/g) || [])
    .map(x => x.replace(/^開演\s*/, ''));
  const leftJoined = lt.join(' ');
  opens.forEach(function (hm) {
    t(leftJoined.indexOf(hm) === -1,
      '★★★' + name + '：開演（' + hm + '）を 着ける時刻にしていない');
  });

  // 時間欄は2〜3行（3行目は「目安」などの札）。1行だと時刻が切れる
  t(lt.length >= 2 && lt.length <= 3, '★' + name + '：時間は2〜3行');
  lt.forEach(x => t(x.length <= 7, '　 「' + x + '」が短い（切れない長さ）'));

  // 左右は割合で分ける。中身のほうを広くとる
  t(left.flex > 0 && right.flex > 0, '　 左右を割合で分けている');
  t(left.flex < right.flex, '　 中身のほうを広くとっている');

  // ★何を根拠にした時刻なのかが、かならず書いてあること
  t(rt.length >= 3, '　 根拠と動きが書いてある');
});

/*
 * ★読む人が「開演時刻だ」と取り違えないよう、絵の中に断り書きを置く。
 *   注釈は読まれない、が決まりだが、これは注釈ではなく見出しに近い。
 *   いちばん上に、色を変えて置く。
 */
const allText = textsOf(flex).join(' ');
t(allText.indexOf('着ける時刻') !== -1,
  '★★絵の中に「着ける時刻」と断ってある（取り違えを防ぐ）');
t(allText.indexOf('開演時刻ではありません') !== -1,
  '★★「開演時刻ではありません」と書いてある');

console.log('\n■ あやしい時刻を、言い切っていないこと');
/*
 * ★終演や閉園が公式に出ていないものは、言い切らない。
 *   言い切れば、それを信じて動いた人が空振りします。
 *   「未発表」「未確認」と書いたうえで、灰色（目安）にする。
 */
rows.forEach(function (r) {
  const rt = textsOf(r.contents[1]).join(' ');
  const lt = textsOf(r.contents[0]);
  const name = (textsOf(r.contents[1])[0] || '').slice(0, 14);
  const unsure = /未発表|未確認|確かめられ|出ていません/.test(rt);
  if (unsure) {
    t(lt.indexOf('目安') !== -1,
      '★★' + name + '：確かでない時刻には「目安」と出している');
  }
});

console.log('\n■ 教えてもらった文を、1つも消していないこと');
/*
 * ★2026/10/16、まーく様に言われたことです。
 *   「なんで城ホール情報消えてるんですか…意味がわかりません…」
 *
 *   公式に裏が取れないものを「書かない」ほうへ倒して、
 *   だいちゃんが書いた「終演21:00〜21:30」などを消しました。
 *   裏が取れないことと、消してよいことは、別です。
 *   消すのではなく、**足す**のが正しいやり方でした。
 *   （CLAUDE.md「指示されていないものを、勝手に消さない」）
 *
 * ★だから、教えてもらった文は メモの said に控えておき、
 *   絵の中に1つ残らず入っているかを、ここで見ます。
 */
if (Array.isArray(j.said) && j.said.length) {
  const whole = textsOf(flex).join('\n');
  let lost = 0;
  j.said.forEach(function (line) {
    const ok = whole.indexOf(line) !== -1;
    if (!ok) lost++;
    t(ok, '★★★消していない：「' + line.slice(0, 24) + '」');
  });
  t(lost === 0, '★★★教えてもらった文は、' + j.said.length + '件ぜんぶ残っている');
} else {
  console.log('（教えてもらった文の控えがありません。ここは見ません）');
}

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

console.log('\n■ 注意書きと根拠が、下に入っていること');
/*
 * ★まーく様のご指示（2026/10/16）：
 *   「時間はあくまで目安、というのもしっかり注意書きとして、
 *     下側にいつものように書いてください
 *     AIによる〜というのもしっかり載せてください
 *     注意書きに、しっかり根拠も載せられるなら載せてください」
 *
 * ★言い回しは、毎日のお知らせ（VN_NOTE_LINES）と同じにします。
 *   2つの言い方があると、読む人が別のものだと思ってしまいます。
 */
const foot = textsOf(flex.footer || {}).join('\n');
t(foot.indexOf('目安') !== -1, '★★下に「時間は あくまで目安」と書いてある');
t(foot.indexOf('AIの読み取り') !== -1, '★★下に「AIの読み取りです」と書いてある');
t(foot.indexOf('前後・延長・中止') !== -1, '　 変更がありうることも書いてある');
t(foot.indexOf('公式ページでご確認') !== -1, '★★「公式ページでご確認を」と書いてある');
t(foot.indexOf('【根拠】') !== -1, '★★根拠が書いてある');
const kyo = foot.split('【根拠】')[1] || '';
t((kyo.match(/・/g) || []).length >= 4,
  '★根拠が4つ以上ある（' + (kyo.match(/・/g) || []).length + '件）');
t(kyo.indexOf('だいちゃん') !== -1, '　 だいちゃんの共有だと分かる');
t(kyo.indexOf('裏は取れません') !== -1, '　 裏の取れないものは、そう書いてある');

console.log('\n■ LINEの決まりに収まること');
const len = JSON.stringify(flex).length;
t(len < 10000, '★1枚で 10,000文字まで（いま ' + len + '文字）');

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
