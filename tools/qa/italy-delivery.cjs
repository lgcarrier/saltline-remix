// Launch the self-contained file and exercise normal controls. Read-only
// telemetry observes results; all gameplay changes come from browser input.
globalThis.fs=await import('node:fs/promises');
globalThis.sleep=ms=>new Promise(r=>setTimeout(r,ms));
const repo=process.cwd(),out=repo+'/output/playwright/italy';
await fs.mkdir(out,{recursive:true});
const mod={exports:{}};
new Function('module','exports',await fs.readFile(repo+'/tools/qa/dust-route.cjs','utf8'))(mod,mod.exports);
const driver=mod.exports,record={kind:'standalone file and normal keyboard controls',checks:{}};
const testFailure=process.env.ITALY_TEST_FAILURE==='1';
record.documentSha256=(await import('node:crypto')).createHash('sha256').update(await fs.readFile(repo+'/italy.html')).digest('hex');
async function persist(){record.errors=[...errors];await fs.writeFile(out+'/delivery.json',JSON.stringify(record,null,2)+'\n');}
async function settleGameplay(){
 await page.bringToFront();
 for(let attempt=0;attempt<3;attempt++){
  let mode=await page.evaluate(()=>({state:__G.game.state,locked:__G.input.locked,mode:__G.input.mode}));
  if(mode.state==='dead'||mode.state==='complete')return {...mode,focused:await page.evaluate(()=>document.hasFocus())};
  if(mode.state==='paused'){
   await page.getByRole('button',{name:'Resume',exact:true}).click();
   await page.waitForFunction(()=>__G.game.state==='playing');
   (record.checks.focusResumes??=[]).push({at:new Date().toISOString(),attempt});
  }
  // Resume itself requests pointer lock. Let that request settle instead of
  // issuing an overlapping canvas click that can race its lock-change event.
  await sleep(350);
  mode=await page.evaluate(()=>({state:__G.game.state,locked:__G.input.locked,mode:__G.input.mode}));
  if(mode.state!=='playing')continue;
  if(mode.mode==='lock'&&!mode.locked){await page.locator('#view').click({position:{x:600,y:450}});await sleep(180);}
  mode=await page.evaluate(()=>({state:__G.game.state,locked:__G.input.locked,mode:__G.input.mode,focused:document.hasFocus()}));
  if(mode.state==='playing')return mode;
 }
 throw Error('Gameplay did not remain active after normal Resume input');
}
async function exposureState(){
 const base=await driver.state(page);
 return {...base,...await page.evaluate(()=>{const g=__G,p=g.player;return{
  onGround:p.onGround,focused:document.hasFocus(),locked:g.input.locked,inputMode:g.input.mode,
  threats:g.enemies.list.filter(e=>e.alive).map(e=>{const aim=e.pos.clone();aim.y+=e.type==='hound'?.62:-.03;return{id:e.id,type:e.type,mode:e.mode,pos:e.pos.toArray(),distance:aim.distanceTo(p.eye),visible:g.physics.lineOfSight(p.eye,aim)};}).sort((a,b)=>a.distance-b.distance)
 };})};
}
async function selectExposure(){return page.evaluate(()=>{
 const g=__G,V=g.THREE.Vector3,player=g.player,choices=[];
 for(const enemy of g.enemies.list.filter(e=>e.alive)){
  const aim=enemy.pos.clone();aim.y+=enemy.type==='hound'?.62:-.03;
  for(const radius of [1.6,2.6,4])for(let k=0;k<12;k++){
   const angle=k*Math.PI/6,x=enemy.pos.x+Math.cos(angle)*radius,z=enemy.pos.z+Math.sin(angle)*radius;
   const y=g.physics.groundHeight(x,z,enemy.pos.y+.25);if(!Number.isFinite(y))continue;
   const feet=new V(x,y,z);if(!g.physics.canStand(feet,1.8,.32))continue;
   const eye=feet.clone().add(new V(0,1.68,0));if(!g.physics.lineOfSight(eye,aim))continue;
   choices.push({enemyId:enemy.id,type:enemy.type,enemyPos:enemy.pos.toArray(),pos:feet.toArray(),distance:eye.distanceTo(aim),score:feet.distanceTo(player.pos)+(enemy.type==='hound'?-8:8)+Math.abs(enemy.pos.y-y)*2});
  }
 }
 // Bound nav work so this diagnostic does not create a long gameplay hitch.
 choices.sort((a,b)=>a.score-b.score);
 for(const choice of choices.slice(0,32)){
  const path=g.physics.nav.findPath(player.pos,new V(...choice.pos));
  if(path)return {...choice,nodes:path.length};
 }
 return null;
});}
async function verifyNaturalFailure(){
 const began=Date.now(),limit=150000;
 const run=record.checks.failureRun={kind:'ordinary damage while approaching live enemies through real input; no health/death writes',startedAt:new Date().toISOString(),samples:[],approaches:[],focusResumes:0};
 let previousHealth=100,lastDamage=began,lastApproach=0;
 while(Date.now()-began<limit){
  const sample=await exposureState();run.samples.push({elapsedMs:Date.now()-began,...sample});
  if(sample.invulnerable)throw Error('Failure test unexpectedly had invulnerability');
  if(sample.state==='dead'){run.ok=true;run.elapsedMs=Date.now()-began;run.death=sample;await persist();return sample;}
  if(sample.state==='paused'){await settleGameplay();run.focusResumes++;await persist();continue;}
  if(sample.state!=='playing')throw Error('Unexpected state during ordinary failure test: '+sample.state);
  if(sample.health<previousHealth-.1)lastDamage=Date.now();previousHealth=sample.health;
  if(Date.now()-lastDamage>5000&&Date.now()-lastApproach>4500){
   const target=await selectExposure();lastApproach=Date.now();
   if(target){
    const approach={target,before:sample};run.approaches.push(approach);await persist();
    approach.result=await driver.route(page,target.pos,{combat:false,sprint:false,waypointTolerance:.13,turnTolerance:.035,replanOnBlock:2,waypointTimeoutMs:15000,timeoutMs:Math.min(45000,limit-(Date.now()-began))});
    approach.after=await exposureState();await persist();
    // Reaching death during this real-input approach is the desired outcome.
    if(approach.after.state==='dead'){run.ok=true;run.elapsedMs=Date.now()-began;run.death=approach.after;return approach.after;}
    if(approach.after.health<previousHealth-.1)lastDamage=Date.now();previousHealth=approach.after.health;
   }else run.noExposedCandidateAt=Date.now()-began;
  }
  await persist();await sleep(500);
 }
 run.ok=false;run.elapsedMs=Date.now()-began;
 throw Error('No ordinary player death within the live-enemy exposure budget; inspect persisted threat/health samples');
}
try{
errors.length=0;
const requests=[];
const listener=request=>requests.push(request.url());page.on('request',listener);
await page.goto('file://'+repo+'/italy.html?q=high&dynres=0&seed=4207',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:120000});
if(await page.evaluate(()=>window.__fatal))throw Error('Standalone fatal error');
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
record.checks.fileReady=await page.evaluate(()=>({title:document.title,ready:__ready,diagnostics:__italy.diagnostics(),warmup:__G.performanceWarmup||null}));
await page.getByRole('button',{name:'Deploy',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');
record.checks.initialInput=await settleGameplay();
record.before=await driver.state(page);
const extraction=await page.evaluate(()=>__G.level.extraction.pos.toArray());
record.checks.earlyExtraction=await driver.route(page,extraction,{timeoutMs:30000});
await sleep(700);record.checks.earlyExtraction.after=await driver.state(page);
if(!record.checks.earlyExtraction.ok||Math.hypot(record.checks.earlyExtraction.after.pos[0]-extraction[0],record.checks.earlyExtraction.after.pos[2]-extraction[2])>2.8)throw Error('Did not reach extraction ring');
if(record.checks.earlyExtraction.after.state!=='playing'||record.checks.earlyExtraction.after.cut!==0)throw Error('Premature extraction completed');
await page.keyboard.down('Enter');await sleep(70);await page.keyboard.up('Enter');await sleep(300);
record.checks.fired=await driver.state(page);
await page.keyboard.press('r');await sleep(2600);record.checks.reloaded=await driver.state(page);
if(record.checks.fired.ammo>=30||record.checks.reloaded.ammo!==30||record.checks.reloaded.reserve>=150)throw Error('Fire/reload input failed');
const y=await page.evaluate(()=>__G.player.pos.y);
await page.keyboard.down('Space');await sleep(230);
record.checks.jump=await page.evaluate(y=>({height:__G.player.pos.y-y,onGround:__G.player.onGround}),y);
await page.keyboard.up('Space');await sleep(1200);
if(record.checks.jump.height<.2)throw Error('Jump input failed');
await page.keyboard.down('c');await sleep(300);
record.checks.crouch=await page.evaluate(()=>({crouching:__G.player.crouching,eyeHeight:__G.player.eye.y-__G.player.pos.y}));
await page.keyboard.up('c');await sleep(400);
record.checks.stand=await page.evaluate(()=>({crouching:__G.player.crouching,eyeHeight:__G.player.eye.y-__G.player.pos.y}));
if(!record.checks.crouch.crouching||record.checks.stand.crouching)throw Error('Crouch/stand input failed');
await page.keyboard.press('p');await page.waitForFunction(()=>__G.game.state==='paused');
const pausePos=await page.evaluate(()=>__G.player.pos.toArray());
await page.keyboard.down('w');await sleep(300);await page.keyboard.up('w');
record.checks.pause=await page.evaluate(p=>({state:__G.game.state,displacement:__G.player.pos.distanceTo(new __G.THREE.Vector3(...p))}),pausePos);
await page.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForFunction(()=>__G.game.state==='playing');
record.checks.resume=(await driver.state(page)).state;
if(record.checks.pause.displacement>.001)throw Error('Player moved while paused');
await page.screenshot({path:out+'/standalone-controls.png'});
await page.keyboard.press('p');
record.checks.audioNumerics={kind:'offline mix checks, not an audible listening test',outdoor:await page.evaluate(()=>__G.audio.selfTest({seconds:10})),interior:await page.evaluate(()=>__G.audio.selfTest({seconds:10,interior:true}))};
for(const mix of [record.checks.audioNumerics.outdoor,record.checks.audioNumerics.interior])if(mix.nan||mix.over||!Number.isFinite(mix.peak))throw Error('Audio numerical health failed');
if(testFailure){
 record.checks.inputBeforeFailure=await settleGameplay();
 // Pick a currently living, visible, reachable threat instead of assuming that
 // a fixed market coordinate remains exposed to one of the wandering patrols.
 await verifyNaturalFailure();
 record.checks.death=await driver.state(page);
 await page.getByRole('button',{name:'Retry',exact:true}).waitFor({state:'visible'});
 await page.screenshot({path:out+'/failure.png'});
 await page.getByRole('button',{name:'Retry',exact:true}).click();
 await page.waitForFunction(()=>__G.game.state==='playing');await sleep(350);
 record.checks.retry=await driver.state(page);
 if(!record.checks.retry.alive||record.checks.retry.invulnerable||record.checks.retry.health!==100||record.checks.retry.cut!==0||record.checks.retry.relays.some(r=>r.cut))throw Error('Retry did not reset the mission');
 await page.keyboard.press('p');
}else{
 record.checks.failureRetry={tested:false,reason:'Opt-in via ITALY_TEST_FAILURE=1; normal mission QA records its own real-input death/retry evidence.'};
}
page.off('request',listener);record.standaloneRequests=requests.filter(u=>!u.startsWith('data:'));
record.standaloneErrors=[...errors];
await page.goto('http://127.0.0.1:8767/index.html?q=high&dynres=0',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:120000});
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
record.checks.mapLinks=await page.locator('.map-select a').evaluateAll(a=>a.map(x=>({name:x.textContent.trim(),href:x.getAttribute('href')})));
if(record.checks.mapLinks.length!==4)throw Error('Expected all four map links');
await page.getByRole('link',{name:'Italy',exact:true}).click();
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:120000});
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
record.checks.italyLink={url:page.url(),title:await page.title()};
record.errors=[...errors];
record.ok=record.errors.length===0&&record.checks.italyLink.title==='Italy';
await fs.writeFile(out+'/delivery.json',JSON.stringify(record,null,2)+'\n');
return record;

}catch(error){record.ok=false;record.failure=error.stack||String(error);record.after=await driver.state(page);record.errors=[...errors];await page.screenshot({path:out+'/delivery-failure.png'});await fs.writeFile(out+'/delivery.json',JSON.stringify(record,null,2)+'\n');throw error;}
