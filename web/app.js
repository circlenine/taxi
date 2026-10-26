/* つけ待ち台帳 本体 */
const $ = s => document.querySelector(s);

let ME = null, records = [], names = {}, tab = 'in', form = {}, editId = null, msg = '', msgBad = false;
let scOpt = { line: true, label: true }, onlyMine = false;

/* ---------- 起動 ---------- */
(async () => {
  const s = await requireLogin();
  if (!s) return;
  ME = s;
  $('#me').textContent = s.profile.display_name || s.user.email;
  if (s.profile.is_admin) { $('#meBadge').hidden = false; $('#toAdmin').hidden = false; }
  $('#out').addEventListener('click', signOut);
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    grab(); tab = b.dataset.t; msg = ''; render();
  });
  $('#boot').hidden = true; $('#app').hidden = false;
  await reload();
})();

/* ---------- 読み込み ---------- */
async function reload(){
  const [{ data: ps }, { data: rs, error }] = await Promise.all([
    db.from('profiles').select('id,display_name'),
    db.from('rides').select('*').order('work_date', { ascending: false }).order('dep', { ascending: false }).limit(5000)
  ]);
  names = {}; (ps || []).forEach(p => names[p.id] = p.display_name);
  if (error) { msg = jaError(error); msgBad = true; records = []; }
  else records = (rs || []).map(rowToRec);
  render();
}
/* ------------------------------------------------------------
 *  種類（記録用スプレッドシートの「種」と同じ扱い）
 *
 *  ★まーく様のご指示（2026/10/26）：
 *    「GOをゴーとだいちゃん(齋藤大介)が書いてる項目もあるため
 *      4行目以降にゴーがあれば、GOで統一してください」
 *    スプシ側と同じ決まりにしておかないと、
 *    同じ乗車が別の種類として数えられてしまいます。
 * ---------------------------------------------------------- */
const METHODS = ['GO', 'Uber', '無線', '付け待ち', '流し', '手上げ',
                 '乗り場', 'ホテル', '途中乗り', '呼び込み', 'エスライド', '道路'];

/** 書き方のゆれを、1つの言い方にそろえる */
function normMethod(v){
  const t = String(v == null ? '' : v).trim();
  if (!t) return '';
  // 「ゴ」「ゴー」「ｺﾞｰ」「go」「ＧＯ」→ GO
  if (/^(ゴ[ー\-ｰ]?|ｺﾞ[ー\-ｰ]?|go|ＧＯ)$/i.test(t)) return 'GO';
  if (/^(uber|ウーバー|ｳｰﾊﾞｰ|うーばー)$/i.test(t)) return 'Uber';
  if (/^(無線|むせん|ニューモ|newmo)$/i.test(t))   return '無線';
  return t;
}

/** 種類ごとの色分け（スプシの H列と同じ考え方） */
function mcls(v){
  const t = String(v || '');
  if (t.indexOf('GO') !== -1)   return 'go';
  if (t.indexOf('Uber') !== -1) return 'uber';
  if (t.indexOf('無線') !== -1) return 'musen';
  return '';
}

const rowToRec = r => ({
  id: r.id, user_id: r.user_id, date: r.work_date, place: r.place,
  dep: +r.dep, wait: r.wait_min, ride: r.ride_min, fare: r.fare,
  method: r.method || '', note: r.note || '',
  get who(){ return names[this.user_id] || '—'; }
});
/**
 * 表示名から、その人の id を引く。
 *
 * ★記録用スプレッドシートから移すとき、「営」の欄に
 *   ﾀﾞｲｽｹ・ｼｭﾝ のような名前が入っています。
 *   それを、このアプリの人と結びつけるために使います。
 *   半角カナ・全角・空白のちがいは気にしません。
 */
const nkey = v => String(v == null ? '' : v)
  .replace(/[\s　]/g, '')
  .replace(/[\uFF61-\uFF9F]/g, c => {
    // 半角カナ → 全角カナ（濁点はそのまま後ろに付く）
    const H = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ';
    const Z = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const i = H.indexOf(c);
    return i >= 0 ? Z[i] : c;
  })
  .replace(/[ﾞ゛]/g, 'ﾞ').replace(/[ﾟ゜]/g, 'ﾟ')
  .toLowerCase();

function idByName(name){
  const k = nkey(name);
  if (!k) return '';
  for (const id in names) if (nkey(names[id]) === k) return id;
  // 「ﾀﾞｲｽｹ」と「ダイスケ」のように、片方が片方を含む形も拾う
  for (const id in names) {
    const n = nkey(names[id]);
    if (n && (n.indexOf(k) !== -1 || k.indexOf(n) !== -1)) return id;
  }
  return '';
}

const visible = () => onlyMine ? records.filter(r => r.user_id === ME.user.id) : records;
const canEdit = r => r.user_id === ME.user.id || ME.profile.is_admin;
const sorted  = () => [...visible()].sort((a,b) => a.date === b.date ? b.dep - a.dep : (a.date < b.date ? 1 : -1));
const places  = () => [...new Set(records.map(r => r.place).filter(Boolean))];
const DCOL = ['#F0A33B','#E4573D','#6FD8A8','#7FA9F0','#C98BE0','#E8D06A','#5FBFC4','#EF8FA8'];
const dcol = d => { const ds = [...new Set(visible().map(r => r.date))].sort(); return DCOL[ds.indexOf(d) % DCOL.length]; };

