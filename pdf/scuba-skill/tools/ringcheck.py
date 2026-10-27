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
for slot, (k, x0, y0, x1, y1, rings) in boxes.items():
    if not rings: continue
    w, h = x1 - x0, y1 - y0
    for cx, cy, r in rings:
        R = r * 1.2 + 6   # focus_w は半径の 1.2 倍の外側に線を引く
        if cx - R < x0 - 2 or cx + R > x1 + 2 or cy - R < y0 - 2 or cy + R > y1 + 2:
            ng.append(f"NG {slot}：赤丸が写真の外にはみ出している（写真 {x0:.0f},{y0:.0f}〜{x1:.0f},{y1:.0f}／丸 {cx},{cy} 半径{r}）")
        if 2 * R < 0.22 * min(w, h):
            ng.append(f"NG {slot}：赤丸が小さすぎる（写真の短い辺の {2 * R / min(w, h):.0%}。22% 以上に寄せる）")
    # 10/27 寄りすぎ：動画の画面を、横幅の 27%（1280 のうち 340）より狭く切ると、まわりが写らず「体のどこか」が分からない
    #   （肩・ボタン・膝の大写しで起きた）。わざと大写しにする写真（同じ部分を、別の写真で体ごと見せているもの）は CLOSEUP に書く
    #   ※はじめは「赤丸が写真の 70% より大きい」で数えたが、ブーツ1足・BCD全体のように大きな物を囲んだ写真まで引っかかったので、切った幅で数える
    if not k.startswith("u") and k not in focus_w.NOCROP and k not in focus_w.CLOSEUP and w < 340:
        ng.append(f"NG {slot}：寄りすぎ（動画の画面の {w / 1280:.0%} だけを切っている）。体のどこか分かるよう、引いて写す")
        # 10/27 まーく様「赤丸は基本的に画像の中心に」→ 赤丸（いくつかあるときはその真ん中）が、写真の真ん中から 12% 以内か
    if rings:
        gx = sum(r[0] for r in rings) / len(rings); gy = sum(r[1] for r in rings) / len(rings)
        dx, dy = (gx - (x0 + x1) / 2) / w, (gy - (y0 + y1) / 2) / h
        if abs(dx) > .12 or abs(dy) > .12:
            ng.append(f"NG {slot}：赤丸が写真の真ん中にない（横に {dx:+.0%}・縦に {dy:+.0%}）。写真のはしに寄っている場合は、切り抜ける範囲（allowed）を見直す")
# 10/27 まーく様「赤丸と文字は絶対に被らせない」：写真の上の名札が、赤丸の線にかかっていないか（focus_w.py が測った結果）
for k, text in json.load(open(os.path.join(out, "labhit.json"))):
    ng.append(f"NG {k}：写真の上の名札「{text}」が、赤丸の線にかぶっている。名札を赤丸から離す")
# 10/27 まーく様「画像の鮮明さや明るさ」：写真ごとに、元の画素が足りているか・明るさ・くっきり具合
qual = json.load(open(os.path.join(out, "quality.json")))
for slot, q in qual.items():
    if q["src_w"] < q["need_w"] * 0.42:
        ng.append(f"NG {slot}：元の写真の画素が足りず、ぼやける（元 {q['src_w']}px／必要 {q['need_w']}px）。もっと寄りでない写真か、くっきりした写真にする")
    if not 70 <= q["light"] <= 205 and slot.rsplit("_", 1)[0] not in focus_w.WHITEBG:
        ng.append(f"NG {slot}：明るさ {q['light']}（70〜205 の外）。暗すぎ・白すぎ")
    if q["sharp"] < 120:
        ng.append(f"NG {slot}：くっきりしていない（{q['sharp']}）。ピンぼけ・ぶれの少ない場面にする")
# 10/27 まーく様「長文になっていないか」：題は30字まで、補足1行は40字まで、1つの手順の補足は3つまで
import re as _re
import re
_plain = lambda t: re.sub(r"[A-Za-z ]{3,}", "あ", re.sub(r"<br>.*", "", re.sub(r"<(?!br)[^>]+>|\{\w+\}|〔[^〕]+〕", "あ", t)))   # 改行（<br>）の後は数えない・英字のつづりは1字
for sec in content_w.STEPS:
    if len(_plain(sec["title"])) > 22: ng.append(f"NG 工程{sec['id']}：ページの題が長い（{len(_plain(sec['title']))}字。22字まで）")
    for sb in sec["subs"]:
        if len(_plain(sb["title"])) > 30: ng.append(f"NG {sb['id']}：題が長い（{len(_plain(sb['title']))}字。30字まで）")
        ex = sb.get("extra") or []
        if len(ex) > 3: ng.append(f"NG {sb['id']}：補足が多い（{len(ex)}つ。3つまで）")
        for x in ex:
            if len(_plain(x)) > 40: ng.append(f"NG {sb['id']}：補足が長い（{len(_plain(x))}字。40字まで）：{x[:20]}…")
# 10/27 まーく様「初心者が用意しえないものをマニュアルに入れてたり」：本人が用意する物として出してはいけない言葉
_txt = "\n".join(_re.sub(r"#.*", "", l) for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "content_w.py"), encoding="utf-8"))
for w_ in ["潤滑剤", "シーラバー", "ジェル", "パウダー", "ワックス", "グリス"]:
    if w_ in _txt: ng.append(f"NG 「{w_}」は初心者が自分で用意しない物（お店の器材）。手順に入れない")
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
