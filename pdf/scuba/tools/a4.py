# A4のPDF（10/7 ご指示「A4にして」。スマホ版の作りを、A4の1ページに収める）
# もとはスマホで読むためのPDF（10/7 ご指示「スマホで見る。各項目は1ページ、多くても2ページ」）
# ・紙の幅を、スマホの画面に近い 110mm にする（A4のまま縮めると、字が小さくて読めないため）
# ・1つの項目（道具・工程1〜6・まとめ）＝1ページ。ページの高さは中身に合わせて伸ばす（縦に読み進める）
# ・どのページも、まったく同じ型：見出し → 手順（番号と題 → 写真 → 補足）の順に、1列で並べる
# 使い方: python3 mobile.py <buildディレクトリ>
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from content import STEPS, TERMS, POINTS, QUIZ
from focus import F as _F, aspect_range as _ar
from fish import head_fish, scene, page_fish

B = sys.argv[1]

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
 -webkit-print-color-adjust:exact;print-color-adjust:exact;word-break:auto-phrase;text-wrap-style:pretty}
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
TAGS = {"3-2": "回りきったら、左に半回転戻す！"}
KEYS = {"1-1": ["cap", "c04"], "2-4": ["c44", "c13", "c14"], "4-2": ["c27"], "5-1": ["c33"], "5-2": ["c35"]}
CAP = {("2-5", "twist"): "手でたどって見る", ("2-5", "strap"): "ストラップ", ("1-1", "cap"): "キャップを外す",
       ("1-1", "c04"): "タンクくるくるを右手で持つ", ("2-4", "c13"): "引く前", ("2-4", "c14"): "引いた後",
       ("2-4", "c44"): "L字サインホースに付ける<small>正式名称：インフレーターホース</small>", ("2-3", "c11"): "赤い丸＝銀色金具ぐるぐる<small>正式名称：ヨークスクリュー</small>", ("2-2", "c10"): "赤い丸＝銀色金具ぐるぐる<small>正式名称：ヨークスクリュー</small>", ("3-2", "c24"): "赤い丸＝タンクくるくる<small>正式名称：タンクバルブ</small>"}

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
               ['<div class="srows two">' + "".join(f'<span class="sp2">{a}</span><span class="sd2">{T(b)}' + (f'<small>{T(c)}</small>' if c else "") + '</span>' for a, b, c in p_.get("rows", [])) + '</div>']
        n("pk", f'<b>{p_["head"].replace("<wbr>", "")}</b>', subs)
    if s.get("steps"):
        p_ = s["steps"]
        # 留める順番は、表の形にする：番号／場所／やること の3列。やることが2行になっても、書き出しの位置はそろう
        n("pk", f'<b>{p_["head"]}</b>', ['<div class="srows">' + "".join(f'<span class="nn2">{a}</span><span class="sp2">{b}</span><span class="sd2">{c}</span>' for a, b, c in p_["rows"]) + '</div>'])
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
        a, b, la, lb, red = keys[0], keys[1:], cap(keys[0]), f"上：{cap(keys[1])}<br>下：{cap(keys[2])}", False
    else:
        if len(keys) == 1: return f'<div class="photos">{fig(keys[0], 4/3, cap(keys[0]), "赤い丸" in (cap(keys[0]) or ""))}</div>'
        cls = " strap2" if "strap" in keys else ""
        return f'<div class="photos{cls}">' + "".join(fig(k, 1.0, cap(k)) for k in keys) + "</div>"
    big = f'<figure class="ph3">{im(a, 1.0)}<span class="cap3">{la}</span></figure>'
    stk = f'<figure class="ph3 stack"><span class="st2">{xm(b[0], red)}{xm(b[1], red)}</span><span class="cap3{" red" if red else ""}">{lb}</span></figure>'
    # 2-4は、やる順番（引く前 → 引いた後 → L字サインホースに付ける）のとおり、左に2枚・右に大きく1枚（10/7 ご指示）
    if s["id"] == "2-4":
        return f'<div class="photos p3 rev">{stk}{big}</div>'
    return f'<div class="photos p3">{big}{stk}</div>'

