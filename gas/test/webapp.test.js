/**
 * みんなの記録ページ（004-WebApp.gs）を検証する。
 *   実行: node gas/test/webapp.test.js
 *
 * ・サーバー側（doGet / wbCollect_）は 001-Code.gs と一緒に vm で動かす
 * ・ページ側は、簡単な偽DOMを用意して実際に描かせ、中身を確かめる
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const ctx = { console };
vm.createContext(ctx);
const CtxDate = vm.runInContext('Date', ctx);

/* ---- 偽のシート ---- */
let TABS = {};
function makeSheet(name, rows) {
  return {
    getName: () => name,
    getLastRow: () => 3 + rows.length,
    getMaxRows: () => 1000,
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 4, r - 4 + (nr || 1))
                           .map(x => x.slice(c - 1, c - 1 + (nc || 1))),
      setValues: () => {}, setValue: () => {}, getValue: () => ''
    })
  };
}
ctx.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: n => TABS[n] ? makeSheet(n, TABS[n]) : null,
    toast: () => {}
  }),
  BorderStyle: { SOLID: 'SOLID' },
  getUi: () => ({ alert: () => {}, ButtonSet: {} })
};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: () => null, setProperty: () => {}, deleteProperty: () => {} })};
ctx.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} })};
ctx.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }) };
ctx.Utilities = { base64Encode: () => '', formatDate: d => String(d), sleep: () => {} };
ctx.Session = { getScriptTimeZone: () => 'Asia/Tokyo' };
ctx.ScriptApp = { getProjectTriggers: () => [], getService: () => ({ getUrl: () => '' }) };

let captured = null;
ctx.HtmlService = {
  XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
  createHtmlOutput: h => { captured = h; return {
    setTitle() { return this; }, addMetaTag() { return this; },
    setXFrameOptionsMode() { return this; } }; }
};

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8'), ctx,
  { filename: '001-Code.gs' });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '004-WebApp.gs'), 'utf8'), ctx,
  { filename: '004-WebApp.gs' });

const F = n => vm.runInContext(n, ctx);
const K = n => vm.runInContext(n, ctx);

let ng = 0;
function ok(c, l) { console.log((c ? '  ok   ' : '  NG   ') + l); if (!c) ng++; }
function has(s, n, l) {
  ok(String(s).indexOf(n) !== -1, l + (String(s).indexOf(n) !== -1 ? '' :
     '  … 実際: ' + JSON.stringify(String(s).slice(0, 200))));
}

/* ---- テスト用の行を作る ---- */
function row(who, y, m, d, time, money, place, other, wait, mark) {
  const r = new Array(11).fill('');
  r[K('C_SENDER') - 1] = who;
  r[K('C_DATE')   - 1] = new CtxDate(y, m - 1, d, 12, 0, 0);
  r[K('C_WAIT')   - 1] = wait == null ? '' : wait + '分';
  r[K('C_TIME')   - 1] = time;
  r[K('C_MONEY')  - 1] = money;
  r[K('C_PLACE')  - 1] = place;
  r[K('C_OTHER')  - 1] = other || '';
  r[K('C_MARK')   - 1] = mark || '';
  return r;
}
// きょうから見て「今期」に入る日を使う
const TODAY = new Date();
const Y = TODAY.getFullYear();
const M = TODAY.getMonth() + 1;
const D = Math.min(TODAY.getDate(), 28);

function reset() {
  TABS = {};
  ['ﾀﾞｲｽｹ','ｼｭﾝ','ｶｲﾄ','ｱﾅﾙ','ﾏｰｸ','北7','北4','北他','ﾐﾅﾐ','ほか','関空','ﾊﾞﾗｼ','説明','設定']
    .forEach(n => { TABS[n] = []; });
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
}

console.log('\n■ 個人タブ＝自社、それ以外の「ｵﾌﾟﾁｬ」行＝オプチャ');
reset();
const own1 = row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4', '', 20);
TABS['ﾀﾞｲｽｹ'] = [own1];
TABS['北4']   = [own1.slice(),                                   // 個人タブの写し
                 row('ｵﾌﾟﾁｬ', Y, M, D, '01:30', 25000, '新地7')]; // オプチャ
