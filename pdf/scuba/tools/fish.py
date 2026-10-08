# 海の魚のイラスト（全部同じ描き方：紺の線 1.6・角は丸く・パステルの色・白い目に紺のひとみ）
# 種類：クマノミ／ナンヨウハギ／チョウチョウウオ／フグ／カクレクマノミの子ども（小）
NAVY = "#16466b"
def _wrap(body, w, h, flip):
    t = f' transform="translate({w} 0) scale(-1 1)"' if flip else ""
    return (f'<svg class="fish" viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true">'
            f'<g fill="none" stroke="{NAVY}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"{t}>{body}</g></svg>')
def eye(x, y):
    return f'<circle cx="{x}" cy="{y}" r="3.2" fill="#fff"/><circle cx="{x+.8}" cy="{y}" r="1.4" fill="{NAVY}" stroke="none"/>'
def clown(flip=False):   # クマノミ：オレンジに白い帯
    b = ('<path d="M14 22 L3 13 L5 22 L3 31 Z" fill="#ffb38a"/>'
         '<path d="M12 22 C16 9 34 6 46 12 C53 15 56 19 57 22 C56 25 53 29 46 32 C34 38 16 35 12 22 Z" fill="#ffb38a"/>'
         '<path d="M25 9.5 C22 16 22 28 25 34.5" stroke="#fff" stroke-width="4"/><path d="M40 9 C37 16 37 28 40 35" stroke="#fff" stroke-width="4"/>'
         '<path d="M12 22 C16 9 34 6 46 12 C53 15 56 19 57 22 C56 25 53 29 46 32 C34 38 16 35 12 22 Z"/>'
         '<path d="M28 9 C31 4 37 4 40 8" fill="#ffb38a"/>' + eye(49, 19))
    return _wrap(b, 60, 44, flip)
def tang(flip=False):    # ナンヨウハギ：水色に紺の模様、黄色い尾
    b = ('<path d="M12 22 L2 12 L4 22 L2 32 Z" fill="#ffe08a"/>'
         '<path d="M11 22 C14 7 36 4 48 12 C54 16 57 19 57 22 C57 25 54 28 48 32 C36 40 14 37 11 22 Z" fill="#a9d8ef"/>'
         '<path d="M20 15 C28 11 38 13 44 18 C36 17 28 19 24 26" stroke-width="2.2"/>' + eye(49, 19))
    return _wrap(b, 60, 44, flip)
def butterfly(flip=False):  # チョウチョウウオ：黄色、ひし形の体
    b = ('<path d="M14 24 L5 17 L6 24 L5 31 Z" fill="#ffe08a"/>'
         '<path d="M14 24 C18 6 36 2 44 12 C50 18 55 22 56 24 C55 26 50 30 44 36 C36 46 18 42 14 24 Z" fill="#ffe08a"/>'
         '<path d="M38 7 C35 16 35 32 38 41" stroke="#fff" stroke-width="3"/>'
         '<path d="M14 24 C18 6 36 2 44 12 C50 18 55 22 56 24 C55 26 50 30 44 36 C36 46 18 42 14 24 Z"/>'
         '<circle cx="24" cy="18" r="2.6" fill="' + NAVY + '" stroke="none"/>' + eye(47, 21))
    return _wrap(b, 60, 48, flip)
def puffer(flip=False):  # フグ：まるい体に点々
    b = ('<path d="M12 22 L4 15 L5 22 L4 29 Z" fill="#c5e8b0"/>'
         '<circle cx="30" cy="22" r="17" fill="#c5e8b0"/>'
         '<path d="M30 39 C22 39 16 35 14 30 C22 33 38 33 46 30 C44 35 38 39 30 39 Z" fill="#fff" stroke="none"/>'
         '<circle cx="30" cy="22" r="17"/>'
         '<g fill="' + NAVY + '" stroke="none"><circle cx="22" cy="14" r="1.2"/><circle cx="28" cy="10" r="1.2"/><circle cx="20" cy="22" r="1.2"/><circle cx="27" cy="17" r="1.2"/></g>'
         + eye(38, 18) + '<path d="M45 26 C47 26 48 27 48 28"/>')
    return _wrap(b, 52, 44, flip)
def bubbles():
    return ('<svg class="fish" viewBox="0 0 16 30" width="16" height="30" aria-hidden="true"><g fill="#fff" stroke="' + NAVY + '" stroke-width="1.3">'
            '<circle cx="8" cy="24" r="4.5"/><circle cx="4" cy="12" r="3"/><circle cx="10" cy="4" r="2.2"/></g></svg>')
KINDS = [clown, tang, butterfly, puffer]
def head_fish(i):
    """見出しの線の右はしに泳ぐ1匹（ページごとに種類を変える）"""
    return f'<span class="hfish">{bubbles()}{KINDS[i % 4](flip=True)}</span>'
def scene(i):
    """手順が奇数のページの空いた枠に置く、3匹の小さな群れ"""
    a, b, c = KINDS[i % 4], KINDS[(i + 1) % 4], KINDS[(i + 2) % 4]
    return (f'<div class="fscene" aria-hidden="true"><span class="f1">{a()}</span><span class="f2">{bubbles()}</span>'
            f'<span class="f3">{b(flip=True)}</span><span class="f4">{c()}</span></div>')

