// 英数字・記号の太さの点検（10/20 まーく様「英数字、記号も細くないか、しっかり確認」）
// ページの英数字・記号が使っている「字の形と太さ」を全部集め、それぞれの縦線の太さを測る。
// 縦線の太さが字の高さの11%より細いもの（解星デコールの500・BIZ UD明朝の500 など）があれば止める。
// 30px以上の大きな字（表紙の英語の題など）は、細く見えないので除く。
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const r=await p.evaluate(async()=>{
 const stem=(font,ch)=>{const c=document.createElement('canvas');c.width=400;c.height=400;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,400,400);x.fillStyle='#000';x.font=font.replace(/[\d.]+px/,'200px');x.textBaseline='middle';x.fillText(ch,100,200);
  const d=x.getImageData(0,0,400,400).data;let best=0;for(const y of [170,185,200,215,230]){let run=0;for(let i=0;i<400;i++){const v=d[(y*400+i)*4];if(v<128){run++;}else{if(run>0&&(best===0||run<best))best=run;run=0;}}}return best/200;};
 const combos={};const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){const m=n.textContent.match(/[A-Za-z0-9０-９/%：:()（）!?！？&＆・\-]/g);if(!m)continue;const e=n.parentElement;if(e.closest('svg,.emj,script,style'))continue;
  const c=getComputedStyle(e);if(c.display==='none'||c.visibility==='hidden')continue;const fam=c.fontFamily.split(',')[0].replace(/"/g,'').trim();
  const k=fam+'|'+c.fontWeight;(combos[k]=combos[k]||{fam,wt:c.fontWeight,eg:[],pg:(e.closest('.page')||{}).id,small:false});if(parseFloat(c.fontSize)<30)combos[k].small=true;if(combos[k].eg.length<3)combos[k].eg.push(n.textContent.trim().slice(0,14));}
 const body=getComputedStyle(document.querySelector('.notes .ns')||document.body);const ref=stem(body.fontWeight+' 200px "'+body.fontFamily.split(',')[0].replace(/"/g,'')+'"','十');
 return {ref,rows:Object.values(combos).map(o=>({...o,l:stem(o.wt+' 200px "'+o.fam+'"','l'),one:stem(o.wt+' 200px "'+o.fam+'"','1')}))};});
let bad=0;for(const o of r.rows){const s=Math.min(o.l||9,o.one||9);const ok=s>=0.11||!o.small;if(!ok)bad++;console.log((ok?'  ':'NG ')+o.fam+' '+o.wt+'  縦線 '+(s*100).toFixed(1)+'%（11%以上でOK）  例：'+o.eg.join(' / '));}
console.log(bad?'NG 細い英数字・記号がある（'+bad+'種類）':'英数字・記号の太さ OK');await b.close();process.exit(bad?1:0);})();
