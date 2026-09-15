/**
 * C008ver で足した「スクショ取込」まわりを検証する。
 *   実行: node gas/test/opucha-image.test.js
 *
 * Code.gs をそのまま vm に流し込み、GAS のサービスは偽物で差し替える。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const ctx = { console };
vm.createContext(ctx);
const CtxDate = vm.runInContext('Date', ctx);

/* ---- 偽のシート（書き込みを覚えておく） ---- */
const written = {};      // タブ名 → 書かれた行の配列
function makeSheet(name, rows) {
  // データが始まる行。ふつうのタブは4行目から、「設定」タブは1行目から
  const base = (name === '設定') ? 1 : 4;
  const sh = {
    getName: () => name,
    getLastRow: () => base - 1 + rows.length,
    getMaxRows: () => 1000,
    insertRowsAfter: () => {},
    getRange: (r, c, nr, nc) => chain(name, rows, r, c, nr, nc, base),
    getRangeList: () => chain(name, rows),
    setRowHeights: () => {}, setRowHeightsForced: () => {},
    autoResizeColumns: () => {}, setColumnWidth: () => {},
    deleteRows: () => {}, insertRowsBefore: () => {}, sort: () => {},
    getFrozenRows: () => 3, setFrozenRows: () => {},
    getDataRange: () => chain(name, rows, base, 1, rows.length, 11, base),
    getMaxColumns: () => 11,
    getParent: () => ({ getSheetByName: n => TABS[n] ? makeSheet(n, TABS[n]) : null, toast: () => {} })
  };
  // 知らないメソッドは何もしない（本物のシートは山ほど持っているため）
  return new Proxy(sh, { get: (t, k) => (k in t ? t[k] : () => undefined) });
}
// 呼ばれても困らないよう、何を呼んでも自分を返す偽の Range
function chain(name, rows, r0, c0, nr, nc, base) {
  const B = base || 4;
  // 行・列の指定があればそのぶんだけ切り出す（本物と同じ形にする）
  const cut = () => (typeof r0 === 'number')
    ? rows.slice(r0 - B, r0 - B + (nr || 1)).map(x => x.slice(c0 - 1, c0 - 1 + (nc || 1)))
    : rows.map(x => x.slice());
  const put = v => {
    if (typeof r0 !== 'number' || typeof c0 !== 'number') {
      written[name] = (written[name] || []).concat(v);
      return;
    }
    const at = r0 - B;
    // 最終行より下に書くのは「追加」。テストから見えるように別に控えておく
    if (at >= rows.length) written[name] = (written[name] || []).concat(v);
    v.forEach((vr, i) => {
      while (rows.length <= at + i) rows.push(new Array(11).fill(''));
      vr.forEach((vv, j) => { rows[at + i][c0 - 1 + j] = vv; });
    });
  };
  const r = {
    getValues: cut,
    getValue: () => '',
    getDisplayValues: () => cut().map(x => x.map(String)),
    getNumRows: () => (nr || rows.length),
    getLastRow: () => 3 + rows.length,
    setValues: put
  };
  // 知らないメソッドを呼ばれても、つないで呼べるように自分（Proxy）を返す
  const px = new Proxy(r, { get: (t, k) => (k in t ? t[k] : () => px) });
  return px;
}
// 何を呼んでもつながる、組み立て役のダミー
function builder() {
  const b = new Proxy({ build: () => ({}) }, { get: (t, k) => (k in t ? t[k] : () => b) });
  return b;
}
let TABS = {};
function resetSheets(preset) {
  TABS = {};
  ["ﾀﾞｲｽｹ","ｼｭﾝ","ｶｲﾄ","ｱﾅﾙ","ﾏｰｸ","北7","北4","北他","ﾐﾅﾐ","ほか","関空","ﾊﾞﾗｼ","説明"]
    .forEach(n => { TABS[n] = (preset && preset[n]) || []; });
  Object.keys(written).forEach(k => delete written[k]);
}
resetSheets();

ctx.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: n => TABS[n] ? makeSheet(n, TABS[n]) : null,
    toast: () => {}
  }),
  BorderStyle: { SOLID: 'SOLID' },
  newTextStyle: () => builder(),
  newRichTextValue: () => builder(),
  newDataValidation: () => builder(),
  WrapStrategy: { CLIP: 'CLIP', WRAP: 'WRAP' },
  getUi: () => ({ createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; },
                                       addSubMenu() { return this; }, addToUi() {} }) })
};

/* ---- 偽のキャッシュ／ロック／プロパティ ---- */
const cacheStore = {};
ctx.CacheService = { getScriptCache: () => ({
  get: k => (k in cacheStore ? cacheStore[k] : null),
  put: (k, v) => { cacheStore[k] = String(v); },
  remove: k => { delete cacheStore[k]; }
})};
ctx.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
const propStore = { LINE_ACCESS_TOKEN: 'dummy' };
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in propStore ? propStore[k] : null),
  setProperty: (k, v) => { propStore[k] = v; },
  deleteProperty: k => { delete propStore[k]; }
})};
ctx.Utilities = {
  base64Encode: () => 'BASE64',
  // M/d HH:mm だけ使うので、そこだけ本物っぽく作る
  formatDate: (d, tz, f) => (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
    ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2),
  sleep: () => {}
};
ctx.Session = { getScriptTimeZone: () => 'Asia/Tokyo' };
ctx.ScriptApp = { getProjectTriggers: () => [] };

