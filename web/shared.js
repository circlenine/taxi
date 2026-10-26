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
    .from('profiles').select('id,display_name,is_admin').eq('id', session.user.id).maybeSingle();
  return { session, user: session.user, profile: profile || { display_name: session.user.email, is_admin: false } };
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
