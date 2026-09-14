/**
 * LineReport.gs の期間まわりを検証する（SpreadsheetApp には触れない）
 *   実行: node gas/test/linereport.test.js
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
const D = vm.runInContext('Date', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);

// Gemini 呼び出しを差し替えられるようにしておく
const props = { GEMINI_API_KEY: 'dummy-key' };
let lastUrl = '', reply = { code: 200, body: '{}' };
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = v; }
}) };
ctx.UrlFetchApp = { fetch: (url) => { lastUrl = url; return {
  getResponseCode: () => reply.code, getContentText: () => reply.body }; } };
ctx.SpreadsheetApp = { getUi: () => ({}) };

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8'), ctx);

let fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fail++; console.log('FAIL', msg, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); }
  else console.log('ok  ', msg);
};

/* ---- 16日起点の期間 ---- */
const ps = d => ctx.lrPeriodStart_(d);
eq(ctx.lrVal_(ps(new D(2026, 8, 1))),  '2026/8/16',  '9/1 は 8/16 開始の期に入る');
eq(ctx.lrVal_(ps(new D(2026, 7, 16))), '2026/8/16',  '8/16 ちょうどは その日が開始');
eq(ctx.lrVal_(ps(new D(2026, 7, 15))), '2026/7/16',  '8/15 はまだ前の期');
eq(ctx.lrVal_(ps(new D(2026, 0, 3))),  '2025/12/16', '1/3 は年をまたいで 12/16 開始');

/* ---- 表示の形 ---- */
// 2026/8/16 は日曜、9/1 は火曜
eq(ctx.lrFull_(new D(2026, 7, 16)), '2026/08/16(日)', 'プルダウン先頭は yyyy/MM/dd(曜)');
eq(ctx.lrShort_(new D(2026, 8, 1)),      '09/01(火)', '終わりは MM/dd(曜)');
eq(ctx.lrAlt_(new D(2026, 8, 1)),         '9/1(火)',  '裏メッセージは 0埋めなし');

/* ---- プルダウンの中身 ---- */
const today = new D(2026, 8, 1);          // 2026/9/1(火)
const list = ctx.lrPeriodsFrom_(new D(2025, 10, 22), today);   // 記録は 2025/11/22 から

eq(list[0].label, '2026/08/16(日) ～ 09/01(火)（今期）', '先頭は今期（16日〜今日）');
eq(list[0].value, '2026/8/16-2026/9/1',                 '  値は開始-終了');
eq(list[1].label, '2026/07/16(木) ～ 08/15(土)',        '2番目は 7/16〜8/15');
eq(list[1].value, '2026/7/16-2026/8/15',                '  値も 16日〜15日');

// 新しい → 古い の順に並んでいること
const starts = list.map(p => p.value.split('-')[0]);
const asDate = v => { const a = v.split('/').map(Number); return new D(a[0], a[1] - 1, a[2]).getTime(); };
eq(starts.every((v, i) => i === 0 || asDate(starts[i - 1]) > asDate(v)), true, '新しい→古い の順に並ぶ');

// 記録がある月まで作る（2025/11/16 が最後）
eq(list[list.length - 1].value.split('-')[0], '2025/11/16', '一番古い記録の期まで作って止まる');
eq(list.length, 10, '今期 + 過去9期 = 10個（2026年の7〜1月 と 2025年の12・11月）');

/* ---- 記録が無い / 少ないとき ---- */
eq(ctx.lrPeriodsFrom_(null, today).length, 1, '記録が無ければ今期だけ');
const one = ctx.lrPeriodsFrom_(new D(2026, 7, 20), today);
eq(one.length, 1, '記録が今期しか無ければ1個だけ');

/* ---- 年をまたぐ ---- */
const ny = ctx.lrPeriodsFrom_(new D(2025, 10, 1), new D(2026, 0, 5));  // 今日=2026/1/5
eq(ny[0].value, '2025/12/16-2026/1/5', '年をまたぐ今期も正しく作れる');
eq(ny[1].value, '2025/11/16-2025/12/15', '  その前は 11/16〜12/15');

/* ---- 裏メッセージの文面 ---- */
const alt = "📈" + ctx.lrAlt_(new D(2026, 7, 16)) + "～" + ctx.lrAlt_(new D(2026, 8, 1)) + "レポート作成 byシバンニ";
eq(alt, '📈8/16(日)～9/1(火)レポート作成 byシバンニ', '裏メッセージの文面（先頭に📈）');
eq(alt.charAt(0), '📈'.charAt(0), '  先頭が📈で始まる');
eq(alt.length <= 400, true, 'LINEの altText 上限400文字に収まる');

/* ---- Gemini（ダッシュボードの「傾向と対策」） ---- */
// v185 は gemini-1.5-flash を叩いていたが、これは廃止済みで 404 が返る。
// 全行が「【AI分析エラー】データが取得できませんでした」になっていた原因。
eq(ctx.getGeminiModel_(), 'gemini-3.1-flash-lite', '既定のモデルは現行のもの');
eq(ctx.getGeminiModel_().indexOf('1.5') === -1, true, '廃止済みの1.5系を使っていない');

