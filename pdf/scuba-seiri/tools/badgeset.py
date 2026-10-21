# focus*.py が決めた ▶ の置き場所（img/s/badge.json）を、HTML の写真に書きこむ（data-b="br" など）
import json, re, sys
html, js = sys.argv[1], sys.argv[2]
b = json.load(open(js)); h = open(html, encoding="utf-8").read()
def f(m):
    t = m.group(0)
    s = re.search(r'data-slot="([^"]+)"', t)
    if not s or s.group(1) not in b: return t
    t = re.sub(r' data-b="[^"]*"', '', t)
    return t[:-1] + f' data-b="{b[s.group(1)]}">'
h = re.sub(r'<img [^>]*>', f, h)
open(html, "w", encoding="utf-8").write(h)
print("▶ の置き場所", {c: sum(1 for v in b.values() if v.startswith(c)) for c in ("br", "bl", "tr", "tl")})
