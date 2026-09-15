/**
 * ================================================================
 *  LINE画像（Flex Message）＋ まとめスプシ レポート作成
 *
 *  ★★★  L017ver  （2026/09/06）  ★★★
 *
 *  ファイル記号: C=001-Code.gs / L=003-LineReport.gs / E=002-Extras.gs
 *  直したら数字を1つ増やし、下の履歴に何を直したか書く。
 *  いま動いているバージョンは メニュー「ℹ️ バージョンを確認」で見られる。
 *
 *  [L017ver]
 *  ▼ LINEの絵
 *   ・アツいエリアを曜日区分ごとに1つだけにした（通数が増えるため）
 *   ・金額帯の行に［アツい］［避ける］の言葉を入れた
 *     乗り場の名前が長くて1行に収まらないときだけ、言葉を外す（1行を守る）
 *   ・細い帯にも数字を入れるようにした
 *     半角2文字が必ず入るよう、帯の見た目の幅に下限を付けている
 *     「細い帯：◯◯3%」の添え書きは要らなくなったのでやめた
 *   ・「待ち1時間あたり￥◯◯」を、初心者にも分かる書き方に変えた
 *     「この乗り場で1時間待ち続けたとすると◯◯ぶんの売上になる計算」＋計算式
 *   ・オススメの時刻に「狙い目：」を付けた
 *   ・戦略予想を作り直した。3つの見出しに分け、データから書くようにした
 *     ▼来月はこういう月（行事・社会人の動き。12か月ぶん具体的に）
 *     ▼この期間の記録から（いちばん強かった曜日区分と時間帯、￥10,000超えの数、平均待ち）
 *     ▼おすすめの動き方（粘るか回すか。待ちが長いときの見切り時間まで）
 *
 *  ▼ まとめスプシ
 *   ・開いたときに、いちばん上から見えるようにした
 *     最後に書いた場所（ずっと下）が覚えられていて、開くとそこが出ていた
 *   ・エリア別の帯を濃い色にした（ﾛﾝｸﾞ=濃い赤／ﾐﾄﾞﾙ=濃い青／ｼｮｰﾄ=濃いグレー）
 *     内訳の行も同じ色分けにして、どれの話か目で追えるようにした
 *   ・細い帯にも、半角2桁が入る幅を確保して数字を入れるようにした
 *   ・ヒートマップの色を 1位=薄い赤／2位=薄い青／3位=薄い緑 にした
 *   ・長い乗り場名は、1行に収まる大きさまで自動で小さくするようにした
 *     変なところで折り返されて読めない、という状態をなくす（9ptまでは1行を優先）
 *   ・金額の文字色を記録用スプシと同じ決まりにそろえた
 *     15,000以上=濃い赤／10,000以上=濃い黄土色／5,000以上=濃い青／
 *     4,999以下=黒／999以下=濃いグレー
 *
 *  [L016ver]
 *   ・乗り場が書かれていない記録を、レポートから外すようにした
 *     表に名前のない行が並んでも、どこの話か分からず読みようがないため。
 *     自社ぶんもオプチャぶんも同じあつかいにする。
 *   ・何件のぞいたかは、LINEの絵とまとめスプシの見出しに出す
 *     黙って件数が減ると、記録用スプシの数と合わなくなって混乱するため
 *
 *  [L015ver]
 *  ▼ LINEの絵
 *   ・アツいエリアを3つずつに戻した（1つに絞っても1通にならなかったため）
 *   ・読み方の記号のうしろに「：」を付けた（🔥：アツい のように）
 *   ・見出しの途中で次のメッセージに移らないようにした
 *     前は「時間詳細」の真ん中で切り替わっていた。
 *     見出しとその中身をひとまとまりとして数え、まとめて次の通へ送る。
 *     1通に入りきらないほど大きいかたまりだけは分かれるが、
 *     そのときは見出しに「（つづき）」を付けて引き継ぐ
 *   ・中身を削るより通数を増やすようにした（上限5通）。実データでは4通、削りゼロ
 *
 *  ▼ まとめスプシ
 *   ・ヒートマップを、どの乗り場でも同じ形（月〜日 × 20〜05時台）にそろえた
 *     記録の無い曜日を抜いていたので、乗り場ごとに列の並びが変わり、見比べられなかった
 *   ・個別乗り場 実績を、金額（平均）の高い順にした（前はタブごとに固めていた）
 *   ・後半の表で、同じ乗り場は空行を挟まず続けて並べるようにした
 *     曜日が違うだけで離れた場所にとぶと、その乗り場がどうだったのか読み取れない
 *     並ぶ場所は、その乗り場のいちばん高い額（避けたい表はいちばん安い額）で決める
 *
 *  [L014ver]
 *  ▼ LINEの絵
 *   ・アツいエリアを、曜日区分ごとに1つだけにした（3つならべるのをやめた）
 *     「いちばん良かった」の決め方も直した。平均売上がいちばん高いエリアにし、
 *     3件に満たないエリアは1位にしない。
 *     前はロング率で並べていたので、2件しかないエリアがロング率50%で1位になり、
 *     1つに絞ると「平日はﾐﾅﾐ（2件）」というあてにならない案内になってしまった。
 *     3件に満たないものしか無いときは (参考) を付けて出す（消しはしない）
 *   ・「この絵の読み方」を3行にまとめた（6行で右がスカスカだった）
 *   ・金額帯の3行を1つの文にまとめた（見た目は同じ3行のまま、中身だけ軽くした）
 *   ・LINEに出す時間帯の数を、設定タブで決められるようにした（既定3つ）
 *     全部の時間帯は、まとめスプシのマス目（曜日×時間帯）で見られる
 *
 *   ※ここまでやっても、1通には収まりません。実データで測った結果、
 *     時間帯を1つまで絞っても16,600バイトあり、1通の上限9,500を超えます。
 *     エリアを1つにしたぶんは約6,200バイト減りましたが、2通のままです。
 *     1回の送信でまとめて届くので、時間をおいて何度も鳴る形にはなりません。
 *
 *  [L013ver]
 *  ▼ 毎月の自動送信（いちばん大事）
 *   ・これまで、自動で送るしくみは1つも入っていませんでした。
 *     16日の朝になっても何も起きない状態でした。作りました
 *   ・毎日きまった時刻に見にいき、その日が「送る日」ならグループLINEへ送る
 *     月の日数が違っても取りこぼさない形にしてある
 *   ・同じ期間は二度送らない。送る前に「送った」と記録するので、
 *     途中で時間切れになっても、二重には届かない
 *   ・設定タブで 送る日／時刻／するしない を変えられる（既定 16日・7時）
 *   ・メニュー「⏰ 自動送信の状態を見る」と、そうさボタン [8] で確かめられる
 *
 *  ▼ まとめスプシ
 *   ・作ったときに付いてくる「シート1」を消すようにした
 *     これが残っていると、タブが増えても新しいスプシに見えてしまう
 *   ・行き先のIDを、いちばん消えにくいところ（スクリプトの控え）へ先に書くようにした
 *   ・記録用スプシを触れる人に、まとめスプシの「見るだけ」を自動で付けるようにした
 *     メールアドレスをコードに書かずに済む（記録用スプシから写す）
 *   ・グラフの凡例に曜日を戻した（7/16 → 7/16(木)）
 *     日付の並びも、文字ではなく本当の日付で並べるようにした
 *     （文字のままだと「10/1」が「7/16」より前に来てしまう）
 *   ・グラフの目盛りを細かくした（横は30分ごと、縦は10本）。線はより薄いグレーに
 *   ・グラフの色を選び直した
 *     前は「濃い赤」と「もっと濃い赤」のように見分けのつかない組があった
 *     （人の目に近い色差で36）。色相を一周する14色にし、いちばん近い組でも131に
 *
 *  [L012ver]
 *  ▼ LINEの絵
 *   ・5通に分かれていたのを、できるかぎり1通にした
 *     中身（JSON）の無駄を削った：凡例・帯・時間詳細・アドバイスの組み立て方を軽くし、
 *     見た目は変えずに約3割ほど軽くした
 *   ・それでも1通10KBには入りきらないので、多いときだけ2通にする
 *     無理に1通へ押し込むと、レポートの中身が半分消えてしまうため
 *   ・削るときは、細かいところ（時間詳細・オプチャ）から均等に減らす
 *     前は1つの箱だけ空にしていたので、そこだけ情報が丸ごと消えていた
 *   ・打ち切るときに「省きました」の断り書きまで一緒に消えていたのを直した
 *
 *  ▼ 記録用スプシ
 *   ・メニュー名を「📊 レポート」→「📈 LineReport」にした
 *
 *  ▼ まとめスプシ
 *   ・1行目の固定を、はっきり外すようにした（clear() では外れないため）
 *   ・毎回あたらしいスプシが作られていたのを直した
 *     行き先のIDをセルだけで覚えていたので、消えると新規作成になっていた。
 *     スクリプト自身の控えにも残し、3か所から探すようにした
 *   ・グラフの下の空白をなくした
 *     グラフが乗る行の高さが、前回の実行のまま（大きいまま）残っていたのが原因
 *   ・グラフの凡例（7/16・7/17…の日付）が消えていたのを直した
 *     点線にするための書き換えで、指示されていない凡例まで消してしまっていた
 *   ・グラフの目盛りを細かくした
 *     目盛りの数の指定はスプシのグラフでは効かないので、軸の範囲を記録に合わせて狭めた
 *     目盛りの線は薄いグレー、そのあいだにもっと薄い線を入れた
 *   ・表のあいだの空白を 2 → 5 の高さにした
 *   ・横幅を 1列22px → 26px（26列＝676px）にした
 *
 *  [L011ver]
 *  ▼ 送れなかった原因（Too large flex message）
 *   ・LINEの Flex Message は 1つ10KB まで。中身を足していって、そこを超えていた
 *   ・中身を削るのではなく、ふきだしを分けて全部届けるようにした（最大5枚）
 *     1枚に収まるぶんだけ詰め、あふれたら次の枚へ。見出しに（1/3）と入れる
 *     スプシへ移動するボタンは、いちばん最後の1枚にだけ付ける
 *   ・大きさは「文字数」ではなく「バイト数」で見るようにした（lrBytes_）
 *     日本語は1文字3バイト、絵文字は4バイト。文字数で見ていると必ず足りなくなる
 *   ・5枚でも入りきらないときは、うしろから丸ごと捨てない
 *     うしろにあるのは月間戦略アドバイスなので、そこを真っ先に落とすのは本末転倒。
 *     いちばんかさばっている箱の中身を1行ずつ削り、見出しは全部残す
 *
 *  ▼ ほかに起こりうるものへの手当て
 *   ・LINEが断ってきたときの理由を、日本語で出すようにした（lrPushWhy_）
 *     401=トークン / 403=権限 / 404=送信先 / 429=送信数の上限 / 500=LINE側の不具合
 *     前は「muteHttpExceptions オプションを使用してください」という英語混じりの文で、
 *     何が悪いのか読み取れなかった
 *   ・裏メッセージ（altText）が400文字を超えたら切るようにした（超えると送信が失敗する）
 *   ・まとめスプシの行が足りなくなったら、自動で足すようにした（dbEnsureRows_）
 *     記録が増えれば書く行も増えるので、決め打ちの行数ではいつか必ず足りなくなる
 *   ・グラフのもとの数字の置き場所を 800行目 → 5000行目 にし、本文が近づいたら下へ逃がす
 *     グラフが増えると本文と重なって、表を上書きするおそれがあった
 *   ・記録が1件も無い期間を指定したときは、はっきりそう言って止まるようにした
 *   ・時間のかかるところで「まだ動いている」と伝えるようにした（見張りの誤判定よけ）
 *
 *  [L010ver]
 *   ・「dbRich_ is not defined」で送信できなかったのを直した
 *     アドバイスを太字で書く関数 dbRich_ の中身が抜け落ちていて、
 *     呼び出す行だけが残っていた。JavaScript は「無い関数を呼ぶ行」があっても
 *     その行を通るまでエラーにならないので、構文チェックも素通りしていた
 *   ・同じ見落としが二度と起きないよう、テストを足した（gas/test/defined.test.js）
 *     呼んでいるのに、どこにも定義が無い関数を見つける
 *
 *  [L009ver]
 *  ▼ LINEの絵
 *   ・ﾛﾝｸﾞ／ﾐﾄﾞﾙ／ｼｮｰﾄの行に、おすすめの乗り場と時刻を戻した。そのうえで1行に収めた
 *     例）ﾛﾝｸﾞ8件 ￥13,270 待39分 🔥新地4(月)23:51
 *     前の版で「1行に収める」を、乗り場と時刻を消すことだと取り違えていた
 *   ・読み方の説明を、1項目ずつ改行して並べた（1行に詰め込んでいて読めなかった）
 *   ・アドバイスの大事なところ（乗り場・金額・時刻・結論）だけ太字にした
 *
 *  ▼ まとめスプシ
 *   ・【時間詳細】を、横＝曜日区分／縦＝時間帯のマス目に戻した
 *     曜日をまたいで「この時間はどこが強いか」を横に見比べられる
 *   ・横幅を 1列24px → 22px（26列＝572px）。記録用スプシの合計幅527pxに近づけた
 *   ・グラフの線を、本当に点線にした
 *     スプレッドシートのグラフは setOption の lineDashStyle を無視する。
 *     色も●の大きさも効くのに点線だけ効かず、2回直しても実線のままだった。
 *     グラフを置いたあとに Sheets API から lineStyle を DOTTED に書き換える
 *     （appsscript.json に Sheets の高度なサービスを足してある）
 *   ・●を 12px → 6px に小さくした
 *   ・意味のない空行を作らないようにした（curRow += 2 などをやめた）
 *   ・まとまりの区切りの空行を 6px → 12px にした
 *   ・1行目の固定をやめた
 *   ・白地で沈む色をやめた
 *     グラフの線から黄色・黄緑・薄い水色を外し、濃い10色にそろえた
 *     🥈の薄い黄色 → 薄い緑。見出しの薄い黄色・薄いオレンジ → 薄い青灰
 *
 *  [L008ver]
 *  ▼ 抜けていたもの
 *   ・💡月間戦略アドバイス（①振り返り ②オススメの乗車時間と乗り場 ③翌月の戦略予想）を戻した
 *     v185からの作り直しのときに、まるごと落ちていた。LINEにもスプシにも出す
 *     ①は「3件以上あって平均がいちばん高い乗り場」＋待ち1時間あたりの効率
 *     ②は「同じ曜日・時間帯で2件以上あって平均単価が高い」組み合わせの上位3つ
 *     ③は翌月の季節の話＋平均￥10,000超えの時間帯の数から、粘るか回すかを出す
 *   ・スプシの「エリア別 実績＆パーセント」も戻した（LINEにはあるのに無かった）
 *   ・オプチャ情報を、はじめてレポートに入れた
 *     オプチャの記録はエリアタブ側にあり、個人タブしか読んでいなかったので
 *     ここまで1件も使われていなかった。自社の平均には混ぜず、別の枠で出す
 *   ・バラシを捨てずに一覧として残すようにした（平均には数えない）
 *
 *  ▼ LINEの絵
 *   ・ﾛﾝｸﾞ／ﾐﾄﾞﾙ／ｼｮｰﾄを1行に収めた
 *     「🔥アツい：」と毎回書くのをやめ、記号だけにした。意味は上の凡例で1回だけ説明する
 *
 *  ▼ まとめスプシ
 *   ・作る先を設定タブ「まとめスプシのID」で選べるようにした（URLを貼ってもよい）
 *   ・横幅を 1列16px → 24px に戻した（26列＝624px）。縦のスクロールが長すぎたため
 *   ・ヒートマップとグラフを見比べられるよう、グラフを 460px → 300px にした
 *   ・まとまりごとに細い空行を入れ、2段目には見出し（乗り場名）を付けた
 *     どの行の話なのか分からない、という状態をなくす
 *   ・グラフの線を 1px の点線にした（series だけでは効かないことがあるので全体にも指定）
 *
 *  [L007ver]
 *  ▼ LINEの絵（Flex Message）
 *   ・【曜日・時間】を【時間詳細】に作り直した
 *     前：🔥新地4 (16件/平￥5,273) [(月) 23:37, (月) 23:34, …30個]
 *     今：[23:51] 🔥新地4 （15件／平均￥6,758／最高￥18,960）
 *     時刻は「いちばん高かった乗車の時刻」を1つだけ。最高額も出す
 *     時刻を全部ならべると読めないうえ、Flexの上限50KBにも近づいて危なかった
 *   ・パーセントを帯の「中」に出すようにした（前は帯の上に左詰めで、色と数字が対応しなかった）
 *     細すぎて中に書けないぶんは、帯の下に小さく添える
 *   ・件数の内訳を読めるようにした（北7:41/北4:41 → 北7 41件 ・ 北4 41件）
 *   ・絵を組み立てるところを buildReportFlex_ に切り出し、テストで形を確かめるようにした
 *     送ってみるまで分からない、という状態をなくす
 *
 *  ▼ まとめスプシ（ダッシュボード）
 *   ・タブ名を「📈 8/16(日)～9/15(火)」にした（前は開始日だけだった）
 *   ・スマホで読める幅にした。1列 50px（26列＝1,300px）→ 16px（416px）
 *     文字は 8pt → 11〜14pt。横に広げず、縦に伸ばす
 *   ・「－」だけの行と列を作らないようにした
 *     アツい×避ける表は曜日区分ごとに縦に積み、記録がある時間帯だけ出す
 *     ヒートマップも、記録がある曜日だけ列にする
 *   ・グラフを直した。●を 4px → 12px、線を 1px → 2px の点線、日付の一覧は下へ
 *   ・🤖 傾向と対策：AIの呼び方を「乗り場ごとに1回」→「まとめて1回」にした
 *     20か所あれば20回呼んでいたので、無料枠の回数制限にすぐ当たって全行エラーになっていた
 *     それでも失敗したときは、数字から作った文を出す（エラー文を並べない）
 *   ・備考の表示崩れを直した。手で入れた改行をつなげ、横いっぱいの行に中央ぞろえで出す
 *
 *  [L006ver]
 *   ・そうさボタン [7]「レポートをLINEに送る」を足した（スマホから期間を決めて送れる）
 *     ・「説明」タブの ▼レポートの期間 ／ ▼レポートの送り先 を読む
 *     ・期間はプルダウンから選べる。無い期間は 260716-0815 のように打ち込む
 *     ・末尾に t を付けると自分だけ、h を付けるとグループ（例 260716-0815t）
 *     ・グループ（本番）は1回目では送らず、3分以内にもう一度チェックで確定
 *     ・本番で送ったあとは、送り先らんを自動で「自分だけ」に戻す
 *   ・メニューのレポート送信も、宛先の決め方を上とそろえた
 *     （テストの宛先を、設定タブ「テスト送信先（自分のLINE）」から読む）
 *   ・メニューに「🗺 乗り場にマップリンクを貼る／行き先を確認する」を足した
 *
 *  [L005ver]
 *   ・ファイル名を 003-LineReport.gs にした（中身の動きは変えていない）
 *
 *  [L004ver]
 *   ・裏メッセージの文面を「設定」タブから変えられるようにした
 *     {期間} が 8/16(日)～9/15(月) に置き換わる
 *     Code.gs の設定が読めないときは、今までの文面のまま
 *
 *  [L003ver]
 *   ・バージョン確認の表示を K → C に変更（Code.gs に合わせた）
 *
 *  [L002ver]
 *   ・setupReportMenu のポップアップを削除（毎回出て邪魔だったため）
 *   ・起動時トリガーが setupReportMenu に向いていた場合も自動で直すようにした
 *     （そのままだと毎回作り直しが走り、メニューが二重に出ることがある）
 *
 *  [L001ver] v185 のレポート部分を取り出して作り直したもの
 *   ・鍵をコードから追い出した（LINEトークン・Geminiキーは設定に保存）
 *   ・友だち全員への配信を止めた（送信先未設定ならエラーで停止）
 *   ・プルダウンに曜日を入れ、記録がある月までしか作らないようにした
 *   ・裏メッセージを「📈8/16(日)～9/2(水)レポート作成 byシバンニ」に
 *   ・廃止済みの gemini-1.5-flash を差し替え（AI分析が全行エラーだった原因）
 *   ・AIのエラー文を、原因が分かる形にした（404=モデル / 403=鍵 / 429=制限）
 *   ・グラフをA〜Z列の幅に合わせ、下に25行ぶん空けて重なりを解消
 *   ・コード.gs を触らずメニューを出せるようにした（setupReportMenu）
 * ================================================================
 */

/** このファイルのバージョン */
const LR_VERSION = "L021ver";


/* ============ 鍵（コードに書かない） ============ */

/**
 * LINEチャネルアクセストークン。
 * v232 のメニュー「🔑 LINEトークンを設定」で保存したものを使う。
 */
function getLineToken_() {
  const t = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
  if (!t) throw new Error("LINEトークンが未設定です。メニュー「🔑 LINEトークンを設定」から登録してください。");
  return t;
}

/**
 * Gemini APIキー。
 * メニュー「🤖 Geminiキーを設定」から保存する。
 */
function getGeminiKey_() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "";
}

/**
 * 使うGeminiのモデル名。
 * Googleは古いモデルを次々に止めるので、コードを触らず差し替えられるようにしておく。
 * スクリプトプロパティ GEMINI_MODEL に入れると、そちらが優先される。
 *
 * ※v185 が使っていた gemini-1.5-flash は既に廃止済みで、呼ぶと 404 が返る。
 *   ダッシュボードの「傾向と対策」が全行エラーになっていた原因はこれ。
 */
function getGeminiModel_() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL")
      || "gemini-3.1-flash-lite";
}

/** メニューから実行してモデル名を変える */
function menuSetGeminiModel() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt("Geminiのモデル名",
    "今: " + getGeminiModel_() + "\n\n例: gemini-3.1-flash-lite / gemini-3.5-flash",
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const v = res.getResponseText().trim();
  if (!v) return;
  PropertiesService.getScriptProperties().setProperty("GEMINI_MODEL", v);
  ui.alert("保存しました: " + v);
}

/** メニューから実行してGeminiのキーを保存する */
function menuSetGeminiKey() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt("Gemini APIキー", "APIキーを貼り付けてください。", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const k = res.getResponseText().trim();
  if (!k) return;
  PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", k);
  ui.alert("保存しました。");
}

/* ============ レポート専用の定数・道具 ============ */

/**
 * グラフの線・点の色。
 *
 * 条件は2つ。
 *   ・白い背景でも読めること（明るすぎる色を使わない）
 *   ・となり合う色が似ていないこと
 * 前は「濃い赤」と「もっと濃い赤」、「青」と「濃い青」のように
 * 見分けのつかない組が入っていた（人の目に近い色差でわずか36）。
 * 色相をぐるりと一周する形に選び直して、いちばん近い組でも131まで離した。
 * 並びも、となり同士がいちばん遠くなるようにしてある。
 */
const GRAPH_COLORS = ["#d32f2f", "#13a4ec", "#0da50d", "#270da5", "#ec13ec",
                      "#246b6b", "#8013ec", "#6b2453", "#a5730d", "#b82ea1",
                      "#1337ec", "#2eb85c", "#536b24", "#2e73b8"];

const TAB_COLORS = { "北7": "#e3f2fd", "北4": "#e8eaf6", "北他": "#e0f7fa",
                     "ﾐﾅﾐ": "#fce4ec", "関空": "#fff3e0", "ほか": "#f5f5f5" };

/** 祝日判定。HOLIDAYS は v232 側の定義を使う */
function isHolidayFunc(dateObj) {
  return HOLIDAYS.includes((dateObj.getMonth() + 1) + "/" + dateObj.getDate());
}

function normalizeStr(str) {
  if (!str) return "";
  let s = str.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
  }).trim();
  s = s.replace(/大丸乗り場|大丸乗場/g, "大丸");
  s = s.replace(/アポロワンビル/g, "アポロビル");
  return s;
}

function removeStreetSuffix(str) { return str ? str.replace(/(筋|通り|町|橋)$/, "") : ""; }

