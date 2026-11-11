await runQA('bootstrap');
globalThis.ROOT=REPO+'/output/playwright/assault/v10-tests/exterior-ladder';await fs.mkdir(ROOT,{recursive:true});
const dm={exports:{}};new Function('module','exports',await fs.readFile(REPO+'/tools/drive-route.cjs','utf8'))(dm,dm.exports);
globalThis.drive=(p,t,o={})=>dm.exports(p,t,{sprint:true,...o});
await page.getByRole('button',{name:'Deploy',exact:true}).click();await page.waitForFunction(()=>__G.game.state==='playing');
const approach=await drive(page,[[16.625,0,-7.875],[13.625,0,-10.875],[7.625,0,-10.875],[6.125,0,-13.125],[6.125,0,-28.125],[18.875,0,-40.875],[18.85,0,-44.704]]);
let ascent=null,descent=null;
if(approach.ok){ascent=await climb(Math.PI/2,.28,0,18.1,-1);await page.screenshot({path:ROOT+'/ladder13-top.png'});if(ascent.pos[1]>9.9)descent=await climb(-Math.PI/2,-.45,1,.82,-1);}
await page.keyboard.press('p');await page.waitForTimeout(150);
const result={documentSha256:testDocumentHash,normalInputOnly:true,approach,ascent,descent,passed:ascent?.pos[1]>9.9&&descent?.pos[1]<.82,state:await page.evaluate(()=>({state:__G.game.state,health:__G.player.health,invulnerable:__G.player.invulnerable,errors:__errors}))};
await fs.writeFile(ROOT+'/result.json',JSON.stringify(result,null,2));return result;
