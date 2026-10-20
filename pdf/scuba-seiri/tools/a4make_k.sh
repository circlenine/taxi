#!/bin/bash
# スマホ版PDFを作る：HTML→写真の枠を測る→枠に合わせて切る→PDF→検査
set -eo pipefail
S=/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad
export NODE_PATH=$(npm root -g)
cd $S/build_k
# 不安にさせる言い回しが無いか（10/15 ご指示・全資料共通）
python3 -I $S/tools/phrasecheck.py $S/tools/content_k.py
python3 $S/tools/a4k.py $S/build_k
# 10/20 まーく様「ページは10ページにとどめて」：10ページを超えたら止める
n=$(grep -o '<div class="page" id="p[0-9]*"' $S/build_k/a4.html | wc -l); if [ "$n" -gt 10 ]; then echo "NG 10ページを超えた（$n ページ）"; exit 1; fi
# 表紙の数字が、わくの中で「左右まん中・上下は気持ち上」か（10/15 ご指示）
python3 -I $S/tools/numcheck.py $S/build_k/num.png $(node $S/tools/numcheck.js $S/build_k/a4.html $S/build_k/num.png)
# 1ページ目（まとめ＋もくじ）がページからはみ出していないか（10/16）
node $S/tools/p1fit.js $S/build_k/a4.html
# PDFは、まーく様の許可が出たときだけ作る（10/15 ご指摘：許可なくPDFを作った）。
# 許可がないときは、ここで止める（見た目の確かめは、HTMLを画像にして見せる）。許可が出たら PDF_OK=1 をつけて動かす
# 10/16：写真の切り出しと、HTMLを見る点検は、PDFを作らないときも動かす（画像で見ていただく前に、崩れに気づくため）
mkdir -p img/s
for f in $(grep -o 'img/s/[a-z0-9_]*\.jpg' a4.html | sort -u); do [ -f "$f" ] || cp img/c05.jpg "$f"; done
node $S/tools/measure.js $S/build_k/a4.html a4sizes.json
python3 -I $S/tools/focus_k.py a4sizes.json img/s
SIDE=14 node $S/tools/mcheck.js $S/build_k/a4.html | tee $S/mcheck_last.txt
# はみ出しガード（10/19）：どのページでも、中身がページの下からはみ出していたら止める（PDFを作らせない）
if grep -q "ページの下にはみ出し" $S/mcheck_last.txt; then echo "NG ページからはみ出している（上を見て直す）"; exit 1; fi
python3 -I $S/tools/toccheck2.py $S/build_k/a4.html
WRAPDUMP=$S/build_k/wrap.json node $S/tools/wrapcheck.js $S/build_k/a4.html
node $S/tools/gapcheck.js $S/build_k/a4.html
python3 $S/tools/wordbreak.py $S/build_k/wrap.json
python3 -I $S/tools/termcheck.py $S/build_k/a4.html
# 読みでまとめる表記ゆれの検査（janome が要る：pip install janome）。ゆれが見つかったら止める
python3 $S/tools/yomicheck.py $S/build_k/a4.html
python3 -I $S/tools/chipcheck.py $S/build_k/a4.html
python3 -I $S/tools/jumpcheck.py $S/build_k/a4.html
node $S/tools/relcheck.js $S/build_k/a4.html
node $S/tools/palette.js $S/build_k/a4.html
node $S/tools/borders.js $S/build_k/a4.html
node $S/tools/chipalign.js $S/build_k/a4.html   # 札の字が箱のまん中にあるか（10/19）
node $S/tools/kerncheck.js $S/build_k/a4.html   # 題・見出しの字のすき間（10/20）
node $S/tools/arrowcheck.js $S/build_k/a4.html   # しおりの札の字が、左右同じ余白か（10/20）
node $S/tools/logocheck.js $S/build_k/a4.html   # にっこりカーブが smile のまん中・左右対称か（10/20）
node $S/tools/sigover.js $S/build_k/a4.html   # 合図の写真の上に字が重なっていないか（10/20）
node $S/tools/barcheck.js $S/build_k/a4.html   # 左の線の太さが、左右の列・どのページでも同じか（10/20）
node $S/tools/latincheck.js $S/build_k/a4.html   # 英数字・記号が細くないか（10/20）
python3 -I $S/tools/tonecheck.py $S/build_k/a4.html   # 言い回し（じゃ！・！の連続）が無いか（10/20）
node $S/tools/fontmix.js $S/build_k/a4.html "$(python3 -c 'import sys;sys.path.insert(0,"'$S'/tools");import fontset as f;print(f._BM[f.BODYMIN][0].strip(chr(34)) if f.MODE=="kaisei" else "")')"   # 本文の中で字がまざっていないか（10/20）
# 10/19 まーく様：2択クイズは入れない／読む順はZ字（列ごとに上から詰めない）。紛れこんだら止める
if grep -q "2択クイズ" a4.html; then echo "止めます：2択クイズが入っています"; exit 1; fi
if grep -q "grid2 cols" a4.html; then echo "止めます：列ごとに上から詰めるページがあります（読む順はZ字）"; exit 1; fi
if [ "${PDF_OK:-}" != "1" ]; then echo "PDFは作っていません（許可待ち）。HTMLだけ作りました: $PWD/a4.html"; exit 0; fi
node $S/tools/print2.js $S/build_k/a4.html $S/build_k/a4.pdf
node $S/tools/chkpos.js $S/build_k/a4.html $S/build_k/a4chk.json
COVER="0.914 0.867 0.969" python3 -I $S/tools/addchk.py $S/build_k/a4.pdf $S/build_k/a4chk.json $S/build_k/a4c.pdf
node $S/tools/memopos.js $S/build_k/a4.html $S/build_k/a4memo.json
python3 -I $S/tools/addmemo.py $S/build_k/a4c.pdf $S/build_k/a4memo.json $S/build_k/a4m.pdf
mv $S/build_k/a4m.pdf $S/build_k/a4c.pdf
$S/tools/pdfimgcheck.sh $S/build_k/a4c.pdf
rm -rf $S/build_k/scr && mkdir -p $S/build_k/scr
node $S/tools/scrshot.js $S/build_k/a4.html $S/build_k/scr $S/build_k/a4scr.json
python3 -I $S/tools/addscr.py $S/build_k/a4c.pdf $S/build_k/a4scr.json $S/build_k/a4s.pdf
mv $S/build_k/a4s.pdf $S/build_k/a4c.pdf
python3 -I $S/tools/fixlinks.py $S/build_k/a4c.pdf $S/build_k/a4l.pdf
mv $S/build_k/a4l.pdf $S/build_k/a4c.pdf
python3 -I $S/tools/lnkcheck.py $S/build_k/a4c.pdf
# 仕上がりのPDFを、ファイル名に「直した日（日本時間）」を入れて置く（10/8 ご指示：日付は必ず直した日に合わせる）
D=$(TZ=Asia/Tokyo date +%y%m%d)
# 「清掃」は使わない。2冊目は「洗浄編」で統一（10/15 ご指示）。HTMLに1つでも残っていたら止める
if grep -q "清掃" $S/build_k/a4.html; then echo "NG 「清掃」が残っている（洗浄に統一する）"; grep -o ".\{0,10\}清掃.\{0,10\}" $S/build_k/a4.html | head -5; exit 1; fi
rm -f $S/out/3_*_ｽｷｭｰﾊﾞ_スキル編_old.pdf
rm -f $S/out/3_*_ｽｷｭｰﾊﾞ_スキル編.pdf
cp $S/build_k/a4c.pdf "$S/out/3_${D}_ｽｷｭｰﾊﾞ_スキル編.pdf"
echo "出力: 3_${D}_ｽｷｭｰﾊﾞ_スキル編.pdf"
# 10/19 新しい形：2ページ目を、作り直した「その1」（libe/p2c.html）に差しかえる。NEWDESIGN=0 なら差しかえない
if [ "${NEWDESIGN:-0}" = "1" ] && [ -f $S/libe/p2c.html ]; then
  node $S/tools/topdf.js $S/libe/p2c.html $S/libe/p2c.pdf
  python3 - "$S/out/3_${D}_ｽｷｭｰﾊﾞ_スキル編.pdf" "$S/libe/p2c.pdf" <<'PY'
import sys
from pypdf import PdfReader, PdfWriter
main, p2 = sys.argv[1], sys.argv[2]
w = PdfWriter(clone_from=PdfReader(main)); w.insert_page(PdfReader(p2).pages[0], 1); w.remove_page(2); w.write(main)
print("2ページ目を、作り直した「その1」に差しかえ")
PY
fi
