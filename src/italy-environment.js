/* Clear Mediterranean afternoon. These hooks retain Saltline's HDR renderer,
 * PMREM environment, exposure and directional shadow pipeline. The sunlight,
 * visible sky and environment capture share the same configuration. */
function italyConfigure(){
  Mn.dir.set(-.48,.79,.38).normalize();Mn.color.setRGB(1,.94,.83);Mn.intensity=4.6;
  en.zenith.setRGB(.20,.34,.49);en.horizon.setRGB(.67,.72,.73);en.horizonAway.setRGB(.58,.66,.73);en.fog.setRGB(.62,.67,.68);
  H6=`
  precision highp float;
  varying vec3 vDir;
  uniform float uTime,uEnv,uFlash;
  uniform vec3 uSunDir,uZen,uHor,uHorAway,uSunCol;
  float itHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float itNoise(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(itHash(a),itHash(a+vec2(1,0)),f.x),mix(itHash(a+vec2(0,1)),itHash(a+vec2(1,1)),f.x),f.y);}
  void main(){
    vec3 d=normalize(vDir);float h=max(d.y,0.0),mu=dot(d,uSunDir),s=max(mu,0.0);
    float toward=pow(max(dot(normalize(d.xz+vec2(.00001)),normalize(uSunDir.xz)),0.0),2.0);
    vec3 horizon=mix(uHorAway,uHor,toward);vec3 col=mix(horizon,uZen,pow(smoothstep(0.0,.9,h),.47));
    col+=uSunCol*(pow(s,12.0)*.04+pow(s,100.0)*.07+pow(s,950.0)*.20);
    vec2 p=d.xz/max(.15,d.y)*2.4;float cloud=itNoise(p)*.56+itNoise(p*2.1)*.27+itNoise(p*4.3)*.12+itNoise(p*8.7)*.05;
    float density=smoothstep(.63,.78,cloud)*smoothstep(.035,.23,d.y)*.47;
    col=mix(col,vec3(.88,.90,.89)+uSunCol*pow(s,8.0)*.12,density);
    col+=uSunCol*smoothstep(.999953,.999972,mu)*65.0*(1.0-uEnv);
    if(d.y<0.0)col=mix(horizon,vec3(.22,.24,.19),smoothstep(0.0,.6,-d.y));
    col=mix(col,min(col,vec3(4.0)),uEnv);gl_FragColor=vec4(col,1.0);
  }`;
  if(window.__ITALY_HDRI){
    // Configure before renderer construction: its directional-shadow bounds,
    // post-process sun position and PMREM all depend on this exact direction.
    const hdri=italyPrepareHDRI(lt,Mn.dir),originalUniforms=W6;
    window.__ITALY_HDRI_STATE=hdri;
    Mn.dir.copy(hdri.sunDirection);Jy=hdri.stats.environmentIntensity;
    const sky=hdri.stats.skyMeanRGB,scale=hdri.stats.radianceScale;
    en.zenith.setRGB(...sky.zenith.map(v=>v*scale));en.horizon.setRGB(...sky.toward.map(v=>v*scale));en.horizonAway.setRGB(...sky.away.map(v=>v*scale));en.fog.setRGB(...sky.horizon.map(v=>v*scale));
    H6=hdri.fragmentShader;
    W6=function(noise){return Object.assign(originalUniforms(noise),hdri.uniforms);};
    Vy=function(renderer,sky){return italyCaptureHDRI(renderer,sky,hdri);};
  }
  for(const preset of Object.values(Pr))preset.rain=0;
}

