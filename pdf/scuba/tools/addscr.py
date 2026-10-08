# 画面で見るときだけの説明（「タップすると〜」など）を、「印刷しない注釈」としてPDFに重ねる（10/8 ご指示：印刷では消す）
# ・本文には印刷しない（a4.html を印刷するときに .scr を見えなくしてある）
# ・注釈の印（/F）は「印刷する」を付けない。見る画面には出るが、プリンタには出ない
# ・動かしたり消したりできないよう、ロックする
import json, sys, zlib
from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, NameObject, ArrayObject, FloatObject, NumberObject, StreamObject, TextStringObject
src, pos, out = sys.argv[1:4]
w = PdfWriter(clone_from=PdfReader(src))
P = json.load(open(pos))
def stream(data, d):
    s = StreamObject(); s._data = data; s.update(d); return w._add_object(s)
for i, p in enumerate(P):
    page = w.pages[p["page"]]; H = float(page.mediabox.height)
    im = Image.open(p["img"]).convert("RGBA"); iw, ih = im.size
    rgb = zlib.compress(im.convert("RGB").tobytes()); a = zlib.compress(im.getchannel("A").tobytes())
    base = {NameObject("/Type"): NameObject("/XObject"), NameObject("/Subtype"): NameObject("/Image"),
            NameObject("/Width"): NumberObject(iw), NameObject("/Height"): NumberObject(ih),
            NameObject("/BitsPerComponent"): NumberObject(8), NameObject("/Filter"): NameObject("/FlateDecode")}
    smask = stream(a, {**base, NameObject("/ColorSpace"): NameObject("/DeviceGray")})
    img = stream(rgb, {**base, NameObject("/ColorSpace"): NameObject("/DeviceRGB"), NameObject("/SMask"): smask})
    bw, bh = p["w"], p["h"]
    ap = stream(f"q {bw:.2f} 0 0 {bh:.2f} 0 0 cm /Im0 Do Q".encode(), {
        NameObject("/Type"): NameObject("/XObject"), NameObject("/Subtype"): NameObject("/Form"),
        NameObject("/BBox"): ArrayObject([FloatObject(0), FloatObject(0), FloatObject(bw), FloatObject(bh)]),
        NameObject("/Resources"): DictionaryObject({NameObject("/XObject"): DictionaryObject({NameObject("/Im0"): img})})})
    x0, y1 = p["x"], H - p["y"]
    an = DictionaryObject({
        NameObject("/Type"): NameObject("/Annot"), NameObject("/Subtype"): NameObject("/Stamp"),
        NameObject("/Rect"): ArrayObject([FloatObject(v) for v in (x0, y1 - bh, x0 + bw, y1)]),
        NameObject("/F"): NumberObject(128 + 512),   # 印刷しない（4を付けない）・ロック・中身もロック
        NameObject("/NM"): TextStringObject(f"screen-only-{i}"), NameObject("/P"): page.indirect_reference,
        NameObject("/AP"): DictionaryObject({NameObject("/N"): ap})})
    if "/Annots" not in page: page[NameObject("/Annots")] = ArrayObject()
    page["/Annots"].insert(0, w._add_object(an))   # いちばん下に入れる（memo やクイズを押すじゃまをしない）
w.write(out)
print(len(P), "screen-only notes (not printed)")
