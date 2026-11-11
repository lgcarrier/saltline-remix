// Controlled staged camera profiler; separate from the normal-input mission.
// No reduced quality or hidden geometry. Timer queries wrap the complete render
// frame; CPU timings measure submission, GPU timings exclude presentation.
const tag=globalThis.profileTag||'v5-baseline';
await page.goto('http://127.0.0.1:8767/?shot=1&q=high&dynres=0&seed=4207&noaudio=1',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:90000});
await page.waitForFunction(()=>document.querySelector('#boot')?.hidden);
const hash=(await import('node:crypto')).createHash('sha256').update(await fs.readFile(REPO+'/index.html')).digest('hex');
await page.evaluate(()=>{
 const G=__G;G.game.pause();G.player.enabled=false;
 __setShot({cam:[-20,10.2144,-66,-20.5,10,-60],fov:74,exposure:1});G.render.autoExposure=false;G.render.post.fade=0;
 const gl=G.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const original=G.render.frame.bind(G.render),pending=[],samples=[];
 window.__officeProfile={samples,pending,active:false,gpuSupported:!!ext};
 let last=performance.now();
 G.render.frame=dt=>{
  const start=performance.now(),frameMs=start-last;last=start;
  if(ext)while(pending.length&&gl.getQueryParameter(pending[0].q,gl.QUERY_RESULT_AVAILABLE)){
   const old=pending.shift();if(!gl.getParameter(ext.GPU_DISJOINT_EXT))old.sample.gpuMs=gl.getQueryParameter(old.q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(old.q);
  }
  if(!__officeProfile.active){original(dt);return;}
  const q=ext?gl.createQuery():null,sample={frameMs,angle:G.camera.quaternion.toArray()};
  if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);original(dt);if(q)gl.endQuery(ext.TIME_ELAPSED_EXT);
  sample.cpuMs=performance.now()-start;samples.push(sample);if(q)pending.push({q,sample});
 };
});
await page.waitForTimeout(5000);
const cameras=[[-20,10.2144,-66,-20.5,10,-60],[-27,10.2144,-66,-18,10.0,-62],[-20,10.2144,-61,-26,10,-66]];
const views=[];
for(const [view,cam]of cameras.entries()){
 await page.evaluate(cam=>{__officeProfile.active=false;__setShot({cam,fov:74,exposure:1});},cam);
 await page.waitForTimeout(1600);
 await page.evaluate(()=>{__officeProfile.samples.length=0;__officeProfile.active=true;});
 await page.waitForTimeout(10000);
 await page.evaluate(()=>{__officeProfile.active=false;});await page.waitForTimeout(150);
 views.push(await page.evaluate(({view,cam})=>({view,cam,samples:__officeProfile.samples,stats:__stats(),lighting:__G.level.stats.lighting}),{view,cam}));
}
const quant=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return{n:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
const report={tag,hash,purpose:'staged camera diagnosis, not normal-input gameplay',gpuTimerCaveat:'Raw ANGLE Metal query results exceeded sustained RAF intervals; retained for diagnosis, not used to claim GPU cost or gains.',views:views.map(v=>({...v,summary:{frameMs:quant(v.samples.map(s=>s.frameMs)),cpuMs:quant(v.samples.map(s=>s.cpuMs)),gpuMs:quant(v.samples.map(s=>s.gpuMs))}})),actual:await page.evaluate(()=>({quality:__G.quality,stats:__stats(),gpuSupported:__officeProfile.gpuSupported,errors:__errors,perf:__G.assaultPerformance?.diagnostics}))};
await fs.writeFile(REPO+'/output/playwright/assault/v6-tests/'+tag+'-office-profile.json',JSON.stringify(report,null,2));
return {tag,views:report.views.map(v=>({view:v.view,summary:v.summary})),actual:report.actual};
