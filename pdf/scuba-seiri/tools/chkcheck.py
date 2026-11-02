# クイズの□の「押すところ（✓が出る場所）」が、印刷した□の線とぴったり重なっているかを確かめる
# 11/2 まーく様「チェックボックスのチェックずれてるじゃないですか」
#   → □が上寄せなのに、まん中にあると決めつけて場所を測り、✓が8pt下に出ていた。
#   印刷したPDFを絵にして、□の上の線・下の線・左の線が、測った場所から1pt以内にあるかを見る。
import json, subprocess, sys, tempfile, os
from PIL import Image
pdf, pos = sys.argv[1:3]
P = json.load(open(pos)); R = 288; s = R / 72; bad = []
with tempfile.TemporaryDirectory() as d:
    cache = {}
    for i, p in enumerate(P):
        n = p["page"] + 1
        if n not in cache:
            subprocess.run(["pdftoppm", "-f", str(n), "-l", str(n), "-r", str(R), "-png", "-singlefile", pdf, f"{d}/p{n}"], check=True)
            cache[n] = Image.open(f"{d}/p{n}.png").convert("RGB")
        im = cache[n]
        ink = lambda x, y: sum(im.getpixel((int(x * s), int(y * s)))) < 690   # 白っぽくない＝線
        cx, cy = p["x"] + p["w"] / 2, p["y"] + p["w"] / 2
        # □のまん中から上・下・左へ進み、最初に当たった線を□のふちとする（となりの区切り線を拾わないため）
        def walk(x, y, dx, dy, lim=12):
            for k in range(1, int(lim * 4)):
                if ink(x + dx * k / 4, y + dy * k / 4): return k / 4
            return None
        up, dn, lf = walk(cx, cy, 0, -1), walk(cx, cy, 0, 1), walk(cx, cy, -1, 0)
        if None in (up, dn, lf):
            bad.append(f"quiz{i+1} □の線が見つからない（✓の場所が□から外れている）"); continue
        ys, xs = [cy - up, cy + dn], [cx - lf]
        dt, db, dl = ys[0] - p["y"], (p["y"] + p["w"]) - ys[-1], xs[0] - p["x"]
        if max(abs(dt), abs(db), abs(dl)) > 1.0:
            bad.append(f"quiz{i+1} ずれ 上{dt:+.1f} 下{db:+.1f} 左{dl:+.1f}pt")
print("\n".join("NG chkcheck " + b for b in bad) if bad else f"OK chkcheck {len(P)}個の□と✓の場所が合っている")
sys.exit(1 if bad else 0)
