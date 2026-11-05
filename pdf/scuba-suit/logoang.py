# 3-4 の2枚のロゴ（WD のマーク）の向きのちがいを、重ね合わせて測る
# 左のロゴを型にして、右のロゴを 回す角度・大きさ・位置 を変えながら、いちばん重なる所を探す
import cv2, numpy as np, sys
K = "/tmp/claude-0/kfw4/"
A = cv2.imread(K + "d_nip3.jpg", 0); B = cv2.imread(K + "d_conn3.jpg", 0)
def edges(g): g = cv2.GaussianBlur(g, (3, 3), 0); return cv2.Canny(g, 60, 160).astype(np.float32)
ca = (1105, 320); R = 120
ta = edges(A)[ca[1]-R:ca[1]+R, ca[0]-R:ca[0]+R]
ta = cv2.GaussianBlur(ta, (5, 5), 0)
best = None
cb = (1100, 372)  # 測り直しも同じ式で
for s in np.arange(0.92, 1.12, 0.01):
    for a in np.arange(-10, 10.01, 0.1):
        M = cv2.getRotationMatrix2D(cb, a, 1 / s)
        Bw = cv2.warpAffine(B, M, (B.shape[1], B.shape[0]), flags=cv2.INTER_CUBIC)
        e = cv2.GaussianBlur(edges(Bw), (5, 5), 0)
        win = e[cb[1]-R-30:cb[1]+R+30, cb[0]-R-30:cb[0]+R+30]
        r = cv2.matchTemplate(win, ta, cv2.TM_CCOEFF_NORMED)
        _, v, _, loc = cv2.minMaxLoc(r)
        if best is None or v > best[0]: best = (v, a, s, loc)
print("score %.3f  右を回す角度 %.1f°（左回りが＋） 倍率 %.2f  位置 %s" % best)