let dat = F('wbCollect_')(true);
ok(dat.ok === true, '読み込めた');
ok(dat.own.length === 1, '自社は1件（エリアタブの写しを数えない）');
ok(dat.opu.length === 1, 'オプチャは1件');
ok(dat.own[0].w === 'ﾀﾞｲｽｹ', '自社の行は本人の名前');
ok(dat.opu[0].w === 'ｵﾌﾟﾁｬ', 'オプチャの行は「ｵﾌﾟﾁｬ」');
ok(dat.own[0].wt === 20, '待ち時間が数字で入る');
ok(dat.own[0].s === 23, '23:10 は 23枠');
ok(dat.opu[0].s === 25, '01:30 は 25枠（17時起点）');

console.log('\n■ 同じ内容が2つのタブにあっても二重に数えない');
reset();
const o2 = row('ｵﾌﾟﾁｬ', Y, M, D, '01:30', 25000, '新地7');
TABS['北4'] = [o2];
TABS['関空'] = [o2.slice()];      // 関空にも入る運用
dat = F('wbCollect_')(true);
ok(dat.opu.length === 1, '2タブに入っていても1件');

console.log('\n■ 使えない行は落とす');
reset();
TABS['ﾀﾞｲｽｹ'] = [
  row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4'),
  row('ﾀﾞｲｽｹ', Y, M, D, '??:??', 12000, '新地4'),   // 時刻不明
  row('ﾀﾞｲｽｹ', Y, M, D, '23:20', 0,     '新地4'),   // 金額0
  row('ﾀﾞｲｽｹ', Y, M, D, '23:30', 'あ',  '新地4')    // 金額が読めない
];
dat = F('wbCollect_')(true);
ok(dat.own.length === 1, '読める1件だけ残る');

