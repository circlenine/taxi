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

/*
 * その日の営業曜日（まーく様のご指示・2026/11/12「16:00に変えてください」）
 *
 *   16:00〜翌15:59 を、同じ1日として数えます。
 *   15:59 までは「前の日」のあつかいです。
 *   ★スプシ（記録用）と、同じ数え方にそろえてあります。
 *     ずれていると、帰ってから入れた記録が
 *     スプシと台帳で ちがう日に入ってしまいます。
 */
function bizToday(){ const d = new Date(); d.setHours(d.getHours() - 16);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
const today = bizToday;

/* ------------------------------------------------------------
 *  営業曜日の区分（記録用スプレッドシートと同じ分け方・ご指示 2026/11/12）
 *    平日 ／ 金＋祝前日 ／ 土曜 ／ 日＋祝日
 *
 *  ★色を分けるのは、売上の出方がまるで違うからです。
 *    曜日を混ぜて平均すると、どの数字も当てになりません。
 * ---------------------------------------------------------- */
const JP_HOLIDAYS = [
  /* 2026年 */
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20',
  '2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
  /* 2027年 */
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-03-21','2027-03-22',
  '2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23',
  '2027-10-11','2027-11-03','2027-11-23'
];
const isHoli = d => JP_HOLIDAYS.indexOf(String(d)) !== -1;
/** 前の日（営業日の文字列で返す） */
function prevYmd(d){
  const [y,m,dd] = String(d).split('-').map(Number);
  const n = new Date(y, m-1, dd-1);
  return n.getFullYear() + '-' + pad(n.getMonth()+1) + '-' + pad(n.getDate());
}
/** 次の日（営業日の文字列で返す） */
function nextYmd(d){
  const [y,m,dd] = String(d).split('-').map(Number);
  const n = new Date(y, m-1, dd+1);
  return n.getFullYear() + '-' + pad(n.getMonth()+1) + '-' + pad(n.getDate());
}
/** 区分の名札（色を決めるのに使います） */
function dayCls(d){
  const [y,m,dd] = String(d).split('-').map(Number);
  const w = new Date(y, m-1, dd).getDay();
  if (w === 0 || isHoli(d)) return 'd-sun';              /* 日＋祝日 */
  if (w === 6)              return 'd-sat';              /* 土曜 */
  if (w === 5 || isHoli(nextYmd(d))) return 'd-fri';     /* 金＋祝前日 */
  return 'd-wd';                                         /* 平日 */
}
/** 区分の言い方（画面に出します） */
function dayName(d){
  const c = dayCls(d);
  return c === 'd-sun' ? '日・祝'
       : c === 'd-sat' ? '土'
       : c === 'd-fri' ? '金・祝前日' : '平日';
}

/*
 * いま「どの夜」のことを言っているか（イベントの知らせ用）
 *
 *   ★こちらは、営業曜日とは分けてあります。
 *     昼の2時に見ているときに知りたいのは「今夜」のことです。
 *     営業曜日で数えると、昼の2時はまだ「前の日」なので、
 *     今夜のイベントが「きょう」と出なくなってしまいます。
 *   朝6時までは、まだ前の晩の続きとして数えます。
 */
function evNight(){ const d = new Date(); d.setHours(d.getHours() - 6);
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
  'ドパらせてくれぇ！',
  '松田ァー！誰を乗せてるゥー！',
  'ロングゥー？ふざけるなァ！'
];

/* 乗せてよかった、と思えるひとこと */
const SAY_GOOD = [
  'やってんねぇ！',
  'ドリーマーやな！',
  'ええやん！',
  'やるんだなライナー！',
  'ええとこ行っとるやん！',
  '新世界(大阪)の神だァ！'
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
/*
 * ★台帳に入っているものがあれば、そちらだけを出します（2026/11/14）。
 *   上の SAY_BAD / SAY_GOOD は「台帳が読めないときの控え」です。
 *   足すだけにすると、台帳にも同じものが入ったときに
 *   二重に出てしまい、直しても古いほうが残ります。
 */
function sayAddSet(bad, good){
  const b = bad || [], g = good || [];
  _sayB = b.length ? b : SAY_BAD;
  _sayG = g.length ? g : SAY_GOOD;
  _sayWidest = '';                  // いちばん幅を食うものを、測り直す
}

/*
 * ★ふきだしに入る、いちばん長い字数（2026/11/14・実際に測って決めました）。
 *   いちばん細い機種（320px）で、全角14文字までは切れません。
 *   15文字にすると切れます。だから14で止めます。
 */
const SAY_MAX = 14;

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

/* ------------------------------------------------------------
 *  ふきだしの字の大きさを、入る大きさに合わせる
 *
 *  ★まーく様のご指示（2026/11/11）
 *      「右上のふきだしの枠の高さ幅ですが
 *        TAXI NOTEのフォントの高さに合わせられませんか」
 *    高さを題にそろえたので、中身は1行になりました。
 *    ふきだしの横幅は画面ごとに変わるので、
 *    「いちばん長いひとことが、ちょうど入る大きさ」を
 *    ここで決めます。
 *
 *  ★ひとことごとに変えると、入れ替わるたびに字の大きさが
 *    変わって、目がちらつきます。
 *    だから「いちばん長いもの」で1回だけ決めて、
 *    ぜんぶ同じ大きさにします。
 *  ★画面の向きを変えたときは、測り直します。
 * ---------------------------------------------------------- */
let _sayWidest = '';
/*
 * ★いまの字が、ふきだしから はみ出していたら、入る大きさに直します。
 *   いる幅（字の幅）と ある幅（ふきだしの幅）の比で決めるので、1回で決まります。
 */
function sayShrink(t, size){
  try {
    const box = t.getBoundingClientRect().width;
    if (!(box > 0)) return;
    const rg = document.createRange();
    rg.selectNodeContents(t);
    const need = rg.getBoundingClientRect().width;
    if (!(need > box - 0.6)) return;             // 入っている
    const v = Math.max(6, Math.floor((size * (box - 1) / need) * 10) / 10);
    t.style.fontSize = v + 'px';
  } catch (e) {}
}

function sayFit(mount){
  try {
    const bu = mount.querySelector('.bubble');
    const t  = bu && bu.querySelector('.t');
    if (!t) return;
    const keep = t.textContent;
    t.style.fontSize = '';                      // いったん、きまりどおりの大きさへ
    let size = parseFloat(getComputedStyle(bu).fontSize) || 12;
    /* ★「字数がいちばん多いもの」＝「いちばん幅を食うもの」ではありません。
         カタカナと ひらがな では、太さがちがうためです。
         なので、はじめの1回だけ、ぜんぶ測って いちばん太いものを選びます。 */
    if (!_sayWidest) {
      let wmax = -1;
      _sayB.concat(_sayG).forEach(function (x) {
        t.textContent = x;
        if (t.scrollWidth > wmax) { wmax = t.scrollWidth; _sayWidest = x; }
      });
    }
    t.textContent = _sayWidest;
    /*
     * ★はみ出しは、小数のまま測ります（2026/11/14）。
     *   scrollWidth は整数に丸められるので、中身 98.4px・枠 97.8px の
     *   ように 0.6px だけはみ出していても、同じ数に見えます。
     *   それで「入っている」と思い込み、実際の画面では
     *   「ちょっと待っとい…」と切れていました。
     */
    const over = function () {
      try {
        const rg = document.createRange();
        rg.selectNodeContents(t);
        return rg.getBoundingClientRect().width > t.getBoundingClientRect().width - 0.6;
      } catch (e) { return t.scrollWidth > t.clientWidth + 1; }
    };
    let guard = 0;
    while (over() && size > 6 && guard++ < 48) {
      size -= 0.5;
      t.style.fontSize = size + 'px';
    }
    /*
     * ★最後に、**いま出す字そのもの**でも、もう一度 確かめます（2026/11/14）。
     *   「いちばん幅を食うもの」を覚えておく形だけだと、
     *   覚えたときと今とで条件が変わっていたときに、取りこぼします。
     *   実際に「松田ァー！誰を乗せてるゥ…」と切れていました。
     *   覚えたほうは「大きさをそろえる」ため、こちらは「切らない」ためです。
     */
    t.textContent = keep;
    guard = 0;
    while (over() && size > 6 && guard++ < 48) {
      size -= 0.5;
      t.style.fontSize = size + 'px';
    }
    /*
     * ★それでも はみ出していたら、計算で一発で合わせます（2026/11/14）。
     *   少しずつ小さくするやり方は、測るときの作りが整っていないと
     *   「入っている」と思い込んで、そのまま終わってしまいます。
     *   実際に「松田ァー！誰を乗せてるゥ…」と切れる回がありました。
     *   いる幅と ある幅の比で、必要な大きさを直に出します。
     */
    sayShrink(t, size);
    /*
     * ★画面の組み立てが終わってから、もう一度だけ確かめます。
     *   作っている途中は、ふきだしの幅がまだ決まっていないことがあり、
     *   そのときに測ると、広いつもりで大きいままになります。
     */
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        try { sayShrink(t, parseFloat(t.style.fontSize) || size); } catch (e) {}
      });
    }
  } catch (e) {}
}

