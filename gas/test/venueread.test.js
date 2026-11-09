/**
 * 会場のホームページを「ちゃんと読めているか」を確かめる（006-Venue.gs）。
 *   実行: node gas/test/venueread.test.js
 *
 * ★なぜこのテストを足したか（2026/11/9）
 *   カルテ（クロちゃんへの報告）に「25日間 1件も読めていない会場が16か所」と
 *   出ていました。実際に1つずつページを取ってきて読ませたところ、
 *   ページは開けているのに0件、というところが いくつもありました。
 *   読めていないことに気づけないのが、いちばん たちが悪いので、
 *   ここで「この形のページなら読める」を、形ごとに固定します。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);

const props = { LINE_TOKEN: 'tok' };
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  getProperties: () => Object.assign({}, props),
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; } }) };

let reply = {}, fetched = [];
ctx.UrlFetchApp = { fetch: (url, opt) => {
  fetched.push(url);
  const r = reply[url] || reply['*'] || { code: 404, body: '' };
  if (r.throw) throw new Error(r.throw);
  return { getResponseCode: () => r.code, getContentText: () => r.body };
} };
ctx.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) };
ctx.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
ctx.ScriptApp = { getProjectTriggers: () => [], deleteTrigger: () => {} };
ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); },
  getActiveSpreadsheet: () => ({ getSheetByName: () => null }) };
ctx.MailApp = { getRemainingDailyQuota: () => 100, sendEmail: () => {} };
ctx.Utilities = { getUuid: () => 'x', Charset: { UTF_8: 'UTF_8' },
  DigestAlgorithm: { MD5: 'MD5' }, computeDigest: () => [1], base64Encode: () => 'x' };
vm.runInContext('function logErr_(){} function lrPush_(){} var SENDER_MAP = {};', ctx);
vm.runInContext('function lrBytes_(s){return String(s).length;}', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8'), ctx);

const V = n => vm.runInContext(n, ctx);
const scrape = V('vnScrapeOne_');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) console.log('ok  ', msg);
  else { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
};
const page = body => '<html><body>' + body + '<p>' + 'あ'.repeat(600) + '</p></body></html>';
const read = (body, src, day) => {
  reply = { '*': { code: 200, body: page(body) } };
  return scrape(Object.assign({ name: 'BIGCAT', kind: 'event', url: 'https://x/' }, src || {}),
                day || new Date(2026, 10, 10));
};

/* ================================================================
 * ① 時刻が、日付から7行も先にあるページ（BIGCAT の形）
 *    ここを6行で切っていたので、何か月も1件も読めていなかった。
 * ================================================================ */
console.log('■ 時刻が、日付のずっと下にあるページ（ライブハウスの形）');
{
  const r = read([
    '<p>11.10 TUE</p>',
    '<p>さかいゆうDUO TOUR</p>',
    '<p>LIVE INFO</p>',
    '<p>さかいゆう</p>',
    '<p>出演：Vocal：さかいゆう</p>',
    '<p>＜公演に関する注意事項はこちら＞</p>',
    '<p>OPEN</p><p>18:30</p>',
    '<p>START</p><p>19:00</p>',
    '<p>ADV</p><p>￥7,700</p>'
  ].join(''));
  ok(r.events.length === 1, '★★★1件 読める（6行で切っていたので0件だった）', r.events.length);
  const e = r.events[0] || {};
  ok(e.start === '19:00', '★「START 19:00」を開演にする', e.start);
  ok(e.startKind === '開演', '　 開場とは呼ばない', e.startKind);
  ok(String(e.title).indexOf('さかいゆうDUO TOUR') === 0, '★名前は公演名（「出演：…」ではない）', e.title);
}

/* ================================================================
 * ② 問い合わせ先の受付時間を、開演と読んではいけない
 * ================================================================ */
