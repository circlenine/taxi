// 1ページ目の中身が、ページの下（ページ番号の行）からはみ出していないか（10/16 まとめを足したときに はみ出した）
const { chromium } = require('playwright');
(async()=>{const src=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const pg=document.querySelector('#p1'),pn=pg.querySelector('.pno').getBoundingClientRect();let worst=null;
pg.querySelectorAll('*').forEach(e=>{if(e.closest('.pno'))return;const r=e.getBoundingClientRect();if(r.height&&r.bottom>pn.top+0.5&&(!worst||r.bottom>worst[1]))worst=[e.className||e.tagName,r.bottom-pn.top]});
const tc=[...pg.querySelectorAll('.tc')].map(e=>e.getBoundingClientRect().height);return {worst,minRow:Math.min(...tc)/3.78}});
await b.close();if(r.worst){console.log(`1ページ目がはみ出しています：${r.worst[0]} が ${(r.worst[1]/3.78).toFixed(1)}mm`);process.exit(1)}
console.log(`1ページ目の収まり OK（もくじの行の高さ ${r.minRow.toFixed(1)}mm）`);})();
