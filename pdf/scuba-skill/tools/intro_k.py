# スキル編 その1（2ページ）の中身と形（10/20 作り直し）
# まーく様「何の資料として役立っていない。当たり前を長く言っているだけ。写真は、なぜそれを選んだのか分からない。
#   資料の本質からやり直して。命に関わる」
# この2ページで身につけてほしいこと（目的）：
#   ① あわてる「しくみ」を知って、途中で止められる（止まる→吐く→考える→伝える）
#   ② よくある「気になる」と、その場でできることを、表で引ける（くわしいページへ飛べる）
#   ③ はぐれたときの決まり（1分さがす→ゆっくり浮上→水面で会う）を、潜る前に知っておく
# 写真は使わない（動画に、この場面を表すコマがない）。意味のあるオリジナルの図だけを使う。
# 出どころ（中身はすべてここで確かめた）
#   ・あわてる流れ（二酸化炭素がたまる→空気が足りない気がする→急いで上がりたくなる）、ゆっくり深い呼吸・休む：
#       DAN（ダイバーズアラートネットワーク）https://dan.org/alert-diver/article/public-safety-announcement-preventing-panic/
#       https://dan.org/alert-diver/article/your-lungs-and-diving/
#   ・「止まる→吐く→考える→動く」：scubadiving.com「Why Divers Panic」（Stop—Breathe—Think—Act）
#   ・息を止めない／ゆっくり浮上／耳が抜けなければ、合図→少し浮上→もう一度→だめなら中止：
#       PADI ブログ「ダイビングの黄金ルール」https://blog.padi.com/jp/the-golden-rules-of-scuba-diving/
#   ・はぐれたら1分さがして、ゆっくり浮上し、水面で会う：PADI オープン・ウォーター・ダイバー・マニュアル
#       （Global Dive の引用 https://globaldive.net/blog/blog1/help-i-ve-lost-my-buddy-）
#   ・不安は先に打ち明ける：熱烈先生の動画／水面近くで足が動くと沈めない：Totty フリー潜降
#   ・のどの渇き（みそ汁をすする口）：Totty 喉の渇き

# まとめのページ（13ページ）に出す、その1の一覧（短い言い方）。写真は、ゆっくり呼吸している顔（リラックス）
MATOME_SUBS = [
    dict(id="1-1", key=["rr18"], title="潜る前に、決めておく"),
    dict(id="1-2", key=["rr18"], title="あわてないように「ふり返る」", pink=True),
    dict(id="1-3", key=["rr18"], title="「気になる」は、こまめに手放す"),
    dict(id="1-4", key=["rr18"], title="はぐれたら：見回して、ゆっくり浮上", pink=True),
]

NV = "#4b2a73"   # スキル編の色（図の線）
BL = "#2f78c4"

