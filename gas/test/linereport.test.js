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
const ok2 = (cond, msg) => { if (!cond) { fail++; console.log('FAIL', msg); } };
const has = (got, want, msg) => eq(String(got).indexOf(want) !== -1, true, msg);
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

eq(ctx.generateAIText(5000, 1, 0, []), 'データ不足（2件以上で表示）。', '1件だけならAIを呼ばない（言い方は全部そろえる）');
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
  eq(f({name:'新地7', avgSales:5000, count:4, waitAvg:30, times:[]}).indexOf('長居せず次へ') !== -1, true,
     '待った時間のわりに安ければ、そう言う');
  eq(f({name:'天満', avgSales:9000, count:1, waitAvg:0, times:[]}).indexOf('件数が少なく') !== -1, true,
     '1件だけなら判断を保留する');
  // ★「1時間待ち続けたら」という書き方はしない。
  //   繁華街でもないかぎり、1時間ただ待ち続ける走り方はしないため。
  //   ありえない前提の数字は、もっともらしく見えるぶん判断をゆがめる
  eq(f({name:'天満', avgSales:6000, count:4, waitAvg:12, times:['01:10']}).indexOf('待ち平均12分') !== -1, true,
     '待ちの長さは、記録にある事実だけを書く');
  eq(f({name:'天満', avgSales:6000, count:4, waitAvg:12, times:['01:10']}).indexOf('1時間待ち') === -1, true,
     '★「1時間待ち続けたら」とは、どこにも書かない');
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

const flexList = ctx.buildReportFlex_({
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
const flex = flexList[0];

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
      // ★中身が空の span は LINE が受け付けない（400 invalid で1通も届かない）
      else if (sp.text.length === 0) problems.push(path + '.contents[' + i + ']: span の text が空');
    });
    Object.keys(n).forEach(k => { if (TXT_OK.indexOf(k) === -1) problems.push(path + ': text に使えない項目 ' + k); });
  }
  if (/(^|\D)(size|flex)$/.test('') ) {}
  if (n.flex !== undefined && (typeof n.flex !== 'number' || n.flex < 0)) problems.push(path + ': flex が数字でない');
  Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') walk(n[k], path + '.' + k); });
})(flex, 'bubble');
eq(problems, [], 'Flexの形に問題がない');

// ★1つ目だけでなく、送る全部のふきだしを見る。
//   前は1つ目しか見ておらず、2つ目に空の span が入って
//   「messages[1] is invalid」で1通も届かない事故を見逃した
problems = [];
flexList.forEach((b, i) => {
  (function walk2(n, path) {
    if (Array.isArray(n)) return n.forEach((x, j) => walk2(x, path + '[' + j + ']'));
    if (!n || typeof n !== 'object') return;
    if (n.type === 'span' && String(n.text || '') === '') problems.push(path + ': span の text が空');
    if (n.type === 'text' && !n.contents && String(n.text || '') === '') problems.push(path + ': text が空');
    if (n.type === 'box' && (!Array.isArray(n.contents) || !n.contents.length)) problems.push(path + ': box が空');
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') walk2(n[k], path + '.' + k); });
  })(b, 'messages[' + i + ']');
});
eq(problems, [], '送る全部のふきだしに、空の文字・空の箱が無い');

eq(flex.type, 'bubble', 'bubble で作る');
eq(flex.size, 'giga', '横いっぱい（giga）');
// スプシへ移動するボタンは、いちばん最後のふきだしに付ける
eq(flexList[flexList.length - 1].footer.contents[0].action.uri, 'https://example.com/dash',
   'ボタンはダッシュボードへ飛ぶ');

const J = JSON.stringify(flexList);
eq(flexList.every(b => ctx.lrBytes_(JSON.stringify(b)) <= 10000), true,
   'どのふきだしもLINEの上限(10,000バイト)に収まる（実際 ' +
   flexList.map(b => ctx.lrBytes_(JSON.stringify(b))).join('・') + 'バイト）');
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
  })(flexList);
  eq(bars.length >= 3, true, '帯が曜日区分ごとにある（' + bars.length + '本）');

  const b0 = bars[0];   // 平日・北：ﾛﾝｸﾞ17 ﾐﾄﾞﾙ11 ｼｮｰﾄ72
  eq(b0.contents.length, 3, '3色に分かれている');
  eq(b0.contents.map(c => c.flex), [17, 11, 72], '幅は割合どおり');
  eq(b0.contents[2].contents[0].text, 'ｼｮｰﾄ72%', '広い帯には「ｼｮｰﾄ72%」まで入れる');
  eq(b0.contents[0].contents[0].text, '17%', 'ふつうの帯には「17%」だけ入れる');
  eq(b0.contents[0].contents[0].color, '#ffffff', '帯の上なので白文字');
  eq(b0.contents[0].contents[0].align, 'center', '帯の真ん中にそろえる（前は左詰めだった）');
  eq(b0.contents[0].justifyContent, 'center', '上下の真ん中にもそろえる');

  // 細い帯にも、半角2桁が入る幅を確保して数字を入れる
  const thin = bars.map(b => b.contents.filter(c => c.contents.length &&
      /^\d+$/.test(String(c.contents[0].text)))).filter(x => x.length)[0];
  eq(!!thin, true, '細い帯にも数字だけ入れる');
  eq(thin[0].flex >= 7, true, '  半角2桁が入るよう、見た目の幅に下限を付ける（flex ' + thin[0].flex + '）');
  eq(J.indexOf('細い帯：') === -1, true, '  「細い帯：」の添え書きは、もう要らない');
}

