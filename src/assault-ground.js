/* Reuse Saltline's actual wet-apron, ripples, rain and planar-reflection asset
 * system on the imported Assault pavement. No ocean or legacy port markings. */
async function assaultGround(i) {
  const T=i.THREE, pavement=i.level&&i.level.pavementGeometry;
  if(!pavement||!pavement.attributes.position||pavement.attributes.position.count<3)
    throw new Error('Assault pavement geometry must be ready before ground');
  const map=window.__ASSAULT_MAP;
  pavement.computeBoundingBox();
  const bounds=pavement.boundingBox;
  // U1 (CPU), Ib (shader) and Nb (splashes) all use this same metre-space rect.
  Li.x0=Math.floor(bounds.min.x)-3;Li.z0=Math.floor(bounds.min.z)-3;
  Li.size=Math.ceil(Math.max(bounds.max.x-Li.x0,bounds.max.z-Li.z0))+3;
  Sb.splice(0,Sb.length,
    [10,-4,2.7,1.4,.26],[-2,-5.5,3.3,1.25,.24],[-14,-7,3.4,1.9,.23],
    [-28,-6.5,2.6,2.1,.25],[-29,-26,2.1,5,.25],[-20,-29,3.2,2.2,.22],
    [4,-32.5,5,2.4,.26],[12.5,-30,2.5,3.2,.23],[-9,-34.8,4,1.7,.24],
    [-20.5,-51.5,2.1,4,.24],[20.2,-46.8,1.1,3.5,.25],[-28,-59,2.4,3,.22],
    [-53,-28,2.3,5.2,.23],[-52,-13,2.3,3.3,.23],[-42,3,3,4,.23],
    // Shallow, overlapping depressions in the open cargo apron create a
    // broken water edge. The shared shelter field keeps container feet dry.
    [1.7,-26.7,1.5,3.1,.25],[-4.1,-22.5,3.2,1.1,.22],[-5.7,-23.1,1.45,.8,.18]);

  // Capture the original reflection registration to add visibility/performance
  // gating without leaving a second, permanently running reflection pass behind.
  const registered=[],register=i.render.addPrePass;
  i.render.addPrePass=pass=>registered.push(pass);
  let ground;
  try{ground=await O1(i);}finally{i.render.addPrePass=register;}
  ground.root.name='assault-weather-ground';ground.apron.name='assault-wet-pavement';
  ground.apron.geometry.dispose();ground.apron.geometry=pavement;
  ground.apron.position.set(0,0,0);ground.apron.rotation.set(0,0,0);ground.apron.scale.set(1,1,1);ground.apron.updateMatrix();
  ground.apron.frustumCulled=true;
  ground.harbor=assaultHarborWater(i,ground);

  // Blank the original BERTH 4/container-lane markings. The scene owns actual
  // painted loading lines, so there is only one source of yard wayfinding.
  const marks=ground.uniforms.uMarks.value;
  const blank=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1,T.RGBAFormat,T.UnsignedByteType);
  blank.colorSpace=T.NoColorSpace;blank.needsUpdate=true;
  ground.uniforms.uMarks.value=blank;ground.uniforms.uMarkRes.value=1;
  marks.dispose();
  const compile=ground.apron.material.onBeforeCompile;
  ground.apron.material.onBeforeCompile=shader=>{
    compile(shader);
    const patch=(anchor,replacement)=>{
      if(!shader.fragmentShader.includes(anchor))throw new Error('Assault ground shader anchor missing: '+anchor.slice(0,65));
      shader.fragmentShader=shader.fragmentShader.replace(anchor,replacement);
    };
    // Asphalt in this map never turns into Saltline's old eastern concrete quay.
    patch(
      'float conc = smoothstep(15.6, 16.6, gxz.x + (d1.g - 0.5) * 0.6);','float conc = 0.0;');
    // Keep the original crack masks for depression depth and puddle behavior.
    // Their visual repair seal is narrow and charcoal, not a repeating black
    // network competing with the playable scene at eye height.
    patch('alb = mix(alb, vec3(0.018, 0.018, 0.02), max(max(tar, seal * 0.4) * 0.94, crack * 0.9));',
      'alb = mix(alb, vec3(0.043, 0.044, 0.046), max(tar * .52, max(seal * .10, crack * .22)));');
    patch('(0.62 + 0.76 * grain)', '(0.87 + 0.26 * grain)');
    // Keep standing-water depth/footstep masks intact. Between puddles, the
    // existing broad detail field separates damp aggregate from soaked film.
    patch('float damp = (1.0 - dryP) * uWetG;',
      'float damp = (1.0 - dryP) * uWetG * mix(.48,1.0,smoothstep(.24,.72,d1.g*.65+mk.g*.35));');
    // Basin shape now lives in the shared CPU/GPU mask. Leave only aggregate-
    // scale variation in the shader so splashes and footsteps follow its edge.
    patch('float depth = 0.5 - mk.r + (sn - 0.5) * 0.11 + (d1.g - 0.5) * 0.03 + (grain - 0.5) * 0.012 + groove * 0.04 + crack * 0.02 - paint * 0.01;',
      'float depth = 0.5 - mk.r + (sn - 0.5) * .018 + (d1.g - 0.5) * .008 + (grain - 0.5) * .004 + groove * .025 + crack * .012 - paint * .01;');
    patch('float bandW = 0.05 + 0.15 * sn1 * sn1 + 0.05 * d1.g;',
      'float bandW = .025 + .055 * mk.g + .045 * sn1;');
    patch('float fringe = smoothstep(-0.65, -0.02, depth);',
      'float fringe = smoothstep(-.28, -.015, depth);');
    patch('alb += vec3(0.11, 0.105, 0.095) * smoothstep(0.58, 0.78, d2.a)',
      'alb += vec3(0.052, 0.050, 0.045) * smoothstep(0.58, 0.78, d2.a)');
    patch('rough = mix(rough, 0.13, film * 0.8);',
      'rough = mix(rough, .13+.06*(1.0-grain), film * 0.8);');
    patch('rough = mix(clamp(rough, 0.1, 1.0), 0.055, puddle);',
      'rough = mix(clamp(rough, .1, 1.0), mix(.085,.055,smoothstep(.015,.11,depth))+.012*uRain, puddle);');
    patch('float wsum = puddle + film * 0.2;',
      'float wsum = puddle + film * .06;');
    patch('(n1.rg - 0.5) * mix(2.1, 0.7, max(film, soak * 0.6)) + (n0.ba - 0.5) * 0.3',
      '(n1.rg - 0.5) * mix(1.25, 0.55, max(film, soak * 0.6)) + (n0.ba - 0.5) * 0.10');
  };
  ground.apron.material.customProgramCacheKey=()=> 'saltline-assault-apron-4';
  ground.apron.material.needsUpdate=true;

  const size=ground.maskTexture.image.width, raw=ground.maskTexture.image.data;
  const covered=new Uint8Array(size*size),roof=new Float32Array(size*size),step=Li.size/size;
  // Triangle rasterization in world XZ; interpolated height correctly shelters
  // under the source's sloped warehouse roof and elevated bridge/underpass.
  function raster(a,b,c,write) {
    const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
    if(Math.abs(den)<1e-9)return;
    const x0=Math.max(0,Math.ceil((Math.min(a[0],b[0],c[0])-Li.x0)/step-.5));
    const x1=Math.min(size-1,Math.floor((Math.max(a[0],b[0],c[0])-Li.x0)/step-.5));
    const z0=Math.max(0,Math.ceil((Math.min(a[2],b[2],c[2])-Li.z0)/step-.5));
    const z1=Math.min(size-1,Math.floor((Math.max(a[2],b[2],c[2])-Li.z0)/step-.5));
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++) {
      const wx=Li.x0+(x+.5)*step,wz=Li.z0+(z+.5)*step;
      const u=((b[2]-c[2])*(wx-c[0])+(c[0]-b[0])*(wz-c[2]))/den;
      const v=((c[2]-a[2])*(wx-c[0])+(a[0]-c[0])*(wz-c[2]))/den;
      if(u>=-.0001&&v>=-.0001&&u+v<=1.0001)write(z*size+x,u*a[1]+v*b[1]+(1-u-v)*c[1]);
    }
  }
  const p=pavement.attributes.position,idx=pavement.index;
  const count=idx?idx.count:p.count;
  for(let k=0;k<count;k+=3) {
    const point=n=>{const j=idx?idx.getX(n):n;return[p.getX(j),p.getY(j),p.getZ(j)];};
    raster(point(k),point(k+1),point(k+2),cell=>covered[cell]=1);
  }
  for(const s of map.surfaces||[]) {
    if(/^\{/.test(s.texture))continue;
    for(let k=0;k<s.positions.length;k+=9) {
      if(s.normals[k+1]<.15)continue;
      const a=s.positions.slice(k,k+3),b=s.positions.slice(k+3,k+6),c=s.positions.slice(k+6,k+9);
      if(Math.max(a[1],b[1],c[1])<.28)continue;
      raster(a,b,c,(cell,y)=>{if(y>roof[cell])roof[cell]=y;});
    }
  }
  // The same shelter field includes the reused maritime assets: rain/splashes
  // meet their roofs, and pavement underneath stays out of the puddle mask.
  for(const container of i.level.stats.dressing.containers||[]){
    const size=Gi[container.name],scale=container.scale||[1,1,1];
    const w=size[0]*scale[0]/2,d=size[2]*scale[2]/2,h=size[1]*scale[1];
    const [x,y,z]=container.pos,c=Math.cos(container.yaw),s=Math.sin(container.yaw);
    const points=[[-w,-d],[w,-d],[w,d],[-w,d]].map(([a,b])=>[x+a*c+b*s,y+h,z-a*s+b*c]);
    const write=(cell,height)=>{if(height>roof[cell])roof[cell]=height;};
    raster(points[0],points[1],points[2],write);raster(points[0],points[2],points[3],write);
  }
  // Deform the original Saltline depression map once, at load. Metre-scale
  // drainage lobes, small eroded edges and occasional aggregate crowns break
  // the authored ellipses without replacing their locations or water system.
  // R remains the sole water-level field for U1, apron shading and rain splashes.
  const maskSource=raw.slice(),maskStarted=performance.now();
  function refineBasin(wx,wz){
    const dx=(fs(wx*.24,wz*.24,137,2)-.5)*1.75+(Ab(wx*.92,wz*.92,149)-.5)*.33;
    const dz=(fs(wx*.24+13.4,wz*.24-8.1,157,2)-.5)*1.45+(Ab(wx*.92+5.2,wz*.92,163)-.5)*.28;
    const basin=.5-U1(maskSource,size,wx+dx,wz+dz,0);
    const edge=(fs(wx*.82,wz*.82,173,2)-.5)*.075+(Ab(wx*2.4,wz*2.4,179)-.5)*.022;
    const crown=fl(.58,.83,Ab(wx*.41,wz*.41,181))*fl(.12,.32,basin)*.42;
    const depth=Math.min(.34,basin)+edge-crown;
    const damp=So(U1(maskSource,size,wx+dx,wz+dz,1)*.82+fl(-.14,.015,depth)*.18);
    return [depth,damp];
  }
  const field=new Uint8Array(size*size*4);
  let pavementPixels=0,puddlePixels=0,shelteredPixels=0,originalPuddlePixels=0,raisedPixels=0;
  for(let cell=0;cell<covered.length;cell++) {
    const k=cell*4,shade=roof[cell]>.35;
    field[k]=covered[cell]?255:0;field[k+1]=Math.min(255,Math.round(roof[cell]/32*255));field[k+3]=255;
    if(covered[cell])pavementPixels++;
    if(covered[cell]&&shade)shelteredPixels++;
    if(!covered[cell]||shade){raw[k]=255;raw[k+1]=0;raw[k+2]=0;}
    else{
      const wasWater=raw[k]<124;if(wasWater)originalPuddlePixels++;
      const wx=Li.x0+(cell%size+.5)*step,wz=Li.z0+(Math.floor(cell/size)+.5)*step;
      const [basin,damp]=refineBasin(wx,wz);
      raw[k]=Math.round(So(.5-basin)*255);raw[k+1]=Math.round(damp*255);
      if(raw[k]<124)puddlePixels++;else if(wasWater)raisedPixels++;
    }
  }
  ground.maskTexture.needsUpdate=true;
  const fieldTexture=new T.DataTexture(field,size,size,T.RGBAFormat,T.UnsignedByteType);
  fieldTexture.colorSpace=T.NoColorSpace;fieldTexture.minFilter=fieldTexture.magFilter=T.NearestFilter;
  fieldTexture.generateMipmaps=false;fieldTexture.needsUpdate=true;
  const fieldRect=new T.Vector3(Li.x0,Li.z0,1/Li.size);
  const fieldGLSL=`
uniform sampler2D uAssaultField;
uniform vec3 uAssaultRect;
vec2 assaultField(vec2 worldXZ){
  vec2 uv=(worldXZ-uAssaultRect.xy)*uAssaultRect.z;
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return vec2(0.0);
  return textureLod(uAssaultField,uv,0.0).rg;
}
`;
  const splash=ground.root.children.find(o=>o.name==='rainSplash');
  for(const mesh of [ground.rain,splash])if(mesh) {
    const mat=mesh.material;
    mat.uniforms.uAssaultField={value:fieldTexture};mat.uniforms.uAssaultRect={value:fieldRect};
    mat.vertexShader=fieldGLSL+mat.vertexShader;
    if(mesh===ground.rain) {
      mat.vertexShader=mat.vertexShader.replace('kill = 1.0 - uDrip;','kill = 1.0;');
      mat.vertexShader=mat.vertexShader.replace(
        'if (p.y < (p.x > 30.0 ? -1.6 : 0.0)) kill = 1.0;',
        'if (p.y < ((p.x >= 75.0 || p.x <= -75.0) ? -1.6 : max(0.0, assaultField(p.xz).g * 32.0 - 0.06))) kill = 1.0;');
    }else{
      mat.vertexShader=mat.vertexShader.replace(
        'if (p.x > 29.7 || wInside(p + vec3(0.0, 0.2, 0.0))) kill = 1.0;',
        'vec2 af = assaultField(p.xz); if (af.r < 0.5 || af.g * 32.0 > 0.35 || wInside(p + vec3(0.0, 0.2, 0.0))) kill = 1.0;');
    }
    mat.needsUpdate=true;
  }
  const pixel=(x,z)=>{
    const a=Math.floor((x-Li.x0)/step),b=Math.floor((z-Li.z0)/step);
    return a>=0&&b>=0&&a<size&&b<size?b*size+a:-1;
  };
  const exposed=(x,z)=>{const k=pixel(x,z);return k>=0&&covered[k]&&roof[k]<.35;};
  const depth=(x,z)=>exposed(x,z)?.5-U1(raw,size,x,z,0):-.2;
  ground.puddleDepth=depth;
  ground.isPuddle=(x,z)=>depth(x,z)>.015;
  const originalWetness=ground.wetnessAt.bind(ground);
  ground.wetnessAt=(x,z)=>exposed(x,z)?originalWetness(x,z):.12;
  ground.shelterHeightAt=(x,z)=>{const k=pixel(x,z);return k<0?0:roof[k];};
  ground.pavementAt=(x,z)=>{const k=pixel(x,z);return k>=0&&!!covered[k];};
  const originalUpdate=ground.update.bind(ground),globalWet=i.mats.uniforms.wet;
  // A standing pool remains smoother than damp wall paint at the default wet
  // setting. Zero wetness still produces a dry yard, and the slider stays live.
  ground.uniforms.uWetG={value:Math.min(1,globalWet.value*1.65)};
  const diagnostics={system:'original Saltline O1/Ib/Nb/zb',sea:true,harbor:ground.harbor,maskResolution:size,
    maskRect:[Li.x0,Li.z0,Li.size],pavementSquareMetres:+(pavementPixels*step*step).toFixed(1),
    shelteredSquareMetres:+(shelteredPixels*step*step).toFixed(1),
    puddleSquareMetres:+(puddlePixels*step*step).toFixed(1),
    previousPuddleSquareMetres:+(originalPuddlePixels*step*step).toFixed(1),
    raisedOrReshapedSquareMetres:+(raisedPixels*step*step).toFixed(1),maskRefinementMs:Math.round(performance.now()-maskStarted),
    puddleShape:'shared warped depressions with aggregate crowns',planarScale:0,reflectionPasses:0,reflectionSkipped:0};
  ground.diagnostics=diagnostics;
  for(const pass of registered)register.call(i.render,(renderer,scene,camera)=>{
    const cp=camera.position,roofY=ground.shelterHeightAt(cp.x,cp.z);
    const inside=roofY>cp.y+.1||(i.level.interiorBoxes||[]).some(b=>
      cp.x>b.min.x&&cp.x<b.max.x&&cp.y>b.min.y&&cp.y<b.max.y&&cp.z>b.min.z&&cp.z<b.max.z);
    if(inside||!ground.planar.enabled||globalWet.value<.02||puddlePixels===0||cp.y>16) {
      ground.uniforms.uReflOn.value=0;ground.planar.active=false;diagnostics.reflectionSkipped++;diagnostics.planarScale=0;return;
    }
    const originalScale=i.quality.planar;
    try{i.quality.planar=Math.min(originalScale||0,.35);diagnostics.planarScale=i.quality.planar;pass(renderer,scene,camera);diagnostics.reflectionPasses++;}
    finally{i.quality.planar=originalScale;}
  });
  ground.update=dt=>{
    originalUpdate(dt);ground.uniforms.uWetG.value=Math.min(1,globalWet.value*1.65);
    if(ground.rain.material.uniforms.uDrip)ground.rain.material.uniforms.uDrip.value=0;
  };
  ground.setRain(i.params.rain!==undefined?Number(i.params.rain):.52);
  ground.update(0);
  return ground;
}
