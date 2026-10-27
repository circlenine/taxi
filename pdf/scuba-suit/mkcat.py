# サンライズのドライ（World Dive DCD2R。サンライズのインストラクターに確認ずみの型）の しくみ図
# 前・後ろとも、まーく様にいただいた World Dive カタログのページ（DCD2R）から。別の型の写真はまぜない（10/26 監査：同じスーツかどうか分からなくなる）
# 10/27 まーく様のご指示で作り直し
#   ・後ろも前と同じ大きさに。図の下は「前」「後」
#   ・「胸：空気 入」「左肩：空気 抜」（入・抜 は丸で囲む）。「入れる・抜く」だけでは、何を？が分からない
#   ・札の高さ・左右の位置をそろえる（左の4つは右はしをそろえ、同じ間かくで並べる。1段目は3つとも同じ高さ）
from PIL import Image, ImageDraw, ImageFont
src=Image.open("/tmp/claude-0/kfw3/cat.jpg").convert("RGB")
W,H=2080,880; out=Image.new("RGB",(W,H),"white"); d=ImageDraw.Draw(out); RED=(249,54,18)
FP="/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"
font=ImageFont.truetype(FP,56); cap=ImageFont.truetype(FP,60); cf=ImageFont.truetype(FP,42)   # cf＝丸の中の1字（丸からはみ出さない大きさ）
FH, TOP = 770, 10   # 図の高さ（前も後ろも同じ）
def fig(box, ox):
    x0,y0,x1,y1=box; s=FH/(y1-y0)
    out.paste(src.crop(box).resize((round((x1-x0)*s),FH),Image.LANCZOS),(ox,TOP))
    return (lambda x,y:(ox+(x-x0)*s, TOP+(y-y0)*s)), round((x1-x0)*s)
P1,w1=fig((540,160,858,1062),490)     # 前
P2,w2=fig((855,505,1045,1062),1270)   # 後ろ
def ring(c,r,ry=None,w=9):
    ry=ry or r; x,y=c; d.ellipse((x-r,y-ry,x+r,y+ry),outline=RED,width=w)
def tagw(text,circ): return d.textlength(text,font=font)+40+(font.size+14 if circ else 0)
def tag(text,x,y,anchor,line_to,circ=None,minw=0):
    # anchor="r"：右はしを x にそろえる／"l"：左はしを x にそろえる。circ は、丸で囲む1字（入・抜）
    bw,bh=max(tagw(text,circ),minw),font.size+30   # minw：左の4つは同じ幅にして、左はしもそろえる（10/27 検査役）
    x0=x-bw if anchor=="r" else x; y0=y-bh/2
    d.line((line_to[0],line_to[1],x0+bw if anchor=="r" else x0,y),fill=RED,width=6)
    d.rounded_rectangle((x0-5,y0-5,x0+bw+5,y0+bh+5),radius=16,fill="white")
    d.rounded_rectangle((x0,y0,x0+bw,y0+bh),radius=14,fill=RED)
    d.text((x0+20,y),text,font=font,fill="white",anchor="lm")
    if circ:
        cx=x0+20+d.textlength(text,font=font)+(font.size+14)/2; R=(font.size+10)/2
        d.ellipse((cx-R,y-R,cx+R,y+R),fill="white")
        d.text((cx,y+1),circ,font=cf,fill=RED,anchor="mm")
ROWS=[146,337,527,718]   # 左のタグの高さ（同じ間かく）
LW=max(tagw("首のゴム",None),tagw("胸：空気","入"),tagw("手首のゴム",None),tagw("ブーツも一体",None))
neck=P1(681,322); ring(neck,48,34); tag("首のゴム",440,ROWS[0],"r",(neck[0]-48,neck[1]),minw=LW)
chest=P1(667,412); ring(chest,34); tag("胸：空気",440,ROWS[1],"r",(chest[0]-34,chest[1]),"入",minw=LW)
wr=P1(800,575); ring(wr,38,32); tag("手首のゴム",440,ROWS[2],"r",(wr[0]-30,wr[1]+20),minw=LW)
bt=P1(783,1000); ring(bt,50,44); tag("ブーツも一体",440,ROWS[3],"r",(bt[0]-50,bt[1]),minw=LW)
sh=P1(806,376); ring(sh,34); tag("左肩：空気",810,ROWS[0],"l",(sh[0]+30,sh[1]-14),"抜")
zp=P2(940,628); ring(zp,120,46); tag("背中のファスナー",1570,ROWS[0],"l",(zp[0]+110,zp[1]-20))
for P,w,t in ((490,w1,"前"),(1270,w2,"後")):
    d.text((P+w/2,H-14),t,font=cap,fill=(70,70,70),anchor="ms")
out.save("/tmp/claude-0/kfw3/d_cat.jpg",quality=92); out.save("/tmp/claude-0/kfw4/d_cat.jpg",quality=92)   # kfw4 が focus_w.py の読む場所
print("ok", w1, w2)
# 横長（2080x880）で作り、ページでは切り抜かずにそのまま見せる（a4w.py の ASPECT と CSS）
