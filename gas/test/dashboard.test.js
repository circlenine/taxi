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
  getUi: () => { throw new Error('no ui'); },
  // ★おまけの星人は、1つの文の中で 大きさ・太さ・色を変えて書きます。
  //   そのやり方（リッチテキスト）も、ここでまねておきます
  newRichTextValue: () => {
    const B = { _text: '', _styles: [],
      setText: t => { B._text = String(t); return B; },
      setTextStyle: (a, b, st) => { B._styles.push({ a: a, b: b, st: st }); return B; },
      setLinkUrl: () => B,
      build: () => ({ _text: B._text, _styles: B._styles }) };
    return B;
  },
  newTextStyle: () => {
    const T = { _bold: false, _size: 0, _color: '',
      setBold: v => { T._bold = v; return T; },
      setFontSize: v => { T._size = v; return T; },
      setForegroundColor: v => { T._color = v; return T; },
      setUnderline: () => T,
      build: () => ({ bold: T._bold, size: T._size, color: T._color }) };
    return T;
  }
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
  /*
   * ★年（2026/）は外します（ご指示）。
   *   タイトルが2行になると、いちばん上を固定したときに
   *   見えるところが そのぶん減ってしまうためです
   */
  ok(t.indexOf('8/16〜9/15') !== -1, '  期間が入る（年は外して短く）');
  ok(t.indexOf('2026') === -1, '★年は入れない（2行になるのを防ぐため）');
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

console.log('\n■ 個別乗り場の表（並び順・アツい時間の書き方・曜日の注釈）');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);

  /*
   * ★並びは、まずタブの順（北7→北4→北他→ﾐﾅﾐ→関空→ほか）。
   *   そのうえで、同じタブの中では金額の高い順。
   *   前は金額だけで並べていたので、北とﾐﾅﾐが交互に出てきて、
   *   どのエリアを見ているのか分からなくなっていた
   */
  const R = ctx.tabRank_;
  eq(R('北7') < R('北4'), true, '★北7 が いちばん先');
  eq(R('北4') < R('北他'), true, '  北4 → 北他');
  eq(R('北他') < R('ﾐﾅﾐ'), true, '  北他 → ﾐﾅﾐ');
  eq(R('ﾐﾅﾐ') < R('関空'), true, '  ﾐﾅﾐ → 関空');
  eq(R('関空') < R('ほか'), true, '  関空 → ほか');
  eq(R('しらないタブ') >= R('ほか'), true, '知らないタブは、いちばん後ろ');

  // 実際に並べてみる
  const rows = [
    { tab: 'ﾐﾅﾐ', name: '道頓堀', avgSales: 20000 },
    { tab: '北7', name: '新地7A',  avgSales: 8000 },
    { tab: '北7', name: '新地7B',  avgSales: 15000 },
    { tab: 'ほか', name: 'どこか', avgSales: 30000 }
  ];
  rows.sort(function (a, b) {
    const r = ctx.tabRank_(a.tab) - ctx.tabRank_(b.tab);
    if (r !== 0) return r;
    return b.avgSales - a.avgSales;
  });
  eq(rows.map(x => x.name), ['新地7B', '新地7A', '道頓堀', 'どこか'],
     '★タブの順が最優先。同じタブの中では金額の高い順');

  /*
   * ★アツい時間は「〇曜 00:00」の形（まーくさんのご指示）。
   *   「23時台」だと1時間の幅があって、いつ行けばよいのか決められない
   */
  const H = ctx.dbHotTimeText_;
  const t3 = H('月', 23, 3, 12000, ['23:10', '23:44']);
  eq(t3.split('\n')[0], '月曜 23:00', '★「月曜 23:00」の形で書く');
  eq(t3.indexOf('時台'), -1, '★「〇〇時台」とは、もう書かない');
  eq(t3.indexOf('1件あたり') !== -1, true, '★2件以上なら「1件あたり」と必ず書く');
  eq(t3.indexOf('3件') !== -1, true, '  件数も書く');
  eq(t3.indexOf('￥12,000') !== -1, true, '  金額も書く');
  eq(t3.indexOf('[23:10, 23:44]') !== -1, true, '  実際の時刻も添える');

  const t1 = H('日', 1, 1, 9000, ['01:20']);
  eq(t1.split('\n')[0], '日曜 01:00', '  1時台は「01:00」と ゼロを付ける');
  eq(t1.indexOf('1件あたり'), -1, '★1件しかないときは「1件あたり」と書かない');
  eq(t1.indexOf('平均'), -1, '★1件を「平均」とも呼ばない');
  eq(t1.indexOf('1件　￥9,000') !== -1, true, '  「1件 ￥9,000」とだけ書く');

  eq(H('月曜', 0, 2, 5000, []).split('\n')[0], '月曜 00:00', '「月曜」と渡しても「月曜曜」にならない');
  eq(typeof H(null, null, 0, 0, null), 'string', 'null でも落ちない');

  /*
   * ★曜日の注釈。「月曜 00:05」を「月曜の朝」と読まれないように、
   *   表のすぐ上に、目立つ形で置く
   */
  const note = ctx.LR_DOW_NOTE || vm.runInContext('LR_DOW_NOTE', ctx);
  eq(note.indexOf('出勤した曜日') !== -1, true, '★何を基準にした曜日かを書く');
  eq(note.indexOf('火曜 00:05') !== -1 && note.indexOf('月曜 00:05') !== -1, true,
     '★具体例も書く（言葉だけでは伝わらない）');
}

