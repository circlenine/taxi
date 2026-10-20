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
MODE = os.environ.get("FONTSET", "kaisei" if os.environ.get("NEWDESIGN", "0") != "1" else "libe")   # 10/20 まーく様：ふだんは「最初に決めた字（解星デコール）」で、題も本文もそろえる   # NEWDESIGN=0 なら、字の形も前のまま   # 10/19 まーく様：案1・案2とも不可。表紙の題の筆記体は「きれいで、ダイビングに合っている」→ 前の字に戻した
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
    if MODE == "kaisei" and BODYMIN != "decol":
        return old.replace('&display=swap', '&' + _BMLINK[BODYMIN] + '&display=swap', 1)
    if MODE in ("old", "kaisei"):
        return old   # 前の読みこみ（解星デコール 500・700 と Pacifico）をそのまま使う
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

# FONTSET=kaisei … 10/20 まーく様「各資料で、最初に決めたフォントに直っていない」「本文はタイトルに合わせた、ゴシック以外のフォントに」
#   最初に決めた字＝表紙の副題・〇〇編の「解星デコール」（はね・はらいに飾りのある明朝体。10/15 案F2）。
#   中の題も本文も、この字にそろえる（表紙の明朝と中のゴシックが違和感、の元を断つ）。表紙の英語の題は筆記体（Pacifico）のまま。
#   題は太字（700）、本文は中太（500）で差をつける。札の字も同じ字。
KAISEI = """
/* 札の字を、解星デコールの字の形に合わせて、上下左右のまん中に（2枚撮りの確認で測って合わせた。10/20） */
.mtk,.lx,.lp{padding-top:.45mm!important;padding-bottom:.55mm!important}
.notes .nk{padding-top:.38mm!important;padding-bottom:.62mm!important}
.notes .kpk .nk{padding-top:.3mm!important;padding-bottom:.7mm!important}
.half.rel{padding-top:.4mm!important;padding-bottom:.6mm!important;padding-left:1.78mm!important;padding-right:1.42mm!important}
.half.rel.new{padding-left:1.92mm!important;padding-right:1.28mm!important}
html,body,.page,.page *:not(.emj){font-family:"Kaisei Decol","Noto Sans JP",serif!important}
#p1 .cv-t,#p1 .cv-t *:not(.emj){font-family:"Pacifico",cursive!important}
.page h2,.page h2 *,.page h3,.page h3 *,.page b,.page strong,.toch,.tt,.tt *{font-weight:700!important}
.notes,.notes .ns,.notes .ns *:not(b):not(.nh),.sasuke,.sasuke p,.pts,.ref,.mts,.mts li,.cap3,.src,.qz .q,.qz .a{font-weight:500}
"""

# 10/20 まーく様「本文が細くて見づらい。題の字とバランスを考えた字に」→ 本文だけ別の字（BODYMIN で比べる）
#   題（解星デコール）と同じ「明朝の仲間」で、線が太いものから選ぶ
BODYMIN = os.environ.get("BODYMIN", "mplus")   # 10/20 まーく様「一旦、M PLUS Rounded 1c 800 で進めて」
_BM = {"decol": ('"Kaisei Decol"', 500), "opti": ('"Kaisei Opti"', 700), "shippori": ('"Shippori Mincho B1"', 700),
       "biz": ('"BIZ UDPMincho"', 700), "zenold": ('"Zen Old Mincho"', 700),
       "zen900": ('"Zen Old Mincho"', 900), "ship800": ('"Shippori Mincho B1"', 800),
       # 10/20 まーく様「もう少し丸みのある字で、つぶれず・薄くなく・遠目からもはっきり」→ 丸みのある候補
       "kiwi": ('"Kiwi Maru"', 500), "zas": ('"Zen Antique Soft"', 400), "haru": ('"Kaisei HarunoUmi"', 700),
       "zmaru": ('"Zen Maru Gothic"', 900), "mplus": ('"M PLUS Rounded 1c"', 800)}
_BMLINK = {"opti": "family=Kaisei+Opti:wght@500;700", "shippori": "family=Shippori+Mincho+B1:wght@600;700;800",
           "biz": "family=BIZ+UDPMincho:wght@400;700", "zenold": "family=Zen+Old+Mincho:wght@600;700;900", "decol": "",
           "zen900": "family=Zen+Old+Mincho:wght@600;700;900", "ship800": "family=Shippori+Mincho+B1:wght@600;700;800",
           "kiwi": "family=Kiwi+Maru:wght@500", "zas": "family=Zen+Antique+Soft", "haru": "family=Kaisei+HarunoUmi:wght@700",
           "zmaru": "family=Zen+Maru+Gothic:wght@700;900", "mplus": "family=M+PLUS+Rounded+1c:wght@800"}

