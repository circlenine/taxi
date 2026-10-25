# 赤い丸の付け忘れの点検（10/23 まーく様「カチカチホースの接続部分に赤丸がされてません」）
# 同じ動画の同じ秒から切り出した写真どうしで、片方にだけ赤い丸があり、もう片方に無いものを探す。
# （2-4 には丸があったのに、同じ場面を使った集約版の写真には付けていなかった）
# わざと付けないものは、ALLOW に、その組と理由を書いて足す。
import re, ast, sys
d = sys.argv[1] if len(sys.argv) > 1 else "."
a4 = open(f"{d}/a4.py").read()
T = ast.literal_eval(re.search(r'SET_T = (\{.*?\})\n', a4).group(1))
fo = open(f"{d}/focus.py").read()
ns = {"RED": (249, 54, 18)}
for name in ("MARK", "MARKE", "MARKQ", "MARKR"):
    m = re.search(r'^' + name + r' = \{', fo, re.M)
    i, depth = m.end() - 1, 0
    for j in range(i, len(fo)):
        depth += {"{": 1, "}": -1}.get(fo[j], 0)
        if depth == 0: break
    exec(f"{name} = " + fo[i:j + 1], ns)
marked = set().union(*(ns[n].keys() for n in ("MARK", "MARKE", "MARKQ", "MARKR")))
ALLOW = set()
by = {}
for k, t in T.items(): by.setdefault(t, []).append(k)
ng = [f"NG 同じ場面（{t}秒）なのに赤い丸が片方だけ：丸あり {sorted(set(ks) & marked)}／丸なし {sorted(set(ks) - marked)}"
      for t, ks in sorted(by.items()) if set(ks) & marked and set(ks) - marked and frozenset(ks) not in ALLOW]
print("\n".join(ng) if ng else "赤い丸の付け忘れ OK")
sys.exit(1 if ng else 0)
