# スーツ編の写真の切り抜き（10/24）。focus_s.py（洗浄編）をもとにした。写真は /tmp/claude-0/kfw/ のコマ（README に取り方）
# 写真ごとに「必ず見せる部分（focus）」と「切り抜いてよい範囲（allowed）」を決めておき、
# PDFの枠の縦横比に合わせて、元のスクショ（高画質）から切り抜く。
# こうすると、枠の形がどうであっても、見せたい器材が真ん中に大きく入り、字幕や枠の外は入らない。
# 座標はどれも、画面を 1280x720 に縮めたときの位置。
import sys, os, json
from PIL import Image

UP = "/root/.claude/uploads/647c6673-e0d4-50d5-a1f6-0c9285b7952c"
IDS = """f6cf92f7 10f390cf 44daeb19 0014f7eb 00955b85 8530fcef 127270b4 4f915c90 4805944f 1119bcea efa12206 795e131d 1c575a3b a22a357f ca7fc848 0656c002
9e2e776e e610acb1 1501fbda 012294ef 9d9972df 2a45b59a e5837b3c 0bd89c81 8ad50dcc ba8ac59e 8ee5eba2 332f6d38 d1c0910c 52f37f10 208cd089 caff6332
d0dd7c1e b8721247 bc8a0682 40393f4e 7acbe1d9 9d46d9b5 c905b8af 0605e5a0 75f43488""".split()

