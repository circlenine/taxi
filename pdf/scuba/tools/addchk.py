# クイズの□を押すと、右の答えの欄が見えるようにする（PDFのチェックボックス）
# 1つの問いに「□」と「答えの欄のふた」の2つの部品を作り、同じ1つのスイッチにつなぐ。
#   □   … 押す前は空、押すとチェックマーク
#   ふた … 押す前は答えの欄と同じ色でふさぐ（＝空白に見える）、押すと消えて、下に印刷してある答えが見える
# ふたも押せるので、答えの欄を直接押しても答えが出る。
import json, sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (DictionaryObject, NameObject, ArrayObject, FloatObject, NumberObject,
                           TextStringObject, BooleanObject, StreamObject)
src, pos, out = sys.argv[1:4]
r = PdfReader(src); w = PdfWriter(); w.append(r)
P = json.load(open(pos))
H = 841.92
COVER = "0.831 0.925 0.980"   # 答えの欄の色（#d4ecfa）と同じ
def form(data, bw, bh):
    s = StreamObject(); s._data = data.encode()
    s.update({NameObject("/Type"): NameObject("/XObject"), NameObject("/Subtype"): NameObject("/Form"),
              NameObject("/BBox"): ArrayObject([FloatObject(0), FloatObject(0), FloatObject(bw), FloatObject(bh)])})
    return w._add_object(s)
def check(k):
    return f"q 0.05 0.25 0.37 RG {k*0.12:.2f} w 1 J 1 j {k*0.2:.2f} {k*0.52:.2f} m {k*0.42:.2f} {k*0.25:.2f} l {k*0.82:.2f} {k*0.8:.2f} l S Q"
def rrect(bw, bh, rad):
    c = rad * 0.5523
    return (f"q {COVER} rg {rad:.2f} 0 m {bw-rad:.2f} 0 l {bw-rad+c:.2f} 0 {bw:.2f} {rad-c:.2f} {bw:.2f} {rad:.2f} c "
            f"{bw:.2f} {bh-rad:.2f} l {bw:.2f} {bh-rad+c:.2f} {bw-rad+c:.2f} {bh:.2f} {bw-rad:.2f} {bh:.2f} c "
            f"{rad:.2f} {bh:.2f} l {rad-c:.2f} {bh:.2f} 0 {bh-rad+c:.2f} 0 {bh-rad:.2f} c "
            f"0 {rad:.2f} l 0 {rad-c:.2f} {rad-c:.2f} 0 {rad:.2f} 0 c f Q")
fields = ArrayObject()
for i, p in enumerate(P):
    page = w.pages[p["page"]]
    parent = DictionaryObject({NameObject("/FT"): NameObject("/Btn"), NameObject("/T"): TextStringObject(f"quiz{i+1}"),
                               NameObject("/V"): NameObject("/Off"), NameObject("/Kids"): ArrayObject()})
    pref = w._add_object(parent)
    H = float(page.mediabox.height)  # ページごとに高さがちがうので、そのページの高さを使う
    s = p["w"]; x0, y1 = p["x"], H - p["y"]
    ax, ay1, aw, ah = p["ax"], H - p["ay"], p["aw"], p["ah"]
    kids = [((x0, y1 - s, x0 + s, y1), form(check(s), s, s), form("", s, s)),
            ((ax, ay1 - ah, ax + aw, ay1), form("", aw, ah), form(rrect(aw, ah, p["ar"]), aw, ah))]
    if "/Annots" not in page: page[NameObject("/Annots")] = ArrayObject()
    for rect, on, off in kids:
        k = DictionaryObject({
            NameObject("/Type"): NameObject("/Annot"), NameObject("/Subtype"): NameObject("/Widget"),
            NameObject("/Parent"): pref, NameObject("/P"): page.indirect_reference,
            NameObject("/Rect"): ArrayObject([FloatObject(v) for v in rect]),
            NameObject("/AS"): NameObject("/Off"), NameObject("/F"): NumberObject(4),
            NameObject("/MK"): DictionaryObject({NameObject("/CA"): TextStringObject("4")}),
            NameObject("/DA"): TextStringObject(f"/ZaDb {s*0.8:.1f} Tf 0.05 0.25 0.37 rg"),
            NameObject("/AP"): DictionaryObject({NameObject("/N"): DictionaryObject({NameObject("/Yes"): on, NameObject("/Off"): off})}),
        })
        kref = w._add_object(k)
        parent["/Kids"].append(kref); page["/Annots"].append(kref)
    fields.append(pref)
w._root_object[NameObject("/AcroForm")] = DictionaryObject({NameObject("/Fields"): fields, NameObject("/NeedAppearances"): BooleanObject(False)})
w.write(out)
print(len(P), "quiz switches")
