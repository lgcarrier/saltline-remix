/* Dust environment contract: metres, Y up; clear dry afternoon. These hooks
 * reuse the original Saltline HDR renderer, PMREM and soft directional shadow.
 * Call dustConfigure before the renderer is created so its environment capture
 * and direct sun describe the same illumination. */
function dustConfigure() {
  Mn.dir.set(.48,.73,.49).normalize();
  Mn.color.setRGB(1,.94,.82); Mn.intensity=5.2;
  en.zenith.setRGB(.16,.31,.54);
  en.horizon.setRGB(.61,.65,.67);
  en.horizonAway.setRGB(.47,.58,.67);
  en.fog.setRGB(.57,.59,.58);
  H6=`
  // SALTLINE_SKY — clear desert atmosphere, shared by visible sky and PMREM.
  precision highp float;
  varying vec3 vDir;
  uniform float uTime,uEnv,uFlash;
  uniform vec3 uSunDir,uZen,uHor,uHorAway,uSunCol;
  void main(){
    vec3 d=normalize(vDir);float h=max(d.y,0.0),mu=dot(d,uSunDir),s=max(mu,0.0);
    float toward=pow(max(dot(normalize(d.xz+vec2(.00001)),normalize(uSunDir.xz)),0.0),2.0);
    vec3 horizon=mix(uHorAway,uHor,toward);
    vec3 col=mix(horizon,uZen,pow(smoothstep(0.0,.85,h),.43));
    col+=uSunCol*(pow(s,10.0)*.035+pow(s,90.0)*.075+pow(s,900.0)*.22);
    float disk=smoothstep(.999953,.999972,mu);
    col+=uSunCol*disk*65.0*(1.0-uEnv);
    if(d.y<0.0)col=mix(horizon,vec3(.24,.205,.15),smoothstep(0.0,.6,-d.y));
    col=mix(col,min(col,vec3(4.0)),uEnv);
    gl_FragColor=vec4(col,1.0);
  }`;
  // The original particle module reads the quality preset's rain multiplier.
  for(const preset of Object.values(Pr))preset.rain=0;
}

function dustLighting(i,map,root) {
  const T=i.THREE,group=new T.Group();group.name='dust-tunnel-lighting';root.add(group);
  const lamps=[],parts=[];
  const housing=i.mats.get('steel_dark',{interior:true});
  const glow=new T.MeshStandardMaterial({color:0xeee3ca,emissive:0xffe6b2,emissiveIntensity:1.35,roughness:.5});
  const bulbGeo=new T.CylinderGeometry(.065,.065,.34,10);
  const capGeo=new T.CylinderGeometry(.10,.10,.07,10);
  const sources=map.lights.filter(x=>x.classname==='light');
  for(const source of sources){
    const p=source.pos;
    // Source lights are retained at their actual BSP positions. Small service
    // luminaires explain the light in covered arches without occupying a route.
    const bulb=new T.Mesh(bulbGeo,glow);bulb.position.set(p[0],p[1]+.15,p[2]);parts.push(bulb);
    for(const sign of [-1,1]){const cap=new T.Mesh(capGeo,housing);cap.position.copy(bulb.position).y+=sign*.19;parts.push(cap);}
    const lamp=new T.PointLight(0xffe6bf,p[1]<0?11:8,11,2);lamp.position.set(...p);lamp.name='dust-source-light-'+source.id;group.add(lamp);lamps.push(lamp);
  }
  const batches=new Map();
  for(const part of parts){const key=part.geometry.uuid+part.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(part);}
  for(const batch of batches.values()){
    const mesh=new T.InstancedMesh(batch[0].geometry,batch[0].material,batch.length);
    batch.forEach((part,n)=>{part.updateMatrix();mesh.setMatrixAt(n,part.matrix);});mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);
  }
  i.render.post.wet=0;i.mats.uniforms.wet.value=0;
  // Keep contact on the scale of crate feet and masonry joints. The wider
  // harbor AO radius produces black wedges on Dust's shallow tunnel arches.
  Object.assign(i.render.tune,{volSigma:.0011,volInteriorDust:1.25,volFarHaze:.16,grain:.004,ca:.00015,bloom:.035,vignette:.14,lookSat:.99,lookPower:1.02,aoRadius:.28,aoIntensity:.65,aoStrength:.50});
  return {lamps,stats:{sourceLights:lamps.length,fixtureBatches:batches.size,weather:'dry',sky:'clear',sunDirection:Mn.dir.toArray(),sunIntensity:Mn.intensity}};
}