console.log('\n■ 期間の一覧');
reset();
TABS['ﾀﾞｲｽｹ'] = [row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4')];
dat = F('wbCollect_')(true);
ok(dat.periods.length >= 1, '期間が1つ以上ある');
has(dat.periods[0].label, '今期', '先頭は今期');
ok(dat.periods.every(p => p.from <= p.to), 'どの期間も 開始 <= 終了');
ok(dat.own[0].d >= dat.periods[0].from && dat.own[0].d <= dat.periods[0].to,
   'きょうの記録は今期に入る');

console.log('\n■ doGet がページを返す');
reset();
TABS['ﾀﾞｲｽｹ'] = [row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4')];
captured = null;
F('doGet')({ parameter: { all: '1' } });
ok(typeof captured === 'string' && captured.length > 5000, 'HTMLが返る');
ok(captured.indexOf('/*__DATA__*/null') === -1, 'データが差し込まれている');
has(captured, '"ok":true', '中身のJSONが入っている');
has(captured, '新地4', '記録が入っている');

console.log('\n■ 乗り場名に </script> が混ざってもページが壊れない');
reset();
TABS['ﾀﾞｲｽｹ'] = [row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '</script><b>わる$&い')];
captured = null;
F('doGet')({ parameter: {} });
ok(captured.indexOf('</script><b>') === -1, '生の </script> が出ていない');
has(captured, '$&', '$& がそのまま残っている（差し込みで化けない）');

/* ============ ここからページ側 ============ */
console.log('\n■ ページが実際に描けるか（偽のブラウザで動かす）');

// 最低限の偽DOM。innerHTML を受け取れればよい
function fakeEl(id) {
  return { id: id, innerHTML: '', textContent: '', value: '', disabled: false,
           style: {}, dataset: {}, classList: { toggle(){}, add(){}, remove(){} },
           onclick: null, onkeydown: null, focus(){} };
}
function runPage(html, onFetch) {
  const els = {};
  const store = {};
  const get = id => (els[id] = els[id] || fakeEl(id));
  const stub = fakeEl('stub');
  const pctx = {
    console,
    document: {
      getElementById: get,
      querySelector: () => stub,
      querySelectorAll: () => []
    },
    window: { scrollTo() {} },
    location: { reload() {} },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    google: { script: { run: (function () {
      let okH = null, ngH = null;
      const api = {
        withSuccessHandler(f) { okH = f; return api; },
        withFailureHandler(f) { ngH = f; return api; },
        wbFetch(code) {
          try { okH(onFetch ? onFetch(code) : '{}'); }
          catch (e) { if (ngH) ngH(e); }
        }
      };
      return api;
    })() } }
  };
  pctx.window.document = pctx.document;
  vm.createContext(pctx);
  const m = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (!m) throw new Error('ページのスクリプトが見つかりません');
  vm.runInContext(m[1], pctx, { filename: 'webapp.html' });
  return { els: els, ctx: pctx, store: store };
}

reset();
TABS['ﾀﾞｲｽｹ'] = [
  row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4', '', 20),
  row('ﾀﾞｲｽｹ', Y, M, D, '01:30',  3000, '新地4', '', 5),
  row('ﾀﾞｲｽｹ', Y, M, D, '02:00',  7000, 'ドン2', '', 10),
  row('ﾀﾞｲｽｹ', Y, M, D, '22:00', 15000, '新地4', '', 30)
];
TABS['ｼｭﾝ'] = [ row('ｼｭﾝ', Y, M, D, '23:00', 5000, '新地7', '', 8) ];
TABS['関空'] = [ row('ｵﾌﾟﾁｬ', Y, M, D, '00:10', 25000, '新地7', '行先：関空') ];
captured = null;
F('doGet')({ parameter: { all: '1' } });
const page = runPage(captured);
const view = page.els['view'];

ok(view.innerHTML.length > 200, '① 立ち回りが描けた');
has(view.innerHTML, '時間帯別', '時間帯別のグラフがある');
has(view.innerHTML, '曜日区分別', '曜日区分別のグラフがある');
has(view.innerHTML, '乗り場ランキング', '乗り場ランキングがある');
has(view.innerHTML, 'ロングマップ', 'ロングマップがある');
has(view.innerHTML, '5件', '自社5件が数えられている');
// 上の3つの数字カードだけを取り出して確かめる
const kpis = view.innerHTML.slice(0, view.innerHTML.indexOf('</div></div>', 
  view.innerHTML.indexOf('ロング率')) + 12);
has(kpis, '¥8,400', '自社の平均が正しい（42000/5）');
ok(kpis.indexOf('¥25,000') === -1, 'オプチャの25,000円は自社の平均に混ぜていない');
has(kpis, '>40<', 'ロング率 2/5 = 40%');
// ロングマップのほうには、オプチャぶんも入っている
has(view.innerHTML.slice(view.innerHTML.indexOf('ロングマップ')), '¥25,000',
   'ロングマップにはオプチャの25,000円が入る');
has(view.innerHTML.slice(view.innerHTML.indexOf('ロングマップ')), 'ｵﾌﾟﾁｬ1',
   'ロングマップに「そのうちオプチャ何件か」が出る');
ok(page.els['stamp'].textContent.length > 0, '最終更新が出ている');

// ② 記録
page.ctx.go('b');
has(view.innerHTML, '¥25,000', '② 記録にはオプチャも出る');
has(view.innerHTML, 'ｵﾌﾟﾁｬ', 'オプチャの札が付く');
has(view.innerHTML, 'ロング', '区分の札が付く');
has(view.innerHTML, '¥42,000', '日別の合計は自社ぶんだけ');

// ③ ランキング
page.ctx.go('c');
has(view.innerHTML, '売上ランキング', '③ ランキングが描けた');
has(view.innerHTML, '🥇 ﾀﾞｲｽｹ', '売上1位はﾀﾞｲｽｹ');
has(view.innerHTML, '🥈 ｼｭﾝ', '2位はｼｭﾝ');
has(view.innerHTML, '¥42,000', 'ﾀﾞｲｽｹの合計');
has(view.innerHTML, '¥5,000', 'ｼｭﾝの合計');

console.log('\n■ 記録が無くても落ちない');
reset();
captured = null;
F('doGet')({ parameter: {} });
const p2 = runPage(captured);
has(p2.els['view'].innerHTML, '記録がありません', '空のときの案内が出る');
p2.ctx.go('b'); has(p2.els['view'].innerHTML, '記録がありません', '記録タブも落ちない');
p2.ctx.go('c'); has(p2.els['view'].innerHTML, '記録がありません', 'ランキングも落ちない');

console.log('\n■ 乗り場をタップすると Googleマップが開く');
{
  const rides = [];
  for (let i = 0; i < 4; i++) {
    rides.push({ w:'ﾀﾞｲｽｹ', d:'2026-09-04', t:'23:1' + i, m:12000, p:'新地4',
                 o:'', k:'', wt:null, y:'平日', s:23 });
  }
  const base = { ok:true, updated:'', all:false, days:60, shortMax:4999, longMin:10000,
                 members:['ﾀﾞｲｽｹ'],
                 periods:[{ label:'今期', from:'2026-08-16', to:'2026-09-30' }],
                 own: rides, opu: [] };

  const url = 'https://www.google.com/maps/search/?api=1&query=34.7,135.5';
  const withMap = K('WB_HTML').replace('/*__DATA__*/null',
    JSON.stringify(Object.assign({}, base, { map: { '新地4': url } })));
  const pm = runPage(withMap);

  pm.ctx.go('b');                       // ② 記録
  has(pm.els['view'].innerHTML, 'href="' + url.replace(/&/g, '&amp;') + '"',
    '記録カードの乗り場がリンクになる');
  has(pm.els['view'].innerHTML, 'class="mapl"', 'リンクだと分かる印が付く');
  has(pm.els['view'].innerHTML, '📍', '目印の📍が出る');
  has(pm.els['view'].innerHTML, 'target="_blank"', '別のタブで開く（ページに戻ってこられる）');

  pm.ctx.go('a');                       // ① 立ち回り（乗り場ランキング）
  has(pm.els['view'].innerHTML, 'class="mapl nm"', 'ランキングの乗り場名もリンクになる');

  // 行き先が分からないときは、ただの文字のまま
  const noMap = K('WB_HTML').replace('/*__DATA__*/null', JSON.stringify(base));
  const pn = runPage(noMap);
  pn.ctx.go('b');
  has(pn.els['view'].innerHTML, '新地4', '表に無ければ、そのまま文字で出る');
  ok(pn.els['view'].innerHTML.indexOf('class="mapl"') === -1,
    'リンクにはしない（押せない場所を作らない）');
  ok(pn.els['view'].innerHTML.indexOf('undefined') === -1, 'undefined が出ない');
}

console.log('\n■ 乗り場の表は、種類のぶんだけ渡す');
{
  const mk = p => ({ p: p });
  vm.runInContext('function mapUrlFor_(p){ return p ? "URL:" + p : ""; }', ctx);
  const m = F('wbMapUrls_')([mk('新地4'), mk('新地4'), mk('天満')], [mk('天満'), mk('')]);
  ok(Object.keys(m).length === 2, '同じ乗り場は1つにまとめる（' +
     Object.keys(m).length + '種類）');
  ok(m['新地4'] === 'URL:新地4', '行き先が入っている');
  ok(m[''] === undefined, '空欄は入れない');
  vm.runInContext('mapUrlFor_ = undefined;', ctx);
  ok(Object.keys(F('wbMapUrls_')([mk('天満')], [])).length === 0,
     '002-Extras.gs が入っていなければ空（画面はただの文字で出す）');
}

console.log('\n■ 読み込みに失敗したときの表示');
{
  const html = K('WB_HTML').replace('/*__DATA__*/null',
    JSON.stringify({ ok: false, error: 'わざと失敗' }));
  const p3 = runPage(html);
  has(p3.els['view'].innerHTML, 'わざと失敗', '原因がそのまま出る');
}


/* ============ 鍵をかける ============ */
function setCfg(list) {
  reset();
  TABS['設定'] = [['', '項目', '値', '']].concat(
    list.map(([k, v]) => ['', k, v, '']));
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
}
// 「設定」タブは1行目から始まるので、偽シートもそれに合わせる
const realMake = makeSheet;
makeSheet = function (name, rows) {
  const base = (name === '設定') ? 1 : 4;
  return {
    getName: () => name,
    getLastRow: () => base - 1 + rows.length,
    getMaxRows: () => 1000,
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - base, r - base + (nr || 1))
                           .map(x => x.slice(c - 1, c - 1 + (nc || 1))),
      setValues: () => {}, setValue: () => {}, getValue: () => ''
    })
  };
};

