// 副題と「〇〇編」のデザイン案・第2弾（10/15 ご指摘：フォントからやり直す）。PDFは作らない
// どの案も：形はシャープ（角の丸み0〜1mm）・色は決めた色だけ（紺・青・パステル青・字の黒・ピンク）
const { chromium } = require('playwright');
const FONTS='https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;800&family=Kaisei+Decol:wght@500;700&family=Zen+Kaku+Gothic+New:wght@300;900&family=Murecho:wght@300;800&family=Zen+Old+Mincho:wght@600;900&display=block';
const V={
 // A 本文と地続き：表紙の「〇〇編」を、全ページ左上の小さな札（■1 器材準備編）をそのまま大きくした形にする
 a:{css:`
  #p1 .cv-sd{font-weight:700!important;color:#1c6ea4!important;letter-spacing:.04em!important}
  .cover .cv-f{gap:3mm!important;align-items:center!important}
  .cover .cv-no{border-radius:1mm!important}
  .cover .cv-e{background:none!important;color:#16466b!important;padding:0!important;letter-spacing:.08em!important}`},
 // B 題の言葉をほどく：副題は控えめにして「SDGs」だけ強く。題のピンクの頭文字と、副題のSDGsが目の中でつながる
 b:{css:`
  #p1 .cv-sd{font-weight:500!important;color:#1f2a37!important;letter-spacing:.04em!important}
  #p1 .cv-sd .g{font-weight:900;box-shadow:inset 0 -.32em 0 #ffe3ea}
  .cover .cv-f{gap:0!important;align-items:stretch!important}
  .cover .cv-no{border-radius:1mm 0 0 1mm!important}
  .cover .cv-e{background:#fff!important;color:#16466b!important;border-radius:0 1mm 1mm 0!important;box-shadow:inset 0 0 0 1px #16466b;padding:0 6mm!important}`},
 // C 海の静けさ：副題は明朝で静かな声に。「〇〇編」の上に水面のような細い線を1本。字の間を広くとって、息つく余白を作る
 c:{css:`
  #p1 .cv-sd{font-family:"Zen Old Mincho",serif!important;font-weight:600!important;color:#1f2a37!important;letter-spacing:.1em!important}
  #p1 .cover .cv-f{border-top:1px solid #1c6ea4!important;padding-top:2.4mm!important;margin-top:1mm!important;gap:3mm!important;align-items:center!important}
  .cover .cv-no{border-radius:1mm!important}
  .cover .cv-e{font-family:"Zen Old Mincho",serif!important;font-weight:900!important;background:none!important;color:#16466b!important;padding:0!important;letter-spacing:.22em!important}`},
 // D シリーズの背表紙：数字をいちばん大きく、帯を本の色にして、何冊目かが小さい画面でもひと目で分かるように
 d:{css:`
  #p1 .cv-sd{font-weight:700!important;color:#1f2a37!important;letter-spacing:.04em!important}
  .cover .cv-f{gap:0!important;align-items:stretch!important;width:100%;background:#d4ecfa;border-radius:1mm}
  .cover .cv-no{border-radius:1mm 0 0 1mm!important;min-width:24mm!important;font-size:54pt!important;line-height:1.1!important}
  .cover .cv-e{background:none!important;color:#16466b!important;padding:0 6mm!important;align-self:center;font-size:34pt!important}`},
};
const BASE=`#p1 .cv-sd .g{color:#e0507f}`;
(async()=>{const [S,OUT]=process.argv.slice(2);const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const ed of ['build','build_s'])for(const [k,v] of Object.entries(V)){
 const p=await b.newPage({deviceScaleFactor:2});await p.emulateMedia({media:'print'});await p.goto('file://'+S+'/'+ed+'/a4.html',{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
 await p.evaluate(({css,ed,FONTS})=>{
  const rec=ed==='build_s'?{'#16466b':'#6b3410','#1c6ea4':'#c2571a','#d4ecfa':'#ffe2cc','#a9d8ef':'#f6c095','#f1f8fc':'#fff6ef'}:{};
  for(const [a,c] of Object.entries(rec))css=css.split(a).join(c);
  const l=document.createElement('link');l.rel='stylesheet';l.href=FONTS;document.head.appendChild(l);
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);},{css:BASE+v.css,ed,FONTS});
 await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
 await p.evaluate(()=>{if(typeof fitCover==='function')fitCover();});await p.waitForTimeout(200);
 const g=await p.evaluate(()=>{const pg=document.querySelector('#p1').getBoundingClientRect(),f=document.querySelector('#p1 .cv-f').getBoundingClientRect();return {x:pg.left,y:pg.top,w:pg.width,h:f.bottom-pg.top+16};});
 await p.screenshot({path:`${OUT}/${k}_${ed}.png`,clip:{x:g.x,y:g.y,width:g.w,height:g.h}});await p.close();}
await b.close();})();
