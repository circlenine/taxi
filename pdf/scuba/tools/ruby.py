# ルビ（ふりがな）を付ける（10/20 まーく様「漢字が正しいかしっかり確かめ、日常会話であまり使わない漢字にはルビを」）
#   ・「呼く（はく）」：息を外へ出すこと（呼吸の「呼」）。「吐く」は もどす意味にも取れて誤解を生むので、使わない
#   ・ほかに、ふだんの会話であまり見ない漢字・読みまちがえやすい漢字
#   ページに出る字だけに付ける（図の中・タグの中・題の名前などには付けない）
import re
WORDS = {"塊": "かたまり", "脱着": "だっちゃく", "装着": "そうちゃく", "鼻炎": "びえん", "品薄": "しなうす", "峠": "とうげ",
         "紐": "ひも", "隙間": "すきま", "緩み": "ゆるみ", "彦坂": "ひこさか", "留め": "と"}
_W = sorted(WORDS, key=len, reverse=True)
_RX = re.compile("呼(?=[くいきけかこっ])|" + "|".join(map(re.escape, _W)))
def _rb(m):
    w = m.group(0)
    if w == "呼": return "<ruby>呼<rt>は</rt></ruby>"
    if w == "留め": return "<ruby>留<rt>と</rt></ruby>め"
    return f"<ruby>{w}<rt>{WORDS[w]}</rt></ruby>"
SKIP = ("svg", "script", "style", "title", "ruby", "head")
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
    return "".join(out)

CSS = """
/* ルビ：字の上に小さく。行の間がひろがりすぎないよう、ルビの行の高さは詰める */
.page ruby{ruby-position:over}
.page rt{font-size:.5em;line-height:1;font-weight:700;letter-spacing:0}
"""
