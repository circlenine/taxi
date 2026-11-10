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
 * ⑦-4 芝居小屋の「昼の部／夜の部」の表（新歌舞伎座の形）
 * ================================================================ */
console.log('■ 芝居小屋の「昼の部／夜の部」の表を読む');
{
  // 表のマス目は、1つずつ別の行になって出てきます
  const sched = ['日付', '曜日', '昼の部', '夜の部',
                 '11/14', '土', '11:30', '16:30',
                 '15', '日', '11:30', '-',
                 '17', '火', '-', '-',
                 '18', '水', '11:30', '16:30'];
  /*
   * ★本物のページでは、チケットの発売の時刻が **表より先** に出てきます。
   *   はじめに書いた検査は、発売の時刻をあとに置いていたので、
   *   「終わりを よそから拾う」バグを作っても、たまたま当たりませんでした。
   *   本物と同じ並びにします。
   */
  const detail = page('<p>発売情報</p>' +
                      '<p>2026年8月19日(水)10:00 ～ 8月22日(土)23:59</p>' +
                      sched.map(x => '<p>' + x + '</p>').join(''));
  const list = page('<a href="https://skz.test/perf_info/20261114.html">' +
                    '<figure><img src="x.jpg"></figure>' +
                    '<p><span>2026年11月14日(土)～11月23日(月・祝)</span>' +
                    '<span>舞台『ほにゃらら』</span></p>' + 'あ'.repeat(230) + '</a>');
  const src = { name: '新歌舞伎座', kind: 'event', deep: true, url: 'https://skz.test/' };
  reply = { 'https://skz.test/': { code: 200, body: list },
            'https://skz.test/perf_info/20261114.html': { code: 200, body: detail },
            '*': { code: 404, body: '' } };

  const e14 = (scrape(src, new Date(2026, 10, 14)).events || [])[0] || {};
  ok(e14.start === '16:30',
     '★★★14日は 夜の部 16:30（昼の部 11:30 を拾わない）', e14.start);
  ok(String(e14.title).indexOf('ほにゃらら') !== -1,
     '★名前が読める（先頭の日付のならびは取りのぞく）', e14.title);
  ok(e14.end !== '23:59',
     '★★★チケットの発売の 23:59 を、終演にしない（真夜中に行かせる）', e14.end);
  ok(e14.endGuess === true, '　 終わりは見積もりだと分かる印が付く');

  const e15 = (scrape(src, new Date(2026, 10, 15)).events || [])[0] || {};
  ok(e15.start === '11:30', '　 15日は 昼の部だけなので 11:30', e15.start);

  const r17 = scrape(src, new Date(2026, 10, 17));
  ok(r17.events.length === 0, '★★「-」だけの日は、公演が無いので出さない', r17.events.length);

  const e18 = (scrape(src, new Date(2026, 10, 18)).events || [])[0] || {};
  ok(e18.start === '16:30',
     '★★★18日も読める（表には「18」としか書いていない）', e18.start);
}

console.log('■ 長いリンク（写真＋日付＋公演名）も、見落とさない');
{
  const V = (n) => vm.runInContext(n, ctx);
  const html = '<a href="/perf/1"><figure><img src="x.jpg"></figure>' +
               '<p>' + 'あ'.repeat(400) + '</p></a>';
  const links = V('vnLinks_')(html, 'https://skz.test/');
  ok(links.some(l => l.url === 'https://skz.test/perf/1'),
     '★★★中身が200字を超えるリンクも、ちゃんと見える', links.map(l => l.url));
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

/* ================================================================
 * ⑩ 調べた結果を、こちらから読める所に置く
 *
 *  ★まーく様から「おおきにアリーナの情報などは読めてますか？」と
 *    聞かれて、答えられませんでした（2026/11/9）。
 *    結果が まーく様のLINEにしか出ていなかったためです。
 *    それでは「画面を写して送ってください」になってしまいます。
 * ================================================================ */
console.log('■ 調べた結果を、ドライブにも置く');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  const i = src.indexOf('\nfunction vnProbeAll(');
  const j = src.indexOf('\nfunction ', i + 1);
  ok(src.slice(i, j).indexOf('vnProbePublish_(') !== -1,
     '★★★調べたら、かならずドライブにも置く');

  const k = src.indexOf('\nfunction vnProbePublish_(');
  const l = src.indexOf('\nfunction ', k + 1);
  const body = src.slice(k, l);
  ok(body.indexOf('会場の読み取り状況') !== -1 || src.indexOf('VN_PROBE_FILE') !== -1,
     '　 置き場の名前が決まっている');
  ok(body.indexOf('setSharing') === -1 && body.indexOf('addEditor') === -1 &&
     body.indexOf('addViewer') === -1,
     '★★★共有の設定は、ぜったいに触らない（売上の記録のため）');
  ok(body.indexOf('getFilesByName') !== -1,
     '　 すでにあれば、作り直さずに書きかえる');
}

/* ================================================================
 * 「18:00開演」の書き方（2026/11/9 に直したところ）
 *
 *  ★それまでは「開演 18:00」の順しか見ていませんでした。
 *    日本のページは、時刻を先に書くほうが多いのです。
 *  ★いちばん重いのは2回公演の日です。
 *      13:30開演 ／ 17:30開演
 *    1つめを開演、**2つめを終演**として読んでいました。
 *    終演の15分前に車を着けるので、17:15に行かせることになります。
 *    本当に終わるのは20時ごろ。まるで逆の案内です。
 * ================================================================ */