console.log('\n■ 再現したい・チケット・避けたい の3つの表');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);

  /*
   * ★タブのらんは、ユーザー名ではなくエリア名にする（まーくさんのご指示）。
   *   誰が乗せたかは、ここで見たい事ではない。見たいのは どのエリアの話か。
   *   エリア名にしておけば、背景の色分けも個別乗り場の表と同じになる
   */
  vm.runInContext('var NORTH_WORDS = ["堂山","茶屋町"]; var SOUTH_WORDS = ["千日前","アメ村"];', ctx);
  const A = ctx.lrAreaOf_;
  eq(A('新地7', ''), '北7', '★「新地7」は 北7');
  eq(A('新地4', ''), '北4', '★「新地4」は 北4');
  eq(A('堂山', ''), '北他', '  北の言葉は 北他');
  eq(A('千日前', ''), 'ﾐﾅﾐ', '  南の言葉は ﾐﾅﾐ');
  eq(A('ドンキ', ''), 'ﾐﾅﾐ', '  「ドン」も ﾐﾅﾐ');
  eq(A('第1ターミナル', '関空'), '関空', '  備考に「関空」でも 関空');
  eq(A('KIX', ''), '関空', '  「KIX」でも 関空');
  eq(A('どこか', ''), 'ほか', '  どれでもなければ ほか');
  eq(A('', ''), 'ほか', '空でも落ちない');
  eq(A(null, null), 'ほか', 'null でも落ちない');
  // ★エリア名は、色の表にある名前と同じであること（同じでないと色が付かない）
  const TC = JSON.parse(vm.runInContext('JSON.stringify(TAB_COLORS)', ctx));
  ['北7','北4','北他','ﾐﾅﾐ','関空','ほか'].forEach(function (nm) {
    ok(!!TC[nm], '★「' + nm + '」に色が決めてある（背景の色分けが個別乗り場とそろう）');
  });
  // 名前の表（ユーザー名）とは、ひとつも重なっていないこと
  const PT = ['ﾀﾞｲｽｹ','ｼｭﾝ','ｶｲﾄ','ｱﾅﾙ','ﾏｰｸ','ｼﾞﾝ'];
  ok(PT.every(function (u) { return !TC[u]; }),
     '★ユーザー名は、タブのらんに出てこない（色の表にも無い）');
}