def _ic(name):
    """小さな図（同じ線の太さ・同じ大きさでそろえる）"""
    g = {
     # 止まる：一時停止の記号（2本の縦の棒）
     "stop": f'<rect x="15" y="12" width="9" height="26" rx="2" fill="{NV}"/><rect x="31" y="12" width="9" height="26" rx="2" fill="{NV}"/>',
     # 停まる：手のひらを前に出す（止まっての合図と同じ形）
     "halt": f'<path d="M16 44 V20 a3 3 0 0 1 6 0 V8 a3 3 0 0 1 6 0 V20 V6 a3 3 0 0 1 6 0 V20 V9 a3 3 0 0 1 6 0 V30 C40 39 35 44 28 44 Z" fill="none" stroke="{NV}" stroke-width="3" stroke-linejoin="round"/>',
     # 空気が吸えない：口と、×
     "air": f'<circle cx="22" cy="25" r="16" fill="none" stroke="{NV}" stroke-width="3"/><path d="M15 30 h14" stroke="{NV}" stroke-width="3" stroke-linecap="round"/>'
            f'<path d="M40 10 l10 10 M50 10 l-10 10" stroke="#b4234a" stroke-width="3" stroke-linecap="round"/>',
     # 任せる：2人の頭と、つないだ手
     "trust": f'<circle cx="16" cy="14" r="7" fill="none" stroke="{NV}" stroke-width="3"/><circle cx="40" cy="14" r="7" fill="none" stroke="{NV}" stroke-width="3"/>'
              f'<path d="M8 44 C8 30 24 28 28 36 C32 28 48 30 48 44" fill="none" stroke="{BL}" stroke-width="3" stroke-linecap="round"/>',
     # 360度見回す：ぐるっと回る矢印と目
     "around": f'<path d="M46 25 A18 18 0 1 1 38 10" fill="none" stroke="{BL}" stroke-width="3" stroke-linecap="round"/><path d="M34 4 l6 6 l-7 4" fill="none" stroke="{BL}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
               f'<path d="M16 25 Q28 15 40 25 Q28 35 16 25 Z" fill="none" stroke="{NV}" stroke-width="2.6"/><circle cx="28" cy="25" r="4" fill="{NV}"/>',
     # 上と下：上下の矢印
     "updown": f'<path d="M28 4 V44 M20 12 L28 4 L36 12 M20 36 L28 44 L36 36" fill="none" stroke="{NV}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
     # 吐く：横顔の口から、泡が上へ
     "out": f'<circle cx="22" cy="26" r="17" fill="none" stroke="{NV}" stroke-width="3"/><circle cx="16" cy="22" r="2.2" fill="{NV}"/><circle cx="28" cy="22" r="2.2" fill="{NV}"/>'
            f'<ellipse cx="22" cy="33" rx="3" ry="2.4" fill="none" stroke="{NV}" stroke-width="2.4"/>'
            f'<g fill="#fff" stroke="{BL}" stroke-width="2.4"><circle cx="38" cy="30" r="2.6"/><circle cx="44" cy="20" r="3.6"/><circle cx="48" cy="8" r="2.6"/></g>',
     # 考える：頭と、はてなの吹き出し
     "think": f'<circle cx="20" cy="30" r="12" fill="none" stroke="{NV}" stroke-width="3"/>'
              f'<path d="M30 6 h20 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-10 l-6 6 v-6 h-4 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 z" fill="#fff" stroke="{BL}" stroke-width="2.4" stroke-linejoin="round"/>'
              f'<path d="M36 13 q0 -4 4 -4 q4 0 4 4 q0 3 -4 4 v2" fill="none" stroke="{BL}" stroke-width="2.4" stroke-linecap="round"/><circle cx="40" cy="22" r="1.5" fill="{BL}"/>',
     # 伝える：手を挙げて合図
     "tell": f'<path d="M22 44 V22 a3 3 0 0 1 6 0 V10 a3 3 0 0 1 6 0 V22 V12 a3 3 0 0 1 6 0 V24 V16 a3 3 0 0 1 6 0 V32 C46 40 40 44 34 44 Z" fill="none" stroke="{NV}" stroke-width="3" stroke-linejoin="round"/>'
             f'<path d="M8 14 l6 3 M6 24 h7 M8 34 l6 -3" stroke="{BL}" stroke-width="2.4" stroke-linecap="round"/>',
     # 見回す：目
     "look": f'<path d="M6 25 Q28 4 50 25 Q28 46 6 25 Z" fill="none" stroke="{NV}" stroke-width="3" stroke-linejoin="round"/><circle cx="28" cy="25" r="7" fill="{NV}"/><circle cx="30" cy="22" r="2" fill="#fff"/>',
     # 1分：時計
     "clock": f'<circle cx="28" cy="25" r="18" fill="none" stroke="{NV}" stroke-width="3"/><path d="M28 13 V25 H37" fill="none" stroke="{BL}" stroke-width="3" stroke-linecap="round"/>',
     # ゆっくり浮上：上向きの矢印と、泡
     "up": f'<path d="M24 44 V12 M14 22 L24 10 L34 22" fill="none" stroke="{NV}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
           f'<g fill="#fff" stroke="{BL}" stroke-width="2.4"><circle cx="42" cy="34" r="3"/><circle cx="44" cy="22" r="4"/><circle cx="41" cy="11" r="2.6"/></g>',
     # 水面で会う：波の上に2人の頭
     "meet": f'<circle cx="19" cy="20" r="8" fill="none" stroke="{NV}" stroke-width="3"/><circle cx="38" cy="20" r="8" fill="none" stroke="{NV}" stroke-width="3"/>'
             f'<path d="M4 36 q6 -5 12 0 t12 0 t12 0 t12 0" fill="none" stroke="{BL}" stroke-width="3" stroke-linecap="round"/>',
    }[name]
    return f'<svg class="ixi" viewBox="0 0 56 48" aria-hidden="true">{g}</svg>'