reply = { code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '新地4の23時台を狙う' }] } }] }) };
eq(ctx.generateAIText(7500, 12, 20, ['23:10']), '新地4の23時台を狙う', '正常時は本文を返す');
eq(lastUrl.indexOf('/models/gemini-3.1-flash-lite:generateContent') !== -1, true,
   '  設定したモデルでURLを組み立てている');

// 原因が分かるエラー文になっているか（v185は全部同じ文言だった）
reply = { code: 404, body: JSON.stringify({ error: { message: 'models/gemini-1.5-flash is not found' } }) };
eq(ctx.generateAIText(7500, 12, 20, []).indexOf('見つかりません') !== -1, true,
   '404はモデル廃止と分かる文言を返す');

reply = { code: 403, body: JSON.stringify({ error: { message: 'API key not valid' } }) };
const e403 = ctx.generateAIText(7500, 12, 20, []);
eq(e403.indexOf('APIキー') !== -1, true, '403はキーの問題と分かる');
eq(e403.indexOf('API key not valid') !== -1, true, '  APIからの理由もそのまま出す');

reply = { code: 429, body: '{}' };
eq(ctx.generateAIText(7500, 12, 20, []).indexOf('回数制限') !== -1, true, '429は回数制限と分かる');

eq(ctx.generateAIText(5000, 1, 0, []), 'データ不足のため判断保留。', '1件だけならAIを呼ばない');
delete props.GEMINI_API_KEY;
eq(ctx.generateAIText(7500, 12, 20, []).indexOf('AI未設定') !== -1, true, 'キー未設定なら呼ばずに知らせる');
props.GEMINI_API_KEY = 'dummy-key';

// モデル名は設定で差し替えられる（Googleが次々にモデルを止めるため）
props.GEMINI_MODEL = 'gemini-3.5-flash';
eq(ctx.getGeminiModel_(), 'gemini-3.5-flash', '設定でモデルを差し替えられる');

/* ============ 期間の打ち込み（そうさボタン [7]） ============ */
console.log('\n■ 期間の読み取り');
const NOW = new D(2026, 8, 6);            // 2026/9/6（日）
const R = (s) => ctx.rpParseRange_(s, NOW);
const ymd = (d) => d ? (d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()) : null;
const span = (s) => { const r = R(s); return r.err ? 'ERR' : ymd(r.from) + '-' + ymd(r.to); };

eq(span('今期'), '2026/8/16-2026/9/6', '今期は 8/16〜今日');
eq(span('今期（8/16(日)〜9/6(日)）'), '2026/8/16-2026/9/6', 'プルダウンの飾りつきでも読める');
eq(span('前期'), '2026/7/16-2026/8/15', '前期は 7/16〜8/15');
eq(span('今日'), '2026/9/6-2026/9/6', '今日');
eq(span('昨日'), '2026/9/5-2026/9/5', '昨日');
eq(span('今月'), '2026/9/1-2026/9/6', '今月は 1日〜今日');
eq(span('先月'), '2026/8/1-2026/8/31', '先月は まるまる1か月');

eq(span('260716-0815'), '2026/7/16-2026/8/15', '260716-0815（月日は4桁）');
eq(span('260716-260815'), '2026/7/16-2026/8/15', '終わりにも年を付けてよい');
eq(span('2026/7/16-2026/8/15'), '2026/7/16-2026/8/15', '区切りありの書き方');
eq(span('2026/7/16〜2026/8/15'), '2026/7/16-2026/8/15', '〜でもよい');
eq(span('0716-0815'), '2026/7/16-2026/8/15', '年を書かなければ今年');
eq(span('２６０７１６－０８１５'), '2026/7/16-2026/8/15', '全角で打っても読める');
eq(span('261216-0115'), '2026/12/16-2027/1/15', '年をまたぐ書き方は、終わりを翌年にする');
eq(span('260905'), '2026/9/5-2026/9/5', '1つだけなら その日1日ぶん');

eq(R('あいうえお').err !== undefined, true, '読めなければエラーにする');
eq(R('あいうえお').err.indexOf('260716-0815') !== -1, true, '  書き方の例も出す');
eq(R('260231-0301').err !== undefined, true, '2月31日のような日はじく');
eq(R('260815-0716').err.indexOf('終わりの日') !== -1, true, '前後が逆なら、そう言う');
eq(R('').err.indexOf('空') !== -1, true, '空欄なら、そう言う');

console.log('\n■ 末尾の t / h で送り先を決める');
eq(R('260716-0815t').dest, 'test',  't は自分だけ');
eq(R('260716-0815h').dest, 'group', 'h はグループ');
eq(R('260716-0815T').dest, 'test',  '大文字でもよい');
eq(R('今期h').dest, 'group', '言葉で書いたときにも付けられる');
eq(R('260716-0815').dest, null, '付けなければ「指定なし」');
eq(span('260716-0815t'), '2026/7/16-2026/8/15', 't を付けても期間はそのまま');
eq(span('今日'), '2026/9/6-2026/9/6', '「今日」の日 は t と間違えない');

