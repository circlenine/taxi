# ルビ（ふりがな）を付ける（10/20 まーく様「漢字が正しいかしっかり確かめ、日常会話であまり使わない漢字にはルビを」）
#   ・「呼く（はく）」：息を外へ出すこと（呼吸の「呼」）。「吐く」は もどす意味にも取れて誤解を生むので、使わない
#   ・ほかに、ふだんの会話であまり見ない漢字・読みまちがえやすい漢字
#   ページに出る字だけに付ける（図の中・タグの中・題の名前などには付けない）
import re
# 10/20 まーく様「このレベルは普通に読めるのでルビは不要。呼くにだけ、呼（は）くと」→ ルビは「呼（は）く」だけ
WORDS = {}
_W = sorted(WORDS, key=len, reverse=True)
_RX = re.compile("呼([くいきけかこっ])")
def _rb(m):
    # 10/21 まーく様「これ最悪。呼（は）く、と表現する方がマシ」
    #   → 字の上にのせるルビはやめて、かっこで「呼（は）く」と同じ行に書く。行の高さも字の位置も、ほかの行と同じになる
    #   「呼（は）」と次の字（く・い・き…）の間で行が分かれないよう、ひとまとめにする
    if m.group(0).startswith("呼"): return f'<span class="nw">呼（は）{m.group(1)}</span>'
    w = m.group(0)

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
    return html

CSS = ""   # 10/21 字の上にのせるルビをやめたので、ルビ用の見た目の決まりは要らない
