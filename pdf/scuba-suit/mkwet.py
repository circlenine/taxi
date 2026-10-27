# ウェットスーツの図
# 10/27 夜 まーく様「ウェットスーツも、いちばん普及しているモデルのカタログから取る方が良いのでは」
#   → ワールドダイブ（サンライズのドライの参考と同じ会社）の 2026 カタログ p.30（PDFの16枚目）「AF1」WOMEN の前・後ろ
#   ※カタログで「人気のベストセラー」と書かれているのは TSZR だが、ファスナーが体の横を通る特別な形
#     （ロングコイルファスナー）。講習やレンタルで着る形（背中ファスナーのワンピース）と違うので使わない。
#     AF1 は、背中ファスナーのワンピース・膝パッドつき・女性用の中でいちばん手ごろな型（同じカタログの価格表）
#   背景は rembg（人の形を切り抜く道具）で消して白地に。ドライの図（mkcat.py）と同じ大きさ・同じタグの形にそろえる
from rembg import remove, new_session
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from scipy import ndimage
s = new_session("u2net_human_seg")
SRC = Image.open("/tmp/claude-0/kfw4/wd_p16.png").convert("RGB")   # カタログ p.30 を 300dpi で画像にしたもの
def cut(box):
    im = SRC.crop(box)
    rgba = remove(im, session=s); a = np.array(rgba.getchannel("A")); m = a > 100
    lab, n = ndimage.label(m); keep = ndimage.binary_fill_holes(lab == (1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1))))))
    a2 = np.array(Image.fromarray(np.where(keep, a, 0).astype("uint8")).filter(ImageFilter.GaussianBlur(1.0)))
    rgba.putalpha(Image.fromarray(a2)); bb = Image.fromarray(a2).point(lambda v: 255 if v > 40 else 0).getbbox()
    return rgba.crop(bb), bb
front, fb = cut((3800, 380, 4300, 2440))
back, bb_ = cut((4440, 1520, 4860, 3010))
W, H = 2200, 800; out = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(out); RED = (249, 54, 18)
FP = "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"
font = ImageFont.truetype(FP, 56); cap = ImageFont.truetype(FP, 60)
FH, TOP = 700, 8
def place(im, bb, ox):
    sc = FH / im.size[1]; r = im.resize((round(im.size[0] * sc), FH), Image.LANCZOS); out.paste(r, (ox, TOP), r)
    return (lambda x, y: (ox + (x - bb[0]) * sc, TOP + (y - bb[1]) * sc)), r.size[0]   # 切り出した枠の中の位置 → 図の上の位置
P1, w1 = place(front, fb, 760)
P2, w2 = place(back, bb_, 1240)
def ring(c, r, ry=None, w=9):
    ry = ry or r; x, y = c; d.ellipse((x - r, y - ry, x + r, y + ry), outline=RED, width=w)
def tag(text, x, y, anchor, to, minw=0):
    bw, bh = max(d.textlength(text, font=font) + 40, minw), font.size + 30
    x0 = x - bw if anchor == "r" else x; y0 = y - bh / 2
    d.line((to[0], to[1], x0 + bw if anchor == "r" else x0, y), fill=RED, width=6)
    d.rounded_rectangle((x0 - 5, y0 - 5, x0 + bw + 5, y0 + bh + 5), radius=16, fill="white")
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=14, fill=RED)
    d.text((x0 + 20, y), text, font=font, fill="white", anchor="lm")
# 膝パッド（黒い当て布・両ひざ）／背中のファスナー（後ろの首から腰の上まで）
k1, k2 = P1(170, 1452), P1(309, 1457); kc = ((k1[0] + k2[0]) / 2, (k1[1] + k2[1]) / 2)
ring(kc, 60, 42); tag("膝パッド", 700, kc[1], "r", (kc[0] - 60, kc[1]))
bz = P2(152, 438); ring(bz, 36, 80); tag("背中のファスナー", 1560, bz[1], "l", (bz[0] + 34, bz[1]))
for x, w, t in ((760, w1, "前"), (1240, w2, "後")):
    d.text((x + w / 2, H - 14), t, font=cap, fill=(70, 70, 70), anchor="ms")
out.save("/tmp/claude-0/kfw4/w_cat.jpg", quality=92)
print("ok", w1, w2, kc, bz)
