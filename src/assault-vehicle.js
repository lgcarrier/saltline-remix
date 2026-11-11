// Geometry finish for the source Assault truck. The native body, cab, glazing,
// dimensions, location and all collision geometry remain owned by the BSP.
// Call BEFORE building BSP render batches so hideFaceIds/hideTextures can be used.
function assaultVehicle(i, map) {
  const T = i.THREE, root = new T.Group(); root.name = 'assault-truck-finish';
  const batches = new Map(), hideTextures = new Set(['trk_tire', 'trk_tread']);
  const hideFaceIds = new Set();
  for (const face of map.faces || []) {
    const min = face.bounds.min, max = face.bounds.max;
    if ((face.texture === 'trk_canvas' && min[0] >= 8.12 && max[1] > 1.7)
      || face.texture === 'trk_rim') hideFaceIds.add(face.id);
  }
  // Own the native truck's finish without changing its brush geometry or any
  // shared Saltline material. The original window openings receive glazing;
  // `recharged` is the cab's metal roof/A-pillars, not a window texture.
  const nativeFinish = new Map();
  for (const face of map.faces || []) {
    const mn=face.bounds.min,mx=face.bounds.max;
    if(face.modelId!==0||mn[0]<5.68||mx[0]>13.21||mn[2]<-10.17||mx[2]>-6.49||hideFaceIds.has(face.id))continue;
    let name=null;
    if(/^trk_(door|side|bed|hood)$/.test(face.texture)||face.texture==='recharged')name='body';
    else if(/^basetrim0[12]$/.test(face.texture))name='steel_worn';
    else if(/^trk_(bumper|grille)$/.test(face.texture))name='steel_galv';
    else if(face.texture==='trk_canvas')name=mx[1]<.82?'steel_dark':'body';
    if(name){nativeFinish.set(face.id,name);hideFaceIds.add(face.id);}
  }
  let triangles = 0;
  function add(geometry, name) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    let batch = batches.get(name);
    if (!batch) { batch = {p: [], n: [], uv: []}; batches.set(name, batch); }
    for (let k = 0; k < p.count; k++) {
      batch.p.push(p.getX(k), p.getY(k), p.getZ(k));
      batch.n.push(n.getX(k), n.getY(k), n.getZ(k));
      batch.uv.push(uv ? uv.getX(k) : p.getX(k), uv ? uv.getY(k) : p.getZ(k));
    }
    triangles += p.count / 3;
    if (g !== geometry) g.dispose(); geometry.dispose();
  }
  function box(name, center, size) {
    const g = new T.BoxGeometry(...size); g.translate(...center); add(g, name);
  }
  function rod(name, from, to, radius = .025, sides = 8) {
    const a = new T.Vector3(...from), b = new T.Vector3(...to), d = b.clone().sub(a);
    const g = new T.CylinderGeometry(radius, radius, d.length(), sides, 1, false);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate(...a.add(b).multiplyScalar(.5).toArray()); add(g, name);
  }
  function patch(name, nx, ny, evaluate, uvScale = [1, 1]) {
    const p = [], uv = [], idx = [];
    for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
      const u = x / nx, v = y / ny;
      p.push(...evaluate(u, v)); uv.push(u * uvScale[0], v * uvScale[1]);
    }
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const a = y * (nx + 1) + x, b = a + nx + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    add(g, name);
  }
  // Transfer only the selected face ranges. A surface can contain unrelated
  // architecture using the same texture, so texture-wide hiding is unsafe.
  const facesById=new Map(map.faces.map(face=>[face.id,face]));
  let nativeTriangles=0;
  for(const surface of map.surfaces)for(const id of surface.faceIds){
    const name=nativeFinish.get(id);if(!name)continue;
    const face=facesById.get(id),start=face.vertexStart,end=start+face.vertexCount;
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(surface.positions.slice(start*3,end*3),3));
    g.setAttribute('normal',new T.Float32BufferAttribute(surface.normals.slice(start*3,end*3),3));
    g.setAttribute('uv',new T.Float32BufferAttribute(surface.uvMeters.slice(start*2,end*2),2));
    nativeTriangles+=face.vertexCount/3;add(g,name);
  }

  // Glass sits just inside the native openings. Thin seals and a centre mullion
  // attach it to the existing cab; no collision or glass-breaking state changes.
  patch('glass',1,1,(u,v)=>[7.135+v*.195,1.654+v*.960,-9.946+u*3.230],[3.23,.98]);
  for(const z of [-10.145,-6.517]){
    patch('glass',1,1,(u,v)=>[7.441+u*.660,1.654+v*.960,z],[.66,.96]);
    for(const x of [7.435,8.108])rod('rubber',[x,1.645,z],[x,2.627,z],.013,6);
    for(const y of [1.645,2.627])rod('rubber',[7.435,y,z],[8.108,y,z],.013,6);
    box('steel_dark',[7.70,1.365,z],[.19,.035,.026]);
  }
  for(const z of [-9.951,-8.3312,-6.711])rod('rubber',[7.130,1.645,z],[7.328,2.629,z],.014,6);
  for(const v of [0,1])rod('rubber',[7.130+v*.198,1.645+v*.984,-9.951],[7.130+v*.198,1.645+v*.984,-6.711],.014,6);
  for(const z of [-9.13,-7.53]){
    rod('steel_dark',[7.126,1.685,z],[7.209,2.08,z+.30],.010,6);
    rod('rubber',[7.205,2.06,z+.07],[7.205,2.06,z+.55],.015,6);
  }

  // Shallow manufactured fittings attach to the source front panel. The dark
  // grille backing, proud bars and lens bezels create real material boundaries
  // without changing the native brush, wheelbase, collision or gameplay route.
  const frontX=5.6896,frontZ=-8.3312;
  box('steel_dark',[frontX-.009,.865,frontZ],[.020,.43,1.77]);
  for(let k=0;k<6;k++)box('steel_galv',[frontX-.025,.695+k*.067,frontZ],[.014,.022,1.68]);
  for(const y of [.642,1.088])box('steel_worn',[frontX-.024,y,frontZ],[.025,.024,1.82]);
  for(const z of [frontZ-.902,frontZ+.902])box('steel_worn',[frontX-.024,.865,z],[.025,.47,.024]);
  for(const z of [frontZ-1.24,frontZ+1.24]){
    box('rubber',[frontX-.016,.925,z],[.035,.304,.516]);
    box('paint_white',[frontX-.037,.925,z],[.012,.235,.442]);
    // Lower bezel lip catches the environment without adding a light source.
    box('steel_galv',[frontX-.038,.792,z],[.016,.018,.474]);
  }
  box('steel_worn',[frontX-.033,.486,frontZ],[.072,.13,3.20]);
  for(const z of [frontZ-1.03,frontZ+1.03])box('steel_dark',[frontX+.10,.467,z],[.25,.095,.10]);
  for(const side of [-1,1]){
    const z=side<0?-10.163:-6.4994;
    for(const x of [7.143,8.087])box('steel_dark',[x,1.12,z],[.009,.97,.009]);
    box('steel_dark',[7.615,.632,z],[.953,.009,.009]);
  }
  // Hood edge seams follow the source slope exactly, rather than floating
  // horizontal strips above it. They share the existing dark-metal batch.
  for(const z of [-9.88,-6.7824])patch('steel_dark',1,1,(u,v)=>{
    const x=5.756+u*1.30;
    return [x,1.2192+(x-frontX)*2/7+.0025,z+(v-.5)*.008];
  },[1.3,.008]);

  // Four native wheel locations, including the original front steering angle.
  // Rounded shoulder profiles retain source radius .4572m and grounded contact.
  const wheels = [
    {x:6.3754,z:-6.6356,width:.40,steer:-.165,side:1},
    {x:6.4262,z:-10.1408,width:.40,steer:-.165,side:-1},
    {x:11.8364,z:-6.4516,width:.3048,steer:0,side:1},
    {x:11.8364,z:-10.2108,width:.3048,steer:0,side:-1}
  ];
  const wheelY = .4572, wheelRadius = .4572;
  for (const wheel of wheels) {
    const h = wheel.width / 2;
    function wheelPart(g, name) { g.rotateY(wheel.steer); g.translate(wheel.x, wheelY, wheel.z); add(g, name); }
    const profile = [
      [.245,-h*.9],[.30,-h],[.385,-h*.94],[.438,-h*.70],[wheelRadius,-h*.42],
      [wheelRadius,h*.42],[.438,h*.70],[.385,h*.94],[.30,h],[.245,h*.9],[.245,-h*.9]
    ];
    const tire = new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)), 28);
    const tireUV = tire.attributes.uv, tireP = tire.attributes.position;
    for(let k=0;k<tireUV.count;k++)tireUV.setXY(k,tireUV.getX(k)*Math.PI*2*wheelRadius,tireP.getY(k)+h);
    tire.rotateX(Math.PI/2); wheelPart(tire, 'tire');

    // Tread lugs are restrained silhouette relief; procedural tire maps carry
    // the smaller cuts. Omit the contact patch lugs so nothing sinks below grade.
    for(let k=1;k<23;k++) {
      const angle=k/24*Math.PI*2;
      if(Math.cos(angle)<-.94)continue;
      const g=new T.BoxGeometry(.092,.018,wheel.width*.70);
      g.rotateZ(-angle);g.translate(Math.sin(angle)*.452,Math.cos(angle)*.452,0);
      wheelPart(g,'tire');
    }
    const outward = wheel.side;
    const rimProfile = [[.09,outward*(h+.002)],[.17,outward*(h+.002)],
      [.235,outward*(h-.035)],[.267,outward*(h-.01)],[.267,outward*(h+.012)],
      [.235,outward*(h+.02)],[.17,outward*(h+.017)],[.09,outward*(h+.017)]];
    const rim=new T.LatheGeometry(rimProfile.map(p=>new T.Vector2(...p)),24);rim.rotateX(Math.PI/2);wheelPart(rim,'steel_galv');
    const hub=new T.CylinderGeometry(.103,.115,.08,20);hub.rotateX(Math.PI/2);hub.translate(0,0,outward*(h+.035));wheelPart(hub,'steel_dark');
    for(let k=0;k<6;k++){
      const angle=k/6*Math.PI*2,x=Math.cos(angle)*.144,y=Math.sin(angle)*.144;
      const nut=new T.CylinderGeometry(.019,.019,.023,6);nut.rotateX(Math.PI/2);nut.translate(x,y,outward*(h+.032));wheelPart(nut,'steel_worn');
      const hole=new T.CircleGeometry(.027,10);if(outward<0)hole.rotateY(Math.PI);hole.translate(Math.cos(angle+.4)*.205,Math.sin(angle+.4)*.205,outward*(h+.022));wheelPart(hole,'rubber');
    }
    // Thin mudguard follows the upper tyre arc, rather than a solid box fender.
    patch('steel_dark',18,1,(u,v)=>{
      const a=-Math.PI*.58+u*Math.PI*1.16;
      return [wheel.x+Math.sin(a)*.52,wheelY+Math.cos(a)*.52,wheel.z+(v-.5)*(wheel.width+.08)];
    },[1.88,wheel.width+.08]);
  }

  // A connected undercarriage grounds the native hull visually.
  const zCenter=-8.3312;
  for(const z of [-7.22,-9.44])box('steel_dark',[9.35,.40,z],[6.15,.17,.14]);
  for(const x of [6.40,11.8364]){
    rod('steel_dark',[x,.44,-10.02],[x,.44,-6.62],.07,12);
    const diff=new T.SphereGeometry(.18,12,6);diff.scale(1.35,.8,1);diff.translate(x,.44,zCenter);add(diff,'steel_dark');
    for(const z of [-7.22,-9.44])for(let k=0;k<3;k++)box('steel_worn',[x,.28+k*.024,z],[.91-k*.11,.018,.09]);
  }
  for(const x of [8.5,9.8,11.1,12.7])box('steel_dark',[x,.43,zCenter],[.085,.12,3.18]);
  rod('steel_worn',[6.55,.43,zCenter],[11.68,.43,zCenter],.045,10);

  // Curved canvas canopy occupies the same native envelope. Small deterministic
  // fold relief grows between tension points, with an open rear load aperture.
  const x0=8.128,x1=13.0048,z0=-10.16,z1=-6.5024,yBottom=1.2192,yEave=2.43,yTop=2.8448;
  const length=x1-x0,width=z1-z0;
  const arch = v => yEave+(yTop-yEave)*Math.pow(Math.max(0,Math.sin(Math.PI*v)),.72);
  patch('tarp',32,18,(u,v)=>{
    const betweenBows=Math.sin(Math.PI*u*2)**2;
    const fold=.018*betweenBows*Math.sin(v*Math.PI*10+u*5)*Math.sin(v*Math.PI);
    return [x0+u*length,Math.min(yTop,arch(v)-.060*betweenBows+fold),z0+v*width];
  },[length,width]);
  for(const side of [-1,1]){
    const z=side<0?z0:z1;
    patch('tarp',48,14,(u,v)=>{
      // Broad folds rise from the tie points, with smaller diagonal creases
      // between them. The perimeter stays on the original collision envelope.
      const tension=Math.sin(Math.PI*v),fold=(.040*Math.sin(u*Math.PI*12+v*1.1)+.018*Math.sin(u*Math.PI*24-v*4))*tension;
      const sag=.048*Math.sin(Math.PI*u*6)**2*Math.sin(Math.PI*v);
      return [x0+u*length,yBottom+v*(yEave-yBottom)-sag,z+side*fold];
    },[length,yEave-yBottom]);
    // Continuous hem and tie-down cords terminate at actual lower-side hooks.
    rod('tarp',[x0,yBottom,z],[x1,yBottom,z],.023,6);
    for(let k=0;k<7;k++){
      const x=x0+.22+k*(length-.44)/6;
      rod('rope',[x,yBottom+.07,z+side*.018],[x+.065,.99,z+side*.035],.009,5);
      rod('rope',[x+.065,.99,z+side*.035],[x+.11,yBottom+.07,z+side*.018],.009,5);
      box('steel_worn',[x+.065,1.005,z+side*.028],[.065,.04,.025]);
    }
    for(const x of [8.16,12.98])rod('steel_dark',[x,.63,z],[x,yEave-.015,z],.028,8);
  }
  // Cab bulkhead keeps the open bed from looking through the front canvas.
  patch('tarp',16,8,(u,v)=>[x0+.012,.813+v*(arch(u)-.813),z0+u*width],[width,2.03]);
  for(const x of [8.18,10.55,12.97])for(let k=0;k<12;k++){
    const a=k/12,b=(k+1)/12;
    rod('steel_worn',[x,arch(a)-.035,z0+a*width],[x,arch(b)-.035,z0+b*width],.018,5);
  }
  // Rear roll, hem and modest lamps give the rear opening a readable scale.
  rod('tarp',[12.99,2.39,z0+.08],[12.99,2.39,z1-.08],.069,12);
  for(const z of [z0+.16,z1-.16]){
    box('rubber',[13.052,.69,z],[.06,.15,.23]);
    box('paint_red',[13.086,.70,z],[.012,.09,.155]);
  }
  box('steel_worn',[13.15,.38,zCenter],[.11,.08,2.65]);
  // Pressed bed rails, tailgate hinges and boarding step break the native
  // featureless rear slab into manufactured, load-bearing parts.
  for(const z of [z0+.055,z1-.055]){
    box('steel_dark',[10.56,.87,z],[4.81,.065,.065]);
    for(const x of [8.35,9.82,11.3,12.78]){
      box('steel_dark',[x,.70,z],[.048,.28,.04]);
      for(const y of [.61,.79])rod('steel_galv',[x,y,z-.024],[x,y,z+.024],.013,6);
    }
  }
  for(const z of [zCenter-.92,zCenter+.92]){
    box('steel_dark',[13.03,.63,z],[.025,.20,.11]);
    rod('steel_worn',[13.055,.58,z-.09],[13.055,.58,z+.09],.027,10);
  }
  box('steel_dark',[13.18,.25,zCenter],[.20,.038,.64]);
  for(const z of [zCenter-.24,zCenter+.24]){
    box('steel_galv',[13.19,.34,z],[.045,.20,.055]);
    box('steel_galv',[13.12,.43,z],[.18,.045,.055]);
  }

  function finish(name){
    const sourceName=name==='body'?'hull_paint':name;
    const source=i.mats.get(sourceName,{interior:false}),mat=source.clone();
    mat.defines={...source.defines};
    const uniforms={};
    for(const [key,entry]of Object.entries(source.userData.sl))uniforms[key]=key==='uSlWet'?entry:{value:entry.value?.clone?entry.value.clone():entry.value};
    mat.userData={...source.userData,sl:uniforms,assaultTruckFinish:{version:2,source:sourceName}};
    mat.side=T.DoubleSide;
    // Original maps remain shared. Local scalar response separates coated
    // steel, oxidized hardware, woven canvas, road rubber and laminated glass.
    const settings={
      body:{color:0x3e5560,rough:.66,metal:0,normal:.045,uv:2.5},
      tarp:{color:0x626754,rough:1,metal:0,normal:.035,uv:3},
      steel_worn:{color:0x75817b,rough:.70,metal:.78,normal:.045,uv:4},
      steel_dark:{color:0x354247,rough:.82,metal:.72,normal:.12,uv:3},
      steel_galv:{rough:.70,metal:.92,normal:.08,uv:4},
      tire:{rough:.98,metal:0,normal:.24,uv:1},
      rubber:{rough:1.05,metal:0,normal:.20,uv:2},
      paint_white:{color:0xc7c6b8,rough:.30,metal:0,normal:.025,uv:3},
      glass:{rough:.24,metal:0,normal:.025,uv:1.5}
    }[name];
    if(settings){
      if(settings.color!==undefined)mat.color.setHex(settings.color);
      mat.roughness=settings.rough;mat.metalness=settings.metal;mat.normalScale.multiplyScalar(settings.normal);
      uniforms.uSlUv.value.x=uniforms.uSlUv.value.y=settings.uv;
      uniforms.uSlMacro.value.set(.025,.018,.65,.035);
      uniforms.uSlWetP.value.set(name==='tarp'?.20:.045,name==='tarp'?.95:.84,.35,0);
      mat.aoMapIntensity=.35;
    }
    if(name==='glass'){mat.transparent=true;mat.opacity=.55;mat.depthWrite=false;mat.forceSinglePass=true;mat.envMapIntensity=1.1;}
    const compile=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source);
    mat.onBeforeCompile=shader=>{
      compile(shader);Object.assign(shader.uniforms,uniforms);
      if(!settings)return;
      const anchor='slORM = texture2D(roughnessMap, slUv);';
      if(!shader.fragmentShader.includes(anchor))throw new Error('Truck material source anchor missing: '+name);
      let sample=`
        float truckLow=1.0-smoothstep(.30,1.16,vSlPos.y);
        float truckWheel=max(1.0-smoothstep(.35,1.35,abs(vSlPos.x-6.40)),1.0-smoothstep(.35,1.35,abs(vSlPos.x-11.8364)));
        float truckSoil=truckLow*(.18+.82*truckWheel);
      `;
      if(name==='body')sample+=`
        sampledDiffuseColor.rgb*=.035;
        sampledDiffuseColor.a=mix(.965,.995,sampledDiffuseColor.a);
        // Sun/rain exposure lightens upper paint, road spray dirties the sill;
        // a small rubbed patch is tied to the actual handle, not random rust.
        float truckUpperFade=smoothstep(.42,1.85,vSlPos.y);
        float truckHandleRub=1.0-smoothstep(.055,.23,length(vec2(vSlPos.x-7.70,(vSlPos.y-1.365)*1.6)));
        sampledDiffuseColor.a*=mix(.92,1.035,truckUpperFade)*(1.0-.075*truckHandleRub);
        slORM.g=mix(.62,.88,truckSoil);
      `;
      else if(name==='tarp')sample+=`
        sampledDiffuseColor.rgb*=.065;
        sampledDiffuseColor.a=mix(.91,.98,sampledDiffuseColor.a);
        float truckTieDistance=abs(fract((vSlPos.x-8.348)/.7394667+.5)-.5)*.7394667;
        float truckHem=(1.0-smoothstep(.025,.075,abs(vSlPos.y-1.2192)));
        float truckTape=(1.0-smoothstep(.012,.035,truckTieDistance))*(1.0-smoothstep(1.30,1.72,vSlPos.y));
        sampledDiffuseColor.a*=1.0-.07*max(truckHem,truckTape);
        slORM.g=mix(.90,slORM.g,.08);
      `;
      else if(name==='steel_worn'||name==='steel_dark')sample+=`
        sampledDiffuseColor.rgb*=.018;
        sampledDiffuseColor.a=mix(.94,.985,sampledDiffuseColor.a);
        slORM.g=mix(.72,.92,truckSoil);slORM.b=mix(.82,slORM.b,.12);
      `;
      else if(name==='steel_galv')sample+=`
        sampledDiffuseColor.rgb=mix(vec3(.32,.37,.38),sampledDiffuseColor.rgb,.10);
        slORM.g=mix(.64,slORM.g,.15);slORM.b=.94;
      `;
      else if(name==='tire')sample+=`
        sampledDiffuseColor.rgb=mix(vec3(.018,.020,.021),sampledDiffuseColor.rgb,.12);
        slORM.g=mix(.88,slORM.g,.12);
      `;
      else if(name==='rubber')sample+=`sampledDiffuseColor.rgb*=.06;sampledDiffuseColor.a=mix(.94,1.0,sampledDiffuseColor.a);slORM.g=.86;`;
      else if(name==='paint_white')sample+=`
        sampledDiffuseColor.rgb*=.012;
        sampledDiffuseColor.a=.97;
        // Subtle moulded lens fluting, with no emissive or added illumination.
        float truckLensFlute=.5+.5*cos(vSlPos.z*150.0);
        sampledDiffuseColor.a*=mix(.94,1.0,truckLensFlute);
        slORM.g=mix(.52,.65,truckLensFlute);slORM.b=0.0;
      `;
      else if(name==='glass')sample+=`
        sampledDiffuseColor.rgb=mix(vec3(.19,.25,.27),sampledDiffuseColor.rgb,.06);
        sampledDiffuseColor.a=.62;slORM.g=.66;slORM.b=0.0;
      `;
      shader.fragmentShader=shader.fragmentShader.replace(anchor,anchor+sample);
      if(name==='body'||name==='steel_dark'||name==='steel_worn'||name==='tire'){
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.070,.061,.046),truckSoil*${name==='tire'?'.23':'.17'});
        `);
      }
      const rough='roughnessFactor = clamp(roughnessFactor, 0.045, 1.0);';
      const floor=name==='glass'?'.14':name==='paint_white'?'.18':name==='tarp'?'.83':name==='tire'||name==='rubber'?'.78':name==='body'?'.45':'.48';
      shader.fragmentShader=shader.fragmentShader.replace(rough,rough+'\nroughnessFactor=max(roughnessFactor,'+floor+');');
    };
    mat.customProgramCacheKey=()=>key()+'|assault-truck-finish-2|'+name;
    return mat;
  }
  for(const [name,batch] of batches){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));g.computeBoundingSphere();
    const mat=finish(name);
    const mesh=new T.Mesh(g,mat);mesh.name='truck-'+name;mesh.castShadow=name!=='glass';mesh.receiveShadow=true;root.add(mesh);
  }
  return {root,hideFaceIds,hideTextures,stats:{triangles,meshes:batches.size,wheels:wheels.length,nativeTriangles,remappedFaces:nativeFinish.size,
    sourceEnvelope:{min:[5.6896,0,-10.418318],max:[13.208,2.8448,-6.2992]}}};
}
