#!/usr/bin/env python3
"""読み込むファイルに「いつのものか」の印を付ける。

★まーく様のご指摘（2026/11/13）
  直したのに、前のままの画面が出ていました。
  スマホが、前に読んだファイルを覚えていたためです。

★index.html から読む style.css・app.js などに ?v=（日付と時刻）を付けます。
  中身を直すたびにこの数字が変わるので、必ず新しいものが読まれます。
★これを忘れると、また同じことが起きます。
  下見用のページを作り直す道具（sync_preview.py）から必ず呼ぶので、
  忘れようがありません。
"""
import re, pathlib, datetime, hashlib

W = pathlib.Path(__file__).resolve().parent.parent / 'web'
FILES = ['style.css', 'app.js', 'shared.js', 'news.js', 'config.js', 'shared-faces.js']


def stamp():
    """中身から作った印（同じ中身なら同じ印）"""
    h = hashlib.sha1()
    for n in FILES:
        f = W / n
        if f.exists():
            h.update(f.read_bytes())
    return datetime.date.today().strftime('%Y%m%d') + '-' + h.hexdigest()[:8]


def apply(path):
    p = pathlib.Path(path)
    if not p.exists():
        return
    t = p.read_text(encoding='utf-8')
    v = stamp()
    for n in FILES:
        t = re.sub(r'(["\'])' + re.escape(n) + r'(\?v=[0-9a-z-]+)?\1',
                   r'\g<1>' + n + '?v=' + v + r'\g<1>', t)
    p.write_text(t, encoding='utf-8')


if __name__ == '__main__':
    for name in ['index.html', 'admin.html', 'login.html', 'say.html']:
        apply(W / name)
    print('印:', stamp())