function toHalfWidthKana(str) {
  if (!str) return "";
  const kanaMap = { "ガ": "ｶﾞ", "ギ": "ｷﾞ", "グ": "ｸﾞ", "ゲ": "ｹﾞ", "ゴ": "ｺﾞ", "ザ": "ｻﾞ", "ジ": "ｼﾞ", "ズ": "ｽﾞ", "ゼ": "ｾﾞ", "ゾ": "ｿﾞ", "ダ": "ﾀﾞ", "ヂ": "ﾁﾞ", "ヅ": "ﾂﾞ", "デ": "ﾃﾞ", "ド": "ﾄﾞ", "バ": "ﾊﾞ", "ビ": "ﾋﾞ", "ブ": "ﾌﾞ", "ベ": "ﾍﾞ", "ボ": "ﾎﾞ", "パ": "ﾊﾟ", "ピ": "ﾋﾟ", "プ": "ﾌﾟ", "ペ": "ﾍﾟ", "ポ": "ﾎﾟ", "ヴ": "ｳﾞ", "ア": "ｱ", "イ": "ｲ", "ウ": "ｳ", "エ": "ｴ", "オ": "ｵ", "カ": "ｶ", "キ": "ｷ", "ク": "ｸ", "ケ": "ｹ", "コ": "ｺ", "サ": "ｻ", "シ": "ｼ", "ス": "ｽ", "セ": "ｾ", "ソ": "ｿ", "タ": "ﾀ", "チ": "ﾁ", "ツ": "ﾂ", "テ": "ﾃ", "ト": "ﾄ", "ナ": "ﾅ", "ニ": "ﾆ", "ヌ": "ﾇ", "ネ": "ﾈ", "ノ": "ﾉ", "ハ": "ﾊ", "ヒ": "ﾋ", "フ": "ﾌ", "ヘ": "ﾍ", "ホ": "ﾎ", "マ": "ﾏ", "ミ": "ﾐ", "ム": "ﾑ", "メ": "ﾒ", "モ": "ﾓ", "ヤ": "ﾔ", "ユ": "ﾕ", "ヨ": "ﾖ", "ラ": "ﾗ", "リ": "ﾘ", "ル": "ﾙ", "レ": "ﾚ", "ロ": "ﾛ", "ワ": "ﾜ", "ヲ": "ｦ", "ン": "ﾝ", "ー": "ｰ" };
  let reg = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');
  return str.replace(reg, function (match) { return kanaMap[match]; });
}

function getGridRange(sheet, startRow, startColIndex, rowCount, colSpanArray) {
  // 行が足りないまま getRange すると、そこで止まる。足りなければ先に足しておく
  if (typeof dbEnsureRows_ === "function") dbEnsureRows_(sheet, startRow + (rowCount || 1) - 1);
  let ranges = []; let currentC = startColIndex;
  for (let i = 0; i < colSpanArray.length; i++) {
    let rng = sheet.getRange(startRow, currentC, rowCount, colSpanArray[i]);
    ranges.push(rng); currentC += colSpanArray[i];
  }
  return ranges;
}

/* ============ メニュー ============ */

/**
 * 「📊 レポート」メニューを足す。
 *
 * onOpen は1つのプロジェクトに1つしか置けない。統合スクリプト側に既に
 * onOpen があるので、そちらは触らず、この関数を「起動時トリガー」から
 * 呼んでもらう形にしている。
 *   エディタ左の ⏰（トリガー）→「トリガーを追加」
 *   → 実行する関数: onOpenReport
 *   → イベントのソース: スプレッドシートから
 *   → イベントの種類: 起動時
 *
 * 同じプロジェクトに 002-Extras があれば、それも一緒に出す。
 */
function onOpenReport() {
  const m = SpreadsheetApp.getUi().createMenu("📈 LineReport");
  m.addItem("📤 レポートを手動送信", "showReportDialog");
  if (typeof menuStrategy === "function") m.addItem("🎯 立ち回り分析", "menuStrategy");
  if (typeof menuOpucha === "function")   m.addItem("🏷 オプチャ印を付ける／外す", "menuOpucha");
  if (typeof menuChartFit === "function") m.addItem("📐 グラフの大きさを揃える", "menuChartFit");
  if (typeof menuMapLinksApply === "function") {
    m.addItem("🗺 乗り場にマップリンクを貼る", "menuMapLinksApply");
    m.addItem("🗺 マップの行き先を確認する", "menuMapLinksCheck");
  }
  m.addSeparator();
  if (typeof menuEventProbe === "function") {
    m.addItem("🔎 イベント情報を調べる", "menuEventProbe");
    m.addItem("🧪 イベント情報をテスト送信（自分だけ）", "menuEventTestSend");
    m.addItem("🎪 イベントの絵の見本を送る（自分だけ）", "menuEventSample");
    m.addItem("🎪 イベントの自動発信を入切する", "menuEventAuto");
  }
  m.addItem("⏰ 自動送信の状態を見る", "menuAutoReportStatus");
  m.addItem("🧪 自動送信を今すぐ試す（自分だけ）", "menuAutoReportTestNow");
  m.addSeparator();
  m.addItem("👥 グループIDを設定", "menuSetGroupId");
  m.addItem("🤖 Geminiキーを設定", "menuSetGeminiKey");
  m.addItem("🤖 Geminiのモデルを変える", "menuSetGeminiModel");
  m.addSeparator();
  m.addItem("ℹ️ バージョンを確認", "menuShowVersions");
  m.addToUi();

  // 自動送信のしかけが入っているか、開いたときに確かめる。
  // 入っていなければ、ここで入れる（1回だけ。毎回は作り直さない）
  try { ensureAutoReportTrigger_(false); } catch (e) { console.log("自動送信の用意: " + e.message); }
}

/**
 * いま動いているバージョンを表示する。
 * 手元のファイルと実際に動いているものがずれていないか、これで確かめられる。
 */
function menuShowVersions() {
  const rows = [];
  rows.push("001-Code       : " +
    (typeof CODE_VERSION === "string" ? CODE_VERSION : "入っていません"));
  rows.push("002-Extras     : " +
    (typeof EX_VERSION === "string" ? EX_VERSION : "入っていません"));
  rows.push("003-LineReport : " + LR_VERSION);
  rows.push("006-Events     : " +
    (typeof EV_VERSION === "string" ? EV_VERSION : "入っていません"));

  const msg = "いま動いているバージョン\n──────────────\n" + rows.join("\n");
  SpreadsheetApp.getUi().alert(msg);
}

/**
 * ★これを1回だけ実行すれば、メニューが出るようになります。
 *   エディタ上部の関数選択で setupReportMenu を選び、▶実行 を押すだけ。
 *   ⏰（トリガー）の画面を触る必要はありません。
 *
 * 二重に作らないよう、既にあるものは消してから作り直します。
 */
function setupReportMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 起動時トリガーを作り直す。
  // setupReportMenu 自身に向いたトリガーがあると毎回作り直しが走るので、それも消す
  // （メニューが二重に出る原因にもなる）。
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const f = t.getHandlerFunction();
    if (f === "onOpenReport" || f === "setupReportMenu") {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  ScriptApp.newTrigger("onOpenReport").forSpreadsheet(ss).onOpen().create();
  // レポートの自動送信（毎月◯日の朝）も、ここで入れておく
  try { ensureAutoReportTrigger_(true); } catch (e) { console.log("自動送信の用意: " + e.message); }

  // ポップアップは出さない。メニューが出ること自体が結果なので、確認は要らない。
  // （起動時トリガーが誤ってこの関数に向いていても、毎回ポップアップが出ないようにする）
  try { onOpenReport(); } catch (e) { console.log("メニュー作成: " + e.message); }
  console.log("setupReportMenu: 古いトリガー" + removed + "個を消し、onOpenReport を1つ設定しました");
}

/* ============ 期間（16日〜翌月15日） ============ */

const LR_DOW = ["日", "月", "火", "水", "木", "金", "土"];

/** その日が属する営業期間の開始日。16日起点 */
function lrPeriodStart_(d) {
  return (d.getDate() >= 16)
    ? new Date(d.getFullYear(), d.getMonth(), 16)
    : new Date(d.getFullYear(), d.getMonth() - 1, 16);
}

function lrFull_(d)  { return d.getFullYear() + "/" + pad2_(d.getMonth() + 1) + "/" + pad2_(d.getDate()) + "(" + LR_DOW[d.getDay()] + ")"; }
function lrShort_(d) { return pad2_(d.getMonth() + 1) + "/" + pad2_(d.getDate()) + "(" + LR_DOW[d.getDay()] + ")"; }
function lrAlt_(d)   { return (d.getMonth() + 1) + "/" + d.getDate() + "(" + LR_DOW[d.getDay()] + ")"; }
function lrVal_(d)   { return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate(); }

/**
 * プルダウンに出す期間を、新しい → 古い の順で作る。
 * 先頭は今期（16日〜今日）。それ以降は 16日〜翌月15日。
 * 記録が残っている月までしか作らない。
 */
function lrPeriodsFrom_(minDate, today) {
  const out = [];
  const cur = lrPeriodStart_(today);
  out.push({
    value: lrVal_(cur) + "-" + lrVal_(today),
    label: lrFull_(cur) + " ～ " + lrShort_(today) + "（今期）"
  });
  if (!minDate) return out;

  const limit = lrPeriodStart_(minDate);
  let s = cur, guard = 0;
  while (s.getTime() > limit.getTime() && guard++ < 240) {
    const ps = new Date(s.getFullYear(), s.getMonth() - 1, 16);
    const pe = new Date(s.getFullYear(), s.getMonth(), 15);
    out.push({ value: lrVal_(ps) + "-" + lrVal_(pe),
               label: lrFull_(ps) + " ～ " + lrShort_(pe) });
    s = ps;
  }
  return out;
}

/** 画面から呼ばれる。記録の一番古い営業日を調べて期間一覧を返す */
function getReportPeriods() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let minD = null;
  ALL_TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const last = sh.getLastRow();
    if (last < START_ROW) return;
    // B列(営業日)とF列(金額)を見る。金額が無い行は年見出しなので数えない
    sh.getRange(START_ROW, C_DATE, last - START_ROW + 1, C_MONEY - C_DATE + 1)
      .getValues().forEach(function (r) {
        const d = r[0];
        if (!(d instanceof Date)) return;
        if (d.getFullYear() < 2020 || d.getFullYear() > 2035) return;
        if (String(r[C_MONEY - C_DATE]).replace(/[^0-9]/g, "") === "") return;
        if (!minD || d < minD) minD = d;
      });
  });
  return JSON.stringify(lrPeriodsFrom_(minD, new Date()));
}

/** 送信先のグループIDを設定する（説明タブ Z1） */
function menuSetGroupId() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
  if (!sh) { ui.alert("説明タブが見つかりません。"); return; }
  const cur = String(sh.getRange("Z1").getValue() || "");
  const res = ui.prompt("グループLINEのID",
    "レポートを送るグループのID（C から始まる文字列）を貼り付けてください。\n現在: " + (cur || "未設定"),
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const v = res.getResponseText().trim();
  if (!v) return;
  sh.getRange("Z1").setValue(v);
  ui.alert("保存しました。（説明タブ Z1）");
}

/* ============ 📤 レポート送信UI ============ */

function showReportDialog() {
  const htmlContent = `<!DOCTYPE html><html><head><base target="_top"><style>
    body { font-family: sans-serif; padding: 15px; color: #333; margin: 0; }
    h3 { font-size: 16px; margin: 0 0 5px 0; color: #333; display: flex; align-items: center; }
    .line { border-bottom: 2px solid #1155ca; margin-bottom: 15px; }
    .radio-group { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; font-size: 14px; }
    .radio-group label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
    select, input[type="date"] { width: 100%; font-size: 14px; padding: 10px; margin-bottom: 15px; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc; }
    .date-inputs { display: none; align-items: center; gap: 10px; margin-bottom: 15px; }
    .date-inputs input { width: 45%; margin-bottom: 0; }
    .test-box { background-color: #f9fbe7; border: 1px solid #c0ca33; padding: 12px; border-radius: 5px; margin-bottom: 15px; }
    .test-box label { color: #d93025; font-weight: bold; font-size: 13px; display: flex; align-items: center; gap: 5px; cursor: pointer; }
    button { background-color: #1155ca; color: white; border: none; font-weight: bold; cursor: pointer; padding: 12px; border-radius: 5px; width: 100%; font-size: 14px; }
    .progress-container { width: 100%; background: #e0e0e0; border-radius: 5px; margin-top: 10px; display: none; height: 18px; overflow: hidden; }
    .progress-bar { width: 0%; height: 100%; background: #34a853; transition: width 0.3s; }
    .status-text { font-size: 13px; margin-top: 5px; text-align: center; display: none; font-weight: bold; }
  </style></head><body>
    <h3>📊 レポート期間指定 & 送信</h3>\n    <div style="font-size:11px;color:#999;margin:-4px 0 6px">${LR_VERSION}</div>
    <div class="line"></div>
    <div class="radio-group">
      <label><input type="radio" name="mode" value="select" checked onchange="toggle()"> 📅 期間選択</label>
      <label><input type="radio" name="mode" value="custom" onchange="toggle()"> ✍️ 日付指定</label>
    </div>
    <div id="selectArea"><select id="periodSelect"></select></div>
    <div id="customArea" class="date-inputs">
      <input type="date" id="startDate"><span>～</span><input type="date" id="endDate">
    </div>
    <div class="test-box">
      <label><input type="checkbox" id="testMode" checked> 🛠️ マーク個人のLINEのみに送信 (テスト用)</label>
    </div>
    <button id="sendBtn" onclick="send()">LINEへ送信する</button>
    <div class="progress-container" id="pCont"><div class="progress-bar" id="pBar"></div></div>
    <div class="status-text" id="pText">処理中...</div>
    <script>
      function toggle() {
        var mode = document.querySelector('input[name="mode"]:checked').value;
        document.getElementById('selectArea').style.display = mode === 'select' ? 'block' : 'none';
        document.getElementById('customArea').style.display = mode === 'custom' ? 'flex' : 'none';
      }
      window.onload = function() {
        var s = document.getElementById('periodSelect');
        s.add(new Option('読み込み中…', ''));
        google.script.run.withSuccessHandler(function(js){
          var list = JSON.parse(js); s.innerHTML = '';
          if (!list.length) { s.add(new Option('記録がありません', '')); return; }
          list.forEach(function(p){ s.add(new Option(p.label, p.value)); });
        }).withFailureHandler(function(e){
          s.innerHTML = ''; s.add(new Option('期間を読めません: ' + e.message, ''));
        }).getReportPeriods();
      };
      function send() {
        var mode = document.querySelector('input[name="mode"]:checked').value;
        var val = mode === "select" ? document.getElementById('periodSelect').value : (document.getElementById('startDate').value.replace(/-/g, '/') + "-" + document.getElementById('endDate').value.replace(/-/g, '/'));
        var isTest = document.getElementById('testMode').checked;

        document.getElementById('sendBtn').style.display = 'none';
        document.getElementById('pCont').style.display = 'block';
        document.getElementById('pText').style.display = 'block';

        let progress = 0; let pBar = document.getElementById('pBar'); let pText = document.getElementById('pText');

        let interval = setInterval(() => {
          progress += 1.5;
          if (progress > 95) progress = 95;
          pBar.style.width = progress + '%';
          pText.innerText = "処理中... (推定残り" + Math.max(1, Math.round(60 - (progress / 1.5))) + "秒)";
        }, 1000);

        google.script.run
          .withSuccessHandler(function(res){
            clearInterval(interval);
            if(res && res.status === "error") {
                pBar.style.backgroundColor = '#d93025'; pBar.style.width = '100%'; pText.style.color = '#d93025';
                pText.innerText = "❌ エラー: " + res.message;
            } else {
                pBar.style.width = '100%'; pText.innerText = "✅ 送信完了！"; pText.style.color = "#2e7d32";
                setTimeout(() => google.script.host.close(), 1500);
            }
          })
          .withFailureHandler(function(error){
            clearInterval(interval); pBar.style.backgroundColor = '#d93025'; pBar.style.width = '100%'; pText.style.color = '#d93025';
            pText.innerText = "❌ スクリプトエラー: " + error.message;
          })
          .executeManualReportFromUI(val, isTest);
      }
    </script></body></html>`;
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(htmlContent).setWidth(380).setHeight(360), '📤 レポート送信');
}

function executeManualReportFromUI(val, isTest) {
  try {
    const parts = val.split('-'); const sParts = parts[0].split('/'); const eParts = parts[1].split('/');
    let startD = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10), 0, 0, 0);
    let endD = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10), 23, 59, 59);
    let targetId = isTest ? rpTestTarget_() : rpGroupTarget_();
    if (!targetId) return { status: "error", message: isTest
      ? "自分の送り先が未設定です（設定タブ「テスト送信先（自分のLINE）」）"
      : "グループの送り先が未設定です（メニュー「👥 グループIDを設定」）" };
    sendCustomReport(targetId, startD, endD);
    return { status: "success" };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}

/* ============ 📱 そうさボタンから、期間を決めてレポートを送る ============ */
/*
 * スマホのスプレッドシートアプリからは、メニューもダイアログも出せない。
 * そこで「説明」タブに置いた
 *
 *   ▼ レポートの期間   [ 今期（8/16〜9/6） ]  ← プルダウン。打ち込みもできる
 *   ▼ レポートの送り先 [ 🧪 自分だけ（テスト） ]
 *   ☑ [7] レポートをLINEに送る
 *
 * の3行で送る。プルダウンで選ぶのが基本で、そこに無い期間は
 *   260716-0815   （2026/7/16〜8/15）
 *   260716-0815t  （末尾 t ＝ 自分だけ／h ＝ グループ）
 * のように打ち込めば、そのとおりに送る。
 *
 * ★グループに送るのは取り消せないので、本番のときは
 *   1回目のチェックでは送らず、確認だけを出す。
 *   3分以内にもう一度チェックすると、そこではじめて送る。
 */

/** 「まず自分だけ」のときの宛先 */
function rpTestTarget_() {
  try {
    const v = String(cfg_("テスト送信先（自分のLINE）") || "").trim();
    if (v) return v;
  } catch (e) {}
  try {
    for (const id in SENDER_MAP) { if (SENDER_MAP[id] === "ﾏｰｸ") return id; }
  } catch (e) {}
  return "";
}

/** グループLINEの宛先（説明タブ Z1） */
function rpGroupTarget_() {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    const v = sh ? String(sh.getRange("Z1").getValue() || "").trim() : "";
    if (v) return v;
  } catch (e) {}
  // 説明タブが空でも、LINEから届いたときに覚えたものがあれば、それを使う
  try { return String(PropertiesService.getScriptProperties().getProperty("GROUP_ID") || "").trim(); }
  catch (e) { return ""; }
}

/* ---- 期間の読み取り ---- */

/** 全角の数字・記号を半角にそろえる */
function rpHalf_(s) {
  return String(s == null ? "" : s)
    .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/[／]/g, "/").replace(/[．]/g, ".")
    .replace(/[－ー―‐]/g, "-").replace(/[　]/g, " ")
    .trim();
}

/**
 * 「260716」「0716」「2026/7/16」などを日付にする。読めなければ null。
 * 数字だけのときの決まりは、日付メモと同じ。
 *   4桁 = 月日（年は今年）／6桁 = 年月日（西暦の下2桁）／8桁 = 年月日
 * 区切りがあるときは桁数は自由。
 */
function rpDate_(str, defYear, endOfDay) {
  const t = rpHalf_(str).replace(/[年月]/g, "/").replace(/日$/, "");
  let y = defYear, mo = null, d = null;

  const sep = t.split(/[\/\.\-]/).filter(function (x) { return x !== ""; });
  if (sep.length >= 2 && /[\/\.\-]/.test(t)) {
    const n = sep.map(function (x) { return parseInt(x, 10); });
    if (n.some(isNaN)) return null;
    if (n.length === 2) { mo = n[0]; d = n[1]; }
    else { y = n[0] < 100 ? 2000 + n[0] : n[0]; mo = n[1]; d = n[2]; }
  } else {
    const g = t.replace(/[^0-9]/g, "");
    if (g.length === 4)      { mo = +g.slice(0, 2); d = +g.slice(2); }
    else if (g.length === 6) { y = 2000 + (+g.slice(0, 2)); mo = +g.slice(2, 4); d = +g.slice(4); }
    else if (g.length === 8) { y = +g.slice(0, 4); mo = +g.slice(4, 6); d = +g.slice(6); }
    else return null;
  }
  if (!(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31)) return null;
  if (!(y >= 2020 && y <= 2035)) return null;

  const out = endOfDay ? new Date(y, mo - 1, d, 23, 59, 59) : new Date(y, mo - 1, d, 0, 0, 0);
  // 2月31日のような、ありえない日をはじく
  if (out.getMonth() !== mo - 1 || out.getDate() !== d) return null;
  return out;
}

/**
 * 期間らんの文字を読む。
 * 戻り値 { from, to, label, dest } … dest は "test" / "group" / null（指定なし）
 * 読めなければ { err: "…" }
 */
function rpParseRange_(raw, today) {
  const now = today || new Date();
  let t = rpHalf_(raw);
  if (!t) return { err: "期間が空です" };

  // 末尾の t（自分だけ）／h（グループ）
  let dest = null;
  const md = t.match(/[\s]*(テスト|本番|[thTH])$/);
  if (md) {
    const k = md[1].toLowerCase();
    dest = (k === "t" || k === "テスト") ? "test" : "group";
    t = t.slice(0, t.length - md[0].length).trim();
  }
  // 「今期（8/16〜9/6）」のような、かっこ書きの飾りは読み飛ばす
  const key = t.replace(/[（(].*$/, "").replace(/[\s]/g, "");

  const ps = (typeof lrPeriodStart_ === "function")
    ? lrPeriodStart_(now)
    : new Date(now.getFullYear(), now.getMonth() - (now.getDate() >= 16 ? 0 : 1), 16);

  const mk = function (from, to, label) {
    return { from: from, to: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59),
             label: label, dest: dest };
  };
  if (/^(今期|今回|今)$/.test(key))   return mk(ps, now, "今期");
  if (/^(前期|先期|前回)$/.test(key)) {
    const a = new Date(ps.getFullYear(), ps.getMonth() - 1, 16);
    return mk(a, new Date(ps.getFullYear(), ps.getMonth(), 15), "前期");
  }
  if (/^(今日|本日|きょう)$/.test(key)) return mk(new Date(now.getFullYear(), now.getMonth(), now.getDate()), now, "今日");
  if (/^(昨日|きのう)$/.test(key)) {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return mk(y, y, "昨日");
  }
  if (/^(今月)$/.test(key)) return mk(new Date(now.getFullYear(), now.getMonth(), 1), now, "今月");
  if (/^(先月|前月)$/.test(key)) {
    const a = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return mk(a, new Date(now.getFullYear(), now.getMonth(), 0), "先月");
  }
  if (/^(全部|ぜんぶ|すべて|全期間)$/.test(key)) {
    return mk(new Date(2020, 0, 1), now, "全部");
  }

  // ここからは日付を打ち込んだとき
  let parts = t.split(/[〜～~–—]|to/);
  if (parts.length !== 2) {
    const bits = t.split("-").filter(function (x) { return x !== ""; });
    if (bits.length === 2)      parts = bits;
    else if (bits.length === 6) parts = [bits.slice(0, 3).join("/"), bits.slice(3).join("/")];
    else if (bits.length === 4 && /^\d{1,2}$/.test(bits[1]))
      parts = [bits.slice(0, 2).join("/"), bits.slice(2).join("/")];
    else parts = [t];
  }

  const from = rpDate_(parts[0], now.getFullYear(), false);
  if (!from) return { err: rpHowTo_(raw) };
  if (parts.length === 1) {
    return { from: from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate(), 23, 59, 59),
             label: "1日ぶん", dest: dest };
  }
  // 終わりの日に年が書いていなければ、始まりの年に合わせる
  let to = rpDate_(parts[1], from.getFullYear(), true);
  if (!to) return { err: rpHowTo_(raw) };
  // 年をまたぐ書き方（1216-0115）は、終わりを翌年とみなす。
  // ただし翌年にして3か月より長くなるものは、打ち間違いとみなして直してもらう
  // （0815-0716 は「11か月ぶん」ではなく、前後を逆に打ったと考えるほうが自然）
  if (to.getTime() < from.getTime() && String(parts[1]).replace(/[^0-9]/g, "").length <= 4) {
    const next = new Date(to.getFullYear() + 1, to.getMonth(), to.getDate(), 23, 59, 59);
    if (next.getTime() - from.getTime() <= 92 * 24 * 60 * 60 * 1000) to = next;
  }
  if (to.getTime() < from.getTime()) return { err: "終わりの日が、始まりの日より前になっています：" + raw };
  return { from: from, to: to, label: null, dest: dest };
}

