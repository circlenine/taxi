/**
 * ================================================================
 *  僕はグールだ【記録用】 スプレッドシート  統合スクリプト
 *  ★★★  C025ver  （2026/09/06）  ★★★   ← もとは version 232
 *
 *  ファイル記号: C=001-Code.gs / L=003-LineReport.gs / E=002-Extras.gs
 *  ※ Apps Script 上のファイル名も「001-Code」にそろえてください
 *  直したら数字を1つ増やし、下の履歴に何を直したか書く。
 *  いま動いているバージョンは メニュー「ℹ️ バージョンを確認」で見られる。
 *
 *  [C025ver]
 *   ・設定に「まとめスプシのID」を足した
 *     レポートのダッシュボードを、自分で決めたスプレッドシートに作れるようにする
 *     （URLをそのまま貼ってよい。スマホからでも変えられる）
 *
 *  [C024ver]
 *   ・年見出し（2026年 など）の上の線を「太線」にした
 *     いちばん上の年見出し（4行目）には引かない
 *     （見出し行のすぐ下なので、二重線に見えてしまうため）
 *   ・整形のたびに、G列の乗り場に Googleマップ のリンクを貼るようにした
 *     タップするとマップが開く。002-Extras.gs が入っているときだけ動く
 *   ・設定に「乗り場にマップリンクを付ける」を足した（いいえ にすると貼らない）
 *
 *  [C023ver]
 *   ・設定に「テスト送信先（自分のLINE）」を足した
 *     LINEに送るものを、まず自分だけで確かめられるようにするため
 *
 *  [C022ver]
 *   ・「そうさ」タブ（セルのチェックで動かす）用のメニューを足した
 *     スマホのスプレッドシートアプリではメニューが出ないため、
 *     チェックボックスから動かせるようにする
 *
 *  [C021ver]
 *   ・005-Updater.gs（コードの自動更新）用のメニューを足した
 *     入れているときだけ出る。これで貼り替えが要らなくなる
 *   ・ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *                  W=004-WebApp / U=005-Updater
 *
 *  [C020ver]
 *   ・ページ関係のメニューを3つに分けた（スマホでダイアログが出ないため）
 *     📱 ページのURLを見る／💬 URLをLINEに送る／🩺 開けるか調べる
 *
 *  [C019ver]
 *   ・「みんなの記録ページ」に鍵をかけられるようにした（設定タブに2項目）
 *     ・ページを見られるメール … 許すメールをカンマ区切りで書く
 *     ・ページの合言葉         … 知っている人だけ見られるようにする
 *     どちらも空なら、URLを知っている人は誰でも見られる（今までどおり）
 *
 *  [C018ver]
 *   ・「軽量モード」を足した（設定タブで はい／いいえ）
 *     セルの色ぬりをやめて、並び順・書式・枠線だけにする
 *     色を持ったセルが数千あるとスマホの描画が重いので、その対策
 *     見るのは 004-WebApp.gs（みんなの記録ページ）に任せる前提
 *   ・メニューに「📱 みんなの記録ページのURL」を足した
 *     004-WebApp.gs を入れているときだけ出る
 *
 *  [C017ver]
 *   ・設定の読み出しが遅かったのを直した（C011で入れた作りの手直し）
 *     並び替えの比較のたびに設定を引き直していたので、1回引いたら覚えておく
 *   ・「🩺 右下のポップアップを調べる」を「🩺 動いているか調べる」に広げた
 *     毎日17時の自動チェック／LINEの最終受信／最終更新スタンプも見られる
 *     「最終更新が止まっている」ときに、どこで止まったのかが分かる
 *   ・LINEからメッセージが届いた時刻を記録するようにした
 *
 *  [C016ver]
 *   ・右下のポップアップが出ないときに、原因を調べられるようにした
 *     メニュー「🩺 右下のポップアップを調べる」
 *     トリガーの有無／最後に動いた時刻／開いているタブ／直近のエラーを出す
 *   ・対象外のタブ（説明・設定）を開いたときも、短く一言出すようにした
 *     今までは黙っていたので、壊れたのか対象外なのか分からなかった
 *   ・エラーを記録に残すようにした（直近5件。スマホからでも見られる）
 *
 *  [C015ver]
 *   ・GitHub 上のファイル名を 001-Code.gs / 002-Extras.gs / 003-LineReport.gs にした
 *     貼る順番のとおりに並ぶので、どれをどこに貼るか迷わない
 *     Apps Script 側のファイル名も同じにそろえる
 *   ・中身の動きは C014ver から変えていない
 *
 *  [C014ver]
 *   ・日付メモとみなす条件に「矢印を付ける」か「リプライで送る」を必須にした
 *     どちらも無い、ただの数字（1桁の相づちなど）は雑談として黙って流す
 *     今までは「0905」だけでも反応していたので、まぎらわしかった
 *
 *  [C013ver]
 *   ・4桁固定は「数字だけで打ったとき」に限る、に直した
 *     区切りを入れれば読み違えようがないので、そちらは自由に書ける
 *     0905 ／ 9/5 ／ 9月5日 ／ 9-5 ／ 260905 ／ 26/9/5 ／ 2026年9月5日
 *
 *  [C012ver]
 *   ・日付メモは「月日はかならず4桁」に決めた
 *     0905（4桁）＝ 送った年の9月5日
 *     280905 / 20280905（先頭に年）＝ 2028年9月5日
 *     年を書いたときは、その年のとおりに入れる（勝手にずらさない）
 *   ・読めない数字（895・0895・8905 など）には、書き方を添えて返信する
 *     今までは黙って無視していたので、直せずに気づけなかった
 *
 *  [C011ver]
 *   ・「設定」タブを作った。よく変える数字と文言をスプシから直せる
 *     金額の区分／オプチャの取込時間・最低金額／営業曜日の始まり／
 *     要確認とみなす時刻の幅／高すぎる金額の線／裏メッセージの文面
 *     メニュー「⚙️ 設定タブを作る・直す」で作れる。無ければ今までの値で動く
 *   ・日付メモの年を勝手に前後させるのをやめた（打った数字のとおりに読む）
 *
 *  [C010ver]
 *   ・スクショの営業曜日を、数字を打つだけで直せるようにした
 *     ① スクショにリプライして「0904」だけ打つ → そのスクショの日付になる
 *     ② スクショの前か後に「↑0904」「↓0904」だけ打つ → 矢印の向いた側のスクショ
 *        上・左向き＝先に送ったスクショ／下・右向き＝次に送るスクショ
 *     ・2〜4桁は日付だけ（年は送った日と同じ）、5〜8桁は年＋日付
 *     ・何も打たなければ、今までどおり送った日の営業曜日
 *   ・スクショに写っている投稿者の名前も読み取るようにした
 *     身内の名前で、中身も手持ちの記録とそっくりなら二重登録とみなして外す
 *     名前だけ身内、または中身だけそっくりなら ⚠️ を付けて取り込む（要確認）
 *
 *  [C009ver]
 *   ・取込の時間帯を 17:00〜翌05:15（29:15）に戻した（C008の18:00〜05:30は誤り）
 *   ・スクショ1枚に乗車記録が2件以上写っている場合の返信を分かりやすくした
 *     「読み取れた3件のうち1件」のように、何件中の何件が不備なのかを書く
 *     ※取り込み自体は前から複数件に対応している（1枚から全部拾う）
 *   ・AIへの指示文に「1枚に何件写っていても全部返す」を明記した
 *
 *  [C008ver]
 *   ・スクショの取込時間を 18:00〜翌05:30（29:30）に変更した
 *     この外の乗車時刻は「私たちでは乗車不可な時間のため、除外します」と返信する
 *   ・スクショを2枚以上まとめて送った（連投）ときを判別できるようにした
 *     LINEの imageSet（何枚目／全何枚）を見て、全部そろってから1回だけ返信する
 *     imageSet が付かない機種向けに、90秒以内の連続送信も連投として数える
 *   ・エラー返信を具体的にした
 *     送り主のアイコン名を取ってきて「〇〇様データは〜」の形にし、
 *     何枚目のスクショの、どの行の、何が不備だったのかを1行ずつ書く
 *   ・同じ内容のオプチャ行を二重に登録しないようにした（重複チェック）
 *
 *  [C007ver]
 *   ・スクショ（画像）を送るとオプチャ情報として取り込むようにした
 *     テキスト＝自分の乗車記録／画像＝オプチャ情報、で区別する
 *     画像は誰が送ってもよい（テキストは登録済みの5人だけ）
 *     A列は「ｵﾌﾟﾁｬ」。個人タブには入れず、乗り場から決まるタブへ
 *     読み取れなかったときだけ、その場で返信する
 *   ・読めないテキストを parseOpuchaMessage_ に渡すのをやめた
 *     この関数は定義が無く、呼ぶとエラーで握りつぶされていた
 *
 *  [C006ver]
 *   ・K列の ⚠️ が消えなくなる不具合を修正
 *     整形のたびに古い ⚠️ を残したまま、怪しい行にだけ付け直していたため、
 *     金額を直して怪しくなくなった行にも ⚠️ が残り続けていた。
 *     いったん消してから付け直すようにした（🆕 と 🔧 はこれまで通り残る）
 *
 *  [C005ver]
 *   ・開いたときの通知に「何を直したか」を具体的に出すようにした
 *     例: 「並び替え / 乗り場名を統一2件 / ⚠️要確認1件」
 *   ・その文言を作る処理を1か所にまとめた（全タブ整形の表示と同じ文になる）
 *
 *  [C004ver]
 *   ・開いたときのチェックを、右下に出る形（toast）で復活させた
 *     「〇〇タブをチェック中(推定残り約〇秒)」→「変更ありませんでした / 修正しました」
 *     画面を止めないので、スマホでも操作を待たされない
 *   ・メニューから ON / OFF を切り替えられるようにした
 *   ・バージョン記号を K → C に変更（ファイル名 Code.gs に合わせた）
 *
 *  [C003ver（旧K003ver）] 開いたときの通知を toast に変更
 *
 *  [C002ver（旧K002ver）] 速度改善のみ。動作は変えていない
 *   ・開いたときの自動整形をやめた（スマホでフリーズする最大の原因）
 *     → 整形は「🔄 いま開いているタブだけ整形する」から手動で
 *   ・営業日の境目の下線を、境目ごと→まとめて1回に（getRangeList）
 *   ・年見出しの書式と上線も、まとめて1回に
 *   ・onEdit の書式指定を3回→1回に
 *
 *  [v232まで] これまでの履歴は下に残してあります
 *
 *  ★このファイルを「丸ごと」コピペで置き換えてください
 *  ★初回だけ、メニュー「🚕 乗車記録システム」→「🔑 LINEトークンを設定」を実行
 *
 *  [v231の変更点]
 *   ・I列1行目の文字サイズを 6 に統一
 *   ・「17:00～17:05」の部分だけ文字色を #990000 に
 *   ・年見出し(2025年/2026年)の文字サイズを 9 に統一
 *
 *  [v230の変更点]
 *   ・すでに改行が入っているG列・I列は、整形で折り返し直さない
 *     （手で微調整した内容が元に戻らないようにするため）
 *   ・I列の「バラシ」の前で自動改行。直前の「、」空白「：」は削除
 *   ・「行先:」の半角コロンを全角「行先：」に統一
 *   ・自動チェックを 15分ごと → 毎日17:00 に変更
 *   ・I列1行目の注意書きを自動チェックの時刻入りに変更
 *
 *  [v229の変更点]
 *   ・「パラシ」など打ち間違いもバラシとして判定するよう修正
 *   ・関空の表記ゆれ（かんくう・KIX等）も拾えるよう調整
 *   ・他タブへの反映後、どのタブに何件入ったかを表示
 *
 *  [v228の変更点]
 *   ・I列1行目の注意書きの文字色を黒に変更
 *
 *  [v227の変更点]
 *   ・変更がなかったときの表示を「変更はありませんでした」に統一
 *   ・15分ごとの自動チェックで、個人タブを触っていたら他タブへの連動も自動実行
 *   ・重複チェックの対象を全タブに拡大（エリアタブの手打ち行も対象）
 *   ・メニュー名を分かりやすく変更
 *
 *  [v226の変更点]
 *   ・乗車時間が分からない行は「??:??」と表示（20:00のような紛らわしい値を使わない）
 *   ・怪しい行（時刻不明・金額0円・4万円以上）はK列に「⚠️」を付ける
 *   ・I列1行目の注意書きを短く変更
 *
 *  [v225の変更点]
 *   ・重複の探し方を作り直し（金額＋乗り場でまとめ、時間かそのほかが一致すれば重複）
 *     どの項目が違うのかも一覧に出すようにした
 *   ・乗車時間と金額の両方が空の行は、雑談とみなして削除
 *   ・整形の結果に「何を直したか」を件数つきで表示
 *   ・行の高さを setRowHeightsForced で強制（説明タブが直らなかった原因）
 *   ・説明タブ以外のI列1行目に自動チェックの注意書きを表示
 *
 *  [v224の変更点]
 *   ・個人タブを直したり消したりすると、他タブにも必ず連動するよう作り直し
 *     （手打ちした行も連動対象になりました）
 *   ・I列に「バラシ」が入る行は ﾊﾞﾗｼタブだけに入れ、エリアタブには入れない
 *   ・手動で直したI列が、整形で元に戻らないよう修正
 *   ・重複の判定に「金額＋乗り場＋そのほか」の照合を追加
 *   ・バックアップ機能を全廃
 *   ・改行は句読点・空白・括弧の境目を優先（途中で切るのは最後の手段）
 *   ・14文字以上のI列も半角にできる文字は半角へ
 *   ・説明タブの1行目を確実に21に戻す
 *
 *  [v223の変更点]
 *   ・年見出し(2025年/2026年)の文字サイズを 8 に修正（前回の直し漏れ）
 *   ・I列から「〜ます」「〜ました」「〜ません」などの雑談文を除外
 *   ・I列に「____」やURLが含まれる投稿は、その行ごと記録しない
 *   ・I列の改行を、G列と同じ「2行が均等になる場所」で切る方式に変更
 *
 *  [v222の変更点]
 *   ・進捗バーを作り直し（サーバー通知が来なくても時間経過で必ず進み、完了で100%）
 *   ・全面修復のバックアップ作成をやめた
 *   ・全面修復のあと、K列は 🆕 と 🔧 以外を消す
 *   ・H列の「〇〇・乗り場」から「・乗り場」を削除
 *   ・G列「〜しました」を含む投稿はテスト扱いで除外
 *   ・G列の末尾の「から」「より」「発」を削除
 *   ・G列の改行位置を、2行が均等になる場所に自動で選ぶ方式へ変更
 *   ・G列は10文字以上で文字サイズ7、12文字以上で改行
 *
 *  [v221の変更点]
 *   ・お初天神→お初 ／ マネプラ→ガチマネプラ ／ 大丸乗り場→大丸 ／ 船大工 中→船大工
 *   ・「〇駅タクシー乗り場」を「〇駅前タクシー乗り場」に統一
 *   ・乗場マネプラ・ガチマネプラは別物のまま
 *   ・レポート集計時にだけ寄せる組み合わせを登録（江坂／天満モスバーガー前／ドン2〇〇）
 *
 *  [v220の変更点：第2弾]
 *   ・G列の名前を自動で統一（新地7/4/5・アスエアリーナ・セントレジス・
 *     コナン像前・帝国・ニューオータニ・16か17）
 *   ・G列に入ってはいけないもの（営業曜日・行先：・矢印・人物特徴・関空のみ）をI列へ
 *   ・「〇〇 交差点」「〇〇 西向き」の前に半角スペースを1つ自動挿入
 *   ・12文字以上は「ロータリー」「タクシー乗り場」「靭公園」の前で改行
 *   ・14文字以上は全角英数を半角に。10文字以上で文字サイズ7
 *   ・I列は「、」を改行扱い。13文字までで折り返し
 *   ・「お願いします」等の雑談を含む投稿は記録しない／「ありがとう」「工事」はI列に入れない
 *   ・H列は「乗り場・ホテル・道路」を勝手に動かさないよう変更
 *
 *  [v219の変更点：第1弾]
 *   ・手打ち補助を復活（B列の営業曜日／C列の自動計算／D・E・F列の自動整形）
 *   ・D列は「0分」表記・右揃え・中央位置。「不明」もそのまま入る
 *   ・E列は 0000 と打つだけで 00:00 に。F列は 12000 で ￥12,000 に
 *   ・年見出し(2026年など)の文字サイズを 8 に統一
 *   ・K列: 見出しを「直」(サイズ7・中央)、印を 🆕新規 / 🔧変更 に変更
 *   ・ｵﾌﾟﾁｬタブを廃止（A列の「ｵﾌﾟﾁｬ」表示は残ります）
 *   ・説明タブの1行目の高さを既定に戻し、B1に最終更新を表示
 *   ・K列より右に残ったゴミ（lineid等）を自動で消去
 *   ・メニューを 🎮EnemyController に改称
 *
 *  [v218の変更点]
 *   ・書き方が整っている投稿（1行に1項目）は、位置で素直に判定
 *     2行目＝乗車時間 / 3行目＝金額。障害者割引などで￥10単位でも正しく読む
 *     ￥100単位の推測は、初期の崩れた書き方のときだけ使う保険に変更
 *   ・K列はフィルタの対象外に。列幅をA列と同じ20に統一
 *
 *  [v217の変更点]
 *   ・E列に「1899/12/30」と出る不具合を修正
 *     書き込む前に列の書式を文字列にする＋既に壊れた時刻値を自動で直す
 *   ・時刻と金額の判定に「金額は￥100単位（下2桁が00）」の考え方を追加
 *   ・メニューの順番を修正（新スプシでの確認を先に、解析結果の一覧は削除）
 *
 *  [v216の変更点]
 *   ・「🧪 見直し結果を新しいスプシに出す」を追加
 *     修正前と修正後を色分けした一覧で確認できる（本番には一切反映しない）
 *
 *  [v215の変更点]
 *   ・時間のかかる処理に、実際の進み具合を出すシークバーと推定残り時間を表示
 *     全タブ処理では「○○タブ確認中」も表示
 *   ・メニューを作業の順番どおりに整理（①初回設定 ②整形 ③LINE履歴で直す ④その他 ⑤困ったとき）
 *   ・「テスト」を含む投稿と、長すぎる投稿（11行以上／300文字超）は記録対象から除外
 *   ・トーク履歴の引用符（"新地7 ...）を除去。乗り場名の先頭の「"」の原因
 *   ・営業曜日が1985年など異常な年の行を、その年に自動補正
 *   ・フィルタを毎回「3行目〜最終データ行」に張り直す（空白行を含めない）
 *   ・K列に 🟠追加 / 🔴変更 の印を自動で付ける
 *
 *  [v214の変更点]
 *   ・「🔁 重複している行を探して消す」を追加
 *     金額＋乗車時間＋乗り場が同じ行を重複とみなす（営業曜日が違っていても検出）
 *     残す1行は、LINEの本物のID → 情報が多い行 → 古い行 の順で選ぶ
 *     確認してから消せる2段構え。消したあと連動タブも作り直す
 *
 *  [v213の変更点]
 *   ・「📋 LINE履歴の解析結果を一覧で見る」を追加
 *     何件読めて何件読めなかったか、読めなかった投稿を全部表示
 *   ・修復の照合を4段階に。日付がずれていても直せるように
 *     ①営業日＋金額 ②乗車時間＋金額 ③金額＋乗り場 ④営業日＋乗車時間
 *     ②③で一致した行は、営業曜日をLINEに合わせて自動修正
 *
 *  [v212の変更点]
 *   ・解析ロジックを全面的に作り直し（初期の書き方のばらつきに対応）
 *     「新地4 2220 37分」のように1行に詰めた書き方
 *     「0053-0103(10分)」のような 付け始め-乗車(待ち) 表記
 *     「1700(JCBチケ)」のような 数字(補足) 表記
 *     「18,880」のカンマ、「18003分」の金額と待ちのくっつき
 *     「2426」「2413」のような24時超え表記
 *     「即乗せ」「30秒」→ 待ち0分
 *   ・金額が0や4万円以上の行は「要確認」の色を付ける
 *
 *  [v211の変更点]
 *   ・乗り場ワードに 島之内・天六・天神橋筋六丁目 などを追加
 *   ・オプチャ情報も、通常の記録と同じく「個人タブ＋条件に合ったタブ」へ反映
 *     （A列だけ「ｵﾌﾟﾁｬ」と表示。レポート集計では分けて扱う）
 *
 *  [v210の変更点]
 *   ・年見出し行の上に線を引く（12月と翌年の境目が分かるように）
 *   ・I列が乗車方法だけの行（ホテル・道路・乗り場など）は自動でH列へ移動
 *
 *  [v209の変更点]
 *   ・LINE取消時、オプチャ投稿（ID末尾が -0, -1）も削除されるよう修正
 *   ・修復・照合のときに、J列の本物のメッセージIDを上書きせず保持
 *   ・オプチャの各件にも取消連動が効くように
 *
 *  [v208の変更点]
 *   ・スプレッドシートのタイムゾーンをAsia/Tokyoに自動修正（日付が1日ずれる原因）
 *   ・日付を正午基準で持ち、時差で日がずれないように
 *   ・J列を折り返さない設定に（長いIDが折り返して行が伸びる原因）
 *   ・全ての文字を太字に統一
 *   ・営業曜日の変わり目の下線を、太線から普通の線に
 *   ・B1を「🔄最終更新：2026/08/30(日) 09:15」の形（曜日は日本語）で自動更新
 *
 *  [v207の変更点]
 *   ・整形の実行時に、タブごとの「読めた行数・年見出しの数」を表示
 *     （何行も読めていないタブがひと目で分かる）
 *
 *  [v206の変更点]
 *   ・B列が「4/13(金)」のような文字列でも日付として読めるよう修正（整形が動かない原因）
 *   ・「📏 行の高さと折り返しだけ直す」を追加（並び替えをせず高さだけ直す）
 *   ・「🩺 なぜ整形されないか調べる」を追加
 *   ・「🏷 乗り場名の表記ゆれを統一する」を追加（実行ボタン付き）
 *
 *  [v205の変更点]
 *   ・H列（乗車方法）の対象を拡張：GO/Uber/エスライド/無線/乗り場/ホテル/道路/
 *     付け待ち/呼び込み/スライド乗車/途中乗り/手上げ/流し
 *   ・複数該当した場合は「GO・付け待ち」のようにH列へまとめる
 *   ・それ以外の文章はすべてI列へ
 *   ・「🏷 乗り場名の表記ゆれを一覧する」を追加
 *
 *  [v204の変更点]
 *   ・「🩹 LINE履歴で個人タブを丸ごと修復」を追加
 *     時刻が壊れていても、営業日＋金額でLINE記録と突き合わせて上書きする
 *     I列の手書きメモは、LINE側が空なら残す
 *     実行前にスプレッドシート全体のバックアップを自動作成
 *
 *  [v203の変更点]
 *   ・営業曜日を「当日17:00〜翌日16:59」に変更（旧: 16:00〜15:59）
 *   ・年見出し行を日付値（2026/01/01 16:59）で作り直す。2001年などのゴミは自動削除
 *   ・行の高さを基本21に戻す（改行がある行だけ広げる）
 *   ・枠線を引き直してから薄グレー#cccccc、営業曜日の変わり目に黒い下線
 *   ・「🧹 全タブをまとめて整形」「⏱ 自動整形をONにする」を追加
 *
 *  [v202の変更点]
 *   ・オープンチャット等の自由文をグループLINEに投げるだけで自動記録
 *   ・A列は「ｵﾌﾟﾁｬ」と表記し、ｵﾌﾟﾁｬタブにも反映（エリアタブには流さない）
 *   ・除外条件：DiDi／連続配車／17:00〜翌05:15の範囲外／金額が読めない
 *   ・24時超え表記（24時24／26:15／32時11）を自動変換
 *   ・LINE履歴とスプシの照合チェック（差分の確認 → 一括修正）を追加
 *
 *  [v201の変更点]
 *   ・LINEトーク履歴（テキスト書き出し）の一括取込を追加
 *   ・表示名 → タブ名 の対応表を追加
 *   ・取込時は同じ内容を二重登録しない（重複チェック付き）
 * ================================================================
 */

/* ============ 1. 基本設定 ============ */

/** このファイルのバージョン（メニュー「ℹ️ バージョンを確認」に出る） */
const CODE_VERSION = "C025ver";

const SENDER_MAP = {
  "Ued4659890c83b3b0bcf2a3f8bf008e7f": "ﾀﾞｲｽｹ",
  "U421384a08aff73dd03a93e33a54a589d": "ｼｭﾝ",
  "U42bdcd0295078d2971d6e3a6facb351f": "ｶｲﾄ",
  "U5a235e053ed7ea6c235a47ce093e4e71": "ｱﾅﾙ",
  "Uec8443d00bcec9f0463fd47775a41909": "ﾏｰｸ"
};

// トーク履歴取込用：LINEの表示名 → タブ名
// （空白・「さん」・「(放出営業所)」などは自動で無視されます）
const DISPLAY_NAME_MAP = {
  "齊藤大介": "ﾀﾞｲｽｹ", "斉藤大介": "ﾀﾞｲｽｹ", "斎藤大介": "ﾀﾞｲｽｹ",
  "山敷shun": "ｼｭﾝ",
  "山脇海斗": "ｶｲﾄ",
  "城越":     "ｱﾅﾙ",
  "Mark":     "ﾏｰｸ"
};

const PERSONAL_TABS = ["ﾀﾞｲｽｹ", "ｼｭﾝ", "ｶｲﾄ", "ｱﾅﾙ", "ﾏｰｸ"];  // マスター（手打ち可）
const AREA_TABS     = ["北7", "北4", "北他", "ﾐﾅﾐ", "ほか"];      // 自動連動のみ
const FLAG_TABS     = ["関空", "ﾊﾞﾗｼ"];                          // 自動連動＋手打ち可
const OPUCHA_TAB    = "ｵﾌﾟﾁｬ";     // A列の表示名としてのみ使う（専用タブは作らない）
const INFO_TAB      = "説明";
const ALL_TABS      = PERSONAL_TABS.concat(AREA_TABS, FLAG_TABS);

// オプチャ取込の条件
// 取込の時間帯・最低金額は「設定」タブで変えられる（初期値は SETTINGS_DEFS を見てください）
const OPUCHA_EXCLUDE   = /(didi|ディディ|ﾃﾞｨﾃﾞｨ|連続配車|連続 *配車)/i;
const ROUTE_SEP        = /[〜～\-–—→⇒➡▶▷>]|から/;



/* ============ 1-2. 「設定」タブ ============ */
/*
 * よく変える数字と文言を、コードではなくスプレッドシートから直せるようにする。
 * スマホからでも直せるのが狙い。「設定」タブが無ければ、下の「初期値」で動く。
 */

const SETTINGS_TAB = "設定";

// key … B列に書く見出し（これで探すので、変えると読めなくなる）
// def … 初期値。「設定」タブが無い／空のときはこれを使う
// kind … num=数字 / time=HH:MM / text=文字
const SETTINGS_DEFS = [
  { key: "ショートの上限（円）",       def: 4999,   kind: "num",
    help: "これ以下がショート" },
  { key: "ロングの下限（円）",         def: 10000,  kind: "num",
    help: "これ以上がロング。あいだがミドル" },
  { key: "営業曜日の始まり（時）",     def: 17,     kind: "num",
    help: "この時刻から翌日のこの時刻までを1日として数える" },
  { key: "オプチャ取込の開始時刻",     def: "17:00", kind: "time",
    help: "スクショの乗車時刻がこれより前なら取り込まない" },
  { key: "オプチャ取込の終了時刻",     def: "05:15", kind: "time",
    help: "翌朝の時刻。これより後なら取り込まない（29:15と同じ）" },
  { key: "オプチャの最低金額（円）",   def: 1000,   kind: "num",
    help: "これ未満は情報不足として取り込まない" },
  { key: "要確認とみなす時刻の幅（分）", def: 15,   kind: "num",
    help: "身内の記録と何分以内なら「同じ乗車」とみなすか" },
  { key: "高すぎる金額の線（円）",     def: 40000,  kind: "num",
    help: "これ以上の金額は ⚠️ を付けて要確認にする" },
  { key: "裏メッセージの文面",         def: "📈{期間}レポート作成 byシバンニ", kind: "text",
    help: "LINEの通知に出る文字。{期間} が 8/16(日)～9/15(月) に置き換わります" },
  { key: "軽量モード",                 def: "いいえ", kind: "text",
    help: "「はい」にすると、セルの色ぬりをやめて軽くします。" +
          "並び順・書式・枠線はそのまま。見るのは「みんなの記録ページ」に任せるとき用" },
  { key: "ページを見られるメール",     def: "", kind: "text",
    help: "みんなの記録ページを見られるGoogleアカウントを、カンマ区切りで。" +
          "空なら制限なし。※デプロイの「実行するユーザー」を" +
          "「ウェブアプリにアクセスしているユーザー」にしないと効きません" },
  { key: "まとめスプシのID", def: "", kind: "text",
    help: "レポートのダッシュボードを作る先。スプレッドシートのURLをそのまま貼ってOK。" +
          "空なら、説明タブZ2に書いてあるものを使います" },
  { key: "乗り場にマップリンクを付ける", def: "はい", kind: "text",
    help: "「はい」にすると、整形のたびにG列の乗り場をタップでGoogleマップが開くようにします" },
  { key: "テスト送信先（自分のLINE）", def: "", kind: "text",
    help: "「まず自分だけに送る」ときの宛先。空なら、登録済みの「ﾏｰｸ」に送ります" },
  { key: "ページの合言葉",             def: "", kind: "text",
    help: "みんなの記録ページを開くときの合言葉。空なら聞きません。" +
          "Googleログインが要らないので、LINEの中のブラウザでもそのまま開けます" }
];

