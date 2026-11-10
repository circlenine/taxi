/**
 * LINEの絵が「そもそもLINEに通る形か」を確かめる。
 *   実行: node gas/test/flexok.test.js
 *
 * ★なぜ、このテストが要るのか（2026/11/10・実際に起きました）
 *   会場を押したときに開く住所に、組み立て前の
 *     https://www.festivalhall.jp/events/list/{Y}/{M}/
 *   を そのまま入れていました。
 *   LINEは「絵の中身が正しくない（400）」として突き返し、
 *   **その日の知らせが1通も届きませんでした**。
 *   会場が1つ おかしいだけで、ほかの会場のぶんまで消えます。
 *   しかも、こちらからは何も見えませんでした。
 *
 *   まーく様に「まだ来てません」と二度も言わせてしまいました。
 *   同じことが二度と起きないよう、ここで形ごと固定します。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: () => null, getProperties: () => ({}),
  setProperty: () => {}, deleteProperty: () => {} }) };
ctx.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '' }) };
vm.runInContext('function logErr_(){} function lrPush_(){} var SENDER_MAP = {};', ctx);
vm.runInContext('function lrBytes_(s){return Buffer.byteLength(String(s),"utf8");}', ctx);
ctx.Buffer = Buffer;
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8'), ctx);

let fail = 0;
const ok = (c, m, got) => {
  if (c) console.log('ok   ' + m);
  else { fail++; console.log('FAIL ' + m + (got === undefined ? '' : '　→ ' + JSON.stringify(got))); }
};

/* LINEが受け取れない形を、まるごと探す */
function findBad(node, where, out) {
  if (Array.isArray(node)) { node.forEach((x, i) => findBad(x, where + '[' + i + ']', out)); return out; }
  if (!node || typeof node !== 'object') return out;
  if (node.type === 'text') {
    const hasT = typeof node.text === 'string' && node.text.length > 0;
    const hasC = Array.isArray(node.contents) && node.contents.length > 0;
    if (!hasT && !hasC) out.push(where + '：字が空っぽの行');
  }
  if (node.type === 'span' && (typeof node.text !== 'string' || !node.text.length)) {
    out.push(where + '：字が空っぽの かたまり');
  }
  if (node.type === 'box' && (!Array.isArray(node.contents) || !node.contents.length)) {
    out.push(where + '：中身が空っぽの枠');
  }
  if (node.type === 'uri') {
    const u = String(node.uri || '');
    if (!u) out.push(where + '：住所が空っぽ');
    else if (!/^(https?:\/\/|tel:|line:)/i.test(u)) out.push(where + '：開けない住所 ' + u);
    else if (/[{}\s]/.test(u)) out.push(where + '：組み立て前の住所 ' + u);
  }
  Object.keys(node).forEach(k => {
    if (node[k] && typeof node[k] === 'object') findBad(node[k], where + '.' + k, out);
  });
  return out;
}

console.log('■ 開けない住所を、絵に入れない');
{
  const f = ctx.vnOkUri_;
  ok(f('https://www.festivalhall.jp/events/list/{Y}/{M}/') === '',
     '★★★組み立て前の住所（{Y}{M}）は、はじく');
  ok(f('https://www.festivalhall.jp/events/list/2026/11/') ===
     'https://www.festivalhall.jp/events/list/2026/11/',
     '★★★組み立てたあとの住所は、そのまま通す');
  ok(f('') === '', '　 空っぽは、はじく');
  ok(f(null) === '', '　 何も渡されなくても落ちない');
  ok(f('www.example.com') === '', '　 http が付いていないものは、はじく');
  ok(f('https://a.example/ b') === '', '　 すき間が入っているものは、はじく');
  ok(f('tel:06-1234-5678') === 'tel:06-1234-5678', '　 電話は通す');
}

console.log('■ 読み先の住所を、組み立てずに絵へ渡していないこと');
{
  const body = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(body.indexOf('url: src.url') === -1,
     '★★★組み立て前の住所を、そのまま持たせているところが1つも無い');
}

console.log('■ あすの知らせが、ちゃんとLINEに通る形になっている');
{
  const day = new Date(2026, 10, 11);
  /*
   * ★実際に届かなかった日（11/11）と、同じならびで作ります。
   *   住所には、わざと組み立て前のものを混ぜます。
   *   1つ混ざっても、知らせが消えないことを確かめます。
   */
  const E = [
    { venue: '大阪城ホール', kind: 'event', icon: '🎤', title: 'ベストヒット歌謡祭2026',
      artist: 'ベストヒット歌謡祭2026', start: '19:00', startKind: '開演',
      end: '21:30', endGuess: true, url: 'https://www.osaka-johall.com/' },
    { venue: 'フェスティバルホール', kind: 'barasi', icon: '🔧',
      title: 'Jason Mraz（公演日）［コンサート］', artist: 'Jason Mraz',
      start: '19:00', end: '21:30',
      url: 'https://www.festivalhall.jp/events/list/{Y}/{M}/' },   // ★わざと壊した住所
    { venue: 'Zepp Osaka Bayside', kind: 'barasi', icon: '🔧',
      title: '粗品（公演日）［舞台］', artist: '粗品', start: '19:00', end: '21:00',
      avoid: '過去のプライベートな騒動には触れない',
      url: 'https://www.zepp.co.jp/hall/osakabayside/schedule/' },
    { venue: '森ノ宮ピロティホール', kind: 'hanyu', icon: '🚚',
      title: '髪結いの亭主（搬入（初日））　📅 公演は 11/12 から9日間［舞台］',
      start: '', end: '', url: 'https://www.morinomiya-piloti.jp/' }
  ];

  let msgs = null, err = '';
  try { msgs = ctx.vnFitMessages_(day, E, ''); } catch (e) { err = (e && e.message) || String(e); }
  ok(!!msgs, '★★★知らせが作れる（住所が1つ壊れていても、落ちない）', err);

  if (msgs) {
    const bad = [];
    msgs.forEach((m, i) => findBad(m, '通' + (i + 1), bad));
    ok(bad.length === 0, '★★★LINEが受け取れない形が、1つも無い', bad.slice(0, 6));

    const all = JSON.stringify(msgs);
    ok(all.indexOf('{Y}') === -1 && all.indexOf('{M}') === -1,
       '★★★組み立て前の住所が、絵の中に1つも残っていない');
    ok(all.indexOf('19:00') !== -1, '★★★開演の時刻が、ちゃんと入っている');
    ok(all.indexOf('大阪城ホール') !== -1 && all.indexOf('フェスティバルホール') !== -1,
       '★★★住所が壊れていた会場も、ちゃんと出ている（消さない）');
    msgs.forEach(function (m, i) {
      const at = String(m.altText || '');
      ok(at.length > 0 && at.length <= 400, '　 通' + (i + 1) + ' の見出しが、長さの決まりに収まっている', at.length);
    });
  }
}

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