/** 読めなかったときの、書き方の案内 */
function rpHowTo_(raw) {
  return "期間が読めませんでした：「" + String(raw).slice(0, 30) + "」\n" +
    "プルダウンから選ぶか、次のように打ってください。\n" +
    "　260716-0815　… 2026/7/16 〜 8/15（月日は4桁）\n" +
    "　260716-260815　… 年をまたぐときは、終わりにも年を付ける\n" +
    "　2026/7/16-2026/8/15　… 区切りを入れる書き方でもOK\n" +
    "　今期／前期／今日／昨日／今月／先月　… 言葉でもOK\n" +
    "末尾に t を付けると自分だけ、h を付けるとグループに送ります（例 260716-0815t）";
}

/** 送り先らんの文字を "test" / "group" にする */
function rpParseDest_(raw) {
  const t = rpHalf_(raw).replace(/[\s]/g, "");
  if (!t) return null;
  if (/(グループ|本番|みんな|全員|h$)/i.test(t)) return "group";
  if (/(自分|テスト|ひとり|t$)/i.test(t)) return "test";
  return null;
}

function rpFmt_(d) {
  return d.getFullYear() + "/" + pad2_(d.getMonth() + 1) + "/" + pad2_(d.getDate()) +
    "(" + LR_DOW[d.getDay()] + ")";
}

/**
 * そうさボタン [7] の中身。
 * 「説明」タブの入力らんを読んで、その期間のレポートを送る。
 * 何が起きたかを文字で返す（そうさボタンの結果らんに出る）。
 */
function menuSendReportPanel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("説明");

  // 入力らんを読む。005-Updater.gs が入っていないときは、既定（今期・自分だけ）
  let pTxt = "今期", dTxt = "";
  if (sh && typeof panelInputGet_ === "function") {
    pTxt = panelInputGet_(sh, PANEL_IN_PERIOD) || "今期";
    dTxt = panelInputGet_(sh, PANEL_IN_DEST) || "";
  }

  const r = rpParseRange_(pTxt, new Date());
  if (r.err) return "⚠️ " + r.err;

  // 送り先は、期間らんの末尾（t/h）＞ 送り先らん ＞ 自分だけ、の順で決める
  const dest = r.dest || rpParseDest_(dTxt) || "test";
  const span = rpFmt_(r.from) + " 〜 " + rpFmt_(r.to);

  const to = (dest === "group") ? rpGroupTarget_() : rpTestTarget_();
  if (!to) {
    return dest === "group"
      ? "❌ グループの送り先が分かりません（メニュー「👥 グループIDを設定」で入れてください）"
      : "❌ 自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」に入れてください）";
  }

  // グループに送るのは取り消せない。1回目は送らず、もう一度チェックしてもらう
  if (dest === "group") {
    const pr = PropertiesService.getScriptProperties();
    const armed = pr.getProperty("RP_ARMED");
    const okNow = armed && armed.split("|")[0] === span &&
      (new Date().getTime() - parseInt(armed.split("|")[1], 10)) < 3 * 60 * 1000;
    if (!okNow) {
      pr.setProperty("RP_ARMED", span + "|" + new Date().getTime());
      return "👥 本番（グループ全員）で送ろうとしています\n" +
        "　期間：" + span + "\n" +
        "　まだ送っていません。よければ3分以内に、もう一度チェックしてください。\n" +
        "　何もしなければ送りません。自分だけに送るなら、送り先らんを" +
        "「🧪 自分だけ（テスト）」に戻してください。";
    }
    pr.deleteProperty("RP_ARMED");
  }

  if (typeof updProgress_ === "function") updProgress_("集計しています（" + span + "）");
  sendCustomReport(to, r.from, r.to);
  if (typeof updBeat_ === "function") updBeat_("送信しました");

  // 本番で送ったあとは、送り先らんを「自分だけ」に戻す。
  // 戻しておかないと、次にうっかりチェックしたときも本番になってしまう
  if (dest === "group" && sh && typeof panelInputSet_ === "function") {
    try { panelInputSet_(sh, PANEL_IN_DEST, PANEL_DEST_TEST); } catch (e) {}
  }

  return (dest === "group" ? "👥 グループ全員に送りました" : "🧪 自分だけに送りました（テスト）") +
    "\n　期間：" + span + (r.label ? "（" + r.label + "）" : "");
}

/* ============ ⏰ 毎月の自動送信 ============ */
/*
 * ★これまで、自動で送るしくみは1つも入っていませんでした。
 *   16日の朝になっても、何も起きない状態でした。
 *
 * 作り方：
 *   毎日きまった時刻に monthlyReportJob() を動かし、
 *   その日が「送る日」なら、前の期間ぶんをグループLINEへ送る。
 *   月末の日数が月によって違うので、「毎月◯日」ではなく
 *   「毎日見にいって、その日かどうかを見る」ほうが取りこぼさない。
 *
 * 二重送信よけ：
 *   送った期間を覚えておき、同じ期間は二度送らない。
 *   トリガーが二重に登録されても、送られるのは1回だけ。
 */

/** 何日に送るか（設定タブで変えられる。既定は16日） */
function autoReportDay_() {
  let v = 16;
  try { if (typeof cfg_ === "function") v = parseInt(cfg_("自動送信する日（毎月）"), 10); } catch (e) {}
  return (v >= 1 && v <= 28) ? v : 16;
}

/** 何時に送るか（設定タブで変えられる。既定は7時） */
function autoReportHour_() {
  let v = 7;
  try { if (typeof cfg_ === "function") v = parseInt(cfg_("自動送信の時刻（時）"), 10); } catch (e) {}
  return (v >= 0 && v <= 23) ? v : 7;
}

/** 自動送信を使うか（設定タブで「いいえ」にすると止まる） */
function autoReportOn_() {
  try {
    if (typeof cfg_ !== "function") return true;
    return String(cfg_("レポートを自動で送る") || "はい").indexOf("いいえ") !== 0;
  } catch (e) { return true; }
}

/**
 * 毎日よばれる。送る日でなければ、何もしないで終わる。
 * トリガーから動くので、画面には何も出せない。結果は説明タブとログに残す。
 */
function monthlyReportJob() {
  try {
    if (!autoReportOn_()) return;
    const now = new Date();
    if (now.getDate() !== autoReportDay_()) return;

    // 16日に送るのは「前月16日 〜 当月15日」
    const endD   = new Date(now.getFullYear(), now.getMonth(), autoReportDay_() - 1, 23, 59, 59);
    const startD = new Date(endD.getFullYear(), endD.getMonth() - 1, autoReportDay_(), 0, 0, 0);
    const span   = lrVal_(startD) + "-" + lrVal_(endD);

    const props = PropertiesService.getScriptProperties();
    if (props.getProperty("AUTO_REPORT_SENT") === span) return;   // もう送ってある

    const to = rpGroupTarget_();
    if (!to) {
      autoReportLog_("❌ 自動送信できませんでした：グループの送信先が未設定です（説明タブ Z1）");
      return;
    }

    // 先に「送った」と記録する。送信の途中で時間切れになっても、
    // 次の実行で二重に送ってしまわないようにするため
    props.setProperty("AUTO_REPORT_SENT", span);
    sendCustomReport(to, startD, endD);
    autoReportLog_("✅ " + lrFull_(startD) + "〜" + lrFull_(endD) + " のレポートを、グループLINEに自動送信しました");
  } catch (e) {
    logErr_("monthlyReportJob", e);
    autoReportLog_("❌ 自動送信に失敗しました：" + (e && e.message ? e.message : e));
  }
}

/** 自動送信の結果を、あとから見られるところに残す（説明タブ Y6・Z6） */
function autoReportLog_(text) {
  const line = lrFull_(new Date()) + " " + pad2_(new Date().getHours()) + ":" + pad2_(new Date().getMinutes()) + "\n" + text;
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    if (sh) { sh.getRange("Y6").setValue("自動送信"); sh.getRange("Z6").setValue(line); }
  } catch (e) {}
  console.log(line);
}

/**
 * 自動送信のトリガーを用意する（すでにあれば作り直す）。
 * 時刻を変えたときにも、これを呼べば入れ直せる。
 */
function ensureAutoReportTrigger_(force) {
  const hour = autoReportHour_();
  const props = PropertiesService.getScriptProperties();
  const want = "monthlyReportJob@" + hour;
  const cur = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === "monthlyReportJob";
  });
  if (!force && cur.length === 1 && props.getProperty("AUTO_REPORT_TRIGGER") === want) return false;

  cur.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("monthlyReportJob").timeBased().atHour(hour).nearMinute(0).everyDays(1).create();
  props.setProperty("AUTO_REPORT_TRIGGER", want);
  return true;
}

/** 自動送信の状態を見る（メニュー用） */
function menuAutoReportStatus() {
  ensureAutoReportTrigger_(false);
  const ui = SpreadsheetApp.getUi();
  ui.alert("⏰ レポートの自動送信", autoReportStatusText_(), ui.ButtonSet.OK);
}

/** そうさボタン／メニューの両方から使う、状態の文 */
function autoReportStatusText_() {
  const n = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === "monthlyReportJob";
  }).length;
  const props = PropertiesService.getScriptProperties();
  const to = rpGroupTarget_();

  const L = [];
  L.push(autoReportOn_() ? "自動送信：する" : "自動送信：しない（設定タブで「はい」に戻せます）");
  L.push("送る日　：毎月 " + autoReportDay_() + "日");
  L.push("送る時刻：" + autoReportHour_() + "時ごろ");
  L.push("送り先　：" + (to ? "グループLINE（設定ずみ）" : "❌ 未設定（説明タブ Z1）"));
  L.push(n > 0 ? "しかけ　：✅ 入っています（" + n + "個）" : "しかけ　：❌ 入っていません");
  const last = props.getProperty("AUTO_REPORT_SENT");
  L.push("前回送信：" + (last ? last + " のぶん" : "まだありません"));
  L.push("");
  if (n > 0 && to && autoReportOn_()) {
    L.push("毎月 " + autoReportDay_() + "日 の " + autoReportHour_() + "時ごろに、");
    L.push("前月" + autoReportDay_() + "日〜当月" + (autoReportDay_() - 1) + "日 のレポートが");
    L.push("グループLINEへ自動で送られます。");
  } else {
    L.push("⚠️ いまのままでは、自動では送られません。");
    if (!to) {
      L.push("　・送り先（グループ）がまだ分かっていません。");
      L.push("　　グループLINEに何か1つ投稿してください。それだけで覚えます。");
      L.push("　　（投稿したあと、もう一度このチェックを入れて確かめてください）");
    }
  }
  return L.join("\n");
}

/** そうさボタン [8] の中身。結果らんに出す文を返す */
function panelAutoReportStatus() {
  const made = ensureAutoReportTrigger_(false);
  return "⏰ レポートの自動送信\n" + autoReportStatusText_() +
    (made ? "\n\n（入っていなかったので、いま入れました）" : "");
}

/** 自動送信を、いますぐ試す（送る日でなくても送る。テスト送信） */
function menuAutoReportTestNow() {
  const now = new Date();
  const day = autoReportDay_();
  const endD   = new Date(now.getFullYear(), now.getMonth(), day - 1, 23, 59, 59);
  const startD = new Date(endD.getFullYear(), endD.getMonth() - 1, day, 0, 0, 0);
  const to = rpTestTarget_();
  if (!to) { SpreadsheetApp.getUi().alert("自分の送信先が分かりませんでした（設定タブ「テスト送信先（自分のLINE）」）"); return; }
  sendCustomReport(to, startD, endD);
  SpreadsheetApp.getUi().alert("🧪 自動送信で送られるのと同じものを、自分のLINEにだけ送りました。\n"
    + "期間：" + lrFull_(startD) + "〜" + lrFull_(endD));
}

/* ============ 集計 → Flex Message → LINE送信 ============ */

function sendCustomReport(targetId, customStartD, customEndD) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let startD = customStartD, endD = customEndD;
  const daysStr = ["日", "月", "火", "水", "木", "金", "土"]; const DAY_TYPES = ["平日", "金曜", "土曜", "日祝"];
  let totalRidesCount = 0; let tabRidesCount = { "北7":0, "北4":0, "北他":0, "ﾐﾅﾐ":0, "関空":0, "ほか":0 };
  let areaStats = {}; DAY_TYPES.forEach(dt => { areaStats[dt] = { "北": {l:0, m:0, s:0, t:0, sales:0, lSum:0, mSum:0, sSum:0, waitSum:0, waitCount:0, lWait:0, lWaitC:0, mWait:0, mWaitC:0, sWait:0, sWaitC:0, spots:{}}, "ﾐﾅﾐ": {l:0, m:0, s:0, t:0, sales:0, lSum:0, mSum:0, sSum:0, waitSum:0, waitCount:0, lWait:0, lWaitC:0, mWait:0, mWaitC:0, sWait:0, sWaitC:0, spots:{}}, "ほか": {l:0, m:0, s:0, t:0, sales:0, lSum:0, mSum:0, sSum:0, waitSum:0, waitCount:0, lWait:0, lWaitC:0, mWait:0, mWaitC:0, sWait:0, sWaitC:0, spots:{}} }; });

  let spotStats = {}; let spotHotData = {}; let spotDayBreakdown = {}; let timelineStats = {}; DAY_TYPES.forEach(dt => { timelineStats[dt] = {}; [20,21,22,23,0,1,2,3,4,5].forEach(h => { timelineStats[dt][h] = {}; }); });
  let spotHeatmapSales = {}; let spotHeatmapTimes = {}; let recordsForGraph = []; let ticketRides = []; let avoidRides = []; let reproRides = []; let barasiRides = []; let noPlaceCount = 0;
  const avoidWords = ["ゲロ", "ガキ", "障割", "カス", "ババア", "ジジイ", "元3"];

  PERSONAL_TABS.forEach(tabName => {
    let sheet = ss.getSheetByName(tabName); if (!sheet || sheet.getMaxRows() < 4) return;
    let dataVals = sheet.getRange(4, 1, sheet.getMaxRows() - 3, 10).getValues(); let displayVals = sheet.getRange(4, 1, sheet.getMaxRows() - 3, 10).getDisplayValues();
    let currentYear = startD.getFullYear();
    for (let r = 0; r < dataVals.length; r++) {
      let rawDate = dataVals[r][1]; let rDate = null;
      if (Object.prototype.toString.call(rawDate) === "[object Date]") { rDate = rawDate; } else if (displayVals[r][1]) { let mm = displayVals[r][1].match(/^(\d+)\/(\d+)/); if (mm) rDate = new Date(currentYear, parseInt(mm[1], 10) - 1, parseInt(mm[2], 10), 12, 0, 0); }
      if (!rDate || rDate < startD || rDate > endD) continue;
      let memo = String(dataVals[r][7]); let remarks = String(dataVals[r][8]); let place = normalizeStr(String(dataVals[r][6]));

      // 乗り場が書かれていない記録は、レポートに出さない。
      // 表に名前のない行が並んでも、どこの話か分からず読みようがないため。
      // 何件そうだったかは数えておき、見出しに出す（黙って減らさない）
      if (!String(place).replace(/[\s\u3000]/g, "")) { noPlaceCount++; continue; }
      // バラシ（1件の乗車を分けて書いたもの）は、平均に混ぜると数字が狂う。
      // 数には入れないが、捨てずに一覧として残す
      if (remarks.includes("バラシ") || place.includes("バラシ")) {
        const bPrice = parseInt(String(dataVals[r][5]).replace(/[^0-9]/g, ''), 10);
        const bTm = displayVals[r][4].match(/^(\d+):(\d+)/);
        barasiRides.push([`${rDate.getMonth()+1}/${rDate.getDate()}`,
          `${daysStr[rDate.getDay()]}曜 ${bTm ? bTm[0] : ""}`, place,
          isNaN(bPrice) ? 0 : bPrice, "－", tabName + ": " + memo + " " + remarks]);
        continue;
      }
      let price = parseInt(String(dataVals[r][5]).replace(/[^0-9]/g, ''), 10); if (isNaN(price) || price === 0) continue;
      let hr = -1, min = 0, exactTimeStr = ""; let tm = displayVals[r][4].match(/^(\d+):(\d+)/); if (tm) { hr = parseInt(tm[1], 10); min = parseInt(tm[2], 10); exactTimeStr = ("0"+hr).slice(-2) + ":" + ("0"+min).slice(-2); }
      let waitMinutes = parseInt(String(dataVals[r][3]).replace(/[^0-9]/g, ''), 10); if(isNaN(waitMinutes)) waitMinutes = 0;
      let dayOfWeek = rDate.getDay(); let dayType = "平日"; if (isHolidayFunc(rDate) || dayOfWeek === 0) dayType = "日祝"; else if (dayOfWeek === 6) dayType = "土曜"; else if (dayOfWeek === 5) dayType = "金曜";

      // グラフの凡例にそのまま出るので、曜日まで入れる。
      // 「7/16」だけだと何曜日か分からず、曜日ごとの動きが読み取れない
      let dateStr = `${rDate.getMonth()+1}/${rDate.getDate()}(${daysStr[dayOfWeek]})`;
      let dateKey = `${rDate.getFullYear()}-${pad2_(rDate.getMonth()+1)}-${pad2_(rDate.getDate())}`;
      let timeStr = `${daysStr[dayOfWeek]}曜 ${exactTimeStr}`;

      if ((memo.includes("チケ") || memo.includes("チケット") || remarks.includes("チケ") || remarks.includes("チケット")) && price >= 5000) { ticketRides.push([dateStr, timeStr, place, price, waitMinutes > 0 ? waitMinutes+"分" : "－", tabName + ": " + memo + " " + remarks]); }
      if (avoidWords.some(w => memo.includes(w) || remarks.includes(w)) || price <= 999) { avoidRides.push([dateStr, timeStr, place, price, waitMinutes > 0 ? waitMinutes+"分" : "－", tabName + ": " + memo + " " + remarks]); }
      if (memo.includes("再現性") || remarks.includes("再現性") || (remarks.trim() !== "" && price >= 5000)) { reproRides.push([dateStr, timeStr, place, price, waitMinutes > 0 ? waitMinutes+"分" : "－", tabName + ": " + memo + " " + remarks]); }

      let specificCat = "ほか"; let searchPlace = removeStreetSuffix(place); let comb = (remarks + " " + place).toUpperCase();
      if (comb.includes("関空") || place.toUpperCase().includes("KIX")) specificCat = "関空"; else if (place.includes("新地7")) specificCat = "北7"; else if (place.includes("新地4")) specificCat = "北4"; else if (place.includes("ドン") || SOUTH_WORDS.some(w => searchPlace.includes(w))) specificCat = "ﾐﾅﾐ"; else if (place.includes("新地") || NORTH_WORDS.some(w => searchPlace.includes(w))) specificCat = "北他";
      let broadArea = (specificCat === "北7" || specificCat === "北4" || specificCat === "北他") ? "北" : (specificCat === "ﾐﾅﾐ" ? "ﾐﾅﾐ" : "ほか");
      totalRidesCount++; if (tabRidesCount[specificCat] !== undefined) tabRidesCount[specificCat]++; else tabRidesCount["ほか"]++;

      let sKey = `${specificCat}|${place}`; let aSt = areaStats[dayType][broadArea];
      aSt.t++; aSt.sales += price; if(waitMinutes > 0) { aSt.waitSum += waitMinutes; aSt.waitCount++; }
      if (!aSt.spots[place]) aSt.spots[place] = {l:0, m:0, s:0, lSum:0, mSum:0, sSum:0, lTimes:{}, mTimes:{}, sTimes:{}};
      let exactDStr = hr !== -1 ? `(${daysStr[dayOfWeek]}) ${exactTimeStr}` : "";

      if (price >= 10000) { aSt.l++; aSt.lSum += price; aSt.spots[place].l++; aSt.spots[place].lSum += price; if(waitMinutes>0){ aSt.lWait += waitMinutes; aSt.lWaitC++; } if(exactDStr) { aSt.spots[place].lTimes[exactDStr] = (aSt.spots[place].lTimes[exactDStr] || 0) + 1; } }
      else if (price >= 5000) { aSt.m++; aSt.mSum += price; aSt.spots[place].m++; aSt.spots[place].mSum += price; if(waitMinutes>0){ aSt.mWait += waitMinutes; aSt.mWaitC++; } if(exactDStr) { aSt.spots[place].mTimes[exactDStr] = (aSt.spots[place].mTimes[exactDStr] || 0) + 1; } }
      else { aSt.s++; aSt.sSum += price; aSt.spots[place].s++; aSt.spots[place].sSum += price; if(waitMinutes>0){ aSt.sWait += waitMinutes; aSt.sWaitC++; } if(exactDStr) { aSt.spots[place].sTimes[exactDStr] = (aSt.spots[place].sTimes[exactDStr] || 0) + 1; } }

      if (!spotStats[sKey]) spotStats[sKey] = {count: 0, sales: 0, waitSum: 0, waitCount: 0, heatmapValidCount: 0};
      spotStats[sKey].count++; spotStats[sKey].sales += price; if(waitMinutes > 0) { spotStats[sKey].waitSum += waitMinutes; spotStats[sKey].waitCount++; }

      if(!spotDayBreakdown[sKey]) { spotDayBreakdown[sKey] = {}; DAY_TYPES.forEach(dt => spotDayBreakdown[sKey][dt] = {c:0, s:0, waits:[], exactTimes:[]}); }
      spotDayBreakdown[sKey][dayType].c++; spotDayBreakdown[sKey][dayType].s += price;
      if (waitMinutes > 0) spotDayBreakdown[sKey][dayType].waits.push(waitMinutes);
      if (hr !== -1) spotDayBreakdown[sKey][dayType].exactTimes.push(`${daysStr[dayOfWeek]}曜 ${exactTimeStr}`);

      if (hr !== -1) {
        if(!spotHotData[sKey]) spotHotData[sKey] = {}; let dhKey = `${dayOfWeek}|${hr}`;
        if(!spotHotData[sKey][dhKey]) spotHotData[sKey][dhKey] = {count: 0, sales: 0, times: []};
        spotHotData[sKey][dhKey].count++; spotHotData[sKey][dhKey].sales += price; spotHotData[sKey][dhKey].times.push(exactTimeStr);
        let isHeatmapValidTime = [20,21,22,23,0,1,2,3,4,5].includes(hr); if(isHeatmapValidTime) spotStats[sKey].heatmapValidCount++;

        if(timelineStats[dayType][hr]) {
          if(!timelineStats[dayType][hr][place]) timelineStats[dayType][hr][place] = {count: 0, sales: 0, waitSum: 0, waitCount: 0, times: [], max: 0, at: ""};
          const tls = timelineStats[dayType][hr][place];
          tls.count++; tls.sales += price; tls.times.push(`(${daysStr[dayOfWeek]}) ${exactTimeStr}`);
          // いちばん高かった乗車と、その時刻。これを「オススメの時刻」として出す。
          // 時刻を全部ならべると読めないので、代表を1つだけにする
          if (price > tls.max) { tls.max = price; tls.at = exactTimeStr; }
          if(waitMinutes > 0) { tls.waitSum += waitMinutes; tls.waitCount++; }
        }
        if(isHeatmapValidTime) {
          if(!spotHeatmapSales[sKey]) { spotHeatmapSales[sKey] = {}; spotHeatmapTimes[sKey] = {}; }
          if(!spotHeatmapSales[sKey][dayOfWeek]) { spotHeatmapSales[sKey][dayOfWeek] = {}; spotHeatmapTimes[sKey][dayOfWeek] = {}; }
          if(!spotHeatmapSales[sKey][dayOfWeek][hr]) { spotHeatmapSales[sKey][dayOfWeek][hr] = 0; spotHeatmapTimes[sKey][dayOfWeek][hr] = []; }

          spotHeatmapSales[sKey][dayOfWeek][hr] += price;
          spotHeatmapTimes[sKey][dayOfWeek][hr].push({ time: exactTimeStr, dateStr: dateStr });
        }
        let sortHr = hr < 16 ? hr + 24 : hr; let timeDec = sortHr + (min / 60);
        if (timeDec >= 20 && timeDec <= 29) recordsForGraph.push({ dateStr: dateStr, dateKey: dateKey, timeDec: timeDec, price: price, spotName: place, dayOfWeek: dayOfWeek });
      }
    }
  });

  // オプチャ（他社の人の投稿）ぶん。
  // 自社の平均に混ぜると数字が狂うので、最後まで別あつかいのまま持っておく。
  if (typeof updProgress_ === "function") updProgress_("オプチャの記録を集めています");
  const opucha = collectOpucha_(ss, startD, endD, daysStr);

  function getBestTimeStr(timesObj) { if(!timesObj) return ""; let maxC = 0, bestT = ""; for(let t in timesObj) { if(timesObj[t] > maxC) { maxC = timesObj[t]; bestT = t; } } return bestT ? " [" + bestT + "]" : ""; }

  let finalTimeline = {}; DAY_TYPES.forEach(dt => finalTimeline[dt] = {});
  let targetHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  DAY_TYPES.forEach(dType => {
    targetHours.forEach(hr => {
      let spots = timelineStats[dType][hr]; let candidates = [];
      for(let pName in spots) { if(spots[pName].count >= 2) { candidates.push({name: pName, count: spots[pName].count, avg: spots[pName].sales / spots[pName].count, wait: spots[pName].waitCount > 0 ? Math.round(spots[pName].waitSum / spots[pName].waitCount) : 0, times: spots[pName].times, max: spots[pName].max, at: spots[pName].at }); } }
      let bSpot = null, wSpot = null;
      if(candidates.length > 0) { candidates.sort((a,b) => b.avg - a.avg); bSpot = candidates[0]; let avoidCands = candidates.slice(1).filter(c => c.avg <= 1500 || c.avg <= (bSpot.avg - 2000)); if(avoidCands.length > 0) { avoidCands.sort((a,b) => a.avg - b.avg); wSpot = avoidCands[0]; } }
      finalTimeline[dType][hr] = { best: bSpot, worst: wSpot };
    });
  });

  // 記録が1件も無いのに、まとめスプシを作りに行く意味はない。
  // 空のグラフや空の表を作ろうとして途中で止まるより、はっきり知らせるほうがよい
  if (totalRidesCount === 0 && (!opucha || opucha.count === 0)) {
    const none = `${startD.getMonth()+1}/${startD.getDate()}～${endD.getMonth()+1}/${endD.getDate()}`;
    throw new Error("この期間（" + none + "）の記録が1件もありませんでした。\n" +
      "・期間の指定が合っているか\n" +
      "・記録タブに、その日付の行が入っているか\n" +
      "を確かめてください。");
  }

  const advice = buildMonthlyAdvice_(spotStats, spotHotData, finalTimeline, DAY_TYPES, targetHours, endD);

  if (typeof updProgress_ === "function") updProgress_("まとめスプシを作っています");
  // どのスプシに書いたかを、あとで確かめられるようにしておく
  let dashboardUrl = updateDetailedDashboard(ss, startD, endD, recordsForGraph, areaStats, spotHeatmapSales, spotHeatmapTimes, spotStats, spotHotData, spotDayBreakdown, finalTimeline, totalRidesCount, tabRidesCount, DAY_TYPES, ticketRides, avoidRides, reproRides, getBestTimeStr, advice, opucha, barasiRides, noPlaceCount + (opucha && opucha.noPlace ? opucha.noPlace : 0));

  const periodStr = `${startD.getMonth()+1}/${startD.getDate()}(${daysStr[startD.getDay()]})～${endD.getMonth()+1}/${endD.getDate()}(${daysStr[endD.getDay()]})`;
  const bubbles = buildReportFlex_({
    periodStr: periodStr, totalRidesCount: totalRidesCount, tabRidesCount: tabRidesCount,
    DAY_TYPES: DAY_TYPES, areaStats: areaStats, finalTimeline: finalTimeline,
    targetHours: targetHours, dashboardUrl: dashboardUrl, getBestTimeStr: getBestTimeStr,
    advice: advice, opucha: opucha,
    noPlace: noPlaceCount + (opucha && opucha.noPlace ? opucha.noPlace : 0)
  });
  // 裏メッセージ（通知やトーク一覧に出る文字）
  // 文面は Code.gs の「設定」タブから変えられる。読めないときは今までの文面
  const span = lrAlt_(startD) + "～" + lrAlt_(endD);
  let altText = "📈" + span + "レポート作成 byシバンニ";
  if (typeof cfgAltText_ === "function") {
    const tpl = String(cfgAltText_() || "");
    if (tpl) altText = tpl.indexOf("{期間}") !== -1 ? tpl.split("{期間}").join(span) : tpl + span;
  }
  // 裏メッセージは400文字まで。超えると送信そのものが失敗する
  if (altText.length > 400) altText = altText.slice(0, 397) + "…";

  const messages = bubbles.map(function (b, i) {
    return { type: "flex",
             altText: bubbles.length > 1 ? altText + "（" + (i + 1) + "/" + bubbles.length + "）" : altText,
             contents: b };
  });

  // 送信先が無いときに broadcast（公式アカウントの友だち全員に配信）へ落ちないようにする。
  // グループへ送るにはグループIDが要る。未設定なら止める。
  if (!targetId) {
    throw new Error("送信先が未設定です。メニュー「👥 グループIDを設定」から登録してください。" +
                    "（友だち全員への配信を防ぐため中止しました）");
  }
  if (typeof updProgress_ === "function") updProgress_("LINEに送っています");
  lrPush_(targetId, messages);
}

