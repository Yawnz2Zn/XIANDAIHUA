/*
 * 我们呼吸的风 · GLSL 着色器：地形、植被、实体、水面、天空、风沙、阴影
 */
'use strict';

/* ---- 着色器 ---- */
const COMMON=`#version 300 es
precision highp float; precision highp sampler2DShadow;
uniform vec3 uCam,uSunDir,uSunCol,uSkyTop,uSkyHor,uFogCol,uGroundCol;
uniform float uFogDen,uStorm,uTime,uExposure,uShadowOn,uShadowTexel;
uniform sampler2DShadow uShadow; uniform mat4 uLightVP;
out vec4 fragColor;
vec3 L(vec3 c){return pow(c,vec3(2.2));}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float a=0.,w=.5;for(int i=0;i<5;i++){a+=w*vnoise(p);p=p*2.03+vec2(17.1,9.3);w*=.5;}return a/.97;}
float shadowAt(vec3 wp,vec3 n){if(uShadowOn<.5)return 1.;vec4 lp=uLightVP*vec4(wp+n*.12,1.);vec3 p=lp.xyz/lp.w*.5+.5;
 if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;float s=0.;
 for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)s+=texture(uShadow,vec3(p.xy+vec2(float(i),float(j))*uShadowTexel*1.25,p.z-.0009));
 float e=max(abs(p.x-.5),abs(p.y-.5));return mix(s/9.,1.,smoothstep(.42,.5,e));}
vec3 skyCol(vec3 d){float h=clamp(d.y,0.,1.);vec3 c=mix(uSkyHor,uSkyTop,pow(h,.45));float s=max(dot(d,uSunDir),0.);
 c+=uSunCol*(pow(s,8.)*.08+pow(s,64.)*.18)*(1.-uStorm*.6);
 if(d.y<0.)c=mix(uSkyHor,uGroundCol*1.4,clamp(-d.y*3.,0.,1.)*.6);
 c=mix(c,uFogCol,uStorm*(1.-h*.5)*.9);return c;}
vec3 fogIt(vec3 c,vec3 wp){vec3 v=wp-uCam;float d=length(v);vec3 dir=v/max(d,.001);
 float hf=exp(-max(wp.y+4.,0.)*.018);float f=1.-exp(-d*uFogDen*mix(.5,1.15,hf));
 float s=pow(max(dot(dir,uSunDir),0.),6.);vec3 fc=uFogCol+uSunCol*s*.12;return mix(c,fc,clamp(f,0.,1.));}
vec3 finish(vec3 c){c*=uExposure;c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);return pow(clamp(c,0.,1.),vec3(1./2.2));}
`;
const VS_TERRAIN=`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=3) in vec4 aAttr;
uniform mat4 uVP; out vec3 vWP; out vec3 vN; out vec4 vA;
void main(){vWP=aPos;vN=aNor;vA=aAttr;gl_Position=uVP*vec4(aPos,1.);}`;
const FS_TERRAIN=COMMON+`
in vec3 vWP; in vec3 vN; in vec4 vA;
uniform float uProg,uGridR,uGridYears,uRailX; uniform vec4 uGridBox; uniform vec2 uGridC;
void main(){
 vec3 n=normalize(vN); vec2 xz=vWP.xz; float dist=length(uCam-vWP); float slope=1.-n.y;
 float fade=1.-smoothstep(20.,150.,dist);
 vec2 rd=normalize(vec2(.8,.6)); float warp=fbm(xz*.05)*7.;
 float ph=dot(xz,rd)*3.4+warp; vec2 gr=rd*3.4*cos(ph)*(.4+.6*vnoise(xz*.3));
 float ramp=.045*fade*(1.-smoothstep(.12,.42,slope));
 float e=.7; float h0=fbm(xz*.45), hx=fbm((xz+vec2(e,0.))*.45), hz=fbm((xz+vec2(0.,e))*.45);
 vec3 dn=vec3(-(hx-h0)/e,0.,-(hz-h0)/e)*1.1*(1.-smoothstep(60.,260.,dist));
 n=normalize(n+vec3(-gr.x*ramp,0.,-gr.y*ramp)+dn);
 float nv=fbm(xz*.018), nv2=vnoise(xz*.9);
 vec3 sand=mix(L(vec3(.78,.57,.36)),L(vec3(.90,.75,.54)),clamp(nv*1.1+vWP.y*.012,0.,1.));
 sand*=.93+.1*nv2; sand=mix(sand,sand*vec3(1.04,.97,.9),smoothstep(.2,.5,slope));
 float b=vA.x+(fbm(xz*.04)-.5)*.07;
 float g=smoothstep(b-.03,b+.07,uProg)*(1.-.88*vA.y);
 float patches=fbm(xz*.11+3.)+vnoise(xz*.7)*.15;
 float cover=smoothstep(.66-g*.6,.76-g*.5,patches+g*.32)*step(.002,g);
 vec3 veg=mix(L(vec3(.33,.36,.21)),L(vec3(.52,.50,.31)),vnoise(xz*.21)); veg=mix(veg,L(vec3(.66,.60,.42)),(1.-g)*.55+.15*vnoise(xz*.05));
 veg*=.85+.3*vnoise(xz*3.1);
 vec3 alb=mix(sand,sand*vec3(.86,.83,.78),g*.45); alb=mix(alb,veg,cover*.82);
 vec3 rock=mix(L(vec3(.47,.41,.34)),L(vec3(.30,.26,.22)),vnoise(vec2(xz.x*.04,vWP.y*.35))); rock*=.85+.3*fbm(xz*.3);
 alb=mix(alb,rock,vA.z); alb=mix(alb,alb*vec3(.55,.52,.48),vA.w);
 if(uRailX>-9000.){float d=abs(vWP.x-uRailX);float bal=1.-smoothstep(2.4,3.3,d);alb=mix(alb,L(vec3(.47,.45,.42))*(.75+.5*vnoise(xz*5.)),bal);}
 if(uGridR>0.){
  vec2 q=xz; float inside=step(uGridBox.x,q.x)*step(q.x,uGridBox.z)*step(uGridBox.y,q.y)*step(q.y,uGridBox.w);
  float reveal=inside*(1.-smoothstep(uGridR-5.,uGridR,length(q-uGridC)));
  if(reveal>0.){
   vec2 f=fract(q); float d=min(min(f.x,1.-f.x),min(f.y,1.-f.y));
   float aa=max(fwidth(q.x),fwidth(q.y));
   float wid=.07+.035*vnoise(q*11.);
   float line=1.-smoothstep(wid-aa,wid+aa,d); line=mix(line,.32,smoothstep(.2,.6,aa));
   float yrs=uGridYears;
   float inner=smoothstep(.5,10.,yrs)*smoothstep(.25,.75,vnoise(q*1.6)+yrs*.05);
   vec3 crust=mix(alb,L(vec3(.64,.56,.42)),smoothstep(0.,3.,yrs)*.55);
   vec3 gi=mix(crust,L(vec3(.36,.43,.21))*(.8+.4*vnoise(q*6.)),inner*.75);
   alb=mix(alb,gi,reveal);
   vec3 straw=L(vec3(.42,.31,.16))*(.6+.7*vnoise(q*23.));
   alb=mix(alb,straw,line*reveal*(1.-smoothstep(5.,10.,yrs)*.65));
   n=normalize(n+vec3(0.,line*.0,0.));
  }
 }
 float ndl=max(dot(n,uSunDir),0.); float sh=shadowAt(vWP,n);
 vec3 amb=mix(uGroundCol,uSkyTop,n.y*.5+.5)*.55;
 vec3 V=normalize(uCam-vWP); vec3 H=normalize(V+uSunDir);
 float spec=pow(max(dot(n,H),0.),36.)*.05*(1.-cover);
 vec3 c=alb*(uSunCol*ndl*sh+amb)+uSunCol*spec*sh;
 float sp=step(.988,hash(floor(xz*55.)))*fade*ndl*sh*(1.-cover); c+=uSunCol*sp*.12;
 fragColor=vec4(finish(fogIt(c,vWP)),1.);
}`;
const VS_INST=`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec2 aUV; layout(location=3) in vec4 aAttr;
layout(location=4) in vec4 iPos; layout(location=5) in vec3 iScl; layout(location=6) in vec3 iCol; layout(location=7) in vec4 iExt;
uniform mat4 uVP; uniform float uTime,uWind;
out vec3 vWP; out vec3 vN; out vec2 vUV; out vec4 vA; out vec3 vCol;
vec3 rY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
vec3 rX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
void main(){vec3 p=aPos*iScl; vec3 n=aNor/max(iScl,vec3(.0001));
 p=rX(p,iExt.x); n=rX(n,iExt.x); p=rY(p,iPos.w); n=rY(n,iPos.w);
 float sw=aAttr.y*uWind*(sin(uTime*1.5+iPos.x*.21+iPos.z*.17)*.6+sin(uTime*3.3+aPos.y*4.+iPos.x)*.22);
 p.x+=sw*.05*iScl.y; p.z+=sw*.03*iScl.y;
 vWP=p+iPos.xyz; vN=normalize(n); vUV=aUV; vA=aAttr; vCol=iCol; gl_Position=uVP*vec4(vWP,1.);}`;
