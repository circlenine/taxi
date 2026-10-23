# 10/23 まーく様「そこで／ストップ！は中途半端」「改行が多すぎる・中途半端な改行」
#   → 文が2行以上になるとき、行の終わりが「、」「。」などの区切りでなければ、その行の中のいちばん後ろの区切りの後ろで改行し直す。
#     区切りが行の前半にしかないとき・ふりがなの（）は使わない。ただし行の数が増えるときは、元に戻す（行を増やさない）。区切りが行の中に無いときは、何もしない。
#     3冊とも、写真の大きさを決めた後・memo を置く前に動かす（行の数は変わらないので、高さも変わらない）
JS = r"""<script>
function phraseBreak(){const SEL='.nx,.ns,.mts li,.pbc p,.qz .a,.mcq,.sd2,.cap3,.sh3>span:last-child,.mth span:last-child,.pbh,.act';
 const P='、。！？）」';
 const lines=e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n,cs=[];while(n=w.nextNode()){for(let i=0;i<n.length;i++){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const b=r.getClientRects()[0];if(b&&b.width>0)cs.push({n,i,c:n.textContent[i],t:b.top});}}
  const ls=[];let cur=null;cs.forEach(x=>{if(cur===null||Math.abs(x.t-cur)>4){ls.push([]);cur=x.t;}ls[ls.length-1].push(x);});return ls;};
 document.querySelectorAll(SEL).forEach(e=>{if(e.closest('.howto,.qz .q'))return;
  for(let k=0;k<6;k++){const ls=lines(e);if(ls.length<2)return;let done=true;
   for(let li=0;li<ls.length-1;li++){const L=ls[li];const last=L[L.length-1];if(P.includes(last.c))continue;
    if(last.n.parentElement&&last.n.parentElement.closest('.t'))continue;
    let j=-1;for(let q=L.length-2;q>=Math.floor(L.length*0.5);q--){if(P.includes(L[q].c)&&!L[q].n.parentElement.closest('.t,small,rt,.rt,ruby,.nw')){j=q;break;}}
    if(j<0)continue;
    const x=L[j];const rest=x.n.splitText(x.i+1);const br=document.createElement('br');br.className='pbk';x.n.parentNode.insertBefore(br,rest);
    if(lines(e).length>ls.length){br.remove();x.n.textContent+=rest.textContent;rest.remove();continue;}
    done=false;break;}
   if(done)return;}});}
// 10/23 まーく様「あいちゃん褒められスキル／前半・後半／ふり返り・NEW の左位置を統一して」→ もくじで、同じ札どうしの左の位置をそろえる
function alignTags(){document.querySelectorAll('.toc').forEach(t=>{const g={};t.querySelectorAll('.tt .half,.tt .tbd').forEach(e=>{const k=e.classList.contains('tbd')?'tbd':e.className;(g[k]=g[k]||[]).push(e);});/* 10/23 まーく様「あいちゃん褒められスキルと上級スキルの左位置もそろえて」→ スキル編の札（.tbd）は色ちがいでも1つの組 */
 Object.values(g).forEach(es=>{if(es.length<2)return;es.forEach(e=>{e.style.marginLeft='';});const L=Math.max(...es.map(e=>e.getBoundingClientRect().left));
  es.forEach(e=>{const d=L-e.getBoundingClientRect().left;if(d>0.5){const ml=parseFloat(getComputedStyle(e).marginLeft)||0;e.style.setProperty('margin-left',(ml+d)+'px','important');}});});});}
// 10/23 まーく様「しおりの札の文字が、やや左寄りに見える」→ 矢印の四角の部分だけで真ん中にすると、矢印の先のぶん左に寄って見える。
//   字の真ん中を、矢印の先の半分ちょっと（0.6mm）右へずらす（どの札も同じ量）
function centerTags(){const MM=96/25.4,cv=document.createElement('canvas').getContext('2d');document.querySelectorAll('.page .tl,.page .no,.page .sn,.page .qh').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).clipPath==='none')return;
 const rg=document.createRange();rg.selectNodeContents(e);const t=rg.getBoundingClientRect();const cs0=getComputedStyle(e);cv.font=cs0.fontWeight+' '+cs0.fontSize+' '+cs0.fontFamily;const m=cv.measureText(e.textContent.trim());
 /* 字の形（インク）の真ん中で合わせる。「1」のように細い字は、字の箱の中で片寄っているため */
 const target=r.left+(r.width-1.8*MM)/2+0.6*MM,cur=t.left+(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2,d=target-cur;
 if(Math.abs(d)<0.2)return;const cs=getComputedStyle(e),pl=parseFloat(cs.paddingLeft),pr=parseFloat(cs.paddingRight);
 e.style.setProperty('padding-left',Math.max(0,pl+d)+'px','important');e.style.setProperty('padding-right',Math.max(0,pr-d)+'px','important');});}
// 10/23 まーく様「OKの文字が小さく見える。見出し系で英数字が使われているなら、全角に統一して同じくらいの大きさに」
//   → 見出し（ページの題・手順の題・合図の名前・まとめの名前・もくじ・クイズの札）の中の英数字だけ、全角にする（本文はそのまま）
function wideHeads(){const SEL='.ph h2,.sh3>span:not(.sn),.sqn,.mth>span:last-child,.mcn,.tc .tt,.pbh,.qh,.umh,.toch,.hh,.skh';
 document.querySelectorAll(SEL).forEach(h=>{if(h.closest('.howto .hrows'))return;const w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let n;const ns=[];while(n=w.nextNode())ns.push(n);
  ns.forEach(n=>{if(n.parentElement.closest('.sn,.no,.tl,.jump,.half,.tbd,small,rt,.rt,.tp'))return;
   if(!/[A-Za-z0-9]/.test(n.textContent))return;
   /* 全角の英字は1字ずつの間が広く見えるので、字の間だけ詰める（palt）。大きさはかなと同じになる */
   const f=document.createDocumentFragment();n.textContent.split(/([A-Za-z0-9]+)/).forEach((x,i)=>{if(!x)return;if(i%2){const sp=document.createElement('span');sp.className='fw';sp.style.setProperty('letter-spacing','-.28em','important');sp.style.setProperty('font-size','1.1em','important');sp.style.setProperty('line-height','1','important');sp.style.setProperty('margin-right','.18em','important');sp.textContent=x.replace(/./g,c=>String.fromCharCode(c.charCodeAt(0)+0xFEE0));f.appendChild(sp);}else f.appendChild(document.createTextNode(x));});
   n.parentNode.replaceChild(f,n);});});
 if(!document.getElementById('fwcss')){const st=document.createElement('style');st.id='fwcss';st.textContent='.page .fw{font-feature-settings:normal!important}';document.head.appendChild(st);}}
</script>"""
