#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
顔とひとことだけを取り出して、web/shared-faces.js を作ります。

★なぜ要るか
  一覧のページ（web/say.html）は、顔とひとことだけを見たい紙です。
  web/shared.js をそのまま読むと、台帳につなぐところで止まります
  （台帳の鍵も、つなぐ道具も、この紙には要らないため）。
  そこで「顔とひとことの ところだけ」を切り出して、別の紙にします。

★中身は1か所（web/shared.js）で直します。
  ここを動かしたら、必ず これを走らせ直してください。
  ずれていないかを見つけるテストが gas/test/webnews.test.js にあります。

  使い方:  python3 tools/build_faces.py
"""
import io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC  = os.path.join(ROOT, "web", "shared.js")
OUT  = os.path.join(ROOT, "web", "shared-faces.js")

HEAD_MARK = "const FACE_BAD_EYES"
TAIL_MARK = "/* ------------------------------------------------------------\n *  ふきだしの字の大きさ"

HEADER = """/* ============================================================
 *  顔とひとこと（一覧のページ用）
 *
 *  ★この紙は、自動で作られます。ここを直しても、次に作り直すと消えます。
 *    直すのは  web/shared.js  です。
 *    直したら  python3 tools/build_faces.py  を走らせてください。
 * ========================================================== */
"""


def main():
    s = io.open(SRC, encoding="utf-8").read()
    i = s.find(HEAD_MARK)
    j = s.find(TAIL_MARK)
    if i == -1 or j == -1 or j <= i:
        print("切り出す場所が見つかりません", file=sys.stderr)
        return 1
    body = s[i:j].rstrip() + "\n"
    io.open(OUT, "w", encoding="utf-8").write(HEADER + body)
    print("作りました: web/shared-faces.js（%d行）" % (body.count("\n") + 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
