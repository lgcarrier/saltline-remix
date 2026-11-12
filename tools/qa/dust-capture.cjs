// Staged fixed-camera visual evidence. Does not establish normal-input play.
globalThis.fs=await import('node:fs/promises');
globalThis.sleep=ms=>new Promise(r=>setTimeout(r,ms));
globalThis.REPO=process.cwd();
globalThis.ROOT=REPO+'/output/playwright/dust';
await fs.mkdir(ROOT,{recursive:true});
errors.length=0;
const navigationStart=Date.now();
const response=await page.goto('http://127.0.0.1:8767/dust.html?q=high&dynres=0&seed=4207&capture='+Date.now(),{waitUntil:'domcontentloaded'});
const artifactBytes=await fs.readFile(REPO+'/dust.html');
if(Number(response.headers()['content-length'])!==artifactBytes.length)throw Error('Served Dust size differs from local build');
const documentSha256=(await import('node:crypto')).createHash('sha256').update(artifactBytes).digest('hex');
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:120000});
const fatal=await page.evaluate(()=>window.__fatal);if(fatal)throw new Error(fatal);
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
const readyAfterMs=Date.now()-navigationStart;
await sleep(1500);
await page.screenshot({path:ROOT+'/title.png'});
await page.evaluate(()=>__G.game.start({skipIntro:true}));
await sleep(350);
await page.evaluate(()=>{__G.game.pause();__G.weapon.setVisible(false);__G.render.post.fade=0;});
await page.addStyleTag({content:'.menu,.hud,#touch-controls{visibility:hidden!important}'});
const shots=await page.evaluate(()=>__dust.shots),records=[];
for(const [name,shot] of Object.entries(shots)){
  await page.evaluate(shot=>__setShot({cam:shot.join(','),fov:74}),shot);
  await sleep(1000);
  await page.screenshot({path:ROOT+'/'+(globalThis.dustCapturePrefix||'candidate')+'-'+name+'.png'});
  records.push({name,camera:shot,...await page.evaluate(()=>({fov:__G.camera.fov,exposure:__G.render.exposure,quality:__G.quality,stats:__stats(),simulationTime:__G.time.t}))});
}
const report={kind:'staged paused fixed-camera visual captures',seed:4207,viewport:page.viewportSize(),documentSha256,readyAfterMs,records,
  ...await page.evaluate(()=>({diagnostics:__dust.diagnostics(),dressing:(()=>{const {architecturePlacements,...stats}=__G.level.stats.dressing;return stats;})(),backdrop:__G.backdrop.stats,warmup:__G.assaultPerformance.warmup,errors:__errors,userAgent:navigator.userAgent,gpu:(()=>{const gl=__G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})()}))};
await fs.writeFile(ROOT+'/'+(globalThis.dustCapturePrefix||'candidate')+'-captures.json',JSON.stringify(report,null,2));
return report;
