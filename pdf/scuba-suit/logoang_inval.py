# 3-2 右（d_inval2）のロゴの傾きを、3-4 左（ロゴが水平）を見本にして測る
import cv2, numpy as np, sys
K = "/tmp/claude-0/kfw4/"
A = cv2.imread(K + "d_nip3.jpg", 0); B = cv2.imread(sys.argv[1] if len(sys.argv) > 1 else K + "d_inval2.jpg", 0)
def edges(g): g = cv2.GaussianBlur(g, (3, 3), 0); return cv2.Canny(g, 60, 160).astype(np.float32)
ca = (1105, 320); R = 120
ta = cv2.GaussianBlur(edges(A)[ca[1]-R:ca[1]+R, ca[0]-R:ca[0]+R], (5, 5), 0)
cb = (648, 345); best = None
for s in np.arange(0.40, 0.62, 0.01):   # 見本のロゴに対する大きさ
    for a in np.arange(-25, 25.01, 0.1):
        M = cv2.getRotationMatrix2D(cb, a, 1 / s)
        Bw = cv2.warpAffine(B, M, (B.shape[1], B.shape[0]), flags=cv2.INTER_CUBIC)
        e = cv2.GaussianBlur(edges(Bw), (5, 5), 0)
        win = e[max(0, cb[1]-R-40):cb[1]+R+40, max(0, cb[0]-R-40):cb[0]+R+40]
        r = cv2.matchTemplate(win, ta, cv2.TM_CCOEFF_NORMED); _, v, _, loc = cv2.minMaxLoc(r)
        if best is None or v > best[0]: best = (v, a, s, loc)
print("score %.3f  回す角度 %.1f°（左回りが＋）  大きさ %.2f  位置 %s" % best)
