# もくじに、全部のページ（表紙をのぞく）が載っているか。見出しとも同じか
import re, sys
h = open(sys.argv[1]).read()
ids = re.findall(r'<div class="page" id="p(\d+)">', h)
toc = re.findall(r'<a class="tc" href="#p(\d+)">', h)
miss = [p for p in ids[1:] if p not in toc]
# タップの印「*」（画面だけの印）は、見出しとくらべるときは数えない
strip = lambda x: re.sub(r'<[^>]+>', '', re.sub(r'<span class="tapm[^"]*">\*</span>', '', x)).strip()
bad = [f"NG もくじに載っていないページ：{p}ページ" for p in miss]
for pn, tt in re.findall(r'<a class="tc" href="#p(\d+)"><span class="tl">[^<]*</span><span class="tt">(.*?)</span><span class="tp">', h):
    m = re.search(rf'<div class="page" id="p{pn}"><div class="ph"><span class="no">[^<]*</span>(?:<span class="legend hl">.*?とくに大事な話</span>)?(?:<span class="hfish">.*?</svg></span>)?<h2>(.*?)</h2>', h)
    if not m or strip(m.group(1)) != strip(tt): bad.append(f"NG もくじと見出しがちがう：{pn}ページ")
print("\n".join(bad) if bad else f"もくじ OK（{len(toc)}ページぶん、見出しと同じ）")
sys.exit(1 if bad else 0)