/* ---- 偽の UrlFetchApp（プロフィール取得と返信を記録する） ---- */
const sent = [];        // 送った返信の本文
let profileName = 'ダイスケ';
let profileCode = 200;
ctx.UrlFetchApp = { fetch: (url, opt) => {
  if (url.indexOf('/message/reply') !== -1) {
    sent.push(JSON.parse(opt.payload).messages[0].text);
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  }
  if (url.indexOf('/profile/') !== -1 || url.indexOf('/member/') !== -1) {
    return { getResponseCode: () => profileCode,
             getContentText: () => JSON.stringify({ displayName: profileName }) };
  }
  throw new Error('未対応のURL: ' + url);
}};

/* ---- Code.gs を読み込む ---- */
const src = fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8');
vm.runInContext(src, ctx, { filename: 'Code.gs' });

/* ---- ここから検証 ---- */
// function 宣言も vm の中で解決してから使う
const F = n => vm.runInContext(n, ctx);
let ng = 0;
function ok(cond, label) {
  console.log((cond ? '  ok   ' : '  NG   ') + label);
  if (!cond) ng++;
}
function has(s, needle, label) { ok(String(s).indexOf(needle) !== -1, label + '  … 実際: ' + JSON.stringify(String(s).slice(0, 160))); }

console.log('\n■ 取込の時間帯は 17:00〜翌05:15（設定タブが無いときの初期値）');
// const は ctx に生えないので、中で評価して取り出す
const K = n => vm.runInContext(n, ctx);
ok(F('cfgOpuFrom_')() === 17 * 60, '開始 17:00');
ok(F('cfgOpuTo_')() === 5 * 60 + 15, '終了 翌05:15');
ok(F('cfgHoursText_')() === '17:00〜翌05:15（29:15）', '文面用の時間帯も同じ');
ok(F('cfgOpuMinYen_')() === 1000, '最低金額 ￥1,000');
ok(F('cfgBizStart_')() === 17, '営業曜日の始まり 17時');
ok(F('cfgNearMin_')() === 15, '要確認の幅 15分');
ok(F('cfgHighYen_')() === 40000, '高すぎる金額 ￥40,000');

console.log('\n■ 時間外は「乗車不可な時間」として理由付きで落とす');
resetSheets();
let r = F('writeOpuchaRecords_')([
  { time: '16:59', money: 12000, place: '新地4' },   // 17時より前 → 対象外
  { time: '05:16', money: 12000, place: '新地4' },   // 05:15より後 → 対象外
  { time: '29:15', money: 12000, place: '新地4' },   // = 05:15 ちょうど → 入る
  { time: '17:00', money: 12000, place: '新地7' }    // ちょうど17:00 → 入る
], 'MID1', new CtxDate(2026, 8, 3));
ok(r.wrote === 2, '境目ちょうどの2件だけ取り込む（実際 ' + r.wrote + '件）');
ok(r.skipped.length === 2, '落としたのは2件（実際 ' + r.skipped.length + '件）');
has(r.skipped[0], '私たちでは乗車不可な時間のため、除外します', '16:59 の理由に指定の文言が入る');
has(r.skipped[0], '17:00〜翌05:15', '理由に時間帯そのものが書いてある');
has(r.skipped[1], '05:16', 'どの行のことか分かる目印が付く');

console.log('\n■ そのほかの不備も、理由を具体的に返す');
resetSheets();
r = F('writeOpuchaRecords_')([
  { time: '23:00', money: 500,   place: '新地4' },
  { time: '',      money: 12000, place: '新地4' },
  { time: '23:00', money: 'あ',  place: '新地4' },
  { time: '23:00', money: 12000, place: '' },
  { time: '23:00', money: 12000, place: '新地4', note: 'DiDi' }
], 'MID2', new CtxDate(2026, 8, 3));
ok(r.wrote === 0, '5件とも取り込まれない');
has(r.skipped[0], '￥1,000未満',     '金額が下限割れ');
has(r.skipped[1], '乗車時刻が読み取れません', '時刻なし');
has(r.skipped[2], '金額が読み取れません',     '金額なし');
has(r.skipped[3], '乗り場が読み取れません',   '乗り場なし');
has(r.skipped[4], 'DiDi・連続配車',           'DiDi は対象外');

console.log('\n■ 同じ内容は二重に登録しない');
resetSheets();
const dup = new Array(11).fill('');
dup[K('C_DATE') - 1] = new CtxDate(2026, 8, 3, 12, 0, 0);
dup[K('C_TIME') - 1] = '23:00';
dup[K('C_MONEY') - 1] = 12000;
resetSheets({ '北4': [dup] });
r = F('writeOpuchaRecords_')([{ time: '23:00', money: 12000, place: '新地4' }],
                            'MID3', new CtxDate(2026, 8, 3));
ok(r.wrote === 0, 'すでにある行は足さない');
has(r.skipped[0], 'すでに登録されています', '重複だと分かる理由が返る');

console.log('\n■ 返信の文面');
ok(F('opuchaReplyText_')('ダイスケ', [{ idx: 1, read: 0, ok: 0, ng: ['乗車記録が写っていません'] }], 1) === '',
   '乗車記録が1件も写っていなければ、何も返さない（雑談の写真をスルーする）');
has(F('opuchaReplyText_')('ダイスケ', [{ idx: 1, read: 2, ok: 2, ng: [] }], 1),
    '2件を取り込みました', '1枚でもうまくいったら、件数を返す');
let t = F('opuchaReplyText_')('ダイスケ', [{ idx: 1, read: 1, ok: 1, ng: [] }, { idx: 2, read: 2, ok: 2, ng: [] }], 2);
has(t, 'ダイスケ様', '連投で全部通ったら名前つきで件数を返す');
has(t, 'スクショ2枚', '何枚だったかを書く');

