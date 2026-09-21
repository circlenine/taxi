/**
 * イベント参考資料（009-Shiryo.gs）を確かめる。
 *   実行: node gas/test/shiryo.test.js
 *
 * ★ここで いちばん見たいのは「作り話でグラフを作っていないか」です。
 *
 *   AIに聞いた客層の見当を円グラフにすると、根拠のない数字が
 *   「20代女性 45%」のような、いかにも正確そうな姿で独り歩きします。
 *   上の人に見せる資料で、それは絶対に通りません。
 *
 *   数えたもの（自社の記録）だけをグラフにします。
 *   母数が少なすぎるときは、グラフそのものを作りません。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);

let props = {};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; },
  getProperties: () => Object.assign({}, props) }) };

/* ---- 偽のスプシ ---- */
function mkSheet(name) {
  const sh = {
    _name: name, _vals: [], _charts: [], _widths: {}, _cleared: 0,
    getName: () => sh._name,
    clear: () => { sh._vals = []; sh._cleared++; return sh; },
    getCharts: () => sh._charts.slice(),
    removeChart: c => { const i = sh._charts.indexOf(c); if (i >= 0) sh._charts.splice(i, 1); },
    insertChart: c => { sh._charts.push(c); },
    setColumnWidth: (c, w) => { sh._widths[c] = w; return sh; },
    getLastRow: () => sh._vals.length,
    setFrozenRows: () => sh,
    newChart: () => {
      const spec = { ranges: [], opts: {}, kind: '' };
      const b = {
        addRange: r => { spec.ranges.push(r); return b; },
        setPosition: () => b,
        setOption: (k, v) => { spec.opts[k] = v; return b; },
        setChartType: t => { spec.kind = t; return b; },
        build: () => spec
      };
      return b;
    },
    getRange: (r, c, nr, nc) => mkRange(sh, r, c, nr || 1, nc || 1)
  };
  return sh;
}
function mkRange(sh, r, c, nr, nc) {
  const rg = {
    _r: r, _c: c, _nr: nr, _nc: nc,
    getValues: () => {
      const out = [];
      for (let i = 0; i < nr; i++) {
        const row = sh._vals[r - 1 + i] || [];
        out.push(row.slice(c - 1, c - 1 + nc));
      }
      return out;
    },
    getDisplayValues: () => rg.getValues().map(row => row.map(v => String(v == null ? '' : v))),
    setValues: v => {
      v.forEach((row, i) => {
        const y = r - 1 + i;
        if (!sh._vals[y]) sh._vals[y] = [];
        row.forEach((val, j) => { sh._vals[y][c - 1 + j] = val; });
      });
      return rg;
    },
    setValue: v => {
      if (!sh._vals[r - 1]) sh._vals[r - 1] = [];
      sh._vals[r - 1][c - 1] = v;
      return rg;
    },
    setWrap: () => rg, setVerticalAlignment: () => rg, setHorizontalAlignment: () => rg,
    setFontSize: () => rg, setFontColor: () => rg, setFontWeight: () => rg,
    setBackground: () => rg, merge: () => rg, breakApart: () => rg
  };
  return rg;
}
const books = {};
function mkBook(id, name) {
  const sheets = [mkSheet('シート1')];
  const ss = {
    getId: () => id, _name: name,
    getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
    getSheets: () => sheets.slice(),
    getSheetByName: n => sheets.filter(s => s._name === n)[0] || null,
    insertSheet: n => { const s = mkSheet(n); sheets.push(s); return s; },
    _add: s => { sheets.push(s); return s; },
    deleteSheet: s => { const i = sheets.indexOf(s); if (i >= 0) sheets.splice(i, 1); },
    setActiveSheet: s => s
  };
  books[id] = ss;
  return ss;
}
let made = 0, active = null;
ctx.SpreadsheetApp = {
  create: n => mkBook('SSID' + (++made), n),
  openById: id => { if (!books[id]) throw new Error('開けません'); return books[id]; },
  getActiveSpreadsheet: () => active
};
ctx.Charts = { ChartType: { PIE: 'PIE', COLUMN: 'COLUMN' } };

let replied = [];
ctx.lineReply_ = (tok, text) => { replied.push(String(text)); };

