#!/bin/bash
# スマホ版PDFを作る：HTML→写真の枠を測る→枠に合わせて切る→PDF→検査
set -eo pipefail
S=/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad
export NODE_PATH=$(npm root -g)
cd $S/build_s
# 不安にさせる言い回しが無いか（10/15 ご指示・全資料共通）
python3 -I $S/tools/phrasecheck.py $S/tools/content_s.py
python3 $S/tools/a4s.py $S/build_s
# 表紙の数字が、わくの中で「左右まん中・上下は気持ち上」か（10/15 ご指示）
python3 -I $S/tools/numcheck.py $S/build_s/num.png $(node $S/tools/numcheck.js $S/build_s/a4.html $S/build_s/num.png)
# 1ページ目（まとめ＋もくじ）がページからはみ出していないか（10/16）
node $S/tools/p1fit.js $S/build_s/a4.html
# PDFは、まーく様の許可が出たときだけ作る（10/15 ご指摘：許可なくPDFを作った）。
# 許可がないときは、ここで止める（見た目の確かめは、HTMLを画像にして見せる）。許可が出たら PDF_OK=1 をつけて動かす
# 10/16：写真の切り出しと、HTMLを見る点検は、PDFを作らないときも動かす（画像で見ていただく前に、崩れに気づくため）
mkdir -p img/s
for f in $(grep -o 'img/s/[a-z0-9_]*\.jpg' a4.html | sort -u); do [ -f "$f" ] || cp img/c05.jpg "$f"; done
node $S/tools/measure.js $S/build_s/a4.html a4sizes.json
python3 -I $S/tools/focus_s.py a4sizes.json img/s
SIDE=14 node $S/tools/mcheck.js $S/build_s/a4.html | tee $S/mcheck_last.txt
# はみ出しガード（10/19）：どのページでも、中身がページの下からはみ出していたら止める（PDFを作らせない）
if grep -q "ページの下にはみ出し" $S/mcheck_last.txt; then echo "NG ページからはみ出している（上を見て直す）"; exit 1; fi
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
if [ "${PDF_OK:-}" != "1" ]; then echo "PDFは作っていません（許可待ち）。HTMLだけ作りました: $PWD/a4.html"; exit 0; fi
node $S/tools/print2.js $S/build_s/a4.html $S/build_s/a4.pdf
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
# 「清掃」は使わない。2冊目は「洗浄編」で統一（10/15 ご指示）。HTMLに1つでも残っていたら止める
if grep -q "清掃" $S/build_s/a4.html; then echo "NG 「清掃」が残っている（洗浄に統一する）"; grep -o ".\{0,10\}清掃.\{0,10\}" $S/build_s/a4.html | head -5; exit 1; fi
rm -f $S/out/2_*_ｽｷｭｰﾊﾞ_器材清掃編.pdf
rm -f $S/out/2_*_ｽｷｭｰﾊﾞ_器材洗浄編.pdf
cp $S/build_s/a4c.pdf "$S/out/2_${D}_ｽｷｭｰﾊﾞ_器材洗浄編.pdf"
echo "出力: 2_${D}_ｽｷｭｰﾊﾞ_器材洗浄編.pdf"
