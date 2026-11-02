/**
 * 「二度と止まらない」ための3つを確かめる。
 *   実行: node gas/test/nevstop.test.js
 *
 * ★まーく様のご指摘（2026/11/2）
 *   「記録用スプシも、10/16/22:21で全て止まってます」
 *   「F列の○サインも全く機能してないので、確認の意味が全くありません」
 *
 * ★止まったときに いちばん困るのは、
 *   止まったことに だれも気づけないことです。
 *   ここで押さえるのは、その3つです。
 *     ① 見張りを立て直すとき、1つも無い状態を作らない
 *     ② 信号は「数式」。コードが動かなくても、ひとりでに赤くなる
 *     ③ 数式の境目と、文の境目が食いちがわない
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

const src = fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8');

/* ================================================================
 *  ① 見張りを立て直すとき、1つも無い状態を作らない
 * ================================================================ */
console.log('■ 見張りを立て直すとき、1つも無い状態を作らない（いちばん大事）');
{
  const B = src.indexOf('function panelInstall_()');
  const E = src.indexOf('/** 見張りを止める');
  ok(B > 0 && E > B, 'panelInstall_ がある');
  const body = src.slice(B, E);

  // 作るところが、消すところより「先」に来ていること
  const mkEdit = body.indexOf('newTrigger("panelOnEdit")');
  const mkWat  = body.indexOf('newTrigger("panelWatch")');
  const del    = body.lastIndexOf('deleteTrigger');
  const delOld = body.indexOf('old.forEach');
  ok(mkEdit > 0 && mkWat > mkEdit, '2つとも作っている', { mkEdit, mkWat });
  ok(delOld > mkWat, '★★古いほうを消すのは、新しいものを作ったあと', { mkWat, delOld });
  ok(/catch[\s\S]{0,400}throw new Error/.test(body),
     '★★作れなかったときは、黙らずに しくじりを投げる');
  ok(body.indexOf('古いほうは、そのまま残しました') !== -1,
     '★★作れなかったときは、古いほうを残す（止めないため）');
  ok(body.indexOf('updSweepDeadTriggers_') !== -1,
     '先に、中身の無い見張りを片づけて 席を空ける');

  // 実際に動かして確かめる
  function run(opts){
    const o = opts || {};
    const ctx = { console };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    const live = [];
    const trg = (name) => ({ f: name, getHandlerFunction: () => name });
    o.start = o.start || [];
    o.start.forEach(f => live.push(trg(f)));
    ctx.mainSS_ = () => ({});
    ctx.PANEL_WATCH_MIN = 3;
    ctx.updSweepDeadTriggers_ = () => ({ gone: [], text: '' });
    let madeN = 0;
    const mk = (name) => ({
      forSpreadsheet: () => mk(name), onEdit: () => mk(name),
      timeBased: () => mk(name), everyMinutes: () => mk(name),
      create: () => {
        madeN++;
        if (o.failOn && madeN >= o.failOn) throw new Error('トリガーが多すぎます');
        const t = trg(name); live.push(t); return t;
      }
    });
    ctx.ScriptApp = {
      getProjectTriggers: () => live.slice(),
      newTrigger: (name) => mk(name),
      deleteTrigger: (t) => { const i = live.indexOf(t); if (i >= 0) live.splice(i, 1); }
    };
    // 本物の中身を、偽の見張りで動かす
    vm.runInContext(body.slice(0, body.lastIndexOf('}') + 1), ctx);
    let err = null;
    try { ctx.panelInstall_(); } catch (e) { err = e; }
    return { live: live.map(t => t.f), err: err };
  }

  const okCase = run({ start: ['panelOnEdit', 'panelWatch'] });
  ok(!okCase.err, 'ふつうは、しくじらない');
  ok(okCase.live.length === 2 &&
     okCase.live.indexOf('panelOnEdit') !== -1 && okCase.live.indexOf('panelWatch') !== -1,
     '立て直したあとは、2つだけ残る', okCase.live);

  const ng1 = run({ start: ['panelOnEdit', 'panelWatch'], failOn: 1 });
  ok(!!ng1.err, '★作れなかったら、しくじりを返す');
  ok(ng1.live.length === 2, '★★1つめで しくじっても、古い2つは残っている', ng1.live);

  const ng2 = run({ start: ['panelOnEdit', 'panelWatch'], failOn: 2 });
  ok(!!ng2.err, '★2つめで しくじっても、しくじりを返す');
  ok(ng2.live.length === 2 &&
     ng2.live.indexOf('panelOnEdit') !== -1 && ng2.live.indexOf('panelWatch') !== -1,
     '★★★2つめで しくじっても、古い2つは残る（ここが 2026/10/16 の事故）', ng2.live);

  const none = run({ start: [], failOn: 1 });
  ok(none.live.length === 0, '　もともと無いときに しくじっても、増えも減りもしない', none.live);
}

/* ================================================================
 *  ② 信号は「数式」。コードが動かなくても、ひとりでに赤くなる
 * ================================================================ */
