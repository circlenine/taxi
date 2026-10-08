#!/bin/bash
# PDFの中の画像が「写真だけ」かを調べる。
# ぼかした影や半透明の重なりは、Chromeが灰色の画像にしてPDFに入れ、iPhoneでは灰色の板に見える（10/7 実際に起きた）
n=$(pdfimages -list "$1" | awk 'NR>2 && $6!="icc"' | wc -l)
if [ "$n" -eq 0 ]; then echo "PDFの画像 OK（写真だけ）"; else echo "NG 写真以外の画像が $n 個（影や半透明の重なりが画像になっている）"; exit 1; fi
