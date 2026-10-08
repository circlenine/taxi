# 写真ごとに「必ず見せる部分（focus）」と「切り抜いてよい範囲（allowed）」を決めておき、
# PDFの枠の縦横比に合わせて、元のスクショ（高画質）から切り抜く。
# こうすると、枠の形がどうであっても、見せたい器材が真ん中に大きく入り、字幕や枠の外は入らない。
# 座標はどれも、画面を 1280x720 に縮めたときの位置。
import sys, os, json
from PIL import Image

UP = "/root/.claude/uploads/647c6673-e0d4-50d5-a1f6-0c9285b7952c"
IDS = """f6cf92f7 10f390cf 44daeb19 0014f7eb 00955b85 8530fcef 127270b4 4f915c90 4805944f 1119bcea efa12206 795e131d 1c575a3b a22a357f ca7fc848 0656c002
9e2e776e e610acb1 1501fbda 012294ef 9d9972df 2a45b59a e5837b3c 0bd89c81 8ad50dcc ba8ac59e 8ee5eba2 332f6d38 d1c0910c 52f37f10 208cd089 caff6332
d0dd7c1e b8721247 bc8a0682 40393f4e 7acbe1d9 9d46d9b5 c905b8af 0605e5a0 75f43488""".split()

FULL = (0, 0, 1280, 720)
PAD_OK = {"tank"}
# key: (画面の番号, allowed, focus)
F = {
 # 1-1の2枚：タンクを写真の左右まん中に置き、手元（タンクの頭と手）を大きく写す（10/8 ご指示）。
 # 2枚目のタンクは元の画面で 左へ17・下へ2 ずれ、大きさは同じ → 同じ大きさの範囲をそのぶんずらして切る
 # 1-1：手に持っている黒いキャップ（右はし x≒548）と指先まで、切らずに入れる（10/8 ご指摘：キャップが見切れていた）
 "cap": (3, (0, 0, 1280, 555), (405, 65, 572, 255)),
 "c04": (4, (0, 0, 1280, 555), (395, 72, 505, 252)),
 "c05": (5, (0, 0, 1280, 565), (330, 20, 740, 560)),
 "c06": (6, (0, 0, 1280, 545), (360, 40, 860, 420)),
 # 高すぎ・低すぎは、2枚を重ねたときにタンク（バルブ）がぴったり同じ位置・同じ大きさになるように切る（10/8 ご指摘）。
 # 元の画面で測った値：バルブの銀色の頭の左上が 高すぎ(218.7, 278.7)／低すぎ(843.3, 245.3)、
 # 低すぎの写真は 1.16倍 大きく写っている（バルブの幅 51.3→60、頭から首の輪まで 141→163）。
 # 高すぎの範囲 (120,250)-(330,500) を、この位置と倍率で低すぎの写真に写したものが、下の nglo の範囲
 # 高すぎは、BCDの上のふち（右上の白い壁との境目）まで入れる（10/8 ご指摘：BCDが見切れていた）
 "nghi": (7, (14, 192, 626, 529), (120, 195, 480, 498)),
 "nglo": (7, (644, 140, 1256, 529), (728.8, 148.2, 1146.4, 499.7)),
 "c09": (9, (0, 0, 1280, 555), (540, 40, 940, 380)),
 "c10": (10, (0, 0, 1280, 545), (440, 150, 720, 360)),
 "c11": (11, FULL, (300, 40, 700, 330)),
 "c13": (13, (0, 0, 1280, 545), (440, 90, 800, 340)),
 "c14": (14, (0, 0, 1280, 545), (610, 120, 970, 370)),
 "c15": (15, (0, 0, 1280, 545), (380, 80, 960, 360)),
 "c44": (44, (0, 0, 1280, 540), (470, 150, 880, 340)),
 "strap": (43, (0, 0, 1280, 720), (160, 20, 790, 700)),  # 上下を回したあと：オクトの口（左）からストラップの金具（下）まで全部入れる  # 上下を回したあとの位置
 "twist": (42, (0, 0, 1280, 720), (240, 300, 900, 712)),
 "c16": (16, (205, 58, 1082, 545), (530, 290, 790, 525)),
 "hoses": (8, (195, 62, 1085, 515), (330, 95, 930, 455)),
 "c19": (19, (0, 0, 1280, 550), (420, 120, 1000, 545)),
 "c21": (21, (0, 0, 1280, 545), (390, 90, 760, 470)),
 "c22": (22, (0, 0, 1280, 545), (370, 150, 730, 520)),
 "c24": (24, (0, 0, 1280, 555), (300, 60, 900, 540)),
 "c26": (26, (0, 0, 1280, 555), (370, 140, 730, 520)),
 "c27": (27, (0, 0, 1280, 545), (340, 20, 1100, 545)),
 "c29": (29, (0, 0, 1280, 585), (500, 170, 880, 585)),
 "c30": (30, (0, 0, 1280, 575), (450, 140, 910, 575)),
 "c32": (32, (0, 0, 1280, 545), (380, 140, 1000, 545)),
 "c33": (33, (0, 0, 1280, 545), (380, 120, 940, 420)),
 "c34": (34, (0, 0, 1280, 575), (300, 60, 1060, 570)),
 # 5-2：前側を留めている正面の画面に差し替え（10/8 ご指示）。字幕の帯はないので、下まで使える
 "c35": (45, (0, 0, 1280, 720), (455, 120, 905, 580)),   # BCDと、前を留めている手元（10/8 ご指示のスクショに合わせる）
 "c37": (37, (0, 0, 1280, 595), (300, 60, 1000, 560)),
 "c38": (38, (0, 0, 1280, 575), (290, 60, 1000, 575)),
 "c39": (39, (0, 0, 1280, 575), (320, 40, 940, 575)),
 "c40": (40, (0, 0, 1280, 595), (290, 60, 930, 590)),
 "c41": (41, (0, 0, 1280, 540), (300, 60, 960, 540)),
 # 1ページ目の道具の写真（器材だけが写っている画面から）
 "tank": (2, (770, 190, 975, 530), (822, 202, 922, 482)),
 "bc": (2, (15, 190, 625, 530), (150, 198, 465, 515)),
 "belt": (31, (655, 190, 1265, 530), (688, 218, 1222, 437)),
}

