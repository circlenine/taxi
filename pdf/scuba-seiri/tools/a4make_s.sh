#!/bin/bash
# スマホ版PDFを作る：HTML→写真の枠を測る→枠に合わせて切る→PDF→検査
set -eo pipefail
S=/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad
export NODE_PATH=$(npm root -g)
cd $S/build_s
python3 $S/tools/a4s.py $S/build_s
mkdir -p img/s
for f in $(grep -o 'img/s/[a-z0-9_]*\.jpg' a4.html | sort -u); do [ -f "$f" ] || cp img/c05.jpg "$f"; done
node $S/tools/measure.js $S/build_s/a4.html a4sizes.json
python3 -I $S/tools/focus_s.py a4sizes.json img/s
node $S/tools/print2.js $S/build_s/a4.html $S/build_s/a4.pdf
SIDE=14 node $S/tools/mcheck.js $S/build_s/a4.html
python3 -I $S/tools/toccheck2.py $S/build_s/a4.html
WRAPDUMP=$S/build_s/wrap.json node $S/tools/wrapcheck.js $S/build_s/a4.html
node $S/tools/gapcheck.js $S/build_s/a4.html
python3 $S/tools/wordbreak.py $S/build_s/wrap.json
python3 -I $S/tools/termcheck.py $S/build_s/a4.html
# 読みでまとめる表記ゆれの検査（janome が要る：pip install janome）。ゆれが見つかったら止める
python3 $S/tools/yomicheck.py $S/build_s/a4.html
python3 -I $S/tools/chipcheck.py $S/build_s/a4.html
python3 $S/tools/upcheck.py
python3 -I $S/tools/jumpcheck.py $S/build_s/a4.html
node $S/tools/relcheck.js $S/build_s/a4.html
node $S/tools/palette.js $S/build_s/a4.html
node $S/tools/borders.js $S/build_s/a4.html
node $S/tools/chkpos.js $S/build_s/a4.html $S/build_s/a4chk.json
COVER="1.000 0.886 0.800" python3 -I $S/tools/addchk.py $S/build_s/a4.pdf $S/build_s/a4chk.json $S/build_s/a4c.pdf
node $S/tools/memopos.js $S/build_s/a4.html $S/build_s/a4memo.json
python3 -I $S/tools/addmemo.py $S/build_s/a4c.pdf $S/build_s/a4memo.json $S/build_s/a4m.pdf
mv $S/build_s/a4m.pdf $S/build_s/a4c.pdf
$S/tools/pdfimgcheck.sh $S/build_s/a4c.pdf
rm -rf $S/build_s/scr && mkdir -p $S/build_s/scr
node $S/tools/scrshot.js $S/build_s/a4.html $S/build_s/scr $S/build_s/a4scr.json
python3 -I $S/tools/addscr.py $S/build_s/a4c.pdf $S/build_s/a4scr.json $S/build_s/a4s.pdf
mv $S/build_s/a4s.pdf $S/build_s/a4c.pdf
python3 -I $S/tools/fixlinks.py $S/build_s/a4c.pdf $S/build_s/a4l.pdf
mv $S/build_s/a4l.pdf $S/build_s/a4c.pdf
python3 -I $S/tools/lnkcheck.py $S/build_s/a4c.pdf
# 仕上がりのPDFを、ファイル名に「直した日（日本時間）」を入れて置く（10/8 ご指示：日付は必ず直した日に合わせる）
D=$(TZ=Asia/Tokyo date +%y%m%d)
rm -f $S/out/2_*_ｽｷｭｰﾊﾞ_器材清掃編.pdf
cp $S/build_s/a4c.pdf "$S/out/2_${D}_ｽｷｭｰﾊﾞ_器材清掃編.pdf"
echo "出力: 2_${D}_ｽｷｭｰﾊﾞ_器材清掃編.pdf"
