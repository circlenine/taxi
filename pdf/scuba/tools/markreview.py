# 赤い四角の中身と、写真の切り抜きを、拡大して1枚に並べる（10/8 ご指摘：2-2の四角が黒いでっぱりを外れていた／1-1のキャップが見切れていた）
# 数字の検査では「何を囲んでいるか」「肝心の物が入っているか」は分からないので、作るたびにこの1枚を目で見る
# 使い方: python3 markreview.py <切り抜いた写真のディレクトリ> <出力png>
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw, ImageFont
from focus import MARK, MARKR, MARKE, MARKQ, F, FONT
d_in, out = sys.argv[1:3]
tiles = []
for key in sorted(set(MARK) | set(MARKR) | set(MARKE) | set(MARKQ)):
    p = os.path.join(d_in, f"{key}_0.jpg")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGB")
    im.thumbnail((520, 520))
    tiles.append((key + (" 赤い四角" if key in MARK else " 切り抜き全体"), im))
W = 540; H = sum(t.size[1] + 40 for _, t in tiles) + 10
sheet = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(sheet); f = ImageFont.truetype(FONT, 20)
y = 10
for lab, t in tiles:
    d.text((10, y), lab, font=f, fill=(0, 0, 0)); sheet.paste(t, (10, y + 30)); y += t.size[1] + 40
sheet.save(out); print("見直し用:", out, len(tiles), "枚")