console.log('■ 「18:00開演」の順でも読める');
{
  const r = read('<p>2026年11月10日(火)</p><p>どこかの公演</p><p>18:00開演</p>');
  const e = (r.events || [])[0] || {};
  ok(r.events.length === 1, '★★★1件 読める', r.events.length);
  ok(e.start === '18:00', '★「18:00開演」を開演として読む', e.start);
  ok(e.startKind === '開演', '★開演と分かっている（開場ではない）', e.startKind);
}
console.log('■ 2回公演の日に、2つめを終演にしない');
{
  const r = read('<p>2026年11月10日(火) 13:30開演 / 17:30開演</p><p>昼夜2回の公演</p>');
  const e = (r.events || [])[0] || {};
  /*
   * ★ここは 2026/11/10 に変えました。
   *   何回も公演がある日は、**いちばん遅い回**を使います。
   *   夜勤のタクシーに関わるのは、最後の回が終わるときだからです。
   *   1つめ（13:30）を使うと、終わりが昼になり、
   *   「17:30より後」の決まりで その日が丸ごと落ちます。
   *   実際に、社会人野球の日（10:00／14:00／18:00）が消えていました。
   */
  ok(e.start === '17:30', '★★★いちばん遅い回を開演にする（夜に車が要る回）', e.start);
  ok(e.end !== '17:30',
     '★★★2つめ（17:30開演）を終演にしない … 17:15に車を着けさせてしまう', e.end);
  ok(!e.endSure, '　 終わりは「確かなもの」にしない', e.endSure);
}
console.log('■ 「開場」を「開演」と呼ばない（前からの決まりを、こわしていない）');
{
  const r = read('<p>2026年11月10日(火)</p><p>どこかの公演</p><p>17:30開場</p>');
  const e = (r.events || [])[0] || {};
  ok(e.start === '17:30' && e.startKind === '開場',
     '★「17:30開場」は開場のまま', e.startKind);
}

/* ================================================================
 * 中身だけの置き場（JSON）も読める ―― オリックス劇場の形
 *
 *  ★ここはページを開いても文字が1つも取れません（JavaScript）。
 *    月ごとの中身が JSON で置いてあるので、そこを読みます。
 *  ★住所に年と月が入るので、{Y}{M} と書けるようにしました。
 *    毎月こちらが書きかえる形にすると、忘れた月は黙って0件になります。
 * ================================================================ */
console.log('■ 中身だけの置き場（JSON）も読める');
{
  const body = JSON.stringify([
    { id: '', detail_flg: false, private_flg: true, event_date_array: ['2026/11/4'] },
    { id: '2026-11-10', detail_flg: true,
      event_title: 'さかいゆう ツアー',
      event_sub_title: '大阪公演<br />ゲストあり',
      event_date_detail: '2026年11月10日(火) 18:30開演',
      event_date_array: ['2026/11/10'],
      // ★中身が短すぎると「JavaScriptで作る作り」と見なして捨てる決まりがあるので、
      //   本物と同じくらいの長さにしておく
      event_other_info: 'お'.repeat(700) }
  ]);
  reply = { '*': { code: 200, body: body } };
  const r = scrape({ name: 'オリックス劇場', kind: 'event',
                     url: 'https://x/update/event/{Y}/{Y}{M}event.json' },
                   new Date(2026, 10, 10));
  const e = (r.events || [])[0] || {};
  ok(r.events.length >= 1, '★★★JSON からも 1件 読める', r.events.length);
  ok(e.start === '18:30', '★開演 18:30 を読み取る', e.start);
  ok(String(e.title || '').indexOf('さかいゆう') !== -1,
     '　 公演の名前も読み取る', e.title);
}
console.log('■ 住所に、その日の年と月を入れる');
{
  const f = V('vnSrcUrl_');
  ok(f({ url: 'https://x/{Y}/{Y}{M}event.json' }, new Date(2026, 10, 10)) ===
     'https://x/2026/202611event.json', '★★★11月は 202611', f({ url: 'https://x/{Y}/{Y}{M}event.json' }, new Date(2026, 10, 10)));
  ok(f({ url: 'https://x/{Y}/{Y}{M}event.json' }, new Date(2027, 0, 5)) ===
     'https://x/2027/20271event.json', '★1月は 20271（頭に0を付けない）');
  ok(f({ url: 'https://x/plain/' }, new Date(2026, 10, 10)) === 'https://x/plain/',
     '　 ふつうの住所は、そのまま');
}
console.log('■ オリックス劇場が、読み先と会場の表に 両方入っている');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(/name:\s*"オリックス劇場"/.test(src), '★★★読み先の一覧に入っている');
  ok(/"オリックス劇場":\s*\{/.test(src), '★★★会場の表（入る人数・近い乗り場）にも入っている');
  ok(V('VN_VENUES')['オリックス劇場'].city === '大阪市西区',
     '　 大阪市西区（A地区の中）', V('VN_VENUES')['オリックス劇場'].city);
}

/* ================================================================
 * 1つのページに、いくつもの会場がならぶとき（エヴェッサの日程表）
 *
 *  ★ホームもアウェイも、同じ表にならびます。
 *      HOME 11/18(水) 19:05 Asueアリーナ大阪
 *      AWAY 11/10(火) 19:05 LaLa arena TOKYO-BAY（千葉）
 *    そのまま読むと、**千葉の試合を大阪の会場として出します。**
 *    だれも来ない会場に車を着けさせることになります。
 * ================================================================ */