function italyMarketBounce(root){
  // A bounded diffuse-irradiance approximation for light reflected from the
  // sunlit paving around the original canopy. It is intentionally separate
  // from lamps and emissive materials, and runs before material/contact AO.
  const materials=new Set(),stats={version:2,kind:'bounded reflected diffuse irradiance approximation',bounds:{min:[9.9568,-4.064,6.2992],max:[18.0848,-.1016,13.208]},featherMetres:.8,radianceRGB:[.120,.104,.080],normalResponse:'ground hemisphere with weak surrounding-wall contribution',materials:0,additionalLights:0,emissiveContribution:0,physicalGI:false};
  root.traverse(object=>{for(const material of (Array.isArray(object.material)?object.material:[object.material]))if(material?.isMeshStandardMaterial)materials.add(material);});
  for(const material of materials){
    const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
    material.onBeforeCompile=function(shader,renderer){
      previousCompile.call(this,shader,renderer);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vItalyMarketBounceWorld;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        vec4 italyBouncePosition=vec4(transformed,1.);
        #ifdef USE_BATCHING
          italyBouncePosition=batchingMatrix*italyBouncePosition;
        #endif
        #ifdef USE_INSTANCING
          italyBouncePosition=instanceMatrix*italyBouncePosition;
        #endif
        vItalyMarketBounceWorld=(modelMatrix*italyBouncePosition).xyz;
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vItalyMarketBounceWorld;').replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        vec3 marketPoint=vItalyMarketBounceWorld;
        vec3 marketLo=smoothstep(vec3(9.1568,-4.264,5.4992),vec3(10.7568,-3.864,7.0992),marketPoint);
        vec3 marketHi=1.-smoothstep(vec3(17.2848,-.9016,12.408),vec3(18.8848,.0984,14.008),marketPoint);
        float marketWeight=marketLo.x*marketLo.y*marketLo.z*marketHi.x*marketHi.y*marketHi.z;
        vec3 marketNormal=inverseTransformDirection(normal,viewMatrix);
        float marketGroundLobe=.72-.40*marketNormal.y;
        reflectedLight.indirectDiffuse+=diffuseColor.rgb*(1.-metalnessFactor)*vec3(.120,.104,.080)*marketWeight*marketGroundLobe;
      `);
    };
    material.customProgramCacheKey=()=>previousKey+'|italy-market-ground-bounce-v2';material.needsUpdate=true;stats.materials++;
  }
  return stats;
}

function italyLighting(i,map,root,practicalLights=[]){
  const T=i.THREE,group=new T.Group();group.name='italy-lantern-lighting';root.add(group);
  const steel=i.mats.get('steel_dark',{interior:true}),glow=new T.MeshStandardMaterial({color:0xeee1bd,emissive:0xffd791,emissiveIntensity:1.3,roughness:.6});
  const sources=[],fixtureParts=[],seen=new Set(),modelBounds=new Map();
  for(const s of map.surfaces){if(s.texture!=='sideLight')continue;for(let k=0;k<s.positions.length;k+=3){const p=s.positions.slice(k,k+3),key=s.modelId===0?Math.round(p[0]*2)+','+Math.round(p[1]*2)+','+Math.round(p[2]*2):String(s.modelId);let box=modelBounds.get(key);if(!box){box={min:[...p],max:[...p]};modelBounds.set(key,box);}for(let a=0;a<3;a++){box.min[a]=Math.min(box.min[a],p[a]);box.max[a]=Math.max(box.max[a],p[a]);}}}
  for(const box of modelBounds.values()){
    const p=box.min.map((v,k)=>(v+box.max[k])*.5),h=box.max[1]-box.min[1];if(h<.15||h>.7)continue;const key=p.map(x=>Math.round(x*2)).join(',');if(seen.has(key))continue;seen.add(key);sources.push({pos:p,id:key,power:4.2});
    const stem=new T.Mesh(new T.CylinderGeometry(.036,.036,.32,6),glow);stem.position.set(...p);fixtureParts.push(stem);
    for(const sign of[-1,1]){const cap=new T.Mesh(new T.CylinderGeometry(sign>0?.035:.10,sign>0?.10:.035,.10,8),steel);cap.position.set(p[0],p[1]+sign*.21,p[2]);fixtureParts.push(cap);}
    for(const [x,z]of[[-1,-1],[-1,1],[1,-1],[1,1]]){const bar=new T.Mesh(new T.CylinderGeometry(.009,.009,.36,5),steel);bar.position.set(p[0]+x*.071,p[1],p[2]+z*.071);fixtureParts.push(bar);}
  }
  for(const e of map.entities.filter(e=>e.classname==='env_glow'))if(!sources.some(s=>Math.hypot(...s.pos.map((v,k)=>v-e.pos[k]))<.7))sources.push({pos:e.pos,id:'glow-'+e.id,power:4.6});
  // Uplink status lamps illuminate nearby surfaces as well as their emissive
  // housings. Reuse the constant light pool, with short falloff in small rooms.
  for(const light of practicalLights)sources.push({...light,power:3.4,distance:4.2,practical:true});
  const batches=new Map();
  for(const part of fixtureParts){const key=part.geometry.parameters.height+':'+part.geometry.parameters.radiusTop+':'+part.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(part);}
  for(const batch of batches.values()){const mesh=new T.InstancedMesh(batch[0].geometry,batch[0].material,batch.length);batch.forEach((part,n)=>{part.updateMatrix();mesh.setMatrixAt(n,part.matrix);});mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);}
  // The pool size is constant: selecting nearby fixtures moves existing lights
  // and does not repeatedly change Three.js shader variants while traversing.
  const lamps=Array.from({length:8},(_,n)=>{const lamp=new T.PointLight(0xffd5a0,0,8,2);lamp.name='italy-nearby-lantern-'+n;group.add(lamp);return lamp;});let elapsed=1;
  const stats={sourceFixtures:sources.filter(s=>!s.practical).length,practicalFixtures:practicalLights.length,activeLightBudget:lamps.length,fixtureBatches:batches.size,weather:'dry',sky:window.__ITALY_HDRI_STATE?'CC0 photographic afternoon':'Mediterranean afternoon',hdri:window.__ITALY_HDRI_STATE?.stats||null,sunDirection:Mn.dir.toArray(),sunIntensity:Mn.intensity,shadow:{centerBlocker:true,filterTaps:i.quality.name==='low'?12:24,searchTaps:12,sunHalfAngle:.00465},marketBounce:italyMarketBounce(root)};
  function update(dt=1){elapsed+=dt;if(elapsed<.25)return;elapsed=0;const camera=i.camera.position,nearest=sources.map(s=>({s,d:(s.pos[0]-camera.x)**2+(s.pos[1]-camera.y)**2+(s.pos[2]-camera.z)**2})).filter(x=>x.d<22*22).sort((a,b)=>a.d-b.d).slice(0,lamps.length);lamps.forEach((lamp,k)=>{const source=nearest[k]?.s;lamp.intensity=source?source.power:0;if(source){lamp.distance=source.distance||8;lamp.position.set(...source.pos);lamp.updateMatrixWorld(true);}});}
  // Scene callbacks run for paused inspection too. Selecting fixtures only in
  // level.update left a staged camera lit by lamps from its previous location.
  const previousBeforeRender=i.scene.onBeforeRender;
  i.scene.onBeforeRender=function(renderer,scene,camera,...rest){previousBeforeRender?.call(this,renderer,scene,camera,...rest);if(camera===i.camera)update(.26);};
  update();i.render.post.wet=0;i.mats.uniforms.wet.value=0;
  Object.assign(i.render.tune,{volSigma:.0009,volInteriorDust:1.0,volFarHaze:.17,grain:.0035,ca:.00012,bloom:.035,vignette:.13,lookSat:1.01,lookPower:1.015,aoRadius:.24,aoIntensity:.65,aoStrength:.53});
  return{lamps,stats,update};
}

function italyGround(i){return{stub:false,kind:'dry-bsp',wetnessAt:()=>0,isPuddle:()=>false,surfaceAt:(x,z)=>i.level?.groundSurfaceAt(x,z)||'concrete',update(){i.render.post.wet=0;i.mats.uniforms.wet.value=0;}};}

function italyBackdrop(i){
  const T=i.THREE,map=window.__ITALY_MAP,root=new T.Group();root.name='italy-distance';i.scene.add(root);
  const margin=12,batches=new Map(),stats={setting:'Italian hillside village',buildings:0,cypresses:0,terrainLayers:0,tris:0,drawCalls:0,collisionChanges:0,clearanceMargin:margin,sourceXZ:{min:[map.bounds.min[0],map.bounds.min[2]],max:[map.bounds.max[0],map.bounds.max[2]]},bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},extentRule:'Every backdrop vertex lies outside the source XZ bounding rectangle expanded by 12 metres.'};
  const plaster=i.italyMaterials.get('italy_plaster_cream',{vertexColors:true}),roof=i.italyMaterials.get('italy_roof',{vertexColors:true}),stone=i.italyMaterials.get('italy_stone',{vertexColors:true});
  const recess=new T.MeshStandardMaterial({color:0x333c32,roughness:.96,vertexColors:true}),foliage=new T.MeshStandardMaterial({color:0x45523a,roughness:.95,vertexColors:true}),hill=new T.MeshStandardMaterial({color:0x8b9275,roughness:1,vertexColors:true});
  hill.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vItalyHillWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvItalyHillWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 vItalyHillWorld;
    float ihHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float ihNoise(vec2 p){vec2 q=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(ihHash(q),ihHash(q+vec2(1,0)),f.x),mix(ihHash(q+vec2(0,1)),ihHash(q+vec2(1,1)),f.x),f.y);}
  `).replace('#include <map_fragment>',`#include <map_fragment>
    float grove=ihNoise(vItalyHillWorld.xz*.025),rock=ihNoise(vItalyHillWorld.xz*.11);
    diffuseColor.rgb*=mix(vec3(.76,.85,.67),vec3(1.08,1.04,.92),smoothstep(.25,.74,grove));
    diffuseColor.rgb*=.94+.10*rock;
  `);};hill.customProgramCacheKey=()=> 'italy-smooth-hills-v1';
  const hash=(a,c=0)=>{let n=Math.imul(a+199,1021+c*17);n=Math.imul(n^(n>>>15),2246822519);return((n^(n>>>13))>>>0)/4294967295;};
  const noise=(x,y,s)=>{const a=Math.floor(x),b=Math.floor(y),f=x-a,g=y-b,u=f*f*(3-2*f),v=g*g*(3-2*g),h=(a,b)=>hash(a+b*197,s);return(h(a,b)*(1-u)+h(a+1,b)*u)*(1-v)+(h(a,b+1)*(1-u)+h(a+1,b+1)*u)*v;};
  function record(p){const mn=map.bounds.min,mx=map.bounds.max;if(p[0]>=mn[0]-margin&&p[0]<=mx[0]+margin&&p[2]>=mn[2]-margin&&p[2]<=mx[2]+margin)throw new Error('Italy backdrop entered source playfield');for(let k=0;k<3;k++){stats.bounds.min[k]=Math.min(stats.bounds.min[k],p[k]);stats.bounds.max[k]=Math.max(stats.bounds.max[k],p[k]);}}
  function triangle(mat,a,c,d,tint=0xffffff,vertexNormals){const n=new T.Vector3().subVectors(new T.Vector3(...c),new T.Vector3(...a)).cross(new T.Vector3().subVectors(new T.Vector3(...d),new T.Vector3(...a))).normalize(),color=new T.Color(tint),mid=a.map((v,k)=>(v+c[k]+d[k])/3),key=mat.uuid+':'+Math.floor(mid[0]/160)+','+Math.floor(mid[2]/160);let batch=batches.get(key);if(!batch){batch={mat,p:[],n:[],uv:[],c:[]};batches.set(key,batch);}const axis=Math.abs(n.y)>.55?1:Math.abs(n.x)>.55?0:2;
    for(const [index,p]of[a,c,d].entries()){record(p);batch.p.push(...p);batch.n.push(...(vertexNormals?vertexNormals[index]:n.toArray()));batch.uv.push(axis===0?p[2]:p[0],axis===1?p[2]:p[1]);batch.c.push(color.r,color.g,color.b);}stats.tris++;
  }
  function quad(mat,a,c,d,e,tint,vertexNormals){triangle(mat,a,c,d,tint,vertexNormals?.slice(0,3));triangle(mat,a,d,e,tint,vertexNormals?[vertexNormals[0],vertexNormals[2],vertexNormals[3]]:null);}
  function box(mat,w,h,d,x,y,z,tint){const p=[[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,h/2,-d/2],[-w/2,h/2,-d/2],[-w/2,-h/2,d/2],[w/2,-h/2,d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]].map(p=>[p[0]+x,p[1]+y,p[2]+z]);for(const f of[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])quad(mat,...f.map(k=>p[k]),tint);}
  function house(x,z,base,w,d,h,index){const tint=[0xdecbb2,0xcbb695,0xebe1cc,0xc5c3ad,0xe3c3a4][index%5],eave=base+h,pitch=Math.min(w*.24,2.4);box(plaster,w,h,d,x,base+h/2,z,tint);box(stone,w+.20,.18,d+.24,x,eave,z,0xd7cbb6);
    triangle(plaster,[x+w/2,eave,z-d/2],[x-w/2,eave,z-d/2],[x,eave+pitch,z-d/2],tint);triangle(plaster,[x-w/2,eave,z+d/2],[x+w/2,eave,z+d/2],[x,eave+pitch,z+d/2],tint);
    quad(roof,[x-w/2-.18,eave+.05,z+d/2+.2],[x,eave+pitch+.06,z+d/2+.2],[x,eave+pitch+.06,z-d/2-.2],[x-w/2-.18,eave+.05,z-d/2-.2],0xe6d8c4);quad(roof,[x,eave+pitch+.06,z+d/2+.2],[x+w/2+.18,eave+.05,z+d/2+.2],[x+w/2+.18,eave+.05,z-d/2-.2],[x,eave+pitch+.06,z-d/2-.2],0xd7c5b2);
    box(stone,.55,.13,.65,x+w*.28,eave+pitch*.60+1.2,z+d*.21,0xd7c8ad);box(plaster,.42,1.2,.52,x+w*.28,eave+pitch*.60+.55,z+d*.21,tint);
    const rows=Math.max(1,Math.floor(h/3)),cols=Math.max(2,Math.floor(w/2.8));for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)for(const sign of[-1,1]){const wx=x+((col+.5)/cols-.5)*w,wy=base+1.65+row*2.8,wz=z+sign*(d/2+.015);box(recess,.65,1.13,.035,wx,wy,wz,0xe6ddc7);box(stone,.85,.10,.13,wx,wy-.61,wz+sign*.03,0xdcd5bf);for(const side of[-1,1])box(recess,.23,1.15,.07,wx+side*.45,wy,wz+sign*.035,0xa9b29c);}stats.buildings++;
  }
  const houses=[[-64,32,-6,10,10,8],[-70,17,-5,11,9,10],[-65,-2,-5,9,11,7],[-72,-22,-4,12,10,10],[-66,-43,-5,10,10,8],[-79,-64,-3,11,11,9],[-65,-87,-5,10,12,9],[-36,-94,-4,10,10,8],[-19,-91,-3,11,12,10],[1,-98,-1,12,11,9],[23,-91,-2,10,9,8],[46,-94,-1,11,12,11],[54,-59,-4,10,11,8],[57,-36,-3,12,10,10],[52,-14,-5,9,11,8],[57,9,-4,11,12,10],[54,33,-4,9,9,8],[55,56,-2,12,12,10],[42,88,-4,11,10,7],[18,93,-3,12,9,9],[-3,88,-5,9,11,8],[-23,95,-3,12,10,10],[-47,91,-4,11,12,9],[-71,91,-2,10,10,10]];
  houses.forEach((h,n)=>house(...h,n));
  function cypress(x,z,base,height,seed){const segments=9,rings=9,verts=[];for(let r=0;r<=rings;r++){const t=r/rings,y=base+t*height,rad=Math.sin(Math.PI*Math.pow(t,.68))*(.58+height*.035);for(let j=0;j<segments;j++){const a=j*Math.PI*2/segments,rough=.82+hash(seed,r*segments+j)*.28;verts.push([x+Math.cos(a)*rad*rough,y,z+Math.sin(a)*rad*rough]);}}for(let r=0;r<rings;r++)for(let j=0;j<segments;j++){const a=r*segments+j,c=r*segments+(j+1)%segments,d=(r+1)*segments+(j+1)%segments,e=(r+1)*segments+j;quad(foliage,verts[a],verts[c],verts[d],verts[e],r%3?0xbdc5ac:0xd3cdb4);}stats.cypresses++;}
  for(let k=0;k<34;k++){const side=k%4,span=(k/4|0)*22,x=side===0?-94:side===1?78:-81+span,z=side===2?-120:side===3?117:-85+span;cypress(x,z,-5,5+hash(k,3)*4,k);}
  function hills(angle,distance,width,depth,height,seed){const nx=72,nz=24,points=[],center=[-6,0],r=[Math.cos(angle),Math.sin(angle)],t=[-r[1],r[0]];for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){const u=x/nx*2-1,v=z/nz*2-1,a=u*width/2,b=v*depth/2,edge=Math.pow(Math.max(0,1-u*u),.6)*Math.pow(Math.max(0,1-v*v),.7),smooth=.63+.25*Math.sin(a*.018+seed)+.12*Math.sin(a*.051+1.4),rough=noise(a*.035,b*.03,seed)*.32;points.push([center[0]+r[0]*(distance+b)+t[0]*a,-15+height*(smooth+rough)*edge,center[1]+r[1]*(distance+b)+t[1]*a]);}
    const normals=points.map((p,k)=>{const x=k%(nx+1),z=Math.floor(k/(nx+1)),left=points[z*(nx+1)+Math.max(0,x-1)],right=points[z*(nx+1)+Math.min(nx,x+1)],up=points[Math.max(0,z-1)*(nx+1)+x],down=points[Math.min(nz,z+1)*(nx+1)+x];return new T.Vector3().subVectors(new T.Vector3(...right),new T.Vector3(...left)).cross(new T.Vector3().subVectors(new T.Vector3(...down),new T.Vector3(...up))).normalize().toArray();});for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const k=z*(nx+1)+x;quad(hill,points[k],points[k+1],points[k+nx+2],points[k+nx+1],0xd1d4bc,[normals[k],normals[k+1],normals[k+nx+2],normals[k+nx+1]]);}stats.terrainLayers++;}
  hills(.05,270,380,150,50,17);hills(2.85,310,430,150,62,31);hills(-1.3,340,470,170,70,47);
  for(const batch of batches.values()){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(batch.c,3));geo.computeBoundingSphere();const mesh=new T.Mesh(geo,batch.mat);mesh.name='italy-distance-batch';mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);stats.drawCalls++;}
  stats.bounds.min=stats.bounds.min.map(v=>+v.toFixed(3));stats.bounds.max=stats.bounds.max.map(v=>+v.toFixed(3));
  return{stub:false,root,boat:null,crane:null,ship:null,skyline:root,gulls:null,stats,update(){}};
}
