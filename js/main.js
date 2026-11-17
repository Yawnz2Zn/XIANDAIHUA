/*
 * 我们呼吸的风 · 主程序：WebGL 渲染、场景构建、滚动叙事、交互、声音与开场
 */
'use strict';

(function(){
/* ================= WebGL2 ================= */
const canvas=$('gl');
const gl=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance'});
if(!gl){$('loadMsg').innerHTML='你的浏览器不支持 WebGL2，三维场景无法显示。<br>请用最新版 Chrome / Edge / Safari 打开。';return;}
let DPR=Math.min(devicePixelRatio||1,1.75);
function resize(){canvas.width=Math.round(innerWidth*DPR);canvas.height=Math.round(innerHeight*DPR);}
resize();


function prog(vs,fs){const p=gl.createProgram();
 [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]].forEach(([t,src])=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)+'\n'+src.split('\n').map((l,i)=>(i+1)+': '+l).join('\n').slice(0,3000));gl.attachShader(p,s)});
 gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
 const cache={}; p.u=n=>(n in cache)?cache[n]:(cache[n]=gl.getUniformLocation(p,n)); return p;}
let P;
try{P={terrain:prog(VS_TERRAIN,FS_TERRAIN),terrainD:prog(VS_TERRAIN,FS_DEPTH),foliage:prog(VS_INST,FS_FOLIAGE),foliageD:prog(VS_INST,FS_DEPTH_A),
 solid:prog(VS_INST,FS_SOLID),solidD:prog(VS_INST,FS_DEPTH),water:prog(VS_TERRAIN,FS_WATER),sky:prog(VS_SKY,FS_SKY),dust:prog(VS_DUST,FS_DUST)};}
catch(e){console.error(e);$('loadMsg').textContent='三维场景初始化失败：'+String(e.message).slice(0,120);return;}

/* ---- 几何 ---- */
function Geo(){return {pos:[],nor:[],uv:[],attr:[],idx:[]}}
function quad(G,a,b,c,d,na,nb,nc,nd,uv,at){const o=G.pos.length/3;[a,b,c,d].forEach(v=>G.pos.push(v[0],v[1],v[2]));[na,nb,nc,nd].forEach(v=>G.nor.push(v[0],v[1],v[2]));
 G.uv.push(uv[0],uv[1],uv[2],uv[1],uv[2],uv[3],uv[0],uv[3]); at.forEach(x=>G.attr.push(x[0],x[1],x[2],x[3])); G.idx.push(o,o+1,o+2,o,o+2,o+3);}
function boxGeo(){const G=Geo();const F=[[[0,1,0],[1,0,0],[0,0,1],1],[[0,-1,0],[1,0,0],[0,0,-1],0],[[1,0,0],[0,0,-1],[0,1,0],0],[[-1,0,0],[0,0,1],[0,1,0],0],[[0,0,1],[1,0,0],[0,1,0],0],[[0,0,-1],[-1,0,0],[0,1,0],0]];
 F.forEach(([n,u,v,top])=>{const c=[n[0]*.5,n[1]*.5+.5,n[2]*.5];const P=(su,sv)=>[c[0]+u[0]*su*.5+v[0]*sv*.5,c[1]+u[1]*su*.5+v[1]*sv*.5,c[2]+u[2]*su*.5+v[2]*sv*.5];
  const at=[top,0,0,0];quad(G,P(-1,-1),P(1,-1),P(1,1),P(-1,1),n,n,n,n,[0,0,1,1],[at,at,at,at])});return G;}
function sphereGeo(seg){const G=Geo();for(let j=0;j<=seg;j++)for(let i=0;i<=seg*2;i++){const th=j/seg*Math.PI,ph=i/(seg*2)*Math.PI*2;const x=Math.sin(th)*Math.cos(ph),y=Math.cos(th),z=Math.sin(th)*Math.sin(ph);
  G.pos.push(x,y,z);G.nor.push(x,y,z);G.uv.push(i/(seg*2),j/seg);G.attr.push(1,0,0,0)}
 const W=seg*2+1;for(let j=0;j<seg;j++)for(let i=0;i<seg*2;i++){const a=j*W+i;G.idx.push(a,a+W,a+1,a+1,a+W,a+W+1)}return G;}
function cylGeo(r0,r1,h,seg,y0){const G=Geo();for(let j=0;j<=1;j++)for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,r=j?r1:r0;G.pos.push(Math.cos(a)*r,y0+j*h,Math.sin(a)*r);G.nor.push(Math.cos(a),.2,Math.sin(a));G.uv.push(i/seg,j);G.attr.push(1,j*.4,0,0)}
 for(let i=0;i<seg;i++){const a=i,b=i+seg+1;G.idx.push(a,b,a+1,a+1,b,b+1)}return G;}
/* 树冠贴片（alpha 卡片）*/
function cellUV(c){const cx=c%2,cy=(c/2)|0;const i=.004;return [cx*.5+i,1-(cy+1)*.5+i,cx*.5+.5-i,1-cy*.5-i]}
function addCard(G,ctr,r,u,w,h,uv,bottom,nfn,aofn,swfn){
 const P=(su,sv)=>[ctr[0]+r[0]*su*w/2+u[0]*sv*h,ctr[1]+r[1]*su*w/2+u[1]*sv*h,ctr[2]+r[2]*su*w/2+u[2]*sv*h];
 const vs=bottom?[P(-1,0),P(1,0),P(1,1),P(-1,1)]:[P(-1,-.5),P(1,-.5),P(1,.5),P(-1,.5)];
 quad(G,vs[0],vs[1],vs[2],vs[3],nfn(vs[0]),nfn(vs[1]),nfn(vs[2]),nfn(vs[3]),uv,vs.map(v=>[aofn(v),swfn(v),0,0]));}
function poplarGeo(){const G=Geo(),R=rng(11),uv=cellUV(0);
 for(let i=0;i<30;i++){const y=.28+R()*.7;const rr=(.115*Math.pow(Math.sin(Math.PI*clamp((y-.26)/.76,0,1)),.7)+.03)*Math.sqrt(R());const a=R()*6.28;
  const c=[Math.cos(a)*rr,y,Math.sin(a)*rr];const a2=R()*6.28,pt=(R()-.5)*1.4;const r=[Math.cos(a2),0,Math.sin(a2)],f=[-Math.sin(a2),0,Math.cos(a2)];
  const u=[f[0]*Math.sin(pt),Math.cos(pt),f[2]*Math.sin(pt)];const s=.14+R()*.09;
  addCard(G,c,r,u,s,s*1.15,uv,false,v=>norm([v[0],(v[1]-.62)*.5+.25,v[2]]),v=>clamp((v[1]-.3)/.7,0,1)*.7+.3*clamp(Math.hypot(v[0],v[2])/.18,0,1),v=>v[1]*v[1])}
 return G;}
