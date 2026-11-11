/* Independent fixed-quality art captures. Uses a separate headless context;
 * never attaches to the player's visible Chrome or an existing test session. */
const {chromium}=require(process.env.SALTLINE_PLAYWRIGHT||'playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const OUT=path.join(ROOT,'output/playwright/assault');
const PREFIX=process.env.SALTLINE_CAPTURE_PREFIX||'v2';
const MANIFEST=PREFIX==='v2'?'capture-manifest.json':PREFIX+'-capture-manifest.json';
const shots=[
  {name:'yard',cam:[0,1.7,-30,0,6,-44],sameAsV1:true},
  {name:'gate',cam:[-23,1.7,-44,-8,4,-51],sameAsV1:true},
  {name:'hall',cam:[3,1.7,-52,0,4,-65]},
  {name:'office',cam:[-26,10.2,-62.8,-25.4,9.7,-65.8],requestedCam:[-26,10.2,-65.8,-21,9.7,-65],correction:'Requested camera intersects relay B; shifted inside the same office'},
  {name:'roof',cam:[15,14.7,-45,-6,13.3,-54]},
  {name:'approach',cam:[16.256,1.7,-4.064,0,4,-22]},
  {name:'truck',cam:[15.5,1.3,-3.7,9.8,1.3,-8.3]},
  {name:'original-port',original:true,cam:[-25,1.7,6,10,3,4]}
];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,1500));});
 const manifest={purpose:'Fixed-camera art review, not a gameplay or performance test',browser:await browser.version(),viewport:[1600,900],dpr:1,quality:'high',seed:4207,fov:74,audio:'disabled for still captures',scene:'paused; enemies and effects cleared; HUD and weapon hidden',fixedPresentationTime:18,remainingNondeterminism:'unseeded cosmetic sources and automatic exposure may differ; one second exposure settling per camera',captures:[]};
 let current=null,documentSha256=null;
 try{
  for(const shot of shots.filter(s=>!process.env.SALTLINE_SHOTS||process.env.SALTLINE_SHOTS.split(',').includes(s.name))){
   const doc=shot.original?'original.html':'index.html';
   if(current!==doc){
    current=doc;
    const response=await page.goto('http://127.0.0.1:8767/'+doc+'?shot=1&q=high&seed=4207&noaudio=1&noweapon=1&dynres=0',{waitUntil:'domcontentloaded'});
    documentSha256=createHash('sha256').update(await response.body()).digest('hex');
    await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:90000});
    await page.waitForFunction(()=>document.querySelector('#boot')?.hidden,null,{timeout:90000});
    await page.evaluate(()=>{
      const G=window.__G;
      if(window.__fatal)throw new Error(window.__fatal);
      G.game.pause();G.enemies.clear();G.fx.clear();G.weapon.setVisible(false);
      G.player.enabled=false;G.player.invulnerable=true;
      document.querySelector('#ui').style.visibility='hidden';
      const frame=G.render.frame.bind(G.render);
      G.render.frame=dt=>{
        G.time.t=18;
        if(G.ground.uniforms?.uTime)G.ground.uniforms.uTime.value=18;
        for(const o of G.ground.root?.children||[])if(o.material?.uniforms?.uTime)o.material.uniforms.uTime.value=18;
        if(G.render.sky?.material?.uniforms?.uTime)G.render.sky.material.uniforms.uTime.value=18;
        frame(dt);
      };
    });
   }
   await page.evaluate(cam=>{__setShot({cam,fov:74,exposure:1});__G.render.post.fade=0;},shot.cam);
   await page.waitForTimeout(1000);
   const filename=PREFIX+'-'+shot.name+'.png';
   await page.screenshot({path:path.join(OUT,filename)});
   const actual=await page.evaluate(()=>{
    const G=__G,gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {ready:__ready,fatal:window.__fatal||null,errors:__errors,stats:__stats(),quality:G.quality,
      drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],camera:G.camera.position.toArray(),fov:G.camera.fov,exposure:G.render.exposure,
      gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),ground:G.ground.diagnostics||null,
      stubs:Object.fromEntries(['mats','physics','props','level','ground','enemies','weapon','audio'].map(n=>[n,!!G[n]?.stub]))};
   });
   manifest.captures.push({...shot,file:filename,document:doc,documentSha256,capturedAt:new Date().toISOString(),actual});
   console.log(JSON.stringify({capture:shot.name,errors:actual.errors,fatal:actual.fatal,stats:actual.stats,ground:actual.ground}));
  }
  manifest.consoleErrors=errors;
  if(process.env.SALTLINE_SHOTS){let prior;try{prior=JSON.parse(await fs.readFile(path.join(OUT,MANIFEST),'utf8'));}catch{}if(prior){const names=new Set(manifest.captures.map(c=>c.name)),retained=prior.captures.filter(c=>!names.has(c.name));manifest.captures=[...retained,...manifest.captures];if(retained.length)manifest.consoleErrors=[...prior.consoleErrors,...manifest.consoleErrors];}}
  await fs.writeFile(path.join(OUT,MANIFEST),JSON.stringify(manifest,null,2)+'\n');
  if(manifest.captures.some(c=>c.actual.fatal||c.actual.errors?.length))throw new Error('Capture contains runtime errors; inspect '+MANIFEST);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
