// Observe live mission frame delivery; no gameplay mutations.
const fs=await import('node:fs/promises'),repo=process.cwd();
await page.waitForFunction(()=>window.__G?.game?.state==='playing',null,{timeout:120000});
const source=await fs.readFile(repo+'/tools/qa/performance.cjs','utf8');
const begun=await new Function('page','return (async()=>{'+source.replaceAll('30000','60000')+'})()')(page);
await page.waitForFunction(()=>window.__qaPerformance?.metadata.completed,null,{timeout:100000});
const result=await page.evaluate(()=>__qaPerformance);
result.metadata.documentSha256=(await import('node:crypto')).createHash('sha256').update(await fs.readFile(repo+'/italy.html')).digest('hex');
result.metadata.runtimeErrors=errors;
await fs.writeFile(repo+'/output/playwright/italy/performance.json',JSON.stringify(result,null,2)+'\n');
return {frames:result.frames_ms.length,metadata:result.metadata};
