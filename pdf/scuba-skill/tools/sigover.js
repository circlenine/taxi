// 合図の写真の上に、字や札が重なっていないか（10/20 まーく様「番号が指にかぶっている」）。重なっていたら止める
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
if(process.argv[3]==='--test')await p.evaluate(()=>{const f=document.querySelector('.sqf');if(f){const s=document.createElement('span');s.textContent='①';s.style.cssText='position:absolute;left:2px;top:2px';f.style.position='relative';f.appendChild(s);}});
const r=await p.evaluate(()=>{const imgs=[...document.querySelectorAll('.sqf img,.sqs img')];const out=[];
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;const rs=[];
 while(n=w.nextNode()){if(!n.textContent.trim())continue;if(n.parentElement.closest('.phb'))continue;   /* 10/21 ▶ の印は、手（見せたい部分）にかからないすみに置くので、別に点検する（badgecheck.js） */const g=document.createRange();g.selectNodeContents(n);for(const q of g.getClientRects())rs.push([q,n.textContent.trim().slice(0,8)]);}
 for(const im of imgs){const a=im.getBoundingClientRect();for(const [q,t] of rs){if(q.right>a.left+1&&q.left<a.right-1&&q.bottom>a.top+1&&q.top<a.bottom-1)out.push((im.closest('.page')||{}).id+'「'+t+'」');}}
 return {n:imgs.length,out};});
if(r.out.length){console.log('NG 合図の写真の上に字が重なっている（'+r.out.length+'か所）');r.out.slice(0,8).forEach(x=>console.log('  '+x));await b.close();process.exit(1);}
console.log('合図の写真 OK（'+r.n+'枚・上に重なる字なし）');await b.close();})();
