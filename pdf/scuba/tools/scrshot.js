// 画面で見るときだけの説明（.scr）を、1つずつ絵にして、位置（紙の上のpt）といっしょに書き出す
// 絵は4倍の細かさで撮る（拡大しても字がにじまないように）。地は透明
const { chromium } = require('playwright');
(async()=>{const [src,outDir,out]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({deviceScaleFactor:4,viewport:{width:900,height:1200}});await p.emulateMedia({media:'print'});
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const els=await p.$$('.page .scr');const pos=[];
for(let i=0;i<els.length;i++){const e=els[i];
 const info=await e.evaluate(el=>{const pg=el.closest('.page'),P=pg.getBoundingClientRect(),r=el.getBoundingClientRect();return {page:[...document.querySelectorAll('.page')].indexOf(pg),x:(r.left-P.left)*0.75,y:(r.top-P.top)*0.75,w:r.width*0.75,h:r.height*0.75};});
 const f=`${outDir}/scr${i}.png`;await e.screenshot({path:f,omitBackground:true});pos.push({...info,img:f});}
require('fs').writeFileSync(out,JSON.stringify(pos));console.log('画面だけの説明',pos.length,'個');await b.close();})();
