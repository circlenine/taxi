# memo の欄を、PDFから字を入れられる欄として足す（10/8 ご指示）
# ノートの1行に1つずつ、1行の文字欄を置く。打った字は、その行の下線の上に乗る
# ・クイズのスイッチは addchk.py で足してあるので、それに続けて足す
# ・欄の地は透明にして、下に印刷してあるうすい水色の箱を見せる（デザインを変えないため）
# ・字の形は見る側のアプリにまかせる（NeedAppearances）。日本語は、アプリの字で表示される
import json, sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (DictionaryObject, NameObject, ArrayObject, FloatObject, NumberObject,
                           TextStringObject, BooleanObject)
src, pos, out = sys.argv[1:4]
w = PdfWriter(clone_from=PdfReader(src))
P = json.load(open(pos))
af = w._root_object["/AcroForm"]
fields = af["/Fields"]
font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"),
                         NameObject("/BaseFont"): NameObject("/Helvetica"), NameObject("/Encoding"): NameObject("/WinAnsiEncoding")})
af[NameObject("/DR")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/Helv"): w._add_object(font)})})
af[NameObject("/DA")] = TextStringObject("/Helv 11 Tf 0.122 0.165 0.216 rg")
af[NameObject("/NeedAppearances")] = BooleanObject(True)
for i, p in enumerate(P):
    page = w.pages[p["page"]]
    H = float(page.mediabox.height)
    x0, y1 = p["x"], H - p["y"]
    f = DictionaryObject({
        NameObject("/Type"): NameObject("/Annot"), NameObject("/Subtype"): NameObject("/Widget"),
        NameObject("/FT"): NameObject("/Tx"), NameObject("/T"): TextStringObject(f"memo_p{p['page']+1}_{i+1}"),
        NameObject("/V"): TextStringObject(""), NameObject("/DA"): TextStringObject("/Helv 11 Tf 0.122 0.165 0.216 rg"),
        NameObject("/Rect"): ArrayObject([FloatObject(v) for v in (x0, y1 - p["h"], x0 + p["w"], y1)]),
        NameObject("/F"): NumberObject(4), NameObject("/P"): page.indirect_reference,
        NameObject("/MK"): DictionaryObject(),         # 地もふちも付けない
    })
    ref = w._add_object(f)
    if "/Annots" not in page: page[NameObject("/Annots")] = ArrayObject()
    page["/Annots"].append(ref); fields.append(ref)
w.write(out)
print(len(P), "memo fields")
