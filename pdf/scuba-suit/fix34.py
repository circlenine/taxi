# 3-4 の2枚を、銀色の口（つなぐ所）の向きで、もう一度ぴったりそろえる（11/3 まーく様「左の先端が少し傾いている。重ね合わせてピッタリ同じ位置に」）
#  ・左（つなぐ前）：口の上下のふちが、右へ行くほど上がっていた（約3.8°）→ 右回りに回して、口を真横に
#  ・右（つないだ後）：つなぎ目の銀の輪が、上が右へ傾いていた（約5.5°）→ 左回りに回して、輪をまっすぐ縦に（＝口が真横）
#  ・口の根もと（左：口と台座の境目、右：銀の輪）を、2枚とも同じ点 (690, 362) に置く
#  ・回した分のすみが黒くならないよう、2枚とも同じ倍率で少しだけ寄せる（大きさの比はそのまま）
import sys
from PIL import Image
T = (690, 362); Z = 1.12
def fix(src, dst, ang, base):
    im = Image.open(src).convert('RGB')
    im = im.rotate(ang, resample=Image.BICUBIC, center=base, translate=(T[0] - base[0], T[1] - base[1]))
    W, H = im.size; w, h = W / Z, H / Z
    x0 = T[0] - w * (T[0] / W); y0 = T[1] - h * (T[1] / H)
    im.crop((round(x0), round(y0), round(x0 + w), round(y0 + h))).resize((W, H), Image.LANCZOS).save(dst, quality=95)
fix(sys.argv[1], sys.argv[3], -3.8, (690, 360))
fix(sys.argv[2], sys.argv[4], 5.5, (681, 365))