// 1回の実行のあいだだけ覚えておく（毎回シートを読みに行かないため）
let _cfgCache = null;
// 引いた結果もそのまま覚えておく。
// 並び替えの比較（timeRank_）から何度も呼ばれるので、毎回さがし直すと遅い。
let _cfgVal = {};

/** 「設定」タブを読む。無ければ空のまま（＝初期値が使われる） */
function cfgLoad_() {
  if (_cfgCache) return _cfgCache;
  _cfgCache = {};
  _cfgVal = {};
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_TAB);
    if (sh) {
      const last = sh.getLastRow();
      if (last >= 2) {
        sh.getRange(2, 2, last - 1, 2).getValues().forEach(function (r) {
          const k = String(r[0]).trim();
          if (k) _cfgCache[k] = r[1];
        });
      }
    }
  } catch (e) { /* 設定が読めなくても、初期値で動けばよい */ }
  return _cfgCache;
}

/** 設定を1つ取る。空欄・読めない値なら初期値 */
function cfg_(key) {
  cfgLoad_();                               // 覚えていなければ、ここで読む
  if (key in _cfgVal) return _cfgVal[key];  // 2回目からは、さがさずそのまま返す

  const def = (function () {
    for (let i = 0; i < SETTINGS_DEFS.length; i++) {
      if (SETTINGS_DEFS[i].key === key) return SETTINGS_DEFS[i];
    }
    return null;
  })();
  if (!def) return "";

  const raw = _cfgCache[key];
  let val;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    val = def.def;
  } else if (def.kind === "num") {
    const n = parseInt(String(raw).replace(/[^0-9\-]/g, ""), 10);
    val = isNaN(n) ? def.def : n;
  } else if (def.kind === "time") {
    // セルが時刻書式だと Date で返ってくるので、そのときは時分を取り出す
    if (raw instanceof Date) {
      val = pad2_(raw.getHours()) + ":" + pad2_(raw.getMinutes());
    } else {
      const m = String(raw).trim().match(/^(\d{1,2})[:：](\d{2})$/);
      val = m ? pad2_(+m[1] % 24) + ":" + m[2] : def.def;
    }
  } else {
    val = String(raw);
  }
  _cfgVal[key] = val;
  return val;
}

/** "17:00" → 1020（0時からの分） */
function cfgMin_(key) {
  const t = String(cfg_(key));
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  return m ? (+m[1]) * 60 + (+m[2]) : 0;
}

// --- 実際に使うときの入口。名前で意味が分かるようにしておく ---
function cfgShortMax_()   { return cfg_("ショートの上限（円）"); }
function cfgLongMin_()    { return cfg_("ロングの下限（円）"); }
function cfgBizStart_()   { return cfg_("営業曜日の始まり（時）"); }
function cfgOpuFrom_()    { return cfgMin_("オプチャ取込の開始時刻"); }
function cfgOpuTo_()      { return cfgMin_("オプチャ取込の終了時刻"); }
function cfgOpuMinYen_()  { return cfg_("オプチャの最低金額（円）"); }
function cfgNearMin_()    { return cfg_("要確認とみなす時刻の幅（分）"); }
function cfgHighYen_()    { return cfg_("高すぎる金額の線（円）"); }
function cfgAltText_()    { return cfg_("裏メッセージの文面"); }
function cfgPageEmails_() { return cfg_("ページを見られるメール"); }
function cfgPagePass_()   { return cfg_("ページの合言葉"); }
/** 軽量モードか。「はい」「on」「true」「1」のどれかなら ON とみなす */
function cfgLight_() {
  return /^(はい|ハイ|on|ON|true|TRUE|1|yes|YES)$/.test(String(cfg_("軽量モード")).trim());
}

/** 「17:00〜翌05:15（29:15）」という説明用の文字を作る */
function cfgHoursText_() {
  const from = cfg_("オプチャ取込の開始時刻");
  const to   = cfg_("オプチャ取込の終了時刻");
  const p = String(to).split(":");
  const over = (parseInt(p[0], 10) + 24) + ":" + p[1];     // 05:15 → 29:15
  return from + "〜翌" + to + "（" + over + "）";
}

/**
 * 「設定」タブを作る（あれば足りない行だけ足す）。
 * 人が書いた値は消さない。見出しと説明だけ書き直す。
 */
function menuSetupSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SETTINGS_TAB);
  const isNew = !sh;
  if (isNew) sh = ss.insertSheet(SETTINGS_TAB);

  // いま入っている値を覚えておく（作り直しても消さないため）
  const cur = {};
  const last = sh.getLastRow();
  if (last >= 2) {
    sh.getRange(2, 2, last - 1, 2).getValues().forEach(function (r) {
      const k = String(r[0]).trim();
      if (k && String(r[1]).trim() !== "") cur[k] = r[1];
    });
  }

  const rows = [["", "項目", "値", "説明"]];
  SETTINGS_DEFS.forEach(function (d) {
    rows.push(["", d.key, (d.key in cur) ? cur[d.key] : d.def, d.help]);
  });

  sh.clear();
  sh.getRange(1, 1, rows.length, 4).setValues(rows);
  sh.getRange(1, 2, 1, 3).setFontWeight("bold").setBackground("#e8eaed");
  sh.getRange(2, 3, rows.length - 1, 1).setBackground("#fff8e1");   // 触ってよい列を目立たせる
  sh.setColumnWidth(1, 20).setColumnWidth(2, 210).setColumnWidth(3, 130).setColumnWidth(4, 420);
  sh.getRange(1, 1, rows.length, 4).setVerticalAlignment("middle").setWrap(true);
  sh.setFrozenRows(1);

  _cfgCache = null; _cfgVal = {};   // 次からは新しい値で動く
  SpreadsheetApp.getUi().alert(
    (isNew ? "「設定」タブを作りました。\n\n" : "「設定」タブを整えました。\n\n") +
    "黄色いC列の数字や文字を直すと、次から新しい値で動きます。\n" +
    "空っぽにすると、もとの値に戻ります。");
}

/** 設定を読み直す（タブを直したあと、すぐ効かせたいとき用） */
function menuReloadSettings() {
  _cfgCache = null; _cfgVal = {};
  const lines = SETTINGS_DEFS.map(function (d) { return "・" + d.key + "：" + cfg_(d.key); });
  SpreadsheetApp.getUi().alert("いまの設定\n\n" + lines.join("\n"));
}
const START_ROW = 4;   // データ開始行
const LAST_COL  = 11;  // A〜K
const BASE_H    = 21;  // 基本の行高さ

// 列番号
const C_SENDER = 1, C_DATE = 2, C_START = 3, C_WAIT = 4,
      C_TIME = 5, C_MONEY = 6, C_PLACE = 7, C_METHOD = 8,
      C_OTHER = 9, C_LINK = 10, C_MARK = 11;

// 曜日カラー
const DAY_COLOR = { weekday: "#000000", fri: "#b8860b", sat: "#0000ff", holi: "#a61c00" };
const DUP_COLOR = "#b7b7b7";
const BORDER_COLOR = "#cccccc";

const HOLIDAYS = [
  "1/1","1/2","1/3","1/12","2/11","2/23","3/20","3/21","4/29","5/3","5/4","5/5","5/6",
  "7/19","7/20","8/11","8/13","8/14","8/15","8/16","9/20","9/21","9/22","9/23",
  "10/11","10/12","11/3","11/23","12/31"
];

// 乗車方法の表記ゆれ吸収（上から順に判定。先に書いたものが優先）
const METHOD_RULES = [
  { re: /(newmo|ﾆｭｰﾓ|ニューモ|ニュ-モ|無線|むせん)/i,                    out: "無線" },
  { re: /(s\s*[\.。･・]?\s*ride|ｓ\s*ライド|s\s*ライド|エスライド|ｴｽﾗｲﾄﾞ|えすらいど)/i, out: "エスライド" },
  { re: /(スライド|ｽﾗｲﾄﾞ|すらいど)/,                                     out: "スライド乗車" },
  { re: /(uber|ウーバー|ｳｰﾊﾞｰ|うーばー)/i,                              out: "Uber" },
  { re: /(^|[^a-zA-Z])(go|ＧＯ|ゴー)([^a-zA-Z]|$)/i,                     out: "GO" },
  { re: /(途中乗り|途中のり|とちゅう乗り|とちゅうのり|とちゅう|途中)/,   out: "途中乗り" },
  { re: /(付け待ち|付け待|つけ待ち|付けまち|つけまち|付待ち|ツケ待ち|つけ待|ﾂｹ待ち)/, out: "付け待ち" },
  { re: /(呼び込み|呼込み|呼びこみ|よびこみ|ヨビコミ)/,                  out: "呼び込み" },
  { re: /(手上げ|手あげ|てあげ|テアゲ|手挙げ)/,                          out: "手上げ" },
  { re: /(流し|ながし|ナガシ)/,                                          out: "流し" },
  { re: /(乗り場|乗場|のりば|ノリバ|ﾉﾘﾊﾞ)/,                              out: "乗り場" },
  { re: /(ホテル|ﾎﾃﾙ|hotel)/i,                                          out: "ホテル" },
  { re: /(道路|どうろ)/,                                                 out: "道路" }
];
// オープンチャットの自由文で使う、狭い判定（乗り場名やホテル名を拾わないため）
const METHOD_RULES_LOOSE = METHOD_RULES.filter(function (r) {
  return ["乗り場", "ホテル", "道路"].indexOf(r.out) === -1;
});

const METHOD_STYLE = {
  "GO":   { bg: "#c6f6ff", txt: "#1155ca" },
  "Uber": { bg: "#ffe086", txt: "#7f6000" },
  "無線": { bg: "#d9ead3", txt: "#274e13" }
};

const KANKU_RE  = /(関空|かんくう|カンクウ|ｶﾝｸｳ|関西空港|KIX|ＫＩＸ|ｷｯｸｽ)/i;
// 「パラシ」など打ち間違いも拾う（フリック入力で「ば」と「ぱ」は同じキーのため）
const BARASI_RE = /(バラシ|バラし|ﾊﾞﾗｼ|ばらし|ばラシ|パラシ|パラし|ﾊﾟﾗｼ|ぱらし|ぱラシ|バラ死|ばらシ)/;

// 北方面（北7・北4以外）の乗り場ワード
const NORTH_WORDS = ["堂山","東通り","阪急東","神山町","中崎町","茶屋町","角田町","小松原",
"大深町","芝田","西天満","老松通り","兎野町","兎我野町","マネプラ","ガチマネプラ","乗場マネプラ",
"西中","お初","江坂","梅田","大阪駅","東梅田","西梅田","北新地","中津","豊崎","福島","野田",
"中之島","淀屋橋","肥後橋","渡辺橋","大江橋","南森町","大阪天満宮","天満","扇町","天神橋筋",
"堂島","曽根崎","太融寺","桜橋","堂島大橋","水晶橋","鉾流橋","堀川","ライオン橋","難波橋",
"スエヒロ","アナクラ","ANAクラ","リッツカールトン","コンラッド","ヒルトン","インターコンチネンタル",
"マルビル","グランヴィア","広芝町","天六","天神橋筋六丁目","中崎","梅田","茶屋町","古川橋","菅原町","樋之口町"];

// 南方面の乗り場ワード
const SOUTH_WORDS = ["千日前","裏なんば","座裏","アメ村","アメリカ村","心斎橋筋","御堂筋",
"西心斎橋","東心斎橋","南船場","黒門","千代崎","大正","心斎橋","難波","なんば","道頓堀",
"日本橋","近鉄日本橋","長堀橋","四ツ橋","大国町","桜川","恵美須町","今宮戎","湊町","芦原橋",
"宗右衛門","周防","ヨーロッパ","久左衛門","九郎右衛門","八幡筋","三津寺","三ツ寺","戎橋",
"ひっかけ橋","日本一","相合橋","太左衛門橋","大黒橋","高島屋","マルイ","なんばパークス",
"スイスホテル","センタラグランド","クロスホテル","鰻谷","清水","三休橋","長堀","汐見橋",
"夕陽丘","八幡","新橋","大丸","宗右衛門町","三津寺町","三津寺筋","笠屋町","玉屋町","畳屋町","島之内","東心斎橋","西賑町","元町","難波中","難波千日前","湊町リバープレイス","OCAT","なんばCITY"];



/* ============ 1-2. 進捗表示のしくみ ============ */

function progSet_(pct, label) {
  try {
    CacheService.getScriptCache().put("PROG", JSON.stringify({ p: pct, l: label }), 600);
  } catch (e) {}
}
function progClear_() { try { CacheService.getScriptCache().remove("PROG"); } catch (e) {} }

/** 画面側から定期的に呼ばれる */
function getProgress() {
  try { return CacheService.getScriptCache().get("PROG") || ""; } catch (e) { return ""; }
}

/** どのダイアログにも貼り付けられる進捗バー */
function progressWidget_() {
  return '<div id="pw" style="display:none;margin-top:12px">' +
    '<div id="pl" style="font-size:12px;font-weight:bold;color:#1155ca;margin-bottom:5px">準備中…</div>' +
    '<div style="width:100%;background:#e4e6ea;border-radius:9px;height:18px;overflow:hidden">' +
    '<div id="pb" style="width:0%;height:100%;background:#34a853;transition:width .3s"></div></div>' +
    '<div id="pt" style="font-size:11px;color:#666;margin-top:5px">推定残り: 計算中</div></div>' +
    '<script>' +
    'var _pv=0,_pi=null,_pt0=0,_pdone=false;' +
    'function _pset(p,l){' +
    'if(p>_pv)_pv=p;' +
    'document.getElementById("pb").style.width=_pv+"%";' +
    'if(l)document.getElementById("pl").innerText=l;' +
    'var el=(Date.now()-_pt0)/1000;' +
    'var rem=_pv>3&&_pv<100?Math.max(1,Math.round(el*(100-_pv)/_pv)):0;' +
    'document.getElementById("pt").innerText=_pv>=100?"":(rem?("推定残り: 約"+rem+"秒"):"推定残り: 計算中");}' +
    'function progShow(){var w=document.getElementById("pw");w.style.display="block";' +
    '_pv=0;_pdone=false;_pt0=Date.now();' +
    'document.getElementById("pb").style.background="#34a853";' +
    'document.getElementById("pb").style.width="0%";' +
    'document.getElementById("pl").innerText="準備中…";' +
    'if(_pi)clearInterval(_pi);' +
    '_pi=setInterval(function(){' +
    'if(_pdone)return;' +
    // 時間経過でも必ず少しずつ進める（最大95%まで）
    'var el=(Date.now()-_pt0)/1000;' +
    'var auto=Math.min(95,Math.round(100*(1-Math.exp(-el/25))));' +
    '_pset(auto,null);' +
    'google.script.run.withSuccessHandler(function(s){' +
    'if(_pdone||!s)return;var o;try{o=JSON.parse(s);}catch(e){return;}' +
    '_pset(Math.min(95,o.p||0),o.l);}).getProgress();' +
    '},700);}' +
    'function progDone(msg){_pdone=true;if(_pi)clearInterval(_pi);_pi=null;' +
    'document.getElementById("pb").style.width="100%";' +
    'document.getElementById("pl").innerText=msg||"完了しました";' +
    'document.getElementById("pt").innerText="";}' +
    'function progFail(m){_pdone=true;if(_pi)clearInterval(_pi);_pi=null;' +
    'document.getElementById("pb").style.background="#d93025";' +
    'document.getElementById("pb").style.width="100%";' +
    'document.getElementById("pl").innerText="エラー";' +
    'document.getElementById("pt").innerText=m;}' +
    '</scr' + 'ipt>';
}

/** 入力のいらない処理を、確認 → 実行 の2段構えで走らせる共通ダイアログ */
function runnerDialog_(opt) {
  const html = '<!DOCTYPE html><html><head><base target="_top"><style>' +
    'body{font-family:sans-serif;padding:15px;color:#333;font-size:13px}' +
    'h3{font-size:15px;margin:0 0 8px;border-bottom:2px solid ' + (opt.color || '#1155ca') + ';padding-bottom:6px}' +
    '.d{font-size:12px;color:#666;margin-bottom:10px;line-height:1.7}' +
    'button{width:100%;padding:12px;margin-top:8px;border:none;border-radius:5px;' +
    'font-weight:bold;font-size:15px;cursor:pointer;color:#fff}' +
    '#b1{background:#1155ca}#b2{background:' + (opt.color || '#1155ca') + '}' +
    '#r{width:100%;height:' + (opt.h || 230) + 'px;font-size:11px;font-family:monospace;' +
    'margin-top:10px;box-sizing:border-box}' +
    '</style></head><body>' +
    '<h3>' + opt.title + '</h3><div class="d">' + opt.desc + '</div>' +
    (opt.previewFn ? '<button id="b1" onclick="go(false)">' + opt.previewLabel + '</button>' : '') +
    '<button id="b2" onclick="go(true)">' + opt.applyLabel + '</button>' +
    progressWidget_() +
    '<textarea id="r" readonly></textarea>' +
    '<button onclick="cp()" style="background:#666">📋 結果をコピー</button>' +
    '<script>' +
    'function go(a){if(a&&' + (opt.confirm ? 'true' : 'false') + '&&!confirm(' + JSON.stringify(opt.confirm || '') + '))return;' +
    'var b1=document.getElementById("b1"),b2=document.getElementById("b2");' +
    'if(b1)b1.disabled=true;b2.disabled=true;progShow();' +
    'google.script.run.withSuccessHandler(function(m){document.getElementById("r").value=m;' +
    'progDone("完了しました");if(b1)b1.disabled=false;b2.disabled=false;})' +
    '.withFailureHandler(function(e){progFail(e.message);' +
    'if(b1)b1.disabled=false;b2.disabled=false;})' +
    '.' + opt.fn + '(a);}' +
    'function cp(){var t=document.getElementById("r");t.select();' +
    'try{document.execCommand("copy");alert("コピーしました");}catch(e){alert("長押しで選択してコピー");}}' +
    '</scr' + 'ipt></body></html>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(560).setHeight(opt.height || 620), opt.title);
}

/* ============ 2. 小さな道具 ============ */

function toHalf_(s) {
  return String(s == null ? "" : s)
    .replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, " ")
    .trim();
}

function isHoliday_(d) {
  return HOLIDAYS.indexOf((d.getMonth() + 1) + "/" + d.getDate()) !== -1;
}

function dayColor_(d) {
  const w = d.getDay();
  if (isHoliday_(d) || w === 0) return DAY_COLOR.holi;
  if (w === 6) return DAY_COLOR.sat;
  if (w === 5) return DAY_COLOR.fri;
  return DAY_COLOR.weekday;
}

/** 営業日：当日17:00〜翌16:59を「当日」扱い */
function businessDate_(dt) {
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0);
  if (dt.getHours() < cfgBizStart_()) d.setDate(d.getDate() - 1);
  return d;
}

/** 既存の日付も正午に揃える（時差で日がずれないようにするため） */

/** 手打ちされた値をその場で整える（D・E・F・C・B列） */
function normalizeRow_(r, forSort) {
  // D列 待ち時間：0 / 10 → 0分 / 10分。「不明」はそのまま
  let d = String(r[C_WAIT - 1]).trim();
  if (d !== "") {
    if (/^不明|^ふめい|^\?$/.test(d)) r[C_WAIT - 1] = "不明";
    else {
      const dm = toHalf_(d).match(/(\d{1,3})/);
      r[C_WAIT - 1] = dm ? (parseInt(dm[1], 10) + "分") : d;
    }
  }
  // E列 乗車時間：0000 / 2426 → 00:00 / 00:26。分からないときは ??:??
  const e = toHalf_(String(r[C_TIME - 1]).trim());
  if (e === "" || /^[?？\s]*$/.test(e)) {
    r[C_TIME - 1] = String(r[C_MONEY - 1]).trim() !== "" ? "??:??" : "";
  } else {
    const v = toHHMM_(e.replace(/[^\d:：\.]/g, ""));
    if (v) r[C_TIME - 1] = v;
    else if (!/^\d{1,2}:\d{2}$/.test(e)) r[C_TIME - 1] = "??:??";
  }
  // F列 金額：文字で入っていたら数値に
  const f = String(r[C_MONEY - 1]).trim();
  if (f !== "") {
    const n = parseInt(toHalf_(f).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n)) r[C_MONEY - 1] = n;
  }
  // C列 付け時間：E − D
  const c = calcStartTime_(r[C_TIME - 1], r[C_WAIT - 1]);
  if (c) r[C_START - 1] = c;
  return r;
}


/** I列1行目の注意書き。時刻の部分だけ色を変える */
function putNoticeRow_(sheet) {
  const msg  = "※毎日17:00～17:05 アプデの為 更新禁止";
  const hi   = "17:00～17:05";
  const at   = msg.indexOf(hi);
  const base = SpreadsheetApp.newTextStyle()
    .setFontSize(6).setBold(true).setForegroundColor("#000000").build();
  const red  = SpreadsheetApp.newTextStyle()
    .setFontSize(6).setBold(true).setForegroundColor("#990000").build();

  const cell = sheet.getRange(1, C_OTHER);
  try {
    let b = SpreadsheetApp.newRichTextValue().setText(msg).setTextStyle(base);
    if (at >= 0) b = b.setTextStyle(at, at + hi.length, red);
    cell.setRichTextValue(b.build());
  } catch (e) {
    cell.setValue(msg).setFontSize(6).setFontWeight("bold").setFontColor("#000000");
  }
  cell.setHorizontalAlignment("left").setVerticalAlignment("middle")
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW);
}

/** 先頭・末尾に残った引用符を落とす */
function stripQuote_(v) {
  return String(v).replace(/^["'\u201C\u201D\u2018\u2019]+/, "").replace(/["'\u201C\u201D\u2018\u2019]+$/, "").trim();
}

function noon_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

/** 営業時間の並び順（17時起点）。"23:48"→23.8 / "00:08"→24.13 */
function timeRank_(hhmm) {
  const m = String(hhmm).match(/(\d{1,2}):(\d{2})/);
  if (!m) return 999;   // ??:?? はその営業日の最後に置く
  let h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h < cfgBizStart_()) h += 24;
  return h + mi / 60;
}

function pad2_(n) { return ("0" + n).slice(-2); }

/** E列(乗車時間) - D列(待ち時間) = C列(付け時間) */
function calcStartTime_(timeStr, waitStr) {
  const m = String(timeStr).match(/(\d{1,2}):(\d{2})/);
  if (!m) return "";
  if (/不明/.test(String(waitStr))) return "";
  const w = parseInt(String(waitStr).replace(/[^0-9]/g, ""), 10);
  if (isNaN(w)) return "";
  let total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) - w;
  while (total < 0) total += 1440;
  return pad2_(Math.floor(total / 60) % 24) + ":" + pad2_(total % 60);
}

/** スプレッドシートのタイムゾーンを日本に揃える（日付が1日ずれるのを防ぐ） */
function ensureTimeZone_(ss) {
  try {
    if (ss.getSpreadsheetTimeZone() !== "Asia/Tokyo") ss.setSpreadsheetTimeZone("Asia/Tokyo");
  } catch (e) { logErr_("timezone", e); }
}

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty("LINE_TOKEN") || "";
}




/* ---- I列（そのほか）の整え ---- */

// 雑談・注意喚起として I列に入れない語
const CHAT_DROP_RE = /(ありがとう|工事|お疲れ|よろしく|すみません|ごめん|了解|おはよう|こんばんは)|(ます|ました|ません|ますね|でした|ですね|しよう|かも)$/;
// これが入っていたら、その投稿は記録そのものをやめる
const CHAT_STOP_RE = /(こんな感じで|お願いします|お願いいたします|よろしくお願い|確認してください|でしょうか|ですかね|してください)/;

function dropChatWords_(v) {
  const parts = String(v).replace(/\n/g, "、").split(/[、,]/)
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return x !== "" && !CHAT_DROP_RE.test(x); });
  return parts.join("、");
}

/**
 * I列の内容そのものを整える（改行位置ではなく中身のルール）
 *   ・「バラシ」の前で改行。直前の「、」空白「：」は消す
 *   ・「行先:」の半角コロンを全角に
 */
function normalizeOther_(v) {
  let t = stripQuote_(String(v).replace(/\n/g, "、"));
  t = t.replace(/行先\s*[:：]\s*/g, "行先：");
  t = t.replace(/[、,\s　:：]*((?:バラシ|バラし|ﾊﾞﾗｼ|ばらし|ばラシ|パラシ|パラし|ﾊﾟﾗｼ|ぱらし|ぱラシ))/g, "\n$1");
  t = t.replace(/^[\n、,\s　]+/, "").replace(/[、,\s　]+$/, "");
  return t;
}

/** I列は「、」を改行に、13文字までで折り返す */
function wrapOther_(v) {
  let t = String(v);
  const forced = t.indexOf("\n") !== -1 ? t.split("\n") : null;
  if (forced) {
    // normalizeOther_ が入れた改行は必ず守る
    return forced.map(function (x) { return wrapOther_(x); }).join("\n");
  }
  if (t.replace(/\n/g, "").length >= 14) t = toHalfAlnum_(t);
  const segs = t.replace(/\n/g, "、").split(/[、,]/)
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return x !== ""; });
  const out = [];
  segs.forEach(function (x) {
    balancedWrap_(x, 14, false).split("\n").forEach(function (y) { if (y) out.push(y); });
  });
  return out.join("\n");
}

/* ============ 2-2. 乗り場名(G列)の自動整形 ============ */

// G列に入ってはいけないもの
const NG_ARROW_RE  = /[→⇒➡▶▷⇨↦]/;                         // 経由の説明
const NG_DEST_RE   = /行先|行き先|降車地|鳴った場所|開始[:：]/;   // 行先メモ
const NG_DATE_RE   = /^\d{1,2}\s*\/\s*\d{1,2}\s*[（(].[）)]$/;   // 営業曜日
const NG_PERSON_RE = /(様\s*[（(]|男性|女性|お客|おじ|おっさん|お姉|お兄|お婆|お爺|リーマン|ホステス|キャスト|外人|ガキ|カップル|\d+\s*名|\d+\s*人組|\d+代)/;
const KANKU_ONLY_RE = /^(関空|ｶﾝｸｳ|カンクウ|KIX|関西空港)$/i;

// 同じ場所とみなして名前を寄せる（上から順に判定）
// whole:true …… 全体を置き換える／なし …… 一致した部分だけ置き換える
const PLACE_ALIAS_RULES = [
  { re: /^(新地\s*)?7\s*番?$/,  out: "新地7",  whole: true },
  { re: /^(新地\s*)?4\s*番?$/,  out: "新地4",  whole: true },
  { re: /^(新地\s*)?5\s*番?$/,  out: "新地5",  whole: true },
  { re: /^新\s*7$/,             out: "新地7",  whole: true },
  { re: /^新\s*4$/,             out: "新地4",  whole: true },
  { re: /^新\s*5$/,             out: "新地5",  whole: true },
  { re: /^16\s*か\s*17$/,      out: "新地16", whole: true, note: "16か17のどちらか" },

  { re: /^お初天神.*$/,          out: "お初",   whole: true },
  { re: /^船大工.*$/,            out: "船大工", whole: true },
  { re: /^大丸\s*(タクシー)?(乗り場|乗場|のりば)$/, out: "大丸", whole: true },

  // マネプラ：乗場マネプラとガチマネプラは別物。ただの「マネプラ」はガチマネプラ扱い
  { re: /^(乗場|乗り場)\s*マネプラ.*$/, out: "乗場マネプラ",   whole: true },
  { re: /^ガチ\s*マネプラ.*$/,          out: "ガチマネプラ",   whole: true },
  { re: /^マネプラ.*$/,                  out: "ガチマネプラ",   whole: true },

  { re: /(あすえ|アスエ|ｱｽｴ)(アリーナ|ｱﾘｰﾅ)?/i, out: "アスエアリーナ" },
  { re: /(せんれじ|センレジ|ｾﾝﾚｼﾞ|セントレジス|ｾﾝﾄﾚｼﾞｽ)/, out: "セントレジス" },
  { re: /(おおたに|オータニ|ｵｰﾀﾆ|ニューオータニ)/,        out: "ニューオータニ" },
  { re: /(コナン像前|コナン像|コナン)/,                    out: "コナン像前" },
  { re: /(帝国ホテル|ﾃｲｺｸﾎﾃﾙ|ていこくほてる|帝国)/,        out: "帝国" }
];

/**
 * レポート集計のときだけ寄せる組み合わせ。
 * 「その名前が1件しかないときに限り、まとめ先へ寄せる」という使い方をする。
 * ここで統一してしまうと別の場所を混ぜてしまうため、記録用スプシでは分けたままにする。
 */
const REPORT_MERGE_RULES = [
  { from: /^江坂$/,               to: "江坂駅前タクシー乗り場" },
  { from: /^天満モスバーガー前$/,  to: "天満" },
  { from: /^ドン2.+$/,            to: "ドン2" }
];

/** 全角英数を半角にする（14文字以上のときだけ使う） */
function toHalfAlnum_(str) {
  return String(str).replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
  }).replace(/　/g, " ");
}