FULL = (0, 0, 1280, 720)
PAD_OK = set()
# key: (画面の番号, allowed, focus)
F = {
 # スーツ編（10/26 2回目の全部やり直し）。コマは /tmp/claude-0/kfw4/<key>.jpg（1920x1080）。座標は 1280x720 に直したもの
 #   u..＝海人商店ブログ（World Dive 取扱店）の写真。横長に合わせるため、左右をぼかしで埋めた（写真は x100〜1180）
 #   w_・r..・d_＝動画の画面（kfw4/list4.txt に動画と秒）
 # focus＝説明文が言っている所。赤丸（MARK）は focus の中に入れ、写真の中で十分大きく写るようにする（ringcheck.py で点検）
 # ウェット
 "w_fold":  ("w_fold",  (300, 200, 1000, 622),  (480, 215, 820, 622)),   # 11/2 夜 下の字幕（630より下）を入れない   # 10/27 まーく様「インストラクターは写る必要がない。折り返し部分が見えるようにアップに」→ 52秒・顔を入れず、裏返した所を真ん中に
 "w_heel": ("w_heel", (0, 0, 1280, 720), (380, 230, 760, 520)),   # 11/2 検査役（2回目）：くるぶしを、さらに真ん中へ
 "w_pad":  ("w_pad",   (0, 0, 1280, 720),    (600, 0, 1070, 470)),   # 10/27 まーく様「手元の引っ張ってる所から、足元辺りまでをアップで」→ 91秒（字幕なし）
 "w_bag":   ("w_bag",   (330, 250, 672, 555),  (400, 300, 672, 555)),   # 10/28 まーく様「手のアップを見せるべき。顔は要らない」→ 顔（x680より右）と下の字幕を入れず、袋をかぶせた手だけ
 "w_zip":   ("w_zip",   (0, 0, 1280, 535),    (480, 100, 860, 530)),
 "r345":    ("r345",    (0, 0, 1280, 530),    (480, 170, 820, 520)),   # 11/2 夜 左下の「脱ぎ方③」の札を入れないよう、切り取りを上へずらす（ぼかさない）   # 10/27 348秒のコマに（前は肩の大写しで何の場面か分からなかった）。左下の字幕はぼかして埋める（SUBBLUR）
 "w_fold2": ("w_fold2", (0, 0, 1280, 720),  (520, 250, 800, 720)),   # 10/29 まーく様「2-1の右、もっと拡大」→ 腰から足元（裏返したスーツに足を入れる所）だけ   # 10/27 まーく様「足から入れるなら、お腹から足の辺りを映すべき」→ 67秒（字幕なし・足を入れている）。お腹〜足元
 "w_front": ("w_front", (0, 0, 1280, 610),  (420, 100, 860, 600)),   # 10/27 ウェットの特徴（体にぴったりの形）。下の字幕は入れない
 "w_side":  ("w_side",  (0, 0, 1280, 610),  (480, 120, 820, 600)),   # 背中のファスナーとひも
 "w_bag2": ("w_bag2", (0, 0, 1280, 560), (440, 285, 670, 465)),   # 11/2 検査役（4回目）：右上の頭の端を外す（袖と袋の丸(555,375)は真ん中のまま）
 "w_hair":  ("w_hair",  (520, 105, 815, 350),  (520, 105, 815, 350)),   # 10/28 まーく様の赤い四角（2:04 のスクショ）のとおり：頭・持ち上げた髪・首の後ろだけ。遠目でも分かる大きさ
 "w_velc":  ("w_velc", (0, 0, 1280, 550), (360, 170, 840, 550)),   # 11/2 夜 まーく様「折り返された三角っぽい部分に丸を」→ 指の下の、三角に折り返したテープ(615,352)を真ん中に   # 11/2 まーく様「首のテープはここ（丸の所）。丸を真ん中に、首元が見えるように」→ 指で押さえている水色のテープ(650,345)を真ん中に
 "rx386":   ("rx386",   (220, 60, 1000, 720), (235, 300, 790, 700)),   # 10/29 まーく様「説明に指とあるので、左腕と指先が見えないと」→ ひじから指先（袖口に指を入れる所）まで。左はしの葉の絵は入れない
 "rx420":  ("rx420", (628, 340, 862, 505), (628, 340, 862, 505)),   # 11/3 まーく様「指を見せるので、お腹〜太ももまで」→ まーく様が描いてくださった四角の範囲で切る（丸は付けない）   # 11/2 検査役：全身が小さく指が見えない → 腰の手と、折りたたんだ所に寄せる
 "d_inner": ("d_inner", (0, 0, 1280, 720),  (299, 60, 981, 660)),   # 10/27 まーく様「女性目線での資料ファースト」→ ocean_a 3:19（女性が長そでの裾をズボンに入れる場面）。背景を消して白地に（rembg）。下はドライスーツが写るので腰まで
 "w_wash":  ("w_wash",  (300, 60, 1280, 530),  (380, 150, 1000, 525)),   # 10/27 夜 まーく様「洗っているシーンか分かりづらい」→ 476秒：両手でスーツを真水に沈めて洗う所（左下の字幕・右上の題は入れない）
 # しくみ
 "d_cat":   ("d_cat",   (0, 0, 1280, 720),    (0, 0, 1280, 720)),
 "w_cat":   ("w_cat",   (0, 0, 1280, 720),    (0, 0, 1280, 720)),   # 10/27 ウェットの図（mkwet.py で作った完成図。10/27 夜 カタログの AF1 に）
 "d_catin":  ("d_catin",  (0, 0, 1280, 720),  (200, 330, 560, 660)),
 "d_autoa": ("d_autoa", (0, 100, 630, 720), (90, 140, 630, 710)),   # 11/2 まーく様「回すなら、丸よりボタンの外側に沿ったカーブの矢印」→ OA 5:42 のふちの外側に、AUTO と LOCK の文字の間を両向きの弧で（回す向きは公式で確かめられないので、片向きにはしない）
 "d_inval":("d_inval2", (70, 0, 1180, 720), (250, 70, 1030, 620)),   # 11/2 夜 まーく様「胸にくっついている所が見切れている」→ 動画のコマは下に字幕があり、台座まで写せない。伊豆高原ダイビングのブログ写真（3-4 と同じボタン）を、ロゴが水平になるよう回して、台座まで丸ごと入れた（mk34.py の make）
 "d_catex":  ("d_catex",  (0, 0, 1280, 720),  (780, 180, 1120, 500)),
 "d_auto":  ("d_auto",  (0, 115, 1280, 556),  (310, 118, 700, 556)),   # 10/27 検査役「ふちの上と右が切れ、AUTO・LOCK の字が見えない」→ 円盤のふちまで入れる
 "u34":     ("u34",     (100, 0, 1180, 720),  (240, 0, 1180, 720)),   # 10/27 初見の点検「ブーツだけで何の場面か分からない」→ スーツのすそからブーツまで
 # 着る前に
 "d_sock":  ("d_sock",  (0, 110, 1280, 525),  (420, 160, 840, 520)),
 "d_seal":  ("d_seal",  (0, 118, 1280, 488),  (150, 118, 1150, 488)),   # 10/27 夜 初見テスト「手首だと分からない」→ OA 0:55：両手で手首のゴムを広げて点検（奥にスーツの袖と肩のボタン）。上の題・下の字幕は入れない
 "d_valv": ("d_valv", (495, 110, 1280, 560), (530, 185, 990, 625)),   # 11/2 押すボタン(760,405)を真ん中に。寄りすぎないよう、ボタン全体も入れる
 "d_gel":   ("d_gel",   (0, 0, 980, 540),     (100, 40, 760, 535)),
 # 着方①
 "u04":    ("u04", (100, 0, 1280, 720), (440, 110, 1200, 690)),   # 11/2 夜 まーく様「囲みが見切れ・白いふち・太さ・すけ具合がほかと違う」→ 描きこんだ写真（u04m）をやめ、ほかの丸と同じ描き方（MARKQ）で、ベルトに沿った細長い丸を2つ。2つのまん中を写真のまん中に   # 11/2 まーく様「サスペンダーに合わせた囲みに」→ 丸ではなく、ベルトの形に沿った囲みを描いた写真（u04m）
 "u06":     ("u06",     (100, 0, 1180, 720),  (380, 0, 1000, 715)),
 "u08":     ("u08",     (400, 0, 880, 720),   (420, 200, 860, 715)),
 "u09":     ("u09",     (100, 0, 1180, 720),  (440, 160, 920, 640)),
 "u11":     ("u11",     (100, 0, 1180, 720),  (520, 180, 1000, 640)),
 "u12":    ("u12", (100, 0, 1180, 720), (380, 80, 980, 700)),   # 11/2 検査役：寄りすぎで手首のゴムが分からない → 引く
 # 着方②
 "u15":     ("u15",     (0, 100, 1280, 540),  (250, 100, 1000, 540)),   # 10/27 夜 初見テスト「黒い筒の切れ端にしか見えない」→ OA 6:18：女性の首で、首のゴムを外側に大きく折った形（顔・肩まで入る）。下の字幕は入れない
 "u16":     ("u16",     (100, 0, 1180, 720),  (280, 220, 900, 660)),
 "u17":     ("u17",     (100, 0, 1180, 720),  (300, 120, 900, 560)),
 "u19":    ("u19", (100, 0, 1180, 720), (440, 40, 840, 540)),   # 11/2 検査役：あごが写っていない・赤丸が端に当たる → 上へ広げる
 "u20":    ("u20", (0, 100, 1280, 620), (380, 130, 860, 500)),   # 11/2 まーく様「折りこんでいるふち全体が見えるように」→ 首まわりのゴムと、折りこむ両手を真ん中に
 "u21w":    ("u21w",    (100, 0, 1180, 720),  (100, 97, 930, 563)),   # 10/28 まーく様「これならOK」の切り方（バディの手とファスナー。6-4 とは別の切り方）
 "u21z":    ("u21z",    (100, 0, 1180, 720),  (440, 270, 940, 570)),   # 10/28 まーく様「4-2 はファスナーがよく見えるように中心に」→ 6-4 と同じ写真を、背中のファスナーを真ん中に切る
 "u21":    ("u21", (100, 0, 1180, 720), (400, 200, 780, 580)),   # 11/2 検査役：ファスナーの歯が右下で切れる → 右下へ
 "u23":    ("u23", (100, 0, 1180, 720), (300, 160, 820, 520)),   # 11/2 まーく様「閉まったファスナーがよく見えるように」→ 肩の上の閉まったファスナー(560,330)を真ん中に
 # 潜る
 "d_squat": ("d_squat", (0, 0, 1280, 620),    (360, 180, 920, 615)),
 "b_uw":    ("b_uw",    (0, 0, 1280, 560),   (300, 100, 1200, 555)),
 "d_frin": ("d_frin", (0, 130, 1280, 566), (150, 153, 730, 542)),   # 11/2 夜 まーく様「ぼかさず、全体を下げて字幕を見えなくすれば良い」→ 切り取りを上へずらし、字幕を入れない   # 11/2 まーく様「トリミングしすぎ。胸の位置か分からない」→ 胸と肩まで入れる（下の字幕はぼかしてある）
 "d_frex":  ("d_frex",  (0, 130, 840, 570),  (457, 237, 797, 557)),   # 11/2 夜 下の字幕を入れない   # 10/29 まーく様「なんで左肩のボタンが中心にくるように調整してないのか」→ ボタン(627,387)を真ん中に、3-2の左と同じ幅340   # 10/27 夜 初見テスト「男性の顔が大きい」→ 右の顔（x720より右）を入れない
 "m_valves": ("m_valves", (0, 130, 1280, 566), (160, 153, 890, 542)),   # 11/2 夜 まーく様「ぼかさず、全体を下げて字幕を見えなくすれば良い」→ 切り取りを上へずらし、字幕（568より下）を入れない   # 10/27 まーく様「赤丸と文字は絶対に被らせない」→ 引いて、左右に名札の場所を作る
 "d_bcdw":  ("d_bcdw",  (0, 0, 1280, 555),   (160, 0, 1120, 550)),
 "d_bcd":   ("d_bcd",   (0, 0, 1280, 560),    (300, 100, 900, 555)),
 # 洗い方・脱ぎ方
 "d_push": ("d_push2", (0, 0, 1280, 500), (440, 230, 840, 500)),   # 11/2 夜 まーく様「押していなくて、回している画像」→ 動画・ウェブを探し直したが、指先で真ん中を押している場面は見つからなかった。PB 1:57「空気を入れて緩和する」：着た人の胸のボタン（ホースがついた状態）。押す所（真ん中）だけを丸で囲み、題は「押す所」と書く
 "d_wash": ("d_wash", (440, 55, 1280, 505), (450, 60, 930, 500)),   # 11/3 寄りすぎて動画の画面の粗さが目立ち、ぼけて見えた → 顔から腰まで引いて写す（上の題・下の字幕は入れない）   # 11/2 まーく様「あごから胸を大きく。洗っているところを」
 "u27":    ("u27", (100, 0, 1180, 720), (560, 120, 920, 460)),   # 11/2 検査役：開いたファスナーが上に寄る → 上へ
 "u29":     ("u29",     (100, 0, 1180, 720),  (250, 0, 1030, 600)),
 "u28":     ("u28",     (100, 0, 1180, 720),  (300, 60, 840, 720)),   # 10/27 検査役「u29 は首だと分かりにくい」→ 横顔まで写る、ブログ28枚目（首のゴムを伸ばしたところ）に替えた
 "u30":     ("u30",     (100, 0, 1180, 720),  (380, 100, 900, 600)),
 "u31":     ("u31",     (100, 0, 1180, 720),  (440, 160, 1000, 680)),
 "o_heel": ("o_heel", (400, 115, 1000, 545), (600, 230, 900, 520)),   # 11/2 検査役：かかとも足も写っていない → 抜ける足（白い靴下）と押さえる手
 "p_heel":  ("p_heel",  (0, 140, 960, 612),  (420, 300, 890, 612)),   # 10/27 夜 初見テスト「足先とかかとが写らない」→ PP 14:30：かかとを反対の足で踏んで抜く（顔・右下の小窓・下の字幕は入れない）
 "d_toilet": ("d_toilet", (370, 55, 960, 535), (370, 55, 960, 365)),   # 10/28 まーく様「赤丸が見切れ。何を写したいのか」→ OA 5:26：背中のファスナーを、バディが両手で閉めている所（左上の題・右上のロゴ・下の字幕は入れない）
 "d_shoes": ("d_shoes", (0, 0, 1280, 525), (120, 40, 940, 525)),   # PP 2:48：紐をしっかり結ぶブーツ（✕ の例）。下の字幕は入れない
 "w_sandal":("w_sandal", (0, 0, 1280, 720), (200, 220, 960, 640)),   # 11/2 検査役：下の黒い帯をなくす（写真を横長に切りそろえた）
 "p_bcdh":  ("p_bcdh",  (520, 100, 1100, 530), (560, 120, 1000, 500)),   # 10/29 PB 10:44「BCDのホースって短い」：手に持ったBCD用のホース（顔は入れない・下の字幕も入れない）
 "p_bcduse":("p_bcduse", (150, 40, 1280, 560), (560, 60, 1020, 520)),   # 11/2 検査役（4回目）：手に持つBCDのボタン(790,290)を真ん中に
 "d_nip":  ("d_nip", (0, 0, 1280, 720), (120, 0, 1120, 720)),   # 11/2 まーく様「全体が分かるように」→ 胸のボタン全体と、つなぐ口
 "d_tip":  ("d_tip", (0, 0, 1280, 720), (0, 150, 470, 530)),   # 11/2 検査役（4回目）：輪の口(235,340)を真ん中に（写真の左はしに近いので寄せる）
 "d_ba":    ("d_ba", (0, 0, 1280, 703), (0, 0, 1280, 703)),   # 11/2 3-5 つなぐ前（上：コモンズ Apeks 給気バルブ CC BY-SA 4.0）とつないだ後（下：PB 3:43）を上下2段にした1枚。横に長い部品を、それぞれ横長の段で真ん中に
 "d_nip3":  ("d_nip3", (0, 0, 1280, 720), (0, 0, 1280, 720)),   # 11/2 まーく様「webで隅々まで」→ 伊豆高原ダイビングのブログ：World Dive の胸のボタン（ホースをつなぐ前）。つないだ後と同じ向き（口が左）・同じ大きさに
 "u28w":    ("u28w", (0, 0, 1280, 720), (500, 0, 1120, 720)),   # 11/2 まーく様「上へ伸ばしているしぐさが見えない」→ オーシャナ：首のゴムを上へまっすぐ伸ばした所
 "d_nip2":  ("d_nip2", (0, 0, 1280, 720), (0, 0, 1280, 720)),   # 11/2 まーく様「つなぐ前は接続部が見え、つないだ後と角度をそろえて」→ コモンズ Apeks 給気バルブを、口が左へ水平になるよう27度回した
 "d_conn3": ("d_conn3", (0, 0, 1280, 720), (0, 0, 1280, 720)),   # 11/2 シーサー那覇店ブログ：つなぎ目を、つなぐ前と同じ位置・同じ大きさに
 "d_conn2": ("d_conn2", (0, 0, 1280, 720), (150, 100, 850, 680)),   # 11/2 シーサー那覇店ブログ：World Dive の胸のボタンに、ホースをつないでいる手元（つなぎ目を真ん中に）
 "d_conn": ("d_conn", (0, 0, 1280, 720), (470, 200, 1070, 680)),   # 11/2 まーく様「カチカチホースとつなぎ目に丸」→ つなぎ目(770,440)を真ん中に
 "w_shoes":("w_shoes", (0, 0, 1280, 720), (100, 0, 1100, 500)),   # 11/2 検査役（4回目）：靴ひもを真ん中寄りに（元の写真の上はしに近い）
 "d_reg":   ("d_reg",   (0, 0, 1280, 600), (150, 60, 1050, 600)),   # 10/29 タンクに付ける器材（レギュレーター）から、ホースが何本も出ている所（PADI 23.5秒）
 "d_hose":  ("d_hose",  (700, 120, 1280, 605), (775, 163, 1215, 603)),   # 10/29 まーく様「なんのホースか・ホースの画像は」→ PADI「器材のセッティング」37.8秒。動画の飾り文字（09の丸）は消してある
 "u36":     ("u36",     (100, 0, 1180, 720),  (300, 0, 1000, 720)),   # 10/27 初見の点検 → 腰から足元まで（下ろしている手が見えるように）
 "u33":     ("u33",     (100, 0, 1180, 720),  (440, 40, 1000, 715)),
 "d_heel":  ("d_heel",  (0, 0, 980, 600),     (300, 0, 900, 595)),
}
# 写真 → 元の動画とその秒、または元のページ（写真をタップすると開く）
_YT = {"wet_diver": "DwV0Abnrm9s", "wet_roxy": "8eup5ULd8_U", "dry_ocean": "QtNIOoj7Lp0", "dry_bcd": "NS8OkAwcAJc", "dry_papa": "9IG9z5nAkl0", "padi_setting": "YE2_K7WfarA"}   # padi_setting：PADI「How To | Gear Assembly」（10/29 サムネイルで同じ映像と確かめた）
UMI = "https://umikizai.com/blog/2021/10/16/4259"
SRC = {}
for _l in open("/tmp/claude-0/kfw4/list4.txt"):
    _k, _v, _t = _l.split()
    if _v in _YT: SRC[_k] = (_YT[_v], int(_t))