# コップの図（10/19 の見本で、まーく様に良いと言っていただいた形）。「気になる」がたまっても、こまめに手放せば余裕のまま
CUP = (f'<svg class="ixcup" viewBox="0 0 284 150" aria-hidden="true"><g font-family="M PLUS Rounded 1c" font-weight="800" font-size="11.5">'
       '<g fill="#5a4a7a"><rect x="4" y="6" width="90" height="20" rx="3" fill="#f0ecf7"/><text x="49" y="20" text-anchor="middle">マスクの水</text>'
       '<rect x="4" y="31" width="90" height="20" rx="3" fill="#f0ecf7"/><text x="49" y="45" text-anchor="middle">耳の痛み</text>'
       '<rect x="4" y="56" width="90" height="20" rx="3" fill="#f0ecf7"/><text x="49" y="70" text-anchor="middle">寒い</text>'
       '<rect x="4" y="81" width="90" height="20" rx="3" fill="#f0ecf7"/><text x="49" y="95" text-anchor="middle">急いでいる</text></g>'
       '<g transform="translate(24 -12)"><path d="M74 50 Q92 50 98 64" fill="none" stroke="#b9a8d6" stroke-width="2.4"/><path d="M95 58 l4 7 l3 -8 z" fill="#b9a8d6"/>'
       f'<path d="M100 42 L112 150 L178 150 L190 42" fill="#fff" stroke="{NV}" stroke-width="3" stroke-linejoin="round"/>'
       '<path d="M107 104 L112 148 L178 148 L183 104 Z" fill="#cfe9f7"/>'
       '<text x="145" y="132" text-anchor="middle" fill="#2f78c4" font-size="11">まだ余裕</text>'
       '<path d="M194 92 Q214 92 222 112" fill="none" stroke="#2f9e7a" stroke-width="2.4"/><path d="M218 106 l5 7 l2 -9 z" fill="#2f9e7a"/>'
       '<text x="230" y="70" text-anchor="middle" fill="#2f9e7a">こまめに</text><text x="230" y="84" text-anchor="middle" fill="#2f9e7a">手放す</text></g></g></svg>')