t = F('opuchaReplyText_')('ダイスケ', [
  { idx: 1, read: 1, ok: 1, ng: [] },
  { idx: 2, ok: 0, read: 1, ng: ['16:59 ￥12,000 新地4 → 乗車時刻が 17:00〜翌05:15（29:15） の外です。私たちでは乗車不可な時間のため、除外します'] }
], 2);
has(t, 'ダイスケ様データは', '「〇〇様データは」の形になっている');
has(t, 'レポート作成に不十分と判断', '指定の言い回しが入っている');
has(t, '【2枚目】', '何枚目がダメだったか分かる');
has(t, '乗車不可な時間', '何がダメだったかまで書いてある');
has(t, 'ほか1件は取り込みました', '通ったぶんも伝える');

t = F('opuchaReplyText_')('', [{ idx: 1, read: 1, ok: 0, ng: ['乗り場が読み取れません'] }], 1);
has(t, 'いただいたデータは', '名前が取れなくても文が崩れない');
ok(t.indexOf('様') === -1, '名前が無いときに「様」だけ残らない');

console.log('\n■ 連投（imageSet）は全部そろってから1回だけ返す');
sent.length = 0;
const set = { id: 'SET1', total: 3 };
F('opuchaReplyBurst_')('rt1', 'ダイスケ', { idx: 1, read: 1, ok: 0, ng: ['乗り場が読み取れません'] }, set, 3);
ok(sent.length === 0, '1枚目では返信しない');
F('opuchaReplyBurst_')('rt2', 'ダイスケ', { idx: 2, read: 1, ok: 1, ng: [] }, set, 3);
ok(sent.length === 0, '2枚目でも返信しない');
F('opuchaReplyBurst_')('rt3', 'ダイスケ', { idx: 3, read: 1, ok: 0, ng: ['金額が読み取れません'] }, set, 3);
ok(sent.length === 1, '3枚目でまとめて1回だけ返信する');
has(sent[0], '【1枚目】', '1枚目の不備が入っている');
has(sent[0], '【3枚目】', '3枚目の不備が入っている');
ok(sent[0].indexOf('【2枚目】') === -1, '通った2枚目は不備欄に出さない');

console.log('\n■ imageSet が無い連投は、同じ人の連続送信として数える');
Object.keys(cacheStore).forEach(k => delete cacheStore[k]);
const ev = { source: { type: 'group', groupId: 'G1', userId: 'U1' } };
ok(F('opuchaBurstSeq_')(ev) === 1, '1枚目');
ok(F('opuchaBurstSeq_')(ev) === 2, '2枚目');
ok(F('opuchaBurstSeq_')({ source: { type: 'group', groupId: 'G1', userId: 'U2' } }) === 1,
   '別の人は別に数える');

console.log('\n■ アイコン名（表示名）の取得');
profileName = 'やましき';
ok(F('opuchaSenderName_')({ source: { type: 'group', groupId: 'G1', userId: 'U1' } }) === 'やましき',
   'グループならメンバープロフィールから取る');
ok(F('opuchaSenderName_')({ source: { type: 'user', userId: 'U1' } }) === 'やましき',
   '1対1でも取れる');
profileCode = 404;
ok(F('opuchaSenderName_')({ source: { type: 'user', userId: 'Ued4659890c83b3b0bcf2a3f8bf008e7f' } }) === 'ﾀﾞｲｽｹ',
   '取れなければ登録済みのタブ名を使う');
ok(F('opuchaSenderName_')({ source: { type: 'user', userId: 'Uxxxx' } }) === '',
   '知らない人なら空文字（文面は「いただいたデータは」になる）');
ok(F('opuchaSenderName_')({ source: {} }) === '', 'userId が無くても落ちない');
profileCode = 200;

console.log('\n■ 空文字を lineReply_ に渡しても送らない');
sent.length = 0;
F('lineReply_')('rt', '');
F('lineReply_')('rt', '   ');
ok(sent.length === 0, '中身が無ければ通知しない');

console.log('\n■ スクショ1枚に乗車記録が2件以上写っていても全部拾う');
resetSheets();
r = F('writeOpuchaRecords_')([
  { time: '22:10', money: 12000, place: '新地4' },
  { time: '23:40', money:  8000, place: '新地7' },
  { time: '01:20', money:  3000, place: 'ドン2' },
  { time: '16:00', money: 15000, place: '新地4' }   // 時間外
], 'MID4', new CtxDate(2026, 8, 3));
ok(r.wrote === 3, '1枚から3件とも書き込む（実際 ' + r.wrote + '件）');
ok(r.skipped.length === 1, '時間外の1件だけ落ちる');
has(r.skipped[0], '16:00', '落ちたのがどれかは時刻で分かる');

console.log('\n■ 1枚に複数件あったときは「何件中の何件が不備か」を書く');
t = F('opuchaReplyText_')('ダイスケ',
  [{ idx: 1, read: 4, ok: 3, ng: ['16:00 ￥15,000 新地4 → 乗車時刻が 17:00〜翌05:15（29:15） の外です。私たちでは乗車不可な時間のため、除外します'] }], 1);
has(t, '読み取れた4件のうち1件が不備です', '何件中の何件かが分かる');
has(t, 'ほか3件は取り込みました', '通ったぶんの件数も出る');
t = F('opuchaReplyText_')('ダイスケ', [{ idx: 1, read: 1, ok: 0, ng: ['乗り場が読み取れません'] }], 1);
ok(t.indexOf('のうち') === -1, '1件だけのときは件数の但し書きを付けない');

console.log('\n■ imageSet が無い連投でも「〇枚目」と書く');
t = F('opuchaReplyText_')('ダイスケ', [{ idx: 2, read: 1, ok: 0, ng: ['乗り場が読み取れません'] }], 1);
has(t, '【2枚目】', '2枚目だと分かる');
t = F('opuchaReplyText_')('ダイスケ', [{ idx: 1, read: 1, ok: 0, ng: ['乗り場が読み取れません'] }], 1);
has(t, '【このスクショ】', '1枚目なら「このスクショ」のまま');


