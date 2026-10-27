"""観点の表（KANTEN.md）の空らんを止める（10/27 夜 まーく様「様々な角度からの推察」）
   6つの方向（選ぶ・しくみ・体に合わせる・女性目線・動作・手入れ・安全・お店・お金・プロの目）が全部あり、
   どの行にも「どこで答えたか」か「入れない理由」が書いてあるかを見る"""
import sys, os
p = os.path.join("/home/user/taxi/pdf/scuba-suit/KANTEN.md")
rows = [l.split("|")[1:-1] for l in open(p, encoding="utf-8") if l.startswith("|") and not l.startswith("|---") and "方向" not in l]
ng = [f"NG 観点の表：「{r[1].strip()}」の答えが空らん" for r in rows if len(r) < 3 or not r[2].strip()]
need = ["選ぶ", "しくみ", "体に合わせる", "女性目線", "動作", "手入れ", "安全", "お店", "お金", "プロの目"]
have = {r[0].strip() for r in rows}
ng += [f"NG 観点の表：「{n}」の方向が1行もない" for n in need if n not in have]
print("\n".join(ng) if ng else f"観点の表 OK（{len(rows)}行・{len(need)}方向）"); sys.exit(1 if ng else 0)
