# 10/19 の「新しい形」を、3冊で共通に使う部品
#   ・題を色の帯に入れる（リベ大の「5つの力を身につけよう！」の形）
#   ・写真と説明を、細い線の1つの箱でつなぐ
#   ・動作の写真（前▶後）のあいだに矢印
# まーく様のご指示「前のデータはすぐに戻せるように」：NEWDESIGN=0 で、前の形（題は線の見出し、写真と説明は別々）に戻る
import os
ON = os.environ.get("NEWDESIGN", "0") == "1"   # 10/20 まーく様「リベ大に合わせたパターンの前のバージョンにまで戻して」→ ふだんは前の形。NEWDESIGN=1 で新しい形
# 10/19 まーく様：色の見出しつきカードの形（CARD）は「やはり前の形に戻して」→ ふだんは使わない。NDCARD=1 で見られる
CARD = os.environ.get("NDCARD", "0") == "1"

# 冊ごとの色：帯の色／箱の線／説明の地／点線／印の四角
COL = {
    "1": ("#16466b", "#cfe5f2", "#f4fafe", "#d7eef9", "#a9d8ef"),   # 準備編（青）
    "2": ("#6b3410", "#fcd8bd", "#fff7f1", "#ffe2cc", "#f6c095"),   # 洗浄編（オレンジ）
    "3": ("#4b2a73", "#dcc9f1", "#faf6fe", "#e2d4f2", "#cdb5ea"),   # スキル編（紫）
}
NAME = {"1": "準備編", "2": "洗浄編", "3": "OW編"}   # 10/24 スキル編 → OW編

def header(no, head_no, head_title_html, lg, old_html):
    """ページの題。新しい形なら色の帯、そうでなければ前の形（old_html）"""
    if not ON or not head_no:
        return old_html
    num = head_no[2:] if head_no.startswith("その") else (head_no[2:] if head_no.startswith("工程") else head_no)
    return (f'<div class="ph band"><span class="bno{" bw" if len(num) > 1 else ""}">{num}</span>'
            f'<div class="btx"><small>{NAME[no]}　{head_no}{lg}</small><h2>{head_title_html}</h2></div></div>')

def css(no):
    if not ON:
        return FINE_OLD + chips(no)   # 前の形でも、10/20 のご指摘（ピンク地が見づらい・まとめの写真が小さい）は直したまま
    m, line, bg, dash, dot = COL[no]
    return (CARD_CSS.format(line=line, bg=bg) if CARD else "") + FINE + f"""
/* 題の帯（10/19 リベ大の題の形）。角は丸めない（左右いっぱいなので、下の角が欠けて見える） */
.ph.band{{display:flex!important;align-items:center;gap:3.4mm;background:{m};color:#fff;margin:0 0 3mm!important;padding:3mm 4mm!important;border:0!important}}
.ph.band .bno{{flex:none;width:12mm;height:12mm;border-radius:1mm;background:#fff;color:{m};display:grid;place-items:center;font-size:17pt;font-weight:900;line-height:1}}
.ph.band .bno.bw{{font-size:11pt}}
.ph.band .btx{{flex:1}}
.ph.band .btx small{{display:flex!important;align-items:center;font-size:9pt;font-weight:700;opacity:.92;letter-spacing:.04em;line-height:1.3}}
.ph.band h2{{color:#fff!important;margin:0!important;font-size:19pt!important;line-height:1.3!important}}
.ph.band h2 *{{color:#fff!important}}
.ph.band h2 .half{{color:inherit}}
.ph.band .legend.hl{{margin-left:auto!important;position:static!important;color:#fff!important;font-size:8pt!important;gap:1.2mm}}
/* 写真と説明を、細い線の1つの箱でつなぐ（10/19 まーく様：薄い枠でつながっているのが見やすい） */
.step>.photos,.step>.notes{{border:1px solid {line};background:#fff}}
.step>.photos{{border-bottom:0;padding:1.6mm 1.6mm 1.2mm;margin-bottom:-2.4mm}}
.step>.notes{{border-top:0;padding:0 2.4mm 1.2mm;background:{bg}}}
.step>.photos+.notes{{box-shadow:inset 0 1px 0 {line}}}
.step .nt{{border-top:1px dashed {dash}!important;padding:1.8mm .4mm!important}}
.step .nt:first-child{{border-top:0!important}}
.step .nt .nx,.step .nt .ns{{position:relative}}
.step .nt .ns:not(:has(.srows)){{padding-left:3.2mm;margin-top:1.2mm}}
.step .nt .ns:has(.srows){{margin-top:1.2mm}}
.step .nt .ns:not(:has(.srows))::before{{content:"";position:absolute;left:.4mm;top:.62em;width:1.6mm;height:1.6mm;background:{dot}}}
.step .cap3{{color:{m};font-size:8.5pt}}
/* やる前 → やった後：2枚の写真のあいだに矢印 */
.photos .ph3+.ph3{{position:relative}}
.photos .ph3+.ph3::before{{content:"▶";position:absolute;left:-3.4mm;top:38%;z-index:2;width:5.4mm;height:5.4mm;display:grid;place-items:center;background:{m};color:#fff;font-size:8pt;line-height:1;border-radius:1mm;box-shadow:0 0 0 .6mm #fff}}
"""