console.log('\n■ 送り先らんの読み取り');
eq(ctx.rpParseDest_('🧪 自分だけ（テスト）'), 'test',  '自分だけ');
eq(ctx.rpParseDest_('👥 グループ全員（本番）'), 'group', 'グループ');
eq(ctx.rpParseDest_(''), null, '空欄なら「指定なし」');
eq(ctx.rpParseDest_('よくわからない'), null, '読めないものも「指定なし」');

/* ============ まとめスプシの見た目まわり ============ */
console.log('\n■ 備考のよけいな空白をつぶす');
eq(ctx.dbTidy_('GO つつみのけんたろう様(男性4\n\n\n\n0代)、会社指定'),
   'GO つつみのけんたろう様(男性40代)、会社指定', '改行だけの行を消してつなげる');
eq(ctx.dbTidy_('  5台目〜、愛チケ、　ﾒﾀｳｫ〜  '), '5台目〜、愛チケ、ﾒﾀｳｫ〜', '前後と全角の空白も消す');
eq(ctx.dbTidy_(''), '', '空欄はそのまま');
eq(ctx.dbTidy_(null), '', 'null でも落ちない');
eq(ctx.dbTidy_('Uber 行先:服部緑地'), 'Uber 行先:服部緑地', '意味のある空白は1つだけ残す');

console.log('\n■ 行の高さの見積もり');
eq(ctx.dbLines_('あ', 400, 11), 1, '短ければ1行');
eq(ctx.dbLines_('あ\nい\nう', 400, 11), 3, '改行のぶんは数える');
eq(ctx.dbLines_('あ'.repeat(60), 100, 11) > 1, true, '幅に入らなければ折り返す');
eq(ctx.dbLines_('', 400, 11), 1, '空でも0行にはしない');

console.log('\n■ AIが使えないときの「傾向と対策」');
{
  const f = ctx.aiFallback_;
  eq(f({name:'新地4', avgSales:18000, count:5, waitAvg:10, times:['23:41']}).indexOf('最優先') !== -1, true,
     '高単価は最優先と言う');
  eq(f({name:'ドン5', avgSales:600, count:3, waitAvg:10, times:[]}).indexOf('単価が低い') !== -1, true,
     '低単価はそう言う');
  eq(f({name:'新地7', avgSales:5000, count:4, waitAvg:30, times:[]}).indexOf('回送') !== -1, true,
     '待ち負けなら回送をすすめる');
  eq(f({name:'天満', avgSales:9000, count:1, waitAvg:0, times:[]}).indexOf('件数が少なく') !== -1, true,
     '1件だけなら判断を保留する');
  eq(f({name:'天満', avgSales:6000, count:4, waitAvg:12, times:['01:10']}).indexOf('時給換算￥30,000') !== -1, true,
     '待ち時間あたりの効率を出す（6000円÷12分×60）');
  eq(f({name:'天満', avgSales:6000, count:4, waitAvg:12, times:['01:10']}).indexOf('狙い目 01:10') !== -1, true,
     '狙い目の時刻も出す');
  eq(typeof f({name:'x', avgSales:0, count:0, waitAvg:0, times:null}), 'string', 'からっぽでも落ちない');
}

console.log('\n■ AIはまとめて1回だけ呼ぶ');
{
  ctx.Utilities = { sleep: () => {} };
  const items = [
    { name:'新地4', avgSales:5000, count:4, waitAvg:10, times:['23:41'] },
    { name:'天満',  avgSales:9000, count:3, waitAvg:20, times:['01:10'] },
    { name:'ドン2', avgSales:2000, count:2, waitAvg:5,  times:[] }
  ];
  let calls = 0;
  const realFetch = ctx.UrlFetchApp.fetch;
  ctx.UrlFetchApp.fetch = function (url, opt) {
    calls++; lastUrl = url;
    return { getResponseCode: () => reply.code, getContentText: () => reply.body };
  };

  const body = m => JSON.stringify({ candidates: [{ content: { parts: [{ text: m }] } }] });
  reply = { code: 200, body: body('1. 23時台に入る\n2. 1時台が狙い目\n3. 長居しない') };
  let r = ctx.generateAIBatch_(items);
  eq(calls, 1, '乗り場が3つでも、呼ぶのは1回だけ（前は3回で回数制限に当たっていた）');
  eq(r, ['23時台に入る', '1時台が狙い目', '長居しない'], '番号どおりに割りふる');

  calls = 0;
  reply = { code: 200, body: body('2. 1時台が狙い目') };
  r = ctx.generateAIBatch_(items);
  eq(r[1], '1時台が狙い目', '返ってきた番号だけ差し替える');
  eq(r[0].indexOf('平均以上') !== -1, true, '返らなかったぶんは数字から作った文が残る');

  reply = { code: 429, body: '{}' };
  r = ctx.generateAIBatch_(items);
  eq(r[0].indexOf('回数制限') !== -1, true, '回数制限なら、その理由を出す');
  eq(r[1].indexOf('エラー') === -1, true, '  ほかの行はエラーだらけにしない（数字から作った文を出す）');
  eq(r.length, 3, '  件数は変わらない');

  reply = { code: 404, body: JSON.stringify({ error: { message: 'not found' } }) };
  eq(ctx.generateAIBatch_(items)[0].indexOf('モデル') !== -1, true, '404はモデルの話だと分かる');

  eq(ctx.generateAIBatch_([]).length, 0, '乗り場が無ければ何もしない');

  const savedKey = props.GEMINI_API_KEY; delete props.GEMINI_API_KEY;
  calls = 0;
  r = ctx.generateAIBatch_(items);
  eq(calls, 0, 'キーが無ければ呼びに行かない');
  eq(r[0].indexOf('AI未設定') !== -1, true, '  そう伝える');
  props.GEMINI_API_KEY = savedKey;
  ctx.UrlFetchApp.fetch = realFetch;
}

