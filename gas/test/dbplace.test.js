/**
 * まとめスプシの乗り場名と、Googleマップの「登録制」リンクを確かめる。
 *   実行: node gas/test/dbplace.test.js
 *
 * ★前は、乗り場の名前から機械が住所を作って、全部にリンクを張っていた。
 *   「新地4」「ドン2」のような、うちの中でしか通じない呼び名を
 *   正しい場所に結びつけられるはずがなく、ほとんど間違っていた。
 *   間違った場所へ案内するリンクは、リンクが無いよりずっと悪い。
 *   いまは「🗺️乗り場マップ」タブに登録したものだけリンクを張る。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8');

/* まとめスプシの見た目まわりだけを真似た、にせの SpreadsheetApp */
function fakeSpreadsheetApp() {
  return {
    getUi: () => { throw new Error('no ui'); },
    newTextStyle: () => {
      const b = {};
      ['setBold', 'setFontSize', 'setForegroundColor', 'setUnderline'].forEach(k => {
        b[k] = v => { b['_' + k] = v; return b; };
      });
      b.build = () => ({ bold: b._setBold, size: b._setFontSize, color: b._setForegroundColor });
      return b;
    },
    newRichTextValue: () => {
      const r = { text: '', links: [], styles: [] };
      const b = {
        setText: t => { r.text = t; return b; },
        setLinkUrl: (s, e, u) => { r.links.push([s, e, u]); return b; },
        setTextStyle: (s, e, st) => { r.styles.push([s, e, st]); return b; },
        build: () => r
      };
      return b;
    }
  };
}

/* にせのシート。行と列に値を置けるだけの、ごく簡単なもの */
function fakeSheet(name, rows) {
  const cells = (rows || []).map(r => r.slice());
  const at = (r, c) => { while (cells.length < r) cells.push([]); const row = cells[r - 1]; while (row.length < c) row.push(''); return row; };
  const sh = {
    _name: name, _cells: cells, _bg: {},
    getName: () => name,
    getLastRow: () => cells.length,
    getRange(r, c, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) { const row = at(r + i, c + nc - 1); out.push(row.slice(c - 1, c - 1 + nc)); }
          return out;
        },
        getValue() { return at(r, c)[c - 1]; },
        setValues(v) { v.forEach((row, i) => { const t = at(r + i, c + nc - 1); row.forEach((x, j) => { t[c - 1 + j] = x; }); }); return this; },
        setValue(v) { at(r, c)[c - 1] = v; return this; },
        setBackground(v) { sh._bg[r + ',' + c] = v; return this; },
        setFontWeight() { return this; }, setWrap() { return this; },
        setVerticalAlignment() { return this; }, setRichTextValue() { return this; }
      };
    },
    setColumnWidth() { return sh; }, setFrozenRows() { return sh; }
  };
  return sh;
}
function fakeSS(sheets) {
  const map = {};
  (sheets || []).forEach(s => { map[s._name] = s; });
  return {
    getSheetByName: n => map[n] || null,
    getSheets: () => Object.keys(map).map(k => map[k]),
    insertSheet(n) { const s = fakeSheet(n, []); map[n] = s; return s; },
    _sheets: map
  };
}

function makeCtx(opt) {
  const o = opt || {};
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);
  vm.runInContext('function logErr_(){}', ctx);
  ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) };
  ctx.SpreadsheetApp = fakeSpreadsheetApp();
  if (o.richThrows) ctx.SpreadsheetApp.newRichTextValue = () => { throw new Error('リッチテキストが作れない'); };
  // MapLink（002-Extras.gs）は「候補さがし」にしか使わない。リンクの元にはしない
  if (o.withMapLink !== false) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'parts', 'MapLink.gs'), 'utf8'), ctx);
  }
  vm.runInContext(SRC, ctx);
  // const で宣言したものは ctx.〇〇 では取れないので、中で評価して取り出す
  ctx.MAP_TAB = vm.runInContext('MAP_TAB', ctx);
  ctx.MIN_N = vm.runInContext('LR_NIGHT_MIN_N', ctx);
  return ctx;
}

