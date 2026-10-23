# A4のPDF（10/7 ご指示「A4にして」。スマホ版の作りを、A4の1ページに収める）
# もとはスマホで読むためのPDF（10/7 ご指示「スマホで見る。各項目は1ページ、多くても2ページ」）
# ・紙の幅を、スマホの画面に近い 110mm にする（A4のまま縮めると、字が小さくて読めないため）
# ・1つの項目（道具・工程1〜6・まとめ）＝1ページ。ページの高さは中身に合わせて伸ばす（縦に読み進める）
# ・どのページも、まったく同じ型：見出し → 手順（番号と題 → 写真 → 補足）の順に、1列で並べる
# 使い方: python3 mobile.py <buildディレクトリ>
import sys, os, re
import newdesign as _nd
import phrasebreak as _pb   # 10/23 改行を区切り（、。）にそろえる   # 10/19 新しい形の部品
sys.path.insert(0, os.path.dirname(__file__))
from content import STEPS, TERMS, POINTS, POINT_TAGS, QUIZ, MATOME
from focus import F as _F, aspect_range as _ar
from fish import head_fish, scene, page_fish

B = sys.argv[1]


# 10/21 まーく様「写真の場面の時刻から再生」：写真ごとの「動画の何秒か」
#   まーく様のドライブの画面収録（ScreenRecording_10-07-2026：この動画を最初から最後まで流したもの）と、写真の元の画面を1コマずつ見比べて出した（1秒前から始める）
#   strap・twist は、ホース類のねじれを見る場面（144秒あたり）
SET_T = {'bc': 28, 'belt': 236, 'c04': 36, 'c05': 51, 'c06': 58, 'c09': 80, 'c10': 103, 'c11': 112, 'c13': 129, 'c14': 126, 'c15': 138, 'c19': 165, 'c21': 172, 'c22': 175, 'c24': 182, 'c26': 195, 'c27': 199, 'c29': 220, 'c30': 227, 'c33': 256, 'c35': 271, 'c37': 295, 'c38': 301, 'c39': 307, 'c40': 315, 'c41': 321, 'c44': 138, 'cap': 34, 'nghi': 63, 'nglo': 63, 'strap': 143, 'tank': 28, 'twist': 143}
def _vid_set(k): return "twjEJS_0kms" + (f"?t={SET_T[k]}" if k in SET_T else "")

def T(s):
    s = re.sub(r"\{(\w+)\}", lambda m: f'<span class="t t-{m.group(1)}">{TERMS[m.group(1)]}</span>', s)
    return s.replace("“", '<span class="ql">“</span>').replace("”", '<span class="qr">”</span>')

# ── 見た目のきまり ──
# 色：紺 #16466b（字・札）／水色 #d7eef9（札の地）・#a9d8ef（線）・#cfe5f2（ふち）／ごく薄い水色 #f1f8fc（補足の帯）
#     補足＝黄の札、大事＝ピンクの札、写真への書きこみ＝赤 #c8372d。道具の札は道具ごとの色
# 字：本文 11pt・太さ700／見出し 900。小さくても 9pt まで（スマホで読める大きさ）
# 線：全部 1px。角：箱・写真 2mm／札 1mm
# 左右：本文は紙のはしから 8mm（水色のふち 3.5mm＋白いカードの余白 4.5mm）
CSS = """
:root{--ink:#1f2a37;--muted:#6b7785;--navy:#16466b;--sea1:#d7eef9;--sea2:#a9d8ef;--line:#cfe5f2;--pale:#f1f8fc;
 --regu:#ad1457;--octo:#f2c200;--octo-ink:#3a2e00;--belt:#e8a1b3;--silver:#5f6b73;--kachi:#8b5a2b;--bcd:#1565c0;--tank:#2e7d32}
@page{margin:0}
*{box-sizing:border-box;box-shadow:none}
html,body{margin:0;background:#fff;color:var(--ink);font-family:"Noto Sans JP",sans-serif;font-weight:700;font-size:11pt;line-height:1.7;
 -webkit-print-color-adjust:exact;print-color-adjust:exact;word-break:auto-phrase;text-wrap-style:auto}
/* 10/23 まーく様「中途半端な改行」→ 行の長さをそろえる折り返し（pretty）をやめ、文節単位で右はしまで詰める */
p{margin:0}
.page{width:110mm;position:relative;padding:8mm 8mm 12mm;break-after:page;
 background:#bfe3f4 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Cpath d='M-3 3 L3 -3 M0 12 L12 0 M9 15 L15 9' stroke='%23e3f3fb' stroke-width='4'/%3E%3C/svg%3E") repeat;
 display:flex;flex-direction:column;gap:5mm}
.page:last-child{break-after:auto}
.page::before{content:"";position:absolute;left:3.5mm;top:3.5mm;right:3.5mm;bottom:3.5mm;background:#fff;border-radius:2mm}
.page>*{position:relative}
.pno{position:absolute!important;left:8mm;right:8mm;bottom:5.5mm;border-top:1px solid var(--line);padding-top:1mm;
 display:flex;justify-content:space-between;font-size:7.5pt;line-height:1.4;color:var(--muted)}
/* 道具の札 */
.t{display:inline-block;border-radius:1mm;padding:0 .35em;margin:0 .08em;line-height:1.45;white-space:nowrap}
.t-regu{background:var(--regu);color:#fff}.t-octo{background:var(--octo);color:var(--octo-ink)}
.t-gauge{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.t-bc{background:var(--bcd);color:#fff}.t-tank{background:var(--tank);color:#fff}
.t-belt{background:var(--belt);color:#4a1424}.t-kachi{background:var(--kachi);color:#fff}.t-silver{background:var(--silver);color:#fff}
.ql,.qr{margin:0}
.nw{white-space:nowrap}
/* 見出し：「工程1 ───」＋大きな題 */
.ph{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:2.5mm;row-gap:1mm;color:var(--navy)}
.ph::after{content:"";grid-column:2;grid-row:1;height:1px;background:var(--sea2)}
.ph .no{grid-column:1;grid-row:1;font-size:9pt;letter-spacing:.12em;color:#1c6ea4}
.ph h2{grid-column:1/-1;margin:0;font-size:17pt;line-height:1.35;font-weight:900;font-feature-settings:"palt"}
.ph h2 .t{font-size:15pt}
.half{display:inline-block;font-size:9pt;vertical-align:.25em;background:var(--sea1);color:#1c6ea4;border-radius:1mm;padding:0 1.6mm;margin-left:1.6mm}
/* 手順 */
.step{display:flex;flex-direction:column;gap:2.4mm}
.step+.step{border-top:1px solid var(--line);padding-top:5mm}
.sh3{display:flex;align-items:flex-start;gap:2mm;margin:0;font-size:12.5pt;line-height:1.5;font-weight:900;color:var(--navy)}
.sn{flex:none;background:var(--navy);color:#fff;border-radius:1mm;font-size:10.5pt;line-height:1.5;padding:0 1.6mm;margin-top:calc((12.5pt - 10.5pt) * 1.5 / 2);letter-spacing:.03em}
.sh3 .t{font-size:10.5pt;line-height:1.5;vertical-align:.08em}
/* 写真：1枚＝横いっぱい。2枚＝横に2つ。3枚＝上に大きく1枚、下に2つ */
.photos{display:grid;gap:1.6mm;grid-template-columns:1fr 1fr}
.photos .ph3:only-child,.photos.n3 .ph3:first-child,.photos.ngp .ph3:first-child{grid-column:1/-1}
.ph3{position:relative}
.ph3 img{display:block;width:100%;border-radius:2mm;object-fit:cover}
.pl3{position:absolute;left:1.4mm;top:1.4mm;background:var(--navy);color:#fff;font-size:8.5pt;font-weight:900;line-height:1.4;border-radius:1mm;padding:0 1.6mm;outline:1px solid #fff;white-space:nowrap}
.pl3.red{background:#c8372d}
/* 補足：1行ずつ「札＋文」 */
.notes{display:flex;flex-direction:column;gap:1.6mm}
.nt{display:grid;grid-template-columns:9mm minmax(0,1fr);column-gap:2mm;align-items:start;background:var(--pale);border-radius:2mm;padding:1.6mm 2.4mm}
.nk{text-align:center;font-size:8pt;font-weight:900;line-height:1.6;border-radius:1mm;margin-top:.3em}
.kx .nk{background:#fffaeb;color:#9a6b00;box-shadow:inset 0 0 0 1px #ecd48a}
.kpk .nk{background:#fff5f8;color:#b0154a;box-shadow:inset 0 0 0 1px #efb3c4}
.nx b{font-weight:900}
.ns{grid-column:2;font-size:10pt;line-height:1.6;margin-top:1mm}
.ns small{display:block;font-size:9pt;color:var(--muted)}
.nh{font-weight:900;margin-right:1.4mm;color:var(--navy)}
.nn2{display:inline-block;width:1.5em;text-align:center;background:var(--navy);color:#fff;border-radius:1mm;font-size:8.5pt;line-height:1.5;margin-right:1mm}
.notes .t{font-size:10pt}
/* 表紙 */
.cover{display:flex;flex-direction:column;gap:2mm;color:var(--navy)}
.cv-k{display:flex;align-items:center;gap:2.5mm;font-size:9pt;letter-spacing:.12em;color:#1c6ea4}
.cv-k::after{content:"";flex:1;height:1px;background:var(--sea2)}
.cv-t{margin:0;font-size:23pt;line-height:1.3;font-weight:900}
.cv-s{font-size:11.5pt;font-weight:900;color:#1c6ea4}
.cv-f{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--sea2);padding-top:2mm;margin-top:1mm}
.cv-e{background:var(--navy);color:#fff;border-radius:1mm;padding:0 2.4mm;font-size:11pt;letter-spacing:.1em}
.cv-b{font-size:9.5pt;color:#1c6ea4}
/* もくじ */
.toch{margin:0;font-size:13pt;font-weight:900;color:var(--navy);border-bottom:1px solid var(--sea2);padding-bottom:1mm}
.tocn{font-size:9pt;color:var(--muted)}
.toc{display:flex;flex-direction:column;gap:1.6mm}
.tc{display:grid;grid-template-columns:13mm minmax(0,1fr) auto;align-items:center;gap:2.4mm;text-decoration:none;color:var(--ink);
 border:1px solid var(--line);border-radius:2mm;padding:1.6mm 2.4mm}
.tl{background:var(--navy);color:#fff;border-radius:1mm;text-align:center;font-size:9pt;line-height:1.6}
.tt{font-size:10pt;line-height:1.45;font-weight:900;font-feature-settings:"palt"}
.tt .t{font-size:9.5pt}.tt .half{vertical-align:0}
.tp{font-size:12pt;font-weight:900;color:#1c6ea4;white-space:nowrap}.tp small{font-size:8pt;margin-left:.5mm}
.tm{display:none}
/* 小見出し */
.ph2{margin:0;font-size:12.5pt;font-weight:900;color:var(--navy);border-bottom:1px solid var(--sea2);padding-bottom:1mm}
.ph2 small{display:block;font-size:9pt;color:var(--muted);font-weight:700}
.qh{align-self:flex-start;background:var(--sea1);color:#1c6ea4;border-radius:1mm;padding:0 2.4mm;font-size:10pt;font-weight:900}
/* 参考動画 */
.ref{display:grid;grid-template-columns:9mm minmax(0,1fr);gap:2.4mm;align-items:center;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:2mm;padding:2mm 2.4mm}
.play{width:9mm;height:9mm;border-radius:1mm;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12pt}
.ref b{display:block;font-size:11pt;color:var(--navy);font-weight:900}
.ref .ru{display:block;font-size:9.5pt;color:#1c6ea4;text-decoration:underline}
.ref .rn,.ref .cr{display:block;font-size:8pt;color:var(--muted);line-height:1.5}
/* 道具の写真と番号 */
.reg{position:relative}
.reg img{display:block;width:100%;border-radius:2mm}
.reg svg{position:absolute;inset:0;width:100%;height:100%}
.mk{position:absolute;translate:-50% -50%;width:5.4mm;height:5.4mm;display:flex;align-items:center;justify-content:center;background:var(--navy);color:#fff;font-size:9pt;font-weight:900;border-radius:1mm;outline:1px solid #fff}
.names{display:flex;flex-direction:column;gap:1.6mm}
.nmr{display:grid;grid-template-columns:5.4mm auto minmax(0,1fr);align-items:center;column-gap:2.4mm;border:1px solid var(--line);border-radius:2mm;padding:1.4mm 2.4mm}
.nmr .nn{display:flex;align-items:center;justify-content:center;height:5.4mm;background:var(--navy);color:#fff;font-size:9pt;font-weight:900;border-radius:1mm}
.nmr .ds{font-size:10.5pt;line-height:1.5}.nmr .ds small{display:block;font-size:8.5pt;color:var(--muted)}
.nmr .t{font-size:11pt}
/* 大きな道具3つ */
.big{display:flex;flex-direction:column;gap:1.6mm}
/* 大きな道具：左に写真、右に名前と説明（1つずつ横長の帯にする） */
.bg{display:grid;grid-template-columns:36mm minmax(0,1fr);grid-template-rows:auto 1fr;column-gap:3mm;row-gap:1mm;align-content:start;border:1px solid var(--line);border-radius:2mm;padding:2mm;font-size:10pt;line-height:1.55}
.bg>img{grid-row:1/4}
.bg>p{grid-column:2}
.bg img{display:block;width:100%;border-radius:2mm}
.bg>.t{grid-column:2;justify-self:start;font-size:11pt}
.bg .of{font-size:8.5pt;color:var(--muted);border-top:1px solid var(--line);padding-top:.8mm}
/* SASUKE */
.sasuke{display:flex;flex-direction:column;gap:2mm;background:var(--pale);border-radius:2mm;padding:3mm}
.sasuke .sh{align-self:flex-start;background:var(--navy);color:#fff;border-radius:1mm;padding:0 2.4mm;font-size:10.5pt;font-weight:900}
.sasuke .say{font-size:10pt;line-height:1.65}
.fs{display:inline-block;background:var(--navy);color:#fff;border-radius:1mm;padding:0 1.4mm;line-height:1.45}
.sasuke .sum{display:flex;flex-direction:column;gap:1.4mm;border-top:1px solid var(--line);padding-top:2mm;font-size:10pt;line-height:1.6}
.sasuke .row2{display:flex;flex-direction:column;gap:.6mm;background:#fff;border-radius:2mm;padding:1.6mm 2.4mm}
.sasuke .row2>p:first-child{display:flex;align-items:center;gap:1.6mm}
.sasuke .row2 .fs{font-size:9.5pt}
/* まとめ */
.pts{display:flex;flex-direction:column;gap:1.6mm;background:var(--pale);border-radius:2mm;padding:3mm;font-size:10.5pt}
.pts .pth{font-size:11.5pt;font-weight:900;color:var(--navy)}
.quiz{display:flex;flex-direction:column;gap:1.6mm}
.qz{display:grid;grid-template-columns:5.4mm minmax(0,1fr);grid-template-rows:auto auto;column-gap:2.4mm;row-gap:1mm;align-items:center;border:1px solid var(--line);border-radius:2mm;padding:1.6mm 2.4mm;font-size:10.5pt;line-height:1.5}
.qz::before{content:"";grid-row:1;width:5.4mm;height:5.4mm;box-sizing:border-box;border:1px solid var(--navy);border-radius:1mm}
.qz .q{grid-column:2}
.qz .a{grid-column:2;height:6.4mm;display:flex;align-items:center;padding-left:2mm;background:var(--sea1);border-radius:1mm;color:var(--navy);font-weight:900;font-size:10pt}
.qz .a .t{font-size:9.5pt}
.src{font-size:8pt;line-height:1.5;color:var(--muted)}
.src a{color:#1c6ea4}
.legend{display:flex;gap:1.4mm;flex-wrap:wrap;font-size:8pt}
.legend span{border-radius:1mm;padding:0 1.6mm}
.lx{background:#fffaeb;color:#9a6b00;box-shadow:inset 0 0 0 1px #ecd48a}.lp{background:#fff5f8;color:#b0154a;box-shadow:inset 0 0 0 1px #efb3c4}
"""

