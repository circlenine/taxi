/**
 * ================================================================
 *  会場・イベント情報あつめ（006-Venue.gs）
 *
 *  ★★★  V022ver  （2026/09/16）  ★★★
 *
 *  ファイル記号: C=001-Code / E=002-Extras / L=003-LineReport
 *               W=004-WebApp / U=005-Updater / V=006-Venue
 *  ※記号は、ファイル名の頭文字にそろえています（V=Venue）。
 *
 *  [V022ver]
 *   ・通知設定のボタンを2つだけにした（⏰カレンダー ／ 📱リマインダー）
 *     ★ディスコードは、送り先（ウェブフックURL）を自分で取ってきて
 *       入れてもらわないと届かない。手順が多く、ややこしすぎるのでやめた。
 *       仕掛けそのものは残してあるので、必要になれば戻せる
 *   ・ボタンの上にあった説明の行を消した
 *     「通知設定」という言葉は、ボタンの列の中に残してある
 *     （上に行を足すと、そのぶん場所を食い、読むものも増えるため）
 *
 *  [V021ver]
 *   ・「👆 この枠を押すと〇〇の公式ページが開きます」をやめた
 *     枠のいちばん下にあって、下のボタンの説明と紛らわしかった。
 *     見出しのすぐ下に「👆 詳細はクリック（該当ページに移ります）」と短く出す
 *   ・「お知らせ」→「通知設定」に言いかえた（初見で分かる言葉に）
 *   ・「DC」→「ﾃﾞｨｽｺｰﾄﾞ」に（DCは一般的な言い方ではない）
 *   ・カレンダーのボタンを「押したら その場で開く」形にした
 *     前は合図を返してリンクを送る形で、もう一度押す必要があった。
 *     終わりの時刻まで入った予定が、1回押すだけで作れる。
 *     そのぶんURLは短く詰めた（題・始まり・終わり・場所だけ。1件289バイト）
 *   ・ﾃﾞｨｽｺｰﾄﾞは、送り先が入っていないときに、その取り方を手順で案内し、
 *     アプリへのリンクも一緒に出すようにした
 *     （入っていれば、終了予定の〇分前に自動で届きます）
 *   ・返事は1回だけにした。うまくいっているのに、何度も鳴らさない
 *   ・「終了」→「終了予定」に、ぜんぶ直した
 *     催しの終わりは ほぼ必ず前後する。言い切ると、
 *     それを信じて動いた人が損をする
 *   ・送ってもらった紙を、PDFではなく 写真のまま置くようにした
 *     PDFだとリンクを押しても開かないことがあった
 *     （リーガロイヤルのぶんが、実際に開けなかった）
 *   ・注釈の頭を「※注意（必ずお読みください）※」にした
 *   ・連日の催しに「（2日目／3日間）」を付けた（vnDayNo_）
 *     写真から読んだぶんは先の日付まで持っているので、正確に数えられる。
 *     ホームページから読んだぶんは その日しか見ていないので、無理に書かない
 *   ・ワントゥワンは、詳細のページまで必ず開くようにした（vnDetailNote_）
 *     「徹夜」と書かれていたら、こちらの営業時間内にバラシが終わらない。
 *     待っても無駄足になるので、赤字ではっきり書き添える。
 *     ついでに 対象の公演名と「〇日目／〇日間」も拾う
 *
 *  [V020ver]
 *   ・読み取り台帳を「中身まで見える」形に作り直した
 *     ★「何件」だけでは、合っているかどうか確かめようがない、というご指摘。
 *       そのとおりなので、1行ずつ、こうならべた：
 *       日付（曜日つき）／会場／カテゴリー／催しの名前／開演／終演／
 *       客層・年齢層（推定）／知っておくとよい話題／触れない方がよいこと／
 *       近い乗り場／どこから読んだか／確かめるリンク
 *     いちばん右のらんを押すと、公式ページか、送ってもらったスクショが開く。
 *     これで、読み取りが合っているかを その場で見比べられる
 *   ・カテゴリーを付けた（vnCategory_）
 *     会場の種類と催しの名前の両方から決める。
 *     分からないときは、うそを書かずに「不明」と書く
 *   ・客層は「読み取り確認 詳しく」のときだけ聞く（時間がかかるため。上から30件）
 *   ・送ってもらったスクショのありかを、予定1件ずつに持たせるようにした
 *     受け取った日で引く形にしていたので、
 *     先の日付の予定からはリンクが引けなくなっていた（直した）
 *   ・足りない見張りを、こちらで勝手にそろえるようにした（vnSelfHeal_）
 *     ★「入れ替えたあと、一度そうさボタンを押してください」とお願いしていたが、
 *       忘れたときに黙って動かなくなる。お願いするほうが間違っていた。
 *       15分おきのこの見張りから、1日1回だけ点検して、自分で作る。
 *       レポートの確認用（毎月16日 AM3:00）も、これで勝手に入る
 *
 *  [V019ver]
 *   ・読み取り台帳を作った（「読み取り確認」とまーく個人LINEから打つ）
 *     ★「今日のぶんが出た／出ない」だけでは、そもそも読めているのか
 *       分からない、というご指摘に対するもの。
 *     ・ホームページ … 先の日付まで並べて「何日ぶん拾えたか」を会場ごとに出す
 *       （既定14日。「読み取り確認30」のように日数を付けられる。最大31日）
 *       ページは会場ごとに1回だけ読む（何度も叩かないため）
 *     ・写真から読んだぶん（フェス・帝国・リーガ）… しまってある全部を出す。
 *       何か月先のものでも、送ってもらっていれば全部出る
 *     記録用スプシに「🗓️イベント台帳」タブを作って、日付・会場・名前・
 *     開演・終演・どこから読んだか を書く。スマホでそのまま見ていける
 *   ・⚠️ が出た会場は「催しが無い」か「読めていない」かのどちらか、と明記した
 *     公式に催しが出ているのに ⚠️ なら、読み取りが効いていないと分かる
 *   ・同じページを何度も読まずに、何日ぶんも調べられるようにした
 *
 *  [V018ver]
 *   ・確認用のいちばん下に「この内容でよろしいですか」＋【はい】【いいえ】を付けた
 *     【はい】… そのまま17:00にグループへ
 *     【いいえ】… 直し方の手順をお送りし、返信をいただいたら作り直して送り直す
 *     ★何も押されなくても、17:00にはいちばん新しい内容のまま送る
 *       （寝ていて見られないこともある。止めるより出すほうがよい）
 *   ・イベント通知は「その日に出せるものがある日だけ」。毎日は送らない
 *     （出せるものが1件も無ければ、確認用も本番も1通も送らない）
 *   ・注釈を必ず入れた（VN_DISCLAIMER）
 *     AIが自動で読み取ったものであること、読み取り違いや予定変更（時刻の
 *     前後・延長・中止）があること、動く前に公式ページで確かめること。
 *     この案内を見て実際に会場へ向かう人がいる。黙っているのは危ない。
 *     長さを詰めるときも、注釈だけは絶対に削らない
 *   ・まーくさんの個人LINEから、その場でグループへ出せるようにした
 *     「グループへ送信」→ 聞き返す →「はい」の2段階。何回もグループで
 *     試さずに済むように。送ったら、17:00には二度送らない
 *   ・「イベント一覧」と打つと、その日の一覧を返すようにした（だれでも・いつでも）
 *     16:30／17:00 を見のがしても、あとから引ける
 *   ・送ってもらった資料の写真を、あとから見られるようにした（vnDocSave_）
 *     案内の枠を押すと、その紙（PDF）が開く。AIの読み違いを目で確かめられる。
 *     ※リンクを知っていれば誰でも見られる形で置きます。社外に出せない資料の
 *       ときは、設定タブ「資料の写真をリンクで見せる」を「いいえ」に
 *   ・ホテルニューオータニ大阪を足した
 *     一覧のページに時刻が無いので、催しのページまで開いて時刻を探す
 *     （同じ入れ物の中だけ・多くても5ページ・時刻が無ければ出さない）
 *   ・「省きました」の断り書きも長さに数えるようにした
 *     数えていなかったので、その一文を足したぶんだけ上限を超えていた
 *
 *  [V017ver]
 *   ・★時刻が読めないものを、二度と出さないようにした（vnHasTime_）
 *     その日に何もやっていない会場（長居・万博）が「時間不明」で
 *     グループに出てしまった。読む人は「今日そこで何かある」と受け取る。
 *     向かえば空振りになる。分からないものを出すのは、間違いを出すのと同じ。
 *     ページの「9月16日」は、更新日や月間カレンダーのマス目としても出てくる。
 *     それを催しの行だと思い込んでいたのが原因だった
 *   ・長居の読み先を、日付だけのまとめサイトから スポカレ へ変えた
 *   ・万博記念公園は、いったん読みに行かないようにした
 *     （会場の情報そのものは消していないので、1行戻せば復活する）
 *   ・16:30 に まーくさんだけへ「確認用」を送るようにした（番号つき）
 *     ①②③… の番号を振り、「①削除」「①③削除」「①修正：〜」で手直しできる。
 *     手直しした結果が 17:00 にグループへ出る。
 *     確認用が出ていない日は、グループへは絶対に送らない
 *     （人の目を通していないものを、みんなに流さないため）
 *   ・確認用には、返し方の説明を必ず付けた（本番には付けない）
 *   ・会場の「月間 公演スケジュール表」を写真から読めるようにした
 *     （↓会場／↓ホール／↓フェス。フェスティバルホールを会場に追加）
 *     フェスティバルホールの月間表が読めなかったのは、字のせいではない。
 *     ホテル用の指示文に「宴会・催事でないものは含めない」と書いてあり、
 *     AIは正直に「1件もありません」と答えていた。資料の種類が違えば、
 *     読ませ方も分けなければいけなかった
 *   ・種類を間違えて送ったときの言い直しを足した（「訂正：会場」「訂正：ホテル」）
 *     写真は送り直さなくてよい（直前の1枚を1時間おぼえている）
 *   ・読めなかったときの返事に、直し方を書くようにした
 *     「読めません」だけでは、なぜ読めないのかが分からなかった
 *
 *  [V016ver]
 *   ・グループの宛先も、形を確かめてから使うようにした
 *     見出しが混ざったままLINEに渡すと、理由の分からない400になるため
 *
 *  [V015ver]
 *   ・イベントの絵にも、送る前の掃除（lrClean_）をかけた
 *     レポートで、中身が空の span のせいで1通も届かない事故があったため
 *
 *  [V014ver]
 *   ・LINEの返事を、叫ぶ系のデスノートネタにそろえた
 *     ノートに書きました。あと〇分…／くそっ!!!!やられた!!!!／
 *     わ…私は仰せの通りに…／だ…ダメだ…／早くなんとかしないと…
 *
 *  [V013ver]
 *   ・LINEの返事に、デスノートのネタを散らした（短いまま）
 *     ★命令口調にしない。ネタを知らない人が読んでも、
 *       ただの丁寧な返事として通じる言い回しだけにする
 *
 *  [V012ver]
 *   ・LINEの返事を、ぜんぶ短くしてジェバンニ調にそろえた
 *
 *  [V011ver]
 *   ・公式アカウントからの返事を減らした
 *     ここは雑談のグループなので、合図のたびに口を出すと邪魔になる。
 *     「↓ホテル」などの合図には、もう何も返さない（黙って待つ）
 *   ・読み取れたときの返事を3行にした
 *     「以下のイベント情報をジェバンニが〇秒で確認しました／件数：〇件／場所：〇〇」
 *   ・読み取れなかったときの返事も1行にした
 *
 *  [V010ver]
 *   ・説明タブへの書き読みを I列 に合わせた
 *
 *  [V009ver]
 *   ・イベントの見張りを 5分おき → 15分おき にした
 *     5分おきだと1日に288回も動く。Googleが1日にくれる「決められた時間」は
 *     決まっていて、1分おきのボタンの見張りと合わせると使い切ってしまい、
 *     見張りごと止まる（実際に止まった）。
 *     確認用は 16:30〜、グループは 17:00〜17:15 ごろ、お知らせは予定時刻から15分以内になる
 *
 *  [V008ver]
 *   ・イベントの枠そのものを、公式ページへのボタンにした
 *     下にリンクを別に並べるのはやめた。どのリンクがどの催しのものかを
 *     目で探させることになるうえ、場所も文字数も食っていた。
 *     枠の中に「👆 この枠を押すと「〇〇」の公式ページが開きます」と書いて、
 *     押せることが必ず分かるようにしてある
 *   ・URLの無い催し（ホテルの資料など）には、案内も行き先も付けない
 *     押しても何も起きないボタンほど、たちの悪いものはないため
 *
 *  [V007ver]
 *   ・ホームページの読み取りを作った（vnScrapeAll_）
 *     「その日の日付が書いてある行を見つけて、その周りを読む」やり方にした。
 *     サイトごとに決め打ちすると、向こうの作りが変わった日から黙って
 *     何も出なくなるため。9/15・9月15日・09-15 のどれでも読む
 *     終わりの時刻が書いていなければ、会場の種類から見積もる（予想と明記）
 *   ・[13]「読み取れているものの一覧を見る」を足した
 *     何件読めたか、読んだ元の文字まで出す。外していればすぐ分かる
 *   ・事前のお知らせを3つから選べるようにした（催しごとのボタン）
 *     ⏰カレンダー … 押すと予定として登録できるリンクを返す
 *                    （Androidの標準は「Googleカレンダー」。iPhoneでも同じ）
 *     💬Discord   … みんなのDiscordへ流す
 *     📱自分のLINE … 押した人の個人LINEにだけ届く
 *     知らせるのは「終わりの◯分前」（設定「イベントのお知らせは何分前」／既定60）
 *   ・1通に入りきらないときは、催しを落とす前にボタンのほうを消すようにした
 *     ボタンを絵の中にそのまま入れると1件1,700バイトかかり、
 *     見本4件で12,358バイト（上限10,000）になって催しが1件消えていた。
 *     押されたあとにリンクを返す形にして1件450バイトに縮めた
 *
 *  [V006ver] ファイル名を 006-Events.gs → 006-Venue.gs にした
 *   ・「Events」と「Extras」は、どちらも E で始まって紛らわしかった。
 *     記号は V のままなので、これでファイル名の頭文字と記号がそろった（V=Venue）
 *   ・関数の頭も ev○○ → vn○○ に、定数も EV_ → VN_ にそろえた
 *   ・中身の動きは何も変えていない
 *   ・V005ver 以前は 006-Events.gs という名前でした（同じファイルのことです）
 *
 *  [V005ver]
 *   ・ホテルの合図を増やした。矢印のきまりは日付メモ（「↓0904」）と同じ
 *     「↓帝国」… 紙にホテル名が無い帝国ホテルの資料を、帝国ホテルとして読む
 *     「↓ホテル」「↓🏨」… 紙のタイトルからホテル名を読む
 *     「↑…」にすると、直前に送った写真を読み直す
 *   ・合図を出したうえでの写真は、読めなかったときも黙らずに伝える
 *     （合図の無い写真は、読めなければ黙る。雑談の写真に返さないため）
 *   ・公演名から「知っておくと良いこと」「触れない方が良いこと」も聞くようにした
 *     訃報・脱退・不祥事・負けた試合など、車内で触れると空気が悪くなることを
 *     赤字で出す。1通に入りきらないときも、ここだけは最後まで残す
 *
 *  [V004ver]
 *   ・リンクを「押せるボタン」にして、送るのを1通だけにした
 *     いままでは 絵1通＋URLの文字1通 の2通だった。
 *     ボタンの高さは LINE でいちばん小さい "sm"（40px前後）。
 *     これより小さくする指定は LINE に無く、あっても指で押しづらい。
 *     横に2つずつ並べて、たてに伸びないようにしてある。
 *   ・1通が10KBを超えそうなときは、細かい話 → 助言 → 件数 の順に削る
 *     （削ったことは必ず書き添える）
 *   ・公演名から、来る人の年代・男女比の「推定」をAIに聞くようにした
 *     知らない催しには「不明」と答えさせ、知ったかぶりをさせない。
 *     自社の記録（実績）とは、色も言葉も分けて出す。
 *   ・ホテルの予定表の写真を、オプチャのスクショと取り違えないようにした
 *     ①「ホテル」と打ってから写真を送る（「↑ホテル」で直前のぶんを読み直す）
 *     ② 合図が無くても、乗車記録が1件も読めなかったときだけ読み直す
 *   ・毎日16:45の自動発信を作った（はじめは切ってある。V017verで16:30確認→17:00本番に変更）
 *     その日に出すものが1件も無ければ、1通も送らない。
 *     同じ日に二度は送らない。送り先が分からなければ送らない。
 *
 *  [V003ver]
 *   ・LINEの絵（Flex Message）で出す形にした。レポートの青とは分けて紫にする
 *     裏メッセージは「🎪〇/〇(曜)イベント等情報 byシバンニ」
 *   ・URLは絵の中だけでなく、文字のメッセージでも残す
 *     絵の中のリンクは押せるが、URLの文字は見えず、長押しでコピーもできないため
 *   ・出す条件を入れた
 *     ・18:00〜翌04:00 に動きがあるものだけ（終わりの時刻を優先して見る）
 *     ・小さすぎてタクシーに響かないものは省く
 *   ・自社の記録から、その乗り場の 件数・平均・待ち・客層（男女比・年代）を出す
 *     備考に書いてある「男性40代」などを数えている。母数が少なければ出さない
 *   ・助言は、確かめようのない話を書かない作りにした
 *     終わる時刻から決まること と、自社の記録から言えることだけ
 *   ・見本を自分のLINEにだけ送れるようにした（見た目を決めてもらうため）
 *
 *  [V002ver]
 *   ・調べた結果を、まーく個人のLINEにだけ送れるようにした（テスト送信）
 *     せまいセルで読むより読みやすく、そのままコピーして渡せる
 *     グループへは送らない。送り先は「テスト送信先（自分のLINE）」
 *   ・長い文は、行の途中で切らずに分けて送る（LINEは1通5,000文字まで）
 *
 *  [V001ver]
 *   ・まずは「そのページが機械で読めるのか」を調べるところだけ作った。
 *     読み取りの中身は、この調査の結果を見てから書く。
 *
 *  ★なぜいきなり読み取りを書かないのか
 *    ホームページは、次の2種類にはっきり分かれる。
 *      ① そのまま文字が入っている  → 読める
 *      ② 開いたあとに中身を作る（JavaScript）→ 読めない
 *    Apps Script が取れるのは「開く前の生のHTML」だけなので、②は何をしても読めない。
 *    どちらなのかは、実際に取ってみないと分からない。
 *    「作ったけど動かない」を繰り返さないために、先に調べる。
 *
 * ================================================================
 */

/** このファイルのバージョン */
const VN_VERSION = "V017ver";

/**
 * 見にいく先の一覧。
 * kind … "event"（イベント）/ "barasi"（バラシ）/ "hotel"（ホテル）
 */
const VN_SOURCES = [
  { name: "大阪城ホール",         kind: "event",  url: "https://www.osaka-johall.com/event/" },
  { name: "京セラドーム",         kind: "event",  url: "https://www.kyoceradome-osaka.jp/schedule/" },
  { name: "インテックス大阪",     kind: "event",  url: "https://www.intex-osaka.com/jp/event/" },
  { name: "パナソニックスタジアム", kind: "event", url: "https://suitacityfootballstadium.jp/schedule/" },
  // ★長居は、まとめサイトから 公式に近いほう（スポカレ）へ変えた。
  //   前のところは日付だけが並んでいて、開演時刻が取れず、
  //   その日に何も無いのに「時間不明」で出てしまっていた。
  { name: "長居スタジアム",       kind: "event",  url: "https://spocale.com/places/31" },
  // ★万博記念公園は、いったん外す（まーくさんの指示）。
  //   読み先だけを外してある。会場の情報（VN_VENUES）は消していないので、
  //   戻すときは、この行を書き戻すだけでよい
  // { name: "万博記念公園",      kind: "event",  url: "https://live-events.a-jp.org/soko/plc/318.html" },
  // ★ワントゥワンは、一覧だけでは足りない。
  //   詳細に「徹夜」と書かれていることがあり、そうなると
  //   こちらの営業時間内にバラシが終わらず、待つ意味がなくなる。
  //   detail: true を付けると、必ず詳細のページまで開いて中を見る
  { name: "ワントゥワン",         kind: "barasi", detail: true,
    url: "https://onetoone-jp.com/schedule.php" },
  // ★ニューオータニは、一覧のページに時刻が載っていない。
  //   deep: true を付けると、一覧から催しのページを開いて、そこで時刻を探す。
  //   時刻が見つからなければ、その催しは出さない（時間不明では出さないため）
  { name: "ホテルニューオータニ大阪", kind: "event", deep: true,
    url: "https://www.newotani.co.jp/osaka/event/" }
];

