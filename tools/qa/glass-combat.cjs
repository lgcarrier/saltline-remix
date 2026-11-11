await page.getByRole('button',{name:'Resume',exact:true}).click();
await page.evaluate(()=>{__G.player.pos.set(4,0,-8.3);__G.player.vel.set(0,0,0);__G.player.yaw=-Math.PI/2;__G.player.pitch=0;});await sleep(250);
await page.keyboard.down('Enter');await sleep(300);await page.keyboard.up('Enter');
const glass=await page.evaluate(()=>({ammo:__G.weapon.ammo,combat:{...__G.combat.stats},broken:__assault.diagnostics().breakables.filter(b=>b.broken)}));
await page.keyboard.press('r');await sleep(2600);
const engage=(await import((await import('node:url')).pathToFileURL(REPO+'/tools/aim-target.cjs').href)).default;
let combat;try{combat=await engage(page,12);}catch(error){combat={error:error.message};}
await page.screenshot({path:ROOT+'/qa-combat.png'});
await page.keyboard.press('p');await sleep(150);
const result={mode:'staged player position; actual fire/reload/aim keys; no enemy or health overrides',glass,combat,reload:await page.evaluate(()=>({ammo:__G.weapon.ammo,state:__G.weapon.state,health:__G.player.health,combat:__G.combat.stats,errors:__errors}))};
await fs.writeFile(ROOT+'/glass-combat-staged.json',JSON.stringify(result,null,2));return result;
