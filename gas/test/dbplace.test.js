/**
 * まとめスプシの乗り場名に、Googleマップのリンクが付くことを確かめる。
 *   実行: node gas/test/dbplace.test.js
 *
 * ★記録用スプシと みんなの記録ページ には前から付けていたのに、
 *   いちばん見るまとめスプシには付け忘れていた。
 *   「作ったけれど、使うところに入れ忘れる」型の抜けだったので、
 *   dbPlace_ の動きだけでなく、呼び出しが消えていないかも見る。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8');

/* まとめスプシの見た目まわりだけを真似た、にせの SpreadsheetApp を作る。
   本物は動かせないので、「何を渡されたか」だけ覚えておく。 */
function fakeSpreadsheetApp(opt) {
  const o = opt || {};
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
    },
    _opt: o
  };
}

function makeCtx(withMapLink, richThrows) {
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);
  vm.runInContext('function logErr_(){}', ctx);
  ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) };
  ctx.SpreadsheetApp = fakeSpreadsheetApp();
  if (richThrows) {
    ctx.SpreadsheetApp.newRichTextValue = () => { throw new Error('リッチテキストが作れない'); };
  }
  // 002-Extras.gs（MapLink）が入っているとき／入っていないときの両方を見る
  if (withMapLink) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'parts', 'MapLink.gs'), 'utf8'), ctx);
  }
  vm.runInContext(SRC, ctx);
  return ctx;
}

function fakeRange() {
  const r = {
    value: undefined, rich: undefined, size: undefined, weight: undefined,
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

console.log('■ MapLink が入っているとき（ふだんの本番）');
{
  const ctx = makeCtx(true);
  const r = fakeRange();
  ctx.dbPlace_(r, '新地4');
  ok(!!r.rich, '文字ではなく、リンク付きの形で入る', r.value);
  ok(r.rich && r.rich.text === '新地4', '乗り場の名前はそのまま残る', r.rich && r.rich.text);
  const link = r.rich && r.rich.links[0];
  ok(!!link, 'リンクが1つ張られている');
  ok(link && link[0] === 0 && link[1] === '新地4'.length, '名前の全部にリンクが掛かっている', link);
  ok(link && /^https:\/\/www\.google\.com\/maps\//.test(link[2]), 'Googleマップの住所である', link && link[2]);
  ok(link && decodeURIComponent(link[2]).indexOf('北新地') !== -1, '新地4 は 北新地 を指す', link && link[2]);

  const r2 = fakeRange();
  ctx.dbPlace_(r2, '西中ダイエー前');
  const l2 = r2.rich && r2.rich.links[0];
  ok(!!l2, '対応表に無い乗り場でも、検索のリンクは張る');
  ok(l2 && decodeURIComponent(l2[2]).indexOf('大阪市') !== -1, '対応表に無いものは大阪市を付けて探す', l2 && l2[2]);
}

console.log('■ MapLink が入っていないとき（002-Extras.gs が古い）');
{
  const ctx = makeCtx(false);
  ok(typeof ctx.mapUrlFor_ !== 'function', '前提：mapUrlFor_ が無い状態にできている');
  const r = fakeRange();
  ctx.dbPlace_(r, '新地4');
  ok(r.value === '新地4', 'リンクは付かなくても、名前は必ず残る', r);
  ok(r.rich === undefined, 'リンクの形にはしない');
}

console.log('■ リンクを作る途中で失敗したとき');
{
  const ctx = makeCtx(true, true);
  const r = fakeRange();
  let threw = false;
  try { ctx.dbPlace_(r, '梅田'); } catch (e) { threw = true; }
  ok(!threw, 'レポート作成が止まらない');
  ok(r.value === '梅田', '失敗しても、名前だけは必ず入る', r);
}

console.log('■ 名前が無いとき');
{
  const ctx = makeCtx(true);
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
  ok(/setLinkUrl\(/.test(SRC), 'ヒートマップの見出しにもリンクを張っている');
}

console.log(fail === 0 ? '\n全部そろっています' : '\n' + fail + ' 件おかしいところがあります');
process.exit(fail === 0 ? 0 : 1);
