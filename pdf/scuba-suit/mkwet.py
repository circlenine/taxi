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
WD = 1276   # ドライの図の「前・後」2枠ぶんの横幅（字の見た目をそろえる相手）。10/28 ドライに3つ目の枠（フル装備）を足したので、決まった数にする
def draw(fs, ext=0):
    font = ImageFont.truetype(FP, round(fs)); cap = ImageFont.truetype(FP, round(fs)); k = fs / 56
    out = Image.new("RGB", (3000, H), "white"); d = ImageDraw.Draw(out)
    tw = lambda t: d.textlength(t, font=font) + 40 * k
    X1 = PAD; TX = round(X1 + PAD + max(tw(t) for t in ("空気のボタンなし", "膝パッド", "ブーツなし"))); OX1 = TX + round(40 * k) + ext * 6 // 10
    sc1 = FH / front.size[1]; w1 = round(front.size[0] * sc1); R1 = OX1 + w1 + PAD
    X2 = R1 + GAP; OX2 = X2 + PAD; sc2 = FH / back.size[1]; w2 = round(back.size[0] * sc2)
    ZX = OX2 + w2 + round(40 * k) + ext - ext * 6 // 10; R2 = round(ZX + tw("背中のファスナー") + PAD); W = R2 + PAD
    for a_, b_ in ((X1, R1), (X2, R2)): d.rounded_rectangle((a_, 8, b_, H - 8), radius=28, fill=BG)
    def place(im, bb, ox, sc):
        r = im.resize((round(im.size[0] * sc), FH), Image.LANCZOS); out.paste(r, (ox, TOP), r)
        return lambda x, y: (ox + (x - bb[0]) * sc, TOP + (y - bb[1]) * sc)
    P1 = place(front, fb, OX1, sc1); P2 = place(back, bb_, OX2, sc2)
    OVL = []   # 10/28 赤丸は、ドライの図と同じく すかして重ねる（スーツがいちばん良く見えるように）
    def ring(c, r, ry=None):
        OVL.append((c, r, ry or r))
    def tag(text, x, y, anchor, to):
        bw, bh = tw(text), font.size + 30 * k
        x0 = x - bw if anchor == "r" else x; y0 = y - bh / 2
        d.line((to[0], to[1], x0 + bw if anchor == "r" else x0, y), fill=RED, width=max(3, round(6 * k)))
        d.rounded_rectangle((x0 - 5, y0 - 5, x0 + bw + 5, y0 + bh + 5), radius=16, fill="white")
        d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=14, fill=RED)
        d.text((x0 + 20 * k, y), text, font=font, fill="white", anchor="lm")
    # 膝パッド（黒い当て布・両ひざ）／背中のファスナー（後ろの首から腰の上まで）
    # 10/28 まーく様「ウェットはブーツなし、のように ドライとの比較が分かる工夫を」→ ドライの図のタグ（胸の空気・ブーツも一体）と同じ高さに、ウェットの「なし」を並べる
    ch = P1(290, 560); ring(ch, 40); tag("空気のボタンなし", TX, ch[1], "r", (ch[0] - 40, ch[1]))
    k1, k2 = P1(170, 1452), P1(309, 1457); kc = ((k1[0] + k2[0]) / 2, (k1[1] + k2[1]) / 2)
    ring(kc, 50, 36); tag("膝パッド", TX, kc[1], "r", (kc[0] - 50, kc[1]))
    ft = P1(270, 1965); ring(ft, 70, 34); tag("ブーツなし", TX, ft[1] - 20, "r", (ft[0] - 70, ft[1]))
    bz = P2(152, 438); ring(bz, 30, 66); tag("背中のファスナー", ZX, bz[1], "l", (bz[0] + 30, bz[1]))
    for x, w, t in ((OX1, w1, "前"), (OX2, w2, "後")):
        d.text((x + w / 2, H - 16), t, font=cap, fill=(70, 70, 70), anchor="ms")
    ov = Image.new("RGBA", out.size, (0, 0, 0, 0)); dv = ImageDraw.Draw(ov)
    for (x, y), r, ry in OVL: dv.ellipse((x - r, y - ry, x + r, y + ry), outline=RED + (150,), width=7)
    out = Image.alpha_composite(out.convert("RGBA"), ov).convert("RGB")
    return out.crop((0, 0, W, H)), W
# 字の大きさはドライと同じ 56。横幅をドライと同じにするため、あいた所には「アップ」の枠を置き、
#   膝パッドと背中のファスナーを大きく見せる（何もない白を作らない・図の中身を増やす）。
#   アップはカタログを 600dpi で画像にして切り出す（粗くならないように）。アップの下の名前は、前・後と同じ灰色の字
# 10/28 タグがドライの図と同じ字の大きさ・同じ横幅になるよう、あまった横幅は タグの線をのばして使う（「アップ」の枠は小さくなりすぎるのでやめた）
out, W = draw(32)
out, W = draw(32, WD - W)
out.save("/tmp/claude-0/kfw4/w_cat.jpg", quality=92)
print("ok", out.size, "ドライの横幅", WD)