const FS_FOLIAGE=COMMON+`
in vec3 vWP; in vec3 vN; in vec2 vUV; in vec4 vA; in vec3 vCol; uniform sampler2D uAtlas;
void main(){vec4 t=texture(uAtlas,vUV); if(t.a<.5) discard;
 vec3 n=normalize(vN); vec3 alb=pow(t.rgb,vec3(2.2))*vCol;
 float ndl=dot(n,uSunDir); float diff=clamp(ndl*.55+.45,0.,1.); diff*=diff;
 float sh=shadowAt(vWP,n*1.2);
 vec3 V=normalize(uCam-vWP); float tr=pow(clamp(dot(-V,uSunDir),0.,1.),5.)*.55;
 float ao=mix(.38,1.,vA.x);
 vec3 amb=mix(uGroundCol,uSkyTop,n.y*.5+.5)*.6;
 vec3 c=alb*(uSunCol*(diff*sh*.95+tr*sh*vec3(.8,1.,.45))+amb)*ao;
 fragColor=vec4(finish(fogIt(c,vWP)),1.);}`;
const FS_SOLID=COMMON+`
in vec3 vWP; in vec3 vN; in vec2 vUV; in vec4 vA; in vec3 vCol; uniform float uMat;
void main(){vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 V=normalize(uCam-vWP);
 float sh=shadowAt(vWP,n); float ndl=max(dot(n,uSunDir),0.);
 vec3 amb=mix(uGroundCol,uSkyTop,n.y*.5+.5)*.55; vec3 c;
 if(uMat>2.5){ vec3 bark=L(vec3(.33,.27,.21))*(.7+.5*vnoise(vec2(vUV.x*8.,vWP.y*3.))); c=bark*(uSunCol*ndl*sh+amb);}
 else if(uMat>1.5){ vec3 w=vCol*(.85+.2*vnoise(vWP.xz*9.)); c=w*(uSunCol*(ndl*.8+.2)*sh+amb);}
 else if(uMat>.5 && vA.x>.5){
  vec2 g=fract(vUV*vec2(12.,6.)); float cell=step(.06,g.x)*step(.08,g.y);
  vec3 base=mix(L(vec3(.62,.66,.70)),L(vec3(.05,.09,.2)),cell);
  float fr=.04+.96*pow(1.-max(dot(n,V),0.),5.);
  vec3 refl=skyCol(reflect(-V,n));
  float sp=pow(max(dot(reflect(-uSunDir,n),V),0.),220.);
  c=base*(uSunCol*ndl*sh*.25+amb*.4)+refl*fr*.9+uSunCol*sp*sh*3.;
 } else { c=vCol*(uSunCol*ndl*sh+amb); }
 fragColor=vec4(finish(fogIt(c,vWP)),1.);}`;
