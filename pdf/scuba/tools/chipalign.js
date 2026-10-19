// 札（大事・補足・NEW!! など）の「背景の箱」と「字」の上下がずれていないかを、画面を撮って確かめる
// 10/19 まーく様：「大事のタグの背景も、字とズレてます」。幅・字の大きさだけ見ていて、位置を見ていなかった
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
(async()=>{const src=process.argv[2];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({deviceScaleFactor:3});await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});
try{await p.waitForFunction(()=>window.__laid===true,{timeout:20000});}catch(e){}
const sel='.lp,.lx,.mtk,.half.rel,.nk,.q2h,.tag';const els=await p.$$(sel);let bad=0,seen={};
for(const e of els){if(await e.evaluate(n=>!!n.closest('.ph.band')))continue;   // 帯の中の札は、地が濃く測りまちがえるので外す（目で確かめる）
 const box=await e.boundingBox();if(!box||box.height<4)continue;
 const txt=(await e.innerText()).trim();const pg=await e.evaluate(n=>n.closest('.page')?.id||'');
 const fc=await e.evaluate(n=>getComputedStyle(n).color.match(/\d+/g).slice(0,3).map(Number));
 const buf=await e.screenshot();const png=PNG.sync.read(buf);const {width:w,height:h,data}=png;
 // 地の色＝箱のまん中の、上の端から1pxの色。字＝地の色から大きく離れ、字の色に近い画素
 const D=(i,c)=>Math.abs(data[i]-c[0])+Math.abs(data[i+1]-c[1])+Math.abs(data[i+2]-c[2]);
 const bg=[data[(w+Math.floor(w/2))*4],data[(w+Math.floor(w/2))*4+1],data[(w+Math.floor(w/2))*4+2]];
 let x0=w,x1=-1,y0=h,y1=-1;
 for(let y=1;y<h-1;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(D(i,bg)>200&&D(i,fc)<160){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
 if(x1<0)continue;
 const mL=x0,mR=w-1-x1,mT=y0,mB=h-1-y1;
 const offy=((y0+y1)/2-h/2)/h, offx=((x0+x1)/2-w/2)/w;
 if(Math.abs(offy)>0.07||Math.abs(offx)>0.07||mL<=1||mR<=1){bad++;console.log(`札の字がずれ ${pg}「${txt}」${await e.evaluate(n=>n.className)} 上下 ${(offy*100).toFixed(0)}%・左右 ${(offx*100).toFixed(0)}%（余白 上${mT} 下${mB} 左${mL} 右${mR}px）`);}}
console.log(bad?`NG 札の字のずれ ${bad}か所`:'札の字の位置 OK');await b.close();process.exit(bad?1:0);})();
