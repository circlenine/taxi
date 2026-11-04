#!/bin/bash
# スーツ編のPDFだけを作る（11/4 まーく様「毎回遅い。日付を入れるのはいちばん最後に。キリの良い ??:00 で」）
#  ・HTMLの組み立てと点検は、直すたびに a4make_w.sh で済ませておく（ここではやり直さない）
#  ・ここでは、最後に「更新日時」をいまの時刻（日本時間・分は00に切り下げ）に書きかえてから、PDFにする
set -eo pipefail
S=/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad
export NODE_PATH=$(npm root -g)
cd $S/build_w
[ -f a4.html ] || { echo "NG 先に a4make_w.sh で組み立てて、点検を通す"; exit 1; }
STAMP=$(TZ=Asia/Tokyo python3 -c "import datetime as d;n=d.datetime.now();w='月火水木金土日'[n.weekday()];h=n.hour;print(f'更新日時：{n:%Y/%m/%d}({w}) '+('AM' if h<12 else 'PM')+f'{h:02d}:00')")
python3 - "$STAMP" <<'PY'
import re,sys
p="a4.html";s=open(p,encoding="utf-8").read()
s2,n=re.subn(r"更新日時：\d{4}/\d{2}/\d{2}\(.\) (AM|PM)\d{2}:\d{2}",sys.argv[1],s)
if n==0: sys.exit("NG 更新日時が見つからない")
open(p,"w",encoding="utf-8").write(s2); print("日付を入れた：",sys.argv[1],f"（{n}か所）")
PY
node $S/tools/print2.js $S/build_w/a4.html $S/build_w/a4.pdf
node $S/tools/chkpos.js $S/build_w/a4.html $S/build_w/a4chk.json
COVER="0.831 0.933 0.882" python3 -I $S/tools/addchk.py $S/build_w/a4.pdf $S/build_w/a4chk.json $S/build_w/a4c.pdf
python3 -I $S/tools/chkcheck.py $S/build_w/a4.pdf $S/build_w/a4chk.json || exit 1   # ✓が□とぴったり重なるか（11/2 ✓が下にずれていた）
node $S/tools/memopos.js $S/build_w/a4.html $S/build_w/a4memo.json
python3 -I $S/tools/addmemo.py $S/build_w/a4c.pdf $S/build_w/a4memo.json $S/build_w/a4m.pdf
mv $S/build_w/a4m.pdf $S/build_w/a4c.pdf
$S/tools/pdfimgcheck.sh $S/build_w/a4c.pdf
rm -rf $S/build_w/scr && mkdir -p $S/build_w/scr
node $S/tools/scrshot.js $S/build_w/a4.html $S/build_w/scr $S/build_w/a4scr.json
python3 -I $S/tools/addscr.py $S/build_w/a4c.pdf $S/build_w/a4scr.json $S/build_w/a4s.pdf
mv $S/build_w/a4s.pdf $S/build_w/a4c.pdf
python3 -I $S/tools/fixlinks.py $S/build_w/a4c.pdf $S/build_w/a4l.pdf
mv $S/build_w/a4l.pdf $S/build_w/a4c.pdf
python3 -I $S/tools/lnkcheck.py $S/build_w/a4c.pdf
# 仕上がりのPDFを、ファイル名に「直した日（日本時間）」を入れて置く（10/8 ご指示：日付は必ず直した日に合わせる）
D=$(TZ=Asia/Tokyo date +%y%m%d)
rm -f $S/out/4_*_ｽｷｭｰﾊﾞ_ｽｰﾂ編.pdf $S/out/4_*_ｽｷｭｰﾊﾞ_ｽｰﾂ編_答え.pdf $S/out/4_*_ｽｰﾂ編_ｸｲｽﾞの答え.jpg
cp $S/build_w/a4c.pdf "$S/out/4_${D}_ｽｷｭｰﾊﾞ_ｽｰﾂ編.pdf"
echo "出力: 4_${D}_ｽｷｭｰﾊﾞ_ｽｰﾂ編.pdf"
# 10/27 まーく様「各クイズの答えも見せた状態のものも送って」→「今度からスクショ画像だけで載せて、ややこしい」
#   答えを出した版はPDFにしない。最後のページ（クイズ）だけを画像にして残し、仮のPDFは消す
python3 -I $S/tools/ansver.py "$S/out/4_${D}_ｽｷｭｰﾊﾞ_ｽｰﾂ編.pdf" "$S/build_w/ans_tmp.pdf"
N=$(pdfinfo "$S/build_w/ans_tmp.pdf" 2>/dev/null | awk '/^Pages/{print $2}')
pdftoppm -f $N -l $N -r 150 -jpeg -singlefile "$S/build_w/ans_tmp.pdf" "$S/out/4_${D}_ｽｰﾂ編_ｸｲｽﾞの答え" 2>/dev/null
rm -f "$S/build_w/ans_tmp.pdf"
echo "クイズの答えの画像: 4_${D}_ｽｰﾂ編_ｸｲｽﾞの答え.jpg"
