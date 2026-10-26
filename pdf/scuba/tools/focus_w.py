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
 # スーツ編（10/26 2回目の全部やり直し）。コマは /tmp/claude-0/kfw4/<key>.jpg（1920x1080）。座標は 1280x720 に直したもの
 #   u..＝海人商店ブログ（World Dive 取扱店）の写真。横長に合わせるため、左右をぼかしで埋めた（写真は x100〜1180）
 #   w_・r..・d_＝動画の画面（kfw4/list4.txt に動画と秒）
 # focus＝説明文が言っている所。赤丸（MARK）は focus の中に入れ、写真の中で十分大きく写るようにする（ringcheck.py で点検）
 # ウェット
 "w_fold":  ("w_fold",  (0, 0, 1280, 600),    (480, 120, 780, 595)),
 "w_heel":  ("w_heel",  (0, 0, 1280, 470),    (380, 180, 820, 465)),
 "w_pad":   ("w_pad",   (0, 0, 1280, 545),    (520, 120, 900, 540)),
 "w_bag":   ("w_bag",   (0, 0, 1280, 545),    (360, 160, 760, 540)),
 "w_zip":   ("w_zip",   (0, 0, 1280, 535),    (480, 100, 860, 530)),
 "r345":    ("r345",    (300, 60, 1280, 560), (440, 60, 920, 555)),
 "w_wash":  ("w_wash",  (300, 60, 1280, 640),  (380, 60, 1000, 635)),
 # しくみ
 "d_cat":   ("d_cat",   (0, 0, 1280, 720),    (0, 0, 1280, 720)),
 "d_catin":  ("d_catin",  (0, 0, 1280, 720),  (200, 330, 560, 660)),
 "d_inval": ("d_inval", (0, 0, 1280, 540),    (240, 30, 1000, 535)),
 "d_catex":  ("d_catex",  (0, 0, 1280, 720),  (780, 180, 1120, 500)),
 "d_auto":  ("d_auto",  (0, 110, 1280, 560),  (300, 110, 1100, 555)),
 "u34":     ("u34",     (100, 0, 1180, 720),  (380, 120, 1140, 715)),
 # 着る前に
 "d_sock":  ("d_sock",  (0, 110, 1280, 525),  (420, 160, 840, 520)),
 "d_seal":  ("d_seal",  (0, 110, 1280, 500),  (280, 110, 1000, 495)),
 "d_valv":  ("d_valv",  (0, 110, 1280, 480),  (480, 160, 960, 475)),
 "d_gel":   ("d_gel",   (0, 0, 980, 540),     (100, 40, 760, 535)),
 # 着方①
 "u04":     ("u04",     (100, 0, 1180, 720),  (380, 60, 1180, 715)),
 "u06":     ("u06",     (100, 0, 1180, 720),  (380, 0, 1000, 715)),
 "u08":     ("u08",     (400, 0, 880, 720),   (420, 200, 860, 715)),
 "u09":     ("u09",     (100, 0, 1180, 720),  (440, 160, 920, 640)),
 "u11":     ("u11",     (100, 0, 1180, 720),  (520, 180, 1000, 640)),
 "u12":     ("u12",     (100, 0, 1180, 720),  (440, 160, 920, 640)),
 # 着方②
 "u15":     ("u15",     (100, 0, 1180, 720),  (380, 200, 900, 600)),
 "u16":     ("u16",     (100, 0, 1180, 720),  (280, 220, 900, 660)),
 "u17":     ("u17",     (100, 0, 1180, 720),  (300, 120, 900, 560)),
 "u19":     ("u19",     (100, 0, 1180, 720),  (360, 160, 960, 715)),
 "u20":     ("u20",     (100, 0, 1180, 720),  (240, 120, 860, 715)),
 "u21":     ("u21",     (100, 0, 1180, 720),  (300, 120, 1000, 600)),
 "u23":     ("u23",     (100, 0, 1180, 720),  (440, 160, 1020, 560)),
 # 潜る
 "d_squat": ("d_squat", (0, 0, 1280, 620),    (360, 180, 920, 615)),
 "b_uw":    ("b_uw",    (0, 0, 1280, 560),   (300, 100, 1200, 555)),
 "d_bcd":   ("d_bcd",   (0, 0, 1280, 560),    (300, 100, 900, 555)),
 # 洗い方・脱ぎ方
 "d_wash":  ("d_wash",  (0, 110, 1280, 500),  (300, 110, 1000, 495)),
 "u27":     ("u27",     (100, 0, 1180, 720),  (440, 160, 1100, 560)),
 "u29":     ("u29",     (100, 0, 1180, 720),  (300, 60, 980, 520)),
 "u30":     ("u30",     (100, 0, 1180, 720),  (380, 100, 900, 600)),
 "u31":     ("u31",     (100, 0, 1180, 720),  (440, 160, 1000, 680)),
 "u33":     ("u33",     (100, 0, 1180, 720),  (440, 40, 1000, 715)),
 "d_heel":  ("d_heel",  (0, 0, 980, 600),     (300, 0, 900, 595)),
}
# 写真 → 元の動画とその秒、または元のページ（写真をタップすると開く）
_YT = {"wet_diver": "DwV0Abnrm9s", "wet_roxy": "8eup5ULd8_U", "dry_ocean": "QtNIOoj7Lp0", "dry_bcd": "NS8OkAwcAJc", "dry_papa": "9IG9z5nAkl0"}
UMI = "https://umikizai.com/blog/2021/10/16/4259"
SRC = {}
for _l in open("/tmp/claude-0/kfw4/list4.txt"):
    _k, _v, _t = _l.split()
    if _v in _YT: SRC[_k] = (_YT[_v], int(_t))
