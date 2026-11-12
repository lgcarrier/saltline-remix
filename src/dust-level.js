/* Source-faithful de_dust level. Native BSP triangles own traversal, cover,
 * impacts and navigation. Desert finishing never replaces the collision plan. */
async function C1(i) {
  assaultPerformance(i);
  const T=i.THREE,map=window.__DUST_MAP,V=a=>new T.Vector3(...a);
  if(!map?.surfaces?.length)throw new Error('Dust map geometry is missing');
  const root=new T.Group();root.name='dust';i.scene.add(root);
  const b=ob(i),materials=await dustMaterials(i,map);i.dustMaterials=materials;
  const interiorBoxes=[
    {min:V([-6.6,.1,-52.1]),max:V([6.6,4.88,-29.1])},
    {min:V([-19.6,.1,-38.3]),max:V([32.6,4.88,-29.1])},
    {min:V([-32.6,-4.9,-58.0]),max:V([-22.6,-.8,-33.2])},
    {min:V([-21.4,0,17.7]),max:V([-16.1,4.1,23.7])}
  ];
  const indoors=(x,y,z)=>interiorBoxes.some(q=>x>q.min.x&&x<q.max.x&&y>q.min.y&&y<q.max.y&&z>q.min.z&&z<q.max.z);
  let meshCount=0,renderTriangles=0;
  function geometry(surfaces,parent){
    const batches=new Map();
    for(const s of surfaces){
      for(let v=0;v<s.positions.length;v+=9){
        const p=s.positions,n=s.normals,x=(p[v]+p[v+3]+p[v+6])/3+n[v]*.06,y=(p[v+1]+p[v+4]+p[v+7])/3+n[v+1]*.06,z=(p[v+2]+p[v+5]+p[v+8])/3+n[v+2]*.06;
        const inside=indoors(x,y,z),mat=materials.get(s.material,{inside,texture:s.texture,vertexColors:true});
        const key=mat.uuid+':'+Math.floor(x/24)+','+Math.floor(z/24);
        let batch=batches.get(key);if(!batch){batch={p:[],n:[],uv:[],c:[],irr:[],mat};batches.set(key,batch);}
        const sourceUV=mat.userData?.dustSourceUV&&s.uvSource;
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
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(batch.c,3));g.setAttribute('dustIrradiance',new T.Float32BufferAttribute(batch.irr,3));g.computeBoundingSphere();
      const mesh=new T.Mesh(g,batch.mat);mesh.name='dust-bsp-'+name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);meshCount++;
    }
  }
  geometry(map.surfaces,root);
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
      // Stock Dust marks its bombsite crates as trigger-only breakables. Keep
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
      item.hp-=28;if(item.hp<=0){item.dead=true;item.object.visible=false;i.physics.removeBox(item.box);item.box=null;}break;
    }
  });
  const dressing=dustDress(i,b,map);if(dressing?.root)root.add(dressing.root);
  const relayDefs=[
    {id:'relay_a',label:'A · CT courtyard',zone:'yard',pos:[8.5012,1.6256,44.8888],yaw:Math.PI},
    {id:'relay_b',label:'B · Eastern courtyard',zone:'yard',pos:[49.8912,0,-16.6328],yaw:Math.PI/2},
    {id:'relay_c',label:'C · Underpass',zone:'warehouse',pos:[-26.5,-4.8768,-38],yaw:0}
  ];
  const objectives=relayDefs.map((r,n)=>({
    ...r,pos:V(r.pos),object:b.place('relay_node',r.pos[0],r.pos[2],r.yaw,{seed:n+1,id:'ABC'[n]},r.pos[1],{dynamic:true,noCol:true})
  }));
  root.add(b.staticRoot,b.dynRoot);
  const start={pos:V([36.9824,-3.2512,-86.5632]),yaw:Math.PI/2};
  const extraction={pos:V([41.1,-3.2512,-85.6]),radius:2.8};
  const rescueMat=new T.MeshBasicMaterial({color:0xc6ded1,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});
  const ring=new T.Mesh(new T.RingGeometry(2.55,2.65,64),rescueMat);ring.rotation.x=-Math.PI/2;ring.position.copy(extraction.pos).y+=.025;root.add(ring);
  b.label('EXTRACTION',.26,extraction.pos.x,extraction.pos.y+.035,extraction.pos.z,'y+',{color:'white',distress:.26});
  // Original robot families, weapon and mission lifecycle are kept intact.
  const spawnCandidates=[
    [-13,1.6256,40],[8,1.6256,42],[38,0,-15.6],[5.1,0,8.4],[9.6,0,-14.1],
    [15.6,.8128,-26.9],[5.533,.8128,-35.65],[2.467,.8128,-48.35],
    [11.9,0,-56.9],[-28,-4.8768,-25],[-26,-4.0072,-62]
  ];
  const lighting=dustLighting(i,map,root);
  i.physics.build();
  const startY=i.physics.groundHeight(start.pos.x,start.pos.z,start.pos.y+.2);if(!Number.isFinite(startY)||Math.abs(startY-start.pos.y)>.2)throw new Error('Dust start has no source floor');start.pos.y=startY;
  const spawnRejections=[],enemySpawns=[];
  for(const candidate of spawnCandidates){
    const nav=i.physics.assaultDebug.nearestNav(...candidate);
    if(!nav||Math.hypot(nav.x-candidate[0],nav.z-candidate[2])>2.2||Math.abs(nav.y-candidate[1])>1.1){spawnRejections.push(candidate);continue;}
    const pos=V([nav.x,nav.y,nav.z]);
    if(!i.physics.nav.findPath(start.pos,pos)){spawnRejections.push(candidate);continue;}
    enemySpawns.push({pos,zone:indoors(pos.x,pos.y+1,pos.z)?'warehouse':'yard',type:'ground'});
  }
  if(enemySpawns.length<6)throw new Error('Dust encounter has too few reachable enemy spawns: '+enemySpawns.length);
  const groundSpawnCount=enemySpawns.length;
  // The shared mission chooses type:'air' before applying its spawn jitter.
  // Explicit exterior points keep patrol drones out of the solid tunnel roofs.
  // Each point was checked at all nine +/-1.2m jitter offsets with a .65m hull.
  const airSpawnPositions=[[-13,5,40],[8,5,42],[49.9,4,-16.63],[38,4,-15.6],[5.1,4,8.4]];
  for(const position of airSpawnPositions)enemySpawns.push({pos:V(position),zone:'yard',type:'air'});
  const objectiveChecks=objectives.map(o=>{
    const floor=i.physics.groundHeight(o.pos.x,o.pos.z,o.pos.y+.1),path=i.physics.nav.findPath(start.pos,o.pos);
    if(Math.abs(floor-o.pos.y)>.15||!path)throw new Error('Dust objective is not reachable: '+o.id);
    return {id:o.id,floor,pathNodes:path.length};
  });
  const coverPoints=enemySpawns.filter(s=>s.type==='ground').map(s=>s.pos.clone());
  const cinematicPath=[
    {pos:[29,-1.55,-86.6],look:[4,1.8,-86]},
    {pos:[-26,-3.2,-26],look:[-26,-2,-52]},
    {pos:[.2,2.5,-45],look:[1,2.2,-31]},
    {pos:[33,1.68,-16],look:[49,2,-16]},
    {pos:[1,3.3,35],look:[12,3.2,44]}
  ];
  function reset(){
    for(const item of destructibles){item.hp=item.data.health;item.dead=false;item.object.visible=true;if(!item.box)item.box=i.physics.addBox(item.data.bounds.min,item.data.bounds.max,{surface:item.data.kind==='glass'?'glass':'wood',tag:item.data.id,noNav:true});}
  }
  const level={root,playerStart:start,objectives,extraction,enemySpawns,coverPoints,interiorBoxes,cinematicPath,
    zones:[{name:'yard',min:[map.bounds.min[0],map.bounds.min[2]],max:[map.bounds.max[0],map.bounds.max[2]]},{name:'warehouse',min:[-33,-59],max:[33,-29]}],
    skylights:[],shedLights:lighting.lamps,vantage:{stairsFoot:V([2,0,19]),roof:V([2,1.6256,34])},placed:b.placed,
    stats:{tris:renderTriangles,meshes:meshCount,props:b.placed.length,doors:0,breakables:destructibles.length,sourceCrates:map.breakables.length,dressing:dressing?.stats,materials:materials.stats,lighting:lighting.stats},
    groundSurfaceAt(){return 'concrete';},reset,
    update(dt){b.updaters.forEach(fn=>fn(dt));dressing?.update?.(dt);i.render.post.wet=0;},
    diagnostics(){return {map:map.source,lighting:lighting.stats,materials:materials.stats,sourceGeometry:{renderTriangles,meshes:meshCount},objectiveChecks,spawnCount:enemySpawns.length,groundSpawnCount,airSpawnCount:airSpawnPositions.length,spawnRejections,nav:i.physics.nav?.stats};}
  };
  window.__dust={version:1,shots:Object.fromEntries(['t_spawn','underpass','tunnel','site_b','site_a'].map((name,n)=>[name,[...cinematicPath[n].pos,...cinematicPath[n].look]])),diagnostics:()=>level.diagnostics()};
  return level;
}
