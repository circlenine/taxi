// 全ページの枠線の太さを集めて、決めた太さだけかを調べる
// きまり：線は全部 1px（0.26mm）。左の太い線もやめた（10/7 ご指示「ふちは全てそろえる」）（表紙のロゴ・写真の名札の白いふちは除く）
const { chromium } = require('playwright');
(async()=>{const [src,list]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const MM=96/25.4,out={};
 document.querySelectorAll('.page *').forEach(e=>{if(e.closest('svg'))return;const cs=getComputedStyle(e);const rr=e.getBoundingClientRect();if(!rr.width)return;
  ['Top','Right','Bottom','Left'].forEach(s=>{const w=parseFloat(cs['border'+s+'Width']);if(!w||cs['border'+s+'Style']==='none')return;
   const mm=(w/MM).toFixed(2);const k=mm+'mm '+s;(out[k]=out[k]||new Set()).add(typeof e.className==='string'?e.className:e.tagName);});
  const ow=parseFloat(cs.outlineWidth);if(ow&&cs.outlineStyle!=='none'){const k=(ow/MM).toFixed(2)+'mm outline';(out[k]=out[k]||new Set()).add(typeof e.className==='string'?e.className:e.tagName);}});
 return Object.fromEntries(Object.entries(out).map(([k,v])=>[k,[...v].slice(0,8)]));});
if(list){console.log(JSON.stringify(r,null,1));}
const okv=k=>{const [mm,side]=k.split(/mm /);const v=+mm;return Math.abs(v-0.26)<.02;};
const bad=Object.entries(r).filter(([k])=>!okv(k));
console.log(bad.length?bad.map(([k,v])=>'NG 決めていない線の太さ '+k+' … '+v.join(' / ')).join('\n'):'線の太さ OK（全部 1px）');
await b.close();})();
