await runQA('bootstrap');
globalThis.ROOT=REPO+'/output/playwright/assault/v9-tests/harbor-walk';await fs.mkdir(ROOT,{recursive:true});
const dm={exports:{}};new Function('module','exports',await fs.readFile(REPO+'/tools/drive-route.cjs','utf8'))(dm,dm.exports);
globalThis.drive=(p,t,o={})=>dm.exports(p,t,{sprint:true,...o});
await runQA('mission-metrics');
await page.evaluate(()=>{__qaMissionPerformance.metadata.mode='normal-input western harbor approach and panorama; not a complete mission';});
await page.getByRole('button',{name:'Deploy',exact:true}).click();
await page.waitForFunction(()=>__G.game.state==='playing');
// Arrow-key aiming helper is established by the complete mission's route-c.
if(typeof face!=='function')throw new Error('Run harbor-mission before harbor-walk');
const route=await drive(page,[[16.625,0,-7.875],[13.625,0,-10.875],[7.625,0,-10.875],[6.125,0,-13.125],[3.125,0,-24.375],[2.375,0,-21.375],[-4.375,0,-14.625],[-4.375,0,-11.625],[-5.125,0,-10.875],[-36.625,0,-10.875],[-37.375,.1229,-11.625],[-37.375,6.5024,-25.125],[-37.375,6.5024,-40.875],[-44.125,6.5024,-55.125]]);
routeEvidence.push({harborRoad:route});
if(route.ok){
 const pose=await page.evaluate(()=>({p:__G.player.pos.toArray(),eye:__G.player.eye.toArray()}));
 await face(Math.atan2(-(-85-pose.p[0]),-(-40-pose.p[2])),Math.atan2(12-pose.eye[1],Math.hypot(-85-pose.p[0],-40-pose.p[2])));
 await page.screenshot({path:ROOT+'/ship-playable.png'});
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(9000);await page.keyboard.up('ArrowLeft');
}
await page.keyboard.press('p');
return await runQA('summarize-mission');