CARD_CSS = """
/* ── 10/19 まーく様「スキル編の2ページのような形に、ほかも合わせて」 ──
   ・中のページは、しま模様と白い台紙をやめ、うすい地の1枚にする（2ページと同じ）
   ・題の帯は、ページの左右いっぱい・いちばん上に置く。左上の小さな札は帯の中に入っているので消す
   ・手順は「色の見出しつきのカード」。見出しの地の色・番号の色は、カードごとに 緑→ピンク→黄→青 の順 */
.page:not(#p1){{background:#fbf8ff!important}}
.page:not(#p1)::before{{display:none!important}}
.page:not(#p1)>.edtag{{display:none!important}}
.page:not(#p1)>.ph.band{{margin:-15mm -14mm 4mm!important;padding:3.4mm 14mm 3.8mm!important}}
.step{{--cc:#2f9e7a;--cb:#e3f5ee;border:1px solid {line}!important;background:#fff;gap:0!important;padding:0!important;border-radius:0!important}}
.step:nth-of-type(4n+2){{--cc:#d9466f;--cb:#fde6ec}}
.step:nth-of-type(4n+3){{--cc:#c98a00;--cb:#fff3cf}}
.step:nth-of-type(4n+4){{--cc:#2f78c4;--cb:#e1eefb}}
.step>.sh3{{background:var(--cb);padding:2.2mm 3mm!important;border-bottom:1px solid {line};color:var(--cc)!important;margin:0!important}}
.step>.sh3 .sn{{background:var(--cc)!important;color:#fff!important;border-radius:1mm}}
.step>.photos{{border:0!important;padding:0!important;margin:0!important;gap:1px!important;background:{line}}}
.step>.photos img{{border-radius:0!important}}
.step>.notes{{border:0!important;border-top:1px solid {line}!important;padding:1.4mm 3mm 2mm!important;background:{bg}!important;box-shadow:none!important;flex:1}}
.step>.photos+.notes{{box-shadow:none!important}}
.step .cap3{{background:#fff;padding:.6mm 0}}
/* 写真でも説明でもない中身（表・SASUKEの例え など）は、カードのふちに付かないよう内側に余白（すき間をそろえるため、margin ではなく padding で） */
.step>*:not(.sh3):not(.photos):not(.notes):not(.regrow):not(.trio){{margin:0!important;padding:2.4mm 3mm!important;box-sizing:border-box}}
.step>.regrow,.step>.trio,#p2 .step>.trio{{margin:0!important}}
#p2 .tools>.step.wide>.regrow>*{{margin-top:0!important}}   /* 写真の並び（レギュの図・3枚並び）は、写真と同じくカードのふちいっぱい */
"""

