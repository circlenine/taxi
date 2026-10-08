# 手順の中身（3つの出力で共通に使う）
# 用語は {regu} {octo} {gauge} {bc} {tank} {belt} {kachi} で色つきの札になる
#   video … 動画の字幕・画面で言っていること（言いかえのみ）
#   extra … 動画にはない補足（薄い黄色の箱で出す）
#   pink  … 動画にはない、とくに大事な補足（ピンクの箱で出す）

STEPS = [
 dict(id="1", title="“タンク”と“BCD”を合体！",
  subs=[
   dict(id="1-1", key=["c04"], frames=["c03","c04"], gif="s1-1",
     title="キャップを外して、<span class=\"nw\">{tank}くるくる</span>を右手で持つ",
     pinkx=["キャップではなく、シールのパターンもあるよ。<br>そのときは、はがして{tank}に貼ればOK！"],
),
   dict(id="1-2", key=["c05"], frames=["c05"],
     title="{bc}のベルトを自分に向けて、{tank}に通す"),
   dict(id="1-3", key=["c06"], frames=["c06","07"], gif="s1-3",
     title="{tank}の頭を、{bc}のふちにそろえる",
     ng=dict(img="ng07", text="高すぎ・低すぎはダメ！"),
     pinkx=["ベルトで固定後、持ち上げたとき、{tank}が動かないかチェック！"]),
  ]),
 dict(id="2", title="“タンク”と“銀色金具”を合体！",
  # 2ページに分かれるので、後半のページは別のタイトルにする（手順2-4・2-5の中身に合わせる）
  title2="“BCD”と“銀色金具”を合体！",
  subs=[
   dict(id="2-1", key=["c09"], frames=["c09"],
     title="Oリングがあるか見る",
     extra=["よく分からん！と思ったら遠慮せずインストラクターに確認しよう！"]),
   dict(id="2-2", key=["c10"], frames=["c10"],
     title="{silver}をかぶせる",
     extra=["<span class=\"nw\">{silver}ぐるぐる</span>は<span class=\"nw\">自分のほう</span><span class=\"nw\">（{bc}の反対）！</span>"]),
   dict(id="2-3", key=["c11"], frames=["c11"],
     title="<span class=\"nw\">{silver}ぐるぐる</span>を右に回す",
     # 10/8 ご指示：「全回転で止める！」は下と同じことなので消し、ここまでを1つの大事（ピンク）にする
     pink=dict(head="回らなくなるまで回して、そこでストップ！", lines=["力いっぱい締めなくてOK。<br>回し戻さなくてOK！"])),
   dict(id="2-4", key=["c13","c15"], frames=["c12","c13","c14","c15"], gif="s2-4",
     title="{kachi}を、{bc}のホースにつなぐ",
     extra=["<b>引いた後の状態で、{bc}に装着！</b>",
            "<b>L字サインホースに付ける！</b>",
            "「カチッ」と鳴ったら、ちゃんと付いた証拠！"]),
   dict(id="2-5", key=["twist", "strap"], frames=["c16"],
     title="ホースのねじれを見る",
     # 「なぜ（垂れ下がると危ない）」→「どうする（ストラップあり／なし／ホース類）」の順に並べる
     pinkbig=dict(head="{octo}や{gauge}は<br>ぶらぶらさせない！",
       why="垂れ下がると、どこかに引っかかる可能性があるよ！",
       rows=[("ストラップあり", "{octo}、{gauge}をひっかけて、<b>「下向き」</b>に！",
              "上向きだと、{octo}から泡がボコボコ出てくることもあるよ"),
             ("ストラップなし", "{bc}のポケットに入れるのもOKだよ",
              "※レンタルだと、ストラップが無いこともあるよ"),
             ("ホース類", "<b>「腕より前」</b>に持ってこよう！", "※この方が、背中から探さずに済むよ！<br>引っかかりを、さらに防ぐため")])),
  ]),
 dict(id="3", title="“タンクくるくる”して空気を解放！",
  subs=[
   dict(id="3-1", key=["c19"], frames=["c18","c19"], gif="s3-1",
     title="{gauge}を、体の外へ向ける",
     extra=["万が一割れたときに備えて、下へ向けよう", "目はつぶらなくていいよ"]),
   dict(id="3-2", key=["c24"], frames=["c23","c24"], gif="s3-2",
     title="右に回しきって、左に半回転戻す",
     extra=["なんで戻すの？<br>→ <span class=\"nw\">万が一</span>ぶつかっても、<span class=\"nw\">{tank}くるくる</span>が固く締まることを防ぐためじゃよ！"]),
   dict(id="3-3", key=["c21","c22"], frames=["c20","c21","c22"], gif="s3-3",
     title="{gauge}の針が動いたか、<span class=\"nw\">もう一度見る</span>",
     pinkx=["170以下なら<wbr><span class=\"nw\">インストラクターへ確認しよう！</span><br>180以上でも、インストラクターに伝えておくと◎"]),
  ]),
 dict(id="4", title="全システム起動！“動作”チェック！",
  subs=[
   dict(id="4-1", key=["c26"], frames=["c26"],
     title="{gauge}で、空気が入っているか見る",),
   dict(id="4-2", key=["c27","c28"], frames=["c27","c28"], gif="s4-2",
     title="{bc}に空気が入る・抜けるか",
     pink=dict(head="L字サインを忘れない！",
       lines=["<b>空気を抜くときは、左手もピーン！</b><br>空気は上からしか抜けないから、<br>左手をピーンと上げて押す。<br>これが大切な姿勢！",
              "<b>イメージ</b>",
              "<span class=\"nw\">人差し指 → 親指よりスマートだから</span><br><span class=\"nw\">（空気が）しぼむ</span>",
              "<span class=\"nw\">親指 → 人差し指より幅があるから</span><br><span class=\"nw\">（空気が）ふくらむ</span>"])),
   dict(id="4-3", key=["c29"], frames=["c29"],
     title="{regu}で、息が吸えるか確かめる",),
   dict(id="4-4", key=["c30"], frames=["c30"],
     title="{octo}でも、息が吸えるか確かめる",
     extra=["黒は自分の、黄色は緊急用！"]),
  ]),
 dict(id="5", title="“重り”と“BCD”を装着！いざ変身！",
  subs=[
   dict(id="5-1", key=["c33"], frames=["c32","c33"], gif="s5-1",
     title="{belt}を巻く",
     extra=["外すときは、ベルトのあまり（左側）を<br>右へウラァイヤハァ！と引くだけ！"]),
   dict(id="5-2", key=["c35"], frames=["c34","c35"], gif="s5-2",
     title="{bc}を背負って、前側を留めていく",
     steps=dict(head="留める順番（レンタルでも基本は大体同じ）",
       rows=[("1", "お腹", "「ベリベリベルト」を留める"),
             ("2", "お腹", "<span class=\"nw\">「カチカチバックル」を留めた後、</span><br><span class=\"nw\">あまり紐を引いて締める</span>"),
             ("3", "胸", "<span class=\"nw\">「カチカチバックル」を留めた後、</span><br><span class=\"nw\">あまり紐を引いて締める</span>"),
             ("4", "肩", "<span class=\"nw\">あまり紐を</span><span class=\"nw\">ウラァイヤハァ！と</span><span class=\"nw\">引いて締める</span>"),
             ("5", "最後", "<span class=\"nw\">パジャマパーティーダンスで、</span>ズレないか確認<small>（ダンスでなくても可）</small>")])),
  ]),
 dict(id="6", title="貴様は“相棒”に相応しいか！“バディ”チェック！",
  gif="s6",
  subs=[
   dict(id="6-1", key=["c37"], frames=["c37"], title="{regu}が使えるか"),
   dict(id="6-2", key=["c38"], frames=["c38"], title="{octo}が使えるか"),
   dict(id="6-3", key=["c39"], frames=["c39"], title="<span class=\"nw\">{tank}くるくる</span>が開いているか"),
   dict(id="6-4", key=["c40"], frames=["c40"], title="空気の残り確認"),
   dict(id="6-5", key=["c41"], frames=["c41"], title="ゆるみがないか"),
  ]),
]