console.log('\n■ アツい×避ける【時間詳細】');
eq(J.indexOf('【時間詳細】') !== -1, true, '見出しが【時間詳細】になっている');
{
  const texts = [];
  (function find(n) {
    if (Array.isArray(n)) return n.forEach(find);
    if (!n || typeof n !== 'object') return;
    if (n.type === 'text' && Array.isArray(n.contents) && n.contents[0] && n.contents[0].type === 'span') {
      // ★1つの text に、行を改行でまとめて入れている（中身を太らせないため）。
      //   ここでは行ごとに分けて見る
      n.contents.map(s => s.text).join('').split('\n').forEach(function (t) {
        if (/^\[\d\d:\d\d\]/.test(t)) texts.push(t);   // 時間詳細の行だけ（凡例は除く）
      });
    }
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
  })(flexList);

  eq(texts[0], '[20:40] ⭕️ﾄﾞﾝ2 （2件／平均￥2,950／最高￥3,600）',
     '頭に「行くならこの時刻」、うしろに件数・平均・最高');
  eq(texts[1], '[23:51] ⭕️新地4 （15件／平均￥6,758／最高￥18,960）', '時間帯の順に並ぶ');
  eq(texts[2], '[23:20] ❎新地7 （2件／平均￥2,050）', '避けるほうに「最高」は出さない（行かないので）');
  eq(texts[3], '[03:48] ⭕️天満 （6件／平均￥4,827／最高￥8,860）', '日祝ぶんも出る');
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
                   "6|1":  { count: 3, sales: 30465, times: ["01:22","01:40","01:53"] } },
    "北他|江坂": { "6|3":  { count: 3, sales: 21699, times: ["03:16","03:20","03:40"] },
                   "5|1":  { count: 1, sales: 7233,  times: ["01:33"] } },
    // 2件だけ＝まぐれ。平均はいちばん高いが「狙い目」とは言わない
    "ﾐﾅﾐ|大丸":  { "4|0":  { count: 2, sales: 40000, times: ["00:10","00:20"] } }
  };
  const ft = mkFt([["平日",23,{name:"新地4",count:16,avg:10834}],
                   ["金曜",1, {name:"天満", count:4, avg:10425}],
                   ["土曜",1, {name:"新地4",count:5, avg:10155}],
                   ["日祝",3, {name:"天満", count:6, avg:4827}],
                   // 2件しかない時間帯は、数にも入れない
                   ["日祝",1, {name:"ｺﾅﾝ像", count:2, avg:30000}]]);
  const a = ctx.buildMonthlyAdvice_(spotStats, spotHotData, ft, ADV_DT, ADV_HRS, new D(2026, 7, 15));

  eq(a.best.name, '江坂', '振り返りは「平均がいちばん高い」乗り場（件数の多さではない）');
  eq(a.best.count, 3, '3件以上がある乗り場から選ぶ');
  eq(a.best.perHour, 19726, '待ち1時間あたりいくらかも出す（7,233÷22分×60）');
  eq(ctx.adviceReviewText_(a).indexOf('江坂') !== -1, true, '振り返りの文に乗り場名が入る');
  eq(ctx.adviceReviewText_(a).indexOf('実際の乗車：土曜 03:16') !== -1, true, '実際の乗車時刻も出す');

  eq(a.picks.length, 3, 'オススメは3つ');
  eq(a.picks[0].name, '新地4', '平均単価が高い順');
  eq(a.picks.every(p => p.count >= 3), true,
     '★3件に満たない組み合わせは「狙い目」と言わない（まぐれを載せない）');
  eq(a.picks.some(p => p.name === '大丸'), false,
     '  2件しかない大丸は、平均がいちばん高くても出さない');
  eq(ctx.advicePickLines_(a)[0].indexOf('木曜 23時台 の 新地4') !== -1, true, '曜日・時間帯・乗り場の順で書く');
  eq(ctx.advicePickLines_(a)[0].indexOf('23:44') !== -1, true, '実際の時刻も添える');

  eq(a.nextMonth, 9, '8/15までの期間なら、予想するのは9月');
  eq(a.bigSlots, 3, '平均￥10,000超えの時間帯を数える');
  eq(a.allSlots, 4, '数えるのは3件以上ある時間帯だけ（2件の ｺﾅﾝ像 は入れない）');
  eq(ctx.adviceForecastText_(a).indexOf('通り') !== -1, true,
     '「8個中」ではなく「〇通り」と、何を数えたかが分かる書き方にする');
  eq(ctx.adviceForecastText_(a).indexOf('曜日区分×時間帯の組み合わせ') !== -1, true,
     '  何の組み合わせかも書く');
  eq(ctx.adviceForecastText_(a).indexOf('その時間帯で粘って1本の単価を上げる') !== -1, true,
     '10,000超えが3個以上なら、粘って単価を上げるほうをすすめる');
  /*
   * ★季節の話は「次に走る期間に、いちばん多くかかっている月」のものにする。
   *   8/15までの集計なら、次に走るのは 8/16〜9/15。
   *   8月が16日ぶん、9月が15日ぶんなので、8月の話を出す
   */
  eq(a.nextLabel, '8月16日〜9月15日', '★次に走る期間そのものを持つ');
  eq(ctx.adviceForecastTitle_(a), '【8月16日〜9月15日の戦略予想】', '★見出しも、その期間で書く');
  eq(a.nextPlanMonth, 8, '  季節の話は、日数のいちばん多い月（8月）で選ぶ');
  eq(ctx.adviceForecastText_(a).indexOf('お盆') !== -1, true, '  8月なら8月らしい話をする');
}

console.log('\n■ 句読点のところで改行する／▼の前に区切り線');
{
  const WJ = ctx.lrWrapJa_;

  /*
   * ★スプシはマスの幅で勝手に折り返す。そのままだと言葉のまん中で切れて、
   *   読むほうが一度つまずく。こちらで先に、句読点で改行しておく
   */
  const t1 = WJ('新地4は待ちが長いので、早めに入ってください。23時台がいちばん強いです。', 20);
  const ls = t1.split('\n');
  eq(ls.length >= 2, true, '★長い文は、こちらで改行する（' + ls.length + '行）');
  eq(ls.slice(0, -1).every(x => /[。、！？]$/.test(x)), true,
     '★切れ目は、かならず句読点のうしろ');
  eq(t1.replace(/\n/g, ''), '新地4は待ちが長いので、早めに入ってください。23時台がいちばん強いです。',
     '★言葉は1文字も足さない・減らさない');

  /*
   * ★句読点が1つも無い長い文は、こちらでは切らない。
   *   切れば、かならず言葉のまん中で切れてしまう。
   *   それをやめるための仕掛けなので、ここで切っては本末転倒。
   *   はみ出したぶんは、スプシがそのマスの中で折り返す
   *   （行の高さも、折り返したぶんを数えて決めている）
   */
  const t2 = WJ('あ'.repeat(60), 20);
  eq(t2.indexOf('\n'), -1, '★句読点が無い長い文は、こちらでは切らない（まん中で切れるため）');
  eq(t2.length, 60, '  言葉は1文字も減らさない');

  eq(WJ('みじかい文。', 40), 'みじかい文。', '短い文は、そのまま');
  eq(WJ('', 20), '', '空でも落ちない');
  eq(WJ(null, 20), '', 'null でも落ちない');
  eq(WJ('あいう', 0).replace(/\n/g, ''), 'あいう', '幅が変でも、言葉は残る');

  // マスの幅から、1行に入る量を出す
  const FC = ctx.lrFitChars_;
  eq(FC(15, 11) > FC(8, 11), true, '★らんが広いほど、1行に多く入る');
  eq(FC(1, 11) >= 8, true, '  どんなに狭くても、8つぶんは見込む（0で割らないため）');

  /*
   * ★戦略予想は、▼の前に区切り線を入れる。
   *   ▼が3つ4つ並ぶと、どこで話が変わったのか分からない
   */
  const a2 = ctx.buildMonthlyAdvice_({}, {}, mkFt([["平日",23,{name:"新地4",count:5,avg:12000}]]),
                                     ADV_DT, ADV_HRS, new D(2026, 8, 15));
  const plain = ctx.advicePlain_(ctx.adviceForecastParts_(a2));
  const heads = (plain.match(/▼/g) || []).length;
  const hrs = plain.split('\n').filter(x => /^─+$/.test(x)).length;
  eq(heads >= 2, true, '見出しが2つ以上ある（' + heads + 'つ）');
  eq(hrs, heads - 1, '★区切り線は、2つめ以降の▼の前に入る（' + hrs + '本）');
  eq(plain.indexOf('────') !== 0, true, '★いちばん上には、線を出さない（先頭に線だけあると不格好）');
  // 線のすぐ次の行が ▼ であること
  plain.split('\n').forEach(function (ln, i, arr) {
    if (/^────/.test(ln)) {
      ok2(String(arr[i + 1] || '').indexOf('▼') === 0, '  線のすぐ下は、必ず ▼');
    }
  });
}

console.log('\n■ アツいエリアの1行（記号も［］の中・言葉は必ず入れる）');
{
  const B = ctx.lrBand_, W = ctx.lrWidth_;

  const a = B('ﾛﾝｸﾞ', 8, 13270, 39, '⭕️', 'アツい', '新地4', '(月)23:51');
  eq(a, 'ﾛﾝｸﾞ8件 平均￥13,270 待39分 [⭕️アツい 新地4 (月)23:51]',
     '★［⭕️アツい 乗り場 時刻］を1つの［］で閉じる');
  eq(a.indexOf('⭕️[') === -1, true, '★記号が［］の外に出ていない');
  eq(/件 平均￥/.test(a), true, '  金額には必ず「平均」と書く');

  const b = B('ｼｮｰﾄ', 3, 1200, 5, '❎', '避ける', 'ｺﾅﾝ像', '(日)02:10');
  eq(b.indexOf('[❎避ける') !== -1, true, '★避けるほうも、同じ形');

  /*
   * ★乗り場の名前が長くても、「アツい」「避ける」は必ず入れる。
   *   言葉が入っている行と入っていない行が混ざると、
   *   「言葉が無い行は何なのか」が分からなくなる
   */
  const longName = 'ながいながいながいながいながい乗り場の名前';
  const c = B('ﾐﾄﾞﾙ', 12, 8800, 21, '⭕️', 'アツい', longName, '(火)22:05');
  eq(c.indexOf('アツい') !== -1, true, '★名前が長くても「アツい」は必ず入れる');
  const MAXW = vm.runInContext('LR_BAND_MAX', ctx);
  eq(W(c) <= MAXW, true, '★それでも1行に収まる（' + W(c) + ' ≦ ' + MAXW + '）');
  eq(c.indexOf('…') !== -1, true, '★入りきらないぶんは、名前のほうを短くする');
  eq(c.indexOf('(火)22:05') !== -1, true, '  時刻は削らない（いつ行くかが分からなくなるため）');
  eq(c.indexOf(']') === c.length - 1, true, '  ］でちゃんと閉じる');

  // 乗り場が決まらないときは、［］ごと出さない
  const d = B('ｼｮｰﾄ', 2, 900, 0, '❎', '避ける', '-', '');
  eq(d.indexOf('[') === -1, true, '乗り場が無いときは、［］を出さない');
  eq(d, 'ｼｮｰﾄ2件 平均￥900 待0分', '  件数と金額だけ出す');

  eq(typeof B('ﾛﾝｸﾞ', 0, 0, 0, '⭕️', 'アツい', null, null), 'string', 'null でも落ちない');
  eq(W(''), 0, '幅の数え方：空は0');
  eq(W('あい'), 4, '  全角は2つぶん');
  eq(W('ab'), 2, '  半角は1つぶん');
  eq(W(null), 0, '  null でも落ちない');
}