/* ---------- 描画 ---------- */
function render(){
  const rs = visible();
  $('#k1').textContent = rs.length;
  $('#k2').textContent = yen(rs.reduce((a,r) => a + (+r.fare || 0), 0));
  const rt = rs.map(rate).filter(v => v > 0);
  $('#k3').textContent = rt.length ? yen(rt.reduce((a,b) => a+b, 0) / rt.length) + '/h' : '—';
  const hb = hourAgg().filter(h => h.n >= 3).sort((a,b) => b.avg - a.avg)[0];
  $('#k4').textContent = hb ? hb.h + '時台' : '—';
  $('#andon').classList.toggle('busy', rs.length > 0);
  $('#andonTxt').textContent = rs.length ? '賃走' : '空車';
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === tab));
  $('#panes').innerHTML = { in:paneIn, heat:paneHeat, tl:paneTl, sc:paneSc, rank:paneRank, list:paneList }[tab]();
  wire();
}
const msgHTML = id => `<span class="msg ${msgBad?'bad':''}" id="${id}">${esc(msg)}</span>`;
let impMsg = '', impMsgBad = false;
const impMsgHTML = id => `<span class="msg ${impMsgBad?'bad':''}" id="${id}">${esc(impMsg)}</span>`;
const ibad = t => { impMsg = t; impMsgBad = true;  render(); };
const iok  = t => { impMsg = t; impMsgBad = false; render(); };
const emptyCard = t => `<div class="card"><div class="empty">${t}</div></div>`;

