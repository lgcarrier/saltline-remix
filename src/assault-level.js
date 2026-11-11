// Assault scene integration. All surfaces and coordinates come from the supplied BSP.
async function C1(i) {
  assaultPerformance(i);
  const T = i.THREE, map = window.__ASSAULT_MAP;
  if (!map) throw new Error('Assault scene data missing');
  const root = new T.Group(); root.name = 'assault'; i.scene.add(root);
  const vehicle=assaultVehicle(i,map);root.add(vehicle.root);
  const sourceFaces=new Map(map.faces.map(f=>[f.id,f]));
  // Every designated cargo assembly keeps its native collision/cover envelope;
  // original Saltline containers replace all source faces, including the hall's
  // wooden base and painted upper brushes as one complete stack.
  const cargoFaces=new Set(assaultCargoStacks(map).flatMap(s=>s.faces.map(f=>f.id)));
  const V = a => new T.Vector3(...a);
  const b = ob(i), dynamic = [], broken = [];
  const interiorBoxes = [
    {min:V([-17.75,.1,-73.3]),max:V([17.75,12.9,-40.85])},
    {min:V([-29.1,8.5,-73.3]),max:V([-17.5,12.65,-56.8])},
    {min:V([-.8,10.7,-70.2]),max:V([.8,14.4,-54.8])}
  ];
  const indoors = (x,y,z) => interiorBoxes.some(q=>x>q.min.x&&x<q.max.x&&y>q.min.y&&y<q.max.y&&z>q.min.z&&z<q.max.z);
  const surfaceKind = m => /wood|crate/.test(m)?'wood':/steel|metal|paint|hull|chain/.test(m)?'metal':/tire/.test(m)?'rubber':/glass/.test(m)?'glass':'concrete';
  const pavement=[];
  const material=(name,inside,transparent=false)=>assaultMaterial(i,name,inside,transparent);
  function geometry(surfaces, parent, options={}) {
    const batches=new Map();
    for(const s of surfaces) {
      if(/^\{(ladder|rail|tension|razor)/i.test(s.texture))continue;
      if(vehicle.hideTextures.has(s.texture))continue;
      const hiddenRanges=s.faceIds.filter(id=>vehicle.hideFaceIds.has(id)||cargoFaces.has(id)).map(id=>sourceFaces.get(id)).filter(Boolean);
      for(let v=0;v<s.positions.length;v+=9) {
        if(hiddenRanges.some(f=>v/3>=f.vertexStart&&v/3<f.vertexStart+f.vertexCount))continue;
        const p=s.positions, n=s.normals;
        const x=(p[v]+p[v+3]+p[v+6])/3+n[v]*.12, y=(p[v+1]+p[v+4]+p[v+7])/3+n[v+1]*.12, z=(p[v+2]+p[v+5]+p[v+8])/3+n[v+2]*.12;
        const inside=!(s.material==='corrugated_roof'&&n[v+1]>.1)&&indoors(x,y,z), region=Math.floor(x/24)+','+Math.floor(z/24);
        if(s.material==='asphalt'&&n[v+1]>.99&&Math.abs(y-.12)<.16&&!inside){pavement.push(...p.slice(v,v+9));continue;}
        const key=s.material+':'+inside+':'+region;
        let a=batches.get(key);
        if(!a){a={p:[],n:[],uv:[],color:[],mat:material(s.material,inside,options.glass)};batches.set(key,a);}
        for(let j=0;j<3;j++){
          const k=v+j*3, uv=k/3*2;
          a.p.push(p[k],p[k+1],p[k+2]);a.n.push(n[k],n[k+1],n[k+2]);
          // Wall cladding uses vertical ribs; roofing ribs follow its slope.
          if(s.material==='corrugated_roof'&&Math.abs(n[k+1])<.25)a.uv.push(s.uvMeters[uv+1],s.uvMeters[uv]);
          // Broad cast panels use a four-metre repeat; original brick remains
          // at its physically correct 225 x 75 mm course dimensions.
          else if(/^concrete/.test(s.material)&&Math.abs(n[k+1])<.25)a.uv.push(s.uvMeters[uv]*.75,s.uvMeters[uv+1]*.75);
          else a.uv.push(s.uvMeters[uv],s.uvMeters[uv+1]);
          // BSP light sample supplies restrained occlusion, not a second colored sun.
          const l=s.vertexLight?.[k]??1, g=s.vertexLight?.[k+1]??1, q=s.vertexLight?.[k+2]??1;
          const occ=.72+.28*Math.min(1,Math.sqrt(Math.max(l,g,q)));
          a.color.push(occ,occ,occ);
        }
      }
    }
    for(const [key,a] of batches){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(a.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(a.color,3));g.computeBoundingSphere();
      const mesh=new T.Mesh(g,a.mat);mesh.name=key;mesh.castShadow=!options.glass;mesh.receiveShadow=true;parent.add(mesh);
    }
    return batches.size;
  }
  const worldMeshes=geometry(map.surfaces,root);
  const pavementGeometry=new T.BufferGeometry();pavementGeometry.setAttribute('position',new T.Float32BufferAttribute(pavement,3));pavementGeometry.computeVertexNormals();pavementGeometry.computeBoundingSphere();
  const positions=new Float32Array(map.collision.positions);
  // Preserve every native collision vertex. Match only the designated cargo's
  // source triangles so impacts and top-surface footsteps agree with the new
  // metal cover; neighbouring crates, floors and walls keep their prior surface.
  const triangleKey=(p,k)=>[0,3,6].map(j=>[p[k+j],p[k+j+1],p[k+j+2]].map(v=>v.toFixed(4)).join(',')).sort().join('|');
  const cargoTriangles=new Set();
  for(const s of map.surfaces)for(const id of s.faceIds){
    if(!cargoFaces.has(id))continue;
    const face=sourceFaces.get(id);
    for(let v=face.vertexStart;v<face.vertexStart+face.vertexCount;v+=3)cargoTriangles.add(triangleKey(s.positions,v*3));
  }
  const collisionRuns=[];
  for(let k=0;k<positions.length;k+=9){
    const surface=cargoTriangles.has(triangleKey(positions,k))?'metal':'concrete';
    let run=collisionRuns[collisionRuns.length-1];
    if(!run||run.surface!==surface){run={surface,indices:[]};collisionRuns.push(run);}
    run.indices.push(k/3,k/3+1,k/3+2);
  }
  // Contiguous runs retain the original triangle insertion order, including
  // coplanar ray/nav tie behaviour.
  for(const run of collisionRuns)i.physics.addTriangles(positions,Uint32Array.from(run.indices),run.surface);
  for(const l of map.ladders){
    const mn=l.bounds.min.slice(),mx=l.bounds.max.slice();mn[0]-=.42;mx[0]+=.42;mn[2]-=.42;mx[2]+=.42;
    i.physics.addLadder(mn,mx);
  }
  const boxFor = d => i.physics.addBox(d.bounds.min,d.bounds.max,{surface:d.kind==='glass'?'glass':'metal',tag:'assault-'+d.id,noNav:true});
  for(const d of map.doors){
    const obj=new T.Group();obj.name=d.id;geometry(d.surfaces,obj);
    if(d.motion.kind==='rotate'){
      for(const child of obj.children)child.geometry.translate(-d.origin[0],-d.origin[1],-d.origin[2]);
      obj.position.copy(V(d.origin));
    }
    root.add(obj);dynamic.push({data:d,obj,t:0,hold:0,box:boxFor(d),center:V(d.bounds.min).add(V(d.bounds.max)).multiplyScalar(.5)});
  }
  for(const d of map.breakables){
    const obj=new T.Group();obj.name=d.id;geometry(d.surfaces,obj,{glass:d.kind==='glass'});root.add(obj);
    broken.push({data:d,obj,hp:d.health,box:boxFor(d),dead:false});
  }
  i.events.on('impact',hit=>{
    if(hit?.from!=='player'||!hit.point)return;
    for(const a of broken){if(a.dead)continue;const mn=a.data.bounds.min,mx=a.data.bounds.max,p=hit.point;
      if(p.x<mn[0]-.07||p.x>mx[0]+.07||p.y<mn[1]-.07||p.y>mx[1]+.07||p.z<mn[2]-.07||p.z>mx[2]+.07)continue;
      a.hp-=28;
      if(a.hp<=0){a.dead=true;a.obj.visible=false;i.physics.removeBox(a.box);a.box=null;i.events.emit('assault:break',{id:a.data.id,pos:p.clone()});}
      break;
    }
  });
  // Restore destructible state on every actual mission restart.
  function reset(){
    ladderLatch=null;activeLadder=null;ladderCooldown=0;
    for(const a of broken){a.hp=a.data.health;a.dead=false;a.obj.visible=true;if(!a.box)a.box=boxFor(a.data);}
    for(const a of dynamic){a.t=0;a.hold=0;a.obj.rotation.y=0;a.obj.position.copy(a.data.motion.kind==='rotate'?V(a.data.origin):V([0,0,0]));if(!a.box)a.box=boxFor(a.data);}
  }
  const dressing=assaultDress(i,b,map);
  if(dressing?.root)root.add(dressing.root);
  const office=assaultOffice(i,map);root.add(office.root);
  const architecture=assaultArchitecture(i,map);root.add(architecture.root);
  // Original relay assets use their original state/animation contract.
  const relayDefs=[
    {id:'relay_a',label:'A · Loading hall',zone:'warehouse',pos:[0,0,-52],yaw:0},
    {id:'relay_b',label:'B · Operations office',zone:'warehouse',pos:[-26,8.5344,-65.8368],yaw:0},
    {id:'relay_c',label:'C · Roof uplink',zone:'roof',pos:[10,13.0048,-49],yaw:0}
  ];
  const objectives=relayDefs.map((r,n)=>{
    const object=b.place('relay_node',r.pos[0],r.pos[2],r.yaw,{seed:n+1,id:'ABC'[n]},r.pos[1],{dynamic:true,noCol:true});
    return {...r,pos:V(r.pos),object};
  });
  root.add(b.staticRoot,b.dynRoot);
  const start={pos:V([16.256,0,-4.064]),yaw:0};
  const extraction={pos:V([-8.1,0,-4.8]),radius:3.8};
  // Rescue marking is deliberately a small, visible perimeter at the CT approach.
  const rescueMat=new T.MeshBasicMaterial({color:0xc8bd92,transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide});
  const ring=new T.Mesh(new T.RingGeometry(3.6,3.75,64),rescueMat);ring.rotation.x=-Math.PI/2;ring.position.copy(extraction.pos).y=.035;root.add(ring);
  b.label('RESCUE  /  01',.33,-8.1,.045,-4.8,'y+',{color:'white',distress:.32});
  const enemySpawns=[
    [-13.4,3.2512,-64.6],[-4,3.2512,-64],[9,.8128,-59],[-10,0,-46],[-13.5,8.5344,-62.5],[-26,8.5344,-62],
    [20,0,-48],[-23,0,-50],[-25,0,-28],[0,0,-17],[12,0,-21],[-10,0,-34.8]
  ].map(p=>({pos:V(p),zone:p[1]>3?'warehouse':'yard',type:'ground'}));
  const coverPoints=[[-12,3.25,-51],[5,3.25,-60],[-26,8.53,-68],[-8,0,-20],[16,0,-32]].map(V);
  const lighting=assaultLighting(i,map,root),lamps=lighting.lamps;
  // Tune the existing Saltline render chain, preserving its sky, probes and HDR post.
  Object.assign(i.render.tune,{volSigma:.002,volInteriorDust:2.2,volFarHaze:.24,grain:.009,ca:.00045,bloom:.045,vignette:.22,lookSat:1.05,lookPower:1.09,aoRadius:.55,aoIntensity:.8,aoStrength:.72});
  if(i.params.wet===undefined)i.mats.uniforms.wet.value=.48;
  i.physics.build();
  for(const spawn of enemySpawns){const n=i.physics.assaultDebug.nearestNav(spawn.pos.x,spawn.pos.y,spawn.pos.z);if(n&&Math.hypot(n.x-spawn.pos.x,n.z-spawn.pos.z)<3)spawn.pos.set(n.x,n.y,n.z);}
  const floorAt=(x,z,h=30)=>i.physics.groundHeight(x,z,h);
  const startY=floorAt(start.pos.x,start.pos.z,1.5);if(Number.isFinite(startY))start.pos.y=startY;
  const cinematicPath=[
    {pos:[-8,1.9,-26],look:[0,6,-43]},
    {pos:[-11,1.8,-44],look:[0,5,-64]},
    {pos:[18,15,-42],look:[-5,11,-55]},
    {pos:[-24,10.1,-63],look:[-26,10,-66]}
  ];
  let activeLadder=null, ladderLatch=null, ladderCooldown=0;
  // Latch the player outside the ladder's thin face. The normal controller still
  // handles input, but cannot carry the player straight through the climb volume.
  function updateLadder(p,dt){
    ladderCooldown=Math.max(0,ladderCooldown-dt);activeLadder=null;
    const move=i.input?.move||{x:0,y:0},radius=.32,height=p.crouching?1.15:1.8;
    const detach=()=>{ladderLatch=null;ladderCooldown=.3;};
    if(ladderLatch){
      const a=ladderLatch,L=a.L;
      // Reset/teleport, strafing and jumping all relinquish the ladder.
      if(Math.abs(p.pos[a.axis]-a.anchor)>1.2||Math.abs(p.pos.y-a.y)>2||p.pos[a.tangent]<L.min[a.tangent]||p.pos[a.tangent]>L.max[a.tangent]||Math.abs(move.x)>.25||i.input?.pressed?.('jump')){
        if(i.input?.pressed?.('jump'))p.vel.y=Math.max(p.vel.y,Math.sqrt(42));
        detach();return;
      }
    }
    if(!ladderLatch&&ladderCooldown<=0&&Math.abs(move.y)>.1&&Math.abs(move.x)<.25){
      for(let index=0;index<i.physics.ladders.length;index++){
        const L=i.physics.ladders[index],q=p.pos;
        if(q.x<L.min.x||q.x>L.max.x||q.z<L.min.z||q.z>L.max.z||q.y+1<L.min.y||q.y>L.max.y+.75)continue;
        const raw=map.ladders[index].bounds,axis=raw.max[0]-raw.min[0]<raw.max[2]-raw.min[2]?'x':'z',n=axis==='x'?0:2,tangent=axis==='x'?'z':'x';
        const center=(raw.min[n]+raw.max[n])*.5,side=Math.sign(q[axis]-center)||1;
        const anchor=(side<0?raw.min[n]:raw.max[n])+side*(radius+.035);
        // At a top landing, walking away from the edge must not relatch.
        const toward=-side*(p.forward?.[axis]||0)*move.y;
        if(toward<.15&&Math.abs(p.pitch)<.45)continue;
        const candidates=[-1,1].map(sign=>{
          const at=q.clone();at[axis]=(sign<0?raw.min[n]:raw.max[n])+sign*(radius+.24);
          const floor=i.physics.groundHeight(at.x,at.z,L.max.y+.7);
          return {sign,floor,score:Math.abs(floor-L.max.y)};
        }).filter(c=>c.floor>=L.max.y-.65&&c.floor<=L.max.y+.7).sort((a,b)=>a.score-b.score);
        const top=candidates[0]||{sign:-side,floor:L.max.y};
        const descending=(p.pitch<-.18?-1:1)*move.y<-.1,atTop=q.y>=L.max.y-.12;
        ladderLatch={L,axis,tangent,anchor:descending&&atTop?q[axis]:anchor,side,y:q.y,phase:descending&&atTop?'mount':'climb',topSign:top.sign,topFloor:top.floor,raw,n};
        break;
      }
    }
    if(!ladderLatch)return;
    const a=ladderLatch,L=a.L,dir=(p.pitch<-.18?-1:1)*move.y;
    p.pos[a.axis]=a.anchor;p.pos.y=a.y;
    p.vel[a.axis]=0;p.vel.y=0;
    // A generous grab volume must not leave the body standing on the side rim
    // of a narrow duct. Center the capsule within the actual ladder width;
    // explicit strafe input above still releases the grip immediately.
    const tangentIndex=a.tangent==='x'?0:2,low=a.raw.min[tangentIndex]+radius+.025,high=a.raw.max[tangentIndex]-radius-.025;
    const centered=low<=high?T.MathUtils.clamp(p.pos[a.tangent],low,high):(low+high)*.5;
    if(Math.abs(centered-p.pos[a.tangent])>.002){
      const velocity=V([0,0,0]);velocity[a.tangent]=T.MathUtils.clamp((centered-p.pos[a.tangent])/dt,-2,2);
      i.physics.moveCapsule(p.pos,velocity,dt,radius,height,false);
      a.anchor=p.pos[a.axis];a.y=p.pos.y;
    }
    if(a.phase==='exit'&&dir<-.1)a.phase='mount';
    if(a.phase==='mount'){
      // Descending from a landing first crosses the edge at its real height;
      // lowering directly would collide with the floor beneath the player.
      if(dir<-.1){
        const side=-a.topSign,target=(side<0?a.raw.min[a.n]:a.raw.max[a.n])+side*(radius+.035);
        const velocity=V([0,0,0]);velocity[a.axis]=side*2.6;
        i.physics.moveCapsule(p.pos,velocity,dt,radius,height,true);
        a.anchor=p.pos[a.axis];a.y=p.pos.y;
        if((a.anchor-target)*side>=0){a.phase='climb';a.side=side;}
      }else if(dir>.1)a.phase='exit';
    }
    if(a.phase==='climb'){
      if(dir<-.1&&a.y<=L.min.y+.035){p.onGround=false;detach();return;}
      const vertical=V([0,Math.abs(dir)>.1?dir*3.2:0,0]);
      i.physics.moveCapsule(p.pos,vertical,dt,radius,height,false);
      a.y=p.pos.y;
      // Stop at real ceiling geometry. No direct y jump through the duct floor.
      const climbTop=Math.max(L.max.y+.025,a.topFloor+.025);
      if(dir>.1&&a.y>=climbTop){a.y=p.pos.y=climbTop;a.phase='exit';}
    }
    if(a.phase==='exit'&&dir>.1){
      // The top floor may slope beyond the last rung. Use the ordinary capsule
      // step/slope solver to move onto it, keeping every collision active.
      const velocity=V([0,0,0]);velocity[a.axis]=a.topSign*2.6;
      i.physics.moveCapsule(p.pos,velocity,dt,radius,height,true);
      a.anchor=p.pos[a.axis];a.y=p.pos.y;
      const edge=(a.topSign<0?a.raw.min[a.n]:a.raw.max[a.n])+a.topSign*(radius+.22);
      if((a.anchor-edge)*a.topSign>=0&&i.physics.groundHeight(p.pos.x,p.pos.z,p.pos.y+.12)>=p.pos.y-.18){p.vel[a.axis]=a.topSign*1.5;p.onGround=true;detach();return;}
    }
    activeLadder=L;p.vel.y=0;p.onGround=true;
  }
  function update(dt){
    b.updaters.forEach(fn=>fn(dt));dressing?.update?.(dt);office.update(dt);
    const p=i.player;
    if(!p?.pos||!p.alive)return;
    for(const a of dynamic){
      const dist=Math.hypot(p.pos.x-a.center.x,p.pos.z-a.center.z);
      if(dist<2.9&&Math.abs(p.pos.y-a.data.bounds.min[1])<2.3)a.hold=4;
      else a.hold=Math.max(0,a.hold-dt);
      const target=a.hold>0?1:0,rate=a.data.motion.kind==='rotate'?a.data.motion.speed/a.data.motion.angle:a.data.motion.speed/a.data.motion.distance;
      a.t=T.MathUtils.clamp(a.t+Math.sign(target-a.t)*dt*rate,0,1);
      if(a.data.motion.kind==='rotate')a.obj.rotation.y=a.t*a.data.motion.angle;
      else a.obj.position.copy(V(a.data.motion.axis)).multiplyScalar(a.t*a.data.motion.distance);
      // Open doors leave the traversable portal. Restore collision only once fully shut.
      if(a.t>.7&&a.box){i.physics.removeBox(a.box);a.box=null;}
      else if(a.t<.02&&!a.box)a.box=boxFor(a.data);
      if(a.t>0&&a.t<1)i.renderer.shadowMap.needsUpdate=true;
    }
    updateLadder(p,dt);
  }
  const level={root,pavementGeometry,playerStart:start,objectives,extraction,enemySpawns,coverPoints,interiorBoxes,cinematicPath,
    zones:[{name:'yard',min:[-73,-84],max:[35,32]},{name:'warehouse',min:[-30,-74],max:[18,-41]}],
    skylights:[],shedLights:lamps,vantage:{stairsFoot:V([7.5,.8128,-60]),roof:V([10,13.0048,-49])},
    placed:b.placed,stats:{tris:map.stats?.staticTriangles,meshes:worldMeshes,props:b.placed.length,doors:dynamic.length,breakables:broken.length,dressing:dressing?.stats,vehicle:vehicle.stats,office:office.stats,architecture:architecture.stats,lighting:lighting.stats},
    groundSurfaceAt(x,z){return z< -41?'concrete':'concrete';},reset,update,
    diagnostics(){return {map:map.source,lighting:lighting.stats,doors:dynamic.map(a=>({id:a.data.id,open:a.t,collision:!!a.box})),breakables:broken.map(a=>({id:a.data.id,hp:a.hp,broken:a.dead})),ladder:activeLadder?true:false,nav:i.physics.nav?.stats};}
  };
  window.__assault={version:1,shots:{approach:[-8,1.9,-26,0,6,-43],warehouse:[-11,1.8,-44,0,5,-65],roof:[18,15,-42,-5,11,-55],office:[-24,10.1,-63,-26,10,-66]},diagnostics:()=>level.diagnostics()};
  return level;
}