/* ============ LINEに送る絵（Flex Message） ============ */
console.log('\n■ Flex Message を実際に組み立てる');

function mkArea(o) {
  return Object.assign({l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,
    lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}}, o || {});
}
const DT = ["平日", "金曜", "土曜", "日祝"];
const HRS = [20,21,22,23,0,1,2,3,4,5];

const areaStats = {};
DT.forEach(d => { areaStats[d] = { "北": mkArea(), "ﾐﾅﾐ": mkArea(), "ほか": mkArea() }; });
// 平日の北：46件 / ﾛﾝｸﾞ8 ﾐﾄﾞﾙ5 ｼｮｰﾄ33（17% / 11% / 72%）
areaStats["平日"]["北"] = mkArea({ l:8, m:5, s:33, t:46, sales:217534, lSum:106160, mSum:36980, sSum:74394,
  waitSum:1242, waitCount:46, lWait:312, lWaitC:8, mWait:125, mWaitC:5, sWait:805, sWaitC:33,
  spots: { "新地4": {l:2,m:1,s:20,lSum:25924,mSum:7330,sSum:43000,lTimes:{"(月) 23:51":1},mTimes:{},sTimes:{}} } });
// ﾐﾄﾞﾙが3%しかない＝帯が細くて中に書けないケース
areaStats["金曜"]["北"] = mkArea({ l:0, m:1, s:28, t:29, sales:98194, mSum:5000, sSum:93194,
  waitSum:522, waitCount:29, spots: {} });
// 1件だけ＝(参考)になるケース
areaStats["土曜"]["ほか"] = mkArea({ l:0, m:1, s:0, t:1, sales:5100, mSum:5100, spots: {} });

const finalTimeline = {};
DT.forEach(d => { finalTimeline[d] = {}; HRS.forEach(h => finalTimeline[d][h] = {best:null, worst:null}); });
finalTimeline["平日"][20] = { best: {name:"ドン2", count:2, avg:2950, max:3600, at:"20:40", times:[]}, worst: null };
finalTimeline["平日"][23] = {
  best:  {name:"新地4", count:15, avg:6758, max:18960, at:"23:51", times:[]},
  worst: {name:"新地7", count:2,  avg:2050, max:2050,  at:"23:20", times:[]} };
finalTimeline["日祝"][3] = { best: {name:"天満", count:6, avg:4827, max:8860, at:"03:48", times:[]}, worst: null };

const flex = ctx.buildReportFlex_({
  periodStr: "7/16(木)～8/15(土)", totalRidesCount: 175,
  tabRidesCount: {"北7":41,"北4":41,"北他":50,"ﾐﾅﾐ":0,"関空":0,"ほか":18},
  DAY_TYPES: DT, areaStats: areaStats, finalTimeline: finalTimeline,
  targetHours: HRS, dashboardUrl: "https://example.com/dash",
  // 本番と同じものを渡す（sendCustomReport の中で作っている関数）
  getBestTimeStr: function (o) {
    if (!o) return ""; let mc = 0, bt = "";
    for (const t in o) if (o[t] > mc) { mc = o[t]; bt = t; }
    return bt ? " [" + bt + "]" : "";
  }
});

/* --- 形がこわれていないか（LINEに弾かれると、レポートそのものが届かない） --- */
var BOX_OK = ["type","layout","contents","backgroundColor","cornerRadius","height","width","margin",
  "paddingAll","paddingTop","paddingBottom","paddingStart","paddingEnd","spacing","flex",
  "justifyContent","alignItems","borderWidth","borderColor","action","position","offsetTop"];
var TXT_OK = ["type","text","contents","size","color","weight","wrap","margin","flex","align",
  "gravity","adjustMode","style","decoration","maxLines","lineSpacing","position","offsetTop","action"];
var problems = [];
(function walk(n, path) {
  if (Array.isArray(n)) return n.forEach((x, i) => walk(x, path + '[' + i + ']'));
  if (!n || typeof n !== 'object') return;
  if (n.type === 'box') {
    if (!Array.isArray(n.contents)) problems.push(path + ': box に contents が無い');
    Object.keys(n).forEach(k => { if (BOX_OK.indexOf(k) === -1) problems.push(path + ': box に使えない項目 ' + k); });
  }
  if (n.type === 'text') {
    const hasText = typeof n.text === 'string' && n.text.length > 0;
    const hasSpan = Array.isArray(n.contents) && n.contents.length > 0;
    if (hasText === hasSpan) problems.push(path + ': text は text か contents のどちらか一方');
    if (hasSpan) n.contents.forEach((sp, i) => {
      if (sp.type !== 'span') problems.push(path + '.contents[' + i + ']: span ではない');
      if (typeof sp.text !== 'string') problems.push(path + '.contents[' + i + ']: span に text が無い');
    });
    Object.keys(n).forEach(k => { if (TXT_OK.indexOf(k) === -1) problems.push(path + ': text に使えない項目 ' + k); });
  }
  if (/(^|\D)(size|flex)$/.test('') ) {}
  if (n.flex !== undefined && (typeof n.flex !== 'number' || n.flex < 0)) problems.push(path + ': flex が数字でない');
  Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') walk(n[k], path + '.' + k); });
})(flex, 'bubble');
eq(problems, [], 'Flexの形に問題がない');

