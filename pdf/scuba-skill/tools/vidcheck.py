#!/usr/bin/env python3
# ドライブから取り込んだ動画の「画質がそろっているか」を、毎回かならず確かめる道具。
# なぜ：同じ資料の中で写真のくっきり具合がばらばらだと、読む人が気になる。
#       10/15 に、前編は横1920・後編は横640と、そろっていなかったことがあった。
# 止める（失敗にする）とき
#   ・横の大きさが、動画どうしでちがう
#   ・横1280より小さい（資料の大きい写真には足りない）
# 知らせるだけのとき
#   ・映像と音の長さがちがう（高画質化で映像が伸びた。切り抜きには差し支えない）
#   ・iPhoneで作り直した動画（高画質化の描き足しがあるかもしれない）
# 使い方：python3 vidcheck.py 動画1.mp4 動画2.mp4 ...
import json, subprocess, sys

def probe(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                          "-of", "json", f], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    tag = (v.get("tags") or {}).get("handler_name", "")
    return {"f": f, "w": int(v["width"]), "h": int(v["height"]),
            "vd": float(v.get("duration") or d["format"]["duration"]),
            "ad": float(a["duration"]) if a and a.get("duration") else None,
            "apple": "Core Media" in tag}

rows = [probe(f) for f in sys.argv[1:]]
bad = False
for r in rows:
    note = []
    if r["w"] < 1280:
        note.append("小さすぎる（横1280未満）"); bad = True
    if r["ad"] and abs(r["vd"] - r["ad"]) > r["ad"] * 0.05:
        note.append(f"映像{r['vd']/60:.0f}分・音{r['ad']/60:.0f}分（長さちがい）")
    if r["apple"]:
        note.append("iPhoneで作り直し（描き足しに注意）")
    print(f"{r['w']}x{r['h']}\t{r['f'].split('/')[-1]}\t{' / '.join(note) or 'OK'}")
sizes = {(r["w"], r["h"]) for r in rows}
if len(sizes) > 1:
    print("止めました：大きさがそろっていません →", sorted(sizes)); bad = True
print("画質：そろっていない" if bad else "画質：そろっている")
sys.exit(1 if bad else 0)
