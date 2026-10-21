# 「くわしくは〇ページ」が、表や一覧の中で、ページの順に並んでいるかの点検（10/21 まーく様「なんでページ順じゃないのか。振り返りやすいように」）
# 1つの表（.ixtb）・1つのまとめの札の並び（.mtg）の中で、飛ぶ先のページが前に戻っていたら止める
import re, sys
h = open(sys.argv[1], encoding="utf-8").read()
bad = 0
for cls in ("ixtb", "mtg"):
    for m in re.finditer(r'<div class="' + cls + r'">', h):
        # その箱の終わりまで（入れ子の div を数える）
        i, depth = m.end(), 1
        while depth:
            o = h.find("<div", i); c = h.find("</div>", i)
            if o != -1 and o < c: depth += 1; i = o + 4
            else: depth -= 1; i = c + 6
        ps = [int(x) for x in re.findall(r'（(\d+)ページ）', h[m.end():i])]
        if ps != sorted(ps):
            bad += 1; print(f"NG {cls} のページの並びが前後している：{ps}")
print("NG くわしくはのページが、順に並んでいない" if bad else "くわしくはの並び OK（どの表も、ページの順）")
sys.exit(1 if bad else 0)