def body_css():
    if BODYMIN == "decol":
        return ""
    f, w = _BM[BODYMIN]
    return f"""
/* 本文の字（題は解星デコールのまま）。頭に .page を付けるのは、全体に解星デコールを当てている決まり（.page *）より強くするため */
.page .notes,.page .notes *:not(.nk):not(.nn2),.page .sasuke,.page .sasuke *,.page .pts,.page .pts *,.page .ref,.page .ref *,.page .mts,.page .mts *:not(.mtk),.page .cap3,.page .cap3 *,.page .src,.page .src *,.page .qz .q,.page .qz .q *,.page .qz .a,.page .qz .a *,.page .mtl,.page .nmr,.page .nmr *:not(.nn),.page .bg,.page .bg *,.page .toc .tt,.page .toc .tt *:not(.half),.page .relnote,.page .relnote *:not(.half),.page .ns,.page .nx,.page .sd2,.page .howto,.page .howto *{{font-family:{f},"Kaisei Decol",serif!important}}
/* 10/20 本文の字は、どこでも同じ太さ（細い500が、出どころ・動画の説明・「・」に残っていた） */
.page .notes,.page .notes *:not(.nk):not(.nn2),.page .sasuke,.page .sasuke *,.page .pts,.page .pts *,.page .ref,.page .ref *,.page .mts,.page .mts *:not(.mtk),.page .cap3,.page .cap3 *,.page .src,.page .src *,.page .qz .q,.page .qz .q *,.page .qz .a,.page .qz .a *,.page .mtl,.page .nmr,.page .nmr *:not(.nn),.page .bg,.page .bg *,.page .toc .tt,.page .toc .tt *:not(.half),.page .relnote,.page .relnote *:not(.half),.page .ns,.page .nx,.page .sd2,.page .howto,.page .howto *{{font-weight:{w}!important}}
.page .notes .ns,.page .notes .ns *:not(b):not(.nh):not(.nk),.page .notes .nx,.page .sasuke p,.page .mts li,.page .cap3,.page .qz .a,.page .nmr,.page .bg p{{font-weight:{w}!important}}
/* 10/20 色つきの言葉（■タンク など）も本文と同じ字に。文の途中で字が変わると、つぎはぎに見えるため */
.page .qz .q.q,.page .qz .q.q *{{font-weight:{w}!important}}   /* クイズの問いも本文と同じ太さ（字によって900のものがある） */
.page .notes .t,.page .sasuke .t,.page .bg .t,.page .mts .t,.page .nmr .ds .t,.page .qz .t{{font-family:{f},"Kaisei Decol",serif!important;font-weight:{w}!important}}
"""

# 10/20 まーく様「、。の隙間を詰められるフォントに」「各見出しも、もうちょっと見やすく」
#   題の字（解星デコール）は、配られている字のファイルに「、。を詰める仕組み」が入っていない（確かめた）。
#   字を変えずに詰めるため、題の字で書かれた「、。（）「」・：」だけ、字の空いている側を狭める。
#   見出しは「①バルサルバ法：鼻を…」のように「：」があれば、名前（1行目・大きく）と説明（2行目から・少し小さく）に分ける。
#   見出しの折り返しは、言葉の切れ目で折る（「鼻を／つまんで」のような切れ方をさせない）。
def punct_js():
    if MODE != "kaisei":
        return ""
    return """<script>(function(){
document.querySelectorAll('h3.sh3>span:last-child').forEach(function(s){
 /* 「：」は、色つきの言葉などがまざった見出しでも探す（子の字のかたまりの中から、最初の「：」を見つけて、そこで2つに分ける） */
 var k=[].slice.call(s.childNodes),at=-1;for(var j=0;j<k.length;j++)if(k[j].nodeType===3&&k[j].textContent.indexOf('：')>0||k[j].nodeType===3&&j>0&&k[j].textContent.indexOf('：')>=0){at=j;break;}
 if(at<0)return;var t=k[at].textContent,i=t.indexOf('：');
 var m=document.createElement('b');m.className='hm';var n=document.createElement('span');n.className='hs';
 k.slice(0,at).forEach(function(x){m.appendChild(x);});m.appendChild(document.createTextNode(t.slice(0,i)));
 n.appendChild(document.createTextNode(t.slice(i+1)));k.slice(at+1).forEach(function(x){n.appendChild(x);});
 s.textContent='';s.appendChild(m);s.appendChild(n);});
var R=/[、。，．）」』〕】]/,L=/[（「『〔【]/,C=/[・：]/;
document.querySelectorAll('.page').forEach(function(pg){
 var w=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT),ns=[],n;while(n=w.nextNode())if(/[、。，．（）「」『』〔〕【】・：]/.test(n.textContent))ns.push(n);
 ns.forEach(function(t){var e=t.parentElement;if(e.closest('.cover,.cv-sd,.emj,.sn,.nk,.lp,.lx,.mtk,.half,.fs,.edtag'))return;
  var ff=getComputedStyle(e).fontFamily.replace(/"/g,'');if(ff.indexOf('BIZ UDPMincho')===0||!/^(Kaisei|Kiwi|Zen|M PLUS|Shippori)/.test(ff))return;   /* BIZ UD明朝は最初から詰まっているので触らない */
  var f=document.createDocumentFragment();t.textContent.split(/([、。，．（）「」『』〔〕【】・：])/).forEach(function(x){if(!x)return;
   if(R.test(x)||L.test(x)||C.test(x)){var k=document.createElement('span');k.className=R.test(x)?'pqr':L.test(x)?'pql':'pqc';k.textContent=x;f.appendChild(k);}else f.appendChild(document.createTextNode(x));});
  t.parentNode.replaceChild(f,t);});});
})();</script>"""

