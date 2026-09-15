/**
 * 会場・イベント情報あつめ（006-Venue.gs）を確かめる。
 *   実行: node gas/test/venue.test.js
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

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8'), ctx);

let fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fail++; console.log('FAIL', msg, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); }
  else console.log('ok  ', msg);
};
const has = (got, want, msg) => eq(String(got).indexOf(want) !== -1, true, msg);

console.log('■ 送り先');
eq(ctx.vnTestTarget_(), 'Umark', 'テストの宛先は、登録済みの「ﾏｰｸ」');
eq(ctx.vnGroupTarget_(), '', '説明タブが無ければ、グループの宛先は空');

console.log('\n■ 長い文を、行の途中で切らずに分ける');
{
  const S = ctx.vnSplitText_;
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
  const err = ctx.vnSend_('てすと', 'test');
  eq(err, '', '送れた');
  eq(pushed.length, 1, '1回だけ送る');
  eq(pushed[0].to, 'Umark', 'まーく個人あて');
  eq(pushed[0].msgs[0].type, 'text', '文字で送る');
  has(pushed[0].msgs[0].text, 'てすと', '中身が入っている');
}

console.log('\n■ グループには、宛先が分かるまで送らない');
{
  pushed.length = 0;
  const err = ctx.vnSend_('てすと', 'group');
  eq(pushed.length, 0, 'グループの宛先が無ければ、1通も送らない');
  has(err, '分かりません', '  そう伝える');
}

console.log('\n■ ページを調べる');
{
  const today = new Date();
  const md = (today.getMonth() + 1) + '月' + today.getDate() + '日';
  reply = {};
  reply['*'] = { code: 200, body: '<html>ふつうのページ ' + md + ' コンサート</html>' };
  const one = ctx.vnProbeOne_({ name: 'x', url: 'https://example.com/' }, today);
  has(one.join('\n'), '日付が文字として入っています', '日付があれば「読める」と言う');
  has(one.join('\n'), '読み取りを作れます', '  次に進めると分かる');

  reply['*'] = { code: 200, body: '<html><head>' + '<script>var a=1;</script>'.repeat(8) + '</head><body>あ</body></html>' };
  const two = ctx.vnProbeOne_({ name: 'y', url: 'https://example.com/' }, today);
  has(two.join('\n'), 'JavaScript', '中身が空ならJavaScriptの疑いだと言う');

  reply['*'] = { code: 200, body: '<iframe src="https://calendar.google.com/calendar/embed?src=abc"></iframe>あ' };
  const three = ctx.vnProbeOne_({ name: 'z', url: 'https://example.com/' }, today);
  has(three.join('\n'), 'Googleカレンダー', 'カレンダーを使っていれば、それを教える');

  reply['*'] = { code: 404, body: '' };
  has(ctx.vnProbeOne_({ name: 'w', url: 'https://example.com/' }, today).join('\n'), '中身が取れませんでした',
      '取れなければ、はっきりそう言う');

  reply['*'] = { throw: '通信できません' };
  has(ctx.vnProbeOne_({ name: 'v', url: 'https://example.com/' }, today).join('\n'), 'つながりませんでした',
      'つながらなくても落ちない');
}

console.log('\n■ 調べたら、そのまま自分のLINEに届く');
{
  pushed.length = 0;
  reply = { '*': { code: 200, body: '<html>あ</html>' } };
  const out = ctx.panelVenueProbe();
  eq(pushed.length, 1, '自分のLINEに送る');
  eq(pushed[0].to, 'Umark', '  まーく個人あて');
  has(out, 'まーく個人のLINEにだけ送りました', '結果らんにも、そう出る');
  has(out, '大阪城ホール', '  調べた中身も出る');
  eq(pushed.every(p => p.to !== 'Cgroup'), true, 'グループには送らない');
}

console.log('\n■ 絵は1通だけ。リンクはボタンにして中へ入れる');
{
  const day = new Date(2026, 8, 16);
  const evs = ctx.vnSampleEvents_();
  const msgs = ctx.vnFitMessages_(day, evs, '');
  eq(msgs.length, 1, '送るのは1通だけ（URLの文字通は無い）');
  eq(msgs[0].type, 'flex', '絵（Flex）で送る');
  eq(msgs[0].altText, '🎪9/16(水)イベント等情報 byシバンニ', '裏メッセージの形');

  const json = JSON.stringify(msgs[0]);
  eq(ctx.lrBytes_(json) <= 9500, true, 'LINEの10KBに収まる（' + ctx.lrBytes_(json) + 'バイト）');

  eq((json.match(/"type":"button"/g) || []).length,
     (json.match(/"height":"sm"/g) || []).length, 'ボタンはどれもいちばん小さい "sm"');
  has(json, '"type":"postback"', 'お知らせのボタン（Discord・自分のLINE）が入る');
  has(json, 'vn=cal', 'カレンダーのボタンも入る（リンクは押したあとに返す）');
  eq(json.indexOf('calendar.google.com'), -1,
     '  長いリンクは絵の中に入れない（催しが入りきらなくなるため）');
  eq(json.indexOf('長押しでコピー'), -1, 'URLを文字で並べる通は、もう出さない');
}

console.log('\n■ イベントの枠そのものが、公式ページへのボタン');
{
  const day = new Date(2026, 8, 16);
  const card = ctx.vnCard_(
    { venue: '京セラドーム', kind: 'event', icon: '🏟', title: 'コンサート',
      start: '18:00', end: '21:00', people: 0,
      url: 'https://www.kyoceradome-osaka.jp/schedule/' }, 0, day);
  eq(card.action.type, 'uri', '枠を押すとリンクが開く');
  eq(card.action.uri, 'https://www.kyoceradome-osaka.jp/schedule/', '  その催しのページへ行く');
  const j = JSON.stringify(card);
  has(j, '👆 この枠を押すと「京セラドーム」の公式ページが開きます',
      '押せることが分かる案内が、枠の中に入っている');

  // URLが無い催し（ホテルの資料など）には、案内も行き先も付けない
  const noUrl = ctx.vnCard_({ venue: '帝国ホテル', kind: 'hotel', title: '周年記念', end: '21:00', url: '' }, 1, day);
  eq(noUrl.action, undefined, 'URLが無ければ、押しても何も起きないようにする');
  eq(JSON.stringify(noUrl).indexOf('この枠を押すと'), -1, '  ありもしないページの案内も出さない');

  eq(ctx.vnBtnLabel_('パナソニックスタジアム吹田'), 'パナソニックスタ…', '長い名前は詰める');
  eq(ctx.vnBtnLabel_('京セラドーム'), '京セラドーム', '短い名前はそのまま');

  // 絵ぜんたいでも、案内がちゃんと出る
  const whole = JSON.stringify(ctx.vnFitMessages_(day, ctx.vnSampleEvents_(), '')[0]);
  has(whole, '👆 各イベントの枠を押すと、その公式ページが開きます', '読み方のところにも書いてある');
  eq(whole.indexOf('🔗 もとのページ'), -1, 'URLを下にまとめて並べるのは、もうやめた');
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
  const msgs = ctx.vnFitMessages_(day, many, '');
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
  const handled = ctx.vnHandleNote_({ message: { text: 'ホテル' }, source: { userId: 'U1' }, replyToken: 'r' }, new Date());
  eq(handled, true, '「ホテル」は、この受け口が扱う');
  eq(ctx.lastReply, '', '  ここでは何も返さない（雑談のじゃまをしない）');

  // ② 次の写真は、オプチャではなくホテルとして読む
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '[{"date":"9/16","hotel":"帝国ホテル","name":"周年記念","start":"18:30","end":"20:30","people":400}]' } ] } } ] }) } };
  vm.runInContext('function geminiReady_(){ return { key: "k", model: "m" }; } function getToken_(){ return "t"; }', ctx);
  const took = ctx.vnHandleImage_({ message: { id: 'm1' }, source: { userId: 'U1' }, replyToken: 'r' }, new Date(2026, 8, 16));
  eq(took, true, '写真はホテルとして扱われた（＝オプチャには回らない）');
  has(ctx.lastReply, 'ジェバンニ', '  読み取れたときだけ返事する');
  has(ctx.lastReply, '件数：1件', '  件数が出る');
  has(ctx.lastReply, '場所：帝国ホテル', '  場所が出る');
  eq(ctx.lastReply.split('\n').length, 3, '  3行だけ（ポンポン喋らない）');
  eq(/ジェバンニが[0-9.]+秒でやってくれました/.test(ctx.lastReply), true, '  読み取りにかかった秒数も出る');

  // ③ 合図が無ければ、写真には手を出さない（今までどおりオプチャ）
  eq(ctx.vnHandleImage_({ message: { id: 'm2' }, source: { userId: 'U9' } }, new Date()), false,
     '合図が無ければ、オプチャの読み取りにそのまま渡す');

  // ④ しまった予定が、その日のぶんとして出てくる
  const day = new Date(2026, 8, 16);
  const list = ctx.vnHotelForDay_(day);
  eq(list.length, 1, 'その日の予定として残っている');
  eq(list[0].venue, '帝国ホテル', '  ホテル名も合っている');
  eq(list[0].kind, 'hotel', '  ホテルの枠に入る');
  eq(ctx.vnHotelForDay_(new Date(2026, 8, 17)).length, 0, '別の日には出てこない');

  // ⑤ 同じ資料を二度送っても、二重にならない
  ctx.vnHotelSave_([{ date: '9/16', hotel: '帝国ホテル', name: '周年記念', start: '18:30' }], day);
  eq(ctx.vnHotelForDay_(day).length, 1, '同じ予定は1つのまま');
}

console.log('\n■ 年をまたぐ日付も取り違えない');
{
  const d1 = ctx.vnHotelDate_('1/3', new Date(2026, 11, 20));
  eq(d1.getFullYear(), 2027, '12月に「1/3」とあれば、翌年');
  const d2 = ctx.vnHotelDate_('12/30', new Date(2027, 0, 5));
  eq(d2.getFullYear(), 2026, '1月に「12/30」とあれば、前年');
}

console.log('\n■ 自動発信は、はじめは切ってある');
{
  delete props.VN_AUTO;
  eq(ctx.vnAutoOn_(), false, '何も決めていなければ、送らない');
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '  1通も送らない');
}

console.log('\n■ 入れても、16:45より前には送らない');
{
  props.VN_AUTO = '1';
  triggers.length = 0;
  ctx.vnEnsureDailyTrigger_(false);
  eq(triggers.length, 1, '時計の見張りができる');
  ctx.vnEnsureDailyTrigger_(false);
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
  ctx.venueDailyJob();
  eq(pushed.length, 0, '16:30 には送らない');

  at(18, 0);
  ctx.venueDailyJob();
  eq(pushed.length, 0, '18:00 になってしまったら、その日はもう送らない');
  back();
}

console.log('\n■ 送り先が分からなければ、グループには絶対に送らない');
{
  props.VN_AUTO = '1';
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 16, 16, 46); };
  D.prototype = RealDate.prototype; D.now = RealDate.now;
  ctx.Date = D;

  pushed.length = 0;
  delete props.VNSENT_20260916;
  ctx.venueDailyJob();
  eq(pushed.length, 0, 'グループの宛先が無いので、1通も出さない');
  eq(props.VNSENT_20260916, undefined, '  「送った」印も残さない（分かったら送れるように）');

  // 宛先が分かった状態にする
  vm.runInContext('function vnGroupTarget_(){ return "Cgroup"; }', ctx);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 1, '宛先が分かれば送る');
  eq(pushed[0].to, 'Cgroup', '  グループあて');
  eq(pushed[0].msgs.length, 1, '  1通だけ');

  // 二度は送らない
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '同じ日に二度は送らない');

  // その日に何も無ければ、そもそも送らない
  props.VNSENT_20260917 = '';
  delete props.VNSENT_20260917;
  const D2 = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 17, 16, 46); };
  D2.prototype = RealDate.prototype; D2.now = RealDate.now;
  ctx.Date = D2;
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '出すものが1件も無い日は、1通も送らない（空の通知で鳴らさない）');
  ctx.Date = RealDate;
}

console.log('\n■ 自動発信の入切は、1回押しただけでは変わらない');
{
  for (const k in cache) delete cache[k];
  props.VN_AUTO = '0';
  const first = ctx.panelVenueAuto();
  has(first, 'もう一度チェック', '1回目は、やり方を出すだけ');
  eq(ctx.vnAutoOn_(), false, '  まだ入らない');
  const second = ctx.panelVenueAuto();
  has(second, '入れました', '2回目で入る');
  eq(ctx.vnAutoOn_(), true, '  入った');
}

console.log('\n■ ホテルの合図の言葉（矢印のきまりは日付メモと同じ）');
{
  const W = ctx.vnHotelWord_;
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
  for (const k in props) if (k.indexOf('VNH_') === 0) delete props[k];
  ctx.lastReply = '';
  // 帝国ホテルの資料には、紙にホテル名が書かれていない
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '[{"date":"9/18","hotel":"","name":"就任披露","start":"18:00","end":"20:00","people":350}]' } ] } } ] }) } };

  ctx.vnHandleNote_({ message: { text: '↓帝国' }, source: { userId: 'U2' }, replyToken: 'r' }, new Date());
  eq(ctx.lastReply, '', '「↓帝国」では、まだ何も返さない');

  ctx.vnHandleImage_({ message: { id: 'm9' }, source: { userId: 'U2' }, replyToken: 'r' }, new Date(2026, 8, 18));
  const list = ctx.vnHotelForDay_(new Date(2026, 8, 18));
  eq(list.length, 1, '予定が入った');
  eq(list[0].venue, '帝国ホテル', '  紙に名前が無くても「帝国ホテル」になる');
  has(ctx.lastReply, '場所：帝国ホテル', '  写真が読めたときに、場所として出る');
}

console.log('\n■ 「↑帝国」は、直前に送った写真を読み直す');
{
  for (const k in props) if (k.indexOf('VNH_') === 0) delete props[k];
  cache['LASTIMG_U3'] = 'm10';
  ctx.lastReply = '';
  ctx.vnHandleNote_({ message: { text: '↑帝国' }, source: { userId: 'U3' }, replyToken: 'r' }, new Date(2026, 8, 18));
  eq(ctx.vnHotelForDay_(new Date(2026, 8, 18)).length, 1, '直前の写真から入った');

  delete cache['LASTIMG_U4'];
  ctx.lastReply = '';
  ctx.vnHandleNote_({ message: { text: '↑ホテル' }, source: { userId: 'U4' }, replyToken: 'r' }, new Date());
  has(ctx.lastReply, '直前の写真がない', '直前の写真が無ければ、そう伝える');
}

console.log('\n■ 合図を出したのに読めなかったときは、黙らずに伝える');
{
  for (const k in cache) delete cache[k];
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [{ text: '[]' }] } } ] }) } };
  ctx.lastReply = '';
  ctx.vnHandleNote_({ message: { text: '↓帝国' }, source: { userId: 'U5' }, replyToken: 'r' }, new Date());
  ctx.lastReply = '';
  ctx.vnHandleImage_({ message: { id: 'm11' }, source: { userId: 'U5' }, replyToken: 'r' }, new Date());
  has(ctx.lastReply, 'くそっ!!!!やられた!!!!', '自分で合図を出したぶんは、読めなくても伝える');
  has(ctx.lastReply, '帝国ホテル', '  どのホテルのことかも分かる');
  eq(ctx.lastReply.split('\n').length, 1, '  それも1行だけ');
}

console.log('\n■ 話題と、触れない方がよいこと');
{
  for (const k in props) if (k.indexOf('VNAUD_') === 0) delete props[k];
  vm.runInContext('function getGeminiKey_(){ return "k"; } function getGeminiModel_(){ return "m"; }', ctx);
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '{"audience":"20〜30代女性が中心","know":"20周年の記念公演","avoid":"昨年脱退したメンバーの話"}' } ] } } ] }) } };
  const ti = ctx.vnTopicInfo_('あるアーティスト', '京セラドーム');
  eq(ti.audience, '20〜30代女性が中心', '客層が取れる');
  eq(ti.know, '20周年の記念公演', '知っておくと良いことが取れる');
  eq(ti.avoid, '昨年脱退したメンバーの話', '触れない方がよいことが取れる');

  fetched.length = 0;
  ctx.vnTopicInfo_('あるアーティスト', '京セラドーム');
  eq(fetched.length, 0, '同じ公演は二度聞かない（覚えている）');

  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [
    { text: '{"audience":"不明","know":"","avoid":"不明"}' } ] } } ] }) } };
  const un = ctx.vnTopicInfo_('だれも知らない催し2026', '');
  eq(un.audience, '', '「不明」は空にする（知ったかぶりをさせない）');
  eq(un.avoid, '', '  触れない方がよいことも同じ');
}

console.log('\n■ 催しを落とす前に、まずボタンのほうを消す');
{
  const day = new Date(2026, 8, 16);
  const evs = ctx.vnSampleEvents_();
  const full = JSON.stringify(ctx.vnBuildMessages_(day, evs, '')[0]);
  eq(ctx.lrBytes_(full) <= 9500, true,
     '見本4件なら、ボタンを付けたままでも1通に収まる（' + ctx.lrBytes_(full) + 'バイト）');
  const fit = JSON.stringify(ctx.vnFitMessages_(day, evs, '')[0]);
  has(fit, 'vn=me', '  お知らせのボタンも消えていない');

  // 催しが増えて入りきらなくなったら、催しより先にボタンを消す
  const many = evs.concat(evs);                       // 8件
  const cut = JSON.stringify(ctx.vnFitMessages_(day, many, '')[0]);
  eq(ctx.lrBytes_(cut) <= 9500, true, '上限は必ず守る（' + ctx.lrBytes_(cut) + 'バイト）');
  eq(cut.indexOf('vn=me'), -1, '  入りきらないときは、まずボタンを消す');
  eq(cut.indexOf('省きました'), -1, '  そのおかげで、催しは1件も落ちていない');
  ['京セラドーム', '大阪城ホール', 'ワントゥワン', 'リーガロイヤルホテル'].forEach(function (v) {
    has(cut, v, '  ' + v + ' が残っている');
  });

  // それでも入らないほど多ければ、最後は件数を減らし、必ず断りを書く
  const tooMany = evs.concat(evs).concat(evs).concat(evs);   // 16件
  const last = JSON.stringify(ctx.vnFitMessages_(day, tooMany, '')[0]);
  eq(ctx.lrBytes_(last) <= 9500, true, '16件でも上限は守る（' + ctx.lrBytes_(last) + 'バイト）');
  has(last, '省きました', '  減らしたときは、必ずそう書き添える');
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
  const json = JSON.stringify(ctx.vnFitMessages_(day, many, '')[0]);
  eq(ctx.lrBytes_(json) <= 9500, true, '上限は守る（' + ctx.lrBytes_(json) + 'バイト）');
  has(json, 'ここは残す', '削られても「触れない」は残っている');
  eq(json.indexOf('わだい'), -1, '  代わりに「話題」は落ちる');
}

console.log('\n■ ホームページから、その日のぶんを読む');
{
  const day = new Date(2026, 8, 15);          // 9/15(火)
  // パナソニックスタジアムのような、日付と時刻がならぶページ
  reply = { '*': { code: 200, body:
    '<html><body><table>' +
    '<tr><td>9月14日(月)</td><td>練習</td><td>10:00</td></tr>' +
    '<tr><td>9月15日(火)</td><td>ガンバ大阪 vs 鹿島アントラーズ</td><td>キックオフ 19:00</td></tr>' +
    '<tr><td>9月16日(水)</td><td>休み</td></tr>' +
    '</table>' + 'あ'.repeat(600) + '</body></table></html>' } };
  const r = ctx.vnScrapeOne_({ name: 'パナソニックスタジアム', kind: 'event',
                               url: 'https://suitacityfootballstadium.jp/schedule/' }, day);
  eq(r.events.length, 1, 'その日のぶんだけ読む（前後の日は拾わない）');
  eq(r.events[0].start, '19:00', 'キックオフを始まりにする');
  has(r.events[0].title, 'ガンバ大阪', '対戦の名前が入る');
  eq(r.events[0].end, '21:00', '終わりが書いていなければ、スタジアムは2時間で見積もる');
  eq(r.events[0].endGuess, true, '  それが「予想」だと分かる印が付く');
  eq(r.events[0].venue, 'パナソニックスタジアム', '会場名が入る');
  eq(ctx.vnInTimeRange_(r.events[0]), true, '21:00終了なので 18:00〜翌04:00 に入る');
}

console.log('\n■ 日付の書き方が違っても読む');
{
  const day = new Date(2026, 8, 15);
  const body = function (t) { return '<html><body><div>' + t + '</div>' + 'あ'.repeat(600) + '</body></html>'; };
  const one = function (t) {
    reply = { '*': { code: 200, body: body(t) } };
    return ctx.vnScrapeOne_({ name: '京セラドーム', kind: 'event', url: 'https://x/' }, day).events;
  };
  eq(one('<p>9/15</p><p>コンサート</p><p>18:00</p>').length, 1, '「9/15」でも読む');
  eq(one('<p>09-15</p><p>コンサート</p><p>18:00</p>').length, 1, '「09-15」でも読む');
  eq(one('<p>9月15日</p><p>コンサート</p><p>18:00</p>').length, 1, '「9月15日」でも読む');
  eq(one('<p>9/151</p><p>コンサート</p>').length, 0, '「9/151」を「9/15」と読み違えない');
  eq(one('<p>19/15</p><p>コンサート</p>').length, 0, '「19/15」も読み違えない');
}

console.log('\n■ 読めないときは、読めないとはっきり言う');
{
  const day = new Date(2026, 8, 15);
  reply = { '*': { code: 200, body: '<html><body><div id="app"></div><script>var a=1;</script></body></html>' } };
  has(ctx.vnScrapeOne_({ name: 'x', url: 'https://x/' }, day).note, 'JavaScript',
      '中身が空なら JavaScript の作りだと言う');
  reply = { '*': { code: 200, body: '<html><body>' + 'あ'.repeat(600) + '</body></html>' } };
  has(ctx.vnScrapeOne_({ name: 'x', url: 'https://x/' }, day).note, '日付が見当たりません',
      '日付が無ければ、そう言う');
  reply = { '*': { code: 500, body: '' } };
  has(ctx.vnScrapeOne_({ name: 'x', url: 'https://x/' }, day).note, '中身が取れませんでした',
      '返事が悪ければ、そう言う');
  reply = { '*': { throw: 'だめ' } };
  has(ctx.vnScrapeOne_({ name: 'x', url: 'https://x/' }, day).note, 'つながりませんでした',
      'つながらなくても落ちない');
}

console.log('\n■ 読み取れているものの一覧');
{
  for (const k in props) if (k.indexOf('VNH_') === 0) delete props[k];
  const day = new Date(2026, 8, 15);
  reply = { '*': { code: 200, body:
    '<html><body><p>9月15日</p><p>ガンバ大阪 vs 鹿島アントラーズ</p><p>19:00</p>' +
    'あ'.repeat(600) + '</body></html>' } };
  const text = ctx.vnReadStatus_(day);
  has(text, '大阪城ホール', 'サイトの名前がならぶ');
  has(text, 'ガンバ大阪', '読めた中身が出る');
  has(text, '読んだ文字：', '読んだ元の文字もそのまま出る（外していれば目で分かる）');
  has(text, '合計', '合計の件数が出る');
  has(text, 'ホテル', 'ホテルのぶんも出る');
  has(text, 'まだ届いていません', '  届いていなければ、そう出る');
}

console.log('\n■ お知らせの予約（終わりの◯分前）');
{
  props['VN_REMIND'] = '[]';
  delete props['VN_AUTO'];
  const day = new Date(2026, 8, 15);
  ctx.vnDaySave_(day, [{ venue: '京セラドーム', title: 'コンサート', start: '18:00', end: '21:00', url: 'https://x/' }]);

  ctx.lastReply = '';
  vm.runInContext('function lineReply_(tk, t){ lastReply = t; }', ctx);
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 15, 17, 0); };
  D.prototype = RealDate.prototype; D.now = () => new RealDate(2026, 8, 15, 17, 0).getTime();
  ctx.Date = D;

  const took = ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark' }, postback: { data: 'vn=me&d=20260915&i=0' } });
  eq(took, true, 'ボタンはこの受け口が扱う');
  has(ctx.lastReply, '20:00', '21:00の60分前＝20:00にお知らせすると返す');
  has(ctx.lastReply, 'ノートに書きました', '  デスノート調で返す');
  eq(/あと[0-9]+分…/.test(ctx.lastReply), true, '  あと何分かも出る');
  eq(JSON.parse(props['VN_REMIND']).length, 1, '予約が1つ入る');

  ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark' }, postback: { data: 'vn=me&d=20260915&i=0' } });
  eq(JSON.parse(props['VN_REMIND']).length, 1, '同じものを二度押しても、二重にならない');
  has(ctx.lastReply, 'もうノートに書いてある', '  そう伝える');

  // 時間になったら送る
  pushed.length = 0;
  D.now = () => new RealDate(2026, 8, 15, 20, 1).getTime();
  ctx.vnRemindTick_();
  eq(pushed.length, 1, '時間になったら1回送る');
  eq(pushed[0].to, 'Umark', '  押した本人に届く');
  has(pushed[0].msgs[0].text, '京セラドーム', '  中身も入っている');
  eq(JSON.parse(props['VN_REMIND']).length, 0, '  送ったら予約は消える');

  // 止まっていた間のぶんが、あとから一気に飛ばない
  props['VN_REMIND'] = JSON.stringify([{ id: 'x', at: new RealDate(2026, 8, 15, 10, 0).getTime(),
                                         how: 'me', to: 'Umark', venue: 'あ', title: '', start: '', end: '' }]);
  pushed.length = 0;
  D.now = () => new RealDate(2026, 8, 15, 20, 0).getTime();
  ctx.vnRemindTick_();
  eq(pushed.length, 0, '3時間以上すぎた予約は、もう送らない');
  ctx.Date = RealDate;
}

console.log('\n■ カレンダーに入れるリンク');
{
  const day = new Date(2026, 8, 15);
  const url = ctx.vnCalUrl_({ venue: '京セラドーム', title: 'コンサート', start: '18:00', end: '21:00', url: '' }, day);
  has(url, 'calendar.google.com/calendar/render', 'Googleカレンダーのリンク');
  has(url, 'dates=20260915T090000Z/20260915T120000Z', '日本時間18:00〜21:00を世界標準時に直している');
  has(url, encodeURIComponent('京セラドーム'), '会場名が入る');
  // 翌日にまたぐ催し
  const u2 = ctx.vnCalUrl_({ venue: '京セラドーム', title: '', start: '22:00', end: '01:00', url: '' }, day);
  has(u2, '20260915T130000Z', '22:00は当日13:00Z');
  has(u2, '20260915T160000Z', '翌01:00は当日16:00Z（日をまたいでも合う）');
}

console.log('\n■ Discordの送り先は、シートには置かない');
{
  delete props['DISCORD_WEBHOOK'];
  has(ctx.vnDiscord_('てすと'), '未設定', '未設定なら、そう言って送らない');
  props['DISCORD_WEBHOOK'] = 'https://discord.com/api/webhooks/1/2';
  fetched.length = 0;
  reply = { '*': { code: 204, body: '' } };
  eq(ctx.vnDiscord_('てすと'), '', '設定してあれば送れる');
  eq(fetched[0].url, 'https://discord.com/api/webhooks/1/2', '  その送り先へ送る');
  has(fetched[0].opt.payload, 'てすと', '  中身も入っている');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
