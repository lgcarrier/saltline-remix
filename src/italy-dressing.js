/* Italy architectural detail is anchored to native BSP planes and UV charts.
 * Static meshes are spatially batched. Decoration does not change collision,
 * portal widths or source sightlines; market fruit occupies native pile cover.
 * Original MDL files are absent from the supplied archive: chickens and wine
 * bottles below are new geometry, positioned at the retained source entities. */
function italyCanopyFaceIds(){return[5257,5258,5259,5260,5261,5262,5263,5264,5265,5266,5267,5271,5280,5288,5289,5399,5400,5401,5418,5419,5814,5815,5816,5817,5818,5819,5820,5821,5822,5823,5824,5828,5829,5830,5831,5838,5839,5841,5870,5961,5964,5965];}
/* Closed painted windows gain visual reveals only. This render-only plan never
 * mutates source surfaces or collision. Each UV cut is fully backed and its
 * boundary is covered by the same source-aligned casing in italyDress(). */
function italyWindowRecessPlan(i,map){
  const T=i.THREE,V=p=>new T.Vector3(...p),charts=new Map(),triangleChart=new Map();
  const layouts={bStuccoWnd:[.374,.303,.627,.932],wlStuccoWnd:[.318,.274,.649,.900],shutteredWindow:[.238,.015,.766,.985],floweredWindow:[.035,.02,.965,.98],windowWhite:[.035,.02,.965,.98]};
  const stats={version:1,windows:0,byTexture:{},renderOnly:true,collisionChanges:0,sourceAreaRemoved:0,backPanelArea:0,inputTriangles:0,outputTriangles:0,rejectedIncomplete:0,rejectedThinWall:0};
  const cross=(a,c,d)=>(c[0]-a[0])*(d[1]-a[1])-(c[1]-a[1])*(d[0]-a[0]);
  function clip(poly,axis,edge,greater){const out=[];if(!poly.length)return out;for(let j=0;j<poly.length;j++){const a=poly[j],c=poly[(j+1)%poly.length],da=(a.uvSource[axis]-edge)*(greater?1:-1),dc=(c.uvSource[axis]-edge)*(greater?1:-1),ina=da>=-1e-10,inc=dc>=-1e-10;if(ina)out.push(a);if(ina!==inc){const t=da/(da-dc),q={};for(const key of['p','n','uvSource','uvMeters','vertexLight'])q[key]=a[key].map((v,k)=>v+(c[key][k]-v)*t);q.uvSource[axis]=edge;out.push(q);}}return out.filter((v,j,a)=>!j||Math.hypot(v.uvSource[0]-a[j-1].uvSource[0],v.uvSource[1]-a[j-1].uvSource[1])>1e-10);}
  const area=poly=>{let sum=0;for(let j=1;j+1<poly.length;j++)sum+=Math.abs(cross(poly[0].uvSource,poly[j].uvSource,poly[j+1].uvSource))/2;return sum;};
  const inRect=(poly,r)=>clip(clip(clip(clip(poly,0,r[0],true),0,r[2],false),1,r[1],true),1,r[3],false);
  for(let si=0;si<map.surfaces.length;si++){const s=map.surfaces[si];if(s.modelId!==0||!layouts[s.texture]||!s.uvSource)continue;
    for(let k=0;k<s.positions.length;k+=9){const n=V(s.normals.slice(k,k+3));if(Math.abs(n.y)>.001)continue;const p=[0,3,6].map(j=>V(s.positions.slice(k+j,k+j+3))),uv=[0,2,4].map(j=>s.uvSource.slice(k/3*2+j,k/3*2+j+2)),du=uv[1][0]-uv[0][0],dv=uv[1][1]-uv[0][1],eu=uv[2][0]-uv[0][0],ev=uv[2][1]-uv[0][1],det=du*ev-eu*dv;if(Math.abs(det)<1e-9)continue;
      const a=p[1].clone().sub(p[0]),c=p[2].clone().sub(p[0]),U=a.clone().multiplyScalar(ev).addScaledVector(c,-dv).multiplyScalar(1/det),W=c.clone().multiplyScalar(du).addScaledVector(a,-eu).multiplyScalar(1/det),origin=p[0].clone().addScaledVector(U,-uv[0][0]).addScaledVector(W,-uv[0][1]),key=s.texture+':'+[...n.toArray(),...U.toArray(),...W.toArray(),...origin.toArray()].map(v=>(Math.round(v*1000)/1000).toFixed(3)).join(',');
      let chart=charts.get(key);if(!chart){chart={key,texture:s.texture,n,U,V:W,origin,min:[Infinity,Infinity],max:[-Infinity,-Infinity],triangles:[],windows:[]};charts.set(key,chart);}const triangle=[];for(let j=0;j<3;j++){const offset=k+j*3,q=offset/3*2;triangle.push({p:s.positions.slice(offset,offset+3),n:s.normals.slice(offset,offset+3),uvSource:s.uvSource.slice(q,q+2),uvMeters:s.uvMeters.slice(q,q+2),vertexLight:s.vertexLight?.slice(offset,offset+3)||[1,1,1]});}chart.triangles.push(triangle);triangleChart.set(si+':'+k,chart);for(const v of uv)for(let axis=0;axis<2;axis++){chart.min[axis]=Math.min(chart.min[axis],v[axis]);chart.max[axis]=Math.max(chart.max[axis],v[axis]);}
    }
  }
  const ray=new T.Ray(),ra=new T.Vector3(),rc=new T.Vector3(),rd=new T.Vector3(),hit=new T.Vector3(),collision=map.collision.positions;
  function inwardThickness(p,n){ray.origin.copy(p).addScaledVector(n,-.002);ray.direction.copy(n).negate();let nearest=.9;for(let k=0;k<collision.length;k+=9){ra.fromArray(collision,k);rc.fromArray(collision,k+3);rd.fromArray(collision,k+6);if(ray.intersectTriangle(ra,rc,rd,false,hit)){const d=hit.distanceTo(ray.origin)+.002;if(d>.004&&d<nearest)nearest=d;}}return nearest;}
  const windows=[];
  for(const chart of charts.values()){
    const base=layouts[chart.texture],metric=chart.U.clone().cross(chart.V).length();
    for(let u=Math.floor(chart.min[0]);u<Math.ceil(chart.max[0]);u++)for(let v=Math.floor(chart.min[1]);v<Math.ceil(chart.max[1]);v++){
      const rect=[u+base[0],v+base[1],u+base[2],v+base[3]],center=chart.origin.clone().addScaledVector(chart.U,(rect[0]+rect[2])/2).addScaledVector(chart.V,(rect[1]+rect[3])/2),width=(rect[2]-rect[0])*chart.U.length(),height=(rect[3]-rect[1])*chart.V.length();
      if(width<.45||width>2.8||height<.7||height>3.8)continue;
      const expected=(rect[2]-rect[0])*(rect[3]-rect[1]),covered=chart.triangles.reduce((sum,t)=>sum+area(inRect(t,rect)),0);if(Math.abs(expected-covered)>expected*.00001){stats.rejectedIncomplete++;continue;}
      let thickness=.9;for(const[x,y]of[[.12,.12],[.88,.12],[.88,.88],[.12,.88],[.5,.5]]){const p=chart.origin.clone().addScaledVector(chart.U,rect[0]+(rect[2]-rect[0])*x).addScaledVector(chart.V,rect[1]+(rect[3]-rect[1])*y);thickness=Math.min(thickness,inwardThickness(p,chart.n));}if(thickness<.16){stats.rejectedThinWall++;continue;}
      const depth=Math.min(.18,thickness*.45),record={key:chart.key+':'+u+','+v,texture:chart.texture,u,v,rect,depth,thickness,thicknessLimit:.9,thicknessIsLowerBound:thickness===.9,center:center.toArray(),normal:chart.n.toArray(),origin:chart.origin.toArray(),U:chart.U.toArray(),V:chart.V.toArray(),area:expected*metric};chart.windows.push(record);windows.push(record);stats.sourceAreaRemoved+=record.area;stats.backPanelArea+=record.area;stats.byTexture[record.texture]=(stats.byTexture[record.texture]||0)+1;
    }
  }
  const surfaces=map.surfaces.map((s,si)=>{let changed=false;for(let k=0;k<s.positions.length;k+=9)if(triangleChart.get(si+':'+k)?.windows.length){changed=true;break;}if(!changed)return s;
    const out={...s,positions:[],normals:[],uvSource:[],uvMeters:[],vertexLight:[],renderReplacement:'closed-window-recess'};
    for(let k=0;k<s.positions.length;k+=9){stats.inputTriangles++;const chart=triangleChart.get(si+':'+k),triangle=[];for(let j=0;j<3;j++){const offset=k+j*3,q=offset/3*2;triangle.push({p:s.positions.slice(offset,offset+3),n:s.normals.slice(offset,offset+3),uvSource:s.uvSource.slice(q,q+2),uvMeters:s.uvMeters.slice(q,q+2),vertexLight:s.vertexLight?.slice(offset,offset+3)||[1,1,1]});}
      let polygons=[triangle];for(const window of chart?.windows||[]){const next=[],r=window.rect;for(const poly of polygons){let remainder=poly;for(const[axis,edge,greater]of[[0,r[0],true],[0,r[2],false],[1,r[1],true],[1,r[3],false]]){const outside=clip(remainder,axis,edge,!greater);if(outside.length>2&&area(outside)>1e-12)next.push(outside);remainder=clip(remainder,axis,edge,greater);if(remainder.length<3)break;}}polygons=next;}
      for(const poly of polygons)for(let j=1;j+1<poly.length;j++){if(Math.abs(cross(poly[0].uvSource,poly[j].uvSource,poly[j+1].uvSource))<1e-12)continue;for(const q of[poly[0],poly[j],poly[j+1]]){out.positions.push(...q.p);out.normals.push(...q.n);out.uvSource.push(...q.uvSource);out.uvMeters.push(...q.uvMeters);out.vertexLight.push(...q.vertexLight);}stats.outputTriangles++;}
    }out.triangles=out.positions.length/9;return out;
  });
  // Plain stucco outside a window image must share its neighbouring facade's
  // physical material. Split against ALL repeated image rectangles, including
  // incomplete/ineligible windows, so partial frames never disappear.
  // The two border charts contain only stucco and a bottom moulding band.
  // Conservative V guards retain every moulding pixel and its edge shading.
  const facadePartitions={
    bStuccoWnd:{material:'italy_plaster_ochre',rect:layouts.bStuccoWnd},
    wlStuccoWnd:{material:'italy_plaster_cream',rect:layouts.wlStuccoWnd},
    bStuccoBrdr:{material:'italy_plaster_ochre',rect:[0,0,1,.115],trim:true},
    wlStuccoBrdr:{material:'italy_plaster_cream',rect:[0,0,1,.125],trim:true}
  };
  const partitioned=[];stats.plainFacadeTriangles=0;stats.atlasWindowTriangles=0;stats.atlasTrimTriangles=0;stats.plainFacadeArea=0;stats.facadePartitions={};
  function outputLike(s,sourceSurfaceIndex,plain){return{...s,sourceSurfaceIndex,positions:[],normals:[],uvSource:[],uvMeters:[],vertexLight:[],...(plain?{italyPlainFacade:plain}:{} )};}
  function appendPolygon(out,poly){for(let j=1;j+1<poly.length;j++){if(Math.abs(cross(poly[0].uvSource,poly[j].uvSource,poly[j+1].uvSource))<1e-12)continue;for(const q of[poly[0],poly[j],poly[j+1]]){out.positions.push(...q.p);out.normals.push(...q.n);out.uvSource.push(...q.uvSource);out.uvMeters.push(...q.uvMeters);out.vertexLight.push(...q.vertexLight);}}}
  for(let si=0;si<surfaces.length;si++){const s=surfaces[si],config=facadePartitions[s.texture],plainName=config?.material;if(!plainName){partitioned.push(s);continue;}
    const plain=outputLike(s,si,plainName),atlas=outputLike(s,si),layout=config.rect;
    for(let k=0;k<s.positions.length;k+=9){const triangle=[];for(let j=0;j<3;j++){const offset=k+j*3,q=offset/3*2;triangle.push({p:s.positions.slice(offset,offset+3),n:s.normals.slice(offset,offset+3),uvSource:s.uvSource.slice(q,q+2),uvMeters:s.uvMeters.slice(q,q+2),vertexLight:s.vertexLight?.slice(offset,offset+3)||[1,1,1]});}
      const minU=Math.floor(Math.min(...triangle.map(p=>p.uvSource[0]))),maxU=Math.ceil(Math.max(...triangle.map(p=>p.uvSource[0]))),minV=Math.floor(Math.min(...triangle.map(p=>p.uvSource[1]))),maxV=Math.ceil(Math.max(...triangle.map(p=>p.uvSource[1])));let remaining=[triangle];
      for(let u=minU;u<maxU;u+=config.trim?Math.max(1,maxU-minU):1)for(let v=minV;v<maxV;v++){const r=config.trim?[minU,v+layout[1],maxU,v+layout[3]]:[u+layout[0],v+layout[1],u+layout[2],v+layout[3]],outside=[];for(const poly of remaining){const image=inRect(poly,r);if(image.length>2&&area(image)>1e-12)appendPolygon(atlas,image);let rest=poly;for(const[axis,edge,greater]of[[0,r[0],true],[0,r[2],false],[1,r[1],true],[1,r[3],false]]){const piece=clip(rest,axis,edge,!greater);if(piece.length>2&&area(piece)>1e-12)outside.push(piece);rest=clip(rest,axis,edge,greater);if(rest.length<3)break;}}remaining=outside;}
      for(const poly of remaining)appendPolygon(plain,poly);
    }
    plain.triangles=plain.positions.length/9;atlas.triangles=atlas.positions.length/9;stats.plainFacadeTriangles+=plain.triangles;if(config.trim)stats.atlasTrimTriangles+=atlas.triangles;else stats.atlasWindowTriangles+=atlas.triangles;stats.facadePartitions[s.texture]={plainTriangles:plain.triangles,retainedArtworkTriangles:atlas.triangles,retainedUVRectangle:layout,plainMaterial:plainName};
    for(let k=0;k<plain.positions.length;k+=9){const a=V(plain.positions.slice(k,k+3)),c=V(plain.positions.slice(k+3,k+6)),d=V(plain.positions.slice(k+6,k+9));stats.plainFacadeArea+=c.sub(a).cross(d.sub(a)).length()/2;}
    if(plain.triangles)partitioned.push(plain);if(atlas.triangles)partitioned.push(atlas);
  }
  stats.windows=windows.length;stats.scope='all complete source-painted closed windows in five original chart families';return{surfaces:partitioned,windows,stats};

}
function italyDress(i,b,map){
  const T=i.THREE,root=new T.Group();root.name='italy-architectural-detail';
  const mats=i.italyMaterials,V=p=>new T.Vector3(...p),batches=new Map(),actors=new Map();
  const stats={windows:0,doors:0,archedSurrounds:0,facadeMouldings:0,roofTiles:0,eaves:0,drainpipes:0,windowBoxes:0,marketFruit:0,fruitFinishVersion:3,canopies:0,replacedCanopyFaceIds:i.params?.italyMaterials==='source'?[]:italyCanopyFaceIds(),crateFaces:0,crateBraces:0,crateSlats:0,glazedPanes:0,bottles:0,chickens:0,meshes:0,triangles:0,collisionChanges:0,sourceUVAligned:true};
  const stone=mats.get('italy_stone',{vertexColors:false}),wood=mats.get('italy_wood',{vertexColors:false}),roof=mats.get('italy_roof',{vertexColors:false}),iron=b.M('steel_dark'),brass=b.M('steel_worn');
  const simple=(name,color,roughness=.85,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name='italy/'+name;return m;};
  const leaf=simple('herb-leaves',0x425631,.84),leafLight=simple('young-leaves',0x708149,.89),soil=simple('potting-soil',0x302820,1),red=simple('tomatoes',0xd34b2c,.30),yellow=simple('lemons',0xdac344,.43),shutter=simple('faded-green-shutters',0x53645a,.84);
  shutter.normalMap=wood.normalMap;shutter.roughnessMap=wood.roughnessMap;shutter.normalScale.set(.45,.45);
  const hash=(a,c=0)=>{let n=Math.imul(a+113,1021+c*17);n=Math.imul(n^(n>>>15),2246822519);return((n^(n>>>13))>>>0)/4294967295;};
  for(const material of[red,yellow]){const lemon=material===yellow;material.vertexColors=true;material.envMapIntensity=.75;
    material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vItalyFruitWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvItalyFruitWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vItalyFruitWorld;
      float ifHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float ifNoise(vec3 p){vec3 q=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(ifHash(q),ifHash(q+vec3(1,0,0)),f.x),mix(ifHash(q+vec3(0,1,0)),ifHash(q+vec3(1,1,0)),f.x),f.y),mix(mix(ifHash(q+vec3(0,0,1)),ifHash(q+vec3(1,0,1)),f.x),mix(ifHash(q+vec3(0,1,1)),ifHash(q+vec3(1,1,1)),f.x),f.y),f.z);}
    `).replace('#include <map_fragment>',`#include <map_fragment>
      float fruitMottle=ifNoise(vItalyFruitWorld*83.);diffuseColor.rgb*=mix(.98,1.025,fruitMottle);
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+(.5-ifNoise(vItalyFruitWorld*136.))*.04,.27,.60);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float skin=ifNoise(vItalyFruitWorld*${lemon?'850.':'720.'})*${lemon?'.000004':'.0000015'};
      vec3 fruitDx=dFdx(-vViewPosition),fruitDy=dFdy(-vViewPosition),fruitR1=cross(fruitDy,normal),fruitR2=cross(normal,fruitDx);float fruitDet=dot(fruitDx,fruitR1);normal=normalize(abs(fruitDet)*normal-sign(fruitDet)*(dFdx(skin)*fruitR1+dFdy(skin)*fruitR2));
    `);};material.customProgramCacheKey=()=> 'italy-fruit-v2-'+lemon;
  }
  function tri(mat,a,c,d,uv=[0,0,1,0,1,1],normal){
    const mid=a.clone().add(c).add(d).multiplyScalar(1/3),key=mat.uuid+':'+Math.floor(mid.x/24)+','+Math.floor(mid.z/24);
    let batch=batches.get(key);if(!batch){batch={mat,p:[],n:[],uv:[],c:[]};batches.set(key,batch);}
    const n=normal||c.clone().sub(a).cross(d.clone().sub(a)).normalize();batch.p.push(...a.toArray(),...c.toArray(),...d.toArray());batch.n.push(...n.toArray(),...n.toArray(),...n.toArray());batch.uv.push(...uv);batch.c.push(1,1,1,1,1,1,1,1,1);
  }
  function quad(mat,a,c,d,e,uv=[0,0,1,0,1,1,0,1],normal){tri(mat,a,c,d,uv.slice(0,6),normal);tri(mat,a,d,e,[...uv.slice(0,2),...uv.slice(4,8)],normal);}
  function addGeo(g,mat,p=[0,0,0],scale=[1,1,1],quat){
    const geo=g.index?g.toNonIndexed():g,ps=geo.attributes.position,ns=geo.attributes.normal,uv=geo.attributes.uv;
    const transform=new T.Matrix4().compose(V(p),quat||new T.Quaternion(),V(scale)),normalMatrix=new T.Matrix3().getNormalMatrix(transform),vertices=[],normals=[];
    for(let k=0;k<ps.count;k++){vertices.push(new T.Vector3().fromBufferAttribute(ps,k).applyMatrix4(transform));normals.push(new T.Vector3().fromBufferAttribute(ns,k).applyMatrix3(normalMatrix).normalize());}
    for(let k=0;k<ps.count;k+=3){
      const a=vertices[k],c=vertices[k+1],d=vertices[k+2],mid=a.clone().add(c).add(d).multiplyScalar(1/3),key=mat.uuid+':'+Math.floor(mid.x/24)+','+Math.floor(mid.z/24);let batch=batches.get(key);if(!batch){batch={mat,p:[],n:[],uv:[],c:[]};batches.set(key,batch);}
      for(let j=0;j<3;j++){batch.p.push(...vertices[k+j].toArray());batch.n.push(...normals[k+j].toArray());batch.uv.push(uv?uv.getX(k+j):0,uv?uv.getY(k+j):0);const col=geo.attributes.color;batch.c.push(col?col.getX(k+j):1,col?col.getY(k+j):1,col?col.getZ(k+j):1);}
    }
    if(geo!==g)geo.dispose();g.dispose();
  }
  function beam(mat,a,c,w=.06,d=w){const delta=c.clone().sub(a),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());addGeo(new T.BoxGeometry(w,delta.length(),d),mat,a.clone().add(c).multiplyScalar(.5).toArray(),[1,1,1],q);}
  function rod(mat,a,c,r=.025){const delta=c.clone().sub(a),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());addGeo(new T.CylinderGeometry(r,r,delta.length(),8),mat,a.clone().add(c).multiplyScalar(.5).toArray(),[1,1,1],q);}
  // The original canopy is a thick textured BSP shell. Only its 42 fabric
  // faces are replaced; every original support and collision triangle stays.
  // New canvas preserves the footprint and ridge, with centimetre-scale sag.
  if(i.params?.italyMaterials!=='source'){
  const canvas=new T.MeshPhysicalMaterial({name:'italy/taut-blue-canvas',color:0x607b92,roughness:.91,sheen:.65,sheenColor:new T.Color(0x7990a1),sheenRoughness:.85,side:T.DoubleSide,envMapIntensity:.38});
  canvas.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vItalyCanvasUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nvItalyCanvasUV=uv;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec2 vItalyCanvasUV;
    float icHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float icNoise(vec2 p){vec2 q=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(icHash(q),icHash(q+vec2(1,0)),f.x),mix(icHash(q+vec2(0,1)),icHash(q+vec2(1,1)),f.x),f.y);}
  `).replace('#include <map_fragment>',`#include <map_fragment>
    vec2 clothUV=vItalyCanvasUV;
    float seamDistance=abs(fract(clothUV.x/1.016+.5)-.5)*1.016;
    float seam=1.-smoothstep(.003,.008,seamDistance);
    float stitch=(1.-smoothstep(.0008,.0018,abs(seamDistance-.011)))*step(.34,fract(clothUV.y/.014));
    float weaveFade=1.-smoothstep(.3,1.1,max(fwidth(clothUV.x*550.),fwidth(clothUV.y*550.)));
    float weave=sin(clothUV.x*3455.75)*sin(clothUV.y*3455.75)*weaveFade;
    float age=icNoise(clothUV*1.7);
    diffuseColor.rgb*=mix(.96,1.025,age)*(1.-seam*.035)*(1.+weave*.013);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.22,stitch*.35);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    float clothHeight=seam*.00045+weave*.000003;
    vec3 cDx=dFdx(-vViewPosition),cDy=dFdy(-vViewPosition),cR1=cross(cDy,normal),cR2=cross(normal,cDx);float cDet=dot(cDx,cR1);
    normal=normalize(abs(cDet)*normal-sign(cDet)*(dFdx(clothHeight)*cR1+dFdy(clothHeight)*cR2));
  `);};canvas.customProgramCacheKey=()=> 'italy-canvas-v1';
  const piping=simple('canvas-bound-hem',0x4d657b,.9),x0=9.9568,x1=18.0848,z0=6.2992,z1=13.208,ridgeZ=9.7536;
  const sourceRoofY=z=>-.1016-Math.abs(z-ridgeZ)*(.9144/3.4544);
  function clothY(x,z){const u=(x-x0)/(x1-x0),v=Math.abs(z-ridgeZ)/((z1-z0)*.5),sag=.038*Math.sin(Math.PI*u)**2*Math.sin(Math.PI*v);return sourceRoofY(z)+.009-sag+.004*Math.sin((x-x0)*Math.PI*2/1.016)*Math.sin(Math.PI*v);}
  function clothGrid(nx,ny,sample){const ps=[],uv=[],indices=[];for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const p=sample(x/nx,y/ny);ps.push(...p.p);uv.push(...p.uv);if(x<nx&&y<ny){const k=y*(nx+1)+x;indices.push(k,k+1,k+nx+2,k,k+nx+2,k+nx+1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();addGeo(g,canvas);}
  // Two gable slopes meet over the retained steel ridge. Fine subdivisions
  // provide real drape while the distant canopy keeps its remembered outline.
  for(const side of[-1,1])clothGrid(64,20,(u,v)=>{const x=x0+(x1-x0)*u,z=ridgeZ+side*(z1-z0)*.5*v;return{p:[x,clothY(x,z),z],uv:[x-x0,side*v*(z1-z0)*.5]};});
  const hemY=x=>-1.295+.022*Math.sin((x-x0)*Math.PI*2/2.032);
  for(const z of[z0,z1]){
    const inward=z===z0?1:-1;
    clothGrid(64,6,(u,v)=>{const x=x0+(x1-x0)*u,top=clothY(x,z),bottom=hemY(x),fold=.012*(.5+.5*Math.sin((x-x0)*Math.PI*2/.508))*Math.sin(v*Math.PI);return{p:[x,top+(bottom-top)*v,z+inward*fold],uv:[x-x0,(bottom-top)*v]};});
    for(let j=0;j<64;j++){const a=x0+(x1-x0)*j/64,c=x0+(x1-x0)*(j+1)/64;rod(piping,V([a,hemY(a),z+inward*.007]),V([c,hemY(c),z+inward*.007]),.007);}
  }
  // The source has closed triangular end cloth. Preserve that coverage, with
  // a lightly folded thin panel instead of a 10-cm solid blue slab.
  for(const x of[x0,x1]){const inward=x===x0?1:-1;clothGrid(40,8,(u,v)=>{const z=z0+(z1-z0)*u,top=clothY(x,z),bottom=-1.295+.012*Math.sin(u*Math.PI*6);return{p:[x+inward*.012*Math.sin(u*Math.PI*8)**2*Math.sin(v*Math.PI),top+(bottom-top)*v,z],uv:[z-z0,(bottom-top)*v]};});}
  stats.canopies=1;stats.canopyFootprint={min:[x0,z0],max:[x1,z1],sourceTopMaximumDeviation:.05,collision:'retained source BSP'};
  }
  const chartMap=new Map(),crateCharts=new Map(),bandCharts=new Map();
  const detail=/^(bStuccoWnd|wlStuccoWnd|shutteredWindow|woodedWindow|floweredWindow|windowWhite|windowHalf|oldDoor|oakDoor)$/i;
  for(const s of map.surfaces){
    const crate=/^(bigCrate[02]|64crate[01]|crateBox)$/i.test(s.texture),band=s.texture==='gryStuccoSpade';if((!detail.test(s.texture)&&!crate&&!band)||!s.uvSource)continue;const destination=crate?crateCharts:band?bandCharts:chartMap;
    for(let k=0;k<s.positions.length;k+=9){const n=V(s.normals.slice(k,k+3));if(Math.abs(n.y)>.025)continue;const p=[0,3,6].map(j=>V(s.positions.slice(k+j,k+j+3))),uv=[0,2,4].map(j=>s.uvSource.slice(k/3*2+j,k/3*2+j+2));
      const du=uv[1][0]-uv[0][0],dv=uv[1][1]-uv[0][1],eu=uv[2][0]-uv[0][0],ev=uv[2][1]-uv[0][1],det=du*ev-eu*dv;if(Math.abs(det)<1e-9)continue;const a=p[1].clone().sub(p[0]),c=p[2].clone().sub(p[0]),U=a.clone().multiplyScalar(ev).addScaledVector(c,-dv).multiplyScalar(1/det),chartV=c.clone().multiplyScalar(du).addScaledVector(a,-eu).multiplyScalar(1/det),origin=p[0].clone().addScaledVector(U,-uv[0][0]).addScaledVector(chartV,-uv[0][1]);const key=s.texture+':'+n.toArray().map(x=>x.toFixed(4)).join(',')+':'+p[0].dot(n).toFixed(4)+':'+[...U.toArray(),...chartV.toArray(),...origin.toArray()].map(x=>(crate||band)?x.toFixed(3):(Math.round(x*1000)/1000).toFixed(3)).join(',');let chart=destination.get(key);if(!chart){chart={texture:s.texture,n,triangles:[],min:[Infinity,Infinity],max:[-Infinity,-Infinity]};destination.set(key,chart);}chart.triangles.push({p,uv});for(const pair of uv)for(let a=0;a<2;a++){chart.min[a]=Math.min(chart.min[a],pair[a]);chart.max[a]=Math.max(chart.max[a],pair[a]);}
    }
  }
  function weights(t,u,v){const[a,c,d]=t.uv,den=(c[1]-d[1])*(a[0]-d[0])+(d[0]-c[0])*(a[1]-d[1]);if(Math.abs(den)<1e-9)return null;const q=((c[1]-d[1])*(u-d[0])+(d[0]-c[0])*(v-d[1]))/den,r=((d[1]-a[1])*(u-d[0])+(a[0]-d[0])*(v-d[1]))/den;return[q,r,1-q-r];}
  function inside(chart,u,v){return chart.triangles.some(t=>{const w=weights(t,u,v);return w&&w.every(v=>v>=-.0002);});}
  function mapped(chart,u,v,depth=.04){let t=chart.triangles.find(t=>weights(t,u,v))||chart.triangles[0],w=weights(t,u,v);return new T.Vector3().addScaledVector(t.p[0],w[0]).addScaledVector(t.p[1],w[1]).addScaledVector(t.p[2],w[2]).addScaledVector(chart.n,depth);}
  function strip(chart,mat,a,c,width=.06,depth=.06){const p=mapped(chart,...a,depth),q=mapped(chart,...c,depth),t=q.clone().sub(p),side=chart.n.clone().cross(t).normalize().multiplyScalar(width*.5),back=chart.n.clone().multiplyScalar(-.06),aa=p.clone().add(side),cc=q.clone().add(side),dd=q.clone().sub(side),ee=p.clone().sub(side),len=t.length();quad(mat,aa,ee,dd,cc,[0,0,0,width,len,width,len,0]);quad(mat,aa,cc,cc.clone().add(back),aa.clone().add(back));quad(mat,ee,ee.clone().add(back),dd.clone().add(back),dd);}
  function sourceUV(chart,point){const t=chart.triangles[0],a=t.p[1].clone().sub(t.p[0]),c=t.p[2].clone().sub(t.p[0]),d=point.clone().sub(t.p[0]),aa=a.dot(a),cc=c.dot(c),ac=a.dot(c),det=aa*cc-ac*ac,q=(d.dot(a)*cc-d.dot(c)*ac)/det,r=(d.dot(c)*aa-d.dot(a)*ac)/det;return[t.uv[0][0]+q*(t.uv[1][0]-t.uv[0][0])+r*(t.uv[2][0]-t.uv[0][0]),t.uv[0][1]+q*(t.uv[1][1]-t.uv[0][1])+r*(t.uv[2][1]-t.uv[0][1])];}
  function sourceBoard(chart,material,start,end,width,depth=.055,bevel=.004){
    const a=mapped(chart,...start,depth),c=mapped(chart,...end,depth),delta=c.clone().sub(a),axis=delta.clone().normalize(),side=chart.n.clone().cross(axis).normalize(),half=width*.5;
    const outer=[a.clone().addScaledVector(side,half),a.clone().addScaledVector(side,-half),c.clone().addScaledVector(side,-half),c.clone().addScaledVector(side,half)];
    const inner=[a.clone().addScaledVector(axis,bevel).addScaledVector(side,half-bevel),a.clone().addScaledVector(axis,bevel).addScaledVector(side,-half+bevel),c.clone().addScaledVector(axis,-bevel).addScaledVector(side,-half+bevel),c.clone().addScaledVector(axis,-bevel).addScaledVector(side,half-bevel)];
    const uv=inner.flatMap(p=>sourceUV(chart,p));quad(material,...inner,uv);
    for(let j=0;j<4;j++){const k=(j+1)%4,aa=outer[j].clone().addScaledVector(chart.n,-bevel),cc=outer[k].clone().addScaledVector(chart.n,-bevel);quad(material,inner[k],inner[j],aa,cc,[...sourceUV(chart,inner[k]),...sourceUV(chart,inner[j]),...sourceUV(chart,aa),...sourceUV(chart,cc)]);const backA=aa.clone().addScaledVector(chart.n,-depth+bevel),backC=cc.clone().addScaledVector(chart.n,-depth+bevel);quad(wood,cc,aa,backA,backC,[delta.length(),0,0,0,0,depth,delta.length(),depth]);}
  }
  const recesses=i.italyWindowRecesses?.windows||[];
  stats.recessedWindows=0;stats.recessReveals=0;stats.recessBackPanels=0;stats.recessSashBoards=0;
  const glazing=new Map();
  function glassPane(chart,u,v,rect){const texture=mats.sourceTextures?.get(chart.texture);if(!texture)return;let material=glazing.get(chart.texture);if(!material){material=new T.MeshPhysicalMaterial({name:'italy/recessed-glass/'+chart.texture,map:texture,roughness:.28,metalness:0,clearcoat:.45,clearcoatRoughness:.17,envMapIntensity:.62});glazing.set(chart.texture,material);}const[x,y,w,h]=rect,uv=[[u+x,v+y],[u+x+w,v+y],[u+x+w,v+y+h],[u+x,v+y+h]];if(!uv.every(p=>inside(chart,...p)))return;const points=uv.map(p=>mapped(chart,...p,.021));if(points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).dot(chart.n)<0){points.reverse();uv.reverse();}quad(material,...points,uv.flat());stats.glazedPanes++;}
  const recessBackMaterials=new Map(),recessGlassMaterials=new Map();
  function facingQuad(material,points,uv,normal){if(points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).dot(normal)<0){points.reverse();uv.reverse();}quad(material,...points,uv.flat());}
  function recessBoard(chart,material,start,end,width,front,thickness=.035,bevel=.003){
    const a=mapped(chart,...start,front),c=mapped(chart,...end,front),axis=c.clone().sub(a).normalize(),side=chart.n.clone().cross(axis).normalize(),half=width/2;
    const perimeter=[a.clone().addScaledVector(side,half),a.clone().addScaledVector(side,-half),c.clone().addScaledVector(side,-half),c.clone().addScaledVector(side,half)],inner=[a.clone().addScaledVector(axis,bevel).addScaledVector(side,half-bevel),a.clone().addScaledVector(axis,bevel).addScaledVector(side,-half+bevel),c.clone().addScaledVector(axis,-bevel).addScaledVector(side,-half+bevel),c.clone().addScaledVector(axis,-bevel).addScaledVector(side,half-bevel)];
    facingQuad(material,inner.map(p=>p.clone()),inner.map(p=>sourceUV(chart,p)),chart.n);
    for(let j=0;j<4;j++){const k=(j+1)%4,pa=perimeter[j].clone().addScaledVector(chart.n,-bevel),pc=perimeter[k].clone().addScaledVector(chart.n,-bevel),aa=pa.clone().addScaledVector(chart.n,-thickness+bevel),cc=pc.clone().addScaledVector(chart.n,-thickness+bevel);quad(material,inner[k],inner[j],pa,pc,[...sourceUV(chart,inner[k]),...sourceUV(chart,inner[j]),...sourceUV(chart,pa),...sourceUV(chart,pc)]);quad(material,pc,pa,aa,cc,[...sourceUV(chart,pc),...sourceUV(chart,pa),...sourceUV(chart,aa),...sourceUV(chart,cc)]);}
    stats.recessSashBoards++;
  }
  // Every clipped rectangle is an opaque closed cavity: the four reveal
  // walls meet a full back panel. No curtain, pane or sash remains at the old
  // front plane. Source images and real-world aperture dimensions are retained.
  for(const record of recesses){
    const n=V(record.normal),U=V(record.U),W=V(record.V),origin=V(record.origin),[l,lo,r,hi]=record.rect,uv=[[l,lo],[r,lo],[r,hi],[l,hi]],point=(u,v,d=0)=>origin.clone().addScaledVector(U,u).addScaledVector(W,v).addScaledVector(n,d),front=uv.map(p=>point(...p,0)),back=uv.map(p=>point(...p,-record.depth));
    const chart={texture:record.texture,n,triangles:[{p:[front[0],front[1],front[2]],uv:[uv[0],uv[1],uv[2]]}]},material=mats.get('italy_detail',{texture:record.texture,vertexColors:false}),atlas=mats.sourceTextures?.get(record.texture);
    let backing=recessBackMaterials.get(record.texture),glass=recessGlassMaterials.get(record.texture);if(!backing){backing=new T.MeshStandardMaterial({name:'italy/opaque-window-back/'+record.texture,map:atlas,roughness:.79,envMapIntensity:.40});backing.color.setRGB(.85,.85,.85);recessBackMaterials.set(record.texture,backing);glass=new T.MeshPhysicalMaterial({name:'italy/window-pane/'+record.texture,map:atlas,roughness:.26,metalness:0,clearcoat:.38,clearcoatRoughness:.18,envMapIntensity:.72});glass.color.setRGB(.90,.90,.90);recessGlassMaterials.set(record.texture,glass);}
    facingQuad(backing,back.map(p=>p.clone()),uv.map(p=>p.slice()),n);stats.recessBackPanels++;
    for(let j=0;j<4;j++){const k=(j+1)%4,mid=front[j].clone().add(front[k]).add(back[k]).add(back[j]).multiplyScalar(.25),inside=V(record.center).addScaledVector(n,-record.depth/2).sub(mid);facingQuad(material,[front[j].clone(),front[k].clone(),back[k].clone(),back[j].clone()],[uv[j].slice(),uv[k].slice(),uv[k].slice(),uv[j].slice()],inside);stats.recessReveals++;}
    // The reveal edges meet a source-textured casing with a small real bevel.
    // Its face follows the chart's original wood border rather than a generic
    // stone outline, and its back stays inside the source wall volume.
    const du=.024/U.length(),dv=.024/W.length(),casingDepth=.014;
    for(const u of[l+du,r-du])recessBoard(chart,material,[u,lo+dv],[u,hi-dv],.048,casingDepth,.048,.004);
    for(const v of[lo+dv,hi-dv])recessBoard(chart,material,[l+du,v],[r-du,v],.048,casingDepth,.048,.004);
    const local=(u,v)=>[record.u+u,record.v+v],sashDepth=-record.depth+.064;
    function join(a,c,width=.025){recessBoard(chart,material,local(...a),local(...c),width,sashDepth,.034,.0025);}
    function pane(x,y,w,h){const coords=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p=>local(...p));if(coords.some(p=>p[0]<l||p[0]>r||p[1]<lo||p[1]>hi))return;facingQuad(glass,coords.map(p=>point(...p,-record.depth+.007)),coords,n);stats.glazedPanes++;}
    if(record.texture==='bStuccoWnd'){
      for(const u of[.392,.608])join([u,.33],[u,.91],.040);
      for(const v of[.33,.625,.91])join([.392,v],[.608,v],v===.625?.048:.038);
      for(const u of[.449,.500,.549])join([u,.34],[u,.894],.022);
      for(const v of[.445,.534,.718,.808])join([.405,v],[.597,v],.020);
      for(let x=0;x<4;x++)for(let y=0;y<3;y++)pane(.405+x*.048,.641+y*.086,.038,.071);
      for(let x=0;x<4;x++)for(let y=0;y<2;y++)pane(.405+x*.048,.351+y*.091,.038,.074);
      // The photographed lower guard has the same three vertical divisions.
      // Real wrought bars stand forward of the recessed glass, inside the jamb.
      for(const u of[.449,.500,.549])rod(iron,point(record.u+u,record.v+.345,-.078),point(record.u+u,record.v+.603,-.078),.010);
      rod(iron,point(record.u+.400,record.v+.585,-.078),point(record.u+.600,record.v+.585,-.078),.011);
    }else if(record.texture==='wlStuccoWnd'){
      for(const u of[.352,.615])join([u,.315],[u,.878],.048);
      for(const v of[.315,.395])join([.352,v],[.615,v],.048);
      for(const u of[.424,.484,.543])join([u,.407],[u,.852-Math.abs(u-.484)*.30],.020);
      for(const v of[.407,.514,.627,.740])join([.369,v],[.600,v],.022);
      // An arched casement follows the existing photographed timber contour.
      for(let k=0;k<24;k++){const a=k*Math.PI/24,c=(k+1)*Math.PI/24;join([.484+Math.cos(a)*.116,.740+Math.sin(a)*.119],[.484+Math.cos(c)*.116,.740+Math.sin(c)*.119],.040);}
      for(let x=0;x<4;x++)for(let y=0;y<3;y++)pane(.373+x*.057,.420+y*.110,.043,.088);
    }else if(record.texture==='shutteredWindow'){
      for(const u of[.273,.502,.733])join([u,.065],[u,.935],u===.502?.065:.070);
      for(const v of[.065,.494,.935])join([.273,v],[.733,v],v===.494?.046:.065);
      for(const x of[.295,.535])for(const y of[.10,.52])pane(x,y,.17,.36);
      // Existing painted shutters become individual shallow timber boards with
      // their exact source pixels; hinge plates are retained on the same chart.
      for(const[left,right]of[[.008,.229],[.774,.992]])for(let k=0;k<4;k++){const span=(right-left)/4,u=left+(k+.5)*span;recessBoard(chart,material,local(u,.018),local(u,.982),U.length()*span-.003,.042,.042,.003);}
    }else if(record.texture==='windowWhite'){
      for(const u of[.075,.289,.501,.713,.923])join([u,.05],[u,.95],u===.501?.035:.029);
      for(const v of[.05,.193,.346,.50,.655,.805,.95])join([.075,v],[.923,v],v===.50?.060:.029);
      for(let x=0;x<4;x++)for(let y=0;y<6;y++)pane(.100+x*.211,.070+y*.147,.174,.122);
    }else if(record.texture==='floweredWindow'){
      for(const u of[.077,.503,.923])join([u,.205],[u,.935],u===.503?.055:.065);
      join([.077,.935],[.923,.935],.065);
      for(const x of[.11,.55])pane(x,.51,.34,.37);
      // The flower-box image already belongs to this source window. Give its
      // front and rolled rim physical depth at the original chart position.
      const boxUV=[[.115,.025],[.902,.025],[.902,.188],[.115,.188]].map(p=>local(...p)),boxFront=boxUV.map(p=>point(...p,.090));facingQuad(material,boxFront,boxUV,n);
      const boxCenter=point((l+r)/2,record.v+.1065,-.005);for(let j=0;j<4;j++){const k=(j+1)%4,points=[boxFront[j],boxFront[k],point(...boxUV[k],-.10),point(...boxUV[j],-.10)],out=points.reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(.25).sub(boxCenter);facingQuad(stone,points,[[0,0],[1,0],[1,.19],[0,.19]],out);}
      recessBoard(chart,material,local(.115,.175),local(.902,.175),.045,.115,.055,.005);
    }
    // Limestone sill has a sloped top, drip edge and returned ends, all at the
    // existing window base. Projection remains within decorative wall clearance.
    const sillY=lo+.012/W.length(),sillA=point(l,sillY,.10),sillB=point(r,sillY,.10),rearA=point(l,sillY+.025/W.length(),-.02),rearB=point(r,sillY+.025/W.length(),-.02),down=new T.Vector3(0,-.055,0);
    facingQuad(stone,[sillA,sillB,rearB,rearA],[[0,0],[U.length()*(r-l),0],[U.length()*(r-l),.12],[0,.12]],new T.Vector3(0,1,0));facingQuad(stone,[sillA.clone().add(down),sillB.clone().add(down),sillB,sillA],[[0,0],[U.length()*(r-l),0],[U.length()*(r-l),.055],[0,.055]],n);
    const sillCenter=sillA.clone().add(sillB).add(rearA).add(rearB).multiplyScalar(.25).addScaledVector(down,.5);for(const[a,c]of[[sillA,rearA],[rearB,sillB]]){const points=[a,a.clone().add(down),c.clone().add(down),c],out=a.clone().add(c).multiplyScalar(.5).addScaledVector(down,.5).sub(sillCenter);facingQuad(stone,points,[[0,0],[0,.055],[.12,.055],[.12,0]],out);}facingQuad(stone,[sillA.clone().add(down),sillB.clone().add(down),rearB.clone().add(down),rearA.clone().add(down)],[[0,0],[1,0],[1,.12],[0,.12]],new T.Vector3(0,-1,0));facingQuad(stone,[rearA,rearB,rearB.clone().add(down),rearA.clone().add(down)],[[0,0],[1,0],[1,.055],[0,.055]],n.clone().negate());stats.recessedWindows++;stats.windows++;
  }
  const windowPositions=[];
  for(const chart of chartMap.values()){
    const tex=chart.texture.toLowerCase(),door=tex.includes('door'),bStucco=tex==='bstuccownd',wlStucco=tex==='wlstuccownd';
    const rect=bStucco?[.374,.303,.627,.932]:wlStucco?[.318,.274,.649,.90]:door?[.025,.015,.975,.975]:tex==='shutteredwindow'?[.238,.015,.766,.985]:[.035,.02,.965,.98];
    const[l,lo,r,hi]=rect;
    for(let u=Math.floor(chart.min[0]);u<Math.ceil(chart.max[0]);u++)for(let v=Math.floor(chart.min[1]);v<Math.ceil(chart.max[1]);v++){
      if(![[l,lo],[r,lo],[l,hi],[r,hi]].every(([x,y])=>inside(chart,u+x,v+y)))continue;
      const a=mapped(chart,u+l,v+lo),c=mapped(chart,u+r,v+lo),top=mapped(chart,u+l,v+hi),width=a.distanceTo(c),height=a.distanceTo(top);if(width<.38||width>3.5||height<.5||height>4.6)continue;
      const recess=recesses.find(w=>w.texture===chart.texture&&w.u===u&&w.v===v&&V(w.normal).dot(chart.n)>.999&&V(w.origin).distanceTo(mapped(chart,0,0,0))<.02);
      if(recess)continue; // Recess back, panes and sash are emitted above.
      const frame=door?wood:stone;
      for(const x of[l,r])strip(chart,frame,[u+x,v+lo],[u+x,v+hi],door?.075:.08,.065);
      strip(chart,frame,[u+l-.015,v+lo],[u+r+.015,v+lo],door?.075:.12,door?.065:.125);
      strip(chart,frame,[u+l-.012,v+hi],[u+r+.012,v+hi],.105,.08);
      if(door){
        if(tex==='oakdoor'){for(const x of[.25,.75]){const p=mapped(chart,u+x,v+.58,.095),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),chart.n);addGeo(new T.TorusGeometry(.055,.009,6,16),brass,p.toArray(),[1,1,1],q);}}else{const p=mapped(chart,u+r-(r-l)*.12,v+lo+(hi-lo)*.46,.10);rod(brass,p,p.clone().add(new T.Vector3(0,.13,0)),.012);}stats.doors++;
      }else{
        // Glass sits behind the projecting timber and uses the same source
        // pixels. Only pane areas gain a glass lobe; curtains/frames stay matte.
        if(bStucco){for(let j=0;j<4;j++)glassPane(chart,u,v,[.405+j*.047,.644,.039,.235]);}
        else if(tex==='shutteredwindow'){for(const x of[.294,.535])for(const yy of[.10,.515])glassPane(chart,u,v,[x,yy,.17,.34]);}
        else if(tex==='windowwhite'||tex==='windowhalf'){for(let x=0;x<4;x++)for(let y=0;y<(tex==='windowhalf'?3:7);y++)glassPane(chart,u,v,[.10+x*.20,.10+y*.115,.16,.08]);}
        strip(chart,wood,[u+(l+r)/2,v+lo],[u+(l+r)/2,v+hi],.04,.06);
        strip(chart,wood,[u+l,v+lo+(hi-lo)*.52],[u+r,v+lo+(hi-lo)*.52],.035,.06);
        if((bStucco||wlStucco)&&width>.7){
          // Narrow louvred shutters sit over the outside edge of the source
          // opening; the photographed glazing remains visible in the centre.
          for(const side of[-1,1]){const x=side<0?l:r,sw=(r-l)*.18,outer=x+side*sw;if(!inside(chart,u+outer,v+lo)||!inside(chart,u+outer,v+hi))continue;
            strip(chart,shutter,[u+x,v+lo],[u+x,v+hi],.045,.075);strip(chart,shutter,[u+outer,v+lo],[u+outer,v+hi],.045,.075);
            const slats=Math.ceil(height/.085);for(let j=0;j<slats;j++){const yy=lo+(j+.5)*(hi-lo)/slats;strip(chart,shutter,[u+x,v+yy],[u+outer,v+yy],.052,.068);}
            for(const yy of[lo+.08*(hi-lo),hi-.08*(hi-lo)])strip(chart,iron,[u+x,v+yy],[u+outer,v+yy],.026,.09);
          }
        }
        stats.windows++;const mid=a.clone().add(c).multiplyScalar(.5);windowPositions.push({p:mid,n:chart.n.clone(),u:c.clone().sub(a).normalize(),width,seed:stats.windows});
      }
    }
  }
  // Small clay window boxes and individual herb leaves give close facade
  // views real depth without reaching beyond the player's wall clearance.
  for(const w of windowPositions){
    if(hash(w.seed,2)>.23||w.width<.70)continue;const p=w.p.clone().addScaledVector(w.n,.11);p.y-=.12;const length=Math.min(w.width*.76,.88),half=w.u.clone().multiplyScalar(length/2),normal=w.n.clone().multiplyScalar(.10),a=p.clone().sub(half).add(normal),c=p.clone().add(half).add(normal),d=c.clone().add(new T.Vector3(0,.19,0)),e=a.clone().add(new T.Vector3(0,.19,0));
    quad(roof,a,c,d,e,[0,0,length,0,length,.19,0,.19]);quad(roof,a,p.clone().sub(half).sub(normal),p.clone().sub(half).sub(normal).add(new T.Vector3(0,.19,0)),e);quad(roof,c,d,p.clone().add(half).sub(normal).add(new T.Vector3(0,.19,0)),p.clone().add(half).sub(normal));
    const top=p.clone().add(new T.Vector3(0,.17,0));quad(soil,top.clone().sub(half).sub(normal),top.clone().add(half).sub(normal),top.clone().add(half).add(normal),top.clone().sub(half).add(normal));
    for(let k=0;k<14;k++){const stem=top.clone().addScaledVector(w.u,(hash(w.seed,k+10)-.5)*length*.9).addScaledVector(w.n,(hash(w.seed,k+40)-.5)*.13),tip=stem.clone().add(new T.Vector3((hash(w.seed,k+70)-.5)*.12,.12+hash(w.seed,k+90)*.14,(hash(w.seed,k+110)-.5)*.12));rod(leaf,stem,tip,.003);for(let j=0;j<3;j++){const q=stem.clone().lerp(tip,.35+j*.2),side=w.u.clone().multiplyScalar((j%2?1:-1)*.065),end=q.clone().add(side).add(new T.Vector3(0,.045,0)),cross=w.n.clone().multiplyScalar(.023);quad(j%2?leaf:leafLight,q,end.clone().add(cross),end.clone().addScaledVector(side,.3),end.clone().sub(cross));}}
    stats.windowBoxes++;
  }
  // Curved coppi are concentrated at source roof edges, where silhouette and
  // contact matter; the continuous roof behind them retains its material map.
  const roofEdges=new Map();
  for(const s of map.surfaces){if(s.material!=='italy_roof')continue;for(let k=0;k<s.positions.length;k+=9){const n=V(s.normals.slice(k,k+3));if(n.y<.25)continue;const p=[0,3,6].map(j=>V(s.positions.slice(k+j,k+j+3)));for(let j=0;j<3;j++){const a=p[j],c=p[(j+1)%3],key=[a.toArray().map(x=>x.toFixed(4)).join(','),c.toArray().map(x=>x.toFixed(4)).join(',')].sort().join('|');const old=roofEdges.get(key);if(old)old.count++;else roofEdges.set(key,{a,c,n,count:1,center:p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1/3)});}}}
  for(const edge of roofEdges.values()){
    if(edge.count!==1||stats.roofTiles>=2600)continue;const delta=edge.c.clone().sub(edge.a),len=delta.length();if(len<.7||Math.abs(delta.y)>len*.12)continue;const tangent=delta.normalize(),inward=edge.n.clone().cross(tangent).normalize(),mid=edge.a.clone().add(edge.c).multiplyScalar(.5);if(inward.dot(edge.center.clone().sub(mid))<0)inward.negate();
    beam(wood,edge.a.clone().addScaledVector(edge.n,-.07),edge.c.clone().addScaledVector(edge.n,-.07),.13,.13);stats.eaves++;
    const count=Math.ceil(len/.27),pitch=len/count;
    for(let j=0;j<count;j++)for(let row=0;row<2;row++){
      if(stats.roofTiles>=2600)break;const origin=edge.a.clone().addScaledVector(tangent,pitch*(j+.5)).addScaledVector(inward,row*.40-.035),length=.45,radius=pitch*.44;
      for(let n=0;n<5;n++){
        const a=n*Math.PI/5,c=(n+1)*Math.PI/5;
        const point=(angle,t)=>origin.clone().addScaledVector(tangent,Math.cos(angle)*radius*(t? .88:1)).addScaledVector(edge.n,Math.sin(angle)*radius*.62+.018).addScaledVector(inward,t*length);
        const pa=point(a,0),pc=point(c,0),pd=point(c,1),pe=point(a,1);if(pc.clone().sub(pa).cross(pd.clone().sub(pa)).dot(edge.n)<0)quad(roof,pa,pe,pd,pc,[a*.12,0,a*.12,length,c*.12,length,c*.12,0]);else quad(roof,pa,pc,pd,pe,[a*.12,0,c*.12,0,c*.12,length,a*.12,length]);
      }stats.roofTiles++;
    }
  }
  // Drain pipes follow uninterrupted rectangular wall faces; no free-standing
  // clutter or footpath collision is introduced by these service details.
  const pipes=[];
  for(const f of map.faces){if(!(/^italy_plaster/.test(f.material)||/StuccoBrdr$/i.test(f.texture))||Math.abs(f.normal[1])>.01||f.area<18)continue;const mn=f.bounds.min,mx=f.bounds.max,onX=Math.abs(f.normal[0])>.99,onZ=Math.abs(f.normal[2])>.99;if(!onX&&!onZ)continue;const axis=onX?2:0,w=mx[axis]-mn[axis],h=mx[1]-mn[1];if(w<3||h<3||f.area<w*h*.98)continue;const q=V(f.center);q.setComponent(axis,mn[axis]+.15);q.addScaledVector(V(f.normal),.075);if(pipes.some(p=>p.distanceTo(q)<8))continue;const a=q.clone(),c=q.clone();a.y=mn[1]+.18;c.y=mx[1]-.10;rod(iron,a,c,.035);for(let y=a.y+.2;y<c.y;y+=1.9){const p=q.clone();p.y=y;beam(iron,p.clone().addScaledVector(V(f.normal),-.07),p.clone().addScaledVector(V(f.normal),.015),.085,.045);}pipes.push(q);stats.drainpipes++;if(pipes.length===26)break;}
  // Irregular, seeded packing on the native sloped counters. Each fruit has
  // a varied silhouette, peel, ripeness and orientation, never a repeated row.
  function fruitGeometry(radius,lemon,seed){const g=new T.SphereGeometry(radius,12,8),p=g.attributes.position,colors=[];const shade=.72+hash(seed,9)*.42,hue=hash(seed,17);
    for(let k=0;k<p.count;k++){const x=p.getX(k)/radius,y=p.getY(k)/radius,z=p.getZ(k)/radius,angle=Math.atan2(z,x),lobes=1+(lemon?.025:.055)*Math.cos(angle*(lemon?3:5)+hash(seed,8)*6)*(1-y*y),asym=1+.035*Math.sin(angle*3+y*5+seed),xx=x*lobes*asym,zz=z*lobes*(1+.025*Math.sin(angle*2+seed)),yy=lemon?y*(1.12+.18*Math.abs(y)**8):y*.88-Math.max(0,y-.73)*.30;
      p.setXYZ(k,xx*radius,yy*radius,zz*radius);const patch=1+.045*Math.sin(angle*4+y*9+seed);colors.push(shade*patch,shade*(lemon?.88+hue*.12:.82+hue*.25)*patch,shade*(lemon?.73+hue*.2:.77+hue*.2)*patch);
    }g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
  for(const f of map.faces){if(!/^pileO(tomatoes|lemons)$/i.test(f.texture)||f.normal[1]<.8)continue;const lemon=/lemon/i.test(f.texture),mn=f.bounds.min,mx=f.bounds.max,n=V(f.normal),placed=[],width=mx[0]-mn[0],depth=mx[2]-mn[2],target=Math.floor(width*depth/(lemon?.022:.026));
    for(let attempt=0;attempt<target*12&&placed.length<target;attempt++){const id=f.id*31+attempt,xx=mn[0]+.085+hash(id,2)*(width-.17),zz=mn[2]+.085+hash(id,3)*(depth-.17),radius=(lemon?.052:.055)+hash(id,5)*.018;if(placed.some(p=>Math.hypot(p[0]-xx,p[1]-zz)<(p[2]+radius)*.86))continue;placed.push([xx,zz,radius]);const surfaceY=f.center[1]-(n.x*(xx-f.center[0])+n.z*(zz-f.center[2]))/n.y,y=surfaceY+radius*.58+(hash(id,23)>.84?.022:0),q=new T.Quaternion().setFromEuler(new T.Euler((hash(id,31)-.5)*.8,hash(id,32)*Math.PI*2,lemon?Math.PI/2+(hash(id,33)-.5)*.6:(hash(id,33)-.5)*.3));
      addGeo(fruitGeometry(radius,lemon,id),lemon?yellow:red,[xx,y,zz],[1,1,1],q);
      if(!lemon){const stem=V([0,radius*.69,0]).applyQuaternion(q).add(V([xx,y,zz]));for(let j=0;j<5;j++){const angle=j*Math.PI*2/5+hash(id,40),a=V([Math.cos(angle)*radius*.49,.003,Math.sin(angle)*radius*.49]).applyQuaternion(q).add(stem),c=V([Math.cos(angle+.5)*radius*.23,.012,Math.sin(angle+.5)*radius*.23]).applyQuaternion(q).add(stem);tri(leaf,stem,a,c);}if(hash(id,50)<.35)rod(leaf,stem,stem.clone().add(V([.005,.022,.006]).applyQuaternion(q)),.004);}
      else if(hash(id,51)<.35){const stem=V([0,radius*1.20,0]).applyQuaternion(q).add(V([xx,y,zz]));rod(leaf,stem,stem.clone().add(V([0,.009,0]).applyQuaternion(q)),.009);}
      stats.marketFruit++;
    }
  }
  // Board fronts sample the original UV chart; centimetre relief and bevels
  // supply the parallax/contact absent from the painted diagonal braces.
  for(const chart of crateCharts.values())for(let u=Math.floor(chart.min[0]);u<Math.ceil(chart.max[0]);u++)for(let v=Math.floor(chart.min[1]);v<Math.ceil(chart.max[1]);v++){
    const probes=[[.02,.02],[.98,.02],[.98,.98],[.02,.98]];if(!probes.every(([x,y])=>inside(chart,u+x,v+y)))continue;const width=mapped(chart,u+.98,v).distanceTo(mapped(chart,u+.02,v)),height=mapped(chart,u,v+.98).distanceTo(mapped(chart,u,v+.02));if(width<.45||width>5||height<.45||height>5)continue;
    const material=mats.get('italy_detail',{texture:chart.texture,vertexColors:false}),plain=/crateBox/i.test(chart.texture),boardWidth=Math.min(width*.09,.15),frameDepth=.047;
    for(const x of[.055,.945])sourceBoard(chart,material,[u+x,v+.02],[u+x,v+.98],boardWidth,frameDepth,.005);
    for(const y of[.055,.945])sourceBoard(chart,material,[u+.10,v+y],[u+.90,v+y],Math.min(height*.09,.15),frameDepth,.005);
    if(!plain){
      const boards=/big/i.test(chart.texture)?9:6;for(let k=0;k<boards;k++){const x=.13+(k+.5)*.74/boards,w=width*.74/.96/boards-.003;sourceBoard(chart,material,[u+x,v+.13],[u+x,v+.87],w,.008+hash(k,chart.triangles.length)*.004,.002);stats.crateSlats++;}
      sourceBoard(chart,material,[u+.13,v+.13],[u+.87,v+.87],Math.min(width,height)*.12,.082,.006);stats.crateBraces++;
    }
    // Small blackened nail heads are inset from the edge, at native fasteners.
    for(const x of[.065,.935])for(const y of[.065,.935]){const p=mapped(chart,u+x,v+y,.055),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),chart.n);addGeo(new T.CylinderGeometry(.009,.011,.007,6),iron,p.toArray(),[1,1,1],q);}stats.crateFaces++;
  }
  // The traversable house window keeps its exact six-segment native aperture.
  // This finely sampled outer casing covers the faceted *front* timber band;
  // its inner edge and the original reveal remain at the source coordinates.
  const archFaces=[264,265,266,267,268,269,270].map(id=>map.faces.find(f=>f.id===id));
  if(archFaces.every(f=>f&&f.modelId===0&&f.texture==='drkWood'&&f.normal[0]<-.999&&Math.abs(f.center[0]-13.0048)<.0001)){
    const planeX=archFaces[0].center[0],spring=4.8768,bottom=3.8608,centerZ=-62.992;
    const inner=[[1.016,0],[.8128,.4064],[.4064,.6096],[-.4064,.6096],[-.8128,.4064],[-1.016,0]];
    const angles=[...Array.from({length:97},(_,k)=>Math.PI*k/96),...inner.map(([z,y])=>Math.atan2(y,z))].sort((a,c)=>a-c).filter((v,k,a)=>!k||v-a[k-1]>1e-8);
    const profile=[[0,.003],[.06,.030],[.13,.046],[.87,.046],[.94,.030],[1,.003]];
    function archInner(theta){const dz=Math.cos(theta),dy=Math.sin(theta);for(let j=0;j<inner.length-1;j++){const a=inner[j],c=inner[j+1],ez=c[0]-a[0],ey=c[1]-a[1],den=dz*ey-dy*ez;if(Math.abs(den)<1e-10)continue;const r=(a[0]*ey-a[1]*ez)/den,t=(a[0]*dy-a[1]*dz)/den;if(r>=0&&t>=-1e-7&&t<=1+1e-7)return r;}throw new Error('Italy arch source intersection failed');}
    function casingGrid(rows){const p=[],uv=[],indices=[];for(let k=0;k<rows.length;k++)for(let j=0;j<profile.length;j++){const[f,depth]=profile[j],row=rows[k],z=row.iz+(row.oz-row.iz)*f,y=row.iy+(row.oy-row.iy)*f;p.push(planeX-depth,y,centerZ+z);uv.push(row.distance,f*.224);if(k<rows.length-1&&j<profile.length-1){const a=k*profile.length+j,c=a+profile.length;indices.push(a,a+1,c+1,a,c+1,c);}}
      const a=V(p.slice(indices[0]*3,indices[0]*3+3)),c=V(p.slice(indices[1]*3,indices[1]*3+3)),d=V(p.slice(indices[2]*3,indices[2]*3+3));if(c.sub(a).cross(d.sub(a)).x>0)for(let k=0;k<indices.length;k+=3)[indices[k+1],indices[k+2]]=[indices[k+2],indices[k+1]];
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();addGeo(g,wood);return indices.length/3;
    }
    const rows=angles.map(theta=>{const z=Math.cos(theta),y=Math.sin(theta),ri=archInner(theta),ro=1/Math.pow(Math.pow(Math.abs(z)/1.24,2.2)+Math.pow(y/.86,2.2),1/2.2);if(ro<ri+.1)throw new Error('Italy arch surround crosses its native aperture');return{iz:z*ri,iy:spring+y*ri,oz:z*ro,oy:spring+y*ro,distance:theta*1.14};});
    let triangles=casingGrid(rows);
    for(const side of[-1,1])triangles+=casingGrid([{iz:side*1.016,iy:bottom,oz:side*1.24,oy:bottom,distance:0},{iz:side*1.016,iy:spring,oz:side*1.24,oy:spring,distance:spring-bottom}]);
    stats.archedSurrounds=1;stats.archSurround={sourceFaces:archFaces.map(f=>f.id),triangles,segments:angles.length-1,maximumProjection:.046,nativeApertureRetained:true};
  }
  // Rounded mineral mouldings follow the photographed fleur-de-lis band's
  // actual UV rows. Intersecting both edges with source triangles crops each
  // run at the real face boundary, including cutouts and partial texture tiles.
  function bandIntervals(chart,v){const spans=[];for(const t of chart.triangles){const hits=[];for(let j=0;j<3;j++){const a=t.uv[j],c=t.uv[(j+1)%3];if(Math.abs(c[1]-a[1])<1e-9){if(Math.abs(v-a[1])<1e-8)hits.push(a[0],c[0]);}else{const r=(v-a[1])/(c[1]-a[1]);if(r>=-1e-8&&r<=1+1e-8)hits.push(a[0]+(c[0]-a[0])*r);}}if(hits.length>1)spans.push([Math.min(...hits),Math.max(...hits)]);}spans.sort((a,c)=>a[0]-c[0]);const merged=[];for(const s of spans){const last=merged.at(-1);if(last&&s[0]<=last[1]+1e-6)last[1]=Math.max(last[1],s[1]);else merged.push(s.slice());}return merged;}
  for(const chart of bandCharts.values()){
    const material=mats.get('italy_detail',{texture:chart.texture,vertexColors:false}),vScale=mapped(chart,0,1).distanceTo(mapped(chart,0,0)),uScale=mapped(chart,1,0).distanceTo(mapped(chart,0,0)),half=.039/vScale;
    for(let tile=Math.floor(chart.min[1]);tile<Math.ceil(chart.max[1]);tile++)for(const row of[.972,.788,.052]){
      const v=tile+row,lower=bandIntervals(chart,v-half),upper=bandIntervals(chart,v+half);
      for(const a of lower)for(const c of upper){const lo=Math.max(a[0],c[0]),hi=Math.min(a[1],c[1]);if((hi-lo)*uScale<.15)continue;const p=[],uv=[],indices=[];
        for(let end=0;end<2;end++)for(let k=0;k<=8;k++){const theta=Math.PI*k/8,u=end?hi:lo,vv=v-Math.cos(theta)*half,depth=.003+Math.sin(theta)*.031;p.push(...mapped(chart,u,vv,depth).toArray());uv.push(u,vv);if(!end&&k<8)indices.push(k,k+1,k+10,k,k+10,k+9);}
        const aa=V(p.slice(0,3)),cc=V(p.slice(3,6)),dd=V(p.slice(30,33));if(cc.sub(aa).cross(dd.sub(aa)).dot(chart.n)<0)for(let k=0;k<indices.length;k+=3)[indices[k+1],indices[k+2]]=[indices[k+2],indices[k+1]];
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();addGeo(g,material);stats.facadeMouldings++;
      }
    }
  }
  // One complete house/passage assembly, kept on existing solid source planes.
  // The passage's angular inner aperture remains untouched; individual cut
  // stones give that native polygon an intelligible load-bearing construction.
  stats.houseArchitecture={capBlocks:0,cornerReturns:0,framedPlaques:0,passageVoussoirs:0,passageJambBlocks:0,maximumProjection:.055,collisionChanges:0,sourceFaces:[]};
  const house=stats.houseArchitecture,houseSource=map.faces.filter(f=>f.modelId===0&&f.texture==='gryStuccoSpade'&&((Math.abs(f.center[0]-13.0048)<.001&&f.normal[0]<-.99)||(Math.abs(f.center[2]+53.6448)<.001&&f.normal[2]>.99)));
  house.sourceFaces=houseSource.map(f=>f.id);
  function bevelBlock(points,n,depth=.04,seed=0,material=stone,uvAt){
    const middle=points.reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(1/points.length),axis=points[1].clone().sub(points[0]).normalize(),up=n.clone().cross(axis).normalize(),flat=points.map(p=>new T.Vector2(p.clone().sub(middle).dot(axis),p.clone().sub(middle).dot(up))),indices=T.ShapeUtils.triangulateShape(flat,[]),inset=points.map(p=>p.clone().lerp(middle,Math.min(.16,.006/p.distanceTo(middle))));
    const crops=[[.085,.11,.12,.055],[.37,.48,.10,.05],[.53,.94,.075,.035]],crop=crops[seed%3],minX=Math.min(...flat.map(p=>p.x)),maxX=Math.max(...flat.map(p=>p.x)),minY=Math.min(...flat.map(p=>p.y)),maxY=Math.max(...flat.map(p=>p.y));
    const sample=uvAt||((p)=>{const d=p.clone().sub(middle);return[3.2*(crop[0]+crop[2]*(d.dot(axis)-minX)/(maxX-minX||1)),3.2*(crop[1]+crop[3]*(d.dot(up)-minY)/(maxY-minY||1))];});
    const front=inset.map(p=>p.clone().addScaledVector(n,depth)),rim=points.map(p=>p.clone().addScaledVector(n,depth-.007)),back=points.map(p=>p.clone().addScaledVector(n,.002));
    for(const face of indices){const p=face.map(j=>front[j]),uv=p.flatMap(sample);if(p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).dot(n)<0){[p[1],p[2]]=[p[2],p[1]];tri(material,...p,[...sample(p[0]),...sample(p[1]),...sample(p[2])]);}else tri(material,...p,uv);}
    for(let j=0;j<points.length;j++){const k=(j+1)%points.length,out=points[j].clone().add(points[k]).multiplyScalar(.5).sub(middle);facingQuad(material,[front[j],front[k],rim[k],rim[j]],[sample(front[j]),sample(front[k]),sample(rim[k]),sample(rim[j])],out.clone().addScaledVector(n,.3));facingQuad(material,[rim[j],rim[k],back[k],back[j]],[sample(rim[j]),sample(rim[k]),sample(back[k]),sample(back[j])],out);}
  }
  if(houseSource.length){
    // The upper cap stays below the native 7.3152m silhouette. Separate stones
    // and their returned corners replace a continuous, perfectly straight strip.
    for(const wall of[{n:V([-1,0,0]),start:-65.024,end:-53.6448,point:(u,y)=>V([13.0048,y,u])},{n:V([0,0,1]),start:13.0048,end:26.0096,point:(u,y)=>V([u,y,-53.6448])}]){
      const count=Math.ceil((wall.end-wall.start)/.8128),pitch=(wall.end-wall.start)/count;
      for(let j=0;j<count;j++){const a=wall.start+j*pitch+.003,c=wall.start+(j+1)*pitch-.003;bevelBlock([wall.point(a,7.1652),wall.point(c,7.1652),wall.point(c,7.3152),wall.point(a,7.3152)],wall.n,.045,j);house.capBlocks++;}
      // Slim keyed corner returns occupy the two uninterrupted source edges;
      // no strip crosses the native open window, door or crate climbing route.
      const corner=wall.n.x<0?wall.end:wall.start;
      for(let j=0;j<10;j++){const y=.15+j*.70,top=Math.min(7.15,y+.694),a=wall.n.x<0?corner-.14:corner,c=wall.n.x<0?corner:corner+.14;bevelBlock([wall.point(a,y),wall.point(c,y),wall.point(c,top),wall.point(a,top)],wall.n,.024,j+7);house.cornerReturns++;}
    }
    const merged=[];
    for(const c of bandCharts.values()){
      const p=mapped(c,0,0,0),west=c.n.x<-.99&&Math.abs(p.x-13.0048)<.001,front=c.n.z>.99&&Math.abs(p.z+53.6448)<.001;if(!west&&!front)continue;
      const U=mapped(c,1,0,0).sub(p),W=mapped(c,0,1,0).sub(p);let entry=merged.find(q=>q.n.dot(c.n)>.999&&q.origin.distanceTo(p)<.01&&q.U.distanceTo(U)<.002&&q.W.distanceTo(W)<.002);if(!entry){entry={...c,triangles:[],min:[Infinity,Infinity],max:[-Infinity,-Infinity],origin:p,U,W};merged.push(entry);}entry.triangles.push(...c.triangles);for(let axis=0;axis<2;axis++){entry.min[axis]=Math.min(entry.min[axis],c.min[axis]);entry.max[axis]=Math.max(entry.max[axis],c.max[axis]);}
    }
    const plaqueCenters=[];
    for(const chart of merged){const material=mats.get('italy_detail',{texture:'gryStuccoSpade',vertexColors:false});
      for(let tile=Math.floor(chart.min[0]);tile<Math.ceil(chart.max[0]);tile++)for(let j=0;j<6;j++){
        const l=tile+.039+j/6,r=tile+.122+j/6,lo=.838,hi=.929,uv=[[l,lo],[r,lo],[r,hi],[l,hi]];if(!uv.every(p=>inside(chart,...p)))continue;const points=uv.map(p=>mapped(chart,...p,0)),center=points.reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(.25);if(center.y<6||center.y>7.15||points.some(p=>p.z< -65.024-.001||p.z> -53.6448+.001||p.x<13.0048-.001||p.x>26.0096+.001)||plaqueCenters.some(p=>p.distanceTo(center)<.15))continue;
        bevelBlock(points,chart.n,.018,house.framedPlaques,material,p=>sourceUV(chart,p));for(const u of[l+.003,r-.003])recessBoard(chart,material,[u,lo+.003],[u,hi-.003],.035,.048,.041,.004);for(const v of[lo+.003,hi-.003])recessBoard(chart,material,[l+.003,v],[r-.003,v],.035,.048,.041,.004);stats.recessSashBoards-=4;plaqueCenters.push(center);house.framedPlaques++;
      }
    }
    house.plaqueCenters=plaqueCenters.map(p=>p.toArray());
    // Restrained weathering follows real coping joints, base plaster and the
    // existing timber sill. It changes material response, never the silhouette.
    const facade=mats.get('italy_detail',{texture:'gryStuccoSpade',vertexColors:true}),priorCompile=facade.onBeforeCompile,priorKey=facade.customProgramCacheKey;
    facade.onBeforeCompile=shader=>{priorCompile.call(facade,shader);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 hw=vItalyWorld;float houseWest=(1.-step(.06,abs(hw.x-13.0048)))*step(-65.024,hw.z)*step(hw.z,-53.6448);
      float houseFront=(1.-step(.06,abs(hw.z+53.6448)))*step(13.0048,hw.x)*step(hw.x,26.0096);float houseMask=max(houseWest,houseFront);
      float houseU=mix(hw.x-13.0048,hw.z+65.024,houseWest),houseDrop=7.3152-hw.y;
      float houseJoint=abs(fract(houseU/.8128+.5)-.5)*.8128,houseRun=exp(-pow(houseJoint/(.024+.014*max(houseDrop,0.)),2.))*smoothstep(.10,.45,houseDrop)*(1.-smoothstep(1.0,3.2,houseDrop));
      houseRun*=.35+.65*itNoise(vec3(floor(houseU/.8128),hw.y*.6,3.));
      float houseBase=(1.-smoothstep(.12,.5+itNoise(hw*.9)*1.1,hw.y))*smoothstep(-.02,.10,hw.y);
      float sillRun=houseWest*exp(-pow((abs(hw.z+62.992)-.95)/.09,2.))*smoothstep(0.,.18,3.4544-hw.y)*(1.-smoothstep(.6,1.4,3.4544-hw.y));
      diffuseColor.rgb*=1.-houseMask*(houseRun*.085+houseBase*.035+sillRun*.065);
      float limeRepair=houseBase*smoothstep(.50,.69,itNoise(hw*vec3(.75,1.5,.75)));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.055,1.043,1.025),limeRepair*houseMask*.6);
    `);};facade.customProgramCacheKey=()=>priorKey.call(facade)+'-house-edge-finish-v1';facade.needsUpdate=true;
    house.finish='restrained coping-joint/sill runoff and base lime repair on existing house facade only';
  }
  const passageIds=[343,344,345,346,347,348,349,350,352],passageFaces=passageIds.map(id=>map.faces.find(f=>f.id===id));
  if(passageFaces.every(f=>f?.modelId===0&&f.texture==='wlStuccoBrdr'&&Math.abs(f.center[2]+47.1424)<.0001)){
    const n=V([0,0,-1]),cx=17.8816,sy=2.032,z=-47.1424,aperture=[[2.032,0],[1.6256,.8128],[1.2192,1.2192],[.4064,1.6256],[-.4064,1.6256],[-1.2192,1.2192],[-1.6256,.8128],[-2.032,0]],point=(r,theta)=>V([cx+Math.cos(theta)*r,sy+Math.sin(theta)*r,z]);
    function innerRadius(theta){const dx=Math.cos(theta),dy=Math.sin(theta);for(let j=0;j<aperture.length-1;j++){const a=aperture[j],c=aperture[j+1],ex=c[0]-a[0],ey=c[1]-a[1],det=dx*ey-dy*ex;if(Math.abs(det)<1e-10)continue;const radius=(a[0]*ey-a[1]*ex)/det,t=(a[0]*dy-a[1]*dx)/det;if(radius>0&&t>=-1e-7&&t<=1+1e-7)return radius;}throw Error('Italy passage arch lost source boundary');}
    const corners=aperture.map(p=>Math.atan2(p[1],p[0]));
    for(let j=0;j<18;j++){const lo=j*Math.PI/18+.0014,hi=(j+1)*Math.PI/18-.0014,angles=[lo,hi,...corners.filter(v=>v>lo&&v<hi),...Array.from({length:4},(_,k)=>lo+(hi-lo)*(k+1)/5)].sort((a,c)=>a-c),inner=angles.map(a=>point(innerRadius(a)+.004,a)),outer=angles.map(a=>{const radius=1/Math.sqrt((Math.cos(a)/2.40)**2+(Math.sin(a)/2.04)**2);return point(radius,a);});bevelBlock([...inner,...outer.reverse()],n,.045+(j%3)*.004,j);house.passageVoussoirs++;}
    for(const side of[-1,1])for(let j=0;j<6;j++){const bottom=.008+j*(sy-.008)/6,top=.008+(j+1)*(sy-.008)/6-.006,a=cx+side*2.036,c=cx+side*2.40;bevelBlock([V([a,bottom,z]),V([c,bottom,z]),V([c,top,z]),V([a,top,z])],n,.045,j+3);house.passageJambBlocks++;}
    house.passage={sourceFaces:passageIds,planeZ:z,originalAperture:aperture.map(p=>[cx+p[0],sy+p[1],z]),nativeInnerBoundaryRetained:true,maximumProjection:.053};
  }
  for(const batch of batches.values()){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(batch.c,3));geo.computeBoundingSphere();const mesh=new T.Mesh(geo,batch.mat);mesh.name='italy-detail-batch';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
  const birdBody=simple('chicken-feathers',0xbfb7a2,.91),birdWing=simple('chicken-wing-feathers',0x8b8068,.93),comb=simple('chicken-comb',0x973524,.81),beak=simple('beak-and-feet',0xad8b45,.78),eye=simple('bird-eyes',0x171910,.28),glass=simple('wine-glass',0x2a3b24,.23,.1),label=simple('wine-label',0xc5b594,.94);
  function part(group,geometry,mat,p,scale=[1,1,1]){const mesh=new T.Mesh(geometry,mat);mesh.position.set(...p);mesh.scale.set(...scale);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
  for(const entity of map.entities.filter(e=>e.classname==='cycler_sprite')){
    const object=new T.Group();object.name='italy-'+entity.targetname;object.position.set(...entity.pos);object.rotation.y=entity.yaw;root.add(object);const record={object,entity,time:hash(entity.id,8)*6,head:null};actors.set(entity.targetname,record);
    if(/chick\.mdl$/i.test(entity.properties.model)){
      part(object,new T.SphereGeometry(.16,14,10),birdBody,[0,.29,0],[.95,1,1.46]);for(const side of[-1,1]){const wing=part(object,new T.SphereGeometry(.12,10,8),birdWing,[side*.12,.28,.01],[.35,.85,1.45]);wing.rotation.z=side*.16;part(object,new T.CylinderGeometry(.009,.012,.17,6),beak,[side*.055,.10,0]);for(const k of[-1,0,1]){const toe=part(object,new T.CylinderGeometry(.006,.008,.065,5),beak,[side*.055+k*.012,.025,.02],[1,1,1]);toe.rotation.x=Math.PI/2;toe.rotation.z=k*.35;}}
      const head=new T.Group();head.position.set(0,.38,-.15);object.add(head);part(head,new T.SphereGeometry(.087,12,8),birdBody,[0,.08,-.02],[.84,1.2,.87]);const bill=part(head,new T.ConeGeometry(.030,.075,6),beak,[0,.055,-.102]);bill.rotation.x=-Math.PI/2;for(const side of[-1,1])part(head,new T.SphereGeometry(.011,8,6),eye,[side*.067,.10,-.047]);for(let j=0;j<3;j++)part(head,new T.SphereGeometry(.026,8,6),comb,[0,.19+j*.002,-.055+j*.035],[.48,1,1]);part(head,new T.SphereGeometry(.027,8,6),comb,[0,.015,-.055],[.5,1.3,.8]);for(let j=0;j<5;j++){const tail=part(object,new T.SphereGeometry(.065,8,6),birdWing,[(j-2)*.025,.38,.19],[.22,1.8,.65]);tail.rotation.x=-.62;tail.rotation.z=(j-2)*.13;}record.head=head;stats.chickens++;
    }else if(/winebottle\.mdl$/i.test(entity.properties.model)){
      part(object,new T.CylinderGeometry(.064,.070,.26,14),glass,[0,.15,0]);part(object,new T.CylinderGeometry(.025,.064,.07,14),glass,[0,.315,0]);part(object,new T.CylinderGeometry(.025,.025,.13,12),glass,[0,.405,0]);part(object,new T.CylinderGeometry(.028,.028,.035,12),iron,[0,.485,0]);part(object,new T.CylinderGeometry(.071,.071,.13,14,1,true),label,[0,.16,0]);stats.bottles++;
    }
  }
  // Each rigid actor part shares one geometry per material; the head remains
  // a separate local group so pecking is animated without dozens of draw calls.
  function mergeRigid(group){const sets=new Map();for(const o of [...group.children]){if(!o.isMesh)continue;let set=sets.get(o.material);if(!set){set=[];sets.set(o.material,set);}set.push(o);}for(const[material,objects]of sets){if(objects.length<2)continue;const p=[],n=[],uv=[];for(const o of objects){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry,nm=new T.Matrix3().getNormalMatrix(o.matrix);for(let k=0;k<g.attributes.position.count;k++){p.push(...new T.Vector3().fromBufferAttribute(g.attributes.position,k).applyMatrix4(o.matrix).toArray());n.push(...new T.Vector3().fromBufferAttribute(g.attributes.normal,k).applyMatrix3(nm).normalize().toArray());uv.push(g.attributes.uv?.getX(k)||0,g.attributes.uv?.getY(k)||0);}group.remove(o);if(g!==o.geometry)g.dispose();o.geometry.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeBoundingSphere();const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}}
  for(const actor of actors.values()){mergeRigid(actor.object);if(actor.head)mergeRigid(actor.head);}
  root.traverse(o=>{if(o.isMesh){stats.meshes++;stats.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
  function breakTarget(target){const key=/^bottlekill/.test(target)?target.replace('bottlekill','bottle'):/^chicken\dkill$/.test(target)?target.replace('kill',''):null;if(key&&actors.has(key))actors.get(key).object.visible=false;}
  return{root,stats,breakTarget,reset(){for(const actor of actors.values())actor.object.visible=true;},update(dt){for(const actor of actors.values())if(actor.head&&actor.object.visible){actor.time+=dt;const peck=Math.max(0,Math.sin(actor.time*.85))**12;actor.head.rotation.x=-peck*.85;actor.head.position.y=.38-peck*.06;actor.object.rotation.y=actor.entity.yaw+Math.sin(actor.time*.32)*.08;}}};
}
