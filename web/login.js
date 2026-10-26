const $ = s => document.querySelector(s);
let recovering = false;

/* メールの再設定リンクから来た場合 */
db.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    recovering = true;
    $('#signin').hidden = true; $('#forgot').hidden = true; $('#foot').hidden = true;
    $('#reset').hidden = false;
  }
});

/* すでにログイン済みなら台帳へ */
(async () => {
  await new Promise(r => setTimeout(r, 150));   // recovery 判定を待つ
  if (recovering) return;
  const { data: { session } } = await db.auth.getSession();
  if (session) location.replace('/');
})();

function busy(btn, on, label){ btn.disabled = on; btn.textContent = on ? '…' : label; }

/* ---- ログイン ---- */
async function signIn(){
  const email = $('#email').value.trim(), pw = $('#pw').value;
  const m = $('#msg'); m.className = 'msg'; m.textContent = '';
  if (!email || !pw) { m.className = 'msg bad'; m.textContent = 'メールアドレスとパスワードを入れてください。'; return; }
  busy($('#go'), true, 'ログイン');
  const { error } = await db.auth.signInWithPassword({ email, password: pw });
  busy($('#go'), false, 'ログイン');
  if (error) { m.className = 'msg bad'; m.textContent = jaError(error); return; }
  location.replace('/');
}
$('#go').addEventListener('click', signIn);
$('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') signIn(); });
$('#email').addEventListener('keydown', e => { if (e.key === 'Enter') $('#pw').focus(); });

/* ---- 再設定リンクを送る ---- */
$('#toForgot').addEventListener('click', e => {
  e.preventDefault();
  $('#signin').hidden = true; $('#forgot').hidden = false;
  $('#remail').value = $('#email').value;
  $('#remail').focus();
});

$('#send').addEventListener('click', async () => {
  const email = $('#remail').value.trim(), m = $('#msg2');
  m.className = 'msg'; m.textContent = '';
  if (!email) { m.className = 'msg bad'; m.textContent = 'メールアドレスを入れてください。'; return; }
  busy($('#send'), true, '再設定リンクを送る');
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname
  });
  busy($('#send'), false, '再設定リンクを送る');
  if (error) { m.className = 'msg bad'; m.textContent = jaError(error); return; }
  m.textContent = 'メールを送りました。届いたリンクをこの端末で開いてください。';
});

/* ---- 新しいパスワードを保存 ---- */
$('#save').addEventListener('click', async () => {
  const pw = $('#np').value, m = $('#msg3');
  m.className = 'msg'; m.textContent = '';
  if (pw.length < 6) { m.className = 'msg bad'; m.textContent = 'パスワードは6文字以上にしてください。'; return; }
  busy($('#save'), true, 'このパスワードにする');
  const { error } = await db.auth.updateUser({ password: pw });
  busy($('#save'), false, 'このパスワードにする');
  if (error) { m.className = 'msg bad'; m.textContent = jaError(error); return; }
  m.textContent = '変更しました。台帳を開きます…';
  setTimeout(() => location.replace('/'), 900);
});