function pineGeo(){const G=Geo(),R=rng(23),uv=cellUV(1);const tiers=8;
 for(let t=0;t<tiers;t++){const y=.22+t/tiers*.74;const rad=.34*(1-t/tiers)+.04;const k=6+((tiers-t)/2|0);
  for(let i=0;i<k;i++){const a=i/k*6.28+R()*.5+t;const c=[Math.cos(a)*rad*.5,y,Math.sin(a)*rad*.5];const r=[-Math.sin(a),0,Math.cos(a)];
   const u=norm([Math.cos(a)*.9,-.25+R()*.3,Math.sin(a)*.9]);const s=rad*1.05+.05;
   addCard(G,c,r,u,s,s*.62,uv,false,v=>norm([v[0],(v[1]-y)+.35,v[2]]),v=>clamp(Math.hypot(v[0],v[2])/(rad+.01),0,1)*.6+.4*t/tiers,v=>v[1]*.8)}}
 const c=[0,.95,0];addCard(G,c,[1,0,0],[0,1,0],.12,.16,uv,false,v=>[0,1,0],v=>1,v=>1);addCard(G,c,[0,0,1],[0,1,0],.12,.16,uv,false,v=>[0,1,0],v=>1,v=>1);
 return G;}
function shrubGeo(){const G=Geo(),uv=cellUV(2);const k=7;
 for(let i=0;i<k;i++){const a=i/k*Math.PI;const r=[Math.cos(a),0,Math.sin(a)];addCard(G,[0,0,0],r,[0,1,0],1.25,1,uv,true,v=>norm([v[0],.55,v[2]]),v=>.35+.65*clamp(v[1],0,1),v=>v[1])}
 return G;}
function grassGeo(){const G=Geo(),uv=cellUV(3);for(let i=0;i<3;i++){const a=i/3*Math.PI;addCard(G,[0,0,0],[Math.cos(a),0,Math.sin(a)],[0,1,0],1,.7,uv,true,v=>norm([v[0]*.4,1,v[2]*.4]),v=>.45+.55*v[1]/.7,v=>v[1])}return G;}

/* ---- 网格对象 ---- */
function upload(G,maxInst){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const bufs=[];
 const put=(arr,loc,size,inst)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,inst?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);if(inst)gl.vertexAttribDivisor(loc,1);bufs.push(b);return b};
 const nv=G.pos.length/3;
 put(new Float32Array(G.pos),0,3);put(new Float32Array(G.nor),1,3);put(new Float32Array(G.uv.length?G.uv:new Array(nv*2).fill(0)),2,2);put(new Float32Array(G.attr.length?G.attr:new Array(nv*4).fill(0)),3,4);
 const m={vao,bufs,count:G.idx.length,n:0};
 if(maxInst){m.max=maxInst;m.iPos=new Float32Array(maxInst*4);m.iScl=new Float32Array(maxInst*3);m.iCol=new Float32Array(maxInst*3).fill(1);m.iExt=new Float32Array(maxInst*4);
  m.bPos=put(m.iPos,4,4,1);m.bScl=put(m.iScl,5,3,1);m.bCol=put(m.iCol,6,3,1);m.bExt=put(m.iExt,7,4,1);}
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(G.idx),gl.STATIC_DRAW);bufs.push(ib);
 gl.bindVertexArray(null);return m;}
function flush(m,which){gl.bindVertexArray(null);
 const f=(b,a)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferSubData(gl.ARRAY_BUFFER,0,a)};
 if(!which||which.includes('p'))f(m.bPos,m.iPos);if(!which||which.includes('s'))f(m.bScl,m.iScl);if(!which||which.includes('c'))f(m.bCol,m.iCol);if(!which||which.includes('e'))f(m.bExt,m.iExt);}
function freeMesh(m){if(!m)return;gl.deleteVertexArray(m.vao);m.bufs.forEach(b=>gl.deleteBuffer(b));}

