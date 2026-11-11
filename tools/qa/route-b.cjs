await page.getByRole('button',{name:'Resume',exact:true}).click();
const targets=[[6.875,.8128,-61.125],[4.625,.8967,-63.375],[-2.125,3.2512,-70.125],[-2.875,3.2512,-70.875],[-2.875,3.2512,-73.875],[-2.125,3.4079,-74.625],[7.625,8.2829,-74.625],[8.375,8.5344,-73.875],[9.125,8.5344,-73.125],[8.375,8.5344,-72.375],[-11.125,8.5344,-72.375],[-15.625,8.5344,-67.875],[-15.625,8.5344,-67.125],[-16.375,8.5344,-66.375],[-17.125,8.5344,-66.375],[-17.875,8.5344,-65.625],[-19.375,8.5344,-65.625],[-22.375,8.5344,-62.625],[-24.625,8.5344,-62.625],[-25.375,8.5344,-63.375],[-25.375,8.5344,-64.125],[-26.125,8.5344,-64.5]];
const r=await drive(page,targets);routeEvidence.push(r);
if(r.ok){const yaw=await page.evaluate(()=>__G.player.yaw);const a=Math.atan2(Math.sin(-yaw),Math.cos(-yaw)),key=a>0?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);await sleep(Math.abs(a)/2.1*1000);await page.keyboard.up(key);await page.keyboard.down('e');await sleep(2700);await page.keyboard.up('e');}
await page.screenshot({path:ROOT+'/qa-office.png'});
await page.keyboard.press('p');await sleep(200);
await fs.writeFile(ROOT+'/qa-route.json',JSON.stringify(routeEvidence,null,2));
return {route:r,state:await page.evaluate(()=>({state:__G.game.state,pos:__G.player.pos.toArray(),cut:__G.game.run.cut,health:__G.player.health,errors:__errors}))};