# ── 10ページで全部ちがう魚にする（10/7 ご指示：映画「ファインディング・ニモ」に出てくる種類から）──
# どれも同じ描き方（紺の線1.6・パステル・白い目に紺のひとみ）。体の大きさも viewBox 60×44 前後にそろえる
def W(b, flip=False, w=60, h=44): return _wrap(b, w, h, flip)
def moorish_idol(flip=False):   # ツノダシ：白と黒の縦じま、長い背びれ
    b = ('<path d="M14 26 L5 20 L6 26 L5 32 Z" fill="#ffe08a"/>'
         '<path d="M30 12 C28 6 26 2 20 1" />'
         '<path d="M14 26 C18 12 30 10 40 14 C48 18 54 23 55 26 C54 29 48 34 40 38 C30 42 18 40 14 26 Z" fill="#fff"/>'
         '<path d="M27 12 C24 20 24 32 27 40" stroke="#16466b" stroke-width="5"/><path d="M42 15 C40 21 40 31 42 37" stroke="#16466b" stroke-width="4"/>'
         '<path d="M33 12 C31 20 31 32 33 40" stroke="#ffe08a" stroke-width="4"/>'
         '<path d="M14 26 C18 12 30 10 40 14 C48 18 54 23 55 26 C54 29 48 34 40 38 C30 42 18 40 14 26 Z"/>' + eye(48, 24))
    return W(b, flip)
def yellow_tang(flip=False):    # キイロハギ：まっ黄色
    b = ('<path d="M12 22 L3 13 L5 22 L3 31 Z" fill="#ffe08a"/>'
         '<path d="M12 22 C14 6 32 2 44 10 C52 15 56 20 56 22 C56 24 52 29 44 34 C32 42 14 38 12 22 Z" fill="#ffe08a"/>'
         '<path d="M47 23 L53 24"/>' + eye(46, 18))
    return W(b, flip)
def royal_gramma(flip=False):   # ロイヤルグラマ：前がむらさき、後ろが黄色
    b = ('<path d="M12 22 L4 15 L5 22 L4 29 Z" fill="#ffe08a"/>'
         '<path d="M12 22 C14 12 26 9 38 10 C48 11 55 17 56 22 C55 27 48 33 38 34 C26 35 14 32 12 22 Z" fill="#ffe08a"/>'
         '<path d="M32 10 C48 10 55 17 56 22 C55 27 48 33 32 34 Z" fill="#d8c4f0" stroke="none"/>'
         '<path d="M12 22 C14 12 26 9 38 10 C48 11 55 17 56 22 C55 27 48 33 38 34 C26 35 14 32 12 22 Z"/>' + eye(48, 19))
    return W(b, flip)
def damsel(flip=False):         # ヨスジリュウキュウスズメダイ：白に黒い縦じま
    b = ('<path d="M13 22 L4 14 L5 22 L4 30 Z" fill="#fff"/>'
         '<path d="M13 22 C15 9 30 5 42 9 C51 13 56 19 56 22 C56 25 51 31 42 35 C30 39 15 35 13 22 Z" fill="#fff"/>'
         '<g stroke="#16466b" stroke-width="3"><path d="M23 9 C21 16 21 28 23 35"/><path d="M33 7 C31 15 31 29 33 37"/><path d="M43 9 C41 16 41 28 43 35"/></g>'
         '<path d="M13 22 C15 9 30 5 42 9 C51 13 56 19 56 22 C56 25 51 31 42 35 C30 39 15 35 13 22 Z"/>' + eye(49, 19))
    return W(b, flip)
def seahorse(flip=False):       # タツノオトシゴ
    b = ('<path d="M30 6 C38 4 44 9 42 15 L50 16 L42 19 C42 24 38 27 36 30 C40 34 40 40 34 41 C28 42 26 37 30 35 C24 34 22 28 24 22 C26 16 24 11 30 6 Z" fill="#ffd0b5"/>'
         '<path d="M24 22 C20 21 18 18 20 15" fill="#ffd0b5"/>' + eye(35, 11))
    return W(b, flip, 60, 46)
def shark(flip=False):          # サメ（ホホジロザメ）：大きな背びれ
    b = ('<path d="M10 22 L2 10 L5 22 L2 32 Z" fill="#c5ced6"/>'
         '<path d="M30 12 L34 1 L40 12" fill="#c5ced6"/>'
         '<path d="M8 22 C16 12 34 10 48 14 C54 16 58 19 58 22 C58 25 54 29 46 31 C32 34 16 32 8 22 Z" fill="#c5ced6"/>'
         '<path d="M14 24 C26 31 42 31 56 24 C54 28 50 30 46 31 C32 34 18 31 14 24 Z" fill="#fff" stroke="none"/>'
         '<path d="M8 22 C16 12 34 10 48 14 C54 16 58 19 58 22 C58 25 54 29 46 31 C32 34 16 32 8 22 Z"/>'
         '<path d="M44 26 C48 28 52 28 55 26"/>' + eye(48, 19))
    return W(b, flip)
TEN = [clown, tang, moorish_idol, yellow_tang, royal_gramma, puffer, damsel, butterfly, seahorse, shark]
def page_fish(n):
    """n ページ目（1〜10）の見出しの右上に置く魚。10ページとも全部ちがう種類"""
    return f'<span class="hfish">{bubbles()}{TEN[(n - 1) % len(TEN)](flip=True)}</span>'