/* ---- 植物贴图集 ---- */
function makeAtlas(){const S=1024,H=512,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const R=rng(5);
 const hsl=(h,s,l,a=1)=>`hsla(${h},${s}%,${l}%,${a})`;
 // 0 杨树叶团
 x.save();x.beginPath();x.rect(0,0,H,H);x.clip();
 for(let i=0;i<1700;i++){const r=230*Math.sqrt(R()),a=R()*6.28;const px=256+Math.cos(a)*r,py=256+Math.sin(a)*r*.95;const s=8+R()*11;
  x.save();x.translate(px,py);x.rotate(R()*6.28);x.fillStyle=hsl(72+R()*34,20+R()*22,17+R()*22+(py<200?7:0));x.beginPath();x.ellipse(0,0,s,s*.58,0,0,6.28);x.fill();x.restore();}
 x.strokeStyle=hsl(30,25,22,.8);x.lineWidth=2;for(let i=0;i<10;i++){x.beginPath();x.moveTo(256,256);x.lineTo(256+(R()-.5)*300,256+(R()-.5)*300);x.stroke()}
 x.restore();
 // 1 樟子松针叶
 x.save();x.translate(H,0);x.beginPath();x.rect(0,0,H,H);x.clip();
 for(let b=0;b<26;b++){let px=40+R()*60,py=120+R()*270;const ang=(R()-.5)*.6,len=280+R()*150;x.strokeStyle=hsl(25,25,22);x.lineWidth=3;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(ang)*len,py+Math.sin(ang)*len);x.stroke();
  for(let k=0;k<70;k++){const t=R();const qx=px+Math.cos(ang)*len*t,qy=py+Math.sin(ang)*len*t;for(let s=-1;s<=1;s+=2){const na=ang+s*(.6+R()*.5);const nl=14+R()*16;
   x.strokeStyle=hsl(105+R()*35,16+R()*16,13+R()*15);x.lineWidth=2;x.beginPath();x.moveTo(qx,qy);x.lineTo(qx+Math.cos(na)*nl,qy+Math.sin(na)*nl);x.stroke()}}}
 x.restore();
 // 2 沙柳
 x.save();x.translate(0,H);x.beginPath();x.rect(0,0,H,H);x.clip();
 for(let i=0;i<46;i++){const tx=30+R()*452,ty=30+R()*190;const bx=256+(R()-.5)*40;x.strokeStyle=hsl(10+R()*15,35,24+R()*12);x.lineWidth=2+R()*2;
  x.beginPath();x.moveTo(bx,510);x.quadraticCurveTo((bx+tx)/2+(R()-.5)*60,(510+ty)/2+40,tx,ty);x.stroke();
  for(let k=0;k<22;k++){const t=.25+R()*.75;const qx=lerp(bx,tx,t)+(R()-.5)*14,qy=lerp(510,ty,t);x.save();x.translate(qx,qy);x.rotate(-1.2+R()*2.4);
   x.fillStyle=hsl(75+R()*25,18+R()*18,38+R()*20);x.beginPath();x.ellipse(0,0,3,11,0,0,6.28);x.fill();x.restore()}}
 x.restore();
 // 3 草丛
 x.save();x.translate(H,H);x.beginPath();x.rect(0,0,H,H);x.clip();
 for(let i=0;i<170;i++){const bx=110+R()*292,h=180+R()*300,lean=(R()-.5)*160;const dry=R()<.3;x.strokeStyle=dry?hsl(45,40,55+R()*10):hsl(60+R()*30,30+R()*20,30+R()*22);x.lineWidth=2+R()*3;
  x.beginPath();x.moveTo(bx,512);x.quadraticCurveTo(bx+lean*.3,512-h*.6,bx+lean,512-h);x.stroke()}
 x.restore();
 // 透明区填充平均色，避免 mipmap 黑边
 const id=x.getImageData(0,0,S,S),d=id.data;
 for(let cy=0;cy<2;cy++)for(let cx=0;cx<2;cx++){let r=0,g=0,b=0,n=0;for(let yy=cy*H;yy<cy*H+H;yy+=3)for(let xx=cx*H;xx<cx*H+H;xx+=3){const k=(yy*S+xx)*4;if(d[k+3]>200){r+=d[k];g+=d[k+1];b+=d[k+2];n++}}
  r/=n||1;g/=n||1;b/=n||1;for(let yy=cy*H;yy<cy*H+H;yy++)for(let xx=cx*H;xx<cx*H+H;xx++){const k=(yy*S+xx)*4;if(d[k+3]<128){d[k]=r;d[k+1]=g;d[k+2]=b}}}
 x.putImageData(id,0,0);
 const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.generateMipmap(gl.TEXTURE_2D);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);return t;}
const atlas=makeAtlas();

/* ---- 阴影贴图 ---- */
const SHS=2048;const shTex=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shTex);
gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,SHS,SHS);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const shFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shTex,0);
gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);let shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);

const geoms={poplar:poplarGeo(),pine:pineGeo(),shrub:shrubGeo(),grass:grassGeo(),box:boxGeo(),sphere:sphereGeo(8),
 trunkP:cylGeo(.03,.018,.62,6,0),trunkS:cylGeo(.035,.008,.95,6,0)};
const skyVAO=(()=>{const G=Geo();G.pos=[-1,-1,0,3,-1,0,-1,3,0];G.nor=[0,0,0,0,0,0,0,0,0];G.idx=[0,1,2];return upload(G)})();
const dustMesh=(()=>{const n=reduce?1500:5000;const pos=new Float32Array(n*3),nor=new Float32Array(n*3);for(let i=0;i<n;i++){pos.set([(Math.random()-.5)*130,Math.random()*40-6,(Math.random()-.5)*130],i*3);nor[i*3]=Math.random()}
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);[[pos,0],[nor,1]].forEach(([a,l])=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,3,gl.FLOAT,false,0,0)});gl.bindVertexArray(null);return {vao,n}})();

/* ---- 构建世界 ---- */
let world=null, terrainMesh=null, waterMesh=null, objs={}, lists={};
function buildWorld(w){
 [terrainMesh,waterMesh].forEach(freeMesh);Object.values(objs).forEach(o=>freeMesh(o.mesh));objs={};lists={};
 // 地形
 const nx=SEGX+1,nz=SEGZ+1,pos=new Float32Array(nx*nz*3),nor=new Float32Array(nx*nz*3),at=new Float32Array(nx*nz*4),hs=new Float32Array(nx*nz);
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=lerp(TX0,TX1,i/SEGX),z=lerp(TZ1,TZ0,j/SEGZ);hs[j*nx+i]=w.height(x,z)}
 const dx=(TX1-TX0)/SEGX,dz=(TZ1-TZ0)/SEGZ;
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=lerp(TX0,TX1,i/SEGX),z=lerp(TZ1,TZ0,j/SEGZ);pos.set([x,hs[k],z],k*3);
  const hl=hs[j*nx+Math.max(i-1,0)],hr=hs[j*nx+Math.min(i+1,nx-1)],hd=hs[Math.max(j-1,0)*nx+i],hu=hs[Math.min(j+1,nz-1)*nx+i];
  const n=norm([-(hr-hl)/(2*dx),1,(hu-hd)/(2*dz)]);nor.set(n,k*3);at.set(w.attr(x,z),k*4)}
 const idx=[];for(let j=0;j<SEGZ;j++)for(let i=0;i<SEGX;i++){const a=j*nx+i;idx.push(a,a+1,a+nx,a+1,a+nx+1,a+nx)}
 terrainMesh=upload({pos,nor,uv:[],attr:at,idx});
 // 水面
 const wa=w.water;if(wa){const G=Geo();if(wa.type==='disc'){G.pos.push(wa.x,wa.y,wa.z);G.nor.push(0,1,0);const s=64;for(let i=0;i<=s;i++){const a=i/s*6.28;G.pos.push(wa.x+Math.cos(a)*wa.r,wa.y,wa.z+Math.sin(a)*wa.r);G.nor.push(0,1,0)}for(let i=1;i<=s;i++)G.idx.push(0,i+1,i)}
  else{G.pos.push(wa.x0,wa.y,wa.z0,wa.x1,wa.y,wa.z0,wa.x1,wa.y,wa.z1,wa.x0,wa.y,wa.z1);G.nor.push(0,1,0,0,1,0,0,1,0,0,1,0);G.idx.push(0,2,1,0,3,2)}waterMesh=upload(G)}
 // 物体
 const R=rng(w.key.length*977);
 w.build((kind,o)=>{(lists[kind]=lists[kind]||[]).push(o)},R);
 const mk=(kind,geo,prog,mat,cast)=>{const L=lists[kind];if(!L||!L.length)return;const m=upload(geo,L.length);m.n=L.length;objs[kind]={mesh:m,prog,mat,cast,list:L};
  L.forEach((t,i)=>{if(t.y===undefined)t.y=w.height(t.x,t.z)-.15;if(t.rot===undefined)t.rot=R()*6.28;m.iPos.set([t.x,t.y,t.z,t.rot],i*4);t.r0=m.iPos[i*4+3];
   const tint=t.tint||(kind==='poplar'?[.9+R()*.25,.95+R()*.2,.85+R()*.2]:kind==='pine'?[.85+R()*.25,.9+R()*.2,.9+R()*.2]:kind==='grass'?[.85+R()*.35,.85+R()*.3,.8+R()*.3]:[.9+R()*.2,.9+R()*.2,.9+R()*.2]);
   if(t.col!==undefined)m.iCol.set(lin(t.col),i*3);else m.iCol.set(tint,i*3);m.iExt.set([t.tilt||0,0,0,0],i*4);
   if(t.sx!==undefined)m.iScl.set([t.sx,t.sy,t.sz],i*3);});flush(m);};
 mk('pine',geoms.pine,P.foliage,0,true);mk('poplar',geoms.poplar,P.foliage,0,true);mk('shrub',geoms.shrub,P.foliage,0,true);mk('grass',geoms.grass,P.foliage,0,false);
 if(lists.pine){lists.trunkS=lists.pine;mk('trunkS',geoms.trunkS,P.solid,3,true)}if(lists.poplar){lists.trunkP=lists.poplar;mk('trunkP',geoms.trunkP,P.solid,3,true)}
 mk('solid',geoms.box,P.solid,0,true);mk('panel',geoms.box,P.solid,1,true);mk('post',geoms.box,P.solid,0,true);mk('sheep',geoms.sphere,P.solid,2,true);mk('sheepH',geoms.sphere,P.solid,0,true);
 if(objs.trunkS){objs.trunkS.mesh.iCol.fill(1)}
 world=w;lastVegKey='';
}
/* ---- 植被生长 ---- */
let lastVegKey='';
function growth(t,p){if(t.mode==='d'){let k=ss(t.b*.85,t.b*.85+.15,S.donateP);if(S.donated&&p>.31)k=1;return k}
 if(t.mode==='g'){const inR=ss(S.gridR,S.gridR-6,Math.hypot(t.x-world.gridC[0],t.z-world.gridC[1]));return ss(t.b,t.b+1.6,S.gridYears)*inR}
 return ss(t.b,t.b+.05,p)}