# 写真の切り抜きの縦横比（スマホの1列に合わせる）
ASP = {1: 4 / 3, 2: 1.0}
TAGS = {"4-2": "左に回りきったら、右に半回転戻す！"}
KEYS = {"2-1": ["cap", "c04"], "3-4": ["c44", "c13", "c14"], "5-2": ["c27"], "6-1": ["c33"], "6-2": ["c35"]}
CAP = {("3-5", "twist"): "手でたどって見る", ("3-5", "strap"): "ストラップ<small>※基本はお腹の横らへんにあるよ！</small>", ("2-1", "cap"): "キャップを外す",
       ("2-1", "c04"): "タンクくるくるを右手で持つ", ("3-4", "c13"): "ふだんのカチカチ", ("3-4", "c14"): "手前に引いた形",   # 10/22 まーく様「やる前・やった後はぶっきらぼう」→ 引く前・引いた後 も言いかえた
       ("3-4", "c44"): "L字サインホース<small>（正式名称：インフレーターホース）</small>", ("3-3", "c11"): "銀色金具ぐるぐる<small>（正式名称：ヨークスクリュー）</small>", ("3-2", "c10"): "銀色金具ぐるぐる<small>（正式名称：ヨークスクリュー）</small>", ("4-2", "c24"): "タンクくるくる<small>（正式名称：タンクバルブ）</small>", ("6-2", "c35"): "黒いスーツ着てて見づらいね", ("6-1", "c33"): "この人、ウエスト細いね", ("3-1", "c09"): "Oって感じだよね<small>（正式名称：Oリング）</small>", ("4-1", "c19"): "目は、つぶらなくて良いよ", ("5-2", "c27"): "L字サインホース<small>（正式名称：インフレーターホース）</small>"}

_slots = {}
def im(k, asp):
    n = sum(1 for v in _slots.values() if v == k)
    name = f"{k}_{n}"; _slots[name] = k
    lo, hi = _ar(k)
    return f'<img src="img/s/{name}.jpg" data-slot="{name}" data-k="{k}" style="aspect-ratio:{asp:.4f}" alt="">'

def notes(s):
    out = []
    # 同じ札（補足と補足・大事と大事）が続くときは、札は1つにまとめ、中の文を段落で分ける（10/8 ご指摘：補足が2回続く意味が分からない）
    def n(kind, text, subs=()):
        # 中の文は (文, 新しい段落か)。まとめた2つ目からの話は、1行ぶんの半分あけて、別の話だと分かるようにする
        if out and out[-1][0] == kind:
            out[-1][2].extend([(text, True), *[(x, False) for x in subs]])
        else:
            out.append((kind, text, [(x, False) for x in subs]))
    if s["id"] in TAGS: n("pk", TAGS[s["id"]])
    for t in s.get("pinkx") or []: n("pk", t)
    if s.get("pink"):
        p_ = s["pink"]; n("pk", f'<b>{p_["head"]}</b>', p_["lines"])
    if s.get("pinkbig"):
        p_ = s["pinkbig"]
        subs = ([f'<b>{p_["why"]}</b>'] if p_.get("why") else []) + \
               ['<div class="pbg pbs">' + "".join(f'<div class="pbc"><span class="pbt">{a}</span><p>{T(b)}' + (f'<small>{T(c)}</small>' if c else "") + '</p></div>' for a, b, c in p_.get("rows", [])) + '</div>']   # 10/23 まーく様「長文をもっと見やすく」→ 1つずつ札つきの枠に
        n("pk", f'<b>{p_["head"].replace("<wbr>", "")}</b>', subs)
    if s.get("steps"):
        p_ = s["steps"]
        # 留める順番は、表の形にする：番号／場所／やること の3列。やることが2行になっても、書き出しの位置はそろう
        n("pk", f'<b>{p_["head"]}</b>', ['<div class="srowc">' + "".join(f'<div class="src"><span class="nn2">{a}</span><span class="sp2">{b}</span><span class="sd2">{c}</span></div>' for a, b, c in p_["rows"]) + '</div>'])   # 10/23 1行ずつ枠に（区切りが見えるように）
    for t in s.get("extra") or []: n("x", t)
    html = "".join(f'<div class="nt k{kind}"><span class="nk">{"大事" if kind == "pk" else "補足"}</span><span class="nx">{T(text)}</span>'
                   + "".join(f'<div class="ns{" np" if np_ else ""}">{T(x)}</div>' for x, np_ in subs) + "</div>" for kind, text, subs in out)
    return '<div class="notes">' + html + "</div>" if out else ""

def xm(k, ng):
    # ダメな例の写真には、右上に赤い ✕ を付ける（10/7 ご指示）。器材のない右上のすみに置く
    # ✕ は字ではなく2本の線で描く。線の太さは 1-3 の赤い丸と同じ 1.2mm（10/8 ご指示）。白いふちで写真から浮かせる
    # 10/8：線の太さを、2-1 の赤い丸と同じ 2.2mm にした。✕ がつぶれないよう、大きさを 7mm にする（70 のうち 22）
    x = ('<svg class="ngv" viewBox="0 0 70 70"><path d="M15 15L55 55M55 15L15 55" stroke="#fff" stroke-width="32" stroke-linecap="round"/>'
         '<path d="M15 15L55 55M55 15L15 55" stroke="#f93612" stroke-width="22" stroke-linecap="round"/></svg>')
    return f'<span class="ngx">{im(k, 1.0)}{x}</span>' if ng else im(k, 1.0)

def photos(s):
    # 写真のかたまりは、どれも「写真の段（高さ --ph）＋名前の1行」の同じ形にする（10/7 ご指摘：となりの手順と写真の上下がずれていた）
    #   1枚：1枚で段いっぱい／2枚：横に2つ
    #   3枚：左に大きく1枚、右に2枚を縦に重ねて、段の高さに収める。右の2枚の名前は「上：〜／下：〜」とまとめて1行に書く
    keys = KEYS.get(s["id"], s["key"])
    cap = lambda k: CAP.get((s["id"], k))
    def fig(k, asp, lab=None, red=False):
        l = f'<span class="cap3{" red" if red else ""}">{lab}</span>' if lab else ""  # 名前がない写真は、下に空きを作らない
        return f'<figure class="ph3">{im(k, asp)}{l}</figure>'
    if s.get("ng"):
        a, b, la, lb, red = keys[0], ("nghi", "nglo"), "○ 正しい高さ", "上：✕ 高すぎ<br>下：✕ 低すぎ", True
    elif len(keys) == 3:
        a, b, la, lb, red = keys[0], keys[1:], cap(keys[0]), f"上：{cap(keys[1])}<br>下：{cap(keys[2])}" + STK_OF.get(s["id"], ""), False
    else:
        if len(keys) == 1: return f'<div class="photos">{fig(keys[0], 4/3, cap(keys[0]), (s["id"], keys[0]) in REDCAP)}</div>'
        cls = " strap2" if "strap" in keys else ""
        return f'<div class="photos{cls}">' + "".join(fig(k, 1.0, cap(k)) for k in keys) + "</div>"
    big = f'<figure class="ph3">{im(a, 1.0)}<span class="cap3">{la}</span></figure>'
    stk = f'<figure class="ph3 stack"><span class="st2">{xm(b[0], red)}{xm(b[1], red)}</span><span class="cap3{" red" if red else ""}">{lb}</span></figure>'
    # 2-4は、やる順番（引く前 → 引いた後 → L字サインホースに付ける）のとおり、左に2枚・右に大きく1枚（10/7 ご指示）
    if s["id"] == "3-4":
        return f'<div class="photos p3 rev">{stk}{big}</div>'
    return f'<div class="photos p3">{big}{stk}</div>'

# 2-4 の左の名前に「カチカチホース（正式名称：中圧ホース）」を足すと、細い欄で3〜4行になり、はみ出してごちゃつくので足さない（10/8 試した結果）
STK_OF = {}

# 名前を赤い字にする写真（赤い丸で囲んだ物の名前）
REDCAP = set()   # 10/23 まーく様「画像下の銀色金具ぐるぐる、別に赤くする必要ないです」→ 写真の下の名前は、ほかと同じ灰色にそろえる

# 写真の中身が横に長い手順は、横いっぱいの1段にする（ストラップとオクトが切れないように。10/7 ご指摘）
WIDE = set()
def stepbox(s):
    return (f'<section class="step{" wide" if s["id"] in WIDE else ""}"><h3 class="sh3"><span class="sn">{s["id"]}</span><span>{T(s["title"])}</span></h3>'
            f'{photos(s)}{notes(s)}</section>')

# 更新日（10/14 ご指示：版の番号ではなく「2026/10/14（水）更新」の形で全ページに入れる）
# 組み立てた日（日本時間）を自動で入れる。直して配り直すたびに、自然に新しい日付になる
import datetime as _dt
_d = _dt.datetime.now(_dt.timezone(_dt.timedelta(hours=9)))
VER = f"更新日時：{_d:%Y/%m/%d}({'月火水木金土日'[_d.weekday()]})"   # 10/14 ご指示：「更新日時：」を前に。曜日のかっこだけは半角（ほかの本文は全角のまま）
EDTAG = f'<span class="edtag"><b>1</b>器材準備編<span class="ver">{VER}</span></span>'   # 全ページの左上の、編の番号と名前
pages, TOC = [], []
def page(head_no, head_title, inner, toc=True):
    n = len(pages) + 1
    if toc: TOC.append((head_no, head_title, n))
    # 道具・工程のページは、見出しの右上に、札（補足・大事）の説明を置く（10/8 ご指示：2ページの本文の中ではなく、全ページの右上に）
    lg = '<span class="legend hl"><span class="lx">補足</span>動画にない話<span class="lp">大事</span>必ず守ること</span>' if (head_no == "器材" or head_no.startswith("工程")) else ('<span class="legend hl"><span class="lp">大事</span>必ず守ること</span>' if head_no == "まとめ" else "")   # 10/21 まーく様：大事の説明は「必ず守ること」（「とくに大事」は同じことの言い直し）。まとめにも右上に
    h = f'<div class="ph"><span class="no">{head_no}</span>{lg}{page_fish(n)}<h2>{T(head_title)}</h2></div>' if head_no else ""
    h = _nd.header("1", head_no, T(head_title), lg, h)   # 10/19 新しい形（NEWDESIGN=0 で前の形）
    # 手順の数が奇数のページは、最後の段の右があくので、魚の群れを泳がせる（見飽きないように。10/7 ご指示）
    # 魚のイラストは、見出しの右上だけに置く（10/7 ご指示：右下の群れはやめた）
    pages.append(f'<div class="page" id="p{n}">{EDTAG}{h}{inner}<div class="pno"><span>※ 講習で教わった内容・インストラクターさんの指示を最優先に</span><span>{n} / __TOTAL__</span></div></div>')

# 1ページ目は表紙＋もくじ（あとで差しこむ）
pages.append(None)

# 道具
# 10/20 まーく様「レギュレーターの器材が上に寄っていて、中央にきていない。番号を上にすれば調整できる」
#   器材の範囲（動画の画面での位置。写真に目盛りを重ねて測った）：左340・上98・右919・下442 → まん中は (629.5, 270)
#   写真は、この器材がまん中に来るように切る。下の番号（4・5）を上へ寄せて、写真の下のあきを無くした
EQ = (340, 98, 919, 442)
RX0, RY0, RX1, RY1 = 236, 62, 1023, 478   # 写真 reg2.jpg の範囲（動画の画面での位置）。器材のまん中と写真のまん中が同じ
MK = [(668, 140), (372, 165), (885, 262), (852, 334), (800, 412)]
# 名札は、器材に重ならない位置（器材の上ではなく、まわりの地面の上）に置き、白い線で器材とつなぐ
# 10/21 まーく様「3・4・5の番号が写真のはしにあって、バランスが不愉快。もっと内側に」→ 器材のすぐ横の地面に寄せた（写真のはしから離す）
LB = [(807, 126, "silver", "銀色金具"), (286, 136, "regu", "レギュ"), (944, 146, "octo", "オクト"), (928, 336, "kachi", "カチカチホース"), (928, 420, "gauge", "残圧計")]
# 関所：器材が写真のまん中にあるか（上下・左右とも、写真の幅・高さの2%以内）。番号の札が写真からはみ出さないか（札の半分＝約26の余白）
_cx, _cy = (EQ[0] + EQ[2]) / 2, (EQ[1] + EQ[3]) / 2
if abs(_cx - (RX0 + RX1) / 2) > (RX1 - RX0) * .02 or abs(_cy - (RY0 + RY1) / 2) > (RY1 - RY0) * .02:
    raise SystemExit(f"NG 1-1の写真：器材が写真のまん中にない（器材のまん中 {_cx:.0f},{_cy:.0f}／写真のまん中 {(RX0+RX1)/2:.0f},{(RY0+RY1)/2:.0f}）")
# 10/21 まーく様「2の高さ位置は、1と3の間と伝えた」→ 2の番号の高さは、1と3のまん中（どちらかを動かしたら、ここで止まる）
if abs(LB[1][1] - (LB[0][1] + LB[2][1]) / 2) > 4:
    raise SystemExit(f"NG 1-1の写真：2の番号の高さ（{LB[1][1]}）が、1と3のまん中（{(LB[0][1] + LB[2][1]) / 2:.0f}）にない")
