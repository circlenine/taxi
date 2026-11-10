/**
 * バラシ（片づけ）の予定を、公開カレンダーから読めるか確かめる。
 *   実行: node gas/test/barasi.test.js
 *
 * ★まーく様のご指示（2026/11/9）
 *   「数年間分のメッセージを送ったグループ情報は
 *     毎日、送られてきてるような情報を載せてもらえるので
 *     それ以外に、載ってない部分を、まとめられるようにしてほしいです
 *     特に、ワントゥワン情報など
 *     バラシ情報は必ず載せて欲しいところです」
 *
 * ★それまで、ワントゥワンは **ずっと0件** でした。
 *   読み先のページには予定が1文字も書かれていません。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: () => null, setProperty: () => {}, getProperties: () => ({}) }) };
ctx.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
let reply = {};
ctx.UrlFetchApp = { fetch: (url) => {
  const r = reply[url] || reply['*'] || { code: 404, body: '' };
  return { getResponseCode: () => r.code, getContentText: () => r.body };
} };
vm.runInContext('function logErr_(){} function lrPush_(){} var SENDER_MAP = {};', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8'), ctx);
const V = n => vm.runInContext(n, ctx);
const scrape = V('vnScrapeOne_');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) console.log('ok  ', msg);
  else { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
};

/** 本物と同じ形の、小さなカレンダーを作る */
const ics = (events) =>
  'BEGIN:VCALENDAR\r\nX-WR-CALNAME:コンサート\r\n' + events.join('') + 'END:VCALENDAR\r\n';
const vevent = (o) =>
  'BEGIN:VEVENT\r\n' +
  'DTSTART;VALUE=DATE:' + o.from + '\r\n' +
  'DTEND;VALUE=DATE:' + o.to + '\r\n' +
  'SUMMARY:' + o.name + '\r\n' +
  'LOCATION:' + o.place + '\r\n' +
  'DESCRIPTION:' + o.desc + '\r\n' +
  'END:VEVENT\r\n';

const SRC = { name: 'ワントゥワン', kind: 'barasi',
              ics: ['cal1@group.calendar.google.com'],
              url: 'https://onetoone-jp.com/schedule.php' };
const CAL_URL = 'https://calendar.google.com/calendar/ical/' +
                encodeURIComponent('cal1@group.calendar.google.com') +
                '/public/basic.ics';
const put = (body) => { reply = {}; reply[CAL_URL] = { code: 200, body: body }; };
const read = (body, y, m, d) => { put(body); return scrape(SRC, new Date(y, m, d)); };

