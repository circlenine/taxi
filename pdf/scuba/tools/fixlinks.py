# もくじの行き先を、iPhone でもページの頭にぴったり飛ぶ形に直す（10/8 ご指摘：もくじで飛ぶと、ページの途中に着いた）
# Chrome が書く行き先は「名前つきの行き先（/p4 など）＋ページの上はしの座標（XYZ）」。
# iPhone はこの座標の扱いがずれて、前のページの下のほうに着いてしまう。
# そこで、行き先を「そのページを画面に合わせて丸ごと見せる（/Fit）」に書きかえる。座標を使わないので、ずれない
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject
src, out = sys.argv[1:3]
w = PdfWriter(clone_from=PdfReader(src))
r = PdfReader(src)
# 名前 → ページ番号（0から）
names = {k: r.get_destination_page_number(v) for k, v in r.named_destinations.items()}
n = 0
for pg in w.pages:
    for a in pg.get("/Annots") or []:
        o = a.get_object()
        if o.get("/Subtype") != "/Link" or "/Dest" not in o: continue
        d = o["/Dest"]; key = str(d)
        if key not in names: continue
        o[NameObject("/Dest")] = ArrayObject([w.pages[names[key]].indirect_reference, NameObject("/Fit")])
        n += 1
w.write(out)
print(n, "もくじの行き先をページの頭（/Fit）に直した")
