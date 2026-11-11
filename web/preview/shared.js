/* 共通処理：Supabase接続・ログイン確認・書式 */

if (!window.supabase || !window.SUPABASE_URL) {
  document.body.innerHTML = '<div class="boot">読み込みに失敗しました。通信状況を確かめて、ページを再読み込みしてください。</div>';
  throw new Error('supabase-js or config missing');
}

const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/* ログインしていなければログイン画面へ。戻り値は { session, profile } */
async function requireLogin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.replace('/login'); return null; }
  const { data: profile } = await db
    .from('profiles').select('id,display_name,title,is_admin').eq('id', session.user.id).maybeSingle();
  return { session, user: session.user,
           profile: profile || { display_name: session.user.email, title: '', is_admin: false } };
}

async function signOut() {
  await db.auth.signOut();
  location.replace('/login');
}

/* ---- 書式・計算 ---- */
const pad  = n => String(n).padStart(2, '0');
const yen  = n => '¥' + Math.round(n).toLocaleString('ja-JP');
const fmtT = d => { const h = Math.floor(d + 1e-9); let m = Math.round((d - h) * 60); return pad(m === 60 ? h + 1 : h) + ':' + pad(m === 60 ? 0 : m); };
const WD   = ['日','月','火','水','木','金','土'];
function fmtD(s){ const [y,m,d] = s.split('-').map(Number); return `${m}/${d}(${WD[new Date(y,m-1,d).getDay()]})`; }

/* 「2530」「25:30」「1:30」「1330」どれでも読む。0〜6時は翌日(24時以降)扱い */
function parseT(str){
  if (str === null || str === undefined) return null;
  let s = String(str).trim().replace(/[：.]/g, ':');
  if (!s) return null;
  let h, m;
  if (s.includes(':'))            { const p = s.split(':'); h = +p[0]; m = +p[1]; }
  else if (/^\d{3,4}$/.test(s))   { h = +s.slice(0,-2); m = +s.slice(-2); }
  else if (/^\d{1,2}$/.test(s))   { h = +s; m = 0; }
  else return null;
  if (isNaN(h) || isNaN(m) || m < 0 || m > 59) return null;
  /* ★0時〜6時に入れた時刻は、その夜の続き（24時以降）として数えます。
       まーく様のご指示（2026/11/11）
         「0時～11時ではなく、0時～06時に入力した時刻としてください」
     乗務の終わりは朝6時なので、6時すぎは そのまま朝の時刻にします。
     6時をまわって上がった日は「3020」のように、24時すぎの書き方で
     そのまま入れられます（32時まで入ります）。 */
  if (h + m / 60 <= 6) h += 24;
  if (h > 32) return null;
  return h + m / 60;
}

/* ------------------------------------------------------------
 *  空いている欄は「不明」としてあつかう
 *
 *  ★まーく様のご指示（2026/11/11）
 *      「また、不明点は抜かしてもよい。」
 *      「空白部分は「不明」扱いにしてください」
 *
 *  ★0分・0円と「不明」は、まったく別ものです。
 *    「待ち0分（即乗せ）」は立派な記録。
 *    「不明」を0として数えると、平均も時間単価も狂います。
 *    だから、数えるときは「不明」を外します。
 * ---------------------------------------------------------- */
const UNK = '不明';
const isUnk  = v => (v === null || v === undefined || v === '');
const showT   = v => isUnk(v) ? UNK : fmtT(v);
const showMin = v => isUnk(v) ? UNK : (v + '分');
const showYen = v => isUnk(v) ? UNK : yen(v);
const showTxt = v => (v === null || v === undefined || String(v).trim() === '') ? UNK : String(v);
/* 数えるときに使えるか（不明なものは外す） */
const hasDep  = r => !isUnk(r.dep);
const hasFare = r => !isUnk(r.fare);
const hasMin  = r => !isUnk(r.wait) && !isUnk(r.ride);

/* 時間単価：待ち時間まで込みの1時間あたりの実入り。
   ★金額か分数が「不明」なら、出しません（0ではなく「—」になります） */
const rate = r => {
  if (!hasFare(r) || !hasMin(r)) return 0;
  const t = (+r.wait || 0) + (+r.ride || 0);
  return t > 0 ? r.fare / t * 60 : 0;
};

