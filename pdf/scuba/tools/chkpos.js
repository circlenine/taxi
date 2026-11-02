// クイズの□と答えの欄の位置（紙の上のpt）を書き出す
const { chromium } = require('playwright');
(async()=>{const [src,out]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const pages=[...document.querySelectorAll('.page')];return [...document.querySelectorAll('.qz')].map(li=>{const pg=li.closest('.page');const pr=pg.getBoundingClientRect();const lr=li.getBoundingClientRect();const cs=getComputedStyle(li,'::before');
 const x=lr.left-pr.left+parseFloat(getComputedStyle(li).paddingLeft)+parseFloat(getComputedStyle(li).borderLeftWidth);const w=parseFloat(cs.width);const st=getComputedStyle(li);const row1=parseFloat(st.gridTemplateRows.split(' ')[0]);const y=lr.top-pr.top+parseFloat(st.borderTopWidth)+parseFloat(st.paddingTop)+(al=>/start/.test(al)?0:/end/.test(al)?row1-w:(row1-w)/2)(cs.alignSelf!=='auto'?cs.alignSelf:st.alignItems)+parseFloat(cs.marginTop||0); /* 11/2：□の場所は、1段目のどこに寄せてあるか（上・まん中・下）で決まる。スーツ編は上寄せなのに、まん中と決めつけて測り、✓が8pt下にずれた */ /* □は1段目（問題の行）のまん中にある。行全体のまん中ではない（10/8：✓が下にずれていた） */
 const a=li.querySelector('.a').getBoundingClientRect();
 return {page:pages.indexOf(pg),x:x*0.75,y:y*0.75,w:w*0.75,ax:(a.left-pr.left)*0.75,ay:(a.top-pr.top)*0.75,aw:a.width*0.75,ah:a.height*0.75,ar:parseFloat(getComputedStyle(li.querySelector('.a')).borderTopLeftRadius)*0.75};});});
require('fs').writeFileSync(out,JSON.stringify(r));await b.close();})();