/* ================================================================ */
console.log('■ 公演日は出す／搬入だけの日は出さない');
{
  // 本物と同じ形：13日に始まり、公演は14日・15日
  const body = ics([vevent({
    from: '20261113', to: '20261116', name: 'INI',
    place: '京セラドーム大阪\\, 日本、〒550-0023 大阪府大阪市西区千代崎',
    desc: '◆人員整理・案内業務等<br>搬入日：13日（金）<br>公演日：14日（土）・15日（日）<u></u>'
  })]);
  /*
   * ★ここは、まーく様のご指示で変えました（2026/11/9）。
   *     「複数日のイベントに対して搬入(初日)のお知らせも抜けてます
   *       これらは全て大事なので、必ず含めてください」
   *   はじめは「搬入の日は夜の片づけが無いから出さない」としていましたが、
   *   搬入の日にも人は動きますし、「あすから何日間の催しが始まる」と
   *   分かること自体が、待つ場所を決める材料になります。
   *   出したうえで、搬入だとはっきり書きます。
   */
  const d13 = read(body, 2026, 10, 13);
  ok(d13.events.length === 1,
     '★★★搬入の日（13日）も出す（ご指示）', d13.events.length);
  const b13 = (d13.events[0] || {}).title || '';
  ok(b13.indexOf('搬入') !== -1,
     '★★★搬入だと、はっきり書く（公演日と取りちがえさせない）', b13);
  ok(b13.indexOf('11/14 から2日間') !== -1,
     '★★★いつから何日間かも書く（次の日の支度ができる）', b13);

  const d14 = read(body, 2026, 10, 14);
  ok(d14.events.length === 1,
     '★★★公演日（14日）は出す … 予定の中に「20261114」の字は無い', d14.events.length);
  const e = d14.events[0] || {};
  /*
   * ★見出しを「実際の会場の名前」にしました
   *   （まーく様のご指摘・2026/11/10）。
   *     「何を参考にしたら良いのか全く分かりません」
   *   それまでは見出しが どれも「ワントゥワン」でした。
   *   3件ならぶと ぜんぶ同じ見出しになり、どこの話か分かりません。
   */
  ok(String(e.venue).indexOf('京セラドーム大阪') !== -1,
     '★★★見出しが、実際の会場の名前になる', e.venue);
  ok(String(e.title).indexOf('INI') !== -1, '★公演の名前が出る', e.title);
  ok(String(e.title).indexOf('公演日') !== -1, '　 その日の役目も出る', e.title);
  ok(String(e.title).indexOf('<u>') === -1 && String(e.title).indexOf('<br>') === -1,
     '★★ホームページのしるし（<u></u> など）が、そのまま届かない', e.title);
  ok(e.kind === 'barasi' && e.icon === '🔧', '　 バラシとして出る', e.kind);

  const d15 = read(body, 2026, 10, 15);
  ok(d15.events.length === 1, '★公演日（15日・最終日）も出す', d15.events.length);
  const d16 = read(body, 2026, 10, 16);
  ok(d16.events.length === 0, '★公演が終わった日（16日）は出さない', d16.events.length);
}

console.log('■ 何日中の何日目かを、かならず出す');
{
  const body = ics([vevent({
    from: '20261113', to: '20261116', name: 'INI',
    place: '京セラドーム大阪\\, 日本、〒550-0023 大阪府大阪市西区千代崎',
    desc: '搬入日：13日（金）<br>公演日：14日（土）・15日（日）'
  })]);
  const t14 = ((read(body, 2026, 10, 14).events[0]) || {}).title || '';
  const t15 = ((read(body, 2026, 10, 15).events[0]) || {}).title || '';
  ok(t14.indexOf('2日中の初日') !== -1, '★★★初日と書く', t14);
  ok(t15.indexOf('2日中の最終日') !== -1,
     '★★★最終日と書く … 打ち上げが増え、遠くまで行く車も出る', t15);
}
console.log('■ 1日だけの催しに「1日間」と書かない');
{
  const body = ics([vevent({
    from: '20261113', to: '20261115', name: 'こんがり音楽祭',
    place: '大阪城音楽堂\\, 日本、〒540-0002 大阪府大阪市中央区',
    desc: '搬入日：13日（金）<br>公演日：14日（土）'
  })]);
  const t = ((read(body, 2026, 10, 13).events[0]) || {}).title || '';
  ok(t.indexOf('公演は 11/14') !== -1 && t.indexOf('1日間') === -1,
     '　 「公演は 11/14」とだけ書く', t);
}

console.log('■ 大阪A地区の外は、1件も出さない');
{
  const body = ics([
    vevent({ from: '20261114', to: '20261115', name: '男性アイドル',
             place: '神戸国際会館こくさいホール\\, 日本、〒651-0087 兵庫県神戸市中央区',
             desc: '公演日：14日（土）' }),
    vevent({ from: '20261114', to: '20261115', name: 'ASKA',
             place: 'ロームシアター京都\\, 日本、〒606-8342 京都府京都市左京区',
             desc: '公演日：14日（土）' }),
    vevent({ from: '20261114', to: '20261115', name: '東京混声合唱団',
             place: 'フェニーチェ堺\\, 日本、〒590-0078 大阪府堺市堺区翁橋町',
             desc: '公演日：14日（土）' })
  ]);
  const r = read(body, 2026, 10, 14);
  ok(r.events.length === 1, '★★★大阪A地区の1件だけが出る', r.events.length);
  ok(String((r.events[0] || {}).venue).indexOf('フェニーチェ堺') !== -1,
     '★残るのは堺（A地区）', (r.events[0] || {}).venue);
}