console.log('\n■ むずかしい言い方を、ふつうの言葉にする');
{
  /*
   * ★「軸は」「区切りが、動くときです」は、ふだん使わない言い方だった（まーくさんのご指示）。
   *   読む人が分からない言葉で書いても、伝わらなければ意味がない
   */
  const segs = [
    { from: 20, to: 22, name: '新地4', avg: 12000, count: 11, thin: false },
    { from: 23, to: 0, name: '梅田', avg: 9000, count: 7, thin: false }
  ];
  const h = ctx.nightHeadline_(segs);
  eq(h.indexOf('軸は') === -1, true, '★「軸は」とは、もう書かない');
  eq(h.indexOf('いちばん稼げているのは') !== -1, true, '★「いちばん稼げているのは」と書く');
  eq(h.indexOf('新地4') !== -1, true, '  乗り場の名前は、これまでどおり出す');
  eq(h.indexOf('そのあと') !== -1, true, '  次に移るところも、これまでどおり出す');
}

console.log('\n■ 戦略予想は「次の16日〜翌月15日」の話にする');
{
  /*
   * ★まーくさんのご指示。
   *   9/15までの集計の次に走るのは 9/16〜10/15。
   *   前はここで「10月の予想」と書いていて、ハロウィン（10/31）の話が出ていた。
   *   その日は、次に走る期間には1日も入っていない
   */
  const a9 = ctx.buildMonthlyAdvice_({}, {}, mkFt([["平日",23,{name:"新地4",count:5,avg:12000}]]),
                                     ADV_DT, ADV_HRS, new D(2026, 8, 15));   // 2026/09/15
  eq(a9.nextLabel, '9月16日〜10月15日', '★次に走る期間は 9月16日〜10月15日');
  eq(ctx.adviceForecastTitle_(a9), '【9月16日〜10月15日の戦略予想】', '★見出しも、その期間');
  eq(a9.nextPlanMonth, 9, '★日数が同じなら、先の月（9月）の話にする');
  eq(ctx.adviceForecastText_(a9).indexOf('ハロウィン') === -1, true,
     '★ハロウィンの話は出さない（10/31は、この期間に1日も入っていないため）');
  eq(ctx.adviceForecastText_(a9).indexOf('残暑') !== -1, true, '  代わりに9月の話をする');

  // 期間が分からないときは、これまでどおりの見出しに戻す（見出しが消えるよりまし）
  eq(ctx.adviceForecastTitle_({ nextMonth: 12 }), '【12月の戦略予想】',
     '期間が分からなければ、これまでどおり「〇月の戦略予想」');
  eq(typeof ctx.adviceForecastTitle_({}), 'string', '空でも落ちない');
  eq(typeof ctx.adviceForecastTitle_(null), 'string', 'null でも落ちない');

  // 何日ぶんかの数え方そのもの
  eq(ctx.nextPlanMonth_(new D(2026, 8, 16), new D(2026, 9, 15)), 9, '9/16〜10/15 は 9月（同数なら先）');
  eq(ctx.nextPlanMonth_(new D(2026, 7, 16), new D(2026, 8, 15)), 8, '8/16〜9/15 は 8月（16日ぶん）');
  eq(ctx.nextPlanMonth_(new D(2026, 11, 1), new D(2026, 11, 31)), 12, '12/1〜12/31 は 12月');
  eq(ctx.nextPlanMonth_(null, null), 0, '空でも落ちない');
}
{
  // 10,000超えが無いときは、逆のことを言う
  const a2 = ctx.buildMonthlyAdvice_({}, {}, mkFt([["平日",23,{name:"新地4",count:5,avg:4000}]]),
                                     ADV_DT, ADV_HRS, new D(2026, 10, 30));
  eq(a2.bigSlots, 0, '10,000超えなし');
  eq(ctx.adviceForecastText_(a2).indexOf('短い乗車でも数を積む') !== -1, true, 'そのときは数を積むほうをすすめる');
  eq(a2.nextMonth, 12, '11/30までなら12月の予想');
  eq(ctx.adviceForecastText_(a2).indexOf('最需要期') !== -1, true, '12月は最需要期と言う');
  // 言い方は「データ不足（〇件以上で表示）」のひとつだけに統一してある
  eq(ctx.adviceReviewText_(a2).indexOf('データ不足（3件以上で表示）') !== -1, true, '記録が足りなければ、そう言う');
  eq(ctx.advicePickLines_(a2)[0].indexOf('データ不足（2件以上で表示）') !== -1, true, 'オススメも同じ言い方');

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
    // 3行は1つの text にまとめてあるので、span をばらして1行ずつ見る
    if (n.type === 'text' && Array.isArray(n.contents)) {
      n.contents.forEach(sp => String(sp.text || '').split('\n').forEach(t => {
        if (/^(ﾛﾝｸﾞ|ﾐﾄﾞﾙ|ｼｮｰﾄ)\d+件 /.test(t)) bands.push(t);
      }));
    }
    if (n.type === 'text' && typeof n.text === 'string' && /^(ﾛﾝｸﾞ|ﾐﾄﾞﾙ|ｼｮｰﾄ)\d+件 /.test(n.text)) bands.push(n.text);
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
  })(flexList);
  eq(bands.length > 0, true, '金額帯の行がある（' + bands.length + '行）');
  eq(bands.every(t => t.indexOf('\n') === -1), true, 'どれも改行なし＝1行に収まる');
  eq(bands.every(t => t.length <= 45), true, '短い（いちばん長くて ' + Math.max(...bands.map(t=>t.length)) + '文字）');
  eq(bands[0], 'ﾛﾝｸﾞ8件 平均￥13,270 待39分 [⭕️アツい 新地4 (月)23:51]',
     '★［⭕️アツい 乗り場 時刻］を1つの［］で閉じる（記号も［］の中）');
  eq(bands.every(t => /件 平均￥/.test(t)), true,
     '★金額には必ず「平均」と書く（最高額と取りちがえないように）');
  // ★［］が2つに割れていると、どこまでが1つの話なのか読めない。
  //   「アツい」から時刻までで1組。ここが割れていたら必ず落とす
  eq(bands.every(t => (t.match(/\[/g) || []).length === (t.match(/\]/g) || []).length),
     true, '［と］の数が合っている');
  eq(bands.every(t => (t.match(/\[/g) || []).length <= 1),
     true, '1行に［］は1組だけ（アツい・避ける〜時刻をまとめて閉じる）');
  /*
   * ★記号（⭕️❎）も［］の中に入れる（まーくさんのご指示）。
   *   ひとまとまりの話なのに、記号だけ外にあると
   *   どこからが1つの話なのか、目で切れてしまう
   */
  eq(bands.filter(t => t.indexOf('[') !== -1).every(t => /\[(⭕️|❎)/.test(t)),
     true, '★記号は［］の中に入っている');
  eq(bands.every(t => !/(⭕️|❎)\[/.test(t)),
     true, '★記号が［］の外に出ている行は、1つも無い');
  /*
   * ★「アツい」「避ける」は、乗り場の名前が長くても必ず入れる。
   *   言葉が入っている行と入っていない行が混ざると、
   *   「言葉が無い行は何なのか」が分からなくなる
   */
  eq(bands.filter(t => t.indexOf('[') !== -1)
          .every(t => /\[(⭕️アツい|❎避ける)/.test(t)),
     true, '★どの行にも「アツい」か「避ける」が入っている');
  {
    const w = t => { let n = 0; for (let i = 0; i < t.length; i++) n += t.charCodeAt(i) < 0x100 ? 1 : 2; return n; };
    eq(bands.every(t => w(t) <= 62), true,
       'どの行も1行に収まる幅（いちばん長くて ' + Math.max(...bands.map(w)) + '）');
  }
  /*
   * ★「この絵の読み方」の箱は、まるごと外した（まーくさんのご指示）。
   *   毎月おなじ説明が、いちばん上のいちばん目立つところを占めていて、
   *   肝心の中身にたどり着くのが遅くなっていた
   */
  eq(J.indexOf('この絵の読み方') === -1, true, '★「この絵の読み方」の箱は、もう入れない');
  eq(J.indexOf('⭕️ 狙う　／　❎ 避ける') === -1, true, '  記号の説明も入れない');
  eq(J.indexOf('(月) その曜日') === -1, true, '  曜日の説明も入れない');
  eq(J.indexOf('1回あたりの売上（合計ではありません）') === -1, true, '  平均の説明も入れない');
  eq(J.indexOf('その時間帯でいちばん高かった乗車の時刻です') === -1, true,
     '  「一晩の流し方」でも、同じ説明をくり返さない');
}

console.log('\n■ アドバイスとオプチャを入れても形がこわれない');
{
  const adv = ctx.buildMonthlyAdvice_(
    { "北他|江坂": { count: 3, sales: 21699, waitSum: 66, waitCount: 3 } },
    { "北他|江坂": { "6|3": { count: 3, sales: 21699, times: ["03:16","03:20","03:40"] } } },
    mkFt([["平日",23,{name:"新地4",count:16,avg:10834}]]), ADV_DT, ADV_HRS, new D(2026, 7, 15));

  const opucha = { count: 12, sales: 96000, waitSum: 120, waitCount: 8, kanku: 3,
    spots: { "新地4": {count:5, sales:30000, max:12000, at:"金曜 23:51"},
             "天満":  {count:4, sales:40000, max:20000, at:"土曜 01:10"},
             "ドン2": {count:3, sales:26000, max:15000, at:"木曜 00:20"} }, hours: {} };

  const f2list = ctx.buildReportFlex_({
    periodStr: "7/16(木)～8/15(土)", totalRidesCount: 175,
    tabRidesCount: {"北7":41,"北4":41,"北他":50,"ﾐﾅﾐ":0,"関空":0,"ほか":18},
    DAY_TYPES: DT, areaStats: areaStats, finalTimeline: finalTimeline,
    targetHours: HRS, dashboardUrl: "https://example.com/dash",
    advice: adv, opucha: opucha
  });
  const f2 = { type: "carousel", contents: f2list };   // 全部まとめて形を見る

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
  eq(f2list.every(b => ctx.lrBytes_(JSON.stringify(b)) <= 10000), true,
     'どのふきだしも上限(10,000バイト)に収まる（実際 ' +
     f2list.map(b => ctx.lrBytes_(JSON.stringify(b))).join('・') + 'バイト）');
  eq(J2.indexOf('undefined') === -1 && J2.indexOf('NaN') === -1, true, 'undefined も NaN も無い');

  eq(J2.indexOf('💡 月間戦略アドバイス') !== -1, true, '💡月間戦略アドバイスが入る');
  eq(J2.indexOf('【この期間の振り返り】') !== -1, true, '  ① 振り返り');
  eq(J2.indexOf('【オススメの乗車時間と乗り場】') !== -1, true, '  ② オススメの乗車時間と乗り場');
  /*
   * ★見出しは「次に走る期間」そのものにする（まーくさんのご指示）。
   *   この仕事の区切りは16日〜翌月15日なので、「10月の予想」と書くと
   *   10/16以降（次の期間に1日も入っていない日）の話だと思われる
   */
  eq(J2.indexOf('日の戦略予想】') !== -1, true, '  ③ 戦略予想の見出しは「〇月〇日〜〇月〇日」');
  eq(/【\d+月\d+日〜\d+月\d+日の戦略予想】/.test(J2), true, '  ★期間そのものを見出しに出す');
  eq(J2.indexOf('【9月の戦略予想】') === -1, true, '  ★「〇月の戦略予想」とは、もう書かない');
  // ★「区切りが、動くときです」も、何のことか分からない言い方だった
  eq(J2.indexOf('区切りが、動くときです') === -1, true, '★「区切りが、動くときです」とは書かない');
  eq(J2.indexOf('次の乗り場へ移るタイミングです') !== -1, true,
     '★「行が変わるところが、次の乗り場へ移るタイミングです」と書く');
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
  eq(opuRows.filter(t => /^\[[月火水木金土日]曜/.test(t)).length >= 1, true, '  よく出ている乗り場が並ぶ');

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
    { "北他|江坂": { "6|3": { count: 3, sales: 21699, times: ["03:16","03:20","03:40"] } } },
    mkFt([["平日",23,{name:"新地4",count:16,avg:10834}]]), ADV_DT, ADV_HRS, new D(2026, 7, 15));

  const bold = p => p.filter(x => x.b).map(x => x.t);
  // ★「1時間待ち続けたら￥19,726」をやめた。
  //   繁華街でもないかぎり、1時間ただ待ち続ける走り方はしないため。
  //   代わりに、待ちの長さを全体平均と見くらべる（どちらも記録にある事実）
  eq(bold(ctx.adviceReviewParts_(a)), ['「江坂」', '￥7,233', '22分', '22分', '22分', '土曜 03:16、土曜 03:20、土曜 03:40'],
     '振り返りは 乗り場・金額・待ちの長さだけ太字');
  eq(ctx.advicePlain_(ctx.adviceReviewParts_(a)).indexOf('1時間待ち') === -1, true,
     '★「1時間待ち続けたら」とは、どこにも書かない');
  eq(bold(ctx.advicePickParts_(a)[0]), ['土曜 03時台', '江坂', '￥7,233', '03:16、03:20、03:40'],
     'オススメは 時間帯・乗り場・金額・時刻だけ太字');
  eq(bold(ctx.adviceForecastParts_(a)), ['江坂', '￥7,233', '平日の23時台', '新地4', '1通り', '1通り', 'ふだんは数をこなし、その時間帯だけ粘る'],
     '予想は 強かった枠・件数・結論 だけ太字（全部太字だと、どこが大事か分からない）');
  // ★「こういう月」と「狙いどころ」は1つにまとめた。
  //   月の説明だけ読まされても、で、どこへ行けばよいのかが分からない
  /*
   * ★見出しの月は、季節の話を選んだ月にそろえる。
   *   8/15までの集計なら、次に走るのは 8/16〜9/15。
   *   8月が16日ぶん・9月が15日ぶんなので、話すのは8月
   */
  eq(ctx.advicePlain_(ctx.adviceForecastParts_(a)).indexOf('▼ 8月はこういう月　→　どこを狙うか') !== -1, true,
     '  来月の話は「こういう月 → だからどこを狙うか」を1つの見出しで出す');
  eq(ctx.advicePlain_(ctx.adviceForecastParts_(a)).indexOf('▼ 9月はこういう月') === -1, true,
     '  ★季節の話の月と、見出しの月が食いちがわない');
  eq(ctx.advicePlain_(ctx.adviceForecastParts_(a)).indexOf('【狙う】') !== -1, true,
     '  必ず「で、どこを狙うか」まで書く');
  eq((ctx.advicePlain_(ctx.adviceForecastParts_(a)).match(/月の狙いどころ/g) || []).length, 0,
     '  見出しを2つに分けない');
  eq(ctx.advicePlain_(ctx.adviceForecastParts_(a)).indexOf('▼ この期間の記録から') !== -1, true,
     '  そのあとに、この期間の数字');
  eq(ctx.advicePlain_(ctx.adviceForecastParts_(a)).indexOf('▼ おすすめの動き方') !== -1, true,
     '  最後に、どう動くか');

  // 文字に戻したものが、太字なしの文と同じであること
  eq(ctx.advicePlain_(ctx.adviceReviewParts_(a)), ctx.adviceReviewText_(a),
     '太字をはずすと、今までの文とぴったり同じ');
  eq(ctx.advicePlain_(ctx.adviceForecastParts_(a)), ctx.adviceForecastText_(a), '  予想も同じ');

  // LINEの絵の span になるか
  const sp = ctx.adviceSpans_(ctx.adviceReviewParts_(a), "#333333");
  eq(sp.every(x => x.type === 'span' && typeof x.text === 'string'), true, 'LINEの span にできる');
  eq(sp.filter(x => x.weight === 'bold').length, 6, '  太字の数も合う');
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

/* ============ 大きくなっても必ず送れるか ============ */
console.log('\n■ 中身が増えても、LINEの上限で落ちない');
{
  // 実際に「Too large flex message」で落ちたときと同じくらいの量を作る
  const bigArea = {};
  ADV_DT.forEach(d => {
    bigArea[d] = {};
    ["北", "ﾐﾅﾐ", "ほか"].forEach(a => {
      bigArea[d][a] = { l:8, m:5, s:33, t:46, sales:217534, lSum:106160, mSum:36980, sSum:74394,
        waitSum:1242, waitCount:46, lWait:312, lWaitC:8, mWait:125, mWaitC:5, sWait:805, sWaitC:33,
        spots: { "ガチマネプラ乗り場": { l:2, m:1, s:20, lSum:25924, mSum:7330, sSum:43000,
          lTimes:{"(月) 23:51":1}, mTimes:{"(火) 00:10":1}, sTimes:{"(水) 02:30":2} } } };
    });
  });
  // 全曜日区分 × 全時間帯に、アツい／避ける の両方を入れる（いちばん多いとき）
  const bigFt = {};
  ADV_DT.forEach(d => {
    bigFt[d] = {};
    ADV_HRS.forEach(h => {
      bigFt[d][h] = {
        best:  { name:"万博記念公園迎賓館前ロータリー", count:15, avg:6758, max:18960, at:"23:51" },
        worst: { name:"スナックMiya(住之江区東加賀屋)", count:4, avg:1200, max:1500, at:"02:30" } };
    });
  });
  const bigOpu = { count: 120, sales: 960000, waitSum: 1200, waitCount: 80, kanku: 30, spots: {}, hours: {} };
  for (let i = 0; i < 12; i++) {
    bigOpu.spots["オプチャ乗り場" + i + "（長めの名前）"] =
      { count: 12 - i, sales: 90000, max: 20000, at: "金曜 23:5" + (i % 10) };
  }
  const bigAdv = ctx.buildMonthlyAdvice_(
    { "北4|万博記念公園迎賓館前ロータリー": { count: 16, sales: 108000, waitSum: 320, waitCount: 16 } },
    { "北4|万博記念公園迎賓館前ロータリー": { "4|23": { count: 6, sales: 65000,
        times: ["23:44","23:51","23:53","23:55","23:58","23:59"] } } },
    bigFt, ADV_DT, ADV_HRS, new D(2026, 7, 15));

  const big = ctx.buildReportFlex_({
    periodStr: "7/16(木)～8/15(土)", totalRidesCount: 175,
    tabRidesCount: {"北7":41,"北4":41,"北他":50,"ﾐﾅﾐ":12,"関空":3,"ほか":18},
    DAY_TYPES: ADV_DT, areaStats: bigArea, finalTimeline: bigFt,
    targetHours: ADV_HRS, dashboardUrl: "https://example.com/dash",
    advice: bigAdv, opucha: bigOpu,
    getBestTimeStr: function (o) { if (!o) return ""; let mc=0,bt=""; for (const t in o) if (o[t]>mc){mc=o[t];bt=t;} return bt?" ["+bt+"]":""; }
  });

  const sizes = big.map(b => ctx.lrBytes_(JSON.stringify(b)));
  // LINEは1通10KBまで。中身を削るより、通数を増やして全部届ける
  eq(big.length <= 5, true, 'LINEの上限5通を超えない（' + big.length + '通）');
  eq(sizes.every(n => n <= 10000), true,
     'LINEの上限10,000バイトに収まる（実際 ' + sizes.join('・') + '）');
  eq(big[big.length - 1].footer !== undefined, true, 'スプシへのボタンは最後の1通に付く');
  eq(big.slice(0, -1).every(b => b.footer === undefined), true, '  途中には付けない');

  // 削るときも、結論から捨てない
  const all = JSON.stringify(big);
  eq(all.indexOf('省きました') === -1, true, '5通あれば、削らずに全部入る');
  eq(all.indexOf('月間戦略アドバイス') !== -1, true, '月間戦略アドバイスは必ず残る（結論なので）');
  eq(all.indexOf('この期間の振り返り') !== -1, true, '  振り返りも');
  eq(all.indexOf('オススメの乗車時間と乗り場') !== -1, true, '  オススメも');
  eq(all.indexOf('の戦略予想') !== -1, true, '  次の期間の予想も');
  eq(all.indexOf('パーセント・実績') !== -1, true, 'エリア別の成績も残る');
  eq(all.indexOf('オプチャ情報') !== -1, true, 'オプチャの見出しも残る');
  eq(all.indexOf('時間詳細') !== -1, true, '時間詳細の見出しも残る');
  eq(all.indexOf('この絵の読み方') === -1, true, '★読み方の箱は、5通あっても入れない（まるごと外したため）');
}

console.log('\n■ バイト数の数え方（文字数で数えると足りなくなる）');
eq(ctx.lrBytes_('abc'), 3, '半角は1バイト');
eq(ctx.lrBytes_('あいう'), 9, '日本語は1文字3バイト');
eq(ctx.lrBytes_('🔥'), 4, '絵文字は4バイト');
eq(ctx.lrBytes_('ﾛﾝｸﾞ'), 12, '半角カナも1文字3バイト（4文字で12）');
eq(ctx.lrBytes_(''), 0, '空なら0');
eq(ctx.lrBytes_('⭕️アツい') > '⭕️アツい'.length, true, '文字数より必ず大きい（だから文字数で見てはいけない）');

console.log('\n■ 送れなかったときに、理由が日本語で分かる');
{
  const W = (code, body) => ctx.lrPushWhy_(code, body, [{ contents: { a: 1 } }]);
  has(W(400, '{"message":"A message (messages[0]) in the request body is invalid","details":[{"message":"Too large flex message. The maximum size of JSON data"}]}'),
      '大きすぎて', '「大きすぎる」と日本語で言う');
  has(W(401, '{"message":"Authentication failed"}'), 'トークン', '401はトークンの話');
  has(W(401, '{}'), '入れ直して', '  直し方も出す');
  has(W(403, '{}'), '権限', '403は権限の話');
  has(W(404, '{}'), '送信先が見つかりません', '404は送信先の話');
  has(W(429, '{}'), '上限', '429は送信数の上限');
  has(W(500, '{}'), 'LINE側', '500はLINE側の不具合だと分かる');
  has(W(418, '{"message":"なぞのエラー"}'), 'なぞのエラー', '知らないものは、返ってきた文をそのまま出す');
  eq(typeof W(400, 'これはJSONではない'), 'string', 'JSONでない返事でも落ちない');
}

console.log('\n■ グラフの色は、見分けがつくこと');
{
  const G = vm.runInContext('GRAPH_COLORS', ctx);
  const rgb = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
  const lum = h => { const [r,g,b] = rgb(h); return (0.299*r + 0.587*g + 0.114*b) / 255; };
  // 人の目に近い色差（redmean）。数字が小さいほど「似ている」
  const diff = (a, b) => {
    const [r1,g1,b1] = rgb(a), [r2,g2,b2] = rgb(b), rm = (r1+r2)/2;
    return Math.sqrt((2+rm/256)*(r1-r2)**2 + 4*(g1-g2)**2 + (2+(255-rm)/256)*(b1-b2)**2);
  };
  eq(G.length >= 12, true, '12色以上ある（' + G.length + '色）');
  eq(new Set(G).size, G.length, '同じ色が2つ入っていない');
  const bright = G.filter(c => lum(c) > 0.55);
  eq(bright, [], '白地で沈む明るい色が無い');

  let worst = 1e9, pair = '';
  for (let i = 0; i < G.length; i++) for (let j = i+1; j < G.length; j++) {
    const x = diff(G[i], G[j]); if (x < worst) { worst = x; pair = G[i] + ' と ' + G[j]; }
  }
  // 100を下回ると、並べたときに「同じ色では？」と見えてしまう
  eq(worst >= 100, true, 'どの2色も、はっきり違う（いちばん近い組 ' + pair + ' で ' + Math.round(worst) + '）');
}

console.log('\n■ 毎月の自動送信');
{
  const P = {};
  ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in P ? P[k] : null), setProperty: (k,v) => { P[k] = String(v); },
    deleteProperty: k => { delete P[k]; } }) };
  // 設定タブは無いものとして、既定（16日・7時）で動くか
  vm.runInContext('function cfg_(){ return ""; }', ctx);

  eq(ctx.autoReportDay_(), 16, '既定は毎月16日');
  eq(ctx.autoReportHour_(), 5, '既定は朝5時');
  eq(ctx.autoReportMin_(), 30, '既定は30分（＝5:30）');
  eq(ctx.autoReportTimeStr_(), '5:30', '「5:30」の形で出せる');
  eq(ctx.autoReportOn_(), true, '既定は「自動で送る」');

  // 設定タブで変えられる
  vm.runInContext('cfg_ = function(k){ return ({"自動送信する日（毎月）":1,"自動送信の時刻（時）":23,"自動送信の時刻（分）":5,"レポートを自動で送る":"いいえ"})[k] || ""; }', ctx);
  eq(ctx.autoReportDay_(), 1, '送る日は設定で変えられる');
  eq(ctx.autoReportHour_(), 23, '時刻も変えられる');
  eq(ctx.autoReportTimeStr_(), '23:05', '分も変えられる（0を落とさない）');
  eq(ctx.autoReportOn_(), false, '「いいえ」で止められる');
  // へんな値でも既定に戻る（0日・99時などで壊れない）
  vm.runInContext('cfg_ = function(k){ return ({"自動送信する日（毎月）":0,"自動送信の時刻（時）":99,"自動送信の時刻（分）":99})[k] || ""; }', ctx);
  eq(ctx.autoReportDay_(), 16, 'ありえない日は既定に戻す');
  eq(ctx.autoReportTimeStr_(), '5:30', 'ありえない時刻も既定に戻す');
  eq(ctx.autoReportHour_(), 5, '　時のほうも既定に戻る');
  vm.runInContext('cfg_ = function(){ return ""; }', ctx);

  // 送る日でなければ、何もしない
  let sent = [];
  vm.runInContext('function sendCustomReport(to, s, e){ sentLog.push([to, s.getTime(), e.getTime()]); }', ctx);
  ctx.sentLog = sent;
  vm.runInContext('function rpGroupTarget_(){ return "Cgroup123"; }', ctx);
  vm.runInContext('function logErr_(){}', ctx);

  const RealDate = D;
  const fakeNow = (y, m, d) => {
    class F extends RealDate {
      constructor(...a) { if (a.length === 0) super(y, m, d, 7, 0, 0); else super(...a); }
      static now() { return new RealDate(y, m, d, 7, 0, 0).getTime(); }
    }
    ctx.Date = F;
  };

  fakeNow(2026, 8, 10);                 // 9/10 … 送る日ではない
  ctx.monthlyReportJob();
  eq(sent.length, 0, '16日でなければ、何もしない');

  fakeNow(2026, 8, 16);                 // 9/16 … 送る日
  ctx.monthlyReportJob();
  eq(sent.length, 1, '16日なら送る');
  eq(sent[0][0], 'Cgroup123', '送り先はグループLINE');
  eq(new RealDate(sent[0][1]).getMonth(), 7, '期間の始まりは8月');
  eq(new RealDate(sent[0][1]).getDate(), 16, '  8/16 から');
  eq(new RealDate(sent[0][2]).getMonth(), 8, '期間の終わりは9月');
  eq(new RealDate(sent[0][2]).getDate(), 15, '  9/15 まで');

  ctx.monthlyReportJob();
  eq(sent.length, 1, '同じ日にもう一度動いても、二度は送らない');

  fakeNow(2026, 9, 16);                 // 10/16 … 次の月
  ctx.monthlyReportJob();
  eq(sent.length, 2, '月が変われば、また送る');
  eq(new RealDate(sent[1][1]).getMonth(), 8, '  9/16 から');
  eq(new RealDate(sent[1][2]).getMonth(), 9, '  10/15 まで');

  // 送り先が無いときは、送らずに知らせる
  sent.length = 0; delete P['AUTO_REPORT_SENT'];
  vm.runInContext('rpGroupTarget_ = function(){ return ""; }', ctx);
  ctx.monthlyReportJob();
  eq(sent.length, 0, 'グループIDが無ければ送らない（誤配信を防ぐ）');

  // 送信中に落ちても、二重送信しない
  sent.length = 0; delete P['AUTO_REPORT_SENT'];
  vm.runInContext('rpGroupTarget_ = function(){ return "Cgroup123"; }', ctx);
  vm.runInContext('sendCustomReport = function(){ throw new Error("途中で失敗"); }', ctx);
  ctx.monthlyReportJob();
  eq(!!P['AUTO_REPORT_SENT'], true, '失敗しても「送った」と記録する（二重送信を防ぐため）');
  ctx.Date = RealDate;
}

