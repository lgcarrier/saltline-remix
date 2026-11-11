// Deliberately staged positions isolate mechanics after the input-only mission.
// Firing, reload and interaction still use actual keys. No invulnerability.
await page.getByRole('button',{name:'Redeploy',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');
const result={mode:'staged position diagnostics; not a full normal-input playthrough',before:await page.evaluate(()=>({state:__G.game.state,cut:__G.game.run.cut,invulnerable:__G.player.invulnerable,broken:__assault.diagnostics().breakables.filter(b=>b.broken)}))};
await page.evaluate(()=>{__G.player.pos.set(-8.1,0,-4.8);__G.player.vel.set(0,0,0);});await sleep(500);
result.prematureExtraction=await page.evaluate(()=>({state:__G.game.state,cut:__G.game.run.cut}));
await page.evaluate(()=>{__G.player.pos.set(10,0,-38);__G.player.vel.set(0,0,0);__G.player.yaw=0;__G.player.pitch=0;});await sleep(300);
await page.keyboard.down('Enter');await sleep(450);await page.keyboard.up('Enter');
result.shots=await page.evaluate(()=>({ammo:__G.weapon.ammo,stats:{...__G.combat.stats},breakable:__assault.diagnostics().breakables.find(b=>b.id==='func_breakable_62')}));
await page.keyboard.press('r');await sleep(2600);
result.reload=await page.evaluate(()=>({ammo:__G.weapon.ammo,magSize:__G.weapon.magSize,reserve:__G.weapon.reserve,state:__G.weapon.state}));
const candidates=await page.evaluate(()=>{
 const G=__G,V=G.THREE.Vector3,r=G.level.objectives[1],found=[];
 for(let k=0;k<32;k++){const a=k/32*Math.PI*2,p=r.pos.clone().add(new V(Math.cos(a)*1.9,0,Math.sin(a)*1.9)),eye=p.clone().add(new V(0,1.65,0));if(Math.abs(G.physics.groundHeight(p.x,p.z,p.y+.3)-p.y)<.1&&!G.physics.lineOfSight(eye,r.pos.clone().add(new V(0,1.25,0)))&&!G.physics.assaultDebug.capsuleBlocked(p.x,p.y,p.z,.32,1.8))found.push(p.toArray());}return found;
});
if(candidates.length){await page.evaluate(pos=>{const p=__G.player;p.pos.fromArray(pos);p.vel.set(0,0,0);const r=__G.level.objectives[1].pos;p.yaw=Math.atan2(-(r.x-p.pos.x),-(r.z-p.pos.z));p.pitch=0;},candidates[0]);await page.keyboard.down('e');await sleep(2700);await page.keyboard.up('e');result.occludedInteraction=await page.evaluate(()=>({cut:__G.game.run.cut,pos:__G.player.pos.toArray()}));}else result.occludedInteraction={status:'no valid close obstructed pose found; source/raycast check only'};
await page.keyboard.press('p');await sleep(150);
result.end=await page.evaluate(()=>({state:__G.game.state,errors:__errors,breakables:__assault.diagnostics().breakables.filter(b=>b.broken)}));
await fs.writeFile(ROOT+'/mechanics-staged.json',JSON.stringify(result,null,2));
return result;
