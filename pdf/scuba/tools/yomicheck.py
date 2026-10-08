# 表記ゆれの検査（読みでまとめる方式。10/8 ご指摘「本当に全部の表記ゆれを見ているのか」）
# 文を言葉に分け（janome）、同じ読みなのに書き方がちがう言葉を全部さがす。
# 前もって決めた言葉の組み合わせだけを調べる方法では、「器材／機材」を見落とした。
# この方法なら、組み合わせを知らなくても見つかる。
# 下の OK は、読みが同じでも別の言葉なので問題ないもの（例：「か」と「可」）。新しく出たら、目で見て判断して足す。
import re, sys
from collections import defaultdict
from janome.tokenizer import Tokenizer
OK = {
 "カ": {"か", "可"}, "キ": {"き", "着"}, "タ": {"た", "他"}, "テ": {"て", "手"}, "デ": {"で", "出"},
 "ナッ": {"なっ", "鳴っ"}, "ヒク": {"引く", "低"}, "ヨウ": {"よう", "用"},
 "ツケ": {"付け", "着け"},   # 付ける（物どうし）と着ける（体に）は使い分け（DESIGN.md）
}
# 書き方を変えてはいけない固有の名前（動画の題名など）。ここに入っている文字列は、調べる前に取りのぞく
PROPER = ["ダイビング機材セッティング"]   # 動画の正式な題名なので「機材」のまま
h = open(sys.argv[1]).read()
body = h[h.index("<body>"):]
body = re.sub(r"<script.*?</script>|<svg.*?</svg>", "", body, flags=re.S)
t = re.sub(r"&[a-z#0-9]+;", "", re.sub(r"<[^>]+>", "\n", body))
for p in PROPER: t = t.replace(p, "")
tk = Tokenizer(); by = defaultdict(lambda: defaultdict(int))
for line in t.split("\n"):
    line = line.strip()
    if not line: continue
    for x in tk.tokenize(line):
        if x.part_of_speech.startswith("記号"): continue
        by[x.reading if x.reading != "*" else x.surface][x.surface] += 1
bad = [f"NG 表記ゆれ（読み {r}）… " + "／".join(f"{k}×{v}" for k, v in d.items())
       for r, d in sorted(by.items()) if len(d) > 1 and not set(d) <= OK.get(r, set())]
print("\n".join(bad) if bad else f"表記ゆれ（読みでまとめる検査）OK（{len(by)}語）")
sys.exit(1 if bad else 0)
