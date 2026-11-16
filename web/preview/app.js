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
 *
 *  ★はじめに出すのは **c1（終わったばかりの営業月）** です
 *    （ご指示・2026/11/17「現状、新しい締め開けなので ろくにデータが
 *      たまってないので 昨日～来月15までは、10/16～11/15をデフォルト
 *      来月16からは、11/16～12/15をデフォルトでだして、
 *      それを繰り返してください」）。
 *    16日に新しい月がはじまった直後は、まだ1件も記録がありません。
 *    そこを出しても、まっさらな画面になるだけです。
 *    16日が来たら、ひとりでに次の月へ移ります。
 *      mode:'free' … from と to を、自分で決める
 * ★その端末に覚えます。開き直しても、絞ったままです。
 *   絞っていることを忘れると、数字を読みちがえます。
 *   だから、4つの数の下に「何で絞っているか」を必ず書きます。
 */
/* ★既定は「今期」（16日〜翌月15日）。全期間だと、閑散期と繁忙期が
     混ざって、見ても意味がありません（ご指示・2026/11/12）。 */
/* ★onlyCat … 大カテゴリー（関空・バラシ・北7…）だけに絞る（空なら すべて）。
     グラフの画面で、すぐ切り替えられるようにします（ご指示・2026/11/12）。 */
/* はじめに出す期間（終わったばかりの営業月）。16日で ひとりでに移ります */
const PERIOD_DEF = 'c1';
let onlyPlace = '', onlyCat = '', onlyBig = '', period = { mode: PERIOD_DEF, from: '', to: '' };
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
    /* ★期間も、営業日が変わったら「開いた日の営業月」に戻します
         （ご指示・2026/11/13「過去の記録のデフォルト表示は全期間ではなく、
           営業月(〇月16日〜翌〇月15日の内の、開いてる日に該当する月)に」）。
         前の晩に「全期間」を選んだまま残ると、閑散期と繁忙期が混ざって、
         きょうの数字として読めなくなります。
         同じ夜のうちは、押して選んだものを そのまま残します。 */
    if (o.period && typeof o.period.mode === 'string' && o.periodAt === today()) {
      period = { mode: o.period.mode,
                 from: String(o.period.from || ''), to: String(o.period.to || '') };
    }
  } catch (e) {}
}
function filtSave(){
  try {
    localStorage.setItem(FILT_KEY,
      JSON.stringify({ place: onlyPlace, cat: onlyCat, big: onlyBig, day: onlyDay,
        dayAt: today(), mine: onlyMine, period: period, periodAt: today() }));
  } catch (e) {}
}
function filtClear(){ onlyPlace = ''; onlyCat = ''; onlyBig = ''; onlyDay = '';
  period = { mode: PERIOD_DEF, from:'', to:'' }; filtSave(); }
const filtOn = () => !!onlyPlace || !!onlyCat || !!onlyBig || !!onlyDay ||
  period.mode !== PERIOD_DEF;

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
  /* 足されたひとことを読みます（台帳に棚が無くても、黙って元のまま） */
  loadSays();
  /*
   * ★「いまアツい」は時刻で中身が変わるので、
   *   1分ごとに描き直します（通信はしません）。
   *   天気は30分ごとに読み直します（気象庁・無料）。
   */
  loadWx();
  /* ★ウィキペディアの紙は、もう読みません（ご指示・2026/11/17
       「Wikipediaを観光する人が見ると思いますか？」）。
     いまは、名前のついたホテル・レストランの表を出しています。
     読む係（buzzLoad）は消していません。あとで戻せるようにしてあります。 */
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
/* ★「付け待ち」は、えらべる種類から外しました（ご質問・2026/11/13
     「乗り場と付け待ちは、ほぼ同じ意味合いなのに、2つともあるのはなぜですか？」）。
     おっしゃるとおり、同じ乗せ方を2つの名前で持っていました。
     2つあると、同じものが別々に数えられます。
     前に「付け待ち」で入れた記録は、下の normMethod で「乗り場」にそろえます。 */
/* ★「乗り場」は、えらべる種類から外しました（ご質問・2026/11/16
     「乗車種類の、乗り場タブというのは必要なのでしょうか
       必要ないならけしてください」）。
     付け待ちで乗せたことは「待ち」の分数で分かるので、
     種類にも持つと、同じことを2か所で言うことになります。
   ★前に「乗り場」「付け待ち」で入れた記録は、そのまま「乗り場」と出ます
     （消していません）。また要るようになれば、ここに1語 戻すだけです。 */
const METHODS = ['GO', 'Uber', 'S.Ride', '無線', '流し', '手上げ',
                 'ホテル', '途中乗り', '呼び込み', 'エスライド', '道路'];

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
/* ★S.Ride を Uber の横に。付け待ちは出しません（ご指示・2026/11/12）
   ★「乗り場」も外しました（ご質問・2026/11/16） */
const METHOD_CHIP_NAMES = ['GO', 'Uber', 'S.Ride', '無線', '手上げ', 'ホテル', '途中乗り'];
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
/* ------------------------------------------------------------
 *  乗り場の名前を、きれいに並べる
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「こういう、新地〇〇なら、ちゃんと順番通りに並べて欲しいです。
 *      ドン〇〇など、各番号があるものは同様で、
 *      しっかり綺麗に整列を徹底してください」
 *
 *  ★番号の付いた名前（新地4・新地17…）は、番号の小さい順に。
 *  ★同じ呼び名のまとまり（新地／ドン…）ごとに、ひとかたまりにします。
 *  ★まとまりの順は、記録の多い順。よく行く所が、上に来ます。
 *    （1〜2件しか無い所が、名前の順で上に来ると使えません）
 * ---------------------------------------------------------- */
/** 名前を「呼び名」と「番号」に分けます（新地17 → 新地 / 17） */
function placeSplit(p){
  const t = String(p == null ? '' : p).trim();
  const m = t.match(/^(.*?)[ 　]*(\d+)[ 　]*([^\d]*)$/);
  if (!m || !m[1]) return { base: t, num: -1, tail: '' };
  return { base: m[1].trim(), num: +m[2], tail: (m[3] || '').trim() };
}
/** [{p, n}] を、まとまりごと・番号の小さい順に並べます */
function sortPlaces(rows){
  const g = {}, order = [];
  rows.forEach(function (o){
    const sp = placeSplit(o.p);
    const k = sp.base || String(o.p);
    if (!g[k]) { g[k] = { k: k, n: 0, items: [] }; order.push(k); }
    g[k].n += (+o.n || 0);
    g[k].items.push({ o: o, s: sp });
  });
  return order.map(function (k){ return g[k]; })
    .sort(function (a, b){ return b.n - a.n || (a.k < b.k ? -1 : 1); })
    .reduce(function (acc, grp){
      grp.items.sort(function (x, y){
        if (x.s.num !== y.s.num) return x.s.num - y.s.num;
        return (String(x.o.p) < String(y.o.p)) ? -1 : 1;
      });
      grp.items.forEach(function (it){ acc.push(it.o); });
      return acc;
    }, []);
}

/* ------------------------------------------------------------
 *  同じ所は、1つの名前にそろえる
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「ミナミ15は、ドン15と同じ扱いですので、ドン15に統一してください」
 *
 *  ★別の名前で入っていると、同じ乗り場が2行に分かれ、
 *    どちらの数字も当てになりません。読み込んだ時点でそろえます。
 *  ★新しい言いかえが出てきたら、ここに1行足すだけです。
 * ---------------------------------------------------------- */
const PLACE_ALIAS = [
  /* ミナミ15番・ミナミ15 → ドン15（ご指示・2026/11/13） */
  { t: /^(?:ミナミ|ﾐﾅﾐ|みなみ)[ 　]*(\d+)[ 　]*番?$/, to: function (m){ return 'ドン' + m[1]; } }
];
function aliasPlace(p){
  const t = String(p == null ? '' : p).trim();
  if (!t) return t;
  for (let i = 0; i < PLACE_ALIAS.length; i++) {
    const m = t.match(PLACE_ALIAS[i].t);
    if (m) return PLACE_ALIAS[i].to(m);
  }
  return t;
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
  /* ★「付け待ち」＝「乗り場」。同じ乗せ方なので、1つにそろえます
       （ご質問・2026/11/13）。別々に残すと、売上が2つに割れて読めません。 */
  if (/^(付け?待ち?|つけ待ち|つけまち|ﾂｹﾏﾁ)$/.test(t)) return '乗り場';
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
  /* ★まず、言いかえを1つの名前にそろえます（ミナミ15番 → ドン15）。
       そのあと、書き方のゆれ（ひらがな・カタカナ・空白）も、
       一番はじめに入れた書き方にそろえます。
       ここでそろえておけば、どの画面でも 1行にまとまります。 */
  list.forEach(function (r){ if (r.place) r.place = aliasPlace(r.place); });
  const first = {};
  [...list].sort(function (a, b){ return (a.date < b.date ? -1 : 1); })
    .forEach(function (r){
      if (!r.place) return;
      const k = pkey(r.place);
      if (!first[k]) first[k] = r.place;
    });
  list.forEach(function (r){
    if (r.place && first[pkey(r.place)]) r.place = first[pkey(r.place)];
  });
  list.forEach(function (r){ r.ride = autoRide(r, list); });
  return list;
}

