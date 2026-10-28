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
# 10/27 夜 まーく様「この無駄な右の空白は何か」→ ドライの図（mkcat.py）と同じく、前・後ろを薄い灰色の枠で囲み、
#   タグは自分の図の枠の中だけ。枠は中身に合わせた大きさ（何もない白を残さない）
# 10/27 夜 まーく様「ドライと同じく、画像は大きく、文章は画像の下。統一性を」
#   → 高さ・図の高さはドライの図（mkcat.py）と同じ。ページでは横いっぱいに出すので、
#     タグの字の見た目の大きさがドライと同じになるよう、字の大きさを図の横幅に合わせて決める（数回くり返して合わせる）
H = 625; PAD = 30; GAP = 30; BG = (242, 245, 247); RED = (249, 54, 18)
FP = "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"
FH, TOP = 560, 10
WD = Image.open("/tmp/claude-0/kfw4/d_cat.jpg").size[0]   # ドライの図の横幅（字の見た目をそろえる相手）
def draw(fs):
    font = ImageFont.truetype(FP, round(fs)); cap = ImageFont.truetype(FP, round(fs)); k = fs / 56
    out = Image.new("RGB", (3000, H), "white"); d = ImageDraw.Draw(out)
    tw = lambda t: d.textlength(t, font=font) + 40 * k
    X1 = PAD; TX = round(X1 + PAD + tw("膝パッド")); OX1 = TX + round(40 * k)
    sc1 = FH / front.size[1]; w1 = round(front.size[0] * sc1); R1 = OX1 + w1 + PAD
    X2 = R1 + GAP; OX2 = X2 + PAD; sc2 = FH / back.size[1]; w2 = round(back.size[0] * sc2)
    ZX = OX2 + w2 + round(40 * k); R2 = round(ZX + tw("背中のファスナー") + PAD); W = R2 + PAD
    for a_, b_ in ((X1, R1), (X2, R2)): d.rounded_rectangle((a_, 8, b_, H - 8), radius=28, fill=BG)
    def place(im, bb, ox, sc):
        r = im.resize((round(im.size[0] * sc), FH), Image.LANCZOS); out.paste(r, (ox, TOP), r)
        return lambda x, y: (ox + (x - bb[0]) * sc, TOP + (y - bb[1]) * sc)
    P1 = place(front, fb, OX1, sc1); P2 = place(back, bb_, OX2, sc2)
    def ring(c, r, ry=None):
        ry = ry or r; x, y = c; d.ellipse((x - r, y - ry, x + r, y + ry), outline=RED, width=max(4, round(9 * k)))
    def tag(text, x, y, anchor, to):
        bw, bh = tw(text), font.size + 30 * k
        x0 = x - bw if anchor == "r" else x; y0 = y - bh / 2
        d.line((to[0], to[1], x0 + bw if anchor == "r" else x0, y), fill=RED, width=max(3, round(6 * k)))
        d.rounded_rectangle((x0 - 5, y0 - 5, x0 + bw + 5, y0 + bh + 5), radius=16, fill="white")
        d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=14, fill=RED)
        d.text((x0 + 20 * k, y), text, font=font, fill="white", anchor="lm")
    # 膝パッド（黒い当て布・両ひざ）／背中のファスナー（後ろの首から腰の上まで）
    k1, k2 = P1(170, 1452), P1(309, 1457); kc = ((k1[0] + k2[0]) / 2, (k1[1] + k2[1]) / 2)
    ring(kc, 50, 36); tag("膝パッド", TX, kc[1], "r", (kc[0] - 50, kc[1]))
    bz = P2(152, 438); ring(bz, 30, 66); tag("背中のファスナー", ZX, bz[1], "l", (bz[0] + 30, bz[1]))
    for x, w, t in ((OX1, w1, "前"), (OX2, w2, "後")):
        d.text((x + w / 2, H - 16), t, font=cap, fill=(70, 70, 70), anchor="ms")
    return out.crop((0, 0, W, H)), W
# 字の大きさはドライと同じ 56。横幅をドライと同じにするため、あいた所には「アップ」の枠を置き、
#   膝パッドと背中のファスナーを大きく見せる（何もない白を作らない・図の中身を増やす）。
#   アップはカタログを 600dpi で画像にして切り出す（粗くならないように）。アップの下の名前は、前・後と同じ灰色の字
out, W = draw(32)   # 10/28 字は本文と同じ見た目の大きさ（ドライの図と同じ 32）
X3 = W + GAP - PAD; R3 = WD - PAD
import subprocess, os
HI = "/tmp/claude-0/kfw4/wd_p16_600.png"
if not os.path.exists(HI):
    subprocess.run(["pdftoppm", "-f", "16", "-l", "16", "-r", "600", "-png", "-singlefile",
                    "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/dl/wd/26wd_catalog.pdf", HI[:-4]], check=True)
SRC2 = Image.open(HI).convert("RGB")
big = Image.new("RGB", (WD, H), "white"); big.paste(out, (0, 0)); d = ImageDraw.Draw(big)
d.rounded_rectangle((X3, 8, R3, H - 8), radius=28, fill=BG)
cap = ImageFont.truetype(FP, 32)
P3 = 14; iw = R3 - X3 - 2 * P3; ih = (H - 16 - 2 * 48 - 24) // 2
y = 8 + 8
for box, lab, rc in (((3905, 1715, 4175, 1985), "膝パッド", None), ((4500, 1800, 4700, 2110), "ファスナー", None)):
    im = SRC2.crop(tuple(v * 2 for v in box)); im.thumbnail((iw, ih), Image.LANCZOS)
    x = X3 + P3 + (iw - im.size[0]) // 2
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1), radius=18, fill=255)
    # 名前は写真の上に置く（右下には、ページで ▶ の印が重なるため）
    f = cap
    while d.textlength(lab, font=f) > iw: f = ImageFont.truetype(FP, f.size - 2)
    d.text(((X3 + R3) / 2, y + 36), lab, font=f, fill=(70, 70, 70), anchor="ms")
    big.paste(im, (x, y + 46), m)
    y += im.size[1] + 46 + 20
out = big
out.save("/tmp/claude-0/kfw4/w_cat.jpg", quality=92)
print("ok", out.size, "ドライの横幅", WD, "アップの幅", iw)
