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
  function filtOn(){ return false; }
  /* 「このページを見てわかること」は、ここでは中身を見ないので置きかえます */
  function leadCard(){ return '<!--lead-->'; }
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
  /* ★2026/11/16：「読むときの注意」の欄は、
       「このページを見てわかること」にまとめました（ご指示）。
       中身は LEADS に移したので、そちらで確かめます。 */
  ok(appSrc.indexOf("n: '催しのある夜は、記録より催しが先です'") !== -1,
     '催しのある夜は催しが先、と書いてある');
  ok(appSrc.indexOf("c: '車を着ける目安は、終演の15分前'") !== -1,
     '★★★車を着けるのは終演の15分前、と【イベント】に書いてある');
  ok(appSrc.indexOf('function hotNoteCard') === -1,
     '★★★「読むときの注意」の欄は、もう無い（2か所に分けない）');
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
  /* ★2026/11/16：たまっていないときは、何も並べません（ご指示
       「だから、データとして溜まってない状態なら非表示にしてください」）。
     大きな空の箱も、「参考（件数が足りません）：○○ 1件」も出しません。 */
  ok(html.indexOf('まだ記録が足りません') !== -1, '空でも落ちず、1行だけ書く');
  ok(html.indexOf('参考（件数が足りません）') === -1,
     '★★★1件しかない場所を、参考として並べない');
  ok(html.indexOf('読むときの注意') === -1,
     '★★★読むものが無いのに「読むときの注意」を出さない');
  ok(html.indexOf('<!--chips-->') !== -1,
     '★★★しぼり込みの操作だけは残す（曜日や期間を変えて出し直せるように）');
}

console.log('■ 夜ぜんたいの狙い目（ご指示・2026/11/17）');
{
  /* ★「いまから翌4時まで」ではなく、出せる時間を ぜんぶ 出します
       （ご指示「天気ですが、翌4時までとか別にいらないので
         (出勤前に、早めに予定確認したいばあいもあるので)
         表示できる分はすべて表示してください」）。
     前は いまの時刻から先しか出さず、出勤の前に見ても
     夜ぜんたいの流れが分かりませんでした。 */
  set([
    rec('2026-10-27', 25.0, 'A', 9000), rec('2026-10-20', 25.0, 'A', 9000), rec('2026-10-13', 25.0, 'A', 9000),
    rec('2026-10-27', 27.0, 'D', 9000), rec('2026-10-20', 27.0, 'D', 9000), rec('2026-10-13', 27.0, 'D', 9000)
  ]);
  const c = H.hotNow(new Date(2026, 9, 28, 1, 0));   // 25時
  const plan = H.hotPlan(c);
  /* 16時台から翌5時台まで、いつ見ても同じ並び（14こ） */
  ok(plan.length === 14, '★★★16時台〜翌5時台を、いつも返す', plan.length);
  ok(plan[0].hh === 16, '★★★いまが何時でも、16時台から始まる', plan[0].hh);
  ok(plan[plan.length - 1].hh === 29, '　 最後は翌5時台', plan[plan.length - 1].hh);
  /* 出勤前（18時より早い時刻）でも、同じだけ返ること */
  const c18 = { h: 18, date: '2026-10-28', kind: '平日' };
  ok(H.hotPlan(c18).length === 14, '★★★出勤の前に見ても、同じだけ出る', H.hotPlan(c18).length);
  /* 中身は、その時間のもの */
  const at = hh => plan.filter(x => x.hh === hh)[0];
  ok(at(25).top && at(25).top.p === 'A', '25時台は A', at(25).top && at(25).top.p);
  ok(at(27).top && at(27).top.p === 'D', '27時台は D', at(27).top && at(27).top.p);
  ok(at(26).h === 2, '26時は「2時台」と出す', at(26).h);
  /* 記録の無い時間は、中身が空（画面には出しません） */
  ok(at(20).top === null, '★★★記録の無い時間は、出さない');
}

console.log('■ 出せる時間が3つそろうまで、見出しごと出さない');
{
  const tp = p => ({ p: p, avg: 9000, n: 3 });
  ok(H.hotPlanCard([{ h:18, top:null }, { h:19, top:null }, { h:20, top:null }], false) === '',
     '★★★中身が無ければ、見出しも出さない');
  ok(H.hotPlanCard([{ h:18, top:tp('A') }, { h:19, top:tp('B') }], false) === '',
     '★★★2つしか無ければ、まだ出さない');
  ok(H.hotPlanCard([{ h:18, top:tp('A') }, { h:19, top:tp('B') },
                    { h:20, top:tp('C') }, { h:21, top:null }], false)
       .indexOf('時間帯ごとの狙い目（夜ぜんたい）') !== -1,
     '★★★3つそろえば、出す');
}

