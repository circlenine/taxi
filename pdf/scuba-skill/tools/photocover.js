// 写真が、上に重なったもの（タップ用のリンクなど）で隠れていないかの点検（10/21：透明のはずのリンクに背景色がつき、全部の写真が隠れた）
// 写真のまん中の点で、いちばん上にある要素が「写真そのもの」か「背景が透明なリンク」かを確かめる
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.emulateMedia({media:'print'});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const bad=await p.evaluate(()=>{const o=[];const clear=e=>{const c=getComputedStyle(e);return c.backgroundColor==='rgba(0, 0, 0, 0)'&&c.backgroundImage==='none'&&parseFloat(c.opacity)>0;};
 document.querySelectorAll('.page img[data-k]').forEach(im=>{const r=im.getBoundingClientRect();if(!r.width)return;
  im.scrollIntoView({block:'center'});const q=im.getBoundingClientRect();const x=q.left+q.width/2,y=q.top+q.height/2;
  const st=document.elementsFromPoint(x,y);for(const e of st){if(e===im)return;if(e.contains(im))return;if(e.tagName==='A'&&clear(e))continue;if(getComputedStyle(e).pointerEvents==='none'&&clear(e))continue;
   if(!clear(e)||e.tagName==='IMG'){o.push((im.closest('.page')||{}).id+' '+im.dataset.k+' の上に '+e.tagName+'.'+e.className);return;}}});return o;});
bad.slice(0,8).forEach(x=>console.log('NG '+x));
console.log(bad.length?'NG 写真が '+bad.length+' 枚 隠れている':'写真 OK（どの写真も、上に何もかぶっていない）');await b.close();process.exit(bad.length?1:0);})();
