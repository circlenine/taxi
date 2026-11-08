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
  /* 公開の一覧（住所つき）。o.deps が無ければ空 */
  ctx.depsList = o.deps || [];
  ctx.updApi_ = (p, m, body) => {
    ctx.calls.push(m + ' ' + p);
    if (o.apiThrows) throw new Error('権限がありません');
    if (p === '/versions' && m === 'get') return { versions: (o.versions || []) };
    if (p === '/deployments' && m === 'get') return { deployments: ctx.depsList };
    if (/^\/deployments\/.+$/.test(p) && m === 'put') {
      if (o.putThrows) throw new Error('向け直せません');
      return { entryPoints: [{ webApp: { url: 'https://new.test/exec' } }] };
    }
    if (/^\/deployments\/.+$/.test(p) && m === 'delete') return {};
    if (p === '/deployments' && m === 'post') {
      if (o.deployThrows) {
        throw new Error('Scripts may only have up to 20 versioned deployments at a time.');
      }
      return { entryPoints: [{ webApp: { url: 'https://new.test/exec' } }] };
    }
    return {};
  };
  /* 版つきの公開を n 個 つくる（新しい順に 100, 99, …） */
  ctx.mkDeps = (n) => {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({ deploymentId: 'D' + i,
               deploymentConfig: { versionNumber: 100 - i, description: 'd' + i } });
    }
    return a;
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
  ok(c.calls.indexOf('get /deployments') !== -1, '先に、いまある公開を見る');
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

console.log('■ 住所が変わっていたら、作らずに見つけ直す（11/9に当たった所）');
{
  /*
   * ★2026/11/9、本当は生きているのに「死んでいます」と誤報していました。
   *   スクリプトが持っている住所が、昔の死んだもののままだったためです。
   *   そのせいで1時間おきに公開を作りつづけ、35こまで増やしました。
   */
  const c = build({ alive: false, versions: [{ versionNumber: 9 }],
                    props: { LINE_TOKEN: 'tok' },
                    deps: [{ deploymentId: 'D0',
                             deploymentConfig: { versionNumber: 9 },
                             entryPoints: [{ webApp: { url: 'https://new.test/exec' } }] }] });
  const r = c.updWebAppFix_();
  ok(r.fixed === true, '直った', r.text);
  ok(r.url === 'https://new.test/exec', '★生きている住所を見つけた', r.url);
  ok(c.calls.indexOf('post /deployments') === -1,
     '★★★新しく作っていない（ここで35こまで増えた）', c.calls);
  ok(c.calls.filter(x => x.indexOf('put /deployments/') === 0).length === 0,
     '★向け直してもいない（作りもいじりもしない）', c.calls);
  ok(c.props['UPD_LIVE_URL'] === 'https://new.test/exec',
     '★見つけた住所を覚える（次から先に見る）', c.props['UPD_LIVE_URL']);
  const line = c.fetched.filter(f => f.url.indexOf('api.line.me') !== -1)[0];
  ok(!!line && String(line.opt.payload).indexOf('https://new.test/exec') !== -1,
     '★★LINE側の登録も、新しい住所に書きかえる');
}

console.log('■ 覚えた住所を、次からは先に見る');
{
  const c = build({ alive: true, props: { UPD_LIVE_URL: 'https://new.test/exec' } });
  const r = c.updWebAppFix_();
  ok(r.fixed === false && r.text === '', '生きていれば、何もしない');
  ok(c.calls.length === 0, '★公開の一覧すら見にいかない（軽い）', c.calls);
}

/*
 * ★ここは、35こまで増えた公開を片づける係の検査です。
 *   いちばん大事なのは「いま使っている公開を消さないこと」。
 *   消すと受け口が落ちて、LINEが丸ごと止まります。
 *
 *   ★はじめに書いた検査には穴がありました（2026/11/9）。
 *     いま使っている公開を「いちばん新しいもの」に置いていたので、
 *     そこは そもそも消す範囲の外でした。
 *     つまり「消さない」という守りを、1度も試していませんでした。
 *     わざと守りを外しても、検査が通ってしまいました。
 *   ★なので、いま使っている公開を**いちばん古いところ**に置きます。
 *     ここは、まっ先に消される場所です。
 */
const manyDeps = function (liveAt) {
  const a = [];
  for (let i = 0; i < 35; i++) {
    a.push({ deploymentId: 'D' + i,
             deploymentConfig: { versionNumber: 100 - i },
             entryPoints: [{ webApp: { url: i === liveAt ? 'https://keep.test/exec'
                                                        : 'https://x' + i + '.test/exec' } }] });
  }
  return a;
};