CHECK = [
 "{tank}の頭と{bc}のふち、そろった？",
 "Oリング、ある？",
 "<span class=\"nw\">{silver}ぐるぐる</span>、自分のほう？",
 "{kachi}、「カチッ」とした？",
 "ホース、ねじれてない？",
 "<span class=\"nw\">{tank}くるくる</span>、左に半回転戻した？",
 "{gauge}、180以上？",
 "{bc}、空気が入る・抜ける？",
 "{regu}・{octo}、吸えた？",
 "{belt}、すぐ外せる？",
 "バディと確認した？",
]

# 最後のページのクイズ（問い, 答え）。答えは、□をタップするまで見えない
QUIZ = [
 ("正式名称クイズ", [
  ("{silver}の正式名称は？", "ファーストステージ"),
  ("{regu}の正式名称は？", "セカンドステージ"),
  ("{octo}の正式名称は？", "オクトパス"),
  ("{kachi}の正式名称は？", "中圧ホース"),
  ("{belt}の正式名称は？", "ウェイトベルト"),
  ("ホースの塊の正式名称は？", "レギュレーター"),
 ]),
 ("役割クイズ", [
  # 役割クイズも、呼び方のあとに正式名称を必ず添える（10/8 ご指示）
  ("{silver}<span class=\"of2\">（ファーストステージ）</span>と合体するのは？", "{tank}と{bc}"),
  ("{kachi}<span class=\"of2\">（中圧ホース）</span>をつなぐのは？", "L字サインホース<span class=\"of2\">（インフレーターホース）</span>"),
  ("空気を抜くのは、どの指？", "人差し指（ピーン）"),
  ("空気を入れるのは、どの指？", "親指（オヤビン）"),
  ("<span class=\"nw\">{tank}くるくる</span><span class=\"of2\">（タンクバルブ）</span>を回しきったら？", "左に半回転戻す"),
  ("{gauge}がいくつ以下なら確認？", "170以下"),
  ("黄色い{octo}<span class=\"of2\">（オクトパス）</span>は、何用？", "緊急用"),
 ]),
]

TERMS = {
 "regu": "レギュ", "octo": "オクト", "gauge": "残圧計",
 "bc": "BCD", "silver": "銀色金具", "tank": "タンク", "belt": "重り", "kachi": "カチカチホース",
}

# 大事なポイント（最後のページに出す。どちらも動画にはない話）
POINTS = [
 ("用語は後回しでOK！", []),
 ("慣れてきたら、とにかく楽しよう！",
  ["{bc}はベンチに置いたまま付けてOK",
   "フィンは一生懸命動かさなくてOK<small>（ペースはインストラクターが合わせてくれる）</small>",
   "呼吸は、リラックスできるペースでOK"]),
]