console.log('■ よその会場の試合を、大阪の会場として出さない');
{
  const body =
    '<div><p>AWAY</p><p>レギュラーシーズン</p><p>2026年11月10日(火)</p>' +
    '<p>19:05</p><p>LaLa arena TOKYO-BAY</p><p>千葉J</p></div>' +
    '<div><p>HOME</p><p>レギュラーシーズン</p><p>2026年11月18日(水)</p>' +
    '<p>19:05</p><p>Asueアリーナ大阪(大阪市中央体育館)</p><p>広島</p></div>';

  // 11/10（アウェイ・千葉）の日を読ませる
  const away = read(body, { name: 'Asueアリーナ大阪',
                            must: 'Asueアリーナ|中央体育館' }, new Date(2026, 10, 10));
  ok(away.events.length === 0,
     '★★★アウェイ（千葉）の日は、1件も出さない', away.events.length);

  // 11/18（ホーム・Asueアリーナ大阪）の日を読ませる
  const home = read(body, { name: 'Asueアリーナ大阪',
                            must: 'Asueアリーナ|中央体育館' }, new Date(2026, 10, 18));
  ok(home.events.length === 1, '★★★ホームの日は、ちゃんと出す', home.events.length);
  ok((home.events[0] || {}).start === '19:05', '★開始 19:05 を読み取る',
     (home.events[0] || {}).start);

  // must を付けないと、千葉の試合まで出てしまう（＝must が効いていることの裏）
  const nofilter = read(body, { name: 'Asueアリーナ大阪' }, new Date(2026, 10, 10));
  ok(nofilter.events.length === 1,
     '　（確かめ）must が無ければ、千葉の試合まで出てしまう', nofilter.events.length);
}
console.log('■ 出すときの会場名を、読み先の名前と分けられる');
{
  const body = '<div><p>HOME</p><p>2026年11月18日(水)</p><p>19:05</p>' +
               '<p>おおきにアリーナ舞洲</p><p>広島</p></div>';
  const r = read(body, { name: '舞洲アリーナ（エヴェッサ）', venue: '舞洲アリーナ',
                         must: '舞洲' }, new Date(2026, 10, 18));
  ok(r.events.length === 1, '★★★1件 読める', r.events.length);
  ok((r.events[0] || {}).venue === '舞洲アリーナ',
     '★★★まーく様に出る会場名は「舞洲アリーナ」', (r.events[0] || {}).venue);
}
console.log('■ エヴェッサの日程表が、読み先に入っている');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(/name:\s*"Asueアリーナ大阪"/.test(src), '★★★Asueアリーナ大阪（アスエアリ）が入っている');
  ok(/must:\s*"Asueアリーナ/.test(src), '★★★アウェイを落とす しかけが付いている');
  ok(V('VN_VENUES')['Asueアリーナ大阪'].city === '大阪市港区',
     '　 大阪市港区（A地区の中）', V('VN_VENUES')['Asueアリーナ大阪'].city);
}

/* ================================================================
 * 何日かにまたがる催し（学会・展示会）の2日目を、落とさない
 *
 *  ★ご友人の資料（2026/11/9）に、こうありました。
 *      「17(土)〜18(日)に開催される数千人規模の学会」
 *    ページには「11月17日(土)〜18日(日)」と書かれます。
 *    2日目の「11月18日」という字は、どこにも出てきません。
 *    そのため、**数千人が出てくる日を、黙って落としていました。**
 * ================================================================ */
console.log('■ 会期（〜でつないだ日の幅）の中の日も、ちゃんと出す');
{
  const body = '<p>2026年11月17日(土)〜18日(日)</p><p>第20回 日本薬学会 学術総会</p>' +
               '<p>18:00開演</p>';
  const d17 = read(body, {}, new Date(2026, 10, 17));
  const d18 = read(body, {}, new Date(2026, 10, 18));
  ok(d17.events.length === 1, '★初日（17日）は、もともと出ていた', d17.events.length);
  ok(d18.events.length === 1,
     '★★★2日目（18日）も出る … 落としていた日', d18.events.length);
  const d19 = read(body, {}, new Date(2026, 10, 19));
  ok(d19.events.length === 0, '★★会期の外（19日）は、出さない', d19.events.length);
}
console.log('■ 月をまたぐ会期も読める');
{
  const body = '<p>10/31〜11/2</p><p>どこかの展示会</p><p>18:30開演</p>';
  const r = read(body, {}, new Date(2026, 10, 1));
  ok(r.events.length === 1, '★★★10/31〜11/2 の まんなか（11/1）も出る', r.events.length);
}
console.log('■ 長すぎる会期は、毎日は出さない');
{
  const f = V('vnRangeHit_');
  ok(f('11/1〜12/25 クリスマス装飾', new Date(2026, 10, 20)) === false,
     '★★★2週間より長いものは数えない（毎日おなじものが出て、催しが埋もれる）');
  ok(f('11月17日(土)〜18日(日)', new Date(2026, 10, 18)) === true, '　 2日間は数える');
  ok(f('17:00〜18:00', new Date(2026, 10, 18)) === false,
     '★★時刻の「17:00〜18:00」を、会期とまちがえない');
  ok(f('受付 9:00〜19:00', new Date(2026, 10, 18)) === false, '　 受付時間も、会期ではない');
}