MARK = {
 "c11": [(440, 165, 78, "銀色金具ぐるぐる", "tr")],
 # 2-2：銀色金具の上に出ている、黒いでっぱり（白い帯の入ったつまみ。x 600〜632・y 192〜218）を囲む（10/8 ご指示）
 "c10": [(617, 205, 24, "銀色金具ぐるぐる", "tr")],
 # 3-3：手で回している黒いつまみがタンクくるくる（上のギザギザは銀色金具ぐるぐるなので、まちがえないよう印を付ける）
 "c24": [(512, 364, 70, "タンクくるくる", "tl")],
}
# 長方形で囲むもの（左上x, 左上y, 右下x, 右下y。1280x720 の画面での位置）。10/8 ご指示（スクショに手で囲んでもらった場所）
RED = (249, 54, 18)            # #f93612：2-1 の動画の赤い丸と同じ色。囲み・丸・矢印・✕は、全部この色にそろえる（10/8 ご指示）
# 赤い囲みの線の太さ（紙の上の mm）。2-1 の動画の赤い丸を紙の上で測ると 2.2mm なので、全部これにそろえる（10/8 ご指示）
LINE_MM = 2.2
# 印の形は、動画にもともと描かれている赤い丸（1-3・2-1）に合わせて、全部「丸（だ円）」にそろえる（10/8 ご指示）
# 下の MARKR・MARKQ・MARK は「囲みたい物の範囲」。丸はその範囲を、すき間を少しとって外から囲む（OV 倍）
OV = 1.2
# 1-3 の動画の赤い丸は細い（約1mm）。同じ場所に、同じ色の 2.2mm の丸を上から描き直して、太さをそろえる
# （中心x, 中心y, 横の半径, 縦の半径, 色）。半径は、もとの丸の線のまん中の位置
MARKE = {"c06": [(518, 172.5, 114.5, 105, RED)]}
# ななめの四角（中心x, 中心y, 長さ, 幅, 角度[度・反時計回り]）。ホースの向きに合わせて傾ける（10/8 ご指示）
MARKQ = {"c44": [(612, 281, 205, 72, 12.5)],             # 2-4：カチカチホースとL字サインホースのつなぎ目
         # 1-2：上のベルト（四角い留め具つき）と、下のベルト（銀色の留め具）。どちらも右上がりなので、ベルトに合わせて傾ける（10/8 ご指示）
         "c05": [(447, 178, 112, 40, 6), (440, 320, 128, 50, 11)],
         # 2-5：ストラップの金具。金具は少し右に傾いた縦長なので、丸も金具の向きに合わせて傾ける（写真のはしからはみ出さないように）
         "strap": [(650, 360, 480, 175, 80.7)]}
