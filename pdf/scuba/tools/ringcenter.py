# 丸（囲み）が、写真の上下・左右のまん中にあるかを確かめる
# 11/3 まーく様「なんで丸の高さ位置を合わせていないのですか」→ 3-2 左の丸が、字幕を避けて切ったせいで下（67%）に寄っていた。
#   どの写真も、丸（2つあれば2つのまん中）が、上下・左右とも まん中から6%以内にあること。
#   どうしても寄せられない写真は、focus_w.CENTER_OFF に理由を書く（書かないと止まる）
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import focus_w as F
b = json.load(open(os.path.join(sys.argv[1], "boxes.json")))
OFF = getattr(F, "CENTER_OFF", {})
ng = []
for slot, (k, x0, y0, x1, y1, ms) in b.items():
    if k in F.NODRAW or k in OFF or k in F.NOCROP: continue
    pts = [(m[0], m[1]) for m in ms] + [(q[0], q[1]) for q in F.MARKQ.get(k, [])]
    if not pts: continue
    gx = sum(p[0] for p in pts) / len(pts); gy = sum(p[1] for p in pts) / len(pts)
    v, h = (gy - y0) / (y1 - y0) * 100, (gx - x0) / (x1 - x0) * 100
    if abs(v - 50) > 6 or abs(h - 50) > 6:
        ng.append(f"NG {slot}：丸がまん中にない（上から{v:.0f}%・左から{h:.0f}%）")
print("\n".join(ng) if ng else "丸の位置 OK（どの写真も、まん中から6%以内）")
sys.exit(1 if ng else 0)
