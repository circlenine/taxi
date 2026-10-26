# スーツ編の写真の切り抜き（10/24）。focus_s.py（洗浄編）をもとにした。写真は /tmp/claude-0/kfw/ のコマ（README に取り方）
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
PAD_OK = set()
# key: (画面の番号, allowed, focus)
F = {
 # スーツ編（10/24 作り直し）：まーく様の画面収録5本から取ったコマ（/tmp/claude-0/kfw2/<key>.jpg、1920x1080。取り方は kfw2/list2.txt）
 # 座標は 1280x720 に直したもの。allowed は、動画の字幕・左上の題・右上のロゴ・右下の小窓が入らない範囲
 # ocean_a（o_・do_）は、左上の題（y60まで）と右上のロゴがあるので、上は y65 から
 # しくみ
 "p_seal":   ("p_seal",   (0, 0, 980, 530),    (380, 60, 940, 520)),
 "o_fold":   ("o_fold", (0, 110, 1280, 600), (300, 110, 1100, 560)),
 "o_zip2":   ("o_zip2", (380, 70, 1280, 440), (420, 70, 1100, 435)),   # 左上の題（x370まで）の右側だけ使うので、上は y70 から
 "b_held2":  ("b_held2",  (120, 140, 960, 600), (180, 150, 800, 595)),
 "do_valve": ("do_valve", (0, 110, 1280, 490), (500, 110, 1000, 485)),
 "b_uw":     ("b_uw",     (0, 0, 1280, 560),   (260, 120, 1200, 550)),
 # 着る前に
 "r_in":     ("r_in",     (0, 60, 1280, 515),  (480, 100, 800, 510)),
 "o_sock":   ("o_sock", (0, 110, 1280, 500), (420, 110, 900, 495)),
 "b_group":  ("b_group",  (0, 0, 1280, 545),   (100, 100, 1000, 540)),
 "o_hair":   ("o_hair", (0, 110, 1280, 500), (380, 110, 1000, 495)),
 # ウェットを着る
 "d_fold2":  ("d_fold2",  (0, 0, 1280, 550),   (440, 120, 780, 545)),
 "d_knee":   ("d_knee",   (0, 0, 1280, 550),   (420, 80, 820, 545)),
 "d_heel":   ("d_heel",   (0, 0, 1280, 560),   (380, 40, 960, 555)),
 "d_pad":    ("d_pad",    (0, 0, 1280, 555),   (500, 60, 960, 550)),
 "r_hip":    ("r_hip",    (520, 60, 1280, 720), (600, 100, 860, 700)),
 "r_wrist":  ("r_wrist",  (0, 60, 1280, 525),  (200, 250, 700, 520)),
 "r_zip2":   ("r_zip2",   (0, 60, 1280, 530),  (300, 60, 800, 525)),
 # ウェットを脱ぐ
 "r_shoulder": ("r_shoulder", (500, 60, 1280, 720), (640, 80, 860, 680)),
 "r_zipoff": ("r_zipoff", (0, 60, 1280, 560),  (300, 100, 800, 555)),
 "wr_off1":  ("wr_off1",  (0, 55, 1280, 470),  (120, 55, 1000, 465)),
 "wr_off2":  ("wr_off2",  (520, 60, 1280, 710), (600, 180, 830, 700)),
 "r_wash":   ("r_wash",   (0, 60, 1280, 595),  (420, 60, 1020, 590)),
 "r_shade":  ("r_shade",  (0, 60, 1280, 720),  (480, 100, 820, 700)),
 # ドライを着る①
 "do_seal":  ("do_seal", (0, 110, 1280, 490), (430, 130, 990, 485)),
 "do_zipc":  ("do_zipc", (0, 110, 1280, 440), (330, 110, 1240, 435)),
 "o_inv":    ("o_inv", (380, 110, 1280, 610), (480, 110, 800, 600)),
 "o_leg":    ("o_leg", (0, 110, 1280, 515), (280, 110, 920, 510)),
 "p_waist":  ("p_waist",  (0, 0, 1100, 555),   (480, 150, 820, 550)),
 "do_susp":  ("do_susp", (400, 110, 960, 490), (520, 110, 900, 485)),
 "o_wrist":  ("o_wrist", (0, 110, 1280, 530), (400, 110, 980, 525)),
 "p_bone":   ("p_bone",   (0, 0, 1280, 530),   (420, 0, 1000, 525)),
 # ドライを着る②
 "o_neck":   ("o_neck", (0, 110, 1280, 500), (300, 110, 1200, 495)),
 "p_nfold":  ("p_nfold",  (0, 0, 970, 610),    (300, 0, 960, 600)),
 "p_zipc":   ("p_zipc",   (0, 0, 970, 550),    (300, 150, 960, 545)),
 "do_zip2":  ("do_zip2", (0, 110, 1280, 450), (150, 110, 1150, 445)),
 # 潜る
 "do_squat": ("do_squat", (400, 110, 1280, 450), (520, 110, 1080, 445)),
 "bc_under": ("bc_under", (0, 0, 1280, 560),   (380, 40, 1280, 555)),
 "bc_arm":   ("bc_arm",   (0, 0, 1280, 560),   (300, 60, 1100, 555)),
 "bc_feet":  ("bc_feet",  (0, 0, 1280, 490),   (650, 130, 1000, 485)),
 # ドライを脱ぐ
 "o_wash":   ("o_wash", (0, 110, 1280, 525), (420, 110, 980, 520)),
 "o_zipopen": ("o_zipopen", (0, 110, 1280, 535), (520, 110, 1000, 530)),
 "o_head":   ("o_head", (0, 110, 1280, 530), (300, 110, 1000, 525)),
 "do_armoff": ("do_armoff", (395, 110, 960, 480), (400, 110, 800, 475)),
 "o_susoff": ("o_susoff", (0, 110, 1280, 615), (200, 110, 850, 610)),
 "p_step":   ("p_step",   (0, 0, 970, 610),    (400, 0, 880, 605)),
 "o_neck2":  ("o_neck2",  (380, 70, 1280, 590),  (420, 70, 1240, 585)),
 "o_armoff2": ("o_armoff2", (300, 110, 1280, 450), (330, 110, 1000, 445)),
 "b_bcdx":   ("b_bcdx",   (0, 0, 1280, 560),   (230, 60, 1000, 555)),
}