console.log('■ 問い合わせ先の受付時間を、開演と読まない');
{
  // ★受付時間が、日付の すぐ下に書いてある形（いちばん危ない）
  const r = read([
    '<p>11月10日(火)</p>',
    '<p>キョードーインフォメーション 0570-200-888（平日12:00 ～ 17:00）</p>',
    '<p>コンサート ほにゃらら</p>'
  ].join(''));
  ok(r.events.length === 0,
     '★★★受付時間しか無いなら、催しとして出さない（12:00に行かせない）',
     r.events.map(e => e.start));

  // ★受付時間が ずっと下に書いてある形
  const r2 = read([
    '<p>11月10日(火)</p>',
    '<p>コンサート ほにゃらら</p>',
    '<p>お問い合わせ</p>',
    '<p>キョードーインフォメーション 0570-200-888（平日12:00 ～ 17:00）</p>'
  ].join(''));
  ok(r2.events.length === 0, '　 離れたところにある受付時間も、開演にしない', r2.events.map(e => e.start));

  // ★ほんものの開演と、受付時間が いっしょに書いてある形
  const r3 = read([
    '<p>11月10日(火)</p>',
    '<p>ほにゃらら公演</p>',
    '<p>開演 19:00</p>',
    '<p>お問い合わせ 0570-200-888（平日12:00 ～ 17:00）</p>'
  ].join(''));
  ok(r3.events.length === 1 && r3.events[0].start === '19:00',
     '★★開演が書いてあれば、そちらを使う（受付時間に引っぱられない）',
     r3.events.map(e => e.start));
  ok(!r3.events.length || r3.events[0].end !== '12:00',
     '★★★終わりの時刻に、受付時間を入れない', (r3.events[0] || {}).end);
}

/* ================================================================
 * ③ チケットの発売日を、催しの日と読んではいけない
 * ================================================================ */
console.log('■ チケットの発売日を、催しの日と読まない');
{
  const r = read([
    '<p>中川晃教 アコースティック Special</p>',
    '<p>2027年2月7日（日）16:00開演</p>',
    '<p>一般発売日</p>',
    '<p>2026年11月10日（火）10:00</p>'
  ].join(''));
  ok(r.events.length === 0,
     '★★★「一般発売日 11月10日 10:00」を、11/10の催しにしない', r.events.map(e => e.title + ' ' + e.start));
}

/* ================================================================
 * ④ 名前のところに、名前でないものを出さない
 * ================================================================ */
console.log('■ 名前のところに、名前でないものを出さない');
{
  const T = V('vnTitleOf_');
  ok(T(['ブリーゼチケットセンター 06-6341-8888（11:00～15:00）']) === '',
     '★電話番号の行は、名前にしない', T(['ブリーゼチケットセンター 06-6341-8888（11:00～15:00）']));
  ok(T(['Webでチケット購入']) === '', '★「Webでチケット購入」は名前にしない');
  ok(T(['公演・イベント情報一覧へ']) === '', '★「公演・イベント情報一覧へ」は名前にしない');
  ok(T(['開始時間：10:00～、14:00～、18:00～']) === '', '★「開始時間：…」は名前にしない');
  ok(T(['出演：Vocal&Keyboard：さかいゆう']) === '', '★「出演：…」は名前にしない');
  ok(T(['2026年11月 月 火 水 木 金 土 日']) === '', '★カレンダーの見出しは名前にしない');
  ok(T(['未就学児入場不可']) === '', '★「未就学児入場不可」は名前にしない');
  ok(T(['第51回社会人野球日本選手権大会']) === '第51回社会人野球日本選手権大会',
     '　 ほんものの名前は、そのまま通る', T(['第51回社会人野球日本選手権大会']));
  ok(T(['802 Jungle Attack Vol.13 TRACK15']) === '802 Jungle Attack Vol.13 TRACK15',
     '★数字で始まる公演名も、ちゃんと通る', T(['802 Jungle Attack Vol.13 TRACK15']));
}

/* ================================================================
 * ⑤ 表の形（日付と名前が同じ1行）でも、名前が読める
 * ================================================================ */