/**
 * LINEに送る。
 *
 * 失敗したときに、何が悪かったのかを日本語で返す。
 * muteHttpExceptions を付けないと、Apps Script が
 * 「応答の全文を見るには muteHttpExceptions オプションを使用してください」という
 * 英語混じりの文で止まってしまい、原因が読み取れない。
 */
function lrPush_(targetId, messages) {
  const token = getLineToken_();
  const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    payload: JSON.stringify({ to: targetId, messages: messages }),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code >= 200 && code < 300) return;

  const body = String(res.getContentText() || "");
  throw new Error(lrPushWhy_(code, body, messages));
}

/** LINEが返した断り文句を、日本語に直す */
function lrPushWhy_(code, body, messages) {
  let why = body;
  try { const j = JSON.parse(body); if (j && j.message) why = j.message; } catch (e) {}

  if (/Too large flex message/i.test(body)) {
    const sizes = (messages || []).map(function (m) { return lrBytes_(JSON.stringify(m.contents)); });
    return "レポートが大きすぎて、LINEが受け取ってくれませんでした。\n" +
      "（ふきだし " + sizes.length + "個／" + sizes.join("・") + "バイト。上限は1つ10,000バイト）\n" +
      "記録が増えるとここに当たります。ご連絡ください、分け方を調整します。";
  }
  if (code === 401) return "LINEのトークンが違うか、期限が切れています。\nメニュー「🔑 LINEトークンを設定」から入れ直してください。";
  if (code === 403) return "LINEに送る権限がありません。\nトークンが別のアカウントのものになっていないか確かめてください。";
  if (code === 404) return "送信先が見つかりません。\nグループIDが古くないか（退出していないか）確かめてください。";
  if (code === 429) return "LINEの送信数の上限に達しました。\n月が変わるまで待つか、送る回数を減らしてください。";
  if (code >= 500) return "LINE側で一時的な不具合が起きています（" + code + "）。\n少し待ってから、もう一度送ってください。";
  return "LINEに送れませんでした（" + code + "）。\n" + String(why).slice(0, 200);
}


/**
 * LINEに送る絵（Flex Message）を組み立てる。
 *
 * 集計とは切り離してある。スプレッドシートを触らないので、
 * これだけをテストで実際に組み立てて、形がこわれていないか確かめられる。
 * 送ってみるまで分からない、という状態にはしない。
 */
function buildReportFlex_(o) {
  const periodStr = o.periodStr, totalRidesCount = o.totalRidesCount, tabRidesCount = o.tabRidesCount;
  const DAY_TYPES = o.DAY_TYPES, areaStats = o.areaStats, finalTimeline = o.finalTimeline;
  const targetHours = o.targetHours, dashboardUrl = o.dashboardUrl;
  const advice = o.advice, opucha = o.opucha || { count: 0 };
  const noPlace = o.noPlace || 0;
  const getBestTimeStr = o.getBestTimeStr || function () { return ""; };
  let flexContents = [];
  // 入りきらないときに、先に削ってよい箱（細かい話）を覚えておく。
  // エリア別の成績と月間戦略アドバイスは結論なので、ここには入れない
  const trimFirst = [];
  // どこからどこまでが1つのかたまりか。
  // 2通に分けるとき、かたまりの途中で切らないために使う
  // （前は「時間詳細」の真ん中で次のメッセージに移っていた）
  const sections = [];
  const section_ = function () { sections.push(flexContents.length); };
  flexContents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#fff4e5", "paddingAll": "10px", "cornerRadius": "md", "contents": [ { "type": "text", "text": `📊 この期間の総乗車数: ${totalRidesCount}件`, "weight": "bold", "size": "sm", "color": "#e65100" }, { "type": "text", "text": `北7 ${tabRidesCount["北7"]}件 ・ 北4 ${tabRidesCount["北4"]}件 ・ 北他 ${tabRidesCount["北他"]}件 ・ ﾐﾅﾐ ${tabRidesCount["ﾐﾅﾐ"]}件 ・ 関空 ${tabRidesCount["関空"]}件 ・ ほか ${tabRidesCount["ほか"]}件` +
    (noPlace > 0 ? `\n※ 乗り場の記入がない ${noPlace}件は、この集計から外しています` : ""), "size": "xxs", "color": "#666666", "wrap": true, "margin": "xs" } ] });
  // 記号の意味は、ここで1回だけ説明する。
  // 各行に「🔥アツい：」「⚠️避ける：」と毎回書くと、そのぶん1行に収まらなくなるため
  // 1項目ずつ改行して並べる。
  // 1行ずつ箱を作ると、見た目は同じなのに中身（JSON）が3倍近くふくらんで、
  // LINEの上限（10KB）を押し上げてしまう。1つの文の中で改行する
  flexContents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#f1f3f4", "paddingAll": "8px", "cornerRadius": "md", "margin": "sm", "contents": [
    { "type": "text", "text": "── この絵の読み方 ──", "size": "xxs", "weight": "bold", "color": "#5f6368" },
    { "type": "text", "size": "xxs", "color": "#5f6368", "wrap": true, "margin": "xs",
      "text": "🔥：アツい（狙う）　／　⚠️：避ける\n" +
              "[00:00]：いちばん高かった乗車の時刻　／　(月)：その曜日\n" +
              "〇件：乗車回数　／　待〇分：平均の待ち時間\n" +
              "￥〇：1回あたりの 平均の売上（合計ではありません）\n" +
              "最高￥〇：いちばん高かった1回の売上" }
  ]});
  // ここは区切らない。総件数・読み方とエリア別は、続けて1通目に入れる
  // （区切ると、1通目が見出しだけの小さなカードになってしまう）
  flexContents.push({ "type": "separator", "margin": "md" }, { "type": "text", "text": "🔥アツいエリア【パーセント・実績】", "weight": "bold", "size": "sm", "color": "#1155ca", "margin": "md" });

  DAY_TYPES.forEach(type => {
    let areaRanks = [];
    ["北", "ﾐﾅﾐ", "ほか"].forEach(area => {
      let d = areaStats[type][area]; if(d.t > 0) { areaRanks.push({ name: area, lR: d.l/d.t, score: (d.t >= 3 ? 0 : -1000000) + Math.round(d.sales/d.t), l: d.l, m: d.m, s: d.s, t: d.t, avg: Math.round(d.sales/d.t), wait: d.waitCount > 0 ? Math.round(d.waitSum/d.waitCount) : 0, lA: d.l>0?Math.round(d.lSum/d.l):0, mA: d.m>0?Math.round(d.mSum/d.m):0, sA: d.s>0?Math.round(d.sSum/d.s):0, lW: d.lWaitC>0?Math.round(d.lWait/d.lWaitC):0, mW: d.mWaitC>0?Math.round(d.mWait/d.mWaitC):0, sW: d.sWaitC>0?Math.round(d.sWait/d.sWaitC):0, spots: d.spots }); }
    });
    // 「いちばん良かった」は、平均売上がいちばん高いエリアにする。
    // ロング率で並べていたが、2件しかないエリアがロング率50%で1位になってしまい、
    // 1つだけ出すと「平日はﾐﾅﾐ（2件）」のような、あてにならない案内になる。
    // 3件に満たないエリアは、ほかに候補があるかぎり1位にしない
    // （ほかが無いときだけ出て、記号も 🥇 ではなく (参考) になる）。
    areaRanks.sort((a,b) => b.score - a.score);
    // 通数が増えるので、LINEでは曜日区分ごとに1つだけ（平均売上がいちばん高いところ）。
    // 2位・3位は、まとめスプシの「エリア別 実績＆パーセント」で3つとも見られる
    const areaTop = areaRanks.slice(0, 1);
    if(areaTop.length > 0) {
      let boxContents = [ { "type": "text", "text": `【${type}】`, "size": "sm", "weight": "bold", "color": "#333333", "margin": "sm" } ];
      areaTop.forEach((r, i) => {
        let lrP = Math.round(r.lR*100); let mrP = Math.round((r.m/r.t)*100); let srP = Math.round((r.s/r.t)*100); let rankStr = r.t >= 3 ? "🥇" : "(参考)";
        let bestL = "-", bestM = "-", worstS = "-"; let bcL = 0, bcM = 0, bcS = 999999;
        for(let sn in r.spots) { let st = r.spots[sn]; if(st.l > bcL) { bcL = st.l; bestL = sn; } if(st.m > bcM) { bcM = st.m; bestM = sn; } if(st.s > 0 && (st.sSum/st.s) < bcS) { bcS = st.sSum/st.s; worstS = sn; } }
        boxContents.push({ "type": "text", "text": `${rankStr} ${r.name} （${r.t}件 ／ 平均売上￥${r.avg.toLocaleString()} ／ 平均待ち${r.wait}分）`, "size": "xs", "weight": "bold", "color": "#1155ca", "margin": "md", "wrap": true });

        // 帯の「中」に ◯◯% を書く。
        // 前は帯の上に左詰めで並べていたので、どの色が何%なのか分からなかった。
        // ただし細い帯に文字を入れるとはみ出すので、入る幅があるときだけ入れる。
        const percentBars = [];
        [[lrP, "#b71c1c", "ﾛﾝｸﾞ"], [mrP, "#1565c0", "ﾐﾄﾞﾙ"], [srP, "#616161", "ｼｮｰﾄ"]].forEach(function (x) {
          const pct = x[0], color = x[1], name = x[2];
          if (pct <= 0) return;
          // 細い帯でも、半角の数字2文字は必ず入る幅を確保する。
          // flex は「割合」なので、下限を入れておけば細い帯もつぶれない
          let inner;
          if (pct >= 20)     inner = [{ "type": "text", "text": `${name}${pct}%`, "size": "xxs", "weight": "bold", "color": "#ffffff", "align": "center" }];
          else if (pct >= 8) inner = [{ "type": "text", "text": `${pct}%`,        "size": "xxs", "weight": "bold", "color": "#ffffff", "align": "center" }];
          else               inner = [{ "type": "text", "text": `${pct}`,         "size": "xxs", "weight": "bold", "color": "#ffffff", "align": "center" }];
          percentBars.push({ "type": "box", "layout": "vertical", "justifyContent": "center", "backgroundColor": color, "flex": Math.max(pct, LR_BAR_MIN), "contents": inner });
        });
        if (percentBars.length > 0) { boxContents.push({ "type": "box", "layout": "horizontal", "cornerRadius": "md", "height": "22px", "margin": "xs", "contents": percentBars }); } else { boxContents.push({ "type": "box", "layout": "horizontal", "cornerRadius": "md", "height": "22px", "margin": "xs", "contents": [ { "type": "box", "layout": "vertical", "backgroundColor": "#cccccc", "flex": 1, "contents": [] } ] }); }


        // 乗り場と時刻まで入れたうえで、1行に収める。
        // 「🔥アツい：」と毎回書くのをやめ、記号だけにした（意味は上の凡例で説明ずみ）。
        // 時刻の [ ] と余分な空白も落とす。これで乗り場も時刻も残したまま1行に入る
        // 記号だけだと分かりにくいので［アツい］［避ける］も入れる。
        // ただし乗り場の名前が長いと1行に収まらないので、そのときだけ言葉を外す
        //（1行に入る量を、全角2・半角1で数えて見積もる）
        const width_ = function (t) {
          let w = 0;
          for (let i = 0; i < t.length; i++) w += t.charCodeAt(i) < 0x100 ? 1 : 2;
          return w;
        };
        const band_ = function (label, cnt, avg, wait, mark, word, spot, times) {
          const head = `${label}${cnt}件 ￥${avg.toLocaleString()} 待${wait}分`;
          if (spot === "-") return head;
          const at = String(getBestTimeStr(times) || "").replace(/[\[\] ]/g, "");
          const tail = `${toHalfWidthKana(spot)}${at}`;
          const full = `${head} ${mark}[${word}]${tail}`;
          return width_(full) <= 56 ? full : `${head} ${mark}${tail}`;
        };
        // 3行を1つの文にまとめる（見た目は同じ3行のまま）。
        // 1行ずつ別々に作ると、中身（JSON）だけが増えて1通に入りにくくなる
        boxContents.push({ "type": "text", "size": "xxs", "wrap": true, "margin": "xs", "weight": "bold", "contents": [
          { "type": "span", "text": band_("ﾛﾝｸﾞ", r.l, r.lA, r.lW, "🔥", "アツい", bestL,  bestL  !== "-" ? r.spots[bestL].lTimes  : null) + "\n", "color": "#b71c1c" },
          { "type": "span", "text": band_("ﾐﾄﾞﾙ", r.m, r.mA, r.mW, "🔥", "アツい", bestM,  bestM  !== "-" ? r.spots[bestM].mTimes  : null) + "\n", "color": "#1565c0" },
          { "type": "span", "text": band_("ｼｮｰﾄ", r.s, r.sA, r.sW, "⚠️", "避ける", worstS, worstS !== "-" ? r.spots[worstS].sTimes : null), "color": "#455a64" }
        ]});
      });
      flexContents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#f4f4f4", "paddingAll": "10px", "margin": "sm", "cornerRadius": "md", "contents": boxContents });
    }
  });

  /* ---------- 🚕 一晩の流し方 ---------- */
  // 時間帯ごとの「アツい乗り場」は下の【時間詳細】に出るが、あれは見比べる表で、
  // 「今夜どう動くか」の道すじにはなっていない。
  // ここは、20:00〜翌04:00 を頭からたどれる形で1本にまとめて出す。
  {
    const plan = buildNightPlan_(finalTimeline, DAY_TYPES);
    section_();
    flexContents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": "🚕 一晩の流し方（20:00〜翌04:00）", "weight": "bold", "size": "sm",
        "color": "#1565c0", "margin": "md", "wrap": true },
      { "type": "text", "text": "同じ乗り場が続く時間はまとめています。区切りが「動くとき」です。",
        "size": "xxs", "color": "#5f6368", "margin": "xs", "wrap": true },
      { "type": "text", "text": "狙い目：その時間帯でいちばん高かった乗車の時刻です。",
        "size": "xxs", "color": "#5f6368", "margin": "xs", "wrap": true },
      { "type": "text", "text": "平均￥〇：その区間で1回あたり いくらになったかの平均です。",
        "size": "xxs", "color": "#5f6368", "margin": "xs", "wrap": true });

    DAY_TYPES.forEach(function (dType) {
      const segs = (plan[dType] || []).filter(function (x) { return !!x.name; });
      const lines = segs.map(function (seg) {
        const aim = nightAim_(seg);
        const sp = [
          { "type": "span", "text": nightSpan_(seg) + "　", "weight": "bold", "color": "#1565c0" },
          { "type": "span", "text": toHalfWidthKana(seg.name), "weight": "bold", "color": "#000000" }
        ];
        // 狙い目の時刻は、いちばん動きたくなるところなので赤の太字にする
        if (aim) sp.push({ "type": "span", "text": "　" + aim, "weight": "bold", "color": "#c62828" });
        sp.push({ "type": "span", "text": (seg.avg ? "　平均￥" + seg.avg.toLocaleString() : "") +
                                          (seg.wait ? "　待ち平均" + seg.wait + "分" : ""), "color": "#444444" });
        return { "type": "text", "size": "xs", "margin": "sm", "wrap": true, "contents": sp };
      });
      if (!lines.length) lines.push({ "type": "text", "text": "データ不足", "size": "xs", "color": "#999999" });
      const moves = nightMoves_(segs);
      const planBox = { "type": "box", "layout": "vertical", "backgroundColor": "#e3f2fd",
        "paddingAll": "8px", "margin": "sm", "cornerRadius": "md", "contents": [
          { "type": "text", "size": "xs", "weight": "bold", "color": "#1565c0", "contents": [
            { "type": "span", "text": `【${dType}】` },
            { "type": "span", "text": segs.length ? `　動くのは${moves}回` : "", "color": "#5f6368" }
          ]},
          ...lines
        ]};
      flexContents.push(planBox);
    });
  }

  section_();
  flexContents.push({ "type": "separator", "margin": "lg" }, { "type": "text", "text": "🔥アツい ✖️ ⚠️避ける【時間詳細】", "weight": "bold", "size": "sm", "color": "#34a853", "margin": "md", "wrap": true });
  //
  // 1行 ＝ 1つの時間帯。頭に「行くならこの時刻」を1つだけ出す。
  //
  // 前は、その乗り場で拾った時刻を全部ならべていた（[(月) 23:37, (月) 23:34, …]）。
  // 30個も時刻が並ぶと、結局いつ行けばいいのか読み取れないうえ、
  // Flex Message の大きさ（50KB）にも近づいて危なかった。
  // 代表の1時刻＝「いちばん高かった乗車の時刻」と、最高額を出す形にする。
  const timeLine_ = function (mark, markColor, sp, withMax) {
    const head = sp.at ? `[${sp.at}] ` : "";
    let body = `（${sp.count}件／平均￥${Math.round(sp.avg).toLocaleString()}`;
    if (withMax && sp.max > 0) body += `／最高￥${sp.max.toLocaleString()}`;
    body += "）";
    return { "type": "text", "size": "xs", "margin": "sm", "wrap": true, "contents": [
      { "type": "span", "text": head + mark, "weight": "bold", "color": markColor },
      { "type": "span", "text": toHalfWidthKana(sp.name), "weight": "bold", "color": "#000000" },
      { "type": "span", "text": " " + body, "color": "#444444" }
    ]};
  };
  // LINEに出す行数。これがいちばんかさばるので、ここで1通に収まるかが決まる。
  // 全部の時間帯は、まとめスプシのマス目（曜日×時間帯）で見られる
  let tlMax = 3;
  try { if (typeof cfg_ === "function") { const v = parseInt(cfg_("LINEに出す時間帯の数"), 10); if (v >= 1 && v <= 99) tlMax = v; } } catch (e) {}

  DAY_TYPES.forEach(dType => {
    // 平均売上が高い時間帯から順に選ぶ。そのあと時間の順に並べ直す
    const picked = targetHours
      .filter(function (hr) { return finalTimeline[dType][hr].best || finalTimeline[dType][hr].worst; })
      .map(function (hr, i) {
        const b = finalTimeline[dType][hr].best;
        return { hr: hr, order: i, rank: b ? b.avg : -1 };
      })
      .sort(function (a, b) { return b.rank - a.rank; })
      .slice(0, tlMax)
      .sort(function (a, b) { return a.order - b.order; });

    let tLines = []; picked.forEach(function (x) {
      const b = finalTimeline[dType][x.hr].best; const w = finalTimeline[dType][x.hr].worst;
      // アツいほうは「最高いくらまで出たか」まで出す。避けるほうは行かないので出さない
      if (b) tLines.push(timeLine_("🔥", "#2e7d32", b, true));
      if (w) tLines.push(timeLine_("⚠️", "#b45f06", w, false));
    });
    if(tLines.length === 0) tLines.push({ "type": "text", "text": "データ不足", "size": "xs" });
    const tlBox = { "type": "box", "layout": "vertical", "backgroundColor": "#e8f5e9", "paddingAll": "8px", "margin": "sm", "cornerRadius": "md", "contents": [ { "type": "text", "text": `【${dType}】`, "size": "xs", "weight": "bold", "color": "#2e7d32", "margin": "none" }, ...tLines ] };
    flexContents.push(tlBox); trimFirst.push(tlBox);
  });

  /* ---------- 📣 オプチャ（他社の人の投稿） ---------- */
  const opuBox_ = function (box) { trimFirst.push(box); return box; };
  if (opucha && opucha.count > 0) {
    const top = opuchaTop_(opucha, 4);
    const opuLines = top.map(function (x) {
      return { "type": "text", "size": "xs", "margin": "sm", "wrap": true, "contents": [
        { "type": "span", "text": x.at ? `[${x.at}] ` : "", "weight": "bold", "color": "#7b1fa2" },
        { "type": "span", "text": `${toHalfWidthKana(x.name)} `, "weight": "bold", "color": "#000000" },
        { "type": "span", "text": `（${x.count}件／平均￥${x.avg.toLocaleString()}／最高￥${x.max.toLocaleString()}）`, "color": "#444444" }
      ]};
    });
    section_();
    flexContents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": "📣 オプチャ情報（他社ぶん・自社の平均には混ぜていません）", "weight": "bold", "size": "sm", "color": "#7b1fa2", "margin": "md", "wrap": true },
      opuBox_({ "type": "box", "layout": "vertical", "backgroundColor": "#f3e5f5", "paddingAll": "8px", "margin": "sm", "cornerRadius": "md", "contents": [
        { "type": "text", "text": `${opucha.count}件 ／ 平均￥${Math.round(opucha.sales / opucha.count).toLocaleString()}` +
            (opucha.waitCount > 0 ? ` ／ 平均待ち${Math.round(opucha.waitSum / opucha.waitCount)}分` : "") +
            (opucha.kanku > 0 ? ` ／ うち関空 ${opucha.kanku}件` : ""),
          "size": "xs", "weight": "bold", "color": "#4a148c", "wrap": true },
        ...opuLines
      ]}));
  }

  /* ---------- 💡 月間戦略アドバイス ---------- */
  if (advice) {
    // 乗り場・金額・時刻だけを太字にする。全部太字だと、どこが大事か分からなくなる
    const pickLines = advicePickParts_(advice).map(function (parts) {
      return { "type": "text", "size": "xs", "wrap": true, "margin": "sm", "contents": adviceSpans_(parts, "#5f6368") };
    });
    section_();
    flexContents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": "💡 月間戦略アドバイス", "weight": "bold", "size": "sm", "color": "#f57c00", "margin": "md" },

      { "type": "box", "layout": "vertical", "backgroundColor": "#fffde7", "paddingAll": "8px", "margin": "sm", "cornerRadius": "md", "contents": [
        { "type": "text", "text": "【この期間の振り返り】", "size": "xs", "weight": "bold", "color": "#e65100" },
        { "type": "text", "size": "xs", "wrap": true, "margin": "xs", "contents": adviceSpans_(adviceReviewParts_(advice), "#333333") }
      ]},

      { "type": "box", "layout": "vertical", "backgroundColor": "#fff3e0", "paddingAll": "8px", "margin": "sm", "cornerRadius": "md", "contents": [
        { "type": "text", "text": "【オススメの乗車時間と乗り場】", "size": "xs", "weight": "bold", "color": "#e65100" },
        { "type": "text", "text": "同じ曜日・時間帯で2件以上あって、平均単価が高かった組み合わせです。", "size": "xxs", "color": "#8d6e63", "wrap": true, "margin": "xs" },
        ...pickLines
      ]},

      { "type": "box", "layout": "vertical", "backgroundColor": "#e8f5e9", "paddingAll": "8px", "margin": "sm", "cornerRadius": "md", "contents": [
        { "type": "text", "text": `【${advice.nextMonth}月の戦略予想】`, "size": "xs", "weight": "bold", "color": "#2e7d32" },
        { "type": "text", "size": "xs", "wrap": true, "margin": "xs", "contents": adviceSpans_(adviceForecastParts_(advice), "#333333") }
      ]});
  }

  return lrSplitBubbles_(flexContents, periodStr, dashboardUrl, trimFirst, sections);
}

