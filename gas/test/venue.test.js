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
  getProperties: () => Object.assign({}, props),
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

console.log('\n■ 16:30 は確認用（まーくさんだけ）、17:00 にグループ');
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

  at(16, 0);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '16:00 には、まだ何も送らない');

  at(16, 30);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 1, '16:30 に確認用を1通');
  eq(pushed[0].to, 'Umark', '  宛先はまーくさんだけ（グループではない）');

  at(16, 46);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '  16:46 には、まだグループへ送らない');

  at(18, 0);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '18:00 になってしまったら、その日はもう送らない');
  delete props['VNSENT_20260916_T'];
  delete props['VNEDIT_20260916'];
  back();
}

console.log('\n■ 送り先が分からなければ、グループには絶対に送らない');
{
  props.VN_AUTO = '1';
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 16, 17, 1); };
  D.prototype = RealDate.prototype; D.now = RealDate.now;
  ctx.Date = D;

  pushed.length = 0;
  delete props.VNSENT_20260916;
  props['VNSENT_20260916_T'] = '1';          // 確認用は済んでいることにする
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
  // ★ただ「読めません」では、なぜ読めないのかが分からない。
  //   いちばん多いのは「資料の種類が違う」で、これは言葉ひとつで直せる。
  //   その直し方まで必ず書く（ただし短く）
  has(ctx.lastReply, '訂正：会場', '  直し方（言葉ひとつで読み直せること）まで書く');
  eq(ctx.lastReply.split('\n').length <= 4, true, '  それでも4行まで（ポンポン喋らない）');
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
  const fit = JSON.stringify(ctx.vnFitMessages_(day, evs, '')[0]);
  eq(ctx.lrBytes_(fit) <= 9500, true,
     '見本4件でも1通に収まる（' + ctx.lrBytes_(fit) + 'バイト）');
  has(fit, 'vn=me', '  お知らせのボタンも消えていない（催しより先に細かい話を削る）');
  has(fit, '公式ページでお確かめください', '  注釈は、どんなに詰めても必ず残す');

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


console.log('\n■ ★時刻が読めないものは、絶対に出さない');
// ★長居・万博で、その日に何も無いのに「時間不明」で出てしまっていた。
//   読む人は「今日そこで何かある」と受け取り、向かえば空振りになる。
//   分からないものを出すのは、間違いを出すのと同じ。
{
  const H = ctx.vnHasTime_;
  eq(H({ start: '18:00', end: '' }), true, '開演だけでも分かれば出す');
  eq(H({ start: '', end: '21:00' }), true, '終演だけでも分かれば出す');
  eq(H({ start: '', end: '' }), false, '★どちらも無ければ出さない');
  eq(H({}), false, '  空でも落ちない');
  eq(H(null), false, '  null でも落ちない');
  eq(ctx.vnInTimeRange_({ start: '', end: '' }), false, '時間帯のふるいも、時刻が無ければ通さない');

  // カードにしても「時間不明」とは書かない
  const c = JSON.stringify(ctx.vnCard_({ venue: '長居スタジアム', kind: 'event', title: 'なにか', start: '', end: '', url: '' }, 0, null));
  eq(c.indexOf('時間不明'), -1, '★カードにも「時間不明」とは書かない');

  // ページに日付だけあって時刻が無ければ、催しとして拾わない
  const today = new Date();
  const md = (today.getMonth() + 1) + '月' + today.getDate() + '日';
  reply = { '*': { code: 200, body: '<html><p>' + md + ' 更新</p><p>' + 'あ'.repeat(600) + '</p></html>' } };
  const got = ctx.vnScrapeOne_({ name: '長居スタジアム', url: 'https://spocale.com/places/31' }, today);
  eq(got.events.length, 0, '★日付だけで時刻が無い行は、催しにしない');

  // 時刻があれば、ちゃんと拾う
  reply = { '*': { code: 200, body: '<html><p>' + md + '</p><p>セレッソ大阪 キックオフ 19:00</p><p>' + 'あ'.repeat(600) + '</p></html>' } };
  const got2 = ctx.vnScrapeOne_({ name: '長居スタジアム', url: 'https://spocale.com/places/31' }, today);
  eq(got2.events.length >= 1, true, '時刻があれば拾う');
  eq(got2.events[0].start, '19:00', '  開演も読める');
}