SRC["d_cat"] = SRC["d_catin"] = SRC["d_catex"] = ("https://www.worlddive.co.jp/product/", None)
for _k in F:
    if _k.startswith("u"): SRC[_k] = (UMI, None)

MARK = {
 # 説明文が言っている物の上に赤丸（中心x, 中心y, 半径, 写真に書く名前, 置き場所）。1枚ずつ目で確かめた（10/26）
 # どの物を囲んだかは RINGWHAT に書く。その言葉が、写真の下の説明か手順の題に入っていないと ringcheck.py が止める
 "w_heel":  [(580, 390, 85, "", "")],
 "w_pad":   [(700, 450, 75, "", "")],
 "w_bag":   [(540, 400, 105, "", "")],
 "w_zip":   [(640, 250, 85, "", "")],
 "r345":    [(670, 460, 95, "", "")],
 "d_catin": [(380, 490, 100, "", "")],
 "d_catex": [(950, 340, 100, "", "")],
 "d_auto":  [(620, 340, 150, "", "")],
 "u34":     [(840, 520, 150, "", "")],
 "d_sock":  [(650, 290, 85, "", "")],
 "d_seal":  [(570, 320, 140, "", "")],
 "d_valv":  [(700, 360, 95, "", "")],
 "d_gel":   [(410, 290, 165, "", "")],
 "u04":     [(600, 470, 120, "", ""), (1030, 360, 130, "", "")],
 "u09":     [(585, 384, 85, "", ""), (790, 384, 85, "", "")],
 "u11":     [(770, 390, 150, "", "")],
 "u12":     [(680, 400, 150, "", "")],
 "u15":     [(650, 410, 170, "", "")],
 "u16":     [(590, 450, 200, "", "")],
 "u17":     [(610, 320, 180, "", "")],
 "u19":     [(640, 470, 190, "", "")],
 "u20":     [(540, 420, 200, "", "")],
 "u21":     [(500, 330, 120, "", "")],
 "u23":     [(820, 370, 110, "", "")],
 "d_squat": [(630, 360, 130, "", "")],
 "d_bcd":   [(560, 330, 110, "", "")],
 "b_uw":    [(770, 300, 90, "", "")],
 "u27":     [(740, 340, 110, "", "")],
 "u29":     [(640, 280, 190, "", "")],
 "u30":     [(640, 330, 180, "", "")],
 "u31":     [(780, 420, 150, "", "")],
 "d_heel":  [(640, 520, 70, "", "")],
}
RINGWHAT = {"w_heel": "かかと", "w_pad": "膝", "w_bag": "ビニール袋", "w_zip": "髪", "r345": "肩", "d_catin": "胸", "d_catex": "左肩", "b_uw": "左肩",
 "d_auto": "回して", "u34": "ブーツ", "d_sock": "靴下", "d_seal": "ゴム", "d_valv": "ボタン", "d_gel": "ゴム", "u04": "サスペンダー",
 "u09": "サスペンダー", "u11": "手", "u12": "ゴム", "u15": "首のゴム", "u16": "広げる", "u17": "頭", "u19": "伸ばす", "u20": "内側",
 "u21": "ファスナー", "u23": "ファスナー", "d_squat": "首", "d_bcd": "ホース", "u27": "ファスナー", "u29": "首のゴム", "u30": "あご",
 "u31": "手首", "d_heel": "かかと"}
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
    return Image.open(os.path.join("/tmp/claude-0/kfw4", frame + ".jpg")).convert("RGB")