/* ============ 会場のこと ============ */
/*
 * 会場ごとに決まっていること（入る人数・近くの乗り場）は、ここに書いておく。
 * ホームページから取れるのは「いつ・何があるか」だけなので、
 * 「どれくらいの規模か」はこちらで持っておかないと判断できない。
 */
const VN_VENUES = {
  "大阪城ホール":           { cap: 16000, near: ["森ノ宮", "京橋", "大阪城公園"], type: "ホール" },
  "京セラドーム":           { cap: 36000, near: ["ドーム前", "大正", "難波"],     type: "ドーム" },
  "インテックス大阪":       { cap: 20000, near: ["中ふ頭", "コスモスクエア"],     type: "展示場" },
  "パナソニックスタジアム": { cap: 40000, near: ["万博記念公園", "山田"],         type: "スタジアム" },
  "万博記念公園":           { cap: 30000, near: ["万博記念公園迎賓館前ロータリー", "万博記念公園"], type: "野外" },
  "長居スタジアム":         { cap: 47000, near: ["長居", "鶴ヶ丘"],               type: "スタジアム" },
  "ワントゥワン":           { cap: 0,     near: [],                               type: "バラシ" },
  "帝国ホテル":             { cap: 0,     near: ["帝国"],                         type: "ホテル" },
  "リーガロイヤルホテル":   { cap: 0,     near: ["中之島", "リーガ"],             type: "ホテル" },
  // 月間の公演スケジュール表（紙・PDFの写真）から読む会場
  "フェスティバルホール":   { cap: 2700,  near: ["渡辺橋", "肥後橋", "中之島"],   type: "ホール" },
  "ホテルニューオータニ大阪": { cap: 2000, near: ["大阪城公園", "京橋", "森ノ宮"], type: "ホテル" }
};

/** 対象にする時間帯（この中に「終わり」か「始まり」が入っていれば出す） */
const VN_FROM_HOUR = 18;   // 18:00
const VN_TO_HOUR   = 28;   // 翌04:00（24＋4）

/** これ未満の見込み人数は、タクシーの数に響かないので出さない */
const VN_MIN_PEOPLE = 300;

/*
 * 送る時刻は2段階。
 *   16:30 … まーくさんだけに「確認用」を送る（番号つき）
 *   17:00 … 確認・手直しが済んだものを、グループへ送る
 * ★グループに出ていくものを、人の目を通さずに送らない、という決まり
 */
const VN_TEST_HOUR = 16;
const VN_TEST_MIN  = 30;
const VN_SEND_HOUR = 17;
const VN_SEND_MIN  = 0;
/** 送る時刻をどれだけ過ぎたら、その日はもうあきらめるか（分） */
const VN_SEND_WINDOW = 45;

/*
 * 注釈。AIが自動で読み取ったものだと、必ず分かるようにする。
 *
 * ★この案内を見て、実際にその会場へ向かう人がいる。
 *   読み取り違いも、そのあとの予定変更（延長・中止）もある。
 *   「AIが読んだものです」「公式で確かめてください」と
 *   はっきり書いていないのは、不親切を通りこして危ない。
 */
const VN_DISCLAIMER = [
  "※注意（必ずお読みください）※",
  "AIによる自動読み取りの案内です。\n" +
  "読み取り違いや、そのあとの予定変更（時刻の前後・延長・中止）があります。\n" +
  "動く前に、必ず各会場の公式ページでお確かめください。"
];

/** Flex（絵）1通の上限。LINEの決まりは10KB。ぶつからないよう手前で止める */
const VN_FLEX_MAX = 9500;

/* ============ 出すかどうかの判断 ============ */

/** "21:30" → 21.5。翌日にまたぐものは 24 を足す（"01:00" → 25） */
function vnHourOf_(hhmm) {
  const m = String(hhmm || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
  if (h < 12) h += 24;          // 0〜11時は「翌日」とみなす
  return h;
}

/**
 * 時刻がひとつでも取れているか。
 *
 * ★ここが、いちばん大事な関所。
 *   前は、時刻が分からないものを「時間不明」として残していた。
 *   その結果、その日に何もやっていない会場（長居・万博）が
 *   「時間不明」でグループに出てしまった。
 *   読む人は「今日そこで何かある」と受け取る。そこへ向かえば空振りになる。
 *   分からないものを出すのは、間違いを出すのと同じ。だから出さない。
 */
function vnHasTime_(ev) {
  return vnHourOf_(ev && ev.start) !== null || vnHourOf_(ev && ev.end) !== null;
}

/**
 * 18:00〜翌04:00 にかかるか。
 * 終わりの時刻を優先して見る（タクシーが動くのは終演のとき）。
 *
 * ★時刻が分からないものは、ここで落とす（前は残していた。上の vnHasTime_ 参照）。
 */
function vnInTimeRange_(ev) {
  const end = vnHourOf_(ev.end);
  const start = vnHourOf_(ev.start);
  if (end === null && start === null) return false;       // 時刻が無いものは出さない
  const h = (end !== null) ? end : start;
  return h >= VN_FROM_HOUR && h <= VN_TO_HOUR;
}

/**
 * タクシーの数に響く規模かどうか。
 * 人数が分かればそれで、分からなければ会場の大きさで見る。
 */
function vnBigEnough_(ev) {
  if (ev.people > 0) return ev.people >= VN_MIN_PEOPLE;
  const v = VN_VENUES[ev.venue];
  if (v && v.type === "ホテル") return true;               // 宴会は人数が書いてある前提
  if (v && v.cap >= 3000) return true;                     // 大きな会場は、まず響く
  return true;                                             // 分からないものは消さない
}

/* ============ 自社の記録から言えること ============ */

/**
 * その乗り場について、自社の記録から分かることを集める。
 *
 * ★ここが「説得力のあるアドバイス」のもと。
 *   よそから持ってきた一般論ではなく、自分たちが実際に稼いだ数字だけを使う。
 *   記録が無ければ「記録なし」と正直に言う（それらしい作り話はしない）。
 */
function vnPlaceStats_(names, fromHour, toHour) {
  const out = { count: 0, sales: 0, waitSum: 0, waitCount: 0, max: 0,
                male: 0, female: 0, ages: {}, place: "" };
  let ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return out; }
  if (!ss || !names || !names.length) return out;

  const want = names.map(function (n) { return String(n).replace(/[\s　]/g, ""); });
  const tabs = (typeof PERSONAL_TABS !== "undefined") ? PERSONAL_TABS : [];

  tabs.forEach(function (tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() < 4) return;
    const n = sh.getLastRow() - 3;
    const vals = sh.getRange(4, 1, n, 11).getValues();
    const disp = sh.getRange(4, 1, n, 11).getDisplayValues();

    for (let r = 0; r < n; r++) {
      const place = String(vals[r][6] || "").replace(/[\s　\n]/g, "");
      if (!place) continue;
      let hit = false;
      for (let i = 0; i < want.length; i++) {
        if (place.indexOf(want[i]) !== -1) { hit = true; if (!out.place) out.place = want[i]; break; }
      }
      if (!hit) continue;

      // 時間帯でしぼる（終演まわりの時間だけ見たいとき）
      if (fromHour != null) {
        const h = vnHourOf_(String(disp[r][4] || ""));
        if (h === null || h < fromHour || h > toHour) continue;
      }

      const price = parseInt(String(vals[r][5]).replace(/[^0-9]/g, ""), 10);
      if (isNaN(price) || price <= 0) continue;
      out.count++; out.sales += price;
      if (price > out.max) out.max = price;
      const w = parseInt(String(vals[r][3]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(w) && w > 0) { out.waitSum += w; out.waitCount++; }

      // 備考に書いてある「男性40代」などを数える
      const memo = String(vals[r][7] || "") + " " + String(vals[r][8] || "");
      if (/男性|男の/.test(memo)) out.male++;
      if (/女性|女の/.test(memo)) out.female++;
      const age = memo.match(/(\d0)\s*代/);
      if (age) out.ages[age[1] + "代"] = (out.ages[age[1] + "代"] || 0) + 1;
    }
  });
  return out;
}

/** 集めた記録を、読める1〜2行にする。記録が無ければ "" */
function vnStatsLine_(st) {
  if (!st || st.count === 0) return "";
  const avg = Math.round(st.sales / st.count);
  let t = `自社の記録：${st.count}件 平均￥${avg.toLocaleString()}`;
  if (st.max > avg) t += ` 最高￥${st.max.toLocaleString()}`;
  if (st.waitCount > 0) t += ` 待ち${Math.round(st.waitSum / st.waitCount)}分`;

  // 客層。備考に書いてあるぶんだけ数えたものなので、母数も一緒に出す
  const sex = st.male + st.female;
  const parts = [];
  if (sex >= 3) {
    parts.push(`男${Math.round(st.male / sex * 100)}% 女${Math.round(st.female / sex * 100)}%`);
  }
  const ageKeys = Object.keys(st.ages).sort(function (a, b) { return st.ages[b] - st.ages[a]; });
  if (ageKeys.length) {
    const total = ageKeys.reduce(function (a, k) { return a + st.ages[k]; }, 0);
    if (total >= 3) parts.push(ageKeys.slice(0, 2).map(function (k) {
      return k + " " + Math.round(st.ages[k] / total * 100) + "%";
    }).join(" / "));
  }
  if (parts.length) t += `\n客層（備考に書いてあるぶん）：${parts.join("・")}`;
  return t;
}

/* ============ 調べる ============ */

/**
 * それぞれのページを実際に取ってきて、機械で読めるかどうかを見る。
 *
 * 見るところ：
 *   ・ちゃんと返ってくるか（HTTPの番号）
 *   ・中身の大きさ
 *   ・今日・明日の日付が、生のHTMLの中に文字として入っているか
 *     → 入っていれば ① 読める。入っていなければ ② JavaScript で作っている疑い
 *   ・Googleカレンダーを埋め込んでいないか
 *     → 埋め込んでいれば、HTMLを解析するより、カレンダーを直接読むほうが確実
 */
function vnProbeAll() {
  const now = new Date();
  const out = [];
  out.push("🔎 イベント情報のページを調べました（" + vnDateLabel_(now) + "）");
  out.push("");

  VN_SOURCES.forEach(function (src) {
    if (typeof updBeat_ === "function") updBeat_("調査 " + src.name);
    out.push("■ " + src.name + "（" + src.kind + "）");
    const r = vnProbeOne_(src, now);
    r.forEach(function (line) { out.push("　" + line); });
    out.push("");
  });

  out.push("■ 帝国ホテル / リーガロイヤルホテル");
  out.push("　ホームページに出ていない紙の資料なので、取りにいく先がありません。");
  out.push("　写真をLINEに送って読み取る形にするのが現実的です（後述）。");

  return out.join("\n");
}

/** 1つぶんを調べる。戻り値は行の配列 */
function vnProbeOne_(src, now) {
  const L = [];
  let res;
  try {
    res = UrlFetchApp.fetch(src.url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TaxiReport/1.0)" }
    });
  } catch (e) {
    L.push("❌ つながりませんでした：" + (e && e.message ? e.message : e));
    return L;
  }

  const code = res.getResponseCode();
  let html = "";
  try { html = res.getContentText(); } catch (e) {
    try { html = res.getContentText("Shift_JIS"); } catch (e2) { html = ""; }
  }
  L.push("返事：" + code + " ／ 大きさ：" + Math.round(html.length / 1024) + "KB");
  if (code !== 200 || !html) { L.push("❌ 中身が取れませんでした"); return L; }

  // 文字化けしていないか（日本語がまったく無ければ、文字の種類が違う）
  if (!/[ぁ-んァ-ン一-龥]/.test(html)) {
    L.push("⚠️ 日本語が見当たりません（文字の種類が違うかもしれません）");
  }

  // Googleカレンダーを埋め込んでいるか
  if (/calendar\.google\.com/.test(html)) {
    const m = html.match(/calendar\.google\.com\/calendar\/[^"'\s]*/);
    L.push("📅 Googleカレンダーを使っています → こちらを直接読むのが確実");
    if (m) L.push("　" + m[0].slice(0, 120));
  }

  // 今日・明日・今月の日付が、文字として入っているか
  const hits = [];
  [0, 1, 2].forEach(function (d) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    vnDatePatterns_(t).forEach(function (p) {
      if (html.indexOf(p) !== -1 && hits.indexOf(p) === -1) hits.push(p);
    });
  });
  if (hits.length) {
    L.push("✅ 日付が文字として入っています（" + hits.slice(0, 5).join("・") + "）");
    L.push("　→ 読み取りを作れます");
  } else {
    L.push("⚠️ 今日・明日の日付が見当たりません");
    // JavaScript で作っている疑いがあるか
    const scripts = (html.match(/<script/gi) || []).length;
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    L.push("　文字の量：" + text.length + "文字 ／ script の数：" + scripts);
    if (text.length < 500) L.push("　→ 開いたあとに中身を作る作り（JavaScript）の可能性が高いです");
    else L.push("　→ 中身はありますが、日付の書き方が違うのかもしれません");
    L.push("　見えている文字の先頭：" + text.slice(0, 80));
  }
  return L;
}

/** その日を表す、ありがちな書き方をならべる */
function vnDatePatterns_(d) {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const p2 = function (n) { return ("0" + n).slice(-2); };
  return [
    y + "-" + p2(m) + "-" + p2(day),
    y + "/" + p2(m) + "/" + p2(day),
    y + "/" + m + "/" + day,
    y + "年" + m + "月" + day + "日",
    m + "月" + day + "日",
    p2(m) + "/" + p2(day),
    m + "/" + day
  ];
}

/** 「9/15(月)」の形 */
function vnDateLabel_(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return (d.getMonth() + 1) + "/" + d.getDate() + "(" + w[d.getDay()] + ")";
}

/* ============ LINEの絵（Flex Message） ============ */
/*
 * ★レポートとは色を変える。
 *   毎月のレポート＝青、こちらのイベント＝紫。
 *   同じ色だと、トークをさかのぼったときにどちらか分からなくなる。
 *
 * ★リンクの出し方について
 *   Flex の中では、押すと開く形にはできるが、URLの文字そのものは見えないし、
 *   長押しでコピーもできない。
 *   あとから見返して人に渡したいので、絵のあとに URL だけのテキストも1通送る。
 *   （1回の送信でまとめて届くので、通知は1回）
 */

const VN_COLOR_HEAD = "#6a1b9a";   // 紫（レポートの青 #1155ca と分ける）
const VN_COLOR_SUB  = "#7b1fa2";
const VN_COLOR_TEXT = "#4a148c";

/** 「9/16(水)」 */
function vnDayLabel_(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return (d.getMonth() + 1) + "/" + d.getDate() + "(" + w[d.getDay()] + ")";
}

/** 裏メッセージ（通知やトーク一覧に出る文字） */
function vnAltText_(d) {
  return "🎪" + vnDayLabel_(d) + "イベント等情報 byシバンニ";
}

/** 1件ぶんの箱 */
function vnCard_(ev, idx, day, noBells) {
  const v = VN_VENUES[ev.venue] || {};
  const rows = [];

  // 1行目：会場と時間
  // ★「時間不明」とは、もう書かない。
  //   時刻の取れないものは、ここへ来る前に落としてある（vnHasTime_）。
  //   もし万が一きても、時刻のところは空にして、うその時間を見せない
  // ★「終了」とは書かない。催しの終わりは ほぼ必ず前後するので、
  //   言い切ると、それを信じて動いた人が損をする。必ず「終了予定」と書く
  const when = ev.start && ev.end ? `${ev.start}〜${ev.end}予定`
             : ev.end   ? `${ev.end} 終了予定`
             : ev.start ? `${ev.start} 開始`
             : "";
  const head1 = [];
  // 確認用のときだけ、頭に ①②… の番号を付ける。
  // この番号で「①削除」「①修正：〜」と言えるようにするため
  if (ev.no) head1.push({ "type": "span", "text": vnNoMark_(ev.no) + " ", "weight": "bold", "color": "#e65100" });
  head1.push({ "type": "span", "text": (ev.icon || "📍") + " " + ev.venue, "weight": "bold", "color": VN_COLOR_TEXT });
  if (when) head1.push({ "type": "span", "text": "　" + when, "weight": "bold", "color": "#b71c1c" });
  rows.push({ "type": "text", "size": "sm", "wrap": true, "contents": head1 });
  // ★見出しのすぐ下に置く。
  //   前は枠のいちばん下に「この枠を押すと〇〇の公式ページが開きます」と
  //   書いていたが、下にボタンが並んでいるので、どれの話か紛らわしかった。
  //   見出しの真下なら、この枠のことだと ひと目で分かる
  if (ev.url) {
    rows.push({ "type": "text", "text": "👆 詳細はクリック（該当ページに移ります）",
                "size": "xxs", "color": VN_COLOR_HEAD, "weight": "bold", "margin": "xs", "wrap": true });
  }
  // 手直し（「①修正：〜」で書き足したこと）は、いちばん目立つところに出す
  if (ev.note) {
    rows.push({ "type": "text", "text": "✏️ " + ev.note, "size": "xs", "weight": "bold",
                "color": "#e65100", "wrap": true, "margin": "xs" });
  }

  // 2行目：何があるか・規模
  const size = [];
  if (ev.people > 0) size.push(ev.people.toLocaleString() + "人");
  else if (v.cap > 0) size.push("最大" + v.cap.toLocaleString() + "人の会場");
  const what = [ev.title].concat(size).filter(String).join("／");
  if (what) rows.push({ "type": "text", "text": what, "size": "xs", "color": "#333333", "wrap": true, "margin": "xs" });

  // 3行目：自社の記録から言えること（これは「実績」。確かな数字）
  if (ev.stats) rows.push({ "type": "text", "text": ev.stats, "size": "xxs", "color": "#5f6368", "wrap": true, "margin": "xs" });

  // 4行目：客層の見当（これは「推定」。当たり外れがあるので、実績とは色も言葉も分ける）
  if (ev.guess) rows.push({ "type": "text", "text": "👥 推定：" + ev.guess, "size": "xxs", "color": "#8d6e63", "wrap": true, "margin": "xs" });

  // 5行目：知っておくと話が弾むこと
  if (ev.know) rows.push({ "type": "text", "text": "💬 話題：" + ev.know, "size": "xxs", "color": "#00695c", "wrap": true, "margin": "xs" });

  // 気をつけること（徹夜など）。いちばん目立つところに、赤の太字で
  if (ev.warn) {
    rows.push({ "type": "text", "text": ev.warn, "size": "xs", "color": "#c62828",
                "weight": "bold", "wrap": true, "margin": "xs" });
  }

  // 6行目：触れない方がよいこと（ここは赤。ひと目で分かるように）
  if (ev.avoid) rows.push({ "type": "text", "text": "🚫 触れない：" + ev.avoid, "size": "xxs", "color": "#c62828", "wrap": true, "margin": "xs", "weight": "bold" });

  // 5行目：この1件についての助言
  if (ev.advice) rows.push({ "type": "text", "text": "▶ " + ev.advice, "size": "xs", "color": "#1b5e20", "wrap": true, "margin": "sm", "weight": "bold" });

  const box = { "type": "box", "layout": "vertical", "backgroundColor": "#f6f1f9",
                "paddingAll": "10px", "cornerRadius": "md", "margin": "sm", "contents": rows };
  // お知らせの受け取り方を3つならべる（時間が分かっている催しだけ）
  if (day && !noBells && (ev.start || ev.end) && ev.kind !== "barasi") {
    rows.push(vnBellRow_(ev, idx, day));
  }
  // ★この枠そのものがボタン。押すと、その催しの公式ページが開く。
  //   下にリンクのボタンを別に並べるのはやめた。
  //   「どのリンクがどの催しのものか」を目で探させることになるうえ、
  //   場所も文字数も食う。催しの枠を押せば、その催しのページへ行くのが素直。
  //   押せることが分からないと意味がないので、必ず案内を出す。
  if (ev.url) box.action = { "type": "uri", "label": vnBtnLabel_(ev.venue), "uri": ev.url };
  return box;
}