console.log('\n■ アツいエリアは、曜日区分ごとに1つだけ');
{
  const mk = o => Object.assign({l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,
    lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}}, o);
  const as = {}; ADV_DT.forEach(d => { as[d] = { "北": mk({}), "ﾐﾅﾐ": mk({}), "ほか": mk({}) }; });
  // 北 61件 平均￥4,083 ／ ﾐﾅﾐ 2件 平均￥12,870 ／ ほか 2件 平均￥6,930
  as["平日"]["北"]   = mk({ l:7, m:7, s:47, t:61, sales:249063, lSum:92421, mSum:52220, sSum:104387, waitSum:1586, waitCount:61 });
  as["平日"]["ﾐﾅﾐ"]  = mk({ l:1, m:1, s:0,  t:2,  sales:25740,  lSum:18100, mSum:7640,  waitSum:10, waitCount:2 });
  as["平日"]["ほか"] = mk({ l:1, m:0, s:1,  t:2,  sales:13860,  lSum:10760, sSum:3100,  waitSum:10, waitCount:2 });

  const f = ctx.buildReportFlex_({
    periodStr: "x", totalRidesCount: 65,
    tabRidesCount: {"北7":0,"北4":0,"北他":0,"ﾐﾅﾐ":0,"関空":0,"ほか":0},
    DAY_TYPES: ADV_DT, areaStats: as, finalTimeline: mkFt([]),
    targetHours: ADV_HRS, dashboardUrl: "https://e.com" });

  const rows = [];
  (function find(n) {
    if (Array.isArray(n)) return n.forEach(find);
    if (!n || typeof n !== 'object') return;
    if (n.type === 'text' && typeof n.text === 'string' && /^(🥇|\(参考\)) /.test(n.text)) rows.push(n.text);
    Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
  })(f);

  eq(rows.length, 1, '曜日区分ごとに1つだけ（' + rows.length + '行）');
  eq(rows[0].indexOf('北') !== -1, true,
     '61件の「北」が選ばれる（2件で平均が高いだけのエリアではない）');
  eq(rows[0].indexOf('🥇') === 0, true, '3件以上あるので 🥇 が付く');
  eq(rows.filter(t => /ﾐﾅﾐ|ほか/.test(t)).length, 0,
     '2位・3位はLINEには出さない（3つともスプシで見られる）');

  // 3件に満たないものしか無いときは、(参考) を付けて出す
  const as2 = {}; ADV_DT.forEach(d => { as2[d] = { "北": mk({}), "ﾐﾅﾐ": mk({}), "ほか": mk({}) }; });
  as2["平日"]["ﾐﾅﾐ"] = mk({ l:1, m:1, s:0, t:2, sales:25740, lSum:18100, mSum:7640, waitSum:10, waitCount:2 });
  const f2 = ctx.buildReportFlex_({
    periodStr: "x", totalRidesCount: 2, tabRidesCount: {"北7":0,"北4":0,"北他":0,"ﾐﾅﾐ":0,"関空":0,"ほか":0},
    DAY_TYPES: ADV_DT, areaStats: as2, finalTimeline: mkFt([]), targetHours: ADV_HRS, dashboardUrl: "https://e.com" });
  eq(JSON.stringify(f2).indexOf('(参考) ﾐﾅﾐ') !== -1, true,
     '3件に満たないときは (参考) を付けて出す（消しはしない）');
}