/*
 * ★顔の絵の置き場。
 *   本番は /img/kira.png、下見は /preview/img/kira.png です。
 *   いま開いているページの場所から組み立てるので、どちらでも出ます。
 */
function sayFaceSrc(){
  try {
    const p = String(location.pathname || '/');
    const dir = p.slice(0, p.lastIndexOf('/') + 1);
    return dir + 'img/kira.png';
  } catch (e) { return 'img/kira.png'; }
}

function sayRoll() {
  /* ★画面の無いところ（検査など）でも落ちないようにします */
  if (typeof document === 'undefined' || !document.getElementById) return;
  const mount = document.getElementById('saymount');
  if (!mount) return;

  /*
   * ★字の形（フォント）は、あとから届きます（2026/11/14）。
   *   届く前に「いちばん幅を食うひとこと」を決めてしまうと、
   *   届いたあとの本当の幅と合わず、おしりが切れます。
   *   届いたら、覚えたものを捨てて、もう一度 測り直します。
   */
  if (!mount._fontWired) {
    mount._fontWired = true;
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          try { _sayWidest = ''; sayFit(mount); } catch (e) {}
        });
      }
    } catch (e) {}
    window.addEventListener('resize', function () {
      try { _sayWidest = ''; sayFit(mount); } catch (e) {}
    });
    /*
     * ★ふきだしの幅が決まった「そのとき」に、合わせ直します（2026/11/14）。
     *   画面を組み立てている途中に測ると、まだ幅が決まっておらず、
     *   「広いから そのままでよい」と思い込んで、大きいまま残ります。
     *   実際に「松田ァー！誰を乗せてるゥ…」と切れる回がありました。
     *   幅が変わったことを教えてもらう形にすれば、取りこぼしません。
     */
    try {
      if (typeof ResizeObserver === 'function') {
        const ro = new ResizeObserver(function () {
          try {
            const bu2 = mount.querySelector('.bubble');
            const t2  = bu2 && bu2.querySelector('.t');
            if (t2) sayShrink(t2, parseFloat(t2.style.fontSize) ||
              parseFloat(getComputedStyle(bu2).fontSize) || 12);
          } catch (e) {}
        });
        ro.observe(mount);
      }
    } catch (e) {}
  }

  const put = function () {
    try {
      /* ★中の字は <span> に入れます。
           ふきだしの高さを2行ぶんに決め打ちするため、
           字のほうを「2行まで」で止める必要があります。 */
      const say = sayNext();
      /*
       * ★顔は、まーく様からいただいた絵にしました（ご指示・2026/11/14）
       *     「ふきだしの顔は、さっきお渡しした画像を小さくして載せてください」
       *   気分（ぼやき／ほめ）は、まわりの光の色で分けます。
       * ★描いていた顔（faceSvg）は、そのまま残します。
       *   「顔とひとことの一覧」の画面で使っているためです。
       * ★ひとことが変わるたびに「ははは」が ふわっと出ます
       *     「できれば、はははのトランジションもあると嬉しいです」
       *   中身を作り直すたびに、動きは自然に最初から始まります。
       */
      mount.innerHTML =
        '<img class="face kiraface" src="' + sayFaceSrc() + '" alt="" decoding="async">' +
        '<span class="hahafx" aria-hidden="true"><i>は</i><i>は</i><i>は</i></span>' +
        '<div class="bubble' + (say.good ? ' good' : '') + '"><span class="t"></span></div>';
      mount.querySelector('.bubble .t').textContent = say.t;
      sayFit(mount);
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

/*
 * 題の「X」を、たまに光らせる（まーく様のご指示・2026/11/11）
 *   「TAXINOTEのXは、たまに、ランダムに光を入れることはできますか」
 *
 * ★「たまに」なので、決まった間かくでは光らせません。
 *   7〜25秒のあいだで、毎回ちがう待ち時間をくじ引きします。
 * ★動きが苦手な方の設定のときは、1回も光らせません。
 * ★光っても、字の大きさも位置も変わりません（光の輪だけ）。
 *   動かすと、となりの顔とふきだしの段がずれてしまいます。
 */
const XG_MIN_MS = 7000;      /* いちばん短い待ち時間 */
const XG_MAX_MS = 25000;     /* いちばん長い待ち時間 */
const XG_ON_MS  = 1250;      /* 光っている長さ（CSSの 1.15秒より少し長く） */

function xGleam() {
  try {
    if (typeof document === 'undefined') return;
    const x = document.querySelector('h1.dn .xg');
    if (!x) return;                       /* 題が無いページでは何もしない */
    /* 「視差効果を減らす」を入れている方には、光らせません */
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wait = XG_MIN_MS + Math.random() * (XG_MAX_MS - XG_MIN_MS);
    setTimeout(function () {
      try {
        x.classList.add('on');
        setTimeout(function () {
          try { x.classList.remove('on'); } catch (e) {}
          xGleam();                        /* また、次のくじを引く */
        }, XG_ON_MS);
      } catch (e) {}
    }, wait);
  } catch (e) {}
}

if (typeof document !== 'undefined' && document.addEventListener) {
  /* 画面の向きが変わったら、ふきだしの字を測り直します */
  let _fitTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(_fitTimer);
    _fitTimer = setTimeout(function () {
      const m = document.getElementById('saymount');
      if (m) sayFit(m);
    }, 200);
  });
  /*
   * ★字（フォント）が届いてから、measure し直します（2026/11/11）。
   *
   *   しくじりの中身：本番では、字をインターネットから取り寄せます。
   *   届く前に測ると、間に合わせの字で測ってしまい、
   *   あとから本物の字に変わったときに、はみ出しました。
   *   実際に、320pxの画面で25通りが切れていました。
   */
  const refit = function () {
    _sayWidest = '';                     // 字が変わったので、測り直す
    const m = document.getElementById('saymount');
    if (m) sayFit(m);
  };
  try {
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(refit);
    }
  } catch (e) {}
  /* 取り寄せに失敗したときの用心に、少し待ってからも1回 */
  setTimeout(refit, 1500);

  const boot = function(){ sayRoll(); subRoll(); xGleam(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
