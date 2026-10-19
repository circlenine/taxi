# -*- coding: utf-8 -*-
"""
だいちゃん情報合算版の絵（LINE Flex）を作る道具。

  python3 tools/make_flex.py        → errand.json を書き出す
  node gas/test/flex.test.js        → 出す前に、かならず通す

★作りの決まりは FLEX.md に書いてあります。作る前に読んでください。
★1枚目は「要点」（1件3行・これだけで走れる）
  2枚目は「詳しい版」（だいちゃんの文そのまま・根拠・注意書き）
★EVENTS を差し替えるだけで、次の日のぶんが作れます。
"""
import json, io, datetime

NAVY="#1b2430"; RED="#b00020"; GRAY="#5f6368"; BLUE="#1a73e8"; BODY="#333333"; ORANGE="#8a4b00"

# ── ここだけ差し替える ───────────────────────────────
DAY   = "10/16（金）"
TITLE = "だいちゃん情報合算版"      # 題に入れる言葉
FROM  = "だいちゃん"               # だれに教わったか

EVENTS = [
 dict(t1="17:00〜", t2="20:00", sure=False,
      place="新大阪駅", what="日本薬局学会の前日入り", icon="🏥",
      one="会場でなく、新大阪・伊丹 → 中之島のホテルへ",
      map_name="新大阪駅（3階 新幹線口）",
      map_url="https://maps.app.goo.gl/j8Qm7tqFUf3Zy8YCA?g_st=ic",
      said=["グランキューブ大阪／数千人・あすから",
            "新大阪・ホテル→中之島。会食で北新地・梅田へ"],
      official="会期はあす10/17〜18・3,500名（リーガ連絡票）。今日の会場に催しは無し",
      url="https://secure.ps-japan.org/forum2026/about.html"),
 dict(t1="20:00〜", t2="20:45", sure=True,
      place="リーガロイヤル", what="学会の宴会", icon="🏨",
      one="20:15 はけ・200名。このあと北新地・梅田へ",
      map_name="リーガロイヤルホテル大阪",
      map_url="https://maps.app.goo.gl/WitvSrxHJYXTyPk37?g_st=ic",
      said=[], official="学会 20:15 終了・200名（宴会状況連絡票）", url=None),
 dict(t1="20:45〜", t2="21:15", sure=True,
      place="なんば広場", what="CHIMNEY TOWN HALLOWEEN", icon="🎃",
      one="21:00 終了。仮装の客が なんば・心斎橋へ",
      map_name="なんば広場（なんばマルイ）",
      map_url="https://maps.app.goo.gl/iQiYDhauJvHU4hQ1A?g_st=ic",
      said=[], official="10/15〜18・12:00〜21:00（夜勤グループlineより）", url=None),
 dict(t1="20:45〜", t2="21:45", sure=True,
      place="フェスティバルホール", what="大阪フィル 第602回定期", icon="🎻",
      one="21:00 終演。年配の客が多く、淀屋橋・北新地・船場へ",
      map_name="フェスティバルホール（つけ待ち例）",
      map_url="https://maps.app.goo.gl/Ppk6MkJYa5wSYDnw7?g_st=ic",
      said=[], official="開演19:00・終演予測21:00（公演スケジュール）", url=None),
 dict(t1="20:45〜", t2="22:00", sure=True,
      place="大阪城ホール", what="Novelbright", icon="🎤",
      one="21:00 終演。京橋へ歩く客も多いので森ノ宮側へ",
      map_name="大阪城ホール（コナン像前）",
      map_url="https://maps.app.goo.gl/8kT2haUUrCiQ7y9P9?g_st=ic",
      said=["大阪城ホール／開演18:30・終演21:00〜21:30",
            "終演後 城見・キタ・ミナミへ"],
      official="終演21:00（職場の表）／開場17:30・開演18:30（公式）／16,000席。大阪城SINFONIA(〜10/25)も同エリア",
      url="https://www.osaka-johall.com/event/"),
 dict(t1="21:00〜", t2="23:00", sure=True,
      place="西天満 老松通り", what="高級割烹の接待終わり", icon="💰", money=True,
      one="23時閉店・一発勝負。芦屋・西宮・北摂へ万収",
      map_name="西天満 老松通り",
      map_url="https://maps.app.goo.gl/eKCf8H5ADPSvbncy9?g_st=ic",
      said=["高級割烹の接待終わり","23時閉店・一発勝負。芦屋・西宮・北摂へ万収"],
      official="", url=None),
 dict(t1="21:00〜", t2="23:00", sure=True,
      place="本町・淀屋橋", what="金曜の会食・残業終わり", icon="💰", money=True,
      one="伏見町の路地。幹部クラス・チケット・法人カード客",
      warn="※堺筋 高麗橋1丁目の客待ちは、取締りあり",
      map_name="伏見町の路地",
      map_url="https://maps.app.goo.gl/eKCf8H5ADPSvbncy9?g_st=ic",
      said=["伏見町の路地／金曜の会食・残業終わり","幹部クラス。チケット・法人カード客"],
      official="", url=None),
 dict(t1="21:45〜", t2="22:30", sure=True,
      place="中之島公園", what="中之島アートライツ2026", icon="✨",
      one="22:00 終了。今日が初日。淀屋橋・北浜・梅田へ",
      map_name="中之島公園（中央公会堂側）",
      map_url="https://maps.app.goo.gl/XuzLhUVgQddzDLnk8?g_st=ic",
      said=[], official="10/16〜25・18:00〜22:00・無料（夜勤グループlineより）。雨風で中止も",
      url=None),
 dict(t1="21:45〜", t2="23:00", sure=True,
      place="USJタクシー乗り場", what="ホラーナイト", icon="🎢",
      one="22:00 閉園。ユニバーサルシティ駅・ホテル・此花区",
      map_name="USJタクシー乗り場（交通広場前）",
      map_url="https://maps.app.goo.gl/3up5j24T6MQPAZa48?g_st=ic",
      said=["ユニバーサルシティ／閉園","パーク周辺・ホテル 今週最大級"],
      official="今日の営業は 08:00〜22:00（USJ公式）。ゾンビは閉園まで",
      url="https://www.usj.co.jp/web/ja/jp/park-guide/schedule/park-hour2"),
 dict(t1="22:30〜", t2="23:45", sure=True,
      place="新大阪駅 3階", what="東京からの最終新幹線", icon="💰", money=True,
      one="西宮・芦屋・千里中央・箕面・奈良。1万円超え連発",
      map_name="新大阪駅（3階 新幹線口）",
      map_url="https://maps.app.goo.gl/j8Qm7tqFUf3Zy8YCA?g_st=ic",
      said=["東京からの最終新幹線","西宮・芦屋・千里中央・箕面・奈良。1万円超え連発"],
      official="", url=None),
]

