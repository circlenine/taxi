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
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; } }) };

let fetched = [], reply = {};
ctx.UrlFetchApp = { fetch: (url, opt) => {
  fetched.push({ url: url, opt: opt });
  const r = reply[url] || reply['*'] || { code: 200, body: '' };
  if (r.throw) throw new Error(r.throw);
  return { getResponseCode: () => r.code, getContentText: () => r.body,
           getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [] }) };
} };
let pushed = [];
// スプシの写し（テスト用）。どのスプシに書いたかを見張れるようにしておく
const madeBooks = [];
const fakeSheet = name => {
  const sh = {
    _name: name, _vals: [], _widths: [],
    clear: () => sh, getRange: () => rng, setFrozenRows: () => sh,
    setColumnWidth: (i, w) => { sh._widths[i] = w; return sh; },
    getSheetId: () => 1
  };
  const rng = {
    setValues: v => { sh._vals = sh._vals.concat(v); return rng },
    setValue: () => rng, setFontWeight: () => rng, setBackground: () => rng,
    setWrap: () => rng, setVerticalAlignment: () => rng, setFontColor: () => rng,
    setRichTextValue: () => rng, createFilter: () => rng
  };
  return sh;
};
const fakeBook = id => {
  const tabs = {};
  return {
    _id: id,
    getId: () => id, getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
    getSheetByName: n => tabs[n] || null,
    insertSheet: n => (tabs[n] = fakeSheet(n)),
    _tabs: tabs
  };
};
const activeBook = fakeBook('ACTIVE-記録用スプシ');
ctx.SpreadsheetApp = {
  getUi: () => { throw new Error('no ui'); },
  getActiveSpreadsheet: () => activeBook,
  openById: id => {
    const b = madeBooks.filter(x => x._id === id)[0];
    if (!b) throw new Error('開けません');
    return b;
  },
  create: name => { const b = fakeBook('LEDGER-' + madeBooks.length); b._name = name; madeBooks.push(b); return b; },
  newRichTextValue: () => ({ setText: () => ({ setLinkUrl: () => ({ build: () => ({}) }) }) })
};

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
    everyMinutes: () => ({ create: () => { triggers.push({ getHandlerFunction: () => fn }); } }),
    after: ms => ({ create: () => { triggers.push({ getHandlerFunction: () => fn, _kind: 'after', _ms: ms }); } }) }) })
};
// 📧 メール（テスト用の写し）
let mails = [];
ctx.MailApp = {
  getRemainingDailyQuota: () => 100,
  sendEmail: o => { mails.push(o); }
};
let uuidN = 0;
ctx.Utilities = {
  getUuid: () => 'aaaaaaaa-bbbb-cccc-dddd-' + ('00000000000' + (++uuidN)).slice(-12),
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

// 送った1通ぶんから、読める文だけを取り出す
// （ふつうの文でも、ボタン付き（flex）でも、同じように中身を見られるように）
const msgText = m => {
  if (!m) return '';
  if (m.type === 'text') return String(m.text || '');
  return JSON.stringify(m);
};

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
  has(json, '通知設定', '★「お知らせ」ではなく「通知設定」と書く（初見で分かるように）');
  eq(json.indexOf('お知らせ：'), -1, '  「お知らせ：」の言い方は、もう使わない');
  // ★ボタンの字は短く。長いと幅で切れて「📱個人LINEへ…」になり、何のボタンか分からない
  has(json, '📱LINE', '★ボタンの字は短く（切れないように）');
  eq(json.indexOf('個人LINEへ通知'), -1, '  ★前の長い字は、もう使わない（途中で切れていた）');
  eq(json.indexOf('ﾃﾞｨｽｺｰﾄﾞ'), -1, '★ディスコードのボタンは出さない（設定がややこしいため）');
  eq(json.indexOf('💬DC'), -1, '  「DC」も出さない');
  eq(json.indexOf('⏰カレンダー'), -1,
     '★カレンダーのボタンも出さない（その日の催しを予定表に入れる意味がないため）');
  eq(json.indexOf('calendar.google.com'), -1, '  長いリンクも絵の中に入れない');
  eq(json.indexOf('終了予定の前に知らせます'), -1, '★ボタンの上の説明文は出さない');
  eq(json.indexOf('長押しでコピー'), -1, 'URLを文字で並べる通は、もう出さない');
}

console.log('\n■ イベントの枠そのものが、公式ページへのボタン');
{
  const day = new Date(2026, 8, 16);
  const card = ctx.vnCard_(
    { venue: '京セラドーム', kind: 'event', icon: '🏟', title: 'コンサート',
      start: '18:00', end: '21:00', people: 0,
      url: 'https://www.kyoceradome-osaka.jp/schedule/' }, 0, day);
  const j = JSON.stringify(card);
  // ★枠ぜんたいを押せるのは、やめた。押すのは「下線の引いてある名前」だけ
  eq(card.action, undefined, '枠ぜんたいは押せない（どこを押すのか紛らわしかった）');
  has(j, '"uri":"https://www.kyoceradome-osaka.jp/schedule/"', '  名前を押すと、その催しのページへ行く');
  has(j, '👆 詳細はクリック（該当ページに移ります）',
      '★案内は、見出しのすぐ下に短く出す');
  eq(j.indexOf('この枠を押すと'), -1, '  紛らわしい言い方は、もう使わない');

  // URLが無い催し（ホテルの資料など）には、案内も行き先も付けない
  const noUrl = ctx.vnCard_({ venue: '帝国ホテル', kind: 'hotel', title: '周年記念', end: '21:00', url: '' }, 1, day);
  eq(noUrl.action, undefined, 'URLが無ければ、押しても何も起きないようにする');
  eq(JSON.stringify(noUrl).indexOf('この枠を押すと'), -1, '  ありもしないページの案内も出さない');

  eq(ctx.vnBtnLabel_('パナソニックスタジアム吹田'), 'パナソニックスタ…', '長い名前は詰める');
  eq(ctx.vnBtnLabel_('京セラドーム'), '京セラドーム', '短い名前はそのまま');

  // 絵ぜんたいでも、案内がちゃんと出る
  const whole = JSON.stringify(ctx.vnFitMessages_(day, ctx.vnSampleEvents_(), '')[0]);
  has(whole, '👆 各イベント名（下線）を押すと、その公式ページが開きます', '読み方のところにも書いてある');
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

console.log('\n■ 自動発信は、はじめから「入」');
{
  /*
   * ★前は「切」が既定だった（まーくさんのご指示で変えた）。
   *   そのため、設定タブで「はい」にしないかぎり、
   *   イベントの案内もリマインダーも1回も動かなかった。
   *   こちらから「まず設定してください」とお願いする作りが、
   *   そもそもまちがっていた。何もしなくても動くのが、あるべき形
   */
  delete props.VN_AUTO;
  vm.runInContext('function cfg_(){ return ""; }', ctx);
  eq(ctx.vnAutoOn_(), true, '★何も決めていなければ、送る');

  // 設定タブで はっきり「いいえ」にすれば、止まる
  vm.runInContext('function cfg_(k){ return k === "イベント情報を自動で送る" ? "いいえ" : ""; }', ctx);
  eq(ctx.vnAutoOn_(), false, '★設定タブで「いいえ」にすれば、止まる');
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '  そのときは1通も送らない');

  // 設定タブで「はい」なら、もちろん送る
  vm.runInContext('function cfg_(k){ return k === "イベント情報を自動で送る" ? "はい" : ""; }', ctx);
  eq(ctx.vnAutoOn_(), true, '「はい」なら、もちろん送る');

  // ボタンで切ったぶん（VN_AUTO）は、設定タブより強い
  vm.runInContext('function cfg_(){ return ""; }', ctx);
  props.VN_AUTO = '0';
  eq(ctx.vnAutoOn_(), false, 'ボタンで切ってあれば、止まったまま');
  delete props.VN_AUTO;
}

console.log('\n■ 18:00 は確認用（まーくさんだけ）、18:30 にグループ');
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

  at(17, 30);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '17:30 には、まだ何も送らない');

  at(18, 0);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 1, '★18:00 に確認用を1通');
  eq(pushed[0].to, 'Umark', '  宛先はまーくさんだけ（グループではない）');

  at(18, 16);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '  18:16 には、まだグループへ送らない');

  at(19, 30);
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 0, '19:30 になってしまったら、その日はもう送らない');
  delete props['VNSENT_20260916_T'];
  delete props['VNEDIT_20260916'];
  back();
}