function updateVeg(p){const key=[p.toFixed(4),S.donateP.toFixed(3),S.gridR.toFixed(1),S.gridYears.toFixed(2),S.myTree.toFixed(3)].join('|');if(key===lastVegKey)return;lastVegKey=key;
 ['pine','poplar','shrub','grass','trunkS','trunkP'].forEach(k=>{const o=objs[k];if(!o)return;const m=o.mesh;o.list.forEach((t,i)=>{let g=growth(t,p);if(t.my)g=S.myTree;const s=Math.max(g,.0001);
   const w=(k==='shrub'?t.w:t.w)*t.h;m.iScl[i*3]=w*s;m.iScl[i*3+1]=t.h*s;m.iScl[i*3+2]=w*s});flush(m,'s')});
 ['panel','post','sheep','sheepH'].forEach(k=>{const o=objs[k];if(!o)return;const m=o.mesh;o.list.forEach((t,i)=>{const g=ss(t.pb,t.pb+.03,p);const s=Math.max(g,.0001);m.iScl[i*3]=t.sx*s;m.iScl[i*3+1]=t.sy*s;m.iScl[i*3+2]=t.sz*s;
   m.iPos[i*4+1]=t.y-(1-g)*2.5});flush(m,'sp')});
 const so=objs.solid;if(so){let ch=false;so.list.forEach((t,i)=>{if(t.minP!==undefined){const s=p>t.minP?1:.0001;m3(so.mesh,i,t,s);ch=true}});if(ch)flush(so.mesh,'s')}}
function m3(m,i,t,s){m.iScl[i*3]=t.sx*s;m.iScl[i*3+1]=t.sy*s;m.iScl[i*3+2]=t.sz*s}

/* ================= 状态 ================= */
const S={mode:'intro',journey:null,p:0,pT:0,donateP:0,donating:false,donated:false,gridR:0,gridHold:false,gridYears:0,myTree:0,myTreeOn:false};
let mouseX=0,mouseY=0,time=0;
addEventListener('pointermove',e=>{mouseX=e.clientX/innerWidth-.5;mouseY=e.clientY/innerHeight-.5},{passive:true});

/* ---- 相机/大气插值 ---- */
function catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)}
function camAt(K,p){let i=0;while(i<K.length-2&&p>K[i+1][0])i++;const a=K[Math.max(i-1,0)],b=K[i],c=K[i+1],d=K[Math.min(i+2,K.length-1)];let t=clamp((p-b[0])/(c[0]-b[0]),0,1);t=t*t*(3-2*t);
 const r=[];for(let k=1;k<7;k++)r.push(catmull(a[k],b[k],c[k],d[k],t));return r}
function atmoAt(K,p){let i=0;while(i<K.length-2&&p>K[i+1][0])i++;const a=K[i],b=K[i+1];const t=ss(a[0],b[0],p);
 const mixc=(x,y)=>{const A=lin(x),B=lin(y);return [lerp(A[0],B[0],t),lerp(A[1],B[1],t),lerp(A[2],B[2],t)]};
 return {storm:lerp(a[1],b[1],t),fog:lerp(a[2],b[2],t),top:mixc(a[3],b[3]),hor:mixc(a[4],b[4]),fogc:mixc(a[5],b[5]),sun:mixc(a[6],b[6]),el:lerp(a[7],b[7],t),exp:lerp(a[8],b[8],t)}}
const HOME_ATMO=[[0,.06,.0019,0x3f6f9f,0xf0c793,0xe3c59c,0xffb46c,.2,1.05],[1,.06,.0019,0x3f6f9f,0xf0c793,0xe3c59c,0xffb46c,.2,1.05]];

