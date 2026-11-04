# 3-3 オート／ロックの矢印と札（11/3 おすすめを青に）
# 11/3 まーく様「LOCK は赤（デメリット・難易度が高い）」→ LOCK 側（GRAY という名前のまま）を、表の赤 #c8372d に
import math
from PIL import Image, ImageDraw, ImageFont
F='/tmp/claude-0/-home-user-taxi/647c6673-e0d4-50d5-a1f6-0c9285b7952c/scratchpad/fonts/nsjp900.ttf'
base=Image.open('kfw4/d_auto.jpg').convert('RGBA')
K=4; Wd,Ht=base.size
ov=Image.new('RGBA',(Wd*K,Ht*K),(0,0,0,0)); d=ImageDraw.Draw(ov)
cx,cy,rx,ry=748,500,334,350   # 11/4 弧を少し内側へ（青い札から離す）
RED=(21,101,192,255); GRAY=(200,55,45,255); WH=(255,255,255,255)   # 11/3 まーく様「おすすめの枠を青に。青字の説明とそろえる」
def P(a,dr=0):
    t=math.radians(a); return ((cx+(rx+dr)*math.cos(t))*K,(cy+(ry+dr)*math.sin(t))*K)
def band(a0,a1,col,w):
    n=240; o=[P(a0+(a1-a0)*i/n, w/2) for i in range(n+1)]; i_=[P(a0+(a1-a0)*i/n,-w/2) for i in range(n+1)]
    d.polygon(o+i_[::-1],fill=col)
def head(a,sign,col,grow=0):
    x,y=P(a); x2,y2=P(a+sign*0.3); tx,ty=x2-x,y2-y; n=math.hypot(tx,ty); tx,ty=tx/n,ty/n; nx,ny=-ty,tx
    L,B=(80+grow*1.8)*K,(46+grow)*K; bx,by=x-tx*grow*0.9*K,y-ty*grow*0.9*K
    d.polygon([(bx+tx*L,by+ty*L),(bx+nx*B,by+ny*B),(bx-nx*B,by-ny*B)],fill=col)
A_AUTO,A_MID,A_LOCK=108,141,170   # 11/4 矢印の先が札にかからないよう、少し短く
band(A_AUTO-0.3,A_LOCK+0.3,WH,36); head(A_AUTO,-1,WH,9); head(A_LOCK,1,WH,9)
band(A_MID,A_LOCK,GRAY,22); band(A_AUTO,A_MID+0.2,RED,22)
head(A_AUTO,-1,RED); head(A_LOCK,1,GRAY)
ov=ov.resize((Wd,Ht),Image.LANCZOS)
im=Image.alpha_composite(base,ov); d2=ImageDraw.Draw(im)
fb=ImageFont.truetype(F,76)
def box(lines,x,y,col):
    ws=[d2.textlength(t,font=fb) for t,_ in lines]; w=max(ws)+40; h=88*len(lines)+18
    d2.rounded_rectangle((x-w/2-5,y-h/2-5,x+w/2+5,y+h/2+5),radius=22,fill=WH)
    d2.rounded_rectangle((x-w/2,y-h/2,x+w/2,y+h/2),radius=18,fill=col); yy=y-h/2+9
    for t,c in lines: d2.text((x,yy+44),t,font=fb,fill=c,anchor='mm'); yy+=88
# 11/4 まーく様「矢印と枠が被っている。青枠が赤枠より下ぎみ」→ 写真に写る範囲（上276〜下999）の上下から、同じだけ離して置く
TOP,BOT,M=276,999,22
box([('LOCK＝手動','white')],262,TOP+M+53,GRAY)
box([('おすすめ',(255,224,138,255)),('AUTO＝自動','white')],262,BOT-M-97,RED)
im.convert('RGB').save('kfw4/d_autoa.jpg',quality=95)