SRC["d_cat"] = SRC["d_catin"] = SRC["d_catex"] = ("https://www.worlddive.co.jp/product/", None)
SRC["w_sandal"] = ("https://commons.wikimedia.org/wiki/File:Woman_wearing_red_flip_flops.jpg", None)   # 10/28 CC BY-SA 2.0。出どころをタップで開けるように
SRC["d_ba"] = (_YT["dry_bcd"], 223)
SRC["d_conn2"] = ("https://seasir.co.jp/k/naha/blog/2023/02/1450060", None)   # 11/2 シーサー那覇店ブログ「0から始める」ドライスーツ編
SRC["d_inval"] = ("https://izukougen-diving.com/beginner-diver-9/", None)
SRC["d_nip3"] = ("https://izukougen-diving.com/beginner-diver-9/", None)
SRC["u28w"] = ("https://oceana.ne.jp/diving/diving-equipment/115629", None)
SRC["d_nip2"] = ("https://commons.wikimedia.org/wiki/File:Dry_suit_inflation_valve_P8170013.jpg", None)
SRC["d_conn3"] = ("https://seasir.co.jp/k/naha/blog/2023/02/1450060", None)
SRC["d_nip"] = ("https://commons.wikimedia.org/wiki/File:Dry_suit_inflation_valve_P8170013.jpg", None)
SRC["d_tip"] = ("https://commons.wikimedia.org/wiki/File:Seatec_quick_disconnect_end_fitting_P8180016.jpg", None)
SRC["w_shoes"] = ("https://commons.wikimedia.org/wiki/File:New_Balance_Women%27s_990_Running_Shoes.jpg", None)
SRC["w_cat"] = ("https://www.worlddive.co.jp/catalog/data/26wd_catalog.pdf", None)   # 10/27 夜 ウェットの図はカタログ p.30（AF1）から
for _k in F:
    if _k.startswith("u"): SRC[_k] = (UMI, None)
SRC["u21z"] = SRC["u21w"] = (UMI, None)
for _k, _t in (("u15", 378), ("u20", 308)): SRC[_k] = (_YT["dry_ocean"], _t)   # 10/27 夜 この2枚は OA の動画から（ブログの写真では伝わらなかった）

MARK = {
 # 説明文が言っている物の上に赤丸（中心x, 中心y, 半径, 写真に書く名前, 置き場所）。1枚ずつ目で確かめた（10/26）
 # どの物を囲んだかは RINGWHAT に書く。その言葉が、写真の下の説明か手順の題に入っていないと ringcheck.py が止める
 "w_fold":  [(650, 420, 110, "", "")],
 "w_side":  [(650, 380, 110, "", "")],
 "w_bag2":  [(555, 375, 90, "", "")],   # 10/28 まーく様「丸は袖と袋だけ」   # 袋をかぶせた手と、袖から出た腕（左の写真と同じ大きさの割合）
 "w_hair":  [(645, 240, 63, "", "")],   # 10/28 説明「首の後ろを出す」に合わせ、赤丸は 持ち上げた手と首の後ろ（顔ではない）。大きさは②テープと同じ割合
 "rx386":   [(330, 515, 100, "", "")],   # 袖口に入れた指
 "rx420":   [(745, 415, 100, "", "")],   # 10/27 赤丸の中身の点検 → 指（腰の両手）が丸の外だった。両手を囲む
 "w_wash":  [(680, 400, 105, "", "")],   # 10/27 夜 水の中で洗っている両手
 "w_heel":  [(720, 420, 100, "", "")],
 "w_pad":  [(835, 200, 110, "", "")],   # 10/27 まーく様「膝パッドは黄色い部分」→ 薄い黄色の模様の当て布（x790〜880, y100〜300）を囲む
 "w_bag":   [(530, 410, 70, "", "")],   # 袋をかぶせた手（赤丸は手と袋の真ん中）
 "w_zip":   [(640, 250, 85, "", "")],
 "r345":    [(650, 430, 90, "", "")],
 "d_catin": [(380, 490, 100, "", "")],
 "d_catex": [(950, 340, 100, "", "")],
 "d_auto":  [(505, 345, 150, "", "")],
 "d_inval":[(640, 345, 72, "", "")],
 "d_push": [(640, 365, 34, "", "")],   # 11/2 夜 胸のボタンの、押す所（真ん中のロゴの丸）だけ   # 11/2 押すボタン（真ん中のロゴの丸）だけを囲む
 "d_conn":  [(770, 440, 85, "", "")],
 "d_conn2": [(500, 390, 95, "", "")],
 "d_nip3":  [(640, 360, 130, "", "")],   # 11/2 夜 まーく様「つなぎ目の開始位置がずれている。2枚とも口が真横の左・ロゴが水平に」→ mk34.py で回して、口を写真のまん中に
 "d_nip2":  [(300, 420, 120, "", "")],   # 11/2 つなぐ口（銀色の差しこみ口）。つないだ後と同じ位置
 "d_conn3": [(640, 360, 130, "", "")],   # 11/2 夜 つなぐ前と同じ位置・同じ大きさ・同じ向き（mk34.py）
 "u34":     [(790, 470, 185, "", "")],   # 10/28 両足のブーツ（赤丸がはみ出さない大きさ・写真のまん中）   # 10/27 両足のブーツを囲む
 "d_sock":  [(650, 290, 85, "", "")],
 "d_seal":  [(640, 300, 110, "", "")],
 "d_valv": [(760, 405, 80, "", "")],   # 11/2 押すボタン（真ん中のロゴの丸）だけを囲む
 "d_gel":   [(410, 290, 165, "", "")],
 "u09":     [(585, 384, 85, "", ""), (790, 384, 85, "", "")],
 "u11":     [(770, 390, 150, "", "")],
 "u12":     [(680, 400, 150, "", "")],
 "u15":     [(600, 400, 120, "", "")],
 "u16":     [(590, 450, 200, "", "")],
 "u17":     [(610, 320, 180, "", "")],
 "u19":     [(640, 300, 125, "", "")],   # 10/27 夜 見分けどころ＝ゴムの上のふち（伸ばすと、あごの下まで届く）
 "u20":     [(620, 315, 110, "", "")],   # 11/2 首まわりのゴムと両手（丸は描かない・位置の目印）
 "u21w":    [(500, 330, 120, "", "")],
 "u21z":    [(690, 425, 150, "", "")],   # 背中のファスナー（金色の歯）全体
 "u21":     [(500, 330, 120, "", "")],
 "u23":     [(560, 340, 110, "", "")],   # 11/2 閉まったファスナー（丸は描かない・位置の目印）
 "d_squat": [(630, 360, 130, "", "")],
 "d_bcd":   [(560, 330, 110, "", "")],
 "d_frin":  [(440, 420, 52, "", "")],
 "d_frex":  [(627, 397, 55, "", "")],   # 10/28 ボタンの中心に合わせた
 "m_valves": [(440, 420, 46, "入", "l"), (610, 385, 48, "抜", "r")],   # まとめの写真は紙の上で小さいので、名札は1字（ドライの図と同じ「入」「抜」。まとめの文に「空気を入れる・抜く」）
 "d_bcdw":  [(720, 300, 190, "", "")],
 "b_uw":    [(770, 300, 90, "", "")],
 "u27":     [(740, 340, 110, "", "")],
 "u29":     [(640, 280, 190, "", "")],
 "u28":     [(570, 430, 165, "", "")],
 "u30":     [(640, 330, 180, "", "")],
 "u31":     [(780, 420, 150, "", "")],
 "d_heel":  [(640, 520, 70, "", "")],
 "d_toilet": [(475, 175, 72, "", "")],   # ファスナーと、閉めるバディの両手（丸は写真の中に全部入る）
 "o_heel":  [(750, 380, 110, "", "")],   # かかとを押さえる両手と、抜ける足
 "p_heel":  [(655, 520, 95, "", "")],   # 踏んでいるかかと（下の字幕のすぐ上）
 "d_hose":  [(995, 383, 70, "", "")],   # 先の金属の輪
 "u36":     [(620, 470, 130, "", "")],
}
RINGWHAT = {"w_fold": "裏返し", "w_side": "ファスナー", "w_bag2": "袋", "w_hair": "髪", "w_velc": "テープ", "rx386": "指", "rx420": "指", "w_wash": "洗", "w_heel": "かかと", "w_pad": "膝パッド", "w_bag": "ビニール袋", "w_zip": "髪", "r345": "肩", "d_catin": "胸", "d_catex": "左肩", "b_uw": "左肩", "d_frin": "胸", "d_frex": "左肩", "m_valves": "ボタン", "d_bcdw": "{bc}",
 "d_auto": "回して", "d_inval": "真ん中", "d_push": "真ん中", "u34": "ブーツ", "d_sock": "靴下", "d_seal": "ゴム", "d_valv": "ボタン", "d_gel": "ゴム", "u04": "サスペンダー",
 "u09": "サスペンダー", "u11": "手", "u12": "ゴム", "u15": "首のゴム", "u16": "広げる", "u17": "頭", "u19": "伸ばす", "u20": "内側",
 "u21": "ファスナー", "u21z": "ファスナー", "u21w": "ファスナー", "u23": "ファスナー", "d_squat": "首", "d_bcd": "ホース", "u27": "ファスナー", "u29": "首のゴム", "u28": "首のゴム", "u30": "あご",
 "u31": "手首", "d_heel": "かかと", "u36": "膝", "p_heel": "かかと", "o_heel": "足", "d_hose": "輪", "d_conn": "カチッ", "d_conn2": "カチッ", "d_nip2": "ここ", "d_nip3": "ここ", "d_conn3": "カチッ", "d_toilet": "ファスナー", "d_shoes": "紐"}
