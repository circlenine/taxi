// 全ページで実際に使われている色（文字・地・ふち）を集めて、決めた色だけになっているかを調べる
// 表紙のロゴ・写真・写真の名札の線は、別のきまりなので除く
const { chromium } = require('playwright');
(async()=>{const [src,mode]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const seen={};
 const hex=c=>{const m=c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);if(!m)return null;if(m[4]!==undefined&&+m[4]<0.5)return null;return '#'+[m[1],m[2],m[3]].map(v=>(+v|0).toString(16).padStart(2,'0')).join('');};
 document.querySelectorAll('.page *').forEach(e=>{if(e.closest('.logo,svg'))return;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
  const add=(c,k)=>{const h=hex(c);if(h){(seen[h]=seen[h]||new Set()).add(k+':'+(e.className&&e.className.baseVal===undefined?e.className:e.tagName));}};
  if(e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))add(cs.color,'字');
  add(cs.backgroundColor,'地');
  ['Top','Left'].forEach(s=>{if(parseFloat(cs['border'+s+'Width'])>0&&cs['border'+s+'Style']!=='none')add(cs['border'+s+'Color'],'ふち');});});
 return Object.fromEntries(Object.entries(seen).map(([k,v])=>[k,[...v].slice(0,4)]));});
// 決めた色（見た目のきまり。image2.py の先頭のコメントと同じ）
const OK={'#1f2a37':'字','#6b7785':'うすい字','#d9e1ea':'ふち','#ffffff':'白','#103f66':'紺','#1c6ea4':'青','#eef4f9':'うすい青','#d4ecfa':'パステル青','#b8def5':'パステル青2','#ffe3ea':'パステルピンク','#ffc4d1':'パステルピンク2','#b4234a':'大事の字','#f4fafe':'ごく薄い水色','#f3f5f7':'薄い灰色（情報の帯）','#1f2a37':'字','#d7eef9':'水色（札・帯）','#a9d8ef':'水色の線','#cfe5f2':'水色のふち','#f1f8fc':'ごく薄い水色（補足の帯）','#16466b':'紺（文字・札）','#c8372d':'赤（写真の書きこみ）','#f93612':'赤（写真の囲み・✕。2-1の丸と同じ）',
 '#4f3a00':'黄の字','#fffaeb':'黄の地','#ecd48a':'黄のふち','#9a6b00':'黄の見出し','#7d1236':'ピンクの字','#fff5f8':'ピンクの地','#efb3c4':'ピンクのふち','#b0154a':'ピンクの見出し',
 '#5f6b73':'銀色金具','#ad1457':'レギュ','#3a2e00':'オクトの字','#f2c200':'オクト','#8b5a2b':'カチカチホース','#2e7d32':'タンク','#1565c0':'BCD','#4a1424':'重りの字','#e8a1b3':'重り','#6a3fb5':'残圧計','#ef7fa0':'重り'};
// 角の丸み：0（上の帯）・1mm・2mm・円 だけか
const rad=await p.evaluate(()=>{const MM=96/25.4,out={};document.querySelectorAll('.page *').forEach(e=>{if(e.closest('svg'))return;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(!r.width)return;
 const v=cs.borderTopLeftRadius;if(v==='0px')return;const mm=parseFloat(v)/MM;if(v.includes('%')||parseFloat(v)>=Math.min(r.width,r.height)/2-0.5){out[(e.className&&e.className.baseVal===undefined?e.className:e.tagName)+' 丸']=1;return;}
 if(Math.abs(mm-1)>.05&&Math.abs(mm-2)>.05&&parseFloat(v)<Math.min(r.width,r.height)/2-0.5){const k=(e.className&&e.className.baseVal===undefined?e.className:e.tagName)+' '+mm.toFixed(2)+'mm';out[k]=1;}});return Object.keys(out);});
console.log(rad.length?'NG 決めていない角の丸み … '+rad.join(' / '):'角の丸み OK（1mm・2mm だけ。丸い形なし）');
const bad=Object.entries(r).filter(([k])=>!OK[k]);
console.log(bad.length?bad.map(([k,v])=>'NG 決めていない色 '+k+' … '+v.join(' / ')).join('\n'):'色 OK（'+Object.keys(r).length+'色、すべて決めた色）');await b.close();})();
