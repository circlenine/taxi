// 表紙の題のデザイン案を、本物の表紙に差し込んで画像にする（10/15 ご依頼：ガーリーな題の案をいくつか）
const { chromium } = require('playwright');
const FONTS='https://fonts.googleapis.com/css2?family=Pacifico&family=Dancing+Script:wght@700&family=Fredoka:wght@600;700&family=Baloo+2:wght@800&family=Quicksand:wght@700&display=block';
const E1='<span class="emj">🫧</span>', E2='<span class="emj">🤿</span>';
const ROSE='#e0507f';
// m = 本の色（準備編は紺、洗浄編は茶）、a = 明るい色、pl = 薄い色
const V={
 v1:{name:'スクリプト',html:()=>`${E1} <span class="w">Safe Dive for a <span class="g">Girlie</span> smile</span> ${E2}`,
  css:c=>`.ttl{font-family:'Pacifico',cursive;font-weight:400;color:${c.m};letter-spacing:.01em}
   .ttl .w{-webkit-text-stroke:0;text-shadow:0 .06em 0 ${c.pl},0 .1em .12em rgba(0,0,0,.08)} .ttl .g{color:${ROSE}}`},
 v2:{name:'ミックス',html:()=>`${E1} <span class="r">Safe Dive for a</span> <span class="g">Girlie</span> <span class="r">smile</span> ${E2}`,
  css:c=>`.ttl{font-family:'Fredoka',sans-serif;font-weight:700;color:${c.m};letter-spacing:.01em}
   .ttl .g{font-family:'Pacifico',cursive;font-weight:400;color:${ROSE};font-size:1.18em;display:inline-block;transform:rotate(-5deg) translateY(-.04em);text-shadow:0 .05em 0 #ffd9e4}
   .wave{display:block;height:3.2mm;margin-top:-.6mm;background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='12' viewBox='0 0 40 12'><path d='M0 6 Q10 0 20 6 T40 6' fill='none' stroke='${encodeURIComponent(c.a)}' stroke-width='2.4' stroke-linecap='round'/></svg>") repeat-x center/9mm 3.2mm;opacity:.75}`},
 v3:{name:'リボン',html:()=>`${E1} <span class="r">Safe Dive for a</span> <span class="g">Girlie</span> <span class="r">smile</span> ${E2}`,
  css:c=>`.ttl{font-family:'Quicksand',sans-serif;font-weight:700;color:${c.m};letter-spacing:.04em;background:${c.pl};border-radius:999px;padding:.12em .55em .16em;box-shadow:inset 0 0 0 .05em ${c.a}55}
   .ttl .g{font-family:'Dancing Script',cursive;font-weight:700;color:${ROSE};font-size:1.25em;letter-spacing:0}`},
 v4:{name:'ステッカー',html:()=>`${E1} <span class="r">Safe Dive for a</span> <span class="g">Girlie</span> <span class="r">smile</span> ${E2}`,
  css:c=>`.ttl{font-family:'Baloo 2',sans-serif;font-weight:800;color:${c.m};letter-spacing:.01em}
   .ttl .r,.ttl .g{-webkit-text-stroke:.14em #fff;paint-order:stroke fill;filter:drop-shadow(.05em .06em 0 ${c.pl}) drop-shadow(0 0 .02em ${c.a}66)}
   .ttl .g{color:${ROSE}}`},
 v5:{name:'エレガント',html:()=>`${E1} <span class="r">Safe Dive for a <span class="g">Girlie</span> smile</span> ${E2}`,
  css:c=>`.ttl{font-family:'Dancing Script',cursive;font-weight:700;letter-spacing:.005em}
   .ttl .r{background:linear-gradient(90deg,${c.m},${c.a});-webkit-background-clip:text;background-clip:text;color:transparent}
   .ttl .g{background:linear-gradient(90deg,${ROSE},#f08bb0);-webkit-background-clip:text;background-clip:text;color:transparent;padding:0 .06em}`},
};
const THEME={'build':{m:'#16466b',a:'#1c6ea4',pl:'#d4ecfa'},'build_s':{m:'#6b3410',a:'#c2571a',pl:'#ffe2cc'}};
(async()=>{const [S,OUT]=process.argv.slice(2);const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const ed of ['build','build_s'])for(const [k,v] of Object.entries(V).filter(([k])=>!process.env.ONLY||k===process.env.ONLY)){
 const p=await b.newPage({deviceScaleFactor:2});await p.emulateMedia({media:'print'});await p.goto('file://'+S+'/'+ed+'/a4.html',{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
 const c=THEME[ed];
 await p.evaluate(({FONTS,html,css,wave})=>{const l=document.createElement('link');l.rel='stylesheet';l.href=FONTS;document.head.appendChild(l);
  const st=document.createElement('style');st.textContent=css+`#p1 .cv-t .ttl{display:inline-block;white-space:nowrap;line-height:1.25} #p1 .cv-t{font-family:inherit;line-height:1.25} #p1 .cv-t .emj{font-family:"Noto Color Emoji",sans-serif;font-weight:400;-webkit-text-stroke:0;text-shadow:none;color:initial;background:none}`;document.head.appendChild(st);
  const h=document.querySelector('#p1 .cv-t');h.innerHTML='<span class="ttl">'+html+'</span>';if(wave){const w=document.createElement('span');w.className='wave';h.after(w);}},{FONTS,html:v.html(),css:v.css(c),wave:k==='v2'});
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(800);await p.evaluate(()=>document.fonts.ready);
 // ページ（本文）の幅いっぱいに合わせる：題のかたまり（ふち・背景もふくむ）の幅で測る
 const fit=await p.evaluate(()=>{const c=document.querySelector('#p1 .cover'),W=c.getBoundingClientRect().width,h=c.querySelector('.cv-t'),t=h.querySelector('.ttl');
  let lo=8,hi=200;for(let i=0;i<24;i++){const m=(lo+hi)/2;h.style.setProperty('font-size',m+'px','important');if(t.getBoundingClientRect().width<=W-2)lo=m;else hi=m;}
  h.style.setProperty('font-size',lo+'px','important');if(t.classList)t.style.width='';const r=t.getBoundingClientRect();return {fs:lo,w:r.width/W};});
 const g=await p.evaluate(()=>{const pg=document.querySelector('#p1').getBoundingClientRect(),f=document.querySelector('#p1 .cv-f').getBoundingClientRect();return {x:pg.left,y:pg.top,w:pg.width,h:f.bottom-pg.top+16};});
 await p.screenshot({path:`${OUT}/${k}_${ed}.png`,clip:{x:g.x,y:g.y,width:g.w,height:g.h}});
 console.log(k,ed,v.name,'fs',fit.fs.toFixed(1),'幅',(fit.w*100).toFixed(1)+'%');await p.close();}
await b.close();})();