/* ---- 外の置き場（MusicBrainz・Wikidata）のまね ---- */
let fetched = [], webReply = {};
ctx.UrlFetchApp = { fetch: (url, opt) => {
  fetched.push({ url: String(url), opt: opt });
  let r = null;
  Object.keys(webReply).forEach(k => { if (String(url).indexOf(k) !== -1 && !r) r = webReply[k]; });
  if (!r) r = { code: 404, body: '' };
  if (r.throw) throw new Error(r.throw);
  return { getResponseCode: () => r.code, getContentText: () => r.body };
} };
ctx.updMe_ = () => 'Umark';
ctx.logErr_ = () => {};
// 記録用スプシの「時刻」から、時を取り出す（006-Venue の同名と同じ働き）
vm.runInContext('function vnHourOf_(t){ const m = String(t).match(/(\\d{1,2}):(\\d{2})/); ' +
                'return m ? Number(m[1]) : null; }', ctx);
vm.runInContext('var PERSONAL_TABS = ["ﾏｰｸ"];', ctx);
vm.runInContext('var VN_VENUES = { "大阪城ホール": { near: ["大阪城公園", "京橋"] } };', ctx);

/*
 * ★記録用スプシの開き方は、001-Code の mainSS_ にまとめてあります。
 *   ここは 001 を読み込まないので、同じ働きのものを置きます。
 *   本物と同じで「くっついていれば そのまま、離れていれば IDで開く」。
 */
vm.runInContext('function mainSS_(){' +
  ' try { var a = SpreadsheetApp.getActiveSpreadsheet(); if (a) return a; } catch (e) {}' +
  ' try { var id = PropertiesService.getScriptProperties().getProperty("MAIN_SS_ID");' +
  '       if (id) return SpreadsheetApp.openById(id); } catch (e) {}' +
  ' return null; }', ctx);

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '009-Shiryo.gs'), 'utf8'), ctx);
const F = n => vm.runInContext(n, ctx);

let ng = 0;
function t(cond, label, extra) {
  if (cond) { console.log('  ok   ' + label); return; }
  ng++; console.log('  NG   ' + label + (extra ? '  … ' + extra : ''));
}
function has(hay, needle, label) {
  t(String(hay).indexOf(needle) !== -1, label, String(hay).slice(0, 120));
}

/** 記録用スプシをまねて作る。rows は [時刻, 料金, 乗り場, 備考, 待ち] */
function setRecords(rows) {
  props = {}; Object.keys(books).forEach(k => delete books[k]);
  active = mkBook('REC', '記録用スプシ');
  const sh = mkSheet('ﾏｰｸ');
  // 1〜3行目は見出し。4行目から記録
  sh._vals = [[], [], []];
  rows.forEach(r => {
    const line = [];
    line[3] = r[4] == null ? '' : r[4];   // 待ち
    line[4] = r[0];                        // 時刻
    line[5] = r[1];                        // 料金
    line[6] = r[2];                        // 乗り場
    line[7] = r[3] == null ? '' : r[3];   // 備考
    line[8] = '';
    line[10] = '';
    sh._vals.push(line);
  });
  active._add(sh);
  return sh;
}

console.log('\n■ 自社の記録を、正しく数える');
{
  setRecords([
    ['21:10', 3200, '大阪城公園', '男性40代', 12],
    ['21:40', 5800, '大阪城公園', '女性20代', 20],
    ['22:05', 2100, '京橋',       '',        0],
    ['22:30', 4400, '大阪城公園', '女性30代', 5],
    ['09:00', 1200, '梅田',       '男性50代', 3]   // ちがう乗り場。数えない
  ]);
  const st = F('shCollect_')(['大阪城公園', '京橋']);
  t(st.n === 4, '★近くの乗り場のぶんだけ数える（' + st.n + '件）');
  t(st.sum === 3200 + 5800 + 2100 + 4400, '　 売上も合う');
  t(st.max === 5800, '　 最高額も合う');
  t(st.waitN === 3, '★待ち時間は、書いてあるものだけ数える（' + st.waitN + '件）');
  t(st.byHour[21] && st.byHour[21].n === 2, '★時間帯ごとに分ける（21時台2件）');
  t(st.byHour[22] && st.byHour[22].n === 2, '　 22時台も2件');
  t(st.bySex['女性'] === 2 && st.bySex['男性'] === 1, '★男女を数える');
  t(st.byAge['20代'] === 1 && st.byAge['40代'] === 1, '★年代も数える');
  /*
   * ★母数（何件に書いてあったか）が いちばん大事です。
   *   4件のうち3件にしか書いていないのに「女性67%」と出すのは、
   *   うそに近い言い方になります
   */
  t(st.memoN === 3, '★★人のことが書いてあった件数（母数）を数える（' + st.memoN + '件）');
  t(st.n !== st.memoN, '　 母数は、全体の件数とは別もの');
}

