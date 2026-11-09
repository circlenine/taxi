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

/* ================================================================
 *  ⏱ 「何分おき」に、Googleが受け取らない値を書いていないか
 *
 *  ★2026/11/9、実際にこう出ていました。
 *      「見張りを立て直せませんでした
 *        （everyMinutes に渡した値は無効です。
 *          1、5、10、15、30 のいずれかを指定してください。）」
 *    3分おき、と書いてあったためです。
 *
 *  ★ふだんは、何ごともないように見えます。
 *    いまある見張りは前からのもので、ちゃんと動いているからです。
 *    こわいのは「**見張りが消えたときに、立て直せない**」こと。
 *    そうなると新しい中身も取り込めず、こちらからも直せません。
 *    「ここで指示すれば必ず直る」が、根元から成り立ちません。
 *
 *  ★だから、コードに書いてある「何分おき」を ぜんぶ見ます。
 * ================================================================ */
/* ================================================================
 *  👯 おなじ見張りが、重なって増えていないか
 *
 *  ★2026/11/9、見張りが 9こ → 11こ に増えていました。
 *    「チェックした瞬間に動く」しかけが 3つ 重なっていました。
 *    1回チェックするたび、同じ処理が3回 動きます。
 *    持ち時間（1日90分）のむだ遣いで、見張りの席（20こ）も食います。
 * ================================================================ */
console.log('■ 重なった見張りを、1つだけ残して片づける');
{
  const vm2 = require('vm');
  const mk = (fn, ev) => ({
    _fn: fn, _ev: ev, _dead: false,
    getHandlerFunction: () => fn,
    getEventType: () => ev
  });
  const build = (list) => {
    const c = { console };
    vm2.createContext(c);
    c.deleted = [];
    c.ScriptApp = {
      EventType: { ON_EDIT: 'ON_EDIT', ON_OPEN: 'ON_OPEN', CLOCK: 'CLOCK' },
      getProjectTriggers: () => list.filter(t => !t._dead),
      deleteTrigger: (t) => { t._dead = true; c.deleted.push(t._fn + '/' + t._ev); }
    };
    c.logErr_ = () => {};
    const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
    const i = src.indexOf('const UPD_DUP_CUT');
    const j = src.indexOf('\nfunction updSweepDeadTriggers_');
    vm2.runInContext(src.slice(i, j), c);
    return c;
  };

  {
    const list = [mk('panelOnEdit', 'ON_EDIT'), mk('panelOnEdit', 'ON_EDIT'),
                  mk('panelOnEdit', 'ON_EDIT'), mk('panelWatch', 'CLOCK')];
    const c = build(list);
    const n = c.updDedupTriggers_();
    ok(n === 2, '★★★3つ重なっていたら、2つ消す', n);
    ok(list.filter(t => t._fn === 'panelOnEdit' && !t._dead).length === 1,
       '★★★かならず1つは残す（0こにしない）',
       list.filter(t => t._fn === 'panelOnEdit' && !t._dead).length);
  }

  {
    /*
     * ★時刻で動くものには、手を出しません。
     *   同じ名前でも、ちがう時刻に動く別の役目かもしれません。
     *   取りちがえると、要る見張りを消してしまいます。
     */
    const list = [mk('venueDailyJob', 'CLOCK'), mk('venueDailyJob', 'CLOCK')];
    const c = build(list);
    ok(c.updDedupTriggers_() === 0,
       '★★★時刻で動く見張りは、重なって見えても消さない', c.deleted);
  }

  {
    const list = [mk('panelOnEdit', 'ON_EDIT'), mk('onOpen', 'ON_OPEN')];
    const c = build(list);
    ok(c.updDedupTriggers_() === 0, '★重なっていなければ、1つも消さない', c.deleted);
  }

  {
    const many = [];
    for (let i = 0; i < 12; i++) many.push(mk('panelOnEdit', 'ON_EDIT'));
    const c = build(many);
    ok(c.updDedupTriggers_() === 5, '★1回に消すのは5つまで（まちがえても傷が小さい）');
  }

  {
    const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
    const i = src.indexOf('\nfunction updDoctorTick_(');
    const j = src.indexOf('\nfunction ', i + 1);
    ok(src.slice(i, j).indexOf('updDedupTriggers_(') !== -1,
       '★★1時間に1回、重なりを見ている');
  }
}

console.log('■ 「何分おき」に、使えない値を書いていないか');
{
  const OK = [1, 5, 10, 15, 30];
  const dir = path.join(__dirname, '..');
  const files = fs.readdirSync(dir).filter(f => /\.gs$/.test(f));
  const bad = [];
  const seen = [];
  files.forEach(f => {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    // 定数の中身を先にひろう（everyMinutes(PANEL_WATCH_MIN) のような書き方のため）
    const consts = {};
    let c;
    const cre = /^\s*(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*(\d+)\s*;/gm;
    while ((c = cre.exec(txt)) !== null) consts[c[1]] = Number(c[2]);

    let m;
    const re = /\.everyMinutes\(\s*([A-Za-z_][A-Za-z0-9_]*|\d+)\s*\)/g;
    while ((m = re.exec(txt)) !== null) {
      const raw = m[1];
      const v = /^\d+$/.test(raw) ? Number(raw)
                                  : (raw in consts ? consts[raw] : null);
      seen.push(f + ' … ' + raw + (v === null ? '（値を追えません）' : '＝' + v + '分'));
      if (v === null || OK.indexOf(v) === -1) bad.push(f + ' … ' + raw + '＝' + v);
    }
  });
  ok(seen.length > 0, '　 「何分おき」の書き場所が見つかる（' + seen.length + 'か所）', seen);
  ok(bad.length === 0,
     '★★★Googleが受け取れない「何分おき」が、1つも無い（1・5・10・15・30だけ）', bad);
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