/* ============ C010ver：日付メモ と 身内の投稿の見分け ============ */

const SENT = new CtxDate(2026, 8, 5, 20, 0, 0);   // 2026/09/05(土) 20:00 に送った
// P … スクショにリプライして打った想定（第3引数 true）
// PA … 何も付けずに打った想定（矢印もリプライも無い）
const P  = (t) => F('parseDateNote_')(t, SENT, true);
const PA = (t) => F('parseDateNote_')(t, SENT, false);
const ymd = o => o && (o.bizDate.getFullYear() + '-' +
  ('0' + (o.bizDate.getMonth() + 1)).slice(-2) + '-' + ('0' + o.bizDate.getDate()).slice(-2));

console.log('\n■ 数字だけのときは月日4桁。年は送った日と同じ');
ok(ymd(P('0904')) === '2026-09-04', '0904 → 2026-09-04');
ok(ymd(P('1231')) === '2026-12-31', '1231 → 打ったとおり今年の12/31（年は動かさない）');
ok(ymd(P('０９０４')) === '2026-09-04', '全角でも読める');

console.log('\n■ 先頭に年を足したら、その年になる');
ok(ymd(P('20280904')) === '2028-09-04', '20280904（8桁）');
ok(ymd(P('280904'))   === '2028-09-04', '280904（6桁）');
ok(ymd(P('80904'))    === '2028-09-04', '80904（5桁）');
ok(ymd(P('0280904'))  === '2028-09-04', '0280904（7桁）');
ok(ymd(P('250904'))   === '2025-09-04', '250904 → 過去の年でもそのとおり');
ok(ymd(P('↓280904'))  === '2028-09-04', '矢印付きでも年が効く');

console.log('\n■ 矢印の向いたほうのスクショが対象');
ok(P('↑0904').dir === 'prev', '↑ は前（もう送ったスクショ）');
ok(P('⬆️0904').dir === 'prev', '⬆️ 絵文字でも前');
ok(P('👆0904').dir === 'prev', '👆 でも前');
ok(P('←0904').dir === 'prev', '← も前');
ok(P('↓0904').dir === 'next', '↓ は後（これから送るスクショ）');
ok(P('⬇️0904').dir === 'next', '⬇️ 絵文字でも後');
ok(P('→0904').dir === 'next', '→ も後');
ok(P('0904 ↑').dir === 'prev', '矢印が後ろにあってもよい');
ok(P('0904').dir === '', '矢印なしなら向きなし');
ok(ymd(P('↑0904')) === '2026-09-04', '矢印を外した数字がちゃんと読める');

console.log('\n■ 区切りがあれば、けた数は自由');
ok(ymd(P('9/4'))    === '2026-09-04', '9/4');
ok(ymd(P('09/04'))  === '2026-09-04', '09/04');
ok(ymd(P('9月4日')) === '2026-09-04', '9月4日');
ok(ymd(P('9月4'))   === '2026-09-04', '9月4（「日」なしでも）');
ok(ymd(P('9-4'))    === '2026-09-04', '9-4');
ok(ymd(P('9.4'))    === '2026-09-04', '9.4');
ok(ymd(P('２８/９/４')) === '2028-09-04', '全角の 28/9/4');
ok(ymd(P('2028/9/4'))   === '2028-09-04', '2028/9/4 → その年');
ok(ymd(P('28/9/4'))     === '2028-09-04', '28/9/4 → 2028年');
ok(ymd(P('2028年9月4日')) === '2028-09-04', '2028年9月4日');
ok(ymd(P('↓9/4'))   === '2026-09-04', '矢印付きでも読める');
ok(P('↓9/4').dir === 'next', '矢印の向きも覚えている');

console.log('\n■ 矢印もリプライも無ければ、日付メモとみなさない');
ok(PA('1')    === null, '「1」だけの相づちに反応しない');
ok(PA('3')    === null, '「3」だけでも反応しない');
ok(PA('0905') === null, '4桁でも、印が無ければ反応しない');
ok(PA('9/5')  === null, '区切り付きでも、印が無ければ反応しない');
ok(PA('895')  === null, '読めない数字でも、印が無ければ黙っている');
ok(PA('↑0905') !== null, '矢印があれば拾う');
ok(PA('↑1')    !== null, '矢印があれば1桁でも拾って、書き方を返す');
ok(P('0905')   !== null, 'リプライなら矢印なしでも拾う');
ok(P('1')      !== null, 'リプライなら1桁でも拾って、書き方を返す');
ok(PA('↑ありがとう') === null, '矢印が付いていても、数字でなければ雑談');
ok(P('ありがとう')   === null, 'リプライでも、数字でなければ雑談');

console.log('\n■ 日付メモとして扱わないもの（黙って無視する）');
ok(P('') === null, '空');
ok(P('おつかれさまです') === null, 'ただの雑談');
ok(P('0904 新地4') === null, '数字のあとに文字が付いていたら対象外');
ok(P('0904\n0905') === null, '2行あったら対象外');
ok(P('123456789012') === null, '長すぎる数字は日付メモとみなさない');