for _x, _y, _k, _n in LB:
    if not (RX0 + 26 <= _x <= RX1 - 26 and RY0 + 26 <= _y <= RY1 - 26):
        raise SystemExit(f"NG 1-1の写真：番号の札（{_n}）が写真のはしからはみ出す位置にある（{_x},{_y}）")
# 写真は、元の大きい写真（reg.jpg：動画の画面の 195,62〜1085,515）から、作るたびに切り出す（手で切った写真を残さない）
from PIL import Image as _Im
_src = _Im.open(os.path.join(B, "img", "reg.jpg")); _k = _src.size[0] / 890
_src.crop((round((RX0 - 195) * _k), round((RY0 - 62) * _k), round((RX1 - 195) * _k), round((RY1 - 62) * _k))).save(os.path.join(B, "img", "reg2.jpg"), quality=90)
W_, H_ = RX1 - RX0, RY1 - RY0
lines = "".join(f'<line x1="{x-RX0}" y1="{y-RY0}" x2="{cx-RX0}" y2="{cy-RY0}" stroke="#fff" stroke-width="3"/><rect x="{x-RX0-9}" y="{y-RY0-9}" width="18" height="18" rx="3" fill="none" stroke="#fff" stroke-width="3"/>' for (x, y), (cx, cy, _, _) in zip(MK, LB))
marks = f'<svg viewBox="0 0 {W_} {H_}" preserveAspectRatio="none">{lines}</svg>' + "".join(
    # 写真の上には番号だけを置く（名前の札は器材にかぶるため。名前は右の表で照らし合わせる）
    f'<span class="lb" style="left:{(cx-RX0)/W_*100:.2f}%;top:{(cy-RY0)/H_*100:.2f}%"><span class="nn">{i+1}</span></span>' for i, (cx, cy, k, name) in enumerate(LB))
names = [("{silver}", "{tank}＆{bc}と合体！", "ファーストステージ"), ("{regu}", "自分が吸う", "セカンドステージ"),
         ("{octo}", "緊急用<span class=\"dsn\">（黄色って緊急っぽいよね）</span>", "オクトパス"), ("{kachi}", "{bc}と合体！", "中圧ホース"),
         ("{gauge}", "空気の残りを確認するゲージ", "")]
# 道具の名前の下に、正式名称を小さく添える（10/8 ご指示）。残圧計は、名前そのものが正式名称なので添えない（10/8 ご指摘）
names_html = "".join(f'<div class="nmr"><span class="nn">{i+1}</span><span class="nm">{T(a)}<span class="ds">{T(b)}</span>{f'<small>（正式名称：{c}）</small>' if c else ''}</span></div>' for i, (a, b, c) in enumerate(names))
page("器材", "まずは“ダイビング器材”", f"""
<div class="toprow"><div class="tcol"><a class="ref" href="https://youtu.be/twjEJS_0kms?si=AB5PNzWt31c5r9AB"><span class="play">▶</span><span><b>参考動画「ダイビング機材セッティング」</b><span class="ru"><span class="tapm scr">*</span>youtu.be/twjEJS_0kms</span><span class="rn scr">※タップすると、YouTubeへ移動するよ</span><span class="cr">OPEN EV（沖縄県教育委員会 教育支援ビデオ）<br>／制作 沖縄県立沖縄水産高等学校</span></span></a></div><div class="memo-slot" data-up=".ph h2"></div></div>
<div class="grid2 tools"><section class="step wide"><h3 class="sh3"><span class="sn">1-1</span><span>ホースの塊＝レギュレーター</span></h3><div class="regrow">
<div class="reg"><img src="img/reg2.jpg" alt="" style="aspect-ratio:{RX1 - RX0}/{RY1 - RY0}">{marks}</div>
<div class="names">{names_html}</div></div></section>
<section class="step"><h3 class="sh3"><span class="sn">1-2</span><span>SASUKEで覚えよう！</span></h3><div class="sasuke sk2"><div class="skc"><p class="skh">ホースでつなぐのは、この2点！</p><p>・空気を出すために、{T("{tank}")}と合体！<br>・その空気を使うために、{T("{bc}")}と合体！</p></div>
 <div class="skc"><p class="skh"><span class="fs">ファーストステージ</span>＝{T("{silver}")}</p><p class="say">「さぁ！<span class="fs">ファーストステージ</span>！{T("{silver}")}だ！果たして、{T("{tank}")}に無事付けられるかぁ？　おぉー！クリア！」</p></div>
 <div class="skc"><p class="skh"><span class="fs">セカンドステージ</span>＝{T("{regu}")}</p><p><b>合体して空気が出せたら、いざ吸ってみよう！</b></p><p class="say">「続いて！<span class="fs">セカンドステージ</span>！呼吸は無事できるのかぁ？　あぁーっと！吸えたぁー！」</p></div>
 <p class="rn2">（呼吸する部分だけを「レギュ」と呼ぶこともあるよ）</p></div>
</section>
<section class="step"><h3 class="sh3"><span class="sn">1-3</span><span>大きな器材</span></h3>
<div class="big">
 <div class="bg">{im("tank", 0.42)}{T("{tank}")}<p>空気のボンベ。<br>{T("{bc}")}＆{T("{silver}")}と合体！</p></div>
 <div class="bg">{im("bc", 1.0)}{T("{bc}")}<p>いわゆる浮き袋。<br>{T("{tank}")}＆{T("{silver}")}＆<br>{T("{kachi}")}と合体！</p><p class="of">（正式名称：Buoyancy Control Device＝浮力調整装置）<br>ネイティブに発音できたらカッコイイかも</p></div>
 <div class="bg">{im("belt", 0.45)}{T("{belt}")}<p>体を沈めるベルト。<br><span class="nw">何kg必要かは、</span>インストラクターさんに聞こう！</p><p class="of">（正式名称：ウェイトベルト）</p></div>
</div></section></div>""")

# 工程4は、4-2の「大事」が長く、4-1の下に大きな空きができる。そのままでは memo がページのまん中に来てしまい、
# 写真を小さくして下をあけると、残圧計やBCDが切れてしまう（10/8 ご指摘・試した結果）。
# そこで工程4だけは、左右の列をそれぞれ上から詰める。4-3が4-1のすぐ下に上がり、左の列の下に memo の場所ができる
COLS = set()   # 10/19 まーく様：読む順は Z字（左上→右上→左下→右下）。列ごとに上から詰める形はやめた
# 工程1〜6：1工程＝1ページ
for sec in STEPS:
    # 手順は2列に並べる（A4の1ページに収めるため）。同じ行の手順は、枠の高さをそろえる
    # 手順が多くて文が長い工程（工程2）だけ、2ページに分ける（1項目は多くても2ページ）
    subs = sec["subs"]
    groups = [subs[:3], subs[3:]] if sec["id"] == "3" else [subs]
    for gi, g in enumerate(groups):
        t = sec["title"] if len(groups) == 1 else (sec["title"] if gi == 0 else sec.get("title2", sec["title"])) + f'<span class="half">{"前半" if gi == 0 else "後半"}</span>'
        if sec["id"] in COLS:
            # 左の列・右の列を、それぞれ上から順に詰める（左＝1つ目・3つ目、右＝2つ目・4つ目）
            body = '<div class="grid2 cols"><div class="col">' + "".join(stepbox(x) for x in g[0::2]) + '</div><div class="col">' + "".join(stepbox(x) for x in g[1::2]) + "</div></div>"
        else:
            body = '<div class="grid2">' + "".join(stepbox(x) for x in g) + "</div>"
        page(f"工程{sec['id']}", t, body, toc=True)  # 前半・後半とも、もくじに出す（10/7 ご指摘：後半が抜けていた）

# まとめ
# 10/22 まーく様「ふり返りも、スキル編にならって見やすく」→ 見出し（上・まん中）＋1つずつの札（左上に短い名前）
_pl = [l for _, ls in POINTS for l in ls]
pts = ('<div class="pbox"><p class="pbh">' + "<br>".join(T(h) for h, _ in POINTS) + '</p><div class="pbg">'
       + "".join(f'<div class="pbc"><span class="pbt">{t}</span><p>{T(l)}</p></div>' for t, l in zip(POINT_TAGS, _pl)) + '</div></div>')
def _qz1(q, a, sid, c=""): return f'<div class="qz{c}"><span class="q"><span class="tapm scr">*</span>{T(q)}<a class="jump qjs" href="#p__QPG_{sid}__"><span class="tapm scr">*</span>{sid}（__QPG_{sid}__ページ）</a></span><span class="a"><span class="ans">{T(a)}</span></span></div>'   # 10/23 まーく様「なぜ、クイズにくわしくは〇ページが無いのか」→ スキル編と同じく、問いの帯の右はしに
# 10/23 まーく様（B の形）：「ふり返ってみようクイズ！」の見出しを、クイズの左上のマスに置き、右に1つ目の札と1問目を並べる。
#   見出しは左の列の幅（右まで広げない）。見出しのすぐ横・すぐ下からクイズが始まる。3冊同じ形
QHEAD = '<h3 class="ph2 qhd">ふり返ってみようクイズ！<small class="scr qhint">□をタップすると、答えが出るよ</small></h3>'
# 10/23 まーく様：洗浄編と同じ形に。見出しは上の段の左の列のいちばん下（クイズのすぐ上）、クイズは1問目から左→右にそろえて並べる（ずらさない）
QB = len(QUIZ[0][1]) % 2 == 1   # 1つ目の組が奇数 → B の形（見出しを左上のマス、右に札と1問目）
quiz = "".join(f'<span class="qh{" qh1" if QB and gi == 0 else ""}">{h}</span>' + "".join(_qz1(q, a, sid, " q1st" if QB and gi == 0 and n == 0 else "") for n, (q, a, sid) in enumerate(qs)) for gi, (h, qs) in enumerate(QUIZ))
# 写真の出どころの文は、ページの下から、まとめの文の下（左半分）へ移す。ページの下があいたぶん、右上の memo が大きくなる（10/8 ご指示）
# 「まとめ」のページ（10/16 まーく様：「今回覚えるべきポイント」はやめて、その他・クイズの前のページに「まとめ」を挟む。
#   文字だけでは分かりづらい → 初心者がイメージしやすく、復習しやすい形に）
# 意図（10/16 作り直し：前の形は手順を省きすぎて、このページだけでは完結しなかった）：
#   写真8枚と、手順を全部（短い言い方で）。このページだけで、全部の流れを見返せる。
#   ・写真を見れば、どの場面かがすぐ思い出せる（文を読まなくても、絵で復習できる）
#   ・番号は、やる順番（左から右へ、次の段へ）。2列×4段。枠＝見出し（上）・写真（左）・手順の一覧（右）
#   ・写真は横長（1.6）にそろえる。どの写真も、見せたい部分（赤い丸など）が切れない形（focus の aspect_range で確かめた。10/16）
#   ・手順の言い方は、手順のページの題を短くしたものだけ（新しい話・まだ決まっていない数字は入れない）
#   ・「くわしくは〇ページ」で、そのページへ飛べる
# 形は、洗浄編2ページの「とくに気をつける3つ」と同じ（写真＋名前＋くわしくは）。新しい形は作らない
def pg_of(sid):   # 手順の番号 → その手順があるページ（ページを作り終えたあとで調べる）
    for i, x in enumerate(pages):
        if x and f'<span class="sn">{sid}</span>' in x: return i + 1
    raise SystemExit(f"まとめ：手順 {sid} のページが見つからない")
def mjump(sid):
    n = pg_of(sid)
    return f'<a class="jump" href="#p{n}"><span class="tapm scr">*</span>くわしくは<b>{sid}</b>（{n}ページ）</a>'
mt = "".join(
    f'<section class="mtc"><h3 class="mth"><span class="mtn">{i}</span><span>{T(h)}</span></h3><a class="mtv" href="https://youtu.be/{_vid_set(k)}">{im(k, 1.6)}<span class="play scr">▶</span></a>'
    + '<ol class="mts">' + "".join(f'<li{" class=\"mtb\"" if big else ""}><span>{"<span class=\"lp mtk\">大事</span>" if big else ""}{T(x)}</span></li>' for sid, x, big in steps) + '</ol>'
    + mjump(steps[0][0]) + '</section>'
    for i, (k, h, steps) in enumerate(MATOME, 1))
page("まとめ", "集約版！サッと1ページで見返そう！", f'<div class="mtg"><div class="mtfirst"><p class="mtl"><span class="nw">迷ったら、まずこのページ！</span><br><span class="nw">写真と番号で、流れがまるごと分かるよ</span></p><div class="ref mtsrc mthow scr"><span class="play">▶</span><span><b>写真をタップすると、YouTubeへ移動するよ</b><span class="rn">動きは、YouTubeで見返そう</span></span></div><p class="src mtcred"><span class="nw">参考動画：「ダイビング機材セッティング」</span><br><span class="nw">OPEN EV／沖縄県立沖縄水産高等学校・</span><br><span class="nw">沖縄県教育委員会</span></p></div>{mt}</div>')

# 10/21 まーく様「準備編、振り返りクイズが抜けてます」→「最後に（ふり返り・クイズ）」のページを戻した。
#   10/21 まーく様のご判断：準備編だけ11ページにしてよい（工程3を1ページにまとめる案は入りきらなかった）。写真の出どころは、まとめの左上にあるので、ここには書かない
page("最後に", "ふり返り", f"""<div class="toprow"><div class="tcol"><div class="pts">{pts}</div></div><div class="memo-slot" data-up=".ph h2"></div></div>
{(f'<div class="quiz qb">{QHEAD}{quiz}</div>' if QB else f'<div class="qsec">{QHEAD}</div><div class="quiz">{quiz}</div>')}""")

