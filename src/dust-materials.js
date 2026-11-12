/* Dust material library. Deterministic PBR maps plus authored generated
 * plaster albedo embedded by the build. Albedo is sRGB; normals and ORM linear. UVs are metres except
 * the explicitly marked door/window atlases, which preserve native BSP UVs.
 * Road micro-relief is explicitly inferred from generated albedo luminance;
 * it is a shallow rendering approximation, not measured/scanned height. */
async function dustMaterials(i, map) {
  const T=i.THREE, started=performance.now(), sets=new Map(), cache=new Map();
  const SIZE=1024, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t, smooth=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x);};
  const hash=(x,y,s=0)=>{let n=Math.imul(x+143,s+1597)^Math.imul(y+673,3413);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  function noise(x,y,period,seed){
    x*=period;y*=period;const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v),P=k=>(k%period+period)%period;
    return mix(mix(hash(P(a),P(b),seed),hash(P(a+1),P(b),seed),s),mix(hash(P(a),P(b+1),seed),hash(P(a+1),P(b+1),seed),s),t);
  }
  function texture(data,name,srgb,repeat){
    const tex=new T.DataTexture(data,SIZE,SIZE,T.RGBAFormat,T.UnsignedByteType);
    tex.name='dust/'+name;tex.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;
    tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;
    tex.generateMipmaps=true;tex.anisotropy=Math.min(8,i.renderer.capabilities.getMaxAnisotropy());
    // Data rows start at the top of our atlas, like an ordinary image. The
    // source BSP v coordinate is already flipped, so flip upload accordingly.
    tex.flipY=true;tex.repeat.set(...repeat);tex.needsUpdate=true;return tex;
  }
  function bake(name,kind,seed,physical=[3.2,3.2],sourceUV=false){
    const a=new Uint8Array(SIZE*SIZE*4),o=new Uint8Array(a.length),n=new Uint8Array(a.length),h=new Float32Array(SIZE*SIZE);
    const stone=kind==='stone'||kind==='plaster'||kind==='trim'||kind==='door'||kind==='window';
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      // Pixel centres make the last/first texels equally distant from a seam.
      const u=(x+.5)/SIZE,v=(y+.5)/SIZE,k=y*SIZE+x,j=k*4;
      const broad=noise(u,v,4,seed),meso=noise(u,v,32,seed+3),fine=noise(u,v,256,seed+7),grain=hash(x,y,seed+19);
      let r=175,g=154,b=119,ao=1,rough=.9,metal=0,height=0,facadeMask=0;
      if(stone){
        const courses=kind==='trim'?4:8,row=Math.floor(v*courses),fy=(v*courses-row)*physical[1]/courses;
        const blocks=row%3===0?5:6,offset=hash(row,17,seed)*.82,xx=(u*blocks+offset)%1,fx=xx*physical[0]/blocks;
        const edge=Math.min(fy,physical[1]/courses-fy,fx,physical[0]/blocks-fx);
        const block=hash(Math.floor(u*blocks+offset)%blocks,row,seed+1),face=smooth(.003,.021,edge+(meso-.5)*.009);
        const sandstone=kind==='plaster'?[181,163,135]:kind==='trim'?[171,151,119]:[174,160,138];
        const weather=(broad-.5)*15+(meso-.5)*10+(fine-.5)*7+(grain-.5)*3;
        const bleach=(block-.5)*13;
        r=sandstone[0]+weather+bleach;g=sandstone[1]+weather*.95+bleach;b=sandstone[2]+weather*.8+bleach;
        // Mortar is pale mineral sediment, with fine contact occlusion. It is
        // never drawn as a black grid over every face.
        r=mix(155+weather,r,face);g=mix(145+weather,g,face);b=mix(126+weather,b,face);
        ao=mix(.69,1,face);rough=.83+meso*.1;height=face*.008+(meso-.5)*.0025+(fine-.5)*.0008;
        if(kind==='plaster'){
          const lime=smooth(.32,.56,broad*.75+meso*.25)*.76;
          r=mix(r,193+weather*.7,lime);g=mix(g,179+weather*.65,lime);b=mix(b,153+weather*.55,lime);
          // Continuous lime plaster has shallow trowel/grain relief. The
          // underlying block joints must not emboss through its authored skin.
          height=(meso-.5)*.0012+(fine-.5)*.00045;ao=1;rough=.94;
        }
      }else if(kind==='sand'){
        const ripple=Math.sin((u*48+noise(u,v,8,seed)*.35)*Math.PI*2),granule=smooth(.91,.99,grain);
        r=181+(broad-.5)*18+(meso-.5)*10+(fine-.5)*7+granule*6;
        g=r-20;b=r-50;height=(meso-.5)*.003+(fine-.5)*.001+ripple*.00012;rough=.94;ao=.97;
      }else if(kind==='road'){
        const wear=smooth(.35,.7,broad),pebble=smooth(.91,.995,grain)*smooth(.45,.7,fine);
        r=160+wear*20+(meso-.5)*12+(fine-.5)*7+pebble*9;g=r-18;b=r-44;
        height=(meso-.5)*.0012+(fine-.5)*.0005+pebble*.0006;rough=.98;ao=.97;
      }else if(kind==='wood'||kind==='military'){
        const plank=Math.floor(u*10),board=hash(plank,8,seed),seam=smooth(.004,.018,Math.min((u*10)%1,1-(u*10)%1));
        const stripe=noise(u,v,64,seed+4),fibres=Math.sin((u*380+noise(u,v,16,seed)*.8)*Math.PI*2);
        r=126+(board-.5)*18+(meso-.5)*8+fibres*2+(stripe-.5)*7;g=r-23;b=r-46;
        if(kind==='military'){r=104+(meso-.5)*11+(board-.5)*8;g=r+2;b=r-26;}
        r=mix(kind==='military'?55:71,r,seam);g=mix(kind==='military'?55:57,g,seam);b=mix(kind==='military'?37:42,b,seam);
        height=seam*.004+fibres*.0001+(fine-.5)*.00035;rough=.88+meso*.08;ao=mix(.7,1,seam);
      }
      if(kind==='door'||kind==='window'){
        // Authored arched joinery atlas: physical framing is supplied by
        // dustDress; this contains the stone surround, timber and recess.
        const window=kind==='window',left=window?.19:.025,right=window?.81:.975;
        const top=window?.065:.025,spring=window?.20:.34,bottom=window?.50:1;
        const cx=.5,radius=(right-left)/2,dx=(u-cx)/radius;
        const archY=spring-Math.sqrt(Math.max(0,1-dx*dx))*(spring-top);
        const inOpening=u>left&&u<right&&v>archY&&v<bottom;
        facadeMask=inOpening?0:1;
        if(!inOpening){height=(meso-.5)*.0012+(fine-.5)*.00045;ao=1;rough=.94;}
        if(inOpening){
          const plank=Math.floor((u-left)/(right-left)*12),board=hash(plank,22,seed),q=(u-left)/(right-left)*12;
          const seam=smooth(.012,.07,Math.min(q%1,1-q%1));
          const fibre=Math.sin((u*540+noise(u,v,16,seed)*.9)*Math.PI*2),grainLong=noise(u,v*.18,128,seed+12);
          const oldBlue=window&&seed%2===0;
          r=(oldBlue?94:105)+(board-.5)*22+(grainLong-.5)*12+fibre*2;g=r+(oldBlue?5:-19);b=r+(oldBlue?2:-35);
          r*=mix(.58,1,seam);g*=mix(.58,1,seam);b*=mix(.58,1,seam);height=-.015+seam*.003;ao=.84+.13*seam;rough=.9;
          const edge=Math.min(u-left,right-u,v-archY,bottom-v);
          const contact=smooth(.002,.024,edge);r*=mix(.48,1,contact);g*=mix(.48,1,contact);b*=mix(.48,1,contact);ao*=mix(.5,1,contact);
          const hinge=!window&&(Math.abs(v-.36)<.012||Math.abs(v-.80)<.012)&&Math.abs(u-.5)>.06;
          if(hinge){r=49+meso*8;g=r-2;b=r-5;metal=.55;rough=.69;height=.005;}
        }
      }
      a[j]=clamp(r,0,255);a[j+1]=clamp(g,0,255);a[j+2]=clamp(b,0,255);a[j+3]=255;
      o[j]=ao*255;o[j+1]=rough*255;o[j+2]=metal*255;o[j+3]=facadeMask*255;h[k]=height;
    }
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const k=y*SIZE+x,j=k*4;
      const dx=(h[y*SIZE+(x+1)%SIZE]-h[y*SIZE+(x+SIZE-1)%SIZE])*SIZE/(2*physical[0]);
      const dy=(h[((y+1)%SIZE)*SIZE+x]-h[((y+SIZE-1)%SIZE)*SIZE+x])*SIZE/(2*physical[1]);
      const len=Math.hypot(dx,dy,1);n[j]=(-dx/len*.5+.5)*255;n[j+1]=(dy/len*.5+.5)*255;n[j+2]=(1/len*.5+.5)*255;n[j+3]=255;
    }
    const repeat=sourceUV?[1,1]:[1/physical[0],1/physical[1]];
    const result={albedo:texture(a,name+'/albedo',true,repeat),normal:texture(n,name+'/normal',false,repeat),orm:texture(o,name+'/orm',false,repeat),sourceUV,physical};
    sets.set(name,result);return result;
  }
  const recipes=[['dust_plaster','plaster',13,[3.2,3.2]],['dust_stone','stone',31,[3.2,3.2]],['dust_trim','trim',47,[3.2,1.6]],['dust_sand','sand',71,[3.2,3.2]],['dust_road','road',103,[3.2,3.2]],['dust_crate','wood',131,[2,2]],['dust_military','military',173,[2,2]],['dust_door','door',211,[4.8768,4.064],true],['dust_window','window',242,[3.2512,6.096],true]];
  for(const recipe of recipes){bake(...recipe);await new Promise(resolve=>setTimeout(resolve,0));}
  // Bake physical contact fields from the source layout. The red channel is
  // distance to a source edge, green its interpolated height. Height gating
  // prevents the bridge's dirt from appearing on the underpass beneath it.
  const fieldBounds=new T.Vector4(map.bounds.min[0],map.bounds.min[2],map.bounds.max[0]-map.bounds.min[0],map.bounds.max[2]-map.bounds.min[2]);
  const fieldHeight=new T.Vector2(map.bounds.min[1],map.bounds.max[1]-map.bounds.min[1]);
  const surfaceLookup=new Map(map.surfaces.map(s=>[s.modelId+':'+s.texture,s]));
  const sourceFloors=[],floorEdges={dust_sand:new Map(),dust_road:new Map()};
  for(const s of map.surfaces)for(let k=0;k<s.positions.length;k+=9){
    if(s.normals[k+1]<.7)continue;
    const p=[0,3,6].map(d=>s.positions.slice(k+d,k+d+3));sourceFloors.push(p);
    if(!floorEdges[s.material])continue;
    for(let j=0;j<3;j++){
      const a=p[j],c=p[(j+1)%3],id=[a.join(','),c.join(',')].sort().join('|'),old=floorEdges[s.material].get(id);
      if(old)old.count++;else floorEdges[s.material].set(id,{a,c,count:1});
    }
  }
  const junctions=[],contactLines=[];
  const sandEdges=[...floorEdges.dust_sand.values()].filter(e=>e.count===1);
  for(const road of floorEdges.dust_road.values()){
    if(road.count!==1)continue;
    const a=road.a,d=road.c.map((v,j)=>v-a[j]),length=Math.hypot(...d);if(length<.1)continue;
    const u=d.map(v=>v/length);
    for(const sand of sandEdges){
      const project=p=>p.reduce((s,v,j)=>s+(v-a[j])*u[j],0),t0=project(sand.a),t1=project(sand.c);
      if(Math.hypot(...sand.a.map((v,j)=>v-a[j]-t0*u[j]))>.004||Math.hypot(...sand.c.map((v,j)=>v-a[j]-t1*u[j]))>.004)continue;
      const lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(length,Math.max(t0,t1));
      if(hi-lo>.1)junctions.push([a.map((v,j)=>v+lo*u[j]),a.map((v,j)=>v+hi*u[j])]);
    }
  }
  function sourceFloor(x,z,ceiling){
    let best=-Infinity;
    for(const [a,c,d]of sourceFloors){
      if(x<Math.min(a[0],c[0],d[0])-.001||x>Math.max(a[0],c[0],d[0])+.001||z<Math.min(a[2],c[2],d[2])-.001||z>Math.max(a[2],c[2],d[2])+.001)continue;
      const den=(c[2]-d[2])*(a[0]-d[0])+(d[0]-c[0])*(a[2]-d[2]);if(Math.abs(den)<1e-8)continue;
      const q=((c[2]-d[2])*(x-d[0])+(d[0]-c[0])*(z-d[2]))/den,r=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/den;
      if(q<-.001||r<-.001||q+r>1.001)continue;const y=a[1]*q+c[1]*r+d[1]*(1-q-r);if(y<=ceiling&&y>best)best=y;
    }return best;
  }
  for(const f of map.faces){
    if(f.material!=='dust_plaster'||Math.abs(f.normal[1])>.01||f.area<1)continue;
    const onX=Math.abs(f.normal[0])>.99,onZ=Math.abs(f.normal[2])>.99;if(!onX&&!onZ)continue;
    const y=f.bounds.min[1],x=f.center[0]+f.normal[0]*.16,z=f.center[2]+f.normal[2]*.16,floor=sourceFloor(x,z,y+.12);
    if(!Number.isFinite(floor)||Math.abs(floor-y)>.18)continue;
    const a=[onX?f.center[0]:f.bounds.min[0],floor,onX?f.bounds.min[2]:f.center[2]],c=[onX?f.center[0]:f.bounds.max[0],floor,onX?f.bounds.max[2]:f.center[2]];
    contactLines.push([a,c]);
  }
  function contactField(name,lines){
    const data=new Uint8Array(SIZE*SIZE*4);for(let k=0;k<data.length;k+=4){data[k]=255;data[k+3]=255;}
    const range=.9,sx=SIZE/fieldBounds.z,sz=SIZE/fieldBounds.w;
    for(const [a,c]of lines){
      const dx=c[0]-a[0],dz=c[2]-a[2],den=dx*dx+dz*dz;if(den<.01)continue;
      const x0=Math.max(0,Math.floor((Math.min(a[0],c[0])-range-fieldBounds.x)*sx)),x1=Math.min(SIZE-1,Math.ceil((Math.max(a[0],c[0])+range-fieldBounds.x)*sx));
      const z0=Math.max(0,Math.floor((Math.min(a[2],c[2])-range-fieldBounds.y)*sz)),z1=Math.min(SIZE-1,Math.ceil((Math.max(a[2],c[2])+range-fieldBounds.y)*sz));
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
        const wx=fieldBounds.x+(x+.5)/sx,wz=fieldBounds.y+(z+.5)/sz,t=clamp(((wx-a[0])*dx+(wz-a[2])*dz)/den),distance=Math.hypot(wx-a[0]-t*dx,wz-a[2]-t*dz),k=(z*SIZE+x)*4;
        if(distance/range*255>=data[k])continue;
        data[k]=distance/range*255;data[k+1]=clamp((mix(a[1],c[1],t)-fieldHeight.x)/fieldHeight.y)*255;
      }
    }
    const tex=new T.DataTexture(data,SIZE,SIZE,T.RGBAFormat,T.UnsignedByteType);tex.name=name;tex.minFilter=tex.magFilter=T.LinearFilter;tex.generateMipmaps=false;tex.needsUpdate=true;return tex;
  }
  const junctionField=contactField('dust/source-sand-road-junctions',junctions),wallField=contactField('dust/source-wall-feet',contactLines);
  let authoredPlaster=false,authoredRoad=false,authoredSize=null,roadSize=null;
  if(typeof window!=='undefined'){
    for(const key of ['plaster','road'])if(!window.__DUST_TEXTURES?.[key])throw new Error('Required generated Dust '+key+' albedo is missing from the build');
    const [plaster,road]=await Promise.all(['plaster','road'].map(async key=>{
      const albedo=await new T.TextureLoader().loadAsync(window.__DUST_TEXTURES[key]);
      albedo.name='dust/generated-'+key+'/albedo';albedo.colorSpace=T.SRGBColorSpace;
      albedo.wrapS=albedo.wrapT=T.RepeatWrapping;albedo.repeat.set(1/3.2,1/3.2);
      albedo.magFilter=T.LinearFilter;albedo.minFilter=T.LinearMipmapLinearFilter;albedo.generateMipmaps=true;
      albedo.anisotropy=Math.min(8,i.renderer.capabilities.getMaxAnisotropy());albedo.needsUpdate=true;
      sets.get('dust_'+key).albedo.dispose();sets.get('dust_'+key).albedo=albedo;return albedo;
    }));
    authoredSize=[plaster.image.width,plaster.image.height];authoredPlaster=true;
    roadSize=[road.image.width,road.image.height];authoredRoad=true;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(road.image,0,0,SIZE,SIZE);
    const pixels=ctx.getImageData(0,0,SIZE,SIZE).data,height=new Float32Array(SIZE*SIZE),normal=new Uint8Array(SIZE*SIZE*4);
    // Albedo is not a physical height measurement. A bounded 3 mm inferred
    // micro-height supplies only small pebble/paver surface response; the BSP
    // remains the complete geometry/collision/navigation authority.
    for(let k=0;k<height.length;k++)height[k]=(pixels[k*4]*.2126+pixels[k*4+1]*.7152+pixels[k*4+2]*.0722)/255*.003;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const k=y*SIZE+x,j=k*4,fade=smooth(0,4,Math.min(x,y,SIZE-1-x,SIZE-1-y));
      const dx=(height[y*SIZE+Math.min(SIZE-1,x+1)]-height[y*SIZE+Math.max(0,x-1)])*SIZE/(2*3.2)*fade;
      const dy=(height[Math.min(SIZE-1,y+1)*SIZE+x]-height[Math.max(0,y-1)*SIZE+x])*SIZE/(2*3.2)*fade,len=Math.hypot(dx,dy,1);
      normal[j]=(-dx/len*.5+.5)*255;normal[j+1]=(dy/len*.5+.5)*255;normal[j+2]=(1/len*.5+.5)*255;normal[j+3]=255;
    }
    sets.get('dust_road').normal.dispose();sets.get('dust_road').normal=texture(normal,'generated-road/inferred-normal',false,[1/3.2,1/3.2]);
    canvas.width=canvas.height=1;
  }
  function get(name,options={}){
    if(name==='dust_lamp'){
      if(!cache.has('dust_source_lamp'))cache.set('dust_source_lamp',new T.MeshStandardMaterial({name:'dust_source_lamp',color:0xddd5c4,emissive:0xffddb0,emissiveIntensity:.8,roughness:.4}));
      return cache.get('dust_source_lamp');
    }
    if(/SandWllWndw/i.test(options.texture||''))name='dust_window';
    if(/SandWllDoor/i.test(options.texture||''))name='dust_door';
    if(!sets.has(name))return typeof assaultMaterial==='function'?assaultMaterial(i,name,!!options.inside,false,options):i.mats.get(name,{interior:!!options.inside,vertexColors:options.vertexColors!==false});
    const key=name+':'+!!options.inside+':'+(options.vertexColors!==false);
    if(cache.has(key))return cache.get(key);
    const set=sets.get(name),mat=new T.MeshStandardMaterial({name,map:set.albedo,normalMap:set.normal,roughnessMap:set.orm,metalnessMap:set.orm,roughness:1,metalness:name==='dust_door'?1:0,vertexColors:options.vertexColors!==false,side:T.FrontSide});
    const ground=name==='dust_road'||name==='dust_sand';
    mat.normalScale.set(ground?.5:.85,ground?.5:.85);mat.envMapIntensity=ground?.25:options.inside?.28:.55;
    if(name==='dust_plaster'&&authoredPlaster)mat.color.setRGB(.72,.72,.72);
    if(name==='dust_road'&&authoredRoad)mat.color.setRGB(.86,.86,.86);
    mat.userData={dustSourceUV:set.sourceUV,dustMaterial:true,interior:!!options.inside,physicalTile:set.physical};
    mat.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vDustWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvDustWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vDustWorld;
        float dustHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
        float dustNoise(vec3 p){vec3 q=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(dustHash(q),dustHash(q+vec3(1,0,0)),f.x),mix(dustHash(q+vec3(0,1,0)),dustHash(q+vec3(1,1,0)),f.x),f.y),mix(mix(dustHash(q+vec3(0,0,1)),dustHash(q+vec3(1,0,1)),f.x),mix(dustHash(q+vec3(0,1,1)),dustHash(q+vec3(1,1,1)),f.x),f.y),f.z);}
      `).replace('#include <map_fragment>',`#include <map_fragment>
        float dustAge=dustNoise(vDustWorld*vec3(.21,.15,.21));
        float dustRun=dustNoise(vDustWorld*vec3(1.7,.12,1.7)+vec3(8.4,2.1,4.9));
        diffuseColor.rgb*=mix(.90,1.065,dustAge);
        diffuseColor.rgb*=1.-smoothstep(.56,.83,dustRun)*smoothstep(.40,.68,dustAge)*.09;
      `);
      if(ground||name==='dust_plaster'||name==='dust_window'||name==='dust_door'){
        Object.assign(shader.uniforms,{uDustContactField:{value:ground?junctionField:wallField},uDustFieldBounds:{value:fieldBounds},uDustFieldHeight:{value:fieldHeight},uDustSandMap:{value:sets.get('dust_sand').albedo}});
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          uniform sampler2D uDustContactField,uDustSandMap;
          uniform vec4 uDustFieldBounds;uniform vec2 uDustFieldHeight;
        `).replace('float dustAge=dustNoise(vDustWorld*vec3(.21,.15,.21));',`
          vec2 dustFieldUv=(vDustWorld.xz-uDustFieldBounds.xy)/uDustFieldBounds.zw;
          vec2 dustContact=texture2D(uDustContactField,dustFieldUv).rg;
          float dustBase=uDustFieldHeight.x+dustContact.g*uDustFieldHeight.y;
          float dustDistance=dustContact.r*.9;
          float dustEdgeNoise=dustNoise(vDustWorld*vec3(7.,.7,7.));
          ${name==='dust_road'?`
            float dustApron=(1.-smoothstep(.035,.40+(.18*dustEdgeNoise),dustDistance))*(1.-smoothstep(.14,.32,abs(vDustWorld.y-dustBase)));
            diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(uDustSandMap,vDustWorld.xz/3.2).rgb,dustApron*.94);
          `:!ground?`
            float dustFoot=(1.-smoothstep(.16,.55,dustDistance))*(1.-smoothstep(.06,.65+.18*dustEdgeNoise,max(vDustWorld.y-dustBase,0.)))*step(dustBase-.12,vDustWorld.y);
            diffuseColor.rgb*=1.-dustFoot*(.05+.085*dustEdgeNoise);
            diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.02,.96,.86),dustFoot*.32);
          `:''}
          float dustAge=dustNoise(vDustWorld*vec3(.21,.15,.21));
        `);
      }
      if(authoredPlaster&&(name==='dust_window'||name==='dust_door')){
        shader.uniforms.uDustFacadePlaster={value:sets.get('dust_plaster').albedo};
        const scale=name==='dust_window'?'vec2(1.016,1.905)':'vec2(1.524,1.27)';
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uDustFacadePlaster;').replace('#include <map_fragment>',`#include <map_fragment>
          float dustFacadeMask=texture2D(roughnessMap,vRoughnessMapUv).a;
          diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(uDustFacadePlaster,vMapUv*${scale}).rgb*.72,dustFacadeMask);
        `);
      }
      if(options.inside){
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 dustIrradiance;\nvarying vec3 vDustIrradiance;').replace('#include <begin_vertex>','#include <begin_vertex>\nvDustIrradiance=dustIrradiance;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vDustIrradiance;').replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse+=diffuseColor.rgb*vDustIrradiance;');
      }
    };
    mat.customProgramCacheKey=()=> 'dust-masonry-v2:'+name+':'+!!options.inside;
    cache.set(key,mat);return mat;
  }
  const stats={version:4,sets:sets.size,size:SIZE,channels:['sRGB albedo','linear normal','linear ORM'],generated:true,seeded:true,sourceImagesUsed:false,authoredPlaster,authoredSize,authoredRoad,roadSize,sourceJunctionSegments:junctions.length,supportedWallContacts:contactLines.length,roadRelief:authoredRoad?'inferred albedo micro-height, bounded 3 mm, no geometry changes':'procedural',retainedTextureBytes:sets.size*SIZE*SIZE*4*3*4/3+SIZE*SIZE*8+[authoredSize,roadSize].reduce((sum,size)=>sum+(size?(size[0]*size[1]-SIZE*SIZE)*4*4/3:0),0),bakeMs:Math.round(performance.now()-started)};
  const api={get,stats,textures:sets};i.dustMaterials=api;return api;
}
