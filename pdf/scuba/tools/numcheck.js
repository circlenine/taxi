// 表紙の数字（わくの中の 1・2）の位置を測るために、わくの部分だけを大きく画像にする（10/15）
const { chromium } = require('playwright');
(async()=>{const [src,out]=process.argv.slice(2);const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({deviceScaleFactor:4});await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const e=document.querySelector('#p1 .cv-no').getBoundingClientRect();return {x:e.left,y:e.top,w:e.width,h:e.height};});
await p.screenshot({path:out,clip:{x:r.x,y:r.y,width:r.w,height:r.h}});console.log(r.w*25.4/96);await b.close();})();
