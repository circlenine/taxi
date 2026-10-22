# もくじの行き先の検査（10/8 ご指摘：もくじで飛ぶとページの途中に着いた）
# ・もくじの行（上から順）の行き先が、書いてあるページ番号（2, 3, … 10）と同じページか
# ・行き先の形が /Fit（ページの頭を丸ごと見せる。座標を使わないので iPhone でもずれない）か
import sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1]); ids = [p.indirect_reference.idnum for p in r.pages]
links = [a.get_object() for a in r.pages[0].get("/Annots") or [] if a.get_object().get("/Subtype") == "/Link" and "/Dest" in a.get_object()]
links.sort(key=lambda o: -float(o["/Rect"][3]))
# 10/22 スキル編は、もくじの行を「海洋1　5〜7ページ」のようにまとめたので、行の順＝ページの順ではなくなった。
#   1ページ目の字から、各行の終わりの「Nページ」「N〜Mページ」を読み、行き先はその N（はじめのページ）と比べる
import re
_t = r.pages[0].extract_text(); _i = _t.find("もくじ")
EXP = [int(m.group(1)) for l in _t[_i:].split("\n") for m in [re.search(r"(\d+)\s*(?:〜\s*\d+\s*)?ページ\s*$", l)] if m]
bad = []
for i, o in enumerate(links):
    d = o["/Dest"]
    if not hasattr(d, "__getitem__") or isinstance(d, str): bad.append(f"{i+1}行目：行き先が名前のまま（{d}）"); continue
    pg = ids.index(d[0].idnum) + 1
    want = EXP[i] if i < len(EXP) else i + 2
    if pg != want: bad.append(f"{i+1}行目：{want}ページのはずが {pg}ページへ")
    if d[1] != "/Fit": bad.append(f"{i+1}行目：行き先の形が {d[1]}（/Fit でない）")
print("\n".join("NG もくじ " + b for b in bad) if bad else f"もくじの行き先 OK（{len(links)}行、すべてページの頭へ）")
sys.exit(1 if bad else 0)