/* その夜の営業日（朝6時までは前日扱い） */
function today(){ const d = new Date(); d.setHours(d.getHours() - 6);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* エラーを日本語に */
function jaError(e){
  const m = (e && (e.message || e.error_description) || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'メールアドレスかパスワードが違います。';
  if (m.includes('email not confirmed'))       return 'このアカウントはまだ有効化されていません。管理者に連絡してください。';
  if (m.includes('rate limit') || m.includes('too many')) return '試行が多すぎます。少し時間をおいてください。';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return '新規登録は受け付けていません。管理者にアカウントを作ってもらってください。';
  if (m.includes('password should be'))        return 'パスワードは6文字以上にしてください。';
  if (m.includes('failed to fetch') || m.includes('networkerror')) return '通信できませんでした。電波を確かめて、もう一度お試しください。';
  if (m.includes('new row violates row-level security')) return '保存できませんでした。一度ログインし直してください。';
  return (e && e.message) ? e.message : 'うまくいきませんでした。もう一度お試しください。';
}


/* ------------------------------------------------------------
 *  😈 変顔と、嫌なお客さんのひとこと
 *
 *  ★まーく様のご指示（2026/11/10）
 *      「毎回ランダムに デスノート風の変顔(ランダム)と
 *        嫌な客の短文セリフ吹き出し(ランダム)を
 *        載せることは出来ないでしょうか」
 *
 *  ★顔は、こちらで描いたものです。
 *    作品の絵をそのまま使うと、人のものを勝手に使うことになります。
 *    目と口だけの、簡単な線で作ってあります。
 *  ★セリフは、どれも「あるある」で止めています。
 *    だれかを下げる言い方は入れません。
 * ---------------------------------------------------------- */
const FACE_EYES = [
  '<circle cx="12" cy="13" r="3.4"/><circle cx="24" cy="13" r="3.4"/>',                      // まんまる
  '<path d="M8 13 L16 10 M20 10 L28 13" stroke-width="2.2" fill="none"/>',                  // つり目
  '<path d="M8 11 L16 14 M20 14 L28 11" stroke-width="2.2" fill="none"/>',                  // たれ目
  '<circle cx="12" cy="13" r="4.6"/><circle cx="24" cy="13" r="2"/>',                        // 左右ちがい
  '<path d="M9 13 h7 M20 13 h7" stroke-width="2.4" fill="none"/>',                           // 線の目
  '<circle cx="12" cy="13" r="3.8"/><path d="M20 13 h7" stroke-width="2.4" fill="none"/>',   // 片目つぶり
  '<path d="M9 10 L16 13 L9 16 Z"/><path d="M27 10 L20 13 L27 16 Z"/>',                      // とがり目
  '<circle cx="12" cy="12" r="4.4"/><circle cx="24" cy="14" r="4.4"/>',                       // ずれ目
  '<circle cx="12" cy="13" r="4.2"/><circle cx="24" cy="13" r="4.2"/>' +
    '<circle cx="12" cy="13" r="1.6" fill="#B3161D"/><circle cx="24" cy="13" r="1.6" fill="#B3161D"/>', // 赤目
  '<path d="M8 9 L16 12 L8 15" stroke-width="2" fill="none"/>' +
    '<path d="M28 9 L20 12 L28 15" stroke-width="2" fill="none"/>'                            // より目
];
const FACE_MOUTH = [
  '<path d="M10 24 Q18 32 26 24" stroke-width="2.2" fill="none"/>',            // にやり
  '<path d="M10 27 Q18 20 26 27" stroke-width="2.2" fill="none"/>',            // への字
  '<path d="M11 24 h14" stroke-width="2.4" fill="none"/>',                     // 一文字
  '<ellipse cx="18" cy="25" rx="5" ry="4"/>',                                  // ぽかん
  '<path d="M10 23 L14 27 L18 23 L22 27 L26 23" stroke-width="2" fill="none"/>', // ギザギザ
  '<path d="M10 23 Q18 33 26 23 Q18 27 10 23 Z"/>',                            // 大笑い
  '<path d="M13 25 Q18 21 23 25" stroke-width="2.2" fill="none"/>',            // 小さく
  '<path d="M12 22 h12 v6 h-12 Z" stroke-width="2" fill="none"/>',             // 四角口
  '<path d="M10 22 Q18 30 26 22" stroke-width="2.2" fill="none"/>' +
    '<path d="M14 26 v3 M18 27 v3 M22 26 v3" stroke-width="1.6" fill="none"/>', // 歯ぎしり
  '<path d="M11 25 Q14 21 18 25 Q22 29 25 25" stroke-width="2.2" fill="none"/>' // うねり
];
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
const SAY_BAD = [
  'すぐそこやけど、ええ？', 'メーター、止めてくれる？',
  '領収書…やっぱ、ええわ', 'その道、ちゃうんちゃう？',
  '一万円しかないねん', 'カード、あかんの？',
  '寝てたから、分からん', 'さっきの信号、行けたやろ',
  'もうちょい前、もうちょい', 'やっぱ、戻って',
  'エアコン、暑いわ', 'クーラー、きつない？',
  '酔うてへんて', '高速は、乗らんといて',
  'ここでええわ…あ、やっぱ次の角', 'ナビ、見んでも分かるやろ',
  '近道あるんちゃうの', 'ちょっと、急いでな',
  '窓、開けてもええ？', '音楽、消してくれる？',
  'ラジオ、つけて', '名前、なんていうの？',
  'この仕事、しんどいやろ', 'いつまで走ってんの？',
  '運転、荒ない？', 'ブレーキ、きついわ',
  'もうちょい飛ばして', 'そんな急がんでええて',
  'なんでこの道なん？', '反対側やってん',
  '住所、言うたやん', '聞いてた？',
  'そこ、一方通行ちゃうん', 'Uターンして',
  'やっぱ、ちゃうとこ行って', '友達ひろてええ？',
  'もう一人、乗るわ', 'コンビニ、寄って',
  'ちょっと待っといて', 'すぐ戻るから',
  '五分だけ、ほんま五分', 'トイレ、どっかない？',
  '気持ち悪いわ…', '窓、開けさせて',
  '袋ある？', '止めて、止めて',
  '大丈夫、大丈夫やて', 'いや、ほんま大丈夫',
  'この辺でええわ', 'いや、もうちょい先',
  '行き過ぎたやん', '戻って、戻って',
  'なんで行き過ぎんの', '言うたつもりやってん',
  '財布、どこやったかな', 'ちょっと待って、探すわ',
  '鞄、後ろちゃう？', 'スマホ、落ちてへん？',
  '充電、させてくれる？', 'ケーブルある？',
  '暑ない？この車', '匂い、きつない？',
  'シート、ちょっと狭いな', '前、詰めてくれる？',
  '足、伸ばしてええ？', '靴、脱いでええ？',
  'タバコ、あかんのやんな', 'ちょっとだけ、あかん？',
  '窓開けたら、ええやろ', '一服だけ、止めてくれる？',
  'この時間、客おらんやろ', '新地、どない？',
  'どこが一番もうかんの', '教えてーや',
  '歩合なん？', 'ノルマあるん？',
  '休みなんぼあんの', 'しんどそうな顔してんで',
  '寝てへんのちゃう', '事故らんといてや',
  'さっき、ヒヤッとしたわ', '今の、黄色やったやろ',
  'ちゃんと見てる？', 'スピード、出し過ぎちゃう',
  'もっとゆっくり', 'いや、もっと早よ',
  'まあ、ええわ', 'おつり、こまかいのない？',
  '両替、できる？', '細かいの、持ってへん',
  'そこ、停まれる？', '二重駐車、あかんか',
  'ハザード、つけといて', 'もうちょい奥まで',
  '門の前まで入って', '坂、上がってくれる？',
  '砂利道、平気？', 'あと五十メートル',
  'はい、そこそこ。そこで', '領収書、二枚に分けて'
];

/* 乗せてよかった、と思えるひとこと（100通り） */
const SAY_GOOD = [
  '運転手さん、ありがとう', 'おつりは、ええよ',
  'ほんま助かったわ', '寒いなか、お疲れさん',
  '道、よう知ってはるなあ', '急いでへんから、ゆっくりで',
  'ていねいな運転やね', '領収書、おおきに',
  '安全運転で、ありがたいわ', 'ここまでで十分です',
  'これ、取っといて', 'また乗せてもらうわ',
  '荷物、ありがとうな', 'エアコン、ちょうどええわ',
  'しんどい時間やのに、すまんね', '気ぃつけて帰ってや',
  '話しやすい人やね', 'この車、乗りやすいわ',
  '無理せんといてな', '遠いとこ、おおきに',
  '近くてごめんな、これどうぞ', '待っててくれてありがとう',
  'ナビより早いやん、すごいわ', 'おかげで間に合ったわ',
  'ちょうどええ速さやね', '静かで助かる、ありがとう',
  '今日はもう上がり？お疲れさま', 'いつも頑張ってはるねんな',
  '揺れへんなあ、上手やわ', '最後まで丁寧やったわ',
  '高速、正解やったね', 'その道、知らんかったわ',
  'お釣りぴったり、助かる', 'カード使えて助かったわ',
  'おおきに、ええ一日になったわ', '雨のなか、ありがとうね',
  'ドア、ありがとう', '傘、助かりました',
  '子ども寝てもうたわ、おおきに', '安心して乗ってられるわ',
  'その話、おもろいな', '次もこの会社にするわ',
  '名前、覚えとくわ', '評価、満点つけとくね',
  'アプリで星5にしとくわ', 'ええ人に当たったわ',
  '今日いちばんの当たりやわ', '顔色悪いけど、無理せんとき',
  '休憩、ちゃんと取りや', '飲み物、これどうぞ',
  '寒いやろ、これあげる', 'ほんまにありがとう、助かった',
  '遅なってごめんな、待たせたね', '道、まかせるわ。上手やし',
  'ゆっくりでええからね', '慌てんでええよ、安全第一',
  'そこ曲がって、ありがとう', '完璧やわ、おおきに',
  'おつかれさまです', 'ええ夜になったわ',
  '気持ちよう乗れたわ', '明日もがんばってな',
  '体、大事にしてな', 'この時間、大変やろ',
  'えらいなあ、ほんま', 'ありがとう、おやすみなさい',
  '助かった、恩に着るわ', '荷物おろすの、ありがとう',
  'やっぱりタクシーにしてよかった', '乗った瞬間、ええ匂いやった',
  '車、きれいにしてはるね', 'シート、ふかふかやん',
  '音楽、ちょうどええわ', '静かにしててくれて助かる',
  '寝てもうてごめんな、ありがとう', '起こしてくれてありがとう',
  'ぴったりに着いたな、すごい', '読みが正確やね',
  'プロやなあ', '任せてよかったわ',
  '次も指名したいくらいやわ', 'この道、覚えとくわ',
  '教えてくれてありがとう', '詳しいなあ、助かる',
  'おすすめの店、行ってみるわ', '話、おもろかったわ',
  '笑わせてもらったわ、おおきに', '元気出たわ、おおきに',
  'ええ運転手さんでよかった', '安心して任せられたわ',
  'また会えたらええな', '今日はほんま助かりました',
  '丁寧にありがとうございました', 'おかげさまで、ええ日やった',
  'お世話になりました', 'どうぞ、お気をつけて',
  '無事に着いた、ありがとう', 'ここでええわ、ありがとうね',
  'ほな、おおきに。気ぃつけてな', 'ありがとう、またよろしゅう'
];

/* かならず交互に出します（ぼやき → ありがとう → ぼやき → …） */
let _sayTurn = 0;
function sayNext(){
  const arr = (_sayTurn++ % 2 === 0) ? SAY_BAD : SAY_GOOD;
  return { t: pick(arr), good: arr === SAY_GOOD };
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
  el.textContent = '近日中、誰かがワンメータを乗せたら、〝' + kiraToday() + '〟がキラです';
}

/* ★顔は「目 × 口」で何通りか。
   まーく様のご指示（2026/11/10）で、ちょうど100通りにしてあります。
   減らすと100を割るので、ここを見れば気づけます。 */
const FACE_PATTERNS = FACE_EYES.length * FACE_MOUTH.length;

/** 変顔を1つ描く（毎回ちがう組み合わせになります） */
function faceSvg(){
  return '<svg class="face" viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">' +
    '<g stroke="currentColor" stroke-linecap="round" fill="currentColor">' +
    pick(FACE_EYES) + pick(FACE_MOUTH) + '</g></svg>';
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

function sayRoll() {
  /* ★画面の無いところ（検査など）でも落ちないようにします */
  if (typeof document === 'undefined' || !document.getElementById) return;
  const mount = document.getElementById('saymount');
  if (!mount) return;

  const put = function () {
    try {
      /* ★中の字は <span> に入れます。
           ふきだしの高さを2行ぶんに決め打ちするため、
           字のほうを「2行まで」で止める必要があります。 */
      const say = sayNext();
      mount.innerHTML = faceSvg() +
        '<div class="bubble' + (say.good ? ' good' : '') + '"><span class="t"></span></div>';
      mount.querySelector('.bubble .t').textContent = say.t;
    } catch (e) {}
  };

  put();

  /*
   * ★すうっと消えて、すうっと出てきます（まーく様のご指示・2026/11/10）
   *     「吹き出しと顔の表示の仕方はフェードインフェードアウトに
   *       してください」
   *   消えきってから中身を入れ替えます。
   *   入れ替えてから消すと、次の顔が一瞬 見えてしまいます。
   */
  setInterval(function () {
    try {
      mount.classList.add('fade');            // 消える
      setTimeout(function () {
        put();                                 // 消えたあとで入れ替える
        mount.classList.remove('fade');        // 出てくる
      }, SAY_FADE);
    } catch (e) { put(); }
  }, SAY_WAIT);
}

if (typeof document !== 'undefined' && document.addEventListener) {
  const boot = function(){ sayRoll(); subRoll(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