TOC_LB = {"最後に": "ラスト"}   # 「器材」は2文字のまま（まん中に空きは入れない。10/8 ご指示）
TOC_TT = {"最後に": "その他・クイズ"}
# 10/20 まーく様「目次には、だよ、は抜いて」→ もくじの行だけ、題の終わりの「だよ」を外す（ページの題はそのまま）
def _tocdayo(t): return re.sub(r"だよ(?=\s*(<span class=\"half|$))", "", t)
toc_rows = "".join(f'<a class="tc" href="#p{pn}"><span class="tl">{TOC_LB.get(lb, lb)}</span><span class="tt">{_tocdayo(T(TOC_TT.get(lb, tt)))}</span><span class="tp">{pn}<small>ページ</small></span></a>' for lb, tt, pn in TOC)
pages[0] = f"""<div class="page" id="p1">{EDTAG}<div class="cover"><p class="cv-k">セーフ ダイブ フォー ア ガーリー スマイル</p><h1 class="cv-t"><span class="emj">🫧</span> <span class="g">S</span>afe <span class="g">D</span>ive for a <span class="g">G</span>irlie <span class="g">s</span>mile <span class="emj">🤿</span></h1><p class="cv-sd">〜あなたの笑顔のための、安全なダイビング（略して<span class="g">SDGs</span>）〜</p><div class="cv-f"><span class="cv-no"><span class="cvn">1</span></span><span class="cv-e"><span class="g">準備</span>編</span></div></div>
<h2 class="toch">もくじ<span class="tocn scr">見たいところをタップすると、そのページへ移動するよ</span></h2><div class="toc">{toc_rows}</div>
<div class="howto scr"><p class="hh">このPDFの使い方</p><p class="htap"><span class="tapm">*</span>は、タップできるところ</p><div class="hrows"><span class="hp">2・{len(pages) - 1}ページ</span><span>青い字をタップで、YouTubeへ</span><span class="hp">2〜{len(pages) - 2}・{len(pages)}ページ</span><span>memo は、タップで書ける</span><span class="hp">{len(pages)}ページ</span><span>□をタップで、答えが出る</span></div><p class="hw">動かなくて、右上に<span class="ckc">✓</span>があれば、1度タップしてみてね</p></div>
<div class="pno"><span>※ 講習で教わった内容・インストラクターさんの指示を最優先に</span><span>1 / __TOTAL__</span></div></div>"""
pages = [x.replace("__TOTAL__", str(len(pages))) for x in pages]

# ── 参考2（TRAVEL PLAN）に合わせた仕上げ（10/7 ご指摘「本当に参考にしたのか」）──
# 参考から写したところ：
#  ・太い水色のななめ縞のふち（紙の幅の約6%）と、その中の白いカード
#  ・小見出しは、水色の「矢印の形の札」＋右に題（参考の「旅の目的 ▶ 青い海と…」）
#  ・写真の名前は、写真の下に小さく中央に書く（写真の上に札を重ねない）
#  ・情報の帯は、薄い灰色の角丸の帯。中の札は紺（参考の「1日目」）
#  ・余白を広めにとる
CSS += """
.page{padding:11mm 10.5mm 14mm;gap:6mm}
.page::before{left:6mm;top:6mm;right:6mm;bottom:6mm}
.pno{left:10.5mm;right:10.5mm;bottom:7.5mm}
.ph h2{font-size:16pt;letter-spacing:.02em}
/* 小見出し：水色の矢印の札＋題 */
.sh3{align-items:center;gap:3mm}
.sn{background:var(--sea1)!important;color:var(--navy)!important;margin-top:0!important;border-radius:0!important;
 padding:.4mm 4.6mm .4mm 2.6mm!important;clip-path:polygon(0 0,calc(100% - 2.4mm) 0,100% 50%,calc(100% - 2.4mm) 100%,0 100%);font-size:10.5pt}
/* 写真の名前は下に */
figure.ph3{margin:0;display:flex;flex-direction:column;gap:1mm}
.cap3{text-align:center;font-size:8.5pt;line-height:1.4;color:var(--muted)}
.cap3.red{color:#c8372d}
/* 情報の帯：薄い灰色、札は紺（大事は赤） */
.nt{background:#f3f5f7!important;padding:2mm 2.6mm!important}
.kx .nk{background:var(--navy)!important;color:#fff!important;box-shadow:none!important}
.kpk .nk{background:#c8372d!important;color:#fff!important;box-shadow:none!important}
.lx{background:var(--navy)!important;color:#fff!important;box-shadow:none!important}
.lp{background:#c8372d!important;color:#fff!important;box-shadow:none!important}
.sasuke,.pts{background:#f3f5f7!important}
.nmr,.qz,.tc,.ref,.bg{border:0!important;background:#f3f5f7}
.qz .a{background:#fff!important}
.step+.step{border-top:0!important;padding-top:1mm!important}
"""

# ── パステルで統一（10/7 ご指示）──
# ・地の色は全部パステル。濃い色の地（紺・赤・道具の濃い色）は使わない
# ・道具の名前は、色の地の札をやめる。太字＋名前の前の小さな色の四角で見分ける（札の地がちゃっちく見えるため）
# ・目立たせるのは「大事」だけ：うすいピンクの帯＋濃い赤の字。ほかの補足は地なしで、細い線で区切る
# ・ふち：参考と同じ、水色と白の太めのななめ縞。白いカードは角4mm
CSS += """
:root{--p-blue:#d4ecfa;--p-blue2:#b8def5;--p-pink:#ffe3ea;--p-pink2:#ffc4d1;--p-ink-red:#b4234a;
 --c-silver:#c5ced6;--c-regu:#f6b3c8;--c-octo:#ffe08a;--c-kachi:#e6c6a4;--c-bcd:#a9cff5;--c-tank:#b3e2c0;--c-gauge:#d8d8ee;--c-belt:#f9c8d6}
.page{background:#c9e8f8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M-5 5 L5 -5 M0 20 L20 0 M15 25 L25 15' stroke='%23eaf6fd' stroke-width='6'/%3E%3C/svg%3E") repeat!important}
.page::before{border-radius:4mm!important}
/* 道具の名前：太字＋色の四角 */
.t{background:none!important;color:var(--ink)!important;box-shadow:none!important;padding:0!important;margin:0 .1em!important;font-weight:900}
.t::before{content:"";display:inline-block;width:.6em;height:.6em;border-radius:.6mm;margin-right:.22em;vertical-align:.02em;background:var(--dot)}
.t-silver{--dot:var(--c-silver)}.t-regu{--dot:var(--c-regu)}.t-octo{--dot:var(--c-octo)}.t-kachi{--dot:var(--c-kachi)}
.t-bc{--dot:var(--c-bcd)}.t-tank{--dot:var(--c-tank)}.t-gauge{--dot:var(--c-gauge)}.t-belt{--dot:var(--c-belt)}
/* 札：全部パステルの地に濃い字 */
.sn,.tl,.nn,.nn2,.cv-e,.fs,.sasuke .sh,.play,.mk,.qh,.half{background:var(--p-blue)!important;color:var(--navy)!important}
.sn{background:var(--p-blue)!important}
.mk{background:#fff!important;color:var(--navy)!important;outline:1px solid var(--navy)!important}
.lx{background:var(--p-blue)!important;color:var(--navy)!important}
.lp{background:var(--p-pink2)!important;color:var(--p-ink-red)!important}
/* 補足：地なし、上下を細い線で区切る。大事だけ、うすいピンクの帯で目立たせる */
.notes{gap:0!important}
.nt{background:none!important;border-radius:0!important;padding:1.8mm .6mm!important;border-top:1px solid var(--line)}
.nt:last-child{border-bottom:1px solid var(--line)}
.kx .nk{background:var(--p-blue)!important;color:var(--navy)!important}
.kpk{background:var(--p-pink)!important;border-radius:2mm!important;border:0!important;padding:1.8mm 2.4mm!important;margin:1mm 0}
.kpk+.nt,.nt+.kpk{border-top:0}
.kpk .nk{background:var(--p-pink2)!important;color:var(--p-ink-red)!important}
.kpk .nx,.kpk .ns{color:var(--p-ink-red)}
.kpk .nh,.kpk .nx b{color:var(--p-ink-red)}
.cap3.red{color:var(--p-ink-red)!important}
/* 情報の帯：地をやめて、細い線のふち */
.nmr,.qz,.tc,.ref,.bg{background:#fff!important;border:1px solid var(--line)!important}
.sasuke,.pts{background:#f4fafe!important}
.sasuke .row2{border:1px solid var(--line)}
.qz .a{background:var(--p-blue)!important}
"""

# ── 手順の番号を、参考の「宿泊先」の札と同じ形にする（10/7 ご指示）──
# 横長の水色の札、字はまん中、右はしだけ短い矢印の先。高さは題の1行と同じ
CSS += """
.sh3{align-items:flex-start!important;gap:3.4mm!important}
.sn{display:flex!important;align-items:center;justify-content:center;flex:none;min-width:17mm;height:calc(12.5pt * 1.5);
 padding:0 4mm 0 2.6mm!important;margin:0!important;font-size:10.5pt!important;line-height:1!important;letter-spacing:.06em;
 background:var(--p-blue2)!important;color:var(--navy)!important;border-radius:0!important;
 clip-path:polygon(0 0,calc(100% - 1.8mm) 0,100% 50%,calc(100% - 1.8mm) 100%,0 100%)!important}
/* ほかの小見出し（SASUKE・クイズの区切り）も同じ形にそろえる */
.sasuke .sh,.qh{display:flex!important;align-items:center;justify-content:center;align-self:flex-start;height:calc(12.5pt * 1.5);
 padding:0 4.6mm 0 3mm!important;font-size:10.5pt!important;line-height:1!important;background:var(--p-blue2)!important;color:var(--navy)!important;
 border-radius:0!important;clip-path:polygon(0 0,calc(100% - 1.8mm) 0,100% 50%,calc(100% - 1.8mm) 100%,0 100%)}
"""

# ── A4の型（10/7）──
# 紙：A4（210×297mm）。1項目＝1ページ。
# 中身：2列の格子。写真の高さは、そのページの中身がちょうど1ページに収まる高さに、ページの中で全部同じにそろえる
# 文字は、写真の上に重ねない（写真の名前は写真の下、道具の名札は器材のない地面の上に置いて線でつなぐ）
# 文字の枠：地の色の箱を使わない。行と行は細い線で区切る。地の色を付けるのは「大事」だけ（うすいピンク）
CSS += """
@page{size:210mm 297mm;margin:0}
.page{width:210mm!important;height:297mm!important;overflow:hidden;padding:15mm 14mm 18mm!important;gap:5mm!important;font-size:12pt}
.page::before{left:7mm!important;top:7mm!important;right:7mm!important;bottom:7mm!important;border-radius:4mm!important}
.page{background:#c9e8f8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M-8 8 L8 -8 M0 32 L32 0 M24 40 L40 24' stroke='%23eaf6fd' stroke-width='10'/%3E%3C/svg%3E") repeat!important}
.pno{left:14mm!important;right:14mm!important;bottom:10mm!important;font-size:8.5pt!important}
.ph .no{font-size:11pt!important}
.ph h2{font-size:22pt!important}
.ph h2 .t{font-size:20pt}
.grid2{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;column-gap:7mm;row-gap:6mm;align-content:start}
.grid2 .wide{grid-column:1/-1}
.step+.step{padding-top:0!important}
.sh3{font-size:13.5pt!important}
.sn{height:calc(13.5pt * 1.5)!important;font-size:11pt!important}
.sh3 .t{font-size:12.5pt!important}
.grid2 .photos img{height:var(--ph,50mm)!important;aspect-ratio:auto!important}
.photos.n3 img,.photos.ngp img{height:calc((var(--ph,50mm) - 1.6mm - 6mm) / 2)!important}
.photos.n3,.photos.ngp{grid-template-columns:1.4fr 1fr!important;grid-template-rows:auto auto}
.photos.n3 .ph3:first-child,.photos.ngp .ph3:first-child{grid-column:1!important;grid-row:1/3}
.photos.n3 .ph3:first-child img,.photos.ngp .ph3:first-child img{height:var(--ph,50mm)!important}
.notes{font-size:11.5pt}.ns{font-size:11.5pt!important}.notes .t{font-size:11.5pt}
.nk{font-size:9pt!important}
.cap3{font-size:9.5pt!important}
/* 道具のページ */
.reg{position:relative}
.reg img{height:auto!important}
.lb{position:absolute;translate:-50% -50%;display:flex}
.lb .nn{display:flex;align-items:center;justify-content:center;width:6.4mm;height:6.4mm;font-size:11pt;font-weight:900;background:#fff!important;color:var(--navy)!important;border:1px solid var(--navy);border-radius:1mm}
/* 写真と表も、ほかのページと同じ2列の線（左右同じ幅・間7mm）にそろえる */
.regrow{display:grid;grid-template-columns:1fr 1fr;column-gap:7mm;align-items:center}
.names{display:flex!important;flex-direction:column;gap:0!important}
.nmr{border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;background:none!important;padding:1.6mm 0!important}
.tools .big{gap:0!important}
.tools .bg{border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;padding:2mm 0!important;grid-template-columns:30mm minmax(0,1fr)!important}
.sasuke{background:none!important;padding:0!important}
.sasuke .row2{border:0!important;border-top:1px solid var(--line)!important;border-radius:0!important;padding:1.6mm 0!important}
.sasuke .sum{border-top:0!important}
.ref{border:0!important;border-top:1px solid var(--line)!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;padding:2mm 0!important}
.legend{font-size:10pt}
/* 表紙・もくじ */
.cv-t{font-size:34pt!important}.cv-s{font-size:15pt!important}.cv-k{font-size:11pt!important}.cv-e{font-size:13pt!important}
.toch{font-size:16pt!important}.tocn{font-size:10.5pt!important}
.toc{gap:0!important}
.tc{border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;padding:2.4mm 0!important;grid-template-columns:18mm minmax(0,1fr) auto!important}
.tl{font-size:10.5pt!important}.tt{font-size:12.5pt!important}.tp{font-size:15pt!important}
/* まとめ */
.pts{background:none!important;padding:0!important;font-size:12pt}
/* 10/22 ふり返りの見出し＋札（スキル編の「伝えたいこと」と同じ形。色は、この本の色） */
.page .pbox{border-radius:2mm;padding:2mm 3mm 2.2mm;background:var(--pale);box-shadow:inset 0 0 0 1.4px var(--line)}
.page .pbh{margin:0 0 1.6mm;text-align:center;font-size:11.5pt;line-height:1.5;font-weight:900;color:var(--navy)}
.page .pbg{display:grid;grid-template-columns:minmax(0,1fr);gap:1.6mm}
/* 10/23 上の段：大事なことの箱を、右の memo と同じ高さまで伸ばし、札を上下に散らす（箱の下に空白を残さない） */
.toprow>.tcol{display:flex;flex-direction:column}
.toprow>.tcol>.pts{flex:none}
.toprow .pts>.pbox{flex:none;display:flex;flex-direction:column}
.toprow .pbox>.pbg{flex:none;align-content:start}   /* 10/23 まーく様「むだな高さの空白は見栄えが最悪」→ 札は上から詰める */
.toprow>.tcol>.qhd{margin-top:0!important}   /* 10/23 見出しは左の列のいちばん下（クイズのすぐ上）。洗浄編と同じ */
.cmp3{display:grid;grid-template-columns:auto auto auto;justify-content:start;column-gap:.6em}   /* 10/23 くらべる2行：「→」と結果の書き出しを縦にそろえる */
/* 10/23 クイズの「くわしくは」：問いの帯の右はし（スキル編と同じ） */
.page .qz .qjs{float:right;margin:0 0 0 2mm!important;font-size:7.6pt!important;font-weight:700;color:#fff!important;white-space:nowrap;line-height:inherit;text-indent:0}
.page .qz .qjs .tapm{color:#fff!important}
/* 10/23 まーく様「長文をもっと見やすく」：ステージごと・1つずつの枠に分ける（言葉は変えない） */
.page .pbs{margin-top:1.4mm}
.page .pbs .pbc{grid-template-columns:minmax(0,1fr)!important;row-gap:.8mm;padding:1.4mm 2.4mm}
.page .pbs .pbt,.kpk .ns .pbs .pbt{justify-self:start;font-size:9.4pt;color:var(--p-ink-red)!important;background:none!important;padding:0!important;border-radius:0!important;border-bottom:1.4px solid var(--p-pink2)}   /* 10/23 まーく様「青の枠文字だと他と区別できない」→ 番号の札（紺の枠）とちがう形：大事と同じ赤い字に下線 */
.page .pbs .pbt::before{content:"▶ ";font-size:.8em}
.page .pbs .pbc{box-shadow:inset 0 0 0 1px var(--p-pink2)!important}
.page .srowc .nn2,.kpk .ns .srowc .nn2{background:var(--navy)!important;color:#fff!important;text-align:center;border-radius:1mm;font-size:8.4pt;line-height:1.6}
.page .pbs .pbc p{font-size:9.6pt;line-height:1.5;color:var(--ink)}
.page .pbs .pbc p small{display:block;font-size:8.4pt;color:var(--muted);font-weight:700}
.page .srowc{display:flex;flex-direction:column;gap:1.2mm;margin-top:1mm}
.page .srowc .src{display:grid;grid-template-columns:5mm 9mm minmax(0,1fr);column-gap:1.6mm;align-items:baseline;background:#fff;border-radius:2mm;box-shadow:inset 0 0 0 1px var(--line);padding:1mm 2mm}
.page .sk2{gap:2mm!important}
.page .sk2 .skc{background:#fff;border-radius:2mm;box-shadow:inset 0 0 0 1px var(--line);padding:1.8mm 2.6mm;display:flex;flex-direction:column;gap:1mm;font-size:10pt;line-height:1.55}
.page .sk2 .skc p{margin:0}
.page .sk2 .skh{font-weight:900;color:var(--navy)}
.page .sk2 .say{font-size:9.4pt!important;color:var(--muted);font-weight:700}
.page .sk2 .rn2{margin:0;font-size:8.8pt;color:var(--muted)}
.page .qsec{width:calc(50% - 3.5mm);margin-top:7mm}   /* 10/23 まーく様「全てが繋がっていると、どこが区切りか分かりづらい」→ 上の段とクイズのかたまりの間を空ける */
.page .qsec>.qhd{margin:0!important}
/* 10/23 まーく様「1つ目の組が奇数で、右下に空きができる場合は、見出しを左、右にクイズのはじめ」（B の形）。偶数なら、見出しを上に置く */
.page .quiz.qb{margin-top:7mm}
.page .qb>.qhd{grid-column:1;grid-row:1/3;align-self:start;margin:0!important}
.page .qb>.qh1{grid-column:2!important;grid-row:1;margin-top:0!important;justify-self:start}
.page .qb>.q1st{grid-column:2;grid-row:2}
.page .pbc{background:#fff;border-radius:2mm;box-shadow:inset 0 0 0 1px var(--line);padding:1.4mm 2.4mm 1.6mm;display:grid;grid-template-columns:15mm minmax(0,1fr);column-gap:2mm;align-items:baseline}   /* 札の名前は左、文は右（1行ぶん低くして、ページに収める） */
.page .pbt{display:inline-block;font-size:8pt;line-height:1.6;font-weight:900;color:#fff;background:var(--navy);border-radius:1mm;padding:0 1.6mm;text-align:center}
.page .pbc p{margin:0;font-size:10pt;line-height:1.45;font-weight:800;color:var(--ink)}
.page .pbc p small{display:block;font-size:8.5pt;color:var(--muted)}
.quiz{display:grid!important;grid-template-columns:1fr 1fr;column-gap:7mm;row-gap:0!important}
.quiz .qh{grid-column:1/-1;justify-self:start;margin-top:2mm}
.quiz .qhd{grid-column:1;grid-row:1/3;align-self:start;margin:0!important}   /* 見出しは左上のマス（10/23） */
.quiz .qh1{grid-column:2!important;grid-row:1;margin-top:0}
.quiz .q1st{grid-column:2;grid-row:2}
.qz{border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;padding:1.6mm 0!important;font-size:11pt}
"""