/** 全角1・半角0.5として数えた長さ */
function visualLen_(str) {
  let n = 0;
  for (let i = 0; i < str.length; i++) n += /[\x00-\x7F\uFF61-\uFF9F]/.test(str.charAt(i)) ? 0.5 : 1;
  return n;
}

/**
 * G列の値を整える。
 * 戻り値 { place, toOther } … toOther はI列に回す文字列
 */
function tidyPlace_(rawPlace) {
  let v = stripQuote_(String(rawPlace).replace(/\n/g, "")).trim();
  if (!v) return { place: "", toOther: "" };
  let other = "";

  // ① G列に入ってはいけないもの → まるごとI列へ
  if (NG_DATE_RE.test(v)) return { place: "", toOther: "" };
  if (NG_ARROW_RE.test(v) || NG_DEST_RE.test(v) || KANKU_ONLY_RE.test(v) || NG_PERSON_RE.test(v)) {
    return { place: "", toOther: v };
  }

  // ②「〇〇、〇〇から」「〇〇 〇〇から」→ 前半をG列、後半をI列
  const sp = v.match(/^(.{2,12}?)[、,\s　]+(.{2,}(?:から|より|発)|.*[〜~].*)$/);
  if (sp) { v = sp[1].trim(); other = sp[2].trim(); }

  // ③ 名前を寄せる
  for (let i = 0; i < PLACE_ALIAS_RULES.length; i++) {
    const R = PLACE_ALIAS_RULES[i];
    if (!R.re.test(v)) continue;
    if (R.note) other = other ? (other + " " + R.note) : R.note;
    v = R.whole ? R.out : v.replace(R.re, R.out);
    break;
  }

  // 「〇駅タクシー乗り場」→「〇駅前タクシー乗り場」
  v = v.replace(/駅\s*前?\s*(?:タクシー)?\s*(乗り場|乗場|のりば)/, "駅前タクシー乗り場");

  // 末尾の「から」「より」「発」は不要
  v = v.replace(/(から|より|発)$/, "").trim();

  // ④「〇〇交差点」「〇〇西向き」の前に半角スペースを1つ
  v = v.replace(/\s*交差点/, " 交差点");
  v = v.replace(/\s*([東西南北])\s*向き/, " $1向き");
  v = v.replace(/\s{2,}/g, " ").trim();

  // ⑤ 14文字以上なら全角英数を半角に
  if (visualLen_(v) >= 14) v = toHalfAlnum_(v).replace(/\s{2,}/g, " ").trim();

  return { place: v, toOther: other };
}

/** 決められた語（この語の前後で切ると自然になる） */
const BREAK_WORDS = ["タクシー乗り場", "乗り場", "ロータリー", "センター", "靭公園",
                     "交差点", "アパホテル", "ホテル", "駐車場", "迎賓館"];

/**
 * 指定の文字数を超えたら、2行の長さがなるべく揃う場所で改行する。
 * 空白・句読点・括弧・決められた語を切れ目の候補にする。
 */
function balancedWrap_(str, limit, useWords) {
  const v = String(str).replace(/\n/g, "").trim();
  if (v.length < limit) return v;

  const cands = [];
  const push = function (a, b) {
    const x = a.replace(/[\s　]+$/, ""), y = b.replace(/^[\s　]+/, "");
    if (x && y) cands.push({ a: x, b: y, score: Math.max(visualLen_(x), visualLen_(y)) });
  };

  for (let i = 1; i < v.length - 1; i++) {
    const c = v.charAt(i);
    if (/[\s　]/.test(c))              push(v.slice(0, i), v.slice(i + 1));
    else if (/[、,。]/.test(c))         push(v.slice(0, i + 1), v.slice(i + 1));
    else if (/[（(【「\[]/.test(c))     push(v.slice(0, i), v.slice(i));
    else if (/[）)】」\]]/.test(c))     push(v.slice(0, i + 1), v.slice(i + 1));
    else if (/[：:／\/～〜]/.test(c))   push(v.slice(0, i + 1), v.slice(i + 1));
  }
  if (useWords) {
    BREAK_WORDS.forEach(function (w) {
      const at = v.indexOf(w);
      if (at > 0) push(v.slice(0, at), v.slice(at));
      else if (at === 0 && w.length < v.length) push(v.slice(0, w.length), v.slice(w.length));
    });
  }

  // 何も見つからないとき用の「単純な折り返し」も候補に入れて、短いほうを選ぶ
  const plain = wrapText_(v, limit - 1);
  if (plain.indexOf("\n") !== -1) {
    const pl = plain.split("\n");
    const x = pl[0], y = pl.slice(1).join("");
    // 途中で切る形は最後の手段。少し不利にしておく
    if (x && y) cands.push({ a: x, b: y, score: Math.max(visualLen_(x), visualLen_(y)) + 2 });
  }

  if (!cands.length) return plain;
  cands.sort(function (x, y) { return x.score - y.score; });
  return cands[0].a + "\n" + cands[0].b;
}

/** G列：12文字以上で改行 */
function wrapPlace_(str) { return balancedWrap_(str, 12, true); }


/* ============ 3. LINE受信（doPost） ============ */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents);
    // LINEから届いた時刻を残す。「連携が生きているか」を後で確かめられるようにする
    try {
      PropertiesService.getScriptProperties()
        .setProperty("LAST_LINE", new Date().toISOString());
    } catch (e3) {}
    (body.events || []).forEach(function (ev) {
      try { handleEvent_(ev); } catch (err) { logErr_("handleEvent", err); }
    });
  } catch (err) {
    logErr_("doPost", err);
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleEvent_(ev) {
  // --- 送信取り消し ---
  if (ev.type === "unsend" && ev.unsend && ev.unsend.messageId) {
    deleteByMessageId_(ev.unsend.messageId);
    return;
  }
  if (ev.type !== "message" || !ev.message) return;

  const sentAt = new Date(ev.timestamp || Date.now());

  // --- 画像 ＝ オプチャ情報（他所から持ってきた情報）---
  // テキストは「自分の乗車記録」、画像は「オプチャのスクショ」と決めている。
  // 画像は誰が送っても受け付ける（各自がオプチャを見て、載せたいものを送る運用）。
  if (ev.message.type === "image") {
    handleOpuchaImage_(ev, sentAt);
    return;
  }

  if (ev.message.type !== "text") return;

  // --- 「0904」「↑0904」だけの1行 ＝ スクショの日付メモ ---
  // オプチャは過去の投稿を探してから送るので、送った日と乗った日がずれる。
  // これは画像と同じく誰が打ってもよい（画像を送れるのが全員なので）。
  const quoted = (ev.message.quotedMessageId || "") !== "";
  const note = parseDateNote_(ev.message.text, sentAt, quoted);
  if (note) { handleDateNote_(ev, note); return; }

  // --- テキスト ＝ 自分の乗車記録 ---
  // こちらは登録済みの5人だけ。誰の実績かを個人タブに記録するため。
  const userId = (ev.source && ev.source.userId) || "";
  const tabName = SENDER_MAP[userId];
  if (!tabName) return;

  const rec = parseRideMessage_(ev.message.text, sentAt);
  if (!rec) return;              // 記録として読めないものは雑談。何もしない
  rec.ownerTab  = tabName;
  rec.sender    = tabName;
  rec.messageId = ev.message.id || "";
  writeRecord_(rec);
}


/* ============ 3-2. 画像（オプチャのスクショ）の取り込み ============ */

/**
 * 送られてきたスクショから乗車記録を読み取って、A列を「ｵﾌﾟﾁｬ」として記録する。
 * 個人タブには入れない。乗り場から決まるタブ（多くは関空）に入れる。
 *
 * スクショを2枚以上まとめて送った（連投）ときは、全部そろうのを待ってから
 * まとめて1回だけ返信する。1枚ずつ返信すると通知が何回も鳴ってうるさいため。
 */
function handleOpuchaImage_(ev, sentAt) {
  const msg   = ev.message || {};
  const mid   = msg.id || "";
  const reply = ev.replyToken || "";

  // LINEは応答が遅いと同じイベントを送り直してくる。二重に記録しないよう印を置く
  const cache = CacheService.getScriptCache();
  if (mid && cache.get("IMG_" + mid)) return;
  if (mid) cache.put("IMG_" + mid, "1", 900);

  // --- 連投かどうかを見る ---
  // スマホで写真を複数選んで送ると、LINEが imageSet（何枚目／全何枚）を付けてくる。
  // 付かない送り方もあるので、そのときは「同じ人が90秒以内に続けて送った」で数える。
  const set   = msg.imageSet || null;
  const total = (set && Number(set.total) > 0) ? Number(set.total) : 1;
  const idx   = (set && Number(set.index) > 0) ? Number(set.index)
              : (set ? 1 : opuchaBurstSeq_(ev));

  const who = opuchaSenderName_(ev);   // アイコン名（表示名）
  const uid = (ev.source && ev.source.userId) || "anon";

  // 「↓0904」のように、先に日付を打ってからスクショを送った場合はそれを使う
  const pend = cache.get("PENDDATE_" + uid);
  let bizD = businessDate_(sentAt);
  let dateFromNote = false;
  if (pend) {
    const pd = ymdToDate_(pend);
    if (pd) { bizD = pd; dateFromNote = true; }
    cache.remove("PENDDATE_" + uid);
  }
  // 「↑0904」のように、後から日付を打てるように、最後のスクショを覚えておく
  if (mid) cache.put("LASTIMG_" + uid, mid, 3600);

  // read は「そのスクショから読み取れた乗車記録の件数」。
  // 1枚に2件以上写っていることがあるので、何件中の何件が不備かを返信に書くために持つ。
  const r = { idx: idx, read: 0, ok: 0, ng: [] };
  try {
    const list = opuchaFromImage_(mid);
    r.read = list.length;
    if (!list.length) {
      r.ng.push("乗車記録が写っていません（時刻・金額・乗り場のどれも読み取れませんでした）");
    } else {
      const res = writeOpuchaRecords_(list, mid, bizD);
      r.ok = res.wrote;
      r.suspect = res.suspect || 0;
      r.ng = r.ng.concat(res.skipped);
    }
  } catch (e) {
    logErr_("opuchaImage", e);
    r.ng.push(e.message || "スクショを読み取れませんでした");
  }

  if (dateFromNote && r.ok) r.note = "営業曜日は " + fmtDateW_(bizD) + " で登録しました";
  opuchaReplyBurst_(reply, who, r, set, total);
}


/* ============ 3-3. スクショの日付メモ（「0904」「↑0904」）============ */

/** 2026/09/04 → "9/4(金)" */
function fmtDateW_(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return (d.getMonth() + 1) + "/" + d.getDate() + "(" + w[d.getDay()] + ")";
}

/** "2026-09-04" → Date（営業曜日として使うので昼12時にそろえる） */
function ymdToDate_(ymd) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/** Date → "2026-09-04" */
function dateToYmd_(d) {
  return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate());
}

// 矢印。向いた先のスクショが対象になる。
// 上・左 ＝ もう送ったスクショ（画面の上にある）／下・右 ＝ これから送るスクショ
const ARROW_PREV = /[\u2191\u2196\u2197\u21D1\u2B06\u25B2\u25B3\u{1F53C}\u{1F446}\u2934\u2190\u2196\u21D0\u2B05\u25C0\u25C1\u{1F448}]/u;
const ARROW_NEXT = /[\u2193\u2198\u2199\u21D3\u2B07\u25BC\u25BD\u{1F53D}\u{1F447}\u2935\u2192\u21D2\u27A1\u25B6\u25B7\u{1F449}]/u;
const ARROW_ANY  = /[\u2190-\u21FF\u2B05-\u2B07\u25B2-\u25C1\u2934\u2935\u27A1\u{1F53C}\u{1F53D}\u{1F446}-\u{1F449}]/u;

/**
 * 「↑0904」または「（スクショにリプライして）0904」だけの1行かどうかを見る。
 * 当てはまれば { bizDate: Date, dir: "prev"|"next"|"" } を返す。違えば null。
 *
 * 矢印もリプライも無い、ただの数字は雑談とみなして何もしない（null）。
 * 「1」「3」のような相づちに反応してしまうため。
 *
 * 書き方（どちらでもよい）:
 *   数字だけ  … 月日はかならず4桁。0905
 *               年も変えるなら先頭に足す。260905 / 20260905
 *               （区切りが無いと 895 を 8月95日か89月5日か決められないため）
 *   区切りあり … けた数は自由。9/5 ／ 9月5日 ／ 9-5
 *               年も変えるなら先頭に足す。26/9/5 ／ 2026年9月5日
 * 年を書かなければ送った年のまま。書いたらそのとおりの年にする。
 * 1〜3桁の年（8 / 28 / 026）は、下けたが合う年のうち今年にいちばん近いものを選ぶ。
 */
function parseDateNote_(text, sentAt, isReply) {
  let t = String(text == null ? "" : text).trim();
  if (!t || t.indexOf("\n") !== -1 || t.indexOf("\r") !== -1) return null;  // 1行だけが条件

  // 矢印を取り除きつつ、向きを覚える
  let dir = "";
  if (ARROW_ANY.test(t)) {
    dir = ARROW_PREV.test(t) ? "prev" : (ARROW_NEXT.test(t) ? "next" : "prev");
    t = t.replace(new RegExp(ARROW_ANY.source, "gu"), "");
    t = t.replace(/[\uFE0F\u200D]/g, "");     // 絵文字の飾り（異体字セレクタ等）
  }
  t = t.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
       .trim();

  // 区切りをそろえる（年・月・- ・. はぜんぶ「/」にして、末尾の「日」は落とす）
  t = t.replace(/[年月]/g, "/").replace(/日\s*$/, "").replace(/[\-\.]/g, "/").trim();
  t = t.replace(/\/+$/, "");                 // 「9/5/」のような余りを落とす

  // 数字と「/」だけの短い1行でなければ、日付メモではない
  if (!/^[0-9]+(\/[0-9]+)*$/.test(t) || t.length > 10) return null;

  // 「どのスクショのことか」が分からないものは日付メモとみなさない。
  // 矢印を付けるか、スクショにリプライして送るか、どちらかが要る。
  // これが無いと「1」のような相づちにも反応してしまう。
  if (!dir && !isReply) return null;

  // ここから先は、読めなくても黙らずに「書き方」を返す。

  const now = sentAt || new Date();
  let y, mo, da;

  if (t.indexOf("/") === -1) {
    // --- 数字だけ ---
    // 区切りが無いと 895 が「8月95日」か「89月5日」か決められない。
    // なので月日は4桁と決めている。年を足すぶんだけ長くなる。
    if (t.length < 4) {
      return { error: true, input: t, dir: dir, why: "数字だけのときは4桁です" };
    }
    if (t.length > 8) {
      return { error: true, input: t, dir: dir, why: "けたが多すぎます" };
    }
    if (t.length === 4) {
      y = now.getFullYear();                   // 年を書かなければ、送った年
      mo = +t.slice(0, 2); da = +t.slice(2);
    } else {
      // 5〜8桁 ＝ 先頭が年、うしろ4桁が月日
      y  = resolveYear_(t.slice(0, t.length - 4), now.getFullYear());
      mo = +t.slice(-4, -2); da = +t.slice(-2);
    }
  } else {
    // --- 区切りあり（9/5 ／ 9月5日 ／ 2026/9/5 など）---
    // 区切りがあれば読み違えようがないので、けた数は自由
    const q = t.split("/");
    if (q.length === 2)      { y = now.getFullYear(); mo = +q[0]; da = +q[1]; }
    else if (q.length === 3) { y = resolveYear_(q[0], now.getFullYear()); mo = +q[1]; da = +q[2]; }
    else return { error: true, input: t, dir: dir, why: "区切りが多すぎます" };
  }

  if (!(mo >= 1 && mo <= 12)) {
    return { error: true, input: t, dir: dir, why: mo + "月という月はありません" };
  }
  if (!(da >= 1 && da <= 31)) {
    return { error: true, input: t, dir: dir, why: da + "日という日はありません" };
  }
  const d = new Date(y, mo - 1, da, 12, 0, 0);
  if (d.getMonth() !== mo - 1 || d.getDate() !== da) {
    return { error: true, input: t, dir: dir, why: mo + "月" + da + "日はありません" };
  }

  return { bizDate: d, dir: dir };
}

/**
 * 日付が読めなかったときに返す案内。
 * 「何がだめだったか」→「日付の書き方」→「どのスクショに効かせるか」の順。
 * 例は今日の日付で作るので、そのまま真似すれば通る。
 */
function dateNoteHelp_(input, why) {
  const now = new Date();
  const m   = now.getMonth() + 1;
  const d   = now.getDate();
  const md  = pad2_(m) + pad2_(d);                       // 例: 0905
  const yy  = String(now.getFullYear()).slice(-2);       // 例: 26

  return [
    "📅 日付が読み取れませんでした：「" + input + "」",
    (why ? "　" + why : ""),
    "",
    "▼ 日付の書き方（どちらでも）",
    "　数字だけ　→ かならず4桁　" + m + "月" + d + "日 は " + md,
    "　区切りあり → けた数は自由　" + m + "/" + d + "　" + m + "月" + d + "日　" + m + "-" + d,
    "　年も変えるときは、先頭に年を足す",
    "　　" + yy + md + "　" + yy + "/" + m + "/" + d + "　（" + now.getFullYear() + " と4桁でも可）",
    "",
    "▼ どのスクショの日付か、かならず付けてください",
    "　① そのスクショに リプライ して　" + md,
    "　② 矢印を添えて送る",
    "　　↑" + md + "　… 矢印が指す上のスクショ（さっき送ったもの）",
    "　　↓" + md + "　… 矢印が指す下のスクショ（このあと送るもの）",
    "",
    "矢印は ↑↓ でも ⬆️⬇️ でもかまいません。",
    "どちらも無いと、ただの雑談として読み飛ばします。",
    "何も送らなければ、送った日の営業曜日で登録します。"
  ].filter(function (x, i) { return !(i === 1 && x === ""); }).join("\n");
}

/** 年の下けた（"8" "28" "028" "2028"）から、今年にいちばん近い年を決める */
function resolveYear_(ys, thisYear) {
  const n = String(ys).replace(/[^0-9]/g, "");
  if (n.length >= 4) return +n;
  const mod = Math.pow(10, n.length);
  const want = +n % mod;
  let best = null;
  for (let y = thisYear - 20; y <= thisYear + 20; y++) {
    if (y % mod !== want) continue;
    const dNew = Math.abs(y - thisYear), dOld = best === null ? 999 : Math.abs(best - thisYear);
    // 同じ近さなら過去のほうを選ぶ（オプチャは過去の投稿なので）
    if (dNew < dOld || (dNew === dOld && y < best)) best = y;
  }
  return best === null ? thisYear : best;
}

/**
 * 日付メモを受けて、対象のスクショの営業曜日を直す。
 *  ・スクショにリプライして打った → そのスクショ（quotedMessageId で分かる）
 *  ・矢印が「前」を向いている     → 直前に自分が送ったスクショ
 *  ・矢印が「後」を向いている     → まだ来ていないので、次のスクショまで取っておく
 */
function handleDateNote_(ev, note) {
  const reply = ev.replyToken || "";

  // 読めなかったときは、何がだめで、どう書けばよいかを返す
  if (note.error) { lineReply_(reply, dateNoteHelp_(note.input, note.why)); return; }

  const uid   = (ev.source && ev.source.userId) || "anon";
  const cache = CacheService.getScriptCache();
  const quoted = (ev.message && ev.message.quotedMessageId) || "";
  const label  = fmtDateW_(note.bizDate);

  // 「↓0904」＝これから送るスクショの日付。取っておいて、次の画像で使う
  if (!quoted && note.dir === "next") {
    cache.put("PENDDATE_" + uid, dateToYmd_(note.bizDate), 3600);
    lineReply_(reply, "\U0001F4C5 次に送るスクショを " + label + " として取り込みます");
    return;
  }

  const mid = quoted || cache.get("LASTIMG_" + uid) || "";
  if (!mid) {
    // まだスクショが来ていない。前向きの矢印でも、次のスクショに使えるようにしておく
    cache.put("PENDDATE_" + uid, dateToYmd_(note.bizDate), 3600);
    lineReply_(reply, "\U0001F4C5 直前のスクショが見つからなかったので、" +
                      "次に送るスクショを " + label + " として取り込みます");
    return;
  }

  let n = 0;
  try { n = fixOpuchaDate_(mid, note.bizDate); }
  catch (e) { logErr_("fixOpuchaDate", e); lineReply_(reply, "\u274C 日付を直せませんでした\n" + e.message); return; }

  if (!n) {
    lineReply_(reply, "\U0001F4C5 直す行が見つかりませんでした。" +
                      "取り込めていないスクショか、すでに消された行かもしれません。");
    return;
  }
  lineReply_(reply, "\U0001F4C5 営業曜日を " + label + " に直しました（" + n + "件）");
}

/**
 * そのスクショから入った行（J列に messageId が入っている）の営業曜日を書き換える。
 * オプチャ行はエリアタブと関空・ﾊﾞﾗｼにしか入らないので、そこだけ見る。
 */
function fixOpuchaDate_(mid, bizDate) {
  if (!mid) return 0;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const touched = [];
  let n = 0;

  AREA_TABS.concat(FLAG_TABS).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    const rows = last - START_ROW + 1;
    const links = sh.getRange(START_ROW, C_LINK, rows, 1).getValues();
    const dates = sh.getRange(START_ROW, C_DATE, rows, 1).getValues();
    let hit = false;
    for (let i = 0; i < rows; i++) {
      const v = String(links[i][0]).trim();
      if (v !== mid && v.indexOf(mid + "-") !== 0) continue;
      dates[i][0] = new Date(bizDate.getTime());
      hit = true; n++;
    }
    if (!hit) return;
    sh.getRange(START_ROW, C_DATE, rows, 1).setValues(dates);   // 1タブ1回だけ書く
    touched.push(name);
  });

  // 日付が変われば並び順も変わるので、触ったタブだけ整形しなおす
  touched.forEach(function (name) {
    try { formatTab_(ss.getSheetByName(name)); } catch (e) { logErr_("format:" + name, e); }
  });
  if (touched.length) touchStamp_(ss, touched);
  return n;
}

/**
 * imageSet が付かない送り方のとき、同じ人が続けて送った枚数を数える。
 * 90秒たつと数えなおす（別の投稿とみなす）。
 */
function opuchaBurstSeq_(ev) {
  const uid = (ev.source && ev.source.userId) || "anon";
  const cache = CacheService.getScriptCache();
  const key = "IMGSEQ_" + uid;
  let n = parseInt(cache.get(key), 10);
  n = (isNaN(n) ? 0 : n) + 1;
  cache.put(key, String(n), 90);
  return n;
}

/**
 * 送り主のアイコン名（LINEの表示名）を取る。
 * グループ・複数人トーク・1対1で取り方が違うので、送信元に合わせて呼び分ける。
 * 取れなければ、登録済みの5人ならタブ名を使う。それも無ければ空文字。
 */
function opuchaSenderName_(ev) {
  const src = ev.source || {};
  const uid = src.userId || "";
  if (!uid) return "";

  let url = "";
  if (src.type === "group" && src.groupId) {
    url = "https://api.line.me/v2/bot/group/" + encodeURIComponent(src.groupId) +
          "/member/" + encodeURIComponent(uid);
  } else if (src.type === "room" && src.roomId) {
    url = "https://api.line.me/v2/bot/room/" + encodeURIComponent(src.roomId) +
          "/member/" + encodeURIComponent(uid);
  } else {
    url = "https://api.line.me/v2/bot/profile/" + encodeURIComponent(uid);
  }

  try {
    const res = UrlFetchApp.fetch(url, {
      headers: { "Authorization": "Bearer " + getToken_() },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const name = String(JSON.parse(res.getContentText()).displayName || "").trim();
      if (name) return name;
    }
  } catch (e) { logErr_("opuchaSenderName", e); }

  return SENDER_MAP[uid] || "";
}

/**
 * 連投のときは全部そろうまで結果をためておき、最後の1枚が来たらまとめて返信する。
 * 1枚だけのときはその場で返信する。
 */
function opuchaReplyBurst_(replyToken, who, r, set, total) {
  if (!set || total <= 1) {
    lineReply_(replyToken, opuchaReplyText_(who, [r], 1));
    return;
  }

  const cache = CacheService.getScriptCache();
  const key = "IMGSET_" + set.id;

  // 同時に届くので、ためる所は1つずつ触る
  const lock = LockService.getScriptLock();
  let got = false;
  try { lock.waitLock(15000); got = true; } catch (e) {}

  let acc = [];
  try { acc = JSON.parse(cache.get(key) || "[]"); } catch (e) { acc = []; }
  acc.push(r);
  cache.put(key, JSON.stringify(acc), 900);
  const done = (acc.length >= total);
  if (done) cache.remove(key);

  if (got) { try { lock.releaseLock(); } catch (e) {} }

  if (!done) return;                    // まだ途中。最後の1枚の返信でまとめて出す
  acc.sort(function (a, b) { return a.idx - b.idx; });
  lineReply_(replyToken, opuchaReplyText_(who, acc, total));
}

/**
 * 返信の文面を作る。
 * ・全部うまくいった → 1枚なら黙る／連投なら結果だけ short に伝える
 * ・不備があった   → 「〇〇様データは〜」の形で、何枚目の何がダメだったかを書く
 */
function opuchaReplyText_(who, arr, total) {
  const sama = who ? String(who).trim() + "様" : "";
  let ok = 0;
  arr.forEach(function (x) { ok += x.ok; });
  const bad = arr.filter(function (x) { return x.ng && x.ng.length; });

  const notes = [];
  arr.forEach(function (x) {
    if (x.note) notes.push(x.note);
    if (x.suspect) notes.push("⚠️ 要確認が" + x.suspect + "件あります（K列を見てください）");
  });

  if (!bad.length) {
    // 1枚で全部通ったときは黙る。ただし日付を直した／要確認が出たときは伝える
    if (total <= 1 && !notes.length) return "";
    const head = (total <= 1)
      ? "📷 " + sama + ok + "件を取り込みました"
      : "📷 " + sama + "スクショ" + total + "枚を取り込みました（合計" + ok + "件）";
    return [head].concat(uniq_(notes)).join("\n");
  }

  const lines = [];
  lines.push("📷 " + (sama ? sama + "データは、" : "いただいたデータは、") +
             "下の内容が不備で");
  lines.push("レポート作成に不十分と判断したため、自動反映できませんでした。");
  lines.push("");

  bad.forEach(function (x) {
    // imageSet が付かない送り方でも、2枚目以降なら「〇枚目」と書く
    const head = (total > 1 || x.idx > 1) ? "【" + x.idx + "枚目】" : "【このスクショ】";
    // 1枚に2件以上写っていたときは、何件中の何件がダメだったのかを添える
    lines.push(head + (x.read > 1
      ? " 読み取れた" + x.read + "件のうち" + x.ng.length + "件が不備です"
      : ""));
    x.ng.slice(0, 8).forEach(function (m) { lines.push("　・" + m); });
    if (x.ng.length > 8) lines.push("　・ほか" + (x.ng.length - 8) + "件");
    lines.push("");
  });

  if (ok > 0) lines.push("※ ほか" + ok + "件は取り込みました。");
  uniq_(notes).forEach(function (m) { lines.push(m); });
  lines.push("お手数ですが、時刻・金額・乗り場が写るように撮り直して送ってください。");
  return lines.join("\n");
}

/** LINEに返信する。返信できなくても処理は止めない */
function lineReply_(replyToken, text) {
  if (!replyToken) return;
  if (!String(text || "").trim()) return;
  try {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: { "Content-Type": "application/json",
                 "Authorization": "Bearer " + getToken_() },
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: "text", text: String(text).slice(0, 4900) }]
      }),
      muteHttpExceptions: true
    });
  } catch (e) { logErr_("lineReply", e); }
}

/**
 * Geminiの鍵とモデル名は 003-LineReport.gs 側にある。
 * 同じプロジェクトに置いてあれば使えるが、無い場合にそなえて確かめてから呼ぶ。
 * （呼べないと ReferenceError になり、原因が分かりにくいため）
 */
function geminiReady_() {
  if (typeof getGeminiKey_ !== "function" || typeof getGeminiModel_ !== "function") {
    throw new Error("003-LineReport.gs が入っていません。同じプロジェクトに追加してください。");
  }
  const k = getGeminiKey_();
  if (!k) throw new Error("Geminiのキーが未設定です（メニュー「🤖 Geminiキーを設定」）");
  return { key: k, model: getGeminiModel_() };
}

