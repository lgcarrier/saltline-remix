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
  patch('tarp',22,16,(u,v)=>{
    const support=Math.sin(Math.PI*u*4),fold=.014*support*Math.sin(v*Math.PI*10+u*5)*Math.sin(v*Math.PI);
    return [x0+u*length,Math.min(yTop,arch(v)+fold),z0+v*width];
  },[length,width]);
  for(const side of [-1,1]){
    const z=side<0?z0:z1;
    patch('tarp',22,8,(u,v)=>{
      const tension=Math.sin(Math.PI*v),fold=(.014*Math.sin(u*Math.PI*24+v*3)+.012*Math.sin(u*Math.PI*10-v*5))*tension;
      const sag=.025*Math.sin(Math.PI*u*4)**2*Math.sin(Math.PI*v);
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

  for(const [name,batch] of batches){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));g.computeBoundingSphere();
    const mat=i.mats.get(name,{interior:false});mat.side=T.DoubleSide;
    const mesh=new T.Mesh(g,mat);mesh.name='truck-'+name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  return {root,hideFaceIds,hideTextures,stats:{triangles,meshes:batches.size,wheels:wheels.length,
    sourceEnvelope:{min:[5.6896,0,-10.418318],max:[13.208,2.8448,-6.2992]}}};
}
