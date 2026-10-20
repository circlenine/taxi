# もくじに、全部のページ（表紙をのぞく）が載っているか。見出しとも同じか
import re, sys
h = open(sys.argv[1]).read()
h = re.sub(r'<rt>.*?</rt>', '', h)   # 10/20 ルビ（ふりがな）は、点検では数えない
ids = re.findall(r'<div class="page" id="p(\d+)">', h)
toc = re.findall(r'<a class="tc" href="#p(\d+)">', h)
miss = [p for p in ids[1:] if p not in toc]
# タップの印「*」（画面だけの印）は、見出しとくらべるときは数えない
strip = lambda x: re.sub(r'<[^>]+>', '', re.sub(r'<span class="tapm[^"]*">\*</span>', '', x)).strip()
bad = [f"NG もくじに載っていないページ：{p}ページ" for p in miss]
for pn, tt in re.findall(r'<a class="tc" href="#p(\d+)"><span class="tl">[^<]*</span><span class="tt">(.*?)</span><span class="tp">', h):
    # 10/19 題の帯（スキル編）：<div class="ph band"> の中の h2 を見る
    m = re.search(rf'<div class="page" id="p{pn}">(?:<span class="edtag">.*?</span>)?<div class="ph band">.*?<h2>(.*?)</h2>', h) or re.search(rf'<div class="page" id="p{pn}">(?:<span class="edtag">.*?</span>)?<div class="ph"><span class="no">[^<]*</span>(?:<span class="legend hl">.*?とくに大事な話</span>)?(?:<span class="hfish">.*?</svg></span>)?<h2>(.*?)</h2>', h)
    if strip(tt) == 'その他・クイズ': continue  # もくじだけの名前（10/8 ご指示）。ページの見出しは「ふり返り」
    # 10/20 もくじでは、題の終わりの「だよ」を外す（まーく様）。見出しの「だよ」を外してからくらべる
    _hd = re.sub(r'だよ(?=\s*(<span class="half|$))', '', m.group(1).strip()) if m else ''
    if not m or strip(_hd) != strip(tt) or 'だよ' in strip(tt): bad.append(f"NG もくじと見出しがちがう：{pn}ページ")
print("\n".join(bad) if bad else f"もくじ OK（{len(toc)}ページぶん、見出しと同じ）")
sys.exit(1 if bad else 0)