console.log('\n■ 記録が1件も無くても、落ちない');
{
  setRecords([]);
  const st = F('shCollect_')(['大阪城公園']);
  t(st.n === 0, '0件として返す');
  t(F('shCollect_')([]).n === 0, '乗り場を決めていなくても落ちない');
  t(F('shCollect_')(null).n === 0, '何も渡されなくても落ちない');
}

console.log('\n■ アーティストの名前を、公演名から取り出す');
{
  const A = F('shArtistName_');
  t(A('あいうえお BAND LIVE TOUR 2026 大阪') === 'あいうえお BAND',
    '★ツアー名や年を落とす（' + A('あいうえお BAND LIVE TOUR 2026 大阪') + '）',
    A('あいうえお BAND LIVE TOUR 2026 大阪'));
  t(A('「なんとか」コンサート') === 'なんとか', '　 カギカッコも落とす');
  t(A('') === '' && A(null) === '', '　 空なら空');
}

console.log('\n■ 「公式」と決まっていないものを、公式と言わない');
{
  /*
   * ★ここは、いちばんやってはいけないところです。
   *   公式ページのURLを、こちらが知っているわけではありません。
   *   知らないものを「公式」と言って出せば、それは作り話になります
   */
  const L = F('shArtistLinks_')('あいうえお BAND LIVE TOUR 2026', '');
  t(L.length >= 3, 'いくつか入口を出す（' + L.length + '本）');
  t(L.every(x => x.sure === false),
    '★検索の入口は、ぜんぶ「確かではない」印にする');
  t(L.every(x => String(x.label).indexOf('公式サイト') === -1 ||
                 String(x.label).indexOf('探す') !== -1),
    '★「公式サイト」ではなく「公式サイトを探す」と書く');
  t(L.some(x => /^https:\/\//.test(x.url)), '　 リンクは https');

  // 会場のページに載っていたものだけ「確かなもの」
  const L2 = F('shArtistLinks_')('あいうえお', 'https://example.com/live');
  const sure = L2.filter(x => x.sure);
  t(sure.length === 1 && sure[0].url === 'https://example.com/live',
    '★会場のページのリンクだけは「確かなもの」として出す');

  t(F('shArtistLinks_')('', '').length === 0, '　 名前が読めなければ、何も出さない');
}

console.log('\n■ ★作り話でグラフを作らない');
{
  /*
   * ★この資料のいちばんの決まりです。
   *   グラフにしてよいのは、数えたもの（自社の記録）だけ。
   *   AIの見当（推定）は、文字だけで出します
   */
  setRecords([
    ['21:10', 3200, '大阪城公園', '男性40代', 10],
    ['21:20', 3300, '大阪城公園', '女性20代', 10],
    ['21:30', 3400, '大阪城公園', '女性20代', 10],
    ['22:00', 3500, '大阪城公園', '男性30代', 10],
    ['22:10', 3600, '大阪城公園', '女性30代', 10],
    ['22:20', 3700, '大阪城公園', '女性40代', 10]
  ]);
  vm.runInContext('function vnTopicInfo_(){ return { audience: "20代女性が中心とみられます" }; }', ctx);

  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'あいうえお BAND LIVE TOUR 2026', url: 'https://example.com/x' }]);

  const names = ss.getSheets().map(s => s.getName());
  t(names.join('／') === '目次／実績／客層／参考／出典',
    '★タブは 目次／実績／客層／参考／出典（' + names.join('／') + '）', names.join('／'));
  names.forEach(n => t(n.length <= 2, '　 「' + n + '」は全角2文字'));

  const kSh = ss.getSheetByName('客層');
  const kText = kSh._vals.map(r => (r || []).join(' ')).join('\n');
  has(kText, '20代女性が中心とみられます', '推定は、文字として出す');
  has(kText, '推定（AIの見当）', '★推定だと、はっきり書く');

  // 推定のグラフは、1つも作らない
  const titles = kSh._charts.map(c => String(c.opts.title || ''));
  t(titles.every(x => x.indexOf('推定') === -1),
    '★★推定のグラフは、1つも作らない（' + titles.join('／') + '）', titles.join('／'));
  t(titles.every(x => x.indexOf('自社の記録') !== -1),
    '★グラフの題には、必ず「自社の記録」と書く（' + titles.join('／') + '）', titles.join('／'));
  t(titles.some(x => /\d+件/.test(x)), '★グラフの題に、母数（何件か）を書く');
  t(kSh._charts.every(c => c.kind === 'PIE'), '　 客層のグラフは円グラフ');
}

