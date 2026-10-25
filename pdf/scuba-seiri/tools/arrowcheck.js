// しおり（矢印）の札：字の左の余白と、字の右〜矢印の付け根までの余白が同じか（10/20 まーく様「右が広いので、左も同じくらいに」）
// 画面に描いた字（白い点）の左右のはしを、写真にして測る。矢印の先（右の三角）は数えない。差が 0.3mm より大きければ止める
const { chromium } = require('playwright');const {PNG}=require('pngjs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const SC=4;const p=await b.newPage({deviceScaleFactor:SC});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const MM=96/25.4;const els=await p.$$('.page .no,.page .tl,.page .sn,.page .qh');const kinds={};let bad=0,n=0;
for(const e of els){const info=await e.evaluate(el=>{const cp=getComputedStyle(el).clipPath;const m=cp&&cp.match(/calc\(100% - ([\d.]+)px\)/);return {c:el.className,t:el.textContent.trim(),tip:m?+m[1]:0}});
 if(!info.tip)continue;await e.scrollIntoViewIfNeeded();const bb=await e.boundingBox();if(!bb||bb.width<5)continue;
 const png=PNG.sync.read(await e.screenshot());let mn=1e9,mx=-1;
 const isW=(x,y)=>{const k=(y*png.width+x)*4;return png.data[k]>200&&png.data[k+1]>200&&png.data[k+2]>200;};
 const dark=(x,y)=>{const k=(y*png.width+x)*4;return png.data[k]+png.data[k+1]+png.data[k+2]<400;};
 // 札の地（濃い色）の左はし。字は、その中の白い点だけを数える
 let bx0=1e9;for(let y=Math.floor(png.height*.3);y<png.height*.7;y++)for(let x=0;x<png.width;x++){if(dark(x,y)){if(x<bx0)bx0=x;break;}}
 // 字は、地の中（上下のはしの白いすき間を除く）だけで探す：その行の左右が両方とも濃い色の行だけ
 const base=Math.floor(png.width-info.tip*SC)-1;
 for(let y=1;y<png.height-1;y++){if(!dark(bx0+1,y)||!dark(base-1,y))continue;for(let x=bx0+2;x<base-1;x++){if(isW(x,y)){if(x<mn)mn=x;if(x>mx)mx=x;}}}
 mn-=bx0;
 if(mx<0)continue;n++;const L=mn/SC/MM,R=(base+1-(mx+1))/SC/MM;   /* 左：地の左はし〜字の左はし／右：字の右はし〜矢印の付け根 */(kinds[info.c]=kinds[info.c]||[]).push({t:info.t,L,R});if(Math.abs(L-R-1.12)>0.35){bad++;/* 10/23 まーく様「やや左寄りに見える」→ 矢印の先のぶん、字を0.6mm右へ（左の余白が右より1.2mm多い形が正しい） */console.log('  ずれ「'+info.t+'」左'+L.toFixed(2)+'・右'+R.toFixed(2)+'mm');}}
for(const [k,a] of Object.entries(kinds)){const d=a.map(x=>x.L-x.R);console.log('  '+k+' '+a.length+'個 左-右 '+Math.min(...d).toFixed(2)+'〜'+Math.max(...d).toFixed(2)+'mm 例「'+a[0].t+'」左'+a[0].L.toFixed(2)+'・右'+a[0].R.toFixed(2)+'mm');}
console.log(bad?'NG しおりの札：字の左右の余白がそろっていない（'+bad+'個）':'しおりの札 OK（'+n+'個・字の左右の余白が同じ）');await b.close();process.exit(bad?1:0);})();
