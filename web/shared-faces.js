/* ============================================================
 *  顔とひとこと（一覧のページ用）
 *
 *  ★この紙は、自動で作られます。ここを直しても、次に作り直すと消えます。
 *    直すのは  web/shared.js  です。
 *    直したら  python3 tools/build_faces.py  を走らせてください。
 * ========================================================== */
const FACE_BAD_EYES = [
  '<path d="M8 13 L16 10 M20 10 L28 13" stroke-width="2.2" fill="none"/>',                   // つり目
  '<path d="M9 10 L16 13 L9 16 Z"/><path d="M27 10 L20 13 L27 16 Z"/>',                      // とがり目
  '<path d="M8 9 L16 12 L8 15" stroke-width="2" fill="none"/>' +
    '<path d="M28 9 L20 12 L28 15" stroke-width="2" fill="none"/>',                          // より目
  '<path d="M9 13 h7 M20 13 h7" stroke-width="2.4" fill="none"/>',                           // 半目
  '<circle cx="12" cy="13" r="4.6"/><circle cx="24" cy="13" r="2"/>',                         // 左右ちがい
  '<circle cx="12" cy="12" r="4.4"/><circle cx="24" cy="14" r="4.4"/>',                       // ずれ目
  '<circle cx="12" cy="13" r="4.2"/><circle cx="24" cy="13" r="4.2"/>' +
    '<circle cx="12" cy="13" r="1.6" fill="#B3161D"/><circle cx="24" cy="13" r="1.6" fill="#B3161D"/>', // 赤目
  '<circle cx="12" cy="13" r="3.4"/><circle cx="24" cy="13" r="3.4"/>',                       // まんまる（おどろき）
  '<circle cx="12" cy="13" r="3.8"/><path d="M20 13 h7" stroke-width="2.4" fill="none"/>',    // 片目つぶり
  '<circle cx="12" cy="13" r="4.2" fill="none" stroke-width="1.6"/><circle cx="12" cy="14.8" r="1.8"/>' +
    '<circle cx="24" cy="13" r="4.2" fill="none" stroke-width="1.6"/><circle cx="24" cy="14.8" r="1.8"/>' // 三白眼
];
const FACE_BAD_MOUTH = [
  '<path d="M10 27 Q18 20 26 27" stroke-width="2.2" fill="none"/>',                           // への字
  '<path d="M10 23 L14 27 L18 23 L22 27 L26 23" stroke-width="2" fill="none"/>',              // ギザギザ
  '<path d="M11 24 h14" stroke-width="2.4" fill="none"/>',                                    // 一文字
  '<path d="M10 22 Q18 30 26 22" stroke-width="2.2" fill="none"/>' +
    '<path d="M14 26 v3 M18 27 v3 M22 26 v3" stroke-width="1.6" fill="none"/>',               // 歯ぎしり
  '<path d="M11 25 Q14 21 18 25 Q22 29 25 25" stroke-width="2.2" fill="none"/>',              // うねり
  '<path d="M12 22 h12 v6 h-12 Z" stroke-width="2" fill="none"/>',                            // 四角口
  '<ellipse cx="18" cy="25" rx="5" ry="4"/>',                                                 // ぽかん
  '<path d="M18 21 L23 26 L18 29 L13 26 Z"/>',                                                // とがり口
  '<path d="M11 26 L25 23" stroke-width="2.4" fill="none"/>',                                 // 斜めの口
  '<path d="M12 25 Q18 22 24 25" stroke-width="2.2" fill="none"/>' +
    '<path d="M15 25 v2 M21 25 v2" stroke-width="1.6" fill="none"/>'                          // むすび口
];

