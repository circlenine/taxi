// ▶ の印が、写真の「見せたい部分」にかかっていないかの点検（10/21 まーく様「右下に画像の重要部分は被らないように」）
// focus*.py が、すみごとに「見せたい部分・赤い印にかかるか」を測って、かからないすみを選んでいる（badge.json）。
// ここでは、全部の写真に ▶ が付いていること、印が写真の中に収まっていることを確かめる
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.emulateMedia({media:'print'});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const r=await p.evaluate(()=>{const o=[];let n=0;document.querySelectorAll('.page img[data-k]').forEach(im=>{const R=im.getBoundingClientRect();if(!R.width)return;n++;
 let k=null;const a=[...document.querySelectorAll('a.phv')].find(x=>{const q=x.getBoundingClientRect();return Math.abs(q.left-R.left)<1&&Math.abs(q.top-R.top)<1;});
 if(a)k=a.querySelector('.phb');else{const m=im.closest('a.mtv');if(m)k=m.querySelector('.play');}
 const grp=im.closest('.photos,.sqc');
 if(grp){const ims=[...grp.querySelectorAll('img[data-k]')];const has=ims.filter(x=>{const R2=x.getBoundingClientRect();return [...document.querySelectorAll('a.phv')].some(y=>{const q=y.getBoundingClientRect();return Math.abs(q.left-R2.left)<1&&Math.abs(q.top-R2.top)<1&&y.querySelector('.phb');});});
  if(im===ims[0]&&has.length!==1)o.push((im.closest('.page')||{}).id+' '+im.dataset.k+' の組に ▶ が '+has.length+' 個（1つだけにする）');if(!k)return;}
 if(!k){o.push((im.closest('.page')||{}).id+' '+im.dataset.k+' に ▶ が無い');return;}
 {const q2=k.getBoundingClientRect();if(Math.abs(q2.right-R.right)>8||Math.abs(q2.bottom-R.bottom)>8)o.push((im.closest('.page')||{}).id+' '+im.dataset.k+' の ▶ が右下にない');}
 const q=k.getBoundingClientRect();if(q.left<R.left-.5||q.right>R.right+.5||q.top<R.top-.5||q.bottom>R.bottom+.5)o.push((im.closest('.page')||{}).id+' '+im.dataset.k+' の ▶ が写真からはみ出し');});return {o,n};});
// 10/21 同じ欄の ▶ が同じ大きさか
 const g=await p.evaluate(()=>{const m=new Map(),o=[];document.querySelectorAll('.page .phb').forEach(k=>{const key=k.closest('section,.step,.sqg,.mtg,.grid2')||k.closest('.page');const w=Math.round(k.getBoundingClientRect().width);if(!m.has(key))m.set(key,new Set());m.get(key).add(w);});m.forEach((v,k)=>{if(v.size>1)o.push((k.closest?k.closest('.page'):k).id+' の ▶ の大きさがそろっていない：'+[...v].join('/'));});return o;});
 r.o.push(...g);
 r.o.slice(0,8).forEach(x=>console.log('NG '+x));
console.log(r.o.length?'NG ▶ の印 '+r.o.length+'か所':'▶ の印 OK（写真 '+r.n+' 枚すべて）');await b.close();process.exit(r.o.length?1:0);})();