SOURCES = [
 "・「・」の行＝だいちゃんの共有、そのまま",
 "・フェスティバルホール＝公演スケジュール(開演と終演予測)",
 "・リーガロイヤル／薬局学会3,500名＝宴会状況連絡票",
 "・Novelbright の終演21:00＝職場の表",
 "・なんば／中之島／大阪城／堺筋の取締り＝夜勤グループlineより",
 "・USJ の閉園22:00＝USJ公式／着け時刻＝終演の15分前(見当)",
 "・西天満／本町／新大阪＝だいちゃんの土地勘(裏は取れません)",
]
# ─────────────────────────────────────────────────

def tx(t, **kw):
    d={"type":"text","text":t,"wrap":True}; d.update(kw); return d

def time_box(e):
    """左の時間（着ける時刻）。確かでなければ灰色にして「目安」と添える"""
    c = NAVY if e["sure"] else GRAY
    out=[tx(e["t1"],size="sm",weight="bold",color=c)]
    if e.get("t2"): out.append(tx(e["t2"],size="sm",weight="bold",color=c))
    if not e["sure"]: out.append(tx("目安",size="xxs",color=GRAY))
    return {"type":"box","layout":"vertical","flex":4,"contents":out}

def row1(e):
    """1枚目＝要点。1件3行まで（場所｜何／ひとこと／地図）"""
    col = RED if e.get("money") else NAVY
    right=[tx(e["icon"]+" "+e["place"]+"｜"+e["what"],weight="bold",size="sm",color=col)]
    if e.get("warn"): right.append(tx(e["warn"],size="xxs",weight="bold",color=RED,margin="xs"))
    right.append(tx(e["one"],size="xs",color=BODY,margin="xs"))
    right.append(tx("📍 地図："+e["map_name"],size="xxs",color=BLUE,margin="xs",
                    action={"type":"uri","label":"地図","uri":e["map_url"]}))
    return {"type":"box","layout":"horizontal","spacing":"sm","contents":[
            time_box(e), {"type":"box","layout":"vertical","flex":11,"contents":right}]}

