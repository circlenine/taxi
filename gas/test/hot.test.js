/**
 * 「いまアツい」（つけ待ち台帳ウェブの新しい画面）を確かめる。
 *   実行: node gas/test/hot.test.js
 *
 * ★まーく様のご指示（2026/10/27）
 *   「大阪タクシー狙い目エリアで リアルタイムでの人の集中してる
 *     ところを割り出して 今はここがアツいポイントを、
 *     手軽にわかりやすく可視化できるようにしてください」
 *
 * ★ここでいちばん大事なのは、数字で嘘をつかないことです。
 *   1件しかない場所を「平均」として出すと、
 *   それを見て走った人の1日の売上が変わります。
 *   だから「3件未満は出さない」を、テストで押さえます。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const WEB = path.join(__dirname, '..', '..', 'web');
const appSrc   = fs.readFileSync(path.join(WEB, 'app.js'), 'utf8');
const sharedSrc= fs.readFileSync(path.join(WEB, 'shared.js'), 'utf8');
const htmlSrc  = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
const cssSrc   = fs.readFileSync(path.join(WEB, 'style.css'), 'utf8');

let fail = 0;
const ok = (cond, msg, extra) => {
  if (!cond) { fail++; console.log('NG  ', msg, extra === undefined ? '' : '… 実際: ' + JSON.stringify(extra)); }
  else console.log('ok  ', msg);
};

/* ---- 「いまアツい」のところだけを切り出して動かす ---- */
const B = appSrc.indexOf('いまアツい（ここから）');
const E = appSrc.indexOf('いまアツい（ここまで）');
ok(B > 0 && E > B, 'app.js に「いまアツい」の区切りがある');
// 見出しのコメントの終わりから、終わりの見出しのコメントの始まりまで
const hotSrc = appSrc.slice(appSrc.indexOf('*/', B) + 2, appSrc.lastIndexOf('/* ===', E));

