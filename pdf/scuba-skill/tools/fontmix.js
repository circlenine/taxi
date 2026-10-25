// 本文の字のまざり点検（10/20）：本文の中で、文字の入った部分が本文の字になっているかを全部調べる。
// 題・札（白文字の枠）・写真の下の小さな説明は対象外。まざっていたら止める。
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});
try{await p.waitForFunction(()=>window.__laid===true,{timeout:20000});}catch(e){}
const want=process.argv[3];if(!want){console.log('本文の字の点検は、この形では行いません');await b.close();return;}
const bad=await p.evaluate((want)=>{const out=[];
 const roots=document.querySelectorAll('.notes,.sasuke,.bg,.mts,.qz,.nmr .ds,.howto,.relnote,.pts');
 const chip='.nk,.mtk,.lx,.lp,.half,.nn,.nn2,.qh,.mk,.sn,.no,.tl,.play';
 for(const r of roots){const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){if(!n.textContent.trim())continue;const e=n.parentElement;if(e.closest(chip)||e.closest('.emj'))continue;
   const f=getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g,'').trim();
   if(f!==want)out.push((e.closest('.page')||{}).id+' '+f+' 「'+n.textContent.trim().slice(0,16)+'」');}}
 return out;},want);
// 10/20 題（ページの題・表紙）のほかは、どこも本文の字か（見出し・札・番号・もくじ・写真の名前も）
const bad2=await p.evaluate((want)=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){if(!n.textContent.trim())continue;const e=n.parentElement;if(!e.closest('.page')||e.closest('.emj,svg,.cover,script,style'))continue;
  const h2=e.closest('h2');if(h2&&!h2.classList.contains('toch')&&!e.closest('.half')){const f2=getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g,'').trim();if(f2!==want)out.push((e.closest('.page')||{}).id+' ページの見出しが本文の字でない '+f2+'「'+n.textContent.trim().slice(0,12)+'」');continue;}
  const f=getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g,'').trim();if(f!==want)out.push((e.closest('.page')||{}).id+' '+f+' .'+e.className+'「'+n.textContent.trim().slice(0,12)+'」');}
 return out;},want);
if(want!=='Kaisei Decol'&&bad2.length){console.log('NG 題のほかに、本文と違う字がある（'+bad2.length+'か所）');[...new Set(bad2)].slice(0,12).forEach(x=>console.log('  '+x));process.exit(1);}
if(bad.length){console.log('NG 本文の中で字がまざっている（'+bad.length+'か所）');bad.slice(0,15).forEach(x=>console.log('  '+x));process.exit(1);}
console.log('本文の字 OK（ぜんぶ '+want+'）');await b.close();})();