eq(flex.type, 'bubble', 'bubble で作る');
eq(flex.size, 'giga', '横いっぱい（giga）');
eq(flex.footer.contents[0].action.uri, 'https://example.com/dash', 'ボタンはダッシュボードへ飛ぶ');

const J = JSON.stringify(flex);
eq(J.length < 45000, true, 'LINEの上限(50KB)に余裕がある（実際 ' + J.length + 'バイト）');
eq(J.indexOf('undefined') === -1, true, 'undefined が混ざっていない');
eq(J.indexOf('NaN') === -1, true, 'NaN が混ざっていない');

console.log('\n■ パーセントは帯の中に出す');
eq(J.indexOf('ﾛﾝｸﾞ17%') !== -1 || J.indexOf('17%') !== -1, true, '17%が出ている');
{
  // 帯（横ならびの箱）を探して、中に文字が入っているか見る
  const bars = [];
  (function find(n) {
    if (Array.isArray(n)) return n.forEach(find);
    if (!n || typeof n !== 'object') return;
    if (n.type === 'box' && n.layout === 'horizontal' && n.height === '22px') bars.push(n);
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
  })(flex);
  eq(bars.length >= 3, true, '帯が曜日区分ごとにある（' + bars.length + '本）');

  const b0 = bars[0];   // 平日・北：ﾛﾝｸﾞ17 ﾐﾄﾞﾙ11 ｼｮｰﾄ72
  eq(b0.contents.length, 3, '3色に分かれている');
  eq(b0.contents.map(c => c.flex), [17, 11, 72], '幅は割合どおり');
  eq(b0.contents[2].contents[0].text, 'ｼｮｰﾄ72%', '広い帯には「ｼｮｰﾄ72%」まで入れる');
  eq(b0.contents[0].contents[0].text, '17%', 'ふつうの帯には「17%」だけ入れる');
  eq(b0.contents[0].contents[0].color, '#ffffff', '帯の上なので白文字');
  eq(b0.contents[0].contents[0].align, 'center', '帯の真ん中にそろえる（前は左詰めだった）');
  eq(b0.contents[0].justifyContent, 'center', '上下の真ん中にもそろえる');

  // 金曜・北 … ﾐﾄﾞﾙ3%（細すぎて中に書けない）
  const thin = bars.find(b => b.contents.some(c => c.flex === 3));
  eq(!!thin, true, '細い帯もちゃんと描く');
  eq(thin.contents.find(c => c.flex === 3).contents.length, 0, '細すぎる帯には文字を入れない（はみ出すため）');
  eq(J.indexOf('細い帯：ﾐﾄﾞﾙ3%') !== -1, true, '  そのぶんは帯の下に小さく添える');
}

console.log('\n■ アツい×避ける【時間詳細】');
eq(J.indexOf('【時間詳細】') !== -1, true, '見出しが【時間詳細】になっている');
{
  const texts = [];
  (function find(n) {
    if (Array.isArray(n)) return n.forEach(find);
    if (!n || typeof n !== 'object') return;
    if (n.type === 'text' && Array.isArray(n.contents) && n.contents[0] && n.contents[0].type === 'span') {
      texts.push(n.contents.map(s => s.text).join(''));
    }
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
  })(flex);

  eq(texts[0], '[20:40] 🔥ﾄﾞﾝ2 （2件／平均￥2,950／最高￥3,600）',
     '頭に「行くならこの時刻」、うしろに件数・平均・最高');
  eq(texts[1], '[23:51] 🔥新地4 （15件／平均￥6,758／最高￥18,960）', '時間帯の順に並ぶ');
  eq(texts[2], '[23:20] ⚠️新地7 （2件／平均￥2,050）', '避けるほうに「最高」は出さない（行かないので）');
  eq(texts[3], '[03:48] 🔥天満 （6件／平均￥4,827／最高￥8,860）', '日祝ぶんも出る');
  eq(texts.length, 4, '記録がある時間帯だけ（' + texts.length + '行）');
  eq(J.indexOf('(月) 23:51') === -1, true, '時刻を全部ならべない（前は30個ならんで読めなかった）');
  eq(J.indexOf('データ不足') !== -1, true, '記録が無い曜日区分は「データ不足」と出す');
}