console.log('\n■ 読めない数字は、黙らずに書き方を返す');
const E = t => { const o = P(t); return o && o.error ? o : null; };
ok(E('895') !== null,  '895（3桁）はエラー');
ok(E('04')  !== null,  '04（2桁）はエラー');
ok(E('1')   !== null,  '1（1桁）はエラー');
ok(E('0895') !== null, '0895 → 8月95日 はエラー');
ok(E('8905') !== null, '8905 → 89月 はエラー');
ok(E('0231') !== null, '0231 → 2月31日 はエラー');
ok(E('12000') !== null, '12000 → 20月 はエラー');
ok(E('13/4') !== null, '13/4 → 13月 はエラー');
ok(E('2/30') !== null, '2/30 → 2月30日 はエラー');
ok(E('1/2/3/4') !== null, '区切りが多すぎるのもエラー');
has(E('895').why, '数字だけのときは4桁', '3桁のときは「数字だけなら4桁」と言う');
has(E('8905').why, '89月', '月がおかしいときはその月を言う');
has(E('0895').why, '95日', '日がおかしいときはその日を言う');
has(E('0231').why, '2月31日', '存在しない日はそう言う');
ok(E('↓895') !== null && E('↓895').dir === 'next', 'エラーでも矢印の向きは覚えている');

console.log('\n■ 案内の文面');
{
  const h = F('dateNoteHelp_')('895', '月日は4桁で送ってください');
  has(h, '「895」', '打った文字をそのまま見せる');
  has(h, 'かならず4桁', '数字だけなら4桁だと書いてある');
  has(h, 'けた数は自由', '区切りありなら自由だと書いてある');
  has(h, '先頭に年を足す', '年の足し方が書いてある');
  has(h, 'リプライ', 'リプライで送る方法が書いてある');
  has(h, 'かならず付けて', '矢印かリプライが必須だと書いてある');
  has(h, '読み飛ばします', '付けないとどうなるかも書いてある');
  has(h, '↑', '上向き矢印の説明がある');
  has(h, '↓', '下向き矢印の説明がある');
  has(h, 'さっき送ったもの', '↑ が何を指すか書いてある');
  has(h, 'このあと送るもの', '↓ が何を指すか書いてある');
  has(h, '送った日の営業曜日', '何もしなかったときの動きも書いてある');
  ok(h.split('\n').length >= 12 && h.length < 600, '長すぎず短すぎない');
}

console.log('\n■ 読めない数字を受けたら案内を返信する');
{
  sent.length = 0;
  const ev = { replyToken: 'rt', source: { type: 'group', groupId: 'G1', userId: 'U9' },
               message: { type: 'text', text: '↑895' } };
  F('handleDateNote_')(ev, PA('↑895'));
  ok(sent.length === 1, '1通だけ返す');
  has(sent[0], 'かならず4桁', '案内が入っている');
  ok(!('PENDDATE_U9' in cacheStore), 'エラーのときは日付を取っておかない');
}

console.log('\n■ 年を書かなければ動かさない／書いたらそのとおり');
ok(ymd(F('parseDateNote_')('1231', new CtxDate(2026, 0, 5, 20, 0, 0), true)) === '2026-12-31',
   '1/5 に 1231 と打っても、その年の12/31のまま');
ok(ymd(F('parseDateNote_')('251231', new CtxDate(2026, 0, 5, 20, 0, 0), true)) === '2025-12-31',
   '251231 と書けば 2025年になる');

console.log('\n■ 身内の名前を見分ける');
ok(F('memberFromScreenName_')('齊藤大介') === 'ﾀﾞｲｽｹ', '対応表の名前');
ok(F('memberFromScreenName_')('齊藤大介さん') === 'ﾀﾞｲｽｹ', '「さん」付きでも');
ok(F('memberFromScreenName_')('山脇海斗(放出営業所)') === 'ｶｲﾄ', 'カッコ書きを外す');
ok(F('memberFromScreenName_')('ﾀﾞｲｽｹ') === 'ﾀﾞｲｽｹ', 'タブ名そのまま');
ok(F('memberFromScreenName_')('ダイスケ') === 'ﾀﾞｲｽｹ', '全角カナでも');
ok(F('memberFromScreenName_')('知らない人') === '', '身内でなければ空');
ok(F('memberFromScreenName_')('') === '', '空でも落ちない');

console.log('\n■ 身内の名前 ＋ 手持ちの記録とそっくり → 二重登録として外す');
function ownRow(tab, y, m, d, time, money, place) {
  const r = new Array(11).fill('');
  r[K('C_SENDER') - 1] = tab;
  r[K('C_DATE') - 1] = new CtxDate(y, m - 1, d, 12, 0, 0);
  r[K('C_TIME') - 1] = time;
  r[K('C_MONEY') - 1] = money;
  r[K('C_PLACE') - 1] = place;
  return r;
}
resetSheets({ 'ﾀﾞｲｽｹ': [ownRow('ﾀﾞｲｽｹ', 2026, 9, 3, '23:10', 12000, '新地4')] });
r = F('writeOpuchaRecords_')([{ name: '齊藤大介', time: '23:10', money: 12000, place: '新地4' }],
                             'MID5', new CtxDate(2026, 8, 3));
ok(r.wrote === 0, '取り込まない');
has(r.skipped[0], '二重登録のため除外', '理由が「二重登録」になっている');
has(r.skipped[0], 'ﾀﾞｲｽｹタブ', 'どのタブの記録と同じかを書く');

console.log('\n■ 時刻が15分ずれていても「そっくり」と見る');
resetSheets({ 'ﾀﾞｲｽｹ': [ownRow('ﾀﾞｲｽｹ', 2026, 9, 3, '23:10', 12000, '新地4')] });
r = F('writeOpuchaRecords_')([{ name: '齊藤大介', time: '23:24', money: 12000, place: '新地4' }],
                             'MID6', new CtxDate(2026, 8, 3));
