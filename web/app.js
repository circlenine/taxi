/* TAXI NOTE 本体 */
const $ = s => document.querySelector(s);

let ME = null, records = [], names = {}, tab = 'in', form = {}, editId = null, msg = '', msgBad = false;
let scOpt = { line: true, label: true }, onlyMine = false;
/* ★折線グラフで、自分でえらんだ乗り場（ご指示・2026/11/13
     「その他にも好きに乗り場をカスタムできる選択肢も追加してください」）。
     押した乗り場は、次に開いたときも覚えています。 */
const SCP_KEY = 'tn_sc_picks';
let scPicks = (function (){
  try { return JSON.parse(localStorage.getItem(SCP_KEY) || '[]') || []; }
  catch (e) { return []; }
})();
function scPicksSave(){
  try { localStorage.setItem(SCP_KEY, JSON.stringify(scPicks)); } catch (e) {}
}
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
/* ★onlyCat … 大カテゴリー（関空・バラシ・北7…）だけに絞る（空なら すべて）。
     グラフの画面で、すぐ切り替えられるようにします（ご指示・2026/11/12）。 */
let onlyPlace = '', onlyCat = '', onlyBig = '', period = { mode: 'c0', from: '', to: '' };
/* ★営業曜日の絞り込みは、開いた日に当たる区分からはじめます
     （ご指示・2026/11/13）。平日と金・祝前日では、売上の出方が違うためです。
     ここでは空にしておき、読み込みのときに その日の区分を入れます。 */
let onlyDay = '';
const FILT_KEY = 'tsukemachi.filter';
/* ★開いていたタブを覚えます（ご指示・2026/11/12）
     「更新した時に、勝手に記録に戻ってしまうので、
       開いてたままのタブのまま開き直すようにして欲しい」 */
const TAB_KEY  = 'tsukemachi.tab';
/* ★書きかけの記録も覚えます（ご指示・2026/11/12）
     「1回バックグラウンドにしたり、消したりしても
       できる限り、入力した情報は残った状態にできるように」 */
const FORM_KEY = 'tsukemachi.form';
/* ★固定ボタンを、右に置くか左に置くか（左利きの方のため） */
const HAND_KEY = 'tsukemachi.hand';
let hand = 'r';

function tabSave(){ try { localStorage.setItem(TAB_KEY, tab); } catch (e) {} }
function tabLoad(){
  try { const v = localStorage.getItem(TAB_KEY); if (v) tab = v; } catch (e) {}
}
/** 書きかけが1つでもあるか（日付だけなら、書きかけとは見なしません） */
function formDirty(){
  const f = form || {};
  return !!(String(f.place || '') || String(f.dep || '') || String(f.wait || '') ||
            String(f.fare || '') || String(f.method || '') || String(f.note || ''));
}
function formSave(){
  try {
    if (formDirty()) localStorage.setItem(FORM_KEY, JSON.stringify(form));
    else localStorage.removeItem(FORM_KEY);
  } catch (e) {}
}
function formLoad(){
  try {
    const o = JSON.parse(localStorage.getItem(FORM_KEY) || 'null');
    if (o && typeof o === 'object') form = Object.assign({}, form, o);
  } catch (e) {}
}
function handLoad(){
  try { const v = localStorage.getItem(HAND_KEY); if (v === 'l' || v === 'r') hand = v; } catch (e) {}
  handApply();
}
function handApply(){
  try {
    document.body.setAttribute('data-hand', hand);
    document.querySelectorAll('[data-hand]').forEach(function (b) {
      if (b.tagName === 'BUTTON') b.classList.toggle('on', b.dataset.hand === hand);
    });
  } catch (e) {}
}

function filtLoad(){
  /* ★開いた日に当たる区分を、はじめから選んだ形にします
       （ご指示・2026/11/13「開いた日に応じた曜日が、最初に選択されてる形に」）。 */
  onlyDay = dayCls(today());
  try {
    const o = JSON.parse(localStorage.getItem(FILT_KEY) || '{}') || {};
    if (typeof o.place === 'string') onlyPlace = o.place;
    if (typeof o.cat === 'string') onlyCat = o.cat;
    if (typeof o.big === 'string') onlyBig = o.big;
    /* ★営業日が変わったら、その日に当たる区分に戻します
         （ご指示・2026/11/13「開いた日に応じた曜日が、最初に選択されてる形に」）。
         同じ夜のうちは、押して選んだものを そのまま残します。 */
    if (typeof o.day === 'string' && o.dayAt === today()) onlyDay = o.day;
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
      JSON.stringify({ place: onlyPlace, cat: onlyCat, big: onlyBig, day: onlyDay,
        dayAt: today(), mine: onlyMine, period: period }));
  } catch (e) {}
}
function filtClear(){ onlyPlace = ''; onlyCat = ''; onlyBig = ''; onlyDay = ''; period = { mode:'c0', from:'', to:'' }; filtSave(); }
const filtOn = () => !!onlyPlace || !!onlyCat || !!onlyBig || !!onlyDay || period.mode !== 'c0';

