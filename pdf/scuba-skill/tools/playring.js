// 11/4 まーく様「前と丸が被ってます。全てのページを見直して」
// 写真の右下の ▶ が、写真に描いた丸・札にかかっていないかを測るための下ごしらえ。
// ページの上で ▶ が写真のどこにあるか（写真の幅・高さに対する割合）を書き出し、playring.py が丸の形と照らし合わせる。
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const r=await p.evaluate(()=>{const o=[];const mm=96/25.4;
 document.querySelectorAll('.page img[data-k]').forEach(im=>{const R=im.getBoundingClientRect();if(!R.width)return;
  const src=(im.getAttribute('src')||'').split('/').pop();
  const ks=[...document.querySelectorAll('.phb,.play')].filter(k=>{const q=k.getBoundingClientRect();return q.width&&q.left>=R.left-1&&q.right<=R.right+1&&q.top>=R.top-1&&q.bottom<=R.bottom+1;});
  const it={page:(im.closest('.page')||{}).id,src,k:im.dataset.k,wmm:R.width/mm,hmm:R.height/mm,play:ks.map(k=>{const q=k.getBoundingClientRect();return [(q.left-R.left)/R.width,(q.top-R.top)/R.height,(q.right-R.left)/R.width,(q.bottom-R.top)/R.height];})};o.push(it);});return o;});
require('fs').writeFileSync(process.argv[3],JSON.stringify(r));console.log('写真 '+r.length+' 枚');await b.close();})();