console.log('\n■ LINEに出す時間帯の数');
{
  const ft = mkFt([]);
  // 平日の6つの時間帯に記録。平均は 20時が最高、次が 23時、その次が 01時
  [[20, 9000], [23, 8000], [1, 7000], [2, 3000], [3, 2000], [4, 1000]].forEach(([h, avg]) => {
    ft["平日"][h] = { best: { name: "新地4", count: 5, avg: avg, max: avg * 2, at: ("0"+h).slice(-2) + ":30" }, worst: null };
  });
  const build = () => {
    const f = ctx.buildReportFlex_({ periodStr: "x", totalRidesCount: 30,
      tabRidesCount: {"北7":0,"北4":0,"北他":0,"ﾐﾅﾐ":0,"関空":0,"ほか":0},
      DAY_TYPES: ADV_DT, areaStats: (() => { const a = {}; ADV_DT.forEach(d => { a[d] = {
        "北": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}},
        "ﾐﾅﾐ": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}},
        "ほか": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}} }; }); return a; })(),
      finalTimeline: ft, targetHours: ADV_HRS, dashboardUrl: "https://e.com" });
    const out = [];
    (function find(n) {
      if (Array.isArray(n)) return n.forEach(find);
      if (!n || typeof n !== 'object') return;
      if (n.type === 'text' && Array.isArray(n.contents) && n.contents[0] && n.contents[0].type === 'span') {
        // 1つの text に、行を改行でまとめて入れてある（中身を太らせないため）
        n.contents.map(s => s.text).join('').split('\n').forEach(function (t) {
          if (/^\[\d\d:\d\d\]/.test(t)) out.push(t);
        });
      }
      Object.keys(n).forEach(k => { if (n[k] && typeof n[k] === 'object') find(n[k]); });
    })(f);
    return out;
  };

  vm.runInContext('function cfg_(){ return ""; }', ctx);
  let lines = build();
  eq(lines.length, 3, '既定では、曜日区分ごとに3つまで（' + lines.length + '行）');
  eq(lines.map(t => t.slice(1, 3)), ['20', '23', '01'], '平均の高い時間帯から選ぶ');

  vm.runInContext('cfg_ = function(k){ return k === "LINEに出す時間帯の数" ? 6 : ""; }', ctx);
  lines = build();
  eq(lines.length, 6, '設定で増やせる（全部見たいとき）');
  eq(lines.map(t => t.slice(1, 3)), ['20', '23', '01', '02', '03', '04'], '  出すときは時間の順に並べ直す');

  vm.runInContext('cfg_ = function(k){ return k === "LINEに出す時間帯の数" ? 1 : ""; }', ctx);
  eq(build().length, 1, '1つまで、にもできる');
  vm.runInContext('cfg_ = function(k){ return k === "LINEに出す時間帯の数" ? 0 : ""; }', ctx);
  eq(build().length, 3, 'ありえない数（0）は既定に戻す');
  vm.runInContext('cfg_ = function(){ return ""; }', ctx);
}