PUNCT_CSS = """
/* 10/20 まーく様「見出しの字・番号の数字を、しっかり太く（つぶれて見えない形に）」
   ・題の字（解星デコール）は700がいちばん太い。900を頼むと、機械が線を太らせた「にせの太字」になり、字がつぶれる → 700にそろえる
   ・番号の数字は、数字の形がはっきりした BIZ UD明朝の太字にする（線が太く、6・8・9 の中がつぶれない） */
.page .edtag,.page .edtag *,.page .tp,.page .tp *,.page .half,.page .lx,.page .lp,.page .nk,.page .tapm,.page .mh,.page .qh,.page .mtk,.page .toc *,.page .sn,.page .nn,.page .nn2{font-weight:700!important}
.page .sn,.page .sn *,.page .nn,.page .nn2,.page .tp,.page .tp *,.page .no{font-family:"BIZ UDPMincho","Kaisei Decol",serif!important;font-weight:700!important}
/* 「、。」などの空いている側を狭める（punct_js が印を付ける） */
/* 見出しの「字のあいだを詰める」決まりに負けないよう、強く書く（.pqr を重ねて強さを上げている） */
.page .pqr.pqr.pqr{letter-spacing:-.42em!important}
.page .pql.pql.pql{margin-left:-.42em!important}
.page .pqc.pqc.pqc{margin-left:-.2em!important;letter-spacing:-.2em!important}
/* 見出し：名前と説明を分ける。言葉の切れ目で折り返す */
.page h3.sh3>span:last-child,.page h2{word-break:auto-phrase}
/* 題の字は、かなの左右が広めに空く字。見出しだけ、字と字のあいだを少しだけ詰める */
.page h3.sh3>span:last-child,.page h3.sh3>span:last-child *,.page h2>span:not(.half):not(.emj){letter-spacing:-.04em!important}
.page h3.sh3 .hm{display:block;font-size:1.06em}
/* 10/20 まーく様「各見出しの下も、左右いっぱい（上の線と同じ幅）に下線を引いて、区切りが分かるように」 */
.page .step>h3.sh3{border-bottom:1px solid var(--line);padding-bottom:1.2mm!important}
/* 見出しのすぐ下の欄に上の線があると、線が二重になる。下線があるので、すぐ下の欄の上の線は消す */
.page .step>h3.sh3+*,.page .step>h3.sh3+.notes>.nt:first-child,.page .step>h3.sh3+*>:first-child{border-top:0!important}
/* 10/20 まーく様「英数字・記号も細くないか」→ 測って細かったものを太くする（latincheck.js で毎回測る）
   ・クイズの問い（白い字）と、表紙の副題が細かった */
.page .qz .q,.page .qz .q *{font-weight:700!important}
#p1 .cv-sd,#p1 .cv-sd *{font-weight:700!important}
.page h2:not(.toch){border-bottom:1px solid var(--line);padding-bottom:1.2mm!important}
.page h3.sh3 .hs{display:block;font-size:.84em;margin-top:.6mm;color:#1f2a37!important;line-height:1.4!important}
"""

# 10/20 まーく様「タイトルのフォントは、あくまでタイトルにだけ。見出し・本文・ほかは、もっと見やすい字で徹底」
#   題の字（解星デコール）を使うのは、ページの題（h2）と表紙だけ。ほかの字は、ぜんぶ本文の字・同じ太さ。
#   html body を頭に付けて、ほかの決まり（札・番号・見出しの字）より強くしている
TITLE_ONLY = """
html body .page *:not(.emj):not(.cover):not(.cover *){font-family:{F},"Noto Sans JP",sans-serif!important;font-weight:{W}!important}
/* 10/20 まーく様「先頭の各見出しも、タイトルのフォントではなく別のフォントに」→ 題の字（解星デコール）は表紙の題だけ。ページの見出しも本文の字にする */
/* 札の字を、この字の形に合わせて上下のまん中に（chipalign で測って合わせた。解星デコールより字が上に寄る形なので、上をあける） */
html body .page .mtk,html body .page .lx,html body .page .lp{padding-top:.75mm!important;padding-bottom:.25mm!important}
html body .page .notes .nk{padding-top:.62mm!important;padding-bottom:.38mm!important}
html body .page .notes .kpk .nk{padding-top:.66mm!important;padding-bottom:.34mm!important}
html body .page .half.rel{padding-top:.5mm!important;padding-bottom:.5mm!important}
html body .page .half.rel.new{padding-top:.72mm!important;padding-bottom:.28mm!important}
"""

def css(no="3"):
    if MODE == "kaisei":
        f, w = _BM.get(BODYMIN, ('"Kaisei Decol"', 700))
        out = CHIP + KAISEI + body_css() + PUNCT_CSS.replace('"BIZ UDPMincho"', f)
        if BODYMIN != "decol":
            out += TITLE_ONLY.replace("{F}", f).replace("{W}", str(w))
        return out
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
