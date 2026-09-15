#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gas/parts/WebApp.gs と gas/parts/webapp.html を1つに束ねて
gas/004-WebApp.gs を作る。

Apps Script では HTML を別ファイルに置くこともできるが、
スマホから貼り替える運用なので「貼るのは1ファイル」にそろえたい。
なので HTML はバッククォートの文字列として .gs の中に入れる。
"""
import pathlib, re, sys, datetime

VERSION = "W007ver"
DATE = "2026/09/06"
CHANGELOG = """ *  [W007ver] 乗り場をタップすると Googleマップ が開くようにした
 *   ・記録カードの乗り場名と、乗り場ランキングの名前がリンクになる
 *   ・行き先の表は 002-Extras.gs（MapLink）のもの。入っていなければただの文字のまま
 *   ・1件ずつURLを持たせるとページが重くなるので、出てくる乗り場の種類ぶんだけ渡す
 *  [W006ver] LINEへの送信を「まず自分だけ」→「グループ」の2段階にした
 *   ・メニューからは、送る前に必ず聞く（自分だけ／グループ／やめる）
 *   ・そうさタブからは、1回目は自分だけ。3分以内にもう1回でグループへ
 *   ・グループに送るのは取り消せないので、一発で飛ばないようにする
 *  [W005ver] ダイアログが出ない環境でも使えるようにした
 *   ・URLと診断結果を「説明」タブの Z3・Z4 に書き出す（あとから何度でも見られる）
 *   ・トーストでも出す（ダイアログより出やすい）
 *   ・メニューから直接 LINE に送れるようにした（写し間違えようがない）
 *  [W004ver] URLの画面で「本当に開けるか」を実際に叩いて確かめるようにした
 *   ・公開中のURLをログインなしで取りにいき、うちのページが返るか見る
 *   ・返らないときは、理由（doGetが無い／ログインを求められる／デプロイが無い）と直し方を出す
 *  [W003ver] URLの出し方を直した
 *   ・リンクとして押せる／コピーボタンつきの画面にした（前は文字だけで触れなかった）
 *   ・「このURLをグループLINEに送る」ボタンを付けた。トーク上ではリンクになる
 *  [W002ver] 鍵をかけられるようにした（設定タブの「ページを見られるメール」「ページの合言葉」）
 *   ・合言葉は一度入れれば、その端末では次から聞かない
 *   ・鍵がかかっているあいだは、記録を1件もページに渡さない
 *  [W001ver] みんなの記録ページ（ウェブアプリ）の最初の版
 *   ・📊 立ち回り … 時間帯別／曜日区分別の平均、乗り場ランキング、ロングマップ
 *   ・📋 記録     … 日別のカード表示（オプチャも色分けして混ぜる）
 *   ・🏆 ランキング … 期間の個人別 売上・件数・平均・ロング率・出勤日数"""

ROOT = pathlib.Path(__file__).resolve().parent.parent
GS   = (ROOT / "gas" / "parts" / "WebApp.gs").read_text(encoding="utf-8")
HTML = (ROOT / "gas" / "parts" / "webapp.html").read_text(encoding="utf-8")

# バッククォート文字列に入れるので、壊す文字だけ逃がす
if "`" in HTML:
    sys.exit("HTMLにバッククォートがあります。使わないでください。")
if "${" in HTML:
    sys.exit("HTMLに ${ があります。テンプレート文字列と衝突するので使わないでください。")
HTML = HTML.replace("\\", "\\\\")

head = f'''/**
 * ================================================================
 *  みんなの記録ページ（004-WebApp.gs）
 *
 *  ★★★  {VERSION}  （{DATE}）  ★★★
 *
 *  ファイル記号: C=001-Code.gs / E=002-Extras.gs / L=003-LineReport.gs / W=004-WebApp.gs
 *  直したら数字を1つ増やし、下の履歴に何を直したか書く。
 *
{CHANGELOG}
 *
 *  ※このファイルは tools/build_webapp.py が作ります。直すのは
 *    gas/parts/WebApp.gs と gas/parts/webapp.html のほうです。
 * ================================================================
 */

const WB_VERSION = "{VERSION}";

'''

# 元の説明コメント（先頭のブロック）は上の head と重なるので落とす
body = re.sub(r"^/\*\*.*?\*/\s*", "", GS, count=1, flags=re.S)

out = head + body + "\n\n/* ============ ページ本体 ============ */\n\nconst WB_HTML = `" + HTML + "`;\n"

(ROOT / "gas" / "004-WebApp.gs").write_text(out, encoding="utf-8")

# 同じ名前を二重に宣言していないか（GASは全ファイルが同じ場所にいるため）
names = set()
dup = []
for m in re.finditer(r"^(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)", body, flags=re.M):
    n = m.group(1)
    if n in names:
        dup.append(n)
    names.add(n)
print(f"004-WebApp.gs を作成 ({VERSION}) : {out.count(chr(10))+1}行 / "
      f"トップレベル宣言 {len(names)}個 / " + ("重複: " + ",".join(dup) if dup else "重複なし"))
