/**
 * マニュアルのスプシ（008-Manual.gs）を確かめる。
 *   実行: node gas/test/manual.test.js
 *
 * ★なぜこれが要るのか
 *   手順書を .md で置いていましたが、スマホで開くと
 *   字が小さく・横に流れ・表が崩れて、読めたものではありませんでした。
 *   見られないところに書いても、無いのと同じです。
 *
 *   スプシに移したので、こんどは
 *   「タブの名前が長くて探せない」「作り直したら古い説明が残った」
 *   といった、スマホで効いてくるところを見ます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);

let props = {};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; },
  getProperties: () => Object.assign({}, props) }) };

/* ---- 偽のスプシ ---- */
function mkSheet(name) {
  const sh = {
    _name: name, _vals: [], _widths: {}, _fmt: [], _merged: [], _cleared: 0,
    getName: () => sh._name,
    clear: () => { sh._vals = []; sh._fmt = []; sh._merged = []; sh._cleared++; return sh; },
    clearNotes: () => sh,
    setColumnWidth: (c, w) => { sh._widths[c] = w; return sh; },
    autoResizeRows: () => sh,
    setFrozenRows: () => sh,
    getRange: (r, c, nr, nc) => mkRange(sh, r, c, nr || 1, nc || 1),
    getLastRow: () => sh._vals.length,
    setName: n => { sh._name = n; return sh; },
    // ★写し先のスプシに、同じ中身のタブを1枚ふやす
    copyTo: dest => {
      if (sh._noCopy) throw new Error('写せません');
      const c = mkSheet(sh._name + ' のコピー');
      c._vals = sh._vals.slice();
      dest._add(c);
      return c;
    }
  };
  return sh;
}
function mkRange(sh, r, c, nr, nc) {
  const rg = {
    getValues: () => {
      const out = [];
      for (let i = 0; i < nr; i++) {
        const row = sh._vals[r - 1 + i] || [];
        out.push(row.slice(c - 1, c - 1 + nc));
      }
      return out;
    },
    // ★書き込む場所（行・列）を守ります。
    //   まるごと入れ替える作りにすると、書き足しの試験になりません
    setValues: v => {
      v.forEach((row, i) => {
        const y = r - 1 + i;
        if (!sh._vals[y]) sh._vals[y] = [];
        row.forEach((val, j) => { sh._vals[y][c - 1 + j] = val; });
      });
      return rg;
    },
    setValue: () => rg,
    clear: () => rg,
    merge: () => { sh._merged.push(r + ':' + c + 'x' + nc); return rg; },
    setWrap: v => { sh._fmt.push({ r: r, k: 'wrap', v: v }); return rg; },
    setVerticalAlignment: () => rg,
    setHorizontalAlignment: () => rg,
    setFontSize: () => rg,
    setFontFamily: () => rg,
    setFontColor: () => rg,
    setFontWeight: v => { sh._fmt.push({ r: r, k: 'bold', v: v }); return rg; },
    setBackground: v => { sh._fmt.push({ r: r, k: 'bg', v: v }); return rg; }
  };
  return rg;
}
const books = {};
function mkBook(id, name) {
  const sheets = [mkSheet('シート1')];
  const ss = {
    _id: id, _name: name,
    getId: () => id,
    getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
    getSheets: () => sheets.slice(),
    getSheetByName: n => sheets.filter(s => s._name === n)[0] || null,
    insertSheet: n => { const s = mkSheet(n); sheets.push(s); return s; },
    _add: s => { sheets.push(s); return s; },
    deleteSheet: s => { const i = sheets.indexOf(s); if (i >= 0) sheets.splice(i, 1); },
    setActiveSheet: s => { ss._active = s; return s; },
    moveActiveSheet: pos => {
      const s = ss._active; if (!s) return;
      const i = sheets.indexOf(s); if (i >= 0) sheets.splice(i, 1);
      sheets.splice(Math.max(0, pos - 1), 0, s);
    }
  };
  books[id] = ss;
  return ss;
}
let made = 0;
let active = null;
ctx.SpreadsheetApp = {
  create: n => mkBook('SSID' + (++made), n),
  openById: id => { if (!books[id]) throw new Error('開けません'); return books[id]; },
  getActiveSpreadsheet: () => active
};

