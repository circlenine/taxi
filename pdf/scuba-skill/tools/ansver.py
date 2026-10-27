# クイズの答えを、はじめから見せた版を作る（10/27 まーく様「各クイズの答えも見せた状態のものも送って」）
# できあがったPDFの、クイズのスイッチ（addchk.py が作った quiz1〜）を全部「押した」状態にするだけ。中身は1字も変えない
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject
src, out = sys.argv[1:3]
w = PdfWriter(clone_from=PdfReader(src)); n = 0
for f in w._root_object["/AcroForm"]["/Fields"]:
    f = f.get_object()
    if not str(f.get("/T", "")).startswith("quiz"): continue
    f[NameObject("/V")] = NameObject("/Yes"); n += 1
    for k in f["/Kids"]: k.get_object()[NameObject("/AS")] = NameObject("/Yes")
w.write(out)
print(f"答えを見せた版：{n}問")
if n == 0: sys.exit("NG クイズのスイッチが見つからない")