console.log('\n■ 鍵なし（今までどおり）');
setCfg([]);
TABS['ﾀﾞｲｽｹ'] = [row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4')];
ok(F('wbGate_')().mode === 'ok', '設定が空なら誰でも見られる');
captured = null; F('doGet')({ parameter: {} });
has(captured, '新地4', '記録がページに入る');

console.log('\n■ 合言葉');
setCfg([['ページの合言葉', 'gooru2026']]);
TABS['ﾀﾞｲｽｹ'] = [row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4')];
ok(F('wbGate_')().mode === 'pass', '合言葉を聞く状態になる');
captured = null; F('doGet')({ parameter: {} });
ok(captured.indexOf('新地4') === -1, '合言葉を入れる前は、記録を1件も渡さない');
has(captured, '"gate":"pass"', 'ページに「合言葉を聞け」と伝える');
ok(captured.indexOf('gooru2026') === -1, '合言葉そのものはページに出さない');

let r1 = JSON.parse(F('wbFetch')('gooru2026', false));
ok(r1.ok === true, '合っていれば記録が返る');
has(JSON.stringify(r1), '新地4', '中身も入っている');
let r2 = JSON.parse(F('wbFetch')('ちがう', false));
ok(r2.ok === false, 'ちがえば返らない');
ok(JSON.stringify(r2).indexOf('新地4') === -1, 'ちがうときは記録が1件も混ざらない');
has(r2.error, 'ちがいます', '理由が返る');
ok(JSON.parse(F('wbFetch')('', false)).ok === false, '空でも通らない');
ok(JSON.parse(F('wbFetch')('GOORU2026', false)).ok === false, '大文字小文字は区別する');

console.log('\n■ メールで制限');
// 相手のメールが取れる場合（デプロイを「アクセスしているユーザー」にしたとき）
let visitor = 'mark@example.com';
ctx.Session = { getScriptTimeZone: () => 'Asia/Tokyo',
                getActiveUser: () => ({ getEmail: () => visitor }) };
setCfg([['ページを見られるメール', 'mark@example.com, daisuke@example.com']]);
TABS['ﾀﾞｲｽｹ'] = [row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4')];
ok(F('wbGate_')().mode === 'ok', '許したメールなら見られる');
visitor = 'DAISUKE@Example.com';
ok(F('wbGate_')().mode === 'ok', '大文字小文字はそろえて比べる');
visitor = 'stranger@example.com';
ok(F('wbGate_')().mode === 'deny', '知らないメールは断る');
captured = null; F('doGet')({ parameter: {} });
ok(captured.indexOf('新地4') === -1, '断るときは記録を1件も渡さない');
has(captured, 'stranger@example.com', '誰でログインしているかは伝える');

console.log('\n■ メールが取れないとき');
visitor = '';
setCfg([['ページを見られるメール', 'mark@example.com']]);
ok(F('wbGate_')().mode === 'setup', 'デプロイ設定を直すよう促す');
setCfg([['ページを見られるメール', 'mark@example.com'], ['ページの合言葉', 'abc']]);
ok(F('wbGate_')().mode === 'pass', '合言葉があれば、そちらに切り替わる');

console.log('\n■ 鍵がかかっているときのページ表示');
setCfg([['ページの合言葉', 'abc']]);
TABS['ﾀﾞｲｽｹ'] = [row('ﾀﾞｲｽｹ', Y, M, D, '23:10', 12000, '新地4')];
captured = null; F('doGet')({ parameter: {} });
{
  let asked = null;
  const p4 = runPage(captured, function (code) { asked = code;
    return JSON.stringify({ ok: true, updated: 'いま', shortMax: 4999, longMin: 10000,
      members: ['ﾀﾞｲｽｹ'], periods: [{ from: '2000-01-01', to: '2099-12-31', label: 'ぜんぶ' }],
      own: [{ w:'ﾀﾞｲｽｹ', d:'2026-09-04', t:'23:10', m:12000, p:'新地4', o:'', k:'', wt:null,
              y:'平日', s:23 }], opu: [] }); });
  has(p4.els['view'].innerHTML, '合言葉', '合言葉の画面が出る');
  ok(p4.els['view'].innerHTML.indexOf('新地4') === -1, 'この時点では記録が出ていない');
  p4.els['pw'].value = 'abc';
  p4.els['go'].onclick();
  ok(asked === 'abc', '入れた合言葉が送られる');
  has(p4.els['view'].innerHTML, '新地4', '通ったら記録が出る');
  ok(p4.store['wbpass'] === 'abc', '次から聞かないように覚えておく');
}

console.log('\n■ URLをグループLINEに送る');
{
  const sent = [];
  ctx.UrlFetchApp = { fetch: (url, opt) => {
    if (url.indexOf('/message/push') !== -1) {
      sent.push(JSON.parse(opt.payload));
      return { getResponseCode: () => 200, getContentText: () => '{}' };
    }
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  }};
  ctx.ScriptApp = { getProjectTriggers: () => [],
    getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ABC/exec' }) };
  const props = { LINE_TOKEN: 'tok' };
  ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in props ? props[k] : null),
    setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } })};

  setCfg([]);
  TABS['説明'] = [];   // グループIDなし
  has(F('wbSendUrlToLine')('group'), 'グループの送信先が未設定',
      'グループの宛先が無ければ送らない');
  ok(sent.length === 0, '全員配信に落ちない');

  // 説明タブのZ1にグループIDが入っている状態にする
  const info = [];
  for (let i = 0; i < 3; i++) info.push(new Array(30).fill(''));
  info[0][25] = 'Cgroup123';        // Z1
  TABS['説明'] = info;
  ctx.SpreadsheetApp = Object.assign({}, ctx.SpreadsheetApp, {
    getActiveSpreadsheet: () => ({
      getSheetByName: n => {
        if (n === '説明') return { getRange: () => ({ getValue: () => 'Cgroup123' }) };
        return TABS[n] ? makeSheet(n, TABS[n]) : null;
      },
      toast: () => {}
    })
  });
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);

  has(F('wbSendUrlToLine')('group'), 'グループLINEに送りました', 'グループへ送れた');
  ok(sent.length === 1, '1通だけ送る');
  ok(sent[0].to === 'Cgroup123', 'グループ宛に送る');
  has(sent[0].messages[0].text, 'https://script.google.com/macros/s/ABC/exec',
      'URLがそのまま入る（トーク上でリンクになる）');

  // 合言葉があるときは、合言葉そのものは書かない
  setCfg([['ページの合言葉', 'himitsu']]);
  ctx.SpreadsheetApp = Object.assign({}, ctx.SpreadsheetApp, {
    getActiveSpreadsheet: () => ({
      getSheetByName: n => {
        if (n === '説明') return { getRange: () => ({ getValue: () => 'Cgroup123' }) };
        return TABS[n] ? makeSheet(n, TABS[n]) : null;
      },
      toast: () => {}
    })
  });
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
  sent.length = 0;
  F('wbSendUrlToLine')('group');
  ok(sent[0].messages[0].text.indexOf('himitsu') === -1,
     '合言葉そのものはLINEに流さない');
  has(sent[0].messages[0].text, '合言葉は各自に伝えます', '合言葉があることだけ伝える');

  // トークンが無ければ送らない
  delete props['LINE_TOKEN'];
  sent.length = 0;
  has(F('wbSendUrlToLine')('group'), 'LINEトークンが未設定', 'トークンが無ければ送らない');
  ok(sent.length === 0, '送っていない');
}

