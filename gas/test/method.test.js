/**
 * 乗車の「種類」の読み取りを確かめる。
 *   実行: node gas/test/method.test.js
 *
 * ★まーく様のご指示（2026/10/26）：
 *   「GOをゴーとだいちゃん(齋藤大介)が書いてる項目もあるため
 *     4行目以降にゴーがあれば、GOで統一してください」
 *
 *   書き方は人それぞれです。「GO」「ゴー」「ｺﾞｰ」「ゴ」。
 *   どれで書かれても、表には「GO」と入らないと、
 *   あとで数えるときに別の種類として数えられてしまいます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
/*
 * ★ここは 001-Code.gs そのものを読みます。
 *   gas-globals.js（他のテスト用の写し）を一緒に読むと、
 *   同じ名前が二重になって動きません。だから読みません。
 */
vm.runInContext('function logErr_(){}', ctx);
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: () => null, setProperty: () => {}, deleteProperty: () => {} }) };
ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); } };
ctx.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) };
ctx.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '' }) };
ctx.ScriptApp = { getProjectTriggers: () => [], newTrigger: () => ({}) };
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8'), ctx);

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

console.log('■ 「ゴー」はどう書かれても GO にそろえる');
{
  const D = ctx.detectMethod_;
  ['GO', 'go', 'ＧＯ', 'ゴー', 'ゴ-', 'ｺﾞｰ', 'ゴ', 'ｺﾞ'].forEach(function (x) {
    ok(D(x) === 'GO', '★★★「' + x + '」→ GO', D(x));
  });
  // 行先と一緒に書かれていても拾う
  ok(D('ゴー 茨城駅') === 'GO', '★「ゴー 茨城駅」→ GO', D('ゴー 茨城駅'));
  ok(D('GO 行先：新金岡駅') === 'GO', '　「GO 行先：…」→ GO', D('GO 行先：新金岡駅'));

  /*
   * ★「ゴ」1文字は、ふつうの言葉にも出てきます。
   *   行まるごとが「ゴ」系のときだけ GO とします。
   *   ここを緩めると、関係ない行まで GO になります。
   */
  ok(D('ゴリラ') !== 'GO', '★★「ゴリラ」は GO にしない', D('ゴリラ'));
  ok(D('ゴール裏') !== 'GO', '★★「ゴール裏」も GO にしない', D('ゴール裏'));
  ok(ctx.goOnly_('ゴ') === true, '　 「ゴ」だけなら そう見なす');
  ok(ctx.goOnly_('ゴー') === true, '　 「ゴー」だけも');
  ok(ctx.goOnly_(' ゴー ') === true, '　 前後の空白は気にしない');
  ok(ctx.goOnly_('ゴリラ') === false, '　 「ゴリラ」は ちがう');
  ok(ctx.goOnly_('') === false, '　 空は ちがう');
  ok(ctx.goOnly_(null) === false, '　 渡されなくても落ちない');
}

console.log('\n■ 投稿まるごとで読んだときも GO になる');
{
  const P = ctx.parseRideMessage_;
  const at = new Date(2026, 9, 20, 1, 0, 0);

  const a = P('中崎町\n0309\n13500\n0分\nゴー', at);
  ok(!!a, '★「ゴー」の投稿が読める');
  ok(a && a.method === 'GO', '★★★種類が GO になる', a && a.method);

  const b = P('放出駅\n1814\n10060\n0分\nGO\n行先：新金岡駅（堺市）', at);
  ok(!!b, '★「GO」の投稿も読める');
  ok(b && b.method === 'GO', '　 種類は GO', b && b.method);

  const c = P('ドンス、ドルガバ\n0035\n11340\n0分\nゴー 茨城駅', at);
  ok(c && c.method === 'GO', '★★行先が同じ行にあっても GO', c && c.method);

  // 種類を書いていない投稿は、空のまま（勝手に GO にしない）
  const d = P('新地7\n0220\n6900\n10分\n大日駅', at);
  ok(d && d.method === '', '★★★書いていないものを、勝手に GO にしない', d && d.method);
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
