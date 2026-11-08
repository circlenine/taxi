/**
 * カルテ（クロちゃんへの報告）を確かめる。
 *   実行: node gas/test/karte.test.js
 *
 * ★まーく様のご指示（2026/11/9）
 *   「そのエラー表示も、わざわざ送る形にせず
 *     自動でエラーを見つけ出して処理する方法にできませんか」
 *
 * ★まーく様が画面を写して送る、という形は「人の手が要るもの」です。
 *   増やしてはいけないものでした。
 *   いまの様子を1枚にしてドライブに置けば、
 *   まーく様が何もしなくても、こちらが読んで直せます。
 *
 * ★ここで必ず確かめること
 *   ・診るのに要るものが、ぜんぶ入っているか
 *   ・中身が変わっていなければ、書かないか（持ち時間）
 *   ・共有の設定を、ぜったいに触らないか
 *   ・1か所 読めなくても、残りは書けるか
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
const B = src.indexOf('const KARTE_FILE');
const E = src.indexOf('const DOOR_FILE');
ok(B > 0 && E > B, '005-Updater.gs に、カルテの係がある');
const part = src.slice(B, E);

function build(o){
  o = o || {};
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ctx.props = Object.assign({
    PANEL_WATCH_AT: String(Date.now() - 4 * 60000),
    LAST_ERRORS: JSON.stringify(o.errs === undefined
      ? [{ at: '2026-11-09T00:18:00.000Z', where: 'doctorWebApp',
           msg: 'Scripts may only have up to 20 versioned deployments at a time.' }]
      : o.errs)
  }, o.props || {});
  ctx.updProps_ = () => ({
    getProperty: k => (k in ctx.props ? ctx.props[k] : null),
    setProperty: (k, v) => { ctx.props[k] = String(v); }
  });
  ctx.PropertiesService = { getScriptProperties: () => ctx.updProps_() };
  /*
   * ★時刻は、呼ぶたびに変える。
   *   いつも同じ字を返すと「時刻を指紋に混ぜている」まちがいが
   *   素通りします（実際、はじめのテストは素通りしました）。
   */
  let tick = 0;
  ctx.Utilities = { formatDate: () => '2026-11-09 05:' + (30 + (tick++)) };
  ctx.MimeType = { PLAIN_TEXT: 'text/plain' };
  ctx.logErr_ = () => {};
  ctx.UPD_DEPLOY_MAX = 20;
  ctx.CODE_VERSION = 'C082ver';
  ctx.UPD_VERSION = 'U150ver';
  ctx.ScriptApp = { getProjectTriggers: () => {
    if (o.trigThrows) throw new Error('権限がありません');
    return (o.trigs || ['panelWatch', 'panelOnEdit', 'venueDailyJob'])
      .map(n => ({ getHandlerFunction: () => n }));
  } };
  ctx.updWebAppUrl_ = () => (o.url === undefined ? 'https://x.test/exec' : o.url);
  ctx.updUrlAlive_ = () => !!o.alive;
  ctx.updApi_ = (p, m) => {
    if (o.apiThrows) throw new Error('使えません');
    if (p === '/versions') return { versions: [{ versionNumber: 280 }, { versionNumber: 279 }] };
    if (p === '/deployments') return { deployments: [
      { deploymentConfig: { versionNumber: 280 } }, { deploymentConfig: { versionNumber: 1 } },
      { deploymentConfig: { versionNumber: 0 } }
    ] };
    return {};
  };
  ctx.drive = { made: [], set: [], shared: 0 };
  const file = { setContent: t => { ctx.drive.set.push(t); return file; },
                 setSharing: () => { ctx.drive.shared++; return file; } };
  ctx.DriveApp = {
    getFilesByName: () => ({ hasNext: () => !!o.fileExists, next: () => file }),
    createFile: (n, t) => { if (o.driveThrows) throw new Error('一杯です');
                            ctx.drive.made.push({ n: n, t: t }); return file; }
  };
  vm.runInContext(part, ctx);
  return ctx;
}