console.log('■ 信号は、コードが止まっても ひとりでに赤くなる');
{
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const B = src.indexOf('const PANEL_BEAT_CELL');
  const E = src.indexOf('function panelLamp_(sh, now, force)');
  ok(B > 0 && E > B, '数式を作る係がある');
  // 境目の数は、本体から読む
  vm.runInContext(src.slice(src.indexOf('const PANEL_LAMP_ROW'),
                            src.indexOf('const PANEL_LAMP_MK_KEY')), ctx);
  vm.runInContext(src.slice(B, E), ctx);
  const f = ctx.panelLampFormula_();

  ok(f.indexOf('=IF(') === 0, '数式の形になっている', f.slice(0, 20));
  ok((f.match(/NOW\(\)/g) || []).length >= 3,
     '★★「いまの時刻」を見ている（だから、ひとりでに赤くなる）');
  ok(f.indexOf('🔴 停止') !== -1 && f.indexOf('🟠 失敗') !== -1 &&
     f.indexOf('🟡 遅延') !== -1 && f.indexOf('🟢 順調') !== -1 && f.indexOf('⚪ 不明') !== -1,
     '5つの顔が ぜんぶ入っている');
  ok(f.indexOf('TEXT(BZ1,"M/D HH:MM")') !== -1,
     '★止まったときは「いつ止まったか」を 月日つきで出す', f);
  ok(f.indexOf('BZ1') !== -1 && f.indexOf('CA1') !== -1, '控えのらんを見ている', f);
}

/* ================================================================
 *  ③ 数式の境目と、文の境目が食いちがわない
 * ================================================================ */
console.log('■ 数式の境目と、文の境目が そろっている');
{
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src.slice(src.indexOf('const PANEL_LAMP_ROW'),
                            src.indexOf('const PANEL_LAMP_MK_KEY')), ctx);
  vm.runInContext(src.slice(src.indexOf('const PANEL_BEAT_CELL'),
                            src.indexOf('function panelLamp_(sh, now, force)')), ctx);
  const f = ctx.panelLampFormula_();
  // ★決まりの数は、本体の字から読みます（テストに書き写すと、ずれます）
  const num = (name) => {
    const m = src.match(new RegExp('const\\s+' + name + '\\s*=\\s*(\\d+)'));
    return m ? m[1] : '(読めません)';
  };
  const DEAD = num('PANEL_LAMP_DEAD'), LATE = num('PANEL_LAMP_LATE'), ERRH = num('PANEL_LAMP_ERR_H');
  ok(f.indexOf('>' + DEAD + '/1440') !== -1,
     '★停止の境目（' + DEAD + '分）が、数式と同じ', f);
  ok(f.indexOf('>' + LATE + '/1440') !== -1,
     '★遅延の境目（' + LATE + '分）が、数式と同じ');
  ok(f.indexOf('<' + ERRH + '/24') !== -1,
     '★失敗を見る長さ（' + ERRH + '時間）が、数式と同じ');
  // 数字を決め打ちで書いていないこと（片方だけ直すと食いちがうため）
  const body = src.slice(src.indexOf('function panelLampFormula_'),
                         src.indexOf('function panelBeatCells_'));
  ok(body.indexOf('PANEL_LAMP_DEAD') !== -1 && body.indexOf('PANEL_LAMP_LATE') !== -1 &&
     body.indexOf('PANEL_LAMP_ERR_H') !== -1,
     '★★数式は、境目の数を決め打ちせず、本体の決まりから作っている');
}

/* ================================================================
 *  ④ 同じ作りが、どこにも残っていないこと
 *
 *  ★「先に消してから、作る」は、どのファイルにあっても同じ事故を起こします。
 *    だから、コード全部を見て、残っていないことを確かめます。
 *    新しく書くときも、ここで引っかかります。
 * ================================================================ */
console.log('■ 「先に消してから作る」が、どこにも残っていない');
{
  const dir = path.join(__dirname, '..');
  /*
   * ここだけは例外。
   *   trgSwap_          … 入れ替えの係そのもの（ここが順番を守っている）
   *   panelInstall_     … 上で中身まで動かして確かめている
   *   updSweepDeadTriggers_ … 消すだけの係（作らない）
   */
  const SKIP = ['trgSwap_', 'panelInstall_', 'updSweepDeadTriggers_'];
  let checked = 0, bad = [];
  fs.readdirSync(dir).filter(f => /\.gs$/.test(f)).forEach(function (f) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    code.split(/\n(?=function\s)/).forEach(function (body) {
      const m = body.match(/^function\s+([A-Za-z0-9_$]+)/);
      if (!m) return;
      const name = m[1];
      if (SKIP.indexOf(name) !== -1) return;
      if (body.indexOf('newTrigger') < 0 || body.indexOf('deleteTrigger') < 0) return;
      checked++;
      // 作るのと消すのが同じ係の中にあるなら、入れ替えの係を通していること
      if (!/trgSwap_\(/.test(body)) bad.push(f + ' の ' + name);
    });
  });
  ok(checked > 0, '見張りを作って消している係を、ちゃんと見つけている（' + checked + '件）');
  ok(bad.length === 0,
     '★★★ぜんぶ 入れ替えの係（trgSwap_）を通している', bad);
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