console.log('\n■ 乗り場名を押すと、Googleマップへ飛ぶ');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);
  const U = ctx.mapSearchUrl_;

  /*
   * ★登録が無くても、押せばGoogleマップへ行けるようにした（ご指示）。
   *   ただし「その場所のピン」にはしない。「その名前でさがした結果」にする。
   *   こちらで勝手にピンを決めると、まちがった場所へ案内しかねない
   */
  // ★いまはリンクを止めています（ご指示）。ここは仕掛けの確かめなので、この中だけ「使う」
  const keepOn = ctx.lrMapLinkOn_;
  ctx.lrMapLinkOn_ = function () { return true; };
  const u = U('新地4');
  eq(u.indexOf('https://www.google.com/maps/search/') === 0, true,
     '★Googleマップの「さがす」ページへ飛ばす');
  eq(u.indexOf(encodeURIComponent('新地4 大阪')) !== -1, true,
     '★さがす言葉に「大阪」を足す（同じ名前が全国にあるため）');
  eq(u.indexOf('@') === -1, true, '★こちらで勝手に、地図の点（緯度経度）を決めない');
  eq(U(''), '', '名前が無ければ、飛び先も作らない');
  eq(U('   '), '', '空白だけでも、作らない');
  eq(U(null), '', 'null でも落ちない');
  // 記号が入っていても、こわれないこと
  eq(U('ドン・キホーテ 前').indexOf(' ') === -1, true, '★空白や記号は、ちゃんと変換する');
  ctx.lrMapLinkOn_ = keepOn;
  eq(U('新地4'), '', '★ふだんは、リンクを作らない（ご指示で止めてあります）');

  /*
   * ★ヒートマップの見出しから、地図の説明を外した。
   *   見出しで言うべきは「何の表か」と「どういう条件の表か」だけ
   */
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '003-LineReport.gs'), 'utf8');
  eq(src.indexOf('曜日×時間帯別ヒートマップ') !== -1, true, '  ヒートマップの見出しはある');
  /*
   * ★条件は、見出しの中ではなく、その下の注釈として出すようにした。
   *   見出しは「何の表か」だけ。条件は、ひとまわり小さい細字で下に
   */
  eq(src.indexOf('`⭕️ 【${spotName}】曜日×時間帯別ヒートマップ`') !== -1, true,
     '★見出しは「何の表か」だけ');
  eq(src.indexOf('20〜29時台で、月に3件以上の記録がある乗り場だけを出しています。') !== -1, true,
     '★条件は、その下の注釈として出す');
  eq(src.indexOf('地図のタブに登録した乗り場は、名前を押すとマップが開きます'), -1,
     '★ヒートマップの見出しに、地図の説明は書かない');
}

console.log('\n■ 長い文は、右側を空けずに詰めて、句読点で改行する');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);

  /*
   * ★まーくさんのご指摘。
   *   「そのぶ／ん単価で取り返せているか」のように、言葉のまん中で切れていた。
   *   かといって、右側が空いているのに次の行へ落とすのも困る（行数が増えるだけ）。
   *   入るかぎり同じ行に詰めて、入らなくなったところで句読点で切る
   */
  const lim = ctx.lrFitChars_(vm.runInContext('DB_COLS', ctx), 11);
  ok(lim > 40, '★らんの数から、1行に入る量を逆算している（' + lim + '）');

  const parts = [
    { t: '待ちの長さ：この期間の全体平均は ' },
    { t: '20分', b: true },
    { t: '。この乗り場は ' },
    { t: '30分', b: true },
    { t: 'で、平均より10分 長く待っています。そのぶん単価で取り返せているかを見てください。' }
  ];
  const w = ctx.lrWrapParts_(parts, lim);
  const joined = w.map(p => p.t).join('');
  eq(joined.replace(/\n/g, ''), parts.map(p => p.t).join(''),
     '★言葉は1文字も足さない・減らさない');
  const lines = joined.split('\n');
  eq(lines.length >= 2, true, '★長い文は、こちらで改行する（' + lines.length + '行）');
  eq(lines.slice(0, -1).every(x => /[。、！？]$/.test(x)), true,
     '★切れ目は、かならず句読点のうしろ（言葉のまん中で切らない）');
  // 右側をむだに空けない＝1行ぶんに、入るだけ詰まっている
  const wj = t => { let n = 0; for (let i = 0; i < t.length; i++) n += t.charCodeAt(i) < 0x100 ? 1 : 2; return n; };
  eq(lines.slice(0, -1).every(x => wj(x) > lim * 0.5), true,
     '★行の半分より短いところで、むだに折り返さない');

  // 太字や色は、そのまま残る（どこが大事かが消えないように）
  eq(w.filter(p => p.b).map(p => p.t.replace(/\n/g, '')), ['20分', '30分'],
     '★太字は、そのまま残る');

  // 短い文は、そのまま（むだに触らない）
  const short = [{ t: 'みじかい文。' }];
  eq(ctx.lrWrapParts_(short, lim), short, '短い文は、そのまま返す');
  eq(ctx.lrWrapParts_([], lim).length, 0, '空でも落ちない');
  eq(ctx.lrWrapParts_(null, lim), null, 'null でも落ちない');

  // ★作っただけで、使っていなければ意味がない。使っているところも見る
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '003-LineReport.gs'), 'utf8');
  eq(src.indexOf('lrWrapParts_(parts0, lrFitChars_(DB_COLS, size))') !== -1, true,
     '★月間戦略アドバイスを書くところで、ちゃんと使っている');
}