MARK = {
 # 10/24 作り直し：やっている場所に赤丸（中心x, 中心y, 半径, 写真に書く名前, 名前を置く場所）。名前が空なら丸だけ
 "p_seal":  [(690, 255, 75, "", "")],
 "o_fold":  [(640, 420, 85, "", "")],
 "o_zip2":  [(720, 170, 65, "", "")],
 "b_held2": [(440, 432, 42, "胸：入れる", "l"), (630, 395, 52, "左肩：抜く", "t")],
 "do_valve": [(750, 330, 120, "", "")],
 "b_uw":    [(770, 300, 60, "左肩", "r")],
 "o_sock":  [(650, 340, 75, "", "")],
 "o_hair":  [(590, 300, 70, "", "")],
 "d_knee":  [(620, 380, 70, "", "")],
 "d_heel":  [(600, 330, 80, "", "")],
 "d_pad":   [(700, 470, 55, "", "")],
 "r_wrist": [(470, 450, 60, "", "")],
 "r_zip2":  [(600, 330, 70, "", "")],
 "do_seal": [(800, 290, 110, "", "")],
 "do_zipc": [(720, 330, 75, "", "")],
 "o_leg":   [(600, 250, 70, "", "")],
 "o_wrist": [(580, 320, 70, "", "")],
 "p_bone":  [(590, 200, 60, "", "")],
 "o_neck2": [(880, 230, 120, "", "")],
 "o_armoff2": [(700, 390, 60, "", "")],
 "b_bcdx":  [(560, 330, 110, "", "")],
 "do_squat": [(765, 270, 55, "", "")],
 "r_zipoff": [(540, 420, 70, "", "")],
 "p_nfold": [(640, 380, 80, "", "")],
 "p_zipc":  [(500, 320, 70, "", "")],
 "do_zip2": [(770, 360, 60, "", "")],
 "p_step":  [(660, 500, 70, "", "")],
}
# 長方形で囲むもの（左上x, 左上y, 右下x, 右下y。1280x720 の画面での位置）。10/8 ご指示（スクショに手で囲んでもらった場所）
RED = (249, 54, 18)            # #f93612：2-1 の動画の赤い丸と同じ色。囲み・丸・矢印・✕は、全部この色にそろえる（10/8 ご指示）
# 赤い囲みの線の太さ（紙の上の mm）。2-1 の動画の赤い丸を紙の上で測ると 2.2mm なので、全部これにそろえる（10/8 ご指示）
LINE_MM = 2.2
# 印のすけぐあい（1＝すけない）。写真が見えて、印もはっきり分かる強さ（10/13 ご指示）
MARK_ALPHA = 0.8
# 印の形は、動画にもともと描かれている赤い丸（1-3・2-1）に合わせて、全部「丸（だ円）」にそろえる（10/8 ご指示）
# 下の MARKR・MARKQ・MARK は「囲みたい物の範囲」。丸はその範囲を、すき間を少しとって外から囲む（OV 倍）
OV = 1.2
# 1-3 の動画の赤い丸は細い（約1mm）。同じ場所に、同じ色の 2.2mm の丸を上から描き直して、太さをそろえる
# （中心x, 中心y, 横の半径, 縦の半径, 色）。半径は、もとの丸の線のまん中の位置
MARKE = {}
# ななめの四角（中心x, 中心y, 長さ, 幅, 角度[度・反時計回り]）。ホースの向きに合わせて傾ける（10/8 ご指示）
MARKQ = {}        # 2-1：カチカチホースの先（左手）から、つなぎ口（右手）まで。まーく様が描いてくれた形（10/13）。上の蛇腹は入れない
MARKR = {}
# 「空気がプシュッと出ている」しるし（丸ではなく、口から外へ広がる3本の線。10/13 ご指示）
# （出どころx, 出どころy, 向き[度・上が90], 線の始まりまでの長さ, 線の終わりまでの長さ）
MARKP = {}
# 1-3：Oリングのふちから、キャップのほうへ、内から外へ少し広がる3本の線（空気が出ている感じ。10/13 まーく様の絵のとおり）
# （始まりx, 始まりy, 終わりx, 終わりy）。線は丸にくっつけない
MARKL = {}   # 10/13 ご指摘：線が短くて見づらい → 長くする（丸にはかぶせない）   # 3本とも、Oリングのまん中から放射状に、右上のキャップへ向ける（10/13 ご指示：横向きではなく、キャップに当たる向き）
# 「空気が当たっている」しるし（まわりに広がる短い線。10/13）
# （中心x, 中心y, 線の始まりまでの長さ, 線の終わりまでの長さ, 線の向き[度・上が90]）
MARKS = {}
# 「💨」の形（10/13 ご指示：空気がプシュッと出ている形。✳ ではない）
# Oリングの口から、キャップのほうへ、流れの線3本＋その先のもくもく（雲）
# （出口x, 出口y, 向き[度・上が90], 線の長さ, 線の間・雲の大きさ, 雲を描くか）
# 1-3：空気は、Oリングの口から、手に持ったキャップのほうへ出る（10/13 ご指摘：左向きはまちがい。空気がそっちへ出るわけがない）
#      線の先はすぐキャップなので、雲は描かず、キャップへ向かう流れの線3本だけにする
MARKW = {}   # Oリングのまん中から、右上のキャップへ。この向きでOK（10/13 ご確認）。線は丸にくっつけない
# 写真に書きこむ文字は、PDFのタグ（.tag：「全回転で止める！」など）と同じ見た目にする。
# 同じフォント・同じ大きさ（紙の上で14pt）・同じ余白・同じ色で描く。数値は .tag のCSSと合わせること。
FONT = "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"  # PDFの札と同じ Noto Sans JP
PX_MM = 96 / 25.4              # CSS px / mm
TAG = dict(size_pt=14, pad_x_mm=3, pad_y_mm=.6, radius_mm=1.6, outline_mm=.5, line_h=1.266, inset_mm=1.6)

