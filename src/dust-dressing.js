/* Construction detail follows the original BSP faces and UV transforms.
 * These shallow details never replace a collision brush or narrow a portal.
 * Source splits are joined by their plane before window placements are tested. */
function dustDress(i,b,map){
  const T=i.THREE,root=new T.Group();root.name='dust-architectural-detail';
  const before=new Set(b.staticRoot.children),materials=i.dustMaterials;
  const stats={windows:0,doors:0,crateFaces:0,coping:0,meshes:0,triangles:0,sourceUVAligned:true,collisionChanges:0,architectureTriangles:0,copingBlocks:0,repairPockets:0,fragments:0,architecturePlacements:[]};
  const stone=materials.get('dust_stone',{vertexColors:false}),wood=materials.get('dust_crate',{vertexColors:false});
  const olive=materials.get('dust_military',{vertexColors:false}),iron=b.M('steel_dark'),steel=b.M('steel_worn');
  const V=p=>new T.Vector3(...p),batches=new Map();let architectureActive=false;
  const box=(mat,w,h,d,x,y,z)=>b.box(mat,w,h,d,x,y,z,{bevel:Math.min(.012,w*.15,h*.15,d*.15)});
  function triangle(mat,a,c,d,uv){
    if(architectureActive)stats.architectureTriangles++;
    let batch=batches.get(mat);if(!batch){batch={p:[],n:[],uv:[]};batches.set(mat,batch);}
    const n=new T.Vector3().subVectors(c,a).cross(new T.Vector3().subVectors(d,a)).normalize();
    batch.p.push(...a.toArray(),...c.toArray(),...d.toArray());batch.n.push(...n.toArray(),...n.toArray(),...n.toArray());batch.uv.push(...uv);
  }
  function quad(mat,a,c,d,e,uv=[0,0,1,0,1,1,0,1]){
    triangle(mat,a,c,d,uv.slice(0,6));triangle(mat,a,d,e,[...uv.slice(0,2),...uv.slice(4,8)]);
  }
  // Build a planar texture atlas chart from the source triangles. Candidate
  // joinery must fit all four corners plus the arch crown in the actual face.
  const charts=new Map();
  for(const s of map.surfaces||[]){
    if(!/SandWll(?:Wndw|Door)/i.test(s.texture)||!s.uvSource)continue;
    for(let k=0;k<s.positions.length;k+=9){
      const n=s.normals.slice(k,k+3);if(Math.abs(n[1])>.02)continue;
      const p=[0,3,6].map(d=>V(s.positions.slice(k+d,k+d+3))),uv=[0,2,4].map(d=>s.uvSource.slice(k/3*2+d,k/3*2+d+2));
      const plane=p[0].dot(V(n)),key=s.texture+':'+n.map(x=>x.toFixed(3)).join(',')+':'+plane.toFixed(3);
      let chart=charts.get(key);if(!chart){chart={texture:s.texture,n:V(n),triangles:[],min:[Infinity,Infinity],max:[-Infinity,-Infinity]};charts.set(key,chart);}
      chart.triangles.push({p,uv});
      for(const t of uv)for(let a=0;a<2;a++){chart.min[a]=Math.min(chart.min[a],t[a]);chart.max[a]=Math.max(chart.max[a],t[a]);}
    }
  }
  function weights(t,u,v){
    const [a,c,d]=t.uv,den=(c[1]-d[1])*(a[0]-d[0])+(d[0]-c[0])*(a[1]-d[1]);if(Math.abs(den)<1e-9)return null;
    const q=((c[1]-d[1])*(u-d[0])+(d[0]-c[0])*(v-d[1]))/den,r=((d[1]-a[1])*(u-d[0])+(a[0]-d[0])*(v-d[1]))/den;
    return [q,r,1-q-r];
  }
  function inside(chart,u,v){return chart.triangles.some(t=>{const w=weights(t,u,v);return w&&w.every(x=>x>=-.0002);});}
  function mapped(chart,u,v,depth=.035){
    const t=chart.triangles[0],w=weights(t,u,v);return new T.Vector3().addScaledVector(t.p[0],w[0]).addScaledVector(t.p[1],w[1]).addScaledVector(t.p[2],w[2]).addScaledVector(chart.n,depth);
  }
  function strip(chart,mat,a,c,thickness=.065,depth=.065){
    const p=mapped(chart,...a,depth),q=mapped(chart,...c,depth),delta=q.clone().sub(p),len=delta.length();
    const side=chart.n.clone().cross(delta).normalize().multiplyScalar(thickness/2),back=chart.n.clone().multiplyScalar(-.055);
    const aa=p.clone().add(side),cc=q.clone().add(side),dd=q.clone().sub(side),ee=p.clone().sub(side);
    // Front is wound toward the actual outward BSP normal.
    quad(mat,aa,ee,dd,cc,[0,0,0,thickness,len,thickness,len,0]);
    quad(mat,aa,cc,cc.clone().add(back),aa.clone().add(back));
    quad(mat,ee,ee.clone().add(back),dd.clone().add(back),dd);
  }
  for(const chart of charts.values()){
    const window=/Wndw/.test(chart.texture),left=window?.19:.025,right=window?.81:.975,bottom=window?.50:0,spring=window?.80:.66,top=window?.935:.975;
    for(let u=Math.floor(chart.min[0]);u<Math.ceil(chart.max[0]);u++)for(let v=Math.floor(chart.min[1]);v<Math.ceil(chart.max[1]);v++){
      const probes=[[left,bottom+.005],[right,bottom+.005],[left,spring],[right,spring],[.5,top]];
      if(!probes.every(p=>inside(chart,u+p[0],v+p[1])))continue;
      const p=mapped(chart,u+left,v+bottom),q=mapped(chart,u+right,v+bottom),width=p.distanceTo(q);
      // Very small or cropped texture fragments should stay texture detail.
      if(width<.7||width>5.2)continue;
      const frame=window?stone:wood;
      strip(chart,frame,[u+left,v+bottom],[u+left,v+spring],.085,.07);
      strip(chart,frame,[u+right,v+bottom],[u+right,v+spring],.085,.07);
      for(let j=0;j<16;j++){
        const angle=j*Math.PI/16,next=(j+1)*Math.PI/16,radius=(right-left)/2;
        const a=[u+.5+radius*Math.cos(angle),v+spring+(top-spring)*Math.sin(angle)],c=[u+.5+radius*Math.cos(next),v+spring+(top-spring)*Math.sin(next)];
        strip(chart,frame,a,c,.09,.075);
      }
      if(window){
        // A projecting stone sill gives a real contact shadow. The wooden
        // divider and iron straps retain the authored shutter proportions.
        strip(chart,stone,[u+left-.025,v+bottom],[u+right+.025,v+bottom],.13,.13);
        strip(chart,wood,[u+.5,v+bottom+.009],[u+.5,v+top-.025],.045,.035);
        for(const y of [bottom+.06,spring-.025])strip(chart,iron,[u+left+.015,v+y],[u+right-.015,v+y],.035,.055);
        stats.windows++;
      }else{
        for(const y of [.2,.64])for(const side of [-1,1])strip(chart,iron,[u+.5+side*.06,v+y],[u+.5+side*.43,v+y],.055,.055);
        // Original Saltline metal rods make the door's latch hardware.
        for(const side of [-1,1]){
          const a=mapped(chart,u+.5+side*.055,v+.41,.078),c=mapped(chart,u+.5+side*.055,v+.45,.078);
          b.rod(steel,a.toArray(),c.toArray(),.018,{seg:8});
        }
        stats.doors++;
      }
    }
  }
  // Native cover stays native cover: modelled sawn edge boards and corner
  // iron fit inside each original rectangular case face. No replacement box
  // changes visibility, shooting cover, collision or navigation dimensions.
  const used=new Set();
  // Trigger-only crate brushes are permanent stock cover, so their hardware
  // is static too. Truly destructible brushes stay owned by their actor group.
  const coverFaces=[...(map.faces||[]),...(map.breakables||[]).filter(d=>d.triggerOnly).flatMap(d=>d.faces||[])];
  const coverSurfaces=new Map([...(map.surfaces||[]),...(map.breakables||[]).filter(d=>d.triggerOnly).flatMap(d=>d.surfaces||[])].map(s=>[s.modelId+':'+s.texture,s]));
  function polygonFrame(f,mat){
    const source=coverSurfaces.get(f.modelId+':'+f.texture);if(!source)return;
    const points=source.positions.slice(f.vertexStart*3,(f.vertexStart+f.vertexCount)*3),edges=new Map(),normal=V(f.normal),center=V(f.center);
    const key=p=>p.toArray().map(v=>v.toFixed(5)).join(',');
    for(let k=0;k<points.length;k+=9){const p=[0,3,6].map(d=>V(points.slice(k+d,k+d+3)));for(let j=0;j<3;j++){
      const a=p[j],c=p[(j+1)%3],id=[key(a),key(c)].sort().join('|'),entry=edges.get(id);if(entry)entry.count++;else edges.set(id,{a,c,count:1});
    }}
    for(const edge of edges.values())if(edge.count===1){
      const tangent=edge.c.clone().sub(edge.a),len=tangent.length();if(len<.24)continue;tangent.normalize();
      const side=normal.clone().cross(tangent).normalize(),mid=edge.a.clone().add(edge.c).multiplyScalar(.5),inward=Math.sign(center.clone().sub(mid).dot(side))||1;
      const inset=side.clone().multiplyScalar(inward*.047),out=normal.clone().multiplyScalar(.055),half=side.clone().multiplyScalar(.047);
      const p=edge.a.clone().addScaledVector(tangent,.045).add(inset).add(out),q=edge.c.clone().addScaledVector(tangent,-.045).add(inset).add(out);
      const a=p.clone().add(half),c=q.clone().add(half),d=q.clone().sub(half),e=p.clone().sub(half),back=normal.clone().multiplyScalar(-.05);
      quad(mat,a,e,d,c,[0,0,0,.094,len,.094,len,0]);quad(mat,a,c,c.clone().add(back),a.clone().add(back));quad(mat,e,e.clone().add(back),d.clone().add(back),d);
    }
    stats.crateFaces++;
  }
  for(const f of coverFaces){
    if(!/Crt(?:Lrg|Sm)Sd|MltryCrteSd/.test(f.texture)||Math.abs(f.normal[1])>.85)continue;
    const military=/Mltry/.test(f.texture),frame=military?olive:wood;
    const onX=Math.abs(f.normal[0])>.99,onZ=Math.abs(f.normal[2])>.99;
    if(!onX&&!onZ){polygonFrame(f,frame);continue;}
    const axis=onX?2:0,mn=f.bounds.min,mx=f.bounds.max,w=mx[axis]-mn[axis],h=mx[1]-mn[1];
    if(w<.5||h<.5)continue;
    if(f.area<w*h*.98){polygonFrame(f,frame);continue;}
    const plane=f.center[onX?0:2],u=(mn[axis]+mx[axis])/2,y=(mn[1]+mx[1])/2,n=f.normal[onX?0:2];
    const key=[onX,plane,u,y,w,h].map(v=>typeof v==='number'?v.toFixed(3):v).join(':');if(used.has(key))continue;used.add(key);
    const add=(mat,ww,hh,du,dy,depth=.035)=>box(mat,onX?.05:ww,hh,onX?ww:.05,onX?plane+n*depth:u+du,y+dy,onX?u+du:plane+n*depth);
    for(const side of [-1,1]){add(frame,.115,h-.025,side*(w-.14)/2,0);add(frame,w-.025,.115,0,side*(h-.14)/2);}
    if(w>1.6)add(frame,.10,h-.04,0,0,.04);
    for(const x of [-1,1])for(const yy of [-1,1])add(iron,.085,.085,x*(w-.14)/2,yy*(h-.14)/2,.065);
    stats.crateFaces++;
  }
  // Forty-four triangles describe a genuinely chamfered block: six broad
  // faces, twelve bevel faces and eight clipped corners. These are centimetre
  // scale silhouettes, rather than an extra high-frequency normal texture.
  function cutBlock(mat,size,center,bevel=.018){
    const h=size.map(v=>v/2),r=Math.min(bevel,...h.map(v=>v*.4));
    function face(points,normal){
      const p=points.map(a=>V(a.map((v,k)=>v+center[k]))),n=V(normal);
      if(p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).dot(n)<0)p.reverse();
      const axis=Math.abs(normal[0])>Math.abs(normal[1])&&Math.abs(normal[0])>Math.abs(normal[2])?0:Math.abs(normal[1])>Math.abs(normal[2])?1:2;
      const axes=axis===0?[2,1]:axis===1?[0,2]:[0,1],uv=a=>[a.getComponent(axes[0]),a.getComponent(axes[1])];
      for(let j=1;j<p.length-1;j++)triangle(mat,p[0],p[j],p[j+1],[...uv(p[0]),...uv(p[j]),...uv(p[j+1])]);
    }
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const other=[0,1,2].filter(k=>k!==axis),points=[];
      for(const [s,t]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const p=[0,0,0];p[axis]=sign*h[axis];p[other[0]]=s*(h[other[0]]-r);p[other[1]]=t*(h[other[1]]-r);points.push(p);}
      const n=[0,0,0];n[axis]=sign;face(points,n);
    }
    for(let a=0;a<3;a++)for(let c=a+1;c<3;c++)for(const sa of [-1,1])for(const sc of [-1,1]){
      const d=3-a-c,p=[];for(const [which,sd]of[[0,-1],[1,-1],[1,1],[0,1]]){const q=[0,0,0];q[a]=sa*(h[a]-(which?r:0));q[c]=sc*(h[c]-(which?0:r));q[d]=sd*(h[d]-r);p.push(q);}
      const n=[0,0,0];n[a]=sa;n[c]=sc;face(p,n);
    }
    for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
      const s=[sx,sy,sz],p=[0,1,2].map(axis=>h.map((v,k)=>s[k]*(v-(k===axis?0:r))));face(p,s);
    }
  }
  const hash=(x,s=0)=>{let n=Math.imul(x+193,1021+s*17);n=Math.imul(n^(n>>>15),2246822519);return ((n^(n>>>13))>>>0)/4294967295;};
  const sourceFloors=[];
  for(const s of map.surfaces||[])for(let k=0;k<s.positions.length;k+=9){
    if(s.normals[k+1]<.72)continue;const p=[0,3,6].map(d=>s.positions.slice(k+d,k+d+3));
    sourceFloors.push({p,minX:Math.min(...p.map(q=>q[0])),maxX:Math.max(...p.map(q=>q[0])),minZ:Math.min(...p.map(q=>q[2])),maxZ:Math.max(...p.map(q=>q[2]))});
  }
  function floorAt(x,z,maxY){
    let best=-Infinity;
    for(const f of sourceFloors){
      if(x<f.minX-.001||x>f.maxX+.001||z<f.minZ-.001||z>f.maxZ+.001)continue;
      const [a,c,d]=f.p,den=(c[2]-d[2])*(a[0]-d[0])+(d[0]-c[0])*(a[2]-d[2]);if(Math.abs(den)<1e-8)continue;
      const q=((c[2]-d[2])*(x-d[0])+(d[0]-c[0])*(z-d[2]))/den,r=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/den;
      if(q<-.001||r<-.001||q+r>1.001)continue;const y=a[1]*q+c[1]*r+d[1]*(1-q-r);if(y<=maxY&&y>best)best=y;
    }return Number.isFinite(best)?best:null;
  }
  architectureActive=true;
  // Most native parapet tops use SandCCrete, not SandTrim. Segment the actual
  // narrow horizontal source spans into large dressed stones with open joints.
  // Roof-only selection leaves every player stair, ramp and low cover top alone.
  const capped=[];
  for(const f of map.faces||[]){
    if(f.normal[1]<.99||f.center[1]<4||!['dust_plaster','dust_stone','dust_trim'].includes(f.material))continue;
    const mn=f.bounds.min,mx=f.bounds.max,w=mx[0]-mn[0],d=mx[2]-mn[2];
    if(Math.min(w,d)>.92||Math.min(w,d)<.25||Math.max(w,d)<1.1||f.area<w*d*.985)continue;
    const alongX=w>d,length=Math.max(w,d),count=Math.ceil(length/1.18),pitch=length/count,beforeBlocks=stats.copingBlocks;
    for(let k=0;k<count;k++){
      if(stats.architectureTriangles+44>14000)break;
      const cx=alongX?mn[0]+pitch*(k+.5):(mn[0]+mx[0])/2,cz=alongX?(mn[2]+mx[2])/2:mn[2]+pitch*(k+.5);
      // Adjacent BSP faces occasionally overlap at a cut. Reject duplicate cap
      // centres so no co-planar edges can produce the former dotted artifact.
      if(capped.some(p=>Math.hypot(p[0]-cx,p[2]-cz)<.20&&Math.abs(p[1]-f.center[1])<.01))continue;
      const thickness=.115+hash(f.id,k)*.02,span=pitch-.025;
      cutBlock(stone,[alongX?span:w+.035,thickness,alongX?d+.035:span],[cx,f.center[1]+thickness*.5+.002,cz],.022);
      capped.push([cx,f.center[1],cz]);stats.copingBlocks++;
    }
    if(stats.copingBlocks>beforeBlocks){stats.coping++;stats.architecturePlacements.push({kind:'coping',faceId:f.id,sourceBounds:f.bounds,blocks:stats.copingBlocks-beforeBlocks,maxProjection:.018,maxHeight:.137});}
  }
  const plaster=materials.get('dust_plaster',{vertexColors:false}),repairs=[];
  const repairStone=stone.clone();repairStone.name='dust-exposed-masonry';
  repairStone.color.setRGB(.94,.87,.76);repairStone.normalScale.multiplyScalar(.65);
  repairStone.onBeforeCompile=stone.onBeforeCompile;repairStone.customProgramCacheKey=()=>stone.customProgramCacheKey()+'|exposed-masonry';
  const candidates=(map.faces||[]).filter(f=>f.material==='dust_plaster'&&Math.abs(f.normal[1])<.01&&f.area>5).sort((a,c)=>c.area-a.area);
  for(const f of candidates){
    if(repairs.length>=30||stats.architectureTriangles>19000)break;
    const onX=Math.abs(f.normal[0])>.99,onZ=Math.abs(f.normal[2])>.99;if(!onX&&!onZ)continue;
    const axis=onX?2:0,mn=f.bounds.min,mx=f.bounds.max,width=mx[axis]-mn[axis],height=mx[1]-mn[1];
    if(width<2.8||height<1||f.area<width*height*.985)continue;
    const tangent=onX?[0,0,-f.normal[0]]:[f.normal[2],0,0],u=(mn[axis]+mx[axis])*.5+(hash(f.id,2)-.5)*Math.min(width-2,.8);
    const x=onX?f.center[0]:u,z=onX?u:f.center[2],floor=floorAt(x+f.normal[0]*.16,z+f.normal[2]*.16,mn[1]+.15);
    if(floor===null||Math.abs(floor-mn[1])>1.0||mx[1]-floor<1.1)continue;
    if(repairs.some(p=>Math.hypot(p[0]-x,p[2]-z)<8.5&&Math.abs(p[1]-floor)<2))continue;
    const patchW=Math.min(width-.5,1.25+hash(f.id,4)*.75),patchH=.42+hash(f.id,5)*.35;
    const cy=Math.max(floor+.38+patchH*.5,mn[1]+patchH*.5+.10);
    if(cy+patchH*.6>mx[1]-.1)continue;
    const point=(du,dy,depth)=>V([x+tangent[0]*du+f.normal[0]*depth,cy+dy,z+tangent[2]*du+f.normal[2]*depth]);
    // Fracture follows short, irregular construction-led steps. The former
    // convex oval and continuous raised rim read as an applied badge. Here
    // only local flakes project, with a broken 4–12 mm lip and quiet substrate.
    const shape=[[-.52,-.15],[-.50,.08],[-.32,.11],[-.32,.28],[-.12,.27],[-.10,.38],[.18,.33],[.20,.18],[.39,.18],[.38,.03],[.49,-.04],[.43,-.22],[.15,-.21],[.12,-.32],[-.18,-.29],[-.22,-.15]];
    const outline=shape.map((p,k)=>[p[0]+(hash(f.id,k+31)-.5)*.035,p[1]+(hash(f.id,k+47)-.5)*.055]);
    const center=point(0,0,.004),uv=p=>[p.x*tangent[0]+p.z*tangent[2],p.y];
    for(let j=0;j<outline.length;j++){
      const a=outline[j],c=outline[(j+1)%outline.length],innerA=point(a[0]*patchW,a[1]*patchH,.004),innerC=point(c[0]*patchW,c[1]*patchH,.004);
      triangle(repairStone,center,innerC,innerA,[...uv(center),...uv(innerC),...uv(innerA)]);
      if(hash(f.id,j+63)<.32)continue;
      const relief=.008+hash(f.id,j+79)*.008,spread=.012+hash(f.id,j+97)*.02;
      const lipA=point(a[0]*patchW,a[1]*patchH,relief),lipC=point(c[0]*patchW,c[1]*patchH,relief*.86),outerA=point(a[0]*patchW*(1+spread),a[1]*patchH*(1+spread*1.5),.005),outerC=point(c[0]*patchW*(1+spread),c[1]*patchH*(1+spread*1.5),.005);
      quad(plaster,lipA,lipC,outerC,outerA,[...uv(lipA),...uv(lipC),...uv(outerC),...uv(outerA)]);
      quad(plaster,innerA,innerC,lipC,lipA,[...uv(innerA),...uv(innerC),...uv(lipC),...uv(lipA)]);
    }
    stats.repairPockets++;repairs.push([x,floor,z]);
    stats.architecturePlacements.push({kind:'repair',faceId:f.id,pos:[x,cy,z],floor,extent:[patchW,patchH],maxProjection:.016});
    // A few sizeable fallen render pieces sit inside the capsule's existing
    // wall clearance. All footprint corners must have matching source support.
    for(let k=0;k<3;k++){
      const du=(hash(f.id,k+7)-.5)*patchW*.8,offset=.09+hash(f.id,k+11)*.08,cx=x+tangent[0]*du+f.normal[0]*offset,cz=z+tangent[2]*du+f.normal[2]*offset;
      const sx=.09+hash(f.id,k+15)*.09,sz=.07+hash(f.id,k+19)*.05,sy=.025+hash(f.id,k+23)*.03;
      const samples=[[-sx/2,-sz/2],[-sx/2,sz/2],[sx/2,-sz/2],[sx/2,sz/2]].map(([dx,dz])=>floorAt(cx+dx,cz+dz,floor+.08));
      if(samples.some(y=>y===null||Math.abs(y-floor)>.04))continue;
      cutBlock(k===1?repairStone:plaster,[sx,sy,sz],[cx,Math.max(...samples)+sy/2+.002,cz],.009);stats.fragments++;
    }
  }
  architectureActive=false;
  if(stats.architectureTriangles>20000)throw new Error('Dust architectural detail exceeds its20k triangle budget');
  for(const [mat,batch]of batches){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));g.computeBoundingSphere();
    const mesh=new T.Mesh(g,mat);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  }
  const staging=new T.Group();
  for(const child of [...b.staticRoot.children])if(!before.has(child))staging.add(child);
  staging.updateMatrixWorld(true);root.add(By(staging));
  // Centimetre-deep sills/caps are below the directional shadow-map texel
  // footprint in distant views. Their dithered self-shadow made dotted bands
  // beneath windows. Keep real silhouettes, AO and received building shadows;
  // reserve shadow casting for source architecture and substantial joinery.
  root.traverse(o=>{if(o.isMesh){if(o.material===stone||o.material===plaster||o.material===repairStone)o.castShadow=false;stats.meshes++;stats.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
  return {root,stats,update(){}};
}
