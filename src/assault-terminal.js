/* Original Saltline maritime cargo around the native Assault boundary.
 * Decorative terminal only: source movement/collision remains authoritative.
 * Synchronous world-space contract: assaultTerminal(i) -> {root,stats}. */
function assaultTerminal(i){
  const T=i.THREE,root=new T.Group(),builder=ob(i),regions=new Map();
  root.name='assault-maritime-terminal';
  const stats={containers:0,byRegion:{},meshes:0,triangles:0,labelsAtlased:0,
    source:'original Saltline container40 builder; full geometry',
    collision:'none; all cargo and quay additions are outside native bounds',
    nativeBounds:{min:[-68.2752,0,-79.6544],max:[30.8864,19.5072,27.6352]},placements:[]};
  function region(name){if(!regions.has(name)){const group=new T.Group();group.name='terminal-'+name;regions.set(name,group);}return regions.get(name);}
  function into(name,object){region(name).add(object);return object;}
  function box(name,material,size,p,bevel=0){
    return into(name,builder.box(builder.M(material),...size,...p,{bevel}));
  }
  function stack(name,x,z,layers,yaw,seedOffset=0){
    const palette=['blue','teal','red'];
    for(let layer=0;layer<layers;layer++){
      const color=palette[(seedOffset+layer)%palette.length],y=layer*2.59;
      // Three deterministic source variants reuse the original builder cache;
      // the full corrugation, corner castings, doors and locking bars remain.
      const prop=builder.place('container40',x,z,yaw,{color,wear:.25,seed:610+(seedOffset+layer)%3,doors:0},y,{noCol:true});
      into(name,prop);stats.containers++;stats.byRegion[name]=(stats.byRegion[name]||0)+1;
      stats.placements.push({region:name,name:'container40',pos:[x,y,z],yaw,color,layer:layer+1});
    }
  }

  // East berth: keep the complete scaled crane bogie rectangle free. Its rails
  // are at X47.5/72.5 and its feet occupy Z[19.75,60.25]. Cargo is north/south.
  box('east','concrete_dirty',[41.5,2.2,201],[54.25,-1.1,-20.5]);
  box('east','steel_dark',[.085,.16,201],[74.93,-.08,-20.5]);
  for(const x of [47.5,72.5]){
    box('east','steel_dark',[.085,.08,180],[x,.04,-15]);
    for(let z=-102;z<75;z+=7.5)box('east','concrete_dirty',[.80,.12,1.60],[x,-.04,z]);
  }
  for(const [row,x]of [39,44.5,51].entries()){
    for(const [bay,z]of [-103,-88,-73,-58].entries())stack('east',x,z,[3,4,3,4][bay],Math.PI/2,row+bay);
    for(const [bay,z]of [-28,-13].entries())stack('east',x,z,[3,2][bay],Math.PI/2,row+bay+1);
  }

  // West berth follows the ship's native mooring convention after rotation:
  // ship centre X=-86, water west of X=-75, dry quay east of that boundary.
  // The open Z[-63,-35] loading vista is deliberately left completely clear.
  box('west','concrete_dirty',[6.7248,2.2,116],[-71.6376,-1.1,-33]);
  box('west','steel_dark',[.075,.16,116],[-74.96,-.08,-33]);
  for(const [bay,z]of [-78,-26,-11,4].entries()){
    stack('west',-73.4,z,[4,5,4,3][bay],Math.PI/2,bay+1);
    stack('west',-69.9,z,[3,4,3,2][bay],Math.PI/2,bay+2);
  }
  // Original mooring assets stay on their own quay; they add no physical route.
  for(const z of [-69,-37,-3.5])into('west',builder.place('bollard_mooring',-74.05,z,0,{seed:702},0,{noCol:true}));

  // A low northern apron provides a second cargo layer around the map, wholly
  // beyond the original north wall. No artificially raised ground is used.
  box('north','concrete_dirty',[95,1.8,13],[-22.5,-.9,-88.5]);
  for(const [bay,x]of [-58,-43].entries())stack('north',x,-88,4,0,bay+2);

  // One atlas for repeated source serials, then merge by region/material for
  // useful frustum culling. Terminal geometry is excluded from shadow maps;
  // the surrounding scene remains responsible for its ambient illumination.
  const staging=new T.Group();for(const group of regions.values())staging.add(group);
  staging.traverse(o=>{
    if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
    if(Array.isArray(o.material))return;const m=o.material;
    if(m.isMeshStandardMaterial&&!m.vertexColors&&!m.transparent&&i.mats.names.includes(m.name)&&i.mats.get(m.name)===m)
      o.material=i.mats.get(m.name,{vertexColors:true});
  });
  staging.updateMatrixWorld(true);
  let atlas={count:0};try{atlas=rb(staging);}catch(error){console.warn('[assault] terminal label atlas',error);}
  for(const [name,group]of regions){
    group.updateMatrixWorld(true);
    const merged=By(group);merged.name='terminal-batched-'+name;
    merged.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;o.frustumCulled=true;
      stats.meshes++;stats.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;
    });root.add(merged);
  }
  stats.labelsAtlased=atlas.count;
  stats.regionBounds={east:{min:[33.5,-2.2,-121],max:[75,10.36,80]},
    west:{min:[-75,-2.2,-91],max:[-68.2752,12.95,25]},north:{min:[-70,-1.8,-95],max:[25,10.36,-82]}};
  return {root,stats,update:dt=>atlas.update?.(dt)};
}