# 丸（印）が写真のなるべく真ん中に来るように、見せたい範囲の中心を、印の中心に合わせる（10/14 ご指示：〇の位置はなるべく中央に）
# 範囲の大きさは今のまま。字幕や画面のはしで、これ以上動かせないときは、切り抜く側（box_for）が止める
def _mark_center(k):
    pts = []
    for cx, cy, *_ in MARK.get(k, []): pts.append((cx, cy))
    for x0, y0, x1, y1, *_ in MARKR.get(k, []): pts.append(((x0 + x1) / 2, (y0 + y1) / 2))
    for cx, cy, *_ in MARKQ.get(k, []): pts.append((cx, cy))
    for cx, cy, *_ in MARKE.get(k, []): pts.append((cx, cy))
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)) if pts else None
for _k in []:
    _c = _mark_center(_k)
    if not _c or _k in ("s11",): continue
    _fr, _al, (_a, _b, _cc, _d) = F[_k]
    _w, _h = _cc - _a, _d - _b
    F[_k] = (_fr, _al, (_c[0] - _w / 2, _c[1] - _h / 2, _c[0] + _w / 2, _c[1] + _h / 2))

def mark(im, key, box, sx, sy, ppx):
    """ppx = 写真1pxあたりではなく、CSS 1px が写真の何pxにあたるか"""
    import math
    from PIL import Image, ImageDraw, ImageFont
    if key not in MARK and key not in MARKR and key not in MARKE and key not in MARKQ and key not in MARKP and key not in MARKS and key not in MARKW and key not in MARKL: return im
    # 印は、透明な紙に描いてから、少しすかして写真に重ねる（10/13 ご指示：写真も印も見やすいように）
    base = im
    im = Image.new("RGBA", base.size, (0, 0, 0, 0))
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
    for px_, py_, pa, r0, r1 in MARKP.get(key, []):
        # 3本の線を、少しずつ向きを変えて引く（まん中の1本がいちばん長い）。線の太さは丸と同じ
        w = max(3, round(LINE_MM * mm))
        for da, ln in ((-38, 0.75), (0, 1.0), (38, 0.75)):   # 線どうしを離して、口から外へ広がって見えるように（矢印に見えないように）
            a = math.radians(pa + da)
            ax_, ay_ = math.cos(a), -math.sin(a)
            X0, Y0 = (px_ + ax_ * r0 - x0) * sx * k, (py_ + ay_ * r0 - y0) * sy * k
            X1, Y1 = (px_ + ax_ * (r0 + (r1 - r0) * ln) - x0) * sx * k, (py_ + ay_ * (r0 + (r1 - r0) * ln) - y0) * sy * k
            d.line((X0, Y0, X1, Y1), fill=RED, width=w)
            for X, Y in ((X0, Y0), (X1, Y1)):   # 線の両はしを丸くする
                d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
    for lx0, ly0, lx1, ly1 in MARKL.get(key, []):
        w = max(3, round(LINE_MM * mm * 0.45))   # Oリングとキャップの間がせまいので、細めの線にする（太いと線がつぶれて、かたまりに見える）
        X0, Y0 = (lx0 - x0) * sx * k, (ly0 - y0) * sy * k
        X1, Y1 = (lx1 - x0) * sx * k, (ly1 - y0) * sy * k
        d.line((X0, Y0, X1, Y1), fill=RED, width=w)
        for X, Y in ((X0, Y0), (X1, Y1)): d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
    for wx, wy, wa, wl, wc, cloud in MARKW.get(key, []):
        w = max(3, round(LINE_MM * mm * 0.65))   # 線どうしがくっついて、ひとかたまりに見えないよう、丸より少し細く
        a = math.radians(wa); ux, uy = math.cos(a), -math.sin(a); nx, ny = -uy, ux
        P = lambda X, Y: ((X - x0) * sx * k, (Y - y0) * sy * k)
        # 流れの線3本（間をあけて、長さを変える。矢印に見えないように）
        for off, st, ln in (((-wc * 1.3, .15, .55), (0, 0, .75), (wc * 1.3, .25, .5)) if cloud else ((-wc * 1.4, .1, .8), (0, 0, 1.0), (wc * 1.4, .1, .8))):
            bx, by = wx + nx * off + ux * wl * st, wy + ny * off + uy * wl * st
            X0, Y0 = P(bx, by); X1, Y1 = P(bx + ux * wl * ln, by + uy * wl * ln)
            d.line((X0, Y0, X1, Y1), fill=RED, width=w)
            for X, Y in ((X0, Y0), (X1, Y1)): d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
        # 線の先の、もくもく（白い雲に赤いふち。丸を3つ重ねる）
        if not cloud: continue
        cx_, cy_ = wx + ux * (wl * .8 + wc), wy + uy * (wl * .8 + wc)
        cl = [(-wc * .8, -wc * .1, .8), (wc * .8, -wc * .1, .8), (0, wc * .5, 1.0)]
        R0 = lambda rr: wc * rr * sx * k
        for off, fw, rr in cl:   # ふち（赤）を先に、少し大きく
            X, Y = P(cx_ + nx * off + ux * fw, cy_ + ny * off + uy * fw); R = R0(rr) + w
            d.ellipse((X - R, Y - R, X + R, Y + R), fill=RED)
        for off, fw, rr in cl:   # 中（白）を上から
            X, Y = P(cx_ + nx * off + ux * fw, cy_ + ny * off + uy * fw); R = R0(rr)
            d.ellipse((X - R, Y - R, X + R, Y + R), fill=(255, 255, 255))
    for scx, scy, r0, r1, angs in MARKS.get(key, []):
        w = max(3, round(LINE_MM * mm))
        for ang in angs:
            a = math.radians(ang)
            X0, Y0 = (scx + math.cos(a) * r0 - x0) * sx * k, (scy - math.sin(a) * r0 - y0) * sy * k
            X1, Y1 = (scx + math.cos(a) * r1 - x0) * sx * k, (scy - math.sin(a) * r1 - y0) * sy * k
            d.line((X0, Y0, X1, Y1), fill=RED, width=w)
            for X, Y in ((X0, Y0), (X1, Y1)): d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
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
        if not text: continue  # 名前が空のときは丸だけ（名前は写真の下に書く）。10/24 スーツ編：しくみの写真だけ、写真の上にも書く
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
        elif side == "r": bx, by = X + R2 + w, Y - bh / 2
        elif side == "l": bx, by = X - R2 - w - bw, Y - bh / 2
        elif side == "t": bx, by = X - bw / 2, Y - R2 - w - bh
        else: bx, by = X - bw / 2, Y + R + w * 2
        bx = min(max(bx, ins), im.size[0] - bw - ins); by = min(max(by, ins), im.size[1] - bh - ins)
        o = TAG["outline_mm"] * mm
        d.rounded_rectangle((bx - o, by - o, bx + bw + o, by + bh + o), radius=TAG["radius_mm"] * mm + o, fill=(255, 255, 255))
        d.rounded_rectangle((bx, by, bx + bw, by + bh), radius=TAG["radius_mm"] * mm, fill=RED)
        d.text((bx + TAG["pad_x_mm"] * mm, by + bh / 2), text, font=f, fill=(255, 255, 255), anchor="lm")
    a = im.getchannel("A").point(lambda v: round(v * MARK_ALPHA))
    im.putalpha(a)
    out = base.convert("RGBA"); out.alpha_composite(im)
    return out.convert("RGB")