/* ================= 渲染 ================= */
let VP,invVP,camPos=[0,0,0],lightVP=new Float32Array(16),U={};
function setCommon(p){gl.useProgram(p);
 gl.uniform3fv(p.u('uCam'),camPos);gl.uniform3fv(p.u('uSunDir'),U.sunDir);gl.uniform3fv(p.u('uSunCol'),U.sunCol);gl.uniform3fv(p.u('uSkyTop'),U.top);gl.uniform3fv(p.u('uSkyHor'),U.hor);
 gl.uniform3fv(p.u('uFogCol'),U.fogc);gl.uniform3fv(p.u('uGroundCol'),U.ground);gl.uniform1f(p.u('uFogDen'),U.fog);gl.uniform1f(p.u('uStorm'),U.storm);gl.uniform1f(p.u('uTime'),time);
 gl.uniform1f(p.u('uExposure'),U.exp);gl.uniform1f(p.u('uShadowOn'),shadowOK?1:0);gl.uniform1f(p.u('uShadowTexel'),1/SHS);gl.uniform1i(p.u('uShadow'),1);gl.uniform1i(p.u('uAtlas'),0);
 gl.uniformMatrix4fv(p.u('uLightVP'),false,lightVP);gl.uniform1f(p.u('uWind'),U.wind);}
function drawObjs(depth){const list=['pine','poplar','shrub','grass','trunkS','trunkP','solid','panel','post','sheep','sheepH'];
 list.forEach(k=>{const o=objs[k];if(!o||(depth&&!o.cast))return;const p=depth?(o.prog===P.foliage?P.foliageD:P.solidD):o.prog;
  if(!depth){setCommon(p);gl.uniformMatrix4fv(p.u('uVP'),false,VP);gl.uniform1f(p.u('uMat'),o.mat)}else{gl.useProgram(p);gl.uniformMatrix4fv(p.u('uVP'),false,lightVP);gl.uniform1f(p.u('uTime'),time);gl.uniform1f(p.u('uWind'),U.wind);gl.uniform1i(p.u('uAtlas'),0)}
  if(o.prog===P.foliage)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);
  gl.bindVertexArray(o.mesh.vao);gl.drawElementsInstanced(gl.TRIANGLES,o.mesh.count,gl.UNSIGNED_INT,0,o.mesh.n)});gl.enable(gl.CULL_FACE);}
function render(){
 // 阴影
 if(shadowOK){gl.bindFramebuffer(gl.FRAMEBUFFER,shFB);gl.viewport(0,0,SHS,SHS);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2,3);
  gl.useProgram(P.terrainD);gl.uniformMatrix4fv(P.terrainD.u('uVP'),false,lightVP);gl.bindVertexArray(terrainMesh.vao);gl.drawElements(gl.TRIANGLES,terrainMesh.count,gl.UNSIGNED_INT,0);
  drawObjs(true);gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shTex);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlas);
 // 天空
 gl.disable(gl.DEPTH_TEST);setCommon(P.sky);gl.uniformMatrix4fv(P.sky.u('uInvVP'),false,invVP);gl.bindVertexArray(skyVAO.vao);gl.drawElements(gl.TRIANGLES,3,gl.UNSIGNED_INT,0);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
 // 地形
 const pt=P.terrain;setCommon(pt);gl.uniformMatrix4fv(pt.u('uVP'),false,VP);gl.uniform1f(pt.u('uProg'),U.prog);gl.uniform1f(pt.u('uRailX'),world.railX);
 gl.uniform1f(pt.u('uGridR'),world.grid?S.gridR:0);gl.uniform1f(pt.u('uGridYears'),S.gridYears);
 if(world.grid){gl.uniform4f(pt.u('uGridBox'),world.gridBox[0],world.gridBox[2],world.gridBox[1],world.gridBox[3]);gl.uniform2f(pt.u('uGridC'),world.gridC[0],world.gridC[1])}
 gl.disable(gl.CULL_FACE);gl.bindVertexArray(terrainMesh.vao);gl.drawElements(gl.TRIANGLES,terrainMesh.count,gl.UNSIGNED_INT,0);gl.enable(gl.CULL_FACE);
 drawObjs(false);
 // 水
 if(waterMesh&&U.waterA>0){setCommon(P.water);gl.uniformMatrix4fv(P.water.u('uVP'),false,VP);gl.uniform3fv(P.water.u('uWaterCol'),lin(world.water.col));gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(waterMesh.vao);gl.drawElements(gl.TRIANGLES,waterMesh.count,gl.UNSIGNED_INT,0);gl.enable(gl.CULL_FACE)}
 // 风沙
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);const pd=P.dust;gl.useProgram(pd);
 gl.uniformMatrix4fv(pd.u('uVP'),false,VP);gl.uniform1f(pd.u('uTime'),reduce?0:time);gl.uniform3fv(pd.u('uCam'),camPos);gl.uniform3f(pd.u('uWindV'),lerp(1.2,16,U.storm),lerp(.3,0,U.storm),lerp(-.4,4,U.storm));
 gl.uniform1f(pd.u('uSize'),lerp(1.4,2.6,U.storm));gl.uniform3fv(pd.u('uDustCol'),U.storm>.3?[.89,.75,.53]:[1,.97,.88]);gl.uniform1f(pd.u('uOpacity'),.14+U.storm*.9);
 gl.bindVertexArray(dustMesh.vao);gl.drawArrays(gl.POINTS,0,dustMesh.n);gl.depthMask(true);gl.disable(gl.BLEND);
}