# 10/19 まーく様「ピンク背景部分が見辛い」「一つひとつの見やすさを徹底」
#   ・大事の欄：ピンクのぬりつぶしをやめ、白地＋左のピンクの太線。見出しだけ赤、説明は黒い字（ぬりの上の赤い字は読みにくいため）
#   ・説明の行：行どうしのすき間を少し広げ、2行目からの補足は少し小さく・うすく（見出しと説明の差をはっきり）
#   ・1ページまとめ：写真を大きく（小さすぎて見えなかった）
FINE = """
.kpk{position:relative;background:#fff!important;border:0!important;border-radius:0!important;margin:1.2mm 0!important;padding:1.6mm 2.4mm 1.6mm 2.6mm!important}
.notes .kpk{padding:1.6mm 2.4mm 1.6mm 2.6mm!important}
.kpk::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#e0507f}   /* 10/20 太さは「点の数」で決める（4px）。1.2mm だと、置く場所によって画面で4点にも5点にも丸められ、左の列と右の列で太さが変わっていた */   /* 左の太線（線の太さの決まりは1pxなので、線ではなく細い帯で描く） */
.kpk .nk{background:#e0507f!important;color:#fff!important}
.kpk .nx,.kpk .nx b,.kpk .nh{color:#b4234a!important}
.kpk .ns,.kpk .ns *:not(.t):not(.nn2):not(.pbt){color:#1f2a37!important}   /* 10/23 札（.pbt）は白い字のまま */
.step .nt{padding:2.2mm .4mm!important}
.step .nt.kpk,.notes .nt.kpk{padding:2mm 2.4mm 2mm 3.2mm!important}   /* 大事の欄は、左の太線と札がくっつかないよう、左を広くあける */
.step .nt .nx{font-weight:900}
.step .nt .ns{font-size:.94em}
/* 10/20 まーく様「1ページまとめは、画像をもっと大きく、文章は画像の下に（他と統一）」
   → 3列にして、どのまとめも「見出し → 大きな写真（列の幅いっぱい） → 文 → くわしくは」の縦の並びにする */
.mtg{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:3mm 4mm!important;align-content:start!important}
.mtc{display:flex!important;flex-direction:column;gap:1.4mm!important;padding-top:2mm!important}
.mtc>img{width:100%!important;height:auto!important;aspect-ratio:2.2!important;object-fit:cover;order:1}
.mtc>.mts li+li{margin-top:.3mm!important}
.mtc>.mts{line-height:1.38!important}
.page:has(.mtg) .mtl{font-size:9.5pt!important}
.page:has(.mtg) .ph h2{font-size:20pt!important}
.mtg>.mtsrc{grid-column:span 2;align-self:end;margin:0!important}   /* 写真の出どころは、まとめの空いたマスに入れる（スキル編） */
.page:has(.mtg) .ph h2{white-space:nowrap}   /* まとめの題は1行に（2行だと写真の場所が足りない） */
.mtc>.mth{order:0;font-size:10pt!important}
.mtc>.mts{order:2}
.mtc>.mth{min-height:2.8em!important;align-items:center!important}   /* 10/20 まーく様「1行と2行での画像のズレ」：題が1行でも2行ぶんの高さを取り、同じ段の写真の上の端をそろえる（photoalign.js で点検） */
.mtc>.jump{order:3;margin-top:auto!important;white-space:normal!important}
"""

FINE_OLD = FINE.replace(".step .nt{padding:2.2mm .4mm!important}", "").replace(".step .nt.kpk,.notes .nt.kpk", ".notes .nt.kpk")