# 長方形で囲むもの（左上x, 左上y, 右下x, 右下y。1280x720 の画面での位置）。10/8 ご指示（スクショに手で囲んでもらった場所）
RED = (249, 54, 18)            # #f93612：2-1 の動画の赤い丸と同じ色。囲み・丸・矢印・✕は、全部この色にそろえる（10/8 ご指示）
# 赤い囲みの線の太さ（紙の上の mm）。2-1 の動画の赤い丸を紙の上で測ると 2.2mm なので、全部これにそろえる（10/8 ご指示）
LINE_MM = 2.2
# 印のすけぐあい（1＝すけない）。写真が見えて、印もはっきり分かる強さ（10/13 ご指示）
MARK_ALPHA = 0.55   # 10/27 まーく様「赤丸の透明度をもう少し上げて、写真がもっとしっかり写るように」（0.8 → 0.55）。名札は読めるよう、すかさない
LABHIT = []   # 名札が赤丸にかぶっていないか（ringcheck.py が見る）
# 印の形は、動画にもともと描かれている赤い丸（1-3・2-1）に合わせて、全部「丸（だ円）」にそろえる（10/8 ご指示）
# 下の MARKR・MARKQ・MARK は「囲みたい物の範囲」。丸はその範囲を、すき間を少しとって外から囲む（OV 倍）
OV = 1.2
# 1-3 の動画の赤い丸は細い（約1mm）。同じ場所に、同じ色の 2.2mm の丸を上から描き直して、太さをそろえる
# （中心x, 中心y, 横の半径, 縦の半径, 色）。半径は、もとの丸の線のまん中の位置
MARKE = {}
# ななめの四角（中心x, 中心y, 長さ, 幅, 角度[度・反時計回り]）。ホースの向きに合わせて傾ける（10/8 ご指示）
MARKQ = {"w_velc": [(600, 368, 195, 118, 48)],   # 11/3 まーく様が描いてくださった範囲：三角に折り返したテープ全体（指の下から、左下の青い帯の手前まで）。ななめの細長い丸
         "u04": [(668, 440, 330, 92, -81), (977, 360, 310, 92, -85)]}   # 11/2 夜 5-1 左右のサスペンダー（太い黒いベルト）に沿わせる        # 2-1：カチカチホースの先（左手）から、つなぎ口（右手）まで。まーく様が描いてくれた形（10/13）。上の蛇腹は入れない
MARKR = {}
# 「空気がプシュッと出ている」しるし（丸ではなく、口から外へ広がる3本の線。10/13 ご指示）
# （出どころx, 出どころy, 向き[度・上が90], 線の始まりまでの長さ, 線の終わりまでの長さ）
MARKP = {}
# 1-3：Oリングのふちから、キャップのほうへ、内から外へ少し広がる3本の線（空気が出ている感じ。10/13 まーく様の絵のとおり）
# （始まりx, 始まりy, 終わりx, 終わりy）。線は丸にくっつけない
MARKL = {}   # 10/13 ご指摘：線が短くて見づらい → 長くする（丸にはかぶせない）   # 3本とも、Oリングのまん中から放射状に、右上のキャップへ向ける（10/13 ご指示：横向きではなく、キャップに当たる向き）
# 「空気が当たっている」しるし（まわりに広がる短い線。10/13）
# （中心x, 中心y, 線の始まりまでの長さ, 線の終わりまでの長さ, 線の向き[度・上が90]）
MARKS = {}
# 「💨」の形（10/13 ご指示：空気がプシュッと出ている形。✳ ではない）
# Oリングの口から、キャップのほうへ、流れの線3本＋その先のもくもく（雲）
# （出口x, 出口y, 向き[度・上が90], 線の長さ, 線の間・雲の大きさ, 雲を描くか）
# 1-3：空気は、Oリングの口から、手に持ったキャップのほうへ出る（10/13 ご指摘：左向きはまちがい。空気がそっちへ出るわけがない）
#      線の先はすぐキャップなので、雲は描かず、キャップへ向かう流れの線3本だけにする
MARKW = {}   # Oリングのまん中から、右上のキャップへ。この向きでOK（10/13 ご確認）。線は丸にくっつけない
# 写真に書きこむ文字は、PDFのタグ（.tag：「全回転で止める！」など）と同じ見た目にする。
# 同じフォント・同じ大きさ（紙の上で14pt）・同じ余白・同じ色で描く。数値は .tag のCSSと合わせること。
FONT = "/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"  # PDFの札と同じ Noto Sans JP
PX_MM = 96 / 25.4              # CSS px / mm
TAG = dict(size_pt=14, pad_x_mm=3, pad_y_mm=.6, radius_mm=1.6, outline_mm=.5, line_h=1.266, inset_mm=1.6)

# 丸（印）が写真のなるべく真ん中に来るように、見せたい範囲の中心を、印の中心に合わせる（10/14 ご指示：〇の位置はなるべく中央に）
# 範囲の大きさは今のまま。字幕や画面のはしで、これ以上動かせないときは、切り抜く側（box_for）が止める
def _mark_center(k):
    pts = []
    for cx, cy, *_ in MARK.get(k, []): pts.append((cx, cy))
    for x0, y0, x1, y1, *_ in MARKR.get(k, []): pts.append(((x0 + x1) / 2, (y0 + y1) / 2))
    for cx, cy, *_ in MARKQ.get(k, []): pts.append((cx, cy))
    for cx, cy, *_ in MARKE.get(k, []): pts.append((cx, cy))
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)) if pts else None
for _k in []:
    _c = _mark_center(_k)
    if not _c or _k in ("s11",): continue
    _fr, _al, (_a, _b, _cc, _d) = F[_k]
    _w, _h = _cc - _a, _d - _b
    F[_k] = (_fr, _al, (_c[0] - _w / 2, _c[1] - _h / 2, _c[0] + _w / 2, _c[1] + _h / 2))

