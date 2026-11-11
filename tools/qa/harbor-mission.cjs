await runQA('bootstrap');
globalThis.ROOT=REPO+'/output/playwright/assault/v9-tests/'+(globalThis.runName||'final');
await fs.mkdir(ROOT,{recursive:true});
const driverModule={exports:{}};
new Function('module','exports',await fs.readFile(REPO+'/tools/drive-route.cjs','utf8'))(driverModule,driverModule.exports);
globalThis.drive=(p,targets,options={})=>driverModule.exports(p,targets,{sprint:true,...options});
await fs.writeFile(ROOT+'/boot.json',JSON.stringify({hash:testDocumentHash,...await page.evaluate(()=>({warmup:__G.assaultPerformance.warmup,harbor:__G.level.stats.harbor,ground:__G.ground.diagnostics,stats:__stats(),quality:__G.quality,errors:__errors}))},null,2));
await runQA('mission-metrics');
for(const step of ['route-a','route-b','route-c','route-home']){
 const result=await runQA(step);console.log(JSON.stringify({routeStep:step,state:result.state}));
 if(await page.evaluate(()=>['dead','failed'].includes(__G.game.state)))break;

}
return await runQA('summarize-mission');
