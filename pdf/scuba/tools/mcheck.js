// スマホ版の並びの検査：はみ出し／左右の線（紙のはしから8mm）／写真の幅／同じ行の札の高さ／補足の札の幅
const { chromium } = require('playwright');
(async()=>{const [src]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();
await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate((SIDE)=>{const out=[],MM=96/25.4,ok=(a,b)=>Math.abs(a-b)<=1;
 document.querySelectorAll('.page').forEach((pg,i)=>{const P=pg.getBoundingClientRect(),L=P.left+SIDE*MM,R=P.right-SIDE*MM;
  {const lim=P.bottom-parseFloat(getComputedStyle(pg).paddingBottom)+1;pg.querySelectorAll('*').forEach(e=>{if(e.closest('.pno'))return;const r=e.getBoundingClientRect();if(r.height&&r.bottom>lim)out.push('p'+(i+1)+' ページの下にはみ出し '+e.className+' '+e.textContent.slice(0,10));});}
  [...pg.children].forEach(c=>{const r=c.getBoundingClientRect();if(!r.width||c.classList.contains('memo'))return;if(!ok(r.left,L)||!ok(r.right,R))out.push('p'+(i+1)+' 左右が本文の線とずれ '+c.className+' '+Math.round(r.left-L)+'/'+Math.round(R-r.right));});
  pg.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&(r.right>R+1||r.left<L-1)&&!e.closest('.pno'))out.push('p'+(i+1)+' 横にはみ出し '+e.className+' '+e.textContent.slice(0,12));});
  pg.querySelectorAll('.step>.photos,.step>.notes,.step>.names,.step>.reg,.step>.sasuke,.step>.big').forEach(e=>{const r=e.getBoundingClientRect(),S=e.parentElement.getBoundingClientRect();if(!ok(r.left,S.left)||!ok(r.right,S.right))out.push('p'+(i+1)+' 写真・補足の幅がそろっていない '+e.className);});
  const L2=[...pg.querySelectorAll('.t,.sn,.fs,.nk,.nn,.tl')].map(e=>({e,r:e.getBoundingClientRect()})).filter(o=>o.r.height);
  for(let a=0;a<L2.length;a++)for(let c=a+1;c<L2.length;c++){const A=L2[a].r,B=L2[c].r;const ov=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
   const box=x=>x.e.closest('.nt,.sh3,.nmr,.tc,.qz,.row2,.say,.bg');if(ov>Math.min(A.height,B.height)*.5&&box(L2[a])&&box(L2[a])===box(L2[c])){const d=Math.abs((A.top+A.bottom)/2-(B.top+B.bottom)/2);if(d>1.2)out.push('p'+(i+1)+' 同じ行の札の高さがずれ '+L2[a].e.textContent+'／'+L2[c].e.textContent);}}});
 // 同じ行に並んだ手順の写真：上の線と下の線がそろっているか（10/7 ご指摘）
 document.querySelectorAll('.grid2').forEach(g=>{const st=[...g.querySelectorAll(':scope>.step:not(.wide)')];const rows={};
  st.forEach(x=>{const k=Math.round(x.getBoundingClientRect().top);(rows[k]=rows[k]||[]).push(x);});
  Object.values(rows).forEach(r=>{if(r.length<2)return;const ph=r.map(x=>x.querySelector('.photos'));if(ph.some(p=>!p))return;
   const ims=ph.map(p=>[...p.querySelectorAll('img')].map(i=>i.getBoundingClientRect()));
   const T=ims.map(a=>Math.round(Math.min(...a.map(r=>r.top)))),B=ims.map(a=>Math.round(Math.max(...a.map(r=>r.bottom))));
   if(Math.max(...T)-Math.min(...T)>1)out.push('となりの手順と写真の上がずれ '+r.map(x=>x.querySelector('.sn').textContent).join('/'));
   if(Math.max(...B)-Math.min(...B)>1)out.push('となりの手順と写真の下がずれ '+r.map(x=>x.querySelector('.sn').textContent).join('/'));
   r.forEach(x=>{const a=[...x.querySelectorAll('.photos img')].map(i=>i.getBoundingClientRect());const b=Math.round(Math.max(...a.map(q=>q.bottom)));a.forEach(q=>{});});});});
 // 本文の行の間隔：どこも字の大きさの1.6倍か（10/7 ご指摘）
 {const bad={};document.querySelectorAll('.notes *,.nmr *,.bg *,.sasuke *,.pts *,.qz *').forEach(e=>{const cs=getComputedStyle(e);if(!e.textContent.trim()||cs.display==='none')return;
  const r=parseFloat(cs.lineHeight)/parseFloat(cs.fontSize);if(Math.abs(r-1.6)>.02)bad[(e.className||e.tagName)+' '+r.toFixed(2)]=1;});
  if(Object.keys(bad).length)out.push('行の間隔がそろっていない '+Object.keys(bad).slice(0,6).join(' / '));}
 // 2列の線：どのページも、左の列・右の列の左右のはしが同じ位置か（10/7 ご指摘：道具の写真だけまん中をこえていた）
 {const MM2=96/25.4;document.querySelectorAll('.page').forEach((pg,i)=>{const P=pg.getBoundingClientRect(),L=P.left+SIDE*MM2,R=P.right-SIDE*MM2,G=7*MM2,W=(R-L-G)/2;
  const ok2=(v,arr)=>arr.some(a=>Math.abs(v-a)<=1.5);
  pg.querySelectorAll('.grid2>.step:not(.wide),.regrow>*,.page>.memo').forEach(e=>{const r=e.getBoundingClientRect();
   if(!ok2(r.left,[L,L+W+G])||!ok2(r.right,[L+W,R]))out.push('p'+(i+1)+' 2列の線からずれ '+e.className+' '+Math.round(r.left-L)+'〜'+Math.round(r.right-L));});});}
 // 線と文字が重なっていないか（10/7 ご指摘：たての線が「レギュレーター」の字に重なっていた）
 document.querySelectorAll('.page').forEach((pg,i)=>{const lines=[];
  pg.querySelectorAll('*').forEach(e=>{const ps=getComputedStyle(e,'::before');if(ps.content!=='none'&&ps.position==='absolute'&&parseFloat(ps.width)<=1.5&&e.classList.contains('rc')){const r=e.getBoundingClientRect();lines.push({x:r.left+parseFloat(ps.left),t:r.top,b:r.bottom});}});
  const qz=pg.querySelector('.quiz');if(qz){const r=qz.getBoundingClientRect();lines.push({x:(r.left+r.right)/2,t:r.top,b:r.bottom});}
  const w=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.textContent.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);
   [...rg.getClientRects()].forEach(q=>{lines.forEach(L=>{if(q.left<L.x&&q.right>L.x&&q.bottom>L.t&&q.top<L.b)out.push('p'+(i+1)+' 線と文字が重なる「'+n.textContent.trim().slice(0,12)+'」');});});}});
 // 二重線：横の線が、8mm以内の上下に2本並んでいないか（10/7 ご指摘）
 document.querySelectorAll('.page').forEach((pg,i)=>{const H=[];pg.querySelectorAll('*').forEach(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();if(r.width<20*96/25.4||e.closest('.pno'))return;
   if(parseFloat(cs.borderTopWidth)>0&&cs.borderTopStyle!=='none')H.push({y:r.top,l:r.left,r:r.right,e});if(parseFloat(cs.borderBottomWidth)>0&&cs.borderBottomStyle!=='none')H.push({y:r.bottom,l:r.left,r:r.right,e});});
  for(let a=0;a<H.length;a++)for(let b=a+1;b<H.length;b++){const A=H[a],B=H[b];const dy=Math.abs(A.y-B.y);const ov=Math.min(A.r,B.r)-Math.max(A.l,B.l);
   if(dy>1&&dy<8*96/25.4&&ov>Math.min(A.r-A.l,B.r-B.l)*.5)out.push('p'+(i+1)+' 二重線 '+(A.e.className||A.e.tagName)+'／'+(B.e.className||B.e.tagName)+' '+(dy*25.4/96).toFixed(1)+'mm');}});
 // となりに並んだ手順の、本文の1行目の字の高さがそろっているか（10/7 ご指摘：SASUKEの「さぁ！」とタンクがずれていた）
 {const top=el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.textContent.trim()){const r=document.createRange();const i=n.textContent.search(/\S/);r.setStart(n,i);r.setEnd(n,i+1);return r.getClientRects()[0].top;}}return null;};
  document.querySelectorAll('.grid2').forEach(g=>{const rows={};g.querySelectorAll(':scope>.step:not(.wide)').forEach(x=>{const k=Math.round(x.getBoundingClientRect().top);(rows[k]=rows[k]||[]).push(x);});
   Object.values(rows).forEach(r=>{if(r.length<2)return;const b=r.map(x=>x.children[1]);if(b.some(e=>!e)||b.some(e=>e.classList.contains('photos')))return;
    const t=b.map(top);if(t.every(v=>v!==null)&&Math.max(...t)-Math.min(...t)>1.5)out.push('となりの手順と1行目の高さがずれ '+r.map(x=>x.querySelector('.sn').textContent).join('/'));});});}
 // 題と中身のすき間：どの手順も同じか（2.4mm）。札どうしがくっつかないか
 {const gaps={};document.querySelectorAll('.step').forEach(st=>{const h=st.querySelector(':scope>.sh3');let n=h&&h.nextElementSibling;if(n&&getComputedStyle(n).display==='contents')n=n.firstElementChild;if(!n)return;
   const g=((n.getBoundingClientRect().top-h.getBoundingClientRect().bottom)*25.4/96).toFixed(1);(gaps[g]=gaps[g]||[]).push(h.querySelector('.sn').textContent);});
  if(Object.keys(gaps).length>1)out.push('題と中身のすき間がばらばら '+Object.entries(gaps).map(([g,v])=>g+'mm:'+v.slice(0,4).join(',')).join(' / '));}
 // 道具の名前と、すぐあとに続く字の高さ・大きさがそろっているか（10/8 ご指摘）
 document.querySelectorAll('.page .t').forEach(t=>{const tn=[...t.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());let nx=t.nextSibling;while(nx&&nx.nodeType===3&&!nx.textContent.trim())nx=nx.nextSibling;
  if(!tn||!nx||(nx.nodeType===1&&nx.classList.contains('ds')))return;let nn=nx.nodeType===3?nx:[...nx.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(!nn)return;
  const r1=document.createRange();r1.setStart(tn,tn.length-1);r1.setEnd(tn,tn.length);const r2=document.createRange();const k=nn.textContent.search(/\S/);r2.setStart(nn,k);r2.setEnd(nn,k+1);
  const a=r1.getClientRects()[0],b=r2.getClientRects()[0];if(!a||!b||Math.abs(a.top-b.top)>a.height)return;
  if(Math.abs(a.bottom-b.bottom)>1||Math.abs(a.height-b.height)>1)out.push(t.closest('.page').id+' 道具の名前と続く字がずれ「'+t.textContent+nn.textContent.trim().slice(0,4)+'」');});
 const nk=[...document.querySelectorAll('.nk')].map(e=>Math.round(e.getBoundingClientRect().width));if(new Set(nk).size>1)out.push('補足の札の幅がばらばら '+[...new Set(nk)].join(','));
 // 大事・補足の札は1行目に単独で置き、文は2行目から書く（10/8 ご指示）
 document.querySelectorAll('.notes .nt').forEach(n=>{const k=n.querySelector('.nk').getBoundingClientRect(),x=n.querySelector('.nx');const r=document.createRange();r.selectNodeContents(x);const q=[...r.getClientRects()].find(c=>c.width);
  if(q&&q.top<k.bottom-1)out.push(n.closest('.page').id+' 札と同じ行に文がある「'+x.textContent.slice(0,10)+'」');});
 // 大事・補足の2行目からの書き出しが、札の左はしと同じか（左にむだな空きを作らない。10/8 ご指摘）
 document.querySelectorAll('.notes .nt').forEach(n=>{const k=n.querySelector('.nk').getBoundingClientRect();const L=Math.min(...[...n.querySelectorAll('.nx,.ns')].flatMap(e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].filter(c=>c.width&&c.top>k.bottom).map(c=>c.left);}));if(L===Infinity)return;
  if(Math.abs(L-k.left)>1)out.push(n.closest('.page').id+' 札の下に左の空き「'+n.textContent.slice(2,12)+'」 '+((k.left-L)*25.4/96).toFixed(1)+'mm');});
 // 同じ列の大事・補足の札は、左はしが同じ位置か（10/8 ご指摘：ピンクの行だけ札が右にずれていた）
 document.querySelectorAll('.notes').forEach(ns=>{const xs=[...ns.querySelectorAll('.nk')].map(k=>k.getBoundingClientRect().left);
  if(xs.length>1&&Math.max(...xs)-Math.min(...xs)>0.5)out.push(ns.closest('.page').id+' 札の左はしがずれ '+ns.closest('.step').querySelector('.sn').textContent+' '+((Math.max(...xs)-Math.min(...xs))*25.4/96).toFixed(1)+'mm');});
 // 札の左はしは、写真の左はし（列の左はし）から、どの手順も同じ距離か
 {const d=new Set();document.querySelectorAll('.notes .nk').forEach(k=>d.add(((k.getBoundingClientRect().left-k.closest('.notes').getBoundingClientRect().left)*25.4/96).toFixed(1)));
  if(d.size>1)out.push('札の書き出しの位置がばらばら '+[...d].join('mm, ')+'mm');}
 // memo：表紙にはなし。ほかのページは1つだけ。工程のページは、ページの下はしまで届く位置（10/8 ご指示）
 document.querySelectorAll('.page').forEach((pg,i)=>{const ms=pg.querySelectorAll(':scope>.memo');const P=pg.getBoundingClientRect(),lim=P.bottom-parseFloat(getComputedStyle(pg).paddingBottom);
  if(pg.id==='p1'){if(ms.length)out.push('p1 表紙に memo がある');return;}
  if(ms.length!==1){out.push('p'+(i+1)+' memo の数が '+ms.length);return;}
  const r=ms[0].getBoundingClientRect();if(pg.querySelector('.grid2 .photos')&&Math.abs(r.bottom-lim)>1)out.push('p'+(i+1)+' memo がページの下はしに届いていない（まん中に浮いている）');
  if(ms[0].querySelectorAll('.ml').length<3)out.push('p'+(i+1)+' memo が小さすぎ（'+ms[0].querySelectorAll('.ml').length+'行）');});
 // 写真を小さくしすぎていないか（memo の場所を作るために、写真を縮めすぎない）
 document.querySelectorAll('.page[data-ph]').forEach(pg=>{if(+pg.dataset.ph<40)out.push(pg.id+' 写真が低すぎ '+(+pg.dataset.ph).toFixed(0)+'mm');});
 // 同じ札（補足と補足・大事と大事）が続いていないか（10/8 ご指摘：補足が2回続く意味が分からない）
 document.querySelectorAll('.notes').forEach(ns=>{const k=[...ns.querySelectorAll(':scope>.nt')].map(n=>n.classList.contains('kpk')?'大事':'補足');for(let i=1;i<k.length;i++)if(k[i]===k[i-1])out.push(ns.closest('.page').id+' 同じ札が続く（'+k[i]+'） '+ns.closest('.step').querySelector('.sn').textContent);});
 // 大きな器材：写真が、その行（線と線のあいだ）の上下のまん中にあるか（10/8 ご指摘：BCDの写真だけ上に寄っていた）
 document.querySelectorAll('.tools .bg').forEach(bg=>{const im=bg.querySelector(':scope>img');if(!im)return;const r=bg.getBoundingClientRect(),cs=getComputedStyle(bg),t=r.top+parseFloat(cs.paddingTop),b=r.bottom-parseFloat(cs.paddingBottom),q=im.getBoundingClientRect();
  const d=((q.top+q.bottom)/2-(t+b)/2)*25.4/96;if(Math.abs(d)>.5)out.push(bg.closest('.page').id+' 大きな器材の写真が上下のまん中にない「'+bg.textContent.trim().slice(0,4)+'」 '+d.toFixed(1)+'mm');});
 // memo の欄が、ほかの中身（字・写真・線）に重なっていないか（10/8）
 document.querySelectorAll('.page').forEach((pg,i)=>{const ms=[...pg.querySelectorAll(':scope>.memo')].map(m=>m.getBoundingClientRect());
  pg.querySelectorAll('*').forEach(e=>{if(e.closest('.memo,.pno')||e.contains(pg.querySelector('.memo')))return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
   if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||e.tagName==='IMG')ms.forEach(m=>{if(r.left<m.right-1&&r.right>m.left+1&&r.top<m.bottom-1&&r.bottom>m.top+1)out.push('p'+(i+1)+' memoが中身に重なる '+(e.className||e.tagName));});});});
 return out;},+(process.env.SIDE||10.5));
console.log(r.length?r.join('\n'):'並び OK');await b.close();})();