console.log('■ 表の形（日付と名前が同じ行）');
{
  const r = read('<table><tr><td>11月10日(火)</td><td>ガンバ大阪 VS 鹿島アントラーズ</td>' +
                 '<td>キックオフ 19:00</td></tr></table>',
                 { name: 'パナソニックスタジアム' });
  ok(r.events.length === 1, '1件 読める', r.events.length);
  ok(String((r.events[0] || {}).title).indexOf('ガンバ大阪') !== -1,
     '★日付と同じ行でも、名前が読める', (r.events[0] || {}).title);
}

/* ================================================================
 * ⑥ 「2026/27シーズン」を日付と読み違えない
 *    ここで切っていたので、4万人の試合が1件も出ていなかった。
 * ================================================================ */
console.log('■ 「2026/27シーズン」を日付と読み違えない');
{
  const r = read('<p>11月10日(火)</p>' +
                 '<p>15:00 ～ 2026/27シーズン明治安田J1リーグ　ガンバ大阪　VS　セレッソ大阪</p>',
                 { name: 'パナソニックスタジアム' });
  ok(r.events.length === 1, '★★★1件 読める（「26/27」で切っていた）', r.events.length);
  const e = r.events[0] || {};
  ok(e.start === '15:00', '　 15:00 を始まりにする', e.start);
  ok(String(e.title).indexOf('ガンバ大阪') !== -1 && String(e.title).indexOf('セレッソ大阪') !== -1,
     '★どちらとの試合か、両方 出る', e.title);
}

/* ================================================================
 * ⑦ 月ごとのカレンダーの形（日にちだけのマス目）
 * ================================================================ */
console.log('■ 月ごとのカレンダーの形（「8(日)」しか書いていないページ）');
{
  const monthPage = page([
    '<p>2026.11月のイベントスケジュール</p>',
    '<p>7(土)</p><p>試合開催準備</p>',
    '<p>8(日)</p><p>15:00 ～ 明治安田J1リーグ　ガンバ大阪　VS　セレッソ大阪</p>',
    '<p>9(月)</p>'
  ].join(''));
  // 一覧のページは「先月のまま」。その月のページへのリンクをたどる
  const indexPage = page([
    '<p>2026.10月のイベントスケジュール</p>',
    '<p>8(日)</p><p>16:00 ～ 10月のためしの試合</p>',
    '<a href="schedule_202611.html">次月</a>'
  ].join(''));
  reply = {
    'https://suitacityfootballstadium.jp/schedule/': { code: 200, body: indexPage },
    'https://suitacityfootballstadium.jp/schedule/schedule_202611.html': { code: 200, body: monthPage }
  };
  fetched = [];
  const r = scrape({ name: 'パナソニックスタジアム', kind: 'event',
                     url: 'https://suitacityfootballstadium.jp/schedule/' }, new Date(2026, 10, 8));
  ok(r.events.length === 1, '★★★1件 読める（月が書いていなくても読む）', r.events.length);
  const e = r.events[0] || {};
  ok(e.start === '15:00', '　 15:00 を始まりにする', e.start);
  ok(String(e.title).indexOf('ガンバ大阪') !== -1, '　 名前が読める', e.title);
  ok(fetched.indexOf('https://suitacityfootballstadium.jp/schedule/schedule_202611.html') !== -1,
     '★★一覧が先月のままなら、その月のページを取りにいく', fetched);
}

console.log('■ 月ごとのカレンダーでも、その日でなければ出さない');
{
  const monthPage = page([
    '<p>2026.11月のイベントスケジュール</p>',
    '<p>8(日)</p><p>15:00 ～ ガンバ大阪　VS　セレッソ大阪</p>',
    '<p>9(月)</p>'
  ].join(''));
  reply = { 'https://y/': { code: 200, body: monthPage } };
  const r = scrape({ name: 'パナソニックスタジアム', kind: 'event', url: 'https://y/' },
                   new Date(2026, 10, 9));
  ok(r.events.length === 0, '★9日には、8日の試合を出さない', r.events.map(e => e.title));
}

/* ================================================================
 * ⑦-2 中のページ（催しのページ）でも、受付時間を開演にしない
 * ================================================================ */
