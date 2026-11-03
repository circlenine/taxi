// 色のついた札・帯の上の字が、はっきり読めるかを確かめる
//  ・字と地の明るさの差（コントラスト比）が 3 より小さい → NG（うすい字・うすい地）
//  ・濃い字（黒・紺）を、中くらいの濃さの色の地（緑・青・赤の札）にのせている → NG（白い字にする）
// 11/3 まーく様「緑に黒文字、最悪です。可視化しやすさを大事にと伝えてる」→ ①②の番号札が、緑の地に黒い字になっていた
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true);
let bad=await p.evaluate(()=>{
 const rgb=s=>{const m=s.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null};
 const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
 const bgOf=e=>{for(let x=e;x;x=x.parentElement){if(x.classList&&x.classList.contains('page'))return {r:255,g:255,b:255};const c=rgb(getComputedStyle(x).backgroundColor);if(c&&c.a>0.5)return c;if(x.tagName==='IMG')return null;}return {r:255,g:255,b:255}};
 const out=new Set();
 document.querySelectorAll('.page *').forEach(e=>{
  if(e.closest('svg'))return;
  const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
  const st=getComputedStyle(e);if(st.visibility==='hidden'||st.display==='none'||+st.opacity<0.5)return;
  const fg=rgb(st.color),bg=bgOf(e);if(!fg||!bg)return;
  const a=L(fg),c=L(bg);const r=(Math.max(a,c)+0.05)/(Math.min(a,c)+0.05);
  const darkOnMid=a<0.1&&c<0.4&&c>0.05;   // 濃い字を、濃さが中くらいの色の地にのせる（緑に黒など）。数字の比より見えにくい
  if(r<3||darkOnMid)out.add(`${e.closest('.page').id} ${e.className||e.tagName} 比${r.toFixed(1)} 字${st.color} 地rgb(${bg.r},${bg.g},${bg.b})「${e.textContent.trim().slice(0,12)}」`);
 });return [...out];});
const circ=await p.evaluate(()=>[...document.querySelectorAll('.page .nn2,.page .nn,.page .sn,.page .mtn')].filter(e=>/[①-⑳❶-❿]/.test(e.textContent)).map(e=>e.closest('.page').id+' 「'+e.textContent+'」'));
circ.forEach(x=>bad.push('札の中に丸数字（札で囲んでいるので、ただの数字に） '+x));   // 11/3 まーく様「緑で囲んでいるのに、さらに丸で囲む必要はない」
console.log(bad.length?bad.map(x=>'NG 字が読みにくい（コントラスト不足） '+x).join('\n'):'字と地のコントラスト OK');
await b.close();process.exit(bad.length?1:0);})();
