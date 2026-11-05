# 11/5 まーく様「残りのずれは0に」→ logoang_fine.py（0.02°きざみ・3通りの平均）で測った角度に
# 11/5 まーく様「3-4 右の写真がまだ横になっていない。ロゴの角度を左の画像と重ねて完璧に合わせて」
#  ・左のロゴ（WD のマーク）を型にして、右の写真を 回す角度・大きさ・位置 を変えながら、ロゴがいちばん重なる所を探した
#    （/tmp の logoang.py：輪郭どうしの重なりで比べる）→ 右を時計回りに 4.7° 回すと重なる
#  ・口の根もと (690, 362) を軸に回し、すみが黒くならないよう少しだけ寄せる（1.13倍）
#  ・回したあとに同じ式で測り直し、のこりのずれは 0.1°
from PIL import Image
im = Image.open('/tmp/claude-0/kfw4/d_conn3_before_1105.jpg').convert('RGB')
T = (690, 362); Z = 1.13
im = im.rotate(-4.57, resample=Image.BICUBIC, center=T)
W, H = im.size; w, h = W / Z, H / Z; x0 = T[0] - w * (T[0] / W); y0 = T[1] - h * (T[1] / H)
im.crop((round(x0), round(y0), round(x0 + w), round(y0 + h))).resize((W, H), Image.LANCZOS).save('/tmp/claude-0/kfw4/d_conn3.jpg', quality=95)
