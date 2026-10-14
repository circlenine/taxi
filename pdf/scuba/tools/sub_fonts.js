// 副題と「〇〇編」のデザイン案・第2弾（10/15 ご指摘：フォントからやり直す）。PDFは作らない
// どの案も：形はシャープ（角の丸み0〜1mm）・色は決めた色だけ（紺・青・パステル青・字の黒・ピンク）
const { chromium } = require('playwright');
const FONTS='https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;800&family=Kaisei+Decol:wght@500;700&family=Zen+Kaku+Gothic+New:wght@300;900&family=Murecho:wght@300;800&family=Zen+Old+Mincho:wght@600;900&display=block';
const BASE=`#p1 .cv-sd .g{color:#e0507f} .cover .cv-no,.cover .cv-e{font-feature-settings:normal}`;
const V={
 f1:{name:'明朝（しっぽり明朝）',css:`
  #p1 .cv-sd{font-family:"Shippori Mincho B1",serif!important;font-weight:500!important;color:#16466b!important;letter-spacing:.12em!important}
  .cover .cv-f{gap:0!important;align-items:stretch!important;border-top:1px solid #16466b!important;border-bottom:1px solid #16466b;padding:1.6mm 0!important}
  .cover .cv-no{font-family:"Shippori Mincho B1",serif!important;font-weight:800!important;border-radius:0!important}
  .cover .cv-e{font-family:"Shippori Mincho B1",serif!important;font-weight:800!important;background:none!important;color:#16466b!important;border-radius:0!important;letter-spacing:.2em!important;padding:0 6mm!important}`},
 f2:{name:'飾り明朝（解星デコール）',css:`
  #p1 .cv-sd{font-family:"Kaisei Decol",serif!important;font-weight:500!important;color:#1c6ea4!important;letter-spacing:.08em!important}
  .cover .cv-f{gap:3mm!important;align-items:center!important}
  .cover .cv-no{font-family:"Kaisei Decol",serif!important;font-weight:700!important;background:#fff!important;color:#16466b!important;border-radius:0!important;box-shadow:inset 0 0 0 1.2mm #16466b}
  .cover .cv-e{font-family:"Kaisei Decol",serif!important;font-weight:700!important;background:none!important;color:#16466b!important;border-radius:0!important;padding:0!important;letter-spacing:.14em!important;box-shadow:inset 0 -1.4mm 0 #d4ecfa}`},
 f3:{name:'細い×太いゴシック（禅角ゴシック）',css:`
  #p1 .cv-sd{font-family:"Zen Kaku Gothic New",sans-serif!important;font-weight:300!important;color:#1f2a37!important;letter-spacing:.16em!important}
  .cover .cv-f{gap:0!important;align-items:center!important}
  .cover .cv-no{font-family:"Zen Kaku Gothic New",sans-serif!important;font-weight:900!important;background:none!important;color:#1c6ea4!important;border-radius:0!important;padding:0 4mm 0 0!important;border-right:1.2mm solid #16466b;font-size:52pt!important}
  .cover .cv-e{font-family:"Zen Kaku Gothic New",sans-serif!important;font-weight:900!important;background:none!important;color:#16466b!important;border-radius:0!important;padding:0 0 0 4mm!important;letter-spacing:.12em!important}`},
 f4:{name:'モダンゴシック（ムレチョ）',css:`
  #p1 .cv-sd{font-family:"Murecho",sans-serif!important;font-weight:300!important;color:#16466b!important;letter-spacing:.1em!important;border-left:1mm solid #e0507f;padding-left:2.4mm!important}
  .cover .cv-f{gap:2.4mm!important;align-items:stretch!important}
  .cover .cv-no{font-family:"Murecho",sans-serif!important;font-weight:800!important;border-radius:0!important}
  .cover .cv-e{font-family:"Murecho",sans-serif!important;font-weight:800!important;background:#d4ecfa!important;color:#16466b!important;border-radius:0!important;letter-spacing:.1em!important}`},
 f5:{name:'太い明朝（禅オールド明朝）',css:`
  #p1 .cv-sd{font-family:"Zen Old Mincho",serif!important;font-weight:600!important;color:#1f2a37!important;letter-spacing:.1em!important;text-align:center;border-top:1px solid #a9d8ef;border-bottom:1px solid #a9d8ef;padding:.8mm 0!important}
  .cover .cv-f{gap:0!important;align-items:stretch!important;justify-content:center!important;width:100%}
  .cover .cv-no{font-family:"Zen Old Mincho",serif!important;font-weight:900!important;border-radius:0!important}
  .cover .cv-e{font-family:"Zen Old Mincho",serif!important;font-weight:900!important;background:#fff!important;color:#16466b!important;border-radius:0!important;box-shadow:inset 0 0 0 1px #16466b;letter-spacing:.2em!important;padding:0 8mm!important}`},
};
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
