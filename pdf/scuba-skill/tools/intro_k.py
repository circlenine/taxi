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
    dict(id="1-1", key=["rr18"], title="あわてる前に「止める」：止まる→呼く→考える→伝える", pink=True),
    dict(id="1-2", key=["rr18"], title="「気になる」は、こまめに手放す"),
    dict(id="1-3", key=["rr18"], title="潜る前に、3つ伝えておく"),
    dict(id="1-4", key=["rr18"], title="はぐれたら：1分探して、水面で会う", pink=True),
    dict(id="1-5", key=["rr18"], title="自分のペースで、体を楽に"),
]

NV = "#4b2a73"   # スキル編の色（図の線）
BL = "#2f78c4"

def _ic(name):
    """小さな図（同じ線の太さ・同じ大きさでそろえる）"""
    g = {
     # 止まる：一時停止の記号（2本の縦の棒）
     "stop": f'<rect x="15" y="12" width="9" height="26" rx="2" fill="{NV}"/><rect x="31" y="12" width="9" height="26" rx="2" fill="{NV}"/>',
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
    # ── 1ページ目 ──
    chain = ('<div class="ixch">'
             '<span class="ixc">「気になる」が<br>たまる</span><i class="ixa">▶</i>'
             '<span class="ixc">息が浅く・<br>速くなる</span><i class="ixa">▶</i>'
             '<span class="ixc ixw">「空気が足りない」<br>気がする</span><i class="ixa">▶</i>'
             '<span class="ixc">急いで<br>上がりたくなる</span></div>'
             '<p class="ixnote"><b>空気は、ちゃんとあるよ。</b>速く浅い息では呼き残しが出て、体に二酸化炭素がたまるので、苦しく感じるだけ。だから、まず<b>長く呼く</b></p>')
    acts = [("stop", "止まる", "動くのをやめる。岩・ロープ・バディにつかまる"),
            ("out", "呼く", "口から、ゆっくり長く、全部呼く。吸うのは、その後"),
            ("think", "考える", "何が気になっているかを、1つだけ見つける"),
            ("tell", "伝える", "合図でインストラクターさんに伝える")]
    act = '<div class="ixact">' + "".join(f'<div class="ixk"><span class="ixn">{i}</span>{_ic(k)}<b>{h}</b><span>{d}</span></div>' for i, (k, h, d) in enumerate(acts, 1)) + '</div>'
    p1 = (sec("1-1", "あわてる前に「止める」",
              '<p class="ixlead">あわてるのは、とつぜんではないよ。この順で少しずつ進むから、途中で止めれば大丈夫</p>' + chain
              + '<p class="ixh">気づいたら、この4つ</p>' + act
              + pk("急いで水面へ上がらない・息を止めない", "上がると、肺の中の空気がふくらむから。ゆっくり上がって、息はいつも続けよう"))
          + sec("1-2", "「気になる」は、こまめに手放す",
                '<div class="ixcupw"><div><p class="ixh">コップに例えてみよう！</p><p class="ixs">「気になる」は、コップにたまる水。1つずつ、すぐに手放せば、いつも余裕のまま</p></div>' + CUP + '</div>'
                + '<div class="ixtb">'
                + "".join(f'<span class="ixq">{T(a)}</span><span class="ixd">{T(b)}</span><span class="ixj">{_jp(c)}</span>' for a, b, c in [
                    ("マスクに水が入る", "マスクの上を押さえて、鼻から呼く", "6-1"),
                    ("耳が痛い・抜けない", "合図して、少し上がってもう一度。抜けなければ、そのダイブは中止", "2-1"),
                    ("浮く・沈む", "呼くと沈み、吸うと浮く。底や壁を目印に確かめる", "3-1"),
                    ("{regu}が口から外れた", "探してくわえ直し、まず呼いてから吸う", "5-2"),
                    ("寒い・こわい・疲れた", "がまんしないで、合図で伝える", "SIG")]) + '</div>'))
    # ── 2ページ目 ──
    tell = [("体調", "寝不足・鼻づまり・かぜ気味は、耳が抜けにくくなる"),
            ("苦手なこと", "「マスクの水が苦手」など。先に言っておくと、気にかけてもらえる"),
            ("はぐれたときの決まり", "下の流れで良いか、合図と合わせて確かめる")]
    flow = [("look", "止まって見回す", "上と下も。泡を探す"),
            ("clock", "1分探す", "見つからなければ、次へ"),
            ("up", "ゆっくり浮上", "自分の泡を追いこさない速さで"),
            ("meet", "水面で会う", "水面で、バディを待つ")]
    p2 = (sec("1-3", "潜る前に、3つ伝えておく",
              '<div class="ixtell">' + "".join(f'<div class="ixt"><span class="ixn">{i}</span><b>{h}</b><span>{d}</span></div>' for i, (h, d) in enumerate(tell, 1)) + '</div>'
              + '<p class="ixs">不安は、先に口に出すだけでも、ぐっと軽くなるよ</p>')
          + sec("1-4", "はぐれたら：1分探して、水面で会う",
                '<div class="ixact ixflow">' + "".join(f'<div class="ixk"><span class="ixn">{i}</span>{_ic(k)}<b>{h}</b><span>{d}</span></div>' for i, (k, h, d) in enumerate(flow, 1)) + '</div>'
                + pk("1人で、もう一度潜って探さない", "水面で待ち、見つからなければ、ボートやお店の人にすぐ知らせよう。決まりはお店で少しちがうことがあるので、潜る前の説明で必ず確かめてね"))
          + sec("1-5", "自分のペースで、体を楽に",
                '<div class="ixtb ixtb2">' + "".join(f'<span class="ixq">{a}</span><span class="ixd">{b}</span>' for a, b in [
                    ("呼吸", "吸うより長く、ゆっくり呼く。空気が長持ちして、浮き沈みもおだやかになる"),
                    ("足", "水面の近くでバタバタすると、沈めない。ピタッと止めると、すっと沈める"),
                    ("ペース", "遅れそう・速いと感じたら、合図で伝えて、待ってもらおう"),
                    ("のど", "かわいたら、みそ汁をすする口で、ゆっくり吸う"),
                    ("練習", "潜る前に「止まる→呼く→考える→伝える」と「はぐれたら」を、頭の中で1回ずつ")]) + '</div>'))
    return [p1, p2]

CSS = """
/* 10/20 その1（作り直し）：図と表で、ひと目で分かる形 */
.page .step.ix>.sh3+*{margin-top:0!important}   /* 題の下のすき間は、ほかの手順と同じ 2.4mm（ほかの決まりで二重にあいていた） */
.ix .ixlead{margin:0 0 2mm;font-size:10.5pt;line-height:1.5}
.ixch{display:grid;grid-template-columns:1fr 4mm 1fr 4mm 1.25fr 4mm 1fr;align-items:center}
.ixc{background:var(--pale);border-radius:1mm;padding:2mm 1mm;text-align:center;font-size:9.8pt;line-height:1.35}
.ixc.ixw{background:#ffe3ea;color:#b4234a}
.ixa{font-style:normal;text-align:center;color:var(--navy);font-size:9pt}
.ixnote{margin:1.6mm 0 0;font-size:9.6pt;line-height:1.5}
.ixh{margin:2mm 0 1.2mm;font-size:11pt;color:var(--navy)}
.ixact{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2.4mm}
.ixk{border:1px solid var(--line);border-radius:2mm;padding:1.6mm 1.6mm 2mm;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative}
.ixk .ixn{position:absolute;left:1.2mm;top:1.2mm}
.ixi{width:14mm;height:12mm;display:block;margin:0 auto .6mm}
.ixk b{font-size:11pt;color:var(--navy)}
.ixk>span:last-child{font-size:9pt;line-height:1.4;margin-top:.6mm}
.ixn{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;border-radius:1mm;background:var(--navy);color:#fff;font-size:8.5pt;line-height:1}
.ix .notes{margin-top:2.4mm}
.ixcupw{display:grid;grid-template-columns:minmax(0,1fr) 54mm;gap:3mm;align-items:center}
.ixcup{width:100%;height:auto;display:block}
.ixs{margin:0;font-size:9.8pt;line-height:1.5}
.ixtb{display:grid;grid-template-columns:44mm minmax(0,1fr) auto;margin-top:2mm;border-top:1px solid var(--line)}
.ixtb>span{padding:1.1mm 1.2mm;border-bottom:1px solid var(--line);font-size:9.6pt;line-height:1.45;display:flex;align-items:center}
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