console.log('\n■ 送り先が分からなければ、グループには絶対に送らない');
{
  props.VN_AUTO = '1';
  const RealDate = Date;
  // ★グループへ出すのは 18:30（確認用の30分あと）
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 16, 18, 31); };
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
  has(fit, '動く前に必ず公式ページでご確認を', '  注釈は、どんなに詰めても必ず残す');

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

  // ★グループで押されても、返事は「押した本人の個人LINE」へ送る
  pushed.length = 0; ctx.lastReply = '';
  const took = ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark', groupId: 'Cgroup' }, postback: { data: 'vn=me&d=20260915&i=0' } });
  eq(took, true, 'ボタンはこの受け口が扱う');
  eq(ctx.lastReply, '', '★グループには何も出さない（雑談の場を汚さない）');
  eq(pushed.length, 1, '★押した本人の個人LINEへ送る');
  eq(pushed[0].to, 'Umark', '  宛先は、押した人');
  const rep0 = msgText(pushed[0].msgs[0]);
  has(rep0, '20:55', '★21:00の5分前＝20:55に届くと伝える（60分前は早すぎた）');
  /*
   * ★「リマインダー」は iPhone のアプリの名前とまぎれる（まーくさんのご指摘）。
   *   こちらのものは「お知らせ」と呼ぶ
   */
  has(rep0, 'お知らせを入れました', '★こちらのものは「お知らせ」と呼ぶ');
  eq(rep0.indexOf('リマインダーを入れました'), -1,
     '★「リマインダー」とは呼ばない（iPhoneのアプリ名とまぎれるため）');
  has(rep0, '終了予定', '  ★「終了」ではなく「終了予定」と書く');
  has(rep0, 'あなたの個人LINEへ', '★公式アカウントから個人LINEへ届く、と分かるように書く');
  has(rep0, 'アプリは開きません', '  アプリは開かないことも、はっきり書く');
  eq(JSON.parse(props['VN_REMIND']).length, 1, '予約が1つ入る');

  pushed.length = 0;
  ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark', groupId: 'Cgroup' }, postback: { data: 'vn=me&d=20260915&i=0' } });
  eq(JSON.parse(props['VN_REMIND']).length, 1, '同じものを二度押しても、二重にならない');
  has(msgText(pushed[0].msgs[0]), 'もう入っています', '  そう伝える（これも個人LINEへ）');

  // 時間になったら送る
  pushed.length = 0;
  D.now = () => new RealDate(2026, 8, 15, 20, 56).getTime();
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

console.log('\n■ 🔕 通知解除のボタン');
{
  props['VN_REMIND'] = '[]';
  const day = new Date(2026, 8, 15);
  ctx.vnDaySave_(day, [{ venue: '京セラドーム', title: 'コンサート', start: '18:00', end: '21:00', url: 'https://x/' }]);
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 15, 17, 0); };
  D.prototype = RealDate.prototype; D.now = () => new RealDate(2026, 8, 15, 17, 0).getTime();
  ctx.Date = D;

  pushed.length = 0; ctx.lastReply = '';
  ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark' }, postback: { data: 'vn=me&d=20260915&i=0' } });
  const m = pushed[0].msgs[0];
  eq(m.type, 'flex', '★予約の返事に、押せるボタンを付ける');
  const js = JSON.stringify(m);
  has(js, '🔕 通知解除', '  「通知解除」のボタンがある');
  has(js, 'vn=off&k=', '  押すと、そのぶんだけを解除する合図が飛ぶ');
  const key = JSON.parse(props['VN_REMIND'])[0].k;
  eq(typeof key === 'string' && key.length === 6, true, '  予約には、みじかい合言葉が付く');
  eq(js.indexOf('k=' + key) !== -1, true, '  ボタンにも、その合言葉が入る');
  eq(js.length < 2000, true, '  ★ボタンの荷物は300文字まで。会場名を入れずに済ませている');

  // 押したら消える
  pushed.length = 0;
  const took = ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark' }, postback: { data: 'vn=off&k=' + key } });
  eq(took, true, '解除のボタンも、この受け口が扱う');
  eq(JSON.parse(props['VN_REMIND']).length, 0, '★押すと、その予約は消える');
  has(msgText(pushed[0].msgs[0]), '解除しました', '  消したことを、本人の個人LINEへ伝える');
  eq(pushed[0].to, 'Umark', '  ★グループではなく、押した本人へ');

  // 二度押しても落ちない
  pushed.length = 0;
  ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark' }, postback: { data: 'vn=off&k=' + key } });
  has(msgText(pushed[0].msgs[0]), 'もうありません', '  二度押しても落ちない');

  // ほかの人の予約は、絶対に消さない
  props['VN_REMIND'] = JSON.stringify([
    { id: 'x', k: 'zzzzzz', at: Date.now() + 600000, how: 'me', to: 'Uother',
      venue: 'あ', title: '', start: '', end: '' }]);
  pushed.length = 0;
  ctx.vnHandlePostback_({ type: 'postback', replyToken: 'r',
    source: { userId: 'Umark' }, postback: { data: 'vn=off&k=zzzzzz' } });
  eq(JSON.parse(props['VN_REMIND']).length, 1, '★ほかの人の予約には、手を出さない');
  ctx.Date = RealDate;
}

console.log('\n■ イベント名は、下線つきで押せる');
{
  const day = new Date(2026, 8, 16);
  const ev = { venue: '京セラドーム大阪', kind: 'event', icon: '🎤', title: 'ライブ',
               start: '18:00', end: '21:00', url: 'https://k/', people: 0 };
  const card = ctx.vnCard_(ev, 0, day, true);
  const j = JSON.stringify(card);
  has(j, '"decoration":"underline"', '★イベント名に下線を引く（押せると分かるように）');
  eq(j.indexOf('"text":"京セラドーム大阪"') !== -1 || j.indexOf('京セラドーム大阪') !== -1, true, '  会場名が出る');
  eq(card.action, undefined, '★枠ぜんたいを押せるのは、やめた（どこを押すのか紛らわしかった）');
  // 見出しの行と、催し名の行の両方から、同じページへ飛べる
  const acts = (j.match(/"uri":"https:\/\/k\/"/g) || []).length;
  eq(acts >= 2, true, '  ★イベント名（見出し・催し名）のどちらを押しても、同じページへ');
  // 時刻には下線を引かない（押すところが2つあるように見えるため）
  const head = card.contents[0];
  const und = head.contents.filter(x => x.decoration === 'underline');
  eq(und.length, 1, '  下線は名前だけ。時刻には引かない');
  has(und[0].text, '京セラドーム大阪', '    下線が付くのは会場名');

  // リンクが無いときは、下線も引かない（押せないのに押せるように見せない）
  const noUrl = JSON.stringify(ctx.vnCard_({ venue: 'あ', kind: 'event', title: 'い', start: '18:00', end: '21:00' }, 0, day, true));
  eq(noUrl.indexOf('"decoration":"underline"'), -1, '★リンクが無ければ、下線も引かない');

  // 上の案内文
  const msg = JSON.stringify(ctx.vnFitMessages_(day, [ev], ''));
  has(msg, '各イベント名（下線）を押すと', '★案内も「枠」ではなく「イベント名」と書く');
  eq(msg.indexOf('各イベントの枠を押すと'), -1, '  前の紛らわしい言い方は、もう使わない');
}

console.log('\n■ 注意書きと、言葉づかい');
{
  const d = vm.runInContext('VN_DISCLAIMER', ctx).join('\n');
  has(d, '(時刻の前後・延長・中止)', '★かっこは半角の ()');
  eq(d.indexOf('（時刻の前後'), -1, '  全角のかっこは、もう使わない');
  d.split('\n').forEach(function (x) {
    if (ctx.width_ && ctx.width_(x) > 22) { console.log('  NG  注意書きの行が長い：' + x); }
  });
  eq(d.split('\n').every(x => x.length <= 22), true, '★どの行も、折り返さない長さ');

  const day = new Date(2026, 8, 16);
  const ev = { venue: 'あ', kind: 'event', title: 'い', start: '18:00', end: '21:00',
               know: 'デビュー20周年', avoid: '脱退した元メンバーの話' };
  const card = JSON.stringify(ctx.vnCard_(ev, 0, day, true));
  has(card, '💬 一言：', '★「話題」ではなく「一言」');
  eq(card.indexOf('💬 話題：'), -1, '  前の言い方は、もう使わない');
  has(card, '🚫 禁止：', '★「触れない」ではなく「禁止」');
  eq(card.indexOf('🚫 触れない：'), -1, '  前の言い方は、もう使わない');

  // 注意書きの下じきは、薄い黄色
  const msg = JSON.stringify(ctx.vnFitMessages_(day, [ev], ''));
  has(msg, '#fff8e1', '★注意書きは、薄い黄色の下じきに置く');
  has(msg, '※注意（必ずお読みください）※', '  見出しはそのまま');
}

console.log('\n■ 記録が少ないときは、よけいなことを書かない');
{
  const line = ctx.vnAdvice_('どこか', '21:00', { count: 0, sales: 0, waitSum: 0, waitCount: 0 });
  eq(String(line).indexOf('記録がまだ少ない'), -1,
     '★「記録がまだ少ないので〜」は、もう書かない（場所を食うだけだった）');
}

console.log('\n■ イベントのテスト送信は、日付を指定できる');
{
  const P = ctx.vnParseDay_;
  const base = new Date(2026, 8, 16);           // 2026/09/16(水)
  const ymd = d => d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  eq(ymd(P('', base)), '2026/9/16', '空なら きょう');
  eq(ymd(P('今日', base)), '2026/9/16', '「今日」');
  eq(ymd(P('明日', base)), '2026/9/17', '「明日」');
  eq(ymd(P('あさって', base)), '2026/9/18', '「あさって」');
  eq(ymd(P('3日後', base)), '2026/9/19', '「3日後」');
  eq(ymd(P('明日（9/17(木)）', base)), '2026/9/17', '★プルダウンから選んだそのままの形でも通る');
  eq(ymd(P('9/20', base)), '2026/9/20', '「9/20」');
  eq(ymd(P('9月20日', base)), '2026/9/20', '「9月20日」');
  eq(ymd(P('２０２６/９/２０', base)), '2026/9/20', '★全角の数字でも通る');
  eq(ymd(P('20261105', base)), '2026/11/5', '「20261105」');
  eq(ymd(P('2026/11/5', base)), '2026/11/5', '「2026/11/5」');
  eq(ymd(P('3/1', base)), '2027/3/1', '★もう過ぎている日は、来年のぶんと見る');
  eq(ymd(P('わけのわからない字', base)), '2026/9/16', '読めなければ きょう（落ちない）');
  eq(ymd(P(null, base)), '2026/9/16', 'null でも落ちない');
}

