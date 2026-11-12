// Fixed 1080p run without video recording, using normal movement and combat.
globalThis.fs=await import('node:fs/promises');
await page.setViewportSize({width:1920,height:1080});
const start=(await fs.readFile('tools/qa/dust-input-start.cjs','utf8'))
  .replace("ROOT+'/normal-start.png'","ROOT+'/verified-start.png'");
await new Function('page','context','errors','return (async()=>{'+start+'})()')(page,context,errors);
await page.waitForFunction(()=>__G.game.state==='paused');
await page.getByRole('button',{name:'Resume',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');
await sleep(100);
await new Function('page','return (async()=>{'+await fs.readFile('tools/qa/performance.cjs','utf8')+'})()')(page);
const route=await dustDriver.objective(page,'relay_a',{timeoutMs:240000});
await page.waitForFunction(()=>__qaPerformance.metadata.completed);
const perf=await page.evaluate(()=>__qaPerformance);
perf.metadata.documentSha256=dustInputEvidence.hash;
perf.metadata.renderTuning=await page.evaluate(()=>({aoRadius:__G.render.tune.aoRadius,aoIntensity:__G.render.tune.aoIntensity,aoStrength:__G.render.tune.aoStrength}));
perf.metadata.route=route;
perf.metadata.runtimeErrors=[...errors];
await fs.writeFile(ROOT+'/performance-verified.json',JSON.stringify(perf,null,2)+'\n');
await page.screenshot({path:ROOT+'/verified-gameplay.png'});
await page.keyboard.press('p');
if(!route.ok)throw Error('Performance traversal did not finish: '+JSON.stringify(route));
return {frames:perf.frames_ms.length,route:route.ok,stats:perf.metadata.endStats,errors};
