// 副題と「〇〇編」のデザイン案（シャープ版）を、本物の表紙に差し込んで画像にする（10/15）。PDFは作らない
const { chromium } = require('playwright');
// どの案も：ページ全体と同じ Noto Sans JP・角の丸み1mm・決めた色だけ（紺・青・パステル青。洗浄編は自動で茶・オレンジ）
const BASE=`#p1 .cv-sd .g{color:#e0507f}`;   // 副題の SDGs はピンク（10/15 ご指示）
const V={
 s1:{name:'ひと続きの札',css:BASE+`
  #p1 .cv-sd{font-weight:700!important;color:#1c6ea4!important;letter-spacing:.05em!important}
  .cover .cv-f{gap:0!important;align-items:stretch!important}
  .cover .cv-no{border-radius:1mm 0 0 1mm!important}
  .cover .cv-e{border-radius:0 1mm 1mm 0!important;box-shadow:inset 0 -1.2mm 0 #16466b;padding:0 6mm!important}`},
 s2:{name:'見出し帯',css:BASE+`
  #p1 .cv-sd{font-weight:700!important;color:#16466b!important;letter-spacing:.05em!important;border-left:1.6mm solid #1c6ea4;padding-left:3mm!important;background:#f1f8fc}
  .cover .cv-f{gap:2.4mm!important}
  .cover .cv-e{background:none!important;color:#16466b!important;box-shadow:inset 0 -2.4mm 0 #d4ecfa;border-radius:0!important;padding:0 1mm!important;line-height:1.2!important}`},
 s3:{name:'わく',css:BASE+`
  #p1 .cv-sd{font-weight:500!important;color:#1f2a37!important;letter-spacing:.08em!important;border-top:1px solid #a9d8ef;border-bottom:1px solid #a9d8ef;padding:.6mm 0!important;text-align:center}
  .cover .cv-f{gap:0!important;align-items:stretch!important}
  .cover .cv-no{border-radius:1mm 0 0 1mm!important}
  .cover .cv-e{border-radius:0 1mm 1mm 0!important;background:#fff!important;border:1.2mm solid #16466b!important;border-left:0!important;padding:0 7mm!important}`},

 s4:{name:'マーカー',css:BASE+`
  #p1 .cv-sd{font-weight:500!important;color:#1f2a37!important;letter-spacing:.1em!important}
  .cover .cv-f{gap:3mm!important;align-items:center!important}
  .cover .cv-e{background:linear-gradient(transparent 58%,#d4ecfa 58%)!important;color:#16466b!important;border-radius:0!important;padding:0 1.5mm!important}`},
 s5:{name:'線をのばす',css:BASE+`
  #p1 .cv-sd{font-weight:700!important;color:#1c6ea4!important;letter-spacing:.06em!important}
  .cover .cv-f{gap:3mm!important;align-items:center!important;width:100%}
  .cover .cv-e{background:none!important;color:#16466b!important;padding:0!important}
  .cover .cv-f::after{content:"";flex:1;height:1.2mm;background:#16466b;border-radius:0}`},
 s6:{name:'こい帯',css:BASE+`
  #p1 .cv-sd{font-weight:700!important;color:#16466b!important;letter-spacing:.06em!important}
  .cover .cv-f{gap:0!important;align-items:stretch!important;background:#16466b;border-radius:1mm;width:100%}
  .cover .cv-no{background:#fff!important;color:#16466b!important;border-radius:0!important;box-shadow:inset 0 0 0 1.2mm #16466b}
  .cover .cv-e{background:none!important;color:#fff!important;padding:0 6mm!important}`},
};
(async()=>{const [S,OUT]=process.argv.slice(2);const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const ed of ['build','build_s']){
 // まずは今の形（案の前）も1枚撮る
 for(const [k,v] of [['s0',{name:'いまの形',css:BASE}],...Object.entries(V)]){
 const p=await b.newPage({deviceScaleFactor:2});await p.emulateMedia({media:'print'});await p.goto('file://'+S+'/'+ed+'/a4.html',{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
 await p.evaluate(({css,ed})=>{
  const rec=ed==='build_s'?{'#16466b':'#6b3410','#1c6ea4':'#c2571a','#d4ecfa':'#ffe2cc','#a9d8ef':'#f6c095','#f1f8fc':'#fff6ef'}:{};
  for(const [a,c] of Object.entries(rec))css=css.split(a).join(c);
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  if(typeof fitCover==='function')fitCover();},{css:v.css,ed});
 await p.waitForTimeout(300);
 const g=await p.evaluate(()=>{const pg=document.querySelector('#p1').getBoundingClientRect(),f=document.querySelector('#p1 .cv-f').getBoundingClientRect();return {x:pg.left,y:pg.top,w:pg.width,h:f.bottom-pg.top+16};});
 await p.screenshot({path:`${OUT}/${k}_${ed}.png`,clip:{x:g.x,y:g.y,width:g.w,height:g.h}});await p.close();}}
await b.close();})();