/* ---- 每帧：相机与大气 ---- */
function sunVec(az,el){return norm([Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)])}
function frameScene(dt){
 let A,c,p=S.p;
 if(S.mode!=='journey'){A=atmoAt(HOME_ATMO,0);const a=time*.035;const cx=Math.sin(a)*120,cz=40+Math.cos(a)*120;c=[cx,cz,42,0,40,4];p=.5;if(S.mode==='intro'){A.storm=.5;A.fog=.006}}
 else{A=atmoAt(world.atmo,p);c=camAt(world.cam,p)}
 const sd=sunVec(world.sunAz||-2.3,A.el);
 U={sunDir:sd,sunCol:A.sun.map(v=>v*lerp(3.0,1.95,ss(.25,.7,A.el))),top:A.top,hor:A.hor,fogc:A.fogc,ground:[A.hor[0]*.55,A.hor[1]*.45,A.hor[2]*.32],fog:A.fog,storm:A.storm,exp:A.exp,prog:S.mode==='journey'?p:.5,wind:.6+A.storm*1.4};
 if(S.mode==='journey'&&world.grid&&p>.08&&p<.5){U.storm*=1-.75*clamp(S.gridR/120,0,1);U.fog*=1-.4*clamp(S.gridR/120,0,1)}
 const wa=world.water;U.waterA=!wa?0:wa.appear?ss(wa.appear[0],wa.appear[1],S.mode==='journey'?p:.6):1;
 const gx=c[0]+mouseX*2.4,gz=c[1];const gh=world.height(gx,gz);const cy=Math.max(gh+c[2],gh+1.4)+(reduce?0:Math.sin(time*.6)*.18)-mouseY*1.2;
 camPos=[gx,cy,gz];const look=[c[3],world.height(c[3],c[4])+c[5],c[4]];
 const aspect=canvas.width/canvas.height;const proj=M4.persp(52*Math.PI/180,aspect,.4,4000);const view=M4.look(camPos,look,[0,1,0]);VP=M4.mul(proj,view);invVP=M4.inv(VP);
 // 光源视锥跟随视点
 const fx=look[0]-camPos[0],fz=look[2]-camPos[2],fl=Math.hypot(fx,fz)||1;const ext=clamp(70+(cy-gh)*1.1,70,420);
 const ctr=[camPos[0]+fx/fl*ext*.7,world.height(camPos[0]+fx/fl*ext*.7,camPos[2]+fz/fl*ext*.7),camPos[2]+fz/fl*ext*.7];
 const le=[ctr[0]+sd[0]*500,ctr[1]+sd[1]*500,ctr[2]+sd[2]*500];lightVP=M4.mul(M4.ortho(-ext,ext,-ext,ext,10,1200),M4.look(le,ctr,[0,1,0]));
 return A;}

/* ================= DOM：叙事 ================= */
const beatsEl=$('beats'),hsEl=$('hotspots');let beatEls=[],hsEls=[];
function buildJourneyDOM(key){const j=J[key];beatsEl.innerHTML='';hsEl.innerHTML='';beatEls=[];hsEls=[];
 j.beats.forEach((b,i)=>{const d=document.createElement('section');d.className='beat'+(b.wide?' wide':'');d.setAttribute('aria-label',(b.title||b.lab||'').replace(/<br>/g,''));
  let txt=b.lab?`<div class="lab">${b.lab}</div>`:'';if(b.title)txt+=`<h2>${b.title}</h2>`;if(b.html)txt+=b.html;
  if(b.quiz)txt+=`<div class="quiz"><div class="q">QUIZ · 选一个答案</div><h3>${b.quiz.q}</h3><div class="opts">${b.quiz.opts.map((o,k)=>`<button data-k="${k}"><b>${'ABC'[k]}</b>${o}</button>`).join('')}</div><div class="ex" aria-live="polite"></div></div>`;
  d.innerHTML=b.wide?`<div>${txt}</div>${b.fig?fig(b.fig):''}${b.cmp?cmp(...b.cmp):''}`:txt;beatsEl.appendChild(d);beatEls.push(d);
  if(b.quiz){const opts=d.querySelectorAll('.opts button'),ex=d.querySelector('.ex');opts.forEach(btn=>btn.addEventListener('click',()=>{const k=+btn.dataset.k;opts.forEach(o=>o.classList.remove('right','wrong'));btn.classList.add(k===b.quiz.a?'right':'wrong');if(k!==b.quiz.a)opts[b.quiz.a].classList.add('right');ex.textContent=(k===b.quiz.a?'答对了。':'差一点。')+b.quiz.ex}))}});
 j.hotspots.forEach(h=>{const b=document.createElement('button');b.className='hs';b.innerHTML=`<span class="dot"></span><span class="t">${h.t}</span>`;b.setAttribute('aria-label','查看：'+h.t);b.addEventListener('click',()=>openDrawer(h));hsEl.appendChild(b);hsEls.push(b)});
 // 刻度
 const g=$('gauge');g.querySelectorAll('.tick').forEach(t=>t.remove());j.ticks.forEach(([p,l])=>{const t=document.createElement('i');t.className='tick';t.style.top=(p*100)+'%';t.innerHTML=`<span>${l}</span>`;g.appendChild(t)});
 $('hJourney').textContent=j.title;
 // 交互
 document.querySelectorAll('[data-cmp]').forEach(initCmp);
 document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.goto;k==='home'?goHome():enterJourney(k)}));
 const db=$('donateBtn');if(db)db.addEventListener('click',()=>{if(S.donating)return;S.donating=true;db.disabled=true;S.donateP=0});
 const gb=$('gridBtn');if(gb){gb.addEventListener('pointerdown',e=>{S.gridHold=true;try{gb.setPointerCapture(e.pointerId)}catch(_){}});['pointerup','pointercancel','pointerleave'].forEach(ev=>gb.addEventListener(ev,()=>S.gridHold=false));
  gb.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();S.gridHold=true}});gb.addEventListener('keyup',()=>S.gridHold=false)}
 const yi=$('yearsIn');if(yi)yi.addEventListener('input',()=>{S.gridYears=+yi.value;if(S.gridR<130)S.gridR=130;const y=S.gridYears;
  $('yearsNow').textContent=y<1?`第 ${y.toFixed(0)} 年：刚铺下的麦草，沙面还在流动。`:y<5?`第 ${y.toFixed(0)} 年：先锋植物萌发，地表开始结皮。`:y<10?`第 ${y.toFixed(0)} 年：形成稳定的草本群落，麦草开始腐烂。`:'第 10 年：形成稳定的灌木群落，植被盖度达到 59.83%。'});
 const pf=$('pledgeForm');if(pf)pf.addEventListener('submit',e=>{e.preventDefault();const n=([...($('pledgeName').value.trim()||'无名')].slice(0,8)).join('');
  const no=(parseInt(sessionStorageGet('pledgeNo')||'0',10)+1);sessionStorageSet('pledgeNo',no);
  $('sealNo').textContent='绿色约定 No.'+String(no).padStart(4,'0');$('sealText').textContent=n+'，在库布其的绿洲旁种下一棵樟子松。愿风里不再有沙，愿每一粒沙都等到一片绿。';
  const ch=[...n].slice(0,4);$('stamp').innerHTML=ch.length<=2?ch.join(''):ch.slice(0,2).join('')+'<br>'+ch.slice(2).join('');$('sealCard').classList.add('show');S.myTreeOn=true;S.myTree=0;$('pledgeName').blur()});
}
function sessionStorageGet(k){try{return sessionStorage.getItem(k)}catch(e){return null}}
function sessionStorageSet(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
function initCmp(el){const top=el.querySelector('.top'),h=el.querySelector('.handle');let v=50;const set=x=>{v=clamp(x,0,100);top.style.clipPath=`inset(0 ${100-v}% 0 0)`;h.style.left=v+'%'};set(50);
 const mv=e=>{const r=el.getBoundingClientRect();set((e.clientX-r.left)/r.width*100)};let drag=false;
 el.addEventListener('pointerdown',e=>{drag=true;try{el.setPointerCapture(e.pointerId)}catch(_){}mv(e)});el.addEventListener('pointermove',e=>{if(drag)mv(e)});['pointerup','pointercancel'].forEach(ev=>el.addEventListener(ev,()=>drag=false));
 el.tabIndex=0;el.setAttribute('role','slider');el.setAttribute('aria-label','前后对比');el.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')set(v-5);if(e.key==='ArrowRight')set(v+5)});}
function openDrawer(h){const j=J[S.journey];$('drawerBody').innerHTML=`<div class="k">${h.k}</div><h3>${h.t}</h3><p>${h.d}</p>${h.img?fig(h.img):''}`;$('drawer').classList.add('open')}
$('drawerX').addEventListener('click',()=>$('drawer').classList.remove('open'));
addEventListener('keydown',e=>{if(e.key==='Escape'){$('drawer').classList.remove('open');$('about').classList.remove('open')}});
$('aboutBtn').addEventListener('click',()=>$('about').classList.add('open'));$('aboutX').addEventListener('click',()=>$('about').classList.remove('open'));

/* ================= 模式切换 ================= */
const scroller=$('scroller');
function readScroll(){if(S.mode!=='journey')return;const max=scroller.offsetHeight-innerHeight;S.pT=clamp(scrollY/max,0,1)}
addEventListener('scroll',readScroll,{passive:true});
function fade(fn){$('fader').classList.add('on');setTimeout(()=>{fn();requestAnimationFrame(()=>setTimeout(()=>$('fader').classList.remove('on'),120))},560)}
function enterJourney(key){$('drawer').classList.remove('open');fade(()=>{buildWorld(W[key]);S.mode='journey';S.journey=key;S.p=S.pT=0;Object.assign(S,{donateP:0,donating:false,donated:false,gridR:0,gridYears:0,myTree:0,myTreeOn:false});
 if(key==='kubuqi'){const pa=W.kubuqi.pledgeAt;}
 buildJourneyDOM(key);scroller.style.height=J[key].len+'vh';document.body.classList.add('scroll','in-journey');document.body.classList.remove('at-home');scrollTo(0,0);hudIdx=-1})}
function goHome(){$('drawer').classList.remove('open');fade(()=>{buildWorld(W.muus);S.mode='home';S.journey=null;beatsEl.innerHTML='';hsEl.innerHTML='';beatEls=[];hsEls=[];scroller.style.height='100vh';
 document.body.classList.remove('scroll','in-journey');document.body.classList.add('at-home');scrollTo(0,0)})}
$('homeBtn').addEventListener('click',goHome);
document.querySelectorAll('.jcard').forEach(b=>b.addEventListener('click',()=>enterJourney(b.dataset.j)));

/* ================= HUD ================= */
let hudIdx=-1;
function updateHUD(p,storm){$('hProg').textContent=String(Math.round(p*100)).padStart(3,'0')+'%';$('gMark').style.top=(p*100)+'%';$('rWind').style.width=Math.round(storm*100)+'%';
 const H=J[S.journey].hud;let k=0;for(let i=0;i<H.length;i++)if(p>=H[i][0])k=i;if(k!==hudIdx){hudIdx=k;$('rPlace').textContent=H[k][1];$('rYear').textContent=H[k][2];$('rData').textContent=H[k][3]}
 $('scrollHint').style.opacity=p>.015?0:1}

/* ================= 声音 ================= */
let actx=null,windGain,windFilter,soundOn=false,nextBird=0;
function initAudio(){actx=new (window.AudioContext||window.webkitAudioContext)();const len=actx.sampleRate*3,buf=actx.createBuffer(1,len,actx.sampleRate),d=buf.getChannelData(0);let l=0;
 for(let i=0;i<len;i++){const w=Math.random()*2-1;l=(l+.02*w)/1.02;d[i]=l*3.5}const src=actx.createBufferSource();src.buffer=buf;src.loop=true;
 windFilter=actx.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=500;windFilter.Q.value=.7;windGain=actx.createGain();windGain.gain.value=0;src.connect(windFilter).connect(windGain).connect(actx.destination);src.start()}
function bird(){if(!actx)return;const o=actx.createOscillator(),g=actx.createGain(),t=actx.currentTime,f=2600+Math.random()*1400;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.35,t+.09);o.frequency.exponentialRampToValueAtTime(f*.9,t+.16);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.03,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+.22)}
$('soundBtn').addEventListener('click',()=>{try{if(!actx)initAudio();soundOn=!soundOn;if(soundOn)actx.resume();$('soundBtn').textContent='声音 · '+(soundOn?'开':'关');$('soundBtn').setAttribute('aria-pressed',soundOn)}catch(e){$('soundBtn').textContent='声音不可用'}});