console.log('\n■ 鍵の状態のひとこと');
setCfg([]);                                  has(F('wbLockText_')(), '鍵なし', '設定が空なら鍵なし');
setCfg([['ページの合言葉', 'x']]);            has(F('wbLockText_')(), '合言葉あり', '合言葉あり');
setCfg([['ページを見られるメール', 'a@b.c']]); has(F('wbLockText_')(), 'デプロイ設定', 'メール制限だけだと注意が出る');

console.log('\n■ 公開URLを実際に叩いて確かめる');
{
  let reply = { code: 200, body: '' };
  ctx.UrlFetchApp = { fetch: () => ({
    getResponseCode: () => reply.code, getContentText: () => reply.body }) };
  ctx.ScriptApp = { getProjectTriggers: () => [],
    getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ABC/exec' }) };
  setCfg([]);
  const T = () => F('wbSelfTest_')();

  reply = { code: 200, body: '<body>\n<!--wbapp-ok-->\n<header>' };
  ok(T().ok === true, '目印が返ってくれば OK');
  has(T().title, 'W0', 'いま公開されている版が出る');

  reply = { code: 200, body: 'スクリプト関数が見つかりません: doGet' };
  ok(T().ok === false, 'doGet が無ければ NG');
  has(T().how, '新バージョン', 'デプロイし直せ、と出る');

  reply = { code: 200, body: '<html>...accounts.google.com/ServiceLogin?...' };
  has(T().title, 'ログインを求められています', 'ログイン画面ならそう言う');
  has(T().how, '全員', 'アクセス範囲を直せ、と出る');

  reply = { code: 404, body: '現在、ファイルを開くことができません。' };
  has(T().how, '新しいデプロイ', 'デプロイが無ければ作り直せ、と出る');

  reply = { code: 500, body: 'なにか知らないもの' };
  ok(T().ok === false, '分からないときも ok=false');
  has(T().how, '新バージョン', 'まずデプロイし直せ、と勧める');

  ok(JSON.parse(F('wbSelfTest')()).ok === false, '画面から呼ぶ形でも動く');

  ctx.ScriptApp = { getProjectTriggers: () => [], getService: () => ({ getUrl: () => '' }) };
  has(T().title, 'まだ公開されていません', '未公開ならそう言う');

  ctx.ScriptApp = { getProjectTriggers: () => [],
    getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ABC/exec' }) };
  ctx.UrlFetchApp = { fetch: () => { throw new Error('つながりません'); } };
  has(T().title, 'URLを開けませんでした', '取得そのものが失敗しても落ちない');
}

console.log('\n■ ページに目印が入っている');
ok(K('WB_HTML').indexOf('wbapp-ok') !== -1, 'ページ側に目印がある');

console.log('\n■ ダイアログが出ない環境でも結果が残る');
{
  const cells = {};
  const toasts = [];
  ctx.SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: n => (n === '説明')
        ? { getRange: a1 => ({ setValue: v => { cells[a1] = String(v); },
                               getValue: () => 'Cgroup123' }) }
        : (TABS[n] ? makeSheet(n, TABS[n]) : null),
      toast: (msg, title) => toasts.push({ title: title, msg: msg })
    }),
    BorderStyle: { SOLID: 'SOLID' },
    // ダイアログが出せない環境を再現する
    getUi: () => { throw new Error('ダイアログは使えません'); }
  };
  ctx.ScriptApp = { getProjectTriggers: () => [],
    getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ABC/exec' }) };
  ctx.UrlFetchApp = { fetch: () => ({
    getResponseCode: () => 200,
    getContentText: () => '現在、ファイルを開くことができません。' }) };
  const props = { LINE_TOKEN: 'tok' };
  ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in props ? props[k] : null),
    setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } })};
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);

  // 🩺 調べる
  F('menuWebAppCheck')();
  ok(toasts.length === 1, 'ダイアログが出せなくても落ちない');
  has(toasts[0].title, '❌', 'トーストで結果が出る');
  has(cells['Z3'], 'macros/s/ABC/exec', '説明タブZ3にURLが残る');
  has(cells['Y3'], 'ページURL', '見出しも書く');
  has(cells['Z4'], '新しいデプロイ', '説明タブZ4に直し方が残る');
  has(cells['Z4'], 'ファイルを開くことができません', '返ってきた中身も残す');

  // 💬 LINEに送る
  toasts.length = 0;
  const sentMsgs = [];
  ctx.UrlFetchApp = { fetch: (url, opt) => {
    if (url.indexOf('/message/push') !== -1) { sentMsgs.push(JSON.parse(opt.payload)); }
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  }};
  F('menuWebAppSendLine')();
  ok(sentMsgs.length === 1, 'ダイアログ無しでLINEに送れる');
  has(sentMsgs[0].messages[0].text, 'macros/s/ABC/exec', 'URLがそのまま届く');
  has(toasts[0].title, '送りました', '結果をトーストで知らせる');

  // 公開していないとき
  ctx.ScriptApp = { getProjectTriggers: () => [], getService: () => ({ getUrl: () => '' }) };
  toasts.length = 0;
  F('menuWebAppCheck')();
  has(cells['Z3'], 'まだ公開されていません', '未公開ならそう書く');
}