/* ============ 💡 月間戦略アドバイス ============ */
console.log('\n■ 月間戦略アドバイス');
const ADV_DT = ["平日","金曜","土曜","日祝"], ADV_HRS = [20,21,22,23,0,1,2,3,4,5];
function mkFt(set) {
  const ft = {}; ADV_DT.forEach(d => { ft[d] = {}; ADV_HRS.forEach(h => ft[d][h] = {best:null, worst:null}); });
  (set || []).forEach(x => { ft[x[0]][x[1]] = { best: x[2], worst: null }; });
  return ft;
}
{
  const spotStats = {
    "北4|新地4": { count: 16, sales: 84368, waitSum: 320, waitCount: 16 },   // 件数は多いが平均は低い
    "北他|江坂": { count: 3,  sales: 21699, waitSum: 66,  waitCount: 3 },    // 平均がいちばん高い
    "ﾐﾅﾐ|大丸":  { count: 2,  sales: 40000, waitSum: 4,   waitCount: 2 }     // 2件だけ＝まぐれ
  };
  const spotHotData = {
    "北4|新地4": { "4|23": { count: 4, sales: 43336, times: ["23:44","23:51","23:53","23:55"] },
                   "6|1":  { count: 2, sales: 20310, times: ["01:22","01:53"] } },
    "北他|江坂": { "6|3":  { count: 1, sales: 7233,  times: ["03:16"] },
                   "5|1":  { count: 1, sales: 7233,  times: ["01:33"] } },
    "ﾐﾅﾐ|大丸":  { "4|0":  { count: 2, sales: 40000, times: ["00:10","00:20"] } }
  };
  const ft = mkFt([["平日",23,{name:"新地4",count:16,avg:10834}],
                   ["金曜",1, {name:"天満", count:2, avg:10425}],
                   ["土曜",1, {name:"新地4",count:2, avg:10155}],
                   ["日祝",3, {name:"天満", count:6, avg:4827}]]);
  const a = ctx.buildMonthlyAdvice_(spotStats, spotHotData, ft, ADV_DT, ADV_HRS, new D(2026, 7, 15));

  eq(a.best.name, '江坂', '振り返りは「平均がいちばん高い」乗り場（件数の多さではない）');
  eq(a.best.count, 3, '3件以上がある乗り場から選ぶ');
  eq(a.best.perHour, 19726, '待ち1時間あたりいくらかも出す（7,233÷22分×60）');
  eq(ctx.adviceReviewText_(a).indexOf('江坂') !== -1, true, '振り返りの文に乗り場名が入る');
  eq(ctx.adviceReviewText_(a).indexOf('実際の乗車：土曜 03:16') !== -1, true, '実際の乗車時刻も出す');

  eq(a.picks.length, 3, 'オススメは3つ');
  eq(a.picks[0].name, '大丸', '平均単価が高い順（￥20,000）');
  eq(a.picks[0].count >= 2, true, '  1件だけの組み合わせは「狙い目」と言わない');
  eq(a.picks[1].name, '新地4', '2番目');
  eq(ctx.advicePickLines_(a)[0].indexOf('木曜 00時台 の 大丸') !== -1, true, '曜日・時間帯・乗り場の順で書く');
  eq(ctx.advicePickLines_(a)[0].indexOf('00:10、00:20') !== -1, true, '実際の時刻も添える');

  eq(a.nextMonth, 9, '8/15までの期間なら、予想するのは9月');
  eq(a.bigSlots, 3, '平均￥10,000超えの時間帯を数える');
  eq(ctx.adviceForecastText_(a).indexOf('一発狙い') !== -1, true, '10,000超えが3個以上なら一発狙いをすすめる');
  eq(ctx.adviceForecastText_(a).indexOf('残暑') !== -1, true, '9月なら9月らしい話をする');
}
{
  // 10,000超えが無いときは、逆のことを言う
  const a2 = ctx.buildMonthlyAdvice_({}, {}, mkFt([["平日",23,{name:"新地4",count:5,avg:4000}]]),
                                     ADV_DT, ADV_HRS, new D(2026, 10, 30));
  eq(a2.bigSlots, 0, '10,000超えなし');
  eq(ctx.adviceForecastText_(a2).indexOf('回転数で積む') !== -1, true, 'そのときは回転数をすすめる');
  eq(a2.nextMonth, 12, '11/30までなら12月の予想');
  eq(ctx.adviceForecastText_(a2).indexOf('最需要期') !== -1, true, '12月は最需要期と言う');
  eq(ctx.adviceReviewText_(a2).indexOf('3件以上') !== -1, true, '記録が足りなければ、そう言う');
  eq(ctx.advicePickLines_(a2)[0].indexOf('まだありません') !== -1, true, 'オススメも同じ');

  // 年をまたぐ
  const a3 = ctx.buildMonthlyAdvice_({}, {}, mkFt([]), ADV_DT, ADV_HRS, new D(2026, 11, 15));
  eq(a3.nextMonth, 1, '12/15までなら1月の予想（年をまたいでも落ちない）');
}

console.log('\n■ 割合で幅を分ける（スプシの帯）');
eq(ctx.dbSplit_(26, [17, 11, 72]).reduce((a,b)=>a+b,0), 26, '足すと必ず全体の幅になる');
eq(ctx.dbSplit_(26, [0, 3, 97])[0], 0, '0%のぶんは幅を取らない');
eq(ctx.dbSplit_(26, [0, 3, 97])[1] >= 1, true, '少しでもあれば1列は確保する');
eq(ctx.dbSplit_(26, [100, 0, 0]), [26, 0, 0], '100%なら全部');
eq(ctx.dbSplit_(26, [0, 0, 0]), [26, 0, 0], '全部0でも幅が消えない');

