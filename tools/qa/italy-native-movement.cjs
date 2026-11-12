// Source-audited optional access route using real browser keys and mouse.
// Read-only telemetry selects controls. No teleport, invulnerability, forced
// velocity, camera assignment, simulation stepping or objective writes occur.
const fs=await import('node:fs/promises'),repo=process.cwd(),out=repo+'/output/playwright/italy';
const driver=require(repo+'/tools/qa/dust-route.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const angle=d=>Math.atan2(Math.sin(d),Math.cos(d));
const continuous=process.env.ITALY_NATIVE_PERFORMANCE==='1'||process.env.ITALY_NATIVE_CONTINUE==='1';
await fs.mkdir(out,{recursive:true});
await page.setViewportSize({width:1600,height:900});
const response=await page.goto('http://127.0.0.1:8767/italy.html?q=high&dynres=0&seed=4207&inputtest=1',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:120000});
if(await page.evaluate(()=>window.__fatal))throw Error(await page.evaluate(()=>window.__fatal));
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
await page.getByRole('button',{name:'Deploy',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');
await sleep(350);
// Native mouse look needs a user gesture to acquire pointer lock (or activate
// the browser's drag fallback). A query parameter alone does not grant it.
await page.locator('#view').click({position:{x:600,y:450}});await sleep(180);
if(process.env.ITALY_NATIVE_PERFORMANCE==='1'){
 const sampler=await fs.readFile(repo+'/tools/qa/performance.cjs','utf8');
 await new Function('page','return (async()=>{'+sampler.replaceAll('30000','60000')+'})()')(page);
}
const evidence={kind:'CT approach, native crate staircase and upper window through real browser keys/mouse; no gameplay state writes',startedAt:new Date().toISOString(),steps:[],before:await driver.state(page),errors:[]};
evidence.documentSha256=(await import('node:crypto')).createHash('sha256').update(await fs.readFile(repo+'/italy.html')).digest('hex');
evidence.servedLength=Number(response.headers()['content-length']);
evidence.inputMode=await page.evaluate(()=>({mode:__G.input.mode,locked:__G.input.locked,touch:__G.input.touch,pointerLock:document.pointerLockElement?.id||null,focused:document.hasFocus()}));
const held=new Set();let cursor={x:600,y:450};
async function key(name,down){if(down&&!held.has(name)){await page.keyboard.down(name);held.add(name);}else if(!down&&held.has(name)){await page.keyboard.up(name);held.delete(name);}}
async function release(){for(const name of [...held])await key(name,false);await driver.release(page);for(const name of ['c','Control','Space','Shift'])await page.keyboard.up(name);}
async function state(){return page.evaluate(()=>{const g=__G,p=g.player;return{state:g.game.state,pos:p.pos.toArray(),eye:p.eye.toArray(),velocity:p.vel.toArray(),yaw:p.yaw,pitch:p.pitch,onGround:p.onGround,crouching:p.crouching,health:p.health,alive:p.alive,invulnerable:p.invulnerable,lookScale:p.lookScale||1,sensitivity:g.input.sensitivity||1,canStand:g.physics.canStand(p.pos,1.8,.32),floor:g.physics.groundHeight(p.pos.x,p.pos.z,p.pos.y+.03),inputMode:g.input.mode,locked:g.input.locked,focused:document.hasFocus()};});}
function requirePlaying(s){if(s.state!=='playing'||!s.alive)throw Error('Movement interrupted: '+s.state);if(s.invulnerable)throw Error('Unexpected invulnerability');}
async function save(){evidence.errors=[...errors];await fs.writeFile(out+'/native-movement.json',JSON.stringify(evidence,null,2)+'\n');}
async function checkpoint(name,result){evidence.steps.push({name,...result});console.log('MOVEMENT',name,result.ok,result.after?.pos||result.state?.pos||'');await save();if(!continuous)await page.screenshot({path:out+'/native-'+name+'.png'});}
async function centerAndFace(yaw){await page.bringToFront();let setup=await state();if(setup.state==='paused'){await page.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForFunction(()=>__G.game.state==='playing');await page.locator('#view').click({position:{x:600,y:450}});await sleep(120);evidence.steps.push({name:'setup-focus-resume',ok:true});}await release();await sleep(250);await page.mouse.move(600,450,{steps:8});cursor={x:600,y:450};await sleep(50);if(!await driver.turn(page,yaw,0))throw Error('Could not align movement view');await sleep(80);}
async function fastAim(yaw,pitch=0){
 const s=await state();requirePlaying(s);const gain=.0021*s.lookScale*s.sensitivity;
 const dx=Math.round(-angle(yaw-s.yaw)/gain),dy=Math.round(-(pitch-s.pitch)/gain);
 const x=cursor.x+dx,y=cursor.y+dy;
 if(x<30||x>1570||y<30||y>870)throw Error('Mouse motion would leave the viewport during native access test');
 // The input handler rejects individual >400px jumps. Intermediate mousemove
 // events below 280px preserve real relative input during the rapid air turn.
 await page.mouse.move(x,y,{steps:Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/280))});cursor={x,y};await sleep(18);
}
async function directMove(target,{jump=false,timeoutMs=4500}={}){
 await release();await sleep(200);const before=await state();requirePlaying(before);
 const dx=target[0]-before.pos[0],dz=target[2]-before.pos[2],yaw=Math.atan2(-dx,-dz);
 await centerAndFace(yaw);const f=[-Math.sin(yaw),-Math.cos(yaw)],started=Date.now(),trace=[];let leftGround=false,peak=before.pos[1],stable=0;
 if(jump)await key('Space',true);
 try{
  while(Date.now()-started<timeoutMs){
   const s=await state();requirePlaying(s);const elapsed=Date.now()-started;peak=Math.max(peak,s.pos[1]);if(!s.onGround)leftGround=true;
   if(jump&&elapsed>70)await key('Space',false);
   const rx=target[0]-s.pos[0],rz=target[2]-s.pos[2],distance=Math.hypot(rx,rz),remaining=rx*f[0]+rz*f[1],along=s.velocity[0]*f[0]+s.velocity[2]*f[1];
   const lateral=Math.abs(rx*f[1]-rz*f[0]);
   if(s.onGround&&(!jump||leftGround)&&distance<.14&&Math.abs(s.pos[1]-target[1])<.06&&Math.hypot(s.velocity[0],s.velocity[2])<.35){if(++stable>=2)return{ok:true,before,after:s,peak,elapsedMs:elapsed,trace};}else stable=0;
   // Brake with the opposite movement key in air. Simply releasing W would
   // preserve momentum and overshoot the small source crates before landing.
   const desired=Math.sign(remaining)*Math.min(3.8,Math.sqrt(2*(s.onGround?26:9)*Math.max(0,Math.abs(remaining)-.055)));
   let command=along<desired-.12?'w':along>desired+.12?'s':null;
   if(lateral>.18&&s.onGround&&elapsed>500){await key('w',false);await key('s',false);await fastAim(Math.atan2(-rx,-rz));const q=await state();f[0]=-Math.sin(q.yaw);f[1]=-Math.cos(q.yaw);}
   await key('w',command==='w');await key('s',command==='s');
   if(trace.length===0||elapsed-trace.at(-1).elapsedMs>=75)trace.push({elapsedMs:elapsed,pos:s.pos,velocity:s.velocity,onGround:s.onGround,crouching:s.crouching});
   await sleep(22);
  }
  return{ok:false,reason:'native-target-timeout',before,after:await state(),target,peak,trace};
 }finally{await key('w',false);await key('s',false);await key('Space',false);}
}
async function waitPose(predicate,timeoutMs,trace){const began=Date.now();while(Date.now()-began<timeoutMs){const s=await state();requirePlaying(s);if(trace)trace.push({elapsedMs:Date.now()-began,...s});if(predicate(s))return s;await sleep(12);}throw Error('Native movement phase timed out at '+JSON.stringify((await state()).pos));}
try{
 await centerAndFace(0);const calibration=[];for(const yaw of [-Math.atan(.18),-Math.atan2(1,.1),0]){await fastAim(yaw);const actual=await state();calibration.push({targetYaw:yaw,actualYaw:actual.yaw,error:angle(actual.yaw-yaw),cursor:{...cursor}});}
 const calibrated=calibration.every(q=>Math.abs(q.error)<.04);await checkpoint('mouse-turn-calibration',{ok:calibrated,calibration,after:await state()});if(!calibrated)throw Error('Rapid real mouse turn calibration failed');if(process.env.ITALY_NATIVE_CALIBRATE_ONLY==='1'){evidence.ok=true;evidence.after=await state();return{calibrated,inputMode:evidence.inputMode,calibration};}
 const approach=await driver.route(page,[9.6,0,-57.1],{waypointTolerance:.10,turnTolerance:.03,replanOnBlock:3,timeoutMs:360000});
 await checkpoint('walk-to-crates',approach);if(!approach.ok)throw Error('Could not reach native crate base through input');
 const fight=await driver.engage(page,{timeoutMs:18000});if(!fight.ok)throw Error('Crate approach combat interrupted');await release();await sleep(500);
 // Verify both supported crouch bindings on an ordinary source floor first.
 const crouchBefore=await state();await key('c',true);await sleep(180);const withC=await state();await key('c',false);await sleep(180);const afterC=await state();
 await key('Control',true);await sleep(180);const withCtrl=await state();await key('Control',false);await sleep(180);const afterCtrl=await state();
 const crouchOK=withC.crouching&&withCtrl.crouching&&!afterC.crouching&&!afterCtrl.crouching&&Math.abs(withC.pos[1]-crouchBefore.pos[1])<.01&&Math.abs(withCtrl.pos[1]-crouchBefore.pos[1])<.01;
 await checkpoint('crouch-bindings',{ok:crouchOK,before:crouchBefore,withC,afterC,withCtrl,after:afterCtrl});if(!crouchOK)throw Error('Ground C/Ctrl binding or stance failed');
 for(const [name,target]of [['low-crate',[10.7442,.8382,-57.0992]],['middle-crate',[12,1.651,-56.896]],['top-crate',[12,2.4638,-58.6]]]){
  const result=await directMove(target,{jump:true});await checkpoint(name,result);if(!result.ok)throw Error(name+' jump failed');
 }
 const lineup=await directMove([12.5,2.4638,-58.55]);await checkpoint('window-lineup',lineup);if(!lineup.ok)throw Error('Could not line up on native top crate');
 await centerAndFace(0);await key('w',true);await key('Shift',true);
 const runTrace=[],launch=await waitPose(s=>s.pos[2]<=-59.75,1500,runTrace);
 if(!launch.onGround||Math.abs(launch.pos[1]-2.4638)>.05||Math.hypot(launch.velocity[0],launch.velocity[2])<5.8)throw Error('Window jump lacked a supported sprint launch');
 const jumpAt=Date.now();await key('Space',true);await fastAim(-Math.atan(.18));await sleep(Math.max(0,80-(Date.now()-jumpAt)));await key('c',true);await key('Space',false);
 const flightTrace=[],turnPose=await waitPose(s=>s.pos[2]<-62.2,1300,flightTrace);await fastAim(-Math.atan2(1,.1));
 const sill=await waitPose(s=>s.pos[0]>=13.1,1800,flightTrace);await key('w',false);await key('Shift',false);await sleep(240);
 const sillRest=await state();const reachedSill=sillRest.crouching&&sillRest.onGround&&Math.abs(sillRest.pos[1]-3.8608)<.05&&sillRest.pos[0]>12.9&&sillRest.pos[0]<13.65;
 await checkpoint('duck-jump-window',{ok:reachedSill,launch,turnPose,sill,after:sillRest,runTrace,flightTrace,targetTuckDelayMs:80});if(!reachedSill)throw Error('Duck-jump did not land safely on the native window sill');
 // Releasing C beneath the low lintel must retain crouch. Ctrl then carries
 // the player through the opening; expansion is allowed only after clearing it.
 await key('c',false);await sleep(220);const blockedStand=await state();
 const blockedOK=blockedStand.crouching&&!blockedStand.canStand&&Math.abs(blockedStand.pos[1]-sillRest.pos[1])<.01;
 await checkpoint('window-blocked-stand',{ok:blockedOK,before:sillRest,after:blockedStand});if(!blockedOK)throw Error('Window allowed invalid standing expansion');
 await key('Control',true);if(!await driver.turn(page,-Math.PI/2,0))throw Error('Could not align the grounded window exit');await key('w',true);
 const inside=await waitPose(s=>s.pos[0]>=14.2,2200);await key('w',false);await sleep(450);await key('Control',false);await sleep(250);
 const after=await state(),entryOK=after.pos[0]>13.8&&Math.abs(after.pos[1]-3.2512)<.06&&after.onGround&&!after.crouching;
 await checkpoint('upper-house-entry',{ok:entryOK,inside,after});if(!entryOK)throw Error('Could not stand after entering the upper house');
 evidence.ok=true;evidence.after=after;
}catch(error){evidence.ok=false;evidence.failure=error.stack||String(error);evidence.after=await state();await page.screenshot({path:out+'/native-failure.png'});}
finally{await release();if(!continuous&&(await state()).state==='playing'){await page.keyboard.press('p');await page.waitForFunction(()=>__G.game.state==='paused');}evidence.finishedAt=new Date().toISOString();await save();}
return {ok:evidence.ok,documentSha256:evidence.documentSha256,steps:evidence.steps.map(s=>({name:s.name,ok:s.ok})),after:evidence.after,failure:evidence.failure,errors:evidence.errors};
