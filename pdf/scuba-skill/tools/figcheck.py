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
# 10/27 夜 まーく様「ドライと同じく…ちゃんと統一性を」：ウェットとドライの図は、同じ大きさ（＝ページでの字の大きさも同じ）
_sz = {k: Image.open(f"/tmp/claude-0/kfw4/{k}.jpg").size for k in ("d_cat", "w_cat")}
# 10/28 まーく様「フル装備のイメージ写真を、ドライの全体写真と一緒に」→ ドライは3枠で横に長い。高さはそろえ、ドライが短くなることだけを止める
if _sz["d_cat"][1] != _sz["w_cat"][1] or _sz["d_cat"][0] < _sz["w_cat"][0]: ng.append(f"NG ウェットとドライの図の大きさがちがう（{_sz}）。字の大きさ・図の高さがそろわない")
# 11/4 まーく様「前と丸が被ってる（繋がってる）。ドライの画像や全てのページも見直して」
#   → 丸（線の太さこみ）と、字の箱（タグ・前・後）の間を、8px（ページで約1mm）以上あける。丸どうしも同じ
import json
for k in ("d_cat", "w_cat"):
    try: bx = json.load(open(f"/tmp/claude-0/kfw4/{k}.boxes.json"))
    except Exception: ng.append(f"NG {k}：丸と字の位置の控え（{k}.boxes.json）がない。mkcat.py / mkwet.py を動かし直す"); continue
    gap = lambda a, b: max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3])   # 0以下＝重なり
    for r in bx["rings"]:
        for l in bx["labels"]:
            if gap(r, l[1:]) < 8: ng.append(f"NG {k}：丸と「{l[0]}」が近すぎる・重なる（すき間 {gap(r, l[1:]):.0f}px。8px以上）")
print("\n".join(ng) if ng else "図の余白 OK（何もない帯なし・前後の枠あり）"); sys.exit(1 if ng else 0)
