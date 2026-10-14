#!/bin/sh
# GitHub へ上げる前に必ず通す確かめ。
# なぜ：このリポジトリが「公開」だと、資料のPDF（YouTubeの画面を含む）や
#       文字起こし（よその方の言葉）が、だれにでも見えてしまう。
#       公開のままなら、それらを上げない。10/14 に見落とした反省から。
vis=$(curl -s https://api.github.com/repos/circlenine/taxi | python3 -c 'import json,sys;print(json.load(sys.stdin).get("visibility","不明"))')
bad=$(git -c core.quotepath=off ls-files pdf | grep -iE '\.pdf$|/transcripts/')
if [ "$vis" != "private" ] && [ -n "$bad" ]; then
  echo "止めました：リポジトリが「$vis」なのに、見せてはいけないものが入っています"
  echo "$bad"
  exit 1
fi
echo "OK（$vis）"