ok(r.wrote === 0, '14分差なら同じ乗車とみなす');
resetSheets({ 'ﾀﾞｲｽｹ': [ownRow('ﾀﾞｲｽｹ', 2026, 9, 3, '23:10', 12000, '新地4')] });
r = F('writeOpuchaRecords_')([{ name: '齊藤大介', time: '23:40', money: 12000, place: '新地4' }],
                             'MID7', new CtxDate(2026, 8, 3));
ok(r.wrote === 1, '30分差なら別の乗車として取り込む');
ok(r.suspect === 1, 'ただし要確認にする');

console.log('\n■ 名前だけ身内／中身だけそっくり → 取り込むが ⚠️ を付ける');
resetSheets();
r = F('writeOpuchaRecords_')([{ name: '齊藤大介', time: '23:10', money: 12000, place: '新地4' }],
                             'MID8', new CtxDate(2026, 8, 3));
ok(r.wrote === 1 && r.suspect === 1, '名前だけ身内 → 取り込んで要確認');
ok((written['北4'] || [])[0][K('C_MARK') - 1] === '⚠️', 'K列が ⚠️ になる');
has((written['北4'] || [])[0][K('C_OTHER') - 1], '要確認：身内', 'I列に理由が残る');

resetSheets({ 'ﾀﾞｲｽｹ': [ownRow('ﾀﾞｲｽｹ', 2026, 9, 3, '23:10', 12000, '新地4')] });
r = F('writeOpuchaRecords_')([{ name: '知らない人', time: '23:10', money: 12000, place: '新地4' }],
                             'MID9', new CtxDate(2026, 8, 3));
ok(r.wrote === 1 && r.suspect === 1, '中身だけそっくり → 取り込んで要確認');
has((written['北4'] || [])[0][K('C_OTHER') - 1], '内容が近いです', 'I列に理由が残る');

resetSheets();
r = F('writeOpuchaRecords_')([{ name: '知らない人', time: '23:10', money: 12000, place: '新地4' }],
                             'MIDA', new CtxDate(2026, 8, 3));
ok(r.wrote === 1 && r.suspect === 0, 'どちらでもなければ普通に取り込む');
ok((written['北4'] || [])[0][K('C_MARK') - 1] === '🆕', 'K列は 🆕 のまま');

console.log('\n■ 要確認があると返信で知らせる');
t = F('opuchaReplyText_')('ダイスケ', [{ idx: 1, read: 1, ok: 1, suspect: 1, ng: [] }], 1);
has(t, '要確認が1件', '全部通っていても要確認は伝える');
t = F('opuchaReplyText_')('ダイスケ', [{ idx: 1, read: 1, ok: 1, ng: [], note: '営業曜日は 9/4(金) で登録しました' }], 1);
has(t, '9/4(金)', '日付を直したことも伝える');

console.log('\n■ 日付メモを受けたときの動き');
Object.keys(cacheStore).forEach(k => delete cacheStore[k]);
sent.length = 0;
const evNote = (text, quoted) => ({
  replyToken: 'rt', source: { type: 'group', groupId: 'G1', userId: 'U9' },
  message: { type: 'text', text: text, quotedMessageId: quoted || undefined }
});
// ① まだスクショが無い状態で「↓0904」→ 次のスクショ用に取っておく
F('handleDateNote_')(evNote('↓0904'), P('↓0904'));
ok(cacheStore['PENDDATE_U9'] === '2026-09-04', '次のスクショ用に日付を取っておく');
has(sent[0], '次に送るスクショ', 'その旨を返信する');
// ② スクショが無いのに「↑0904」→ これも次のスクショ用に回す
Object.keys(cacheStore).forEach(k => delete cacheStore[k]);
sent.length = 0;
F('handleDateNote_')(evNote('↑0904'), P('↑0904'));
ok(cacheStore['PENDDATE_U9'] === '2026-09-04', '直前のスクショが無ければ次に回す');
has(sent[0], '見つからなかった', 'その旨を返信する');

console.log('\n■ 取り込んだ行の日付を後から直す');
resetSheets();
const linked = new Array(11).fill('');
linked[K('C_DATE') - 1] = new CtxDate(2026, 8, 5, 12, 0, 0);
linked[K('C_TIME') - 1] = '23:10';
linked[K('C_MONEY') - 1] = 12000;
linked[K('C_LINK') - 1] = 'IMG123-0';
const linked2 = linked.slice(); linked2[K('C_LINK') - 1] = 'IMG123-1';
const other   = linked.slice(); other[K('C_LINK') - 1] = 'ZZZ-0';
resetSheets({ '北4': [linked, linked2, other] });
ok(F('fixOpuchaDate_')('IMG123', new CtxDate(2026, 8, 3, 12, 0, 0)) === 2,
   'そのスクショから入った2行だけ直す');
ok(F('fixOpuchaDate_')('NOPE', new CtxDate(2026, 8, 3, 12, 0, 0)) === 0,
   '知らないIDなら0件');
ok(F('fixOpuchaDate_')('', new CtxDate(2026, 8, 3, 12, 0, 0)) === 0,
   '空のIDでも落ちない');

console.log('\n■ ⚠️ が整形で消えないこと');
{
  const rr = new Array(11).fill('');
  rr[K('C_DATE') - 1] = new CtxDate(2026, 8, 3, 12, 0, 0);
  rr[K('C_TIME') - 1] = '23:10';
  rr[K('C_MONEY') - 1] = 12000;
  rr[K('C_PLACE') - 1] = '新地4';
  rr[K('C_OTHER') - 1] = '要確認：身内（ﾀﾞｲｽｹ）の名前の投稿です';
  rr[K('C_MARK') - 1] = '⚠️';
  resetSheets({ '北4': [rr] });
  vm.runInContext('_formatStats = {}', ctx);
  try { F('formatTab_')(makeSheet('北4', TABS['北4'])); }
  catch (e) { console.log('       formatTab_ が動きませんでした: ' + e.message); }
  // 整形すると年見出しの行が入るので、データの行を探して見る
  const hit = (TABS['北4'] || []).concat(written['北4'] || [])
    .filter(x => String(x[K('C_OTHER') - 1]).indexOf('要確認') !== -1);
  ok(hit.length === 1, '要確認の行がひとつ残っている');
  ok(hit.length === 1 && String(hit[0][K('C_MARK') - 1]).trim() === '⚠️',
     '整形しても I列に「要確認」がある行の ⚠️ は残る');
}