console.log('■ 時刻が書いていなくても、バラシは落とさない');
{
  const e = { kind: 'barasi', start: '', end: '' };
  ok(V('vnHasTime_')(e) === true,
     '★★★時刻が無くても、バラシは出す（ご指示）');
  ok(V('vnInTimeRange_')(e) === true,
     '★★★時間帯の決まりでも、バラシは落とさない（公演のあと＝かならず夜）');
  // ふつうの催しは、これまでどおり時刻が要る
  ok(V('vnHasTime_')({ kind: 'event', start: '', end: '' }) === false,
     '　 ふつうの催しは、これまでどおり時刻が無ければ出さない');
}

console.log('■ 日にちの書き方を、ひらける');
{
  const f = V('vnIcsDaySet_');
  const a = f('14日（土）・15日（日）', 2026, 11);
  ok(a['20261114'] && a['20261115'] && !a['20261116'], '★「・」でならべた日');
  const b = f('12日（木）～23日（月）', 2026, 11);
  ok(b['20261112'] && b['20261118'] && b['20261123'] && !b['20261124'],
     '★★「～」でつないだ日は、あいだも ぜんぶ');
  const c = f('11月24日（火）～26日（木）', 2026, 11);
  ok(c['20261124'] && c['20261125'] && c['20261126'], '　 月が書いてあっても読める');
  const d = f('1月3日（日）', 2026, 12);
  ok(d['20270103'], '★年をまたぐとき（12月→1月）も、まちがえない');
}

console.log('■ カレンダーが読めないときも、黙って落ちない');
{
  reply = { '*': { code: 404, body: '' } };
  const r = scrape(SRC, new Date(2026, 10, 14));
  ok(r.events.length === 0, '　 読めなければ0件');
  ok(String(r.note).indexOf('読めません') !== -1, '★★黙らずに、読めなかったと書く', r.note);
}

console.log('■ ワントゥワンが、公開カレンダーを読む形になっている');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  const one = V('VN_SOURCES').filter(x => x.name === 'ワントゥワン')[0] || {};
  ok(one.kind === 'barasi', '　 バラシとして登録されている');
  ok((one.ics || []).length >= 3,
     '★★★公開カレンダーを読む形になっている（ページには予定が1文字も無い）', (one.ics || []).length);
  ok(src.indexOf('calendar.google.com/calendar/ical/') !== -1,
     '　 公開されている置き場を読んでいる（新しい許可は要らない）');
}

console.log('■ バラシに「終演が分かりません」と書かない');
{
  const body = ics([vevent({
    from: '20261111', to: '20261112', name: 'Jason Mraz',
    place: 'フェスティバルホール\\, 日本、〒530-0005 大阪府大阪市北区中之島',
    desc: '公演日：11日（水）'
  })]);
  const e = (read(body, 2026, 10, 11).events[0]) || {};
  ok(e.venue === 'フェスティバルホール', '★★★見出しは会場の名前', e.venue);
  ok(String(e.title).indexOf('Jason Mraz') !== -1, '　 本文は公演の名前', e.title);
  ok(String(e.title).indexOf('ワントゥワン') === -1,
     '　 会社の名前は、見出しにも本文にも出さない', e.title);
  /*
   * ★まーく様のご指示（2026/11/10）
   *     「終演の情報がわかっていないという文言はいらない」
   */
  const line = V('vnArriveText_')(e);
  ok(line === '', '★★★「終演が分かりません」の行を、まるごと出さない', line);
}

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
