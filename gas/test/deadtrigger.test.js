/**
 * 中身の無い見張りを消す係と、LINEの受け口の見張りを確かめる。
 *   実行: node gas/test/deadtrigger.test.js
 *
 * ★2026/11/2、まーく様のメールが
 *   「スクリプト関数が見つかりません: drawBordersAllSheets」で
 *   埋まりました。5分おきに失敗し、ひと晩で288回です。
 *
 * ★ここでいちばん こわいのは「消しすぎ」です。
 *   生きている見張りを消すと、全部が止まります。
 *   だから「消さない」ほうを、いちばん厚く確かめます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

/* ---- 005-Updater.gs の、この2つの係だけを切り出して動かす ---- */
const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
const B = src.indexOf('/** その名前の中身が、いま動かせるかどうか */');
const E = src.indexOf('function updEnsureAll_()');
ok(B > 0 && E > B, '005-Updater.gs に、この係がある');
const part = src.slice(B, E);

/* 見張りの ニセモノ */
function fakeTrigger(fn){ return { getHandlerFunction: () => fn }; }

function build(opts){
  const o = opts || {};
  const ctx = { console };
  ctx.globalThis = ctx;                 // vm の中の「ぜんぶの入れもの」
  vm.createContext(ctx);
  // 本物と同じように、生きている関数をいくつか置く
  vm.runInContext('function fixAll(){} function panelWatch(){} function panelOnEdit(){}', ctx);
  ctx.deleted = [];
  ctx.ScriptApp = {
    getProjectTriggers: () => (o.triggers || []),
    deleteTrigger: (t) => { ctx.deleted.push(t.getHandlerFunction()); },
    getService: () => ({ getUrl: () => (o.url === undefined ? 'https://example.test/exec' : o.url) })
  };
  ctx.UrlFetchApp = { fetch: () => {
    if (o.fetchThrows) throw new Error('つながりません');
    return { getResponseCode: () => (o.code === undefined ? 200 : o.code) };
  } };
  vm.runInContext(part, ctx);
  return ctx;
}

console.log('■ 生きているか どうかの見分け');
{
  const c = build({});
  ok(c.updFnAlive_('fixAll') === true,  '生きている名前は true');
  ok(c.updFnAlive_('drawBordersAllSheets') === false, '無い名前は false');
  ok(c.updFnAlive_('') === true,  '名前が空のときは、さわらない（true）');
  ok(c.updFnAlive_(null) === true, '名前が無いときも、さわらない（true）');
}

console.log('■ 中身の無い見張りだけを消す');
{
  const c = build({ triggers: [
    fakeTrigger('panelWatch'), fakeTrigger('drawBordersAllSheets'),
    fakeTrigger('panelOnEdit'), fakeTrigger('fixAll')
  ]});
  const r = c.updSweepDeadTriggers_();
  ok(c.deleted.length === 1 && c.deleted[0] === 'drawBordersAllSheets',
     '中身の無いものだけを消す', c.deleted);
  ok(r.gone.join() === 'drawBordersAllSheets', '消したものを返す', r.gone);
  ok(r.text.indexOf('drawBordersAllSheets') !== -1, '何を消したかを書く');
  ok(r.text.indexOf('もう来ません') !== -1, 'メールが止まることも書く');
}

console.log('■ 生きている見張りは、ぜったいに消さない（いちばん大事）');
{
  const c = build({ triggers: [
    fakeTrigger('panelWatch'), fakeTrigger('panelOnEdit'), fakeTrigger('fixAll')
  ]});
  const r = c.updSweepDeadTriggers_();
  ok(c.deleted.length === 0, '1つも消さない', c.deleted);
  ok(r.text.indexOf('ありません') !== -1, '「ありません」と返す', r.text);
}

console.log('■ 見分けがつかないときは、1つも消さない');
{
  // 「絶対に無い名前」まで true を返す＝見分けがついていない状態
  const c = build({ triggers: [fakeTrigger('drawBordersAllSheets')] });
  vm.runInContext('updFnAlive_ = function(){ return true; };', c);
  const r = c.updSweepDeadTriggers_();
  ok(c.deleted.length === 0, '全部 生きて見えるときは、消さない', c.deleted);

  const c2 = build({ triggers: [fakeTrigger('panelWatch')] });
  vm.runInContext('updFnAlive_ = function(){ return false; };', c2);
  const r2 = c2.updSweepDeadTriggers_();
  ok(c2.deleted.length === 0, '全部 死んで見えるときも、消さない', c2.deleted);
  ok(r2.text.indexOf('調べられませんでした') !== -1, '調べられなかった、と返す', r2.text);
}

console.log('■ 見張りの一覧が読めないとき');
{
  const c = build({});
  c.ScriptApp.getProjectTriggers = () => { throw new Error('権限がありません'); };
  const r = c.updSweepDeadTriggers_();
  ok(c.deleted.length === 0 && r.text.indexOf('調べられませんでした') !== -1,
     '読めなければ、何もしない', r.text);
}

console.log('■ いちどに消しすぎない');
{
  const many = [];
  for (let i = 0; i < 30; i++) many.push(fakeTrigger('nai' + i));
  const c = build({ triggers: many });
  c.updSweepDeadTriggers_();
  ok(c.deleted.length === 10, '1回で10こまで', c.deleted.length);
}

console.log('■ LINEの受け口が、生きているか');
{
  ok(build({ code: 200 }).updWebAppCheck_().indexOf('生きています') !== -1, '200なら生きている');
  ok(build({ code: 302 }).updWebAppCheck_().indexOf('生きています') !== -1, '転送でも生きている');

  const dead = build({ code: 404 }).updWebAppCheck_();
  ok(dead.indexOf('死んでいます') !== -1, '404なら死んでいる', dead);
  ok(dead.indexOf('404') !== -1, '番号も出す');
  ok(dead.indexOf('スプシに入りません') !== -1, '何が困るかを書く');
  ok(dead.indexOf('デプロイを管理') !== -1, '直し方（押すところ）まで書く');

  const none = build({ url: '' }).updWebAppCheck_();
  ok(none.indexOf('公開されていません') !== -1, 'まだ公開していないときも分かる', none);

  const err = build({ fetchThrows: true }).updWebAppCheck_();
  ok(err.indexOf('確かめられませんでした') !== -1, 'つながらないときは、黙らずに言う', err);
  ok(err.indexOf('死んでいます') === -1, 'つながらないだけで「死んだ」と決めつけない');
}

console.log('■ 「なおす」のときに、ちゃんと呼んでいるか');
{
  ok(/updSweepDeadTriggers_\(\)/.test(src.slice(src.indexOf('function updEnsureAll_'))),
     'そろえるときに、掃除も呼ぶ');
  const fx = src.slice(src.indexOf('function fixAll'), src.indexOf('function fixAll') + 6000);
  ok(/updWebAppCheck_\(\)/.test(fx), '「なおす」で、受け口も確かめる');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
