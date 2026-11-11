await page.screenshot({path:ROOT+'/qa-start.png'});
if(await page.evaluate(()=>__G.game.state==='title'))await page.getByRole('button',{name:'Deploy',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');
if(typeof runQA==='function')await runQA('performance');
const r=await drive(page,[[16.625,0,-7.875],[13.625,0,-10.875],[7.625,0,-10.875],[6.125,0,-13.125],[6.125,0,-28.125],[18.875,0,-40.875],[18.875,0,-55.125],[17.375,0,-55.875],[15.875,0,-54.375],[15.875,0,-49.875],[4.625,0,-49.875],[0,0,-50.5]]);
routeEvidence.push(r);
if(r.ok){
 const yaw=await page.evaluate(()=>__G.player.yaw);
 const a=Math.atan2(Math.sin(-yaw),Math.cos(-yaw)),key=a>0?'ArrowLeft':'ArrowRight';
 await page.keyboard.down(key);await sleep(Math.abs(a)/2.1*1000);await page.keyboard.up(key);
 await page.keyboard.down('e');await sleep(2700);await page.keyboard.up('e');
 const r2=await drive(page,[[8,0,-54],[8,0,-56],[8,.8128,-58,'jump'],[8,.8128,-60]]);routeEvidence.push(r2);
}
await page.keyboard.press('p');await sleep(200);
await fs.writeFile(ROOT+'/qa-route.json',JSON.stringify(routeEvidence,null,2));
return {routes:routeEvidence.slice(-2),state:await page.evaluate(()=>({state:__G.game.state,pos:__G.player.pos.toArray(),cut:__G.game.run.cut,health:__G.player.health,errors:__errors}))};
