#!/bin/bash
# スマホ版PDFを作る：HTML→写真の枠を測る→枠に合わせて切る→PDF→検査
set -eo pipefail
S=/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad
export NODE_PATH=$(npm root -g)
cd $S/build
python3 $S/tools/a4.py $S/build
mkdir -p img/s
for f in $(grep -o 'img/s/[a-z0-9_]*\.jpg' a4.html | sort -u); do [ -f "$f" ] || cp img/c05.jpg "$f"; done
node $S/tools/measure.js $S/build/a4.html a4sizes.json
python3 -I $S/tools/focus.py a4sizes.json img/s
node $S/tools/print2.js $S/build/a4.html $S/build/a4.pdf
SIDE=14 node $S/tools/mcheck.js $S/build/a4.html
python3 -I $S/tools/toccheck2.py $S/build/a4.html
node $S/tools/wrapcheck.js $S/build/a4.html
python3 -I $S/tools/pairalign.py $S/build/img/s
python3 -I $S/tools/markreview.py $S/build/img/s $S/build/review_marks.png
python3 -I $S/tools/termcheck.py $S/build/a4.html
# 読みでまとめる表記ゆれの検査（janome が要る：pip install janome）。確認待ちのものが残っている間は、止めずに知らせるだけ
python3 $S/tools/yomicheck.py $S/build/a4.html || echo "↑ 表記ゆれ：まーくさんに確認中のもの"
python3 -I $S/tools/chipcheck.py $S/build/a4.html
node $S/tools/palette.js $S/build/a4.html
node $S/tools/borders.js $S/build/a4.html
node $S/tools/chkpos.js $S/build/a4.html $S/build/a4chk.json
python3 -I $S/tools/addchk.py $S/build/a4.pdf $S/build/a4chk.json $S/build/a4c.pdf
node $S/tools/memopos.js $S/build/a4.html $S/build/a4memo.json
python3 -I $S/tools/addmemo.py $S/build/a4c.pdf $S/build/a4memo.json $S/build/a4m.pdf
mv $S/build/a4m.pdf $S/build/a4c.pdf
$S/tools/pdfimgcheck.sh $S/build/a4c.pdf
rm -rf $S/build/scr && mkdir -p $S/build/scr
node $S/tools/scrshot.js $S/build/a4.html $S/build/scr $S/build/a4scr.json
python3 -I $S/tools/addscr.py $S/build/a4c.pdf $S/build/a4scr.json $S/build/a4s.pdf
mv $S/build/a4s.pdf $S/build/a4c.pdf
python3 -I $S/tools/fixlinks.py $S/build/a4c.pdf $S/build/a4l.pdf
mv $S/build/a4l.pdf $S/build/a4c.pdf
python3 -I $S/tools/lnkcheck.py $S/build/a4c.pdf
# 仕上がりのPDFを、ファイル名に「直した日（日本時間）」を入れて置く（10/8 ご指示：日付は必ず直した日に合わせる）
D=$(TZ=Asia/Tokyo date +%y%m%d)
rm -f $S/out/1_*_ｽｷｭｰﾊﾞ_機材準備編.pdf
cp $S/build/a4c.pdf "$S/out/1_${D}_ｽｷｭｰﾊﾞ_機材準備編.pdf"
echo "出力: 1_${D}_ｽｷｭｰﾊﾞ_機材準備編.pdf"