/* ============ ボタンの文字 ============ */

/** ボタンや行き先の名前。長い会場名は入りきらないので詰める */
function vnBtnLabel_(name) {
  const t = String(name || "").replace(/[\s\u3000]/g, "");
  return t.length > 9 ? t.slice(0, 8) + "…" : (t || "ページ");
}

/**
 * イベントのお知らせを組み立てる。
 * 戻り値は LINE に渡すメッセージの配列（絵＋URLのテキスト）。
 */
function vnBuildMessages_(day, events, note, noBells) {
  const alt = vnAltText_(day);
  const contents = [];

  contents.push({ "type": "box", "layout": "vertical", "backgroundColor": "#f3e5f5",
    "paddingAll": "10px", "cornerRadius": "md", "contents": [
      { "type": "text", "text": "対象は 18:00〜翌04:00 に動きがあるものだけです", "size": "xxs", "color": "#6a1b9a", "wrap": true },
      { "type": "text", "text": "小さすぎてタクシーに響かないものは省いています", "size": "xxs", "color": "#6a1b9a", "wrap": true, "margin": "xs" },
      { "type": "text", "text": "👆 各イベントの枠を押すと、その公式ページが開きます", "size": "xxs", "color": "#6a1b9a", "wrap": true, "margin": "xs", "weight": "bold" }
    ]});

  const kinds = [["event", "🎤 イベント"], ["barasi", "🔧 バラシ（搬出）"], ["hotel", "🍽 ホテル宴会"]];
  let shown = 0;
  kinds.forEach(function (k) {
    const list = (events || []).filter(function (e) { return (e.kind || "event") === k[0]; });
    if (!list.length) return;
    contents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": k[1], "weight": "bold", "size": "sm", "color": VN_COLOR_SUB, "margin": "md" });
    list.forEach(function (e) {
      contents.push(vnCard_(e, (events || []).indexOf(e), day, noBells));
      shown++;
    });
  });

  if (!shown) {
    contents.push({ "type": "text", "text": "この日に、18:00〜翌04:00 で拾えるイベントは見つかりませんでした。",
      "size": "sm", "color": "#666666", "wrap": true, "margin": "lg" });
  }
  if (note) {
    contents.push({ "type": "separator", "margin": "lg" },
      { "type": "text", "text": note, "size": "xxs", "color": "#b71c1c", "wrap": true, "margin": "md" });
  }

  // ★注釈は必ず最後に入れる。削る対象にもしない（危ないので）
  contents.push({ "type": "separator", "margin": "lg" },
    { "type": "box", "layout": "vertical", "backgroundColor": "#fbf7fd",
      "paddingAll": "8px", "cornerRadius": "md", "margin": "md", "contents": [
        { "type": "text", "text": VN_DISCLAIMER[0], "size": "xxs", "weight": "bold", "color": "#6a1b9a", "wrap": true },
        { "type": "text", "text": VN_DISCLAIMER[1], "size": "xxs", "color": "#7b5e8a", "wrap": true, "margin": "xs" }
      ]});

  // ★送る前に、中身が空のところを取りのぞく。
  //   LINEは text が空の span／text、contents が空の box を受け付けない。
  //   1つでも混じっていると 400 で、その通がまるごと届かない
  const body = (typeof lrClean_ === "function") ? lrClean_(contents) : contents;

  const bubble = {
    "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": VN_COLOR_HEAD, "paddingAll": "15px",
      "contents": [ { "type": "text", "text": "🎪 " + vnDayLabel_(day) + " イベント等情報",
        "weight": "bold", "color": "#ffffff", "size": "md", "wrap": true } ] },
    "body": { "type": "box", "layout": "vertical", "paddingAll": "12px", "spacing": "none", "contents": body }
  };

  return [{ type: "flex", altText: alt, contents: bubble }];
}


/**
 * 1通に収まるかを見て、入らなければ細かい話から削る。
 *
 * ★LINEの絵（Flex）は1通10KBまで。文字数ではなくバイト数で数える。
 *   ここを見誤ると「Too large flex message」で1通も届かない。
 *   削る順は、細かい話 → 助言 → 件数。いちばん大事な
 *   「どこで・何時に終わるか」は最後まで残す。
 */
function vnFitMessages_(day, events, note, reserve) {
  // ★あとから足すもの（確認用の「よろしいですか」など）のぶんを、先に空けておく。
  //   足したあとで上限を超えては、元も子もない
  const LIMIT = VN_FLEX_MAX - (Number(reserve) || 0);
  const size = function (msg) {
    const json = JSON.stringify(msg);
    try { if (typeof lrBytes_ === "function") return lrBytes_(json); } catch (e) {}
    return json.length * 3;                       // 逃げ道（多めに見積もる）
  };
  const copy = function (list, drop) {
    return list.map(function (e) {
      const c = {};
      for (const k in e) c[k] = e[k];
      drop.forEach(function (k) { c[k] = ""; });
      return c;
    });
  };

  let evs = (events || []).slice();
  let bells = false;                    // お知らせボタンを消したか

  let msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= LIMIT) return msgs;

  // ① 客層の行（実績・推定）と話題を落とす。
  //    「触れない方がよいこと」だけは、トラブルに直結するので最後まで残す
  evs = copy(evs, ["stats", "guess", "know"]);
  msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= LIMIT) return msgs;

  // ② お知らせボタンを消す。
  //    ★催しを1件まるごと落とすくらいなら、ボタンのほうを先に消す。
  //      「あることを知らせる」のが本題で、ボタンはその次だから。
  bells = true;
  msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= LIMIT) return msgs;

  // ③ 助言も落とす
  evs = copy(evs, ["advice"]);
  msgs = vnBuildMessages_(day, evs, note, bells);
  if (size(msgs[0]) <= LIMIT) return msgs;

  // ④ それでも入らなければ件数を減らし、減らしたことを必ず書き添える
  // ★「省きました」の断り書きも、長さに数える。
  //   前は数えずに詰めていたので、最後にその一文を足したぶんだけ上限を超えていた
  const willAdd = "※ 長くなりすぎるため、ほかに99件を省きました。";
  while (evs.length > 1 &&
         size(vnBuildMessages_(day, evs, (note ? note + " " : "") + willAdd, bells)[0]) > LIMIT) evs.pop();
  const cut = evs.length < events.length ? (events.length - evs.length) : 0;
  const add = cut ? "※ 長くなりすぎるため、ほかに" + cut + "件を省きました。" : "";
  return vnBuildMessages_(day, evs, (note ? note + " " : "") + add, bells);
}

/* ============ LINEに送る ============ */
/*
 * ★ここは必ず「自分だけ」から始める。
 *   グループに一度送ったものは取り消せない。
 *   まだ読み取りが完成していないうちに、みんなに変なものが飛ぶのがいちばん困る。
 *   グループへ送るのは、レポートと同じく「もう一度チェック」で確かめてからにする。
 */

/** テストの宛先（まーく個人のLINE） */
function vnTestTarget_() {
  // レポート側と同じ決まりを使う（設定タブ「テスト送信先（自分のLINE）」→ 登録済みの「ﾏｰｸ」）
  if (typeof rpTestTarget_ === "function") {
    const v = rpTestTarget_();
    if (v) return v;
  }
  try {
    for (const id in SENDER_MAP) { if (SENDER_MAP[id] === "ﾏｰｸ") return id; }
  } catch (e) {}
  return "";
}

/** グループの宛先 */
function vnGroupTarget_() {
  if (typeof rpGroupTarget_ === "function") return rpGroupTarget_();
  try {
    const v = (typeof infoGet_ === "function") ? infoGet_(INFO_ROW.GROUP) : "";
    return (typeof isLineTarget_ === "function") ? isLineTarget_(v) : v;
  } catch (e) { return ""; }
}

/**
 * 長い文を、LINEが受け取れる長さに分ける。
 * 1通5,000文字まで。行の途中では切らない（読めなくなるため）。
 */
function vnSplitText_(text, max) {
  const limit = max || 4500;
  const out = [];
  let cur = "";
  String(text).split("\n").forEach(function (line) {
    // 1行だけで長すぎるときは、そこだけ仕方なく切る。
    // このあと改行を1文字足すので、その1文字ぶんを残しておく
    while (line.length > limit - 1) {
      if (cur) { out.push(cur); cur = ""; }
      out.push(line.slice(0, limit - 1));
      line = line.slice(limit - 1);
    }
    if ((cur + line + "\n").length > limit) { out.push(cur); cur = ""; }
    cur += line + "\n";
  });
  if (cur.trim()) out.push(cur);
  return out.length ? out : [""];
}

/**
 * 文字をLINEに送る。where は "test"（自分だけ）か "group"（みんな）。
 * 送れたら ""、送れなければ理由を返す。
 */
function vnSend_(text, where) {
  const to = (where === "group") ? vnGroupTarget_() : vnTestTarget_();
  if (!to) {
    return where === "group"
      ? "グループの送り先が分かりません（グループLINEに何か1つ投稿すると覚えます）"
      : "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  }
  const parts = vnSplitText_(text);
  // 1回の送信でならべられるのは5通まで
  const messages = parts.slice(0, 5).map(function (t, i) {
    return { type: "text", text: (parts.length > 1 ? "（" + (i + 1) + "/" + Math.min(parts.length, 5) + "）\n" : "") + t };
  });
  try {
    if (typeof lrPush_ === "function") { lrPush_(to, messages); return ""; }
    // 003-LineReport が古いときの逃げ道
    const token = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
    if (!token) return "LINEトークンが未設定です";
    const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post", muteHttpExceptions: true,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      payload: JSON.stringify({ to: to, messages: messages })
    });
    const code = res.getResponseCode();
    return (code >= 200 && code < 300) ? "" : "LINEに送れませんでした（" + code + "）";
  } catch (e) {
    return "LINEに送れませんでした（" + (e && e.message ? e.message : e) + "）";
  }
}

/**
 * 見本のイベントを作る。
 *
 * 読み取りがまだできていないので、まずは「どんな見た目で届くか」を
 * 決めてもらうための見本。数字は自社の記録から引いてくるので、
 * 客層や平均は本物（記録が無ければ「記録なし」と出る）。
 */
function vnSampleEvents_() {
  const mk = function (venue, kind, icon, title, start, end, people, url, guess, know, avoid) {
    const v = VN_VENUES[venue] || {};
    const st = vnPlaceStats_(v.near, VN_FROM_HOUR, VN_TO_HOUR);
    const line = vnStatsLine_(st);
    return { venue: venue, kind: kind, icon: icon, title: title, start: start, end: end,
             people: people, url: url,
             stats: line || "自社の記録：この乗り場の記録はまだありません",
             guess: guess || "", know: know || "", avoid: avoid || "",
             advice: vnAdvice_(venue, end, st) };
  };
  return [
    mk("京セラドーム", "event", "🏟", "コンサート", "18:00", "21:00", 0,
       "https://www.kyoceradome-osaka.jp/schedule/", "20〜30代女性が中心。男女比おおよそ2:8（見本）",
       "デビュー20周年の記念公演。初日です（見本）",
       "昨年脱退したメンバーの話（見本）"),
    mk("大阪城ホール", "event", "🎤", "コンサート", "18:30", "20:45", 0,
       "https://www.osaka-johall.com/event/", "30〜40代が中心。男女ほぼ半々（見本）",
       "大阪公演は3年ぶり（見本）", ""),
    mk("ワントゥワン", "barasi", "🔧", "搬出（バラシ）", "22:00", "", 0,
       "https://onetoone-jp.com/schedule.php", ""),
    mk("リーガロイヤルホテル", "hotel", "🍽", "就任披露・周年記念", "", "21:00", 300, "", "")
  ];
}

/**
 * その1件についての助言。
 *
 * ★ここは、根拠のあることしか書かない。
 *   「若い女性が多いので…」のような、確かめようのない話は書かない。
 *   書くのは、終わる時刻から決まること と、自社の記録から言えることだけ。
 */
function vnAdvice_(venue, end, st) {
  const v = VN_VENUES[venue] || {};
  const L = [];
  const h = vnHourOf_(end);
  if (h !== null) {
    const m = Math.floor((h - 0.5) % 24), mm = Math.round(((h - 0.5) % 1) * 60);
    L.push(("0" + m).slice(-2) + ":" + ("0" + mm).slice(-2) + "ごろから動きはじめます");
  }
  if (v.near && v.near.length) L.push("近いのは " + v.near.join("・"));
  if (st && st.count >= 3) {
    const avg = Math.round(st.sales / st.count);
    if (st.waitCount > 0) {
      const w = Math.round(st.waitSum / st.waitCount);
      L.push(`この乗り場は普段 待ち${w}分・平均￥${avg.toLocaleString()}。1時間待ちに直すと￥${Math.round(avg / w * 60).toLocaleString()}のペース`);
    } else {
      L.push(`この乗り場は普段 平均￥${avg.toLocaleString()}`);
    }
  } else {
    L.push("この乗り場の記録がまだ少ないので、実績からの判断はできません");
  }
  return L.join("。");
}

/** 見本を、自分のLINEにだけ送る（見た目を決めてもらうため） */
function vnSendSampleToMe() {
  const day = new Date();
  const events = vnSampleEvents_();
  const note = "※ これは見た目を決めるための見本です。「推定」の行は見本用の文です。" +
    "ページの読み取りはこれから作ります（[9] の調査結果を見てから）。";
  vnDaySave_(day, events);
  const msgs = vnFitMessages_(day, events, note);
  const to = vnTestTarget_();
  if (!to) return "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  try {
    if (typeof lrPush_ === "function") lrPush_(to, msgs);
    else return "003-LineReport が古いので送れません";
    return "";
  } catch (e) { return (e && e.message ? e.message : String(e)); }
}

/**
 * 調べた結果を、自分のLINEにだけ送る。
 * スプレッドシートのせまいセルで読むより、LINEのほうが読みやすく、
 * そのままコピーして人に渡せる。
 */
function vnProbeSendToMe() {
  const text = vnProbeAll();
  const err = vnSend_("🔎 イベント情報の調査（テスト送信・自分だけ）\n\n" + text, "test");
  return { text: text, err: err };
}

/* ============ 客層の見当（推定）============ */
/*
 * ★ここは「推定」であって「実績」ではない。だから必ずそう書いて出す。
 *
 * X（旧Twitter）のハッシュタグを数える案は、調べたうえで採らなかった。
 *   ・検索できるのは有料のAPI（月200ドル〜）だけ。画面をそのまま読む方法は
 *     ログインが要るので、Apps Script からは取れない
 *   ・そもそも、書き込んだ人の年齢・性別は公開されていない。数を数えても
 *     「20代女性が何％」は出てこない（出せば、それは作り話になる）
 *
 * 代わりに、公演名（アーティスト名・催し名）から、世の中で知られている
 * 客層の傾向をAIに答えさせている。知らないものには「不明」と言わせて、
 * 知ったかぶりをさせない。同じ公演を何度も聞かないよう、答えは覚えておく。
 */

/** 覚えておくための名札（公演名から作る） */
function vnAudKey_(title) {
  const t = String(title || "").trim();
  if (!t) return "";
  try {
    const b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, t, Utilities.Charset.UTF_8);
    let h = "";
    for (let i = 0; i < 6; i++) h += ("0" + (b[i] & 255).toString(16)).slice(-2);
    return "VNAUD_" + h;
  } catch (e) { return ""; }
}

/**
 * 公演名から、次の3つをまとめてAIに聞く。
 *   audience … 来る人の年代・男女比のおおよそ（推定）
 *   know     … 知っておくと話が弾む、いま話題になっていること
 *   avoid    … 触れない方がいいこと（訃報・活動休止・不祥事・対戦相手のことなど）
 *
 * ★avoid がいちばん大事。
 *   お客さんが盛り上がって乗ってきたところに、こちらが地雷を踏むと
 *   その場でトラブルになる。「知らないなら黙る」が正解なので、
 *   AIにも知らないものには「不明」と答えさせている。
 *
 * 1回の呼び出しで3つとも取る（回数制限に当たらないように）。
 * 同じ公演は覚えておいて、二度は聞かない。
 */
function vnTopicInfo_(title, venue) {
  const empty = { audience: "", know: "", avoid: "" };
  const t = String(title || "").trim();
  if (!t || t.length < 2) return empty;

  const key = vnAudKey_(t);
  const pr = PropertiesService.getScriptProperties();
  if (key) {
    const hit = pr.getProperty(key);
    if (hit !== null) {
      try { return JSON.parse(hit); } catch (e) { return empty; }
    }
  }

  let apiKey = "", model = "";
  try {
    if (typeof getGeminiKey_ !== "function") return empty;
    apiKey = getGeminiKey_();
    model  = (typeof getGeminiModel_ === "function") ? getGeminiModel_() : "gemini-3.1-flash-lite";
  } catch (e) { return empty; }
  if (!apiKey) return empty;

  const prompt =
    "あなたは大阪のタクシー運転手に情報を渡す係です。\n" +
    "次の催しについて、車内での会話に役立つことを答えてください。\n" +
    "催し：「" + t + "」" + (venue ? "（会場：" + venue + "）" : "") + "\n" +
    "出力は JSON ひとつだけ。前置きも説明も書かないでください。\n" +
    '{"audience":"","know":"","avoid":""}\n' +
    "・audience … 来場者の年代と男女のおおよその比率。35文字以内\n" +
    "・know … 知っておくと話が弾むこと（最新の話題、記念の公演、初日や千秋楽など）。50文字以内\n" +
    "・avoid … 触れない方がよいこと（メンバーの訃報・脱退・活動休止・不祥事・けが・\n" +
    "　　　　　負けた試合・対戦相手の話題など、言うと空気が悪くなること）。50文字以内\n" +
    "決まり：\n" +
    "・知らない催し・アーティストなら、推測せず、3つとも空文字にする\n" +
    "・確かでないことは書かない。うわさ、憶測、古い情報は書かない\n" +
    "・avoid に書くことが無ければ空文字にする（無理に埋めない）";

  let out = empty;
  try {
    const res = UrlFetchApp.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model +
      ":generateContent?key=" + encodeURIComponent(apiKey),
      { method: "post", contentType: "application/json", muteHttpExceptions: true,
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    if (res.getResponseCode() === 200) {
      const text = String(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text || "");
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const j = JSON.parse(m[0]);
        out = { audience: vnClean_(j.audience), know: vnClean_(j.know), avoid: vnClean_(j.avoid) };
      }
    }
  } catch (e) { if (typeof logErr_ === "function") logErr_("vnTopic", e); }

  if (key) { try { pr.setProperty(key, JSON.stringify(out)); } catch (e) {} }
  return out;
}

/** AIの返事を、そのまま出せる形に整える（「不明」は空にする） */
function vnClean_(v) {
  let s = String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim();
  if (!s) return "";
  if (/^(不明|なし|特になし|わかりません|分かりません|-|ー)$/.test(s)) return "";
  return s.slice(0, 60);
}

/** 年代・男女比だけがほしいとき（今までの呼び名を残しておく） */
function vnAudienceGuess_(title, venue) {
  return vnTopicInfo_(title, venue).audience;
}

/* ============ ホテルの資料（LINEに送られた画像）============ */
/*
 * 帝国ホテル・リーガロイヤルの宴会予定は、FAXで届く社内の紙なので
 * ホームページには無い。グループLINEに写真を送ってもらって読み取る。
 *
 * ★ここがいちばん気をつけたところ。
 *   いまの決まりでは「画像＝オプチャのスクショ」なので、そのままだと
 *   ホテルの資料がオプチャの乗車記録として書き込まれてしまう。
 *   取り違えないように、二段構えにしてある。
 *     ①「ホテル」と打ってから写真を送る（打った人の合図が最優先）
 *     ② 合図が無くても、オプチャの記録が1件も読めなかったときだけ
 *        ホテルの資料として読み直す（ふつうのオプチャ画像には触れない）
 */