/* ================================================================
 * 何日中の何日目か（1日ずつ別々にならぶ会場）
 *
 *  ★まーく様のご指示（2026/11/9）
 *    「大阪城ホールだったり、公演が連続するものについて
 *      (○日目／○日間)というのが、イベント情報に抜けています
 *      これらは全て大事なので、必ず含めてください」
 *
 *  ★大阪城ホールは1日ずつ別々にならぶので、
 *    ページのどこにも「2日間」とは書いてありません。
 *    同じ公演名が何日に出てくるかで数えるしかありません。
 * ================================================================ */
console.log('■ 1日ずつならぶ会場でも、何日目かを出す');
{
  const body = '<p>2026年11月18日(水)</p><p>米津玄師 2026 TOUR</p><p>18:00開演</p>' +
               '<p>2026年11月19日(木)</p><p>米津玄師 2026 TOUR</p><p>18:00開演</p>';
  const d18 = read(body, {}, new Date(2026, 10, 18));
  const d19 = read(body, {}, new Date(2026, 10, 19));
  ok((d18.events[0] || {}).runText === '📅 2日中の初日',
     '★★★初日と出る', (d18.events[0] || {}).runText);
  ok((d19.events[0] || {}).runText === '📅 2日中の最終日',
     '★★★最終日と出る … 打ち上げが増え、遠くまで行く車も出る',
     (d19.events[0] || {}).runText);
}
console.log('■ 1日だけの公演には、何日目かを付けない');
{
  const body = '<p>2026年11月18日(水)</p><p>どこかの公演</p><p>18:00開演</p>';
  const r = read(body, {}, new Date(2026, 10, 18));
  ok(!(r.events[0] || {}).runText, '　 1日だけなら、何も書かない', (r.events[0] || {}).runText);
}
console.log('■ ありふれた名前では、数えない（別の催しと混ざるため）');
{
  const f = V('vnRunFromPage_');
  const lines = ['11月18日', 'コンサート', '11月19日', 'コンサート'];
  ok(f(lines, 'コンサート', new Date(2026, 10, 18)) === '',
     '★★「コンサート」だけの名前では数えない');
  ok(f(lines, '米', new Date(2026, 10, 18)) === '', '　 短すぎる名前でも数えない');
}

/* ================================================================
 * 0を付けた日付（11月01日）を、読み落とさない
 *
 *  ★2026/11/10 に見つけた、いちばん重いしくじりです。
 *    京セラドームのページは「2026年11月01日（日）」と書きます。
 *    こちらは「11月1日」しかさがしていなかったので、
 *    **1日から9日までを、まるごと読み落としていました。**
 *    月の3分の1が、ずっと見えていませんでした。
 *    しかも「その日は催しが無い」と見分けがつかないので、
 *    だれも気づけませんでした。
 * ================================================================ */
console.log('■ 0を付けた日付（11月01日）も読む');
{
  const body = '<p>2026年11月03日（火・祝）</p><p>第51回社会人野球日本選手権大会</p>' +
               '<p>開始時間：18:00～</p>';
  const r = read(body, {}, new Date(2026, 10, 3));
  ok(r.events.length === 1,
     '★★★「11月03日」の書き方でも読める（1〜9日を丸ごと落としていた）', r.events.length);
  ok((r.events[0] || {}).title.indexOf('社会人野球') !== -1,
     '★催しの名前も、ちゃんと出る', (r.events[0] || {}).title);
}
console.log('■ 0を付けた月（01月05日）も読む');
{
  const body = '<p>2027年01月05日（火）</p><p>どこかの公演</p><p>18:00開演</p>';
  const r = read(body, {}, new Date(2027, 0, 5));
  ok(r.events.length === 1, '　 月のほうに0が付いていても読める', r.events.length);
}
console.log('■ 10日以降も、これまでどおり読める');
{
  const body = '<p>2026年11月10日（火）</p><p>どこかの公演</p><p>18:00開演</p>';
  ok(read(body, {}, new Date(2026, 10, 10)).events.length === 1, '　 10日');
  const b2 = '<p>11/10</p><p>どこかの公演</p><p>18:00開演</p>';
  ok(read(b2, {}, new Date(2026, 10, 10)).events.length === 1, '　 11/10 の書き方');
}

/* ================================================================
 * タクシー需要があるかどうかの手がかり（ご指示・2026/11/10）
 *   「アーティストイベント以外の場合は、果たしてタクシー需要が
 *     あるのかどうかも、載せる前にチェックしてください」
 * ================================================================ */
console.log('■ 入場料と種別を、ページから取る');
{
  const body = '<p>2026年11月03日（火・祝）</p><p>第51回社会人野球日本選手権大会</p>' +
               '<p>野球</p><p>開始時間：18:00～</p><p>入場料(円)</p><p>3,300～1,650</p>';
  const e = (read(body, {}, new Date(2026, 10, 3)).events[0]) || {};
  ok(e.fee === '3,300～1,650円', '★★★入場料を取り出す（お金を払って来る人がいる証）', e.fee);
  ok(e.genre === '野球', '★種別も取り出す', e.genre);
  ok(e.feeFree === false, '　 無料ではないと分かる');
}
console.log('■ 入場無料は、そうと分かるようにする');
{
  const body = '<p>2026年11月03日（火・祝）</p><p>どこかの発表会</p>' +
               '<p>入場無料</p><p>18:00開演</p>';
  const e = (read(body, {}, new Date(2026, 10, 3)).events[0]) || {};
  ok(e.feeFree === true, '★★入場無料だと分かる（関係者が中心のことがある）', e.feeFree);
}
console.log('■ 人が出てこない日は、出さない');
{
  const f = V('vnNoCrowd_');
  ok(f('設備点検', '') === true, '★★★設備点検の日は出さない');
  ok(f('休館日', '') === true, '　 休館の日も出さない');
  ok(f('仕込み', '') === true, '　 仕込みの日も出さない');
  ok(f('無観客試合', '') === true, '★★無観客も出さない（だれも出てこない）');
  ok(f('米津玄師 2026 TOUR', '') === false, '　 ふつうの公演は、もちろん出す');

  const body = '<p>2026年11月03日（火・祝）</p><p>設備点検</p><p>18:00開演</p>';
  ok(read(body, {}, new Date(2026, 10, 3)).events.length === 0,
     '★★★読み取りのところで、ちゃんと落ちている');
}

