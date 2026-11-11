// Original Saltline crane and KITTIWAKE cargo ship, outside the playable BSP.
// Called in the original backdrop boot slot, after C1 and before ground/physics.
// Direct builders retain their authored materials and moving assemblies without
// Eb's automatic registration of collision boxes at the old port coordinates.
function assaultHarbor(i) {
  const T=i.THREE, root=new T.Group();
  root.name='assault-harbor';
  const originalAssets=new T.Group();originalAssets.name='assault-original-port-assets';
  root.add(originalAssets);
  const craneGroup=new T.Group(),shipGroup=new T.Group();
  craneGroup.name='assault-container-crane';shipGroup.name='assault-moored-ship';
  // The 84m ship-to-shore crane uses the original geometry at 2.5x, pivoted
  // around its native base [23.5,0,0] and anchored at world [60,0,40].
  craneGroup.scale.setScalar(2.5);craneGroup.position.set(1.25,0,40);
  // Face the original mooring side toward the open western quay.
  shipGroup.rotation.y=Math.PI;shipGroup.position.set(-45,0,-82.5);
  originalAssets.add(craneGroup,shipGroup);
  // Separate lamp batches keep their authored coordinates attached to the
  // different asset transforms while both use the same animation clock.
  const craneLamps=pb(),shipLamps=pb(),crane=z1(i,craneLamps),ship=vb(i,shipLamps);
  const materialFinish=assaultHarborMaterials(i,ship.root);
  craneGroup.add(crane.root);shipGroup.add(ship.root);
  const lampMeshes=[];
  for(const [name,builder,parent]of [['crane',craneLamps,craneGroup],['ship',shipLamps,shipGroup]]){
    const mesh=builder.build();
    if(mesh){mesh.name='assault-'+name+'-navigation-lamps';parent.add(mesh);lampMeshes.push(mesh);}
  }
  originalAssets.traverse(object=>{
    if(!object.isMesh)return;
    const geometry=object.geometry;
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    object.frustumCulled=true;
    // Geometry and its local transform are static, including the children of
    // the animated spreader/radar groups. Parent transforms still propagate.
    object.updateMatrix();object.matrixAutoUpdate=object===ship.radar||object===crane.spreader;
  });
  // Terminal construction is authored in Assault world coordinates, so it is
  // a sibling of the original asset groups, never under either transform.
  const terminal=assaultTerminal(i);root.add(terminal.root);
  let triangles=0,drawCalls=0,shadowMeshes=0;
  root.traverse(object=>{
    if(!object.isMesh)return;
    const geometry=object.geometry;
    triangles+=(geometry.index?geometry.index.count:geometry.attributes.position.count)/3;
    drawCalls++;if(object.castShadow)shadowMeshes++;
  });
  i.scene.add(root);root.updateMatrixWorld(true);
  const bounds=object=>{
    const box=new T.Box3().setFromObject(object);
    return {min:box.min.toArray(),max:box.max.toArray()};
  };
  const stats={
    materialFinish,source:'original Saltline z1/vb/pb',craneId:'SALTLINE 04',shipName:'KITTIWAKE',
    placements:{crane:{scale:2.5,nativePivot:[23.5,0,0],worldPivot:[60,0,40],translation:[1.25,0,40]},
      ship:{scale:1,yaw:Math.PI,translation:[-45,0,-82.5]}},triangles,drawCalls,shadowMeshes,
    collidersRegistered:0,lightsAdded:0,waterY:-1.6,quayX:75,quays:{east:75,west:-75},
    bounds:bounds(root),craneBounds:bounds(crane.root),shipBounds:bounds(ship.root),terminal:terminal.stats,
    animatedAssemblies:['crane spreader sway','ship radar','navigation lamp blink']
  };
  if(i.level?.stats)i.level.stats.harbor=stats;
  let time=0;
  function update(dt){
    time+=dt;craneLamps.uTime.value=time;shipLamps.uTime.value=time;
    // Original Eb animation expressions, unchanged. Keep the spreader group
    // and radar group mutable; no simulation, navigation or player state used.
    crane.spreader.rotation.x=.012*Math.sin(time*.52)+.004*Math.sin(time*1.31+1);
    crane.spreader.rotation.z=.009*Math.sin(time*.41+1.1);
    ship.radar.rotation.y=time*1.9;
    terminal.update?.(dt);
  }
  update(0);
  return {root,originalAssets,terminal:terminal.root,crane:crane.root,ship:ship.root,spreader:crane.spreader,radar:ship.radar,
    lamps:lampMeshes,update,stats};
}
