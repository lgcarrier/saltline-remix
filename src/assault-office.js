// Operations-room finish: freestanding equipment stays outside the tested route.
// World metres, +Y up. Uses Saltline's original material and construction helpers.
function assaultOffice(i,map) {
  const T=i.THREE,b=ob(i),root=new T.Group();root.name='assault-operations';
  const dark=b.MI('steel_dark'),steel=b.MI('steel_galv'),paint=b.MI('paint_grey'),plastic=b.MI('polymer_black'),wood=b.MI('wood_dark'),rubber=b.MI('rubber');
  const floor=8.5344;
  const box=(m,w,h,d,x,y,z,r=.008)=>b.box(m,w,h,d,x,y,z,{bevel:r});
  const rod=(m,a,c,r=.018)=>b.rod(m,a,c,r,{seg:8});
  const label=(s,h,x,y,z,o={})=>b.label(s,h,x,y,z,'z-',{font:'sans',color:'white',distress:.04,...o});
  // Folded steel skirting and ceiling coving follow actual room wall spans.
  const borders=new Set();
  for(const f of map.faces){
    if(f.texture!=='c1a0_labw5'||Math.abs(f.bounds.min[1]-floor)>.02||f.center[0]>-18||f.center[0]<-28)continue;
    const n=f.normal,onX=Math.abs(n[0])>.99,onZ=Math.abs(n[2])>.99;if(!onX&&!onZ)continue;
    const a=onX?2:0,len=f.bounds.max[a]-f.bounds.min[a];if(len<.1)continue;
    const k=f.center[0]+':'+f.center[2]+':'+len;if(borders.has(k))continue;borders.add(k);
    const x=f.center[0]+n[0]*.028,z=f.center[2]+n[2]*.028;
    box(dark,onX?.036:len,.135,onX?len:.036,x,floor+.0675,z,.004);
    box(paint,onX?.075:len,.065,onX?len:.075,x,f.bounds.max[1]-.04,z,.008);
  }
  // 2.8 m steel-framed desk against the southern wall, clear of the door/relay path.
  const cx=-20.45,cz=-60.95,y=floor;
  box(wood,2.80,.052,.82,cx,y+.765,cz,.016);
  box(dark,2.73,.042,.79,cx,y+.725,cz,.006);
  for(const x of [cx-1.24,cx+1.24])for(const z of [cz-.28,cz+.28]){
    box(dark,.042,.70,.042,x,y+.365,z,.006);
    box(rubber,.065,.023,.065,x,y+.0115,z,.009);
  }
  rod(steel,[cx-1.25,y+.20,cz+.28],[cx+1.25,y+.20,cz+.28],.017);
  box(paint,.48,.60,.59,cx+.94,y+.41,cz+.025,.017);
  for(const dy of [.22,.42,.62]){
    box(dark,.44,.008,.008,cx+.94,y+dy,cz-.278,.001);
    rod(steel,[cx+.84,y+dy+.08,cz-.29],[cx+1.04,y+dy+.08,cz-.29],.012);
  }
  b.col(cx-1.4,y,cz-.41,cx+1.4,y+.79,cz+.41,'wood');
  // Compact CRT terminal with rounded shell, recessed glass and a real stand.
  const sx=cx-.18,sy=y+1.13,sz=cz+.06;
  box(plastic,.64,.49,.44,sx,sy,sz,.055);
  box(dark,.60,.45,.055,sx,sy,sz-.235,.018);
  box(plastic,.23,.075,.23,sx,y+.825,sz,.022);
  rod(dark,[sx,y+.80,sz],[sx,y+.94,sz],.07);
  const display=document.createElement('canvas');display.width=768;display.height=512;
  const ctx=display.getContext('2d');
  const tex=new T.CanvasTexture(display);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,i.renderer.capabilities.getMaxAnisotropy());
  const screenMat=new T.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0x88ad86,emissiveIntensity:.38,roughness:.24,metalness:.05});
  b.quad(screenMat,.515,.339,sx,sy+.012,sz-.265,'z-');
  box(steel,.06,.018,.016,sx+.23,sy-.196,sz-.272,.004);
  const led=b.box(i.mats.emissive(0x9ac873,1.0),.009,.009,.008,sx+.15,sy-.195,sz-.275,{bevel:.002});led.castShadow=false;
  // Keyboard deck and individually grouped keys catch light at contact distance.
  box(plastic,.45,.029,.15,sx,y+.805,cz-.265,.012);
  for(let row=0;row<4;row++)for(let col=0;col<13;col++)box(paint,.023,.008,.022,sx-.192+col*.032,y+.823,cz-.313+row*.029,.003);
  box(paint,.145,.008,.021,sx,y+.823,cz-.20,.004);
  box(rubber,.18,.004,.18,sx+.42,y+.795,cz-.255,.015);
  box(plastic,.056,.028,.096,sx+.42,y+.812,cz-.255,.019);
  b.tube(rubber,[[sx+.42,y+.795,cz-.22],[sx+.42,y+.80,cz],[sx+.32,y+.81,cz+.19],[sx+.25,y+.87,cz+.20]],.006,{radial:5});
  b.tube(rubber,[[sx,y+1.12,sz+.22],[sx+.10,y+.83,sz+.24],[sx+.32,y+.64,sz+.22],[sx+.32,y+.12,sz+.23]],.011,{radial:6});
  // Adjustable task lamp; small source geometry, no unmotivated global fill.
  const lx=cx-.99,lz=cz+.06;
  b.cyl(dark,.115,.025,lx,y+.807,lz,{seg:24});
  rod(steel,[lx,y+.82,lz],[lx-.09,y+1.12,lz],.012);
  rod(steel,[lx-.09,y+1.12,lz],[lx+.12,y+1.31,lz-.1],.012);
  for(const p of [[lx,y+.83,lz],[lx-.09,y+1.12,lz],[lx+.12,y+1.31,lz-.1]])b.cyl(dark,.033,.035,...p,{axis:'z',seg:12});
  const shade=box(paint,.25,.055,.12,lx+.12,y+1.305,lz-.1,.017);shade.rotation.z=-.15;
  const lens=box(i.mats.emissive(0xffdb9f,1.0),.21,.012,.09,lx+.12,y+1.273,lz-.1,.004);lens.castShadow=false;
  // Chair: a padded seat/back, five-star base, gas cylinder and separate castors.
  const qx=cx-.26,qz=-61.85;
  box(plastic,.46,.075,.43,qx,y+.445,qz,.045);
  const back=box(plastic,.43,.43,.075,qx,y+.76,qz-.19,.04);back.rotation.x=-.10;
  rod(dark,[qx,y+.43,qz-.17],[qx,y+.81,qz-.22],.021);
  b.cyl(steel,.027,.30,qx,y+.265,qz,{seg:16});b.cyl(plastic,.051,.15,qx,y+.17,qz,{seg:16});
  for(let k=0;k<5;k++){
    const a=k*Math.PI*2/5,x=qx+Math.cos(a)*.29,z=qz+Math.sin(a)*.29;
    rod(dark,[qx,y+.12,qz],[x,y+.075,z],.022);
    b.cyl(rubber,.045,.045,x,y+.048,z,{axis:'x',seg:12});
  }
  b.col(qx-.25,y,qz-.26,qx+.25,y+.98,qz+.24,'metal');
  // Filing cabinet sits in the alcove opposite the tested corner turn.
  const fx=-27.17,fz=-60.56;
  box(paint,.64,1.36,.62,fx,y+.68,fz,.025);
  box(dark,.59,.04,.58,fx,y+.025,fz,.008);
  for(let k=0;k<4;k++){
    const yy=y+.20+k*.31;
    box(dark,.575,.009,.008,fx,yy-.12,fz-.316,.001);
    box(steel,.17,.052,.014,fx,yy+.025,fz-.323,.005);
    box(dark,.075,.020,.006,fx,yy+.025,fz-.332,.002);
    rod(dark,[fx-.08,yy-.055,fz-.345],[fx+.08,yy-.055,fz-.345],.01);
  }
  b.col(fx-.32,y,fz-.31,fx+.32,y+1.36,fz+.31,'metal');
  // The source's wall-mounted wooden proxy is an electrical enclosure. Skin
  // its exact footprint with folded sheet, door reveals and physical switches.
  const ex=-20.32,ey=10.16,ez=-60.5536;
  box(paint,1.64,1.64,.07,ex,ey,ez-.035,.018);
  for(const dx of [-.83,.83])box(steel,.033,1.68,.086,ex+dx,ey,ez-.045,.006);
  for(const dy of [-.83,.83])box(steel,1.68,.033,.086,ex,ey+dy,ez-.045,.006);
  for(const dx of [-.40,.40]){
    box(dark,.755,1.54,.017,ex+dx,ey,ez-.077,.006);
    box(paint,.735,1.52,.017,ex+dx,ey,ez-.089,.009);
    for(let j=0;j<9;j++)box(dark,.50,.013,.009,ex+dx,ey+.36+j*.032,ez-.102,.002);
    rod(steel,[ex+dx+.25,ey-.1,ez-.12],[ex+dx+.25,ey+.1,ez-.12],.012);
  }
  label('BAY CONTROL',.075,ex,ey+.70,ez-.105,{color:'white'});
  label('440 V',.058,ex-.4,ey-.49,ez-.105,{color:'yellow'});
  label('SERVICE / 03',.046,ex+.4,ey-.49,ez-.105,{color:'white'});
  // Small paper instruction sheet beside the source cabinet, on the real wall.
  const paperMat=new T.MeshStandardMaterial({color:0xc1ba9d,roughness:.95});
  box(paperMat,.39,.55,.003,-18.85,y+2.13,-60.16,.001);
  label('SHIFT / 04',.045,-18.85,y+2.31,-60.165,{color:'black'});
  for(let k=0;k<6;k++)box(dark,.28,.004,.001,-18.85,y+2.21-k*.055,-60.166,0);
  // Relay alcove: a shared feed and high cable tray explain the equipment's power.
  for(const x of [-27.48,-24.54]){
    rod(steel,[x,y+.16,-66.51],[x,y+3.30,-66.51],.022);
    for(const yy of [.4,1.4,2.4,3.2])box(dark,.074,.04,.04,x,y+yy,-66.52,.004);
  }
  for(const z of [-66.50,-63.55])rod(steel,[-27.5,y+3.25,z],[-24.50,y+3.25,z],.035);
  box(paint,.30,.48,.16,-24.49,y+1.55,-65.55,.018);
  b.label('UPLINK / B',.083,-24.58,y+1.62,-65.55,'x-',{font:'sans',distress:.07});
  const staging=b.staticRoot;staging.updateMatrixWorld(true);const atlas=rb(staging);root.add(By(staging),b.dynRoot);
  let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  let previous=-1;
  function update(){
    const cut=i.game?.run?.cut||0;if(previous===cut)return;previous=cut;
    ctx.fillStyle='#06120d';ctx.fillRect(0,0,768,512);
    ctx.fillStyle='#86ab7c';ctx.font='26px monospace';ctx.fillText('ASSAULT  /  OPERATIONS',36,52);
    ctx.fillStyle='#355741';ctx.fillRect(36,71,696,2);ctx.font='18px monospace';ctx.fillText('SECURITY NETWORK    03 CHANNELS',36,112);
    const relays=i.game?.run?.relays||[];
    for(let k=0;k<3;k++){const disabled=relays[k]?.cut||false;ctx.fillStyle=disabled?'#b18c52':'#83b88c';ctx.fillRect(40,155+k*68,10,10);ctx.fillText('UPLINK '+String.fromCharCode(65+k)+'     '+(disabled?'OFFLINE':'ENABLED'),68,169+k*68);}
    ctx.fillStyle='#55735a';ctx.fillRect(36,373,696,1);ctx.font='16px monospace';ctx.fillText('RECEIVING 01      BAY SYSTEMS / LOCAL',36,411);
    ctx.fillStyle='rgba(0,0,0,.14)';for(let y=0;y<512;y+=3)ctx.fillRect(0,y,768,1);tex.needsUpdate=true;
  }
  update();return {root,update,stats:{meshes,triangles,rooms:2,desks:1,chairs:1,terminals:1}};
}
