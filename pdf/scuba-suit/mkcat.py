# サンライズのドライ（World Dive DCD2R。サンライズのインストラクターに確認ずみの型）の しくみ図
# 前・後ろとも、まーく様にいただいた World Dive カタログのページ（DCD2R）から。別の型の写真はまぜない（10/26 監査：同じスーツかどうか分からなくなる）
from PIL import Image, ImageDraw, ImageFont
src=Image.open("/tmp/claude-0/kfw3/cat.jpg").convert("RGB")
W,H=1920,880; out=Image.new("RGB",(W,H),"white"); d=ImageDraw.Draw(out); RED=(249,54,18)
FP="/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf"
font=ImageFont.truetype(FP,64); small=ImageFont.truetype(FP,56)
# 前（DCD2R）
fx0,fy0,fx1,fy1=540,160,858,1062; s1=(H-90)/(fy1-fy0)
f=src.crop((fx0,fy0,fx1,fy1)).resize((round((fx1-fx0)*s1),round((fy1-fy0)*s1)),Image.LANCZOS)
OX1,OY1=640,0; out.paste(f,(OX1,OY1))
P1=lambda x,y:(OX1+(x-fx0)*s1, OY1+(y-fy0)*s1)
# 後ろ（DCD2R）
bx0,by0,bx1,by1=855,505,1045,1062; s2=1.0
b=src.crop((bx0,by0,bx1,by1)).resize((round((bx1-bx0)*s2),round((by1-by0)*s2)),Image.LANCZOS)
OX2,OY2=1500,200; out.paste(b,(OX2,OY2))
P2=lambda x,y:(OX2+(x-bx0)*s2, OY2+(y-by0)*s2)
def ring(c,r,ry=None,w=10):
    ry=ry or r; x,y=c; d.ellipse((x-r,y-ry,x+r,y+ry),outline=RED,width=w)
def tag(text,x,y,anchor,line_to=None,fnt=font):
    tw=d.textlength(text,font=fnt); bw,bh=tw+40,fnt.size+30
    x0=x-bw if anchor=="r" else (x-bw/2 if anchor=="c" else x); y0=y-bh/2
    if line_to: d.line((line_to[0],line_to[1],x0+bw if anchor=="r" else x0,y) if anchor!="c" else (line_to[0],line_to[1],x,y),fill=RED,width=7)
    d.rounded_rectangle((x0-5,y0-5,x0+bw+5,y0+bh+5),radius=16,fill="white")
    d.rounded_rectangle((x0,y0,x0+bw,y0+bh),radius=14,fill=RED)
    d.text((x0+20,y),text,font=fnt,fill="white",anchor="lm")
neck=P1(681,322); ring(neck,55,40); tag("首のゴム",610,neck[1]-40,"r",(neck[0]-55,neck[1]))
chest=P1(667,412); ring(chest,40); tag("胸：入れる",610,chest[1]+60,"r",(chest[0]-40,chest[1]))
sh=P1(806,376); ring(sh,40)
wr=P1(800,575); ring(wr,44,38); tag("手首のゴム",610,wr[1]+90,"r",(wr[0]-30,wr[1]+40))
bt=P1(783,1000); ring(bt,58,52); tag("ブーツも一体",610,bt[1],"r",(bt[0]-58,bt[1]))
zp=P2(940,628); ring(zp,105,40)
tag("背中のファスナー",1910,zp[1]-120,"r",(zp[0]+50,zp[1]-30),small)
tag("左肩：抜く",sh[0]+80,sh[1]-110,"l",(sh[0]+28,sh[1]-30))
# バルブの大写し
def inset(path,box,dst,label):
    im=Image.open(path).convert("RGB"); sx=im.size[0]/1280
    c=im.crop(tuple(round(v*sx) for v in box)).resize((dst[2]-dst[0],dst[3]-dst[1]),Image.LANCZOS)
    out.paste(c,dst[:2]); d.rectangle(dst,outline=(90,90,90),width=4)
    tag(label,(dst[0]+dst[2])/2,dst[3]+48,"c",None,small)
d.text((OX1+190,H-8),"前",font=small,fill=(70,70,70),anchor="ms"); d.text((OX2+130,H-8),"後ろ",font=small,fill=(70,70,70),anchor="ms")
out.save("/tmp/claude-0/kfw3/d_cat.jpg",quality=92)
# 横長（1920x880）で作り、ページでは切り抜かずにそのまま見せる（a4w.py の CSS）。10/26 監査
