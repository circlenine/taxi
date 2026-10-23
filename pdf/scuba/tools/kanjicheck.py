# 漢字とひらがなの書き分けの点検（10/23 まーく様「込・こみの表記ゆれ。指摘する以外の表記ゆれがないか、全て確認できているのか」）
# yomicheck.py は、1つの言葉どうしをくらべる。「税込」のように言葉の中に入った漢字は、ひらがなの「こみ」と同じ言葉と気づけなかった。
# ここでは、ひらがなの言葉（2字以上）の読みが、漢字の入った言葉の読みの頭か終わりと同じものを全部さがす。
# 下の ALLOW は、目で見て「別の言葉」と確かめた組み合わせ。新しく出たら、目で見て、直すか ALLOW に足す。
import re, sys
from janome.tokenizer import Tokenizer
ALLOW = {("あい", "合図"), ("あい", "場合"), ("あい", "相手"), ("あい", "相棒"), ("いい", "委員"), ("いく", "教育"), ("いる", "入る"),
 ("くる", "作る"), ("さす", "指さす"), ("さん", "参考"), ("さん", "水産"), ("しまっ", "締まっ"), ("せる", "合わせる"), ("せる", "引き寄せる"),
 ("せる", "押せる"), ("せる", "見せる"), ("そう", "装着"), ("そう", "装置"), ("ため", "試し"), ("ため", "試そ"), ("てる", "立てる"),
 ("ない", "内容"), ("なっ", "鳴っ"), ("ふり", "浮力"), ("ほう", "方法"), ("ほう", "解放"), ("まっ", "待っ"), ("まっ", "締まっ"),
 ("よう", "内容"), ("よう", "必要"), ("よう", "用語"), ("れる", "入れる"), ("れる", "外れる"),
 ("いれ", "入れ"), ("いれ", "入れる"),   # 付いていれば（いる＋れば）は別の言葉
 ("ふく", "福岡"), ("ふく", "膨らむ"), ("ふく", "膨らま"), ("ふく", "膨らまそ"), ("ふく", "膨らませる")}   # ふくらはぎ（足）は別の言葉
tk = Tokenizer()
h = "".join(open(f).read() for f in sys.argv[1:])
h = re.sub(r'<style.*?</style>|<script.*?</script>|<svg.*?</svg>', '', h, flags=re.S)
t = re.sub(r'<[^>]+>', '\n', re.sub(r'<rt>.*?</rt>|<span class="rt">[^<]*</span>', '', h))
hira, comp = set(), set()
for line in t.split('\n'):
    for x in tk.tokenize(line.strip()):
        pos = x.part_of_speech.split(',')[0]
        if re.fullmatch(r'[ぁ-ん]{2,}', x.surface) and pos in ('名詞', '動詞', '形容詞'): hira.add((x.surface, x.reading))
        if re.search(r'[一-龥]', x.surface) and len(x.surface) >= 2 and x.reading != '*': comp.add((x.surface, x.reading))
bad = sorted({(hs, cs) for hs, hr in hira for cs, cr in comp if (cr.endswith(hr) or cr.startswith(hr)) and (hs, cs) not in ALLOW})
print("\n".join(f"NG 漢字とひらがなの書き分け？ {a} ↔ {b}" for a, b in bad) if bad else "漢字とひらがなの書き分け OK")
sys.exit(1 if bad else 0)