console.log('\n■ 注釈は、とちゅうに線を入れない');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);
  /*
   * ★1行ずつ別のマスに分けていたので、注釈のとちゅうに線が何本も入り、
   *   4つの別々のものが並んでいるように見えていた（まーくさんのご指摘）。
   *   1つのまとまった話なので、1つのマスにまとめて入れる
   */
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '003-LineReport.gs'), 'utf8');
  eq(src.indexOf('const dsc = LR_DISCLAIMER.slice(1).join("\\n");') !== -1, true,
     '★2行目から下は、まとめて1つのマスに入れる');
  eq(src.indexOf('LR_DISCLAIMER.forEach(function (t, i) {'), -1,
     '★1行ずつ別のマスに書く作りは、もう無い');

  const D = JSON.parse(vm.runInContext('JSON.stringify(LR_DISCLAIMER)', ctx));
  eq(D.length >= 4, true, '注釈の中身は、これまでどおり全部ある（' + D.length + '行）');
  eq(D[0].indexOf('AI') !== -1, true, '★AIが入っていることは、いちばん上に必ず書く');
  eq(D.slice(1).join('\n').indexOf('実績を数えたもの') !== -1, true,
     '  どこまでが記録かも、これまでどおり書く');
}

console.log('\n■ 見出しと説明書きを、はっきり分ける');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '003-LineReport.gs'), 'utf8');

  /*
   * ★前は、説明まで見出しの中に入れて、同じ太さ・同じ大きさで書いていた。
   *   「何の表か」と「どういう条件の表か」が同じ重さに見え、
   *   どこを読めばよいのか分からなかった（まーくさんのご指示）
   */
  eq(src.indexOf('function dbNote_(row, text, bg)') !== -1, true,
     '★説明書きは、見出しとは別に書く仕掛けがある');
  eq(src.indexOf('function dbTitleNote_(row, title, note, bg, size)') !== -1, true,
     '  見出し＋説明書きを、まとめて置ける');
  eq(src.indexOf('const DB_NOTE_SIZE = 9;') !== -1, true,
     '★説明書きは、見出し（12）より小さい字（9）');
  eq(src.indexOf('.setFontSize(DB_NOTE_SIZE).setFontWeight("normal").setFontColor("#6b6b6b")') !== -1, true,
     '★説明書きは、太字にしない・グレーにする');
  eq(src.indexOf('lrWrapJa_(t, lrFitChars_(DB_COLS, DB_NOTE_SIZE))') !== -1, true,
     '★説明書きも、句読点のところで改行する（変なところで切らない）');

  // 見出しの中に、条件を書き込んだままのところが残っていないこと
  ['(条件: ヒートマップ基準にとどかない',
   '(条件: 再現性を含む',
   '(条件: 備考にチケを含み',
   '(条件: NGワードを含む',
   '(アツい=平均売上が最高'].forEach(function (x) {
    eq(src.indexOf(x), -1, '★見出しの中に条件を書いたままのところが無い（' + x.slice(0, 12) + '…）');
  });

  // それぞれの説明書きが、ちゃんと用意されていること
  ['ヒートマップに出ない乗り場（月に1〜2件）を、ここにまとめています。',
   '備考に「再現性」と書いたもの、または 備考があって￥5,000以上だったものです。',
   '備考に「チケ」と書いたもので、￥5,000以上だったものです。',
   '備考に避けたい言葉があったもの、または ￥999以下だったものです。',
   '1回の乗車を分けて書いたものです。二重に数えてしまうので、平均には入れていません。',
   'アツい＝その時間帯で平均売上がいちばん高かった乗り場。'].forEach(function (x) {
    eq(src.indexOf(x) !== -1, true, '  説明書きがある（' + x.slice(0, 14) + '…）');
  });

  // アドバイスの中の説明書きも、小さい細字にする
  eq(src.indexOf('const isNote = (parts0 || []).length === 1 && parts0[0] && parts0[0].n;') !== -1, true,
     '★アドバイスの中の説明書きも、見分けて小さくする');
  eq(src.indexOf('const size = isNote ? DB_NOTE_SIZE : 11;') !== -1, true,
     '  説明書きは9、中身は11');

  /*
   * ★表と表のあいだのあき行は、結合しない（まーくさんのご指摘）。
   *   中身が何も無いのにまとめる意味がなく、
   *   そのあたりを選んだだけで26らんぜんぶが選ばれてしまう
   */
  const cut = (from, n) => src.slice(src.indexOf(from), src.indexOf(from) + n);
  const inTable = cut('function dbGap_(sheet, row)', 300);
  const between = cut('function dbGapSection_(sheet, row)', 400);

  eq(inTable.indexOf('.merge()') !== -1, true,
     '★表の中のあき行は、これまでどおり結合する（つながって見えるほうが自然）');
  eq(between.indexOf('.merge()'), -1,
     '★表と表のあいだのあき行は、結合しない（分かれ目が分かるように）');
  eq(between.indexOf('breakApart()') !== -1, true,
     '★前に結合していたぶんは、ほどく（作り直しても結合だけは残るため）');
  eq(between.indexOf('setRowHeight(row, 30)') !== -1, true, '  高さは、これまでどおり');

  // どちらがどこで使われているか
  const used = src.split('\n').filter(x => x.indexOf('dbGapSection_(sheet') !== -1 && x.indexOf('function') === -1);
  eq(used.length >= 5, true, '★表の区切りでは、結合しないほうを使う（' + used.length + 'か所）');
  /*
   * ★かたまりとかたまりのあいだは、ぜんぶ「結合しないほう」にそろえました（ご指摘）。
   *   結合したままだと、表と表の境目が見えなくなっていました。
   *   結合してよいのは、同じ乗り場が続くときのように「表の中」だけです
   */
  const inner = src.split('\n').filter(x => /dbGap_\(sheet/.test(x) && x.indexOf('function') === -1);
  eq(inner.length >= 1, true, '  表の中では、結合するほうを使う（' + inner.length + 'か所）');
}

