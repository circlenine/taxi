// 同じ字の札（「NEW！！」「ふり返り」「大事」「補足」など）が、どこでも同じ見た目かを調べる
// 10/13 ご指摘：見出しの中の「NEW！！」は字がつまり、表紙の説明の行の「NEW！！」はつまっていなかった（表記ゆれに見える）
// 字が同じなら、札の幅・字の大きさ・字のつめ方（font-feature-settings）が同じでなければ NG
const { chromium } = require('playwright');
(async()=>{const [src]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const g={};
 document.querySelectorAll('.page .half, .page .nk').forEach(e=>{const t=e.textContent.trim();if(!t)return;const cs=getComputedStyle(e);
  (g[t]=g[t]||[]).push({w:e.getBoundingClientRect().width,f:cs.fontSize+" "+cs.fontWeight,ff:cs.fontFeatureSettings,pg:e.closest('.page').id});});
 const bad=[];for(const [t,a] of Object.entries(g)){const k=x=>x.f+'|'+x.ff;const w0=a[0].w;
  a.forEach(x=>{if(k(x)!==k(a[0])||Math.abs(x.w-w0)>0.5)bad.push(`「${t}」 ${a[0].pg}と${x.pg}で見た目がちがう（幅 ${w0.toFixed(1)}px／${x.w.toFixed(1)}px、字 ${a[0].f}／${x.f}、つめ ${a[0].ff}／${x.ff}）`);});}
 return {bad,n:Object.keys(g).length};});
await b.close();
if(r.bad.length){console.log(r.bad.map(x=>'NG 札 '+x).join('\n'));process.exit(1);}
console.log(`札の見た目 OK（${r.n}種類、同じ字はどこでも同じ見た目）`);})();
