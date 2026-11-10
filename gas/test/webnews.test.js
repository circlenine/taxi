/**
 * 台帳の「版」と「お知らせ」を確かめる（web/news.js）。
 *   実行: node gas/test/webnews.test.js
 *
 * ★なぜ要るのか（まーく様のご指示・2026/11/10）
 *     「バージョン情報を、タイトル横に小さく載せてほしいのと、
 *       アップデート情報のお知らせ欄も追加してください、
 *       アップデート内容は、乗務員に必要な、わかりやすい情報に
 *       だけまとめるかたちで載せて下さい」
 *
 *   いちばん こわいのは「直したのに、版を上げ忘れる」ことです。
 *   上げ忘れると、赤い点が出ず、**誰も直ったことに気づけません**。
 *   ここで、版とお知らせが食い違っていないかを見ます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (c, m, got) => {
  if (c) console.log('ok   ' + m);
  else { fail++; console.log('FAIL ' + m + (got === undefined ? '' : '　→ ' + JSON.stringify(got))); }
};

const W = path.join(__dirname, '..', '..', 'web');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(W, 'news.js'), 'utf8'), ctx);
const V = n => vm.runInContext(n, ctx);
const ver = V('APP_VERSION'), news = V('APP_NEWS');

console.log('■ 版の番号');
ok(typeof ver === 'string' && /^v\d+\.\d+$/.test(ver), '★版の番号が、v1.2 の形で入っている', ver);

console.log('■ お知らせ');
ok(Array.isArray(news) && news.length >= 1, '★お知らせが1つ以上ある', news && news.length);
ok(news[0] && news[0].v === ver,
   '★★★いちばん上のお知らせと、いま動いている版が同じ' +
   '（ここがずれると、直したのに赤い点が出ない）', [ver, news[0] && news[0].v]);

const seen = {};
news.forEach((n, i) => {
  ok(!!n.v && !!n.d, '　 ' + (n.v || '?') + ' に、版と日付がある');
  ok(Array.isArray(n.items) && n.items.length >= 1, '　 ' + n.v + ' に、中身が1つ以上ある');
  ok(!seen[n.v], '　 ' + n.v + ' が、二重に並んでいない');
  seen[n.v] = 1;
});

console.log('■ 乗務員の方に分かる言葉で書く');
/*
 * ★中の作りの言葉は、お知らせに出しません。
 *   読むのは乗務員の方で、プログラムの話は関わりがありません。
 */
const NG = ['RLS', 'SQL', 'カラム', 'テーブル', 'デプロイ', 'コミット', 'リポジトリ',
            'API', 'JSON', 'localStorage', 'Supabase', 'Vercel', 'GitHub',
            'バグ', 'リファクタ', '関数', '変数'];
news.forEach(n => (n.items || []).forEach(x => {
  const hit = NG.filter(w => String(x).indexOf(w) !== -1);
  ok(hit.length === 0, '　 中の作りの言葉が入っていない：' + String(x).slice(0, 24) + '…', hit);
}));

console.log('■ 画面に出す場所ができている');
const idx = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
ok(idx.indexOf('id="ver"') !== -1, '★題のとなりに、版を出す場所がある');
ok(idx.indexOf('data-t="news"') !== -1, '★お知らせのタブがある');
ok(idx.indexOf('news.js') !== -1, '　 お知らせの中身を読み込んでいる');
ok(app.indexOf('news:paneNews') !== -1, '★お知らせのタブを押すと、中身が出る');
ok(app.indexOf('newsSeen()') !== -1, '　 読んだら、赤い点が消える');

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