const FS_WATER=COMMON+`
in vec3 vWP; uniform vec3 uWaterCol;
void main(){vec2 p=vWP.xz; float t=uTime;
 float a=fbm(p*.12+vec2(t*.05,t*.02)), b=fbm(p*.12+vec2(5.2,1.3)-vec2(t*.03,t*.06));
 float c2=fbm(p*.6+vec2(t*.2,0.));
 vec3 n=normalize(vec3((a-b)*1.2+(c2-.5)*.3,1.,(b-a*.7)*1.2));
 vec3 V=normalize(uCam-vWP); float fr=.03+.6*pow(1.-max(dot(n,V),0.),5.);
 vec3 refl=skyCol(reflect(-V,n)); vec3 amb=mix(uGroundCol,uSkyTop,.7)*.5;
 vec3 deep=uWaterCol*(uSunCol*max(uSunDir.y,0.)*.6+amb);
 float sp=pow(max(dot(reflect(-uSunDir,n),V),0.),300.);
 float sh=shadowAt(vWP,vec3(0.,1.,0.));
 vec3 c=mix(deep,refl,fr)+uSunCol*sp*6.*sh;
 fragColor=vec4(finish(fogIt(c,vWP)),1.);}`;
const VS_SKY=`#version 300 es
layout(location=0) in vec3 aPos; out vec2 vNdc; void main(){vNdc=aPos.xy;gl_Position=vec4(aPos.xy,.9999,1.);}`;
const FS_SKY=COMMON+`
in vec2 vNdc; uniform mat4 uInvVP;
void main(){vec4 w=uInvVP*vec4(vNdc,1.,1.); vec3 d=normalize(w.xyz/w.w-uCam);
 vec3 c=skyCol(d); float s=max(dot(d,uSunDir),0.);
 c+=uSunCol*smoothstep(.99955,.9998,s)*6.*(1.-uStorm*.9);
 if(d.y>.005){vec2 uv=d.xz/(d.y+.06)*.55+vec2(uTime*.004,uTime*.001);
  float cl=fbm(uv*1.4); cl=smoothstep(.56,.86,cl)*(1.-uStorm)*smoothstep(0.,.18,d.y);
  vec3 cc=mix(uSkyHor*1.05+uSunCol*.05,uSunCol*.55+uSkyHor*.6,pow(s,3.)); c=mix(c,cc,cl*.75);}
 fragColor=vec4(finish(c),1.);}`;
