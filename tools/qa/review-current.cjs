const response=await page.goto('http://127.0.0.1:8767/?shot=1&q=high&seed=4207&noaudio=1&noweapon=1&dynres=0',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:90000});
await page.waitForFunction(()=>document.querySelector('#boot')?.hidden,null,{timeout:90000});
await page.evaluate(()=>{
 const G=__G;G.game.pause();G.enemies.clear();G.fx.clear();G.weapon.setVisible(false);G.player.enabled=false;G.player.invulnerable=true;
 document.querySelector('#ui').style.visibility='hidden';
 const frame=G.render.frame.bind(G.render);G.render.frame=dt=>{G.time.t=18;if(G.ground.uniforms?.uTime)G.ground.uniforms.uTime.value=18;frame(dt);};
 __setShot({cam:[3,1.7,-22,-7,2.5,-32],fov:74,exposure:1});G.render.autoExposure=false;G.render.post.fade=0;
});
await page.waitForTimeout(1300);
await page.screenshot({path:process.cwd()+'/output/playwright/assault/v5-cargo-integration.png'});
return await page.evaluate(()=>({errors:__errors,stats:__G.level.stats,diagnostics:__assault.diagnostics()}));
