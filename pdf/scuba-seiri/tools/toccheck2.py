# もくじに、全部のページ（表紙をのぞく）が載っているか。見出しとも同じか
import re, sys
h = open(sys.argv[1]).read()
h = re.sub(r'<rt>.*?</rt>|<span class="rt">[^<]*</span>', '', h)   # 10/20 ルビ（ふりがな）は、点検では数えない
ids = re.findall(r'<div class="page" id="p(\d+)">', h)
toc = re.findall(r'<a class="tc" href="#p(\d+)">', h)
# 10/22 スキル編：1スキル＝1ページにしたので、もくじは「海洋1〜4」の行にまとめた（行のページは「5〜7」の形）。
#   まとめた行は、その範囲のページを全部載せたとみなす。かわりに、行の中のスキルの名前が、範囲の各ページの見出しに順に出ているかを調べる
grp = re.findall(r'<a class="tc" href="#p(\d+)"><span class="tl">(海洋\d)</span><span class="tt">(.*?)</span><span class="tp">(\d+)〜(\d+)<small>', h)
for a, _lb, _tt, a2, b2 in grp:
    toc += [str(n) for n in range(int(a2), int(b2) + 1)]
miss = [p for p in ids[1:] if p not in toc]
# タップの印「*」（画面だけの印）は、見出しとくらべるときは数えない
strip = lambda x: re.sub(r'<[^>]+>', '', re.sub(r'<span class="tapm[^"]*">\*</span>', '', x)).strip()
bad = [f"NG もくじに載っていないページ：{p}ページ" for p in miss]
def _h2(pn):
    m = re.search(rf'<div class="page" id="p{pn}">.*?<h2>(.*?)</h2>', h)
    return re.sub(r'<[^>]+>', '', m.group(1)) if m else ''
for a, lb, tt, a2, b2 in grp:
    names = [re.sub(r'<[^>]+>', '', x).strip() for x in tt.split("・")]
    pgs = list(range(int(a2), int(b2) + 1))
    if len(names) != len(pgs): bad.append(f"NG もくじ {lb}：スキルの数（{len(names)}）とページの数（{len(pgs)}）がちがう"); continue
    for nm, pn in zip(names, pgs):
        if nm not in _h2(pn): bad.append(f"NG もくじ {lb}：「{nm}」が {pn}ページの見出しに無い")
for pn, tl, tt in re.findall(r'<a class="tc" href="#p(\d+)"><span class="tl">([^<]*)</span><span class="tt">(.*?)</span><span class="tp">', h):
    if re.fullmatch(r"海洋\d", tl): continue   # まとめた行は、上で調べた
    # 10/19 題の帯（スキル編）：<div class="ph band"> の中の h2 を見る
    m = re.search(rf'<div class="page" id="p{pn}">(?:<span class="edtag">.*?</span>)?<div class="ph band">.*?<h2>(.*?)</h2>', h) or re.search(rf'<div class="page" id="p{pn}">(?:<span class="edtag">.*?</span>)?<div class="ph"><span class="no">[^<]*</span>(?:<span class="legend hl">.*?必ず守ること</span>)?(?:<span class="hfish">.*?</svg></span>)?<h2>(.*?)</h2>', h)
    if strip(tt) == 'その他・クイズ': continue  # もくじだけの名前（10/8 ご指示）。ページの見出しは「ふり返り」
    # 10/20 もくじでは、題の終わりの「だよ」を外す（まーく様）。見出しの「だよ」を外してからくらべる
    _hd = re.sub(r'だよ(?=\s*(<span class="half|$))', '', m.group(1).strip()) if m else ''
    if not m or strip(_hd) != strip(tt) or 'だよ' in strip(tt): bad.append(f"NG もくじと見出しがちがう：{pn}ページ")
print("\n".join(bad) if bad else f"もくじ OK（{len(toc)}ページぶん、見出しと同じ）")
sys.exit(1 if bad else 0)
