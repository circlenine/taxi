# 言葉の途中で行が変わっていないかを調べる（10/13 ご指摘：「飛ば／そう」のように、1つの言葉が2行に分かれていた）
# 行の切れ目が、言葉（janome で区切った1語）のまん中に来ていたら NG
# 文の切れ目（、。！？）や、名詞と名詞のあいだで分かれるのはよい
import json, sys, re
from janome.tokenizer import Tokenizer
tk = Tokenizer()
bad = []
for pg, lines in json.load(open(sys.argv[1])):
    text = "".join(lines)
    cuts, n = set(), 0
    for l in lines[:-1]:
        n += len(l); cuts.add(n)
    pos = 0
    for t in tk.tokenize(text):
        s = t.surface; a, b = pos, pos + len(s); pos = b
        for c in cuts:
            if a < c < b and len(s) >= 2 and re.fullmatch(r'[ぁ-んァ-ヶー一-龠々]+', s):
                bad.append(f"p{pg} 言葉の途中で改行「{s[:c-a]}／{s[c-a:]}」… {text[max(0,a-6):b+6]}")
print("\n".join("NG " + x for x in bad) if bad else "言葉の途中の改行 OK")
sys.exit(1 if bad else 0)
