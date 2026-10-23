#!/bin/bash
# スマホ版PDFを作る：HTML→写真の枠を測る→枠に合わせて切る→PDF→検査
set -eo pipefail
S=/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad
export NODE_PATH=$(npm root -g)
# 10/21 点検の読みこみが、まれに「ページが読み直された」で止まる（中身の不具合ではない）。そのときだけ、3回まで読み直す
node() { local i out rc; for i in 1 2 3; do out=$(command node "$@" 2>&1) && rc=0 || rc=$?; if [ $rc -ne 0 ] && echo "$out" | grep -q "Execution context was destroyed"; then continue; fi; echo "$out"; return $rc; done; echo "$out"; return $rc; }
cd $S/build_s
# 不安にさせる言い回しが無いか（10/15 ご指示・全資料共通）
python3 -I $S/tools/phrasecheck.py $S/tools/content_s.py
python3 $S/tools/a4s.py $S/build_s
# 10/20 まーく様「最大でも10ページ」：10ページを超えたら止める
n=$(grep -o '<div class="page" id="p[0-9]*"' $S/build_s/a4.html | wc -l); if [ "$n" -gt 10 ]; then echo "NG 10ページを超えた（$n ページ）"; exit 1; fi
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
python3 -I $S/tools/badgeset.py $S/build_s/a4.html img/s/badge.json   # ▶ の印を置くすみ（見せたい部分・赤い印にかからない所。10/21）
SIDE=14 node $S/tools/mcheck.js $S/build_s/a4.html | tee $S/mcheck_last.txt
# はみ出しガード（10/19）：どのページでも、中身がページの下からはみ出していたら止める（PDFを作らせない）
if grep -q "ページの下にはみ出し" $S/mcheck_last.txt; then echo "NG ページからはみ出している（上を見て直す）"; exit 1; fi
python3 -I $S/tools/toccheck2.py $S/build_s/a4.html
# 10/23 まーく様「指摘する以外の表記ゆれがないか、全て確認できているのか」：3冊をまとめて、読みが同じで書き方がちがう言葉を調べる
python3 -I $S/tools/yomicheck.py $(ls $S/build/a4.html $S/build_s/a4.html $S/build_k/a4.html 2>/dev/null)
python3 -I $S/tools/kanjicheck.py $(ls $S/build/a4.html $S/build_s/a4.html $S/build_k/a4.html 2>/dev/null)
python3 -I $S/tools/reqcheck.py 洗浄 $S/build_s/a4.html || exit 1
# 10/23 まーく様「改行が多すぎるのは良くない」：最後の行が数文字だけの文があれば止める
o=$(node $S/tools/orphcheck.js $S/build_s/a4.html); if [ -n "$o" ]; then echo "$o"; echo "NG 最後の行が数文字だけの文がある（言い方を変えて詰める）"; exit 1; fi
python3 -I $S/tools/csscheck.py $S/build_s/a4.html   # CSS のコメントの閉じ忘れ（10/22）
node $S/tools/overlap.js $S/build_s/a4.html   # 字と字が重なっていないか、1字ずつ測る（10/22 まーく様「文字と文字が重なりまくり」）
WRAPDUMP=$S/build_s/wrap.json node $S/tools/wrapcheck.js $S/build_s/a4.html
node $S/tools/gapcheck.js $S/build_s/a4.html
python3 $S/tools/wordbreak.py $S/build_s/wrap.json
python3 -I $S/tools/termcheck.py $S/build_s/a4.html
# 読みでまとめる表記ゆれの検査（janome が要る：pip install janome）。ゆれが見つかったら止める
python3 $S/tools/yomicheck.py $S/build_s/a4.html
python3 -I $S/tools/chipcheck.py $S/build_s/a4.html
python3 $S/tools/upcheck.py
python3 -I $S/tools/jumpcheck.py $S/build_s/a4.html
python3 -I $S/tools/pageorder.py $S/build_s/a4.html   # くわしくはのページが、表の中で順に並んでいるか（10/21）
HIRA_MIN=7 HIRA_ALLOW='【くわえるところを】|【くわえるところも】|【ができないときもあるから】|【ぶこともあるよ】|【のふちにそろえる】|【らなくなるまで】|【らへんにあるよ】|【ぶらぶらさせない】|【てくることもあるよ】|【がないこともあるよ】|【わせてくれるよ】|【いたままにしておけば】|【けにくいときは】|【になっているので】|【すぐやることは】|【さずにおくのは】|【をふくらませる】' node $S/tools/hiracheck.js $S/build_s/a4.html   # ひらがなが長く続く所（10/22 見直し済みのものだけ通す）
node $S/tools/relcheck.js $S/build_s/a4.html
node $S/tools/palette.js $S/build_s/a4.html
node $S/tools/borders.js $S/build_s/a4.html
node $S/tools/chipalign.js $S/build_s/a4.html   # 札の字が箱のまん中にあるか（10/19）
node $S/tools/kerncheck.js $S/build_s/a4.html   # 題・見出しの字のすき間（10/20）
node $S/tools/arrowcheck.js $S/build_s/a4.html   # しおりの札の字が、左右同じ余白か（10/20）
node $S/tools/logocheck.js $S/build_s/a4.html   # にっこりカーブが smile のまん中・左右対称か（10/20）
node $S/tools/barcheck.js $S/build_s/a4.html   # 左の線の太さが、左右の列・どのページでも同じか（10/20）
node $S/tools/badgecheck.js $S/build_s/a4.html   # ▶ の印が全部の写真にあり、写真の中に収まっているか（10/21）
node $S/tools/photocover.js $S/build_s/a4.html   # 写真の上に、何もかぶっていないか（10/21 写真が全部隠れた）
node $S/tools/photoalign.js $S/build_s/a4.html   # まとめの写真が、題の行数でずれていないか（10/20）
node $S/tools/latincheck.js $S/build_s/a4.html   # 英数字・記号が細くないか（10/20）
python3 -I $S/tools/tonecheck.py $S/build_s/a4.html   # 言い回し（じゃ！・！の連続）が無いか（10/20）
node $S/tools/fontmix.js $S/build_s/a4.html "$(python3 -c 'import sys;sys.path.insert(0,"'$S'/tools");import fontset as f;print(f._BM[f.BODYMIN][0].strip(chr(34)) if f.MODE=="kaisei" else "")')"   # 本文の中で字がまざっていないか（10/20）
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
rm -f $S/out/2_*_ｽｷｭｰﾊﾞ_洗浄編.pdf
cp $S/build_s/a4c.pdf "$S/out/2_${D}_ｽｷｭｰﾊﾞ_洗浄編.pdf"
echo "出力: 2_${D}_ｽｷｭｰﾊﾞ_洗浄編.pdf"