console.log('\n■ 母数が少なすぎるときは、グラフを作らない');
{
  /*
   * ★1件から作った円グラフは 100% にしかなりません。
   *   それは「分かった」ではなく「分かっていない」ことの表れです。
   *   それらしい絵にして出すほうが、出さないより ずっと害があります
   */
  setRecords([
    ['21:10', 3200, '大阪城公園', '男性40代', 10],
    ['21:20', 3300, '大阪城公園', '', 10]
  ]);
  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'なんとか', url: '' }]);
  const kSh = ss.getSheetByName('客層');
  t(kSh._charts.length === 0, '★★1件しか書いていなければ、円グラフを作らない');
  const kText = kSh._vals.map(r => (r || []).join(' ')).join('\n');
  has(kText, '少なすぎて', '★なぜ作らないのかを、その場に書く');
  has(kText, '2件のうち 1件', '★母数は、作らないときも必ず出す');
}

console.log('\n■ 実績のタブ');
{
  setRecords([
    ['21:10', 3200, '大阪城公園', '', 10],
    ['21:20', 3300, '大阪城公園', '', 20],
    ['22:00', 9900, '大阪城公園', '', null]
  ]);
  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'なんとか', url: '' }]);
  const sSh = ss.getSheetByName('実績');
  const txt = sSh._vals.map(r => (r || []).join(' ')).join('\n');
  has(txt, '会場そのものではなく、会場の近くの乗り場の記録です',
      '★何を数えた数字なのかを、いちばん上に書く');
  has(txt, '3件', '件数が出る');
  has(txt, '￥9,900', '最高額が出る');
  has(txt, '3件中2件に記入', '★待ち時間は、母数つきで出す');
  t(sSh._charts.length >= 1, '★時間帯のグラフを作る');
  t(sSh._charts.every(c => c.kind === 'COLUMN'), '　 時間帯は棒グラフ');
}

console.log('\n■ 記録が0件の会場でも、資料は作る');
{
  setRecords([]);
  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'なんとか', url: '' }]);
  const sSh = ss.getSheetByName('実績');
  has(sSh._vals.map(r => (r || []).join(' ')).join('\n'), 'まだありません（0件）',
      '★「記録なし」と、正直に書く');
  t(sSh._charts.length === 0, '★0件なら、グラフは作らない');
}

console.log('\n■ 作り直しても、古い中身やグラフが残らない');
{
  setRecords([
    ['21:10', 3200, '大阪城公園', '男性40代', 10],
    ['21:20', 3300, '大阪城公園', '女性20代', 10],
    ['21:30', 3400, '大阪城公園', '女性20代', 10],
    ['22:00', 3500, '大阪城公園', '男性30代', 10],
    ['22:10', 3600, '大阪城公園', '女性30代', 10],
    ['22:20', 3700, '大阪城公園', '女性40代', 10]
  ]);
  const ev = [{ venue: '大阪城ホール', title: 'なんとか', url: '' }];
  const ss1 = F('shBuild_')(new Date(2026, 8, 21), ev);
  const n1 = ss1.getSheetByName('客層')._charts.length;
  const r1 = ss1.getSheetByName('実績')._vals.length;
  const ss2 = F('shBuild_')(new Date(2026, 8, 21), ev);
  t(ss1 === ss2, '★スプシを何個も作らない（1個を使い回す）');
  t(ss2.getSheetByName('客層')._charts.length === n1,
    '★グラフが増えていかない（' + ss2.getSheetByName('客層')._charts.length + '個）');
  t(ss2.getSheetByName('実績')._vals.length === r1, '　 行も増えていかない');
}

