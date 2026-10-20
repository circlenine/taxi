# 言い回しの点検（10/20 まーく様「じゃ！は無くして、〜だよ の書き方に統一」「！も連続しないように」）
# ページに出る字だけを調べる。見つかったら止める
import re, sys, html
h = open(sys.argv[1]).read()
h = re.sub(r'<rt>.*?</rt>', '', h)   # 10/20 ルビ（ふりがな）は、点検では数えない
h = re.sub(r'<script.*?</script>|<style.*?</style>', '', h, flags=re.S)
t = html.unescape(re.sub(r'<[^>]+>', '', h))
ng = []
for m in re.finditer(r'.{0,10}[！？!?]{2,}', t):
    ng.append('「！」「？」が続いている：' + m.group(0))
for m in re.finditer(r'.{0,10}(じゃ[！!。]|ぞい|おめぇ|貴様|なんだな|だぞ)', t):
    ng.append('〜だよ の書き方になっていない：' + m.group(0))
if ng:
    print('NG 言い回し（' + str(len(ng)) + 'か所）')
    for x in sorted(set(ng))[:15]: print('  ' + x)
    sys.exit(1)
print('言い回し OK（「！」の連続なし・〜だよ の書き方）')
