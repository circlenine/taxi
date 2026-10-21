# 写真の ▶ の印を、どのすみに・どの大きさで置くかを決める（10/21 まーく様「右下に ▶ を。右下に画像の重要部分がかぶらないように」）
#   ・大きさ：まとめと同じ 6mm。小さい写真（合図など）は、写真の幅の 15％（3.6mm まで小さくする）
#   ・置き場所：右下を基本に、右下・左下・右上・左上の中から「いちばん大事な物にかからない」すみを選ぶ
#       大事な物＝写真に描いた赤い丸・矢印（いちばん重い）、見せたい部分（focus の枠）、手・グローブ（赤・ピンク）、細かい形（輪郭が多い所）
import json, os
ORDER = ("br", "bl", "tr", "tl")
GAP = 1.6   # ふちからの間（mm）

def size_mm(w_px):
    w_mm = w_px / 96 * 25.4
    return max(3.6, min(6.0, w_mm * 0.15))

def corners(im, ff, w_px, h_px):
    s = size_mm(w_px)
    bw, bh = (s + GAP) / 25.4 * 96 / w_px, (s + GAP) / 25.4 * 96 / h_px
    W, H = im.size; g = im.convert("RGB"); px = g.load(); L = g.convert("L").load()
    res = {}
    for c in ORDER:
        x0 = 1 - bw if c[1] == "r" else 0; y0 = 1 - bh if c[0] == "b" else 0
        x1, y1 = x0 + bw, y0 + bh
        ov = max(0, min(x1, ff[2]) - max(x0, ff[0])) * max(0, min(y1, ff[3]) - max(y0, ff[1])) / (bw * bh)
        red = hand = edge = n = 0
        for yy in range(int(y0 * H), max(int(y0 * H) + 1, int(y1 * H) - 1), 2):
            for xx in range(int(x0 * W), max(int(x0 * W) + 1, int(x1 * W) - 1), 2):
                xx2, yy2 = min(xx, W - 2), min(yy, H - 2)
                r, gg, b = px[xx2, yy2]; n += 1
                if r > 190 and gg < 90 and b < 90: red += 1
                if r > 150 and r > gg + 40 and r > b + 10: hand += 1          # 赤・ピンクのグローブ、肌
                if abs(L[xx2, yy2] - L[xx2 + 1, yy2]) + abs(L[xx2, yy2] - L[xx2, yy2 + 1]) > 40: edge += 1
        n = max(n, 1)
        score = (red / n > .004) * 1000 + ov * 3 + hand / n * 4 + edge / n * 2
        if c == "br": score *= 0.8   # 同じくらいなら右下（まーく様のご指定）
        res[c] = round(score, 3)
    best = min(ORDER, key=lambda c: res[c])
    return best, round(s, 2), res

def focus_frac(focus, box, pad_to=None, imw=None, rot=False):
    x0, y0, x1, y1 = box; fx0, fy0, fx1, fy1 = focus
    f = [(fx0 - x0) / (x1 - x0), (fy0 - y0) / (y1 - y0), (fx1 - x0) / (x1 - x0), (fy1 - y0) / (y1 - y0)]
    if rot: f = [f[1], 1 - f[2], f[3], 1 - f[0]]
    return [max(0, min(1, v)) for v in f]

def save(out, d):
    json.dump(d, open(os.path.join(out, "badge.json"), "w"), ensure_ascii=False)
