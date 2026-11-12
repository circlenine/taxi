/* TAXI NOTE 本体 */
const $ = s => document.querySelector(s);

let ME = null, records = [], names = {}, tab = 'in', form = {}, editId = null, msg = '', msgBad = false;
let scOpt = { line: true, label: true }, onlyMine = false;
/*
 * しぼり込み（まーく様のご指示・2026/11/12）
 *   「各乗り場だけをピンポイントで絞る機能」
 *   「1ヶ月おきのレポート機能(期間設定も自由変更可能)」
 *
 * ★onlyPlace … 1つの乗り場だけに絞る（空なら ぜんぶ）
 * ★period    … いつからいつまでを数えるか
 *      mode:'all'  … ぜんぶ
 *      mode:'c0'   … 今期（16日〜翌月15日）。c1 は前期、c2 はその前…
 *      mode:'free' … from と to を、自分で決める
 * ★その端末に覚えます。開き直しても、絞ったままです。
 *   絞っていることを忘れると、数字を読みちがえます。
 *   だから、4つの数の下に「何で絞っているか」を必ず書きます。
 */
/* ★既定は「今期」（16日〜翌月15日）。全期間だと、閑散期と繁忙期が
     混ざって、見ても意味がありません（ご指示・2026/11/12）。 */
let onlyPlace = '', onlyDay = '', period = { mode: 'c0', from: '', to: '' };
const FILT_KEY = 'tsukemachi.filter';

function filtLoad(){
  try {
    const o = JSON.parse(localStorage.getItem(FILT_KEY) || '{}') || {};
    if (typeof o.place === 'string') onlyPlace = o.place;
    if (typeof o.day === 'string') onlyDay = o.day;
    if (typeof o.mine === 'boolean') onlyMine = o.mine;
    if (o.period && typeof o.period.mode === 'string') {
      period = { mode: o.period.mode,
                 from: String(o.period.from || ''), to: String(o.period.to || '') };
    }
  } catch (e) {}
}
function filtSave(){
  try {
    localStorage.setItem(FILT_KEY,
      JSON.stringify({ place: onlyPlace, day: onlyDay, mine: onlyMine, period: period }));
  } catch (e) {}
}
function filtClear(){ onlyPlace = ''; onlyDay = ''; period = { mode:'c0', from:'', to:'' }; filtSave(); }
const filtOn = () => !!onlyPlace || !!onlyDay || period.mode !== 'c0';

/* ---------- 起動 ---------- */
(async () => {
  const s = await requireLogin();
  if (!s) return;
  ME = s;
  /* ★右上は「称号」を出します（まーく様のご指示・2026/11/10）。
     称号を入れていない人は、短い名前。それも無ければメールアドレス。 */
  $('#me').textContent = s.profile.title || s.profile.display_name || s.user.email;
  if (s.profile.is_admin) { $('#meBadge').hidden = false; $('#toAdmin').hidden = false; }
  $('#out').addEventListener('click', signOut);
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    grab(); tab = b.dataset.t; msg = ''; render();
  });
  filtLoad();                      /* 前に絞ったままの形を思い出す */
  $('#boot').hidden = true; $('#app').hidden = false;
  await reload();
  /*
   * ★「いまアツい」は時刻で中身が変わるので、
   *   1分ごとに描き直します（通信はしません）。
   *   天気は30分ごとに読み直します（気象庁・無料）。
   */
  loadWx();
  setInterval(function (){ if (tab === 'hot') render(); }, 60 * 1000);
  setInterval(loadWx, 30 * 60 * 1000);
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
const METHODS = ['GO', 'Uber', 'S.Ride', '無線', '付け待ち', '流し', '手上げ',
                 '乗り場', 'ホテル', '途中乗り', '呼び込み', 'エスライド', '道路'];

/* ----------------------------------------------------------
 *  入れるときに、ひと押しで選べるもの（タブ）
 *  ★まーく様のご指示（2026/11/10）
 *      「待ち時間や乗車時間の分数のタブですが、０～６０分まで
 *        追加してください、また、種類のタブに「流し」は除外して、
 *        他のところに、チケット、バラシ、関空というタブを
 *        追加して下さい」
 * ---------------------------------------------------------- */

/* 分のタブ。0分から100分まで。
   ★まーく様のご指示（2026/11/11）
       「待ち時間や乗車時間は100分まで追加してください」
   ★60分までは5分きざみ、そこから先は10分きざみにしてあります。
     100個ぜんぶをタブにすると、画面が埋まって かえって押しにくい。
   ★1分きざみの細かい数も、欄を押せば候補として出ます（MIN_ALL）。 */
/* ★0〜60分。2行に収めるため、タグの字は数字だけにします（ご指示・2026/11/12） */
/* ★0〜90分。45までが1行目、50以降が2行目に収まります（ご指示・2026/11/12） */
const MIN_CHIPS = [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90];
const MIN_ALL = Array.from({ length: 101 }, (_, i) => i);

/* ------------------------------------------------------------
 *  発車時間を、押すだけで入れられるようにする（ご指示・2026/11/12）
 *
 *  ★走りながら入れるので、字を打たせません。
 *    時を押して、分を押せば、それで入ります。
 *  ★時は 17時から 翌4時まで。夜の乗務にある時間だけです。
 * ---------------------------------------------------------- */
/* ------------------------------------------------------------
 *  よく出る乗車金額（まーく様のご指示・2026/11/12）
 *    600〜900 は100円きざみ、1000〜2500 も100円きざみ。
 *  ★短い乗車は、ここから押すだけで入ります。
 *    これより大きい額は、そのまま打ち込みます。
 * ---------------------------------------------------------- */
const FARE_CHIPS = [600,700,800,900].concat(
  Array.from({ length: 16 }, (_, i) => 1000 + i * 100));

const DEP_H = ['17','18','19','20','21','22','23','00','01','02','03','04'];
const DEP_M = ['00','05','10','15','20','25','30','35','40','45','50','55'];

/** いま入っている発車時間を、時と分に分けて返す */
function depPart(v){
  const t = String(v == null ? '' : v).trim();
  const m = t.match(/^(\d{1,2})\D?(\d{2})$/);
  if (!m) return { h: '', m: '' };
  return { h: ('0' + m[1]).slice(-2), m: m[2] };
}
/** 時か分を押したときの、新しい発車時間 */
function depSet(v, h, mi){
  const p = depPart(v);
  const H = (h != null) ? h : (p.h || '00');
  const M = (mi != null) ? mi : (p.m || '00');
  return H + M;
}

/* 種類のタブ。「流し」は出しません（ご指示）。
   ★METHODS からは消していません。
     消すと、前に「流し」で入れた記録の書き方がそろわなくなるためです。
   ★「途中乗り」を足しました（ご指示・2026/11/11）。
     タブに出すものは、ここに名前で並べます。
     書き間違えると出なくなるので、検査（webnews.test.js）で
     「7つ ぜんぶ METHODS にある」ことを押さえています。 */
/* ★S.Ride を Uber の横に。付け待ちは出しません（ご指示・2026/11/12） */
const METHOD_CHIP_NAMES = ['GO', 'Uber', 'S.Ride', '無線', '手上げ', '乗り場', '途中乗り'];
const METHOD_CHIPS = METHOD_CHIP_NAMES.filter(m => METHODS.indexOf(m) !== -1);

/* 「他」のタブ。よく書くものを、ひと押しで入れられるように。
   ★「行先：」は“書き出し”なので、押すと欄に入れたうえで
     そのまま続きを打てるようにしています（ご指示・2026/11/11）。 */
const NOTE_CHIPS = ['行先：', 'チケット', 'バラシ', '関空'];

/* ------------------------------------------------------------
 *  つけ待ち場所を、地図で確かめる
 *
 *  ★まーく様のご指示（2026/11/11）
 *      「記録の際の乗車位置ですが、Googleマップと連携して、
 *        場所の確認作業（今後、同じ名前なら同じ場所として記録する、
 *        みたいなチェックボタンも付ける）、
 *        一覧を見た時に場所をクリックしたら、
 *        そこへGoogleマップへ飛ぶ形にしてください」
 *
 *  ★お金はかかりません。Googleマップの「検索して開くだけ」の
 *    住所を組み立てています。地図の鍵（有料のもの）は使いません。
 *  ★「同じ名前なら同じ場所」の印は、**その端末に覚えます**。
 *    みんなで分け合う形にするには台帳の棚を足す必要があるので、
 *    まずは自分の端末だけ。印が付いた場所は、一覧で ✓ が出ます。
 * ---------------------------------------------------------- */
const PLACE_OK_KEY = 'tsukemachi.place.ok';

/* ------------------------------------------------------------
 *  似ている乗り場の名前に、気づく（ご指示・2026/11/12）
 *    「乗り場名入力時、似ている乗り場名があれば
 *      もしかして、○○と同じですか？ という最終確認も出してください」
 *
 *  ★同じ場所が2つの名前で入ると、どちらも件数が足りず、
 *    どちらの数字も当てになりません。一番静かな事故です。
 * ---------------------------------------------------------- */
/** 見比べ用に、名前をそろえる（全角・半角・空白・記号を取る） */
function pkey(v){
  let t = String(v == null ? '' : v).trim().toLowerCase();
  t = t.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  t = t.replace(/[\s\u3000ー－\-・．.,、。「」（）()]/g, '');
  /* ★ひらがなとカタカナのゆれも、同じ所として見ます
       （ご指示・2026/11/12「ひらがなやカタカタの表記揺れがある場合は
         基本的に、初めに登録した名前に合わせてください」）。
       「なんば南」と「ナンバ南」が別の所になると、
       どちらの数字も当てになりません。 */
  t = t.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  return t;
}
/** 1字違いまでの近さを見る（レーベンシュタイン） */
function pdist(a, b){
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1,
                       d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  }
  return d[m][n];
}
/** いま打った名前に似ている、すでにある乗り場を1つ返す（無ければ空） */
function placeSuggest(name){
  const k = pkey(name);
  if (k.length < 2) return '';
  const list = places();
  /* そのものズバリがあれば、聞く必要はありません */
  for (const p of list) if (pkey(p) === k) return '';
  let best = '', bd = 9;
  for (const p of list) {
    const q = pkey(p);
    if (!q) continue;
    /* 片方がもう片方を丸ごと含むときも、同じ所の言い方違いが多い */
    let dd = pdist(k, q);
    if (dd > 1 && (q.indexOf(k) === 0 || k.indexOf(q) === 0) &&
        Math.abs(q.length - k.length) <= 2) dd = 1;
    if (dd < bd) { bd = dd; best = p; }
  }
  return bd <= 1 ? best : '';
}
/** 「このままでよい」と言われた名前は、二度と聞きません */
const placeAskOk = {};

/** 場所の名前から、Googleマップで開く住所を作る */
function mapUrl(place){
  const q = String(place || '').trim();
  if (!q) return '';
  /* 「大阪」を添えます。「7番」のような短い名前だけだと、
     まったく違う土地が出てしまうためです。 */
  return 'https://www.google.com/maps/search/?api=1&query=' +
         encodeURIComponent(/大阪|梅田|新地|難波|ミナミ/.test(q) ? q : '大阪 ' + q);
}
/** 「この名前は、この場所でよい」と印をつけた一覧 */
function placeOkList(){
  try { return JSON.parse(localStorage.getItem(PLACE_OK_KEY) || '[]') || []; }
  catch (e) { return []; }
}
function placeOk(p){ return placeOkList().indexOf(String(p || '')) !== -1; }
function placeOkToggle(p){
  const k = String(p || ''); if (!k) return;
  let L = placeOkList();
  L = (L.indexOf(k) !== -1) ? L.filter(x => x !== k) : L.concat([k]);
  try { localStorage.setItem(PLACE_OK_KEY, JSON.stringify(L)); } catch (e) {}
}

/** 書き方のゆれを、1つの言い方にそろえる */
function normMethod(v){
  const t = String(v == null ? '' : v).trim();
  if (!t) return '';
  // 「ゴ」「ゴー」「ｺﾞｰ」「go」「ＧＯ」→ GO
  if (/^(ゴ[ー\-ｰ]?|ｺﾞ[ー\-ｰ]?|go|ＧＯ)$/i.test(t)) return 'GO';
  if (/^(uber|ウーバー|ｳｰﾊﾞｰ|うーばー)$/i.test(t)) return 'Uber';
  if (/^(無線|むせん|ニューモ|newmo)$/i.test(t))   return '無線';
  /* ★エスライドは S.Ride にそろえます（ご指示・2026/11/12）。
       2つの書き方が残ると、同じものが別々に数えられます。 */
  if (/^(s[\.\s]?ride|エスライド|ｴｽﾗｲﾄﾞ|Ｓライド|sライド)$/i.test(t)) return 'S.Ride';
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
  /* ★不明（空っぽ）は、0に変えずに そのまま持ちます。
       0と不明を混ぜると、平均も時間単価も狂うためです。 */
  dep: (r.dep == null ? null : +r.dep), wait: r.wait_min, ride: r.ride_min, fare: r.fare,
  method: r.method || '', note: r.note || '',
  get who(){ return names[this.user_id] || '—'; }
});
/**
 * 表示名から、その人の id を引く。
 *
 * ★記録用スプレッドシートから移すとき、「営」の欄に
 *   ﾀﾞｲｽｹ・ｼｭﾝ のような名前が入っています。
 *   それを、このアプリの人と結びつけるために使います。
 *   半角カナ・全角・空白の違いは気にしません。
 */
/* --nkey-start-- ここから下は gas/test/webname.test.js が取り出して検査します */
const nkey = v => {
  /*
   * ★半角カナを、きちんと全角に直します（2026/11/10 に直しました）。
   *
   *   前は「ﾀﾞｲｽｹ」が「タﾞイスケ」にし必ず、
   *   「ダイスケ」と別の字あつかいでした。
   *   小さい字（ｭ）と長音（ｰ）も直していませんでした。
   *   そのため、スプシから取り込むと
   *   **ほとんどの記録が、取り込んだ人の名義で入って**いました。
   *   売上が人ごとに狂うので、一番重い間違いです。
   */
  let s = String(v == null ? '' : v).replace(/[\s　]/g, '');
  const H  = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｬｭｮｯｰ';
  const Z  = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォャュョッー';
  const DK = 'カキクケコサシスセソタチツテトハヒフヘホウ';
  const DZ = 'ガギグゲゴザジズゼゾダヂヅデドバビブベボヴ';
  const PK = 'ハヒフヘホ';
  const PZ = 'パピプペポ';
  let out = '';
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    const j = H.indexOf(c);
    if (j >= 0) c = Z[j];
    const nx = s[i + 1];
    // ★濁点・半濁点は、前の字とくっつけて1文字にします
    if (nx === 'ﾞ' || nx === '゛' || nx === '\u3099') {
      const k = DK.indexOf(c);
      if (k >= 0) { c = DZ[k]; i++; }
    } else if (nx === 'ﾟ' || nx === '゜' || nx === '\u309A') {
      const k = PK.indexOf(c);
      if (k >= 0) { c = PZ[k]; i++; }
    }
    out += c;
  }
  return out.toLowerCase();
};
/* --nkey-end-- */

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

/* ------------------------------------------------------------
 *  1か月ざんまいの「期」（まーく様のご指示・2026/11/12）
 *
 *  ★16日から、翌月の15日まで を1つの期として数えます。
 *    スプシのレポートと、まったく同じ区切りです。
 *    違う区切りにすると、同じ月なのに数が合わなくなります。
 * ---------------------------------------------------------- */
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());