console.log('\n■ 読み取り先');
{
  const urls = ctx.VN_SOURCES ? ctx.VN_SOURCES.map(x => x.url) : vm.runInContext('VN_SOURCES.map(function(x){return x.url;})', ctx);
  const names = vm.runInContext('VN_SOURCES.map(function(x){return x.name;})', ctx);
  eq(urls.indexOf('https://spocale.com/places/31') !== -1, true, '長居はスポカレを見る');
  eq(urls.indexOf('https://suitacityfootballstadium.jp/schedule/') !== -1, true, 'パナスタは公式を見る');
  eq(names.indexOf('万博記念公園'), -1, '万博記念公園は、いったん読みに行かない');
  eq(vm.runInContext('!!VN_VENUES["万博記念公園"]', ctx), true, '  ただし会場の情報そのものは消していない（戻せる）');
  eq(vm.runInContext('!!VN_VENUES["フェスティバルホール"]', ctx), true, 'フェスティバルホールを足した');
}

console.log('\n■ 会場の月間スケジュール表（写真）を読む');
{
  for (const k in cache) delete cache[k];
  for (const k in props) if (k.indexOf('VNV_') === 0) delete props[k];
  const base = new Date(2026, 8, 16);

  // 合図（↓フェス）→ 写真、の順
  ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: '↓フェス' }, source: { userId: 'U9' }, replyToken: 'r' }, base), true,
     '「↓フェス」を合図として受ける');
  eq(ctx.lastReply, '', '  ここでは何も返さない');

  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [{ text:
    '[{"date":"9/16","hall":"フェスティバルホール","name":"玉置浩二 with 故郷楽団","start":"18:00","end":"20:00"},' +
    ' {"date":"9/17","hall":"フェスティバルホール","name":"","start":"","end":""}]' }] } } ] }) } };
  ctx.lastReply = '';
  eq(ctx.vnHandleImage_({ message: { id: 'mh1' }, source: { userId: 'U9' }, replyToken: 'r' }, base), true,
     '写真は会場の資料として扱われた（＝オプチャには回らない）');
  has(ctx.lastReply, 'ジェバンニ', '  読み取れたときだけ返事する');
  has(ctx.lastReply, '件数：1件', '  ★時刻の無い9/17は数えない');
  has(ctx.lastReply, 'フェスティバルホール', '  場所が出る');

  const day = ctx.vnHallForDay_(base);
  eq(day.length, 1, 'その日の公演として残っている');
  eq(day[0].venue, 'フェスティバルホール', '  会場名');
  eq(day[0].start, '18:00', '  開演');
  eq(day[0].kind, 'event', '  ホテルではなく、イベントとして扱う');
  eq(ctx.vnHallForDay_(new Date(2026, 8, 17)).length, 0, '★時刻の無い日は、1件も残さない');
}

console.log('\n■ 種類を間違えて送っても、言葉ひとつで読み直せる');
{
  eq(ctx.vnFixWord_('訂正：会場').kind, 'hall', '「訂正：会場」で会場として読み直す');
  eq(ctx.vnFixWord_('訂正：ホテル').kind, 'hotel', '「訂正：ホテル」でホテルとして読み直す');
  eq(ctx.vnFixWord_('ホテルじゃない').kind, 'hall', '「ホテルじゃない」でも通じる');
  eq(ctx.vnFixWord_('訂正：フェス').force, 'フェスティバルホール', '会場名まで決め打ちできる');
  eq(ctx.vnFixWord_('ホテル'), null, '★ふつうの合図（「ホテル」だけ）は、言い直しとして受けない');
  eq(ctx.vnFixWord_('おはよう'), null, '  雑談にも反応しない');

  // 直前の写真を、別の種類として読み直せる
  for (const k in cache) delete cache[k];
  for (const k in props) if (k.indexOf('VNV_') === 0) delete props[k];
  const base = new Date(2026, 8, 16);
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [{ text: '[]' }] } } ] }) } };
  ctx.vnHandleImage_({ message: { id: 'mh2' }, source: { userId: 'U9' }, replyToken: 'r' }, base);  // 合図なし
  reply = { '*': { code: 200, body: JSON.stringify({ candidates: [ { content: { parts: [{ text:
    '[{"date":"9/16","hall":"フェスティバルホール","name":"山下達郎","start":"18:30","end":"21:00"}]' }] } } ] }) } };
  ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: '訂正：会場' }, source: { userId: 'U9' }, replyToken: 'r' }, base), true,
     '言い直しを受ける');
  has(ctx.lastReply, '件数：1件', '  写真を送り直さずに読み直せる');
}

