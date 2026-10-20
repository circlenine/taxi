// まとめの写真の上の端が、同じ段でそろっているかの点検（10/20 まーく様「1行と2行での画像のズレ起きてます。これ何度伝えたら」）
// 題が1行の札と2行の札が横に並ぶと、写真が上下にずれる。同じ段（札の上の端が同じ）で、写真の上の端が1画素でも違えば止める。
const { chromium } = require('playwright');
(async()=>{const src=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+src,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const rows=await p.evaluate(()=>{const out=[];for(const g of document.querySelectorAll('.page .mtg')){const m=new Map();
 for(const c of g.querySelectorAll(':scope>.mtc')){const img=c.querySelector(':scope>img');if(!img)continue;const k=Math.round(c.getBoundingClientRect().top);
  if(!m.has(k))m.set(k,[]);m.get(k).push({t:img.getBoundingClientRect().top,h:c.querySelector('.mth')?.innerText.replace(/\s+/g,'')||''});}
 for(const [k,a] of m)if(a.length>1)out.push({pg:g.closest('.page').id,a});}return out;});
let bad=0;for(const r of rows){const ts=r.a.map(x=>x.t);const d=Math.max(...ts)-Math.min(...ts);
 if(d>1){bad++;console.log('NG '+r.pg+' 写真の上の端が '+d.toFixed(1)+'px ずれている：'+r.a.map(x=>x.h+'('+x.t.toFixed(1)+')').join(' ／ '));}}
console.log(bad?'NG まとめの写真が、同じ段でそろっていない':'まとめの写真の高さ OK（'+rows.length+'段、どれもそろっている）');await b.close();process.exit(bad?1:0);})();