# ── 道具の名前の前の四角（10/7 ご指示）：ここだけは、はっきりした色で見分ける ──
# どの2色も色の差（CIE76）が30以上あることを確かめた色
CSS += """
:root{--c-silver:#5f6b73;--c-regu:#ad1457;--c-octo:#f2c200;--c-kachi:#8b5a2b;--c-bcd:#1565c0;--c-tank:#2e7d32;--c-gauge:#6a3fb5;--c-belt:#ef7fa0}
.t::before{width:.7em!important;height:.7em!important;vertical-align:-.02em!important}
"""

CSS += """
.srows{display:grid;grid-template-columns:auto auto minmax(0,1fr);column-gap:2mm;row-gap:1.2mm;align-items:baseline;margin-top:.6mm}
.srows .nn2{margin:0;align-self:start;margin-top:.2em}
.sp2{font-weight:900;white-space:nowrap}
/* 細い欄では、場合の名前を上の行に置き、やることは下に欄の幅いっぱいで書く（折り返しを減らす） */
.srows.two{display:flex;flex-direction:column;gap:0}
.srows.two .sp2{display:block;margin-top:1.4mm}
.srows.two .sp2::before{content:"▶ ";font-size:.8em}
.nw{white-space:nowrap}
.sd2 small{display:block;font-size:9.5pt;color:var(--muted)}
"""

CSS += """
/* 同じ行に並んだ2つの手順は「題・写真・補足」の3段を共有する。題が1行と2行でも、写真の上下の線がそろう */
.grid2{grid-auto-rows:auto}
.grid2>.step{display:grid!important;grid-row:span 3;grid-template-rows:subgrid;row-gap:2.4mm;align-content:start}
.grid2>.step.wide{grid-row:auto;display:flex!important}
.grid2>.step>.notes{align-self:start}
.photos.p3{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)!important}
.photos.p3 .ph3{grid-column:auto!important;grid-row:auto!important}
.photos.p3 .ph3>img{height:var(--ph,50mm)!important}
.st2{display:flex;flex-direction:column;gap:1.6mm;height:var(--ph,50mm)}
.st2 img{flex:1;min-height:0;height:auto!important;width:100%;object-fit:cover;border-radius:2mm}
.cap3{white-space:nowrap}
"""