def load(frame):
    return Image.open(os.path.join("/tmp/claude-0/kfw2", frame + ".jpg")).convert("RGB")

PAD = 0.06
def aspect_range(key):
    """この写真を切り抜ける縦横比の範囲（見せたい部分を切らずに済む範囲）"""
    _, (ax0, ay0, ax1, ay1), (fx0, fy0, fx1, fy1) = F[key]
    fw, fh = (fx1 - fx0) * (1 + 2 * PAD), (fy1 - fy0) * (1 + 2 * PAD)
    return fw / (ay1 - ay0), (ax1 - ax0) / fh

PAIRK = {"nghi", "nglo"}   # 重ねて比べる写真（1-3 の高すぎ・低すぎ）
def box_for(allowed, focus, aspect, pad=PAD, zoom=True):
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
    # 10/20 まーく様「器材が上に寄っていて、中央にきていない」→ 写したいものは、写真のまん中に置く。
    #   画面のはしに当たってまん中に置けないときは、同じ形のまま少し寄って（小さく切って）まん中に置く。
    #   寄っても、写したいもの（余白なし）が全部入るときだけ寄る。入らないときは、いままでどおり（あとで知らせる）
    hw, hh = min(cx - ax0, ax1 - cx), min(cy - ay0, ay1 - cy)
    sc = min(1.0, 2 * hw / w, 2 * hh / h)
    if zoom and sc < 1.0 and w * sc + 0.5 >= fw and h * sc + 0.5 >= fh:
        w, h = w * sc, h * sc
    x0 = min(max(cx - w / 2, ax0), ax1 - w)
    y0 = min(max(cy - h / 2, ay0), ay1 - h)
    # 10/20 写したいものが、写真のまん中から ずれていないか（画面のはしに当たって、まん中に置けないとき）。あとでまとめて知らせる
    _dx, _dy = (x0 + w / 2 - cx) / w, (y0 + h / 2 - cy) / h
    if abs(_dx) > .04 or abs(_dy) > .04: OFFC.append((focus, round(_dx * 100), round(_dy * 100)))
    return x0, y0, x0 + w, y0 + h, (w + 0.5 >= fw and h + 0.5 >= fh)
