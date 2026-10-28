# サンライズのドライ（World Dive DCD2R。サンライズのインストラクターに確認ずみの型）の しくみ図
# 前・後ろとも、まーく様にいただいた World Dive カタログのページ（DCD2R）から。別の型の写真はまぜない（10/26 監査：同じスーツかどうか分からなくなる）
# 10/27 まーく様のご指示で作り直し
#   ・後ろも前と同じ大きさに。図の下は「前」「後」
#   ・「胸上：空気 入」（10/28 左肩と字数をそろえ、丸の位置をそろえる）「左肩：空気 抜」（入・抜 は丸で囲む）。「入れる・抜く」だけでは、何を？が分からない
#   ・札の高さ・左右の位置をそろえる（左の4つは右はしをそろえ、同じ間かくで並べる。1段目は3つとも同じ高さ）
from PIL import Image, ImageDraw, ImageFont
src=Image.open("/tmp/claude-0/kfw3/cat.jpg").convert("RGB")
# 10/27 夜 まーく様「左肩の文が真ん中にあると、左のスーツか右のスーツか分からない」「右の無駄な空白」
#   → 前・後ろを、それぞれ薄い灰色の枠（共通の領域：同じ枠の中＝同じまとまり、と人は見る）で囲み、
#     タグは、自分の図の枠の中にだけ置く。枠は中身に合わせた大きさにして、何もない白を残さない
H=625; GAP=36; PAD=36; BG=(242,245,247)

FP="/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"
# 10/28 まーく様「前・後やタグの字が大きすぎる。他の文に合わせ、画像を大きく」→ 字は本文と同じ見た目の大きさ（32）に。そのぶん図が大きく出る
font=ImageFont.truetype(FP,32); cap=ImageFont.truetype(FP,32); cf=ImageFont.truetype(FP,24)   # cf＝丸の中の1字（丸からはみ出さない大きさ）
FH, TOP = 560, 10   # 図の高さ（前も後ろも同じ）
out=Image.new("RGB",(4000,H),"white"); d=ImageDraw.Draw(out); RED=(249,54,18)
def fig(box, ox):
    x0,y0,x1,y1=box; s=FH/(y1-y0)
    out.paste(src.crop(box).resize((round((x1-x0)*s),FH),Image.LANCZOS),(ox,TOP))
    return (lambda x,y:(ox+(x-x0)*s, TOP+(y-y0)*s)), round((x1-x0)*s)
# 10/28 まーく様「スーツがいちばん良く見えなければ。赤丸は補足に徹する」→ 赤丸は、ほかの写真と同じく すかした別の紙に描いて重ねる
OVL=[]
def ring(c,r,ry=None,w=7):
    ry=ry or r; OVL.append((c,r,ry,w))
def tagw(text,circ): return d.textlength(text,font=font)+24+(font.size+10 if circ else 0)
def tag(text,x,y,anchor,line_to,circ=None,minw=0,halo=False):
    # anchor="r"：右はしを x にそろえる／"l"：左はしを x にそろえる。circ は、丸で囲む1字（入・抜）
    bw,bh=max(tagw(text,circ),minw),font.size+16   # minw：左の4つは同じ幅にして、左はしもそろえる（10/27 検査役）
    x0=x-bw if anchor=="r" else x; y0=y-bh/2
    if halo: d.line((line_to[0],line_to[1],x0+bw if anchor=="r" else x0,y),fill="white",width=9)
    d.line((line_to[0],line_to[1],x0+bw if anchor=="r" else x0,y),fill=RED,width=4)
    d.rounded_rectangle((x0-5,y0-5,x0+bw+5,y0+bh+5),radius=10,fill="white")
    d.rounded_rectangle((x0,y0,x0+bw,y0+bh),radius=8,fill=RED)
    d.text((x0+12,y),text,font=font,fill="white",anchor="lm")
    if circ:
        cx=x0+12+d.textlength(text,font=font)+(font.size+10)/2; R=(font.size+6)/2
        d.ellipse((cx-R,y-R,cx+R,y+R),fill="white")
        # 10/28 まーく様「入・抜を丸の真ん中に」→ 字の形そのもの（墨の範囲）の真ん中を、丸の真ん中に合わせる
        bb=d.textbbox((0,0),circ,font=cf,anchor="lt")
        d.text((cx-(bb[0]+bb[2])/2,y-(bb[1]+bb[3])/2),circ,font=cf,fill=RED,anchor="lt")