def pages(T, jump):
    """その1の2ページぶんの中身（HTML）を返す"""
    sec = lambda sid, title, body, extra="": (f'<section class="step wide nophoto ix{extra}"><h3 class="sh3"><span class="sn">{sid}</span>'
                                              f'<span>{T(title)}</span></h3>{body}</section>')
    # くわしいページへ飛ぶ印。合図のページは、番号ではなく「合図」と書く
    _jp = lambda c: (f'<a class="jump" href="#p__PG_SIG__"><span class="tapm scr">*</span>くわしくは<b>合図</b>（__PG_SIG__ページ）</a>' if c == "SIG" else jump(c))
    pk = lambda head, line: (f'<div class="notes"><div class="nt kpk"><span class="nk">大事</span><span class="nx"><b>{head}</b></span>'
                             f'<div class="ns">{line}</div></div></div>')
    # 10/20 作り直し（まーく様のご指摘）
    #   ・順番は、やる順：潜る前に決める → あわてそうなとき → 気になることの対処 → はぐれたら
    #   ・「止める」と「息を止めない」がややこしい → 呼吸の話（息を止めない・長く呼く などのよくある助言）は、この資料では書かない
    #     （呼吸のリズムは、あいちゃんがもう掴んでいる。かえって混乱する）
    #   ・「気づいたら」の4つは、どんなときでもできる順に：
    #       伝える（停まれなくても・考えられなくても、合図はできる）→ 停まる（停まれないときは、つかまる）
    #       → 空気が吸えないとき（エアがないの合図 → バディの予備の空気）→ 考えなくていい（任せる）
    #   ・はぐれたら：360度ぐるっと見回す → 上と下も → 見つからなければ、ゆっくり浮上 → 水面で会う（「1分探す」は使わない）
    #   ・「止まる」は使わず「停まる」
    # 10/21 まーく様「動画は何も参考にしてないのか」→ いただいた動画（19本）を読み直し、中身を動画から組み直した。
    #   行ごとの出どころ（動画の番号は youtu.be/ のあと）：
    #   体調：パパラギ先生 事故例 _5WJG7QlgW0（4:19 顔色が悪い日は、やめる勇気）
    #   心配なこと：熱烈先生 aES1ndyvCXY（6:36 不安を1つか2つ言っておく）・SHIRO DIVE fWYj7n5pbQk（18:27 言うのは迷惑じゃない）・パパラギ先生 UOWYYw_6R-c
    #   頭で1回なぞる：熱烈先生 aES1ndyvCXY（3:25）・WvxX4FgwIxo・英語 z2yIbIVPUhU（0:56）／まーく様「リラックスできている時にイメージトレーニング」
    before = [("体調", "具合が悪い日は、やめていい。鼻づまりの日も"),
              ("心配なこと", "先に1つずつ言う。<span class=\"nw\">言うのは迷惑じゃない</span>"),
              ("合図", "お店で少しちがう。<span class=\"nw\">形を合わせる</span>"),
              ("頭で1回なぞる", "落ち着いているときに、<span class=\"nw\">流れを思い浮かべる</span>")]
    chain = ('<div class="ixch ixch3">'
             '<span class="ixc">小さな心配が重なる</span><i class="ixa">▶</i>'
             '<span class="ixc">ドキドキ・まわりが見えにくい</span><i class="ixa">▶</i>'
             '<span class="ixc ixw">急いで上がりたくなる</span></div>')
    #   流れ：山田孝之さんの初ダイビング JV4Y5JFUl0Q（6:54 小さな心配が重なって苦しくなった）・熱烈先生 SCNIUKBHLLg（0:44）・パパラギ先生 yxGndu5whlk（9:54 ドキドキ・見える範囲がせまくなる）
    #   前ぶれ：熱烈先生 SCNIUKBHLLg（2:25 マスクを何度もさわる）・大人のダイビング倶楽部 goZLJAGXoQE（足の動かしすぎ）・Totty pcnoTiMgp5I（12:32 寒くないのに震える）
    sign = ""   # 前ぶれは、下の「気づいたら」の行に入れた（1行でおさまり、何に気づくのかがはっきりする）
    #   伝える：Totty（24:05 遠慮しないで早めに）・パパラギ先生 yxGndu5whlk（10:25）
    #   停まる：熱烈先生 CkhOk9KYVHE（6:00 フィンも止める）・DdQ_FBW611U（7:47 まず動きを止める）・Totty（23:28 止まっていれば、ガイドが戻ってくる）
    #           底か水面を見て確かめる：まーく様のご指示（10/20）
    #   つかまる：大人のダイビング倶楽部 C2DpfolYgmU（1:13）・goZLJAGXoQE（2:24）・パパラギ先生 ZE8B_kOCD2U（7:16）
    #   （前の「考えなくていい」は、パパラギ先生の「止まる→思い出す→動く」と反対に読めるので、「つかまったら任せる」に入れた）
    acts = [("tell", "伝える", "合図で、すぐ知らせる。どんなときでもできる"),
            ("halt", "停まる", "フィンも止めて待つ。<span class=\"nw\">底か水面を見て</span><span class=\"nw\">確かめる</span>"),
            ("trust", "つかまる", "岩やバディに。<span class=\"nw\">つかまったら、</span><span class=\"nw\">後は任せてOK</span>"),
            ("air", "空気が吸えない", "「エアがない」の合図で、<span class=\"nw\">バディの空気をもらう</span>")]
    act = '<div class="ixact">' + "".join(f'<div class="ixk"><span class="ixn">{i}</span>{_ic(k)}<b>{h}</b><span>{d}</span></div>' for i, (k, h, d) in enumerate(acts, 1)) + '</div>'
    flow = [("around", "見回す", "停まって、360度ぐるっと"),
            ("updown", "上と下も", "泡も探す"),
            ("up", "ゆっくり浮上", "それでもいなければ"),
            ("meet", "水面で会う", "水面でバディを待つ")]
    rows = [("マスクに水", "マスクの上を押さえて、鼻から呼く", "6-1"),
            ("耳が抜けない", '<span class="nw">合図して、少し上がってもう一度</span><br><span class="nw">抜けなければ、そのダイブは中止</span>', "2-1"),
            ("浮く・沈む", "{bc}で、少しずつ合わせる", "3-1"),
            ("{regu}が外れた", "くわえ直して、まず呼いてから吸う", "5-2"),
            ("遅れる・寒い", "がまんせず、合図で伝える", "SIG"),
            # こわくなった：山田孝之さん JV4Y5JFUl0Q（7:24 生き物に気持ちを向けたら落ち着いた）・SHIRO DIVE（19:55）・タテキ NWilL1G3rgM（5:37 怖さは付き合うもの）
            ("こわくなった", "魚や景色に、気持ちを向ける", "")]
    p1 = (sec("1-1", "潜る前に、決めておく",
              '<div class="ixtell ixtell4">' + "".join(f'<div class="ixt"><b><span class="ixn">{i}</span>{h}</b><span>{d}</span></div>' for i, (h, d) in enumerate(before, 1)) + '</div>')
          + sec("1-2", "あわてないように「ふり返る」",
              chain + sign
              + '<p class="ixh">前ぶれ（マスクを何度もさわる・足を動かし続ける・寒くないのに震える）に気づいたら、この順で</p>' + act
              # パパラギ先生 _5WJG7QlgW0（10:38 船に上がるまで外さない・14:18 押さえたまま咳）・SHIRO DIVE（3:02 外したくなった）・yxGndu5whlk（ゆっくり浅いほうへ）
              + pk(T("{regu}は外さない。急いで上がらない"), T("外したくなっても、くわえたまま。むせたら、押さえて咳をしてOK")))
          + sec("1-3", "「気になる」は、こまめに手放す",
                '<div class="ixcupw"><div class="ixtb">' + "".join(f'<span class="ixq">{T(a)}</span><span class="ixd">{T(b)}</span><span class="ixj">{_jp(c) if c else ""}</span>' for a, b, c in rows) + '</div>'
                + '<div class="ixcupc"><p class="ixh">コップに例えてみよう！</p>' + CUP + '<p class="ixs">「気になる」は、コップにたまる水。1つずつ、すぐに手放せば、いつも余裕のまま</p></div></div>')
          + sec("1-4", "はぐれたら、見回して、ゆっくり浮上",
                '<div class="ixact ixflow">' + "".join(f'<div class="ixk"><span class="ixn">{i}</span>{_ic(k)}<b>{h}</b><span>{d}</span></div>' for i, (k, h, d) in enumerate(flow, 1)) + '</div>'
                + pk("1人で、もう一度潜って探さない", "はぐれても、あなたのせいじゃない。水面でも見つからなければ、ボートやお店の人にすぐ知らせよう")))
    return [p1]

