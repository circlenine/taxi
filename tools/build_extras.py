#!/usr/bin/env python3
"""
Strategy.gs / Opucha.gs / ChartFit.gs を Extras.gs に束ねる。
バージョンと履歴はここで管理する（束ね直しても消えないように）。

  python3 tools/build_extras.py
"""
import pathlib, re, sys

VERSION = "E005ver"
DATE = "2026/09/06"
CHANGELOG = """ *  [E005ver] 乗り場 → Googleマップ（MapLink）を、このファイルに同梱した
 *   ・G列の乗り場をタップすると Googleマップ が開く
 *   ・001-Code.gs の整形が終わるたびに、自動で貼り直す
 *   ・行き先が違うものは メニュー「🗺 マップの行き先を確認する」で一覧できる
 *  [E004ver] ファイル名を 002-Extras.gs にした（中身の動きは変えていない）
 *  [E003ver] 金額の区分（ショート・ロングの境目）を「設定」タブから変えられるようにした
 *  [E002ver] ファイル記号を K → C に変更（Code.gs に合わせた）
 *
 *  [E001ver] 3つの追加機能をまとめた最初の版
 *   ・🎯 立ち回り分析（曜日区分×時間帯×乗り場、待ち時間あたりの効率）
 *   ・🏷 オプチャ印（検索してチェックで指定。印は設定に保存され整形で消えない）
 *   ・📐 グラフの大きさをZ列に合わせる
 *   ・金額区分は ショート≦￥4,999 / ミドル〜￥9,999 / ロング≧￥10,000"""

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = [("Strategy.gs", "立ち回り分析"), ("Opucha.gs", "オプチャ印"),
       ("ChartFit.gs", "グラフの大きさ"), ("MapLink.gs", "乗り場→Googleマップ")]

head = f'''/**
 * ================================================================
 *  追加機能 まとめ（Extras.gs）
 *
 *  ★★★  {VERSION}  （{DATE}）  ★★★
 *
 *  ファイル記号: C=001-Code.gs / L=003-LineReport.gs / E=002-Extras.gs
 *  直したら数字を1つ増やし、下の履歴に何を直したか書く。
 *  いま動いているバージョンは メニュー「ℹ️ バージョンを確認」で見られる。
 *
{CHANGELOG}
 *
 *  ★このファイル1つで、下の3つが入ります。
 *    ・Strategy … 🎯 立ち回り分析
 *    ・Opucha   … 🏷 オプチャ印を検索して付ける／外す
 *    ・ChartFit … 📐 まとめスプシのグラフをZ列の幅に揃える
 *    ・MapLink  … 🗺 G列の乗り場をタップで Googleマップ
 *
 *  ★記録用スプシの Apps Script に「新しいファイル」として追加してください。
 *    コード.gs は触りません。LineReport.gs とも名前は衝突しません。
 *
 *  ★メニューは LineReport.gs の onOpenReport が自動で拾って並べます。
 * ================================================================
 */

/** このファイルのバージョン */
const EX_VERSION = "{VERSION}";
'''

parts = [head]
for f, title in SRC:
    t = (ROOT / "gas" / "parts" / f).read_text()
    parts.append(f"\n\n/* ##############################################################\n"
                 f"   {title}（元 {f}）\n"
                 f"   ############################################################## */\n\n{t}")
out = "".join(parts)

# 同じ名前を2回宣言すると Apps Script はプロジェクト全体を止めるので、必ず調べる
names = re.findall(r"^(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Z_][\w]*)|let\s+(_[\w]+))", out, re.M)
flat = [a or b or c for a, b, c in names]
dup = sorted({n for n in flat if flat.count(n) > 1})
if dup:
    sys.exit("重複した宣言があります: " + ", ".join(dup))

(ROOT / "gas" / "002-Extras.gs").write_text(out)
print(f"Extras.gs を作成 ({VERSION}) : {len(out.splitlines())}行 / トップレベル宣言 {len(flat)}個 / 重複なし")