/* ================= 开场：拂沙 ================= */
const sc=$('sandCv'),sx=sc.getContext('2d');const GW=48,GH=28;let cleared=new Float32Array(GW*GH),introDone=false,sandPat=null,lastPt=null,stall=0;
function paintSand(full){const w=sc.width,h=sc.height;if(!sandPat){const T=512;const t=document.createElement('canvas');t.width=t.height=T;const c=t.getContext('2d');const id=c.createImageData(T,T);
  for(let i=0;i<T*T;i++){const x=i%T,y=(i/T)|0;const n=fbm(x*.05,y*.05)*.5+vnoise(x*.6,y*.6)*.5;const rip=Math.sin(x*.12+y*.05+fbm(x*.02,y*.02)*6)*.5+.5;
   const v=.86+n*.1+rip*.035;id.data[i*4]=226*v;id.data[i*4+1]=190*v;id.data[i*4+2]=136*v;id.data[i*4+3]=255}c.putImageData(id,0,0);sandPat=sx.createPattern(t,'repeat')}
 sx.globalCompositeOperation='source-over';sx.globalAlpha=full?1:.012;sx.fillStyle=sandPat;sx.fillRect(0,0,w,h);sx.globalAlpha=1}
function sizeSand(){sc.width=Math.round(innerWidth*Math.min(devicePixelRatio,1.5));sc.height=Math.round(innerHeight*Math.min(devicePixelRatio,1.5));paintSand(true);cleared.fill(0)}
function sweep(x0,y0,x1,y1){const k=sc.width/innerWidth;const r=Math.max(60,innerWidth*.055)*k;const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/12));sx.globalCompositeOperation='destination-out';
 for(let i=0;i<=steps;i++){const x=lerp(x0,x1,i/steps)*k,y=lerp(y0,y1,i/steps)*k;const g=sx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(0,0,0,.9)');g.addColorStop(.6,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=g;sx.beginPath();sx.arc(x,y,r,0,6.28);sx.fill();
  const gx=Math.floor(x/sc.width*GW),gy=Math.floor(y/sc.height*GH);const rr=Math.ceil(r/sc.width*GW);for(let j=-rr;j<=rr;j++)for(let q=-rr;q<=rr;q++){const a=gx+q,b=gy+j;if(a<0||b<0||a>=GW||b>=GH)continue;if(q*q+j*j<=rr*rr)cleared[b*GW+a]=Math.min(1,cleared[b*GW+a]+.35)}}
 sx.globalCompositeOperation='source-over'}