/** その日が入っている期の、はじまりの日（16日） */
function cycleStart(d){
  return (d.getDate() >= 16) ? new Date(d.getFullYear(), d.getMonth(), 16)
                             : new Date(d.getFullYear(), d.getMonth()-1, 16);
}
/** n期まえの「はじまり〜おわり」 */
function cycleOf(n){
  const [y,m,dd] = today().split('-').map(Number);
  const s = cycleStart(new Date(y, m-1, dd));
  s.setMonth(s.getMonth() - n);
  const e = new Date(s.getFullYear(), s.getMonth()+1, 15);
  return { from: ymd(s), to: ymd(e) };
}
/** えらべる期を、新しい順に。記録のある所までしか出しません */
function cycleList(){
  const ds = records.map(r => r.date).filter(Boolean).sort();
  const oldest = ds[0] || today();
  const out = [];
  for (let n = 0; n < 36; n++) {
    const c = cycleOf(n);
    out.push(c);
    if (c.from <= oldest) break;
  }
  return out;
}
/** いま数えている「いつからいつまで」 */
function periodRange(){
  if (period.mode === 'free') return { from: period.from || '', to: period.to || '' };
  const m = /^c(\d+)$/.exec(period.mode);
  if (m) return cycleOf(Number(m[1]));
  return { from: '', to: '' };
}
/** 画面に出す、期間の言い方 */
function periodLabel(){
  if (period.mode === 'all') return '全期間';
  const r = periodRange();
  if (!r.from && !r.to) return '全期間';
  const a = r.from ? fmtD(r.from) : 'はじめ';
  const b = r.to   ? fmtD(r.to)   : 'いま';
  return a + ' 〜 ' + b;
}

/** えらんだ乗り場（と分け方）に当てはまるか */
function hitPlace(r){
  const q = splitSel(onlyPlace);
  if (q.place && pkey(r.place) !== pkey(q.place)) return false;
  if (q.cat && recCat(r) !== q.cat) return false;
  return true;
}

const inPeriod = r => {
  const p = periodRange();
  if (p.from && r.date < p.from) return false;
  if (p.to   && r.date > p.to)   return false;
  return true;
};
/*
 * ★ここが、ぜんぶの画面のもとになる「数える記録」です。
 *   人・乗り場・期間、3つとも ここで1回だけ絞ります。
 *   画面ごとに別々に絞ると、どこかで必ず取りこぼします。
 */
const visible = () => records.filter(r =>
  (!onlyMine  || r.user_id === ME.user.id) &&
  (!onlyPlace || hitPlace(r)) &&
  (!onlyDay   || dayCls(r.date) === onlyDay) &&
  inPeriod(r));
const canEdit = r => r.user_id === ME.user.id || ME.profile.is_admin;
const sorted  = () => [...visible()].sort((a,b) => a.date === b.date ? b.dep - a.dep : (a.date < b.date ? 1 : -1));
const places  = () => [...new Set(records.map(r => r.place).filter(Boolean))];
const DCOL = ['#F0A33B','#E4573D','#6FD8A8','#7FA9F0','#C98BE0','#E8D06A','#5FBFC4','#EF8FA8'];
const dcol = d => { const ds = [...new Set(visible().map(r => r.date))].sort(); return DCOL[ds.indexOf(d) % DCOL.length]; };

/* ---------- 描画 ---------- */
function render(){
  const rs = visible();
  $('#k1').textContent = rs.length;
  /* ★合計は、すぐ上の見出しの横に大きく出しています。
       ここで同じ数をくり返しても読みどころが増えないので、
       「1日当たり」に替えました（ご指示・2026/11/12で、
       見返すのに一番良い形かを見直したため）。 */
  {
    const sum2 = rs.filter(hasFare).reduce((a,r) => a + (+r.fare || 0), 0);
    const d2 = new Set(rs.map(r => r.date)).size;
    $('#k2').textContent = d2 ? yen(sum2 / d2) : '—';
  }
  const rt = rs.map(rate).filter(v => v > 0);
  $('#k3').textContent = rt.length ? yen(rt.reduce((a,b) => a+b, 0) / rt.length) + '/h' : '—';
  const hb = hourAgg().filter(h => h.n >= 3).sort((a,b) => b.avg - a.avg)[0];
  $('#k4').textContent = hb ? hb.h + '時台' : '—';
  /*
   * ★一番上に「期間」と「合計」。下に小さく「1日当たりではありません」
   *   （まーく様のご指示・2026/11/12）
   *     「上の4つは～みたいなやり方は絶対やめてください、見づらすぎます
   *       1番上に、期間と合計を入れて
   *       下の方に、※1日当たりのデータではありません
   *       のような形にしてください」
   *
   *   ★前は、4つの数の下に長い1文を置いていました。
   *     走りながら読むものなので、1文が長いと ただの壁になります。
   *     「いつの」「いくら」「だれの」を、3つに分けて並べます。
   */
  const ktop = $('#ktop');
  if (ktop) {
    const ds   = rs.map(r => r.date).sort();
    const days = new Set(ds).size;
    const sum  = rs.filter(hasFare).reduce((a2, r) => a2 + (+r.fare || 0), 0);

    /* ① いつの分か */
    const when = (period.mode !== 'all')
      ? periodLabel()
      : (ds.length ? fmtD(ds[0]) + ' 〜 ' + fmtD(ds[ds.length - 1]) : '全期間');

    /* ② だれの・どこの分か */
    const who = [];
    if (onlyPlace) {
      const q = splitSel(onlyPlace);
      who.push((q.cat ? q.cat + '／' : '') + q.place + ' だけ');
    }
    if (onlyDay) who.push((DAY_CHIPS.filter(d => d.k === onlyDay)[0] || {}).n + ' だけ');
    who.push(onlyMine ? '自分だけ' : '全員');
    who.push(ds.length ? ('記録のある日 ' + days + '日・' + rs.length + '件')
                       : '記録なし');

        ktop.classList.toggle('on', filtOn());
    /* 期間は、見出しの下に出します（見出しは「過去の記録」） */
    const kw = $('#ktWhen'); if (kw) kw.textContent = when;
    $('#ktSum').textContent  = yen(sum);
    /* ★ひとかたまりの言葉が、行の途中で切れないようにします。
         「記録のある日 9 ／ 日・10件」のような切れ方をすると、読めません。 */
    $('#ktWho').innerHTML = who.map(x => '<span>' + esc(x) + '</span>').join('');
    /* 乗り場は、どの画面にいても ここで すぐ切り替えられます */
    [$('#ktPlace'), $('#ktPlace2')].forEach(function (kpl) {
      if (!kpl) return;
      kpl.innerHTML = placeOptions();
      kpl.classList.toggle('on', !!onlyPlace);
    });
    const kcl = $('#ktClear');
    if (kcl) kcl.hidden = !onlyPlace;
    /* 上の区切りの「全員／自分だけ」も、いまの形に合わせます */
    document.querySelectorAll('.ktmine [data-mine]').forEach(function (b) {
      b.classList.toggle('on', (b.dataset.mine === '1') === onlyMine);
    });
    /* 期間の切り替えも、ここに出します（ご指示・2026/11/12） */
    const kpb = $('#ktPeriodBox');
    if (kpb) kpb.innerHTML = periodBox();
  }
  const kp = $('#kperiod');
  if (kp) {
    kp.innerHTML = rs.length
      ? '※1日当たりの数字ではありません。上の期間の合計です。'
      : ('※この絞り込みでは、1件もありません。' +
         (filtOn() ? '「絞り込みを解除」を押すと、元に戻ります。' : ''));
  }
  /*
   * ★行灯は、台帳の画面でも回します（まーく様のご指摘・2026/11/10）。
   *     「管理画面だとしっかり動きがありますが、
   *       実際の画面だと全く動きがありません」
   *
   *   前は「記録が1件でもあれば賃走、無ければ空車」と出していました。
   *   けれど、これは**本当の空車・賃走ではありません**。
   *   台帳に記録があるかどうか、というだけのものでした。
   *   守る値打ちがないので、ほかの画面と同じように回します。
   *   （中身は shared.js の andonRoll）
   */
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === tab));
  $('#panes').innerHTML = { in:paneIn, hot:paneHot, heat:paneHeat, tl:paneTl, sc:paneSc,
    rank:paneRank, list:paneList, news:paneNews, ev:paneEv, fb:paneFb }[tab]();
  /* 題の下の一文（前日の万収をほめる） */
  const sb = $('#sub');
  if (sb) sb.textContent = subLine();
  if (tab === 'news') newsSeen();
  /* ★イベントを開いたら、赤い点は消します（ご指摘・2026/11/12
       「イベント、スクロールし終えても、タブにある、赤い丸が消えません」）。
     見たのに点が残ると、いつまでも新しいものがあるように見えます。 */
  if (tab === 'ev') { const d2 = $('#evDot'); if (d2) d2.hidden = true; }
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
  const f = form, pl = myPlaces();
  const chip = (v,cur,fld,suf='') => `<button class="chip ${String(cur)===String(v)?'on':''}" data-set="${fld}" data-val="${v}">${v}${suf}</button>`;
  return `
  <div class="card">
    <!-- ★見出しは「乗車データ」（ご指示・2026/11/12）。
         前は所要時間を出していましたが、消すようご指示をいただきました。 -->
    <h2>新規の記録</h2>
    <p class="note">空の欄は「不明」。平均には数えません。</p>
    <div class="grid">
      <div class="f w2 fdate"><label>営業曜日</label>
        <input type="date" id="f_date" value="${f.date || today()}"></div>
      <div class="f w2"><label>乗車場所</label>
        <input class="ja" id="f_place" list="pls" placeholder="新地7" value="${esc(f.place || '')}">
        <datalist id="pls">${pl.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        ${(() => { const sug = placeAskOk[f.place] ? '' : placeSuggest(f.place);
          return sug ? `<div class="psug">もしかして、<b>${esc(sug)}</b> と同じですか？
            <button class="chip on" data-psug="${esc(sug)}">${esc(sug)} にする</button>
            <button class="chip" data-pkeep="1">このままでよい</button></div>` : ''; })()}
        <div class="chips">${pl.map(p => `<button class="chip ${f.place===p?'on':''}" data-set="place" data-val="${esc(p)}">${esc(p)}</button>`).join('')}</div>
        <!-- ★場所を地図で確かめる（ご指示・2026/11/11） -->
        <div class="chips">
          <a class="chip ${f.place ? '' : 'off'}" id="f_map"
             href="${f.place ? esc(mapUrl(f.place)) : '#'}" target="_blank" rel="noopener">📍 地図で見る</a>
          <button class="chip ${f.place && placeOk(f.place) ? 'on' : ''}" id="f_mapok"
            ${f.place ? '' : 'disabled'}>${f.place && placeOk(f.place) ? '✓ 地図は合っている' : 'この地図で合っている'}</button>
        </div>
      </div>
      <div class="f w2"><label>発車時間</label>
        <input id="f_dep" inputmode="numeric" placeholder="2530" value="${esc(f.dep || '')}">
        <!-- ★時と分を、押すだけで入れられるようにします（ご指示・2026/11/12）。
               走りながら打つので、字を打たせない形にします。 -->
        <div class="chips mins">${DEP_H.map(h =>
          `<button class="chip ${depPart(f.dep).h===h?'on':''}" data-dh="${h}">${h}</button>`).join('')}</div>
        <div class="chips mins">${DEP_M.map(m =>
          `<button class="chip ${depPart(f.dep).m===m?'on':''}" data-dm="${m}">${m}</button>`).join('')}</div>
        <div class="hint" id="depHint"></div></div>
      <div class="f w2"><label>乗車金額</label>
        <input id="f_fare" inputmode="numeric" placeholder="3400" value="${f.fare ?? ''}">
        <!-- ★よく出る金額は、押すだけで入れられるようにします
               （ご指示・2026/11/12）。これより大きい額は、打ち込みます。 -->
        <div class="chips fares">${FARE_CHIPS.map(v => chip(v,f.fare,'fare')).join('')}</div>
        <div class="hint" id="rateHint"></div></div>

      <!-- ★欄の名前は、記録用スプレッドシートと同じ言い方にそろえます
             （ご指示・2026/11/12）。書き方がゆれると、同じものを
             別のものだと思わせてしまいます。
             営業曜日／乗車場所／発車時間／乗車金額／待ち時間／
             乗車種類／そのほか
             （LINEに書く順と同じ・ご指示 2026/11/12） -->
      <div class="f w2"><label>乗車時間</label>
        <input id="f_ride" inputmode="numeric" list="mins" placeholder="20" value="${f.ride ?? ''}">
        <div class="chips mins">${MIN_CHIPS.slice(0,10).map(v => chip(v,f.ride,'ride')).join('')}</div>
        <div class="chips mins">${MIN_CHIPS.slice(10).map(v => chip(v,f.ride,'ride')).join('')}</div></div>
      <datalist id="mins">${MIN_ALL.map(v => `<option value="${v}">`).join('')}</datalist>
      <div class="f w2"><label>待ち時間</label>
        <input id="f_wait" inputmode="numeric" list="mins" placeholder="15" value="${f.wait ?? ''}">
        <div class="chips mins">${MIN_CHIPS.slice(0,10).map(v => chip(v,f.wait,'wait')).join('')}</div>
        <div class="chips mins">${MIN_CHIPS.slice(10).map(v => chip(v,f.wait,'wait')).join('')}</div></div>

      <!-- ★記録用スプレッドシートの「種」と「他」に合わせた欄（2026/10/26 追加） -->
      <div class="f w2"><label>乗車種類</label>
        <input class="ja" id="f_method" list="mts" placeholder="GO" value="${esc(f.method || '')}">
        <datalist id="mts">${METHODS.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
        <div class="chips">${METHOD_CHIPS.map(m => chip(m, f.method, 'method')).join('')}</div>
      </div>
      <div class="f w2"><label>そのほか</label>
        <input class="ja" id="f_note" placeholder="行先：新金岡駅（堺市）" value="${esc(f.note || '')}">
        <div class="chips">${NOTE_CHIPS.map(n => chip(n, f.note, 'note')).join('')}</div></div>
    </div>
    <div class="actions">
      <button class="btn" id="add">${editId ? '書きかえる' : '記録する'}</button>
      ${editId ? `<button class="btn ghost" id="cancel">やめる</button>` : ''}
      ${msgHTML('msg')}
    </div>
  </div>

  <div class="card">
    <h2>直近の記録</h2>
    <!-- ★ここでも乗り場を選べるようにします（ご指示・2026/11/12） -->
    <div class="ktplace">
      <select class="fsel" id="ktPlace2"></select>
    </div>
    <p class="note">${records.length ? '新しい順に10件。全員分が1つの台帳に入ります。' : 'まだ1件も入っていません。'}</p>
    ${filterChips()}
    ${visible().length ? tableHTML(sorted().slice(0,10)) : `<div class="empty">該当データがありません。</div>`}
  </div>`;
}
/* ------------------------------------------------------------
 *  しぼり込みの操作（まーく様のご指示・2026/11/12）
 *    「各乗り場だけをピンポイントで絞る機能」
 *    「1ヶ月おきのレポート機能(期間設定も自由変更可能)」
 *
 *  ★走りながら片手で触るので、**押す回数を増やしません**。
 *    乗り場も期間も、1回タップで選べる形（プルダウン）にします。
 *  ★絞っているときは、赤い「絞り込みを解除」を必ず出します。
 *    絞ったまま忘れると、数字をまるごと読みちがえます。
 * ---------------------------------------------------------- */