console.log('■ 中のページでも、受付時間を開演にしない');
{
  const list = page('<p>こんさーと ほにゃらら</p><a href="https://z/event/1">ほにゃらら公演</a>');
  const detail = page([
    '<p>ほにゃらら公演</p>',
    '<p>2026年11月10日(火)</p>',
    '<p>お問い合わせ チケットセンター 06-6341-8888（11:00～15:00）</p>',
    '<p>開演 19:00</p>'
  ].join(''));
  reply = { 'https://z/': { code: 200, body: list },
            'https://z/event/1': { code: 200, body: detail } };
  const r = scrape({ name: 'ホテルニューオータニ大阪', kind: 'event', deep: true, url: 'https://z/' },
                   new Date(2026, 10, 10));
  ok(r.events.length === 1, '中のページから1件 読める', r.events.length);
  ok((r.events[0] || {}).start === '19:00',
     '★★★開演19:00を使う（受付の11:00にしない）', (r.events[0] || {}).start);
  ok((r.events[0] || {}).end !== '15:00',
     '★★終わりにも、受付の15:00を入れない', (r.events[0] || {}).end);
}

/* ================================================================
 * ⑦-3 一覧に時刻が1つも無い会場（グランキューブ大阪の形）
 *      催しのページが、チケット屋さんのホームページにある。
 * ================================================================ */
console.log('■ 一覧に時刻が無く、催しのページがよそにある会場');
{
  const list = page([
    '<p>コンサート</p><p>ほにゃらら公演</p><p>開催日</p>',
    '<p>11/05 THU -</p><p>11/06 FRI -</p>',
    '<a href="https://www.gco.co.jp/corporate/">会社案内</a>',
    '<a href="https://www.gco.co.jp/access/">アクセス</a>',
    '<a href="https://www.gco.co.jp/case/party/">パーティ</a>',
    '<a href="https://www.gco.co.jp/contact/">お問い合わせ</a>',
    '<a href="https://www.gco.co.jp/architecture/">建物</a>',
    '<a href="https://ticket.test/detail/1">ほにゃらら公演</a>'
  ].join(''));
  const detail = page([
    '<p>ほにゃらら公演</p><p>日時</p>',
    '<p>2026/11/05(木) 18:30</p>',
    '<p>2026/11/06(金) 18:00</p>'
  ].join(''));
  const src = { name: 'グランキューブ大阪', kind: 'event', deep: true,
                hosts: ['ticket.test'], url: 'https://www.gco.co.jp/event/' };
  reply = { 'https://www.gco.co.jp/event/': { code: 200, body: list },
            'https://ticket.test/detail/1': { code: 200, body: detail },
            '*': { code: 404, body: '' } };

  const r5 = scrape(src, new Date(2026, 10, 5));
  ok(r5.events.length === 1, '★★★よそのページまで開いて、1件 読める', r5.events.length);
  ok((r5.events[0] || {}).start === '18:30', '　 5日は 18:30', (r5.events[0] || {}).start);

  const r6 = scrape(src, new Date(2026, 10, 6));
  ok((r6.events[0] || {}).start === '18:00',
     '★★★6日は 18:00（その日の行から拾う。1日ちがいは空振りになる）',
     (r6.events[0] || {}).start);
  ok((r6.events[0] || {}).end !== '18:00' &&
     (r6.events[0] || {}).end !== '18:30',
     '★★終わりに、別の日の時刻を入れない', (r6.events[0] || {}).end);
  const e6 = r6.events[0] || {};
  const hh = (t) => Number(String(t).split(':')[0]);
  ok(!e6.end || hh(e6.end) > hh(e6.start),
     '★★★終わりが、始まりより前にならない（開演前に行かせない）',
     e6.start + '〜' + e6.end);
}

