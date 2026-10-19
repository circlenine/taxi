# 字の形（フォント）を3冊でそろえる（10/19 まーく様：「タイトルと文章のフォントの違いで、かなり違和感」
#   「リベ大に倣った形で、全部再調整。題と本文で変えるのは良いが、統一性・違和感のないものに」）
# リベ大の図解は、題も本文も「角の丸い、太めのゴシック体」の1家族でそろえ、太さだけで差をつけている。
# いままでは 表紙＝筆記体（Pacifico）＋飾りの明朝体（解星デコール）、中＝角ゴシック（Noto Sans JP）で、3種類が混ざっていた。
# FONTSET=mix  … 題（大きい字）は丸ゴシック（Zen Maru Gothic）、本文は角ゴシック（Noto Sans JP）。どちらもゴシック体なので、なじむ
#   全部を丸ゴシックにしないわけ：無料で使える丸ゴシックは、どれも「句読点・カナのすき間を詰める」働き（palt）を持っていない。
#   本文まで丸ゴシックにすると、字のすき間が空いて間のびし、ページからあふれる（10/19 試して確かめた）。
# FONTSET=maru … 全部 Zen Maru Gothic（比べる用）
# FONTSET=kaku … 全部 Noto Sans JP（角ゴシック）。表紙の題も同じ字にする（比べる用）
# FONTSET=old  … いままでのまま
import os
MODE = os.environ.get("FONTSET", "old" if os.environ.get("NEWDESIGN", "0") != "1" else "libe")   # NEWDESIGN=0 なら、字の形も前のまま   # 10/19 まーく様：案1・案2とも不可。表紙の題の筆記体は「きれいで、ダイビングに合っている」→ 前の字に戻した
_FAM = {"maru": '"Zen Maru Gothic"', "kaku": '"Noto Sans JP"', "mix": '"Noto Sans JP"'}
_HEAD = {"maru": '"Zen Maru Gothic"', "kaku": '"Noto Sans JP"', "mix": '"Zen Maru Gothic"'}

# FONTSET=libe … 10/19 まーく様：「リベ大の“5つの力を身につけよう！”のフォントに」
#   10/19：最初は Mochiy Pop P One を選んだが、まちがい。リベ大の題の字は「ラノベPOP v2」（まーく様にいただいた）
#   題（帯の題・手順の題・表紙の副題と〇〇編・もくじ・まとめの見出し）にだけ使う。この字は太さが1つしかなく、
#   長い文には向かないため。本文は BODY（環境変数 BODYFONT：maru＝丸ゴシック／kaku＝角ゴシック）
BODY = os.environ.get("BODYFONT", "kaku")   # 丸ゴシックの本文は字のすき間が空いて間のびした（10/19 見比べ）→ 本文は角ゴシック

def links(old):
    if MODE == "libe":
        return old.replace('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+P+One&family=Zen+Maru+Gothic:wght@500;700;900&', 1)
    if MODE == "old":
        return old
    return ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900'
            '&family=Noto+Sans+JP:wght@500;700;900&display=swap">')

# 札（大事・補足・NEW!! など）の字を、箱のまん中に置く（10/19 まーく様：「大事のタグの背景も、字とズレてます」）
#   ずれの原因1：箇条書きの「字下げ（text-indent）」が札の中にまで効いて、字が箱から左にはみ出していた
#   ずれの原因2：行の高さで上下を決めていたため、字の形しだいで下に寄っていた → 行の高さを1にして、上下の余白を同じにする
CHIP = """
.lp,.lx,.mtk,.half.rel,.nk{text-indent:0!important}
.t{text-indent:0!important}   /* 器材名の色の四角も、同じ「字下げ」で左へずれて、札に食いこんでいた（準備編・洗浄編まとめ） */
/* 10/20 上下の余白は、字が下に寄って見えないよう、上をせまく・下を広く（2枚撮りの確認で、上下のまん中にそろうことを確かめた） */
.mtk,.nk,.lx,.lp,.half.rel{line-height:1!important;padding-top:.55mm!important;padding-bottom:.45mm!important;vertical-align:.08em}
.notes .nk{padding-top:.28mm!important;padding-bottom:.72mm!important}
.half.rel{padding-top:.3mm!important;padding-bottom:.7mm!important}   /* 題の右の札（NEW!!・ふり返り）も、字が下に寄って見えるので上をせまく */   /* 説明の欄の札（行の頭に置く block の札）だけ、字が下に寄るので上をせまく */
"""

# 表紙の副題・「〇〇編」・数字は、中の題と同じゴシック体（10/19 まーく様：違和感は「表紙の題（明朝）と、中の題（ゴシック）」）
# 英語の題（筆記体 Pacifico）は「きれいで、ダイビングに合っている」ので残す
COVER = """
#p1 .cv-sd,#p1 .cv-sd *{font-family:"Noto Sans JP",sans-serif!important;font-weight:700!important;letter-spacing:.02em!important}
.cover .cv-no,.cover .cv-e,.cover .cv-e *{font-family:"Noto Sans JP",sans-serif!important;font-weight:900!important;letter-spacing:.04em!important}
.cover .cv-no{letter-spacing:0!important}
.cover .cv-no .cvn{transform:translate(.24mm,-1.2mm)!important}   /* 字の形が変わったので、数字が枠の「左右まん中・上下は気持ち上」に来るよう位置を合わせ直した（numcheck.py） */
"""

