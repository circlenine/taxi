// 1枚ずつ決まった大きさのページをPDFにする。はみ出した文字があれば知らせる
const { chromium } = require('playwright');
(async () => {
  const [src, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.emulateMedia({media:'print'});await p.goto('file://' + src, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForFunction(() => window.__laid === true);
  
  const bad = await p.evaluate(() => {
    const r = [];
    document.querySelectorAll('.page').forEach((pg, i) => {
      pg.querySelectorAll('.txt,.row,.three div,.cards figcaption,.chk li,.rows').forEach(e => {
        if (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)
          r.push(`p${i+1} ${e.className} ${e.scrollHeight}>${e.clientHeight} ${e.textContent.slice(0,20)}`);
      });
    });
    return r;
  });
  console.log(bad.length ? bad.join('\n') : 'no overflow');
  // 画面だけの説明（.scr）は本文に印刷しない。あとで「印刷しない注釈」として重ねる（10/8 ご指示）
  await p.addStyleTag({content:'.scr{visibility:hidden!important}'});
  await p.pdf({ path: out, width: '210mm', height: '297mm', printBackground: true, preferCSSPageSize: true });
  await b.close();
})();