console.log('■ 1日に何回も公演がある日（社会人野球の形）');
{
  const body = '<p>2026年11月03日（火・祝）</p><p>第51回社会人野球日本選手権大会</p>' +
               '<p>野球</p><p>開始時間：10:00～、14:00～、18:00～</p>' +
               '<p>入場料(円)</p><p>3,300～1,650</p>';
  const e = (read(body, {}, new Date(2026, 10, 3)).events[0]) || {};
  ok(e.start === '18:00',
     '★★★いちばん遅い回（18:00）を使う … 1つめだと昼で終わり、その日が丸ごと落ちる', e.start);
  ok(e.end !== '14:00',
     '★★★2つめの開始（14:00）を終演にしない', e.end);
  ok(e.startKind === '開演', '　 「開始時間：」も開演として読む', e.startKind);
}

/* ================================================================
 * よその会場の公演を、この会場のものとして出さない（中のページ側）
 *
 *  ★梅田芸術劇場の一覧には、東京の会場の公演も混ざります
 *    （よみうり大手町ホール など）。そのまま読むと、
 *    東京の芝居を「梅田芸術劇場」として出すことになります。
 * ================================================================ */
console.log('■ 中のページでも、会場ちがいを落とす');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  const i = src.indexOf('function vnScrapeDeep_');
  const j = src.indexOf('\nfunction ', i + 1);
  const body = src.slice(i, j);
  ok(body.indexOf('src.must') !== -1,
     '★★★中のページでも、会場の名前を確かめている');

  const one = V('VN_SOURCES').filter(x => x.name === '梅田芸術劇場')[0] || {};
  ok(one.deep === true,
     '★★★梅田芸術劇場は、中のページまで開く（一覧に時刻が1行も無い）', one.deep);
  ok(/梅田芸術劇場/.test(one.must || ''),
     '★★会場ちがいを落とすしかけが付いている', one.must);
}

/* ================================================================
 * ページの中身そのものを、クロちゃんが読める場所に置く
 *
 *  ★まーく様のご指示（2026/11/10）
 *    「ページさえ開ければ、スクショなりなんなりして
 *      別の方法で読み取る方法は行えたりしないのでしょうか」
 *    「とにかく工夫してください」
 *
 *  ★クロちゃんの手元からは つなげない会場があります。
 *    でもGASからは開けています。中身を置いておけば、原因が分かります。
 * ================================================================ */
console.log('■ ページの中身を、ドライブに置ける');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(/function vnDumpAll\(/.test(src), '★★★中身を置く係がある');
  ok(src.indexOf('会場の中身.txt') !== -1, '　 置き場の名前が決まっている');

  const i = src.indexOf('function vnDumpPublish_');
  const j = src.indexOf('\nfunction ', i + 1);
  const body = src.slice(i, j);
  ok(body.indexOf('setSharing') === -1 && body.indexOf('addEditor') === -1 &&
     body.indexOf('addViewer') === -1,
     '★★★共有の設定は、ぜったいに触らない（売上の記録と同じ置き場）');
  ok(body.indexOf('getFilesByName') !== -1, '　 すでにあれば、作り直さずに書きかえる');

  const upd = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
  ok(/"venue-dump"/.test(upd), '★★頼みごとから呼べる（まーく様の指は要らない）');
  ok(upd.indexOf('vnDumpAll(j && j.venue)') !== -1,
     '　 会場を名ざしでも調べられる');
}

console.log('■ 住所を入れ替えた会場（まーく様に教えていただいた）');
{
  const one = n => (V('VN_SOURCES').filter(x => x.name === n)[0] || {});
  ok(one('花園ラグビー場').url === 'https://hanazono-liners.jp',
     '★★★花園ラグビー場の住所', one('花園ラグビー場').url);
  ok(/花園/.test(one('花園ラグビー場').must || ''),
     '★★よその会場の試合を、花園として出さない', one('花園ラグビー場').must);
  ok(one('東和薬品RACTABドーム').url === 'https://spocale.com/places/2644',
     '★★★RACTABドームの住所', one('東和薬品RACTABドーム').url);
  ok(one('インテックス大阪（ほか）').venue === 'インテックス大阪',
     '★インテックス大阪は、2つめの読み先からも拾う',
     one('インテックス大阪（ほか）').venue);
}
console.log('■ 「2027.01.23 [土]」の書き方も読める（スポカレの形）');
{
  const body = '<p>東和薬品RACTABドーム 2027.01.23 [土] 13:00 ハンドボール</p>' +
               '<p>オールジャパン メダリスト・オン・アイス</p>';
  const r = read(body, {}, new Date(2027, 0, 23));
  ok(r.events.length === 1, '★★★点でつないだ日付も読める', r.events.length);
  ok((r.events[0] || {}).start === '13:00', '　 時刻も取れる', (r.events[0] || {}).start);
}