/* ------------------------------------------------------------
 *  乗り場の大きな分け方（記録用スプレッドシートのタブと同じ）
 *    関空／ﾊﾞﾗｼ／北7／北4／北他／ﾐﾅﾐ／ほか
 *  （まーく様のご指示・2026/11/12）
 *
 *  ★名前の書き方がゆれていると、同じ所が2つに分かれて、
 *    どちらの数字も当てになりません。
 *    いちど決めた書き方（最初に入れたもの）に、そろえて出します。
 * ---------------------------------------------------------- */
const PLACE_CATS = [
  { k:'北7',   t:/新地\s*7|新地７/ },
  { k:'北4',   t:/新地\s*4|新地４/ },
  { k:'北他',  t:/新地|梅田|キタ|北新地|茶屋町|中之島|堂島|曽根崎|西天満|天満|扇町/ },
  { k:'ﾐﾅﾐ',   t:/難波|なんば|ナンバ|道頓堀|心斎橋|宗右衛門|千日前|日本橋|アメ村|島之内/ },
];
/* 大きな分け方の並び（記録用スプレッドシートのタブと同じ順） */
const CAT_ORDER = ['関空', 'ﾊﾞﾗｼ', '北7', '北4', '北他', 'ﾐﾅﾐ', 'ほか'];

/*
 * ★「関空」と「ﾊﾞﾗｼ」は、乗り場の名前ではなく
 *   「他」の欄に そう書いてあるかどうかで決めます
 *   （まーく様のご指示・2026/11/12
 *     「バラシに入れるのは、lineや、スプシ情報の、他の部分に、
 *       バラシと入っているもののみです
 *       関空も同じく、他の部分に、関空と入っているもののみです」）。
 *   会場の名前で決めると、ただの流しの1本まで バラシに入ってしまいます。
 */
function recCat(r){
  const no = String((r && r.note) || '');
  if (/関空|関西空港/.test(no)) return '関空';
  if (/バラシ|ﾊﾞﾗｼ|ばらし/.test(no)) return 'ﾊﾞﾗｼ';
  const v = String((r && r.place) || '');
  for (let i = 0; i < PLACE_CATS.length; i++) if (PLACE_CATS[i].t.test(v)) return PLACE_CATS[i].k;
  return 'ほか';
}
/* 乗り場の名前だけで決まる分け方（試すとき用） */
function placeCat(p){
  const v = String(p || '');
  for (let i = 0; i < PLACE_CATS.length; i++) if (PLACE_CATS[i].t.test(v)) return PLACE_CATS[i].k;
  return 'ほか';
}
/* えらんだものは「分け方＋乗り場」で覚えます */
const CATSEP = '\u0001';
const splitSel = v => {
  const t = String(v || '');
  const i = t.indexOf(CATSEP);
  return i === -1 ? { cat: '', place: t } : { cat: t.slice(0, i), place: t.slice(i + 1) };
};
function placeCanonMap(){
  const first = {};
  [...records].sort((a,b) => (a.date < b.date ? -1 : 1)).forEach(function (r) {
    if (!r.place) return;
    const k = pkey(r.place);
    if (!first[k]) first[k] = r.place;
  });
  return first;
}
function canonPlace(p){
  const m = placeCanonMap();
  return m[pkey(p)] || String(p || '');
}
/*
 * その人が よく使う乗り場（まーく様のご指示・2026/11/12
 *   「各人にあわせた、これまででの入力が多いもののタブを入れてください」）
 *
 * ★人によって、つける所はまるで違います。
 *   全員ぶんから出すと、自分が使わない所ばかり並びます。
 * ★まだ自分の記録が無い人には、全員ぶんから出します。
 */
function myPlaces(n){
  const max = n || 8;
  const canon = placeCanonMap();
  const mine = {}, all = {};
  records.forEach(function (r) {
    if (!r.place) return;
    const name = canon[pkey(r.place)] || r.place;
    all[name] = (all[name] || 0) + 1;
    if (ME && ME.user && r.user_id === ME.user.id) mine[name] = (mine[name] || 0) + 1;
  });
  const pick = Object.keys(mine).length ? mine : all;
  return Object.keys(pick)
    .sort((a, b) => pick[b] - pick[a] || (a < b ? -1 : 1))
    .slice(0, max);
}

function placeOptions(){
  const canon = placeCanonMap(), n = {};
  records.forEach(function (r) {
    if (!r.place) return;
    const name = canon[pkey(r.place)] || r.place;
    const key = recCat(r) + CATSEP + name;
    n[key] = (n[key] || 0) + 1;
  });
  const sel = String(onlyPlace || '');
  let out = '<option value="">乗り場：すべて</option>';
  CAT_ORDER.forEach(function (g) {
    const list = Object.keys(n).filter(k => splitSel(k).cat === g)
      .sort((a,b) => n[b] - n[a] || (a < b ? -1 : 1));
    if (!list.length) return;
    out += '<optgroup label="' + esc(g) + '">';
    list.forEach(function (k) {
      out += '<option value="' + esc(k) + '"' + (k === sel ? ' selected' : '') + '>' +
             esc(splitSel(k).place) + '（' + n[k] + '件）</option>';
    });
    out += '</optgroup>';
  });
  return out;
}

function periodOptions(){
  const o = ['<option value="all"' + (period.mode === 'all' ? ' selected' : '') +
             '>期間：全期間</option>'];
  cycleList().forEach(function (c, i) {
    const name = i === 0 ? '今期' : (i === 1 ? '前期' : (i + '期まえ'));
    o.push('<option value="c' + i + '"' + (period.mode === 'c' + i ? ' selected' : '') +
           '>' + name + '（' + fmtD(c.from) + '〜' + fmtD(c.to) + '）</option>');
  });
  o.push('<option value="free"' + (period.mode === 'free' ? ' selected' : '') +
         '>自分で決める…</option>');
  return o.join('');
}
/* 営業曜日の区分（ご指示・2026/11/12）。すべて／平日／金・祝前日／土／日・祝 */
const DAY_CHIPS = [{ k:'', n:'全曜日' }, { k:'d-wd', n:'平日' },
  { k:'d-fri', n:'金・祝前日' }, { k:'d-sat', n:'土' }, { k:'d-sun', n:'日・祝' }];

/* 期間の切り替え（上の区切りの中に出します・ご指示・2026/11/12） */
const periodBox = () => `
  <select class="fsel ${period.mode!=='all'?'on':''}" data-filt="period">${periodOptions()}</select>
  ${period.mode === 'free' ? `<div class="filt2 prange">
    <label><span>はじめの日</span>
      <input type="date" data-filt="from" value="${esc(period.from)}"></label>
    <label><span>おわりの日</span>
      <input type="date" data-filt="to" value="${esc(period.to)}"></label>
  </div>` : ''}`;

const filterChips = () => `<div class="filt">
  <div class="chips">
    <button class="chip ${onlyMine?'':'on'}" data-mine="0">全員</button>
    <button class="chip ${onlyMine?'on':''}" data-mine="1">自分だけ</button>
    ${filtOn() ? '<button class="chip warn" id="fClear">絞り込みを解除</button>' : ''}
  </div>
  <!-- ★営業曜日の区分でも、すぐ切り替えられるようにします（ご指示・2026/11/12）。
       平日と土日祝では、売上の出方がまるで違うためです。 -->
  <div class="chips daych">
    ${DAY_CHIPS.map(d => `<button class="chip ${onlyDay===d.k?'on':''}" data-day="${d.k}">${d.n}</button>`).join('')}
  </div>
</div>`;

/** 場所の名前を、地図で開けるようにして返す（押すと新しいタブ） */
function placeLink(p){
  const q = String(p || '');
  if (!q) return '';
  const u = mapUrl(q);
  return '<a class="plink" href="' + esc(u) + '" target="_blank" rel="noopener"' +
         ' title="地図で開く">' + esc(q) + (placeOk(q) ? ' <b class="okmark">✓</b>' : '') + '</a>';
}

/* ------------------------------------------------------------
 *  記録の表（まーく様のご指示・2026/11/12）
 *
 *  ★並びは、記録用スプレッドシートと同じにします。
 *      名 ／ 付 ／ 待 ／ 発 ／ 金 ／ 乗 ／ 種・他 ／ 修正・削除
 *  ★日付は、変わったときだけ 見出しの行で出します。
 *    同じ日が何行も続くと、横幅を食うだけだからです。
 *  ★人ごとに、行の背景色を変えます（スプレッドシートのタブ色と同じ）。
 *  ★金額は、大きさで字の色を変えます（スプレッドシートと同じ）。
 *  ★1つ1つの幅を、できるだけ狭くします。横に動かす回数を減らすためです。
 * ---------------------------------------------------------- */
/** 付け時間（乗せた時刻 − 待ち時間）。どちらかが不明なら不明 */
function tsuke(r){
  if (isUnk(r.dep) || isUnk(r.wait)) return null;
  const v = (+r.dep) - (+r.wait) / 60;
  return v < 0 ? v + 24 : v;
}
function tableHTML(rows){
  let last = '';
  const body = rows.map(function (r) {
    let head = '';
    if (r.date !== last) {
      last = r.date;
      head = '<tr class="dhead ' + dayCls(r.date) + '"><td colspan="8">' +
             esc(fmtD(r.date)) + '　<small>' + esc(dayName(r.date)) + '</small></td></tr>';
    }
    return head + '<tr class="' + whoCls(r.user_id) + '">' +
      '<td class="c-who">' + esc(kana(r.who)) + '</td>' +
      '<td class="n">' + showT(tsuke(r)) + '</td>' +
      '<td class="n ' + waitCls(r.wait) + '">' + (isUnk(r.wait) ? UNK : r.wait) + '</td>' +
      '<td class="n">' + showT(r.dep) + '</td>' +
      '<td class="n ' + fareCls(r.fare) + '">' + showYen(r.fare) + '</td>' +
      '<td class="c-place">' + (r.place ? placeLink(canonPlace(r.place)) : UNK) + '</td>' +
      /* ★種と他は、1つの欄にまとめます（ご指示・2026/11/12「種・他」） */
      '<td class="ja c-note">' +
        (r.method ? '<span class="mtag ' + mcls(r.method) + '">' + esc(r.method) + '</span> ' : '') +
        esc(r.note || '') + '</td>' +
      /* ★修正・削除は、表の右端に置きます（ご指示・2026/11/12） */
      '<td class="ops">' + (canEdit(r)
        ? '<button class="mini" data-edit="' + r.id + '">修正</button>' +
          '<button class="mini del" data-del="' + r.id + '">削除</button>' : '') + '</td></tr>';
  }).join('');
  return '<div class="snote">← 横にスクロールできます（乗り場・種・他・修正／削除は右側です）</div>' +
    '<div class="scroll tbl"><table><thead><tr>' +
    '<th>名</th><th class="n">付</th><th class="n">待</th>' +
    '<th class="n">発</th><th class="n">金</th><th>乗</th><th>種・他</th>' +
    '<th class="ops">修正<br>削除</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table></div>';
}

/* ★名前は半角カタカナで短く出します（スプレッドシートのタブと同じ形） */
const KANA_SHORT = { 'ダイスケ':'ﾀﾞｲｽｹ', 'だいすけ':'ﾀﾞｲｽｹ', '齊藤':'ﾀﾞｲｽｹ', '齋藤':'ﾀﾞｲｽｹ',
  'シュン':'ｼｭﾝ', 'しゅん':'ｼｭﾝ', '山敷':'ｼｭﾝ',
  'カイト':'ｶｲﾄ', 'かいと':'ｶｲﾄ', '海斗':'ｶｲﾄ', '山脇':'ｶｲﾄ',
  'アナル':'ｱﾅﾙ', '城越':'ｱﾅﾙ',
  'マーク':'ﾏｰｸ', 'まーく':'ﾏｰｸ', 'ポンコツ':'ﾏｰｸ',
  'ジン':'ｼﾞﾝ', 'じん':'ｼﾞﾝ', 'ジンキチ':'ｼﾞﾝ', '宮下':'ｼﾞﾝ' };
function kana(v){
  const t = String(v == null ? '' : v).trim();
  if (KANA_SHORT[t]) return KANA_SHORT[t];
  for (const k in KANA_SHORT) if (t.indexOf(k) !== -1) return KANA_SHORT[k];
  return t.length > 4 ? t.slice(0, 4) : t;
}

/* ------------------------------------------------------------
 *  題の下の一文（まーく様のご指示・2026/11/12）
 *
 *    「昨日(日付、曜日)の完全万収ライナーは〝○○くん〟です！」
 *    前日に1万円以上の乗車があった人を、ほめたたえます。
 *    万収が無かった日は、これまでどおりの一文にします
 *    （ただし「キラ」→「ベルトルト」）。
 *
 *  ★スマホで1行に収めます。折り返すと、題の位置が下がって
 *    まわりがずれます（これまでに何度も起きています）。
 * ---------------------------------------------------------- */
const KUN = { 'ダイスケ':'齋藤くん', 'だいすけ':'齋藤くん', '齊藤':'齋藤くん', '齋藤':'齋藤くん',
  'シュン':'山敷くん', 'しゅん':'山敷くん', '山敷':'山敷くん',
  'カイト':'山脇くん', 'かいと':'山脇くん', '海斗':'山脇くん', '山脇':'山脇くん',
  'アナル':'城越くん', '城越':'城越くん',
  'ジン':'宮下くん', 'じん':'宮下くん', '宮下':'宮下くん',
  'マーク':'加藤くん', 'まーく':'加藤くん', 'ポンコツ':'加藤くん' };
function kunName(uid){
  const n = String(names[uid] || '').trim();
  if (KUN[n]) return KUN[n];
  for (const k in KUN) if (n.indexOf(k) !== -1) return KUN[k];
  return '';
}
/** 万収（1万円以上）＝ ほめる相手 */
const MANSHU = 10000;
function subLine(){
  try {
    const y = prevYmd(today());
    const win = [];
    records.forEach(function (r) {
      if (r.date !== y || isUnk(r.fare) || +r.fare < MANSHU) return;
      const k = kunName(r.user_id);
      if (k && win.indexOf(k) === -1) win.push(k);
    });
    if (win.length) {
      return '昨日（' + fmtD(y) + '）の完全万収ライナーは〝' +
             win.join('〟〝') + '〟です！';
    }
  } catch (e) {}
  return '近日中、誰かがワンメータを乗せたら、〝' + kiraToday() + '〟がベルトルトです';
}

/* ★人ごとの色（記録用スプレッドシートのタブ色と同じ考え方・ご指示 2026/11/12） */
function whoCls(uid){
  const n = String(names[uid] || '').trim();
  if (/ダイスケ|だいすけ|齊藤|齋藤|大介/.test(n)) return 'w-dai';
  if (/シュン|しゅん|山敷/.test(n))               return 'w-shun';
  if (/カイト|かいと|海斗|山脇/.test(n))           return 'w-kaito';
  if (/アナル|城越/.test(n))                      return 'w-ana';
  if (/ジン|じん|宮下/.test(n))                   return 'w-jin';
  if (/マーク|まーく|ポンコツ/.test(n))            return 'w-mark';
  return '';
}

/* ★待ち時間の色（記録用スプレッドシートと同じ分け方・ご指示 2026/11/12）
     10分以内 … 薄い青（すぐ乗れた）
     30分以内 … 薄い灰
     それより長い … そのままの白 */
function waitCls(v){
  if (isUnk(v)) return '';
  const n = +v;
  if (n <= 10) return 'wt1';
  if (n <= 30) return 'wt2';
  return '';
}

/* ★金額の色（記録用スプレッドシートと同じ分け方・ご指示 2026/11/12） */
function fareCls(v){
  if (isUnk(v)) return '';
  const n = +v;
  if (n < 1000)  return 'f1';     /* 999円以下 … グレー */
  if (n < 5000)  return 'f2';     /* 1000〜4999 … 白 */
  if (n < 10000) return 'f3';     /* 5000〜9999 … 青 */
  if (n < 20000) return 'f4';     /* 10000〜19999 … 黄 */
  return 'f5';                    /* 20000〜 … 赤 */
}