console.log('■ 増えすぎた公開を、少しずつ片づける');
{
  const c = build({ alive: true, props: { UPD_LIVE_URL: 'https://keep.test/exec' } });
  // 35こ。★いま使っている住所を、いちばん古いところ（D34）に置く
  c.depsList = manyDeps(34);
  const cut = c.updTrimDeployments_();
  ok(cut === 5, '★1回に消すのは5つまで（まちがえても傷が小さい）', cut);
  const dels = c.calls.filter(x => x.indexOf('delete /deployments/') === 0);
  ok(dels.length === 5, '消した数が合っている', dels.length);
  ok(dels.indexOf('delete /deployments/D34') === -1,
     '★★★いま使っている公開は、ぜったいに消さない', dels);
  ok(dels[0] === 'delete /deployments/D33', '★古いほうから消す', dels[0]);
}

console.log('■ 新しいほうの5こには、手を付けない');
{
  const c = build({ alive: true, props: { UPD_LIVE_URL: 'https://keep.test/exec' } });
  c.depsList = manyDeps(0);          // いま使っている住所が、いちばん新しい
  c.updTrimDeployments_();
  const dels = c.calls.filter(x => x.indexOf('delete /deployments/') === 0);
  ok(dels.indexOf('delete /deployments/D0') === -1,
     '★いま使っている公開は、ここでも消さない', dels);
  ok(['D0', 'D1', 'D2', 'D3', 'D4'].every(
       d => dels.indexOf('delete /deployments/' + d) === -1),
     '★新しい5こは、1つも消さない', dels);
}

console.log('■ 少ないときは、1つも消さない');
{
  const c = build({ alive: true, props: { UPD_LIVE_URL: 'https://keep.test/exec' } });
  c.depsList = [1, 2, 3].map(i => ({ deploymentId: 'D' + i,
    deploymentConfig: { versionNumber: 100 - i },
    entryPoints: [{ webApp: { url: 'https://x' + i + '.test/exec' } }] }));
  ok(c.updTrimDeployments_() === 0, '★5こ以下なら、手を付けない');
  ok(c.calls.filter(x => x.indexOf('delete') === 0).length === 0, '1つも消していない');
}

console.log('■ 公開の枠（20）が満杯でも、直せること');
{
  /*
   * ★2026/11/9、実機でこう出ました。
   *   「Scripts may only have up to 20 versioned deployments at a time.」
   *   新しく作ろうとしていたので、毎回そこで止まっていました。
   *   いまある公開を「向け直す」なら、枠は増えません。
   */
  const c = build({ alive: false, versions: [{ versionNumber: 9 }],
                    deps: null, props: { LINE_TOKEN: 'tok' } });
  c.deps = null;
  const full = build({ alive: false, versions: [{ versionNumber: 9 }],
                       props: { LINE_TOKEN: 'tok' } });
  // 20個 満杯の状態を作る
  const ctxFull = build({ alive: false, versions: [{ versionNumber: 9 }],
                          props: { LINE_TOKEN: 'tok' }, deployThrows: true });
  ctxFull.deps = ctxFull.mkDeps(20);
  // 偽の一覧を返すように差し替え
  const base = ctxFull.updApi_;
  ctxFull.updApi_ = (p, m, b) => (p === '/deployments' && m === 'get')
    ? { deployments: ctxFull.deps } : base(p, m, b);
  const r = ctxFull.updWebAppFix_();
  ok(r.fixed === true, '★★満杯でも直せる（新しく作らない）', r.text);
  ok(ctxFull.calls.some(x => x.indexOf('put /deployments/') === 0),
     '★★★いまある公開を「向け直して」いる', ctxFull.calls);
  ok(ctxFull.calls.indexOf('post /deployments') === -1,
     '★★★新しくは作らない（ここで枠に当たっていた）', ctxFull.calls);
  ok(r.text.indexOf('向け直しました') !== -1, 'どう直したかを書く', r.text);
}

console.log('■ 向け直せないときだけ、古いのを1つ消して作る');
{
  const c = build({ alive: false, versions: [{ versionNumber: 9 }],
                    props: { LINE_TOKEN: 'tok' }, putThrows: true });
  c.deps = c.mkDeps(20);
  const base = c.updApi_;
  c.updApi_ = (p, m, b) => (p === '/deployments' && m === 'get')
    ? { deployments: c.deps } : base(p, m, b);
  const r = c.updWebAppFix_();
  const dels = c.calls.filter(x => x.indexOf('delete /deployments/') === 0);
  ok(dels.length === 1, '★消すのは1つだけ（消しすぎない）', dels);
  ok(dels[0].indexOf('D19') !== -1, '★消すのは いちばん古いもの', dels);
  ok(c.calls.indexOf('post /deployments') !== -1, 'そのあと、新しく作る');
  ok(r.fixed === true, '直った', r.text);
}

console.log('■ 公開が1つも無いときは、消さずに作る');
{
  const c = build({ alive: false, versions: [{ versionNumber: 9 }],
                    props: { LINE_TOKEN: 'tok' } });
  c.updWebAppFix_();
  ok(c.calls.filter(x => x.indexOf('delete') === 0).length === 0,
     '★1つも消さない', c.calls);
  ok(c.calls.indexOf('post /deployments') !== -1, '新しく作る');
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