function fakeRange() {
  const r = {
    value: undefined, rich: undefined,
    setValue(v) { r.value = v; return r; },
    setRichTextValue(v) { r.rich = v; return r; },
    setFontSize(v) { r.size = v; return r; },
    setFontWeight(v) { r.weight = v; return r; }
  };
  return r;
}

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const HEAD = ['乗り場名', 'Googleマップのリンク（ここに貼ると反映されます）', '状態', '自動でさがした候補（未確認。そのままでは使いません）'];

console.log('■ 登録があるものだけ、リンクを張る');
{
  const ctx = makeCtx();
  const sh = fakeSheet(ctx.MAP_TAB, [HEAD,
    ['新地4', 'https://maps.app.goo.gl/abc123', '登録ずみ', ''],
    ['梅田',  '',                                '未登録', 'https://www.google.com/maps/search/?api=1&query=%E6%A2%85%E7%94%B0']
  ]);
  ctx.mapLoadRegistry_(fakeSS([sh]));

  const r1 = fakeRange();
  ctx.dbPlace_(r1, '新地4');
  ok(!!r1.rich, '登録ずみ → リンクの形で入る', r1.value);
  ok(r1.rich && r1.rich.text === '新地4', '  名前はそのまま残る', r1.rich && r1.rich.text);
  ok(r1.rich && r1.rich.links[0] && r1.rich.links[0][2] === 'https://maps.app.goo.gl/abc123',
     '  登録したリンクがそのまま使われる', r1.rich && r1.rich.links[0]);
  ok(r1.rich && r1.rich.links[0][0] === 0 && r1.rich.links[0][1] === '新地4'.length,
     '  名前の全部にリンクが掛かっている');

  /*
   * ★登録が無い乗り場も、押せばGoogleマップへ行けます（決まりが変わりました）。
   *   飛び先は「その名前でさがした結果」です。場所のピンではありません
   */
  const linkOf = r => (r.rich && r.rich.links && r.rich.links[0] ? r.rich.links[0][2] : '');

  const r2 = fakeRange();
  ctx.dbPlace_(r2, '梅田');
  ok(r2.rich && r2.rich.text === '梅田', '未登録でも、名前は必ず残る', r2);
  ok(linkOf(r2).indexOf('https://www.google.com/maps/search/') === 0,
     '★未登録 → その名前で「さがす」ページへ飛ばす', linkOf(r2));

  const r3 = fakeRange();
  ctx.dbPlace_(r3, 'ｺﾅﾝ像');
  ok(r3.rich && r3.rich.text === 'ｺﾅﾝ像', '表にすら無い乗り場も、名前は必ず残る', r3);
  ok(linkOf(r3).indexOf('https://www.google.com/maps/search/') === 0,
     '  そちらも「さがす」ページへ飛ばす', linkOf(r3));
}

console.log('■ 自動でさがした「住所」は、絶対にリンクにしない（さがす形なら張る）');
{
  /*
   * ★ここは決まりが変わりました（まーくさんのご指示）。
   *
   *   前：登録が無ければ、リンクは1つも張らない。
   *   今：登録が無くても、押せばGoogleマップへ行けるようにする。
   *
   *   ★変わっていないのは「こちらで勝手に場所を決めない」ことです。
   *     自動でさがして出てきた住所を、その場所のピンとしてリンクにするのは
   *     これまでどおりしません。まちがった場所へ人を向かわせるためです。
   *     代わりに「その名前でさがした結果」のページへ飛ばします。
   *     まちがっていても、開いた本人がすぐ分かります。
   */
  const ctx = makeCtx();
  ctx.mapLoadRegistry_(fakeSS([]));            // 登録表が無い状態
  ok(typeof ctx.mapUrlFor_ === 'function', '前提：自動でさがす仕掛けは動く状態にある');
  const r = fakeRange();
  ctx.dbPlace_(r, '新地4');
  const link = r.rich && r.rich.links && r.rich.links[0] ? r.rich.links[0][2] : '';
  ok(r.rich && r.rich.text === '新地4', '★登録が無くても、名前は必ず残る', r);
  ok(link.indexOf('https://www.google.com/maps/search/') === 0,
     '★登録が無ければ、その名前で「さがす」ページへ飛ばす', link);
  ok(link.indexOf('@') === -1,
     '★こちらで勝手に、地図の点（緯度経度）を決めない', link);
  ok(link.indexOf(encodeURIComponent('大阪')) !== -1,
     '  さがす言葉に「大阪」を足す（同じ名前が全国にあるため）', link);
}