/* ---------- 起動 ---------- */
(async () => {
  const s = await requireLogin();
  if (!s) return;
  ME = s;
  /* ★右上は「称号」を出します（まーく様のご指示・2026/11/10）。
     称号を入れていない人は、短い名前。それも無ければメールアドレス。 */
  $('#me').textContent = s.profile.title || s.profile.display_name || s.user.email;
  /* ★「管理者」の札は消しました（ご指示・2026/11/12「文字も省けるものは省いて」）。
       【管理】のボタンが、まーく様にしか出ないので、それで足ります。 */
  if (s.profile.is_admin) { $('#toAdmin').hidden = false; }
  $('#out').addEventListener('click', signOut);
  /* ★タブは nav の中だけとはかぎりません（フィードバックは上の行にあります）。
       どこにあっても、data-t を持つボタンなら切り替わるようにします。 */
  document.body.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('[data-t]') : null;
    if (!b || !b.dataset.t) return;
    grab(); tab = b.dataset.t; tabSave(); msg = ''; render();
    if (!b.closest('#tabs')) window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  filtLoad();                      /* 前に絞ったままの形を思い出す */
  tabLoad();                       /* 前に開いていたタブに戻す */
  formLoad();                      /* 書きかけの記録を取り戻す */
  handLoad();                      /* 固定ボタンの位置（右利き／左利き） */
  $('#boot').hidden = true; $('#app').hidden = false;
  await reload();
  /*
   * ★「いまアツい」は時刻で中身が変わるので、
   *   1分ごとに描き直します（通信はしません）。
   *   天気は30分ごとに読み直します（気象庁・無料）。
   */
  loadWx();
  setInterval(function (){ if (tab === 'hot' || tab === 'ratio') render(); }, 60 * 1000);
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
  else records = fillRides((rs || []).map(rowToRec));
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
/* ★分のタグ。1段目に 0〜45、2段目に 50〜95（ご指示・2026/11/12
     「45までを1段目にできないのでしょうか
       できたら、区切りよく95まで追加してください」）。
     10個ずつの ます目で並べるので、どの機種でも この形で収まります。 */
const MIN_CHIPS = [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95];
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
 *    600〜900 は100円きざみ、1000〜2900 も100円きざみ。
 *  ★短い乗車は、ここから押すだけで入ります。
 *    これより大きい額は、そのまま打ち込みます。
 * ---------------------------------------------------------- */
/* ★金額のタグ。8個ずつ3段ぴったりに埋まる数にします
     （ご指示・2026/11/12「2段目のギリギリまでタブを追加してください」）。
     600〜900 の4つ＋1000〜2900 の20で、ちょうど24個です。 */
const FARE_CHIPS = [600,700,800,900].concat(
  Array.from({ length: 20 }, (_, i) => 1000 + i * 100));
/* ★乗車金額は、数字を押して足していく形にします（ご指示・2026/11/13）。
     1〜9 を1段目、0・00・000・0000・00000 を2段目に置きます。 */
const FARE_KEYS  = ['1','2','3','4','5','6','7','8','9'];
/* ★00000 は、ありえないので外しました（ご指示・2026/11/13） */
const FARE_ZEROS = ['0','00','000','0000'];

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
/**
 * この乗り場の場所が、もう分かっているか。
 *
 * ★まーく様のご指示（2026/11/13）
 *   「この地図であっている、というタグがやはりよく分かりません。
 *     場所入力時、自信を持ってピンを刺せるなら自動処理して欲しいですし、
 *     不明であれば、ピンを刺してくださいと、各乗り場の初回だけ
 *     誘導する形にしてください」
 *
 * ★「分かっている」とみなすのは、次のどれか。
 *     ① すでに記録に出てくる名前（みんなの記録ぜんぶから見ます）
 *     ② 一度でも地図で開いた名前
 *   どちらかに当たれば、何も聞かずに そのまま記録します。
 *   初めて出てきた名前のときだけ、1回だけ 地図へ誘います。
 */
function placeKnown(p){
  const k = pkey(p);
  if (!k) return true;                     // 空のときは、聞きません
  if (placeOk(p)) return true;             // ② 一度 地図で開いた
  for (let i = 0; i < records.length; i++) {
    const q = records[i].place;
    if (q && pkey(q) === k && records[i].id !== editId) return true;   // ① もう記録にある
  }
  return false;
}
/** 地図を開いた名前は、以後 聞きません */
function placeOkAdd(p){
  const k = String(p || '').trim(); if (!k || placeOk(k)) return;
  try { localStorage.setItem(PLACE_OK_KEY, JSON.stringify(placeOkList().concat([k]))); } catch (e) {}
}
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

/**
 * その1本にかけた時間（分）を、次の記録から自動で割り出します。
 *
 * ★まーく様のご指示（2026/11/12）
 *   「乗車時間は入力として不要ですし、その後の記録としての
 *     待ち時間－発車時間で、自動で割り出せるじゃないですか」
 *
 * ★同じ人・同じ営業日で、次に発車した1本の
 *   「つけ待ちを始めた時刻（発車 − 待ち）」までを数えます。
 * ★その夜の最後の1本は、次が無いので「不明」のままにします。
 *   0分として数えると、時間単価が跳ね上がって嘘になります。
 */
function autoRide(r, all){
  if (!isUnk(r.ride)) return r.ride;             // 昔の記録は、入っている値を使う
  if (isUnk(r.dep)) return null;
  let best = null;
  for (let i = 0; i < all.length; i++) {
    const x = all[i];
    if (x === r || x.user_id !== r.user_id || x.date !== r.date) continue;
    if (isUnk(x.dep) || +x.dep <= +r.dep) continue;
    const st = +x.dep - (+x.wait || 0) / 60;     // 次のつけ待ちを始めた時刻
    if (best === null || st < best) best = st;
  }
  if (best === null) return null;
  const m = Math.round((best - +r.dep) * 60);
  /* ★ありえない長さ（3時間超・マイナス）は「不明」にします。
       入力のずれを、そのまま数字にしないためです。 */
  return (m >= 0 && m <= 180) ? m : null;
}
/** 読み込んだ記録ぜんぶに、自動の乗車時間を入れます */
function fillRides(list){
  list.forEach(function (r){ r.ride = autoRide(r, list); });
  return list;
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
  /* ★いま進んでいる期は、おしりを「記録のある 一番新しい営業日」に
       します（ご指示・2026/11/13「〇/〇(曜)←最新の営業曜日」）。
     まだ来ていない日まで書くと、いつの分か分からなくなります。 */
  const ds = records.map(x => x.date).filter(Boolean).sort();
  const last = ds[ds.length - 1] || '';
  let to = r.to;
  if (to && last && last < to && (!r.from || r.from <= last)) to = last;
  const a = r.from ? fmtD(r.from) : 'はじめ';
  const b = to     ? fmtD(to)     : 'いま';
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
  (!onlyCat   || recCat(r) === onlyCat) &&
  (!onlyBig   || recBig(r) === onlyBig) &&
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
  /* ★「時間単価」はやめました（ご指示・2026/11/13）
       「大丸 ￥29,502/h という計算は明らかにおかしいのでやめてください。
         場所によってコンスタントに周回できるわけが無いですし」
       1本の金額を、待ち時間と乗車時間で1時間に伸ばした数でした。
       その1本をずっと繰り返せる前提になっていて、現実と合いません。
       代わりに「1本の平均金額」を出します。これは水増しのない数です。 */
  {
    const fr = rs.filter(hasFare);
    $('#k3').textContent = fr.length
      ? yen(fr.reduce((a,r) => a + (+r.fare || 0), 0) / fr.length) : '—';
  }
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
  /* ★「過去の記録」は、記録の画面だけに出します（ご指示・2026/11/13
       「過去の記録は記録のページだけに残して、他は出さないでください」）。
       どの画面にも出していたので、グラフを見たいときに邪魔でした。 */
  if (ktop) ktop.hidden = (tab !== 'in');
  if (ktop && !ktop.hidden) {
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
    /* ★「記録のある日」には、いつから入っているかも出します
         （ご指示・2026/11/12「記録のある日ですが、開始日も載せてください」）。 */
    who.push(ds.length ? ('記録のある日 ' + days + '日・' + rs.length + '件')
                       : '記録なし');
    if (ds.length) who.push(fmtD(ds[0]) + ' から');

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
  document.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-selected', b.dataset.t === tab));
  /* ★「集計」と「全記録」は、ご指示でなくしました（2026/11/12）。
       前の形を覚えている方のために、「記録」に戻します。 */
  /* ★書き出しと取り込みは、まーく様だけに出します（ご指示・2026/11/12）。
       ほかの乗務員の方には、要らない画面です。 */
  const PANES = { in: () => (ME.profile.is_admin ? paneOut() : ''), hot:paneHot, heat:paneHeat,
    tl:paneTl, sc:paneSc, ratio:paneRatio, bara:paneBara, kix:paneKix,
    news:paneNews, ev:paneEv, fb:paneFb };
  if (!PANES[tab]) tab = 'in';
  $('#panes').innerHTML = PANES[tab]();
  /* 新規の記録は、過去の記録より上に出します（ご指示・2026/11/13）。
     仕掛けが止まっていそうなときは、その上に 赤い帯を出します。 */
  /* ★並びは 直近の記録 → 新規の記録 → 過去の記録（ご指示・2026/11/13） */
  const pt = $('#panesTop');
  if (pt) pt.innerHTML = gasWakeBar() +
    ((tab === 'in') ? (paneInRecent() + paneInNew()) : '');
  /* 題の下の一文（前日の万収をほめる） */
  const sb = $('#sub');
  if (sb) sb.textContent = subLine();
  if (tab === 'news') newsSeen();
  /* ★イベントを開いたら、赤い点は消します（ご指摘・2026/11/12
       「イベント、スクロールし終えても、タブにある、赤い丸が消えません」）。
     見たのに点が残ると、いつまでも新しいものがあるように見えます。 */
  if (tab === 'ev') { const d2 = $('#evDot'); if (d2) d2.hidden = true; }
  menuDot();
  wire();
}
const msgHTML = id => `<span class="msg ${msgBad?'bad':''}" id="${id}">${esc(msg)}</span>`;
let impMsg = '', impMsgBad = false;
const impMsgHTML = id => `<span class="msg ${impMsgBad?'bad':''}" id="${id}">${esc(impMsg)}</span>`;
const ibad = t => { impMsg = t; impMsgBad = true;  render(); };
const iok  = t => { impMsg = t; impMsgBad = false; render(); };
const emptyCard = t => `<div class="card"><div class="empty">${t}</div></div>`;

/* ---- 記録する ---- */
/*
 * ★地図は、いつでも開けるようにしておきます。
 *   「地図は合っている」という印のタグは、やめました
 *   （ご指示・2026/11/13「やはりよく分かりません」）。
 *   もう記録にある乗り場なら、何も聞かずに そのまま記録します。
 *   初めて出てきた名前のときだけ、1行で地図へ誘います。
 */
/* ★並びは 新規の記録 → 過去の記録 → 直近の記録（ご指示・2026/11/13）。
     「過去の記録」は index.html の #ktop なので、
     新規のぶんだけを先に（#panesTop）、直近のぶんをあとに（#panes）出します。 */
function paneInNew(){
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
      <div class="f w2"><label>乗車場所<em class="req">＊必須</em></label>
        <input class="ja" id="f_place" list="pls" placeholder="新地7" value="${esc(f.place || '')}">
        <datalist id="pls">${pl.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        ${(() => { const sug = placeAskOk[f.place] ? '' : placeSuggest(f.place);
          return sug ? `<div class="psug">もしかして、<b>${esc(sug)}</b> と同じですか？
            <button class="chip on" data-psug="${esc(sug)}">${esc(sug)} にする</button>
            <button class="chip" data-pkeep="1">このままでよい</button></div>` : ''; })()}
        <div class="chips">${pl.map(p => `<button class="chip ${f.place===p?'on':''}" data-set="place" data-val="${esc(p)}">${esc(p)}</button>`).join('')}</div>
        <div class="chips">
          <a class="chip ${f.place ? '' : 'off'}" id="f_map"
             href="${f.place ? esc(mapUrl(f.place)) : '#'}" target="_blank" rel="noopener">📍 地図</a>
          <button class="chip rst" data-clr="place">リセット</button>
        </div>
        ${f.place && !placeKnown(f.place) ? `<div class="pnew">
          はじめての乗り場です。<b>📍 地図</b>を開いて、場所を確かめてください。
          <a class="chip on" id="f_mappin" href="${esc(mapUrl(f.place))}"
             target="_blank" rel="noopener">📍 地図でひらく</a></div>` : ''}
      </div>
      <div class="f w2"><label>発車時間<em class="req">＊必須</em></label>
        <input id="f_dep" inputmode="numeric" placeholder="0330" value="${esc(f.dep || '')}">
        <!-- ★時と分を、押すだけで入れられるようにします（ご指示・2026/11/12）。
               走りながら打つので、字を打たせない形にします。 -->
        <div class="chips deps">${DEP_H.map(h =>
          `<button class="chip ${depPart(f.dep).h===h?'on':''}" data-dh="${h}">${h}</button>`).join('')}</div>
        <div class="chips deps">${DEP_M.map(m =>
          `<button class="chip ${depPart(f.dep).m===m?'on':''}" data-dm="${m}">${m}</button>`).join('')}</div>
        <div class="chips"><button class="chip rst" data-clr="dep">リセット</button></div>
        <div class="hint" id="depHint"></div></div>
      <div class="f w2"><label>乗車金額</label>
        <input id="f_fare" inputmode="numeric" placeholder="1500" value="${f.fare ?? ''}">
        <!-- ★よく出る金額は、押すだけで入れられるようにします
               （ご指示・2026/11/12）。これより大きい額は、打ち込みます。 -->
        <!-- ★数字を足していく形にします（ご指示・2026/11/13）
               「1、2、3、4、5、6、7、8、9／0、00、000、0000、00000
                 という形で、数値追加できる形にしてください」
               押すたびに、うしろに足されます。打ち込むより速いためです。 -->
        <div class="chips fares">${FARE_KEYS.map(v =>
          `<button class="chip" data-fa="${v}">${v}</button>`).join('')}</div>
        <div class="chips fares z0">${FARE_ZEROS.map(v =>
          `<button class="chip" data-fa="${v}">${v}</button>`).join('')}</div>
        <div class="chips fares z">
          <button class="chip" data-fa="BS">←1つ消す</button>
          <button class="chip rst" data-clr="fare">リセット</button></div></div>

      <!-- ★欄の名前は、記録用スプレッドシートと同じ言い方にそろえます
             （ご指示・2026/11/12）。書き方がゆれると、同じものを
             別のものだと思わせてしまいます。
             営業曜日／乗車場所／発車時間／乗車金額／待ち時間／
             乗車種類／そのほか
             （LINEに書く順と同じ・ご指示 2026/11/12） -->
      <!-- ★乗車時間の欄は、なくしました（ご指示・2026/11/12）
             「乗車時間は入力として不要ですし、その後の記録としての
               待ち時間－発車時間で、自動で割り出せるじゃないですか」
             次の1本の「つけ待ちを始めた時刻」までが、この1本にかけた
             時間になるので、こちらで自動で出します。
             その夜の最後の1本だけは、次が無いので「不明」です。 -->
      <datalist id="mins">${MIN_ALL.map(v => `<option value="${v}">`).join('')}</datalist>
      <div class="f w2"><label>待ち時間</label>
        <input id="f_wait" inputmode="numeric" list="mins" placeholder="15" value="${f.wait ?? ''}">
        <!-- ★待ち時間も、数字を足していく形にします（ご指示・2026/11/13）
               「待ち時間のタブも 1、2、3、4、5、6、7、8、9、0 にしてください」 -->
        <div class="chips fares">${FARE_KEYS.map(v =>
          `<button class="chip" data-wa="${v}">${v}</button>`).join('')}</div>
        <div class="chips fares z">
          <button class="chip" data-wa="0">0</button>
          <button class="chip" data-wa="BS">←1つ消す</button>
          <button class="chip rst" data-clr="wait">リセット</button></div></div>

      <!-- ★記録用スプレッドシートの「種」と「他」に合わせた欄（2026/10/26 追加） -->
      <div class="f w2"><label>乗車種類</label>
        <input class="ja" id="f_method" list="mts" placeholder="GO" value="${esc(f.method || '')}">
        <datalist id="mts">${METHODS.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
        <div class="chips">${METHOD_CHIPS.map(m => chip(m, f.method, 'method')).join('')}
          <button class="chip rst" data-clr="method">リセット</button></div>
      </div>
      <div class="f w2"><label>そのほか</label>
        <input class="ja" id="f_note" placeholder="行先：新金岡駅（堺市）" value="${esc(f.note || '')}">
        <div class="chips">${NOTE_CHIPS.map(n => chip(n, f.note, 'note')).join('')}
          <button class="chip rst" data-clr="note">リセット</button></div></div>
    </div>
    <div class="actions">
      <button class="btn" id="add">${editId ? '書きかえる' : '記録する'}</button>
      ${editId ? `<button class="btn ghost" id="cancel">やめる</button>` : ''}
      ${msgHTML('msg')}
    </div>
  </div>

  `;
}

function paneInRecent(){
  return `
  <div class="card">
    <h2>直近の記録</h2>
    <!-- ★ここでも乗り場を選べるようにします（ご指示・2026/11/12） -->
    <div class="ktplace">
      <select class="fsel" id="ktPlace2"></select>
    </div>
    <div class="ktfind">
      <input class="ja" id="ktFind2" data-find="ktSug2" placeholder="乗り場をさがす（例：梅田）">
      <div class="fsug" id="ktSug2"></div>
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
/* 中カテゴリー（これまでの大カテゴリー）。エリアが近い順に並べます */
const CAT_ORDER = ['北7', '北4', '北他', 'ﾐﾅﾐ', '関空', 'ﾊﾞﾗｼ', 'ほか'];

/* ★大カテゴリー（ご指示・2026/11/12）
     「大カテゴリーが 北、南、他 として
       今まで大カテゴリーを中カテゴリーとしてください
       関空やバラシも、他扱いとします」 */
const BIG_CATS = [
  { k: '北', subs: ['北7', '北4', '北他'] },
  { k: '南', subs: ['ﾐﾅﾐ'] },
  { k: '他', subs: ['関空', 'ﾊﾞﾗｼ', 'ほか'] }
];
const BIG_ORDER = BIG_CATS.map(b => b.k);
/** 中カテゴリーから、大カテゴリーを引きます */
function bigOf(sub){
  for (let i = 0; i < BIG_CATS.length; i++) if (BIG_CATS[i].subs.indexOf(sub) !== -1) return BIG_CATS[i].k;
  return '他';
}
/** その記録の大カテゴリー */
function recBig(r){ return bigOf(recCat(r)); }

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
/* 大きなまとまり（北・南・他）をえらんだ印。乗り場の名前と見分けるため */
const BIGSEL = '\u0002';
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
  /* ★大きなまとまり（北・南・他）でも えらべるようにします
       （ご指摘・2026/11/13「中カテゴリーの 北、南、他の選択が出来ませんが」）。
     タグを押さなくても、このプルダウン1つで切り替えられます。 */
  const bn = {};
  records.forEach(function (r){ if (r.place) bn[recBig(r)] = (bn[recBig(r)] || 0) + 1; });
  const bl = BIG_ORDER.filter(k => bn[k]);
  if (bl.length) {
    out += '<optgroup label="エリア">';
    bl.forEach(function (k) {
      out += '<option value="' + BIGSEL + esc(k) + '"' +
             (onlyBig === k && !onlyPlace ? ' selected' : '') + '>' +
             esc(k) + 'エリア（' + bn[k] + '件）</option>';
    });
    out += '</optgroup>';
  }
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

/**
 * 期間のえらび。
 * ★「今期」「前期」のような言い方はやめ、日付だけを出します
 *   （ご指示・2026/11/13「今期、前期～とかいりません 日付だけを載せる形にして」）。
 * ★いま進んでいる期の終わりは、期の最後の日ではなく
 *   **記録のある 一番新しい営業日** にします
 *   （ご指示・2026/11/13「10/16(金)〜〇/〇(曜)←最新の営業曜日」）。
 *   まだ来ていない日まで書くと、いつの分か分からなくなるためです。
 */
function periodOptions(){
  const o = ['<option value="all"' + (period.mode === 'all' ? ' selected' : '') +
             '>全期間</option>'];
  /* 記録のある 一番新しい営業日 */
  const ds = records.map(r => r.date).filter(Boolean).sort();
  const last = ds[ds.length - 1] || today();
  cycleList().forEach(function (c, i) {
    /* いま進んでいる期だけ、おしりを「最新の営業日」にします */
    const to = (c.from <= last && last <= c.to) ? last : c.to;
    o.push('<option value="c' + i + '"' + (period.mode === 'c' + i ? ' selected' : '') +
           '>' + fmtD(c.from) + '〜' + fmtD(to) + '</option>');
  });
  o.push('<option value="free"' + (period.mode === 'free' ? ' selected' : '') +
         '>自分で決める…</option>');
  return o.join('');
}
/* 営業曜日の区分（ご指示・2026/11/13）。
 *   「平日を1番左にしてください」
 *   「金・祝前日だけにして」… 金曜ひとつぶんの区分は、これ1つだけにします。
 *   「全曜日」のタグはやめ、右端の【リセット】で すべてに戻します。 */
const DAY_CHIPS = [{ k:'d-wd', n:'平日' }, { k:'d-fri', n:'金・祝前日' },
  { k:'d-sat', n:'土' }, { k:'d-sun', n:'日・祝' }];

/* 期間の切り替え（上の区切りの中に出します・ご指示・2026/11/12） */
const periodBox = () => `
  <select class="fsel ${period.mode!=='all'?'on':''}" data-filt="period">${periodOptions()}</select>
  ${period.mode === 'free' ? `<div class="filt2 prange">
    <label><span>はじめの日</span>
      <input type="date" data-filt="from" value="${esc(period.from)}"></label>
    <label><span>おわりの日</span>
      <input type="date" data-filt="to" value="${esc(period.to)}"></label>
  </div>` : ''}`;

/* 大カテゴリーのタグ（ご指示・2026/11/12）。'' は「すべて」 */
const CAT_CHIPS = [''].concat(CAT_ORDER);

/**
 * 絞り込みのタグ。
 *   full を true にすると、大カテゴリーと期間も出します。
 *   ★グラフの画面では、上まで戻らずに切り替えられることが大事です。
 */
const filterChips = (full) => `<div class="filt">
  <div class="chips">
    <button class="chip ${onlyMine?'':'on'}" data-mine="0">全員</button>
    <button class="chip ${onlyMine?'on':''}" data-mine="1">自分だけ</button>
    ${filtOn() ? '<button class="chip warn rst" id="fClear">絞り込みを解除</button>' : ''}
  </div>
  <!-- ★営業曜日の区分でも、すぐ切り替えられるようにします（ご指示・2026/11/12）。
       平日と土日祝では、売上の出方がまるで違うためです。 -->
  <div class="chips daych">
    ${DAY_CHIPS.map(d => `<button class="chip ${onlyDay===d.k?'on':''}" data-day="${d.k}">${d.n}</button>`).join('')}
    <button class="chip rst" data-day="">リセット</button>
  </div>
  <!-- ★いま何で絞っているかを、タグのすぐ下に出します。
       絞ったまま忘れると、数字を読み違えます。 -->
  ${filtOn() ? `<div class="fnow">いま：${
    [onlyBig ? esc(onlyBig) : '', onlyCat ? esc(onlyCat) : '',
     onlyPlace ? esc(splitSel(onlyPlace).place || onlyPlace) : '',
     (DAY_CHIPS.filter(d => d.k === onlyDay)[0] || {}).n || '',
     periodLabel()].filter(Boolean).join('／')
  }</div>` : ''}
  ${full ? `<div class="chips catch">
    <button class="chip ${!onlyBig?'on':''}" data-big="">すべて</button>
    ${BIG_ORDER.map(k => `<button class="chip big ${onlyBig===k?'on':''}" data-big="${esc(k)}">${k}</button>`).join('')}
  </div>
  <div class="chips catch sub">
    <button class="chip ${!onlyCat?'on':''}" data-cat="">${onlyBig ? onlyBig + '：すべて' : '中分類：すべて'}</button>
    ${(onlyBig ? (BIG_CATS.filter(b => b.k === onlyBig)[0] || {subs:[]}).subs : CAT_ORDER)
      .map(k => `<button class="chip ${onlyCat===k?'on':''}" data-cat="${esc(k)}">${k}</button>`).join('')}
  </div>
  <div class="fperiod">${periodBox()}</div>` : ''}
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
    return head + '<tr>' +
      '<td class="c-who ' + whoCls(r.user_id) + '">' + esc(kana(r.who)) + '</td>' +
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
 *    （2026/11/13 のご指示で「キラ」に戻しました）。
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
  return '近日中、誰かがワンメータを乗せたら、〝' + kiraToday() + '〟がキラです';
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
/* ---- 表グラフ（時間帯 × 乗り場） ---- */
/**
 * ★「まとめすぎて雑すぎる」とのご指摘（2026/11/12）。直したところ：
 *   ・上位10か所で切っていたのをやめ、乗り場は ぜんぶ出します
 *   ・大カテゴリー（関空・ﾊﾞﾗｼ・北7…）ごとに、表を分けます
 *   ・並びは CAT_ORDER のまま。エリアの近い順に上から並びます
 *   ・期間と大カテゴリーは、この画面のタグで切り替えられます
 */
/**
 * 乗り場の名前を、左の欄に収まる行に折り返します。
 *
 * ★まーく様のご指摘（2026/11/13）「見切れてます、直してください」
 *   長い名前（天満モスバーガー前 など）が、左にはみ出して切れていました。
 * ★「…」で切ることはしません（ご指示・2026/11/12）。
 *   どこの乗り場か分からなくなるためです。折り返して、ぜんぶ出します。
 *
 *   幅の見当：全角は字の大きさぶん、半角はその約55%で数えます。
 */
function wrapLabel(txt, maxW, fs){
  const t = String(txt || '');
  const wOf = c => (/[\x00-\xff\uff61-\uff9f]/.test(c) ? fs * 0.55 : fs);
  const lines = []; let cur = '', cw2 = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i], cwid = wOf(c);
    if (cur && cw2 + cwid > maxW) { lines.push(cur); cur = c; cw2 = cwid; }
    else { cur += c; cw2 += cwid; }
  }
  if (cur) lines.push(cur);
  return lines;
}
/** 3行に収まる字の大きさを選びます（収まらなければ、小さくしていきます） */
function fitLabel(txt, maxW){
  for (const fs of [12, 11, 10, 9, 8]) {
    const L = wrapLabel(txt, maxW, fs);
    if (L.length <= 3) return { fs: fs, lines: L };
  }
  const L = wrapLabel(txt, maxW, 8);
  return { fs: 8, lines: L.slice(0, 3) };
}

function heatSvg(rows, pls, hrs, mx, sumLabel){
  /* ★22時までは、横にスクロールせずに見られるようにします
       （ご指示・2026/11/13「22時まではしっかり1画面で見れるように」）。
       画面の広さから、1時間ぶんの幅を決めます。
       マスが小さくなりすぎないよう、下限は決めてあります。 */
  const vw   = Math.max(260, (typeof window !== 'undefined' ? window.innerWidth : 390) - 56);
  const lw   = vw < 300 ? 56 : vw < 340 ? 64 : 76;  /* 左の名前の欄 */
  const need = Math.max(1, Math.min(hrs.length, 22 - hrs[0] + 1));  /* 22時までの本数 */
  /* 下限は36。これより細いと「¥11,200」が収まらず、字が切れます。
     収まらない幅の機種では、22時までが少しだけ横にずれます。
     読めない数字を出すより、そのほうがましです。 */
  const cw   = Math.max(36, Math.min(64, Math.floor((vw - lw) / need)));
  /* ★マスの中は「¥13,200」のように、そのまま出します
       （ご指示・2026/11/13「〇〇Kって書き方は全然馴染みがないので ￥〇〇としてください」）。
       一番大きい金額の字数に合わせて、はみ出さない大きさにします。 */
  const dig = Math.max(4, String(yen(mx)).length);
  const fz1 = Math.min(11.5, Math.max(7, (cw - 5) / dig / 0.72));
  const fz2 = Math.max(6.5, fz1 - 2.5);
  const ch = 42;
  const w = lw + hrs.length * cw + 8, hgt = 34 + (pls.length + 1) * ch + 8;
  const cell = (p, h) => {
    const t = rows.filter(r => (p === null || r.place === p) && Math.floor(r.dep) === h);
    return { n: t.length, avg: t.filter(hasFare).length
        ? t.filter(hasFare).reduce((a,r)=>a+(+r.fare||0),0)/t.filter(hasFare).length : 0,
             fare: t.length ? t.reduce((a,r)=>a+(+r.fare||0),0)/t.length : 0 };
  };
  let s = `<svg viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}">`;
  hrs.forEach((h,i) => s += `<text class="axis" x="${lw+i*cw+cw/2}" y="22" text-anchor="middle">${h}時</text>`);
  const row = (label, p, y) => {
    /* ★名前は、左の欄に収まるよう折り返します。切りません。 */
    const fit = fitLabel(label, lw - 10);
    const top = y + ch/2 + 4 - (fit.lines.length - 1) * (fit.fs + 1) / 2;
    let o = `<text class="axis" x="${lw-6}" text-anchor="end"
      style="font-family:var(--body);font-size:${fit.fs}px">${
      fit.lines.map((ln,k) => `<tspan x="${lw-6}" y="${top + k*(fit.fs+1)}">${esc(ln)}</tspan>`).join('')
    }</text>`;
    hrs.forEach((h,i) => { const c = cell(p,h), x = lw+i*cw, t = c.n ? Math.min(1, c.avg/mx) : 0;
      o += `<g data-tip="${esc(label)} ${h}時台&#10;件数 ${c.n}件&#10;1本の平均金額 ${c.n?yen(c.avg):'—'}&#10;平均 待ち ${c.n?Math.round(c.wait)+'分':'—'}">
        <rect x="${x+2}" y="${y+2}" width="${cw-4}" height="${ch-4}" rx="4" fill="${c.n?`rgba(240,163,59,${.10+t*.82})`:'rgba(255,255,255,.03)'}" stroke="#243350"/>
        ${c.n ? `<text class="glab" x="${x+cw/2}" y="${y+ch/2-1}" text-anchor="middle" style="font-size:${fz1}px" fill="${t>.55?'#14100A':'#EDE6D8'}">${yen(c.avg)}</text>
        <text class="glab" x="${x+cw/2}" y="${y+ch/2+12}" text-anchor="middle" style="font-size:${fz2}px" fill="${t>.55?'#4A3A1E':'#8A99B5'}">${cw >= 44 ? '平均・' + c.n + '件' : c.n + '件'}</text>` : ''}
      </g>`; });
    return o; };
  pls.forEach((p,i) => s += row(p, p, 34+i*ch));
  s += `<line x1="${lw}" x2="${w-8}" y1="${34+pls.length*ch+1}" y2="${34+pls.length*ch+1}" class="grid-l"/>`;
  s += row(sumLabel || 'エリア計', null, 34+pls.length*ch+2) + '</svg>';
  return s;
}

function paneHeat(noChips){
  /* 時刻が不明なものは、時間帯の表には置けません（どこに入れてよいか分からないため） */
  const R = visible().filter(hasDep);
  const head = `<div class="card"><h2>表グラフ</h2>
    <p class="note">えらんだ期間の記録を、<b>時間帯 × 乗り場</b>で並べた表です。
      マスの数字は、<b>その枠の平均金額（1本当たり）</b>です。下は件数。
      濃いマスほど、1本が大きい枠です。
      まずは3件以上そろったマスだけ信じてください。</p>
    ${noChips ? '' : filterChips(true)}</div>`;
  if (!R.length) return head + emptyCard('該当データがありません');

  const hs = R.map(r => Math.floor(r.dep));
  const hrs = []; for (let h = Math.min(...hs); h <= Math.max(...hs); h++) hrs.push(h);

  /* 一番濃いマスは、表ぜんたいで共通にします。
     表ごとに色の基準が変わると、見比べられません。 */
  let mx = 1;
  const pl = {};
  R.forEach(r => { const p = r.place; if (p) (pl[p] = pl[p] || []).push(r); });
  Object.keys(pl).forEach(p => hrs.forEach(h => {
    const t = pl[p].filter(r => Math.floor(r.dep) === h);
    const tf = t.filter(hasFare);
    if (tf.length) mx = Math.max(mx, tf.reduce((a,r)=>a+(+r.fare||0),0)/tf.length);
  }));

  /* ★大カテゴリー（北・南・他）ごとに1枚（ご指示・2026/11/12）。
       「北7は既に限定的に絞られてるのに、このエリア計っていうのは、
         まるで意味がわからない」
       → 合計を出すのは、北・南・他のような まとまりのある単位だけにします。
       中は、中カテゴリー（北7・北4…）の順に並べます。 */
  let body = '';
  BIG_CATS.forEach(function (bg){
    const rows = R.filter(r => recBig(r) === bg.k);
    if (!rows.length) return;
    /* 中カテゴリーの順 → その中は件数の多い順 */
    const pls = [];
    bg.subs.forEach(function (sub){
      [...new Set(rows.filter(r => recCat(r) === sub).map(r => r.place).filter(Boolean))]
        .map(p => ({ p: p, n: rows.filter(r => r.place === p).length }))
        .sort((x,y) => y.n - x.n || (x.p < y.p ? -1 : 1))
        .forEach(o => pls.push(o.p));
    });
    if (!pls.length) return;
    body += `<div class="card"><h2>${esc(bg.k)}エリア</h2>
      <p class="note">乗り場 ${pls.length}か所・${rows.length}件。</p>
      <div class="snote">← 横にスクロールできます（横画面推奨）</div>
      <div class="scroll fb">${heatSvg(rows, pls, hrs, mx, bg.k + 'エリア計')}</div></div>`;
  });
  if (!body) return head + emptyCard('該当データがありません');

  return head + body +
    `<div class="card"><div class="legend">
      <span><i style="background:rgba(240,163,59,.15)"></i>薄い＝1本が小さい</span>
      <span><i style="background:rgba(240,163,59,.92)"></i>濃い＝1本が大きい</span>
      <span>一番濃いマスの平均 ${yen(mx)}</span></div></div>`;
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
    const rt = a.filter(hasFare).map(function (r){ return +r.fare || 0; });
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
    /* 15分ごと（これから先の分だけ） */
    const q = [];
    const mq = j.minutely_15 || {};
    const mt = mq.time || [];
    for (let i = 0; i < mt.length; i++) {
      const w = String(mt[i]).split(/[-T:]/).map(Number);
      const tt = new Date(w[0], w[1] - 1, w[2], w[3], w[4] || 0).getTime();
      if (tt < d.getTime() - 15 * 60000) continue;
      const ic2 = wcIcon(mq.weather_code ? mq.weather_code[i] : 0);
      q.push({ lb: pad(w[3]) + ':' + pad(w[4] || 0), icon: ic2.e,
               temp: mq.temperature_2m ? mq.temperature_2m[i] : null,
               mm: mq.precipitation ? mq.precipitation[i] : null });
      if (q.length >= 24) break;
    }
    /* 日ごと（2週間ぶん） */
    const dys = [];
    const dd = j.daily || {};
    const dt = dd.time || [];
    for (let i = 0; i < dt.length; i++) {
      const ic3 = wcIcon(dd.weather_code ? dd.weather_code[i] : 0);
      dys.push({ d: String(dt[i]), icon: ic3.e,
                 max: (dd.temperature_2m_max || [])[i], min: (dd.temperature_2m_min || [])[i],
                 pop: (dd.precipitation_probability_max || [])[i] });
    }
    const cur = j.current || {};
    const ci  = wcIcon(cur.weather_code);
    const dl  = j.daily || {};
    const h0  = hours[0] || null;
    return { ok: true, icon: ci.e, name: ci.n, temp: cur.temperature_2m, q: q, days: dys,
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

/* ★天気の細かさ（ご指示・2026/11/12）
     「できれば、5分ごと、1時間ごと、今日明日、2週間 で切り替えできませんか？」
   ★15分ごとが、無料で取れる一番細かい刻みです。5分ごとは出ていないので、
     出せないものを「5分」と書かず、正直に「15分」と書きます。 */
const WX_SPANS = [
  { k: 'm15', n: '15分' }, { k: 'h1', n: '1時間' },
  { k: 'd2',  n: '今日・明日' }, { k: 'd14', n: '2週間' }
];
let wxSpan = 'h1';

/** 15分ごと（これから6時間ぶん） */
function omQuarter(o){
  const q = o.q || [];
  return q.slice(0, 24);
}
/** 日ごと（今日から n 日ぶん） */
function omDays(o, n){
  return (o.days || []).slice(0, n);
}

/** 営業時間（17時〜翌4時）の、1時間ごとの天気。横に流して見ます */
function wxHoursHTML(){
  const o = hotOm;
  if (!o || !o.ok) return wxNextHTML(hotWx);
  const tabs = '<div class="chips wxsp">' + WX_SPANS.map(function (x){
    return '<button class="chip ' + (wxSpan === x.k ? 'on' : '') + '" data-wxsp="' + x.k + '">' +
      x.n + '</button>';
  }).join('') + '</div>';

  let cells = '', note = '';
  if (wxSpan === 'm15') {
    const q = omQuarter(o);
    if (!q.length) return tabs + '<p class="note">15分ごとの分が、いま取れていません。</p>';
    cells = q.map(function (x){
      const rain = (x.mm !== null && x.mm !== undefined && x.mm > 0);
      return '<div class="wxh">' +
        '<small>' + esc(x.lb) + '</small><div class="wi">' + x.icon + '</div>' +
        '<b>' + tmp(x.temp) + '</b>' +
        '<span class="' + (rain ? 'rain' : '') + '">' +
        (x.mm === null || x.mm === undefined ? '—' : (Math.round(x.mm * 10) / 10) + 'mm') +
        '</span></div>';
    }).join('');
    note = 'これから6時間を15分ごとに。数字は雨の量（mm）です。';
  } else if (wxSpan === 'd2' || wxSpan === 'd14') {
    const n = (wxSpan === 'd2') ? 2 : 14;
    const ds = omDays(o, n);
    if (!ds.length) return tabs + '<p class="note">日ごとの分が、いま取れていません。</p>';
    cells = ds.map(function (x){
      const hot = (x.pop !== null && x.pop !== undefined && x.pop >= 50);
      return '<div class="wxh wide ' + dayCls(x.d) + '">' +
        '<small>' + esc(fmtD(x.d)) + '</small><div class="wi">' + x.icon + '</div>' +
        '<b>' + tmp(x.max) + '<i>' + tmp(x.min) + '</i></b>' +
        '<span class="' + (hot ? 'rain' : '') + '">' +
        (x.pop === null || x.pop === undefined ? '—' : x.pop + '%') + '</span></div>';
    }).join('');
    note = (n === 2 ? '今日と明日。' : 'これから2週間。') + '上が最高、下が最低の気温です。';
  } else {
    if (!o.hours.length) return tabs + '<p class="note">1時間ごとの分が、いま取れていません。</p>';
    cells = o.hours.map(function (x){
      const pop = (x.pop === null) ? '—' : (x.pop + '%');
      return '<div class="wxh' + (x.now ? ' now' : '') + '">' +
        '<small>' + x.h + '時</small><div class="wi">' + x.icon + '</div>' +
        '<b>' + tmp(x.temp) + '</b>' +
        '<span class="' + (x.pop !== null && x.pop >= 50 ? 'rain' : '') + '">' + pop + '</span>' +
        '</div>';
    }).join('');
    note = '翌4時まで。横にスクロールできます。';
  }
  return tabs + '<div class="scroll fb"><div class="wxhs">' + cells + '</div></div>' +
         '<p class="note">' + note + '</p>';
}

/**
 * 雨雲レーダー（いまの雨）を、画面の中に出します。
 *
 * ★まーく様のご指示（2026/11/12）
 *   「リアルタイムの雨雲レーダーも、webサイト上に載せられるのなら
 *     大変ありがたいです」
 *
 * ★地図は OpenStreetMap、雨雲は 気象庁のナウキャスト。どちらも無料・鍵なしです。
 *   読めなくても、下の「気象庁で見る」ボタンは残ります（止まらない形）。
 */
function radarCard(){
  return '<div class="card"><h2>雨雲レーダー</h2>' +
    '<p class="note">いまの雨雲です。大阪のまん中を出しています。指で動かせます。</p>' +
    '<div id="radarMap" class="radarmap">読み込んでいます…</div>' +
    '<div class="actions rdr"><span class="msg" id="radarTime"></span>' +
    '<button class="mini" id="radar">気象庁で見る</button></div></div>';
}

/* 地図を出す係。1枚の画面に1回だけ組み立てます */
let radarMap = null;
function radarBoot(){
  const box = document.getElementById('radarMap');
  if (!box) { radarMap = null; return; }
  if (radarMap && radarMap._box === box) return;

  /* 時刻の字（20261113070500＝世界の時刻）を、日本の時刻に直します */
  const jstOf = function (v){
    const t = String(v || '');
    if (t.length < 12) return '';
    const d = new Date(Date.UTC(+t.slice(0,4), +t.slice(4,6) - 1, +t.slice(6,8),
                                +t.slice(8,10), +t.slice(10,12)));
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  const go = function (){
    try {
      if (typeof L === 'undefined') { box.textContent = '地図が読めませんでした。下のボタンから見られます。'; return; }
      box.textContent = '';
      const m = L.map(box, { attributionControl: true, zoomControl: true }).setView([34.7025, 135.4959], 10);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 15, attribution: '© OpenStreetMap' }).addTo(m);
      m._box = box; radarMap = m;

      /* ★雨雲は、気象庁の「高解像度降水ナウキャスト」を出します
           （ご指摘・2026/11/13「なんか、変な英語出てますが」）。
         ★前は RainViewer を出していましたが、あちらは拡大すると
           「Zoom Level Not Supported」という英語の絵を返してきます。
           いまの大きさ（10）では、その絵しか出ていませんでした。
         ★気象庁のものは 鍵も要らず、拡大しても ちゃんと出ます。
           日本の気象庁が出している、公式のものです。 */
      const jma = function (){
        return fetch('https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json',
                     { cache: 'no-store' })
          .then(r => r.json())
          .then(function (j){
            const o = (j && j.length) ? j[0] : null;
            if (!o || !o.basetime) throw new Error('時刻が取れない');
            L.tileLayer('https://www.jma.go.jp/bosai/jmatile/data/nowc/' +
              o.basetime + '/none/' + o.validtime + '/surf/hrpns/{z}/{x}/{y}.png',
              { opacity: 0.68, maxZoom: 15, maxNativeZoom: 10,
                attribution: '気象庁ナウキャスト' }).addTo(m);
            const el = document.getElementById('radarTime');
            if (el) el.textContent = jstOf(o.validtime) + ' の雨雲（気象庁）';
          });
      };
      /* 気象庁が読めなかったときだけ、RainViewer に落とします。
         そのときは 拡大しすぎないようにして、英語の絵が出ないようにします。 */
      const rv = function (){
        return fetch('https://api.rainviewer.com/public/weather-maps.json', { cache: 'no-store' })
          .then(r => r.json())
          .then(function (j){
            const fr = (j && j.radar && j.radar.past) ? j.radar.past : [];
            const last = fr[fr.length - 1];
            if (!last) return;
            L.tileLayer(j.host + last.path + '/256/{z}/{x}/{y}/2/1_1.png',
              { opacity: 0.65, maxZoom: 15, maxNativeZoom: 7 }).addTo(m);
            const t = new Date(last.time * 1000);
            const el = document.getElementById('radarTime');
            if (el) el.textContent = pad(t.getHours()) + ':' + pad(t.getMinutes()) + ' の雨雲';
          });
      };
      jma().catch(function (){ rv().catch(function (){}); });

      setTimeout(function (){ try { m.invalidateSize(); } catch (e) {} }, 200);
    } catch (e) { box.textContent = '地図が読めませんでした。下のボタンから見られます。'; }
  };
  /* Leaflet をまだ読んでいなければ、ここで読みます（無料・鍵なし） */
  if (typeof L !== 'undefined') return go();
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
  document.head.appendChild(css);
  const sc = document.createElement('script');
  sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
  sc.onload = go;
  sc.onerror = function (){ box.textContent = '地図が読めませんでした。下のボタンから見られます。'; };
  document.head.appendChild(sc);
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
    '全期間の表は【表グラフ】のほうです。</p>' +
    wxNowHTML() + wxHoursHTML() + '</div>' + radarCard();

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
      '<div class="hv"><i>平均</i>' + yen(x.avg) + '</div>' +
      '<div class="hs">' + x.n + '件・平均 ' + yen(x.fare) + '・待ち ' + Math.round(x.wait) + '分</div>' +
      '<span class="mini">📍 地図</span></a>';
  }).join('');

  const bars = got.rows.slice(0, 8).map(function (x){
    return '<tr><td><a class="plink" href="' + hotMap(x.p) + '" target="_blank" rel="noopener">' +
      esc(x.p) + '</a></td><td class="n">' + x.n + '</td>' +
      '<td class="n" style="color:var(--meter)">平均 ' + yen(x.avg) + '</td>' +
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
    '<th class="n">1本の平均</th><th style="width:34%"></th><th class="n">待ち</th>' +
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
        '<b>' + esc(s.top.p) + '</b><span>平均 ' + yen(s.top.avg) + '・' + s.top.n + '件</span></a>';
    }).join('') + '</div></div></div>';
}

/** 注意書き（短く。長い説明は読まれません） */
function hotNoteCard(got){
  return '<div class="card"><h2>読むときの注意</h2>' +
    '<p class="note" style="margin:0">' +
    '・' + HOT_MIN_N + '件より少ない場所は出しません（1件は、たまたまの1本です）。<br>' +
    '・催しがある夜は、記録より催しが勝ちます。終演の15分前に着けるのが先です。<br>' +
    '・数字は1本の平均金額です。待ち時間は、すぐ横に分けて出しています。' +
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
  '&minutely_15=temperature_2m,precipitation,weather_code' +
  '&hourly=temperature_2m,precipitation_probability,weather_code' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&timezone=Asia%2FTokyo&forecast_days=14';
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
  if (!R.length) return `<div class="card"><h2>横棒グラフ</h2>${filterChips(true)}
    <div class="empty">該当データがありません</div></div>`;
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
  /* ★「大きくなってません」とのご指摘（2026/11/12）。
       1行をさらに高く、1時間ぶんの幅も広げます。
       横画面（およそ810px）に、19〜29時がちょうど収まる大きさです。 */
  /* ★左の日付を短くして、表の中身を広く取ります
       （ご指示・2026/11/13「もっと左の日付部分スマートに短くできませんか？
         1番大事なのは表の中身なので、表の中身が1画面でできるだけ
         はっきり見られる形に見直してください」）。
       「11/11(水)」→「11/11 水」。左の欄は120→56に。
       1行の高さも88→58にして、1画面に入る日数を増やします。 */
  const L = 56, Rp = 16, rowH = 58;
  /* ★1時間ぶんの幅は、表グラフと同じ考え方で決めます。
       22時までは、横にスクロールせずに見られる大きさにします。 */
  const vwT  = Math.max(260, (typeof window !== 'undefined' ? window.innerWidth : 390) - 56);
  const need = Math.max(1, Math.min(x1 - x0, 22 - x0));
  const cwT  = Math.max(30, Math.min(52, Math.floor((vwT - L - Rp) / need)));
  const W = L + Rp + Math.max(1, (x1 - x0)) * cwT;
  const H = 62 + ds.length*rowH + 20;
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
    /* 「11/11(水)」は長いので、かっこを外して「11/11 水」にします */
    s += `<text class="axis" x="${L-8}" y="${y+26}" text-anchor="end" fill="${dcol(d)}"
      style="font-size:11.5px">${esc(fmtD(d).replace('(', ' ').replace(')', ''))}</text>`;
    R.filter(r => r.date === d).forEach(r => {
      const a = sx(r.dep - (+r.wait||0)/60), b = sx(r.dep), c = sx(r.dep + (+r.ride||0)/60);
      /* ★帯の明るさは「金額」で決めます（ご指示・2026/11/13）。
             前は時間単価でしたが、短い待ち・短い乗車だと
             とんでもない数になり、色まで嘘になっていました。 */
      const t = Math.min(1, (hasFare(r) ? +r.fare : 0) / 8000);
      const tip = `${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;つけ ${showT(isUnk(r.dep)?null:r.dep-(r.wait||0)/60)} → 出 ${showT(r.dep)}（待ち${showMin(r.wait)}）&#10;乗車 ${showMin(r.ride)}・${showYen(r.fare)}`;
      s += `<g data-tip="${tip}">
        <rect x="${a}" y="${y+18}" width="${Math.max(1,b-a)}" height="8" rx="4" fill="#3A4B6D"/>
        <rect x="${b}" y="${y+10}" width="${Math.max(3,c-b)}" height="22" rx="5" fill="rgba(240,163,59,${.25+t*.7})"/>
        <rect x="${a-1}" y="${y+5}" width="${Math.max(6,c-a+2)}" height="32" fill="transparent"/></g>`;
      /* ★大きい金額は、帯のとなりに出します。
             右の端からはみ出すときは、帯の左に出します（切れないように）。 */
      if (r.fare >= 8000) {
        const right = c + 5 + 54 <= W - 2;
        s += `<text class="glab" x="${right ? c+5 : a-5}" y="${y+27}"
          text-anchor="${right ? 'start' : 'end'}" style="font-size:11px"
          fill="var(--meter)">${yen(r.fare)}</text>`;
      }
    });
  });
  s += '</svg>';
  return `<div class="card"><h2>横棒グラフ</h2>
    <p class="note">細い線＝つけ待ちで潰れた時間、太い帯＝お客さまを乗せていた時間です。
      帯が明るいほど、1本の金額が大きくなっています。</p>
    ${filterChips(true)}<div class="snote">← 横にスクロールできます（横画面推奨）</div><div class="scroll fb">${s}</div>
    <div class="legend"><span><i style="background:#3A4B6D"></i>待ち</span><span><i style="background:rgba(240,163,59,.9)"></i>実車（明るい＝高単価）</span><span>横軸は時。25＝翌1時</span></div></div>`;
}

/* ---- 時間×金額 ---- */
/* ------------------------------------------------------------
 *  折線グラフ（時刻 × 金額）
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「この棒グラフは、スプシでいう
 *      北7、北4、北他、ﾐﾅﾐ、ほか、関空、ﾊﾞﾗｼ 別に作ってください。
 *      その他にも好きに乗り場をカスタムできる選択肢も追加してください」
 *
 *  ★1枚に全部の乗り場を重ねていたので、点と字が重なって読めませんでした。
 *    中分類（北7・北4…）ごとに、1枚ずつ分けて出します。
 *    さらに、乗り場を自分でえらんで1枚にすることもできます。
 * ---------------------------------------------------------- */

/** 1枚ぶんの図を作ります（えらんだ記録だけで描きます） */
function scChart(R){
  const ds = [...new Set(R.map(r => r.date))].sort();
  const L = 70, Rp = 16, T = 18, B = 44;
  const xs = R.map(r => r.dep);
  const x0 = Math.floor(Math.min(...xs) - .5), x1 = Math.ceil(Math.max(...xs) + .5);
  /* ★1時間ぶんの幅は、画面の広さに合わせます。
       22時までは、横にスクロールせずに見られる大きさにします。 */
  const vwS  = Math.max(260, (typeof window !== 'undefined' ? window.innerWidth : 390) - 56);
  const need = Math.max(1, Math.min(x1 - x0, 22 - x0));
  const cwS  = Math.max(30, Math.min(52, Math.floor((vwS - L - Rp) / need)));
  const W = L + Rp + Math.max(1, (x1 - x0)) * cwS, H = 360;
  const y1 = Math.max(...R.map(r => r.fare)) * 1.12 || 1000;
  const sx = v => L + (v-x0)/(x1-x0)*(W-L-Rp), sy = v => H-B - (v/y1)*(H-T-B);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  const step = y1 > 20000 ? 5000 : y1 > 8000 ? 2000 : 1000;
  /* ★縦じくも「¥5,000」のように、そのまま出します（ご指示・2026/11/13）。
       「¥5k」という書き方はやめました。 */
  for (let v = 0; v <= y1; v += step) s += `<line class="grid-l" x1="${L}" x2="${W-Rp}" y1="${sy(v)}" y2="${sy(v)}"/>
    <text class="axis" x="${L-6}" y="${sy(v)+4}" text-anchor="end" style="font-size:10.5px">${v ? yen(v) : '0'}</text>`;
  for (let h = x0; h <= x1; h++) s += `<line class="grid-l" x1="${sx(h)}" x2="${sx(h)}" y1="${T}" y2="${H-B}" stroke-dasharray="2 4"/>
    <text class="axis" x="${sx(h)}" y="${H-B+18}" text-anchor="middle">${h}</text>`;
  const placed = [];
  const fits = (x,y,w) => { for (const p of placed) if (x < p.x+p.w+3 && x+w+3 > p.x && y < p.y+11 && y+11 > p.y) return false; return true; };
  ds.forEach(d => {
    const c = dcol(d), pts = R.filter(r => r.date === d).sort((a,b) => a.dep - b.dep);
    if (scOpt.line && pts.length > 1)
      s += `<polyline fill="none" stroke="${c}" stroke-width="1.3" opacity=".55" points="${pts.map(r => sx(r.dep)+','+sy(r.fare)).join(' ')}"/>`;
    pts.forEach(r => {
      const x = sx(r.dep), y = sy(r.fare);
      s += `<g data-tip="${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;${showT(r.dep)}・${showYen(r.fare)}&#10;待ち${showMin(r.wait)}／乗車${showMin(r.ride)}">
        <circle cx="${x}" cy="${y}" r="4.5" fill="${c}"/><circle cx="${x}" cy="${y}" r="11" fill="transparent"/></g>`;
      if (scOpt.label) {
        const txt = yen(r.fare), w = txt.length*6.2;
        let ly = y-9, ok = false;
        for (const dy of [0,-12,12,-24,24,-36,36,-48,48]) if (fits(x+7, ly+dy, w)) { ly += dy; ok = true; break; }
        if (ok) { placed.push({x:x+7, y:ly, w}); s += `<text class="glab" x="${x+7}" y="${ly+8}" style="font-size:10px" fill="${c}">${txt}</text>`; }
      }
    });
  });
  s += '</svg>';
  return `<div class="snote">← 横にスクロールできます（横画面推奨）</div>
    <div class="scroll fb">${s}</div>
    <div class="legend">${ds.map(d => `<span><i style="background:${dcol(d)}"></i>${fmtD(d)}</span>`).join('')}</div>`;
}

function paneSc(){
  /* 時刻か金額が不明なものは、この図に点を打てないので外します */
  const R = visible().filter(r => hasDep(r) && hasFare(r));
  const head = `<div class="card"><h2>折線グラフ</h2>
    <p class="note">横は乗せた時刻（25＝翌1時）、縦は金額です。日付ごとに色を変えています。
      記録用スプレッドシートと同じ分け方で、1枚ずつ分けています。</p>
    <div class="toolbar">
      <button class="chip ${scOpt.line?'on':''}" data-opt="line">線でつなぐ</button>
      <button class="chip ${scOpt.label?'on':''}" data-opt="label">金額を出す</button>
    </div>
    ${filterChips(true)}</div>`;
  if (!R.length) return head + emptyCard('該当データがありません');

  /* ★中分類ごとに1枚ずつ（ご指示・2026/11/13） */
  let body = '';
  CAT_ORDER.forEach(function (k){
    const rows = R.filter(r => recCat(r) === k);
    if (!rows.length) return;
    body += `<div class="card"><h2>${esc(k)}</h2>
      <p class="note">${rows.length}件・乗り場 ${new Set(rows.map(r => r.place).filter(Boolean)).size}か所。</p>
      ${scChart(rows)}</div>`;
  });

  /* ★好きな乗り場をえらんで、1枚にする（ご指示・2026/11/13） */
  const pls = [...new Set(R.map(r => r.place).filter(Boolean))]
    .map(p => ({ p: p, n: R.filter(r => r.place === p).length }))
    .sort((a,b) => b.n - a.n || (a.p < b.p ? -1 : 1));
  const picked = R.filter(r => scPicks.indexOf(r.place) !== -1);
  const custom = `<div class="card"><h2>乗り場をえらぶ</h2>
    <p class="note">見たい乗り場を押してください。えらんだぶんだけで、1枚にまとめます。</p>
    <div class="chips">
      ${pls.map(o => `<button class="chip ${scPicks.indexOf(o.p)!==-1?'on':''}" data-scp="${esc(o.p)}">${esc(o.p)}<span class="cnt">${o.n}</span></button>`).join('')}
      ${scPicks.length ? '<button class="chip rst" data-scp-clear="1">リセット</button>' : ''}
    </div>
    ${scPicks.length
      ? (picked.length
          ? `<p class="note">${esc(scPicks.join('／'))}　${picked.length}件。</p>` + scChart(picked)
          : '<div class="empty">該当データがありません</div>')
      : ''}</div>`;

  return head + body + custom;
}

/* ---- 集計 ---- */
/* ★「不明」は数に入れません（0として数えると、平均が下がります）。
     件数（n）だけは、不明もふくめた本数です。 */
function agg(rs){
  const F = rs.filter(hasFare), W = rs.filter(r => !isUnk(r.wait));
  const sum = F.reduce((a,r)=>a+r.fare,0);
  /* ★avg は「1本の平均金額」です（ご指示・2026/11/13）。
       前は時間単価（1時間に伸ばした数）でしたが、
       同じ場所を1時間ずっと回れる前提になっていて、嘘になりました。 */
  return { n: rs.length,
    avg:  F.length ? sum/F.length : 0,
    fare: F.length ? sum/F.length : 0,
    sum:  sum,
    wait: W.length ? W.reduce((a,r)=>a+(+r.wait||0),0)/W.length : 0 }; }
function hourAgg(){ const m = {}; visible().filter(hasDep).forEach(r => { const h = Math.floor(r.dep); (m[h] = m[h] || []).push(r); });
  return Object.entries(m).map(([h,rs]) => ({ h:+h, ...agg(rs) })).sort((a,b) => a.h - b.h); }
function placeAgg(){ const m = {}; visible().forEach(r => { const p = r.place || '（無記入）'; (m[p] = m[p] || []).push(r); });
  return Object.entries(m).map(([p,rs]) => ({ p, ...agg(rs) })).sort((a,b) => b.avg - a.avg); }
function bars(rows, label, fmt){
  const mx = Math.max(...rows.map(r => r.avg), 1);
  return `<div class="scroll"><table><thead><tr><th>${label}</th><th class="n">件</th><th class="n">1本の平均</th>
    <th style="width:34%"></th><th class="n">平均 待ち</th><th class="n">売上</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(fmt(r))}</td><td class="n">${r.n}</td>
      <td class="n" style="color:var(--meter)">${yen(r.avg)}</td>
      <td><div class="bar" style="width:${Math.max(3, r.avg/mx*100)}%;opacity:${r.n>=3?1:.4}"></div></td>
      <td class="n">${Math.round(r.wait)}分</td>
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

  return { n: rs.length, days: days,
           sum: f.reduce((a,r) => a + (+r.fare || 0), 0),
           /* ★1本の平均金額。時間単価はやめました（ご指示・2026/11/13） */
           avg: f.length ? f.reduce((a,r) => a + (+r.fare || 0), 0) / f.length : 0 };
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
    row('1本の平均', now.avg, bef.avg, yen) +

    '<div class="cmprow"><div class="cl">記録の数</div>' +
    '<div class="cn">' + now.n + '件<i>' + pn + 'は ' + bef.n + '件</i></div>' +
    '<div class="cd"><span class="cmp ' + (nd > 0 ? 'up' : (nd < 0 ? 'down' : '')) + '">' +
    (nd > 0 ? '＋' : (nd < 0 ? '−' : '±')) + Math.abs(nd) + '件</span></div></div>' +
    '</div>';
}

/* =============================================================
 *  割合（ショート・ミドル・ロング）
 *
 *  ★まーく様のご指示（2026/11/12）
 *    「集計タブは、初めの記録で見られるので、不要です
 *      代わりに、スプシでも導入していた
 *      パーセンテージ（ショート何パーセント、ミドル何パーセント、
 *      ロング何パーセント）をわかりやすい形にまとめてください」
 *
 *  ★分け方は、記録用スプレッドシートと同じです。
 *    ショート … ￥4,999以下
 *    ミドル　 … ￥5,000〜￥9,999
 *    ロング　 … ￥10,000以上
 *  ★金額が「不明」の記録は、この割合から外します。
 *    0円として数えると、ショートが増えて嘘になります。
 * ============================================================= */
const FARE_SHORT_MAX = 4999;    // これ以下がショート
const FARE_LONG_MIN  = 10000;   // これ以上がロング
const BANDS = [
  { k:'S', n:'ショート', d:'¥4,999 以下',      c:'#7FA9F0' },
  { k:'M', n:'ミドル',   d:'¥5,000〜9,999',    c:'#F0A33B' },
  { k:'L', n:'ロング',   d:'¥10,000 以上',     c:'#6FD8A8' }
];
function fareBand(v){
  if (isUnk(v)) return '';
  const n = +v;
  if (n >= FARE_LONG_MIN)  return 'L';
  if (n >  FARE_SHORT_MAX) return 'M';
  return 'S';
}
function bandCount(rs){
  const o = { S:0, M:0, L:0, n:0, unk:0 };
  rs.forEach(function (r){
    const b = fareBand(r.fare);
    if (!b) { o.unk++; return; }
    o[b]++; o.n++;
  });
  return o;
}
const bandPct = (o, k) => o.n ? Math.round(o[k] / o.n * 1000) / 10 : 0;

/** 1本の帯（ショート／ミドル／ロングを、割合どおりに積みます） */
function bandBar(o, big){
  if (!o.n) return '<div class="bandbar empty"></div>';
  return '<div class="bandbar' + (big ? ' big' : '') + '">' +
    BANDS.map(function (b){
      const p = bandPct(o, b.k);
      if (!p) return '';
      return '<span style="width:' + p + '%;background:' + b.c + '">' +
             (p >= (big ? 7 : 12) ? p + '%' : '') + '</span>';
    }).join('') + '</div>';
}

/**
 * 乗り場ごと・エリアごとの1行。
 * ★乗り場の名前を「…」で切らないこと（ご指摘・2026/11/12
 *   「乗り場名が…でなってしまうと、具体的な場所が分かりません」）。
 *   折り返して、ぜんぶ出します。
 * ★割合だけでは動けないので、平均金額と件数も必ず付けます。
 */
function bandRow(label, o, avg){
  return '<div class="brow"><div class="bl">' + esc(label) + '</div>' +
    '<div class="bb">' + bandBar(o) +
      '<div class="bmeta">' + (avg ? '平均 ' + yen(avg) : '平均 —') + '　' + o.n + '件</div></div></div>';
}

/* その組の平均金額（不明は外す） */
function bandAvg(rs){
  const f = rs.filter(hasFare);
  return f.length ? f.reduce((a,r) => a + (+r.fare || 0), 0) / f.length : 0;
}

/**
 * パーセントの画面。
 *
 * ★まーく様のご指摘（2026/11/12）
 *   「これで載せて、果たして何がわかるのですか？
 *     パーセンテージにすることで、タクシー情報として、
 *     どういうメリットがあるのか…徹底的に考えて見返して作り直して」
 *
 * ★考え直したこと
 *   割合そのものは、見ても動けません。動けるのは
 *   「どこへ行けば、ロング（¥10,000以上）が出やすいか」です。
 *   だから、この画面の軸は **ロングの出やすさ** にしました。
 *     ① ロングが出やすい乗り場（3件以上・多い順）
 *     ② ロングが出やすい時間帯
 *     ③ ぜんぶの内訳と、エリアごとの表
 *   どの行にも「平均金額」と「件数」を付けます。
 *   割合だけだと、1件で100%の乗り場が一番上に来てしまうためです。
 */
/* ★えらんだ時間帯（ご指示・2026/11/12）
     「ロングが出やすい乗り場と時間帯はリンクさせてほしいです」
     棒を押すと、その時間帯の乗り場だけになります。空なら全時間です。 */
let hourPick = '';
/* ★「この乗り場は、何時に着けるのがよいか」を見るための選び（ご指示・2026/11/12）。
     空なら、記録の一番多い乗り場を出します。 */
let bestPlace = '';

/** その集まりを、乗り場ごとの並びにします（3件以上・ロング率の高い順） */
function longRank(rs){
  const m = {};
  rs.forEach(function (r){ const p = r.place; if (p) (m[p] = m[p] || []).push(r); });
  return Object.keys(m).map(function (p){
    const o = bandCount(m[p]);
    return { p: p, o: o, L: bandPct(o, 'L'), avg: bandAvg(m[p]), cat: recCat(m[p][0]) };
  }).filter(x => x.o.n >= HOT_MIN_N)
    .sort((a, b) => b.L - a.L || b.avg - a.avg || b.o.n - a.o.n);
}

/**
 * 時間順の狙い目（ご指示・2026/11/12）
 *
 * ★まーく様のご指示
 *   「どこを、何時に というよりも 何時は、どこ という形にしてください」
 *   「まず、リアルタイムで 近い時間にどこを走るべきなのかが
 *     すぐ分からないといけません
 *     なので、時間帯順にして おすすめの乗り場を出す形にしてください」
 *
 * ★だから、強い順ではなく **時刻の順** に並べます。
 *   一番上がいまの枠。走り出す前に、そこだけ見れば足ります。
 * ★3時間ずつにまとめます（1時間ずつだと、並びすぎて選べません）。
 * ★枠の名前（いま・次…）は付けません。時刻だけで分かります。
 * ★1つの枠に出すのは3か所だけ。枠は4つまで。
 */
/**
 * 乗り場ごとの「何時に着けるのがよいか」（ご指示・2026/11/12）
 *   「乗り場ごとに、何時に着けるのがベストなのかというのも
 *     導き出せるようにしてください」
 *
 * ★乗り場を1つ選んで、その乗り場の時間帯だけを並べます。
 *   前に全部の乗り場を並べたら「どれを攻めれば良いのか分かりません」
 *   とご指摘をいただいたので、1つずつ見る形にしました。
 * ★乗り場ごとでは件数が少ないので、前後1時間をふくめて数えます。
 *   どこまで広げたかは、必ず画面に書きます。
 * ★並べる順は「時刻の順」です。強い順ではありません
 *   （何時に着けるかを決めるための表なので）。
 *   一番よい時間だけ、一言で言い切ります。
 */
function bestTimeCard(D){
  if (!D || !D.length) return '';
  /* 乗り場ごとの件数。多い順にえらべるようにします */
  const cnt = {};
  D.forEach(function (r){ const p = r.place; if (p) cnt[p] = (cnt[p] || 0) + 1; });
  const list = Object.keys(cnt).sort((a2, b2) => cnt[b2] - cnt[a2] || (a2 < b2 ? -1 : 1));
  if (!list.length) return '';
  const pick = (bestPlace && cnt[bestPlace]) ? bestPlace : list[0];

  const rs = D.filter(r => r.place === pick);
  const hs = [...new Set(rs.map(r => Math.floor(r.dep)))].sort((a2, b2) => a2 - b2);
  const rows = hs.map(function (h){
    const t = rs.filter(r => Math.abs(Math.floor(r.dep) - h) <= 1);
    const o = bandCount(t);
    return { h: h, o: o, L: bandPct(o, 'L'), avg: bandAvg(t), n: t.length };
  }).filter(x => x.o.n >= HOT_MIN_N);

  const sel = '<select class="fsel" id="bestPlaceSel">' +
    list.map(p => '<option value="' + esc(p) + '"' + (p === pick ? ' selected' : '') + '>' +
      esc(p) + '（' + cnt[p] + '件）</option>').join('') + '</select>';

  if (!rows.length) {
    return '<div class="card"><h2>この乗り場は、何時がよいか</h2>' +
      '<div class="bsel">' + sel + '</div>' +
      '<div class="empty">' + esc(pick) + ' は、3件以上そろった時間帯が、まだありません。</div></div>';
  }

  /* 一番よい時間（ロング率が高い順。同じならロングの平均金額が高いほう） */
  const top = rows.slice().sort((a2, b2) => b2.L - a2.L || b2.avg - a2.avg)[0];
  const body = rows.map(function (x){
    const on = (x === top);
    return '<div class="btrow' + (on ? ' top' : '') + '">' +
      '<span class="bth">' + x.h + '時台</span>' +
      '<span class="btb">' + bandBar(x.o) + '</span>' +
      '<span class="btv">' + x.L + '%</span>' +
      '<span class="btm">平均 ' + yen(x.avg) + '<i>' + x.o.n + '件</i></span></div>';
  }).join('');

  return '<div class="card"><h2>この乗り場は、何時がよいか</h2>' +
    '<div class="bsel">' + sel +
    '<a class="mini" href="' + mapUrl(pick) + '" target="_blank" rel="noopener">📍 地図</a></div>' +
    '<p class="note"><b>' + esc(pick) + ' は、' + top.h + '時台</b>が一番よさそうです' +
    '（ロング ' + top.L + '%・平均 ' + yen(top.avg) + '・' + top.o.n + '件）。</p>' +
    '<div class="btlist">' + body + '</div>' +
    '<p class="note">時刻の順に並べています。件数が少ないので、' +
    '<b>前後1時間をふくめて</b>数えています。3件そろわない時間帯は出していません。</p>' +
    '<div class="legend">' + BANDS.map(bd => '<span><i style="background:' + bd.c + '"></i>' + bd.n + '</span>').join('') + '</div></div>';
}

function hourPlanCard(D){
  if (!D || !D.length) return '';
  const c = hotNow();
  const blocks = [];
  let st = Math.floor(c.early ? HOT_FROM : c.h);
  while (st <= HOT_TO && blocks.length < 4) {
    blocks.push({ a: st, b: Math.min(st + 2, HOT_TO) });
    st += 3;
  }
  let bb = '';
  blocks.forEach(function (bk, i){
    const t = D.filter(function (r){
      const h = Math.floor(r.dep);
      return h >= bk.a && h <= bk.b;
    });
    const rk = longRank(t);
    const o = bandCount(t);
    const thin = [...new Set(t.map(r => r.place).filter(Boolean))]
      .map(p => ({ p: p, n: t.filter(r => r.place === p).length }))
      .sort((x, y) => y.n - x.n).slice(0, 5);
    bb += '<div class="blk3' + (i === 0 ? ' now' : '') + '">' +
      /* ★「いま／次／そのあと」の札は、出しません（ご指示・2026/11/12）。
           時刻だけで分かります。いまの枠は、赤い枠で見分けます。 */
      '<div class="b3h"><b>' + bk.a + '〜' + bk.b + '時</b>' +
      '<span>' + (o.n ? ('ロング ' + bandPct(o, 'L') + '%・' + o.n + '件・平均 ' + yen(bandAvg(t))) : '記録なし') + '</span>' +
      '</div>' +
      (rk.length ? longRows(rk, 3)
        : (thin.length
            ? '<div class="hbn">まだ3件そろった乗り場がありません。この枠に入っている所（件数）：' +
              thin.map(x => esc(x.p) + ' ' + x.n).join('・') + '</div>'
            : '<div class="hbn">この枠の記録が、まだありません。</div>')) +
      '</div>';
  });
  if (!bb) return '';
  return '<div class="card plan3"><h2>時間順の狙い目</h2>' +
    '<p class="note">いま ' + esc(fmtD(c.date)) + ' ' + esc(c.clock) + '。' +
    (c.early ? 'まだ乗務の時間ではないので、' + HOT_FROM + '時からの枠で出しています。' : '') +
    '<b>時間の順</b>に並べています。一番上が、いま走る枠です。押すと地図が開きます。</p>' +
    bb + '</div>';
}

/** 並びの1行（押すと地図が開きます） */
function longRows(rank, n){
  if (!rank.length) return '<div class="note">3件以上たまった乗り場が、まだありません。</div>';
  return rank.slice(0, n || 8).map(function (x, i){
    return '<a class="lrow" href="' + mapUrl(x.p) + '" target="_blank" rel="noopener">' +
      '<span class="li">' + (i + 1) + '</span>' +
      '<span class="lp">' + esc(x.p) + '<i>' + esc(x.cat) + '</i></span>' +
      '<span class="lv">' + x.L + '%</span>' +
      '<span class="ln">平均 ' + yen(x.avg) + '<i>' + x.o.n + '件</i></span></a>';
  }).join('');
}
const longHead = '<div class="lhead"><span class="li"></span><span class="lp">乗り場</span>' +
  '<span class="lv">ロング率</span><span class="ln">1本の平均金額</span></div>';

/**
 * パーセントの画面。
 *
 * ★まーく様のご指摘（2026/11/12）
 *   「これで載せて、果たして何がわかるのですか？」
 *   → 割合そのものでは動けません。動けるのは
 *     「どこへ行けば、ロング（¥10,000以上）が出やすいか」です。
 *
 * ★さらにご指示（2026/11/12）
 *   「ロングが出やすい乗り場と時間帯はリンクさせてほしいです
 *     時間帯別に、どこの乗り場がアツいのかをランキング形式に」
 *   → 時間帯の棒を押すと、その時間の乗り場だけになります。
 *     下に「時間帯べつの乗り場ランキング」も、まるごと並べます。
 */
function paneRatio(){
  const R = visible();
  const head = '<div class="card"><h2>パーセント</h2>' +
    '<p class="note">ロング（¥10,000以上）が<b>出やすい所と時間</b>を探す画面です。' +
    'ショートは¥4,999以下、ミドルは¥5,000〜9,999です。金額が不明な記録は外しています。' +
    '<b>3件に届かない乗り場は、割合を出しません。</b></p>' +
    filterChips(true) + '</div>';
  if (!R.length) return head + emptyCard('該当データがありません');
  const all = bandCount(R);
  if (!all.n) return head + emptyCard('金額の入った記録が、まだありません。');

  const D = R.filter(hasDep);
  /* えらんだ時間帯の記録が無くなっていたら、全時間に戻します */
  if (hourPick !== '' && !D.some(r => Math.floor(r.dep) === +hourPick)) hourPick = '';
  const pickRs = (hourPick === '') ? R : D.filter(r => Math.floor(r.dep) === +hourPick);

  /* ★一番上は「何時は、どこ」（ご指示・2026/11/12）。
       「どこを、何時に」ではなく、**時間帯順**に並べて、
       いま走るべき乗り場が、すぐ目に入る形にします。 */
  /* ★「この乗り場は、何時がよいか」を一番上に（ご指示・2026/11/13） */
  let out = head + bestTimeCard(D) + hourPlanCard(D);

  /* ① ロングが出やすい乗り場（えらんだ時間帯があれば、その時間だけ） */
  out +=
    '<div class="card"><h2>' +
    (hourPick === '' ? 'ロングが出やすい乗り場' : hourPick + '時台に ロングが出やすい乗り場') +
    '</h2>' +
    '<p class="note">ロングの出た割合が高い順です。3件以上たまった乗り場だけを出しています。押すと地図が開きます。</p>' +
    (hourPick === ''
      ? '<p class="note">下の棒を押すと、その時間帯だけになります。</p>'
      : '<div class="chips"><button class="chip warn rst" data-hr="">全時間に戻す</button></div>') +
    longHead + longRows(longRank(pickRs), 8) + '</div>';

  /* ② ロングが出やすい時間帯（押すと、上の並びがその時間になります） */
  let hrs = [];
  if (D.length) {
    const hs = D.map(r => Math.floor(r.dep));
    for (let h = Math.min(...hs); h <= Math.max(...hs); h++) hrs.push(h);
    const hrow = hrs.map(function (h){
      const t = D.filter(r => Math.floor(r.dep) === h);
      return { h: h, o: bandCount(t), avg: bandAvg(t) };
    }).filter(x => x.o.n >= HOT_MIN_N);
    const bestH = hrow.slice().sort((a, b) => bandPct(b.o, 'L') - bandPct(a.o, 'L'))[0];

    const cw = 54, L = 10, T = 22, BH = 210;
    const W = L + hrs.length * cw + 12, H = T + BH + 52;
    let g = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    hrs.forEach(function (h, i){
      const o = bandCount(D.filter(r => Math.floor(r.dep) === h));
      const x = L + i * cw;
      const on = (hourPick !== '' && +hourPick === h);
      /* 押せるように、1本まるごとを囲みます */
      g += '<g class="hbar' + (on ? ' on' : '') + '" data-hr="' + h + '" style="cursor:pointer">';
      g += '<rect x="' + (x + 2) + '" y="' + (T - 6) + '" width="' + (cw - 4) + '" height="' + (BH + 46) +
           '" rx="8" fill="' + (on ? 'rgba(240,163,59,.16)' : 'transparent') + '"/>';
      g += '<text class="axis" x="' + (x + cw/2) + '" y="' + (T + BH + 20) + '" text-anchor="middle">' + h + '時</text>';
      g += '<text class="glab" x="' + (x + cw/2) + '" y="' + (T + BH + 38) + '" text-anchor="middle">' + o.n + '件</text>';
      if (o.n) {
        let y = T + BH;
        BANDS.forEach(function (bd){
          const pp = bandPct(o, bd.k), hh = BH * pp / 100;
          if (!hh) return;
          y -= hh;
          g += '<rect x="' + (x + 5) + '" y="' + y + '" width="' + (cw - 10) + '" height="' + hh +
               '" fill="' + bd.c + '" rx="3"/>' +
            (hh > 18 ? '<text class="glab" x="' + (x + cw/2) + '" y="' + (y + hh/2 + 4) +
              '" text-anchor="middle" fill="#14100A">' + Math.round(pp) + '</text>' : '');
        });
      }
      g += '</g>';
    });
    g += '</svg>';
    out += '<div class="card"><h2>ロングが出やすい時間帯</h2>' +
      (bestH ? '<p class="note">いまのところ、一番ロングが出ているのは <b>' + bestH.h +
        '時台</b>（ロング ' + bandPct(bestH.o, 'L') + '%・平均 ' + yen(bestH.avg) + '・' + bestH.o.n + '件）です。</p>' : '') +
      '<p class="note"><b>棒を押すと、その時間の乗り場だけ</b>になります。</p>' +
      '<div class="snote">← 横にスクロールできます（横画面推奨）</div>' +
      '<div class="scroll fb">' + g + '</div>' +
      '<div class="legend">' + BANDS.map(bd => '<span><i style="background:' + bd.c + '"></i>' + bd.n + '</span>').join('') + '</div></div>';

    /* ③ 時間帯べつの乗り場ランキング（ご指示・2026/11/12）
         ★その1時間だけで数えると、乗り場ごとでは3件に届かず、
           ほとんどが空になってしまいました。
           だから **前後1時間をふくめて** 数えます。
           何時から何時までの記録かは、必ず画面に書きます。 */
    let hb = '';
    hrs.forEach(function (h){
      const t = D.filter(r => Math.floor(r.dep) === h);
      const o = bandCount(t);
      if (!o.n) return;
      const wide = D.filter(r => Math.abs(Math.floor(r.dep) - h) <= 1);
      const rk = longRank(wide);
      /* 3件に届かない乗り場は、割合を出さずに「件数」だけ 参考に出します。
         1件を「100%」と書くと、それを見て走った人の売上が変わります。 */
      const thin = [...new Set(t.map(r => r.place).filter(Boolean))]
        .map(p => ({ p: p, n: t.filter(r => r.place === p).length }))
        .sort((a2, b2) => b2.n - a2.n).slice(0, 5);
      hb += '<div class="hblk' + (hourPick !== '' && +hourPick === h ? ' on' : '') + '">' +
        '<div class="hbh"><b>' + h + '時台</b>' +
        '<span>ロング ' + bandPct(o, 'L') + '%・' + o.n + '件・平均 ' + yen(bandAvg(t)) + '</span></div>' +
        (rk.length
          ? '<div class="hbn">' + (h - 1) + '〜' + (h + 1) + '時の記録から</div>' + longRows(rk, 3)
          : (thin.length
              ? '<div class="hbn">まだ3件そろった乗り場がありません。この時間に入っている所（件数）：' +
                thin.map(x => esc(x.p) + ' ' + x.n).join('・') + '</div>'
              : '<div class="hbn">まだ記録がありません。</div>')) +
        '</div>';
    });
    if (hb) {
      out += '<div class="card"><h2>時間帯べつ 乗り場ランキング</h2>' +
        '<p class="note">その時間に、ロングが出やすかった乗り場の上位3か所です。' +
        '乗り場ごとでは件数が少ないので、<b>前後1時間をふくめて</b>数えています。押すと地図が開きます。</p>' +
        hb + '</div>';
    }
  }

  /* ★「ぜんぶの内訳」は、なくしました（ご指示・2026/11/13）
       「ぜんぶの内訳は参考にならないのでいらないです。
         作る際に、まず考えてください。
         全て一緒くたにしたデータで何がわかるのですか？
         もっと、参考になるデータ作りを必ず前提としてかんがえてくみたててください」
       乗り場も時間も混ぜた1本の帯からは、どこへ行くかが decide できません。
       これから作るものも、「この数字を見て、何をするか」が
       言えないものは出しません。 */

  /* ⑥ エリアごと（北・南・他 → 中カテゴリー → 乗り場） */
  let pbody = '';
  BIG_CATS.forEach(function (bg){
    const rows = R.filter(r => recBig(r) === bg.k);
    if (!rows.length) return;
    pbody += '<div class="bcat">' + esc(bg.k) + 'エリア</div>' +
      bandRow(bg.k + ' 合計', bandCount(rows), bandAvg(rows));
    bg.subs.forEach(function (sub){
      const sr = rows.filter(r => recCat(r) === sub);
      if (!sr.length) return;
      const pls = [...new Set(sr.map(r => r.place).filter(Boolean))]
        .map(p => ({ p: p, n: sr.filter(r => r.place === p).length }))
        .sort((x, y) => y.n - x.n || (x.p < y.p ? -1 : 1));
      /* ★3件に届かない乗り場は、割合を出しません（ご指示・2026/11/13 の考え方）。
           1件を「ロング100%」と書くと、それを見て走った人の売上が変わります。
           名前と件数だけを、下に1行で出します。 */
      const fat  = pls.filter(o => o.n >= HOT_MIN_N);
      const thin = pls.filter(o => o.n <  HOT_MIN_N);
      pbody += '<div class="bsubh">' + esc(sub) + '</div>' +
        fat.map(o => bandRow(o.p, bandCount(sr.filter(r => r.place === o.p)),
                             bandAvg(sr.filter(r => r.place === o.p)))).join('') +
        (thin.length
          ? '<div class="hbn">まだ3件に届かない所（件数）：' +
            thin.map(o => esc(o.p) + ' ' + o.n).join('・') + '</div>'
          : '');
    });
  });
  if (pbody) {
    out += '<div class="card"><h2>エリアごと</h2>' +
      '<p class="note">北・南・他のまとまりで見ています。</p>' + pbody +
      '<div class="legend">' + BANDS.map(bd => '<span><i style="background:' + bd.c + '"></i>' + bd.n + '</span>').join('') + '</div></div>';
  }
  return out + compareCard();
}

/* ============================================================
 *  仕掛けを、ここから起こす（ご指示・2026/11/13）
 *
 *  ★まーく様のご指示
 *    「止まってしまった際や、あらゆるエラーにおいて
 *      基本的に僕が行わずに、クロちゃんに依頼したら
 *      クロちゃん側で全て直せる仕組みづくりにして欲しい」
 *    「毎回、スプシにおいても色々やらないといけないの面倒なので」
 *
 *  ★一番 面倒だったのは、止まったときに
 *    スプレッドシートを開いて【拡張機能】→【Apps Script】…と
 *    たどらせていたことです。それをやめます。
 *
 *  ★ここ（TAXI NOTE）に【仕掛けを起こす】のボタンを置きます。
 *    押すと、GASの受け口が開きます。開いた時点で、GAS側は
 *      ① 自分を診て直す（見張りの立て直し・受け口の公開し直し）
 *      ② 新しい中身を取り込む
 *      ③ 頼まれごと（errand.json）を走らせる
 *    を、ぜんぶ自分でやります。指は1回だけです。
 *
 *  ★止まっていることにも、こちらから気づけるようにします。
 *    イベントの紙が20時間より古ければ、一番上に赤い帯を出します。
 * ========================================================== */
let gasInfo = null;
async function gasLoad(){
  try {
    const r = await fetch('data/gas.json', { cache: 'no-store' });
    if (r.ok) gasInfo = await r.json();
  } catch (e) { gasInfo = null; }
}
/** 仕掛けが止まっていそうか（イベントの紙の古さで見ます） */
function gasStale(){
  const at = (evData && evData.at) ? String(evData.at) : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(at);
  if (!m) return false;
  const t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  return (Date.now() - t) > 20 * 3600 * 1000;      /* 20時間より古い */
}
/** 一番上に出す、起こすための帯 */
function gasWakeBar(){
  if (!gasStale() || !gasInfo || !gasInfo.exec) return '';
  return '<div class="wakebar">' +
    '<b>仕掛けが止まっているかもしれません。</b>' +
    '<span>イベントの紙が ' + esc(String(evData.at)) + ' のままです。</span>' +
    '<a class="btn" href="' + esc(gasInfo.exec) + '" target="_blank" rel="noopener">' +
    '仕掛けを起こす</a>' +
    '<span class="note">押すと、新しい画面が開いて 自動で直します。' +
    '戻ってきたら、この帯は消えます。</span></div>';
}

/* ============================================================
 *  バラシ・関空の くわしい表（ご指示・2026/11/13）
 *
 *  ★まーく様のご指示
 *    「バラシと、関空についての詳細データページが作られていません。
 *      バラシは、会場ごとに、何時帯に呼ばれる可能性が高いのか。
 *      関空は、どのホテルが何時帯に呼ばれる可能性が高いのか。
 *      スプシ情報と照らし合わせて、
 *      データが増える事に精度を上げていくシステムにしたいです」
 *
 *  ★出すのは、自分たちの記録だけです。買ってきた数字は1つも使いません。
 *  ★3件に届かない所は、割合を出しません。件数だけを出します。
 *    1件を「この時間」と言い切ると、それを見て走った方の売上が変わります。
 *  ★記録がたまるほど、当たるようになります。
 *    いま何件から出しているかを、必ず画面に書きます。
 * ========================================================== */

/** その組を「場所 × 時間帯」に数えます */
function whenAgg(rows){
  const m = {};
  rows.forEach(function (r){
    const p = r.place || '（無記入）';
    (m[p] = m[p] || []).push(r);
  });
  return Object.keys(m).map(function (p){
    const rs = m[p].filter(hasDep);
    const hm = {};
    rs.forEach(function (r){ const h = Math.floor(r.dep); hm[h] = (hm[h] || 0) + 1; });
    const hrs = Object.keys(hm).map(Number).sort(function (a, b){ return hm[b] - hm[a] || a - b; });
    const f = m[p].filter(hasFare);
    return { p: p, n: m[p].length, nd: rs.length, hm: hm, hrs: hrs,
             avg: f.length ? f.reduce(function (a, r){ return a + (+r.fare || 0); }, 0) / f.length : 0,
             nf: f.length,
             wait: (function (){ const w = m[p].filter(function (r){ return !isUnk(r.wait); });
               return w.length ? w.reduce(function (a, r){ return a + (+r.wait || 0); }, 0) / w.length : 0; })() };
  }).sort(function (a, b){ return b.n - a.n || (a.p < b.p ? -1 : 1); });
}

/** 時間帯の帯（どの時間に多いかを、横に並べます） */
function whenBar(o, hrs){
  const mx = Math.max.apply(null, hrs.map(function (h){ return o.hm[h] || 0; }).concat([1]));
  return '<div class="wbar">' + hrs.map(function (h){
    const n = o.hm[h] || 0;
    const t = n ? (0.18 + (n / mx) * 0.82) : 0;
    return '<span class="wcell' + (n ? ' on' : '') + '" title="' + h + '時台 ' + n + '件">' +
      '<i style="background:rgba(240,163,59,' + t.toFixed(2) + ')"></i>' +
      '<b>' + (h % 24) + '</b></span>';
  }).join('') + '</div>';
}

/**
 * バラシ・関空の表を1枚作ります。
 *   cat   … 'ﾊﾞﾗｼ' か '関空'
 *   label … 画面に出す言い方（会場／ホテル）
 */
function whenPane(cat, title, label, lead){
  const R = visible().filter(function (r){ return recCat(r) === cat; });
  /* ★ここだけは「3件そろってから」の決まりを外します
       （ご指示・2026/11/13「バラシタブ、関空タブにおいては
         3件ルールは除いてください（圧倒的に情報が少ないので）」）。
     ★そのかわり、出す数字は「件数」です。割合は出しません。
       件数は、たまたまでも たしかにあった事実なので、嘘になりません。
     ★1件・2件のところには「まだ○件」と、はっきり添えます。 */
  const head = '<div class="card"><h2>' + esc(title) + '</h2>' +
    '<p class="note">' + lead +
    '<b>記録がたまるほど、当たるようになります。</b>' +
    'いまは ' + R.length + '件 から出しています。' +
    '1件からでも出します（数が少ないところには「まだ○件」と書きます）。</p>' +
    filterChips(true) + '</div>';
  if (!R.length) return head + emptyCard('該当データがありません');

  const D = R.filter(hasDep);
  const hs = D.map(function (r){ return Math.floor(r.dep); });
  const hrs = [];
  if (hs.length) for (let h = Math.min.apply(null, hs); h <= Math.max.apply(null, hs); h++) hrs.push(h);

  const rows = whenAgg(R);
  /* 時刻の分かっている記録が1件でもあれば、出します */
  const fat  = rows.filter(function (o){ return o.nd >= 1; });
  const thin = rows.filter(function (o){ return o.nd <  1; });

  let body = '';
  fat.forEach(function (o){
    const top = o.hrs.slice(0, 3).map(function (h){
      return (h % 24) + '時台 ' + o.hm[h] + '件';
    }).join('／');
    body += '<div class="wrow">' +
      '<div class="wh"><b>' + esc(o.p) + '</b>' +
      '<a class="mini" href="' + mapUrl(o.p) + '" target="_blank" rel="noopener">📍 地図</a></div>' +
      '<div class="wtop">呼ばれやすい時間　<b>' + esc(top) + '</b>' +
      (o.nd < HOT_MIN_N ? '<i class="wfew">まだ ' + o.nd + '件</i>' : '') + '</div>' +
      whenBar(o, hrs) +
      '<div class="wmeta">' + o.n + '件' +
      (o.nf ? '／1本の平均 ' + yen(o.avg) : '') +
      (o.wait ? '／平均 待ち ' + Math.round(o.wait) + '分' : '') + '</div></div>';
  });
  if (!body) body = '<div class="empty">時刻の入った記録が、まだありません</div>';

  let out = head + '<div class="card"><h2>' + esc(label) + 'ごとの 呼ばれやすい時間</h2>' +
    '<p class="note">数字は、その時間に入った記録の件数です。濃いほど多く呼ばれています。</p>' +
    body +
    (hrs.length ? '<div class="wlegend">左から ' + (hrs[0] % 24) + '時台 〜 ' +
      (hrs[hrs.length - 1] % 24) + '時台（25＝翌1時）</div>' : '') +
    '</div>';

  if (thin.length) {
    out += '<div class="card"><h2>まだ数が足りない' + esc(label) + '</h2>' +
      '<p class="note">' + HOT_MIN_N + '件たまったら、上の表に出ます。</p>' +
      '<div class="wthin">' + thin.map(function (o){
        return '<span>' + esc(o.p) + ' <i>' + o.n + '件</i></span>';
      }).join('') + '</div></div>';
  }

  /* 時間帯ぜんたいの山（どの時間に、この種類が多いか） */
  if (hrs.length) {
    const hm = {};
    D.forEach(function (r){ const h = Math.floor(r.dep); hm[h] = (hm[h] || 0) + 1; });
    const o = { hm: hm };
    const best = hrs.slice().sort(function (a, b){ return (hm[b] || 0) - (hm[a] || 0) || a - b; })[0];
    out += '<div class="card"><h2>' + esc(title) + 'ぜんたいの 時間帯</h2>' +
      '<p class="note">いまのところ、一番多いのは <b>' + (best % 24) + '時台</b>（' +
        hm[best] + '件）です。' +
        ((hm[best] || 0) < HOT_MIN_N ? 'まだ数が少ないので、目安です。' : '') + '</p>' +
      whenBar(o, hrs) +
      '<div class="wlegend">左から ' + (hrs[0] % 24) + '時台 〜 ' +
      (hrs[hrs.length - 1] % 24) + '時台（25＝翌1時）</div></div>';
  }
  return out;
}

function paneBara(){
  return whenPane('ﾊﾞﾗｼ', 'バラシ', '会場',
    '公演のあと、お客が出てくる時間です。会場ごとに、何時台に呼ばれているかを並べます。');
}
function paneKix(){
  return whenPane('関空', '関空', 'ホテル',
    'どのホテルから、何時台に呼ばれているかを並べます。');
}

/* ---- 書き出し・取り込み（「記録」の下に出します） ---- */
function paneOut(){
  return `<div class="card"><h2>書き出し</h2>
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
      <th class="n">金額</th></tr></thead><tbody>
      ${impOk.slice(0,25).map(r => `<tr><td style="color:var(--muted)">${r._ln}</td>
        <td>${fmtD(r.work_date)}</td><td>${esc(r.place)}</td><td class="n">${fmtT(r.dep)}</td>
        <td class="n">${r.wait_min}分</td><td class="n">${r.ride_min}分</td><td class="n">${yen(r.fare)}</td>
        </tr>`).join('')}
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
/* ================================================================
 *  固定ボタン（ご指示・2026/11/12）
 *   ・右上の ≡ … どこからでもメニューへ
 *   ・右下の「粛清完了」… 記録の画面だけ。1回で保存できる
 *   ・左利きの方は、一番上の切り替えで 左側に寄せられます
 * ================================================================ */
function fabWire(){
  const m = document.getElementById('fabMenu');
  const sheet = document.getElementById('fabSheet');
  if (m && sheet) {
    m.onclick = function () {
      if (!sheet.hidden) { sheet.hidden = true; return; }
      /* ★フィードバックは、一番下に出します（ご指示・2026/11/13）。
           上の行に置いてあるので、そのままだと先頭に来てしまいます。 */
      const btns = [...document.querySelectorAll('[data-t]')]
        .sort(function (x, y) {
          const fx = x.dataset.t === 'fb' ? 1 : 0, fy = y.dataset.t === 'fb' ? 1 : 0;
          return fx - fy;
        });
      sheet.innerHTML = btns.map(function (b) {
        const t = b.dataset.t;
        const nm = (b.querySelector('b') || {}).textContent || (b.textContent || '').trim();
        const sb = (b.querySelector('i') || {}).textContent || '';
        return '<button class="fsrow ' + (t === tab ? 'on' : '') + '" data-go="' + t + '">' +
               '<b>' + esc(nm) + '</b><i>' + esc(sb) + '</i></button>';
      }).join('') +
        /* ★【仕掛けを起こす】は、いつでも ここから押せます
             （ご指示・2026/11/13「スプシにおいても色々やらないといけないの面倒」）。
             押すと、GASの受け口が開いて 自動で直ります。 */
        ((gasInfo && gasInfo.exec)
          ? '<a class="fsrow wake" href="' + esc(gasInfo.exec) + '" target="_blank" rel="noopener">' +
            '<b>仕掛けを起こす</b><i>止まったときに、ここを押すだけ</i></a>'
          : '');
      sheet.hidden = false;
      sheet.querySelectorAll('[data-go]').forEach(function (b) {
        b.onclick = function () {
          grab(); tab = b.dataset.go; tabSave(); sheet.hidden = true; msg = '';
          render(); window.scrollTo({ top: 0, behavior: 'smooth' });
        };
      });
    };
  }
  const a = document.getElementById('fabAdd');
  if (a) {
    a.hidden = (tab !== 'in');
    a.onclick = function () { const b = document.getElementById('add'); if (b) b.click(); };
  }
  document.querySelectorAll('.hrow [data-hand]').forEach(function (b) {
    b.onclick = function () {
      hand = b.dataset.hand;
      try { localStorage.setItem(HAND_KEY, hand); } catch (e) {}
      handApply();
    };
  });
  handApply();
  hsubWire();
  placeChipsFit();
  tocBuild();
  foldWire();
}

/* ------------------------------------------------------------
 *  乗車場所の候補タグは、2行まで
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「乗車場所の候補タグは、毎回、2行までに収まるように絞ってください」
 *
 *  ★名前の長さで、折り返しの数が変わります。
 *    画面に置いたあとで measurement（高さ）を見て、
 *    3行目に回ったものを外します。
 * ---------------------------------------------------------- */
function placeChipsFit(){
  const inp = document.getElementById('f_place');
  if (!inp) return;
  const box = inp.parentElement.querySelector('.chips');
  if (!box) return;
  const bs = [...box.querySelectorAll('.chip')];
  bs.forEach(function (b) { b.hidden = false; });
  const tops = [];
  bs.forEach(function (b) {
    const t = Math.round(b.offsetTop);
    if (tops.indexOf(t) === -1) tops.push(t);
    if (tops.length > 2) b.hidden = true;
  });
}

/* ------------------------------------------------------------
 *  見出しだけで、折りたたむ・広げる（ご指示・2026/11/13）
 *    「各見出し(全ページ含む)は 右に▼みたいなの作って
 *      見出しのみに折りたたみや、展開できる形にしてください」
 *
 *  ★見出しを押すと、その区切りの中身だけが閉じます。
 *    もう一度 押すと開きます。▼が向きで教えます。
 *  ★どの区切りを閉じたかは覚えておき、画面を作り直しても そのままです。
 *    （タグを押すたびに ぜんぶ開き直すと、使いものになりません）
 * ---------------------------------------------------------- */
const FOLD_KEY = 'tn_folds';
/* 目次そのものを たたんでいるか（高さを食わせないため） */
const TOC_KEY = 'tn_toc_fold';
function tocFolded(){
  try { return localStorage.getItem(TOC_KEY) === '1'; } catch (e) { return false; }
}
let foldSet = (function (){
  try { return JSON.parse(localStorage.getItem(FOLD_KEY) || '[]') || []; }
  catch (e) { return []; }
})();
function foldSave(){
  try { localStorage.setItem(FOLD_KEY, JSON.stringify(foldSet.slice(0, 80))); } catch (e) {}
}
/** 見出しの字から、覚えておくための名前を作ります */
function foldKey(h){ return String(h.textContent || '').replace(/[▼▲\s]/g, '').slice(0, 24); }

function foldWire(){
  document.querySelectorAll('#panesTop .card > h2, #ktop > h2, #panes .card > h2')
    .forEach(function (h){
      const card = h.parentElement;
      if (!card) return;
      const k = foldKey(h);
      if (!h.querySelector('.fmark')) {
        const i = document.createElement('i');
        i.className = 'fmark'; i.textContent = '▼';
        h.appendChild(i);
      }
      card.classList.toggle('fold', foldSet.indexOf(k) !== -1);
      h.style.cursor = 'pointer';
      h.onclick = function () {
        const on = !card.classList.contains('fold');
        card.classList.toggle('fold', on);
        const i2 = foldSet.indexOf(k);
        if (on && i2 === -1) foldSet.push(k);
        if (!on && i2 !== -1) foldSet.splice(i2, 1);
        foldSave();
      };
    });
}

/* ------------------------------------------------------------
 *  目次（ご指示・2026/11/13）
 *    「全てのページの各見出しの目次を付けて、
 *      目次から、すぐにページへスクロールできるようにしてください」
 *
 *  ★その画面に出ている見出しを、そのまま並べます。
 *    押すと、その見出しまで すっと動きます。
 *    一番上の行（貼り付いている行）のぶんだけ、下げて止めます。
 * ---------------------------------------------------------- */
function tocBuild(){
  const old = document.getElementById('toc');
  if (old) old.remove();
  const hs = [...document.querySelectorAll('#panesTop .card > h2, #ktop > h2, #panes .card > h2')];
  if (hs.length < 2) return;
  hs.forEach(function (h, i) { if (!h.id) h.id = 'sec' + i; });
  const nav = document.createElement('div');
  nav.className = 'toc' + (tocFolded() ? ' fold' : '');
  nav.id = 'toc';
  nav.innerHTML =
    '<button class="toch" id="tocH">目次<i class="fmark">▼</i></button>' +
    '<div class="tocg">' + hs.map(function (h, i) {
      return '<button class="tocit" data-toc="' + h.id + '">' +
        '<em>' + (i + 1) + '</em>' +
        '<span>' + esc(h.textContent.replace(/[▼▲]/g, '').trim()) + '</span></button>';
    }).join('') + '</div>';
  const host = document.getElementById('panesTop') || document.getElementById('panes');
  host.parentNode.insertBefore(nav, host);
  /* 目次そのものも、たたんでおけます（高さを食わないように） */
  const hd = nav.querySelector('#tocH');
  if (hd) hd.onclick = function () {
    const on = !nav.classList.contains('fold');
    nav.classList.toggle('fold', on);
    try { localStorage.setItem(TOC_KEY, on ? '1' : '0'); } catch (e) {}
  };
  nav.querySelectorAll('[data-toc]').forEach(function (b) {
    b.onclick = function () {
      const el = document.getElementById(b.dataset.toc);
      if (!el) return;
      /* 閉じてある区切りは、開いてから動きます（押しても何も見えないと困るため） */
      const card = el.parentElement;
      if (card && card.classList.contains('fold')) el.click();
      const hdr = document.querySelector('header');
      const off = (hdr ? hdr.getBoundingClientRect().height : 0) + 8;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - off,
                        behavior: 'smooth' });
    };
  });
}

