// 本文の字のまざり点検（10/20）：本文の中で、文字の入った部分が本文の字になっているかを全部調べる。
// 題・札（白文字の枠）・写真の下の小さな説明は対象外。まざっていたら止める。
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});
try{await p.waitForFunction(()=>window.__laid===true,{timeout:20000});}catch(e){}
const want=process.argv[3];if(!want){console.log('本文の字の点検は、この形では行いません');await b.close();return;}
const bad=await p.evaluate((want)=>{const out=[];
 const roots=document.querySelectorAll('.notes,.sasuke,.bg,.mts,.qz,.nmr .ds,.howto,.relnote,.pts');
 const chip='.nk,.fs,.mtk,.lx,.lp,.half,.nn,.nn2,.qh,.mk,.sn,.no,.tl,.play';
 for(const r of roots){const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){if(!n.textContent.trim())continue;const e=n.parentElement;if(e.closest(chip)||e.closest('.emj'))continue;
   const f=getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g,'').trim();
   if(f!==want)out.push((e.closest('.page')||{}).id+' '+f+' 「'+n.textContent.trim().slice(0,16)+'」');}}
 return out;},want);
if(bad.length){console.log('NG 本文の中で字がまざっている（'+bad.length+'か所）');bad.slice(0,15).forEach(x=>console.log('  '+x));process.exit(1);}
console.log('本文の字 OK（ぜんぶ '+want+'）');await b.close();})();
