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
</script>"""
