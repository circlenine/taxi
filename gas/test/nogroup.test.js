/**
 * お守りの知らせが、グループへ絶対に出ないことを確かめる。
 *   実行: node gas/test/nogroup.test.js
 *
 * ★まーく様のご指示（2026/11/9）
 *   「これをグループの方へ送るのは絶対やめてください
 *     こういう系は全て、lineを通さないとならないなら
 *     公式line→ぼくの個人lineのみにしてください」
 *
 * ★「お守りの知らせ」＝ 仕組みの調子の話です。
 *   ・読めていない会場があります
 *   ・ホテルの予定表が届いていません
 *   乗務員の方々には何の関係もなく、流れれば まーく様が恥をかきます。
 *
 * ★止め方は2つ重ねてあります。どちらも、ここで確かめます。
 *   ① 控えに残さない（グループへ送るボタンは、控えを送るため）
 *   ② グループへ出す直前に、もう一度ふるい落とす
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
const B = src.indexOf('const VN_ADMIN_HEADS');
const E = src.indexOf('function vnShareSave_');
ok(B > 0 && E > B, '006-Venue.gs に、ふるいの係がある');

const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src.slice(B, E), ctx);
// グループへ出す直前のふるいも読む
const S = src.indexOf('function vnShareStrip_');
vm.runInContext(src.slice(S, src.indexOf('\n}', S) + 2), ctx);

/* まーく様に届いた、実際の中身（2026/11/9 05:01） */
const DEAD = { type: 'text', text:
  '⚠️ 読めていない会場があります\n・インテックス大阪　一度も読めていません（25日）\n' +
  '・クロちゃんに、この行をそのまま伝えてください' };
const HOTEL = { type: 'text', text:
  '🏨 ホテルの予定表が届いていません\n・帝国ホテル　40日前のぶんが最後です\n' +
  '・「🏨」と送ってから、予定表の写真を送ってください' };
const FLEX = { type: 'flex', altText: 'きょうのイベント', contents: { body: {} } };

console.log('■ お守りの知らせを、ちゃんと見分ける');
{
  ok(ctx.vnIsAdminMsg_(DEAD) === true,  '★★読めていない会場 → お守りの知らせ');
  ok(ctx.vnIsAdminMsg_(HOTEL) === true, '★★ホテルの予定表 → お守りの知らせ');
  ok(ctx.vnIsAdminMsg_(FLEX) === false, '★イベントの絵は、ふつうの知らせ（落とさない）');
  ok(ctx.vnIsAdminMsg_({ type: 'text', text: 'きょうは大阪城ホールです' }) === false,
     '★ふつうの文は、落とさない');
  ok(ctx.vnIsAdminMsg_(null) === false, 'からっぽでも落ちない');
  ok(ctx.vnIsAdminMsg_({ type: 'text' }) === false, '文が無くても落ちない');
}

console.log('■ ① 控えに残さない');
{
  const kept = ctx.vnDropAdminMsgs_([FLEX, DEAD, HOTEL]);
  ok(kept.length === 1 && kept[0] === FLEX, '★★お守りの知らせを抜いて、絵だけ残す', kept.length);
  ok(ctx.vnDropAdminMsgs_([DEAD, HOTEL]) === null,
     '★★★お守りの知らせだけなら、控えそのものを作らない');
  ok(ctx.vnDropAdminMsgs_(DEAD) === null, '1つだけのときも、落とす');
  ok(ctx.vnDropAdminMsgs_(FLEX) === FLEX, '絵1つのときは、そのまま');
}

console.log('■ ② グループへ出す直前の、最後のふるい');
{
  ok(ctx.vnShareStrip_(DEAD) === null,  '★★★読めていない会場は、送らない');
  ok(ctx.vnShareStrip_(HOTEL) === null, '★★★ホテルの予定表は、送らない');
  const f = ctx.vnShareStrip_(FLEX);
  ok(f && f.type === 'flex', '★イベントの絵は、ちゃんと通る', f && f.type);
}

console.log('■ 送るところが、落としたものを捨てているか');
{
  /*
   * ★ふるいが null を返すので、そのまま送ると LINE に弾かれます。
   *   捨てる（filter）ところまで書いてあるかを見ます。
   */
  const pg = src.slice(src.indexOf('function panelShareGo'),
                       src.indexOf('function vnShareStrip_'));
  ok(/vnShareStrip_\(x\); \}\)\s*\n\s*\.filter/.test(pg) || /\.filter\(function \(x\) \{ return !!x; \}\)/.test(pg),
     '★スプシのボタン：落としたものを捨てている');
  ok(/グループへ出すものがありませんでした/.test(pg),
     '★1つも残らなければ、送らない');

  const fg = src.slice(src.indexOf('q.vn === "flexgo"'));
  const fg2 = fg.slice(0, 2500);
  ok(/\.filter\(function \(x\) \{ return !!x; \}\)/.test(fg2),
     '★LINEのボタン：落としたものを捨てている');
  ok(/グループへ出すものがありませんでした/.test(fg2),
     '★1つも残らなければ、送らない');
}

console.log('■ 控えを作るところが、ふるいを通しているか');
{
  const ss = src.slice(src.indexOf('function vnShareSave_'),
                       src.indexOf('function vnShareSave_') + 900);
  ok(/vnDropAdminMsgs_\(msgIn\)/.test(ss), '★★控えを作る前に、ふるいを通す');
  ok(/if \(!msg\) return "";/.test(ss), '★全部 落ちたら、控えを作らない');
}

console.log('■ 新しいお守りの知らせを足したときの、取りこぼし防止');
{
  ok(/VN_ADMIN_HEADS/.test(src), '書き出しの字を、1か所にまとめてある');
  const heads = vm.runInContext('VN_ADMIN_HEADS', ctx);
  ok(heads.length >= 2, '少なくとも、今回の2つは入っている', heads.length);
  ok(heads.some(h => DEAD.text.indexOf(h) === 0), '読めていない会場が入っている');
  ok(heads.some(h => HOTEL.text.indexOf(h) === 0), 'ホテルの予定表が入っている');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