/*
 * ホテルの合図に使える言葉。
 *   ↓ を付ける／付けない … これから送る写真のこと
 *   ↑ を付ける          … 直前に送った写真のこと（オプチャの「↑0904」と同じ）
 *
 * 帝国ホテルの資料には紙にホテル名が書かれていないので、
 * 「帝国」と打ってもらったら、そのまま帝国ホテルとして読む（force）。
 */
const VN_HOTEL_WORDS = [
  { re: /^(帝国|ていこく|帝国ホテル)$/,                     force: "帝国ホテル" },
  { re: /^(リーガ|りーが|リーガロイヤル|リーガロイヤルホテル)$/, force: "リーガロイヤルホテル" },
  { re: /^(ホテル|ほてる|🏨)$/,                              force: "" }
];

/** 打たれた文字が、ホテルの合図かどうかを見る */
function vnHotelWord_(text) {
  const t = String(text || "").trim().replace(/[\s\u3000]/g, "");
  const m = t.match(/^([↑↓⬆⬇])?(.+)$/);
  if (!m) return null;
  const body = m[2];
  for (let i = 0; i < VN_HOTEL_WORDS.length; i++) {
    if (VN_HOTEL_WORDS[i].re.test(body)) {
      return { up: (m[1] === "↑" || m[1] === "⬆"), force: VN_HOTEL_WORDS[i].force };
    }
  }
  return null;
}

const VN_HOTEL_PROMPT =
  "これはホテルの宴会・催事の予定表（社内資料やFAXの紙）の写真です。\n" +
  "写っている予定を全部抜き出してください。\n" +
  "出力は JSON の配列だけ。前置きも説明も書かないでください。\n" +
  "各要素の形:\n" +
  '{"date":"9/16","hotel":"帝国ホテル","name":"催しの名前","room":"会場名","start":"18:00","end":"20:30","people":300}\n' +
  "・date は月/日。年は書かない。日付が1つだけ大きく書いてあるなら、全部それを使う\n" +
  "・hotel は「帝国ホテル」か「リーガロイヤルホテル」。紙に書いていなければ空文字\n" +
  "・start は開始、end は終了。片方しか無ければもう片方は空文字\n" +
  "・people は人数の数値だけ。書いていなければ null\n" +
  "・宴会・催事でないもの（レストランの営業案内など）は含めない\n" +
  "・1件も無ければ [] だけを返す";

/**
 * 写真をホテルの資料として読む。戻り値は読み取れた予定の配列。
 * force にホテル名を渡すと、そのホテルのものとして読む
 * （帝国ホテルの資料は紙にホテル名が無いため）。
 */
function vnHotelFromImage_(messageId, force, blob) {
  return vnImageJson_(messageId, VN_HOTEL_PROMPT +
    (force ? "\n・このホテルは「" + force + "」です。hotel には必ず「" + force + "」と入れてください" : ""), blob);
}

/**
 * 写真を1枚わたして、指示文どおりの JSON を読み取る。
 * ホテルの資料も、会場の月間表も、やることは同じなのでここにまとめる。
 * 読めなかったときは、何が起きたのかが分かる文で throw する
 * （黙って空を返すと、原因がまったく分からなくなるため）。
 */
function vnFetchImage_(messageId) {
  if (!messageId) throw new Error("画像のIDが取れませんでした");
  if (typeof getToken_ !== "function") throw new Error("001-Code が古いので読み取れません");
  const res = UrlFetchApp.fetch(
    "https://api-data.line.me/v2/bot/message/" + encodeURIComponent(messageId) + "/content",
    { headers: { "Authorization": "Bearer " + getToken_() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error("画像を取得できませんでした（" + res.getResponseCode() + "）");
  }
  return res.getBlob();
}

/**
 * 送ってもらった資料の写真を、あとから見られる形でしまっておく。
 *
 * ★AIの読み取りには間違いがある。だから「元の紙」を見られるようにしておく。
 *   案内の枠を押すと、この写真が開く。
 *   PDFにできればPDFで、できなければ写真のまましまう（どちらでも開ける）。
 *
 * ※リンクを知っている人なら誰でも見られる形で置きます。
 *   社外に出せない資料のときは、この機能を切ってください
 *   （設定タブ「資料の写真をリンクで見せる」を「いいえ」に）。
 */
function vnDocSave_(blob, label, d) {
  try {
    if (typeof cfg_ === "function" && cfg_("資料の写真をリンクで見せる") === "いいえ") return "";
    if (typeof DriveApp === "undefined") return "";
    const ymd = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
    const name = ymd + "_" + String(label || "資料");
    // ★PDFにするのをやめた。
    //   PDFにすると、リンクを押しても うまく開かないことがあった
    //   （リーガロイヤルのぶんが、実際に開けなかった）。
    //   送ってもらった写真を、そのまま置くのがいちばん確かに開ける。
    const mime = blob.getContentType() || "image/jpeg";
    const ext = (String(mime).indexOf("png") >= 0) ? ".png" : ".jpg";
    let file = null;
    try { file = DriveApp.createFile(blob.setName(name + ext)); } catch (e) { return ""; }
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return file.getUrl() || "";
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("vnDocSave", e);
    return "";
  }
}

/** その日の「資料の写真」の置き場所をしまう／引く */
function vnDocKey_(d) {
  return "VNDOC_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}
function vnDocSet_(d, place, url) {
  if (!place || !url) return;
  const pr = PropertiesService.getScriptProperties();
  let map = {};
  try { map = JSON.parse(pr.getProperty(vnDocKey_(d)) || "{}"); } catch (e) { map = {}; }
  map[place] = url;
  try { pr.setProperty(vnDocKey_(d), JSON.stringify(map)); } catch (e) {}
}
function vnDocGet_(d, place) {
  try {
    const map = JSON.parse(PropertiesService.getScriptProperties().getProperty(vnDocKey_(d)) || "{}");
    return map[place] || "";
  } catch (e) { return ""; }
}

function vnImageJson_(messageId, prompt, blobIn) {
  if (typeof geminiReady_ !== "function") throw new Error("001-Code が古いので読み取れません");
  const g = geminiReady_();
  const blob = blobIn || vnFetchImage_(messageId);

  const out = UrlFetchApp.fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + g.model +
    ":generateContent?key=" + encodeURIComponent(g.key),
    { method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ parts: [
        { text: prompt },
        { inline_data: { mime_type: blob.getContentType() || "image/jpeg",
                         data: Utilities.base64Encode(blob.getBytes()) } }
      ]}]})});
  if (out.getResponseCode() !== 200) throw new Error("AIが読めませんでした（" + out.getResponseCode() + "）");

  let text = "";
  try { text = JSON.parse(out.getContentText()).candidates[0].content.parts[0].text; }
  catch (e) { throw new Error("AIの返事を読めませんでした"); }
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr;
  try { arr = JSON.parse(m[0]); } catch (e) { return []; }
  return Array.isArray(arr) ? arr : [];
}

/** "9/16" と基準日から、その年の日付を決める（年またぎも見る） */
function vnHotelDate_(md, base) {
  const m = String(md || "").match(/(\d{1,2})\s*[\/月]\s*(\d{1,2})/);
  if (!m) return new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const mo = parseInt(m[1], 10) - 1, da = parseInt(m[2], 10);
  let y = base.getFullYear();
  // 12月に「1/3」と書いてあれば翌年、1月に「12/30」と書いてあれば前年
  if (base.getMonth() === 11 && mo === 0) y += 1;
  if (base.getMonth() === 0  && mo === 11) y -= 1;
  return new Date(y, mo, da);
}

/** 日付の名札（覚えておくときの鍵） */
function vnHotelKey_(d) {
  return "VNH_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

/**
 * 読み取った予定を、日付ごとに覚えておく。
 * 同じ予定を二度書かない（同じホテル・同じ名前・同じ開始時刻なら1つ）。
 * 戻り値は「何件しまったか」。
 */
function vnHotelSave_(list, base, force, docUrl) {
  const pr = PropertiesService.getScriptProperties();
  const byDay = {};
  (list || []).forEach(function (x) {
    // ★開演も終演も無いものは、しまわない。
    //   しまってしまうと、あとで「時間不明」として出てくる
    if (!String(x.start || "").trim() && !String(x.end || "").trim()) return;
    if (force) x.hotel = force;
    // ★送ってもらった紙のありかは、この1件ずつに持たせる。
    //   「その日に受け取ったぶん」として日付で引くと、
    //   先の日付の予定からは引けなくなる（実際そうなっていた）
    if (docUrl) x.doc = docUrl;
    const d = vnHotelDate_(x.date, base);
    const k = vnHotelKey_(d);
    (byDay[k] = byDay[k] || []).push(x);
  });

  let wrote = 0;
  for (const k in byDay) {
    let cur = [];
    try { cur = JSON.parse(pr.getProperty(k) || "[]"); } catch (e) { cur = []; }
    const seen = {};
    cur.forEach(function (x) { seen[(x.hotel || "") + "|" + (x.name || "") + "|" + (x.start || "")] = 1; });
    byDay[k].forEach(function (x) {
      const id = (x.hotel || "") + "|" + (x.name || "") + "|" + (x.start || "");
      if (seen[id]) return;
      seen[id] = 1;
      cur.push(x);
      wrote++;
    });
    try { pr.setProperty(k, JSON.stringify(cur.slice(0, 40))); } catch (e) {}
  }
  return wrote;
}

/** その日のホテルの予定を、イベントの形にして返す */
function vnHotelForDay_(d) {
  let list = [];
  try { list = JSON.parse(PropertiesService.getScriptProperties().getProperty(vnHotelKey_(d)) || "[]"); }
  catch (e) { list = []; }
  return list.map(function (x) {
    const raw = String(x.hotel || "");
    const hotel = raw.indexOf("帝国") >= 0 ? "帝国ホテル"
                : raw.indexOf("リーガ") >= 0 ? "リーガロイヤルホテル"
                : raw ? raw : "ホテル";
    const title = [x.name, x.room].filter(String).join("／") + vnDayNo_("VNH", hotel, x.name, d);
    return { venue: hotel, kind: "hotel", icon: "🍽", title: title,
             start: String(x.start || ""), end: String(x.end || ""),
             people: Number(x.people) > 0 ? Number(x.people) : 0,
             // 送ってもらった紙そのもの。枠を押すと開く（AIの読み違いを、目で確かめられるように）
             url: String(x.doc || "") || vnDocGet_(d, hotel) };
  });
}

/**
 * 写真を「ホテルの資料」として読んで、しまって、返事の文を作る。
 * 読めなければ空文字を返す（＝ホテルの資料ではなかった）。
 */
function vnHotelTry_(messageId, base, force) {
  const t0 = Date.now();                 // 読み取りにかかった時間を出すため
  let list = [], blob = null;
  try {
    blob = vnFetchImage_(messageId);     // 写真は1回だけ取る（読み取りと保存で使い回す）
    list = vnHotelFromImage_(messageId, force, blob);
  }
  catch (e) { if (typeof logErr_ === "function") logErr_("vnHotelTry", e); return ""; }
  if (!list.length) return "";
  // ★先に紙をしまう。予定1件ずつに「ありか」を持たせたいので、順番が大事
  const places0 = {};
  list.forEach(function (x) { const nm = String(force || x.hotel || "").trim(); if (nm) places0[nm] = 1; });
  const doc = vnDocSave_(blob, Object.keys(places0).join("・") || (force || "ホテル"), base || new Date());
  const n = vnHotelSave_(list, base || new Date(), force, doc);

  // 場所の名前を、重ならないようにならべる
  const seen = {}, places = [];
  list.forEach(function (x) {
    const nm = String(force || x.hotel || "").trim();
    if (!nm || seen[nm]) return;
    seen[nm] = 1; places.push(nm);
  });

  if (doc) places.forEach(function (nm) { vnDocSet_(base || new Date(), nm, doc); });

  // ★ここは雑談のグループに出る。短く、3行で終える
  const sec = Math.max(0.1, Math.round((Date.now() - t0) / 100) / 10);
  return "以下のイベント情報をジェバンニが" + sec + "秒でやってくれました\n" +
         "件数：" + n + "件\n" +
         "場所：" + (places.join("・") || "（読み取れず）") +
         (doc ? "\n資料：この案内の枠を押すと、送ってもらった紙が開きます" : "");
}

/* ================================================================
 *  会場の「月間スケジュール表」を写真から読む
 *
 *  ★フェスティバルホールの月間表を送っていただいたのに、読めなかった。
 *    字がかすれていたからではない。読ませ方が違っていた。
 *    ホテル用の指示文（VN_HOTEL_PROMPT）には
 *    「これはホテルの宴会・催事の予定表です」「宴会・催事でないものは
 *    含めないでください」と書いてある。
 *    月間の公演スケジュール表は、その指示に当てはまらないので、
 *    AIは正直に「1件もありません」と答えていた。
 *    そして「読めたときだけ返す」決まりのせいで、こちらは黙っていた。
 *    資料の種類が違えば、読ませ方も分けなければいけなかった。
 * ================================================================ */
const VN_HALL_WORDS = [
  { re: /^(フェス|ふぇす|フェスティバル|フェスティバルホール)$/, force: "フェスティバルホール" },
  { re: /^(会場|かいじょう|ホール|ほーる|公演|🎤|🎭)$/,          force: "" }
];

/** 打たれた文字が、会場の合図かどうかを見る（↓会場／↑ホール など） */
function vnHallWord_(text) {
  const t = String(text || "").trim().replace(/[\s\u3000]/g, "");
  const m = t.match(/^([↑↓⬆⬇])?(.+)$/);
  if (!m) return null;
  for (let i = 0; i < VN_HALL_WORDS.length; i++) {
    if (VN_HALL_WORDS[i].re.test(m[2])) {
      return { up: (m[1] === "↑" || m[1] === "⬆"), force: VN_HALL_WORDS[i].force };
    }
  }
  return null;
}

const VN_HALL_PROMPT =
  "これはコンサートホールや劇場の「月間 公演スケジュール表」の写真です。\n" +
  "1行が1日ぶんで、日付・曜日・公演名・開演時間・終演予測 がならんでいます。\n" +
  "写っている公演を全部抜き出してください。\n" +
  "出力は JSON の配列だけ。前置きも説明も書かないでください。\n" +
  "各要素の形:\n" +
  '{"date":"9/16","hall":"フェスティバルホール","name":"公演名","start":"18:00","end":"20:00"}\n' +
  "・date は月/日。表の上に「2026年9月」とあれば、その月と各行の日を組み合わせる\n" +
  "・hall は表の題や社名。読み取れなければ空文字\n" +
  "・start は開演時間、end は終演予測。片方しか無ければもう片方は空文字\n" +
  "・★開演時間も終演予測も書かれていない行は、絶対に含めないでください\n" +
  "　（公演名が空の日、「学校行事」「仕込み」など時間の無い行は、全部とばす）\n" +
  "・1件も無ければ [] だけを返す";

/**
 * 写真を「会場の月間スケジュール表」として読む。
 * 読めた公演の配列を返す。
 */
function vnHallFromImage_(messageId, force, blob) {
  return vnImageJson_(messageId, VN_HALL_PROMPT +
    (force ? "\n・この会場は「" + force + "」です。hall には必ず「" + force + "」と入れてください" : ""), blob);
}

/** 会場の公演を、日付ごとにしまう（時刻の無いものは入れない） */
function vnHallSave_(list, base, force, docUrl) {
  const pr = PropertiesService.getScriptProperties();
  const byDay = {};
  (list || []).forEach(function (x) {
    if (!String(x.start || "").trim() && !String(x.end || "").trim()) return;
    const hall = String(force || x.hall || "").trim();
    if (!hall) return;
    const d = vnHotelDate_(x.date, base);
    const k = "VNV_" + vnHotelKey_(d).slice(4);
    (byDay[k] = byDay[k] || []).push({ hall: hall, name: String(x.name || ""),
                                       start: String(x.start || ""), end: String(x.end || ""),
                                       doc: String(docUrl || "") });
  });
  let wrote = 0;
  for (const k in byDay) {
    let cur = [];
    try { cur = JSON.parse(pr.getProperty(k) || "[]"); } catch (e) { cur = []; }
    const seen = {};
    cur.forEach(function (x) { seen[x.hall + "|" + x.name + "|" + x.start] = 1; });
    byDay[k].forEach(function (x) {
      const id = x.hall + "|" + x.name + "|" + x.start;
      if (seen[id]) return;
      seen[id] = 1; cur.push(x); wrote++;
    });
    try { pr.setProperty(k, JSON.stringify(cur.slice(0, 40))); } catch (e) {}
  }
  return wrote;
}

/**
 * 連日の催しに「（2日目／3日間）」を付ける。
 *
 * ★同じ催しが何日も続くとき、今日が何日目なのかが分からないと、
 *   終わりの日の混み方（バラシ・物販の撤収）が読めない。
 *
 *   写真から読んだぶん（会場の月間表・ホテルの予定表）は、
 *   先の日付まで全部しまってあるので、正確に数えられる。
 *   ホームページから読んだぶんは その日しか見ていないので、
 *   数えられない（無理に書かない）。
 */
function vnDayNo_(prefix, venue, title, d) {
  try {
    const key = String(venue) + "|" + String(title || "");
    const days = [];
    const props = PropertiesService.getScriptProperties().getProperties() || {};
    for (const k in props) {
      const m = k.match(new RegExp("^" + prefix + "_(\\d{4})(\\d{2})(\\d{2})$"));
      if (!m) continue;
      let list = [];
      try { list = JSON.parse(props[k] || "[]"); } catch (e) { continue; }
      const hit = list.some(function (x) {
        return (String(x.hall || x.hotel || "") + "|" + String(x.name || "")) === key;
      });
      if (hit) days.push(m[1] + m[2] + m[3]);
    }
    if (days.length < 2) return "";                  // 1日だけなら、何も付けない
    days.sort();
    const ymd = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
    const i = days.indexOf(ymd);
    if (i < 0) return "";
    return "（" + (i + 1) + "日目／" + days.length + "日間）";
  } catch (e) { return ""; }
}

/** その日の「写真から読んだ会場の公演」を、イベントの形にして返す */
function vnHallForDay_(d) {
  let list = [];
  try { list = JSON.parse(PropertiesService.getScriptProperties()
          .getProperty("VNV_" + vnHotelKey_(d).slice(4)) || "[]"); }
  catch (e) { list = []; }
  return list.map(function (x) {
    const no = vnDayNo_("VNV", x.hall, x.name, d);
    return { venue: x.hall, kind: "event", icon: "🎤",
             title: String(x.name || "") + no,
             start: String(x.start || ""), end: String(x.end || ""), people: 0,
             url: String(x.doc || "") || vnDocGet_(d, x.hall) };
  });
}

/**
 * 写真を会場の資料として読んで、しまって、返事の文を作る。
 * 読めなければ空文字を返す。
 */
function vnHallTry_(messageId, base, force) {
  const t0 = Date.now();
  let list = [], blob = null;
  try {
    blob = vnFetchImage_(messageId);
    list = vnHallFromImage_(messageId, force, blob);
  }
  catch (e) { if (typeof logErr_ === "function") logErr_("vnHallTry", e); return ""; }
  if (!list.length) return "";
  const places0 = {};
  list.forEach(function (x) { const nm = String(force || x.hall || "").trim(); if (nm) places0[nm] = 1; });
  const doc = vnDocSave_(blob, Object.keys(places0).join("・") || (force || "会場"), base || new Date());
  const n = vnHallSave_(list, base || new Date(), force, doc);
  const seen = {}, places = [];
  list.forEach(function (x) {
    const nm = String(force || x.hall || "").trim();
    if (!nm || seen[nm]) return;
    seen[nm] = 1; places.push(nm);
  });
  if (doc) places.forEach(function (nm) { vnDocSet_(base || new Date(), nm, doc); });

  const sec = Math.max(0.1, Math.round((Date.now() - t0) / 100) / 10);
  return "以下のイベント情報をジェバンニが" + sec + "秒でやってくれました\n" +
         "件数：" + n + "件\n" +
         "場所：" + (places.join("・") || "（読み取れず）") +
         (doc ? "\n資料：この案内の枠を押すと、送ってもらった紙が開きます" : "");
}

/** 合図を覚える（15分だけ）。force は「帝国ホテル」など、決め打ちするホテル名 */
function vnHotelHintSet_(userId, force, kind) {
  try { CacheService.getScriptCache().put("VNKIND_" + (userId || "anon"),
          (kind || "hotel") + "|" + (force || ""), 900); }
  catch (e) {}
}

/**
 * 合図が出ているか（1回見たら消す）。
 * 出ていれば { force: "帝国ホテル" } の形、出ていなければ null。
 */
function vnHotelHintGet_(userId) {
  try {
    const c = CacheService.getScriptCache();
    const k = "VNKIND_" + (userId || "anon");
    const v = c.get(k);
    if (v) {
      c.remove(k);
      const i = String(v).indexOf("|");
      return { kind: i >= 0 ? String(v).slice(0, i) : "hotel",
               force: i >= 0 ? String(v).slice(i + 1) : "" };
    }
  } catch (e) {}
  return null;
}

/**
 * 「帝国」「↓ホテル」「↑🏨」などと打たれたときの受け口。
 * 001-Code の文字の処理から呼ばれる。扱ったら true を返す。
 *
 *   ↓ を付ける／付けない … これから送る写真のこと
 *   ↑ を付ける          … 直前に送った写真のこと
 */
function vnHandleNote_(ev, sentAt) {
  const text = (ev.message && ev.message.text) || "";
  const uid = (ev.source && ev.source.userId) || "anon";
  const reply = ev.replyToken || "";

  // ⓪「イベント一覧」… だれでも、いつでも今日のぶんを見られるように
  if (vnHandleListCmd_(ev, sentAt)) return true;

  // ① 確認用の手直し（「①削除」「①③削除」「①修正：〜」など）
  if (vnHandleEditCmd_(ev, sentAt)) return true;

  // ② 種類を間違えて送ってしまったときの言い直し（「訂正：会場」など）
  const fix = vnFixWord_(text);
  if (fix) {
    let mid = "";
    try { mid = CacheService.getScriptCache().get("LASTIMG_" + uid) || ""; } catch (e) {}
    if (!mid) {
      if (typeof lineReply_ === "function") lineReply_(reply, "🔍 だ…ダメだ…直前の写真がない…");
      return true;
    }
    const msg = (fix.kind === "hall")
      ? vnHallTry_(mid, sentAt || new Date(), fix.force)
      : vnHotelTry_(mid, sentAt || new Date(), fix.force);
    if (typeof lineReply_ === "function") {
      lineReply_(reply, msg || vnUnreadMsg_(fix.kind, fix.force));
    }
    return true;
  }

  // ③ ふつうの合図（↓ホテル／↓会場 など）
  const h = vnHotelWord_(text);
  const v = h ? null : vnHallWord_(text);
  const w = h || v;
  if (!w) return false;
  const kind = h ? "hotel" : "hall";

  if (w.up) {
    // 先に写真を送ってしまったとき用。直前の写真を読み直す
    let mid = "";
    try { mid = CacheService.getScriptCache().get("LASTIMG_" + uid) || ""; } catch (e) {}
    if (!mid) {
      if (typeof lineReply_ === "function") lineReply_(reply, "🔍 だ…ダメだ…直前の写真がない…");
      return true;
    }
    const msg = (kind === "hall") ? vnHallTry_(mid, sentAt || new Date(), w.force)
                                  : vnHotelTry_(mid, sentAt || new Date(), w.force);
    // 打った人が自分で合図を出しているので、読めなかったときも黙らずに伝える
    if (typeof lineReply_ === "function") lineReply_(reply, msg || vnUnreadMsg_(kind, w.force));
    return true;
  }

  // ★ここでは何も返さない。
  //   グループは雑談の場なので、合図のたびに公式アカウントが口を出すと邪魔になる。
  //   写真が届いて、読み取れたときにだけ返す。
  vnHotelHintSet_(uid, w.force, kind);
  return true;
}

/* ================================================================
 *  読み取り台帳（何がどこまで読めているかを、目で確かめるための表）
 *
 *  ★「今日のぶんが出た／出ない」だけでは、
 *    そもそも読めているのかどうかが分からない。
 *    ・ホームページは、先の日付まで並べて「何日ぶん拾えたか」を見る
 *    ・写真から読んだぶん（フェス・帝国・リーガ）は、
 *      しまってある全部を出す（何か月先まででも）
 *    記録用スプシに「🗓️イベント台帳」タブを作って書くので、
 *    スマホでも、そのまま上下に見ていける。
 * ================================================================ */
const VN_LEDGER_TAB = "🗓️イベント台帳";

/** 日付の名札（2026/11/05(木) の形） */
function vnLedDate_(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return d.getFullYear() + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" +
         ("0" + d.getDate()).slice(-2) + "(" + w[d.getDay()] + ")";
}

/** "20261105" → Date */
function vnLedYmdToDate_(y, m, d) { return new Date(Number(y), Number(m) - 1, Number(d)); }

/**
 * カテゴリー（何の催しか）。
 * 会場の種類と、催しの名前の両方から決める。
 * 分からないときは、うそを書かずに「不明」と書く。
 */
function vnCategory_(ev) {
  const v = VN_VENUES[ev.venue] || {};
  if ((ev.kind || "") === "barasi") return "バラシ（搬出）";
  if ((ev.kind || "") === "hotel" || v.type === "ホテル") return "ホテル宴会・催事";
  const t = String(ev.title || "");
  if (/(vs|対|開幕|リーグ|ダービー|試合|キックオフ|セレッソ|ガンバ|バファローズ|オリックス)/.test(t)) return "スポーツ";
  if (/(展|フェア|EXPO|見本市|商談|大会|総会)/i.test(t)) return "展示会・大会";
  if (/(交響楽団|フィル|クラシック|オーケストラ|バレエ|落語|演劇|ミュージカル)/.test(t)) return "クラシック・舞台";
  if (/(TOUR|LIVE|ライブ|コンサート|CONCERT|公演)/i.test(t)) return "ライブ・コンサート";
  if (v.type === "ドーム" || v.type === "スタジアム") return "スポーツ／大型公演";
  if (v.type === "ホール") return "ホール公演";
  if (v.type === "展示場") return "展示会";
  return "不明";
}

/** 写真から読んだぶんを、日付ごとに全部集める（先の月も含めて） */
function vnLedgerFromPhotos_() {
  const out = [];
  let props = {};
  try { props = PropertiesService.getScriptProperties().getProperties() || {}; } catch (e) { props = {}; }
  for (const k in props) {
    const mv = k.match(/^VNV_(\d{4})(\d{2})(\d{2})$/);      // 会場（月間表）
    const mh = k.match(/^VNH_(\d{4})(\d{2})(\d{2})$/);      // ホテル
    const m = mv || mh;
    if (!m) continue;
    let list = [];
    try { list = JSON.parse(props[k] || "[]"); } catch (e) { list = []; }
    const d = vnLedYmdToDate_(m[1], m[2], m[3]);
    list.forEach(function (x) {
      const venue = String(x.hall || x.hotel || "");
      out.push({
        d: d, venue: venue, kind: mv ? "event" : "hotel",
        title: String(x.name || ""), start: String(x.start || ""), end: String(x.end || ""),
        people: Number(x.people) > 0 ? Number(x.people) : 0,
        url: String(x.doc || "") || vnDocGet_(d, venue),
        from: mv ? "送ったスクショ（会場の月間表）" : "送ったスクショ（ホテルの予定表）"
      });
    });
  }
  return out;
}

/** ホームページから、これから何日ぶん拾えるかを調べる（ページは1回だけ読む） */
function vnLedgerFromWeb_(days) {
  const n = Math.max(1, Math.min(Number(days) || 14, 31));
  const rows = [], notes = [];
  const today = new Date();
  VN_SOURCES.forEach(function (src) {
    let html = "";
    try {
      const res = UrlFetchApp.fetch(src.url, {
        muteHttpExceptions: true, followRedirects: true,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TaxiReport/1.0)" }
      });
      if (res.getResponseCode() !== 200) { notes.push("❌ " + src.name + "：開けません（" + res.getResponseCode() + "）"); return; }
      try { html = res.getContentText(); }
      catch (e) { try { html = res.getContentText("Shift_JIS"); } catch (e2) { html = ""; } }
    } catch (e) {
      notes.push("❌ " + src.name + "：つながりません"); return;
    }
    if (!html) { notes.push("❌ " + src.name + "：中身が空です"); return; }

    let hit = 0;
    for (let i = 0; i < n; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      let got = [];
      try { got = vnScrapeOne_(src, d, (src.deep && i > 0) ? html : (src.deep ? null : html)).events || []; }
      catch (e) { got = []; }
      got.filter(vnHasTime_).forEach(function (e) {
        rows.push({ d: d, venue: e.venue, kind: e.kind || "event", title: e.title,
                    start: e.start, end: e.end, endGuess: !!e.endGuess, people: 0,
                    url: e.url || src.url, from: "ホームページ" });
        hit++;
      });
    }
    notes.push((hit > 0 ? "✅ " : "⚠️ ") + src.name + "：" + n + "日ぶんを見て " + hit + "件");
  });
  return { rows: rows, notes: notes };
}

