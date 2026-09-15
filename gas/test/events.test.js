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
  return { getResponseCode: () => r.code, getContentText: () => r.body };
} };
let pushed = [];
ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); },
  getActiveSpreadsheet: () => ({ getSheetByName: () => null }) };
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

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