/* 「乗せてよかった」ときの顔（目10通り × 口10通り ＝ 100通り） */
const FACE_GOOD_EYES = [
  '<path d="M8 15 Q12 10 16 15" stroke-width="2.2" fill="none"/>' +
    '<path d="M20 15 Q24 10 28 15" stroke-width="2.2" fill="none"/>',                         // にっこり弧
  '<path d="M8 14 L16 11 M20 11 L28 14" stroke-width="2.2" fill="none"/>',                    // たれ目（外がわが下がる）
  '<circle cx="12" cy="13" r="3.6"/><circle cx="24" cy="13" r="3.6"/>' +
    '<circle cx="13.5" cy="11.5" r="1.1" fill="#17171A"/><circle cx="25.5" cy="11.5" r="1.1" fill="#17171A"/>', // きらきら
  '<path d="M8 15 Q12 10 16 15" stroke-width="2.2" fill="none"/><circle cx="24" cy="13" r="3.4"/>', // ウインク
  '<path d="M9 14 q3.5 -3 7 0" stroke-width="2.2" fill="none"/>' +
    '<path d="M20 14 q3.5 -3 7 0" stroke-width="2.2" fill="none"/>',                          // 細め笑い
  '<path d="M9 13 q3.5 3 7 0" stroke-width="2.2" fill="none"/>' +
    '<path d="M20 13 q3.5 3 7 0" stroke-width="2.2" fill="none"/>',                           // 閉じ目
  '<circle cx="12" cy="13" r="4"/><circle cx="24" cy="13" r="4"/>' +
    '<circle cx="13.4" cy="11.6" r="1.4" fill="#17171A"/><circle cx="25.4" cy="11.6" r="1.4" fill="#17171A"/>', // うるうる
  '<path d="M12 9 l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3 z"/>' +
    '<path d="M24 9 l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3 z"/>', // 星目
  '<circle cx="12" cy="14" r="3.2"/><circle cx="24" cy="14" r="3.2"/>' +
    '<path d="M8 11 L16 9 M20 9 L28 11" stroke-width="1.6" fill="none"/>',                    // まゆ上がり（うれしい）
  '<path d="M8 16 L12 10 L16 16" stroke-width="2.2" fill="none"/>' +
    '<path d="M20 16 L24 10 L28 16" stroke-width="2.2" fill="none"/>'                         // にこにこ
];
const FACE_GOOD_MOUTH = [
  '<path d="M10 24 Q18 32 26 24" stroke-width="2.2" fill="none"/>',                           // にっこり
  '<path d="M10 23 Q18 33 26 23 Q18 27 10 23 Z"/>',                                           // 大笑い
  '<path d="M13 24 Q18 29 23 24" stroke-width="2.2" fill="none"/>',                           // 小さく笑み
  '<path d="M10 23 h16 v4 a8 8 0 0 1 -16 0 Z" stroke-width="1.6" fill="none"/>' +
    '<path d="M10 25.4 h16" stroke-width="1.4" fill="none"/>',                                // にかっ（歯）
  '<ellipse cx="18" cy="26" rx="4.5" ry="3.6"/>',                                             // 開いた笑い
  '<path d="M11 24 Q14 28 17 24 Q20 28 23 24" stroke-width="2" fill="none"/>',                // へへ
  '<path d="M11 25 h14" stroke-width="2.2" fill="none"/>' +
    '<path d="M11 25 l-1.5 -2 M25 25 l1.5 -2" stroke-width="1.8" fill="none"/>',              // 口角あげ
  '<path d="M9 23 Q18 33 27 23" stroke-width="2.6" fill="none"/>',                            // 三日月
  '<circle cx="18" cy="25" r="2.6"/>',                                                        // 小さい丸
  '<path d="M11 24 Q18 30 25 24" stroke-width="2.2" fill="none"/>' +
    '<circle cx="9" cy="24" r="1"/><circle cx="27" cy="24" r="1"/>'                           // えくぼ
];

/* ★前の書き方（FACE_EYES / FACE_MOUTH）も残しておきます。
     ほかの場所から呼ばれていても、止まらないようにするためです。 */
const FACE_EYES  = FACE_BAD_EYES.concat(FACE_GOOD_EYES);
const FACE_MOUTH = FACE_BAD_MOUTH.concat(FACE_GOOD_MOUTH);

