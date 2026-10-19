# 届いた動画の画面を、1枚も見落とさないための検査（10/13：まーく様が送ってくれた「残圧計が0」の画面を見落とした反省から）
# 洗浄編の作業を始めてから届いた「動画の画面」（横長 2000x923 と同じ形）は、
#   ・PDFで使っている（focus_s.py に名前がある）か、
#   ・下の SKIP に「なぜ使わないか」を書いてある か、
# のどちらかでなければ、NG にして組み立てを止める。届いたのに、だれも見ていない画面を残さないため。
import os, sys, datetime
from PIL import Image
UP = "/root/.claude/uploads/647c6673-e0d4-50d5-a1f6-0c9285b7952c"
SINCE = datetime.datetime(2026, 10, 13, tzinfo=datetime.timezone.utc)   # 洗浄編の画面が届きはじめた日
SKIP = {  # 使わない画面と、そのわけ
 "617c5ba5": "バケツとBCDだけ（2-3の洗う画面を使用）",
 "6182161b": "動画の題の画面",
 "441df90d": "レギュをBCDから外す、遠くからの画面（2-1の大写しを使用）",
 "cfe73c30": "銀色金具ぐるぐるを外す、別の角度（1-3を使用）",
 "5ac262b4": "BCDをタンクから外す、別の画面（2-2を使用）",
 "bb1a4128": "銀色金具ぐるぐるを外す、別の角度（1-3を使用）",
 "9ccdfeaf": "銀色金具ぐるぐるを外す、別の角度（1-3を使用）",
 "d561ecc4": "動画の題の画面",
 "4da73d58": "動画の最後の、作った人の画面",
 "a85bd1f5": "タンクくるくるを閉める画面。手前のホースで見づらいので、1-1は準備編の画面24に替えた（10/13）",
 "623e0138": "タンクバルブだけの画面。BCDが付いていないので、1-1には使わない（10/13 ご指摘）",
 "83ab3a9d": "レギュをバケツにつけている、別の画面（4-4を使用）",
 "3f68cc32": "動画の画面ではなく、まとめの見本（フェルミ漫画大学）。形の参考にいただいたもの（10/16）",
 "236c003d": "動画の画面ではなく、字の形（字幕の字）の見本としていただいたもの（10/19）",
}
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, "focus_s.py"), encoding="utf-8").read()
ng = []
for n in os.listdir(UP):
    p = os.path.join(UP, n)
    if datetime.datetime.fromtimestamp(os.path.getmtime(p), datetime.timezone.utc) < SINCE: continue
    try: w, h = Image.open(p).size
    except Exception: continue
    if abs(w / h - 2000 / 923) > 0.02: continue   # iPhoneのスクショ（ご指摘の画面）は対象外
    if n[:8] not in src and n[:8] not in SKIP: ng.append(n[:8])
if ng:
    print("NG 届いたのに、使ってもいないし、使わないわけも書いていない画面: " + " ".join(sorted(ng)))
    sys.exit(1)
print("届いた画面 OK（全部、使っているか、使わないわけを書いてある）")