let pushed = [], replied = [];
vm.runInContext('var pu = [], rep = [];', ctx);
ctx.lrPush_ = (to, msgs) => { pushed.push({ to: to, msgs: msgs }); };
ctx.lineReply_ = (tok, text) => { replied.push(String(text)); };
ctx.updMe_ = () => 'Umark';
ctx.updCodeVers_ = () => 'C059/U098';

/*
 * ★記録用スプシの開き方は、001-Code の mainSS_ にまとめてあります。
 *   ここは 001 を読み込まないので、同じ働きのものを置きます。
 *   本物と同じで「くっついていれば そのまま、離れていれば IDで開く」。
 */
vm.runInContext('function mainSS_(){' +
  ' try { var a = SpreadsheetApp.getActiveSpreadsheet(); if (a) return a; } catch (e) {}' +
  ' try { var id = PropertiesService.getScriptProperties().getProperty("MAIN_SS_ID");' +
  '       if (id) return SpreadsheetApp.openById(id); } catch (e) {}' +
  ' return null; }', ctx);

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '008-Manual.gs'), 'utf8'), ctx);
const F = n => vm.runInContext(n, ctx);

let ng = 0;
function t(cond, label, extra) {
  if (cond) { console.log('  ok   ' + label); return; }
  ng++; console.log('  NG   ' + label + (extra ? '  … ' + extra : ''));
}
function has(hay, needle, label) {
  t(String(hay).indexOf(needle) !== -1, label, String(hay).slice(0, 100));
}

console.log('\n■ タブの名前（スマホでいちばん効くところ）');
{
  const ss = F('mnBuild_')();
  const names = ss.getSheets().map(s => s.getName());
  t(names.join('／') === '目次／合図／満杯／読取／予定／困り／天気／客層',
    '★目次のとおりの並びになる（' + names.join('／') + '）', names.join('／'));

  /*
   * ★タブの名前は「絵文字なし・全角2文字以内」（決まりごと）。
   *   記録用スプシはタブが多く、長い名前や絵文字が混ざると、
   *   スマホではタブの行がすぐ埋まって、目当てのものを探せません
   */
  names.forEach(function (n) {
    t(n.length <= 2, '★「' + n + '」は全角2文字以内');
    t(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(n), '　 「' + n + '」に絵文字が無い');
  });

  t(names.indexOf('シート1') === -1, '★はじめにできる空のタブは残さない');
}

console.log('\n■ 作り直すたびに、まるごと入れ替える');
{
  /*
   * ★書き足す形にすると、直したはずの古い説明が下に残ります。
   *   どちらが正しいのか分からない手順書は、無いより たちが悪いです
   */
  const ss = F('mnBuild_')();
  const sh = ss.getSheetByName('満杯');
  const n1 = sh._cleared;
  const rows1 = sh._vals.length;
  F('mnBuild_')();
  t(sh._cleared > n1, '★毎回 まっさらにしてから書く');
  t(sh._vals.length === rows1, '　 行が増えていかない（' + sh._vals.length + '行）');
  t(Object.keys(books).length === 1, '★スプシを何個も作らない（1個を使い回す）');
}