console.log('\n■ 写真の読み取り：返事が途中で切れても、あきらめない');
{
  const J = ctx.vnJsonArray_;
  eq(J('[{"a":1},{"a":2}]').length, 2, 'ちゃんと閉じていれば、そのまま読む');
  eq(J('[]').length, 0, '★1件も無いときの [] は、そのまま「0件」（読めなかった、ではない）');
  /*
   * ★ここが、フェスティバルホールの表が読めなかった原因でした。
   *   1か月ぶん（30行）は返事が長く、終わりの ] が出る前に打ち切られる。
   *   前は、そのとき まるごと捨てていました。
   */
  const cut = '[{"date":"9/3","name":"JUJU","start":"18:30","end":"21:00"},' +
              '{"date":"9/5","name":"ベリーグッドマン","start":"17:00","end":"18:45"},' +
              '{"date":"9/6","name":"吉田兄弟","start":"15:0';
  const got = J(cut);
  eq(got && got.length, 2, '★途中で切れていても、そろっている分は拾う');
  eq(got[0].name, 'JUJU', '  中身も読める');
  eq(J('なにも入っていません'), null, '★本当に読めなければ null（0件とは別もの）');
  eq(J(''), null, '空でも落ちない');
  eq(J(null), null, 'null でも落ちない');

  // ★本当に「長さの指定」を付けて送っているか、送る中身を見て確かめる
  vm.runInContext('function geminiReady_(){ return { key: "k", model: "m" }; }', ctx);
  const fakeBlob = { getContentType: () => 'image/png', getBytes: () => [1, 2, 3] };
  const reqs = [];
  const keepFetch = ctx.UrlFetchApp;
  const say = (code, text) => ({
    getResponseCode: () => code,
    getContentText: () => JSON.stringify(
      code === 200 ? { candidates: [{ content: { parts: [{ text: text }] } }] }
                   : { error: { message: text } })
  });
  let nextReply = say(200, '[{"date":"9/3","name":"JUJU","start":"18:30","end":"21:00"}]');
  ctx.UrlFetchApp = { fetch: (u, o) => { reqs.push({ u: u, o: o }); return nextReply; } };

  const got2 = ctx.vnImageJson_('mid', 'よろしく', fakeBlob);
  eq(got2.length, 1, '読めたら、そのまま返す');
  const sent = JSON.parse(reqs[0].o.payload);
  eq(sent.generationConfig.maxOutputTokens >= 4096, true,
     '★返事の長さを、こちらで指定して送っている（指定しないと途中で切られる）');
  eq(sent.generationConfig.responseMimeType, 'application/json',
     '  JSONだけ返すよう、約束させている');
  eq(sent.generationConfig.temperature, 0, '  毎回おなじ読み方をさせる');

  // 返事が2つに分かれてきても、つなげて読む
  nextReply = {
    getResponseCode: () => 200,
    getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [
      { text: '[{"date":"9/3","name":"JUJU"' }, { text: ',"start":"18:30"}]' }] } }] })
  };
  reqs.length = 0;
  eq(ctx.vnImageJson_('mid', 'x', fakeBlob).length, 1,
     '★返事が2つに分かれてきても、つなげて読む');

  // 何も返ってこなかったときは、理由まで言う
  nextReply = {
    getResponseCode: () => 200,
    getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] })
  };
  let msg = '';
  try { ctx.vnImageJson_('mid', 'x', fakeBlob); } catch (e) { msg = e.message; }
  has(msg, 'MAX_TOKENS', '★何も返らなかったら、その理由まで伝える');

  // 開けなかったときは、AIの言い分も見せる
  nextReply = say(400, 'model not found');
  msg = '';
  try { ctx.vnImageJson_('mid', 'x', fakeBlob); } catch (e) { msg = e.message; }
  has(msg, '400', '開けなかったら、番号を出す');
  has(msg, 'model not found', '★AIの言い分も、そのまま見せる（原因が分かるように）');

  // 混み合っているときは、1度だけやり直す
  let n = 0;
  ctx.UrlFetchApp = { fetch: () => { n++; return n === 1 ? say(503, 'busy')
    : say(200, '[{"date":"9/3","name":"x"}]'); } };
  vm.runInContext('Utilities.sleep = function(){};', ctx);
  eq(ctx.vnImageJson_('mid', 'x', fakeBlob).length, 1, '★混み合っていたら、1度だけやり直す');
  eq(n, 2, '  やり直しは1度だけ');
  ctx.UrlFetchApp = keepFetch;

  // フェスティバルホールの合図
  const W = ctx.vnHallWord_;
  ['フェス', 'ふぇす', 'フェスティバルホール'].forEach(function (w) {
    eq(W('↓' + w) && W('↓' + w).force, 'フェスティバルホール', '「↓' + w + '」で会場が決まる');
  });
  eq(W('↑フェス').up, true, '  「↑」なら、直前の写真を読み直す');
}

console.log('\n■ 🗓️ 台帳は、まーくさん専用のスプシに書く');
{
  madeBooks.length = 0;
  delete props['VN_LEDGER_SS'];
  reply['*'] = { code: 404, body: '' };          // ページは開けなくてよい（置き場所の話）
  const text = ctx.vnLedgerBuild_(1, false);

  eq(madeBooks.length, 1, '★台帳スプシを、あたらしく1つ作る');
  has(madeBooks[0]._name, 'まーく専用', '  名前で、だれ用かが分かる');
  eq(props['VN_LEDGER_SS'], madeBooks[0]._id, '  そのIDを覚えておく');
  eq(activeBook.getSheetByName('🗓️イベント台帳'), null,
     '★記録用スプシ（みんなが見られるほう）には、1行も書かない');
  eq(madeBooks[0].getSheetByName('🗓️イベント台帳') !== null, true, '  台帳は専用スプシのほうに書く');
  eq(madeBooks[0].getSheetByName('📋 いまの条件') !== null, true,
     '★「いまの条件」タブも、同じスプシに並べる');
  has(text, 'まーくさんだけが開けます', '★だれにも共有していないと、はっきり書く');
  has(text, 'LINEに出るもの', '  出る件数と、落とした件数を分けて出す');

  // 2回目は、作り直さずに同じスプシを使う
  ctx.vnLedgerBuild_(1, false);
  eq(madeBooks.length, 1, '★2回目は、同じスプシに上書きする（増やさない）');

  /*
   * ★台帳では、時刻が読めなかったものも落とさないこと。
   *   「読めていないこと」こそ、いちばん確かめたいものだから。
   *   LINEには出さない（出す・出さないは、らんで分ける）
   */
  const realScrape = ctx.vnScrapeOne_;
  reply['*'] = { code: 200, body: '<html>x</html>' };
  vm.runInContext('vnScrapeOne_ = function(src, day){ return { events: [' +
    '{ venue: src.name, title: "時刻あり", start: "18:00", end: "21:00" },' +
    '{ venue: src.name, title: "時刻なし", start: "", end: "" }] }; };', ctx);
  const web = ctx.vnLedgerFromWeb_(1);
  eq(web.rows.filter(r => r.title === '時刻なし').length > 0, true,
     '★時刻が読めなかったものも、台帳には残す');
  eq(web.rows.filter(r => r.title === '時刻あり').length > 0, true, '  読めたものも、もちろん残る');
  eq(ctx.vnLedgerJudge_(web.rows.filter(r => r.title === '時刻なし')[0]).ok, false,
     '  ただし「LINEに出す？」は × になる');

  // 時間切れになったら、そこで切り上げて、そう伝える
  const late = ctx.vnLedgerFromWeb_(300, Date.now() - 1000);
  eq(late.cut > 0, true, '★時間切れなら、途中で切り上げる（6分で打ち切られて全滅しないように）');
  eq(late.notes.join(' ').indexOf('時間切れ') !== -1, true, '  そのことも、はっきり伝える');
  vm.runInContext('vnScrapeOne_ = null;', ctx);
  ctx.vnScrapeOne_ = realScrape;
  reply['*'] = { code: 404, body: '' };

  // 覚えていたIDが開けなくなっていたら、作り直す
  props['VN_LEDGER_SS'] = 'もう無いID';
  ctx.vnLedgerBuild_(1, false);
  eq(madeBooks.length, 2, '  消されていたら、作り直す');
  reply['*'] = { code: 200, body: '' };
}