/* ============ ふきだしの大きさを、LINEの上限に合わせる ============ */

/**
 * Flex Message 1つあたりの上限。LINEは 10KB まで。
 * ぴったりを狙うと危ないので、少し余裕を持たせておく。
 */
const LR_FLEX_MAX = 9500;
/**
 * 1回の送信でならべるふきだしの数。
 *
 * LINEの上限は5。連投は迷惑なので、できるかぎり1通で済ませる。
 * ただし1通は10KBまでで、記録が増えると全部は入らない。
 * 無理に1通へ押し込むと中身が半分消えてしまうので、そのときだけ2通にする。
 * （2通でも入らないときは、細かいところから削る）
 */
const LR_FLEX_BUBBLES = 5;

/**
 * 帯（横詰グラフ）1つぶんの、いちばん細いときの割合。
 * ここを下回ると、中の数字がはみ出して読めなくなる。
 * 3%でも「3」と読めるように、見た目の幅だけ底上げしている。
 */
const LR_BAR_MIN = 7;

/**
 * 文字がUTF-8で何バイトになるかを数える。
 *
 * .length（文字数）ではだめ。日本語は1文字3バイト、絵文字は4バイトなので、
 * 文字数で見ていると「まだ余裕がある」と思っているうちに上限を超える。
 */
function lrBytes_(str) {
  const t = String(str);
  let n = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }   // 絵文字（サロゲートペア）
    else n += 3;
  }
  return n;
}

/** ふきだし1つを組み立てる */
function lrBubble_(contents, title, dashboardUrl) {
  const b = {
    "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#1155ca", "paddingAll": "15px",
      "contents": [ { "type": "text", "text": title, "weight": "bold", "color": "#ffffff", "size": "md", "wrap": true } ] },
    "body": { "type": "box", "layout": "vertical", "paddingAll": "12px", "spacing": "none", "contents": contents }
  };
  if (dashboardUrl) {
    b.footer = { "type": "box", "layout": "vertical", "paddingAll": "15px", "contents": [
      { "type": "button", "style": "primary", "color": "#d93025",
        "action": { "type": "uri", "label": "🚨ボタンを押せッ!!!!(スプシへ移動)🚨", "uri": dashboardUrl } } ] };
  }
  return b;
}

/**
 * 中身を、上限に収まるふきだしに分ける。
 *
 * ★これが無いと何が起きるか
 *   中身を足していくと、いつかLINEの上限（10KB）を超えて
 *   「Too large flex message」で送信そのものが失敗する。
 *   実際にそれで1回も届かなかった。
 *   中身を削って上限に合わせるのではなく、ふきだしを分けて全部届ける。
 *
 * それでも入りきらないとき（5つを超えるとき）は、最後に
 * 「続きはスプシで見てください」と入れて、送信は必ず成功させる。
 */
function lrSplitBubbles_(contents, periodStr, dashboardUrl, trimFirst, sections) {
  const titleOf = function (i, total) {
    return total <= 1 ? `📈 【${periodStr}】分析・戦略レポート`
                      : `📈 【${periodStr}】分析・戦略レポート（${i + 1}/${total}）`;
  };
  // 見出しの長さぶんも数に入れておく（あとで番号が付いても超えないように）
  const overhead = lrBytes_(JSON.stringify(lrBubble_([], titleOf(0, 9), dashboardUrl)));
  const weigh = function (el) { return lrBytes_(JSON.stringify(el)) + 1; };
  const groupSize = function (g) {
    return g.reduce(function (a, el) { return a + weigh(el); }, overhead);
  };

  // 中身を「かたまり」に切り分ける。
  // 見出しとその中身は、ひとまとまりで同じふきだしに入れる。
  // 1つずつ詰めていくと、時間詳細の途中で次のメッセージに移ってしまう
  const chunk = function (list) {
    const marks = (sections || []).slice().sort(function (a, b) { return a - b; });
    const out = [];
    let start = 0;
    marks.concat([list.length]).forEach(function (at) {
      if (at > start) { out.push(list.slice(start, at)); start = at; }
    });
    if (start < list.length) out.push(list.slice(start));
    return out.length ? out : [list];
  };

  /**
   * 1つのふきだしに入りきらないほど大きいかたまりを、さらに分ける。
   * その場合だけ、見出しを次のふきだしにも引き継いで「（つづき）」と付ける。
   * どの見出しの話なのか分からなくなるのを防ぐため。
   */
  const splitBig = function (group) {
    const room = LR_FLEX_MAX - overhead;
    if (group.reduce(function (a, el) { return a + weigh(el); }, 0) <= room) return [group];

    // 直前に出てきた見出しを覚えながら進む。
    // 分かれた先には、その見出しに「（つづき）」を付けて置く。
    // どの見出しの話なのか分からないまま、次のメッセージが始まるのを防ぐ
    const isHead = function (el) {
      return el && el.type === "text" && typeof el.text === "string" && el.weight === "bold";
    };
    const out = []; let cur = [], size = 0, head = null;
    group.forEach(function (el) {
      const w = weigh(el);
      if (cur.length && size + w > room) {
        out.push(cur);
        if (head) {
          const cont = Object.assign({}, head, { text: head.text + "（つづき）", margin: "none" });
          cur = [cont]; size = weigh(cont);
        } else { cur = []; size = 0; }
      }
      if (isHead(el)) head = el;
      cur.push(el); size += w;
    });
    if (cur.length) out.push(cur);
    return out;
  };

  const pack = function (list) {
    const out = [];
    let cur = [], size = overhead;
    chunk(list).forEach(function (group) {
      splitBig(group).forEach(function (part) {
        const w = part.reduce(function (a, el) { return a + weigh(el); }, 0);
        // かたまりごと次のふきだしへ送る。かたまりの途中では切らない
        if (cur.length && size + w > LR_FLEX_MAX) { out.push(cur); cur = []; size = overhead; }
        cur = cur.concat(part); size += w;
      });
    });
    if (cur.length) out.push(cur);
    return out;
  };

  // 削ったときの断り書き。これを足したぶんで、また上限を超えることがあるので、
  // 「断り書きを入れたあとの大きさ」で判定する
  const note = function (n) {
    return [{ "type": "separator", "margin": "md" },
      { "type": "text", "text": "※ 記録が多いので、細かいところは " + n + "件ぶん省きました。\n　 全部は下のボタンからスプシで見られます。",
        "size": "xs", "color": "#b71c1c", "wrap": true, "margin": "md", "weight": "bold" }];
  };
  const withNote = function (gs, n) {
    if (n <= 0 || !gs.length) return gs;
    const copy = gs.map(function (g) { return g.slice(); });
    copy[copy.length - 1] = copy[copy.length - 1].concat(note(n));
    return copy;
  };
  const fits = function (gs) {
    return gs.length <= LR_FLEX_BUBBLES && gs.every(function (g) { return groupSize(g) <= LR_FLEX_MAX; });
  };

  // 削ってよい箱（時間詳細・オプチャ）を先に削る。
  // エリア別の成績と月間戦略アドバイスは、レポートの結論なので最後まで残す。
  const work = contents.slice();
  const detail = (trimFirst || []).filter(function (el) { return el && Array.isArray(el.contents); });
  //
  // 削り方の順番。いきなり1つの箱を空にすると、そこだけ情報が消えて不公平になる。
  //   ① 細かい話（時間詳細・オプチャ）を、どれも「見出し＋3行」まで減らす
  //   ② それでも入らなければ、ほかの箱も同じところまで減らす
  //   ③ 最後の手段として、見出し1行だけを残すところまで減らす
  // いつも「いちばん大きい箱」から減らすので、どれか1つだけが丸ごと消えることはない。
  //
  const pickTarget = function (pool, floor) {
    let target = null, biggest = 0;
    pool.forEach(function (el) {
      if (!el || !Array.isArray(el.contents) || el.contents.length <= floor) return;
      const w = lrBytes_(JSON.stringify(el));
      if (w > biggest) { biggest = w; target = el; }
    });
    return target;
  };
  const nextTarget = function () {
    return pickTarget(detail, 4) || pickTarget(work, 4)
        || pickTarget(detail, 1) || pickTarget(work, 1);
  };

  let groups = pack(work);
  let cut = 0, guard = 0, done = null;
  while (guard++ < 800) {
    const g = withNote(groups, cut);
    if (fits(g)) { done = g; break; }
    const target = nextTarget();
    if (!target) { done = g; break; }        // もう削れるものが無い
    target.contents.pop(); cut++;
    groups = pack(work);
  }
  groups = done || withNote(groups, cut);
  if (!groups.length) groups = [[{ "type": "text", "text": "この期間の記録がありません", "size": "sm", "wrap": true }]];

  // それでも枚数が多いときは、最後に打ち切る（送れないよりはよい）。
  // このとき断り書きは最後のふきだしに付いているので、打ち切ると一緒に消えてしまう。
  // 「省きました」と言わないまま中身だけ減るのがいちばん困るので、必ず付け直す。
  if (groups.length > LR_FLEX_BUBBLES) {
    groups.length = LR_FLEX_BUBBLES;
    const last = groups[groups.length - 1];
    if (!last.some(function (el) { return el && typeof el.text === "string" && el.text.indexOf("省きました") !== -1; })) {
      groups[groups.length - 1] = last.concat(note(Math.max(cut, 1)));
    }
  }

  // ボタン（スプシへ移動）は最後のふきだしにだけ付ける
  return groups.map(function (g, i) {
    return lrBubble_(g, titleOf(i, groups.length), i === groups.length - 1 ? dashboardUrl : "");
  });
}

/* ============ 📣 オプチャ（他社の人の投稿）ぶんの集計 ============ */
/*
 * オプチャの記録は、個人タブ（ﾀﾞｲｽｹ・ｼｭﾝ…）ではなく
 * エリアタブ（北7・北4・北他・ﾐﾅﾐ・ほか）と 関空・ﾊﾞﾗｼ タブに、A列「ｵﾌﾟﾁｬ」として入る。
 * レポートは個人タブしか読んでいなかったので、ここまで1件も使われていなかった。
 *
 * ただし自社の平均に混ぜてはいけない（他社の売上なので、自分の実績ではない）。
 * 別の枠として数え、別の箱で出す。
 *
 * 同じ乗車がエリアタブと関空タブの両方に入っていることがあるので、
 * 「日付＋時刻＋金額＋乗り場」が同じものは1件として数える。
 */
function collectOpucha_(ss, startD, endD, daysStr) {
  const out = { count: 0, sales: 0, waitSum: 0, waitCount: 0, kanku: 0, noPlace: 0, spots: {}, hours: {} };
  const seen = {};
  const tabs = (typeof AREA_TABS !== "undefined" ? AREA_TABS : []).concat(
               typeof FLAG_TABS !== "undefined" ? FLAG_TABS : []);

  tabs.forEach(function (tabName) {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet || sheet.getMaxRows() < 4) return;
    const rows = sheet.getMaxRows() - 3;
    const vals = sheet.getRange(4, 1, rows, 10).getValues();
    const disp = sheet.getRange(4, 1, rows, 10).getDisplayValues();

    for (let r = 0; r < vals.length; r++) {
      if (String(vals[r][0]).trim() !== "ｵﾌﾟﾁｬ") continue;   // 自社ぶんの写しは数えない

      let rDate = null; const raw = vals[r][1];
      if (Object.prototype.toString.call(raw) === "[object Date]") rDate = raw;
      else if (disp[r][1]) { const mm = disp[r][1].match(/^(\d+)\/(\d+)/); if (mm) rDate = new Date(startD.getFullYear(), parseInt(mm[1],10)-1, parseInt(mm[2],10), 12, 0, 0); }
      if (!rDate || rDate < startD || rDate > endD) continue;

      const price = parseInt(String(vals[r][5]).replace(/[^0-9]/g, ''), 10);
      if (isNaN(price) || price === 0) continue;
      const place = normalizeStr(String(vals[r][6]));
      // 乗り場が書かれていないものは、どこの話か分からないので出さない
      if (!String(place).replace(/[\s\u3000]/g, "")) { out.noPlace++; continue; }
      const tm = disp[r][4].match(/^(\d+):(\d+)/);
      const timeStr = tm ? tm[0] : "";

      const k = `${rDate.getMonth()+1}/${rDate.getDate()}|${timeStr}|${price}|${place}`;
      if (seen[k]) continue;
      seen[k] = true;

      out.count++; out.sales += price;
      const wait = parseInt(String(vals[r][3]).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(wait) && wait > 0) { out.waitSum += wait; out.waitCount++; }
      if (tabName === "関空") out.kanku++;

      if (!out.spots[place]) out.spots[place] = { count: 0, sales: 0, max: 0, at: "" };
      const sp = out.spots[place];
      sp.count++; sp.sales += price;
      if (price > sp.max) { sp.max = price; sp.at = (rDate ? daysStr[rDate.getDay()] + "曜 " : "") + timeStr; }

      if (tm) {
        const hr = parseInt(tm[1], 10);
        if (!out.hours[hr]) out.hours[hr] = { count: 0, sales: 0 };
        out.hours[hr].count++; out.hours[hr].sales += price;
      }
    }
  });
  return out;
}

/** オプチャの「よく出ている乗り場」上位。少なすぎるものは出さない */
function opuchaTop_(opucha, n) {
  const list = [];
  for (const name in opucha.spots) {
    const s = opucha.spots[name];
    list.push({ name: name, count: s.count, avg: Math.round(s.sales / s.count), max: s.max, at: s.at });
  }
  // 件数が同じなら平均が高いほうを上に
  list.sort(function (a, b) { return b.count - a.count || b.avg - a.avg; });
  return list.slice(0, n || 5);
}

/* ============ 💡 月間戦略アドバイス ============ */
/*
 * 「振り返り」「オススメの時間と乗り場」「翌月の戦略予想」の3つを作る。
 * スプレッドシートを触らないので、テストでそのまま中身を確かめられる。
 */

const LR_MONTH_HINT = {
  1:  "年始（1〜3日）は法人の動きが止まり、深夜の繁華街と初詣の足だけ。4日の仕事はじめから新年会が立ち上がり、中旬以降は平常。成人の日の連休は夜が伸びる。",
  2:  "1年でいちばん静かな月。寒さと雨で「降れば動く・降らなければ死ぬ」が極端。3連休（建国記念日）とバレンタイン前後の週末だけは読める。",
  3:  "歓送迎会と年度末で最需要期。とくに最終週の平日は23時台から01時台まで途切れない。期末の接待で法人ロングも増える。",
  4:  "前半は新年度で静か。中旬から歓迎会が始まり、後半は3月並みに戻る。新入社員の短距離が増えるので、単価は落ちやすい。",
  5:  "連休中は繁華街が空き、観光と空港が中心。連休明けの1週間は鈍く、中旬から通常に戻る。",
  6:  "梅雨。雨の日は短距離が急に増える。降ったら繁華街で回転、降らなければロング狙いに切り替える。ボーナス後の週末は動く。",
  7:  "夏休み前半と祭り・花火。人出は多いが短距離寄り。ホテル発の中距離と、暑さで歩かない層が狙い目。",
  8:  "お盆（13〜16日ごろ）は法人が完全に止まる。帰省・空港・観光の長距離へ寄せる。お盆明けの最終週から戻る。",
  9:  "残暑明けで法人の飲み会が戻る。敬老の日・秋分の日の連休は、前夜の深夜が伸びる。下旬は上半期末で接待が増える。",
  10: "行楽と出張が重なる好月。ホテル・駅発のロングが出やすい。ハロウィン前後の週末は繁華街が深夜まで動く。",
  11: "中旬から忘年会が立ち上がる。23時台が厚くなり、12月に向けて右肩上がり。3連休（勤労感謝の日）も夜が伸びる。",
  12: "1年の最需要期。前半から23時台が伸び、後半は終電後の一発が出る。25日前後と仕事納め（28日ごろ）が山。年末年始に入ると急に止まる。"
};


/**
 * 月間戦略アドバイスを作る。
 *   spotStats     … "区分|乗り場" → {count, sales, waitSum, waitCount}
 *   spotHotData   … "区分|乗り場" → "曜日|時" → {count, sales, times[]}
 *   finalTimeline … 曜日区分 → 時 → {best, worst}
 */
function buildMonthlyAdvice_(spotStats, spotHotData, finalTimeline, DAY_TYPES, targetHours, endD) {
  const daysStr = ["日", "月", "火", "水", "木", "金", "土"];

  /* --- ① 振り返り：件数がそれなりにあって、平均がいちばん高かった乗り場 --- */
  let best = null;
  for (const key in spotStats) {
    const d = spotStats[key];
    // 1〜2件のまぐれを「安定していた」とは言わない
    if (d.count < 3) continue;
    const avg = Math.round(d.sales / d.count);
    const wait = d.waitCount > 0 ? Math.round(d.waitSum / d.waitCount) : 0;
    const cand = {
      name: key.split("|")[1], count: d.count, avg: avg, wait: wait,
      // 待ち時間あたりいくら稼げたか。平均￥が同じなら、待たないほうが強い
      perHour: wait > 0 ? Math.round(avg / wait * 60) : 0,
      times: []
    };
    if (spotHotData[key]) {
      const list = [];
      for (const dh in spotHotData[key]) {
        const p = dh.split("|");
        spotHotData[key][dh].times.forEach(function (t) { list.push(daysStr[p[0]] + "曜 " + t); });
      }
      cand.times = Array.from(new Set(list)).sort().slice(0, 3);
    }
    if (!best || cand.avg > best.avg) best = cand;
  }

  /* --- ② オススメ：曜日×時間帯×乗り場 で、平均単価が高かった組み合わせ --- */
  const combos = [];
  for (const key in spotHotData) {
    const name = key.split("|")[1];
    for (const dh in spotHotData[key]) {
      const hd = spotHotData[key][dh];
      if (hd.count < 2) continue;            // 1件だけの組み合わせは「狙い目」と言えない
      const p = dh.split("|");
      combos.push({
        day: daysStr[p[0]], hour: parseInt(p[1], 10), name: name,
        count: hd.count, avg: Math.round(hd.sales / hd.count),
        times: Array.from(new Set(hd.times)).sort()
      });
    }
  }
  combos.sort(function (a, b) { return b.avg - a.avg || b.count - a.count; });
  const picks = combos.slice(0, 3);

  /* --- ③ 翌月の戦略予想 --- */
  const next = new Date(endD.getFullYear(), endD.getMonth() + 1, 1);
  const nextMonth = next.getMonth() + 1;

  // 平均￥10,000を超える時間帯がいくつあるか。いちばん強い枠はどこか
  let bigSlots = 0, allSlots = 0, top = null;
  DAY_TYPES.forEach(function (dt) {
    targetHours.forEach(function (hr) {
      const b = finalTimeline[dt] && finalTimeline[dt][hr] ? finalTimeline[dt][hr].best : null;
      if (!b) return;
      allSlots++;
      if (b.avg >= 10000) bigSlots++;
      if (!top || b.avg > top.avg) top = { dt: dt, hr: hr, avg: b.avg, name: b.name, count: b.count };
    });
  });

  // 待ち時間の平均。長いほど「粘る」より「回す」が効く
  let waitSum = 0, waitCnt = 0;
  for (const key in spotStats) {
    const d = spotStats[key];
    waitSum += d.waitSum || 0; waitCnt += d.waitCount || 0;
  }
  const waitAvg = waitCnt > 0 ? Math.round(waitSum / waitCnt) : 0;

  return {
    best: best,
    picks: picks,
    nextMonth: nextMonth,
    season: LR_MONTH_HINT[nextMonth] || "",
    bigSlots: bigSlots,
    allSlots: allSlots,
    top: top,
    waitAvg: waitAvg
  };
}



/**
 * 振り返りを、太字にするところを分けた形で返す。
 * 乗り場の名前と金額がひと目で分かるように、そこだけ太字＋色にする。
 * LINEの絵（span）でも、スプシ（リッチテキスト）でも同じ区切りを使う。
 * 戻り値は [{t:文字, b:太字か, c:色}]
 */
function adviceReviewParts_(a) {
  if (!a.best) return [{ t: "3件以上の記録がある乗り場が、まだありません。記録がたまると、ここに出ます。", b: false }];
  const b = a.best;
  const out = [
    { t: "いちばん平均が高く、安定していたのは\n" },
    { t: "「" + b.name + "」", b: true, c: "#b71c1c" },
    { t: "\n" + b.count + "件 ／ 平均売上 " },
    { t: "￥" + b.avg.toLocaleString(), b: true, c: "#b71c1c" },
    { t: " ／ 平均待ち " },
    { t: b.wait + "分", b: true, c: "#0b5394" }
  ];
  if (b.perHour > 0) {
    out.push({ t: "\n待ち時間あたりの効率：この乗り場で1時間待ち続けたとすると " },
             { t: "￥" + b.perHour.toLocaleString(), b: true, c: "#0b5394" },
             { t: " ぶんの売上になる計算です" },
             { t: `（平均売上￥${b.avg.toLocaleString()} ÷ 待ち${b.wait}分 × 60分）。数字が大きいほど、待った時間が売上に変わりやすい乗り場です。` });
  }
  if (b.times.length) out.push({ t: "\n実際の乗車：" }, { t: b.times.join("、"), b: true, c: "#2e7d32" });
  return out;
}