/** スクショを読む指示文。JSONだけを返させる */
const OPUCHA_IMAGE_PROMPT =
  "これはタクシー運転手のグループチャットのスクリーンショットです。\n" +
  "写っている投稿から「1回の乗車の記録」を全部抜き出してください。\n" +
  "1枚のスクショに投稿が2件以上写っていることがよくあります。\n" +
  "写っているぶんは、上から順に1件ずつ、すべて配列に入れてください。\n" +
  "出力は JSON の配列だけ。前置きも説明も書かないでください。\n" +
  "各要素の形:\n" +
  '{"name":"投稿者名","time":"HH:MM","money":12300,"place":"乗り場","dest":"行先","wait":15,"note":"補足"}\n' +
  "・name はその投稿の左上に出ている投稿者の表示名。読めなければ空文字\n" +
  "・time は乗車した時刻。26:15 や 29:15 のような24時超えの表記は 02:15 / 05:15 に直す\n" +
  "・money は金額の数値だけ（円・カンマは外す）\n" +
  "・place は乗せた場所、dest は降ろした場所。分からなければ空文字\n" +
  "・wait は待ち時間の分数。分からなければ null\n" +
  "・note はそれ以外の補足。無ければ空文字\n" +
  "・乗車記録でない雑談は含めない\n" +
  "・1件も無ければ [] だけを返す";

/**
 * LINEから画像を取ってきて、Geminiに読ませる。
 * 戻り値は {time, money, place, dest, wait, note} の配列。
 */
function opuchaFromImage_(messageId) {
  if (!messageId) throw new Error("画像のIDが取れませんでした");
  const g = geminiReady_();

  // ① LINEから画像を取る
  const res = UrlFetchApp.fetch(
    "https://api-data.line.me/v2/bot/message/" + encodeURIComponent(messageId) + "/content",
    { headers: { "Authorization": "Bearer " + getToken_() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error("画像を取得できませんでした（" + res.getResponseCode() + "）");
  }
  const blob = res.getBlob();

  // ② Geminiに読ませる
  const out = UrlFetchApp.fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + g.model +
    ":generateContent?key=" + encodeURIComponent(g.key),
    { method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ parts: [
        { text: OPUCHA_IMAGE_PROMPT },
        { inline_data: { mime_type: blob.getContentType() || "image/jpeg",
                         data: Utilities.base64Encode(blob.getBytes()) } }
      ]}]})});
  if (out.getResponseCode() !== 200) {
    let why = out.getContentText().slice(0, 150);
    try { why = JSON.parse(out.getContentText()).error.message; } catch (e) {}
    throw new Error("AIが読めませんでした（" + out.getResponseCode() + "）" + why);
  }

  // ③ JSONを取り出す（``` で囲って返してくることがあるので外す）
  let text = "";
  try {
    text = JSON.parse(out.getContentText()).candidates[0].content.parts[0].text;
  } catch (e) { throw new Error("AIの返事を読めませんでした"); }
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr;
  try { arr = JSON.parse(m[0]); } catch (e) { throw new Error("AIの返事がJSONではありませんでした"); }
  return Array.isArray(arr) ? arr : [];
}

/** 同じ文言を何度も並べない */
function uniq_(arr) {
  const seen = {}, out = [];
  (arr || []).forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
  return out;
}

/** 不備を知らせるときの「どの行のことか」の目印を作る */
function opuchaLabel_(x) {
  const t = String((x && x.time) || "").trim();
  const m = parseInt(String((x && x.money) || "").replace(/[^0-9]/g, ""), 10);
  const p = String((x && x.place) || "").trim();
  const bits = [];
  bits.push(t || "時刻なし");
  bits.push(isNaN(m) ? "金額なし" : "￥" + m.toLocaleString());
  if (p) bits.push(p);
  return bits.join(" ");
}

/**
 * 読み取った内容を、条件で絞ってからシートに書く。
 * 個人タブには入れない。A列は「ｵﾌﾟﾁｬ」。
 *
 * 戻り値は { wrote: 書いた件数, skipped: 取り込めなかった理由の配列 }。
 * 落としたものを黙って捨てず、理由を持ち帰って送り主に伝えるため。
 */
function writeOpuchaRecords_(list, messageId, bizDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const buckets = {};
  ALL_TABS.forEach(function (n) { buckets[n] = []; });
  let wrote = 0;
  const skipped = [];
  const bd = bizDate || businessDate_(new Date());
  const seen = opuchaExistingKeys_(ss);
  const own  = ownRideIndex_(ss);      // 自分たちの記録（個人タブ）の一覧
  let suspect = 0;
  // 設定は行ごとに読み直さず、はじめに1回だけ取っておく
  const minYen    = cfgOpuMinYen_();
  const fromMin   = cfgOpuFrom_();
  const toMin     = cfgOpuTo_();
  const hoursText = cfgHoursText_();

  list.forEach(function (x, i) {
    const tag = opuchaLabel_(x) + " → ";

    const money = parseInt(String(x.money).replace(/[^0-9]/g, ""), 10);
    if (isNaN(money)) { skipped.push(tag + "金額が読み取れません"); return; }
    if (money < minYen) {
      skipped.push(tag + "金額が￥" + minYen.toLocaleString() + "未満です");
      return;
    }

    const time = toHHMM_(String(x.time || "").replace(/[^\d:：\.]/g, ""));
    if (!time) { skipped.push(tag + "乗車時刻が読み取れません"); return; }

    // 僕らが走れるのは 18:00〜翌05:30。この外は、そもそも行けない時間なので入れない
    const tm = time.split(":");
    const min = parseInt(tm[0], 10) * 60 + parseInt(tm[1], 10);
    if (!(min >= fromMin || min <= toMin)) {
      skipped.push(tag + "乗車時刻が " + hoursText +
                   " の外です。私たちでは乗車不可な時間のため、除外します");
      return;
    }

    const note = [x.dest ? "行先：" + x.dest : "", x.note || ""].filter(String).join(" ");
    const all = [x.place, x.dest, x.note].join(" ");
    if (OPUCHA_EXCLUDE.test(all)) {
      skipped.push(tag + "DiDi・連続配車は集計の対象外です");
      return;
    }

    const tp = tidyPlace_(String(x.place || ""));
    if (!tp.place) { skipped.push(tag + "乗り場が読み取れません"); return; }

    // 同じ内容がもう入っていたら足さない（同じスクショを二度送ったとき用）
    const cat0 = categoryOf_(tp.place);
    const dk = dedupKey_(cat0, bd, time, money);
    if (seen[dk]) { skipped.push(tag + "同じ内容がすでに登録されています"); return; }
    seen[dk] = true;

    // --- 身内の投稿が写り込んでいないか見る ---
    // スクショの中の名前が身内で、中身も手持ちの記録とそっくりなら、それは自分たちの
    // 乗車がオプチャに流れてきただけ。オプチャとして足すと二重になるので外す。
    const mineTab = memberFromScreenName_(x.name);
    const nearTab = ownNearMatch_(own, bd, time, money);
    if (mineTab && nearTab) {
      skipped.push(tag + "「" + String(x.name).trim() + "」さんの投稿で、" +
                   nearTab + "タブの記録と同じ内容です（二重登録のため除外）");
      return;
    }
    let mark = "🆕";
    let warn = "";
    if (mineTab) {
      mark = "⚠️";
      warn = "要確認：身内（" + mineTab + "）の名前の投稿です";
    } else if (nearTab) {
      mark = "⚠️";
      warn = "要確認：" + nearTab + "タブの記録と内容が近いです";
    }
    if (warn) suspect++;

    const w = parseInt(x.wait, 10);
    const rec = {
      bizDate: bd,
      time: time, money: money,
      wait: isNaN(w) ? "" : (w + "分"),
      startTime: "",
      place: tp.place,
      method: "",
      other: [note, tp.toOther, warn].filter(String).join(" "),
      sender: OPUCHA_TAB,                      // A列は「ｵﾌﾟﾁｬ」
      mark: mark,
      messageId: messageId ? (messageId + "-" + i) : ""
    };

    const row = buildRow_(rec);
    const cat = categoryOf_(rec.place);
    if (buckets[cat]) buckets[cat].push(row);
    // 行先が関空なら関空タブにも入れる（オプチャ情報の多くはこれ）
    if (KANKU_RE.test(all)) buckets["関空"].push(row.slice());
    if (BARASI_RE.test(all)) buckets["ﾊﾞﾗｼ"].push(row.slice());
    wrote++;
  });

  const touched = [];
  ALL_TABS.forEach(function (name) {
    const rows = buckets[name];
    if (!rows.length) return;
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const st = Math.max(sh.getLastRow() + 1, START_ROW);
    if (sh.getMaxRows() < st + rows.length) {
      sh.insertRowsAfter(sh.getMaxRows(), st + rows.length - sh.getMaxRows());
    }
    sh.getRange(st, 1, rows.length, LAST_COL).setValues(rows);
    touched.push(name);
  });
  touched.forEach(function (n) {
    try { formatTab_(ss.getSheetByName(n)); } catch (e) { logErr_("format:" + n, e); }
  });
  if (touched.length) touchStamp_(ss, touched);
  return { wrote: wrote, skipped: skipped, suspect: suspect };
}

/**
 * スクショに写っていた投稿者名が、身内の誰かかどうかを見る。
 * 表示名の対応表（DISPLAY_NAME_MAP）を先に見て、だめならタブ名そのものと比べる。
 */
function memberFromScreenName_(name) {
  const raw = String(name == null ? "" : name).trim();
  if (!raw) return "";

  const byMap = tabFromDisplayName_(raw);
  if (byMap) return byMap;

  // 「ﾀﾞｲｽｹ」「ダイスケ」のような、タブ名そのままの表示名も拾う
  const norm = function (v) {
    return toFullKana_(String(v)).replace(/[\s　さん様くん君ちゃん]/g, "").toUpperCase();
  };
  const n = norm(raw);
  if (!n) return "";
  let hit = "";
  PERSONAL_TABS.forEach(function (t) {
    const tn = norm(t);
    if (!tn || hit) return;
    if (n === tn || n.indexOf(tn) !== -1) hit = t;
  });
  return hit;
}

/**
 * 個人タブの記録を「営業曜日＋金額」で引ける形にまとめる。
 * 同じ乗車がオプチャにも流れてきたときに気づくために使う。
 */
function ownRideIndex_(ss) {
  const idx = {};
  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
      const d = r[C_DATE - 1];
      if (!(d instanceof Date)) return;
      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money)) return;
      const min = hhmmToMin_(String(r[C_TIME - 1]));
      if (min === null) return;
      const k = dateToYmd_(d) + "|" + money;
      (idx[k] = idx[k] || []).push({ tab: name, min: min });
    });
  });
  return idx;
}

/** "23:15" → 1395。読めなければ null */
function hhmmToMin_(s) {
  const m = String(s).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return (+m[1]) * 60 + (+m[2]);
}

/**
 * 「営業曜日・金額が同じで、乗車時刻も15分以内」の記録が個人タブにあるか。
 * あればそのタブ名を返す。オプチャの投稿は時刻の書き方がばらつくので幅を持たせる。
 */
function ownNearMatch_(idx, bizDate, time, money) {
  const list = idx[dateToYmd_(bizDate) + "|" + money];
  if (!list || !list.length) return "";
  const min = hhmmToMin_(time);
  if (min === null) return "";
  const width = cfgNearMin_();
  let hit = "";
  list.forEach(function (o) {
    if (hit) return;
    let diff = Math.abs(o.min - min);
    if (diff > 720) diff = 1440 - diff;      // 日をまたぐ 23:55 と 00:05 は10分差
    if (diff <= width) hit = o.tab;
  });
  return hit;
}

/**
 * すでに入っているオプチャ行のキー一覧を作る（重複チェック用）。
 * エリアタブ＋関空・ﾊﾞﾗｼだけ見る。個人タブにはオプチャ行を入れないため。
 */
function opuchaExistingKeys_(ss) {
  const seen = {};
  AREA_TABS.concat(FLAG_TABS).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
      const d = r[C_DATE - 1];
      if (!(d instanceof Date)) return;
      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money)) return;
      seen[dedupKey_(name, d, String(r[C_TIME - 1]), money)] = true;
    });
  });
  return seen;
}


/* ============ 4. メッセージ解析（行順ズレ対応） ============ */

function isWaitTok_(t){ return /^(\d{1,3})\s*(分|ふん|ぷん)/.test(t); }

function classifyTok_(t){
  const s = toHalf_(t);
  // 付け始め-乗車(待ち分)  例) 0053-0103(10分) / 20:45-21:00(15分)
  let m = s.match(/^(\d{1,2}[:：\.]?\d{2})\s*[-–—〜~ー]\s*(\d{1,2}[:：\.]?\d{2})\s*(?:[（(](\d{1,3})\s*分[）)])?$/);
  if (m) return { type:"range", start:m[1], end:m[2], wait:m[3]||"" };
  // 数字(補足)  例) 0040(途中乗り) / 1700(JCBチケ) / 0112(17分)
  m = s.match(/^([\d,]{3,6})\s*[（(](.+)[）)]$/);
  if (m) return { type:"num", v:m[1].replace(/,/g,""), note:m[2] };
  // 金額と待ちがくっついた  例) 18003分
  m = s.match(/^(\d{3,6})(\d{1,2})\s*分$/);
  if (m) return { type:"numwait", v:m[1], wait:m[2]+"分" };
  // 待ち時間  例) 30分 / 30ふん / 5分💢
  m = s.match(/^(\d{1,3})\s*(?:分|ふん|ぷん)/);
  if (m) return { type:"wait", v:m[1]+"分" };
  // 即乗せ / 30秒 → 待ち0分
  if (/^(即|即乗せ|即乗り|即乗車)$/.test(s) || /^\d{1,3}\s*秒$/.test(s)) return { type:"wait", v:"0分" };
  // 時刻（区切りあり） 例) 23:46 / 22.21
  m = s.match(/^(\d{1,2})[:：\.](\d{2})$/);
  if (m && +m[2] <= 59) return { type:"time", v:m[1]+":"+m[2] };
  // ただの数字（3〜6桁、カンマ可）
  if (/^[\d,]{3,6}$/.test(s)) return { type:"num", v:s.replace(/,/g,"") };
  // 不明・なし → 金額0扱い
  if (/^(不明|ふめい|なし|無し|ー|−|-|0|０)$/.test(s)) return { type:"unknown", raw:s };
  return { type:"text", v:t };
}

function parseRideMessage_(text, sentAt){
  const raw = String(text);
  if (/テスト|ﾃｽﾄ|てすと|\btest\b/i.test(raw)) return null;   // テスト投稿は記録しない
  if (CHAT_STOP_RE.test(raw)) return null;                     // 雑談・依頼文は記録しない
  if (/しました|します|でした|ですね|ました。/.test(raw.split("\n")[0] || "")) return null;
  if (/_{4,}|ー{6,}|─{4,}/.test(raw)) return null;             // 区切り線が入る投稿は連絡文
  if (/https?:\/\//i.test(raw)) return null;                   // URLが入る投稿は連絡文
  if (raw.length > 300) return null;                          // 長すぎる投稿は記録しない
  const lines = raw.replace(/\r/g,"").split("\n")
    .map(function(s){return s.trim();}).filter(function(s){return s!=="";});
  if (!lines.length || lines.length > 10) return null;

  const items = [];
  lines.forEach(function(line){
    const toks = line.split(/[\s　]+/).filter(Boolean);
    const restNumeric = toks.length > 1 && toks.slice(1).every(function(t){
      return classifyTok_(t).type !== "text";
    });
    if (toks.length === 1 || restNumeric) {
      toks.forEach(function(t){ items.push(classifyTok_(t)); });
    } else {
      items.push({ type:"text", v:line });
    }
  });

  const nums = [], waits = [], times = [], texts = [];
  let startTime = "";
  items.forEach(function(it){
    if (it.type === "range") {
      const e = toHHMM_(it.end); if (e) times.push(e);
      const s0 = toHHMM_(it.start); if (s0) startTime = s0;
      if (it.wait) waits.push(it.wait + "分");
    } else if (it.type === "numwait") {
      nums.push(it.v); waits.push(it.wait);
    } else if (it.type === "num") {
      nums.push(it.v);
      if (it.note) { if (isWaitTok_(it.note)) waits.push(it.note.replace(/[^0-9]/g,"")+"分"); else texts.push(it.note); }
    } else if (it.type === "wait")    { waits.push(it.v); }
    else if (it.type === "time")      { const v = toHHMM_(it.v); if (v) times.push(v); }
    else if (it.type === "unknown")   { nums.push("0"); if (/不明|ふめい/.test(it.raw || "")) waits.push("不明"); }
    else                              { texts.push(it.v); }
  });

  // 乗り場名（方法だけの行は飛ばす）
  let placeIdx = -1;
  for (let i = 0; i < texts.length; i++) { if (!isMethodOnly_(texts[i])) { placeIdx = i; break; } }
  if (placeIdx === -1) return null;
  let place = texts[placeIdx].replace(/\n/g,"").trim();
  const extras = texts.filter(function(_,i){ return i !== placeIdx; });

  // 「センタラ22.21」のように乗り場名に時刻がくっついている場合
  const pm = place.match(/^(.*[^\d\s])\s*(\d{1,2})[:：\.](\d{2})$/);
  if (pm && times.length === 0) { place = pm[1].trim(); const v = toHHMM_(pm[2]+pm[3]); if (v) times.push(v); }

  // 乗車時間と金額を決める
  let time = "", money = NaN, uncertain = false;
  if (times.length) {
    time = times[times.length - 1];                       // 範囲なら後ろ＝乗車時刻
    const cands = nums.map(function(n){ return parseInt(n,10); }).filter(function(v){ return !isNaN(v); });
    if (cands.length) money = Math.max.apply(null, cands);
  } else if (nums.length >= 2) {
    const st = structuredPick_(lines);          // 整った書き方なら位置で判定
    const tm = st || pickTimeMoney_(nums);      // 崩れていれば推測にまわす
    if (!tm) return null;
    time = tm.time; money = tm.money; uncertain = tm.uncertain;
  } else return null;
  if (!time || isNaN(money)) return null;
  if (money === 0 || money >= 40000) uncertain = true;   // 打ち間違いの可能性
  if (money === 0 && lines.length < 4) return null;        // 情報が薄いものは弾く

  // 乗車方法とそのほか
  const hits = [], others = [];
  extras.forEach(function(line){
    const m = detectMethod_(line);
    if (m && isMethodOnly_(line)) { m.split("・").forEach(function(x){ if(hits.indexOf(x)===-1) hits.push(x); }); }
    else if (m) { m.split("・").forEach(function(x){ if(hits.indexOf(x)===-1) hits.push(x); }); others.push(line); }
    else others.push(line);
  });
  const extraAll = extras.join(" ");

  const tp0 = tidyPlace_(place);
  if (tp0.toOther) others.push(tp0.toOther);
  place = tp0.place;
  if (!place) return null;

  return {
    bizDate: businessDate_(sentAt),
    time: time,
    money: money,
    wait: waits.length ? waits[0] : "",
    startTime: startTime,
    place: place,
    method: hits.join("・"),
    other: others.join(" ").replace(/\n/g,""),
    isKanku: KANKU_RE.test(extraAll),
    isBarasi: BARASI_RE.test(extraAll),
    uncertain: uncertain
  };
}

function isMethodOnly_(line) {
  const h = toHalf_(line);
  if (h.length > 10) return false;
  return !!detectMethod_(h);
}

/** 該当した乗車方法を「GO・付け待ち」のように全部つなげて返す */
function detectMethod_(line, loose) {
  const h = toHalf_(line);
  const rules = loose ? METHOD_RULES_LOOSE : METHOD_RULES;
  const hit = [];
  rules.forEach(function (r) {
    if (r.re.test(h) && hit.indexOf(r.out) === -1) hit.push(r.out);
  });
  // 「エスライド」は「スライド」を含むので、両方拾ったら「スライド乗車」は消す
  const i = hit.indexOf("スライド乗車");
  if (i !== -1 && hit.indexOf("エスライド") !== -1) hit.splice(i, 1);
  // ほかの乗車方法があるときは「乗り場」は付けない
  if (hit.length > 1) {
    const j = hit.indexOf("乗り場");
    if (j !== -1) hit.splice(j, 1);
  }
  return hit.join("・");
}

/** H列の背景色・文字色（アプリ名を優先） */
function methodStyle_(method) {
  const m = String(method);
  if (m.indexOf("GO") !== -1)   return METHOD_STYLE["GO"];
  if (m.indexOf("Uber") !== -1) return METHOD_STYLE["Uber"];
  if (m.indexOf("無線") !== -1) return METHOD_STYLE["無線"];
  return null;
}

function isValidHHMM_(s) {
  if (s.length !== 4) return false;
  // 24〜29時の表記も時刻として認める（後で 00〜05時 に直す）
  return parseInt(s.slice(0, 2), 10) <= 29 && parseInt(s.slice(2), 10) <= 59;
}

/** 24〜29時表記も受け付けて 00:00〜23:59 に直す */
function toHHMM_(s) {
  const t = String(s).replace(/[:：\.]/g, "");
  if (t.length < 3 || t.length > 4) return "";
  const h = parseInt(t.slice(0, t.length - 2), 10), mi = parseInt(t.slice(-2), 10);
  if (isNaN(h) || isNaN(mi) || mi > 59 || h > 29) return "";
  return pad2_(h % 24) + ":" + pad2_(mi);
}

/**
 * 数字の並びから「乗車時間」と「乗車金額」を判定する。
 * 優先順位：
 *   1) 5桁以上 → 必ず金額
 *   2) 先頭が0（0139 など） → 必ず時間
 *   3) 時刻として成立しない → 金額
 *   4) 末尾が0でない方を時間（金額はキリの良い数字になりやすい）
 *   5) それでも決まらなければ、書かれた順（先が時間・後が金額）
 */
/**
 * 書き方が整っている投稿を、位置だけで素直に読む。
 * 1行目=乗り場 / 2行目=乗車時間 / 3行目=金額（各行に1項目だけ）
 * 読めなければ null を返し、推測（pickTimeMoney_）に回す。
 */
function structuredPick_(lines) {
  if (lines.length < 3) return null;
  const l1 = toHalf_(lines[1]), l2 = toHalf_(lines[2]);
  if (!/^[\d,]{3,6}$/.test(l1) || !/^[\d,]{3,6}$/.test(l2)) return null;
  if (/^[\d,]{3,6}$/.test(toHalf_(lines[0]))) return null;   // 1行目が数字なら乗り場ではない
  const time = toHHMM_(l1.replace(/,/g, ""));
  if (!time) return null;                                     // 2行目が時刻として読めない → 推測へ
  const money = parseInt(l2.replace(/,/g, ""), 10);
  if (isNaN(money)) return null;
  return { time: time, money: money, uncertain: false };
}

function pickTimeMoney_(nums) {
  const cand = nums.slice(0, 3).map(function (n, i) {
    const v = parseInt(n, 10);
    let canTime = (n.length <= 4 && isValidHHMM_(n.length === 3 ? "0" + n : n));
    let score = 0;
    if (canTime) {
      score = 1;
      if (n.charAt(0) === "0") score += 4;              // 先頭が0 → まず時刻
      const hh = parseInt(n.slice(0, n.length - 2), 10);
      const mm = parseInt(n.slice(-2), 10);
      const min = ((hh % 24) * 60 + mm);
      if (min >= 17 * 60 || min <= 5 * 60 + 59) score += 2;  // 夜勤の時間帯（自分の記録は17時から）
      if (n.slice(-2) !== "00") score += 2;             // 金額は￥100単位なので下2桁は00になりやすい
    }
    return { v: n, num: v, score: canTime ? score : 0, idx: i };
  });

  const timeCands = cand.filter(function (c) { return c.score > 0; });
  if (timeCands.length === 0) return null;
  timeCands.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
  const t = timeCands[0];

  const rest = cand.filter(function (c) { return c.idx !== t.idx; });
  if (rest.length === 0) return null;
  // 金額は「桁が多い」「下2桁が00」を優先
  rest.sort(function (a, b) {
    const d = b.v.length - a.v.length;
    if (d !== 0) return d;
    const z = (b.v.slice(-2) === "00" ? 1 : 0) - (a.v.slice(-2) === "00" ? 1 : 0);
    return z !== 0 ? z : b.idx - a.idx;
  });
  const m = rest[0];

  const uncertain = (timeCands.length > 1 && timeCands[0].score === timeCands[1].score);
  return { time: toHHMM_(t.v), money: m.num, uncertain: uncertain };
}


/* ============ 5. 書き込み ============ */

function categoryOf_(place) {
  const p = toHalf_(place);
  if (/新地\s*7(?!\d)/.test(p) || /北\s*7(?!\d)/.test(p) || /^7$/.test(p)) return "北7";
  if (/新地\s*4(?!\d)/.test(p) || /北\s*4(?!\d)/.test(p) || /^4$/.test(p)) return "北4";
  if (p.indexOf("ドン") !== -1 || p.indexOf("ドンキ") !== -1) return "ﾐﾅﾐ";
  if (matchWord_(p, SOUTH_WORDS)) return "ﾐﾅﾐ";
  if (p.indexOf("新地") !== -1 || matchWord_(p, NORTH_WORDS)) return "北他";
  return "ほか";
}

function matchWord_(p, list) {
  const s = p.replace(/(通|とおり|どおり|とうり|どうり)$/, "");
  for (let i = 0; i < list.length; i++) if (s.indexOf(list[i]) !== -1) return true;
  return false;
}

function writeRecord_(rec) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const row = buildRow_(rec);

  const targets = [rec.ownerTab || rec.sender];
  if (rec.isBarasi) {
    targets.push("ﾊﾞﾗｼ");                        // バラシは専用タブだけ
  } else {
    targets.push(categoryOf_(rec.place));        // 北7 / 北4 / 北他 / ﾐﾅﾐ / ほか
    if (rec.isKanku) targets.push("関空");
  }

  // 同じタブが2回入らないように
  const seen = {};
  const uniq = targets.filter(function (t) {
    if (!t || seen[t]) return false;
    seen[t] = true; return true;
  });

  uniq.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) { logErr_("writeRecord", new Error("タブが見つかりません: " + name)); return; }
    sh.appendRow(row);
    if (rec.uncertain) {
      sh.getRange(sh.getLastRow(), C_TIME, 1, 2).setBackground("#fff2cc")
        .setNote("時間と金額の判定が曖昧です。念のためご確認ください。");
    }
  });

  uniq.forEach(function (name) {
    try { formatTab_(ss.getSheetByName(name)); } catch (e) { logErr_("format:" + name, e); }
  });
  touchStamp_(ss, uniq);
}

function ensureOpuchaTab_(ss) { /* ｵﾌﾟﾁｬタブは廃止しました */ }

function buildRow_(rec) {
  const row = new Array(LAST_COL).fill("");
  row[C_SENDER - 1] = rec.sender || "";
  row[C_DATE   - 1] = rec.bizDate;
  row[C_START  - 1] = rec.startTime || calcStartTime_(rec.time, rec.wait);
  row[C_WAIT   - 1] = rec.wait || "";
  row[C_TIME   - 1] = rec.time;
  row[C_MONEY  - 1] = rec.money;
  row[C_PLACE  - 1] = rec.place;
  row[C_METHOD - 1] = rec.method || "";
  row[C_OTHER  - 1] = rec.other || "";
  row[C_LINK   - 1] = rec.messageId || "";
  row[C_MARK   - 1] = rec.mark || "";
  return row;
}

function deleteByMessageId_(mid) {
  if (!mid) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ALL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    const vals = sh.getRange(START_ROW, C_LINK, last - START_ROW + 1, 1).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      const v = String(vals[i][0]).trim();
      // 完全一致だけでなく「ID-0」「ID-1」（1投稿に複数件のオプチャ）も消す
      if (v === mid || v.indexOf(mid + "-") === 0) sh.deleteRow(START_ROW + i);
    }
  });
}

/** 説明タブの1行目を既定の高さに戻し、B1に最終更新を入れる */
function fixInfoTab_(ss) {
  try {
    const sh = ss.getSheetByName(INFO_TAB);
    if (!sh) return;
    sh.getRange(1, 1, 1, Math.min(sh.getMaxColumns(), 12))
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
      .setVerticalAlignment("middle");
    try { sh.setRowHeightsForced(1, 1, BASE_H); } catch (e) { sh.setRowHeight(1, BASE_H); }
    const now = new Date();
    const d = ["日", "月", "火", "水", "木", "金", "土"];
    sh.getRange("B1").setValue("🔄最終更新：" + now.getFullYear() + "/" + pad2_(now.getMonth() + 1) +
      "/" + pad2_(now.getDate()) + "(" + d[now.getDay()] + ") " +
      pad2_(now.getHours()) + ":" + pad2_(now.getMinutes()));
  } catch (e) { logErr_("infoTab", e); }
}

function touchStamp_(ss, names) {
  const now = new Date();
  const d = ["日", "月", "火", "水", "木", "金", "土"];
  const s = "🔄最終更新：" + now.getFullYear() + "/" + pad2_(now.getMonth() + 1) + "/" +
            pad2_(now.getDate()) + "(" + d[now.getDay()] + ") " +
            pad2_(now.getHours()) + ":" + pad2_(now.getMinutes());
  names.forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (sh) sh.getRange("B1").setValue(s);
  });
}


/* ============ 6. 整形（並び替え・色・行高さ） ============ */

