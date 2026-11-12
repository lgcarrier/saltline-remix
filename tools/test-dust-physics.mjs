// Source geometry tests; these are separate from browser normal-input gameplay.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z,isVector3:true});}clone(){return new V(this.x,this.y,this.z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}}
const context=vm.createContext({W:V,u1:.42,f3:v=>v.isVector3?v.clone():new V(...v),console,Math,Float64Array,Int32Array,Uint8Array,Map,Infinity,performance});
vm.runInContext(fs.readFileSync(new URL('../src/assault-physics.js',import.meta.url),'utf8')+';globalThis.make=sAP;',context);
const map=JSON.parse(fs.readFileSync(new URL('../src/dust-map.json',import.meta.url),'utf8'));
const cell=.75,minX=Math.floor(map.bounds.min[0])-2,minZ=Math.floor(map.bounds.min[2])-2;
const grid={minX,minZ,w:Math.ceil((map.bounds.max[0]-minX+2)/cell),h:Math.ceil((map.bounds.max[2]-minZ+2)/cell),cell};grid.blocked=new Uint8Array(grid.w*grid.h);
const p=context.make({boxes:[],raycast:()=>null,groundHeight:()=>-Infinity,build(){},nav:{cell,_grid:()=>grid}},{});
for(const collision of [map.collision,...map.breakables.map(b=>b.collision)]){
 const positions=Float32Array.from(collision.positions);let end=0;for(const run of collision.ranges){assert.equal(run.start,end);assert.equal(run.count%3,0);p.addTriangles(positions,Uint32Array.from({length:run.count},(_,i)=>run.start+i),run.surface);end+=run.count;}assert.equal(end,positions.length/3);
}
const started=performance.now();p.build();const buildMs=performance.now()-started;
const checks=[];function test(name,fn){fn();checks.push(name);console.log('PASS',name);}
const near=(a,b,tolerance=.015)=>assert.ok(Math.abs(a-b)<tolerance,`${a} should be near ${b}`);
const grounded=pos=>new V(pos[0],p.groundHeight(pos[0],pos[2],pos[1]+.025),pos[2]);
const spawns=map.entities.filter(e=>['info_player_start','info_player_deathmatch'].includes(e.classname)).map(e=>({...e,feet:grounded(e.pos)}));
const ct=spawns.find(e=>e.classname==='info_player_start').feet;
const tt=spawns.find(e=>e.classname==='info_player_deathmatch').feet;
const sites={};
for(const b of map.bombsites){const candidates=[];for(let x=b.bounds.min[0]+.75;x<b.bounds.max[0]-.75;x+=.75)for(let z=b.bounds.min[2]+.75;z<b.bounds.max[2]-.75;z+=.75){const v=grounded([x,b.bounds.min[1]+.1,z]);if(Math.abs(v.y-b.bounds.min[1])<.1&&p.canStand(v,1.8,.7))candidates.push(v);}assert.ok(candidates.length,b.label+' needs open site floor');sites[b.label]=candidates[Math.floor(candidates.length*.5)];}
console.log('SITES',JSON.stringify(sites));
test('stock metadata identifies Dust and all 48 brush models',()=>{assert.equal(map.source.map,'de_dust');assert.equal(map.stats.models,48);assert.equal(spawns.length,32);assert.equal(map.bombsites.length,2);assert.equal(map.breakables.length,14);assert.ok(map.breakables.every(b=>b.triggerOnly));for(const [texture,material] of [['-2Sand','dust_sand'],['generic011','steel_dark'],['+0~fifties_lgt2','dust_lamp']]){const surfaces=map.surfaces.filter(s=>s.texture===texture);assert.ok(surfaces.length);assert.ok(surfaces.every(s=>s.material===material));}});
test('trigger volumes do not render or collide and illusionary brushes remain nonsolid',()=>{const triggers=new Set(map.triggers.map(t=>t.modelId));assert.ok(map.surfaces.every(s=>!triggers.has(s.modelId)));assert.deepEqual(Object.keys(map.stats.collisionByModel).filter(id=>id!=='0').map(Number).sort((a,b)=>a-b),map.breakables.map(b=>b.modelId));assert.ok(map.surfaces.some(s=>s.classname==='func_illusionary'));});
test('all 19 source world textures have physical and source UVs with outward normals',()=>{assert.equal(new Set(map.surfaces.filter(s=>s.modelId===0).map(s=>s.texture)).size,19);for(const s of [...map.surfaces,...map.breakables.flatMap(b=>b.surfaces)]){assert.equal(s.positions.length,s.normals.length);assert.equal(s.uvMeters.length,s.positions.length/3*2);assert.equal(s.uvSource.length,s.uvMeters.length);for(let k=0;k<s.positions.length;k+=9){const a=s.positions.slice(k,k+3),b=s.positions.slice(k+3,k+6),c=s.positions.slice(k+6,k+9),u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(cross.reduce((sum,x,i)=>sum+x*s.normals[k+i],0)>0);}}});
test('all 32 native player starts stand on source floors with headroom',()=>{for(const s of spawns){assert.ok(Number.isFinite(s.feet.y));assert.ok(p.canStand(s.feet),JSON.stringify(s));assert.ok(p.assaultDebug.nearestNav(s.feet.x,s.feet.y,s.feet.z));}near(ct.y,1.6256);near(tt.y,-3.2512);});
test('both source bombsites contain an accessible standing location',()=>{for(const [label,pos] of Object.entries(sites)){const bounds=map.bombsites.find(s=>s.label===label).bounds;assert.ok([pos.x,pos.y,pos.z].every((v,i)=>v>=bounds.min[i]-.01&&v<=bounds.max[i]+.01));assert.ok(p.canStand(pos));}});
const underpass=new V(-26.5,-4.8768,-38);
test('underpass relay C retains usable floor, terminal clearance and headroom',()=>{near(p.groundHeight(underpass.x,underpass.z,underpass.y+.1),underpass.y);assert.ok(p.canStand(underpass,1.8,.7));});
const routes=[];
test('CT, T, both bombsites and underpass relay connect through layered navigation',()=>{for(const [name,from,to] of [['ct-to-t',ct,tt],['ct-to-a',ct,sites.A],['ct-to-b',ct,sites.B],['a-to-b',sites.A,sites.B],['t-to-underpass',tt,underpass],['underpass-to-b',underpass,sites.B]]){const path=p.nav.findPath(from,to);assert.ok(path?.length,name);routes.push({name,from,to,path});}});
// Vertical layers must remain separated at the tunnel crossing. Select a real
// stacked floor cell with >2m separation and supported, unobstructed lower lane.
const stacked=[];
for(let z=-78;z<0;z+=.75)for(let x=-35;x<30;x+=.75){const f=p.assaultDebug.floorsAt(x,z);if(f.length>1&&f.at(-1)-f[0]>2&&p.canStand(new V(x,f[0],z)))stacked.push({x,z,floors:f});}
test('underpass preserves lower floor and ceiling beneath upper geometry',()=>{assert.ok(stacked.length>0);const q=stacked[Math.floor(stacked.length/2)],lower=q.floors[0];near(p.groundHeight(q.x,q.z,lower+.1),lower);const hit=p.raycast(new V(q.x,lower+1,q.z),new V(0,1,0),15);assert.ok(hit&&hit.point.y>lower+1&&hit.point.y<=q.floors.at(-1)+.02);});
// Run the actual capsule solver along all nav points; no teleporting between
// waypoints. This verifies source collision/navigation agreement, not UI input.
function simulate(route){const pos=route.from.clone(),vel=new V();let ticks=0;for(const node of route.path){for(let k=0;k<600;k++){const dx=node.x-pos.x,dz=node.z-pos.z,d=Math.hypot(dx,dz);if(d<.13)break;vel.x=dx/d*3.8;vel.z=dz/d*3.8;vel.y-=21/120;p.moveCapsule(pos,vel,1/120);ticks++;if(k===599)throw new Error(`${route.name} blocked at ${JSON.stringify(pos)} aiming at ${JSON.stringify(node)}`);}}assert.ok(Math.hypot(pos.x-route.to.x,pos.z-route.to.z)<1.5);return {name:route.name,final:pos,ticks,simulationSeconds:ticks/120};}
const simulated=[];
test('capsule controller traverses both sites, T spawn and underpass without debug position changes',()=>{for(const route of routes)simulated.push(simulate(route));});
const report={kind:'source geometry + navigation + controller simulation; not normal-input play',source:map.source,stats:map.stats,grid:{...grid,blocked:undefined},physics:p.assaultDebug.stats(),buildMs,checks,spawns:spawns.map(({classname,feet,yaw})=>({classname,pos:[feet.x,feet.y,feet.z],yaw})),sites,stackedProbe:stacked[Math.floor(stacked.length/2)],simulated,routes:routes.map(r=>({...r,path:r.path.map(v=>[v.x,v.y,v.z])}))};
if(process.env.DUST_REPORT){fs.mkdirSync(new URL('../output/playwright/dust/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/playwright/dust/source-physics.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:checks.length,buildMs,stats:p.assaultDebug.stats(),spawns:report.spawns.slice(0,2),sites,stackedProbe:report.stackedProbe,simulated},null,2));
