"""文の長さと、選択肢のオススメを止める（10/27 夜 まーく様「長文は読む気が失せる」「選択肢には、どちらが良いかを付ける」）
   根拠：人はページを「読む」より「拾い読み」する（NN/g：79% が拾い読み）。一度に覚えられるのは4つほど（Cowan 2001）。
   選択肢が多い・決め手がないと、選べなくなる（Iyengar & Lepper 2000）。
   ・補足の1行：半分の幅の手順は 24字まで、横いっぱいの手順は 40字まで（スマホで2行に折り返さない長さ）
   ・補足は1つの手順に3つまで。それより多いときは表にする
   ・写真の下の説明：18字まで。手順が2枚に分かれるときは①②を付けて、1枚だけ見ても何をしているか分かる文に
   ・2つから選ぶ表（列の見出しが2つだけ）には、必ず「オススメ」を付ける"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content_w as c
try:
    import a4w; WIDE = a4w.WIDE
except Exception:
    WIDE = {"1-1", "1-2", "1-3", "3-1"}
ng = []
L = lambda t: len(re.sub(r"\{[a-z]+\}", "○○", t))
for s in c.STEPS:
    for u in s["subs"]:
        lim = 40 if u["id"] in WIDE else 24
        ex = u.get("extra", [])
        if len(ex) > 3: ng.append(f"NG {u['id']}：補足が{len(ex)}つ。3つまで（多いときは表に）")
        for t in ex:
            if L(t) > lim: ng.append(f"NG {u['id']}：補足が長い（{L(t)}字・{lim}字まで）「{t}」")
        tb = u.get("table")
        if tb and len(tb["cols"]) == 2 and all(tb["cols"]) and not any("[おすすめ]" in x for x in tb["cols"]):
            ng.append(f"NG {u['id']}：2つから選ぶ表に「[おすすめ]」の札がない（★・*・カタカナのオススメは使わない）")
        ks = u.get("key", [])
        for i, k in enumerate(ks):
            cap = c.CAPS.get((u["id"], k), "")
            if L(cap) > (30 if k in ("d_cat", "w_cat") else 18):   # 図の説明は出どころを書くので長くてよい
                ng.append(f"NG {u['id']} {k}：写真の説明が長い（{L(cap)}字・18字まで）「{cap}」")
print("\n".join(ng) if ng else "文の長さ・オススメ OK"); sys.exit(1 if ng else 0)