let _formatStats = {};

/**
 * 直前の整形で「何を直したか」を短い文にして返す。
 *   例: 「並び替え / 乗り場名を統一2件 / ⚠️要確認1件」
 * 直したものが無ければ空文字。
 * 開いたときの通知と、全タブ整形の結果表示の両方でこれを使う（文言をそろえるため）。
 */
function formatSummary_(name) {
  const st = _formatStats[name];
  if (!st) return "";
  const bits = [];
  if (st.sorted)   bits.push("並び替え");
  if (st.years)    bits.push("年見出し" + st.years + "個");
  if (st.dateFix)  bits.push("日付を補正" + st.dateFix + "件");
  if (st.placeFix) bits.push("乗り場名を統一" + st.placeFix + "件");
  if (st.moved)    bits.push("I→H列へ移動" + st.moved + "件");
  if (st.dropped)  bits.push("雑談行を削除" + st.dropped + "件");
  if (st.suspect)  bits.push("⚠️要確認" + st.suspect + "件");
  return bits.join(" / ");
}

function formatTab_(sheet) {
  if (!sheet) return false;
  const name = sheet.getName();
  const highYen = cfgHighYen_();   // 「高すぎる金額」の線。設定タブで変えられる
  if (ALL_TABS.indexOf(name) === -1) return false;

  const last = sheet.getLastRow();
  const stat = { raw: Math.max(0, last - START_ROW + 1), read: 0, years: 0,
                 dropped: 0, dateFix: 0, placeFix: 0, moved: 0, sorted: false };
  _formatStats[name] = stat;
  if (last < START_ROW) return false;

  const range = sheet.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL);
  const before = JSON.stringify(range.getDisplayValues());
  const raw = range.getValues();

  // --- 年見出し行・空行を捨てて、データ行だけ集める ---
  // （B列以外が全部空の行＝年見出し。2001年などのゴミもここで消えて、後で作り直す）
  const rows = [];
  const yearCtx = guessYear_(raw);
  raw.forEach(function (r) {
    // 時刻セルが日付値（1899/12/30 23:48 など）に化けていたら文字に戻す
    [C_START, C_TIME].forEach(function (c) {
      const v = r[c - 1];
      if (v instanceof Date) r[c - 1] = pad2_(v.getHours()) + ":" + pad2_(v.getMinutes());
    });
    if (r[C_WAIT - 1] instanceof Date) {
      const w = r[C_WAIT - 1];
      r[C_WAIT - 1] = (w.getHours() * 60 + w.getMinutes()) + "分";
    }
    const b = r[C_DATE - 1];
    const hasData = r.some(function (v, i) {
      return i !== (C_DATE - 1) && String(v).trim() !== "";
    });
    if (!hasData) return;
    // 乗車時間も金額も無い行は記録として成立しない（雑談等）
    if (String(r[C_TIME - 1]).trim() === "" && String(r[C_MONEY - 1]).trim() === "") {
      stat.dropped++; return;
    }
    if (!(b instanceof Date)) {
      const p = tryParseDate_(b, yearCtx);
      if (!p) return;
      r[C_DATE - 1] = p;
    } else if (b.getFullYear() < 2020 || b.getFullYear() > 2035) {
      // 1985年など明らかにおかしい年は、そのタブの年に直す
      r[C_DATE - 1] = new Date(yearCtx, b.getMonth(), b.getDate(), 12, 0, 0);
      stat.dateFix++;
      if (String(r[C_MARK - 1]).trim() === "") r[C_MARK - 1] = "🔧";
    } else {
      r[C_DATE - 1] = noon_(b);
    }
    rows.push(r);
  });

  // --- 並び替え：営業日 昇順 → 乗車時間（16時起点） 昇順 ---
  rows.sort(function (a, b) {
    const da = a[C_DATE - 1].getTime(), db = b[C_DATE - 1].getTime();
    if (da !== db) return da - db;
    return timeRank_(a[C_TIME - 1]) - timeRank_(b[C_TIME - 1]);
  });

  // --- 年見出しを入れ直しつつ、書き戻し用の配列を作る ---
  const out = [], meta = [];   // meta: {type:'year'|'data', date, dup}
  let curYear = null, prevKey = null;
  rows.forEach(function (r) {
    const d = r[C_DATE - 1];
    if (d.getFullYear() !== curYear) {
      curYear = d.getFullYear();
      const yr = new Array(LAST_COL).fill("");
      // 中身は 2026/01/01 16:59（営業日の起点直前）、表示は「2026年」
      yr[C_DATE - 1] = new Date(curYear, 0, 1, cfgBizStart_() - 1, 59, 0);
      out.push(yr); meta.push({ type: "year" });
      prevKey = null;
    }
    const key = d.getTime();
    const dup = (key === prevKey);
    prevKey = key;

    // 付け時間を再計算（E-D）
    r[C_START - 1] = calcStartTime_(r[C_TIME - 1], r[C_WAIT - 1]);
    // 乗り場・そのほかの手動改行はいったん解除（後で入れ直す）
    r[C_PLACE - 1]  = canonicalPlace_(stripQuote_(r[C_PLACE - 1]));
    r[C_METHOD - 1] = String(r[C_METHOD - 1]).replace(/\n/g, "");
    r[C_OTHER - 1]  = stripQuote_(String(r[C_OTHER - 1]).replace(/\n/g, ""));
    normalizeRow_(r);
    // K列の印を整える。
    // 🆕（新規）と 🔧（変更）は人が付けたものなので残す。
    // ⚠️ は毎回この下で付け直すので、ここでいったん消す。
    // 残したままだと、金額を直して怪しくなくなった行にも ⚠️ が残り続ける。
    const mk = String(r[C_MARK - 1]).trim();
    if (mk !== "🆕" && mk !== "🔧") r[C_MARK - 1] = "";

    // G列を整える。G列に入ってはいけないものはI列へ回す
    // 怪しい行に印を付ける（時刻が分からない／金額が0円か4万円以上／I列に「要確認」）
    // I列の「要確認」は、スクショ取込のときに身内の投稿らしいと見えたもの。
    // 人が見て消すまで残しておきたいので、ここで付け直す。
    const moneyN = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
    if (String(r[C_OTHER - 1]).indexOf("要確認") !== -1 ||
        String(r[C_TIME - 1]).indexOf("?") !== -1 || isNaN(moneyN) ||
        moneyN === 0 || moneyN >= highYen) {
      // 🆕 / 🔧 が付いている行は、そちらを優先して残す（印は1つしか置けないため）
      if (String(r[C_MARK - 1]).trim() === "") r[C_MARK - 1] = "⚠️";
      stat.suspect = (stat.suspect || 0) + 1;
    }

    const hadPlaceBreak = String(r[C_PLACE - 1]).indexOf("\n") !== -1;
    const beforePlace = String(r[C_PLACE - 1]).replace(/\n/g, "");
    const tp = tidyPlace_(r[C_PLACE - 1]);
    r[C_PLACE - 1] = (hadPlaceBreak && tp.place === beforePlace)
      ? String(r[C_PLACE - 1]) : tp.place;   // 名前が変わらないなら手の改行を残す
    if (tp.place !== beforePlace) stat.placeFix++;
    if (tp.toOther) {
      const cur = String(r[C_OTHER - 1]).replace(/\n/g, "").trim();
      r[C_OTHER - 1] = cur ? (cur + "、" + tp.toOther) : tp.toOther;
    }

    // I列が乗車方法だけの行（ホテル・道路・乗り場など）は H列へ移す
    const otherRaw = String(r[C_OTHER - 1]).replace(/\n/g, "").trim();
    if (otherRaw && isMethodOnly_(otherRaw) && !/乗り場|乗場|ホテル|道路/.test(otherRaw)) {
      const moved = detectMethod_(otherRaw);
      const cur = String(r[C_METHOD - 1]).replace(/\n/g, "").trim();
      const hit = cur ? cur.split("・") : [];
      moved.split("・").forEach(function (x) { if (x && hit.indexOf(x) === -1) hit.push(x); });
      r[C_METHOD - 1] = hit.join("・");
      r[C_OTHER - 1] = "";
      stat.moved++;
    }
    // 乗車方法の表記ゆれを統一
    if (String(r[C_METHOD - 1]).trim() !== "") {
      r[C_METHOD - 1] = detectMethod_(r[C_METHOD - 1]) || r[C_METHOD - 1];
      r[C_METHOD - 1] = String(r[C_METHOD - 1]).replace(/・乗り場/g, "").replace(/^乗り場・/, "");
    }

    out.push(r); meta.push({ type: "data", date: d, dup: dup });
  });

  stat.read  = rows.length;
  stat.years = meta.filter(function (m) { return m.type === "year"; }).length;
  stat.sorted = JSON.stringify(rows.map(function (r) { return String(r[C_TIME - 1]); })) !==
                JSON.stringify(raw.map(function (r) { return String(r[C_TIME - 1]); }));
  if (out.length === 0) return false;

  // --- シートに書き戻す ---
  const need = START_ROW + out.length - 1;
  if (sheet.getMaxRows() < need) sheet.insertRowsAfter(sheet.getMaxRows(), need - sheet.getMaxRows());
  if (last > need) sheet.getRange(need + 1, 1, last - need, LAST_COL).clearContent().clearFormat();

  // 先に書式を決めておく（後からだと "23:48" が時刻値に化けて 1899/12/30 になる）
  sheet.getRange(START_ROW, C_START, out.length, 1).setNumberFormat("@");
  sheet.getRange(START_ROW, C_WAIT,  out.length, 1).setNumberFormat("@");
  sheet.getRange(START_ROW, C_TIME,  out.length, 1).setNumberFormat("@");
  sheet.getRange(START_ROW, C_DATE,  out.length, 1).setNumberFormat("M/d(ddd)");

  const wr = sheet.getRange(START_ROW, 1, out.length, LAST_COL);
  // 折り返し文字を入れる（表示用）
  out.forEach(function (r, i) {
    if (meta[i].type !== "data") return;
    // すでに改行が入っているものは、手で調整された可能性があるのでそのまま残す
    if (String(r[C_PLACE - 1]).indexOf("\n") === -1)  r[C_PLACE - 1]  = wrapPlace_(r[C_PLACE - 1]);
    if (String(r[C_METHOD - 1]).indexOf("\n") === -1) r[C_METHOD - 1] = wrapText_(r[C_METHOD - 1], 13);
    if (String(r[C_OTHER - 1]).indexOf("\n") === -1)  r[C_OTHER - 1]  = wrapOther_(r[C_OTHER - 1]);
  });
  wr.setValues(out);

  applyStyles_(sheet, out, meta);

  // G列（乗り場）にGoogleマップのリンクを貼る。
  // 002-Extras.gs が入っていないときは、何もしないで通り過ぎる。
  // G列は上で setValues で書き戻しているので、ここで貼り直さないと消えてしまう。
  try {
    if (cfg_("乗り場にマップリンクを付ける") !== "いいえ" &&
        typeof applyMapLinks_ === "function") applyMapLinks_(sheet);
  } catch (e) { logErr_("mapLink:" + sheet.getName(), e); }

  putNoticeRow_(sheet);

  sheet.getRange(3, C_MARK).setValue("直").setFontSize(7)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  // K列より右に残ったゴミ（lineid等）を消す
  if (sheet.getMaxColumns() > LAST_COL) {
    sheet.getRange(1, LAST_COL + 1, sheet.getMaxRows(), sheet.getMaxColumns() - LAST_COL).clearContent();
  }
  resetFilter_(sheet, START_ROW + out.length - 1);

  const after = JSON.stringify(sheet.getRange(START_ROW, 1, out.length, LAST_COL).getDisplayValues());
  return before !== after;
}

/** フィルタを「3行目〜最終データ行」に張り直す（空白行を含めない） */
function resetFilter_(sheet, lastRow) {
  try {
    const f = sheet.getFilter();
    if (f) f.remove();
    if (lastRow < 3) return;

    sheet.getRange(3, 1, lastRow - 2, LAST_COL - 1).createFilter();   // K列は対象外
  } catch (e) { logErr_("filter", e); }
}

function tryParseDate_(v, fallbackYear) {
  const s = toHalf_(String(v));
  let m = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
  // 「4/13(金)」「4/13」のように年が無い書き方
  m = s.match(/(^|[^0-9])(\d{1,2})[\/\-\.](\d{1,2})([^0-9]|$)/);
  if (m) {
    const mo = +m[2], da = +m[3];
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      const y = (fallbackYear && fallbackYear >= 2020 && fallbackYear <= 2035)
        ? fallbackYear : new Date().getFullYear();
      return new Date(y, mo - 1, da, 12, 0, 0);
    }
  }
  return null;
}

/** そのタブで一番よく使われている「まともな年」を調べる（文字列日付の年を補うため） */
function guessYear_(raw) {
  const count = {};
  raw.forEach(function (r) {
    const b = r[C_DATE - 1];
    if (b instanceof Date) {
      const y = b.getFullYear();
      if (y >= 2020 && y <= 2035) count[y] = (count[y] || 0) + 1;
    }
  });
  let best = 0, bestY = new Date().getFullYear();
  for (const y in count) if (count[y] > best) { best = count[y]; bestY = parseInt(y, 10); }
  return bestY;
}

/** n文字を超えたら、空白・句読点・括弧の切れ目で改行を入れる */
function wrapText_(str, n) {
  let s = String(str).replace(/\n/g, "");
  if (s.length <= n) return s;
  const out = [];
  while (s.length > n) {
    let cut = -1;
    // アパホテル特例
    if (out.length === 0 && s.indexOf("アパホテル") === 0) cut = 5;
    if (cut === -1) {
      for (let i = Math.min(n, s.length - 1); i >= Math.floor(n / 2); i--) {
        if (/[ 　、,（(]/.test(s.charAt(i))) { cut = i; break; }
      }
    }
    if (cut === -1) cut = n;
    out.push(s.slice(0, cut));
    s = s.slice(cut).replace(/^[ 　]/, "");
  }
  if (s) out.push(s);
  return out.join("\n");
}

function applyStyles_(sheet, out, meta) {
  const n = out.length;
  const rg = sheet.getRange(START_ROW, 1, n, LAST_COL);

  rg.setVerticalAlignment("middle");

  // 古い枠線（緑の太枠など）をいったん全部消してから、薄グレーで引き直す
  rg.setBorder(false, false, false, false, false, false);
  rg.setBorder(true, true, true, true, true, true, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);

  // A〜F は折り返さない（折り返すと行が勝手に高くなるため）／G〜J のみ折り返す
  const WS = SpreadsheetApp.WrapStrategy;
  sheet.getRange(START_ROW, C_SENDER, n, 6).setWrapStrategy(WS.CLIP);   // A〜F
  sheet.getRange(START_ROW, C_PLACE,  n, 3).setWrapStrategy(WS.WRAP);   // G〜I
  sheet.getRange(START_ROW, C_LINK,   n, 2).setWrapStrategy(WS.CLIP);   // J・K

  // 列ごとの共通設定
  sheet.getRange(START_ROW, C_SENDER, n, 1).setHorizontalAlignment("center").setFontSize(6).setFontColor("#000000");
  sheet.getRange(START_ROW, C_DATE,   n, 1).setHorizontalAlignment("right").setFontSize(8).setNumberFormat("M/d(ddd)");
  sheet.getRange(START_ROW, C_START,  n, 1).setHorizontalAlignment("center").setFontSize(8).setFontColor("#000000").setNumberFormat("@");
  sheet.getRange(START_ROW, C_WAIT,   n, 1).setHorizontalAlignment("right").setFontSize(8).setNumberFormat("@");
  sheet.getRange(START_ROW, C_TIME,   n, 1).setHorizontalAlignment("center").setFontSize(10).setNumberFormat("@");
  sheet.getRange(START_ROW, C_MONEY,  n, 1).setHorizontalAlignment("right").setNumberFormat('"¥"#,##0').setFontSize(8);
  sheet.getRange(START_ROW, C_PLACE,  n, 1).setHorizontalAlignment("left").setFontColor("#000000");
  sheet.getRange(START_ROW, C_METHOD, n, 1).setHorizontalAlignment("left").setFontSize(6);
  sheet.getRange(START_ROW, C_OTHER,  n, 1).setHorizontalAlignment("left").setFontSize(6).setFontColor("#000000");
  sheet.getRange(START_ROW, C_LINK,   n, 1).setHorizontalAlignment("left").setFontSize(6).setFontColor("#ffffff");
  sheet.getRange(START_ROW, C_MARK,   n, 1).setHorizontalAlignment("center").setFontSize(8).setFontColor("#000000");
  try {
    sheet.setColumnWidth(C_MARK, 20);
    sheet.setColumnWidth(C_SENDER, 20);
  } catch (e) {}

  rg.setFontWeight("bold");   // 全ての文字を太字に統一

  const dateColors = [], waitBg = [], waitTx = [], timeBg = [], timeTx = [],
        moneyBg = [], moneyTx = [], methodBg = [], methodTx = [],
        placeSize = [], heights = [];

  for (let i = 0; i < n; i++) {
    const m = meta[i], r = out[i];

    if (m.type === "year") {
      dateColors.push(["#000000"]);
      waitBg.push(["#ffffff"]); waitTx.push(["#000000"]);
      timeBg.push(["#ffffff"]); timeTx.push(["#000000"]);
      moneyBg.push(["#ffffff"]); moneyTx.push(["#000000"]);
      methodBg.push(["#ffffff"]); methodTx.push(["#000000"]);
      placeSize.push([8]); heights.push(BASE_H);
      continue;
    }

    dateColors.push([m.dup ? DUP_COLOR : dayColor_(m.date)]);

    const w = parseInt(String(r[C_WAIT - 1]).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(w) && w >= 30)      { waitBg.push(["#d9d9d9"]); waitTx.push(["#666666"]); }
    else if (!isNaN(w) && w <= 10) { waitBg.push(["#c6f6ff"]); waitTx.push(["#1155ca"]); }
    else                           { waitBg.push(["#ffffff"]); waitTx.push(["#000000"]); }

    const price = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
    let bg = "#ffffff", tx = "#000000";
    if (!isNaN(price)) {
      if (price >= 20000)      { bg = "#ffbbd9"; tx = "#a61c00"; }
      else if (price >= 10000) { bg = "#ffe086"; tx = "#7f6000"; }
      else if (price >= 5000)  { bg = "#c6f6ff"; tx = "#1155ca"; }
    }
    timeBg.push([bg]);  timeTx.push([tx]);
    moneyBg.push([bg]); moneyTx.push([tx]);

    const st = methodStyle_(String(r[C_METHOD - 1]).trim());
    methodBg.push([st ? st.bg : "#ffffff"]);
    methodTx.push([st ? st.txt : "#000000"]);

    const plen = String(r[C_PLACE - 1]).replace(/\n/g, "").length;
    placeSize.push([plen >= 10 ? 7 : 8]);

    // 行高さ＝21×（その行で一番多い行数）。J列は折り返さないので数えない
    let lines = 1;
    r.forEach(function (v, ci) {
      if (ci === C_LINK - 1 || ci === C_MARK - 1) return;
      const c = String(v).split("\n").length;
      if (c > lines) lines = c;
    });
    heights.push(BASE_H * lines);
  }

  sheet.getRange(START_ROW, C_DATE,   n, 1).setFontColors(dateColors);

  // 年見出し行は「2026年」表示・太字・中央寄せに（まとめて1回）
  const yearA1 = [], yearRowA1 = [];
  for (let i = 0; i < n; i++) {
    if (meta[i].type !== "year") continue;
    yearA1.push("B" + (START_ROW + i));
    yearRowA1.push("A" + (START_ROW + i) + ":K" + (START_ROW + i));
  }
  if (yearA1.length) {
    sheet.getRangeList(yearA1)
      .setNumberFormat("yyyy\u5E74")
      .setFontSize(9).setFontWeight("bold")
      .setHorizontalAlignment("center").setFontColor("#000000");
  }
  // 軽量モードでは色ぬりをしない。
  // 色を持ったセルが数千あると、スマホのスプレッドシートが描画で固まるため。
  // 並び順・書式・枠線は残るので、データとしては何も変わらない。
  if (cfgLight_()) {
    const white = [], black = [];
    for (let i = 0; i < n; i++) { white.push(["#ffffff"]); black.push(["#000000"]); }
    [C_WAIT, C_TIME, C_MONEY, C_METHOD].forEach(function (col) {
      sheet.getRange(START_ROW, col, n, 1).setBackgrounds(white).setFontColors(black);
    });
  } else {
    sheet.getRange(START_ROW, C_WAIT,   n, 1).setBackgrounds(waitBg).setFontColors(waitTx);
    sheet.getRange(START_ROW, C_TIME,   n, 1).setBackgrounds(timeBg).setFontColors(timeTx);
    sheet.getRange(START_ROW, C_MONEY,  n, 1).setBackgrounds(moneyBg).setFontColors(moneyTx);
    sheet.getRange(START_ROW, C_METHOD, n, 1).setBackgrounds(methodBg).setFontColors(methodTx);
  }
  sheet.getRange(START_ROW, C_PLACE,  n, 1).setFontSizes(placeSize);

  // 年見出し行の上に太線を引く（12月 → 翌年 の境目が分かるように）※まとめて1回
  //
  // いちばん上の年見出し（4行目）には引かない。
  // 見出し行のすぐ下なので、線を引くと表の枠と重なって二重線に見えるため。
  // 2つ目から下（2025年 → 2026年 のような区切り）だけを太線にする。
  const yearTopA1 = yearRowA1.filter(function (a1) {
    return a1.indexOf("A" + START_ROW + ":") !== 0;
  });
  if (yearTopA1.length) {
    sheet.getRangeList(yearTopA1)
      .setBorder(true, null, null, null, null, null,
                 "#000000", SpreadsheetApp.BorderStyle.SOLID_THICK);
  }

  // 営業日の変わり目に下線。
  // 以前は境目ごとに setBorder を呼んでいた（1タブで50〜80回）。
  // getRangeList でまとめると1回で済む。
  const underlineA1 = [];
  for (let i = 0; i < n - 1; i++) {
    if (meta[i].type === "data" && meta[i + 1].type === "data" &&
        meta[i].date.getTime() !== meta[i + 1].date.getTime()) {
      underlineA1.push("A" + (START_ROW + i) + ":K" + (START_ROW + i));
    }
  }
  if (underlineA1.length) {
    sheet.getRangeList(underlineA1)
      .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  }

  // 行高さ（同じ高さが続く区間はまとめて設定＝高速化）
  let s = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || heights[i] !== heights[s]) {
      try { sheet.setRowHeightsForced(START_ROW + s, i - s, heights[s]); }
      catch (e) { sheet.setRowHeights(START_ROW + s, i - s, heights[s]); }
      s = i;
    }
  }
}


/* ============ 7. 個人タブ → 連動タブ の全再構築 ============ */

/**
 * J列（連動情報）に値がある行＝LINE由来なので作り直す。
 * J列が空の行＝手打ちなので、そのまま残す。
 */
function rebuildDerivedTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  progSet_(60, "連動タブを作り直しています");
  const derived = AREA_TABS.concat(FLAG_TABS);
  const bucket = {};
  derived.forEach(function (n) { bucket[n] = []; });

  const ymd = function (d) {
    return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate());
  };

  // 個人タブが master。手打ちの行もすべて連動させる
  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
      const b = r[C_DATE - 1];
      if (!(b instanceof Date)) return;
      const hasData = r.some(function (v, i) { return i !== (C_DATE - 1) && String(v).trim() !== ""; });
      if (!hasData) return;

      const place = String(r[C_PLACE - 1]).replace(/\n/g, "");
      const row = r.slice();
      row[C_PLACE - 1] = place;
      // 連動元が分かるよう、印が無ければ付ける（手打ち行も連動させるため）
      if (String(row[C_LINK - 1]).trim() === "") {
        const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10) || 0;
        row[C_LINK - 1] = "SRC-" + name + "|" + ymd(b) + "|" + String(r[C_TIME - 1]).trim() + "|" + money;
      }

      const extra = String(r[C_METHOD - 1]) + " " + String(r[C_OTHER - 1]) + " " + place;
      // 「バラシ」はﾊﾞﾗｼタブだけに入れる
      if (BARASI_RE.test(extra)) { bucket["ﾊﾞﾗｼ"].push(row); return; }
      bucket[categoryOf_(place)].push(row);
      if (KANKU_RE.test(extra)) bucket["関空"].push(row.slice());
    });
  });

  derived.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();

    // そのタブに直接手打ちした行（J列が空）だけ残す
    const keep = [];
    if (last >= START_ROW) {
      sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
        const b = r[C_DATE - 1];
        if (!(b instanceof Date)) return;
        if (String(r[C_LINK - 1]).trim() === "") keep.push(r);
      });
      sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).clearContent().clearNote().clearFormat();
    }

    const all = keep.concat(bucket[name]);
    if (all.length === 0) return;
    if (sh.getMaxRows() < START_ROW + all.length) {
      sh.insertRowsAfter(sh.getMaxRows(), START_ROW + all.length - sh.getMaxRows());
    }
    sh.getRange(START_ROW, 1, all.length, LAST_COL).setValues(all);
  });

  ALL_TABS.forEach(function (n, i) {
    progSet_(Math.round(80 + 18 * i / ALL_TABS.length), n + "タブ整形中");
    const sh = ss.getSheetByName(n);
    if (sh) { try { formatTab_(sh); } catch (e) { logErr_("format:" + n, e); } }
  });
  touchStamp_(ss, ALL_TABS);

  const counts = {};
  derived.forEach(function (n) { counts[n] = bucket[n].length; });
  return counts;
}


/* ============ 8. メニュー・画面まわり ============ */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  const m1 = ui.createMenu("🅰️ はじめの設定（初回だけ）")
    .addItem("⚙️ 設定タブを作る・直す", "menuSetupSettings")
    .addItem("🔁 設定を読み直す・いまの値を見る", "menuReloadSettings")
    .addItem("🔑 LINEトークンを設定", "menuSetToken")
    .addItem("⏱ 毎日17:00の自動チェックをONにする", "menuInstallTriggers")
    .addItem("⏱ 開いたときのチェックを ON", "menuOpenCheckOn")
    .addItem("⏸ 開いたときのチェックを OFF", "menuOpenCheckOff")
    .addItem("🩺 動いているか調べる（ポップアップ・LINE・自動チェック）", "menuOpenCheckStatus");

  const m2 = ui.createMenu("🅱️ ふだんの整形")
    .addItem("🧹 全タブをまとめて整形する", "menuFormatAll")
    .addItem("🔄 いま開いているタブだけ整形する", "menuFormatCurrent");

  const m3 = ui.createMenu("⬅️ LINE履歴で直す（この順番で）")
    .addItem("1️⃣ 新しいスプシで確認する（変更しません）", "menuRepairPreview")
    .addItem("2️⃣ 個人タブを丸ごと修復する", "menuRepair")
    .addItem("3️⃣ 重複している行を消す", "menuDedupe")
    .addItem("4️⃣ 残ったズレを照合して直す", "menuVerify");

  const m4 = ui.createMenu("⬆️ 整える・取り込む")
    .addItem("📜 過去分をまとめて取り込む", "menuHistoryImport")
    .addItem("🏷 乗り場名の表記ゆれを統一する", "menuPlaceUnify")
    .addItem("📥 オープンチャットの文章を取り込む", "menuPasteImport")
    .addItem("🔗 個人タブの内容を他タブへ反映する", "menuRebuild");

  const m5 = ui.createMenu("➡️ うまくいかないとき")
    .addItem("📏 行の高さと折り返しだけ直す", "menuFixRowHeights")
    .addItem("🩺 なぜ整形されないか調べる", "menuDiagnose")
    .addItem("🩺 日付のおかしい行を探す", "menuFindBadDates");

  // 004-WebApp.gs を入れているときだけ出す
  if (typeof menuWebAppUrl === "function") {
    m1.addItem("📱 ページのURLを見る", "menuWebAppUrl")
      .addItem("💬 ページのURLをLINEに送る", "menuWebAppSendLine")
      .addItem("🩺 ページが開けるか調べる", "menuWebAppCheck");
  }

  // 005-Updater.gs を入れているときだけ出す（コードの自動更新）
  if (typeof menuUpdateCode === "function") {
    const mU = ui.createMenu("🔄 コードの更新")
      .addItem("🔄 コードを更新する", "menuUpdateCode")
      .addItem("🔧 更新できる状態か調べる", "menuUpdateStatus")
      .addItem("🔑 GitHubの鍵を設定", "menuSetGitHub")
      .addSeparator()
      .addItem("🧰 そうさボタンを置く（説明タブ・スマホアプリ用）", "menuMakePanel")
      .addItem("⏸ 1分おきの見張りを止める", "menuPanelWatchOff")
      .addSeparator()
      .addItem("💾 いまのコードを保存しておく", "menuBackupCode")
      .addItem("⏪ 前のコードに戻す", "menuRestoreCode");
    m1.addSubMenu(mU);
  }

  const m6 = ui.createMenu("⬇️ イライラを沈めたいとき")
    .addItem("😂 とりあえず笑いに行く", "menuChill");

  ui.createMenu("🎮EnemyController")
    .addSubMenu(m1).addSubMenu(m2).addSubMenu(m3).addSubMenu(m4).addSubMenu(m5)
    .addSubMenu(m6)
    .addToUi();

  // 開いたときのチェックは onOpenCheck が受け持つ（下を参照）。
  // ここでは何もしない。メニューを作るだけ。
}