console.log('\n■ 中身（読む人がいちばん知りたいところ）');
{
  const ss = F('mnBuild_')();
  const text = function (tab) {
    return ss.getSheetByName(tab)._vals.map(r => r.join(' ')).join('\n');
  };

  // 満杯のタブ
  const full = text('満杯');
  has(full, '[15] 古いデプロイを片づける', '★満杯：押すボタンを、番号と名前で書く');
  has(full, '3分以内', '　 2回目が要ることを書く');
  has(full, '使用中', '★満杯：使用中を残すことを、目で確かめさせる');
  has(full, 'この200枚は、こちらからは消せません',
      '★満杯：できないことを、できるように書かない');
  has(full, 'バージョン（版）', '★満杯：デプロイと版のちがいを説明する');
  has(full, 'デプロイ（公開）', '　 両方そろっている');
  has(full, '札（デプロイ）を消しても、写真（版）は減りません',
      '★満杯：片づけても版が減らないことを、先に書く');
  has(full, '[17] 版をドライブに保存する', '★満杯：消える前に写す手順を書く');
  has(full, '鍵の中身は、わざと書いていません', '★満杯：鍵を書き出さない理由を書く');
  /*
   * ★満杯のときは、LINEの受け口が古いコードのまま動きます。
   *   新しく足した合図は、いくら送っても届きません。
   *   「LINEで直してください」と書くのは、いちばん不親切です
   */
  has(full, 'LINEで「❗」と送っても、何も返ってきません',
      '★満杯：❗が効かないことを、先に書いておく');
  has(full, 'スプシのボタンからやってください',
      '★満杯：直し方は、いつでも効くスプシのほうへ案内する');
  t(full.indexOf('直し方：LINEで') === -1,
    '　 直し方としてLINEを案内しない', full.slice(0, 80));

  // 読取のタブ
  const read = text('読取');
  has(read, 'ニューオータニ', '★読取：会場の名前が出る');
  has(read, 'ワントゥワン', '　 もう1つの会場も');
  has(read, '一覧に日付が無いのが、正しい姿', '★読取：⚠️ が出ても異常ではないと書く');
  has(read, '開場', '★読取：開場と開演の取りちがえに注意させる');

  // 予定のタブ
  const plan = text('予定');
  has(plan, 'タクシーのリマインダー', '★予定：付ける名前を、そのまま書く');
  has(plan, '全角の縦棒', '★予定：半角と全角の取りちがえを、先に書く');
  has(plan, '許可', '★予定：はじめの1回だけ出る確認を、先に書く');

  // 合図のタブ
  const sign = text('合図');
  ['📈', '🎪', '📅', '📒', '📄', '☀️', '❌', '⏳', '❗', '❓'].forEach(function (e) {
    has(sign, e, '　 合図に ' + e + ' が載っている');
  });

  // 困りのタブ
  const help = text('困り');
  has(help, '[14] LINEの調子を調べる', '★困り：いちばん先に押すものを書く');

  // 目次のタブ（自分のひらき方が書いていないと、二度とたどり着けない）
  const toc = text('目次');
  has(toc, 'LINEで「📘」と送ると、URLが返ってきます',
      '★目次：このスプシの ひらき方を、自分の中に書いておく');
  has(toc, '[16] マニュアルを作り直す',
      '　 LINEが無反応のときの、ひらき方も');
  has(toc, '乗り場マップはレポートの材料ですが、移して大丈夫です',
      '★目次：移してよいかどうかを、理由つきで書く');

  /*
   * ★天気は「予報のままの日」と「実測で確かめた日」が混ざります。
   *   どこまで信じてよいかを書かないと、全部が実測だと思われます
   */
  const tk = text('天気');
  has(tk, '実測があれば実測を信じます', '★天気：予報より実測を信じると書く');
  has(tk, '気象庁（予報＋実測で確認）', '★天気：出所のらんの読み方を書く');
  has(tk, '☔️', '★天気：絵文字の意味を書く');
  has(tk, 'まだ足りていないこと', '★天気：足りないことも書く');
  has(tk, '風の強さは、取っていません', '　 何が無いのかを、はっきり書く');

  /*
   * ★Xは、ログインがあっても読めません。
   *   「できない」と はっきり書かないと、また聞かれます
   */
  const ky = text('客層');
  has(ky, 'まーくさんのログインがあっても、読めません',
      '★客層：Xはログインがあっても読めないと、はっきり書く');
  has(ky, '出典のらんが空の行は、資料に出しません',
      '★客層：いちばん大事な決まりを書く');
  has(ky, 'ぴあ総研', '★客層：どこから写せばよいかを書く');
  has(ky, 'Wikidata', '★客層：何なら取れるのかを書く');
  has(ky, '使わなかった理由', '★客層：調べて使わなかった先も書く');

  /*
   * ★「LINEで❗と送ってください」は、ややこしすぎました（ご指摘）。
   *   公開に失敗しているときは、その❗自体が返ってきません。
   *   ずれは その場では気づけないので、聞いてもらいます
   */
  has(full, '困ったら、クロちゃんに聞いてください',
      '★満杯：迷ったら聞いてもらう、と書く');
  has(help, 'クロちゃんに聞いたほうが、早く済みます',
      '★困り：ずれたときは聞いてもらう、と書く');
  has(help, 'にわとりが先か、たまごが先か',
      '　 どういうずれが起きるのかも書く');

  // 合図のタブに ⏰ が載っている
  has(sign, '⏰ 23:30', '★合図：⏰ の使い方を書く');
  has(sign, '⏰ やめ', '　 取り消し方も');
  /*
   * ★週の上限は、クロちゃんには見えません。
   *   けれど決まった曜日・時刻にリセットされるので、
   *   一度おしえれば、予想は要りません
   */
  has(sign, 'まいしゅう 月 2:00', '★合図：毎週の予約の書き方を出す');
  has(sign, '週の上限は見えません', '★合図：見えないものを、はっきり書く');
  /*
   * ★「上限を迎えたときにだけ鳴らしてほしい」（ご指摘）。
   *   毎週きまって鳴らすのは、上限に当たっていない週でも鳴ります
   */
  has(sign, '止まったときだけ鳴ります', '★合図：ふだんは鳴らないと書く');
  has(sign, '止まった時刻＋5時間', '★合図：再開時刻の決め方を書く');
}

