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
  const d13 = read(body, 2026, 10, 13);
  ok(d13.events.length === 0,
     '★★★搬入だけの日（13日）は出さない … 夜の片づけが無く、空振りになる', d13.events.length);

  const d14 = read(body, 2026, 10, 14);
  ok(d14.events.length === 1,
     '★★★公演日（14日）は出す … 予定の中に「20261114」の字は無い', d14.events.length);
  const e = d14.events[0] || {};
  ok(String(e.title).indexOf('京セラドーム大阪') !== -1, '★会場の名前が出る', e.title);
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
  ok(String((r.events[0] || {}).title).indexOf('フェニーチェ堺') !== -1,
     '★残るのは堺（A地区）', (r.events[0] || {}).title);
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

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
