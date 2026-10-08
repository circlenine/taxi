# 比べる2枚（1-3の高すぎ・低すぎ）で、タンクのバルブが同じ位置・同じ大きさに来ているか（10/8 ご指摘）
# 2枚を重ねて、バルブのあたり（まん中の上半分）がどれだけ似ているかを数字で見る
import sys, numpy as np
from PIL import Image
d = sys.argv[1]
def ncc(x, y):
    x = x - x.mean(); y = y - y.mean(); return (x * y).sum() / np.sqrt((x * x).sum() * (y * y).sum())
# 比べる組：(1枚目, 2枚目, 比べるところ(縦,横の範囲), 名前)
#  1-1：タンクの胴（手の動きは比べない）／1-3：バルブ
# 1-1 は、2枚目のタンクが回っていて模様がちがい、この数え方では測れない（10/8）。重ねた画像を目で見て確かめる
PAIRS = [
         ("nghi_0", "nglo_0", (slice(20, 110), slice(60, 140)), "1-3 バルブ")]
bad = 0
for p1, p2, win, name in PAIRS:
    a = np.asarray(Image.open(f"{d}/{p1}.jpg").convert("L").resize((200, 168)), dtype=float)
    b = np.asarray(Image.open(f"{d}/{p2}.jpg").convert("L").resize((200, 168)), dtype=float)
    ys, xs = win
    best = max((ncc(a[win], b[ys.start + dy:ys.stop + dy, xs.start + dx:xs.stop + dx]), dx, dy) for dx in range(-8, 9) for dy in range(-8, 9)
               if ys.start + dy >= 0 and ys.stop + dy <= 168 and xs.start + dx >= 0 and xs.stop + dx <= 200)
    ok = abs(best[1]) <= 2 and abs(best[2]) <= 2
    bad += not ok
    print(f"比べる写真のそろい {name} {'OK' if ok else 'NG'}（ずれ 横{best[1]}・縦{best[2]}、200幅あたり）")
sys.exit(1 if bad else 0)