# 写真の中身が横に長い手順は、横いっぱいの1段にする（ストラップとオクトが切れないように。10/7 ご指摘）
WIDE = set()
def stepbox(s):
    return (f'<section class="step{" wide" if s["id"] in WIDE else ""}"><h3 class="sh3"><span class="sn">{s["id"]}</span><span>{T(s["title"])}</span></h3>'
            f'{photos(s)}{notes(s)}</section>')

pages, TOC = [], []
def page(head_no, head_title, inner, toc=True):
    n = len(pages) + 1
    if toc: TOC.append((head_no, head_title, n))
    # 道具・工程のページは、見出しの右上に、札（補足・大事）の説明を置く（10/8 ご指示：2ページの本文の中ではなく、全ページの右上に）
    lg = '<span class="legend hl"><span class="lx">補足</span>動画にない話<span class="lp">大事</span>とくに大事な話</span>' if (head_no == "道具" or head_no.startswith("工程")) else ""
    h = f'<div class="ph"><span class="no">{head_no}</span>{lg}{page_fish(n)}<h2>{T(head_title)}</h2></div>' if head_no else ""
    # 手順の数が奇数のページは、最後の段の右があくので、魚の群れを泳がせる（見飽きないように。10/7 ご指示）
    # 魚のイラストは、見出しの右上だけに置く（10/7 ご指示：右下の群れはやめた）
    pages.append(f'<div class="page" id="p{n}">{h}{inner}<div class="pno"><span>※ 講習で教わった内容・インストラクターの指示を最優先に</span><span>{n} / __TOTAL__</span></div></div>')

# 1ページ目は表紙＋もくじ（あとで差しこむ）
pages.append(None)

# 道具
RX0, RY0, RX1, RY1 = 195, 62, 1085, 515
MK = [(668, 140), (372, 165), (885, 262), (852, 334), (800, 412)]
# 名札は、器材に重ならない位置（器材の上ではなく、まわりの地面の上）に置き、白い線で器材とつなぐ
LB = [(807, 126, "silver", "銀色金具"), (300, 264, "regu", "レギュ"), (1004, 310, "octo", "オクト"), (972, 393, "kachi", "カチカチホース"), (963, 468, "gauge", "残圧計")]
W_, H_ = RX1 - RX0, RY1 - RY0
lines = "".join(f'<line x1="{x-RX0}" y1="{y-RY0}" x2="{cx-RX0}" y2="{cy-RY0}" stroke="#fff" stroke-width="3"/><rect x="{x-RX0-9}" y="{y-RY0-9}" width="18" height="18" rx="3" fill="none" stroke="#fff" stroke-width="3"/>' for (x, y), (cx, cy, _, _) in zip(MK, LB))
marks = f'<svg viewBox="0 0 {W_} {H_}" preserveAspectRatio="none">{lines}</svg>' + "".join(
    # 写真の上には番号だけを置く（名前の札は器材にかぶるため。名前は右の表で照らし合わせる）
    f'<span class="lb" style="left:{(cx-RX0)/W_*100:.2f}%;top:{(cy-RY0)/H_*100:.2f}%"><span class="nn">{i+1}</span></span>' for i, (cx, cy, k, name) in enumerate(LB))
names = [("{silver}", "{tank}につなぐ", "ファーストステージ"), ("{regu}", "自分が吸う", "セカンドステージ"),
         ("{octo}", "緊急用<span class=\"dsn\">（黄色って緊急っぽいよね）</span>", "オクトパス"), ("{kachi}", "{bc}につなぐ", "中圧ホース"),
         ("{gauge}", "空気の残り", "")]
