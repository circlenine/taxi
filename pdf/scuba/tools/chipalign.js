// 札（大事・補足・NEW!! など）の「色の箱」と「字」が、上下左右ともまん中にそろっているかを確かめる
// 10/20 作り直し：1枚の写真で「地の色」と「字」を見分けようとすると、角の丸みや白い字・白い地でまちがえた
//   （実際に、下に寄った「大事」を見のがした）。そこで、同じ札を2回写す
//   ①字を透明にして写す → 色の箱の範囲　②箱の色を消して写す → 字の範囲
//   この2つの、上下・左右のすき間をくらべる
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
(async()=>{const src=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({deviceScaleFactor:4});await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});
try{await p.waitForFunction(()=>window.__laid===true,{timeout:20000});}catch(e){}
const sel='.lp,.lx,.mtk,.half.rel,.nk,.q2h,.tag';const els=await p.$$(sel);let bad=0,n=0;
const shot=async e=>PNG.sync.read(await e.screenshot({omitBackground:true}));
const ext=(png,test)=>{const {width:w,height:h,data}=png;let x0=w,x1=-1,y0=h,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(test(data,i)){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}return x1<0?null:{x0,x1,y0,y1};};
for(const e of els){const box=await e.boundingBox();if(!box||box.height<4)continue;
 const txt=(await e.innerText()).trim();const pg=await e.evaluate(n=>n.closest('.page')?.id||'');
 const keep=await e.evaluate(n=>[n.style.color,n.style.background,n.style.boxShadow,n.style.webkitTextFillColor]);
 // まわりを透明にして写すため、ページの地・親の地は写らない（omitBackground＋親は写さない）
 await e.evaluate(n=>{n.style.setProperty('color','transparent','important');n.style.setProperty('-webkit-text-fill-color','transparent','important');n.querySelectorAll('*').forEach(c=>{c.style.setProperty('color','transparent','important');});});
 const A=await shot(e);
 await e.evaluate((n,k)=>{n.style.color=k[0];n.style.webkitTextFillColor=k[3];n.querySelectorAll('*').forEach(c=>c.style.removeProperty('color'));n.style.setProperty('background','transparent','important');n.style.setProperty('box-shadow','none','important');},keep);
 const B=await shot(e);
 await e.evaluate((n,k)=>{n.style.background=k[1];n.style.boxShadow=k[2];},keep);
 // A と B の差：A は箱だけ、B は字だけ。どちらも写真の地は白（ページ）なので、白からの差で見る
 const far=(d,i)=>Math.abs(d[i]-255)+Math.abs(d[i+1]-255)+Math.abs(d[i+2]-255)>90&&d[i+3]>0;
 const a=ext(A,(d,i)=>d[i+3]>0&&Math.abs(d[i]-255)+Math.abs(d[i+1]-255)+Math.abs(d[i+2]-255)>24);   // 箱はうすい色もあるので、白から少しでも違えば箱
 // 字は、A（箱だけ）と B（字だけ）で色が変わった所
 const {width:w,height:h}=B;const bx={x0:w,x1:-1,y0:h,y1:-1};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;const d=Math.abs(A.data[i]-B.data[i])+Math.abs(A.data[i+1]-B.data[i+1])+Math.abs(A.data[i+2]-B.data[i+2]);
   const inBox=a&&x>=a.x0&&x<=a.x1&&y>=a.y0&&y<=a.y1;
   if(inBox&&far(B.data,i)&&d>0){/*字が地と同じ白のときは、Bでは見えない→下でAの箱の中の白抜きを使う*/}
 }
 const fcWhite=await e.evaluate(n=>{const m=getComputedStyle(n).color.match(/\d+/g).map(Number);return m[0]+m[1]+m[2]>700;});
 let t;
 if(fcWhite){ // 白い字：字を透明にしたAと、元の見た目Cをくらべ、Cで白くなった所が字
   await e.evaluate(n=>{});const C=await shot(e);
   t=ext(C,(d,i)=>{const x=(i/4)%w,y=Math.floor(i/4/w);if(!a||x<a.x0||x>a.x1||y<a.y0||y>a.y1)return false;return Math.abs(d[i]-A.data[i])+Math.abs(d[i+1]-A.data[i+1])+Math.abs(d[i+2]-A.data[i+2])>120;});
 }else{t=ext(B,far);}
 if(!a||!t)continue;n++;
 const mL=t.x0-a.x0,mR=a.x1-t.x1,mT=t.y0-a.y0,mB=a.y1-t.y1,BW=a.x1-a.x0+1,BH=a.y1-a.y0+1;
 const offy=(mT-mB)/2/BH,offx=(mL-mR)/2/BW;
 if(Math.abs(offy)>0.05||Math.abs(offx)>0.06||mL<=2||mR<=2||mT<0||mB<0){bad++;console.log(`札の字がずれ ${pg}「${txt}」 上下 ${(offy*100).toFixed(0)}%・左右 ${(offx*100).toFixed(0)}%（すき間 上${mT} 下${mB} 左${mL} 右${mR}px）`);}}
console.log(bad?`NG 札の字のずれ ${bad}か所（${n}個を調べた・札は全部で${els.length}個）`:`札の字の位置 OK（${n}個を調べた・札は全部で${els.length}個）`);await b.close();process.exit(bad?1:0);})();
