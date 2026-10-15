# 表紙の数字が、わくの中で「左右はまん中・上下は気持ち上」にあるかを確かめる（10/15 ご指示）
# 字の黒い部分のまわりのすき間を測る。上のすき間が下より 0.2〜1.2mm 小さければ OK（目で見てまん中に見える）
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size
mm = W / float(sys.argv[2]); f = int(round(1.2 * mm)) + 2   # わくの線（1.2mm）の内側だけを見る
px = im.load(); ys = []; xs = []
for y in range(f, H - f):
    for x in range(f, W - f):
        r, g, b = px[x, y]
        if r + g + b < 450: ys.append(y); xs.append(x)
top = (min(ys) - f) / mm; bot = ((H - f) - max(ys)) / mm; left = (min(xs) - f) / mm; right = ((W - f) - max(xs)) / mm
# わくの線が4辺ともつながっているか（10/15：数字の中の札に、本文の札と同じ名前を付けて、うす色の帯がわくを消したことがあった）
k = max(1, int(0.6 * mm)); dark = lambda p: sum(p) < 450
frame = all(dark(px[x, k]) and dark(px[x, H - 1 - k]) for x in range(f, W - f, 3)) and all(dark(px[k, y]) and dark(px[W - 1 - k, y]) for y in range(f, H - f, 3))
if not frame: print("NG 表紙の数字のわくの線が、とちゅうで切れている")
ok = 0.2 <= bot - top <= 1.2 and abs(left - right) <= 0.5 and frame
print(("表紙の数字の位置 OK" if ok else "NG 表紙の数字の位置") + f"（上 {top:.2f}mm・下 {bot:.2f}mm・左 {left:.2f}mm・右 {right:.2f}mm）")
sys.exit(0 if ok else 1)