/** オススメの組み合わせを、太字つきの行の配列で返す */
function advicePickParts_(a) {
  if (!a.picks.length) return [[{ t: "同じ曜日・時間帯で2件以上そろった組み合わせが、まだありません。", b: false }]];
  return a.picks.map(function (c, i) {
    const line = [
      { t: ["🥇", "🥈", "🥉"][i] + " " },
      { t: c.day + "曜 " + ("0" + c.hour).slice(-2) + "時台", b: true, c: "#0b5394" },
      { t: " の " },
      { t: c.name, b: true, c: "#b71c1c" },
      { t: "\n　 平均 " },
      { t: "￥" + c.avg.toLocaleString(), b: true, c: "#b71c1c" },
      { t: "（" + c.count + "件）" }
    ];
    if (c.times.length) line.push({ t: "\n　 狙い目：" }, { t: c.times.join("、"), b: true, c: "#2e7d32" });
    return line;
  });
}

/** 翌月の戦略予想を、太字つきで返す */
function adviceForecastParts_(a) {
  const out = [];

  // ① 来月そのものの話（行事・社会人の動き）
  if (a.season) out.push({ t: "▼ " + a.nextMonth + "月はこういう月\n" }, { t: a.season + "\n\n" });

  // ② この期間の数字から言えること
  out.push({ t: "▼ この期間の記録から\n" });
  if (a.allSlots === 0) {
    out.push({ t: "判断できるだけの記録がまだありません。乗り場と待ち時間の記入を増やしてください。" });
    return out;
  }
  if (a.top) {
    out.push({ t: "いちばん強かったのは " },
             { t: `${a.top.dt}の${("0" + a.top.hr).slice(-2)}時台`, b: true, c: "#0b5394" },
             { t: "（" }, { t: a.top.name, b: true, c: "#b71c1c" },
             { t: ` 平均￥${a.top.avg.toLocaleString()}／${a.top.count}件）。\n` });
  }
  out.push({ t: `平均￥10,000を超える時間帯は ${a.allSlots}個中 ` },
           { t: `${a.bigSlots}個`, b: true, c: "#b71c1c" }, { t: "。\n" });
  if (a.waitAvg > 0) out.push({ t: `待ち時間の平均は ${a.waitAvg}分。\n` });

  // ③ で、どう動くか
  out.push({ t: "\n▼ おすすめの動き方\n" });
  if (a.bigSlots >= 3) {
    out.push({ t: "高く出る時間帯が多いので、" },
             { t: "数をこなすより、その時間帯で粘って1本の単価を上げる", b: true, c: "#b71c1c" },
             { t: "ほうが稼げます。" });
    if (a.waitAvg >= 25) out.push({ t: `ただし待ちの平均が${a.waitAvg}分と長めなので、20分待って動きが無ければ次の乗り場へ移ってください。` });
  } else if (a.bigSlots >= 1) {
    out.push({ t: "高く出る時間帯は限られています。" },
             { t: "ふだんは数をこなし、その時間帯だけ粘る", b: true, c: "#b71c1c" },
             { t: "のが無難です。" });
  } else {
    out.push({ t: "平均￥10,000を超える時間帯がありません。" },
             { t: "粘らずに、短い乗車でも数を積むほうが確実", b: true, c: "#b71c1c" },
             { t: "です。" });
  }
  if (a.waitAvg > 0 && a.waitAvg < 15) {
    out.push({ t: `\n待ちが平均${a.waitAvg}分と短いので、回転を上げやすい期間です。` });
  }
  return out;
}

/** 太字つきの行を、ただの文字列に戻す */
function advicePlain_(parts) {
  return parts.map(function (x) { return x.t; }).join("");
}

/** 太字つきの行を、LINEの絵の span にする */
function adviceSpans_(parts, baseColor) {
  // 太字でも色つきでもないところは、となり同士をひとつにまとめる。
  // 1文字ずつ span を作ると、見た目は同じなのに中身（JSON）だけがふくらみ、
  // LINEの上限（10KB）に早く当たってしまう
  const out = [];
  parts.forEach(function (x) {
    const color = x.c || baseColor || "#333333";
    const bold = !!x.b;
    const last = out[out.length - 1];
    if (last && !bold && last._plain && last.color === color) { last.text += x.t; return; }
    const sp = { "type": "span", "text": x.t, "color": color };
    if (bold) sp.weight = "bold"; else sp._plain = true;
    out.push(sp);
  });
  // 目印は、送る前に落とす（LINEが知らない項目を送ると弾かれる）
  out.forEach(function (sp) { delete sp._plain; });
  return out;
}

/*
 * ↓の3つは、上の ○○Parts_ から「太字の印を外しただけ」のもの。
 * 文と太字のつけ方が2か所に分かれていると、片方だけ直してずれていく。
 * 元は ○○Parts_ だけにして、こちらはそこから作る。
 */

/** 振り返りを1つの文にする */
function adviceReviewText_(a) { return advicePlain_(adviceReviewParts_(a)); }

/** オススメの組み合わせを、行の配列にする */
function advicePickLines_(a) { return advicePickParts_(a).map(advicePlain_); }

/* ============ 🚕 一晩の流し方 ============ */
/*
 * 「何時台はどこにいればいいか」を、20:00〜翌04:00 のひと晩ぶん、
 * 曜日区分（平日・金曜・土曜・日祝）ごとに1本の道すじにする。
 *
 * ★同じ乗り場が続く時間帯は、1つにまとめる。
 *   「20時台：新地4／21時台：新地4／22時台：新地4」と3行書くより、
 *   「20〜22時台：新地4」のほうが、動く回数がひと目で分かる。
 *   運転手が知りたいのは「いつ動くか」であって、毎時の名前ではない。
 */

/** ひと晩の時間帯（20:00〜翌04:00） */
const LR_NIGHT_HOURS = [20, 21, 22, 23, 0, 1, 2, 3, 4];

/**
 * finalTimeline（曜日区分 → 時 → {best, worst}）から、道すじを作る。
 * 戻り値は 曜日区分 → [{from, to, name, avg, wait, count, at}] の配列。
 */
function buildNightPlan_(finalTimeline, DAY_TYPES) {
  const plan = {};
  (DAY_TYPES || []).forEach(function (dt) {
    const segs = [];
    LR_NIGHT_HOURS.forEach(function (hr) {
      const cell = (finalTimeline && finalTimeline[dt]) ? finalTimeline[dt][hr] : null;
      const b = cell ? cell.best : null;
      const name = b ? b.name : "";
      const last = segs[segs.length - 1];
      if (last && last.name === name) {
        last.to = hr;
        if (b) {
          last.count += b.count;
          last.sum   += b.avg * b.count;
          if (b.wait) { last.waitSum += b.wait; last.waitN++; }
          if (b.max > last.max) { last.max = b.max; last.at = b.at || last.at; }
        }
      } else {
        segs.push({ from: hr, to: hr, name: name,
                    count: b ? b.count : 0,
                    sum:   b ? b.avg * b.count : 0,
                    max:   b ? (b.max || 0) : 0,
                    at:    b ? (b.at || "") : "",
                    waitSum: (b && b.wait) ? b.wait : 0,
                    waitN:   (b && b.wait) ? 1 : 0 });
      }
    });
    segs.forEach(function (x) {
      x.avg  = x.count > 0 ? Math.round(x.sum / x.count) : 0;
      x.wait = x.waitN > 0 ? Math.round(x.waitSum / x.waitN) : 0;
    });
    plan[dt] = segs;
  });
  return plan;
}

/** 「20時台」「20〜22時台」 */
function nightSpan_(seg) {
  const h = function (x) { return ("0" + x).slice(-2); };
  return seg.from === seg.to ? h(seg.from) + "時台"
                             : h(seg.from) + "〜" + h(seg.to) + "時台";
}

/**
 * 「狙い目：23:37」。
 * その区間で いちばん高かった乗車の時刻。
 * 「何時台」だけだと1時間の幅があって動きようがないので、
 * 実際に当たった時刻を1つだけ添える。
 */
function nightAim_(seg) {
  return seg && seg.at ? "狙い目：" + seg.at : "";
}

/** 1行の文にする（まとめスプシ・見出し用） */
function nightLine_(seg) {
  if (!seg.name) return nightSpan_(seg) + "　記録なし";
  const aim = nightAim_(seg);
  // 「￥11,400」だけだと、平均なのか合計なのか最高額なのか分からない。
  // 何の金額かは、いつでも数字のすぐ前に書く
  return nightSpan_(seg) + "　" + seg.name +
    (aim ? "　" + aim : "") +
    (seg.avg  ? "　平均￥" + seg.avg.toLocaleString() : "") +
    (seg.wait ? "　待ち平均" + seg.wait + "分" : "") +
    (seg.max  ? "　最高￥" + seg.max.toLocaleString() : "");
}

/** 動く回数（記録なしの区間は数えない） */
function nightMoves_(segs) {
  const real = (segs || []).filter(function (x) { return !!x.name; });
  return real.length > 0 ? real.length - 1 : 0;
}

/*
 * マス目の色。乗り場ごとに1色を割り当てて、同じ色が縦に続けば
 * 「その間は動かなくていい」とひと目で分かるようにする。
 * 白地で読めるよう、どれも薄い色だけ。黄色系は使わない（見づらいため）。
 */
const LR_PLAN_BG = ["#fce4ec", "#e3f2fd", "#e8f5e9", "#fff3e0", "#f3e5f5",
                    "#e0f7fa", "#fbe9e7", "#f1f8e9", "#ede7f6", "#e8eaf6",
                    "#e1f5fe", "#f9fbe7"];

/** 乗り場 → 色。どの曜日区分でも同じ乗り場は同じ色にする */
function nightColors_(plan, DAY_TYPES) {
  const map = {}; let i = 0;
  (DAY_TYPES || []).forEach(function (dt) {
    (plan[dt] || []).forEach(function (seg) {
      if (!seg.name || map[seg.name]) return;
      map[seg.name] = LR_PLAN_BG[i % LR_PLAN_BG.length];
      i++;
    });
  });
  return map;
}

/** その時間帯の乗り場（マス目を描くとき用） */
function nightAt_(segs, hr) {
  for (let i = 0; i < (segs || []).length; i++) {
    const s = segs[i];
    const from = LR_NIGHT_HOURS.indexOf(s.from), to = LR_NIGHT_HOURS.indexOf(s.to);
    const now  = LR_NIGHT_HOURS.indexOf(hr);
    if (now >= from && now <= to) return s;
  }
  return null;
}


/** 翌月の戦略予想を1つの文にする */
function adviceForecastText_(a) { return advicePlain_(adviceForecastParts_(a)); }



/* ============ 🤖 Gemini「傾向と対策」 ============ */

function generateAIText(avgSales, count, waitAvg, timesArr) {
  if (count <= 1) return "データ不足のため判断保留。";
  const key = getGeminiKey_();
  if (!key) return "【AI未設定】GEMINI_API_KEY が未登録です。";
  const model = getGeminiModel_();
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   model + ":generateContent?key=" + encodeURIComponent(key);
  const prompt = `あなたはプロのタクシードライバー専用のデータ分析AIです。以下の実績データをもとに、大阪の夜勤タクシードライバー（20:00〜04:00）に向けた今後の戦略やアドバイスを、簡潔に「30文字以内」で出力してください。
  ・平均売上: ${avgSales}円
  ・今月乗車件数: ${count}件
  ・平均待ち時間: ${waitAvg}分
  ・アツい乗車時間帯: ${timesArr.join(", ")}`;

  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true };

  try {
    const res = UrlFetchApp.fetch(endpoint, options);
    const code = res.getResponseCode();
    const body = res.getContentText();
    const json = JSON.parse(body);

    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      const aiText = json.candidates[0].content.parts[0].text.trim();
      return aiText.replace(/\r?\n/g, ' ');
    }

    // 何が起きたか分かるように、原因をそのまま出す。
    // 「データが取得できませんでした」だけだと、モデル廃止なのかキー切れなのか分からない。
    const why = (json.error && json.error.message) ? json.error.message : body.slice(0, 120);
    if (code === 404) {
      return "【モデル " + model + " が見つかりません】廃止された可能性。「Geminiのモデルを変える」で変更してください";
    }
    if (code === 400 || code === 403) {
      return "【APIキーの問題 " + code + "】" + why;
    }
    if (code === 429) return "【回数制限】しばらく待って再実行してください";
    return "【AIエラー " + code + "】" + why;
  } catch(e) {
    return "【通信エラー】" + (e && e.message ? e.message : e);
  }
}

/**
 * 乗り場ぶんの「傾向と対策」を、1回のリクエストでまとめて作る。
 *
 * 前は乗り場ごとに1回ずつ呼んでいた。20か所あれば20回で、
 * 無料枠の回数制限（429）にすぐ当たるうえ、1回1〜2秒かかるので
 * レポート作成そのものが何十秒も延びていた。
 * ぜんぶ1回のリクエストにまとめれば、制限にも当たらず速い。
 *
 * 返ってこなかったときは、エラー文をそのまま出さずに
 * 数字から作った文章（aiFallback_）を入れる。
 * 「【AI分析エラー】データが取得できませんでした」が全行に並ぶより、ずっと役に立つ。
 *
 * 戻り値は items と同じ長さの配列。
 */
function generateAIBatch_(items) {
  const out = items.map(function (it) { return aiFallback_(it); });
  if (!items.length) return out;

  const key = getGeminiKey_();
  if (!key) {
    out[0] = "【AI未設定】メニュー「🤖 Geminiキーを設定」から登録してください。／" + out[0];
    return out;
  }
  const model = getGeminiModel_();
  const lines = items.map(function (it, i) {
    return `${i + 1}. ${it.name}：平均売上${it.avgSales}円／${it.count}件／平均待ち${it.waitAvg}分` +
           (it.times && it.times.length ? `／よく出る時刻 ${it.times.slice(0, 6).join(" ")}` : "");
  }).join("\n");

  const prompt = "あなたは大阪の夜勤タクシードライバー（20:00〜翌05:00）専用のデータ分析AIです。\n" +
    "下の乗り場ごとに、今後の立ち回りの助言を1つずつ作ってください。\n" +
    "・1件につき日本語30文字以内、1行\n" +
    "・「1. 助言」のように、頭に番号を付ける\n" +
    "・番号の数と順番は、下の一覧とぴったり合わせる\n" +
    "・前置き、まとめ、記号の装飾は書かない\n\n" + lines;

  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   model + ":generateContent?key=" + encodeURIComponent(key);
  const options = { method: "post", contentType: "application/json",
                    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                    muteHttpExceptions: true };

  let body = "", code = 0;
  // 回数制限（429）や一時的な不調は、少し待てば通ることが多い
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    if (typeof updBeat_ === "function") updBeat_("AI分析");
    try {
      const res = UrlFetchApp.fetch(endpoint, options);
      code = res.getResponseCode(); body = res.getContentText();
      if (code === 200) break;
      if (code !== 429 && code < 500) break;      // 直らない種類のエラーなら、待っても同じ
    } catch (e) { body = String(e && e.message ? e.message : e); }
    Utilities.sleep(2000 * (tryNo + 1));
  }

  let text = "";
  try {
    const json = JSON.parse(body);
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      text = String(json.candidates[0].content.parts[0].text || "");
    } else if (json.error && json.error.message) {
      out[0] = aiWhy_(code, model, json.error.message) + "／" + out[0];
      return out;
    }
  } catch (e) {}
  if (!text) { out[0] = aiWhy_(code, model, String(body).slice(0, 120)) + "／" + out[0]; return out; }

  // 「3. 〜」の形で返ってくるので、番号で行き先を決める。
  // 番号がずれても、ほかの行を巻き込まないようにする
  text.split(/\r?\n/).forEach(function (ln) {
    const m = ln.match(/^\s*(\d{1,3})\s*[.、:：)]\s*(.+)$/);
    if (!m) return;
    const idx = parseInt(m[1], 10) - 1;
    const val = m[2].replace(/^[-*・\s]+/, "").trim();
    if (idx >= 0 && idx < out.length && val) out[idx] = val;
  });
  return out;
}

/** AIが使えなかった理由を、そのまま分かる形にする */
function aiWhy_(code, model, why) {
  if (code === 404) return "【モデル " + model + " が見つかりません】メニュー「🤖 Geminiのモデルを変える」で変更してください";
  if (code === 400 || code === 403) return "【APIキーの問題 " + code + "】" + why;
  if (code === 429) return "【回数制限】しばらく待って、もう一度レポートを作ってください";
  if (!code) return "【通信エラー】" + why;
  return "【AIエラー " + code + "】" + why;
}

/**
 * AIが使えないときに出す、数字だけで作る「傾向と対策」。
 * AIより気は利かないが、エラー文が並ぶより役に立つ。
 */
function aiFallback_(it) {
  const a = it.avgSales, c = it.count, w = it.waitAvg;
  const L = [];
  if (a >= 15000)      L.push("高単価。最優先で狙う");
  else if (a >= 10000) L.push("ロング帯。積極的に");
  else if (a >= 5000)  L.push("平均以上。悪くない");
  else if (a >= 2500)  L.push("単価低め。空いていれば");
  else                 L.push("単価が低い。長居しない");
  if (w > 0) {
    const perHour = Math.round(a / w * 60);
    L.push(`待ち${w}分（1時間待ち続けたら￥${perHour.toLocaleString()}ぶんのペース）`);
    if (w >= 30 && a < 8000) L.push("待った時間のわりに安い。長居せず次へ");
  } else {
    L.push("待ち時間の記録なし");
  }
  if (c <= 2) L.push("件数が少なく判断は保留");
  if (it.times && it.times.length) L.push(`狙い目 ${it.times[0]}`);
  return L.join("／");
}

/* ============ 📊 まとめスプシ ダッシュボード作成 ============ */
/*
 * ★スマホで読めることを最優先にしている。
 *
 *  前は A〜Z列 を 50px で作っていた（1,300px）。iPhone の画面は 400px ほどしかないので、
 *  全体を見ようとすると3分の1まで縮まり、文字が読めなかった。
 *  そこで 1列 26px（26列 ＝ 676px）にした。
 *  記録用スプシの横幅の合計（527px）より少し広い。
 *  狭くすると縦のスクロールが長くなりすぎるので、このあたりで釣り合う。
 *  文字も 8pt → 11〜14pt に上げている。
 *
 *  ★「－」だけの行と列は作らない。
 *  前は 10時間 × 8列 を必ず並べていたので、中身が4件でも70マスの表になっていた。
 *  記録がある時間帯・曜日だけを出す。
 */

/** 1列の幅（px）。26列で iPhone の画面幅におさまるようにしてある */
const DB_COL_W = 26;
/** 列の数（＝横いっぱいのマージ幅） */
const DB_COLS  = 26;

/** 文字数から、折り返したときの行数を見積もる（全角2・半角1で数える） */
function dbLines_(text, widthPx, fontSize) {
  const t = String(text == null ? "" : text);
  const per = Math.max(4, Math.floor(widthPx / (fontSize * 0.62)));
  let n = 0;
  t.split("\n").forEach(function (ln) {
    let w = 0;
    for (let i = 0; i < ln.length; i++) w += ln.charCodeAt(i) < 0x100 ? 1 : 2;
    n += Math.max(1, Math.ceil(w / per));
  });
  return n;
}

/** その行に入る文字量から、行の高さを決める */
function dbFit_(sheet, row, cells, minH) {
  let lines = 1;
  cells.forEach(function (c) {
    lines = Math.max(lines, dbLines_(c.text, c.span * DB_COL_W - 6, c.size || 11));
  });
  sheet.setRowHeight(row, Math.min(400, Math.max(minH || 28, lines * 16 + 10)));
}

/**
 * 太字つきの行（[{t,b,c}]）を、セルにそのまま書く。
 *
 * LINEの絵では span で太字にしている。スプシでも同じところを太字にしたいので、
 * 同じ材料からリッチテキストを作る。ここが文字列に潰れていると、
 * どこが大事なのか分からない、のっぺりした文になってしまう。
 * 書いた文字をそのまま返す（行の高さを決めるのに使う）。
 */
function dbRich_(sheet, row, col, span, parts, size, bg) {
  dbEnsureRows_(sheet, row);
  const text = parts.map(function (x) { return x.t; }).join("");
  const rg = sheet.getRange(row, col, 1, span).merge()
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  if (bg) rg.setBackground(bg);

  const rt = SpreadsheetApp.newRichTextValue().setText(text);
  let at = 0;
  parts.forEach(function (x) {
    const to = at + String(x.t).length;
    if (to > at) {
      rt.setTextStyle(at, to, SpreadsheetApp.newTextStyle()
        .setFontSize(size).setBold(!!x.b).setForegroundColor(x.c || "#333333").build());
    }
    at = to;
  });
  rg.setRichTextValue(rt.build());
  return text;
}

/**
 * 名前が長いときに、入る大きさまで文字を小さくする。
 *
 * 幅に対して長すぎると、変なところで折り返されて読めない。
 * 決めた行数に収まる大きさを探して返す。
 * それでも入らないときは、いちばん小さい大きさで止める（消したりはしない）。
 */
function dbFitSize_(text, span, maxSize, minSize, maxLines) {
  const w = span * DB_COL_W - 6;
  const cap = maxLines || 2;
  // まず「1行に収まる大きさ」を探す。折り返さないのがいちばん読みやすい。
  // ただし小さくしすぎると読めないので、9pt を下回るなら行数を増やして探し直す
  for (let lines = 1; lines <= cap; lines++) {
    for (let size = maxSize; size >= minSize; size--) {
      if (dbLines_(text, w, size) > lines) continue;
      if (lines < cap && size < Math.max(minSize, 9)) break;   // 小さすぎる。次は行数を増やす
      return size;
    }
  }
  return minSize;
}

/** 金額の文字色。記録用スプシと同じ決まりにそろえる */
function dbMoneyColor_(v) {
  const n = Number(v) || 0;
  if (n >= 15000) return "#990000";   // 濃い赤
  if (n >= 10000) return "#b45f06";   // 濃い黄土色
  if (n >= 5000)  return "#0b5394";   // 濃い青
  if (n <= 999)   return "#666666";   // 濃いグレー
  return "#000000";                   // 黒
}

/**
 * よけいな空白・改行をつぶす（備考の表示崩れ対策）。
 *
 * 元のセルには手で入れた改行が何個も入っている。
 * 「男性4 ⏎ ⏎ ⏎ 0代」のように語の途中で折り返してあるので、
 * 改行をスペースに変えると「男性4 0代」と割れてしまう。
 * 改行はスペースにせず、そのままつなげる。ふつうのスペースだけ1つに詰める。
 */
function dbTidy_(text) {
  const SP = "[ \\t\\u3000]";
  return String(text == null ? "" : text)
    .replace(new RegExp(SP + "*[\\r\\n]+" + SP + "*", "g"), "")   // 改行はつなげる
    .replace(new RegExp(SP + "+", "g"), " ")                      // 空白は1つに
    .replace(/ *[、,] */g, "、")
    .trim();
}

/**
 * ダッシュボードを作るスプレッドシートを開く。
 *
 * ① 設定タブ「まとめスプシのID」（URLを貼ってもよい）
 * ② 説明タブ Z2
 * ③ どちらも無ければ、新しく1つ作る
 *
 * IDはコードにも GitHub にも書かない。人によって行き先が違ううえ、
 * リポジトリに他人のスプレッドシートの場所を残したくないため。
 */
function dbOpenTarget_(mainSS) {
  const desc = mainSS.getSheetByName("説明");
  const props = PropertiesService.getScriptProperties();
  let id = "";
  try { if (typeof cfg_ === "function") id = String(cfg_("まとめスプシのID") || "").trim(); } catch (e) {}
  if (!id && desc) id = String(desc.getRange("Z2").getValue() || "").trim();
  // セルは消えることがある（行を消した・シートを作り直した など）。
  // 実際それで毎回あたらしいスプシが作られてしまっていたので、
  // スクリプト自身の控えからも探す。こちらはシートを触っても消えない
  if (!id) id = String(props.getProperty("DASHBOARD_ID") || "").trim();

  // URLを貼られてもいいように、IDだけ取り出す
  const m = id.match(/\/d\/([a-zA-Z0-9-_]{20,})/);
  if (m) id = m[1];

  if (id) {
    try {
      const ss = SpreadsheetApp.openById(id);
      // 次からは必ずここへ作る。3か所に控えておき、1つ消えても迷子にならないようにする
      if (desc) desc.getRange("Z2").setValue(id);
      props.setProperty("DASHBOARD_ID", id);
      return ss;
    } catch (e) {
      throw new Error("まとめスプシを開けませんでした（ID: " + id.slice(0, 12) + "…）。\n" +
        "設定タブの「まとめスプシのID」に、正しいURLが入っているか確かめてください。\n" +
        "（元のエラー: " + (e && e.message ? e.message : e) + "）");
    }
  }
  // ここに来るのは、行き先がどこにも残っていないときだけ。
  // 1回作ったら、次からは必ず同じものに追記する
  const made = SpreadsheetApp.create("☣️僕はグールだッシュボード☣️");
  const newId = made.getId();
  props.setProperty("DASHBOARD_ID", newId);   // いちばん消えにくいところへ先に
  if (desc) desc.getRange("Z2").setValue(newId);
  SpreadsheetApp.flush();          // 書き終わる前に落ちても、行き先を見失わないように

  // 作ったときに勝手に付いてくる「シート1」は消す。
  // これが残っていると、タブが増えても「まっさらな新しいスプシ」に見えてしまう
  try {
    made.getSheets().forEach(function (sh) {
      if (/^(シート1|Sheet1)$/.test(sh.getName()) && made.getSheets().length > 1) made.deleteSheet(sh);
    });
  } catch (e) {}
  return made;
}