console.log('\n■ 見出しの途中で、次のメッセージに切り替わらない');
{
  // 実データくらいの量を作る
  const mk = o => Object.assign({l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,
    lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}}, o);
  const sp = () => ({l:2,m:1,s:20,lSum:25924,mSum:7330,sSum:43000,
    lTimes:{"(月) 23:51":1}, mTimes:{"(火) 00:10":1}, sTimes:{"(水) 02:30":2}});
  const as = {}; ADV_DT.forEach(d => { as[d] = {
    "北":   mk({l:7,m:7,s:47,t:61,sales:249063,lSum:92421,mSum:52220,sSum:104387,waitSum:1586,waitCount:61,spots:{"ガチマネプラ乗り場":sp(),"新地7":sp()}}),
    "ﾐﾅﾐ":  mk({l:3,m:3,s:6, t:12,sales:90000, lSum:54000,mSum:21000,sSum:15000, waitSum:120, waitCount:12,spots:{"ドン2":sp()}}),
    "ほか": mk({l:3,m:2,s:5, t:10,sales:70000, lSum:40000,mSum:14000,sSum:16000, waitSum:100, waitCount:10,spots:{"コナン像前":sp()}}) }; });
  const ft = mkFt([]);
  ADV_DT.forEach(d => [20,23,0,1,2,3].forEach(h => {
    ft[d][h] = { best:  { name:"ガチマネプラ乗り場", count:15, avg:6758, max:18960, at:("0"+h).slice(-2)+":51" },
                 worst: { name:"新地7", count:2, avg:2050, max:2050, at:("0"+h).slice(-2)+":20" } };
  }));
  const opu = { count:120, sales:960000, waitSum:1200, waitCount:80, kanku:30, spots:{}, hours:{} };
  for (let i = 0; i < 5; i++) opu.spots["オプチャ乗り場" + i] = { count:12-i, sales:90000, max:20000, at:"金曜 23:5" + i };
  const adv = ctx.buildMonthlyAdvice_(
    { "北4|ガチマネプラ乗り場": { count:16, sales:108000, waitSum:320, waitCount:16 } },
    { "北4|ガチマネプラ乗り場": { "4|23": { count:6, sales:65000, times:["23:44","23:51"] } } },
    ft, ADV_DT, ADV_HRS, new D(2026, 7, 15));

  const msgs = ctx.buildReportFlex_({
    periodStr: "7/16(木)～8/15(土)", totalRidesCount: 165,
    tabRidesCount: {"北7":36,"北4":39,"北他":45,"ﾐﾅﾐ":27,"関空":1,"ほか":17},
    DAY_TYPES: ADV_DT, areaStats: as, finalTimeline: ft,
    targetHours: ADV_HRS, dashboardUrl: "https://example.com/x", advice: adv, opucha: opu,
    getBestTimeStr: function (o) { if (!o) return ""; let mc=0,bt=""; for (const t in o) if (o[t]>mc){mc=o[t];bt=t;} return bt?" ["+bt+"]":""; }
  });

  const sizes = msgs.map(b => ctx.lrBytes_(JSON.stringify(b)));
  eq(sizes.every(n => n <= 10000), true, 'どの通もLINEの上限内（' + sizes.join('・') + '）');
  eq(JSON.stringify(msgs).indexOf('省きました') === -1, true, '中身を削らずに全部届く');

  // 見出しごとに、どの通に入ったかを調べる
  const where = {};
  msgs.forEach((b, i) => {
    (b.body.contents || []).forEach(el => {
      const t = String(el.text || '');
      ['パーセント・実績', '時間詳細', 'オプチャ情報', '月間戦略アドバイス'].forEach(name => {
        if (t.indexOf(name) !== -1) { (where[name] = where[name] || []).push(i); }
      });
      // かたまりの中身（曜日区分の箱）も、どの通にあるか数える
      if (el.type === 'box' && Array.isArray(el.contents)) {
        const head = String((el.contents[0] || {}).text || '');
        if (/^【(平日|金曜|土曜|日祝)】$/.test(head)) (where['箱' + head] = where['箱' + head] || []).push(i);
      }
    });
  });
  eq(where['時間詳細'].length, 1, '「時間詳細」の見出しは1か所だけ');
  // 時間詳細の4つの箱が、すべて同じ通にあること
  const tlMsg = where['時間詳細'][0];
  const boxesAfter = (msgs[tlMsg].body.contents || []);
  const tlStart = boxesAfter.findIndex(el => String(el.text || '').indexOf('時間詳細') !== -1);
  const tlBoxes = boxesAfter.slice(tlStart + 1).filter(el => el.type === 'box' &&
    /^【(平日|金曜|土曜|日祝)】$/.test(String((el.contents[0] || {}).text || '')));
  eq(tlBoxes.length, 4, '  4つの曜日区分とも、同じ通にそろっている（途中で切れない）');

  eq(where['オプチャ情報'].length, 1, '「オプチャ情報」も1か所だけ');
  eq(where['月間戦略アドバイス'].length, 1, '「月間戦略アドバイス」も1か所だけ');

  // 1通に入りきらないかたまりだけは分かれる。そのときは見出しを引き継ぐ
  // 1通に入らないかたまりが分かれたときは、見出しを引き継ぐ
  const J3 = JSON.stringify(msgs);
  if (J3.indexOf('（つづき）') !== -1) {
    const heads = [];
    msgs.forEach(b => (b.body.contents || []).forEach(el => {
      if (String(el.text || '').indexOf('（つづき）') !== -1) heads.push(String(el.text));
    }));
    /*
     * ★引き継ぐ見出しは【曜日区分】とはかぎらない。
     *   「🚕 一晩の流し方（20:00〜翌04:00）」のような、
     *   まとまりの見出しのところで分かれることもある。
     *   大事なのは「直前の見出しが、そのまま引き継がれている」こと
     */
    eq(heads.every(t => /（つづき）$/.test(t) && t.replace('（つづき）', '').trim().length >= 3),
       true, '分かれた先には、直前の見出し＋（つづき）が付く（' + heads.join(' / ') + '）');
  }
  // 最後の通にだけ、スプシへのボタン
  eq(msgs[msgs.length - 1].footer !== undefined, true, 'スプシへのボタンは最後の通だけ');
  eq(msgs.slice(0, -1).every(b => b.footer === undefined), true, '  途中には付けない');
}