def row2(e):
    """2枚目＝詳しい版。だいちゃんの文そのまま＋【公式】＋リンク"""
    col = RED if e.get("money") else NAVY
    right=[tx(e["icon"]+" "+e["place"]+"｜"+e["what"],weight="bold",size="sm",color=col)]
    for sd in e.get("said",[]):
        right.append(tx("・"+sd,size="xs",color=BODY,margin="xs"))
    if e.get("official"):
        right.append(tx("公式:"+e["official"],size="xxs",color=GRAY,margin="xs"))
    if e.get("url"):
        right.append(tx("🔗 公式で確認",size="xxs",color=BLUE,margin="xs",
                        action={"type":"uri","label":"確認","uri":e["url"]}))
    if len(right)==1: right.append(tx(e["one"],size="xs",color=BODY,margin="xs"))
    return {"type":"box","layout":"horizontal","spacing":"sm","contents":[
            time_box(e), {"type":"box","layout":"vertical","flex":11,"contents":right}]}

def stack(rows):
    out=[]
    for i,r in enumerate(rows):
        if i: out.append({"type":"separator","margin":"lg"})
        r=dict(r); r["margin"]="lg" if i else "none"
        out.append(r)
    return out

def bubble(sub, top, rows, foot):
    return {"type":"bubble","size":"giga",
      "header":{"type":"box","layout":"vertical","backgroundColor":NAVY,"paddingAll":"14px",
        "contents":[tx(DAY+"夜の流れ　"+TITLE,color="#ffffff",weight="bold",size="lg"),
                    tx(sub,color="#9fb3c8",size="xs",margin="xs")]},
      "body":{"type":"box","layout":"vertical","paddingAll":"14px","contents":top+stack(rows)},
      "footer":foot}

top1=[{"type":"box","layout":"vertical","backgroundColor":"#fff4e5","paddingAll":"8px",
       "contents":[tx("⏱ 左の時間は〈クルマを着ける時刻〉です",size="xs",weight="bold",color=ORANGE),
                   tx("催しの開演時刻ではありません。灰色は目安。",size="xxs",color=ORANGE,margin="xs")]},
      {"type":"separator","margin":"lg"}]

foot1={"type":"box","layout":"vertical","paddingAll":"10px","backgroundColor":"#f7f8fa",
       "contents":[tx("▼ くわしくは つぎの絵（2/2）",size="xxs",color=GRAY,align="center")]}
foot2={"type":"box","layout":"vertical","paddingAll":"12px","backgroundColor":"#f7f8fa",
  "contents":[
    tx("⚠ 時間は あくまで目安です",size="xs",weight="bold",color=RED),
    tx("AIの読み取りです。",size="xxs",color=GRAY,margin="xs"),
    tx("読み違いや予定の変更があります。(前後・延長・中止)",size="xxs",color=GRAY),
    tx("動く前に必ず公式ページでご確認を。",size="xxs",color=GRAY),
    {"type":"separator","margin":"md"},
    tx("【根拠】",size="xxs",weight="bold",color=GRAY,margin="md")] +
   [tx(x,size="xxs",color=GRAY) for x in SOURCES] +
  [{"type":"separator","margin":"md"},
    tx("今日も安全運転でいってらっしゃい",size="xxs",color=GRAY,align="center",margin="md")]}

p1 = bubble("大阪A地区 ／ 17:00 出発　（1/2 要点）",        top1, [row1(e) for e in EVENTS], foot1)
p2 = bubble("（2/2 くわしく・根拠）",                       [],   [row2(e) for e in EVENTS], foot2)

said=[]
for e in EVENTS: said += e.get("said",[])

j={"id":DAY.replace("/","-").split("（")[0]+"-flex-"+datetime.datetime.now().strftime("%H%M%S"),
   "do":"flex-note","from":FROM,"titleWord":TITLE,"said":said,
   "alt":DAY+"夜の流れ　"+TITLE,
   "alts":[DAY+"夜の流れ　"+TITLE+"（1/2 要点）", DAY+"夜の流れ　"+TITLE+"（2/2 くわしく）"],
   "flex":[p1,p2]}
io.open("errand.json","w",encoding="utf-8").write(json.dumps(j,ensure_ascii=False,indent=2)+"\n")
# ★LINEの上限（1通 10,000文字）に収まっているかを、送る形で数える
for i,pg in enumerate([p1,p2]):
    one = json.dumps({"type":"flex","altText":j["alts"][i],"contents":pg},ensure_ascii=False)
    print(("%d枚目: %d文字" % (i+1, len(one))) + ("" if len(one)<10000 else "  ★上限オーバー"))
print("→ errand.json に書き出しました。送る前に node gas/test/flex.test.js を通してください。")