console.log('\n■ まず自分だけ／もう一度でグループ');
{
  const sent2 = [];
  ctx.UrlFetchApp = { fetch: (url, opt) => {
    if (url.indexOf('/message/push') !== -1) sent2.push(JSON.parse(opt.payload));
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  }};
  const props2 = { LINE_TOKEN: 'tok' };
  ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in props2 ? props2[k] : null),
    setProperty: (k, v) => { props2[k] = String(v); },
    deleteProperty: k => { delete props2[k]; } })};
  ctx.SpreadsheetApp = Object.assign({}, ctx.SpreadsheetApp, {
    getActiveSpreadsheet: () => ({
      getSheetByName: n => (n === '説明')
        ? { getRange: () => ({ getValue: () => 'Cgroup123', setValue: () => {} }) }
        : (TABS[n] ? makeSheet(n, TABS[n]) : null),
      toast: () => {}
    }),
    getUi: () => { throw new Error('画面は出せません'); }
  });
  ctx.ScriptApp = { getProjectTriggers: () => [],
    getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ABC/exec' }) };
  setCfg([]);
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);

  ok(F('wbTestTarget_')() === 'Uec8443d00bcec9f0463fd47775a41909',
    'テストの宛先は登録済みの「ﾏｰｸ」');

  // 1回目
  let msg = F('menuWebAppSendLineStep')();
  ok(sent2.length === 1, '1回だけ送った');
  ok(sent2[0].to === 'Uec8443d00bcec9f0463fd47775a41909', '自分のLINEへ');
  ok(sent2[0].to !== 'Cgroup123', 'グループには送っていない');
  has(sent2[0].messages[0].text, '【テスト送信】', 'テストだと分かる文が付く');
  has(msg, '自分のLINEにだけ', '結果でもそう言う');
  has(msg, '3分以内にもう一度', '次にどうすればよいか出る');

  // 2回目（3分以内）
  msg = F('menuWebAppSendLineStep')();
  ok(sent2.length === 2, '2回目も送った');
  ok(sent2[1].to === 'Cgroup123', '今度はグループへ');
  ok(sent2[1].messages[0].text.indexOf('【テスト送信】') === -1, 'テストの断りは付かない');
  has(msg, 'グループLINEに送りました', 'そう言う');

  // 3回目は、また自分だけに戻る
  msg = F('menuWebAppSendLineStep')();
  ok(sent2[2].to === 'Uec8443d00bcec9f0463fd47775a41909',
     '一度グループに送ったら、また自分だけからやり直し');

  // 時間が空いたら、グループには飛ばない
  props2['WB_SEND_ARMED'] = String(Date.now() - 10 * 60 * 1000);
  msg = F('menuWebAppSendLineStep')();
  ok(sent2[3].to === 'Uec8443d00bcec9f0463fd47775a41909',
     '3分すぎたら、グループには送らない');

  // 設定でテスト宛先を変えられる
  setCfg([['テスト送信先（自分のLINE）', 'Uxxxx']]);
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
  ok(F('wbTestTarget_')() === 'Uxxxx', '設定タブで宛先を変えられる');
}

console.log(ng ? '\n✗ ' + ng + '件 失敗\n' : '\n✓ すべて通りました\n');
process.exit(ng ? 1 : 0);