console.log('■ 名前のゆれを吸収する');
{
  const ctx = makeCtx();
  const sh = fakeSheet(ctx.MAP_TAB, [HEAD, ['新地7', 'https://example.com/sinchi7', '登録ずみ', '']]);
  ctx.mapLoadRegistry_(fakeSS([sh]));
  ok(ctx.mapRegisteredUrl_('新地７') === 'https://example.com/sinchi7', '全角数字でも同じ登録に当たる');
  ok(ctx.mapRegisteredUrl_(' 新地7 ') === 'https://example.com/sinchi7', '前後に空白があっても当たる');
  ok(ctx.mapRegisteredUrl_('新地7 乗り場') === 'https://example.com/sinchi7', '「乗り場」が付いていても当たる');
}

console.log('■ リンクでないものは受け付けない');
{
  const ctx = makeCtx();
  const sh = fakeSheet(ctx.MAP_TAB, [HEAD,
    ['A', 'あとで調べる', '未登録', ''],
    ['B', '　', '未登録', ''],
    ['C', 'www.google.com/maps', '未登録', ''],
    ['D', 'https://example.com/d', '登録ずみ', '']
  ]);
  ctx.mapLoadRegistry_(fakeSS([sh]));
  ['A', 'B', 'C'].forEach(n => ok(ctx.mapRegisteredUrl_(n) === '', n + '：http で始まらないものはリンクにしない'));
  ok(ctx.mapRegisteredUrl_('D') === 'https://example.com/d', 'D：http で始まるものだけ使う');
}

console.log('■ 登録表を作る／足す（すでに貼ったリンクは絶対に消さない）');
{
  const ctx = makeCtx();
  const sh = fakeSheet(ctx.MAP_TAB, [HEAD, ['新地4', 'https://example.com/keep', '未登録', '']]);
  const ss = fakeSS([sh]);
  ctx.mapEnsureSheet_(ss, ['新地4', '梅田', 'ｺﾅﾝ像', '', '  ', 'なし']);

  const rows = sh._cells.slice(1);
  const names = rows.map(r => r[0]);
  ok(names.indexOf('新地4') !== -1, 'もとからある乗り場は残る');
  ok(names.indexOf('梅田') !== -1 && names.indexOf('ｺﾅﾝ像') !== -1, '新しい乗り場が足される');
  ok(names.indexOf('') === -1 && names.indexOf('なし') === -1, '名前になっていないものは足さない');
  ok(rows.filter(r => r[0] === '新地4').length === 1, '同じ乗り場を二重に足さない');
  ok(rows.find(r => r[0] === '新地4')[1] === 'https://example.com/keep',
     '★すでに貼ってあるリンクを書きかえない');
  ok(rows.find(r => r[0] === '新地4')[2] === '登録ずみ', '状態は貼ってあれば「登録ずみ」に直る');
  ok(rows.find(r => r[0] === '梅田')[2] === '未登録', 'まだのものは「未登録」');
  ok(String(rows.find(r => r[0] === '梅田')[3]).indexOf('http') === 0,
     '候補のらんには、自動でさがした住所を文字として置く（確かめる用）');

  // もう一度動かしても、二重にならない
  const before = sh._cells.length;
  ctx.mapEnsureSheet_(ss, ['新地4', '梅田', 'ｺﾅﾝ像']);
  ok(sh._cells.length === before, '2回動かしても増えない');
}