/* ---- つけ待ち一覧（時間帯 × つけ待ち場所の表）----
 *  ★名前を「アツい」でそろえました（まーく様のご指示・2026/11/10）。
 *      「熱いところがアツじゃなくて、表記ゆれになってます」
 *      「アツい時間帯、アツいで表記は必ず統一して下さい」
 *  ★これは、人の多さを買ってくるもの（人口マップ）ではありません。
 *    **自分たちの記録だけ**から作っている地図です。 */
function paneHeat(noChips){
  /* 時刻が不明なものは、時間帯の地図には出せません（どこに置けないため） */
  const R = visible().filter(hasDep);
  if (!R.length) return emptyCard('場所と時間帯がそろうと、ここが「どこが濃いか」の表になります。');
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
  s += row('すべて', null, 34+pls.length*ch+2) + '</svg>';
  return `<div class="card"><h2>つけ待ち一覧</h2>
    <p class="note"><b>全期間の記録を、時間帯・乗り場ごとに並べた表</b>です。
      いつでも同じものが出ます（「今の狙い目」は、いまの時刻だけの話）。<br>
      数字は平均の時間単価（k＝千円/時）。濃いマスほど、待ち時間まで込みで割のいい枠。まずは3件以上たまったマスだけ信じる。</p>
    ${noChips ? '' : filterChips()}<div class="scroll">${s}</div>
    <div class="legend"><span><i style="background:rgba(240,163,59,.15)"></i>薄い＝単価が低い</span>
    <span><i style="background:rgba(240,163,59,.92)"></i>濃い＝単価が高い</span><span>最大 ${yen(mx)}/h</span></div></div>`;
}

/* =============================================================
 *  いまアツい（ここから）
 *
 *  ★まーく様のご指示（2026/10/27）
 *    「大阪タクシー狙い目エリアで リアルタイムでの人の集中してる
 *      ところを割り出して 今はここがアツいポイントを、
 *      手軽にわかりやすく可視化できるようにしてください」
 *
 *  ★ここに出るのは「いま何人いるか」ではありません。
 *    自分たちの記録から出した
 *    「この曜日・この時間に、強かった場所」です。
 *    この2つを混ぜると、数字が嘘になります
 *    （CLAUDE.md「数字を出すときの決まり」）。だから言葉を分けます。
 *
 *  ★お金のかからないものだけで組んでいます。
 *    ・自分たちの乗車記録（Supabase・無料のまま）
 *    ・気象庁の天気（無料・登録なし・そのまま読める）
 *    どちらが読めなくても、残りはそのまま出ます。
 * ============================================================= */

/** これ未満の件数は「平均」と呼ばない（1件は、たまたまの1本） */
const HOT_MIN_N = 3;
/** いまの時刻から、前後どれだけを「いま」とみなすか（時間） */
const HOT_WIN = 1;

/**
 * その夜が、どの種類の夜か。
 *   金土 … 週末の夜（終電後の動きがまるで違う）
 *   日   … 日曜の夜
 *   平日 … それ以外
 * ★営業日（夜のはじまりの日）で見ます。
 */
function dayKind(dateStr){
  const p = String(dateStr || '').split('-').map(Number);
  if (p.length < 3 || !p[0]) return '平日';
  const w = new Date(p[0], p[1] - 1, p[2]).getDay();
  if (w === 5 || w === 6) return '金土';
  if (w === 0) return '日';
  return '平日';
}

/** 夜の見当を出しはじめる時刻（17:00に出庫して、着くのが17:20〜17:40） */
const HOT_FROM = 18;

/**
 * いまが、どの夜の何時か。
 *   h     … 記録と同じ数え方（0〜6時は 24時以降）
 *   ah    … 見当を引くときに使う時刻
 *   early … まだ乗務の時間ではない（昼・朝）
 *   clock … 画面に出す、普通の時計の字
 *
 * ★昼や朝に開いたときに「記録が足りません」だけが出ると、
 *   見ても何の役にも立ちません。
 *   その時間は、きょうの夜（18時台）の見当にそろえて出します。
 */
function hotNow(now){
  const d = now || new Date();
  let h = d.getHours() + d.getMinutes() / 60;
  /* ★0時〜6時は、その夜の続き（24時以降）。入れるときと同じ数え方です */
  if (h <= 6) h += 24;
  // 営業日は、朝6時までは前の日
  const b = new Date(d.getTime());
  b.setHours(b.getHours() - 6);
  const date = b.getFullYear() + '-' + pad(b.getMonth() + 1) + '-' + pad(b.getDate());
  const early = (h < HOT_FROM) || (h >= 30);      // 昼〜夕方、または朝6時すぎ
  return { h: h, ah: early ? HOT_FROM : h, early: early,
           clock: pad(d.getHours()) + ':' + pad(d.getMinutes()),
           date: date, kind: dayKind(date), wd: WD[d.getDay()] };
}

/**
 * 時計は回るので、23時と翌1時は「2時間違い」。
 * 引き算だけだと 22時間違いになってしまうので、短いほうを取ります。
 */
function hotDist(a, b){
  let d = Math.abs(a - b);
  if (d > 12) d = 24 - d;
  return d;
}

/** 場所ごとにまとめる。返すのは割のいい順 */
function hotGroup(rs){
  const m = {};
  rs.forEach(function (r){
    const p = (r.place || '').trim();
    if (!p) return;
    (m[p] = m[p] || []).push(r);
  });
  return Object.keys(m).map(function (p){
    const a = m[p];
    const rt = a.map(rate).filter(function (v){ return v > 0; });
    return { p: p, n: a.length,
      avg:  rt.length ? rt.reduce(function (x,y){ return x+y; }, 0) / rt.length : 0,
      fare: a.reduce(function (x,r){ return x + (+r.fare || 0); }, 0) / a.length,
      wait: a.reduce(function (x,r){ return x + (+r.wait || 0); }, 0) / a.length };
  }).sort(function (x,y){ return y.avg - x.avg; });
}

/**
 * 「いま」に近い記録だけを拾って、場所ごとにまとめる。
 *   win      … 前後何時間までを「いま」とみなすか
 *   sameKind … 同じ種類の夜（金土／日／平日）だけに絞るか
 */
function hotPick(c, win, sameKind, rows){
  const R = (rows || visible()).filter(function (r){
    if (!r.place) return false;
    if (sameKind && dayKind(r.date) !== c.kind) return false;
    if (isUnk(r.dep)) return false;      // 時刻が不明なものは、見当に使えない
    return hotDist(+r.dep, c.h) <= win;
  });
  return hotGroup(R);
}

/**
 * 出せるものを探す。きびしい条件から順に ゆるめていきます。
 * 返すのは { rows, basis, loose }
 *   rows  … 件数が足りている場所（信じていい並び）
 *   thin  … 件数が足りない場所（参考まで）
 *   basis … 何を根拠にしたかの一言。これを必ず画面に出します
 */
function hotBest(c, rows){
  const plan = [
    { win: HOT_WIN,     kind: true,  basis: c.kind + 'の夜・' + Math.floor(c.h % 24) + '時台の記録' },
    { win: HOT_WIN + 1, kind: true,  basis: c.kind + 'の夜・前後2時間の記録' },
    { win: HOT_WIN + 1, kind: false, basis: '曜日を問わず・前後2時間の記録' }
  ];
  let last = { rows: [], thin: [], basis: plan[0].basis, loose: true };
  for (let i = 0; i < plan.length; i++) {
    const g = hotPick(c, plan[i].win, plan[i].kind, rows);
    const okRows = g.filter(function (x){ return x.n >= HOT_MIN_N; });
    const thin   = g.filter(function (x){ return x.n <  HOT_MIN_N; });
    last = { rows: okRows, thin: thin, basis: plan[i].basis, loose: i > 0 };
    if (okRows.length) return last;
  }
  return last;
}

/** 夜の終わり（翌4時）。記録と同じ数え方です */
const HOT_TO = 28;

/**
 * いまから「翌4時」までの、1時間ごとの一番強かった場所。
 * ★3時間だけでは、夜のうしろ半分が見えません（ご指示・2026/11/12）。
 *   横に流して見る形にして、4時台まで出します。
 */
function hotPlan(c, rows){
  const out = [];
  const s = Math.floor(c.h);
  const n = Math.max(1, HOT_TO - s + 1);
  for (let k = 0; k < n; k++) {
    const cc = { h: s + k, date: c.date, kind: c.kind };
    const g = hotPick(cc, HOT_WIN, true, rows).filter(function (x){ return x.n >= HOT_MIN_N; });
    out.push({ h: Math.floor((s + k) % 24), top: g[0] || null });
  }
  return out;
}

/**
 * 近ごろの記録だけを拾う（ご指示・2026/11/12）。
 *   ・この1か月（45日前まで）
 *   ・去年の同じ月
 * ★月が変われば、人の出方も変わります。
 *   1年ぶんを平らにならすと、いまの夜には当てはまりません。
 * ★足りなければ、呼んだ側で全期間に広げます（広げたことは画面に書きます）。
 */
function hotSeason(now){
  const d = now || new Date();
  const a0 = d.getTime() - 45 * 864e5;
  const ly = (d.getFullYear() - 1) + '-' + pad(d.getMonth() + 1);
  return visible().filter(function (r){
    const v = String(r.date || '');
    if (v.indexOf(ly) === 0) return true;
    const t = new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)).getTime();
    return !isNaN(t) && t >= a0;
  });
}

/**
 * 天気の読み取り（気象庁の公開データ）。
 * ★読めなかったときは、黙って消えるのではなく「取れなかった」と出します。
 */
function wxRead(j, now){
  try {
    const t0 = j[0].timeSeries[0].areas[0];
    const text = String(t0.weathers[0] || '').replace(/　+/g, ' ').trim();
    /*
     * ★どこの天気かを、必ず持ち歩きます（まーく様のご指摘・2026/11/10）。
     *     「降水確率とかは、どこを指してるのですか？
     *       具体的な場所が無いと分からないですし」
     *   気象庁が出しているのは「大阪府」一まとまりの予報で、
     *   市ごとの細かい差は、そもそも出ていません。
     *   それを書かずに数字だけ出すのは、不親切でした。
     */
    const area = (t0.area && t0.area.name) ? String(t0.area.name) : '大阪府';
    let pop = null, span = '';
    // ★降水確率は、timeSeries[1] の areas[0].pops に入っています
    //   （areas をはさむのを忘れると、いつまでも取れません）
    const ps = j[0].timeSeries[1];
    const pa = ps && ps.areas && ps.areas[0];
    if (pa && pa.pops && ps.timeDefines) {
      const nowMs = (now || new Date()).getTime();
      let at = -1;
      for (let i = ps.timeDefines.length - 1; i >= 0; i--) {
        if (new Date(ps.timeDefines[i]).getTime() <= nowMs) { at = i; break; }
      }
      if (at < 0) at = 0;
      pop = +pa.pops[at];
      if (isNaN(pop)) pop = null;
      /*
       * ★「いつの確率か」も書きます。
       *   気象庁の降水確率は6時間ごとです（0〜6／6〜12／12〜18／18〜24）。
       *   いま入っている枠を、そのまま書き出します。
       */
      const h = new Date(ps.timeDefines[at]).getHours();
      span = h + '〜' + ((h + 6) % 24 === 0 ? 24 : (h + 6)) + '時';
    }
    /*
     * ★このあと崩れる時刻も出します（まーく様のご指示・2026/11/10）。
     *     「この後に雨や台風など、天気が悪くなる予想時間も
     *       載せてもらえるととても便利だと思います」
     *   気象庁の降水確率は6時間ごとなので、
     *   これから先の枠をならべ、はじめて50%以上になる枠を知らせます。
     *   ★「何時何分から降る」は、気象庁からも出ていません。
     *     出せないものを出すと、空振りのもとになります。
     */
    const next = [];
    if (pa && pa.pops && ps.timeDefines) {
      const nowMs2 = (now || new Date()).getTime();
      for (let i = 0; i < ps.timeDefines.length; i++) {
        const st = new Date(ps.timeDefines[i]);
        if (st.getTime() + 6 * 3600000 <= nowMs2) continue;   // もう終わった枠
        const v = +pa.pops[i];
        if (isNaN(v)) continue;
        const h = st.getHours();
        const tomorrow = st.getDate() !== new Date(nowMs2).getDate();
        next.push({ h: h, pop: v,
          label: (tomorrow ? 'あす ' : '') + h + '〜' + ((h + 6) % 24 === 0 ? 24 : (h + 6)) + '時' });
        if (next.length >= 4) break;
      }
    }
    const worse = next.filter(function (x) { return x.pop >= 50; })[0] || null;
    const rain = /雨|雷|雪|みぞれ/.test(text) || (pop !== null && pop >= 50);
    /*
     * ★最高・最低の気温も取ります（ご指示・2026/11/12）。
     *   気象庁は、その日の分が終わると out してしまい、
     *   夕方には「あす」の分しか残りません。
     *   だから「本日」か「あす」かを、必ず一緒に持ち歩きます。
     *   黙って あすの気温を「本日」として出すのは、嘘になります。
     */
    let tmax = null, tmin = null, tday = '';
    const tsx = j[0].timeSeries[2];
    const ta  = tsx && tsx.areas && tsx.areas[0];
    if (ta && ta.temps && tsx.timeDefines) {
      const d0 = now || new Date();
      const td = d0.getFullYear() + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate());
      const vs = [];
      for (let i = 0; i < tsx.timeDefines.length; i++) {
        const v = +ta.temps[i];
        if (isNaN(v) || ta.temps[i] === '') continue;
        vs.push({ day: String(tsx.timeDefines[i]).slice(0, 10), v: v });
      }
      let pick = vs.filter(function (x){ return x.day === td; });
      tday = '本日';
      if (!pick.length) { pick = vs; tday = 'あす'; }
      if (pick.length) {
        const nums = pick.map(function (x){ return x.v; });
        tmax = Math.max.apply(null, nums);
        tmin = (nums.length > 1) ? Math.min.apply(null, nums) : null;
      }
    }
    return { ok: true, text: text, pop: pop, rain: rain, area: area, span: span,
             next: next, worse: worse, tmax: tmax, tmin: tmin, tday: tday };
  } catch (e) {
    return { ok: false };
  }
}

/** 天気のひとこと（短く。長い説明は読まれません） */
function wxLine(wx){
  if (!wx) return '天気を読んでいます…';
  if (!wx.ok) return '天気は取れませんでした（気象庁）。ほかはそのまま使えます。';
  /*
   * ★「どこの」「いつの」を必ず付けます（ご指摘・2026/11/10）。
   *   数字だけ出すと、どこの話か分からず、当てにできません。
   */
  const where = wx.area ? (wx.area + '／') : '';
  const p = (wx.pop === null || wx.pop === undefined)
    ? '' : '（' + where + (wx.span ? wx.span + 'の' : '') + '降水 ' + wx.pop + '%）';
  return (wx.rain ? '☔ ' : '　') + wx.text + p +
         (wx.rain ? '　→ 雨です。ふだんより人が乗ります。乗り場・ビル前が強くなります。'
                  : '　→ 雨の見込みは薄いです。足で稼ぐ日になります。');
}

/** 場所の名前で地図をさがす（番地まで当てないので「さがす」と書きます） */
function hotMap(place){
  return 'https://www.google.com/maps/search/?api=1&query=' +
         encodeURIComponent('大阪 ' + String(place || ''));
}

/* ---- 画面 ---- */

