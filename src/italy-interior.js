/* Shallow, source-supported joinery. Polygon boundary segments, rather than
 * wall bounding boxes, keep every native doorway/window/stair opening clear.
 * This is render-only finishing; source collision remains authoritative. */
function italyInteriorFinish(i,map,parent){
  const T=i.THREE,root=new T.Group();root.name='italy-interior-finish';parent.add(root);
  const stats={version:1,referenceMode:i.params?.italyMaterials==='source',sourceTextures:['wlPaper','wlPaper1'],maxProjection:.024,collisionChanges:0,planeMovement:0,sourceFaces:[],segments:[],baseSegments:0,crownSegments:0,candidateEdges:0,unsupportedEdges:0,wallClippedEdges:0,triangles:0,drawCalls:0};
  if(stats.referenceMode)return{root,stats};
  const EPS=1e-5,sourceByFace=new Map();
  for(const surface of map.surfaces)if(surface.visible!==false)for(const id of surface.faceIds)sourceByFace.set(id,surface);
  const vecKey=p=>p.map(v=>Math.round(v*10000)).join(','),mix=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t),length=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
  function triangles(face){const surface=sourceByFace.get(face.id),out=[];if(!surface)return out;for(let k=face.vertexStart*3;k<(face.vertexStart+face.vertexCount)*3;k+=9)out.push([surface.positions.slice(k,k+3),surface.positions.slice(k+3,k+6),surface.positions.slice(k+6,k+9)]);return out;}
  function interval(a,b,triangle,axes){
    const p=triangle.map(v=>[v[axes[0]],v[axes[1]]]),A=[a[axes[0]],a[axes[1]]],B=[b[axes[0]],b[axes[1]]],den=(p[1][1]-p[2][1])*(p[0][0]-p[2][0])+(p[2][0]-p[1][0])*(p[0][1]-p[2][1]);if(Math.abs(den)<1e-10)return null;
    const bary=q=>{const u=((p[1][1]-p[2][1])*(q[0]-p[2][0])+(p[2][0]-p[1][0])*(q[1]-p[2][1]))/den,v=((p[2][1]-p[0][1])*(q[0]-p[2][0])+(p[0][0]-p[2][0])*(q[1]-p[2][1]))/den;return[u,v,1-u-v];},ba=bary(A),bb=bary(B);let lo=0,hi=1;
    for(let k=0;k<3;k++){const delta=bb[k]-ba[k];if(Math.abs(delta)<1e-12){if(ba[k]<-EPS)return null;}else if(delta>0)lo=Math.max(lo,(-EPS-ba[k])/delta);else hi=Math.min(hi,(-EPS-ba[k])/delta);}return hi-lo>1e-6?{lo,hi,ids:[]}:null;
  }
  function union(values){const out=[];for(const value of values.filter(Boolean).sort((a,b)=>a.lo-b.lo)){const last=out[out.length-1];if(last&&value.lo<=last.hi+1e-5){last.hi=Math.max(last.hi,value.hi);last.ids=[...new Set([...last.ids,...value.ids])];}else out.push({...value,ids:[...value.ids]});}return out;}
  function intersect(a,b){const result=[];for(const x of a)for(const y of b){const lo=Math.max(x.lo,y.lo),hi=Math.min(x.hi,y.hi);if(hi-lo>1e-6)result.push({lo,hi,ids:[...new Set([...x.ids,...y.ids])]});}return union(result);}
  const support=new Map(),cell=4;
  for(const face of map.faces){if(face.modelId!==0||Math.abs(face.normal[1])<.999||!sourceByFace.has(face.id))continue;const kind=face.normal[1]>0?'base':'crown';for(const tri of triangles(face)){const item={tri,id:face.id,y:tri[0][1],kind};for(let x=Math.floor(face.bounds.min[0]/cell);x<=Math.floor(face.bounds.max[0]/cell);x++)for(let z=Math.floor(face.bounds.min[2]/cell);z<=Math.floor(face.bounds.max[2]/cell);z++){const key=x+','+z;if(!support.has(key))support.set(key,[]);support.get(key).push(item);}}}
  const profiles={base:[[.001,.003],[.019,.003],[.023,.011],[.023,.070],[.018,.078],[.014,.084],[.014,.103],[.006,.114],[.001,.114]],crown:[[.001,.002],[.024,.002],[.024,.019],[.018,.028],[.016,.048],[.011,.074],[.010,.096],[.001,.106]]};
  const material=i.italyMaterials.get('italy_wood',{inside:true,vertexColors:false}),batches=new Map(),seen=new Set();
  function emit(batch,a,b,c,uv){const u=b.map((v,k)=>v-a[k]),v=c.map((q,k)=>q-a[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],size=Math.hypot(...n);if(size<1e-10)return;for(const p of[a,b,c]){batch.p.push(...p);batch.n.push(...n.map(v=>v/size));}batch.uv.push(...uv);stats.triangles++;}
  function sweep(a,b,normal,kind){
    const mid=mix(a,b,.5),key=kind+':'+Math.round(mid[1]*1000)+':'+Math.floor(mid[0]/24)+','+Math.floor(mid[2]/24);let batch=batches.get(key);if(!batch){batch={p:[],n:[],uv:[]};batches.set(key,batch);}const firstVertex=batch.p.length/3,profile=profiles[kind],sign=kind==='base'?1:-1,dir=b.map((v,k)=>(v-a[k])/length(a,b)),L=length(a,b),point=(p,section)=>p.map((v,k)=>v+normal[k]*section[0]+(k===1?sign*section[1]:0));
    // Side orientation follows the signed 2D profile and segment frame.
    // Concave crown sections cannot use a centroid-facing heuristic: their
    // centroid need not lie inside every edge half-plane or the cap kernel.
    const ringA=profile.map(p=>point(a,p)),ringB=profile.map(p=>point(b,p));
    const signedArea=profile.reduce((sum,p,k)=>{const q=profile[(k+1)%profile.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
    const profileNormal=[-normal[2]*sign,0,normal[0]*sign],forward=signedArea*profileNormal.reduce((sum,v,k)=>sum+v*dir[k],0)>0;
    for(let k=0;k<profile.length;k++){
      const next=(k+1)%profile.length,quad=forward?[ringA[k],ringA[next],ringB[next],ringB[k]]:[ringA[k],ringB[k],ringB[next],ringA[next]];
      emit(batch,quad[0],quad[1],quad[2],[0,0,0,.114,L,.114]);emit(batch,quad[0],quad[2],quad[3],[0,0,L,.114,L,0]);
    }
    const capTriangles=T.ShapeUtils.triangulateShape(profile.map(p=>new T.Vector2(...p)),[]);
    for(const [ring,endSign]of[[ringA,-1],[ringB,1]])for(const indices of capTriangles){
      const p=ring[indices[0]];let q=ring[indices[1]],r=ring[indices[2]],u=q.map((v,k)=>v-p[k]),v=r.map((v,k)=>v-p[k]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if(cross.reduce((sum,v,k)=>sum+v*dir[k]*endSign,0)<0)[q,r]=[r,q];emit(batch,p,q,r,[0,0,q[0],q[1],r[0],r[1]]);
    }
    return{batch:key,firstVertex,vertexCount:batch.p.length/3-firstVertex};
  }
  for(const face of map.faces){if(face.modelId!==0||!/^wlPaper1?$/i.test(face.texture)||Math.abs(face.normal[1])>.001||!sourceByFace.has(face.id))continue;const tris=triangles(face),edges=new Map(),axes=Math.abs(face.normal[0])>.5?[2,1]:[0,1];
    for(const triangle of tris)for(let k=0;k<3;k++){const a=triangle[k],b=triangle[(k+1)%3],key=[vecKey(a),vecKey(b)].sort().join('|'),item=edges.get(key);if(item)item.count++;else edges.set(key,{a,b,third:triangle[(k+2)%3],count:1});}
    for(const edge of edges.values()){if(edge.count!==1||Math.abs(edge.a[1]-edge.b[1])>.0005||length(edge.a,edge.b)<.08)continue;const kind=edge.third[1]>edge.a[1]?'base':'crown',normal=face.normal,a=edge.a,b=edge.b,L=length(a,b);stats.candidateEdges++;
      const probeA=a.map((v,k)=>v+normal[k]*.035),probeB=b.map((v,k)=>v+normal[k]*.035),candidates=new Set();for(let x=Math.floor(Math.min(probeA[0],probeB[0])/cell);x<=Math.floor(Math.max(probeA[0],probeB[0])/cell);x++)for(let z=Math.floor(Math.min(probeA[2],probeB[2])/cell);z<=Math.floor(Math.max(probeA[2],probeB[2])/cell);z++)for(const item of support.get(x+','+z)||[])candidates.add(item);
      let spans=union([...candidates].filter(item=>item.kind===kind&&Math.abs(item.y-a[1])<.001).map(item=>{const q=interval(probeA,probeB,item.tri,[0,2]);if(q)q.ids=[item.id];return q;}));if(!spans.length){stats.unsupportedEdges++;continue;}
      for(const section of profiles[kind]){const offset=(kind==='base'?1:-1)*section[1],wa=[a[0],a[1]+offset,a[2]],wb=[b[0],b[1]+offset,b[2]];spans=intersect(spans,union(tris.map(tri=>interval(wa,wb,tri,axes))));}
      if(!spans.length){stats.wallClippedEdges++;continue;}
      for(const span of spans){const lo=Math.max(span.lo,.002/L),hi=Math.min(span.hi,1-.002/L);if((hi-lo)*L<.055)continue;const start=mix(a,b,lo),end=mix(a,b,hi),key=kind+'|'+[vecKey(start),vecKey(end)].sort().join('|')+'|'+vecKey(normal);if(seen.has(key))continue;seen.add(key);const geometryRange=sweep(start,end,normal,kind);stats[kind+'Segments']++;stats.segments.push({geometryRange,faceId:face.id,texture:face.texture,type:kind,normal:[...normal],sourceEdge:[a,b],start,end,supportFaceIds:span.ids.sort((a,b)=>a-b),projection:Math.max(...profiles[kind].map(p=>p[0])),profileHeight:Math.max(...profiles[kind].map(p=>p[1]))});}
    }
  }
  for(const [key,batch]of batches){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.name='italy-interior-profile/'+key;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);stats.drawCalls++;}
  stats.sourceFaces=[...new Set(stats.segments.map(s=>s.faceId))].sort((a,b)=>a-b);stats.sourceFaceCount=stats.sourceFaces.length;return{root,stats};
}
