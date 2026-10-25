// ロゴの点検（10/20）
//  ・にっこり（波のくぼみ）が smile の字のまん中に、左右対称にあるか
//  ・ロゴの海の帯の左右が、表紙の本文の幅（番号の箱の左はし〜右はし）とそろっているか
//  ・サブタイトルでピンクなのが「笑顔」「安全」だけか
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
try{await p.waitForFunction(()=>window.__laid===true,{timeout:20000});}catch(e){}
const r=await p.evaluate(()=>{const svg=document.querySelector('#p1 .cv-logo svg');if(!svg)return null;
 const t=svg.querySelectorAll('text.lf-p')[1];const n=t.textContent.length;const a=t.getExtentOfChar(n-5),z=t.getExtentOfChar(n-1);const c=(a.x+z.x+z.width)/2;
 const w=svg.querySelector('path.smilewave');const L=w.getTotalLength();let best={y:-1,x:0};const pts=[];
 for(let i=0;i<L;i+=1){const q=w.getPointAtLength(i);if(q.y>290)continue;pts.push(q);if(q.x>c-200&&q.x<c+200&&q.y>best.y)best={x:q.x,y:q.y};}
 const yAt=x=>{let m=null,d=1e9;for(const q of pts){if(Math.abs(q.x-x)<d){d=Math.abs(q.x-x);m=q.y;}}return m;};
 const sym=Math.abs(yAt(c-60)-yAt(c+60));
 const rr=svg.getBoundingClientRect(),cv=document.querySelector('#p1 .cover').getBoundingClientRect();
 const box=document.querySelector('#p1 .cv-no');const bx=box?box.getBoundingClientRect():cv;
 const pink=[...svg.querySelectorAll('text.lf-k tspan')].map(e=>e.textContent);
 // 10/21 まーく様「安全と笑顔、黄色などにして視認性を良く」→ 色つきの字と、うしろの帯（濃い波）の明るさの差（コントラスト比）を測る
 const lum=h=>{const v=h.replace('#','').match(/../g).map(x=>{x=parseInt(x,16)/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
 const band=[...svg.querySelectorAll('path')].map(e=>e.getAttribute('fill')).filter(f=>f&&/^#[0-9a-f]{6}$/i.test(f)).pop();
 const hl=svg.querySelector('text.lf-k tspan').getAttribute('fill');const A=lum(hl),B=lum(band);const cr=(Math.max(A,B)+.05)/(Math.min(A,B)+.05);
 return {c,tx:best.x,ty:best.y,sym,dl:rr.left-bx.left,dr:rr.right-cv.right,pink,cr,hl,band};});
if(!r){console.log('ロゴの点検：この形は対象外');await b.close();return;}
const ng=[];
if(Math.abs(r.tx-r.c)>4)ng.push('にっこりのいちばん下 '+r.tx.toFixed(1)+' が smile のまん中 '+r.c.toFixed(1)+' からずれ');
if(r.sym>1.5)ng.push('にっこりが左右対称でない（差 '+r.sym.toFixed(1)+'）');
if(Math.abs(r.dl)>1||Math.abs(r.dr)>1)ng.push('ロゴの左右が本文の幅とずれ（左 '+r.dl.toFixed(1)+'px・右 '+r.dr.toFixed(1)+'px）');
if(r.cr<3)ng.push('「笑顔・安全」の色 '+r.hl+' が、うしろの帯 '+r.band+' と見分けにくい（明るさの差 '+r.cr.toFixed(2)+'。3以上にする）');
if(r.pink.join('/')!=='笑顔/安全')ng.push('サブタイトルの色つきが「笑顔・安全」でない：'+r.pink.join('/'));
console.log(ng.length?'NG ロゴ：'+ng.join('／'):'ロゴ OK（にっこりは smile のまん中・左右対称／幅は本文と同じ／色つきは 笑顔・安全）');
await b.close();process.exit(ng.length?1:0);})();