/** 天気の記号と呼び名（Open-Meteo の番号から） */
function wcIcon(c){
  const n = +c;
  if (n === 0) return { e: '☀️', n: '快晴' };
  if (n === 1) return { e: '🌤', n: '晴れ' };
  if (n === 2) return { e: '⛅', n: '晴れ時々くもり' };
  if (n === 3) return { e: '☁️', n: 'くもり' };
  if (n === 45 || n === 48) return { e: '🌫', n: '霧' };
  if (n >= 51 && n <= 57) return { e: '🌦', n: '霧雨' };
  if (n >= 61 && n <= 67) return { e: '🌧', n: '雨' };
  if (n >= 71 && n <= 77) return { e: '🌨', n: '雪' };
  if (n >= 80 && n <= 82) return { e: '🌦', n: 'にわか雨' };
  if (n >= 85 && n <= 86) return { e: '🌨', n: 'にわか雪' };
  if (n >= 95) return { e: '⛈', n: '雷雨' };
  return { e: '🌡', n: '不明' };
}

/** 気象庁の日本語の天気から、記号をえらぶ（Open-Meteo が読めないとき用） */
function jpIcon(t){
  const v = String(t || '');
  if (/雷/.test(v)) return '⛈';
  if (/雪|みぞれ/.test(v)) return '🌨';
  if (/雨/.test(v)) return '🌧';
  if (/くもり|曇/.test(v)) return /晴/.test(v) ? '⛅' : '☁️';
  if (/晴/.test(v)) return '☀️';
  return '🌡';
}

/** 気温の字。取れないときは「—」（0度と不明は、別ものです） */
function tmp(v){ return (v === null || v === undefined || isNaN(v)) ? '—' : (Math.round(v) + '°'); }

/**
 * 1時間ごとの天気を読む（Open-Meteo・無料・鍵なし・課金の設定なし）。
 * ★気象庁は6時間ごとまでしか出していないので、
 *   乗務の時間を1時間ごとに見るには足りませんでした。
 * ★読めなくても止まりません。気象庁の予報に落とします。
 */
function omRead(j, now){
  try {
    const d  = now || new Date();
    const hy = j.hourly || {};
    const ts = hy.time || [];
    /* ★中身が無いときは「読めなかった」と返します。
         空っぽのまま出すと、気象庁ぶんにも落ちません。 */
    if (!ts.length) throw new Error('中身なし');
    const nowH = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
    /* 営業日（朝6時までは前の日の夜） */
    const biz  = (d.getHours() < 6) ? new Date(d.getTime() - 864e5) : d;
    const from = Math.max(nowH, new Date(biz.getFullYear(), biz.getMonth(), biz.getDate(), 17).getTime());
    const end  = new Date(biz.getFullYear(), biz.getMonth(), biz.getDate() + 1, 4).getTime();
    const hours = [];
    for (let i = 0; i < ts.length; i++) {
      const q = String(ts[i]).split(/[-T:]/).map(Number);
      const t = new Date(q[0], q[1] - 1, q[2], q[3]).getTime();
      if (t < from || t > end) continue;
      const ic = wcIcon(hy.weather_code ? hy.weather_code[i] : 0);
      const pp = hy.precipitation_probability ? hy.precipitation_probability[i] : null;
      hours.push({ h: q[3], icon: ic.e, name: ic.n,
                   temp: hy.temperature_2m ? hy.temperature_2m[i] : null,
                   pop: (pp === null || pp === undefined) ? null : Math.round(pp),
                   now: t === nowH });
      if (hours.length >= 14) break;
    }
    const cur = j.current || {};
    const ci  = wcIcon(cur.weather_code);
    const dl  = j.daily || {};
    const h0  = hours[0] || null;
    return { ok: true, icon: ci.e, name: ci.n, temp: cur.temperature_2m,
             max: (dl.temperature_2m_max || [])[0], min: (dl.temperature_2m_min || [])[0],
             pop: h0 ? h0.pop : null, span: h0 ? (h0.h + '時台') : '',
             rain: /雨|雪|雷/.test(ci.n) || (h0 && h0.pop !== null && h0.pop >= 50),
             hours: hours };
  } catch (e) { return { ok: false }; }
}

/**
 * いまの天気（一番上。天気アプリと同じ並べ方）。
 * ★読み先を3つ持ち、取れたものだけで組み立てます。
 *   1つ落ちても、残りはそのまま出ます（全部が消えない形）。
 *   ・いまの気温 … 気象庁アメダス（大阪）
 *   ・最高／最低 … Open-Meteo、だめなら気象庁（その場合は「あす」と書く）
 *   ・天気と降水 … 気象庁の予報、だめなら Open-Meteo
 */
function wxNowHTML(){
  const o = (hotOm && hotOm.ok) ? hotOm : null;
  const w = (hotWx && hotWx.ok) ? hotWx : null;
  const a = (hotAmd && hotAmd.ok) ? hotAmd : null;
  if (!o && !w && !a) {
    return '<div class="wx">' + esc(wxLine(hotWx)) + '</div>' + radarBtn();
  }
  const icon = o ? o.icon : jpIcon(w && w.text);
  const name = w ? w.text : (o ? o.name : '天気は取れませんでした');
  const temp = a ? a.temp : (o ? o.temp : null);
  const tday = o ? '本日' : (w && w.tday ? w.tday : '');
  const tmax = o ? o.max : (w ? w.tmax : null);
  const tmin = o ? o.min : (w ? w.tmin : null);
  const pop  = w && w.pop !== null && w.pop !== undefined ? w.pop : (o ? o.pop : null);
  const span = w && w.span ? w.span : (o ? o.span : '');
  const rain = w ? w.rain : (o ? o.rain : false);
  return '<div class="wxnow">' +
    '<div class="wxic">' + icon + '</div>' +
    '<div class="wxmain"><b>' + tmp(temp) + '</b><span>' + esc(name) + '</span></div>' +
    '<div class="wxside">' +
      '<div>' + esc(tday) + ' 最高 <b class="hi">' + tmp(tmax) + '</b>' +
      '　最低 <b class="lo">' + tmp(tmin) + '</b></div>' +
      '<div>降水 <b>' + (pop === null || pop === undefined ? '—' : pop + '%') + '</b>' +
      (span ? '（' + esc(span) + '）' : '') + '</div>' +
    '</div></div>' +
    '<div class="wxtip">' + (rain ? '☔ 雨です。乗り場とビルの前が強くなります。'
                                  : '傘は要りません。足で稼ぐ夜になります。') + '</div>' +
    radarBtn();
}

/** 営業時間（17時〜翌4時）の、1時間ごとの天気。横に流して見ます */
function wxHoursHTML(){
  const o = hotOm;
  if (!o || !o.ok || !o.hours.length) return wxNextHTML(hotWx);
  const cells = o.hours.map(function (x){
    const pop = (x.pop === null) ? '—' : (x.pop + '%');
    return '<div class="wxh' + (x.now ? ' now' : '') + '">' +
      '<small>' + x.h + '時</small>' +
      '<div class="wi">' + x.icon + '</div>' +
      '<b>' + tmp(x.temp) + '</b>' +
      '<span class="' + (x.pop !== null && x.pop >= 50 ? 'rain' : '') + '">' + pop + '</span>' +
      '</div>';
  }).join('');
  return '<div class="scroll fb"><div class="wxhs">' + cells + '</div></div>' +
         '<p class="note">翌4時まで。横にスクロールできます。</p>';
}

function paneHot(now){
  // ★now は、検査のときだけ渡します（ふだんは「いま」）
  const c = hotNow(now);
  // ★見当を引くときは ah（乗務の時間でなければ18時台）を使います
  const cc = { h: c.ah, date: c.date, kind: c.kind };

  /* ★まず「この1か月＋去年の同じ月」の記録で見ます（ご指示・2026/11/12）。
       足りなければ全期間に広げ、広げたことを画面に書きます。 */
  const sel = hotSeason(now);
  let got = hotBest(cc, sel), near = true;
  if (!got.rows.length) { got = hotBest(cc); near = false; }
  const plan = hotPlan(cc, near ? sel : null);
  const mx = Math.max.apply(null, got.rows.map(function (x){ return x.avg; }).concat([1]));
  const when = near ? 'この1か月＋去年の同じ月' : '全期間';

  /* ① 一番上 … いまの天気と、営業時間ぶんの移り変わり */
  const head = '<div class="card"><h2>今の狙い目</h2>' +
    '<p class="note">いまの時刻に合わせて、いま行くとよい所です。' +
    '全期間の表は【つけ待ち一覧】のほうです。</p>' +
    wxNowHTML() + wxHoursHTML() + '</div>';

  /* ② いまの時刻と、その時刻の狙い目 */
  const clock = '<div class="card"><h2>' + esc(fmtD(c.date)) + ' ' + esc(c.clock) +
    '<span class="nowk">' + esc(c.kind) + 'の夜</span></h2>' +
    '<p class="note">' +
    (c.early ? 'まだ乗務の時間ではないので、' + HOT_FROM + '時台の見当です。' : '') +
    '自分たちの記録からの傾向です。いま何人いるかを測っているのではありません。</p>' +
    filterChips();

  if (!got.rows.length) {
    return head + clock +
      '<div class="empty">この時間の記録が、まだ ' + HOT_MIN_N + '件 たまっていません。<br>' +
      '1件は、たまたまの1本なので、出しません。</div>' +
      (got.thin.length ? '<div class="note" style="margin:0">参考（件数が足りません）：' +
        got.thin.slice(0, 5).map(function (x){ return esc(x.p) + ' ' + x.n + '件'; }).join('・') + '</div>' : '') +
      '</div>' + hotPlanCard(plan, c.early) + hotNoteCard(got);
  }

  /* ★カードごと押すと、地図が開きます（ご指示・2026/11/12） */
  const cards = got.rows.slice(0, 3).map(function (x, i){
    return '<a class="hotc' + (i === 0 ? ' top' : '') + '" href="' + hotMap(x.p) +
      '" target="_blank" rel="noopener">' +
      '<small>' + (i + 1) + '位' + (i === 0 ? '　一番濃い' : '') + '</small>' +
      '<b>' + esc(x.p) + '</b>' +
      '<div class="hv">' + yen(x.avg) + '/h</div>' +
      '<div class="hs">' + x.n + '件・平均 ' + yen(x.fare) + '・待ち ' + Math.round(x.wait) + '分</div>' +
      '<span class="mini">地図でさがす</span></a>';
  }).join('');

  const bars = got.rows.slice(0, 8).map(function (x){
    return '<tr><td><a class="plink" href="' + hotMap(x.p) + '" target="_blank" rel="noopener">' +
      esc(x.p) + '</a></td><td class="n">' + x.n + '</td>' +
      '<td class="n" style="color:var(--meter)">' + yen(x.avg) + '</td>' +
      '<td><div class="bar" style="width:' + Math.max(3, x.avg / mx * 100) + '%"></div></td>' +
      '<td class="n">' + Math.round(x.wait) + '分</td></tr>';
  }).join('');

  return head + clock +
    '<div class="hot">' + cards + '</div>' +
    '<div class="note" style="margin:12px 0 0">根拠：' + esc(got.basis) + '（' + esc(when) + '）' +
    (got.loose ? '／この時間ぴったりの記録が足りないので、少し広げました' : '') + '</div>' +
    '</div>' +
    hotPlanCard(plan, c.early) +
    '<div class="card"><h2>この時間に強い場所</h2>' +
    '<div class="scroll"><table><thead><tr><th>場所</th><th class="n">件</th>' +
    '<th class="n">時間単価</th><th style="width:34%"></th><th class="n">待ち</th>' +
    '</tr></thead><tbody>' + bars + '</tbody></table></div></div>' +
    hotNoteCard(got);
}

/** 翌4時までの見当（横に流して見ます） */
function hotPlanCard(plan, early){
  return '<div class="card"><h2>翌4時までの予想</h2>' +
    '<p class="note">1時間ごとの、一番強かった場所です。押すと地図が開きます。' +
    '空いている時間は、記録がまだ足りません。</p>' +
    '<div class="scroll fb"><div class="plan">' + plan.map(function (s, i){
      const head = '<small>' + (i === 0 && !early ? 'いま' : s.h + '時台') + '</small>';
      if (!s.top) return '<div class="pl">' + head + '<b class="thin">—</b><span>記録が足りない</span></div>';
      return '<a class="pl" href="' + hotMap(s.top.p) + '" target="_blank" rel="noopener">' + head +
        '<b>' + esc(s.top.p) + '</b><span>' + yen(s.top.avg) + '/h・' + s.top.n + '件</span></a>';
    }).join('') + '</div></div></div>';
}

/** 注意書き（短く。長い説明は読まれません） */
function hotNoteCard(got){
  return '<div class="card"><h2>読むときの注意</h2>' +
    '<p class="note" style="margin:0">' +
    '・' + HOT_MIN_N + '件より少ない場所は出しません（1件は、たまたまの1本です）。<br>' +
    '・催しがある夜は、記録より催しが勝ちます。終演の15分前に着けるのが先です。<br>' +
    '・数字は時間単価（待ち時間込み）です。金額の大きい場所と、割のいい場所は別です。' +
    '</p></div>';
}

/**
 * このあとの見通し（6時間ごと）。
 * ★「何時何分から降る」は、気象庁からも出ていません。
 *   出せないものを出すと、空振りのもとになるので書きません。
 */
function wxNextHTML(wx){
  if (!wx || !wx.ok || !wx.next || !wx.next.length) return '';
  const chips = wx.next.map(function (x) {
    const hot = x.pop >= 50;
    return '<span class="chip' + (hot ? ' on' : '') + '" style="cursor:default">' +
      esc(x.label) + '　' + x.pop + '%</span>';
  }).join('');
  const head = wx.worse
    ? '<b style="color:var(--kusha)">☔ ' + esc(wx.worse.label) + ' ごろから崩れる見込み（' +
      wx.worse.pop + '%）</b>'
    : '<b style="color:var(--meter)">このあと、大きく崩れる見込みはありません</b>';
  return '<div class="card" style="margin-top:12px"><h2>このあとの空</h2>' +
    '<p class="note">' + head + '<br>' +
    '気象庁の「' + esc(wx.area || '大阪府') + '」の予報。6時間ごとの降水確率です。' +
    '何時何分から降るかは、気象庁からも出ていません。</p>' +
    '<div class="chips">' + chips + '</div></div>';
}

/**
 * 雨雲レーダー（気象庁のナウキャスト）を、いまいる場所で開く。
 * ★場所は、押したときに1回だけ聞きます。
 *   断られても、大阪のまん中で開きます（止まらない）。
 * ★こちらで場所を覚えることはありません。棚にも入れません。
 */
const RADAR_BASE = 'https://www.jma.go.jp/bosai/nowc/#zoom:10/lat:LAT/lon:LON/colordepth:normal/elements:hrpns';
function radarBtn(){
  /* ★長い説明はやめて、押しボタン1つにしました（ご指示・2026/11/12） */
  return '<div class="actions rdr"><button class="mini" id="radar">☂ 雨雲レーダー</button>' +
    '<span class="msg" id="radarMsg"></span></div>';
}
/* 前の名前でも動くようにしておきます（どこかに残っていても落ちないため） */
function radarHTML(){ return radarBtn(); }
function radarOpen(){
  const msg = document.getElementById('radarMsg');
  const go = function (lat, lon) {
    const u = RADAR_BASE.replace('LAT', lat.toFixed(4)).replace('LON', lon.toFixed(4));
    window.open(u, '_blank', 'noopener');
  };
  // 大阪市のまん中（梅田あたり）。場所が分からないときは、ここで開きます
  const OSAKA = [34.7025, 135.4959];
  if (!navigator.geolocation) { if (msg) msg.textContent = '大阪のまん中で開きます。'; return go(OSAKA[0], OSAKA[1]); }
  if (msg) msg.textContent = '場所をさがしています…';
  navigator.geolocation.getCurrentPosition(
    function (p) { if (msg) msg.textContent = ''; go(p.coords.latitude, p.coords.longitude); },
    function () { if (msg) msg.textContent = '場所が取れないので、大阪のまん中で開きます。'; go(OSAKA[0], OSAKA[1]); },
    { timeout: 8000, maximumAge: 300000 }
  );
}
/* ★画面の無いところ（検査など）でも落ちないようにします。
   1つの飾りのために、ほかが止まってはいけません。 */
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('click', function (e) {
    const b = (e.target && e.target.closest) ? e.target.closest('#radar') : null;
    if (b) radarOpen();
  });
}