console.log('■ 診るのに要るものが、ぜんぶ入っている');
{
  const c = build({});
  const t = c.updKarteBuild_().text;
  ok(t.indexOf('見張り：3こ') !== -1, '見張りの数', t.slice(0, 200));
  ok(t.indexOf('panelWatch') !== -1, '見張りの名前（何が欠けたか分かる）');
  ok(t.indexOf('最後に動いた') !== -1, '最後に動いた時刻');
  ok(t.indexOf('止まっているか：いいえ') !== -1, '止まっているかどうか');
  ok(t.indexOf('LINEの受け口') !== -1, '受け口の生き死に');
  ok(t.indexOf('https://x.test/exec') !== -1, '★受け口の住所（これで外から叩ける）');
  ok(t.indexOf('版：いちばん新しいのは 280') !== -1, '版の数（200で満杯）', t);
  ok(t.indexOf('公開：2こ') !== -1, '★公開の数（20で満杯・11/9に当たった所）', t);
  ok(t.indexOf('C082ver') !== -1 && t.indexOf('U150ver') !== -1, 'いまのコードの版');
  ok(t.indexOf('20 versioned deployments') !== -1, '★★直近のしくじりが、そのまま読める');
  ok(t.indexOf('doctorWebApp') !== -1, 'どこでしくじったかも分かる');
  ok(t.indexOf('共有していません') !== -1, '人に見えないことを、はっきり書く');
}

console.log('■ 止まっているときは、そう書く');
{
  const c = build({ props: { PANEL_WATCH_AT: String(Date.now() - 400 * 60000) } });
  ok(c.updKarteBuild_().text.indexOf('止まっているか：はい') !== -1, '★止まっていると書く');
}

console.log('■ 書くのは、中身が変わったときだけ');
{
  const c = build({});
  ok(c.updKartePublish_() === true, '1回目は書く');
  ok(c.drive.made.length === 1, 'ドライブに置いた');
  ok(c.drive.made[0].n === 'クロちゃんへの報告.txt', '名前が日本語で分かる', c.drive.made[0].n);
  ok(c.updKartePublish_() === false, '★2回目は書かない（中身が同じ）');
  ok(c.drive.made.length === 1, '★増やしていない', c.drive.made.length);

  // しくじりが増えたら、書き直す
  c.props['LAST_ERRORS'] = JSON.stringify([{ at: '2026-11-09T06:00:00.000Z',
    where: 'doctorDoor', msg: 'あたらしいしくじり' }]);
  ok(c.updKartePublish_() === true, '★中身が変われば、書き直す');
}

console.log('■ 時刻だけでは、書き直さない（毎回書くと持ち時間を食う）');
{
  const c = build({});
  const a = c.updKarteBuild_();
  const b = c.updKarteBuild_();
  ok(a.sig === b.sig, '★指紋に、書いた時刻を混ぜていない', [a.sig.length, b.sig.length]);
  ok(a.text.indexOf('書いた時刻') !== -1, '紙には時刻を書く（読む人のため）');
}

console.log('■ 共有の設定は、ぜったいに触らない');
{
  const c = build({});
  c.updKartePublish_();
  ok(c.drive.shared === 0, '★★★共有をいじっていない', c.drive.shared);
  ok(part.indexOf('setSharing') === -1, '★★★コードに setSharing が1つも無い');
  ok(part.indexOf('ANYONE') === -1, '★★「だれでも見られる」を1つも書いていない');
}

console.log('■ 同じ名前があれば、中身だけ入れ替える');
{
  const c = build({ fileExists: true });
  c.updKartePublish_();
  ok(c.drive.made.length === 0 && c.drive.set.length === 1, '増やさず、入れ替える');
}

console.log('■ 1か所 読めなくても、残りは書ける');
{
  const a = build({ trigThrows: true });
  const t = a.updKarteBuild_().text;
  ok(t.indexOf('見張り：調べられませんでした') !== -1, '見張りが読めなくても、そう書く');
  ok(t.indexOf('LINEの受け口') !== -1, '★残りは書けている');

  const b = build({ apiThrows: true });
  const t2 = b.updKarteBuild_().text;
  ok(t2.indexOf('版：調べられませんでした') !== -1, '版が読めなくても、そう書く');
  ok(t2.indexOf('直近のしくじり') !== -1, '★残りは書けている');

  const c = build({ driveThrows: true });
  ok(c.updKartePublish_() === false, 'ドライブに置けなければ、false（落ちない）');
}

console.log('■ お医者さんが、毎回 置き直しているか');
{
  const d = src.slice(src.indexOf('function updDoctorTick_'));
  ok(/updKartePublish_\(/.test(d), '★診るたびに、カルテを置き直す');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