def mark(im, key, box, sx, sy, ppx):
    """ppx = 写真1pxあたりではなく、CSS 1px が写真の何pxにあたるか"""
    import math
    from PIL import Image, ImageDraw, ImageFont
    if key in NODRAW: return im   # 10/28 まーく様「丸は、ふだん知らないピンポイントの部品だけ。画像がいちばん見えること」
    if key not in MARK and key not in MARKR and key not in MARKE and key not in MARKQ and key not in MARKP and key not in MARKS and key not in MARKW and key not in MARKL: return im
    # 印は、透明な紙に描いてから、少しすかして写真に重ねる（10/13 ご指示：写真も印も見やすいように）
    base = im
    im = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # 10/27 名札は別の紙に描き、すかさない（赤丸だけ薄くする）
    labl = Image.new("RGBA", base.size, (0, 0, 0, 0)); dl = ImageDraw.Draw(labl)
    _rings = [((cx - box[0]) * sx * (im.size[0] / ((box[2] - box[0]) * sx)), (cy - box[1]) * sy * (im.size[0] / ((box[2] - box[0]) * sx)), r) for cx, cy, r, *_ in MARK.get(key, [])]
    x0, y0 = box[0], box[1]
    k = im.size[0] / ((box[2] - box[0]) * sx)
    mm = PX_MM * ppx
    f = ImageFont.truetype(FONT, round(TAG["size_pt"] * 96 / 72 * ppx))
    fs = TAG["size_pt"] * 96 / 72 * ppx
    for qcx, qcy, ql, qw, qa in MARKQ.get(key, []):
        # 傾けない四角を別の透明な紙に描いて、中心で回してから重ねる（角の丸みも、ほかの四角と同じにするため）
        w = max(3, round(LINE_MM * mm))
        L, Wd = ql * sx * k + 2 * w, qw * sy * k + 2 * w
        side = int(math.hypot(L, Wd)) + 4
        lay = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        L, Wd = L * OV, Wd * OV
        side = int(max(L, Wd)) + 4
        lay = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        ImageDraw.Draw(lay).ellipse(((side - L) / 2, (side - Wd) / 2, (side + L) / 2, (side + Wd) / 2), outline=RED + (255,), width=w)
        lay = lay.rotate(qa, resample=Image.BICUBIC)
        X, Y = (qcx - x0) * sx * k, (qcy - y0) * sy * k
        im.paste(lay, (round(X - side / 2), round(Y - side / 2)), lay)
    for px_, py_, pa, r0, r1 in MARKP.get(key, []):
        # 3本の線を、少しずつ向きを変えて引く（まん中の1本がいちばん長い）。線の太さは丸と同じ
        w = max(3, round(LINE_MM * mm))
        for da, ln in ((-38, 0.75), (0, 1.0), (38, 0.75)):   # 線どうしを離して、口から外へ広がって見えるように（矢印に見えないように）
            a = math.radians(pa + da)
            ax_, ay_ = math.cos(a), -math.sin(a)
            X0, Y0 = (px_ + ax_ * r0 - x0) * sx * k, (py_ + ay_ * r0 - y0) * sy * k
            X1, Y1 = (px_ + ax_ * (r0 + (r1 - r0) * ln) - x0) * sx * k, (py_ + ay_ * (r0 + (r1 - r0) * ln) - y0) * sy * k
            d.line((X0, Y0, X1, Y1), fill=RED, width=w)
            for X, Y in ((X0, Y0), (X1, Y1)):   # 線の両はしを丸くする
                d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
    for lx0, ly0, lx1, ly1 in MARKL.get(key, []):
        w = max(3, round(LINE_MM * mm * 0.45))   # Oリングとキャップの間がせまいので、細めの線にする（太いと線がつぶれて、かたまりに見える）
        X0, Y0 = (lx0 - x0) * sx * k, (ly0 - y0) * sy * k
        X1, Y1 = (lx1 - x0) * sx * k, (ly1 - y0) * sy * k
        d.line((X0, Y0, X1, Y1), fill=RED, width=w)
        for X, Y in ((X0, Y0), (X1, Y1)): d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
    for wx, wy, wa, wl, wc, cloud in MARKW.get(key, []):
        w = max(3, round(LINE_MM * mm * 0.65))   # 線どうしがくっついて、ひとかたまりに見えないよう、丸より少し細く
        a = math.radians(wa); ux, uy = math.cos(a), -math.sin(a); nx, ny = -uy, ux
        P = lambda X, Y: ((X - x0) * sx * k, (Y - y0) * sy * k)
        # 流れの線3本（間をあけて、長さを変える。矢印に見えないように）
        for off, st, ln in (((-wc * 1.3, .15, .55), (0, 0, .75), (wc * 1.3, .25, .5)) if cloud else ((-wc * 1.4, .1, .8), (0, 0, 1.0), (wc * 1.4, .1, .8))):
            bx, by = wx + nx * off + ux * wl * st, wy + ny * off + uy * wl * st
            X0, Y0 = P(bx, by); X1, Y1 = P(bx + ux * wl * ln, by + uy * wl * ln)
            d.line((X0, Y0, X1, Y1), fill=RED, width=w)
            for X, Y in ((X0, Y0), (X1, Y1)): d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
        # 線の先の、もくもく（白い雲に赤いふち。丸を3つ重ねる）
        if not cloud: continue
        cx_, cy_ = wx + ux * (wl * .8 + wc), wy + uy * (wl * .8 + wc)
        cl = [(-wc * .8, -wc * .1, .8), (wc * .8, -wc * .1, .8), (0, wc * .5, 1.0)]
        R0 = lambda rr: wc * rr * sx * k
        for off, fw, rr in cl:   # ふち（赤）を先に、少し大きく
            X, Y = P(cx_ + nx * off + ux * fw, cy_ + ny * off + uy * fw); R = R0(rr) + w
            d.ellipse((X - R, Y - R, X + R, Y + R), fill=RED)
        for off, fw, rr in cl:   # 中（白）を上から
            X, Y = P(cx_ + nx * off + ux * fw, cy_ + ny * off + uy * fw); R = R0(rr)
            d.ellipse((X - R, Y - R, X + R, Y + R), fill=(255, 255, 255))
    for scx, scy, r0, r1, angs in MARKS.get(key, []):
        w = max(3, round(LINE_MM * mm))
        for ang in angs:
            a = math.radians(ang)
            X0, Y0 = (scx + math.cos(a) * r0 - x0) * sx * k, (scy - math.sin(a) * r0 - y0) * sy * k
            X1, Y1 = (scx + math.cos(a) * r1 - x0) * sx * k, (scy - math.sin(a) * r1 - y0) * sy * k
            d.line((X0, Y0, X1, Y1), fill=RED, width=w)
            for X, Y in ((X0, Y0), (X1, Y1)): d.ellipse((X - w / 2, Y - w / 2, X + w / 2, Y + w / 2), fill=RED)
    for ecx, ecy, erx, ery, col in MARKE.get(key, []):
        w = max(3, round(LINE_MM * mm))
        X, Y = (ecx - x0) * sx * k, (ecy - y0) * sy * k
        RX, RY = erx * sx * k, ery * sy * k
        d.ellipse((X - RX - w / 2, Y - RY - w / 2, X + RX + w / 2, Y + RY + w / 2), outline=col, width=w)
    for rx0, ry0, rx1, ry1, *ov in MARKR.get(key, []):
        ov = ov[0] if ov else OV
        # 長方形の囲み：線の太さ・角の丸み・色は、四角の囲みと同じ
        w = max(3, round(LINE_MM * mm))
        # 線は、囲むものの外がわに引く（太い線が中身にかぶって、囲んだ物が見えなくならないように。10/8）
        ex, ey = ((rx0 + rx1) / 2 - x0) * sx * k, ((ry0 + ry1) / 2 - y0) * sy * k
        ax, ay = (rx1 - rx0) / 2 * sx * k * ov + w, (ry1 - ry0) / 2 * sy * k * ov + w
        d.ellipse((ex - ax, ey - ay, ex + ax, ey + ay), outline=RED, width=w)
    for cx, cy, r, text, side in MARK.get(key, []):
        X, Y, R = (cx - x0) * sx * k, (cy - y0) * sy * k, r * sx * k
        w = max(3, round(LINE_MM * mm))  # 線の太さは、紙の上で 2-1 の赤い丸と同じ（10/8 ご指示）
        # 印は四角にそろえる（PDFの番号の札・名札の印と同じ形。10/7 ご指示）
        R2 = R * OV + w
        d.ellipse((X - R2, Y - R2, X + R2, Y + R2), outline=RED, width=w)  # 線は外がわに
        if not text: continue  # 名前が空のときは丸だけ（名前は写真の下に書く）。10/24 スーツ編：しくみの写真だけ、写真の上にも書く
        tw = d.textlength(text, font=f)
        bw = tw + 2 * TAG["pad_x_mm"] * mm
        bh = fs * TAG["line_h"] + 2 * TAG["pad_y_mm"] * mm
        ins = TAG["inset_mm"] * mm
        if side == "tr":
            bx, by = im.size[0] - bw - ins, ins
            lx, ly = bx, by + bh
            a = math.atan2(ly - Y, lx - X)
            e = R / max(abs(math.cos(a)), abs(math.sin(a)))  # 四角のふちから線を出す
            d.line((X + e * math.cos(a), Y + e * math.sin(a), lx, ly), fill=RED, width=w)
        elif side == "tl":
            # 左上に札を置く（右上だと、線が上のギザギザ＝銀色金具ぐるぐるの近くを通って、まぎらわしいため）
            bx, by = ins, ins
            lx, ly = bx + bw, by + bh
            a = math.atan2(ly - Y, lx - X)
            e = R / max(abs(math.cos(a)), abs(math.sin(a)))  # 四角のふちから線を出す
            d.line((X + e * math.cos(a), Y + e * math.sin(a), lx, ly), fill=RED, width=w)
        # 10/27 名札は、赤丸の線の外から、白いふち＋線1本ぶん離す（前は線にくっついて、かぶって見えた。まとめの「入れる・抜く」）
        gap = w * 2 + TAG["outline_mm"] * mm
        if side == "r": bx, by = X + R2 + gap, Y - bh / 2
        elif side == "l": bx, by = X - R2 - gap - bw, Y - bh / 2
        elif side == "t": bx, by = X - bw / 2, Y - R2 - gap - bh
        else: bx, by = X - bw / 2, Y + R2 + gap
        bx = min(max(bx, ins), im.size[0] - bw - ins); by = min(max(by, ins), im.size[1] - bh - ins)
        o = TAG["outline_mm"] * mm
        # 10/27 まーく様「赤丸と文字は絶対に被らせない」：名札（白いふちこみ）が、この写真のどの赤丸の線にもかからないかを測って残す
        for _X, _Y, _r in _rings:
            _R2 = _r * sx * (im.size[0] / ((box[2] - box[0]) * sx)) * OV + w
            _nx, _ny = min(max(_X, bx - o), bx + bw + o), min(max(_Y, by - o), by + bh + o)
            if math.hypot(_nx - _X, _ny - _Y) < _R2 + w / 2: LABHIT.append((key, text))
        dl.rounded_rectangle((bx - o, by - o, bx + bw + o, by + bh + o), radius=TAG["radius_mm"] * mm + o, fill=(255, 255, 255))
        dl.rounded_rectangle((bx, by, bx + bw, by + bh), radius=TAG["radius_mm"] * mm, fill=RED)
        dl.text((bx + TAG["pad_x_mm"] * mm, by + bh / 2), text, font=f, fill=(255, 255, 255), anchor="lm")
    a = im.getchannel("A").point(lambda v: round(v * MARK_ALPHA))
    im.putalpha(a)
    out = base.convert("RGBA"); out.alpha_composite(im); out.alpha_composite(labl)
    return out.convert("RGB")

