# clasp の入れ方（Windows）

貼り付け作業を `clasp push` の1コマンドに置き換えるためのツール。
**必須ではない。** 今のコピペ運用でも問題なく動く。

## ⚠️ 最初に知っておくこと

`clasp push` は **プロジェクトの中身をパソコン側の内容で丸ごと置き換える**。
パソコン側に `コード.gs` が無い状態で push すると、**Apps Script 側の `コード.gs` が消える**。

なので順番は必ず **`clasp clone`（ダウンロード）→ 編集 → `clasp push`**。
いきなり push しない。

---

## 手順

### 1. Node.js を入れる

https://nodejs.org/ →「LTS」と書かれた方をダウンロード → 実行 → 「Next」を押していくだけ。

確認: スタートメニューで `cmd` と打って「コマンド プロンプト」を開き、

```
node -v
```

`v22.x.x` のように出れば成功。**v20 未満だと clasp が動かない。**

### 2. clasp を入れる

```
npm install -g @google/clasp
```

確認:

```
clasp --version
```

### 3. Apps Script API を ON にする

https://script.google.com/home/usersettings を開き、
**「Google Apps Script API」のスイッチを ON**（これを忘れると 3-1 で必ず失敗する）

### 4. Googleにログインする

```
clasp login
```

ブラウザが開くのでアカウントを選んで許可。
`Authorization successful.` と出れば成功。

### 5. スクリプトIDを調べる

Apps Script の画面 → 左の **⚙（プロジェクトの設定）** → 「スクリプト ID」をコピー。

### 6. コードをパソコンに落とす

```
cd %USERPROFILE%
mkdir taxi-gas
cd taxi-gas
clasp clone ここにスクリプトID
```

`001-Code.gs` `002-Extras.gs` `003-LineReport.gs` `appsscript.json` が落ちてくる。
**この時点で、フォルダの中身 = Apps Script の中身 になっている。**

---

## ふだんの使い方

1. 新しいコードを、フォルダ内の該当ファイルに上書き保存
2. 反映する

```
cd %USERPROFILE%\taxi-gas
clasp push
```

`Pushed 4 files.` のように出れば完了。ブラウザを触る必要はない。

**誰かがブラウザ側で直した可能性があるときは、先に取り込む:**

```
clasp pull
```

---

## 気をつけること

| やりがちな失敗 | どうなるか |
|---|---|
| `clasp clone` せずに push | Apps Script側のファイルが消える |
| フォルダを間違えて push | 別のプロジェクトが上書きされる |
| `.clasprc.json` を人に渡す | Googleアカウントに入られる |

`.clasprc.json` と `.clasp.json` には**ログイン情報が入っている**。
GitHubに上げたり人に送ったりしない。`.gitignore` に必ず書く。

```
.clasp.json
.clasprc.json
```

## うまくいかないとき

| 症状 | 原因 |
|---|---|
| `User has not enabled the Apps Script API` | 手順3をやっていない |
| `clasp: command not found` | 手順2が失敗。コマンドプロンプトを開き直す |
| `Invalid script ID` | 手順5のIDが違う。スプレッドシートのIDではなくスクリプトID |