console.log('■ タブの名前を変えても、見失わない');
{
  /*
   * ★「🗺️乗り場マップ」を「地図」に変えた、というようなことは ふつうに起こる。
   *   そのたびに登録したものが読まれなくなり、おまけに同じ中身のタブが
   *   もう1枚できてしまう、では困る
   */
  const ctx = makeCtx();
  const sh = fakeSheet('地図', [HEAD, ['新地4', 'https://example.com/keep', '登録ずみ', '']]);
  const ss = fakeSS([sh]);

  ok(ctx.mapFindSheet_(ss) === sh, '★「地図」という名前でも、ちゃんと見つける');
  ctx.mapEnsureSheet_(ss, ['新地4', '梅田']);
  ok(Object.keys(ss._sheets).length === 1, '★新しいタブを、よけいに作らない');
  ok(sh._cells.slice(1).map(r => r[0]).indexOf('梅田') !== -1, '  そのタブに足す');

  // 登録したリンクも、ちゃんと読める
  const reg = ctx.mapLoadRegistry_(ss);
  ok(reg[ctx.mapKey_('新地4')] === 'https://example.com/keep',
     '★名前を変えたタブからも、登録したリンクを読む');

  // 「マップ」でも見つける
  const sh2 = fakeSheet('🗺 のりばマップ', [HEAD]);
  ok(ctx.mapFindSheet_(fakeSS([sh2])) === sh2, '  「マップ」の入った名前でも見つける');

  // 決めてある名前が いちばん強い
  const a = fakeSheet(ctx.MAP_TAB, [HEAD]);
  const b = fakeSheet('地図', [HEAD]);
  ok(ctx.mapFindSheet_(fakeSS([b, a])) === a, '  決めてある名前があれば、そちらを使う');

  // どちらも無ければ、作る
  const empty = fakeSS([fakeSheet('記録', [])]);
  ok(ctx.mapFindSheet_(empty) === null, '  どちらも無ければ null');
  ctx.mapEnsureSheet_(empty, ['新地4']);
  ok(empty._sheets[ctx.MAP_TAB] !== undefined, '  そのときは、決めてある名前で作る');
}

console.log('■ 表が無い・読めないときでも止まらない');
{
  const ctx = makeCtx();
  let threw = false;
  try { ctx.mapLoadRegistry_(null); ctx.mapEnsureSheet_(null, ['新地4']); } catch (e) { threw = true; }
  ok(!threw, 'スプレッドシートが渡らなくても落ちない');
  const r = fakeRange();
  ctx.dbPlace_(r, '新地4');
  const nm = r.rich ? r.rich.text : r.value;
  ok(nm === '新地4', '名前は必ず残る', r);
}

console.log('■ リンクを作る途中で失敗したとき');
{
  const ctx = makeCtx({ richThrows: true });
  ctx.mapLoadRegistry_(fakeSS([fakeSheet(ctx.MAP_TAB, [HEAD, ['梅田', 'https://example.com/u', '登録ずみ', '']])]));
  const r = fakeRange();
  let threw = false;
  try { ctx.dbPlace_(r, '梅田'); } catch (e) { threw = true; }
  ok(!threw, 'レポート作成が止まらない');
  ok(r.value === '梅田', '失敗しても、名前だけは必ず入る', r);
}

console.log('■ 名前が無いとき');
{
  const ctx = makeCtx();
  ctx.mapLoadRegistry_(fakeSS([]));
  [null, undefined, ''].forEach(v => {
    const r = fakeRange();
    let threw = false;
    try { ctx.dbPlace_(r, v); } catch (e) { threw = true; }
    ok(!threw, JSON.stringify(v) + ' を渡しても落ちない');
  });
}

console.log('■ 呼び出しが消えていないか（付け忘れの見張り）');
{
  const calls = (SRC.match(/dbPlace_\(/g) || []).length - 1;   // 1つは関数そのものの定義
  ok(calls >= 3, '乗り場名を書く表の3か所すべてで dbPlace_ を使っている', calls);
  ok(/mapRegisteredUrl_\(spotName\)/.test(SRC), 'ヒートマップの見出しも登録制になっている');
  ok(!/mapUrlFor_\(txt\)/.test(SRC), '自動でさがした住所を、そのままリンクにしていない');
}

console.log(fail === 0 ? '\n全部そろっています' : '\n' + fail + ' 件おかしいところがあります');
process.exit(fail === 0 ? 0 : 1);
