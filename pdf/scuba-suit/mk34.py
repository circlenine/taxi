# 3-4「つなぐ前・後」の2枚を、ロゴが水平・口が真横の左・同じ大きさ・同じ位置になるようにそろえる（11/2 夜 まーく様のご指摘）
# ・ロゴのまん中を軸に回す（前の写真 +19°、後の写真 -12°）。ロゴの大きさで倍率をそろえる
# ・口（ボタンから出ている金具）が写真のまん中に来るよう、ずらす
import sys
from PIL import Image, ImageDraw
# 写真を「ロゴのまん中」を軸に回し、同じ大きさ・同じ位置にそろえる
def make(src, c, dia, rot, out, cx=700, cy=360, D=250):
    im = Image.open(src).convert('RGB')
    s = D / dia
    big = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    C = (c[0] * s, c[1] * s)
    big = big.rotate(rot, resample=Image.BICUBIC, center=C, expand=False)
    x0, y0 = C[0] - cx, C[1] - cy
    return big.crop((round(x0), round(y0), round(x0) + 1280, round(y0) + 720)).save(out, quality=95)
rA, rB = float(sys.argv[1]), float(sys.argv[2])
make('/tmp/claude-0/web60/im/235_f8be51.jpg', (399, 413), 92, rA, '/tmp/claude-0/al34/A.jpg', cx=1045, cy=301)
make('/tmp/claude-0/web51/022.jpg', (263, 235), 62, rB, '/tmp/claude-0/al34/B.jpg', cx=1048, cy=396)
W = Image.new('RGB', (1280, 1440)); W.paste(Image.open('/tmp/claude-0/al34/A.jpg'), (0, 0)); W.paste(Image.open('/tmp/claude-0/al34/B.jpg'), (0, 720))
d = ImageDraw.Draw(W)
for y in [360, 1080]: d.line([(0, y), (1280, y)], fill=(255, 255, 0), width=1)
for x in [640]: d.line([(x, 0), (x, 1440)], fill=(0, 255, 255), width=1)
W.resize((800, 900)).save(sys.argv[3])
