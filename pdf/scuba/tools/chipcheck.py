# 道具の名前（BCD・タンク・銀色金具…）が、本文で色つきの札になっているかを調べる
# 札にしない場所：ページの見出し・もくじ（“”でくくったタイトル）、写真の上に書いた札、
#                 写真の名札、表紙のロゴ、出典、正式名称の行、言いかえの説明
# 10/7 に、2-3の「銀色金具」だけ札になっていないのを見逃してご指摘を受けたので、毎回調べる
import re, sys
h = open(sys.argv[1]).read()
h = re.sub(r'<style.*?</style>|<script.*?</script>|<svg.*?</svg>', '', h, flags=re.S)
# 札にしなくてよい場所を消す
for pat in [r'<div class="ph[^"]*">.*?</h2></div>',        # ページの見出し
            r'<a class="tc.*?</a>',                           # もくじ
            r'<span class="(?:tag|cap|pl3[^"]*)"[^>]*>.*?</span>',     # 写真の上の札
            r'<div class="reg">.*?(?=<div class="names">)',     # 2ページ目の写真の名札
            r'<(?:span|p) class="rn2">.*?</(?:span|p)>',                   # 「レギュ」と呼ぶことも（呼び名そのものの説明）
            r'<div class="logo">.*?</div></div>',            # 表紙のロゴ
            r'<p class="src">.*?</p>', r'<a class="ref".*?</a>',
            r'<p class="of">.*?</p>',                         # 正式名称の行
            r'<div class="b3h">.*?</div>',                    # 道具2の見出し（札そのもの）
            r'<div class="pno">.*?</div>']:
    h = re.sub(pat, '', h, flags=re.S)
h = re.sub(r'<span class="t t-\w+">[^<]*</span>', '■', h)  # 札になっているものは消す
t = re.sub(r'<[^>]+>', '', h)
WORDS = ["BCD", "タンク", "銀色金具", "レギュ(?!レーター)", "オクト(?!パス)", "残圧計", "重り", "カチカチホース"]
bad = []
for w in WORDS:
    for m in re.finditer(w, t):
        bad.append(f"NG 札になっていない「{m.group(0)}」… {t[max(0, m.start() - 12):m.end() + 12].strip()}")
# 大事な補足の箱：見出しに出てくる道具は、中の文にも全部出てくるか
# （10/7 に、見出しを「オクトや残圧計は」にしたのに、中の文が「オクトを」のままだった）
H = open(sys.argv[1]).read()
for box in re.findall(r'<div class="pink pbig">.*?</div>(?=\s*</div>)', H, flags=re.S):
    m = re.search(r'<div class="hd">(.*?)</div>', box, flags=re.S)
    if not m: continue
    body = box[m.end():]
    for k in set(re.findall(r'class="t t-(\w+)"', m.group(1))):
        if f'class="t t-{k}"' not in body:
            bad.append(f"NG 見出しと中の文が合っていない：見出しの「{k}」が、中の文に出てこない … {re.sub(r'<[^>]+>', '', m.group(1))}")
print("\n".join(bad) if bad else "道具の札 OK")
sys.exit(1 if bad else 0)
