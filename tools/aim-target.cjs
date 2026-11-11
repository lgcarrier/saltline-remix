// Aim and fire through actual browser keyboard controls. No state mutation.
module.exports = async function engage(page, seconds=12) {
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),start=Date.now();let shots=0;
 while(Date.now()-start<seconds*1000){
  const s=await page.evaluate(()=>{
   const p=__G.player;const targets=__G.enemies.list.filter(e=>e.alive).map(e=>({id:e.id,p:(e.sensor||e.pos).toArray(),dist:e.pos.distanceTo(p.eye)})).filter(e=>__G.physics.lineOfSight(p.eye,new __G.THREE.Vector3(...e.p))).sort((a,b)=>a.dist-b.dist);
   return {alive:p.alive,eye:p.eye.toArray(),yaw:p.yaw,pitch:p.pitch,target:targets[0],stats:__G.combat.stats};
  });
  if(!s.alive||!s.target)return {shots,state:s};
  const [x,y,z]=s.eye,[a,b,c]=s.target.p;
  const yaw=Math.atan2(-(a-x),-(c-z)),pitch=Math.atan2(b-y,Math.hypot(a-x,c-z));
  const dy=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw)),dp=pitch-s.pitch;
  if(Math.abs(dy)>.035||Math.abs(dp)>.025){
   const keys=[];if(Math.abs(dy)>.035)keys.push(dy>0?'ArrowLeft':'ArrowRight');if(Math.abs(dp)>.025)keys.push(dp>0?'ArrowUp':'ArrowDown');
   for(const k of keys)await page.keyboard.down(k);await sleep(Math.max(20,Math.min(80,Math.max(Math.abs(dy)/2.1,Math.abs(dp)/1.26)*850)));for(const k of keys)await page.keyboard.up(k);
  }else{await page.keyboard.down('Enter');await sleep(180);await page.keyboard.up('Enter');shots++;}
 }
 return {shots,state:await page.evaluate(()=>({health:__G.player.health,combat:__G.combat.stats}))};
};
