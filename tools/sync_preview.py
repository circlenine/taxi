#!/usr/bin/env python3
"""下見用のページ（web/preview/）を、本番（web/）から作り直す。

★2026/11/12 のしくじりを二度と起こさないために作りました。
  本番のファイルをそのまま上書きコピーしたせいで、
  下見用の目じるし（赤い帯と、題の「（下見）」）を消してしまいました。
  ここを通せば、帯は必ず付け直されます。
"""
import pathlib
W = pathlib.Path(__file__).resolve().parent.parent / 'web'
P = W / 'preview'
BAR = ('<div class="pvbar">ここは<b>下見用</b>のページです。本番は\n'
       '  <a href="/">こちら</a>。まだ本番には反映していません。</div>')

for f in sorted(P.glob('*')):
    src = W / f.name
    if not src.is_file():
        continue
    t = src.read_text(encoding='utf-8')
    if f.name == 'index.html':
        t = t.replace('<title>TAXI NOTE</title>', '<title>TAXI NOTE（下見）</title>', 1)
        L = t.split('\n')
        at = next(i for i, ln in enumerate(L) if '<body' in ln) + 1
        L.insert(at, BAR)
        t = '\n'.join(L)
    f.write_text(t, encoding='utf-8')
    print('なおした:', f.name)