# 数字ごとに、字の左右のすき間がちがうので、横の位置を数字ごとに合わせる（numcheck.py で測った）
_NX = {"1": "-.09mm", "2": ".24mm", "3": ".24mm"}
_NXL = {"1": ".7mm" if os.environ.get("HEADFONT", "mochiy") == "lanobe" else ".7mm", "2": ".04mm", "3": ".04mm"}   # 題の字が ラノベPOP v2 のとき

_FONTFILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "fonts", "LightNovelPOPv2.otf")
if not os.path.exists(_FONTFILE):
    _FONTFILE = "/home/user/taxi/pdf/fonts/LightNovelPOPv2.otf"
LANOBE = '@font-face{font-family:"LanobePOP";src:url("file://' + os.path.abspath(_FONTFILE) + '") format("opentype");font-display:block}\n'

def css(no="3"):
    cover = COVER.replace("translate(.24mm,", "translate(" + _NX.get(no, ".24mm") + ",")
    if MODE == "libe":
        # 10/19 まーく様：リベ大の題の字は「ラノベPOP v2」（フロップデザイン。M+フォントのライセンスで、自由に使える・PDFに入れてよい）
        #   字のファイルはリポジトリの pdf/fonts/ に置いた（まーく様にいただいたもの）
        h = '"LanobePOP","Noto Sans JP",sans-serif'
        if os.environ.get("HEADFONT", "mochiy") == "mochiy":   # 10/19 まーく様「やはり、Mochiy Popで良いです」→ 題はこちらが標準（ラノベPOPは HEADFONT=lanobe で比べる用）   # 比べる用（10/19：前に見せた Mochiy Pop P One の版）
            h = '"Mochiy Pop P One","Noto Sans JP",sans-serif'
        body = ('html,body,.page,.page *:not(.emj){font-family:"Zen Maru Gothic","Noto Sans JP",sans-serif!important}\n.page .cover .cv-no .cvn{font-family:inherit!important}\n' if BODY == "maru" else "")
        # 題の字に合わせて、表紙の数字の位置を合わせ直す（numcheck.py で測った）
        cover = cover.replace("translate(" + _NX.get(no, ".24mm") + ",-1.2mm)", "translate(" + _NXL.get(no, ".04mm") + "," + ("-.3mm" if os.environ.get("HEADFONT", "mochiy") == "lanobe" else "-1.45mm") + ")")
        return CHIP + cover + body + LANOBE + f"""
/* 題は、リベ大の題の字（ラノベPOP v2）。この字は太さが1つなので、太さの指定は外す */
.half.rel,.lp,.lx,.mtk,.nk,.sn{{font-family:"Noto Sans JP",sans-serif!important}}   /* 札は、どこに置いても同じ見た目（題の字を受けつがない） */
.page h2:not(.emj),.page h2 *:not(.emj):not(.half),.page h3.sh3 :not(.sn):not(.emj),.page h3.mth,.page h3.mth *:not(.emj),.page .tt:not(.emj),.page .tt *:not(.emj):not(.half),.page .toch,
#p1 .cv-sd,#p1 .cv-sd *,.cover .cv-no,.cover .cv-e,.cover .cv-e *{{font-family:{h}!important;font-weight:400!important;letter-spacing:0!important}}
"""
    if MODE == "old":
        return CHIP + cover
    f, h = _FAM[MODE], _HEAD[MODE]
    return CHIP + cover + f"""
/* 字の形を1家族にそろえる（fontset.py） */
html,body,.page,.page *:not(.emj){{font-family:{f},"Noto Sans JP",sans-serif!important}}
/* 表紙：題・副題・数字・〇〇編も、中と同じ家族。差は太さと大きさだけでつける */
/* 題（大きい字）：ページの題・もくじ。手順の題（2〜4行の文）は本文と同じ字にする（丸ゴシックだと「、」「：」が空いて間のびする） */
.page h2:not(.emj),.page h2 *:not(.emj):not(.half),.page .toch:not(.emj),.page .tt:not(.emj),.page .tt *:not(.emj):not(.half){{font-family:{h},"Noto Sans JP",sans-serif!important;letter-spacing:-.02em!important}}
.page h2:not(.emj),.page h2 *:not(.emj):not(.half){{font-weight:900!important}}   /* 札（NEW!!・ふり返り）は、どこでも同じ見た目にするので外す */
#p1 .cv-t,#p1 .cv-t *:not(.emj){{font-family:{h},sans-serif!important;font-weight:900!important;letter-spacing:.01em!important}}
#p1 .cv-sd,#p1 .cv-sd *{{font-family:{h},sans-serif!important;font-weight:700!important;letter-spacing:.04em!important}}
.cover .cv-no,.cover .cv-e,.cover .cv-e *{{font-family:{h},sans-serif!important;font-weight:900!important}}
"""
