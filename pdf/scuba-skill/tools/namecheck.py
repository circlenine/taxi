# 正式名称の点検（10/23 まーく様「各資料には、一度は正式名称を入れた方が親切なので入れてください」）
# 呼び名（銀色金具 など）が出てくる冊には、その正式名称が、どこかに1回は出ていること。
# 使い方: python3 namecheck.py a4.html …（1冊ずつ調べる）
import re, sys
from html.parser import HTMLParser
PAIRS = [("銀色金具", "ファーストステージ"), ("レギュ", "セカンドステージ"), ("オクト", "オクトパス"),
         ("カチカチホース", "中圧ホース"), ("L字サインホース", "インフレーターホース"),
         ("人差し指ピーンボタン", "排気ボタン"), ("親指オヤビンボタン", "給気ボタン"), ("真ん中のボタン", "パージボタン"),
         ("タンクくるくる", "タンクバルブ"), ("銀色金具ぐるぐる", "ヨークスクリュー"), ("銀色金具キャップ", "ダストキャップ"),
         ("BCD", "Buoyancy Control Device"), ("重り", "ウェイトベルト"), ("下の空気を抜く口", "排気バルブ")]
class P(HTMLParser):
    def __init__(s): super().__init__(); s.skip = 0; s.t = []
    def handle_starttag(s, t, a): s.skip += t in ("style", "script")
    def handle_endtag(s, t): s.skip -= t in ("style", "script")
    def handle_data(s, d):
        if not s.skip: s.t.append(d)
ng = []
for f in sys.argv[1:]:
    p = P(); p.feed(open(f).read()); t = re.sub(r"\s+", " ", "".join(p.t))
    ng += [f"NG {f.split('/')[-2]}：「{a}」が出てくるのに、正式名称「{b}」が1回も無い" for a, b in PAIRS if a in t and b not in t]
print("\n".join(ng) if ng else "正式名称の点検 OK")
sys.exit(1 if ng else 0)
