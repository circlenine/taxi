"""赤丸の「中身」だけを切り出して、1枚に並べる（10/27 まーく様「どうして変なとこ丸してるのですか」）。
   小さな写真では、丸の中に何が入っているか見えない。丸の中を大きくして、
   囲みたかった物の名前（RINGWHAT）と並べ、組み立てのたびに目で確かめる。
   使い方: python3 ringsheet.py img/s 出力.jpg"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import focus_w as fw

d = sys.argv[1]; outp = sys.argv[2]
boxes = json.load(open(os.path.join(d, "boxes.json")))
FONT = fw.FONT
cells = []
for slot, (key, x0, y0, x1, y1, rings) in sorted(boxes.items()):
    if not rings: continue
    src = fw.load(fw.F[key][0]) if key in fw.F else None
    if src is None: continue
    sx, sy = src.size[0] / 1280, src.size[1] / 720
    for cx, cy, r in rings:
        m = r * 1.15   # 丸のすこし外まで
        c = src.crop((round((cx - m) * sx), round((cy - m) * sy), round((cx + m) * sx), round((cy + m) * sy))).resize((300, 300))
        dr = ImageDraw.Draw(c); dr.ellipse((300 * .065, 300 * .065, 300 * .935, 300 * .935), outline=(230, 0, 0), width=3)
        cells.append((c, f"{slot} {key}", "囲む物：" + fw.RINGWHAT.get(key, "（未記入）")))
cols = 5; rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 320, rows * 380), "white"); dr = ImageDraw.Draw(sheet)
f = ImageFont.truetype(FONT, 22)
for i, (c, a, b) in enumerate(cells):
    X, Y = (i % cols) * 320 + 10, (i // cols) * 380 + 10
    sheet.paste(c, (X, Y)); dr.text((X, Y + 305), a, fill="black", font=f); dr.text((X, Y + 333), b, fill=(200, 0, 0), font=f)
sheet.save(outp, quality=85); print(f"赤丸 {len(cells)} 個 → {outp}")
