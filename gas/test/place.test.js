/**
 * 乗り場の名前が空のものを、表に出さないことを確かめる。
 *   実行: node gas/test/place.test.js
 *
 * ★「集める側で1回はじく」だけでは足りず、実際に空欄の行が表に残っていた。
 *   名前を書き出す直前でも、もう一度はじく。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);
vm.runInContext('function logErr_(){}', ctx);
ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) };
ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); } };
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8'), ctx);

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

console.log('■ 名前として使えるかどうか');
{
  const H = ctx.dbHasPlace_;
  ok(H('新地4') === true, 'ふつうの乗り場名は通す');
  ok(H('') === false, '空は通さない');
  ok(H('   ') === false, '半角の空白だけも通さない');
  ok(H('　　') === false, '全角の空白だけも通さない');
  ok(H('\n') === false, '改行だけも通さない');
  ok(H(' 　\n ') === false, '空白と改行の混ざりも通さない');
  ok(H(null) === false, 'null でも落ちない');
  ok(H(undefined) === false, 'undefined でも落ちない');
  ok(H('-') === false, '「-」だけは名前ではない');
  ok(H('－') === false, '「－」（全角）だけも名前ではない');
  ok(H('ー') === false, '「ー」（長音）だけも名前ではない');
  ok(H('なし') === false, '「なし」は名前ではない');
  ok(H('不明') === false, '「不明」は名前ではない');
  ok(H('未入力') === false, '「未入力」は名前ではない');
  ok(H(' 新地4 ') === true, '前後に空白があっても、中身があれば通す');
  ok(H('ドン2') === true, '数字まじりも通す');
  ok(H('なしのみ屋前') === true, '「なし」で始まるだけの名前は、ちゃんと通す');
}

console.log('\n■ オプチャの一覧からも、名前の無いものを外す');
{
  const opucha = { spots: {
    '新地4': { count: 5, sales: 50000, max: 15000, at: '23:10' },
    '':      { count: 9, sales: 90000, max: 20000, at: '22:00' },   // 名前なし。件数は多い
    '　':    { count: 7, sales: 70000, max: 18000, at: '21:00' },   // 全角空白だけ
    '天満':  { count: 3, sales: 21000, max: 9000,  at: '01:00' }
  } };
  const top = ctx.opuchaTop_(opucha, 10);
  ok(top.length === 2, '名前のあるものだけ残る', top.map(x => x.name));
  ok(top.every(x => x.name.trim() !== ''), '  空の名前は1つも無い');
  ok(top[0].name === '新地4', '  並び順（件数の多い順）は変わらない');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
