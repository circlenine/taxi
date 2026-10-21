// 「呼（は）く」の点検（10/21 まーく様「字の上の小さなルビは最悪。呼（は）く、と書く方がマシ」）
//   ・字の上にのせるルビ（.rb・<ruby>）が、1つも残っていないこと
//   ・「呼吸」以外の「呼」には、すぐ後ろに「（は）」があること
//   ・「呼（は）く」が、行の途中で2行に分かれていないこと
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.emulateMedia({media:'print'});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const r=await p.evaluate(()=>{const o=[];
 const left=document.querySelectorAll('.page .rb,.page ruby,.page rt').length;if(left)o.push('字の上のルビが '+left+' か所 残っている');
 document.querySelectorAll('.page').forEach(pg=>{const t=pg.innerText.replace(/\s+/g,'');const m=t.match(/呼(?!吸|（は）|び|ぶ|べ|ば)./g);if(m)o.push(pg.id+' かっこの無い「呼」：'+m.join(' '));});
 document.querySelectorAll('.page .nw').forEach(e=>{if(!e.textContent.startsWith('呼（は）'))return;const rg=document.createRange();rg.selectNodeContents(e);const ys=new Set([...rg.getClientRects()].filter(x=>x.width>0).map(x=>Math.round(x.top)));if(ys.size>1)o.push((e.closest('.page')||{}).id+' 「'+e.textContent+'」が2行に分かれている');});
 return {o,n:[...document.querySelectorAll('.page .nw')].filter(e=>e.textContent.startsWith('呼（は）')).length};});
if(r.o.length){r.o.forEach(x=>console.log('NG '+x));await b.close();process.exit(1);}
console.log('呼（は）く OK（'+r.n+'か所・かっこで同じ行に書いてある）');await b.close();})();