console.log('\n■ 1行は、スマホで読める長さに収める');
{
  /*
   * ★べた書きの長い文は、細い画面では折り返しだらけになって、
   *   どこが1つのまとまりなのか分からなくなります（ご指摘）
   */
  const ss = F('mnBuild_')();
  // ★画面に出る文（URLなど）は、こちらで短くできないので外します
  let worst = '', worstN = 0;
  ss.getSheets().forEach(function (sh) {
    sh._vals.forEach(function (r) {
      const b = String(r[1] || '');
      if (/https?:\/\//.test(b)) return;
      if (b.length > worstN) { worstN = b.length; worst = b; }
    });
  });
  t(worstN <= 42, '★いちばん長い行でも42文字まで（' + worstN + '文字）', worst);
}

console.log('\n■ 手順には、かならず番号を振る');
{
  const ss = F('mnBuild_')();
  ['満杯', '読取', '予定'].forEach(function (tab) {
    const sh = ss.getSheetByName(tab);
    const nums = sh._vals.filter(function (r) { return /^[0-9]+$/.test(String(r[0])); });
    t(nums.length >= 3, '★「' + tab + '」に、番号つきの手順が3つ以上ある（' +
      nums.length + '個）');
  });
}

console.log('\n■ 📘 でURLを返す（作り直しはしない）');
{
  F('mnBuild_')();
  replied.length = 0;
  const n = Object.keys(books).length;
  t(F('mnHandleCmd_')({ message: { text: '📘' },
      source: { userId: 'Umark' }, replyToken: 'r' }) === true, '★「📘」を受ける');
  has(replied[0], 'https://docs.google.com/spreadsheets/', '★URLを返す');
  has(replied[0], '目次／合図／満杯／読取／予定／困り／天気／客層', '　 何のタブがあるかも返す');
  t(Object.keys(books).length === n,
    '★読むだけのときに、作り直さない（開いていたタブが目次に戻るため）');

  // ほかの人には返さない
  t(F('mnHandleCmd_')({ message: { text: '📘' },
      source: { userId: 'Uother' }, replyToken: 'r' }) === false, '★ほかの人には、返さない');

  // まだ作っていないときは、作り方を出す
  delete props['MN_MANUAL_SS'];
  Object.keys(books).forEach(function (k) { delete books[k]; });
  replied.length = 0;
  F('mnHandleCmd_')({ message: { text: 'マニュアル' },
    source: { userId: 'Umark' }, replyToken: 'r' });
  has(replied[0], '[16]', '★まだ無ければ、作り方（[16]）を出す');
}

console.log('\n■ [16] のボタン');
{
  props = {}; pushed.length = 0;
  Object.keys(books).forEach(function (k) { delete books[k]; });
  const out = String(F('panelManual')());
  has(out, '作り直しました', '★結果らんに、済んだと出る');
  has(out, 'https://docs.google.com/spreadsheets/', '　 URLも出る');
  t(out.split('\n').filter(function (x) { return x.indexOf('・') === 0; }).length >= 2,
    '★行の頭に「・」を付けて並べる（スマホで目が追えるように）', out);
  t(pushed.length === 1, '★LINEにもURLを送る（スマホでは押せるほうが早い）');
  has(pushed[0].msgs[0].text, 'https://docs.google.com/spreadsheets/', '　 LINEにもURL');
}


console.log('\n■ タブの引っ越し（まーくさんしか触らないタブを、こちらへ）');
{
  /*
   * ★記録用スプシはタブが多く、スマホではタブの行がすぐ埋まります。
   *   みんなが使うタブだけを残したいので、
   *   まーくさんしか触らないタブは、こちらへ移します。
   */
  const setup = function () {
    props = {}; Object.keys(books).forEach(k => delete books[k]);
    active = mkBook('REC', '記録用スプシ');
    active._add(mkSheet('設定'));
    active._add(mkSheet('🗺️乗り場マップ'));
    active._add(mkSheet('天気'));
  };

  setup();
  // 1回目は、何を移すか出るだけ
  const a1 = String(F('panelMoveTabs')());
  has(a1, 'まだ何もしていません', '★1回目は、何も移さない');
  has(a1, '設定', '　 何を移すか出る');
  has(a1, '🗺️乗り場マップ', '　 地図も');
  t(!!active.getSheetByName('設定'), '★1回目では、記録用スプシから消えていない');

  // 2回目で移る
  const a2 = String(F('panelMoveTabs')());
  has(a2, '移しました', '★2回目で移る');
  const book = books[props['MN_MANUAL_SS']];
  t(!!book.getSheetByName('設定'), '★マニュアル側に「設定」ができる');
  t(!!book.getSheetByName('🗺️乗り場マップ'), '★地図も');
  t(!active.getSheetByName('設定'), '★記録用スプシからは消える');
  t(!!active.getSheetByName('天気'), '★みんなが使うタブ（天気）は、そのまま残す');

  // もう一度押しても、こわれない
  const a3 = String(F('panelMoveTabs')());
  has(a3, '移すものがありません', '★2回やっても、こわれない');
}

console.log('\n■ 写せなかったものは、消さない');
{
  /*
   * ★「消えたのに、向こうにも無い」がいちばん困ります。
   *   写してから消す、写せなければ消さない、の順を守ります
   */
  props = {}; Object.keys(books).forEach(k => delete books[k]);
  active = mkBook('REC2', '記録用スプシ');
  const bad = mkSheet('設定');
  bad._noCopy = true;                       // 写すと失敗する
  active._add(bad);
  active._add(mkSheet('🗺️乗り場マップ'));

  F('panelMoveTabs')();                      // 1回目（見せるだけ）
  const r = String(F('panelMoveTabs')());    // 2回目
  t(!!active.getSheetByName('設定'),
    '★★写せなかったタブは、記録用スプシから消さない');
  has(r, 'できなかった', '★できなかったことを、はっきり出す');
  t(!active.getSheetByName('🗺️乗り場マップ'),
    '　 写せたほうは、ちゃんと移る');
}

console.log('\n■ 移す前でも、移したあとでも、同じように読める');
{
  /*
   * ★ここがいちばん大事なところです。
   *   移したせいで設定が読めなくなると、決まりごとが
   *   ぜんぶ初期値に戻って、黙っておかしな動きをします
   */
  props = {}; Object.keys(books).forEach(k => delete books[k]);
  active = mkBook('REC3', '記録用スプシ');
  active._add(mkSheet('設定'));

  // ① マニュアルのスプシを、まだ作っていない
  t(F('mnFindSheet_')('設定', null) !== null, '★作る前は、記録用スプシから読める');
  t(F('mnFindSheet_')('設定', null).getName() === '設定', '　 名前も合っている');

  // ② 移したあと
  F('panelMoveTabs')(); F('panelMoveTabs')();
  const got = F('mnFindSheet_')('設定', null);
  t(got !== null, '★移したあとも、ちゃんと読める');
  const book = books[props['MN_MANUAL_SS']];
  t(got === book.getSheetByName('設定'), '　 読む先が、マニュアル側に変わる');

  // ③ 名前を変えられてしまっても、地図は見つける
  props = {}; Object.keys(books).forEach(k => delete books[k]);
  active = mkBook('REC4', '記録用スプシ');
  active._add(mkSheet('地図'));
  const m = F('mnFindSheet_')('🗺️乗り場マップ', ['地図', 'マップ', 'map']);
  t(m !== null && m.getName() === '地図',
    '★名前を「地図」に変えられていても、見つける');

  // ④ どこにも無ければ null（呼んだ側で作れるように）
  t(F('mnFindSheet_')('そんなタブ', null) === null, '　 無ければ null');
}


console.log('\n■ 乗り場マップを移しても、レポートが困らないか');
/*
 * ★まーくさんからのご指摘です。
 *   「乗り場マップもレポート材料なのですが、移して大丈夫なのでしょうか」
 *
 * ★ほんとうに危ないのは「読めるかどうか」ではありません。
 *   読めないだけなら、リンクが付かないだけで済みます。
 *   危ないのは、移したことに気づかずに
 *   記録用スプシへ もう1枚 同じタブを作ってしまうことです。
 *   そうなると、貼ったリンクは向こうに、書き込みはこちらに、と
 *   二手に分かれて、どちらが本物か分からなくなります。
 */
{
  // 003-LineReport.gs から、地図まわりの2つだけを持ってくる
  const lr = fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8');
  const take = function (name) {
    const i = lr.indexOf('function ' + name + '(');
    if (i < 0) throw new Error(name + ' が見つかりません');
    // 次の「\nfunction 」または「\nconst 」までを切り出す
    let j = lr.length;
    ['\nfunction ', '\nconst ', '\n/**'].forEach(function (mark) {
      const k = lr.indexOf(mark, i + 10);
      if (k >= 0 && k < j) j = k;
    });
    return lr.slice(i, j);
  };
  vm.runInContext('var MAP_TAB = "🗺️乗り場マップ";', ctx);
  vm.runInContext('var MAP_HEAD = ["乗り場名", "リンク", "状態", "候補"];', ctx);
  vm.runInContext('function mapKey_(n){ return String(n).trim(); }', ctx);
  vm.runInContext('function dbHasPlace_(n){ return true; }', ctx);
  vm.runInContext('function mapUrlFor_(n){ return "https://maps.example/" + n; }', ctx);
  vm.runInContext(take('mapFindSheet_'), ctx);
  vm.runInContext(take('mapEnsureSheet_'), ctx);

  props = {}; Object.keys(books).forEach(k => delete books[k]);
  active = mkBook('REC5', '記録用スプシ');
  const src = mkSheet('🗺️乗り場マップ');
  src._vals = [['乗り場名', 'リンク', '状態', '候補'],
               ['梅田', 'https://maps.example/umeda', '登録ずみ', '']];
  active._add(src);

  // 移す前：記録用スプシから読める
  t(F('mapFindSheet_')(active) === src, '★移す前は、記録用スプシの表を読む');

  // 移す
  F('panelMoveTabs')(); F('panelMoveTabs')();
  const book = books[props['MN_MANUAL_SS']];
  const moved = book.getSheetByName('🗺️乗り場マップ');
  t(!!moved, '★マニュアル側に移っている');
  t(!active.getSheetByName('🗺️乗り場マップ'), '　 記録用スプシからは消えている');

  // 移したあと：レポートは、ちゃんと向こうを読む
  t(F('mapFindSheet_')(active) === moved,
    '★移したあとも、レポートは同じ表を読む（リンクは消えない）');
  t(moved._vals.length === 2, '　 貼ってあったリンクも、そのまま残っている');

  /*
   * ★ここが、いちばん危ないところです。
   *   レポートは、新しい乗り場が出てくるたびに表へ書き足します。
   *   そのとき記録用スプシに もう1枚 作ってしまうと、
   *   貼ったリンクは向こう、書き足しはこちら、と二手に分かれます
   */
  const before = active.getSheets().length;
  F('mapEnsureSheet_')(active, ['なんば', '天満']);
  t(active.getSheets().length === before,
    '★★記録用スプシに、同じタブをもう1枚 作らない');
  t(!active.getSheetByName('🗺️乗り場マップ'),
    '　 記録用スプシには、やはり無いまま');
  t(moved._vals.length > 2, '★新しい乗り場は、移したほうの表に書き足される');
}

console.log('\n■ バージョン');
{
  const src = fs.readFileSync(path.join(__dirname, '..', '008-Manual.gs'), 'utf8');
  const head = (src.match(/★★★\s+(M\d+ver)/) || [])[1] || '';
  t(head === vm.runInContext('MN_VERSION', ctx),
    '★先頭のバージョンと MN_VERSION が同じ（' + head + '）');
}

console.log(ng ? '\n✗ ' + ng + '件 失敗\n' : '\n✓ すべて通りました\n');
process.exit(ng ? 1 : 0);
