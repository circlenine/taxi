/**
 * 情報あつめ用のグループへ、こちらから1文字も出さないことを確かめる。
 *   実行: node gas/test/nosend.test.js
 *
 * ★まーく様のご指示（2026/11/9）
 *   「このグループはあくまで情報収集用ですので、
 *     このグループにこちらからなにか送信することは絶対にやめてください」
 *
 * ★なにが危なかったか
 *   送り先のグループを、**あとから届いたグループで上書き**していました。
 *   公式アカウントが情報あつめ用のグループに入れられて、
 *   そこで1回しゃべられたら、その日の16:30のお知らせは
 *   **そのグループへ飛びます**。しかも、だれも気づけません。
 *
 * ★止め方は2つ重ねます（1つだと、いつか すり抜ける）
 *   ① いちど決まった送り先は、ひとりでに変えない
 *   ② 送る手前で、名ざしで止める（NG_GROUP_IDS）
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-globals.js'), 'utf8'), ctx);

let props = {};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; } }) };
vm.runInContext('function logErr_(){} function infoGet_(){return "";} function infoSet_(){}' +
                ' var INFO_ROW = { GROUP: 1 };', ctx);

const code = fs.readFileSync(path.join(__dirname, '..', '001-Code.gs'), 'utf8');
// 001-Code.gs から、確かめたい2つの係だけを取り出して動かす
const pick = name => {
  const i = code.indexOf('\nfunction ' + name + '(');
  const j = code.indexOf('\nfunction ', i + 1);
  return code.slice(i, j > 0 ? j : undefined);
};
vm.runInContext(pick('rememberGroupId_'), ctx);
vm.runInContext(pick('lineBlockedTo_'), ctx);
const remember = vm.runInContext('rememberGroupId_', ctx);
const blocked  = vm.runInContext('lineBlockedTo_', ctx);

let fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) console.log('ok  ', msg);
  else { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
};
const grp = id => ({ source: { type: 'group', groupId: id } });

console.log('■ いちど決まった送り先は、ひとりでに変わらない');
{
  props = {};
  remember(grp('Gいつもの'));
  ok(props.GROUP_ID === 'Gいつもの', '　 はじめの1回だけは、覚えてよい', props.GROUP_ID);

  remember(grp('G情報あつめ'));
  ok(props.GROUP_ID === 'Gいつもの',
     '★★★別のグループが来ても、送り先は変えない', props.GROUP_ID);
  ok(String(props.GROUP_ID_OTHER || '').indexOf('G情報あつめ') !== -1,
     '★黙らない（別のグループから届いたことは控える）', props.GROUP_ID_OTHER);

  remember(grp('Gいつもの'));
  ok(props.GROUP_ID === 'Gいつもの', '　 同じグループなら、そのまま');
}

console.log('■ 送ってはいけない相手は、送る手前で止まる');
{
  props = { NG_GROUP_IDS: 'G情報あつめ, Gもうひとつ' };
  ok(blocked('G情報あつめ') === true, '★★★名ざしの相手は止める');
  ok(blocked('Gもうひとつ') === true, '　 2つめも止める');
  ok(blocked('Gいつもの') === false, '　 ふだんの送り先は止めない');
  props = {};
  ok(blocked('Gいつもの') === false, '　 控えが空なら、止めない（ふだんの動きを邪魔しない）');
  ok(blocked('') === false, '　 空の相手は、そもそも止める話ではない');
}

console.log('■ LINEへ送る道は、必ずこの関所を通る');
{
  const rep = fs.readFileSync(path.join(__dirname, '..', '003-LineReport.gs'), 'utf8');
  const i = rep.indexOf('\nfunction lrPush_(');
  const j = rep.indexOf('\nfunction ', i + 1);
  const body = rep.slice(i, j);
  ok(body.indexOf('lineBlockedTo_') !== -1,
     '★★★lrPush_（送る係）の中で、必ず確かめている');
  ok(body.indexOf('lineBlockedTo_') < body.indexOf('UrlFetchApp'),
     '★★★確かめるのは、送る前（あとで確かめても遅い）');
}

console.log(fail ? ('\n☓ ' + fail + '件 こけました') : '\n全テスト通過');
process.exit(fail ? 1 : 0);
