# 11/5 まーく様「4-3 右も、ちゃんとロゴを横向きに」
#  ・3-4 左（ロゴが水平）を見本に、重なりで測った（logoang_any.py）→ 左回りに 27.8°
#  ・ロゴのまん中（1280幅で 776, 397 ＝ 元の大きさで 1164, 595.5）を軸に回す。赤丸の位置はそのまま
from PIL import Image
im = Image.open('/tmp/claude-0/kfw4/d_valv_before_1105.jpg').convert('RGB')
im.rotate(27.8, resample=Image.BICUBIC, center=(1164, 595.5)).save('/tmp/claude-0/kfw4/d_valv.jpg', quality=95)
