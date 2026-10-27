"""図（ドライ・ウェットのしくみ図）の、何もない白い帯を止める（10/27 夜 まーく様「この右の無駄な空白は何ですか」）
   根拠：関係のないものを省くほど学びやすい（Mayer の一貫性の原則）。同じ枠の中のものは、ひとまとまりに見える（ゲシュタルトの共通領域）。
   ・上から下まで何も描いていない縦の帯が、図の横幅の 8% を超えたら止める
   ・図は mkcat.py・mkwet.py で、前・後ろを別の枠に入れ、タグは自分の枠の中だけに置く（枠のない図＝白地ばかりの図も止める）"""
import sys
from PIL import Image
import numpy as np
ng = []
for k in ("d_cat", "w_cat"):
    a = np.array(Image.open(f"/tmp/claude-0/kfw4/{k}.jpg").convert("RGB")).astype(int)
    emp = (np.abs(a - [242, 245, 247]).sum(axis=2) < 14) | (a.min(axis=2) > 246)
    col = emp.mean(axis=0) > .985
    best = cur = 0
    for v in col: cur = cur + 1 if v else 0; best = max(best, cur)
    if best / a.shape[1] > .08: ng.append(f"NG {k}：何もない縦の帯が、横幅の {best / a.shape[1]:.0%}（8%まで）")
    if (np.abs(a - [242, 245, 247]).sum(axis=2) < 14).mean() < .2: ng.append(f"NG {k}：前・後ろの枠がない（タグがどちらの図のものか、迷わせる）")
print("\n".join(ng) if ng else "図の余白 OK（何もない帯なし・前後の枠あり）"); sys.exit(1 if ng else 0)
