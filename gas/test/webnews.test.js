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

const t = ok;                                   // 書き味をそろえるための別名
const W = path.join(__dirname, '..', '..', 'web');
const G = path.join(__dirname, '..');            // gas/ の中（スプシ→台帳の係）
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

console.log('■ 読み込むだけで、画面をいじらない');
{
  /*
   * ★なぜ要るか（2026/11/10・同じ失敗を2回しました）
   *   画面を触る命令を、ファイルのいちばん外側に置いたせいで、
   *   画面の無いところ（検査）で丸ごと落ちました。
   *   1つの飾りのために、ほかの検査まで止まるのは割に合いません。
   *
   *   ここでは「からっぽの画面」を渡して、読み込むだけで
   *   落ちないことを見ます。中身の無い画面でも、
   *   ボタンを待つところまでは通れるはず、という線引きです。
   */
  const stub = () => {
    const el = { textContent:'', innerHTML:'', value:'', hidden:false, style:{},
                 className:'', dataset:{}, classList:{ toggle(){}, add(){}, remove(){} },
                 setAttribute(){}, getAttribute(){ return null; }, addEventListener(){},
                 appendChild(){}, insertBefore(){}, querySelector(){ return null; },
                 querySelectorAll(){ return []; }, closest(){ return null; } };
    const doc = { readyState:'complete', body: el, head: el,
                  addEventListener(){}, createElement(){ return stubEl(); },
                  getElementById(){ return null; },
                  querySelector(){ return null; }, querySelectorAll(){ return []; },
                  createRange(){ return { selectNodeContents(){} }; } };
    function stubEl(){ return Object.assign({}, el); }
    const win = { addEventListener(){}, matchMedia(){ return { matches:false }; },
                  getSelection(){ return { removeAllRanges(){}, addRange(){} }; },
                  open(){}, localStorage:{ getItem(){ return null; }, setItem(){} },
                  supabase:{ createClient(){ return { auth:{ getSession: async()=>({data:{}}) } }; } },
                  SUPABASE_URL:'https://x.example', SUPABASE_ANON_KEY:'k' };
    return { document: doc, window: win, localStorage: win.localStorage,
             navigator: { geolocation: null }, location: { href:'', pathname:'/' },
             fetch: async () => ({ ok:false, json: async()=>({}) }),
             setInterval(){}, setTimeout(){}, requestAnimationFrame(){},
             console: { log(){}, error(){}, warn(){} } };
  };
  ['news.js', 'shared.js', 'app.js'].forEach(function (f) {
    const code = fs.readFileSync(path.join(W, f), 'utf8');
    const box = stub();
    box.globalThis = box;
    vm.createContext(box);
    let err = '';
    try { vm.runInContext(code, box); } catch (e) { err = (e && e.message) || String(e); }
    ok(!err, '★★★' + f + ' は、からっぽの画面でも読み込める', err);
  });
}

console.log('■ 変顔は100通りある');
{
  /*
   * ★まーく様のご指示（2026/11/10）：「ランダムパターンは100通りいけますか」
   *   目10通り × 口10通り で、ちょうど100通りにしてあります。
   *   うっかり減らすと100を割るので、ここで押さえます。
   */
  const code = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const a = code.indexOf('const FACE_EYES');
  const b = code.indexOf('/** 変顔を1つ描く');
  ok(a !== -1 && b > a, '★顔の中身が、ちゃんと見つかる');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(code.slice(a, b) +
      '\nglobalThis.OUT={e:FACE_EYES.length,m:FACE_MOUTH.length,p:FACE_PATTERNS,s:SAY_LINES.length};', box);
    const o = box.OUT;
    ok(o.p >= 100, '★★★顔が100通り以上ある', o.p);
    ok(o.e * o.m === o.p, '　 目×口で数えている', [o.e, o.m, o.p]);
    ok(o.s >= 10, '　 セリフも10通り以上ある', o.s);
  }
}