console.log('\n■ 参考のタブ');
{
  setRecords([]);
  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'あいうえお BAND LIVE TOUR 2026',
       url: 'https://example.com/live' }]);
  const pSh = ss.getSheetByName('参考');
  const txt = pSh._vals.map(r => (r || []).join(' ')).join('\n');
  has(txt, '公式と決まったものではありません', '★入口であることを、いちばん上に書く');
  has(txt, 'あいうえお BAND', '★読み取った名前を、そのまま見せる');
  has(txt, 'https://www.google.com/search', '　 検索の入口が出る');
  has(txt, 'https://example.com/live', '　 会場のページも出る');
  has(txt, '◎', '★確かなものには、印を付ける');
}

console.log('\n■ 📊 でURLを返す');
{
  setRecords([]);
  replied.length = 0;
  t(F('shHandleCmd_')({ message: { text: '📊' },
      source: { userId: 'Umark' }, replyToken: 'r' }) === true, '★「📊」を受ける');
  has(replied[0], 'https://docs.google.com/spreadsheets/', '★URLを返す');
  has(replied[0], '自社の記録だけで作っています', '★グラフの出どころを、必ず書く');
  t(F('shHandleCmd_')({ message: { text: '📊' },
      source: { userId: 'Uother' }, replyToken: 'r' }) === false, '★ほかの人には、返さない');
}

console.log('\n■ 資料が作れなくても、イベント通知は止めない');
{
  /*
   * ★参考資料は おまけです。これが作れないせいで
   *   「きょうどこで何時に終わるか」が届かないのは、本末転倒です
   */
  const keep = ctx.SpreadsheetApp.create;
  ctx.SpreadsheetApp.create = () => { throw new Error('作れません'); };
  props = {}; Object.keys(books).forEach(k => delete books[k]);
  t(F('shLinkFor_')(new Date(), []) === '',
    '★作れなければ、空のURLを返す（通知そのものは止めない）');
  ctx.SpreadsheetApp.create = keep;
}

console.log('\n■ 外の置き場から、確かな手がかりを取る');
/*
 * ★まーくさんのご質問「Xの代わりに読めるものは無いか」への答えです。
 *   鍵が要らず、規約の中で読めるものだけを使います。
 *     MusicBrainz … 結成年・種別
 *     Wikidata    … 公式サイト・公式SNS（これは「公式」と言い切れる）
 */
{
  fetched.length = 0;
  webReply = {
    'musicbrainz.org': { code: 200, body: JSON.stringify({ artists: [
      { id: 'MBID1', name: 'あいうえお', type: 'Group', country: 'JP',
        score: 100, 'life-span': { begin: '2005-04-01' } }
    ]})},
    'wbsearchentities': { code: 200, body: JSON.stringify({ search: [{ id: 'Q123' }] })},
    'wbgetentities': { code: 200, body: JSON.stringify({ entities: { Q123: { claims: {
      P856:  [{ mainsnak: { datavalue: { value: 'https://example.jp/' } } }],
      P2002: [{ mainsnak: { datavalue: { value: 'aiueo_staff' } } }],
      P2397: [{ mainsnak: { datavalue: { value: 'UCxxxx' } } }]
    }}}})}
  };

  const mb = F('shMbArtist_')('あいうえお');
  t(!!mb && mb.type === 'Group' && mb.begin === '2005-04-01',
    '★MusicBrainz から、結成年と種別が取れる');
  const ua = fetched.filter(x => x.url.indexOf('musicbrainz') !== -1)[0];
  t(!!ua && !!(ua.opt.headers || {})['User-Agent'],
    '★名乗り（User-Agent）を付ける（無いと断られる）');

  /*
   * ★同じ名前の別人を出すほうが、何も出さないより害があります。
   *   点が低いものは使いません
   */
  webReply['musicbrainz.org'] = { code: 200, body: JSON.stringify({ artists: [
    { id: 'X', name: 'ぜんぜん別人', type: 'Person', score: 40, 'life-span': {} }
  ]})};
  t(F('shMbArtist_')('あいうえお') === null,
    '★★似ていないもの（点が低い）は、出さない');
  webReply['musicbrainz.org'] = { code: 200, body: JSON.stringify({ artists: [
    { id: 'MBID1', name: 'あいうえお', type: 'Group', country: 'JP',
      score: 100, 'life-span': { begin: '2005-04-01' } }
  ]})};

  const wd = F('shWdArtist_')('あいうえお');
  t(!!wd && wd.site === 'https://example.jp/', '★Wikidata から、公式サイトが取れる');
  t(wd.x === 'https://x.com/aiueo_staff', '★公式Xも（IDからURLを組み立てる）');
  t(wd.youtube.indexOf('UCxxxx') !== -1, '　 公式YouTubeも');
  t(wd.instagram === '', '　 無いものは、空のまま');

  // つながらなくても、落ちない
  webReply = { 'musicbrainz.org': { throw: 'つながりません' } };
  t(F('shMbArtist_')('あいうえお') === null, '★つながらなくても落ちない');
  t(F('shWdArtist_')('あいうえお') === null, '　 Wikidataも同じ');
}