const VS_DUST=`#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;
uniform mat4 uVP; uniform float uTime,uSize; uniform vec3 uCam,uWindV;
out float vA;
void main(){vec3 box=vec3(130.,46.,130.); float r=aNor.x;
 vec3 p=aPos+uWindV*uTime*(.55+r); p.y+=sin(uTime*1.7+r*40.)*.8;
 vec3 rel=mod(p-uCam+box*.5,box)-box*.5; vec3 w=uCam+rel; vec4 cp=uVP*vec4(w,1.); gl_Position=cp;
 float d=cp.w; gl_PointSize=uSize*(.45+r*1.1)*(70./max(d,.5)); vA=smoothstep(64.,8.,d)*smoothstep(.4,2.5,d);}`;
const FS_DUST=`#version 300 es
precision highp float; in float vA; uniform vec3 uDustCol; uniform float uOpacity; out vec4 fragColor;
void main(){vec2 c=gl_PointCoord-.5; float r=length(c); if(r>.5) discard; fragColor=vec4(uDustCol,smoothstep(.5,0.,r)*vA*uOpacity);}`;
const FS_DEPTH=`#version 300 es
precision mediump float; void main(){}`;
const FS_DEPTH_A=`#version 300 es
precision mediump float; in vec2 vUV; uniform sampler2D uAtlas; void main(){ if(texture(uAtlas,vUV).a<.5) discard; }`;
