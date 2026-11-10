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

/* 「2530」「25:30」「1:30」「1330」どれでも読む。0〜11時は翌日(24時以降)扱い */
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
  if (h < 12) h += 24;
  if (h > 32) return null;
  return h + m / 60;
}

/* 時間単価：待ち時間まで込みの1時間あたりの実入り */
const rate = r => { const t = (+r.wait || 0) + (+r.ride || 0); return t > 0 ? r.fare / t * 60 : 0; };

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
const SAY_LINES = [
  'すぐそこやけど、ええ？',
  'メーター、止めてくれる？',
  '領収書…やっぱ、ええわ',
  'その道、ちゃうんちゃう？',
  '一万円しかないねん',
  'カード、あかんの？',
  '寝てたから、分からん',
  'さっきの信号、行けたやろ',
  'もうちょい前、もうちょい',
  'やっぱ、戻って',
  'エアコン、暑いわ',
  'クーラー、きつない？',
  '酔うてへんて',
  '高速は、乗らんといて',
  'ここでええわ…あ、やっぱ次の角',
  'ナビ、見んでも分かるやろ',
  '近道あるんちゃうの',
  'ちょっと、急いでな'
];
const pick = a => a[Math.floor(Math.random() * a.length)];

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

function sayRoll() {
  /* ★画面の無いところ（検査など）でも落ちないようにします */
  if (typeof document === 'undefined' || !document.getElementById) return;
  const mount = document.getElementById('saymount');
  if (!mount) return;

  const draw = function (first) {
    try {
      mount.innerHTML = faceSvg() + '<div class="bubble"></div>';
      mount.querySelector('.bubble').textContent = pick(SAY_LINES);
      if (!first) {
        mount.classList.remove('pop');
        void mount.offsetWidth;        // いったん止めてから、もう一度
        mount.classList.add('pop');
      }
    } catch (e) {}
  };

  draw(true);
  setInterval(function () { draw(false); }, SAY_WAIT);
}

if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sayRoll);
  else sayRoll();
}
