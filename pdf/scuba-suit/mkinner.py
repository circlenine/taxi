# 使わない（10/27 まーく様「イラスト作成をすぐやめてください」）。資料には写真だけを使う
# ドライスーツの中に着る服のイラスト（10/27 まーく様「女性目線での資料ファースト」「服の全体像イメージ再現などできないのですか？」）
# 元にしたもの：ocean_a の動画の女性の服装（3:00〜3:21：灰色の長そで・灰色の細身のズボン・緑と青のラインの長い白い靴下）。
# 写真をつなぎ合わせると、実際には無い写真になるので、絵（イラスト）として描いた。資料にも「動画の服装をもとに描いた絵」と書く。
# 1) inner_ill.html（同じフォルダ）を playwright で 1920x1080 の絵にする  2) ここでタグ（ドライスーツの図と同じ形）を付ける
import subprocess, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run(["node", "-e", "const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});"
                f"await p.goto('file://{HERE}/inner_ill.html');await p.screenshot({{path:'/tmp/claude-0/ill/inner.png'}});await b.close();}})();"],
               check=True, env={**os.environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()})
out = Image.open("/tmp/claude-0/ill/inner.png").convert("RGB"); d = ImageDraw.Draw(out); RED = (249, 54, 18)
FP = "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"
font = ImageFont.truetype(FP, 66)   # 資料では小さく載るので、字を大きく
def tag(text, x, y, anchor, to, minw=0):
    bw, bh = max(d.textlength(text, font=font) + 40, minw), font.size + 28
    x0 = x - bw if anchor == "r" else x; y0 = y - bh / 2
    d.line((to[0], to[1], x0 + bw if anchor == "r" else x0, y), fill=RED, width=5)
    d.ellipse((to[0] - 9, to[1] - 9, to[0] + 9, to[1] + 9), fill=RED)
    d.rounded_rectangle((x0 - 5, y0 - 5, x0 + bw + 5, y0 + bh + 5), radius=16, fill="white")
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=14, fill=RED)
    d.text((x0 + 20, y), text, font=font, fill="white", anchor="lm")
L = ["長そで", "裾はズボンの中"]; R = ["ピタッとしたズボン", "すね丈の靴下"]
LW = max(d.textlength(t, font=font) + 40 for t in L); RW = max(d.textlength(t, font=font) + 40 for t in R)
tag(L[0], 850, 330, "r", (900, 360), LW)
tag(L[1], 850, 540, "r", (885, 522), LW)
tag(R[0], 1090, 700, "l", (1015, 720), RW)
tag(R[1], 1090, 905, "l", (1020, 905), RW)
out = out.crop((300, 20, 1700, 1060))   # 人とタグだけ（まわりの白い余白を切る）。1400x1040
out.save("/tmp/claude-0/kfw4/d_inner.jpg", quality=95)
print("ok")
