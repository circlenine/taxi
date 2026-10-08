// 改行の検査（10/7 ご指摘「中途半端なところで改行しない」）
// 文のかたまりごとに、1行ずつの字を取り出して調べる：
//  ・最後の行が3文字以下（「う！」だけが次の行に落ちる、など）
//  ・行の頭が「、。！？）」」など、行の頭に来てはいけない字
const { chromium } = require('playwright');
(async()=>{const [src]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage();
await p.emulateMedia({media:'print'});await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__laid===true);
const r=await p.evaluate(()=>{const out=[];
 const blocks=[...document.querySelectorAll('.page p,.page h2,.page h3>span:last-child,.nx,.ns,.sd2,.ds,.tt,.q,.cap3,.say,.of,.tocn')];
 blocks.forEach(bl=>{if(bl.closest('svg'))return;const lines=[];let cur=null,top=null;
  const w=document.createTreeWalker(bl,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){if(n.parentElement.closest('.half'))continue;if(n.parentElement.closest('.t,.nk,.sn,.fs,.nn,.nn2,.sp2')&&n.parentElement!==bl){/* 札はひとかたまり */const r=n.parentElement.getBoundingClientRect();if(top===null||r.top>top+r.height*.5){cur=[];lines.push(cur);top=r.top;}cur.push(...n.textContent.trim());continue;}
   for(let i=0;i<n.length;i++){const ch=n.textContent[i];if(!ch.trim())continue;const rg=document.createRange();rg.setStart(n,i);rg.setEnd(n,i+1);const q=rg.getClientRects()[0];if(!q)continue;
    if(top===null||q.top>top+q.height*.5){cur=[];lines.push(cur);top=q.top;}cur.push(ch);}}
  if(lines.length<2)return;const txt=lines.map(l=>l.join(''));const pg=bl.closest('.page').id.slice(1);
  const last=txt[txt.length-1];if(last.length<=3)out.push('p'+pg+' 最後の行が短すぎる「'+txt.slice(-2).join('／')+'」');
  txt.slice(0,-1).forEach(l=>{if(/→$/.test(l))out.push('p'+pg+' 行の終わりに「→」（矢印は次の行の頭に）「'+l.slice(-8)+'」');});
  txt.slice(1).forEach(l=>{if(/^[、。！？）」』，．ー]/.test(l))out.push('p'+pg+' 行の頭に記号「'+l.slice(0,8)+'」');});});
 return out;});
console.log(r.length?r.join('\n'):'改行 OK（最後の行が短すぎる・行の頭の記号、どちらもなし）');await b.close();})();
