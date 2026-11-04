"""11/4 まーく様「前と丸が被ってます（繋がってる）。ドライの画像や、全てのページ含めて見直して」
   写真に描いた丸・札（focus_w.py が img/s/<名前>.ring.png に形を残す）が、
   ・右下の ▶ に かかっていないか（▶ のまわり 1.5mm もあける）
   ・写真のふちで切れていないか（ふちから 0.5mm 以内に線が来ない）
   を調べる。▶ の位置は playring.js がページから測る。"""
import json, sys, os
from PIL import Image
import numpy as np
items = json.load(open(sys.argv[1])); d = sys.argv[2]; ng = []
for it in items:
    f = os.path.join(d, it["src"].replace(".jpg", ".ring.png"))
    if not os.path.exists(f): continue
    m = np.array(Image.open(f)) > 60; H, W = m.shape
    pxmm = W / it["wmm"]
    for x0, y0, x1, y1 in it["play"]:
        g = 1.5 * pxmm   # ▶ のまわりは 1.5mm あける（1mm だと、目ではくっついて見えた）
        a = m[max(0, int(y0 * H - g)):int(y1 * H + g) + 1, max(0, int(x0 * W - g)):int(x1 * W + g) + 1]
        if a.any(): ng.append(f"NG {it['page']} {it['k']}：写真の丸・札が ▶ に かかる（▶ のまわり 1.5mm をあける）")
    e = max(1, int(0.5 * pxmm))
    if m[:e].any() or m[-e:].any() or m[:, :e].any() or m[:, -e:].any():
        ng.append(f"NG {it['page']} {it['k']}：写真の丸・札が、写真のふちで切れている")
# 11/4 まーく様「▶ と背景がずれている。こういうのやめて」→ 図（灰色の枠の絵）では、▶ の下が枠の外の白になっていないか
for it in items:
    if it["k"] not in ("d_cat", "w_cat") or not it["play"]: continue
    f = os.path.join(d, it["src"])
    if not os.path.exists(f): continue
    a = np.array(Image.open(f).convert("RGB")).astype(int); H, W = a.shape[:2]
    for x0, y0, x1, y1 in it["play"]:
        r = a[int(y0 * H):int(y1 * H) + 1, int(x0 * W):int(x1 * W) + 1]
        if (r.min(axis=2) > 248).mean() > 0.01: ng.append(f"NG {it['page']} {it['k']}：▶ が図の灰色の枠からはみ出している（下が白）")
print("\n".join(ng) if ng else f"丸と ▶・写真のふち OK（{len(items)} 枚）"); sys.exit(1 if ng else 0)
