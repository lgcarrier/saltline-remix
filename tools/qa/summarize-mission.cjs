const report=await page.evaluate(()=>{__qaMissionPerformance.active=false;return {performance:__qaMissionPerformance,short:window.__qaPerformance,state:{state:__G.game.state,cut:__G.game.run.cut,health:__G.player.health,invulnerable:__G.player.invulnerable,pos:__G.player.pos.toArray(),combat:__G.combat.stats,errors:__errors,lighting:__G.level.stats.lighting}};});
const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b),q=p=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];return{samples:values.length,seconds:values.reduce((a,b)=>a+b,0)/1000,meanFPS:1000/(values.reduce((a,b)=>a+b,0)/values.length),p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1),over25ms:values.filter(v=>v>25).length,over33_4ms:values.filter(v=>v>33.4).length};};
report.documentSha256=testDocumentHash;
report.summary={all:summarize(report.performance.frames.map(f=>f.ms)),zones:Object.fromEntries([...new Set(report.performance.frames.map(f=>f.zone))].map(zone=>[zone,summarize(report.performance.frames.filter(f=>f.zone===zone).map(f=>f.ms))]))};
report.benchmarkContext={agentArtBrowsersClosed:true,playerBrowserUntouched:true,note:'Frame delivery measured with the user’s existing Chrome playtest tab left untouched; GPU time is not directly measured.'};
await fs.writeFile(ROOT+'/mission-performance.json',JSON.stringify(report,null,2));
await fs.writeFile(ROOT+'/gameplay-result.json',JSON.stringify({documentSha256:testDocumentHash,state:report.state,routes:routeEvidence,performance:report.summary,normalInputOnly:true},null,2));
if(report.short)await fs.writeFile(ROOT+'/performance-30s.json',JSON.stringify(report.short,null,2));
return {state:report.state,summary:report.summary,documentSha256:testDocumentHash};