/** 台帳に出す1行ぶん（客層などを付けるかどうかを選べる） */
function vnLedgerRow_(e, withGuess) {
  let guess = "", know = "", avoid = "";
  if (withGuess) {
    try {
      const ti = vnTopicInfo_(e.title, e.venue);
      guess = ti.audience || ""; know = ti.know || ""; avoid = ti.avoid || "";
    } catch (err) {}
  }
  const v = VN_VENUES[e.venue] || {};
  return [
    vnLedDate_(e.d),
    e.venue,
    vnCategory_(e),
    e.title || "（名前を読み取れませんでした）",
    e.start || "",
    (e.end || "") + (e.endGuess ? "（予想）" : ""),
    guess || (withGuess ? "（AIも分からないと答えました）" : "―"),
    know || "",
    avoid || "",
    (v.near && v.near.length) ? v.near.join("・") : "",
    e.from,
    e.url || ""
  ];
}

/**
 * 台帳を作って、記録用スプシの「🗓️イベント台帳」タブに書く。
 *
 * ★何件、では確かめようがない。
 *   日付・終わりの時刻・客層・カテゴリー・リンクまで、1行ずつ出す。
 *   リンクのらんを押せば、公式ページか、送ってもらったスクショが開く。
 *   これで「合っているかどうか」を、その場で見比べられる。
 */
function vnLedgerBuild_(days, withGuess) {
  const photos = vnLedgerFromPhotos_();
  const web = vnLedgerFromWeb_(days);
  const all = web.rows.concat(photos);
  all.sort(function (a, b) {
    if (a.d - b.d !== 0) return a.d - b.d;
    return String(a.start) < String(b.start) ? -1 : 1;
  });

  // 客層をAIに聞くのは、時間も回数もかかる。上から決まった数だけにする
  const GUESS_MAX = 30;
  const rows = all.map(function (e, i) { return vnLedgerRow_(e, withGuess && i < GUESS_MAX); });

  let url = "";
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(VN_LEDGER_TAB);
    if (!sh) sh = ss.insertSheet(VN_LEDGER_TAB);
    sh.clear();
    const head = ["日付", "会場", "カテゴリー", "催しの名前", "開演", "終演",
                  "客層・年齢層（推定）", "知っておくとよい話題", "触れない方がよいこと",
                  "近い乗り場", "どこから読んだか", "確かめる（押すと開きます）"];
    sh.getRange(1, 1, 1, head.length).setValues([head])
      .setFontWeight("bold").setBackground("#e8d5f0").setWrap(true);
    if (rows.length) {
      sh.getRange(2, 1, rows.length, head.length).setValues(rows).setWrap(true).setVerticalAlignment("top");
      // リンクのらんは、押して開ける形にする（スマホでそのまま確かめられるように）
      for (let i = 0; i < rows.length; i++) {
        const u = rows[i][head.length - 1];
        if (!u) continue;
        const label = String(rows[i][10]).indexOf("スクショ") >= 0 ? "📷 送ったスクショを見る" : "🔗 公式ページを見る";
        try {
          sh.getRange(i + 2, head.length).setRichTextValue(
            SpreadsheetApp.newRichTextValue().setText(label)
              .setLinkUrl(0, label.length, u).build());
        } catch (e) { sh.getRange(i + 2, head.length).setValue(u); }
      }
      // 「触れない方がよいこと」は赤で目立たせる
      sh.getRange(2, 9, rows.length, 1).setFontColor("#c62828").setFontWeight("bold");
    }
    sh.setFrozenRows(1);
    [110, 130, 130, 240, 55, 75, 180, 200, 180, 130, 160, 170]
      .forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    url = ss.getUrl() + "#gid=" + sh.getSheetId();
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("vnLedger", e);
  }

  // LINEには短く。中身は台帳で見てもらう
  const L = ["🗓️ 読み取り台帳をつくりました（" + rows.length + "件）", ""];
  web.notes.forEach(function (x) { L.push(x); });
  if (photos.length) {
    const byPlace = {};
    photos.forEach(function (r) { byPlace[r.venue] = (byPlace[r.venue] || 0) + 1; });
    for (const k in byPlace) L.push("📷 " + k + "：" + byPlace[k] + "件（送ったスクショぶん）");
  }
  L.push("");
  L.push("⚠️ は、その期間に催しが無いか、読み取れていないかのどちらかです。");
  L.push("公式ページに催しが出ているのに ⚠️ なら、読み取りが効いていません。");
  L.push("");
  L.push("台帳には、日付・カテゴリー・催しの名前・開演・終演・客層・話題・" +
         "触れない方がよいこと・近い乗り場・出所・確かめるリンク をならべてあります。");
  L.push("いちばん右のらんを押すと、公式ページか、送ってもらったスクショが開きます。");
  if (!withGuess) L.push("客層も見るときは「読み取り確認 詳しく」と送ってください（少し時間がかかります）。");
  if (url) L.push("", url);
  return L.join("\n");
}

/**
 * 「イベント一覧」と打たれたときの受け口。
 *
 * ★16:30／17:00 を見のがしても、あとから自分で引けるようにする。
 *   グループでも個人でも使える。
 *   ここは読むだけなので、だれが打っても構わない。
 */
function vnHandleListCmd_(ev, sentAt) {
  const t = String((ev.message && ev.message.text) || "").trim().replace(/[\s\u3000]/g, "");
  // 「読み取り確認」…先の日付まで、ちゃんと読めているかを見る（まーくさんだけ）
  if (/^(読み取り確認|読取確認|イベント台帳|台帳|読み取り台帳)(\d+日?)?(詳しく|くわしく)?$/.test(t)) {
    let me = "";
    try { me = vnTestTarget_(); } catch (e) {}
    if (!me || ((ev.source && ev.source.userId) || "") !== me) return false;
    const dm = t.match(/(\d+)/);
    const say0 = function (x) { if (typeof lineReply_ === "function") lineReply_(ev.replyToken || "", x); };
    const deep = /(詳しく|くわしく)/.test(t);
    try { say0(vnLedgerBuild_(dm ? Number(dm[1]) : 14, deep)); }
    catch (e) { say0("🔍 くそっ!!!!やられた!!!!　台帳を作れませんでした：" + (e && e.message ? e.message : e)); }
    return true;
  }
  if (!/^(イベント一覧|いべんと一覧|イベント確認|今日のイベント|イベント)$/.test(t)) return false;
  const d = sentAt || new Date();
  const reply = ev.replyToken || "";
  const say = function (x) { if (typeof lineReply_ === "function") lineReply_(reply, x); };

  const list = vnFinalEvents_(d);
  const L = ["🎪 " + vnDayLabel_(d) + " のイベント一覧", ""];
  if (!list.length) {
    L.push("この日に出せるイベントはありません。");
    L.push("（時刻が読み取れなかったものは、はじめから出していません）");
  } else {
    list.forEach(function (e, i) {
      const when = [e.start, e.end].filter(String).join("〜");
      const v = VN_VENUES[e.venue] || {};
      L.push(vnNoMark_(i + 1) + " " + (e.icon || "📍") + " " + e.venue + (when ? "　" + when : ""));
      if (e.title) L.push("　" + e.title);
      if (e.note) L.push("　✏️ " + e.note);
      if (v.near && v.near.length) L.push("　📍 近い乗り場：" + v.near.join("・"));
    });
  }

  // 自分が受け取る約束になっているお知らせ
  const mine = vnRemQueue_().filter(function (r) { return r.to === ((ev.source && ev.source.userId) || ""); });
  if (mine.length) {
    L.push("", "⏰ お知らせを受け取る約束になっているもの");
    mine.forEach(function (r) {
      L.push("・" + r.venue + (r.title ? "　" + r.title : "") +
             "（" + (r.end ? r.end + " 終了予定" : r.start + " 開始") + "）");
    });
  }

  L.push("", VN_DISCLAIMER[0], VN_DISCLAIMER[1]);
  say(L.join("\n"));
  return true;
}

/**
 * 「種類を間違えて送ってしまった」ときの言い直し。
 *
 * ★イベントの資料なのに「↓ホテル」で送ってしまうと、
 *   ホテルの宴会表として読もうとして、当然1件も読めない。
 *   写真を送り直させるのは手間なので、言葉ひとつで読み直せるようにする。
 *   直前に送った写真（1時間おぼえている）を、別の種類として読み直す。
 */
function vnFixWord_(text) {
  const t = String(text || "").trim().replace(/[\s\u3000]/g, "");
  // ★「訂正：」で始まるときだけ、言い直しとして受ける。
  //   これを外すと、ふつうの合図（「ホテル」だけ）まで
  //   言い直しだと思ってしまい、写真を待たずに読み直してしまう
  const m = t.match(/^(訂正|修正|まちがい|間違い|ちがう|違う)[:：]?(.+)$/);
  let body = "";
  if (m) body = m[2];
  else if (/^(ホテルじゃない|ホテルではない|会場じゃない|会場ではない|イベントじゃない)$/.test(t)) body = t;
  else return null;
  // 「ホテルじゃない」「会場でした」のような言い方も受ける
  if (/^(会場|ホール|イベント|公演|ホテルじゃない|ホテルではない)$/.test(body)) return { kind: "hall", force: "" };
  if (/^(フェス|フェスティバル|フェスティバルホール)$/.test(body)) return { kind: "hall", force: "フェスティバルホール" };
  if (/^(ホテル|会場じゃない|会場ではない|イベントじゃない)$/.test(body)) return { kind: "hotel", force: "" };
  if (/^(帝国|帝国ホテル)$/.test(body)) return { kind: "hotel", force: "帝国ホテル" };
  if (/^(リーガ|リーガロイヤル|リーガロイヤルホテル)$/.test(body)) return { kind: "hotel", force: "リーガロイヤルホテル" };
  return null;
}

/**
 * 読めなかったときの返事。
 *
 * ★ただ「読めません」とだけ返すと、なぜ読めないのかが分からない。
 *   いちばん多いのは「資料の種類が違う」で、これは言葉ひとつで直せる。
 *   その直し方まで、必ず一緒に書く。
 */
function vnUnreadMsg_(kind, force) {
  const nameOf = force || (kind === "hall" ? "会場" : "ホテル");
  return "🔍 くそっ!!!!やられた!!!!　" + nameOf + "の予定が読めません。\n" +
         "・資料の種類が違うかもしれません。" +
         (kind === "hall" ? "ホテルの宴会表なら「訂正：ホテル」"
                          : "公演スケジュール表なら「訂正：会場」") +
         "と送ってください（写真は送り直さなくて大丈夫です）\n" +
         "・暗い・斜め・見きれている場合は、明るいところで撮り直すと通ります";
}

/**
 * 写真が来たときの受け口。合図が出ていればホテル／会場として読む。
 * 扱ったら true（＝オプチャとしては読まない）。
 */
function vnHandleImage_(ev, sentAt) {
  const uid = (ev.source && ev.source.userId) || "anon";
  const mid = (ev.message && ev.message.id) || "";
  // ★合図が無くても、直前の写真として1時間おぼえておく。
  //   あとから「↑ホテル」「訂正：会場」と言い直せるようにするため
  try { CacheService.getScriptCache().put("LASTIMG_" + uid, mid, 3600); } catch (e) {}

  const hint = vnHotelHintGet_(uid);
  if (!hint) return false;
  const msg = (hint.kind === "hall") ? vnHallTry_(mid, sentAt || new Date(), hint.force)
                                     : vnHotelTry_(mid, sentAt || new Date(), hint.force);
  // 合図を出したうえでの写真なので、読めなかったときも黙らずに伝える
  if (typeof lineReply_ === "function") {
    lineReply_(ev.replyToken || "", msg || vnUnreadMsg_(hint.kind, hint.force));
  }
  return true;
}


