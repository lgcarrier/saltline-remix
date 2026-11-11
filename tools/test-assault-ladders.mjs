/**
 * Controller regression simulations against the extracted BSP's static collision.
 * Runs the actual updateLadder source, not a second ladder implementation.
 * Locomotion intent is applied at 60 Hz before the level update, reproducing the
 * original bug where forward motion crossed the ladder volume during a climb.
 * This supplements browser keyboard tests; it does not test pointer lock, audio,
 * animation, doors, breakables, or the complete player acceleration controller.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

class Vector {
  constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z,isVector3:true});}
  clone(){return new Vector(this.x,this.y,this.z);}
  set(x,y,z){Object.assign(this,{x,y,z});return this;}
}
const read = relative => fs.readFileSync(new URL('../'+relative,import.meta.url),'utf8');
const map = JSON.parse(read('src/assault-map.json'));
const levelSource = read('src/assault-level.js');
const physicsSource = read('src/assault-physics.js');
const start = levelSource.indexOf('  let activeLadder=');
const end = levelSource.indexOf('  function update(dt){',start);
assert.ok(start>=0&&end>start,'Actual ladder controller source anchors must exist');
const ladderSource = levelSource.slice(start,end);
const resetStart=levelSource.indexOf('  function reset(){'),resetEnd=levelSource.indexOf('  const dressing=',resetStart);
assert.ok(resetStart>=0&&resetEnd>resetStart,'Actual level reset source must exist');
const resetSource=levelSource.slice(resetStart,resetEnd);
const delta = 1/60;

function fixture(position,crouching=true){
  const grid={blocked:[],w:1,h:1,minX:0,minZ:0,cell:.75};
  const physics={boxes:[],raycast:()=>null,groundHeight:()=>0,build(){},nav:{_grid:()=>grid}};
  const input={move:{x:0,y:1},pressed:()=>false};
  const player={pos:new Vector(...position),vel:new Vector(),forward:new Vector(0,0,1),pitch:0,crouching,onGround:true};
  const i={physics,input,player};
  const scope=vm.createContext({i,map,W:Vector,u1:.42,f3:a=>new Vector(...a),V:a=>new Vector(...a),T:{MathUtils:{clamp:(v,min,max)=>Math.max(min,Math.min(max,v))}},broken:[],dynamic:[],console});
  vm.runInContext(physicsSource+';sAP(i.physics,i);',scope);
  const positions=new Float32Array(map.collision.positions);
  physics.addTriangles(positions,Uint32Array.from({length:positions.length/3},(_,index)=>index));
  for(const ladder of map.ladders){
    const min=ladder.bounds.min.slice(),max=ladder.bounds.max.slice();
    min[0]-=.42;min[2]-=.42;max[0]+=.42;max[2]+=.42;
    physics.addLadder(min,max);
  }
  vm.runInContext(ladderSource+resetSource+';globalThis.reset=reset;globalThis.tick=updateLadder;globalThis.status=()=>({latched:!!ladderLatch,phase:ladderLatch?.phase,active:!!activeLadder,cooldown:ladderCooldown});',scope);
  return {physics,input,player,tick:scope.tick,status:scope.status,reset:scope.reset};
}
function run(scene,frames,direction=1){
  scene.input.move.y=direction;
  for(let frame=0;frame<frames;frame++){
    const p=scene.player;
    p.vel.x=scene.input.move.x*1.9+p.forward.x*direction*1.9;
    p.vel.z=p.forward.z*direction*1.9;
    p.vel.y-=21*delta;
    scene.physics.moveCapsule(p.pos,p.vel,delta,.32,p.crouching?1.15:1.8,true);
    scene.tick(p,delta);
  }
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}

test('ladder26 holds forward movement until the crouched duct exit',()=>{
  const scene=fixture([0,8.5344,-70.47]);run(scene,180);
  assert.ok(scene.player.pos.y>=11.07&&scene.player.pos.z>-69.6,'Gallery ladder must reach and exit the upper duct');
  assert.equal(scene.status().latched,false);
});
test('ladder28 climbs from the duct to the roof',()=>{
  const scene=fixture([0,11.0744,-55.90]);run(scene,120);
  assert.ok(scene.player.pos.y>=13&&scene.player.pos.z>-55.35,'Roof ladder must reach the actual upper floor');
  assert.equal(scene.status().latched,false);
});
test('standing player is blocked by the low duct; crouching then allows entry',()=>{
  const scene=fixture([0,8.5344,-70.47],false);run(scene,180);
  assert.ok(scene.player.pos.z< -69.7,'Standing body must not pass through duct ceiling');
  assert.ok(scene.status().latched,'Player remains on ladder while blocked');
  scene.player.crouching=true;run(scene,90);
  assert.ok(scene.player.pos.z> -69.6&&scene.player.pos.y>=11.07);
  assert.equal(scene.status().latched,false);
});
test('idle ladder grip holds height despite ordinary gravity updates',()=>{
  const scene=fixture([0,8.5344,-70.47]);run(scene,20);
  const height=scene.player.pos.y;run(scene,120,0);
  assert.ok(scene.status().latched);
  assert.ok(Math.abs(scene.player.pos.y-height)<.005,'Idle grip must not drift or fall');
});
test('backward input descends and releases at the gallery floor',()=>{
  const scene=fixture([0,8.5344,-70.47]);run(scene,20);run(scene,120,-1);
  assert.ok(Math.abs(scene.player.pos.y-8.5344)<.01);
  assert.equal(scene.status().latched,false);
});
test('strafe releases the ladder and permits lateral movement',()=>{
  const scene=fixture([0,8.5344,-70.47]);run(scene,20);
  scene.input.move.x=1;run(scene,12,0);
  assert.equal(scene.status().latched,false);assert.ok(scene.player.pos.x>.25);
});
test('Space releases and applies a jump without immediate reacquisition',()=>{
  const scene=fixture([0,8.5344,-70.47]);run(scene,20);
  scene.input.pressed=key=>key==='jump';scene.tick(scene.player,delta);
  assert.equal(scene.status().latched,false);assert.ok(scene.player.vel.y>6);
  scene.input.pressed=()=>false;run(scene,8);
  assert.equal(scene.status().latched,false,'Jump cooldown prevents immediate reattachment');
});
test('exterior ladder13 reaches and releases onto the sloping roof',()=>{
  const scene=fixture([18.85,0,-44.704]);scene.player.forward.set(-1,0,0);run(scene,300);
  assert.ok(scene.player.pos.x<18.1&&scene.player.pos.y>9.9,'Last rung must transition onto the slightly higher roof');
  assert.equal(scene.status().latched,false);
});
test('top entry crosses the duct edge before descending to the gallery',()=>{
  const scene=fixture([0,11.0744,-69.5]);scene.player.forward.set(0,0,-1);scene.player.pitch=-.6;run(scene,150);
  assert.ok(Math.abs(scene.player.pos.y-8.5344)<.01,'Top entry must descend to the original gallery floor');
  assert.equal(scene.status().latched,false);
});
test('exterior sloped-roof entry can descend below the last rung',()=>{
  const scene=fixture([17.9,10.15,-44.704]);scene.player.forward.set(1,0,0);scene.player.pitch=-.6;run(scene,300);
  assert.ok(scene.player.pos.y<.82,'Exterior descent must reach the ground beneath the first rung');
  assert.equal(scene.status().latched,false);
});
test('roof ladder28 descends from an off-center normal-input approach',()=>{
  const scene=fixture([-.5512,13.0048,-55.017]);scene.player.forward.set(0,0,-1);scene.player.pitch=-.6;run(scene,180);
  assert.ok(Math.abs(scene.player.pos.y-11.0744)<.01,`Off-center roof approach must reach the duct floor: ${JSON.stringify({pos:scene.player.pos,state:scene.status()})}`);
  assert.equal(scene.status().latched,false);
});
test('mission reset clears active grip and reacquisition cooldown',()=>{
  const scene=fixture([0,8.5344,-70.47]);run(scene,20);assert.ok(scene.status().latched);scene.reset();
  assert.deepEqual(JSON.parse(JSON.stringify(scene.status())),{latched:false,active:false,cooldown:0});
  run(scene,4);scene.input.move.x=1;run(scene,1,0);assert.ok(scene.status().cooldown>0);scene.reset();
  assert.equal(scene.status().cooldown,0);
});
console.log(`${passed} actual-map ladder controller simulations passed.`);