/* ---- 開いたときのチェック（右下に出るタイプ） ---- */

/**
 * 開いたときにそのタブをチェックして、結果を右下に出す。
 *
 * ★この関数は「インストール済みトリガー」から呼ぶ必要がある。
 *   通常の onOpen（簡易トリガー）からだと PropertiesService が使えず、
 *   formatTab_ の中の乗り場名の統一（canonicalPlace_）が動かないため。
 *   設定は メニュー「🅰️ はじめの設定」→「⏱ 開いたときのチェックを ON」から。
 *
 * 以前のダイアログ（showSyncDialog_）と違い、画面を止めない。
 * ※ toast にシークバーは入れられない仕様なので、推定時間の文字だけ出す。
 */
function onOpenCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let name = "";
  try {
    name = ss.getActiveSheet().getName();
    // 動いたことの記録。「本当に動いているのか」を後から確かめられるようにする
    try {
      PropertiesService.getScriptProperties()
        .setProperty("LAST_OPENCHECK", new Date().toISOString() + "|" + name);
    } catch (e) {}

    if (ALL_TABS.indexOf(name) === -1) {
      // 説明・設定などは整形の対象外。黙っていると壊れたように見えるので一言だけ出す
      ss.toast("記録のタブ（" + PERSONAL_TABS[0] + " など）を開くとチェックします",
               "💤 " + name + "タブは自動チェックの対象外です", 4);
      return;
    }

    const sh = ss.getSheetByName(name);
    const rows = Math.max(0, sh.getLastRow() - START_ROW + 1);
    const est = Math.max(2, Math.ceil(rows / 50));
    ss.toast("(推定残り時間 約" + est + "秒)", "🔄 " + name + "タブをチェック中", 60);

    _formatStats = {};                       // 今回のぶんだけ見たいので消してから
    const changed = formatTab_(sh);
    touchStamp_(ss, [name]);

    if (changed) {
      // 何を直したかを具体的に出す。stat に残らない直し（色・行の高さ・枠線）
      // しか無かった場合は、その旨を出す
      const what = formatSummary_(name);
      ss.toast(what || "並び順・色・行の高さ・枠線を整えました",
               "✅ " + name + "タブを修正しました", 10);
    } else {
      ss.toast("直すところはありませんでした",
               "✅ " + name + "タブは変更ありませんでした", 5);
    }
  } catch (e) {
    logErr_("onOpenCheck", e);
    try { ss.toast(e.message, "❌ " + name + "タブのチェックに失敗", 8); } catch (e2) {}
  }
}

/** 開いたときのチェックを ON にする */
/** 日時を「9/5 21:03（3時間前）」の形にする。無ければ「まだありません」 */
function agoText_(iso) {
  if (!iso) return "まだありません";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "まだありません";
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  let ago;
  if (min < 60)        ago = min + "分前";
  else if (min < 1440) ago = Math.round(min / 60) + "時間前";
  else                 ago = Math.round(min / 1440) + "日前";
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "M/d HH:mm") + "（" + ago + "）";
}

/** そのトリガーが何個入っているか */
function triggerCount_(fn) {
  let n = 0;
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === fn) n++;
    });
  } catch (e) { return -1; }
  return n;
}

/**
 * 「動いていない気がする」ときに、どこで止まっているかを調べる。
 * スマホからでも分かるように、実行ログを見に行かなくてよい形にしてある。
 */
function menuOpenCheckStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const pr = PropertiesService.getScriptProperties();
  const L = [];

  // ① 開いたときのチェック
  const n = triggerCount_("onOpenCheck");
  L.push(n > 0 ? "✅ 開いたときのチェック：ON（" + n + "個）"
               : "❌ 開いたときのチェック：OFF");
  const last = pr.getProperty("LAST_OPENCHECK") || "";
  const p = last.split("|");
  L.push("　最後に動いた：" + agoText_(p[0]) + (p[1] ? "（" + p[1] + "タブ）" : ""));

  // ② 毎日17時の自動チェック
  const n2 = triggerCount_("autoFormatJob");
  L.push("");
  L.push(n2 > 0 ? "✅ 毎日17時の自動チェック：ON（" + n2 + "個）"
                : "❌ 毎日17時の自動チェック：OFF");

  // ③ LINEからちゃんと届いているか
  L.push("");
  L.push("LINEから最後に届いた：" + agoText_(pr.getProperty("LAST_LINE")));
  L.push("　※ここが古いままなら、記録が入っていないということです");

  // ④ 最終更新スタンプ（B1）が、いつのものか
  const cur0 = ss.getActiveSheet().getName();
  const stampTab = ALL_TABS.indexOf(cur0) !== -1 ? cur0 : PERSONAL_TABS[0];
  try {
    const sh0 = ss.getSheetByName(stampTab);
    if (sh0) L.push("　" + stampTab + "タブのB1：" + String(sh0.getRange("B1").getValue()));
  } catch (e) {}

  // ③ いま開いているタブ
  const cur = ss.getActiveSheet().getName();
  L.push("");
  L.push("いま開いているタブ：" + cur);
  L.push(ALL_TABS.indexOf(cur) !== -1
    ? "　→ 対象のタブです"
    : "　→ 対象外です。記録のタブ（" + PERSONAL_TABS.join("・") + " など）を\n" +
      "　　開いた状態で開き直すと出ます");

  // ④ 3つのファイルがそろっているか
  L.push("");
  L.push("001-Code       : " + (typeof CODE_VERSION === "string" ? CODE_VERSION : "❌ 入っていません"));
  L.push("002-Extras     : " + (typeof EX_VERSION   === "string" ? EX_VERSION   : "（未導入）"));
  L.push("003-LineReport : " + (typeof LR_VERSION   === "string" ? LR_VERSION   : "❌ 入っていません"));

  // ⑤ 直近のエラー
  let errs = [];
  try { errs = JSON.parse(pr.getProperty("LAST_ERRORS") || "[]"); } catch (e) {}
  L.push("");
  if (!errs.length) {
    L.push("直近のエラー：ありません");
  } else {
    L.push("直近のエラー（新しい順）");
    errs.forEach(function (x) {
      const d = new Date(x.at);
      L.push("　" + Utilities.formatDate(d, Session.getScriptTimeZone(), "M/d HH:mm") +
             " [" + x.where + "] " + x.msg);
    });
  }

  if (n === 0) {
    const a = ui.alert("🩺 動いているか調べる",
      L.join("\n") + "\n\n──────────────\n" +
      "開いたときのチェックが OFF です。いま ON にしますか？",
      ui.ButtonSet.YES_NO);
    if (a === ui.Button.YES) menuOpenCheckOn();
    return;
  }
  ui.alert("🩺 動いているか調べる", L.join("\n"), ui.ButtonSet.OK);
}

function menuOpenCheckOn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onOpenCheck") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onOpenCheck").forSpreadsheet(ss).onOpen().create();
  ss.toast("次に開いたときから右下に出ます", "✅ 開いたときのチェックを ON にしました", 6);
}

/** 開いたときのチェックを OFF にする（重いと感じたらこちら） */
function menuOpenCheckOff() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onOpenCheck") { ScriptApp.deleteTrigger(t); n++; }
  });
  ss.toast(n + "個の設定を外しました", "⏸ 開いたときのチェックを OFF にしました", 6);
}

function menuFormatCurrent() {
  const name = SpreadsheetApp.getActiveSheet().getName();
  if (ALL_TABS.indexOf(name) === -1) {
    SpreadsheetApp.getActiveSpreadsheet().toast("このタブは対象外です");
    return;
  }
  showSyncDialog_(name);
}

/** 説明タブ以外の全タブを整形する */
function formatAllTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  progSet_(2, "タイムゾーンを確認中");
  ensureTimeZone_(ss);
  ensureOpuchaTab_(ss);
  let changed = 0;
  const done = [];
  ALL_TABS.forEach(function (name, i) {
    progSet_(Math.round(5 + 90 * i / ALL_TABS.length), name + "タブ確認中");
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    try { if (formatTab_(sh)) changed++; done.push(name); } catch (e) { logErr_("format:" + name, e); }
  });
  progSet_(97, "最終更新を書き込み中");
  touchStamp_(ss, done);
  fixInfoTab_(ss);
  progSet_(100, "完了");
  return changed;
}

function menuFormatAll() {
  runnerDialog_({
    title: "🧹 全タブをまとめて整形",
    color: "#34a853",
    desc: "並び順・年見出し・行の高さ・色・枠線・最終更新を、全タブまとめて直します。",
    applyLabel: "整形する",
    fn: "runFormatAll",
    h: 200
  });
}

function runFormatAll() {
  progClear_();
  _formatStats = {};
  const changed = formatAllTabs();

  let body = "";
  let warn = [];
  let total = { dropped: 0, dateFix: 0, placeFix: 0, moved: 0, years: 0, suspect: 0 };
  ALL_TABS.forEach(function (n) {
    const st = _formatStats[n];
    if (!st) { body += n + " : （タブなし）\n"; return; }
    const summary = formatSummary_(n);
    total.dropped += st.dropped; total.dateFix += st.dateFix;
    total.placeFix += st.placeFix; total.moved += st.moved; total.years += st.years;
    total.suspect += (st.suspect || 0);
    body += n + " (" + st.read + "行) : " + (summary || "変更はありませんでした") + "\n";
    if (st.raw >= 5 && st.read === 0) warn.push(n);
  });

  let head = "";
  if (changed > 0) {
    head = "✅ " + changed + "個のタブを直しました\n";
    const t = [];
    if (total.dateFix)  t.push("日付の補正 " + total.dateFix + "件");
    if (total.placeFix) t.push("乗り場名の統一 " + total.placeFix + "件");
    if (total.moved)    t.push("I→H列の移動 " + total.moved + "件");
    if (total.dropped)  t.push("雑談行の削除 " + total.dropped + "件");
    if (total.years)    t.push("年見出し " + total.years + "個");
    if (total.suspect)  t.push("⚠️要確認 " + total.suspect + "件");
    head += t.length ? ("【内訳】" + t.join(" / ") + "\n") : "";
    head += "（このほか 並び順・行の高さ・色・枠線・フィルタを整えました）\n\n";
  } else {
    head = "✅ 変更はありませんでした\n\n";
  }

  if (warn.length) {
    head = "⚠️ 次のタブは1行も読み取れていません\n→ " + warn.join("、") +
           "\n\nB列の日付が読めていない可能性があります。\n\n";
  }
  progSet_(100, "完了");
  return head + body;
}

/** スマホからでも自動で整形されるように、15分ごとのトリガーを仕掛ける */
function menuInstallTriggers() {
  const ui = SpreadsheetApp.getUi();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "autoFormatJob") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("autoFormatJob").timeBased().atHour(17).nearMinute(0).everyDays(1).create();
  ui.alert("✅ 自動チェックをONにしました。\n\n" +
           "これ以降は毎日17:00ごろに、並び順・行の高さ・色・他タブへの反映を\n" +
           "自動で行います。\n\n" +
           "スマホからでも反映されるので、この操作は初回だけで大丈夫です。");
}

function autoFormatJob() {
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty("DIRTY") === "1") {
      // 個人タブを触っていたら、他タブへの連動もここで行う
      props.deleteProperty("DIRTY");
      rebuildDerivedTabs();
    } else {
      formatAllTabs();
    }
  } catch (e) { logErr_("autoFormatJob", e); }
}

function menuRebuild() {
  runnerDialog_({
    title: "🔗 個人タブの内容を他タブへ反映する",
    color: "#b45f06",
    desc: "個人タブ（ﾀﾞｲｽｹ・ｼｭﾝ・ｶｲﾄ・ｱﾅﾙ・ﾏｰｸ）をもとに、" +
          "北7・北4・北他・ﾐﾅﾐ・ほか・関空・ﾊﾞﾗｼ を作り直します。<br>" +
          "※各タブに直接手打ちした行（J列が空の行）は残ります。",
    applyLabel: "作り直す",
    confirm: "個人タブをもとに連動タブを作り直します。よろしいですか？",
    fn: "runRebuild",
    h: 160
  });
}

function runRebuild() {
  progClear_();
  progSet_(5, "個人タブを読み込み中");
  const c = rebuildDerivedTabs() || {};
  progSet_(100, "完了");
  let msg = "✅ 個人タブの内容を他タブへ反映しました\n";
  msg += "──────────────\n";
  Object.keys(c).forEach(function (n) { msg += "  " + n + " : " + c[n] + "件\n"; });
  msg += "──────────────\n";
  msg += "※ 各タブに直接手打ちした行（J列が空）は、この件数に含まれず、そのまま残しています。";
  return msg;
}

function menuSetToken() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt("LINEチャネルアクセストークン",
    "LINE Developersで発行した新しいトークンを貼り付けてください。\n（コードには保存されず、この書類の内部設定に保管されます）",
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const t = res.getResponseText().trim();
  if (!t) return;
  PropertiesService.getScriptProperties().setProperty("LINE_TOKEN", t);
  ui.alert("保存しました。");
}

function executeSingleTabCheck(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTimeZone_(ss);
  const sh = ss.getSheetByName(sheetName);
  const changed = formatTab_(sh);
  touchStamp_(ss, [sheetName]);
  return { changed: changed };
}

function showSyncDialog_(sheetName) {
  const html = `
  <!DOCTYPE html><html><head><base target="_top"><style>
    body{font-family:sans-serif;padding:20px;color:#333;text-align:center}
    h3{font-size:16px;margin-top:0;color:#1155ca}
    .pc{width:100%;background:#e0e0e0;border-radius:8px;margin:20px 0;height:20px;overflow:hidden}
    .pb{width:0%;height:100%;background:#34a853;transition:width .3s}
    .st{font-size:14px;font-weight:bold;margin-bottom:5px}
    .tt{font-size:12px;color:#666}
  </style></head><body>
    <h3>🔄 ${sheetName}タブをチェック中...</h3>
    <div class="st" id="s">並び替え・色・行高さを調整しています</div>
    <div class="pc"><div class="pb" id="b"></div></div>
    <div class="tt" id="t">推定残り: 計算中</div>
    <script>
      var p=0,b=document.getElementById('b'),s=document.getElementById('s'),t=document.getElementById('t');
      var t0=Date.now();
      var iv=setInterval(function(){p+=7;if(p>92)p=92;b.style.width=p+'%';
        var el=(Date.now()-t0)/1000;
        t.innerText="推定残り: 約"+Math.max(1,Math.round(el*(100-p)/p))+"秒";},500);
      google.script.run.withSuccessHandler(function(r){
        clearInterval(iv);b.style.width='100%';t.style.display='none';
        if(r.changed){s.innerText="✅ ${sheetName}タブを修正しました";s.style.color="#2e7d32";}
        else{s.innerText="✅ 変更はありませんでした";s.style.color="#555";}
        setTimeout(function(){google.script.host.close();},2500);
      }).withFailureHandler(function(e){
        clearInterval(iv);b.style.background='#d93025';b.style.width='100%';
        s.innerText="❌ エラーが発生しました";s.style.color='#d93025';t.style.display='block';t.innerText=e.message;
      }).executeSingleTabCheck("${sheetName}");
    </script>
  </body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(350).setHeight(220), "🔄 自動フォーマット");
}


/* ============ 9. 貼り付け取込（オープンチャット等） ============ */

function menuPasteImport() {
  const html = `
  <!DOCTYPE html><html><head><base target="_top"><style>
    body{font-family:sans-serif;padding:15px;color:#333}
    h3{font-size:15px;margin-top:0;border-bottom:2px solid #1155ca;padding-bottom:6px}
    textarea{width:100%;height:180px;font-size:13px;box-sizing:border-box}
    button{width:100%;padding:10px;margin-top:10px;background:#1155ca;color:#fff;
           border:none;border-radius:5px;font-weight:bold;cursor:pointer}
    #r{font-size:12px;margin-top:10px;white-space:pre-wrap;color:#444}
  </style></head><body>
    <h3>📥 オープンチャットの貼り付け取込</h3>
    <div style="font-size:12px;color:#666;margin-bottom:8px">
      オープンチャット等の文章をそのまま貼ってください。<br>
      時刻・金額・経路が読み取れたものだけ、A列を「ｵﾌﾟﾁｬ」として取り込みます。<br>
      （DiDi／連続配車／${cfgHoursText_()}の外 は自動で除外）
    </div>
    <div style="margin-bottom:8px">営業日：<input type="date" id="d" style="font-size:14px;padding:5px"></div>
    <textarea id="tx" placeholder="ここに貼り付け"></textarea>
    <button onclick="go()">解析して取り込む</button>
    ` + progressWidget_() + `
    <div id="r"></div>
    <script>
      (function(){var n=new Date();document.getElementById('d').value=
        n.getFullYear()+"-"+("0"+(n.getMonth()+1)).slice(-2)+"-"+("0"+n.getDate()).slice(-2);})();
      function go(){
        progShow();
        google.script.run.withSuccessHandler(function(m){document.getElementById('r').innerText=m;progDone("完了しました");})
          .withFailureHandler(function(e){progFail(e.message);})
          .importPastedText(document.getElementById('tx').value, document.getElementById('d').value);
      }
    </script>
  </body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(420).setHeight(420), "📥 貼り付け取込");
}

/**
 * 貼り付けた文章からオプチャ情報を取り込む。
 * 画像のときと同じ仕組み（Geminiに読ませて writeOpuchaRecords_ で書く）を使う。
 * 以前は parseOpuchaMessage_ を呼んでいたが、その関数は定義が無く、
 * このメニューは押すと必ず落ちていた。
 */
function importPastedText(text, dateStr) {
  if (!String(text || "").trim()) return "⚠️ 文章が空です。";

  let base = new Date();
  if (dateStr) { const p = dateStr.split("-"); base = new Date(+p[0], +p[1] - 1, +p[2], 20, 0, 0); }

  let list;
  try {
    list = opuchaFromText_(text);
  } catch (e) {
    return "⚠️ 読み取れませんでした。\n" + e.message;
  }
  if (!list.length) {
    return "⚠️ 取り込めるものがありませんでした。\n\n" +
           "次のどれかに当てはまると除外されます:\n" +
           "・DiDi / 連続配車 を含む\n" +
           "・時刻が " + cfgHoursText_() + " の外\n" +
           "・金額が￥" + cfgOpuMinYen_().toLocaleString() + "未満、または読み取れない\n" +
           "・乗り場が書かれていない";
  }

  const res = writeOpuchaRecords_(list, "", base);
  const ng = res.skipped.slice(0, 20).join("\n・");
  if (!res.wrote) {
    return "⚠️ 条件に合うものがありませんでした。\n──────────────\n" +
           (ng ? "・" + ng : "（読み取れた行がありませんでした）");
  }

  const lines = list.slice(0, 20).map(function (x) {
    return "・" + x.time + " ￥" + Number(x.money).toLocaleString() + " " + (x.place || "");
  });
  return "✅ " + res.wrote + "件を取り込みました（A列は「ｵﾌﾟﾁｬ」）\n──────────────\n" +
         lines.join("\n") + (list.length > 20 ? "\n…ほか" + (list.length - 20) + "件" : "") +
         (res.skipped.length
            ? "\n──────────────\n取り込めなかったもの " + res.skipped.length + "件:\n・" + ng
            : "");
}

/** 貼り付けた文章から乗車記録を抜き出す（画像のときと同じ指示文を使う） */
function opuchaFromText_(text) {
  const g = geminiReady_();
  const out = UrlFetchApp.fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + g.model +
    ":generateContent?key=" + encodeURIComponent(g.key),
    { method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ parts: [
        { text: OPUCHA_IMAGE_PROMPT.replace("スクリーンショットです", "書き起こしです") +
                "\n\n----\n" + String(text).slice(0, 20000) }
      ]}]})});
  if (out.getResponseCode() !== 200) {
    let why = out.getContentText().slice(0, 150);
    try { why = JSON.parse(out.getContentText()).error.message; } catch (e) {}
    throw new Error("AIが読めませんでした（" + out.getResponseCode() + "）" + why);
  }
  let t = "";
  try { t = JSON.parse(out.getContentText()).candidates[0].content.parts[0].text; }
  catch (e) { throw new Error("AIの返事を読めませんでした"); }
  const m = t.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { const a = JSON.parse(m[0]); return Array.isArray(a) ? a : []; }
  catch (e) { throw new Error("AIの返事がJSONではありませんでした"); }
}


/* ============ 9-2. LINEトーク履歴の一括取込 ============ */