function dustGround(i) {
  // Geometry, impacts, footsteps and navigation all use the BSP triangles.
  // This is an intentional dry ground implementation, not a missing module.
  return {stub:false,kind:'dry-bsp',wetnessAt:()=>0,isPuddle:()=>false,surfaceAt:(x,z)=>i.level?.groundSurfaceAt(x,z)||'concrete',update(){i.render.post.wet=0;i.mats.uniforms.wet.value=0;}};
}

function dustBackdrop(i) {
  const T=i.THREE,map=window.__DUST_MAP,root=new T.Group();root.name='dust-distance';i.scene.add(root);
  const groups=new Map(),terrain=[],margin=8;
  const stats={tris:0,drawCalls:0,setting:'desert',buildings:0,towers:0,collisionChanges:0,
    sourceXZ:{min:[map.bounds.min[0],map.bounds.min[2]],max:[map.bounds.max[0],map.bounds.max[2]]},
    clearanceMargin:margin,bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},
    extentRule:'Every backdrop vertex lies outside the source XZ bounding rectangle expanded by 8 metres.'};
  const plaster=i.dustMaterials.get('dust_plaster',{vertexColors:true});
  const stone=i.dustMaterials.get('dust_stone',{vertexColors:true});
  const recess=new T.MeshStandardMaterial({color:0x51483b,roughness:1,vertexColors:true,envMapIntensity:.35});
  function recordBounds(p){
    const mn=map.bounds.min,mx=map.bounds.max;
    if(p[0]>=mn[0]-margin&&p[0]<=mx[0]+margin&&p[2]>=mn[2]-margin&&p[2]<=mx[2]+margin)throw new Error('Dust backdrop entered source playfield');
    for(let n=0;n<3;n++){stats.bounds.min[n]=Math.min(stats.bounds.min[n],p[n]);stats.bounds.max[n]=Math.max(stats.bounds.max[n],p[n]);}
  }
  function addGeometry(geometry,material,position,tint=0xffffff,rotation=0){
    if(rotation)geometry.rotateY(rotation);geometry.translate(...position);
    const geo=geometry.index?geometry.toNonIndexed():geometry,ps=geo.attributes.position,ns=geo.attributes.normal,uv=geo.attributes.uv,color=new T.Color(tint);
    let batch=groups.get(material);if(!batch){batch={p:[],n:[],uv:[],c:[]};groups.set(material,batch);}
    for(let k=0;k<ps.count;k++){
      const p=[ps.getX(k),ps.getY(k),ps.getZ(k)];recordBounds(p);batch.p.push(...p);batch.n.push(ns.getX(k),ns.getY(k),ns.getZ(k));
      batch.uv.push(uv?uv.getX(k)*4:p[0]*.25,uv?uv.getY(k)*4:p[1]*.25);batch.c.push(color.r,color.g,color.b);
    }
    stats.tris+=ps.count/3;if(geo!==geometry)geo.dispose();geometry.dispose();
  }
  const box=(mat,w,h,d,x,y,z,tint)=>addGeometry(new T.BoxGeometry(w,h,d),mat,[x,y,z],tint);
  function house(x,z,base,w,d,h,face,index){
    const tint=[0xe5d5b8,0xf0dfc2,0xd6c5a9,0xe4cdb0][index%4];
    box(plaster,w,h,d,x,base+h/2,z,tint);
    // Flat earthen roof with its own parapet thickness and restrained coping.
    const py=base+h+.24;
    box(stone,w+.15,.20,d+.15,x,base+h,z,0xddd1b9);
    for(const sign of [-1,1]){
      box(plaster,w,.48,.26,x,py,z+sign*(d/2-.13),tint);
      box(plaster,.26,.48,d-.52,x+sign*(w/2-.13),py,z,tint);
    }
    const rows=Math.max(1,Math.floor(h/3.1)),columns=Math.max(2,Math.floor((face==='x'?d:w)/3.0));
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      const along=((column+.5)/columns-.5)*(face==='x'?d:w),wy=base+1.7+row*2.9;
      if(face==='x')box(recess,.045,1.04,.65,x-w/2-.025,wy,z+along,0xd5c9ae);
      else box(recess,.65,1.04,.045,x+along,wy,z-d/2-.025,0xd5c9ae);
    }
    if(index%3===0)box(plaster,w*.48,2.4,d*.45,x+w*.12,base+h+1.2,z+d*.1,0xdbc4a6);
    stats.buildings++;
  }
  // Settlement sits beyond the source's eastern and southern enclosing walls.
  // Its tallest elements are slender landmarks; block heights remain secondary
  // to Dust's own nearby arches, cover and roofline.
  const houses=[
    [88,-56,1,11,12,10,'x'],[96,-39,2,13,12,14,'x'],[109,-22,3,15,13,12,'x'],
    [93,-3,1,11,13,11,'x'],[108,14,4,14,12,13,'x'],[126,-5,3,13,15,16,'x'],
    [119,-48,4,14,11,13,'x'],[139,25,6,16,12,14,'x'],
    [-32,82,1,14,12,13,'z'],[-12,90,3,12,13,16,'z'],[9,78,1,13,12,13,'z'],
    [28,86,3,12,11,17,'z'],[48,82,1,15,12,12,'z'],[67,97,4,13,14,17,'z'],
    [11,105,5,17,13,17,'z'],[42,112,5,14,13,15,'z'],
    [-93,-81,2,13,13,10,'z'],[-111,-94,5,14,12,15,'z'],[-101,-118,4,12,13,12,'z']
  ];
  houses.forEach((h,n)=>house(...h,n));
  function tower(x,z,base,height){
    const tint=0xe6d2ae;
    box(plaster,3.2,5,3.2,x,base+2.5,z,tint);
    addGeometry(new T.CylinderGeometry(.94,1.22,height-7,10),plaster,[x,base+5+(height-7)/2,z],tint);
    addGeometry(new T.CylinderGeometry(1.55,1.4,.38,12),stone,[x,base+height-2.2,z],0xd8c5a5);
    addGeometry(new T.CylinderGeometry(.80,.82,2.1,10),plaster,[x,base+height-.98,z],tint);
    addGeometry(new T.ConeGeometry(1.08,1.65,10),stone,[x,base+height+.85,z],0xb6ac95);
    stats.towers++;
  }
  tower(121,9,4,27);tower(31,94,5,29);
  // A low dome is a distant regional cue, separate from the native map walls.
  addGeometry(new T.SphereGeometry(3.5,18,9,0,Math.PI*2,0,Math.PI/2),stone,[9,14.2,78],0xd4c0a0);

  const fract=x=>x-Math.floor(x),smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
  const hash=(x,z,seed)=>{let n=Math.imul(x+seed*37,374761393)^Math.imul(z+seed*19,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  function noise(x,z,seed){
    const ix=Math.floor(x),iz=Math.floor(z),fx=fract(x),fz=fract(z),u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
    const a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
  }
  const ridgeMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,envMapIntensity:.42,side:T.DoubleSide});
  ridgeMaterial.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vDustRidgeWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvDustRidgeWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vDustRidgeWorld;
      float drHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float drNoise(vec3 p){vec3 q=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(drHash(q),drHash(q+vec3(1,0,0)),f.x),mix(drHash(q+vec3(0,1,0)),drHash(q+vec3(1,1,0)),f.x),f.y),mix(mix(drHash(q+vec3(0,0,1)),drHash(q+vec3(1,0,1)),f.x),mix(drHash(q+vec3(0,1,1)),drHash(q+vec3(1,1,1)),f.x),f.y),f.z);}
    `).replace('#include <map_fragment>',`#include <map_fragment>
      float ridgeSediment=sin(vDustRidgeWorld.y*1.9+drNoise(vDustRidgeWorld*.075)*2.1);
      float ridgeRock=drNoise(vDustRidgeWorld*vec3(.37,.13,.37));
      float ridgeFissure=smoothstep(.53,.72,drNoise(vDustRidgeWorld*vec3(.45,.055,.45)))*.16;
      diffuseColor.rgb*=mix(.87,1.10,ridgeRock)*(1.0-ridgeFissure)*(1.0-.035*ridgeSediment);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      // Fine weathered stone relief breaks specular/surface uniformity, while
      // the actual grid above supplies the visible crags and eroded gullies.
      float ridgeBump=.055*drNoise(vDustRidgeWorld*.8)+.025*ridgeSediment;
      vec3 ridgeDx=dFdx(-vViewPosition),ridgeDy=dFdy(-vViewPosition);
      vec3 ridgeR1=cross(ridgeDy,normal),ridgeR2=cross(normal,ridgeDx);
      float ridgeDet=dot(ridgeDx,ridgeR1);
      normal=normalize(abs(ridgeDet)*normal-sign(ridgeDet)*(dFdx(ridgeBump)*ridgeR1+dFdy(ridgeBump)*ridgeR2));
    `);
  };
  ridgeMaterial.customProgramCacheKey=()=> 'dust-rugged-limestone-v2';
  function ruggedRange(name,angle,distance,width,depth,height,seed,tint){
    const nx=80,nz=28,positions=[],colors=[],indices=[],color=new T.Color(tint),radial=[Math.cos(angle),Math.sin(angle)],tangent=[-radial[1],radial[0]];
    for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){
      const u=x/nx*2-1,v=z/nz*2-1,along=u*width/2,across=v*depth/2;
      const warp=(noise(along*.012,across*.009,seed)-.5)*.18;
      const peakU=u+warp;
      const peaks=.72*Math.exp(-Math.pow((peakU+.61)/.25,2))+Math.exp(-Math.pow((peakU+.035)/.31,2))+.76*Math.exp(-Math.pow((peakU-.56)/.23,2));
      const spine=(noise(along*.019,7,seed+3)-.5)*.28;
      const cross=Math.exp(-Math.pow(Math.abs(v-spine)*2.25,1.45));
      const edge=smooth(0,.16,1-Math.abs(u))*smooth(0,.17,1-Math.abs(v));
      // Long downslope ravines and short fractured ridges share the same rock
      // mass, rather than drawing a smooth ring with noise only on its outline.
      const gully=1-Math.abs(2*noise(along*.045+noise(across*.012,9,seed)*.7,across*.008,seed+7)-1);
      const fracture=noise(along*.16,across*.11,seed+13)-.5;
      let relief=height*peaks*cross*(.64+.36*gully)+fracture*8*cross;
      const terrace=Math.floor(relief/4.8)*4.8+4.8*smooth(.08,.92,fract(relief/4.8));relief=relief*.63+terrace*.37;
      const y=-10+Math.max(0,relief)*edge;
      const r=distance+across,p=[-3+radial[0]*r+tangent[0]*along,y,-25+radial[1]*r+tangent[1]*along];
      recordBounds(p);positions.push(...p);
      const mineral=.82+.22*noise(along*.035,across*.04,seed+21)+.06*noise(along*.19,across*.17,seed+2);
      const band=.96+.04*Math.sin(y*.49+noise(along*.012,across*.009,seed)*3);
      colors.push(color.r*mineral*band,color.g*mineral*band,color.b*mineral*band);
      if(z<nz&&x<nx){const k=z*(nx+1)+x,j=k+nx+1;indices.push(k,k+1,j,k+1,j+1,j);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,ridgeMaterial);mesh.name=name;root.add(mesh);terrain.push(mesh);stats.tris+=indices.length/3;stats.drawCalls++;
  }
  // Three disconnected relief masses replace the enclosing smooth ring. The
  // nearest possible range point is >220m from the scene origin; every vertex
  // is also checked against the source's expanded XZ bounds by recordBounds.
  // Lower peaks at 330–405m keep these ranges secondary to the native roofline.
  ruggedRange('dust-eastern-limestone-mass',.06,345,340,150,82,17,0xa49b8b);
  ruggedRange('dust-western-limestone-mass',3.32,365,360,160,87,41,0xa99e8a);
  ruggedRange('dust-southern-distant-range',1.18,405,370,170,78,79,0xb4b1a7);
  for(const [material,batch] of groups){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(batch.c,3));geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,material);mesh.name='dust-settlement-batch';mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);stats.drawCalls++;
  }
  stats.bounds.min=stats.bounds.min.map(v=>+v.toFixed(3));stats.bounds.max=stats.bounds.max.map(v=>+v.toFixed(3));
  stats.terrainLayers=terrain.length;
  return {stub:false,root,boat:null,crane:null,ship:null,skyline:root,gulls:null,update(){},stats};
}
