# どのページの写真も、タップすると関連の動画（YouTube）が開くようにする（10/21 まーく様「全編の全ページ、タップしたら関連動画が見られる形に」）
# 写真（<img data-k="…">）に、その写真の元の動画を data-v で付けておき、組み終わったあとで、写真の上に同じ大きさの透明なリンクを重ねる。
# なぜ重ねるのか：写真を <a> で包むと、写真の大きさ・並びの決まり（figure>img など）が崩れる。重ねれば見た目は1つも変わらない。
import re

def apply(html, vid_of):
    # まとめの写真は、もう <a class="mtv"> で包んであるので、そのまま
    done = set(m.start(1) for m in re.finditer(r'<a class="mtv" href="[^"]*">\s*(<img )', html))
    def add(m):
        if m.start() in done: return m.group(0)
        k = re.search(r'data-k="([^"]+)"', m.group(0))
        v = vid_of(k.group(1)) if k else None
        if not v: raise SystemExit(f"写真 {k.group(1) if k else '?'} の関連動画が決まっていない（photolink の対応表に足す）")
        return m.group(0)[:-1] + f' data-v="https://youtu.be/{v}">'   # v は「動画の番号」か「動画の番号?t=秒」（10/21 写真の場面から再生）
    html = re.sub(r'<img [^>]*>', lambda m: add(m) if 'data-k=' in m.group(0) else m.group(0), html)
    # 使い方の欄に、1行足す
    html = html.replace('<div class="hrows">', '<div class="hrows"><span class="hp">写真</span><span>▶ の付いた写真をタップすると、その場面から動画（YouTube）が始まるよ</span>', 1)
    return html

# 10/21 透明のリンクに、ほかのリンク用の「うすい色の背景」がかかって、写真が全部隠れた（まーく様「画像が全て見えない」）→ 背景を必ず透明にする。photocover.js で点検
# 組み終わった合図（window.__laid = true）の直前に、写真の上へ透明なリンクを重ねる。点検・PDF作りは __laid を待つので、必ずリンクのあとになる
JS = """<style>.page a.phv,.page a.phv:hover{background:transparent!important;box-shadow:none!important;border:0!important}
/* 10/21 まーく様「1ページまとめと同じく、右下に ▶」：まとめと同じ形・大きさ。置くすみは badgepos.py が決める */
.page a.phv>.phb{position:absolute;width:6mm;height:6mm;border-radius:1mm;border:1px solid var(--line);font-size:8pt;line-height:6mm;text-align:center;padding-left:.4mm;box-sizing:border-box;font-family:sans-serif}</style><script>(function(){var v=false;function link(){document.querySelectorAll('.page img[data-v]').forEach(function(im){var pg=im.closest('.page');if(!pg)return;
 if(getComputedStyle(pg).position==='static')pg.style.position='relative';var r=im.getBoundingClientRect(),P=pg.getBoundingClientRect();if(!r.width)return;
 var a=document.createElement('a');a.href=im.dataset.v;a.className='phv';a.setAttribute('aria-label','関連の動画');
 a.style.cssText='position:absolute;display:block;z-index:3;background:transparent!important;background-color:transparent!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;opacity:1;left:'+(r.left-P.left)+'px;top:'+(r.top-P.top)+'px;width:'+r.width+'px;height:'+r.height+'px';var bb=(im.dataset.b||'br:6').split(':'),c=bb[0],sz=parseFloat(bb[1]||6),k=document.createElement('span');k.className='phb play';   /* 10/21 まーく様「▶ の色を、1ページまとめと統一」→ まとめの ▶（.play）と同じ決まりで色をつける */k.textContent='▶';k.dataset.sz=sz;k._im=im;k._g=im.closest('section,.step,.sqg,.mtg,.grid2')||pg;k.style[c[0]==='b'?'bottom':'top']='1.6mm';k.style[c[1]==='r'?'right':'left']='1.6mm';a.appendChild(k);pg.appendChild(a);});/* 10/21 まーく様「イメージ画像が複数ある場合は、大きい画像1つだけに ▶」→ 同じ手順の写真の組（.photos・合図の .sqc）では、いちばん大きい写真だけに ▶。
    同じ大きさなら、組の中でいちばん右下の写真（▶ の位置を、組の右下にそろえる）。タップで動画が開くのは、どの写真も同じ */
 var one=new Map();document.querySelectorAll('.page .phb').forEach(function(k){var im=k._im,g=im.closest('.photos,.sqc');if(!g)return;var r=im.getBoundingClientRect(),ar=Math.round(r.width*r.height/50),cur=one.get(g);
  if(!cur||ar>cur.ar||(ar===cur.ar&&(r.bottom>cur.b+1||(Math.abs(r.bottom-cur.b)<=1&&r.right>cur.r))))one.set(g,{k:k,ar:ar,b:r.bottom,r:r.right});});
 document.querySelectorAll('.page .phb').forEach(function(k){var g=k._im.closest('.photos,.sqc');if(g&&one.get(g).k!==k)k.remove();});
 /* 10/21 まーく様「▶ の大きさは、この場合 BCD の大きさに統一」→ 同じ段・同じ欄の写真は、いちばん大きい ▶ にそろえる */
 var gm=new Map();document.querySelectorAll('.page .phb').forEach(function(k){gm.set(k._g,Math.max(gm.get(k._g)||0,parseFloat(k.dataset.sz)));});
 document.querySelectorAll('.page .phb').forEach(function(k){var sz=gm.get(k._g);k.style.width=k.style.height=k.style.lineHeight=sz+'mm';k.style.fontSize=(sz*1.33)+'pt';});
 document.querySelectorAll('.page a.mtv').forEach(function(m){var im=m.querySelector('img'),p=m.querySelector('.play');if(!im||!p)return;var c=(im.dataset.b||'br').split(':')[0];p.style.top=p.style.bottom=p.style.left=p.style.right='auto';p.style[c[0]==='b'?'bottom':'top']='1.6mm';p.style[c[1]==='r'?'right':'left']='1.6mm';});}
 Object.defineProperty(window,'__laid',{configurable:true,get:function(){return v;},set:function(x){if(x&&!v)link();v=x;}});})();</script>"""
