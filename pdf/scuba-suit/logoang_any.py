# 11/5 まーく様「ロゴを横向きに」→ WD のロゴの傾きを、3-4 左（ロゴが水平）を見本にして測る
#  使い方: python3 logoang_any.py <画像> <ロゴの中心x> <中心y> <ロゴの半径>
#  見本のロゴを型にして、画像を 回す角度・大きさ・位置 を変えながら、輪郭がいちばん重なる所を探す
import cv2, numpy as np, sys
A = cv2.imread("/tmp/claude-0/kfw4/d_nip3.jpg", 0); B = cv2.imread(sys.argv[1], 0)
if B.shape[1] != 1280: B = cv2.resize(B, (1280, round(B.shape[0] * 1280 / B.shape[1])), interpolation=cv2.INTER_AREA)
cx, cy, r = int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4])
def edges(g): g = cv2.GaussianBlur(g, (3, 3), 0); return cv2.Canny(g, 60, 160).astype(np.float32)
ca = (1105, 320); R = 120   # 見本のロゴ（半径 約150）
ta = cv2.GaussianBlur(edges(A)[ca[1]-R:ca[1]+R, ca[0]-R:ca[0]+R], (5, 5), 0)
s0 = r / 150; best = None
def search(angles, scales):
    global best
    for s in scales:
        for a in angles:
            M = cv2.getRotationMatrix2D((cx, cy), a, 1 / s)
            Bw = cv2.warpAffine(B, M, (B.shape[1], B.shape[0]), flags=cv2.INTER_CUBIC)
            e = cv2.GaussianBlur(edges(Bw), (5, 5), 0)
            win = e[max(0, cy-R-40):cy+R+40, max(0, cx-R-40):cx+R+40]
            if win.shape[0] < ta.shape[0] or win.shape[1] < ta.shape[1]: continue
            v = cv2.minMaxLoc(cv2.matchTemplate(win, ta, cv2.TM_CCOEFF_NORMED))[1]
            if best is None or v > best[0]: best = (v, a, s)
search(np.arange(-60, 60.01, 1.0), np.arange(s0 * 0.85, s0 * 1.15, s0 * 0.03))
v, a, s = best
search(np.arange(a - 1.5, a + 1.51, 0.1), np.arange(s * 0.95, s * 1.05, s * 0.01))
print("score %.3f  回す角度 %.1f°（左回りが＋）  大きさ %.2f" % best)