/* ------------------------------------------------------------
 *  ひとこと（ふきだし）
 *
 *  ★まーく様のご指示（2026/11/11）
 *      「ネガティブばかりだと、嫌な気分になるので
 *        ポジティブワード(乗車して良かった言葉)も
 *        ランダムで100通り作ってください
 *        ネガティブ→ポジティブ→ネガティブ→ポジティブ…と、
 *        連続するようにしてください」
 *  ★なので2つに分け、かならず交互に出します。
 *    ぼやきだけが続かないようにするためです。
 *  ★どちらも100通り。ぼやきの方だけ18通りのままだと、
 *    すぐ同じものが戻ってきて、新しさが無くなります。
 *  ★どれも「あるある」で止めています。
 *    だれかを下げる言い方は入れません。
 * ---------------------------------------------------------- */
/*
 * ★ひとことは、まーく様がお決めになったものに入れ替えました
 *   （ご指示・2026/11/14「ふきだしのセリフを以下にしてください」）。
 * ★交互に出す形は、そのまま残します
 *   （ぼやきだけが続くと、嫌な気分になるため）。
 * ★【記録】の画面から、いくつでも足せます。足したものは、
 *   みんなの画面に出ます（台帳に入ります）。
 */
const SAY_BAD = [
  'ぃやぁ～！',
  '良い人生でした',
  'ﾌｩｰﾝ、そうだねｪｰ',
  'おぅ、しばくぞぉ？',
  'ドパらせてくれぇ！'
];

/* 乗せてよかった、と思えるひとこと */
const SAY_GOOD = [
  'やってんねぇ！',
  'ドリーマーやな！',
  'ええやん！',
  'やるんだなライナー！',
  'ええとこ行っとるやん！'
];

/*
 * ★あとから足したひとこと（台帳に入っているもの）。
 *   【記録】の画面の「ふきだしに足す」から、いくつでも増やせます
 *   （ご指示・2026/11/14「自由にふやせるようにしてください」）。
 * ★「続けて同じものを出さない」は、並び（配列）ごとに覚えています。
 *   毎回 concat すると別の並びになって覚えられないので、
 *   足したときに1回だけ作り直します。
 */
let _sayB = SAY_BAD, _sayG = SAY_GOOD;
function sayAddSet(bad, good){
  _sayB = SAY_BAD.concat(bad || []);
  _sayG = SAY_GOOD.concat(good || []);
  _sayWidest = '';                  // いちばん幅を食うものを、測り直す
}

/* 必ず交互に出します（ぼやき → ありがとう → ぼやき → …） */
let _sayTurn = 0;
function sayNext(){
  const arr = (_sayTurn++ % 2 === 0) ? _sayB : _sayG;
  return { t: pick(arr), good: arr === _sayG };
}

/* ★前の書き方（SAY_LINES）も残しておきます。
     ほかの場所から呼ばれていても、止まらないようにするためです。 */
const SAY_LINES = SAY_BAD.concat(SAY_GOOD);
/* ------------------------------------------------------------
 *  でたらめに1つ選ぶ（ただし、続けて同じものは出さない）
 *
 *  ★まーく様のご指示（2026/11/11）
 *      「ランダム表示ですが、顔、セリフ両方とも、
 *        続けて同じものが出てこないようにしてください」
 *  ★ひとつ前に出したものを覚えておき、同じが出たら引き直します。
 *    「引き直しを繰り返す」作りにすると、運が悪いと止まるので、
 *    残りの中から選び直す形にしてあります（必ず1回で決まる）。
 *  ★覚えるのは「どの並びか」ごとです。目と口は別に覚えます。
 * ---------------------------------------------------------- */
