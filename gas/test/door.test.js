/**
 * 玄関（LINEの受け口）の住所を、外から読める所に置く係を確かめる。
 *   実行: node gas/test/door.test.js
 *
 * ★まーく様のご指示（2026/11/3）
 *   「仕組みづくりから見直して、クロちゃん側で
 *     ほぼ全自動で修正できる形にできませんか」
 *
 * ★いちばんの弱点は「止まったとき、外から入る道が1本も無い」ことでした。
 *   Apps Script で、見張りに頼らない入口は ウェブの受け口だけです。
 *   その住所さえ分かっていれば、こちらから叩いて戻せます。
 *   だから、住所をドライブとスプシに置きます。
 *
 * ★ここで必ず確かめること
 *   ・住所が変わったときだけ書く（毎回書くと持ち時間を食う）
 *   ・共有の設定を、ぜったいに触らない（売上の記録と同じ決まり）
 *   ・片方が書けなくても、もう片方は書く（止めない）
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
const B = src.indexOf('const DOOR_FILE');
const E = src.indexOf('const DR_EVERY_MIN');
ok(B > 0 && E > B, '005-Updater.gs に、玄関の係がある');
const part = src.slice(B, E);

function build(o){
  o = o || {};
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ctx.props = Object.assign({}, o.props || {});
  ctx.updProps_ = () => ({
    getProperty: k => (k in ctx.props ? ctx.props[k] : null),
    setProperty: (k, v) => { ctx.props[k] = String(v); }
  });
  ctx.logErr_ = () => {};
  ctx.PANEL_TAB = '説明';
  ctx.Utilities = { formatDate: () => '2026-11-03 16:10' };
  ctx.MimeType = { PLAIN_TEXT: 'text/plain' };
  ctx.ScriptApp = {
    getService: () => ({ getUrl: () => (o.url === undefined ? 'https://new.test/exec' : o.url) }),
    getScriptId: () => 'SID123'
  };

  ctx.drive = { made: [], set: [], shared: 0 };
  const file = {
    setContent: t => { ctx.drive.set.push(t); return file; },
    setSharing: () => { ctx.drive.shared++; return file; },
    getName: () => '受け口の住所.txt'
  };
  ctx.DriveApp = {
    getFilesByName: () => ({ hasNext: () => !!o.fileExists, next: () => file }),
    createFile: (n, t) => { if (o.driveThrows) throw new Error('ドライブが一杯です');
                            ctx.drive.made.push({ n: n, t: t }); return file; },
    Access: { ANYONE_WITH_LINK: 'x' }, Permission: { VIEW: 'y' }
  };

  ctx.cell = {};
  ctx.mainSS_ = () => {
    if (o.ssThrows) throw new Error('スプシが開けません');
    return { getSheetByName: n => (n === '説明' ? {
      getRange: a1 => ({
        setValue: v => { ctx.cell[a1] = v; },
        setNote: v => { ctx.cell[a1 + '.note'] = v; }
      })
    } : null) };
  };
  vm.runInContext(part, ctx);
  return ctx;
}

console.log('■ 住所を、2か所に置く');
{
  const c = build({});
  ok(c.updDoorPublish_() === true, '書いた');
  ok(c.drive.made.length === 1, 'ドライブに置いた', c.drive.made.length);
  ok(c.drive.made[0].n === '受け口の住所.txt', '名前が日本語で分かる', c.drive.made[0].n);
  ok(c.drive.made[0].t.indexOf('https://new.test/exec') !== -1, '中身に住所が入っている');
  ok(c.drive.made[0].t.indexOf('SID123') !== -1, 'スクリプトIDも入れる（作り直しのときに要る）');
  ok(c.drive.made[0].t.indexOf('共有はしていません') !== -1, '人に見えないことを、はっきり書く');
  ok(c.cell['CB1'] === 'https://new.test/exec', 'スプシにも置いた', c.cell['CB1']);
  ok(String(c.cell['CB1.note'] || '').indexOf('消さないで') !== -1, '消さないよう、メモを付ける');
  ok(c.props['UPD_DOOR_URL'] === 'https://new.test/exec', '次のために、覚えておく');
}

console.log('■ 共有の設定は、ぜったいに触らない（まーく様の売上の記録と同じ決まり）');
{
  const c = build({});
  c.updDoorPublish_();
  ok(c.drive.shared === 0, '★★★共有をいじっていない', c.drive.shared);
  ok(part.indexOf('setSharing') === -1, '★★★コードに setSharing が1つも無い');
  ok(part.indexOf('ANYONE') === -1, '★★「だれでも見られる」を1つも書いていない');
}

console.log('■ 変わっていなければ、書かない（持ち時間を食わない）');
{
  const c = build({ props: { UPD_DOOR_URL: 'https://new.test/exec' } });
  ok(c.updDoorPublish_() === false, '同じ住所なら、書かない');
  ok(c.drive.made.length === 0 && Object.keys(c.cell).length === 0, '1文字も書いていない');

  const c2 = build({ props: { UPD_DOOR_URL: 'https://old.test/exec' } });
  ok(c2.updDoorPublish_() === true, '★住所が変わったら、書き直す');
  ok(c2.cell['CB1'] === 'https://new.test/exec', '新しい住所になっている', c2.cell['CB1']);
}

console.log('■ 同じ名前のものがあれば、中身だけ入れ替える（増やさない）');
{
  const c = build({ fileExists: true });
  c.updDoorPublish_();
  ok(c.drive.made.length === 0, '新しくは作らない', c.drive.made.length);
  ok(c.drive.set.length === 1, '中身だけ入れ替える', c.drive.set.length);
}

console.log('■ 片方が書けなくても、もう片方は書く（止めない）');
{
  const c = build({ driveThrows: true });
  ok(c.updDoorPublish_() === true, 'ドライブがだめでも、落ちない');
  ok(c.cell['CB1'] === 'https://new.test/exec', '★スプシのほうは書けている', c.cell['CB1']);

  const c2 = build({ ssThrows: true });
  ok(c2.updDoorPublish_() === true, 'スプシがだめでも、落ちない');
  ok(c2.drive.made.length === 1, '★ドライブのほうは書けている');
}

console.log('■ 住所が分からないときは、何もしない');
{
  const c = build({ url: '' });
  ok(c.updDoorPublish_() === false, '書かない');
  ok(c.drive.made.length === 0 && Object.keys(c.cell).length === 0, '空の住所を置かない');
}

console.log('■ 外から叩かれたら、まるごと直す（見張りに頼らない入口）');
{
  const web = fs.readFileSync(path.join(__dirname, '..', 'parts', 'WebApp.gs'), 'utf8');
  const g = web.slice(web.indexOf('function doGet'), web.indexOf('function doGet') + 3000);
  ok(/updDoctorTick_\(\)/.test(g), '★★ページを開かれたら、まるごと診る');
  ok(/panelHealWatch_\(\)/.test(g), '　見張りの入れ直しも、そのまま残っている');

  const code = fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8');
  const pst = code.slice(code.indexOf('function doPost'), code.indexOf('function doPost') + 3000);
  ok(/updDoctorTick_\(\)/.test(pst), '★★LINEが届いても、まるごと診る');

  // 組み立て後のファイルにも入っていること（直し忘れると、本番に出ない）
  const built = fs.readFileSync(path.join(__dirname, '..', '004-WebApp.gs'), 'utf8');
  ok(/updDoctorTick_\(\)/.test(built), '★組み立て直したあとのものにも入っている');
}

console.log('■ お医者さんが、毎回 住所を置き直す');
{
  const d = src.slice(src.indexOf('function updDoctorTick_'));
  ok(/updDoorPublish_\(/.test(d), '★診るたびに、住所を置き直す');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