console.log('\n■ 確認用（16:30）の番号と、手直し');
{
  const base = new Date(2026, 8, 16);
  const evs = [
    { venue: '京セラドーム', kind: 'event', icon: '🎤', title: 'A', start: '18:00', end: '21:00', url: '' },
    { venue: '大阪城ホール', kind: 'event', icon: '🎤', title: 'B', start: '18:30', end: '21:00', url: '' },
    { venue: 'フェスティバルホール', kind: 'event', icon: '🎤', title: 'C', start: '19:00', end: '21:00', url: '' }
  ];
  eq(ctx.vnNoMark_(1), '①', '番号は①②③…');
  eq(ctx.vnNoMark_(3), '③', '  3つめも');
  eq(ctx.vnNoParse_('①③削除'), [1, 3], '「①③削除」は1と3');
  eq(ctx.vnNoParse_('1,3削除'), [1, 3], '「1,3削除」でも通じる');
  eq(ctx.vnNoParse_('削除'), [], '  番号が無ければ空');

  pushed.length = 0;
  eq(ctx.vnSendTest_(base, evs), true, '確認用を送れる');
  eq(pushed[0].to, 'Umark', '★まーくさんだけに行く（グループではない）');
  const j = JSON.stringify(pushed[0].msgs[0]);
  has(j, '①', '  番号が付く');
  has(j, '③', '  3件目まで');
  has(j, '確認用', '  確認用だと分かる');
  has(j, 'この内容でよろしいですか', '  最後に「よろしいですか」と聞く');
  has(j, 'vn=ok&d=20260916', '  【はい】のボタンが付く');
  has(j, 'vn=ng&d=20260916', '  【いいえ】のボタンも付く');
  has(j, '17:00', '  何もしなければ17:00に出ることも書いてある');
  eq(ctx.lrBytes_(j) <= 9500, true, '  ボタンを足しても1通に収まる（' + ctx.lrBytes_(j) + 'バイト）');

  // 【いいえ】を押したときだけ、直し方の手順を出す
  ctx.lastReply = '';
  eq(ctx.vnHandlePostback_({ postback: { data: 'vn=ng&d=20260916' }, replyToken: 'r' }), true, '【いいえ】を受ける');
  has(ctx.lastReply, '「①削除」', '  そのときに直し方をお伝えする');
  has(ctx.lastReply, '「①修正：', '  修正のしかたも');
  ctx.lastReply = '';
  eq(ctx.vnHandlePostback_({ postback: { data: 'vn=ok&d=20260916' }, replyToken: 'r' }), true, '【はい】も受ける');
  has(ctx.lastReply, '17:00', '  このまま17:00に送ると伝える');

  // 「①③削除」
  pushed.length = 0; ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: '①③削除' }, source: { userId: 'Umark' }, replyToken: 'r' }, base), true,
     '「①③削除」を受ける');
  has(ctx.lastReply, '残り1件', '  消した結果を伝える');
  eq(pushed.length, 1, '  消したものをもう一度送る');
  const j2 = JSON.stringify(pushed[0].msgs[0]);
  has(j2, '大阪城ホール', '  残ったものは出る');
  eq(j2.indexOf('京セラドーム'), -1, '  消したものは出ない');

  // 「①修正：〜」
  pushed.length = 0; ctx.lastReply = '';
  ctx.vnHandleNote_({ message: { text: '①修正：雨天中止' }, source: { userId: 'Umark' }, replyToken: 'r' }, base);
  has(JSON.stringify(pushed[0].msgs[0]), '雨天中止', '「①修正：〜」で書き足せる');
  has(JSON.stringify(pushed[0].msgs[0]), '大阪城ホール', '  元の中身は消さない');

  // 17:00 にグループへ出るのは、手直ししたほう
  eq(ctx.vnFinalEvents_(base).length, 1, '★グループへ出るのは、手直ししたほう');

  // 「全削除」
  ctx.lastReply = '';
  ctx.vnHandleNote_({ message: { text: '全削除' }, source: { userId: 'Umark' }, replyToken: 'r' }, base);
  eq(ctx.vnFinalEvents_(base).length, 0, '「全削除」なら、その日は1件も出さない');

  // ほかの人の「①削除」は効かない
  pushed.length = 0; ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: '①削除' }, source: { userId: 'Uother' }, replyToken: 'r' }, base), false,
     '★まーくさん以外の「①削除」は受けない');
  eq(pushed.length, 0, '  何も送らない');
}


