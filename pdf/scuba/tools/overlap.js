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
  while(n=w.nextNode()){const el=n.parentElement;if(!el||el.closest('rt,.phb,.play,svg,.scr'))continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
   const t=n.textContent;for(let i=0;i<t.length;i++){if(/\s/.test(t[i]))continue;const rg=document.createRange();rg.setStart(n,i);rg.setEnd(n,i+1);const rs=rg.getClientRects();if(!rs.length)continue;const q=rs[0];if(q.width<1||q.height<1)continue;bx.push({c:t[i],x0:q.left,x1:q.right,y0:q.top,y1:q.bottom,el})}}
  bx.sort((a,b)=>a.x0-b.x0);
  for(let i=0;i<bx.length;i++){const a=bx[i];for(let j=i+1;j<bx.length;j++){const c=bx[j];if(c.x0>=a.x1)break;
    const ox=Math.min(a.x1,c.x1)-Math.max(a.x0,c.x0),oy=Math.min(a.y1,c.y1)-Math.max(a.y0,c.y0);
    // 約物（かっこ・読点・中黒）は、字の箱の半分が空白なので、半分までは重ねて詰めている（pql・pqr・pqc）。その半分までは重なりとみなさない
    const pq=e=>e.el.closest('.pql,.pqr,.pqc');const lim=(pq(a)||pq(c))?Math.min(a.x1-a.x0,c.x1-c.x0)*0.75:Math.min(a.x1-a.x0,c.x1-c.x0)*0.15;
    if(ox>lim&&oy>Math.min(a.y1-a.y0,c.y1-c.y0)*0.4){out.push(pg.id+'｜「'+a.c+'」と「'+c.c+'」｜'+(a.el.closest('[class]')||a.el).className+' / '+(c.el.closest('[class]')||c.el).className+'｜'+(a.el.textContent.slice(0,14))+' / '+(c.el.textContent.slice(0,14)))}}}
 });return out});
const u=[...new Set(r)];for(const x of u.slice(0,60))console.log('NG '+x);
console.log(u.length?`NG 字と字の重なり ${u.length}か所`:'字の重なり OK（全ページ、1字ずつ測った）');await b.close();process.exit(u.length?1:0);})();
