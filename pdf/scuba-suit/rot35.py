# 11/5 4-3 右と同じく、3-5 左（胸のボタンの写真）のロゴも横向きに
#  ・3-4 左を見本に重なりで測った（logoang_any.py）→ 左回りに 20.5°。ボタンのまん中（元の大きさで 957, 546）を軸に回す
from PIL import Image
im = Image.open('/tmp/claude-0/kfw4/d_push2_before_1105.jpg').convert('RGB')
im.rotate(20.5, resample=Image.BICUBIC, center=(957, 546)).save('/tmp/claude-0/kfw4/d_push2.jpg', quality=95)