const ctx = { console, fetch: () => { throw new Error('通信しない'); } };
ctx.window = { supabase: { createClient: () => ({ auth: {}, from: () => ({}) }) },
               SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' };
ctx.document = { body: {}, querySelector: () => null, getElementById: () => null };
ctx.location = { replace: () => {} };
vm.createContext(ctx);
vm.runInContext(sharedSrc, ctx);           // yen / fmtT / fmtD / pad / WD / rate / esc
vm.runInContext(`
  var REC = [], tab = 'hot', drawn = 0;
  function visible(){ return REC; }
  function render(){ drawn++; }
  function filterChips(){ return '<!--chips-->'; }
`, ctx);
vm.runInContext(hotSrc, ctx);

const H = ctx;
const set = rs => { ctx.REC = rs; };

/* 記録を1件つくる。dep は記録と同じ数え方（翌1時＝25） */
let seq = 0;
const rec = (date, dep, place, fare, wait, ride) => ({
  id: 'r' + (++seq), user_id: 'u1', date, place, dep,
  fare: fare === undefined ? 6000 : fare,
  wait: wait === undefined ? 20 : wait,
  ride: ride === undefined ? 20 : ride,
  method: '', note: '', who: 'ﾏｰｸ'
});

console.log('■ 夜の種類（金土・日・平日）');
{
  ok(H.dayKind('2026-10-30') === '金土', '金曜の夜は 金土', H.dayKind('2026-10-30'));
  ok(H.dayKind('2026-10-31') === '金土', '土曜の夜は 金土', H.dayKind('2026-10-31'));
  ok(H.dayKind('2026-11-01') === '日',   '日曜の夜は 日',   H.dayKind('2026-11-01'));
  ok(H.dayKind('2026-11-02') === '平日', '月曜の夜は 平日', H.dayKind('2026-11-02'));
  ok(H.dayKind('') === '平日', '日付が空でも落ちない');
}

console.log('■ 時計は回る（23時と翌1時は2時間ちがい）');
{
  ok(H.hotDist(23, 25) === 2, '23時と25時（翌1時）は2時間', H.hotDist(23, 25));
  ok(H.hotDist(12, 31) === 5, '正午と翌7時は5時間', H.hotDist(12, 31));
  ok(H.hotDist(22, 22.5) === 0.5, '30分は0.5');
}

console.log('■ いまが何時で、どの夜か');
{
  // 2026/10/28(水) 01:30 → 記録の数え方では 25.5 時。営業日は前日の火曜
  const c = H.hotNow(new Date(2026, 9, 28, 1, 30));
  ok(Math.abs(c.h - 25.5) < 1e-9, '深夜1時半は 25.5 時', c.h);
  ok(c.date === '2026-10-27', '朝6時までは前の日の夜', c.date);
  ok(c.kind === '平日', '火曜の夜は平日', c.kind);
  const c2 = H.hotNow(new Date(2026, 9, 30, 23, 0));
  ok(c2.h === 23 && c2.date === '2026-10-30' && c2.kind === '金土', '金曜23時は金土の夜', c2);
}

console.log('■ 昼や朝に開いたとき（乗務の時間ではないとき）');
{
  // 15:00 … まだ出庫前。18時台の見当にそろえる
  const c = H.hotNow(new Date(2026, 9, 28, 15, 0));
  ok(c.early === true, '昼は「乗務の時間ではない」とみなす', c);
  ok(c.ah === 18, '18時台の見当にそろえる', c.ah);
  ok(c.clock === '15:00', '画面にはふつうの時計の字を出す', c.clock);
  // 朝8時 … 夜が明けている。やはり きょうの夜の見当
  const c2 = H.hotNow(new Date(2026, 9, 28, 8, 42));
  ok(c2.early === true && c2.ah === 18, '朝も、きょうの夜の見当にそろえる', c2);
  ok(c2.clock === '08:42', '「32:42」のような字を出さない', c2.clock);
  // 深夜1時 … まさに乗務中。そのままの時刻で引く
  const c3 = H.hotNow(new Date(2026, 9, 28, 1, 30));
  ok(c3.early === false && Math.abs(c3.ah - 25.5) < 1e-9, '乗務中は、いまの時刻で引く', c3);
  ok(c3.clock === '01:30', '深夜も時計の字はそのまま', c3.clock);

  set([
    rec('2026-10-27', 18.2, 'E', 9000), rec('2026-10-20', 18.0, 'E', 9000), rec('2026-10-13', 17.9, 'E', 9000)
  ]);
  const html = H.paneHot(new Date(2026, 9, 28, 15, 0));
  ok(html.indexOf('E</b>') !== -1, '昼に開いても、夜の見当が出る');
  ok(html.indexOf('まだ乗務の時間ではないので') !== -1, 'そろえたことを、画面に書く');
  ok(html.indexOf('32:') === -1, '32時のような字を画面に出さない');
}

console.log('■ 3件未満は「平均」として出さない（いちばん大事）');
{
  // A は4件、B は2件。どちらも平日の夜25時台
  set([
    rec('2026-10-27', 25.0, 'A', 9000), rec('2026-10-20', 25.2, 'A', 9000),
    rec('2026-10-13', 24.9, 'A', 9000), rec('2026-10-06', 25.1, 'A', 9000),
    rec('2026-10-27', 25.0, 'B', 30000), rec('2026-10-20', 25.0, 'B', 30000)
  ]);
  const c = H.hotNow(new Date(2026, 9, 28, 1, 0));
  const got = H.hotBest(c);
  ok(got.rows.length === 1 && got.rows[0].p === 'A', '件数の足りた A だけが出る', got.rows.map(r => r.p));
  ok(got.thin.some(x => x.p === 'B'), '2件の B は「参考」に回る');
  ok(got.loose === false, 'ちょうどこの時間の記録で足りている');

  const html = H.paneHot(new Date(2026, 9, 28, 1, 0));
  ok(html.indexOf('>A<') !== -1 || html.indexOf('A</b>') !== -1, '画面に A が出る');
  const cards = html.split('class="hotc').slice(1).join('');
  ok(cards.indexOf('>B<') === -1 && cards.indexOf('B</b>') === -1,
     '2件しかない B を、大きなカードに出さない');
  ok(html.indexOf('いま何人いるかを測っているのではありません') !== -1,
     '「人の多さではない」と、画面に必ず書く');
  ok(html.indexOf('根拠：') !== -1, '何を根拠にしたかを書く');
  ok(html.indexOf('終演の15分前') !== -1, '催しがある夜は終演の15分前が先、と書く');
}

console.log('■ 記録が足りないときは、条件をゆるめる（そして、ゆるめたと書く）');
{
  // 金土の夜の記録しかない。いまは平日の夜
  set([
    rec('2026-10-30', 25.0, 'C', 9000), rec('2026-10-31', 25.0, 'C', 9000),
    rec('2026-10-24', 25.0, 'C', 9000)
  ]);
  const c = H.hotNow(new Date(2026, 9, 28, 1, 0));   // 火曜の夜
  const got = H.hotBest(c);
  ok(got.rows.length === 1 && got.loose === true, 'ゆるめて拾う', got);
  ok(got.basis.indexOf('曜日を問わず') !== -1, 'ゆるめた根拠を書く', got.basis);
  ok(H.paneHot(new Date(2026, 9, 28, 1, 0)).indexOf('少し広げました') !== -1, '画面にも「広げた」と出す');
}

console.log('■ 記録がまったく無いとき');
{
  set([]);
  const html = H.paneHot(new Date(2026, 9, 28, 1, 0));
  ok(html.indexOf('たまっていません') !== -1, '空でも落ちず、足りないと書く');
  ok(html.indexOf('たまたまの1本') !== -1, '1件を平均と呼ばない理由も書く');
}

console.log('■ 翌4時までの見当（ご指示・2026/11/12）');
{
  set([
    rec('2026-10-27', 25.0, 'A', 9000), rec('2026-10-20', 25.0, 'A', 9000), rec('2026-10-13', 25.0, 'A', 9000),
    rec('2026-10-27', 27.0, 'D', 9000), rec('2026-10-20', 27.0, 'D', 9000), rec('2026-10-13', 27.0, 'D', 9000)
  ]);
  const c = H.hotNow(new Date(2026, 9, 28, 1, 0));   // 25時
  const plan = H.hotPlan(c);
  /* ★25時から翌4時（28時）まで。3時間だけでは、夜のうしろ半分が見えません */
  ok(plan.length === 4, '25時から4時台まで、4つ返す', plan.length);
  ok(plan[plan.length - 1].h === 4, '最後は4時台', plan[plan.length - 1].h);
  const c18 = { h: 18, date: '2026-10-28', kind: '平日' };
  ok(H.hotPlan(c18).length === 11, '18時からなら、18〜4時の11こ', H.hotPlan(c18).length);
  ok(plan[0].top && plan[0].top.p === 'A', 'いまは A', plan[0].top && plan[0].top.p);
  ok(plan[2].top && plan[2].top.p === 'D', '2時間後は D', plan[2].top && plan[2].top.p);
  ok(plan[1].h === 2, '26時は「2時台」と出す', plan[1].h);
}

console.log('■ 見出しの字（「いま」と書いてよいのは乗務中だけ）');
{
  const plan = [{ h: 18, top: null }, { h: 19, top: null }, { h: 20, top: null }];
  const now  = H.hotPlanCard(plan, false);
  const soon = H.hotPlanCard(plan, true);
  ok(now.indexOf('いま</small>') !== -1, '乗務中は「いま」と書く');
  ok(soon.indexOf('いま</small>') === -1 && soon.indexOf('18時台') !== -1,
     '出庫前は「いま」と書かず、時刻で書く');
}

console.log('■ 隠したものは、ちゃんと消える');
{
  ok(/\[hidden\]\{display:none!important\}/.test(cssSrc),
     '「読み込んでいます…」が、読み込みのあと残らない');
}

console.log('■ 天気（気象庁の公開データ）');
{
  const j = [{ timeSeries: [
    { timeDefines: ['2026-10-28T17:00:00+09:00'],
      areas: [{ area: { name: '大阪府' }, weathers: ['くもり　時々　雨'] }] },
    { timeDefines: ['2026-10-28T18:00:00+09:00', '2026-10-29T00:00:00+09:00'],
      areas: [{ area: { name: '大阪府' }, pops: ['60', '20'] }] }
  ] }];
  const w = H.wxRead(j, new Date('2026-10-28T19:00:00+09:00'));
  ok(w.ok === true && w.rain === true, '「雨」の字があれば雨と見る', w);
  ok(w.pop === 60, 'いまの時間帯の降水確率を取る', w.pop);
  ok(w.text.indexOf('　') === -1, '全角の空きは詰める', w.text);
  ok(H.wxLine(w).indexOf('雨') !== -1, '雨のときは、ひとこと出す');

  const j2 = JSON.parse(JSON.stringify(j));
  j2[0].timeSeries[0].areas[0].weathers = ['晴れ'];
  j2[0].timeSeries[1].areas[0].pops = ['10', '0'];
  const w2 = H.wxRead(j2, new Date('2026-10-28T19:00:00+09:00'));
  ok(w2.rain === false, '晴れ・降水10%なら雨にしない', w2);

  ok(H.wxRead({}).ok === false, '形がちがっても落ちない');
  ok(H.wxLine({ ok: false }).indexOf('取れませんでした') !== -1,
     '読めなかったときは、黙らずに「取れなかった」と出す');
  ok(H.wxLine(null).indexOf('読んでいます') !== -1, '読み込み中も、何か出す');
}

console.log('■ 天気が取れなくても、ほかはそのまま出る');
{
  set([
    rec('2026-10-27', 25.0, 'A', 9000), rec('2026-10-20', 25.0, 'A', 9000), rec('2026-10-13', 25.0, 'A', 9000)
  ]);
  vm.runInContext('hotWx = { ok:false };', ctx);
  const html = H.paneHot(new Date(2026, 9, 28, 1, 0));
  ok(html.indexOf('取れませんでした') !== -1 && html.indexOf('A</b>') !== -1,
     '天気が×でも、場所は出る');
}

console.log('■ 地図は「さがす」形（番地まで当てない）');
{
  const u = H.hotMap('新地7');
  ok(u.indexOf('https://www.google.com/maps/search/?api=1&query=') === 0, '検索の形', u);
  ok(u.indexOf(encodeURIComponent('大阪 新地7')) !== -1, '大阪を付けてさがす', u);
}

console.log('■ 画面への組み込み（押すところ・描くところ）');
{
  ok(/data-t="hot"/.test(htmlSrc), 'index.html に「今の狙い目」の押しどころがある');
  ok(/data-t="hot"[^>]*><b>狙い目</.test(htmlSrc), '押しどころの名前は「狙い目」');
  ok(/<h2>今の狙い目<\/h2>/.test(appSrc), '画面の題は「今の狙い目」');
  ok(/hot\s*:\s*paneHot/.test(appSrc), 'app.js が hot のときに paneHot を描く');
  ok(/loadWx\(\)/.test(appSrc), '起動のときに天気を読む');
  ok(/setInterval\(/.test(appSrc), '時刻が変わったら描き直す');
}

console.log('■ 細い画面でも横スクロールしない（まーく様に一度ご迷惑をかけた所）');
{
  ok(/\.hot\{[^}]*grid-template-columns/.test(cssSrc), '3つ並べる形がある');
  ok(/@media\(max-width:640px\)\{\.hot\{grid-template-columns:1fr\}\}/.test(cssSrc),
     'スマホでは、1位〜3位は縦1列にする');
  /* ★翌4時までの予想だけは、横に流して見ます（ご指示・2026/11/12） */
  ok(/\.plan\{display:flex/.test(cssSrc), '翌4時までの予想は、横に流す形');
  ok(!/\.hotc\{[^}]*width:\d+px/.test(cssSrc), 'カードの幅をピクセルで決め打ちしない');
}



console.log('■ いちばん上の天気（ご指示・2026/11/12）');
{
  /* Open-Meteo（無料・鍵なし）の形をまねて渡します */
  const j = {
    current: { temperature_2m: 17.4, weather_code: 3 },
    daily: { temperature_2m_max: [21.2], temperature_2m_min: [11.8] },
    hourly: {
      time: ['2026-10-28T16:00','2026-10-28T17:00','2026-10-28T18:00','2026-10-29T03:00','2026-10-29T05:00'],
      temperature_2m: [19, 18.6, 17.9, 13.2, 12.9],
      precipitation_probability: [0, 10, 70, 20, 0],
      weather_code: [3, 3, 61, 2, 0]
    }
  };
  const o = H.omRead(j, new Date(2026, 9, 28, 17, 20));
  ok(o.ok === true, '読める');
  ok(Math.round(o.temp) === 17, 'いまの気温を出す', o.temp);
  ok(o.icon === '☁️' && o.name === 'くもり', '天気の記号と呼び名', o.icon + o.name);
  ok(Math.round(o.max) === 21 && Math.round(o.min) === 12, '本日の最高・最低', [o.max, o.min]);
  ok(o.hours.length === 3, '17時・18時・翌3時だけ拾う（16時と翌5時は外）', o.hours.map(x => x.h));
  ok(o.hours[0].now === true, 'いまの時間に印が付く');
  ok(o.hours[1].pop === 70 && o.hours[1].icon === '🌧', '1時間ごとの雨と記号', o.hours[1]);
  ok(H.omRead({}, new Date()).ok === false, '形がちがっても落ちない');
  ok(H.tmp(null) === '—' && H.tmp(0) === '0°', '不明と0度は、別もの', [H.tmp(null), H.tmp(0)]);

  /* 画面に出るか */
  ctx.OM = o;
  vm.runInContext('hotOm = OM;', ctx);
  set([
    rec('2026-10-27', 18.2, 'E', 9000), rec('2026-10-20', 18.0, 'E', 9000), rec('2026-10-13', 17.9, 'E', 9000)
  ]);
  const html = H.paneHot(new Date(2026, 9, 28, 17, 20));
  ok(html.indexOf('wxnow') !== -1, '★★★いちばん上に、いまの天気が出る');
  ok(html.indexOf('最高') !== -1 && html.indexOf('最低') !== -1, '★★★最高・最低の気温が出る');
  ok(html.indexOf('wxhs') !== -1, '★★★1時間ごとの一覧が出る');
  ok(html.indexOf('雨雲レーダー') !== -1, '雨雲レーダーの押しどころは残っている');
  vm.runInContext('hotOm = { ok:false };', ctx);
  const h2 = H.paneHot(new Date(2026, 9, 28, 17, 20));
  ok(h2.indexOf('wxnow') === -1, '読めない日は、気象庁ぶんに落ちる（止まらない）');
}

console.log('■ Open-Meteo が読めない日でも、気温は出る（止まらない形）');
{
  const j = [{ timeSeries: [
    { timeDefines: ['2026-11-12T17:00:00+09:00'],
      areas: [{ area: { name: '大阪府' }, weathers: ['くもり　のち　晴れ'] }] },
    { timeDefines: ['2026-11-12T18:00:00+09:00'],
      areas: [{ area: { name: '大阪府' }, pops: ['0'] }] },
    { timeDefines: ['2026-11-13T00:00:00+09:00', '2026-11-13T09:00:00+09:00'],
      areas: [{ area: { name: '大阪' }, temps: ['13', '22'] }] }
  ] }];
  const w = H.wxRead(j, new Date(2026, 10, 12, 17, 31));
  ok(w.tmax === 22 && w.tmin === 13, '最高・最低を取る', [w.tmax, w.tmin]);
  ok(w.tday === 'あす', '★★★その日の分が終わっていれば「あす」と書く（嘘をつかない）', w.tday);
  ok(H.jpIcon('くもり のち 晴れ') === '⛅', 'くもり時々晴れの記号', H.jpIcon('くもり のち 晴れ'));
  ok(H.jpIcon('雨') === '🌧' && H.jpIcon('晴れ') === '☀️', '雨と晴れの記号');

  ctx.WX = w;
  vm.runInContext('hotWx = WX; hotOm = { ok:false }; hotAmd = { ok:true, temp:17.7 };', ctx);
  set([
    rec('2026-11-11', 18.2, 'E', 9000), rec('2026-11-04', 18.0, 'E', 9000), rec('2026-10-28', 17.9, 'E', 9000)
  ]);
  const html = H.paneHot(new Date(2026, 10, 12, 17, 31));
  ok(html.indexOf('wxnow') !== -1, '★★★Open-Meteo が×でも、天気の欄は出る');
  ok(html.indexOf('18°') !== -1, '★★★いまの気温（アメダス）が出る');
  ok(html.indexOf('22°') !== -1 && html.indexOf('13°') !== -1, '★★★最高・最低も出る');
  ok(html.indexOf('あす 最高') !== -1, '　「本日」と偽らない');
  vm.runInContext('hotWx = { ok:false }; hotOm = { ok:false }; hotAmd = { ok:false };', ctx);
}

console.log('■ カードを押すと地図が開く（ご指示・2026/11/12）');
{
  vm.runInContext('hotOm = { ok:false };', ctx);
  set([
    rec('2026-10-27', 25.0, 'A', 9000), rec('2026-10-20', 25.2, 'A', 9000), rec('2026-10-13', 24.9, 'A', 9000)
  ]);
  const html = H.paneHot(new Date(2026, 9, 28, 1, 0));
  ok(/<a class="hotc[^"]*" href="https:\/\/www\.google\.com\/maps/.test(html),
     '★★★1位〜3位のカードごと、地図につながっている');
  ok(/<a class="pl" href="https:\/\/www\.google\.com\/maps/.test(html) ||
     html.indexOf('記録が足りない') !== -1, '翌4時までの予想も、押せば地図が開く');
}

console.log('■ 近ごろの記録を先に見る（ご指示・2026/11/12）');
{
  const now = new Date(2026, 9, 28, 1, 0);
  set([
    rec('2026-10-27', 25.0, 'A', 9000), rec('2026-10-20', 25.0, 'A', 9000), rec('2026-10-13', 25.0, 'A', 9000),
    rec('2025-10-05', 25.0, 'Z', 9000), rec('2025-10-12', 25.0, 'Z', 9000),
    rec('2026-01-05', 25.0, 'Y', 9000)
  ]);
  const sel = H.hotSeason(now).map(r => r.place);
  ok(sel.indexOf('A') !== -1, 'この1か月の記録は入る');
  ok(sel.indexOf('Z') !== -1, '去年の同じ月の記録も入る');
  ok(sel.indexOf('Y') === -1, '去年でも今月でもない記録は入らない');
  ok(H.paneHot(now).indexOf('この1か月＋去年の同じ月') !== -1, '★★★何を見たかを画面に書く');
}

console.log('■ 天気の細かさを切り替えられる（ご指示・2026/11/12）');
{
  ok(/const WX_SPANS = \[/.test(appSrc), '★★★切り替えのタグがある');
  ['15分','1時間','今日・明日','2週間'].forEach(function (n) {
    ok(appSrc.indexOf("n: '" + n + "'") !== -1, '　 ' + n + ' がある');
  });
  ok(/minutely_15=/.test(appSrc), '★★★15分ごとも読みにいく');
  ok(/forecast_days=14/.test(appSrc), '★★★2週間ぶんも読みにいく');
  /* ★5分ごとは、無料では出ていません。出せないものを「5分」と書かないこと */
  ok(appSrc.indexOf("n: '5分'") === -1, '★★★出せない「5分」は、名乗らない');
  ok(/data-wxsp/.test(appSrc), '　 押せるようになっている');
}

console.log('■ 雨雲レーダーを、画面の中に出す（ご指示・2026/11/12）');
{
  ok(/function radarCard\(\)/.test(appSrc), '★★★画面の中に地図を出す');
  ok(/id="radarMap"/.test(appSrc), '　 置き場がある');
  ok(/api\.rainviewer\.com/.test(appSrc), '★★★雨雲は RainViewer（無料・鍵なし）');
  ok(/tile\.openstreetmap\.org/.test(appSrc), '★★★地図は OpenStreetMap（無料・鍵なし）');
  ok(!/api_key|apikey=|token=/i.test(appSrc.slice(appSrc.indexOf('function radarBoot'),
     appSrc.indexOf('function radarBoot') + 2200)), '★★★鍵は、どこにも書いていない');
  ok(/地図が読めませんでした/.test(appSrc), '★★★読めなくても、止まらずに知らせる');
  ok(/leaflet\/1\.9\.4/.test(appSrc), '　 地図の道具は、版を決めて読む');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
