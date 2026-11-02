/**
 * 自動のお医者さん（1時間に1回、自分で自分を診る係）を確かめる。
 *   実行: node gas/test/doctor.test.js
 *
 * ★まーく様のご指示（2026/11/2）
 *   「クロちゃん側で自動で修正できることは
 *     永続的に全て自動で行ってください」
 *
 * ★ここは、いちばん こわい係です。
 *   ・公開をやり直します
 *   ・LINE側の登録を書きかえます
 *   どちらも、まちがって動くと こちらから止めてしまいます。
 *   だから「生きているときは、ぜったいに何もしない」を
 *   いちばん厚く確かめます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');
const B = src.indexOf('const DR_EVERY_MIN');
const E = src.indexOf('/**\n * 1分おきの見張りが消えていたら');
ok(B > 0 && E > B, '005-Updater.gs に、お医者さんがいる');
const part = src.slice(B, E);

/** 偽の世界をつくる */
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
  ctx.PropertiesService = { getScriptProperties: () => ctx.updProps_() };
  ctx.Utilities = { formatDate: () => (o.today || '2026-11-02') };
  ctx.logErr_ = () => {};
  ctx.PANEL_TAB = '説明';

  ctx.said = [];
  ctx.updMe_ = () => 'Ume';
  ctx.lrPush_ = (to, msgs) => { ctx.said.push(msgs[0].text); };
  ctx.mainSS_ = () => ({ getSheetByName: () => ({}) });
  ctx.panelSay_ = () => {};

  ctx.ensured = o.ensured === undefined ? '見張り：ぜんぶ そろっています' : o.ensured;
  ctx.updEnsureAll_ = () => ctx.ensured;

  ctx.calls = [];
  ctx.fetched = [];
  ctx.ScriptApp = {
    getService: () => ({ getUrl: () => (o.url === undefined ? 'https://old.test/exec' : o.url) }),
    getScriptId: () => 'SID'
  };
  ctx.updApi_ = (p, m, body) => {
    ctx.calls.push(m + ' ' + p);
    if (o.apiThrows) throw new Error('権限がありません');
    if (p === '/versions' && m === 'get') return { versions: (o.versions || []) };
    if (p === '/deployments' && m === 'post') {
      if (o.deployThrows) throw new Error('デプロイが多すぎます');
      return { entryPoints: [{ webApp: { url: 'https://new.test/exec' } }] };
    }
    return {};
  };
  ctx.UrlFetchApp = { fetch: (url, opt) => {
    ctx.fetched.push({ url: url, opt: opt || {} });
    if (url.indexOf('api.line.me') !== -1) {
      return { getResponseCode: () => (o.lineCode === undefined ? 200 : o.lineCode) };
    }
    const alive = url.indexOf('new.test') !== -1 ? true : !!o.alive;
    if (o.fetchThrows) throw new Error('つながりません');
    return { getResponseCode: () => (alive ? 200 : 404) };
  } };
  vm.runInContext(part, ctx);
  return ctx;
}

console.log('■ 生きているときは、ぜったいに何もしない（いちばん大事）');
{
  const c = build({ alive: true, props: { LINE_TOKEN: 'tok' } });
  const r = c.updWebAppFix_();
  ok(r.fixed === false, '直したことにしない', r);
  ok(r.text === '', '何も言わない', r.text);
  ok(c.calls.length === 0, '★★公開をさわらない（APIを1回も呼ばない）', c.calls);
  ok(c.fetched.filter(f => f.url.indexOf('api.line.me') !== -1).length === 0,
     '★★★LINEの登録を、ぜったいに書きかえない', c.fetched.map(f => f.url));
}

console.log('■ 死んでいたら、公開し直してLINEにも登録し直す');
{
  const c = build({ alive: false, versions: [{ versionNumber: 3 }, { versionNumber: 7 }],
                    props: { LINE_TOKEN: 'tok' } });
  const r = c.updWebAppFix_();
  ok(r.fixed === true, '直した', r);
  ok(c.calls.indexOf('post /deployments') !== -1, '公開し直している', c.calls);
  ok(c.calls.indexOf('post /versions') === -1,
     '★★新しい版は作らない（200個で満杯でも通るように）', c.calls);
  ok(r.text.indexOf('版 7') !== -1, '★いちばん新しい版（7）で公開する', r.text);
  const line = c.fetched.filter(f => f.url.indexOf('api.line.me') !== -1)[0];
  ok(!!line, '★★LINEにも登録し直している');
  ok(line && line.opt.method === 'put', '書きかえの頼み方が正しい', line && line.opt.method);
  ok(line && String(line.opt.payload).indexOf('https://new.test/exec') !== -1,
     '★★★新しい住所を登録している', line && line.opt.payload);
  ok(r.text.indexOf('いままでどおり') !== -1, 'まーく様には「もう大丈夫」とだけ伝える');
}