/* ---- 天気を読む（どちらも無料・鍵なし・課金の設定なし） ---- */
let hotWx = null;   // 気象庁（府ぜんたい・6時間ごと）
let hotOm = null;   // Open-Meteo（1時間ごと・気温つき）
const WX_URL = 'https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json';
/* 大阪市のまん中（梅田あたり）の天気を見ます */
const OM_URL = 'https://api.open-meteo.com/v1/forecast?latitude=34.7025&longitude=135.4959' +
  '&current=temperature_2m,weather_code' +
  '&hourly=temperature_2m,precipitation_probability,weather_code' +
  '&daily=temperature_2m_max,temperature_2m_min' +
  '&timezone=Asia%2FTokyo&forecast_days=2';
/* いまの気温は、気象庁のアメダス（大阪・62078）から。10分ごとに出ています */
let hotAmd = null;
const AMD_T = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt';
const AMD_M = 'https://www.jma.go.jp/bosai/amedas/data/map/';
const AMD_PT = '62078';   // 大阪
async function loadAmd(){
  try {
    const t = await fetch(AMD_T, { cache: 'no-store' });
    if (!t.ok) throw new Error('status ' + t.status);
    const stamp = (await t.text()).trim().replace(/[-:T+]/g, '').slice(0, 14);
    const r = await fetch(AMD_M + stamp + '.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('status ' + r.status);
    const j = await r.json();
    const v = j && j[AMD_PT] && j[AMD_PT].temp;
    hotAmd = (v && v.length) ? { ok: true, temp: v[0] } : { ok: false };
  } catch (e) {
    hotAmd = { ok: false };
  }
}

async function loadWx(){
  try {
    const res = await fetch(WX_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('status ' + res.status);
    hotWx = wxRead(await res.json());
  } catch (e) {
    // ★取れなくても、ほかは動かします（画面には「取れなかった」と出ます）
    hotWx = { ok: false };
  }
  /* ★いまの気温。取れなくても、ほかはそのまま出ます */
  await loadAmd();
  /* ★1時間ごとの天気。こちらが取れなくても、上の気象庁ぶんは出ます */
  try {
    const r2 = await fetch(OM_URL, { cache: 'no-store' });
    if (!r2.ok) throw new Error('status ' + r2.status);
    hotOm = omRead(await r2.json());
  } catch (e) {
    hotOm = { ok: false };
  }
  if (tab === 'hot') render();
}
/* =============================================================
 *  いまアツい（ここまで）
 * ============================================================= */

/* ---- 一夜の流れ ---- */
function paneTl(){
  /* 時刻が不明なものは、夜の流れのどこにも置けないので外します */
  const R = visible().filter(hasDep);
  if (!R.length) return emptyCard('待ち時間と乗車時間を、夜ごとの帯で見比べられます。');
  const ds = [...new Set(R.map(r => r.date))].sort().reverse().slice(0,7);
  /* ★19時より前の記録が、左端に積み上がって見えていました（2026/11/12）。
       最も早い記録に合わせて、横じくの始まりを決めます。 */
  const st = R.map(r => r.dep - (+r.wait || 0) / 60);
  const x0 = Math.min(19, Math.floor(Math.min.apply(null, st)));
  const x1 = Math.max(29, Math.ceil(Math.max(...R.map(r => r.dep + r.ride/60))));
  /* ★細かすぎて読めないとご指摘（2026/11/12）。
       1行を高くし、字も大きくして、日数は最近7日までにします。 */
  /* ★まだ小さいとのご指摘（2026/11/12）。横に動かす形のまま、さらに大きく。
       1行の高さと横幅を広げ、字も大きくします。 */
  /* ★横画面（iPhoneを横にしたとき）で、ちょうど収まる幅にします。
       字は小さくしません。1時間ぶんの幅から、全体の幅を決めます。 */
  const L = 116, Rp = 20, rowH = 70;
  const W = L + Rp + Math.max(1, (x1 - x0)) * 43;
  const H = 56 + ds.length*rowH + 20;
  /* ★19時より前の記録が、日付の字に重なっていました（2026/11/12）。
       左の端より外には、はみ出させません。 */
  const sx = v => Math.max(L, Math.min(W - Rp, L + (v-x0)/(x1-x0)*(W-L-Rp)));
  /* ★横幅いっぱいに縮めると、字も帯も小さすぎて読めませんでした（ご指摘・2026/11/12）。
       元の大きさのまま出して、横に動かせる形にします。 */
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  for (let h = x0; h <= x1; h++) s += `<line class="grid-l" x1="${sx(h)}" x2="${sx(h)}" y1="26" y2="${H-14}" ${h%2?'stroke-dasharray="2 4"':''}/>
    <text class="axis" x="${sx(h)}" y="18" text-anchor="middle">${h}</text>`;
  ds.forEach((d,i) => {
    const y = 34 + i*rowH;
    s += `<text class="axis" x="${L-10}" y="${y+20}" text-anchor="end" fill="${dcol(d)}">${fmtD(d)}</text>`;
    R.filter(r => r.date === d).forEach(r => {
      const a = sx(r.dep - (+r.wait||0)/60), b = sx(r.dep), c = sx(r.dep + (+r.ride||0)/60);
      const rt = rate(r), t = Math.min(1, rt/12000);
      const tip = `${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;つけ ${showT(isUnk(r.dep)?null:r.dep-(r.wait||0)/60)} → 出 ${showT(r.dep)}（待ち${showMin(r.wait)}）&#10;乗車 ${showMin(r.ride)}・${showYen(r.fare)}&#10;時間単価 ${rt?yen(rt)+'/h':'—'}`;
      s += `<g data-tip="${tip}">
        <rect x="${a}" y="${y+13}" width="${Math.max(1,b-a)}" height="6" rx="3" fill="#3A4B6D"/>
        <rect x="${b}" y="${y+8}" width="${Math.max(3,c-b)}" height="16" rx="4" fill="rgba(240,163,59,${.25+t*.7})"/>
        <rect x="${a-1}" y="${y+4}" width="${Math.max(6,c-a+2)}" height="24" fill="transparent"/></g>`;
      if (r.fare >= 8000) s += `<text class="glab" x="${c+4}" y="${y+21}" fill="var(--meter)">${yen(r.fare)}</text>`;
    });
  });
  s += '</svg>';
  return `<div class="card"><h2>一日の流れ</h2>
    <p class="note">細い線＝つけ待ちで潰れた時間、太い帯＝お客さまを乗せていた時間です。帯が明るいほど、時間単価が高くなっています。空白が長い夜は、流すか、つける場所を変える余地があります。</p>
    ${filterChips()}<div class="snote">← 横にスクロールできます（横画面にすると、ぜんぶ入ります）</div><div class="scroll fb">${s}</div>
    <div class="legend"><span><i style="background:#3A4B6D"></i>待ち</span><span><i style="background:rgba(240,163,59,.9)"></i>実車（明るい＝高単価）</span><span>横軸は時。25＝翌1時</span></div></div>`;
}

/* ---- 時間×金額 ---- */
function paneSc(){
  /* 時刻か金額が不明なものは、この図に点を打てないので外します */
  const R = visible().filter(r => hasDep(r) && hasFare(r));
  if (!R.length) return emptyCard('もとの折れ線グラフを、ラベルが重ならない形で。');
  const ds = [...new Set(R.map(r => r.date))].sort();
  const L = 58, Rp = 20, T = 18, B = 40, W = 760, H = 430;
  const xs = R.map(r => r.dep);
  const x0 = Math.floor(Math.min(...xs)-.5), x1 = Math.ceil(Math.max(...xs)+.5);
  const y1 = Math.max(...R.map(r => r.fare)) * 1.12;
  const sx = v => L + (v-x0)/(x1-x0)*(W-L-Rp), sy = v => H-B - (v/y1)*(H-T-B);
  /* ★横幅いっぱいに縮めると、字も帯も小さすぎて読めませんでした（ご指摘・2026/11/12）。
       元の大きさのまま出して、横に動かせる形にします。 */
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
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
      s += `<g data-tip="${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;${showT(r.dep)}・${showYen(r.fare)}&#10;待ち${showMin(r.wait)}／乗車${showMin(r.ride)}&#10;時間単価 ${rate(r)?yen(rate(r))+'/h':'—'}">
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
    <p class="note">日付ごとに色を変えています。金額の字は、重ならない位置へ 自動でずれるので、手で動かす必要はありません。</p>
    <div class="toolbar">
      <button class="chip ${scOpt.line?'on':''}" data-opt="line">線でつなぐ</button>
      <button class="chip ${scOpt.label?'on':''}" data-opt="label">金額を出す</button>
    </div>
    ${filterChips()}
    <div class="scroll">${s}</div>
    <div class="legend">${ds.map(d => `<span><i style="background:${dcol(d)}"></i>${fmtD(d)}</span>`).join('')}</div></div>`;
}

/* ---- 集計 ---- */
/* ★「不明」は数に入れません（0として数えると、平均が下がります）。
     件数（n）だけは、不明もふくめた本数です。 */
function agg(rs){
  const F = rs.filter(hasFare), W = rs.filter(r => !isUnk(r.wait));
  const R = rs.map(rate).filter(x => x > 0);
  const sum = F.reduce((a,r)=>a+r.fare,0);
  return { n: rs.length,
    avg:  R.length ? R.reduce((a,b)=>a+b,0)/R.length : 0,
    fare: F.length ? sum/F.length : 0,
    sum:  sum,
    wait: W.length ? W.reduce((a,r)=>a+(+r.wait||0),0)/W.length : 0 }; }
function hourAgg(){ const m = {}; visible().filter(hasDep).forEach(r => { const h = Math.floor(r.dep); (m[h] = m[h] || []).push(r); });
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
/* ------------------------------------------------------------
 *  この期間のまとめ（まーく様のご指示・2026/11/12）
 *    「1ヶ月おきのレポート機能(期間設定も自由変更可能)」
 *
 *  ★「不明」は、1つも数に入れません。
 *    0円・0分として数えると、平均も時間単価も下がって嘘になります。
 *    数えたぶんと、外したぶんを、はっきり書きます。
 *  ★1件しかないものを「平均」と呼びません。
 * ---------------------------------------------------------- */
/* ------------------------------------------------------------
 *  前の期間と比べる（ご指示・2026/11/12）
 *
 *  ★「今期 ¥○○」だけでは、良いのか悪いのかが分かりません。
 *    1つ前と同じ長さの期間と比べて、差を出します。
 *  ★比べる相手が無い（記録が無い）ときは、何も出しません。
 *    ごまかした数を出すより、黙るほうがましです。
 * ---------------------------------------------------------- */
/** 日をまたいだ数（from〜to）を、いまの人・乗り場の絞り込みのままで数える */
function sumIn(from, to){
  const rs = records.filter(r =>
    (!onlyMine  || r.user_id === ME.user.id) &&
    (!onlyPlace || hitPlace(r)) &&
    (!from || r.date >= from) && (!to || r.date <= to));
  const f = rs.filter(hasFare);
  const days = new Set(rs.map(r => r.date)).size;
  const rts = rs.map(rate).filter(v => v > 0);
  return { n: rs.length, days: days,
           sum: f.reduce((a,r) => a + (+r.fare || 0), 0),
           rate: rts.length ? rts.reduce((a,b)=>a+b,0) / rts.length : 0 };
}
/** 1つ前の、同じ長さの期間 */
function prevRange(){
  /* ★「前は」ではなく「前月は」「前日は」と、何と比べているかを
       はっきり書きます（ご指示・2026/11/12）。 */
  const m = /^c(\d+)$/.exec(period.mode);
  if (m) { const c = cycleOf(Number(m[1]) + 1); return { from:c.from, to:c.to, name:'前月' }; }
  if (period.mode === 'free' && period.from && period.to) {
    const a = new Date(period.from), b = new Date(period.to);
    const len = Math.round((b - a) / 86400000) + 1;
    const pb = new Date(a); pb.setDate(pb.getDate() - 1);
    const pa = new Date(pb); pa.setDate(pa.getDate() - len + 1);
    const name = len === 1 ? '前日' : (len === 7 ? '前週' : ('前の' + len + '日間'));
    return { from: ymd(pa), to: ymd(pb), name: name };
  }
  return null;                       /* 全期間のときは、比べる相手がいません */
}
/** 差を「＋¥1,200（＋8%）」の形に */
function diffText(now, before){
  if (!before) return '';
  const d = now - before;
  const pc = before ? Math.round(d / before * 100) : 0;
  const sign = d > 0 ? '＋' : (d < 0 ? '−' : '±');
  const cls  = d > 0 ? 'up' : (d < 0 ? 'down' : '');
  return '<span class="cmp ' + cls + '">' + sign + yen(Math.abs(d)) +
         '（' + sign + Math.abs(pc) + '%）</span>';
}
function compareCard(){
  const pr = prevRange();
  if (!pr) return '';
  const now = sumIn(periodRange().from, periodRange().to);
  const bef = sumIn(pr.from, pr.to);
  if (!now.n || !bef.n) return '';
  /* ★4つの列を横に並べると、スマホでは「差」が切れて見えません。
       1件ずつ、名前・いま・差 の3つにして、前の数は小さく下に置きます。 */
  const pn = pr.name;                       /* 前月・前日・前週… */
  const row = (name, a2, b2, fmt) =>
    '<div class="cmprow"><div class="cl">' + name + '</div>' +
    '<div class="cn">' + fmt(a2) + '<i>' + pn + 'は ' + fmt(b2) + '</i></div>' +
    '<div class="cd">' + diffText(a2, b2) + '</div></div>';
  const nd = now.n - bef.n;
  return '<div class="card"><h2>前の期間と比べる</h2>' +
    '<p class="note"><b>' + esc(pr.name) + '</b>（' + esc(fmtD(pr.from)) + ' 〜 ' +
    esc(fmtD(pr.to)) + '）と比べています。' +
    (onlyPlace ? esc(onlyPlace) + ' だけ。' : '') + '</p>' +
    row('売上の合計', now.sum, bef.sum, yen) +
    row('1日当たり', now.days ? now.sum/now.days : 0,
                     bef.days ? bef.sum/bef.days : 0, yen) +
    row('平均 時間単価', now.rate, bef.rate, v => yen(v) + '/h') +
    '<div class="cmprow"><div class="cl">記録の数</div>' +
    '<div class="cn">' + now.n + '件<i>' + pn + 'は ' + bef.n + '件</i></div>' +
    '<div class="cd"><span class="cmp ' + (nd > 0 ? 'up' : (nd < 0 ? 'down' : '')) + '">' +
    (nd > 0 ? '＋' : (nd < 0 ? '−' : '±')) + Math.abs(nd) + '件</span></div></div>' +
    '</div>';
}

function reportCard(){
  const R = visible();
  if (!R.length) return '';
  const ds    = [...new Set(R.map(r => r.date))].sort();
  const days  = ds.length;
  const fares = R.filter(hasFare);
  const sum   = fares.reduce((a,r) => a + (+r.fare || 0), 0);
  const rts   = R.map(rate).filter(v => v > 0);
  const avgRt = rts.length ? rts.reduce((a,b) => a+b, 0) / rts.length : 0;
  /* 1日あたりは「記録のある日」で割ります。走っていない日で割ると下がります */
  const perDay = days ? sum / days : 0;
  /* 一番良かった日 */
  const byDay = {};
  fares.forEach(r => { byDay[r.date] = (byDay[r.date] || 0) + (+r.fare || 0); });
  const bestDay = Object.keys(byDay).sort((a,b) => byDay[b] - byDay[a])[0] || '';
  /* 一番多かった乗り場（3件以上あるときだけ） */
  const byPl = {};
  R.forEach(r => { if (r.place) byPl[r.place] = (byPl[r.place] || 0) + 1; });
  const topPl = Object.keys(byPl).sort((a,b) => byPl[b] - byPl[a])[0] || '';
  const unk   = R.length - fares.length;

  const cell = (t, v, sub) =>
    '<div class="rcell"><small>' + t + '</small><b>' + v + '</b>' +
    (sub ? '<i>' + sub + '</i>' : '') + '</div>';

  return '<div class="card"><h2>この期間のまとめ</h2>' +
    '<p class="note"><b class="fnow">' + esc(periodLabel()) + '</b>' +
    (onlyPlace ? '／<b class="fnow">' + esc(onlyPlace) + ' だけ</b>' : '') +
    '／' + (onlyMine ? '自分だけ' : '全員') + '　' +
    '記録のある日 ' + days + '日。' +
    (unk ? '金額が「不明」の ' + unk + '件は、合計にも平均にも入れていません。' : '') +
    '</p>' +
    '<div class="rgrid">' +
      cell('売上の合計', yen(sum), fares.length + '本分') +
      cell('1日当たり', days ? yen(perDay) : '—', days + '日で割った額') +
      cell('1本当たり', fares.length ? yen(sum / fares.length) : '—', '平均の金額') +
      cell('時間単価', rts.length >= 3 ? yen(avgRt) + '/h' : '—',
           rts.length >= 3 ? ('' + rts.length + '本の平均')
                           : ('数えられたのは ' + rts.length + '本だけ')) +
    '</div>' +
    '<p class="note" style="margin-top:12px">' +
      (bestDay ? '一番良かった日：<b>' + esc(fmtD(bestDay)) + '</b>（' +
                 yen(byDay[bestDay]) + '）<br>' : '') +
      (topPl && byPl[topPl] >= 3
        ? '一番多く着けた所：<b>' + esc(topPl) + '</b>（' + byPl[topPl] + '件）' : '') +
    '</p></div>';
}

function paneRank(){
  if (!visible().length) {
    return '<div class="card">' + filterChips() +
      '<div class="empty">この絞り込みでは、1件もありません。</div></div>';
  }
  const h = hourAgg(), p = placeAgg();
  const best = h.filter(x => x.n >= 3).sort((a,b) => b.avg - a.avg).slice(0,3);
  const worst = h.filter(x => x.n >= 3).sort((a,b) => a.avg - b.avg)[0];
  return reportCard() + compareCard() + `<div class="card"><h2>大事なところ</h2>
    <p class="note">3件以上ある枠だけを並べています。薄い棒は、件数が足りていない目安です。</p>
    ${filterChips()}
    ${best.length ? `<div style="font-size:13px;line-height:2">
      アツい時間帯：${best.map(b => `<b style="font-family:var(--mono);color:var(--andon)">${b.h}時台 ${yen(b.avg)}/h</b>`).join('　')}<br>
      ${worst ? `薄い時間帯：<span style="font-family:var(--mono);color:var(--kusha)">${worst.h}時台 ${yen(worst.avg)}/h</span>` : ''}
      ${p[0] && p[0].n >= 3 ? `<br>割のいい場所：<b style="color:var(--andon)">${esc(p[0].p)} ${yen(p[0].avg)}/h</b>` : ''}
    </div>` : `<div class="note">まだ3件以上そろった時間帯がありません。</div>`}
  </div>
  <div class="card"><h2>時間帯ごと</h2><p class="note">乗せた時刻で分けています。</p>${bars(h,'時間帯',r => r.h+'時台')}</div>
  <div class="card"><h2>つけ待ち場所ごと</h2><p class="note">時間単価の高い順です。</p>${bars(p,'場所',r => r.p)}</div>
  ${paneHeat(true)}`;
}

/* ---- 一覧・書き出し ---- */
function paneList(){
  return `<div class="card"><h2>一覧（${visible().length}件）</h2>
    ${filterChips()}
    ${visible().length ? tableHTML(sorted()) : `<div class="empty">該当データがありません</div>`}
  </div>
  <div class="card"><h2>書き出し</h2>
    <p class="note">いま出している${onlyMine?'自分の':'全員の'}記録を、CSVに書き出します。スプレッドシートで数えたいときや、控えを残したいときに使ってください。</p>
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
    <p class="note">シートの範囲をそのままコピーして、下に貼るだけです。見出しの行があれば、列の並びは 自動で読みます。
    なければ「日付・場所・乗せた時刻・待ち・乗車・金額」の順とみなします。
    <b>いきなり保存はしません</b>ので、中身を確かめてから取り込めます。取り込んだ記録は${esc(ME.profile.display_name || '自分')}の名前で入ります。</p>
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
  if (!total) return `<div class="empty">読める行がありませんでした。見出しの行だけになっていないか、確かめてください。</div>`;
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
  /* ★乗り場の名前から手を離したところで、似た名前がないかを見ます
       （ご指示・2026/11/12）。打っている途中で聞くと、うるさいだけです。 */
  /* 発車時間の、時と分のタグ（ご指示・2026/11/12） */
  document.querySelectorAll('[data-dh]').forEach(function (b) {
    b.onclick = function () { grab(); form.dep = depSet(form.dep, b.dataset.dh, null); render(); };
  });
  document.querySelectorAll('[data-dm]').forEach(function (b) {
    b.onclick = function () { grab(); form.dep = depSet(form.dep, null, b.dataset.dm); render(); };
  });
  const fpl = document.getElementById('f_place');
  if (fpl) fpl.addEventListener('change', function () {
    const v = fpl.value.trim();
    if (v !== String(form.place || '')) { grab(); msg = ''; render(); }
  });
  if (fpl) fpl.addEventListener('blur', function () {
    const v = fpl.value.trim();
    if (v !== String(form.place || '')) { grab(); msg = ''; render(); }
  });
  upd();

  document.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    grab();
    const fld = b.dataset.set, val = b.dataset.val;
    /* ★「行先：」のように「：」で終わるタグは“書き出し”です。
         入れ替えるのではなく、前に付けて、続きを打てるようにします。 */
    if (/：$/.test(val)) {
      const now = String(form[fld] || '');
      form[fld] = now.indexOf(val) === 0 ? now : (val + now);
      render();
      const el = $('#f_' + fld);
      if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
      return;
    }
    form[fld] = val;
    render();
  });
  document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { scOpt[b.dataset.opt] = !scOpt[b.dataset.opt]; render(); });
  document.querySelectorAll('[data-mine]').forEach(b => b.onclick = () => {
    grab(); onlyMine = b.dataset.mine === '1'; filtSave(); render(); });
  /*
   * ★しぼり込み（乗り場・期間）。ご指示・2026/11/12
   *   選んだら、その場で画面ぜんぶが そのぶんだけになります。
   */
  document.querySelectorAll('[data-filt]').forEach(function (el) {
    el.onchange = function () {
      grab();
      const k = el.dataset.filt, v = el.value;
      if (k === 'place')  onlyPlace = v;
      if (k === 'period') {
        period.mode = v;
        if (v === 'free' && !period.from && !period.to) {
          /* はじめて「自分で決める」をえらんだときは、今期を入れておきます。
             空のままだと、何も絞られず「ぜんぶ」と同じに見えてしまいます。 */
          const c = cycleOf(0); period.from = c.from; period.to = c.to;
        }
      }
      if (k === 'from') period.from = v;
      if (k === 'to')   period.to   = v;
      filtSave(); render();
    };
  });
  document.querySelectorAll('[data-psug]').forEach(function (b) {
    b.onclick = function () { grab(); form.place = b.dataset.psug; msg = ''; render(); };
  });
  const pk = document.querySelector('[data-pkeep]');
  if (pk) pk.onclick = function () {
    grab(); placeAskOk[form.place] = true; msg = ''; render(); };
  ['ktPlace', 'ktPlace2'].forEach(function (id) {
    const kpl = document.getElementById(id);
    if (kpl) kpl.onchange = function () {
      grab(); onlyPlace = kpl.value; filtSave(); render(); };
  });
  document.querySelectorAll('[data-day]').forEach(function (b) {
    b.onclick = function () { grab(); onlyDay = b.dataset.day; filtSave(); render(); };
  });
  const kcl = document.getElementById('ktClear');
  if (kcl) kcl.onclick = function () { grab(); onlyPlace = ''; filtSave(); render(); };
  const fc = document.getElementById('fClear');
  if (fc) fc.onclick = function () { grab(); filtClear(); render(); };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => delRec(b.dataset.del));
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    const r = records.find(x => x.id === b.dataset.edit); if (!r) return;
    form = { date:r.date, place:r.place,
             dep: isUnk(r.dep) ? '' : fmtT(r.dep),
             wait: isUnk(r.wait) ? '' : r.wait,
             ride: isUnk(r.ride) ? '' : r.ride,
             fare: isUnk(r.fare) ? '' : r.fare,
             method: r.method || '', note: r.note || '' };
    editId = r.id; tab = 'in'; msg = ''; render(); window.scrollTo({ top:0, behavior:'smooth' });
  });
  /* きょうのイベントを、まん中にもう一度 出す（オフにした人も見られるように） */
  if ($('#evAgain')) $('#evAgain').onclick = () => {
    const d = evToday();
    if (d && d.list && d.list.length) evPopup(d);
    else bad('きょうのイベントは、まだ届いていません');
  };
  /* 「この地図で合っている」… 同じ名前なら、同じ場所として扱う印 */
  if ($('#f_mapok')) $('#f_mapok').onclick = () => {
    grab();
    if (!form.place) { bad('先に、つけ待ち場所を入れてください'); return; }
    placeOkToggle(form.place);
    render();
  };
  if ($('#fb'))     $('#fb').addEventListener('input', e => { fbText = e.target.value; });
  if ($('#fbSend')) $('#fbSend').onclick = fbSend;
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
    g.addEventListener('mouseenter', e => showTip(e, g.dataset.tip, g));
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('click', e => { showTip(e, g.dataset.tip, g); setTimeout(hideTip, 3200); });
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

/* ★数の欄：空っぽなら「不明」（null）。0 と混ぜません
     （まーく様のご指示・2026/11/11「空白部分は「不明」扱いに」） */
function numOrUnk(v, max){
  const t = String(v == null ? '' : v).trim();
  if (t === '') return null;
  const n = Math.round(Number(t.replace(/[^\d.-]/g, '')));
  if (!isFinite(n) || n < 0) return null;
  return Math.min(n, max);
}

async function addRec(){
  grab();
  const dRaw = String(form.dep || '').trim();
  const d = dRaw === '' ? null : parseT(dRaw);
  const fare = numOrUnk(form.fare, 1000000);
  if (!form.date) return bad('営業日を入れる');
  /* ★似た名前の乗り場があれば、保存の前に1度だけ聞きます（ご指示・2026/11/12）。
       同じ場所が2つの名前で入ると、どちらの数字も当てになりません。 */
  const pSug = placeAskOk[form.place] ? '' : placeSuggest(form.place);
  if (pSug) { render(); return bad('もしかして、' + pSug + ' と同じですか？ 上で選んでください'); }
  /* ★時刻は「書いてあるのに読めない」ときだけ はじきます。
       書いていないのは「不明」として通します（ご指示・2026/11/11）。 */
  if (dRaw !== '' && d === null) return bad('乗せた時刻が読めない（例 25:30）');
  /* 何ひとつ入っていない記録は、残しても意味がないので止めます */
  if (d === null && fare === null && !String(form.place || '').trim())
    return bad('場所・時刻・金額のうち、どれか1つは入れてください');
  const row = {
    user_id: ME.user.id, work_date: form.date, place: (form.place || '').trim(),
    dep: (d === null ? null : +d.toFixed(2)),
    wait_min: numOrUnk(form.wait, 1440),
    ride_min: numOrUnk(form.ride, 1440), fare: fare,
    method: normMethod(form.method || ''), note: (form.note || '').trim()
  };
  const btn = $('#add'); btn.disabled = true;
  const put = async r => editId
    ? (await db.from('rides').update(r).eq('id', editId)).error
    : (await db.from('rides').insert(r)).error;
  let error = await put(row);

  /*
   * ★台帳の側が、まだ「空っぽ」を受け取れないときの逃げ道。
   *   まーく様のひと手間（schema.sql の「8.」）が済むまでのあいだ、
   *   空欄のまま押すと弾かれてしまいます。
   *   それでは走っている最中に記録が残せないので、
   *   そのときだけ 0 として入れ直し、そうと伝えます。
   *   黙って0で入れると、あとで数字が狂うので、必ず言います。
   */
  /*
   * ★台帳の側が、まだ「空っぽ」を受け取れないときの逃げ道。
   *   まーく様のひと手間（schema.sql の「8.」）が済むまでのあいだ、
   *   空欄のまま押すと弾かれてしまいます。
   *   それでは走っている最中に記録が残せないので、
   *   そのときだけ 0 として入れ直し、そうと伝えます。
   *   黙って0で入れると、あとで数字が狂うので、必ず言います。
   */
  let fellBack = false;
  if (error && /null value|not-null|violates not-null/i.test(String(error.message || ''))) {
    const r2 = Object.assign({}, row);
    if (r2.dep === null)      r2.dep = 0;
    if (r2.wait_min === null) r2.wait_min = 0;
    if (r2.ride_min === null) r2.ride_min = 0;
    if (r2.fare === null)     r2.fare = 0;
    const e2 = await put(r2);
    if (!e2) { error = null; fellBack = true; Object.assign(row, r2); }
  }
  if (error) { btn.disabled = false; return bad(jaError(error)); }
  const r = { wait: row.wait_min, ride: row.ride_min, fare: row.fare };
  msg = editId ? '書きかえた'
    : `記録した（時間単価 ${rate(r) ? yen(rate(r)) + '/h' : '不明の欄があるので出せません'}）`;
  if (fellBack) msg += '　※空の欄は、いまは 0 で入りました（台帳のひと手間がまだです）';
  msgBad = false; editId = null;
  form = { date: row.work_date, place: row.place, dep:'', wait:'', ride:'', fare:'', method:'', note:'' };
  await reload();
}
async function delRec(id){
  /*
   * ★2回たずねます（ご指示・2026/11/12）
   *     「削除の場合は、再確認のメッセージも出して、
   *       1回で誤って消えるような形にならないように」
   *   走りながら押すので、1回だと指が当たっただけで消えます。
   *   消した記録は戻せません。
   */
  const r = records.filter(function (x){ return x.id === id; })[0];
  const what = r ? (fmtD(r.date) + '　' + (r.place || '乗り場 不明') + '　' +
                    showT(r.dep) + '　' + showYen(r.fare)) : 'この1件';
  if (!confirm('この記録を削除します。\n\n' + what + '\n\n戻せません。よろしいですか？')) return;
  if (!confirm('もう一度おたずねします。\n本当に削除してよろしいですか？')) return;
  const { error } = await db.from('rides').delete().eq('id', id);
  if (error) return bad(jaError(error));
  msg = '消した'; msgBad = false;
  await reload();
}

/* ---- CSV ---- */
function csv(){
  const q = v => `"${String(v == null ? '' : v).replace(/"/g,'""')}"`;
  return ['日付,場所,乗せた時刻,待ち時間(分),乗車時間(分),金額,時間単価,種類,他,記録者',
    ...sorted().map(r => [r.date, q(showTxt(r.place)), showT(r.dep),
      showMin(r.wait), showMin(r.ride), isUnk(r.fare) ? UNK : r.fare,
      rate(r) ? Math.round(rate(r)) : UNK,
      q(r.method), q(r.note), q(r.who)].join(','))].join('\n');
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
    /* ★入れるときと同じ数え方（0〜6時は 24時以降） */
    if (h + mi / 60 <= 6) h += 24;
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
  // 「つけ待ち場所」が待ち時間と誤認されないよう、場所を一番先に判定する
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
/*
 * ★ふきだしは、押したものの「真上」に出します（ご指示・2026/11/12）。
 *   指の位置ではなく、押した帯やマスそのものの上に置きます。
 *   そうしないと、見たいものが ふきだしで隠れてしまいます。
 *   上に入らないときだけ、下に出します。
 */
const tip = $('#tip');
function placeTip(el){
  if (!el || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth || 220, h = tip.offsetHeight || 60;
  let x = r.left + r.width / 2 - w / 2;
  x = Math.max(8, Math.min(x, innerWidth - w - 8));
  let y = r.top - h - 12;                       /* 押したものの真上 */
  if (y < 8) y = r.bottom + 12;                 /* 上に入らなければ、下に */
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}
function showTip(e, t, el){
  tip.innerHTML = String(t).replace(/&#10;/g,'<br>').split('\n').join('<br>');
  tip.classList.add('on');
  placeTip(el || (e && e.currentTarget));
}
function hideTip(){ tip.classList.remove('on'); }


/* ============================================================
 *  📣 お知らせ（直したところの控え）
 *
 *  ★まーく様のご指示（2026/11/10）
 *      「アップデート情報のお知らせ欄も追加してください、
 *        アップデート内容は、乗務員に必要な、わかりやすい情報に
 *        だけまとめるかたちで載せて下さい」
 *
 *  ★中身は news.js に書いてあります。
 *    まだ読んでいないものがあるときだけ、タブに赤い点を出します。
 *    「読んだかどうか」は、その人の機械にだけ残します
 *    （ほかの人には関わらない話なので、棚には入れません）。
 * ============================================================ */
const NEWS_KEY = 'tsukemachi.news.seen';

function newsLatest(){
  try { return (typeof APP_NEWS !== 'undefined' && APP_NEWS[0]) ? APP_NEWS[0].v : ''; }
  catch (e) { return ''; }
}

/** まだ読んでいないお知らせがあるか */
function newsUnread(){
  const v = newsLatest();
  if (!v) return false;
  try { return localStorage.getItem(NEWS_KEY) !== v; }
  catch (e) { return false; }   // 使えない機械でも、落とさない
}

/** 「読んだ」と覚えて、赤い点を消す */
function newsSeen(){
  try { localStorage.setItem(NEWS_KEY, newsLatest()); } catch (e) {}
  const d = document.getElementById('newsDot');
  if (d) d.hidden = true;
}

/** 題のとなりの版の番号と、タブの赤い点をととのえる */
function newsBoot(){
  try {
    const v = document.getElementById('ver');
    if (v && typeof APP_VERSION !== 'undefined') v.textContent = APP_VERSION;
    const d = document.getElementById('newsDot');
    if (d) d.hidden = !newsUnread();
  } catch (e) {}
}

function paneNews(){
  let list = [];
  try { list = (typeof APP_NEWS !== 'undefined' && APP_NEWS) ? APP_NEWS : []; } catch (e) { list = []; }
  if (!list.length) return emptyCard('お知らせはまだありません。');
  const body = list.map(n => `<div class="newsv"><b>${esc(n.v)}</b><small>${esc(n.d)}</small></div>
    <ul class="newsl">${(n.items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('');
  return `<div class="card"><h2>お知らせ・使い方</h2>
    <p class="note">はじめての方へ。基本的な使い方です。
      いま動いているのは <b>${esc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '')}</b> です。</p>
    ${body}
    <!-- ★顔とひとことの一覧（ご指示・2026/11/11）
           「セリフと顔の各パターンの一覧を
             別ファイルか何かで見られる形にしてもらえますか」 -->
    <div class="actions">
      <a class="btn ghost" href="/say" target="_blank" rel="noopener"
         style="text-decoration:none">右上の顔とひとこと、すべて見る</a>
    </div></div>`;
}

/* ★ここも、画面の無いところで落ちないようにします */
if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', newsBoot);
  else newsBoot();
}


/* ============================================================
 *  🎤 きょう・あすのイベント（TAXI NOTE）
 *
 *  ★まーく様のご指示（2026/11/10）
 *      「このwebサイトでも、毎日のイベント情報を見せられるように
 *        してほしいのと、ポップアップ表示（今日はもう表示しない
 *        という選択肢も含める）で出せる形にしてください」
 *
 *  ★中身は、GASが1日1回 置いていく小さな紙（data/events.json）です。
 *    受け口の住所は、どこにも出していません。
 *  ★出すのは「何時に着けるか」が先。開演はその下。
 *    乗務員が知りたいのは、客が出てくる時刻だからです。
 * ============================================================ */
let evData = null;
const EV_KEY = 'tsukemachi.ev.hide';     // 「今日はもう表示しない」を覚える所

async function loadEv(){
  try {
    const res = await fetch('data/events.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('status ' + res.status);
    evData = await res.json();
  } catch (e) { evData = { at:'', days:[] }; }
  evBoot();
  if (tab === 'ev') render();
}

/** きょうのぶん（無ければ、一番上の日） */
function evToday(){
  if (!evData || !evData.days || !evData.days.length) return null;
  const t = evNight();
  return evData.days.filter(d => d.d === t)[0] || evData.days[0];
}

/*
 * 何日のぶんかを、必ず題に出す（まーく様のご指示・2026/11/12）
 *   「これ、毎回日付を入れてもらえないと、
 *     いつのイベントか分かりません」
 *
 * ★ここは「きょう」とだけ書いていました。
 *   ところが、夜中の0時をまわると、スプシの営業日（朝6時まわり）と
 *   カレンダーの日付がずれます。そのため、出しているのが
 *   どの日のぶんなのか、まったく分からない形になっていました。
 * ★日付（曜日つき）は、どんなときも必ず出します。
 *   「きょう」と足すのは、営業日とぴったり同じときだけ。
 *   違う日のぶんを出しているのに「きょう」と書くのは、嘘になります。
 */
function evTitle(day){
  const n = (day && day.list) ? day.list.length : 0;
  if (!day || !day.d) return 'イベント（' + n + '件）';
  const kyo = (day.d === evNight()) ? 'きょう ' : '';
  return kyo + fmtD(day.d) + ' のイベント（' + n + '件）';
}

/* ★日付は、一番目立たせます（ご指示・2026/11/12
     「〇〇のイベントの日付部分は、もっと目立たせてください」）。
     どの日のぶんかを取り違えると、空振りになるためです。 */
function evTitleHTML(day){
  const n = (day && day.list) ? day.list.length : 0;
  if (!day || !day.d) return 'イベント（' + n + '件）';
  /* ★今日・明日は、赤い札で はっきり出します（ご指示・2026/11/12） */
  let kyo = '';
  if (day.d === evNight())              kyo = '<span class="evkyo">今日</span> ';
  else if (day.d === nextYmd(evNight())) kyo = '<span class="evkyo">明日</span> ';
  return kyo + '<span class="evday">' + esc(fmtD(day.d)) + '</span>' +
         '<span class="evcnt">のイベント（' + n + '件）</span>';
}

/*
 * 古いまま止まっていたら、黙らずに そう書く。
 * （日付を出すようにしたので、止まっていることにも気づけます）
 */
function evStale(day){
  if (!day || !day.d) return '';
  return (day.d < evNight()) ? '※新しいぶんが、まだ届いていません' : '';
}

/*
 * 催しの「時刻の行」を作る（ご指示・2026/11/12）
 *
 *  ★一番大きく出すのは 開演。着ける時刻は、下に小さく。
 *  ★バラシ（搬出）は、公演のあとの話なので「終演」を出します。
 *    「開演が分かりません」と書いても、意味がありません。
 *  ★搬入（設営）は、その日に公演がありません。
 *    時刻を1つも出しません（公演の時刻をくっつけない決まり）。
 *  ★分からないときは、時刻を1つも書きません。
 *    怪しい時刻は、空振りを生みます。
 */
function evTimeLine(x){
  if (x.k === 'hanyu') return '';
  /* ★開演は、分かっているかぎり必ず出します（ご指示・2026/11/12）。
     終演は、分かっていればその時刻。計算したものは「（予定）」。
     分からないときは「終演 不明」とだけ書きます。 */
  const st  = x.s ? (esc(x.s) + ' 開演') : '開演 不明';
  const end = x.e ? ('終演 ' + esc(x.e) + (x.g ? '（予定）' : '')) : '終演 不明';
  const dim = (!x.s && !x.e) ? ' evnone' : '';
  return '<div class="evgo' + dim + '">🎬 ' + st + '　／　' + end + '</div>';
}

function evRows(day){
  if (!day || !day.list || !day.list.length) return '<div class="empty">該当データがありません</div>';
  const kind = { event:'🎤 イベント', barasi:'🔧 バラシ',
                 hanyu:'🚚 搬入', hotel:'🍽 ホテル宴会' };
  /*
   * ★一番上に出すのは「開演の時刻」です
   *   （まーく様のご指示・2026/11/12）。
   *     「何時に車を着けるのかはこちらで判断するので、
   *       開演時間が一番重要なので、
   *       そこを履き違えないでください」
   *   ★前は「何時に車を着けるか」を大きく出していました。
   *     着ける時刻は、まーく様ご自身がお決めになるものなので、
   *     開演・終演を先に、大きく出します。
   *   ★着ける時刻の目安は、消さずに下に残します。
   *     判断の材料として、あったほうがよいからです。
   */
  return day.list.map(x => `<div class="evrow">
    <div class="evhead">${esc(x.v || '')}<span class="evkind">${esc(kind[x.k] || '')}</span></div>
    ${evTimeLine(x)}
    <div class="evt">${esc(x.t || '')}</div>
    ${x.a ? `<div class="evsub">🚕 着ける目安：${esc(x.a)}</div>` : ''}
    ${x.r ? `<div class="evsub">${esc(x.r)}</div>` : ''}
  </div>`).join('');
}

function paneEv(){
  const d = evToday();
  const at = (evData && evData.at) ? evData.at : '';
  /* ★「今日はもう表示しない」を押した人も、ここから出し直せます
       （ご指示・2026/11/11「今日のお知らせをオフにした人も
         再度見れる形にしてください」）。 */
  const hid = evHiddenToday();
  return `<div class="card"><h2>${evTitleHTML(d)}</h2>
    <p class="note">${evStale(d) ? '<b class="evold">' + esc(evStale(d)) + '</b><br>' : ''}
      一番上は<b>開演の時刻</b>（分かっていれば終演も）。
      車を着ける時刻の目安は、その下に小さく置いています。
      ${at ? '（取ったのは ' + esc(at) + '）' : ''}</p>
    <div class="actions">
      <button class="btn ghost" id="evAgain">まん中に もう一度 出す</button>
      ${hid ? '<span class="note">※きょうは「もう表示しない」にしてあります。' +
              '押せば、その場でもう一度 出ます。</span>' : ''}
    </div>
    ${evRows(d)}</div>` +
    ((evData && evData.days && evData.days[1]) ?
      `<div class="card"><h2>${evTitleHTML(evData.days[1])}</h2>
        ${evRows(evData.days[1])}</div>` : '');
}

/* ============================================================
 *  フィードバック（自由に書いて送れる所）
 *
 *  ★まーく様のご指示（2026/11/11）
 *      「フィードバックページも導入して(自由形式)
 *        そのフィードバックを読み取ったら、自動で改良し、
 *        変更前に、僕に最終確認をとる形にして、
 *        プレビュー用ページの作成も作るようにしてください」
 *
 *  ★書いたものは台帳の棚（feedback）にたまります。
 *    まーく様は【管理】の画面で、ぜんぶ読めます。
 *  ★棚がまだ無いときは、そうと出します。黙って消しません。
 * ========================================================== */
let fbText = '';

function paneFb(){
  return `<div class="card"><h2>フィードバック</h2>
    <p class="note">使っていて「ここが使いにくい」「これが欲しい」と思ったことを、
      そのまま書いてください。書き方は自由です。直したものは【お知らせ】に出ます。</p>
    <div class="grid">
      <div class="f w6"><label>思ったこと（自由に）</label>
        <textarea class="ja" id="fb" rows="5"
          placeholder="例）待ち時間のタブ、もっと細かいのが欲しい">${esc(fbText)}</textarea></div>
    </div>
    <div class="actions">
      <button class="btn" id="fbSend">送る</button>
      ${msgHTML('msg')}
    </div>
    <p class="note">※ 書いた人の名前も一緒に残ります（だれの困りごとか分からないと、直せないため）。</p>
  </div>`;
}

async function fbSend(){
  const t = String($('#fb') ? $('#fb').value : '').trim();
  if (!t) { bad('なにか書いてから送ってください'); return; }
  if (t.length > 2000) { bad('長すぎます。2000字までにしてください'); return; }
  try {
    const { error } = await db.from('feedback').insert({
      user_id: ME.id, who: (ME.profile && ME.profile.display_name) || '', body: t
    });
    if (error) {
      /* 棚がまだ無いときは、そうと伝えます。黙って捨てません */
      const m = String(error.message || '');
      bad(/relation|does not exist|schema cache/i.test(m)
          ? 'フィードバックの置き場が、まだ台帳にありません（まーく様に、ひと手間だけお願いします）'
          : jaError(error));
      return;
    }
    fbText = '';
    ok('ありがとうございます。届きました');
  } catch (e) { bad(jaError(e)); }
}

/* ---- ポップアップ ---- */
function evHiddenToday(){
  try { return localStorage.getItem(EV_KEY) === evNight(); } catch (e) { return false; }
}
function evHideToday(){
  try { localStorage.setItem(EV_KEY, evNight()); } catch (e) {}
}
function evBoot(){
  try {
    const d = evToday();
    const n = (d && d.list) ? d.list.length : 0;
    const dot = document.getElementById('evDot');
    if (dot) dot.hidden = !n;
    if (!n || evHiddenToday()) return;
    evPopup(d);
  } catch (e) {}
}
function evPopup(d){
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `<div class="modalbox">
    <h2>${evTitleHTML(d)}</h2>
    ${evStale(d) ? `<p class="note evold">${esc(evStale(d))}</p>` : ''}
    <div class="modalbody">${evRows(d)}</div>
    <div class="modalfoot">
      <label class="mchk"><input type="checkbox" id="evHide"> 今日はもう表示しない</label>
      <button class="btn" id="evClose">閉じる</button>
    </div>
  </div>`;
  document.body.appendChild(box);
  const close = () => {
    try { if (document.getElementById('evHide').checked) evHideToday(); } catch (e) {}
    box.remove();
  };
  box.querySelector('#evClose').addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
}

if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadEv);
  else loadEv();
}
