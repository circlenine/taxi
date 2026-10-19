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
MODE = os.environ.get("FONTSET", "old")   # 10/19 まーく様：案1・案2とも不可。表紙の題の筆記体は「きれいで、ダイビングに合っている」→ 前の字に戻した
_FAM = {"maru": '"Zen Maru Gothic"', "kaku": '"Noto Sans JP"', "mix": '"Noto Sans JP"'}
_HEAD = {"maru": '"Zen Maru Gothic"', "kaku": '"Noto Sans JP"', "mix": '"Zen Maru Gothic"'}

def links(old):
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
.mtk,.nk,.lx,.lp,.half.rel{line-height:1!important;padding-top:.55mm!important;padding-bottom:.45mm!important;vertical-align:.08em}
"""

def css():
    if MODE == "old":
        return CHIP
    f, h = _FAM[MODE], _HEAD[MODE]
    return CHIP + f"""
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