console.log('\n■ 乗り場が書かれていないぶんは、のぞいたと断る');
{
  const f = ctx.buildReportFlex_({
    periodStr: "x", totalRidesCount: 160,
    tabRidesCount: {"北7":0,"北4":0,"北他":0,"ﾐﾅﾐ":0,"関空":0,"ほか":0},
    DAY_TYPES: ADV_DT, areaStats: (() => { const a = {}; ADV_DT.forEach(d => { a[d] = {
      "北": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}},
      "ﾐﾅﾐ": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}},
      "ほか": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}} }; }); return a; })(),
    finalTimeline: mkFt([]), targetHours: ADV_HRS, dashboardUrl: "https://e.com", noPlace: 5 });
  eq(JSON.stringify(f).indexOf('乗り場の記入がない 5件は、この集計から外しています') !== -1, true,
     'のぞいた件数を見出しに出す（黙って減らさない）');

  const f0 = ctx.buildReportFlex_({
    periodStr: "x", totalRidesCount: 160,
    tabRidesCount: {"北7":0,"北4":0,"北他":0,"ﾐﾅﾐ":0,"関空":0,"ほか":0},
    DAY_TYPES: ADV_DT, areaStats: (() => { const a = {}; ADV_DT.forEach(d => { a[d] = {
      "北": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}},
      "ﾐﾅﾐ": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}},
      "ほか": {l:0,m:0,s:0,t:0,sales:0,lSum:0,mSum:0,sSum:0,waitSum:0,waitCount:0,lWait:0,lWaitC:0,mWait:0,mWaitC:0,sWait:0,sWaitC:0,spots:{}} }; }); return a; })(),
    finalTimeline: mkFt([]), targetHours: ADV_HRS, dashboardUrl: "https://e.com", noPlace: 0 });
  eq(JSON.stringify(f0).indexOf('乗り場の記入がない') === -1, true, '0件なら、よけいな断りは出さない');
}

