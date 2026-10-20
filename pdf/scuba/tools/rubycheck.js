// ルビ（呼（は）く）の点検（10/20 まーく様「ルビの高さを考え、上位置が他の文とズレないように」）
// ルビがあるときと、ルビを消したときで、ページの字の位置が1つも動かないか（ルビが行の高さを変えていないか）を測る
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const snap=()=>p.evaluate(()=>{const o=[];document.querySelectorAll('.rb').forEach(rb=>{const blk=rb.closest('.step,.ixtb,.qz,section,.notes')||rb.parentElement;
  const w=document.createTreeWalker(blk,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode()){if(t.parentElement.closest('.rt'))continue;const r=document.createRange();r.selectNodeContents(t);const q=r.getBoundingClientRect();if(q.width)o.push([Math.round(q.left*10)/10,Math.round(q.top*10)/10,t.textContent.slice(0,8)]);}});return o;});
// ルビが、色のついた箱（クイズの問いなど）のはしからはみ出していないか
const clip=await p.evaluate(()=>{const o=[];document.querySelectorAll('.rb .rt').forEach(rt=>{const r=rt.getBoundingClientRect();let e=rt.parentElement.parentElement;
 while(e&&e!==document.body){const c=getComputedStyle(e);if(c.backgroundColor!=='rgba(0, 0, 0, 0)'&&!e.classList.contains('page')){const q=e.getBoundingClientRect();if(r.top<q.top+.5)o.push((e.className||e.tagName)+' 上 '+(q.top-r.top).toFixed(1)+'px');break;}e=e.parentElement;}});return o;});
if(clip.length){console.log('NG ルビが箱のはしからはみ出す（'+clip.length+'か所）');clip.slice(0,4).forEach(x=>console.log('  '+x));await b.close();process.exit(1);}
const A=await snap();const n=await p.evaluate(()=>document.querySelectorAll('.rb').length);
await p.evaluate(()=>document.querySelectorAll('.rb .rt,.rb rt').forEach(e=>e.remove()));
const B=await snap();const bad=[];
for(let i=0;i<A.length;i++){if(Math.abs(A[i][0]-B[i][0])>.5||Math.abs(A[i][1]-B[i][1])>.5)bad.push('「'+A[i][2]+'」 '+(A[i][1]-B[i][1]).toFixed(1)+'px');}
if(bad.length){console.log('NG ルビで字の位置が動いた（'+bad.length+'か所）');bad.slice(0,6).forEach(x=>console.log('  '+x));await b.close();process.exit(1);}
console.log('ルビ OK（'+n+'か所・ルビがあっても、行の高さも字の位置も変わらない）');await b.close();})();