# 道具の名前の下に、正式名称を小さく添える（10/8 ご指示）。残圧計は、名前そのものが正式名称なので添えない（10/8 ご指摘）
names_html = "".join(f'<div class="nmr"><span class="nn">{i+1}</span><span class="nm">{T(a)}<span class="ds">{T(b)}</span>{f'<small>正式名称：{c}</small>' if c else ''}</span></div>' for i, (a, b, c) in enumerate(names))
page("道具", "“ダイビング機材”じゃ！", f"""
<div class="toprow"><div class="tcol"><a class="ref" href="https://youtu.be/twjEJS_0kms?si=AB5PNzWt31c5r9AB"><span class="play">▶</span><span><b>参考動画「ダイビング機材セッティング」</b><span class="ru">youtu.be/twjEJS_0kms</span><span class="rn scr">※タップすると、YouTubeへ移動するよ</span><span class="cr">OPEN EV（沖縄県教育委員会 教育支援ビデオ）<br>／制作 沖縄県立沖縄水産高等学校</span></span></a></div><div class="memo-slot" data-up=".ph h2"></div></div>
<div class="grid2 tools"><section class="step wide"><h3 class="sh3"><span class="sn">1</span><span>ホースの塊＝レギュレーター</span></h3><div class="regrow">
<div class="reg"><img src="img/reg.jpg" alt="" style="aspect-ratio:890/453">{marks}</div>
<div class="names">{names_html}</div></div></section>
<section class="step"><h3 class="sh3"><span class="sn">2</span><span>SASUKEで覚えよう！</span></h3><div class="sasuke"> <p class="say">さぁ！<span class="fs">ファーストステージ</span>！{T("{silver}")}だ！果たして、{T("{tank}")}に無事付けられるかぁ？！　おぉー！！クリア！！</p>
 <p class="say">続いて！<span class="fs">セカンドステージ</span>！呼吸は無事できるのかぁ？！　あぁーっと！！吸えたぁー！！</p>
 <div class="sum"><p class="rn2">（呼吸する部分だけを「レギュ」と呼ぶこともある）</p>
  <div class="row2"><p><span class="fs">ファーストステージ</span>＝{T("{silver}")}</p><p><b>ホースがつなぐのはこの2点！</b><br>・空気を出すために、{T("{tank}")}と合体！<br>・その空気を使うために、{T("{bc}")}と合体！</p></div>
  <div class="row2"><p><span class="fs">セカンドステージ</span>＝{T("{regu}")}</p><p><b>合体して空気が出せたら、いよいよ吸う！</b></p></div></div></div>
</section>
<section class="step"><h3 class="sh3"><span class="sn">3</span><span>大きな道具</span></h3>
<div class="big">
 <div class="bg">{im("tank", 0.42)}{T("{tank}")}<p>空気のボンベ。</p></div>
 <div class="bg">{im("bc", 1.0)}{T("{bc}")}<p>いわゆる浮き袋。</p><p class="of">正式名称：Buoyancy Control Device（浮力調整装置）<br>ネイティブに発音できたらカッコイイかも</p></div>
 <div class="bg">{im("belt", 0.45)}{T("{belt}")}<p>体を沈めるベルト。<br><span class="nw">何kg必要かは、</span>インストラクターに聞こう！</p><p class="of">正式名称：ウェイトベルト</p></div>
</div></section></div>""")

# 工程4は、4-2の「大事」が長く、4-1の下に大きな空きができる。そのままでは memo がページのまん中に来てしまい、
# 写真を小さくして下をあけると、残圧計やBCDが切れてしまう（10/8 ご指摘・試した結果）。
# そこで工程4だけは、左右の列をそれぞれ上から詰める。4-3が4-1のすぐ下に上がり、左の列の下に memo の場所ができる
COLS = {"4"}
# 工程1〜6：1工程＝1ページ
for sec in STEPS:
    # 手順は2列に並べる（A4の1ページに収めるため）。同じ行の手順は、枠の高さをそろえる
    # 手順が多くて文が長い工程（工程2）だけ、2ページに分ける（1項目は多くても2ページ）
    subs = sec["subs"]
    groups = [subs[:3], subs[3:]] if sec["id"] == "2" else [subs]
    for gi, g in enumerate(groups):
        t = sec["title"] if len(groups) == 1 else (sec["title"] if gi == 0 else sec.get("title2", sec["title"])) + f'<span class="half">{"前半" if gi == 0 else "後半"}</span>'
        if sec["id"] in COLS:
            # 左の列・右の列を、それぞれ上から順に詰める（左＝1つ目・3つ目、右＝2つ目・4つ目）
            body = '<div class="grid2 cols"><div class="col">' + "".join(stepbox(x) for x in g[0::2]) + '</div><div class="col">' + "".join(stepbox(x) for x in g[1::2]) + "</div></div>"
        else:
            body = '<div class="grid2">' + "".join(stepbox(x) for x in g) + "</div>"
        page(f"工程{sec['id']}", t, body, toc=True)  # 前半・後半とも、もくじに出す（10/7 ご指摘：後半が抜けていた）