/* ============ ホームページの読み取り ============ */
/*
 * ★ここは「どのサイトにも、だいたい効く」書き方にしてある。
 *   サイトごとに合わせて書くほうが正確だが、
 *   ・こちらからは各サイトの中身を確かめられない（通信が塞がれている）
 *   ・サイトの作りは、向こうの都合で勝手に変わる
 *   ので、決め打ちにすると、変わった日から黙って何も出なくなる。
 *
 *   そこで「その日の日付が書いてある行を見つけて、その周りを読む」という
 *   いちばん壊れにくいやり方にした。読めたものは [13] の一覧で
 *   そのまま目で確かめられるので、外していればすぐ分かる。
 */

/** &nbsp; などを、ふつうの文字に戻す */
function vnEntity_(t) {
  return String(t)
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#0*39;/g, "'")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); });
}

/** HTMLを「行のならんだ文字」にする。表の1行＝1件のことが多いので、行を残す */
function vnLines_(html) {
  let t = String(html || "");
  t = t.replace(/<script[\s\S]*?<\/script>/gi, " ")
       .replace(/<style[\s\S]*?<\/style>/gi, " ")
       .replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<\s*br[^>]*>/gi, "\n")
       .replace(/<\/(p|div|li|tr|h[1-6]|dt|dd|section|article|table)\s*>/gi, "\n")
       .replace(/<\/(td|th)\s*>/gi, "　");
  t = t.replace(/<[^>]+>/g, " ");
  t = vnEntity_(t);
  return t.split("\n")
    .map(function (x) { return x.replace(/[ \t ]+/g, " ").trim(); })
    .filter(function (x) { return x !== ""; });
}

/**
 * ページの中のリンク（href）を取り出して、絶対の住所にそろえる。
 * 一覧のページに時刻が無いところ（ニューオータニなど）で、
 * 催しのページまで開きにいくために使う。
 */
function vnLinks_(html, baseUrl) {
  const out = [];
  const seen = {};
  let base = String(baseUrl || "");
  let origin = base;
  try {
    const m = base.match(/^(https?:\/\/[^\/]+)(\/.*)?$/);
    origin = m ? m[1] : base;
  } catch (e) {}
  const re = /<a[^>]+href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi;
  let m2;
  while ((m2 = re.exec(String(html || ""))) !== null) {
    let href = vnEntity_(m2[1]).trim();
    if (!href || /^(javascript:|mailto:|tel:)/i.test(href)) continue;
    if (/^\/\//.test(href)) href = "https:" + href;
    else if (/^\//.test(href)) href = origin + href;
    else if (!/^https?:/i.test(href)) href = base.replace(/[^\/]*$/, "") + href;
    if (seen[href]) continue;
    seen[href] = 1;
    const text = vnEntity_(String(m2[2]).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    out.push({ url: href, text: text });
  }
  return out;
}

/**
 * 一覧のページに時刻が載っていない会場を、催しのページまで開いて読む。
 *
 * ★ニューオータニは、一覧には催しの名前と期間しか出ていない。
 *   時刻はそれぞれのページを開かないと分からない。
 *   時刻が分からないものは出さない決まりなので、
 *   ここで開きにいかないと、この会場は1件も出せなくなる。
 *
 *   ただし、よそのサーバーを何十回も叩くわけにはいかないので、
 *   ・同じ入れ物（ドメイン）の中だけ
 *   ・多くても5ページまで
 *   ・時刻が見つかった時点でやめる
 *   という決めごとにしてある。
 */
function vnScrapeDeep_(src, day, html) {
  const out = [];
  const dre = vnDateRe_(day);
  const host = String(src.url).replace(/^(https?:\/\/[^\/]+).*$/, "$1");
  // 催しのページらしいリンクだけに絞る（同じ入れ物・一覧そのものは除く）
  const links = vnLinks_(html, src.url).filter(function (l) {
    return l.url.indexOf(host) === 0 && l.url !== src.url && l.text;
  }).slice(0, 12);

  let opened = 0;
  for (let i = 0; i < links.length && opened < 5 && out.length < 5; i++) {
    let res;
    try {
      res = UrlFetchApp.fetch(links[i].url, {
        muteHttpExceptions: true, followRedirects: true,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TaxiReport/1.0)" }
      });
    } catch (e) { continue; }
    opened++;
    if (res.getResponseCode() !== 200) continue;
    let h2 = "";
    try { h2 = res.getContentText(); } catch (e) { continue; }
    const lines = vnLines_(h2);
    // そのページに「今日」が書いてあり、かつ時刻もあること。両方そろって初めて出す
    const hasDay = lines.some(function (x) { return dre.test(x); });
    if (!hasDay) continue;
    const text = lines.join("　");
    const kick = text.match(/(開演|開場|スタート|開始)[^0-9]{0,6}(\d{1,2}:\d{2})/);
    const times = (text.match(/\d{1,2}:\d{2}/g) || []);
    const start = kick ? kick[2] : (times.length ? times[0] : "");
    if (!start) continue;                       // 時刻が無いなら出さない
    const fin = text.match(/(終了|終演|閉場)[^0-9]{0,6}(\d{1,2}:\d{2})/);
    let end = fin ? fin[2] : (times.length >= 2 && times[1] !== start ? times[1] : "");
    let guessed = false;
    if (!end) { end = vnGuessEnd_(src.name, start); guessed = !!end; }
    out.push({
      venue: src.name, kind: src.kind || "event", icon: "🎤",
      title: links[i].text.slice(0, 60) || "（名前を読み取れませんでした）",
      start: start, end: end, endGuess: guessed, people: 0, url: links[i].url,
      raw: text.slice(0, 120)
    });
  }
  return out;
}

/*
 * 詳細のページまで開いて、気をつけることを拾う。
 *
 * ★「徹夜」と書かれていたら、こちらの営業時間（〜翌04:00）内に
 *   バラシが終わらない。待っても無駄足になるので、必ず書き添える。
 *   ついでに「〇日目／〇日間」や、対象の公演名も拾えたら拾う。
 */
const VN_NIGHT_WORDS = /(徹夜|オールナイト|夜通し|翌朝まで|朝まで|明け方)/;

function vnDetailNote_(src, day, html) {
  const out = { warn: "", days: "", show: "" };
  try {
    const dre = vnDateRe_(day);
    const host = String(src.url).replace(/^(https?:\/\/[^\/]+).*$/, "$1");
    const links = vnLinks_(html, src.url).filter(function (l) {
      return l.url.indexOf(host) === 0 && l.url !== src.url && l.text;
    }).slice(0, 10);

    let opened = 0;
    for (let i = 0; i < links.length && opened < 4; i++) {
      let res;
      try {
        res = UrlFetchApp.fetch(links[i].url, {
          muteHttpExceptions: true, followRedirects: true,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; TaxiReport/1.0)" }
        });
      } catch (e) { continue; }
      opened++;
      if (res.getResponseCode() !== 200) continue;
      let h2 = "";
      try { h2 = res.getContentText(); } catch (e) { continue; }
      const lines = vnLines_(h2);
      if (!lines.some(function (x) { return dre.test(x); })) continue;   // 今日のページでなければ見ない
      const text = lines.join("　");

      if (!out.warn && VN_NIGHT_WORDS.test(text)) {
        const w = text.match(VN_NIGHT_WORDS)[1];
        out.warn = "⚠️ 詳細に「" + w + "」とあります。" +
                   "こちらの営業時間内にバラシが終わらない見込みです（待たないほうが無難）";
      }
      if (!out.days) {
        const m = text.match(/([0-9１-９]+)\s*日目[^0-9]{0,4}([0-9１-９]+)\s*日間/);
        if (m) out.days = "（" + m[1] + "日目／" + m[2] + "日間）";
        else {
          const m2 = text.match(/(全|計)?\s*([0-9１-９]+)\s*日間/);
          if (m2) out.days = "（全" + m2[2] + "日間）";
        }
      }
      if (!out.show) {
        const m3 = text.match(/(公演|イベント|催事)[名]?\s*[:：]\s*([^　]{2,30})/);
        if (m3) out.show = m3[2].trim();
      }
      if (out.warn && out.days) break;
    }
  } catch (e) {}
  return out;
}

/** その日を表す書き方（9月15日 / 9/15 / 09-15）にあたるか */
function vnDateRe_(d) {
  const m = d.getMonth() + 1, day = d.getDate();
  const p2 = function (n) { return ("0" + n).slice(-2); };
  return new RegExp(
    "(^|[^0-9])(" +
    m + "\\s*月\\s*" + day + "\\s*日" + "|" +
    m + "\\s*[\\/／.]\\s*" + day + "|" +
    p2(m) + "\\s*[\\/／.\\-]\\s*" + p2(day) +
    ")([^0-9]|$)");
}

/** 「何かの日付が書いてある行」か（次の日の始まりを見つけるため） */
function vnAnyDateRe_() {
  return /(\d{1,2}\s*月\s*\d{1,2}\s*日|\d{1,2}\s*[\/／]\s*\d{1,2})/;
}

/** 行のかたまりから、催しの名前になりそうなところを拾う */
function vnTitleOf_(block) {
  let best = "";
  block.join("　").split(/[　|｜/]/).forEach(function (piece) {
    const t = piece.replace(/\s+/g, " ").trim();
    if (t.length < 3 || t.length > 40) return;
    if (/^\d/.test(t)) return;                                  // 日付・時刻だけの断片
    if (/^(開場|開演|開始|終了|終演|キックオフ|試合|予定|詳細|チケット|一覧|カレンダー|お知らせ)$/.test(t)) return;
    if (!/[ぁ-んァ-ヶ一-龥A-Za-z]/.test(t)) return;
    if (t.length > best.length) best = t;
  });
  return best;
}

/** 会場の種類から、終わりのおおよその時刻を見積もる（書いていないとき用） */
function vnGuessEnd_(venue, start) {
  const v = VN_VENUES[venue] || {};
  const h = vnHourOf_(start);
  if (h === null) return "";
  const add = v.type === "スタジアム" ? 2.0
            : v.type === "ドーム" || v.type === "ホール" || v.type === "野外" ? 2.5
            : v.type === "展示場" ? 1.0 : 2.0;
  const t = h + add;
  const hh = Math.floor(t) % 24, mm = Math.round((t % 1) * 60);
  return ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2);
}

/** 1つのサイトから、その日のぶんを読む。戻り値は {events, note} */
function vnScrapeOne_(src, day, htmlIn) {
  const out = { events: [], note: "", size: 0, code: 0 };
  let html = "";
  if (htmlIn) {
    // すでに読んである中身を使う（何日ぶんも調べるとき、同じページを何度も読まないため）
    html = String(htmlIn);
    out.code = 200;
  } else {
    let res;
    try {
      res = UrlFetchApp.fetch(src.url, {
        muteHttpExceptions: true, followRedirects: true,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TaxiReport/1.0)" }
      });
    } catch (e) {
      out.note = "❌ つながりませんでした（" + (e && e.message ? e.message : e) + "）";
      return out;
    }
    out.code = res.getResponseCode();
    try { html = res.getContentText(); }
    catch (e) { try { html = res.getContentText("Shift_JIS"); } catch (e2) { html = ""; } }
  }
  out.size = html.length;
  if (out.code !== 200 || !html) { out.note = "❌ 中身が取れませんでした（" + out.code + "）"; return out; }

  const lines = vnLines_(html);
  const joined = lines.join("").length;
  if (joined < 500) {
    out.note = "❌ 開いたあとに中身を作る作り（JavaScript）のようで、文字が取れません（" + joined + "文字）";
    return out;
  }

  const dre = vnDateRe_(day), any = vnAnyDateRe_();
  const starts = [];
  lines.forEach(function (ln, i) { if (dre.test(ln)) starts.push(i); });
  if (!starts.length) {
    // 一覧に日付が出ない作りのところ（ニューオータニなど）は、催しのページを開いて探す
    if (src.deep) {
      try { out.events = vnScrapeDeep_(src, day, html); } catch (e) {}
      if (out.events.length) return out;
    }
    out.note = "⚠️ その日の日付が見当たりません（ページに載っていないか、日付の書き方が違います）";
    return out;
  }

  starts.slice(0, 5).forEach(function (i) {
    // 日付の行から、次の日付の行の手前まで（最大6行）をひとかたまりとして読む
    const block = [lines[i]];
    for (let j = i + 1; j < lines.length && block.length < 6; j++) {
      if (any.test(lines[j])) break;
      block.push(lines[j]);
    }
    const text = block.join("　");
    const times = (text.match(/\d{1,2}:\d{2}/g) || []);
    let start = "", end = "";
    const kick = text.match(/(キックオフ|開演|試合開始)[^0-9]{0,6}(\d{1,2}:\d{2})/);
    const fin  = text.match(/(終了|終演)[^0-9]{0,6}(\d{1,2}:\d{2})/);
    if (kick) start = kick[2];
    else if (times.length) start = times[0];
    if (fin) end = fin[2];
    else if (times.length >= 2 && times[1] !== start) end = times[1];

    // ★開演も終演も読めないかたまりは、催しとして扱わない。
    //   ページには「9月16日」という文字が、更新日や月間カレンダーの
    //   マス目としても出てくる。それを催しだと思い込んで
    //   「時間不明」で出してしまっていた。
    //   時刻が1つも無いなら、それは催しの行ではない
    if (!start && !end) return;

    let guessed = false;
    if (!end && start) { end = vnGuessEnd_(src.name, start); guessed = !!end; }

    out.events.push({
      venue: src.name, kind: src.kind || "event",
      icon: src.kind === "barasi" ? "🔧" : "🎤",
      title: vnTitleOf_(block) || "（名前を読み取れませんでした）",
      start: start, end: end, endGuess: guessed, people: 0, url: src.url,
      raw: text.slice(0, 120)
    });
  });

  // ★詳細を必ず見る会場（ワントゥワン）は、ここで中まで確かめる
  if (out.events.length && src.detail) {
    try {
      const note = vnDetailNote_(src, day, html);
      out.events.forEach(function (e) {
        if (note.warn) e.warn = note.warn;
        if (note.show) e.title = note.show + (e.title && e.title.indexOf("読み取れません") < 0 ? "／" + e.title : "");
        if (note.days) e.title = String(e.title || "") + note.days;
      });
    } catch (e) {}
  }

  // 一覧のページに時刻が無い会場は、催しのページまで開いて読む
  if (!out.events.length && src.deep) {
    try { out.events = vnScrapeDeep_(src, day, html); } catch (e) {}
  }
  if (!out.events.length) {
    out.note = "⚠️ 日付は見つかりましたが、時刻が読み取れませんでした（時間不明では出しません）";
  }
  return out;
}

/** 全部のサイトから、その日のぶんを読む（vnTodayEvents_ がここを拾う） */
function vnScrapeAll_(day) {
  const out = [];
  VN_SOURCES.forEach(function (src) {
    try {
      vnScrapeOne_(src, day).events.forEach(function (e) { out.push(e); });
    } catch (e) { if (typeof logErr_ === "function") logErr_("vnScrape:" + src.name, e); }
  });
  return out;
}

/**
 * いま何が読み取れているかの一覧。
 * 「読めているつもりで、実は何も読めていない」を防ぐための画面。
 */
function vnReadStatus_(day) {
  const d = day || new Date();
  const L = ["🔎 " + vnDayLabel_(d) + " の読み取り状況", ""];
  let total = 0;

  VN_SOURCES.forEach(function (src) {
    let r;
    try { r = vnScrapeOne_(src, d); }
    catch (e) { r = { events: [], note: "❌ " + (e && e.message ? e.message : e) }; }
    L.push("■ " + src.name);
    if (r.events.length) {
      total += r.events.length;
      L.push("　✅ " + r.events.length + "件 読めました");
      r.events.forEach(function (e) {
        const when = e.start && e.end ? e.start + "〜" + e.end + (e.endGuess ? "(終わりは予想)" : "")
                   : e.start ? e.start + " 開始" : "時間を読み取れず";
        L.push("　・" + e.title + "　" + when);
        L.push("　　（読んだ文字：" + e.raw + "）");
      });
      const kept = r.events.filter(vnInTimeRange_).length;
      if (kept < r.events.length) {
        L.push("　※ このうち " + (r.events.length - kept) + "件は 18:00〜翌04:00 の外なので出しません");
      }
    } else {
      L.push("　" + (r.note || "⚠️ 読めませんでした"));
    }
    L.push("");
  });

  const hotel = vnHotelForDay_(d);
  L.push("■ ホテル（LINEで送られた資料）");
  if (hotel.length) {
    total += hotel.length;
    hotel.forEach(function (h) {
      L.push("　・" + h.venue + "　" + h.title + "　" +
             ([h.start, h.end].filter(String).join("〜") || "時間不明"));
    });
  } else {
    L.push("　まだ届いていません（「↓帝国」と打ってから写真を送ってください）");
  }
  L.push("");
  L.push("合計 " + total + "件 読めました。");
  L.push("※ 中身がおかしければ、そのまま教えてください。読み方を直します。");
  return L.join("\n");
}


/* ============ 事前のお知らせ（3つの受け取り方）============ */
/*
 * 「その日ぜんぶ」を朝に1回もらっても、夜には忘れている。
 * 気になる催しだけ、稼ぎどきの少し前にもう一度知らせる。
 *
 * 受け取り方は3つ。イベントごとにボタンで選ぶ。
 *   ⏰ カレンダー … スマホのカレンダーに予定として入れる
 *                  （Android の標準は「Googleカレンダー」。iPhone でも同じボタンで入る）
 *   💬 Discord   … みんなのDiscordに流す
 *   📱 自分のLINE … 押した人の個人LINEにだけ届く
 *
 * ★知らせるのは「終わりの◯分前」。
 *   稼ぎどきは終演のときなので、始まりではなく終わりを基準にする。
 *   終わりが分からない催しだけ、始まりを基準にする。
 */

/** 何分前に知らせるか（設定「イベントのお知らせは何分前」／既定60分） */
function vnLeadMin_() {
  try {
    if (typeof cfg_ === "function") {
      const v = parseInt(cfg_("イベントのお知らせは何分前"), 10);
      if (v >= 5 && v <= 300) return v;
    }
  } catch (e) {}
  return 60;
}

/** その日のイベントを覚えておく（ボタンが押されたとき、どれのことか分かるように） */
function vnDayKey_(d) {
  return "VNDAY_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}
function vnDaySave_(d, events) {
  const slim = (events || []).map(function (e) {
    return { venue: e.venue, title: e.title, start: e.start, end: e.end, url: e.url };
  });
  try { PropertiesService.getScriptProperties().setProperty(vnDayKey_(d), JSON.stringify(slim)); } catch (e) {}
}
function vnDayLoad_(d) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(vnDayKey_(d)) || "[]"); }
  catch (e) { return []; }
}

/** その催しで「知らせるべき時刻」（終わりの◯分前。分からなければ始まりの◯分前） */
function vnRemindAt_(ev, day) {
  const base = ev.end || ev.start;
  const h = vnHourOf_(base);
  if (h === null) return 0;
  const t = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  // vnHourOf_ は 0〜11時を +24 して返す（翌日あつかい）
  t.setHours(0, 0, 0, 0);
  const ms = t.getTime() + Math.round(h * 60) * 60000 - vnLeadMin_() * 60000;
  return ms;
}

