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
    /* ★ひとことは、まーく様がお決めになったものに入れ替えました
         （ご指示・2026/11/14「ふきだしのセリフを以下にしてください」）。
       数は決め打ちにしません。画面から いくつでも足せるためです。
       ただし「交互に出す」ので、両方とも空でないこと・
       数がそろっていることだけは、必ず確かめます。 */
    t(o.sb >= 5 && o.sg >= 5, '★★★ひとことが、どちらも5つ以上ある', [o.sb, o.sg]);
    /* ★数はそろえません（まーく様のお言葉のほうを大事にします）。
         片方が極端に少ないと、すぐ同じものが戻るので、そこだけ見ます。 */
    t(o.sb <= o.sg * 2 && o.sg <= o.sb * 2,
      '★★★ぼやきとほめ、どちらかに かたよりすぎていない', [o.sb, o.sg]);
    t(o.be === 10 && o.bm === 10 && o.ge === 10 && o.gm === 10,
      '　 どれも 目10 × 口10 で数えている', [o.be, o.bm, o.ge, o.gm]);
    t(o.kasanari === 0, '★★★しかめ顔と笑い顔に、同じ部品を混ぜていない', o.kasanari);
    t(/<svg/.test(o.kaoB) && /<svg/.test(o.kaoG), '　 どちらの顔も、ちゃんと描ける');
  }
  /* 顔は、ひとことの気分に合わせて変える */
  const sh = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  /*
   * ★顔は、まーく様からいただいた絵にしました（ご指示・2026/11/14）
   *     「ふきだしの顔は、さっきお渡しした画像を小さくして載せてください」
   *   気分（ぼやき／ほめ）は、ふきだしのふちと顔のまわりの光で分けます。
   *   描いていた顔（faceSvg）は、一覧の画面で使うので残してあります。
   */
  const css2 = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/<img class="face kiraface" src="' \+ sayFaceSrc\(\)/.test(sh),
    '★★★顔は、いただいた絵になっている');
  t(/function sayFaceSrc\(\)/.test(sh) && /dir \+ 'img\/kira\.png'/.test(sh),
    '　 下見用のページからでも、絵が出る');
  t(/'<div class="bubble' \+ \(say\.good \? ' good' : ''\)/.test(sh),
    '★★★ひとことの気分（ぼやき／ほめ）で、ふきだしを切りかえている');
  t(/:has\(\.bubble\.good\) \.kiraface/.test(css2),
    '　 顔のまわりの光も、気分で変える');
  t(/function faceSvg\(good\)/.test(sh), '　 描いていた顔も、一覧のために残してある');
  /* 「できれば、はははのトランジションもあると嬉しいです」 */
  t(/<span class="hahafx"[^>]*><i>は<\/i><i>は<\/i><i>は<\/i><\/span>/.test(sh),
    '★★★ひとことが変わると「ははは」が出る');
  t(/@keyframes hahafx\{/.test(css2) && /animation:hahafx /.test(css2),
    '★★★その「ははは」が、ふわっと上がる');
  t(/prefers-reduced-motion:reduce\)\{\.hahafx\{display:none\}\}/.test(css2),
    '　 動きを減らす設定の方には、出さない');
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
    t(o.kinds[4] >= 5 && o.kinds[5] >= 5,
      '　 ひとことも、ぜんぶ出てくる', [o.kinds[4], o.kinds[5]]);
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
    t(Math.max.apply(null, C.chips) === 95, '★★★分のタグは95分まで', Math.max.apply(null, C.chips));
    /* ★10個ずつの ます目で2段。45までが1段目、50〜95が2段目
         （ご指示・2026/11/12）。 */
    t(C.chips.length === 20, '★★★0〜95分の20個（45までが1段目）', C.chips.length);
    t(Math.max.apply(null, C.all) === 100,   '★★★欄を押したときの候補も100分まで', Math.max.apply(null, C.all));
    t(C.m.indexOf('途中乗り') !== -1,        '★★★種類のタブに「途中乗り」がある', C.m.join('/'));
    t(C.m.indexOf('流し') === -1,            '　 「流し」は出していない（ご指示）');
    /* ★S.Ride は Uber のすぐ右（ご指示・2026/11/12）。
       並び順まで押さえないと、足したつもりで別の場所に出ます。 */
    t(C.m.indexOf('S.Ride') === C.m.indexOf('Uber') + 1,
      '★★★種類のタブ「S.Ride」が Uber のすぐ右にある', C.m.join('/'));
    t(C.m.indexOf('付け待ち') === -1,        '★★★「付け待ち」は出していない（ご指示）', C.m.join('/'));
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
  /* ★ふきだしの中では、2行で止める書き方を使いません（字を縮めて1行に収めます）。
       目次のマスでは、わざと2行までにしているので、ふきだしの所だけを見ます。 */
  t(!/\.bubble[^{]*\{[^}]*-webkit-line-clamp:2/.test(css),
    '　 ふきだしに、2行で止める古い書き方は残っていない');
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
    t(S.good >= 5, '★★★ほめのひとことがある', S.good);
    t(S.bad <= S.good * 2 && S.good <= S.bad * 2,
      '★★★ぼやきとほめ、どちらかに かたよりすぎていない', [S.bad, S.good]);
    t(S.alt === true, '★★★かならず「ぼやき→ありがとう」の交互になる');
    t(S.first === 'B', '　 はじめは ぼやきから', S.first);
    t(S.dup === 0, '　 同じ文が、両方に入っていない', S.dup);
    /*
     * ★ふきだしの高さを題にそろえたので、中身は1行です（2026/11/11）。
     *   長いひとことは、1行に入りません。12字までにそろえてあります。
     */
    /* ★14字まで（2026/11/14・320pxの画面で実際に測って決めた数）。
         15字にすると、細い機種でおしりが切れます。 */
    t(S.maxlen <= 14, '★★★ひとことは14字まで（細い画面で切れない最大）', S.maxlen);
    t(S.sameLen === 0, '　 同じ文が、同じ側にも入っていない', S.sameLen);
    t(S.kindsB >= S.bad && S.kindsG >= S.good,
      '　 どちらも、ちゃんと散らばる', [S.kindsB, S.kindsG]);
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
   *   ★2026/11/13 のご指示で「キラ」に戻りました。
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
  t(app.indexOf('<h2>新規の記録</h2>') !== -1, '★★★見出しが「新規の記録」になっている');
  t(app.indexOf('<h2>1回ぶんを残す</h2>') === -1, '　 古い見出しは残っていない');
  t(/NOTE_CHIPS = \[[^\]]*行先：/.test(app), '★★★「他」のタブに「行先：」がある');
  t(/：\$\/\.test\(val\)/.test(app), '★★★「：」で終わるタグは、続きを打てる（入れ替えない）');
  t(app.indexOf('function mapUrl') !== -1, '★★★場所を地図で開く係がある');
  t(app.indexOf('google.com/maps/search') !== -1, '　 Googleマップの住所を組み立てている');
  t(app.indexOf('placeLink(canonPlace(r.place))') !== -1, '★★★一覧の場所を押すと、地図へ飛ぶ');
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
  t(/wait_min: numOrUnk\(/.test(app), '　 待ち時間も、同じあつかい');
  /* ★乗車時間は、入力欄をなくしました（ご指示・2026/11/12）。
       次の1本の「つけ待ちを始めた時刻」から、自動で割り出します。 */
  t(/ride_min: null/.test(app), '★★★乗車時間は、入れさせない（自動で出す）');
  t(/function autoRide\(/.test(app), '★★★次の1本から、自動で割り出す係がある');
  t(/m >= 0 && m <= 180/.test(app), '　 ありえない長さは「不明」にする');
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
  t(/canEdit\(r\)\s*\n?\s*\?/.test(app), '　 一覧のボタンが、それを見ている');
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
  /* ★題の行は、1行だけの横ならびにしました（ご指摘・2026/11/12
       「スクロールがバグってます」）。高さを変えないためです。
       版・一文・称号は、その下（.hsub）に出しています。 */
  /* ★2026/11/13 から、題の行（.hmain）は 貼り付く行の中の1段目です。
       その下に 版・灰色のブロック・▼ が続きます。 */
  t(/\.hmain\{display:flex/.test(css),
    '★★★題の行は、横ならび（回り込ませない）');
  t(/\.hmain\{[^}]*flex-wrap:nowrap/.test(css),
    '★★★ふきだしと ≡ は、題と同じ行（1行で固定）');
  /*
   * ★まーく様のご指摘（2026/11/11）
   *     「ふきだしって、13文字分くらいは、
   *       ロゴにはみ出さずに入れるんじゃないですか？」
   *   幅を決め打ちしていたので、右に余白が残っていました。
   *   題の右に余っているぶんを、ぜんぶ使います。
   *   ★広さが決まるのは「題の幅」だけ。中の字では変わらないので、
   *     ひとことが入れ替わっても、ふきだしは動きません。
   */
  t(/\.hmain > \.saymount\{[^}]*flex:1 1 auto/.test(css),
    '★★★ふきだしは、余っている幅いっぱいまで広がる');
  /* ★basis を 0 にしています（2026/11/14）。auto のままだと、
       中の字を小さくすると ふきだしも一緒に縮むので、
       「入るまで小さくする」がいつまでも終わりません。 */
  t(/\.saymount \.bubble\{[^}]*flex:1 1 0/.test(css),
    '★★★中のふきだしも、伸びる形になっている');
  t(!/\.saymount \.bubble\{[^}]*[^-]width:\d+px/.test(css),
    '★★★幅の決め打ちは、どこにも残っていない');
  t(/\.hsub > \.subline[^{]*\{[^}]*display:flex/.test(css),
    '★★★版と一文は、題の行の下');
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「サブタイトル(近日中～)は、右寄りにしてください」
   *   版（v1.0）は左のまま、一文だけを右へ寄せます。
   */
  t(/\.hsub > \.subline \.sub\{[^}]*margin-left:auto/.test(css),
    '★★★一文（近日中〜）は、右へ寄せる');
  t(/\.hsub > \.subline \.sub\{[^}]*text-align:right/.test(css),
    '　 字そろえも右');
  t(/\.login \.head > \.subline \.sub\{[^}]*margin-left:auto/.test(css),
    '　 ログインの画面も、同じ寄せ方');
  /* ★2026/11/13 の作り直し：称号はロゴ下（1行目）、
       ボタン位置と管理・ログアウトは2行目（.hrow）で同じ列。 */
  t(/\.hrow\{[^}]*flex-wrap:nowrap/.test(css), '　 ボタン位置と管理は、同じ1列に収める');
  /*
   * ★まーく様のご指示（2026/11/11）
   *     「ポンコツ(称号)だけ、左寄せにしてください」
   *   称号は左、ボタンは右。段いっぱいに広げて、左右に振り分けます。
   */
  t(/\.mytitle\{/.test(css), '★★★称号は、ロゴのすぐ下（1行目）に出す');
  t(!/header > \.who\{[^}]*justify-self:end/.test(css),
    '　 右に かためる書き方は残っていない');
  t(/\.hsub > \.hrow > \.whoR\{/.test(css), '　 右がわを まとめる入れものがある');
  {
    const h = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
    t(/<b class="mytitle" id="me">/.test(h), '★★★index.html：称号はロゴ下の1行目');
    t(/class="hrow"[\s\S]{0,500}id="out"/.test(h),
      '　 index.html：ログアウトは、ボタン位置と同じ列');
    const h2 = fs.readFileSync(path.join(W, 'admin.html'), 'utf8');
    t(/class="whoR"[\s\S]{0,400}id="out"/.test(h2),
      '　 admin.html：ログアウトは、右がわの入れものの中');
  }
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
  t(/\.hsub > \.subline \.sub[\s\S]{0,120}\.ver\{font-size:clamp\(9px,2\.55vw,12\.5px\)\}/.test(css),
    '★★★640px以下でも、一文と同じ大きさ');
  t(/\.hsub > \.subline \.sub[\s\S]{0,120}\.ver\{font-size:clamp\(8\.4px,2\.55vw,12\.5px\)\}/.test(css),
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
      'evTitle(' + JSON.stringify({ d: d, list: new Array(n).fill({ s: '19:00' }) }) + ')', box);
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
  t(/filtOn\(\) \? '<button class="chip warn rst" id="fClear"/.test(app),
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

  /* ---- 割合（ショート・ミドル・ロング）・ご指示 2026/11/12 ----
       「集計」はなくして、代わりに割合を出す形にしました。
       期間ごとのまとめは、いちばん上の「過去の記録」で見られます。 */
  t(/function paneRatio\(\)/.test(app), '★★★割合の画面がある');
  t(!/function reportCard\(/.test(app) && !/function paneRank\(/.test(app),
    '★★★「集計」はなくなっている（上の「過去の記録」と同じ中身だったため）');
  const rep = app.slice(app.indexOf('const FARE_SHORT_MAX'), app.indexOf('function paneOut'));
  t(/FARE_SHORT_MAX = 4999/.test(rep) && /FARE_LONG_MIN  = 10000/.test(rep),
    '★★★分け方は、記録用スプレッドシートと同じ');
  t(/if \(isUnk\(v\)\) return '';/.test(rep),
    '★★★金額が「不明」のものは、割合に入れない（0円にしない）');
  t(/o\.unk\+\+/.test(rep), '　 外したぶんが何件かも、ことばで出す');
  t(/compareCard\(\)/.test(rep), '　 前の期間とくらべる所も、ここに出す');
  /* ★時間帯と乗り場をつなぐ（ご指示・2026/11/12
       「ロングが出やすい乗り場と時間帯はリンクさせてほしいです
         時間帯別に、どこの乗り場がアツいのかをランキング形式に」） */
  t(/let hourPick = ''/.test(app), '★★★えらんだ時間帯を覚える');
  t(/data-hr="' \+ h \+ '"/.test(app), '★★★時間帯の棒を押せる');
  t(/hourPick = b\.dataset\.hr/.test(app), '★★★押すと、その時間帯になる');
  t(/時台に ロングが出やすい乗り場/.test(app), '★★★題にも、その時間帯を出す');
  t(/全時間に戻す/.test(app), '★★★元に戻す押しどころもある');
  t(/時間帯べつ 乗り場ランキング/.test(app), '★★★時間帯べつのランキングを、まるごと出す');
  t(/function longRank\(/.test(app), '　 並べる係は1つにまとめてある');
  /* ★乗り場ごとに「何時に着けるのがよいか」（ご指示・2026/11/12
       「乗り場ごとに、何時に着けるのがベストなのかというのも
         導き出せるようにしてください」） */
  t(/function bestTimeCard\(/.test(app), '★★★乗り場ごとの「何時がよいか」を出す係がある');
  t(/<h2>この乗り場は、何時がよいか<\/h2>/.test(app), '★★★その題が出る');
  t(/id="bestPlaceSel"/.test(app), '★★★乗り場を えらべる');
  t(/bestPlace = bps\.value/.test(app), '　 えらんだら切り替わる');
  t(/が一番よさそうです/.test(app), '★★★一番よい時間を、一言で言い切る');
  /* ★2026/11/13 のご指示で、一番上に出す形に変えました
       （「この乗り場は何時が良いかは、1番上にしてください」）。 */
  t(/bestTimeCard\(D\) \+ hourPlanCard\(D\)/.test(app), '　 画面の一番上に出す');
  t(/x\.o\.n >= HOT_MIN_N/.test(app), '★★★3件そろわない時間帯は出さない');
  t(/x\.o\.n >= HOT_MIN_N/.test(app), '★★★3件より少ない乗り場は、並びに出さない');
  /* ★その1時間だけでは3件に届かないので、前後1時間をふくめて数えます。
       そのことを、必ず画面に書きます（黙って広げない）。 */
  t(/Math\.abs\(Math\.floor\(r\.dep\) - h\) <= 1/.test(app),
    '★★★前後1時間をふくめて数える');
  t(/前後1時間をふくめて/.test(app), '★★★広げたことを、画面に必ず書く');
  t(/\(h - 1\) \+ '〜' \+ \(h \+ 1\) \+ '時の記録から/.test(app), '★★★何時から何時の記録かを出す');
  t(/まだ3件そろった乗り場がありません/.test(app),
    '★★★足りないときは、割合を出さずに件数だけ出す');
  /* ★乗り場べつも（ご指示・2026/11/12
       「乗り場別にも、アツいスポットを出せるようにしてください」） */
  /* ★並べすぎると選べません（ご指摘・2026/11/12
       「こんなたくさんあると、どれ攻めれば良いのか分かりません
         リアルタイム時間に合わせて 3時間おきでまとめてください」） */
  t(/3時間ずつにまとめます/.test(app), '★★★いまの時刻から、3時間おきにまとめる');
  t(/blocks\.push\(\{ a: st, b: Math\.min\(st \+ 2, HOT_TO\) \}\)/.test(app),
    '★★★3時間ずつの枠に切る');
  t(/st \+= 3;/.test(app), '　 3時間ずつ進む');
  t(/blocks\.length < 4/.test(app), '★★★枠は4つまで（並べすぎない）');
  /* ★枠の名前は出しません（ご指示・2026/11/12
       「今 つぎ あと そのさらにあと とかはいらないです」）。
     いまの枠は、赤い枠だけで見分けます。 */
  t(!/'いま', '次', 'そのあと'/.test(app), '★★★枠の名前は、もう出さない');
  t(/i === 0 \? ' now' : ''/.test(app), '★★★いまの枠は、見た目で分かる');
  t(/\.blk3\.now\{/.test(css), '　 その見た目も入っている');
  t(/longRows\(rk, 3\)/.test(app), '★★★1つの枠に出すのは3か所だけ');
  t(/この枠の記録が、まだありません/.test(app), '　 空の枠でも、黙らない');
  t(!/乗り場べつ アツい時間帯/.test(app),
    '★★★前の「ずらっと並ぶ形」は、残っていない');
  /* ★「どこを、何時に」ではなく「何時は、どこ」（ご指示・2026/11/12）。
       「まず、リアルタイムで 近い時間にどこを走るべきなのかが
         すぐ分からないといけません
         なので、時間帯順にして おすすめの乗り場を出す形に」 */
  t(/function hourPlanCard\(/.test(app), '★★★時間順に出す係がある');
  t(/<h2>時間順の狙い目<\/h2>/.test(app), '★★★題は「時間順の狙い目」');
  /* ★一番上は「この乗り場は、何時がよいか」になりました（2026/11/13）。
       時間順の狙い目は、そのすぐ下です。 */
  t(app.indexOf('bestTimeCard(D) + hourPlanCard(D)') !== -1,
    '★★★「この乗り場は、何時がよいか」のすぐ下に出る');
  t(!/狙いどころ（乗り場 × 時間帯）/.test(app),
    '★★★「どこを、何時に」の並びは、残っていない');
  t(!/function spotRank\(/.test(app), '　 その係も、残っていない');
  t(/一番上が、いま走る枠です/.test(app), '★★★どれが「いま」かを、はっきり書く');

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

  t(/data-t="heat"[^>]*><b>表グラフ</.test(html), '★★★タブは「表グラフ」');
  t(!/アツい場所/.test(html), '　 前の「アツい場所」は、残っていない');
  /* ★フィードバックは、タブの行から外して、いちばん上の行の右端へ
       （ご指示・2026/11/12「左利きとかと同じ文字サイズで、
         丸している右寄せで設置してください、サブタイトルはいりません」）。 */
  /* ★2026/11/13 のご指示で、上の行からは消しました
       （「フィードバックは三の方にあるので、ここでは消して」）。
       ≡ の一覧からは行けるよう、目に見えない形で残します。 */
  t(/data-t="fb"/.test(html), '★★★フィードバックへは ≡ から行ける');
  t(/data-t="fb"[^>]*hidden/.test(html), '★★★上の行には出さない（目に見えない形で残す）');
  t(!/class="handbar"/.test(html), '　 前の「ボタン位置」の行は、ブロックにまとめた');
  t(!/<nav id="tabs">[\s\S]*?data-t="fb"[\s\S]*?<\/nav>/.test(html),
    '★★★タブの行には、もう入っていない');
  /* ★≡ のボタンと、ふきだしが重ならないこと（ご指摘・2026/11/12） */
  {
    const cs = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    /* ★余白で避けるのは、その場しのぎでした（ご指摘・2026/11/12
         「もっと考えてください」）。
       ≡ を題の行の中に入れ、その行ごと上に貼り付けます。
       これなら、ふきだしとも下の中身とも、重なりようがありません。 */
    t(/header\{[^}]*position:sticky/.test(cs), '★★★題の行は、上に貼り付ける');
    /* ★2026/11/13：赤丸を「丸の中の右上」に置くため relative にしました。
         貼り付く行の中にあるので、浮いてはいません。 */
    t(/\.fab\.menu\{position:relative/.test(cs), '★★★≡ は、題の行の中に置く（浮かせない）');
    t(/\.fabsheet\{position:absolute/.test(cs), '　 行き先の一覧も、その行にぶら下げる');
    t(!/\.saymount\{padding-right/.test(cs), '★★★ふきだしを よける余白は、もう要らない');
    /* ★高さが変わると、その境目でスクロールがガタつきます
         （ご指摘・2026/11/12「スクロールがバグってます」）。
       貼り付けるのは「題・ふきだし・≡」の1行だけにして、
       版・一文・称号は、貼り付けない所（.hsub）へ出しました。 */
    t(!/body\.scrolled/.test(cs), '★★★下に進んでも、高さは変えない');
    t(!/classList\.toggle\('scrolled'/.test(app), '　 そのための仕掛けも、残っていない');
    t(/\.hsub\{/.test(cs), '★★★版・一文・称号は、貼り付けない所に置く');
    t(/\.hmain\{[^}]*flex-wrap:nowrap/.test(cs), '★★★題の行は、折り返さない（1行で固定）');
    t(/body\{padding-bottom:\d+px\}/.test(cs), '★★★下の固定ボタンに、中身が隠れない');
    const h2 = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
    t(h2.indexOf('<header>') < h2.indexOf('id="fabMenu"') &&
      h2.indexOf('id="fabMenu"') < h2.indexOf('</header>'),
      '★★★≡ は、題の行の中にある');
    t(/\.hmain > #fabMenu\{flex:none;margin-left:auto\}/.test(cs),
      '★★★題の行の、いちばん右に入れる');
    t(/body\[data-hand="l"\] \.hmain > #fabMenu\{order:-1/.test(cs),
      '★★★左利きのときは、いちばん左に入れる');
    /* ★2026/11/13 のご指示で、灰色のブロックは 貼り付く行の中へ
         （「固定スクロールとドッキングさせる形
           （スクロール後も、タップすると、下が開く）」）。 */
    const h5 = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
    t(h5.indexOf('class="hsub"') < h5.indexOf('</header>'),
      '★★★灰色のブロックは、貼り付く行の中にある');
    t(h5.indexOf('class="hver"') < h5.indexOf('class="hsub"'),
      '★★★版は、ロゴのすぐ下（ブロックをしまっても見える）');
  }

  /* ★「粛清完了」には「きろく」とルビを振ります（ご指示・2026/11/12） */
  /* ★字は、いちばん見慣れたゴシックにそろえます（ご指示・2026/11/13
       「how to use とロゴ以外、全フォントをいちばんポピュラー
         （吉野家のメニュータッチタブレットと同じ）ゴシック体に統一」） */
  {
    const cs = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    t(/--body:-apple-system[\s\S]{0,160}Hiragino Sans/.test(cs),
      '★★★ふつうの字は、機種にもとから入っているゴシック');
    t(/--disp:var\(--body\)/.test(cs), '★★★見出しも、同じゴシック');
    t(/--mono:var\(--body\)/.test(cs), '★★★数字も、同じゴシック');
    t(/--goth:'Cinzel',serif/.test(cs), '★★★題と HOW TO USE IT だけ、前の字のまま');
    t(!/Zen Antique/.test(cs) && !/Share Tech Mono/.test(cs) && !/Zen Kaku Gothic/.test(cs),
      '★★★前の字は、どこにも残っていない');
    t(/body\{font-variant-numeric:tabular-nums\}/.test(cs),
      '★★★ゴシックでも、数字の桁はそろう');
    ['index.html', 'login.html'].forEach(function (n) {
      const h7 = fs.readFileSync(path.join(W, n), 'utf8');
      t(!/Zen\+Antique|Share\+Tech\+Mono|Zen\+Kaku/.test(h7),
        '　 ' + n + ' も、要らない字を読み込んでいない');
      t(/family=Cinzel/.test(h7), '　 ' + n + ' は Cinzel だけ読む');
    });
    const lg = fs.readFileSync(path.join(W, 'login.html'), 'utf8');
    t(/HOW TO USE IT/.test(lg), '　 HOW TO USE IT は残っている');
    t(/\.howhead\{font-family:var\(--goth\)/.test(cs), '　 その字も、前のまま');
  }

  /* ★左右を、1本の線にそろえます（ご指示・2026/11/13
       「この左右の文字だったり、枠だったりが揃ってないのは
         不格好なので、ちゃんと徹底してください」）。
     基準は「カードの中の字」＝ページの余白14 + カードの内側19 = 33px。 */
  {
    const cs = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    t(/:root\{--gut:19px\}/.test(cs), '★★★そろえる位置を、1か所で決めている');
    t(/header\{padding-left:33px;padding-right:33px\}/.test(cs),
      '★★★題の行も、同じ位置にそろえる');
    t(/\.hsub > \.subline, \.hsub > \.hrow\{padding-left:var\(--gut\);padding-right:var\(--gut\)\}/.test(cs),
      '★★★ブロックの中も、同じ位置にそろえる');
  }

  /* ★直したのに前の画面が出る、を起こさない（ご指摘・2026/11/13）。
       読み込むファイルに「いつのものか」の印を付け、
       中身が変われば必ず新しいものが読まれるようにします。 */
  {
    const h6 = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
    ['style.css', 'app.js', 'shared.js', 'news.js'].forEach(function (n) {
      t(new RegExp(n.replace('.', '\\.') + '\\?v=\\d{8}-[0-9a-f]{8}').test(h6),
        '★★★' + n + ' に、いつのものかの印が付いている');
    });
    t(!/["']style\.css["']/.test(h6), '　 印の無い読み方は、残っていない');
    const vj = JSON.parse(fs.readFileSync(path.join(W, 'vercel.json'), 'utf8'));
    const hs = (vj.headers[0] || {}).headers || [];
    t(hs.some(x => x.key === 'Cache-Control' && /must-revalidate/.test(x.value)),
      '★★★毎回、新しいかどうかを確かめに行く');
    const pv = fs.readFileSync(path.join(W, 'preview', 'index.html'), 'utf8');
    const m1 = (h6.match(/app\.js\?v=([0-9a-z-]+)/) || [])[1];
    const m2 = (pv.match(/app\.js\?v=([0-9a-z-]+)/) || [])[1];
    t(m1 && m1 === m2, '　 下見用のページも、同じ印になっている', m1 + ' / ' + m2);
  }

  /* ★題の行は、段ごとに薄い帯で区切ります（ご指示・2026/11/12
       「赤く囲った部分を薄グレー背景など引いて
         もっとそれぞれ、くぎって 視覚化しやすくしてください
         もっと、文字も省けるものは省いてください」） */
  {
    const cs = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    const h4 = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
    /* ★2026/11/13 のご指示で、灰背景はブロックぜんたいで1つに
         （「ここはひとつのブロック扱いで、灰背景もひとつでまとめて下さい」）。 */
    t(/\.hsub\{[^}]*background:rgba\(255,255,255,\.0\d+\)/.test(cs),
      '★★★灰背景は、ブロックぜんたいで1つ');
    t(/\.hsub\{[^}]*border-radius/.test(cs), '　 角も丸める');
    t(!/\.hsub > \.subline, \.hsub > \.hrow\{[^}]*background:/.test(cs),
      '　 段ごとの帯は、残っていない');
    t(!/id="meBadge"/.test(h4), '★★★「管理者」の札は、省いた');
    t(!/>管理者</.test(h4), '　 その字も、どこにも残っていない');
    t(/id="toAdmin"/.test(h4), '　 【管理】のボタンは、残っている');
  }

  /* ★メニューは、画面の幅いっぱいに ます目でそろえます（ご指示・2026/11/12
       「ちゃんと、メニューらしく 横幅を画面幅に揃えて、作り直してください」） */
  {
    const cs = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    t(/nav\{display:grid;grid-template-columns:repeat\(4,1fr\)/.test(cs),
      '★★★メニューは4つずつの ます目');
    t(/nav button\{[^}]*width:100%/.test(cs), '★★★1つ1つを、同じ幅にする');
    t(/nav button b\{[^}]*white-space:nowrap/.test(cs), '　 名前は折り返さない');
    const h3 = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
    /* ★タブの中の <i> だけを数えます（▼のつまみは、タブではありません） */
    const navH = h3.slice(h3.indexOf('<nav id="tabs">'), h3.indexOf('</nav>'));
    const subs = (navH.match(/<i>([^<]*)<\/i>/g) || []).map(x => x.replace(/<\/?i>/g, ''));
    /* ★2026/11/13：「バラシ」「関空」を足し、
         「イベント」「お知らせ」は画面から外して ≡ だけにしました
         （ご指示「イベントとお知らせは画面では非表示で、
           三の方には追加したままで」）。画面に出るのは8こ。 */
    t(subs.length === 8, '★★★画面のメニューは8こ', subs.length);
    t(/data-t="ev" aria-selected="false" hidden/.test(h3),
      '★★★イベントは、画面のメニューには出さない');
    t(/data-t="news" aria-selected="false" hidden/.test(h3),
      '★★★お知らせも、画面のメニューには出さない');
    t(subs.every(x => x.length <= 6), '★★★そえる字は6文字まで（ます目からはみ出さない）',
      subs.filter(x => x.length > 6).join('/'));
  }

  /* ★ふきだしが出ているあいだは、固定ボタンを出しません
       （ご指示・2026/11/12「ポップアップの時は表示しないでください」） */
  t(/classList\.add\('modalon'\)/.test(app), '★★★ふきだしを出したら、印を付ける');
  t(/classList\.remove\('modalon'\)/.test(app), '★★★閉じたら、印を外す');
  t(/classList\.toggle\('modalon', !!document\.querySelector\('\.modal'\)\)/.test(app),
    '★★★ふきだしが無ければ、印は必ず外れる（ボタンが消えたままにならない）');
  t(/body\.modalon \.fab\{display:none\}/
    .test(fs.readFileSync(path.join(W, 'style.css'), 'utf8')),
    '★★★そのあいだ、固定ボタンは出さない');

  /* ★ルビが乗るのは「粛清」だけです（ご指示・2026/11/12
       「粛清の上に、きろくと入れてください」）。 */
  /* ★ruby（ふりがなの仕組み）はやめました（2026/11/13）。
       ボタンが横ならびなので、中身がばらばらに並んで
       「きろく」が左下へ落ちました。いまは字の流れの中に置き、
       「きろく」だけを「粛清」の真上に浮かせています。 */
  t(/<span class="k">粛清<i>きろく<\/i><\/span>完了/
    .test(fs.readFileSync(path.join(W, 'index.html'), 'utf8')),
    '★★★「粛清」の上に「きろく」がある');
  {
    const cs = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    t(/\.fab\.done \.k i\{/.test(cs), '　 その見た目も入っている');
    /* ★離れているとルビに見えません（ご指示・2026/11/13）。
       ★形も、角丸の長方形ではなく ほんとうの楕円にします。 */
    /* ★2026/11/13 のご指示で、前の形（角の丸い横長）に戻しました
         （「なんで、丸になってるんですか。前の形に戻してください」）。
         「きろく」と「粛清」の高さのすき間だけを、さらに詰めます。 */
    /* ★「粛清」と「完了」の下の位置を、ぴったりそろえます（ご指示・2026/11/13）。
       ルビを「浮かせて」置くので、漢字の並びは1つも動きません。 */
    t(/\.fab\.done \.k i\{position:absolute/.test(cs),
      '★★★「きろく」だけを浮かせて、漢字の下の位置をそろえている');
    t(/\.fab\.done \.k\{position:relative;display:inline-block\}/.test(cs),
      '　 その置き場も、そのために決めてある');
    t(/bottom:100%/.test(cs), '　 「粛清」の真上に付ける');
    t(!/\.fab\.done rt\{/.test(cs), '　 前のルビの決まりは、残っていない');
    t(!/\.fab\.done\{[^}]*border-radius:50%/.test(cs), '★★★丸にはしない（前の形に戻した）');
    t(/\.fab\.done\{[^}]*height:56px/.test(cs), '　 高さも前の形');
  }

  /* ★えらぶ欄は、▼ と太い枠ではっきり分かるように（ご指示・2026/11/12
       「プルダウンできるやつ、しっかり右際に▼みたいなのつけて
         わかりやすくしてください それに、枠ももう気持ち太くしてください」） */
  {
    const cs = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
    t(/input,select,textarea\{border-width:2px\}/.test(cs), '★★★枠を太くした');
    t(/select\{[\s\S]{0,400}appearance:none/.test(cs), '　 機種ごとのしるしは消す');
    t(/background-image:url\("data:image\/svg\+xml[^"]*M1 1\.5h12L7 8\.5z/.test(cs),
      '★★★自前の ▼ を出す');
    t(/background-position:right 1\dpx center/.test(cs), '★★★▼ は右端に寄せる');
    t(/padding-right:40px/.test(cs), '　 字と ▼ が重ならない');
  }

  /* ★新着の赤丸は、名前の左（ご指示・2026/11/12） */
  t(/<b><span class="dot" id="evDot" hidden><\/span>イベント<\/b>/.test(html),
    '★★★イベントの赤丸は、名前の左');
  t(/<b><span class="dot" id="newsDot" hidden><\/span>お知らせ<\/b>/.test(html),
    '★★★お知らせの赤丸も、名前の左');
  /* ★細い機種（320px）では、入らないときに折り返します
       （2026/11/13、ほかのアカウントの形を確かめて見つけました）。
     nowrap のままだと、フィードバックが画面の外へ出ます。 */
  t(/\.handbar\{flex-wrap:wrap/.test(fs.readFileSync(path.join(W, 'style.css'), 'utf8')),
    '★★★入らないときは、折り返す（画面の外へ出さない）');
  t(/\.handbar \.fbtab\{margin-left:auto\}/
    .test(fs.readFileSync(path.join(W, 'style.css'), 'utf8')), '★★★右端に寄せている');
  t(!/ごいけん/.test(html) && !/ごいけん/.test(app) && !/ごいけん/.test(adm),
    '★★★「ごいけん」は、どこにも残っていない');
  t(/表グラフ/.test(pv) && /フィードバック/.test(pv),
    '　 下見用のページも、同じ名前になっている');
  t(/pvbar/.test(pv), '　 下見用の赤い帯も、消えていない');
  t(/<h2>表グラフ<\/h2>/.test(app), '　 中の題も「表グラフ」');
  t(/<h2>フィードバック<\/h2>/.test(app), '　 中の題も「フィードバック」');

  /* ★2つの画面のちがいが、それぞれに書いてあること */
  t(/えらんだ期間の記録を[\s\S]{0,60}時間帯 × 乗り場/.test(app),
    '★★★「表グラフ」は、えらんだ期間の表だと書いてある');
  t(/いまの時刻に合わせて[\s\S]{0,40}いま行くとよい所/.test(app),
    '★★★「いまアツい」は、いまの時刻の話だと書いてある');
  t(/表グラフ】のほう/.test(app), '　 もう一方への案内もある');
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
  t(/一番上は<b>開演の時刻<\/b>/.test(app), '　 画面の説明も、そろっている');
  const news = fs.readFileSync(path.join(W, 'news.js'), 'utf8');
  t(/大きい時刻は開演/.test(news), '　 使い方のカードにも、そろっている');
  /* ★地図とアーティストの公式リンク（ご指摘・2026/11/12） */
  t(/function evArtHTML\(/.test(app), '★★★アーティストの公式リンクを出す係がある');
  /* ★押しどころの名前は「📍 地図」でそろえます（ご指示・2026/11/12）。
       「地図でさがす」「地図で見る」のような、ばらばらの書き方はしません。 */
  t((app.match(/📍 地図/g) || []).length >= 3, '★★★地図の押しどころは「📍 地図」');
  t(!/地図でさがす/.test(app) && !/📍 地図で見る/.test(app) && !/📍 MAP/.test(app),
    '★★★前のばらばらな書き方は、残っていない');
  t(/くわしく見る/.test(app), '★★★会場のページへの押しどころもある');
  const ven = fs.readFileSync(path.join(W, '..', 'gas', '006-Venue.gs'), 'utf8');
  t(/function vnFeedArtLinks_\(/.test(ven), '★★★GAS側も、公式リンクを渡している');
  t(/al: vnFeedArtLinks_\(ev\)/.test(ven), '　 1件ずつに付けている');
  t(/vnOkUri_/.test(ven.slice(ven.indexOf('function vnFeedArtLinks_'),
     ven.indexOf('function vnFeedArtLinks_') + 1600)),
    '★★★開けない住所は出さない（押せないリンクは嘘と同じ）');
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
  t(/\.ktwhen\{/.test(css) && /\.ktsum b\{/.test(css), '　 その見た目も入っている');
  /* ★ひと区切りごとに、赤い線の見出し（ご指示・2026/11/12
       「赤い線を最初に入れて、見出しとしてだしてもらわないと、
         わけがわかりません」） */
  /* ★乗り場と数字は、1つの区切りにまとめました（ご指示・2026/11/12）。
       見出しは「過去の記録」。 */
  t(/<section class="card blk" id="ktop">[\s\S]{0,80}<h2>過去の記録<\/h2>/.test(html),
    '★★★見出しは「過去の記録」');
  t(html.indexOf('id="ktPlace"') < html.indexOf('id="ktWhen"'),
    '★★★同じ区切りの中で、乗り場が数字より上にある');
  t(!/id="blkPlace"/.test(html), '　 前の2つに分かれた形は、残っていない');
  /* ★メニューを、いちばん上に移しました（ご指示・2026/11/12
       「このメニューが1番上の方が良いのではないでしょうか」）。
     ★そのさらに上に、固定ボタンの左右を切り替える所を置きます。 */
  t(html.indexOf('<nav id="tabs">') < html.indexOf('id="ktop"'),
    '★★★メニューが、数字より上にある');
  t(html.indexOf('class="handbar"') < html.indexOf('<nav id="tabs">'),
    '★★★利き手の切り替えは、いちばん上');
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
  /* ★「1日当たり」は、いちばん上の「過去の記録」（index.html）に出ています。
       かな書きに戻っていないことだけを、上の並びで押さえています。 */
  t(/1日当たり/.test(fs.readFileSync(path.join(W, 'index.html'), 'utf8')),
    '★★★「当たり」と漢字で書いている');
  /* ★耳なれない言い方は使わない（ご指示・2026/11/12
       「ためた分 ぜんぶ ってなんですか」「全期間とかで良いじゃないですか」） */
  ['ためた分', 'ためた記録ぜんぶ', 'ぜんぶに戻す', '乗り場：ぜんぶ',
   'ひとりでに'].forEach(function (w) {
    t(shown.indexOf(w) === -1, '★★★「' + w + '」は、もう出さない');
  });
  t(/'全期間'/.test(shown), '★★★「全期間」と書いている');
  t(/絞り込みを解除/.test(shown), '★★★「絞り込みを解除」と書いている');
  t(shown.indexOf('読みどころ') === -1, '★★★「読みどころ」は使っていない');

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
  const tabs = (html.match(/<button data-t="[^"]+"[^>]*><b>([^<]*)/g) || [])
    .map(x => x.replace(/^[\s\S]*<b>/, '').trim());
  /* ★タブの名前は、ご指示で付け替えました（2026/11/12）。
       つけ待ち→表グラフ／一日の流れ→横棒グラフ／時間×金額→折れ線グラフ／
       集計→割合／全記録はなくす。 */
  ['記録', '狙い目', '表グラフ', '横棒グラフ', '折線グラフ', 'パーセント'].forEach(function (n) {
    t(tabs.indexOf(n) !== -1, '★★★タブ「' + n + '」がある', tabs.join('/'));
  });
  t(tabs.indexOf('全記録') === -1 && tabs.indexOf('集計') === -1,
    '★★★「集計」と「全記録」はなくなっている', tabs.join('/'));
  t(tabs.every(x => x.length <= 7), '★★★どのタブも7字まで', tabs.join('/'));

  /* ---- 表でも、乗り場を目立たせる ---- */
  t(/<th>乗<\/th>/.test(app), '★★★表の見出しは、スプシと同じ短い字');
  t(/<td class="c-place">/.test(app), '★★★乗り場の欄に、目立つ印がある');
  t(/td\.c-place\{|\.scroll\.tbl td\.c-place/.test(css), '　 その見た目も入っている');
}



console.log('■ 入力欄と、タグの言い方（ご指示・2026/11/12）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  /* ★見本の字は、もっと薄く */
  t(/::placeholder\{color:var\(--chipoff\);opacity:\.4\d\}/.test(css),
    '★★★見本の字は、もっと薄くした');
  /* ★見本の字（ご指示・2026/11/13）
       発車時間は 0330、乗車金額は 2900。 */
  t(/placeholder="0330"/.test(app), '★★★時刻の見本は「0330」');
  t(!/placeholder="25:30"/.test(app), '　 前の「25:30」は残っていない');
  t(/placeholder="1500"/.test(app), '★★★金額の見本は「1500」');
  /* ★入力欄の幅は、ぜんぶ同じ */
  const form = app.slice(app.indexOf('<h2>新規の記録</h2>'), app.indexOf('<button class="btn" id="add">'));
  const ws = (form.match(/class="f w\d/g) || []).map(x => x.slice(-1));
  t(ws.length >= 7 && ws.every(x => x === '2'),
    '★★★入力欄の幅が、ぜんぶそろっている', ws.join('/'));
  /* ★幅の決まりが抜けていると、1つだけ細くなります */
  t(/\.f\.w4\{grid-column:span 4\}/.test(css), '　 w4 の決まりも入っている');
  t(/\.f\.w3,\.f\.w4,\.f\.w6\{grid-column:span 2\}/.test(css),
    '　 細い画面でも、はみ出さない');
  /* ★「この場所で覚える」は分かりにくい、とのご指摘。
       言いかえた「この地図で合っている」も、やはり分かりにくいとのご指示で
       なくしました（2026/11/13）。下の ⑥-5 で見ています。 */
  t(!/この場所で覚え/.test(app), '★★★「この場所で覚える」は、言いかえた');
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
  const form = app.slice(app.indexOf('<h2>新規の記録</h2>'), app.indexOf('<button class="btn" id="add">'));
  const at = w => form.indexOf(w);
  /* ★欄の名前は、記録用スプレッドシートと同じ言い方に（ご指示・2026/11/12）
       営業曜日／乗車場所／乗車金額／発車時間／待ち時間／乗車種類／そのほか */
  /* ★乗車場所と発車時間には「＊必須」が付きます（ご指示・2026/11/12） */
  ['営業曜日','乗車金額','待ち時間','乗車種類','そのほか'].forEach(function (w) {
    t(at('<label>' + w + '</label>') !== -1, '★★★欄の名前：' + w);
  });
  ['乗車場所','発車時間'].forEach(function (w) {
    t(at('<label>' + w + '<em class="req">＊必須</em></label>') !== -1,
      '★★★必ず要る欄：' + w);
  });
  t(/function needField\(/.test(app),
    '★★★入れ忘れたら、その欄まで画面を動かして知らせる');
  t(at('<label>乗車時間</label>') === -1,
    '★★★乗車時間の欄は、もう出さない（ご指示・2026/11/12）');
  ['営業日（夜の始まった日）','乗せた時刻（出発）','乗車時間（分）',
   '乗車金額（円）','待ち時間（分）','種類','他（行先・ひとこと）'].forEach(function (w) {
    t(at('<label>' + w + '</label>') === -1, '　 前の書き方は残っていない：' + w);
  });
  /* ★LINEに書く順と同じにします（ご指示・2026/11/12） */
  t(at('<label>乗車場所<em') < at('<label>発車時間<em'),
    '★★★乗車場所 → 発車時間 の順');
  t(at('<label>発車時間<em') < at('<label>乗車金額</label>'),
    '★★★発車時間 → 乗車金額 の順（LINEと同じ）');
  t(at('<label>乗車金額</label>') < at('<label>待ち時間</label>'),
    '★★★乗車金額 → 待ち時間 の順');
  t(at('<label>待ち時間</label>') < at('<label>乗車種類</label>'),
    '★★★待ち時間 → 乗車種類 の順');

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
  /* ★いまは、ます目（4つずつ2段）で組んでいます。
       横に流さず、画面の幅ぴったりに収まります。 */
  t(/grid-template-columns:repeat\(4,1fr\)/.test(nav),
    '★★★入りきらなければ、2段にする（ます目）', nav.slice(0, 70));
  t(!/overflow-x:auto/.test(nav), '★★★横スクロールは、させない');
  t(!/nav::-webkit-scrollbar/.test(css), '　 スクロールバーを隠す細工も、残っていない');
}



console.log('■ 入力の見出し（ご指示・2026/11/12）');
{
  /* ★まーく様のご指示：「あと35秒…」→「乗車データ」。
       「記録の目安時間」は消す。 */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(/<h2>新規の記録<\/h2>/.test(app), '★★★見出しは「新規の記録」');
  t(!/あと35秒/.test(app), '　「あと35秒…」は残っていない');
  t(!/記録の目安時間/.test(app), '　「記録の目安時間」も残っていない');
}



console.log('■ 見返しやすさの3つ（ご指示・2026/11/12「全部やって下さい」）');
{
  const app  = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  const css  = fs.readFileSync(path.join(W, 'style.css'), 'utf8');

  /* ① 期間の切り替えも、上の区切りの中に */
  t(/id="ktPeriodBox"/.test(html), '★★★期間の切り替えが、上の区切りの中にある');
  t(html.indexOf('id="ktPeriodBox"') < html.indexOf('<div id="panes">'),
    '★★★期間は、画面の中身より上にある');
  t(/const periodBox = /.test(app), '　 その中身も入っている');
  /* ★グラフの画面でも、期間を切り替えられるようにしました（ご指示・2026/11/12）。
       上まで戻らずに切り替えられることのほうが、大事です。 */
  t(/\$\{full \? `<div class="chips catch">/.test(app),
    '★★★グラフの画面には、大カテゴリーのタグも出す');
  t(/<div class="fperiod">\$\{periodBox\(\)\}<\/div>/.test(app),
    '★★★グラフの画面でも、期間を切り替えられる');
  t(/\.ktperiod\{/.test(css), '　 その見た目も入っている');

  /* ② 表グラフは、エリアごとに分ける（ご指示・2026/11/12） */
  const heat = app.slice(app.indexOf('function paneHeat(noChips)'), app.indexOf('いまアツい（ここから）'));
  t(/BIG_CATS\.forEach/.test(heat), '★★★大カテゴリー（北・南・他）ごとに、表を分ける');
  t(/const BIG_CATS = \[/.test(app), '★★★大カテゴリーは 北・南・他');
  ['北','南','他'].forEach(function (k) {
    t(new RegExp("k: '" + k + "'").test(app), '　 ' + k + ' がある');
  });
  t(/subs: \['関空', 'ﾊﾞﾗｼ', 'ほか'\]/.test(app), '★★★関空とバラシは「他」に入れる');
  t(/sumLabel \|\| 'エリア計'/.test(app),
    '★★★合計の行は、まとまりのある単位だけに出す');
  t(!/slice\(0,10\)/.test(heat), '★★★乗り場は ぜんぶ出す（10か所で切らない）');
  t(/filterChips\(true\)/.test(heat), '　 大カテゴリーと期間を、その場で切り替えられる');

  /* ③ 前の期間とくらべる */
  t(/function compareCard\(\)/.test(app), '★★★前の期間とくらべる所がある');
  t(/function prevRange\(\)/.test(app) && /function sumIn\(/.test(app),
    '　 くらべる中身も入っている');
  t(/\.cmp\.up\{/.test(css) && /\.cmp\.down\{/.test(css),
    '★★★増えた／減ったで、色が分かれる');

  /* 実際に動かして、1つ前の期を正しく引けるか */
  const box = { console: { log: function(){} } };
  vm.createContext(box);
  vm.runInContext(
    'const pad=n=>String(n).padStart(2,"0");' +
    'let records=[]; let period={mode:"c0",from:"",to:""};' +
    'let _T="2026-11-12"; function today(){return _T;}' +
    app.slice(app.indexOf('const ymd = d =>'), app.indexOf('const visible = () =>')) +
    app.slice(app.indexOf('function prevRange()'), app.indexOf('function diffText(')), box);
  const P = () => vm.runInContext('JSON.stringify(prevRange())', box);
  t(JSON.parse(P()).from === '2026-09-16', '★★★今期の1つ前は、前の月', P());
  /* ★「前は」ではなく「前月は」と、何とくらべているかを書く（ご指示・2026/11/12） */
  t(JSON.parse(P()).name === '前月', '★★★名前は「前月」', P());
  vm.runInContext('period={mode:"free",from:"2026-11-01",to:"2026-11-10"};', box);
  const f = JSON.parse(P());
  t(f.from === '2026-10-22' && f.to === '2026-10-31',
    '★★★自分で決めた期間は、同じ長さの1つ前とくらべる', P());
  t(f.name === '前の10日間', '★★★その名前も「前の10日間」', P());
  vm.runInContext('period={mode:"free",from:"2026-11-10",to:"2026-11-10"};', box);
  t(JSON.parse(P()).name === '前日', '★★★1日だけなら「前日」', P());
  vm.runInContext('period={mode:"free",from:"2026-11-04",to:"2026-11-10"};', box);
  t(JSON.parse(P()).name === '前週', '★★★7日なら「前週」', P());
  vm.runInContext('period={mode:"all",from:"",to:""};', box);
  t(vm.runInContext('prevRange()', box) === null,
    '★★★全期間のときは、くらべる相手を作らない（嘘の数を出さない）');
}



console.log('■「前は」ではなく「前月は」（ご指示・2026/11/12）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const cmp = app.slice(app.indexOf('function compareCard()'), app.indexOf('function reportCard()'));
  t(/const pn = pr\.name;/.test(cmp), '★★★何とくらべているかを、名前で持っている');
  t(!/'<i>前は /.test(cmp) && !/<i>前は /.test(cmp),
    '★★★ただの「前は」は、もう出さない');
  t(/\+ pn \+ 'は /.test(cmp), '★★★「前月は」「前日は」の形で出す');
  t(/と比べています/.test(cmp), '　 いちばん上の一文も、言い方をそろえた');
}



console.log('■ ふつうの漢字で書く（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「くらべるも、比べるの方が一般的ではないのですか？
   *       どうして一般的な日本語を使ってくれないのですか？」
   *   ★かな書きにすると やさしく見えますが、かえって読みにくく、
   *     こちらだけの言い回しに見えます。ふつうの漢字で書きます。
   */
  const NG = ['くらべ', 'いちばん', 'ちがう', 'ちがい', 'うすい',
              'もとに戻', 'たしかめ', '取りちがえ', 'とりちがえ',
              'まちがえ', 'まちがっ', 'かならず', 'ふつう', 'いっしょ',
              'ひと目', 'おなじ', 'あやしい'];
  ['app.js', 'news.js', 'index.html'].forEach(function (f) {
    const src = fs.readFileSync(path.join(W, f), 'utf8');
    NG.forEach(function (w) {
      t(src.indexOf(w) === -1, '★★★' + f + '：「' + w + '」は使わない');
    });
  });
}



console.log('■ みんなの記録への行き方（ご質問・2026/11/13）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  /* 「このみんなの記録、とても良い感じですが
       webサイトにはそのページは載らないのですか？」 */
  t(/<b>みんなの記録<\/b>/.test(app), '★★★≡ の一覧から「みんなの記録」へ行ける');
  t(/<b>仕掛けを起こす<\/b>/.test(app), '　 「仕掛けを起こす」も、そのまま残っている');
}

console.log('■ 表は幅いっぱい、いらない案内は出さない（ご指示・2026/11/14）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  /* 「左によりすぎて、幅いっぱいに綺麗に作れてません」
     「横スクロール不要なものは、横スクロールしてという説明などは無しに」 */
  t(/\.scroll\.tbl table\{table-layout:fixed;width:100%;min-width:320px\}/.test(css),
    '★★★表は、幅いっぱいまで広がる（余った幅は欄に配る）');
  t(!/\.scroll\.tbl table\{table-layout:fixed;width:auto\}/.test(css),
    '　 前の「中身の幅のまま」は残っていない');
  t(/function snoteFit\(\)/.test(app)
    && /n\.hidden = \(box\.scrollWidth <= box\.clientWidth \+ 1\);/.test(app),
    '★★★動かせないときは、「横にスクロールできます」を出さない');
  t((app.match(/snoteFit\(\);/g) || []).length >= 3,
    '　 画面を作ったとき・向きを変えたとき・字が届いたときに、見直す');
}

console.log('■ 乗り場のプルダウンが、からっぽにならない（ご指摘・2026/11/14）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  /* 「このオプションなしとはどういうことでしょうか」
     iPhone は、中身が1つも無いプルダウンを押すと
     「オプションなし」という画面を出します。
     中身を入れたあとに その場所を作り直していたため、
     【直近の記録】の中のものが、毎回 からっぽになっていました。 */
  t(/function placeSelFill_\(\)/.test(app), '★★★中身を入れる係がある');
  const a1 = app.indexOf("pt.innerHTML = gasWakeBar()");
  const a2 = app.indexOf('placeSelFill_();', a1);
  t(a1 > 0 && a2 > a1 && a2 - a1 < 400,
    '★★★作り直した「あと」に、中身を入れ直している');
  t((app.match(/placeSelFill_\(\);/g) || []).length >= 2,
    '　 上の欄と、直近の記録の欄の両方で呼んでいる');
  t(!/\[\$\('#ktPlace'\), \$\('#ktPlace2'\)\]\.forEach\(function \(kpl\) \{\s*\n\s*if \(!kpl\) return;\s*\n\s*kpl\.innerHTML = placeOptions\(\);[\s\S]{0,120}\}\);\s*\n\s*const kcl/.test(app),
    '　 前の「入れてから作り直す」書き方は残っていない');
}

console.log('■ 【仕掛けを起こす】は、まーく様だけ（ご質問・2026/11/14）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  /* 「仕掛けを起こすというのは、僕だけのアカウントの表示になってますか？」
     仕組みの手当てなので、乗務員の方々には出しません。 */
  const bar = app.slice(app.indexOf('function gasWakeBar()'),
                        app.indexOf('function gasWakeBar()') + 900);
  t(/if \(!\(ME\.profile && ME\.profile\.is_admin\)\) return '';/.test(bar),
    '★★★赤い帯は、まーく様だけに出る');
  t(/\(\(ME\.profile && ME\.profile\.is_admin\)\s*\n\s*\? '<a class="fsrow wake"/.test(app),
    '★★★≡ の【仕掛けを起こす】も、まーく様だけ');
  t(/<b>みんなの記録<\/b>/.test(app)
    && app.indexOf('<b>みんなの記録</b>') < app.indexOf('<b>仕掛けを起こす</b>'),
    '　 「みんなの記録」は、みなさんに出したまま');
}

console.log('■ ふきだしに、自由に足せる（ご指示・2026/11/14）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const sh  = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const sql = fs.readFileSync(path.join(W, 'supabase', 'pending.sql'), 'utf8');
  /* 「吹き出しに追加したい一言 みたいな検索枠も付けて
       自由にふやせるようにしてください」 */
  t(/placeholder="吹き出しに追加したい一言"/.test(app),
    '★★★入れる枠がある（そのままの言い方で）');
  t(/function paneSays\(\)/.test(app) && /paneOut\(\) : ''\) \+ paneSays\(\)/.test(app),
    '★★★【記録】の画面に出る');
  /* ★探さなくても行けること（ご質問・2026/11/14
       「ふきだし追加したい時のやつ、どこにあるんですか？」）。
     【記録】の一番下にあって、見つけられませんでした。 */
  t(/sm\.onclick = function \(\) \{\s*\n\s*grab\(\); tab = 'in'; tabSave\(\);[\s\S]{0,260}getElementById\('sayCard'\)/
    .test(app),
    '★★★ふきだしを押すと、【記録】を開いて そこへ行ける');
  t(/id="sayCard"/.test(app), '　 行き先の目じるしがある');
  t(/ふきだしを押すと、ここへ来られます。/.test(app), '　 画面にも、そう書いてある');
  t(/db\.from\('says'\)[\s\S]{0,80}\.insert\(/.test(app), '★★★足したものを、台帳に入れる');
  t(/db\.from\('says'\)[\s\S]{0,80}\.delete\(\)/.test(app), '　 消すこともできる');
  /* 「既にある吹き出し内容の修正もできるようにしてください」 */
  t(/async function sayUpdate\(id, t\)/.test(app)
    && /db\.from\('says'\)[\s\S]{0,90}\.update\(\{ text: t \}\)/.test(app),
    '★★★すでにあるひとことを、直せる');
  /* ★「ほめ・ぼやき」は、まーく様に選ばせません（ご指示・2026/11/13
       「ほめ、ぼやきとかはいりません」）。
       ただし交互に出す決まりは守るので、少ないほうへ こちらで入れます。 */
  t(app.indexOf('data-saykind') === -1, '★★★ほめ・ぼやきのえらびは、無くなっている');
  t(/function sayAutoGood_\(\)/.test(app) &&
    /\.insert\(\{ text: t, good: sayAutoGood_\(\), user_id: ME\.id \}\)/.test(app),
    '★★★どちらに入れるかは、こちらで釣り合うように決める');
  t(/<h2>ふきだしに追加したい文言<\/h2>/.test(app),
    '★★★見出しは「ふきだしに追加したい文言」');
  t(!/>ほめ<\/button>/.test(app) && !/>ぼやき<\/button>/.test(app),
    '　 ほめ・ぼやきのボタンは出ていない');
  t(/data-sayedit=/.test(app) && />直す</.test(app), '　 行ごとに【直す】が出る');
  /* ★すでに台帳へ写したあとでも、足したひとことが出るようにします。
       同じものが入っていれば、何もしません（二重に入れない）。 */
  t(/insert into public\.says \(text, good, user_id\)[\s\S]{0,260}not exists/.test(sql),
    '★★★あとから足したひとことも、台帳へ入る（二重には入れない）');
  t(/create policy says_update[\s\S]{0,220}user_id = auth\.uid\(\) or public\.is_admin\(\)/.test(sql)
    && /grant update \(text, good\) on public\.says to authenticated;/.test(sql),
    '★★★直せるのも、本人と まーく様だけ（台帳の側でも止める）');
  /* 「ふきだしがはみ出さない最大サイズまでの文字数指定して」 */
  t(/const SAY_MAX = 14;/.test(sh),
    '★★★入る字数は14文字（320pxの画面で、実際に測って決めた数）');
  /* ★大きさの合わせ直しは、3段がまえ（2026/11/14）。
       ①いちばん幅を食うものに合わせる ②いま出す字でも確かめる
       ③それでもはみ出すなら、比で一発で合わせる
       ＋ ふきだしの幅が決まったときに、もう一度 合わせ直す */
  t(/function sayShrink\(t, size\)/.test(sh), '★★★はみ出したら、比で一発で合わせる');
  t(/sayShrink\(t, size\);/.test(sh), '　 いま出す字にも、それを通す');
  t(/new ResizeObserver\(/.test(sh) && /ro\.observe\(mount\)/.test(sh),
    '★★★ふきだしの幅が決まったときに、合わせ直す');
  t(/maxlength="\$\{max\}"/.test(app) && /\[\.\.\.t\]\.length > max/.test(app),
    '★★★それより長い字は、入れられない');
  t(/id="sayLeft"/.test(app) && /max - \[\.\.\.sayText\]\.length/.test(app),
    '　 あと何文字かが、打ちながら分かる');
  /* はじめから入っている分も、直せるように台帳へ写す */
  t(/if \(!says\.length && ME\.profile && ME\.profile\.is_admin/.test(app),
    '★★★はじめの分も、台帳へ写して直せるようにする');
  t(/_sayB = b\.length \? b : SAY_BAD;/.test(sh),
    '★★★台帳に入っていれば、そちらだけを出す（二重に出さない）');
  /* まーく様が足されたひとこと（ご指示・2026/11/14） */
  ['松田ァー！誰を乗せてるゥー！','新世界(大阪)の神だァ！','ロングゥー？ふざけるなァ！',
   '出た！合わせてロングマァン！']
    .forEach(function (x) {
      t(sh.indexOf("'" + x + "'") !== -1, '　 「' + x + '」が入っている');
      t([...x].length <= 14, '　 　その字数も14以内', [...x].length);
    });
  t(/function canDelSay\(x\)/.test(app)
    && /x\.user_id === ME\.id \|\| \(ME\.profile && ME\.profile\.is_admin\)/.test(app),
    '★★★消せるのは、足した本人と まーく様だけ（画面の側）');
  t(/create policy says_delete[\s\S]{0,160}user_id = auth\.uid\(\) or public\.is_admin\(\)/.test(sql),
    '★★★台帳の側でも止まっている（片方だけでは守りにならない）');
  t(/create table if not exists public\.says/.test(sql), '　 棚を作る文がある');
  t(/alter table public\.says enable row level security/.test(sql), '　 守りが入っている');
  /* 交互に出す決まりは、足しても こわれないこと */
  t(/function sayAddSet\(bad, good\)/.test(sh)
    && /_sayG = g\.length \? g : SAY_GOOD;/.test(sh),
    '★★★足したぶんも、ぼやき・ほめに分けて持つ');
  t(/const arr = \(_sayTurn\+\+ % 2 === 0\) \? _sayB : _sayG;/.test(sh),
    '★★★足しても、交互に出る');
  t(/_sayWidest = '';/.test(sh), '　 足したら、幅も測り直す');
  /* まーく様がお決めになったひとこと（ご指示・2026/11/14） */
  ['やってんねぇ！','ドリーマーやな！','ええやん！','ぃやぁ～！','やるんだなライナー！',
   '良い人生でした','ﾌｩｰﾝ、そうだねｪｰ','おぅ、しばくぞぉ？','ええとこ行っとるやん！',
   'ドパらせてくれぇ！'].forEach(function (x) {
    t(sh.indexOf("'" + x + "'") !== -1, '　 「' + x + '」が入っている');
  });
}

console.log('■ ふきだしのひとことが、最後まで読める（ご指示・2026/11/14）');
{
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const sh  = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  /* ご指示「題を小さくして、幅をゆずる」
     ひとことが「エアコン、ちょうどえ…」と切れていました。 */
  /* ★字の大きさを小さくするより、字と字のすき間を詰めるほうが、
       題は読みやすいまま 幅だけが縮みます（ご質問・2026/11/14）。 */
  t(/--logo:clamp\(13px,4\.4vw,24px\)/.test(css),
    '★★★題は、字づめをキュッとして幅をゆずった');
  t(/h1\.dn\{letter-spacing:\.05em\}/.test(css),
    '★★★題の字づめを詰めた（.17em → .05em）');
  t(/\.saymount \.face\{width:30px/.test(css),
    '　 顔とすき間も、少し詰めてゆずった');
  t(/rg\.getBoundingClientRect\(\)\.width > t\.getBoundingClientRect\(\)\.width - 0\.6/
    .test(sh),
    '★★★はみ出しは、小数のまま測る（整数だと 0.6px の切れを見逃す）');
  t(/while \(over\(\) && size > 6/.test(sh),
    '　 入るまで、字を小さくする');
}

console.log('■ 割合の帯の数字が、帯からはみ出さない（2026/11/13）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  /* 細い機種（320px）では 14.3% でも 22px しかなく、
     「14.3%」の字（約30px）が帯から はみ出して切れていました。 */
  t(/const need = 34 \/ barW \* 100;/.test(app),
    '★★★入る幅があるときだけ、数字を出す');
  t(!/p >= \(big \? 7 : 12\)/.test(app),
    '　 前の「割合で決める」書き方は残っていない');
  t(/\.bandbar span\{[^}]*overflow:hidden/.test(css),
    '　 それでも はみ出したら、帯の中で止める');
}

console.log('■ 雨雲レーダーの動き（ご指摘・2026/11/13）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  /* 「このマップだと雨雲の動きわかりづらいのですが」 */
  t(/const fr = j\.slice\(0, 7\)\.reverse\(\);/.test(app),
    '★★★直近35分ぶん（7枚）を、古いほうから順に出す');
  t(/t\.setOpacity\(k === i \? \.68 : 0\)/.test(app),
    '　 見せる1枚だけ濃くする（毎回 読み直さない）');
  t(/id="radarPlay"/.test(app) && />とめる</.test(app) && /'うごかす'/.test(app),
    '★★★とめる・うごかすボタンがある');
  t(/function radarStop\(\)\{/.test(app)
    && /clearInterval\(radarMap\._radarTimer\)/.test(app),
    '★★★ほかの画面に移ったら、こま送りを止める（電池を食わない）');
  t(!/if \(tab === 'hot'\) radarBoot\(\); else radarMap = null;/.test(app),
    '　 前の「止めずに捨てる」書き方は残っていない');
  t(/直近35分の動きを、くり返し出します/.test(app),
    '　 画面にも、動くことが書いてある');
}

console.log('■ 読み込み中の絵（ご指示・2026/11/13）');
{
  const html  = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  const adm   = fs.readFileSync(path.join(W, 'admin.html'), 'utf8');
  const css   = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  /* 「透過の人物が中心で／背景にはははをうごかして表示して／
       さらなる背景に画像のような集中線の動きを出してください」 */
  t(/<div class="bootart">/.test(html), '★★★読み込み中の画面に、絵が入っている');
  t(/<img class="bkira" src="img\/kira\.png"/.test(html),
    '★★★まん中は、いただいた透過の絵');
  t(fs.existsSync(path.join(W, 'img', 'kira.png')), '　 その絵が、ちゃんと置いてある');
  t((html.match(/<span class="h\d">は<\/span>/g) || []).length >= 6,
    '★★★背景に「は」が並ぶ');
  t(/@keyframes bha\{/.test(css) && /animation:bha /.test(css),
    '★★★「は」が動く');
  t(/class="blines"/.test(html) && /repeating-conic-gradient/.test(css),
    '★★★さらに後ろに、集中線がある');
  t(/@keyframes bspin\{/.test(css) && /animation:bspin /.test(css),
    '★★★集中線が動く');
  t(/<div class="bootmsg">読み込んでいます…<\/div>/.test(html),
    '　 「読み込んでいます…」も残っている');
  t(/prefers-reduced-motion:reduce\)\{\s*\.blines,\.bstage:before,\.bha span,\.bkira\{animation:none\}/
    .test(css), '　 動きを減らす設定の方には、動かさずに出す');
  t(/<div class="bootart">/.test(adm), '　 管理の画面にも、同じ絵が入っている');
  /* ★四角く切り取らないこと（肩が真横で切れ、集中線も四角く見えました） */
  t(!/\.bstage\{[^}]*overflow:hidden/.test(css),
    '★★★四角く切り取らない（肩が真横で切れないように）');
  /* ★下見用のページにも、絵のフォルダをそろえること。
       /preview/ から開くので、無いと読み込み中の絵が出ません。 */
  t(fs.existsSync(path.join(W, 'preview', 'img', 'kira.png')),
    '★★★下見用のページにも、絵が置いてある');
}

console.log('■ 記録の表と、色の決まり（ご指示・2026/11/12）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const sh  = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');

  /* ① 並びは、記録用スプレッドシートと同じ */
  const th = (app.match(/<th[^>]*>(修正<br>削除|名|付|待|発|金|乗|種・他)<\/th>/g) || [])
    .map(x => x.replace(/<[^>]+>/g, '').replace('修正削除', '操作'));
  t(th.join('/') === '名/付/待/発/金/乗/種・他/操作',
    '★★★並びは 名→付→待→発→金→乗→種・他→操作', th.join('/'));
  t(app.indexOf('<th class="ops">修正<br>削除</th>') > app.indexOf('<th>種・他</th>'),
    '★★★修正・削除が、表の右端（ご指示・2026/11/12）');
  /* ★8つの欄が、390px の画面に ぜんぶ入る（ご指示・2026/11/13
       「この微妙に右が見切れてのが嫌なので 映せるなら映して欲しいですし、
         どうしても無理なら、見切れない幅調整をしてください」）。
       前は 9つの欄のころの幅が残っていて、合計 514px ありました。 */
  {
    const wm = {};
    /* 「th:nth-child(2),th:nth-child(4){width:32px}」のように
       まとめて書いてある分も、ぜんぶ拾います */
    (css.match(/\.scroll\.tbl th:nth-child\(\d\)[^{]*\{width:\d+px/g) || [])
      .forEach(function (x) {
        const w = +x.match(/\{width:(\d+)px/)[1];
        (x.match(/nth-child\((\d)\)/g) || []).forEach(function (c) {
          wm[c.replace(/\D/g, '')] = w;
        });
      });
    const ops = (css.match(/\.scroll\.tbl th\.ops[^{]*\{width:(\d+)px/) || [])[1];
    const pad = (css.match(/\.scroll\.tbl th,\.scroll\.tbl td\{[^}]*padding:6px (\d+)px/) || [])[1];
    const cols = [wm[1], wm[2], wm[3], wm[4], wm[5], wm[6], wm[7], +ops];
    const sum  = cols.reduce(function (t, v) { return t + (v || 0); }, 0)
               + 8 * 2 * (+pad || 0) + 12;
    t(cols.every(function (v) { return v > 0; }),
      '　 8つの欄すべてに、幅が決まっている', cols);
    t(sum <= 356, '★★★表の幅の合計が、390pxの画面に収まる', sum);
    t(!/nth-child\(8\)/.test(css),
      '　 9つの欄のころの幅（8番目）は、残っていない');
    t(/\.scroll\.tbl \.mtag\{font-size:9\.5px/.test(css),
      '　 種のタグは、表の中では小さくする');
  }
  t(/>修正</.test(app) && />削除</.test(app), '★★★「修正」「削除」という名前');
  const tbl = app.slice(app.indexOf('function tableHTML'), app.indexOf('const KANA_SHORT'));
  t(!/>直す</.test(tbl) && !/>消す</.test(tbl), '　 表に、前の「直す」「消す」は残っていない');

  /* ② 日付は、変わったときだけ */
  t(/if \(r\.date !== last\)/.test(app), '★★★日付は、変わったときだけ出す');
  t(/class="dhead /.test(app), '　 その見出しの行がある');

  /* ③ 削除は、2回たずねる */
  const del = app.slice(app.indexOf('async function delRec'), app.indexOf('async function delRec') + 1200);
  t((del.match(/confirm\(/g) || []).length >= 2,
    '★★★削除は2回たずねる（1回で誤って消えない）');
  t(/本当に削除/.test(del), '　 2回目は、はっきり念を押す');

  /* ④ 人ごとの色・金額の色 */
  /* ★色を付けるのは、いちばん左の名前の欄だけ（ご指示・2026/11/12
       「色変えは、1番左の、名前部分のみ色変えしてください」） */
  ['w-dai','w-shun','w-kaito','w-ana','w-jin','w-mark'].forEach(function (c) {
    t(new RegExp('td\\.' + c + '\\s*\\{background:#').test(css), '★★★人の色：' + c);
  });
  t(!/tr\.w-dai\s+td\{background/.test(css), '★★★行ぜんたいは、もう塗らない');
  ['f1','f2','f3','f4','f5'].forEach(function (c) {
    t(new RegExp('\\.' + c + '\\{color:#').test(css), '★★★金額の色：' + c);
  });
  t(/function fareCls/.test(app), '　 金額の色を決める係がある');
  /* ★待ち時間の色（ご指示・2026/11/12「10分以内は薄い青、30分以内は薄い灰」） */
  t(/function waitCls/.test(app), '★★★待ち時間の色を決める係がある');
  t(/n <= 10\) return 'wt1'/.test(app) && /n <= 30\) return 'wt2'/.test(app),
    '★★★10分以内と30分以内で、色を分ける');
  t(/\.wt1\{color:#/.test(css) && /\.wt2\{color:#/.test(css), '　 その見た目も入っている');
  t(/<td class="n ' \+ waitCls\(r\.wait\)/.test(app), '★★★待ちの欄に、その色が付く');
  t(/n < 1000\)  return 'f1'/.test(app) && /n < 20000\) return 'f4'/.test(app),
    '★★★金額の区切りが、スプレッドシートと同じ');

  /* ⑤ 営業曜日の区分（平日／金・祝前日／土／日・祝） */
  t(/function dayCls/.test(sh) && /JP_HOLIDAYS/.test(sh), '★★★営業曜日の区分がある');
  ['d-wd','d-fri','d-sat','d-sun'].forEach(function (c) {
    t(new RegExp('tr\\.dhead\\.' + c + '\\s*td\\{background:#').test(css), '★★★曜日の色：' + c);
  });
  const box = { console: { log: function(){} } };
  vm.createContext(box);
  vm.runInContext('const pad = n => String(n).padStart(2,"0");' +
    sh.slice(sh.indexOf('const JP_HOLIDAYS'), sh.indexOf('/*\n * いま「どの夜」')), box);
  const D = d => vm.runInContext('dayCls("' + d + '")', box);
  t(D('2026-11-11') === 'd-wd',  '★★★水曜は 平日', D('2026-11-11'));
  t(D('2026-11-13') === 'd-fri', '★★★金曜は 金・祝前日', D('2026-11-13'));
  t(D('2026-11-14') === 'd-sat', '★★★土曜は 土', D('2026-11-14'));
  t(D('2026-11-15') === 'd-sun', '★★★日曜は 日・祝', D('2026-11-15'));
  t(D('2026-11-23') === 'd-sun', '★★★祝日（11/23）も 日・祝', D('2026-11-23'));
  t(D('2026-11-02') === 'd-fri', '★★★祝前日（11/2・文化の日の前）は 金と同じあつかい', D('2026-11-02'));

  /* ⑥ 期間の既定は「今期」 */
  t(/period = \{ mode: 'c0'/.test(app), '★★★はじめから「今期」で出す（全期間ではない）');
  t(/mode:'c0', from:'', to:''/.test(app), '　 絞り込みを解除しても、今期に戻る');

  /* ⑥-2 期間のえらびは「日付だけ」。
         ご指示（2026/11/13）「今期、前期～とかいりません 日付だけを載せる形にして。
         直近のは、スプシと同じく 10/16(金)〜〇/〇(曜)←最新の営業曜日 で
         リアルタイム更新するようにして下さい」
         ここを落とすと、また「今期」という こちらだけの言い方が戻る。 */
  /* 画面に出る字（引用符の中）だけを見ます。
     コメントの中には、ご指示そのままの言葉が残っていてよい。 */
  var appStr = (app.match(/'[^'\n]*'/g) || []).join('\n');
  t(!/今期/.test(appStr), '★★★期間のえらびに「今期」と書かない（日付だけ）');
  t(!/前期/.test(appStr), '　 「前期」とも書かない');
  t(!/期間：/.test(appStr), '　 「期間：」という前置きも付けない');
  t(/records\.map\(r => r\.date\)\.filter\(Boolean\)\.sort\(\)/.test(app),
    '　 記録の日付をあつめて、一番新しい営業日を出す');
  t(/periodOptions[\s\S]{0,1400}c\.from <= last && last <= c\.to/.test(app),
    '★★★いま進んでいる期は、おしりを「記録のある一番新しい営業日」にする');
  t(/periodLabel[\s\S]{0,900}last < to/.test(app),
    '　 上に出す表示も、同じところで切る');

  /* ⑥-3 乗り場のプルダウンから、エリア（北・南・他）をえらべる。
         ご指摘（2026/11/13）「中カテゴリーの 北、南、他の選択が出来ませんが」 */
  t(/const BIGSEL\s*=/.test(app), '★★★エリアをえらぶための印（BIGSEL）がある');
  t(/<optgroup label="エリア">/.test(app), '★★★乗り場のプルダウンに「エリア」の組がある');
  t(/BIGSEL\s*\+\s*esc\(k\)/.test(app), '　 北・南・他が、えらべる形で並ぶ');
  t(/indexOf\(BIGSEL\)\s*===\s*0/.test(app), '★★★えらんだら、エリアの絞り込みになる');
  t(/onlyBig\s*=\s*v\.slice\(1\)/.test(app), '　 エリアの絞り込みが入る');

  /* ⑥-4 ≡ の一覧は、フィードバックを一番下に。
         ご指示（2026/11/13）「三を押した時に、フィードバックは1番下にしてください」 */
  t(/fx = x\.dataset\.t === 'fb' \? 1 : 0[\s\S]{0,90}fy = y\.dataset\.t === 'fb' \? 1 : 0[\s\S]{0,60}return fx - fy/
    .test(app), '★★★≡ の一覧で、フィードバックを一番下に送る');

  /* ⑥-5 「この地図で合っている」のタグはやめ、初回だけ誘う。
         ご指示（2026/11/13）
           「この地図であっている、というタグがやはりよく分かりません。
             場所入力時、自信を持ってピンを刺せるなら自動処理して欲しいですし、
             不明であれば、ピンを刺してくださいと、各乗り場の初回だけ
             誘導する形にしてください」 */
  t(app.indexOf('この地図で合っている') === -1, '★★★「この地図で合っている」のタグをやめた');
  t(app.indexOf('✓ 地図は合っている') === -1, '　 「✓ 地図は合っている」も出さない');
  t(app.indexOf("$('#f_mapok')") === -1, '　 そのボタンの動きも残っていない');
  t(/function placeKnown\(/.test(app), '★★★もう分かっている乗り場かを見分ける');
  t(/if \(placeOk\(p\)\) return true;/.test(app), '　 一度 地図で開いた名前は、二度と聞かない');
  t(/pkey\(q\) === k[\s\S]{0,60}return true;/.test(app), '　 すでに記録にある名前も、聞かない');
  t(/!placeKnown\(f\.place\) \? `<div class="pnew">/.test(app),
    '★★★はじめての乗り場のときだけ、1行で地図へ誘う');
  t(/はじめての乗り場です。/.test(app), '　 その文が入っている');
  t(/function placeOkAdd\(/.test(app), '　 地図を開いたら、覚える');
  t(/'#f_map', '#f_mappin'/.test(app), '　 どちらの地図を押しても覚える');
  t(/\.pnew\{/.test(css), '　 その1行の見た目がある');

  /* ⑥-6 各選択項目に【リセット】（ご指示・2026/11/13） */
  ['place','dep','fare','wait','method','note'].forEach(function (k) {
    t(app.indexOf('data-clr="' + k + '"') !== -1, '★★★' + k + ' に【リセット】がある');
  });
  t(/document\.querySelectorAll\('\[data-clr\]'\)/.test(app), '　 押したら、その欄だけ空に戻る');
  t(/\.chip\.rst\{/.test(css), '　 【リセット】の見た目がある');

  /* ⑥-7 時間単価（¥/h）はやめた。
         ご指示（2026/11/13）
           「大丸 ￥29,502/h という計算は明らかにおかしいのでやめてください。
             場所によってコンスタントに周回できるわけが無いですし」
         1本を1時間に伸ばした数で、同じ場所をずっと回れる前提でした。
         ここを落とすと、また嘘の数字が画面に戻る。 */
  var shown = (app.match(/'[^'\n]*'|`[^`]*`/g) || []).join('\n');
  t(!/\/h(?![0-9A-Za-z])/.test(shown), '★★★画面のどこにも「/h」を出さない');
  t(!/時間単価/.test(shown), '★★★「時間単価」という言い方も出さない');
  t(!/\brate\(/.test(app), '★★★時間単価の計算を、1か所も呼んでいない');
  t(/avg:  F\.length \? sum\/F\.length : 0/.test(app),
    '★★★まとめの「avg」は、1本の平均金額になっている');
  t(/1本の平均金額/.test(app), '　 画面には「1本の平均金額」と出す');
  t(idx.indexOf('1本の平均金額') !== -1, '　 上の4つの名札も入れ替わっている');
  t(idx.indexOf('平均 時間単価') === -1, '　 古い名札は残っていない');

  /* ⑥-8 一番上の行を、何にも ふさがせない。
         ご指摘（2026/11/13）
           「マップの方が上に来て、上のスクロールが隠れてしまってます。
             全ページ、このようなことが起きてないのか見返してください」
         地図（Leaflet）は 400〜1000 の重なり順を自前で持っています。
         上の行が 50 のままだったので、地図が上にかぶさりました。
         重なり順は1か所で決め、地図は箱の中に閉じこめます。 */
  var zHead = /position:sticky;top:0;z-index:(\d+)/.exec(css);
  t(!!zHead, '★★★一番上の行に、重なり順が決めてある');
  t(zHead && Number(zHead[1]) >= 1100,
    '★★★一番上の行は、地図（1000まで）より上にある', zHead && zHead[1]);
  t(/\.radarmap\{[\s\S]{0,220}isolation:isolate/.test(css),
    '★★★地図の重なり順を、地図の箱の中に閉じこめている');
  var zMod = /\.modal\{[^}]*z-index:(\d+)/.exec(css);
  t(zMod && Number(zMod[1]) > Number(zHead[1]),
    '　 まん中の箱は、一番上の行より さらに上', zMod && zMod[1]);
  var zFab = /\.fab\{position:fixed;z-index:(\d+)/.exec(css);
  t(zFab && Number(zFab[1]) > Number(zHead[1]),
    '　 丸いボタンも、一番上の行より上', zFab && zFab[1]);
  var zTip = /\.tip[^{]*\{[\s\S]{0,200}?z-index:(\d+)/.exec(css);
  t(!zTip || Number(zTip[1]) < Number(zHead[1]),
    '　 ふきだしは、一番上の行より下', zTip && zTip[1]);

  /* ⑥-9 表グラフ：乗り場の名前を切らない／22時までを1画面に。
         ご指摘（2026/11/13）
           「見切れてます、直してください。
             また、22時まではしっかり1画面で見れるように
             がんばってちょうせつしてください」
         長い名前（天満モスバーガー前 など）が、左へはみ出して切れていた。 */
  t(/function wrapLabel\(/.test(app), '★★★名前を、左の欄に収まる行に折り返す');
  t(/function fitLabel\(/.test(app), '　 収まらなければ、字を小さくしていく');
  t(/lines\.map\(\(ln,k\) =>[\s\S]{0,60}<tspan/.test(app), '　 折り返した行を、1行ずつ置く');
  t(!/…/.test(app.slice(app.indexOf('function heatSvg'), app.indexOf('function paneHeat'))),
    '★★★「…」で切らない（どこの乗り場か分からなくなる）');
  t(/22 - hrs\[0\] \+ 1/.test(app), '★★★22時までの本数から、1時間ぶんの幅を決める');
  t(/const cw   = Math\.max\(36, Math\.min\(64, Math\.floor\(\(vw - lw\) \/ need\)\)\)/.test(app),
    '★★★画面に収まるまで、マスの幅を詰める');
  t(/window\.innerWidth/.test(app), '　 いまの画面の広さを見ている');
  t(/const fz1 = Math\.min\(11\.5, Math\.max\(7, \(cw - 5\) \/ dig/.test(app),
    '　 一番大きい金額に合わせて、字の大きさを決める');

  /* ⑥-10 マスの中は「¥〇〇」。「k」は使わない。平均だと書く。
          ご指示（2026/11/13）
            「〇〇Kって書き方は全然馴染みがないので ￥〇〇としてください。
              これは平均なのですか？ そうであれば 平均も必ず載せてください」 */
  t(!/\}k<\/text>|\/100\)\/10\}k/.test(app), '★★★マスに「k（千円）」を使わない');
  t(/>\$\{yen\(c\.avg\)\}<\/text>/.test(app), '★★★マスは「¥〇〇」で、そのまま出す');
  t(/'平均・' \+ c\.n \+ '件'/.test(app), '★★★マスの下に「平均・〇件」と書く');
  t(/その枠の平均金額（1本当たり）/.test(app), '★★★表の上にも、平均だとはっきり書く');
  t(/一番濃いマスの平均/.test(app), '　 色の案内も「平均」と書く');
  t(/style="font-size:\$\{fz1\}px"/.test(app),
    '　 字の大きさは style で指定する（font-size の決まりに負けないため）');

  /* ⑥-11 「¥〇〇/h」は、台帳のどこにも残さない。
          ご指示（2026/11/13）「￥〇〇/h って計算は全部却下です、
          これが含んでいるものは取り除いて、再見直ししてください」
          app.js だけでなく、管理の画面・ログイン画面・マニュアルまで見ます。 */
  ['app.js','admin.js','shared.js','index.html','login.html','say.html',
   'docs/01_セットアップ手順書.html','docs/03_使い方マニュアル.html'].forEach(function (f) {
    var fp = path.join(W, f);
    if (!fs.existsSync(fp)) return;
    var txt = fs.readFileSync(fp, 'utf8');
    /* 字として出るところだけを見ます（説明のコメントは、残してよい） */
    var shown2 = f.slice(-5) === '.html'
      ? txt.replace(/<!--[\s\S]*?-->/g, '')
      : (txt.match(/'[^'\n]*'|`[^`]*`|"[^"\n]*"/g) || []).join('\n');
    t(!/¥[^<\s]*\/h|\d\/h(?![0-9A-Za-z])/.test(shown2), '★★★' + f + ' に「¥〇〇/h」が無い');
    if (f !== 'docs/03_使い方マニュアル.html')
      t(shown2.indexOf('時間単価') === -1, '　 ' + f + ' に「時間単価」と出さない');
  });
  var ad = fs.readFileSync(path.join(W, 'admin.js'), 'utf8');
  t(/yen\(r\.sum \/ r\.n\)/.test(ad), '★★★管理の画面も「1本の平均」に入れ替わっている');
  t(ad.indexOf('金額,時間単価,記録者') === -1, '　 書き出しの列からも外した');

  /* ⑥-12 横棒グラフ：左の日付を短く、表の中身を広く。
          ご指示（2026/11/13）
            「もっと左の日付部分スマートに短くできませんか？
              1番大事なのは表の中身なので、表の中身が1画面で
              できるだけはっきり見られる形に見直してください」 */
  t(/const L = 58, Rp = 16, rowH = 54, TOPH = 30;/.test(app),
    '★★★左の日付の欄をせまく、1行の高さも低くした');
  /* ⑥-12b 横棒グラフ：パッと見て分かる形に（ご指摘・2026/11/13
            「これ、パッと見、よく分からないので もっと視覚的に
              わかりやすく工夫して再見直しできませんか？」） */
  t(/#FF6A60','ロング'/.test(app) && /#F2C14E','ミドル'/.test(app)
    && /#6FB7FF','ショート'/.test(app),
    '★★★帯の色は、金額の3段階で塗り分ける');
  t(/class="trow"/.test(app) && /\.trow\{/.test(css),
    '★★★1日ごとに、下じきを敷いて行を区切る');
  t(/class="tlin"/.test(app) && /\.tlin\{/.test(css),
    '★★★乗り場の名前を、帯の中に出す');
  t(/\$\{rows\.length\}件 \$\{yen\(sum\)\}/.test(app),
    '★★★日付の下に、その日の件数と合計を出す');
  t((app.match(/text-anchor="middle" style="font-size:11px">\$\{h\}/g) || []).length >= 2,
    '★★★時刻の数字は、上と下の両方に出す');
  t(/fmtD\(d\)\.replace\('\(', ' '\)\.replace\('\)', ''\)/.test(app),
    '★★★日付は「11/11 水」の形（かっこを外して短く）');
  t(/const need = Math\.max\(1, Math\.min\(x1 - x0, 22 - x0\)\)/.test(app),
    '★★★22時までが、横にスクロールせずに見られる');
  t(/const cwT  = Math\.max\(30, Math\.min\(52/.test(app), '　 1時間ぶんの幅を、画面に合わせる');
  /* ⑥-12c 目次：隠している見出しは、目次にも出さない（ご指摘・2026/11/13
            「過去の記録は記録ページのみで良いと言いましたよね？
              なんで他のページにも残ったままなのでしょうか」）
            画面からは消えていたのに、目次にだけ名前が残っていました。 */
  t(/\.filter\(function \(h\) \{ return !h\.closest\('\[hidden\]'\); \}\);/.test(app),
    '★★★隠している見出しは、目次に出さない');

  t(/const nm = String\(r\.place \|\| ''\);/.test(app)
    && /bw >= nm\.length\*9 \+ 8/.test(app),
    '★★★乗り場の名前は、入る広さがあるときだけ出す（切れない）');

  /* ⑥-13 折線グラフ：中分類ごとに1枚ずつ＋好きな乗り場をえらべる。
          ご指示（2026/11/13）
            「この棒グラフは、スプシでいう
              北7、北4、北他、ﾐﾅﾐ、ほか、関空、ﾊﾞﾗｼ 別に作ってください。
              その他にも好きに乗り場をカスタムできる選択肢も追加してください」
          1枚に全部を重ねていたので、点も字も重なって読めなかった。 */
  t(/function scChart\(R\)\{/.test(app), '★★★1枚ぶんの図を、別々に作れるようにした');
  t(/CAT_ORDER\.forEach\(function \(k\)\{[\s\S]{0,260}recCat\(r\) === k/.test(app),
    '★★★中分類（北7・北4・北他・ﾐﾅﾐ・関空・ﾊﾞﾗｼ・ほか）ごとに1枚ずつ出す');
  t(/<h2>乗り場をえらぶ<\/h2>/.test(app), '★★★好きな乗り場をえらぶ欄がある');
  t(/data-scp="/.test(app), '　 乗り場を押してえらべる');
  t(/scPicks\.indexOf\(r\.place\) !== -1/.test(app), '　 えらんだ乗り場だけで1枚にする');
  t(/data-scp-clear/.test(app), '　 えらんだものを、まとめて戻せる');
  t(/localStorage\.setItem\(SCP_KEY/.test(app), '　 次に開いたときも覚えている');
  t(/\$\{v \? yen\(v\) : '0'\}/.test(app), '★★★縦じくも「¥5,000」で出す（¥5k は使わない）');
  t(!/'¥'\+v\/1000\+'k'/.test(app), '　 「k（千円）」の書き方は残っていない');
  t(/\.chip \.cnt\{/.test(css), '　 乗り場のタグに、件数の見た目がある');

  /* ⑥-14 乗り場は、プルダウン以外に「字で探す」でもえらべる。
          ご指示（2026/11/13）
            「乗り場の選択は、プルダウン以外に検索で。
              検索の該当文字が含んでいたら、候補を表示する形にしてください」 */
  t(/id="ktFind" data-find="ktSug"/.test(idx), '★★★上の欄に、乗り場をさがす入力がある');
  t(/id="ktFind2" data-find="ktSug2"/.test(app), '　 直近の記録のほうにもある');
  t(/pkey\(n\)\.indexOf\(q\) !== -1/.test(app), '★★★打った字が入っている乗り場を、候補に出す');
  t(/data-fp="/.test(app), '　 候補を押すと、その乗り場で絞り込める');
  t(/見つかりません/.test(app), '　 当たらないときは、そう出す');
  t(/inp\.addEventListener\('input', show\)/.test(app),
    '★★★候補の欄だけを書きかえる（打っている途中で指が離れない）');
  t(/\.fsug\{/.test(css), '　 候補の見た目がある');

  /* ⑥-15 「この乗り場は、何時がよいか」を一番上に（ご指示・2026/11/13） */
  t(/out = head \+ bestTimeCard\(D\) \+ hourPlanCard\(D\)/.test(app),
    '★★★「この乗り場は、何時がよいか」が一番上');

  /* ⑥-16 2026/11/13 のまとめてのご指示 */

  /* 一番上を、ひとつのブロックに */
  t(/<div class="hsub" id="hsub">/.test(idx), '★★★上のブロックに、まとめる入れものがある');
  t(/id="hgrab"/.test(idx), '★★★指で開け閉めするつまみがある');
  t(/\.hsub\.cl\{[^}]*max-height:0/.test(css), '　 閉じたら、灰色のブロックが まるごと消える');
  t(/function hsubWire\(/.test(app), '★★★開け閉めの動きがある');
  t(/addEventListener\('touchend'/.test(app), '★★★指で上下に払って開け閉めできる');
  t(/Math\.abs\(dy\) < 18/.test(app), '　 少し触れただけでは閉じない');
  /* ★2026/11/13 のご指示で「1番初めは、開いたままの状態で」。
       覚えておく形はやめ、開くたびに 開いた形から始めます。 */
  t(/h\.classList\.remove\('cl'\);/.test(app), '　 はじめは、いつも開いたまま');
  t(/window\.scrollY > 60/.test(app), '　 下にスクロールしたら、1回だけ自動で閉じる');

  /* 過去の記録は、記録の画面だけ */
  t(/ktop\.hidden = \(tab !== 'in'\)/.test(app),
    '★★★「過去の記録」は、記録の画面だけに出す');
  t(!/#ktop\.on\{border-color/.test(css), '★★★赤枠はやめた（ほかの区切りに合わせる）');

  /* 合計と日付を、同じ高さに */
  t(/<div class="ktline">/.test(idx), '★★★日付と合計を、同じ行に入れる');
  t(/\.ktline\{[^}]*align-items:center/.test(css), '★★★高さをそろえる');
  t(!/\.ktsum\{[^}]*margin-top:-20px/.test(css), '　 むりやり重ねる書き方は、残っていない');

  /* 平均には、必ず「平均」と添える */
  t(/'<div class="hv"><i>平均<\/i>'/.test(app), '★★★狙い目の金額に「平均」と添える');
  t(/'<td class="n" style="color:var\(--meter\)">平均 '/.test(app), '　 表の中にも添える');
  t(/'平均 ' \+ yen\(avg\)/.test(app), '　 エリアごとの行にも添える');
  t(/<span class="ln">1本の平均金額<\/span>/.test(app), '　 見出しも「1本の平均金額」');

  /* イベント */
  t(/function evSplit\(/.test(app), '★★★時刻が分からないものを、より分ける');
  t(/x\.k === 'hanyu' \|\| x\.s \|\| x\.e/.test(app),
    '★★★開演も終演も分からないものは、出さない（搬入はのぞく）');
  t(/function evHidNote\(/.test(app), '　 出さなかったものは、名前だけ1行で出す');
  t(/function evNextCard\(/.test(app), '★★★次の日のぶんは、1枚目の「次」を出す');
  t(/nx\.d === d\.d\)\) return ''/.test(app), '★★★同じ日付が2回出ない');
  t(!/evData\.days\[1\]\) \?/.test(app), '　 2枚目を days\[1\] に決め打ちしていない');

  /* リセットの置き場所と、左利き */
  t(/body\[data-hand="r"\] \.rst\{order:-1\}/.test(css), '★★★右利きは、リセットが左');
  t(/body\[data-hand="l"\] \.rst\{order:99\}/.test(css), '★★★左利きは、リセットが右');
  t(/body\[data-hand="l"\] \.hrow \.whoR\{[^}]*order:-1/.test(css),
    '　 管理・ログアウトも、左利きなら左へ');
  t(/id="ktClear"[^>]*class|class="chip rst" id="ktClear"/.test(idx) ||
    /class="chip rst" id="ktClear"/.test(idx), '　 「すべてに戻す」にも目印がある');

  /* 使い方は、端的に */
  {
    const nj = fs.readFileSync(path.join(W, 'news.js'), 'utf8');
    const g  = nj.slice(nj.indexOf('const APP_GUIDE'), nj.indexOf('const APP_NEWS'));
    /* カード1枚につき、絵文字（i）と題（h）で2つ。
       あとは中身の行。ぜんぶで 2×枚数＋行数 になります。 */
    const cards = (g.match(/\{ i:/g) || []).length;
    const strs  = (g.match(/'[^'\n]*'/g) || []).length;
    const ls    = strs - cards * 2;
    t(cards >= 6 && ls <= cards + 2,
      '★★★使い方のカードは、1枚1行まで（読む気をなくさせない）',
      cards + '枚・' + ls + '行');
  }

  /* ⑥-17 2026/11/13（2回目）のご指示 */

  /* 並びは 新規 → 過去 → 直近 */
  t(/function paneInNew\(/.test(app) && /function paneInRecent\(/.test(app),
    '★★★新規と直近を、別々に出せるようにした');
  t(/<div id="panesTop"><\/div>/.test(idx), '　 新規を入れる場所が、過去の記録より上にある');
  t(idx.indexOf('id="panesTop"') < idx.indexOf('id="ktop"'),
    '★★★新規の記録 → 過去の記録 の順');
  t(idx.indexOf('id="ktop"') < idx.indexOf('id="panes"'),
    '★★★過去の記録 → 直近の記録 の順');
  t(/\(tab === 'in'\) \? \(paneInRecent\(\) \+ paneInNew\(\)\) : ''/.test(app),
    '★★★記録の画面は 直近の記録 → 新規の記録 → 過去の記録 の順');

  /* 目次 */
  t(/function tocBuild\(/.test(app), '★★★目次を作る係がある');
  t(/#panesTop \.card > h2, #ktop > h2, #panes \.card > h2/.test(app),
    '　 その画面に出ている見出しを、ぜんぶ拾う');
  t(/behavior: 'smooth'/.test(app), '★★★押すと、そこまで動く');
  t(/hdr\.getBoundingClientRect\(\)\.height/.test(app),
    '　 貼り付いている行のぶん、下げて止める（見出しが隠れない）');
  t(/\.toc\{/.test(css), '　 目次の見た目がある');
  /* ★目次の作り直し（ご指示・2026/11/13）
       「ただのタブ一覧みたいで、目次っぽくない」
       「一つ一つの見出しを1段に2つずつにして、TAPしやすくして」
       「目次の文字自体は1番上にして、実際の目次見出しとは別の行に」
       「ただし、もくじだけで、そんなに高さを埋めたくない」 */
  t(/<button class="toch" id="tocH">目次/.test(app),
    '★★★「目次」の字は、1段目に 単独で置く');
  /* ★4列3段に変えました（ご指示・2026/11/13
       「イベント お知らせ フィードバック も追加して、4列、3段にしてください」） */
  t(/\.tocg\{display:grid;grid-template-columns:repeat\(4,1fr\)/.test(css),
    '★★★見出しは、1段に4つずつ');
  t(/\.tocit\{[^}]*min-height:34px/.test(css), '★★★押しやすい大きさ（34px）');
  t(/const TOC_TABS = \[\{ k:'ev', n:'イベント' \}, \{ k:'news', n:'お知らせ' \},\s*\{ k:'fb', n:'フィードバック' \}\]/.test(app),
    '★★★イベント・お知らせ・フィードバックも、目次から行ける');
  t(/data-tocto/.test(app), '　 押すと、そのページへ移る');
  t(/<em>' \+ \(i \+ 1\) \+ '<\/em>/.test(app), '　 番号を振る（目次らしく）');
  t(/\.toc\.fold \.tocg\{display:none\}/.test(css),
    '★★★「目次」を押せば たためる（高さを食わない）');
  t(/localStorage\.setItem\(TOC_KEY/.test(app), '　 たたんだままを覚える');
  t(/card\.classList\.contains\('fold'\)\) el\.click\(\)/.test(app),
    '★★★閉じてある区切りへ飛ぶときは、開いてから動く');

  /* 乗り場の候補タグは2行まで */
  t(/function placeChipsFit\(/.test(app), '★★★候補タグを2行までに絞る係がある');
  t(/if \(tops\.length > 2\) b\.hidden = true/.test(app), '　 3行目に回ったものは出さない');

  /* ⑥-18 2026/11/13（3回目）のご指示 */

  /* 灰色のブロックを、貼り付く行にドッキング */
  t(idx.indexOf('class="hsub"') < idx.indexOf('</header>'),
    '★★★灰色のブロックは、貼り付く行の中（下まで進んでも ▼ で開く）');
  t(/<i>▼<\/i>/.test(idx), '★★★▼ のつまみがある（押すと下に開く）');
  t(/\.hsub:not\(\.cl\) \+ \.hgrab i\{transform:rotate\(180deg\)\}/.test(css),
    '　 開いているときは ▲（押すと しまう）');
  t(/<div class="hver">/.test(idx), '★★★版は、ロゴのすぐ下');
  t(idx.indexOf('class="hver"') < idx.indexOf('class="hsub"'),
    '　 ブロックをしまっても、版は見える');
  t(!/HSUB_KEY/.test(app), '★★★閉じたままは覚えない（はじめは いつも開いたまま）');

  /* イベントは、種類ごとに大きな見出し＋時間の早い順 */
  t(/const EV_ORDER = \[/.test(app), '★★★イベントを、種類ごとに分ける');
  t(/'🎤 イベント'[\s\S]{0,200}'🔧 バラシ（搬出）'[\s\S]{0,200}'🚚 搬入（設営）'/.test(app),
    '★★★イベント → バラシ → ホテル宴会 → 搬入 の順');
  t(/sort\(\(a, b\) => tmin\(a\) - tmin\(b\)\)/.test(app),
    '★★★その中は、時間の早い順に並べる');
  t(/<div class="evgrp"><h3>/.test(app), '★★★大きな見出しを付ける');
  t(/この日は 設営だけ。夜の人出は ありません。/.test(app),
    '　 搬入の日は、お客が来ないと必ず書く');
  t(/\.evgrp > h3\{/.test(css), '　 その見出しの見た目がある');

  /* バラシ・関空の くわしい表 */
  t(/function whenPane\(/.test(app), '★★★バラシ・関空の表を作る係がある');
  t(/function paneBara\(/.test(app) && /function paneKix\(/.test(app),
    '★★★バラシと関空、それぞれの画面がある');
  t(/data-t="bara"/.test(idx) && /data-t="kix"/.test(idx), '　 タブからも行ける');
  t(/bara:paneBara, kix:paneKix/.test(app), '　 画面の割りふりにも入っている');
  t(/whenPane\('ﾊﾞﾗｼ', 'バラシ', '会場'/.test(app), '★★★バラシは、会場ごとに出す');
  t(/whenPane\('関空', '関空', 'ホテル'/.test(app), '★★★関空は、ホテルごとに出す');
  t(/function whenAgg\(/.test(app), '　 場所 × 時間帯に数える');
  /* ★バラシ・関空だけは「3件そろってから」を外しました
       （ご指示・2026/11/13「バラシタブ、関空タブにおいては
         3件ルールは除いてください（圧倒的に情報が少ないので）」）。
       そのかわり、出すのは「件数」だけ。割合は出しません。
       1件・2件のところには「まだ○件」と はっきり添えます。 */
  t(/return o\.nd >= 1;/.test(app), '★★★バラシ・関空は、1件からでも出す');
  t(/o\.nd < HOT_MIN_N \? '<i class="wfew">まだ '/.test(app),
    '★★★数が少ないところには「まだ○件」と書く');
  t(/\.wfew\{/.test(css), '　 その見た目がある');
  t(/記録がたまるほど、当たるようになります。/.test(app),
    '★★★いま何件から出しているかを、必ず書く');
  t(/まだ数が足りない/.test(app), '　 足りない所も、件数だけは出す（黙って消さない）');
  t(/\.wbar\{/.test(css) && /\.wcell\{/.test(css), '　 時間帯の帯の見た目がある');

  /* ⑥-19 止まったときに、まーく様の手をお借りしない仕組み
          ご指示（2026/11/13）
            「止まってしまった際や、あらゆるエラーにおいて
              基本的に僕が行わずに、クロちゃんに依頼したら
              クロちゃん側で全て直せる仕組みづくりにして欲しい」
            「毎回、スプシにおいても色々やらないといけないの面倒なので」
          これまでは スプレッドシート →【拡張機能】→【Apps Script】…と
          たどっていただいていました。それを、台帳のボタン1回にします。 */
  t(/async function gasLoad\(/.test(app), '★★★受け口の住所を、台帳が読む');
  t(/data\/gas\.json/.test(app), '　 置き場は web/data/gas.json');
  t(fs.existsSync(path.join(W, 'data', 'gas.json')), '　 その紙が、もう置いてある');
  {
    const gj = JSON.parse(fs.readFileSync(path.join(W, 'data', 'gas.json'), 'utf8'));
    t(/^https:\/\/script\.google\.com\/macros\/s\//.test(String(gj.exec || '')),
      '　 中身は、GASの受け口の住所');
    t(!/token|key|secret|password/i.test(JSON.stringify(gj)),
      '★★★鍵のたぐいは、1つも入っていない');
  }
  t(/function gasWakeBar\(/.test(app), '★★★止まっていそうなら、赤い帯を出す');
  t(/function gasStale\(/.test(app), '　 イベントの紙の古さで見分ける');
  t(/20 \* 3600 \* 1000/.test(app), '　 20時間より古ければ、止まっているとみなす');
  t(/仕掛けを起こす/.test(app), '★★★【仕掛けを起こす】のボタンがある');
  t(/fsrow wake/.test(app), '★★★≡ の一覧からも、いつでも押せる');
  t(/\.wakebar\{/.test(css), '　 その帯の見た目がある');
  {
    const vn = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
    t(/function vnGasPush_\(/.test(vn), '★★★GASが、受け口の住所を置き直す');
    t(/VN_GAS_PATH = "web\/data\/gas\.json"/.test(vn), '　 置き場も同じ');
    t(/vnGasPush_\(\);/.test(vn), '　 1日の仕事の中から呼んでいる');
    t(/String\(old\.exec \|\| ""\) === url\) return true/.test(vn),
      '　 住所が同じときは、置き直さない（むだに作り直さない）');
  }

  /* ⑥-20 2026/11/13（4回目）のご指示 */

  /* ≡ の赤い丸（未読があるとき） */
  t(/function menuDot\(/.test(app), '★★★≡ に赤い丸を付ける係がある');
  t(/m\.classList\.toggle\('dotted', !!on\)/.test(app), '　 未読があるときだけ付ける');
  t(/\.fab\.menu\.dotted:after\{/.test(css), '　 その赤い丸の見た目がある');
  t(/menuDot\(\);/.test(app), '　 開いたら、その場で消す');

  /* 見出しだけで、折りたたむ・広げる */
  t(/function foldWire\(/.test(app), '★★★見出しで折りたためる');
  t(/i\.className = 'fmark'; i\.textContent = '▼'/.test(app), '★★★見出しの右に ▼ を付ける');
  t(/\.card\.fold > \*:not\(h2\)/.test(css), '★★★閉じると、中身だけが隠れる（見出しは残る）');
  t(/\.card\.fold > h2 \.fmark[\s\S]{0,60}rotate\(-90deg\)/.test(css),
    '　 ▼ の向きで、開いているか分かる');
  t(/localStorage\.setItem\(FOLD_KEY/.test(app),
    '★★★どこを閉じたかを覚える（画面を作り直しても、開き直さない）');

  /* ⑥-21 乗り場の名前を、きれいに並べる（ご指示・2026/11/13）
          「こういう、新地〇〇なら、ちゃんと順番通りに並べて欲しいです。
            ドン〇〇など、各番号があるものは同様で、
            しっかり綺麗に整列を徹底してください」 */
  t(/function placeSplit\(/.test(app), '★★★名前を「呼び名」と「番号」に分ける');
  t(/function sortPlaces\(/.test(app), '★★★まとまりごと・番号順に並べる係がある');
  t(/x\.s\.num - y\.s\.num/.test(app), '★★★同じ呼び名の中は、番号の小さい順');
  t((app.match(/sortPlaces\(/g) || []).length >= 5,
    '★★★表グラフ・エリアごと・バラシ関空・乗り場えらびで、ぜんぶ同じ並べ方',
    (app.match(/sortPlaces\(/g) || []).length + 'か所');
  t(!/\.sort\(\(x,y\) => y\.n - x\.n \|\| \(x\.p < y\.p \? -1 : 1\)\)/.test(app),
    '　 前の「件数だけで並べる」書き方は、残っていない');
  {
    /* 中身を、そのまま動かして確かめます */
    const i0 = app.indexOf('function placeSplit'), i1 = app.indexOf("/** 「このままでよい」");
    const box2 = {}; vm.createContext(box2);
    vm.runInContext(app.slice(i0, i1), box2);
    const got = vm.runInContext(
      'sortPlaces([{p:"新地7",n:50},{p:"新地4",n:35},{p:"新地17",n:3},{p:"新地5",n:2},' +
      '{p:"新地12",n:1},{p:"ドン10",n:6},{p:"ドン2",n:4},{p:"ドン1",n:2},{p:"天満",n:9}])' +
      '.map(function(o){return o.p;}).join(",")', box2);
    t(got === '新地4,新地5,新地7,新地12,新地17,ドン1,ドン2,ドン10,天満',
      '★★★新地は 4→5→7→12→17、ドンは 1→2→10 の順になる', got);
  }

  /* ⑥-22 「ミナミ」が他エリアに入っていた／ミナミ15番 は ドン15
          ご指摘（2026/11/13）
            「ミナミって書いてるのに、他エリアにあるのおかしくないですか？
              どうして気づかないのでしょうか。
              また、ミナミ15は、ドン15と同じ扱いですので、ドン15に統一してください」 */
  /* ★2026/11/13：振り分けを、記録用スプレッドシートの表（categoryOf_）
       そのままに写しました（ご指摘「もっとスプシのタブを参照してください」）。 */
  t(/"ミナミ","ﾐﾅﾐ","みなみ"/.test(app), '★★★「ミナミ」は、南エリアに入れる');
  t(/v\.indexOf\('ドン'\) !== -1/.test(app), '★★★ミナミの乗り場「ドン〇〇」も、南エリア');
  t(/const NORTH_WORDS = \[/.test(app) && /const SOUTH_WORDS = \[/.test(app),
    '★★★北と南のことばの表が、そのまま入っている');
  t(/function toHalfW\(/.test(app) && /function matchWord\(/.test(app),
    '　 全角半角・「〜通」のそろえ方も、スプシと同じ');
  {
    /* ★スプシ側（001-Code.gs）と、1語でもずれていないかを見ます。
         ずれると、スプシのタブと台帳の中身が食い違います。 */
    const gas = fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8');
    const pick = function (src, name) {
      const i = src.indexOf('const ' + name + ' = [');
      const j = src.indexOf('];', i);
      return src.slice(i, j).replace(/\s/g, '');
    };
    ['NORTH_WORDS', 'SOUTH_WORDS'].forEach(function (nm) {
      t(pick(app, nm) === pick(gas, nm),
        '★★★' + nm + ' が、スプシ側とぴったり同じ');
    });
  }
  t(/const PLACE_ALIAS = \[/.test(app), '★★★同じ所を、1つの名前にそろえる表がある');
  t(/function aliasPlace\(/.test(app), '　 そろえる係もある');
  t(/list\.forEach\(function \(r\)\{ if \(r\.place\) r\.place = aliasPlace\(r\.place\); \}\)/.test(app),
    '★★★読み込んだところで、そろえる（どの画面でも1行にまとまる）');
  t(/if \(r\.place && first\[pkey\(r\.place\)\]\) r\.place = first\[pkey\(r\.place\)\]/.test(app),
    '★★★書き方のゆれも、はじめに入れた書き方にそろえる');
  {
    const box3 = {}; vm.createContext(box3);
    const i0 = app.indexOf('function pkey(');
    let d = 0, j0 = i0;
    while (true) { const c = app[j0]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } j0++; }
    vm.runInContext(app.slice(i0, j0 + 1), box3);
    const k0 = app.indexOf('const PLACE_ALIAS'), k1 = app.indexOf("/** 「このままでよい」");
    vm.runInContext(app.slice(k0, k1), box3);
    ['ミナミ15番', 'ミナミ15', 'ﾐﾅﾐ15番', 'みなみ15'].forEach(function (x) {
      const got = vm.runInContext('aliasPlace(' + JSON.stringify(x) + ')', box3);
      t(got === 'ドン15', '★★★' + x + ' は ドン15 にそろう', got);
    });
    t(vm.runInContext('aliasPlace("ドン15")', box3) === 'ドン15', '　 もともと ドン15 は、そのまま');
    t(vm.runInContext('aliasPlace("ミナミ")', box3) === 'ミナミ', '　 番号の無い「ミナミ」は、変えない');
  }
  {
    /* 中身を、そのまま動かして確かめます（スプシの振り分けと同じか） */
    const m0 = app.indexOf('const NORTH_WORDS'), m1 = app.indexOf('/* 大きな分け方の並び');
    const k0 = app.indexOf('function placeCat(p){');
    let d2 = 0, k1 = k0;
    while (true) { const c = app[k1]; if (c === '{') d2++; else if (c === '}') { d2--; if (!d2) break; } k1++; }
    const box4 = {}; vm.createContext(box4);
    vm.runInContext(app.slice(m0, m1) + '\n' + app.slice(k0, k1 + 1), box4);
    [['ミナミ15番', 'ﾐﾅﾐ'], ['ドン15', 'ﾐﾅﾐ'], ['ドン２', 'ﾐﾅﾐ'], ['難波', 'ﾐﾅﾐ'],
     ['大丸', 'ﾐﾅﾐ'], ['センタラ', 'ﾐﾅﾐ'], ['八幡出口', 'ﾐﾅﾐ'], ['夕陽丘', 'ﾐﾅﾐ'],
     ['新地7', '北7'], ['新地4', '北4'], ['新地17', '北他'],
     ['お初', '北他'], ['ガチマネプラ', '北他'], ['キタ', '北他'], ['西梅田', '北他'],
     ['コナン像前', 'ほか'], ['京橋', 'ほか']].forEach(function (x) {
      const got = vm.runInContext('placeCat(' + JSON.stringify(x[0]) + ')', box4);
      t(got === x[1], '★★★' + x[0] + ' は ' + x[1], got);
    });
  }

  /* ⑥-23 横棒グラフも、スプシのタブごとに（ご指示・2026/11/13）
          「横棒グラフも、スプシに合わせて 北7、北4…と
            スプシに作られてるタブ通りのカテゴリーごとで作ってください。
            自分ですきにカスタムできるようにする機能も残してください」 */
  t(/function tlChart\(R\)\{/.test(app), '★★★1枚ぶんの横棒グラフを、別々に作れる');
  t(/CAT_ORDER\.forEach\(function \(k\)\{[\s\S]{0,300}tlChart\(rows\)/.test(app),
    '★★★スプシのタブと同じ分け方・同じ並びで、1枚ずつ出す');
  t((app.match(/<h2>乗り場をえらぶ<\/h2>/g) || []).length === 2,
    '★★★横棒グラフにも「乗り場をえらぶ」がある（折線グラフと合わせて2つ）');
  t(/tlChart\(picked\)/.test(app), '　 えらんだ乗り場だけで、1枚にまとめる');

  /* ⑦ 横スクロールの案内と、区切りの良い位置 */
  t(/横にスクロールできます/.test(app), '★★★横に動かせることを、ことばで出す');
  t(/scroll-snap-type:x/.test(css), '★★★区切りの良い位置で止まる');
  t(/\.scroll\.tbl table\{table-layout:fixed/.test(css), '　 幅を決めて、広がりすぎないようにする');

  /* ⑧ ふきだしは、押した所の真上 */
  const mv = app.slice(app.indexOf('function placeTip'), app.indexOf('function hideTip'));
  t(/r\.top - h - \d+/.test(mv), '★★★ふきだしは、押したものの真上に出す（指や中身にかぶらない）');
  t(/if \(y < 8\) y = r\.bottom \+/.test(mv), '　 上に入らないときだけ、下に出す');
  t(/showTip\(e, g\.dataset\.tip, g\)/.test(app), '　 どれを押したかを、ふきだしに伝えている');

  /* ⑨ いちばん下の2行は、もう出さない */
  t(!/時間単価 ＝ 金額/.test(html), '★★★下の説明は、もう出さない');

  /* ⑩ イベントの札は「今日」「明日」 */
  t(/evkyo">今日</.test(app) && /evkyo">明日</.test(app),
    '★★★「今日」「明日」の赤い札を出す');
  t(!/evkyo">きょう</.test(app), '　「きょう」は残っていない');
  /* ⑫ イベントを開いたら、赤い点は消える */
  t(/if \(tab === 'ev'\) \{ const d2 = \$\('#evDot'\); if \(d2\) d2\.hidden = true; \}/.test(app),
    '★★★イベントを開いたら、赤い点が消える');

  /* ⑪ 分のタグは90分まで、45までが1行目 */
  t(/MIN_CHIPS = \[0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95\]/.test(app),
    '★★★分のタグは 0〜95');
  t(/\.chips\.mins\{display:grid;grid-template-columns:repeat\(10,1fr\)/
    .test(fs.readFileSync(path.join(W, 'style.css'), 'utf8')),
    '★★★10個ずつの ます目で並べる（45が はみ出さない）');
  /* ★2026/11/13 から、金額は「数字を足していく」形（1〜9 ＋ 0〜00000）。 */
  t(/\.chips\.fares\{display:grid;grid-template-columns:repeat\(9,1fr\)/
    .test(fs.readFileSync(path.join(W, 'style.css'), 'utf8')),
    '★★★金額の1段目は 1〜9 の9個');
  /* ★発車時間の 時・分は、それぞれ1行に収めます（ご指示・2026/11/12
       「これ、なんとかそれぞれ1行にできないですか」）。 */
  t(/\.chips\.deps\{display:grid;grid-template-columns:repeat\(12,1fr\)/
    .test(fs.readFileSync(path.join(W, 'style.css'), 'utf8')),
    '★★★発車時間は12個ずつの ます目（それぞれ1行）');
  t((app.match(/<div class="chips deps">/g) || []).length === 2,
    '　 時の行と、分の行の2つに使っている');
}



const W2 = W;
console.log('■ 営業曜日でも絞れる（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「平日／金・祝前日／土／日・祝
   *       これは、いまアツいのみならず、各比較のものでも、
   *       すぐ切り替えができる形にしてください」
   *   平日と土日祝では、売上の出方がまるで違います。
   *   混ぜて平均すると、どの数字も当てになりません。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  t(/const DAY_CHIPS = \[/.test(app), '★★★曜日の区分をえらぶタグがある');
  /* ★ご指示（2026/11/13）
         「どうして金曜日がはじめなのですか？
           また、金曜日と金・祝前日があるのはなぜですか？
           金・祝前日だけにして。平日を1番左にしてください。
           ただし、開いた日に応じた曜日が、最初に選択されてる形にしてください」
       「全曜日」のタグはやめ、右端の【リセット】で すべてに戻します。 */
  ['平日','金・祝前日','土','日・祝'].forEach(function (n) {
    t(app.indexOf("n:'" + n + "'") !== -1, '　 ' + n + ' がある');
  });
  t(app.indexOf("n:'全曜日'") === -1, '★★★「全曜日」のタグは出さない（リセットに任せる）');
  t(/DAY_CHIPS = \[\{ k:'d-wd', n:'平日' \}/.test(app), '★★★平日が一番左');
  t(/data-day=""[^>]*>リセット/.test(app), '★★★曜日の列に【リセット】がある');
  t(/onlyDay = dayCls\(today\(\)\)/.test(app),
    '★★★開いた日に当たる区分が、はじめから選ばれている');
  t(/o\.dayAt === today\(\)/.test(app), '　 同じ夜のうちは、押して選んだものが残る');
  t(/dayAt: today\(\)/.test(app), '　 いつの夜に選んだかも覚える');
  t(/\(!onlyDay   \|\| dayCls\(r\.date\) === onlyDay\) &&/.test(app),
    '★★★えらぶと、どの画面でも その曜日だけになる');
  t(/data-day=/.test(app), '　 押せるようになっている');
  t(/onlyDay = b\.dataset\.day/.test(app), '　 押したら切り替わる');
  t(/day: onlyDay/.test(app), '　 えらんだ形を覚える');
  t(/filtOn = \(\) => !!onlyPlace \|\| !!onlyCat \|\| !!onlyBig \|\| !!onlyDay/.test(app),
    '★★★曜日や大カテゴリーで絞っているときも「絞り込みを解除」が出る');
  t(/DAY_CHIPS\.filter\(d => d\.k === onlyDay\)/.test(app),
    '★★★何で絞っているかを、数のすぐ下に出す');
  t(/\.chips\.daych/.test(css), '　 その見た目も入っている');

  /* 横棒グラフ・折れ線グラフは、横画面で収まる幅に */
  t(/const W = L \+ Rp \+ Math\.max\(1, \(x1 - x0\)\) \* cwT;/.test(app),
    '★★★横棒グラフは、時間の数から幅を決める（画面に合わせる）');
  t(/const W = L \+ Rp \+ Math\.max\(1, \(x1 - x0\)\) \* cwS, H = 236;/.test(app),
    '★★★折線グラフも、同じ決め方にそろえる');
  /* 折線グラフの読みやすさ（ご指摘・2026/11/13
       「もっと丸のさいずを小さくしたり、極力、数字が被らないような配置に、
         下のメモリもなにもみえなくなってしまってる、
         左の値のスペースがでかすぎますので もっとスマートにギリギリまで詰めて、
         縦1画面でできる限り収まる形に」） */
  t(/const L = 50, Rp = 14, T = 12, B = 30;/.test(app),
    '★★★左の数字の場所を、ギリギリまで詰めた');
  t(/r="2\.8"/.test(app), '★★★丸を小さくした');
  t(/const axisBottom = \(\) =>/.test(app) && /\.axis-l\{/.test(css),
    '★★★一番下の線と目盛りが、点に隠れない');
  t(/\[500,1000,2000,2500,5000,10000,20000\]/.test(app),
    '★★★目盛りは4〜5本（線だらけにしない）');
  t(/if \(x < L \|\| x \+ w > W - 2 \|\| y < T \+ 2 \|\| y > H - B - 2\) return false;/.test(app),
    '★★★金額の数字は、枠の外に出さない');
  t(/\[5,-4\],\[5,-13\],\[5,5\],\[-5-w,-4\]/.test(app),
    '★★★数字は、右・左・上・下と置き場所をさがす（重ねない）');
  t((app.match(/横にスクロールできます（横画面推奨）/g) || []).length >= 3,
    '★★★横画面をすすめる案内を、どのグラフにも出す');
  t(/<div class="scroll fb">/.test(app), '　 図は、カードの端いっぱいまで使う');
  t(/\.scroll\.fb\{margin:0 -16px/.test(fs.readFileSync(path.join(W2,'style.css'),'utf8')),
    '　 その見た目も入っている');
}



console.log('■ 題の下の一文（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「昨日(日付、曜日)の完全万収ライナーは〝○○くん〟です！」
   *     「万収がなかった場合は、～キラです にしてほしいですが、
   *       キラの部分をベルトルトに修正してください」
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const sh  = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  t(/完全万収ライナーは〝/.test(app), '★★★前日の万収を、ほめる一文がある');
  t(/const MANSHU = 10000;/.test(app), '★★★万収は1万円以上');
  /* ★2026/11/13 のご指示で「キラ」に戻りました。 */
  t(/がキラです/.test(sh) && /がキラです/.test(app),
    '★★★万収が無い日は「キラ」');
  t(!/ベルトルトです/.test(sh) && !/ベルトルトです/.test(app),
    '　「ベルトルト」は残っていない');
  t(/prevYmd\(today\(\)\)/.test(app), '★★★見るのは「前の営業日」');
  t(/function prevYmd/.test(sh), '　 その日を出す係がある');
  t(/sb\.textContent = subLine\(\)/.test(app), '★★★画面に出している');

  /* 中身を動かして確かめます */
  const box = { console: { log: function(){} } };
  vm.createContext(box);
  vm.runInContext(
    'const pad=n=>String(n).padStart(2,"0");' +
    'const WD=["日","月","火","水","木","金","土"];' +
    'function fmtD(s){const[y,m,d]=s.split("-").map(Number);' +
    ' return m+"/"+d+"("+WD[new Date(y,m-1,d).getDay()]+")";}' +
    'function prevYmd(d){const[y,m,dd]=String(d).split("-").map(Number);' +
    ' const n=new Date(y,m-1,dd-1);' +
    ' return n.getFullYear()+"-"+pad(n.getMonth()+1)+"-"+pad(n.getDate());}' +
    'function today(){return "2026-11-12";}' +
    'function kiraToday(){return "齋藤くん";}' +
    'const isUnk = v => (v === null || v === undefined || v === "");' +
    'let names = {u1:"ダイスケ", u2:"マーク"}; let records = [];' +
    app.slice(app.indexOf('const KUN = {'), app.indexOf('/* ★人ごとの色')), box);
  const S = rs => { vm.runInContext('records = ' + JSON.stringify(rs) + ';', box);
    return vm.runInContext('subLine()', box); };
  t(S([]).indexOf('キラ') !== -1, '★★★万収が無ければ、キラの一文', S([]));
  const a1 = S([{ date:'2026-11-11', fare:12000, user_id:'u1' }]);
  t(a1 === '昨日（11/11(水)）の完全万収ライナーは〝齋藤くん〟です！',
    '★★★前日に万収があれば、その人をほめる', a1);
  const a2 = S([{ date:'2026-11-11', fare:9999, user_id:'u1' }]);
  t(a2.indexOf('がキラです') !== -1, '★★★9,999円では、万収にしない', a2);
  const a3 = S([{ date:'2026-11-10', fare:20000, user_id:'u1' }]);
  t(a3.indexOf('がキラです') !== -1, '★★★前の日いがいは、数えない', a3);
  const a4 = S([{ date:'2026-11-11', fare:10000, user_id:'u1' },
                { date:'2026-11-11', fare:30000, user_id:'u2' }]);
  t(a4.indexOf('齋藤くん') !== -1 && a4.indexOf('加藤くん') !== -1,
    '★★★2人以上いれば、2人とも ほめる', a4);
  const a5 = S([{ date:'2026-11-11', fare:11000, user_id:'u1' },
                { date:'2026-11-11', fare:15000, user_id:'u1' }]);
  t((a5.match(/齋藤くん/g) || []).length === 1, '　 同じ人は1回だけ', a5);
}



console.log('■ 乗り場の分け方と、書き方のゆれ（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「まず大カテゴリーとして、スプシと同じく
   *       関空、ﾊﾞﾗｼ、北7、北4、北他、ﾐﾅﾐ、ほか を作り
   *       小カテゴリーに、それぞれのタブに合わせた
   *       具体的な乗り場名を挙げてください」
   *     「ひらがなやカタカタの表記揺れがある場合は
   *       基本的に、初めに登録した名前に合わせてください」
   *
   *   ★同じ所が2つの名前に分かれると、どちらの数字も当てになりません。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'index.html'), 'utf8');

  /* ★2026/11/13：振り分けは、記録用スプレッドシートの表をそのまま写しました
       （PLACE_CATS という思いつきの表は、やめました）。 */
  t(/function placeCat\(p\)\{/.test(app), '★★★大きな分け方がある');
  /* ★中カテゴリーの並び（ご指示・2026/11/12で、北・南・他の下に入りました） */
  t(/const CAT_ORDER = \['北7', '北4', '北他', 'ﾐﾅﾐ', '関空', 'ﾊﾞﾗｼ', 'ほか'\]/.test(app),
    '★★★中分類の並びは 北7／北4／北他／ﾐﾅﾐ／関空／ﾊﾞﾗｼ／ほか');
  ['北7','北4','北他','ﾐﾅﾐ'].forEach(function (k) {
    t(app.indexOf("'" + k + "'") !== -1, '　 ' + k + ' がある');
  });
  t(/return 'ほか';/.test(app), '　 どれにも当たらないものは「ほか」');
  /* ★関空とバラシは、乗り場の名前ではなく「他」の欄で決めます
       （ご指示・2026/11/12）。会場の名前で決めると、ただの流しの1本まで
       バラシに入ってしまいます。 */
  t(/function recCat\(r\)\{[\s\S]{0,400}r\.note/.test(app.replace(/\s+/g,' ').replace(/function recCat\(r\)\{/,'function recCat(r){')) ||
    /const no = String\(\(r && r\.note\) \|\| ''\);/.test(app),
    '★★★関空・バラシは「他」の欄で決める');
  t(/<optgroup label="/.test(app), '★★★大きな分け方の中に、乗り場を並べる');
  t(/function canonPlace/.test(app) && /function placeCanonMap/.test(app),
    '★★★書き方のゆれを、1つにそろえる');
  t(/pkey\(r\.place\) !== pkey\(q\.place\)/.test(app),
    '★★★書き方がゆれていても、同じ所として絞れる');
  t(/placeLink\(canonPlace\(r\.place\)\)/.test(app),
    '★★★表でも、そろえた書き方で出す');
  t(/id="ktPlace2"/.test(app) && /ktPlace2/.test(app),
    '★★★「直近の記録」でも、乗り場を選べる');
  /* ★「過去の記録」でも、全員／自分だけを切り替えられる（ご指示・2026/11/12） */
  t(/<div class="chips ktmine">/.test(html), '★★★「過去の記録」でも、全員／自分だけ');
  t(/\.ktmine \[data-mine\]/.test(app), '　 いまの形に合わせて、色が変わる');

  /* 中身を動かして確かめます */
  const box = { console: { log: function(){} } };
  vm.createContext(box);
  vm.runInContext(
    'let records = [];' +
    app.slice(app.indexOf('function pkey('), app.indexOf('/** 1字違いまでの近さ')) +
    app.slice(app.indexOf('const NORTH_WORDS'), app.indexOf('function placeOptions()'))
       .replace(/\/\* ---[\s\S]*?--- \*\//g, ''), box);
  const C = v => vm.runInContext('placeCat(' + JSON.stringify(v) + ')', box);
  const R2 = (place, note) => vm.runInContext(
    'recCat(' + JSON.stringify({ place: place, note: note }) + ')', box);
  t(R2('新地7', '関空') === '関空',   '★★★他に「関空」と書いてあれば 関空');
  t(R2('大阪城ホール', 'バラシ') === 'ﾊﾞﾗｼ', '★★★他に「バラシ」と書いてあれば ﾊﾞﾗｼ');
  t(R2('大阪城ホール', '') === 'ほか', '★★★会場の名前だけでは、ﾊﾞﾗｼにしない');
  t(R2('新地7', '') === '北7',        '★★★他が空なら、乗り場の名前で決める');
  t(C('新地7') === '北7',        '★★★新地7 → 北7');
  t(C('新地4') === '北4',        '★★★新地4 → 北4');
  t(C('新地8') === '北他',       '★★★新地8 → 北他', C('新地8'));
  t(C('梅田ヒルトン') === '北他','★★★梅田 → 北他');
  t(C('難波') === 'ﾐﾅﾐ',         '★★★難波 → ﾐﾅﾐ');
  t(C('道頓堀') === 'ﾐﾅﾐ',       '★★★道頓堀 → ﾐﾅﾐ');
  t(C('天王寺') === 'ほか',      '★★★当てはまらないものは ほか', C('天王寺'));

  /* 書き方のゆれ … 最初に入れたほうに そろう */
  vm.runInContext('records = [' +
    '{date:"2026-10-01", place:"なんば南"},' +
    '{date:"2026-11-01", place:"ナンバ南"}];', box);
  const K = v => vm.runInContext('canonPlace(' + JSON.stringify(v) + ')', box);
  t(K('ナンバ南') === 'なんば南', '★★★あとから入れた書き方は、最初のものにそろう', K('ナンバ南'));
  t(K('なんば南') === 'なんば南', '　 最初のものは、そのまま');
}



console.log('■ 分のタグの並びと、乗り場のタグ（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「時間タブですが、45までを1行にして90まで入れてと伝えてませんでしたか」
   *     「乗車場所のタブですが、各人にあわせた、
   *       これまででの入力が多いもののタブを入れてください」
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  /* ★2026/11/13 のご指示で、待ち時間も「数字を足していく」形にしました
       （「待ち時間のタブも 1、2、3、4、5、6、7、8、9、0 にしてください」）。
       45・90 のような決め打ちのタグは、やめました。 */
  t(!/MIN_CHIPS\.slice/.test(app), '★★★決め打ちの分のタグは、もう出さない');
  t(/data-wa="\$\{v\}"/.test(app), '★★★待ち時間は 1〜9 を押して足していく');

  /* 乗り場のタグは、その人が よく使う所 */
  t(/function myPlaces\(/.test(app), '★★★その人が よく使う乗り場を出す係がある');
  t(/const f = form, pl = myPlaces\(\);/.test(app), '★★★入力の画面で、それを使っている');
  t(/r\.user_id === ME\.user\.id\) mine\[name\]/.test(app), '　 自分の記録から数えている');
  t(/Object\.keys\(mine\)\.length \? mine : all/.test(app),
    '★★★まだ自分の記録が無い人には、全員ぶんから出す');
}



console.log('■ 発車時間を、押すだけで入れる（ご指示・2026/11/12）');
{
  /*
   * ★まーく様のご指示（2026/11/12）
   *     「発車時間のタブですが、時間と、分数とで、入れたら追加で入れるように
   *       時 17〜04／分 00〜55（5分きざみ）」
   *   走りながら入れるので、字を打たせません。
   */
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  t(/const DEP_H = \['17','18','19','20','21','22','23','00','01','02','03','04'\]/.test(app),
    '★★★時は 17〜23、00〜04');
  t(/const DEP_M = \['00','05','10','15','20','25','30','35','40','45','50','55'\]/.test(app),
    '★★★分は 5分きざみで 00〜55');
  t(/data-dh=/.test(app) && /data-dm=/.test(app), '★★★どちらも押せる');
  t(/form\.dep = depSet\(form\.dep, b\.dataset\.dh, null\)/.test(app), '　 時を押すと、時だけ変わる');
  t(/form\.dep = depSet\(form\.dep, null, b\.dataset\.dm\)/.test(app), '　 分を押すと、分だけ変わる');

  const box = { console: { log: function(){} } };
  vm.createContext(box);
  vm.runInContext(app.slice(app.indexOf('function depPart('),
                            app.indexOf('function depSet(') +
                            app.slice(app.indexOf('function depSet(')).indexOf('\n}') + 2), box);
  const S = (v,h,m) => vm.runInContext('depSet(' + JSON.stringify(v) + ',' +
    (h===null?'null':JSON.stringify(h)) + ',' + (m===null?'null':JSON.stringify(m)) + ')', box);
  t(S('', '25', null) === '2500', '★★★空のときに 時を押すと、分は00');
  t(S('', null, '30') === '0030', '★★★空のときに 分を押すと、時は00');
  t(S('2500', null, '30') === '2530', '★★★あとから 分だけ足せる');
  t(S('2530', '23', null) === '2330', '★★★あとから 時だけ変えられる');
  t(S('23:30', null, '45') === '2345', '　「23:30」の形でも、ちゃんと読める');
  const P = v => vm.runInContext('JSON.stringify(depPart(' + JSON.stringify(v) + '))', box);
  t(P('2530') === '{"h":"25","m":"30"}', '　 時と分に分けられる');
  t(P('') === '{"h":"","m":""}',          '　 空のときは、どちらも空');
}



console.log('■ よく出る乗車金額のタグ（ご指示・2026/11/12）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  /* ★金額は「数字を足していく」形に変えました（ご指示・2026/11/13）
       「1、2、3、4、5、6、7、8、9／0、00、000、0000、00000
         という形で、数値追加できる形にしてください」 */
  t(/const FARE_KEYS  = \['1','2','3','4','5','6','7','8','9'\]/.test(app),
    '★★★1段目は 1〜9');
  /* ★00000 は ありえないので外しました（ご指示・2026/11/13） */
  t(/const FARE_ZEROS = \['0','00','000','0000'\]/.test(app),
    '★★★2段目は 0・00・000・0000');
  t(app.indexOf("'00000'") === -1, '　 00000 は残っていない');
  t(/data-fa="\$\{v\}"/.test(app), '★★★押すと、うしろに足される形');
  t(/form\[fld\] = cur \+ k;/.test(app), '　 押すたびに、足していく');
  /* ★待ち時間も、同じ形にしました（ご指示・2026/11/13
       「待ち時間のタブも 1、2、3、4、5、6、7、8、9、0 にしてください」） */
  t(/padWire\('data-wa', 'wait', 3, 'f_wait'\)/.test(app),
    '★★★待ち時間も、数字を足していく形');
  t(/data-wa="\$\{v\}"/.test(app), '　 1〜9 のタグがある');
  t(/data-wa="0"/.test(app), '　 0 のタグもある');
  t(/data-fa="BS"/.test(app), '　 1つ消すボタンもある');
  t(/\.chips\.fares \.chip\{/.test(css), '　 その見た目も入っている');

  const box = {};
  vm.createContext(box);
  vm.runInContext(app.slice(app.indexOf('const FARE_CHIPS = ['),
                            app.indexOf('const DEP_H =')), box);
  const F = vm.runInContext('FARE_CHIPS', box);
  /* ★8個ずつ3段に、ぴったり収まる数にしています（ご指示・2026/11/12
       「2段目のギリギリまでタブを追加してください」）。 */
  t(F.length === 24, '★★★ぜんぶで24個（8個ずつ3段ぴったり）', F.length);
  t(F.length % 8 === 0, '★★★段のおしりが、余らない');
  t(F[0] === 600 && F[3] === 900, '　 600・700・800・900');
  t(F[4] === 1000 && F[23] === 2900, '　 1000から2900まで', F[4] + '〜' + F[23]);
}



console.log('\n■ 待ち時間のタグと、読み込み中の注記（ご指示・2026/11/13）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');
  const ix  = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
  const ad  = fs.readFileSync(path.join(W, 'admin.html'), 'utf8');
  /* ★待ち時間の「0」は1段目に入れました（ご指示・2026/11/13
       「待ち時間の0のタブは1列目に収められませんか？」） */
  t(/class="chips fares w10"/.test(app), '★★★0を含めて10個を1段目に並べる');
  t(/\.chips\.fares\.w10\{grid-template-columns:repeat\(10,1fr\)/.test(css),
    '　 10列分の見た目も入っている');
  /* 2段目に数字が残っていないこと（残ると、2度出る） */
  {
    const w = app.slice(app.indexOf('class="chips fares w10"'));
    const seg = w.slice(0, w.indexOf('</div>', w.indexOf('data-wa="BS"')));
    t(!/data-wa="0"[\s\S]*data-wa="0"/.test(seg), '　 0 は1つだけ');
  }
  /* ★読み込み中の絵に、小さく注記を入れました（ご指示・2026/11/13） */
  const note = '※これはAIによるロイヤリティフリー画像のはずです';
  t(ix.indexOf(note) !== -1, '★★★表の画面に注記がある');
  t(ad.indexOf(note) !== -1, '★★★管理の画面にもある');
  t(/\.bootnote\{/.test(css), '　 その見た目も入っている');
}


console.log('\n■ 表・タグ・期間の直し（ご指示・2026/11/13）');
{
  const app = fs.readFileSync(path.join(W, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(W, 'style.css'), 'utf8');

  /* ★「乗り場」と「付け待ち」は同じものなので、1つにそろえました
       （ご質問・2026/11/13「乗り場と付け待ちは、ほぼ同じ意味合いなのに、
         2つともあるのはなぜですか？」）。
       2つの名前で持つと、同じ乗せ方の売上が別々に数えられます。 */
  const box = {};
  vm.createContext(box);
  vm.runInContext(app.slice(app.indexOf('const METHODS = ['),
                            app.indexOf("/** 種類ごとの色分け")), box);
  const M = vm.runInContext('METHODS', box);
  t(M.indexOf('付け待ち') === -1, '★★★えらべる種類から、付け待ちは外した');
  t(M.indexOf('乗り場') !== -1, '　 乗り場は残っている');
  const nm = vm.runInContext('normMethod', box);
  ['付け待ち', '付待ち', 'つけ待ち', 'つけまち'].forEach(function (x) {
    t(nm(x) === '乗り場', '★★★「' + x + '」は「乗り場」にそろえる', nm(x));
  });
  t(nm('乗り場') === '乗り場' && nm('ホテル') === 'ホテル', '　 ほかはそのまま');
  t(/esc\(normMethod\(r\.method\)\)/.test(app),
    '★★★前に入れた記録も、出すときにそろえる');
  /* 横棒グラフの凡例も、乗り場とまぎらわしくない言い方に */
  t(/>待ち時間<\/span>/.test(app), '　 横棒グラフの凡例は「待ち時間」');

  /* ★枠の中の字は、まん中（ご指示・2026/11/13） */
  t(/\.chip\{display:inline-flex;align-items:center;justify-content:center/.test(css),
    '★★★タグの字は、枠のまん中');
  t(/\.scroll\.tbl td\{text-align:center\}/.test(css), '★★★表の中身も、まん中');
  /* ★区切りが見えないとのご指摘（2026/11/13） */
  t(/\.scroll\.tbl th,\.scroll\.tbl td\{border-right:1px solid/.test(css),
    '★★★表に、たての区切り線がある');
  t(/\.grid-l\{stroke:#44598A/.test(css), '★★★表グラフの区切りも、明るくした');
  /* 「待」の欄に「不明」が入っても、となりに重ならないこと */
  t(/\.scroll\.tbl th:nth-child\(3\)\{width:26px/.test(css), '★★★「待」の欄は、不明が入る幅');
  t(/\.scroll\.tbl td:nth-child\(3\)\{font-size:10px;overflow:hidden\}/.test(css),
    '　 万が一でも、欄の外に出ない');

  /* ★期間のめどしは、営業月（ご指示・2026/11/13） */
  t(/o\.period && typeof o\.period\.mode === 'string' && o\.periodAt === today\(\)/.test(app),
    '★★★営業日が変わったら、期間はその日の営業月に戻る');
  t(/periodAt: today\(\)/.test(app), '　 いつの分かを、一緒に覚えている');
  t(/let onlyPlace = '', onlyCat = '', onlyBig = '', period = \{ mode: 'c0'/.test(app),
    '　 何も覚えていなければ、今の営業月');
}

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
