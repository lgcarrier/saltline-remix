// Input-only traversal helper for the local Playwright workbench. State is read
// for feedback; movement, turning, jumping and interaction use browser keys.
module.exports = async function drive(page, targets, options={}) {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), result=[];
  const state=()=>page.evaluate(()=>({p:__G.player.pos.toArray(),yaw:__G.player.yaw,pitch:__G.player.pitch,health:__G.player.health,state:__G.game.state}));
  const delta=a=>Math.atan2(Math.sin(a),Math.cos(a));
  await page.bringToFront();
  for(const target of targets){
    const began=Date.now();let last=null,stuck=0;
    while(Date.now()-began<(options.timeout||16000)){
      const s=await state();if(s.state!=='playing')return {ok:false,reason:s.state,result,state:s};
      const dx=target[0]-s.p[0],dz=target[2]-s.p[2],distance=Math.hypot(dx,dz);
      if(distance<(options.tolerance||.34)){result.push({target,state:s,ms:Date.now()-began});console.log(JSON.stringify({checkpoint:target,pos:s.p,health:s.health}));break;}
      const turn=delta(Math.atan2(-dx,-dz)-s.yaw);
      if(Math.abs(turn)>.09){const key=turn>0?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);await sleep(Math.min(180,Math.max(25,Math.abs(turn)/2.1*900)));await page.keyboard.up(key);continue;}
      await page.keyboard.down('w');
      if(target[3]==='jump')await page.keyboard.down('Space');
      await sleep(Math.min(180,Math.max(45,distance/3.8*800)));
      await page.keyboard.up('w');if(target[3]==='jump')await page.keyboard.up('Space');
      const p=(await state()).p;
      if(last&&Math.hypot(p[0]-last[0],p[2]-last[2])<.02)stuck++;else stuck=0;
      last=p;if(stuck>10)return {ok:false,reason:'blocked',target,result,state:await state()};
    }
    if(Date.now()-began>=(options.timeout||16000))return {ok:false,reason:'timeout',target,result,state:await state()};
  }
  return {ok:true,result,state:await state()};
};
