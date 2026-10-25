// 10/22 まーく様「文字と文字が重なりまくり」：字と字が重なっている所を、1字ずつ測って探す（全ページ）
// 画面に出ている字を1字ずつ箱にして、ちがう字どうしの箱が重なっていたら出す。
// 同じ行（縦の重なりが大きい）で、横に字幅の15%より深く重なっていれば「重なり」とみなす。
// ふりがな（rt）・画面だけの印・写真の上の ▶ は除く
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();
await p.emulateMedia({media:'print'});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const r=await p.evaluate(()=>{const out=[];
 document.querySelectorAll('.page').forEach(pg=>{const bx=[];
  const w=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){const el=n.parentElement;if(!el||el.closest('rt,.phb,.play,svg'))continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
   const t=n.textContent;for(let i=0;i<t.length;i++){if(/[\s\uFE00-\uFE0F\u200B-\u200D]/.test(t[i]))continue;const rg=document.createRange();rg.setStart(n,i);rg.setEnd(n,i+1);const rs=rg.getClientRects();if(!rs.length)continue;const q=rs[0];if(q.width<1||q.height<1)continue;bx.push({c:t[i],x0:q.left,x1:q.right,y0:q.top,y1:q.bottom,el})}}
  // 10/22 字が欄の外へはみ出して、切れて見えなくなっていないか（overflow が hidden の箱・ページの白いカードの外）
  for(const q of bx){let e=q.el;while(e&&e!==pg){const st=getComputedStyle(e);if(st.overflowX!=='visible'||st.overflowY!=='visible'){const r=e.getBoundingClientRect();if(q.x1>r.right+1||q.x0<r.left-1||q.y1>r.bottom+1||q.y0<r.top-1){out.push(pg.id+'｜字が欄の外で切れている「'+q.c+'」｜'+(q.el.className||q.el.tagName)+'｜'+q.el.textContent.slice(0,20));break}}e=e.parentElement}}
  // 10/22 字が、自分の欄（いちばん近い、行ではない箱）の左右からはみ出していないか（となりの欄に隠れて、切れて見える）
  for(const q of bx){let e=q.el;while(e&&e!==pg&&getComputedStyle(e).display.startsWith('inline'))e=e.parentElement;if(!e||e===pg)continue;const r=e.getBoundingClientRect();
    const hang=q.el.closest('.pql,.pqr,.pqc')?(q.x1-q.x0)*0.55:1.5;   /* 行頭・行末のかっこは、半分ぶん外へ出して頭をそろえている */
    if(q.x1>r.right+hang||q.x0<r.left-hang){out.push(pg.id+'｜字が欄からはみ出している「'+q.c+'」｜'+(e.className||e.tagName)+'｜'+e.textContent.slice(0,24));}}
  // 10/22 memo の欄（あとから重ねて置く箱）が、ほかの字の上にかぶさっていないか
  pg.querySelectorAll(':scope>.memo').forEach(m=>{const r=m.getBoundingClientRect();for(const q of bx){if(m.contains(q.el))continue;
    if(q.x0<r.right-1&&q.x1>r.left+1&&q.y0<r.bottom-1&&q.y1>r.top+1){out.push(pg.id+'｜memo の欄が字にかぶさっている「'+q.c+'」｜'+q.el.textContent.slice(0,20));break}}});
  // 10/22 手順の写真と、その下の文（補足・大事）の間が、変に空いていないか（となりの手順の写真の段に引っぱられて空く）
  pg.querySelectorAll('.grid2>.step,.grid3>.step').forEach(st=>{const ph=st.querySelector(':scope>.photos'),nt=st.querySelector(':scope>.notes');if(!ph||!nt)return;
    let pb=0;ph.querySelectorAll('img,.cap3,.jump').forEach(e=>{const r=e.getBoundingClientRect();if(r.height>0)pb=Math.max(pb,r.bottom)});
    const f=nt.firstElementChild;if(!f||!pb)return;const gap=(f.getBoundingClientRect().top-pb)/3.78;
    if(gap>7){out.push(pg.id+'｜写真と下の文の間が空きすぎ '+gap.toFixed(1)+'mm｜'+(st.querySelector('.sn')||{}).textContent)}});
  // 10/22 memo が片方の列にだけあって、もう片方の列の下も 20mm 以上空いたままになっていないか
  {const g=pg.querySelector('.grid2'),m=pg.querySelector(':scope>.memo'),pno=pg.querySelector('.pno');
   if(g&&m&&pno){const gr=g.getBoundingClientRect(),mr=m.getBoundingClientRect(),lim=pno.getBoundingClientRect().top,mid=(gr.left+gr.right)/2;
    if(mr.right<mid+5||mr.left>mid-5){const other=mr.left>mid-5?'L':'R';let bot=0;
     g.querySelectorAll(':scope>.step').forEach(st=>{const r=st.getBoundingClientRect();if(other==='L'?r.left<mid:r.right>mid)bot=Math.max(bot,r.bottom)});
     if(bot&&(lim-bot)/3.78>=20)out.push(pg.id+'｜memo が片方の列だけ（もう片方の列の下も '+((lim-bot)/3.78).toFixed(0)+'mm 空いている）');}}}
  // 10/22 写真どうしが重なっていないか（大きすぎる写真が、となりの手順の写真の下に隠れる）
  {const im=[...pg.querySelectorAll('.grid2 img,.grid3 img')].map(e=>({e,r:e.getBoundingClientRect()})).filter(o=>o.r.width>0);
   for(let i=0;i<im.length;i++)for(let j=i+1;j<im.length;j++){const a=im[i].r,b=im[j].r;const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    if(ox>2&&oy>2)out.push(pg.id+'｜写真どうしが重なっている '+im[i].e.dataset.k+' / '+im[j].e.dataset.k);}
   pg.querySelectorAll('.grid2>.step').forEach(st=>{const sr=st.getBoundingClientRect();st.querySelectorAll('img').forEach(e=>{const r=e.getBoundingClientRect();if(r.right>sr.right+2||r.left<sr.left-2)out.push(pg.id+'｜写真が手順の枠からはみ出している '+e.dataset.k)})});}
  bx.sort((a,b)=>a.x0-b.x0);
  for(let i=0;i<bx.length;i++){const a=bx[i];for(let j=i+1;j<bx.length;j++){const c=bx[j];if(c.x0>=a.x1)break;
    const ox=Math.min(a.x1,c.x1)-Math.max(a.x0,c.x0),oy=Math.min(a.y1,c.y1)-Math.max(a.y0,c.y0);
    // 約物（かっこ・読点・中黒）は、字の箱の半分が空白なので、半分までは重ねて詰めている（pql・pqr・pqc）。その半分までは重なりとみなさない
    const pq=e=>e.el.closest('.pql,.pqr,.pqc');const lim=(pq(a)||pq(c))?Math.min(a.x1-a.x0,c.x1-c.x0)*0.75:Math.min(a.x1-a.x0,c.x1-c.x0)*0.15;
    if(ox>lim&&oy>Math.min(a.y1-a.y0,c.y1-c.y0)*0.4){out.push(pg.id+'｜「'+a.c+'」と「'+c.c+'」｜'+(a.el.closest('[class]')||a.el).className+' / '+(c.el.closest('[class]')||c.el).className+'｜'+(a.el.textContent.slice(0,14))+' / '+(c.el.textContent.slice(0,14)))}}}
 });return out});
const u=[...new Set(r)];for(const x of u.slice(0,60))console.log('NG '+x);
console.log(u.length?`NG 字と字の重なり ${u.length}か所`:'字の重なり OK（全ページ、1字ずつ測った）');await b.close();process.exit(u.length?1:0);})();
