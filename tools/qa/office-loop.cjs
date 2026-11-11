// Exercise the occupied office using browser inputs, including repeated doorway
// approaches. No teleport, health, enemy or simulation changes.
if(await page.evaluate(()=>__G.game.state==='paused'))await page.getByRole('button',{name:'Resume',exact:true}).click();
const lightingBefore=await page.evaluate(()=>{window.__officeStart=__qaMissionPerformance.frames.length;if(window.__cpu)for(const a of Object.values(__cpu))a.length=0;return __G.level.stats.lighting;});
const evidence=[];
for(let lap=0;lap<(globalThis.officeLaps||3);lap++){
 const r=await drive(page,[[-25.6,8.5344,-63.4],[-23.3,8.5344,-62.6],[-20.1,8.5344,-65.4],[-18.3,8.5344,-65.5],[-20.1,8.5344,-65.4],[-23.3,8.5344,-62.6],[-25.6,8.5344,-63.4],[-26.1,8.5344,-64.5]]);evidence.push(r);if(!r.ok)break;
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(3000);await page.keyboard.up('ArrowLeft');
}
await page.keyboard.press('p');
await page.waitForFunction(()=>__G.game.state==='paused');
const raw=await page.evaluate(()=>({frames:__qaMissionPerformance.frames.slice(__officeStart),cpu:window.__cpu||{},state:{state:__G.game.state,health:__G.player.health,cut:__G.game.run.cut,invulnerable:__G.player.invulnerable},lighting:__G.level.stats.lighting,quality:__G.quality,stats:__stats(),errors:__errors}));
const quant=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return{n:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
raw.summary=quant(raw.frames.map(f=>f.ms));raw.meanFPS=1000/raw.summary.mean;raw.cpuSummary=Object.fromEntries(Object.entries(raw.cpu).map(([k,a])=>[k,quant(a)]));
const result={documentSha256:testDocumentHash,normalInputOnly:true,lightingBefore,evidence,...raw};await fs.writeFile(ROOT+'/'+(globalThis.profileTag||'v6')+'-office-loop.json',JSON.stringify(result,null,2));
return {state:raw.state,meanFPS:raw.meanFPS,summary:raw.summary,cpu:raw.cpuSummary,lighting:raw.lighting,routes:evidence.map(r=>r.ok),errors:raw.errors};