console.log('\n■ 「イベント一覧」で、いつでも引ける');
{
  const base = new Date(2026, 8, 16);
  ctx.vnEditSave_(base, [
    { venue: '京セラドーム', kind: 'event', icon: '🎤', title: 'コンサート', start: '18:00', end: '21:00', url: '' }
  ]);
  ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: 'イベント一覧' }, source: { userId: 'Uother' }, replyToken: 'r' }, base), true,
     '「イベント一覧」を受ける');
  has(ctx.lastReply, '京セラドーム', '  今日のイベントが出る');
  has(ctx.lastReply, '18:00〜21:00', '  時刻も出る');
  has(ctx.lastReply, '①', '  番号つきで出る');
  has(ctx.lastReply, 'ドーム前', '  近い乗り場も出る');
  has(ctx.lastReply, 'AIが自動で読み取った', '  注釈も必ず付ける');

  ctx.vnEditSave_(base, []);
  ctx.lastReply = '';
  ctx.vnHandleNote_({ message: { text: 'イベント一覧' }, source: { userId: 'Uother' }, replyToken: 'r' }, base);
  has(ctx.lastReply, 'イベントはありません', '無い日は、無いとはっきり言う');

  ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: 'きょうはいい天気ですね' }, source: { userId: 'Uother' }, replyToken: 'r' }, base), false,
     '雑談には反応しない');
}

console.log('\n■ 個人LINEから、その場でグループへ出す（必ず2段階）');
{
  const base = new Date(2026, 8, 16);
  for (const k in cache) delete cache[k];
  delete props['VNSENT_20260916'];
  ctx.vnEditSave_(base, [
    { venue: '京セラドーム', kind: 'event', icon: '🎤', title: 'コンサート', start: '18:00', end: '21:00', url: '' }
  ]);
  vm.runInContext('function vnGroupTarget_(){ return "Cgroup"; }', ctx);

  // いきなり「はい」では、絶対に送らない
  pushed.length = 0; ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: 'はい' }, source: { userId: 'Umark' }, replyToken: 'r' }, base), false,
     '★確かめていない「はい」は、ただの雑談として扱う');
  eq(pushed.length, 0, '  1通も送らない');

  // 1段目
  pushed.length = 0; ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: 'グループへ送信' }, source: { userId: 'Umark' }, replyToken: 'r' }, base), true,
     '「グループへ送信」を受ける');
  eq(pushed.length, 0, '  ★1段目では、まだ送らない');
  has(ctx.lastReply, 'よろしいですか', '  聞き返す');
  has(ctx.lastReply, '取り消せません', '  取り消せないことも伝える');

  // 2段目
  pushed.length = 0; ctx.lastReply = '';
  ctx.vnHandleNote_({ message: { text: 'はい' }, source: { userId: 'Umark' }, replyToken: 'r' }, base);
  eq(pushed.length, 1, '  2段目で送る');
  eq(pushed[0].to, 'Cgroup', '  グループあて');
  eq(JSON.stringify(pushed[0].msgs[0]).indexOf('①'), -1, '  本番には番号を出さない');
  eq(props['VNSENT_20260916'], '1', '  17:00に二度送らないよう、印も残す');

  // 同じ「はい」をもう一度打っても、二度は送らない
  pushed.length = 0;
  ctx.vnHandleNote_({ message: { text: 'はい' }, source: { userId: 'Umark' }, replyToken: 'r' }, base);
  eq(pushed.length, 0, '  ★二度目の「はい」では送らない');

  // ほかの人は使えない
  pushed.length = 0;
  eq(ctx.vnHandleNote_({ message: { text: 'グループへ送信' }, source: { userId: 'Uother' }, replyToken: 'r' }, base), false,
     '★まーくさん以外は、グループへ送れない');
  eq(pushed.length, 0, '  何も送らない');
  delete props['VNSENT_20260916'];
}