function menuHistoryImport() {
  const html = `
  <!DOCTYPE html><html><head><base target="_top"><style>
    body{font-family:sans-serif;padding:15px;color:#333}
    h3{font-size:15px;margin-top:0;border-bottom:2px solid #1155ca;padding-bottom:6px}
    .d{font-size:12px;color:#666;margin-bottom:10px;line-height:1.6}
    .row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
    input[type=date]{flex:1;font-size:14px;padding:6px}
    textarea{width:100%;height:150px;font-size:12px;box-sizing:border-box}
    button{width:100%;padding:12px;margin-top:10px;background:#1155ca;color:#fff;
           border:none;border-radius:5px;font-weight:bold;cursor:pointer;font-size:15px}
    #r{font-size:12px;margin-top:12px;white-space:pre-wrap;color:#333;
       background:#f7f7f7;padding:10px;border-radius:5px;max-height:160px;overflow:auto}
  </style></head><body>
    <h3>📜 LINEトーク履歴の取り込み</h3>
    <div class="d">
      LINEアプリ → グループトーク → 右上メニュー → 設定 → トーク履歴を送信<br>
      で書き出したテキストを、下に貼り付けてください。<br>
      <b>この期間の分だけ</b>取り込みます（同じ内容は二重登録されません）。
    </div>
    <div class="row">
      <input type="date" id="f"><span>～</span><input type="date" id="t">
    </div>
    <textarea id="tx" placeholder="トーク履歴のテキストをここに貼り付け"></textarea>
    <button id="b" onclick="go()">取り込む</button>
    ` + progressWidget_() + `
    <div id="r" style="font-size:12px;margin-top:10px;white-space:pre-wrap;background:#f7f7f7;padding:10px;border-radius:5px;max-height:160px;overflow:auto"></div>
    <script>
      (function(){
        var t=new Date(), f=new Date(); f.setDate(f.getDate()-20);
        function s(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
        document.getElementById('f').value=s(f);
        document.getElementById('t').value=s(t);
      })();
      function go(){
        var b=document.getElementById('b'); b.disabled=true; progShow();
        google.script.run
          .withSuccessHandler(function(m){document.getElementById('r').innerText=m;progDone("完了しました");b.disabled=false;})
          .withFailureHandler(function(e){progFail(e.message);b.disabled=false;})
          .importLineHistory(document.getElementById('tx').value,
                             document.getElementById('f').value,
                             document.getElementById('t').value);
      }
    </script>
  </body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(430).setHeight(520), "📜 トーク履歴の取り込み");
}

/** 表示名からタブ名を割り出す（「さん」「(放出営業所)」「空白」は無視） */
function tabFromDisplayName_(name) {
  const n = String(name)
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/さん\s*$/, "")
    .replace(/[\s　]/g, "");
  for (const k in DISPLAY_NAME_MAP) {
    if (n === k.replace(/[\s　]/g, "")) return DISPLAY_NAME_MAP[k];
  }
  return "";
}

/** LINE書き出しの引用符を外す（"新地7\n2348 1300" → 新地7 / 2348 1300） */
function unquote_(t) {
  let v = String(t);
  if (v.length >= 2 && v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') {
    v = v.slice(1, -1).replace(/""/g, '"');
  }
  return v;
}

/** トーク履歴テキストを {dt, name, body} の配列にする */
function parseHistory_(text) {
  const lines = String(text).replace(/\r/g, "").replace(/^\uFEFF/, "").split("\n");
  const dateRe = /^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/;
  const msgRe  = /^(\d{1,2}):(\d{2})\t([^\t]*)\t([\s\S]*)$/;
  const out = [];
  let curDate = null, cur = null;

  lines.forEach(function (line) {
    if (line.indexOf("\t") === -1) {
      const dm = line.match(dateRe);
      if (dm) {
        if (cur) { out.push(cur); cur = null; }
        curDate = new Date(+dm[1], +dm[2] - 1, +dm[3]);
        return;
      }
    }
    const mm = line.match(msgRe);
    if (mm && curDate) {
      if (cur) out.push(cur);
      cur = {
        dt: new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate(), +mm[1], +mm[2]),
        name: mm[3].trim(),
        body: mm[4]
      };
      return;
    }
    if (cur) cur.body += "\n" + line.replace(/^\t+/, "");
  });
  if (cur) out.push(cur);
  out.forEach(function (m) { m.body = unquote_(m.body); });
  return out;
}

/** J列の値が、LINEが発行した本物のメッセージIDかどうか */
function isRealLineId_(v) {
  const s = String(v).trim();
  if (!s) return false;
  return s.indexOf("FIX-") !== 0 && s.indexOf("IMP-") !== 0;
}

function dedupKey_(tab, bizDate, time, money) {
  return tab + "|" + bizDate.getFullYear() + "-" + pad2_(bizDate.getMonth() + 1) + "-" +
         pad2_(bizDate.getDate()) + "|" + time + "|" + money;
}

function importLineHistory(text, fromStr, toStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let from = null, to = null;
  if (fromStr) { const p = fromStr.split("-"); from = new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0); }
  if (toStr)   { const p = toStr.split("-");   to   = new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59); }

  // --- 既存データのキー一覧（重複チェック用） ---
  const seen = {};
  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
      const d = r[C_DATE - 1];
      if (!(d instanceof Date)) return;
      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money)) return;
      seen[dedupKey_(name, d, String(r[C_TIME - 1]), money)] = true;
    });
  });

  const msgs = parseHistory_(text);
  const buckets = {};
  ALL_TABS.forEach(function (n) { buckets[n] = []; });

  let added = 0, dup = 0, notRide = 0;
  const unknownNames = {};

  msgs.forEach(function (m) {
    if (from && m.dt < from) return;
    if (to && m.dt > to) return;
    if (/メッセージの送信を取り消しました|が参加しました|が退出しました|通話時間/.test(m.body)) return;

    const tab = tabFromDisplayName_(m.name);
    if (!tab) { unknownNames[m.name] = (unknownNames[m.name] || 0) + 1; return; }

    const rec = parseRideMessage_(m.body, m.dt);
    if (!rec) { notRide++; return; }

    const key = dedupKey_(tab, rec.bizDate, rec.time, rec.money);
    if (seen[key]) { dup++; return; }
    seen[key] = true;

    rec.sender = tab;
    rec.mark = "🆕";
    rec.messageId = "IMP-" + key;
    const row = buildRow_(rec);

    buckets[tab].push(row);
    buckets[categoryOf_(rec.place)].push(row.slice());
    if (rec.isKanku)  buckets["関空"].push(row.slice());
    if (rec.isBarasi) buckets["ﾊﾞﾗｼ"].push(row.slice());
    added++;
  });

  // --- 書き込み ---
  const touched = [];
  ALL_TABS.forEach(function (name) {
    const rows = buckets[name];
    if (!rows.length) return;
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const start = Math.max(sh.getLastRow() + 1, START_ROW);
    if (sh.getMaxRows() < start + rows.length) {
      sh.insertRowsAfter(sh.getMaxRows(), start + rows.length - sh.getMaxRows());
    }
    sh.getRange(start, 1, rows.length, LAST_COL).setValues(rows);
    touched.push(name);
  });

  touched.forEach(function (n) {
    try { formatTab_(ss.getSheetByName(n)); } catch (e) { logErr_("format:" + n, e); }
  });
  if (touched.length) touchStamp_(ss, touched);

  // --- 結果レポート ---
  let msg = "";
  msg += "解析したメッセージ: " + msgs.length + "件\n";
  msg += "──────────────\n";
  msg += "✅ 取り込み: " + added + "件\n";
  msg += "⏭ 既にあった分: " + dup + "件\n";
  msg += "💬 記録ではない（雑談等）: " + notRide + "件\n";

  const uk = Object.keys(unknownNames);
  if (uk.length) {
    msg += "\n⚠️ タブが未設定のメンバー:\n";
    uk.forEach(function (n) { msg += "・" + n + " (" + unknownNames[n] + "件)\n"; });
    msg += "→ このメンバーの分は取り込んでいません。";
  }
  if (added === 0 && msgs.length === 0) {
    msg += "\n\n⚠️ 履歴を1件も読み取れませんでした。\n" +
           "貼り付けた内容が正しいか確認してください。";
  }
  return msg;
}


/* ============ 9-3. LINE履歴とスプシの照合 ============ */

function menuVerify() {
  const html = `
  <!DOCTYPE html><html><head><base target="_top"><style>
    body{font-family:sans-serif;padding:15px;color:#333}
    h3{font-size:15px;margin-top:0;border-bottom:2px solid #d93025;padding-bottom:6px}
    .d{font-size:12px;color:#666;margin-bottom:10px;line-height:1.6}
    .row{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    input[type=date]{flex:1;font-size:14px;padding:6px}
    textarea{width:100%;height:130px;font-size:12px;box-sizing:border-box}
    button{width:100%;padding:12px;margin-top:8px;border:none;border-radius:5px;
           font-weight:bold;cursor:pointer;font-size:15px;color:#fff}
    #b1{background:#1155ca} #b2{background:#d93025}
    #r{font-size:12px;margin-top:12px;white-space:pre-wrap;background:#f7f7f7;
       padding:10px;border-radius:5px;max-height:200px;overflow:auto}
  </style></head><body>
    <h3>🔍 LINE履歴とスプシの照合</h3>
    <div class="d">
      LINEの内容を<b>正</b>として、スプシとの食い違いを調べます。<br>
      まず「①ズレを調べるだけ」で内容を確認してから、②を押してください。
    </div>
    <div class="row"><input type="date" id="f"><span>～</span><input type="date" id="t"></div>
    <textarea id="tx" placeholder="トーク履歴のテキストをここに貼り付け"></textarea>
    <button id="b1" onclick="go(false)">① ズレを調べるだけ（変更しません）</button>
    <button id="b2" onclick="go(true)">② 調べた内容でスプシを修正する</button>
    ` + progressWidget_() + `
    <div id="r" style="font-size:12px;margin-top:10px;white-space:pre-wrap;background:#f7f7f7;padding:10px;border-radius:5px;max-height:200px;overflow:auto"></div>
    <script>
      (function(){
        var t=new Date(), f=new Date(2026,0,1);
        function s(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
        document.getElementById('f').value=s(f); document.getElementById('t').value=s(t);
      })();
      function go(apply){
        if(apply && !confirm("スプシを実際に書き換えます。よろしいですか？")) return;
        document.getElementById('b1').disabled=true; document.getElementById('b2').disabled=true;
        progShow();
        google.script.run
          .withSuccessHandler(function(m){document.getElementById('r').innerText=m;progDone("完了しました");
            document.getElementById('b1').disabled=false;document.getElementById('b2').disabled=false;})
          .withFailureHandler(function(e){progFail(e.message);
            document.getElementById('b1').disabled=false;document.getElementById('b2').disabled=false;})
          .verifyAgainstHistory(document.getElementById('tx').value,
                                document.getElementById('f').value,
                                document.getElementById('t').value, apply);
      }
    </script>
  </body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(440).setHeight(560), "🔍 照合チェック");
}

function fmtDate_(d) {
  return (d.getMonth() + 1) + "/" + d.getDate();
}

/**
 * LINE履歴を正として、個人タブと照合する。
 * apply=false … 差分を数えて報告するだけ
 * apply=true  … 不足を追加／内容違いを修正／LINEに無いLINE由来行を削除
 */
function verifyAgainstHistory(text, fromStr, toStr, apply) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let from = null, to = null;
  if (fromStr) { const p = fromStr.split("-"); from = new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0); }
  if (toStr)   { const p = toStr.split("-");   to   = new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59); }

  // --- LINE側の正データを作る ---
  const truth = {};   // key -> {tab, rec}
  let parsed = 0;
  parseHistory_(text).forEach(function (m) {
    if (from && m.dt < from) return;
    if (to && m.dt > to) return;
    if (/メッセージの送信を取り消しました|が参加しました|が退出しました|通話時間/.test(m.body)) return;
    const tab = tabFromDisplayName_(m.name);
    if (!tab) return;
    const rec = parseRideMessage_(m.body, m.dt);
    if (!rec) return;
    parsed++;
    rec.ownerTab = tab; rec.sender = tab;
    truth[dedupKey_(tab, rec.bizDate, rec.time, rec.money)] = { tab: tab, rec: rec };
  });

  if (parsed === 0) {
    return "⚠️ LINE履歴から記録を1件も読み取れませんでした。\n貼り付けた内容と期間をご確認ください。";
  }

  // --- スプシ側を読む ---
  const sheetRows = {};    // key -> {tab, row(1-based), vals}
  const orphan = [];       // LINEに無いのにスプシにあるLINE由来行
  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    const vals = sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues();
    vals.forEach(function (r, i) {
      const d = r[C_DATE - 1];
      if (!(d instanceof Date)) return;
      if (from && d < from) return;
      if (to && d > to) return;
      if (String(r[C_SENDER - 1]).trim() === OPUCHA_TAB) return;   // オプチャ行は対象外
      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money)) return;
      const key = dedupKey_(name, d, String(r[C_TIME - 1]), money);
      sheetRows[key] = { tab: name, row: START_ROW + i, vals: r };
      if (!truth[key] && String(r[C_LINK - 1]).trim() !== "") {
        orphan.push({ tab: name, row: START_ROW + i, date: d, time: String(r[C_TIME - 1]), money: money });
      }
    });
  });

  // --- 差分を出す ---
  const missing = [], diff = [];
  for (const key in truth) {
    const t = truth[key];
    const s = sheetRows[key];
    if (!s) { missing.push(t); continue; }
    const cur = {
      wait:   String(s.vals[C_WAIT - 1]).trim(),
      place:  String(s.vals[C_PLACE - 1]).replace(/\n/g, "").trim(),
      method: String(s.vals[C_METHOD - 1]).trim()
    };
    const want = {
      wait:   String(t.rec.wait || "").trim(),
      place:  String(t.rec.place || "").replace(/\n/g, "").trim(),
      method: String(t.rec.method || "").trim()
    };
    if (cur.wait !== want.wait || cur.place !== want.place || cur.method !== want.method) {
      diff.push({ s: s, t: t, cur: cur, want: want });
    }
  }

  // --- レポート ---
  let msg = "LINEから読めた記録: " + parsed + "件\n";
  msg += "──────────────\n";
  msg += "➕ スプシに無い（要追加）: " + missing.length + "件\n";
  msg += "✏️ 内容が違う（要修正）: " + diff.length + "件\n";
  msg += "🗑 LINEに無い（削除候補）: " + orphan.length + "件\n";

  function sample(arr, fn, label) {
    if (!arr.length) return "";
    let s = "\n【" + label + "】\n";
    arr.slice(0, 8).forEach(function (x) { s += "・" + fn(x) + "\n"; });
    if (arr.length > 8) s += "…ほか" + (arr.length - 8) + "件\n";
    return s;
  }
  msg += sample(missing, function (t) {
    return t.tab + " " + fmtDate_(t.rec.bizDate) + " " + t.rec.time + " ￥" + t.rec.money + " " + t.rec.place;
  }, "追加が必要");
  msg += sample(diff, function (x) {
    return x.s.tab + " " + x.s.row + "行目 " + x.t.rec.time +
           " [" + x.cur.place + "/" + x.cur.wait + "/" + x.cur.method + "]" +
           " → [" + x.want.place + "/" + x.want.wait + "/" + x.want.method + "]";
  }, "内容の違い");
  msg += sample(orphan, function (o) {
    return o.tab + " " + o.row + "行目 " + fmtDate_(o.date) + " " + o.time + " ￥" + o.money;
  }, "LINEに無い（削除候補）");

  if (!apply) {
    msg += "\n──────────────\n";
    msg += (missing.length + diff.length + orphan.length === 0)
      ? "✅ ズレはありませんでした。"
      : "内容を確認して、問題なければ②を押してください。";
    return msg;
  }

  // --- 修正を適用 ---
  // 1) 内容の修正
  diff.forEach(function (x) {
    const sh = ss.getSheetByName(x.s.tab);
    sh.getRange(x.s.row, C_WAIT).setValue(x.want.wait);
    sh.getRange(x.s.row, C_PLACE).setValue(x.want.place);
    sh.getRange(x.s.row, C_METHOD).setValue(x.want.method);
    sh.getRange(x.s.row, C_MARK).setValue("🔧");
  });

  // 2) LINEに無い行を削除（下から消す）
  const byTab = {};
  orphan.forEach(function (o) { (byTab[o.tab] = byTab[o.tab] || []).push(o.row); });
  for (const tab in byTab) {
    const sh = ss.getSheetByName(tab);
    byTab[tab].sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  }

  // 3) 不足分を追加
  const add = {};
  missing.forEach(function (t) {
    t.rec.mark = "🆕";
    t.rec.messageId = "FIX-" + dedupKey_(t.tab, t.rec.bizDate, t.rec.time, t.rec.money);
    (add[t.tab] = add[t.tab] || []).push(buildRow_(t.rec));
  });
  for (const tab in add) {
    const sh = ss.getSheetByName(tab);
    const st = Math.max(sh.getLastRow() + 1, START_ROW);
    if (sh.getMaxRows() < st + add[tab].length) {
      sh.insertRowsAfter(sh.getMaxRows(), st + add[tab].length - sh.getMaxRows());
    }
    sh.getRange(st, 1, add[tab].length, LAST_COL).setValues(add[tab]);
  }

  // 4) 並び替え・整形・連動タブの再構築
  rebuildDerivedTabs();

  msg += "\n──────────────\n";
  msg += "✅ 修正しました（追加 " + missing.length + " / 修正 " + diff.length +
         " / 削除 " + orphan.length + "）\n並び順と連動タブも作り直しました。";
  return msg;
}



/* ============ 9-4. LINE履歴による全面修復 ============ */