/**
 * まとめスプシを、記録用スプシと同じ人が見られるようにする。
 *
 * メールアドレスをコードに書くと、GitHub に他人のアドレスが残ってしまう。
 * 記録用スプシを触れる人＝見せたい人、なので、そこから写す。
 * 人が増えても減っても、勝手についてくる。
 */
function dbShareWithTeam_(mainSS, dbSS) {
  try {
    if (typeof cfg_ === "function" && String(cfg_("まとめスプシを同じ人に見せる") || "はい").indexOf("いいえ") === 0) return "";
    const already = {};
    dbSS.getEditors().forEach(function (u) { already[String(u.getEmail()).toLowerCase()] = true; });
    dbSS.getViewers().forEach(function (u) { already[String(u.getEmail()).toLowerCase()] = true; });

    const want = [];
    mainSS.getEditors().concat(mainSS.getViewers()).forEach(function (u) {
      const mail = String(u.getEmail() || "").trim();
      if (mail && !already[mail.toLowerCase()]) { already[mail.toLowerCase()] = true; want.push(mail); }
    });
    if (!want.length) return "";
    // 見るだけ。まとめスプシは毎回作り直すので、書き換えられると困る
    want.forEach(function (mail) { try { dbSS.addViewer(mail); } catch (e) {} });
    return want.length + "人に見る権限を足しました";
  } catch (e) {
    logErr_("dbShareWithTeam", e);
    return "";
  }
}

/** 合計 total 列を、割合 parts で分ける（合計は必ず total になる） */
function dbSplit_(total, parts) {
  const sum = parts.reduce(function (a, b) { return a + b; }, 0);
  if (sum <= 0) return parts.map(function (_, i) { return i === 0 ? total : 0; });
  const out = parts.map(function (p) { return p > 0 ? Math.max(1, Math.round(total * p / sum)) : 0; });
  // 四捨五入のぶんを、いちばん広いところで調整する
  let diff = total - out.reduce(function (a, b) { return a + b; }, 0);
  while (diff !== 0) {
    let idx = 0;
    for (let i = 1; i < out.length; i++) if (out[i] > out[idx]) idx = i;
    if (diff > 0) { out[idx]++; diff--; }
    else if (out[idx] > 1) { out[idx]--; diff++; }
    else break;
  }
  return out;
}

/** グラフの●の大きさ。大きすぎると点同士が重なって、かえって読めない */
const DB_POINT_SIZE = 6;

/**
 * グラフの線を「1pxの点線」にかけ直す。
 *
 * ★ここが要点：スプレッドシートのグラフは、Apps Script の
 *   setOption('series', {0:{lineDashStyle:[2,3]}}) を無視する。
 *   色も●の大きさも効くのに、点線だけ効かない。
 *   2回作り直しても実線のままだったのは、これが理由。
 *
 *   そこで、グラフを置いたあとに Sheets API（高度なサービス）から
 *   lineStyle を直接 DOTTED に書き換える。こちらは確実に効く。
 *
 * 使えないとき（サービスが無効・権限が足りない）は、何もせず実線のまま残す。
 * ここで失敗してもレポートは出したいので、例外にはしない。
 */
function dbDotLines_(dbSS, sheetName) {
  try {
    if (typeof Sheets === "undefined" || !Sheets.Spreadsheets) return "Sheets APIが使えません";
    const res = Sheets.Spreadsheets.get(dbSS.getId(),
      { fields: "sheets(properties(title),charts(chartId,spec))" });

    const reqs = [];
    (res.sheets || []).forEach(function (sh) {
      if (!sh.properties || sh.properties.title !== sheetName) return;
      (sh.charts || []).forEach(function (ch) {
        const spec = ch.spec;
        if (!spec || !spec.basicChart || !spec.basicChart.series) return;
        spec.basicChart.series.forEach(function (se) {
          se.lineStyle  = { width: 1, type: "DOTTED" };
          se.pointStyle = { size: DB_POINT_SIZE, shape: "CIRCLE" };
        });
        // ★ここを忘れると凡例（7/16・7/17…の日付）が消える。
        //   Apps Script 側で付けていた日付の名前は、この spec には入っていない。
        //   headerCount を 1 にして「1行目を名前として使う」と伝えると、
        //   もとの表の見出し（日付）がそのまま凡例になる。
        //   前の版でこれを入れ忘れ、指示されていない凡例まで消してしまっていた
        spec.basicChart.headerCount = 1;
        spec.basicChart.legendPosition = "BOTTOM_LEGEND";
        reqs.push({ updateChartSpec: { chartId: ch.chartId, spec: spec } });
      });
    });
    if (!reqs.length) return "グラフがありません";
    Sheets.Spreadsheets.batchUpdate({ requests: reqs }, dbSS.getId());
    return reqs.length + "個のグラフを点線にしました";
  } catch (e) {
    logErr_("dbDotLines", e);
    return "点線にできませんでした（" + (e && e.message ? e.message : e) + "）";
  }
}

/**
 * その行まで書けるように、足りなければ行を足す。
 *
 * 行が足りないまま getRange すると、そこで止まってレポートが出ない。
 * 記録が増えれば書く行も増えるので、決め打ちの行数では、いつか必ず足りなくなる。
 */
function dbEnsureRows_(sheet, upto) {
  try {
    const max = sheet.getMaxRows();
    if (upto > max) sheet.insertRowsAfter(max, upto - max + 200);
  } catch (e) { logErr_("dbEnsureRows", e); }
}

/** 区切りの空行。どこまでが1つのまとまりか分かるようにする */
function dbGap_(sheet, row) {
  try {
    dbEnsureRows_(sheet, row);
    sheet.getRange(row, 1, 1, DB_COLS).merge().setBackground("#ffffff");
    sheet.setRowHeight(row, 30);
  } catch (e) {}
}

