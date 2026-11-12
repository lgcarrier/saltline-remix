// All gameplay changes are real browser buttons/keys. Read-only telemetry
// selects aim and routes. No teleport, invulnerability or objective writes.
const fs=await import('node:fs/promises'),path=await import('node:path');
const repo=process.cwd(),out=repo+'/output/playwright/italy';
const driver=require(repo+'/tools/qa/dust-route.cjs');
await page.setViewportSize({width:1600,height:900});
await page.goto('http://127.0.0.1:8767/italy.html?q=high&dynres=0&seed=4207&inputtest=1',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:120000});
const fatal=await page.evaluate(()=>window.__fatal);if(fatal)throw Error(fatal);
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
const hash=(await import('node:crypto')).createHash('sha256').update(await fs.readFile(repo+'/italy.html')).digest('hex');
await page.getByRole('button',{name:'Deploy',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');
await page.bringToFront();
await new Promise(resolve=>setTimeout(resolve,350));
await page.locator('#view').click({position:{x:600,y:450}});
await new Promise(resolve=>setTimeout(resolve,180));
if(await page.evaluate(()=>__G.game.state==='paused')){
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.locator('#view').click({position:{x:600,y:450}});
}
const performanceSource=await fs.readFile(repo+'/tools/qa/performance.cjs','utf8');
await new Function('page','return (async()=>{'+performanceSource.replaceAll('30000','60000')+'})()')(page);
const result=await driver(page,{outputDir:out,captureScreenshots:false,waypointTolerance:.13,turnTolerance:.035,replanOnBlock:3,onCheckpoint:step=>console.log('CHECKPOINT',step.id,step.ok,step.reason||'',step.state?.health),timeoutMs:360000});
result.documentSha256=hash;result.errors=errors;result.inputMode=await page.evaluate(()=>({mode:__G.input.mode,locked:__G.input.locked,focused:document.hasFocus()}));
const perf=await page.evaluate(()=>window.__qaPerformance);
if(perf){perf.metadata.documentSha256=hash;perf.metadata.runtimeErrors=errors;await fs.writeFile(out+'/performance.json',JSON.stringify(perf,null,2));}
// Observe the terminal panel, then exercise its real reset button. This also
// records failure/retry when the mission driver legitimately dies.
if(['dead','complete'].includes(result.after.state)){
 const restart=page.getByRole('button',{name:result.after.state==='complete'?'Redeploy':'Retry',exact:true});
 await restart.waitFor({state:'visible',timeout:15000});
 await page.screenshot({path:out+'/'+(result.after.state==='complete'?'debrief':'failure')+'.png'});
 result.terminalButtons=await page.getByRole('button').allTextContents();
 if(await restart.count()){
  await restart.click();await page.waitForFunction(()=>__G.game.state==='playing');
  await new Promise(resolve=>setTimeout(resolve,350));
  result.restart=await driver.state(page);
  result.restart.ok=result.restart.alive&&result.restart.health===100&&!result.restart.invulnerable&&result.restart.cut===0&&result.restart.relays.every(r=>!r.cut);
  if(!result.restart.ok)throw Error('Terminal restart failed to reset mission');
 }
}
await fs.writeFile(out+'/input-mission.json',JSON.stringify(result,null,2));
return {ok:result.ok,hash,steps:result.steps.map(s=>({id:s.id,ok:s.ok,reason:s.reason})),after:result.after,errors};
