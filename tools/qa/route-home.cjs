await page.getByRole('button',{name:'Resume',exact:true}).click();
let roof=await drive(page,[[2,13.0048,-53.5],[0,13.0048,-54.8]],{tolerance:.15});routeEvidence.push({returnRoof:roof});
await page.keyboard.down('c');
const ladder28=await climb(0,-.45,1,11.2,-1);routeEvidence.push({descent28:ladder28});
let vent,ladder26,home;
if(ladder28.pos[1]<11.3){vent=await drive(page,[[0,11.0744,-60],[0,11.0744,-66],[0,11.0744,-69.5]],{tolerance:.15});routeEvidence.push({returnVent:vent});}
if(vent?.ok){ladder26=await climb(0,-.45,1,8.65,-1);routeEvidence.push({descent26:ladder26});}
await page.keyboard.up('c');await face(0,0);
if(ladder26?.pos[1]<8.7){home=await drive(page,[[0,8.5344,-70.875],[6.875,8.5344,-70.875],[9.125,8.5344,-73.125],[8.375,8.5344,-73.875],[7.625,8.2829,-74.625],[-2.125,3.4079,-74.625],[-2.875,3.2512,-73.875],[-1.375,3.2512,-70.125],[4.625,.8967,-63.375],[6.125,.8128,-61.875],[7.625,.8128,-58.125],[8,0,-55.5],[7.625,0,-54.375],[12.125,0,-49.875],[15.875,0,-49.875],[15.875,0,-53.625],[16.625,0,-54.375],[16.625,0,-55.125],[17.375,0,-55.875],[18.125,0,-55.875],[18.875,0,-55.125],[18.875,0,-40.875],[3.125,0,-25.125],[3.125,0,-17.625],[-7.375,0,-7.125],[-7.375,0,-6.375],[-8.125,0,-5.625],[-8.125,0,-4.875]]);routeEvidence.push({home});}
await page.screenshot({path:ROOT+'/qa-extraction.png'});
const state=await page.evaluate(()=>({state:__G.game.state,pos:__G.player.pos.toArray(),cut:__G.game.run.cut,health:__G.player.health,invulnerable:__G.player.invulnerable,combat:__G.combat.stats,errors:__errors}));
if(state.state==='playing')await page.keyboard.press('p');
await fs.writeFile(ROOT+'/qa-route.json',JSON.stringify(routeEvidence,null,2));
return {roof:roof.ok,ladder28,vent:vent?.ok,ladder26,home:home?.ok,state};