function updateDetailedDashboard(mainSS, startD, endD, recordsForGraph, areaStats, spotHeatmapSales, spotHeatmapTimes, spotStats, spotHotData, spotDayBreakdown, finalTimeline, totalRidesCount, tabRidesCount, DAY_TYPES, ticketRides, avoidRides, reproRides, getBestTimeStr, advice, opucha, barasiRides, noPlace) {
  const dbSS = dbOpenTarget_(mainSS);

  const daysStr = ["日", "月", "火", "水", "木", "金", "土"];
  // タブ名は「📈 8/16(日)～9/15(火)」。いつからいつまでか、タブを見ただけで分かるように
  const periodTab = `${startD.getMonth()+1}/${startD.getDate()}(${daysStr[startD.getDay()]})～${endD.getMonth()+1}/${endD.getDate()}(${daysStr[endD.getDay()]})`;
  const tabName = `📈 ${periodTab}`;

  // グラフ。横はシートの幅に合わせ、縦長にする（スマホで見るため）
  const CHART_W = DB_COLS * DB_COL_W - 2;
  // ヒートマップとグラフを、スクロールせずに見比べられる高さにする
  const CHART_H = 300;
  // グラフの下に空白ができていたのは、この行の高さが前回の実行のまま（大きいまま）
  // 残っていたため。置くときに必ず 21px へそろえるので、ぴったりの行数で足りる
  const CHART_ROW_H = 21;
  const CHART_ROWS = Math.ceil(CHART_H / CHART_ROW_H);

  let sheet = dbSS.getSheetByName(tabName) || dbSS.insertSheet(tabName, 0);
  sheet.clear(); sheet.getCharts().forEach(c => sheet.removeChart(c));
  let maxR = sheet.getMaxRows(); if(maxR < 900) sheet.insertRowsAfter(maxR, 900 - maxR);
  // clear() では結合は外れない。前の割りつけが残っていると新しい表と衝突するので、必ずほどく
  try { sheet.getRange(1, 1, sheet.getMaxRows(), DB_COLS).breakApart(); } catch (e) {}
  // clear() では固定行も外れない。前に固定したものが残るので、はっきり0に戻す
  try { sheet.setFrozenRows(0); sheet.setFrozenColumns(0); } catch (e) {}
  for(let i=1; i<=DB_COLS; i++) sheet.setColumnWidth(i, DB_COL_W);

  /** 横いっぱいの見出し行 */
  function dbTitle_(row, text, bg, size) {
    dbEnsureRows_(sheet, row);
    sheet.getRange(row, 1, 1, DB_COLS).merge().setValue(text)
      .setFontSize(size || 12).setFontWeight("bold").setBackground(bg)
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    dbFit_(sheet, row, [{ text: text, span: DB_COLS, size: size || 12 }], 30);
  }

  let curRow = 1;
  dbTitle_(curRow, `📈 ${periodTab}\n営業ダッシュボード（全${totalRidesCount}件）`, "#e3f2fd", 14); curRow++;
  sheet.getRange(curRow, 1, 1, DB_COLS).merge()
    .setValue(`北7 ${tabRidesCount["北7"]}件 ・ 北4 ${tabRidesCount["北4"]}件 ・ 北他 ${tabRidesCount["北他"]}件\nﾐﾅﾐ ${tabRidesCount["ﾐﾅﾐ"]}件 ・ 関空 ${tabRidesCount["関空"]}件 ・ ほか ${tabRidesCount["ほか"]}件` +
      ((noPlace || 0) > 0 ? `\n※ 乗り場の記入がない ${noPlace}件は、この集計から外しています` : ""))
    .setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.setRowHeight(curRow, (noPlace || 0) > 0 ? 56 : 40); curRow++;

  /* ---------- 📊 エリア別 実績＆パーセント（LINEの絵と同じもの） ---------- */
  // v185からの作り直しのときに、まるごと抜け落ちていた部分。
  // LINEの絵にはあるのに、スプシには無いという状態だった
  dbTitle_(curRow, "📊 エリア別 実績＆パーセント（ﾛﾝｸﾞ／ﾐﾄﾞﾙ／ｼｮｰﾄの割合）", "#e8eef5", 12); curRow++;
  DAY_TYPES.forEach(function (type) {
    const ranks = [];
    ["北", "ﾐﾅﾐ", "ほか"].forEach(function (area) {
      const d = areaStats[type][area];
      if (d.t <= 0) return;
      ranks.push({ name: area, t: d.t, l: d.l, m: d.m, s: d.s,
        avg: Math.round(d.sales / d.t),
        wait: d.waitCount > 0 ? Math.round(d.waitSum / d.waitCount) : 0,
        lA: d.l>0?Math.round(d.lSum/d.l):0, mA: d.m>0?Math.round(d.mSum/d.m):0, sA: d.s>0?Math.round(d.sSum/d.s):0,
        score: d.t <= 1 ? -100 : (d.l / d.t) });
    });
    if (!ranks.length) return;
    ranks.sort(function (a, b) { return b.score - a.score; });

    dbTitle_(curRow, `【${type}】`, "#f6f6f6", 11); curRow++;
    const from = curRow;
    ranks.forEach(function (r, i) {
      const rank = r.t > 1 ? (i < 3 ? ["🥇","🥈","🥉"][i] : "　") : "(参考)";
      const lP = Math.round(r.l / r.t * 100), mP = Math.round(r.m / r.t * 100), sP = Math.round(r.s / r.t * 100);

      // 1行目：エリアの成績
      sheet.getRange(curRow, 1, 1, DB_COLS).merge()
        .setValue(`${rank} ${r.name}　${r.t}件 ／ 平均売上￥${r.avg.toLocaleString()} ／ 平均待ち${r.wait}分`)
        .setFontSize(12).setFontWeight("bold").setFontColor("#1155ca")
        .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
      sheet.setRowHeight(curRow, 26); curRow++;

      // 2行目：割合の帯。列の幅そのものを帯にする（LINEの絵と同じ見え方にする）。
      // 細い帯でも半角2桁（例「3」）が必ず入るよう、割合に下限を付けてから割る
      const floor_ = function (v) { return v > 0 ? Math.max(v, 8) : 0; };
      const widths = dbSplit_(DB_COLS, [floor_(lP), floor_(mP), floor_(sP)]);
      let c = 1;
      [[widths[0], "#b71c1c", "ﾛﾝｸﾞ", lP], [widths[1], "#1565c0", "ﾐﾄﾞﾙ", mP], [widths[2], "#616161", "ｼｮｰﾄ", sP]]
        .forEach(function (x) {
          if (x[0] <= 0) return;
          const px = x[0] * DB_COL_W;
          const rg = sheet.getRange(curRow, c, 1, x[0]).merge()
            .setBackground(x[1]).setFontColor("#ffffff").setFontSize(10).setFontWeight("bold")
            .setHorizontalAlignment("center").setVerticalAlignment("middle");
          rg.setValue(px >= 75 ? (x[2] + x[3] + "%") : (px >= 40 ? (x[3] + "%") : String(x[3])));
          c += x[0];
        });
      sheet.setRowHeight(curRow, 22); curRow++;

      // 3行目：金額帯ごとの内訳。帯と同じ色にして、どれの話か目で追えるようにする
      dbRich_(sheet, curRow, 1, DB_COLS, [
        { t: `ﾛﾝｸﾞ ${r.l}件 ￥${r.lA.toLocaleString()}`, b: true, c: "#b71c1c" },
        { t: "　／　" },
        { t: `ﾐﾄﾞﾙ ${r.m}件 ￥${r.mA.toLocaleString()}`, b: true, c: "#1565c0" },
        { t: "　／　" },
        { t: `ｼｮｰﾄ ${r.s}件 ￥${r.sA.toLocaleString()}`, b: true, c: "#616161" }
      ], 10);
      sheet.setRowHeight(curRow, 22); curRow++;
      dbGap_(sheet, curRow); curRow++;
    });
    sheet.getRange(from - 1, 1, curRow - from + 1, DB_COLS)
      .setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  });

  /* ---------- 💡 月間戦略アドバイス（LINEの絵と同じもの） ---------- */
  if (advice) {
    dbTitle_(curRow, "💡 月間戦略アドバイス", "#e8eef5", 13); curRow++;
    const advFrom = curRow;
    // オススメは1つずつ行を分ける。3つを1マスに押し込むと、どれがどれか読めない
    const pickParts = advicePickParts_(advice);
    const blocks = [
      ["【この期間の振り返り】", [adviceReviewParts_(advice)], "#eef3f8", "#0b5394"],
      ["【オススメの乗車時間と乗り場】",
        [[{ t: "同じ曜日・時間帯で2件以上あって、平均単価が高かった組み合わせです。", c: "#5f6368" }]].concat(pickParts),
        "#fdf0ef", "#b71c1c"],
      [`【${advice.nextMonth}月の戦略予想】`, [adviceForecastParts_(advice)], "#eaf4ec", "#2e7d32"]
    ];
    blocks.forEach(function (b) {
      sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue(b[0])
        .setFontSize(12).setFontWeight("bold").setFontColor(b[3]).setBackground(b[2])
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
      sheet.setRowHeight(curRow, 26); curRow++;
      // 乗り場・金額・時刻だけを太字にする。全部同じ太さだと、どこが大事か分からない
      b[1].forEach(function (parts) {
        const txt = dbRich_(sheet, curRow, 1, DB_COLS, parts, 11, b[2]);
        dbFit_(sheet, curRow, [{ text: txt, span: DB_COLS, size: 11 }], 26);
        curRow++;
      });
      dbGap_(sheet, curRow); curRow++;
    });
    sheet.getRange(advFrom - 1, 1, curRow - advFrom + 1, DB_COLS)
      .setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  }

  /* ---------- 📣 オプチャ（他社の人の投稿） ---------- */
  if (opucha && opucha.count > 0) {
    dbTitle_(curRow, "📣 オプチャ情報（他社ぶん・自社の平均には混ぜていません）", "#f3e5f5", 12); curRow++;
    const opuFrom = curRow;
    sheet.getRange(curRow, 1, 1, DB_COLS).merge()
      .setValue(`${opucha.count}件 ／ 平均￥${Math.round(opucha.sales / opucha.count).toLocaleString()}` +
        (opucha.waitCount > 0 ? ` ／ 平均待ち${Math.round(opucha.waitSum / opucha.waitCount)}分` : "") +
        (opucha.kanku > 0 ? ` ／ うち関空 ${opucha.kanku}件` : ""))
      .setFontSize(12).setFontWeight("bold").setFontColor("#4a148c")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(curRow, 26); curRow++;

    const OP_SPANS = dbSplit_(DB_COLS, [34, 22, 22, 22]);
    const opHead = getGridRange(sheet, curRow, 1, 1, OP_SPANS);
    ["乗り場名", "件数", "平均売上\n(1回あたり)", "最高（その時刻）"].forEach(function (t, i) {
      opHead[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    });
    sheet.setRowHeight(curRow, 26); curRow++;

    opuchaTop_(opucha, 12).forEach(function (x) {
      const rngs = getGridRange(sheet, curRow, 1, 1, OP_SPANS);
      const maxTxt = `￥${x.max.toLocaleString()}` + (x.at ? `\n(${x.at})` : "");
      rngs[0].merge().setValue(x.name).setFontSize(12).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
      rngs[1].merge().setValue(x.count + "件").setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle");
      rngs[2].merge().setValue("￥" + x.avg.toLocaleString()).setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
      rngs[3].merge().setValue(maxTxt).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
      dbFit_(sheet, curRow, [{ text: x.name, span: OP_SPANS[0], size: 12 }, { text: maxTxt, span: OP_SPANS[3], size: 11 }], 32);
      curRow++;
    });
    sheet.getRange(opuFrom - 1, 1, curRow - opuFrom + 1, DB_COLS)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
    dbGap_(sheet, curRow); curRow++;
  }

  /* ---------- 🚕 一晩の流し方（マス目） ---------- */
  //
  // 下の【時間詳細】は「見比べる表」で、ひと晩をどう動くかは読み取れない。
  // ここは、縦に時間（20:00〜翌04:00）、横に曜日区分をならべ、
  // 同じ乗り場には同じ色をつける。色が縦に続いている間は動かなくていい。
  // 色の変わり目が「動くとき」。それがひと目で分かるのがねらい。
  {
    const plan   = buildNightPlan_(finalTimeline, DAY_TYPES);
    const colors = nightColors_(plan, DAY_TYPES);
    const hasAny = DAY_TYPES.some(function (dt) {
      return (plan[dt] || []).some(function (x) { return !!x.name; });
    });

    dbTitle_(curRow, "🚕 一晩の流し方（20:00〜翌04:00）\n" +
      "同じ色が続く間は動かなくてOK。色の変わり目が「動くとき」です\n" +
      "狙い目＝その時間帯でいちばん高かった乗車の時刻　／　平均￥＝1回あたりの平均売上", "#cfe2f3", 12); curRow++;

    // 時間帯 ＋ 曜日区分4つ（合計26列ぴったり）
    const PL_SPANS = [6, 5, 5, 5, 5];
    const from = curRow;
    {
      const hRng = getGridRange(sheet, curRow, 1, 1, PL_SPANS);
      hRng[0].merge().setValue("時間帯").setBackground("#cccccc").setFontSize(10).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
      DAY_TYPES.forEach(function (dType, i) {
        hRng[1 + i].merge().setValue(dType).setBackground("#d9d9d9").setFontSize(10).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
      });
      sheet.setRowHeight(curRow, 24); curRow++;
    }

    if (!hasAny) {
      dbEnsureRows_(sheet, curRow);
      sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue("まだ記録がありません")
        .setFontSize(11).setFontColor("#999999")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
      sheet.setRowHeight(curRow, 26); curRow++;
    } else {
      LR_NIGHT_HOURS.forEach(function (hr) {
        const rngs = getGridRange(sheet, curRow, 1, 1, PL_SPANS);
        rngs[0].merge().setValue(("0" + hr).slice(-2) + "時台").setFontSize(10).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
        DAY_TYPES.forEach(function (dType, i) {
          const seg = nightAt_(plan[dType], hr);
          const name = seg && seg.name ? toHalfWidthKana(seg.name) : "";
          // その区間のいちばん上の行にだけ、狙い目の時刻と金額を出す
          // （毎行くり返すと、どこが区間のはじまりか分からなくなる）
          const head = seg && seg.name && seg.from === hr;
          const aim  = head ? nightAim_(seg) : "";
          const text = !name ? "－"
                     : head ? [name, aim, (seg.avg ? "平均￥" + seg.avg.toLocaleString() : "")]
                                .filter(String).join("\n")
                            : name;
          rngs[1 + i].merge().setValue(text)
            .setFontSize(dbFitSize_(text, 5, 10, 7, head ? 3 : 2))
            .setFontWeight(head ? "bold" : "normal").setWrap(true)
            .setHorizontalAlignment("center").setVerticalAlignment("middle")
            .setBackground(name ? (colors[seg.name] || "#ffffff") : "#ffffff")
            .setFontColor(name ? "#000000" : "#b7b7b7");
        });
        // 区間のはじまりの行は、狙い目と金額のぶん少し高くする。
        // 高さが変わること自体が「ここが区切り」の目印にもなる
        const isHead = DAY_TYPES.some(function (dType) {
          const sg = nightAt_(plan[dType], hr);
          return sg && sg.name && sg.from === hr;
        });
        sheet.setRowHeight(curRow, isHead ? 44 : 26);
        curRow++;
      });

      // マス目の下に、道すじを1行の文でも置く（コピーして人に渡せる形）
      DAY_TYPES.forEach(function (dType) {
        const segs = (plan[dType] || []).filter(function (x) { return !!x.name; });
        if (!segs.length) return;
        dbEnsureRows_(sheet, curRow);
        const text = "【" + dType + "】動くのは" + nightMoves_(segs) + "回　" +
          segs.map(function (x) {
            const aim = nightAim_(x);
            return nightSpan_(x) + " " + toHalfWidthKana(x.name) +
                   (aim ? " " + aim : "") +
                   (x.avg ? "（平均￥" + x.avg.toLocaleString() + "）" : "");
          }).join("　→　");
        sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue(text)
          .setFontSize(dbFitSize_(text, DB_COLS, 10, 7, 2)).setWrap(true)
          .setHorizontalAlignment("left").setVerticalAlignment("middle");
        sheet.setRowHeight(curRow, 28);
        curRow++;
      });
    }
    sheet.getRange(from, 1, curRow - from, DB_COLS)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  }
  dbGap_(sheet, curRow); curRow++;

  /* ---------- 🔥アツい ✖️ ⚠️避ける【時間詳細】 ---------- */
  // 横が曜日区分、縦が時間帯。曜日をまたいで「この時間はどこが強いか」を
  // 横に見比べられる形にする（縦に積むと、見比べるのにスクロールが要る）
  dbTitle_(curRow, "🔥アツい乗り場 ✖️ ⚠️避ける乗り場【時間詳細】\n(アツい=平均売上が最高 / 避ける=平均￥1,500以下、又はアツいより￥2,000以上低い)", "#d9ead3", 12); curRow++;

  let targetHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  // 時間帯 ＋ 曜日区分ごとに（アツい・避ける）の2列
  const TL_SPANS = [2].concat([].concat.apply([], DAY_TYPES.map(function () { return [3, 3]; })));
  {
    const hRng = getGridRange(sheet, curRow, 1, 1, TL_SPANS);
    hRng[0].merge().setValue("時間帯").setBackground("#cccccc").setFontSize(10).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    DAY_TYPES.forEach(function (dType, i) {
      hRng[1 + i * 2].merge().setValue(dType + "\n🔥アツい").setBackground("#d9d9d9").setFontSize(10).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
      hRng[2 + i * 2].merge().setValue(dType + "\n⚠️避ける").setBackground("#efefef").setFontSize(10).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    });
    sheet.setRowHeight(curRow, 34);
    const from = curRow; curRow++;

    // どの曜日区分にも記録が無い時間帯は、行ごと作らない（「－」だけの行は読むところが無い）
    const hours = targetHours.filter(function (hr) {
      return DAY_TYPES.some(function (d) { return finalTimeline[d][hr].best || finalTimeline[d][hr].worst; });
    });

    if (hours.length === 0) {
      sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue("まだ記録がありません")
        .setFontSize(11).setFontColor("#999999").setHorizontalAlignment("center").setVerticalAlignment("middle");
      sheet.setRowHeight(curRow, 26); curRow++;
    } else {
      // 時刻は代表の1つだけ。全部ならべても、結局いつ行けばいいのか分からない
      const cellText = function (sp, withMax) {
        if (!sp) return "－";
        let t = (sp.at ? `[${sp.at}]\n` : "") + sp.name + `\n${sp.count}件 ￥${Math.round(sp.avg).toLocaleString()}`;
        if (withMax && sp.max > 0) t += `\n最高￥${sp.max.toLocaleString()}`;
        return t;
      };
      hours.forEach(function (hr) {
        const rngs = getGridRange(sheet, curRow, 1, 1, TL_SPANS);
        rngs[0].merge().setValue(`${("0"+hr).slice(-2)}\n時台`).setFontSize(11).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
        const texts = [];
        DAY_TYPES.forEach(function (dType, i) {
          const b = finalTimeline[dType][hr].best, w = finalTimeline[dType][hr].worst;
          const bT = cellText(b, true), wT = cellText(w, false);
          texts.push({ text: bT, span: 3, size: 10 }, { text: wT, span: 3, size: 10 });
          rngs[1 + i * 2].merge().setValue(bT).setFontSize(dbFitSize_(bT, 3, 10, 7, 6)).setFontWeight("bold").setWrap(true)
            .setHorizontalAlignment("center").setVerticalAlignment("middle")
            .setBackground(b ? "#f4cccc" : "#ffffff").setFontColor(b ? "#990000" : "#b7b7b7");
          rngs[2 + i * 2].merge().setValue(wT).setFontSize(dbFitSize_(wT, 3, 10, 7, 6)).setFontWeight("bold").setWrap(true)
            .setHorizontalAlignment("center").setVerticalAlignment("middle")
            .setBackground(w ? "#efefef" : "#ffffff").setFontColor(w ? "#434343" : "#b7b7b7");
        });
        dbFit_(sheet, curRow, texts, 44);
        curRow++;
      });
    }
    sheet.getRange(from, 1, curRow - from, DB_COLS)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  }
  dbGap_(sheet, curRow); curRow++;

  /* ---------- 乗り場ごとのヒートマップとグラフ ---------- */
  // 文字のまま並べると「10/1」が「7/16」より前に来てしまうので、本当の日付で並べる
  const dateKeyOf = {};
  recordsForGraph.forEach(function (r) { dateKeyOf[r.dateStr] = r.dateKey || r.dateStr; });
  let datesArr = Array.from(new Set(recordsForGraph.map(r => r.dateStr)))
    .sort(function (a, b) { return String(dateKeyOf[a]).localeCompare(String(dateKeyOf[b])); });
  let dateColorMap = {}; datesArr.forEach((d, i) => { dateColorMap[d] = GRAPH_COLORS[i % GRAPH_COLORS.length]; });

  let daysOrder = [1, 2, 3, 4, 5, 6, 0]; let heatmapSpotNames = [];
  // グラフのもとになる数字の置き場所。本文がここまで伸びてくると上書きしてしまうので、
  // うんと下から始める。足りなくなったら行は自動で足す（dbEnsureRows_）
  let hiddenDataRow = 5000;
  for (let key in spotStats) {
    if(spotStats[key].heatmapValidCount >= 3 && spotHeatmapSales[key]) {
      let parts = key.split("|"); let tName = parts[0]; let spotName = parts[1];

      // どの乗り場でも、同じ形の表にする（月〜日 × 20〜05時台）。
      // 記録が無い曜日を抜くと、乗り場ごとに列の並びが変わってしまい、
      // 「この乗り場の火曜は？」と見比べるときに読み違える
      const useDays = daysOrder;
      const useHours = targetHours;
      const hasAny = daysOrder.some(function (d) {
        return spotHeatmapSales[key][d] && targetHours.some(function (hr) { return spotHeatmapSales[key][d][hr] > 0; });
      });
      // 出すものが無ければ、下の「個別乗り場 実績」に回す（どこにも出ないのがいちばん困る）
      if (!hasAny) continue;
      heatmapSpotNames.push(spotName);

      if (typeof updBeat_ === "function") updBeat_("ヒートマップ " + spotName);
      dbTitle_(curRow, `🔥 【${spotName}】曜日×時間帯別ヒートマップ\n(条件: 20〜29時台で月間3件以上の実績)`, TAB_COLORS[tName] || "#e8eef5", 12); curRow++;

      // 時間帯のらん＋曜日のぶんで、横26列をきっちり分ける
      const hmFirst = Math.max(4, DB_COLS - Math.floor((DB_COLS - 4) / useDays.length) * useDays.length);
      const hmEach = Math.floor((DB_COLS - hmFirst) / useDays.length);
      const hmSpans = [hmFirst].concat(useDays.map(() => hmEach));
      const rest = DB_COLS - hmSpans.reduce((a, b) => a + b, 0);
      if (rest > 0) hmSpans.push(rest);

      const hRngs = getGridRange(sheet, curRow, 1, 1, hmSpans);
      ["時間帯"].concat(useDays.map(d => daysStr[d] + "曜")).forEach(function (t, i) {
        hRngs[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
      });
      if (rest > 0) hRngs[hmSpans.length - 1].merge().setBackground("#cccccc");
      sheet.setRowHeight(curRow, 28); curRow++;

      let hmAvgSalesList = [];
      useHours.forEach(hr => { useDays.forEach(d => { let s = (spotHeatmapSales[key][d] && spotHeatmapSales[key][d][hr]) ? spotHeatmapSales[key][d][hr] : 0; let tArr = (spotHeatmapTimes[key][d] && spotHeatmapTimes[key][d][hr]) ? spotHeatmapTimes[key][d][hr] : []; let avg = s > 0 ? Math.round(s / tArr.length) : 0; if (avg > 0) hmAvgSalesList.push(avg); }); });
      let top3 = [...new Set(hmAvgSalesList)].sort((a,b)=>b-a).slice(0,3);

      const hmFrom = curRow;
      useHours.forEach(hr => {
        let rngs = getGridRange(sheet, curRow, 1, 1, hmSpans);
        rngs[0].merge().setValue(`${("0"+hr).slice(-2)}時台`).setFontSize(12).setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle");
        let colIdx = 1; let cellTexts = [];
        useDays.forEach(d => {
          let s = (spotHeatmapSales[key][d] && spotHeatmapSales[key][d][hr]) ? spotHeatmapSales[key][d][hr] : 0;
          let timesArr = (spotHeatmapTimes[key][d] && spotHeatmapTimes[key][d][hr]) ? spotHeatmapTimes[key][d][hr] : [];
          let avgSales = s > 0 ? Math.round(s / timesArr.length) : 0;
          let cell = rngs[colIdx].merge().setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontSize(11);

          if (avgSales > 0) {
            let matchedColor = dateColorMap[timesArr[0].dateStr] || "#333333";
            let rankIdx = top3.indexOf(avgSales);
            let cellText = `平均￥${avgSales.toLocaleString()}\n[${timesArr.map(t => t.time).join(", ")}]`;
            if (rankIdx !== -1) cellText += `\n${["🥇","🥈","🥉"][rankIdx]}`;
            cellTexts.push(cellText);

            const nl = cellText.indexOf("\n");
            const nl2 = cellText.indexOf("\n", nl + 1);
            let rt = SpreadsheetApp.newRichTextValue().setText(cellText);
            rt.setTextStyle(0, nl, SpreadsheetApp.newTextStyle().setBold(true).setFontSize(11).setForegroundColor("#000000").build());
            rt.setTextStyle(nl + 1, nl2 === -1 ? cellText.length : nl2,
              SpreadsheetApp.newTextStyle().setBold(true).setFontSize(10).setForegroundColor(matchedColor).build());

            // 1位＝薄い赤、2位＝薄い青、3位＝薄い緑
            if (rankIdx === 0) cell.setBackground("#f4cccc"); else if (rankIdx === 1) cell.setBackground("#cfe2f3"); else if (rankIdx === 2) cell.setBackground("#d9ead3"); else cell.setBackground("#ffffff");
            cell.setRichTextValue(rt.build());
          } else { cell.setValue("－").setFontColor("#b7b7b7").setBackground("#ffffff"); }
          colIdx++;
        });
        if (rest > 0) rngs[hmSpans.length - 1].merge();
        // グラフと並べて1画面に収めたいので、行はできるだけ低くする
        dbFit_(sheet, curRow, cellTexts.map(t => ({ text: t, span: hmEach, size: 11 })), 34);
        curRow++;
      });
      sheet.getRange(hmFrom - 1, 1, curRow - hmFrom + 1, DB_COLS)
        .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

      let chartPlaced = false;
      let recs = recordsForGraph.filter(r => r.spotName === spotName);
      if(recs.length > 0) {
        let header = ["時間"]; datesArr.forEach(d => { header.push("'" + d); }); let table = [header];
        let times = Array.from(new Set(recs.map(r => r.timeDec))).sort((a,b) => a - b);
        for(let t of times) { let row = [t]; for(let d of datesArr) { let rec = recs.find(r => r.timeDec === t && r.dateStr === d); row.push(rec ? rec.price : null); } table.push(row); }
        if (table.length > 1) {
          dbEnsureRows_(sheet, hiddenDataRow + table.length + 4);
          let dataRng = sheet.getRange(hiddenDataRow, 1, table.length, header.length); sheet.getRange(hiddenDataRow, 1, 1, header.length).setNumberFormat('@'); dataRng.setValues(table);
          // 線は 1px、●は小さめ。
          // ※ lineDashStyle（点線）は、ここに書いてもスプレッドシートのグラフでは効かない。
          //   グラフを置いたあとに dbDotLines_() が Sheets API から直接かけ直す
          let seriesOpt = {}; for (let i = 0; i < datesArr.length; i++) { seriesOpt[i] = { lineWidth: 1, pointShape: 'circle', pointSize: DB_POINT_SIZE, color: dateColorMap[datesArr[i]], labelInLegend: datesArr[i] }; }
          // 目盛りの数（ticks）は、スプレッドシートのグラフでは効かない。
          // 代わりに「軸の範囲」を実際の記録に合わせて狭める。
          // 20〜29時で固定していたので、23〜27時に記録が集まっていても目盛りが粗かった。
          // 範囲を狭めれば、そのぶん目盛りの線が細かく入る。
          const tMin = Math.floor(Math.min.apply(null, recs.map(function (r) { return r.timeDec; })) * 2) / 2;
          const tMax = Math.ceil(Math.max.apply(null, recs.map(function (r) { return r.timeDec; })) * 2) / 2;
          const hMin = Math.max(20, tMin - 0.5), hMax = Math.min(29, Math.max(tMax + 0.5, hMin + 1));
          const maxP = Math.max.apply(null, recs.map(function (r) { return r.price; })) || 10000;
          const vMax = Math.ceil(maxP / 1000) * 1000 + 1000;

          let chart = sheet.newChart().asLineChart().addRange(dataRng).setPosition(curRow, 1, 0, 0)
            .setOption('title', `📈 【${spotName}】時刻別の売上`)
            .setOption('titleTextStyle', { fontSize: 14, bold: true })
            // 目盛りの線は、数を増やしたうえで、できるだけ細く見えるように薄くする。
            // 線の太さそのものは指定できないので、色を薄くして細く見せる。
            // 横は30分ごと、縦は10本ぶん。そのあいだにも、もっと薄い線を1本ずつ入れる
            .setOption('hAxis', {title: '時間', viewWindow: {min: hMin, max: hMax},
              gridlines: {color: '#dadada', count: Math.min(25, Math.max(4, Math.round((hMax - hMin) * 2) + 1))},
              minorGridlines: {color: '#f0f0f0', count: 2},
              textStyle: {fontSize: 10}})
            .setOption('vAxis', {title: '売上', format: '￥#,##0', viewWindow: {min: 0, max: vMax},
              gridlines: {color: '#dadada', count: 11}, minorGridlines: {color: '#f0f0f0', count: 1},
              textStyle: {fontSize: 10}})
            .setOption('series', seriesOpt).setOption('useFirstColumnAsDomain', true).setOption('headers', 1)
            .setOption('lineWidth', 1).setOption('pointSize', DB_POINT_SIZE)
            // 横が狭いので、日付の一覧は右ではなく下に置く
            .setOption('legend', {position: 'bottom', textStyle: {fontSize: 11}})
            .setOption('chartArea', {left: '16%', top: '12%', width: '80%', height: '62%'}).setOption('interpolateNulls', true)
            .setOption('width', CHART_W).setOption('height', CHART_H).build();
          sheet.insertChart(chart); hiddenDataRow += table.length + 6; chartPlaced = true;
          // グラフが乗る行の高さをそろえる。ここをやらないと、前に書いた表の
          // 高い行がそのまま残り、グラフの下に大きな空白ができる
          dbEnsureRows_(sheet, curRow + CHART_ROWS);
          try { sheet.setRowHeights(curRow, CHART_ROWS, CHART_ROW_H); } catch (e) {}
        }
      }
      curRow += chartPlaced ? CHART_ROWS : 0;
      // 本文が置き場所に近づいたら、置き場所を下へ逃がす（上書きしないように）
      if (curRow + 200 > hiddenDataRow) hiddenDataRow = curRow + 400;
      dbGap_(sheet, curRow); curRow++;
    }
  }

  /* ---------- 個別乗り場 実績（1か所を2行つかって縦長に） ---------- */
  dbTitle_(curRow, "🔥 個別乗り場 実績 (条件: ヒートマップ基準にとどかない、月間1〜2件の乗り場)", "#cfe2f3", 12); curRow++;
  const SP_SPANS = [4, 8, 6, 4, 4];
  let shRngs = getGridRange(sheet, curRow, 1, 1, SP_SPANS);
  ["タブ", "乗り場名", "🔥アツい時間", "待ち時間", "件数/平均"].forEach(function (t, i) {
    shRngs[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  });
  sheet.setRowHeight(curRow, 34); curRow++;

  let spotRowsData = [];
  for (let key in spotStats) {
    let p = key.split("|"); let tab = p[0], name = p[1]; if(heatmapSpotNames.includes(name)) continue; let d = spotStats[key];
    spotRowsData.push({tab: tab, name: name, d: d, avgSales: Math.round(d.sales / d.count), key: key});
  }
  // 金額（平均）の高い順。タブごとに固めるより、どこが強いかが一目で分かる
  spotRowsData.sort((a, b) => b.avgSales - a.avgSales);

  // AIは乗り場ごとに呼ばず、1回でまとめて作る（回数制限に当たらないように）
  for (let item of spotRowsData) {
    item.bestT = "データ不足"; item.allTimes = [];
    if(spotHotData[item.key]) {
      let bC=-1, bS=-1;
      for(let dh in spotHotData[item.key]) {
        let hd = spotHotData[item.key][dh];
        item.allTimes.push(...hd.times);
        if(hd.count > bC || (hd.count===bC && hd.sales>bS)) {
          bC=hd.count; bS=hd.sales; let p2=dh.split("|");
          item.bestT=`(${daysStr[p2[0]]}) ${("0"+p2[1]).slice(-2)}時台\n${bC}件 平均￥${Math.round(bS/bC).toLocaleString()}\n[${Array.from(new Set(hd.times)).sort().join(", ")}]`;
        }
      }
    }
    let wArrAll = []; item.waitText = "";
    if(spotDayBreakdown[item.key]) {
      DAY_TYPES.forEach(dt => {
        if(spotDayBreakdown[item.key][dt] && spotDayBreakdown[item.key][dt].waits.length>0) {
          let wArr = spotDayBreakdown[item.key][dt].waits; wArrAll.push(...wArr);
          item.waitText += `${dt} ${Math.round(wArr.reduce((a,b)=>a+b,0)/wArr.length)}分\n`;
        }
      });
    }
    if(!item.waitText) item.waitText = "記録なし";
    item.overallWait = wArrAll.length > 0 ? Math.round(wArrAll.reduce((a,b)=>a+b,0)/wArrAll.length) : 0;
  }

  const aiTexts = generateAIBatch_(spotRowsData.map(function (it) {
    return { name: it.name, avgSales: it.avgSales, count: it.d.count,
             waitAvg: it.overallWait, times: Array.from(new Set(it.allTimes)).sort() };
  }));

  const spFrom = curRow;
  spotRowsData.forEach(function (item, i) {
    let priceStyleText = `計${item.d.count}件\n平均￥${item.avgSales.toLocaleString()}`;
    let drngs = getGridRange(sheet, curRow, 1, 1, SP_SPANS);
    drngs[0].merge().setValue(item.tab).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground(TAB_COLORS[item.tab]||"#ffffff").setFontWeight("bold");
    drngs[1].merge().setValue(item.name).setFontSize(dbFitSize_(item.name, SP_SPANS[1], 12, 7, 2))
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
    drngs[2].merge().setValue(item.bestT).setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
    drngs[3].merge().setValue(item.waitText.trim()).setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    drngs[4].merge().setValue(priceStyleText).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold")
      .setFontColor(dbMoneyColor_(item.avgSales));
    dbFit_(sheet, curRow, [{ text: item.bestT, span: SP_SPANS[2], size: 10 },
                           { text: item.waitText, span: SP_SPANS[3], size: 10 },
                           { text: item.name, span: SP_SPANS[1], size: 12 }], 44);
    curRow++;

    // 🤖 は横いっぱいの行にする。狭いらんに押し込むと、長い文が読めない
    const ai = "🤖 " + item.name + "：" + aiTexts[i];
    sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue(ai)
      .setFontSize(11).setFontWeight("bold").setFontColor("#274e13").setBackground("#f6fbf2")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    dbFit_(sheet, curRow, [{ text: ai, span: DB_COLS, size: 11 }], 28);
    curRow++;
    // ここまでで1つの乗り場。次との境が分かるように、細い空行を挟む
    dbGap_(sheet, curRow); curRow++;
  });
  if(spotRowsData.length === 0) {
    sheet.getRange(curRow, 1, 1, DB_COLS).merge().setValue("該当データなし")
      .setFontSize(11).setFontColor("#999999").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(curRow, 28); curRow++;
  }
  sheet.getRange(spFrom - 1, 1, curRow - spFrom + 1, DB_COLS)
    .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  /* ---------- 特別な一覧（再現したい・チケット・避けたい） ---------- */
  function createSpecialTable(title, dataArr0, startRow, bgC, isAvoid) {
    let dataArr = (dataArr0 || []).slice();
    let row = startRow;
    dbTitle_(row, (isAvoid ? "⚠️ " : "🔥 ") + title, bgC, 12); row++;

    const hSpans = [4, 7, 7, 4, 4];
    let hRngs = getGridRange(sheet, row, 1, 1, hSpans);
    ["タブ", "乗り場名", "日付・曜日・時間", "待ち時間", "売上\n(この1回)"].forEach(function (t, i) {
      hRngs[i].merge().setValue(t).setBackground("#cccccc").setFontSize(11).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    });
    sheet.setRowHeight(row, 34);
    const from = row; row++;

    // 金額の順に並べたうえで、同じ乗り場は続けてまとめる。
    // 曜日が違うだけで別の場所にとぶと、その乗り場がどうだったのか読み取れない。
    // 並ぶ場所は「その乗り場でいちばん高かった額（避けたい表はいちばん安かった額）」で決める
    const byPlace = {};
    dataArr.forEach(function (r) {
      const k = String(r[2]);
      if (!byPlace[k]) byPlace[k] = [];
      byPlace[k].push(r);
    });
    const groups = Object.keys(byPlace).map(function (k) {
      const rows = byPlace[k].slice().sort(function (a, b) { return isAvoid ? a[3] - b[3] : b[3] - a[3]; });
      return { rows: rows, key: rows[0][3] };
    });
    groups.sort(function (a, b) { return isAvoid ? a.key - b.key : b.key - a.key; });
    dataArr = [];
    groups.forEach(function (g) { g.rows.forEach(function (r) { dataArr.push(r); }); });

    if(dataArr.length > 0) {
      for(let i=0; i<dataArr.length; i++) {
        const rData = dataArr[i];
        const tabN = String(rData[5]).split(":")[0];
        const dRngs = getGridRange(sheet, row, 1, 1, hSpans);
        dRngs[0].merge().setValue(tabN).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground(TAB_COLORS[tabN] || "#ffffff");
        dRngs[1].merge().setValue(rData[2]).setFontSize(dbFitSize_(String(rData[2]), hSpans[1], 12, 7, 2))
          .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
        dRngs[2].merge().setValue(rData[0]+"\n"+rData[1]).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setFontWeight("bold");
        dRngs[3].merge().setValue(rData[4]).setFontSize(11).setHorizontalAlignment("center").setVerticalAlignment("middle");

        const priceCell = dRngs[4].merge().setValue(rData[3]).setNumberFormat('￥#,##0').setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold");
        // 文字色は記録用スプシと同じ決まり。背景はその目印
        priceCell.setFontColor(dbMoneyColor_(rData[3]));
        if (isAvoid && rData[3] <= 999) { dRngs.forEach(rng => { rng.setBackground("#f3f3f3"); }); }
        else if (rData[3] >= 15000) priceCell.setBackground("#f4cccc");
        else if (rData[3] >= 10000) priceCell.setBackground("#fce5cd");
        else if (rData[3] >= 5000)  priceCell.setBackground("#cfe2f3");
        dbFit_(sheet, row, [{ text: rData[2], span: hSpans[1], size: 12 },
                            { text: rData[0]+"\n"+rData[1], span: hSpans[2], size: 11 }], 40);
        row++;
        // 次の行も同じ乗り場なら、区切りを入れずに続ける
        const sameNext = (i + 1 < dataArr.length) && String(dataArr[i + 1][2]) === String(rData[2]);

        // 備考は横いっぱいの行に、中央ぞろえで置く。
        // 元のセルには手で入れた改行が何個も入っているので、空白はひとつにつぶす。
        // （前は狭いらんに生のまま入れていたので、上と下に文字が離れて表示が崩れていた）
        const memo = dbTidy_(String(rData[5]).substring(String(rData[5]).indexOf(":")+1));
        if (memo) {
          // 「どの乗車の備考か」が分かるように、頭に乗り場名を付ける。
          // 2段目だけ見ても、どの行のことか迷わないようにするため
          const memoTxt = "📝 " + rData[2] + "：" + memo;
          sheet.getRange(row, 1, 1, DB_COLS).merge().setValue(memoTxt)
            .setFontSize(11).setFontColor("#333333").setBackground("#fbfbfb")
            .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
          dbFit_(sheet, row, [{ text: memoTxt, span: DB_COLS, size: 11 }], 26);
          row++;
        }
        if (!sameNext) { dbGap_(sheet, row); row++; }
      }
    } else {
      sheet.getRange(row, 1, 1, DB_COLS).merge().setValue("データなし")
        .setFontSize(11).setFontColor("#999999").setHorizontalAlignment("center").setVerticalAlignment("middle");
      sheet.setRowHeight(row, 28); row++;
    }
    sheet.getRange(from, 1, row - from, DB_COLS)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
    return row;
  }

  curRow = createSpecialTable("再現したい乗車 一覧 (条件: 再現性を含む 又は 備考ありで￥5,000以上)", reproRides, curRow, "#cfe2f3", false);
  curRow = createSpecialTable("チケット乗車 一覧 (条件: 備考にチケを含み、かつ￥5,000以上)", ticketRides, curRow, "#fce5cd", false);
  curRow = createSpecialTable("避けたい乗車 一覧 (条件: NGワードを含む 又は ￥999以下)", avoidRides, curRow, "#f4cccc", true);
  // バラシは平均に混ぜていない（1件の乗車を分けて書いたものなので、数えると二重になる）。
  // ただし捨てはしない。ここで一覧として見られるようにする
  curRow = createSpecialTable("バラシ 一覧 (平均には数えていません。記録として残すぶん)", barasiRides || [], curRow, "#ead1dc", false);

  // グラフを全部置き終わってから、まとめて点線にする
  dbDotLines_(dbSS, tabName);

  // 記録用スプシを見られる人には、こちらも見せる
  dbShareWithTeam_(mainSS, dbSS);

  // 開いたときに、いちばん上から見えるようにする。
  // 最後に書いた場所（ずっと下）が覚えられていて、開くとそこが出てしまうため
  try {
    dbSS.setActiveSheet(sheet);
    sheet.setActiveSelection(sheet.getRange("A1"));
    SpreadsheetApp.flush();
  } catch (e) {}

  return dbSS.getUrl();
}
