#!/usr/bin/env python3
# YouTube の URL を渡すと、文字起こし（時刻つき）・題名・投稿者を取ってくる道具。
# なぜ：YouTube 本体はこの作業場所からの取りこみを止めているため、
#       まーく様に教わった文字起こしサイト（yoututranscript.com）の
#       ページに書かれている文字を読む。時刻があると、スクショの場面を
#       「何分何秒」と頼めるので、いっしょに残す。
# 使い方：python3 getscript.py <URL> [保存先フォルダ]
import html, json, re, sys, urllib.request

def vid(u):
    m = re.search(r'(?:youtu\.be/|v=|/shorts/|/live/)([A-Za-z0-9_-]{11})', u)
    if not m:
        sys.exit("URLから動画の番号が読めませんでした: " + u)
    return m.group(1)

def get(u):
    r = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(r, timeout=60).read().decode("utf-8")

v = vid(sys.argv[1])
out = sys.argv[2] if len(sys.argv) > 2 else "."
meta = json.loads(get(f"https://www.youtube.com/oembed?url=https://youtu.be/{v}&format=json"))
page = get(f"https://yoututranscript.com/transcript/{v}")
rows = re.findall(r'title="Play the video from ([0-9:]+)"[^>]*>[^<]*</a><p[^>]*>(.*?)</p>', page, re.S)
if not rows:
    # 字幕がない動画・サイトの作りが変わった、のどちらか。黙って空を保存しない。
    sys.exit("文字起こしが見つかりませんでした（字幕なし、またはサイトの作りが変わった）")
with open(f"{out}/{v}.txt", "w", encoding="utf-8") as f:
    for t, s in rows:
        f.write(f"[{t}] {html.unescape(re.sub(r'<[^>]+>', '', s)).strip()}\n")
print(f"{v}\t{meta['title']}\t{meta['author_name']}\t{len(rows)}行")
