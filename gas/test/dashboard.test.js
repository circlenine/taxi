/**
 * まとめスプシの行き先さがし（dbOpenTarget_）を確かめる。
 *   実行: node gas/test/dashboard.test.js
 *
 * ★ここが1回こけただけでレポートが作れなくなり、
 *   「まとめスプシを開けませんでした」で止まった。
 *   控えが1つ壊れていても、残りで開ければ止まらないことを確かめる。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);
vm.runInContext('function logErr_(){}', ctx);

const ID_OK  = '1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const ID_BAD = '1BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

let props = {};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; } }) };

let cfgVals = {}, infoVals = {}, opened = [], created = 0;
vm.runInContext('function cfg_(k){ return cfgGet(k); }', ctx);
ctx.cfgGet = k => (k in cfgVals ? cfgVals[k] : '');

// 001-Code.gs の「控えらん」の写し（このテストは 003 しか読み込まないため）
vm.runInContext(`
  var INFO_COL = 9;
  var INFO_ROW = { GROUP:1, DASHBOARD:2, WEBAPP:3, DIAG:4, UPDATE:5, AUTO:6, EVENT:7, READ:8, NEWIDS:9 };
  function infoValue_(raw) {
    var v = String(raw == null ? "" : raw);
    v = v.replace(/^[\\s\\u3000]*【[^】]*】[\\s\\u3000]*\\r?\\n?/, "");
    return v.trim();
  }
  function infoGet_(row) { return infoValue_(infoRead(row)); }
  function infoSet_(row, value, label) { infoWrite(row, label ? "【" + label + "】\\n" + value : value); return true; }
  function infoIdOf_(raw) {
    var v = infoValue_(raw).replace(/[\\s\\u3000]+/g, "");
    if (!v) return "";
    var m = v.match(/\\/d\\/([A-Za-z0-9_-]{20,})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{20,}$/.test(v) ? v : "";
  }`, ctx);
ctx.infoRead = r => (r in infoVals ? infoVals[r] : '');
ctx.infoWrite = (r, v) => { infoVals[r] = String(v); };

let createdTitle = '';
ctx.SpreadsheetApp = {
  openById: id => {
    opened.push(id);
    if (id !== ID_OK) throw new Error('Illegal spreadsheet id or key: ' + id);
    return { _id: id, getSheetByName: () => null, getSheets: () => [], getName: () => 'まとめ' };
  },
  create: t => { created++; createdTitle = t; return { getId: () => 'NEWNEWNEWNEWNEWNEWNEWNEWNEWNEW111',
    getSheets: () => [], deleteSheet: () => {}, getSheetByName: () => null }; },
  flush: () => {},
  getUi: () => { throw new Error('no ui'); }
};

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8'), ctx);

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};
const reset = () => { props = {}; cfgVals = {}; infoVals = {}; opened = []; created = 0; createdTitle = ''; };
const mainSS = { getSheetByName: () => null };

console.log('■ 見出し付きで保存されていても、開ける');
{
  reset();
  // ★これが今回の事故そのもの。「【まとめスプシID】\n〇〇」が入っていた
  infoVals[2] = '【まとめスプシID】\n' + ID_OK;
  const ss = ctx.dbOpenTarget_(mainSS);
  ok(ss && ss._id === ID_OK, '見出しを外して開ける', opened);
  ok(props['DASHBOARD_ID'] === ID_OK, '  開けたIDを控えに書き直す');
  ok(infoVals[2].indexOf(ID_OK) !== -1, '  説明タブにも書き直す');
  ok(created === 0, '  新しいスプシは作らない');
}

console.log('\n■ 控えが1つ壊れていても、残りで開ける');
{
  reset();
  cfgVals['まとめスプシのID'] = ID_BAD;      // 設定タブが壊れている
  props['DASHBOARD_ID'] = ID_OK;             // 控えは生きている
  const ss = ctx.dbOpenTarget_(mainSS);
  ok(ss && ss._id === ID_OK, '次の候補で開ける', opened);
  ok(opened.length === 2, '  壊れたほうも一度は試す');
  ok(created === 0, '  新しいスプシは作らない');
}

console.log('\n■ URLをまるごと貼ってあっても開ける');
{
  reset();
  cfgVals['まとめスプシのID'] = 'https://docs.google.com/spreadsheets/d/' + ID_OK + '/edit?usp=drivesdk';
  ok(ctx.dbOpenTarget_(mainSS)._id === ID_OK, 'URLからIDを取り出して開ける');
}

console.log('\n■ 同じIDを2回試さない');
{
  reset();
  cfgVals['まとめスプシのID'] = ID_BAD;
  infoVals[2] = '【まとめスプシID】\n' + ID_BAD;
  props['DASHBOARD_ID'] = ID_BAD;
  let err = '';
  try { ctx.dbOpenTarget_(mainSS); } catch (e) { err = e.message; }
  ok(opened.length === 1, '同じIDは1回だけ試す', opened);
  ok(err.indexOf('開けませんでした') !== -1, 'ぜんぶダメなら、はっきり伝える');
  ok(err.indexOf('URLを貼り直して') !== -1, '  どうすればよいかも伝える');
  ok(created === 0, '  勝手に新しいスプシを作らない（増えると混乱するため）');
}

console.log('\n■ 行き先がどこにも無いときだけ、新しく作る');
{
  reset();
  const ss = ctx.dbOpenTarget_(mainSS);
  ok(created === 1, '1つだけ作る');
  ok(props['DASHBOARD_ID'] === 'NEWNEWNEWNEWNEWNEWNEWNEWNEWNEW111', '  作ったIDを控える');
}

console.log('\n■ IDでないものが入っていても、落ちない');
{
  reset();
  cfgVals['まとめスプシのID'] = 'あとで入れる';
  props['DASHBOARD_ID'] = ID_OK;
  ok(ctx.dbOpenTarget_(mainSS)._id === ID_OK, 'IDでないものは飛ばして、次の候補で開ける');
  ok(opened.length === 1, '  IDでないものは、そもそも試さない');
}

console.log('\n■ テスト用と本番用は、別のスプレッドシートにする');
{
  reset();
  props['DASHBOARD_ID']      = ID_OK;     // 本番用
  props['DASHBOARD_TEST_ID'] = ID_OK;     // テスト用（このテストでは同じIDで開ける形にする）
  cfgVals['まとめスプシのID'] = ID_BAD;   // 設定タブ（本番用だけが見る）

  opened.length = 0;
  ctx.dbOpenTarget_(mainSS, true);
  ok(opened.indexOf(ID_BAD) === -1, 'テスト用は、設定タブの行き先を見ない（本番用に書きに行かない）', opened);

  opened.length = 0;
  ctx.dbOpenTarget_(mainSS, false);
  ok(opened[0] === ID_BAD, '本番用は、設定タブの行き先から見る', opened);
}

console.log('\n■ テスト用の行き先は、説明タブに書かない');
{
  reset();
  props['DASHBOARD_TEST_ID'] = ID_OK;
  ctx.dbOpenTarget_(mainSS, true);
  ok(infoVals[2] === undefined, 'テスト用のIDを、説明タブに残さない（人の目に触れさせない）', infoVals);
  ok(props['DASHBOARD_TEST_ID'] === ID_OK, '  控えはテスト用の場所にだけ持つ');
  ok(props['DASHBOARD_ID'] === undefined, '  本番用の控えを上書きしない');
}

console.log('\n■ テスト用を新しく作るときは、名前で見分けられるようにする');
{
  reset();
  ctx.dbOpenTarget_(mainSS, true);
  ok(created === 1, 'テスト用を1つ作る');
  ok(String(createdTitle).indexOf('テスト用') !== -1, '  名前に「テスト用」が入る', createdTitle);
  ok(props['DASHBOARD_TEST_ID'] !== undefined, '  テスト用の控えに入る');
  ok(props['DASHBOARD_ID'] === undefined, '  本番用の控えは空のまま');
  ok(infoVals[2] === undefined, '  説明タブにも書かない');
}

console.log('\n■ まとめスプシの1行目（タイトル）');
{
  // このテストの合否は ok(条件, 説明) で書く。読みやすいように eq も用意する
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);
  /*
   * ★呼び名をそろえる。
   *   LINEの絵は「分析・戦略レポート」、まとめスプシは「営業ダッシュボード」と
   *   ばらばらに呼んでいた。同じものを2つの名前で呼ぶと、別のものだと思われる
   */
  const t = ctx.dbMainTitle_('2026/08/16〜2026/09/15', 214);
  eq(t.indexOf('分析・戦略レポート(詳細)') !== -1, true,
     '★呼び名は「分析・戦略レポート(詳細)」');
  ok(t.indexOf('営業ダッシュボード') === -1 === true, '★「営業ダッシュボード」とは、もう呼ばない');
  ok(t.indexOf('\n') === -1 === true, '★かならず1行（改行を入れない）');
  ok(t.indexOf('2026/08/16〜2026/09/15') !== -1 === true, '  期間が入る');
  ok(t.indexOf('全214件') !== -1 === true, '  総件数も入る');
  ok(ctx.dbMainTitle_('', 0).indexOf('\n') === -1 === true, '空でも1行のまま');
  ok(typeof ctx.dbMainTitle_(null, null) === 'string', 'null でも落ちない');

  /*
   * ★1行目を固定する。
   *   下のほうまで見ていくと、いま何の期間の表かが分からなくなっていた
   */
  let frozen = -1;
  const sheet = { setFrozenRows: n => { frozen = n; } };
  ok(ctx.dbFreezeTitle_(sheet) === true, '★1行目を固定する');
  ok(frozen === 1, '★固定するのは1行だけ（多いとスマホで見えるところが減る）');

  // 固定できない相手でも、そこで止まってしまわない
  eq(ctx.dbFreezeTitle_({ setFrozenRows: () => { throw new Error('だめ'); } }), false,
     '固定できなくても、落ちずに false を返す（表づくりは続ける）');
}

console.log('\n■ 待ち時間が読み取れなかったら「－」だけ');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);
  /*
   * ★待ち時間のマスは狭い。「データ不足（1件以上で表示）」のような長い文を入れると
   *   2行3行になって、表そのものが読みにくくなっていた
   */
  eq(ctx.dbWaitText_(''), '－', '★空なら「－」だけ');
  eq(ctx.dbWaitText_(null), '－', '  null でも「－」');
  eq(ctx.dbWaitText_(undefined), '－', '  未設定でも「－」');
  eq(ctx.dbWaitText_(0), '－', '★0分も「－」（待たなかったのではなく、書いていないことがほとんど）');
  eq(ctx.dbWaitText_('0分'), '－', '  「0分」と入っていても「－」');
  eq(ctx.dbWaitText_('データ不足（1件以上で表示）'), '－',
     '★長い「データ不足（〜）」も「－」にそろえる');
  eq(ctx.dbWaitText_(12), '12分', '読み取れていれば、そのまま分で書く');
  eq(ctx.dbWaitText_('平日 12分'), '平日 12分', '曜日つきの書き方は、そのまま残す');
  eq(ctx.dbWaitText_('  '), '－', '空白だけでも「－」');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
