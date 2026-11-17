#!/usr/bin/env python3
"""見た目の試しのページ（web/try/）を、本番（web/）から作り直す。

★まーく様のご指示（2026/11/17）
  「残っているのは、Taxi-Board を参考にした見た目の作り直し。
    こちらは、比較したいので 本番ではなく、テスト用に作成して」

★本番と違うのは try.css だけです。
  中身（動き・計算・記録）は、本番とまったく同じものを読みます。
  だから、見た目を比べるだけで、記録が食い違うことはありません。
★try.css は、ここでは作り直しません（手で書いたものだからです）。
★sync_preview.py から呼ばれるので、通し忘れが起きません。
"""
import pathlib
import re
import shutil

HERE = pathlib.Path(__file__).resolve().parent
W = HERE.parent / 'web'
T = W / 'try'

BAR = ('<div class="trybar">ここは<b>見た目の試し</b>のページです。'
       '中身は本番と同じものです。本番は\n'
       '  <a href="/">こちら</a>。</div>')

# 絵のフォルダも、まるごとそろえます
if (W / 'img').is_dir():
    (T / 'img').mkdir(parents=True, exist_ok=True)
    for im in sorted((W / 'img').glob('*')):
        if im.is_file():
            shutil.copy2(im, T / 'img' / im.name)

for f in sorted(T.glob('*')):
    if f.name == 'try.css' or f.is_dir():
        continue          # 手で書いたものは、作り直しません
    src = W / f.name
    if not src.is_file():
        continue
    t = src.read_text(encoding='utf-8')
    if f.name == 'index.html':
        t = t.replace('<title>TAXI NOTE</title>',
                      '<title>TAXI NOTE（見た目の試し）</title>', 1)
        # 本番の style.css の「あと」に、試しの上がけを足します
        m = re.search(r'<link rel="stylesheet" href="style\.css\?v=([^"]+)">', t)
        ver = m.group(1) if m else '1'
        t = t.replace(m.group(0) if m else '<link rel="stylesheet" href="style.css">',
                      (m.group(0) if m else '<link rel="stylesheet" href="style.css">') +
                      '\n<link rel="stylesheet" href="try.css?v=' + ver + '">', 1)
        L = t.split('\n')
        at = next(i for i, ln in enumerate(L) if '<body' in ln) + 1
        L.insert(at, BAR)
        t = '\n'.join(L)
    f.write_text(t, encoding='utf-8')
    print('そろえた（試し）:', f.name)
