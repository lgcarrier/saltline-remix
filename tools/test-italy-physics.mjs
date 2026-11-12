// Complete source geometry and capsule simulations, distinct from browser-input QA.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z,isVector3:true});}clone(){return new V(this.x,this.y,this.z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}}
const context=vm.createContext({W:V,u1:.42,f3:v=>v.isVector3?v.clone():new V(...v),console,Math,Float64Array,Int32Array,Uint8Array,Map,Infinity,performance});
vm.runInContext(fs.readFileSync(process.env.ITALY_PHYSICS_SOURCE||new URL('../src/assault-physics.js',import.meta.url),'utf8')+';globalThis.make=sAP;',context);
const map=JSON.parse(fs.readFileSync(new URL('../src/italy-map.json',import.meta.url),'utf8'));
const cell=.75,minX=-46,minZ=-70;
const grid={minX,minZ,w:Math.round((34-minX)/cell),h:Math.round((70-minZ)/cell),cell};grid.blocked=new Uint8Array(grid.w*grid.h);
const p=context.make({boxes:[],raycast:()=>null,groundHeight:()=>-Infinity,build(){},nav:{cell,_grid:()=>grid}},{});
for(const collision of [map.collision,...map.breakables.map(b=>b.collision)]){
 const positions=Float32Array.from(collision.positions);let end=0;
 for(const run of collision.ranges){assert.equal(run.start,end);assert.equal(run.count%3,0);p.addTriangles(positions,Uint32Array.from({length:run.count},(_,i)=>run.start+i),run.surface);end+=run.count;}
 assert.equal(end,positions.length/3);
}
const started=performance.now();p.build();const buildMs=performance.now()-started;
const checks=[];function test(name,fn){fn();checks.push(name);console.log('PASS',name);}
const near=(a,b,tolerance=.015)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tolerance,`${a} should be near ${b}`);
const grounded=pos=>new V(pos[0],p.groundHeight(pos[0],pos[2],pos[1]+.025),pos[2]);
const spawns=map.entities.filter(e=>['info_player_start','info_player_deathmatch'].includes(e.classname)).map(e=>({...e,feet:grounded(e.pos)}));
const ct=spawns.find(e=>e.classname==='info_player_start').feet;
const tt=spawns.find(e=>e.classname==='info_player_deathmatch').feet;
const hostages=map.hostages.map(e=>({...e,feet:grounded(e.pos)}));
const rescue=grounded(map.rescueZones[0].pos);
const relays={market:new V(23.8,-3.8608,3),apartments:new V(-26,.2032,-29),house:new V(21.1328,3.2512,-59.3344)};
test('source metadata identifies cs_italy and the entire 102-model BSP',()=>{
 assert.equal(map.source.map,'cs_italy');assert.equal(map.stats.models,102);assert.equal(map.stats.staticTriangles,19278);assert.equal(map.stats.staticCollisionTriangles,20908);assert.equal(map.surfaces.length,201);assert.equal(spawns.length,20);assert.equal(hostages.length,4);assert.equal(map.breakables.length,5);assert.equal(map.doors.length,0);assert.equal(map.ladders.length,0);
 assert.equal(map.stats.nativeSpawns.info_player_start,10);assert.equal(map.stats.nativeSpawns.info_player_deathmatch,10);
});
test('trigger and illusionary source models retain their correct solid-state semantics',()=>{
 const triggers=new Set(map.triggers.map(t=>t.modelId));assert.equal(triggers.size,2);assert.ok(map.surfaces.every(s=>!triggers.has(s.modelId)));
 const illusionary=new Set(map.surfaces.filter(s=>s.classname==='func_illusionary').map(s=>s.modelId));assert.ok(illusionary.size);assert.ok([...illusionary].every(id=>!map.stats.collisionByModel[id]));
 // Original chicken/bottle interaction proxies have no renderable texture;
 // the radio is the only visible breakable brush. Native bounds stay present.
 assert.equal(map.breakables.filter(b=>b.visible).length,1);assert.equal(map.breakables.find(b=>b.visible).properties.targetname,'radio');
 assert.ok(map.breakables.every(b=>b.bounds.min.every((v,i)=>v<=b.bounds.max[i])));
 assert.deepEqual(map.breakables.map(b=>b.collision.positions.length/9),[12,12,12,20,12]);
 assert.ok(map.collision.ranges.some(r=>r.surface==='wood'));assert.ok(map.collision.ranges.some(r=>r.surface==='metal'));
});
test('all 80 native world finishes retain source and metre UVs with hard outward normals',()=>{
 assert.equal(new Set(map.surfaces.filter(s=>s.modelId===0).map(s=>s.texture)).size,80);
 for(const s of [...map.surfaces,...map.breakables.flatMap(b=>b.surfaces)]){
  assert.equal(s.positions.length,s.normals.length);assert.equal(s.vertexLight.length,s.positions.length);assert.equal(s.uvMeters.length,s.positions.length/3*2);assert.equal(s.uvSource.length,s.uvMeters.length);
  for(let k=0;k<s.positions.length;k+=9){const a=s.positions.slice(k,k+3),b=s.positions.slice(k+3,k+6),c=s.positions.slice(k+6,k+9),u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(cross.reduce((sum,x,i)=>sum+x*s.normals[k+i],0)>0);}
 }
});
test('all 20 native spawn locations retain standing clearance and routes from CT',()=>{
 for(const s of spawns){assert.ok(Number.isFinite(s.feet.y));assert.ok(p.canStand(s.feet),JSON.stringify(s));assert.ok(p.nav.findPath(ct,s.feet),s.classname+' '+s.id);}
 near(ct.y,-6.096);near(tt.y,0);
});
test('four hostage locations on two floors and source rescue zone remain reachable',()=>{
 assert.deepEqual([...new Set(hostages.map(h=>+h.feet.y.toFixed(4)))].sort((a,b)=>a-b),[0,3.2512]);
 for(const h of [...hostages,{id:'rescue',feet:rescue}]){assert.ok(p.canStand(h.feet));assert.ok(p.nav.findPath(ct,h.feet),'hostage/rescue '+h.id);}
 near(rescue.y,-6.096);
});
test('market, apartment and upper-house uplinks have source floors and terminal clearance',()=>{
 for(const [id,pos]of Object.entries(relays)){near(p.groundHeight(pos.x,pos.z,pos.y+.03),pos.y);assert.ok(p.canStand(pos,1.8,.7),id);assert.ok(p.nav.findPath(ct,pos),id);}
});
const routes=[];
for(const [name,from,to] of [['ct-to-market',ct,relays.market],['market-to-apartments',relays.market,relays.apartments],['apartments-to-upper-house',relays.apartments,relays.house],['upper-house-to-rescue',relays.house,rescue],['ct-to-t',ct,tt],['ct-to-lower-hostages',ct,hostages[0].feet]]){
 const path=p.nav.findPath(from,to);assert.ok(path?.length,name);routes.push({name,from,to,path});
}
test('hostage-house upper and lower floors remain separate at the same XZ',()=>{
 const x=23,z=-61;near(p.groundHeight(x,z,.1),0);near(p.groundHeight(x,z,3.3),3.2512);
 const hit=p.raycast(new V(x,1,z),new V(0,1,0),6);assert.ok(hit);assert.ok(hit.point.y>2&&hit.point.y<3.3);
});
function simulate(route){const pos=route.from.clone(),vel=new V();let ticks=0;
 for(const node of route.path){for(let k=0;k<600;k++){const dx=node.x-pos.x,dz=node.z-pos.z,d=Math.hypot(dx,dz);if(d<.13)break;vel.x=dx/d*3.8;vel.z=dz/d*3.8;vel.y-=21/120;p.moveCapsule(pos,vel,1/120);ticks++;if(k===599)throw new Error(`${route.name} blocked at ${JSON.stringify(pos)} aiming at ${JSON.stringify(node)}`);}}
 assert.ok(Math.hypot(pos.x-route.to.x,pos.z-route.to.z)<1.5);assert.ok(Math.abs(pos.y-route.to.y)<.7);return {name:route.name,final:pos,ticks,simulationSeconds:ticks/120};
}
const simulated=[];
test('actual capsule traverses full uplink circuit, both hostage floors and extraction',()=>{for(const route of routes)simulated.push(simulate(route));});
// Recorded browser-input corner failure: direct aim at the next graph node
// is obstructed after a slight approach drift. The route must include its safe
// snapped starting node before advancing around the corner; never teleport it.
test('off-grid corner recovery includes the reachable start connector on fresh and cached paths',()=>{
 const from=new V(-27.517914855554846,-3.86080002784729,-46.543451980383736),to=new V(-29.125,-3.86080002784729,-42.625);
 for(let pass=0;pass<2;pass++){
  const path=p.nav.findPath(from,to);assert.ok(path?.length);near(path[0].x,-26.875);near(path[0].z,-46.375);
  assert.ok(p.nav.clearLine(from,path[0]));simulated.push(simulate({name:'recorded-corner-recovery-'+pass,from,to,path}));
 }
});
// Recorded input failure on a diagonal 0.4064m stair riser. Constant 3.8m/s
// test motion crossed the sampling gap, but the real 34m/s² acceleration from
// rest repeatedly hit the wall before any cardinal support ray reached the
// next tread. Keep acceleration, grounded stepping and half-step gravity here.
const stairTraversals=[];
test('normal acceleration climbs the recorded diagonal stair contact across frame rates and headings',()=>{
 const starts=[[19.12547225279238,-1.2192000150680542,-37.900072166214535],[18.420172244004505,-1.2192000150680542,-37.71161840289039]],target=[16.625,0,-47.125];
 for(const start of starts)for(const dt of [1/120,1/60,1/30])for(const headingError of [-.025,0,.025]){
  const pos=new V(...start),vel=new V();let onGround=true,ticks=0,yaw=0;
  for(;ticks<12/dt;ticks++){
   const dx=target[0]-pos.x,dz=target[2]-pos.z,d=Math.hypot(dx,dz);if(d<.1)break;
   if(ticks%Math.round(.15/dt)===0)yaw=Math.atan2(-dx,-dz)+headingError;
   const speed=d>2.5?6.4:3.8,ax=-Math.sin(yaw)*speed-vel.x,az=-Math.cos(yaw)*speed-vel.z,change=Math.hypot(ax,az),limit=(onGround?34:9)*dt;
   if(change<=limit){vel.x=-Math.sin(yaw)*speed;vel.z=-Math.cos(yaw)*speed;}else{vel.x+=ax/change*limit;vel.z+=az/change*limit;}
   vel.y-=21*dt/2;const result=p.moveCapsule(pos,vel,dt,.32,1.8,onGround);if(!result.onGround)vel.y-=21*dt/2;onGround=result.onGround;
  }
  assert.ok(Math.hypot(pos.x-target[0],pos.z-target[2])<.1,`diagonal stair stalled at ${JSON.stringify(pos)}; dt=${dt}, headingError=${headingError}`);
  near(pos.y,0);assert.ok(onGround);stairTraversals.push({start,dt,headingError,final:pos,simulationSeconds:ticks*dt});
 }
});
// Italy's opt-in movement contract retains the original 1m standing jump.
// This harness applies the actual jump impulse, 120Hz half-step gravity,
// horizontal acceleration and head-preserving stance API against native BSP.
const movementScenarios=[];
function jumpAction(start,target,{speed=3.8,initialVelocity=null,tuckAt=Infinity,preserveMomentum=true,duration=1.6}={}){
 const pos=new V(...start),d0=Math.hypot(target[0]-start[0],target[2]-start[2]);
 const vel=new V(...(initialVelocity||[(target[0]-start[0])/d0*speed,Math.sqrt(42),(target[2]-start[2])/d0*speed]));vel.y=Math.sqrt(42);
 let crouching=false,onGround=false,peak=pos.y,tuck=null;const dt=1/120,trace=[];
 for(let k=0;k<duration*120;k++){
  if(!crouching&&k*dt>=tuckAt){const before=pos.y,headBefore=before+1.8;assert.ok(p.resizeCapsule(pos,1.8,1.15,!onGround));crouching=true;tuck={time:k*dt,feetBefore:before,feetAfter:pos.y,headBefore,headAfter:pos.y+1.15};near(tuck.headBefore,tuck.headAfter,.00001);}
  const dx=target[0]-pos.x,dz=target[2]-pos.z,d=Math.hypot(dx,dz);let desired=crouching?1.9:speed;
  if(crouching&&!onGround&&preserveMomentum)desired=Math.max(desired,Math.min(6.4,Math.hypot(vel.x,vel.z)));
  const ux=d>.055?dx/d*desired:0,uz=d>.055?dz/d*desired:0,ax=ux-vel.x,az=uz-vel.z,change=Math.hypot(ax,az),limit=(onGround?34:9)*dt;
  if(change<=limit){vel.x=ux;vel.z=uz;}else{vel.x+=ax/change*limit;vel.z+=az/change*limit;}
  vel.y-=21*dt/2;const result=p.moveCapsule(pos,vel,dt,.32,crouching?1.15:1.8,true);if(!result.onGround)vel.y-=21*dt/2;onGround=result.onGround;peak=Math.max(peak,pos.y);
  if(k%12===0)trace.push({t:k*dt,pos:[pos.x,pos.y,pos.z],onGround,hitCeil:result.hitCeil,hitWall:result.hitWall});
 }
 return {pos,peak,onGround,crouching,tuck,trace};
}
test('native hostage-house crate staircase is reachable with ordinary 1m jumps',()=>{
 let start=[9.6,0,-57.1];
 for(const [name,target]of [['low crate',[10.7442,.8382,-57.0992]],['middle crate',[12,1.651,-56.896]],['top crate',[12,2.4638,-58.6]]]){
  const result=jumpAction(start,target);assert.ok(result.onGround,name);near(result.pos.y,target[1]);assert.ok(Math.hypot(result.pos.x-target[0],result.pos.z-target[2])<.25,name);near(result.peak-start[1],1,.02);movementScenarios.push({name,...result});start=[result.pos.x,result.pos.y,result.pos.z];
 }
});
test('native west-house window excludes a standing hull and admits a crouched hull',()=>{
 const sill=new V(13.2,3.8608,-63);near(p.groundHeight(sill.x,sill.z,3.9),3.8608);
 const roof=p.raycast(new V(sill.x,sill.y+.02,sill.z),new V(0,1,0),3);near(roof.point.y-sill.y,1.6256);
 assert.equal(p.canStand(sill,1.8),false);assert.equal(p.canStand(sill,1.15),true);
});
test('sprint duck-jump reaches the native upper window while a standing jump cannot',()=>{
 const start=[12.5,2.4638,-59.85],target=[13.9,3.2512,-63],settings={speed:6.4,initialVelocity:[0,0,-6.4]};
 const ordinary=jumpAction(start,target,settings);assert.ok(ordinary.pos.x<13.1);assert.ok(ordinary.pos.y<1);near(ordinary.peak,3.4638,.02);
 const tucked=jumpAction(start,target,{...settings,tuckAt:.08});assert.ok(tucked.pos.x>13.7);near(tucked.pos.y,3.2512);assert.ok(tucked.onGround);near(tucked.tuck.feetAfter-tucked.tuck.feetBefore,.65);near(tucked.peak,4.1138,.02);
 movementScenarios.push({name:'west window standing control',...ordinary},{name:'west window sprint duck-jump',...tucked});
});
test('apartment radio perch requires jump-tuck and crouched headroom',()=>{
 const start=[-9,.2032,-19.1516],target=[-7.3152,1.8288,-19.1516],top=new V(...target);
 near(p.groundHeight(start[0],start[2],start[1]+.03),start[1]);assert.equal(p.canStand(top,1.8),false);assert.equal(p.canStand(top,1.15),true);
 const ceiling=p.raycast(new V(top.x,top.y+.02,top.z),new V(0,1,0),3);near(ceiling.point.y-top.y,1.6256);
 const ordinary=jumpAction(start,target);assert.ok(ordinary.pos.y<1);const tucked=jumpAction(start,target,{tuckAt:.08});near(tucked.pos.y,target[1]);assert.ok(tucked.onGround);assert.ok(Math.hypot(tucked.pos.x-target[0],tucked.pos.z-target[2])<.3);
 movementScenarios.push({name:'apartment radio jump-tuck',...tucked});
});
test('crouch expansion never forces the head into a low opening or feet through its sill',()=>{
 const sill=new V(13.2,3.8608,-63),before=sill.clone();assert.equal(p.resizeCapsule(sill,1.15,1.8,false),false);near(sill.y,before.y);
 const aboveSill=new V(13.2,4.1,-63);assert.equal(p.resizeCapsule(aboveSill,1.15,1.8,true),false);near(aboveSill.y,4.1);
 const nearFloor=new V(6,.3,-55);assert.ok(p.resizeCapsule(nearFloor,1.15,1.8,true));near(nearFloor.y,0);
 const airborne=new V(6,1,-55);assert.ok(p.resizeCapsule(airborne,1.8,1.15,true));near(airborne.y,1.65);assert.ok(p.resizeCapsule(airborne,1.15,1.8,true));near(airborne.y,1);
 const groundedPose=new V(6,0,-55);assert.ok(p.resizeCapsule(groundedPose,1.8,1.15,false));near(groundedPose.y,0);assert.ok(p.resizeCapsule(groundedPose,1.15,1.8,false));near(groundedPose.y,0);
});
const report={kind:'source geometry + navigation + controller simulation; not browser normal-input play',source:map.source,stats:map.stats,grid:{...grid,blocked:undefined},physics:p.assaultDebug.stats(),buildMs,checks,spawns:spawns.map(({id,classname,feet,yaw})=>({id,classname,pos:[feet.x,feet.y,feet.z],yaw})),hostages:hostages.map(({id,feet})=>({id,pos:[feet.x,feet.y,feet.z]})),relays,rescue,simulated,stairTraversals,movementScenarios,routes:routes.map(r=>({...r,path:r.path.map(v=>[v.x,v.y,v.z])}))};
if(process.env.ITALY_REPORT){fs.mkdirSync(new URL('../output/playwright/italy/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/playwright/italy/source-physics.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:checks.length,buildMs,stats:p.assaultDebug.stats(),relays,rescue,simulated},null,2));