# ── 行の間隔のきまり（10/7 ご指摘「改行したときの行と行の間隔は統一されているか」）──
# 本文はどこも 行の高さ＝字の大きさの1.6倍。行と行のあいだに、余分なすき間（上下の余白）は足さない。
# 箱の中の「次のまとまり」との間だけ、1行の半分（0.8em）あける
CSS += """
.notes,.notes *,.nmr,.nmr *,.bg,.bg *,.sasuke,.sasuke *,.pts,.pts *,.qz,.qz *,.tc .tt,.ref,.ref *{line-height:1.6!important}
.notes .t,.nmr .t,.bg .t,.sasuke .t,.pts .t,.qz .t,.notes .nn2,.sasuke .fs{line-height:inherit!important}
.ns{margin-top:0!important}
.ns+.ns{margin-top:.8em!important}
.srows{margin-top:0!important;row-gap:0!important}
.srows.two .sp2{margin-top:.8em!important}
.srows.two .sp2:first-child{margin-top:0!important}
.sd2 small,.ns small{line-height:1.6!important}
.nk{margin-top:calc((11.5pt - 9pt) * 1.6 / 2)!important;line-height:1.6!important}
"""
CSS += """
.pts small{display:block;padding-left:1em;font-size:10.5pt;color:var(--muted)}
"""
CSS += """
/* 「器材準備編」は表紙でいちばん大きく（ほかの編と見分けるため） */
.cover .cv-e{font-size:42pt!important;line-height:1.35!important;padding:1mm 5mm!important;letter-spacing:.12em}
/* by まーく は「器材準備編」のすぐ下に */
.cover .cv-f{flex-direction:column;align-items:flex-start;gap:1.2mm}
.cover .cv-b{font-size:11pt!important}
/* もくじはタップしやすいよう、行の高さを広げる */
.tc{padding:3.3mm 0!important}
"""
CSS += """
/* 段と段のすき間は、中身があるときだけあける（説明がない手順の下に、空きを作らない） */
.grid2>.step{row-gap:0!important}
.grid2>.step>.photos{margin-top:2.4mm}
.grid2>.step>.notes{margin-top:2.4mm}
.grid2{row-gap:6mm!important}
"""
CSS += """
/* 2-5：ストラップの写真を広くとる（オクトの口からストラップの金具まで、切らずに入れるため） */
.photos.strap2{grid-template-columns:.8fr 1.2fr!important}
"""
CSS += """
.ngx{position:relative;flex:1;min-height:0;display:block}
.grid2 .photos .ngx img{position:absolute;inset:0;width:100%;height:100%!important;object-fit:cover;border-radius:2mm;display:block}
.ngx b{position:absolute;right:1.4mm;top:-.6mm;font-size:22pt;line-height:1;font-weight:900;color:#c8372d;
 -webkit-text-stroke:1.2px #fff;paint-order:stroke fill}
"""
CSS += """
/* 大きな道具：写真の枠を、道具の形に合わせる（タンク・重りは縦長、BCDは正方形）。
   写真の欄は全部同じ幅（34mm）・同じ高さ（34mm）で、道具はその中のまん中に大きく置く。説明の書き出しの位置はそろう */
.tools .bg{grid-template-columns:34mm minmax(0,1fr)!important;grid-template-rows:auto auto auto!important;align-content:center;row-gap:.6mm!important;padding:1.6mm 0!important}
.tools .bg>img{grid-row:1/4;justify-self:center;height:31mm!important;width:auto!important;max-width:34mm;aspect-ratio:auto}
"""
CSS += """
.ph3.stack .cap3{align-self:center;text-align:left}
.photos.p3.rev{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)!important}
"""
CSS += """
/* 魚のイラスト：見出しの線の右はしに1匹、空いた枠に小さな群れ */
.ph{grid-template-columns:auto minmax(0,1fr) auto!important}
.ph::after{grid-column:2!important}
.hfish{grid-column:3;grid-row:1;display:flex;align-items:flex-end;gap:1mm;margin-left:2mm}
.hfish .fish{display:block;height:11mm;width:auto}
.hfish .fish:first-child{height:6mm}
.ph h2{grid-column:1/-1!important}
.fscene{position:relative;grid-row:span 3;align-self:center;justify-self:center;width:80mm;height:60mm}
.fscene span{position:absolute}
.fscene .fish{display:block;width:auto}
.fscene .f1{left:2mm;top:6mm}.fscene .f1 .fish{height:22mm}
.fscene .f2{left:36mm;top:0}.fscene .f2 .fish{height:14mm}
.fscene .f3{right:0;top:20mm}.fscene .f3 .fish{height:19mm}
.fscene .f4{left:20mm;bottom:0}.fscene .f4 .fish{height:16mm}
"""
CSS += """
.cv-k .hfish{order:2;margin-left:0}
.cv-k .hfish .fish{height:11mm}
.cv-k .hfish .fish:first-child{height:6mm}
"""
CSS += """
/* 改行：文のかたまりは、行の長さをなるべくそろえて折り返す（最後の行に1〜2文字だけ落ちるのを防ぐ。10/7 ご指摘） */
.nx,.ns,.ns *,.sd2,.sd2 small,.pts p,.say,.q,.ds,.pbc p,.pbc p small{text-wrap-style:auto!important}   /* 10/23 まーく様「中途半端な改行で右スペースを無駄にしている」→ 行の長さをそろえる（balance）をやめ、右はしまで使う（pretty：1字だけの行は作らない） */
"""
CSS += """
/* 2列のまん中に、水色の線（行の区切りと同じ線）を引いて、左右を区切る（10/7 ご指示） */
/* たての線は、右の列の手順の左わき（列のあいだのまん中）にだけ引く。横いっぱいの段（道具の「1」など）の文字には重ねない（10/7 ご指摘） */
.grid2>.step{position:relative}

"""
CSS += """
/* 手順と手順の上下の区切り（例：1-1 と 1-3 のあいだ）にも、同じ水色の線を横いっぱいに引く。
   最後が大事（ピンク）でも補足（白）でも、次の手順との境目がはっきり分かるように（10/7 ご指摘） */
.grid2{row-gap:0!important}
.grid2>.step{padding-bottom:4mm}
.grid2>.step:nth-child(n+3),.grid2.tools>.step:nth-child(2){border-top:1px solid var(--line)!important;padding-top:4mm!important}
.grid2.tools>.step:nth-child(3){border-top:1px solid var(--line)!important;padding-top:4mm!important}
"""
CSS += """
/* もくじ：表紙の文を少しつめて、あいた高さを全部もくじの行に配る（行の高さを最大にして、押しまちがいを防ぐ） */
#p1 .cv-t{font-size:28pt!important}
/* 表紙の題（10/14 ご指示で「専門用語がなんぼのもんじゃい！」から変更。インストラクターさんにも共有しやすい題に） */
#p1 .cv-t{letter-spacing:0;white-space:nowrap;font-size:24pt!important}   /* 1行に収める（10/14 ご指示） */
#p1 .cv-t .emj{font-family:"Noto Color Emoji",sans-serif;font-weight:400}
#p1 .cv-sd{margin:1mm 0 0;font-size:12pt;line-height:1.6;font-weight:900;color:var(--ink)}
#p1 .cover{gap:1.4mm!important}
#p1 .toc{flex:1;display:flex!important;flex-direction:column}
#p1 .tc{flex:1;padding:0!important;min-height:0}
"""
CSS += """
/* 補足の行は、白（補足）もピンク（大事）も同じ形にそろえる：
   どの行も上と下に水色の線、ピンクは線と線のあいだをうすいピンクでぬる（角は丸めない）。
   これで、大事の行のあとにも線が入り、次の手順との区切りがはっきりする（10/7 ご指摘） */
.notes .nt{border-top:1px solid var(--line)!important;border-bottom:0!important;margin:0!important}
/* 補足の最後の行の下には線を引かない。下の区切りは、次の手順との境目の線1本だけにする（二重線を作らない。10/7 ご指摘） */
.notes .nt:last-child{border-bottom:0!important}
.names .nmr:last-child,.tools .bg:last-child{border-bottom:0!important}
.notes .kpk{border-radius:0!important;padding:1.8mm .6mm 1.8mm 1.4mm!important}
"""
CSS += """
/* 道具のページの下の段：左（SASUKE）の1行目と、右（タンク）の1行目の高さをそろえる（10/7 ご指摘） */
.tools .bg:first-child{padding-top:0!important}
"""
CSS += """
/* 写真の下の名前に添える正式名称（ほかの「正式名称：」と同じ、うすい字） */
.cap3 small{display:block;font-size:9pt;color:var(--muted)}
"""
CSS += """
/* もくじの説明は、「もくじ」と同じ行の右に置く（1行ぶんの高さを、もくじの行に回す） */
#p1 .toch{display:flex;align-items:baseline;justify-content:space-between;gap:3mm}
#p1 .toch .tocn{font-size:9.5pt!important;font-weight:700;color:var(--muted)}
#p1 .cover{padding-top:2mm!important}
#p1{gap:4mm!important}
"""
CSS += """
/* 題と中身のすき間は、どの手順も同じ 2.4mm（SASUKE・大きな道具・表も写真と同じにする。10/8 ご指摘：札がくっついていた） */
.step>.sh3+*{margin-top:2.4mm!important}
"""
CSS += """
/* 道具の名前は、まわりの字と同じ大きさ・同じ下の線（ベースライン）にそろえる（10/8 ご指摘：「銀色金具」と「ぐるぐる」の高さがずれていた） */
html body .page span.t.t.t{font-size:1em!important;vertical-align:baseline!important;line-height:inherit!important}
"""
CSS += """
/* 大事（ピンク）の行：赤い字は見出しの1行だけ。下に続く説明は、ふつうの紺の字にする（全部赤だと読みにくい。10/8 ご指摘） */
.kpk .ns,.kpk .ns *:not(.t){color:var(--ink)!important}
.kpk .ns b,.kpk .ns .nh,.kpk .ns .sp2{color:var(--navy)!important}
.kpk .ns small,.kpk .ns .sd2 small{color:var(--muted)!important}
"""
CSS += """
/* 大事・補足の札（10/8 ご指摘：札の下に左の余白ができて気になる）
   札を左の細い列に立てるのをやめ、1行目の頭に「字の一部」として置く。
   2行目からは札の下（欄の左はし）から書くので、左にむだな空きができず、どの行も欄の幅いっぱいに使える。
   札は「大事」「補足」とも同じ2文字・同じ幅なので、1行目の書き出しもそろう */
.notes .nt{display:block!important;text-wrap-style:auto}
.notes .nk{display:inline;margin:0 1.6mm 0 0!important;padding:0 1.4mm;vertical-align:.08em;-webkit-box-decoration-break:clone}
.notes .ns{display:block}
/* memo：あいている場所に、PDFから字を入れられる欄を置く（10/8 ご指示）。欄そのものは、あとでPDFに足す */
.page>.memo{position:absolute!important;background:var(--pale);border-radius:2mm;padding:1.6mm 2.4mm}
.memo .mh{display:block;font-size:9pt;line-height:1.6;font-weight:900;letter-spacing:.1em;color:#1c6ea4}
/* 2列は、中身の長さにかかわらず、いつも左右同じ幅にする（長い字のかたまりで、片方の列が広がらないように） */
.grid2{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
.grid2>.step>*{min-width:0}
"""
CSS += """
/* memo：付箋の形にする（10/8 ご指示「ノートや付箋っぽく、デザインはしっかり保って」）
   ・うすい黄色の紙に、方眼ノートのような点を等間隔に打つ（打った字の行の位置とずれても気にならないよう、線ではなく点にする）
   ・上のまん中に、水色のマスキングテープを1枚。右下のすみは、紙をめくったように折る */
.page>.memo{background-color:#fffaeb!important;border-radius:2mm 2mm 0 2mm!important;overflow:visible;
 background-image:radial-gradient(circle,#ecd48a .45mm,transparent .5mm)!important;background-size:5mm 5mm;background-position:2.5mm 7.5mm;
 clip-path:polygon(0 -3mm,100% -3mm,100% calc(100% - 5mm),calc(100% - 5mm) 100%,0 100%)}
.page>.memo::before{content:"";position:absolute;left:50%;top:-1.6mm;width:18mm;height:4.4mm;translate:-50% 0;background:rgba(212,236,250,.9)}
/* 右下の折り目：ぼかし（グラデーション）ではなく、ふつうの三角にする。グラデーションは印刷のときに黒くなることがある */
.page>.memo::after{content:"";position:absolute;right:0;bottom:0;width:5mm;height:5mm;background:#ecd48a;clip-path:polygon(0 0,100% 0,0 100%)}
.memo .mh{color:#9a6b00!important;background:#fffaeb;display:block!important;width:fit-content;padding-right:1mm}
"""
CSS += """
/* 大事（ピンク）と補足（白）で、札の左はしをそろえる（10/8 ご指摘：ピンクの行だけ札が右にずれていた）
   どの行も、左右の余白を同じ 1.4mm にする。ピンクの地があってもなくても、札と字の書き出しは同じ位置に来る */
.notes .nt,.notes .kpk{padding:1.8mm 1.4mm!important}
"""
CSS += """
/* 表紙：「生きるために…」と「器材準備編」のあいだの横線は引かない（10/8 ご指示） */
.cover .cv-f{border-top:0!important;padding-top:0!important}
/* ✕ の大きさ：5.4mm 四方（線 1.2mm ＝ 54 のうち 12） */
.ngx .ngv{position:absolute;right:1mm;top:1mm;width:7mm;height:7mm}
/* 上の段を左右に分けて、右半分を memo にする（道具・ふり返り。10/8 ご指示：右上があいていた） */
.toprow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:7mm}
.toprow .tcol{display:flex;flex-direction:column;gap:5mm}
.memo-slot{min-height:30mm}
/* memo：ノートのように、行ごとに下線を引く（ほかの区切りと同じ、水色の1pxの線。10/8 ご指示）。点は打たない
   付箋の形（うすい黄色の紙・水色のテープ・右下の折り目）＋下線、で決まり（10/8 ご判断「このデザインなら良し」） */
.page>.memo{background-image:none!important;padding:1.6mm 2.4mm!important}
.memo .ml{height:8.5mm;border-bottom:1px solid var(--line)}
"""
CSS += """
/* 左右の列を、それぞれ上から詰める形（工程4） */
.grid2.cols{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;column-gap:7mm;align-items:start}
.grid2.cols>.col{display:flex;flex-direction:column;min-width:0}
.grid2.cols .col>.step{display:flex!important;flex-direction:column;gap:0!important;padding-bottom:4mm;min-width:0}
.grid2.cols .step>.notes{margin-top:2.4mm}
.grid2.cols .col>.step+.step{border-top:1px solid var(--line)!important;padding-top:4mm!important}
"""
CSS += """
/* 道具のページ：右上の memo を広げる（10/8 ご指示「右際のスペースを頑張って空けて」）
   ・大きな道具の写真を 31mm → 26mm に下げ、下の段を SASUKE と同じ高さまで縮める
   ・あいた高さは、上の段（凡例・参考動画／memo）に回す。左の参考動画は下にそろえ、memo と下の線を合わせる */
#p2 .tools .bg>img{height:33mm!important;max-width:34mm!important;object-fit:contain}
#p2 .grid2.tools{flex:none!important}
#p2 .toprow{flex:1}
/* 参考動画の枠は、凡例の下から memo の下はしまで伸ばし、中身はまん中に置く（あいだに半端なすき間を作らない） */
#p2 .tcol .ref{flex:1}
/* ふり返り：ページの下のあまりを、右上の memo に回す（下に半端な空きを残さない） */
#p10 .toprow{flex:none}   /* 10/23 上の段は中身の高さだけ（引きのばして空白を作らない） */
/* 出どころの文は、左の列の下はし（memo の下はしと同じ高さ）に置く */
/* ふり返り：クイズの見出しを左の列のいちばん下（クイズのすぐ上）に入れ、見出しの1段ぶんを右上の memo に回す（10/8 ご指示「もっと大きく」）
   出どころの文は、まとめの文のすぐ下に置く */
#p10 .tcol .ph2{margin-top:auto}
.page .mtg>.mtsrc{grid-column:auto/span 1!important;align-self:end;font-size:7.6pt!important;line-height:1.4!important}   /* 10/20 写真の出どころは、まとめの空いたマスに */
/* クイズの行の上下の余白を少しつめて、そのぶんも memo に回す */
#p10 .qz{padding:1.2mm 0!important}
"""
CSS += """
/* memo の見出しの横の説明（10/8 ご指示）。見出しより小さく、うすい字で */
.memo .mh small{font-size:8pt;font-weight:700;letter-spacing:0;margin-left:2mm;color:var(--muted)}
"""
CSS += """
/* 道具の名前（上）と正式名称（下・小さいうすい字） */
.nmr .nm small{display:block;font-size:9pt;font-weight:700;color:var(--muted);line-height:1.6!important}
/* 1行目＝道具の名前＋説明、2行目＝正式名称。説明は名前のすぐ後ろに続ける（書き出しがばらばらにならないように） */
.nmr{grid-template-columns:5.4mm minmax(0,1fr)!important;align-items:start!important;padding:1mm 0!important}
.nmr .nn{margin-top:calc((11pt * 1.6 - 5.4mm) / 2 + .28mm)}
.nmr .nm .ds{margin-left:2.4mm;font-size:11pt!important}
/* 上の段（凡例と参考動画）のすき間を少しつめて、正式名称を足したぶんの高さを作る */
#p2 .tcol{gap:3mm!important}
#p2 .tools .bg:not(:first-child){padding:1.1mm 0!important}
#p2 .tools .bg:first-child{padding-bottom:1.1mm!important}
/* いちばん下の段の下には区切りの線がないので、下の余白（4mm）はいらない */
#p2 .grid2>.step:nth-last-child(-n+2):not(.wide){padding-bottom:0!important}
.nmr .dsn{font-size:9pt;color:var(--muted)}
"""
CSS += """
/* 大事・補足の札は、1行目に札だけを置き、2行目から文を書く（10/8 ご指示：札の後ろに文を続けると見栄えが悪い） */
.notes .nk{display:block!important;width:fit-content;margin:0 0 .8mm 0!important;vertical-align:0!important}
/* 題を左半分に収めて、右上を題の行から memo にする（道具・ふり返り。10/8 ご指示） */
#p2 .ph h2,#p10 .ph h2{max-width:calc((100% - 7mm) / 2)}
/* 道具の「1」：題と写真は左半分、右の表は題の行から始める（題が右にはみ出さないように。10/8 ご指示） */
#p2 .tools>.step.wide{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto 1fr;column-gap:7mm}
#p2 .tools>.step.wide>.sh3{grid-column:1;grid-row:1}
#p2 .tools>.step.wide>.regrow{display:contents}
#p2 .tools>.step.wide .reg{grid-column:1;grid-row:2;align-self:start;margin-top:2.4mm}
#p2 .tools>.step.wide .names{grid-column:2;grid-row:1/3;margin-top:0!important}
"""
CSS += """
/* 見出しの右上の、札の説明（「工程1 ──」の線と魚のあいだ） */
.ph{grid-template-columns:auto minmax(0,1fr) auto auto!important}
.ph .hl{grid-column:3;grid-row:1;display:flex;align-items:center;gap:1.4mm;margin-left:2.5mm;font-size:9pt;line-height:1.6;color:var(--ink);white-space:nowrap}
.ph .hl .lp{margin-left:2.4mm}
.ph .hl span{font-size:8.5pt;padding:0 1.4mm;border-radius:1mm;font-weight:900}
.hfish{grid-column:4!important}
"""
CSS += """
/* 札をまとめたときの、2つ目からの話：1行ぶんの半分（0.8em）あける */
.notes .ns.np{margin-top:.8em!important}
"""
CSS += """
/* 行の頭の「（かぎかっこ）の左の空きを詰め、下の行と書き出しをそろえる（5-2の留める順番） */
.notes .sd2,.notes .nx,.notes .ns,.sasuke p{text-spacing-trim:trim-start}
"""
CSS += """
/* 表紙：PDFの使い方（10/8 ご指摘：memo を書いている間は、□やリンクが効かない。初心者が混乱しないよう、先に書いておく） */
#p1 .howto{background:var(--pale);border-radius:2mm;padding:2.4mm 3mm;font-size:10.5pt;line-height:1.6}
#p1 .howto .hh{font-weight:900;color:var(--navy);font-size:11pt}
#p1 .howto .hw{margin-top:.8em;color:var(--p-ink-red);font-weight:900}
"""
CSS += """
/* .scr＝画面で見るときだけの説明（「タップすると〜」など）。印刷では消す（10/8 ご指示）
   PDFの本文からは消し、同じ見た目の絵を「印刷しない注釈」として同じ場所に重ねる（scrshot.js・addscr.py） */
"""
CSS += """
/* クイズの中の正式名称（呼び方のすぐ後ろに、かっこで小さく） */
.qz .of2{color:var(--muted);font-weight:700}
.qz .a .of2{color:var(--navy)}
"""
CSS += """
/* 使い方の行：左に「どのページか」の札（幅をそろえる）、右に説明 */
#p1 .howto .hrows{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:2.4mm;row-gap:.6mm;align-items:center;margin-top:.6mm}
#p1 .howto .hp{background:var(--p-blue);color:var(--navy);border-radius:1mm;font-size:9pt;font-weight:900;text-align:center;padding:0 1.6mm;line-height:1.6}
"""
CSS += """
/* ふり返り：写真の出どころ（URL）と「ふり返ってみようクイズ！」のあいだに横線を1本（10/8 ご指示） */
#p10 .tcol .ph2{border-top:1px solid var(--line);padding-top:3mm}
/* URL は途中で折り返さない（「youtu. / be」のように切れないように） */
.src a{white-space:nowrap}
"""
CSS += """
/* タップできるところの印「*」：字より少し大きく、大事と同じ赤で、すぐ後ろの字とくっつけすぎない */
.tapm{display:inline-block;color:var(--p-ink-red)!important;font-weight:900;font-size:1.15em;line-height:1;margin-right:.15em;vertical-align:-.05em;text-decoration:none}
#p1 .howto .htap{margin-top:.4mm;margin-bottom:.4mm}
/* 10/23 まーく様「右の余白も活用して行数を減らし、その分もくじの間隔を広く（誤タップを防ぐ）」
   ・題「このPDFの使い方」と「＊は、押せるところ」を同じ行に
   ・4つの項目を2列×2行に
   ・あいた高さは、もくじの行（flex:1）が自動で広がって使う */
#p1 .howto .hh,#p1 .howto .htap{display:inline-block!important;margin:0!important;vertical-align:baseline}
#p1 .howto .htap{margin-left:4mm!important}
#p1 .howto .hrows{grid-template-columns:auto minmax(0,1fr) auto minmax(0,1fr)!important;column-gap:2mm!important;row-gap:1mm!important;margin-top:1mm!important}
#p1 .howto .hw{margin-top:1mm!important}
#p1 .howto .hw .ckc{display:inline-flex;align-items:center;justify-content:center;width:1.25em;height:1.25em;border-radius:50%;border:.12em solid currentColor;font-size:.85em;line-height:1;margin:0 .15em;vertical-align:.05em}   /* 10/23 丸の中の✓（iPhone の「完了」ボタンに近い形） */
"""
CSS += """
/* memo のテープ：紙（うすい黄色）とはっきり違う、マスキングテープらしい濃いめの黄色。
   両はしを、手でちぎったようなギザギザにする（10/8 ご指示：青いテープは紛らわしい）。
   ぼかし（グラデーション）は印刷で黒くなるので使わない */
.page>.memo::before{background:#f3d36b!important;width:20mm!important;height:4.6mm!important;
 clip-path:polygon(0 0,100% 0,97% 18%,100% 36%,97% 54%,100% 72%,97% 88%,100% 100%,0 100%,3% 82%,0 64%,3% 46%,0 28%,3% 12%)}
"""
CSS += """
/* クイズの説明は1行に収める（10/8 ご指示：印刷で消えたあとに2行ぶんの空きが残るのが気になる）。
   字をつめる（かっこ・読点の空きを詰める palt）だけで、字の大きさ（9pt）は変えない */
#p10 .ph2 small.qhint{white-space:nowrap;font-feature-settings:"palt";letter-spacing:-.01em}
/* 10/22 ページが増えて #p10 でなくなり、1行に収まらず「消えるよ）」が欄の右はしで切れていた → 折り返してよいことにする（clip の点検で見つけた） */
.ph2 small.qhint{white-space:normal!important}
"""
CSS += """
/* もくじの札は、どれも3文字（器　材・工程1〜6・ラスト）にそろえたので、列の幅はもとの 18mm のまま */
"""
CSS += """
/* 大きな器材：写真は、その行の上下のまん中に置く（10/8 ご指摘：文が長い BCD の行だけ、写真が上に寄っていた） */
.tools .bg>img{align-self:center!important}
"""
CSS += """
/* 編の番号（10/13 ご指示）。❶❷ は ❿（10）までしかないので使わず、四角い札にした。何番まででも同じ形で出せる。
   「〇〇編」の箱と同じ高さ・同じ角の丸みで、左に並べる。地は濃い色、数字は白（いちばん目立つように） */
.cover .cv-f{flex-direction:row!important;align-items:stretch!important;justify-content:flex-start!important;gap:2.4mm!important}
.cover .cv-no{display:flex;align-items:center;justify-content:center;min-width:17mm;padding:0 3mm;background:var(--navy);color:#fff;
 border-radius:1mm;font-size:42pt;line-height:1.35;font-weight:900;font-feature-settings:"tnum"}
"""
CSS += """
/* 全ページの左上はしに、小さく編の番号と名前（10/13 ご指示）。白いカードの上のすき間に置き、見出しには重ねない */
.edtag{position:absolute!important;left:14mm;top:9.6mm;display:flex;align-items:center;gap:1.2mm;font-size:7.5pt;line-height:1;font-weight:900;color:var(--navy)}
.edtag .ver{font-weight:700;color:var(--muted);margin-left:1mm;letter-spacing:.02em}
.edtag b{display:inline-flex;align-items:center;justify-content:center;min-width:3.6mm;height:3.6mm;padding:0 .8mm;background:var(--navy);color:#fff;border-radius:1mm;font-size:7pt}
"""