/* ------------------------------------------------------------
 *  一番上の灰色のブロックを、しまったり 広げたりする
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「この灰背景全てをしまったり、広げたりしたい」
 *    「固定スクロールとドッキングさせる形
 *      （スクロール後も、タップすると、下が開く）」
 *    「▼か、なにかわかりませんが 押すと下に開くとわかりやすい作りに」
 *    「1番初めは、開いたままの状態で」
 *    「下にスクロールすると自動で閉じる形にしてください」
 *
 *  ★貼り付く行の中に入れてあるので、下まで進んでも
 *    ▼を押せば その場で開きます。
 *  ★自動で閉じるのは、1回だけ。行ったり来たりすると、画面がガタつくためです。
 * ---------------------------------------------------------- */
let hsubAuto = false;
function hsubSet(cl){
  const h = document.getElementById('hsub');
  if (!h) return;
  h.classList.toggle('cl', cl);
}
function hsubWire(){
  const h = document.getElementById('hsub');
  if (!h || h.dataset.wired) return;
  h.dataset.wired = '1';
  h.classList.remove('cl');                 /* はじめは開いたまま */
  const g = document.getElementById('hgrab');
  if (g) g.onclick = function (e) {
    e.preventDefault(); hsubAuto = true; hsubSet(!h.classList.contains('cl'));
  };
  /* 指で上下に払っても、開いたり閉じたりします */
  let y0 = null;
  h.addEventListener('touchstart', function (e) {
    y0 = (e.touches && e.touches[0]) ? e.touches[0].clientY : null;
  }, { passive: true });
  h.addEventListener('touchend', function (e) {
    if (y0 === null) return;
    const y1 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : y0;
    const dy = y1 - y0;
    y0 = null;
    if (Math.abs(dy) < 18) return;          /* 押したつもりで閉じない */
    hsubAuto = true;
    hsubSet(dy < 0);                        /* 上へ払ったら閉じる */
  }, { passive: true });
  /* 下にスクロールしたら、1回だけ 自動で閉じます */
  window.addEventListener('scroll', function () {
    if (hsubAuto) return;
    if (window.scrollY > 60) { hsubAuto = true; hsubSet(true); }
  }, { passive: true });
}