console.log('\n■ まとめスプシの見た目');
{
  // 金額の文字色（記録用スプシと同じ決まり）
  const C = ctx.dbMoneyColor_;
  eq(C(20000), '#990000', '15,000以上は濃い赤');
  eq(C(15000), '#990000', '  ちょうど15,000も赤');
  eq(C(14999), '#b45f06', '10,000以上は濃い黄土色');
  eq(C(10000), '#b45f06', '  ちょうど10,000も黄土色');
  eq(C(9999),  '#0b5394', '5,000以上は濃い青');
  eq(C(5000),  '#0b5394', '  ちょうど5,000も青');
  eq(C(4999),  '#000000', '4,999以下は黒');
  eq(C(1000),  '#000000', '  1,000も黒');
  eq(C(999),   '#666666', '999以下は濃いグレー');
  eq(C(0),     '#666666', '  0もグレー');
  eq(C(null),  '#666666', '  空でも落ちない');

  // 長い乗り場名は、変なところで折り返さずに小さくする
  const W = 7 * 26 - 6;
  const cases = ['新地4', 'ガチマネプラ乗り場', 'スナックMiya(住之江区東加賀屋)', '万博記念公園迎賓館前ロータリー'];
  cases.forEach(n => {
    const sz = ctx.dbFitSize_(n, 7, 12, 7, 2);
    eq(ctx.dbLines_(n, W, sz) <= 1, true, '「' + n + '」が1行に収まる（' + sz + 'pt）');
    eq(sz >= 9, true, '  小さくしすぎない（9pt以上）');
  });
  eq(ctx.dbFitSize_('新地4', 7, 12, 7, 2), 12, '短い名前は大きいまま');
  eq(ctx.dbFitSize_('あ'.repeat(60), 7, 12, 7, 2) >= 7, true, 'とても長くても、いちばん小さいところで止める');
}

console.log('\n■ 送る前に、空のところを取りのぞく（出口での掃除）');
{
  const C = ctx.lrClean_;
  eq(C({ type: 'span', text: '' }), null, '空の span は捨てる');
  eq(C({ type: 'span', text: 'あ' }).text, 'あ', '中身があれば残す');
  eq(C({ type: 'text', text: '' }), null, '空の text は捨てる');
  eq(C({ type: 'text', contents: [{ type: 'span', text: '' }] }), null,
     'span が全部空なら、その text ごと捨てる');
  eq(C({ type: 'text', contents: [{ type: 'span', text: '' }, { type: 'span', text: 'あ' }] })
       .contents.length, 1, '空の span だけ抜いて、残りは活かす');
  eq(C({ type: 'box', layout: 'vertical', contents: [] }), null, '空の box は捨てる');
  eq(C({ type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '' }] }), null,
     '中が全部空なら、box ごと捨てる');
  eq(C({ type: 'box', layout: 'vertical',
         contents: [{ type: 'text', text: '' }, { type: 'text', text: 'あ' }] }).contents.length, 1,
     '中身が1つでも残れば、box は残す');
  // 入れ子でも効く
  const deep = C({ type: 'box', layout: 'vertical', contents: [
    { type: 'box', layout: 'vertical', contents: [{ type: 'span', text: '' }] },
    { type: 'text', text: 'のこる' }
  ]});
  eq(deep.contents.length, 1, '入れ子の奥まで見る');
  eq(deep.contents[0].text, 'のこる', '  残るものは残る');
  eq(C([]).length, 0, '空の配列でも落ちない');
  eq(C(null), null, 'null でも落ちない');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