/** Googleカレンダーに予定を入れるためのURL */
function vnCalUrl_(ev, day) {
  const z = function (n) { return ("0" + n).slice(-2); };
  const at = function (hhmm, fallbackHour) {
    const h = vnHourOf_(hhmm);
    const use = (h === null) ? fallbackHour : h;
    // 日本時間 → 世界標準時（9時間ひく）
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    d.setHours(0, 0, 0, 0);
    const ms = d.getTime() + Math.round(use * 60) * 60000 - 9 * 3600000;
    const u = new Date(ms);
    return u.getUTCFullYear() + z(u.getUTCMonth() + 1) + z(u.getUTCDate()) + "T" +
           z(u.getUTCHours()) + z(u.getUTCMinutes()) + "00Z";
  };
  const s = at(ev.start || ev.end, 20);
  const e = at(ev.end || ev.start, 22);
  // ★ここは絵の中のボタンに直に入れる。長いとLINEの1通（10KB）に入らず、
  //   催しが丸ごと消える。入れるのは「題・始まり・終わり・場所」だけにする。
  //   （前は details に乗り場やURLまで入れていて、1件で1,700バイトあった）
  const t = (ev.venue + "　" + String(ev.title || "")).slice(0, 24);
  return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
         "&text=" + encodeURIComponent("🚕" + t) +
         "&dates=" + s + "/" + e +
         "&location=" + encodeURIComponent(ev.venue);
}

/*
 * お知らせのボタン3つ。
 *
 * ★どれも「押したら合図を送るだけ」のボタンにしてある。
 *   カレンダーのリンクをボタンに直接入れると、URLが長いので
 *   1件あたり1,700バイトにもなり、催しが1通に入りきらなくなる。
 *   （実測：見本4件で12,358バイト。LINEの上限は10,000バイト）
 *   押されたあとに、返事としてリンクを送る形にすれば 1件450バイトで済む。
 *   ひと手間増えるが、催しが丸ごと消えるよりずっとよい。
 */
function vnBellBtn_(mark, label, ymd, idx, flex) {
  const b = { "type": "button", "style": "link", "height": "sm", "color": VN_COLOR_HEAD,
              "action": { "type": "postback", "label": label,
                          "data": "vn=" + mark + "&d=" + ymd + "&i=" + idx } };
  if (flex) b.flex = flex;
  return b;
}

/*
 * 通知設定の列。
 *
 * ★ボタンは2つだけにした。
 *   ディスコードは、送り先（ウェブフックURL）を自分で取ってきて
 *   入れてもらわないと届かない。手順が多く、ややこしすぎるのでやめた。
 *   （仕掛けそのものは残してあるので、必要になれば戻せる）
 *
 * ★「通知設定」という言葉は、ボタンの列の中に残す。
 *   上に説明の行を足すと、そのぶん場所を食い、読むものも増えるため。
 */
function vnBellRow_(ev, idx, day) {
  const ymd = day.getFullYear() + ("0" + (day.getMonth() + 1)).slice(-2) + ("0" + day.getDate()).slice(-2);
  return { "type": "box", "layout": "horizontal", "margin": "sm",
    "backgroundColor": "#ffffff", "cornerRadius": "md",
    "borderWidth": "1px", "borderColor": "#b39ddb",
    "contents": [
      { "type": "text", "text": "🔔通知設定", "size": "xxs", "weight": "bold",
        "color": VN_COLOR_HEAD, "gravity": "center", "align": "center", "flex": 3, "wrap": true },
      // ★カレンダーは「押したらその場で開く」形。
      //   合図を返してリンクを送る形だと、もう一度押さないと開けなかった。
      //   終了予定の時刻まで入った予定が、1回押すだけで作れる
      { "type": "button", "style": "link", "height": "sm", "color": VN_COLOR_HEAD, "flex": 4,
        "action": { "type": "uri", "label": "⏰カレンダー", "uri": vnCalUrl_(ev, day) } },
      vnBellBtn_("me", "📱リマインダー", ymd, idx, 4)
    ]};
}

/* ---- 予約のしまい場所 ---- */

function vnRemQueue_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty("VN_REMIND") || "[]"); }
  catch (e) { return []; }
}
function vnRemSave_(list) {
  try {
    PropertiesService.getScriptProperties()
      .setProperty("VN_REMIND", JSON.stringify((list || []).slice(0, 60)));
  } catch (e) {}
}

/** 予約を1つ足す。同じ人・同じ催し・同じ知らせ方なら二重にしない */
function vnRemAdd_(at, how, to, ev) {
  const list = vnRemQueue_();
  const id = how + "|" + to + "|" + ev.venue + "|" + (ev.title || "");
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return false;
  list.push({ id: id, at: at, how: how, to: to,
              venue: ev.venue, title: ev.title || "", start: ev.start || "", end: ev.end || "",
              url: ev.url || "" });
  vnRemSave_(list);
  return true;
}

/** 知らせる文 */
function vnRemText_(r) {
  const v = VN_VENUES[r.venue] || {};
  const when = r.end ? r.end + " 終了予定" : (r.start ? r.start + " 開始" : "時間不明");
  return "⏰ 早くなんとかしないと…\n" +
         "🎪 " + r.venue + (r.title ? "　" + r.title : "") + "\n" +
         "🕒 " + when + "\n" +
         (v.near && v.near.length ? "📍 近い乗り場：" + v.near.join("・") + "\n" : "") +
         (r.url ? r.url : "");
}

/** Discord に流す（送り先は スクリプトプロパティ DISCORD_WEBHOOK にだけ置く） */
function vnDiscord_(text) {
  const url = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK") || "";
  if (!url) return "Discordの送り先が未設定です（メニュー「💬 Discordの送り先を設定」）";
  try {
    const res = UrlFetchApp.fetch(url, {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ content: text })
    });
    const c = res.getResponseCode();
    return (c >= 200 && c < 300) ? "" : "Discordに送れませんでした（" + c + "）";
  } catch (e) { return "Discordに送れませんでした（" + (e && e.message ? e.message : e) + "）"; }
}

/** 時間が来た予約を送る。5分おきの見張りから呼ばれる */
function vnRemindTick_() {
  const list = vnRemQueue_();
  if (!list.length) return;
  const now = Date.now();
  const keep = [];
  list.forEach(function (r) {
    if (r.at > now) { keep.push(r); return; }
    // 3時間以上すぎたものは、もう送らない（止まっていた間のぶんが一気に飛ばないように）
    if (now - r.at > 3 * 3600000) return;
    try {
      if (r.how === "dc") vnDiscord_(vnRemText_(r));
      else if (typeof lrPush_ === "function") lrPush_(r.to, [{ type: "text", text: vnRemText_(r) }]);
    } catch (e) { if (typeof logErr_ === "function") logErr_("vnRemind", e); }
  });
  vnRemSave_(keep);
}

/**
 * ボタンが押されたときの受け口（001-Code のウェブフックから呼ばれる）。
 * 扱ったら true。
 */
function vnHandlePostback_(ev) {
  const data = (ev && ev.postback && ev.postback.data) || "";
  if (String(data).indexOf("vn=") !== 0) return false;
  const q = {};
  String(data).split("&").forEach(function (kv) {
    const i = kv.indexOf("=");
    if (i > 0) q[kv.slice(0, i)] = kv.slice(i + 1);
  });
  const reply = (ev && ev.replyToken) || "";
  const say = function (t) { if (typeof lineReply_ === "function") lineReply_(reply, t); };

  const ymd = String(q.d || "");
  if (!/^\d{8}$/.test(ymd)) { say("わけがわからない…　どの日のことでしょう"); return true; }
  const day = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));

  // 確認用の【はい】…このまま17:00にグループへ
  if (q.vn === "ok") {
    try { PropertiesService.getScriptProperties().setProperty("VNOK_" + ymd, "1"); } catch (e) {}
    say("計★画★通★り　17:00 にグループへ送ります");
    return true;
  }
  // 確認用の【いいえ】…直し方をお伝えして、返信を待つ
  if (q.vn === "ng") {
    try { PropertiesService.getScriptProperties().setProperty("VNOK_" + ymd, "0"); } catch (e) {}
    say(vnTestHelpText_());
    return true;
  }

  const list = vnDayLoad_(day);
  const item = list[Number(q.i)];
  if (!item) { say("だ…ダメだ…その催しが見つからない…"); return true; }

  // ⏰ カレンダー … いまは「押したらその場で開く」ボタンにしてある。
  //   古い絵から押されたときのために、ここも残しておく
  if (q.vn === "cal") {
    say("⏰ " + vnCalUrl_(item, day));
    return true;
  }

  const at = vnRemindAt_(item, day);
  if (!at) { say("⏰ だ…ダメだ…時間が分からない…"); return true; }

  const lead = vnLeadMin_();
  const base = item.end ? "終了予定" : "始まり";
  if (at <= Date.now()) {
    // もう過ぎている。いま1回だけ送る
    const r = { how: q.vn, to: (ev.source && ev.source.userId) || "", venue: item.venue,
                title: item.title, start: item.start, end: item.end, url: item.url };
    const err = (q.vn === "dc") ? vnDiscord_(vnRemText_(r))
              : (typeof lrPush_ === "function" && r.to) ? (lrPush_(r.to, [{ type: "text", text: vnRemText_(r) }]), "")
              : "送り先が分かりませんでした";
    say(err ? "⚠️ " + err : "⏰ その時刻は過ぎていたので、いまお届けしました");
    return true;
  }

  const to = (q.vn === "dc") ? "discord" : ((ev.source && ev.source.userId) || "");
  if (q.vn === "me" && !to) { say("うわあああ!!!! 送り先が分からない!!!!"); return true; }
  const added = vnRemAdd_(at, q.vn, to, item);
  const hhmm = ("0" + new Date(at).getHours()).slice(-2) + ":" + ("0" + new Date(at).getMinutes()).slice(-2);
  const mins = Math.max(1, Math.round((at - Date.now()) / 60000));
  if (!added) { say("🔔 そのリマインダーは、もう入っています"); return true; }

  // ★返事は1回だけ。これ以上は送らない（うまくいっているのに何度も鳴らさない）
  if (q.vn === "dc") {
    // ディスコードは、送り先（Webhook）が入っていないと届かない。
    // 入っていないなら、そのことだけを はっきり伝える
    let ok = "";
    try { ok = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK") || ""; } catch (e) {}
    if (!ok) {
      say("⚠️ ﾃﾞｨｽｺｰﾄﾞの送り先が、まだ入っていません。\n" +
          "ﾃﾞｨｽｺｰﾄﾞのアプリで 通知したいチャンネル →\n" +
          "「チャンネルの編集」→「連携サービス」→「ウェブフック」→\n" +
          "「新しいウェブフック」→「ウェブフックURLをコピー」\n" +
          "そのURLを、まーくさんに渡してください。\n" +
          "入れば、" + hhmm + " に自動で届きます。\n" +
          "https://discord.com/app");
      return true;
    }
    say("⏰ 通知設定をしました。\n" +
        hhmm + "（" + item.venue + " の" + base + "の" + lead + "分前）に\n" +
        "ﾃﾞｨｽｺｰﾄﾞへ自動で届きます。\n" +
        "https://discord.com/app");
    return true;
  }
  say("🔔 リマインダーを入れました。\n" +
      hhmm + "（" + item.venue + " の" + base + "の" + lead + "分前）に\n" +
      "このLINEへ自動で届きます。");
  return true;
}

/** Discordの送り先を決める（メニュー） */
function menuVenueDiscord() {
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return "画面から実行してください"; }
  const now = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK") || "";
  const r = ui.prompt("💬 Discordの送り先",
    "Discord の チャンネル設定 → 連携サービス → ウェブフック で作った URL を貼ってください。\n" +
    "（空のまま OK を押すと、Discordへの通知を止めます）\n\n" +
    "いま：" + (now ? "設定ずみ" : "未設定"), ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return "そのままにしました";
  const v = String(r.getResponseText() || "").trim();
  const pr = PropertiesService.getScriptProperties();
  if (!v) { pr.deleteProperty("DISCORD_WEBHOOK"); return "💬 Discordへの通知を止めました"; }
  if (v.indexOf("https://discord.com/api/webhooks/") !== 0 &&
      v.indexOf("https://discordapp.com/api/webhooks/") !== 0) {
    ui.alert("⚠️ これは Discord のウェブフックのURLではないようです。\n" +
             "https://discord.com/api/webhooks/… で始まるものを貼ってください。");
    return "❌ 入れませんでした";
  }
  pr.setProperty("DISCORD_WEBHOOK", v);
  const err = vnDiscord_("✅ つながりました（テスト送信）");
  ui.alert(err ? "入れましたが、送れませんでした：\n" + err
               : "✅ 入れました。Discordにテストを1件送りました。");
  return err ? "⚠️ " + err : "✅ Discordの送り先を入れました";
}


/* ============ その日の分をそろえる ============ */

/** イベント1件に、実績・推定・助言を足す */
function vnDecorate_(e) {
  const v = VN_VENUES[e.venue] || {};
  const st = vnPlaceStats_(v.near, VN_FROM_HOUR, VN_TO_HOUR);
  const c = {};
  for (const k in e) c[k] = e[k];
  c.stats  = vnStatsLine_(st) || "自社の記録：この乗り場の記録はまだありません";
  c.advice = vnAdvice_(e.venue, e.end, st);
  try {
    const ti = vnTopicInfo_(e.title, e.venue);
    c.guess = ti.audience; c.know = ti.know; c.avoid = ti.avoid;
  } catch (err) { c.guess = ""; c.know = ""; c.avoid = ""; }
  return c;
}

/**
 * その日に出すイベントをそろえる。
 *
 * いまのところ、確かに取れるのは「LINEで送ってもらったホテルの資料」だけ。
 * ホームページの読み取りは [9] の調査結果を見てから作る。
 * 作ったら vnScrapeAll_ という名前で足せば、ここが勝手に拾う。
 */
function vnTodayEvents_(day) {
  let out = [];
  try { out = out.concat(vnHotelForDay_(day)); } catch (e) { if (typeof logErr_ === "function") logErr_("vnHotel", e); }
  // 写真から読んだ会場の月間表（フェスティバルホールなど）
  try { out = out.concat(vnHallForDay_(day)); } catch (e) { if (typeof logErr_ === "function") logErr_("vnHall", e); }
  if (typeof vnScrapeAll_ === "function") {
    try { out = out.concat(vnScrapeAll_(day) || []); } catch (e) { if (typeof logErr_ === "function") logErr_("vnScrape", e); }
  }
  // 時刻の関所は2回通す。集める側で1回はじくだけでは、取りこぼしが出る
  return out.filter(vnHasTime_).filter(vnInTimeRange_).filter(vnBigEnough_).map(vnDecorate_);
}


/* ================================================================
 *  確認用（16:30）と、その手直し
 *
 *  ★グループに出ていくものを、人の目を通さずに送らない。
 *    16:30 にまーくさんだけへ、番号つきで送る。
 *    見て、いらないものを「①削除」、直したいものを「①修正：〜」と返すと、
 *    その場で直した確認用をもう一度送る。
 *    17:00 に、その直したものがグループへ出る。
 * ================================================================ */

/** ①②③…の記号（20をこえたら「(21)」のように書く） */
function vnNoMark_(n) {
  const i = Number(n) || 0;
  return (i >= 1 && i <= 20) ? String.fromCharCode(0x2460 + i - 1) : "(" + i + ")";
}

/** ①②③…や 1,3 のような書き方を、数の並びにする */
function vnNoParse_(text) {
  const out = [];
  String(text || "").replace(/[\u2460-\u2473]/g, function (c) {
    out.push(c.charCodeAt(0) - 0x2460 + 1); return c;
  });
  // 半角・全角の数字も受ける（「1削除」「1,3削除」「1、3削除」）
  String(text || "").replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/\d+/g, function (d) { out.push(parseInt(d, 10)); return d; });
  // 同じ番号は1つにして、小さい順に
  return Array.from(new Set(out)).filter(function (n) { return n >= 1; }).sort(function (a, b) { return a - b; });
}

/** その日の「手直し中の一覧」をしまう鍵 */
function vnEditKey_(d) {
  return "VNEDIT_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

function vnEditLoad_(d) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(vnEditKey_(d)) || "null"); }
  catch (e) { return null; }
}

function vnEditSave_(d, list) {
  try { PropertiesService.getScriptProperties().setProperty(vnEditKey_(d), JSON.stringify(list || [])); }
  catch (e) {}
}

/**
 * その日のグループに出す一覧。
 * 手直ししたものがあればそれを、無ければ読み取ったままを返す。
 */
function vnFinalEvents_(d) {
  const edited = vnEditLoad_(d);
  if (edited && edited.length >= 0 && Array.isArray(edited)) return edited;
  return vnTodayEvents_(d);
}