console.log('■ 終わりが、始まりより前になったら捨てる');
{
  /*
   * ★はじめに書いた検査には穴がありました（2026/11/9）。
   *   日付が古い順にならんだページしか試していなかったので、
   *   「終わりのほうが早い」形が、そもそも作れていませんでした。
   *   わざと守りを外しても、検査が通ってしまいました。
   *   新しい日が先にならぶページで試します。
   */
  const list = page('<p>ほにゃらら公演</p><p>11/06 FRI -</p>' +
                    '<a href="https://ticket.test/detail/2">ほにゃらら公演</a>');
  const detail = page([
    '<p>ほにゃらら公演</p><p>日時</p>',
    '<p>2026/11/06(金) 19:00</p>',
    '<p>2026/11/05(木) 18:30</p>'
  ].join(''));
  const src = { name: 'グランキューブ大阪', kind: 'event', deep: true,
                hosts: ['ticket.test'], url: 'https://www.gco.co.jp/event/' };
  reply = { 'https://www.gco.co.jp/event/': { code: 200, body: list },
            'https://ticket.test/detail/2': { code: 200, body: detail },
            '*': { code: 404, body: '' } };
  const e = (scrape(src, new Date(2026, 10, 6)).events || [])[0] || {};
  ok(e.start === '19:00', '　 6日の始まりは 19:00', e.start);
  ok(e.end !== '18:30',
     '★★★前の日の 18:30 を、終わりにしない', e.end);
  const hh = (t) => Number(String(t).split(':')[0]);
  ok(!e.end || hh(e.end) > hh(e.start),
     '★★★終わりが始まりより前のままなら、捨てる（開演前に行かせない）',
     e.start + '〜' + e.end);
}

console.log('■ 名ざししていないホームページは、開かない');
{
  const list = page('<p>11/05 THU -</p><a href="https://yoso.test/x">よその催し</a>');
  const src = { name: 'グランキューブ大阪', kind: 'event', deep: true,
                hosts: ['ticket.test'], url: 'https://www.gco.co.jp/event/' };
  reply = { 'https://www.gco.co.jp/event/': { code: 200, body: list },
            '*': { code: 200, body: page('<p>2026/11/05(木) 18:30</p><p>よその公演</p>') } };
  fetched = [];
  const r = scrape(src, new Date(2026, 10, 5));
  ok(fetched.indexOf('https://yoso.test/x') === -1,
     '★★★知らないページは開かない（よその催しを、この会場のものにしない）', fetched);
  ok(r.events.length === 0, '　 だから、何も出さない', r.events.length);
}

/* ================================================================
 * ⑧ よく出る記号を、字に戻す
 * ================================================================ */
console.log('■ よく出る記号を、字に戻す');
{
  const E = V('vnEntity_');
  ok(E('&yen;18,000') === '円18,000', '★&yen; は「円」に戻す', E('&yen;18,000'));
  ok(E('&laquo; 2026') === '« 2026', '　&laquo; も戻す', E('&laquo; 2026'));
  ok(E('&#x3042;') === 'あ', '　16進の書き方も戻す', E('&#x3042;'));
}

/* ================================================================
 * ⑨ 控えの名前が、ぶつからない
 *    同じ1000分の1秒に2つ控えると、同じ名前になっていた。
 *    上書きされると、「グループへ送る」で別の絵が出る。
 * ================================================================ */
console.log('■ 控えの名前が、ぶつからない');
{
  const save = V('vnShareSave_'), load = V('vnShareLoad_');
  const realNow = Date.now;
  Date.now = () => 1700000000000;            // 時計を止める（同じ1000分の1秒にする）
  const keys = [];
  for (let i = 0; i < 8; i++) keys.push(save([{ type: 'text', text: 'ひかえ' + i }]));
  Date.now = realNow;
  const uniq = keys.filter((k, i) => k && keys.indexOf(k) === i);
  ok(uniq.length === 8, '★★★時計が止まっていても、8つとも別の名前になる', keys);
  let allOk = true;
  keys.forEach((k, i) => {
    const got = JSON.stringify(load(k) || '');
    if (got.indexOf('ひかえ' + i) === -1) allOk = false;
  });
  ok(allOk, '★★どの控えも、上書きされずに読み出せる');
}

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
