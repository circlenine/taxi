# 11/5 まーく様「残りのずれは 0 に」→ ロゴの傾きを、より細かく測る
#  ・前の測り方（0.1°きざみ・1つの範囲）は、測るたびに ±0.2° ほどぶれた
#  ・ここでは「回す前の元の写真」を、0.02°きざみで、見本の範囲の大きさを3通り（R=100/120/140）変えて測り、平均する
#  使い方: python3 logoang_fine.py <元の写真> <ロゴの中心x> <中心y> <ロゴの半径> <おおよその角度>
import cv2, numpy as np, sys
A = cv2.imread("/tmp/claude-0/kfw4/d_nip3.jpg", 0); B = cv2.imread(sys.argv[1], 0)
if B.shape[1] != 1280: B = cv2.resize(B, (1280, round(B.shape[0] * 1280 / B.shape[1])), interpolation=cv2.INTER_AREA)
cx, cy, r, a0 = int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
def edges(g): g = cv2.GaussianBlur(g, (3, 3), 0); return cv2.Canny(g, 60, 160).astype(np.float32)
EA = edges(A); ca = (1105, 320); res = []
for R in (100, 120, 140):
    ta = cv2.GaussianBlur(EA[ca[1]-R:ca[1]+R, ca[0]-R:ca[0]+R], (5, 5), 0)
    best = None
    for s in np.arange(r / 150 * 0.9, r / 150 * 1.1, r / 150 * 0.01):
        for a in np.arange(a0 - 0.6, a0 + 0.601, 0.02):
            M = cv2.getRotationMatrix2D((cx, cy), a, 1 / s)
            e = cv2.GaussianBlur(edges(cv2.warpAffine(B, M, (B.shape[1], B.shape[0]), flags=cv2.INTER_CUBIC)), (5, 5), 0)
            win = e[max(0, cy-R-50):cy+R+50, max(0, cx-R-50):cx+R+50]
            if win.shape[0] < ta.shape[0] or win.shape[1] < ta.shape[1]: continue
            v = cv2.minMaxLoc(cv2.matchTemplate(win, ta, cv2.TM_CCOEFF_NORMED))[1]
            if best is None or v > best[0]: best = (v, a)
    res.append(best[1])
print("3通りの測り値", [round(x, 2) for x in res], " 平均 %.2f°（左回りが＋）" % np.mean(res))