console.log('\n■ 「設定」タブの値が効くこと');
// 設定タブは B列=項目 / C列=値。1行目は見出し
function cfgRow(key, val) {
  const r = new Array(11).fill('');
  r[1] = key; r[2] = val;    // B列=項目 / C列=値
  return r;
}
function useSettings(list) {
  resetSheets();
  TABS['設定'] = [cfgRow('項目', '値')].concat(list);   // 1行目は見出し
  vm.runInContext('_cfgCache = null', ctx);
}
useSettings([
  cfgRow('オプチャ取込の開始時刻', '18:00'),
  cfgRow('オプチャ取込の終了時刻', '04:00'),
  cfgRow('オプチャの最低金額（円）', 3000),
  cfgRow('営業曜日の始まり（時）', 16),
  cfgRow('要確認とみなす時刻の幅（分）', 30),
  cfgRow('高すぎる金額の線（円）', 50000),
  cfgRow('ショートの上限（円）', 3999),
  cfgRow('ロングの下限（円）', 12000),
  cfgRow('裏メッセージの文面', '📈{期間}の記録 by誰か')
]);
ok(F('cfgOpuFrom_')() === 18 * 60, '開始時刻が設定どおり 18:00');
ok(F('cfgOpuTo_')() === 4 * 60, '終了時刻が設定どおり 04:00');
ok(F('cfgOpuMinYen_')() === 3000, '最低金額が設定どおり');
ok(F('cfgBizStart_')() === 16, '営業曜日の始まりが設定どおり');
ok(F('cfgNearMin_')() === 30, '要確認の幅が設定どおり');
ok(F('cfgHighYen_')() === 50000, '高すぎる金額が設定どおり');
ok(F('cfgShortMax_')() === 3999, 'ショートの上限が設定どおり');
ok(F('cfgLongMin_')() === 12000, 'ロングの下限が設定どおり');
ok(F('cfgAltText_')() === '📈{期間}の記録 by誰か', '裏メッセージの文面が設定どおり');
ok(F('cfgHoursText_')() === '18:00〜翌04:00（28:00）', '説明用の文字も作り直される');

console.log('\n■ 設定を変えると取込の判定も変わる');
r = F('writeOpuchaRecords_')([
  { time: '17:30', money: 12000, place: '新地4' },   // 18:00 より前 → 落ちる
  { time: '18:00', money: 12000, place: '新地4' },   // ちょうど → 入る
  { time: '23:00', money:  2000, place: '新地7' }    // ￥3,000 未満 → 落ちる
], 'CFG1', new CtxDate(2026, 8, 3));
ok(r.wrote === 1, '設定に合わせて1件だけ入る');
has(r.skipped[0], '18:00〜翌04:00', '返信の文言も設定に合わせて変わる');
has(r.skipped[1], '￥3,000未満', '最低金額の文言も設定どおり');

console.log('\n■ 空欄・変な値なら初期値に戻る');
useSettings([
  cfgRow('オプチャの最低金額（円）', ''),
  cfgRow('営業曜日の始まり（時）', 'あいうえお'),
  cfgRow('オプチャ取込の開始時刻', '25時ごろ')
]);
ok(F('cfgOpuMinYen_')() === 1000, '空欄 → 初期値 ￥1,000');
ok(F('cfgBizStart_')() === 17, '数字にならない → 初期値 17時');
ok(F('cfgOpuFrom_')() === 17 * 60, '時刻にならない → 初期値 17:00');

console.log('\n■ セルが時刻書式（Date）でも読める');
useSettings([cfgRow('オプチャ取込の開始時刻', new CtxDate(1899, 11, 30, 19, 30, 0))]);
ok(F('cfgOpuFrom_')() === 19 * 60 + 30, 'Date で入っていても 19:30 と読む');

console.log('\n■ 「設定」タブが無くても動く');
resetSheets();
vm.runInContext('_cfgCache = null', ctx);
ok(F('cfgOpuFrom_')() === 17 * 60, 'タブが無ければ初期値');

