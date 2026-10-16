// 1ページ目（表紙＋覚えるポイント）と2ページ目（もくじ＋使い方）が、ページの下（ページ番号の行）からはみ出していないか
// （10/16 まとめを足したときに はみ出したため。10/16 もくじを2ページへ移した）
const { chromium } = require('playwright');
(async()=>{const src=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>['p1','p2'].map(id=>{const pg=document.getElementById(id),pn=pg.querySelector('.pno').getBoundingClientRect();let worst=null;
pg.querySelectorAll('*').forEach(e=>{if(e.closest('.pno'))return;const r=e.getBoundingClientRect();if(r.height&&r.bottom>pn.top+0.5&&(!worst||r.bottom>worst[1]))worst=[e.className||e.tagName,r.bottom-pn.top]});
return {id,worst}}));
await b.close();const bad=r.filter(x=>x.worst);
if(bad.length){bad.forEach(x=>console.log(`${x.id}がはみ出しています：${x.worst[0]} が ${(x.worst[1]/3.78).toFixed(1)}mm`));process.exit(1)}
console.log('1・2ページ目の収まり OK');})();