console.log('\n■ 下のほうの、いらない空っぽの行を片づける');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '003-LineReport.gs'), 'utf8');

  /*
   * ★グラフのもとの表を、ずっと下（5000行目のあたり）に置いているので、
   *   本文が終わったあとも空っぽの行がどこまでも続いていた（まーくさんのご指示）
   */
  eq(src.indexOf('let dataFrom = 0, dataTo = 0;') !== -1, true,
     '★もとの表を、どこからどこまで使ったか覚えている');
  eq(src.indexOf('if (!dataFrom) dataFrom = hiddenDataRow;') !== -1, true,
     '  はじめて使ったところを覚える');
  eq(src.indexOf('if (hiddenDataRow > dataTo) dataTo = hiddenDataRow;') !== -1, true,
     '  最後に使ったところも覚える');

  eq(src.indexOf('sheet.hideRows(lastText + 1, dataTo - lastText);') !== -1, true,
     '★本文の下から、もとの表の終わりまでを「隠す」（消すとグラフが描けなくなる）');
  eq(src.indexOf('if (maxR2 > keepTo + 1) sheet.deleteRows(keepTo + 1, maxR2 - keepTo - 1);') !== -1, true,
     '★その先の行は、まるごと消す');
  /*
   * ★止まりどころは「最後の表の見出しが、画面の2行目に来るところ」（ご指示）。
   *   見出しが画面のまん中や下で止まると、目が迷う
   */
  eq(src.indexOf('const DB_VIEW_ROWS = 45;') !== -1, true,
     '★画面に入る行数の目安を、1か所で決めている');
  eq(src.indexOf('lastTitleRow ? (lastTitleRow + DB_VIEW_ROWS - 2) : (curRow + 3)') !== -1, true,
     '★最後の見出しが、画面の2行目に来るところまで残す');
  eq(src.indexOf('const lastTitleRow = curRow;') !== -1, true,
     '  最後の表の見出しが何行目かを覚えている');
  eq(src.indexOf('sheet.setRowHeights(curRow, lastText - curRow + 1, DB_ROW_H)') !== -1, true,
     '★本文の下の行は、ふつうの高さに戻す（前の高い行が残ると見積もりが外れる）');
  eq(src.indexOf('const DB_ROW_H = 21;') !== -1, true, '  ふつうの高さは21');

  // 作り直すたびに、前に隠した行が残らないこと
  eq(src.indexOf('try { sheet.showRows(1, sheet.getMaxRows()); } catch (e) {}') !== -1, true,
     '★作り直しのはじめに、前に隠した行を出し直す（clear() では戻らないため）');

  // 消す量の計算（実際の数字で確かめる）
  const calc = function (curRow, dataFrom, dataTo, maxRows, lastTitleRow) {
    const VIEW = 45;
    const lastText = Math.max(curRow + 3,
      lastTitleRow ? (lastTitleRow + VIEW - 2) : (curRow + 3));
    const hide = (dataFrom && dataTo > lastText + 1) ? [lastText + 1, dataTo - lastText] : null;
    const keepTo = Math.max(lastText, dataTo);
    const del = (maxRows > keepTo + 1) ? [keepTo + 1, maxRows - keepTo - 1] : null;
    return { hide: hide, del: del, keepTo: keepTo };
  };
  // 最後の見出しが624行目なら、667行目まで残す（624 + 45 - 2）
  const c1 = calc(634, 5000, 5120, 6000, 624);
  eq(c1.hide, [668, 4453], '★本文(667)の下から、もとの表の終わり(5120)までを隠す');
  eq(c1.del, [5121, 879], '★5120より下は、まるごと消す');
  eq(c1.keepTo, 5120, '  残すのは5120行目まで');
  eq(624 + 45 - 2, 667, '★最後の見出し(624)が、画面の2行目に来る位置で止まる');

  // グラフが1つも無かったとき（もとの表を使っていないとき）
  const c2 = calc(200, 0, 0, 900, 0);
  eq(c2.hide, null, 'グラフが無ければ、隠す行も無い');
  eq(c2.del, [204, 696], '★そのときは、本文のすぐ下から先を消す');

  // すでに短いときは、何もしない
  const c3 = calc(200, 0, 0, 204, 0);
  eq(c3.del, null, 'もう短ければ、消さない');
}

