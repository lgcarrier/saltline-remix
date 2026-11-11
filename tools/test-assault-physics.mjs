import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Vector {constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z,isVector3:true});}clone(){return new Vector(this.x,this.y,this.z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}}
const context=vm.createContext({W:Vector,u1:.42,f3:v=>v.isVector3?v.clone():new Vector(...v),console,Math,Float64Array,Int32Array,Uint8Array,Map,Infinity});
vm.runInContext(fs.readFileSync(new URL('../src/assault-physics.js',import.meta.url),'utf8')+';globalThis.make=sAP;',context);
function create(bounds={minX:-10,minZ:-10,w:28,h:28,cell:.75}){
 const grid={...bounds,blocked:new Uint8Array(bounds.w*bounds.h)};
 const p={boxes:[],raycast:()=>null,groundHeight:(x,z,max)=>0,build(){},nav:{cell:bounds.cell,_grid:()=>grid}};
 return context.make(p,{});
}
function triangles(p,vs,idx){p.addTriangles(new Float32Array(vs.flat()),new Uint16Array(idx));}
function floor(p,x0,z0,x1,z1,y){triangles(p,[[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0]],[0,1,2,0,2,3]);}
function ceiling(p,x0,z0,x1,z1,y){triangles(p,[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],[0,1,2,0,2,3]);}
function wall(p,x,y0,y1,z0,z1){triangles(p,[[x,y0,z0],[x,y1,z0],[x,y1,z1],[x,y0,z1]],[0,1,2,0,2,3]);}
const near=(a,b,e=.01)=>assert.ok(Math.abs(a-b)<e,`${a} should be near ${b}`);
const checks=[];
function test(name,fn){fn();checks.push(name);console.log('PASS',name);}
test('downward ray returns closest floor and upward normal',()=>{const p=create();floor(p,-4,-4,4,4,3);const h=p.raycast(new Vector(0,10,0),new Vector(0,-1,0),20);near(h.dist,7);near(h.normal.y,1);});
test('ray DDA reaches thin distant wall without area scan',()=>{const p=create();wall(p,100,0,5,-1,1);const h=p.raycast(new Vector(0,2,0),new Vector(1,0,0),200);near(h.dist,100);assert.ok(p.assaultDebug.stats().rayTriangles===2);});
test('high speed movement does not tunnel through walls',()=>{const p=create();floor(p,-5,-5,5,5,0);wall(p,1,0,4,-4,4);const pos=new Vector(-2,0,0),vel=new Vector(30,0,0);const h=p.moveCapsule(pos,vel,.3);assert.ok(h.hitWall);near(pos.x,.678,.02);assert.ok(vel.x<.01);});
test('wall corners block capsule even outside triangle projection',()=>{const p=create();floor(p,-5,-5,5,5,0);wall(p,1,0,4,0,2);const pos=new Vector(0,0,-.2),vel=new Vector(5,0,0);p.moveCapsule(pos,vel,.25);assert.ok(Math.hypot(pos.x-1,pos.z)>=.319);});
test('jump leaves ground, falls, and lands on an elevated floor',()=>{const p=create();floor(p,-4,-4,4,4,3);const pos=new Vector(0,3,0),vel=new Vector(0,6,0);let peak=3,ground=false;for(let k=0;k<150;k++){vel.y-=16/120;const h=p.moveCapsule(pos,vel,1/120);peak=Math.max(peak,pos.y);if(k>60&&h.onGround)ground=true;}assert.ok(peak>4);assert.ok(ground);near(pos.y,3);});
test('jump hits ceiling only inside its triangle footprint',()=>{const p=create();floor(p,-5,-5,5,5,0);triangles(p,[[0,2.2,0],[3,2.2,0],[0,2.2,3]],[0,1,2]);let pos=new Vector(.5,0,.5),vel=new Vector(0,8,0);let h=p.moveCapsule(pos,vel,.2);assert.ok(h.hitCeil);assert.ok(pos.y<.401);pos=new Vector(2.7,0,2.7);vel=new Vector(0,8,0);h=p.moveCapsule(pos,vel,.2);assert.ok(!h.hitCeil);assert.ok(pos.y>1);});
test('short stair step climbs; tall wall does not',()=>{const p=create();floor(p,-5,-5,5,5,0);floor(p,1,-2,3,2,.3);wall(p,1,0,.3,-2,2);const pos=new Vector(0,0,0),vel=new Vector(3,0,0);p.moveCapsule(pos,vel,.6);assert.ok(pos.x>1.5);near(pos.y,.3);});
test('ramp supports grounded ascent',()=>{const p=create();floor(p,-5,-5,0,5,0);triangles(p,[[0,0,-2],[0,0,2],[4,2,2],[4,2,-2]],[0,1,2,0,2,3]);const pos=new Vector(-.5,0,0),vel=new Vector(2,0,0);for(let k=0;k<180;k++){vel.y=-.1;p.moveCapsule(pos,vel,1/120);}assert.ok(pos.x>2);near(pos.y,(pos.x+.32)/2,.03);});
test('layered navigation retains stacked floors without phantom vertical route',()=>{const p=create();floor(p,-5,-5,5,5,0);floor(p,-5,-5,5,5,3);ceiling(p,-5,-5,5,5,2.8);p.build();assert.ok(p.assaultDebug.stats().navLayers>0);const lower=p.nav.findPath(new Vector(-3,0,0),new Vector(3,0,0)),upper=p.nav.findPath(new Vector(-3,3,0),new Vector(3,3,0));assert.ok(lower?.length&&upper?.length);assert.ok(upper.every(n=>Math.abs(n.y-3)<.01));assert.equal(p.nav.findPath(new Vector(-3,0,0),new Vector(3,3,0)),null);assert.ok(!p.nav.isWalkable(0,0,1.5));});
test('navigation follows stair elevation',()=>{const p=create();floor(p,-5,-3,0,3,0);for(let k=0;k<10;k++){floor(p,k*.4,-3,(k+1)*.4,3,(k+1)*.2);wall(p,k*.4,k*.2,(k+1)*.2,-3,3);}floor(p,4,-3,7,3,2);p.build();const path=p.nav.findPath(new Vector(-2,0,0),new Vector(6,2,0));assert.ok(path?.length);assert.ok(path.some(n=>n.y>1.5));});
test('standing rejected in a low vent while crouched capsule fits',()=>{const p=create();floor(p,-4,-4,4,4,0);ceiling(p,-4,-4,4,4,1.4);assert.equal(p.canStand(new Vector(0,0,0)),false);assert.equal(p.canStand(new Vector(0,0,0),1.15),true);});
test('standing capsule cannot enter low ceiling laterally',()=>{const p=create();floor(p,-5,-5,5,5,0);ceiling(p,0,-3,4,3,1.4);const pos=new Vector(-1,0,0),vel=new Vector(5,0,0);p.moveCapsule(pos,vel,.4);assert.ok(pos.x<0);const crouch=new Vector(-1,0,0),v=new Vector(5,0,0);p.moveCapsule(crouch,v,.4,.32,1.15);assert.ok(crouch.x>.5);});
test('dynamic noNav door preserves graph route but blocks player',()=>{const p=create();floor(p,-5,-5,5,5,0);p.boxes.push({min:new Vector(-.2,0,-5),max:new Vector(.2,3,5),surface:'metal',noNav:true});p.build();assert.ok(p.nav.findPath(new Vector(-3,0,0),new Vector(3,0,0))?.length);const pos=new Vector(-1,0,0),vel=new Vector(5,0,0);p.moveCapsule(pos,vel,.3);assert.ok(pos.x<-.5);p.boxes.length=0;vel.x=5;p.moveCapsule(pos,vel,.3);assert.ok(pos.x>.2);});
test('route cache returns independent waypoint vectors',()=>{const p=create();floor(p,-5,-5,5,5,0);p.build();const start=new Vector(-3,0,0),goal=new Vector(3,0,0);const a=p.nav.findPath(start,goal),x=a[0].x;a[0].x=999;const b=p.nav.findPath(start,goal);near(b[0].x,x);assert.ok(p.assaultDebug.stats().navCacheHits===1);assert.ok(p.assaultDebug.stats().navSearches===1);});
test('disconnected components reject without running A star',()=>{const p=create();floor(p,-5,-5,-1,5,0);floor(p,1,-5,5,5,0);p.build();for(let k=0;k<20;k++)assert.equal(p.nav.findPath(new Vector(-3,0,0),new Vector(3,0,0)),null);const s=p.assaultDebug.stats();assert.equal(s.navSearches,0);assert.equal(s.navDisconnected,20);});
// Read the same authored scene and engine grid as the standalone build. No
// fallback to the draft's reversed mesh or superseded relay coordinates.
const fresh=JSON.parse(fs.readFileSync(new URL('../src/assault-map.json',import.meta.url),'utf8'));
const levelSource=fs.readFileSync(new URL('../src/assault-level.js',import.meta.url),'utf8');
const templateSource=fs.readFileSync(new URL('../reference/grok-assault.html',import.meta.url),'utf8');
const relayLiteral=levelSource.match(/const relayDefs\s*=\s*(\[[\s\S]*?\]);/);
const startLiteral=levelSource.match(/const start=\{pos:V\((\[[^\]]+\])\),yaw:/);
const navDeclaration=templateSource.match(/var u1=([^;]+);function d3/);
assert.ok(relayLiteral&&startLiteral&&navDeclaration,'Current level relay/start/grid source anchors must exist');
const relayDefs=vm.runInNewContext('('+relayLiteral[1]+')',{}, {timeout:1000});
const playerStart=JSON.parse(startLiteral[1]);
const gridSpec=vm.runInNewContext('var u1='+navDeclaration[1]+';({minX:Ya,minZ:ol,w:qt,h:Qs,cell:Ls})',{}, {timeout:1000});
{
 const p=create(gridSpec),ps=new Float32Array(fresh.collision.positions);
 p.addTriangles(ps,Uint32Array.from({length:ps.length/3},(_,k)=>k));
 const t=performance.now();p.build();const buildMs=Math.round(performance.now()-t);
 const relayChecks=relayDefs.map(r=>{
   const [x,y,z]=r.pos,floor=p.groundHeight(x,z,y+.05),floors=p.assaultDebug.floorsAt(x,z),nav=p.assaultDebug.nearestNav(x,y,z);
   assert.ok(Math.abs(floor-y)<.05,`${r.id} must stand on its authored floor: ${y} versus ${floor}`);
   assert.ok(nav&&Math.abs(nav.y-y)<1,`${r.id} needs a nearby navigation surface at the same elevation`);
   return {id:r.id,pos:r.pos,floor,floors,nav};
 });
 const jumpPos=new Vector(7.5,0,-48.4),jumpVel=new Vector(0,Math.sqrt(42),3.8);let hitFloor=false;
 for(let k=0;k<120;k++){jumpVel.z=3.8;jumpVel.y-=21/240;const h=p.moveCapsule(jumpPos,jumpVel,1/120,.32,1.8,k>45);jumpVel.y-=21/240;if(h.onGround&&jumpPos.y>.8)hitFloor=true;}
 console.log('MAP_JUMP',JSON.stringify({pos:jumpPos,landedOnLoadingPlatform:hitFloor}));assert.ok(hitFloor,'Native Saltline 1m jump must reach the 0.8128m loading platform');
 const routeStart=new Vector(...playerStart), office=relayDefs.find(r=>r.id==='relay_b'), routeTargets=[new Vector(-7.3152,3.2512,-43.8912),new Vector(...office.pos)];
 if(process.env.DEBUG_MAP) console.log('FLOOR_PROBES',JSON.stringify(Array.from({length:15},(_,k)=>{let z=-34-k;return {z,rows:[-10,0,5,10,15,18].map(x=>({x,floors:p.assaultDebug.floorsAt(x,z)}))};})));
 console.log('MAP_REACHABLE',JSON.stringify(p.assaultDebug.navigationReport(routeStart,routeTargets)));
 console.log('MAP_ROUTES',JSON.stringify(routeTargets.map(target=>{const t=performance.now(),path=p.nav.findPath(routeStart,target);return {target,pathNodes:path?.length||0,ms:Math.round(performance.now()-t)};})));
 const timedRoute=(name,from,to,expected)=>{const start=performance.now(),path=p.nav.findPath(from,to),firstMs=performance.now()-start;assert.equal(!!path,expected,name);const timings=[];for(let k=0;k<500;k++){const t=performance.now();p.nav.findPath(from,to);timings.push(performance.now()-t);}timings.sort((a,b)=>a-b);return {name,reachable:!!path,pathNodes:path?.length||0,firstMs:+firstMs.toFixed(3),repeated500:{p50Ms:+timings[250].toFixed(3),p95Ms:+timings[475].toFixed(3),maxMs:+timings[499].toFixed(3)}};};
 console.log('MAP_NAV_TIMING',JSON.stringify([
 timedRoute('CT to loading hall',routeStart,new Vector(0,0,-52),true),
 timedRoute('Raised warehouse platform to hostage office',new Vector(8,.8128,-60),new Vector(...office.pos),true),
 timedRoute('CT to raised floor requires jump',routeStart,routeTargets[0],false)
 ]));
 console.log('MAP',JSON.stringify({...p.assaultDebug.stats(),buildMs,startFloor:p.groundHeight(playerStart[0],playerStart[2],playerStart[1]+.7),relays:relayChecks}));
}
console.log(`${checks.length} physics/navigation checks passed.`);
