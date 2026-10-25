# 表紙の題を「ロゴ」にする（10/20 まーく様「もっとロゴっぽく、オリジナリティのある形に。ダイビング感を出して」）
# 3つの案を絵（SVG）で描く。字はグーグルの無料の字（Lilita One・Fredoka・Pacifico。どれも自由に使える）
#   A「水面」 … 字の上半分が水の上（ピンク）、下半分が水の中（深くなるほど濃い青）。境目に波の線、泡が上がる
#              水の中は、どの冊でも青（茶色だと泥水に見えるため）。冊の色は、下の英語と線で出す
#              ※ #1c6ea4 は、冊ごとの色に置きかえられてしまう色なので使わない（#2f78c4 を使う）
#   B「深さ」 … 字の下のほうを横のすじで切る（水の中に沈んでいく感じ）。下に筆記体の小さな題
#   C「旗」   … ダイバーの旗（赤地に白のななめ線＝「いま人が潜っています」の印）を左に置いた紋章
# 切り替え：LOGO=A／B／C／D（標準は D。LOGO=0 で、いままでの筆記体の題）
import os, math
LOGO = os.environ.get("LOGO", "I")   # 10/20 作り直した D を標準に（いままでの筆記体の題に戻すときは LOGO=0）
if LOGO == "0": LOGO = ""
LINK = "family=Lilita+One&family=Fredoka:wght@600;700"
PINK, AQUA, RED = "#e0507f", "#a8d3ea", "#c8372d"

def _wave(y, amp, step, x0=-20, x1=1020):
    d = f"M{x0} {y}"
    x = x0
    up = True
    while x < x1:
        d += f" Q{x + step/2} {y - amp if up else y + amp} {x + step} {y}"
        x += step; up = not up
    return d