# 10/27 写したいものが画面の下（字幕のすぐ上）にあると、赤丸をまん中に置くために寄るしかなく、「体のどこか」が分からない大写しになった。
#   そこで、字幕の帯（この高さより下・1280x720 で数えた値）を、すぐ上の帯をのばしてぼかしたもので埋め、そこまで写せるようにする。
#   （ブログ写真の左右をぼかしで埋めたのと同じやり方。字幕の字は読めなくなり、写真の下がふんわりぼける）
SUBBLUR = {}   # 11/2 夜 まーく様「ぼかしが雑。テロップ部分だけを、最小限に」→ 写真の下を帯ごとぼかすのをやめた。
#   字幕の帯にかからないよう、切り取りの下を字幕の上で止める（w_fold・d_frex）。止めると寄りすぎる d_frin・m_valves は、字の四角だけをぼかす
#   どうしても入る r345 は、左下の「脱ぎ方③」の四角の札だけを、その形のままぼかす（SUBRECT）
SUBRECT = {}   # 1280x720 で数えた、札の四角
def load(frame):
    im = Image.open(os.path.join("/tmp/claude-0/kfw4", frame + ".jpg")).convert("RGB")
    if frame in SUBBLUR:
        from PIL import ImageFilter
        # 字幕の帯は、すぐ上を鏡に映したもので埋めて強くぼかし、さかい目は少しずつ混ぜる（さかい目の線を見せない）。
        #   混ぜる所も、字幕より上だけを使う（字幕の字や光が、ぼけて写りこまないように）
        W, H = im.size; cut = int(SUBBLUR[frame] * H / 720); fe = int(H / (48 if frame == "w_pad" else 16))   # 10/27 検査役「ぼかした四角が見える」→ さかい目を広く混ぜる（膝の写真だけは、膝がぼけないよう狭く）
        low = Image.new("RGB", (W, H - cut + 2 * fe)); low.paste(im.crop((0, cut - 2 * fe, W, cut)), (0, 0))
        low.paste(im.crop((0, 2 * cut - H, W, cut)).transpose(Image.FLIP_TOP_BOTTOM), (0, 2 * fe))
        # 10/27 検査役「下がにじんで見える」→ 形が残ると「にじみ」に見えるので、もっと強くぼかし、写真の平均の色へ少し寄せて「ふんわり消える」形にする
        low = low.filter(ImageFilter.GaussianBlur(H / 18))
        from PIL import ImageStat
        avg = Image.new("RGB", low.size, tuple(int(v) for v in ImageStat.Stat(low).mean))
        fade = Image.linear_gradient("L").resize(low.size).point(lambda v: int(v * 0.55))
        low = Image.composite(avg, low, fade)
        mask = Image.new("L", low.size, 255); mask.paste(Image.linear_gradient("L").resize((W, 2 * fe)), (0, 0))
        im.paste(low, (0, cut - 2 * fe), mask)
    if frame in SUBRECT:
        from PIL import ImageFilter, ImageDraw
        W, H = im.size; k = W / 1280
        for x0, y0, x1, y1 in SUBRECT[frame]:
            box = tuple(round(v * k) for v in (x0, y0, x1, y1))
            m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle(box, radius=round(10 * k), fill=255)
            m = m.filter(ImageFilter.GaussianBlur(3 * k))   # さかい目は、ほんの少しだけ混ぜる
            im = Image.composite(im.filter(ImageFilter.GaussianBlur(20 * k)), im, m)   # 字の形が読めない強さ。ぼかすのは字の四角の中だけ
    return im

PAD = 0.06
NOCROP = {"d_cat", "w_cat", "d_ba"}   # SunraIZUさんのスーツの図（mkcat.py で作った完成図）・3-5 のつなぐ前／後（上下2段で作った完成図）
# わざと大写しにする写真（ringcheck の「寄りすぎ」から外す）。どれも、同じ部分を 2-1 の図や となりの写真で、体ごと見せている
CLOSEUP = {"rx420", "w_bag", "d_sock", "w_hair", "d_auto", "d_seal", "d_frex"}   # d_frex：10/27 夜 説明の男性の顔を外すと幅が狭くなる。体のどこかは 3-1 の図で見せている
# 10/27 まーく様「女性目線での資料ファースト」：男性が写っている写真と、男性のままにしている理由（理由がない男性の写真は ringcheck が止める）
MALE = {"d_push", "u28w", "d_conn3", "d_conn2", "d_conn", "p_bcdh", "p_bcduse", "d_frin", "d_frex", "m_valves", "d_cat", "p_heel"}
MALE_OK = {
 "d_push": "胸のボタンにホースがついた状態を、着た人の胸で見せる写真。根拠の動画で、この場面は男性だけ（顔は入れない）",
 "u28w": "首のゴムを上へまっすぐ伸ばした姿がはっきり分かる写真は、webでこれだけ（顔はゴムに隠れている）",
 "d_conn3": "手元だけ（顔は入れない）。World Dive のボタンにつなぐ所は、この写真だけ",
 "d_conn2": "手元だけ（顔は入れない）。World Dive のボタンにホースをつなぐ所の写真は、手元の資料ではこれだけ",
 "d_conn": "胸のボタンにホースがつながった所だけ（顔は入れない）。女性の同じ場面は、手元の動画に無い",
 "p_bcdh": "BCD用のホースが短いことを見せる写真。手とホースだけ（顔は入れない）。女性が持つ場面は、根拠の動画に無い",
 "p_bcduse": "ドライを着て水中でBCDを使う場面。マスクで顔は分からない。女性の同じ場面は、手元の動画に無い",
 "d_frin": "ボタンの位置を見せる写真。男性は、スーツを持ち上げているだけ（女性が着た姿で胸と左肩のボタンが写る場面は、根拠の動画に無い）",
 "d_frex": "同上",
 "p_heel": "足元だけ（顔は入れない）。女性が、かかとを踏んで足を抜く場面が、手元の動画・ブログに無い（10/27 夜 初見テストで女性の写真は伝わらなかった）",
 "m_valves": "同上",
 "d_cat": "インストラクターさんから送られた参考の写真そのもの（10/27 お返事：写真のタイプ・背中ファスナー式）。差しかえない",
}
# 10/27 写真ごとに「写っていなければならない部位」「写してはいけない部位」（posecheck.py が測る）
#   まーく様「足から入れるなら、お腹から足の辺りを映すべき」「インストラクターは写る必要がない」
PARTS = {"w_fold2": ["腰", "膝", "足首"]}
NOPART = {"w_fold": ["頭"]}
# 背景を消して白地にした写真（明るさの点検は、白い地で必ず明るく出るので外す）
WHITEBG = {"d_inner"}
def aspect_range(key):
    """この写真を切り抜ける縦横比の範囲（見せたい部分を切らずに済む範囲）"""
    _, (ax0, ay0, ax1, ay1), (fx0, fy0, fx1, fy1) = F[key]
    fw, fh = (fx1 - fx0) * (1 + 2 * PAD), (fy1 - fy0) * (1 + 2 * PAD)
    return fw / (ay1 - ay0), (ax1 - ax0) / fh

# 10/27 初見の点検「何の場面か分からない」10枚 → 赤丸のまわりに寄せると、体のどこで・何をしているかが消える。
#   ここに入れた写真は、F に書いた広さをそのまま使う（赤丸に合わせて寄らない）。F は赤丸がほぼ真ん中に来るように書く
CTX = {"r345", "m_valves", "d_nip3", "u28w", "d_push", "d_nip2", "d_conn3", "u20", "u23", "d_wash", "w_velc", "d_conn2", "d_autoa", "d_valv", "d_ba", "u12", "u19", "u21", "u23", "u27", "w_heel", "u04", "d_nip", "d_tip", "d_conn", "w_shoes", "p_bcdh", "p_bcduse", "d_reg", "d_inval", "w_bag2", "rx386", "rx420", "d_hose", "u21w", "d_toilet", "o_heel", "w_hair", "u15", "d_seal", "p_heel", "u34", "u36", "d_frin", "d_frex"}   # 10/27 夜 ボタン・靴下は「体のどこか」を見せる写真
# 10/27 夜 赤丸を真ん中に置けない写真（理由つき）。かかとは画面の下の字幕のすぐ上にあり、真ん中に置くと寄りすぎて何の場面か分からなくなる
CENTER_OK = {"d_frin": "字幕を入れないよう上へずらしたので、丸は少し下になる（11/2 夜）", "r345": "同上（左下の札を入れないため）", "m_valves": "まとめの、スーツ全体の写真。下の字幕を入れないよう上へずらしたので、丸は少し下になる（11/2 夜 まーく様「全体を下げて字幕を見えなくすれば良い」）", "d_nip3": "つなぐ前と後を、同じ向き・同じ位置で比べるため", "d_nip2": "つなぐ前と後を、同じ向き・同じ位置で比べるため（ボタンは右、口とつなぎ目は左）", "d_conn3": "同上",
             "rx386": "左手と袖の両方を見せるため", "rx420": "お腹から折りたたんだ所まで見せるため",
             "d_toilet": "ファスナーは背中の上の横一文字。ファスナー全体を見せるため、丸は上寄り",
             "p_heel": "かかとが画面の下はし（字幕のすぐ上）。腰から足元まで見せるため、赤丸は下寄り",
             "u15": "首は画面の下寄り（下の字幕のすぐ上）。顔と肩まで入れて、首のゴムだと分かるように",}
