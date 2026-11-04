// 11/4 まーく様「大事や補足の上の位置をきちんと合わせて」
// 横に並ぶ2つの手順で、大事・補足（.notes）の上の位置がそろっているかを測る（1px まで）
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.emulateMedia({media:'print'});
await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const o=await p.evaluate(()=>{const o=[];document.querySelectorAll('.grid2').forEach(g=>{const st=[...g.querySelectorAll(':scope>.step')];const rows=[];
 st.forEach(x=>{const t=x.getBoundingClientRect().top;let r=rows.find(r=>Math.abs(r.t-t)<2);if(!r){r={t,xs:[]};rows.push(r);}r.xs.push(x);});
 rows.forEach(r=>{if(r.xs.length<2)return;const pg=(g.closest('.page')||{}).id,id=r.xs.map(x=>(x.querySelector('.sn')||{}).textContent).join('・');
  for(const [sel,name] of [['.sh3>.sn','番号の札'],['.photos','写真'],['.notes','大事・補足']]){const es=r.xs.map(x=>x.querySelector(':scope>'+sel));   // 11/5 まーく様「3-2 高さずれてる。初歩的なミス」→ 番号の札の高さも見る。全部の冊で動かす
if(es.some(e=>!e))continue;
   const ts=es.map(e=>e.getBoundingClientRect().top);if(Math.max(...ts)-Math.min(...ts)>1)o.push(pg+' '+id+'：'+name+'の上の位置がずれている（'+(Math.max(...ts)-Math.min(...ts)).toFixed(1)+'px）');}});});return o;});
o.forEach(x=>console.log('NG '+x));console.log(o.length?'NG 横並びのずれ '+o.length+'か所':'横に並ぶ手順の、写真・大事・補足の上の位置 OK');await b.close();process.exit(o.length?1:0);})();