def svg(v, m, uid="lg"):
    sub = (f'<g class="lf-f sp10" font-family="Fredoka" font-weight="600" font-size="30" fill="{m}" text-anchor="middle" letter-spacing="10">'
           f'<text x="500" y="238">FOR A GIRLIE SMILE</text></g>'
           f'<path d="M95 228 H205 M795 228 H905" stroke="{m}" stroke-width="2"/>')
    if v == "A":
        w = _wave(112, 9, 46)
        return f'''<svg class="logo" viewBox="0 10 1000 242" role="img" aria-label="Safe Dive for a Girlie smile"><defs>
<linearGradient id="{uid}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{AQUA}"/><stop offset=".45" stop-color="#2f78c4"/><stop offset="1" stop-color="#103f66"/></linearGradient>
<clipPath id="{uid}u"><path d="{w} V-10 H-20 Z"/></clipPath><clipPath id="{uid}w"><path d="{w} V300 H-20 Z"/></clipPath>
<clipPath id="{uid}t"><text x="500" y="178" text-anchor="middle" class="lf-l sp4" font-family="Lilita One" font-size="168" letter-spacing="4">Safe Dive</text></clipPath></defs>
<g class="lf-l sp4" font-family="Lilita One" font-size="168" text-anchor="middle" letter-spacing="4">
<text x="500" y="178" fill="{PINK}" clip-path="url(#{uid}u)">Safe Dive</text>
<text x="500" y="178" fill="url(#{uid}d)" clip-path="url(#{uid}w)">Safe Dive</text></g>
<path d="{w}" fill="none" stroke="#fff" stroke-width="5" clip-path="url(#{uid}t)"/>
<g fill="#fff" stroke="{m}" stroke-width="3"><circle cx="912" cy="78" r="11"/><circle cx="932" cy="48" r="7"/><circle cx="946" cy="24" r="4.5"/></g>
{sub}</svg>'''
    if v == "B":
        cuts = "".join(f'<rect x="0" y="{y:.1f}" width="1000" height="{h:.1f}" fill="#000"/>' for y, h in
                       [(110, 2.5), (119, 3.5), (129, 4.5), (140, 5.5), (152, 6.5)])
        return f'''<svg class="logo" viewBox="0 10 1000 242" role="img" aria-label="Safe Dive for a Girlie smile"><defs>
<linearGradient id="{uid}d" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="{m}"/><stop offset="1" stop-color="#1c6ea4"/></linearGradient>
<mask id="{uid}m"><rect width="1000" height="255" fill="#fff"/>{cuts}</mask></defs>
<text x="470" y="170" text-anchor="middle" class="lf-l" font-family="Lilita One" font-size="158" letter-spacing="5" fill="url(#{uid}d)" mask="url(#{uid}m)">SAFE DIVE</text>
<text x="880" y="232" text-anchor="end" class="lf-p" font-family="Pacifico" font-size="54" fill="{PINK}">for a Girlie smile</text>
<g fill="none" stroke="{m}" stroke-width="3"><circle cx="925" cy="105" r="10"/><circle cx="948" cy="72" r="6.5"/><circle cx="962" cy="48" r="4"/></g></svg>'''
    if v == "C":
        return f'''<svg class="logo" viewBox="0 10 1000 242" role="img" aria-label="Safe Dive for a Girlie smile"><defs>
<clipPath id="{uid}f"><rect x="40" y="40" width="170" height="170" rx="10"/></clipPath></defs>
<g clip-path="url(#{uid}f)"><rect x="40" y="40" width="170" height="170" fill="{RED}"/><path d="M40 40 L72 40 L210 178 L210 210 L178 210 L40 72 Z" fill="#fff"/></g>
<path d="{_wave(196, 7, 28, 40, 210)} V215 H40 Z" fill="{m}" clip-path="url(#{uid}f)"/>
<text x="250" y="138" class="lf-p" font-family="Pacifico" font-size="104" fill="{m}"><tspan fill="{PINK}">S</tspan>afe <tspan fill="{PINK}">D</tspan>ive</text>
<text x="262" y="205" class="lf-f sp7" font-family="Fredoka" font-weight="600" font-size="40" fill="{m}" letter-spacing="7">for a <tspan fill="{PINK}">G</tspan>irlie <tspan fill="{PINK}">s</tspan>mile</text>
<path d="{_wave(224, 5, 24, 262, 730)}" fill="none" stroke="{AQUA}" stroke-width="4"/>
<g fill="#fff" stroke="{m}" stroke-width="3"><circle cx="760" cy="74" r="10"/><circle cx="782" cy="46" r="6.5"/><circle cx="798" cy="24" r="4"/></g></svg>'''
    if v == "D":
        # 10/20 作り直し（まーく様「Safe Dive だけ大きくしない。Safe Dive for a Girlie Smile 全体が題」「ダイビングを楽しく。笑顔・あたたかみ」）
        # しかけの意味：
        #   ・2つの段は、同じ字・同じ大きさ・同じ太さ。題はひとつながり（Safe Dive だけを目立たせない）
        #   ・水面の線が「笑った口」の形（両はしが上がる弧＋口の角）。海そのものが笑っている＝楽しいダイビング
        #   ・上の段は、水の上のあたたかい日の光の色（ピンク）。下の段は、水の中（青）。
        #     「安全に潜った（Safe Dive）先に、笑顔（Girlie Smile）がある」
        #   ・泡は、水の中から水面へ上がっていき、いちばん上の泡が、にっこり顔＝あなたの笑顔
        # ※ 水の色は、冊ごとの色に置きかえられない色（#d3ebf9・#9fcfe8・#2f78c4）にしてある。#d4ecfa などは洗浄編で桃色、スキル編で藤色に変わってしまう
        smile = "M110 118 Q500 192 890 118"
        return f'''<svg class="logo" viewBox="0 26 1000 206" role="img" aria-label="Safe Dive for a Girlie Smile"><defs>
<linearGradient id="{uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef7fa0"/><stop offset="1" stop-color="{PINK}"/></linearGradient>
<linearGradient id="{uid}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f78c4"/><stop offset="1" stop-color="#103f66"/></linearGradient>
<linearGradient id="{uid}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d3ebf9"/><stop offset=".7" stop-color="#d3ebf9" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<linearGradient id="{uid}h" x1="0" y1="0" x2="1" y2="0"><stop offset=".08" stop-color="#000"/><stop offset=".22" stop-color="#fff"/><stop offset=".78" stop-color="#fff"/><stop offset=".92" stop-color="#000"/></linearGradient></defs>
<mask id="{uid}m"><rect x="0" y="0" width="1000" height="260" fill="url(#{uid}h)"/></mask>
<path d="{smile} L890 236 L110 236 Z" fill="url(#{uid}w)" mask="url(#{uid}m)"/>
<path d="M190 140 Q500 204 810 140" fill="none" stroke="#9fcfe8" stroke-width="3" stroke-linecap="round"/>   <!-- 水面の下の、うすいさざ波 -->
<path d="{smile}" fill="none" stroke="#2f78c4" stroke-width="5" stroke-linecap="round"/>
<path d="M92 102 Q98 120 116 119 M908 102 Q902 120 884 119" fill="none" stroke="#2f78c4" stroke-width="5" stroke-linecap="round"/>
<text class="lf-f lf7" x="500" y="96" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="88" fill="url(#{uid}s)">Safe Dive</text>
<text class="lf-f lf7" x="500" y="222" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="88" fill="url(#{uid}d)">for a Girlie Smile</text>
<g fill="#fff" stroke="#2f78c4" stroke-width="3"><circle cx="918" cy="200" r="5"/><circle cx="928" cy="170" r="7"/><circle cx="932" cy="138" r="5"/></g>
<g fill="#fff" stroke="{PINK}" stroke-width="3"><circle cx="930" cy="98" r="5"/></g>
<g transform="translate(944 56)"><circle r="21" fill="#fff" stroke="{PINK}" stroke-width="4"/><circle cx="-7" cy="-4" r="2.8" fill="{PINK}"/><circle cx="7" cy="-4" r="2.8" fill="{PINK}"/><path d="M-9 5 Q0 14 9 5" fill="none" stroke="{PINK}" stroke-width="3.2" stroke-linecap="round"/></g></svg>'''
    if v == "E":
        # 10/20 作り直し（まーく様「ロゴとしての完成度が最悪。素人レベルなら意味がない」）
        # 形：海辺の看板・サーフブランドで定番の「ステッカー型」。題の字に白いふちと、ずらした影をつけ、1つのかたまりにする
        #   ・後ろの夕日（あたたかさ）は、下のほうを横すじで切って、海に沈む形に
        #   ・夕日の下は、重なった波（海）
        #   ・題は2行とも同じ字・同じ大きさ（Safe Dive だけを大きくしない）
        #   ・Smile の下の飾り線は、両はしが上がった「笑った口」＝笑顔
        #   ・泡は D の右から上がる
        NAVY, CORAL, SUN1, SUN2, SEA1, SEA2 = "#173a63", "#e0507f", "#ffd27a", "#ff9a8b", "#7cc7e8", "#2f78c4"
        stripes = "".join(f'<rect x="300" y="{y}" width="400" height="{h}" fill="#000"/>' for y, h in [(138, 5), (152, 7), (167, 9)])
        def ttl(y, txt, fill):
            return (f'<text class="lf-p" x="504" y="{y + 6}" text-anchor="middle" font-family="Pacifico" font-size="76" fill="{NAVY}" stroke="{NAVY}" stroke-width="12" stroke-linejoin="round">{txt}</text>'
                    f'<text class="lf-p" x="500" y="{y}" text-anchor="middle" font-family="Pacifico" font-size="76" fill="{fill}" stroke="#fff" stroke-width="12" stroke-linejoin="round" paint-order="stroke">{txt}</text>')
        return f'''<svg class="logo" viewBox="140 2 720 244" role="img" aria-label="Safe Dive for a Girlie Smile"><defs>
<linearGradient id="{uid}sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SUN1}"/><stop offset="1" stop-color="{SUN2}"/></linearGradient>
<mask id="{uid}cut"><rect x="0" y="0" width="1000" height="260" fill="#fff"/>{stripes}</mask>
<clipPath id="{uid}up"><rect x="0" y="0" width="1000" height="182"/></clipPath></defs>
<g mask="url(#{uid}cut)" clip-path="url(#{uid}up)"><circle cx="500" cy="150" r="120" fill="url(#{uid}sun)"/></g>
<path d="M170 176 Q214 160 258 176 T346 176 T434 176 T522 176 T610 176 T698 176 T786 176 L830 176 L830 214 Q830 226 818 226 L182 226 Q170 226 170 214 Z" fill="#cdebf8"/>
<path d="M170 196 Q222 180 274 196 T378 196 T482 196 T586 196 T690 196 T794 196 L830 196 L830 214 Q830 226 818 226 L182 226 Q170 226 170 214 Z" fill="{SEA1}"/>   <!-- 波はうすい青2段。題の青い字が沈まないように -->
<path d="M200 186 Q240 174 280 186 M520 184 Q560 172 600 184" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
{ttl(104, "Safe Dive", CORAL)}
{ttl(196, "for a Girlie Smile", SEA2)}
<path d="M590 214 Q662 246 740 212" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/>
<path d="M590 214 Q662 246 740 212" fill="none" stroke="{CORAL}" stroke-width="6" stroke-linecap="round"/>
<g fill="#fff" stroke="{SEA2}" stroke-width="3.5"><circle cx="652" cy="58" r="7"/><circle cx="672" cy="34" r="10"/><circle cx="694" cy="13" r="5.5"/></g></svg>'''
    # ── 10/20 まーく様「根本から見直して、いくつかのパターンを」── 考え方のちがう形を並べて選んでいただく
    NV, PK, SEA, SKY, SKIN = "#173a63", "#e0507f", "#2f78c4", "#cdebf8", "#ffe1cc"
    def face(cx, cy, r):
        # にっこり顔のダイバー：顔の円＋マスク（2つの窓と鼻の部分）＋笑った口＋シュノーケル
        k = r / 60
        def P(d): return d
        return (f'<g transform="translate({cx} {cy}) scale({k})">'
                f'<path d="M50 -10 Q66 -10 66 -30 V-78" fill="none" stroke="{NV}" stroke-width="13" stroke-linecap="round"/>'
                f'<path d="M50 -10 Q66 -10 66 -30 V-78" fill="none" stroke="{PK}" stroke-width="7" stroke-linecap="round"/>'
                f'<circle r="60" fill="{SKIN}" stroke="{NV}" stroke-width="5"/>'
                f'<path d="M-62 -10 H62" stroke="{NV}" stroke-width="9" stroke-linecap="round"/>'
                f'<path d="M-46 -14 Q-46 -32 -28 -32 H28 Q46 -32 46 -14 V2 Q46 18 30 18 H12 Q6 18 4 10 Q0 4 -4 10 Q-6 18 -12 18 H-30 Q-46 18 -46 2 Z" fill="{PK}" stroke="{NV}" stroke-width="5" stroke-linejoin="round"/>'
                f'<path d="M-38 -12 Q-38 -24 -26 -24 H-6 Q0 -24 0 -18 V-4 Q0 8 -12 10 H-26 Q-38 10 -38 0 Z M38 -12 Q38 -24 26 -24 H6 Q0 -24 0 -18 V-4 Q0 8 12 10 H26 Q38 10 38 0 Z" fill="{SKY}"/>'
                f'<path d="M-30 -16 L-20 -16 M10 -16 L20 -16" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
                f'<circle cx="-20" cy="-3" r="5" fill="{NV}"/><circle cx="20" cy="-3" r="5" fill="{NV}"/>'
                f'<path d="M-22 32 Q0 50 22 32" fill="none" stroke="{NV}" stroke-width="6" stroke-linecap="round"/>'
                f'<circle cx="-36" cy="30" r="7" fill="#ffb3c4"/><circle cx="36" cy="30" r="7" fill="#ffb3c4"/></g>')
    def bub(pts, col=SEA):
        return '<g fill="#fff" stroke="' + col + '" stroke-width="3.5">' + "".join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in pts) + '</g>'
    if v == "F":
        # エンブレム型（ダイビングショップのワッペンの形）：まわりの輪に題、まん中ににっこり顔のダイバー
        return f'''<svg class="logo" viewBox="0 0 300 300" role="img" aria-label="Safe Dive for a Girlie Smile"><defs>
<path id="{uid}t" d="M42 150 A108 108 0 0 1 258 150"/><path id="{uid}b" d="M36 150 A114 114 0 0 0 264 150"/>
<clipPath id="{uid}c"><circle cx="150" cy="150" r="86"/></clipPath></defs>
<circle cx="150" cy="150" r="140" fill="{NV}"/><circle cx="150" cy="150" r="132" fill="none" stroke="#fff" stroke-width="2"/>
<circle cx="150" cy="150" r="90" fill="#fff"/>
<g clip-path="url(#{uid}c)"><rect x="60" y="60" width="180" height="180" fill="{SKY}"/>
<path d="M60 196 Q82 184 105 196 T150 196 T195 196 T240 196 V240 H60 Z" fill="#7cc7e8"/><path d="M60 214 Q82 202 105 214 T150 214 T195 214 T240 214 V240 H60 Z" fill="{SEA}"/></g>
<circle cx="150" cy="150" r="88" fill="none" stroke="{PK}" stroke-width="5"/>
{face(146, 156, 40)}
{bub([(200, 128, 4.5), (208, 110, 6), (200, 92, 3.5)])}
<text class="lf-f lf7" font-family="Fredoka" font-weight="700" font-size="36" fill="#fff" letter-spacing="3"><textPath href="#{uid}t" startOffset="50%" text-anchor="middle">SAFE DIVE</textPath></text>
<text class="lf-f lf7" font-family="Fredoka" font-weight="700" font-size="22" fill="#fff" letter-spacing="2"><textPath href="#{uid}b" startOffset="50%" text-anchor="middle">FOR A GIRLIE SMILE</textPath></text>
<g fill="{PK}"><circle cx="24" cy="150" r="5"/><circle cx="276" cy="150" r="5"/></g></svg>'''
    if v == "G":
        # マーク＋文字型（会社のロゴの定番）：左ににっこり顔のダイバーのマーク、右に題を2行（同じ字・同じ太さ）
        return f'''<svg class="logo" viewBox="0 0 760 240" role="img" aria-label="Safe Dive for a Girlie Smile">
<circle cx="120" cy="124" r="100" fill="{SKY}"/><path d="M28 160 Q60 146 92 160 T156 160 T214 158 A100 100 0 0 1 28 160 Z" fill="#7cc7e8"/>
{face(120, 118, 58)}
{bub([(214, 70, 6), (228, 46, 9), (220, 20, 5)])}
<text class="lf-f lf7" x="252" y="112" font-family="Fredoka" font-weight="700" font-size="84" fill="{PK}">Safe Dive</text>
<text class="lf-f lf7" x="254" y="186" font-family="Fredoka" font-weight="700" font-size="54" fill="{NV}">for a Girlie Smile</text>
<path d="M256 206 Q330 222 404 206 T552 206 T700 206" fill="none" stroke="{SEA}" stroke-width="5" stroke-linecap="round"/></svg>'''
    if v == "H":
        # 波に乗る1行型：題をまるごと1行の筆記体にして、波の形に沿わせる。下に波の線、はしから泡
        return f'''<svg class="logo" viewBox="0 0 1000 220" role="img" aria-label="Safe Dive for a Girlie Smile"><defs>
<path id="{uid}w" d="M40 130 C200 70 330 170 500 120 S800 70 960 120"/>
<linearGradient id="{uid}g" x1="0" x2="1"><stop offset="0" stop-color="{PK}"/><stop offset=".5" stop-color="#b65fb0"/><stop offset="1" stop-color="{SEA}"/></linearGradient></defs>
<path d="M40 170 C200 120 330 200 500 160 S800 120 960 160" fill="none" stroke="{SKY}" stroke-width="16" stroke-linecap="round"/>
<path d="M40 186 C200 140 330 214 500 178 S800 140 960 178" fill="none" stroke="#7cc7e8" stroke-width="7" stroke-linecap="round"/>
<text class="lf-p" font-family="Pacifico" font-size="70" fill="url(#{uid}g)" stroke="#fff" stroke-width="10" stroke-linejoin="round" paint-order="stroke"><textPath href="#{uid}w" startOffset="50%" text-anchor="middle">Safe Dive for a Girlie Smile</textPath></text>
{bub([(958, 92, 7), (972, 64, 10), (962, 34, 6)])}</svg>'''
    if v == "I":
        # 10/20 まーく様「案1で進める。左右の空白が気になるので1行に」「色を変えるのは S・D・G・s の頭文字だけ（略して SDGs との関係）」
        #   「題とサブタイトルも、つながったロゴに」「題の色は、後ろの太陽に合わせて、上が明るく下が暗く（光の加減）」「海は鮮やかなほう」
        #   ・題は1行の筆記体。白いふち＋紺のずらした影（ステッカー型）
        #   ・頭文字 S D G s はピンク、ほかは青。どちらも上が明るく、下へ濃くなる（太陽の光が上から当たる）
        #   ・サブタイトルは、題のすぐ下の波（海）の帯の上に白い字で入れて、1つのロゴにする。SDGs は頭文字と同じピンク
        # 10/20 まーく様「ロゴの全体の色合いは、各編のテイストに合わせて」→ 題の字・影・海・泡の色を、冊の色（青・オレンジ・紫）にする
        #   頭文字 S D G s と「笑顔」「安全」のピンク、太陽、夕日の光は、どの冊も同じ（SDGs のしるしと、夕日の場面は変えない）
        #   ※ 冊ごとに置きかえられる色（各冊の COLORS の左側）は使わない。置きかえられると、ねらった色にならない
        PAL = {"#16466b": dict(t0="#5aa9e6", t1="#1d4f8f", nv="#173a63", s1="#7cc7e8", s2="#2f78c4"),   # 準備編（青）
               "#6b3410": dict(t0="#f7a96a", t1="#b0521c", nv="#5a2c0e", s1="#f6b98c", s2="#c8622a"),   # 洗浄編（オレンジ）
               "#4b2a73": dict(t0="#b08be6", t1="#5a2f96", nv="#3d2160", s1="#c3a8ec", s2="#7446b3"),
               "#1f5c45": dict(t0="#6fcfa5", t1="#22704f", nv="#17463a", s1="#8fdcb9", s2="#2f8a62")}   # スーツ編（緑）   # スキル編（紫）
        P = PAL.get(m, PAL["#16466b"])
        NAVY = P["nv"]
        # 波の白い光の線：手前の波（濃い青）の山の形に、ぴったり沿わせる（目で置かずに、波と同じ式から点を出す）
        #   手前の波は 120 ごとに山と谷。山のまん中は x = 60 + 240k、高さ y = 206 - 36·t(1-t)。光は山の上を 7 下げて、t=0.16〜0.84 の間だけ
        def crest(x0):
            pts = []
            for i in range(13):
                t = 0.16 + 0.68 * i / 12
                pts.append(f"{x0 + 120 * t:.1f} {206 - 36 * t * (1 - t) + 7:.1f}")
            return "M" + " L".join(pts)
        # 10/20 まーく様「同じ形の白い線がならぶと、ただの記号に見える」→ 白い線はやめて、
        #   太陽の光が海に映る「光の道」にする（夕日の真下の水面に、長さのちがう光のすじが、下へいくほど短く・うすくなる）
        #   太陽（x=600）の真下にだけ置く。長さ・高さ・濃さはすべてちがえる（同じ形を並べない）
        GL = [(198, 170, .95), (208, 120, .85), (218, 80, .7), (228, 44, .5)]   # サブタイトル（上はし y≈236）に重ならない所まで
        glint = "".join(f'<rect x="{600 - w / 2 + dx:.0f}" y="{y}" width="{w}" height="{h}" rx="{h / 2}" fill="#ffd9a0" opacity="{o}"/>'
                        for (y, w, o), dx, h in zip(GL, (-6, 8, -4, 5), (5, 4.5, 4, 3.5)))
        # 10/20 まーく様「smile の下が変なくぼみで恐怖。波のゆらぎを調整して smile の下にくるように。太陽の光で少し赤みを帯びた感じに。自然に」
        #   → 波の形は、ふつうのゆれだけ（くぼみは作らない）。ゆれの長さを決めて、谷の1つがちょうど smile の真下に来るようにする
        #   → その谷のあたりの水面だけ、夕日の光が映ったように、うすく赤みを帯びさせる（まわりへ自然に消えていく）
        #   smile の字の左右のはし（画面で測った：907〜1086）のまん中に、谷のいちばん下
        import math as _m
        SM0, SM1 = 907, 1086
        SMC = (SM0 + SM1) / 2
        PER1 = (SM1 - SM0) * 2      # 谷の幅（ゆれの半分）＝ smile の字の幅
        def wave(base, amp, per, top=False, x0=-20, x1=1220):
            ph = SMC - per / 4      # smile のまん中が、谷のいちばん下（sin＝1）
            xs = sorted({SMC + 4 * k for k in range(-320, 321) if x0 <= SMC + 4 * k <= x1})
            d = "M" + " L".join(f"{x:.1f} {base + amp * _m.sin(2 * _m.pi * (x - ph) / per):.1f}" for x in xs)
            return d if top else d + " V300 H-20 Z"
        W1 = wave(182, 13, PER1)
        W2 = wave(208, 8, PER1 * 1.25)
        # 夕日の光：smile の下の谷の水面のふちだけ、うすく赤く光る（谷の両はしの山まで、なめらかに消える）
        RIM = wave(185, 13, PER1, True, SM0 - 60, SM1 + 60)
        T = (("S", "afe "), ("D", "ive "), ("", "for a "), ("G", "irlie "), ("s", "mile"))
        def line(x, y, fill_main, fill_ini, extra=""):
            sp = "".join((f'<tspan fill="{fill_ini}">{a}</tspan>' if a else "") + f'<tspan fill="{fill_main}">{b}</tspan>' for a, b in T)
            return f'<text class="lf-p" x="{x}" y="{y}" text-anchor="middle" font-family="Pacifico" font-size="84" {extra}>{sp}</text>'
        # 10/21 まーく様「安全と笑顔、黄色などにして、もっと視認性を良く」→ 明るい黄色（どの冊の帯の上でも、明るさの差3以上。logocheck.js で点検）
        sub = ('<text class="lf-k" x="600" y="262" text-anchor="middle" font-family="Kaisei Decol" font-weight="700" font-size="30" fill="#fff">'
               '〜あなたの<tspan fill="#ffec40">笑顔</tspan>のための、<tspan fill="#ffec40">安全</tspan>なダイビング（略してSDGs）〜</text>')   # 10/20 ピンクは「笑顔」「安全」（SDGs ではない）)
        return f'''<svg class="logo" viewBox="40 0 1120 284" role="img" aria-label="Safe Dive for a Girlie Smile 〜あなたの笑顔のための、安全なダイビング（略してSDGs）〜"><defs>
<linearGradient id="{uid}sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9a8b"/></linearGradient>
<linearGradient id="{uid}bl" gradientUnits="userSpaceOnUse" x1="0" y1="62" x2="0" y2="168"><stop offset="0" stop-color="{P['t0']}"/><stop offset="1" stop-color="{P['t1']}"/></linearGradient>
<linearGradient id="{uid}pk" gradientUnits="userSpaceOnUse" x1="0" y1="62" x2="0" y2="168"><stop offset="0" stop-color="#ff8fb0"/><stop offset="1" stop-color="#c8336a"/></linearGradient>
<clipPath id="{uid}up"><rect x="0" y="0" width="1200" height="190"/></clipPath>
<clipPath id="{uid}sunc"><circle cx="600" cy="150" r="128"/></clipPath></defs>
<!-- 10/21 太陽の横じまは、マスク（PDFで画像になり、iPhoneで灰色の板になる）ではなく、白い帯を重ねて描く -->
<g clip-path="url(#{uid}up)"><circle cx="600" cy="150" r="128" fill="url(#{uid}sun)"/>
<g clip-path="url(#{uid}sunc)" fill="#fff"><rect x="400" y="136" width="400" height="6"/><rect x="400" y="152" width="400" height="8"/><rect x="400" y="170" width="400" height="10"/></g></g>
<clipPath id="{uid}sea"><rect x="40" y="150" width="1120" height="134" rx="10"/></clipPath>
<g clip-path="url(#{uid}sea)">
<linearGradient id="{uid}glow" gradientUnits="userSpaceOnUse" x1="{SM0 - 60}" y1="0" x2="{SM1 + 60}" y2="0"><stop offset="0" stop-color="#ff9e8a" stop-opacity="0"/><stop offset=".5" stop-color="#ff9e8a" stop-opacity=".9"/><stop offset="1" stop-color="#ff9e8a" stop-opacity="0"/></linearGradient>
<path class="smilewave" d="{W1}" fill="{P['s1']}"/>
<path d="{RIM}" fill="none" stroke="url(#{uid}glow)" stroke-width="6" stroke-linecap="round"/>   <!-- 夕日の光が水面のふちに映った、うすい赤み -->
<path d="{W2}" fill="{P['s2']}"/>
{glint}</g>
{line(605, 156, NAVY, NAVY, f'stroke="{NAVY}" stroke-width="13" stroke-linejoin="round"')}
{line(600, 150, f"url(#{uid}bl)", f"url(#{uid}pk)", 'stroke="#fff" stroke-width="12" stroke-linejoin="round" paint-order="stroke"')}
<g fill="#fff" stroke="{P['s2']}" stroke-width="3.5"><circle cx="1110" cy="96" r="7"/><circle cx="1128" cy="66" r="10"/><circle cx="1148" cy="38" r="6"/></g>
{sub}</svg>'''
    return ""

