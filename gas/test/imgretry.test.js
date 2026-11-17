/**
 * 📷 取り込みそこねたスクショを、あとで取り込み直す（2026/11/17）
 *   実行: node gas/test/imgretry.test.js
 *
 * ★9/24 に実際に起きました。受け口はスクショを受け取っていたのに、
 *   書き込みでしくじって、そのまま消えました。
 *   売上の記録が1本まるごと消えても、だれも気づけません。
 * ★だから、しくじったら控えておいて、あとで取り込み直します。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const ctx = { console };
vm.createContext(ctx);
vm.runInContext('function logErr_(){}', ctx);

/* スクリプトの控え（覚える） */
const store = {};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in store ? store[k] : null),
  setProperty: (k, v) => { store[k] = String(v); },
  deleteProperty: k => { delete store[k]; } }) };
ctx.SpreadsheetApp = { getUi: () => { throw new Error('no ui'); } };
const cache = {};
ctx.CacheService = { getScriptCache: () => ({
  get: k => (k in cache ? cache[k] : null),
  put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) };
ctx.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '' }) };
ctx.ScriptApp = { getProjectTriggers: () => [], newTrigger: () => ({}) };
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8'), ctx);

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

/* 取り込む係を、ここで差し替えます（通信しません） */
let reads = [], writes = [], told = [];
const setup = (readFn, writeFn) => {
  ctx.opuchaFromImage_ = function (mid) { reads.push(mid); return readFn(mid); };
  ctx.writeOpuchaRecords_ = function (list, mid, d) { writes.push({ mid: mid, n: list.length, d: d }); return writeFn ? writeFn() : { wrote: list.length, skipped: [] }; };
  ctx.updDrTell_ = function (t) { told.push(t); };
};
const reset = () => { for (const k in store) delete store[k]; reads = []; writes = []; told = []; };

console.log('■ しくじったスクショを控える');
{
  reset(); setup(() => []);
  ok(ctx.imgRetryAdd_('m1', new Date(2026, 10, 13, 12), '権限がありません') === true,
     '★★★控える');
  ok(ctx.imgRetryAdd_('m1', new Date(2026, 10, 13, 12), '権限がありません') === false,
     '★★★同じものを2回 控えない');
  ok(ctx.imgRetryAdd_('', new Date(), 'x') === false, '　 IDが無ければ、何もしない');
  const a = ctx.imgRetryList_();
  ok(a.length === 1, '　 1件だけ入っている', a.length);
  ok(a[0].biz === '2026-11-13', '★★★営業日もいっしょに控える', a[0].biz);
  ok(a[0].n === 0, '　 やり直した回数は0から', a[0].n);
}

console.log('\n■ あとで取り込み直す');
{
  reset(); setup(() => [{ money: '1200', time: '23:10' }]);
  ctx.imgRetryAdd_('m2', new Date(2026, 10, 13, 12), 'しくじり');
  ok(ctx.imgRetryTick_() === true, '★★★1件 やり直す');
  ok(reads.length === 1 && reads[0] === 'm2', '★★★その写真を読み直す', reads);
  ok(writes.length === 1 && writes[0].n === 1, '★★★読めたら、取り込む', writes);
  ok(ctx.imgRetryList_().length === 0, '★★★入ったら、控えから外す');
  ok(told.length === 0, '★★★うまくいったときは、1通も出さない');
}

console.log('\n■ 続けて何度も叩かない');
{
  reset(); setup(() => [{ money: '1200', time: '23:10' }]);
  ctx.imgRetryAdd_('m3', new Date(2026, 10, 13, 12), 'しくじり');
  ctx.imgRetryAdd_('m4', new Date(2026, 10, 13, 12), 'しくじり');
  ok(ctx.imgRetryTick_() === true, '　 1回目は動く');
  ok(ctx.imgRetryTick_() === false, '★★★すぐ次は動かない（3分おき）');
  ok(ctx.imgRetryList_().length === 1, '　 残りは1件のまま');
}

console.log('\n■ 乗車記録が写っていないものは、ためこまない');
{
  reset(); setup(() => []);
  ctx.imgRetryAdd_('m5', new Date(2026, 10, 13, 12), 'しくじり');
  ctx.imgRetryTick_();
  ok(writes.length === 0, '　 取り込まない');
  ok(ctx.imgRetryList_().length === 0, '★★★控えからは外す（ずっと残らない）');
  ok(told.length === 0, '　 知らせない');
}

console.log('\n■ 何度やってもだめなら、1通だけ知らせる');
{
  reset(); setup(() => { throw new Error('権限がありません'); });
  ctx.imgRetryAdd_('m6', new Date(2026, 10, 13, 12), 'はじめのしくじり');
  for (let i = 0; i < 9; i++) {
    store['IMG_RETRY_AT'] = '0';          // 3分待ちを飛ばす
    ctx.imgRetryTick_();
  }
  ok(ctx.imgRetryList_().length === 0, '★★★あきらめて、控えから外す');
  ok(told.length === 1, '★★★知らせるのは1回だけ', told.length);
  ok(/^📷/.test(told[0] || ''), '★★★書き出しは 📷（グループへ出さない印）', told[0]);
  ok(/もう一度 送って/.test(told[0] || ''), '　 どうすればよいかが書いてある');
}

console.log('\n■ 古くなったものは、あきらめる（LINE側に残らないため）');
{
  reset(); setup(() => [{ money: '1200', time: '23:10' }]);
  ctx.imgRetryAdd_('m7', new Date(2026, 10, 13, 12), 'しくじり');
  const a = ctx.imgRetryList_();
  a[0].at = new Date(Date.now() - 5 * 86400000).toISOString();   // 5日前
  ctx.imgRetrySave_(a);
  ctx.imgRetryTick_();
  ok(reads.length === 0, '★★★古いものは、読みにいかない');
  ok(ctx.imgRetryList_().length === 0, '　 控えからは外す');
  ok(told.length === 1, '★★★そのときだけ、1通 知らせる');
}

console.log('\n■ グループへは、1文字も出さない');
{
  const vn = fs.readFileSync(path.join(__dirname, '..', '006-Venue.gs'), 'utf8');
  ok(/"📷"/.test(vn), '★★★📷 が、止める印の一覧に入っている');
  ok(/VN_ADMIN_MARKS = \[[^\]]*"📷"/.test(vn), '★★★ふるい落とすほうにも入っている');
  const upd = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
  ok(/typeof imgRetryTick_ === "function" && imgRetryTick_\(\)/.test(upd),
     '★★★1分おきの見張りから、try で囲って呼んでいる');
  ok(/logErr_\("imgRetry", e\)/.test(upd), '★★★こけても、ほかの仕事は止めない');
}

console.log(fail ? `\n${fail} 件失敗` : '\n全テスト通過');
process.exit(fail ? 1 : 0);
