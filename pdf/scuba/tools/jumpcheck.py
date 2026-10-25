# 「くわしくは 1-4（4ページ）」の検査（10/13 ご指示：タップでそのページへ飛ぶ・何ページ目かを必ず書く）
# ・書いてあるページ番号と、飛ぶ先のページが同じか
# ・飛ぶ先のページに、その手順（1-4 など）が本当にあるか
# ページを足したり減らしたりすると番号がずれるので、毎回調べる
import re, sys
h = open(sys.argv[1], encoding="utf-8").read()
h = re.sub(r'<rt>.*?</rt>|<span class="rt">[^<]*</span>', '', h)   # 10/20 ルビ（ふりがな）は、点検では数えない
pages = dict(re.findall(r'<div class="page" id="p(\d+)">(.*?)(?=<div class="page" id="p\d+">|</body>)', h, flags=re.S))
bad, n = [], 0
for href, body in re.findall(r'<a class="jump" href="#p([^"]*)">(.*?)</a>', h, flags=re.S):
    n += 1
    txt = re.sub(r"<[^>]+>", "", body)
    m = re.search(r"くわしくは(.*?)（(\d+)ページ）", txt)
    if not m: bad.append(f"ページ番号が書いていない：{txt}"); continue
    sid, pg = m.group(1), m.group(2)
    if pg != href: bad.append(f"{txt}：書いてあるのは{pg}ページ、飛ぶ先は{href}ページ"); continue
    tgt = pages.get(href, "")
    ok = ("器材の健康診断" in tgt) if sid == "次のページ" else (f'<span class="sn">{sid}</span>' in tgt or f'<span class="no">{sid}</span>' in tgt)   # 合図のページは、ページの札（no）で見る
    if not ok: bad.append(f"{txt}：{href}ページに {sid} がない")
print("\n".join("NG 飛ぶ行 " + b for b in bad) if bad else f"飛ぶ行 OK（{n}個、ページ番号と飛ぶ先が合っている）")
sys.exit(1 if bad else 0)