def apply(html, m):
    """表紙の題（h1.cv-t）を、ロゴの絵に入れかえる。LOGO が空なら何もしない"""
    if not LOGO:
        return html
    import re
    if LOGO == "I":
        html = re.sub(r'<p class="cv-sd">.*?</p>', '', html, count=1, flags=re.S)   # サブタイトルはロゴの中に入れたので、別の行は消す
    return re.sub(r'<h1 class="cv-t">.*?</h1>', '<h1 class="cv-t cv-logo lg' + LOGO + '">' + svg(LOGO, m) + '</h1>', html, count=1, flags=re.S)

CSS = """
/* ロゴの絵：ページの左右いっぱい。字の決まり（解星デコール）を受けつがないよう、絵の中の字は絵の側で決める */
#p1 h1.cv-logo{display:block;margin:1mm 0 0!important;line-height:0!important;white-space:normal!important}
#p1 h1.cv-logo svg{display:block;width:100%;height:auto}
#p1 h1.cv-logo text.lf-k.lf-k,#p1 h1.cv-logo text.lf-k.lf-k tspan{font-family:"Kaisei Decol",serif!important;font-weight:700!important;letter-spacing:.02em!important}
#p1 h1.cv-logo text.lf-p.lf-p,#p1 h1.cv-logo text.lf-f.lf-f{letter-spacing:0!important;font-feature-settings:normal!important}   /* 筆記体はつながった字。字間を空けると、つながりが切れて重なる */
#p1 h1.cv-logo.lgI svg{width:100%!important;height:auto!important;margin:0!important}   /* 10/20 海の帯の左右＝表紙の本文の幅（番号の箱の左はし〜右の線のはし） */
#p1 h1.cv-logo.lgE svg,#p1 h1.cv-logo.lgF svg,#p1 h1.cv-logo.lgG svg,#p1 h1.cv-logo.lgH svg{width:auto;height:37mm;margin:0 auto}   /* ステッカー型は横幅いっぱいにせず、高さを決めてまん中に（もくじまで1ページに収める） */
/* 表紙の題の決まり（筆記体・影）が絵の中の字にまで効かないよう、強く書く */
#p1 h1.cv-logo,#p1 h1.cv-logo *{text-shadow:none!important}
#p1 h1.cv-logo .sp10.sp10{letter-spacing:10px!important}#p1 h1.cv-logo .sp7.sp7{letter-spacing:7px!important}#p1 h1.cv-logo .sp4.sp4,#p1 h1.cv-logo .sp4.sp4 *{letter-spacing:4px!important}
#p1 h1.cv-logo .lf-l,#p1 h1.cv-logo .lf-l *{font-family:"Lilita One",sans-serif!important;font-weight:400!important}
#p1 h1.cv-logo .lf-f,#p1 h1.cv-logo .lf-f *{font-family:"Fredoka",sans-serif!important;font-weight:600!important}
#p1 h1.cv-logo .lf-f.lf7{font-weight:700!important}
#p1 h1.cv-logo .lf-p,#p1 h1.cv-logo .lf-p *{font-family:"Pacifico",cursive!important;font-weight:400!important}
"""
