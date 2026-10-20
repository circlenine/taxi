# ルビ（ふりがな）を付ける（10/20 まーく様「漢字が正しいかしっかり確かめ、日常会話であまり使わない漢字にはルビを」）
#   ・「呼く（はく）」：息を外へ出すこと（呼吸の「呼」）。「吐く」は もどす意味にも取れて誤解を生むので、使わない
#   ・ほかに、ふだんの会話であまり見ない漢字・読みまちがえやすい漢字
#   ページに出る字だけに付ける（図の中・タグの中・題の名前などには付けない）
import re
# 10/20 まーく様「このレベルは普通に読めるのでルビは不要。呼くにだけ、呼（は）くと」→ ルビは「呼（は）く」だけ
WORDS = {}
_W = sorted(WORDS, key=len, reverse=True)
_RX = re.compile("呼(?=[くいきけかこっ])")
def _rb(m):
    w = m.group(0)
    # <ruby> は、ルビのぶん行の高さがふえて、その行だけ上下がずれる（まーく様「上位置が、他の文とズレないように」）。
    #   → 字の上に、行の高さを使わずに重ねる（.rb の中の .rt を、字の真上に置く）
    if w == "呼": return '<span class="rb">呼<span class="rt">は</span></span>'

    if w == "留め": return "<ruby>留<rt>と</rt></ruby>め"
    return f"<ruby>{w}<rt>{WORDS[w]}</rt></ruby>"
SKIP = ("svg", "script", "style", "title", "head")
def apply(html):
    out, depth = [], {k: 0 for k in SKIP}
    for part in re.split(r"(<[^>]+>)", html):
        if part.startswith("<"):
            m = re.match(r"<(/?)([a-zA-Z0-9]+)", part)
            if m and m.group(2).lower() in depth and not part.endswith("/>"):
                depth[m.group(2).lower()] += -1 if m.group(1) else 1
            out.append(part)
        elif any(depth.values()):
            out.append(part)
        else:
            out.append(_RX.sub(_rb, part))
    html = "".join(out)
    # もくじの行（a.tc）だけはルビを外す（もくじは字が詰まっていて、ルビの幅で字の間が広がってしまう。ページの題には付いている）
    return re.sub(r'(<a class="tc".*?</a>)', lambda m: re.sub(r'<span class="rb">(.*?)<span class="rt">.*?</span></span>', r'\1', m.group(1)), html, flags=re.S)

CSS = """
/* ルビ：字の上に小さく。行の間がひろがりすぎないよう、ルビの行の高さは詰める */
.page .rb{position:relative}
.page .rb>.rt{position:absolute;left:50%;bottom:100%;transform:translate(-50%,.18em);font-size:.48em;line-height:1;font-weight:700;letter-spacing:0;white-space:nowrap;pointer-events:none}
"""
