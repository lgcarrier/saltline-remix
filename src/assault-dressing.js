/* Assault architectural finish. World metres / +Y up. Geometry comes from the
 * supplied BSP; these additions describe construction, without moving its walls.
 * Called after source collision is installed and before the navigation build. */
function assaultDress(i, b, map) {
  const THREE = b.THREE;
  const root = new THREE.Group();
  root.name = 'assault-detail';
  const before = new Set(b.staticRoot.children);
  const stats = { props: 0, windows: 0, ladders: 0, trusses: 0, fixtures: 0, rejected: [], families: [], meshes: 0, triangles: 0 };
  const families = new Set(), lamps = [];
  const steel = b.M('steel_galv'), dark = b.M('steel_dark'), worn = b.M('steel_worn');
  const paint = b.M('paint_grey'), white = b.M('paint_white'), yellow = b.M('paint_yellow');
  const rubber = b.M('rubber'), glass = b.M('glass_dirty');
  const box = (mat, w, h, d, x, y, z, bevel = .008) => b.box(mat,w,h,d,x,y,z,{bevel});
  const rod = (mat,a,c,r=.024) => b.rod(mat,a,c,r,{seg:8});
  const label = (text,h,x,y,z,face='z+',opts={}) => b.label(text,h,x,y,z,face,{font:'sans',color:'white',distress:.24,...opts});
  const V = p => new THREE.Vector3(...p);

  // Accurate source-only floor queries keep authored props out of the engine's
  // legacy infinite floor and prevent accidentally placing them on a ceiling.
  const floors = [];
  for (const surface of map.surfaces || []) {
    const p=surface.positions,n=surface.normals;
    for(let k=0;k<p.length;k+=9) {
      if(n[k+1]<.7) continue;
      const ax=p[k],az=p[k+2],bx=p[k+3],bz=p[k+5],cx=p[k+6],cz=p[k+8];
      const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
      if(Math.abs(den)<1e-8)continue;
      floors.push({ax,az,bx,bz,cx,cz,ay:p[k+1],by:p[k+4],cy:p[k+7],den,
        minx:Math.min(ax,bx,cx),maxx:Math.max(ax,bx,cx),minz:Math.min(az,bz,cz),maxz:Math.max(az,bz,cz)});
    }
  }
  function floorAt(x,z,maxY=1) {
    let best=null;
    for(const f of floors) {
      if(x<f.minx-.001||x>f.maxx+.001||z<f.minz-.001||z>f.maxz+.001)continue;
      const a=((f.bz-f.cz)*(x-f.cx)+(f.cx-f.bx)*(z-f.cz))/f.den;
      const c=((f.cz-f.az)*(x-f.cx)+(f.ax-f.cx)*(z-f.cz))/f.den;
      if(a<-.001||c<-.001||a+c>1.001)continue;
      const y=a*f.ay+c*f.by+(1-a-c)*f.cy;
      if(y<=maxY+.01&&(best===null||y>best))best=y;
    }
    return best;
  }
  function place(name,x,z,yaw=0,options={}) {
    const size=Gi[name]||[1,1,1], c=Math.cos(yaw),s=Math.sin(yaw);
    const probe=options.floor??1.1, y=floorAt(x,z,probe);
    let reason=y===null?'no source floor':null;
    if(!reason) for(const xx of [-.45,0,.45])for(const zz of [-.45,0,.45]) {
      const u=xx*size[0],v=zz*size[2],xxw=x+u*c+v*s,zzw=z-u*s+v*c;
      const fy=floorAt(xxw,zzw,probe);
      if(fy===null||Math.abs(fy-y)>.16)reason='uneven source footprint';
    }
    if(!reason) {
      const from=new THREE.Vector3(x,y+.12,z);
      const ceiling=i.physics.raycast(from,new THREE.Vector3(0,1,0),size[1]+.1);
      if(ceiling&&ceiling.dist<size[1]-.02)reason='source headroom';
      for(const [dx,dz]of[[size[0]*.5,0],[-size[0]*.5,0],[0,size[2]*.5],[0,-size[2]*.5]]) {
        const dir=new THREE.Vector3(dx*c+dz*s,0,-dx*s+dz*c),dist=dir.length();dir.normalize();
        from.y=y+Math.min(.8,size[1]*.55);
        const hit=i.physics.raycast(from,dir,dist+.08);
        if(hit&&hit.dist<dist+.06)reason='source obstruction';
      }
    }
    if(reason){stats.rejected.push({name,x,z,reason});return null;}
    const prop=b.place(name,x,z,yaw,{seed:options.seed??(stats.props+197),...options},y);
    if(options.interior)prop.traverse(o=>{
      if(!o.isMesh||Array.isArray(o.material))return;
      const m=o.material;
      if(i.mats.names.includes(m.name))o.material=i.mats.get(m.name,{interior:true,vertexColors:!!m.vertexColors,doubleSide:m.side===2});
    });
    stats.props++;families.add(name);return prop;
  }

  // The BSP stores ladders as masked textures. Replace the masks with actual
  // galvanized rails, flattened grip rungs and stand-off wall brackets.
  for(const ladder of map.ladders||[]) {
    const mn=ladder.bounds.min,mx=ladder.bounds.max,alongX=mx[0]-mn[0]>mx[2]-mn[2];
    const cx=(mn[0]+mx[0])/2,cz=(mn[2]+mx[2])/2;
    const width=Math.min(1.05,(alongX?mx[0]-mn[0]:mx[2]-mn[2])-.12);
    const at=(u,y,off=0)=>alongX?[cx+u,y,cz+off]:[cx+off,y,cz+u];
    for(const side of [-1,1]) {
      rod(steel,at(side*width*.5,mn[1]+.08),at(side*width*.5,mx[1]+.18),.033);
      for(let y=mn[1]+.3;y<mx[1]-.2;y+=1.55) {
        rod(dark,at(side*width*.5,y),at(side*width*.5,y,-.12),.027);
      }
    }
    const steps=Math.max(2,Math.round((mx[1]-mn[1])/.29));
    for(let j=0;j<=steps;j++) {
      const y=mn[1]+.12+(mx[1]-mn[1]-.2)*j/steps;
      const a=at(-width*.5,y),d=at(width*.5,y);
      rod(worn,a,d,.026);
    }
    stats.ladders++;
  }

  // Original balcony guards and open-web roof trusses retain their BSP spans.
  const masked=new Map();
  for(const f of map.faces||[])if(/^\{(rail|tension|razor)/.test(f.texture)) {
    const key=f.modelId+'|'+f.texture;
    if(!masked.has(key))masked.set(key,{texture:f.texture,min:[...f.bounds.min],max:[...f.bounds.max]});
    const g=masked.get(key);for(let k=0;k<3;k++){g.min[k]=Math.min(g.min[k],f.bounds.min[k]);g.max[k]=Math.max(g.max[k],f.bounds.max[k]);}
  }
  for(const g of masked.values()) {
    const a=g.min,c=g.max,alongX=c[0]-a[0]>c[2]-a[2],len=alongX?c[0]-a[0]:c[2]-a[2];
    const point=(t,y)=>alongX?[a[0]+len*t,y,(a[2]+c[2])/2]:[(a[0]+c[0])/2,y,a[2]+len*t];
    if(g.texture.startsWith('{rail')) {
      for(const y of [a[1]+.08,(a[1]+c[1])*.5,c[1]-.025])rod(steel,point(0,y),point(1,y),.025);
      const count=Math.ceil(len/1.5);for(let j=0;j<=count;j++)rod(steel,point(j/count,a[1]),point(j/count,c[1]),.031);
    }else if(g.texture.startsWith('{tension')) {
      const count=Math.ceil(len/2.1), top=t=>Math.min(c[1],12.5984-Math.max(0,Math.abs(point(t,0)[0])-12.192)*.5);
      rod(dark,point(0,a[1]+.05),point(1,a[1]+.05),.055);
      for(let j=0;j<count;j++) {
        const t=j/count,u=(j+1)/count;
        rod(steel,point(t,top(t)),point(u,top(u)),.06);
        rod(steel,point(t,a[1]+.05),point(t,top(t)),.034);
        rod(steel,point(t,j%2?top(t):a[1]+.05),point(u,j%2?a[1]+.05:top(u)),.035);
      }
      stats.trusses++;
    }else {
      for(let j=0;j<3;j++)rod(dark,point(0,a[1]+j*.17),point(1,a[1]+j*.17),.006);
    }
  }

  // Warehouse eaves, folded-metal flashings and standing seams. The lower open
  // loading band stays clear, as do the roof/vent routes and ladder landings.
  box(steel,36.68,.14,.18,0,9.93,-40.20,.018);
  for(const x of [-18.31,18.31])box(steel,.16,.14,16.7,x,9.93,-48.56,.016);
  box(worn,24.52,.075,.16,0,13.045,-46.33,.012);
  for(const x of [-12.192,12.192])box(worn,.13,.075,10.55,x,13.045,-51.61,.012);
  for(const x of [-17.7,-13.1,-8.5,-3.9,.7,5.3,9.9,14.5,17.7]) {
    box(steel,.075,6.35,.06,x,6.50,-40.596,.008);
    for(const y of [3.45,6.45,9.5])box(dark,.115,.065,.075,x,y,-40.56,.006);
  }
  for(const x of [-17.61,17.61]) {
    rod(worn,[x,.32,-40.37],[x,9.91,-40.37],.065);
    for(const y of [1.1,3.1,5.1,7.1,9.1])box(dark,.19,.09,.12,x,y,-40.39,.005);
    rod(worn,[x,.32,-40.37],[x,.18,-40.08],.065);
  }
  box(dark,10.2,1.74,.11,-2.3,7.48,-40.52,.025);
  label('ASSAULT FREIGHT',1.08,-2.3,7.68,-40.446,'z+',{font:'stencil',distress:.32});
  label('WAREHOUSE 01  /  SALTLINE TERMINAL',.25,-2.3,6.98,-40.44,'z+',{color:'yellow',distress:.12});
  for(const x of [-15,0,14.8]) {
    box(dark,2.15,.42,.08,x,4.15,-40.55,.012);
    label(x<0?'LOADING 01':x>1?'SERVICE':'KEEP CLEAR',.22,x,4.16,-40.50,'z+',{color:'yellow'});
  }

  function fixture(x,y,z,face='z+') {
    const nx=face==='x+'?1:face==='x-'?-1:0,nz=face==='z+'?1:face==='z-'?-1:0;
    const tangent=[nz,0,-nx],center=[x+nx*.16,y,z+nz*.16];
    box(dark,Math.abs(tangent[0])*.38+.12,.21,Math.abs(tangent[2])*.38+.12,...center,.018);
    const emissive=i.mats.emissive?i.mats.emissive(0xffdb99,2):white;
    const lens=box(emissive,Math.abs(tangent[0])*.31+.06,.065,Math.abs(tangent[2])*.31+.06,x+nx*.23,y-.06,z+nz*.23,.008);
    lens.castShadow=false;
    rod(dark,[x,y+.13,z],[x,y+.45,z],.017);
    lamps.push({pos:[x+nx*.35,y-.16,z+nz*.35],color:0xffd49b,intensity:5,distance:5.5});stats.fixtures++;
  }
  for(const x of [-14,-4,7,15.6])fixture(x,3.53,-40.54);
  for(const z of [-46,-52.8])fixture(17.94,3.45,z,'x+');
  fixture(-17.96,8.0,-58,'x-');
  // West loading door: its source brush is a raised shutter, with a 2.03 m
  // clear opening. Add construction to that exact opening without changing it.
  for(const z of [-56.13,-47.09])box(worn,.18,5.12,.15,-17.98,2.56,z,.014);
  box(steel,.22,.18,9.22,-17.98,5.13,-51.61,.018);
  for(let y=2.52;y<4.88;y+=.195)box(paint,.052,.036,8.94,-17.927,y,-51.61,.005);
  box(dark,.16,1.55,3.18,-18.00,6.91,-51.61,.016);
  label('RECEIVING 01',.54,-18.088,7.09,-51.61,'x-',{font:'stencil'});
  label('CLEARANCE 2.0 M',.21,-18.089,6.56,-51.61,'x-',{color:'yellow'});
  fixture(-18.05,5.48,-51.61,'x-');
  // A restrained painted exclusion line makes the loading entrance legible.
  const apronY=floorAt(-20.5,-51.6,.8);
  if(apronY!==null){
    box(yellow,.085,.009,8.4,-21.35,apronY+.012,-51.61,.001);
    for(const z of [-55.8,-47.4])box(yellow,3.15,.009,.085,-19.81,apronY+.012,z,.001);
  }
  // Shared electrical feeds to the real loading fixtures.
  rod(rubber,[-16.2,3.32,-40.53],[16.2,3.32,-40.53],.018);
  box(paint,.38,.64,.14,16.1,4.60,-40.53,.015);
  label('440 V',.10,16.1,4.62,-40.442,'z+',{color:'yellow'});

  // Roof mechanical plant on flat roof patches, offset from the central vent.
  function hvac(x,z,y) {
    box(dark,2.7,.16,1.9,x,y+.08,z,.025);
    box(paint,2.5,.94,1.7,x,y+.63,z,.045);
    box(steel,2.57,.10,1.78,x,y+1.15,z,.018);
    for(let j=0;j<8;j++)box(dark,2.20,.045,.026,x,y+.28+j*.095,z+.862,.002);
    for(const dx of [-.65,.65]) {
      b.cyl(dark,.43,.08,x+dx,y+1.24,z,{seg:24});
      b.cyl(worn,.10,.10,x+dx,y+1.27,z,{seg:12});
      for(let k=0;k<7;k++) {
        const a=k*Math.PI/7;
        rod(steel,[x+dx+Math.cos(a)*.4,y+1.29,z+Math.sin(a)*.4],[x+dx-Math.cos(a)*.4,y+1.29,z-Math.sin(a)*.4],.012);
      }
    }
    b.col(x-1.35,y,z-.95,x+1.35,y+1.30,z+.95,'metal');
  }
  hvac(-7.4,-51.8,13.0048);hvac(7.4,-52.2,13.0048);
  for(const x of [-9.3,9.4]) {
    b.cyl(steel,.18,.85,x,13.47,-49.5,{seg:16});
    b.cyl(worn,.27,.08,x,13.94,-49.5,{seg:16});
  }

  // Recessed windows add real depth to the original urban facade texture areas.
  // Only rectangular source faces receive detail; all openings are preserved.
  const usedWindows=new Set();
  for(const f of map.faces||[]) {
    if(!/^c_bldg/.test(f.texture)||f.area<2||Math.abs(f.normal[1])>.05)continue;
    const mn=f.bounds.min,mx=f.bounds.max,normal=f.normal;
    const onX=Math.abs(normal[0])>.99,onZ=Math.abs(normal[2])>.99;if(!onX&&!onZ)continue;
    const axis=onX?2:0,lo=mn[axis],hi=mx[axis],w=hi-lo,h=mx[1]-mn[1];
    if(w<1.5||h<1.7||f.area<w*h*.97)continue;
    const plane=onX?mn[0]:mn[2],norm=onX?normal[0]:normal[2];
    for(let u=Math.ceil((lo+.85)/3.2)*3.2;u<hi-.85;u+=3.2)for(let y=Math.ceil((Math.max(mn[1],2.5)+.86)/3.45)*3.45;y<mx[1]-.86;y+=3.45) {
      const key=`${onX?'x':'z'}:${plane.toFixed(2)}:${u.toFixed(2)}:${y.toFixed(2)}`;if(usedWindows.has(key))continue;usedWindows.add(key);
      const x=onX?plane+norm*.035:u,z=onX?u:plane+norm*.035;
      const width=1.45,height=1.78;
      const add=(mat,ww,hh,dd,du,dy,depth,bevel=.005)=>box(mat,onX?dd:ww,hh,onX?ww:dd,x+(onX?norm*depth:du),y+dy,z+(onX?du:norm*depth),bevel);
      add(dark,width+.13,height+.13,.075,0,0,0,.007);
      add(glass,width,height,.026,0,0,.053,.003);
      for(const sx of [-1,1])add(worn,.055,height+.14,.11,sx*(width+.055)/2,0,.08);
      for(const sy of [-1,1])add(worn,width+.14,.055,.11,0,sy*(height+.055)/2,.08);
      add(steel,.035,height,.08,0,0,.1);
      add(steel,width,.035,.08,0,.08,.1);
      add(b.M('concrete_dirty'),width+.32,.12,.23,0,-height*.5-.1,.09,.014);
      stats.windows++;
    }
  }

  // Cargo is placed in recesses and along service walls. The central streets,
  // underpass, ramps, doors and ladder approaches retain their original width.
  const cargo=[
    ['pallet_stack',-12,.62,.08],['crate_wood',-10.1,.60,-.08],['barrel',-8.6,.58,.2,{color:'yellow'}],
    ['dumpster',-28.9,-5.6,Math.PI/2],['tire_stack',-29.1,-7.6,.2],['traffic_cone',-27.8,-5.8],
    ['jersey_barrier',-25.1,-.6],['traffic_cone',-21.1,-.6],
    ['generator',15.7,-25.1,Math.PI/2],['jerry_can',14.7,-26.2,.4],['cable_reel',15.7,-27.2,Math.PI/2],
    ['ibc_tote',15.9,-34.2],['barrel',16.1,-35.6,0,{color:'blue'}],['gas_cylinders',16.4,-37.0],
    ['forklift',-10.4,-37.2,.3],['pallet',-13.4,-36.8,-.1],['cardboard_boxes',-15.4,-37.3,.08],
    ['toolbox_cart',20.9,-51.6,Math.PI/2],['floodlight_stand',20.8,-48.3,.3],
    ['pipe_stack',-28.8,-50.8,Math.PI/2],['sandbags',-28.7,-47.2,Math.PI/2],
    ['tarp_cargo',-27.6,-55.0,.1],['barrel',-29,-53.2,.2,{color:'red'}],
    ['shelf_rack',-14.6,-49.8,Math.PI/2,{floor:3.5,interior:true}],
    ['crate_stack',-13.6,-54.2,.1,{floor:3.5,interior:true}],
    ['pallet_stack',-11.8,-55.0,.1,{floor:3.5,interior:true}],
    ['toolbox_cart',14.7,-52.7,Math.PI/2,{floor:1.1,interior:true}],
    ['gas_cylinders',15.8,-57.8,0,{floor:1.1,interior:true}],
    ['barrel',14.9,-64.9,0,{floor:1.1,interior:true,color:'orange'}],
    ['reefer_unit',-9.4,-54.3,Math.PI/2,{floor:13.1}],
    ['toolbox_cart',-26.7,-61.1,0,{floor:8.8,interior:true}],
    ['cardboard_boxes',-25.4,-61.1,.15,{floor:8.8,interior:true}],
    ['bollard_post',-16.4,-39.4],['bollard_post',15.7,-39.4]
  ];
  for(const [name,x,z,yaw,options]of cargo)place(name,x,z,yaw||0,options||{});

  // Small maintenance objects in the south-west freight recess are intentionally
  // separate from movement lanes and from the CS tower/ladder.
  place('container20',-42.1,5.4,Math.PI/2,{color:'teal'});
  place('guard_booth',-43.4,9.4,0);
  place('gate_arm',-39.4,9.9,Math.PI/2);
  place('sign_post',-35.0,8.2,Math.PI/2,{sign:'no_entry'});
  place('light_mast',-33.0,-29.8,0);

  // Inset grated drains use thin strips above the real pavement. They have no
  // collision lip and do not create step-height noise during movement.
  function drain(x,z,length,alongX=true) {
    const y=floorAt(x,z,.85);if(y===null)return;
    box(dark,alongX?length:.24,.012,alongX?.24:length,x,y+.007,z,.001);
    const count=Math.floor(length/.11);for(let j=0;j<count;j++) {
      const u=(j-(count-1)/2)*.11;
      box(worn,alongX?.035:.23,.009,alongX?.23:.035,x+(alongX?u:0),y+.016,z+(alongX?0:u),.001);
    }
  }
  drain(5,-38.8,6.5);drain(-14,-8.5,3.0);drain(20.6,-48.1,2.4,false);

  // Merge only our new geometry. The caller owns existing relay/dynamic roots.
  // An atlas consolidates every physical sign into one material.
  const staging=new THREE.Group();staging.name='assault-detail-source';
  for(const child of [...b.staticRoot.children])if(!before.has(child))staging.add(child);
  // Canonical opaque variants share one draw with the vertex-coloured original
  // prop meshes. Ii supplies white vertex colours for structural geometry.
  staging.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material))return;
    const m=o.material;
    if(!m.isMeshStandardMaterial||m.vertexColors||m.transparent||!i.mats.names.includes(m.name))return;
    const options=m.userData.interior?{interior:true}:{};
    if(i.mats.get(m.name,options)===m)o.material=i.mats.get(m.name,{...options,vertexColors:true});
  });
  staging.updateMatrixWorld(true);
  const dynamics=[];
  staging.traverse(o=>{if(o.userData&&o.userData.noMerge&&!(o.parent&&dR(o.parent,staging)))dynamics.push(o);});
  for(const o of dynamics)root.attach(o);
  let atlas={count:0,update(){}};
  try{atlas=rb(staging);}catch(error){console.warn('[assault] detail atlas',error);}
  const merged=By(staging);merged.name='assault-detail-batched';root.add(merged);
  root.traverse(o=>{if(o.isMesh){stats.meshes++;stats.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
  stats.families=[...families];stats.labelsAtlased=atlas.count;
  return {root,stats,lamps,update(dt){atlas.update(dt);}};
}
