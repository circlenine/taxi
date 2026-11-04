/**
 * まるごと救助（rescueAll）を確かめる。
 *   実行: node gas/test/rescue.test.js
 *
 * ★まーく様のご指示（2026/11/4）
 *   「今後は全てこのメッセージで指示すれば、
 *     完全に修復可能な状態な仕組みづくりにしてください」
 *
 * ★それが成り立つ条件は、たった1つです。
 *   救助のときに「**新しい中身を取り込む**」こと。
 *   ここが抜けると、こちらが何を直しても 永久に届きません。
 *   だから、そこをいちばん厚く確かめます。
 *
 * ★もう1つ大事なのは「1か所こけても、残りを続ける」ことです。
 *   救助が途中で止まると、まーく様はもう一度 指を動かすことになります。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
const B = src.indexOf('function rescueAll()');
const E = src.indexOf('const DOOR_FILE');
ok(B > 0 && E > B, '005-Updater.gs に、まるごと救助がある');
const part = src.slice(B, src.lastIndexOf('}', E) + 1);

function build(o){
  o = o || {};
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ctx.done = [];
  ctx.fixAll = () => {
    ctx.done.push('fix');
    if (o.fixThrows) throw new Error('見張りが立てられません');
    return '✅ 見張りを入れ直した';
  };
  ctx.updAutoPull_ = () => {
    ctx.done.push('pull');
    if (o.pullThrows) throw new Error('GitHubが読めません');
    return o.pulled === undefined ? true : o.pulled;
  };
  ctx.updErrandTick_ = () => {
    ctx.done.push('errand');
    if (o.errandThrows) throw new Error('おつかいでこけた');
    return o.errand === undefined ? true : o.errand;
  };
  ctx.updDoorPublish_ = () => { ctx.done.push('door'); return true; };
  if (o.noPull)   delete ctx.updAutoPull_;
  if (o.noFix)    delete ctx.fixAll;
  if (o.noDoor)   delete ctx.updDoorPublish_;
  vm.runInContext(part, ctx);
  return ctx;
}

console.log('■ タップ1回で、4つぜんぶ通る');
{
  const c = build({});
  const t = c.rescueAll();
  ok(c.done.indexOf('fix') !== -1, '① 見張りを立て直す');
  ok(c.done.indexOf('pull') !== -1, '★★★② 新しい中身を取り込む（ここが肝心）');
  ok(c.done.indexOf('errand') !== -1, '③ 頼まれごとを走らせる');
  ok(c.done.indexOf('door') !== -1, '④ 受け口の住所を外に置く');
  ok(c.done.indexOf('fix') < c.done.indexOf('pull'),
     '★見張りを立ててから、取り込む（順番）', c.done);
  ok(t.indexOf('新しい中身を取り込みました') !== -1, '取り込んだことを書く', t);
  ok(t.indexOf('ここまで終わりました') !== -1, '終わったことが分かる');
}

console.log('■ すでに最新のときも、ちゃんと言う');
{
  const c = build({ pulled: false });
  ok(c.rescueAll().indexOf('すでに最新でした') !== -1, '「最新でした」と書く');
}

console.log('■ 1か所こけても、残りを続ける（いちばん大事）');
{
  const a = build({ fixThrows: true });
  const ta = a.rescueAll();
  ok(a.done.indexOf('pull') !== -1, '★★見張りでこけても、取り込みは進む', a.done);
  ok(ta.indexOf('立て直せませんでした') !== -1, 'こけたことを、黙らずに書く');

  const b = build({ pullThrows: true });
  const tb = b.rescueAll();
  ok(b.done.indexOf('door') !== -1, '★★取り込みでこけても、最後まで進む', b.done);
  ok(tb.indexOf('取り込めませんでした') !== -1, 'こけたことを書く');
  ok(tb.indexOf('あとで ひとりでに入ります') !== -1,
     '★見張りは立っているので、あとで入ると伝える（不安にさせない）');

  const c = build({ errandThrows: true });
  c.rescueAll();                                   // ★呼ばないと、何も起きない
  ok(c.done.indexOf('door') !== -1, '頼まれごとでこけても、最後まで進む', c.done);
}

console.log('■ 係が入っていなくても、落ちない');
{
  const a = build({ noFix: true });
  ok(a.rescueAll().indexOf('見あたりませんでした') !== -1, 'なおす係が無くても、落ちない');
  const b = build({ noPull: true });
  ok(b.rescueAll().indexOf('取り込む係が見あたりませんでした') !== -1,
     '取り込む係が無くても、落ちない');
  const c = build({ noDoor: true });
  ok(typeof c.rescueAll() === 'string', '住所を置く係が無くても、落ちない');
}

console.log('■ 箱のボタンが、ここを呼んでいるか');
{
  const code = fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8');
  const h = code.slice(code.indexOf('function openHealHtml_'), code.indexOf('function openHealDialog_'));
  ok(/\.rescueAll\(\);/.test(h), '★★★箱のボタンは「まるごと救助」を呼ぶ');
  ok(!/\.fixAll\(\);/.test(h),
     '★見張りの立て直しだけで終わらせない（それだと直しが届かない）');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
