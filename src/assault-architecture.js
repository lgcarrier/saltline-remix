/* Construction-scale finish for the supplied cs_assault brushwork.
 * World metres / +Y up. Only source surfaces receive relief; collision, doors,
 * ladders, cover silhouettes and navigation remain owned by the original map.
 * Uses Saltline's original metre UV convention and material bank. */
function assaultArchitecture(i, map) {
  const T=i.THREE, root=new T.Group(), batches=new Map();
  root.name='assault-construction';
  const stats={triangles:0,meshes:0,pilasters:0,windows:0,cratePanels:0,structuralBays:0};
  const unitY=new T.Vector3(0,1,0), temporary=new T.Vector3();
  const regionAt=(p,interior)=>interior?'hall':p[0]<-29?'west':p[2]<-39?'warehouse':'street';
  // A structural chamfer has 44 triangles, rather than the original rounded
  // prop helper's 108. Flat faces, twelve bevels and eight corner cuts retain
  // actual highlight-catching geometry without tessellating long flat panels.
  function chamferBox(w,h,d,r){
    const half=[w/2,h/2,d/2],p=[],n=[],uv=[];
    r=Math.min(r,...half.map(v=>v*.45));
    function polygon(vertices,normal){
      const a=vertices[0],b=vertices[1],c=vertices[2],u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if(cross.reduce((sum,x,k)=>sum+x*normal[k],0)<0)vertices.reverse();
      const len=Math.hypot(...normal),nn=normal.map(v=>v/len),abs=nn.map(Math.abs),axis=abs.indexOf(Math.max(...abs));
      for(let k=1;k<vertices.length-1;k++)for(const point of [vertices[0],vertices[k],vertices[k+1]]){
        p.push(...point);n.push(...nn);uv.push(axis===0?point[2]:point[0],axis===1?point[2]:point[1]);
      }
    }
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const other=[0,1,2].filter(v=>v!==axis),normal=[0,0,0];normal[axis]=sign;
      const vertices=[];for(const [u,v]of[[-1,-1],[1,-1],[1,1],[-1,1]]){
        const q=[0,0,0];q[axis]=sign*half[axis];q[other[0]]=u*(half[other[0]]-r);q[other[1]]=v*(half[other[1]]-r);vertices.push(q);
      }polygon(vertices,normal);
    }
    for(let axis=0;axis<3;axis++)for(let second=axis+1;second<3;second++)for(const sa of [-1,1])for(const sb of [-1,1]){
      const third=3-axis-second,vertices=[],normal=[0,0,0];normal[axis]=sa;normal[second]=sb;
      for(const [end,face]of[[-1,axis],[-1,second],[1,second],[1,axis]]){
        const q=[0,0,0];q[axis]=sa*(half[axis]-(face===axis?0:r));q[second]=sb*(half[second]-(face===second?0:r));q[third]=end*(half[third]-r);vertices.push(q);
      }polygon(vertices,normal);
    }
    for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
      const signs=[sx,sy,sz],vertices=[];
      for(let face=0;face<3;face++)vertices.push(half.map((v,axis)=>signs[axis]*(v-(axis===face?0:r))));
      polygon(vertices,signs);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;
  }
  function add(geometry,material,interior=false,region=null) {
    const g=geometry.index?geometry.toNonIndexed():geometry;
    if(!g.attributes.normal)g.computeVertexNormals();
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    if(!region){g.computeBoundingBox();g.boundingBox.getCenter(temporary);region=regionAt(temporary.toArray(),interior);}
    const key=material+'|'+region;
    let batch=batches.get(key);
    if(!batch){batch={material,interior,region,p:[],n:[],uv:[]};batches.set(key,batch);}
    for(let k=0;k<p.count;k++){
      batch.p.push(p.getX(k),p.getY(k),p.getZ(k));
      batch.n.push(n.getX(k),n.getY(k),n.getZ(k));
      batch.uv.push(uv?uv.getX(k):p.getX(k),uv?uv.getY(k):p.getZ(k));
    }
    stats.triangles+=p.count/3;
    if(g!==geometry)g.dispose();geometry.dispose();
  }
  function timberUV(g,longAxis){
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,other=[0,1,2].filter(a=>a!==longAxis);
    const get=(attribute,k,a)=>a===0?attribute.getX(k):a===1?attribute.getY(k):attribute.getZ(k);
    for(let k=0;k<p.count;k++){
      if(Math.abs(get(n,k,longAxis))>.8)uv.setXY(k,get(p,k,other[0]),get(p,k,other[1]));
      else {const cross=Math.abs(get(n,k,other[0]))>Math.abs(get(n,k,other[1]))?other[1]:other[0];uv.setXY(k,get(p,k,longAxis),get(p,k,cross));}
    }
  }
  function box(material,p,size,bevel=.012,inside=false,region=null) {
    const g=bevel>0?chamferBox(...size,bevel):$e(...size);
    if(material.startsWith('wood_'))timberUV(g,size.indexOf(Math.max(...size)));
    g.translate(...p);add(g,material,inside,region);
  }
  function beam(material,a,b,width,depth,bevel=.006,inside=false,region=null){
    const from=new T.Vector3(...a),to=new T.Vector3(...b),direction=to.clone().sub(from);
    const g=bevel>0?chamferBox(width,direction.length(),depth,bevel):$e(width,direction.length(),depth);
    if(material.startsWith('wood_'))timberUV(g,1);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(unitY,direction.normalize()));
    g.translate(...from.add(to).multiplyScalar(.5).toArray());add(g,material,inside,region);
  }
  function pipe(material,a,b,r=.025,inside=false,region=null){
    const from=new T.Vector3(...a),to=new T.Vector3(...b),direction=to.clone().sub(from);
    const g=ot(r,r,direction.length(),8);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(unitY,direction.normalize()));
    g.translate(...from.add(to).multiplyScalar(.5).toArray());add(g,material,inside,region);
  }

  // A plane wrapper keeps authored details flush with the actual brush face.
  function plane(axis,value,sign,region,inside=false){
    return {axis,value,sign,region,inside,
      at:(u,y,depth=0)=>axis===0?[value+sign*depth,y,u]:[u,y,value+sign*depth],
      box(material,u,y,w,h,d,offset,bevel=.012){
        box(material,this.at(u,y,offset),axis===0?[d,h,w]:[w,h,d],bevel,inside,region);
      },
      beam(material,u0,y0,u1,y1,w,d,offset,bevel=.006){
        // The beam's depth follows the facade normal even on X-facing walls.
        const a=this.at(u0,y0,offset),b=this.at(u1,y1,offset);
        if(axis===2)beam(material,a,b,w,d,bevel,inside,region);
        else {
          const g=bevel>0?chamferBox(w,Math.hypot(u1-u0,y1-y0),d,bevel):$e(w,Math.hypot(u1-u0,y1-y0),d);
          if(material.startsWith('wood_'))timberUV(g,1);
          g.rotateZ(-Math.atan2(u1-u0,y1-y0));g.rotateY(-Math.PI/2);
          g.translate(...this.at((u0+u1)/2,(y0+y1)/2,offset));add(g,material,inside,region);
        }
      }
    };
  }
  const facades=new Map();
  for(const f of map.faces||[]){
    if(f.modelId!==0||!/^c_(bldg|stone1)/.test(f.texture)||Math.abs(f.normal[1])>.02)continue;
    const axis=Math.abs(f.normal[0])>.99?0:Math.abs(f.normal[2])>.99?2:-1;if(axis<0)continue;
    const uAxis=axis===0?2:0,mn=f.bounds.min,mx=f.bounds.max;
    if(f.area<(mx[uAxis]-mn[uAxis])*(mx[1]-mn[1])*.97)continue;
    const value=mn[axis],sign=f.normal[axis],key=axis+':'+value+':'+sign;
    let group=facades.get(key);
    if(!group){group={...plane(axis,value,sign,regionAt(f.center,false)),uAxis,faces:[],lo:Infinity,hi:-Infinity,bottom:Infinity,top:-Infinity};facades.set(key,group);}
    group.faces.push(f);group.lo=Math.min(group.lo,mn[uAxis]);group.hi=Math.max(group.hi,mx[uAxis]);
    group.bottom=Math.min(group.bottom,mn[1]);group.top=Math.max(group.top,mx[1]);
  }
  function covered(g,u,y){
    return g.faces.some(f=>u>=f.bounds.min[g.uAxis]-.001&&u<=f.bounds.max[g.uAxis]+.001&&y>=f.bounds.min[1]-.001&&y<=f.bounds.max[1]+.001);
  }
  function rectangleCovered(g,u,y,w,h){
    for(const dx of [-.5,0,.5])for(const dy of [-.5,0,.5])if(!covered(g,u+dx*w,y+dy*h))return false;
    return true;
  }
  // Copings, base courses and masonry piers make the city blocks read as load
  // bearing buildings. Segments are admitted only where the BSP really is solid.
  for(const g of facades.values()){
    if(g.hi-g.lo<4||g.top-g.bottom<5)continue;
    const central=g.faces.some(f=>f.texture.startsWith('c_stone1'));
    // Keep distant boundary detail subordinate to the playable foreground.
    const important=central||(g.axis===0&&Math.abs(g.value-17.8816)<.01)||(g.axis===2&&Math.abs(g.value+56.896)<.01)
      ||(g.axis===2&&Math.abs(g.value-1.6256)<.01)||(g.axis===0&&Math.abs(g.value+35.7632)<.01)
      ||(g.axis===2&&Math.abs(g.value+11.3792)<.01)||(g.axis===0&&Math.abs(g.value-8.128)<.01);
    if(!important)continue;
    for(let u=Math.ceil((g.lo+.35-1.6)/6.4)*6.4+1.6;u<g.hi-.35;u+=6.4){
      let start=null;
      const finish=y1=>{
        if(start!==null&&y1-start>2.4){
          const y0=start+.06,h=y1-y0-.05;
          g.box('concrete_dirty',u,y0+h/2,.39,h,.25,.06,.026);
          if(h>4.5)g.box('concrete_dirty',u,y0+.3,.53,.6,.32,.07,.026);
          g.box('concrete_dirty',u,y1-.15,.52,.30,.34,.08,.018);stats.pilasters++;
        }start=null;
      };
      for(let y=g.bottom+.06;y<g.top-.12;y+=.25){
        const next=Math.min(y+.25,g.top-.12);
        if(rectangleCovered(g,u,(y+next)/2,.39,next-y)){if(start===null)start=y;}else finish(y);
      }finish(g.top-.12);
    }
    for(const band of [{y:g.bottom+.22,h:.38,d:.27},{y:g.top-.13,h:.24,d:.40},
      ...[5.18,8.63,12.08].filter(y=>y>g.bottom+.7&&y<g.top-.8).map(y=>({y,h:.13,d:.22}))]){
      let start=null;
      const step=.8,finish=u=>{if(start!==null&&u-start>.32)g.box('concrete_dirty',(start+u)/2,band.y,u-start-.025,band.h,band.d,.06,.012);start=null;};
      for(let a=g.lo;a<g.hi-.01;a+=step){const b=Math.min(a+step,g.hi);
        if(rectangleCovered(g,(a+b)/2,band.y,b-a-.012,band.h)){if(start===null)start=a;}else finish(a);
      }finish(g.hi);
    }
    // The original brick tower uses window textures; these were lost when its
    // material was remapped to Saltline brick. Restore their depth and rhythm.
    if(central){
      for(let u=Math.ceil((g.lo+1.05)/3.2)*3.2;u<g.hi-1.05;u+=3.2)for(let y=3.45;y<g.top-1.4;y+=3.45){
        if(!rectangleCovered(g,u,y,1.83,2.15))continue;
        g.box('steel_dark',u,y,1.61,1.94,.045,.024,0);
        g.box('glass',u,y,1.42,1.72,.025,.055,0);
        for(const dx of [-.79,.79])g.box('concrete_dirty',u+dx,y,.16,2.04,.23,.09,.012);
        g.box('concrete_dirty',u,y+.98,1.89,.19,.27,.105,.015);
        g.box('concrete_dirty',u,y-1.00,1.91,.15,.35,.14,.015);
        g.box('steel_worn',u,y,.045,1.76,.06,.083,.004);
        g.box('steel_worn',u,y+.03,1.45,.045,.06,.083,.004);
        stats.windows++;
      }
    }
  }

  // Deep enough to cast a contact shadow, but shallower than the player's wall
  // clearance. Existing sign and lamps remain in front of the load-bearing bays.
  const front=plane(2,-40.64,1,'warehouse');
  for(const x of [-17.73,-11.80,-5.90,0,5.90,11.80,17.73]){
    front.box('concrete_dirty',x,1.64,.41,3.23,.29,.035,.025);
    front.box('steel_dark',x,6.52,.21,6.48,.12,.025,.009);
    for(const dx of [-.14,.14])front.box('steel_worn',x+dx,6.52,.048,6.48,.17,.025,.005);
    for(const y of [3.42,9.51])front.box('steel_worn',x,y,.39,.22,.15,.025,.01);
    stats.structuralBays++;
  }
  for(const y of [.22,3.23])front.box('concrete_dirty',0,y,35.79,y<1?.38:.16,.27,.045,.018);
  front.box('steel_dark',0,9.64,35.90,.23,.17,.025,.012);
  // End-bay wind bracing gives a useful diagonal at building scale; the sign
  // occupies the middle bays and is deliberately kept free of added bracing.
  for(const [u0,u1]of[[-17.5,-12.03],[12.03,17.5]]){
    front.beam('steel_worn',u0,3.49,u1,9.44,.11,.075,.028,.006);
    for(const [u,y]of[[u0,3.49],[u1,9.44]])front.box('steel_dark',u,y,.28,.30,.085,.025,.005);
  }
  // Side bay columns stop at source door openings instead of manufacturing a
  // new obstacle in either of the two playable loading/service entrances.
  for(const side of [-1,1]){
    const wall=plane(0,side*17.8816,side,'warehouse');
    for(const z of [-41.05,-46.70,-56.65]){
      wall.box('steel_dark',z,6.52,.20,6.48,.14,.035,.009);
      for(const dz of [-.13,.13])wall.box('steel_worn',z+dz,6.52,.05,6.48,.19,.025,.005);
    }
  }

  // Closed source service doors receive real lintels and jambs, without adding
  // an interactive door or altering the BSP opening dimensions.
  for(const spec of [
    {axis:0,p:-21.1328,n:-1,u:-17.8816,y:1.2192,w:3.2512,h:2.4384},
    {axis:2,p:4.8768,n:-1,u:-24.384,y:2.4384,w:6.5024,h:2.4384}
  ]){
    const wall=plane(spec.axis,spec.p,spec.n,'street');
    for(const sign of [-1,1])wall.box('concrete_dirty',spec.u+sign*(spec.w/2+.10),spec.y,.20,spec.h+.14,.29,.08,.018);
    wall.box('concrete_dirty',spec.u,spec.y+spec.h/2+.12,spec.w+.40,.24,.36,.11,.02);
    wall.box('steel_dark',spec.u,spec.y+spec.h/2+.015,spec.w,.065,.11,.10,.005);
  }
  // Connected electrical distribution on the existing alley wall. All parts
  // remain flush to the wall rather than adding loose street obstacles.
  const service=plane(0,17.8816,-1,'street');
  service.box('steel_dark',-27.75,1.83,1.12,1.64,.16,.065,.018);
  service.box('steel_worn',-27.75,1.83,1.02,1.53,.07,.17,.022);
  service.box('steel_dark',-27.32,1.84,.05,.27,.055,.222,.006);
  for(let j=0;j<6;j++)service.box('steel_dark',-27.75,1.29+j*.065,.70,.018,.02,.212,0);
  for(const u of [-28.0,-27.77,-27.54]){
    pipe('steel_worn',service.at(u,2.64,.11),service.at(u,5.56,.11),.025,false,'street');
    pipe('steel_worn',service.at(u,5.56,.11),service.at(u+1.1,5.56,.11),.025,false,'street');
  }
  for(const y of [3.30,4.80])service.box('steel_dark',-27.77,y,.82,.07,.05,.13,0);
  const ctWall=plane(2,-11.3792,1,'street');
  ctWall.box('steel_dark',15.65,2.15,1.35,.85,.055,.04,.009);
  for(let j=0;j<9;j++)ctWall.box('steel_worn',15.65,1.81+j*.085,1.23,.035,.14,.085,.005);
  for(const x of [14.98,16.32])ctWall.box('steel_worn',x,2.15,.055,.88,.15,.085,.006);
  ctWall.box('concrete_dirty',15.65,2.62,1.51,.14,.26,.11,.012);

  // Hall structure is anchored to the native rear arcade and existing corner
  // pier. Thin flanges articulate its mass while preserving every clear span.
  const rear=plane(2,-69.9008,1,'hall',true);
  for(const x of [-6.096,-.4064,5.2832,10.9728]){
    for(const dx of [-.30,.30])rear.box('steel_worn',x+dx,4.93,.065,3.32,.115,.035,.008);
    rear.box('steel_dark',x,3.34,.76,.15,.13,.035,.009);
    rear.box('steel_worn',x,6.48,.77,.13,.14,.035,.009);
    rear.beam('steel_worn',x-.70,7.31,x-.30,6.56,.10,.10,.035,.007);
    rear.beam('steel_worn',x+.30,6.56,x+.70,7.31,.10,.10,.035,.007);
  }
  rear.box('steel_worn',0,8.16,22.75,.17,.13,.045,.011);
  // Existing upper office wall's lower and upper flanges retain the exposed
  // masonry infill and its original window/door openings.
  for(const y of [8.20,12.87])box('steel_worn',[-11.32,y,-62.30],[.12,.13,12.85],.009,true,'hall');
  // Exterior trim of the overhead duct: no metal is placed inside its crouch
  // passage, around the ladder aperture, or at either exit lip.
  for(const z of [-58.50,-61.20,-64.0,-66.5]){
    box('steel_worn',[0,10.948,z],[1.69,.055,.065],.006,true,'hall');
    for(const x of [-.835,.835])box('steel_worn',[x,11.77,z],[.05,1.64,.065],.006,true,'hall');
  }
  // Loading platform retaining wall. Follow its actual top, including the
  // descending ramp, so bevelled caps never become new step obstacles.
  const lipZ=-56.896,lipFront=-56.853;
  beam('steel_worn',[-17.46,3.219,lipFront],[-2.4384,3.219,lipFront],.065,.13,.008,true,'hall');
  beam('steel_worn',[-2.4384,3.219,lipFront],[4.8768,.7808,lipFront],.065,.13,.008,true,'hall');
  beam('steel_worn',[4.8768,.7808,lipFront],[12.18,.7808,lipFront],.065,.13,.008,true,'hall');
  for(const x of [-16,-12,-8,-4])box('steel_dark',[x,.18,lipZ+.035],[.22,.32,.11],.008,true,'hall');

  // Each source crate face becomes timber construction, rather than a texture
  // stretched over a box. Coplanar BSP splits are joined before laying battens.
  const cratePlanes=new Map();
  const replacedCargo=new Set(assaultCargoStacks(map).flatMap(s=>s.faces.map(f=>f.id)));
  for(const f of map.faces||[]){
    if(replacedCargo.has(f.id))continue;
    if(!/(?:crate|xcrate)/.test(f.texture)||Math.abs(f.normal[1])>.02||f.area<.3)continue;
    const axis=Math.abs(f.normal[0])>.99?0:Math.abs(f.normal[2])>.99?2:-1;if(axis<0)continue;
    const ua=axis===0?2:0,lo=f.bounds.min,hi=f.bounds.max;
    if(f.area<(hi[ua]-lo[ua])*(hi[1]-lo[1])*.98)continue;
    const key=[axis,lo[axis],f.normal[axis],f.texture].join(':');
    if(!cratePlanes.has(key))cratePlanes.set(key,{axis,p:lo[axis],n:f.normal[axis],ua,rects:[]});
    cratePlanes.get(key).rects.push([lo[ua],hi[ua],lo[1],hi[1]]);
  }
  for(const group of cratePlanes.values()){
    // Only merge exact neighbours; never bridge the gap between separate cargo.
    let changed=true;
    while(changed){changed=false;outer:for(let a=0;a<group.rects.length;a++)for(let b=a+1;b<group.rects.length;b++){
      const x=group.rects[a],y=group.rects[b];
      const horizontal=Math.abs(x[2]-y[2])<.002&&Math.abs(x[3]-y[3])<.002&&(Math.abs(x[0]-y[1])<.002||Math.abs(x[1]-y[0])<.002);
      const vertical=Math.abs(x[0]-y[0])<.002&&Math.abs(x[1]-y[1])<.002&&(Math.abs(x[2]-y[3])<.002||Math.abs(x[3]-y[2])<.002);
      if(horizontal||vertical){group.rects[a]=[Math.min(x[0],y[0]),Math.max(x[1],y[1]),Math.min(x[2],y[2]),Math.max(x[3],y[3])];group.rects.splice(b,1);changed=true;break outer;}
    }}
    for(const [lo,hi,y0,y1]of group.rects){
      const center=group.axis===0?[group.p,(y0+y1)/2,(lo+hi)/2]:[(lo+hi)/2,(y0+y1)/2,group.p];
      const interior=center[2]<-40.9&&center[0]>-17.6&&center[0]<17.6;
      const wall=plane(group.axis,group.p,group.n,regionAt(center,interior),interior);
      const nx=Math.max(1,Math.ceil((hi-lo)/3.4)),ny=Math.max(1,Math.ceil((y1-y0)/3.5));
      for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
        const a=lo+(hi-lo)*col/nx,b=lo+(hi-lo)*(col+1)/nx,c=y0+(y1-y0)*row/ny,d=y0+(y1-y0)*(row+1)/ny;
        const w=b-a,h=d-c;if(w<.45||h<.45)continue;
        const timber=.115;
        for(const u of [a+timber/2,b-timber/2])wall.box('wood_pallet',u,(c+d)/2,timber,h-.025,.060,.024,.009);
        for(const y of [c+timber/2,d-timber/2])wall.box('wood_pallet',(a+b)/2,y,w-.025,timber,.060,.027,.009);
        if(w>1.5&&h>1.2){
          wall.beam('wood_pallet',a+.16,c+.15,b-.16,d-.15,.105,.042,.063,.006);
          // Small bolt heads catch highlights at real timber joints.
          for(const [u,y]of[[a+.08,c+.08],[b-.08,c+.08],[a+.08,d-.08],[b-.08,d-.08]])wall.box('steel_dark',u,y,.030,.030,.014,.064,0);
        }
        // Two narrow flat straps make the large shipping cases mechanically
        // plausible without turning their silhouette into a new obstacle.
        if(w>2.3)for(const u of [a+w*.26,a+w*.74])wall.box('steel_dark',u,(c+d)/2,.028,h-.02,.012,.067,0);
        stats.cratePanels++;
      }
    }
  }

  // A surrounding freight district closes the otherwise empty blue horizon.
  // Everything is outside the native playable bounds, with a generous setback.
  // The source buildings remain the foreground silhouette and occluders. These
  // distant masses use only the original material library and three batches;
  // no lights, collision, navigation, or shadow-map work is added.
  const skylineStart=stats.triangles, districtGround=-1.3;
  const skyline={warehouses:0,silos:0,utilityFrames:0,triangles:0,batches:3};
  box('concrete_dirty',[-360,districtGround-.25,-38],[560,.5,310],0,false,'skyline');
  box('concrete_dirty',[22,districtGround-.25,-370],[204,.5,560],0,false,'skyline');
  function districtBox(material,p,size,bevel=0){box(material,p,size,bevel,false,'skyline');}
  function districtCylinder(material,x,z,radius,height,y=districtGround,sides=20,topRadius=radius){
    const g=ot(topRadius,radius,height,sides);g.translate(x,y+height/2,z);add(g,material,false,'skyline');
  }
  function pitchedRoof(x,z,width,depth,y,rise){
    const x0=x-width/2,x1=x+width/2,z0=z-depth/2,z1=z+depth/2;
    const vertices=[
      [x0,y,z0],[x,y+rise,z0],[x,y+rise,z1],[x0,y,z1],
      [x,y+rise,z0],[x1,y,z0],[x1,y,z1],[x,y+rise,z1],
      [x0,y,z0],[x1,y,z0],[x,y+rise,z0],
      [x0,y,z1],[x,y+rise,z1],[x1,y,z1]
    ],indices=[0,2,1,0,3,2,4,6,5,4,7,6,8,10,9,11,13,12],p=[],uv=[];
    for(const index of indices){const v=vertices[index];p.push(...v);uv.push(v[0],v[2]+v[1]);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.computeVertexNormals();add(g,'paint_grey',false,'skyline');
  }
  for(const building of [
    [-108,-101,32,24,10,1.8],[-150,-66,42,27,12,2.4],[-106,-140,42,28,14,2.2],
    [-169,-115,39,33,11,2.0],[-144,-19,34,26,13,2.0],[-165,31,48,28,10,1.7],
    [-52,-151,38,29,13,2.2],[-7,-169,43,34,15,2.3],[43,-151,31,28,12,1.7],
    [-218,-28,48,40,18,2.4],[-224,-86,36,32,14,2.0]
  ]){
    const [x,z,w,d,h,rise]=building,y=districtGround+h;
    districtBox('concrete_dirty',[x,districtGround+h/2,z],[w,h,d]);
    // A shallow base and parapet tie each building to its terrain and roof.
    districtBox('steel_dark',[x,districtGround+.28,z],[w+.25,.56,d+.25]);
    pitchedRoof(x,z,w+.55,d+.55,y,rise);
    for(const side of [-1,1]){
      districtBox('steel_dark',[x+side*w/2,y-.12,z],[.16,.24,d+.35]);
      // A single clerestory band is visible at distance; no repeated emissive
      // window grid competes with the mission or the original map landmarks.
      districtBox('steel_dark',[x+side*(w/2+.018),y-2.3,z],[.035,1.14,d*.72]);
    }
    for(const dz of [-d/2,d/2]){
      districtBox('paint_grey',[x,districtGround+h*.29,z+dz+Math.sign(dz)*.025],[w*.20,h*.58,.08]);
      districtBox('steel_dark',[x,districtGround+h*.58+.07,z+dz+Math.sign(dz)*.06],[w*.21,.18,.12]);
    }
    // One connected rooftop ventilation box, readable as a manufactured form.
    const ventY=y+rise*.54;
    districtBox('steel_dark',[x+w*.23,ventY+.03,z-d*.18],[3.2,.36,2.2]);
    districtBox('paint_grey',[x+w*.23,ventY+.65,z-d*.18],[2.9,1.05,1.9]);
    skyline.warehouses++;
  }
  // Grounded silo clusters form a restrained port-industrial skyline. Rings,
  // hoppers and shared service pipes provide scale without high-frequency noise.
  for(const cluster of [
    {x:-139,z:-144,r:2.9,h:20,count:3},
    {x:-182,z:-43,r:3.1,h:17,count:2,alongZ:true},
    {x:68,z:-170,r:3.4,h:19,count:2}
  ]){
    const spacing=cluster.r*2+.9;
    for(let j=0;j<cluster.count;j++){
      const offset=(j-(cluster.count-1)/2)*spacing;
      const x=cluster.x+(cluster.alongZ?0:offset),z=cluster.z+(cluster.alongZ?offset:0),r=cluster.r,h=cluster.h;
      districtCylinder('concrete_dirty',x,z,r+.5,.52);
      districtCylinder('paint_grey',x,z,r,h,districtGround+.5);
      districtCylinder('paint_grey',x,z,r,1.15,districtGround+h+.5,20,.18);
      for(const yy of [3.8,h-2.0])districtCylinder('steel_dark',x,z,r+.045,.09,districtGround+yy);
      districtCylinder('steel_dark',x,z,.21,.70,districtGround+h+1.65,8);
      pipe('steel_dark',[x+r+.12,districtGround+.1,z],[x+r+.12,districtGround+h-.35,z],.10,false,'skyline');
      skyline.silos++;
    }
    const half=(cluster.count-1)*spacing/2;
    pipe('steel_dark',[cluster.x-(cluster.alongZ?0:half),cluster.h+districtGround-.6,cluster.z-(cluster.alongZ?half:0)],
      [cluster.x+(cluster.alongZ?0:half),cluster.h+districtGround-.6,cluster.z+(cluster.alongZ?half:0)],.13,false,'skyline');
  }
  // A short service bridge belongs to the plant. Its four legs and diagonal
  // bracing terminate on pads, so there are no floating distant fixtures.
  const bridge={x:-147,z:-112,w:18,d:3.2,h:16};
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const x=bridge.x+sx*bridge.w/2,z=bridge.z+sz*bridge.d/2;
    districtBox('concrete_dirty',[x,districtGround+.20,z],[1.0,.4,1.0]);
    districtBox('steel_dark',[x,districtGround+bridge.h/2,z],[.32,bridge.h,.32]);
  }
  for(const sz of [-1,1]){
    const z=bridge.z+sz*bridge.d/2,y=districtGround+bridge.h;
    districtBox('steel_dark',[bridge.x,y,z],[bridge.w+.35,.45,.25]);
    beam('steel_dark',[bridge.x-bridge.w/2,districtGround+.5,z],[bridge.x+bridge.w/2,y-.35,z],.15,.15,0,false,'skyline');
  }
  for(const dx of [-bridge.w/2,0,bridge.w/2])districtBox('steel_dark',[bridge.x+dx,districtGround+bridge.h+.15,bridge.z],[.20,.20,bridge.d+.1]);
  for(const dz of [-.65,.65])pipe('paint_grey',[bridge.x-bridge.w/2,districtGround+bridge.h+.4,bridge.z+dz],
    [bridge.x+bridge.w/2,districtGround+bridge.h+.4,bridge.z+dz],.22,false,'skyline');
  skyline.utilityFrames++;skyline.triangles=stats.triangles-skylineStart;stats.skyline=skyline;

  for(const [key,b]of batches){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));
    g.computeBoundingSphere();g.computeBoundingBox();
    let material=/^(wood_|concrete|brick$|steel_galv$|steel_worn$)/.test(b.material)
      ?assaultMaterial(i,b.material,b.interior,false,{vertexColors:false})
      :i.mats.get(b.material,{interior:b.interior});
    if(b.region==='skyline'){
      // A separate material instance keeps the foreground bank untouched.
      // Muted blue-grey albedo and shallow relief keep the remote district
      // subordinate; the engine supplies atmospheric light and haze.
      const source=material;material=source.clone();material.defines={...source.defines};material.onBeforeCompile=source.onBeforeCompile;
      material.customProgramCacheKey=()=>source.customProgramCacheKey()+'|assault-distant-district';
      material.color.set(0x516b80);material.emissive.set(0x000000);material.emissiveIntensity=0;
      material.metalness=0;material.roughness=.96;material.normalScale.multiplyScalar(.18);
    }
    const mesh=new T.Mesh(g,material);
    mesh.name='construction-'+key;mesh.castShadow=b.region!=='skyline';mesh.receiveShadow=b.region!=='skyline';root.add(mesh);
  }
  stats.meshes=root.children.length;
  stats.regions=Object.fromEntries([...new Set([...batches.values()].map(b=>b.region))].map(r=>[r,[...batches.values()].filter(b=>b.region===r).length]));
  return {root,stats};
}