/* ================================================================
 * イルミネーション（まーく様のご指示・2026/11/10）
 *   「大阪イベント情報(ライブ関係、イルミネーション関係)に絞り
 *     定期的に自動チェックできる仕組み作りも行ってください」
 * ================================================================ */
console.log('■ イルミネーションは、期間の中の日だけ「点灯中」にする');
{
  const on = V('vnIllumiOn_');
  ok(on('2026.12.11（金）〜12.25（金）', new Date(2026, 11, 20)) === true,
     '★期間の中なら 点灯中');
  ok(on('2026.12.11（金）〜12.25（金）', new Date(2027, 1, 15)) === false,
     '★★★とうに終わったものを「いま点いています」と出さない', );
  ok(on('2026.11.3（火・祝）〜12.31（木）17:00頃〜25:00まで', new Date(2026, 10, 20)) === true,
     '　 時刻が混じっていても、期間を読みまちがえない');
  ok(on('2026.12.20（日）〜2027.1.12（火）', new Date(2027, 0, 5)) === true,
     '★年をまたぐ期間（12月→1月）も読める');
  ok(on('時間は未定', new Date(2026, 10, 20)) === false,
     '　 期間が読めないものは、出さない');
}
console.log('■ 大阪A地区の外は、出さない');
{
  const f = V('vnIllumiInAreaA_');
  ok(f('御堂筋（阪神前交差点～難波西口交差点）') === true,
     '★★★市の名前が無くても、大阪市内と決まっている場所は出す');
  ok(f('JR住道駅前2階デッキ 大東市') === true, '　 大東市（A地区）は出す');
  ok(f('LICはびきの 交流広場 羽曳野市') === false,
     '★★★羽曳野市（A地区の外）は出さない … 行けない場所を知らせても邪魔');
  ok(f('高槻城公園') === false, '　 高槻（A地区の外）も出さない');
}
console.log('■ 1行にまとめる（催しの枠にはしない）');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  const i = src.indexOf('function vnIllumiLine_');
  const j = src.indexOf('\nfunction ', i + 1);
  const body = src.slice(i, j);
  ok(body.indexOf('slice(0, 3)') !== -1,
     '★★3つまでにする（1行は全角42文字までの決まり）');
  ok(body.indexOf('name.slice(0, 12)') !== -1, '　 長い名前は短く切る');
  ok(src.indexOf('vnIllumiLine_(day)') !== -1, '★★★知らせの中で、ちゃんと呼んでいる');
  ok(src.indexOf('try {\n    const il = vnIllumiLine_(day);') !== -1,
     '★★★ここで止まっても、イベントの知らせは止めない');
}
console.log('■ 「読めていない」と見なすまでに、60日先まで見る');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(/const VN_DUMP_DAYS = 60;/.test(src),
     '★★★4日では短すぎた … 1か月先まで何も無い会場は、ふつうにある');
  ok(src.indexOf('VN_DUMP_DAYS') !== -1 && /for \(let i = 0; i < VN_DUMP_DAYS; i\+\+\)/.test(src),
     '　 その日数を、ちゃんと使っている');
}
console.log('■ 控えは、1日1回 ひとりでに作り直す');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(/function vnDumpTick_\(/.test(src), '★★★1日1回の係がある');
  ok(src.indexOf('vnDumpTick_();') !== -1, '★★★毎日の見張りから呼んでいる（指は要らない）');
  const i = src.indexOf('function vnDumpTick_');
  const j = src.indexOf('\nfunction ', i + 1);
  ok(src.slice(i, j).indexOf('getHours() !== 3') !== -1,
     '　 夜中の3時台だけ（会場のページに迷惑をかけない）');
}

/* ================================================================
 * ホテルのディナーショー（まーく様のご指示・2026/11/10）
 *   「時刻があるはずがないので、他サイトや詳細ページも参考にして、
 *     時間を導き出してください、他のイベントも同様です」
 *   「宴会ではなく、ディナーショーという点は
 *     タクシーにとってとても重要なので」
 * ================================================================ */
console.log('■ 「・」でならべた日も読む（ホテルの書き方）');
{
  const f = V('vnDayListHit_');
  const line = '2026/12/22（火）～24（木）・26（土）';
  ok(f(line, new Date(2026, 11, 22)) === true, '★22日（はじめ）');
  ok(f(line, new Date(2026, 11, 24)) === true, '★24日（幅の終わり）');
  ok(f(line, new Date(2026, 11, 26)) === true,
     '★★★26日（・でならべた日）… ここを落としていた');
  ok(f(line, new Date(2026, 11, 25)) === false,
     '★★★25日は入っていない（やっていない日に行かせない）');
}
console.log('■ 月の書いていない「8(日)」だけの行は、数えない');
{
  const f = V('vnDayListHit_');
  ok(f('8(日)', new Date(2026, 10, 8)) === false,
     '★★★月間カレンダーの日にちだけでは数えない … 先月の表を今月と思いこむ');
  ok(f('11月8日(日)', new Date(2026, 10, 8)) === true, '　 月が書いてあれば数える');
}
console.log('■ 「ショー 19:30〜」を開演として読む');
{
  const body = '<p>2026年12月22日(火)</p><p>松田聖子クリスマスディナー＆コンサート</p>' +
               '<p>お食事 18:00～／ショー 19:30～</p>';
  const e = (read(body, {}, new Date(2026, 11, 22)).events[0]) || {};
  ok(e.start === '19:30',
     '★★★ショーの始まりを開演にする（お食事の18:00ではない）', e.start);
  ok(e.startKind === '開演', '　 開演として扱う', e.startKind);
}
console.log('■ ディナーショーだと、はっきり書く');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(src.indexOf('🍽 ディナーショー') !== -1,
     '★★★ディナーショーだと書く（宴会とは、人の出方がまるで違う）');
  ok(/dinner: \/ディナーショー/.test(src), '　 見分けるしかけがある');
  ok(src.indexOf('shArtistName_(ev.artist || ev.title)') !== -1,
     '★★アーティストの名前を、そこに出す');
}
console.log('■ 1日だけの催しにも、そう書く');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(src.indexOf('📅 本日かぎり（1日だけ）') !== -1,
     '★★★何も書かないと、調べ忘れなのか1日だけなのか分からない');
}
console.log('■ 中のページの題を、公演の名前にする');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  const i = src.indexOf('function vnScrapeDeep_');
  const j = src.indexOf('\nfunction ', i + 1);
  ok(src.slice(i, j).indexOf('<title') !== -1,
     '★★★リンクの字ではなく、ページの題を使う … 「館内案内」が公演名になっていた');
}

