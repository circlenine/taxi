/**
 * 「呼んでいるのに、どこにも無い関数」を見つける。
 *   実行: node gas/test/defined.test.js
 *
 * ★なぜこれが要るのか
 *   dbRich_ を足したつもりで、呼び出しだけが残っていたことがあった。
 *   JavaScript は「無い関数を呼ぶ行」があっても、その行を通るまでエラーにならない。
 *   だから構文チェックも素通りし、実際に送信したときにはじめて
 *   「dbRich_ is not defined」で止まった。
 *
 *   Apps Script は 001〜005 が同じ場所（グローバル）に並ぶので、
 *   どのファイルで定義していてもよい。ここでは全部をまとめて見る。
 */
const fs = require('fs'), path = require('path');

const GAS = path.join(__dirname, '..');
const files = fs.readdirSync(GAS).filter(f => /\.gs$/.test(f)).sort();

let src = '';
const byFile = {};
files.forEach(f => { byFile[f] = fs.readFileSync(path.join(GAS, f), 'utf8'); src += byFile[f] + '\n'; });

/* ---- 定義されている名前を集める ---- */
const defined = new Set();
// function なまえ_(
(src.match(/function\s+([A-Za-z_$][\w$]*_)\s*\(/g) || [])
  .forEach(m => defined.add(m.match(/function\s+([\w$]+)/)[1]));
// const / let / var なまえ_ =
(src.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*_)\s*=/g) || [])
  .forEach(m => defined.add(m.match(/\s+([\w$]+)\s*=/)[1]));
// 引数として受け取っているもの（function f(a_, b_) や (a_) => ）
(src.match(/function[^(]*\(([^)]*)\)/g) || []).forEach(m => {
  m.replace(/^function[^(]*\(/, '').replace(/\)$/, '').split(',').forEach(a => {
    const n = a.trim().split('=')[0].trim();
    if (/^[A-Za-z_$][\w$]*_$/.test(n)) defined.add(n);
  });
});

/* ---- 呼んでいる名前を集める（コメントと文字列は外す） ---- */
function strip(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')          // ブロックコメント
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')      // 行コメント（URLの // は残す）
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``')   // テンプレート文字列
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

let fail = 0;
const missing = [];
files.forEach(f => {
  const code = strip(byFile[f]);
  const re = /(^|[^\w$.])([A-Za-z_$][\w$]*_)\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[2];
    if (defined.has(name)) continue;
    if (name === 'function_' || /^(if|for|while|switch|catch|return|typeof)_$/.test(name)) continue;
    const line = code.slice(0, m.index).split('\n').length;
    missing.push(`${f}:${line}  ${name}()`);
  }
});

const uniq = Array.from(new Set(missing));
if (uniq.length) {
  fail = 1;
  console.log('FAIL  呼んでいるのに、どこにも定義が無い関数があります');
  uniq.forEach(x => console.log('   ' + x));
} else {
  console.log('ok   ' + files.join('・') + ' … 呼んでいる関数はすべて定義されている');
  console.log('ok   （見つけた定義 ' + defined.size + '個）');
}

/* ---- ついでに、同じ名前を2回宣言していないか ---- */
const names = [];
(src.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm) || [])
  .forEach(m => names.push(m.match(/function\s+([\w$]+)/)[1]));
const dup = Array.from(new Set(names.filter(n => names.filter(x => x === n).length > 1)));
if (dup.length) {
  fail = 1;
  console.log('FAIL  同じ名前の関数が2つあります（Apps Script はプロジェクト全体が止まります）');
  dup.forEach(n => console.log('   ' + n));
} else {
  console.log('ok   同じ名前の関数が2つある、ということもない（' + names.length + '個）');
}

console.log(fail ? '\n失敗' : '\n全テスト通過');
process.exit(fail);
