# 写真に「その動作で使う体の部位」が、全部・大きく写っているかを、姿勢を読む道具（MediaPipe Pose）で測る
# 10/27 まーく様「足から入れるなら、お腹から足の辺りを映すべきじゃないのですか？」「なぜこういうところを毎回手直しが入るのか」
#   → 写真ごとに、写っていなければならない部位（focus_w.PARTS）と、写してはいけない部位（focus_w.NOPART：例 顔）を先に決め、
#     切り抜いた範囲に入っているかを数字で確かめる。手元だけの大写しは道具が読めないので、PARTS に書かない（目と検査役で見る）
# 道具の用意：pip install mediapipe rembg ／ apt-get install libegl1 libgles2
#   型の重さ 9MB：https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task を /tmp/claude-0/mp/pose.task へ
# 使い方: python3 posecheck.py <boxes.json がある所>
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import focus_w
LM = {"頭": [0], "肩": [11, 12], "手首": [15, 16], "腰": [23, 24], "膝": [25, 26], "足首": [27, 28, 31, 32]}
out = sys.argv[1]
boxes = json.load(open(os.path.join(out, "boxes.json")))
need = {k for k in list(focus_w.PARTS) + list(focus_w.NOPART)}
used = {s: v for s, v in boxes.items() if v[0] in need}
if not used: print("部位の点検：対象なし"); sys.exit(0)
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
det = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path="/tmp/claude-0/mp/pose.task"), num_poses=1))
ng = []; seen = {}
for slot, (k, x0, y0, x1, y1, _r) in sorted(used.items()):
    if k not in seen:
        r = det.detect(mp.Image.create_from_file(f"/tmp/claude-0/kfw4/{k}.jpg"))
        seen[k] = [(l.x * 1280, l.y * 720, l.visibility) for l in r.pose_landmarks[0]] if r.pose_landmarks else None
    pts = seen[k]
    if pts is None: ng.append(f"NG {slot}：人の姿勢が読めない（大写しなら PARTS から外して、目で確かめる）"); continue
    inside = lambda i: x0 <= pts[i][0] <= x1 and y0 <= pts[i][1] <= y1
    ys = []
    for part in focus_w.PARTS.get(k, []):
        ok = [i for i in LM[part] if pts[i][2] >= 0.2 and inside(i)]
        if not ok: ng.append(f"NG {slot}：「{part}」が写っていない（{focus_w.PARTS[k]} が要る動作）")
        ys += [pts[i][1] for i in ok]
    for part in focus_w.NOPART.get(k, []):
        if any(pts[i][2] >= 0.5 and inside(i) for i in LM[part]): ng.append(f"NG {slot}：「{part}」が写っている（要らないものは入れない）")
    if len(focus_w.PARTS.get(k, [])) >= 2 and len(ys) >= 2 and (max(ys) - min(ys)) < 0.45 * (y1 - y0):
        ng.append(f"NG {slot}：動作の部位が小さい（写真の高さの {(max(ys) - min(ys)) / (y1 - y0):.0%}。45% 以上に寄せる）")
det.close()
print("\n".join(ng) if ng else f"部位の点検 OK（{len(used)}枚）")
sys.exit(1 if ng else 0)