console.log('■ 「いま」と書くのは、いまの時間だけ');
{
  const tp   = p => ({ p: p, avg: 9000, n: 3 });
  const plan = [{ h: 18, hh: 18, top: tp('A') }, { h: 19, hh: 19, top: tp('B') },
                { h: 20, hh: 20, top: tp('C') }];
  const now  = H.hotPlanCard(plan, false, 19);
  const soon = H.hotPlanCard(plan, true, -1);
  ok(now.indexOf('いま</small>') !== -1, '★★★いまの時間には「いま」と書く');
  ok(now.indexOf('18時台') !== -1 && now.indexOf('20時台') !== -1,
     '　 そのほかの時間は、時刻で書く');
  ok(soon.indexOf('いま</small>') === -1 && soon.indexOf('18時台') !== -1,
     '★★★出庫前は「いま」と書かず、時刻で書く');
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
  /* ★2026/11/16：ご指示で「狙い目」→「天気」に言いかえました
       （画面の中は、いまの狙い目・天気・雨雲レーダーのままです）。 */
  ok(/data-t="hot"[^>]*><b>天気</.test(htmlSrc), '押しどころの名前は「天気」');
  /* ★並びは、まーく様のご指示のとおりです（2026/11/13）。
       日時＋金土の夜 → 翌4時までの予想 → 今の時間帯に強い場所 → 天気 */
  /* ★2026/11/17：見出しを、中身がそのまま分かる言い方に直しました
       （ご指示「もっと的確な見出し名に直してください」）。 */
  ok(/<h2>いまの時間帯に強い乗り場<\/h2>/.test(appSrc), '表の題は「いまの時間帯に強い乗り場」');
  ok(appSrc.indexOf('<h2>この時間に強い場所</h2>') === -1, '古い題は残っていない');
  ok(/<h2>天気<\/h2>/.test(appSrc), '天気の区切りがある');
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
     html.indexOf('翌4時までの予想') === -1,
     '翌4時までの予想は、押せば地図が開く（中身が無ければ、見出しごと出さない）');
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
  /* ★雨雲は、気象庁のナウキャストに変えました（ご指摘・2026/11/13
       「なんか、変な英語出てますが、これは消したり別のサイトの導入はできないのでしょうか」）。
       RainViewer は、拡大すると「Zoom Level Not Supported」という
       英語の絵を返してきます。いまの大きさでは、それしか出ていませんでした。 */
  ok(/www\.jma\.go\.jp\/bosai\/jmatile\/data\//.test(appSrc)
     && /nowc\/targetTimes_N1\.json/.test(appSrc),
     '★★★雨雲は 気象庁のナウキャスト（無料・鍵なし）');
  ok(/surf\/hrpns\/\{z\}\/\{x\}\/\{y\}\.png/.test(appSrc), '　 その絵の読み先');
  ok(/maxNativeZoom: 10/.test(appSrc), '★★★拡大しても、無いものを取りにいかない');
  /* ★いまから3時間後までを出します（ご指示・2026/11/15
       「現在～3時間後のリアルタイムを映すようにしてください」）。
       ・いま〜1時間後 … 高解像度降水ナウキャスト（5分きざみ）
       ・1時間後〜3時間後 … 降水15時間予報（1時間きざみ） */
  ok(/nowc\/targetTimes_N2\.json/.test(appSrc), '★★★1時間後までの予想も出す');
  ok(/rasrf\/targetTimes\.json/.test(appSrc), '★★★3時間後までの予想も出す');
  ok(/surf\/rasrf\/\{z\}\/\{x\}\/\{y\}\.png/.test(appSrc), '　 その絵の読み先');
  /* ★2026/11/16：1〜3時間後が1枚も出ていませんでした（ご指摘
       「本当に3時間進んでますか？1時間程度しか進んでいるように見えませんが？」）。
       気象庁の表には「ちょうどの時刻」と「30分の時刻」の2つの出し元があり、
       ちょうどの時刻のほうは、7時間より先の絵しか持っていません。
       前は ならびの1番目（＝ちょうどの時刻）を使っていたため、空でした。 */
  ok(/\/3000\$\/\.test\(b\)/.test(appSrc),
     '★★★1〜6時間後を持っている「30分の時刻」の出し元を使う');
  ok(/mi > 60 && mi <= 215/.test(appSrc), '★★★3時間後を必ず越えるところまで出す');
  ok(/const tileOK = function/.test(appSrc),
     '★★★絵が置いてあるかを、1枚ためしてから使う');
  ok(/back < 3/.test(appSrc), '　 だめなら、30分前の出し元に下がる');
  ok(/id="radarRange"/.test(appSrc) && /'いまから ' \+ radarWhen/.test(appSrc),
     '★★★出せた所までを、そのまま書く（「3時間」と決め打ちしない）');
  ok(/function radarWhen\(v, base\)/.test(appSrc), '★★★「いま」「30分後」と、そえて出す');
  /* ★下じきの地図は、色を落として暗くします（ご指示・2026/11/15
       「もっと、地図ではなく、雨雲マップっぽいものはないのでしょうか」）。
       道や店の名前が目立つと、雨雲のほうが見えなくなります。 */
  /* ★2026/11/16：地図そのものへの色づけはやめました（ご指摘「この白い線はなんですか？」）。
       絵と絵のつぎ目に、細い線が出ていたためです。上から幕をかけます。 */
  ok(/\.wxmap \.mapveil\.v1\{[^}]*mix-blend-mode:saturation/.test(cssSrc)
     && /\.wxmap \.mapveil\.v2\{[^}]*rgba\(3,7,16/.test(cssSrc),
     '★★★下じきの地図は、上から幕をかけて暗くする');
  ok(/\.wxmap \.leaflet-tile-pane img\{image-rendering:pixelated\}/.test(cssSrc),
     '★★★絵を にじませずに引きのばす（つぎ目の線が消える）');
  ok(/const RADAR_LEG = \[/.test(appSrc) && /\.rdrleg\{/.test(cssSrc),
     '★★★雨の強さの色（気象庁と同じ並び）を出す');
  ok(/tile\.openstreetmap\.org/.test(appSrc), '★★★地図は OpenStreetMap（無料・鍵なし）');
  ok(!/api_key|apikey=|token=/i.test(appSrc.slice(appSrc.indexOf('function radarBoot'),
     appSrc.indexOf('function radarBoot') + 2200)), '★★★鍵は、どこにも書いていない');
  ok(/地図が読めませんでした/.test(appSrc), '★★★読めなくても、止まらずに知らせる');
  ok(/leaflet\/1\.9\.4/.test(appSrc), '　 地図の道具は、版を決めて読む');

  /* ★天気の下のボタンは【更新】です（ご質問・2026/11/13
       「この画像にある、雨雲レーダーというタブは更新タブで合ってますか？
         それであれば、更新という文字の方が適切だと思うのですが」）。
     前は「気象庁のページを開く」ボタンで、すぐ下の地図と同じ役でした。
     同じものが2つ並んでいたので、こちらを【更新】に変えました。 */
  ok(/id="wxRefresh">↻ 更新/.test(appSrc), '★★★天気の下のボタンは【更新】');
  ok(!/id="radar">☂ 雨雲レーダー/.test(appSrc), '　 同じ役のボタンが2つ並んでいない');
  ok(/async function wxRefresh\(/.test(appSrc), '★★★押すと、取り直す係がある');
  ok(/await loadWx\(\)[\s\S]{0,200}await loadEv\(true\)[\s\S]{0,200}await reload\(\)/.test(appSrc),
     '★★★天気・イベント・記録を、ぜんぶ取り直す');
  /* ★【更新】では、まん中の箱を出しません（ご指示・2026/11/13
       「天気の更新の際にポップアップを出すのはやめてください」）。 */
  ok(/async function loadEv\(quiet\)/.test(appSrc) &&
     /if \(!quiet\) evBoot\(\); else evDotOnly_\(\);/.test(appSrc),
     '★★★【更新】のときは、イベントの箱を出さない');
  ok(/function evDotOnly_\(\)/.test(appSrc), '　 赤い点だけは、付け直す');
  /* ★こま送りを止めてから作り直します（ご指摘・2026/11/13）。
       ただ捨てるだけだと、見ていないのに動き続けて、電池を食います。 */
  ok(/radarStop\(\);\s*\/\* 雨雲の地図も/.test(appSrc), '　 雨雲の地図も作り直す');
  ok(/一部は取れませんでした。/.test(appSrc), '★★★1つこけても、ほかは取り直す（そうと書く）');
}

console.log(fail ? `\n☓ ${fail}件 こけました` : '\n✓ ぜんぶ通りました');
process.exit(fail ? 1 : 0);