/* ================================================================
 * 「何時に向かえばよいか」が、かならず分かること
 *
 *  ★まーく様のご指摘（2026/11/10）
 *    「これらだけの情報で、さぁ、何時に向かおう、と、
 *      どうやったらわかると思いますか？」
 *    「タクシーの参考資料としての意味を成しているのか、
 *      必ず確認してください」
 *
 *  ★バラシの枠には、時刻が1つもありませんでした。
 *    会場と公演の名前だけでは、何時に向かえばよいか分かりません。
 * ================================================================ */
console.log('■ バラシに、同じ日・同じ会場の公演の時刻を結びつける');
{
  const f = V('vnLinkBarasiTime_');
  const list = [
    { venue: 'フェスティバルホール', kind: 'event', start: '19:00', startKind: '開演',
      end: '21:00', endSure: true },
    { venue: 'フェスティバルホール', kind: 'barasi', start: '', end: '' },
    { venue: '森ノ宮ピロティホール', kind: 'barasi', start: '', end: '' }
  ];
  f(list);
  ok(list[1].start === '19:00',
     '★★★バラシに、公演の開演が入る（何時に向かうかが分かる）', list[1].start);
  ok(list[1].end === '21:00' && list[1].endSure === true,
     '★★★終演も入る（着ける時刻が作れる）', list[1].end);
  ok(list[1].timeFrom === '公演', '　 どこから来た時刻かを覚えている');
  ok(list[2].start === '',
     '★★結びつかないものには、嘘を書かない', list[2].start);
}
console.log('■ 1日に何回も公演がある会場は、いちばん遅い回を結びつける');
{
  const f = V('vnLinkBarasiTime_');
  const list = [
    { venue: 'オリックス劇場', kind: 'event', start: '13:30', end: '16:00' },
    { venue: 'オリックス劇場', kind: 'event', start: '17:30', end: '20:00' },
    { venue: 'オリックス劇場', kind: 'barasi', start: '', end: '' }
  ];
  f(list);
  ok(list[2].start === '17:30',
     '★★★夜の回を使う（昼の回だと、搬出まで何時間も空く）', list[2].start);
}
console.log('■ 同じ会場が2回ならばない');
{
  const d = V('vnDedup_');
  const r = d([
    { venue: '大阪城ホール', kind: 'event', title: 'ベストヒット歌謡祭2026', start: '19:00' },
    { venue: '大阪城ホール', kind: 'barasi', title: 'ベストヒット歌謡祭2026（公演日）', start: '19:00' }
  ]);
  ok(r.length === 1, '★★★1つにまとまる（2回ならぶと、どちらを見るか分からない）', r.length);
  ok(r[0].kind === 'event', '　 残るのは公演のほう', r[0].kind);
  ok(r[0].hasBarasi === true,
     '★★★「このあと搬出あり」は、ちゃんと残る（バラシを落とさない）', r[0].hasBarasi);
}
console.log('■ 枠に、時刻の手がかりが必ずある');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(src.indexOf('🔧 搬出は、公演の終わり') !== -1,
     '★★★搬出がいつ始まるかを書く');
  ok(src.indexOf('🔧 この会場の公演時刻は、まだ取れていません') !== -1,
     '★★取れないときは、そうと書く（調べ忘れと見分けがつくように）');
}

