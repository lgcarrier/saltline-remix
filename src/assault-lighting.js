/* Local warehouse lighting. Direct fixtures are backed by a static, visibility-
 * tested diffuse irradiance volume. This is a diffuse GI approximation, not
 * path tracing: dynamic doors/actors do not rebake the field during gameplay.
 */
function assaultLighting(i,map,root){
  const T=i.THREE, V=a=>new T.Vector3(...a), lamps=[],fixtures=[],patches=[],fixtureParts=[],shadowLights=[];
  const group=new T.Group();group.name='assault-lighting';root.add(group);
  const started=performance.now();
  const stats={directLights:0,bakedDirectLights:0,fixtures:0,fixtureDrawCalls:0,bouncePatches:0,probes:0,visibilityRays:0,clippedProbes:0,patchedMaterials:0,bakeMs:0,method:'static occluded diffuse and one-bounce volumes'};
  const lit=new T.MeshStandardMaterial({color:0xe4e0cf,emissive:0xfff0d8,emissiveIntensity:.8,roughness:.52,metalness:.05});
  const coolLit=new T.MeshStandardMaterial({color:0xe1e4dc,emissive:0xe5edf0,emissiveIntensity:.72,roughness:.52,metalness:.05});
  const housing=new T.MeshStandardMaterial({color:0x414847,roughness:.54,metalness:.65});
  const rim=new T.MeshStandardMaterial({color:0x858d88,roughness:.4,metalness:.75});
  const tubeGeometry=new T.CylinderGeometry(.025,.025,1.32,10,1);
  const capGeometry=new T.CylinderGeometry(.034,.034,.07,10,1);
  const boxGeometry=new T.BoxGeometry(1,1,1);
  function box(size,pos,mat){const mesh=new T.Mesh(boxGeometry,mat);mesh.scale.set(...size);mesh.position.set(...pos);fixtureParts.push(mesh);return mesh;}
  function fixture(pos,color,w=1.1,d=.68,axis='x'){
    // Recessed paired tubes, end caps and a metal lip give the emission a source.
    box([w,.055,d],[pos[0],pos[1]+.015,pos[2]],housing);
    for(const side of [-1,1]){
      const tube=new T.Mesh(tubeGeometry,color===0?lit:coolLit);
      const alongX=axis==='x';tube.rotation[alongX?'z':'x']=Math.PI/2;
      tube.scale.y=(alongX?w:d)*.82/1.32;
      tube.position.set(pos[0]+(alongX?0:side*w*.22),pos[1]-.03,pos[2]+(alongX?side*d*.22:0));
      fixtureParts.push(tube);
      for(const end of [-1,1]){
        const cap=new T.Mesh(capGeometry,rim);cap.rotation.copy(tube.rotation);
        cap.position.copy(tube.position);cap.position[alongX?'x':'z']+=end*(alongX?w:d)*.415;fixtureParts.push(cap);
      }
    }
    fixtures.push(pos);stats.fixtures++;
  }
  function point(pos,color,intensity,distance){const light=new T.PointLight(color,intensity,distance,2);light.name='assault-local-fixture';light.position.copy(V(pos));group.add(light);lamps.push(light);return light;}
  function spot(pos,target,color,intensity,distance,angle){const light=new T.SpotLight(color,intensity,distance,angle,.64,2);light.name='assault-high-bay';light.position.copy(V(pos));light.target.position.copy(V(target));group.add(light,light.target);lamps.push(light);return light;}
  function contactShadow(light,size){
    light.castShadow=true;light.shadow.mapSize.set(size,size);
    light.shadow.camera.near=.12;light.shadow.camera.far=light.distance;
    light.shadow.bias=-.00005;light.shadow.normalBias=.012;
    // Negative radius selects our perspective-safe local kernel below. Saltline's
    // positive-radius sun continues to use its original orthographic PCSS.
    light.shadow.radius=-1;light.shadow.intensity=.9;
    light.shadow.autoUpdate=false;light.shadow.needsUpdate=false;
    shadowLights.push(light);return light;
  }
  // Partitioned BSP faces are grouped back into physical suspended panels.
  const panels=new Map();
  for(const face of map.faces.filter(f=>f.texture==='skkylite'&&f.normal[1]<-.99&&Math.abs(f.center[1]-10.3632)<.02)){
    const key=Math.sign(face.center[0])+':'+face.center[2].toFixed(3),old=panels.get(key);
    if(!old)panels.set(key,{min:[...face.bounds.min],max:[...face.bounds.max]});
    else for(let axis=0;axis<3;axis++){old.min[axis]=Math.min(old.min[axis],face.bounds.min[axis]);old.max[axis]=Math.max(old.max[axis],face.bounds.max[axis]);}
  }
  const emitters=[];
  for(const panel of panels.values()){
    const pos=panel.min.map((v,k)=>(v+panel.max[k])*.5),warm=pos[0]<0,color=warm?0xf4dfbb:0xd8e7ef;
    fixture([pos[0],pos[1]-.07,pos[2]],warm?0:1,1.7,1.43,'z');
    const source=[pos[0],pos[1]-.20,pos[2]];
    const lamp=spot(source,[pos[0],1.6,pos[2]],color,250,22,1.08);
    if(pos[2]<-60)contactShadow(lamp,1024);
    emitters.push({pos:V(source),color:new T.Color(color),intensity:250,area:28,reflectance:.34});
  }
  // Actual gallery ceiling panels light the upper route that bay cones miss.
  const gallery=[[-14.6304,12.0904,-59.3344],[-14.6304,12.0904,-65.024]];
  for(const pos of gallery){fixture([pos[0],pos[1]-.025,pos[2]],1);const source=[pos[0],pos[1]-.29,pos[2]];point(source,0xdce8e9,36,11);emitters.push({pos:V(source),color:new T.Color(0xdce8e9),intensity:36,area:8,reflectance:.45});}
  // Two ceiling sources replace the old close-wall point hotspot in the office.
  const office=[[-20.32,12.4968,-62.5856],[-27.2288,12.4968,-63.3984]];
  for(const pos of office){fixture([pos[0],pos[1]-.025,pos[2]],0);const source=[pos[0],pos[1]-.31,pos[2]],intensity=pos[0]<-24?16:20;
    if(pos[0]>-24)contactShadow(spot(source,[-20.45,8.5344,-61.90],0xffe6c4,intensity,9,1.18),1024);
    else point(source,0xffe6c4,intensity,9);
    emitters.push({pos:V(source),color:new T.Color(0xffe6c4),intensity,area:8,reflectance:.5});}
  // The modeled desk lamp casts a contained pool across its keyboard and worktop.
  // Its short reach cannot lift the adjoining warehouse or light through a wall.
  spot([-21.32,9.7874,-60.99],[-20.92,9.2994,-61.10],0xffdfae,1.65,2.7,.95);
  // Two remaining native ceiling panels use baked diffuse illumination. These
  // static surfaces do not justify adding two global real-time light loops.
  for(const [pos,color,intensity] of [[[-14.6304,12.0904,-71.5264],0xdce8e9,24],[[-20.32,12.0904,-67.4624],0xffe6c4,14]]){
    fixture([pos[0],pos[1]-.025,pos[2]],color===0xdce8e9?1:0);
    const source=V([pos[0],pos[1]-.29,pos[2]]),tint=new T.Color(color);
    patches.push({pos:source,normal:V([0,-1,0]),color:tint,power:intensity,gain:1});
    emitters.push({pos:source,color:tint,intensity,area:8,reflectance:.45});stats.bakedDirectLights++;
  }
  // Fixtures share four geometry/material batches instead of seventy draw calls.
  const batches=new Map();
  for(const part of fixtureParts){const key=part.geometry.uuid+':'+part.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(part);}
  for(const parts of batches.values()){
    const mesh=new T.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);mesh.name='assault-fixture-batch';mesh.receiveShadow=true;
    parts.forEach((part,index)=>{part.updateMatrix();mesh.setMatrixAt(index,part.matrix);});mesh.computeBoundingSphere();group.add(mesh);stats.fixtureDrawCalls++;
  }
  stats.directLights=lamps.length;
  stats.shadowLights=shadowLights.length;stats.shadowBakes=0;stats.shadowBakeMs=0;stats.shadowPassDrawCalls=0;
  stats.shadowMaps=shadowLights.map(light=>light.shadow.mapSize.x);
  // Four depth comparisons give a narrow local contact, not the sun's metre-wide
  // search/filter kernel. This runs after Saltline installs its sun shader chunk.
  const shadowChunk=T.ShaderChunk.shadowmap_pars_fragment;
  if(!shadowChunk.includes('ASSAULT_LOCAL_CONTACT')){
    const signature=/float getShadow\([^)]*\)\s*\{/;
    if(!signature.test(shadowChunk))throw new Error('Local contact-shadow shader anchor is missing');
    T.ShaderChunk.shadowmap_pars_fragment=shadowChunk.replace(signature,match=>match+`
      // ASSAULT_LOCAL_CONTACT: reserved negative radius, four-tap local PCF.
      if(shadowRadius<0.0){
        vec3 q=shadowCoord.xyz/shadowCoord.w;
        if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0)return 1.0;
        vec2 texel=1.0/shadowMapSize;vec3 dx=dFdx(q),dy=dFdy(q);
        float det=dx.x*dy.y-dx.y*dy.x;vec2 dz=vec2(0.0);
        if(abs(det)>1e-12)dz=vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/det;
        dz=clamp(dz,vec2(-.2),vec2(.2));
        float z=q.z+shadowBias-dot(abs(dz),texel)*.35;
        // Compare at the four texel centres, then interpolate their visibility
        // by fractional texel position. Fixed equal weights quantize the edge.
        vec2 p=q.xy*shadowMapSize-.5,f=fract(p),uv=(floor(p)+.5)*texel;
        vec2 a=uv-q.xy,b=a+vec2(texel.x,0.0),c=a+vec2(0.0,texel.y),d=a+texel;
        float aa=step(z+dot(a,dz),unpackRGBAToDepth(texture2D(shadowMap,q.xy+a)));
        float bb=step(z+dot(b,dz),unpackRGBAToDepth(texture2D(shadowMap,q.xy+b)));
        float cc=step(z+dot(c,dz),unpackRGBAToDepth(texture2D(shadowMap,q.xy+c)));
        float dd=step(z+dot(d,dz),unpackRGBAToDepth(texture2D(shadowMap,q.xy+d)));
        float lit=mix(mix(aa,bb,f.x),mix(cc,dd,f.x),f.y);
        return mix(1.0,lit,shadowIntensity);
      }
    `);
  }
  const environmentCasters=new Set();root.traverse(object=>{if(object.isMesh&&object.castShadow)environmentCasters.add(object);});
  const movingOccluders=[...map.doors,...map.breakables].map(data=>root.getObjectByName(data.id)).filter(Boolean);
  let shadowState=null,shadowUpdatedAt=-Infinity;
  // Three keeps its render state alive through onAfterRender. Baking from a
  // pre-pass outside renderer.render fails on later door invalidation. Update
  // after the main-camera pass instead; the refreshed map is used next frame.
  const previousAfterRender=i.scene.onAfterRender;
  i.scene.onAfterRender=function(renderer,scene,camera){
    previousAfterRender?.call(this,renderer,scene,camera);
    if(camera!==i.camera)return;
    const state=movingOccluders.map(o=>[o.visible,o.position.x,o.position.y,o.position.z,o.rotation.y].join(',')).join('|');
    // A moving door may change every frame; refresh its cached occlusion at
    // most 8 Hz instead of submitting all three depth maps at frame rate.
    if(state===shadowState||performance.now()-shadowUpdatedAt<125)return;
    const disabled=[],before=renderer.info.render.calls,begin=performance.now(),pending=renderer.shadowMap.needsUpdate;
    // Cache environmental contacts only. Actors retain their normal sun shadows
    // and never leave a frozen silhouette in a local map after they move away.
    scene.traverse(o=>{if((o.isMesh||o.isLine||o.isPoints)&&o.castShadow&&!environmentCasters.has(o)){disabled.push(o);o.castShadow=false;}});
    try{
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      for(const light of shadowLights)light.shadow.needsUpdate=true;
      renderer.shadowMap.needsUpdate=true;renderer.shadowMap.render(shadowLights,scene,camera);
      shadowState=state;shadowUpdatedAt=performance.now();stats.shadowBakes++;stats.shadowBakeMs=Math.round((performance.now()-begin)*100)/100;
      stats.shadowPassDrawCalls=renderer.info.render.calls-before;
    }finally{for(const o of disabled)o.castShadow=true;renderer.shadowMap.needsUpdate=pending;}
  };

  // Sample receiving patches under real fixtures. Ray hits choose the actual
  // loading ramps, crate tops and floor levels, rather than a guessed flat floor.
  const ray=new T.Vector3(),offsets=[[0,0],[-3.3,-2.4],[3.3,-2.4],[-3.3,2.4],[3.3,2.4]];
  for(const emitter of emitters){
    for(const [dx,dz] of offsets){
      const spread=emitter.intensity>100?1:.36;
      ray.set(dx*spread,-8,dz*spread).normalize();
      const hit=i.physics.raycast(emitter.pos,ray,22);stats.visibilityRays++;
      if(!hit||hit.normal.y<.35)continue;
      const distance=Math.max(hit.dist,1),cosine=Math.max(0,-ray.dot(hit.normal));
      const power=emitter.intensity/(distance*distance+1)*cosine*emitter.reflectance*emitter.area/Math.PI;
      patches.push({pos:hit.point.clone().addScaledVector(hit.normal,.12),normal:hit.normal.clone(),color:emitter.color.clone(),power});
    }
  }
  // Broad sky/sun contribution arrives only through an unobstructed opening.
  patches.push({pos:V([0,3.1,-39.5]),normal:V([0,0,-1]),color:new T.Color(0xffdab0),power:48});
  stats.bouncePatches=patches.length;
  const ENERGY_RANGE=6;
  function volume(min,max,dimensions){
    const [nx,ny,nz]=dimensions,energy=new Uint8Array(nx*ny*nz*4),direction=new Uint8Array(energy.length),p=new T.Vector3(),to=new T.Vector3(),sum=new T.Vector3();
    for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      p.set(min[0]+(max[0]-min[0])*x/(nx-1),min[1]+(max[1]-min[1])*y/(ny-1),min[2]+(max[2]-min[2])*z/(nz-1));
      let r=0,g=0,b=0;sum.set(0,0,0);
      for(const patch of patches){
        to.subVectors(p,patch.pos);const distance=to.length();if(distance<.01||distance>25)continue;to.multiplyScalar(1/distance);
        const facing=Math.max(0,to.dot(patch.normal));if(facing<.025)continue;
        const power=patch.power*facing/(distance*distance+2.25);if(power<.001)continue;
        const start=patch.pos.clone().addScaledVector(to,.035),hit=i.physics.raycast(start,to,Math.max(.01,distance-.12));stats.visibilityRays++;
        if(hit)continue;
        // Account for the unsampled area represented by each diffuse patch.
        const e=power*(patch.gain??2.1);r+=patch.color.r*e;g+=patch.color.g*e;b+=patch.color.b*e;
        sum.addScaledVector(to,-e);
      }
      const index=((z*ny+y)*nx+x)*4,peak=Math.max(r,g,b);if(peak>ENERGY_RANGE)stats.clippedProbes++;
      energy[index]=Math.min(255,Math.round(r/ENERGY_RANGE*255));energy[index+1]=Math.min(255,Math.round(g/ENERGY_RANGE*255));energy[index+2]=Math.min(255,Math.round(b/ENERGY_RANGE*255));energy[index+3]=255;
      if(sum.lengthSq()>1e-8)sum.normalize();
      direction[index]=Math.round((sum.x*.5+.5)*255);direction[index+1]=Math.round((sum.y*.5+.5)*255);direction[index+2]=Math.round((sum.z*.5+.5)*255);direction[index+3]=255;stats.probes++;
    }
    const texture=data=>{const t=new T.Data3DTexture(data,nx,ny,nz);t.format=T.RGBAFormat;t.type=T.UnsignedByteType;t.minFilter=t.magFilter=T.LinearFilter;t.wrapS=t.wrapT=t.wrapR=T.ClampToEdgeWrapping;t.unpackAlignment=1;t.needsUpdate=true;return t;};
    return {min:V(min),max:V(max),energy:texture(energy),direction:texture(direction)};
  }
  const hall=volume([-17.35,.22,-73.1],[17.35,12.45,-41.15],[11,6,11]);
  const officeVolume=volume([-29.0,8.68,-70.0],[-17.7,12.45,-59.85],[5,4,5]);
  const uniforms={uAssaultHall:{value:hall.energy},uAssaultHallDirection:{value:hall.direction},uAssaultOffice:{value:officeVolume.energy},uAssaultOfficeDirection:{value:officeVolume.direction},uAssaultHallMin:{value:hall.min},uAssaultHallMax:{value:hall.max},uAssaultOfficeMin:{value:officeVolume.min},uAssaultOfficeMax:{value:officeVolume.max},uAssaultBounceStrength:{value:1}};
  group.userData.bounceStrength=uniforms.uAssaultBounceStrength;
  const vertexHeader='\nvarying vec3 vAssaultLightWorld;\n';
  const vertexBody=`
    vec4 assaultLightPosition=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
      assaultLightPosition=instanceMatrix*assaultLightPosition;
    #endif
    vAssaultLightWorld=(modelMatrix*assaultLightPosition).xyz;
  `;
  const fragmentHeader=`
    precision highp sampler3D;
    varying vec3 vAssaultLightWorld;
    uniform sampler3D uAssaultHall,uAssaultHallDirection,uAssaultOffice,uAssaultOfficeDirection;
    uniform vec3 uAssaultHallMin,uAssaultHallMax,uAssaultOfficeMin,uAssaultOfficeMax;
    uniform float uAssaultBounceStrength;
    vec3 assaultIndirect(vec3 p,vec3 n){
      vec3 uv=(p-uAssaultHallMin)/(uAssaultHallMax-uAssaultHallMin),e=vec3(0.0),d=vec3(0.0);
      if(all(greaterThanEqual(uv,vec3(-.015)))&&all(lessThanEqual(uv,vec3(1.015)))){
        e=texture(uAssaultHall,clamp(uv,0.0,1.0)).rgb;d=texture(uAssaultHallDirection,clamp(uv,0.0,1.0)).rgb*2.0-1.0;
      }else{
        uv=(p-uAssaultOfficeMin)/(uAssaultOfficeMax-uAssaultOfficeMin);
        if(all(greaterThanEqual(uv,vec3(-.035)))&&all(lessThanEqual(uv,vec3(1.035)))){
          e=texture(uAssaultOffice,clamp(uv,0.0,1.0)).rgb;d=texture(uAssaultOfficeDirection,clamp(uv,0.0,1.0)).rgb*2.0-1.0;
        }
      }
      float directionality=.78+.35*dot(n,normalize(d+vec3(.0001)));
      return e*${ENERGY_RANGE.toFixed(1)}*directionality*uAssaultBounceStrength;
    }
  `;
  const seen=new Set();
  root.traverse(object=>{
    if(!object.isMesh||!object.material)return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(seen.has(material)||!material.isMeshStandardMaterial||!material.userData?.interior)continue;
      seen.add(material);const previous=material.onBeforeCompile,cache=material.customProgramCacheKey;
      material.onBeforeCompile=function(shader,renderer){
        previous?.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>'+vertexHeader).replace('#include <project_vertex>','#include <project_vertex>'+vertexBody);
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+fragmentHeader).replace('#include <lights_fragment_end>',`
          #if defined(RE_IndirectDiffuse)
            irradiance+=assaultIndirect(vAssaultLightWorld,inverseTransformDirection(geometryNormal,viewMatrix));
          #endif
          #include <lights_fragment_end>
        `);
      };
      material.customProgramCacheKey=function(){return cache.call(this)+'|assault-indirect-volume-v1';};
      material.needsUpdate=true;stats.patchedMaterials++;
    }
  });
  stats.bakeMs=Math.round(performance.now()-started);
  return {lamps,root:group,stats,uniforms,volumes:{hall,office:officeVolume}};
}
