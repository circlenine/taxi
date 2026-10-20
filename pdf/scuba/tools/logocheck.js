// ロゴの「にっこりカーブ」が smile の字のまん中に、左右対称にあるか（10/20 まーく様「少し左にずれてる。徹底して」）
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
const r=await p.evaluate(()=>{const svg=document.querySelector('#p1 .cv-logo svg')||document.querySelector('svg.logo');if(!svg)return null;
 const t=svg.querySelectorAll('text.lf-p')[1];if(!t)return null;const n=t.textContent.length;const a=t.getExtentOfChar(n-5),z=t.getExtentOfChar(n-1);
 const c=(a.x+z.x+z.width)/2;const pth=[...svg.querySelectorAll('path')].find(x=>/ Q/.test(x.getAttribute('d')||'')&&x.getAttribute('stroke')==='#e0507f');if(!pth)return {c,miss:1};
 const bb=pth.getBBox();const d=pth.getAttribute('d').match(/-?[\d.]+/g).map(Number);return {c,pc:bb.x+bb.width/2,y0:d[1],y1:d[5],word:t.textContent.slice(-5)};});
if(!r){console.log('ロゴの点検：この形にはにっこりカーブがない');await b.close();return;}
const ng=r.miss||Math.abs(r.pc-r.c)>3||Math.abs(r.y0-r.y1)>.5;
console.log((ng?'NG ':'')+'にっこりカーブ：字「'+r.word+'」のまん中 '+r.c.toFixed(1)+'／カーブのまん中 '+(r.pc||0).toFixed(1)+'／左右のはしの高さ '+r.y0+'・'+r.y1);
await b.close();process.exit(ng?1:0);})();
