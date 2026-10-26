const $ = s => document.querySelector(s);
let ME = null;

(async () => {
  const s = await requireLogin();
  if (!s) return;
  ME = s;
  $('#me').textContent = s.profile.display_name || s.user.email;
  $('#dname').value = s.profile.display_name || '';
  $('#email').value = s.user.email || '';
  $('#out').addEventListener('click', signOut);
  if (s.profile.is_admin) { $('#meBadge').hidden = false; $('#adminOnly').hidden = false; await loadMembers(); }
  $('#boot').hidden = true; $('#app').hidden = false;
})();

const say = (el, text, bad) => { const e = $(el); e.className = 'msg' + (bad ? ' bad' : ''); e.textContent = text; };

/* 表示名 */
$('#saveName').addEventListener('click', async () => {
  const name = $('#dname').value.trim();
  if (!name) return say('#m1', '表示名を入れてください。', true);
  const { error } = await db.from('profiles').update({ display_name: name }).eq('id', ME.user.id);
  if (error) return say('#m1', jaError(error), true);
  ME.profile.display_name = name;
  $('#me').textContent = name;
  say('#m1', '保存しました。');
});

/* パスワード */
$('#savePw').addEventListener('click', async () => {
  const a = $('#pw1').value, b = $('#pw2').value;
  if (a.length < 6)  return say('#m2', 'パスワードは6文字以上にしてください。', true);
  if (a !== b)       return say('#m2', '2つの欄が一致していません。', true);
  const { error } = await db.auth.updateUser({ password: a });
  if (error) return say('#m2', jaError(error), true);
  $('#pw1').value = $('#pw2').value = '';
  say('#m2', '変更しました。次のログインから新しいパスワードです。');
});

/* メンバー一覧 */
async function loadMembers(){
  const [{ data: ps }, { data: rs }] = await Promise.all([
    db.from('profiles').select('id,display_name,is_admin,created_at'),
    db.from('rides').select('user_id,fare,work_date,wait_min,ride_min').limit(5000)
  ]);
  const by = {};
  (rs || []).forEach(r => {
    const o = by[r.user_id] = by[r.user_id] || { n:0, sum:0, last:'', mins:0 };
    o.n++; o.sum += r.fare; o.mins += (r.wait_min + r.ride_min);
    if (r.work_date > o.last) o.last = r.work_date;
  });
  const rows = (ps || []).map(p => ({ ...p, ...(by[p.id] || { n:0, sum:0, last:'', mins:0 }) }))
    .sort((a,b) => b.n - a.n);
  $('#members').innerHTML = `<div class="scroll"><table><thead><tr>
      <th>表示名</th><th class="n">記録</th><th class="n">売上</th><th class="n">時間単価</th><th>最後の記録</th><th></th>
    </tr></thead><tbody>${rows.map(r => `<tr>
      <td>${esc(r.display_name || '（未設定）')}${r.id === ME.user.id ? '<span class="badge">自分</span>' : ''}</td>
      <td class="n">${r.n}</td>
      <td class="n">${yen(r.sum)}</td>
      <td class="n" style="color:var(--meter)">${r.mins ? yen(r.sum / r.mins * 60) : '—'}</td>
      <td>${r.last ? fmtD(r.last) : '—'}</td>
      <td>${r.is_admin ? '<span class="badge adm">管理者</span>' : ''}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

/* 全データ書き出し */
$('#dump').addEventListener('click', async () => {
  say('#m3', '集めています…');
  const [{ data: ps }, { data: rs, error }] = await Promise.all([
    db.from('profiles').select('id,display_name'),
    db.from('rides').select('*').order('work_date', { ascending:false }).order('dep', { ascending:false }).limit(20000)
  ]);
  if (error) return say('#m3', jaError(error), true);
  const nm = {}; (ps || []).forEach(p => nm[p.id] = p.display_name);
  const lines = ['日付,場所,乗せた時刻,待ち時間(分),乗車時間(分),金額,時間単価,記録者'];
  (rs || []).forEach(r => {
    const t = r.wait_min + r.ride_min;
    lines.push([r.work_date, `"${(r.place||'').replace(/"/g,'""')}"`, fmtT(+r.dep), r.wait_min, r.ride_min, r.fare,
      t ? Math.round(r.fare / t * 60) : 0, `"${nm[r.user_id] || ''}"`].join(','));
  });
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'tsukemachi_all_' + today() + '.csv'; a.click();
  URL.revokeObjectURL(a.href);
  say('#m3', `${(rs||[]).length}件を書き出しました。`);
});
