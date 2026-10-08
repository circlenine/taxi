// 印刷したときの、写真の枠の大きさ（CSS px）を測る
const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{const [src,out]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();
await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const o={};document.querySelectorAll('img[data-slot]').forEach(i=>{const c=i.getBoundingClientRect();o[i.dataset.slot]=[i.dataset.k,c.width,c.height];});return o;});
fs.writeFileSync(out,JSON.stringify(r));await b.close();})();