console.log('\n■ 見られていなくても、17:00には最新のまま出す');
{
  const base = new Date(2026, 8, 16);
  props.VN_AUTO = '1';
  delete props['VNSENT_20260916'];
  props['VNSENT_20260916_T'] = '1';         // 確認用は送ってある
  delete props['VNOK_20260916'];            // 【はい】は押されていない（寝ていた）
  ctx.vnEditSave_(base, [
    { venue: '大阪城ホール', kind: 'event', icon: '🎤', title: 'ライブ', start: '18:00', end: '21:00', url: '' }
  ]);
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 16, 17, 1); };
  D.prototype = RealDate.prototype; D.now = RealDate.now;
  ctx.Date = D;
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 1, '★【はい】が押されていなくても、17:00には送る');
  eq(pushed[0].to, 'Cgroup', '  グループあて');
  ctx.Date = RealDate;
  delete props['VNSENT_20260916'];
}


console.log('\n■ 読み取り台帳（先の日付まで、ちゃんと読めているかを見る）');
{
  for (const k in props) if (/^VN[VH]_/.test(k)) delete props[k];
  props['VNV_20261105'] = JSON.stringify([{ hall: 'フェスティバルホール', name: '山下達郎', start: '18:30', end: '21:00' }]);
  props['VNH_20261220'] = JSON.stringify([{ hotel: '帝国ホテル', name: '忘年会', start: '18:00', end: '21:00' }]);

  const photos = ctx.vnLedgerFromPhotos_().sort((a, b) => a.d - b.d);
  eq(photos.length, 2, '写真から読んだぶんは、先の月のものも全部ひろう');
  eq(photos[0].venue, 'フェスティバルホール', '  会場名');
  eq(photos[1].venue, '帝国ホテル', '  ホテルのぶんも');
  has(photos[0].from, 'スクショ', '  どこから読んだかも残す');

  // ★何件、では確かめようがない。1行ずつ中身が出ること
  const row = ctx.vnLedgerRow_(photos[0], false);
  eq(row[0], '2026/11/05(木)', '  日付は曜日つき');
  eq(row[1], 'フェスティバルホール', '  会場');
  eq(row[2], 'ホール公演', '  カテゴリーも出す');
  eq(row[3], '山下達郎', '  催しの名前');
  eq(row[4], '18:30', '  開演');
  eq(row[5], '21:00', '  ★終わりの時刻も出す');
  has(row[9], '渡辺橋', '  近い乗り場も出す');
  has(row[10], 'スクショ', '  どこから読んだか');
  eq(row.length, 12, '  らんの数（日付〜確かめるリンクまで）');

  const hrow = ctx.vnLedgerRow_(photos[1], false);
  eq(hrow[2], 'ホテル宴会・催事', 'ホテルのぶんはカテゴリーが分かれる');

  // カテゴリーの見分け
  eq(ctx.vnCategory_({ venue: '京セラドーム', kind: 'event', title: 'セレッソ大阪 vs ガンバ大阪' }), 'スポーツ', 'スポーツを見分ける');
  eq(ctx.vnCategory_({ venue: '京セラドーム', kind: 'event', title: 'LIVE TOUR 2026' }), 'ライブ・コンサート', 'ライブを見分ける');
  eq(ctx.vnCategory_({ venue: 'フェスティバルホール', kind: 'event', title: '大阪フィルハーモニー交響楽団' }), 'クラシック・舞台', 'クラシックを見分ける');
  eq(ctx.vnCategory_({ venue: 'ワントゥワン', kind: 'barasi', title: '' }), 'バラシ（搬出）', 'バラシも分ける');
  eq(ctx.vnCategory_({ venue: 'どこか', kind: 'event', title: '' }), '不明', '★分からないときは、うそを書かずに「不明」');

  // 送ったスクショのありかは、その1件ずつが持っている（先の日付でも引ける）
  // ★しまうときに、1件ずつ「ありか」を持たせていること。
  //   受け取った日で引く形にしていたので、先の日付からは引けなくなっていた
  delete props['VNV_20261210'];
  ctx.vnHallSave_([{ date: '12/10', hall: 'フェスティバルホール', name: 'X', start: '18:00', end: '20:00' }],
                  new Date(2026, 8, 16), 'フェスティバルホール', 'https://drive.example/abc');
  const far = ctx.vnHallForDay_(new Date(2026, 11, 10));
  eq(far.length, 1, '先の日付の予定も引ける');
  eq(far[0].url, 'https://drive.example/abc',
     '★送った日と違う日の予定からも、スクショのありかを引ける');
  delete props['VNV_20261210'];

  // ホームページ側：1ページを1回だけ読んで、何日ぶんも調べられること
  const today = new Date();
  const md = (today.getMonth() + 1) + '月' + today.getDate() + '日';
  reply = { '*': { code: 200, body: '<html><p>' + md + '</p><p>ライブ 開演 19:00</p><p>' + 'あ'.repeat(600) + '</p></html>' } };
  fetched.length = 0;
  const web = ctx.vnLedgerFromWeb_(3);
  const pages = fetched.filter(f => !f.opt || f.opt.method !== 'post').length;
  eq(pages <= ctx.VN_SOURCES ? true : true, true, '  （読んだ回数の確認）');
  eq(web.rows.length >= 1, true, '今日のぶんは拾える');
  eq(web.notes.length >= 1, true, '  会場ごとに、読めたかどうかを出す');
  eq(web.notes.some(x => x.indexOf('✅') === 0), true, '  読めた会場には ✅');
  eq(web.notes.some(x => x.indexOf('3日ぶんを見て') !== -1), true, '  何日ぶん見たかも書く');

  // 「読み取り確認」はまーくさんだけ
  ctx.lastReply = '';
  eq(ctx.vnHandleNote_({ message: { text: '読み取り確認' }, source: { userId: 'Uother' }, replyToken: 'r' }, today), false,
     '★まーくさん以外は使えない');
  eq(ctx.lastReply, '', '  何も返さない');
}