# 10/28 まーく様「丸は、ふだん知らない部品のピンポイントだけ」→ 動作を見せる写真は丸を描かない（寄せる位置の目印には使う）
NODRAW = {"rx420", "u19", "u09", "u20", "u23", "w_fold", "w_heel", "w_bag", "w_hair", "r345", "rx386", "rx420", "w_wash", "d_sock", "u11", "u12", "u16", "u17", "u21", "u23", "u27", "u28", "u30", "u31", "u33", "u34", "o_heel", "d_wash", "u06", "u08"}
# 11/2 まーく様「ボタンを押す部分は、真ん中の小さい所。なぜボタン全体を丸で囲うのか」
#   → 押す所だけを囲む写真。丸は小さくなるので、アップ写真の丸の大きさ（RING_H）の決まりは当てはめない。
#     ボタンが体のどこにあるかは 3-1 の図と 3-2・3-3 の左の写真で見せているので、寄りすぎの点検も当てはめない
PUSH = {"d_inval", "d_valv", "d_push"}
import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))   # -I で動かしても、同じ置き場の content_w を読めるように
import content_w as _cw
_pushcap = sorted(k for (_sid, k), v in _cw.CAPS.items() if ("押す" in v or "戻るか" in v) and k in MARK and k not in NODRAW and k not in PUSH)
if _pushcap: raise SystemExit(f"NG 「押す」写真なのに、押す所だけを囲む丸（PUSH）になっていない：{_pushcap}")   # 11/2 ボタン全体を囲んでいた
RING_H = 0.84
# 10/29 まーく様「なんで左肩のボタンが中心にくるように調整してないのですか」→ 赤丸を描く写真は、かならず丸を真ん中に置く。
#   「真ん中でなくてよい」に入れてよいのは、まーく様に見ていただいた3枚だけ。ここに勝手に足すと、組み立てが止まる
_CENTER_SEEN = {"d_frin", "r345", "m_valves", "d_toilet", "p_heel", "u15", "d_nip2", "d_nip3", "d_conn3"}   # 11/2 まーく様「接続部の角度も、比較対象としてそろえて」
_bad = sorted(k for k in CENTER_OK if k not in NODRAW and k not in _CENTER_SEEN)
if _bad: raise SystemExit(f"NG 赤丸を描く写真なのに、丸を真ん中に置いていない（CENTER_OK に入っている）：{_bad}")   # アップ写真の赤丸の直径÷写真の高さ（10/27 夜 そろえる）
PAIRK = {"nghi", "nglo"}   # 重ねて比べる写真（1-3 の高すぎ・低すぎ）
def box_for(allowed, focus, aspect, pad=PAD, zoom=True):
    """focusを少し余白つきで含み、縦横比がaspectで、allowedからはみ出さない、いちばん小さい枠"""
    ax0, ay0, ax1, ay1 = allowed
    fx0, fy0, fx1, fy1 = focus
    fw, fh = fx1 - fx0, fy1 - fy0
    fw2, fh2 = fw * (1 + 2 * pad), fh * (1 + 2 * pad)
    w = max(fw2, fh2 * aspect)
    h = w / aspect
    # allowed に入りきらないときは、入る大きさまで縮める（そのときは余白から削る）
    if w > ax1 - ax0: w = ax1 - ax0; h = w / aspect
    if h > ay1 - ay0: h = ay1 - ay0; w = h * aspect
    cx, cy = (fx0 + fx1) / 2, (fy0 + fy1) / 2
    # 10/20 まーく様「器材が上に寄っていて、中央にきていない」→ 写したいものは、写真のまん中に置く。
    #   画面のはしに当たってまん中に置けないときは、同じ形のまま少し寄って（小さく切って）まん中に置く。
    #   寄っても、写したいもの（余白なし）が全部入るときだけ寄る。入らないときは、いままでどおり（あとで知らせる）
    hw, hh = min(cx - ax0, ax1 - cx), min(cy - ay0, ay1 - cy)
    sc = min(1.0, 2 * hw / w, 2 * hh / h)
    if zoom and sc < 1.0 and w * sc + 0.5 >= fw and h * sc + 0.5 >= fh:
        w, h = w * sc, h * sc
    x0 = min(max(cx - w / 2, ax0), ax1 - w)
    y0 = min(max(cy - h / 2, ay0), ay1 - h)
    # 10/20 写したいものが、写真のまん中から ずれていないか（画面のはしに当たって、まん中に置けないとき）。あとでまとめて知らせる
    _dx, _dy = (x0 + w / 2 - cx) / w, (y0 + h / 2 - cy) / h
    if abs(_dx) > .04 or abs(_dy) > .04: OFFC.append((focus, round(_dx * 100), round(_dy * 100)))
    return x0, y0, x0 + w, y0 + h, (w + 0.5 >= fw and h + 0.5 >= fh)
OFFC = []

