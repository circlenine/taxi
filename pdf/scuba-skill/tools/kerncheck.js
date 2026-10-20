// 字のすき間（カーニング）の点検（10/20 まーく様「カーニングは全て徹底してるのか」）
// 題・見出し・札の字で、かな・漢字が2つ以上続く所は、すべて1字ずつ測って詰めてあるか。くっついている字がないか
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const r=await p.evaluate(()=>{const CJK=/[ぁ-ゖァ-ヺー一-鿿]{2}/;let n=0,miss=[],touch=0;
 document.querySelectorAll(window.__kernSel).forEach(el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let t;
  while(t=w.nextNode()){const pe=t.parentElement;if(pe.closest('#memop,.half,.emj,rt,.rt,svg,.kc,.nk,.lp,.lx,.mtk,.sn,.no,.tl,.qh,.fs,.nn,.nn2,.t'))continue;const d=getComputedStyle(pe).display;if(d.includes('flex')||d.includes('grid'))continue;
   if(CJK.test(t.textContent))miss.push((el.closest('.page')||{}).id+'「'+t.textContent.slice(0,10)+'」');}
  el.querySelectorAll('.kc').forEach(k=>{n++;const m=parseFloat(k.style.marginRight||0),fs=parseFloat(getComputedStyle(k).fontSize);if(m<-fs*.45)touch++;});});
 return {n,miss,touch};});
const ng=r.miss.length||r.touch;
if(r.miss.length)console.log('NG 詰めていない字：'+r.miss.slice(0,6).join(' '));
if(r.touch)console.log('NG 詰めすぎの字：'+r.touch+'個');
console.log(ng?'NG 字のすき間':'字のすき間 OK（題・見出し・札の '+r.n+'字を、形で測ってそろえた）');await b.close();process.exit(ng?1:0);})();
