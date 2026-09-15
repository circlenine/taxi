/**
 * イベント情報あつめ（006-Events.gs）を確かめる。
 *   実行: node gas/test/events.test.js
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);

const props = { LINE_TOKEN: 'tok' };
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = String(v); } }) };

let fetched = [], reply = {};
ctx.UrlFetchApp = { fetch: (url, opt) => {
  fetched.push({ url: url, opt: opt });
  const r = reply[url] || reply['*'] || { code: 200, body: '' };
  if (r.throw) throw new Error(r.throw);
  return { getResponseCode: () => r.code, getContentText: () => r.body,
           getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [] }) };
} };
let pushed = [];
ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); },
  getActiveSpreadsheet: () => ({ getSheetByName: () => null }) };

// --- Apps Script のしくみの写し（テスト用）---
const cache = {};
ctx.CacheService = { getScriptCache: () => ({
  get: k => (k in cache ? cache[k] : null),
  put: (k, v) => { cache[k] = String(v); },
  remove: k => { delete cache[k]; } }) };
ctx.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
let triggers = [];
ctx.ScriptApp = {
  getProjectTriggers: () => triggers,
  deleteTrigger: t => { triggers = triggers.filter(x => x !== t); },
  newTrigger: fn => ({ timeBased: () => ({
    everyMinutes: () => ({ create: () => { triggers.push({ getHandlerFunction: () => fn }); } }) }) })
};
ctx.Utilities = {
  DigestAlgorithm: { MD5: 'MD5' }, Charset: { UTF_8: 'UTF_8' },
  computeDigest: (a, t) => { const o = []; for (let i = 0; i < 16; i++) o.push((t.charCodeAt(i % t.length) * (i + 7)) & 255); return o; },
  base64Encode: () => 'x'
};
// lrBytes_（003-LineReport のバイト数え）の写し
vm.runInContext(`function lrBytes_(s){let n=0;for(let i=0;i<s.length;i++){const c=s.codePointAt(i);
  if(c<0x80)n+=1;else if(c<0x800)n+=2;else if(c>0xffff){n+=4;i++;}else n+=3;}return n;}`, ctx);
vm.runInContext('function logErr_(){} function SENDER_MAP(){}', ctx);
vm.runInContext('var SENDER_MAP = { "Umark": "ﾏｰｸ", "Uother": "ｼｭﾝ" };', ctx);
vm.runInContext('function lrPush_(to, msgs){ pushLog.push({ to: to, msgs: msgs }); }', ctx);
ctx.pushLog = pushed;

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '006-Events.gs'), 'utf8'), ctx);

let fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fail++; console.log('FAIL', msg, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); }
  else console.log('ok  ', msg);
};
const has = (got, want, msg) => eq(String(got).indexOf(want) !== -1, true, msg);

console.log('■ 送り先');
eq(ctx.evTestTarget_(), 'Umark', 'テストの宛先は、登録済みの「ﾏｰｸ」');
eq(ctx.evGroupTarget_(), '', '説明タブが無ければ、グループの宛先は空');

console.log('\n■ 長い文を、行の途中で切らずに分ける');
{
  const S = ctx.evSplitText_;
  eq(S('あ\nい\nう', 100).length, 1, '短ければ1つのまま');
  const parts = S(('あいうえお\n').repeat(50), 100);
  eq(parts.length > 1, true, '長ければ分ける（' + parts.length + '個）');
  eq(parts.every(p => p.length <= 100), true, '  どれも上限を超えない');
  eq(parts.join('').replace(/\n/g, ''), ('あいうえお').repeat(50), '  中身は1文字も欠けない');
  eq(parts.every(p => p.endsWith('\n')), true, '  行の途中では切らない');
  const one = S('あ'.repeat(300), 100);
  eq(one.every(p => p.length <= 100), true, '1行だけで長すぎても、上限は守る');
}

console.log('\n■ テスト送信は、自分だけに行く');
{
  pushed.length = 0;
  const err = ctx.evSend_('てすと', 'test');
  eq(err, '', '送れた');
  eq(pushed.length, 1, '1回だけ送る');
  eq(pushed[0].to, 'Umark', 'まーく個人あて');
  eq(pushed[0].msgs[0].type, 'text', '文字で送る');
  has(pushed[0].msgs[0].text, 'てすと', '中身が入っている');
}

console.log('\n■ グループには、宛先が分かるまで送らない');
{
  pushed.length = 0;
  const err = ctx.evSend_('てすと', 'group');
  eq(pushed.length, 0, 'グループの宛先が無ければ、1通も送らない');
  has(err, '分かりません', '  そう伝える');
}

console.log('\n■ ページを調べる');
{
  const today = new Date();
  const md = (today.getMonth() + 1) + '月' + today.getDate() + '日';
  reply = {};
  reply['*'] = { code: 200, body: '<html>ふつうのページ ' + md + ' コンサート</html>' };
  const one = ctx.evProbeOne_({ name: 'x', url: 'https://example.com/' }, today);
  has(one.join('\n'), '日付が文字として入っています', '日付があれば「読める」と言う');
  has(one.join('\n'), '読み取りを作れます', '  次に進めると分かる');

  reply['*'] = { code: 200, body: '<html><head>' + '<script>var a=1;</script>'.repeat(8) + '</head><body>あ</body></html>' };
  const two = ctx.evProbeOne_({ name: 'y', url: 'https://example.com/' }, today);
  has(two.join('\n'), 'JavaScript', '中身が空ならJavaScriptの疑いだと言う');

  reply['*'] = { code: 200, body: '<iframe src="https://calendar.google.com/calendar/embed?src=abc"></iframe>あ' };
  const three = ctx.evProbeOne_({ name: 'z', url: 'https://example.com/' }, today);
  has(three.join('\n'), 'Googleカレンダー', 'カレンダーを使っていれば、それを教える');

  reply['*'] = { code: 404, body: '' };
  has(ctx.evProbeOne_({ name: 'w', url: 'https://example.com/' }, today).join('\n'), '中身が取れませんでした',
      '取れなければ、はっきりそう言う');

  reply['*'] = { throw: '通信できません' };
  has(ctx.evProbeOne_({ name: 'v', url: 'https://example.com/' }, today).join('\n'), 'つながりませんでした',
      'つながらなくても落ちない');
}

console.log('\n■ 調べたら、そのまま自分のLINEに届く');
{
  pushed.length = 0;
  reply = { '*': { code: 200, body: '<html>あ</html>' } };
  const out = ctx.panelEventProbe();
  eq(pushed.length, 1, '自分のLINEに送る');
  eq(pushed[0].to, 'Umark', '  まーく個人あて');
  has(out, 'まーく個人のLINEにだけ送りました', '結果らんにも、そう出る');
  has(out, '大阪城ホール', '  調べた中身も出る');
  eq(pushed.every(p => p.to !== 'Cgroup'), true, 'グループには送らない');
}

console.log('\n■ 絵は1通だけ。リンクはボタンにして中へ入れる');
{
  const day = new Date(2026, 8, 16);
  const evs = ctx.evSampleEvents_();
  const msgs = ctx.evFitMessages_(day, evs, '');
  eq(msgs.length, 1, '送るのは1通だけ（URLの文字通は無い）');
  eq(msgs[0].type, 'flex', '絵（Flex）で送る');
  eq(msgs[0].altText, '🎪9/16(水)イベント等情報 byシバンニ', '裏メッセージの形');

  const json = JSON.stringify(msgs[0]);
  eq(ctx.lrBytes_(json) <= 9500, true, 'LINEの10KBに収まる（' + ctx.lrBytes_(json) + 'バイト）');

  const btns = json.match(/"type":"button"/g) || [];
  eq(btns.length, 3, 'URLのあるぶんだけボタンになる（3つ）');
  eq((json.match(/"height":"sm"/g) || []).length, 3, 'ボタンはいちばん小さい "sm"');
  has(json, '🔗 もとのページ', '「もとのページ」の見出しが入る');
  eq(json.indexOf('長押しでコピー'), -1, 'URLを文字で並べる通は、もう出さない');
}

console.log('\n■ ボタンは横に2つずつ。余ったら幅をそろえる');
{
  const rows = ctx.evLinkRows_([
    { venue: 'あ', url: 'https://a/' }, { venue: 'い', url: 'https://b/' },
    { venue: 'う', url: 'https://c/' }
  ]);
  eq(rows.length, 2, '3つなら2段');
  eq(rows[0].contents.length, 2, '1段目は2つ');
  eq(rows[1].contents[1].contents[0].type, 'filler', '余った右側は空けて幅をそろえる');
  eq(ctx.evLinkRows_([{ venue: 'あ', url: 'https://a/' }, { venue: 'い', url: 'https://a/' }]).length, 1,
     '同じURLは1つにまとめる');
  eq(ctx.evBtnLabel_('パナソニックスタジアム吹田'), 'パナソニックスタ…', '長い名前は詰める');
  eq(ctx.evBtnLabel_('京セラドーム'), '京セラドーム', '短い名前はそのまま');
}

console.log('\n■ 1通に入りきらないときは、細かい話から削る');
{
  const day = new Date(2026, 8, 16);
  const many = [];
  for (let i = 0; i < 40; i++) {
    many.push({ venue: '京セラドーム', kind: 'event', icon: '🏟',
      title: 'とても長い公演名'.repeat(6), start: '18:00', end: '21:00', people: 0,
      url: 'https://example.com/' + i,
      stats: 'じっせき'.repeat(20), guess: 'すいてい'.repeat(20), advice: 'じょげん'.repeat(20) });
  }
  const msgs = ctx.evFitMessages_(day, many, '');
  eq(msgs.length, 1, 'それでも1通のまま');
  eq(ctx.lrBytes_(JSON.stringify(msgs[0])) <= 9500, true,
     '上限を必ず守る（' + ctx.lrBytes_(JSON.stringify(msgs[0])) + 'バイト）');
  has(JSON.stringify(msgs[0]), '省きました', '削ったことは必ず書き添える');
}

console.log('\n■ ホテルの資料は、オプチャと取り違えない');
{
  for (const k in cache) delete cache[k];
  // ①「ホテル」と打つ → 合図が立つ
  let replied = '';
  vm.runInContext('function lineReply_(tk, t){ lastReply = t; }', ctx);
  ctx.lastReply = '';
  const handled = ctx.evHandleNote_({ message: { text: 'ホテル' }, source: { userId: 'U1' }, replyToken: 'r' }, new Date());
  eq(handled, true, '「ホテル」は、この受け口が扱う');
  has(ctx.lastReply, 'ホテルの予定として読みます', '  そう返事する');

  // ② 次の写真は、オプチャではなくホテルとして読む
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '[{"date":"9/16","hotel":"帝国ホテル","name":"周年記念","start":"18:30","end":"20:30","people":400}]' } ] } } ] }) } };
  vm.runInContext('function geminiReady_(){ return { key: "k", model: "m" }; } function getToken_(){ return "t"; }', ctx);
  const took = ctx.evHandleImage_({ message: { id: 'm1' }, source: { userId: 'U1' }, replyToken: 'r' }, new Date(2026, 8, 16));
  eq(took, true, '写真はホテルとして扱われた（＝オプチャには回らない）');
  has(ctx.lastReply, 'ホテルの予定として読み取りました', '  そう返事する');
  has(ctx.lastReply, '乗車記録には入れていません', '  乗車記録に入れないと、はっきり書く');

  // ③ 合図が無ければ、写真には手を出さない（今までどおりオプチャ）
  eq(ctx.evHandleImage_({ message: { id: 'm2' }, source: { userId: 'U9' } }, new Date()), false,
     '合図が無ければ、オプチャの読み取りにそのまま渡す');

  // ④ しまった予定が、その日のぶんとして出てくる
  const day = new Date(2026, 8, 16);
  const list = ctx.evHotelForDay_(day);
  eq(list.length, 1, 'その日の予定として残っている');
  eq(list[0].venue, '帝国ホテル', '  ホテル名も合っている');
  eq(list[0].kind, 'hotel', '  ホテルの枠に入る');
  eq(ctx.evHotelForDay_(new Date(2026, 8, 17)).length, 0, '別の日には出てこない');

  // ⑤ 同じ資料を二度送っても、二重にならない
  ctx.evHotelSave_([{ date: '9/16', hotel: '帝国ホテル', name: '周年記念', start: '18:30' }], day);
  eq(ctx.evHotelForDay_(day).length, 1, '同じ予定は1つのまま');
}

console.log('\n■ 年をまたぐ日付も取り違えない');
{
  const d1 = ctx.evHotelDate_('1/3', new Date(2026, 11, 20));
  eq(d1.getFullYear(), 2027, '12月に「1/3」とあれば、翌年');
  const d2 = ctx.evHotelDate_('12/30', new Date(2027, 0, 5));
  eq(d2.getFullYear(), 2026, '1月に「12/30」とあれば、前年');
}

console.log('\n■ 自動発信は、はじめは切ってある');
{
  delete props.EV_AUTO;
  eq(ctx.evAutoOn_(), false, '何も決めていなければ、送らない');
  pushed.length = 0;
  ctx.eventDailyJob();
  eq(pushed.length, 0, '  1通も送らない');
}

console.log('\n■ 入れても、16:45より前には送らない');
{
  props.EV_AUTO = '1';
  triggers.length = 0;
  ctx.ensureEventDailyTrigger_(false);
  eq(triggers.length, 1, '時計の見張りができる');
  ctx.ensureEventDailyTrigger_(false);
  eq(triggers.length, 1, '  二重には作らない');

  const RealDate = Date;
  const at = (h, m) => {
    const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 16, h, m); };
    D.prototype = RealDate.prototype;
    D.now = RealDate.now;
    ctx.Date = D;
  };
  const back = () => { ctx.Date = RealDate; };

  at(16, 30);
  pushed.length = 0;
  ctx.eventDailyJob();
  eq(pushed.length, 0, '16:30 には送らない');

  at(18, 0);
  ctx.eventDailyJob();
  eq(pushed.length, 0, '18:00 になってしまったら、その日はもう送らない');
  back();
}

console.log('\n■ 送り先が分からなければ、グループには絶対に送らない');
{
  props.EV_AUTO = '1';
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 16, 16, 46); };
  D.prototype = RealDate.prototype; D.now = RealDate.now;
  ctx.Date = D;

  pushed.length = 0;
  delete props.EVSENT_20260916;
  ctx.eventDailyJob();
  eq(pushed.length, 0, 'グループの宛先が無いので、1通も出さない');
  eq(props.EVSENT_20260916, undefined, '  「送った」印も残さない（分かったら送れるように）');

  // 宛先が分かった状態にする
  vm.runInContext('function evGroupTarget_(){ return "Cgroup"; }', ctx);
  pushed.length = 0;
  ctx.eventDailyJob();
  eq(pushed.length, 1, '宛先が分かれば送る');
  eq(pushed[0].to, 'Cgroup', '  グループあて');
  eq(pushed[0].msgs.length, 1, '  1通だけ');

  // 二度は送らない
  pushed.length = 0;
  ctx.eventDailyJob();
  eq(pushed.length, 0, '同じ日に二度は送らない');

  // その日に何も無ければ、そもそも送らない
  props.EVSENT_20260917 = '';
  delete props.EVSENT_20260917;
  const D2 = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 17, 16, 46); };
  D2.prototype = RealDate.prototype; D2.now = RealDate.now;
  ctx.Date = D2;
  pushed.length = 0;
  ctx.eventDailyJob();
  eq(pushed.length, 0, '出すものが1件も無い日は、1通も送らない（空の通知で鳴らさない）');
  ctx.Date = RealDate;
}

console.log('\n■ 自動発信の入切は、1回押しただけでは変わらない');
{
  for (const k in cache) delete cache[k];
  props.EV_AUTO = '0';
  const first = ctx.panelEventAuto();
  has(first, 'もう一度チェック', '1回目は、やり方を出すだけ');
  eq(ctx.evAutoOn_(), false, '  まだ入らない');
  const second = ctx.panelEventAuto();
  has(second, '入れました', '2回目で入る');
  eq(ctx.evAutoOn_(), true, '  入った');
}

console.log('\n■ ホテルの合図の言葉（矢印のきまりは日付メモと同じ）');
{
  const W = ctx.evHotelWord_;
  eq(W('帝国').force, '帝国ホテル', '「帝国」は帝国ホテル');
  eq(W('↓帝国').force, '帝国ホテル', '「↓帝国」も帝国ホテル');
  eq(W('↓帝国').up, false, '  ↓ は「これから送る写真」');
  eq(W('↑帝国').up, true, '  ↑ は「直前に送った写真」');
  eq(W('ホテル').force, '', '「ホテル」はホテル名を決めない（紙のタイトルから読む）');
  eq(W('↓ホテル').force, '', '「↓ホテル」も同じ');
  eq(W('↓🏨').force, '', '「↓🏨」も同じ');
  eq(W('リーガ').force, 'リーガロイヤルホテル', '「リーガ」はリーガロイヤル');
  eq(W('帝国ホテルの件ですが'), null, '文章の中にあるだけなら、合図にしない');
  eq(W('こんばんは'), null, 'ふつうの雑談は、合図にしない');
}

console.log('\n■ 「↓帝国」なら、紙にホテル名が無くても帝国ホテルとして入る');
{
  for (const k in cache) delete cache[k];
  for (const k in props) if (k.indexOf('EVH_') === 0) delete props[k];
  ctx.lastReply = '';
  // 帝国ホテルの資料には、紙にホテル名が書かれていない
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '[{"date":"9/18","hotel":"","name":"就任披露","start":"18:00","end":"20:00","people":350}]' } ] } } ] }) } };

  ctx.evHandleNote_({ message: { text: '↓帝国' }, source: { userId: 'U2' }, replyToken: 'r' }, new Date());
  has(ctx.lastReply, '帝国ホテルの予定として読みます', '「↓帝国」でそう返事する');

  ctx.evHandleImage_({ message: { id: 'm9' }, source: { userId: 'U2' }, replyToken: 'r' }, new Date(2026, 8, 18));
  const list = ctx.evHotelForDay_(new Date(2026, 8, 18));
  eq(list.length, 1, '予定が入った');
  eq(list[0].venue, '帝国ホテル', '  紙に名前が無くても「帝国ホテル」になる');
  has(ctx.lastReply, '帝国ホテル', '  返事にもホテル名が出る');
}

console.log('\n■ 「↑帝国」は、直前に送った写真を読み直す');
{
  for (const k in props) if (k.indexOf('EVH_') === 0) delete props[k];
  cache['LASTIMG_U3'] = 'm10';
  ctx.lastReply = '';
  ctx.evHandleNote_({ message: { text: '↑帝国' }, source: { userId: 'U3' }, replyToken: 'r' }, new Date(2026, 8, 18));
  eq(ctx.evHotelForDay_(new Date(2026, 8, 18)).length, 1, '直前の写真から入った');

  delete cache['LASTIMG_U4'];
  ctx.lastReply = '';
  ctx.evHandleNote_({ message: { text: '↑ホテル' }, source: { userId: 'U4' }, replyToken: 'r' }, new Date());
  has(ctx.lastReply, '直前の写真が見つかりません', '直前の写真が無ければ、そう伝える');
}

console.log('\n■ 合図を出したのに読めなかったときは、黙らずに伝える');
{
  for (const k in cache) delete cache[k];
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [{ text: '[]' }] } } ] }) } };
  ctx.lastReply = '';
  ctx.evHandleNote_({ message: { text: '↓帝国' }, source: { userId: 'U5' }, replyToken: 'r' }, new Date());
  ctx.lastReply = '';
  ctx.evHandleImage_({ message: { id: 'm11' }, source: { userId: 'U5' }, replyToken: 'r' }, new Date());
  has(ctx.lastReply, '読み取れませんでした', '自分で合図を出したぶんは、読めなくても伝える');
  has(ctx.lastReply, '帝国ホテル', '  どのホテルのことかも分かる');
}

console.log('\n■ 話題と、触れない方がよいこと');
{
  for (const k in props) if (k.indexOf('EVAUD_') === 0) delete props[k];
  vm.runInContext('function getGeminiKey_(){ return "k"; } function getGeminiModel_(){ return "m"; }', ctx);
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '{"audience":"20〜30代女性が中心","know":"20周年の記念公演","avoid":"昨年脱退したメンバーの話"}' } ] } } ] }) } };
  const ti = ctx.evTopicInfo_('あるアーティスト', '京セラドーム');
  eq(ti.audience, '20〜30代女性が中心', '客層が取れる');
  eq(ti.know, '20周年の記念公演', '知っておくと良いことが取れる');
  eq(ti.avoid, '昨年脱退したメンバーの話', '触れない方がよいことが取れる');

  fetched.length = 0;
  ctx.evTopicInfo_('あるアーティスト', '京セラドーム');
  eq(fetched.length, 0, '同じ公演は二度聞かない（覚えている）');

  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '{"audience":"不明","know":"","avoid":"不明"}' } ] } } ] }) } };
  const un = ctx.evTopicInfo_('だれも知らない催し2026', '');
  eq(un.audience, '', '「不明」は空にする（知ったかぶりをさせない）');
  eq(un.avoid, '', '  触れない方がよいことも同じ');
}

console.log('\n■ 触れない方がよいことは、いちばん最後まで残す');
{
  const day = new Date(2026, 8, 16);
  const many = [];
  for (let i = 0; i < 30; i++) {
    many.push({ venue: '京セラドーム', kind: 'event', icon: '🏟',
      title: 'とても長い公演名'.repeat(6), start: '18:00', end: '21:00', people: 0,
      url: 'https://example.com/' + i,
      stats: 'じっせき'.repeat(20), guess: 'すいてい'.repeat(20),
      know: 'わだい'.repeat(20), avoid: 'ここは残す', advice: 'じょげん'.repeat(20) });
  }
  const json = JSON.stringify(ctx.evFitMessages_(day, many, '')[0]);
  eq(ctx.lrBytes_(json) <= 9500, true, '上限は守る（' + ctx.lrBytes_(json) + 'バイト）');
  has(json, 'ここは残す', '削られても「触れない」は残っている');
  eq(json.indexOf('わだい'), -1, '  代わりに「話題」は落ちる');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