# 10/20 まーく様「枠文字は全て白文字で統一。枠の地は白が見やすい濃い色に。ただし大事がいちばん目立つ色に」
#   「補足も、大事よりは目立たない形で、うすい左縦線を」
def chips(no):
    m, line, bg, dash, dot = COL[no]
    return f"""
.page .sn,.page .tl,.page .no,.page .nk,.page .kx .nk,.page .lx,.page .lp,.page .mtk,.page .half.rel,.page .nn,.page .nn2,.page .qh,.page .mk,.page .play{{background:{m}!important;color:#fff!important;box-shadow:none!important}}
.sn *,.tl *,.no *,.half.rel *{{color:#fff!important}}
.page .lp,.page .kpk .nk,.page .mtk{{background:#b4234a!important;color:#fff!important}}   /* 大事＝いちばん目立つ濃い赤 */
.page .half.rel.new{{background:#b4234a!important}}
/* 10/20 まーく様「しおりの札は右があくので、左も同じくらいあけてバランスを」
   → 字は「札の四角い部分（矢印の先を除いた所）」のまん中に置く。右の余白＝左の余白＋矢印の先（1.8mm）。arrowcheck.js で、画面の字の左右の余白を測る */
html body .page .no,html body .page .tl,html body .page .sn,html body .page .qh{{display:inline-flex!important;align-items:center;justify-content:center;box-sizing:border-box;letter-spacing:0!important}}   /* 字間を空けると、最後の字の後ろにも空きができて、字が左に寄る */
html body .page .no{{padding-left:1.6mm!important;padding-right:3.4mm!important}}
html body .page .tl{{padding-left:0!important;padding-right:1.8mm!important}}
html body .page .sn{{padding-left:2.4mm!important;padding-right:4.2mm!important}}
html body .page .qh{{padding-left:3mm!important;padding-right:4.8mm!important}}
/* 10/20 まーく様「もくじの右の札と、大事・補足の札が同じ形で見分けがつかない。形を変えて、種類をはっきり分けて」
   札の形の決まり（種類ごとに1つの形）：
   ・番号（1-1・①など）……………… 濃い地に白い字（矢印の形）
   ・補足／大事（欄の札）………………… 濃い地に白い字（四角）
   ・題の横の札（前半・後半・ふり返り・NEW）… 白地に、色の線と色の字（中を塗らない） */
/* 番号の札は、どこでも同じ矢印の形（もくじの「その1」・ページ左上の「その2」も、手順の「2-1」と同じ）。
   補足／大事（四角）と形で見分けられるようにする。矢印の先の分だけ右をあけて、字を見た目のまん中に置く */
.page .tl,.page .no{{border-radius:0!important;box-sizing:border-box;padding-right:2.2mm!important;padding-left:.6mm!important;
 clip-path:polygon(0 0,calc(100% - 1.8mm) 0,100% 50%,calc(100% - 1.8mm) 100%,0 100%)!important}}
.page .half,.page .half.rel,.page .half.rel.new{{background:#fff!important;color:{m}!important;box-shadow:inset 0 0 0 1px {m}!important}}
.page .half *,.page .half.rel *{{color:inherit!important}}
.page .half.rel.new{{color:#b4234a!important;box-shadow:inset 0 0 0 1px #b4234a!important}}
/* 10/20 まーく様「参考動画の部分は、全面に背景色を入れた方が、リンクがあると伝わりやすい。ただし、うるさくない色で」
   → 表紙の「このPDFの使い方」と同じ、いちばんうすい地の色（冊ごとの色）。線はやめて、地の色だけで1つのまとまりに見せる */
/* 10/20 まーく様「動画リンクは必ず背景をつけて分かりやすく、統一」→ 本文の中の YouTube のリンクにも、うすい地の色の札 */
.page a[href*="youtu"]:not(.ref){{background:var(--pale)!important;border-radius:1mm;padding:.2mm 1.2mm;text-decoration:underline}}
.page .ref{{background:var(--pale)!important;border:0!important;border-radius:2mm!important;padding:2.4mm 3mm!important}}
/* 10/20 まーく様「枠背景は番号などに統一。本文中の枠背景はごちゃごちゃする」
   → 本文の中の言葉（ファーストステージ など）は、枠をやめて「色つきの太字＋下線」で目立たせる */
.page .sasuke .fs,.page .fs{{display:inline!important;background:none!important;color:{m}!important;padding:0!important;border-radius:0!important;box-shadow:none!important;
 font-weight:700!important;text-decoration:underline;text-decoration-thickness:.12em;text-underline-offset:.24em;text-decoration-color:{line};text-decoration-skip-ink:none}}
.kpk::before{{background:#b4234a!important}}
.notes .kx{{position:relative;padding-left:3.2mm!important}}   /* 字の始まりを大事の欄とそろえる */
.notes .kx::before{{content:"";position:absolute;left:0;top:1.4mm;bottom:1.4mm;width:4px;background:{line}}}   /* 補足：うすい色の左縦線。太さは大事と同じ（10/20 まーく様「左側の線の太さは合わせて」）。差は色だけでつける */
.mtc>.mts{{position:relative;padding-left:3.2mm!important}}   /* 10/20 まーく様「本文には左線を入れて」（まとめの札の文） */
.mtc>.mts::before{{content:"";position:absolute;left:0;top:.6mm;bottom:.6mm;width:4px;background:{line}}}   /* 補足の左線と同じ太さ・同じ色 */
.mcard>.mcq{{position:relative;padding-left:3.2mm!important}}   /* 10/23 まーく様「集約版はなぜ他と合わせて左に線が入っていないのか」→ スキル編の集約版の文にも同じ左線 */
.mcard>.mcq::before{{content:"";position:absolute;left:0;top:.6mm;bottom:.6mm;width:4px;background:{line}}}
/* 10/20 まーく様「クイズは、質問文にも、答えと同じ幅で背景色を」→ 質問＝濃い地に白い字、答え＝うすい地。左右の幅はそろえる */
.page .qz .q{{background:{m};color:#fff!important;padding:1mm 2mm;border-radius:1mm;display:block;box-sizing:border-box;font-size:10pt;line-height:1.45!important}}   /* flex にすると、字と札がばらばらの箱になって崩れる（10/20 洗浄編で確かめた）ので block */
/* 10/23 まーく様「■のある文字が、ほかの文字とズレている」→ 問いが2行になったとき、2行目の書き出しを「*」の右（1行目の字の始まり）にそろえる */
.page .qz .q{{padding-left:calc(2mm + .76em)!important;text-indent:-.76em}}
.page .qz .q>.tapm:first-child{{text-indent:0}}   /* 「*」の幅（.59em）＋すき間（.17em）＝.76em ぶん、2行目を下げる */
/* 10/23 まーく様「左の問いが3行のとき、答えの枠との間に変な空白がある。答えの枠を広げて空白をなくして」→ 答えの枠は、残りの高さいっぱいまで伸ばす */
/* 10/24 まーく様「クイズの質問の高さがバラバラ。答えは1行分・質問は2行分で統一。他の資料も、長いほうにそろえる」
   → 枠は伸ばさず、問い・答えそれぞれ、その冊でいちばん高いものに高さをそろえる（eqQuiz） */
.page .quiz{{align-items:start!important}}
.page .quiz .qz{{grid-template-rows:auto auto!important;align-items:start!important;align-self:start!important}}
.page .quiz .qz .a{{min-height:5.4mm;align-self:start!important;box-sizing:border-box}}
html body .page .quiz .qz .q{{box-sizing:border-box;padding-top:2.2px!important;padding-bottom:2.2px!important;line-height:1.32!important}}
html body .page .quiz .qz{{padding-top:2px!important;padding-bottom:2px!important;row-gap:1.4px!important}}   /* 高さをそろえたぶん、すき間を詰めて1ページに収める */
.page .qz .q .jump{{text-indent:0}}
.page .qz{{row-gap:.6mm!important}}
.page .qz .q *{{color:#fff!important}}
.page .qz .a{{padding-left:2mm;box-sizing:border-box}}
"""