OFFC = []

if __name__ == "__main__":
    # 使い方: python3 focus.py <sizes.json> <出力ディレクトリ>
    sizes = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    warn = []
    BADGE = {}
    ROT = {"belt"}  # 重りは横に長いので、90度回して縦長にする（左右のいらない部分を減らし、ベルト自体を大きく見せる。10/7 ご指示）
    for slot, (key, w, h) in sizes.items():
        frame, allowed, focus = F[key]
        rot = key in ROT
        if rot: w, h = h, w
        pad_to = None; _n0 = len(OFFC)
        if key in PAD_OK:
            # 切り抜ける幅の上限までで切り、足りないぶんは、あとで左右をうめる
            fh = (focus[3] - focus[1]) * (1 + 2 * PAD)
            a_fit = min(w / h, (allowed[2] - allowed[0]) / fh)
            x0, y0, x1, y1, ok = box_for(allowed, focus, a_fit)
            if a_fit < w / h - 0.01: pad_to = w / h
        else:
            x0, y0, x1, y1, ok = box_for(allowed, focus, w / h, zoom=key not in PAIRK)   # 比べる2枚は、同じ切り方のまま（寄せると2枚がずれる）
        if not ok: warn.append(f"{slot}: 見せたい部分が枠に入りきらない")
        if len(OFFC) > _n0: print(f"  まん中からずれ {slot}（{key}）：左右 {OFFC[-1][1]}%・上下 {OFFC[-1][2]}%（画面のはしに当たって、まん中に置けない）")
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
        # 10/21 ▶ の印を置くすみ（見せたい部分・赤い印にかからない所）
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import badgepos as _bp
        _ff = _bp.focus_frac(focus, (x0, y0, x1, y1), pad_to, None, rot) if not isinstance(focus, list) else [0, 0, 0, 0]
        _c, _s, _ = _bp.corners(im, _ff, *( (h, w) if rot else (w, h) )); BADGE[slot] = f"{_c}:{_s}"
        im.save(os.path.join(out, f"{slot}.jpg"), quality=88)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); __import__("badgepos").save(out, BADGE)
    print("\n".join(warn) if warn else "all focus fit")