CSS = """
/* 10/20 その1（作り直し）：図と表で、ひと目で分かる形 */
.page .step.ix>.sh3+*{margin-top:0!important}   /* 題の下のすき間は、ほかの手順と同じ 2.4mm（ほかの決まりで二重にあいていた） */
.ix .ixlead{margin:0 0 1.4mm;font-size:10pt;line-height:1.5}
.ixch{display:grid;grid-template-columns:1fr 4mm 1fr 4mm 1.25fr 4mm 1fr;align-items:center}
.ixch.ixch3{grid-template-columns:1fr 4mm 1fr 4mm 1fr}
.ixch3 .ixc{padding:.9mm 1mm!important}
.ixtell4{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:2mm!important}
.ixtell4 .ixt{padding:1.4mm 1.6mm}
.ixtell4 .ixt>span:last-child{font-size:8.6pt}
.ixc{background:var(--pale);border-radius:1mm;padding:1.2mm 1mm;text-align:center;font-size:9.8pt;line-height:1.35}
.ixc.ixw{background:#ffe3ea;color:#b4234a}
.ixa{font-style:normal;text-align:center;color:var(--navy);font-size:9pt}
.ixnote{margin:1.2mm 0 0;font-size:9.2pt;line-height:1.5}
.ixh{margin:1.6mm 0 1mm;font-size:11pt;color:var(--navy)}
.ixact{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2mm}
.ixk{border:1px solid var(--line);border-radius:2mm;padding:1.4mm 1.4mm 1.4mm 2mm;display:grid;grid-template-columns:9mm minmax(0,1fr);column-gap:1.6mm;align-items:center;position:relative}
.ixk .ixn{position:absolute;left:-1px;top:-1px;border-radius:2mm 0 1mm 0!important}
.ixi{width:9mm;height:8mm;display:block;grid-row:1/3}
.ixk b{font-size:10pt;color:var(--navy);line-height:1.25}
.ixk>span:last-child{font-size:8.4pt;line-height:1.35}
.ixn{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;border-radius:1mm;background:var(--navy);color:#fff;font-size:8.5pt;line-height:1}
.ix .notes{margin-top:1.6mm}
.ixcupw{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5mm;align-items:stretch}   /* 10/20 まーく様「ここのスペースいらない」：表は中身の幅だけにして、空いた幅はコップの絵に回す */
.ixcupc{display:flex;flex-direction:column;justify-content:space-between}   /* コップの欄は、表の上の端から下の端までにそろえる（1-3 の中で、つり合いを取る） */
.ixcupc .ixh{margin-top:0}
.ixcupc .ixs{font-size:8.8pt;margin-top:1mm}
.ixh small{font-size:8.8pt;color:var(--ink);margin-left:1mm}
.ixpre{margin-top:1.6mm!important}
.ixcup{width:100%;height:auto;display:block}
.ixs{margin:0;font-size:9.8pt;line-height:1.5}
.ixtb{display:grid;grid-template-columns:max-content max-content max-content;margin-top:0;border-top:1px solid var(--line)}
.ixtb>span{padding:.7mm 1.2mm;border-bottom:1px solid var(--line);font-size:9.2pt;line-height:1.4;display:block;align-self:stretch}   /* flex にすると、ルビや詰めの印で字がばらばらになる */
.ixth{font-size:8.6pt!important;color:var(--muted);padding-top:1mm!important;padding-bottom:1mm!important}
.ixq{color:var(--navy)}
.ixj .jump{font-size:8.6pt;white-space:nowrap}
.ixtb2{grid-template-columns:18mm minmax(0,1fr)}
.ixtell{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.4mm}
.ixt{border:1px solid var(--line);border-radius:2mm;padding:1.8mm 2mm;display:flex;flex-direction:column;gap:.6mm}
.ixt b{font-size:10.5pt;color:var(--navy);display:flex;align-items:center;gap:1.4mm}
.ixt>span:last-child{font-size:9.2pt;line-height:1.45}
.ixt .ixn{align-self:flex-start}
.ixtell+.ixs{margin-top:1.6mm}
"""