console.log('\n■ 開いたときのチェック（右下のポップアップ）');
{
  // toast と、動いた記録を見張る
  const toasts = [];
  const props = {};
  const realSA = ctx.SpreadsheetApp;
  let activeName = 'ﾀﾞｲｽｹ';
  resetSheets();
  ctx.SpreadsheetApp = Object.assign({}, realSA, {
    getActiveSpreadsheet: () => ({
      getSheetByName: n => TABS[n] ? makeSheet(n, TABS[n]) : null,
      getActiveSheet: () => makeSheet(activeName, TABS[activeName] || []),
      toast: (msg, title) => toasts.push({ title: title, msg: msg })
    })
  });
  const realProps = ctx.PropertiesService;
  ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in props ? props[k] : null),
    setProperty: (k, v) => { props[k] = String(v); },
    deleteProperty: k => { delete props[k]; }
  })};

  // ① 対象のタブ → チェック中の知らせが出る
  activeName = 'ﾀﾞｲｽｹ';
  F('onOpenCheck')();
  has((toasts[0] || {}).title, 'チェック中', '対象タブでは「チェック中」が出る');
  ok(toasts.length >= 2, 'そのあと結果の知らせも出る');
  ok(String(props['LAST_OPENCHECK'] || '').indexOf('ﾀﾞｲｽｹ') !== -1,
     '動いた記録が残る（あとで調べられる）');

  // ② 対象外のタブ → 黙らずに一言出す
  toasts.length = 0;
  activeName = '設定';
  TABS['設定'] = [];
  F('onOpenCheck')();
  ok(toasts.length === 1, '対象外のタブでも1回だけ知らせる');
  has(toasts[0].title, '対象外', '「対象外です」と分かる');
  ok(String(props['LAST_OPENCHECK'] || '').indexOf('設定') !== -1,
     '対象外でも動いた記録は残る');

  // ③ エラーは手元に残る
  delete props['LAST_ERRORS'];
  F('logErr_')('テスト', new Error('わざと失敗'));
  const errs = JSON.parse(props['LAST_ERRORS']);
  ok(errs.length === 1 && errs[0].where === 'テスト', 'エラーが記録される');
  has(errs[0].msg, 'わざと失敗', '中身も残る');
  for (let i = 0; i < 8; i++) F('logErr_')('x' + i, new Error('e' + i));
  ok(JSON.parse(props['LAST_ERRORS']).length === 5, 'ためこまず直近5件だけ残す');

  ctx.SpreadsheetApp = realSA;
  ctx.PropertiesService = realProps;
  vm.runInContext('_cfgCache = null', ctx);
}

console.log('\n■ 設定は1回引いたら覚えておく（並び替えから何度も呼ばれるため）');
{
  // シートを読みに行った回数を数える
  let reads = 0;
  const realSA = ctx.SpreadsheetApp;
  resetSheets();
  TABS['設定'] = [cfgRow('項目', '値'), cfgRow('営業曜日の始まり（時）', 16)];
  ctx.SpreadsheetApp = Object.assign({}, realSA, {
    getActiveSpreadsheet: () => ({
      getSheetByName: n => { if (n === '設定') reads++; return TABS[n] ? makeSheet(n, TABS[n]) : null; },
      toast: () => {}
    })
  });
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
  for (let i = 0; i < 500; i++) F('cfgBizStart_')();
  ok(reads === 1, '500回呼んでもシートを読むのは1回だけ（実際 ' + reads + '回）');
  ok(F('cfgBizStart_')() === 16, '値も正しい');
  ok(F('timeRank_')('23:30') === 23.5, 'timeRank_ も動く');
  ok(F('timeRank_')('01:00') === 25, '16時起点なので 01:00 は 25');
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
  ok(F('cfgBizStart_')() === 16, '読み直しても同じ');
  ctx.SpreadsheetApp = realSA;
  resetSheets();
  vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
}

console.log('\n■ 「いつ動いたか」の表示');
{
  const A = F('agoText_');
  ok(A('') === 'まだありません', '記録が無ければそう言う');
  ok(A('こわれた値') === 'まだありません', '読めない値でも落ちない');
  has(A(new CtxDate(Date.now() - 30 * 60000).toISOString()), '30分前', '30分前');
  has(A(new CtxDate(Date.now() - 3 * 3600000).toISOString()), '3時間前', '3時間前');
  has(A(new CtxDate(Date.now() - 2 * 86400000).toISOString()), '2日前', '2日前');
}

console.log('\n■ 軽量モード');
{
  const L = () => F('cfgLight_')();
  useSettings([]);                                   ok(L() === false, '既定は いいえ');
  useSettings([cfgRow('軽量モード', 'はい')]);        ok(L() === true,  '「はい」で ON');
  useSettings([cfgRow('軽量モード', 'ハイ')]);        ok(L() === true,  '「ハイ」でも ON');
  useSettings([cfgRow('軽量モード', 'ON')]);          ok(L() === true,  '「ON」でも ON');
  useSettings([cfgRow('軽量モード', '1')]);           ok(L() === true,  '「1」でも ON');
  useSettings([cfgRow('軽量モード', 'いいえ')]);      ok(L() === false, '「いいえ」で OFF');
  useSettings([cfgRow('軽量モード', 'そのうち')]);    ok(L() === false, '知らない言葉なら OFF');
  useSettings([cfgRow('軽量モード', '')]);            ok(L() === false, '空欄なら OFF');
  resetSheets(); vm.runInContext('_cfgCache = null; _cfgVal = {}', ctx);
}

console.log('\n■ LINEに「なおして」と打てば、見張りを入れ直す');
{
  vm.runInContext('var repaired = 0; function panelRepair_(){ repaired++; return "見張りを入れ直しました"; }', ctx);
  sent.length = 0;
  const took = F('handleRepairNote_')({ replyToken: 'rt', message: { text: 'なおして' } });
  ok(took === true, '「なおして」は、この受け口が扱う');
  ok(vm.runInContext('repaired', ctx) === 1, '入れ直しが動く');
  has(sent[0], '見張りを入れ直しました', '結果をその場で返す');

  ['直して', '　なおして　', '修復', 'リセット'].forEach(function (w) {
    ok(F('handleRepairNote_')({ replyToken: 'rt', message: { text: w } }) === true,
       '「' + w.trim() + '」でも効く');
  });
  ok(F('handleRepairNote_')({ replyToken: 'rt', message: { text: 'なおしてほしい' } }) === false,
     '文章の中にあるだけなら、効かない');
  ok(F('handleRepairNote_')({ replyToken: 'rt', message: { text: '23:00 12000 新地4' } }) === false,
     'ふつうの乗車記録は、そのまま通す');
}

console.log(ng ? '\n✗ ' + ng + '件 失敗\n' : '\n✓ すべて通りました\n');
process.exit(ng ? 1 : 0);
