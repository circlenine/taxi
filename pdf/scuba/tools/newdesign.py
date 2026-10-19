# 10/19 の「新しい形」を、3冊で共通に使う部品
#   ・題を色の帯に入れる（リベ大の「5つの力を身につけよう！」の形）
#   ・写真と説明を、細い線の1つの箱でつなぐ
#   ・動作の写真（前▶後）のあいだに矢印
# まーく様のご指示「前のデータはすぐに戻せるように」：NEWDESIGN=0 で、前の形（題は線の見出し、写真と説明は別々）に戻る
import os
ON = os.environ.get("NEWDESIGN", "1") != "0"

# 冊ごとの色：帯の色／箱の線／説明の地／点線／印の四角
COL = {
    "1": ("#16466b", "#cfe5f2", "#f4fafe", "#d7eef9", "#a9d8ef"),   # 準備編（青）
    "2": ("#6b3410", "#fcd8bd", "#fff7f1", "#ffe2cc", "#f6c095"),   # 洗浄編（オレンジ）
    "3": ("#4b2a73", "#dcc9f1", "#faf6fe", "#e2d4f2", "#cdb5ea"),   # スキル編（紫）
}
NAME = {"1": "準備編", "2": "洗浄編", "3": "スキル編"}

def header(no, head_no, head_title_html, lg, old_html):
    """ページの題。新しい形なら色の帯、そうでなければ前の形（old_html）"""
    if not ON or not head_no:
        return old_html
    num = head_no[2:] if head_no.startswith("その") else (head_no[2:] if head_no.startswith("工程") else head_no)
    return (f'<div class="ph band"><span class="bno{" bw" if len(num) > 1 else ""}">{num}</span>'
            f'<div class="btx"><small>{NAME[no]}　{head_no}{lg}</small><h2>{head_title_html}</h2></div></div>')

def css(no):
    if not ON:
        return ""
    m, line, bg, dash, dot = COL[no]
    return f"""
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
