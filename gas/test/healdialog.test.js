/**
 * 止まっているときに出る「なおすボタン」の箱を確かめる。
 *   実行: node gas/test/healdialog.test.js
 *
 * ★まーく様のご指示（2026/11/3）
 *   「Safari →【…】→【🚑】が そもそもできないので、
 *     別の手段がないか、考えられる全てのパターンで考えてください」
 *
 * ★メニューは iPhone では【…】に隠れ、作られるまで数秒かかります。
 *   走る前の忙しい時間に探させるのは、無理があります。
 *   だから「探させない」形にしました。
 *
 * ★ここで必ず確かめること
 *   ・動いているときは、ぜったいに出さない（毎回出ると ただの邪魔）
 *   ・止まっているときだけ出す
 *   ・ボタンを押したら、なおす係（fixAll）が動く
 *   ・箱が出せない機種でも、落ちない（帯とメニューが残る）
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const src = fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8');
const B = src.indexOf('function openHealHtml_()');
const E = src.indexOf('function onOpen()');
ok(B > 0 && E > B, '001-Code.gs に、箱を出す係がある');
const part = src.slice(B, E);

function build(o){
  o = o || {};
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ctx.INFO_TAB = '説明';
  ctx.OPEN_WARN_H = 3;
  // 本物の「最終更新」の読み取りを、そのまま使う
  vm.runInContext(src.slice(src.indexOf('function openStampAt_'),
                            src.indexOf('function openWarnIfStale_')), ctx);
  ctx.shown = [];
  ctx.HtmlService = { createHtmlOutput: h => {
    const o2 = { html: h, setWidth: () => o2, setHeight: () => o2 }; return o2;
  } };
  ctx.SpreadsheetApp = { getUi: () => {
    if (o.uiThrows) throw new Error('この機種では出せません');
    return { showModalDialog: (h, t) => { ctx.shown.push({ h: h.html, t: t }); } };
  } };
  vm.runInContext(part, ctx);
  const ss = { getSheetByName: n => (n === '説明' && !o.noTab ? {
    getRange: () => ({ getValue: () => (o.b1 === undefined ? '' : o.b1) })
  } : null) };
  return { ctx: ctx, ss: ss };
}

/*
 * ★テストの箱は世界標準時、本番は日本時間で動きます。
 *   「最終更新」の字から作る時刻も、箱の時刻で作られます。
 *   だから、くらべる「いま」も 同じ作り方（その場の時刻）にします。
 *   ここをずらすと、ぜんぶ「まだ止まっていない」で素通りします。
 */
const NOW = new Date(2026, 10, 3, 16, 0);   // 11/3 16:00（その場の時刻）

console.log('■ 動いているときは、ぜったいに出さない');
{
  const { ctx, ss } = build({ b1: '🔄最終更新：2026/11/03(火) 15:40' });
  ok(ctx.openHealDialog_(ss, NOW) === false, '★★20分前に動いていれば、出さない');
  ok(ctx.shown.length === 0, '★★★1つも出していない', ctx.shown.length);

  const b = build({ b1: '🔄最終更新：2026/11/03(火) 13:30' });   // 2時間半前
  ok(b.ctx.openHealDialog_(b.ss, NOW) === false, '2時間半前でも、まだ出さない');
}

console.log('■ 止まっているときだけ出す');
{
  const { ctx, ss } = build({ b1: '🔄最終更新：2026/11/03(火) 12:00' });  // 4時間前
  ok(ctx.openHealDialog_(ss, NOW) === true, '★4時間 止まっていれば、出す');
  ok(ctx.shown.length === 1, '1つだけ出す', ctx.shown.length);
  ok(ctx.shown[0].t.indexOf('止まっています') !== -1, '題で、止まっていると分かる', ctx.shown[0].t);

  const h = ctx.shown[0].h;
  ok(h.indexOf('いますぐ なおす') !== -1, '★★大きなボタンが1つ');
  ok(h.indexOf('.fixAll();') !== -1, '★★★押したら、なおす係が動く');
  ok(h.indexOf('withFailureHandler') !== -1, 'しくじったときも、黙らずに出す');
  ok(h.indexOf('1回だけ押して') !== -1, '何をすればよいかが、1行で分かる');
  ok(h.indexOf('<button') !== -1, '押すものが、ちゃんとボタン');
}

console.log('■ 出せない機種でも、落ちない（帯とメニューが残る）');
{
  const { ctx, ss } = build({ b1: '🔄最終更新：2026/11/03(火) 12:00', uiThrows: true });
  ok(ctx.openHealDialog_(ss, NOW) === false, '落ちずに false を返す');
}

console.log('■ 読めないときは、出さない（出しっぱなしで うるさくしない）');
{
  const a = build({ b1: '' });
  ok(a.ctx.openHealDialog_(a.ss, NOW) === false, '最終更新が空なら、出さない');
  const b = build({ b1: 'なにか別の字' });
  ok(b.ctx.openHealDialog_(b.ss, NOW) === false, '時刻が読めなければ、出さない');
  const c = build({ noTab: true });
  ok(c.ctx.openHealDialog_(c.ss, NOW) === false, '説明タブが無くても、落ちない');
  const d = build({ b1: '🔄最終更新：2026/11/03(火) 12:00' });
  ok(d.ctx.openHealDialog_(null, NOW) === false, 'スプシが無くても、落ちない');
}

console.log('■ 開いたときに、ちゃんと呼んでいるか');
{
  const o = src.slice(src.indexOf('function onOpen()'), src.indexOf('function onOpen()') + 2500);
  ok(/openHealDialog_\(/.test(o), '★開いた瞬間に、箱を出しにいく');
  ok(/openWarnIfStale_\(/.test(o), '　帯のほうも、そのまま残っている');
  ok(o.indexOf('openHealDialog_') > o.indexOf('openWarnIfStale_'),
     '帯を出してから、箱を出す（帯は箱を閉じたあとも残る）');
}

console.log('■ 見分け方は、帯と同じ（2か所で食いちがわせない）');
{
  ok(/OPEN_WARN_H/.test(part), '★同じ決まり（OPEN_WARN_H）を見ている');
  ok(/openStampAt_\(/.test(part), '★同じ読み取り（最終更新）を使っている');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
