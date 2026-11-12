/* Source-faithful cs_italy level. Native BSP triangles own traversal, cover,
 * impacts and navigation. Village finishing never replaces the collision plan. */
async function C1(i) {
  assaultPerformance(i);
  const T=i.THREE,map=window.__ITALY_MAP,V=a=>new T.Vector3(...a);
  if(!map?.surfaces?.length)throw new Error('Italy map geometry is missing');
  const root=new T.Group();root.name='italy';i.scene.add(root);
  const b=ob(i),materials=await italyMaterials(i,map);i.italyMaterials=materials;
  const recessPlan=i.params.italyMaterials==='source'
    ?{surfaces:map.surfaces,windows:[],stats:{windows:0,referenceMode:true}}
    :italyWindowRecessPlan(i,map);
  i.italyWindowRecesses=recessPlan;
  // Source ceiling footprints supply vertical interior regions. Thin clay-roof
  // eaves shade exterior walls but are not rooms; extruding their bounds down
  // produced false indoor lighting wedges on the diagonal CT façades.
  const interiorCeilings=map.faces.filter(f=>f.normal[1]<-.98&&f.area>1&&f.material!=='italy_roof');
  const interiorBoxes=interiorCeilings.map(f=>({
    min:V([f.bounds.min[0],f.center[1]-3.4,f.bounds.min[2]]),
    max:V([f.bounds.max[0],f.center[1]+.03,f.bounds.max[2]])
  }));
  const indoors=(x,y,z)=>interiorBoxes.some(q=>x>q.min.x&&x<q.max.x&&y>q.min.y&&y<q.max.y&&z>q.min.z&&z<q.max.z);
  // The market's solid fabric brush is visually rebuilt as sewn canvas. Its
  // original collision remains authoritative, including jumping onto its top.
  const replacedFaces=new Set(i.params.italyMaterials==='source'?[]:italyCanopyFaceIds());
  const replacementRanges=new Map();
  for(const face of map.faces)if(replacedFaces.has(face.id)){
    const key=face.modelId+':'+face.texture;
    if(!replacementRanges.has(key))replacementRanges.set(key,[]);
    replacementRanges.get(key).push([face.vertexStart,face.vertexStart+face.vertexCount]);
  }
  let meshCount=0,renderTriangles=0;
  function geometry(surfaces,parent){
    const batches=new Map();
    for(const s of surfaces){
      if(s.visible===false)continue;
      const excluded=replacementRanges.get(s.modelId+':'+s.texture)||[];
      for(let v=0;v<s.positions.length;v+=9){
        if(excluded.some(([start,end])=>v/3>=start&&v/3<end))continue;
        const p=s.positions,n=s.normals,x=(p[v]+p[v+3]+p[v+6])/3+n[v]*.06,y=(p[v+1]+p[v+4]+p[v+7])/3+n[v+1]*.06,z=(p[v+2]+p[v+5]+p[v+8])/3+n[v+2]*.06;
        // The recess plan partitions plain plaster away from window artwork.
        // Match adjoining physical plaster without erasing partial/source
        // windows; generated fragments retain the interpolated metre UVs.
        const inside=indoors(x,y,z),mat=materials.get(s.italyPlainFacade||s.material,{inside,texture:s.italyPlainFacade?'':s.texture,vertexColors:true});
        const key=mat.uuid+':'+Math.floor(x/24)+','+Math.floor(z/24);
        let batch=batches.get(key);if(!batch){batch={p:[],n:[],uv:[],c:[],irr:[],mat};batches.set(key,batch);}
        const sourceUV=mat.userData?.italySourceUV&&s.uvSource;
        for(let j=0;j<3;j++){
          const k=v+j*3,q=k/3*2;batch.p.push(p[k],p[k+1],p[k+2]);batch.n.push(n[k],n[k+1],n[k+2]);
          const uv=sourceUV||s.uvMeters;batch.uv.push(uv[q],uv[q+1]);
          // Native baked lighting supplies restrained static recess occlusion;
          // direct sun and physically based response remain real-time.
          const l=Math.max(s.vertexLight?.[k]??1,s.vertexLight?.[k+1]??1,s.vertexLight?.[k+2]??1);
          const occ=(inside?.54:.76)+(inside?.46:.24)*Math.sqrt(Math.min(1,l));batch.c.push(occ,occ,occ);
          // A restrained static diffuse bounce retains native tunnel lighting
          // gradients while the fixtures provide localized direct highlights.
          const irradiance=inside?.06+.20*Math.sqrt(Math.min(1,l)):0;batch.irr.push(irradiance,irradiance*.86,irradiance*.65);
        }
        renderTriangles++;
      }
    }
    for(const [name,batch] of batches){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(batch.c,3));g.setAttribute('italyIrradiance',new T.Float32BufferAttribute(batch.irr,3));g.computeBoundingSphere();
      const mesh=new T.Mesh(g,batch.mat);mesh.name='italy-bsp-'+name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);meshCount++;
    }
  }
  geometry(recessPlan.surfaces,root);
  function collision(record,surface){
    const p=new Float32Array(record.positions);
    // Source extractor groups contiguous triangles by acoustic/impact surface;
    // retain its original insertion order, including coplanar raycast ties.
    for(const run of record.ranges||[{start:0,count:p.length/3,surface}]){
      i.physics.addTriangles(p,Uint32Array.from({length:run.count},(_,n)=>run.start+n),run.surface);
    }
  }
  collision(map.collision,'concrete');
  const destructibles=[];
  for(const data of map.breakables){
    const object=new T.Group();object.name=data.id;geometry(data.surfaces,object);root.add(object);
    if(data.triggerOnly){
      // Stock Italy marks its bombsite crates as trigger-only breakables. Keep
      // their exact sloped/rotated collision; bullets do not erase source cover.
      collision(data.collision,'wood');
    }else{
      const box=i.physics.addBox(data.bounds.min,data.bounds.max,{surface:data.kind==='glass'?'glass':'wood',tag:data.id,noNav:true});
      destructibles.push({data,object,box,hp:data.health,dead:false});
    }
  }
  i.events.on('impact',hit=>{
    if(hit?.from!=='player'||!hit.point)return;
    for(const item of destructibles){
      if(item.dead)continue;const p=hit.point,mn=item.data.bounds.min,mx=item.data.bounds.max;
      if(p.x<mn[0]-.06||p.x>mx[0]+.06||p.y<mn[1]-.06||p.y>mx[1]+.06||p.z<mn[2]-.06||p.z>mx[2]+.06)continue;
      item.hp-=28;if(item.hp<=0){item.dead=true;item.object.visible=false;i.physics.removeBox(item.box);item.box=null;dressing?.breakTarget?.(item.data.properties.target);}break;
    }
  });
  const dressing=italyDress(i,b,map);if(dressing?.root)root.add(dressing.root);
  const interiorFinish=italyInteriorFinish(i,map,root);
  const relayDefs=[
    {id:'relay_a',label:'A · Mercato',zone:'yard',pos:[23.8,-3.8608,3],yaw:Math.PI/2},
    {id:'relay_b',label:'B · Appartamenti',zone:'warehouse',pos:[-26,.2032,-29],yaw:0},
    {id:'relay_c',label:'C · Casa alta',zone:'warehouse',pos:[21.1328,3.2512,-59.3344],yaw:Math.PI}
  ];
  const objectives=relayDefs.map((r,n)=>({
    ...r,pos:V(r.pos),object:b.place('relay_node',r.pos[0],r.pos[2],r.yaw,{seed:n+1,id:'ABC'[n]},r.pos[1],{dynamic:true,noCol:true})
  }));
  root.add(b.staticRoot,b.dynRoot);
  const start={pos:V([-19.5072,-6.096,47.1424]),yaw:-.017453};
  const extraction={pos:V([-17.4752,-6.096,50.8]),radius:2.8};
  const rescueMat=new T.MeshBasicMaterial({color:0xc6ded1,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});
  const ring=new T.Mesh(new T.RingGeometry(2.55,2.65,64),rescueMat);ring.rotation.x=-Math.PI/2;ring.position.copy(extraction.pos).y+=.025;root.add(ring);
  b.label('EXTRACTION',.26,extraction.pos.x,extraction.pos.y+.035,extraction.pos.z,'y+',{color:'white',distress:.26});
  // Original robot families, weapon and mission lifecycle are kept intact.
  const spawnCandidates=[
    [18,-3.8608,10],[24,-3.8608,6],[5,-3.8608,12],[-8,-3.8608,4],
    [-27,.2032,-27],[-14,0,-16],[-21,0,-33],[6,0,-49],[11,0,-54],
    [22,0,-60],[21,3.2512,-56],[8,0,-34]
  ];
  const lighting=italyLighting(i,map,root,objectives.map(o=>({id:o.id+'-status',pos:[o.pos.x,o.pos.y+1.8,o.pos.z]})));
  lighting.stats.contactAO={kind:'half-resolution depth contact approximation',biasMetres:.008,depthBiasPerMetre:.001,depthBiasCapMetres:12,radius:i.render.tune.aoRadius,intensity:i.render.tune.aoIntensity,strength:i.render.tune.aoStrength};
  i.physics.build();
  const startY=i.physics.groundHeight(start.pos.x,start.pos.z,start.pos.y+.2);if(!Number.isFinite(startY)||Math.abs(startY-start.pos.y)>.2)throw new Error('Italy start has no source floor');start.pos.y=startY;
  const spawnRejections=[],enemySpawns=[];
  for(const candidate of spawnCandidates){
    const nav=i.physics.assaultDebug.nearestNav(...candidate);
    if(!nav||Math.hypot(nav.x-candidate[0],nav.z-candidate[2])>2.2||Math.abs(nav.y-candidate[1])>1.1){spawnRejections.push(candidate);continue;}
    const pos=V([nav.x,nav.y,nav.z]);
    if(!i.physics.nav.findPath(start.pos,pos)){spawnRejections.push(candidate);continue;}
    enemySpawns.push({pos,zone:indoors(pos.x,pos.y+1,pos.z)?'warehouse':'yard',type:'ground'});
  }
  if(enemySpawns.length<6)throw new Error('Italy encounter has too few reachable enemy spawns: '+enemySpawns.length);
  const groundSpawnCount=enemySpawns.length;
  // The shared mission chooses type:'air' before applying its spawn jitter.
  // Explicit exterior points keep patrol drones out of the solid tunnel roofs.
  // Runtime checks below reject source geometry and insufficient air clearance.
  const airCandidates=[[20,.5,6],[8,.5,12],[-12,.5,-18],[7,4,-49]],airSpawnRejections=[];
  const airSpawnPositions=airCandidates.filter(position=>{
    for(const dx of [-1.2,0,1.2])for(const dz of [-1.2,0,1.2]){
      if(!i.physics.canStand(V([position[0]+dx,position[1]-.65,position[2]+dz]),1.3,.65)){
        airSpawnRejections.push(position);return false;
      }
    }
    return true;
  });
  if(!airSpawnPositions.length)throw new Error('Italy has no unobstructed air patrol positions');
  for(const position of airSpawnPositions)enemySpawns.push({pos:V(position),zone:'yard',type:'air'});
  const objectiveChecks=objectives.map(o=>{
    const floor=i.physics.groundHeight(o.pos.x,o.pos.z,o.pos.y+.1),path=i.physics.nav.findPath(start.pos,o.pos);
    if(Math.abs(floor-o.pos.y)>.15||!path)throw new Error('Italy objective is not reachable: '+o.id);
    return {id:o.id,floor,pathNodes:path.length};
  });
  const coverPoints=enemySpawns.filter(s=>s.type==='ground').map(s=>s.pos.clone());
  const cinematicPath=[
    {pos:[-19.5,-4.42,44],look:[-19,-3.5,27]},
    {pos:[17,-2.384,3],look:[13,-2.8,7.6]},
    {pos:[-26,1.8832,-32],look:[-26,1.2,-28.5]},
    {pos:[6.9088,1.68,-55.0672],look:[20,3,-58]},
    {pos:[23.4,4.9312,-55],look:[21,4.5,-60]}
  ];
  const shotChecks=cinematicPath.map((shot,n)=>{
    const feet=V([shot.pos[0],shot.pos[1]-1.68,shot.pos[2]]),floor=i.physics.groundHeight(feet.x,feet.z,feet.y+.08);
    const standing=i.physics.canStand(feet),path=i.physics.nav.findPath(start.pos,feet);
    if(!standing||!path||Math.abs(floor-feet.y)>.08)throw new Error('Italy capture is outside playable floor: '+n);
    return {index:n,feet:feet.toArray(),floor,standing,pathNodes:path.length};
  });
  function reset(){
    dressing?.reset?.();
    for(const item of destructibles){item.hp=item.data.health;item.dead=false;item.object.visible=true;if(!item.box)item.box=i.physics.addBox(item.data.bounds.min,item.data.bounds.max,{surface:item.data.kind==='glass'?'glass':'wood',tag:item.data.id,noNav:true});}
  }
  const level={root,playerStart:start,objectives,extraction,enemySpawns,coverPoints,interiorBoxes,cinematicPath,
    zones:[{name:'yard',min:[map.bounds.min[0],map.bounds.min[2]],max:[map.bounds.max[0],map.bounds.max[2]]},{name:'warehouse',min:[-42,-66],max:[30,-14]}],
    skylights:[],shedLights:lighting.lamps,vantage:{stairsFoot:V([18,0,-52]),roof:V([21,3.2512,-56])},placed:b.placed,
    stats:{tris:renderTriangles,meshes:meshCount,props:b.placed.length,doors:0,breakables:destructibles.length,sourceBreakables:map.breakables.length,dressing:dressing?.stats,interiorFinish:interiorFinish.stats,windowRecesses:recessPlan.stats,materials:materials.stats,lighting:lighting.stats},
    groundSurfaceAt(){return 'concrete';},reset,
    update(dt){b.updaters.forEach(fn=>fn(dt));dressing?.update?.(dt);lighting.update?.(dt);i.render.post.wet=0;},
    diagnostics(){return {map:map.source,lighting:lighting.stats,materials:materials.stats,interiorFinish:interiorFinish.stats,windowRecesses:recessPlan.stats,sourceGeometry:{renderTriangles,meshes:meshCount,replacedCanopyFaces:replacedFaces.size},objectiveChecks,shotChecks,spawnCount:enemySpawns.length,groundSpawnCount,airSpawnCount:airSpawnPositions.length,spawnRejections,airSpawnRejections,nav:i.physics.assaultDebug.stats()};}
  };
  window.__italy={version:1,shots:Object.fromEntries(['ct_approach','market','apartments','house_exterior','house_interior'].map((name,n)=>[name,[...cinematicPath[n].pos,...cinematicPath[n].look]])),diagnostics:()=>level.diagnostics()};
  return level;
}