CSS += """
/* ── 表紙のデザイン（10/15 ご指示：案A「スクリプト」）──────────────────────
   題は丸みのある手書きの筆記体（Pacifico）。「Girlie」だけピンクにして目立たせる。
   副題と「〇〇編」は、ページ全体と同じシャープな形にする（10/15 ご指摘：丸い形は違和感）。
   色は準備編の紺・水色で書く（洗浄編は、作るときに茶・オレンジへ自動で置きかわる） */
#p1 .cv-t{font-family:"Pacifico",cursive!important;font-weight:400!important;color:#16466b!important;line-height:1.35!important;
 letter-spacing:.01em!important;text-shadow:0 .06em 0 #d4ecfa}   /* ぼかしの影は PDF で画像になるので使わない。ずらした影だけ */
#p1 .cv-t .g{color:#e0507f}
#p1 .cv-t .emj{text-shadow:none}
/* 副題・〇〇編は案F2「解星デコール」（10/15 決定）。
   はね・はらいに少し飾りのある明朝体で、題の筆記体と同じく線に表情があり、「Girlie」の雰囲気に合う。
   形はページ全体と同じくとがったまま（角の丸み0）。数字は線のわく、名前の下にうすい線。
   ピンクは、副題の「SDGs」と、名前の「準備」「洗浄」だけ（10/15 ご指示） */
#p1 .cv-sd{font-family:"Kaisei Decol",serif!important;font-weight:500!important;color:#1c6ea4!important;letter-spacing:.08em!important}
#p1 .cv-sd .g,.cover .cv-e .g{color:#e0507f}
/* 数字はわくのまん中より、気持ち上に置く（10/15 ご指示）。字の形の都合で、そのままだと約1mm下に下がって見えるため。
   上のすき間：下のすき間 ＝ 約45：55（目で見てまん中に見える位置）。numcheck で毎回測る */
.cover .cv-no .cvn{display:block;transform:translateY(-1.35mm)}   /* 名前は cvn（.nn は本文の札で使っているので使わない） */
.cover .cv-f{gap:3mm!important;align-items:center!important}
.cover .cv-no{font-family:"Kaisei Decol",serif!important;font-weight:700!important;background:#fff!important;color:#16466b!important;border-radius:0!important;box-shadow:inset 0 0 0 1.2mm #16466b}
.cover .cv-e{font-family:"Kaisei Decol",serif!important;font-weight:700!important;background:none!important;color:#16466b!important;border-radius:0!important;padding:0!important;letter-spacing:.14em!important;box-shadow:inset 0 -1.4mm 0 #d4ecfa}
"""
CSS += """
/* まとめのページ（10/16 作り直し）：このページだけで全部の手順が分かるように。写真8枚＋手順を全部（短く）。2列×4段
   1つの枠＝番号と見出し（上）、写真（左）、手順の一覧（右）、くわしくは（右下） */
.mtl{margin:0;font-size:11pt;font-weight:700;color:var(--ink)}
.mtk{display:inline-block;font-size:8.5pt;font-weight:900;padding:0 1.2mm;border-radius:1mm;margin:0 1mm 0 0;line-height:1.6}
.mtl .mtk{margin:0 .6mm 0 1.6mm}
.mtg{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:auto;align-content:space-evenly;gap:2.4mm 6mm;margin-top:2mm}
.mtc{display:grid;grid-template-columns:34mm minmax(0,1fr);grid-template-rows:auto auto 1fr;column-gap:3mm;row-gap:1.6mm;border-top:1px solid var(--line);padding-top:2.4mm}
.mth{grid-column:1/3;margin:0;display:flex;align-items:center;gap:2mm;font-size:11pt;font-weight:900;color:var(--navy);line-height:1.4}
.mtn{flex:none;width:6.4mm;height:6.4mm;display:grid;place-items:center;font-size:10.5pt;font-weight:900;color:#fff;background:var(--navy)}
.mtc>img{grid-column:1;grid-row:2/4;width:34mm;display:block;border-radius:2mm;object-fit:cover}
.mts{grid-column:2;grid-row:2;list-style:none;margin:0;padding:0;font-size:9.2pt;font-weight:700;line-height:1.45;color:var(--ink)}
.mts li{padding-left:1em;text-indent:-1em}
.mts li::before{content:"・"}   /* 10/19：番号は枠の1〜8だけにする（手順番号と2つあると迷う）。手順番号は「くわしくは」に残す */
.mts li+li{margin-top:.8mm}
.mtid{font-size:8.5pt;font-weight:900;color:var(--muted)}
.mts li.mtb{color:var(--p-ink-red)}
/* 「くわしくは 2-3（3ページ）」：洗浄編と同じ形・同じ色（リンクの青） */
.jump{display:block;text-align:center;font-size:9pt;line-height:1.6;font-weight:700;color:#1c6ea4;text-decoration:underline;margin-top:.8mm}
.jump b{margin:0 .6mm}
.mtc .jump{grid-column:2;grid-row:3;text-align:left;margin-top:0;align-self:end;font-size:8.5pt!important;line-height:1.5!important;white-space:nowrap}
"""
# 10/19 行間・字間の見直し（まーく様：「行間が少し空いていて気持ち悪い。プロのチラシや本と見比べて」）
#   いままで：説明の文はほぼ全部 行間1.6・字間は詰めなし（「、」「。」が全角ぶん空く）
#   プロのめやす：本の本文（長く読む文）は 1.5〜1.8倍。チラシ・図解の短い文（1〜3行）は 1.3〜1.5倍。見出しは 1.2〜1.35倍。
#     見出しと短い文は「プロポーショナル詰め（palt）」で、句読点やカナのすき間を詰めるのがふつう。
#   この資料の文は、ほとんどが1〜3行の短い文 → チラシ・図解のめやすに合わせる。
#   10/19 まーく様：「行間の案はプロデザインに合わせる形で」→ 3冊ともこの形に決定。TYPO=old で前のまま（比べる用）
if __import__("os").environ.get("TYPO", "new") != "old":
    CSS += """
/* 字間：見出し・札・説明文は、句読点とカナのすき間を詰める（palt） */
.page,.page *{font-feature-settings:"palt"!important}
.cover .cv-t,.cover .cv-sd,.cover .cv-e,.cover .cvn,.tp,.tp *{font-feature-settings:normal!important}
/* 行間：短い説明文は 1.45、写真の名前・小さな字は 1.35、題（手順の題）は 1.3 */
.notes,.notes *,.nmr,.nmr *,.bg,.bg *,.sasuke,.sasuke *,.pts,.pts *,.qz,.qz *,.ref,.ref *{line-height:1.45!important}
.sh3,.sh3 *{line-height:1.3!important}
.cap3,.cap3 *,.page small,.ns small{line-height:1.35!important}
"""
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&family=Pacifico&family=Kaisei+Decol:wght@500;700&display=swap">'   # Pacifico は表紙の題、Kaisei Decol は副題と〇〇編（10/15）
import newdesign as _nd
CSS += _nd.css("1")
import fontset as _fs
import logo as _lg
import photolink as _pl   # 10/21 どの写真も、タップすると関連の動画へ（準備編の写真は、どれも「ダイビング機材セッティング」の画面から）
import ruby as _rb   # 10/20 ルビ   # 10/20 表紙の題をロゴの絵に（LOGO=A/B/C のときだけ）
FONTS = _fs.links(FONTS)
if _lg.LOGO: FONTS = FONTS.replace('&display=swap', '&' + _lg.LINK + '&display=swap', 1)
CSS += _lg.CSS
CSS += _rb.CSS
CSS += _fs.css("1")
FIT = r'''<script>
function markRight(){document.querySelectorAll('.grid2').forEach(g=>{const c=g.getBoundingClientRect();const mid=(c.left+c.right)/2;g.querySelectorAll(':scope>.step:not(.wide)').forEach(st=>{if(st.getBoundingClientRect().left>mid)st.classList.add('rc');});});}

// 最後の行に3文字以下しか残らないときは、その手前の数文字を1つにまとめて、いっしょに次の行へ送る（10/7 ご指摘）
function fixOrphans(){document.querySelectorAll('.nx,.ns,.sd2,.ds,.q,.say,.pts p,.page p').forEach(bl=>{
 for(let t=0;t<3;t++){const w=document.createTreeWalker(bl,NodeFilter.SHOW_TEXT);let n,last=null;while(n=w.nextNode()){if(n.textContent.trim()&&!n.parentElement.closest('.t,.nk,.half'))last=n;}
  if(!last)return;const tx=last.textContent;let lines=0,top=null,cnt=0;const ch=[];
  for(let i=0;i<tx.length;i++){if(!tx[i].trim())continue;const r=document.createRange();r.setStart(last,i);r.setEnd(last,i+1);const q=r.getClientRects()[0];if(!q)continue;ch.push([i,q.top]);}
  const all=bl.getClientRects();if(ch.length<2)return;const lt=ch[ch.length-1][1];const inLast=ch.filter(c=>Math.abs(c[1]-lt)<2).length;
  const multi=ch.some(c=>Math.abs(c[1]-lt)>2)||bl.getBoundingClientRect().height>parseFloat(getComputedStyle(bl).lineHeight)*1.5;
  if(!multi||inLast>3)return;const k=Math.min(tx.trimEnd().length,inLast+4);const end=tx.trimEnd().length;
  const r=document.createRange();r.setStart(last,end-k);r.setEnd(last,end);const sp=document.createElement('span');sp.style.whiteSpace='nowrap';r.surroundContents(sp);}});}
// memo は1ページに1つ、大きな1つの塊にする。どのページも、ページの下はしまで届く位置に置く（10/8 ご指示）
//  ・道具・ふり返り … 上の段の右半分（memo-slot）
//  ・工程 … 左の列か右の列の「下があいているところ」から、ページの下まで。いちばん高く取れるほうを使う
//           どちらも低すぎるとき（40mm 未満）は、写真を少し小さくして、ページの下に横いっぱいの memo（34mm）をあける
//  ・表紙 … 置かない
const MM=96/25.4,GAP=4*MM,MINC=40*MM,RES=34*MM;
function vis(el){let m=-1e9;const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);[...r.getClientRects()].forEach(q=>m=Math.max(m,q.bottom));}
 [el,...el.querySelectorAll('*')].forEach(c=>{const r=c.getBoundingClientRect();if(!r.height)return;const s=getComputedStyle(c);
  if(c.tagName==='IMG'||c.tagName==='svg'||parseFloat(s.borderBottomWidth)>0||(s.backgroundColor!=='rgba(0, 0, 0, 0)'&&c!==el))m=Math.max(m,r.bottom);});return m;}
function frame(pg){const P=pg.getBoundingClientRect(),cs=getComputedStyle(pg);return {P,L:P.left+parseFloat(cs.paddingLeft),R:P.right-parseFloat(cs.paddingRight),lim:P.bottom-parseFloat(cs.paddingBottom)};}
function fit(pg,lim){const bot=()=>Math.max(...[...pg.querySelectorAll('.step,.step *')].map(c=>c.getBoundingClientRect().bottom))-1;
 let lo=30,hi=pg.querySelector('[data-k=strap]')?56:58;   /* 10/22 まーく様「このページの画像だけ異常に大きい」→ ほかのページ（55〜58mm）と同じくらいまでで止める。余りは memo へ */for(let i=0;i<20;i++){const m=(lo+hi)/2;pg.style.setProperty('--ph',m+'mm');if(bot()<=lim)lo=m;else hi=m;}pg.style.setProperty('--ph',lo+'mm');pg.dataset.ph=lo;}
function colSpace(pg){const {L,R,lim}=frame(pg),g=pg.querySelector('.grid2'),G=parseFloat(getComputedStyle(g).columnGap),W=(R-L-G)/2;
 const cols=[{l:L,r:L+W,t:-1e9},{l:L+W+G,r:R,t:-1e9}];
 g.querySelectorAll('.step').forEach(st=>{const r=st.getBoundingClientRect(),v=vis(st)+GAP;if(st.classList.contains('wide')){cols.forEach(c=>c.t=Math.max(c.t,v));return;}cols[r.left<L+W/2?0:1].t=Math.max(cols[r.left<L+W/2?0:1].t,v);});
 cols.forEach(c=>c.b=lim);return cols;}
function place(pg,q){const {P}=frame(pg);const m=document.createElement('div');m.className='memo';
 Object.assign(m.style,{left:(q.l-P.left)+'px',top:(q.t-P.top)+'px',width:(q.r-q.l)+'px',height:(q.b-q.t)+'px'});
 m.innerHTML='<span class="mh"><span class="tapm scr">*</span>memo<small class="scr">※タップすると入力</small></span>';pg.appendChild(m);
 const cs=getComputedStyle(m),inner=m.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-m.querySelector('.mh').offsetHeight;
 const n=Math.floor(inner/(8.5*MM));for(let i=0;i<n;i++){const l=document.createElement('div');l.className='ml';m.appendChild(l);}}
function addMemos(){document.querySelectorAll('.page').forEach(pg=>{if(pg.id==='p1')return;
 const slot=pg.querySelector('.memo-slot');if(slot){const r=slot.getBoundingClientRect(),up=slot.dataset.up&&pg.querySelector(slot.dataset.up);place(pg,{l:r.left,r:r.right,t:up?(up.closest('.ph.band')?up.closest('.ph.band').getBoundingClientRect().bottom+8:up.getBoundingClientRect().top):r.top,b:(slot.dataset.to&&pg.querySelector(slot.dataset.to)?pg.querySelector(slot.dataset.to).getBoundingClientRect().bottom:r.bottom)});return;}
 if(!pg.querySelector('.grid2 .photos'))return;const {L,R,lim}=frame(pg);
 let best=colSpace(pg).sort((a,b)=>(b.b-b.t)-(a.b-a.t))[0];
 // 10/22 まーく様「4-4の下も空いてるのに、なぜmemoを広げないのか」→ 左右の列の下が両方とも 20mm 以上あいていれば、
 //   memo は横いっぱいに（上は、低いほうの列の下にそろえる）。片方だけ空いているときは、その列だけ
 {const cs=colSpace(pg);if(cs.length===2&&cs.every(c=>c.b-c.t>=20*96/25.4)){best={l:cs[0].l,r:cs[1].r,t:Math.max(cs[0].t,cs[1].t),b:cs[0].b};}}
 if(best.b-best.t<MINC){const c=colSpace(pg);best={l:L,r:R,t:Math.max(c[0].t,c[1].t),b:lim};}   /* 10/23 まーく様「ここだけ写真を小さくされるのはデザイン的に酷い」→ memo のために写真を縮めない。あまった所にだけ置く */
 if(best.b-best.t<45)return;
 place(pg,best);});}
// 左右の列を上から詰める工程（.cols）でも、同じ高さから始まる左右の手順は、題の高さをそろえて写真の上の線をそろえる（10/14 ご指摘：5-1と5-2の写真がずれていた）
function alignCols(){document.querySelectorAll('.grid2.cols').forEach(g=>{const cs=[...g.querySelectorAll(':scope>.col')];if(cs.length<2)return;
 const n=Math.max(...cs.map(c=>c.children.length));for(let i=0;i<n;i++){const st=cs.map(c=>c.children[i]).filter(Boolean);if(st.length<2)continue;
  const tops=st.map(x=>x.getBoundingClientRect().top);if(Math.max(...tops)-Math.min(...tops)>1)continue;
  const hs=st.map(x=>x.querySelector(':scope>.sh3'));hs.forEach(h=>h.style.minHeight='');const m=Math.max(...hs.map(h=>h.getBoundingClientRect().height));hs.forEach(h=>h.style.minHeight=m+'px');}});}
// 表紙の題とサブタイトルを、1行のまま横幅ぎりぎりまで大きくする。ただし「〇〇編」の字（42pt）より大きくはしない（10/14 ご指示）
// 2ページの題（左半分の幅）が2行になるときだけ、1行に収まるまで字を小さくする（10/14：「まずは」を足して2行になり、ページからはみ出したため）
function fitP2(){const h=document.querySelector('#p2 .ph h2');if(!h)return;const W=h.getBoundingClientRect().width;h.style.whiteSpace='nowrap';
 let f=parseFloat(getComputedStyle(h).fontSize);const rg=document.createRange();rg.selectNodeContents(h);
 while(rg.getBoundingClientRect().width>W-2&&f>10){f-=.5;h.style.setProperty('font-size',f+'px','important');}}
// 「※」で始まる説明が2行以上になるときは、2行目からを「※」の右（2文字目）にそろえる（10/14 ご指示）
function hangKome(){document.querySelectorAll('.page small,.page .rn,.page p,.page .ns,.page span').forEach(e=>{if(e.closest('.pno,.howto'))return;
 const t=e.textContent.trim();if(!t.startsWith('※'))return;if([...e.children].some(c=>c.textContent.trim().startsWith('※')))return;
 if(getComputedStyle(e).display==='inline')e.style.display='block';
 // 「※」1文字ぶんの幅を実際に測って、その幅だけ2行目から下げる（字によって幅がちがうため）
 const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())&&!n.textContent.includes('※'));if(!n)return;
 const i=n.textContent.indexOf('※'),r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const kw=r.getBoundingClientRect().width;
 e.style.paddingLeft=kw+'px';e.style.textIndent=(-kw)+'px';});}
function fitCover(){const c=document.querySelector('#p1 .cover');if(!c)return;const W=c.getBoundingClientRect().width;
 const ed=parseFloat(getComputedStyle(c.querySelector('.cv-e')).fontSize);
 ['.cv-t','.cv-sd'].forEach(sel=>{const e=c.querySelector(sel);if(!e)return;e.style.whiteSpace='nowrap';e.style.display='inline-block';e.style.maxWidth='none';e.style.width='max-content';
  let lo=8,hi=(sel==='.cv-t'?400:ed);   /* 題はページ幅いっぱい（10/15 ご指示）。副題は〇〇編の大きさまで */
  for(let i=0;i<20;i++){const m=(lo+hi)/2;e.style.setProperty('font-size',m+'px','important');const rg=document.createRange();rg.selectNodeContents(e);if(rg.getBoundingClientRect().width<=W-2)lo=m;else hi=m;}
  e.style.setProperty('font-size',Math.floor(lo*10)/10+'px','important');e.style.display='block';e.style.width='';});}
// 10/22 まーく様「画像と補足の間の変な高さの隙間」：となりの手順の写真の名前が長いと、写真の段がそろって高くなり、
//   こちらの補足が下へ押される。補足を、自分の写真のすぐ下（2.4mm）まで引き上げる
function pullNotes(){document.querySelectorAll('.grid2>.step:not(.wide):not(.side),.grid3>.step').forEach(st=>{const ph=st.querySelector(':scope>.photos'),nt=st.querySelector(':scope>.notes');if(!ph||!nt)return;
 nt.style.marginTop='';let pb=0;ph.querySelectorAll('img,.cap3,.jump').forEach(e=>{const r=e.getBoundingClientRect();if(r.height>0)pb=Math.max(pb,r.bottom)});if(!pb)return;
 const want=2.4*96/25.4,gap=nt.getBoundingClientRect().top-pb;if(gap>want+2){const m=parseFloat(getComputedStyle(nt).marginTop)||0;nt.style.marginTop=(m-(gap-want))+'px';}});}
// 10/23 まーく様「ふり返り・memo・クイズの3つのかたまりに分かれて見えるように。クイズ全体をもっと下げて」
//   → 最後のページで、クイズの下にあまっている高さの半分（最大20mm）を、クイズの上のすき間に足す
function spreadQuiz(){const pg=[...document.querySelectorAll('.page')].pop();const q=pg.querySelector('.qsec,.quiz.qb');if(!q)return;const {lim}=frame(pg);
 const bot=Math.max(...[...pg.querySelectorAll('.quiz *')].map(e=>e.getBoundingClientRect().bottom));const free=lim-bot-2*MM;if(free<=0){stretchMemo(pg,q);return;}
 q.style.setProperty('margin-top',(parseFloat(getComputedStyle(q).marginTop)+Math.min(free/2,20*MM))+'px','important');stretchMemo(pg,q);}
// 10/23 まーく様「memo、下が空いているなら、ふり返ってみようクイズと被らない位置まで伸ばして」→ クイズのかたまりの 6mm 上まで
function stretchMemo(pg,q){const m=pg.querySelector('.memo');if(!m)return;const mr=m.getBoundingClientRect(),qt=q.getBoundingClientRect().top-6*MM;if(qt>mr.bottom)m.style.height=(qt-mr.top)+'px';
 m.querySelectorAll('.ml').forEach(l=>l.remove());const cs=getComputedStyle(m),inner=m.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-m.querySelector('.mh').offsetHeight;for(let i=0;i<Math.floor(inner/(8.5*MM));i++){const l=document.createElement('div');l.className='ml';m.appendChild(l);}}
document.fonts.ready.then(()=>{wideHeads();phraseBreak();alignTags();centerTags();hangKome();fitCover();fitP2();fixOrphans();markRight();alignCols();document.querySelectorAll('.page').forEach(pg=>{if(!pg.querySelector('.grid2 .photos'))return;fit(pg,frame(pg).lim);});pullNotes();addMemos();pullNotes();spreadQuiz();window.__laid=true})</script>'''
CSS += '''
/* 10/21 工程3：3-5 は横いっぱいの1段。左に題と写真、右に大事の箱（memo の場所に入る） */
.page .grid2>.step.wide:has(>.notes){display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto 1fr;column-gap:7mm}
.page .grid2>.step.wide:has(>.notes)>.sh3{grid-column:1;grid-row:1}
.page .grid2>.step.wide:has(>.notes)>.photos{grid-column:1;grid-row:2}
.page .grid2>.step.wide:has(>.notes)>.notes{grid-column:2;grid-row:1/3;margin-top:0!important}
/* 10/21 まーく様「1ページふり返りは全て、スキル編と同じく、画像をタップしたら動画が見られるように」「参考動画は右下ではなく、下側に行数を減らして」 */
.page .mtg .mtc>a.mtv{order:1;display:block;position:relative;line-height:0;background:none!important;padding:0!important;margin:0!important;box-shadow:none!important;border:0!important;border-radius:2mm}
.page .mtg .mtc>a.mtv>img{width:100%!important;height:auto!important;aspect-ratio:1.65!important;object-fit:cover;display:block;border-radius:2mm}
.page .mtg .mtc>a.mtv>.play{position:absolute;right:1.6mm;bottom:1.6mm;width:6mm;height:6mm;border-radius:1mm;background:#fff;border:.3mm solid var(--line);box-sizing:border-box;color:var(--navy);font-size:8pt;line-height:6mm;text-align:center;padding-left:.4mm;box-sizing:border-box}
.page .mtg>.mtfirst{align-self:stretch;display:flex;flex-direction:column;gap:3mm;padding-top:2mm;grid-column:auto/span 1!important}
/* 10/23 まーく様「集約版の、むだな高さの空白」→ 「くわしくは」を一覧のすぐ下に（枠の下に貼りつけない）。左上のマスは、中身を上下まん中に */
.page .mtg .mtc .jump{align-self:flex-end!important;justify-self:end!important;text-align:right!important}   /* 10/23 くわしくは：一番下・右寄せ（3冊・全ページ同じ） */
.page .mtg>.mtfirst{justify-content:center!important}
.page .mtfirst>.mtl{margin:0!important;font-size:9.2pt!important;line-height:1.6}
.page .mtfirst>.mthow{align-self:stretch!important;margin:0!important;display:flex;gap:2mm;align-items:center;grid-column:auto!important}
.page .mtfirst>.mthow b{display:block;font-size:9.4pt;line-height:1.45}
.page .mtfirst>.mthow .rn{display:block;font-size:8.4pt}
.page .mtfirst>p.mtcred{margin:0!important;font-size:7.8pt!important;line-height:1.5!important;color:var(--muted)}   /* 10/21 まーく様「参考動画も、スキル編と同じく、いちばん初めの左上に」 */
'''
CSS = CSS.replace("#p10", f"#p{len(pages)}")   # 10/20「最後に」のページを外したので、そのページ用の決まりは、どこにも当てない（まとめのページに当たらないように）   # 最後のページ（もとは10ページ）の決まりを、いまの最後のページに読みかえる（10/16 まとめのページを足したため）
pages = [re.sub(r"__QPG_([0-9A-Z-]+)__", lambda m: str(pg_of(m.group(1))), x) if x else x for x in pages]   # 10/23 クイズの「くわしくは」のページ番号
open(os.path.join(B, "a4.html"), "w").write(
    f'<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>準備編</title>{FONTS}<style>{CSS}</style></head>'
    f'<body>{_pl.apply(_rb.apply(_lg.apply("".join(pages), _nd.COL["1"][0])), _vid_set)}{_pl.JS}{_pb.JS}{_fs.punct_js()}{FIT}</body></html>')
print("pages", len(pages))
