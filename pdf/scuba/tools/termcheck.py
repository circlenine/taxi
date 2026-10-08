# 呼び名の表記ゆれを調べる（できあがったPDFのもとのHTMLの、読める文字だけを見る）
# 道具は、2・3ページ目で紹介した呼び名（BCD・タンク・銀色金具…）にそろえる。
# 言いかえの言葉は、紹介のところ（「いわゆる浮き袋」「正式名称：…」など）でだけ使ってよい。
# 10/7 に「浮き袋」と「BCD」がまざったまま渡してしまったので、二度と起きないよう毎回調べる。
import re, sys
h = open(sys.argv[1]).read()
h = re.sub(r'<style.*?</style>|<script.*?</script>|<svg.*?</svg>', '', h, flags=re.S)
t = re.sub(r'\s', '', re.sub(r'<[^>]+>', '', h))
# 言いかえの言葉 → 使ってよい場所（前後の文字）
RULES = {
    "浮き袋":   [r"いわゆる浮き袋。"],
    "ボンベ":   [r"空気のボンベ。"],
    "シリンダー": [r"正式名称：シリンダー", r"正式名称は？シリンダー"],
    "ウェイト": [r"正式名称：ウェイトベルト", r"正式名称は？ウェイトベルト"],
    "ウエイト": [],
    "バルブ":   [r"正式名称：タンクバルブ", r"くるくる（タンクバルブ）"],
    "金属金具": [],
    "繋":       [],
    "インストラクターさん": [],
    "BC(?!D)":  [],
    "あと": [],   # 「後」に統一（10/8 ご指示）
    "レギュレーター": [r"ホースの塊＝レギュレーター", r"正式名称は？レギュレーター"],
}
bad = []
for w, ok in RULES.items():
    for m in re.finditer(w, t):
        around = t[max(0, m.start() - 20):m.end() + 20]
        if not any(re.search(o, around) for o in ok):
            bad.append(f"NG 表記ゆれ「{m.group(0)}」… {t[max(0, m.start() - 10):m.end() + 10]}")
# 記号は全角にそろえる：（）！？：を半角で書いていないか（URLは除く）
# 「1-1」の「-」と、ページ番号の「/」は、番号の書き方なのでそのまま
t2 = re.sub(r'https?://[^\s<"]+|youtu\.be/\S+?(?=※|$)', '', re.sub(r'<[^>]+>', '', re.sub(r'<a [^>]*>.*?</a>', lambda m: re.sub(r'https?://\S+', '', m.group(0)), h, flags=re.S)))
for m in re.finditer(r'[()!?:]', t2):
    bad.append(f"NG 半角の記号「{m.group(0)}」… {t2[max(0, m.start() - 10):m.end() + 10]}")
print("\n".join(bad) if bad else "表記ゆれ OK")
sys.exit(1 if bad else 0)