ROWS=[140,250,470]   # 左のタグの高さ（同じ間かく。体の上から順）
# 10/27 夜 まーく様「左肩も、左の方に載せられないのか」→ 前の図のタグは、5つとも左の列にそろえる
#   左肩の線は体の前を横切るので、線に白いふちを付けて見失わないようにする
LW=max(tagw("胸上：空気","入"),tagw("左肩：空気","抜"),tagw("ブーツも一体",None))
ZW=tagw("背中のファスナー",None)
X1=PAD                      # 前の枠の左はし
TX=round(X1+PAD+LW)         # 左のタグの右はし
OX1=TX+90                   # 前の図
P1,w1=fig((540,160,858,1062),OX1)
R1=round(OX1+w1+PAD)        # 前の枠の右はし（右にはタグを置かない）
X2=R1+GAP; OX2=X2+PAD       # 後ろの枠・後ろの図
P2,w2=fig((855,505,1045,1062),OX2)
ZX=round(OX2+w2+40); R2=round(ZX+ZW+PAD)
W=R2+PAD
# 枠（図より先に描きたいので、図をいったん退避して重ねる）
snap=out.copy(); d.rectangle((0,0,4000,H),fill="white")
for a_,b_ in ((X1,R1),(X2,R2)): d.rounded_rectangle((a_,8,b_,H-8),radius=28,fill=BG)
m=Image.new("L",out.size,0); ImageDraw.Draw(m).rectangle((OX1,TOP,OX1+w1,TOP+FH),fill=255); ImageDraw.Draw(m).rectangle((OX2,TOP,OX2+w2,TOP+FH),fill=255)
# 図の白い背景は、枠の色に置きかえて貼る（白い四角が浮かないように）
import numpy as _np
arr=_np.array(snap).astype(int); wh=(arr.min(axis=2)>236)
arr[wh]=BG; fig_img=Image.fromarray(arr.astype("uint8")); out.paste(fig_img,(0,0),m)
# 10/28 まーく様「ドライの首のゴム・手首のゴムはいらない」→ 空気の2つのボタンと、ブーツ一体（ウェットとの違い）だけ
chest=P1(667,412); ring(chest,34); tag("胸上：空気",TX,ROWS[0],"r",(chest[0]-34,chest[1]),"入")
sh=P1(806,376); ring(sh,34); tag("左肩：空気",TX,ROWS[1],"r",(sh[0]-24,sh[1]+24),"抜",halo=True)
bt=P1(783,1000); ring(bt,50,44); tag("ブーツも一体",TX,ROWS[2],"r",(bt[0]-50,bt[1]))
zp=P2(940,628); ring(zp,120,46); tag("背中のファスナー",ZX,zp[1],"l",(zp[0]+118,zp[1]))
for P,w,t in ((OX1,w1,"前"),(OX2,w2,"後")):
    d.text((P+w/2,H-16),t,font=cap,fill=(70,70,70),anchor="ms")
ov=Image.new("RGBA",out.size,(0,0,0,0)); dv=ImageDraw.Draw(ov)
for (x,y),r,ry,w in OVL: dv.ellipse((x-r,y-ry,x+r,y+ry),outline=RED+(150,),width=w)
out=Image.alpha_composite(out.convert("RGBA"),ov).convert("RGB")
out=out.crop((0,0,W,H))
out.save("/tmp/claude-0/kfw3/d_cat.jpg",quality=92); out.save("/tmp/claude-0/kfw4/d_cat.jpg",quality=92)   # kfw4 が focus_w.py の読む場所
print("ok", w1, w2)
# 横長（2080x880）で作り、ページでは切り抜かずにそのまま見せる（a4w.py の ASPECT と CSS）
