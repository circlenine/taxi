# 11/5 まーく様「残りのずれは0に」→ logoang_fine.py（0.02°きざみ・3通りの平均）で測った角度に
# 11/5 まーく様「3-2 の右も、きちんと真横になってるように」
#  ・3-4 左（ロゴが水平）のロゴを見本にして、3-2 右のロゴの傾きを、重なりがいちばん大きくなる角度で測った → 時計回りに 3.8°
#  ・ロゴのまん中 (648, 345) を軸に回す（赤丸の位置はそのまま）。写真に使う範囲は元の画面の中ほどなので、すみは黒くならない
from PIL import Image
im = Image.open('/tmp/claude-0/kfw4/d_inval2_before_1105.jpg').convert('RGB')
im.rotate(-3.92, resample=Image.BICUBIC, center=(648, 345)).save('/tmp/claude-0/kfw4/d_inval2.jpg', quality=95)