console.log('\n■ 🛸 いちばん下のおまけ（星人）');
{
  const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg, got);
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', '003-LineReport.gs'), 'utf8');

  /*
   * ★下の空きは「スクロールの止まりどころ」をそろえるために要るが、
   *   ただの白い空白ではもったいない（まーくさんのご指示）
   */
  eq(src.indexOf('function dbFunBlock_(sheet, row)') !== -1, true, '★おまけの箱がある');
  eq(src.indexOf('curRow = dbFunBlock_(sheet, curRow);') !== -1, true,
     '★いちばん下の表のあとに、ちゃんと置いている');
  eq(src.indexOf('🛸 今回のおふざけ（おまけ）') !== -1, true, '  おまけだと分かる見出し');

  // 星人が何なのかの説明（はじめて見た人にも分かるように）
  eq(src.indexOf('星人＝その回かぎりのお遊びです。数字とは何の関係もありません。') !== -1, true,
     '★星人が何なのかを、ひとこと書いてある');
  eq(src.indexOf('まーくが GANTZ を好きなだけです。') !== -1, true,
     '★なぜ星人なのかも書いてある（まーくが GANTZ を好きなだけ）');
  eq(src.indexOf('毎回ちがう星人が1体あらわれて、絵も毎回ちがいます。') !== -1, true,
     '  毎回ちがうことも書いてある');
  eq(src.indexOf('グループLINE（僕はグールだ）に「カタストロフィ」または「💩」と送ると遊べます。') !== -1, true,
     '★グループLINE（僕はグールだ）で遊べることを書いてある');
  /*
   * ★この文は、グループのみんなが読む（まーくさんのご指示）。
   *   こちら側の話（コードの取り込みなど）は、読む人には関係がない
   */
  const noteTxt = src.slice(src.indexOf('星人＝その回かぎりのお遊びです。'),
                            src.indexOf('lrFitChars_(DB_COLS, 9));'));
  // ★合図の言葉（カタストロフィ・💩）は、みんなが使うものなので書いてよい。
  //   書かないのは「こちら側の話」だけ
  ['コードの取り込み', 'コード', 'GitHub', 'スクリプト', '取り込み'].forEach(function (x) {
    eq(noteTxt.indexOf(x), -1, '★みんなに関係のない話を書かない（' + x + '）');
  });

  // 決まり文句（LINEで出るものと同じ）
  ['てめえ達は今から', 'この方を　乗車して下ちい',
   'いまの　スプシを', 'わたしの　かってです。', 'という　りくつなわけだす。'].forEach(function (x) {
    eq(src.indexOf(x) !== -1, true, '★決まり文句がある（' + x + '）');
  });

  /*
   * ★ここは「書いてあるか」を見るだけでは足りない。
   *   はじめ、まとめスプシの中にある dbTitle_ / dbNote_ を呼んでいた。
   *   あれは updateDetailedDashboard の「中で」作られている関数なので、
   *   外にあるこの関数からは見えず、呼んでも必ず失敗していた。
   *   受け止めているだけなので、おまけは1回も出なかった。
   *   実際に動かして、ちゃんと書き込まれることを見る
   */
  {
    const wrote = [];      // 書き込まれた文
    const styles = [];     // どこを太字・何ポイントにしたか
    const heights = {};
    const cell = () => {
      const C = {
        merge: () => C, setValue: v => { wrote.push(String(v)); return C; },
        setFontSize: () => C, setFontWeight: () => C, setFontColor: () => C,
        setBackground: () => C, setHorizontalAlignment: () => C,
        setVerticalAlignment: () => C, setWrap: () => C, setBorder: () => C,
        setNumberFormat: () => C,
        // ★星人の本文は、こちらで書き込まれます（太字や大きさを変えるため）
        setRichTextValue: v => { wrote.push(String((v && v._text) || '')); styles.push(v); return C; }
      };
      return C;
    };
    let img = null;
    const fake = {
      getRange: () => cell(),
      setRowHeight: (r, h) => { heights[r] = h; },
      getMaxRows: () => 1000,
      insertRowsAfter: () => {},
      insertImage: (url, c, r) => { img = { url: url, col: c, row: r, w: 0, h: 0 };
        const I = { setWidth: w => { img.w = w; return I; },
                    setHeight: h => { img.h = h; return I; } };
        return I; }
    };
    const back = ctx.updAlienFallback_;
    vm.runInContext('function updAlienFallback_(){ return { name: "ねぎ星人", toku: ["でかい"], suki: ["ねぎ"], kirai: ["メーター"], kuse: "みぎみぎ！" }; }', ctx);
    vm.runInContext('function updAlienPicFree_(){ return { url: "https://x/y.png", direct: "https://x/y.png" }; }', ctx);
    vm.runInContext('function updAlien_(){ throw new Error("AIは使えない"); }', ctx);

    const out = ctx.dbFunBlock_(fake, 100);
    const all = wrote.join('\n');
    ok(out > 100, '★おまけの箱は、ちゃんと行をつかう（' + (out - 100) + '行）', out);
    ok(all.indexOf('🛸 今回のおふざけ（おまけ）') !== -1, '★見出しが、ちゃんと書き込まれる', all.slice(0, 40));
    ok(all.indexOf('星人＝その回かぎりのお遊びです。') !== -1, '★星人の説明も、書き込まれる');
    ok(all.indexOf('まーくが GANTZ を好きなだけです。') !== -1, '★GANTZ のくだりも、ちゃんと出る');
    ok(all.indexOf('コードの取り込み') === -1, '★こちら側の話（コードの取り込み）は書かない');
    ok(all.indexOf('【ねぎ星人】') !== -1, '★星人の名前が出る');
    ok(all.indexOf('▼特徴') !== -1 && all.indexOf('でかい') !== -1, '  特徴も出る');
    ok(all.indexOf('みぎみぎ！') !== -1, '  口ぐせも出る');
    ok(all.indexOf('という　りくつなわけだす。') !== -1, '★決まり文句も出る');
    ok(all.indexOf('てめえ達は今から') !== -1, '  はじめの決まり文句も');
    ok(img && img.url === 'https://x/y.png', '★絵も貼る', img);
    /*
     * ★絵は N列（14番目）から、Z列いっぱいまで大きく置きます（ご指示）。
     *   小さいと、何が描いてあるのか分かりませんでした
     */
    ok(img && img.col === 14, '★絵は N列から置く（文とかさならない）', img && img.col);
    ok(img && img.w >= 300, '★絵は Z列ぎりぎりまで大きくする（' + (img && img.w) + 'px）', img && img.w);
    ok(img && img.h === img.w, '  たて・よこは同じ大きさ');
    ok(heights[100 + 2] >= img.w, '★絵が下の表にかぶらないよう、行も高くする', heights[100 + 2]);

    // りょうきんは、必ず出る・太字・大きい
    ok(all.indexOf('〖りょうきん') !== -1, '★りょうきんが、ちゃんと出る');
    const feeStyled = styles.some(function (v) {
      if (!v || !v._text) return false;
      const at = String(v._text).indexOf('〖りょうきん');
      if (at < 0) return false;
      return (v._styles || []).some(function (x) {
        return x.a <= at && x.b > at && x.st && x.st.bold === true && x.st.size >= 12;
      });
    });
    ok(feeStyled, '★りょうきんは 太字で、大きい字にする（おまけでも読みやすく）');
    const nameStyled = styles.some(function (v) {
      if (!v || !v._text) return false;
      const at = String(v._text).indexOf('【ねぎ星人】');
      if (at < 0) return false;
      return (v._styles || []).some(function (x) {
        return x.a <= at && x.b > at && x.st && x.st.bold === true;
      });
    });
    ok(nameStyled, '  星人の名前も太字');

    // AIも組み合わせ表もだめなときは、何も置かずに帰る（レポートは止めない）
    wrote.length = 0;
    vm.runInContext('function updAlienFallback_(){ return null; }', ctx);
    const out2 = ctx.dbFunBlock_(fake, 100);
    ok(out2 === 100, '★星人が作れなければ、1行も使わずに帰る', out2);
    ok(wrote.length === 0, '  何も書かない');
    ctx.updAlienFallback_ = back;
  }

  // 絵も添える。ただし絵が出せなくても、レポートは止めない
  eq(src.indexOf('sheet.insertImage(pic.direct, PIC_COL, row, 6, 6)') !== -1, true,
     '★絵も添える');
  const fn = src.slice(src.indexOf('function dbFunBlock_(sheet, row)'),
                       src.indexOf('function dbMainTitle_'));
  eq((fn.match(/catch/g) || []).length >= 4, true,
     '★おまけで失敗しても、レポートは止めない（' + (fn.match(/catch/g) || []).length + 'か所で受け止める）');
  eq(fn.indexOf('if (!a || !a.name || !Array.isArray(a.toku)) return row;') !== -1, true,
     '  星人が作れなければ、何も置かずに帰る');
}

