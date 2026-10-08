// memo の行の位置（紙の上のpt）を書き出す。ノートの1行＝字を入れる欄1つ（打った字が、必ず下線の上に乗るように）
const { chromium } = require('playwright');
(async()=>{const [src,out]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const pages=[...document.querySelectorAll('.page')];return [...document.querySelectorAll('.page>.memo .ml')].map(m=>{const pg=m.closest('.page'),P=pg.getBoundingClientRect(),R=m.getBoundingClientRect();
 return {page:pages.indexOf(pg),x:(R.left-P.left)*0.75,y:(R.top-P.top)*0.75,w:R.width*0.75,h:(R.height-1)*0.75};});});
require('fs').writeFileSync(out,JSON.stringify(r));console.log('memo', r.length, 'pages', [...new Set(r.map(x=>x.page+1))].join(','));await b.close();})();