/* ★書きかけのまま閉じようとしたら、1度だけ確かめます（ご指示・2026/11/12）
     「なにか入力情報があるままの場合、更新したら、入力途中のため、
       情報が消えてしまうという、再確認のポップアップ表示」 */
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('beforeunload', function (e) {
    try {
      if (!formDirty()) return;
      e.preventDefault();
      e.returnValue = '入力の途中です。このまま閉じると、書きかけが消えることがあります。';
      return e.returnValue;
    } catch (err) {}
  });
}

function wire(){
  /* ★ふきだしが無くなっているのに、印だけ残ると
       固定ボタンが二度と出なくなります。毎回そろえ直します。 */
  try {
    document.body.classList.toggle('modalon', !!document.querySelector('.modal'));
  } catch (e) {}
  fabWire();
  /* 「この乗り場は、何時がよいか」の乗り場えらび */
  const bps = document.getElementById('bestPlaceSel');
  if (bps) bps.onchange = function () { bestPlace = bps.value; render(); };
  /* ★時間帯の棒を押すと、その時間の乗り場だけになります（ご指示・2026/11/12） */
  document.querySelectorAll('[data-hr]').forEach(function (b) {
    b.onclick = function () {
      hourPick = b.dataset.hr === '' ? '' : String(+b.dataset.hr);
      render();
      const c = document.querySelector('#panes .card h2');
      if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
  /* 天気の細かさ（15分／1時間／今日明日／2週間） */
  document.querySelectorAll('[data-wxsp]').forEach(function (b) {
    b.onclick = function () { wxSpan = b.dataset.wxsp; render(); };
  });
  /* 雨雲レーダーの地図は、その画面にいるときだけ組み立てます */
  if (tab === 'hot') radarBoot(); else radarMap = null;
  const dep = $('#f_dep');
  const upd = () => {
    const d = parseT(dep ? dep.value : '');
    if ($('#depHint')) $('#depHint').textContent = d !== null ? fmtT(d) + ' に出発' : (dep && dep.value ? '読めない時刻' : '');
    const w = +(($('#f_wait')||{}).value) || 0, r = 0, f = +(($('#f_fare')||{}).value) || 0;
    /* ★「時間単価」の案内はやめました（ご指示・2026/11/13）。
         1本を1時間に伸ばした数で、現実と合わないためです。 */
  };
  ['f_dep','f_wait','f_fare'].forEach(id => { const e = document.getElementById(id); if (e) e.addEventListener('input', upd); });
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
  /* ★折線グラフで、乗り場を自分でえらぶ（ご指示・2026/11/13） */
  document.querySelectorAll('[data-scp]').forEach(function (b) {
    b.onclick = function () {
      const p = b.dataset.scp, i = scPicks.indexOf(p);
      if (i === -1) scPicks.push(p); else scPicks.splice(i, 1);
      scPicksSave(); render();
    };
  });
  document.querySelectorAll('[data-scp-clear]').forEach(function (b) {
    b.onclick = function () { scPicks = []; scPicksSave(); render(); };
  });
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
      grab();
      const v = String(kpl.value || '');
      if (v.indexOf(BIGSEL) === 0) {
        /* 「北エリア」などをえらんだとき */
        onlyBig = v.slice(1); onlyPlace = ''; onlyCat = '';
      } else {
        onlyPlace = v; onlyBig = ''; onlyCat = '';
      }
      filtSave(); render(); };
  });
  /* ★大カテゴリーを押したら、乗り場の指定は外します。
       どちらも効かせると、どちらで絞ったのか分からなくなります。 */
  document.querySelectorAll('[data-cat]').forEach(function (b) {
    b.onclick = function () { grab(); onlyCat = b.dataset.cat; onlyPlace = ''; filtSave(); render(); };
  });
  /* 大カテゴリーを押したら、中カテゴリーと乗り場の指定は外します */
  document.querySelectorAll('[data-big]').forEach(function (b) {
    b.onclick = function () { grab(); onlyBig = b.dataset.big; onlyCat = ''; onlyPlace = ''; filtSave(); render(); };
  });
  document.querySelectorAll('[data-day]').forEach(function (b) {
    b.onclick = function () { grab(); onlyDay = b.dataset.day; filtSave(); render(); };
  });
  /* ★乗り場を、字で探せるようにします（ご指示・2026/11/13）
       「乗り場の選択は、プルダウン以外に検索で。
         検索の該当文字が含んでいたら、候補を表示する形にしてください」
     ★画面ぜんたいを作り直すと、打っている途中で指が離れてしまうので、
       候補の欄だけを書きかえます。 */
  document.querySelectorAll('[data-find]').forEach(function (inp) {
    const box = document.getElementById(inp.dataset.find);
    if (!box) return;
    const show = function () {
      const q = pkey(inp.value);
      if (!q) { box.innerHTML = ''; return; }
      const names = [...new Set(records.map(r => r.place).filter(Boolean))];
      const hit = names.filter(n => pkey(n).indexOf(q) !== -1)
        .map(n => ({ n: n, c: records.filter(r => r.place === n).length }))
        .sort((a, b) => b.c - a.c || (a.n < b.n ? -1 : 1))
        .slice(0, 10);
      box.innerHTML = hit.length
        ? hit.map(o => '<button class="chip" data-fp="' + esc(o.n) + '">' +
            esc(o.n) + '<span class="cnt">' + o.c + '</span></button>').join('')
        : '<span class="note">見つかりません</span>';
      box.querySelectorAll('[data-fp]').forEach(function (b) {
        b.onclick = function () {
          grab();
          onlyPlace = b.dataset.fp; onlyBig = ''; onlyCat = '';
          filtSave(); render();
        };
      });
    };
    inp.addEventListener('input', show);
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
  /* ★地図を開いたら、その乗り場は「分かった」ものとして、
       次からは聞きません（ご指示・2026/11/13）。 */
  ['#f_map', '#f_mappin'].forEach(function (sel) {
    const a = $(sel); if (!a) return;
    a.addEventListener('click', function () {
      grab(); placeOkAdd(form.place);
      /* 地図は別のタブで開くので、こちらの画面は作り直して、
         誘いの1行を消します（2回目からは出しません）。 */
      setTimeout(function (){ msg = ''; render(); }, 0);
    });
  });
  /* ★えらんだものを、その欄だけ 空に戻します
       （ご指示・2026/11/13「各選択項目で、リセットボタンも追加してください」）。 */
  /* ★乗車金額は、押すたびに うしろへ足していきます（ご指示・2026/11/13） */
  const padWire = function (attr, fld, max, inpId) {
    document.querySelectorAll('[' + attr + ']').forEach(function (b) {
      b.onclick = function () {
        grab();
        const cur = String(form[fld] == null ? '' : form[fld]);
        const k = b.getAttribute(attr);
        if (k === 'BS') form[fld] = cur.slice(0, -1);
        else if (cur.length < max) form[fld] = cur + k;
        msg = ''; render();
        const i = document.getElementById(inpId); if (i) i.focus();
      };
    });
  };
  padWire('data-fa', 'fare', 7, 'f_fare');
  padWire('data-wa', 'wait', 3, 'f_wait');
  document.querySelectorAll('[data-clr]').forEach(function (b) {
    b.onclick = function () {
      grab();
      const k = b.dataset.clr;
      form[k] = '';
      if (k === 'dep') { form.dep = ''; }
      msg = ''; render();
    };
  });
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
           wait:g('f_wait') ?? form.wait, ride:'', fare:g('f_fare') ?? form.fare,
           method:g('f_method') ?? form.method, note:g('f_note') ?? form.note };
  /* ★書きかけを、その場で覚えます。
       アプリを閉じても・切り替えても、戻ってきたら続きから書けます。 */
  formSave();
}
const ok  = t => {
  msg = t; msgBad = false;
  /* 保存できたので、書きかけの控えは消します（次の1本を、空から書けるように） */
  try { localStorage.removeItem(FORM_KEY); } catch (e) {}
  render();
};
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

/**
 * 入れ忘れた欄まで、画面を動かして知らせます（ご指示・2026/11/12）。
 * ★ただ「入れてください」と出すだけでは、どこの欄か分かりません。
 */
function needField(id, text){
  msg = text; msgBad = true; render();
  try {
    const e = document.getElementById(id);
    if (e) {
      e.scrollIntoView({ behavior: 'smooth', block: 'center' });
      e.classList.add('need');
      setTimeout(function (){ e.classList.remove('need'); }, 2600);
      e.focus({ preventScroll: true });
    }
  } catch (err) {}
  return;
}

async function addRec(){
  grab();
  const dRaw = String(form.dep || '').trim();
  const d = dRaw === '' ? null : parseT(dRaw);
  const fare = numOrUnk(form.fare, 1000000);
  if (!form.date) return bad('営業曜日を入れてください');
  /* ★乗車場所と発車時間は必ず要ります（ご指示・2026/11/12）。
       抜けていたら、その欄まで画面を動かして、赤く知らせます。 */
  if (!String(form.place || '').trim()) return needField('f_place', '乗車場所は必ず入れてください');
  if (dRaw === '') return needField('f_dep', '発車時間は必ず入れてください');
  /* ★似た名前の乗り場があれば、保存の前に1度だけ聞きます（ご指示・2026/11/12）。
       同じ場所が2つの名前で入ると、どちらの数字も当てになりません。 */
  const pSug = placeAskOk[form.place] ? '' : placeSuggest(form.place);
  if (pSug) { render(); return bad('もしかして、' + pSug + ' と同じですか？ 上で選んでください'); }
  /* ★時刻は「書いてあるのに読めない」ときだけ はじきます。
       書いていないのは「不明」として通します（ご指示・2026/11/11）。 */
  if (dRaw !== '' && d === null) return bad('乗せた時刻が読めない（例 25:30）');

  const row = {
    user_id: ME.user.id, work_date: form.date, place: (form.place || '').trim(),
    dep: (d === null ? null : +d.toFixed(2)),
    wait_min: numOrUnk(form.wait, 1440),
    ride_min: null, fare: fare,
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
    : '記録した';
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
  return ['日付,場所,乗せた時刻,待ち時間(分),乗車時間(分),金額,種類,他,記録者',
    ...sorted().map(r => [r.date, q(showTxt(r.place)), showT(r.dep),
      showMin(r.wait), showMin(r.ride), isUnk(r.fare) ? UNK : r.fare,
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
  menuDot();
}

/**
 * ≡ に赤い丸を付ける／消す。
 *
 * ★まーく様のご指示（2026/11/13）
 *   「イベントとお知らせは画面では非表示で、三の方には追加したままで。
 *     未読の場合は 三に赤丸を付けて、開いたのが確認できたら、赤丸は消してください」
 *
 * ★【イベント】と【お知らせ】を、画面のメニューから外したので、
 *   そこに付いていた赤い点が見えなくなりました。
 *   代わりに ≡ そのものに付けます。どちらかが未読なら、赤い丸が出ます。
 */
function menuDot(){
  const m = document.getElementById('fabMenu');
  if (!m) return;
  const ev = document.getElementById('evDot');
  const nw = document.getElementById('newsDot');
  const on = (ev && !ev.hidden) || (nw && !nw.hidden);
  m.classList.toggle('dotted', !!on);
}

/** 題のとなりの版の番号と、タブの赤い点をととのえる */
function newsBoot(){
  try {
    const v = document.getElementById('ver');
    if (v && typeof APP_VERSION !== 'undefined') v.textContent = APP_VERSION;
    const d = document.getElementById('newsDot');
    if (d) d.hidden = !newsUnread();
    menuDot();
  } catch (e) {}
}

function paneNews(){
  let gd = [], list = [];
  try { gd = (typeof APP_GUIDE !== 'undefined' && APP_GUIDE) ? APP_GUIDE : []; } catch (e) { gd = []; }
  try { list = (typeof APP_NEWS !== 'undefined' && APP_NEWS) ? APP_NEWS : []; } catch (e) { list = []; }

  /* ★長い文の並びをやめ、カードにしました（ご指摘・2026/11/12）。
       走る前に、知りたい所だけを拾って読めることが大事です。 */
  const cards = gd.map(function (g){
    return '<div class="gcard"><div class="gh"><span class="gi">' + g.i + '</span>' +
      esc(g.h) + '</div><ul class="gl">' +
      (g.l || []).map(function (x){ return '<li>' + esc(x) + '</li>'; }).join('') +
      '</ul></div>';
  }).join('');

  const news = list.map(function (n){
    return '<div class="newsv"><b>' + esc(n.v) + '</b><small>' + esc(n.d) + '</small></div>' +
      '<ul class="newsl">' + (n.items || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  }).join('');

  return '<div class="card"><h2>使い方</h2>' +
    '<p class="note">知りたい所だけ読めば大丈夫です。いま動いているのは <b>' +
    esc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') + '</b> です。</p>' +
    '<div class="gwrap">' + cards + '</div></div>' +
    '<div class="card"><h2>お知らせ</h2>' + (news || '<div class="note">まだありません。</div>') +
    '<div class="actions">' +
    '<a class="btn ghost" href="/say" target="_blank" rel="noopener" style="text-decoration:none">' +
    '右上の顔とひとこと、すべて見る</a></div></div>';
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
  const n = evSplit(day).show.length;
  if (!day || !day.d) return 'イベント（' + n + '件）';
  const kyo = (day.d === evNight()) ? 'きょう ' : '';
  return kyo + fmtD(day.d) + ' のイベント（' + n + '件）';
}

/* ★日付は、一番目立たせます（ご指示・2026/11/12
     「〇〇のイベントの日付部分は、もっと目立たせてください」）。
     どの日のぶんかを取り違えると、空振りになるためです。 */
/**
 * 時刻が1つも分かっていないものは、出しません。
 *
 * ★まーく様のご指示（2026/11/13）
 *   「イベントですが、開演不明のものは、もう表示させないでください。
 *     見ても意味がありません」
 *
 * ★搬入（設営）は、もともと時刻を出しません。
 *   「公演は 11/14 から」のような、次の日の手がかりになるので残します。
 * ★消したものは、一番下に1行だけ名前を出します。
 *   黙って消すと、載っていないことに気づけません。
 */
function evSplit(day){
  const L = (day && day.list) ? day.list : [];
  const show = L.filter(x => x.k === 'hanyu' || x.s || x.e);
  const hid  = L.filter(x => !(x.k === 'hanyu' || x.s || x.e));
  return { show: show, hid: hid };
}

function evTitleHTML(day){
  const n = evSplit(day).show.length;
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

/**
 * アーティストの公式リンク（ご指摘・2026/11/12）。
 * ★出すのは「公式」と言い切れるものだけです。
 *   調べられなかった催しには、1つも出しません（黙って消えるのではなく、
 *   そもそも書かないだけです。あて推量を並べないため）。
 */
function evArtHTML(x){
  const al = (x && x.al) ? x.al : [];
  if (!al.length) return '';
  const who = (al[0] && al[0].l === 'name') ? al[0].n : '';
  const links = al.filter(y => y && y.u);
  if (!links.length) return '';
  return '<div class="evart">' +
    (who ? '<span class="evwho">🎤 ' + esc(who) + '</span>' : '') +
    links.map(y => '<a class="mini" href="' + esc(y.u) + '" target="_blank" rel="noopener">' +
      esc(y.l) + '</a>').join('') + '</div>';
}

function evRows(day){
  const sp = evSplit(day);
  if (!sp.show.length && !sp.hid.length) return '<div class="empty">該当データがありません</div>';
  if (!sp.show.length) return '<div class="empty">該当データがありません</div>' + evHidNote(sp.hid);
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
  /* ★種類ごとに大きな見出しを付け、その中は時間の早い順に並べます
       （ご指示・2026/11/13）
         「搬入なら、搬入と大きく見出しをつけて
           イベントなら、イベントと大きく見出しをつけて
           その他(バラシ)も合わせて
           カテゴリーごとの順番、かつ、時間が早い順に、毎回並び替えて」
     ★搬入は一番下に置きます。その日は公演が無く、お客は1人も来ないためです
       （記録用スプレッドシートの決まりと同じ）。 */
  const EV_ORDER = [
    { k: 'event',  n: '🎤 イベント' },
    { k: 'barasi', n: '🔧 バラシ（搬出）' },
    { k: 'hotel',  n: '🍽 ホテル宴会' },
    { k: 'hanyu',  n: '🚚 搬入（設営）' }
  ];
  const tmin = x => {
    const t = String(x.s || x.e || '');
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    return m ? (+m[1] * 60 + +m[2]) : 9999;     /* 時刻が無いものは、後ろへ */
  };
  let out = '';
  EV_ORDER.forEach(function (g){
    const rows = sp.show.filter(x => (x.k || 'event') === g.k)
      .slice().sort((a, b) => tmin(a) - tmin(b));
    if (!rows.length) return;
    out += '<div class="evgrp"><h3>' + esc(g.n) +
      '<span>' + rows.length + '件</span></h3>' +
      (g.k === 'hanyu'
        ? '<p class="note">この日は 設営だけ。夜の人出は ありません。</p>' : '') +
      evCards(rows) + '</div>';
  });
  return out + evHidNote(sp.hid);
}

/** 1件ずつの札 */
function evCards(list){
  return list.map(x => `<div class="evrow">
    <!-- ★種類は、上の大きな見出しに出しています（ご指示・2026/11/13）。
           ここでくり返すと、字が増えるだけです。 -->
    <div class="evhead">${esc(x.v || '')}</div>
    ${evTimeLine(x)}
    <div class="evt">${esc(x.t || '')}</div>
    ${x.a ? `<div class="evsub">🚕 着ける目安：${esc(x.a)}</div>` : ''}
    ${x.r ? `<div class="evsub">${esc(x.r)}</div>` : ''}
    ${evArtHTML(x)}
    <div class="evlinks">
      ${x.u ? `<a class="mini" href="${esc(x.u)}" target="_blank" rel="noopener">くわしく見る</a>` : ''}
      <a class="mini" href="${esc(mapUrl(x.v || ''))}" target="_blank" rel="noopener">📍 地図</a>
    </div>
  </div>`).join('');
}

/** 時刻が分からず、出さなかったもの（名前だけ1行） */
function evHidNote(hid){
  if (!hid || !hid.length) return '';
  return '<div class="evhid">時刻が分からないため、出していないもの：' +
    hid.map(x => esc(x.v || '') + (x.k === 'barasi' ? '（バラシ）' : '')).join('・') +
    '</div>';
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
    ${evRows(d)}</div>` + evNextCard(d);
}

/**
 * 次の日のぶん。
 *
 * ★ご指摘（2026/11/13）
 *   「なんで、イベントページ開いたら同じ日付が2つあるのですか？」
 *   2枚目を days[1] に決め打ちしていました。
 *   1枚目が days[1] だった日は、同じ日が2回出ていました。
 *   1枚目の「次」を出します。同じ日なら、出しません。
 */
function evNextCard(d){
  if (!evData || !evData.days || !d) return '';
  const i = evData.days.indexOf(d);
  const nx = (i >= 0) ? evData.days[i + 1] : null;
  if (!nx || !nx.d || (d.d && nx.d === d.d)) return '';
  return '<div class="card"><h2>' + evTitleHTML(nx) + '</h2>' + evRows(nx) + '</div>';
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
    menuDot();
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
  /* ★ふきだし（この箱）が出ているあいだは、固定ボタンを出しません
       （ご指示・2026/11/12「ポップアップの時は表示しないでください」）。
       箱の上に重なって、読むのも押すのも邪魔になるためです。 */
  try { document.body.classList.add('modalon'); } catch (e) {}
  const close = () => {
    try { if (document.getElementById('evHide').checked) evHideToday(); } catch (e) {}
    box.remove();
    try { document.body.classList.remove('modalon'); } catch (e) {}
  };
  box.querySelector('#evClose').addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
}

/* ★イベントの紙と、受け口の住所を 読みます。
     住所は【仕掛けを起こす】のボタンに使います（ご指示・2026/11/13）。 */
async function bootLoad(){
  await gasLoad();
  await loadEv();
}
if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLoad);
  else bootLoad();
}
