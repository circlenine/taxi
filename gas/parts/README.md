# parts — 貼らなくてよいファイル

ここにあるのは **`../002-Extras.gs` を組み立てるための材料** です。
Apps Script に貼るのは、ひとつ上の階層にある3つだけです。

| ファイル | 中身 | 行き先 |
|---|---|---|
| `Strategy.gs` | 立ち回り分析＋ロングマップ | `002-Extras.gs` に束ねられる |
| `Opucha.gs` | オプチャ印を付ける／外す画面 | `002-Extras.gs` に束ねられる |
| `ChartFit.gs` | グラフをZ列の幅にそろえる | `002-Extras.gs` に束ねられる |
| `MapLink.gs` | G列の乗り場名 → Googleマップ | `002-Extras.gs` に束ねられる |
| `WebApp.gs` | みんなの記録ページ（データを集める側） | `../004-WebApp.gs` に束ねられる |
| `webapp.html` | みんなの記録ページ（画面） | 同上 |

`Strategy.gs` / `Opucha.gs` / `ChartFit.gs` / `MapLink.gs` を直したら、必ず組み立て直します。

```
python3 tools/build_extras.py
```

`WebApp.gs` / `webapp.html` を直したときは、こちら。

```
python3 tools/build_webapp.py
```

`MapLink.gs` は E005ver から `002-Extras.gs` に同梱されました。
単体で貼る必要はありません。
