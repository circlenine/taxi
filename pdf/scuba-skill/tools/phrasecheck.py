# スキル編で、まちがいと分かった言い方が残っていないかを調べる（10/15）
# 例：バディとはぐれたとき「1分さがす」は誤り（サンライズの講習：その場で360度見わたし、見つからなければ1分待って浮上）
import re, sys
NG = {
 r"1分(間)?(さが|探)": "はぐれたら「1分さがす」は誤り → その場で360度見わたし、見つからなければ1分待って浮上、水面で合流",
 r"代替空気源": "PADI Japan の呼び名は「バックアップ空気源（オクトパス）」",
 r"オーラル吸気": "正しくは「オーラル給気」",
}
t = open(sys.argv[1], encoding="utf-8").read()
bad = [f"NG {m}" for k, m in NG.items() if re.search(k, t)]
print("\n".join(bad) if bad else "言い方の確認 OK")
sys.exit(1 if bad else 0)
