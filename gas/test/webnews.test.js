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

console.log('■ 顔100×2・ひとこと100×2（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「ポジティブセリフ100通り／ポジティブ顔100通り
   *       ネガティブセリフ100通り／ネガティブ顔100通り
   *       にできませんか？」
   *   顔も、ひとことに合わせて しかめ顔／笑い顔 に分かれます。
   */
  const code = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const a = code.indexOf('const FACE_BAD_EYES');
  const b = code.indexOf('/* ------------------------------------------------------------\n *  ふきだしの字の大きさ');
  t(a !== -1 && b > a, '★顔とひとことの中身が、ちゃんと見つかる');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(code.slice(a, b) + `
      globalThis.OUT = { be:FACE_BAD_EYES.length, bm:FACE_BAD_MOUTH.length,
        ge:FACE_GOOD_EYES.length, gm:FACE_GOOD_MOUTH.length,
        bp:FACE_BAD_PATTERNS, gp:FACE_GOOD_PATTERNS,
        sb:SAY_BAD.length, sg:SAY_GOOD.length,
        kaoB:faceSvg(false), kaoG:faceSvg(true),
        kasanari: FACE_BAD_EYES.filter(function(x){ return FACE_GOOD_EYES.indexOf(x)!==-1; }).length
                + FACE_BAD_MOUTH.filter(function(x){ return FACE_GOOD_MOUTH.indexOf(x)!==-1; }).length };`, box);
    const o = box.OUT;
    t(o.bp === 100, '★★★ぼやきの顔が、ちょうど100通り', o.bp);
    t(o.gp === 100, '★★★ありがとうの顔が、ちょうど100通り', o.gp);
    t(o.sb === 100, '★★★ぼやきのひとことが、ちょうど100通り', o.sb);
    t(o.sg === 100, '★★★ありがとうのひとことが、ちょうど100通り', o.sg);
    t(o.be === 10 && o.bm === 10 && o.ge === 10 && o.gm === 10,
      '　 どれも 目10 × 口10 で数えている', [o.be, o.bm, o.ge, o.gm]);
    t(o.kasanari === 0, '★★★しかめ顔と笑い顔に、同じ部品を混ぜていない', o.kasanari);
    t(/<svg/.test(o.kaoB) && /<svg/.test(o.kaoG), '　 どちらの顔も、ちゃんと描ける');
  }
  /* 顔は、ひとことの気分に合わせて変える */
  const sh = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  t(/faceSvg\(say\.good\)/.test(sh),
    '★★★ひとことに合わせて、顔も切りかえている（ぼやき＝しかめ顔）');
  t(/function faceSvg\(good\)/.test(sh), '　 顔を描く係が、気分を受け取る形になっている');
}

