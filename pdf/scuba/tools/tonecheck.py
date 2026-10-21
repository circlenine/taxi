# 言い回しの点検（10/20 まーく様「じゃ！は無くして、〜だよ の書き方に統一」「！も連続しないように」）
# ページに出る字だけを調べる。見つかったら止める
import re, sys, html
h = open(sys.argv[1]).read()
h = re.sub(r'<rt>.*?</rt>|<span class="rt">[^<]*</span>', '', h)   # 10/20 ルビ（ふりがな）は、点検では数えない
h = re.sub(r'<script.*?</script>|<style.*?</style>', '', h, flags=re.S)
t = html.unescape(re.sub(r'<[^>]+>', '', h))
ng = []
for m in re.finditer(r'.{0,10}[！？!?]{2,}', t):
    ng.append('「！」「？」が続いている：' + m.group(0))
for m in re.finditer(r'.{0,10}1分(探|さが)', t):
    ng.append('「1分探す」は使わない（10/20 まーく様）：' + m.group(0))
for m in re.finditer(r'.{0,10}止ま[るっれりら]', t):
    ng.append('「止まる」は使わず「停まる」（10/20 まーく様）：' + m.group(0))
# 10/21 まーく様「だから、という言い方は嫌な雰囲気に取られる。絶対に使わない」→「その為」「ので」などに言いかえる
# 10/21 まーく様「大事は、とくに大事なところ は同じことを2回言っているだけ」→ 札の名前を、札の説明でくり返さない
for m in re.finditer(r'.{0,6}(大事[はな]?、?とくに大事|補足[はな]?、?補足).{0,6}', t):
    ng.append('札の名前を、説明でくり返している（10/21 まーく様）：' + m.group(0))
# 10/21 まーく様「前ぶれは除いて」：あわてた最中に気づく前提の話（前ぶれ）は入れない
for m in re.finditer(r'.{0,8}(前ぶれ|前触れ).{0,8}', t):
    ng.append('「前ぶれ」の話は入れない（10/21 まーく様）：' + m.group(0))
for m in re.finditer(r'.{0,10}だから.{0,6}', t):
    ng.append('「だから」は使わない（10/21 まーく様。「その為」「ので」に）：' + m.group(0))
for m in re.finditer(r'.{0,10}(じゃ[！!。]|ぞい|おめぇ|貴様|なんだな|だぞ)', t):
    ng.append('〜だよ の書き方になっていない：' + m.group(0))
if ng:
    print('NG 言い回し（' + str(len(ng)) + 'か所）')
    for x in sorted(set(ng))[:15]: print('  ' + x)
    sys.exit(1)
print('言い回し OK（「！」の連続なし・〜だよ の書き方）')
