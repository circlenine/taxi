"""11/4 まーく様「クイズ、ページ数の順番にしっかり直して」
   クイズが、手順の番号（＝ページ）の順に並んでいるかを調べる。並びは 左→右、上→下 の順に読む"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content_w import QUIZ
ng = []
for name, qs in QUIZ:
    ks = [tuple(int(x) for x in q[2].split("-")) for q in qs]
    for a, b, q in zip(ks, ks[1:], qs[1:]):
        if b < a: ng.append(f"NG {name}：「{q[0]}」（{q[2]}）が、前の問い（{'-'.join(map(str, a))}）より前のページ")
print("\n".join(ng) if ng else "クイズの順番 OK（ページの順）"); sys.exit(1 if ng else 0)
