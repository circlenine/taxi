# ウェットスーツの図（10/27 まーく様「ウェットスーツの紹介も、ドライスーツと同じく全体が写って、不要な背景は切り抜いたもの」）
# 元：DIVER mag「ウエットスーツを楽に着る方法」の画面。前＝373秒（両手を広げた全身・字幕なし）／横＝342秒（背中のファスナー。下の字幕より上だけ）
# 背景は rembg（人の形を切り抜く道具）で消して白地に。ドライの図（mkcat.py）と同じ大きさ・同じタグの形にそろえる
from rembg import remove, new_session
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from scipy import ndimage
s = new_session("u2net_human_seg")
def cut(path, box):
    im = Image.open(path).convert("RGB").crop(box)
    rgba = remove(im, session=s); a = np.array(rgba.getchannel("A")); m = a > 100
    lab, n = ndimage.label(m); keep = ndimage.binary_fill_holes(lab == (1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1))))))
    a2 = np.array(Image.fromarray(np.where(keep, a, 0).astype("uint8")).filter(ImageFilter.GaussianBlur(1.0)))
    rgba.putalpha(Image.fromarray(a2)); bb = Image.fromarray(a2).point(lambda v: 255 if v > 40 else 0).getbbox()
    return rgba.crop(bb)
front = cut("/tmp/claude-0/kfw4/wf373.jpg", (0, 0, 1920, 1080))   # 765x661
side = cut("/tmp/claude-0/kfw4/w_side.jpg", (0, 0, 1920, 930))      # 282x713
W, H = 2200, 880; out = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(out); RED = (249, 54, 18)
FP = "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"
font = ImageFont.truetype(FP, 56); cap = ImageFont.truetype(FP, 60)
FH, TOP = 770, 10
def place(im, ox):
    sc = FH / im.size[1]; r = im.resize((round(im.size[0] * sc), FH), Image.LANCZOS); out.paste(r, (ox, TOP), r)
    return (lambda x, y: (ox + x * sc, TOP + y * sc)), r.size[0]
P1, w1 = place(front, 640)
P2, w2 = place(side, 1760)
def ring(c, r, ry=None, w=9):
    ry = ry or r; x, y = c; d.ellipse((x - r, y - ry, x + r, y + ry), outline=RED, width=w)
def tag(text, x, y, anchor, to, minw=0):
    bw, bh = max(d.textlength(text, font=font) + 40, minw), font.size + 30
    x0 = x - bw if anchor == "r" else x; y0 = y - bh / 2
    d.line((to[0], to[1], x0 + bw if anchor == "r" else x0, y), fill=RED, width=6)
    d.rounded_rectangle((x0 - 5, y0 - 5, x0 + bw + 5, y0 + bh + 5), radius=16, fill="white")
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=14, fill=RED)
    d.text((x0 + 20, y), text, font=font, fill="white", anchor="lm")
LW = max(d.textlength(t, font=font) + 40 for t in ("首のマジックテープ", "膝パッド"))
nk = P1(345, 124); ring(nk, 46, 30); tag("首のマジックテープ", 600, 146, "r", (nk[0] - 46, nk[1]), LW)
kn = P1(395, 497); ring(kn, 46, 56); tag("膝パッド", 600, 718, "r", (kn[0] - 40, kn[1]), LW)
bk = P2(28, 330); ring(bk, 40, 150); tag("背中のファスナー", 1730, 560, "r", (bk[0] - 30, bk[1] + 60))
for x, w, t in ((640, w1, "前"), (1760, w2, "横（背中側）")):
    d.text((x + w / 2, H - 14), t, font=cap, fill=(70, 70, 70), anchor="ms")
out.save("/tmp/claude-0/kfw4/w_cat.jpg", quality=92)
print("ok", w1, w2)
