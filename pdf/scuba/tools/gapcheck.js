// 手順の題と、そのすぐ下（写真・札）のすき間が、どの手順でも同じかを調べる（10/14 ご指摘：2ページの1-1と1-2でちがっていた）
const { chromium } = require('playwright');
(async()=>{const [src]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const MM=96/25.4,g={};window.__mis=[];
 document.querySelectorAll('.page .grid2').forEach(gr=>{const st=[...gr.querySelectorAll('.step')];st.forEach(a=>st.forEach(b=>{if(a===b)return;const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();if(Math.abs(A.top-B.top)>1||A.left>=B.left)return;const ia=a.querySelector('.photos img,.trio img'),ib=b.querySelector('.photos img,.trio img');if(!ia||!ib)return;const d=Math.abs(ia.getBoundingClientRect().top-ib.getBoundingClientRect().top)/MM;if(d>.3)window.__mis.push(a.closest('.page').id+' '+a.querySelector('.sn').textContent+'と'+b.querySelector('.sn').textContent+'の写真の上が '+d.toFixed(1)+'mm ずれている');}));});
 document.querySelectorAll('.page .step>.sh3').forEach(h=>{let n=h.nextElementSibling;if(!n)return;if(getComputedStyle(n).display==='contents'){const r0=[...n.querySelectorAll('*')].map(e=>e.getBoundingClientRect()).filter(r=>{const H=h.getBoundingClientRect();return r.height&&r.top>=H.bottom-1&&r.left<H.right&&r.right>H.left;}).sort((a,b)=>a.top-b.top)[0];if(!r0)return;n={getBoundingClientRect:()=>r0};}const d=(n.getBoundingClientRect().top-h.getBoundingClientRect().bottom)/MM;
  const id=h.querySelector('.sn')?.textContent;(g[d.toFixed(1)]=g[d.toFixed(1)]||[]).push(h.closest('.page').id+' '+id);});return [g,window.__mis];});
await b.close();const mis=r[1];const R=r[0];if(mis.length){console.log(mis.map(x=>'NG '+x).join('\n'));process.exit(1);}const ks=Object.keys(R);
if(ks.length>1){console.log('NG 題と下のすき間がそろっていない：'+ks.map(k=>k+'mm（'+R[k].slice(0,6).join('・')+(R[k].length>6?'…':'')+'）').join(' ／ '));process.exit(1);}
console.log('題の下のすき間 OK（どの手順も '+ks[0]+'mm）');})();