console.log('■ ページの名前を、催しの名前として出さない');
{
  const NT = V('VN_NOT_TITLE');
  /*
   * ★なぜ要るか（2026/11/10）
   *   梅田芸術劇場で、こう出ていました。
   *       11/10　公演スケジュール　開始11:00〜13:30（予想）
   *   「公演スケジュール」は 一覧のページの名前で、催しではありません。
   *   11:00 も、そのページに載っていた別の時刻でした。
   *   ありもしない催しに車を向かわせることになります。
   */
  ok(NT.test('公演スケジュール') === true,
     '★★★「公演スケジュール」は催しではない');
  ok(NT.test('スケジュール') === true,
     '　 「スケジュール」も催しではない');
  ok(NT.test('イベント情報') === true,
     '　 「イベント情報」も催しではない');
  ok(NT.test('チケット') === true,
     '　 案内のページも催しではない');

  // ほんものの催しは、ぜったいに落とさない
  ok(NT.test('ベストヒット歌謡祭2026') === false,
     '★★★ほんものの催しは落とさない');
  ok(NT.test('財津和夫コンサート2026 with 姫野達也「そして」') === false,
     '　 長い名前も落とさない');
  ok(NT.test('第51回社会人野球日本選手権大会') === false,
     '　 スポーツも落とさない');
  ok(NT.test('松田聖子クリスマスディナー＆コンサート2026') === false,
     '　 ディナーショーも落とさない');
  ok(NT.test('公演スケジュール2026 ミュージカル') === false,
     '★名前の中に「公演スケジュール」が入っているだけなら、落とさない');

  /*
   * ★「読み取れませんでした」は、落としません。
   *   それは「読めていないこと」を正直に書いたものです。
   *   台帳から消すと、読めていない会場に気づけなくなります。
   */
  ok(NT.test('（名前を読み取れませんでした）') === false,
     '★★★読めていないことは、台帳から消さない');
}
console.log('■ 読み先の住所に「その年・その月」が入るものを、組み立ててから開く');
{
  /*
   * ★なぜ要るか（2026/11/10）
   *   オリックス劇場が、ずっと「つながりませんでした」でした。
   *       無効な引数: .../event/{Y}/{Y}{M}event.json
   *   住所を組み立てずに、そのまま開こうとしていました。
   */
  const src = (V('VN_SOURCES') || []).filter(function (x) {
    return /\{[YM]+\}/.test(String(x.url || ''));
  });
  ok(src.length >= 1, '　 そういう読み先が、ちゃんとある', src.length);
  if (src.length) {
    const u = ctx.vnSrcUrl_(src[0], new Date(2026, 10, 10));
    ok(u.indexOf('{') === -1, '★★★組み立てたあとに、かっこが残っていない', u);
    ok(/2026/.test(u), '　 年が入っている', u);
    ok(/11/.test(u), '　 月が入っている', u);
  }
  const body = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(body.indexOf('UrlFetchApp.fetch(src.url') === -1,
     '★★★組み立てずに そのまま開いているところが、1つも無い');
}
console.log('■ ちがう街のページを、そのまま読まない');
{
  /*
   * ★なぜ要るか（2026/11/10・実際に起きていました）
   *   Zepp のホームページは、知らない名前で開くと
   *   **だまって札幌のページを返します**。エラーになりません。
   *   読み先が「osakabay」（そんな名前はありません）だったので、
   *   札幌の催しを「Zepp Osaka Bayside」として流していました。
   *   だれも来ない街の催しに、車を向かわせるところでした。
   */
  const ss = (V('VN_SOURCES') || []);
  const bay = ss.filter(function (x) { return x.name === 'Zepp Osaka Bayside'; })[0];
  ok(!!bay, '　 読み先が、ちゃんとある');
  if (bay) {
    ok(bay.url.indexOf('osakabayside') !== -1,
       '★★★大阪ベイサイドの、正しい住所を見ている', bay.url);
    ok(bay.page === '大阪ベイサイド',
       '★★★ページに「大阪ベイサイド」と書いてあるかを、必ず確かめる', bay.page);
  }
  const nam = ss.filter(function (x) { return x.name === 'Zepp Namba'; })[0];
  ok(nam && nam.page === 'なんば',
     '　 なんばも同じように確かめる', nam && nam.page);

  // ちがう街のページが返ってきたら、1件も出さない
  reply = { '*': { code: 200, body: '<html><p>スケジュール 札幌</p><p>2026年11月11日</p>' +
                                   '<p>どこかのライブ 開演 19:00</p><p>' + 'あ'.repeat(600) + '</p></html>' } };
  const got = ctx.vnScrapeOne_({ name: 'Zepp Osaka Bayside', kind: 'event',
                                 page: '大阪ベイサイド',
                                 url: 'https://www.zepp.co.jp/hall/osakabayside/schedule/' },
                               new Date(2026, 10, 11));
  ok((got.events || []).length === 0,
     '★★★ちがうページなら、1件も出さない', (got.events || []).length);
  ok(String(got.note).indexOf('ちがうページ') !== -1,
     '★★そうと、はっきり書く（黙って0件にしない）', got.note);

  // 正しいページなら、ちゃんと読める
  reply = { '*': { code: 200, body: '<html><p>スケジュール 大阪ベイサイド</p><p>2026年11月11日</p>' +
                                   '<p>どこかのライブ 開演 19:00</p><p>' + 'あ'.repeat(600) + '</p></html>' } };
  const got2 = ctx.vnScrapeOne_({ name: 'Zepp Osaka Bayside', kind: 'event',
                                  page: '大阪ベイサイド',
                                  url: 'https://www.zepp.co.jp/hall/osakabayside/schedule/' },
                                new Date(2026, 10, 11));
  ok((got2.events || []).length >= 1,
     '★★★正しいページなら、ちゃんと読める', (got2.events || []).length);
}
console.log('■ 時刻は、どこまで詰めても落とさない');
{
  const body = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  /*
   * ★長すぎるときに「開演の行を落とす」仕組みが入っていました。
   *   そのせいで、時刻が1つも無い知らせを届けてしまいました。
   *   二度と戻らないよう、その仕組みが無いことを見張ります。
   */
  ok(body.indexOf('whenHide') === -1,
     '★★★開演を落とす仕組みが、1つも残っていない');
  ok(body.indexOf('c.artHide = 1') !== -1,
     '　 先に落とすのは、アーティストのリンクと出典');
  ok(body.indexOf('c.artNone = 1') !== -1,
     '　 次に落とすのは、アーティストの行');
}
console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