if __name__ == "__main__":
    # 使い方: python3 focus.py <sizes.json> <出力ディレクトリ>
    sizes = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    warn = []
    BADGE = {}
    BOXES = {}
    QUAL = {}
    import copy as _cp; _MARK0 = _cp.deepcopy(MARK)
    ROT = {"belt"}  # 重りは横に長いので、90度回して縦長にする（左右のいらない部分を減らし、ベルト自体を大きく見せる。10/7 ご指示）
    for slot, (key, w, h) in sizes.items():
        frame, allowed, focus = F[key]
        if key in _MARK0: MARK[key] = list(_MARK0[key])
        # 10/27 まーく様「赤丸は基本的に画像の中心にきたほうがよい」→ 見せたい部分を、赤丸の真ん中を中心に置き直す（大きさはそのまま）
        if MARK.get(key) and key not in CTX:
            _ms = MARK[key]
            _gx = sum(m[0] for m in _ms) / len(_ms); _gy = sum(m[1] for m in _ms) / len(_ms)
            _fw, _fh = focus[2] - focus[0], focus[3] - focus[1]
            # 赤丸から、切り抜ける範囲のはしまでの近いほうの距離に合わせて、上下・左右を同じ幅にする（はしに当たって赤丸が下に寄るのを防ぐ）
            _R0 = max(m[2] for m in _ms) * OV + 16
            _hw = max(_R0, min(_fw / 2, _gx - allowed[0], allowed[2] - _gx)); _hh = max(_R0, min(_fh / 2, _gy - allowed[1], allowed[3] - _gy))
            focus = (max(allowed[0], _gx - _hw), max(allowed[1], _gy - _hh), min(allowed[2], _gx + _hw), min(allowed[3], _gy + _hh))
        # 10/26 赤丸は、必ず写真の中に全部入れる：見せたい部分を、赤丸（線の外がわまで）を含む大きさに広げる
        for _cx, _cy, _r, *_ in MARK.get(key, []):
            _R = _r * OV + 14
            focus = (min(focus[0], max(allowed[0], _cx - _R)), min(focus[1], max(allowed[1], _cy - _R)),
                     max(focus[2], min(allowed[2], _cx + _R)), max(focus[3], min(allowed[3], _cy + _R)))
        rot = key in ROT
        if rot: w, h = h, w
        pad_to = None; _n0 = len(OFFC)
        if key in PAD_OK:
            # 切り抜ける幅の上限までで切り、足りないぶんは、あとで左右をうめる
            fh = (focus[3] - focus[1]) * (1 + 2 * PAD)
            a_fit = min(w / h, (allowed[2] - allowed[0]) / fh)
            x0, y0, x1, y1, ok = box_for(allowed, focus, a_fit)
            if a_fit < w / h - 0.01: pad_to = w / h
        else:
            x0, y0, x1, y1, ok = box_for(allowed, focus, w / h, zoom=key not in PAIRK)   # 比べる2枚は、同じ切り方のまま（寄せると2枚がずれる）
            # 10/27 赤丸が真ん中に来ないときは、赤丸を中心に、同じ形のまま寄る。寄りすぎて元の画素が足りなくなるときは寄らない（ringcheck.py が知らせる）
            if MARK.get(key) and key not in CTX:
                _ms = MARK[key]; _gx = sum(m[0] for m in _ms) / len(_ms); _gy = sum(m[1] for m in _ms) / len(_ms)
                _asp = w / h; _bw, _bh = x1 - x0, y1 - y0
                if abs((_gx - (x0 + x1) / 2) / _bw) > .1 or abs((_gy - (y0 + y1) / 2) / _bh) > .1:
                    _H = min(_gy - allowed[1], allowed[3] - _gy, _bh / 2); _W = min(_gx - allowed[0], allowed[2] - _gx, _bw / 2)
                    _hw = min(_W, _H * _asp); _hh = _hw / _asp
                    _Rmax = max(abs(m[0] - _gx) + m[2] * OV for m in _ms), max(abs(m[1] - _gy) + m[2] * OV for m in _ms)
                    _srch = 2 * _hh * load(frame).size[1] / 720
                    if _srch >= 0.45 * (h / 96 * 300):   # 刷り上がりに要る画素の半分以上あれば寄る
                        x0, y0, x1, y1 = _gx - _hw, _gy - _hh, _gx + _hw, _gy + _hh
        # 10/27 夜 まーく様「アップの写真は、丸の大きさを綺麗に統一した方がパッと見やすい」
        #   → 赤丸が1つのアップ写真は、赤丸の直径が写真の高さの RING_H（6割）になるように、赤丸を真ん中にして切る。
        #     場面を見せる写真（CTX）・図（NOCROP）・赤丸が2つ以上の写真は別。ringcheck.py が、そろっているかを測る
        if key not in CTX and key not in NOCROP and len(MARK.get(key, [])) == 1:
            _cx, _cy, _r = MARK[key][0][:3]
            _bh = 2 * _r * OV / RING_H; _bw = _bh * (w / h)
            _s = min(1.0, (allowed[2] - allowed[0]) / _bw, (allowed[3] - allowed[1]) / _bh)
            _bw, _bh = _bw * _s, _bh * _s
            # 画面のはしで赤丸が真ん中に来ないときは、真ん中から1割以内に入るまで寄る（そのぶん赤丸も小さくして、大きさの割合は保つ）
            _hw, _hh = min(_cx - allowed[0], allowed[2] - _cx), min(_cy - allowed[1], allowed[3] - _cy)
            _s2 = min(1.0, _hw / (0.4 * _bw), _hh / (0.4 * _bh)); _bw, _bh = _bw * _s2, _bh * _s2
            _r2 = min(_r, RING_H * _bh / (2 * OV)); MARK[key] = [(_cx, _cy, _r2, *MARK[key][0][3:])]
            x0 = min(max(_cx - _bw / 2, allowed[0]), allowed[2] - _bw); y0 = min(max(_cy - _bh / 2, allowed[1]), allowed[3] - _bh)
            x1, y1 = x0 + _bw, y0 + _bh
        # 10/27 CTX の写真も「赤丸は真ん中から10%以内」は守る：まず枠ごと赤丸の方へずらし、
        #   それでも足りないときだけ、同じ形のまま少しずつ寄る（寄るのは必要なぶんだけ）
        if key in CTX and MARK.get(key) and key not in CENTER_OK:
            _ms = MARK[key]; _gx = sum(m[0] for m in _ms) / len(_ms); _gy = sum(m[1] for m in _ms) / len(_ms)
            _bw, _bh = x1 - x0, y1 - y0
            for _i in range(30):
                x0 = min(max(_gx - _bw / 2, allowed[0]), allowed[2] - _bw); y0 = min(max(_gy - _bh / 2, allowed[1]), allowed[3] - _bh)
                if abs(_gx - (x0 + _bw / 2)) <= .1 * _bw and abs(_gy - (y0 + _bh / 2)) <= .1 * _bh: break
                _bw, _bh = _bw * .96, _bh * .96
            x1, y1 = x0 + _bw, y0 + _bh
        # 10/28 まーく様「赤丸（と囲む物）は、写真の上下左右のまん中に」→ 最後に、赤丸のまん中を写真のまん中にそろえる。
        #   画面のはしに当たるときは、同じ形のまま少しずつ小さく切る（赤丸が写真からはみ出す手前で止める）
        if MARK.get(key) and key not in CENTER_OK and key not in NOCROP:
            _ms = MARK[key]; _gx = sum(m[0] for m in _ms) / len(_ms); _gy = sum(m[1] for m in _ms) / len(_ms)
            _ex = max(abs(m[0] - _gx) + m[2] * OV + 14 for m in _ms); _ey = max(abs(m[1] - _gy) + m[2] * OV + 14 for m in _ms)
            _bw, _bh = x1 - x0, y1 - y0
            _hw = min(_bw / 2, _gx - allowed[0], allowed[2] - _gx); _hh = min(_bh / 2, _gy - allowed[1], allowed[3] - _gy)
            _k = min(_hw / (_bw / 2), _hh / (_bh / 2))
            if len(_ms) > 1: _k = max(_k, _ex / (_bw / 2), _ey / (_bh / 2)) if _k * _bw / 2 < _ex or _k * _bh / 2 < _ey else _k
            _bw, _bh = _bw * min(1, _k), _bh * min(1, _k)
            if len(_ms) == 1:   # 赤丸1つ：小さく切ったぶん、赤丸も同じ割合で小さくする（大きさの割合は保つ・はみ出さない）
                _cx, _cy, _r = _ms[0][:3]
                _r2 = min(_r * min(1, _k), (min(_bw, _bh) / 2 - 14) / OV)
                MARK[key] = [(_cx, _cy, _r2, *_ms[0][3:])]
            x0 = min(max(_gx - _bw / 2, allowed[0]), allowed[2] - _bw); y0 = min(max(_gy - _bh / 2, allowed[1]), allowed[3] - _bh)
            x1, y1 = x0 + _bw, y0 + _bh
        # 10/26 それでも写真のはしにかかる赤丸は、中心はそのままで、写真に収まる大きさまで小さくする（ringcheck.py が、小さくなりすぎていないか調べる）
        if key in MARK:
            _adj = []
            for _cx, _cy, _r, *_rest in MARK[key]:
                _room = min(_cx - x0, x1 - _cx, _cy - y0, y1 - _cy) - 14
                _adj.append((_cx, _cy, max(10, min(_r, _room / OV)), *_rest))
            MARK[key] = _adj
        BOXES[slot] = [key, x0, y0, x1, y1, [list(m[:3]) for m in MARK.get(key, [])]]
        if not ok: warn.append(f"{slot}: 見せたい部分が枠に入りきらない")
        if len(OFFC) > _n0: print(f"  まん中からずれ {slot}（{key}）：左右 {OFFC[-1][1]}%・上下 {OFFC[-1][2]}%（画面のはしに当たって、まん中に置けない）")
        src = load(frame)
        if key in NOCROP:   # 10/26 図（形が 16:9 でない）は、切り抜かずにそのまま枠に入れる
            im = src.resize((round(w / 96 * 300), round(h / 96 * 300)), Image.LANCZOS); im.save(os.path.join(out, f"{slot}.jpg"), quality=90)
            BOXES[slot] = [key, 0, 0, 1280, 720, []]; BADGE[slot] = "br:6"; continue
        sx, sy = src.size[0] / 1280, src.size[1] / 720
        im = src.crop((round(x0 * sx), round(y0 * sy), round(x1 * sx), round(y1 * sy)))
        # 10/27 まーく様「画像の鮮明さや明るさ」→ 明るさをそろえる（暗い場面は少し明るく）。くっきり具合と、元の画素の足りなさを記録して ringcheck.py で止める
        from PIL import ImageOps, ImageStat, ImageFilter
        im = ImageOps.autocontrast(im, cutoff=0.5)
        _L = ImageStat.Stat(im.convert("L")).mean[0]
        for _i in range(3):   # 暗い写真は、明るさ 95 を目安に少しずつ持ち上げる（白とびしないよう、ガンマで）
            if _L >= 95: break
            im = im.point(lambda v: round(255 * (v / 255) ** 0.8)); _L = ImageStat.Stat(im.convert("L")).mean[0]
        _g = im.convert("L").resize((480, round(480 * im.size[1] / im.size[0])))
        QUAL[slot] = dict(src_w=im.size[0], need_w=round(w / 96 * 300), light=round(ImageStat.Stat(im.convert("L")).mean[0]),
                          sharp=round(ImageStat.Stat(_g.filter(ImageFilter.FIND_EDGES)).var[0]))
        # 紙の上で 300dpi 相当まで（元の画質より大きくはしない）
        tw = min(im.size[0], round(w / 96 * 300))
        if pad_to:
            # 足りない左右を、写真のふちの色でうめて、枠の形に合わせる（器材は切らない）
            from PIL import ImageStat
            ih = im.size[1]; cw = round(ih * pad_to)
            edge = [tuple(int(v) for v in ImageStat.Stat(im.crop((0, 0, 8, ih))).median),
                    tuple(int(v) for v in ImageStat.Stat(im.crop((im.size[0] - 8, 0, im.size[0], ih))).median)]
            # うめる部分は、写真の左右のふちの色を、行ごとに平均してなめらかにしたもの（壁と地面の境目もつながる）
            from PIL import ImageFilter
            ox = (cw - im.size[0]) // 2
            n = 12
            edge = Image.new("RGB", (2 * n, ih))
            edge.paste(im.crop((0, 0, n, ih)), (0, 0)); edge.paste(im.crop((im.size[0] - n, 0, im.size[0], ih)), (n, 0))
            col = edge.resize((1, ih), Image.BOX).filter(ImageFilter.GaussianBlur(ih / 40)).resize((cw, ih))
            canvas = col.copy()
            # 写真のふちを、少しずつ背景になじませる
            mask = Image.linear_gradient("L").rotate(90, expand=True).resize((40, ih))
            canvas.paste(im, (ox, 0))
            canvas.paste(col.crop((ox, 0, ox + 40, ih)), (ox, 0), mask.transpose(Image.FLIP_LEFT_RIGHT))
            canvas.paste(col.crop((ox + im.size[0] - 40, 0, ox + im.size[0], ih)), (ox + im.size[0] - 40, 0), mask)
            im = canvas
        im = im.resize((tw, round(tw * h / w)), Image.LANCZOS)
        if rot: im = im.rotate(90, expand=True)
        im = mark(im, key, (x0, y0, x1, y1), sx, sy, im.size[0] / w)
        # 10/21 ▶ の印を置くすみ（見せたい部分・赤い印にかからない所）
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import badgepos as _bp
        _ff = _bp.focus_frac(focus, (x0, y0, x1, y1), pad_to, None, rot) if not isinstance(focus, list) else [0, 0, 0, 0]
        _c, _s, _ = _bp.corners(im, _ff, *( (h, w) if rot else (w, h) )); BADGE[slot] = f"{_c}:{_s}"
        im.save(os.path.join(out, f"{slot}.jpg"), quality=88)
    json.dump(BOXES, open(os.path.join(out, "boxes.json"), "w")); json.dump(QUAL, open(os.path.join(out, "quality.json"), "w")); json.dump(sorted(set(LABHIT)), open(os.path.join(out, "labhit.json"), "w"))   # 10/26 ringcheck.py が、赤丸が写真の中に大きく入っているかを調べる
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); __import__("badgepos").save(out, BADGE)
    print("\n".join(warn) if warn else "all focus fit")