# まとめ
pts = "".join(f'<p class="pth">{h}</p>' + "".join(f"<p>・{T(l)}</p>" for l in ls) for h, ls in POINTS)
quiz = "".join(f'<span class="qh">{h}</span>' + "".join(f'<div class="qz"><span class="q">{T(q)}</span><span class="a"><span class="ans">{T(a)}</span></span></div>' for q, a in qs) for h, qs in QUIZ)
# 写真の出どころの文は、ページの下から、まとめの文の下（左半分）へ移す。ページの下があいたぶん、右上の memo が大きくなる（10/8 ご指示）
page("最後に", "ふり返り", f"""<div class="toprow"><div class="tcol"><div class="pts">{pts}</div><p class="src">写真：参考動画「ダイビング機材セッティング」（OPEN EV／制作　沖縄県立沖縄水産高等学校／著作　沖縄県教育委員会）の画面から。<a href="https://youtu.be/twjEJS_0kms?si=AB5PNzWt31c5r9AB">https://youtu.be/twjEJS_0kms</a></p><h3 class="ph2">ふり返ってみようクイズ！<small class="scr">□をタップすると、答えが出るよ<span class="nw">（もう一度タップすると消えるよ）</span></small></h3></div><div class="memo-slot" data-up=".ph h2"></div></div>
<div class="quiz">{quiz}</div>""")

toc_rows = "".join(f'<a class="tc" href="#p{pn}"><span class="tl">{lb}</span><span class="tt">{T(tt)}</span><span class="tp">{pn}<small>ページ</small></span></a>' for lb, tt, pn in TOC)
pages[0] = f"""<div class="page" id="p1"><div class="cover"><p class="cv-k">スキューバダイビング はじめての器材{page_fish(1)}</p><h1 class="cv-t">専門用語が<br>なんぼのもんじゃい！</h1><p class="cv-s">生きるために必要なのは、まずコレじゃあ！</p><div class="cv-f"><span class="cv-e">機材準備編</span></div></div>
<h2 class="toch">もくじ<span class="tocn scr">見たいところをタップすると、そのページへ移動するよ</span></h2><div class="toc">{toc_rows}</div>
<div class="howto scr"><p class="hh">このPDFの使い方</p><div class="hrows"><span class="hp">2ページ</span><span>青い字のリンクをタップすると、YouTubeへ移動するよ</span><span class="hp">2〜10ページ</span><span>memo は、タップすると字が書けるよ</span><span class="hp">10ページ</span><span>クイズの□をタップすると、答えが出るよ（もう一度タップすると消えるよ）</span></div><p class="hw">YouTubeのリンク、memo、クイズの□<br>どれかをタップしてる時は、ほかの操作ができない時もあるから<br>もういいよ！ってなったら右上の「✔︎」をタップすると元に戻るよ</p></div>
<div class="pno"><span>※ 講習で教わった内容・インストラクターの指示を最優先に</span><span>1 / __TOTAL__</span></div></div>"""
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
.quiz{display:grid!important;grid-template-columns:1fr 1fr;column-gap:7mm;row-gap:0!important}
.quiz .qh{grid-column:1/-1;justify-self:start;margin-top:2mm}
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
/* 「機材準備編」は表紙でいちばん大きく（ほかの編と見分けるため） */
.cover .cv-e{font-size:42pt!important;line-height:1.35!important;padding:1mm 5mm!important;letter-spacing:.12em}
/* by まーく は「機材準備編」のすぐ下に */
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
.nx,.ns,.ns small,.sd2,.sd2 small,.pts p,.say,.q,.ds{text-wrap-style:balance!important}
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
.notes .nt{display:block!important;text-wrap-style:balance}
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
/* 表紙：「生きるために…」と「機材準備編」のあいだの横線は引かない（10/8 ご指示） */
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
#p2 .tools .bg>img{height:26mm!important}
#p2 .grid2.tools{flex:none!important}
#p2 .toprow{flex:1}
/* 参考動画の枠は、凡例の下から memo の下はしまで伸ばし、中身はまん中に置く（あいだに半端なすき間を作らない） */
#p2 .tcol .ref{flex:1}
/* ふり返り：ページの下のあまりを、右上の memo に回す（下に半端な空きを残さない） */
#p10 .toprow{flex:1}
/* 出どころの文は、左の列の下はし（memo の下はしと同じ高さ）に置く */
/* ふり返り：クイズの見出しを左の列のいちばん下（クイズのすぐ上）に入れ、見出しの1段ぶんを右上の memo に回す（10/8 ご指示「もっと大きく」）
   出どころの文は、まとめの文のすぐ下に置く */
