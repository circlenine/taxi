// 10/22 まーく様「見出しが1行に収まっていないのが気になる」：どのページの題（h2）も、札（ふり返り）まで含めて1行か
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();
await p.emulateMedia({media:'print'});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>[...document.querySelectorAll('.page .ph h2')].map(h=>{const rs=[...h.getClientRects()];const lh=parseFloat(getComputedStyle(h).lineHeight)||parseFloat(getComputedStyle(h).fontSize)*1.3;
 // 字のかたまりの縦のまん中を集め、行の高さの半分より離れていれば別の行と数える（札の小さい字で、同じ行を2行と数えないように）
 const cs=[];const w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.parentElement.closest('.hnote'))continue;/* 10/23 言葉の真下に置いた（）補足は、題の行に数えない */const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects())if(q.width>0)cs.push((q.top+q.bottom)/2);}
 cs.sort((a,b)=>a-b);let lines=cs.length?1:0;for(let i=1;i<cs.length;i++)if(cs[i]-cs[i-1]>lh*0.6)lines++;
 return {pg:h.closest('.page').id,t:h.textContent.trim(),lines}}));
const bad=r.filter(x=>x.lines>1);for(const x of bad)console.log(`NG ${x.pg} 題が${x.lines}行：${x.t}`);
console.log(bad.length?'NG 題が1行に収まっていない':`題 OK（${r.length}ページ、どれも1行）`);await b.close();process.exit(bad.length?1:0);})();