console.log('\n■ 帯・ロング／ミドル／ショートは1行');
{
  const bands = [];
  (function find(n) {
    if (Array.isArray(n)) return n.forEach(find);
    if (!n || typeof n !== 'object') return;
    if (n.type === 'text' && typeof n.text === 'string' && /^(ﾛﾝｸﾞ|ﾐﾄﾞﾙ|ｼｮｰﾄ)\d+件 /.test(n.text)) bands.push(n.text);
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
  })(flex);
  eq(bands.length > 0, true, '金額帯の行がある（' + bands.length + '行）');
  eq(bands.every(t => t.indexOf('\n') === -1), true, 'どれも改行なし＝1行に収まる');
  eq(bands.every(t => t.length <= 40), true, '短い（いちばん長くて ' + Math.max(...bands.map(t=>t.length)) + '文字）');
  eq(bands[0], 'ﾛﾝｸﾞ8件 ￥13,270 待39分 🔥新地4(月)23:51',
     'おすすめの乗り場と、その時刻まで入れて1行に収める');
  eq(J.indexOf('アツい（狙う乗り場）') !== -1, true, '記号の意味は、上の凡例で1回だけ説明する');
  eq(J.indexOf('避ける乗り場') !== -1, true, '  避けるほうも');
  eq(J.indexOf('その乗車の曜日') !== -1, true, '  (月) の意味も');
  eq(J.indexOf('── この絵の読み方 ──') !== -1, true, '  読み方の見出しを付ける');
}