/** 日付を YYYYMMDD の文字にする（ボタンに入れて、あとで引くため） */
function vnYmd_(d) {
  return d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

/**
 * 確認用のしめくくり。「この内容でよろしいですか」＋【はい】【いいえ】。
 *
 * ★長い説明を毎回ならべると、読むのが面倒になって、結局読まれない。
 *   ふだんは【はい】を押すだけで終わるようにして、
 *   直したいときだけ【いいえ】で手順を出す。
 */
function vnTestAskBox_(day) {
  const ymd = vnYmd_(day);
  return { "type": "box", "layout": "vertical", "backgroundColor": "#fff8e1",
    "paddingAll": "10px", "cornerRadius": "md", "margin": "md", "contents": [
      { "type": "text", "text": "🧪 確認用（まーくさんにだけ送っています）",
        "size": "xs", "weight": "bold", "color": "#e65100", "wrap": true },
      { "type": "text", "text": "この内容でよろしいですか？",
        "size": "sm", "weight": "bold", "color": "#e65100", "wrap": true, "margin": "sm" },
      { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "sm", "contents": [
        { "type": "button", "style": "primary", "height": "sm", "color": "#2e7d32",
          "action": { "type": "postback", "label": "はい", "data": "vn=ok&d=" + ymd,
                      "displayText": "はい" } },
        { "type": "button", "style": "primary", "height": "sm", "color": "#b71c1c",
          "action": { "type": "postback", "label": "いいえ", "data": "vn=ng&d=" + ymd,
                      "displayText": "いいえ" } }
      ]},
      { "type": "text", "size": "xxs", "color": "#8d6e63", "wrap": true, "margin": "sm",
        "text": "何も押さなくても、17:00 にこの内容でグループへ送ります" }
    ]};
}

/** 【いいえ】のときに出す、直し方の手順 */
function vnTestHelpText_() {
  return "わ…私は仰せの通りに…　直し方はこちらです\n" +
         "\n" +
         "「①削除」… ①を消します\n" +
         "「①③削除」… まとめて消せます（「1,3削除」でも可）\n" +
         "「①修正：雨天中止」… ①に、その言葉を書き足します\n" +
         "「もどす」… 手直しを全部やめて、読み取ったままに戻します\n" +
         "「全削除」… 今日はグループへ送りません\n" +
         "\n" +
         "返信をいただいたら、直したものを もう一度お送りします。\n" +
         "※ 開演・終演の時刻が読めなかったものは、はじめから出していません";
}

/**
 * 確認用を、まーくさんだけに送る。
 * 送った一覧は覚えておく（番号で指せるように）。
 */
function vnSendTest_(d, list) {
  const to = vnTestTarget_();
  if (!to || typeof lrPush_ !== "function") return false;
  const evs = (list || []).map(function (e, i) {
    const c = {}; for (const k in e) c[k] = e[k];
    c.no = i + 1;                       // ①②③… の番号を振る
    return c;
  });
  vnEditSave_(d, evs);
  const msgs = vnFitMessages_(d, evs, "", 700);   // 700バイトは「よろしいですか」のぶん
  // 「この内容でよろしいですか」は、いちばん下（読み終わったところ）に置く
  try {
    const b = msgs[0] && msgs[0].contents;
    if (b && b.body && b.body.contents) b.body.contents.push(vnTestAskBox_(d));
  } catch (e) {}
  lrPush_(to, msgs);
  return true;
}

/**
 * 確認用への返信（「①削除」「①修正：〜」など）を受ける。
 * 扱ったら true。
 *
 * ★まーくさん以外からは受けない。
 *   グループの誰かが「①削除」と打っただけで消えては困る。
 */
function vnHandleEditCmd_(ev, sentAt) {
  const text = String((ev.message && ev.message.text) || "").trim();
  if (!text) return false;
  const uid = (ev.source && ev.source.userId) || "";
  const me = vnTestTarget_();
  if (!me || uid !== me) return false;

  const d = sentAt || new Date();
  const reply = ev.replyToken || "";
  const say = function (t) { if (typeof lineReply_ === "function") lineReply_(reply, t); };

  const flat = text.replace(/[\s\u3000]/g, "");

  /* --- 個人LINEから、その場でグループへ出す（必ず2段階で確かめる） --- */
  if (/^(グループへ送信|グループ送信|グループに送信|本番送信)$/.test(flat)) {
    const list = vnFinalEvents_(d);
    if (!list.length) { say("🔍 だ…ダメだ…今日は出せるイベントがありません"); return true; }
    try { CacheService.getScriptCache().put("VNPUSHOK_" + uid, vnYmd_(d), 300); } catch (e) {}
    say("⚠️ グループへ送ります。よろしいですか\n" +
        "件数：" + list.length + "件\n" +
        "・送ると取り消せません\n" +
        "・よければ5分以内に「はい」と返してください（やめるときは何もしないでください）");
    return true;
  }
  if (/^(はい|ハイ|OK|ok|送る)$/.test(flat)) {
    let ok = "";
    try { ok = CacheService.getScriptCache().get("VNPUSHOK_" + uid) || ""; } catch (e) {}
    if (ok !== vnYmd_(d)) return false;              // 確かめていないなら、ただの雑談
    try { CacheService.getScriptCache().remove("VNPUSHOK_" + uid); } catch (e) {}
    const to = vnGroupTarget_();
    if (!to) { say("🔍 わけがわからない…　グループの送り先が分かりません"); return true; }
    const list = vnFinalEvents_(d);
    if (!list.length) { say("🔍 だ…ダメだ…今日は出せるイベントがありません"); return true; }
    const clean = list.map(function (e) {
      const c = {}; for (const k in e) { if (k !== "no") c[k] = e[k]; }
      return c;
    });
    vnDaySave_(d, clean);
    if (typeof lrPush_ === "function") lrPush_(to, vnFitMessages_(d, clean, ""));
    // 17:00 に二度送らないよう、送った印も残す
    try { PropertiesService.getScriptProperties().setProperty(vnSentKey_(d), "1"); } catch (e) {}
    say("計★画★通★り　グループへ送りました（" + clean.length + "件）");
    return true;
  }

  // 「もどす」… 読み取ったままに戻す
  if (/^(もどす|戻す|リセット|やり直し|やりなおし)$/.test(text.replace(/[\s\u3000]/g, ""))) {
    const fresh = vnTodayEvents_(d);
    if (!vnSendTest_(d, fresh)) { say("🔍 わけがわからない…　確認用の送り先が分かりません"); return true; }
    say("わ…私は仰せの通りに…　読み取ったままに戻しました（" + fresh.length + "件）");
    return true;
  }

  // 「全削除」… 今日はグループへ送らない
  if (/^(全削除|ぜんぶ削除|全部削除|今日はなし|送らない)$/.test(text.replace(/[\s\u3000]/g, ""))) {
    vnEditSave_(d, []);
    say("削除削除削除削除　今日はグループへ送りません");
    return true;
  }

  const cur = vnEditLoad_(d);
  if (!cur) return false;              // 確認用をまだ送っていない

  // 「①修正：〜」
  const fix = text.match(/^([^:：]*)[:：](.+)$/);
  if (fix && /(修正|訂正|直し|なおし|補足)/.test(fix[1])) {
    const ns = vnNoParse_(fix[1]);
    if (!ns.length) { say("🔍 わけがわからない…　番号が読み取れません（例：①修正：雨天中止）"); return true; }
    const add = fix[2].trim();
    let hit = 0;
    ns.forEach(function (n) {
      const t = cur[n - 1];
      if (!t) return;
      t.note = add;                    // 書き足し（元の中身は消さない）
      hit++;
    });
    if (!hit) { say("🔍 わけがわからない…　その番号は一覧にありません"); return true; }
    vnSendTest_(d, cur);
    say("ノートに書きました。" + ns.map(vnNoMark_).join("") + " に「" + add + "」を足しました");
    return true;
  }

  // 「①削除」「①③削除」
  if (/(削除|消して|けして|カット|いらない)/.test(text)) {
    const ns = vnNoParse_(text);
    if (!ns.length) { say("🔍 わけがわからない…　番号が読み取れません（例：①削除）"); return true; }
    const del = {};
    ns.forEach(function (n) { if (cur[n - 1]) del[n] = 1; });
    if (!Object.keys(del).length) { say("🔍 わけがわからない…　その番号は一覧にありません"); return true; }
    const left = cur.filter(function (x, i) { return !del[i + 1]; });
    vnSendTest_(d, left);
    say("削除削除削除削除　" + ns.map(vnNoMark_).join("") + " を消しました（残り" + left.length + "件）");
    return true;
  }

  return false;
}

/* ============ 毎日17:00の自動発信 ============ */
/*
 * ★グループに出ていくものなので、いちばん厳しくしてある。
 *   ・スイッチが「はい」のときしか送らない（はじめは切ってある）
 *   ・その日の分が1件も無ければ、1通も送らない（空の通知で鳴らさない）
 *   ・同じ日に二度送らない（送った印を残す）
 *   ・送り先が分からなければ送らない。友だち全員への配信は絶対にしない
 */

/** 自動発信が入っているか */
function vnAutoOn_() {
  const p = PropertiesService.getScriptProperties().getProperty("VN_AUTO");
  if (p === "1") return true;
  if (p === "0") return false;
  try { if (typeof cfg_ === "function") return cfg_("イベント情報を自動で送る") === "はい"; } catch (e) {}
  return false;                       // 何も決まっていなければ「送らない」
}

/** 自動発信の入切（true で入、false で切） */
function vnAutoSet_(on) {
  PropertiesService.getScriptProperties().setProperty("VN_AUTO", on ? "1" : "0");
  if (on) vnEnsureDailyTrigger_(false);
  return on;
}

/** 「もう今日は送った」の印 */
function vnSentKey_(d) {
  return "VNSENT_" + d.getFullYear() +
         ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
}

/**
 * 15分おきに呼ばれて、16:30 に確認用を、17:00 にグループ用を1回ずつ送る。
 *
 * Apps Script の「毎日この時刻」は前後に30分ほどずれることがあるため、
 * 時計を見る形にしてある（確認用16:30〜、グループ17:00〜17:15ごろ）。
 */
function venueDailyJob() {
  let lock = null;
  try {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;
  } catch (e) { lock = null; }
  try {
    // ★見張りは、こちらで勝手にそろえる。
    //   「入れ替えたあと、一度どこかを押してください」とお願いするのは、
    //   忘れたときに黙って動かなくなるので、やり方として間違っている。
    //   1日1回だけ確かめて、足りないものがあれば自分で作る。
    try { vnSelfHeal_(); } catch (e) { if (typeof logErr_ === "function") logErr_("vnSelfHeal", e); }

    // ★お知らせの予約は、自動発信が切ってあっても届ける。
    //   これは「自分で押した人」への約束なので、全体の入切とは別。
    try { vnRemindTick_(); } catch (e) { if (typeof logErr_ === "function") logErr_("vnRemindTick", e); }

    if (!vnAutoOn_()) return;

    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const pr = PropertiesService.getScriptProperties();

    /* --- ① 16:30 まーくさんだけへ、確認用（番号つき） --- */
    const tFrom = VN_TEST_HOUR * 60 + VN_TEST_MIN;
    const tKey = vnSentKey_(now) + "_T";
    // 16:30 を過ぎていて、まだ確認用を送っていなければ、まず確認用を送る
    if (mins >= tFrom && !pr.getProperty(tKey)) {
      const list = vnTodayEvents_(now);
      // 1件も無い日は、確認用も送らない（何も無いのに鳴らさない）
      if (!list.length) { pr.setProperty(tKey, "none"); vnEditSave_(now, []); }
      else if (vnSendTest_(now, list)) pr.setProperty(tKey, "1");
      return;                        // 確認用を送った回は、ここで終わる
    }

    /* --- ② 17:00 手直しが済んだものを、グループへ --- */
    const from = VN_SEND_HOUR * 60 + VN_SEND_MIN;
    if (mins < from || mins > from + VN_SEND_WINDOW) return;

    const key = vnSentKey_(now);
    if (pr.getProperty(key)) return;                    // その日はもう済んでいる
    // ★確認用が出ていない日は、グループへは絶対に送らない。
    //   人の目を通していないものを、みんなに流さないための最後の関所
    if (!pr.getProperty(tKey)) return;

    // ★確認用で手直ししたものがあれば、必ずそちらを使う。
    //   「①削除」と言われたものが、そのままグループへ出ていってはいけない。
    // ★【はい】が押されていなくても送る。
    //   寝ていて見られないこともある。そのときは止めるより、
    //   いちばん新しい内容のまま出すほうがよい、という決めごと
    //   （「全削除」と言われた日だけは、1件も無いので送らない）
    const events = vnFinalEvents_(now);
    if (!events.length) { pr.setProperty(key, "none"); return; }   // 無い日は送らない

    const to = vnGroupTarget_();
    if (!to) {
      if (typeof logErr_ === "function") logErr_("eventDaily", new Error("グループの送り先が分かりません"));
      return;                                            // 印は残さない（分かったら送れるように）
    }
    if (typeof lrPush_ !== "function") return;
    // 本番には番号を出さない（確認用だけのもの）
    const clean = events.map(function (e) {
      const c = {}; for (const k in e) { if (k !== "no") c[k] = e[k]; }
      return c;
    });
    vnDaySave_(now, clean);          // ボタンが押されたとき、どの催しか引けるように
    lrPush_(to, vnFitMessages_(now, clean, ""));
    pr.setProperty(key, "1");
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("eventDaily", e);
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (e) {} }
  }
}

/**
 * 足りない見張りを、自分でそろえる（1日1回だけ確かめる）。
 *
 * ★新しい見張り（レポートの確認用＝毎月16日 AM3:00 など）を足したとき、
 *   「入れ替えたあと、一度そうさボタンを押してください」とお願いしていた。
 *   これは忘れたときに、黙って動かなくなる。お願いするほうが間違っている。
 *   15分おきに動くこの見張りから、1日1回だけ点検して、自分で作る。
 *
 *   ※1日1回に絞るのは、Googleが1日にくれる「動いてよい時間」を
 *     使い切らないため（前に使い切って、見張りごと止まったことがある）。
 */
function vnSelfHeal_() {
  const pr = PropertiesService.getScriptProperties();
  const now = new Date();
  const ymd = now.getFullYear() + ("0" + (now.getMonth() + 1)).slice(-2) + ("0" + now.getDate()).slice(-2);
  if (pr.getProperty("VN_HEAL_YMD") === ymd) return false;
  pr.setProperty("VN_HEAL_YMD", ymd);            // 何があっても、その日はもうやらない

  let made = [];
  // 自分（イベント）の見張り
  try { if (vnEnsureDailyTrigger_(false)) made.push("イベントの見張り"); } catch (e) {}
  // レポートの本番（毎月16日 5:30）
  try {
    if (typeof ensureAutoReportTrigger_ === "function" && ensureAutoReportTrigger_(false)) made.push("レポート本番");
  } catch (e) {}
  // レポートの確認用（毎月16日 3:00）
  try {
    if (typeof ensureAutoReportTestTrigger_ === "function" && ensureAutoReportTestTrigger_(false)) made.push("レポート確認用");
  } catch (e) {}
  // 毎日17時の自動チェック（001-Code）
  try {
    if (typeof ensureAutoFormatTrigger_ === "function") ensureAutoFormatTrigger_();
  } catch (e) {}

  if (made.length && typeof logErr_ === "function") {
    console.log("見張りを作り直しました：" + made.join("・"));
  }
  return made.length > 0;
}

/** 5分おきの見張りを用意する（重ねて作らない） */
function vnEnsureDailyTrigger_(force) {
  let list = [];
  try { list = ScriptApp.getProjectTriggers(); } catch (e) { return false; }
  let keep = null;
  list.forEach(function (t) {
    const fn = t.getHandlerFunction();
    // V006ver で名前が変わった。前の名前のままの見張りは迷子なので消す
    if (fn === "eventDailyJob") { try { ScriptApp.deleteTrigger(t); } catch (e) {} return; }
    if (fn !== "venueDailyJob") return;
    if (keep || force) { try { ScriptApp.deleteTrigger(t); } catch (e) {} }
    else keep = t;
  });
  if (keep && !force) return true;
  try {
    // ★15分おき。5分おきにすると、1日に288回も動く。
    //   Googleが1日にくれる「決められた時間」は決まっていて、
    //   1分おきのボタンの見張りと合わせると使い切ってしまい、
    //   見張りごと止まってしまう（実際に止まった）。
    ScriptApp.newTrigger("venueDailyJob").timeBased().everyMinutes(15).create();
    return true;
  } catch (e) {
    if (typeof logErr_ === "function") logErr_("vnTrigger", e);
    return false;
  }
}

/** いまの状態を、そのまま読める文にする */
function vnAutoStatusText_() {
  const L = [];
  const on = vnAutoOn_();
  L.push(on ? "✅ 自動発信：入っています" : "⏸ 自動発信：切ってあります");
  L.push("送る時刻：毎日 " + VN_SEND_HOUR + ":" + ("0" + VN_SEND_MIN).slice(-2) +
         "（実際に届くのは " + VN_SEND_HOUR + ":" + ("0" + VN_SEND_MIN).slice(-2) +
         "〜" + (VN_SEND_HOUR + 1) + ":00 ごろ）");
  L.push("その日に出すものが1件も無ければ、1通も送りません");

  let has = false;
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === "venueDailyJob") has = true;
    });
  } catch (e) {}
  L.push(has ? "時計の見張り：✅ できています（15分おき）"
             : "時計の見張り：❌ ありません（入にすると作られます）");

  const to = vnGroupTarget_();
  L.push(to ? "送り先：✅ グループを覚えています" : "送り先：❌ 分かりません（グループLINEに何か1つ投稿すると覚えます）");

  const today = vnTodayEvents_(new Date());
  L.push("きょう出せるもの：" + today.length + "件" +
         (today.length ? "（" + today.map(function (e) { return e.venue; }).join("・") + "）" : ""));
  if (typeof vnScrapeAll_ !== "function") {
    L.push("※ ホームページの読み取りはまだ作っていません。いまはLINEで送ったホテルの資料だけが出ます。");
  }
  return L.join("\n");
}


/* ============ メニュー／そうさボタン ============ */

/**
 * そうさボタン [9] の中身。
 * 結果らんに出しつつ、自分のLINEにも送る（グループには絶対に送らない）。
 */
function panelVenueProbe() {
  const r = vnProbeSendToMe();
  const head = r.err
    ? "⚠️ 自分のLINEには送れませんでした：" + r.err
    : "📱 同じ内容を、まーく個人のLINEにだけ送りました（テスト送信）";
  return head + "\n\n" + r.text;
}

/**
 * きょう17:00に出るはずのものを、そのまま自分のLINEにだけ送ってみる（テスト）。
 * グループに出す前に、本物と同じ中身を自分の目で確かめられる。
 */
function menuVenueTestSend() {
  const err = vnSendTodayToMe();
  const n = vnTodayEvents_(new Date()).length;
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🧪 イベント情報のテスト送信",
      err ? "送れませんでした：\n" + err
          : "まーく個人のLINEにだけ送りました（きょうの分：" + n + "件）。\n" +
            "グループには送っていません。",
      ui.ButtonSet.OK);
  } catch (e) {}
  return err ? "❌ " + err
             : "🧪 きょうの分（" + n + "件）を、まーく個人のLINEにだけ送りました（グループには送っていません）";
}

/** 見本のイベント情報を、自分のLINEにだけ送る（メニュー） */
function menuVenueSample() {
  const err = vnSendSampleToMe();
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🎪 イベント情報の見本",
      err ? "送れませんでした：\n" + err
          : "まーく個人のLINEにだけ送りました。\n見た目を見て、直したいところを教えてください。",
      ui.ButtonSet.OK);
  } catch (e) {}
  return err ? "❌ " + err : "🎪 見本をまーく個人のLINEにだけ送りました（グループには送っていません）";
}

/** メニューから調べる（結果は自分のLINEにも送る） */
function menuVenueProbe() {
  const r = vnProbeSendToMe();
  const text = (r.err ? "⚠️ 自分のLINEには送れませんでした：" + r.err
                      : "📱 同じ内容を、まーく個人のLINEにだけ送りました") + "\n\n" + r.text;
  try { infoSet_(INFO_ROW.EVENT, text, "イベント調査"); } catch (e) {}
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🔎 イベント情報の調査", text.slice(0, 1400), ui.ButtonSet.OK);
  } catch (e) {}
  return text;
}


/* ============ 自動発信の入切（ボタン・メニュー）============ */

/**
 * そうさボタン [11] の中身。
 *
 * ★グループに出ていくものを入切するボタンなので、1回押しただけでは変わらない。
 *   1回目は、いまの状態を見せるだけ。
 *   3分以内にもう一度チェックしたときに、はじめて切り替わる。
 *   （[5] のグループ送信と同じ決まりにしてある）
 */
function panelVenueAuto() {
  const c = CacheService.getScriptCache();
  const on = vnAutoOn_();
  const want = on ? "切る" : "入れる";

  if (c.get("VN_AUTO_STEP") === (on ? "off" : "on")) {
    c.remove("VN_AUTO_STEP");
    vnAutoSet_(!on);
    return (on ? "⏸ 自動発信を切りました。"
               : "✅ 自動発信を入れました。") +
      "\n\n" + vnAutoStatusText_();
  }

  c.put("VN_AUTO_STEP", on ? "off" : "on", 180);
  return vnAutoStatusText_() +
    "\n\n──────\n" +
    "▶ " + want + "には、3分以内にもう一度チェックしてください。\n" +
    "（1回押しただけでは変わりません。グループに出ていくものなので、わざと2回にしています）";
}

/** メニューから、自動発信の状態を見る／入切する */
function menuVenueAuto() {
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return vnAutoStatusText_(); }
  const res = ui.alert("🎪 イベント情報の自動発信",
    vnAutoStatusText_() + "\n\n──────────\n「はい」で入れます。「いいえ」で切ります。",
    ui.ButtonSet.YES_NO_CANCEL);
  if (res === ui.Button.YES) {
    vnAutoSet_(true);
    ui.alert("✅ 入れました", vnAutoStatusText_(), ui.ButtonSet.OK);
    return "✅ 入れました";
  }
  if (res === ui.Button.NO) {
    vnAutoSet_(false);
    ui.alert("⏸ 切りました", vnAutoStatusText_(), ui.ButtonSet.OK);
    return "⏸ 切りました";
  }
  return "そのままにしました";
}

/**
 * 「きょう送るはずのもの」を、自分のLINEにだけ送ってみる。
 * グループに出す前に、中身を自分の目で確かめるための道。
 */
function vnSendTodayToMe() {
  const day = new Date();
  const events = vnTodayEvents_(day);
  const to = vnTestTarget_();
  if (!to) return "自分の送り先が分かりません（設定タブ「テスト送信先（自分のLINE）」）";
  if (typeof lrPush_ !== "function") return "003-LineReport が古いので送れません";
  const note = "※ これはテスト送信です（まーく個人のみ）。グループには送っていません。";
  try {
    vnDaySave_(day, events);
    lrPush_(to, vnFitMessages_(day, events, note));
    return "";
  } catch (e) { return (e && e.message ? e.message : String(e)); }
}


/* ============ [13] 読み取れているものの一覧 ============ */

/**
 * いま何が読み取れているかを、そのまま見せる。
 *
 * ★「動いているつもりで、実は何も読めていない」がいちばん怖い。
 *   読んだ元の文字までそのまま出すので、外していれば目で分かる。
 */
function panelVenueList() {
  const text = vnReadStatus_(new Date());
  const err = vnSend_(text, "test");
  return (err ? "⚠️ 自分のLINEには送れませんでした：" + err
              : "📱 同じ内容を、まーく個人のLINEにだけ送りました") + "\n\n" + text;
}

/** メニューからも見られるようにする */
function menuVenueList() {
  const text = vnReadStatus_(new Date());
  const err = vnSend_(text, "test");
  try { infoSet_(INFO_ROW.READ, text, "読み取り状況"); } catch (e) {}
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert("🔎 読み取れているものの一覧", text.slice(0, 1400), ui.ButtonSet.OK);
  } catch (e) {}
  return err ? "❌ " + err : text;
}
