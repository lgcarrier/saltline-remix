/* Italy PBR library. Generated photographic albedos + deterministic physical
 * surface relief. Native image charts keep their BSP UVs; remastered windows
 * and doors preserve the original normalized chart. Albedo is sRGB, normal
 * and ORM are linear. Derived image relief is explicitly an approximation. */
async function italyMaterials(i,map){
  const T=i.THREE,begin=performance.now(),SIZE=512,sets=new Map(),native=new Map(),cache=new Map(),images=window.__ITALY_TEXTURES;
  const referenceMode=new URLSearchParams(location.search).get('italyMaterials')==='source',reusedMaterials=new Set();
  const detailAliases={'~blueRug':'blueRug','blueHangingRug':'blueRug','magHangingRug':'redHangingRug'},replacementFor=name=>images.remasters?.[name]||images.remasters?.[detailAliases[name]];
  if(!images?.plaster||!images?.cobble||!images?.roof||!images?.sources)throw new Error('Italy texture payload is incomplete');
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x);};
  const hash=(x,y,s=0)=>{let n=Math.imul(x+113,s+1791)^Math.imul(y+677,3473);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  function noise(u,v,period,seed){let x=u*period,y=v*period,a=Math.floor(x),b=Math.floor(y),fx=x-a,fy=y-b;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const P=k=>(k%period+period)%period;return mix(mix(hash(P(a),P(b),seed),hash(P(a+1),P(b),seed),fx),mix(hash(P(a),P(b+1),seed),hash(P(a+1),P(b+1),seed),fx),fy);}
  let textureBytes=0;
  function configure(tex,name,srgb,physical=[1,1],sourceUV=false){
    tex.name='italy/'+name;tex.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;
    tex.anisotropy=Math.min(8,i.renderer.capabilities.getMaxAnisotropy());tex.repeat.set(sourceUV?1:1/physical[0],sourceUV?1:1/physical[1]);tex.needsUpdate=true;
    textureBytes+=(tex.image?.width||SIZE)*(tex.image?.height||SIZE)*4*4/3;return tex;
  }
  function dataTexture(a,name,srgb,physical,sourceUV=false){const t=new T.DataTexture(a,SIZE,SIZE,T.RGBAFormat,T.UnsignedByteType);t.flipY=true;return configure(t,name,srgb,physical,sourceUV);}
  function normals(h,name,physical,sourceUV=false){
    const a=new Uint8Array(SIZE*SIZE*4);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const j=(y*SIZE+x)*4,dx=(h[y*SIZE+(x+1)%SIZE]-h[y*SIZE+(x+SIZE-1)%SIZE])*SIZE/(2*physical[0]),dy=(h[((y+1)%SIZE)*SIZE+x]-h[((y+SIZE-1)%SIZE)*SIZE+x])*SIZE/(2*physical[1]),len=Math.hypot(dx,dy,1);
      a[j]=(-dx/len*.5+.5)*255;a[j+1]=(dy/len*.5+.5)*255;a[j+2]=(1/len*.5+.5)*255;a[j+3]=255;
    }return dataTexture(a,name+'/normal',false,physical,sourceUV);
  }
  function bake(name,kind,physical,seed){
    const a=new Uint8Array(SIZE*SIZE*4),o=new Uint8Array(a.length),h=new Float32Array(SIZE*SIZE);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const k=y*SIZE+x,j=k*4,u=(x+.5)/SIZE,v=(y+.5)/SIZE,broad=noise(u,v,4,seed),meso=noise(u,v,24,seed+7),fine=noise(u,v,128,seed+11),grain=hash(x,y,seed+19);
      let color=[170,161,145],rough=.87,ao=1,height=(fine-.5)*.0005;
      if(kind==='stone'||kind==='brick'){
        const rows=kind==='brick'?10:6,columns=kind==='brick'?7:5,row=Math.floor(v*rows),offset=row%2*.5+(kind==='stone'?(hash(row,3,seed)-.5)*.24:0),qx=u*columns+offset,qy=v*rows,edge=Math.min((qx%1)*physical[0]/columns,(1-qx%1)*physical[0]/columns,(qy%1)*physical[1]/rows,(1-qy%1)*physical[1]/rows),face=smooth(.003,.018+(meso-.5)*.005,edge),shade=(hash(Math.floor(qx),row,seed+3)-.5)*25+(broad-.5)*10+(meso-.5)*11+(fine-.5)*7;
        color=kind==='brick'?[162+shade,145+shade*.9,114+shade*.7]:[168+shade,166+shade*.96,150+shade*.85];
        color=color.map((c,n)=>mix([122,119,108][n]+(meso-.5)*8,c,face));ao=mix(.72,1,face);rough=.84+meso*.1;height=face*.007+(meso-.5)*.002+(fine-.5)*.0006;
      }else if(kind==='wood'){
        const plank=Math.floor(u*8),q=(u*8)%1,seam=smooth(.003,.022,Math.min(q,1-q)),long=noise(u,v*.1,64,seed+23),fibre=Math.sin((u*390+noise(u,v,16,seed)*.8)*Math.PI*2),shade=(hash(plank,2,seed)-.5)*24+(long-.5)*18+(meso-.5)*7+fibre*2;
        color=[110+shade,88+shade*.8,63+shade*.65].map(c=>mix(c*.45,c,seam));height=seam*.003+(long-.5)*.0004+fibre*.00012;rough=.82+meso*.12;ao=mix(.75,1,seam);
      }else if(kind==='cement'){
        // Cast cement needs visible mineral structure at play distance, not
        // only subpixel noise. Separate trowel clouds, worn cement paste,
        // 3–12 mm aggregate, and sparse shallow air pores; no masonry grid.
        const cloud=noise(u,v,8,seed+29),trowel=noise(u,v,16,seed+31),wear=smooth(.36,.69,broad*.48+cloud*.52);
        const gx=Math.floor(u*64),gy=Math.floor(v*64),fx=u*64-gx,fy=v*64-gy,cx=.24+hash(gx,gy,seed+37)*.52,cy=.24+hash(gx,gy,seed+41)*.52;
        const dx=(fx-cx)*(1+hash(gx,gy,seed+43)*.55),dy=fy-cy,rad=.075+hash(gx,gy,seed+47)*.14;
        const aggregate=1-smooth(rad*.46,rad,Math.hypot(dx,dy)),mineral=hash(gx,gy,seed+53),airPocket=aggregate*smooth(.84,.96,mineral),stoneChip=aggregate*(1-smooth(.70,.86,mineral));
        const paste=(broad-.5)*24+(cloud-.5)*15+(trowel-.5)*10+(meso-.5)*11+(fine-.5)*8+(grain-.5)*5;
        const chipTone=(mineral-.38)*38*stoneChip;
        color=[157+paste+chipTone,157+paste*.97+chipTone*.95,150+paste*.93+chipTone*.82].map(c=>c+wear*6-airPocket*31);
        ao=1-airPocket*.15;rough=.89-wear*.13+(meso-.5)*.055+airPocket*.08;
        height=(trowel-.5)*.00075+(meso-.5)*.00065+(fine-.5)*.00035+stoneChip*.00045-airPocket*.0014;
      }else if(kind==='cloth'){
        const weave=(Math.sin(u*SIZE*Math.PI)*Math.sin(v*SIZE*Math.PI));color=[148+(meso-.5)*9,139+(meso-.5)*9,123+(meso-.5)*9];height=weave*.0001+(fine-.5)*.0002;rough=.98;
      }else {color=[198+(broad-.5)*15+(meso-.5)*9,183+(broad-.5)*13+(meso-.5)*8,157+(broad-.5)*10+(meso-.5)*7];rough=.91+fine*.05;height=(meso-.5)*.001+(fine-.5)*.0003;}
      a[j]=clamp(color[0]+(grain-.5)*2,0,255);a[j+1]=clamp(color[1]+(grain-.5)*2,0,255);a[j+2]=clamp(color[2]+(grain-.5)*2,0,255);a[j+3]=255;o[j]=ao*255;o[j+1]=rough*255;o[j+2]=0;o[j+3]=255;h[k]=height;
    }
    const set={albedo:dataTexture(a,name+'/albedo',true,physical),normal:normals(h,name,physical),orm:dataTexture(o,name+'/orm',false,physical),physical,sourceUV:false};sets.set(name,set);return set;
  }
  for(const recipe of [['italy_stone','stone',[3.2,2.4],17],['italy_brick','brick',[3.2,2.4],29],['italy_wood','wood',[2,3.2],43],['italy_plaster_ochre','plaster',[3.2,3.2],71],['italy_cloth','cloth',[1,1],97],['italy_concrete','cement',[3.2,3.2],109]]){bake(...recipe);await new Promise(r=>setTimeout(r,0));}
  const uploadLimit=(name,sourceUV)=>sourceUV?(/source\/(bStuccoWnd|wlStuccoWnd|shutteredWindow|woodedWindow|oakDoor)$/.test(name)?1024:768):1024;
  async function loadImage(name,url,physical,sourceUV=false){
    const texture=await new T.TextureLoader().loadAsync(url),image=texture.image,limit=uploadLimit(name,sourceUV);
    if(Math.max(image.width,image.height)>limit){const canvas=document.createElement('canvas'),ratio=limit/Math.max(image.width,image.height);canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);texture.image=canvas;}
    return configure(texture,name,true,physical,sourceUV);
  }
  async function generated(name,url,physical,relief,roughness){
    const albedo=await loadImage(name+'/generated-albedo',url,physical),canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(albedo.image,0,0,SIZE,SIZE);const pixels=context.getImageData(0,0,SIZE,SIZE).data,h=new Float32Array(SIZE*SIZE),orm=new Uint8Array(SIZE*SIZE*4);
    for(let k=0;k<h.length;k++){const j=k*4,lum=(pixels[j]*.2126+pixels[j+1]*.7152+pixels[j+2]*.0722)/255;h[k]=(lum-.5)*relief;orm[j]=Math.round((.9+.1*lum)*255);orm[j+1]=Math.round(clamp(roughness+(lum-.5)*.04)*255);orm[j+2]=0;orm[j+3]=255;}
    // Luminance is only a bounded micro-relief estimate; no physical geometry
    // or measured photogrammetry height is claimed by these data maps.
    const set={albedo,normal:normals(h,name,physical),orm:dataTexture(orm,name+'/orm',false,physical),physical,sourceUV:false};sets.set(name,set);canvas.width=canvas.height=1;return set;
  }
  const oldPlaster=sets.get('italy_plaster_ochre');for(const tex of [oldPlaster.albedo,oldPlaster.normal,oldPlaster.orm]){tex.dispose();textureBytes-=SIZE*SIZE*4*4/3;}
  await generated('italy_plaster_ochre',images.plaster,[3.2,3.2],.002,.94);
  await generated('italy_cobble',images.cobble,[2.4,2.4],.014,.84);
  await generated('italy_roof',images.roof,[2.4,2.4],.019,.81);
  if(images.stone){const prior=sets.get('italy_stone');for(const tex of [prior.albedo,prior.normal,prior.orm]){tex.dispose();textureBytes-=SIZE*SIZE*4*4/3;}await generated('italy_stone',images.stone,[3.2,3.2],.019,.87);}
  sets.set('italy_plaster_cream',sets.get('italy_plaster_ochre'));sets.set('italy_plaster_sage',sets.get('italy_plaster_ochre'));sets.set('italy_plaster',sets.get('italy_plaster_ochre'));
  const needed=new Set([...map.surfaces,...(map.breakables||[]).flatMap(x=>x.surfaces)].filter(s=>s.visible!==false&&(referenceMode||s.material==='italy_detail'||replacementFor(s.texture))).map(s=>s.texture));
  const remasterNames=[],recreatedTextures=[];
  function proceduralCutout(name){
    const sizes=map.textureSizes?.[name]||[128,128],scale=512/Math.max(...sizes),canvas=document.createElement('canvas');canvas.width=Math.round(sizes[0]*scale);canvas.height=Math.round(sizes[1]*scale);
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
    const line=(x1,y1,x2,y2,width,color)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
    if(/rustyrungs/i.test(name)){
      const metal=c.createLinearGradient(0,0,w,0);metal.addColorStop(0,'#372b24');metal.addColorStop(.45,'#77604d');metal.addColorStop(1,'#332e29');
      c.fillStyle=metal;c.fillRect(w*.05,0,w*.11,h);c.fillRect(w*.84,0,w*.11,h);
      for(let y=h*.08;y<h;y+=h*.235){c.fillRect(w*.12,y,w*.76,h*.025);line(w*.12,y+1,w*.88,y+1,1,'#b18b62');}
    }else if(/ornategate/i.test(name)){
      for(let x=w*.06;x<w;x+=w*.147){line(x,0,x,h,w*.016,'#303932');line(x-w*.003,0,x-w*.003,h,w*.004,'#6b7164');}
      for(const y of [.1,.9])line(0,h*y,w,h*y,h*.027,'#3d443a');
      for(let x=w*.13;x<w;x+=w*.294){c.strokeStyle='#454b3d';c.lineWidth=w*.013;for(const sign of [-1,1]){c.beginPath();c.moveTo(x,h*.48);c.bezierCurveTo(x+sign*w*.13,h*.13,x+sign*w*.19,h*.6,x,h*.68);c.stroke();}}
    }else if(/winerack/i.test(name)){
      const cols=7,rows=3,cw=w/cols,ch=h/rows;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const cx=(col+.5)*cw,cy=(row+.51)*ch,r=Math.min(cw,ch)*.26;
        c.fillStyle='#18261e';c.beginPath();c.ellipse(cx,cy,r,r*.82,0,0,Math.PI*2);c.fill();
        const sheen=c.createRadialGradient(cx-r*.25,cy-r*.2,r*.05,cx,cy,r);sheen.addColorStop(0,'#5e6b42');sheen.addColorStop(.45,'#28372c');sheen.addColorStop(1,'#0c1712');c.fillStyle=sheen;c.beginPath();c.arc(cx,cy,r*.7,0,Math.PI*2);c.fill();c.fillStyle='#928065';c.beginPath();c.arc(cx,cy,r*.23,0,Math.PI*2);c.fill();
      }
      for(let n=0;n<=cols;n++)line(n*cw,0,n*cw,h,Math.max(3,w*.014),'#6a4c31');for(let n=0;n<=rows;n++)line(0,n*ch,w,n*ch,Math.max(3,h*.03),'#71583c');
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)line(col*cw,row*ch,(col+1)*cw,(row+1)*ch,Math.max(2,w*.008),'#8d7050');
    }else if(/hangingivy/i.test(name)){
      for(let vine=0;vine<7;vine++){
        const vx=(vine+.5)/7*w;line(vx,0,vx+w*.04,h*(.55+hash(vine,3,5)*.43),Math.max(1,w*.009),'#3d4b26');
        for(let leaf=0;leaf<10;leaf++){
          const y=(leaf+.4)/10*h,x=vx+(leaf%2?1:-1)*w*.045,r=w*(.033+hash(vine,leaf,23)*.025);if(y>h*(.58+hash(vine,8,11)*.4))continue;
          c.save();c.translate(x,y);c.rotate((leaf%2?1:-1)*.6);c.fillStyle=['#344b27','#50613a','#66734a','#42572d'][(vine+leaf)%4];c.beginPath();c.moveTo(0,-r);c.lineTo(r*.4,-r*.35);c.lineTo(r,.0);c.lineTo(r*.43,r*.3);c.lineTo(r*.35,r);c.lineTo(0,r*.61);c.lineTo(-r*.35,r);c.lineTo(-r*.45,r*.25);c.lineTo(-r,0);c.lineTo(-r*.4,-r*.35);c.closePath();c.fill();line(0,-r*.75,0,r*.5,.7,'#87906a');c.restore();
        }
      }
    }else throw new Error('Required Italy source texture is unavailable: '+name);
    recreatedTextures.push(name);const texture=new T.CanvasTexture(canvas);return configure(texture,'recreated/'+name,true,[1,1],true);
  }
  const sourceLoads=new Map(),sharedTextureSources=[];let sharedTextureBytesSaved=0;
  await Promise.all([...needed].sort((a,b)=>Number(!!detailAliases[a])-Number(!!detailAliases[b])).map(async name=>{
    const replacement=!referenceMode&&replacementFor(name),url=replacement||images.sources[name];
    let tex;
    if(url){
      // Source charts all use identical repeat/colour/filter settings. Only
      // byte-identical data URIs at the same upload limit may share a texture;
      // the material owns any per-chart tint (including the magenta cloth).
      const key=uploadLimit('source/'+name,true)+'|'+url;let entry=sourceLoads.get(key);
      if(!entry){entry={url,names:[],promise:loadImage('source/'+name,url,[1,1],true)};sourceLoads.set(key,entry);}entry.names.push(name);tex=await entry.promise;
    }else tex=proceduralCutout(name);
    native.set(name,tex);if(replacement)remasterNames.push(name);
  }));
  for(const entry of sourceLoads.values())if(entry.names.length>1){
    const tex=await entry.promise,saved=(entry.names.length-1)*tex.image.width*tex.image.height*4*4/3;sharedTextureBytesSaved+=saved;
    let sourceSha256=null;
    if(globalThis.crypto?.subtle){const binary=atob(entry.url.slice(entry.url.indexOf(',')+1)),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),digest=await crypto.subtle.digest('SHA-256',bytes);sourceSha256=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');}
    sharedTextureSources.push({names:entry.names.sort(),sourceSha256,savedBytes:Math.round(saved),size:[tex.image.width,tex.image.height],proof:'exact data URI and identical source-UV sampler'});
  }
  // Contextual weathering follows actual supported wall/floor junctions.
  // XZ alone never defines a dirt band: each contact stores its source Y and
  // the shader rejects fragments on a different storey or bridge elevation.
  const contactSize=512,contactBounds=new T.Vector4(map.bounds.min[0],map.bounds.min[2],map.bounds.max[0]-map.bounds.min[0],map.bounds.max[2]-map.bounds.min[2]);
  const contactHeight=new T.Vector2(map.bounds.min[1]-1,map.bounds.max[1]-map.bounds.min[1]+2),floorCells=new Map(),floorCell=3;
  for(const surface of map.surfaces){if(surface.visible===false)continue;for(let k=0;k<surface.positions.length;k+=9){
    if(surface.normals[k+1]<.65)continue;const a=surface.positions.slice(k,k+3),b=surface.positions.slice(k+3,k+6),c=surface.positions.slice(k+6,k+9),tri={a,b,c};
    for(let x=Math.floor(Math.min(a[0],b[0],c[0])/floorCell);x<=Math.floor(Math.max(a[0],b[0],c[0])/floorCell);x++)for(let z=Math.floor(Math.min(a[2],b[2],c[2])/floorCell);z<=Math.floor(Math.max(a[2],b[2],c[2])/floorCell);z++){const key=x+','+z;if(!floorCells.has(key))floorCells.set(key,[]);floorCells.get(key).push(tri);}
  }}
  function sourceFloorAt(x,z,ceiling){let best=-Infinity;for(const{a,b,c}of floorCells.get(Math.floor(x/floorCell)+','+Math.floor(z/floorCell))||[]){
    const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-9)continue;
    const q=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,r=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;if(q<-.001||r<-.001||q+r>1.001)continue;
    const y=q*a[1]+r*b[1]+(1-q-r)*c[1];if(y<=ceiling&&y>best)best=y;
  }return best;}
  const contacts=[],seenContacts=new Set();
  for(const face of map.faces){if(Math.abs(face.normal[1])>.04||face.area<.2||!(/^(italy_stone|italy_brick|italy_plaster)/.test(face.material)||/Stucco/i.test(face.texture)))continue;
    const xNormal=Math.abs(face.normal[0])>.99,zNormal=Math.abs(face.normal[2])>.99;if(!xNormal&&!zNormal)continue;const axis=xNormal?2:0,mn=face.bounds.min,mx=face.bounds.max,span=mx[axis]-mn[axis];if(span<.15)continue;
    const base=mn[1],segments=Math.max(1,Math.ceil(span/.7));
    for(let n=0;n<segments;n++){
      const p=[...face.center];p[axis]=mn[axis]+span*(n+.5)/segments;p[1]=base;
      const floor=sourceFloorAt(p[0]+face.normal[0]*.10,p[2]+face.normal[2]*.10,base+.14);if(!Number.isFinite(floor)||Math.abs(floor-base)>.15)continue;
      const a=[...p],b=[...p];a[axis]=mn[axis]+span*n/segments;b[axis]=mn[axis]+span*(n+1)/segments;
      const key=[...a,...b].map(v=>v.toFixed(3)).join(',');if(seenContacts.has(key))continue;seenContacts.add(key);contacts.push({a,b,y:floor});
    }
  }
  const contactPixels=new Uint8Array(contactSize*contactSize*4),distances=new Float32Array(contactSize*contactSize);distances.fill(2);
  for(const{a,b,y}of contacts){const radius=.72,minx=Math.max(0,Math.floor((Math.min(a[0],b[0])-radius-contactBounds.x)/contactBounds.z*contactSize)),maxx=Math.min(contactSize-1,Math.ceil((Math.max(a[0],b[0])+radius-contactBounds.x)/contactBounds.z*contactSize)),minz=Math.max(0,Math.floor((Math.min(a[2],b[2])-radius-contactBounds.y)/contactBounds.w*contactSize)),maxz=Math.min(contactSize-1,Math.ceil((Math.max(a[2],b[2])+radius-contactBounds.y)/contactBounds.w*contactSize)),dx=b[0]-a[0],dz=b[2]-a[2],len2=dx*dx+dz*dz;
    for(let z=minz;z<=maxz;z++)for(let x=minx;x<=maxx;x++){
      const wx=contactBounds.x+(x+.5)/contactSize*contactBounds.z,wz=contactBounds.y+(z+.5)/contactSize*contactBounds.w,t=clamp(((wx-a[0])*dx+(wz-a[2])*dz)/len2),d=Math.hypot(wx-a[0]-dx*t,wz-a[2]-dz*t),k=z*contactSize+x;if(d>=radius||d>=distances[k])continue;
      distances[k]=d;const j=k*4;contactPixels[j]=Math.round((1-d/radius)*255);contactPixels[j+1]=Math.round(clamp((y-contactHeight.x)/contactHeight.y)*255);contactPixels[j+2]=255;contactPixels[j+3]=255;
    }
  }
  const contactTexture=new T.DataTexture(contactPixels,contactSize,contactSize,T.RGBAFormat,T.UnsignedByteType);contactTexture.name='italy/source-supported-contact';contactTexture.colorSpace=T.NoColorSpace;contactTexture.magFilter=contactTexture.minFilter=T.LinearFilter;contactTexture.generateMipmaps=false;contactTexture.wrapS=contactTexture.wrapT=T.ClampToEdgeWrapping;contactTexture.needsUpdate=true;textureBytes+=contactSize*contactSize*4;
  function get(name,options={}){
    if(name==='italy_plaster')name='italy_plaster_ochre';
    const texture=options.texture||'';if(texture.toLowerCase()==='concrete'&&!referenceMode)name='italy_concrete';
    const source=name==='italy_detail'||!!replacementFor(texture)||(referenceMode&&!!texture),inside=!!options.inside,vertexColors=options.vertexColors!==false;
    if(!source&&!sets.has(name)){if(name.startsWith('italy_'))throw new Error('Required Italy material is unavailable: '+name);reusedMaterials.add(name);return typeof assaultMaterial==='function'?assaultMaterial(i,name,inside,false,options):i.mats.get(name,{interior:inside,vertexColors});}
    const key=name+':'+(source?texture:'')+':'+inside+':'+vertexColors;if(cache.has(key))return cache.get(key);
    const textile=source&&/rug|paper|painting|mural|sheep/i.test(texture),timber=source&&/door|window|wnd|crate|barrel|wood|drawers|radio/i.test(texture),set=sets.get(source?(textile?'italy_cloth':timber?'italy_wood':'italy_plaster_ochre'):name);
    const masonry=/^italy_(plaster|stone|brick|cobble|concrete)/.test(name)||(source&&/stucco|rockwall|stonewall|concrete|ccwall/i.test(texture)),weathered=masonry&&!inside&&!referenceMode;
    const material=new T.MeshStandardMaterial({name:'italy/'+name+(source?'/'+texture:''),map:source?native.get(texture):set.albedo,normalMap:source?null:set.normal,roughnessMap:source?null:set.orm,metalnessMap:source?null:set.orm,roughness:source?(textile?.96:timber?.77:.9):1,metalness:0,vertexColors,side:T.FrontSide});
    if(source&&texture.startsWith('{')){material.alphaTest=.42;material.side=T.DoubleSide;material.depthWrite=true;}
    if(source&&!material.map)throw new Error('Italy detail material unavailable: '+texture);
    const reliefScale=name.startsWith('italy_plaster')?.48:name==='italy_cobble'?.78:.7;material.normalScale.set(reliefScale,reliefScale);material.envMapIntensity=inside?(timber?.36:.27):(timber?.62:name==='italy_cobble'?.58:.42);
    if(source&&texture==='magHangingRug'&&!referenceMode)material.color.setRGB(.9,.7,1.12);
    if(source&&/sideLight/i.test(texture)){material.emissive.set(0xffdcaa);material.emissiveMap=material.map;material.emissiveIntensity=.65;}
    material.userData={italySourceUV:source,italyMaterial:true,interior:inside,physicalTile:source?'native chart':set.physical,generatedRemaster:!referenceMode&&!!replacementFor(texture)};
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vItalyWorld;varying vec3 vItalyWorldNormal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvItalyWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vItalyWorldNormal=normalize(mat3(modelMatrix)*normal);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vItalyWorld;varying vec3 vItalyWorldNormal;
        float itHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
        float itNoise(vec3 p){vec3 q=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(itHash(q),itHash(q+vec3(1,0,0)),f.x),mix(itHash(q+vec3(0,1,0)),itHash(q+vec3(1,1,0)),f.x),f.y),mix(mix(itHash(q+vec3(0,0,1)),itHash(q+vec3(1,0,1)),f.x),mix(itHash(q+vec3(0,1,1)),itHash(q+vec3(1,1,1)),f.x),f.y),f.z);}
      `).replace('#include <map_fragment>',`#include <map_fragment>
        float italyAge=itNoise(vItalyWorld*vec3(.27,.16,.27));
        diffuseColor.rgb*=mix(.93,1.045,italyAge);
        ${referenceMode&&source?'':name==='italy_plaster_cream'?'diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.10)*vec3(1.12,1.09,1.01);':name==='italy_plaster_sage'?'diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.08)*vec3(.87,.95,.90);':name==='italy_plaster_ochre'?'diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.65);':''}
      `);
      if(weathered){
        Object.assign(shader.uniforms,{uItalyContact:{value:contactTexture},uItalyContactBounds:{value:contactBounds},uItalyContactHeight:{value:contactHeight}});
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          uniform sampler2D uItalyContact;uniform vec4 uItalyContactBounds;uniform vec2 uItalyContactHeight;
        `).replace('float italyAge=itNoise(vItalyWorld*vec3(.27,.16,.27));',`
          float italyUp=smoothstep(.45,.92,abs(normalize(vItalyWorldNormal).y));
          vec2 contactUV=(vItalyWorld.xz-uItalyContactBounds.xy)/uItalyContactBounds.zw;
          vec2 contactSample=texture2D(uItalyContact,contactUV).rg;
          float sourceBase=uItalyContactHeight.x+contactSample.g*uItalyContactHeight.y;
          float aboveBase=vItalyWorld.y-sourceBase;
          float localDeposit=itNoise(vItalyWorld*vec3(2.1,.38,2.1));
          float sourceContact=smoothstep(.10,.72,contactSample.r)*(1.-smoothstep(.18,.70+localDeposit*.18,aboveBase))*smoothstep(-.16,-.04,aboveBase);
          float pavementEdge=sourceContact*(1.-smoothstep(.13,.28,abs(aboveBase)));
          float deposit=mix(sourceContact,pavementEdge*.72,italyUp);
          // Warm mineral dust accumulates only at source-supported contacts;
          // texture detail and named motifs retain their original contrast.
          diffuseColor.rgb*=1.-deposit*(.07+.065*localDeposit);
          diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.055,1.015,.935),deposit*.5);
          float italyAge=itNoise(vItalyWorld*vec3(.27,.16,.27));
        `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=clamp(roughnessFactor-${name==='italy_cobble'?'.09':name==='italy_stone'||name==='italy_concrete'?'.11':'.025'}*italyUp+deposit*.045,.62,.98);
        `);
      }
      if(timber&&!referenceMode){shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float timberWear=itNoise(vItalyWorld*vec3(1.8,.24,1.8));
        roughnessFactor=clamp(roughnessFactor+(timberWear-.5)*.12,.64,.90);
      `);}
      if(source){
        // Fine material-scale relief adds grazing-light response without
        // pretending the legacy artwork supplies measured depth.
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          float italyPixel=max(length(dFdx(vItalyWorld)),length(dFdy(vItalyWorld)));
          float italyDetailFade=1.-smoothstep(.003,.016,italyPixel);
          float italyRelief=itNoise(vItalyWorld*${textile?'180.0':timber?'vec3(80.,5.,80.)':'100.0'})*${textile?'.00006':timber?'.00014':'.00011'}*italyDetailFade;
          vec3 itDx=dFdx(-vViewPosition),itDy=dFdy(-vViewPosition),itR1=cross(itDy,normal),itR2=cross(normal,itDx);
          float itDet=dot(itDx,itR1);if(abs(itDet)>1e-12)normal=normalize(abs(itDet)*normal-sign(itDet)*(dFdx(italyRelief)*itR1+dFdy(italyRelief)*itR2));
        `);
      }
      if(inside&&vertexColors){
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 italyIrradiance;varying vec3 vItalyIrradiance;').replace('#include <begin_vertex>','#include <begin_vertex>\nvItalyIrradiance=italyIrradiance;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vItalyIrradiance;').replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse+=diffuseColor.rgb*vItalyIrradiance;');
      }
    };
    material.customProgramCacheKey=()=>['italy-v4',name,source?(textile?'cloth':timber?'wood':'masonry'):'',inside,vertexColors,weathered].join(':');cache.set(key,material);return material;
  }
  const stats={version:4,concreteFinish:'original concrete chart uses cast cement with trowel clouds, worn paste, 3–12 mm aggregate and sparse 1.4 mm pores; source diagnostic mode retains source pixels',sourceSupportedContactSegments:contacts.length,contactFieldSize:contactSize,contactHeightGated:true,microdetailDistanceFiltered:true,referenceMode,activeFallbacks:[],reusedMaterials,uniquePbrSets:new Set(sets.values()).size,normalOrmSize:SIZE,sourceDetailAtlases:native.size,sharedTextureSources,sharedTextureBytesSaved:Math.round(sharedTextureBytesSaved),recreatedTextures:recreatedTextures.sort(),generatedAlbedos:images.stone?4:3,gpuUploadLimit:{hero:1024,secondary:768,physicalAlbedo:1024},remasteredAtlases:remasterNames.sort(),missingTextures:[],retainedTextureBytes:Math.round(textureBytes),bakeMs:Math.round(performance.now()-begin),heightData:'bounded luminance-derived micro-relief for generated albedo; deterministic procedural stone/wood; no measured height or displacement',channels:['sRGB albedo','linear normal','linear ORM']};
  Object.defineProperty(stats,'reusedMaterials',{enumerable:true,get:()=>[...reusedMaterials].sort()});
  const api={get,stats,textures:sets,sourceTextures:native};i.italyMaterials=api;return api;
}