const rowToRec = r => ({
  id: r.id, user_id: r.user_id, date: r.work_date, place: r.place,
  /* ★不明（空っぽ）は、0に変えずに そのまま持ちます。
       0と不明を混ぜると、平均も時間単価も狂うためです。 */
  dep: (r.dep == null ? null : +r.dep), wait: r.wait_min, ride: r.ride_min, fare: r.fare,
  method: r.method || '', note: r.note || '',
  /* ★入れた時刻。「どれが今いれた記録か」を出すために持ちます
       （ご指示・2026/11/16「新規の記録を1番上にしてください」） */
  made: r.created_at || '',
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

/* ------------------------------------------------------------
 *  表の並び（ご指示・2026/11/16）
 *
 *  ★まーく様のご指示
 *    「これ、どういう順番なのですか？
 *      スプシにならって(順序は逆) まず、日付が新しいものが上に来る形にして
 *      順番は、エリア順でわけてください
 *      また、ドン〇〇や、新地〇〇なども、順番が1が先に来て、
 *      番号が多いものが下に来る形にしてください」
 *
 *  ① 営業日が新しい順（記録用スプレッドシートの逆）
 *  ② 同じ日の中は、エリアの近い順（CAT_ORDER）
 *  ③ 同じエリアの中は、乗り場の名前順。数字は数として比べます
 *     （新地1 → 新地7 → 新地8、ドン1 → ドン15）
 *  ④ 同じ乗り場の中は、遅い時刻が上
 * ---------------------------------------------------------- */

/* ------------------------------------------------------------
 *  表の並べかえと、絞り込み（ご指示・2026/11/16）
 *
 *  ★まーく様のご指示
 *    「名 付 待 発 金 乗 種･他
 *      これらは、スプシと同じく、フィルタをかけられるようにして、
 *      並び替えをできるようにしてください
 *      並び順のデフォルトは、新しい登録が上から順にしてください」
 *
 *  ★並びの既定は「新しく入れたものが上」です（入れた時刻の順）。
 *    営業日の順ではありません。入れたばかりのものが、必ず一番上に来ます。
 *  ★見出しを押すと、その欄で並べ直します。もう一度押すと 逆さまになります。
 *  ★絞り込みは、見出しの下の欄に字を入れるだけです。
 *    書いてある字が ふくまれていれば残ります（スプシのフィルタと同じ考え方）。
 * ---------------------------------------------------------- */
const TBL_SORT_KEY = 'tn_tbl_sort';
const TBL_FIL_KEY  = 'tn_tbl_fil';
/* k … どの欄で並べるか　d … 1なら小さい順、-1なら大きい順 */
let tblSort = (function (){
  try { return JSON.parse(localStorage.getItem(TBL_SORT_KEY) || 'null') ||
    { k: 'made', d: -1 }; } catch (e) { return { k: 'made', d: -1 }; }
})();
let tblFil = (function (){
  try { return JSON.parse(localStorage.getItem(TBL_FIL_KEY) || '{}') || {}; }
  catch (e) { return {}; }
})();
let tblFilOpen = false;      /* 絞り込みの欄を出しているか */

function tblSortSet(k){
  if (tblSort.k === k) tblSort.d = -tblSort.d;
  else tblSort = { k: k, d: (k === 'made' || k === 'fare' || k === 'dep') ? -1 : 1 };
  try { localStorage.setItem(TBL_SORT_KEY, JSON.stringify(tblSort)); } catch (e) {}
}
function tblFilSet(k, v){
  if (v) tblFil[k] = v; else delete tblFil[k];
  try { localStorage.setItem(TBL_FIL_KEY, JSON.stringify(tblFil)); } catch (e) {}
}
function tblFilOn(){ return Object.keys(tblFil).length > 0; }

/* 絞り込みに使う「その行の字」を作ります（画面に出ている形と同じにします） */
function tblCell(r, k){
  if (k === 'date')   return String(fmtD(r.date || '')).replace(/\((.)\)/, '$1');
  if (k === 'who')    return kana(r.who);
  if (k === 'tsuke')  return showT(tsuke(r));
  if (k === 'wait')   return isUnk(r.wait) ? UNK : String(r.wait);
  if (k === 'dep')    return showT(r.dep);
  if (k === 'fare')   return isUnk(r.fare) ? UNK : String(r.fare);
  if (k === 'place')  return canonPlace(r.place || '');
  if (k === 'method') return normMethod(r.method || '');
  if (k === 'note')   return String(r.note || '');
  return '';
}
/** 絞り込みを通します（書いてある字が ふくまれていれば残ります） */
function tblFilter(list){
  const ks = Object.keys(tblFil);
  if (!ks.length) return list;
  return list.filter(function (r){
    return ks.every(function (k){
      const want = toHalfW(String(tblFil[k] || '')).toLowerCase();
      if (!want) return true;
      return toHalfW(tblCell(r, k)).toLowerCase().indexOf(want) !== -1;
    });
  });
}

/* --tsort-start-- ここから下は gas/test/webnews.test.js が取り出して検査します */
/**
 * 乗り場の名前を、並べるための形にします。
 * ★数字は4桁にそろえて書き直します。
 *   字のまま比べると「ドン15」が「ドン2」より前に来てしまいます。
 */
function placeKey(p){
  const v = toHalfW(String(p == null ? '' : p)).trim();
  return v.replace(/\d+/g, function (d){ return ('0000' + d).slice(-4); });
}

/**
 * 表に出す順に並べ替えます。
 *
 * ★既定は「新しく入れたものが上」です（ご指示・2026/11/16
 *     「並び順のデフォルトは、新しい登録が上から順にしてください」）。
 *   営業日の順ではありません。入れたばかりのものが、必ず一番上に来ます。
 * ★見出しを押すと、その欄で並べ直します。
 * ★並べ方が決まらないときは、日 → エリア → 乗り場の番号 の順にします。
 */
function tableSort(list){
  const k = (tblSort && tblSort.k) || 'made';
  const d = (tblSort && tblSort.d) || -1;
  /* その欄の「並べるための値」。数で比べられるものは数で比べます */
  const key = function (r){
    if (k === 'made')   return String(r.made || '');
    if (k === 'who')    return kana(r.who);
    if (k === 'tsuke')  { const v = tsuke(r); return v == null ? -1 : v; }
    if (k === 'wait')   return isUnk(r.wait) ? -1 : +r.wait;
    if (k === 'dep')    return r.dep == null ? -1 : r.dep;
    if (k === 'fare')   return isUnk(r.fare) ? -1 : +r.fare;
    if (k === 'place')  return placeKey(canonPlace(r.place));
    if (k === 'method') return normMethod(r.method || '');
    if (k === 'note')   return String(r.note || '');
    if (k === 'date')   return String(r.date || '');
    return '';
  };
  /* ★「不明」は、どちら向きに並べても 一番 下にします。
       0として上に出すと、0円・0分だと思われてしまいます
       （不明と0は、別のものです）。 */
  const unk = function (r){
    if (k === 'wait') return isUnk(r.wait);
    if (k === 'fare') return isUnk(r.fare);
    if (k === 'dep')  return r.dep == null;
    if (k === 'tsuke') return tsuke(r) == null;
    return false;
  };
  return [...list].sort(function (a, b){
    const ua = unk(a), ub = unk(b);
    if (ua !== ub) return ua ? 1 : -1;
    const ka = key(a), kb = key(b);
    if (ka !== kb) return (ka < kb ? -1 : 1) * d;
    /* 同じときの、決まった並び（いつ見ても同じ順になるように） */
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const ca = CAT_ORDER.indexOf(recCat(a)), cb = CAT_ORDER.indexOf(recCat(b));
    if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
    const pa = placeKey(canonPlace(a.place)), pb = placeKey(canonPlace(b.place));
    if (pa !== pb) return pa < pb ? -1 : 1;
    return (b.dep == null ? -1 : b.dep) - (a.dep == null ? -1 : a.dep);
  });
}

/* --tsort-end-- */

/** 一番あとに入れた記録の id（表の上に「新」と出します） */
function newestId(){
  let id = '', at = '';
  (records || []).forEach(function (r){
    if (r.made && r.made > at) { at = r.made; id = r.id; }
  });
  return id;
}
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
  /*
   * ★「アツい時間帯」は、やめました（ご指摘・2026/11/16
   *     「エリア指定してないのに、アツい時間帯というのはなんなのですか？
   *       どこのことをいってるのですか？
   *       根拠のないデータは絶対に載せないでください」）。
   *
   *   おっしゃるとおりでした。乗り場をしぼっていないときは、
   *   新地も関空もバラシも ぜんぶ混ぜた平均で「一番 高かった時間」を
   *   出していました。場所がバラバラの平均なので、
   *   「その時間に行けばよい」という意味には まったくなりません。
   *   どこの話かも言えない数字でした。
   *
   *   代わりに「ロングの割合」を出します。
   *   これは、いま出している記録のうち ¥10,000以上が何割か、というだけの数です。
   *   どこへ行け、とは言いません。数え方は、すぐ下に書いてあります。
   */
  {
    const fr2 = rs.filter(hasFare);
    const lg  = fr2.filter(r => (+r.fare || 0) >= 10000).length;
    $('#k4').textContent = fr2.length ? Math.round(lg * 100 / fr2.length) + '%' : '—';
  }
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
    /* 乗り場は、どの画面にいても ここで すぐ切り替えられます。
       ★中身を入れるのは placeSelFill_（画面を組み立てたあとに呼びます）。 */
    placeSelFill_();
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
      ? '※1日当たりの数字ではありません。上の期間の合計です。<br>' +
        '※ロングの割合＝¥10,000以上が何割か。金額の分かる記録だけで数えています。'
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
  /* ★グラフは3つを1ページにまとめました（ご指示・2026/11/13）。
       前の押しどころを覚えている方のために、heat/tl/sc も同じ画面へ回します。 */
  const PANES = { in: () => (ME.profile.is_admin ? (paneOut() + gasStatCard()) : '') + paneSays(), hot:paneHot,
    g:paneG, heat:paneG, tl:paneG, sc:paneG, map:paneMap,
    ratio:paneRatio, tok:paneTok, rep:paneRep, nippo:paneNippo,
    bara:paneBara, kix:paneKix,
    news:paneNews, ev:paneEv, fb:paneFb };
  /* 古い押しどころで来たときは、その形をえらんだことにします */
  if (tab === 'heat' || tab === 'tl' || tab === 'sc') { gKindSet(tab); tab = 'g'; tabSave(); }
  /* バラシ・関空は、1つのメニューにまとめました（ご指示・2026/11/15） */
  if (tab === 'bara' || tab === 'kix') { tokKindSet(tab); tab = 'tok'; tabSave(); }
  if (!PANES[tab]) tab = 'in';
  $('#panes').innerHTML = PANES[tab]();
  /* 新規の記録は、過去の記録より上に出します（ご指示・2026/11/13）。
     仕掛けが止まっていそうなときは、その上に 赤い帯を出します。 */
  /* ★並びは 新規の記録 → 直近の記録 → 過去の記録（ご指示・2026/11/16
       「新規の記録の方が、直近の記録より上にしてください」） */
  /* ★赤い帯だけは、目次より上の入れものに出します（ご指示・2026/11/16
       「仕掛けが止まっているかもしれませんの表示は、目次より上にしてください」）。 */
  const wt = $('#wakeTop');
  if (wt) wt.innerHTML = gasWakeBar();
  const pt = $('#panesTop');
  /* ★「直近の記録」は出しません（ご指示・2026/11/16
       「直近の記録は非表示にしてください」）。
     すぐ下の「過去の記録」の表に、同じものが新しい順で並ぶためです。 */
  if (pt) pt.innerHTML =
    ((tab === 'in') ? (leadCard('in') + paneInNew()) : '');
  /* 記録の表は「過去の記録」の中へ（欄を2つに分けません） */
  const ktb = $('#ktTbl');
  if (ktb) ktb.innerHTML = (tab === 'in') ? paneInRecent() : '';
  /* ★作り直したあとに、乗り場のプルダウンへ中身を入れ直します。
       これを忘れると、iPhoneで「オプションなし」と出ます（2026/11/14）。 */
  placeSelFill_();
  /* 題の下の一文（前日の万収をほめる） */
  const sb = $('#sub');
  subSet(sb);
  if (tab === 'news') newsSeen();
  /* ★イベントを開いたら、赤い点は消します（ご指摘・2026/11/12
       「イベント、スクロールし終えても、タブにある、赤い丸が消えません」）。
     見たのに点が残ると、いつまでも新しいものがあるように見えます。 */
  if (tab === 'ev') evSeeToday();
  menuDot();
  extMark_();
  wire();
}

/* ------------------------------------------------------------
 *  別のページが開くものに、印と一言を付けます
 *  （ご指示・2026/11/16「別ページへ飛ぶものに関しては、必ず
 *    別ページへ飛びます（もっと良い一般的な言い方があれば合わせます）
 *    と必ずつけてください」）
 *
 *  ★一つずつ手で書かず、画面を組み立てたあとに まとめて付けます。
 *    手で書くと、新しい行き先を足したときに必ず付け忘れるためです。
 *    ここで自動で付くので、付け忘れが起きません。
 *  ★言い方は「別のページが開きます」にしました。
 *    「別ウィンドウ」「新しいタブ」より、ふだん使う言葉だからです。
 * ---------------------------------------------------------- */
function extMark_(){
  try {
    const ins = ['#wakeTop', '#panesTop', '#panes', '#ktop', '#fabSheet'];
    ins.forEach(function (sel){
      const box = document.querySelector(sel);
      if (!box) return;
      box.querySelectorAll('a[target="_blank"]').forEach(function (a){
        /*
         * ★地図は「📍」で そろえます（ご指示・2026/11/17
         *     「↗️ これを使ってるのが非常に多いですが非常に分かりづらいです
         *       地図なら 📍 で統一してください」）。
         *   ↗ が どの行にも付いていて、何の印なのか分からなくなっていました。
         *   行き先が地図のものは、↗ をやめて 📍 だけにします。
         */
        const isMap = /google\.[^/]*\/maps|openstreetmap\.org|maps\.app\.goo\.gl/
          .test(String(a.getAttribute('href') || ''));
        if (isMap) {
          a.classList.add('extmap');
          if ((a.textContent || '').indexOf('📍') === -1) {
            a.insertBefore(document.createTextNode('📍'), a.firstChild);
          }
        } else {
          a.classList.add('ext');
        }
        /* 読み上げでも分かるようにします */
        if (!a.getAttribute('aria-label')) {
          a.setAttribute('aria-label',
            (a.textContent || '').trim() +
            (isMap ? '（地図が、別のページで開きます）' : '（別のページが開きます）'));
        }
      });
    });
    /* 印の意味は、その欄の一番下に1行だけ添えます。
       すでに同じことが書いてある欄には、くり返しません。 */
    document.querySelectorAll('#panesTop .card,#panes .card,#ktop').forEach(function (c){
      const hasExt = !!c.querySelector('a.ext');
      const hasMap = !!c.querySelector('a.extmap');
      if (!hasExt && !hasMap) return;
      if (c.textContent.indexOf('別のページが開きます') >= 0) return;
      const p = document.createElement('p');
      p.className = 'note extnote';
      /* 印は2つだけ。📍＝地図、↗＝そのほかのページ */
      p.textContent = (hasMap ? '※ 📍 は地図が開きます。' : '') +
        (hasExt ? '※ ↗ は、別のページが開きます。' : '');
      c.appendChild(p);
    });
  } catch (e) {}
}
const msgHTML = id => `<span class="msg ${msgBad?'bad':''}" id="${id}">${esc(msg)}</span>`;
let impMsg = '', impMsgBad = false;
const impMsgHTML = id => `<span class="msg ${impMsgBad?'bad':''}" id="${id}">${esc(impMsg)}</span>`;
const ibad = t => { impMsg = t; impMsgBad = true;  render(); };
const iok  = t => { impMsg = t; impMsgBad = false; render(); };
const emptyCard = t => `<div class="card"><div class="empty">${t}</div></div>`;

/* ------------------------------------------------------------
 *  「このページを見てわかること」（ご指示・2026/11/15）
 *
 *  ★まーく様のご指示
 *    「各ページの1番上に、説明書きとして
 *      『このページを見てわかること』を載せて、
 *      わかりやすい説明や根拠、計算方法を提示してください」
 *
 *  ★短くします（走りながら読むものなので、長いと壁になります）。
 *    ・わかること … 3つまで
 *    ・もと … どの記録から出しているか
 *    ・数え方 … どう計算しているか
 * ---------------------------------------------------------- */
/* ------------------------------------------------------------
 *  このページを見てわかること（ご指示・2026/11/15）
 *
 *  ★「読むときの注意」は、ここにまとめました（ご指示・2026/11/16
 *      「読む時の注意なども、このページを見てわかることとまとめて
 *        もっと端的に読みやすくしてください」）。
 *    別の欄に分けると、同じような説明が2か所に出て、どちらも読まれません。
 *  ★どの行も、1行で言い切ります。長い説明は【お知らせ】のほうへ。
 *    w … わかること（2〜3つ）／m … もと／c … 数え方／n … 注意
 * ---------------------------------------------------------- */
const LEADS = {
  in: { w: ['きょうまでの記録を、新しい順に',
            '営業月ごとの件数と売上',
            '入れ間違いは、その場で直せます'],
        m: '自分たちの記録（LINEと台帳の両方）',
        c: '合計は、金額の入った記録だけ',
        n: '「不明」は数えません' },
  hot:{ w: ['いまの時刻に、どこへ行くとよいか',
            '翌4時までの、1時間ごとの狙い目',
            'いまの天気と、雨雲の動き'],
        m: 'この1か月＋去年の同じ月の記録と、気象庁の天気',
        c: '3件以上そろった乗り場だけ。数字は1本の平均金額',
        n: '催しのある夜は、記録より催しが先です' },
  g:  { w: ['時間帯ごとに、どの乗り場が強いか（表）',
            '1本ずつの待ち時間と流れ（棒）',
            '時刻と金額のちらばり（線）'],
        m: '絞り込みで選んだ期間・乗り場の記録',
        c: 'マスは1本の平均金額、下は件数',
        n: '金額が「不明」の記録は、平均から外します' },
  map:{ w: ['えらんだ時間帯・金額の記録が、どのあたりに多いか',
            '1本 乗せたあと、次をどこで拾えているか'],
        m: '自分たちの記録と、無料の地図（OpenStreetMap）',
        c: '丸の大きさは件数、色は1本の平均金額',
        n: 'ピンは、乗り場のあるあたりです' },
  ratio:{ w: ['ロング（¥10,000以上）が出やすい乗り場と時間帯',
              'ショート・ミドル・ロングの割合'],
        m: '金額の入った記録だけ',
        c: 'その乗り場の記録のうち、何％か',
        n: '3件に届かない乗り場は出しません' },
  tok:{ w: ['種類ごとに、何時台に多いか',
            '会場やホテルごとの、呼ばれやすい時間'],
        m: 'GO／Uber の記録と、「他」に書いた印の記録',
        c: 'ここだけは1件からでも出します',
        n: '少ない所には「まだ○件」と書いてあります' },
  rep:{ w: ['「他」に印のある、くり返しの乗車',
            'いつ・どこで・いくらだったか'],
        m: '「他」に 〇回目・再現性 と書いた記録',
        c: 'ご自身で付けた印が、そのまま出ます',
        n: '印の無い乗車は出ません（書いた分だけです）' },
  ev: { w: ['きょう・あすの催しと、開演・終演の時刻',
            '会場の場所（押すと地図）'],
        m: '会場の公式ページと、職場で回ってくる予定表',
        c: '車を着ける目安は、終演の15分前',
        n: '公式に出ていない終演は「（予定）」と書きます' },
  nippo:{ w: ['紙の日報の写真から、1行ずつ読み取ったもの',
              'いまの記録と比べて、入っているか・まだかが分かります'],
        m: '置いた写真と、台帳の記録',
        c: '営業日・時刻（5分まで）・金額が同じなら「もう入っています」',
        n: '読んだだけでは記録に入りません' },
  news:{ w: ['使い方と、直したところのお知らせ'], m: '', c: '', n: '' },
  fb: { w: ['気づいたことを書いて送れます'], m: '', c: '', n: '' }
};
function leadCard(k){
  const L = LEADS[k];
  if (!L) return '';
  /* ★もと・数え方・注意は、1行ずつ並べます。
       札（もと／数え方／注意）を頭に付けると、どれが何の話か すぐ分かります。 */
  const line = function (t, v){
    return v ? '<div class="leadr"><b>' + t + '</b><span>' + esc(v) + '</span></div>' : '';
  };
  return '<div class="card lead"><h2>このページを見てわかること</h2>' +
    '<ul class="leadw">' + L.w.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    line('もと', L.m) + line('数え方', L.c) + line('注意', L.n) +
    '</div>';
}

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
        <!-- ★「0」1つだけは、1段目のおしりに入れます（ご指示・2026/11/16
               「乗車金額タブも 0がら1個だけのやつは1行目にしてください」）。
             待ち時間の並びと同じ 1〜9＋0 になり、押す場所を覚え直さずに済みます。
             2段目は 00・000・0000 の3つだけです。 -->
        <div class="chips fares w10">${FARE_KEYS.map(v =>
          `<button class="chip" data-fa="${v}">${v}</button>`).join('')}<button
          class="chip" data-fa="0">0</button></div>
        <div class="chips fares z0">${FARE_ZEROS.slice(1).map(v =>
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
        <!-- ★「0」は1段目の おしりに入れます（ご指示・2026/11/14
               「待ち時間の0のタブは1列目に収められませんか？」）。
             1、2、…、9、0 の並びで、1段に10個。
             2段目は【←1つ消す】と【リセット】の2つだけになります。 -->
        <div class="chips fares w10">${FARE_KEYS.map(v =>
          `<button class="chip" data-wa="${v}">${v}</button>`).join('')}<button
          class="chip" data-wa="0">0</button></div>
        <div class="chips fares z">
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
      <!-- ★右下の固定ボタンと、同じ言い方にそろえます（ご指示・2026/11/16
             「記録するも きろく／粛清完了 に合わせてください」） -->
      <button class="btn" id="add">${editId ? '書きかえる'
        : '<span class="lab"><span class="k">粛清<i>きろく</i></span>完了</span>'}</button>
      ${editId ? `<button class="btn ghost" id="cancel">やめる</button>` : ''}
      ${msgHTML('msg')}
    </div>
  </div>

  `;
}

/* ------------------------------------------------------------
 *  記録の表（ご指示・2026/11/16「直近の記録は非表示にしてください」）
 *
 *  ★前は「直近の記録」という別の欄にしていました。
 *    その欄の中に、乗り場えらび・さがす欄・絞り込みが もう一組あり、
 *    すぐ上の「過去の記録」と まったく同じものが2つ並んでいました。
 *  ★欄をなくして、表だけを「過去の記録」の中に置きます。
 *    操作は1か所になり、記録を直す・消すは そのまま使えます。
 * ---------------------------------------------------------- */
function paneInRecent(){
  const L = tableSort(tblFilter(visible()));
  if (!visible().length) return '<div class="empty">該当データがありません。</div>';
  if (!L.length) return tableHTML([]) + '<div class="empty">絞り込みに当てはまる記録がありません。</div>';
  return '<p class="note">新しく入れたものが上から10件。見出しを押すと、並べ替えられます。</p>' +
    tableHTML(L.slice(0, 10));
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
/* ------------------------------------------------------------
 *  乗り場を、記録用スプレッドシートのタブと同じに振り分ける
 *
 *  ★まーく様のご指摘（2026/11/13）
 *    「え、他エリア、めちゃくちゃ過ぎますよ。
 *      北と南とで、まったく振り分けできてません」
 *    「もっとスプシのタブを参照してください」
 *
 *  ★これまでは、こちらで思いついた言葉だけで分けていました。
 *    スプレッドシート側（001-Code.gs の categoryOf_）が持っている
 *    本物の表を、そのまま写しました。これで タブと同じ中身になります。
 *  ★表を直すときは、スプレッドシート側と ここの両方を直します。
 *    片方だけ直すと、スプシと台帳で 中身が食い違います。
 * ---------------------------------------------------------- */
/* 北の乗り場のことば（スプシの NORTH_WORDS と同じ） */
const NORTH_WORDS = ["堂山","東通り","阪急東","神山町","中崎町","茶屋町","角田町","小松原",
"大深町","芝田","西天満","老松通り","兎野町","兎我野町","マネプラ","ガチマネプラ","乗場マネプラ",
"西中","お初","江坂","梅田","大阪駅","東梅田","西梅田","北新地","中津","豊崎","福島","野田",
"中之島","淀屋橋","肥後橋","渡辺橋","大江橋","南森町","大阪天満宮","天満","扇町","天神橋筋",
"堂島","曽根崎","太融寺","桜橋","堂島大橋","水晶橋","鉾流橋","堀川","ライオン橋","難波橋",
"キタ","スエヒロ","アナクラ","ANAクラ","リッツカールトン","コンラッド","ヒルトン","インターコンチネンタル",
"マルビル","グランヴィア","広芝町","天六","天神橋筋六丁目","中崎","梅田","茶屋町","古川橋","菅原町","樋之口町"];
/* 南の乗り場のことば（スプシの SOUTH_WORDS と同じ） */
const SOUTH_WORDS = ["千日前","裏なんば","座裏","アメ村","アメリカ村","心斎橋筋","御堂筋",
"西心斎橋","東心斎橋","南船場","黒門","千代崎","大正","心斎橋","難波","なんば","道頓堀",
"日本橋","近鉄日本橋","長堀橋","四ツ橋","大国町","桜川","恵美須町","今宮戎","湊町","芦原橋",
"宗右衛門","周防","ヨーロッパ","久左衛門","九郎右衛門","八幡筋","三津寺","三ツ寺","戎橋",
"ひっかけ橋","日本一","相合橋","太左衛門橋","大黒橋","高島屋","マルイ","なんばパークス",
"スイスホテル","センタラグランド","クロスホテル","鰻谷","清水","三休橋","長堀","汐見橋",
"ミナミ","ﾐﾅﾐ","みなみ","センタラ","夕陽丘","八幡","新橋","大丸","宗右衛門町","三津寺町","三津寺筋","笠屋町","玉屋町","畳屋町","島之内","東心斎橋","西賑町","元町","難波中","難波千日前","湊町リバープレイス","OCAT","なんばCITY"];
/** 全角を半角に、全角の空白を 普通の空白に（スプシの toHalf_ と同じ） */
function toHalfW(s){
  return String(s == null ? '' : s)
    .replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, function (c){ return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/　/g, ' ')
    .trim();
}
/** 「〜通」で終わる言い方も、同じ所として見ます（スプシの matchWord_ と同じ） */
function matchWord(p, list){
  const t = String(p).replace(/(通|とおり|どおり|とうり|どうり)$/, '');
  for (let i = 0; i < list.length; i++) if (t.indexOf(list[i]) !== -1) return true;
  return false;
}

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
  return placeCat((r && r.place) || '');
}
/**
 * 乗り場の名前だけで決まる分け方。
 * ★スプレッドシートの categoryOf_ と、1行ずつ同じにしてあります。
 */
function placeCat(p){
  const v = toHalfW(p);
  if (/新地\s*7(?!\d)/.test(v) || /北\s*7(?!\d)/.test(v) || /^7$/.test(v)) return '北7';
  if (/新地\s*4(?!\d)/.test(v) || /北\s*4(?!\d)/.test(v) || /^4$/.test(v)) return '北4';
  if (v.indexOf('ドン') !== -1 || v.indexOf('ドンキ') !== -1) return 'ﾐﾅﾐ';
  if (matchWord(v, SOUTH_WORDS)) return 'ﾐﾅﾐ';
  if (v.indexOf('新地') !== -1 || matchWord(v, NORTH_WORDS)) return '北他';
  return 'ほか';
}

/* ------------------------------------------------------------
 *  乗り場の「だいたいの場所」（地図にピンを打つため）
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「マップに対して、ピンを打って 時間帯、金額別に
 *      例えば、20時台の￥3,000以上 という形で該当する場所にピンを打って、
 *      視覚化しやすい形のページを作って欲しいです」
 *
 *  ★ここに書いてあるのは「そのあたり」の緯度・経度です。
 *    1件ごとの正確な場所ではありません。画面にも、そう書いています。
 *    分からない名前には、ピンを**打ちません**。
 *    あてずっぽうの場所に打つほうが、何も出さないより ずっと悪いためです。
 *  ★お金はかかりません。住所を調べにいく先（有料の地図）は使っていません。
 *    地図そのものは OpenStreetMap（無料・鍵なし）です。
 * ---------------------------------------------------------- */
const PLACE_GEO = [
  /* 北（キタ） */
  ['北新地',[34.6966,135.4958]], ['新地',[34.6966,135.4958]],
  ['梅田',[34.7025,135.4959]], ['大阪駅',[34.7025,135.4959]],
  ['西梅田',[34.7008,135.4930]], ['東梅田',[34.7017,135.5005]],
  ['茶屋町',[34.7078,135.4995]], ['堂山',[34.7045,135.5010]],
  ['中崎町',[34.7090,135.5050]], ['中崎',[34.7090,135.5050]],
  ['曽根崎',[34.7008,135.5008]], ['太融寺',[34.7055,135.5035]],
  ['兎我野町',[34.7036,135.5055]], ['兎野町',[34.7036,135.5055]],
  ['東通り',[34.7042,135.5040]], ['角田町',[34.7035,135.4995]],
  ['堂島',[34.6950,135.4935]], ['桜橋',[34.6975,135.4955]],
  ['マルビル',[34.7000,135.4945]], ['グランヴィア',[34.7020,135.4985]],
  ['ヒルトン',[34.7005,135.4938]], ['リッツカールトン',[34.6995,135.4915]],
  ['インターコンチネンタル',[34.7060,135.4930]], ['コンラッド',[34.6928,135.4930]],
  ['阪急東',[34.7055,135.5000]], ['芝田',[34.7060,135.4975]],
  ['中津',[34.7125,135.4940]], ['豊崎',[34.7085,135.4985]],
  ['福島',[34.6950,135.4855]], ['野田',[34.6930,135.4700]],
  ['中之島',[34.6930,135.4950]], ['淀屋橋',[34.6925,135.5012]],
  ['肥後橋',[34.6907,135.4950]], ['渡辺橋',[34.6935,135.4960]],
  ['大江橋',[34.6945,135.5000]], ['水晶橋',[34.6940,135.5020]],
  ['南森町',[34.6980,135.5105]], ['大阪天満宮',[34.6968,135.5120]],
  ['天神橋筋六丁目',[34.7117,135.5118]], ['天六',[34.7117,135.5118]],
  ['天満',[34.7050,135.5125]], ['扇町',[34.7060,135.5095]],
  ['天神橋筋',[34.7000,135.5115]], ['西天満',[34.6975,135.5050]],
  ['老松通り',[34.6975,135.5035]], ['西中',[34.6985,135.4985]],
  ['お初',[34.6998,135.4990]], ['大深町',[34.7050,135.4930]],
  ['キタ',[34.7010,135.4980]],
  /* 南（ミナミ） */
  ['難波',[34.6657,135.5010]], ['なんば',[34.6657,135.5010]],
  ['道頓堀',[34.6687,135.5013]], ['戎橋',[34.6687,135.5010]],
  ['ひっかけ橋',[34.6687,135.5010]], ['宗右衛門',[34.6692,135.5025]],
  ['心斎橋',[34.6745,135.5010]], ['西心斎橋',[34.6730,135.4990]],
  ['東心斎橋',[34.6735,135.5035]], ['アメリカ村',[34.6723,135.4983]],
  ['アメ村',[34.6723,135.4983]], ['三津寺',[34.6700,135.5005]],
  ['千日前',[34.6660,135.5035]], ['黒門',[34.6650,135.5065]],
  ['日本橋',[34.6630,135.5063]], ['長堀橋',[34.6755,135.5070]],
  ['四ツ橋',[34.6730,135.4960]], ['南船場',[34.6780,135.5020]],
  ['島之内',[34.6710,135.5040]], ['鰻谷',[34.6730,135.5020]],
  ['大国町',[34.6520,135.4960]], ['桜川',[34.6660,135.4880]],
  ['恵美須町',[34.6520,135.5060]], ['今宮戎',[34.6540,135.5020]],
  ['湊町',[34.6665,135.4950]], ['OCAT',[34.6665,135.4950]],
  ['高島屋',[34.6650,135.5010]], ['なんばパークス',[34.6610,135.5020]],
  ['なんばCITY',[34.6640,135.5020]], ['大丸',[34.6735,135.5005]],
  ['スイスホテル',[34.6640,135.5020]], ['センタラ',[34.6650,135.5045]],
  ['クロスホテル',[34.6710,135.5015]], ['大正',[34.6690,135.4800]],
  ['芦原橋',[34.6600,135.4830]], ['汐見橋',[34.6700,135.4900]],
  ['夕陽丘',[34.6560,135.5130]], ['ミナミ',[34.6680,135.5020]],
  /* そのほか、よく出る所 */
  ['京橋',[34.6966,135.5340]], ['本町',[34.6823,135.5003]],
  ['新大阪',[34.7338,135.5000]], ['天王寺',[34.6455,135.5140]],
  ['鶴橋',[34.6650,135.5330]], ['上本町',[34.6690,135.5180]],
  ['弁天町',[34.6690,135.4610]], ['江坂',[34.7580,135.4980]],
  ['関西空港',[34.4347,135.2329]], ['関空',[34.4347,135.2329]],
  ['古川橋',[34.7355,135.5790]], ['菅原町',[34.6960,135.5090]]
];
/**
 * 乗り場の名前から、だいたいの場所を引きます。
 * 名前の中に入っていれば拾います。長い名前から先に見ます
 * （「天神橋筋六丁目」を「天満」より先に当てるため）。
 * 分からなければ null を返し、ピンは打ちません。
 */
function placeGeo(p){
  const v = toHalfW(p);
  if (!v) return null;
  let hit = null, len = -1;
  for (let i = 0; i < PLACE_GEO.length; i++) {
    const k = PLACE_GEO[i][0];
    if (v.indexOf(k) !== -1 && k.length > len) { hit = PLACE_GEO[i]; len = k.length; }
  }
  if (!hit) return null;
  /* ★同じ場所を指す別の言い方（新地／北新地、梅田／大阪駅…）は、
       1つのピンにまとめます。別々にすると、同じ所に丸が重なって読めません。
       名前は、上の表で先に書いてあるほう（代表の言い方）を使います。 */
  for (let j = 0; j < PLACE_GEO.length; j++) {
    if (PLACE_GEO[j][1][0] === hit[1][0] && PLACE_GEO[j][1][1] === hit[1][1]) { hit = PLACE_GEO[j]; break; }
  }
  return { key: hit[0], lat: hit[1][0], lon: hit[1][1] };
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

/*
 * ★乗り場のプルダウンに、中身を入れます（2026/11/14）。
 *
 * ★まーく様のご指摘
 *     「このオプションなしとはどういうことでしょうか」
 *   【直近の記録】の中のプルダウンが、からっぽでした。
 *   iPhone は、中身が1つも無いプルダウンを押すと
 *   「オプションなし」という画面を出します。
 *   中身を入れたあとに、その場所を作り直していたため、
 *   せっかく入れたものが 毎回 消えていました。
 *   だから、作り直したあとに もう一度 入れます。
 */
/*
 * ★「横にスクロールできます」は、ほんとうに動かせるときだけ出します
 *   （ご指示・2026/11/14「横スクロール不要なものは、
 *     横スクロールしてという説明などは無しにしてください」）。
 *   画面に収まっているのに案内が出ていると、
 *   「動かせるのかな」と探させてしまいます。
 */
function snoteFit(){
  document.querySelectorAll('.snote').forEach(function (n) {
    const box = n.nextElementSibling;
    if (!box || box.className.indexOf('scroll') === -1) return;
    n.hidden = (box.scrollWidth <= box.clientWidth + 1);
  });
}

function placeSelFill_(){
  [$('#ktPlace'), $('#ktPlace2')].forEach(function (kpl) {
    if (!kpl) return;
    kpl.innerHTML = placeOptions();
    kpl.classList.toggle('on', !!onlyPlace);
  });
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
const periodSel = () =>
  `<select class="fsel ${period.mode!=='all'?'on':''}" data-filt="period">${periodOptions()}</select>`;
const prangeBox = () => (period.mode === 'free' ? `<div class="filt2 prange">
    <label><span>はじめの日</span>
      <input type="date" data-filt="from" value="${esc(period.from)}"></label>
    <label><span>おわりの日</span>
      <input type="date" data-filt="to" value="${esc(period.to)}"></label>
  </div>` : '');
const periodBox = () => periodSel() + prangeBox();

/* 大カテゴリーのタグ（ご指示・2026/11/12）。'' は「すべて」 */
const CAT_CHIPS = [''].concat(CAT_ORDER);

/**
 * 絞り込みのタグ。
 *   full を true にすると、大カテゴリーと期間も出します。
 *   ★グラフの画面では、上まで戻らずに切り替えられることが大事です。
 */
/*
 * 絞り込み。
 *   full を true にすると、エリア・中分類・期間も出します。
 *
 * ★ご指示・2026/11/17
 *   「選択する内容は、タブ形式ではなく、
 *     全て1行ずつのプルダウン形式にしてください」
 *
 *   タグを横に並べていたので、画面の広さで折り返し方が変わり、
 *   どれが同じ仲間なのか分かりませんでした。
 *   1行に「名前」と「プルダウン」を1つずつ置くと、
 *   上から順に読むだけで、いま何で絞っているかが分かります。
 */
const fOpt = (v, now, label) =>
  '<option value="' + esc(v) + '"' + (String(now) === String(v) ? ' selected' : '') +
  '>' + esc(label) + '</option>';

const filterChips = (full) => `<div class="filt">
  <div class="frow"><label>だれの記録</label>
    <select class="fsel ${onlyMine?'on':''}" data-fs="mine">
      ${fOpt('0', onlyMine?'1':'0', '全員')}${fOpt('1', onlyMine?'1':'0', '自分だけ')}
    </select></div>
  <!-- ★営業曜日でも絞れます（ご指示・2026/11/12）。
       平日と土日祝では、売上の出方がまるで違うためです。 -->
  <div class="frow"><label>営業曜日</label>
    <select class="fsel ${onlyDay?'on':''}" data-fs="day">
      ${fOpt('', onlyDay, 'すべて')}
      ${DAY_CHIPS.map(d => fOpt(d.k, onlyDay, d.n)).join('')}
    </select></div>
  ${full ? `<div class="frow"><label>エリア</label>
    <select class="fsel ${onlyBig?'on':''}" data-fs="big">
      ${fOpt('', onlyBig, 'すべて')}
      ${BIG_ORDER.map(k => fOpt(k, onlyBig, k)).join('')}
    </select></div>
  <div class="frow"><label>中分類</label>
    <select class="fsel ${onlyCat?'on':''}" data-fs="cat">
      ${fOpt('', onlyCat, onlyBig ? onlyBig + '：すべて' : 'すべて')}
      ${(onlyBig ? (BIG_CATS.filter(b => b.k === onlyBig)[0] || {subs:[]}).subs : CAT_ORDER)
        .map(k => fOpt(k, onlyCat, k)).join('')}
    </select></div>
  <div class="frow"><label>期間</label>${periodSel()}</div>
  ${prangeBox()}` : ''}
  <!-- ★いま何で絞っているかを、すぐ下に出します。
       絞ったまま忘れると、数字を読み違えます。 -->
  ${filtOn() ? `<div class="fnow">いま：${
    [onlyBig ? esc(onlyBig) : '', onlyCat ? esc(onlyCat) : '',
     onlyPlace ? esc(splitSel(onlyPlace).place || onlyPlace) : '',
     (DAY_CHIPS.filter(d => d.k === onlyDay)[0] || {}).n || '',
     periodLabel()].filter(Boolean).join('／')
  }</div>
  <div class="frow one">
    <button class="chip warn rst" id="fClear">絞り込みを解除</button></div>` : ''}
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
/* 表の欄（見出しの字・並べるときの名前・幅のしるし） */
const TBL_COLS = [
  /* ★「日」の欄を足しました（2026/11/16）。
       並びの既定が「新しく入れた順」になったので、
       日づけの見出し行が出なくなり、いつの記録か分からなくなるためです。
       ここに出しておけば、並べ替えても絞り込んでも、必ず見えます。 */
  { k:'date',   n:'日',  c:'c-date' },
  { k:'who',    n:'名',  c:'c-who'  },
  { k:'tsuke',  n:'付',  c:'n'      },
  { k:'wait',   n:'待',  c:'n'      },
  { k:'dep',    n:'発',  c:'n'      },
  { k:'fare',   n:'金',  c:'n c-fare' },
  { k:'place',  n:'乗',  c:'c-place' },
  /* ★種と他は、やっぱり分けます（ご指示・2026/11/16
       「他の文章が長くなる可能性があるため 種と他は、やっぱりわけてください」） */
  { k:'method', n:'種',  c:'c-meth' },
  { k:'note',   n:'他',  c:'c-note' }
];

function tableHTML(rows){
  let last = '', lastCat = '';
  const fresh = newestId();
  /* ★エリアの区切りは、日づけの順に並べているときだけ入れます。
       ほかの欄で並べ直したときに入れると、区切りがバラバラに出て読めません。 */
  const byDate = (tblSort.k === 'date');
  const body = rows.map(function (r) {
    let head = '';
    if (byDate && r.date !== last) {
      /* ★日が変わるところに、1行ぶんの空きを入れます（ご指示・2026/11/16
           「日付をまたぐさい、日付の境目の高さ空白を、ほかと同じくらいの
             高さ分あけて、区切りがわかるようにしてください」）。
         表のつめっぷりが同じだと、どこで日が変わったのか分かりませんでした。
         一番上の日には入れません（見出しのすぐ下なので、要りません）。 */
      if (last) head += '<tr class="dgap"><td colspan="10"></td></tr>';
      last = r.date; lastCat = '';
      head += '<tr class="dhead ' + dayCls(r.date) + '"><td colspan="10">' +
             esc(fmtD(r.date)) + '　<small>' + esc(dayName(r.date)) + '</small></td></tr>';
      const cat = recCat(r);
      lastCat = cat;
      head += '<tr class="ahead"><td colspan="10">' + esc(cat) + '</td></tr>';
    } else if (byDate) {
      const cat = recCat(r);
      if (cat !== lastCat) {
        lastCat = cat;
        head += '<tr class="ahead"><td colspan="10">' + esc(cat) + '</td></tr>';
      }
    }
    return head + '<tr' + (r.id === fresh ? ' class="fresh"' : '') + '>' +
      /* ★かっこは外して「11/15日」の形にします。欄を一番 細くするためです */
      '<td class="c-date ' + dayCls(r.date) + '">' +
        esc(String(fmtD(r.date || '')).replace(/\((.)\)/, '$1')) + '</td>' +
      '<td class="c-who ' + whoCls(r.user_id) + '">' +
        (r.id === fresh ? '<i class="nw">新</i>' : '') + esc(kana(r.who)) + '</td>' +
      '<td class="n">' + showT(tsuke(r)) + '</td>' +
      '<td class="n ' + waitCls(r.wait) + '">' + (isUnk(r.wait) ? UNK : r.wait) + '</td>' +
      '<td class="n">' + showT(r.dep) + '</td>' +
      /* ★金額は右にそろえます（ご指示・2026/11/16「金額は右揃えにしてください」）。
           桁がそろうので、高い・安いが一目で分かります。 */
      '<td class="n c-fare ' + fareCls(r.fare) + '">' + showYen(r.fare) + '</td>' +
      '<td class="c-place">' + (r.place ? placeLink(canonPlace(r.place)) : UNK) + '</td>' +
      /* ★種（乗せ方） */
      '<td class="c-meth">' + (r.method
        ? '<span class="mtag ' + mcls(r.method) + '">' + esc(normMethod(r.method)) + '</span>'
        : '<span class="dim">—</span>') + '</td>' +
      /* ★他（書きそえ）。長くなることがあるので、別の欄にしています */
      '<td class="ja c-note">' + (r.note
        ? '<span class="ntxt">' + esc(r.note) + '</span>'
        : '<span class="ntxt dim">—</span>') + '</td>' +
      /* ★修正・削除は、表の右端に置きます（ご指示・2026/11/12） */
      '<td class="ops">' + (canEdit(r)
        ? '<button class="mini" data-edit="' + r.id + '">修正</button>' +
          '<button class="mini del" data-del="' + r.id + '">削除</button>' : '') + '</td></tr>';
  }).join('');

  /* 見出し（押すと、その欄で並べ直します） */
  const arrow = function (k){
    if (tblSort.k !== k) return '';
    return '<i class="sar">' + (tblSort.d > 0 ? '▲' : '▼') + '</i>';
  };
  const ths = TBL_COLS.map(function (c){
    return '<th class="' + (c.c.indexOf('n') === 0 ? 'n' : '') + '">' +
      '<button class="thb" data-sort="' + c.k + '">' + c.n + arrow(c.k) + '</button></th>';
  }).join('');
  /* 絞り込みの欄（スプシのフィルタと同じ考え方。字がふくまれていれば残ります） */
  const fils = TBL_COLS.map(function (c){
    return '<th class="fil"><input class="tfi" data-fil="' + c.k + '" ' +
      'value="' + esc(String(tblFil[c.k] || '')) + '" ' +
      'aria-label="' + c.n + 'で絞り込む"></th>';
  }).join('');

  return '<div class="tbar">' +
      '<button class="chip' + (tblFilOpen ? ' on' : '') + '" id="tblFilBtn">絞り込み' +
        (tblFilOn() ? '<span class="cnt">' + Object.keys(tblFil).length + '</span>' : '') +
      '</button>' +
      (tblFilOn() ? '<button class="chip rst" id="tblFilClr">絞り込みを解除</button>' : '') +
      '<button class="chip' + (tblSort.k === 'made' && tblSort.d === -1 ? ' on' : '') +
        '" id="tblSortNew">新しい登録が上</button>' +
    '</div>' +
    /* ★横に流れることは、必ず先に書きます（ご指示・2026/11/16
         「スクロールできることや、横画面推奨を載せてください」） */
    '<div class="snote">← 横にスクロールできます（横画面推奨）。' +
      '見出しを押すと、その欄で並べ替えます。</div>' +
    '<div class="scroll tbl"><table><thead><tr>' + ths +
    '<th class="ops">修正<br>削除</th></tr>' +
    (tblFilOpen ? '<tr class="filrow">' + fils + '<th class="ops"></th></tr>' : '') +
    '</thead><tbody>' + body + '</tbody></table></div>' +
    /* ★色の見方を、端的に1行で（ご指示・2026/11/13
         「表の色変えの説明も端的に(長文にならないように)載せてください」）。 */
    '<div class="clegend">' +
    '<span><b class="nw">新</b>最後に入れた記録</span>' +
    '<span>名＝人ごとの色</span>' +
    '<span><i class="lw1"></i>待ち10分以内</span>' +
    '<span><i class="lw2"></i>30分以内</span>' +
    '<span><i class="lf3"></i>¥5千〜</span>' +
    '<span><i class="lf4"></i>¥1万〜</span>' +
    '<span><i class="lf5"></i>¥2万〜</span>' +
    '</div>';
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
 *  題の下の一文（ご指示・2026/11/15）
 *
 *  ★まーく様のご指示
 *    「完全万収ライナーは、やめて
 *      乗り場が、メンバーの中で多く付けている人に対して
 *      例) 最多付け待ちの為、江坂駅タクシー乗り場のLは〝○○〟です
 *      みたいにしてください
 *      2行になったり、はみ出したりしないように調整してください
 *      ここの文章に限り、乗り場名が長すぎる場合は｢…｣もつけて良いものとします
 *      ただし、メンバーに偏りがないように
 *      メンバーが2回同時に出ないような形で順に表示させる形にしてください
 *      更新する度に切り替わる形で良いです」
 *
 *  ★「最多」と言い切れるときだけ出します。
 *    1件しかない乗り場や、同じ数で並んでいる乗り場は出しません。
 *    言い切れないことを言うと、人の間に きれつが生まれます。
 * ---------------------------------------------------------- */
const MANSHU = 10000;        /* 万収（1万円以上）。ほかの画面で使っています */

/** 乗り場ごとの「一番多く付けている人」 */
function lordList(){
  const by = {};
  (records || []).forEach(function (r){
    const p = canonPlace(String((r && r.place) || '').trim());
    if (!p) return;
    const k = kunName(r.user_id);
    if (!k) return;
    by[p] = by[p] || {};
    by[p][k] = (by[p][k] || 0) + 1;
  });
  const out = [];
  Object.keys(by).forEach(function (p){
    const m = by[p];
    const ks = Object.keys(m).sort(function (a, b){
      return m[b] - m[a] || (a < b ? -1 : 1);
    });
    const top = ks[0];
    if (!top || m[top] < 2) return;                     /* 1件は、たまたまの1本 */
    if (ks.length > 1 && m[ks[1]] === m[top]) return;   /* 同じ数なら「最多」と言えない */
    out.push({ p: p, who: top, n: m[top] });
  });
  return out;
}

/**
 * 出す順番を決めます。
 *  ・同じ人が続けて出ないように
 *  ・人にかたよらないように（残りの多い人から出す）
 */
function lordOrder(list){
  const by = {};
  list.forEach(function (x){ (by[x.who] = by[x.who] || []).push(x); });
  Object.keys(by).forEach(function (k){
    by[k].sort(function (a, b){ return b.n - a.n; });   /* 件数の多い乗り場から */
  });
  const out = [];
  let prev = '';
  for (let guard = 0; guard < 500; guard++) {
    const left = Object.keys(by).filter(function (k){ return by[k].length; });
    if (!left.length) break;
    let ks = left.filter(function (k){ return k !== prev; });
    if (!ks.length) ks = left;                          /* 残りが1人だけのとき */
    ks.sort(function (a, b){ return by[b].length - by[a].length || (a < b ? -1 : 1); });
    out.push(by[ks[0]].shift());
    prev = ks[0];
  }
  /*
   * ★ぐるっと一周して、最後と先頭が同じ人になることがあります。
   *   そのままだと、開き直したときに同じ人が2回続きます。
   *   「続いている所」の数が減る入れ替えを、減らなくなるまで探します。
   */
  const bads = function (L){
    let c = 0;
    for (let i = 0; i < L.length; i++) if (L[i].who === L[(i + 1) % L.length].who) c++;
    return c;
  };
  for (let g = 0; g < 200 && out.length > 2; g++) {
    const now = bads(out);
    if (!now) break;
    let done = false;
    for (let i = 0; i < out.length && !done; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const t = out[i]; out[i] = out[j]; out[j] = t;
        if (bads(out) < now) { done = true; break; }
        const u = out[i]; out[i] = out[j]; out[j] = u;     /* 戻す */
      }
    }
    if (!done) break;                /* これ以上は減らせません（人が片寄りすぎ） */
  }
  return out;
}

/* ★「更新する度に切り替わる形で良いです」。開き直すたびに1つ進めます */
const LORD_KEY = 'tsukemachi.lord';
let lordSeq = 0;
function lordSeqInit(){
  try {
    lordSeq = (parseInt(localStorage.getItem(LORD_KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(LORD_KEY, String(lordSeq));
  } catch (e) { lordSeq = 1; }
}
/** きょう出す1つ（無ければ null） */
function lordPick(){
  const L = lordOrder(lordList());
  if (!L.length) return null;
  return L[((lordSeq % L.length) + L.length) % L.length];
}

/* 字が枠からはみ出しているか（小数のまま測ります） */
function subOver(el){
  try {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    return rg.getBoundingClientRect().width > el.getBoundingClientRect().width - 0.6;
  } catch (e) { return el.scrollWidth > el.clientWidth; }
}

/**
 * 題の下の一文を入れます。
 * ★乗り場の名前が長いときは、ここだけ「…」で短くしてよい、とのご指示です。
 */
function subSet(el){
  if (!el) return;
  const x = lordPick();
  if (!x) { el.textContent = subLine(); subFit(el); return; }
  /* ★はじめに、対象の日付（曜日）を入れます（ご指示・2026/11/16
       「これ系については 初めに、対象の日付(曜)も入れてください」）。
       いつ見ている話なのかが、一目で分かるようにするためです。 */
  const mk = function (p){
    return fmtD(today()) + '　最多付け待ちの為、' + p + 'のLは〝' + x.who + '〟です';
  };
  const ch = [...String(x.p)];
  el.style.fontSize = '';
  el.textContent = mk(x.p);
  for (let n = ch.length - 1; n >= 2 && subOver(el); n--) {
    el.textContent = mk(ch.slice(0, n).join('') + '…');
  }
  subFit(el);                       /* それでも入らなければ、字を小さくします */
}

/* ------------------------------------------------------------
 *  名前の出し方（まーく様のご指示・2026/11/12）
 *
 *  ★前は「昨日の万収ライナー」をほめる一文を出していましたが、
 *    2026/11/15 のご指示でやめました。いまは上の subSet のとおりです。
 *    この表（KUN）は、そちらでも使っています。
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
/*
 * ★「完全万収ライナー」の一文は、やめました（ご指示・2026/11/15）。
 *   いまは「最多付け待ちの為、〇〇のLは〝△△〟です」を出します（subSet）。
 *   ここは、その一文が出せないとき（記録がまだ足りないとき）の控えです。
 */
function subLine(){
  /* ★スマホで1行に収めるため、短い言い方にしました（ご指示・2026/11/13）。
       前は「近日中、誰かがワンメータを乗せたら、〜」で29字あり、
       390px の画面で おしりが「…」で切れていました。 */
  return '近日、誰か１メーターを引けば〝' + kiraToday() + '〟がキラです';
}

/* ------------------------------------------------------------
 *  題の下の一文を、必ず1行に収める（ご指示・2026/11/13）
 *    「1画面で収まるようにしてください。
 *      これでも収まらなければ、収まるように工夫してください」
 *
 *  ★名前によって長さが変わるので、字の大きさを決め打ちにすると
 *    いつか はみ出します（実際に 320px の機種で「…」と切れていました）。
 *    入るまで、少しずつ小さくします。それでも読める下限（9px）で止めます。
 *  ★折り返させません。折り返すと題の位置が下がって、まわりがずれます。
 * ---------------------------------------------------------- */
function subFit(el){
  try {
    const row = el.parentElement;
    if (row) row.classList.remove('wide');
    /*
     * ★はみ出しているか。枠より中身が広ければ、おしりが「…」になります。
     *
     * ★ここは scrollWidth で見てはいけません（2026/11/13・実機で確認）。
     *   scrollWidth は整数に丸められるので、中身 215.6px・枠 215.2px の
     *   ように 0.4px だけはみ出しているときも「215 と 215」で同じに見えます。
     *   それで「入っている」と思い込み、実際の画面では
     *   「…がキラで…」と切れていました。
     *   字そのものの幅（Range）を、小数のまま測ります。
     */
    const over = function (){
      try {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        return rg.getBoundingClientRect().width > el.getBoundingClientRect().width - 0.6;
      } catch (e) { return el.scrollWidth > el.clientWidth; }
    };
    el.style.fontSize = '';
    if (!over()) return;                       // そのままで入る
    let px = parseFloat(getComputedStyle(el).fontSize) || 13;
    for (let i = 0; i < 24 && px > 9 && over(); i++) {
      px -= 0.25;
      el.style.fontSize = px + 'px';
    }
    if (!over()) {
      /* ★ぴったりだと、機種によっては おしりが「…」になります。
           もう1段だけ小さくして、余りを作ります。 */
      if (px > 9) { px -= 0.25; el.style.fontSize = px + 'px'; }
      return;
    }
    /* ★9px より小さくすると読めないので、そこで字を小さくするのはやめ、
         一文を「版の札の下」の1行まるごとに移します。
         万収をほめる一文（名前が2人ぶん並ぶ日）は、どうしても長いためです。
         題より下なので、題の位置は動きません。
       ★移したら、字の大きさは元に戻します（広いので小さくする必要がありません）。 */
    if (row) { row.classList.add('wide'); el.style.fontSize = ''; }
  } catch (e) {}
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

/* ------------------------------------------------------------
 *  グラフ（3つを1ページにまとめたもの）
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「よく考えたら、比較表が沢山あっても訳が分からなくなるので
 *      棒グラフ 横グラフ 表グラフ これらは、同じページにまとめて
 *      表はそれぞれ1つだけ表示して
 *      好きにカスタムできる検索欄的なものを設けて出す形にしてください」
 *
 *  前は、形ごとに1ページあり、その中で エリアごとに何枚も表を出していました。
 *  同じような表が並ぶと、どれを見ればよいのか分からなくなります。
 *  いまは「形をえらぶ」「絞り込む」で、**1枚だけ**を出します。
 * ---------------------------------------------------------- */
/* ★名前と並びは、まーく様のご指示のとおりです（2026/11/15）。
     「線グラフ 棒グラフ 表グラフ という表記にして
       各サブタイトル(わかりやすい説明)も端的にだしてください」 */
/* ★そえる字は、1行に収まる長さにします（ご指摘・2026/11/16
     「それぞれの高さの幅めちゃくちゃ過ぎます」）。
     長いと「ちらば／り」のように おしりだけ 次の行へ落ちて、
     ます目の高さが そろわなくなります。 */
const G_KINDS = [
  { k:'sc',   n:'線グラフ', s:'時刻と金額' },
  { k:'tl',   n:'棒グラフ', s:'1本ずつの流れ' },
  { k:'heat', n:'表グラフ', s:'時間帯×乗り場' }
];
/*
 * ★いまは「棒グラフ」だけを出します（ご指示・2026/11/17
 *     「グラフ、何が参考になるのかまったくわからなくなってきたので
 *       一旦棒グラフだけにして、ほかは非表示にしてください」）。
 *   線グラフ・表グラフは、消さずに残してあります。
 *   ここに 'sc' や 'heat' を書き足せば、そのまま戻ります。
 */
const G_SHOW = ['tl'];
const G_KINDS_ON = G_KINDS.filter(x => G_SHOW.indexOf(x.k) !== -1);
const G_KEY = 'tsukemachi.gkind';
let gKind = (function (){
  try { const v = localStorage.getItem(G_KEY);
    return G_SHOW.indexOf(v) !== -1 ? v : G_SHOW[0]; } catch (e) { return G_SHOW[0]; }
})();
function gKindSet(k){
  /* 出していない形がえらばれたら、出している形に戻します */
  gKind = (G_SHOW.indexOf(k) !== -1) ? k : G_SHOW[0];
  try { localStorage.setItem(G_KEY, gKind); } catch (e) {}
}

const G_NOTE = {
  heat: '時間帯ごとに、どの乗り場が強いかを並べた表です。マスの数字は1本の平均金額、下は件数です。',
  tl:   '1件ずつを、時刻の線の上に並べた図です。細い線が待ち時間、太い帯が乗せていた時間です。',
  sc:   '横は乗せた時刻（25＝翌1時）、縦は金額です。日付ごとに色を変えています。' };
/* えらぶところ（メニューの形）。押すと、その形の1枚に切り替わります */
const gMenu = (list, now, attr) => '<div class="gmenu">' + list.map(x =>
  '<button class="gm' + (now === x.k ? ' on' : '') + '" ' + attr + '="' + x.k + '">' +
  '<b>' + esc(x.n) + '</b><i>' + esc(x.s) + '</i></button>').join('') + '</div>';

function paneG(){
  const kind = gKind;
  /* 図に置けない記録は外します（折線グラフは、金額も要ります） */
  let R = visible().filter(kind === 'sc' ? (r => hasDep(r) && hasFare(r)) : hasDep);
  /* 乗り場のえらびは、絞る前の中身から作ります（えらぶと消えてしまうため） */
  const pls0 = sortPlaces([...new Set(R.map(r => r.place).filter(Boolean))]
    .map(p => ({ p: p, n: R.filter(r => r.place === p).length })));
  if (scPicks.length) R = R.filter(r => scPicks.indexOf(r.place) !== -1);

  const gk = G_KINDS.filter(x => x.k === kind)[0] || G_KINDS[1];
  const head = leadCard('g') + `<div class="card"><h2>${esc(gk.n)}　${esc(gk.s)}</h2>
    <p class="note">${G_NOTE[kind]}</p>
    ${G_KINDS_ON.length > 1 ? gMenu(G_KINDS_ON, gKind, 'data-gk') : ''}
    ${kind === 'sc' ? `<div class="toolbar">
      <button class="chip ${scOpt.line ? 'on' : ''}" data-opt="line">線でつなぐ</button>
      <button class="chip ${scOpt.label ? 'on' : ''}" data-opt="label">金額を出す</button>
    </div>` : ''}
    ${filterChips(true)}
    <!-- ★乗り場も、タグではなくプルダウンにしました（ご指示・2026/11/17）。
           さがす欄に字を打つと、下のプルダウンの中身が そのぶんだけになります。 -->
    <div class="filt">
      <div class="frow"><label>乗り場</label>
        <select class="fsel ${scPicks.length ? 'on' : ''}" id="scpSel">
          <option value=""${scPicks.length ? '' : ' selected'}>すべて</option>
          ${pls0.map(x => `<option value="${esc(x.p)}"${scPicks.indexOf(x.p) !== -1 ? ' selected' : ''}>${esc(x.p)}（${x.n}件）</option>`).join('')}
        </select></div>
      <div class="frow"><label>さがす</label>
        <input class="ja" data-filt-sel="scpSel" placeholder="例：梅田"></div>
    </div></div>`;
  if (!R.length) return head + emptyCard('該当データがありません');

  const title = scPicks.length ? scPicks.join('／') : (onlyCat || onlyBig || '乗り場：すべて');
  const sub = `<p class="note">${esc(title)}　${R.length}件・乗り場 ${
    new Set(R.map(r => r.place).filter(Boolean)).size}か所。</p>`;
  return head + '<div class="card">' + sub + gChart(kind, R) + '</div>';
}

/** えらんだ形で、1枚だけ描きます */
function gChart(kind, R){
  if (kind === 'tl') return tlChart(R);
  if (kind === 'sc') return scChart(R);
  const hs = R.map(r => Math.floor(r.dep));
  const hrs = []; for (let h = Math.min.apply(null, hs); h <= Math.max.apply(null, hs); h++) hrs.push(h);
  const names = [...new Set(R.map(r => r.place).filter(Boolean))];
  /* 並びは 大カテゴリー → 中カテゴリー → 件数の多い順（エリアが近い順） */
  const pls = [];
  BIG_CATS.forEach(function (bg){
    bg.subs.forEach(function (sub){
      const s2 = names.filter(function (p){
        const r0 = R.filter(r => r.place === p)[0];
        return r0 && recBig(r0) === bg.k && recCat(r0) === sub;
      }).map(p => ({ p: p, n: R.filter(r => r.place === p).length }));
      sortPlaces(s2).forEach(function (x){ if (pls.indexOf(x.p) === -1) pls.push(x.p); });
    });
  });
  names.forEach(function (p){ if (pls.indexOf(p) === -1) pls.push(p); });
  /* 色の濃さの基準は、1枚ぜんたいで共通にします */
  let mx = 1;
  pls.forEach(p => hrs.forEach(function (h){
    const tf = R.filter(r => r.place === p && Math.floor(r.dep) === h && hasFare(r));
    if (tf.length) mx = Math.max(mx, tf.reduce((a, r) => a + (+r.fare || 0), 0) / tf.length);
  }));
  return '<div class="snote">← 横にスクロールできます（横画面推奨）</div>' +
    '<div class="scroll fb">' + heatSvg(R, pls, hrs, mx, '合計') + '</div>' +
    `<div class="legend">
      <span><i style="background:rgba(240,163,59,.15)"></i>薄い＝1本が小さい</span>
      <span><i style="background:rgba(240,163,59,.92)"></i>濃い＝1本が大きい</span>
      <span>一番濃いマスの平均 ${yen(mx)}</span></div>`;
}

/* ------------------------------------------------------------
 *  有名な観光地・高級ホテル（地図のピン）
 *
 *  ★まーく様のご指示（2026/11/16）
 *    「有名観光サイトや、高級レストランを…
 *      チケット利用の可能性、Uber利用の可能性を…導き出して欲しいです」
 *
 *  ★場所は、こちらで1つずつ入れています（お金も、AIも使いません）。
 *  ★乗り場のピンとは、色を分けます。乗り場は「記録のある所」、
 *    こちらは「人が集まる所」で、意味がまったく違うためです。
 *  ★wj / we は、話題の伸びを調べるときの見出し語です
 *    （日本語版・海外版。分からないものは空にしてあります）。
 * ---------------------------------------------------------- */
const SPOT_GEO = [
  /* 観光 */
  ['大阪城',            34.6873, 135.5262, '観光', '大阪城', 'Osaka_Castle'],
  ['通天閣',            34.6525, 135.5063, '観光', '通天閣', 'Tsutenkaku'],
  ['道頓堀',            34.6687, 135.5013, '観光', '道頓堀', 'Dōtonbori'],
  ['心斎橋',            34.6745, 135.5010, '観光', '心斎橋', 'Shinsaibashi'],
  ['黒門市場',          34.6652, 135.5063, '観光', '黒門市場', 'Kuromon_Market'],
  ['海遊館',            34.6545, 135.4289, '観光', '海遊館', 'Osaka_Aquarium_Kaiyukan'],
  ['USJ',               34.6654, 135.4323, '観光', 'ユニバーサル・スタジオ・ジャパン', 'Universal_Studios_Japan'],
  ['梅田スカイビル',    34.7054, 135.4902, '観光', '梅田スカイビル', 'Umeda_Sky_Building'],
  ['あべのハルカス',    34.6457, 135.5133, '観光', 'あべのハルカス', 'Abeno_Harukas'],
  ['四天王寺',          34.6543, 135.5165, '観光', '四天王寺', 'Shitennō-ji'],
  ['なんばパークス',    34.6610, 135.5020, '観光', 'なんばパークス', 'Namba_Parks'],
  ['万博記念公園',      34.8073, 135.5302, '観光', '万博記念公園', ''],
  ['天保山',            34.6550, 135.4320, '観光', '天保山', ''],
  ['アメリカ村',        34.6723, 135.4983, '観光', 'アメリカ村', 'Amerikamura'],
  ['大阪市中央公会堂',  34.6936, 135.5020, '観光', '大阪市中央公会堂', ''],
  ['中之島',            34.6926, 135.5020, '観光', '中之島 (大阪府)', ''],
  ['法善寺横丁',        34.6680, 135.5020, '観光', '法善寺横丁', ''],
  ['住吉大社',          34.6126, 135.4931, '観光', '住吉大社', 'Sumiyoshi-taisha'],
  /* 高級ホテル（送迎・チケットの乗車が出やすい所） */
  ['リッツ・カールトン大阪',   34.6995, 135.4915, 'ホテル', '', ''],
  ['コンラッド大阪',           34.6928, 135.4930, 'ホテル', '', ''],
  ['セントレジス大阪',         34.6798, 135.5008, 'ホテル', '', ''],
  ['インターコンチネンタル大阪', 34.7060, 135.4930, 'ホテル', '', ''],
  ['帝国ホテル大阪',           34.7033, 135.5147, 'ホテル', '', ''],
  ['リーガロイヤルホテル',     34.6900, 135.4882, 'ホテル', '', ''],
  ['ウェスティンホテル大阪',   34.7055, 135.4895, 'ホテル', '', ''],
  ['スイスホテル南海大阪',     34.6640, 135.5020, 'ホテル', '', ''],
  ['ヒルトン大阪',             34.7005, 135.4938, 'ホテル', '', '']
];

/* 観光地・ホテルのピンを出すかどうか（その端末に覚えます） */
const SPOT_KEY = 'tsukemachi.spot';
let spotOn = (function (){
  try { return localStorage.getItem(SPOT_KEY) === '1'; } catch (e) { return false; }
})();
function spotSet(v){ spotOn = !!v; try { localStorage.setItem(SPOT_KEY, v ? '1' : '0'); } catch (e) {} }

/*
 * ★「話題の伸び」（ご指示・2026/11/16 の代わりの案）
 *
 *   SNSや記事をずっと追うには、お金のかかる窓口が要ります。
 *   そこで、**ウィキペディアが公開している「調べられた回数」**を使います。
 *   無料・鍵なし・課金の設定なしで、日本語版と海外版（英語）を
 *   別々に数えられるので、「日本の人が調べている所」と
 *   「海外の人が調べている所」を 分けて見られます。
 *
 *   ★これは「調べられた回数」です。**人出ではありません。**
 *     何人いるか、とは書きません（数字が嘘になります）。
 *   ★数字は きのうまでの分です（出てくるのが1日おくれるためです）。
 */
let buzzData = null;
async function buzzLoad(){
  try {
    const r = await fetch('data/buzz.json', { cache: 'no-store' });
    buzzData = r.ok ? await r.json() : null;
  } catch (e) { buzzData = null; }
}
/** 伸び（直近7日 ÷ その前7日）。片方でも0なら null */
function buzzUp(o){
  if (!o || !o.now || !o.prev) return null;
  if (!(o.prev > 0)) return null;
  return o.now / o.prev;
}
function buzzPct(o){
  const u = buzzUp(o);
  if (u === null) return '—';
  const v = Math.round((u - 1) * 100);
  return (v > 0 ? '+' : '') + v + '%';
}

/* ------------------------------------------------------------
 *  いま、調べられている場所
 *
 *  ★まーく様のご依頼（2026/11/15）
 *    「有名観光サイトや、高級レストランを日本国内版と、各海外版とで
 *      照らし合わせて チケット利用の可能性、Uber利用の可能性を…
 *      人気度や話題性が高いものを、リアルタイムに更新して導き出して欲しいです」
 *
 *  ★SNSや記事の本文を追う窓口は、どれもお金がかかります。
 *    お金のかからない代わりに、**ウィキペディアのページが
 *    何回ひらかれたか**を使っています（無料・鍵なし・課金の設定なし）。
 *  ★これは「いま何人いるか」ではありません。
 *    調べている人の多さです。画面にも、そう書きます。
 *  ★紙が無い日は、この欄ごと出しません
 *    （ご指示・2026/11/16「不要なものは極力非表示に」）。
 * ---------------------------------------------------------- */
/* ------------------------------------------------------------
 *  富裕層のお客が多い所（ご指示・2026/11/17）
 *
 *  ★まーく様のご指示
 *    「Wikipediaを観光する人が見ると思いますか？
 *      また、道頓堀やら、大阪城やら、USJやら、大枠の部分だけ
 *      挙げられても、まるで意味がありません
 *      もっと細かく切り込んだアツい詳細スポットを出すために
 *      観光に関しての有名サイトをもう一度再精査してください
 *      ここで大事なのは 富裕層が利用しがちなレストラン、ホテル
 *      その中で、日本人が多めか、海外客が多いかで
 *      GO(日本人)、Uber(海外)で分類していってください」
 *
 *  ★おっしゃるとおりでした。前に出していたのは
 *    「ウィキペディアが何回ひらかれたか」でした。
 *    旅行をする人がウィキペディアを見るとは限りませんし、
 *    「道頓堀」のような大きなくくりでは、どこに着ければよいのか
 *    1つも分かりません。
 *
 *  ★いまは、**名前のついた1軒ずつ**を出します。
 *    ホテルは、玄関の車寄せに着けられます。
 *
 *  ★GO／Uber の見分けは、**ホテルだけ**に付けています。
 *    ・外資系ブランド … 海外で予約され、海外から来られます。
 *      海外のお客様は、母国で使っている Uber をそのまま使われます
 *      （GOは日本だけのアプリなので、入れておられません）
 *    ・国内ブランド … 日本のお客様が多く、GOが多くなります
 *    これは**見当**です。そう画面にも書いています。
 *
 *  ★レストランには、GO／Uber を付けていません。
 *    根拠になるものが見つからなかったためです。
 *    見当で付けると、数字が一人歩きします（数字を出すときの決まり）。
 *
 *  ★大阪タクシーA地区の中だけです。
 * ---------------------------------------------------------- */
const RICH_SPOTS = [
  /* ---- ホテル（外資系＝海外のお客が多め） ---- */
  { k:'h', n:'ザ・リッツ・カールトン大阪',       a:'梅田',        u:'uber', w:'外資系' },
  { k:'h', n:'コンラッド大阪',                   a:'中之島',      u:'uber', w:'外資系' },
  { k:'h', n:'セント レジス ホテル 大阪',        a:'本町・御堂筋', u:'uber', w:'外資系' },
  { k:'h', n:'W大阪',                            a:'南船場',      u:'uber', w:'外資系' },
  { k:'h', n:'インターコンチネンタルホテル大阪', a:'大阪駅・うめきた', u:'uber', w:'外資系' },
  { k:'h', n:'ウォルドーフ・アストリア大阪',     a:'うめきた',    u:'uber', w:'外資系' },
  { k:'h', n:'パティーナ大阪',                   a:'うめきた',    u:'uber', w:'外資系' },
  { k:'h', n:'ヒルトン大阪',                     a:'梅田',        u:'uber', w:'外資系' },
  { k:'h', n:'スイスホテル南海大阪',             a:'難波',        u:'uber', w:'外資系' },
  { k:'h', n:'シェラトン都ホテル大阪',           a:'上本町',      u:'uber', w:'外資系' },
  { k:'h', n:'大阪マリオット都ホテル',           a:'天王寺',      u:'uber', w:'外資系' },
  { k:'h', n:'ハイアット リージェンシー 大阪',   a:'南港',        u:'uber', w:'外資系' },
  /* ---- ホテル（国内ブランド＝日本のお客が多め） ---- */
  { k:'h', n:'帝国ホテル大阪',                   a:'天満橋・桜ノ宮', u:'go', w:'国内ブランド' },
  { k:'h', n:'リーガロイヤルホテル',             a:'中之島',      u:'go',   w:'国内ブランド' },
  { k:'h', n:'ホテルニューオータニ大阪',         a:'大阪城・京橋', u:'go',  w:'国内ブランド' },
  { k:'h', n:'ホテルグランヴィア大阪',           a:'大阪駅',      u:'go',   w:'国内ブランド' },
  { k:'h', n:'ホテル阪急インターナショナル',     a:'茶屋町',      u:'go',   w:'国内ブランド' },
  /* ---- レストラン（ミシュランガイド京都・大阪2026 の星付き）---- */
  { k:'r', n:'太庵',               a:'心斎橋',   s:'★★★', w:'日本料理' },
  { k:'r', n:'Hajime',             a:'肥後橋',   s:'★★★', w:'イノベーティブ' },
  { k:'r', n:'柏屋 大阪千里山',     a:'吹田市',   s:'★★★', w:'日本料理' },
  { k:'r', n:'ラ・シーム',          a:'本町',     s:'★★',  w:'フランス料理' },
  { k:'r', n:'カハラ',             a:'北新地',   s:'★★',  w:'イノベーティブ' },
  { k:'r', n:'フジヤ 1935',        a:'本町',     s:'★★',  w:'イノベーティブ' },
  { k:'r', n:'弧柳',               a:'北新地',   s:'★★',  w:'日本料理' },
  { k:'r', n:'天神橋 青木',         a:'天神橋',   s:'★★',  w:'日本料理' },
  { k:'r', n:'宮本',               a:'北新地',   s:'★★',  w:'日本料理' },
  { k:'r', n:'老松 ひさ乃',         a:'北新地',   s:'★★',  w:'日本料理' },
  { k:'r', n:'照屋',               a:'北新地',   s:'★★',  w:'日本料理' },
  { k:'r', n:'鮨 原正',            a:'北新地',   s:'★★',  w:'寿司' },
  { k:'r', n:'旬彩天つちや',        a:'北新地',   s:'★★',  w:'天ぷら' },
  { k:'r', n:'幽玄',               a:'北新地',   s:'★★',  w:'日本料理' },
  { k:'r', n:'ぬま田',             a:'中崎町',   s:'★★',  w:'天ぷら' }
];

/* そろえた言い方（画面のどこでも同じ字にするため） */
const RICH_U = { uber:'Uber寄り', go:'GO寄り' };

function buzzCard(){
  const hs = RICH_SPOTS.filter(function (x){ return x.k === 'h'; });
  const rs = RICH_SPOTS.filter(function (x){ return x.k === 'r'; });
  const row = function (x){
    return '<tr><td><a class="plink" href="' + esc(mapUrl(x.n)) +
      '" target="_blank" rel="noopener">' + esc(x.n) + '</a></td>' +
      '<td>' + esc(x.a) + '</td>' +
      '<td>' + esc(x.s || x.w) + '</td>' +
      (x.u ? '<td class="rich-' + x.u + '">' + esc(RICH_U[x.u]) + '</td>' : '') +
      '</tr>';
  };
  return '<div class="card"><h2>富裕層のお客が多い所（ホテル・レストラン）</h2>' +
    '<p class="note">1軒ずつの名前で出しています。押すと地図が開きます。</p>' +

    '<h3 class="syshd">ホテル（玄関の車寄せに着けられます）</h3>' +
    '<p class="note"><b>GO／Uber は見当です。</b>' +
    '外資系ブランドは海外から来られる方が多く、' +
    '母国で使っている Uber をそのまま使われます。' +
    'GOは日本だけのアプリなので、入れておられません。</p>' +
    '<div class="scroll"><table><thead><tr><th>ホテル</th><th>エリア</th>' +
    '<th>ブランド</th><th>どちらが多いか</th></tr></thead><tbody>' +
    hs.map(row).join('') + '</tbody></table></div>' +

    '<h3 class="syshd">レストラン（ミシュランガイド京都・大阪2026 の星付き）</h3>' +
    '<p class="note">星の数は、2026年版のものです。' +
    '<b>GO／Uber は付けていません。</b>どちらが多いかの根拠が、' +
    '見つからなかったためです。</p>' +
    '<div class="scroll"><table><thead><tr><th>店</th><th>エリア</th>' +
    '<th>星</th></tr></thead><tbody>' +
    rs.map(row).join('') + '</tbody></table></div>' +

    '<p class="note">大阪タクシーA地区の中だけを出しています。' +
    'お客様の人数ではありません。</p></div>';
}

/* ------------------------------------------------------------
 *  地図（ピンで見る）
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「マップに対して、ピンを打って 時間帯、金額別に
 *      例えば、20時台の￥3,000以上 という形で該当する場所にピンを打って、
 *      視覚化しやすい形のページを作って欲しいです」
 *
 *  ★ピンは「そのあたり」を指します。1件ごとの正確な場所ではありません。
 *  ★場所が分からない乗り場には、ピンを打ちません。
 *    そのかわり、下に名前を並べて、地図へのつながりを出します。
 *    黙って落とすと、あるはずのものが無いことに気づけません。
 *  ★お金はかかりません（OpenStreetMap・無料・鍵なし）。
 * ---------------------------------------------------------- */
const MAP_FARES = [{ v:0, n:'すべて' }, { v:3000, n:'¥3,000以上' },
  { v:5000, n:'¥5,000以上' }, { v:10000, n:'¥10,000以上' }];
let mapHour = '';     /* '' は すべての時間帯 */
let mapMin  = 0;      /* いくら以上を出すか */
let pinMap  = null;

/** いま地図に出す記録（時間帯と金額で絞ったもの） */
function mapRows(){
  let R = visible();
  if (mapHour !== '') R = R.filter(r => hasDep(r) && Math.floor(r.dep) === +mapHour);
  if (mapMin > 0)     R = R.filter(r => hasFare(r) && (+r.fare) >= mapMin);
  return R;
}
/** 乗り場ごとにまとめ、場所の分かるものと 分からないものに分けます */
function mapGroups(R){
  const byKey = {}, miss = {};
  R.forEach(function (r){
    const p = String(r.place || ''); if (!p) return;
    const g = placeGeo(p);
    if (!g) { (miss[p] = miss[p] || []).push(r); return; }
    const o = byKey[g.key] = byKey[g.key] || { key:g.key, lat:g.lat, lon:g.lon, rows:[], pls:{} };
    o.rows.push(r); o.pls[p] = (o.pls[p] || 0) + 1;
  });
  return { hit: Object.keys(byKey).map(k => byKey[k]), miss: miss };
}

/* ------------------------------------------------------------
 *  「この乗り場のあと、次に拾えた場所」
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「僕が言う以外に、もっとタクシー業務として参考になりそうな
 *      システムがあれば取り入れて欲しいです」
 *
 *  1本 降ろしたあと、**次の1本をどこで拾えているか**は、
 *  記録から そのまま出せて、しかも すぐ動きに使える数字です。
 *  同じ人の同じ営業日の中で、時刻の順に並べて、となり合う2本を見ます。
 *
 *  ★3件に届かない組み合わせは出しません（1件は、たまたまの1本）。
 *  ★「何分後」は、乗せた時刻どうしの差です。
 * ---------------------------------------------------------- */
function nextChains(R){
  /* 人ごと・営業日ごとに、時刻の順へ */
  const by = {};
  R.filter(hasDep).forEach(function (r){
    if (!r.place) return;
    const k = String(r.user_id || '') + '\u0001' + String(r.date || '');
    (by[k] = by[k] || []).push(r);
  });
  const pair = {};
  Object.keys(by).forEach(function (k){
    const L = by[k].slice().sort(function (a, b){ return a.dep - b.dep; });
    for (let i = 0; i + 1 < L.length; i++) {
      const a = L[i], b = L[i + 1];
      const from = canonPlace(a.place), to = canonPlace(b.place);
      if (!from || !to) continue;
      const min = Math.round((b.dep - a.dep) * 60);
      /* 日をまたいだ飛びや、ありえない間は外します */
      if (min <= 0 || min > 180) continue;
      const kk = from + '\u0001' + to;
      const o = pair[kk] = pair[kk] || { from: from, to: to, n: 0, min: 0, fare: 0, nf: 0 };
      o.n++; o.min += min;
      if (hasFare(b)) { o.fare += (+b.fare || 0); o.nf++; }
    }
  });
  return Object.keys(pair).map(function (k){ return pair[k]; })
    .filter(function (o){ return o.n >= HOT_MIN_N; })
    .map(function (o){
      return { from: o.from, to: o.to, n: o.n,
               min: o.min / o.n, fare: o.nf ? o.fare / o.nf : 0 };
    })
    .sort(function (a, b){ return b.n - a.n; });
}

function nextCard(R){
  const L = nextChains(R);
  /* ★そろっていないときは、見出しごと出しません（ご指示・2026/11/16
       「たまってないのなら、この見出し自体は非表示にしてください
         不要なもの(データ参考にならないもの)は極力非表示にして、
         必要最低限だけがパッと可視化できることを全ページで徹底してください」）。
       空っぽの枠が並ぶと、見るところが分からなくなります。 */
  if (!L.length) return '';
  return '<div class="card"><h2>1本のあと、次に拾えた乗り場</h2>' +
    '<p class="note">1本 乗せたあと、次の1本を <b>どこで・何分後に</b> 拾えているかです。' +
    HOT_MIN_N + '件以上そろった組み合わせだけを出しています。押すと地図が開きます。</p>' +
    '<div class="scroll"><table><thead><tr><th>この乗り場のあと</th><th>次に拾えた所</th>' +
    '<th class="n">件</th><th class="n">何分後</th><th class="n">次の1本</th></tr></thead><tbody>' +
    L.slice(0, 12).map(function (o){
      return '<tr><td>' + esc(o.from) + '</td>' +
        '<td><a class="plink" href="' + hotMap(o.to) + '" target="_blank" rel="noopener">' +
        esc(o.to) + '</a></td>' +
        '<td class="n">' + o.n + '</td>' +
        '<td class="n">' + Math.round(o.min) + '分</td>' +
        '<td class="n">' + (o.fare ? yen(o.fare) : UNK) + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
}

/* ------------------------------------------------------------
 *  地図の はじめの絞り込み（ご指示・2026/11/16）
 *
 *  ★まーく様のご指示
 *    「地図のデフォルトは、各メンバーにあわせて 各メンバー記録で、
 *      一番のりばにつけているもので 当月期間としてください」
 *    「16日のリセット時には、なんのデータもありませんので
 *      今日～15日まで、前月分の記録を表示
 *      16日なったら、次の記録、を繰り返してください」
 *
 *  ★営業月は 16日〜翌15日 の区切りです。16日になった日は
 *    新しい月に1件も記録がないので、**終わったばかりの月**を出します。
 *    16日が来たら、ひとりでに次の月へ移ります（c1＝1つ前の営業月）。
 *  ★記録は「自分だけ」から始めます。自分がどこに付けているかが、
 *    一番すぐ使える形だからです。上の切り替えで、全員にも戻せます。
 *  ★開いたときに1回だけ入れます。そのあとに触られた絞り込みは、
 *    上書きしません（せっかく変えたものが戻ると困るためです）。
 * ---------------------------------------------------------- */
let mapDefDone = false;
function mapDefault_(){
  if (mapDefDone) return;
  mapDefDone = true;
  /* すでに絞り込みを触っておられるときは、何も上書きしません */
  if (filtOn()) return;
  try {
    /* ★期間は、もう ぜんぶの画面で「終わったばかりの営業月」です。
         ここで触る必要がなくなりました（PERIOD_DEF）。
       地図だけの既定は「自分の記録から見る」ことです。 */
    onlyMine = true;
    filtSave();
  } catch (e) {}
}

/** 自分が一番 付けている乗り場（いまの絞り込みの中で） */
function myTopPlace_(R){
  const by = {};
  R.forEach(function (r){
    if (String(r.user_id || '') !== String((ME.user && ME.user.id) || '')) return;
    const p = canonPlace(r.place); if (!p) return;
    by[p] = (by[p] || 0) + 1;
  });
  const ks = Object.keys(by).sort(function (a, b){ return by[b] - by[a]; });
  return ks.length ? { p: ks[0], n: by[ks[0]] } : null;
}

function paneMap(){
  mapDefault_();
  const R0 = visible().filter(hasDep);
  const hrs = [...new Set(R0.map(r => Math.floor(r.dep)))].sort(function (a, b){ return a - b; });
  const R = mapRows();
  const G = mapGroups(R);
  const missNames = Object.keys(G.miss);

  const head = leadCard('map') + `<div class="card"><h2>乗り場の地図（ピン）</h2>
    <p class="note">えらんだ時間帯と金額に当てはまる記録を、乗り場のあたりにピンで出します。</p>
    <!-- ★「すべて」が2つ並んでいて、どちらの「すべて」か分かりませんでした
           （ご指摘・2026/11/16「なぜ、すべてのタブが2つあるのですか？」）。
         時間帯のぶんと金額のぶんなので、それぞれに名前を付けます。 -->
    <div class="flab">時間帯</div>
    <div class="chips maph">
      <button class="chip ${mapHour === '' ? 'on' : ''}" data-mh="">すべて</button>
      ${hrs.map(h => `<button class="chip ${String(mapHour) === String(h) ? 'on' : ''}" data-mh="${h}">${h}時</button>`).join('')}
    </div>
    <div class="flab">金額</div>
    <div class="chips">
      ${MAP_FARES.map(f => `<button class="chip ${mapMin === f.v ? 'on' : ''}" data-mf="${f.v}">${f.n}</button>`).join('')}
    </div>
    <!-- ★有名な場所とホテルも、重ねて出せます（ご指示・2026/11/15）。
           記録ではないので、白いひし形にして、まぎれないようにします。 -->
    <div class="chips">
      <button class="chip ${spotOn ? 'on' : ''}" id="spotBtn">有名な場所とホテルも出す</button>
    </div>
    ${filterChips(true)}</div>`;

  /* ★見出しでも「すべて」が2つ並ばないようにします（ご指摘・2026/11/16） */
  const mfn = (MAP_FARES.filter(f => f.v === mapMin)[0] || MAP_FARES[0]).n;
  const sum = `<div class="card"><h2>${mapHour === '' ? 'すべての時間帯' : mapHour + '時台'}　${
    mfn === 'すべて' ? '金額すべて' : mfn}</h2>
    <p class="note">${R.length}件・ピンの立つ乗り場 ${G.hit.length}か所。
      ピンは、乗り場のあるあたりを指しています。1件ごとの正確な場所ではありません。</p>
    ${(function(){ const t = myTopPlace_(R); return t
      ? '<p class="note">この中で、あなたが一番 付けているのは <b>' + esc(t.p) +
        '</b>（' + t.n + '件）です。</p>' : ''; })()}
    <div id="pinMap" class="radarmap pinmap wxmap">読み込んでいます…</div>
    <!-- ★色と大きさの見方を、はっきり書きます（ご指示・2026/11/16
           「もっとポイントを分かりやすくしてください、全体の色合いが似ていて、
             どこに丸されてるかすぐに見分けできませんし
             色の違いの説明もしっかり記載してください」） -->
    <div class="pinleg">
      <div class="pl1"><b>色</b>＝その乗り場の、1本の平均</div>
      <div class="legend">
        <span><i style="background:${BANDS[0].c}"></i>${BANDS[0].n}（${BANDS[0].d}）</span>
        <span><i style="background:${BANDS[1].c}"></i>${BANDS[1].n}（${BANDS[1].d}）</span>
        <span><i style="background:${BANDS[2].c}"></i>${BANDS[2].n}（${BANDS[2].d}）</span>
      </div>
      <div class="pl1"><b>大きさ</b>＝件数（大きいほど、たくさん付けています）。
        ピンの中の数字が件数です。</div>
      ${spotOn ? '<div class="pl1"><b>白いひし形</b>＝有名な場所とホテル（記録ではありません）</div>' : ''}
    </div></div>`;

  /* ★ピンの立つ上位を、文字でも出します（地図が読めない機種のため） */
  const top = G.hit.slice().sort(function (a, b){ return b.rows.length - a.rows.length; }).slice(0, 10);
  const list = top.length ? `<div class="card"><h2>ピンの立つ乗り場（件数の多い順）</h2>
    <div class="scroll"><table><thead><tr><th>あたり</th><th class="n">件</th>
    <th class="n">1本の平均</th><th>乗り場</th></tr></thead><tbody>${
      top.map(function (o){
        const a = agg(o.rows);
        return '<tr><td>' + esc(o.key) + '</td><td class="n">' + o.rows.length + '</td>' +
          '<td class="n">' + (a.fare ? yen(a.fare) : UNK) + '</td><td>' +
          esc(Object.keys(o.pls).slice(0, 4).join('／')) + '</td></tr>';
      }).join('')}</tbody></table></div></div>` : '';

  /* 場所の分からない乗り場は、黙って落とさずに名前を出します */
  const missCard = missNames.length ? `<div class="card"><h2>地図に出せていない乗り場</h2>
    <p class="note">あたりが分からないので、ピンを打っていません。
      名前を押すと、地図で探せます。</p>
    <div class="chips">${missNames.slice(0, 40).map(p =>
      `<a class="chip" href="${esc(mapUrl(p))}" target="_blank" rel="noopener">${esc(p)}<span class="cnt">${G.miss[p].length}</span></a>`).join('')}</div>
    </div>` : '';

  if (!R.length) return head + emptyCard('該当データがありません') + missCard + buzzCard();
  return head + sum + list + nextCard(visible()) + missCard + buzzCard();
}

/** 地図とピンを組み立てます（1枚の画面に1回だけ） */
function mapStop(){ try { if (pinMap) pinMap.remove(); } catch (e) {} pinMap = null; }
function mapBoot(){
  const box = document.getElementById('pinMap');
  if (!box) { mapStop(); return; }
  if (pinMap && pinMap._box === box) return;
  mapStop();
  const go = function (){
    try {
      if (typeof L === 'undefined') { box.textContent = '地図が読めませんでした。下の表でご覧ください。'; return; }
      box.textContent = '';
      const m = L.map(box, { attributionControl: true, zoomControl: true })
        .setView([34.6900, 135.5000], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 17, attribution: '© OpenStreetMap' }).addTo(m);
      /* ★下じきの地図は暗くします。明るいままだと、ピンが地図に紛れて
           「どこに丸されてるか すぐに見分けできません」（ご指摘・2026/11/16）。 */
      try {
        const mp2 = m.getPane('mapPane');
        const w1 = document.createElement('div'); w1.className = 'mapveil v1';
        const w2 = document.createElement('div'); w2.className = 'mapveil v2';
        mp2.appendChild(w1); mp2.appendChild(w2);
      } catch (e) {}
      m._box = box; pinMap = m;
      const G = mapGroups(mapRows());
      const mxn = Math.max.apply(null, G.hit.map(o => o.rows.length).concat([1]));
      const pts = [];
      /* ★ピンは、白いふちの付いた「塗りつぶしの丸」に、件数の数字を入れます
           （ご指摘・2026/11/16「もっとポイントを分かりやすくしてください」）。
           薄い丸だと、地図の色と見分けがつきませんでした。
           件数の多い所ほど大きく、1本の平均で色を分けます。 */
      G.hit.forEach(function (o){
        const a = agg(o.rows);
        const col = a.fare >= 10000 ? BANDS[2].c : (a.fare >= 5000 ? BANDS[1].c : BANDS[0].c);
        const d = 26 + Math.round(22 * Math.sqrt(o.rows.length / mxn));
        const ic = L.divIcon({ className: 'pindot', iconSize: [d, d],
          iconAnchor: [d / 2, d / 2],
          html: '<span style="background:' + col + ';width:' + d + 'px;height:' + d + 'px">' +
                o.rows.length + '</span>' });
        L.marker([o.lat, o.lon], { icon: ic, zIndexOffset: 200 })
          .bindPopup('<b>' + esc(o.key) + 'のあたり</b><br>' + o.rows.length + '件' +
            '<br>1本の平均 ' + (a.fare ? yen(a.fare) : '不明') +
            '<br>' + esc(Object.keys(o.pls).slice(0, 5).join('／')))
          .addTo(m);
        pts.push([o.lat, o.lon]);
      });
      /* ★有名な場所とホテル。記録ではないので、形も色も変えます
           （白いひし形）。まぎれると、数字の意味が分からなくなります。 */
      if (spotOn) {
        SPOT_GEO.forEach(function (x){
          const ic = L.divIcon({ className: 'pinspot', iconSize: [16, 16],
            iconAnchor: [8, 8], html: '<span></span>' });
          L.marker([x[1], x[2]], { icon: ic, zIndexOffset: 50 })
            .bindPopup('<b>' + esc(x[0]) + '</b><br>' + esc(x[3]) +
              '<br><small>記録ではありません。場所の目じるしです。</small>')
            .addTo(m);
        });
      }
      /* 近づきすぎると、丸が重なって読めません。13 までにしておきます */
      if (pts.length > 1) { try { m.fitBounds(pts, { padding: [24, 24], maxZoom: 13 }); } catch (e) {} }
      else if (pts.length === 1) m.setView(pts[0], 14);
      setTimeout(function (){ try { m.invalidateSize(); } catch (e) {} }, 200);
    } catch (e) { box.textContent = '地図が読めませんでした。下の表でご覧ください。'; }
  };
  if (typeof L !== 'undefined') return go();
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
  document.head.appendChild(css);
  const sc = document.createElement('script');
  sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
  sc.onload = go;
  sc.onerror = function (){ box.textContent = '地図が読めませんでした。下の表でご覧ください。'; };
  document.head.appendChild(sc);
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
/*
 * ★「いまから翌4時まで」ではなく、**出せる時間を ぜんぶ** 出します
 *   （ご指示・2026/11/17「天気ですが、翌4時までとか別にいらないので
 *     (出勤前に、早めに予定確認したいばあいもあるので)
 *     表示できる分はすべて表示してください」）。
 *
 *   前は「いまの時刻」から先しか出していませんでした。
 *   出勤の前に見たときに、夜ぜんたいの流れが分かりませんでした。
 *   いまは 16時台から 翌5時台まで ひととおり見て、
 *   記録のそろった時間だけを並べます。
 */
const HOT_PLAN_FROM = 16;     /* 夕方の早い時間から */
const HOT_PLAN_TO   = 29;     /* 翌5時台まで */
function hotPlan(c, rows){
  const out = [];
  for (let h = HOT_PLAN_FROM; h <= HOT_PLAN_TO; h++) {
    const cc = { h: h, date: c.date, kind: c.kind };
    const g = hotPick(cc, HOT_WIN, true, rows).filter(function (x){ return x.n >= HOT_MIN_N; });
    out.push({ h: Math.floor(h % 24), hh: h, top: g[0] || null });
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
  /*
   * ★まーく様のご指示（2026/11/15）
   *   「現在～3時間後のリアルタイムを映すようにしてください」
   *   「もっと、地図ではなく、雨雲マップっぽいものはないのでしょうか」
   *
   * ★出しているもの（どれも気象庁・無料・鍵なし・課金の設定なし）
   *   ・いま 〜 1時間後 … 高解像度降水ナウキャスト（5分きざみ）
   *   ・1時間後 〜 3時間後 … 降水15時間予報（1時間きざみ）
   * ★下じきの地図は、色を落として暗くしています。
   *   道や店の名前が目立つと、雨雲が見えにくいためです。
   */
  return '<div class="card"><h2>雨雲レーダー</h2>' +
    /* ★ここに「3時間後まで」と決め打ちで書いていたため、
         実際には1時間ぶんしか出ていないのに、3時間と書いていました
         （ご指摘・2026/11/16「本当に3時間進んでますか？
           1時間程度しか進んでいるように見えませんが？
           矛盾したことは全ページ通して絶対に書かないでください」）。
       いまは、出せた こま を数えてから、ここに書き直します。 */
    '<p class="note" id="radarRange">読み込んでいます…</p>' +
    '<p class="note">雨が降っていないときは、地図だけが映ります。</p>' +
    '<div id="radarMap" class="radarmap wxmap">読み込んでいます…</div>' +
    '<div class="rdrbar"><b id="radarTime">読み込んでいます…</b>' +
    '<span id="radarWhen"></span></div>' +
    '<div class="rdrleg">' + RADAR_LEG.map(function (x){
      return '<span><i style="background:' + x[1] + '"></i>' + x[0] + '</span>';
    }).join('') + '<small>mm/h</small></div>' +
    '<div class="actions rdr">' +
    '<button class="mini" id="radarPlay">とめる</button>' +
    '<button class="mini" id="radar">気象庁で見る</button></div></div>';
}
/* 気象庁の雨の強さの色（降水強度 mm/h）。本家と同じ並びです */
const RADAR_LEG = [['1','#A0D2FF'], ['5','#218CFF'], ['10','#0041FF'],
  ['20','#FAF500'], ['30','#FFB900'], ['50','#FF5000'], ['80','#B40068']];

/* 地図を出す係。1枚の画面に1回だけ組み立てます */
let radarMap = null;
/* ★ほかの画面に移ったら、こま送りを止めます。
     止めないと、見ていないのに ずっと動き続けて、電池を食います。 */
function radarStop(){
  try { if (radarMap && radarMap._radarTimer) clearInterval(radarMap._radarTimer); } catch (e) {}
  radarMap = null;
}
/* 気象庁の時刻の字（20261113070500＝世界の時刻）を、日本の時刻に直します */
function jmaDate(v){
  const t = String(v || '');
  if (t.length < 12) return null;
  return new Date(Date.UTC(+t.slice(0,4), +t.slice(4,6) - 1, +t.slice(6,8),
                           +t.slice(8,10), +t.slice(10,12)));
}
function jmaHM(v){
  const d = jmaDate(v);
  return d ? (pad(d.getHours()) + ':' + pad(d.getMinutes())) : '';
}
/** 「いま」「30分後」「2時間後」のような言い方にします */
function radarWhen(v, base){
  const d = jmaDate(v); if (!d) return '';
  const m = Math.round((d.getTime() - base.getTime()) / 60000);
  if (m <= 2 && m >= -7) return 'いま';
  if (m < 0) return (-m) + '分前';
  if (m < 60) return m + '分後';
  const h = Math.round(m / 60);
  return (m % 60 === 0 ? h + '時間後' : (Math.floor(m / 60) + '時間' + (m % 60) + '分後'));
}

/* 日本時刻の Date を、気象庁の字（20261116013000＝世界の時刻）に直します */
function jmaStamp(d){
  const u = new Date(d.getTime());
  return String(u.getUTCFullYear()) + pad(u.getUTCMonth() + 1) + pad(u.getUTCDate()) +
         pad(u.getUTCHours()) + pad(u.getUTCMinutes()) + '00';
}

function radarBoot(){
  const box = document.getElementById('radarMap');
  if (!box) { radarMap = null; return; }
  if (radarMap && radarMap._box === box) return;

  const go = function (){
    try {
      if (typeof L === 'undefined') { box.textContent = '地図が読めませんでした。下のボタンから見られます。'; return; }
      box.textContent = '';
      const m = L.map(box, { attributionControl: true, zoomControl: true }).setView([34.7025, 135.4959], 9);
      /* ★下じきは、色を落として暗くします（className で見た目を変えます）。
           道や店の名前が目立つと、雨雲のほうが見えなくなります。 */
      /* ★雨雲は、別の「層」に置きます。
           下じきの地図だけを暗くしたいのですが、絵の1枚ずつに色づけをすると、
           絵と絵のつぎ目に 細い線が出てしまいます
           （ご指摘・2026/11/16「この白い線はなんですか？」）。
           層ごと まとめて暗くすれば、つぎ目は出ません。 */
      m.createPane('rain');
      m.getPane('rain').style.zIndex = 450;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 15, attribution: '© OpenStreetMap' }).addTo(m);
      /*
       * ★下じきの地図は、上から「幕」をかけて暗くします。
       *   前は 地図そのものに色づけ（filter）をしていましたが、
       *   絵と絵のつぎ目に 細い線が出ていました
       *   （ご指摘・2026/11/16「この白い線はなんですか？」）。
       *   幕は1枚の板なので、つぎ目ができません。
       *   雨雲は幕より上の層に置くので、暗くなりません。
       */
      try {
        const mp = m.getPane('mapPane');
        const v1 = document.createElement('div'); v1.className = 'mapveil v1';
        const v2 = document.createElement('div'); v2.className = 'mapveil v2';
        mp.appendChild(v1); mp.appendChild(v2);
      } catch (e) {}
      m._box = box; radarMap = m;

      const J = 'https://www.jma.go.jp/bosai/jmatile/data/';
      const get = function (u){
        return fetch(u, { cache: 'no-store' }).then(function (r){ return r.json(); })
          .catch(function (){ return []; });
      };
      /*
       * ★「いま」から「3時間後」までを、1本につなげます。
       *   1つ落ちても、残りは出します（止まらない形）。
       */
      /* その こま の絵が、ほんとうに置いてあるかを1枚だけ確かめます。
           気象庁は、表に出てから少しのあいだ 絵が無いことがあります。
           確かめずに使うと、その時間ぶんが まるごと白くなります。 */
      const tileOK = function (b, v){
        return fetch(J + 'rasrf/' + b + '/none/' + v + '/surf/rasrf/8/223/101.png',
                     { cache: 'no-store' })
          .then(function (r){ return !!r.ok; }).catch(function (){ return false; });
      };
      Promise.all([
        get(J + 'nowc/targetTimes_N1.json'),     /* いま（実測） */
        get(J + 'nowc/targetTimes_N2.json'),     /* 〜1時間後（5分きざみ） */
        get(J + 'rasrf/targetTimes.json')        /* 1時間後から先（1時間きざみ） */
      ]).then(async function (res){
        const n1 = res[0] || [], n2 = res[1] || [], rs = res[2] || [];
        if (!n1.length && !n2.length) throw new Error('時刻が取れない');
        const now = jmaDate((n1[0] || n2[0] || {}).validtime) || new Date();
        const fr = [];
        /* ① いま */
        if (n1[0]) fr.push({ b: n1[0].basetime, v: n1[0].validtime, k: 'nowc' });
        /* ② 〜1時間後。10分きざみにして、こまを増やしすぎません */
        const bt2 = (n2[0] || {}).basetime;
        n2.filter(function (x){ return x.basetime === bt2; })
          .map(function (x){ return x.validtime; })
          .sort()
          .forEach(function (v){
            const d = jmaDate(v); if (!d) return;
            const mi = Math.round((d.getTime() - now.getTime()) / 60000);
            if (mi > 0 && mi <= 60 && mi % 10 === 0) fr.push({ b: bt2, v: v, k: 'nowc' });
          });
        /*
         * ③ 1時間後から 3時間ほど先まで（降水短時間予報）
         *
         * ★ここが、ずっと空っぽでした（ご指摘・2026/11/16
         *     「本当に3時間進んでますか？1時間程度しか進んでいるように見えませんが？」）。
         *   気象庁の表には、**ちょうどの時刻**と**30分の時刻**の2つの出し元が
         *   混じっています。ちょうどの時刻のほうは、
         *   いまから7時間より先の絵しか持っていません。
         *   前は、ならびの1番目（＝ちょうどの時刻）をそのまま使っていたため、
         *   1〜3時間後の こま が1枚も作れず、1時間ぶんで止まっていました。
         * ★いまは「30分の時刻」の出し元を使います。
         *   1時間後から6時間後まで、1時間ごとに持っています。
         * ★表に出たばかりの出し元は、まだ絵が置かれていないことがあるので、
         *   1枚 試してから使います。だめなら30分前の出し元に下がります。
         */
        const base30 = (function (){
          const L = {};
          rs.forEach(function (x){ (L[x.basetime] = L[x.basetime] || []).push(x.validtime); });
          const ks = Object.keys(L).filter(function (b){
            return /3000$/.test(b) && L[b].length > 1;
          }).sort();
          return ks.length ? ks[ks.length - 1] : '';
        })();
        if (base30) {
          const b0 = jmaDate(base30);
          /* 新しいほうから順に、絵が置いてある出し元をさがします（3つまで） */
          for (let back = 0; back < 3; back++) {
            const bd = new Date(b0.getTime() - back * 30 * 60000);
            const bs = jmaStamp(bd);
            const vs = [];
            for (let h = 1; h <= 6; h++) {
              const vd = new Date(bd.getTime() + h * 60 * 60000);
              const mi = Math.round((vd.getTime() - now.getTime()) / 60000);
              /* いま〜1時間後は ナウキャストで出しているので、その先だけ。
                 3時間後を必ず越えるところまで入れます（215分） */
              if (mi > 60 && mi <= 215) vs.push(jmaStamp(vd));
            }
            if (!vs.length) continue;
            /* eslint-disable no-await-in-loop */
            const okTile = await tileOK(bs, vs[0]);
            if (!okTile) continue;
            vs.forEach(function (v){ fr.push({ b: bs, v: v, k: 'rasrf' }); });
            break;
          }
        }
        if (!fr.length) throw new Error('こまが作れない');

        /* ★出せた所までを、そのまま書きます（決め打ちで「3時間」と書かない） */
        {
          const rg = document.getElementById('radarRange');
          const lastv = jmaDate(fr[fr.length - 1].v);
          if (rg && lastv) {
            rg.textContent = 'いまから ' + radarWhen(fr[fr.length - 1].v, now) +
              ' までの雨雲です（' + fr.length + 'こま）。指で動かせます。';
          }
        }

        /* こまは先にぜんぶ地図へ置いて、見せる1枚だけ濃くします */
        const lay = fr.map(function (o){
          const u = (o.k === 'rasrf')
            ? J + 'rasrf/' + o.b + '/none/' + o.v + '/surf/rasrf/{z}/{x}/{y}.png'
            : J + 'nowc/'  + o.b + '/none/' + o.v + '/surf/hrpns/{z}/{x}/{y}.png';
          return L.tileLayer(u, { opacity: 0, maxZoom: 15, maxNativeZoom: 10,
            pane: 'rain', className: 'rainlay', attribution: '気象庁' }).addTo(m);
        });
        let i = 0;
        const show = function (){
          lay.forEach(function (t, k){ try { t.setOpacity(k === i ? .85 : 0); } catch (e) {} });
          const el = document.getElementById('radarTime');
          const wh = document.getElementById('radarWhen');
          if (el) el.textContent = jmaHM(fr[i].v);
          if (wh) wh.textContent = radarWhen(fr[i].v, now) +
            (fr[i].k === 'rasrf' ? '（予想）' : (i === 0 ? '（実測）' : '（予想）'));
        };
        show();
        const tick = function (){ i = (i + 1) % fr.length; show(); };
        /* いまの絵は、少し長めに見せます（そこが知りたい所なので） */
        m._radarTimer = setInterval(function (){
          if (i === 0) { m._radarHold = (m._radarHold || 0) + 1;
            if (m._radarHold < 3) return; m._radarHold = 0; }
          tick();
        }, 600);
        const pb = document.getElementById('radarPlay');
        if (pb) pb.onclick = function (){
          if (m._radarTimer) { clearInterval(m._radarTimer); m._radarTimer = null;
            pb.textContent = 'うごかす'; i = 0; show(); }
          else { m._radarTimer = setInterval(tick, 600); pb.textContent = 'とめる'; }
        };
      }).catch(function (){
        const el = document.getElementById('radarTime');
        if (el) el.textContent = '雨雲が読めませんでした';
      });

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

  /*
   * ★並びは、まーく様のご指示のとおりです（2026/11/13）。
   *     「11/13(金) 05:27 金土の夜 は ページの中で1番上にして出してみてください
   *       その下に 翌4時までの予想
   *       その下に この時間に強い場所(今の時間帯に強い場所に直してください)」
   *   天気は、その下に回します。
   */
  const head = '<div class="card"><h2>天気</h2>' +
    wxNowHTML() + wxHoursHTML() + '</div>' + radarCard();

  /* ① 一番上 … いまの時刻と、その時刻の狙い目 */
  const clock = leadCard('hot') +
    '<div class="card"><h2>' + esc(fmtD(c.date)) + ' ' + esc(c.clock) +
    '<span class="nowk">' + esc(c.kind) + 'の夜</span></h2>' +
    '<p class="note">いまの時刻に合わせて、いま行くとよい所です。' +
    '全期間の表は【表グラフ】のほうです。</p>' +
    '<p class="note">' +
    (c.early ? 'まだ乗務の時間ではないので、' + HOT_FROM + '時台の見当です。' : '') +
    '自分たちの記録からの傾向です。いま何人いるかを測っているのではありません。</p>' +
    filterChips();

  /*
   * ★記録がたまっていないときは、**何も並べません**（ご指示・2026/11/16
   *     「だから、データとして溜まってない状態なら非表示にしてください」）。
   *
   *   前は、大きな空の箱と「参考（件数が足りません）：○○ 1件・…」まで
   *   出していました。1件は たまたまの1本なので、出してはいけない数です。
   *   「読むときの注意」も、読むものが無いのに出していました。
   *
   * ★残すのは、しぼり込みの操作だけです。
   *   これまで消すと、曜日や期間を変えて 出し直すことができなくなります。
   *   （この画面の絵は「日・祝」でしぼったまま、月曜に見ておられました）
   */
  if (!got.rows.length) {
    /* ★見出しごと出しません（ご指示・2026/11/16
         「記録が足りないなら、見出し含めて非表示にしてください」）。
       日づけと時刻の見出しを出すと、中身があるように見えてしまいます。
       絞り込みの操作だけは残します（曜日や期間を変えて出し直せるように）。 */
    return leadCard('hot') +
      '<div class="card">' +
      '<p class="note">' +
      (filtOn() ? 'この絞り込みでは、まだ記録が足りません。下の「絞り込みを解除」で元に戻ります。'
                : 'この時間は、まだ記録が足りません。') + '</p>' +
      filterChips() + '</div>' + hotPlanCard(plan, c.early, c.early ? -1 : Math.floor(c.h)) + head;
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

  return clock +
    '<div class="hot">' + cards + '</div>' +
    '<div class="note" style="margin:12px 0 0">根拠：' + esc(got.basis) + '（' + esc(when) + '）' +
    (got.loose ? '／この時間ぴったりの記録が足りないので、少し広げました' : '') + '</div>' +
    '</div>' +
    hotPlanCard(plan, c.early, c.early ? -1 : Math.floor(c.h)) +
    '<div class="card"><h2>いまの時間帯に強い乗り場</h2>' +
    '<div class="scroll"><table><thead><tr><th>場所</th><th class="n">件</th>' +
    '<th class="n">1本の平均</th><th style="width:34%"></th><th class="n">待ち</th>' +
    '</tr></thead><tbody>' + bars + '</tbody></table></div></div>' +
    head;
}

/*
 * ★「翌4時までの予想」は、中身が固まるまで 見出しごと出しません
 *   （ご指示・2026/11/13「翌4時までの予想はデータが固まるまでは、
 *     見出し含めて非表示にしてください」）。
 *   ほとんどが「記録が足りない」の表は、見ても役に立たないためです。
 *   固まった、の目安は「半分以上の時間に場所が出ていて、3つ以上あること」。
 */
/* ★「出せる時間が3つ以上あるか」だけを見ます。
     範囲を広げたので、割合でしぼると かえって出なくなります。 */
function hotPlanReady_(plan){
  return (plan || []).filter(function (s){ return s && s.top; }).length >= 3;
}

/** 夜ぜんたいの、時間帯ごとの狙い目（横に流して見ます） */
function hotPlanCard(plan, early, nowH){
  if (!hotPlanReady_(plan)) return '';
  /* ★記録の足りない時間は、まるごと出しません（ご指示・2026/11/16）。
       「記録が足りない」ばかりが並ぶと、見るところが分からなくなります。 */
  const nh = (nowH == null) ? -1 : Math.floor(nowH);
  return '<div class="card"><h2>時間帯ごとの狙い目（夜ぜんたい）</h2>' +
    '<p class="note">1時間ごとの、一番強かった場所です。' +
    '出勤の前でも、夜ぜんたいの流れが分かります。押すと地図が開きます。</p>' +
    '<div class="scroll fb"><div class="plan">' + plan.map(function (s){
      if (!s.top) return '';
      /* いまの時間だけ「いま」と出して、目で追えるようにします */
      const isNow = (s.hh === nh);
      const head = '<small>' + (isNow ? 'いま' : s.h + '時台') + '</small>';
      return '<a class="pl' + (isNow ? ' now' : '') + '" href="' + hotMap(s.top.p) +
        '" target="_blank" rel="noopener">' + head +
        '<b>' + esc(s.top.p) + '</b><span>平均 ' + yen(s.top.avg) + '・' + s.top.n + '件</span></a>';
    }).join('') + '</div></div></div>';
}

/** 注意書き（短く。長い説明は読まれません） */
/* ★「読むときの注意」の欄は やめました（ご指示・2026/11/16）。
     中身は、上の「このページを見てわかること」にまとめてあります。 */

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
  return '<div class="card" style="margin-top:12px"><h2>このあとの天気</h2>' +
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
/**
 * 天気の下に出す押しボタン。
 *
 * ★まーく様のご質問（2026/11/13）
 *   「この画像にある、雨雲レーダーというタブは更新タブで合ってますか？
 *     それであれば、更新という文字の方が適切だと思うのですが」
 *
 * ★違いました。あれは「気象庁の雨雲レーダーのページを開く」ボタンでした。
 *   すぐ下に 雨雲の地図と【気象庁で見る】があるので、同じものが2つ
 *   並んでいた形です。まぎらわしいので、こちらは【更新】にしました。
 * ★【更新】は、天気・雨雲の時刻・記録・イベントを取り直します。
 *   画面を開きっぱなしでも、いまの数字になります。
 */
function radarBtn(){
  return '<div class="actions rdr"><button class="mini" id="wxRefresh">↻ 更新</button>' +
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
    /* ★【更新】… 天気・雨雲・記録・イベントを取り直します（ご指示・2026/11/13） */
    const r = (e.target && e.target.closest) ? e.target.closest('#wxRefresh') : null;
    if (r) wxRefresh(r);
  });
}

/**
 * 【更新】を押したとき。
 *   天気・雨雲の時刻・記録・イベントを、ぜんぶ取り直します。
 *   ★1つ こけても、ほかは取り直します（止まらない形）。
 */
async function wxRefresh(btn){
  const msg = document.getElementById('radarMsg');
  if (btn) btn.disabled = true;
  if (msg) msg.textContent = '取り直しています…';
  let ng = 0;
  try { await loadWx(); } catch (e) { ng++; }
  try { await loadAmd(); } catch (e) { ng++; }
  try { await loadEv(true); } catch (e) { ng++; }   /* 箱は出さない */
  try { await reload(); } catch (e) { ng++; }
  radarStop();                           /* 雨雲の地図も、作り直します */
  render();
  const m2 = document.getElementById('radarMsg');
  if (m2) {
    const d = new Date();
    m2.textContent = (ng ? '一部は取れませんでした。' : '') +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' に取り直しました';
  }
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
/** 1枚ぶんの横棒グラフを作ります（えらんだ記録だけで描きます） */
function tlChart(R){
  /*
   * ★夜の数を 14 に戻しました（ご指示・2026/11/17）。
   *   ふるくんの引き継ぎのときは 14夜ならべてありました。
   *   7夜に減らしていたので、**縦に見たときの「重なり」**が
   *   分かりにくくなっていました。
   * ★夜が多いときは、1行を細くします（画面に収めるため）。
   */
  const ds = [...new Set(R.map(r => r.date))].sort().reverse().slice(0,14);
  /* ★19時より前の記録が、左端に積み上がって見えていました（2026/11/12）。
       最も早い記録に合わせて、横じくの始まりを決めます。 */
  const st = R.map(r => r.dep - (+r.wait || 0) / 60);
  const x0 = Math.min(19, Math.floor(Math.min.apply(null, st)));
  const x1 = Math.max(29, Math.ceil(Math.max(...R.map(r => r.dep + r.ride/60))));
  /* ★「パッと見、よく分からない」とのご指摘（2026/11/13）。
       次の4つを変えました。
       ① 帯の色を、金額の3段階（ショート・ミドル・ロング）で塗り分け。
          前は明るさの濃淡だけで、見分けがつきませんでした。
       ② 1日ごとに、薄い帯の下じきを敷いて、行の区切りを見えるように。
       ③ 乗り場の名前を、帯の中に入れる（入る広さがあるときだけ）。
       ④ 時刻の数字を、上と下の両方に。下の線も引きます。 */
  /* ★左をもっと詰めました（ご指示・2026/11/13「もっと左をスマートに詰められませんか」）。
       日付を10pxにしたので、52pxで「10/30 金」まで入ります。
       48pxにしたら「10/30」の1が切れました（2026/11/13・実際に測って直し）。 */
  /* 夜が8つ以上ならんだら、1行を細くします（引き継ぎのときと同じ高さ） */
  const L = 52, Rp = 12, rowH = (ds.length > 7 ? 38 : 54), TOPH = 30;
  const slim = (rowH < 54);
  /* 「重なり」の帯の高さ（一番下、時刻の線の上に出します） */
  const DENS = 52;
  /* ★1時間ぶんの幅は、表グラフと同じ考え方で決めます。
       22時までは、横にスクロールせずに見られる大きさにします。 */
  const vwT  = Math.max(260, (typeof window !== 'undefined' ? window.innerWidth : 390) - 56);
  const need = Math.max(1, Math.min(x1 - x0, 22 - x0));
  const cwT  = Math.max(30, Math.min(52, Math.floor((vwT - L - Rp) / need)));
  const W = L + Rp + Math.max(1, (x1 - x0)) * cwT;
  const H = TOPH + ds.length*rowH + DENS + 26;
  /* ★19時より前の記録が、日付の字に重なっていました（2026/11/12）。
       左の端より外には、はみ出させません。 */
  const sx = v => Math.max(L, Math.min(W - Rp, L + (v-x0)/(x1-x0)*(W-L-Rp)));
  /* ★金額の3段階。記録用スプレッドシート・「割合」の画面と同じ分け方です。 */
  /* ★色は、パーセントの画面と同じにそろえます（ご指摘・2026/11/13
       「パッと見、よく分からない」）。同じ「ロング」が画面ごとに
       別の色だと、見るたびに覚え直すことになります。 */
  const band = r => !hasFare(r) ? ['#5A6273','不明']
    : r.fare >= 10000 ? [BANDS[2].c,'ロング']
    : r.fare >= 5000  ? [BANDS[1].c,'ミドル'] : [BANDS[0].c,'ショート'];
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  /* ② 行の下じき（1日ぶん）。これがあると、どこからどこまでが同じ日か分かります */
  ds.forEach((d,i) => { s += `<rect class="trow" x="${L}" y="${TOPH + i*rowH + 3}"
    width="${W-L-Rp}" height="${rowH-6}" rx="5"/>`; });
  for (let h = x0; h <= x1; h++) s += `<line class="grid-l" x1="${sx(h)}" x2="${sx(h)}" y1="${TOPH-4}" y2="${H-22}" ${h%2?'stroke-dasharray="2 4"':''}/>
    <text class="axis" x="${sx(h)}" y="20" text-anchor="middle" style="font-size:11px">${h}</text>`;
  ds.forEach((d,i) => {
    const y = TOPH + i*rowH;
    const rows = R.filter(r => r.date === d);
    const sum  = rows.filter(hasFare).reduce((t,r) => t + (+r.fare||0), 0);
    /* 「11/11(水)」は長いので、かっこを外して「11/11 水」にします */
    s += `<text class="axis" x="${L-6}" y="${y+23}" text-anchor="end" fill="${dcol(d)}"
      style="font-size:10px">${esc(fmtD(d).replace('(', ' ').replace(')', ''))}</text>
      ` + (slim
        ? `<text class="axis" x="${L-6}" y="${y+33}" text-anchor="end"
             style="font-size:8.5px;opacity:.8">${rows.length}件</text>`
        : `<text class="axis" x="${L-6}" y="${y+36}" text-anchor="end"
             style="font-size:9px;opacity:.8">${rows.length}件</text>
           <text class="axis" x="${L-6}" y="${y+46}" text-anchor="end"
             style="font-size:9px;opacity:.8">${yen(sum)}</text>`);
    rows.forEach(r => {
      const a = sx(r.dep - (+r.wait||0)/60), b = sx(r.dep), c = sx(r.dep + (+r.ride||0)/60);
      const bd = band(r), bw = Math.max(3, c-b);
      const tip = `${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;つけ ${showT(isUnk(r.dep)?null:r.dep-(r.wait||0)/60)} → 出 ${showT(r.dep)}（待ち${showMin(r.wait)}）&#10;乗車 ${showMin(r.ride)}・${showYen(r.fare)}・${bd[1]}`;
      s += `<g data-tip="${tip}">
        <rect x="${a}" y="${y+(slim?15:19)}" width="${Math.max(1,b-a)}" height="${slim?5:7}" rx="3.5" fill="#8FA3C4"/>
        <rect x="${b}" y="${y+(slim?9:11)}" width="${bw}" height="${slim?17:23}" rx="5" fill="${bd[0]}"/>`;
      /* ③ 乗り場の名前は、帯の中に。入りきらないときは出しません */
      const nm = String(r.place || '');
      if (nm && bw >= nm.length*10 + 10)
        s += `<text class="tlin" x="${b+5}" y="${y+(slim?22:27)}" style="font-size:9.5px">${esc(nm)}</text>`;
      /* ★名前が入らない細い帯でも、金額だけは出します（ご指摘・2026/11/13
           「パッと見、よく分からない」）。いくらの1本かが、一番知りたい所です。 */
      else if (hasFare(r) && bw >= String(yen(r.fare)).length * 5.6 + 6)
        s += `<text class="tlin" x="${b+4}" y="${y+(slim?22:27)}" style="font-size:8.5px">${yen(r.fare)}</text>`;
      s += `<rect x="${a-1}" y="${y+6}" width="${Math.max(6,c-a+2)}" height="32" fill="transparent"/></g>`;
    });
  });
  /* ------------------------------------------------------------
   *  ★「重なり」の帯（ご指示・2026/11/17）
   *
   *    まーく様のご指示：
   *      「恐らく横グラフ？で、アツい部分の重なりみたいなものを
   *        可視化できるようなシステム構築がされてたと思いますが…
   *        あれを上手く復活させて欲しいのですが」
   *
   *    夜を14こ ならべると、同じ時間に帯がそろう所が「濃く」見えます。
   *    それが「重なり」です。目で数えるのは大変なので、
   *    **1時間ごとに、その時間に動いていた本数**を帯にして出します。
   *
   *    ★数えるのは「付け待ちを始めてから、降ろすまで」です。
   *      その時間に、実際に手がふさがっていた本数です。
   *    ★本数です。お客様の人数ではありません。
   * ---------------------------------------------------------- */
  const dens = [];
  for (let h = x0; h < x1; h++) {
    let n = 0;
    ds.forEach(function (d){
      R.filter(function (r){ return r.date === d; }).forEach(function (r){
        const a2 = r.dep - (+r.wait || 0) / 60;
        const c2 = r.dep + (+r.ride || 0) / 60;
        if (a2 < h + 1 && c2 > h) n++;
      });
    });
    dens.push(n);
  }
  const dmx = Math.max.apply(null, dens.concat([1]));
  const dy0 = TOPH + ds.length * rowH + 6;          /* 帯のてっぺん */
  const dh  = DENS - 18;                             /* 帯の高さ */
  s += `<text class="axis" x="${L-6}" y="${dy0+dh/2+4}" text-anchor="end"
    style="font-size:9.5px">重なり</text>`;
  dens.forEach(function (n, i){
    const h = x0 + i;
    const xa = sx(h), xb = sx(h + 1);
    const bw2 = Math.max(2, xb - xa - 2);
    const hh2 = Math.max(1, Math.round(dh * n / dmx));
    /* 一番 重なっている時間だけ、色を変えて目立たせます */
    const top = (n === dmx && n > 0);
    s += `<g data-tip="${h}時台&#10;この時間に動いていた ${n}本（${ds.length}夜ぶん）">
      <rect x="${xa+1}" y="${dy0 + dh - hh2}" width="${bw2}" height="${hh2}" rx="2"
        fill="${top ? BANDS[2].c : '#8FA3C4'}" opacity="${top ? 1 : .75}"/>
      ${n ? `<text class="axis" x="${xa + bw2/2 + 1}" y="${dy0 + dh + 11}"
        text-anchor="middle" style="font-size:8.5px;opacity:.9">${n}</text>` : ''}
    </g>`;
  });

  /* ④ 一番下にも、時刻の数字と線を出します（上まで戻らせないため） */
  s += `<line class="axis-l" x1="${L}" x2="${W-Rp}" y1="${H-22}" y2="${H-22}"/>`;
  for (let h = x0; h <= x1; h++) s += `<line class="axis-l" x1="${sx(h)}" x2="${sx(h)}" y1="${H-22}" y2="${H-18}"/>
    <text class="axis" x="${sx(h)}" y="${H-6}" text-anchor="middle" style="font-size:11px">${h}</text>`;
  s += '</svg>';
  return `<div class="snote">← 横にスクロールできます（横画面推奨）</div>
    <div class="scroll fb">${s}</div>
    <div class="legend"><span><i style="background:#8FA3C4"></i>待ち時間</span>${BANDS.map(b => `<span><i style="background:${b.c}"></i>${b.n}</span>`).join('')}<span><i style="background:#5A6273"></i>不明</span><span>横軸は時。25＝翌1時</span></div>
    <p class="note">一番下の<b>「重なり</b>」は、その時間に動いていた<b>本数</b>です
      （${ds.length}夜ぶんを合わせた数）。付け待ちを始めてから、降ろすまでを数えています。
      一番多い時間だけ、色を変えています。<b>お客様の人数ではありません。</b></p>`;
}

/* ------------------------------------------------------------
 *  横棒グラフ（夜の流れ）
 *
 *  ★まーく様のご指示（2026/11/13）
 *    「横棒グラフも、スプシに合わせて 北7、北4…と
 *      スプシに作られてるタブ通りのカテゴリーごとで作ってください。
 *      自分ですきにカスタムできるようにする機能も残してください」
 * ---------------------------------------------------------- */
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
  /* ★左の数字の場所は、ギリギリまで詰めます（ご指示・2026/11/13）。
       前は 70px もとっていて、肝心の中身が狭くなっていました。 */
  /* ★さらに詰めました（ご指示・2026/11/13「もっと左をスマートに詰められませんか」）。
       縦の数字を9pxにしたので、40pxで「¥10,000」まで入ります。 */
  const L = 40, Rp = 12, T = 12, B = 30;
  const xs = R.map(r => r.dep);
  const x0 = Math.floor(Math.min(...xs) - .5), x1 = Math.ceil(Math.max(...xs) + .5);
  /* ★1時間ぶんの幅は、画面の広さに合わせます。
       22時までは、横にスクロールせずに見られる大きさにします。 */
  const vwS  = Math.max(260, (typeof window !== 'undefined' ? window.innerWidth : 390) - 56);
  const need = Math.max(1, Math.min(x1 - x0, 22 - x0));
  const cwS  = Math.max(30, Math.min(52, Math.floor((vwS - L - Rp) / need)));
  /* ★縦も1画面に収めます（ご指示・2026/11/13）。前は 360px あって、
       説明・ボタン・色の一覧を足すと、1画面に入りませんでした。 */
  const W = L + Rp + Math.max(1, (x1 - x0)) * cwS, H = 236;
  const top = Math.max(...R.map(r => r.fare)) || 1000;
  /* ★目盛りは4〜5本に。本数が多いと、線だらけで何も読めません。 */
  const raw = top / 4;
  const step = [500,1000,2000,2500,5000,10000,20000].find(v => v >= raw) || 50000;
  const y1 = Math.ceil(top / step) * step + step * .18;
  const sx = v => L + (v-x0)/(x1-x0)*(W-L-Rp), sy = v => H-B - (v/y1)*(H-T-B);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  /* ★縦じくは「¥5,000」のように、そのまま出します（ご指示・2026/11/13）。
       「¥5k」という書き方はやめました。 */
  for (let v = 0; v <= y1; v += step) s += `<line class="grid-l" x1="${L}" x2="${W-Rp}" y1="${sy(v)}" y2="${sy(v)}"/>
    <text class="axis" x="${L-4}" y="${sy(v)+3}" text-anchor="end" style="font-size:9px">${v ? yen(v) : '0'}</text>`;
  for (let h = x0; h <= x1; h++) s += `<line class="grid-l" x1="${sx(h)}" x2="${sx(h)}" y1="${T}" y2="${H-B}" stroke-dasharray="2 4"/>`;
  /* ★一番下の線と、時刻の数字は、必ず見えるようにします
       （ご指摘・2026/11/13「下のメモリもなにもみえなくなってしまってる」）。
       点より先に引くと点の下に隠れるので、点のあとに引き直します。 */
  const axisBottom = () => {
    let t = `<line class="axis-l" x1="${L}" x2="${W-Rp}" y1="${H-B}" y2="${H-B}"/>
      <line class="axis-l" x1="${L}" x2="${L}" y1="${T}" y2="${H-B}"/>`;
    for (let h = x0; h <= x1; h++) t += `<line class="axis-l" x1="${sx(h)}" x2="${sx(h)}" y1="${H-B}" y2="${H-B+4}"/>
      <text class="axis" x="${sx(h)}" y="${H-B+17}" text-anchor="middle" style="font-size:11px">${h}</text>`;
    return t;
  };
  const placed = [];
  const fits = (x,y,w) => {
    if (x < L || x + w > W - 2 || y < T + 2 || y > H - B - 2) return false;
    for (const p of placed) if (x < p.x+p.w+2 && x+w+2 > p.x && y < p.y+10 && y+10 > p.y) return false;
    return true;
  };
  ds.forEach(d => {
    const c = dcol(d), pts = R.filter(r => r.date === d).sort((a,b) => a.dep - b.dep);
    if (scOpt.line && pts.length > 1)
      s += `<polyline fill="none" stroke="${c}" stroke-width="1.2" opacity=".5" points="${pts.map(r => sx(r.dep)+','+sy(r.fare)).join(' ')}"/>`;
    pts.forEach(r => {
      const x = sx(r.dep), y = sy(r.fare);
      /* ★丸は小さく（ご指示・2026/11/13）。押せる広さは透明の丸で別にとります */
      s += `<g data-tip="${fmtD(d)} ${esc(r.place||'')}・${esc(r.who)}&#10;${showT(r.dep)}・${showYen(r.fare)}&#10;待ち${showMin(r.wait)}／乗車${showMin(r.ride)}">
        <circle cx="${x}" cy="${y}" r="2.2" fill="${c}"/><circle cx="${x}" cy="${y}" r="11" fill="transparent"/></g>`;
      if (scOpt.label) {
        const txt = yen(r.fare), w = txt.length*5.2;
        /* ★数字が重ならないように、右・左・上・下と置き場所をさがします。
             どこにも置けないときは、出しません（重ねるより読めます）。 */
        let put = null;
        for (const o of [[5,-4],[5,-13],[5,5],[-5-w,-4],[-5-w,-13],[-5-w,5],
                         [5,-22],[-5-w,-22],[5,14],[-5-w,14]]) {
          if (fits(x+o[0], y+o[1], w)) { put = [x+o[0], y+o[1]]; break; }
        }
        if (put) { placed.push({x:put[0], y:put[1], w}); s += `<text class="glab" x="${put[0]}" y="${put[1]+8}" style="font-size:8px" fill="${c}">${txt}</text>`; }
      }
    });
  });
  s += axisBottom() + '</svg>';
  return `<div class="snote">← 横にスクロールできます（横画面推奨）</div>
    <div class="scroll fb">${s}</div>
    <div class="legend">${ds.map(d => `<span><i style="background:${dcol(d)}"></i>${fmtD(d)}</span>`).join('')}</div>`;
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
/*
 * ★帯の下に、パーセントを字でも並べます（ご指示・2026/11/13
 *   「グラフ内のパーセンテージが見づらいです、もっと見やすく作り直してください」）。
 *   帯の中の数字は、細い所に入らないと消えてしまいます。
 *   下に色つきで並べれば、どんな画面でも ぜんぶ読めます。
 */
function bandPctLine(o){
  if (!o || !o.n) return '';
  const t = BANDS.map(function (b){
    const p = bandPct(o, b.k);
    return p ? '<span style="color:' + b.c + '"><i style="background:' + b.c + '"></i>' +
               b.n + ' ' + p + '%</span>' : '';
  }).filter(Boolean).join('');
  return t ? '<div class="bpct">' + t + '</div>' : '';
}

function bandBar(o, big){
  if (!o.n) return '<div class="bandbar empty"></div>';
  return '<div class="bandbar' + (big ? ' big' : '') + '">' +
    BANDS.map(function (b){
      const p = bandPct(o, b.k);
      if (!p) return '';
      /*
       * ★数字は、その色の幅に入るときだけ出します（2026/11/13）。
       *   前は「12%より多ければ出す」という割合で決めていました。
       *   細い機種（320px）では 14.3% でも 22px しかなく、
       *   「14.3%」の字（約30px）が帯からはみ出して切れていました。
       *   画面の広さから、入る幅があるかどうかで決めます。
       */
      const barW = Math.max(150,
        (typeof window !== 'undefined' ? window.innerWidth : 390) - 64);
      const need = 34 / barW * 100;
      return '<span style="width:' + p + '%;background:' + b.c + '">' +
             (p >= need ? p + '%' : '') + '</span>';
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
    '<div class="bb">' + bandBar(o) + bandPctLine(o) +
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

  /* ★プルダウンのほかに、字でも探せるようにします（ご指示・2026/11/13
       「この乗り場は何時が良いか、も検索候補機能を追加してください」）。 */
  const sel = '<select class="fsel" id="bestPlaceSel">' +
    list.map(p => '<option value="' + esc(p) + '"' + (p === pick ? ' selected' : '') + '>' +
      esc(p) + '（' + cnt[p] + '件）</option>').join('') + '</select>' +
    '<div class="ktfind"><input class="ja" id="bestFind" data-pick="bestSug"' +
    ' placeholder="乗り場をさがす（例：梅田）">' +
    '<div class="fsug" id="bestSug"></div></div>';

  if (!rows.length) {
    return '<div class="card"><h2>乗り場別 オススメ時間帯</h2>' +
      '<div class="bsel">' + sel + '</div>' +
      '<div class="empty">' + esc(pick) + ' は、3件以上そろった時間帯が、まだありません。</div></div>';
  }

  /* 一番よい時間（ロング率が高い順。同じならロングの平均金額が高いほう） */
  const top = rows.slice().sort((a2, b2) => b2.L - a2.L || b2.avg - a2.avg)[0];
  const body = rows.map(function (x){
    const on = (x === top);
    return '<div class="btrow' + (on ? ' top' : '') + '">' +
      '<span class="bth">' + x.h + '時台</span>' +
      '<span class="btb">' + bandBar(x.o) + bandPctLine(x.o) + '</span>' +
      '<span class="btv">' + x.L + '%</span>' +
      '<span class="btm">平均 ' + yen(x.avg) + '<i>' + x.o.n + '件</i></span></div>';
  }).join('');

  return '<div class="card"><h2>乗り場別 オススメ時間帯</h2>' +
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
    /* ★3件そろっていない時間の枠は、まるごと出しません（ご指示・2026/11/16
         「不要なもの(データ参考にならないもの)は極力非表示にして、
           必要最低限だけがパッと可視化できることを全ページで徹底してください」）。
         「記録なし」の枠が並ぶと、見るところが分からなくなります。 */
    if (!rk.length) return;
    bb += '<div class="blk3' + (i === 0 ? ' now' : '') + '">' +
      /* ★「いま／次／そのあと」の札は、出しません（ご指示・2026/11/12）。
           時刻だけで分かります。いまの枠は、赤い枠で見分けます。 */
      '<div class="b3h"><b>' + bk.a + '〜' + bk.b + '時</b>' +
      '<span>' + (o.n ? ('ロング ' + bandPct(o, 'L') + '%・' + o.n + '件・平均 ' + yen(bandAvg(t))) : '記録なし') + '</span>' +
      '</div>' +
      longRows(rk, 3) +
      '</div>';
  });
  if (!bb) return '';
  return '<div class="card plan3"><h2>時間帯ごとの おすすめ乗り場</h2>' +
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
  /* ★「乗り場別 オススメ時間帯」を、ページの一番上に出します
       （ご指示・2026/11/17「何時が良いかのやつは、
         ページの1番上に移動してください」）。
     走る前に一番に見たいのは「自分の乗り場を、何時に狙うか」だからです。 */
  const topCard = bestTimeCard(visible().filter(hasDep));
  const head = leadCard('ratio') + topCard +
    '<div class="card"><h2>ロングが出やすい所と時間</h2>' +
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
  /* ★「乗り場別 オススメ時間帯」を一番上に（ご指示・2026/11/13、2026/11/17） */
  /* ★「時間帯べつ 乗り場ランキング」を、このページの一番上に出します
       （ご指示・2026/11/13「時間帯別のりばランキングを
         そのページの1番上にしてください」）。
       そのあとは、つながりの近い順に並べます。
         ① 時間帯べつ 乗り場ランキング … いま、どこへ行くか
         ② 乗り場別 オススメ時間帯     … その乗り場を、いつ狙うか
         ③ 時間順の狙い目               … 夜ぜんたいの流れ
         ④ ロングが出やすい乗り場／時間帯
         ⑤ エリアごと／前の期間と比べる */
  let rankCard = '';
  /* ★オススメ時間帯は、もう一番上に出してあります（上の topCard）。
       ここでくり返すと、同じ表が2つ ならびます。 */
  let out = hourPlanCard(D);

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
      /*
       * ★3件そろっていない時間は、まるごと出しません（ご指示・2026/11/16
       *     「だから、データとして溜まってない状態なら非表示にしてください」）。
       *   前は「まだ3件そろった乗り場がありません。この時間に入っている所：
       *   ○○ 1件・…」と並べていました。1件は たまたまの1本なので、
       *   出してはいけない数です。
       */
      if (!rk.length) return;
      hb += '<div class="hblk' + (hourPick !== '' && +hourPick === h ? ' on' : '') + '">' +
        '<div class="hbh"><b>' + h + '時台</b>' +
        '<span>ロング ' + bandPct(o, 'L') + '%・' + o.n + '件・平均 ' + yen(bandAvg(t)) + '</span></div>' +
        '<div class="hbn">' + (h - 1) + '〜' + (h + 1) + '時の記録から</div>' + longRows(rk, 3) +
        '</div>';
    });
    if (hb) {
      rankCard = '<div class="card"><h2>時間帯別 乗り場ランキング</h2>' +
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
      const pls = sortPlaces([...new Set(sr.map(r => r.place).filter(Boolean))]
        .map(p => ({ p: p, n: sr.filter(r => r.place === p).length })));
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
    out += '<div class="card"><h2>エリア別のロング割合</h2>' +
      '<p class="note">北・南・他のまとまりで見ています。</p>' + pbody +
      '<div class="legend">' + BANDS.map(bd => '<span><i style="background:' + bd.c + '"></i>' + bd.n + '</span>').join('') + '</div></div>';
  }
  return head + rankCard + out + compareCard();
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
let gasStat = null;
async function gasLoad(){
  try {
    const r = await fetch('data/gas.json', { cache: 'no-store' });
    if (r.ok) gasInfo = await r.json();
  } catch (e) { gasInfo = null; }
  /* ★仕組みの様子（ご質問・2026/11/15
       「Googleスクリプトのページを、webサイトの方にも表示させることは
         できないのでしょうか」）。無くても、ほかは動きます。 */
  try {
    const r2 = await fetch('data/status.json', { cache: 'no-store' });
    if (r2.ok) gasStat = await r2.json();
  } catch (e) { gasStat = null; }
  gasPoke();
}

/* ------------------------------------------------------------
 *  台帳を開いた人が、そのまま 仕掛けを起こす（ご指示・2026/11/16）
 *
 *  ★まーく様のご指示
 *    「それと、スプシはまた止まってたりしてませんか？
 *      これ、何回止まれば気が済むんですか？
 *      二度と止まらない仕組みづくりにしてください」
 *
 *  ★これまでの弱点は、はっきりしていました。
 *    Googleの見張り（決まった時刻にひとりでに動くしかけ）が
 *    全部 消えると、中からは誰も動かせません。
 *    外から受け口を叩けば起き上がるのですが、
 *    **叩く人が まーく様しかいませんでした**。
 *    だから、止まったことに気づくまで 止まったままでした。
 *
 *  ★ここからは、**台帳を開いた人みんな**が、黙って叩きます。
 *    乗務員の方は、ひと晩に何度も この画面を開かれます。
 *    開くたびに受け口が叩かれるので、見張りが消えても すぐ戻ります。
 *
 *  ★押していただくことは、何もありません。画面も変わりません。
 *  ★お金はかかりません（受け口は無料のまま。LINEの通数にも入りません）。
 *  ★その端末から叩くのは 30分に1回までです。
 *    受け口の側でも、診るのは1時間に1回・取り込みは3分に1回までに
 *    しぼってあるので、何人が開いても重くなりません。
 * ---------------------------------------------------------- */
const GAS_POKE_KEY = 'tn_poke_at';
function gasPoke(){
  try {
    const u = (gasInfo && gasInfo.exec) ? String(gasInfo.exec) : '';
    if (!u || !/^https:\/\/script\.google\.com\//.test(u)) return;
    let last = 0;
    try { last = Number(localStorage.getItem(GAS_POKE_KEY) || 0); } catch (e) {}
    if (last && Date.now() - last < 30 * 60 * 1000) return;
    try { localStorage.setItem(GAS_POKE_KEY, String(Date.now())); } catch (e) {}
    /*
     * ★返事は読みません（読もうとすると、よその住所なので断られます）。
     *   こちらは「叩く」だけで用が足ります。
     *   しくじっても、画面には何も出しません（ふだんは1通も出さない決まり）。
     */
    fetch(u, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' })
      .catch(function (){});
  } catch (e) {}
}

/*
 * 仕組みの様子（まーく様だけ）。
 * ★スクリプトの画面そのものは、ここには出せません。
 *   Googleのログインが要るうえ、よそのページの中には
 *   出せない決まりになっているためです。
 *   そのかわり「いまの様子」と、押しどころを出します。
 */
function gasStatCard(){
  if (!(ME.profile && ME.profile.is_admin)) return '';
  const u = (gasInfo && gasInfo.exec) ? String(gasInfo.exec) : '';
  const s2 = gasStat || {};
  const ok = function (b){ return b ? '<b class="gsok">○</b>' : '<b class="gsng">×</b>'; };
  const un = function (v){ return (v == null || v === '') ? '不明' : v; };

  /*
   * ★まーく様のご質問（2026/11/16）
   *     「Googleスクリプトへ別ページへ飛ばすのではなく
   *       webページ上で見る、もしくは同じようなページ作成をするのは
   *       不可能なのでしょうか」
   *
   *   スクリプトの画面そのものは、ここには出せません。
   *   Googleのログインが要るうえ、よその画面の中に入れることを
   *   Google 側が断っているためです。
   *   そこで、その画面で見ていたものを、こちらで同じように並べました。
   *   （紙に書き出したものを読んでいるだけなので、ログインは要りません）
   */

  /* ① 一番 知りたいこと＝動いているか */
  const live = (s2.stop == null) ? null : !s2.stop;
  const head = '<div class="sysnow ' + (live === null ? '' : (live ? 'ok' : 'ng')) + '">' +
    '<b>' + (live === null ? '分かりません' : (live ? '動いています' : '止まっているかもしれません')) + '</b>' +
    '<span>最後に動いた：' + esc(un(s2.beat)) +
    (s2.beatMin == null ? '' : '（' + s2.beatMin + '分前）') + '</span></div>';

  /* ② 見張りの顔ぶれ */
  const jobs = (s2.jobs || []);
  const jobHTML = jobs.length
    ? '<div class="sysjob">' + jobs.map(function (j){
        return '<span><b>' + esc(String(j.n || '')) + '</b>' +
          (j.c > 1 ? '<i>×' + j.c + '</i>' : '') + '</span>';
      }).join('') + '</div>'
    : '<p class="note">見張りの顔ぶれは、まだ届いていません。</p>';

  /* ③ 数の表 */
  /* ★スプシから台帳へ、ひとりでに移せているか（ご指示・2026/11/16で
       手で取り込む欄を画面から外したので、ここで必ず見えるようにします） */
  const sy = s2.sync || null;
  const tbl = '<table class="systbl"><tbody>' +
    '<tr><td>スプシから台帳へ</td><td>' + (sy && sy.at
      ? esc(String(sy.at)) + (sy.n == null ? '' : '　' + sy.n + '件')
      : '不明') + '</td></tr>' +
    '<tr><td>見張りの数</td><td>' + un(s2.trig) + '</td></tr>' +
    '<tr><td>受け口</td><td>' + (s2.web == null ? '不明' : ok(s2.web)) + '</td></tr>' +
    '<tr><td>版（200で満杯）</td><td>' + un(s2.verNo) + '</td></tr>' +
    '<tr><td>公開（' + un(s2.depMax) + 'で満杯）</td><td>' + un(s2.depN) + '</td></tr>' +
    '<tr><td>直近のしくじり</td><td>' + (s2.errN == null ? '不明' : (s2.errN + '件')) + '</td></tr>' +
    '<tr><td>中身の版</td><td>' + esc(String(un(s2.ver))) + '</td></tr>' +
    '<tr><td>書いた時刻</td><td>' + esc(String(un(s2.at))) + '</td></tr>' +
    '</tbody></table>';

  /* ④ しくじりは「いつ・どのあたり」だけ（中身は書いていません） */
  const errs = (s2.errs || []);
  const errHTML = errs.length
    ? '<div class="scroll"><table class="systbl"><thead><tr><th>いつ</th><th>どのあたり</th>' +
      '</tr></thead><tbody>' + errs.map(function (e){
        return '<tr><td>' + esc(String(e.at || '')) + '</td><td>' +
               esc(String(e.w || 'そのほか')) + '</td></tr>';
      }).join('') + '</tbody></table></div>'
    : '';

  return '<div class="card"><h2>仕組みの様子（まーく様だけ）</h2>' +
    '<p class="note">スクリプトの画面で見ていたものを、ここに並べています。' +
    'スクリプトの画面そのものは、ここには出せません（Googleのログインが要るためです）。</p>' +
    head +
    '<h3 class="syshd">見張りの顔ぶれ</h3>' + jobHTML +
    '<h3 class="syshd">数</h3>' + tbl +
    (errHTML ? '<h3 class="syshd">直近のしくじり</h3>' + errHTML +
      '<p class="note">どこで起きたかだけを出しています。中身（英語の文）は、' +
      'だれでも開けるところに置かないようにしています。</p>' : '') +
    (u ? '<div class="actions">' +
      '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">仕掛けを起こす</a>' +
      '</div><p class="note">別のページが開きます。見張りの立て直し・新しい中身の取り込み・' +
      '頼まれごとを、まとめて走らせます。<b>この欄も、そのとき新しくなります</b>' +
      '（1分ほどで入れ替わります）。</p>'
      : '<p class="note">受け口の住所が、まだ届いていません。</p>') +
    '<p class="note">※ 許可のし直しと、中身を書きかえることだけは、' +
    'どうしてもスクリプトの画面でしかできません（Googleの決まりです）。</p>' +
    '</div>';
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
  /*
   * ★【仕掛けを起こす】は、まーく様だけに出します（ご質問・2026/11/14
   *     「仕掛けを起こすというのは、僕だけのアカウントの表示になってますか？」）。
   *   これは仕組みの手当てで、乗務員の方々には関わりのない話です。
   *   ほかの方の画面に出すと「何これ」になりますし、
   *   押すと見慣れない画面が開いて、不安にさせます。
   */
  if (!(ME.profile && ME.profile.is_admin)) return '';
  if (!gasStale() || !gasInfo || !gasInfo.exec) return '';
  return '<div class="wakebar">' +
    '<b>仕掛けが止まっているかもしれません。</b>' +
    '<span>イベントの紙が ' + esc(String(evData.at)) + ' のままです。</span>' +
    '<a class="btn" href="' + esc(gasInfo.exec) + '" target="_blank" rel="noopener">' +
    '仕掛けを起こす</a>' +
    '<span class="note">別のページが開きます。押すと自動で直ります。' +
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
  const out0 = Object.keys(m).map(function (p){
    const rs = m[p].filter(hasDep);
    const hm = {};
    rs.forEach(function (r){ const h = Math.floor(r.dep); hm[h] = (hm[h] || 0) + 1; });
    const hrs = Object.keys(hm).map(Number).sort(function (a, b){ return hm[b] - hm[a] || a - b; });
    /* ★曜日の区分も数えます（ご指示・2026/11/16
         「もっと、それぞれ曜日と時間帯が目立つようにしてください」）。
       前は、この欄に曜日が1文字も出ていませんでした。 */
    const dm = {};
    m[p].forEach(function (r){
      if (!r.date) return;
      const c = dayCls(r.date); dm[c] = (dm[c] || 0) + 1;
    });
    const dys = Object.keys(dm).sort(function (a, b){ return dm[b] - dm[a]; });
    const f = m[p].filter(hasFare);
    return { p: p, n: m[p].length, nd: rs.length, hm: hm, hrs: hrs, dm: dm, dys: dys,
             avg: f.length ? f.reduce(function (a, r){ return a + (+r.fare || 0); }, 0) / f.length : 0,
             nf: f.length,
             wait: (function (){ const w = m[p].filter(function (r){ return !isUnk(r.wait); });
               return w.length ? w.reduce(function (a, r){ return a + (+r.wait || 0); }, 0) / w.length : 0; })() };
  });
  return sortPlaces(out0);
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
function whenPane(cat, title, label, lead, test, noLead){
  /* test が渡されていれば、そちらで選びます（チケットなど） */
  const R = visible().filter(test ? test
    : function (r){ return recCat(r) === cat; });
  /* ★ここだけは「3件そろってから」の決まりを外します
       （ご指示・2026/11/13「バラシタブ、関空タブにおいては
         3件ルールは除いてください（圧倒的に情報が少ないので）」）。
     ★そのかわり、出す数字は「件数」です。割合は出しません。
       件数は、たまたまでも たしかにあった事実なので、嘘になりません。
     ★1件・2件のところには「まだ○件」と、はっきり添えます。 */
  const head = (noLead ? '' : leadCard('tok')) +
    '<div class="card"><h2>' + esc(title) + '</h2>' +
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

  /* 曜日の区分の言い方（色は、表の見出しと同じ分け方です） */
  const DCLS = [['d-wd', '平日'], ['d-fri', '金・祝前日'], ['d-sat', '土'], ['d-sun', '日・祝']];

  let body = '';
  fat.forEach(function (o){
    /*
     * ★時間帯と曜日を、はっきり大きく出します（ご指示・2026/11/16
     *     「もっと、それぞれ曜日と時間帯が目立つようにしてください」）。
     *   前は「呼ばれやすい時間　3時台 1件」と、普通の字で1行 書くだけで、
     *   曜日にいたっては 1文字も出していませんでした。
     */
    const hTop = o.hrs.slice(0, 3).map(function (h, i){
      return '<span class="wk wkh' + (i === 0 ? ' top' : '') + '">' +
        (h % 24) + '<i>時台</i><em>' + o.hm[h] + '件</em></span>';
    }).join('');
    const dTop = DCLS.filter(function (x){ return o.dm[x[0]]; })
      .sort(function (a, b){ return o.dm[b[0]] - o.dm[a[0]]; })
      .map(function (x, i){
        return '<span class="wk wkd ' + x[0] + (i === 0 ? ' top' : '') + '">' +
          esc(x[1]) + '<em>' + o.dm[x[0]] + '件</em></span>';
      }).join('');
    body += '<div class="wrow">' +
      '<div class="wh"><b>' + esc(o.p) + '</b>' +
      '<a class="mini" href="' + mapUrl(o.p) + '" target="_blank" rel="noopener">📍 地図</a>' +
      (o.nd < HOT_MIN_N ? '<i class="wfew">まだ ' + o.nd + '件</i>' : '') + '</div>' +
      '<div class="wkey"><span class="wkl">時間</span>' + hTop + '</div>' +
      (dTop ? '<div class="wkey"><span class="wkl">曜日</span>' + dTop + '</div>' : '') +
      whenBar(o, hrs) +
      '<div class="wmeta">' + o.n + '件' +
      (o.nf ? '／1本の平均 ' + yen(o.avg) : '') +
      (o.wait ? '／平均 待ち ' + Math.round(o.wait) + '分' : '') + '</div></div>';
  });
  if (!body) body = '<div class="empty">時刻の入った記録が、まだありません</div>';

  /* ★日付・曜日・時刻を、そのまま並べます（ご指示・2026/11/13
       「関空やバラシ情報は 具体的な日付土曜日と時間帯がマストなので
         これは分かりやすく表示してください」）。
     ★件数が少ないので、平均や割合より「いつ・何時・いくら」が役に立ちます。
       新しい順に、そのまま出します。 */
  /*
   * ★ここは「並べただけ」の形をやめ、**表**にしました（ご指摘・2026/11/16
   *     「各位置がバラバラです(日付の文字数が違った際に、一気にズレてしまってます)
   *       表と同じように構成見直ししてください」）。
   *   字を横に流して置いていたので、日付が「11/15(日)」と「8/30(日)」で
   *   1字 違うだけで、そのあとの 時刻・乗り場・金額が ぜんぶ ずれていました。
   *   欄の幅を決めた表にすれば、どの行も たてにそろいます。
   */
  let plain = '<div class="card"><h2>' + esc(title) + 'の記録（新しい順）</h2>' +
    '<p class="note">日付・時刻・' + esc(label) + '・金額を、そのまま並べています。</p>' +
    '<div class="snote">← 横にスクロールできます（横画面推奨）</div>' +
    '<div class="scroll tbl wtbl"><table><thead><tr>' +
    '<th>日</th><th class="n">時刻</th><th>' + esc(label) + '</th>' +
    '<th class="n">金</th><th class="n">待</th></tr></thead><tbody>' +
    R.slice().sort(function (a2, b2){
      if (a2.date !== b2.date) return (a2.date < b2.date ? 1 : -1);
      return (+b2.dep || 0) - (+a2.dep || 0);
    }).map(function (r){
      return '<tr>' +
        '<td class="c-date ' + dayCls(r.date) + '">' +
          esc(String(fmtD(r.date)).replace(/\((.)\)/, '$1')) + '</td>' +
        '<td class="n">' + showT(r.dep) + '</td>' +
        '<td class="c-place">' + esc(r.place || '（無記入）') + '</td>' +
        '<td class="n c-fare ' + fareCls(r.fare) + '">' + showYen(r.fare) + '</td>' +
        '<td class="n ' + waitCls(r.wait) + '">' + (isUnk(r.wait) ? UNK : r.wait) + '</td>' +
        '</tr>';
    }).join('') + '</tbody></table></div></div>';

  let out = head + plain + '<div class="card"><h2>' + esc(label) + 'ごとの 呼ばれやすい時間</h2>' +
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

/* ------------------------------------------------------------
 *  バラシ・関空・チケット（1つのメニューにまとめました）
 *
 *  ★まーく様のご指示（2026/11/15）
 *    「バラシと関空は、メニューをひとまとめにして良いです」
 *    「手書きで『チケ』と書いてるものは、チケット扱いです。
 *      チケット乗車のデータも、バラシや関空と同様に
 *      まとめてわかるようにしたいので」
 *
 *  ★チケットは、乗り場の名前ではなく「他」の欄で見分けます
 *    （バラシ・関空と同じ考え方。会場の名前で決めると、
 *      ただの流しの1本まで入ってしまうためです）。
 * ---------------------------------------------------------- */
/* ★並びは GO → Uber → バラシ → 関空 → チケット（ご指示・2026/11/16
     「Uberを1番左にしてください」「GOが1番左に来るようにしてください」）。
   ★5つになったので、ます目は3つずつ（2段）にします。
     5つ横に並べると、一番細い機種で名前が切れます。 */
const TOK_KINDS = [
  { k:'go',    n:'GO',       s:'何時台に多いか' },
  /* ★Uber・GOが出やすい乗り場・時間帯（ご指示・2026/11/16）。
       よその情報は使いません。自分たちの記録の「種類」から出します。 */
  { k:'uber',  n:'Uber',     s:'何時台に多いか' },
  { k:'bara',  n:'バラシ',   s:'公演のあと' },
  { k:'kix',   n:'関空',     s:'ホテルと時間' },
  { k:'ticket',n:'チケット', s:'何時台に多いか' }
];
const TOK_KEY = 'tsukemachi.tok';
let tokKind = (function (){
  try { const v = localStorage.getItem(TOK_KEY);
    return TOK_KINDS.some(x => x.k === v) ? v : 'go'; } catch (e) { return 'go'; }
})();
function tokKindSet(k){ tokKind = k; try { localStorage.setItem(TOK_KEY, k); } catch (e) {} }

/* 「他」の欄に「チケ」と書いてあるものが、チケット乗車です */
function isTicket(r){
  return /チケ/.test(String((r && r.note) || ''));
}
/* 種類が Uber の乗車（書き方のゆれは normMethod がそろえます） */
function isUber(r){
  return normMethod(String((r && r.method) || '')) === 'Uber';
}
/* 種類が GO の乗車（ご指示・2026/11/16「GOも追加して欲しい」）。
   「ゴー」「ｺﾞｰ」などの書き方のゆれは、normMethod がそろえます。 */
function isGo(r){
  return normMethod(String((r && r.method) || '')) === 'GO';
}

function paneTok(){
  const k = tokKind;
  const head = leadCard('tok') + '<div class="card"><h2>種類別（GO・Uber・バラシ・関空・チケット）</h2>' +
    '<p class="note">見たいものを、下からえらんでください。</p>' +
    gMenu(TOK_KINDS, tokKind, 'data-tk') + '</div>';
  if (k === 'kix')    return head + whenPane('関空', '関空', 'ホテル',
    'どのホテルから、何時台に呼ばれているかを並べます。', null, true);
  if (k === 'ticket') return head + whenPane('', 'チケット', '乗り場',
    'チケットの乗車が、どこで・何時台に多いかを並べます。', isTicket, true);
  if (k === 'uber')   return head + whenPane('', 'Uber', '乗り場',
    'Uberの乗車が、どこで・何時台に多いかを並べます。', isUber, true);
  if (k === 'go')     return head + whenPane('', 'GO', '乗り場',
    'GOの乗車が、どこで・何時台に多いかを並べます。', isGo, true);
  return head + whenPane('ﾊﾞﾗｼ', 'バラシ', '会場',
    '公演のあと、お客が出てくる時間です。会場ごとに、何時台に呼ばれているかを並べます。', null, true);
}
/* 前の押しどころを覚えている方のために、残してあります */
function paneBara(){ tokKind = 'bara'; return paneTok(); }
function paneKix(){  tokKind = 'kix';  return paneTok(); }

/* ------------------------------------------------------------
 *  再現性あるかも（くり返しのお客様）
 *
 *  ★まーく様のご指示（2026/11/15）
 *    「定期的な乗車が見受けられるお客様データも載せているため
 *      〇回目、や、再現性あり、や、細かい指示内容があるお客様は
 *      別で、再現性あるかも、というメニューを作って
 *      各乗車や時間など、おそらくのパターンを出せるような形で
 *      わかりやすくまとめたページを追加してください」
 *
 *  ★名前は「再現性あるかも」です。言い切りません。
 *    2回そろっただけで「必ず来ます」と言うと、空振りを生みます。
 *  ★1回しかないものは出しません（たまたまの1本です）。
 * ---------------------------------------------------------- */
/* 「他」の欄に、くり返しの印があるもの */
const REP_RE = /[0-9０-９]+\s*回目|再現性|毎週|毎月|定期|いつもの|常連|指名/;
function repMarked(R){
  return (R || []).filter(function (r){ return REP_RE.test(String((r && r.note) || '')); });
}
/** その日の曜日（0=日） */
function wdayOf(d){
  const a = String(d || '').split('-').map(Number);
  if (a.length < 3) return -1;
  return new Date(a[0], a[1] - 1, a[2]).getDay();
}
/** 日付の差（日数） */
function dayGap(a, b){
  const x = String(a).split('-').map(Number), y = String(b).split('-').map(Number);
  if (x.length < 3 || y.length < 3) return 0;
  return Math.round((new Date(y[0], y[1] - 1, y[2]) - new Date(x[0], x[1] - 1, x[2])) / 86400000);
}
/** 日付に日数を足す */
function addDays(d, n){
  const a = String(d).split('-').map(Number);
  const t = new Date(a[0], a[1] - 1, a[2] + n);
  return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
}

/**
 * 同じ枠（乗り場 × 曜日 × 時間帯）に、何度 付けたか。
 * ★2026/11/17 から、画面には出していません（ご指示）。消してはいません。
 * ★2回以上そろったものだけ出します。1回は、たまたまです。
 */
function repPatterns(R){
  const by = {};
  (R || []).filter(hasDep).forEach(function (r){
    const p = canonPlace(String((r && r.place) || '').trim());
    if (!p || !r.date) return;
    const w = wdayOf(r.date); if (w < 0) return;
    const h = Math.floor(r.dep);
    const k = p + '\u0001' + w + '\u0001' + h;
    by[k] = by[k] || { p: p, w: w, h: h, rows: [] };
    by[k].rows.push(r);
  });
  const out = [];
  Object.keys(by).forEach(function (k){
    const o = by[k];
    if (o.rows.length < 2) return;
    const ds = [...new Set(o.rows.map(function (r){ return r.date; }))].sort();
    if (ds.length < 2) return;                 /* 同じ日の2本は、くり返しではありません */
    const gaps = [];
    for (let i = 1; i < ds.length; i++) gaps.push(dayGap(ds[i - 1], ds[i]));
    const mean = gaps.reduce(function (a, b){ return a + b; }, 0) / gaps.length;
    /*
     * ★「次は」を出せる のは、次の3つが そろったときだけです
     *   （ご指摘・2026/11/16
     *     「これ、ただ単に乗り場と金額が合致してるものだけで追加してませんか？
     *       似た金額のものはあるとしても、それは同じお客様とはかぎらないので
     *       そこはきちんと再精査してください」）。
     *
     *   ① 間かくが2つ以上あること（日が3つ以上）
     *      ★ここが抜けていました。日が2つしかないと 間かくは1つだけで、
     *        「そろっている」は 必ず true になります。
     *        つまり、2回あっただけで いつも日付を出していました。
     *   ② その間かくが、おたがい2日のうちに収まっていること
     *   ③ 間かくが35日いない（3か月先の日付は、当てになりません）
     */
    const even = gaps.length >= 2 &&
      gaps.every(function (g){ return Math.abs(g - mean) <= 2; }) &&
      mean <= 35;
    const F = o.rows.filter(hasFare);
    out.push({ p: o.p, w: o.w, h: o.h, n: o.rows.length, days: ds.length,
      last: ds[ds.length - 1],
      gap: even ? Math.round(mean) : 0,
      next: even ? addDays(ds[ds.length - 1], Math.round(mean)) : '',
      lo: F.length ? Math.min.apply(null, F.map(function (r){ return +r.fare; })) : 0,
      hi: F.length ? Math.max.apply(null, F.map(function (r){ return +r.fare; })) : 0,
      avg: F.length ? F.reduce(function (a, r){ return a + (+r.fare || 0); }, 0) / F.length : 0,
      note: (o.rows.map(function (r){ return String(r.note || '').trim(); })
        .filter(Boolean)[0] || '') });
  });
  return out.sort(function (a, b){ return b.n - a.n || b.days - a.days; });
}

function paneRep(){
  const R = visible();
  /*
   * ★見出しの下の説明も、言い方を直しました（ご指摘・2026/11/16）。
   *   前は「同じ乗り場・同じ曜日・同じ時間帯で2回以上あったもの」を
   *   「再現性あるかも」と呼んでいました。それは走り方の話であって、
   *   お客様がくり返して来ている、という話ではありません。
   */
  /*
   * ★このページに出すのは「同じお客様」の話だけです
   *   （ご指示・2026/11/17「同じ人のみを再現性ありと言ってるので
   *     この部分は不要なので消してください」）。
   *   「他」の欄に ご自身で印を付けた乗車だけを出します。
   */
  const head = leadCard('rep') + '<div class="card"><h2>くり返しの印がある乗車</h2>' +
    '<p class="note">「他」の欄に「2回目」「再現性」などの印が' +
    '書いてある記録です。</p>' +
    filterChips(true) + '</div>';

  const mk = repMarked(R);
  if (!mk.length) return head + emptyCard('該当データがありません');

  let out = head;

  /*
   * ★並びを入れ替えました（ご指摘・2026/11/16）。
   *   まーく様がお求めだったのは「印のある乗車」のほうです。
   *   下の「同じ枠に、何度も付けている」は、お客様の話ではありません。
   */
  if (mk.length) {
    const rows = mk.slice().sort(function (a, b){
      return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    });
    out += '<div class="card"><h2>印のある乗車（〇回目・再現性 など）</h2>' +
      '<p class="note">「他」の欄に、くり返しの印が書いてある記録です。</p>' +
      '<div class="scroll"><table><thead><tr><th>日付</th><th class="n">時刻</th>' +
      '<th>乗り場</th><th class="n">金額</th><th>他</th></tr></thead><tbody>' +
      rows.slice(0, 40).map(function (r){
        return '<tr><td>' + esc(fmtD(r.date)) + '</td>' +
          '<td class="n">' + showT(r.dep) + '</td>' +
          '<td>' + (r.place ? esc(canonPlace(r.place)) : UNK) + '</td>' +
          '<td class="n">' + showYen(r.fare) + '</td>' +
          '<td class="ja">' + esc(String(r.note || '')) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="snote">← 横にスクロールできます（横画面推奨）</div></div>';
  }

  /*
   * ★「同じ枠に、何度も付けている」の欄は、なくしました
   *   （ご指示・2026/11/17「同じ人のみを再現性ありと言ってるので
   *     この部分は不要なので消してください」）。
   *
   *   おっしゃるとおりでした。あの欄は、同じ乗り場・曜日・時間帯に
   *   **こちらが何度も付けた**という記録で、お客様の話ではありません。
   *   その断り書きを添えていたこと自体が、
   *   このページに置くものではなかった、という証でした。
   *   このページに残すのは「印のある乗車」だけです。
   *
   *   ★repPatterns は消していません。消すと、あとで戻せなくなります。
   */
  return out;
}

/* ------------------------------------------------------------
 *  日報（紙）の写真を読む
 *
 *  ★まーく様のご指示（2026/11/15）
 *    「紙の日報データが毎日作られていて、写真を撮って記録している」
 *    「写真をアップロードして、反映する機能を追加して欲しいです」
 *
 *  ★読んだものを、そのまま記録に入れることは **しません**。
 *    手書きの字は、どうしても読みちがえます。
 *    間違った金額が売上に入ると、あとから分からなくなります。
 *    必ず、この画面で見てから【足す】を押していただきます。
 *  ★写真は、小さくしてから置きます（そのままだと重いためです）。
 *  ★見られるのは、置いた本人と まーく様だけです（台帳の側でも止めています）。
 * ---------------------------------------------------------- */
let nippos = [];          /* 置いた写真の一覧（写真そのものは持ちません） */
let nippoPick = {};       /* 画面でえらんだ行 */
let nippoBusy = '';
/*
 * ★えらんだ写真は、ここに控えます（ご指摘・2026/11/16
 *     「写真選択したのに、読み込みできてないですし、複数選択ができません」）。
 *   画面を作り直すと <input type="file"> も作り直されるので、
 *   えらんだ写真が ひとりでに消えていました。
 *   控えておけば、画面が作り直されても消えません。
 */
let nippoFiles = [];

async function nippoLoad(){
  try {
    const { data, error } = await db.from('nippo_scan')
      .select('id,work_date,state,note,rows_json,created_at,user_id')
      .order('created_at', { ascending: false }).limit(20);
    nippos = error ? [] : (data || []);
  } catch (e) { nippos = []; }
}

/** 写真を小さくして、文字（データURL）にします */
function nippoShrink(file){
  return new Promise(function (ok, ng){
    try {
      const fr = new FileReader();
      fr.onerror = function (){ ng(new Error('写真を読めませんでした')); };
      fr.onload = function (){
        const im = new Image();
        im.onerror = function (){ ng(new Error('写真を開けませんでした')); };
        im.onload = function (){
          try {
            const MAX = 1400;
            let w = im.width, h = im.height;
            if (w > MAX || h > MAX) {
              const k = MAX / Math.max(w, h);
              w = Math.round(w * k); h = Math.round(h * k);
            }
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            cv.getContext('2d').drawImage(im, 0, 0, w, h);
            ok(cv.toDataURL('image/jpeg', 0.75));
          } catch (e) { ng(e); }
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    } catch (e) { ng(e); }
  });
}

/**
 * えらんだ写真を、まとめて置きます（ご指摘・2026/11/16「複数選択ができません」）。
 * ★1枚ずつ置きます。1枚しくじっても、残りは置きます。
 * ★どこまで進んだかを出します（写真は小さくするのに時間がかかります）。
 */
async function nippoSend(files, date){
  const L = (files || []).filter(Boolean);
  if (!L.length) { bad('写真をえらんでください'); return; }
  let done = 0; const ng = [];
  for (let i = 0; i < L.length; i++) {
    nippoBusy = (L.length > 1 ? (i + 1) + '枚目／' + L.length + '枚　' : '') +
                '写真を小さくしています…';
    render();
    try {
      const img = await nippoShrink(L[i]);
      nippoBusy = (L.length > 1 ? (i + 1) + '枚目／' + L.length + '枚　' : '') + '置いています…';
      render();
      const { error } = await db.from('nippo_scan')
        .insert({ user_id: ME.user.id, work_date: date || today(), img: img, state: 'new' });
      if (error) {
        const m = String(error.message || '');
        ng.push(/relation|does not exist|schema cache/i.test(m)
          ? '日報の置き場が、まだ台帳にありません（少し待ってから、もう一度）'
          : jaError(error));
      } else done++;
    } catch (e) { ng.push(jaError(e)); }
  }
  nippoBusy = '';
  nippoFiles = [];                       /* 置き終わったので、控えを空にします */
  const el = $('#nipFile'); if (el) { try { el.value = ''; } catch (e) {} }
  try { await nippoLoad(); } catch (e) {}
  if (done && !ng.length) ok(done + '枚 置きました。読み終わるまで、3分ほどかかります');
  else if (done) bad(done + '枚 置きました。' + (L.length - done) + '枚は置けません（' + ng[0] + '）');
  else bad(ng[0] || '置けませんでした');
  render();
}

/** えらんだ行を、記録に足します */
async function nippoAdd(id){
  const x = nippos.filter(function (y){ return y.id === id; })[0];
  if (!x) return;
  let rows = [];
  try { rows = JSON.parse(x.rows_json || '[]') || []; } catch (e) { rows = []; }
  const put = [];
  rows.forEach(function (r, i){
    if (!nippoPick[id + ':' + i]) return;
    if (r.dep == null || r.fare == null) return;
    put.push({ user_id: ME.user.id, work_date: x.work_date,
      place: String(r.place || '').trim(),
      dep: +Number(r.dep).toFixed(2), wait_min: null, ride_min: null,
      fare: Number(r.fare),
      method: '', note: r.ticket ? 'チケット' : '' });
  });
  if (!put.length) { bad('足す行をえらんでください'); return; }
  try {
    const { error } = await db.from('rides').insert(put);
    if (error) { bad(jaError(error)); return; }
    await db.from('nippo_scan').update({ state: 'done' }).eq('id', id);
    nippoPick = {};
    await nippoLoad();
    await reload();
    ok(put.length + '件を記録に足しました');
  } catch (e) { bad(jaError(e)); }
}

function nippoRowsHTML(x){
  let rows = [];
  try { rows = JSON.parse(x.rows_json || '[]') || []; } catch (e) { rows = []; }
  if (!rows.length) return '<div class="empty">読み取れた行がありませんでした。</div>';
  const can = canDelSay({ user_id: x.user_id });
  return '<div class="scroll"><table><thead><tr>' +
    (can ? '<th class="n">足す</th>' : '') +
    '<th class="n">時刻</th><th>乗り場</th><th class="n">金額</th>' +
    '<th>つき合わせ</th></tr></thead><tbody>' +
    rows.map(function (r, i){
      const k = x.id + ':' + i;
      const bad2 = (r.dep == null || r.fare == null);
      return '<tr>' +
        (can ? ('<td class="n">' + (r.dup || bad2 ? '—' :
          '<input type="checkbox" data-nip="' + esc(k) + '"' +
          (nippoPick[k] ? ' checked' : '') + '>') + '</td>') : '') +
        '<td class="n">' + esc(String(r.time || '')) + '</td>' +
        '<td>' + (r.place ? esc(String(r.place)) : UNK) + '</td>' +
        '<td class="n">' + (r.fare == null ? UNK : yen(r.fare)) + '</td>' +
        '<td>' + (r.dup
          ? '<span class="nipdup">もう入っています' +
            (r.dup.place ? '（' + esc(r.dup.place) + '）' : '') + '</span>'
          : (bad2 ? '<span class="nipng">読めませんでした</span>'
                  : '<span class="nipnew">まだ入っていません</span>')) +
        '</td></tr>';
    }).join('') + '</tbody></table></div>' +
    (can ? '<div class="actions">' +
      '<button class="btn" data-nipadd="' + esc(x.id) + '">えらんだ分を記録に足す</button>' +
      '</div>' : '');
}

function paneNippo(){
  const head = leadCard('nippo') + `<div class="card"><h2>日報の写真を読み込む</h2>
    <p class="note">紙の日報を写した写真を置くと、1行ずつ読んで、
      いまの記録とつき合わせます。<b>読んだだけでは記録に入りません。</b>
      下の表で見てから【足す】を押してください。</p>
    <!-- ★営業日は、写真から読みます（ご質問・2026/11/17
           「複数選択できるようにするのに、なぜ営業日のしていを
             しなければいけないのですか？」）。
         何日分も まとめて置けるのに、営業日は1つしか指定できず、
         ほかの日のぶんが全部ずれていました。
         ここに入れた日は、写真から読めなかったときだけ使います。 -->
    <div class="filt"><div class="frow"><label>営業日</label>
      <input type="date" id="nipDate" value="${esc(today())}"></div></div>
    <p class="note">営業日は、<b>写真から読みます</b>。
      上の日づけは、写真に日付が無いときだけ使います。</p>
    <!-- ★複数えらべます。えらんだ写真は控えてあるので、
           画面が作り直されても消えません（ご指摘・2026/11/16）。 -->
    <div class="nippick">
      <label class="btn nipbtn" for="nipFile">写真をえらぶ（何枚でも）</label>
      <input type="file" id="nipFile" accept="image/*" multiple>
      <div class="nipsel">${nippoFiles.length
        ? esc(nippoFiles.length + '枚 えらびました：' +
            nippoFiles.map(f => f.name || '写真').join('、').slice(0, 60))
        : 'まだ えらんでいません'}</div>
    </div>
    <div class="actions"><button class="btn" id="nipSend"${nippoBusy ? ' disabled' : ''}>置く</button>
      ${nippoFiles.length ? '<button class="btn sub" id="nipClear">えらび直す</button>' : ''}
      ${nippoBusy ? '<span class="msg">' + esc(nippoBusy) + '</span>' : ''}</div>
    <p class="note">置いてから、読み終わるまで3分ほどかかります。
      このページを開き直すと、読めたものが出ます。</p>
    ${msgHTML('msgnip')}</div>`;
  if (!nippos.length) return head + emptyCard('まだ、置かれた写真はありません。');
  return head + nippos.map(function (x){
    const st = x.state === 'new' ? '読んでいます…'
             : x.state === 'done' ? '記録に入れました' : '読み終わりました';
    return '<div class="card"><h2>' + esc(fmtD(x.work_date || '')) + '　' + st + '</h2>' +
      (x.note ? '<p class="note">' + esc(String(x.note)) + '</p>' : '') +
      (x.state === 'new' ? '' : nippoRowsHTML(x)) + '</div>';
  }).join('');
}

/* ------------------------------------------------------------
 *  ふきだしに足す（ご指示・2026/11/14）
 *    「吹き出しに追加したい一言 みたいな検索枠も付けて
 *      自由にふやせるようにしてください」
 *
 *  ★足したものは、みんなの画面に出ます（台帳に入れています）。
 *  ★消せるのは、足した本人と まーく様だけです。
 *    画面のボタンだけでなく、台帳の側でも止めています。
 *  ★「ぼやき」と「ほめ」に分けて持ちます。
 *    交互に出す決まりを、こわさないためです。
 * ---------------------------------------------------------- */
let says = [];          /* 台帳から読んだ、足されたひとこと */
let sayText = '';       /* 入れかけの字（画面を作り直しても消えないように） */
let sayEdit = '';       /* 直している行（空なら、新しく足すところ） */

async function loadSays(){
  try {
    const { data, error } = await db.from('says')
      .select('id,text,good,user_id').order('created_at', { ascending: false }).limit(300);
    if (error || !data) return;          /* 棚がまだ無くても、黙って元のまま */
    /* 念のため、字の入っていない行は外します（混ざると空のふきだしが出ます） */
    says = data.filter(function (x){ return x && String(x.text || '').trim(); });
    /*
     * ★台帳が空のときは、はじめから入っているひとことを写します
     *   （ご指示・2026/11/14「既にある吹き出し内容の修正もできるように」）。
     *   写しておくと、はじめの分も あとから直せます。
     *   写すのは まーく様の画面だけです（何人も同時に写すと、二重に入ります）。
     */
    if (!says.length && ME.profile && ME.profile.is_admin
        && typeof SAY_BAD !== 'undefined') {
      const seed = SAY_BAD.map(function (t){ return { text: t, good: false, user_id: ME.id }; })
        .concat(SAY_GOOD.map(function (t){ return { text: t, good: true, user_id: ME.id }; }));
      try {
        const r2 = await db.from('says').insert(seed);
        if (!r2.error) {
          const again = await db.from('says')
            .select('id,text,good,user_id').order('created_at', { ascending: false }).limit(300);
          if (!again.error && again.data) says = again.data;
        }
      } catch (e2) {}
    }
    sayPush();
  } catch (e) {}
}
/* 読んだものを、ふきだしの係に渡します */
function sayPush(){
  try {
    if (typeof sayAddSet !== 'function') return;
    sayAddSet(says.filter(x => !x.good).map(x => x.text),
              says.filter(x =>  x.good).map(x => x.text));
  } catch (e) {}
}

function paneSays(){
  const max = (typeof SAY_MAX !== 'undefined') ? SAY_MAX : 14;
  const now = [...sayText].length;
  return `<div class="card" id="sayCard"><h2>ふきだしに ひとことを足す</h2>
    <p class="note">題の横のふきだしに出ます。足すと、みんなの画面にも出ます。
      ふきだしを押すと、ここへ来られます。</p>
    <div class="ktfind">
      <input class="ja" id="sayNew" maxlength="${max}"
        placeholder="吹き出しに追加したい一言" value="${esc(sayText)}">
    </div>
    <div class="chips">
      <button class="btn mini" id="sayAdd">${sayEdit ? '直す' : '足す'}</button>
      ${sayEdit ? '<button class="chip rst" id="sayCancel">やめる</button>' : ''}
    </div>
    <p class="note"><b id="sayLeft">${max - now}</b> 文字 入ります（${max}文字まで）。
      これより長いと、細い画面でおしりが切れます。</p>
    ${says.length ? `<div class="wlist">` + says.map(x =>
      `<div class="wli${sayEdit === x.id ? ' on' : ''}">` +
      `<span class="wp">${esc(x.text)}</span>` +
      (canDelSay(x)
        ? `<button class="mini" data-sayedit="${esc(x.id)}">直す</button>` +
          `<button class="mini del" data-saydel="${esc(x.id)}">消す</button>` : '') +
      `</div>`).join('') + `</div>`
      : '<div class="empty">まだ足されていません。</div>'}
    ${msgHTML('msgsay')}
  </div>`;
}
/* 消せるのは、足した本人と まーく様だけ */
function canDelSay(x){
  return !!(x && (x.user_id === ME.id || (ME.profile && ME.profile.is_admin)));
}

/*
 * ★「ほめ」か「ぼやき」かは、まーく様に選ばせません（ご指示・2026/11/13
 *     「ほめ、ぼやきとかはいりません」）。
 *   ただし、ふきだしは この2つを**交互に**出しています
 *   （「ネガティブばかりだと、嫌な気分になる」）。
 *   なので、いま少ないほうに入れて、釣り合いを保ちます。
 */
function sayAutoGood_(){
  const g = says.filter(x =>  x.good).length;
  const b = says.filter(x => !x.good).length;
  return g <= b;                         /* ほめが少なければ ほめに入れる */
}

async function sayAddNew(){
  const max = (typeof SAY_MAX !== 'undefined') ? SAY_MAX : 14;
  const t = String($('#sayNew') ? $('#sayNew').value : '').trim();
  if (!t) { bad('ひとことを書いてから押してください'); return; }
  /* ★字数は、実際に測って決めた数です（細い画面で切れない最大）。 */
  if ([...t].length > max) { bad('長すぎます。' + max + '文字までにしてください'); return; }
  if (says.some(x => x.text === t && x.id !== sayEdit)) {
    bad('同じひとことが、もう入っています'); return;
  }
  /* 直しているときは、入れ替えます（ご指示・2026/11/14） */
  if (sayEdit) { await sayUpdate(sayEdit, t); return; }
  try {
    const { error } = await db.from('says')
      .insert({ text: t, good: sayAutoGood_(), user_id: ME.id });
    if (error) {
      const m = String(error.message || '');
      bad(/relation|does not exist|schema cache/i.test(m)
          ? 'ふきだしの置き場が、まだ台帳にありません（少し待ってから、もう一度）'
          : jaError(error));
      return;
    }
    sayText = '';
    await loadSays();
    ok('足しました');
    render();
  } catch (e) { bad(jaError(e)); }
}

/* ★すでにあるひとことを、直します（ご指示・2026/11/14
     「既にある吹き出し内容の修正もできるようにしてください」）。 */
async function sayUpdate(id, t){
  try {
    const { error } = await db.from('says')
      .update({ text: t }).eq('id', id);   /* 区分は そのまま残す */
    if (error) { bad(jaError(error)); return; }
    sayEdit = ''; sayText = '';
    await loadSays();
    ok('直しました');
    render();
  } catch (e) { bad(jaError(e)); }
}

async function sayDel(id){
  try {
    const { error } = await db.from('says').delete().eq('id', id);
    if (error) { bad(jaError(error)); return; }
    await loadSays();
    ok('消しました');
    render();
  } catch (e) { bad(jaError(e)); }
}

/* ---- 書き出し・取り込み（「記録」の下に出します） ---- */
function paneOut(){
  return `<div class="card"><h2>記録を書き出す（CSV）</h2>
    <p class="note">いま出している${onlyMine?'自分の':'全員の'}記録を、CSVに書き出します。スプレッドシートで数えたいときや、控えを残したいときに使ってください。</p>
    <div class="actions">
      <button class="btn ghost" id="csvout">CSVを書き出す</button>
      <button class="btn ghost" id="copy">クリップボードにコピー</button>
      ${msgHTML('msg2')}
    </div>
  </div>`;
  /*
   * ★「スプレッドシートから取り込む」は、画面から外しました
   *   （ご指示・2026/11/16
   *     「スプシは、URLから自動読み込み問題なくできてるなら、
   *       スプシから読み込むという見出しや内容は非表示にしてください」）。
   *
   *   毎朝7時台に、GASが ひとりでに移しています。
   *   ドライブの「おつかいの控え.txt」で、そのたびの結果が残っています
   *   （11/14・11/15・11/16 とも「読めない 0件」でした）。
   *   同じことを手でもできる形にしておくと、二重に入る元になります。
   *
   * ★係（paneImport）は消していません。
   *   自動が止まったときに、1行 呼び出すだけで戻せます。
   *   いまの様子は【仕組みの様子】の「スプシから台帳へ」で見られます。
   */
}

/* ---- 取り込み（スプレッドシートから一括）
       ★いまは画面に出していません（上の paneOut のコメント） ---- */
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
        /* ★新着の赤い丸も、ここに持ってきます（ご指示・2026/11/16
             「三を開いた時にも、新着が赤丸ついてないと、
               どれが新着なのか分かりません」）。
           上のタブは画面から外してあるので、ここに出さないと気づけません。 */
        const dt = b.querySelector('.dot');
        const nd = (dt && !dt.hidden) ? '<span class="dot"></span>' : '';
        return '<button class="fsrow ' + (t === tab ? 'on' : '') + '" data-go="' + t + '">' +
               '<b>' + nd + esc(nm) + '</b><i>' + esc(sb) + '</i></button>';
      }).join('') +
        /* ★【仕掛けを起こす】は、いつでも ここから押せます
             （ご指示・2026/11/13「スプシにおいても色々やらないといけないの面倒」）。
             押すと、GASの受け口が開いて 自動で直ります。 */
        /* ★「みんなの記録」も、ここから開けます（ご質問・2026/11/13
             「このみんなの記録、とても良い感じですが
               webサイトにはそのページは載らないのですか？」）。
           同じ中身を2つ持つと、直すたびに2か所 直すことになり、
           いつか片方が古いまま残ります。だから作り直さず、
           ここから1回で開ける形にしました。
           開いたついでに、止まっている仕掛けも自動で直ります。 */
        ((gasInfo && gasInfo.exec)
          ? '<a class="fsrow" href="' + esc(gasInfo.exec) + '" target="_blank" rel="noopener">' +
            '<b>みんなの記録</b><i>記録カード・ロング（別のページが開きます）</i></a>' +
            /* ★【仕掛けを起こす】は、まーく様だけ（ご質問・2026/11/14）。
                 仕組みの手当てなので、乗務員の方々には出しません。 */
            ((ME.profile && ME.profile.is_admin)
              ? '<a class="fsrow wake" href="' + esc(gasInfo.exec) + '" target="_blank" rel="noopener">' +
                '<b>仕掛けを起こす</b><i>止まったときに押す（別のページが開きます）</i></a>'
              : '')
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
    /* ★右下の固定ボタンは、いったん出しません（ご指示・2026/11/16
         「また、右下の固定ボタンは一旦取り除いてください」）。
       data-off を外せば、そのまま戻ります。 */
    a.hidden = a.hasAttribute('data-off') || (tab !== 'in');
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
  snoteFit();
  /* ★横にしたとき・画面の広さが変わったときも、はみ出さないように
       もう一度 合わせ直します（1回だけ付けます）。 */
  if (!window.__fitWired) {
    window.__fitWired = true;
    window.addEventListener('resize', function (){
      try { const e = $('#sub'); if (e) subFit(e); placeChipsFit(); snoteFit(); } catch (e2) {}
    });
    /* ★字の形（フォント）は、あとから届きます。
         届く前に測ると、幅を小さく見あやまって、
         届いたとたんに おしりが「…」で切れます。
         実際に 320px の機種で切れていました（2026/11/13）。 */
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function (){
          try { const e = $('#sub'); if (e) subFit(e); placeChipsFit(); snoteFit(); } catch (e2) {}
        });
      }
    } catch (e3) {}
  }
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
/* はじめから たたんでおく欄（ご指示・2026/11/16）。見出しの字で見分けます */
const FOLD_SHUT = ['このページを見てわかること'];
const FOLD_OPEN_KEY = 'tn_fold_open';
let foldOpen = (function (){
  try { return JSON.parse(localStorage.getItem(FOLD_OPEN_KEY) || '[]') || []; }
  catch (e) { return []; }
})();
/* 目次そのものを たたんでいるか（高さを食わせないため） */
const TOC_KEY = 'tn_toc_fold';
/*
 * ★目次は、はじめから たたんでおきます（ご指示・2026/11/16
 *     「目次とこのページを見てわかることは、デフォルトは折りたたんでください」）。
 *   いちど開けば、その端末は開いたままを覚えます（'0' が入ります）。
 */
function tocFolded(){
  try { return localStorage.getItem(TOC_KEY) !== '0'; } catch (e) { return true; }
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
      /*
       * ★「このページを見てわかること」は、はじめから たたんでおきます
       *   （ご指示・2026/11/16
       *     「目次とこのページを見てわかることは、デフォルトは折りたたんでください」）。
       *   いちど開けば、その端末は開いたままを覚えます
       *   （開いた印を FOLD_OPEN に入れます）。
       */
      const def = (FOLD_SHUT.indexOf(k) !== -1) && foldOpen.indexOf(k) === -1;
      card.classList.toggle('fold', def || foldSet.indexOf(k) !== -1);
      h.style.cursor = 'pointer';
      h.onclick = function () {
        const on = !card.classList.contains('fold');
        card.classList.toggle('fold', on);
        const i2 = foldSet.indexOf(k);
        if (on && i2 === -1) foldSet.push(k);
        if (!on && i2 !== -1) foldSet.splice(i2, 1);
        /* はじめから たたんである欄は、開いたことも覚えます */
        if (FOLD_SHUT.indexOf(k) !== -1) {
          const i3 = foldOpen.indexOf(k);
          if (!on && i3 === -1) foldOpen.push(k);
          if (on && i3 !== -1) foldOpen.splice(i3, 1);
          try { localStorage.setItem(FOLD_OPEN_KEY, JSON.stringify(foldOpen)); } catch (e) {}
        }
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
  /* ★隠している場所の見出しは、目次にも出しません（ご指摘・2026/11/13
       「過去の記録は記録ページのみで良いと言いましたよね？
         なんで他のページにも残ったままなのでしょうか」）。
       画面からは消えていましたが、目次にだけ名前が残っていました。 */
  const hs = [...document.querySelectorAll('#panesTop .card > h2, #ktop > h2, #panes .card > h2')]
    .filter(function (h) { return !h.closest('[hidden]'); });

  /* 見出しが1つしかない画面では、目次は出しません（かえって邪魔になります） */
  if (hs.length < 2) return;
  hs.forEach(function (h, i) { if (!h.id) h.id = 'sec' + i; });
  const nav = document.createElement('div');
  nav.className = 'toc' + (tocFolded() ? ' fold' : '');
  nav.id = 'toc';
  nav.innerHTML =
    '<button class="toch" id="tocH">目次<em>タップで移動します</em>' +
      '<i class="fmark">▼</i></button>' +
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
  /* 「乗り場別 オススメ時間帯」の乗り場えらび */
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
  if (tab === 'hot') radarBoot(); else radarStop();
  /* ピンの地図も、その画面にいるときだけ組み立てます */
  if (tab === 'map') mapBoot(); else mapStop();
  /* 日報の画面を開いたら、置いた写真の様子を読み直します */
  if (tab === 'nippo' && !nippoBusy && !nippos.length) nippoLoad().then(render);
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
  /* 地図の 時間帯と金額のえらび */
  document.querySelectorAll('[data-mh]').forEach(function (b) {
    b.onclick = function () { mapHour = b.dataset.mh; mapStop(); render(); };
  });
  document.querySelectorAll('[data-mf]').forEach(function (b) {
    b.onclick = function () { mapMin = +b.dataset.mf; mapStop(); render(); };
  });
  /* グラフの形のえらび（表／横棒／折線）。1ページにまとめたので、ここで切り替えます */
  if ($('#spotBtn')) $('#spotBtn').onclick = function (){
    spotSet(!spotOn); mapStop(); render();
  };
  document.querySelectorAll('[data-gk]').forEach(function (b) {
    b.onclick = function () { gKindSet(b.dataset.gk); render(); };
  });
  /* ★えらんだ写真を、すぐ控えます。
       画面が作り直されても、えらんだものが消えないようにするためです。 */
  /* ★表の見出しを押すと、その欄で並べ直します（ご指示・2026/11/16） */
  document.querySelectorAll('[data-sort]').forEach(function (b){
    b.onclick = function (){ tblSortSet(b.dataset.sort); render(); };
  });
  if ($('#tblFilBtn')) $('#tblFilBtn').onclick = function (){
    tblFilOpen = !tblFilOpen; render();
  };
  if ($('#tblFilClr')) $('#tblFilClr').onclick = function (){
    tblFil = {};
    try { localStorage.setItem(TBL_FIL_KEY, '{}'); } catch (e) {}
    render();
  };
  if ($('#tblSortNew')) $('#tblSortNew').onclick = function (){
    tblSort = { k: 'made', d: -1 };
    try { localStorage.setItem(TBL_SORT_KEY, JSON.stringify(tblSort)); } catch (e) {}
    render();
  };
  /* ★絞り込みの欄。打つたびに作り直すと字が消えるので、
       打ち終わり（change）と、間を置いてから（input）動かします。 */
  document.querySelectorAll('[data-fil]').forEach(function (el){
    el.oninput = function (){
      clearTimeout(el._t);
      el._t = setTimeout(function (){
        const k = el.dataset.fil, v = el.value;
        tblFilSet(k, v);
        render();
        /* 作り直したあとも、打っていた欄にカーソルを戻します */
        const again = document.querySelector('[data-fil="' + k + '"]');
        if (again) { try { again.focus();
          again.setSelectionRange(again.value.length, again.value.length); } catch (e) {} }
      }, 450);
    };
  });
  if ($('#nipFile')) $('#nipFile').onchange = function (){
    nippoFiles = [...(this.files || [])];
    render();
  };
  if ($('#nipClear')) $('#nipClear').onclick = function (){
    nippoFiles = [];
    const el = $('#nipFile'); if (el) { try { el.value = ''; } catch (e) {} }
    render();
  };
  if ($('#nipSend')) $('#nipSend').onclick = function (){
    const d = $('#nipDate');
    /* 控えが空でも、えらんだ直後なら input から拾えます（取りこぼしを防ぎます） */
    const el = $('#nipFile');
    const L = nippoFiles.length ? nippoFiles : [...((el && el.files) || [])];
    nippoSend(L, d ? d.value : '');
  };
  document.querySelectorAll('[data-nip]').forEach(function (b) {
    b.onclick = function (){ nippoPick[b.dataset.nip] = b.checked; };
  });
  document.querySelectorAll('[data-nipadd]').forEach(function (b) {
    b.onclick = function (){ nippoAdd(b.dataset.nipadd); };
  });
  document.querySelectorAll('[data-tk]').forEach(function (b) {
    b.onclick = function () { tokKindSet(b.dataset.tk); render(); };
  });
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
   * ★絞り込みは、ぜんぶプルダウンになりました（ご指示・2026/11/17）。
   *   えらんだ瞬間に、画面ぜんたいが そのぶんだけになります。
   * ★エリアをえらんだら、中分類と乗り場の指定は外します。
   *   どちらも効かせると、どちらで絞ったのか分からなくなるためです。
   */
  document.querySelectorAll('[data-fs]').forEach(function (el) {
    el.onchange = function () {
      grab();
      const k = el.dataset.fs, v = String(el.value || '');
      if (k === 'mine') onlyMine = (v === '1');
      if (k === 'day')  onlyDay  = v;
      if (k === 'cat')  { onlyCat = v; onlyPlace = ''; }
      if (k === 'big')  { onlyBig = v; onlyCat = ''; onlyPlace = ''; }
      filtSave(); render();
    };
  });
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
  /* ★「乗り場別 オススメ時間帯」の字で探す欄（ご指示・2026/11/13） */
  document.querySelectorAll('[data-pick]').forEach(function (inp) {
    const box = document.getElementById(inp.dataset.pick);
    if (!box) return;
    inp.addEventListener('input', function () {
      const q = pkey(inp.value);
      if (!q) { box.innerHTML = ''; return; }
      const names = [...new Set(records.map(r => r.place).filter(Boolean))];
      const hit = names.filter(n => pkey(n).indexOf(q) !== -1)
        .map(n => ({ n: n, c: records.filter(r => r.place === n).length }))
        .sort((a, b) => b.c - a.c).slice(0, 10);
      box.innerHTML = hit.length
        ? hit.map(o => '<button class="chip" data-bp="' + esc(o.n) + '">' +
            esc(o.n) + '<span class="cnt">' + o.c + '</span></button>').join('')
        : '<span class="note">見つかりません</span>';
      box.querySelectorAll('[data-bp]').forEach(function (b) {
        b.onclick = function () { bestPlace = b.dataset.bp; render(); };
      });
    });
  });
  /* ★「乗り場をえらぶ」のタグを、字でしぼります（ご指示・2026/11/13）。
       画面を作り直すと打っている途中で指が離れるので、
       タグを隠したり出したりするだけにします。 */
  /*
   * ★さがす欄は、プルダウンの中身をしぼります（ご指示・2026/11/17）。
   *   タグを隠していたころと同じ考え方です。打った字が入っている
   *   乗り場だけが、プルダウンに残ります。
   *   ★いまえらんでいるものは、字に合わなくても残します
   *     （消えると、何でしぼっているのか分からなくなるため）。
   */
  document.querySelectorAll('[data-filt-sel]').forEach(function (inp) {
    const sel = document.getElementById(inp.dataset.filtSel);
    if (!sel) return;
    inp.addEventListener('input', function () {
      const q = pkey(inp.value);
      [...sel.options].forEach(function (o) {
        if (!o.value) return;                       /* 「すべて」は いつも出す */
        const nm = String(o.textContent || '').replace(/（\d+件）$/, '');
        o.hidden = !!q && !o.selected && pkey(nm).indexOf(q) === -1;
      });
    });
  });
  const scs = document.getElementById('scpSel');
  if (scs) scs.onchange = function () {
    grab();
    const v = String(scs.value || '');
    scPicks = v ? [v] : [];
    scPicksSave(); render();
  };
  document.querySelectorAll('[data-filt-chip]').forEach(function (inp) {
    const box = document.getElementById(inp.dataset.filtChip);
    if (!box) return;
    inp.addEventListener('input', function () {
      const q = pkey(inp.value);
      box.querySelectorAll('.chip').forEach(function (b) {
        if (b.classList.contains('rst')) return;
        const nm = String(b.textContent || '').replace(/\d+$/, '');
        b.hidden = !!q && pkey(nm).indexOf(q) === -1;
      });
    });
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
  /*
   * ★ふきだしを押すと、足す所へ来られます（ご質問・2026/11/14
   *     「ふきだし追加したい時のやつ、どこにあるんですか？」）。
   *   【記録】の一番下にあって、探さないと見つかりませんでした。
   *   ふきだしそのものが入口なら、迷いようがありません。
   */
  const sm = $('#saymount');
  if (sm && !sm._sayGo) {
    sm._sayGo = true;
    sm.style.cursor = 'pointer';
    sm.setAttribute('title', 'ふきだしに足す');
    sm.onclick = function () {
      grab(); tab = 'in'; tabSave(); msg = ''; render();
      setTimeout(function () {
        const c = document.getElementById('sayCard');
        if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const i = document.getElementById('sayNew');
        if (i) i.focus();
      }, 60);
    };
  }
  /* ふきだしに足す（ご指示・2026/11/14） */
  const sn = $('#sayNew');
  if (sn) {
    sn.oninput = function (){
      sayText = sn.value;
      /* 残りの字数を、そのたびに出します（押してから怒られないように） */
      const max = (typeof SAY_MAX !== 'undefined') ? SAY_MAX : 14;
      const el = $('#sayLeft');
      if (el) el.textContent = String(max - [...sayText].length);
    };
  }
  if ($('#sayAdd')) $('#sayAdd').onclick = sayAddNew;
  document.querySelectorAll('[data-saydel]').forEach(function (b){
    b.onclick = function (){ sayDel(b.dataset.saydel); };
  });
  /* 直す（ご指示・2026/11/14）。押すと、その字が枠に入ります */
  document.querySelectorAll('[data-sayedit]').forEach(function (b){
    b.onclick = function (){
      const x = says.filter(function (y){ return y.id === b.dataset.sayedit; })[0];
      if (!x) return;
      sayEdit = x.id; sayText = x.text;
      render();
      const i = $('#sayNew'); if (i) { i.focus(); i.select(); }
    };
  });
  if ($('#sayCancel')) $('#sayCancel').onclick = function (){
    sayEdit = ''; sayText = ''; render();
  };
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

  return leadCard('news') + '<div class="card"><h2>使い方</h2>' +
    '<p class="note">知りたい所だけ読めば大丈夫です。いま動いているのは <b>' +
    esc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') + '</b> です。</p>' +
    '<div class="gwrap">' + cards + '</div></div>' +
    '<div class="card"><h2>お知らせ</h2>' + (news || '<div class="note">まだありません。</div>') +
    '<div class="actions">' +
    '<a class="btn ghost" href="/say" target="_blank" rel="noopener" style="text-decoration:none">' +
    'ひとことを、すべて見る</a></div></div>';
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

async function loadEv(quiet){
  try {
    const res = await fetch('data/events.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('status ' + res.status);
    evData = await res.json();
  } catch (e) { evData = { at:'', days:[] }; }
  /* ★【更新】から呼ばれたときは、まん中の箱を出しません（ご指示・2026/11/13
       「天気の更新の時にポップアップのイベント表示が出るのはおかしいので、
         天気の更新の際にポップアップを出すのはやめてください」）。
       押したのは天気の取り直しなので、イベントの箱が出ると邪魔になります。 */
  if (!quiet) evBoot(); else evDotOnly_();
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
  /* ★言い方は、会場に合わせます（2026/11/17）。
       USJは「開演・終演」ではなく「開園・閉園」です。
       ホールの言い方をそのまま当てると、別のものに見えます。 */
  const sw = esc(String(x.sk || '開演'));
  const ew = esc(String(x.ek || '終演'));
  const st  = x.s ? (esc(x.s) + ' ' + sw) : (sw + ' 不明');
  const end = x.e ? (ew + ' ' + esc(x.e) + (x.g ? '（予定）' : '')) : (ew + ' 不明');
  const dim = (!x.s && !x.e) ? ' evnone' : '';
  /* ★細い機種（320px）で「終演 21:00（予」「定）」と割れていました
       （2026/11/17）。ひとかたまりずつ、途中で折れないようにします。
     折り返すのは「開演」と「終演」のあいだだけになります。 */
  return '<div class="evgo' + dim + '">🎬 <span class="evgo1">' + st +
         '</span>　／　<span class="evgo1">' + end + '</span></div>';
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
  /* ★行を分けず、下の【くわしく見る】【地図】と同じ1行に並べます
       （ご指摘・2026/11/14「高さの隙間が広すぎる」）。
       1件につき1行 減るので、1画面に入る件数が増えます。 */
  return (who ? '<span class="evwho">🎤 ' + esc(who) + '</span>' : '') +
    links.map(y => '<a class="mini" href="' + esc(y.u) + '" target="_blank" rel="noopener">' +
      esc(y.l) + '</a>').join('');
}

/*
 * @param {boolean} slim  ふきだし（開いた瞬間に出る箱）で呼ぶときは true。
 *   ★ご指示・2026/11/17
 *     「ポップアップでの表示では、イベント数が見たいのがマストなので
 *       詳細は省き　詳細はページ内だけにしてください」
 *   箱は「何件あるか・どこで・何時か」を一目で見るためのものです。
 *   客層・話のタネ・席数・リンクまで入れると、
 *   1件で画面が埋まって、肝心の件数が見えなくなります。
 */
function evRows(day, slim){
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
      evCards(rows, slim) + '</div>';
  });
  return out + evHidNote(sp.hid);
}

/** 1件ずつの札（slim のときは、くわしいこととリンクを出しません） */
function evCards(list, slim){
  return list.map(x => `<div class="evrow">
    <!-- ★種類は、上の大きな見出しに出しています（ご指示・2026/11/13）。
           ここでくり返すと、字が増えるだけです。 -->
    <div class="evhead">${esc(x.v || '')}</div>
    ${evTimeLine(x)}
    <div class="evt">${esc(x.t || '')}</div>
    ${x.a ? `<div class="evsub">🚕 着ける目安：${esc(x.a)}</div>` : ''}
    ${x.r ? `<div class="evsub">${esc(x.r)}</div>` : ''}
    ${slim ? '' : evDetail(x) + `<div class="evlinks evart">
      ${evArtHTML(x)}
      ${x.u ? `<a class="mini" href="${esc(x.u)}" target="_blank" rel="noopener">くわしく見る</a>` : ''}
      <a class="mini" href="${esc(mapUrl(x.v || ''))}" target="_blank" rel="noopener">📍 地図</a>
    </div>`}
  </div>`).join('');
}

/* ------------------------------------------------------------
 *  1件ずつの くわしいこと（ご依頼・2026/11/16）
 *
 *  ★まーく様のご依頼
 *    「イベント情報ですが、ポップアップではなく、ページ内であれば
 *      アーティスト情報や、客層、客数など
 *      もっとタクシーに必要となる詳細データを、載せて分かりやすく
 *      してもらえませんか？」
 *
 *  ★出すのは4つ。どれも「何をもとにした数か」が言えるものだけです。
 *    ・満席なら … 会場が公表している席数。**その日 何人来るかではありません**
 *    ・客層 … 見当です。そう書きます
 *    ・話のタネ … 車内での話の種
 *    ・ひかえる … 触れない方がよいこと
 *  ★台数の目安は出しません（ご判断・2026/10/16）。
 *  ★無いものは、その行ごと出しません。
 * ---------------------------------------------------------- */
function evDetail(x){
  const rows = [];
  if (x.cap > 0) {
    rows.push(['満席なら', Number(x.cap).toLocaleString('ja-JP') + '人' +
      '<i class="evnote">会場の席数です。その日の人数ではありません</i>', 'cap']);
  }
  if (x.au) rows.push(['客層', esc(String(x.au)) + '<i class="evnote">見当です</i>', 'au']);
  if (x.kn) rows.push(['話のタネ', esc(String(x.kn)), 'kn']);
  if (x.av) rows.push(['ひかえる', esc(String(x.av)), 'av']);
  if (!rows.length) return '';
  return '<div class="evdet">' + rows.map(function (r){
    return '<div class="evdr ' + r[2] + '"><b>' + r[0] + '</b><span>' + r[1] + '</span></div>';
  }).join('') + '</div>';
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
  return leadCard('ev') + `<div class="card"><h2>${evTitleHTML(d)}</h2>
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
  return leadCard('fb') + `<div class="card"><h2>フィードバック</h2>
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
  /* ★「もう表示しない」にしたら、赤い丸も消します（ご指示・2026/11/16
       「もう表示しないにチェックした場合は、赤丸も消してください」）。
     出さないと決めたものに印が付いたままだと、見落としたように見えます。 */
  evSeeToday();
}

/* ------------------------------------------------------------
 *  イベントの「見た」を、その夜のぶんだけ覚えます
 *  （ご指示・2026/11/16「新着の赤丸は、その日に1回確認(既読)したら、
 *    もう赤丸は付けないでください」）
 *
 *  ★前は、催しが1件でもあれば いつでも赤い丸が出ていました。
 *    開き直すたびに付き直すので、見たのかどうか分かりませんでした。
 *  ★日が変わると（夜のくくりが変わると）、また出ます。
 * ---------------------------------------------------------- */
const EV_SEEN_KEY = 'tsukemachi.ev.seen';
function evSeenToday(){
  try { return localStorage.getItem(EV_SEEN_KEY) === evNight(); } catch (e) { return false; }
}
function evSeeToday(){
  try { localStorage.setItem(EV_SEEN_KEY, evNight()); } catch (e) {}
  const d = document.getElementById('evDot');
  if (d) d.hidden = true;
  menuDot();
}
/* 箱は出さず、赤い点だけを付け直します（【更新】のとき） */
function evDotOnly_(){
  try {
    const d = evToday();
    const n = (d && d.list) ? d.list.length : 0;
    const dot = document.getElementById('evDot');
    if (dot) dot.hidden = !n || evSeenToday();
    menuDot();
  } catch (e) {}
}
function evBoot(){
  try {
    const d = evToday();
    const n = (d && d.list) ? d.list.length : 0;
    const dot = document.getElementById('evDot');
    if (dot) dot.hidden = !n || evSeenToday();
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
    <div class="modalbody">${evRows(d, true)}</div>
    <p class="note">くわしいことは【イベント】の画面で見られます。</p>
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
  /* ★題の下の一文は「開き直すたびに切り替わる」ので、ここで1つ進めます
       （ご指示・2026/11/15「更新する度に切り替わる形で良いです」）。 */
  lordSeqInit();
  await gasLoad();
  await loadEv();
}
if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLoad);
  else bootLoad();
}