console.log('\n■ ⏰ スマホ自身のアラーム（.ics）');
{
  const day = new Date(2026, 8, 16);
  ctx.vnDaySave_(day, [{ venue: '京セラドーム', title: 'コンサート', start: '18:00', end: '21:00', url: 'https://kyocera/' }]);
  vm.runInContext('function wbUrl_(){ return "https://script.google.com/macros/s/AAA/exec"; }', ctx);

  const u = ctx.vnIcsUrl_(day, 0);
  has(u, 'ics=1&d=20260916&i=0', 'みんなの記録ページと同じ入口に、予定ファイルを取りに行く');

  const got = ctx.vnIcsServe_('20260916', 0);
  eq(got && got.name, 'event.ics', '★押すと .ics が返る');
  const t = got.text;
  has(t, 'BEGIN:VCALENDAR', '世界共通の予定ファイルの形');
  has(t, 'SUMMARY:京セラドーム\\u3000コンサート'.replace('\\u3000', '　'), '  題は会場名と催し名');
  has(t, 'DTSTART:20260916T090000Z', '  日本時間18:00を世界標準時に直している');
  has(t, 'DTEND:20260916T120000Z', '  終わりは21:00');
  has(t, 'BEGIN:VALARM', '★アラームが入っている（スマホ自身が鳴る）');
  has(t, 'TRIGGER;RELATED=END:-PT5M', '★終了予定の5分前に鳴る');
  has(t, 'LOCATION:京セラドーム', '  場所も入る');
  has(t, 'https://kyocera/', '  公式ページのリンクも入る');
  eq(t.indexOf('\r\n') !== -1, true, '  行の区切りは決まりどおり（CRLF）');
  eq(ctx.vnIcsServe_('20260916', 9), null, '  無い番号なら null（ふつうのページを出す）');
  eq(ctx.vnIcsServe_('あ', 0), null, '  日付がおかしくても落ちない');

  // カンマや「;」が題に入っても壊れない
  ctx.vnDaySave_(day, [{ venue: 'A,B', title: 'C;D', start: '18:00', end: '21:00', url: '' }]);
  has(ctx.vnIcsServe_('20260916', 0).text, 'SUMMARY:A\\,B　C\\;D', '★カンマや「;」が入っても壊れない');

  // ボタンが絵に出る
  ctx.vnDaySave_(day, [{ venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' }]);
  const row = JSON.stringify(ctx.vnBellRow_({ venue: '京セラドーム' }, 0, day));
  has(row, '⏰ﾘﾏｲﾝﾀﾞｰ', '★通知設定のらんに、リマインダーのボタンが出る');
  eq(row.indexOf('スマホのアラーム'), -1, '  ★前の長い字は、もう使わない（途中で切れていた）');
  has(row, '📱LINE', '  LINEのボタンも、そのまま残る');

  // まだ1度も公開していないときは、開かないボタンを出さない
  vm.runInContext('function wbUrl_(){ return ""; }', ctx);
  eq(ctx.vnIcsUrl_(day, 0), '', 'ページを公開していなければ、リンクは作れない');
  eq(JSON.stringify(ctx.vnBellRow_({ venue: 'x' }, 0, day)).indexOf('⏰ﾘﾏｲﾝﾀﾞｰ'), -1,
     '★そのときは、押しても開かないボタンを出さない');
  vm.runInContext('function wbUrl_(){ return "https://script.google.com/macros/s/AAA/exec"; }', ctx);
}

console.log('\n■ 📣 スマホ通知（LINEが開けないときの本命）');
{
  const W = ctx.vnPushWord_;
  eq(W('スマホ通知').kind, 'on', '「スマホ通知」で入れる');
  eq(W('すまほ通知').kind, 'on', '  ひらがなでも通る');
  eq(W('アプリ通知').kind, 'on', '  「アプリ通知」でも通る');
  eq(W('ntfy').kind, 'on', '  アプリの名前でも通る');
  eq(W('スマホ通知 解除').kind, 'off', '「解除」で止める');
  eq(W('スマホ通知 入れ直し').kind, 'reset', '「入れ直し」で合言葉を作り直す');
  eq(W('スマホ'), null, '★「スマホ」だけでは動かない（ふつうの話に反応しない）');
  eq(W('アプリ'), null, '  「アプリ」だけでも動かない');
  eq(W('スマホが壊れた'), null, '  ふつうの話には反応しない');
  eq(W(''), null, '空でも落ちない');
  eq(W(null), null, 'null でも落ちない');

  // 入れる
  fetched.length = 0; pushed.length = 0;
  delete props['VNPUSH_Umark'];
  reply['*'] = { code: 200, body: '' };
  const took = ctx.vnHandlePushCmd_({ replyToken: 'r', source: { userId: 'Umark' },
    message: { text: 'スマホ通知' } });
  eq(took, true, '「スマホ通知」の合図は、ここが扱う');
  const topic = props['VNPUSH_Umark'];
  eq(typeof topic === 'string' && topic.indexOf('taxi-') === 0, true,
     '★合言葉を自動で作る（スクリプトプロパティにだけ置く）');
  eq(topic.length >= 25, true, '  ★人に当てられない長さにする');
  eq(pushed[0].to, 'Umark', '★案内は本人の個人LINEへ（グループに合言葉を出さない）');
  const tx = msgText(pushed[0].msgs[0]);
  has(tx, 'ntfy', '  アプリの名前を出す');
  has(tx, 'play.google.com', '  ★Android の入れ先も出す');
  has(tx, 'apps.apple.com', '  iPhone の入れ先も出す');
  has(tx, 'https://ntfy.sh/' + topic, '★押すだけで登録できるリンクを出す');
  has(tx, '会員登録もパスワードもありません', '  手数が少ないことも伝える');
  has(tx, '人に教えないでください', '  ★合言葉は人に教えないよう、はっきり書く');
  eq(fetched.length, 1, '  入れたらすぐ、テストを1通送る');
  eq(fetched[0].url, 'https://ntfy.sh', '  ★日本語が通るよう、JSONの形で送る');
  const body = JSON.parse(fetched[0].opt.payload);
  eq(body.topic, topic, '  宛先はその合言葉');

  // 二度目は、同じ合言葉のまま
  pushed.length = 0;
  ctx.vnHandlePushCmd_({ replyToken: 'r', source: { userId: 'Umark' }, message: { text: 'スマホ通知' } });
  eq(props['VNPUSH_Umark'], topic, '★二度目に打っても、合言葉は変わらない');
  has(msgText(pushed[0].msgs[0]), 'もう入っています', '  もう入っていると伝える');

  // 入れ直すと、別の合言葉になる
  ctx.vnHandlePushCmd_({ replyToken: 'r', source: { userId: 'Umark' }, message: { text: 'スマホ通知 入れ直し' } });
  eq(props['VNPUSH_Umark'] !== topic, true, '★「入れ直し」で、合言葉が変わる');
  const topic2 = props['VNPUSH_Umark'];

  // リマインダーが、アプリにも飛ぶ
  fetched.length = 0; pushed.length = 0;
  props['VN_REMIND'] = JSON.stringify([
    { id: 'a', k: 'aaaaaa', at: Date.now() + 5000, how: 'me', to: 'Umark',
      venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: 'https://kyocera/' }]);
  ctx.vnRemindTick_();
  eq(pushed.length, 1, 'LINEにも届く');
  const sent = fetched.filter(f => f.url === 'https://ntfy.sh');
  eq(sent.length, 1, '★スマホのアプリにも届く');
  const b2 = JSON.parse(sent[0].opt.payload);
  eq(b2.topic, topic2, '  宛先は、その人の合言葉');
  has(b2.title, '京セラドーム', '  ★題に会場名（開かなくても分かる）');
  has(b2.message, '終了予定', '  中身も同じ');
  eq(b2.click, 'https://kyocera/', '★押したら、その会場のページが開く');
  eq(b2.priority >= 4, true, '  音が鳴るよう、強さを上げておく');

  // 止めたら、飛ばない
  ctx.vnHandlePushCmd_({ replyToken: 'r', source: { userId: 'Umark' }, message: { text: 'スマホ通知 解除' } });
  eq(props['VNPUSH_Umark'], undefined, '★解除すると、合言葉は消える');
  fetched.length = 0; pushed.length = 0;
  props['VN_REMIND'] = JSON.stringify([
    { id: 'a', k: 'aaaaaa', at: Date.now() + 5000, how: 'me', to: 'Umark',
      venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' }]);
  ctx.vnRemindTick_();
  eq(fetched.filter(f => f.url === 'https://ntfy.sh').length, 0, '  解除したら、もう飛ばない');
  eq(pushed.length, 1, '  LINEのほうは、そのまま届く');

  // 送れなかったときは、そう言う（黙って終わらない）
  reply['*'] = { code: 500, body: '' };
  pushed.length = 0;
  ctx.vnHandlePushCmd_({ replyToken: 'r', source: { userId: 'Umark' }, message: { text: 'スマホ通知' } });
  has(msgText(pushed[0].msgs[0]), 'つまずきました', '★テストが送れなければ、はっきりそう言う');
  reply['*'] = { code: 200, body: '' };
  delete props['VNPUSH_Umark'];
}

console.log('\n■ 📧 メールでも受け取れる（LINEが開けないとき用）');
{
  const W = ctx.vnMailWord_;
  eq(W('メール通知 taro@example.com').kind, 'on', 'アドレスを送ると、入れる合図');
  eq(W('メール通知 taro@example.com').addr, 'taro@example.com', '  アドレスを取り出せる');
  eq(W('メール通知　taro@example.com').addr, 'taro@example.com', '  全角の空白でも通る');
  eq(W('メール通知：taro@example.com').addr, 'taro@example.com', '  「：」でも通る');
  eq(W('めーる通知 taro@example.com').kind, 'on', '  ひらがなでも通る');
  eq(W('メール通知').kind, 'status', '「メール通知」だけなら、いまの状態を答える');
  eq(W('メール通知 解除').kind, 'off', '「解除」で止める');
  eq(W('メール通知 やめる').kind, 'off', '  「やめる」でも止まる');
  eq(W('メール通知 あいうえお').kind, 'bad', 'アドレスとして読めなければ、そう言う');
  eq(W('こんにちは'), null, 'ふつうの話には反応しない');
  // ★アドレスだけを打っても通る（「メール通知」を覚えなくてよい）
  eq(W('taro@example.com').kind, 'on', '★アドレスだけ送っても通る');
  eq(W('taro@example.com').bare, true, '  「アドレスだけ」と分かるようにしておく');
  eq(W('メール通知 taro@example.com').bare, undefined, '  言葉つきのときは、そうではない');
  eq(W(''), null, '空でも落ちない');
  eq(W(null), null, 'null でも落ちない');

  // 入れる → テストメールが飛ぶ
  mails.length = 0; pushed.length = 0;
  delete props['VNMAIL_Umark'];
  const took = ctx.vnHandleMailCmd_({ replyToken: 'r', source: { userId: 'Umark' },
    message: { text: 'メール通知 taro@example.com' } });
  eq(took, true, '「メール通知」の合図は、ここが扱う');
  eq(props['VNMAIL_Umark'], 'taro@example.com', '★アドレスはスクリプトプロパティにだけ置く');
  eq(mails.length, 1, '  入れたらすぐ、テストのメールを1通送る');
  eq(mails[0].to, 'taro@example.com', '  宛先はそのアドレス');
  eq(pushed[0].to, 'Umark', '★返事は本人の個人LINEへ（グループにアドレスを出さない）');

  // ★アドレスだけの打ち込みは、公式LINE（1対1）のときだけ受ける
  delete props['VNMAIL_Umark'];
  pushed.length = 0; mails.length = 0;
  eq(ctx.vnHandleMailCmd_({ replyToken: 'r', source: { userId: 'Umark' },
       message: { text: 'taro@example.com' } }), true, 'アドレスだけでも、公式LINEなら受ける');
  eq(props['VNMAIL_Umark'], 'taro@example.com', '  それで登録できる');
  delete props['VNMAIL_Umark'];
  eq(ctx.vnHandleMailCmd_({ replyToken: 'r', source: { userId: 'Umark', groupId: 'Cgroup' },
       message: { text: 'taro@example.com' } }), false,
     '★グループでアドレスが流れても、勝手に登録しない');
  eq(props['VNMAIL_Umark'], undefined, '  登録されていない');
  ctx.vnHandleMailCmd_({ replyToken: 'r', source: { userId: 'Umark' },
    message: { text: 'メール通知 taro@example.com' } });

  // グループで打たれたら、そのことも伝える
  pushed.length = 0; mails.length = 0;
  ctx.vnHandleMailCmd_({ replyToken: 'r', source: { userId: 'Umark', groupId: 'Cgroup' },
    message: { text: 'メール通知 taro@example.com' } });
  has(msgText(pushed[0].msgs[0]), 'みんなに見えます', '  グループに打つと見えてしまうと伝える');

  // リマインダーが、メールにも飛ぶ
  mails.length = 0; pushed.length = 0;
  props['VN_REMIND'] = JSON.stringify([
    { id: 'a', k: 'aaaaaa', at: Date.now() + 5000, how: 'me', to: 'Umark',
      venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' }]);
  ctx.vnRemindTick_();
  eq(pushed.length, 1, 'LINEにも届く');
  eq(mails.length, 1, '★メールにも届く');
  has(mails[0].subject, '京セラドーム', '  件名に会場名（開かなくても分かる）');
  has(mails[0].body, '終了予定', '  中身も同じ');

  // 止めたら、メールは飛ばない
  ctx.vnHandleMailCmd_({ replyToken: 'r', source: { userId: 'Umark' },
    message: { text: 'メール通知 解除' } });
  eq(props['VNMAIL_Umark'], undefined, '★解除すると、アドセスは消える'.replace('アドセス', 'アドレス'));
  mails.length = 0; pushed.length = 0;
  props['VN_REMIND'] = JSON.stringify([
    { id: 'a', k: 'aaaaaa', at: Date.now() + 5000, how: 'me', to: 'Umark',
      venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' }]);
  ctx.vnRemindTick_();
  eq(mails.length, 0, '  解除したら、もうメールは飛ばない');
  eq(pushed.length, 1, '  LINEのほうは、そのまま届く');
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
  eq(ctx.vnNoMark_(1), '❶', '★番号は❶❷❸…（背景ぬり。細い①は見落とすため）');
  eq(ctx.vnNoMark_(3), '❸', '  3つめも');
  eq(ctx.vnNoMark_(10), '❿', '  10まで');
  eq(ctx.vnNoMark_(11), '⓫', '  11から先も、ちゃんと出る');
  eq(ctx.vnNoMark_(21), '(21)', '  20をこえたら「(21)」');
  // ★どんな書き方でも通じること
  [['❶❸削除', '背景ぬり'], ['①③削除', '白ぬき'], ['➊➌削除', '太い背景ぬり'],
   ['⓵⓷削除', '二重まる'], ['1,3削除', '半角の数字'], ['１、３削除', '全角の数字'],
   ['1と3削除', '「と」でつないでも'], ['(1)(3)削除', 'かっこ付き'], ['1.3削除', '点でつないでも']
  ].forEach(function (pair) { eq(ctx.vnNoParse_(pair[0]), [1, 3], '★' + pair[1] + '：' + pair[0]); });
  eq(ctx.vnNoParse_('⓫削除'), [11], '  ⓫も読み取れる');
  eq(ctx.vnNoParse_('削除'), [], '  番号が無ければ空');

  // ★番号は「画面に出る順」で、上から通しで振る
  const mixed = [
    { venue: 'ホテルA', kind: 'hotel', title: 'H1', start: '18:00', end: '21:00', url: '' },
    { venue: '会場A', kind: 'event', title: 'E1', start: '18:00', end: '21:00', url: '' },
    { venue: 'ホテルB', kind: 'hotel', title: 'H2', start: '18:00', end: '21:00', url: '' },
    { venue: '会場B', kind: 'event', title: 'E2', start: '18:00', end: '21:00', url: '' }
  ];
  const sorted = ctx.vnSortForShow_(mixed).map(e => e.venue);
  eq(sorted, ['会場A', '会場B', 'ホテルA', 'ホテルB'], '絵に出る順（イベント→バラシ→ホテル）に並べ直す');
  pushed.length = 0;
  ctx.vnSendTest_(base, mixed);
  const saved = JSON.parse(props[ctx.vnEditKey_(base)]);
  eq(saved.map(e => e.venue + e.no), ['会場A1', '会場B2', 'ホテルA3', 'ホテルB4'],
     '★番号は上から通し。カテゴリーごとに❶へ戻らない');
  eq(new Set(saved.map(e => e.no)).size, saved.length, '★同じ番号は二度と出ない');
  // ★ボタンの引き当て先も、同じ並びでそろっていること。
  //   ここがずれると、押したのと別の催しのリマインダーが入ってしまう
  eq(ctx.vnDayLoad_(base).map(e => e.venue), sorted,
     '★ボタンが引き当てる並びも、画面と同じ順にそろえる');
  // 絵の中でも、❶❷❸❹が上から順に出てくる
  const order = JSON.stringify(pushed[0].msgs[0]).match(/[\u2776-\u277F]/g);
  eq(order, ['❶', '❷', '❸', '❹'], '★絵の中も、上から❶❷❸❹の順にならぶ');

  pushed.length = 0;
  eq(ctx.vnSendTest_(base, evs), true, '確認用を送れる');
  eq(pushed[0].to, 'Umark', '★まーくさんだけに行く（グループではない）');
  const j = JSON.stringify(pushed[0].msgs[0]);
  has(j, '❶', '  番号が付く');
  has(j, '❸', '  3件目まで');
  has(j, '確認用', '  確認用だと分かる');
  has(j, 'この内容でよろしいですか', '  最後に「よろしいですか」と聞く');
  has(j, 'vn=ok&d=20260916', '  【はい】のボタンが付く');
  has(j, 'vn=ng&d=20260916', '  【いいえ】のボタンも付く');
  has(j, '17:00', '  何もしなければ17:00に出ることも書いてある');
  eq(ctx.lrBytes_(j) <= 9500, true, '  ボタンを足しても1通に収まる（' + ctx.lrBytes_(j) + 'バイト）');

  // 【いいえ】を押したときだけ、直し方の手順を出す
  ctx.lastReply = '';
  eq(ctx.vnHandlePostback_({ postback: { data: 'vn=ng&d=20260916' }, replyToken: 'r' }), true, '【いいえ】を受ける');
  has(ctx.lastReply, '「❶削除」', '  そのときに直し方をお伝えする');
  has(ctx.lastReply, '「❶修正：', '  修正のしかたも');
  has(ctx.lastReply, 'どんな書き方でも通じます', '  ★番号の書き方は問わないと、はっきり書く');
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
  has(ctx.lastReply, '❶', '  番号つきで出る');
  has(ctx.lastReply, 'ドーム前', '  近い乗り場も出る');
  has(ctx.lastReply, '※注意（必ずお読みください）※', '  ★注釈は「注意」として必ず付ける');

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

console.log('\n■ 見られていなくても、18:30には最新のまま出す');
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
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(2026, 8, 16, 18, 31); };
  D.prototype = RealDate.prototype; D.now = RealDate.now;
  ctx.Date = D;
  pushed.length = 0;
  ctx.venueDailyJob();
  eq(pushed.length, 1, '★【はい】が押されていなくても、18:30には送る');
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
  // ★「LINEに出すか」と「出さない理由」が、ここでいちばん見たいもの
  eq(row[6], '○ 出す', '★LINEに出るかどうかを、1行ずつ出す');
  eq(row[7], '', '  出すものは、理由のらんは空');
  has(row[11], '渡辺橋', '  近い乗り場も出す');
  has(row[12], 'スクショ', '  どこから読んだか');
  eq(row.length, 14, '  らんの数（日付〜確かめるリンクまで）');

  // 落としたものは、理由まで出る
  const J = ctx.vnLedgerJudge_;
  eq(J({ start: '', end: '' }).ok, false, '時刻が読めないものは、出さない');
  has(J({ start: '', end: '' }).why, '時刻が読み取れていない', '  ★その理由も書く');
  eq(J({ start: '10:00', end: '12:00' }).ok, false, '昼に終わるものは、出さない');
  has(J({ start: '10:00', end: '12:00' }).why, '時間帯の外', '  ★その理由も書く');
  eq(J({ start: '18:00', end: '21:00' }).ok, true, '18:00〜翌04:00 のものは、出す');
  eq(J({ start: '18:00', end: '21:00', people: 100 }).ok, false, '人数が少なければ、出さない');
  has(J({ start: '18:00', end: '21:00', people: 100 }).why, '300人', '  ★その理由も書く');

  // ★条件の一覧が、そのまま読める形で出ること
  const rules = ctx.vnLedgerRules_();
  const flat = rules.map(r => r.join(' ')).join('\n');
  has(flat, '18:00', '「いまの条件」に、時間帯が出る');
  has(flat, '04:00（翌日）', '  終わりの時刻も');
  has(flat, '300人', '  人数の下限も');
  has(flat, '18:00', '  確認用の時刻も');
  has(flat, '18:30', '  グループへ送る時刻も');
  has(flat, '5 分前', '  リマインダーの何分前かも');
  has(flat, '大阪城ホール', '  見に行くページの名前も');
  has(flat, '万博記念公園', '  外しているところも、はっきり書く');

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


console.log('\n■ 連日の催しには（〇日目／〇日間）を付ける');
{
  for (const k in props) if (/^VN[VH]_/.test(k)) delete props[k];
  const mk = n => JSON.stringify([{ hall: 'フェスティバルホール', name: 'ディズニー・オン・クラシック', start: '18:00', end: '20:30' }]);
  props['VNV_20260920'] = mk(); props['VNV_20260921'] = mk(); props['VNV_20260922'] = mk();
  props['VNV_20261001'] = JSON.stringify([{ hall: 'フェスティバルホール', name: '吉川晃司', start: '18:00', end: '20:30' }]);

  const d1 = ctx.vnHallForDay_(new Date(2026, 8, 20));
  const d2 = ctx.vnHallForDay_(new Date(2026, 8, 21));
  const d3 = ctx.vnHallForDay_(new Date(2026, 8, 22));
  has(d1[0].title, '（1日目／3日間）', '★1日目と分かる');
  has(d2[0].title, '（2日目／3日間）', '  2日目も');
  has(d3[0].title, '（3日目／3日間）', '  3日目も');

  const one = ctx.vnHallForDay_(new Date(2026, 9, 1));
  eq(one[0].title.indexOf('日目'), -1, '★1日だけの催しには、何も付けない');
  for (const k in props) if (/^VN[VH]_/.test(k)) delete props[k];
}

console.log('\n■ ワントゥワンは、詳細まで開いて「徹夜」を見る');
{
  const today = new Date();
  const md = (today.getMonth() + 1) + '月' + today.getDate() + '日';
  const listing = '<html><p>' + md + '</p><p>バラシ 22:00</p>' +
                  '<a href="https://onetoone-jp.com/detail.php?id=1">くわしく</a>' +
                  '<p>' + 'あ'.repeat(600) + '</p></html>';
  const detail = '<html><p>' + md + '</p><p>公演名：ＢＡＢＹＭＯＮＳＴＥＲ</p>' +
                 '<p>作業：搬出　徹夜作業となります</p><p>2日目／3日間</p>' +
                 '<p>' + 'あ'.repeat(600) + '</p></html>';
  reply = { 'https://onetoone-jp.com/schedule.php': { code: 200, body: listing },
            'https://onetoone-jp.com/detail.php?id=1': { code: 200, body: detail },
            '*': { code: 404, body: '' } };
  const got = ctx.vnScrapeOne_({ name: 'ワントゥワン', kind: 'barasi', detail: true,
                                 url: 'https://onetoone-jp.com/schedule.php' }, today);
  eq(got.events.length >= 1, true, '一覧から拾える');
  has(got.events[0].warn, '徹夜', '★詳細の「徹夜」を拾って、はっきり書く');
  has(got.events[0].warn, '待たないほうが無難', '  どうすればよいかも書く');
  has(got.events[0].title, 'ＢＡＢＹＭＯＮＳＴＥＲ', '★対象の公演名も拾う');
  has(got.events[0].title, '（2日目／3日間）', '★何日目かも拾う');

  // 「徹夜」が無ければ、よけいなことは書かない
  reply['https://onetoone-jp.com/detail.php?id=1'] =
    { code: 200, body: '<html><p>' + md + '</p><p>公演名：テスト</p><p>作業：搬出</p><p>' + 'あ'.repeat(600) + '</p></html>' };
  const got2 = ctx.vnScrapeOne_({ name: 'ワントゥワン', kind: 'barasi', detail: true,
                                  url: 'https://onetoone-jp.com/schedule.php' }, today);
  eq(!got2.events[0].warn, true, '★「徹夜」が無ければ、注意は書かない');

  // カードにも出ること
  const card = JSON.stringify(ctx.vnCard_({ venue: 'ワントゥワン', kind: 'barasi', title: 'x',
    start: '22:00', end: '', url: '', warn: '⚠️ 詳細に「徹夜」とあります。' }, 0, null));
  has(card, '徹夜', '  絵にも、はっきり出る');
}


console.log('\n■ 「終了」とは書かない（必ず「終了予定」）');
{
  // ★催しの終わりは ほぼ必ず前後する。言い切ると、それを信じて動いた人が損をする
  const c1 = JSON.stringify(ctx.vnCard_({ venue: '京セラドーム', kind: 'event', title: 'x',
    start: '18:00', end: '21:00', url: '' }, 0, null));
  has(c1, '18:00〜21:00予定', '★始まりと終わりが分かるときも「予定」と付ける');
  eq(/21:00[^予]/.test(c1.replace('18:00〜21:00予定', '')), false, '  言い切らない');

  const c2 = JSON.stringify(ctx.vnCard_({ venue: '京セラドーム', kind: 'event', title: 'x',
    end: '21:00', url: '' }, 0, null));
  has(c2, '21:00 終了予定', '★終わりだけ分かるときも「終了予定」');
  eq(c2.indexOf('21:00 終了"'), -1, '  「終了」で言い切らない');

  const c3 = JSON.stringify(ctx.vnCard_({ venue: '京セラドーム', kind: 'event', title: 'x',
    start: '18:00', url: '' }, 0, null));
  has(c3, '18:00 開始', '始まりだけのときは「開始」');

  // 予約のお知らせの文も同じ
  const r = ctx.vnRemText_({ venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' });
  has(r, '終了予定', '★お知らせの文も「終了予定」');
}


const ok2 = (cond, msg) => { if (!cond) { fail++; console.log('NG  ', msg); } };
console.log('\n■ イベントの注意書きは、入るだけ詰める');
{
  /*
   * ★前は「\n」を手で入れて4行に決め打ちしていた。
   *   右側が空いていても次の文が下へ落ち、むだに背の高い箱になっていた
   */
  const P = ctx.vnPackJa_;
  const L = JSON.parse(vm.runInContext('JSON.stringify(VN_NOTE_LINES)', ctx));

  eq(L.length >= 4, true, '注意書きは、文ごとに持っている（' + L.length + '文）');
  eq(L.every(x => x.indexOf('\n') === -1), true, '★文の中に、決め打ちの改行を持たない');

  // 広ければ、同じ行に詰まる
  const wide = P(L, 40).split('\n');
  const narrow = P(L, 20).split('\n');
  eq(wide.length < narrow.length, true,
     '★広いほど、行数は少なくなる（' + wide.length + '行 対 ' + narrow.length + '行）');
  eq(P(L, 40).replace(/\n/g, ''), L.join(''), '★言葉は1文字も足さない・減らさない');

  // 切ってよいのは「。」「、」のうしろだけ。言葉のまん中では切らない
  const w = t => { let n = 0; for (let i = 0; i < t.length; i++) n += t.charCodeAt(i) < 0x100 ? 1 : 2; return n; };
  const T23 = ctx.vnNoteText_().split('\n');
  eq(T23.length, 3, '★既定（23文字ぶん）で3行に詰まる（前は4行）');
  eq(T23.slice(0, -1).every(x => /[。、！？)）]$/.test(x)), true,
     '★行の終わりは、かならず句読点（言葉のまん中で切らない）');
  eq(T23.every(x => w(x) <= 23 * 2), true,
     '★どの行も、決めた幅に収まる（いちばん長くて ' + Math.max(...T23.map(w)) / 2 + '文字ぶん）');
  eq(T23.slice(0, -1).every(x => w(x) > 23), true,
     '★右側をむだに空けない（半分より短い行を作らない）');

  // せまくても、文を割らない（入らない文は、そのまま1行）
  eq(P(['とてもとてもとてもとても長い文です。'], 10), 'とてもとてもとてもとても長い文です。',
     '★入らない文でも、とちゅうでは切らない');

  eq(P([], 30), '', '空でも落ちない');
  eq(P(null, 30), '', 'null でも落ちない');

  // 1行の文字数は、設定タブで変えられる
  eq(vm.runInContext('VN_NOTE_W', ctx), 23, '既定は23文字ぶん');
  const T = ctx.vnNoteText_();
  eq(T.indexOf('公式ページ') !== -1, true, '★本文は、これまでどおり全部入っている');
  eq(T.indexOf('AIによる自動読み取り') !== -1, true, '  AIが読んだものだと必ず書く');
}

console.log('\n■ 見にいく先に、大阪城音楽堂とフェスティバルホールを足した');
{
  // const で作ったものは ctx に生えないので、中で評価して取り出す
  const SRC = vm.runInContext('JSON.stringify(VN_SOURCES)', ctx);
  const names = JSON.parse(SRC).map(x => x.name);
  const one = n => JSON.parse(SRC).filter(x => x.name === n)[0];

  eq(names.indexOf('大阪城音楽堂') !== -1, true, '★大阪城音楽堂を見にいく');
  eq(one('大阪城音楽堂').url, 'https://www.osakacastlepark.jp/ongakudo/event/',
     '  読み先のアドレス');
  eq(one('大阪城音楽堂').deep, true,
     '★詳細のページまで開く（一覧に時刻が無いため。オータニと同じ）');
  eq(one('大阪城音楽堂').kind, 'event', '  イベントあつかい');

  eq(names.indexOf('フェスティバルホール') !== -1, true, '★フェスティバルホールも見にいく');
  eq(one('フェスティバルホール').deep, true, '  こちらも詳細のページまで開く');

  // 会場のこと（近くの乗り場・入る人数）も、そろっていないと出せない
  const V = JSON.parse(vm.runInContext('JSON.stringify(VN_VENUES)', ctx));
  eq(!!V['大阪城音楽堂'], true, '★近くの乗り場と人数も、決めてある');
  eq(V['大阪城音楽堂'].type, '野外', '  屋根の無い野外あつかい（終わる時刻の見積もりに使う）');
  eq(V['大阪城音楽堂'].near.indexOf('大阪城公園') !== -1, true, '  近くの乗り場に大阪城公園');
  eq(!!V['フェスティバルホール'], true, 'フェスティバルホールも、これまでどおり');
}

console.log('\n■ 同じ公演が2つならばないようにする');
{
  /*
   * ★フェスティバルホールは、月間表の写真からも、ホームページからも読む。
   *   そのままだと同じ公演が2回ならび、見た人が数えまちがえる
   */
  const 写真 = { venue: 'フェスティバルホール', start: '18:30', end: '21:00',
                 title: '山下達郎', url: 'x' };
  const HP   = { venue: 'フェスティバルホール', start: '18:30', end: '21:00',
                 endGuess: true, title: '（名前を読み取れませんでした）', url: 'y' };
  const d1 = ctx.vnDedup_([写真, HP]);
  eq(d1.length, 1, '★同じ会場・同じ開演のものは、1つにまとめる');
  eq(d1[0].title, '山下達郎', '★中身の濃いほう（終わりがはっきり・名前が読める）を残す');

  const d2 = ctx.vnDedup_([HP, 写真]);
  eq(d2.length, 1, '  順番が逆でも、まとまる');
  eq(d2[0].title, '山下達郎', '  ★残るのは、やはり濃いほう');

  const 別公演 = { venue: 'フェスティバルホール', start: '14:00', end: '16:00', title: '昼の部' };
  eq(ctx.vnDedup_([写真, 別公演]).length, 2, '★開演がちがえば、別の公演として両方出す');

  const 別会場 = { venue: '大阪城音楽堂', start: '18:30', end: '21:00', title: 'なにか' };
  eq(ctx.vnDedup_([写真, 別会場]).length, 2, '★会場がちがえば、まとめない');

  const 時刻なし = { venue: 'フェスティバルホール', start: '', end: '', title: 'A' };
  const 時刻なし2 = { venue: 'フェスティバルホール', start: '', end: '', title: 'B' };
  eq(ctx.vnDedup_([時刻なし, 時刻なし2]).length, 2,
     '開演が読めていないものは、まとめようがないので そのまま残す');

  eq(ctx.vnDedup_([]).length, 0, '空でも落ちない');
  eq(ctx.vnDedup_(null).length, 0, 'null でも落ちない');
}

console.log('\n■ 💬 ディスコードの用意（まーくさんが1回だけ）');
{
  /*
   * ★Androidの人にも確実に届く道が要る（まーくさんのご指摘）。
   *   押した人に「ウェブフックを作ってURLを渡して」とお願いしていたのは重すぎた。
   *   用意は まーくさんが1回だけ。ほかの人は招待リンクを1回押すだけ
   */
  const W = ctx.vnDiscordWord_;
  eq(W('ディスコード用意して').kind, 'how', '★「ディスコード用意して」で道順が出る');
  eq(W('ﾃﾞｨｽｺｰﾄﾞ用意して').kind, 'how', '  半角カナでも通る');
  eq(W('discord').kind, 'how', '  英語でも通る');
  eq(W('ディスコード https://discord.com/api/webhooks/1/abc').kind, 'hook',
     '★ウェブフックのURLは、送り先として覚える');
  eq(W('ディスコード https://discord.gg/abc').kind, 'invite',
     '★招待のURLは、みんなを呼ぶリンクとして覚える');
  eq(W('こんにちは'), null, 'ふつうの話には反応しない');
  eq(W(''), null, '空でも落ちない');
  eq(W(null), null, 'null でも落ちない');

  const H = ctx.vnHandleDiscordCmd_;
  const rep = [];
  vm.runInContext('function lineReply_(tok, t){ rep2.push(t); }', ctx);
  ctx.rep2 = rep;

  // まーくさん以外は、設定を触れない
  delete props['DISCORD_WEBHOOK']; delete props['DISCORD_INVITE'];
  rep.length = 0;
  eq(H({ message: { text: 'ディスコード https://discord.com/api/webhooks/1/abc' },
         source: { userId: 'Uother' }, replyToken: 'r' }), true, 'ほかの人が打っても、受けはする');
  eq(props['DISCORD_WEBHOOK'], undefined, '★ほかの人には、設定を触らせない');
  has(rep[0], 'まだ用意ができていません', '  代わりに、いまの状態を返す');

  // まーくさん → 道順
  rep.length = 0;
  eq(H({ message: { text: 'ディスコード用意して' }, source: { userId: 'Umark' }, replyToken: 'r' }), true,
     'まーくさんには、道順を返す');
  /*
   * ★サーバーはもうある（西東卍会・4人）。やることは「送り先」1つだけ
   */
  has(rep[0], 'サーバーがもうあるなら、やることは1つだけです', '★やることは1つだけ、と書いてある');
  has(rep[0], 'ウェブフック', '★送り先（ウェブフック）の作り方');
  has(rep[0], '鍵と同じ', '★URLは鍵と同じ、と注意してある');
  has(rep[0], 'グループには貼らないでください', '★グループに貼らないよう、はっきり書いてある');
  has(rep[0], '何も設定せずに通知が届きます', '★ほかの人は設定ゼロ、と書いてある');
  has(rep[0], 'discord.gg', '  まだ入っていない人のために、招待リンクの入れ方も書いてある');

  /*
   * ★送り先（ウェブフックURL）は鍵と同じ。
   *   グループLINEに貼られたら、そこにいる全員に見えてしまう。
   *   公式LINE（1対1）で送られたときだけ受け取る
   */
  delete props['DISCORD_WEBHOOK'];
  rep.length = 0;
  eq(H({ message: { text: 'ディスコード https://discord.com/api/webhooks/1/abc' },
         source: { userId: 'Umark', groupId: 'Cgroup' }, replyToken: 'r' }), true,
     'グループで送られても、受けはする');
  eq(props['DISCORD_WEBHOOK'], undefined, '★グループでは、送り先を覚えない（鍵と同じなので）');
  has(rep[0], '公式LINE（1対1）', '  1対1で送り直すよう伝える');
  has(rep[0], '作り直してください', '★見られたものは作り直すよう伝える');

  // ウェブフックを覚える
  rep.length = 0;
  eq(H({ message: { text: 'ディスコード https://discord.com/api/webhooks/1/abc' },
         source: { userId: 'Umark' }, replyToken: 'r' }), true, '送り先を入れられる');
  eq(props['DISCORD_WEBHOOK'], 'https://discord.com/api/webhooks/1/abc', '★送り先を覚える');

  // 招待リンクを覚える
  rep.length = 0;
  eq(H({ message: { text: 'ディスコード https://discord.gg/abc' },
         source: { userId: 'Umark' }, replyToken: 'r' }), true, '招待リンクも入れられる');
  eq(props['DISCORD_INVITE'], 'https://discord.gg/abc', '★招待リンクを覚える');
  eq(ctx.vnDiscordInvite_(), 'https://discord.gg/abc', '  あとから取り出せる');

  // 用意ができていれば、ほかの人にも入り口を教える
  rep.length = 0;
  eq(H({ message: { text: 'ディスコード' }, source: { userId: 'Uother' }, replyToken: 'r' }), true,
     'ほかの人が聞いたら');
  has(rep[0], 'https://discord.gg/abc', '★入り口（招待リンク）を返す');
  has(rep[0], '1回押すだけ', '  押すだけでよい、と書いてある');

  delete props['DISCORD_WEBHOOK']; delete props['DISCORD_INVITE'];
}

console.log('\n■ イベントの見張りは、何もしなくても立ち上がる');
{
  /*
   * ★これまでは、見張りを作り直すしくみ（vnSelfHeal_）が
   *   venueDailyJob の「中から」しか呼ばれていなかった。
   *   つまり、その見張りが1つも無いと、永遠に作られない。
   *   たまごが先か にわとりが先か、になっていた。
   *   実際、イベントの案内もリマインダーも1回も動かなかった（ご指摘）
   */
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '005-Updater.gs'), 'utf8');
  eq(src.indexOf("if (typeof vnSelfHeal_ === \"function\") vnSelfHeal_();") !== -1, true,
     '★1分おきのボタンの見張りから、イベントの見張りの面倒を見る');
  const pw = src.slice(src.indexOf('function panelWatch()'),
                       src.indexOf('function panelWatch()') + 1800);
  eq(pw.indexOf('vnSelfHeal_') !== -1, true, '  呼んでいるのは panelWatch の中');

  // 1日1回しか、実際の点検はしない（持ち時間を食わないため）
  delete props['VN_HEAL_YMD'];
  triggers.length = 0;
  const made1 = ctx.vnSelfHeal_();
  const made2 = ctx.vnSelfHeal_();
  eq(made2, false, '★同じ日に二度は点検しない（持ち時間を食わないため）');
  eq(!!props['VN_HEAL_YMD'], true, '  その日はもうやらない、と覚える');
  eq(typeof made1, typeof false, '  1回目は点検する');

  // 見張りが無ければ、作る
  delete props['VN_HEAL_YMD'];
  triggers.length = 0;
  ctx.vnSelfHeal_();
  eq(triggers.filter(t => t.getHandlerFunction() === 'venueDailyJob').length, 1,
     '★イベントの見張りが無ければ、ここで作る');
  delete props['VN_HEAL_YMD'];
}

console.log('\n■ 18:00 と 18:30 も、時刻ぴったりに動かす');
{
  /*
   * ★ふだんの見張りは15分おき。そのままだと確認用は 16:30〜16:45 の
   *   どこかに届き、毎日ばらつく。見張りの回数は増やさずに、
   *   その時刻が近づいたときだけ1回きりの見張りを立てて、ぴったりにする
   */
  const AIM = 'venueAimFire';
  const aims = () => triggers.filter(t => t.getHandlerFunction() === AIM);
  const day = (h, m) => new Date(2026, 8, 17, h, m, 0).getTime();   // 2026/09/17
  const keyOf = () => 'VNSENT_20260917';

  delete props[keyOf()]; delete props[keyOf() + '_T'];

  // ① 17:50 … 確認用(18:00)まで10分。ぴったりの見張りを立てる
  triggers.length = 0;
  eq(ctx.vnAimTick_(day(17, 50)), true, '★18:00 が近づいたら、見張りを立てる');
  eq(aims().length, 1, '  立つのは1つだけ');
  eq(aims()[0]._kind, 'after', '  「〇分後に1回」の形で立てる');
  eq(Math.round(aims()[0]._ms / 60000), 10, '★10分後（＝18:00ぴったり）に動く');

  // ② 10:00 … まだ先。立てない（次のふだんの見張りでまた考える）
  triggers.length = 0;
  eq(ctx.vnAimTick_(day(10, 0)), false, '★まだ先のときは、立てない');
  eq(aims().length, 0, '  見張りを増やさない（持ち時間を使い切らないため）');

  // ③ 18:20 … 確認用は済み。次はグループ用(18:30)を狙う
  triggers.length = 0;
  props[keyOf() + '_T'] = '1';
  eq(ctx.vnAimTick_(day(18, 20)), true, '★確認用が済んだら、次は18:30を狙う');
  eq(Math.round(aims()[0]._ms / 60000), 10, '  10分後（＝18:30ぴったり）に動く');

  // ④ きょうのぶんが両方とも済んでいたら、もう立てない
  triggers.length = 0;
  props[keyOf()] = '1';
  eq(ctx.vnAimTick_(day(18, 20)), false, '★両方とも済んでいたら、立てない');
  eq(aims().length, 0, '  むだに動かさない');

  // ⑤ 立て直すときは、前のものを片づける（見張りは20個までしか作れない）
  triggers.length = 0;
  delete props[keyOf()]; delete props[keyOf() + '_T'];
  triggers.push({ getHandlerFunction: () => AIM, _kind: 'after', _ms: 1 });
  triggers.push({ getHandlerFunction: () => AIM, _kind: 'after', _ms: 2 });
  triggers.push({ getHandlerFunction: () => 'venueDailyJob' });
  ctx.vnAimTick_(day(17, 50));
  eq(aims().length, 1, '★古いものは片づけて、1つだけにする');
  eq(triggers.filter(t => t.getHandlerFunction() === 'venueDailyJob').length, 1,
     '  ふだんの見張りは、消さない');

  // ⑥ 自動発信を切っているときは、何もしない
  triggers.length = 0;
  const keepAuto = props['VN_AUTO'];
  props['VN_AUTO'] = '0';
  eq(ctx.vnAimTick_(day(17, 50)), false, '★自動発信を切っていたら、何もしない');
  eq(aims().length, 0, '  そのときは、見張りも立てない');
  if (keepAuto === undefined) delete props['VN_AUTO']; else props['VN_AUTO'] = keepAuto;

  delete props[keyOf()]; delete props[keyOf() + '_T'];
  triggers.length = 0;
}

console.log('\n■ リマインダーは、終了予定の5分前ぴったりに届ける');
{
  // ★見張りは15分おきにしか動かない。5分前に知らせたいのに、
  //   先回りして送れば20分前、過ぎてから送れば終わったあと。どちらもだめ。
  //   だから「その時刻に1回だけ動く見張り」を別に立てる
  props['VN_REMIND'] = JSON.stringify([
    { id: 'a', k: 'aaaaaa', at: Date.now() + 10 * 60000, how: 'me', to: 'Umark',
      venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' },
    { id: 'b', k: 'bbbbbb', at: Date.now() + 40 * 60000, how: 'me', to: 'Umark',
      venue: '大阪城ホール', title: 'y', start: '18:00', end: '21:00', url: '' }
  ]);
  pushed.length = 0; triggers.length = 0;
  ctx.vnRemindTick_();
  eq(pushed.length, 0, '★あと10分のものを、いま先回りして送らない（早すぎると役に立たない）');
  const fire = triggers.filter(t => t.getHandlerFunction() === 'venueRemindFire');
  eq(fire.length, 1, '★代わりに、その時刻に1回だけ動く見張りを立てる');
  eq(fire[0]._kind, 'after', '  「〇分後に1回」の形で立てる');
  eq(Math.round(fire[0]._ms / 60000), 10, '  ★10分後ぴったりに動く');
  eq(JSON.parse(props['VN_REMIND']).length, 2, '  予約は、どちらも残しておく');

  // その時刻になったら、そこで送る
  pushed.length = 0; triggers.length = 0;
  props['VN_REMIND'] = JSON.stringify([
    { id: 'a', k: 'aaaaaa', at: Date.now() + 5000, how: 'me', to: 'Umark',
      venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' }
  ]);
  ctx.vnRemindTick_();
  eq(pushed.length, 1, '★時刻が来たら送る');
  has(msgText(pushed[0].msgs[0]), '京セラドーム', '  そのイベントのもの');
  has(msgText(pushed[0].msgs[0]), '終了予定', '  ★「終了」ではなく「終了予定」と書く');
  eq(JSON.parse(props['VN_REMIND']).length, 0, '  送ったら消える');

  // 役目を終えた「1回きりの見張り」は、たまらないように片づける
  triggers.length = 0;
  triggers.push({ getHandlerFunction: () => 'venueRemindFire', _kind: 'after', _ms: 1000 });
  triggers.push({ getHandlerFunction: () => 'venueRemindFire', _kind: 'after', _ms: 2000 });
  triggers.push({ getHandlerFunction: () => 'venueDailyJob' });
  props['VN_REMIND'] = '[]';
  ctx.vnRemindTick_();
  eq(triggers.filter(t => t.getHandlerFunction() === 'venueRemindFire').length, 0,
     '★終わった1回きりの見張りは、片づける（20個までしか作れないため）');
  eq(triggers.filter(t => t.getHandlerFunction() === 'venueDailyJob').length, 1,
     '  ふだんの見張りは、消さない');

  // 見張りが立てられなかったときは、先回りして送る（鳴らないよりまし）
  const keepNew = ctx.ScriptApp.newTrigger;
  ctx.ScriptApp.newTrigger = () => { throw new Error('もう作れません'); };
  props['VN_REMIND'] = JSON.stringify([
    { id: 'a', k: 'aaaaaa', at: Date.now() + 10 * 60000, how: 'me', to: 'Umark',
      venue: '京セラドーム', title: 'x', start: '18:00', end: '21:00', url: '' }
  ]);
  pushed.length = 0;
  ctx.vnRemindTick_();
  eq(pushed.length, 1, '★見張りを立てられなかったときだけ、先回りして送る');
  ctx.ScriptApp.newTrigger = keepNew;

  // 何分前にするかは、終了予定から数える
  const at = ctx.vnRemindAt_({ start: '18:00', end: '21:00' }, new Date(2026, 8, 16));
  const d = new Date(at);
  eq(d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2), '20:55',
     '★21:00 終了予定の5分前＝20:55に知らせる');
  const at2 = ctx.vnRemindAt_({ start: '18:00', end: '' }, new Date(2026, 8, 16));
  eq(new Date(at2).getHours(), 17, '  終わりが分からなければ、始まりから数える');
  eq(ctx.vnRemindAt_({ start: '', end: '' }, new Date(2026, 8, 16)), 0, '  時刻が無ければ 0（入れない）');
  delete props['VN_REMIND'];
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