console.log('■ 続けて同じ顔・同じセリフは出ない（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「ランダム表示ですが、顔、セリフ両方とも、
   *       続けて同じものが出てこないようにしてください」
   *   pick() を何百回も回して、1回でも「2回続けて同じ」が出たら こけます。
   */
  const code = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const a = code.indexOf('const FACE_EYES');
  const b = code.indexOf('/** 変顔を1つ描く');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(code.slice(a, b) + `
      globalThis.OUT = (function(){
        var bad = 0, seen = {}, arrs = [FACE_EYES, FACE_MOUTH, SAY_LINES, KIRA_NAMES];
        for (var k = 0; k < arrs.length; k++) {
          var prev = null, kinds = {};
          for (var i = 0; i < 400; i++) {
            var v = pick(arrs[k]);
            if (v === prev) bad++;
            prev = v; kinds[v] = 1;
          }
          seen[k] = Object.keys(kinds).length;
        }
        return { bad: bad, kinds: seen, kira: KIRA_NAMES.length };
      })();`, box);
    const o = box.OUT;
    t(o.bad === 0, '★★★2回続けて同じものは、1度も出ない', o.bad);
    t(o.kinds[0] === 10 && o.kinds[1] === 10, '　 それでも、目も口も ぜんぶ出てくる', o.kinds);
    t(o.kinds[3] === 6 && o.kira === 6, '　 キラの名前は6人ぶん', o.kira);
  } else {
    t(false, '★顔の中身が見つからない');
  }
}

console.log('■ 0〜6時までが「その夜の続き」（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「0時～11時ではなく、0時～06時に入力した時刻としてください」
   *   6:00 までは翌日（24時以降）あつかい。6時すぎは そのまま朝の時刻。
   *   ここが web と GAS でずれると、同じ乗車が二重に入ります。
   */
  const code = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const a = code.indexOf('function parseT');
  const b = code.indexOf('/* 時間単価');
  t(a !== -1 && b > a, '★時刻を読むところが見つかる');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(code.slice(a, b) + `
      globalThis.P = { a: parseT('1:30'), b: parseT('600'), c: parseT('630'),
                       d: parseT('2530'), e: parseT('1130'), f: parseT('3020') };`, box);
    const P = box.P;
    t(P.a === 25.5,  '★★★1:30 → 25:30（その夜の続き）', P.a);
    t(P.b === 30,    '★★★6:00 → 30:00（まだ その夜）', P.b);
    t(P.c === 6.5,   '★★★6:30 → 6:30（もう朝あつかい）', P.c);
    t(P.e === 11.5,  '★★★11:30 → 11:30（24時以降にしない）', P.e);
    t(P.d === 25.5,  '　 25:30 は そのまま', P.d);
    t(P.f === 30 + 20 / 60, '　 30:20 の書き方も入る', P.f);
  }

  /* GAS側（スプシ→台帳）も、同じ数え方になっているか */
  const up = fs.readFileSync(path.join(G, '005-Updater.gs'), 'utf8');
  t(/if \(dep <= 6\) dep \+= 24;/.test(up),
    '★★★スプシ→台帳も「0〜6時」で数えている');
  t(!/if \(dep < 12\) dep \+= 24;/.test(up),
    '　 古い「0〜11時」の数え方は残っていない');
}

console.log('■ 入れる欄のタブ（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「待ち時間や乗車時間は100分まで追加してください」
   *     「種類に、途中乗り、も追加してください」
   */
  const code = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const a = code.indexOf("const METHODS =");
  const b = code.indexOf("/** 書き方のゆれを");
  t(a !== -1 && b > a, '★タブの中身が見つかる');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(code.slice(a, b) + `
      globalThis.C = { chips: MIN_CHIPS, all: MIN_ALL,
                       m: METHOD_CHIPS, names: METHOD_CHIP_NAMES, ms: METHODS };`, box);
    const C = box.C;
    t(Math.max.apply(null, C.chips) === 100, '★★★分のタブが100分まである', Math.max.apply(null, C.chips));
    t(Math.max.apply(null, C.all) === 100,   '★★★欄を押したときの候補も100分まで', Math.max.apply(null, C.all));
    t(C.m.indexOf('途中乗り') !== -1,        '★★★種類のタブに「途中乗り」がある', C.m.join('/'));
    t(C.m.indexOf('流し') === -1,            '　 「流し」は出していない（ご指示）');
    t(C.m.length === C.names.length,
      '★★★タブに並べた名前が、ぜんぶ METHODS にある（書きまちがいなし）',
      C.names.filter(function(x){ return C.ms.indexOf(x) === -1; }).join('/') || 'ぜんぶある');
  }
}

console.log('■ からっぽのときの言い方（ご指示・2026/11/11）');
{
  const code = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(code.indexOf('該当データがありません') !== -1, '★★★「該当データがありません」と出す');
  t(code.indexOf('まず1回ぶん入れてみる') === -1, '　 古い言い方は残っていない');
}

