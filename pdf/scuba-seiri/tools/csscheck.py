# 10/22 CSS のコメント（/* … */）の閉じ忘れを探す。閉じ忘れると、そのあとの決まりが全部効かなくなる（1-5 の形がくずれた原因）
import re, sys
h = open(sys.argv[1], encoding="utf-8").read()
bad = 0
for i, css in enumerate(re.findall(r"<style[^>]*>(.*?)</style>", h, re.S)):
    depth_err = [m.start() for m in re.finditer(r"/\*", css)]
    for st in depth_err:
        end = css.find("*/", st + 2); nxt = css.find("/*", st + 2)
        if end == -1 or (nxt != -1 and nxt < end):
            bad += 1; print("NG CSS のコメントが閉じていない：", css[st:st + 60].replace("\n", " "))
print("NG CSS のコメントの閉じ忘れ" if bad else "CSS のコメント OK")
sys.exit(1 if bad else 0)
