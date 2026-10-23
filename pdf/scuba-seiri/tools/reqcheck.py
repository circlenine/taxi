# まーく様にいただいた「ここにこれを入れて」の点検（10/23 洗浄編5-2の「オクト（正式名称：オクトパス）」を入れたつもりで入れ忘れていた）
# 直したつもりでも、組み立てのときに消えたり、入れ忘れたりする。いただいたご指示は、ここに1行ずつ足して、毎回たしかめる。
# 使い方: python3 reqcheck.py 準備|洗浄|スキル a4.html
#   REQ  … ページのどこかに、この字がそのまま出ていること（タグを外して、空白をつめた字でくらべる）
#   PINK … この字が「大事」（赤字）の枠の中にあること
import re, sys
from html.parser import HTMLParser
REQ = {
 "準備": ["Oって感じだよね（正式名称：Oリング）", "ホースでつなぐのは、この2点！", "親指オヤビンボタン（給気ボタン）", "人差し指ピーンボタン（排気ボタン）", "右手には緊急信号の黄色タコさん！", "うぉー！付いたー！", "100万の景色を見るためのダイビングが整ったァー！"],
 "洗浄": ["銀色金具キャップ（正式名称：ダストキャップ）", "レギュ（正式名称：セカンドステージ）",
          "オクト（正式名称：オクトパス）", "（正式名称：ファーストステージ）", "（正式名称：パージボタン）",
          "初めに外したら、そのまま！で覚えよう", "オクトパス（タコ）に見えー…ないね", "よーくスクリュー（回転）だね", "ここから水が抜ける（正式名称：排気ボタン）"],
 "スキル": ["（正式名称：オクトパス）", "人差し指ピーンボタン（正式名称：排気ボタン）", "親指オヤビンボタン（正式名称：給気ボタン）",
          "口呼吸を続ける", "（レギュを探す）", "（マスクの水抜き）", "（こむら返り）", "（浮きも沈みもしない）", "（手で伝える合図）", "この姿勢が超大事！"],
}
# NOT … ページに出てはいけない形（HTMLのまま、正規表現で探す。✕ 高すぎ などの赤は残す）
NOT = {
 "スキル": [("親指のボタン", "親指は「親指オヤビンボタン」でそろえる（10/23）")],
 "準備": [("親指（オヤビン）", "親指は「親指オヤビンボタン」でそろえる（10/23）"), (r'class="cap3 red">[^<]*<small>（正式名称', "写真の下の名前を赤くしない（10/23 まーく様「銀色金具ぐるぐる、別に赤くする必要ない」）")],
}
PINK = {
 "洗浄": ["オクトも、真ん中のボタンは押さないでね", "キャップは、締めたまま洗う"],
}
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.st = []; s.all = []; s.pk = []
    def handle_starttag(s, t, a):
        if t in ("br", "img", "input", "meta", "link", "hr", "source", "wbr"): return
        s.st.append((t, dict(a).get("class") or ""))
    def handle_endtag(s, t):
        for i in range(len(s.st) - 1, -1, -1):
            if s.st[i][0] == t: del s.st[i:]; break
    def handle_data(s, d):
        if any(t in ("style", "script", "rt") for t, _ in s.st): return
        s.all.append(d)
        if any(re.search(r'(^|\s)kpk(\s|$)', c) for _, c in s.st): s.pk.append(d)
book, f = sys.argv[1], sys.argv[2]
p = P(); p.feed(open(f).read())
sq = lambda x: re.sub(r'\s+', '', x)
txt, pk = sq("".join(p.all)), sq("".join(p.pk))
ng = [f"NG ご指示の字が見当たらない：{r}" for r in REQ.get(book, []) if sq(r) not in txt]
raw = open(f).read()
ng += [f"NG {why}" for pat, why in NOT.get(book, []) if re.search(pat, raw)]
ng += [f"NG 「大事」の枠に入っていない：{r}" for r in PINK.get(book, []) if sq(r) not in pk]
print("\n".join(ng) if ng else f"ご指示の点検 OK（{book}）")
sys.exit(1 if ng else 0)
