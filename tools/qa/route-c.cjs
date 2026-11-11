await page.getByRole('button',{name:'Resume',exact:true}).click();
const targets=[[-25.375,8.5344,-63.375],[-24.625,8.5344,-62.625],[-20.125,8.5344,-62.625],[-13.375,8.5344,-69.375],[-13.375,8.5344,-70.125],[-12.625,8.5344,-70.875],[0,8.5344,-70.4]];
const r=await drive(page,targets);routeEvidence.push(r);
globalThis.face=async function(yaw,pitch=0){for(let k=0;k<35;k++){const s=await page.evaluate(()=>({yaw:__G.player.yaw,pitch:__G.player.pitch}));const a=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw)),b=pitch-s.pitch;if(Math.abs(a)<.035&&Math.abs(b)<.03)return;const keys=[];if(Math.abs(a)>.035)keys.push(a>0?'ArrowLeft':'ArrowRight');if(Math.abs(b)>.03)keys.push(b>0?'ArrowUp':'ArrowDown');for(const key of keys)await page.keyboard.down(key);await sleep(Math.max(18,Math.min(80,Math.max(Math.abs(a)/2.1,Math.abs(b)/1.26)*850)));for(const key of keys)await page.keyboard.up(key);}};
globalThis.climb=async function(yaw,pitch,axis,threshold,direction){await face(yaw,pitch);await page.keyboard.down('w');let state;for(let k=0;k<70;k++){await sleep(100);state=await page.evaluate(()=>({pos:__G.player.pos.toArray(),ladder:__assault.diagnostics().ladder,state:__G.game.state,health:__G.player.health}));if(state.state!=='playing'||(direction>0?state.pos[axis]>=threshold:state.pos[axis]<=threshold))break;}await page.keyboard.up('w');return state;};
let ascent=null,vent=null,roof=null,relay=null;
if(r.ok){
 await page.keyboard.up('c');await page.keyboard.down('c');
 ascent=await climb(Math.PI,.28,2,-69.45,1);routeEvidence.push({ladder26:ascent});
 if(ascent.pos[1]>10.9){vent=await drive(page,[[0,11.0744,-66],[0,11.0744,-60],[0,11.0744,-56.1]],{tolerance:.15});routeEvidence.push({vent});}
 if(vent?.ok){roof=await climb(Math.PI,.28,2,-54.7,1);routeEvidence.push({ladder28:roof});}
 await page.keyboard.up('c');
 if(roof?.pos[1]>12.8){relay=await drive(page,[[2,13.0048,-53.5],[10,13.0048,-50.5]]);routeEvidence.push({roof:relay});if(relay.ok){await face(Math.PI,0);await page.keyboard.down('e');await sleep(2700);await page.keyboard.up('e');}}
}
await page.screenshot({path:ROOT+'/qa-roof.png'});await page.keyboard.press('p');await sleep(200);
await fs.writeFile(ROOT+'/qa-route.json',JSON.stringify(routeEvidence,null,2));
return {route:r.ok,ascent,vent,roof,relay,state:await page.evaluate(()=>({state:__G.game.state,pos:__G.player.pos.toArray(),cut:__G.game.run.cut,health:__G.player.health,crouch:__G.player.crouching,pitch:__G.player.pitch,ladder:__assault.diagnostics().ladder,errors:__errors}))};