console.log('\n■ 公式と、探しに行く入口を、はっきり分ける');
{
  const wd = { site: 'https://example.jp/', x: 'https://x.com/a',
               instagram: '', youtube: '' };
  const L = F('shArtistLinks_')('あいうえお BAND LIVE TOUR 2026', '', wd);
  const sure = L.filter(x => x.sure);
  t(sure.length === 2, '★Wikidata で見つかったものは「確かなもの」（' + sure.length + '本）');
  t(sure[0].label === '公式サイト', '★「公式サイトを探す」ではなく「公式サイト」と書ける');
  t(L[0].sure === true, '★確かなものを、いちばん上に出す');
  t(L.filter(x => !x.sure).length >= 3, '　 検索の入口も、これまでどおり残す');

  // 見つからなければ、これまでどおり検索の入口だけ
  const L2 = F('shArtistLinks_')('あいうえお', '', null);
  t(L2.every(x => x.sure === false),
    '★見つからなければ、ぜんぶ「探しに行く入口」のまま');
}

console.log('\n■ 結成年からの手がかりは、「考えたこと」だと書く');
{
  const H = F('shAgeHint_');
  const now = new Date(2026, 8, 21);
  const h = H({ type: 'Group', begin: '2005-04-01' }, now);
  t(h.indexOf('2005年') !== -1, '★結成年を出す');
  t(h.indexOf('21年目') !== -1, '　 何年目かも');
  t(h.indexOf('36〜46歳') !== -1, '★当時10代〜20代だった人の、いまの年齢（' + h + '）', h);
  t(h.indexOf('調べた数字ではありません') !== -1,
    '★★「調べた数字ではない」と、必ず書く');
  t(H({ type: 'Group', begin: '' }, now) === '', '　 結成年が無ければ、何も出さない');
  t(H(null, now) === '', '　 見つからなければ、何も出さない');
}

console.log('\n■ ★出典タブ（裏付けの取れる客層は、人が書き写す）');
/*
 * ★ファンの年齢・男女の数字は、どこの無料の窓口にもありません。
 *   Xにも Spotify にも、公開されていません。
 *   けれど、ぴあ総研の白書のような有料の調査には載っています。
 *   そこで「人が、出典つきで書き写す」形にしました。
 */
{
  setRecords([]);
  webReply = {};
  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'あいうえお BAND', url: '' }]);
  const src = ss.getSheetByName('出典');
  t(!!src, '★「出典」のタブができる');
  const head = (src._vals[0] || []).join('／');
  t(head.indexOf('出典') !== -1, '★出典のらんがある（' + head + '）', head);
  const txt = src._vals.map(r => (r || []).join(' ')).join('\n');
  has(txt, '出典のらんが空の行は、資料に出しません', '★決まりを、その場に書く');
  has(txt, 'ぴあ総研', '★どこから写せばよいかの例を出す');

  // ★人が書いたものは、作り直しても消さない
  src._vals.push(['あいうえお', '30〜40代が中心', 'ぴあ総研 白書2025 p.12', '2026/09/21']);
  const keep = src._vals.length;
  F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'あいうえお BAND', url: '' }]);
  t(ss.getSheetByName('出典')._vals.length === keep,
    '★★人が書いた出典は、作り直しても消さない');
}