#p10 .tcol .ph2{margin-top:auto}
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
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=swap">'
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
 let lo=30,hi=pg.querySelector('[data-k=strap]')?56:95;for(let i=0;i<20;i++){const m=(lo+hi)/2;pg.style.setProperty('--ph',m+'mm');if(bot()<=lim)lo=m;else hi=m;}pg.style.setProperty('--ph',lo+'mm');pg.dataset.ph=lo;}
function colSpace(pg){const {L,R,lim}=frame(pg),g=pg.querySelector('.grid2'),G=parseFloat(getComputedStyle(g).columnGap),W=(R-L-G)/2;
 const cols=[{l:L,r:L+W,t:-1e9},{l:L+W+G,r:R,t:-1e9}];
 g.querySelectorAll('.step').forEach(st=>{const r=st.getBoundingClientRect(),v=vis(st)+GAP;if(st.classList.contains('wide')){cols.forEach(c=>c.t=Math.max(c.t,v));return;}cols[r.left<L+W/2?0:1].t=Math.max(cols[r.left<L+W/2?0:1].t,v);});
 cols.forEach(c=>c.b=lim);return cols;}
function place(pg,q){const {P}=frame(pg);const m=document.createElement('div');m.className='memo';
 Object.assign(m.style,{left:(q.l-P.left)+'px',top:(q.t-P.top)+'px',width:(q.r-q.l)+'px',height:(q.b-q.t)+'px'});
 m.innerHTML='<span class="mh">memo<small class="scr">※タップすると入力</small></span>';pg.appendChild(m);
 const cs=getComputedStyle(m),inner=m.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-m.querySelector('.mh').offsetHeight;
 const n=Math.floor(inner/(8.5*MM));for(let i=0;i<n;i++){const l=document.createElement('div');l.className='ml';m.appendChild(l);}}
function addMemos(){document.querySelectorAll('.page').forEach(pg=>{if(pg.id==='p1')return;
 const slot=pg.querySelector('.memo-slot');if(slot){const r=slot.getBoundingClientRect(),up=slot.dataset.up&&pg.querySelector(slot.dataset.up);place(pg,{l:r.left,r:r.right,t:up?up.getBoundingClientRect().top:r.top,b:r.bottom});return;}
 if(!pg.querySelector('.grid2 .photos'))return;const {L,R,lim}=frame(pg);
 let best=colSpace(pg).sort((a,b)=>(b.b-b.t)-(a.b-a.t))[0];
 if(best.b-best.t<MINC){fit(pg,lim-RES);const c=colSpace(pg);best={l:L,r:R,t:Math.max(c[0].t,c[1].t),b:lim};}
 place(pg,best);});}
document.fonts.ready.then(()=>{fixOrphans();markRight();document.querySelectorAll('.page').forEach(pg=>{if(!pg.querySelector('.grid2 .photos'))return;fit(pg,frame(pg).lim);});addMemos();window.__laid=true})</script>'''
open(os.path.join(B, "a4.html"), "w").write(
    f'<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>機材準備編</title>{FONTS}<style>{CSS}</style></head>'
    f'<body>{"".join(pages)}{FIT}</body></html>')
print("pages", len(pages))