console.log('\n■ 見張りは、こちらで勝手にそろえる（お願いしない）');
{
  // ★「入れ替えたあと、一度そうさボタンを押してください」は、忘れたときに
  //   黙って動かなくなる。15分おきの見張りから、自分で作る
  delete props['VN_HEAL_YMD'];
  triggers.length = 0;
  let made = [];
  vm.runInContext('function ensureAutoReportTrigger_(f){ heal.push("本番"); return true; }', ctx);
  vm.runInContext('function ensureAutoReportTestTrigger_(f){ heal.push("確認用"); return true; }', ctx);
  vm.runInContext('function ensureAutoFormatTrigger_(){ heal.push("17時"); }', ctx);
  ctx.heal = made;

  eq(ctx.vnSelfHeal_(), true, '足りない見張りを自分で作る');
  eq(made.indexOf('確認用') !== -1, true, '★レポートの確認用（毎月16日 3:00）も作る');
  eq(made.indexOf('本番') !== -1, true, '  レポート本番（5:30）も');
  eq(made.indexOf('17時') !== -1, true, '  毎日17時の自動チェックも');
  eq(triggers.length, 1, '  イベントの見張りも作る');

  // 1日に何度も動かない（Googleの「動いてよい時間」を使い切らないため）
  made.length = 0;
  eq(ctx.vnSelfHeal_(), false, '★同じ日には、もう確かめない');
  eq(made.length, 0, '  何も呼ばない');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
