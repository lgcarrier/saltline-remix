// One continuous input-only run: take the native crouch-jump entrance first,
// disable C, then B and A, and return to CT extraction. Video is optional.
const fs=await import('node:fs/promises'),repo=process.cwd(),out=repo+'/output/playwright/italy';
const nativeSource=await fs.readFile(repo+'/tools/qa/italy-native-movement.cjs','utf8');
const native=await new Function('page','context','errors','require','return (async()=>{'+nativeSource+'})()')(page,context,errors,require);
if(!native.ok)return{ok:false,native};
const driver=require(repo+'/tools/qa/dust-route.cjs');
const mission=await driver(page,{steps:['relay_c','relay_b','relay_a','extraction'],outputDir:out,captureScreenshots:false,waypointTolerance:.13,turnTolerance:.035,replanOnBlock:3,onCheckpoint:step=>console.log('CHECKPOINT',step.id,step.ok,step.reason||'',step.state?.health),timeoutMs:360000});
mission.documentSha256=native.documentSha256;mission.errors=[...errors];mission.entry='CT spawn through native three-crate jump and crouched upper window';
const performanceRecord=await page.evaluate(()=>window.__qaPerformance);
if(performanceRecord){performanceRecord.metadata.documentSha256=native.documentSha256;performanceRecord.metadata.runtimeErrors=[...errors];await fs.writeFile(out+'/performance.json',JSON.stringify(performanceRecord,null,2)+'\n');}
if(mission.after.state==='complete'){
 await page.getByRole('button',{name:'Redeploy',exact:true}).waitFor({state:'visible',timeout:15000});
 await page.screenshot({path:out+'/debrief.png'});
 await page.getByRole('button',{name:'Redeploy',exact:true}).click();
 await page.waitForFunction(()=>__G.game.state==='playing');
 mission.restart=await driver.state(page);
 mission.restart.ok=mission.restart.alive&&!mission.restart.invulnerable&&mission.restart.health===100&&mission.restart.cut===0&&mission.restart.relays.every(r=>!r.cut);
}
await fs.writeFile(out+'/input-mission.json',JSON.stringify(mission,null,2)+'\n');
await fs.writeFile(out+'/traversal-mission.json',JSON.stringify({native,mission},null,2)+'\n');
return{ok:native.ok&&mission.ok,native,mission:{ok:mission.ok,steps:mission.steps.map(s=>({id:s.id,ok:s.ok,reason:s.reason})),after:mission.after,restart:mission.restart},errors};