MARKR = {
 "c27":   [(932, 248, 1102, 352)],                         # 4-2：L字サインホースの先を持っている手（持ち方）
 "cap":   [(500, 155, 552, 205)],                          # 1-1：手に持っている黒いキャップ
 "c04":   [(398, 125, 452, 178)],                          # 1-1：タンクくるくる（黒いつまみ）
 "twist": [(405, 290, 545, 380)],                          # 2-5：ホースを手でたどっているところ
 "c19":   [(888, 445, 992, 505)],                          # 3-1：手に持っている残圧計
}
# 写真に書きこむ文字は、PDFのタグ（.tag：「全回転で止める！」など）と同じ見た目にする。
# 同じフォント・同じ大きさ（紙の上で14pt）・同じ余白・同じ色で描く。数値は .tag のCSSと合わせること。
FONT = "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"  # PDFの札と同じ Noto Sans JP
PX_MM = 96 / 25.4              # CSS px / mm
TAG = dict(size_pt=14, pad_x_mm=3, pad_y_mm=.6, radius_mm=1.6, outline_mm=.5, line_h=1.266, inset_mm=1.6)

def mark(im, key, box, sx, sy, ppx):
    """ppx = 写真1pxあたりではなく、CSS 1px が写真の何pxにあたるか"""
    import math
    from PIL import Image, ImageDraw, ImageFont
    if key not in MARK and key not in MARKR and key not in MARKE and key not in MARKQ: return im
    d = ImageDraw.Draw(im)
    x0, y0 = box[0], box[1]
    k = im.size[0] / ((box[2] - box[0]) * sx)
    mm = PX_MM * ppx
    f = ImageFont.truetype(FONT, round(TAG["size_pt"] * 96 / 72 * ppx))
    fs = TAG["size_pt"] * 96 / 72 * ppx
    for qcx, qcy, ql, qw, qa in MARKQ.get(key, []):
        # 傾けない四角を別の透明な紙に描いて、中心で回してから重ねる（角の丸みも、ほかの四角と同じにするため）
        w = max(3, round(LINE_MM * mm))
        L, Wd = ql * sx * k + 2 * w, qw * sy * k + 2 * w
        side = int(math.hypot(L, Wd)) + 4
        lay = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        L, Wd = L * OV, Wd * OV
        side = int(max(L, Wd)) + 4
        lay = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        ImageDraw.Draw(lay).ellipse(((side - L) / 2, (side - Wd) / 2, (side + L) / 2, (side + Wd) / 2), outline=RED + (255,), width=w)
        lay = lay.rotate(qa, resample=Image.BICUBIC)
        X, Y = (qcx - x0) * sx * k, (qcy - y0) * sy * k
        im.paste(lay, (round(X - side / 2), round(Y - side / 2)), lay)
    for ecx, ecy, erx, ery, col in MARKE.get(key, []):
        w = max(3, round(LINE_MM * mm))
        X, Y = (ecx - x0) * sx * k, (ecy - y0) * sy * k
        RX, RY = erx * sx * k, ery * sy * k
        d.ellipse((X - RX - w / 2, Y - RY - w / 2, X + RX + w / 2, Y + RY + w / 2), outline=col, width=w)
    for rx0, ry0, rx1, ry1, *ov in MARKR.get(key, []):
        ov = ov[0] if ov else OV
        # 長方形の囲み：線の太さ・角の丸み・色は、四角の囲みと同じ
        w = max(3, round(LINE_MM * mm))
        # 線は、囲むものの外がわに引く（太い線が中身にかぶって、囲んだ物が見えなくならないように。10/8）
        ex, ey = ((rx0 + rx1) / 2 - x0) * sx * k, ((ry0 + ry1) / 2 - y0) * sy * k
        ax, ay = (rx1 - rx0) / 2 * sx * k * ov + w, (ry1 - ry0) / 2 * sy * k * ov + w
        d.ellipse((ex - ax, ey - ay, ex + ax, ey + ay), outline=RED, width=w)
    for cx, cy, r, text, side in MARK.get(key, []):
        X, Y, R = (cx - x0) * sx * k, (cy - y0) * sy * k, r * sx * k
        w = max(3, round(LINE_MM * mm))  # 線の太さは、紙の上で 2-1 の赤い丸と同じ（10/8 ご指示）
        # 印は四角にそろえる（PDFの番号の札・名札の印と同じ形。10/7 ご指示）
        R2 = R * OV + w
        d.ellipse((X - R2, Y - R2, X + R2, Y + R2), outline=RED, width=w)  # 線は外がわに
        continue  # 名前の札は描かない（PDF側で写真の下に書く）
        tw = d.textlength(text, font=f)
        bw = tw + 2 * TAG["pad_x_mm"] * mm
        bh = fs * TAG["line_h"] + 2 * TAG["pad_y_mm"] * mm
        ins = TAG["inset_mm"] * mm
        if side == "tr":
            bx, by = im.size[0] - bw - ins, ins
            lx, ly = bx, by + bh
            a = math.atan2(ly - Y, lx - X)
            e = R / max(abs(math.cos(a)), abs(math.sin(a)))  # 四角のふちから線を出す
            d.line((X + e * math.cos(a), Y + e * math.sin(a), lx, ly), fill=RED, width=w)
        elif side == "tl":
            # 左上に札を置く（右上だと、線が上のギザギザ＝銀色金具ぐるぐるの近くを通って、まぎらわしいため）
            bx, by = ins, ins
            lx, ly = bx + bw, by + bh
            a = math.atan2(ly - Y, lx - X)
            e = R / max(abs(math.cos(a)), abs(math.sin(a)))  # 四角のふちから線を出す
            d.line((X + e * math.cos(a), Y + e * math.sin(a), lx, ly), fill=RED, width=w)
        elif side == "r": bx, by = X + R + w * 2, Y - bh / 2
        else: bx, by = X - bw / 2, Y + R + w * 2
        bx = min(max(bx, ins), im.size[0] - bw - ins); by = min(max(by, ins), im.size[1] - bh - ins)
        o = TAG["outline_mm"] * mm
        d.rounded_rectangle((bx - o, by - o, bx + bw + o, by + bh + o), radius=TAG["radius_mm"] * mm + o, fill=(255, 255, 255))
        d.rounded_rectangle((bx, by, bx + bw, by + bh), radius=TAG["radius_mm"] * mm, fill=RED)
        d.text((bx + TAG["pad_x_mm"] * mm, by + bh / 2), text, font=f, fill=(255, 255, 255), anchor="lm")
    return im

