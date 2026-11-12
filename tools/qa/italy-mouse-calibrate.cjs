const sleep=ms=>new Promise(r=>setTimeout(r,ms)),fs=await import('node:fs/promises'),repo=process.cwd();
await page.setViewportSize({width:1600,height:900});
await page.goto('http://127.0.0.1:8767/italy.html?q=high&dynres=0&seed=4207');
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:120000});
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
await page.getByRole('button',{name:'Deploy',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');await sleep(350);
await page.locator('#view').click({position:{x:600,y:450}});await sleep(200);
for(let attempt=0;attempt<3&&!await page.evaluate(()=>__G.input.locked);attempt++){await page.keyboard.press('p');await page.getByRole('button',{name:'Resume',exact:true}).click();await sleep(500);}
if(!await page.evaluate(()=>__G.input.locked))throw Error('Pointer lock unavailable for calibration');
let cursor={x:600,y:450};const records=[];
for(const target of [-2,2,0,-2,2,0,-2,2,0]){
 const before=await page.evaluate(()=>({yaw:__G.player.yaw,locked:__G.input.locked,scale:__G.player.lookScale,sensitivity:__G.input.sensitivity,state:__G.game.state}));
 const delta=Math.atan2(Math.sin(target-before.yaw),Math.cos(target-before.yaw)),dx=Math.round(-delta/(.0021*(before.scale||1)*(before.sensitivity||1)));
 cursor.x+=dx;await page.mouse.move(cursor.x,cursor.y,{steps:Math.ceil(Math.abs(dx)/250)});await sleep(45);
 const after=await page.evaluate(()=>({yaw:__G.player.yaw,locked:__G.input.locked,state:__G.game.state}));
 records.push({target,before,cursor:{...cursor},after,error:Math.atan2(Math.sin(target-after.yaw),Math.cos(target-after.yaw))});
}
const result={kind:'real pointer-locked mouse calibration outside viewport coordinate range',ok:records.every(x=>x.after.state==='playing'&&Math.abs(x.error)<.015),records,errors};
await fs.writeFile(repo+'/output/playwright/italy/mouse-calibration.json',JSON.stringify(result,null,2));return result;
