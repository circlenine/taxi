"""11/4 まーく様「大事や補足部分は、終わりは全て柔らかい言い回しに」「写真下の説明文も、柔らかい言い回しで統一」
   大事・補足・手順の表・写真の説明の文が、柔らかい終わり方（〜しよう・〜よ・〜ね など）になっているかを調べる。
   ※ で始まる出どころの注意書き、◯✕の見本の名前、「参考の写真」「つなぐ前／後」のような名札は、文ではないので数えない"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content_w as c
SOFT = re.compile(r"(う|よ|ね|ダメ|ちゃう|OK|カチッ|から)$")
def body(t):
    t = re.sub(r"<small>.*?</small>", "", t); t = re.sub(r"\{[a-z]+\}", "", t).strip()
    while t.endswith("）") and "（" in t: t = t[:t.rindex("（")].rstrip()
    return t
ng = []
def chk(where, t):
    b = body(t)
    if not b or t.startswith("※") or t[0] in "◯✕" or b.startswith(("参考の写真", "つなぐ前", "つないだ後", "BCD")): return
    if not SOFT.search(b): ng.append(f"NG {where}：終わりが柔らかくない「{t[:30]}」")
for sec in c.STEPS:
    for sb in sec["subs"]:
        p = sb.get("pink") or {}
        for t in [p.get("head", "")] + list(p.get("lines", [])): chk(sb["id"] + " 大事", t) if t else None
        st = sb.get("steps") or {}
        if st:
            chk(sb["id"] + " 表の見出し", st["head"])
            for r in st.get("rows", []): chk(sb["id"] + " 表", r[-1])
        for x in sb.get("extra") or []: chk(sb["id"] + " 補足", x)
for (sid, k), v in c.CAPS.items():
    if v: chk(f"{sid} {k} 写真の説明", v)
print("\n".join(ng) if ng else "終わりの言い回し OK（大事・補足・写真の説明）"); sys.exit(1 if ng else 0)
