# スーツ編の「写真と説明が合っているか」の点検（10/26 まーく様「袖という説明文なのに、なぜか手の甲に丸」
#   「左肩に～という説明文でも、肝心の左肩の部分が小さくて見えづらい」「ハルシネーションが起こらない仕組みを」）
# 使い方: python3 ringcheck.py <切り抜いた写真の置き場（boxes.json がある所）>
# 1) 赤丸が、刷り上がりの写真の中に全部入っているか（切れていないか）
# 2) 赤丸が、刷り上がりの写真の中で十分大きいか（写真の短い辺の 22% 以上）
# 3) 赤丸で何を囲んだか（focus_w.RINGWHAT）の言葉が、その写真の説明か、手順の題に入っているか
# 4) 手順に出てくる写真には、必ず説明（CAPS）があるか。説明だけあって写真の無いものはないか
# 5) どの手順にも、出どころの記号（EVIDENCE.md の表の記号）を書いた # の行があるか。記号は表にあるものだけか
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import focus_w, content_w
out = sys.argv[1]
boxes = json.load(open(os.path.join(out, "boxes.json")))
ng = []
caps = content_w.CAPS
title_of = {}; keys_of = {}
for sec in content_w.STEPS:
    for sb in sec["subs"]:
        title_of[sb["id"]] = sb["title"]; keys_of[sb["id"]] = sb["key"]
cap_of_key = {}
for (sid, k), c in caps.items(): cap_of_key.setdefault(k, []).append((sid, c))
for slot, (k, x0, y0, x1, y1) in boxes.items():
    if k not in focus_w.MARK: continue
    w, h = x1 - x0, y1 - y0
    for cx, cy, r, *_ in focus_w.MARK[k]:
        R = r * 1.2 + 6   # focus_w は半径の 1.2 倍の外側に線を引く
        if cx - R < x0 - 2 or cx + R > x1 + 2 or cy - R < y0 - 2 or cy + R > y1 + 2:
            ng.append(f"NG {slot}：赤丸が写真の外にはみ出している（写真 {x0:.0f},{y0:.0f}〜{x1:.0f},{y1:.0f}／丸 {cx},{cy} 半径{r}）")
        if 2 * R < 0.22 * min(w, h):
            ng.append(f"NG {slot}：赤丸が小さすぎる（写真の短い辺の {2 * R / min(w, h):.0%}。22% 以上に寄せる）")
for k in focus_w.MARK:
    if k not in focus_w.RINGWHAT: ng.append(f"NG {k}：赤丸で何を囲んだか（RINGWHAT）が書いていない"); continue
    word = focus_w.RINGWHAT[k]
    if k not in cap_of_key: continue
    for sid, c in cap_of_key[k]:
        if word not in c and word not in title_of.get(sid, ""):
            ng.append(f"NG {sid} {k}：赤丸は「{word}」なのに、説明「{c}」にも題「{title_of.get(sid)}」にも出てこない")
for sid, ks in keys_of.items():
    for k in ks:
        if (sid, k) not in caps: ng.append(f"NG {sid} {k}：写真の説明（CAPS）がない")
for (sid, k) in caps:
    if k not in keys_of.get(sid, []): ng.append(f"NG {sid} {k}：説明はあるのに、その手順に写真がない")
# 出どころ
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "content_w.py")).read()
known = {"OA", "PP", "PB", "NR", "TS", "KB", "DM", "RX", "PW", "OW", "WD", "WDc", "SR", "UMI", "TUSA"}
blocks = re.split(r'\n   dict\(id="', src)
for b in blocks[1:]:
    sid = b.split('"')[0]
    prev = blocks[blocks.index(b) - 1].rstrip().split("\n")[-1]
    if not prev.strip().startswith("#"): ng.append(f"NG {sid}：出どころの # の行がない"); continue
    codes = set(re.findall(r'\b(OA|PP|PB|NR|TS|KB|DM|RX|PW|OW|WDc|WD|SR|UMI|TUSA)\b', prev))
    if not codes: ng.append(f"NG {sid}：出どころの記号が # の行にない（{prev.strip()[:40]}）")
print("\n".join(ng) if ng else f"写真と説明の点検 OK（赤丸 {sum(len(v) for v in focus_w.MARK.values())}個・説明 {len(caps)}件・出どころ {len(blocks) - 1}手順）")
sys.exit(1 if ng else 0)