console.log('■ LINEへの登録が断られたら、住所を出して頼む');
{
  const c = build({ alive: false, versions: [{ versionNumber: 2 }],
                    props: { LINE_TOKEN: 'tok' }, lineCode: 401 });
  const r = c.updWebAppFix_();
  ok(r.fixed === true, '公開そのものは直っている');
  ok(r.text.indexOf('https://new.test/exec') !== -1, '★新しい住所を、そのまま出す', r.text);
  ok(r.text.indexOf('Webhook URL') !== -1, '★どこに貼るかも書く');
}

console.log('■ LINEの鍵が無いとき');
{
  const c = build({ alive: false, versions: [{ versionNumber: 2 }], props: {} });
  const r = c.updWebAppFix_();
  ok(r.text.indexOf('鍵が無い') !== -1, '鍵が無いと分かる形で言う', r.text);
  ok(r.text.indexOf('https://new.test/exec') !== -1, '住所は出す（手で貼れるように）');
}

console.log('■ 直せないときは、黙らない');
{
  const c1 = build({ alive: false, versions: [] });
  ok(c1.updWebAppFix_().text.indexOf('公開できる版がありません') !== -1, '版が無いときは、そう言う');
  ok(c1.calls.indexOf('post /deployments') === -1, '版が無いのに公開しようとしない', c1.calls);

  const c2 = build({ alive: false, apiThrows: true });
  ok(c2.updWebAppFix_().text.indexOf('版を調べられませんでした') !== -1, '調べられなければ、そう言う');

  /*
   * ★鍵（LINE_TOKEN）を必ず入れておきます。
   *   鍵が無いと、書きかえる手前で帰ってしまい、
   *   「書きかえていない」が **別の理由で** 通ってしまいます。
   *   実際、はじめに書いたテストは それで素通りしました。
   */
  const c3 = build({ alive: false, versions: [{ versionNumber: 1 }], deployThrows: true,
                     props: { LINE_TOKEN: 'tok' } });
  const r3 = c3.updWebAppFix_();
  ok(r3.fixed === false && r3.text.indexOf('公開し直せませんでした') !== -1,
     '公開に失敗したら、そう言う', r3.text);
  ok(c3.fetched.filter(f => f.url.indexOf('api.line.me') !== -1).length === 0,
     '★公開できていないのに、LINEの登録を書きかえない');
}

console.log('■ 1時間に1回だけ動く');
{
  const c = build({ alive: true });
  ok(c.updDoctorTick_() === true, '1回目は動く');
  ok(c.updDoctorTick_() === false, '★すぐにもう一度 呼んでも、動かない');
  c.props['UPD_DR_AT'] = String(Date.now() - 61 * 60 * 1000);
  ok(c.updDoctorTick_() === true, '1時間たてば、また動く');
}

console.log('■ ふだんは、1通も出さない');
{
  const c = build({ alive: true });
  c.updDoctorTick_();
  ok(c.said.length === 0, '★直すものが無ければ、何も言わない', c.said);
}

console.log('■ 直したときだけ知らせる（同じ中身は1日1回）');
{
  const c = build({ alive: false, versions: [{ versionNumber: 5 }],
                    props: { LINE_TOKEN: 'tok' } });
  c.updDoctorTick_();
  ok(c.said.length === 1, '直したら、1通 知らせる', c.said.length);
  ok(c.said[0].indexOf('受け口') !== -1, '中身が分かる', c.said[0]);
  // 同じ日に、同じ中身をもう一度
  c.props['UPD_DR_AT'] = '0';
  c.updDoctorTick_();
  ok(c.said.length === 1, '★同じ日に、同じことを二度 言わない', c.said.length);
}

console.log('■ 見張りを立て直したときも、知らせる');
{
  const c = build({ alive: true, ensured: '見張り：立てました（そうさボタン）' });
  c.updDoctorTick_();
  ok(c.said.length === 1 && c.said[0].indexOf('立てました') !== -1,
     '立て直したことを伝える', c.said);
}

console.log('■ 見張りから、ちゃんと呼んでいるか');
{
  const w = src.slice(src.indexOf('function panelWatch()'),
                      src.indexOf('function panelWatch()') + 4000);
  ok(/updDoctorTick_\(\)/.test(w), '3分おきの見張りから、お医者さんを呼んでいる');
  const fx = src.slice(src.indexOf('function fixAll'), src.indexOf('function fixAll') + 7000);
  ok(/updWebAppFix_\(\)/.test(fx), '「なおす」でも、受け口を直す');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