console.log('■ 顔とひとことの一覧（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「セリフと顔の各パターンの一覧を
   *       別ファイルか何かで見られる形にしてもらえますか」
   *   /say で開ける紙を作ってあります。
   *   ★中身は web/shared.js の写しです。ずれると意味が無いので、
   *     ここで「ぴたり同じ」ことを押さえます。
   */
  const html = path.join(W, 'say.html');
  t(fs.existsSync(html), '★★★一覧のページがある（/say）');
  const faces = path.join(W, 'shared-faces.js');
  t(fs.existsSync(faces), '★★★一覧が読む、顔とひとことの紙がある');
  if (fs.existsSync(faces)) {
    const src = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
    const cut = fs.readFileSync(faces, 'utf8');
    const a2 = src.indexOf('const FACE_BAD_EYES');
    const b2 = src.indexOf('/* ------------------------------------------------------------\n *  ふきだしの字の大きさ');
    const want = src.slice(a2, b2).replace(/\s+$/, '');
    t(cut.indexOf(want) !== -1,
      '★★★一覧の中身は、本体（shared.js）とぴたり同じ' +
      '（ずれたら tools/build_faces.py を走らせ直す）');
    const box2 = { console: { log: function(){} } };
    vm.createContext(box2);
    let err = null;
    try { vm.runInContext(cut, box2); } catch (e) { err = (e && e.message) || String(e); }
    t(!err, '★★★一覧の紙だけで、ちゃんと読み込める（台帳につながなくても動く）', err);
  }
  if (fs.existsSync(html)) {
    const h = fs.readFileSync(html, 'utf8');
    t(/shared-faces\.js/.test(h), '　 一覧は、その紙を読んでいる');
    t(!/supabase/i.test(h), '　 台帳にはつながない（見るだけの紙）');
  }
  {
    /* お知らせの画面から、一覧へ行けること（URLを覚えなくてよいように） */
    const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
    t(/href="\/say"/.test(app), '★★★【お知らせ】から、一覧を開けるようにしてある');
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
  const a = code.indexOf('const FACE_BAD_EYES');
  const b = code.indexOf('/* ------------------------------------------------------------\n *  ふきだしの字の大きさ');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(code.slice(a, b) + `
      globalThis.OUT = (function(){
        var bad = 0, seen = {}, arrs = [FACE_BAD_EYES, FACE_BAD_MOUTH,
          FACE_GOOD_EYES, FACE_GOOD_MOUTH, SAY_BAD, SAY_GOOD, KIRA_NAMES];
        for (var k = 0; k < arrs.length; k++) {
          var prev = null, kinds = {};
          for (var i = 0; i < 2500; i++) {
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
    t(o.kinds[0] === 10 && o.kinds[1] === 10 && o.kinds[2] === 10 && o.kinds[3] === 10,
      '　 それでも、目も口も ぜんぶ出てくる（しかめ顔・笑い顔とも）', o.kinds);
    t(o.kinds[4] === 100 && o.kinds[5] === 100,
      '　 ひとことも、100通りぜんぶ出てくる', [o.kinds[4], o.kinds[5]]);
    t(o.kinds[6] === 6 && o.kira === 6, '　 キラの名前は6人ぶん', o.kira);
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
    /* ★タグが多すぎると「嫌に見えてくる」とのご指示（2026/11/12）。
       0〜60分の13個までにして、2行に収めます。 */
    t(Math.max.apply(null, C.chips) === 60, '★★★分のタグは60分まで', Math.max.apply(null, C.chips));
    t(C.chips.length <= 13, '★★★タグは13個まで（2行に収める）', C.chips.length);
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
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「右上のふきだしの枠の高さ幅ですが
   *       TAXI NOTEのフォントの高さに合わせられませんか」
   *   題の大きさは --logo で1か所に決め、ふきだしの高さは
   *   そこから計算します（大きさ × 1.2 ＝ 字の高さ）。
   *   ★高さを題にそろえたので、中身は1行です。
   */
  t(/:root\{--logo:\d/.test(css), '★題の大きさを、1か所で決めている（もとの数）');
  t(/@media\(max-width:640px\)\{:root\{--logo:clamp\(/.test(css),
    '　 細い画面でも、同じ1か所で決めている');
  t(/h1\.dn\{[^}]*font-size:var\(--logo\)/.test(css), '　 題は、その数を使っている');
  const bubs = css.split('.saymount .bubble{').slice(1)
                  .map(function (x) { return x.split('}')[0]; });
  const hs = bubs.filter(function (x) { return /(^|[;\s])height:/.test(x); });
  t(hs.length >= 1, '★ふきだしの高さを決めている所がある', hs.length);
  t(hs.every(function (x) {
      return /[^-]height:calc\(var\(--logo\) \* 1\.2\)/.test(x)
          && /min-height:calc\(var\(--logo\) \* 1\.2\)/.test(x)
          && /max-height:calc\(var\(--logo\) \* 1\.2\)/.test(x); }),
    '★★★ふきだしの高さは、題の字の高さとぴたり同じ（3つそろえて動かない）');
  t(/\.saymount \.bubble \.t\{[^}]*white-space:nowrap/.test(css),
    '★★★中身は1行（高さを題にそろえたので、2行は入らない）');
  const sh2 = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  t(/function sayFit\(mount\)\{|function sayFit\(mount\) \{/.test(sh2),
    '★★★字の大きさを、入る大きさに合わせる係がある');
  t(/\n\s*sayFit\(mount\);/.test(sh2),
    '★★★ひとことを入れ替えたら、ちゃんと呼んでいる（作っただけでは効かない）');
  t(/_sayWidest/.test(sh2),
    '★★★いちばん「太い」ひとことで合わせる（字数が多い＝太い ではない）');
  t(/addEventListener\('resize'/.test(sh2),
    '　 画面の向きを変えたら、測り直す');
  /*
   * ★しくじり（2026/11/11）：字をインターネットから取り寄せる前に測ると、
   *   間に合わせの字で測ってしまい、本物に変わったときに はみ出しました。
   *   実際に、320pxの画面で25通りが切れました。
   */
  t(/document\.fonts\.ready\.then\(refit\)/.test(sh2),
    '★★★字が届いてから、測り直す（届く前に測ると はみ出す）');
  t(/_sayWidest = ''/.test(sh2.slice(sh2.indexOf('const refit'))),
    '　 測り直すときは、いちばん太いひとことも選び直す');
  t(!/-webkit-line-clamp:2/.test(css), '　 2行で止める古い書き方は残っていない');
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
  const a = code.indexOf('const FACE_BAD_EYES');
  const b = code.indexOf('/* ------------------------------------------------------------\n *  ふきだしの字の大きさ');
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
                 dup: SAY_BAD.filter(function(x){ return SAY_GOOD.indexOf(x) !== -1; }).length,
                 maxlen: Math.max.apply(null, SAY_BAD.concat(SAY_GOOD).map(function(x){ return x.length; })),
                 sameLen: SAY_BAD.concat(SAY_GOOD).length -
                          Object.keys(SAY_BAD.concat(SAY_GOOD).reduce(function(o,x){o[x]=1;return o;},{})).length };
      })();`, box);
    const S = box.S;
    t(S.good === 100, '★★★ありがとうのひとことが、ちょうど100通りある', S.good);
    t(S.bad === 100,  '★★★ぼやきも100通りある（片方だけ少ないと、すぐ同じのが戻る）', S.bad);
    t(S.alt === true, '★★★かならず「ぼやき→ありがとう」の交互になる');
    t(S.first === 'B', '　 はじめは ぼやきから', S.first);
    t(S.dup === 0, '　 同じ文が、両方に入っていない', S.dup);
    /*
     * ★ふきだしの高さを題にそろえたので、中身は1行です（2026/11/11）。
     *   長いひとことは、1行に入りません。12字までにそろえてあります。
     */
    t(S.maxlen <= 12, '★★★ひとことは12字まで（1行に収めるため）', S.maxlen);
    t(S.sameLen === 0, '　 同じ文が、同じ側にも入っていない', S.sameLen);
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
  /* ★2026/11/11 ご指示：「誰かが、のままでも1行でしたので ここはそのままで良いです」
       「○○くんがキラです → 〝○○くん〟がキラです」
       「○○くんの変更回数は1日1回にしてください」 */
  t(sh.indexOf('誰かがワンメータを乗せたら') !== -1, '★「誰かが」のまま');
  t(/〝' \+ kiraToday\(\) \+ '〟がキラです/.test(sh),
    '★★★名前を〝 〟ではさんでいる');
  t(sh.indexOf('function kiraToday') !== -1, '★★★名前は、その日いちど決めたら変わらない');
  t(/KIRA_KEY/.test(sh) && /localStorage/.test(sh.slice(sh.indexOf('function kiraToday'))),
    '　 その日ぶんを、端末に覚えている');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/\.sub\{[^}]*font-size:clamp\(/.test(css),
    '★★★画面が細いほど字を小さくして、1行に収める');
}

console.log('■ 記録の入口（ご指示・2026/11/11）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(app.indexOf('<h2>乗車データ</h2>') !== -1, '★★★見出しが「乗車データ」になっている');
  t(app.indexOf('<h2>1回ぶんを残す</h2>') === -1, '　 古い見出しは残っていない');
  t(/NOTE_CHIPS = \[[^\]]*行先：/.test(app), '★★★「他」のタブに「行先：」がある');
  t(/：\$\/\.test\(val\)/.test(app), '★★★「：」で終わるタグは、続きを打てる（入れ替えない）');
  t(app.indexOf('function mapUrl') !== -1, '★★★場所を地図で開く係がある');
  t(app.indexOf('google.com/maps/search') !== -1, '　 Googleマップの住所を組み立てている');
  t(app.indexOf('placeLink(r.place)') !== -1, '★★★一覧の場所を押すと、地図へ飛ぶ');
  t(app.indexOf('PLACE_OK_KEY') !== -1, '★★★「同じ名前なら同じ場所」の印がある');
}

console.log('■ フィードバックと、イベントの出し直し（ご指示・2026/11/11）');
{
  const app  = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  t(/data-t="fb"/.test(html), '★★★【フィードバック】の入口がある');
  t(app.indexOf('function paneFb') !== -1, '　 その中身もある');
  t(/fb:paneFb/.test(app), '★★★押したら、ちゃんとそこが開く');
  t(app.indexOf("db.from('feedback')") !== -1, '★★★書いたものが、台帳にたまる');
  const sql = fs.readFileSync(path.join(W, 'supabase', 'schema.sql'), 'utf8');
  t(/create table if not exists public\.feedback/.test(sql), '★★★置き場の作り方が書いてある');
  t(/feedback_select[\s\S]{0,200}is_admin\(\)/.test(sql),
    '★★★読めるのは、自分のぶんと まーく様だけ');
  const adm = fs.readFileSync(path.join(W, 'admin.js'), 'utf8');
  t(adm.indexOf('async function loadFb') !== -1, '★★★管理の画面で、フィードバックが読める');

  t(app.indexOf('evAgain') !== -1,
    '★★★「今日はもう表示しない」にしても、イベントを出し直せる');
}


console.log('■ 下見用のページ（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「変更前に、僕に最終確認をとる形にして、
   *       プレビュー用ページの作成も作るようにしてください」
   *   ★本番と見分けがつかないと事故のもとなので、
   *     いちばん上に赤い帯が出ることを押さえます。
   */
  const dir = path.join(W, 'preview');
  t(fs.existsSync(dir), '★★★下見用のページがある');
  if (fs.existsSync(dir)) {
    ['index.html','app.js','shared.js','style.css','news.js','config.js']
      .forEach(function (f) {
        t(fs.existsSync(path.join(dir, f)), '　 ' + f + ' がそろっている');
      });
    const h = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    t(/pvbar/.test(h) && /下見用/.test(h), '★★★「下見用」と、はっきり出る');
    t(/<title>TAXI NOTE（下見）<\/title>/.test(h), '　 題でも見分けられる');
    const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    t(/\.pvbar\{/.test(css), '　 その帯の見た目も入っている');
  }
  /* 見本の字（まだ入れていない欄）も、読める明るさにする */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/::placeholder\{color:var\(--chipoff\)/.test(css),
    '★★★入れる前の見本の字も、読める明るさ');
}


console.log('■ 分からない欄は「不明」（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「また、不明点は抜かしてもよい。」
   *     「空白部分は「不明」扱いにしてください」
   *
   *   ★いちばん怖いのは「不明」を 0 として数えることです。
   *     待ち0分（即乗せ）と、待ち時間が分からない、は別もの。
   *     0として数えると、平均も時間単価も下がって、嘘の数字になります。
   */
  const sh = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const a = sh.indexOf('const UNK');
  const b = sh.indexOf('function bizToday');
  t(a !== -1 && b > a, '★「不明」のあつかいが見つかる');
  if (a !== -1 && b > a) {
    const box = { console: { log: function(){} } };
    vm.createContext(box);
    vm.runInContext(
      'const pad=n=>String(n).padStart(2,"0");' +
      'const yen=n=>"¥"+Math.round(n).toLocaleString("ja-JP");' +
      'const fmtT=d=>{const h=Math.floor(d+1e-9);let m=Math.round((d-h)*60);' +
      'return pad(m===60?h+1:h)+":"+pad(m===60?0:m);};' +
      sh.slice(a, b) + `
      globalThis.U = {
        zero:  rate({ fare: 1000, wait: 0,    ride: 10 }),
        unkW:  rate({ fare: 1000, wait: null, ride: 10 }),
        unkF:  rate({ fare: null, wait: 5,    ride: 10 }),
        t:     [showT(null), showT(25.5)],
        m:     [showMin(null), showMin(0)],
        y:     [showYen(null), showYen(0)],
        txt:   [showTxt(''), showTxt('新地7')],
        has:   [hasDep({dep:null}), hasDep({dep:0}), hasFare({fare:null}), hasFare({fare:0})]
      };`, box);
    const U = box.U;
    t(U.zero === 6000, '★待ち0分は、ちゃんと数える（6000円/h）', U.zero);
    t(U.unkW === 0, '★★★待ちが不明なら、時間単価は出さない（0扱いにしない）', U.unkW);
    t(U.unkF === 0, '★★★金額が不明でも、時間単価は出さない', U.unkF);
    t(U.t[0] === '不明' && U.t[1] === '25:30', '★★★時刻の空欄は「不明」と出る', U.t);
    t(U.m[0] === '不明' && U.m[1] === '0分', '★★★0分と「不明」は、別のものとして出る', U.m);
    t(U.y[0] === '不明' && U.y[1] === '¥0', '★★★0円と「不明」も、別のものとして出る', U.y);
    t(U.txt[0] === '不明' && U.txt[1] === '新地7', '　 場所の空欄も「不明」', U.txt);
    t(U.has[0] === false && U.has[1] === true, '　 時刻0時は、ちゃんと数に入る', U.has);
    t(U.has[2] === false && U.has[3] === true, '　 0円も、ちゃんと数に入る', U.has);
  }

  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(app.indexOf('function numOrUnk') !== -1, '★★★空っぽの欄は、0ではなく「不明」で保存する');
  t(/wait_min: numOrUnk\(/.test(app) && /ride_min: numOrUnk\(/.test(app),
    '　 待ちも乗車も、同じあつかい');
  t(/const F = rs\.filter\(hasFare\)/.test(app),
    '★★★合計・平均は、不明を外して数える');
  const sql = fs.readFileSync(path.join(W, 'supabase', 'schema.sql'), 'utf8');
  t(/alter column fare\s+drop not null/.test(sql),
    '★★★台帳の側も、空っぽを受け取れるようにしてある');
  /* ★台帳のひと手間がまだのあいだも、記録が残せること（止めない） */
  t(/not-null/.test(app) && /fellBack/.test(app),
    '★★★台帳がまだ空欄を受け取れなくても、記録は残せる（走っている最中に止めない）');
  t(/空の欄は、いまは 0 で入りました/.test(app),
    '★★★そのときは、0で入ったと必ず伝える（黙って0にしない）');

  const login = fs.readFileSync(path.join(W, 'login.html'), 'utf8');
  t(login.indexOf('不明点は抜かしてもよい') !== -1, '★★★使い方にも、そう書いてある');
  t(login.indexOf('前日の夜（営業曜日）の続き') !== -1,
    '★★★「前日の夜（営業曜日）の続き」と書いてある');
}

console.log('■ 記録を直せるのは、本人と まーく様だけ');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「記録情報は、誤って送信する可能性も考慮して、
   *       本人と管理者だけ再編集できるようにしてください」
   *   ★画面のボタンを隠すだけでは足りません。
   *     台帳の側（RLS）でも止まっていないと、守りになりません。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(/const canEdit = r => r\.user_id === ME\.user\.id \|\| ME\.profile\.is_admin/.test(app),
    '★★★画面で、本人と管理者だけに「直す」を出す');
  t(/canEdit\(r\) \?/.test(app), '　 一覧のボタンが、それを見ている');
  const sql = fs.readFileSync(path.join(W, 'supabase', 'schema.sql'), 'utf8');
  const up = sql.slice(sql.indexOf('create policy rides_update_own'));
  t(/user_id = auth\.uid\(\) or public\.is_admin\(\)/.test(up.slice(0, 400)),
    '★★★台帳の側でも、本人と管理者だけが直せる');
  const del = sql.slice(sql.indexOf('create policy rides_delete_own'));
  t(/user_id = auth\.uid\(\) or public\.is_admin\(\)/.test(del.slice(0, 300)),
    '★★★消すのも、本人と管理者だけ');
}


console.log('■ ヘッダーの組み方（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「TAXI NOTE の下に、v1.0
   *       v1.0の右に、近日中〜
   *       TAXINOTEの右に、ふきだしと顔
   *       こういう形で 不自然に左下の空白を開けないような
   *       作りにしてください」
   *
   *   ★前は、ふきだしが下の段へ回り込み、その左が ぽっかり空いていました。
   *     3段に組み直して、空きを無くします。
   */
  ['index.html', 'admin.html', 'login.html'].forEach(function (f) {
    const h = fs.readFileSync(path.join(W, f), 'utf8');
    const head = h.slice(h.indexOf('<h1'), h.indexOf('<h1') + 700);
    /* ★題の中にあってよいのは「X」を光らせるための印だけです
         （ご指示・2026/11/11）。それを外してから、ほかに札が
         まぎれ込んでいないかを見ます。 */
    const bare = head.replace(/<span class="xg">|<\/span>/g, '');
    t(/<h1[^>]*>[^<]*<\/h1>/.test(bare), '★' + f + '：題だけの行になっている');
    t(!/<h1[^>]*>[\s\S]{0,40}class="ver"/.test(h),
      '　 ' + f + '：版（v1.0）は、題の中に入っていない');
    t(/class="subline"/.test(h), '★★★' + f + '：版と一文が、同じ段にある');
  });
  const idx = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  const i1 = idx.indexOf('<h1'), i2 = idx.indexOf('id="saymount"'), i3 = idx.indexOf('class="subline"');
  t(i1 !== -1 && i2 > i1 && i3 > i2,
    '★★★並びは 題 → ふきだし → 版と一文 の順', [i1, i2, i3]);

  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/header, \.login \.head\{[^}]*display:grid/.test(css),
    '★★★ヘッダーは、ます目で組んでいる（回り込ませない）');
  t(/header > \.saymount[^{]*\{[^}]*grid-row:1/.test(css),
    '★★★ふきだしと顔は、題と同じ段（1段目）');
  /*
   * ★まーく様のご指摘（2026/11/11）
   *     「ふきだしって、13文字分くらいは、
   *       ロゴにはみ出さずに入れるんじゃないですか？」
   *   幅を決め打ちしていたので、右に余白が残っていました。
   *   題の右に余っているぶんを、ぜんぶ使います。
   *   ★広さが決まるのは「題の幅」だけ。中の字では変わらないので、
   *     ひとことが入れ替わっても、ふきだしは動きません。
   */
  t(/header > \.saymount[^{]*\{[^}]*justify-self:stretch/.test(css),
    '★★★ふきだしは、余っている幅いっぱいまで広がる');
  t(/\.saymount \.bubble\{[^}]*flex:1 1 auto/.test(css),
    '★★★中のふきだしも、伸びる形になっている');
  t(!/\.saymount \.bubble\{[^}]*[^-]width:\d+px/.test(css),
    '★★★幅の決め打ちは、どこにも残っていない');
  t(/header > \.subline[^{]*\{[^}]*grid-row:2/.test(css),
    '★★★版と一文は、2段目');
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「サブタイトル(近日中～)は、右寄りにしてください」
   *   版（v1.0）は左のまま、一文だけを右へ寄せます。
   */
  t(/header > \.subline \.sub\{[^}]*margin-left:auto/.test(css),
    '★★★一文（近日中〜）は、右へ寄せる');
  t(/header > \.subline \.sub\{[^}]*text-align:right/.test(css),
    '　 字そろえも右');
  t(/\.login \.head > \.subline \.sub\{[^}]*margin-left:auto/.test(css),
    '　 ログインの画面も、同じ寄せ方');
  t(/header > \.who\{[^}]*grid-row:3/.test(css), '　 名前とボタンは3段目');
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「ポンコツ(称号)だけ、左寄せにしてください」
   *   称号は左、ボタンは右。段いっぱいに広げて、左右に振り分けます。
   */
  t(/header > \.who\{[^}]*justify-content:space-between/.test(css),
    '★★★称号は左、ボタンは右（段の左右に振り分ける）');
  t(!/header > \.who\{[^}]*justify-self:end/.test(css),
    '　 右に かためる書き方は残っていない');
  t(/header > \.who > \.whoR\{/.test(css), '　 右がわを まとめる入れものがある');
  ['index.html', 'admin.html'].forEach(function (f) {
    const h = fs.readFileSync(path.join(W, f), 'utf8');
    const w = h.slice(h.indexOf('class="who"'), h.indexOf('class="who"') + 500);
    t(/<b id="me">[\s\S]*?<\/b>[\s\S]*?class="whoR"/.test(w),
      '★★★' + f + '：称号が先、ボタンはそのあとの入れものの中');
    t(/class="whoR"[\s\S]{0,400}id="out"/.test(w),
      '　 ' + f + '：ログアウトは、右がわの入れものの中');
  });
  t(/header > h1[^{]*\{[^}]*white-space:nowrap/.test(css),
    '★★★題は折り返さない（折り返すと、絵との段がずれる）');
  t(/--logo:clamp\(/.test(css),
    '★★★題は、画面の幅に合わせて縮む（決め打ちだと はみ出す）');
  /* ★いちばん細い画面のきまりは、ファイルのいちばん下にあること。
       上に書くと 560px のきまりに上書きされて効きません（実際そうなりました） */
  const i380 = css.lastIndexOf('@media(max-width:380px)');
  const i560 = css.lastIndexOf('@media(max-width:560px)');
  t(i380 > i560,
    '★★★細い画面のきまりは、560pxのきまりより下にある（でないと効かない）', [i380, i560]);
}


console.log('■ 枠の中の字は、ぜんぶ まん中（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「管理者っていう文字が、枠に対して、上じゃありませんか？
   *       枠文字は全て、枠に対して中央位置中央高さで徹底してください」
   *   字は、ふつう「ベースライン」という見えない線にそろうので、
   *   枠の中では上に寄って見えます。
   */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const blk = (css.match(/\.badge, \.mini, \.chip, \.ver, \.btn, \.mtag, nav button, \.kao small\{[^}]*\}/) || [''])[0];
  t(!!blk, '★枠の中の字をまん中にする、きまりがある');
  t(/display:inline-flex/.test(blk),   '★★★枠の中の字を、たて よこ まん中に置いている');
  t(/align-items:center/.test(blk),    '　 たて まん中');
  t(/justify-content:center/.test(blk),'　 よこ まん中');
  t(/line-height:1/.test(blk),
    '★★★行の高さを1にしている（これが無いと、字が下へずれる）');
  ['badge', 'mini', 'ver', 'chip', 'mtag'].forEach(function (k) {
    t(new RegExp('\\.' + k + '\\{[^}]*min-height:\\d+px').test(css),
      '　 ' + k + ' に、つぶれない高さがある');
  });
  t(!/vertical-align:3px/.test(css), '　 古い、ずらして合わせる書き方は残っていない');
}

console.log('■ ならびは 題 → 顔 → ふきだし（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「ロゴ(TAXI NOTE)の右に顔、その横にふきだし
   *       (ふきだしの先っぽは左向きに、もうちょっとわかりやすく)」
   *   ★顔の位置が動かないことが、お約束でした。
   *     顔の場所は「題の幅」だけで決まり、ふきだしが残りを使います。
   */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(!/\.saymount\{flex-direction:row-reverse\}/.test(css),
    '★★★顔を右に置く古い書き方は、残っていない');
  t(/\.saymount\{flex-direction:row\}/.test(css), '★★★顔が先、ふきだしが後ろ');
  t(/\.saymount \.face\{order:1\}/.test(css) && /\.saymount \.bubble\{order:2\}/.test(css),
    '　 ならびを はっきり決めている');
  /* しっぽは左向き。大きさも前より大きく */
  const tail1 = (css.match(/\.saymount \.bubble:before\{right:auto;[^}]*\}/) || [''])[0];
  t(/left:-\d+px/.test(tail1), '★★★しっぽは、ふきだしの左がわ（顔のほうを指す）');
  t(/border-right-color:#/.test(tail1), '　 左を向いた三角になっている');
  t(/border-width:([7-9]|1\d)px/.test(tail1), '★★★しっぽを、前より大きくしている', tail1);
  /* ふきだしに overflow:hidden を付けると、しっぽが切り取られる */
  /* ★「書いてある説明」に出てくる字で間違えないよう、説明は先に外します */
  const bub = (css.match(/\.saymount \.bubble\{flex:1 1 auto[^}]*\}/) || [''])[0]
                .replace(/\/\*[\s\S]*?\*\//g, '');
  t(!/overflow:hidden/.test(bub),
    '★★★ふきだしで字を切らない（切ると、しっぽまで消える）', bub.slice(0, 60));
  t(/\.saymount \.bubble \.t\{[^}]*overflow:hidden/.test(css),
    '　 字のはみ出しは、中の字のほうで止めている');
}


console.log('■ 版の番号は、白地に黒字（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「v1.0も、他の文字と同じサイズにして
   *       白背景、黒文字で、差別化してください」
   *
   *   まわりの字は ぜんぶ真っ白です（これも まーく様のご指示）。
   *   同じ真っ白のままだと、版の番号が ただの字にうもれます。
   *   白地に黒字にして、ひと目で見分けられるようにします。
   */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const v = (css.match(/\n\.ver\{[^}]*\}/) || [''])[0];
  t(v !== '', '★版の番号の見た目が見つかる');
  t(/background:#FFFFFF/i.test(v), '★★★白い地になっている', v);
  t(/color:var\(--ink\)/.test(v), '★★★字は黒になっている', v);
  t(!/color:var\(--muted\)/.test(v), '　 前の「真っ白な字」は残っていない', v);
  /* ★大きさは、となりの一文（.sub）と ぴったり同じにします。
       小さいままだと「他の文字と同じサイズ」になりません。 */
  t(/font-size:clamp\(10px,2\.9vw,13px\)/.test(v),
    '★★★大きさは、となりの一文と同じ', v);
  t(!/font-size:11px/.test(v), '　 前の 11px は残っていない', v);
  /* 細い画面でも、一文と同じ大きさで縮むこと（別々に縮むとチグハグになる） */
  t(/header > \.subline \.sub[\s\S]{0,120}\.ver\{font-size:clamp\(9px,2\.55vw,12\.5px\)\}/.test(css),
    '★★★640px以下でも、一文と同じ大きさ');
  t(/header > \.subline \.sub[\s\S]{0,120}\.ver\{font-size:clamp\(8\.4px,2\.55vw,12\.5px\)\}/.test(css),
    '★★★380px以下でも、一文と同じ大きさ');
  t(!/\.ver\{padding:1px 5px;font-size:10px/.test(css),
    '　 版だけ小さくする古い書き方は、消えている');
}


console.log('■ 題の「X」が、たまに光る（ご指示・2026/11/11）');
{
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「TAXINOTEのXは、たまに、ランダムに光を入れることは
   *       できますか」
   *
   *   ★いちばん こわいのは「光らせたら、まわりがズレる」ことです。
   *     題の幅が変わると、となりの顔とふきだしの段がずれます。
   *     だから、字の大きさも位置も変えず、光の輪（text-shadow）
   *     だけを一瞬 出します。
   *   ★「たまに」なので、決まった間かくでは光らせません。
   */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const sh  = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');

  ['index.html', 'login.html', path.join('preview', 'index.html')].forEach(function (f) {
    const h = fs.readFileSync(path.join(W, f), 'utf8');
    t(/<h1 class="dn">TA<span class="xg">X<\/span>I NOTE<\/h1>/.test(h),
      '★★★' + f + '：Xだけに印が付いていて、題は TAXI NOTE のまま');
  });

  t(/h1\.dn \.xg\.on\{animation:xgleam/.test(css), '★★★光らせる動きがある');
  t(/@keyframes xgleam\{/.test(css), '　 その動きの中身も書いてある');
  const kf = (css.match(/@keyframes xgleam\{[\s\S]*?\n\}/) || [''])[0];
  t(/text-shadow:0 0 \d+px/.test(kf), '★★★光るのは、まわりの輪（text-shadow）');
  /* ★大きさ・位置を変えるものが混ざっていないか。
       混ざると、題の幅が変わって、顔とふきだしがずれます。 */
  t(!/font-size|letter-spacing|transform|padding|margin|width/.test(kf),
    '★★★光っても、字の大きさも位置も変わらない', kf.slice(0, 80));
  t(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,120}h1\.dn \.xg\.on\{animation:none\}/.test(css),
    '★★★動きが苦手な方の設定では、光らせない');

  t(/function xGleam\s*\(/.test(sh), '★★★光らせる係が、台帳の中にある');
  t(/boot = function\(\)\{[^}]*xGleam\(\);/.test(sh), '★★★開いたときに、ちゃんと動き出す');
  t(/Math\.random\(\)/.test(sh.slice(sh.indexOf('function xGleam'),
                                    sh.indexOf('function xGleam') + 1200)),
    '★★★待ち時間は、毎回くじ引き（決まった間かくでは光らない）');
  t(/prefers-reduced-motion: reduce/.test(sh),
    '★★★台帳の側でも、動きが苦手な方には光らせない');
  /* 光りっぱなしにならないこと（消す指示があること） */
  t(/classList\.remove\('on'\)/.test(sh), '★★★光ったあと、ちゃんと消える');
  /* 何秒に1回か。短すぎると「たまに」になりません */
  const mn = (sh.match(/XG_MIN_MS = (\d+)/) || [])[1];
  t(mn && +mn >= 5000, '★★★いちばん短い待ちでも5秒以上（「たまに」を守る）', mn);
}



console.log('■ イベントは、何日のぶんかを必ず出す（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「これ、毎回日付を入れてもらえないと、
   *       いつのイベントか分かりません」
   *
   *   ★いちばん こわいのは、ちがう日のぶんを「きょう」と出すことです。
   *     夜中の0時をまわると、営業日（朝6時まわり）とカレンダーの
   *     日付がずれます。実際に、11/12 のぶんを 11/12 の 4:04 に
   *     「きょうのイベント」として出していました。
   *     日付が無いので、見ても どの日のものか分かりません。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(/function evTitle\s*\(/.test(app), '★何日のぶんかを出す係がある');
  t(!/<h2>きょうのイベント/.test(app),
    '★★★日付の無い「きょうのイベント」は、どこにも残っていない');
  t(!/<h2>あすのイベント/.test(app),
    '★★★日付の無い「あすのイベント」も、残っていない');
  /* まん中に出る箱・画面・次の日、3か所とも 題に日付が入ること */
  const uses = (app.match(/<h2>\$\{evTitleHTML\(/g) || []).length;
  t(uses >= 2, '★★★どの題にも、日付が入っている', uses);
  /* ★日付は、いちばん目立たせます（ご指示・2026/11/12） */
  t(/class="evday"/.test(app), '★★★日付に、目立たせる印が付いている');
  const css2 = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/\.evday\{[^}]*font-size:1\.\d+em/.test(css2), '★★★日付は、まわりより大きい字');
  t(/\.evday\{[^}]*color:var\(--kusha\)/.test(css2), '　 色も変えている');
  t(/\.evkyo\{/.test(css2), '　「きょう」も目立つ形になっている');

  /* 中身を、そのまま動かして確かめます */
  const a = app.indexOf('function evTitle'), b = app.indexOf('function evRows');
  t(a !== -1 && b > a, '★係の中身が見つかる');
  if (a !== -1 && b > a) {
    const box = {};
    vm.createContext(box);
    vm.runInContext(
      'const WD=["日","月","火","水","木","金","土"];' +
      'const pad=n=>String(n).padStart(2,"0");' +
      'function fmtD(s){const[y,m,d]=s.split("-").map(Number);' +
      ' return m+"/"+d+"("+WD[new Date(y,m-1,d).getDay()]+")";}' +
      'let _NOW="2026-11-11"; function evNight(){return _NOW;}' +
      /* today() にすり替わっても、ここでは落ちずに
         「evNight を使っているか」の検査のほうで気づけるように */
      'function today(){return "2026-11-30";}' +
      app.slice(a, b), box);
    const T = (d, n) => vm.runInContext(
      'evTitle(' + JSON.stringify({ d: d, list: new Array(n).fill(0) }) + ')', box);
    const S = d => vm.runInContext(
      'evStale(' + JSON.stringify({ d: d, list: [] }) + ')', box);

    /* 営業日と同じ日なら「きょう」。日付は、どちらにしても必ず出る */
    t(T('2026-11-11', 4) === 'きょう 11/11(水) のイベント（4件）',
      '★★★きょうのぶんでも、日付が出る', T('2026-11-11', 4));
    /* ちがう日のぶんを出すときは「きょう」と書かない（嘘になる） */
    t(T('2026-11-12', 4) === '11/12(木) のイベント（4件）',
      '★★★ちがう日のぶんは「きょう」と書かない', T('2026-11-12', 4));
    t(T('2026-11-13', 12) === '11/13(金) のイベント（12件）',
      '★★★次の日のぶんも、日付が出る', T('2026-11-13', 12));
    /* 日付が1つも無い形は、作らせない */
    ['2026-11-11', '2026-11-12', '2026-11-13'].forEach(function (d) {
      t(/\d+\/\d+\(.\)/.test(T(d, 1)), '　 ' + d + '：曜日つきの日付が入っている');
    });
    /* 古いまま止まっていたら、黙らない */
    t(S('2026-11-10') !== '', '★★★古いまま止まっていたら、そう書く', S('2026-11-10'));
    t(S('2026-11-11') === '' && S('2026-11-12') === '',
      '　 新しいぶんのときは、よけいなことを書かない');
  }
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/\.evold\{/.test(css), '　 止まっているときの見た目も入っている');
}



console.log('■ 台帳の営業曜日も 16:00 にそろえる（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）：「16:00に変えてください」
   *
   *   ★いちばん こわいのは、スプシと台帳で数え方がずれることです。
   *     帰ってから（たとえば朝10時に）入れた1本が、
   *     スプシでは前の日、台帳では当日、と別の日に入ります。
   *     そうなると、人ごとの売上が静かに狂います。
   *   ★イベントの知らせだけは、別の数え方にしてあります。
   *     昼に見ているときに知りたいのは「今夜」のことだからです。
   */
  const sh = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');

  t(/function bizToday\(\)[\s\S]{0,80}getHours\(\) - 16/.test(sh),
    '★★★営業曜日は 16:00 で区切る');
  t(!/function today\(\)[\s\S]{0,80}getHours\(\) - 6/.test(sh),
    '　 前の「朝6時で区切る」は、残っていない');
  t(/const today = bizToday;/.test(sh), '　 これまでどおり today() でも呼べる');
  t(/function evNight\(\)[\s\S]{0,80}getHours\(\) - 6/.test(sh),
    '★★★イベント用の「今夜」の数え方は、別に用意してある');

  /* 実際に動かして、時刻ごとに どの日になるかを見ます */
  const box = { console: { log: function(){} }, _Real: Date };
  vm.createContext(box);
  vm.runInContext(
    'const pad=n=>String(n).padStart(2,"0");' +
    'let _H=0;' +
    'class FakeDate{' +
    '  constructor(){ this._d = new _Real(2026,10,12,_H,0,0); }' +
    '  setHours(h){ this._d.setHours(h); }' +
    '  getHours(){ return this._d.getHours(); }' +
    '  getFullYear(){ return this._d.getFullYear(); }' +
    '  getMonth(){ return this._d.getMonth(); }' +
    '  getDate(){ return this._d.getDate(); } }' +
    'var Date = FakeDate;' +
    sh.slice(sh.indexOf('function bizToday'), sh.indexOf('const esc =')), box);
  const at = (h, fn) => { vm.runInContext('_H=' + h + ';', box);
                          return vm.runInContext(fn + '()', box); };

  /* 夜の最中（20時）… その日 */
  t(at(20, 'bizToday') === '2026-11-12', '★★★20時は、その日（11/12）', at(20, 'bizToday'));
  /* 帰ってすぐ（朝6時）… まだ前の日 */
  t(at(6, 'bizToday') === '2026-11-11', '★★★朝6時は、まだ前の日（11/11）', at(6, 'bizToday'));
  /* 昼すぎに入れ直すとき（15時）… ここが変わった所。まだ前の日 */
  t(at(15, 'bizToday') === '2026-11-11',
    '★★★15時も、まだ前の日（11/11）＝ここがスプシとそろった', at(15, 'bizToday'));
  /* 16時ちょうどから、新しい日 */
  t(at(16, 'bizToday') === '2026-11-12', '★★★16時から、新しい日（11/12）', at(16, 'bizToday'));

  /* イベントの「今夜」は、昼のうちに その日に切りかわる */
  t(at(15, 'evNight') === '2026-11-12', '★★★昼の15時に見ても、今夜（11/12）のぶん', at(15, 'evNight'));
  t(at(3,  'evNight') === '2026-11-11', '★★★夜中の3時は、前の晩（11/11）の続き', at(3, 'evNight'));

  /* イベントまわりは、ぜんぶ evNight() を使っていること */
  ['const t = evNight();', "day.d === evNight()", 'day.d < evNight()',
   "localStorage.getItem(EV_KEY) === evNight()", 'localStorage.setItem(EV_KEY, evNight())']
    .forEach(function (x) {
      t(app.indexOf(x) !== -1, '　 イベント：' + x.slice(0, 28));
    });
}



console.log('■ 乗り場と期間でしぼる（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「各乗り場だけをピンポイントで絞る機能」
   *     「1ヶ月おきのレポート機能(期間設定も自由変更可能)」
   *
   *   ★いちばん こわいのは「絞ったまま忘れて、数字を読みちがえる」ことです。
   *     40万円が4万円に見えます。だから、絞っているときは
   *     4つの数のすぐ下に、何で絞っているかを必ず書きます。
   *   ★期の区切りは、スプシのレポートと同じ「16日〜翌月15日」。
   *     ちがう区切りにすると、同じ月なのに数が合わなくなります。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');

  /* ---- 操作するところが、ちゃんとある ---- */
  t(/id="ktPlace"/.test(html) && /ktPlace/.test(app),
    '★★★乗り場をえらぶところが、いちばん上にある');
  t(html.indexOf('id="ktPlace"') < html.indexOf('class="kpis"'),
    '　 4つの数より上（いつでも目に入る）');
  t(/data-filt="period"/.test(app), '★★★期間をえらぶところがある');
  t(/data-filt="from"/.test(app) && /data-filt="to"/.test(app),
    '★★★期間は、自分で決めることもできる');
  t(/id="fClear"/.test(app), '★★★絞っているときは「ぜんぶに戻す」が出る');
  t(/filtOn\(\) \? '<button class="chip warn" id="fClear"/.test(app),
    '　 絞っていないときは出さない（よけいなものを増やさない）');

  /* ---- 絞り込みは、1か所でまとめて効く ---- */
  const vis = (app.match(/const visible = \(\) => records\.filter\([\s\S]*?\);/) || [''])[0];
  t(/onlyMine/.test(vis),  '★★★人で絞れる', vis.slice(0, 40));
  t(/onlyPlace/.test(vis), '★★★乗り場で絞れる');
  t(/inPeriod/.test(vis),  '★★★期間で絞れる');

  /* ---- 絞っていることが、画面に出る ---- */
  t(/fnow/.test(app) && /だけ/.test(app), '★★★何で絞っているかを、数のすぐ下に出す');
  t(/\.fnow\{/.test(css), '　 その見た目も入っている');

  /* ---- 覚えておく ---- */
  t(/localStorage\.setItem\(FILT_KEY/.test(app), '　 絞った形を、その端末に覚える');

  /* ---- まとめ（1か月のレポート） ---- */
  t(/function reportCard\(\)/.test(app), '★★★この期間のまとめが出る');
  t(/reportCard\(\) \+ `<div class="card"><h2>大事なところ/.test(app),
    '★★★「集計」の いちばん上に出る');
  const rep = app.slice(app.indexOf('function reportCard'), app.indexOf('function paneRank'));
  t(/R\.filter\(hasFare\)/.test(rep),
    '★★★金額が「不明」のものは、合計にも平均にも入れない');
  t(/rts\.length >= 3/.test(rep), '★★★3本より少ないものを「平均」と呼ばない');
  t(/不明/.test(rep), '　 外したぶんが何件かも、ことばで出す');

  /* ---- 期の区切りを、実際に動かして確かめる ---- */
  const box = { console: { log: function(){} } };
  vm.createContext(box);
  vm.runInContext(
    'const pad=n=>String(n).padStart(2,"0");' +
    'const WD=["日","月","火","水","木","金","土"];' +
    'function fmtD(s){const[y,m,d]=s.split("-").map(Number);' +
    ' return m+"/"+d+"("+WD[new Date(y,m-1,d).getDay()]+")";}' +
    'let _T="2026-11-12"; function today(){return _T;}' +
    'let records=[]; let period={mode:"all",from:"",to:""};' +
    app.slice(app.indexOf('const ymd = d =>'), app.indexOf('const visible = () =>')), box);
  const C = n => vm.runInContext('JSON.stringify(cycleOf(' + n + '))', box);

  /* 11/12 は「10/16〜11/15」の期の中 */
  t(C(0) === '{"from":"2026-10-16","to":"2026-11-15"}', '★★★今期は 10/16〜11/15', C(0));
  t(C(1) === '{"from":"2026-09-16","to":"2026-10-15"}', '★★★前期は 9/16〜10/15', C(1));
  /* 16日ちょうどは、その日から新しい期 */
  vm.runInContext('_T="2026-11-16";', box);
  t(C(0) === '{"from":"2026-11-16","to":"2026-12-15"}', '★★★16日から、新しい期', C(0));
  /* 15日は、まだ前の期の最後の日 */
  vm.runInContext('_T="2026-11-15";', box);
  t(C(0) === '{"from":"2026-10-16","to":"2026-11-15"}', '★★★15日は、まだ同じ期', C(0));

  /* 自分で決めた日でも、ちゃんと外れる・入る */
  vm.runInContext('period={mode:"free",from:"2026-10-20",to:"2026-10-25"};', box);
  const IN = d => vm.runInContext('inPeriod({date:"' + d + '"})', box);
  t(IN('2026-10-20') === true,  '★★★はじめの日は、入る');
  t(IN('2026-10-25') === true,  '★★★おわりの日も、入る');
  t(IN('2026-10-19') === false, '★★★1日まえは、入らない');
  t(IN('2026-10-26') === false, '★★★1日あとも、入らない');
  /* 「ぜんぶ」なら、どの日も入る */
  vm.runInContext('period={mode:"all",from:"",to:""};', box);
  t(IN('2020-01-01') === true && IN('2030-12-31') === true, '　「ぜんぶ」なら、何も外さない');
}



console.log('■ 名前と、画面のちがい（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「いまアツい、とアツい場所の違いがよく分かりません」
   *     「アツい場所というより つけ待ちデータ の方が良いのではないですか？」
   *     「ごいけん → フィードバック にしてください」
   */
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  const app  = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const adm  = fs.readFileSync(path.join(W, 'admin.html'), 'utf8');
  const pv   = fs.readFileSync(path.join(W, 'preview', 'index.html'), 'utf8');

  t(/data-t="heat"[^>]*>つけ待ち</.test(html), '★★★タブは「つけ待ち」');
  t(!/アツい場所/.test(html), '　 前の「アツい場所」は、残っていない');
  t(/data-t="fb"[^>]*>フィードバック</.test(html), '★★★タブは「フィードバック」');
  t(!/ごいけん/.test(html) && !/ごいけん/.test(app) && !/ごいけん/.test(adm),
    '★★★「ごいけん」は、どこにも残っていない');
  t(/つけ待ち/.test(pv) && /フィードバック/.test(pv),
    '　 下見用のページも、同じ名前になっている');
  t(/pvbar/.test(pv), '　 下見用の赤い帯も、消えていない');
  t(/<h2>つけ待ち一覧<\/h2>/.test(app), '　 中の題も「つけ待ち一覧」');
  t(/<h2>フィードバック<\/h2>/.test(app), '　 中の題も「フィードバック」');

  /* ★2つの画面のちがいが、それぞれに書いてあること */
  t(/全期間の記録を[\s\S]{0,60}時間帯・乗り場ごと/.test(app),
    '★★★「つけ待ち一覧」は、全期間の表だと書いてある');
  t(/いまの時刻に合わせて[\s\S]{0,40}いま行くとよい所/.test(app),
    '★★★「いまアツい」は、いまの時刻の話だと書いてある');
  t(/つけ待ち一覧】のほう/.test(app), '　 もう一方への案内もある');
}


console.log('■ イベントは、開演の時刻を いちばん上に（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「何時に車を着けるのかはこちらで判断するので、
   *       開演時間がいちばん重要なので、
   *       そこを履き違えないでください」
   *
   *   ★着ける時刻は、まーく様ご自身がお決めになるものです。
   *     こちらが大きく出すのは、開演（と終演）。
   *   ★着ける目安は、消さずに下に残します（判断の材料になるため）。
   *   ★開演が分かっていないときに、あやしい時刻を書きません。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const row = app.slice(app.indexOf('function evTimeLine'), app.indexOf('function paneEv'));
  const iGo  = row.indexOf('evTimeLine(x)}');
  const iCar = row.indexOf('🚕');
  t(/function evTimeLine/.test(app), '★★★時刻の行を作る係がある');
  t(iGo !== -1 && iCar !== -1 && iGo < iCar,
    '★★★開演のほうが、着ける目安より先に出る', [iGo, iCar]);
  t(/const st  = x\.s \? \(esc\(x\.s\) \+ ' 開演'\) : '開演 不明';/.test(row),
    '★★★開演は、分かっているかぎり必ず出す');
  t(/evgo/.test(row), '★★★いちばん大きい字（evgo）で出す');
  /* ★「見当」ではなく「予定」（ご指示・2026/11/12） */
  t(/（予定）/.test(row) && !/（見当）/.test(row), '★★★終演は「（予定）」と書く');
  t(/'終演 不明'/.test(row), '★★★どうしても分からないときだけ「不明」');
  t(!/class="evgo">🚕/.test(app), '　 着ける時刻は、大きい字ではない');
  t(/着ける目安/.test(app), '★★★着ける目安も、消さずに残している');
  t(/'終演 不明'/.test(row) && /'開演 不明'/.test(row),
    '★★★分からないときは「終演 不明」「開演 不明」とだけ書く');
  t(!/の時刻が、まだ分かっていません/.test(row), '　 前の長い言い方は、残っていない');
  /* ★開演も終演も、いつも両方 出します（ご指示・2026/11/12） */
  t(/' 開演'[\s\S]{0,200}'終演 '/.test(row), '★★★開演と終演を、いつも並べて出す');
  /* ★搬入の日は、公演がありません。時刻を1つも出しません */
  t(/x\.k === 'hanyu'\) return ''/.test(row),
    '★★★搬入（設営）の日は、時刻を1つも出さない');
  t(/いちばん上は<b>開演の時刻<\/b>/.test(app), '　 画面の説明も、そろっている');
  const news = fs.readFileSync(path.join(W, 'news.js'), 'utf8');
  t(/いちばん上に出るのは「開演の時刻」/.test(news), '　 お知らせの説明も、そろっている');
}



console.log('■ 4つの数の出し方と、ことばづかい（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「上の4つは～みたいなやり方は絶対やめてください、見づらすぎます
   *       1番上に、期間と合計を入れて
   *       下の方に、※1日当たりのデータではありません
   *       のような形にしてください」
   *     「ぶん→分」「あたり→当たり」「読みどころ→そんな日本語あるんですか？」
   *
   *   ★走りながら読むものなので、長い1文は ただの壁になります。
   *     「いつの」「いくら」「だれの」を、3つに分けて並べます。
   */
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  const app  = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css  = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const news = fs.readFileSync(path.join(W, 'news.js'), 'utf8');
  const pv   = fs.readFileSync(path.join(W, 'preview', 'index.html'), 'utf8');

  /* ---- いちばん上に、期間と合計 ---- */
  t(/id="ktop"/.test(html), '★★★いちばん上の帯がある');
  t(/id="ktWhen"/.test(html) && /id="ktSum"/.test(html),
    '★★★そこに「期間」と「合計」が入る');
  t(html.indexOf('id="ktop"') < html.indexOf('class="kpis"'),
    '★★★4つの数より、上にある');
  t(html.indexOf('id="kperiod"') > html.indexOf('class="kpis"'),
    '★★★注意書きは、4つの数より下');
  t(/id="ktop"/.test(pv), '　 下見用のページも同じ');
  t(/#ktop h2\{/.test(css) && /\.ktsum b\{/.test(css), '　 その見た目も入っている');
  /* ★ひと区切りごとに、赤い線の見出し（ご指示・2026/11/12
       「赤い線を最初に入れて、見出しとしてだしてもらわないと、
         わけがわかりません」） */
  t(/<section class="card blk" id="blkPlace">[\s\S]{0,80}<h2>乗り場<\/h2>/.test(html),
    '★★★いちばん上は「乗り場」の区切り（赤い線つきの見出し）');
  t(/<section class="card blk" id="ktop"[\s\S]{0,60}<h2 id="ktWhen">/.test(html),
    '★★★その下は「いつの分か」の区切り（赤い線つきの見出し）');
  t(html.indexOf('id="blkPlace"') < html.indexOf('id="ktop"'),
    '★★★乗り場が、数字より上にある');
  t(html.indexOf('id="ktop"') < html.indexOf('<nav id="tabs">'),
    '★★★数字が、タブより上にある');
  t(/\.card h2:before\{content:"— "/.test(css), '　 赤い線は、見出しの頭に付く');

  /* ---- 長い1文は、もう出さない ---- */
  t(!/上の4つは /.test(app), '★★★「上の4つは…」の長い1文は、消えている');
  t(/※1日当たりのデータではありません/.test(app),
    '★★★下に「※1日当たりのデータではありません」と出る');

  /* ---- ことばづかい ---- */
  /* ★「該当データがありません」は、まーく様がお決めになった言い方なので
       変えません（ご指示・2026/11/11）。ここでは別の言いかえだけを見ます。 */
  const shown = app.replace(/\/\*[\s\S]*?\*\//g, '');   // 説明書きは見ない
  ['日ぶん', '本ぶん', 'ためたぶん', '1日あたり', '1本あたり',
   '1時間あたり', '読みどころ'].forEach(function (w) {
    t(shown.indexOf(w) === -1, '★★★「' + w + '」は、もう出さない');
  });
  t(/1日当たり/.test(shown) && /1本当たり/.test(shown),
    '★★★「当たり」と漢字で書いている');
  t(/本分/.test(shown), '★★★「分」と漢字で書いている');
  /* ★耳なれない言い方は使わない（ご指示・2026/11/12
       「ためた分 ぜんぶ ってなんですか」「全期間とかで良いじゃないですか」） */
  ['ためた分', 'ためた記録ぜんぶ', 'ぜんぶに戻す', '乗り場：ぜんぶ',
   'ひとりでに'].forEach(function (w) {
    t(shown.indexOf(w) === -1, '★★★「' + w + '」は、もう出さない');
  });
  t(/'全期間'/.test(shown), '★★★「全期間」と書いている');
  t(/絞り込みを解除/.test(shown), '★★★「絞り込みを解除」と書いている');
  t(/<h2>大事なところ<\/h2>/.test(app), '★★★「読みどころ」は言いかえた');

  /* ★ふつうの言い方（だ・である）で終わる説明を、残さない */
  ['仕分け。', '高い順。', '手で動かす必要はない。', '足りていない目安。',
   '時間帯がない。', '台帳に入る。', 'まだ1件もない。',
   '時間単価が高い。', '余地がある。', '名義で入る。'].forEach(function (w) {
    t(shown.indexOf(w) === -1, '　 ていねいな言い方に直した：' + w);
  });

  /* お知らせの中にも、おかしな言い方が残っていないこと */
  ['日ぶん', '1日あたり', '1本あたり', '読みどころ'].forEach(function (w) {
    t(news.indexOf(w) === -1, '　 お知らせ：「' + w + '」は出さない');
  });
}



console.log('■ 似ている乗り場に気づく・説明を短く（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「乗り場名入力時、似ている乗り場名があれば
   *       もしかして、○○と同じですか？ という最終確認も出してください」
   *     「この説明長すぎです」「説明はできる限り必要最低限に、端的に」
   *
   *   ★同じ場所が2つの名前で入ると、どちらも件数が足りず、
   *     どちらの数字も当てになりません。いちばん静かな事故です。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');

  t(/function placeSuggest\(/.test(app), '★★★似ている名前を見つける係がある');
  t(/もしかして、/.test(app), '★★★「もしかして、〜と同じですか？」と聞く');
  t(/data-psug=/.test(app) && /data-pkeep=/.test(app),
    '★★★「〜にする」と「このままでよい」の両方を出す');
  t(/const pSug = placeAskOk\[form\.place\]/.test(app),
    '★★★保存の前にも、もう一度だけ聞く');
  t(/\.psug\{/.test(css), '　 その見た目も入っている');

  /* 実際に動かして、気づけるかどうかを見ます */
  const box = { console: { log: function(){} } };
  vm.createContext(box);
  vm.runInContext(
    'let _PL=[]; function places(){return _PL;}' +
    app.slice(app.indexOf('function pkey('), app.indexOf('const placeAskOk')), box);
  const S = (v, list) => { vm.runInContext('_PL=' + JSON.stringify(list) + ';', box);
    return vm.runInContext('placeSuggest(' + JSON.stringify(v) + ')', box); };
  const L = ['新地7', '難波', '梅田ヒルトン'];
  t(S('新地７', L) === '',      '★★★全角ちがいは、同じ名前として通す', S('新地７', L));
  t(S('新地 7', L) === '',      '★★★空白ちがいも、同じ名前として通す', S('新地 7', L));
  t(S('新地8', L) === '新地7',  '★★★1字ちがいは「もしかして」と聞く', S('新地8', L));
  t(S('なんば', L) === '',      '　 まったく別の書き方は、むやみに聞かない', S('なんば', L));
  t(S('梅田ヒルト', L) === '梅田ヒルトン', '★★★打ちかけの名前にも気づく', S('梅田ヒルト', L));
  t(S('難波', L) === '',        '★★★そのものズバリなら、何も聞かない');
  t(S('京橋', L) === '',        '★★★似ていない新しい名前は、そのまま通す', S('京橋', L));

  /* ---- 説明は短く ---- */
  t(/<p class="note">空の欄は「不明」。平均には数えません。<\/p>/.test(app),
    '★★★記録する画面の説明は、1行だけ');
  t(!/この4つだけで、時間単価が出ます/.test(app), '　 長い説明は、残っていない');

  /* ---- タブの名前は短く ---- */
  const tabs = (html.match(/<button data-t="[^"]+"[^>]*>([^<]*)/g) || [])
    .map(x => x.replace(/^[\s\S]*>/, '').trim());
  t(tabs.indexOf('記録') !== -1 && tabs.indexOf('一日の流れ') !== -1 &&
    tabs.indexOf('全記録') !== -1, '★★★タブの名前を短くした', tabs.join('/'));
  t(tabs.every(x => x.length <= 7), '★★★どのタブも7字まで', tabs.join('/'));

  /* ---- 表でも、乗り場を目立たせる ---- */
  t(/<th>乗り場<\/th>/.test(app), '★★★表の見出しは「乗り場」');
  t(/<td class="place">/.test(app), '★★★乗り場の欄に、目立つ印がある');
  t(/td\.place\{/.test(css), '　 その見た目も入っている');
}



console.log('■ 入力欄と、タグの言い方（ご指示・2026/11/12）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  /* ★見本の字は、もっと薄く */
  t(/::placeholder\{color:var\(--chipoff\);opacity:\.4\d\}/.test(css),
    '★★★見本の字は、もっと薄くした');
  /* ★時刻の見本は 2530 */
  t(/placeholder="2530"/.test(app), '★★★時刻の見本は「2530」');
  t(!/placeholder="25:30"/.test(app), '　 前の「25:30」は残っていない');
  /* ★入力欄の幅は、ぜんぶ同じ */
  const form = app.slice(app.indexOf('<h2>乗車データ</h2>'), app.indexOf('<button class="btn" id="add">'));
  const ws = (form.match(/class="f w\d/g) || []).map(x => x.slice(-1));
  t(ws.length >= 7 && ws.every(x => x === '2'),
    '★★★入力欄の幅が、ぜんぶそろっている', ws.join('/'));
  /* ★幅の決まりが抜けていると、1つだけ細くなります */
  t(/\.f\.w4\{grid-column:span 4\}/.test(css), '　 w4 の決まりも入っている');
  t(/\.f\.w3,\.f\.w4,\.f\.w6\{grid-column:span 2\}/.test(css),
    '　 細い画面でも、はみ出さない');
  /* ★「この場所で覚える」は分かりにくい、とのご指摘 */
  t(!/この場所で覚え/.test(app), '★★★「この場所で覚える」は、言いかえた');
  t(/この地図で合っている/.test(app), '★★★「この地図で合っている」になっている');
}



console.log('■ 入れる順と、下の説明（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「lineと混同しないように、揃えて
   *       乗車場所／乗車時間／乗車金額／待ち時間 の順番に」
   *     「これも長すぎます。もっと、端的に、必要最低限に」
   *
   *   ★打つ順がLINEとちがうと、そのたびに手が止まります。
   */
  const app  = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  const form = app.slice(app.indexOf('<h2>乗車データ</h2>'), app.indexOf('<button class="btn" id="add">'));
  const at = w => form.indexOf(w);
  t(at('<label>乗車場所</label>') !== -1, '★★★「乗車場所」という名前になっている');
  t(at('<label>乗車金額（円）</label>') !== -1, '★★★「乗車金額」という名前になっている');
  t(at('<label>乗車場所</label>') < at('<label>乗車時間（分）</label>'),
    '★★★乗車場所 → 乗車時間 の順');
  t(at('<label>乗車時間（分）</label>') < at('<label>乗車金額（円）</label>'),
    '★★★乗車時間 → 乗車金額 の順');
  t(at('<label>乗車金額（円）</label>') < at('<label>待ち時間（分）</label>'),
    '★★★乗車金額 → 待ち時間 の順');

  /* ---- 下の説明は、短く ---- */
  const ft = (html.match(/<footer>[\s\S]*?<div class="copy">/) || [''])[0];
  const lines = ft.replace(/<footer>|<div class="copy">/g, '')
                  .split('<br>').map(x => x.trim()).filter(Boolean);
  t(lines.length <= 2, '★★★下の説明は2行まで', lines.length);
  lines.forEach(function (x) {
    t(x.length <= 30, '★★★1行は30字まで：' + x, x.length);
  });
  t(!/つけ待ちで潰した時間まで含めた/.test(html), '　 長い言い回しは、残っていない');
}



console.log('■ タブは、横スクロールさせない（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「PCだと見切れています」
   *     「あまり横スクロール機能は好きじゃないので、なんとかしてください」
   *   入りきらないときは、折り返して2段にします。
   */
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const nav = (css.match(/\nnav\{[^}]*\}/) || [''])[0];
  t(/flex-wrap:wrap/.test(nav), '★★★入りきらなければ、折り返す', nav.slice(0,70));
  t(!/overflow-x:auto/.test(nav), '★★★横スクロールは、させない');
  t(!/nav::-webkit-scrollbar/.test(css), '　 スクロールバーを隠す細工も、残っていない');
  const btn = (css.match(/\nnav button\{[^}]*\}/) || [''])[0];
  t(!/flex:1 0 auto/.test(btn), '　 ボタンを無理に広げない（折り返せるように）');
}



console.log('■ 入力の見出し（ご指示・2026/11/12）');
{
  /* ★まーく様のご指示：「あと35秒…」→「乗車データ」。
       「記録の目安時間」は消す。 */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(/<h2>乗車データ<\/h2>/.test(app), '★★★見出しは「乗車データ」');
  t(!/あと35秒/.test(app), '　「あと35秒…」は残っていない');
  t(!/記録の目安時間/.test(app), '　「記録の目安時間」も残っていない');
}


console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
