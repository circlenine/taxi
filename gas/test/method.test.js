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



/* ================================================================
 *  💴 金額に「円」や「￥」が付いていても、ちゃんと読む
 *
 *  ★まーく様のご指摘（2026/11/9）：
 *    「lineのデータをスプシへ反映する動きが止まってます」
 *  ★調べたら、城越さんの
 *      ドン15 / 0300 / 0円 / 35分
 *    が、**記録ごと丸ごと捨てられていました。**
 *    金額は数字だけ、という決めうちだったためです。
 *    しかも、捨てられたことが誰にも分かりません。
 *    これがいちばん たちが悪い形でした。
 * ================================================================ */
console.log('\n■ 金額に「円」や「￥」が付いていても読む');
{
  const at = new Date(2026, 10, 9, 3, 18);          // 2026/11/09 03:18
  const money = (t) => { const r = ctx.parseRideMessage_(t, at); return r ? r.money : null; };

  ok(money('ドン15\n0300\n0円\n35分') === 0,
     '★★★「0円」で、記録ごと捨てない（11/9に消えた1件）', money('ドン15\n0300\n0円\n35分'));
  ok(money('ドン15\n0300\n600円\n35分') === 600, '★「600円」も読む');
  ok(money('ドン15\n0300\n1,400円\n35分') === 1400, '★「1,400円」も読む');
  ok(money('ドン15\n0300\n￥1,400\n35分') === 1400, '★「￥1,400」も読む');
  ok(money('ドン15\n0300\n¥0\n35分') === 0, '★「¥0」も読む');
  ok(money('ドン15\n0300\n0円\n35分\nバラシ') === 0, '　 補足が付いていても読む');

  // これまでどおりの書き方も、変わらず読めること
  ok(money('ドン15\n0300\n1400\n35分') === 1400, '　 数字だけの書き方も、これまでどおり');
  ok(money('ドン2\n0025\n1400\n5分') === 1400, '　 ふだんの書き方も、これまでどおり');

  /*
   * ★「円」も「￥」も付いていない ただの数字は、
   *   これまでの決まりのままにします。
   *   ゆるめすぎると、乗り場の番号まで金額にしてしまいます。
   */
  const r2 = ctx.parseRideMessage_('新地7\n0300\n10\n35分', at);
  ok(!r2 || r2.money !== 10, '★★「10」のような字を、金額にしない', r2 && r2.money);
}


/* ------------------------------------------------------------
 *  説明の文から「ホテル」を種類として拾わない（2026/11/17）
 *
 *  ★新地4の付け待ちが、乗車種類「ホテル」になっていました。
 *    メモが「どっかの知らん会長（ホテル）」だったためです。
 *    ホテルから乗せたのではなく、お客様の話が書いてあっただけでした。
 *  ★その言葉だけの短い行は、これまでどおり種類として読みます。
 * ---------------------------------------------------------- */
console.log('■ 説明の文から、乗り場・ホテル・道路を拾わない');
{
  const at = new Date(2026, 10, 13, 23, 55);
  const r = ctx.parseRideMessage_(
    '新地4\n2350\n37\n2427\n1500\nどっかの知らん会長（ホテル）', at);
  ok(r, '読めている');
  ok(r && r.method === '', '★★★説明の文からは、種類を決めない', r && r.method);
  ok(r && /会長/.test(r.other || ''), '　 その文は「他」に残る', r && r.other);

  /* その言葉だけの行は、これまでどおり種類になる */
  const r2 = ctx.parseRideMessage_('新地4\n2350\n37\n2427\n1500\nホテル', at);
  ok(r2 && r2.method === 'ホテル', '★★★「ホテル」だけの行は、種類になる', r2 && r2.method);
  const r3 = ctx.parseRideMessage_('新地4\n2350\n37\n2427\n1500\n乗り場', at);
  ok(r3 && r3.method === '乗り場', '★★★「乗り場」だけの行も、そのまま', r3 && r3.method);

  /* 長い文でも、GO や Uber は これまでどおり拾う（決まりから外していない） */
  const r4 = ctx.parseRideMessage_(
    '新地4\n2350\n37\n2427\n1500\nGOで呼ばれて空港まで', at);
  ok(r4 && /GO/.test(r4.method || ''), '★★★長い文でも、GOは拾う', r4 && r4.method);
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);