console.log('\n■ まとめスプシを、もっとコンパクトに（ご指示）');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8');

  // ① 1行目のタイトルは、かならず1行
  const T = ctx.dbMainTitle_('2026/08/16〜2026/09/15', 135);
  ok(T.indexOf('\n') === -1, '★タイトルは1行（固定したときに、見えるところを減らさない）');
  ok(T.indexOf('2026') === -1, '★年は入れない（そのぶん短くなる）');
  ok(T.indexOf('8/16〜9/15') !== -1, '  期間は残す', T);
  ok(T.indexOf('全135件') !== -1, '  件数も残す');

  // ② 短いものは、横に詰めてから改行する
  const P = ctx.lrPackItems_;
  const items = ['北7 12件', '北4 8件', '北他 3件', 'ﾐﾅﾐ 20件', '関空 2件', 'ほか 5件'];
  ok(P(items, '・', 60).indexOf('\n') === -1, '★幅があるときは、1行にまとめる');
  ok(P(items, '・', 12).split('\n').length > 1, '  入らないときだけ、改行する');
  ok(P(items, '・', 60) === items.join('・'), '★言葉は1つも落とさない');
  ok(P([], '・', 20) === '', '  空でも落ちない');
  ok(P(null, '・', 20) === '', '  null でも落ちない');

  // ③ 一晩の流し方のマス目は、どの行も同じ高さ
  ok(/const DB_NIGHT_ROW_H = \d+;/.test(src), '★一晩の流し方の行の高さを、1か所で決めている');
  ok(src.indexOf('isHead ? 44 : 26') === -1,
     '★中身のある行だけ高くするのは、もうやめた（空いている時間帯と段差ができていた）');
  ok(src.indexOf('sheet.setRowHeight(curRow, DB_NIGHT_ROW_H)') !== -1,
     '  どの時間帯も、同じ高さで書いている');

  // ④ ヒートマップも、行の高さをそろえる
  ok(src.indexOf('hmHeights.push(') !== -1, '★ヒートマップは、先に必要な高さを集める');
  ok(/sheet\.setRowHeights\(hmFrom, curRow - hmFrom, hmH\)/.test(src),
     '★そのうえで、いちばん高い行に合わせて ぜんぶ同じ高さにする');
  ok(typeof ctx.dbFitH_ === 'function', '  高さだけを返す道具がある（そろえるために要る）');
  ok(ctx.dbFitH_([{ text: 'あ', span: 4, size: 11 }], 34) === 34, '  短ければ、決めた下限のまま');
  ok(ctx.dbFitH_([{ text: 'あ\nい\nう\nえ', span: 4, size: 11 }], 34) > 34, '  中身が多ければ、高くなる');

  // ⑤ グラフが空っぽになっていたのを直した
  ok(src.indexOf('ChartHiddenDimensionStrategy.SHOW_BOTH') !== -1,
     '★隠した行も、グラフが読むようにする（「データの可視化をするには…」になっていた）');

  // ⑥ 注釈の書き方
  const N = vm.runInContext('LR_DOW_NOTE', ctx);
  ok(N.indexOf('\n例）') !== -1, '★「例）」の前で改行する（どこからが例か、ひと目で分かるように）');
  ok(N.indexOf('【曜日について】') === -1,
     '★見出しに【】は使わない（本文の【火曜 00:05】と見分けがつかなかった）');
  ok(N.indexOf('◆') === 0, '  見出しは、べつの記号で立てる');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
