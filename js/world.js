/*
 * 我们呼吸的风 · 三个场景：毛乌素、沙坡头、库布其的地形、植被布局、相机路径与大气
 */
'use strict';

/* ================= 世界 ================= */
function dunes(x,z,amp,sc){const n=fbm(x*.008*sc+10,z*.008*sc+3),warp=fbm(x*.02,z*.02)*4;const ridge=1-Math.abs(Math.sin(x*.034*sc+z*.011*sc+warp));return amp*(11*Math.pow(ridge,2.3)*(.35+n)+7*n)}
const TX0=-450,TX1=450,TZ0=-1250,TZ1=650,SEGX=200,SEGZ=420;

const W={};
/* ---------- 旅程一：毛乌素 ---------- */
W.muus=(()=>{const HUT={x:7,z:548},LAKE={x:0,z:-662,r:52};
 const flat=(x,z)=>ss(38,14,Math.hypot(x-HUT.x,z-HUT.z));
 const wild=(x,z)=>{if(flat(x,z)>.1||Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r+60)return 0;return ss(.6,.68,fbm(x*.006+50,z*.006+80))};
 const birth=(x,z)=>.07+clamp((600-z)/1420,0,1)*.78+(vnoise(x*.03,z*.03)-.5)*.07;
 const height=(x,z)=>{let h=dunes(x,z,1,1);h=lerp(h,2.2+h*.05,flat(x,z));const lm=ss(LAKE.r+30,LAKE.r-8,Math.hypot(x-LAKE.x,z-LAKE.z));return lerp(h,-3,lm)};
 return {key:'muus',name:'旅程一 · 一个人',height,attr:(x,z)=>[birth(x,z),wild(x,z),0,ss(LAKE.r+14,LAKE.r-2,Math.hypot(x-LAKE.x,z-LAKE.z))*.6],
  water:{type:'disc',x:LAKE.x,z:LAKE.z,r:LAKE.r+8,y:-1.1,col:0x2c6f7e,appear:[.72,.8]},
  sunAz:-2.25,railX:-99999,
  build(add,R){const ok=(x,z)=>wild(x,z)<.3&&Math.hypot(x-HUT.x,z-HUT.z)>16&&Math.hypot(x-LAKE.x,z-LAKE.z)>LAKE.r+3&&Math.hypot(x-24,z-505)>34&&!(Math.abs(x)<34&&z<-520&&z>-615);
   // 成行的人工林（航拍里那一道道纹路）
   for(let row=-40;row<40;row++){const x0=row*7.5+(vnoise(row,3)-.5)*4;for(let z=560;z>-900;z-=4.2){const x=x0+(vnoise(z*.05,row)-.5)*3;if(!ok(x,z)||R()<.35)continue;
     const kind=R()<.62?'pine':'poplar';add(kind,{x,z,b:birth(x,z)+(kind==='pine'?.035:.02)+R()*.03,h:kind==='pine'?4+R()*5:8+R()*6,w:1,mode:'p'})}}
   let n=0;while(n<3200){const x=(R()-.5)*680,z=600-R()*1500;if(!ok(x,z))continue;add('shrub',{x,z,b:birth(x,z)-.03+R()*.03,h:1.3+R()*1.4,w:1.1+R()*.5,mode:'p'});n++}
   n=0;while(n<4500){const x=(R()-.5)*600,z=600-R()*1450;if(!ok(x,z))continue;add('grass',{x,z,b:birth(x,z)+R()*.05,h:.5+R()*.6,w:1+R()*.6,mode:'p'});n++}
   // 五千美元的林子
   for(let i=0;i<650;i++){const x=(R()-.5)*130,z=355+R()*90;if(Math.hypot(x-HUT.x,z-HUT.z)<22||Math.hypot(x-24,z-505)<34)continue;const pine=R()<.45;add(pine?'pine':'poplar',{x,z,b:R(),h:pine?4+R()*4:6+R()*6,w:1,mode:'d'})}
   // 湖边
   for(let i=0;i<260;i++){const a=R()*6.28,r=LAKE.r+6+R()*30;const x=LAKE.x+Math.cos(a)*r,z=LAKE.z+Math.sin(a)*r;if(z>LAKE.z+15&&Math.abs(x)<48)continue;add(R()<.7?'poplar':'shrub',{x,z,b:.7+R()*.08,h:7+R()*7,w:1,mode:'p'})}
   // 友谊之树与重逢之松
   add('poplar',{x:HUT.x+12,z:HUT.z-10,b:.2,h:11,w:1.1,mode:'p',tint:[1,1,1]});add('pine',{x:HUT.x+17,z:HUT.z-7,b:.36,h:2.6,w:1,mode:'p'});
   // 地窨子
   const hy=height(HUT.x,HUT.z);const cr=Math.cos(.35),sr=Math.sin(.35);const at=(u,v)=>[HUT.x+cr*u+sr*v,HUT.z-sr*u+cr*v];
   add('solid',{x:HUT.x,y:hy-2.4,z:HUT.z,sx:8,sy:3.0,sz:5,rot:.35,col:0x8a6a48});add('solid',{x:HUT.x,y:hy+.5,z:HUT.z,sx:8.8,sy:.3,sz:5.8,rot:.35,col:0x4f3a24});
   for(let i=0;i<16;i++){const p=at((i%4-1.5)*2,((i/4|0)-1.5)*1.3);add('shrub',{x:p[0],z:p[1],y:hy+.72,b:-1,h:.45+R()*.3,w:2.6,mode:'p',tint:[.95,.8,.6]})}
   {const d=at(-1.2,3.2);add('solid',{x:d[0],y:hy-1.4,z:d[1],sx:1.5,sy:1.85,sz:2.2,rot:.35,col:0x1a120a})}
   {const d=at(-1.2,4.6);add('solid',{x:d[0],y:hy-1.2,z:d[1],sx:1.9,sy:1.5,sz:.25,rot:.35,col:0x6b5236})}
   for(let i=0;i<9;i++){const p=at(-5.5,4+i*1.1);add('solid',{x:p[0],y:hy-.3,z:p[1],sx:.08,sy:1.2+R()*.4,sz:.08,rot:R(),col:0x4a3824})}
   add('solid',{x:HUT.x+12.6,y:height(HUT.x+12,HUT.z-10)+2.2,z:HUT.z-9.6,sx:1,sy:.25,sz:.06,rot:0,col:0xc8432f,minP:.2});
  },
  cam:[[0,-2,566,3.2,9,540,2.4],[.06,-6,548,5,10,515,1.5],[.12,0,522,9,12,470,1],[.19,8,500,16,0,420,0],[.27,34,505,34,0,395,0],[.34,36,500,8,19,538,6],
   [.40,0,410,55,0,260,0],[.47,-30,320,150,0,60,0],[.55,20,160,70,-10,-60,0],[.63,0,60,170,0,-260,0],[.72,-20,-200,90,0,-500,0],[.80,10,-440,30,0,-650,4],[.88,-2,-565,9,4,-650,7],[1,-1,-578,7,5,-640,6]],
  atmo:[[0,1,.018,0x8d7550,0xc29d68,0xb8935f,0xffc98a,.2,1],[.10,.8,.012,0x8f7f5e,0xcaa676,0xbf9d6e,0xffd09a,.24,1],[.20,.42,.0055,0x7d97a3,0xd8bd8d,0xccb48c,0xffd9a8,.32,1],
   [.30,.14,.0022,0x4c84b4,0xe2d3b3,0xd6cbb2,0xffe6c4,.44,1],[.45,.06,.0009,0x3f7ab0,0xdcd8c8,0xcdcbbd,0xfff0d8,.52,.97],[.60,.05,.0012,0x3c76ab,0xdfe0d6,0xd2d4cd,0xfff0d8,.55,1],[.80,.03,.0018,0x3b6a9b,0xefc795,0xe2c29a,0xffb56e,.2,1.02],[1,0,.002,0x46699a,0xf2c48d,0xe6c49a,0xffa860,.13,1.06]],
  donate:true};
})();
/* ---------- 旅程二：沙坡头 ---------- */
W.shapotou=(()=>{const RX=40,GB=[-70,22,24,200],GC=[-22,112];
 const railY=6.5;
 const river=(z)=>ss(80,40,Math.abs(z+690));
 const height=(x,z)=>{let h=dunes(x,z,1.55,1.15);const rb=ss(16,5,Math.abs(x-RX))*ss(-560,-480,z);h=lerp(h,railY,rb);
  const gb=ss(10,0,Math.max(GB[0]-x,0,x-GB[1],GB[2]-z,0,z-GB[3]));h=lerp(h,h*.55+2,gb*.6);
  h=lerp(h,h*.22+1.5,ss(190,85,Math.abs(z+690))*ss(-430,-520,z));h=lerp(h,-4,river(z));if(z<-790){const m=(-790-z);h+=m*.26*(.55+fbm(x*.008,z*.008))+38*fbm(x*.018+4,z*.018)*ss(0,90,m)}return h};
 const birth=(x,z)=>{const nearRail=ss(140,40,Math.abs(x-RX));const bank=ss(140,60,Math.abs(z+690))*ss(-500,-560,z);let b=2;if(nearRail>0)b=lerp(2,.42+clamp((450-z)/1000,0,1)*.15,nearRail);if(bank>0)b=Math.min(b,lerp(2,.48,bank));return b+(vnoise(x*.03,z*.03)-.5)*.05};
 return {key:'shapotou',name:'旅程二 · 一方格',height,attr:(x,z)=>[birth(x,z),0,z<-790?ss(-790,-830,z):0,river(z)*.9],
  water:{type:'rect',x0:-450,x1:450,z0:-752,z1:-628,y:-1.2,col:0x7a5a3a},sunAz:-2.0,railX:RX,grid:{box:GB,c:GC},
  build(add,R){const okR=(x,z)=>Math.abs(x-RX)>5&&!(x>GB[0]-2&&x<GB[1]+2&&z>GB[2]-2&&z<GB[3]+2)&&river(z)<.05&&z>-790;
   // 铁路
   for(let z=600;z>-560;z-=.72){add('solid',{x:RX,y:railY-.05,z,sx:2.6,sy:.16,sz:.24,rot:0,col:0x5b4a3a})}
   for(let z=600;z>-560;z-=10){[-.72,.72].forEach(o=>add('solid',{x:RX+o,y:railY+.1,z:z-5,sx:.08,sy:.16,sz:10,rot:0,col:0x6f6c6a}))}
   for(let z=590;z>-560;z-=48){add('solid',{x:RX+5.5,y:railY,z,sx:.22,sy:8,sz:.22,rot:0,col:0x4b3a2a});add('solid',{x:RX+5.5,y:railY+7.4,z,sx:1.8,sy:.12,sz:.12,rot:0,col:0x4b3a2a})}
   // 铁路两侧护路林、黄河岸边林带
   let n=0;while(n<2600){const x=RX+(R()-.5)*260,z=560-R()*1110;if(!okR(x,z))continue;const b=birth(x,z);if(b>1.5)continue;const k=R();add(k<.5?'shrub':k<.8?'poplar':'pine',{x,z,b:b+R()*.04,h:k<.5?1.2+R()*1.3:6+R()*7,w:1.1,mode:'p'});n++}
   n=0;while(n<1600){const x=(R()-.5)*820,z=-520-R()*270;if(!okR(x,z)||river(z)>0)continue;const b=birth(x,z);if(b>1.5)continue;add(R()<.75?'poplar':'shrub',{x,z,b:b+R()*.05,h:8+R()*8,w:1,mode:'p'});n++}
   n=0;while(n<3000){const x=RX+(R()-.5)*300,z=560-R()*1300;if(!okR(x,z))continue;const b=birth(x,z);if(b>1.5)continue;add('grass',{x,z,b:b+R()*.05,h:.5+R()*.5,w:1.1,mode:'p'});n++}
   // 草方格里：先锋草本、后来的灌木（由时间轴控制）
   for(let i=0;i<2600;i++){const x=lerp(GB[0]+1,GB[1]-1,R()),z=lerp(GB[2]+1,GB[3]-1,R());add('grass',{x:Math.floor(x)+.3+R()*.4,z:Math.floor(z)+.3+R()*.4,b:.6+R()*3.5,h:.25+R()*.35,w:.9,mode:'g'})}
   for(let i=0;i<700;i++){const x=lerp(GB[0]+1,GB[1]-1,R()),z=lerp(GB[2]+1,GB[3]-1,R());add('shrub',{x:Math.floor(x)+.5,z:Math.floor(z)+.5,b:4.5+R()*5,h:.7+R()*.9,w:1.2,mode:'g'})}
  },
  cam:[[0,30,560,40,40,300,0],[.06,46,420,6,40,330,3],[.12,4,214,2.4,-12,170,-.4],[.20,-2,232,13,-18,140,0],[.30,-14,206,15,-22,150,0],[.40,58,140,22,40,-100,3],
   [.50,0,-380,52,0,-690,6],[.60,-70,-520,34,40,-700,4],[.70,0,-330,170,0,-720,20],[.80,30,-140,60,0,-520,8],[.90,0,-555,15,0,-720,16],[1,0,-566,13,0,-730,16]],
  atmo:[[0,.26,.0034,0x7f9cb0,0xe1cea6,0xd2bf98,0xffe2b8,.62,1],[.14,.16,.0028,0x6f95b3,0xe4d6b6,0xd8cbb0,0xffe8c8,.68,1],[.4,.05,.0019,0x4a85bd,0xdcd9cc,0xcbcac2,0xfff2dc,.62,.95],
   [.7,.02,.0012,0x3f78b0,0xd8d7cd,0xc8c8c2,0xfff2de,.55,.95],[1,0,.0018,0x3e6e9e,0xf1cfa0,0xe6caa0,0xffbd7a,.25,1.04]],
  grid:true,gridBox:GB,gridC:GC};
})();
/* ---------- 旅程三：库布其 ---------- */
W.kubuqi=(()=>{const FX=[-280,280],FZ=[-430,-40],LAKE={x:0,z:-722,r:46};
 const inField=(x,z)=>ss(12,0,Math.max(FX[0]-x,0,x-FX[1],FZ[0]-z,0,z-FZ[1]));
 const height=(x,z)=>{let h=dunes(x,z,1.25,.95);h=lerp(h,h*.35+1.5,inField(x,z));const lm=ss(LAKE.r+30,LAKE.r-8,Math.hypot(x-LAKE.x,z-LAKE.z));return lerp(h,-3,lm)};
 const belt=(z)=>ss(60,30,Math.abs(z-150));
 const birth=(x,z)=>{let b=2;if(inField(x,z)>.5)b=.33+(-40-z)/390*.05;if(belt(z)>0)b=Math.min(b,.02+(Math.abs(x)/450)*.04);const ff=Math.hypot(x-LAKE.x,z-LAKE.z);if(ff<200)b=Math.min(b,.62+ff/200*.12);
  if(b>1&&z<-430)b=.55+clamp((-430-z)/400,0,1)*.25+(fbm(x*.01,z*.01)>.52?2:0);return b+(vnoise(x*.03,z*.03)-.5)*.05};
 return {key:'kubuqi',name:'旅程三 · 一个国家',height,attr:(x,z)=>[birth(x,z),0,0,ss(LAKE.r+14,LAKE.r-2,Math.hypot(x-LAKE.x,z-LAKE.z))*.6],
  water:{type:'disc',x:LAKE.x,z:LAKE.z,r:LAKE.r+8,y:-1.1,col:0x2f6f86,appear:[.6,.7]},sunAz:-2.5,railX:-99999,
  build(add,R){
   // 光伏阵列
   for(let z=FZ[1]-6;z>FZ[0]+4;z-=9){for(let x=FX[0]+6;x<FX[1]-6;x+=4.7){if(fbm(x*.01+3,z*.01)<.32)continue;const y=height(x,z);const b=.18+((FZ[1]-z)/390)*.1+Math.abs(x)/280*.03;
     add('panel',{x,y:y+1.6,z,sx:4.4,sy:.07,sz:2.4,rot:0,tilt:-.6,col:0xffffff,pb:b});add('post',{x,y:y-.4,z:z+.6,sx:.12,sy:2.1,sz:.12,rot:0,col:0x8a8f96,pb:b});
     if(R()<.55)add('shrub',{x:x+(R()-.5)*3,z:z+1.4,b:.34+R()*.05+(FZ[1]-z)/390*.04,h:.8+R()*.7,w:1,mode:'p'});
     if(R()<.7)add('grass',{x:x+(R()-.5)*4,z:z+(R()-.5)*5,b:.33+R()*.06,h:.4+R()*.4,w:1,mode:'p'})}}
   // 锁边林草带
   let n=0;while(n<2600){const x=(R()-.5)*880,z=150+(R()-.5)*110;const k=R();add(k<.45?'shrub':k<.75?'pine':'poplar',{x,z,b:.015+Math.abs(x)/450*.04+R()*.02,h:k<.45?1.3+R()*1.3:4+R()*6,w:1.1,mode:'p'});n++}
   n=0;while(n<2000){const x=(R()-.5)*880,z=150+(R()-.5)*130;add('grass',{x,z,b:.02+R()*.05,h:.5+R()*.5,w:1,mode:'p'});n++}
   // 南边逐渐变绿
   n=0;while(n<2600){const x=(R()-.5)*760,z=-440-R()*700;if(Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r+4)continue;const b=birth(x,z);if(b>1.5)continue;const k=R();add(k<.5?'shrub':k<.8?'pine':'poplar',{x,z,b:b+R()*.04,h:k<.5?1.2+R()*1.3:4+R()*7,w:1.1,mode:'p'});n++}
   n=0;while(n<2500){const x=(R()-.5)*700,z=-440-R()*700;if(Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r+4)continue;const b=birth(x,z);if(b>1.5)continue;add('grass',{x,z,b:b+R()*.05,h:.5+R()*.5,w:1.1,mode:'p'});n++}
   // 板间养殖：羊
   for(let i=0;i<90;i++){const x=(R()-.5)*120+20,z=-110-R()*90;const y=height(x,z);const ro=R()*6.28;add('sheep',{x,y:y+.55,z,sx:.5,sy:.42,sz:.85,rot:ro,col:0xe9e2d3,pb:.4});add('sheepH',{x:x+Math.sin(ro)*.85,y:y+.72,z:z+Math.cos(ro)*.85,sx:.2,sy:.22,sz:.28,rot:ro,col:0x2b2420,pb:.4})}
  },
  cam:[[0,0,560,30,0,300,5],[.07,-40,300,18,0,160,3],[.13,30,232,42,0,60,0],[.20,-20,38,7,10,-40,1.6],[.26,8,-18,2.3,8,-70,1.0],[.33,0,70,170,0,-230,0],[.42,62,-120,13,20,-180,1],
   [.52,60,-520,230,0,60,0],[.62,120,-460,120,-60,-720,0],[.72,0,-480,60,0,-760,5],[.82,-20,-590,24,0,-730,6],[.92,-2,-640,8,10,-722,6],[1,-1,-648,7,14,-720,6]],
  atmo:[[0,.14,.0032,0x6f93ad,0xdcc7a0,0xcdb994,0xffe0b2,.45,.97],[.2,.06,.0022,0x4682b8,0xd9d6c8,0xc9c8bc,0xfff0d8,.6,.95],[.5,.02,.0007,0x3a73aa,0xd2d6d2,0xc2c8c6,0xfff2de,.62,.95],[.6,.02,.001,0x3a73aa,0xd8dad4,0xc8ccc8,0xfff2de,.62,.95],
   [.8,0,.0016,0x3b5f8f,0xf3b77e,0xe8b88a,0xff9a52,.15,1.04],[1,0,.0018,0x2f4c78,0xf0a46a,0xe0a77c,0xff8a40,.09,1.08]],
  pledgeAt:[14,-664]};
})();


/* 我的树：加入库布其世界 */
const _kb=W.kubuqi.build;W.kubuqi.build=function(add,R){_kb(add,R);add('pine',{x:14,z:-664,b:9,h:7.5,w:1.15,mode:'p',my:true,tint:[1.15,1.25,1.05]})};