/* ---- 記録する ---- */
function paneIn(){
  const f = form, pl = places();
  const chip = (v,cur,fld,suf='') => `<button class="chip ${String(cur)===String(v)?'on':''}" data-set="${fld}" data-val="${v}">${v}${suf}</button>`;
  return `
  <div class="card">
    <h2>1回ぶんを残す</h2>
    <p class="note">つけた場所・待った分数・乗せた分数・金額。この4つだけで時間単価が出る。時刻は「2530」「25:30」「1:30」いずれでも可。</p>
    <div class="grid">
      <div class="f w2"><label>営業日（夜の始まった日）</label>
        <input type="date" id="f_date" value="${f.date || today()}"></div>
      <div class="f w2"><label>つけ待ち場所</label>
        <input class="ja" id="f_place" list="pls" placeholder="新地7" value="${esc(f.place || '')}">
        <datalist id="pls">${pl.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        <div class="chips">${pl.slice(0,6).map(p => `<button class="chip ${f.place===p?'on':''}" data-set="place" data-val="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      </div>
      <div class="f w2"><label>乗せた時刻（出発）</label>
        <input id="f_dep" inputmode="numeric" placeholder="25:30" value="${esc(f.dep || '')}">
        <div class="hint" id="depHint"></div></div>

      <div class="f w2"><label>待ち時間（分）</label>
        <input id="f_wait" inputmode="numeric" placeholder="15" value="${f.wait ?? ''}">
        <div class="chips">${[5,10,15,20,30,45].map(v => chip(v,f.wait,'wait','分')).join('')}</div></div>
      <div class="f w2"><label>乗車時間（分）</label>
        <input id="f_ride" inputmode="numeric" placeholder="20" value="${f.ride ?? ''}">
        <div class="chips">${[5,10,15,20,30,45].map(v => chip(v,f.ride,'ride','分')).join('')}</div></div>
      <div class="f w2"><label>金額（円）</label>
        <input id="f_fare" inputmode="numeric" placeholder="3400" value="${f.fare ?? ''}">
        <div class="hint" id="rateHint"></div></div>

      <!-- ★記録用スプレッドシートの「種」と「他」に合わせた欄（2026/10/26 追加） -->
      <div class="f w2"><label>種類</label>
        <input class="ja" id="f_method" list="mts" placeholder="GO" value="${esc(f.method || '')}">
        <datalist id="mts">${METHODS.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
        <div class="chips">${METHODS.slice(0,6).map(m => chip(m, f.method, 'method')).join('')}</div>
      </div>
      <div class="f w4"><label>他（行先・ひとこと）</label>
        <input class="ja" id="f_note" placeholder="行先：新金岡駅（堺市）" value="${esc(f.note || '')}"></div>
    </div>
    <div class="actions">
      <button class="btn" id="add">${editId ? '書きかえる' : '記録する'}</button>
      ${editId ? `<button class="btn ghost" id="cancel">やめる</button>` : ''}
      ${msgHTML('msg')}
    </div>
  </div>

  <div class="card">
    <h2>直近の記録</h2>
    <p class="note">${records.length ? '新しい順に10件。全員ぶんが1つの台帳に入る。' : 'まだ1件もない。'}</p>
    ${filterChips()}
    ${visible().length ? tableHTML(sorted().slice(0,10)) : `<div class="empty">まず1回ぶん入れてみる。</div>`}
  </div>`;
}
const filterChips = () => `<div class="chips" style="margin-bottom:12px">
  <button class="chip ${onlyMine?'':'on'}" data-mine="0">全員</button>
  <button class="chip ${onlyMine?'on':''}" data-mine="1">自分だけ</button></div>`;

function tableHTML(rows){
  return `<div class="scroll"><table><thead><tr>
    <th>日付</th><th>場所</th><th>乗せた</th><th class="n">待ち</th><th class="n">乗車</th>
    <th class="n">金額</th><th class="n">時間単価</th><th>種類</th><th>他</th><th>記録者</th><th></th></tr></thead><tbody>
    ${rows.map(r => `<tr>
      <td>${fmtD(r.date)}</td><td>${esc(r.place)}</td>
      <td class="n">${fmtT(r.dep)}</td><td class="n">${r.wait}分</td><td class="n">${r.ride}分</td>
      <td class="n">${yen(r.fare)}</td>
      <td class="n" style="color:var(--meter)">${rate(r) ? yen(rate(r)) : '—'}</td>
      <td>${r.method ? `<span class="mtag ${mcls(r.method)}">${esc(r.method)}</span>` : ''}</td>
      <td class="ja">${esc(r.note || '')}</td>
      <td>${esc(r.who)}</td>
      <td>${canEdit(r) ? `<button class="mini" data-edit="${r.id}">直す</button>
          <button class="mini" data-del="${r.id}">消す</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

/* ---- 熱いところ ---- */
function paneHeat(){
  const R = visible();
  if (!R.length) return emptyCard('場所と時間帯がそろうと、ここが熱さの地図になる。');
  const hs = R.map(r => Math.floor(r.dep));
  const hrs = []; for (let h = Math.min(...hs); h <= Math.max(...hs); h++) hrs.push(h);
  const pls = [...new Set(R.map(r => r.place).filter(Boolean))]
    .map(p => ({ p, n: R.filter(r => r.place === p).length })).sort((a,b) => b.n - a.n).slice(0,10).map(o => o.p);
  const cell = (p,h) => { const s = R.filter(r => (p === null || r.place === p) && Math.floor(r.dep) === h);
    return { n:s.length, avg: s.length ? s.map(rate).reduce((a,b)=>a+b,0)/s.length : 0,
             fare: s.length ? s.reduce((a,r)=>a+r.fare,0)/s.length : 0 }; };
  const all = []; pls.forEach(p => hrs.forEach(h => { const c = cell(p,h); if (c.n) all.push(c.avg); }));
  const mx = Math.max(...all, 1), cw = 64, ch = 42, lw = 86;
  const w = lw + hrs.length*cw + 8, hgt = 34 + (pls.length+1)*ch + 8;
  let s = `<svg viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}">`;
  hrs.forEach((h,i) => s += `<text class="axis" x="${lw+i*cw+cw/2}" y="22" text-anchor="middle">${h}時</text>`);
  const row = (label,p,y) => {
    let o = `<text class="axis" x="${lw-8}" y="${y+ch/2+4}" text-anchor="end" style="font-family:var(--body);font-size:11px">${esc(label)}</text>`;
    hrs.forEach((h,i) => { const c = cell(p,h), x = lw+i*cw, t = c.n ? Math.min(1, c.avg/mx) : 0;
      o += `<g data-tip="${esc(label)} ${h}時台&#10;件数 ${c.n}件&#10;平均 時間単価 ${c.n?yen(c.avg)+'/h':'—'}&#10;平均 金額 ${c.n?yen(c.fare):'—'}">
        <rect x="${x+2}" y="${y+2}" width="${cw-4}" height="${ch-4}" rx="4" fill="${c.n?`rgba(240,163,59,${.10+t*.82})`:'rgba(255,255,255,.03)'}" stroke="#243350"/>
        ${c.n ? `<text class="glab" x="${x+cw/2}" y="${y+ch/2-1}" text-anchor="middle" fill="${t>.55?'#14100A':'#EDE6D8'}">${Math.round(c.avg/100)/10}k</text>
        <text class="glab" x="${x+cw/2}" y="${y+ch/2+12}" text-anchor="middle" font-size="9" fill="${t>.55?'#4A3A1E':'#8A99B5'}">${c.n}件</text>` : ''}
      </g>`; });
    return o; };
  pls.forEach((p,i) => s += row(p,p,34+i*ch));
  s += `<line x1="${lw}" x2="${w-8}" y1="${34+pls.length*ch+1}" y2="${34+pls.length*ch+1}" class="grid-l"/>`;
  s += row('ぜんぶ', null, 34+pls.length*ch+2) + '</svg>';
  return `<div class="card"><h2>時間帯 × つけ待ち場所</h2>
    <p class="note">数字は平均の時間単価（k＝千円/時）。濃いマスほど、待ち時間まで込みで割のいい枠。まずは3件以上たまったマスだけ信じる。</p>
    ${filterChips()}<div class="scroll">${s}</div>
    <div class="legend"><span><i style="background:rgba(240,163,59,.15)"></i>うすい＝単価が低い</span>
    <span><i style="background:rgba(240,163,59,.92)"></i>濃い＝単価が高い</span><span>最大 ${yen(mx)}/h</span></div></div>`;
}

/* ---- 一夜の流れ ---- */
function paneTl(){
  const R = visible();
  if (!R.length) return emptyCard('待ち時間と乗車時間を、夜ごとの帯で見比べる。');
  const ds = [...new Set(R.map(r => r.date))].sort().reverse().slice(0,14);
  const x0 = 19, x1 = Math.max(29, Math.ceil(Math.max(...R.map(r => r.dep + r.ride/60))));
  const L = 74, Rp = 16, W = 760, rowH = 34, H = 40 + ds.length*rowH + 14;
  const sx = v => L + (v-x0)/(x1-x0)*(W-L-Rp);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMinYMin meet">`;
  for (let h = x0; h <= x1; h++) s += `<line class="grid-l" x1="${sx(h)}" x2="${sx(h)}" y1="26" y2="${H-14}" ${h%2?'stroke-dasharray="2 4"':''}/>
    <text class="axis" x="${sx(h)}" y="18" text-anchor="middle">${h}</text>`;
  ds.forEach((d,i) => {
    const y = 34 + i*rowH;
    s += `<text class="axis" x="${L-10}" y="${y+20}" text-anchor="end" fill="${dcol(d)}">${fmtD(d)}</text>`;
    R.filter(r => r.date === d).forEach(r => {
      const a = sx(r.dep - (+r.wait||0)/60), b = sx(r.dep), c = sx(r.dep + (+r.ride||0)/60);
      const rt = rate(r), t = Math.min(1, rt/12000);
      const tip = `${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;つけ ${fmtT(r.dep-(r.wait||0)/60)} → 出 ${fmtT(r.dep)}（待ち${r.wait}分）&#10;乗車 ${r.ride}分・${yen(r.fare)}&#10;時間単価 ${rt?yen(rt)+'/h':'—'}`;
      s += `<g data-tip="${tip}">
        <rect x="${a}" y="${y+13}" width="${Math.max(1,b-a)}" height="6" rx="3" fill="#3A4B6D"/>
        <rect x="${b}" y="${y+8}" width="${Math.max(3,c-b)}" height="16" rx="4" fill="rgba(240,163,59,${.25+t*.7})"/>
        <rect x="${a-1}" y="${y+4}" width="${Math.max(6,c-a+2)}" height="24" fill="transparent"/></g>`;
      if (r.fare >= 8000) s += `<text class="glab" x="${c+4}" y="${y+21}" fill="var(--meter)">${yen(r.fare)}</text>`;
    });
  });
  s += '</svg>';
  return `<div class="card"><h2>夜ごとのタイムライン</h2>
    <p class="note">細い線＝つけ待ちで潰れた時間、太い帯＝実車。帯が明るいほど時間単価が高い。空白が長い夜は、流しかつけ場所を変える余地がある。</p>
    ${filterChips()}<div class="scroll">${s}</div>
    <div class="legend"><span><i style="background:#3A4B6D"></i>待ち</span><span><i style="background:rgba(240,163,59,.9)"></i>実車（明るい＝高単価）</span><span>横軸は時。25＝翌1時</span></div></div>`;
}

/* ---- 時間×金額 ---- */
function paneSc(){
  const R = visible();
  if (!R.length) return emptyCard('もとの折れ線グラフを、ラベルが重ならない形で。');
  const ds = [...new Set(R.map(r => r.date))].sort();
  const L = 58, Rp = 20, T = 18, B = 40, W = 760, H = 430;
  const xs = R.map(r => r.dep);
  const x0 = Math.floor(Math.min(...xs)-.5), x1 = Math.ceil(Math.max(...xs)+.5);
  const y1 = Math.max(...R.map(r => r.fare)) * 1.12;
  const sx = v => L + (v-x0)/(x1-x0)*(W-L-Rp), sy = v => H-B - (v/y1)*(H-T-B);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMinYMin meet">`;
  const step = y1 > 20000 ? 5000 : y1 > 8000 ? 2000 : 1000;
  for (let v = 0; v <= y1; v += step) s += `<line class="grid-l" x1="${L}" x2="${W-Rp}" y1="${sy(v)}" y2="${sy(v)}"/>
    <text class="axis" x="${L-8}" y="${sy(v)+4}" text-anchor="end">${v ? ('¥'+v/1000+'k') : '0'}</text>`;
  for (let h = x0; h <= x1; h++) s += `<line class="grid-l" x1="${sx(h)}" x2="${sx(h)}" y1="${T}" y2="${H-B}" stroke-dasharray="2 4"/>
    <text class="axis" x="${sx(h)}" y="${H-B+18}" text-anchor="middle">${h}</text>`;
  s += `<text class="axis" x="${(L+W-Rp)/2}" y="${H-6}" text-anchor="middle">時（25＝翌1時）</text>`;
  const placed = [];
  const fits = (x,y,w) => { for (const p of placed) if (x < p.x+p.w+3 && x+w+3 > p.x && y < p.y+11 && y+11 > p.y) return false; return true; };
  ds.forEach(d => {
    const c = dcol(d), pts = R.filter(r => r.date === d).sort((a,b) => a.dep - b.dep);
    if (scOpt.line && pts.length > 1)
      s += `<polyline fill="none" stroke="${c}" stroke-width="1.3" opacity=".55" points="${pts.map(r => sx(r.dep)+','+sy(r.fare)).join(' ')}"/>`;
    pts.forEach(r => {
      const x = sx(r.dep), y = sy(r.fare);
      s += `<g data-tip="${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;${fmtT(r.dep)}・${yen(r.fare)}&#10;待ち${r.wait}分／乗車${r.ride}分&#10;時間単価 ${rate(r)?yen(rate(r))+'/h':'—'}">
        <circle cx="${x}" cy="${y}" r="4.5" fill="${c}"/><circle cx="${x}" cy="${y}" r="11" fill="transparent"/></g>`;
      if (scOpt.label) {
        const txt = yen(r.fare), w = txt.length*6.2;
        let ly = y-9, ok = false;
        for (const dy of [0,-12,12,-24,24,-36,36,-48,48]) if (fits(x+7, ly+dy, w)) { ly += dy; ok = true; break; }
        if (ok) { placed.push({x:x+7, y:ly, w}); s += `<text class="glab" x="${x+7}" y="${ly+8}" fill="${c}">${txt}</text>`; }
      }
    });
  });
  s += '</svg>';
  return `<div class="card"><h2>乗せた時刻 × 金額</h2>
    <p class="note">日付ごとに色分け。金額ラベルは重ならない位置へ自動で逃がすので、手で動かす必要はない。</p>
    <div class="toolbar">
      <button class="chip ${scOpt.line?'on':''}" data-opt="line">線でつなぐ</button>
      <button class="chip ${scOpt.label?'on':''}" data-opt="label">金額を出す</button>
      <span style="width:8px"></span>
      <button class="chip ${onlyMine?'':'on'}" data-mine="0">全員</button>
      <button class="chip ${onlyMine?'on':''}" data-mine="1">自分だけ</button>
    </div>
    <div class="scroll">${s}</div>
    <div class="legend">${ds.map(d => `<span><i style="background:${dcol(d)}"></i>${fmtD(d)}</span>`).join('')}</div></div>`;
}

/* ---- 集計 ---- */
function agg(rs){ return { n: rs.length,
  avg: rs.map(rate).reduce((a,b)=>a+b,0)/rs.length,
  fare: rs.reduce((a,r)=>a+r.fare,0)/rs.length,
  sum: rs.reduce((a,r)=>a+r.fare,0),
  wait: rs.reduce((a,r)=>a+(+r.wait||0),0)/rs.length }; }
function hourAgg(){ const m = {}; visible().forEach(r => { const h = Math.floor(r.dep); (m[h] = m[h] || []).push(r); });
  return Object.entries(m).map(([h,rs]) => ({ h:+h, ...agg(rs) })).sort((a,b) => a.h - b.h); }
function placeAgg(){ const m = {}; visible().forEach(r => { const p = r.place || '（無記入）'; (m[p] = m[p] || []).push(r); });
  return Object.entries(m).map(([p,rs]) => ({ p, ...agg(rs) })).sort((a,b) => b.avg - a.avg); }
function bars(rows, label, fmt){
  const mx = Math.max(...rows.map(r => r.avg), 1);
  return `<div class="scroll"><table><thead><tr><th>${label}</th><th class="n">件</th><th class="n">平均 時間単価</th>
    <th style="width:34%"></th><th class="n">平均 金額</th><th class="n">平均 待ち</th><th class="n">売上</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(fmt(r))}</td><td class="n">${r.n}</td>
      <td class="n" style="color:var(--meter)">${yen(r.avg)}</td>
      <td><div class="bar" style="width:${Math.max(3, r.avg/mx*100)}%;opacity:${r.n>=3?1:.4}"></div></td>
      <td class="n">${yen(r.fare)}</td><td class="n">${Math.round(r.wait)}分</td>
      <td class="n">${yen(r.sum)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function paneRank(){
  if (!visible().length) return emptyCard('3件たまったところから、数字は当てになりはじめる。');
  const h = hourAgg(), p = placeAgg();
  const best = h.filter(x => x.n >= 3).sort((a,b) => b.avg - a.avg).slice(0,3);
  const worst = h.filter(x => x.n >= 3).sort((a,b) => a.avg - b.avg)[0];
  return `<div class="card"><h2>読みどころ</h2>
    <p class="note">3件以上ある枠だけを並べた。薄い棒は件数が足りていない目安。</p>
    ${filterChips()}
    ${best.length ? `<div style="font-size:13px;line-height:2">
      熱い時間帯：${best.map(b => `<b style="font-family:var(--mono);color:var(--andon)">${b.h}時台 ${yen(b.avg)}/h</b>`).join('　')}<br>
      ${worst ? `薄い時間帯：<span style="font-family:var(--mono);color:var(--kusha)">${worst.h}時台 ${yen(worst.avg)}/h</span>` : ''}
      ${p[0] && p[0].n >= 3 ? `<br>割のいい場所：<b style="color:var(--andon)">${esc(p[0].p)} ${yen(p[0].avg)}/h</b>` : ''}
    </div>` : `<div class="note">まだ3件以上そろった時間帯がない。</div>`}
  </div>
  <div class="card"><h2>時間帯べつ</h2><p class="note">乗せた時刻で仕分け。</p>${bars(h,'時間帯',r => r.h+'時台')}</div>
  <div class="card"><h2>つけ待ち場所べつ</h2><p class="note">時間単価の高い順。</p>${bars(p,'場所',r => r.p)}</div>`;
}

/* ---- 一覧・書き出し ---- */
function paneList(){
  return `<div class="card"><h2>一覧（${visible().length}件）</h2>
    ${filterChips()}
    ${visible().length ? tableHTML(sorted()) : `<div class="empty">記録がない。</div>`}
  </div>
  <div class="card"><h2>書き出し</h2>
    <p class="note">いま表示している${onlyMine?'自分の':'全員の'}記録をCSVに。スプレッドシートで集計したいとき、控えを残したいときに。</p>
    <div class="actions">
      <button class="btn ghost" id="csvout">CSVを書き出す</button>
      <button class="btn ghost" id="copy">クリップボードにコピー</button>
      ${msgHTML('msg2')}
    </div>
  </div>
  ${paneImport()}`;
}

/* ---- 取り込み（スプレッドシートから一括） ---- */
function paneImport(){
  return `<div class="card"><h2>スプレッドシートから取り込む</h2>
    <p class="note">シートの範囲をそのままコピーして、下に貼るだけ。見出し行があれば列の並びは自動で読む。
    なければ「日付・場所・乗せた時刻・待ち・乗車・金額」の順とみなす。
    <b>いきなり保存はしない</b>ので、中身を確かめてから取り込める。取り込んだ記録は${esc(ME.profile.display_name || '自分')}の名義で入る。</p>
    <div class="f">
      <label>ここに貼る（タブ区切り・カンマ区切りどちらでも）</label>
      <textarea id="csvin" rows="6" placeholder="日付	場所	時刻	待ち	乗車	金額
5/21	新地7	22:24	25	42	10,350">${esc(importText)}</textarea>
    </div>
    <div class="actions">
      <span style="font-size:11px;color:var(--muted)">年が書かれていない日付の年：</span>
      <input id="impYear" inputmode="numeric" style="width:92px" value="${impYear}">
      <button class="btn" id="prev">中身を確かめる</button>
      <button class="btn ghost" id="impClear">消す</button>
      ${impMsgHTML('msg3')}
    </div>
    ${importPreview()}
  </div>`;
}

function importPreview(){
  if (!impDone) return '';
  const total = impOk.length + impDup.length + impNg.length;
  if (!total) return `<div class="empty">読める行がなかった。見出し行だけになっていないか確かめてください。</div>`;
  return `<div style="margin-top:18px;border-top:1px solid var(--line);padding-top:16px">
    <div style="font-size:13px;line-height:1.9;margin-bottom:12px">
      読めた <b style="color:var(--meter);font-family:var(--mono)">${impOk.length}</b> 件
      ${impDup.length ? `／ すでに同じ記録がある <b style="color:var(--andon);font-family:var(--mono)">${impDup.length}</b> 件（飛ばす）` : ''}
      ${impNg.length ? `／ 読めなかった <b style="color:var(--kusha);font-family:var(--mono)">${impNg.length}</b> 件` : ''}
    </div>
    ${impOk.length ? `<div class="scroll"><table><thead><tr>
      <th>行</th><th>日付</th><th>場所</th><th>乗せた</th><th class="n">待ち</th><th class="n">乗車</th>
      <th class="n">金額</th><th class="n">時間単価</th></tr></thead><tbody>
      ${impOk.slice(0,25).map(r => `<tr><td style="color:var(--muted)">${r._ln}</td>
        <td>${fmtD(r.work_date)}</td><td>${esc(r.place)}</td><td class="n">${fmtT(r.dep)}</td>
        <td class="n">${r.wait_min}分</td><td class="n">${r.ride_min}分</td><td class="n">${yen(r.fare)}</td>
        <td class="n" style="color:var(--meter)">${yen(rate({wait:r.wait_min,ride:r.ride_min,fare:r.fare}))}</td></tr>`).join('')}
    </tbody></table></div>${impOk.length > 25 ? `<p class="note" style="margin:8px 0 0">ほか ${impOk.length-25} 件（省略）</p>` : ''}` : ''}

    ${impNg.length ? `<div class="warn" style="margin-top:14px">読めなかった行。直して貼り直すか、このまま進めれば飛ばされる。<br>
      ${impNg.slice(0,8).map(b => `<span style="font-family:var(--mono)">${b.ln}行目</span>：${esc(b.why)}　<span style="color:#9E8878">${esc(b.raw.slice(0,60))}</span>`).join('<br>')}
      ${impNg.length > 8 ? `<br>ほか ${impNg.length-8} 行` : ''}</div>` : ''}

    <div class="actions">
      <button class="btn" id="impGo" ${impOk.length ? '' : 'disabled'}>この ${impOk.length} 件を取り込む</button>
      ${impMsgHTML('msg4')}
    </div>
  </div>`;
}

/* ---------- 操作 ---------- */
function wire(){
  const dep = $('#f_dep');
  const upd = () => {
    const d = parseT(dep ? dep.value : '');
    if ($('#depHint')) $('#depHint').textContent = d !== null ? fmtT(d) + ' に出発' : (dep && dep.value ? '読めない時刻' : '');
    const w = +(($('#f_wait')||{}).value) || 0, r = +(($('#f_ride')||{}).value) || 0, f = +(($('#f_fare')||{}).value) || 0;
    if ($('#rateHint')) $('#rateHint').textContent = (w+r > 0 && f) ? '時間単価 ' + yen(f/(w+r)*60) + '/h' : '';
  };
  ['f_dep','f_wait','f_ride','f_fare'].forEach(id => { const e = document.getElementById(id); if (e) e.addEventListener('input', upd); });
  upd();

  document.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { grab(); form[b.dataset.set] = b.dataset.val; render(); });
  document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { scOpt[b.dataset.opt] = !scOpt[b.dataset.opt]; render(); });
  document.querySelectorAll('[data-mine]').forEach(b => b.onclick = () => { grab(); onlyMine = b.dataset.mine === '1'; render(); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => delRec(b.dataset.del));
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    const r = records.find(x => x.id === b.dataset.edit); if (!r) return;
    form = { date:r.date, place:r.place, dep:fmtT(r.dep), wait:r.wait, ride:r.ride, fare:r.fare };
    editId = r.id; tab = 'in'; msg = ''; render(); window.scrollTo({ top:0, behavior:'smooth' });
  });
  if ($('#add'))    $('#add').onclick = addRec;
  if ($('#cancel')) $('#cancel').onclick = () => { editId = null; form = {}; msg = ''; render(); };
  if ($('#csvout')) $('#csvout').onclick = () => dl(csv());
  if ($('#copy'))   $('#copy').onclick = async () => { try { await navigator.clipboard.writeText(csv()); ok('コピーした'); } catch(e) { bad('コピーできなかった'); } };
  const ta = $('#csvin');
  if (ta) ta.addEventListener('input', () => { importText = ta.value; });
  const yr = $('#impYear');
  if (yr) yr.addEventListener('input', () => { impYear = yr.value.trim(); });
  if ($('#prev')) $('#prev').onclick = () => {
    if (ta) importText = ta.value;
    if (yr) impYear = yr.value.trim();
    parseImport();
  };
  if ($('#impClear')) $('#impClear').onclick = () => {
    importText = ''; impOk = []; impNg = []; impDup = []; impDone = false; impMsg = ''; render();
  };
  if ($('#impGo')) $('#impGo').onclick = commitImport;

  document.querySelectorAll('[data-tip]').forEach(g => {
    g.addEventListener('mouseenter', e => showTip(e, g.dataset.tip));
    g.addEventListener('mousemove', moveTip);
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('click', e => { showTip(e, g.dataset.tip); setTimeout(hideTip, 2600); });
  });
}
function grab(){
  const g = id => { const e = document.getElementById(id); return e ? e.value : undefined; };
  form = { date:g('f_date') ?? form.date, place:g('f_place') ?? form.place, dep:g('f_dep') ?? form.dep,
           wait:g('f_wait') ?? form.wait, ride:g('f_ride') ?? form.ride, fare:g('f_fare') ?? form.fare,
           method:g('f_method') ?? form.method, note:g('f_note') ?? form.note };
}
const ok  = t => { msg = t; msgBad = false; render(); };
const bad = t => { msg = t; msgBad = true;  render(); };

async function addRec(){
  grab();
  const d = parseT(form.dep), fare = +form.fare;
  if (!form.date)      return bad('営業日を入れる');
  if (d === null)      return bad('乗せた時刻が読めない（例 25:30）');
  if (!fare || fare<0) return bad('金額を入れる');
  const row = {
    user_id: ME.user.id, work_date: form.date, place: (form.place || '').trim(),
    dep: +d.toFixed(2), wait_min: Math.max(0, Math.round(+form.wait || 0)),
    ride_min: Math.max(0, Math.round(+form.ride || 0)), fare: Math.round(fare),
    method: normMethod(form.method || ''), note: (form.note || '').trim()
  };
  const btn = $('#add'); btn.disabled = true;
  let error;
  if (editId) ({ error } = await db.from('rides').update(row).eq('id', editId));
  else        ({ error } = await db.from('rides').insert(row));
  if (error) { btn.disabled = false; return bad(jaError(error)); }
  const r = { wait: row.wait_min, ride: row.ride_min, fare: row.fare };
  msg = editId ? '書きかえた' : `記録した（時間単価 ${rate(r) ? yen(rate(r)) + '/h' : '—'}）`;
  msgBad = false; editId = null;
  form = { date: row.work_date, place: row.place, dep:'', wait:'', ride:'', fare:'', method:'', note:'' };
  await reload();
}
async function delRec(id){
  if (!confirm('この1件を消します。戻せません。')) return;
  const { error } = await db.from('rides').delete().eq('id', id);
  if (error) return bad(jaError(error));
  msg = '消した'; msgBad = false;
  await reload();
}

/* ---- CSV ---- */
function csv(){
  const q = v => `"${String(v == null ? '' : v).replace(/"/g,'""')}"`;
  return ['日付,場所,乗せた時刻,待ち時間(分),乗車時間(分),金額,時間単価,種類,他,記録者',
    ...sorted().map(r => [r.date, q(r.place), fmtT(r.dep), r.wait, r.ride, r.fare,
      Math.round(rate(r)), q(r.method), q(r.note), q(r.who)].join(','))].join('\n');
}
function dl(text){
  const b = new Blob(['\ufeff' + text], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = 'tsukemachi_' + today() + '.csv'; a.click();
  URL.revokeObjectURL(a.href); ok('書き出した');
}
/* ===== 取り込み ===== */
let importText = '', impYear = String(new Date().getFullYear());
let impOk = [], impNg = [], impDup = [], impDone = false;

/* 日付：2026-05-21 / 2026/5/21 / 5/21 / 5/21(木) / 2026.5.21 */
function parseDate(s, year){
  if (!s) return null;
  let t = String(s).trim().replace(/[（(].*?[）)]/g, '').replace(/[年月]/g, '/').replace(/日/, '').trim();
  t = t.replace(/\./g, '/');
  let m;
  if ((m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)))
    return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  if ((m = t.match(/^(\d{1,2})[-/](\d{1,2})$/))) {
    const mo = +m[1], d = +m[2];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${year}-${pad(mo)}-${pad(d)}`;
  }
  return null;
}

/* 時刻：25:30 / 2530 / 1:30 / 22.4（小数の時）*/
function parseTimeCell(s){
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  if (!t) return null;
  if (/^\d{1,2}\.\d+$/.test(t)) {                 // 22.4 → 22時24分
    const v = parseFloat(t);
    let h = Math.floor(v), mi = Math.round((v - h) * 60);
    if (mi === 60) { h++; mi = 0; }
    if (h < 12) h += 24;
    if (h > 32 || mi > 59) return null;
    return h + mi / 60;
  }
  return parseT(t);
}
const parseNum = s => {
  const t = String(s ?? '').replace(/[¥￥,，円分\s]/g, '').trim();
  if (t === '') return 0;
  const v = Number(t);
  return isNaN(v) ? null : v;
};

/* 見出し行から列の位置を割り出す。見つからなければ null */
function detectCols(cells){
  /*
   * ★記録用スプレッドシートから移せるように、
   *   「種」「他」「営（記録者）」も見分けます（2026/10/26 追加）。
   */
  const idx = { date:-1, place:-1, dep:-1, wait:-1, ride:-1, fare:-1,
                method:-1, note:-1, who:-1 };
  // 「つけ待ち場所」が待ち時間と誤認されないよう、場所をいちばん先に判定する
  const rules = [
    ['place', c => /場所|地点|乗場|place/i.test(c)],
    ['wait',  c => (/待/.test(c) && !/場所/.test(c)) || /wait/i.test(c)],
    ['ride',  c => (/乗車|実車|ride/i.test(c)) && !/時刻/.test(c)],
    ['fare',  c => /金額|売上|運賃|料金|fare|amount/i.test(c)],
    ['date',  c => /日付|営業日|date/i.test(c) || c === '日'],
    ['dep',   c => /時刻|乗せ|出発|開始|time/i.test(c) || (/時間?$/.test(c) && !/待|乗車|単価/.test(c))],
    // ★スプシの見出しは1文字（種・他・営）なので、そのままでも拾えるようにする
    ['method', c => /^種$|種類|method/i.test(c)],
    ['note',   c => /^他$|備考|メモ|note/i.test(c)],
    ['who',    c => /^営$|記録者|名前|担当/i.test(c)]
  ];
  cells.forEach((raw,i) => {
    const c = String(raw).replace(/\s/g,'');
    if (!c) return;
    for (const [key, hit] of rules) {
      if (idx[key] < 0 && hit(c)) { idx[key] = i; return; }
    }
  });
  return (idx.date >= 0 && idx.dep >= 0 && idx.fare >= 0) ? idx : null;
}

function splitLine(line, delim){
  if (delim === '\t') return line.split('\t');
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i+1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseImport(){
  impOk = []; impNg = []; impDup = []; impDone = true;
  const txt = importText;
  if (!txt.trim()) { impDone = false; return ibad('先に貼り付けてください'); }
  const year = /^\d{4}$/.test(impYear) ? impYear : String(new Date().getFullYear());
  const lines = txt.replace(/\uFEFF/g,'').split(/\r?\n/).filter(l => l.trim() !== '');
  const delim = lines[0].includes('\t') ? '\t' : ',';

  let cols = detectCols(splitLine(lines[0], delim).map(s => s.trim().replace(/^"|"$/g,'')));
  let start = 0;
  if (cols) start = 1;
  else cols = { date:0, place:1, dep:2, wait:3, ride:4, fare:5 };

  const seen = new Set(records.map(r => `${r.date}|${r.dep.toFixed(2)}|${r.fare}`));

  for (let i = start; i < lines.length; i++) {
    const ln = i + 1, raw = lines[i];
    const c = splitLine(raw, delim).map(s => s.trim().replace(/^"|"$/g,''));
    const get = k => cols[k] >= 0 ? c[cols[k]] : '';
    if (c.every(v => v === '')) continue;

    const d = parseDate(get('date'), year);
    if (!d)  { impNg.push({ ln, raw, why:'日付が読めない' }); continue; }
    const t = parseTimeCell(get('dep'));
    if (t === null) { impNg.push({ ln, raw, why:'乗せた時刻が読めない' }); continue; }
    const f = parseNum(get('fare'));
    if (f === null || f <= 0) { impNg.push({ ln, raw, why:'金額が読めない' }); continue; }
    const w = parseNum(get('wait')), rd = parseNum(get('ride'));
    if (w === null || rd === null) { impNg.push({ ln, raw, why:'待ち／乗車の分数が読めない' }); continue; }

    /*
     * ★だれの記録かを、CSVの「営（記録者）」から決めます。
     *   名前が見つからないときは、取り込んだ人のものにします。
     *   ★名義を変えられるのは管理者だけです（守りは schema.sql の RLS）。
     */
    const whoName = (get('who') || '').trim();
    const owner = whoName ? (idByName(whoName) || ME.user.id) : ME.user.id;

    const row = { user_id: owner, work_date: d, place: (get('place') || '').trim(),
      dep: +t.toFixed(2), wait_min: Math.max(0, Math.round(w)), ride_min: Math.max(0, Math.round(rd)),
      fare: Math.round(f),
      method: normMethod(get('method') || ''), note: (get('note') || '').trim(),
      _ln: ln };
    const key = `${row.work_date}|${row.dep.toFixed(2)}|${row.fare}`;
    if (seen.has(key)) { impDup.push(row); continue; }
    seen.add(key);
    impOk.push(row);
  }
  impMsg = ''; impMsgBad = false;
  render();
}

async function commitImport(){
  if (!impOk.length) return;
  const btn = $('#impGo'); btn.disabled = true; btn.textContent = '取り込んでいます…';
  const rows = impOk.map(({ _ln, ...r }) => r);
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('rides').insert(rows.slice(i, i + 200));
    if (error) { btn.disabled = false; btn.textContent = 'もう一度'; return ibad(jaError(error)); }
  }
  const n = rows.length;
  importText = ''; impOk = []; impNg = []; impDup = []; impDone = false;
  impMsg = `${n}件を取り込んだ。上の一覧に入っている。`; impMsgBad = false;
  await reload();
}

/* ---- tooltip ---- */
const tip = $('#tip');
function showTip(e,t){ tip.innerHTML = String(t).replace(/&#10;/g,'<br>').split('\n').join('<br>'); tip.classList.add('on'); moveTip(e); }
function moveTip(e){ tip.style.left = Math.min(e.clientX+14, innerWidth-240) + 'px'; tip.style.top = Math.max(8, e.clientY-70) + 'px'; }
function hideTip(){ tip.classList.remove('on'); }
