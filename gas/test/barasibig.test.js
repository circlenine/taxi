/**
 * バラシに出す会場が、大きい所だけになっているかを確かめる。
 *   実行: node gas/test/barasibig.test.js
 *
 * ★なぜ要るのか（まーく様のご指示・2026/11/12）
 *   「森ノ宮ピロティホールと、SkyシアターMBSは、バラシとしては
 *     除外してください、また同程度の大きさの小さい規模のものも
 *     バラシとして複数台呼ばれる確率が望まれないものは除いてください」
 *   小さい会場は、バラシでも車が複数台 呼ばれません。
 *   出すと、行っても仕事にならない場所へ向かわせてしまいます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
const a = src.indexOf('const VN_BARASI_BIG'), b = src.indexOf('/* ------------------------------------------------------------\n *  客層の控えは');
const box = { console }; vm.createContext(box); vm.runInContext(src.slice(a, b), box);
const B = v => vm.runInContext('vnBarasiBig_(' + JSON.stringify(v) + ')', box);
let ng = 0; const t = (c, m) => { console.log((c ? 'ok   ' : 'NG   ') + m); if (!c) ng++; };

console.log('■ 出す会場（まーく様が、実際に呼ばれたことのある大きさ）');
['大阪城ホール', 'なんばHatch', 'オリックス劇場', '京セラドーム大阪',
 'Asueアリーナ大阪', 'インテックス大阪', '万博記念公園'].forEach(function (v) {
  t(B(v) === true, '★★★出す：' + v);
});
console.log('■ 同じか、それより大きい会場');
['ヤンマースタジアム長居', 'ヨドコウ桜スタジアム', 'パナソニックスタジアム吹田',
 'エディオンアリーナ大阪', '舞洲アリーナ', '東和薬品RACTABドーム',
 '花園ラグビー場', 'グランキューブ大阪', 'Zepp Osaka Bayside', 'フェスティバルホール'].forEach(function (v) {
  t(B(v) === true, '　 出す：' + v);
});
console.log('■ 出さない会場（小さいライブ会場・劇場）');
['森ノ宮ピロティホール', 'SkyシアターMBS', 'サンケイホールブリーゼ',
 '梅田芸術劇場メインホール', '大阪松竹座', '新歌舞伎座', '大阪城音楽堂',
 'ビルボードライブ大阪', 'フェニーチェ堺', '', '（名前なし）'].forEach(function (v) {
  t(B(v) === false, '★★★出さない：' + (v || '（空っぽ）'));
});
console.log('■ 書き方のゆれ');
t(B('大阪城ホール ') === true,        '　 うしろの空白があっても出す');
t(B('なんば HATCH') === true,         '　 大文字・空白でも出す');
t(B('京セラドーム') === true,          '　 短く書いてあっても出す');
console.log(ng ? ('\n✗ ' + ng + '件 失敗') : '\n✓ すべて通りました');
process.exit(ng ? 1 : 0);
