#!/bin/bash
# スマホ版PDFを作る：HTML→写真の枠を測る→枠に合わせて切る→PDF→検査
set -eo pipefail
S=/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad
export NODE_PATH=$(npm root -g)
cd $S/build
# 不安にさせる言い回しが無いか（10/15 ご指示・全資料共通）
python3 -I $S/tools/phrasecheck.py $S/tools/content.py
python3 $S/tools/a4.py $S/build
# 表紙の数字が、わくの中で「左右まん中・上下は気持ち上」か（10/15 ご指示）
python3 -I $S/tools/numcheck.py $S/build/num.png $(node $S/tools/numcheck.js $S/build/a4.html $S/build/num.png)
# 1ページ目（まとめ＋もくじ）がページからはみ出していないか（10/16）
node $S/tools/p1fit.js $S/build/a4.html
# PDFは、まーく様の許可が出たときだけ作る（10/15 ご指摘：許可なくPDFを作った）。
# 許可がないときは、ここで止める（見た目の確かめは、HTMLを画像にして見せる）。許可が出たら PDF_OK=1 をつけて動かす
# 10/16：写真の切り出しと、HTMLを見る点検は、PDFを作らないときも動かす（画像で見ていただく前に、崩れに気づくため）
mkdir -p img/s
for f in $(grep -o 'img/s/[a-z0-9_]*\.jpg' a4.html | sort -u); do [ -f "$f" ] || cp img/c05.jpg "$f"; done
node $S/tools/measure.js $S/build/a4.html a4sizes.json
python3 -I $S/tools/focus.py a4sizes.json img/s
SIDE=14 node $S/tools/mcheck.js $S/build/a4.html | tee $S/mcheck_last.txt
# はみ出しガード（10/19）：どのページでも、中身がページの下からはみ出していたら止める（PDFを作らせない）
if grep -q "ページの下にはみ出し" $S/mcheck_last.txt; then echo "NG ページからはみ出している（上を見て直す）"; exit 1; fi
python3 -I $S/tools/toccheck2.py $S/build/a4.html
node $S/tools/wrapcheck.js $S/build/a4.html
node $S/tools/gapcheck.js $S/build/a4.html
python3 -I $S/tools/pairalign.py $S/build/img/s
python3 -I $S/tools/markreview.py $S/build/img/s $S/build/review_marks.png
python3 -I $S/tools/termcheck.py $S/build/a4.html
# 読みでまとめる表記ゆれの検査（janome が要る：pip install janome）。ゆれが見つかったら止める
python3 $S/tools/yomicheck.py $S/build/a4.html
python3 -I $S/tools/chipcheck.py $S/build/a4.html
node $S/tools/palette.js $S/build/a4.html
node $S/tools/borders.js $S/build/a4.html
node $S/tools/chipalign.js $S/build/a4.html   # 札の字が箱のまん中にあるか（10/19）
if [ "${PDF_OK:-}" != "1" ]; then echo "PDFは作っていません（許可待ち）。HTMLだけ作りました: $PWD/a4.html"; exit 0; fi
node $S/tools/print2.js $S/build/a4.html $S/build/a4.pdf
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
rm -f $S/out/1_*_ｽｷｭｰﾊﾞ_器材準備編.pdf   # 10/19 名前から「器材」を外した（古い名前のPDFを残さない）
rm -f $S/out/1_*_ｽｷｭｰﾊﾞ_準備編.pdf
cp $S/build/a4c.pdf "$S/out/1_${D}_ｽｷｭｰﾊﾞ_準備編.pdf"
echo "出力: 1_${D}_ｽｷｭｰﾊﾞ_準備編.pdf"