console.log('■ 題の下の一文（ご指示・2026/11/11）');
{
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  t(/id="sub"/.test(html), '★★★名前を入れ替える場所（id="sub"）がある');
  const sh = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  t(sh.indexOf('ワンメータを乗せたら') !== -1, '★★★ご指示の一文が入っている');
  t(sh.indexOf('function subRoll') !== -1, '　 開くたびに書き換える係がいる');
}

console.log('■ ふきだしは2行ぶんの高さで固定（ご指摘・2026/11/11）');
{
  /*
   * ★まーく様のご指摘（2026/11/11）
   *     「ふきだし、2行の高さで統一してください、高さがズレて、
   *       全体がその度ズレるのがイライラします、顔のサイズも統一してください」
   *   min-height だけだと、1行と2行で高さが変わって、まわりが動きます。
   */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  /* ★高さを決めている書き方を、ひとつ ひとつ 見ます。
       ぜんぶ つなげて見ると、どこか1つに height があるだけで
       通ってしまい、min-height だけの書き方を見逃します
       （実際に見逃しました・2026/11/11）。 */
  const bubs = css.split('.saymount .bubble{').slice(1)
                  .map(function (x) { return x.split('}')[0]; });
  t(bubs.length >= 1, '★ふきだしの書き方が見つかる', bubs.length);
  const ng = bubs.filter(function (x) {
    /* 高さの話をしていない所は見ません。
       「line-height」は字の行の高さなので、ここでは数えません。 */
    if (!/(^|[;\s])(min-|max-)?height:/.test(x)) return false;
    const h  = (x.match(/[^-]height:(\d+)px/)  || [])[1];
    const mn = (x.match(/min-height:(\d+)px/) || [])[1];
    const mx = (x.match(/max-height:(\d+)px/) || [])[1];
    return !(h && mn && mx && h === mn && h === mx); // 3つそろって、同じ数でないと ダメ
  });
  t(ng.length === 0,
    '★★★高さを決めている所は、ぜんぶ「同じ数で3つそろって」いる' +
    '（min-height だけだと、1行と2行で高さが変わります）', ng);
  t(bubs.some(function (x) { return /height:\d+px/.test(x); }),
    '　 高さを決めている所が、ちゃんとある');
  t(/-webkit-line-clamp:2/.test(css), '★★★字は2行までで止める');
  const face = css.split('.saymount .face{').slice(1)
                  .map(function (x) { return x.split('}')[0]; }).join(';');
  t(/width:\d+px/.test(face) && /height:\d+px/.test(face),
    '★★★顔の大きさが決め打ちになっている');
}

console.log('■ 営業日の欄が、わくからはみ出さない（ご指摘・2026/11/11）');
{
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(/\.f\{[^}]*min-width:0/.test(css), '★★★欄のわくが、中身に押し広げられない');
  t(/input\[type=date\]\{[^}]*max-width:100%/.test(css), '★★★日付の欄が、わくに収まる');
  t(/\.f\.fdate\{grid-column:1 \/ -1\}/.test(css), '★★★細い画面では、営業日を横1列ぜんぶ使う');
  t(/class="f w2 fdate"/.test(app), '　 営業日の欄に、その目じるしが付いている');
}


console.log('■ ふきだしは ぼやき→ありがとう の交互（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「ネガティブばかりだと、嫌な気分になるので
   *       ポジティブワード(乗車して良かった言葉)も
   *       ランダムで100通り作ってください
   *       ネガティブ→ポジティブ→ネガティブ→ポジティブ…と、
   *       連続するようにしてください」
   */
  const code = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const a = code.indexOf('const FACE_EYES');
  const b = code.indexOf('/** 変顔を1つ描く');
  t(a !== -1 && b > a, '★ひとことの中身が見つかる');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(code.slice(a, b) + `
      globalThis.S = (function(){
        var seq = [], badSeen = {}, goodSeen = {};
        for (var i = 0; i < 400; i++) {
          var v = sayNext();
          seq.push(v.good ? 'G' : 'B');
          (v.good ? goodSeen : badSeen)[v.t] = 1;
        }
        var okAlt = true;
        for (var j = 1; j < seq.length; j++) if (seq[j] === seq[j-1]) okAlt = false;
        return { bad: SAY_BAD.length, good: SAY_GOOD.length, alt: okAlt,
                 first: seq[0], kindsB: Object.keys(badSeen).length,
                 kindsG: Object.keys(goodSeen).length,
                 dup: SAY_BAD.filter(function(x){ return SAY_GOOD.indexOf(x) !== -1; }).length };
      })();`, box);
    const S = box.S;
    t(S.good === 100, '★★★ありがとうのひとことが、ちょうど100通りある', S.good);
    t(S.bad === 100,  '★★★ぼやきも100通りある（片方だけ少ないと、すぐ同じのが戻る）', S.bad);
    t(S.alt === true, '★★★かならず「ぼやき→ありがとう」の交互になる');
    t(S.first === 'B', '　 はじめは ぼやきから', S.first);
    t(S.dup === 0, '　 同じ文が、両方に入っていない', S.dup);
    t(S.kindsB > 60 && S.kindsG > 60, '　 どちらも、ちゃんと散らばる', [S.kindsB, S.kindsG]);
  }
}