console.log('\n■ アドバイスとオプチャを入れても形がこわれない');
{
  const adv = ctx.buildMonthlyAdvice_(
    { "北他|江坂": { count: 3, sales: 21699, waitSum: 66, waitCount: 3 } },
    { "北他|江坂": { "6|3": { count: 2, sales: 14466, times: ["03:16","03:20"] } } },
    mkFt([["平日",23,{name:"新地4",count:16,avg:10834}]]), ADV_DT, ADV_HRS, new D(2026, 7, 15));

  const opucha = { count: 12, sales: 96000, waitSum: 120, waitCount: 8, kanku: 3,
    spots: { "新地4": {count:5, sales:30000, max:12000, at:"金曜 23:51"},
             "天満":  {count:4, sales:40000, max:20000, at:"土曜 01:10"},
             "ドン2": {count:3, sales:26000, max:15000, at:"木曜 00:20"} }, hours: {} };

  const f2 = ctx.buildReportFlex_({
    periodStr: "7/16(木)～8/15(土)", totalRidesCount: 175,
    tabRidesCount: {"北7":41,"北4":41,"北他":50,"ﾐﾅﾐ":0,"関空":0,"ほか":18},
    DAY_TYPES: DT, areaStats: areaStats, finalTimeline: finalTimeline,
    targetHours: HRS, dashboardUrl: "https://example.com/dash",
    advice: adv, opucha: opucha
  });

  problems = [];
  (function walk(n, path) {
    if (Array.isArray(n)) return n.forEach((x, i) => walk(x, path + '[' + i + ']'));
    if (!n || typeof n !== 'object') return;
    if (n.type === 'box') {
      if (!Array.isArray(n.contents)) problems.push(path + ': box に contents が無い');
      Object.keys(n).forEach(k => { if (BOX_OK.indexOf(k) === -1) problems.push(path + ': box に使えない項目 ' + k); });
    }
    if (n.type === 'text') {
      const hasText = typeof n.text === 'string' && n.text.length > 0;
      const hasSpan = Array.isArray(n.contents) && n.contents.length > 0;
      if (hasText === hasSpan) problems.push(path + ': text は text か contents のどちらか一方');
      Object.keys(n).forEach(k => { if (TXT_OK.indexOf(k) === -1) problems.push(path + ': text に使えない項目 ' + k); });
    }
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') walk(n[k], path + '.' + k); });
  })(f2, 'bubble');
  eq(problems, [], 'Flexの形に問題がない');

  const J2 = JSON.stringify(f2);
  eq(J2.length < 45000, true, 'まだ上限(50KB)に余裕がある（実際 ' + J2.length + 'バイト）');
  eq(J2.indexOf('undefined') === -1 && J2.indexOf('NaN') === -1, true, 'undefined も NaN も無い');

  eq(J2.indexOf('💡 月間戦略アドバイス') !== -1, true, '💡月間戦略アドバイスが入る');
  eq(J2.indexOf('【この期間の振り返り】') !== -1, true, '  ① 振り返り');
  eq(J2.indexOf('【オススメの乗車時間と乗り場】') !== -1, true, '  ② オススメの乗車時間と乗り場');
  eq(J2.indexOf('【9月の戦略予想】') !== -1, true, '  ③ 翌月（9月）の戦略予想');
  eq(J2.indexOf('江坂') !== -1, true, '  振り返りの中身も入っている');

  eq(J2.indexOf('📣 オプチャ情報') !== -1, true, 'オプチャの箱が入る');
  eq(J2.indexOf('自社の平均には混ぜていません') !== -1, true, '  自社の数字と混ざらないと明記する');
  eq(J2.indexOf('12件 ／ 平均￥8,000 ／ 平均待ち15分 ／ うち関空 3件') !== -1, true, '  件数・平均・待ち・関空の数');
  // 行は span に分かれているので、つなぎ直してから見る
  const opuRows = [];
  (function find(n) {
    if (Array.isArray(n)) return n.forEach(find);
    if (!n || typeof n !== 'object') return;
    if (n.type === 'text' && Array.isArray(n.contents) && n.contents[0] && n.contents[0].type === 'span') {
      opuRows.push(n.contents.map(x => x.text).join(''));
    }
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
  })(f2);
  eq(opuRows.indexOf('[金曜 23:51] 新地4 （5件／平均￥6,000／最高￥12,000）') !== -1, true,
     '  よく出ている乗り場が、件数の多い順に時刻つきで並ぶ');
  eq(opuRows.filter(t => /^\[[月火水木金土日]曜/.test(t)).length, 3, '  3か所ぶん出ている');

  // オプチャが0件のときは、箱ごと出さない
  const f3 = ctx.buildReportFlex_({
    periodStr: "x", totalRidesCount: 1, tabRidesCount: {"北7":0,"北4":0,"北他":0,"ﾐﾅﾐ":0,"関空":0,"ほか":1},
    DAY_TYPES: DT, areaStats: areaStats, finalTimeline: finalTimeline,
    targetHours: HRS, dashboardUrl: "https://example.com/d", advice: adv, opucha: { count: 0 }
  });
  eq(JSON.stringify(f3).indexOf('オプチャ情報') === -1, true, 'オプチャが0件なら、その箱は出さない');
}

console.log('\n■ 大事なところだけ太字にする');
{
  const a = ctx.buildMonthlyAdvice_(
    { "北他|江坂": { count: 3, sales: 21699, waitSum: 66, waitCount: 3 } },
    { "北他|江坂": { "6|3": { count: 2, sales: 14466, times: ["03:16","03:20"] } } },
    mkFt([["平日",23,{name:"新地4",count:16,avg:10834}]]), ADV_DT, ADV_HRS, new D(2026, 7, 15));

  const bold = p => p.filter(x => x.b).map(x => x.t);
  eq(bold(ctx.adviceReviewParts_(a)), ['「江坂」', '￥7,233', '22分', '￥19,726', '土曜 03:16、土曜 03:20'],
     '振り返りは 乗り場・金額・待ち時間だけ太字');
  eq(bold(ctx.advicePickParts_(a)[0]), ['土曜 03時台', '江坂', '￥7,233', '03:16、03:20'],
     'オススメは 時間帯・乗り場・金額・時刻だけ太字');
  eq(bold(ctx.adviceForecastParts_(a)), ['その時間帯だけ粘るのが無難です'],
     '予想は「結論」だけ太字（全部太字だと、どこが大事か分からない）');

  // 文字に戻したものが、太字なしの文と同じであること
  eq(ctx.advicePlain_(ctx.adviceReviewParts_(a)), ctx.adviceReviewText_(a),
     '太字をはずすと、今までの文とぴったり同じ');
  eq(ctx.advicePlain_(ctx.adviceForecastParts_(a)), ctx.adviceForecastText_(a), '  予想も同じ');

  // LINEの絵の span になるか
  const sp = ctx.adviceSpans_(ctx.adviceReviewParts_(a), "#333333");
  eq(sp.every(x => x.type === 'span' && typeof x.text === 'string'), true, 'LINEの span にできる');
  eq(sp.filter(x => x.weight === 'bold').length, 5, '  太字の数も合う');
  eq(sp.every(x => /^#[0-9a-f]{6}$/.test(x.color)), true, '  色がすべて入っている（既定の色も必ず付く）');

  // 記録が無いときでも落ちない
  const a0 = ctx.buildMonthlyAdvice_({}, {}, mkFt([]), ADV_DT, ADV_HRS, new D(2026, 0, 20));
  eq(ctx.adviceReviewParts_(a0).length >= 1, true, '記録ゼロでも行が作れる');
  eq(ctx.advicePickParts_(a0).length, 1, '  オススメも1行だけ出す');
  eq(ctx.adviceSpans_(ctx.advicePickParts_(a0)[0]).length >= 1, true, '  span にもできる');
}

console.log('\n■ 白い背景で見づらい色を使わない');
{
  // 明るさ（輝度）が高すぎる色は、白地だと線が見えない
  const lum = h => { const r=parseInt(h.slice(1,3),16), g=parseInt(h.slice(3,5),16), b=parseInt(h.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b) / 255; };
  const G = vm.runInContext('GRAPH_COLORS', ctx);
  eq(G.length >= 8, true, 'グラフの色が8色以上ある（' + G.length + '色）');
  eq(G.every(c => /^#[0-9a-f]{6}$/i.test(c)), true, 'すべて正しい色の書き方');
  const bright = G.filter(c => lum(c) > 0.55);
  eq(bright, [], '白地で沈む明るい色が無い' + (bright.length ? '（' + bright.join(',') + '）' : ''));
  eq(new Set(G).size, G.length, '同じ色が2つ入っていない');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
