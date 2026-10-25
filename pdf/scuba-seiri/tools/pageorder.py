# 「くわしくは〇ページ」が、表や一覧の中で、ページの順に並んでいるかの点検（10/21 まーく様「なんでページ順じゃないのか。振り返りやすいように」）
# 1つの表（.ixtb）・1つのまとめの札の並び（.mtg）の中で、飛ぶ先のページが前に戻っていたら止める
import re, sys
h = open(sys.argv[1], encoding="utf-8").read()
bad = 0
for cls in ("ixtb", "mtg"):
    for m in re.finditer(r'<div class="' + cls + r'[^"]*">', h):   # 「ixtb2c」など、名前の続く形も見る
        # その箱の終わりまで（入れ子の div を数える）
        i, depth = m.end(), 1
        while depth:
            o = h.find("<div", i); c = h.find("</div>", i)
            if o != -1 and o < c: depth += 1; i = o + 4
            else: depth -= 1; i = c + 6
        ps = [int(x) for x in re.findall(r'（(\d+)ページ）', h[m.end():i])]
        if ps != sorted(ps):
            bad += 1; print(f"NG {cls} のページの並びが前後している：{ps}")
# 10/21 まーく様「番号は正しい順番に」：もくじの「その〇」と、手順の番号（〇-〇）が、1から飛ばずに並んでいるか
sono = [int(x) for x in re.findall(r'<span class="tl">その(\d+)</span>', h)]
if sono and sono != list(range(1, len(sono) + 1)):
    bad += 1; print(f"NG もくじの番号が飛んでいる：その{sono}")
sn = re.findall(r'<span class="sn">(\d+)-(\d+)</span>', h)
seen = {}
for a_, b_ in sn:
    a_, b_ = int(a_), int(b_)
    if b_ != seen.get(a_, 0) + 1: bad += 1; print(f"NG 手順の番号が飛んでいる：{a_}-{b_}（前は {a_}-{seen.get(a_, 0)}）")
    seen[a_] = b_
if seen and sorted(seen) != list(range(1, max(seen) + 1)):
    bad += 1; print(f"NG 手順の大きい番号が飛んでいる：{sorted(seen)}")
print("NG くわしくはのページ・番号の並びがおかしい" if bad else "くわしくはの並び・番号 OK（どの表もページの順・番号は1から順に）")
sys.exit(1 if bad else 0)