sc.addEventListener('pointerdown',e=>{lastPt=[e.clientX,e.clientY];try{sc.setPointerCapture(e.pointerId)}catch(_){}sweep(e.clientX,e.clientY,e.clientX,e.clientY);sc.style.cursor='grabbing'});
sc.addEventListener('pointermove',e=>{if(!lastPt)return;sweep(lastPt[0],lastPt[1],e.clientX,e.clientY);lastPt=[e.clientX,e.clientY]});
['pointerup','pointercancel'].forEach(ev=>sc.addEventListener(ev,()=>{lastPt=null;sc.style.cursor='grab'}));
function introTick(dt){if(introDone)return;let s=0;for(let i=0;i<cleared.length;i++){cleared[i]=Math.max(0,cleared[i]-dt*.012);s+=cleared[i]}const f=s/cleared.length;
 if(!lastPt){paintSand(false);stall+=dt}else stall=0;
 $('introBar').style.width=Math.min(100,f/.5*100)+'%';$('introMsg').textContent=stall>2.5&&f>.05&&f<.5?'风又把沙吹回来了，再多拂开一些':'已拂开 '+Math.round(Math.min(1,f/.5)*100)+'%';
 if(f>=.5)finishIntro()}
function finishIntro(){if(introDone)return;introDone=true;$('intro').classList.add('gone');S.mode='home';setTimeout(()=>$('intro').style.display='none',1500)}
$('skipBtn').addEventListener('click',finishIntro);

/* ================= 主循环 ================= */
addEventListener('resize',()=>{DPR=Math.min(devicePixelRatio||1,1.75);resize();if(!introDone)sizeSand();readScroll()});
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
 if(S.mode==='journey'){S.p+=(S.pT-S.p)*(reduce?1:Math.min(1,dt*3.2))}
 if(S.mode==='intro')introTick(dt);
 const p=S.p;
 if(S.donating&&S.donateP<1){S.donateP=Math.min(1,S.donateP+dt/(reduce?.5:4.5));const dc=$('donateCount');if(dc)dc.innerHTML=Math.round(S.donateP*50000).toLocaleString('zh-CN')+(S.donateP>=1?'+':'')+'<small>棵树苗 · 只留下一张美元作纪念</small>';if(S.donateP>=1)S.donated=true}
 if(S.mode==='journey'&&world.grid){const before=S.gridR;if(S.gridHold)S.gridR=Math.min(130,S.gridR+dt*42);if(p>.27)S.gridR=Math.min(130,S.gridR+dt*80);
  if(S.gridR!==before){const gc=$('gridCount');if(gc)gc.innerHTML='地表风速 −'+Math.round(clamp(S.gridR/130,0,1)*80)+'%'+(S.gridR>=130?' 以上':'')+'<small>风洞实验：风速低于 20 m/s 时，草方格可使地表风速降低 80% 以上</small>'}
  if(p>.45&&S.gridYears<10&&!$('yearsIn').matches(':active')){S.gridYears=Math.min(10,S.gridYears+dt*3);$('yearsIn').value=S.gridYears}}
 if(S.myTreeOn&&S.myTree<1)S.myTree=Math.min(1,S.myTree+dt*.45);
 const A=frameScene(dt);
 updateVeg(S.mode==='journey'?p:.5);
 render();
 if(S.mode==='journey'){
  for(let i=0;i<beatEls.length;i++){const B=J[S.journey].beats[i],el=beatEls[i];const d=(p-B.c)/B.w;const o=clamp(1.25-Math.abs(d)*1.25,0,1);const oo=o*o*(3-2*o);el.style.opacity=oo;el.classList.toggle('on',oo>.5);
   el.style.transform=innerWidth>860?`translateY(calc(-50% + ${(-d*36).toFixed(1)}px))`:`translateY(${(-d*26).toFixed(1)}px)`}
  const hs=J[S.journey].hotspots;hs.forEach((h,i)=>{const el=hsEls[i];const vis=p>=h.r[0]&&p<=h.r[1]&&!(h.t==='你的树'&&!S.myTreeOn);let show=false;
   if(vis){const y=world.height(h.x,h.z)+h.h;const v=VP;const cx=v[0]*h.x+v[4]*y+v[8]*h.z+v[12],cy=v[1]*h.x+v[5]*y+v[9]*h.z+v[13],cw=v[3]*h.x+v[7]*y+v[11]*h.z+v[15];
    if(cw>0){const sx_=(cx/cw*.5+.5)*innerWidth,sy_=(1-(cy/cw*.5+.5))*innerHeight;if(sx_>20&&sx_<innerWidth-120&&sy_>70&&sy_<innerHeight-80){el.style.left=sx_+'px';el.style.top=sy_+'px';show=true}}}
   el.classList.toggle('show',show);el.style.pointerEvents=show?'auto':'none'});
  updateHUD(p,U.storm)}
 if(soundOn&&actx){windGain.gain.setTargetAtTime(.04+U.storm*.32,actx.currentTime,.3);windFilter.frequency.setTargetAtTime(380+U.storm*520,actx.currentTime,.4);
  const green=(S.mode==='journey'?ss(.15,.5,p):.5)*(1-U.storm);if(green>.35&&time>nextBird){bird();if(Math.random()<.5)setTimeout(bird,140);nextBird=time+1.5+Math.random()*4/green}}
 requestAnimationFrame(frame)}


buildWorld(W.muus);sizeSand();
requestAnimationFrame(t=>{last=t;$('loader').classList.add('gone');frame(t)});

})();
