# 表紙の題を「ロゴ」にする（10/20 まーく様「もっとロゴっぽく、オリジナリティのある形に。ダイビング感を出して」）
# 3つの案を絵（SVG）で描く。字はグーグルの無料の字（Lilita One・Fredoka・Pacifico。どれも自由に使える）
#   A「水面」 … 字の上半分が水の上（ピンク）、下半分が水の中（深くなるほど濃い青）。境目に波の線、泡が上がる
#              水の中は、どの冊でも青（茶色だと泥水に見えるため）。冊の色は、下の英語と線で出す
#              ※ #1c6ea4 は、冊ごとの色に置きかえられてしまう色なので使わない（#2f78c4 を使う）
#   B「深さ」 … 字の下のほうを横のすじで切る（水の中に沈んでいく感じ）。下に筆記体の小さな題
#   C「旗」   … ダイバーの旗（赤地に白のななめ線＝「いま人が潜っています」の印）を左に置いた紋章
# 切り替え：LOGO=A／B／C／D（標準は D。LOGO=0 で、いままでの筆記体の題）
import os, math
LOGO = os.environ.get("LOGO", "E")   # 10/20 作り直した D を標準に（いままでの筆記体の題に戻すときは LOGO=0）
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
    return ""

def apply(html, m):
    """表紙の題（h1.cv-t）を、ロゴの絵に入れかえる。LOGO が空なら何もしない"""
    if not LOGO:
        return html
    import re
    return re.sub(r'<h1 class="cv-t">.*?</h1>', '<h1 class="cv-t cv-logo lg' + LOGO + '">' + svg(LOGO, m) + '</h1>', html, count=1, flags=re.S)

CSS = """
/* ロゴの絵：ページの左右いっぱい。字の決まり（解星デコール）を受けつがないよう、絵の中の字は絵の側で決める */
#p1 h1.cv-logo{display:block;margin:1mm 0 0!important;line-height:0!important;white-space:normal!important}
#p1 h1.cv-logo svg{display:block;width:100%;height:auto}
#p1 h1.cv-logo.lgE text.lf-p.lf-p{letter-spacing:0!important;font-feature-settings:normal!important}   /* 筆記体はつながった字。字間を空けると、つながりが切れて重なる */
#p1 h1.cv-logo.lgE svg{width:auto;height:37mm;margin:0 auto}   /* ステッカー型は横幅いっぱいにせず、高さを決めてまん中に（もくじまで1ページに収める） */
/* 表紙の題の決まり（筆記体・影）が絵の中の字にまで効かないよう、強く書く */
#p1 h1.cv-logo,#p1 h1.cv-logo *{text-shadow:none!important}
#p1 h1.cv-logo .sp10.sp10{letter-spacing:10px!important}#p1 h1.cv-logo .sp7.sp7{letter-spacing:7px!important}#p1 h1.cv-logo .sp4.sp4,#p1 h1.cv-logo .sp4.sp4 *{letter-spacing:4px!important}
#p1 h1.cv-logo .lf-l,#p1 h1.cv-logo .lf-l *{font-family:"Lilita One",sans-serif!important;font-weight:400!important}
#p1 h1.cv-logo .lf-f,#p1 h1.cv-logo .lf-f *{font-family:"Fredoka",sans-serif!important;font-weight:600!important}
#p1 h1.cv-logo .lf-f.lf7{font-weight:700!important}
#p1 h1.cv-logo .lf-p,#p1 h1.cv-logo .lf-p *{font-family:"Pacifico",cursive!important;font-weight:400!important}
"""