def load(frame):
    if frame == 45:
        # あとから送ってもらった、BCDの前側を留めている正面の画面（左右の黒い帯を落とす）
        im = Image.open(os.path.join(UP, "79b8fd86-image.png")).convert("RGB")
        w, h = im.size
        return im.crop((round(w * 180 / 2000), 0, round(w * 1820 / 2000), h))
    if frame == 44:
        # あとから送ってもらった、カチカチホースをL字サインホースに付ける画面
        # （ほかの画面と同じく、左右の黒い帯を落として動画の部分だけにする）
        im = Image.open(os.path.join(UP, "fdc27f76-image.png")).convert("RGB")
        w, h = im.size
        return im.crop((round(w * 180 / 2000), 0, round(w * 1820 / 2000), h))
    if frame == 43:
        # あとから送ってもらった、ストラップにオクトをかけた写真（1280x720 にそろえる）
        # 元の写真はオクトが上向きなので、180度回して「下向き」に見せる（2-5の「下向きに！」に合わせる）
        im = Image.open(os.path.join(UP, "b085f95f-image.jpg")).convert("RGB").rotate(180)
        w, h = im.size; ch = round(w * 720 / 1280)
        return im.crop((0, (h - ch) // 2, w, (h - ch) // 2 + ch)) if ch <= h else im
    if frame == 42:
        # あとから送ってもらった「ねじれの確認」の画面（動画の部分だけを切り出す）
        im = Image.open(os.path.join(UP, "55f92f27-image.png")).convert("RGB")
        k = im.size[0] / 2000  # 座標は 2000px 幅で測ったもの
        return im.crop(tuple(round(v * k) for v in (432, 70, 1568, 709)))
    im = Image.open(os.path.join(UP, f"{IDS[frame-1]}-image.png")).convert("RGB")
    w, h = im.size
    l, r = round(w * 180 / 2000), round(w * 1820 / 2000)
    im = im.crop((l, 0, r, h))  # 動画の部分だけ（高画質のまま）
    if frame == 6:
        # 1-3 の動画の赤い丸と矢印は、2-1 の丸より少し赤みが強い。2-1 と同じ色にぬり直す（10/8 ご指示：色も統一）
        px = im.load(); W, H = im.size
        for y in range(H):
            for x in range(W):
                r, g, b = px[x, y]
                if r > 150 and r - g > 90 and r - b > 90:
                    t = min(1.0, (r - max(g, b)) / 230)   # どれくらい「赤い線」か（ふちのにじみは少しだけ）
                    px[x, y] = tuple(round(c0 * (1 - t) + c1 * t) for c0, c1 in zip((r, g, b), RED))
    if frame == 7:
        # 1-3の「低すぎ」は、上の写真と同じ位置・大きさに合わせると、元の枠より上まで切ることになる。
        # 低すぎの写真のBCDの上は白い壁なので、枠より上（見出しの字やオレンジの線）を白でうめる（10/8：BCDのふちを見切らないため）
        from PIL import ImageDraw
        k = im.size[0] / 1280
        ImageDraw.Draw(im).rectangle((round(652 * k), 0, round(1262 * k), round(194 * k)), fill=(255, 255, 255))
    return im

PAD = 0.06
def aspect_range(key):
    """この写真を切り抜ける縦横比の範囲（見せたい部分を切らずに済む範囲）"""
    _, (ax0, ay0, ax1, ay1), (fx0, fy0, fx1, fy1) = F[key]
    fw, fh = (fx1 - fx0) * (1 + 2 * PAD), (fy1 - fy0) * (1 + 2 * PAD)
    return fw / (ay1 - ay0), (ax1 - ax0) / fh

def box_for(allowed, focus, aspect, pad=PAD):
    """focusを少し余白つきで含み、縦横比がaspectで、allowedからはみ出さない、いちばん小さい枠"""
    ax0, ay0, ax1, ay1 = allowed
    fx0, fy0, fx1, fy1 = focus
    fw, fh = fx1 - fx0, fy1 - fy0
    fw2, fh2 = fw * (1 + 2 * pad), fh * (1 + 2 * pad)
    w = max(fw2, fh2 * aspect)
    h = w / aspect
    # allowed に入りきらないときは、入る大きさまで縮める（そのときは余白から削る）
    if w > ax1 - ax0: w = ax1 - ax0; h = w / aspect
    if h > ay1 - ay0: h = ay1 - ay0; w = h * aspect
    cx, cy = (fx0 + fx1) / 2, (fy0 + fy1) / 2
    x0 = min(max(cx - w / 2, ax0), ax1 - w)
    y0 = min(max(cy - h / 2, ay0), ay1 - h)
    return x0, y0, x0 + w, y0 + h, (w + 0.5 >= fw and h + 0.5 >= fh)

if __name__ == "__main__":
    # 使い方: python3 focus.py <sizes.json> <出力ディレクトリ>
    sizes = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    warn = []
    ROT = {"belt"}  # 重りは横に長いので、90度回して縦長にする（左右のいらない部分を減らし、ベルト自体を大きく見せる。10/7 ご指示）
    for slot, (key, w, h) in sizes.items():
        frame, allowed, focus = F[key]
        rot = key in ROT
        if rot: w, h = h, w
        pad_to = None
        if key in PAD_OK:
            # 切り抜ける幅の上限までで切り、足りないぶんは、あとで左右をうめる
            fh = (focus[3] - focus[1]) * (1 + 2 * PAD)
            a_fit = min(w / h, (allowed[2] - allowed[0]) / fh)
            x0, y0, x1, y1, ok = box_for(allowed, focus, a_fit)
            if a_fit < w / h - 0.01: pad_to = w / h
        else:
            x0, y0, x1, y1, ok = box_for(allowed, focus, w / h)
        if not ok: warn.append(f"{slot}: 見せたい部分が枠に入りきらない")
        src = load(frame)
        sx, sy = src.size[0] / 1280, src.size[1] / 720
        im = src.crop((round(x0 * sx), round(y0 * sy), round(x1 * sx), round(y1 * sy)))
        # 紙の上で 300dpi 相当まで（元の画質より大きくはしない）
        tw = min(im.size[0], round(w / 96 * 300))
        if pad_to:
            # 足りない左右を、写真のふちの色でうめて、枠の形に合わせる（器材は切らない）
            from PIL import ImageStat
            ih = im.size[1]; cw = round(ih * pad_to)
            edge = [tuple(int(v) for v in ImageStat.Stat(im.crop((0, 0, 8, ih))).median),
                    tuple(int(v) for v in ImageStat.Stat(im.crop((im.size[0] - 8, 0, im.size[0], ih))).median)]
            # うめる部分は、写真の左右のふちの色を、行ごとに平均してなめらかにしたもの（壁と地面の境目もつながる）
            from PIL import ImageFilter
            ox = (cw - im.size[0]) // 2
            n = 12
            edge = Image.new("RGB", (2 * n, ih))
            edge.paste(im.crop((0, 0, n, ih)), (0, 0)); edge.paste(im.crop((im.size[0] - n, 0, im.size[0], ih)), (n, 0))
            col = edge.resize((1, ih), Image.BOX).filter(ImageFilter.GaussianBlur(ih / 40)).resize((cw, ih))
            canvas = col.copy()
            # 写真のふちを、少しずつ背景になじませる
            mask = Image.linear_gradient("L").rotate(90, expand=True).resize((40, ih))
            canvas.paste(im, (ox, 0))
            canvas.paste(col.crop((ox, 0, ox + 40, ih)), (ox, 0), mask.transpose(Image.FLIP_LEFT_RIGHT))
            canvas.paste(col.crop((ox + im.size[0] - 40, 0, ox + im.size[0], ih)), (ox + im.size[0] - 40, 0), mask)
            im = canvas
        im = im.resize((tw, round(tw * h / w)), Image.LANCZOS)
        if rot: im = im.rotate(90, expand=True)
        im = mark(im, key, (x0, y0, x1, y1), sx, sy, im.size[0] / w)
        im.save(os.path.join(out, f"{slot}.jpg"), quality=88)
    print("\n".join(warn) if warn else "all focus fit")