function menuRepair() {
  const html = `
  <!DOCTYPE html><html><head><base target="_top"><style>
    body{font-family:sans-serif;padding:15px;color:#333}
    h3{font-size:15px;margin-top:0;border-bottom:2px solid #b45f06;padding-bottom:6px}
    .d{font-size:12px;color:#666;margin-bottom:10px;line-height:1.6}
    .w{background:#fff9c4;border:1px solid #fbbc04;padding:8px;border-radius:5px;
       font-size:12px;margin-bottom:10px;line-height:1.6}
    .row{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    input[type=date]{flex:1;font-size:14px;padding:6px}
    textarea{width:100%;height:120px;font-size:12px;box-sizing:border-box}
    button{width:100%;padding:12px;margin-top:8px;border:none;border-radius:5px;
           font-weight:bold;cursor:pointer;font-size:15px;color:#fff}
    #b1{background:#1155ca} #b2{background:#b45f06}
    #r{font-size:12px;margin-top:12px;white-space:pre-wrap;background:#f7f7f7;
       padding:10px;border-radius:5px;max-height:220px;overflow:auto}
  </style></head><body>
    <h3>🩹 LINE履歴で個人タブを修復</h3>
    <div class="d">
      乗車時間や<b>営業曜日</b>が壊れている行も直せます。<br>
      ①営業日＋金額 ②乗車時間＋金額 ③金額＋乗り場 ④営業日＋乗車時間<br>
      の4段階でLINE記録と突き合わせ、LINEの内容で上書きします。
    </div>
    <div class="w">
      ⚠️ ②を押すと、実行前にスプレッドシート全体のバックアップをGoogleドライブに自動作成します。<br>
      I列の手書きメモは、LINE側が空なら残します。
    </div>
    <div class="row"><input type="date" id="f"><span>～</span><input type="date" id="t"></div>
    <textarea id="tx" placeholder="トーク履歴のテキストをここに貼り付け"></textarea>
    <button id="b1" onclick="go(false)">① どう直るかを見るだけ（変更しません）</button>
    <button id="b2" onclick="go(true)">② この内容で修復する</button>
    ` + progressWidget_() + `
    <div id="r" style="font-size:12px;margin-top:10px;white-space:pre-wrap;background:#f7f7f7;padding:10px;border-radius:5px;max-height:200px;overflow:auto"></div>
    <script>
      (function(){
        var t=new Date(), f=new Date(2026,0,1);
        function s(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
        document.getElementById('f').value=s(f); document.getElementById('t').value=s(t);
      })();
      function go(apply){
        if(apply && !confirm("個人タブを修復します。よろしいですか？")) return;
        document.getElementById('b1').disabled=true; document.getElementById('b2').disabled=true;
        progShow();
        google.script.run
          .withSuccessHandler(function(m){document.getElementById('r').innerText=m;progDone("完了しました");
            document.getElementById('b1').disabled=false;document.getElementById('b2').disabled=false;})
          .withFailureHandler(function(e){progFail(e.message);
            document.getElementById('b1').disabled=false;document.getElementById('b2').disabled=false;})
          .repairFromHistory(document.getElementById('tx').value,
                             document.getElementById('f').value,
                             document.getElementById('t').value, apply);
      }
    </script>
  </body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(450).setHeight(600), "🩹 全面修復");
}

/** 営業日＋金額 の突き合わせキー（時刻は使わない） */
function repairKey_(tab, bizDate, money) {
  return tab + "|" + bizDate.getFullYear() + "-" + pad2_(bizDate.getMonth() + 1) + "-" +
         pad2_(bizDate.getDate()) + "|" + money;
}

function computeRepair_(text, fromStr, toStr) {
  progClear_();
  progSet_(3, "LINE履歴を解析中");
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let from = null, to = null;
  if (fromStr) { const p = fromStr.split("-"); from = new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0); }
  if (toStr)   { const p = toStr.split("-");   to   = new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59); }

  // --- LINE側の正データ ---
  const truth = [];
  parseHistory_(text).forEach(function (m) {
    if (from && m.dt < from) return;
    if (to && m.dt > to) return;
    if (/メッセージの送信を取り消しました|が参加しました|が退出しました|通話時間/.test(m.body)) return;
    const tab = tabFromDisplayName_(m.name);
    if (!tab) return;
    const rec = parseRideMessage_(m.body, m.dt);
    if (!rec) return;
    rec.ownerTab = tab; rec.sender = tab; rec.used = false;
    truth.push(rec);
  });
  if (truth.length === 0) {
    return null;
  }

  let minD = truth[0].bizDate.getTime(), maxD = minD;
  truth.forEach(function (r) {
    const t = r.bizDate.getTime();
    if (t < minD) minD = t;
    if (t > maxD) maxD = t;
  });
  const lo = minD - 60 * 86400000, hi = maxD + 60 * 86400000;

  // --- スプシ側 ---
  progSet_(25, "スプレッドシートを読み込み中");
  const sheetRows = [];   // {tab, r, date, money, time, place, matched}
  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues().forEach(function (r) {
      const d = r[C_DATE - 1];
      if (!(d instanceof Date)) return;
      const hasData = r.some(function (v, i) { return i !== (C_DATE - 1) && String(v).trim() !== ""; });
      if (!hasData) return;
      const t = d.getTime();
      if (t < lo || t > hi) { sheetRows.push({ tab: name, r: r, outside: true }); return; }
      sheetRows.push({
        tab: name, r: r, date: d,
        money: parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10),
        time: String(r[C_TIME - 1]).trim(),
        place: normalizePlace_(String(r[C_PLACE - 1])),
        matched: false, outside: false
      });
    });
  });

  // --- 4段階の照合 ---
  const ymd = function (d) { return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate()); };
  const PASSES = [
    { name: "営業日＋金額",     key: function (o) { return o.tab + "|" + ymd(o.date) + "|" + o.money; } },
    { name: "乗車時間＋金額",   key: function (o) { return o.tab + "|" + o.time + "|" + o.money; } },
    { name: "金額＋乗り場",     key: function (o) { return o.tab + "|" + o.money + "|" + o.place; } },
    { name: "営業日＋乗車時間", key: function (o) { return o.tab + "|" + ymd(o.date) + "|" + o.time; } }
  ];
  const pairs = [];      // {row, rec, pass}
  const passCount = [0, 0, 0, 0];

  PASSES.forEach(function (P, pi) {
    progSet_(40 + pi * 8, "照合" + (pi + 1) + " " + P.name + " を確認中");
    const idx = {};
    truth.forEach(function (rec) {
      if (rec.used) return;
      const k = P.key({ tab: rec.ownerTab, date: rec.bizDate, money: rec.money,
                        time: rec.time, place: normalizePlace_(rec.place) });
      (idx[k] = idx[k] || []).push(rec);
    });
    sheetRows.forEach(function (row) {
      if (row.matched || row.outside) return;
      if (isNaN(row.money)) return;
      const k = P.key(row);
      const list = idx[k];
      if (!list || !list.length) return;
      const rec = list.shift();
      if (rec.used) return;
      rec.used = true; row.matched = true;
      pairs.push({ row: row, rec: rec, pass: pi });
      passCount[pi]++;
    });
  });

  return { truth: truth, sheetRows: sheetRows, pairs: pairs, passCount: passCount,
           minD: minD, maxD: maxD, passes: PASSES };
}

const ymdOf_ = function (d) {
  return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate());
};

function repairFromHistory(text, fromStr, toStr, apply) {
  const R = computeRepair_(text, fromStr, toStr);
  if (!R) return "⚠️ LINE履歴から記録を1件も読み取れませんでした。\n貼り付けた内容と期間をご確認ください。";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const truth = R.truth, sheetRows = R.sheetRows, pairs = R.pairs;
  const passCount = R.passCount, PASSES = R.passes, minD = R.minD, maxD = R.maxD;
  const ymd = ymdOf_;

  // --- 何がどう変わるか ---
  let fixDate = 0, fixTime = 0, fixOther = 0;
  const sampleDate = [], sampleTime = [];
  pairs.forEach(function (p) {
    const oldD = ymd(p.row.date), newD = ymd(p.rec.bizDate);
    if (oldD !== newD) {
      fixDate++;
      if (sampleDate.length < 8) sampleDate.push(p.row.tab + " ￥" + p.row.money + " " + oldD + " → " + newD);
    }
    if (p.row.time !== p.rec.time) {
      fixTime++;
      if (sampleTime.length < 8) sampleTime.push(p.row.tab + " " + newD + " ￥" + p.row.money + " " + (p.row.time || "空") + " → " + p.rec.time);
    }
    if (oldD === newD && p.row.time === p.rec.time) fixOther++;
  });

  const added = truth.filter(function (r) { return !r.used; }).length;
  const kept  = sheetRows.filter(function (r) { return !r.matched && !r.outside; }).length;

  let msg = "LINEから読めた記録: " + truth.length + "件\n";
  msg += "対象の営業日: " + fmtDate_(new Date(minD)) + " 〜 " + fmtDate_(new Date(maxD)) + "\n";
  msg += "──────────────\n";
  PASSES.forEach(function (P, i) { msg += "照合" + (i + 1) + " " + P.name + ": " + passCount[i] + "件\n"; });
  msg += "──────────────\n";
  msg += "📅 営業曜日を直す: " + fixDate + "件\n";
  msg += "🔧 乗車時間を直す: " + fixTime + "件\n";
  msg += "✅ 既に合っていた: " + fixOther + "件\n";
  msg += "➕ スプシに無いので追加: " + added + "件\n";
  msg += "🤔 LINEに該当なし（そのまま残す）: " + kept + "件\n";

  if (sampleDate.length) { msg += "\n【営業曜日が直る例】\n"; sampleDate.forEach(function (x) { msg += "・" + x + "\n"; }); }
  if (sampleTime.length) { msg += "\n【乗車時間が直る例】\n"; sampleTime.forEach(function (x) { msg += "・" + x + "\n"; }); }

  if (!apply) {
    msg += "\n──────────────\n";
    msg += (fixDate + fixTime + added === 0)
      ? "✅ 変更はありませんでした。"
      : "内容を確認して、問題なければ②を押してください。";
    return msg;
  }

  progSet_(75, "書き戻しの準備中");

  // --- 書き戻し用の行を組む ---
  progSet_(85, "個人タブを書き戻し中");
  const plan = {};
  PERSONAL_TABS.forEach(function (n) { plan[n] = []; });

  pairs.forEach(function (p) {
    const oldId = String(p.row.r[C_LINK - 1]).trim();
    const oldOther = String(p.row.r[C_OTHER - 1]).replace(/\n/g, "").trim();
    const rec = p.rec;
    if (!rec.other && oldOther) rec.other = oldOther;     // 手書きメモは残す
    const changed = (ymd(p.row.date) !== ymd(rec.bizDate)) || (p.row.time !== rec.time);
    rec.mark = changed ? "🔧" : "";      // 変更がなければ印は消す
    rec.messageId = isRealLineId_(oldId) ? oldId
      : "FIX-" + rec.ownerTab + "|" + ymd(rec.bizDate) + "|" + rec.time + "|" + rec.money;
    plan[rec.ownerTab].push(buildRow_(rec));
  });
  truth.forEach(function (rec) {
    if (rec.used) return;
    rec.mark = "🆕";
    rec.messageId = "FIX-" + rec.ownerTab + "|" + ymd(rec.bizDate) + "|" + rec.time + "|" + rec.money;
    plan[rec.ownerTab].push(buildRow_(rec));
  });
  sheetRows.forEach(function (row) {
    if (row.matched) return;
    const rr = row.r.slice();
    if (!row.outside) rr[C_MARK - 1] = "";                // 印はいったん消す
    plan[row.tab].push(rr);                               // 該当なし・期間外はそのまま残す
  });

  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const rows = plan[name] || [];
    const last = sh.getLastRow();
    if (last >= START_ROW) {
      sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).clearContent().clearNote().clearFormat();
    }
    if (!rows.length) return;
    if (sh.getMaxRows() < START_ROW + rows.length) {
      sh.insertRowsAfter(sh.getMaxRows(), START_ROW + rows.length - sh.getMaxRows());
    }
    sh.getRange(START_ROW, 1, rows.length, LAST_COL).setValues(rows);
  });

  rebuildDerivedTabs();

  msg += "\n──────────────\n";
  msg += "✅ 修復しました（営業曜日 " + fixDate + " / 乗車時間 " + fixTime + " / 追加 " + added + "）\n";
  msg += "並び順・連動タブも作り直しました。";
  return msg;
}

/* ============ 9-5. 乗り場名の表記ゆれ ============ */

const KANA_H2F = {
  "ｶﾞ":"ガ","ｷﾞ":"ギ","ｸﾞ":"グ","ｹﾞ":"ゲ","ｺﾞ":"ゴ","ｻﾞ":"ザ","ｼﾞ":"ジ","ｽﾞ":"ズ","ｾﾞ":"ゼ","ｿﾞ":"ゾ",
  "ﾀﾞ":"ダ","ﾁﾞ":"ヂ","ﾂﾞ":"ヅ","ﾃﾞ":"デ","ﾄﾞ":"ド","ﾊﾞ":"バ","ﾋﾞ":"ビ","ﾌﾞ":"ブ","ﾍﾞ":"ベ","ﾎﾞ":"ボ",
  "ﾊﾟ":"パ","ﾋﾟ":"ピ","ﾌﾟ":"プ","ﾍﾟ":"ペ","ﾎﾟ":"ポ","ｳﾞ":"ヴ",
  "ｱ":"ア","ｲ":"イ","ｳ":"ウ","ｴ":"エ","ｵ":"オ","ｶ":"カ","ｷ":"キ","ｸ":"ク","ｹ":"ケ","ｺ":"コ",
  "ｻ":"サ","ｼ":"シ","ｽ":"ス","ｾ":"セ","ｿ":"ソ","ﾀ":"タ","ﾁ":"チ","ﾂ":"ツ","ﾃ":"テ","ﾄ":"ト",
  "ﾅ":"ナ","ﾆ":"ニ","ﾇ":"ヌ","ﾈ":"ネ","ﾉ":"ノ","ﾊ":"ハ","ﾋ":"ヒ","ﾌ":"フ","ﾍ":"ヘ","ﾎ":"ホ",
  "ﾏ":"マ","ﾐ":"ミ","ﾑ":"ム","ﾒ":"メ","ﾓ":"モ","ﾔ":"ヤ","ﾕ":"ユ","ﾖ":"ヨ",
  "ﾗ":"ラ","ﾘ":"リ","ﾙ":"ル","ﾚ":"レ","ﾛ":"ロ","ﾜ":"ワ","ｦ":"ヲ","ﾝ":"ン",
  "ｧ":"ァ","ｨ":"ィ","ｩ":"ゥ","ｪ":"ェ","ｫ":"ォ","ｯ":"ッ","ｬ":"ャ","ｭ":"ュ","ｮ":"ョ","ｰ":"ー"
};

function toFullKana_(str) {
  let s = String(str);
  const keys = Object.keys(KANA_H2F).sort(function (a, b) { return b.length - a.length; });
  keys.forEach(function (k) { s = s.split(k).join(KANA_H2F[k]); });
  return s;
}

/**
 * 乗り場名を集計用に正規化する。
 * 全角半角・大文字小文字・空白・記号・末尾の「乗り場」などを吸収する。
 * ※「天満」と「天満橋」のような別の場所は、勝手に統合しない。
 */
function normalizePlace_(str) {
  let s = toFullKana_(String(str).replace(/\n/g, ""));
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
  });
  s = s.toUpperCase();
  s = s.replace(/[\s　・･、。．\.,\-–—_（）\(\)「」『』【】]/g, "");
  s = s.replace(/(タクシー)?(乗り場|乗場|ノリバ|のりば)$/, "");
  s = s.replace(/(ドンキホーテ|ドンキ)/g, "ドン");
  return s;
}

function menuPlaceNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groups = {};   // 正規化名 -> { total, variants: {表記: 件数} }

  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, C_PLACE, last - START_ROW + 1, 1).getValues().forEach(function (r) {
      const raw = String(r[0]).replace(/\n/g, "").trim();
      if (!raw) return;
      const key = normalizePlace_(raw);
      if (!key) return;
      if (!groups[key]) groups[key] = { total: 0, variants: {} };
      groups[key].total++;
      groups[key].variants[raw] = (groups[key].variants[raw] || 0) + 1;
    });
  });

  const keys = Object.keys(groups).sort(function (a, b) {
    return groups[b].total - groups[a].total || a.localeCompare(b);
  });

  // 表記ゆれが実際にあったもの
  let lines = [];
  let merged = 0;
  keys.forEach(function (k) {
    const v = Object.keys(groups[k].variants);
    if (v.length > 1) {
      merged++;
      lines.push("● " + k + "  (計" + groups[k].total + "件)");
      v.forEach(function (x) { lines.push("    ← " + x + " (" + groups[k].variants[x] + ")"); });
    }
  });

  // 名前が含まれ合っていて、統合するか判断が要るもの
  let cand = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < keys.length; j++) {
      if (i === j) continue;
      if (keys[i].length >= 2 && keys[j].indexOf(keys[i]) === 0 && keys[j] !== keys[i]) {
        cand.push("△ " + keys[i] + " (" + groups[keys[i]].total + ") ／ " +
                  keys[j] + " (" + groups[keys[j]].total + ")");
      }
    }
  }
  cand = cand.filter(function (x, i, a) { return a.indexOf(x) === i; });

  let out = "■ 乗り場名 " + keys.length + "種類（延べ " +
            keys.reduce(function (a, k) { return a + groups[k].total; }, 0) + "件）\n\n";
  out += "■ 自動で同じ扱いにできたもの: " + merged + "件\n";
  out += lines.length ? lines.join("\n") + "\n\n" : "（なし）\n\n";
  out += "■ 統合するか判断が必要なもの: " + cand.length + "組\n";
  out += "（例: 大丸 と 大丸乗り場 は同じ。天満 と 天満橋 は別の場所）\n";
  out += cand.length ? cand.join("\n") + "\n\n" : "（なし）\n\n";
  out += "■ 全ての乗り場名（多い順）\n";
  keys.forEach(function (k) {
    out += k + "\t" + groups[k].total + "\n";
  });

  progSet_(100, "完了");
  return out;
}


/* ---- 乗り場名の別名辞書 ---- */

let _placeAliasCache = null;

function getPlaceAlias_() {
  if (_placeAliasCache) return _placeAliasCache;
  const raw = PropertiesService.getScriptProperties().getProperty("PLACE_ALIAS");
  try { _placeAliasCache = raw ? JSON.parse(raw) : {}; } catch (e) { _placeAliasCache = {}; }
  return _placeAliasCache;
}

function savePlaceAlias_(map) {
  PropertiesService.getScriptProperties().setProperty("PLACE_ALIAS", JSON.stringify(map));
  _placeAliasCache = map;
}

/** 表記ゆれを代表名に置き換える */
function canonicalPlace_(s) {
  const raw = String(s).replace(/\n/g, "").trim();
  if (!raw) return raw;
  const map = getPlaceAlias_();
  const k = normalizePlace_(raw);
  return map[k] || raw;
}

/** 全タブのG列を集計してグループを作る */
function collectPlaceGroups_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groups = {};
  PERSONAL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, C_PLACE, last - START_ROW + 1, 1).getValues().forEach(function (r) {
      const raw = String(r[0]).replace(/\n/g, "").trim();
      if (!raw) return;
      const k = normalizePlace_(raw);
      if (!k) return;
      if (!groups[k]) groups[k] = { total: 0, variants: {} };
      groups[k].total++;
      groups[k].variants[raw] = (groups[k].variants[raw] || 0) + 1;
    });
  });
  return groups;
}

function menuPlaceUnify() {
  const groups = collectPlaceGroups_();
  const keys = Object.keys(groups).sort(function (a, b) { return groups[b].total - groups[a].total; });

  // 自動でまとめられるもの（表記ゆれだけ）
  const autoList = [];
  keys.forEach(function (k) {
    const vs = Object.keys(groups[k].variants);
    if (vs.length < 2) return;
    vs.sort(function (a, b) { return groups[k].variants[b] - groups[k].variants[a]; });
    autoList.push({ key: k, canon: vs[0], variants: vs, total: groups[k].total });
  });

  // 名前が含まれ合っていて、統合するか判断が要るもの
  const pairs = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < keys.length; j++) {
      if (i === j) continue;
      const a = keys[i], b = keys[j];
      if (a.length >= 2 && b.indexOf(a) === 0 && b !== a) {
        pairs.push({ small: a, big: b, sn: groups[a].total, bn: groups[b].total });
      }
    }
  }

  let h = '<!DOCTYPE html><html><head><base target="_top"><style>' +
    'body{font-family:sans-serif;padding:14px;color:#333;font-size:13px}' +
    'h3{font-size:15px;margin:0 0 8px;border-bottom:2px solid #1155ca;padding-bottom:6px}' +
    'h4{font-size:13px;margin:16px 0 6px}' +
    '.box{background:#f7f7f7;border-radius:6px;padding:10px;max-height:150px;overflow:auto;font-size:12px}' +
    '.g{margin-bottom:6px}.v{color:#666;margin-left:14px}' +
    'label{display:block;padding:5px;border-bottom:1px solid #eee}' +
    'button{width:100%;padding:12px;margin-top:12px;background:#1155ca;color:#fff;border:none;' +
    'border-radius:5px;font-weight:bold;font-size:15px;cursor:pointer}' +
    '#r{margin-top:10px;font-size:12px;white-space:pre-wrap;background:#eef;padding:8px;border-radius:5px}' +
    '</style></head><body><h3>🏷 乗り場名の表記ゆれを統一</h3>';

  h += '<h4>① 自動でまとめるもの（' + autoList.length + '組）</h4><div class="box">';
  if (!autoList.length) h += '（なし）';
  autoList.forEach(function (g) {
    h += '<div class="g"><b>' + g.canon + '</b> (計' + g.total + '件)';
    g.variants.forEach(function (v) {
      if (v !== g.canon) h += '<div class="v">← ' + v + ' (' + groups[g.key].variants[v] + ')</div>';
    });
    h += '</div>';
  });
  h += '</div>';

  h += '<h4>② 同じ場所ならチェック（' + pairs.length + '組）</h4>' +
       '<div style="font-size:11px;color:#888;margin-bottom:4px">' +
       '例: 大丸 と 大丸乗り場 は同じ／天満 と 天満橋 は別の場所</div><div class="box">';
  if (!pairs.length) h += '（なし）';
  pairs.forEach(function (p, i) {
    h += '<label><input type="checkbox" name="p" value="' + i + '"> ' +
         p.big + ' (' + p.bn + ') → <b>' + p.small + '</b> (' + p.sn + ') にまとめる</label>';
  });
  h += '</div>';

  h += '<button id="b" onclick="go()">この内容で統一する</button>' + progressWidget_() + '<div id="r"></div>';
  h += '<script>var PAIRS=' + JSON.stringify(pairs) + ';' +
    'function go(){var cs=document.getElementsByName("p"),sel=[];' +
    'for(var i=0;i<cs.length;i++) if(cs[i].checked) sel.push(PAIRS[parseInt(cs[i].value,10)]);' +
    'document.getElementById("b").disabled=true;progShow();' +
    'google.script.run.withSuccessHandler(function(m){document.getElementById("r").innerText=m;progDone("完了しました");' +
    'document.getElementById("b").disabled=false;})' +
    '.withFailureHandler(function(e){progFail(e.message);' +
    'document.getElementById("b").disabled=false;}).applyPlaceUnify(JSON.stringify(sel));}' +
    '</script></body></html>';

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(h).setWidth(520).setHeight(600), "🏷 乗り場名の統一");
}

function applyPlaceUnify(selectedJson) {
  progClear_();
  progSet_(10, "乗り場名を集計中");
  const selected = JSON.parse(selectedJson || "[]");
  const groups = collectPlaceGroups_();
  const map = getPlaceAlias_();

  // ① 表記ゆれ → 一番よく使われている書き方に寄せる
  let autoN = 0;
  Object.keys(groups).forEach(function (k) {
    const vs = Object.keys(groups[k].variants);
    vs.sort(function (a, b) { return groups[k].variants[b] - groups[k].variants[a]; });
    map[k] = vs[0];
    if (vs.length > 1) autoN++;
  });

  // ② チェックされたペア → 短いほうの代表名に寄せる
  selected.forEach(function (p) {
    const canon = map[p.small] || p.small;
    map[p.big] = canon;
  });

  savePlaceAlias_(map);

  // 全タブのG列を書き換える
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rewritten = 0;
  ALL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    const rg = sh.getRange(START_ROW, C_PLACE, last - START_ROW + 1, 1);
    const vals = rg.getValues();
    let touched = false;
    for (let i = 0; i < vals.length; i++) {
      const raw = String(vals[i][0]).replace(/\n/g, "").trim();
      if (!raw) continue;
      const c = canonicalPlace_(raw);
      if (c !== raw) { vals[i][0] = c; rewritten++; touched = true; }
    }
    if (touched) rg.setValues(vals);
  });

  ALL_TABS.forEach(function (n, i) {
    progSet_(60 + Math.round(38 * i / ALL_TABS.length), n + "タブ整形中");
    const sh = ss.getSheetByName(n);
    if (sh) { try { formatTab_(sh); } catch (e) { logErr_("format:" + n, e); } }
  });
  progSet_(100, "完了");

  return "✅ 統一しました\n" +
         "・自動でまとめた表記ゆれ: " + autoN + "組\n" +
         "・手動で選んだ統合: " + selected.length + "組\n" +
         "・書き換えたセル: " + rewritten + "個\n\n" +
         "この対応表は保存されたので、今後LINEから入る分も自動で統一されます。";
}


/* ============ 9-7. LINE履歴の解析結果を一覧で見る ============ */

function menuHistoryReport() {
  const html = `
  <!DOCTYPE html><html><head><base target="_top"><style>
    body{font-family:sans-serif;padding:15px;color:#333}
    h3{font-size:15px;margin-top:0;border-bottom:2px solid #34a853;padding-bottom:6px}
    .d{font-size:12px;color:#666;margin-bottom:10px;line-height:1.6}
    textarea{width:100%;height:120px;font-size:12px;box-sizing:border-box}
    button{width:100%;padding:12px;margin-top:8px;background:#34a853;color:#fff;border:none;
           border-radius:5px;font-weight:bold;font-size:15px;cursor:pointer}
    #r{width:100%;height:230px;font-size:11px;font-family:monospace;margin-top:10px;box-sizing:border-box}
  </style></head><body>
    <h3>📋 LINE履歴の解析結果</h3>
    <div class="d">
      貼り付けた履歴のうち、何件を記録として読み取れたか、<br>
      読み取れなかった投稿は何だったかを全部出します。<b>スプシは変更しません。</b>
    </div>
    <textarea id="tx" placeholder="トーク履歴のテキストをここに貼り付け"></textarea>
    <button id="b" onclick="go()">解析結果を見る</button>
    ` + progressWidget_() + `
    <textarea id="r" readonly></textarea>
    <button onclick="cp()" style="background:#1155ca">📋 結果をコピー</button>
    <script>
      function go(){
        var b=document.getElementById('b'); b.disabled=true; progShow();
        google.script.run
          .withSuccessHandler(function(m){document.getElementById('r').value=m;progDone("完了しました");b.disabled=false;})
          .withFailureHandler(function(e){progFail(e.message);b.disabled=false;})
          .analyzeHistory(document.getElementById('tx').value);
      }
      function cp(){var t=document.getElementById('r');t.select();
        try{document.execCommand("copy");alert("コピーしました");}catch(e){alert("長押しで選択してコピー");}}
    </script>
  </body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(560).setHeight(620), "📋 解析結果");
}

function analyzeHistory(text) {
  progClear_();
  progSet_(5, "履歴を読み込み中");
  const msgs = parseHistory_(text);
  if (!msgs.length) return "⚠️ 履歴を1件も読み取れませんでした。貼り付けた内容を確認してください。";

  const SYS = /メッセージの送信を取り消しました|グループに追加しました|グループ通話|アナウンス|\[スタンプ\]|\[写真\]|\[動画\]|退出しました/;
  const byTab = {}, unknown = {};
  let sys = 0, chat = 0, ok = 0;
  const failed = [];
  let first = null, last = null;

  msgs.forEach(function (m, mi) {
    if (mi % 50 === 0) progSet_(10 + Math.round(85 * mi / msgs.length), "解析中 " + mi + " / " + msgs.length + "件");
    if (!first || m.dt < first) first = m.dt;
    if (!last || m.dt > last) last = m.dt;
    if (SYS.test(m.body)) { sys++; return; }
    const tab = tabFromDisplayName_(m.name);
    if (!tab) { unknown[m.name] = (unknown[m.name] || 0) + 1; return; }
    if (!byTab[tab]) byTab[tab] = { ok: 0, ng: 0 };

    const rec = parseRideMessage_(m.body, m.dt);
    if (rec) { ok++; byTab[tab].ok++; return; }

    // 記録っぽいのに読めなかったものだけ拾う（数字が2つ以上ある投稿）
    const nums = (toHalf_(m.body).match(/\d{3,6}/g) || []).length;
    if (nums >= 2 || /\d{1,3}\s*分/.test(m.body)) {
      byTab[tab].ng++;
      failed.push(fmtDate_(m.dt) + " " + pad2_(m.dt.getHours()) + ":" + pad2_(m.dt.getMinutes()) +
                  " " + tab + " │ " + m.body.replace(/\n/g, " / ").slice(0, 60));
    } else { chat++; }
  });

  let out = "";
  out += "■ 期間: " + (first ? fmtDate_(first) : "-") + " 〜 " + (last ? fmtDate_(last) : "-") + "\n";
  out += "■ 全メッセージ: " + msgs.length + "件\n";
  out += "──────────────\n";
  out += "✅ 記録として読めた: " + ok + "件\n";
  out += "⚠️ 記録っぽいが読めなかった: " + failed.length + "件\n";
  out += "💬 雑談: " + chat + "件\n";
  out += "⚙️ システム(通話・スタンプ等): " + sys + "件\n\n";

  out += "■ 人別\n";
  Object.keys(byTab).forEach(function (t) {
    out += "  " + t + " : 読めた" + byTab[t].ok + "件 / 読めず" + byTab[t].ng + "件\n";
  });
  const uk = Object.keys(unknown);
  if (uk.length) {
    out += "\n■ タブ未設定のメンバー\n";
    uk.forEach(function (n) { out += "  " + n + " (" + unknown[n] + "件)\n"; });
  }
  if (failed.length) {
    out += "\n■ 読めなかった投稿（全" + failed.length + "件）\n";
    failed.forEach(function (f) { out += "  " + f + "\n"; });
  }
  progSet_(100, "完了");
  return out;
}


/* ============ 9-8. 重複行の検出と削除 ============ */

function dedupeKey2_(r) {
  const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
  if (isNaN(money)) return "";
  const time = String(r[C_TIME - 1]).trim();
  const place = normalizePlace_(String(r[C_PLACE - 1]));
  if (!time && !place) return "";
  return money + "|" + time + "|" + place;
}

/** どの行を残すか。本物のLINE ID > 情報が多い > 古い日付 */
function dupScore_(r) {
  let sc = 0;
  if (isRealLineId_(r[C_LINK - 1])) sc += 1000;
  for (let i = 0; i < LAST_COL; i++) if (String(r[i]).trim() !== "") sc += 10;
  return sc;
}

function collectDupes_(ss) {
  const groups = [];
  ALL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    const vals = sh.getRange(START_ROW, 1, last - START_ROW + 1, LAST_COL).getValues();

    // まず「金額＋乗り場」でざっくりまとめる
    const map = {};
    vals.forEach(function (r, i) {
      const d = r[C_DATE - 1];
      if (!(d instanceof Date)) return;
      const money = parseInt(String(r[C_MONEY - 1]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(money)) return;
      const place = normalizePlace_(String(r[C_PLACE - 1]));
      const k = money + "|" + place;
      (map[k] = map[k] || []).push({
        row: START_ROW + i, r: r, date: d, money: money, place: place,
        time: String(r[C_TIME - 1]).trim(),
        other: String(r[C_OTHER - 1]).replace(/[\s\n、]/g, ""),
        wait: String(r[C_WAIT - 1]).replace(/[\s\n]/g, "")
      });
    });

    Object.keys(map).forEach(function (k) {
      const list = map[k];
      if (list.length < 2) return;
      const used = {};
      for (let a = 0; a < list.length; a++) {
        if (used[a]) continue;
        const same = [list[a]];
        for (let b = a + 1; b < list.length; b++) {
          if (used[b]) continue;
          const x = list[a], y = list[b];
          // 乗車時間が同じ、または そのほか が同じなら同じ乗車とみなす
          const hit = (x.time && x.time === y.time) ||
                      (x.other && x.other === y.other) ||
                      (x.wait && x.wait === y.wait && x.time === y.time);
          if (hit) { same.push(y); used[b] = true; }
        }
        if (same.length < 2) continue;
        used[a] = true;
        const sorted = same.slice().sort(function (p, q) {
          const d = dupScore_(q.r) - dupScore_(p.r);
          return d !== 0 ? d : p.date.getTime() - q.date.getTime();
        });
        // 何が違うのか
        const diff = [];
        if (sorted.some(function (x) { return fmtDate_(x.date) !== fmtDate_(sorted[0].date); })) diff.push("営業曜日");
        if (sorted.some(function (x) { return x.time !== sorted[0].time; })) diff.push("乗車時間");
        if (sorted.some(function (x) { return x.wait !== sorted[0].wait; })) diff.push("待ち時間");
        if (sorted.some(function (x) { return x.other !== sorted[0].other; })) diff.push("そのほか");
        groups.push({ tab: name, key: k, keep: sorted[0], drop: sorted.slice(1), diff: diff });
      }
    });
  });
  return groups;
}

function menuDedupe() {
  runnerDialog_({
    title: "🔁 重複している行を探して消す",
    color: "#a61c00",
    desc: "<b>金額・乗車時間・乗り場</b>が同じ行を重複とみなします。<br>" +
          "営業曜日がずれていても検出します。<br>" +
          "対象は全タブです（個人タブ・エリアタブ・関空・ﾊﾞﾗｼ）。<br>" +
          "残す1行は「LINEの本物のID → 情報が多い → 古い日付」の順で選びます。<br>" +
          "📅 が付いたものは日付が違う重複です。消す前に必ず確認してください。",
    previewFn: true, previewLabel: "① 重複を調べるだけ（変更しません）",
    applyLabel: "② この内容で重複を消す",
    confirm: "重複行を削除します。よろしいですか？",
    fn: "runDedupe", h: 250, height: 660
  });
}

function runDedupe(apply) {
  progClear_();
  progSet_(10, "重複を探しています");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groups = collectDupes_(ss);
  if (!groups.length) return "✅ 重複している行はありませんでした。";

  let dropN = 0, dateDiff = 0;
  let out = "";
  groups.forEach(function (g) {
    dropN += g.drop.length;
    const kd = fmtDate_(g.keep.date);
    const others = g.drop.map(function (x) { return fmtDate_(x.date); });
    const differ = others.some(function (x) { return x !== kd; });
    if (differ) dateDiff++;
    const p = g.key.split("|");
    out += (differ ? "📅 " : "🔁 ") + g.tab + " ￥" + (+p[0]).toLocaleString() +
           " " + p[1] + (g.diff.length ? "  （違う項目: " + g.diff.join("・") + "）" : "  （完全一致）") + "\n";
    out += "    残す: " + kd + "(" + g.keep.row + "行目)  消す: " +
           g.drop.map(function (x) { return fmtDate_(x.date) + "(" + x.row + "行目)"; }).join(", ") + "\n";
  });

  let msg = "重複グループ: " + groups.length + "組\n";
  msg += "消える行: " + dropN + "行\n";
  msg += "うち営業曜日が違うもの: " + dateDiff + "組\n";
  msg += "──────────────\n" + out;

  if (!apply) { progSet_(100, "完了"); return msg + "\n──────────────\n内容を確認して、問題なければ②を押してください。"; }

  progSet_(40, "削除の準備中");

  // タブごとに、消す行番号をまとめて下から削除
  const byTab = {};
  groups.forEach(function (g) {
    g.drop.forEach(function (x) { (byTab[g.tab] = byTab[g.tab] || []).push(x.row); });
  });
  const tabs = Object.keys(byTab);
  tabs.forEach(function (tab, i) {
    progSet_(50 + Math.round(8 * i / tabs.length), tab + "タブの重複を削除中");
    const sh = ss.getSheetByName(tab);
    const rows = byTab[tab].slice().sort(function (a, b) { return b - a; });
    rows.forEach(function (rw) { sh.deleteRow(rw); });
  });

  rebuildDerivedTabs();
  progSet_(100, "完了");
  return msg + "\n──────────────\n✅ " + dropN + "行を削除し、連動タブも作り直しました。";
}


/* ============ 9-9. 見直し結果を新しいスプシに出す ============ */

function menuRepairPreview() {
  const html = `
  <!DOCTYPE html><html><head><base target="_top"><style>
    body{font-family:sans-serif;padding:15px;color:#333}
    h3{font-size:15px;margin-top:0;border-bottom:2px solid #0b5394;padding-bottom:6px}
    .d{font-size:12px;color:#666;margin-bottom:10px;line-height:1.7}
    .row{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    input[type=date]{flex:1;font-size:14px;padding:6px}
    textarea{width:100%;height:130px;font-size:12px;box-sizing:border-box}
    button{width:100%;padding:12px;margin-top:8px;background:#0b5394;color:#fff;
           border:none;border-radius:5px;font-weight:bold;font-size:15px;cursor:pointer}
    #r{font-size:13px;margin-top:12px;line-height:1.8}
    #r a{display:block;background:#fff2cc;border:1px solid #fbbc04;padding:12px;
         border-radius:6px;text-align:center;font-weight:bold;margin-top:8px}
  </style></head><body>
    <h3>🧪 見直し結果を新しいスプシに出す</h3>
    <div class="d">
      営業曜日や乗車時間がどう直るかを、<b>色分けした一覧</b>で確認できます。<br>
      新しいスプレッドシートを作るだけなので、<b>本番のスプシは一切変わりません。</b>
    </div>
    <div class="row"><input type="date" id="f"><span>～</span><input type="date" id="t"></div>
    <textarea id="tx" placeholder="トーク履歴のテキストをここに貼り付け"></textarea>
    <button id="b" onclick="go()">確認用スプシを作る</button>
    ` + progressWidget_() + `
    <div id="r"></div>
    <script>
      (function(){
        var t=new Date(), f=new Date(2026,0,1);
        function s(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
        document.getElementById('f').value=s(f); document.getElementById('t').value=s(t);
      })();
      function go(){
        var b=document.getElementById('b'); b.disabled=true; progShow();
        google.script.run
          .withSuccessHandler(function(o){
            progDone("できました");
            b.disabled=false;
            if(o && o.url){
              document.getElementById('r').innerHTML = o.summary.replace(/\\n/g,"<br>") +
                '<a href="'+o.url+'" target="_blank">📗 確認用スプシを開く</a>';
            } else {
              document.getElementById('r').innerText = o && o.summary ? o.summary : "作成できませんでした";
            }
          })
          .withFailureHandler(function(e){progFail(e.message);b.disabled=false;})
          .buildRepairPreviewSheet(document.getElementById('tx').value,
                                   document.getElementById('f').value,
                                   document.getElementById('t').value);
      }
    </script>
  </body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(470).setHeight(600), "🧪 確認用スプシ");
}

function buildRepairPreviewSheet(text, fromStr, toStr) {
  progClear_();
  progSet_(5, "LINE履歴を解析中");
  const R = computeRepair_(text, fromStr, toStr);
  if (!R) return { summary: "⚠️ LINE履歴から記録を1件も読み取れませんでした。" };

  const ymd = ymdOf_;
  const daysStr = ["日","月","火","水","木","金","土"];
  const dsp = function (d) { return (d.getMonth()+1) + "/" + d.getDate() + "(" + daysStr[d.getDay()] + ")"; };

  progSet_(45, "比較表を作成中");
  const rows = [];
  let nDate = 0, nTime = 0, nSame = 0;

  R.pairs.forEach(function (p) {
    const oldD = ymd(p.row.date), newD = ymd(p.rec.bizDate);
    const dCh = oldD !== newD, tCh = p.row.time !== p.rec.time;
    if (dCh) nDate++;
    if (tCh) nTime++;
    if (!dCh && !tCh) nSame++;
    rows.push({
      kind: dCh ? "date" : (tCh ? "time" : "same"),
      v: [ dCh ? "📅 営業曜日を直す" : (tCh ? "🔧 乗車時間を直す" : "✅ 変更なし"),
           p.row.tab, R.passes[p.pass].name,
           dsp(p.row.date), dCh ? dsp(p.rec.bizDate) : "",
           p.row.time,      tCh ? p.rec.time : "",
           p.row.money,
           String(p.row.r[C_PLACE - 1]).replace(/\n/g, ""),
           p.rec.place, p.rec.wait, p.rec.method, p.rec.other ]
    });
  });
  R.truth.forEach(function (rec) {
    if (rec.used) return;
    rows.push({ kind: "add",
      v: [ "🟠 スプシに無いので追加", rec.ownerTab, "－", "", dsp(rec.bizDate), "", rec.time,
           rec.money, "", rec.place, rec.wait, rec.method, rec.other ] });
  });
  R.sheetRows.forEach(function (row) {
    if (row.matched || row.outside) return;
    rows.push({ kind: "keep",
      v: [ "🤔 LINEに該当なし（残す）", row.tab, "－", dsp(row.date), "", row.time, "",
           row.money, String(row.r[C_PLACE - 1]).replace(/\n/g, ""), "", "", "", "" ] });
  });

  rows.sort(function (a, b) {
    const o = { date:0, time:1, add:2, keep:3, same:4 };
    return o[a.kind] - o[b.kind];
  });

  progSet_(70, "新しいスプレッドシートを作成中");
  const now = new Date();
  const stamp = (now.getMonth()+1) + "/" + now.getDate() + " " + pad2_(now.getHours()) + ":" + pad2_(now.getMinutes());
  const title = "🧪【確認用・テスト】営業曜日の見直し結果 " + stamp + " ※本番には反映されていません";
  const ns = SpreadsheetApp.create(title);
  const sh = ns.getSheets()[0];
  sh.setName("見直し結果");

  const header = ["判定", "タブ", "照合方法", "現在の営業曜日", "→ 修正後",
                  "現在の乗車時間", "→ 修正後", "金額", "現在の乗り場",
                  "LINEの乗り場", "待ち", "乗車方法", "そのほか"];
  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight("bold").setBackground("#cccccc").setHorizontalAlignment("center");

  const legend = "📅 営業曜日を直す " + nDate + "件 ／ 🔧 乗車時間を直す " + nTime +
                 "件 ／ 🟠 追加 " + R.truth.filter(function(r){return !r.used;}).length +
                 "件 ／ 🤔 LINEに該当なし " + R.sheetRows.filter(function(r){return !r.matched && !r.outside;}).length +
                 "件 ／ ✅ 変更なし " + nSame + "件";
  sh.insertRowBefore(1);
  sh.getRange(1, 1, 1, header.length).merge().setValue(legend)
    .setFontWeight("bold").setBackground("#fff4e5").setFontColor("#e65100");

  if (rows.length) {
    sh.getRange(3, 1, rows.length, header.length).setValues(rows.map(function (r) { return r.v; }));
    const BG = { date:"#ffe086", time:"#c6f6ff", add:"#d9ead3", keep:"#f3f3f3", same:"#ffffff" };
    const bgs = rows.map(function (r) {
      const a = new Array(header.length).fill("#ffffff");
      a[0] = BG[r.kind];
      if (r.kind === "date") { a[3] = BG.date; a[4] = BG.date; }
      if (r.kind === "time") { a[5] = BG.time; a[6] = BG.time; }
      if (r.kind === "add")  { a[4] = BG.add;  a[6] = BG.add; }
      return a;
    });
    sh.getRange(3, 1, rows.length, header.length).setBackgrounds(bgs)
      .setBorder(true, true, true, true, true, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(3, 8, rows.length, 1).setNumberFormat('"¥"#,##0');
  }
  sh.setFrozenRows(2);
  [180, 60, 110, 110, 110, 100, 100, 80, 160, 160, 60, 100, 200]
    .forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 1, Math.max(rows.length + 1, 1), header.length).createFilter();

  progSet_(100, "完了");
  let summary = "✅ 確認用スプシを作りました\n";
  summary += "対象: " + dsp(new Date(R.minD)) + " 〜 " + dsp(new Date(R.maxD)) + "\n";
  summary += legend.replace(/／/g, "\n");
  return { url: ns.getUrl(), summary: summary };
}

/* ============ 9-10. イライラを沈める ============ */

const CHILL_LIST = [
  ["お笑い 漫才 傑作選",        "とりあえず漫才で"],
  ["猫 おもしろ 動画",          "猫はだいたい正しい"],
  ["大喜利 傑作",               "頭を空っぽに"],
  ["ドッキリ 爆笑",             "他人の不幸は蜜の味"],
  ["赤ちゃん 笑う 動画",        "純度100%の笑顔"],
  ["タクシー ドラレコ 面白い",  "同業のあるある"],
  ["コント 名作",               "腰を据えて laughs"],
  ["動物 おもしろ 失敗",        "みんな失敗してる"]
];

function menuChill() {
  const pick = CHILL_LIST[Math.floor(Math.random() * CHILL_LIST.length)];
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(pick[0]);
  const html = '<!DOCTYPE html><html><head><base target="_top"><style>' +
    'body{font-family:sans-serif;padding:22px;text-align:center;color:#333}' +
    'h3{font-size:17px;margin:0 0 6px}' +
    '.s{font-size:13px;color:#666;margin-bottom:18px}' +
    'a{display:block;background:#d93025;color:#fff;padding:15px;border-radius:8px;' +
    'text-decoration:none;font-weight:bold;font-size:16px}' +
    '.n{font-size:11px;color:#999;margin-top:14px;line-height:1.6}' +
    '</style></head><body>' +
    '<h3>' + pick[1] + '</h3>' +
    '<div class="s">キーワード：' + pick[0] + '</div>' +
    '<a href="' + url + '" target="_blank">▶ YouTubeを開く</a>' +
    '<div class="n">コードは逃げません。<br>戻ってきたら続きをやりましょう。</div>' +
    '</body></html>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(360).setHeight(260), "😂 ひと休み");
}

/* ============ 10. 編集時の自動処理 ============ */

function onEdit(e) {
  if (!e || !e.range) return;
  try {
    const sh = e.range.getSheet();
    const name = sh.getName();
    if (ALL_TABS.indexOf(name) === -1) return;
    const row = e.range.getRow();
    if (row < START_ROW) return;

    const rg = sh.getRange(row, 1, 1, LAST_COL);
    const r = rg.getValues()[0];

    // C〜I列に何か入っていて、B列が空なら営業曜日を自動で入れる
    let filled = false;
    for (let c = C_START; c <= C_OTHER; c++) if (String(r[c - 1]).trim() !== "") filled = true;
    if (filled && !(r[C_DATE - 1] instanceof Date) && String(r[C_DATE - 1]).trim() === "") {
      r[C_DATE - 1] = businessDate_(new Date());
      sh.getRange(row, C_DATE).setNumberFormat("M/d(ddd)");
    }
    // D・E・F・C列を整える。3回に分けず、まとめて1回で指定する
    sh.getRange(row, C_START, 1, C_TIME - C_START + 1).setNumberFormat("@");
    sh.getRange(row, C_MONEY).setNumberFormat('"¥"#,##0');
    normalizeRow_(r);
    rg.setValues([r]);

    touchStamp_(e.source, [name]);
    if (PERSONAL_TABS.indexOf(name) !== -1) {
      PropertiesService.getScriptProperties().setProperty("DIRTY", "1");
    }
  } catch (err) { logErr_("onEdit", err); }
}


/* ============ 11. 診断・ログ ============ */

function menuFindBadDates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = [];
  ALL_TABS.forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (!sh) { out.push("❌ タブが見つかりません: " + n); return; }
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    sh.getRange(START_ROW, C_DATE, last - START_ROW + 1, 1).getValues().forEach(function (r, i) {
      const d = r[0];
      if (d instanceof Date && (d.getFullYear() < 2025 || d.getFullYear() > 2026)) {
        out.push(n + " " + (i + START_ROW) + "行目 → " +
                 d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate());
      }
    });
  });
  SpreadsheetApp.getUi().alert(out.length ? out.join("\n") : "✅ 異常な日付はありませんでした");
}

function logErr_(where, err) {
  const msg = (err && err.message ? err.message : String(err));
  console.error("[" + where + "] " + msg);
  // 実行ログはスマホから見づらいので、直近のぶんだけ手元にも残しておく
  try {
    const pr = PropertiesService.getScriptProperties();
    let list = [];
    try { list = JSON.parse(pr.getProperty("LAST_ERRORS") || "[]"); } catch (e) {}
    list.unshift({ at: new Date().toISOString(), where: where, msg: String(msg).slice(0, 200) });
    pr.setProperty("LAST_ERRORS", JSON.stringify(list.slice(0, 5)));
  } catch (e) { /* 記録できなくても本題は止めない */ }
}