const _pickLast = (typeof Map !== 'undefined') ? new Map() : null;
function pick(a){
  if (!a || !a.length) return undefined;
  if (a.length === 1) return a[0];
  const prev = _pickLast ? _pickLast.get(a) : undefined;
  let v = a[Math.floor(Math.random() * a.length)];
  if (v === prev) {
    const i = a.indexOf(prev);
    v = a[(i + 1 + Math.floor(Math.random() * (a.length - 1))) % a.length];
  }
  if (_pickLast) _pickLast.set(a, v);
  return v;
}

/* ------------------------------------------------------------
 *  題の下の一文（開くたびに、人の名前が変わります）
 *
 *  ★まーく様のご指示（2026/11/11）
 *      「近日中、誰かがワンメータを乗せたら、○○さんがキラです」
 *    ○○は、開き直すたびに下の中からでたらめに1人。
 *  ★「くん」が名前に入っているので、「さん」は重ねていません。
 * ---------------------------------------------------------- */
const KIRA_NAMES = ['齋藤くん', '山敷くん', '山脇くん', '城越くん', '宮下くん', '加藤くん'];
const KIRA_KEY = 'tsukemachi.kira';

/* ★名前が変わるのは、1日に1回だけ（ご指示・2026/11/11）。
     開き直すたびに変わると、落ち着いて読めません。
     その日いちど決めた名前を、端末に覚えておきます。 */
function kiraToday(){
  const d = today();
  try {
    const j = JSON.parse(localStorage.getItem(KIRA_KEY) || '{}');
    if (j && j.d === d && KIRA_NAMES.indexOf(j.n) !== -1) return j.n;
  } catch (e) {}
  const n = pick(KIRA_NAMES);
  try { localStorage.setItem(KIRA_KEY, JSON.stringify({ d: d, n: n })); } catch (e) {}
  return n;
}
function subRoll(){
  if (typeof document === 'undefined' || !document.getElementById) return;
  const el = document.getElementById('sub');
  if (!el) return;
  /* 〝 〞で名前をはさみます（ご指示・2026/11/11） */
  /* ★「ベルトルト」→「キラ」に戻しました（ご指示・2026/11/13） */
  el.textContent = '近日中、誰かがワンメータを乗せたら、〝' + kiraToday() + '〟がキラです';
}

/* ★顔は「目 × 口」で何通りか。
     まーく様のご指示（2026/11/11）で、
     ぼやき用100通り・ありがとう用100通りにしてあります。
     減らすと100を割るので、ここを見れば気づけます。 */
const FACE_BAD_PATTERNS  = FACE_BAD_EYES.length  * FACE_BAD_MOUTH.length;
const FACE_GOOD_PATTERNS = FACE_GOOD_EYES.length * FACE_GOOD_MOUTH.length;
const FACE_PATTERNS = FACE_BAD_PATTERNS;   // 前の書き方のなごり

/**
 * 変顔を1つ描く（毎回ちがう組み合わせになります）
 *   good が true なら「乗せてよかった」ときの笑い顔、
 *   false なら ぼやきのときの しかめ顔。
 */
function faceSvg(good){
  const E = good ? FACE_GOOD_EYES  : FACE_BAD_EYES;
  const M = good ? FACE_GOOD_MOUTH : FACE_BAD_MOUTH;
  return '<svg class="face" viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">' +
    '<g stroke="currentColor" stroke-linecap="round" fill="currentColor">' +
    pick(E) + pick(M) + '</g></svg>';
}

/* ------------------------------------------------------------
 *  変顔とひとことを、6秒ごとに入れ替える
 *
 *  ★行灯（空車・賃走…）は外しました（まーく様のご指示・2026/11/10）
 *      「賃走～とかのロゴもあると目が痛くなるので、
 *        これは除外してください」
 *    動くものが2つあると、目が休まりません。顔だけにします。
 *  ★入れ替えは6秒ごと（ご指示）。2.4秒は早すぎました。
 * ---------------------------------------------------------- */
const SAY_WAIT = 6000;   // 1つを出しておく長さ（ミリ秒）
const SAY_FADE = 450;    // 消えるのにかかる長さ（ミリ秒）
