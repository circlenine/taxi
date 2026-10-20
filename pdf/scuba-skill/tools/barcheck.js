// 左の線（補足・大事の欄の左の縦線）の太さの点検（10/20 まーく様「左側と右側で太さが違って見える。きちんと合っているか」）
// 画面に描いた線の、実際の画素の幅を測る。左の列・右の列・どのページでも、同じ幅でなければ止める。
// 1倍（スマホで縮めて見たとき）と3倍（拡大したとき）の両方で測る。
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
(async()=>{const src=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let bad=0;
for(const sc of [1,2,3]){
 const p=await b.newPage({deviceScaleFactor:sc});await p.goto('file://'+src,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
 const boxes=await p.evaluate(()=>[...document.querySelectorAll('.page .nt.kpk,.page .notes .kx,.page .mtc>.mts')].map(e=>{const r=e.getBoundingClientRect();const pg=e.closest('.page');const P=pg.getBoundingClientRect();
   return {pg:pg.id,kind:e.classList.contains('kpk')?'大事':'補足',x:r.left+window.scrollX,y:r.top+window.scrollY+r.height/2,side:(r.left-P.left)<P.width/2?'左':'右'}}));
 const buf=await p.screenshot({fullPage:true});const png=PNG.sync.read(buf);
 const res={};
 for(const o of boxes){const y=Math.round(o.y*sc);let x=Math.floor(o.x*sc)-2;let w=0,cov=0;
  // 線は、白い地から色がついている所。中ほどの1行で、色の濃さを足し合わせて「実際の幅」を出す（にじみも数える）
  for(let i=0;i<Math.ceil(2*sc)+12*sc;i++){const xx=x+i;const k=(y*png.width+xx)*4;const v=(255*3-(png.data[k]+png.data[k+1]+png.data[k+2]))/(255*3);if(v>0.04){cov+=v;}else if(cov>0)break;}
  const key=o.kind;(res[key]=res[key]||[]).push({w:cov,side:o.side,pg:o.pg});}
 for(const [k,arr] of Object.entries(res)){
  // 色の濃さで割って、線の幅（画素）にそろえる
  const mx=Math.max(...arr.map(a=>a.w));const mn=Math.min(...arr.map(a=>a.w));
  const L=arr.filter(a=>a.side==='左').map(a=>a.w),R=arr.filter(a=>a.side==='右').map(a=>a.w);
  const avg=a=>a.length?(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2):'-';
  const ok=(mx-mn)<=0.35*sc/ sc+0.25;
  if(!ok)bad++;
  console.log((ok?'  ':'NG ')+sc+'倍 '+k+'の線 '+arr.length+'本  左の列 '+avg(L)+'／右の列 '+avg(R)+'（いちばん細い '+mn.toFixed(2)+'・太い '+mx.toFixed(2)+'）');
 }
 await p.close();}
console.log(bad?'NG 左の線の太さがそろっていない':'左の線の太さ OK（左の列・右の列・どのページも同じ）');await b.close();process.exit(bad?1:0);})();