console.log('\n■ 出典が無い数字は、出さない');
{
  setRecords([]);
  webReply = {};
  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'あいうえお BAND', url: '' }]);
  const src = ss.getSheetByName('出典');

  // ① 出典つき → 出る
  src._vals.push(['あいうえお', '30〜40代が中心', 'ぴあ総研 白書2025 p.12', '2026/09/21']);
  const f1 = F('shSourceFind_')(ss, 'あいうえお BAND', '大阪城ホール');
  t(!!f1 && f1.value === '30〜40代が中心', '★出典つきなら、引ける');
  t(f1.source.indexOf('ぴあ総研') !== -1, '　 出典も一緒に返る');

  // ② 出典が空 → 出ない
  src._vals.length = 0;
  src._vals.push(['見出し', '', '', '']);
  src._vals.push(['あいうえお', '20代女性が中心', '', '']);
  t(F('shSourceFind_')(ss, 'あいうえお BAND', '大阪城ホール') === null,
    '★★出典のらんが空なら、引かない（どこから来たか分からない数字は出さない）');

  // ③ 当てはまらない → 出ない
  src._vals.length = 0;
  src._vals.push(['見出し', '', '', '']);
  src._vals.push(['まったく別のひと', '20代', 'どこかの本', '']);
  t(F('shSourceFind_')(ss, 'あいうえお BAND', '大阪城ホール') === null,
    '　 名前が当てはまらなければ、引かない');
}

console.log('\n■ 調べた客層は、AIの見当より先に出す');
{
  /*
   * ★先に出ているほうを、人は信じます。
   *   出典のあるものが下にあると、見当のほうが本命に見えます
   */
  setRecords([]);
  webReply = {};
  vm.runInContext('function vnTopicInfo_(){ return { audience: "20代女性が中心とみられます" }; }', ctx);
  const ss = F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'あいうえお BAND', url: '' }]);
  ss.getSheetByName('出典')._vals.push(
    ['あいうえお', '30〜40代が中心', 'ぴあ総研 白書2025 p.12', '2026/09/21']);
  F('shBuild_')(new Date(2026, 8, 21),
    [{ venue: '大阪城ホール', title: 'あいうえお BAND', url: '' }]);

  const k = ss.getSheetByName('客層');
  // ★とびとびに書かれるので、穴のあいた配列になる。穴も1行として数える
  const lines = [];
  for (let i = 0; i < k._vals.length; i++) {
    const row = k._vals[i];
    lines.push(row ? Array.from(row, v => (v == null ? '' : v)).join(' ') : '');
  }
  const iSrc = lines.findIndex(x => x.indexOf('調べた客層') !== -1);
  const iAi  = lines.findIndex(x => x.indexOf('推定（AIの見当）') !== -1);
  t(iSrc !== -1, '★調べた客層が出る');
  t(iAi !== -1, '　 AIの見当も、これまでどおり出る');
  t(iSrc < iAi, '★★調べた客層が、AIの見当より上にある');
  has(lines.join('\n'), '出典：ぴあ総研', '★出典も、その場に書く');
}

console.log('\n■ バージョン');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '009-Shiryo.gs'), 'utf8');
  const head = (src.match(/★★★\s+(S\d+ver)/) || [])[1] || '';
  t(head === vm.runInContext('SH_VERSION', ctx),
    '★先頭のバージョンと SH_VERSION が同じ（' + head + '）');
}

console.log(ng ? '\n✗ ' + ng + '件 失敗\n' : '\n✓ すべて通りました\n');
process.exit(ng ? 1 : 0);
