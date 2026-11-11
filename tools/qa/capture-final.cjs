// Staged stills, isolated from the subsequent normal-input mission.
if(!await page.evaluate(()=>!!window.__G?.params?.shot)){
 const response=await page.goto('http://127.0.0.1:8767/?shot=1&q=high&dynres=0&seed=4207&noaudio=1&noweapon=1',{waitUntil:'domcontentloaded'});
 globalThis.testDocumentHash=(await import('node:crypto')).createHash('sha256').update(await response.body()).digest('hex');
 await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:90000});
 await page.waitForFunction(()=>document.querySelector('#boot')?.hidden,null,{timeout:90000});
}
const shots=globalThis.captureShots||[
 ['cargo-yard',[3,1.7,-22,-7,2.5,-32]],
 ['west-cargo',[-25,1.7,-34.6,-21,4.5,-38]],
 ['yard',[0,1.7,-30,0,6,-44]],
 ['gate',[-23,1.7,-44,-8,4,-51]],
 ['hall',[3,1.7,-52,0,4,-65]],
 ['hall-stack',[6.5,2.5,-60,13.8,4.7,-53.5]],
 ['hall-upper',[-12,10.2144,-71,3,7.5,-59]],
 ['office-wide',[-20,10.2144,-66,-20.5,10,-60]],
 ['roof',[15,14.7,-45,-6,13.3,-54]],
 ['truck',[15.5,1.3,-3.7,9.8,1.3,-8.3]],
 ['truck-front',[3.8,1.4,-3.9,7.2,1.5,-8.2]]
];
const manifest={purpose:'staged art review; not gameplay or performance evidence',documentSha256:testDocumentHash,quality:'high/native',viewport:[1600,900],dpr:1,fov:74,seed:4207,time:18,autoExposure:false,manualExposure:1,weaponUIEnemiesHidden:true,remainingNondeterminism:'cosmetic particle positions and unseeded cosmetic sources',captures:[]};
await page.evaluate(()=>{
 const G=__G;G.game.pause();G.enemies.clear();G.fx.clear();G.weapon.setVisible(false);G.player.enabled=false;G.player.invulnerable=true;
 document.querySelector('#ui').style.visibility='hidden';
 const frame=G.render.frame.bind(G.render);G.render.frame=dt=>{
  G.time.t=18;if(G.ground.uniforms?.uTime)G.ground.uniforms.uTime.value=18;
  for(const o of G.ground.root?.children||[])if(o.material?.uniforms?.uTime)o.material.uniforms.uTime.value=18;
  if(G.render.sky?.material?.uniforms?.uTime)G.render.sky.material.uniforms.uTime.value=18;frame(dt);
 };
});
for(const [name,cam]of shots){
 await page.evaluate(cam=>{__setShot({cam,fov:74,exposure:1});__G.render.autoExposure=false;__G.render.post.fade=0;},cam);
 await page.waitForTimeout(1200);
 const filename=(globalThis.capturePrefix||'v6-final')+'-'+name+'.png';await page.screenshot({path:REPO+'/output/playwright/assault/'+filename});
 const actual=await page.evaluate(()=>({errors:__errors,fatal:window.__fatal||null,camera:__G.camera.position.toArray(),fov:__G.camera.fov,autoExposure:__G.render.autoExposure,manualExposure:__G.render.exposure,stats:__stats(),level:__G.level.stats,quality:__G.quality}));
 if(actual.fov!==74||actual.autoExposure!==false)throw new Error('Art capture settings drifted: '+name);
 manifest.captures.push({name,cam,filename,actual});
 console.log(JSON.stringify({capture:name,errors:actual.errors,shadowBakes:actual.level.lighting.shadowBakes}));
}
manifest.consoleErrors=[...errors];await fs.writeFile(REPO+'/output/playwright/assault/'+(globalThis.capturePrefix||'v6-final')+'-capture-manifest.json',JSON.stringify(manifest,null,2));
return {captures:manifest.captures.length,documentSha256:testDocumentHash,consoleErrors:errors};