console.log('■ 字は真っ白（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「webサイトの文字は全て真っ白文字にしてください、
   *       まだ視認性が悪いです
   *       ただし、選択前のタグであれば、ちょい薄グレーで良いです」
   *   暗い車内で、走りながら読むものです。うすい灰色は読めません。
   */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  const v = n => { const m = root.match(new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{3,8})')); return (m ? m[1] : '').toUpperCase(); };
  t(v('paper') === '#FFFFFF', '★★★ふつうの字が、真っ白', v('paper'));
  t(v('muted') === '#FFFFFF', '★★★そえ字も、真っ白（ここが灰色だと読めない）', v('muted'));
  t(/--chipoff:/.test(root), '★まだ押していないタグ用の色がある');
  t(/\.chip\{[^}]*color:var\(--chipoff\)/.test(css), '★★★押していないタグだけ、ちょい薄グレー');
  t(/nav button\{[^}]*color:var\(--chipoff\)/.test(css), '　 選んでいない見出しのタブも、同じ扱い');
}

console.log('■ 題の下の一文は、スマホで1行（ご指示・2026/11/11）');
{
  const sh = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  t(sh.indexOf('誰かワンメータを乗せたら') !== -1, '★★★「誰かが」ではなく「誰か」');
  t(sh.indexOf("'近日中、誰かがワンメータ") === -1,
    '　 古い書き方（誰かが）で組み立てていない');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/\.sub\{[^}]*font-size:clamp\(/.test(css),
    '★★★画面が細いほど字を小さくして、1行に収める');
}

console.log('■ 記録の入口（ご指示・2026/11/11）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(app.indexOf('あと35秒…') !== -1, '★★★見出しが「あと35秒…」になっている');
  t(app.indexOf('<h2>1回ぶんを残す</h2>') === -1, '　 古い見出しは残っていない');
  t(/NOTE_CHIPS = \[[^\]]*行先：/.test(app), '★★★「他」のタブに「行先：」がある');
  t(/：\$\/\.test\(val\)/.test(app), '★★★「：」で終わるタグは、続きを打てる（入れ替えない）');
  t(app.indexOf('function mapUrl') !== -1, '★★★場所を地図で開く係がある');
  t(app.indexOf('google.com/maps/search') !== -1, '　 Googleマップの住所を組み立てている');
  t(app.indexOf('placeLink(r.place)') !== -1, '★★★一覧の場所を押すと、地図へ飛ぶ');
  t(app.indexOf('PLACE_OK_KEY') !== -1, '★★★「同じ名前なら同じ場所」の印がある');
}

console.log('■ ごいけんと、イベントの出し直し（ご指示・2026/11/11）');
{
  const app  = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  t(/data-t="fb"/.test(html), '★★★【ごいけん】の入口がある');
  t(app.indexOf('function paneFb') !== -1, '　 その中身もある');
  t(/fb:paneFb/.test(app), '★★★押したら、ちゃんとそこが開く');
  t(app.indexOf("db.from('feedback')") !== -1, '★★★書いたものが、台帳にたまる');
  const sql = fs.readFileSync(path.join(W, 'supabase', 'schema.sql'), 'utf8');
  t(/create table if not exists public\.feedback/.test(sql), '★★★置き場の作り方が書いてある');
  t(/feedback_select[\s\S]{0,200}is_admin\(\)/.test(sql),
    '★★★読めるのは、自分のぶんと まーく様だけ');
  const adm = fs.readFileSync(path.join(W, 'admin.js'), 'utf8');
  t(adm.indexOf('async function loadFb') !== -1, '★★★管理の画面で、ごいけんが読める');

  t(app.indexOf('evAgain') !== -1,
    '★★★「今日はもう表示しない」にしても、イベントを出し直せる');
}

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
