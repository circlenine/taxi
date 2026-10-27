// 10/23 まーく様「改行が多すぎるのは良くない」→ 2行以上の文で、最後の行が4.5字に満たない所を見つける（見つかったら止める）
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();await p.emulateMedia({media:'print'});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
console.log(await p.evaluate(()=>{const out=[];
 const sel='.sh3>span:last-child,.nx,.ns,.cap3,.mts li,.pbc p,.pbh,.qz .q,.qz .a,.mcq,.act,.slead,.mtl,.say,.skc p,.srowc .sd2,.mth span:last-child,.mcn,.ds';
 document.querySelectorAll(sel).forEach(e=>{if(e.closest('.howto'))return;const pg=e.closest('.page');
  // 行ごとの右はしを、文字の範囲から求める
  const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n,rects=[];while(n=w.nextNode()){if(!n.textContent.trim())continue;if(n.parentElement.closest('.kind'))continue;if(n.parentElement.closest('.nn2'))continue;   /* 10/27 表の行の頭の丸数字（①②）は、字の高さが少しちがい、1字だけの行と数えてしまうので入れない */   /* 10/25 ウェット・ドライの札は小さい字で上下が少しずれるので、行の数に入れない */const r=document.createRange();r.selectNodeContents(n);rects.push(...r.getClientRects());}
  if(!rects.length)return;const lines={};rects.forEach(r=>{if(r.width<1)return;const k=Math.round(r.top/4);lines[k]=lines[k]||{l:1e9,r:-1e9};lines[k].l=Math.min(lines[k].l,r.left);lines[k].r=Math.max(lines[k].r,r.right);});
  const ks=Object.keys(lines).map(Number).sort((a,b)=>a-b);if(ks.length<2)return;
  const cs=getComputedStyle(e),br=e.getBoundingClientRect(),inner=br.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  const last=lines[ks[ks.length-1]],lw=last.r-last.l;
  const fs=parseFloat(cs.fontSize);
  if(lw<fs*4.5) out.push(pg.id+' | '+e.className.split(' ')[0]+' | 最後の行 '+(lw/fs).toFixed(1)+'字 | '+e.textContent.trim().replace(/\s+/g,'').slice(0,60));});
 return out.join('\n')}));await b.close();})();