PAD = 0.06
NOCROP = {"d_cat"}   # サンライズのスーツの図（mkcat.py で作った完成図）
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
    BOXES = {}
    import copy as _cp; _MARK0 = _cp.deepcopy(MARK)
    ROT = {"belt"}  # 重りは横に長いので、90度回して縦長にする（左右のいらない部分を減らし、ベルト自体を大きく見せる。10/7 ご指示）
    for slot, (key, w, h) in sizes.items():
        frame, allowed, focus = F[key]
        if key in _MARK0: MARK[key] = list(_MARK0[key])
        # 10/26 赤丸は、必ず写真の中に全部入れる：見せたい部分を、赤丸（線の外がわまで）を含む大きさに広げる
        for _cx, _cy, _r, *_ in MARK.get(key, []):
            _R = _r * OV + 14
            focus = (min(focus[0], max(allowed[0], _cx - _R)), min(focus[1], max(allowed[1], _cy - _R)),
                     max(focus[2], min(allowed[2], _cx + _R)), max(focus[3], min(allowed[3], _cy + _R)))
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
        # 10/26 それでも写真のはしにかかる赤丸は、中心はそのままで、写真に収まる大きさまで小さくする（ringcheck.py が、小さくなりすぎていないか調べる）
        if key in MARK:
            _adj = []
            for _cx, _cy, _r, *_rest in MARK[key]:
                _room = min(_cx - x0, x1 - _cx, _cy - y0, y1 - _cy) - 14
                _adj.append((_cx, _cy, max(10, min(_r, _room / OV)), *_rest))
            MARK[key] = _adj
        BOXES[slot] = [key, x0, y0, x1, y1, [list(m[:3]) for m in MARK.get(key, [])]]
        if not ok: warn.append(f"{slot}: 見せたい部分が枠に入りきらない")
        if len(OFFC) > _n0: print(f"  まん中からずれ {slot}（{key}）：左右 {OFFC[-1][1]}%・上下 {OFFC[-1][2]}%（画面のはしに当たって、まん中に置けない）")
        src = load(frame)
        if key in NOCROP:   # 10/26 図（形が 16:9 でない）は、切り抜かずにそのまま枠に入れる
            im = src.resize((round(w / 96 * 300), round(h / 96 * 300)), Image.LANCZOS); im.save(os.path.join(out, f"{slot}.jpg"), quality=90)
            BOXES[slot] = [key, 0, 0, 1280, 720, []]; BADGE[slot] = "br:6"; continue
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
    json.dump(BOXES, open(os.path.join(out, "boxes.json"), "w"))   # 10/26 ringcheck.py が、赤丸が写真の中に大きく入っているかを調べる
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); __import__("badgepos").save(out, BADGE)
    print("\n".join(warn) if warn else "all focus fit")
