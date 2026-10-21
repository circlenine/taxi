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
        return m.group(0)[:-1] + f' data-v="https://youtu.be/{v}">'
    html = re.sub(r'<img [^>]*>', lambda m: add(m) if 'data-k=' in m.group(0) else m.group(0), html)
    # 使い方の欄に、1行足す
    html = html.replace('<div class="hrows">', '<div class="hrows"><span class="hp">写真</span><span>どの写真も、タップすると関連の動画（YouTube）へ移動するよ</span>', 1)
    return html

# 組み終わった合図（window.__laid = true）の直前に、写真の上へ透明なリンクを重ねる。点検・PDF作りは __laid を待つので、必ずリンクのあとになる
JS = """<script>(function(){var v=false;function link(){document.querySelectorAll('.page img[data-v]').forEach(function(im){var pg=im.closest('.page');if(!pg)return;
 if(getComputedStyle(pg).position==='static')pg.style.position='relative';var r=im.getBoundingClientRect(),P=pg.getBoundingClientRect();if(!r.width)return;
 var a=document.createElement('a');a.href=im.dataset.v;a.className='phv';a.setAttribute('aria-label','関連の動画');
 a.style.cssText='position:absolute;display:block;z-index:3;left:'+(r.left-P.left)+'px;top:'+(r.top-P.top)+'px;width:'+r.width+'px;height:'+r.height+'px';pg.appendChild(a);});}
 Object.defineProperty(window,'__laid',{configurable:true,get:function(){return v;},set:function(x){if(x&&!v)link();v=x;}});})();</script>"""
