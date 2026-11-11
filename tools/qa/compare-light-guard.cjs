// Controlled same-scene A/B. Freeze visual animation, hide UI/actors for art;
// quality stays High. Timing is staged CPU submission, not mission FPS.
// Run after capture-final in the same staged session.
if(!await page.evaluate(()=>!!window.__G?.params?.shot))throw new Error('Run capture-final first');
const results=[];
for(const enabled of [false,true,false,true]){
 await page.evaluate(enabled=>{__G.assaultPerformance.setEnabled(enabled);__setShot({cam:[-20,10.2144,-66,-20.5,10,-60],fov:74,exposure:1});},enabled);
 await page.waitForTimeout(3500);
 const times=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[],old=__G.render.frame;let left=300;
   __G.render.frame=function(dt){const t=performance.now();old(dt);frames.push(performance.now()-t);if(--left===0){__G.render.frame=old;resolve(frames);}};
 }));
 const filename='v6-guard-'+(enabled?'on':'off')+'-'+results.length+'.png';await page.screenshot({path:ROOT+'/'+filename});
 const sorted=[...times].sort((a,b)=>a-b);
 results.push({enabled,filename,cpuMs:{mean:times.reduce((a,b)=>a+b,0)/times.length,p95:sorted[285],p99:sorted[297]},verify:await page.evaluate(()=>__G.assaultPerformance.verify())});
}
const result={documentSha256:testDocumentHash,mode:'staged fixed camera, CPU render submission only',results,quality:await page.evaluate(()=>__G.quality),errors};
await fs.writeFile(ROOT+'/guard-comparison.json',JSON.stringify(result,null,2));return result;
