// Observe RAF delivery throughout a real input-driven mission. No game state
// writes, position overrides, quality changes, or simulation acceleration.
return await page.evaluate(()=>{
 const G=__G,gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 const report=window.__qaMissionPerformance={metadata:{mode:'complete normal-input mission; samples only while playing',viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],quality:{...G.quality},gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),browser:navigator.userAgent,recording:false,exposure:'gameplay automatic',warmupExclusionMs:2000},frames:[],checkpoints:[],active:true};
 let last=performance.now(),firstPlaying=null,wasPlaying=false;
 function frame(now){
  const playing=G.game.state==='playing',p=G.player.pos,dt=now-last;last=now;
  if(playing&&firstPlaying===null)firstPlaying=now;
  if(playing&&wasPlaying&&now-firstPlaying>2000){
   const zone=p.y>12.8?'roof':p.x<-17.5&&p.y>8?'office':p.y>10.5&&Math.abs(p.x)<.9?'vent':p.z<-40.6&&p.x>-18.3&&p.x<18.3?'hall':'yard';
   report.frames.push({ms:dt,zone});
   if(report.frames.length%120===0)report.checkpoints.push({t:now-firstPlaying,zone,pos:p.toArray(),stats:__stats(),lights:{...G.level.stats.lighting}});
  }
  wasPlaying=playing;
  if(report.active)requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);return report.metadata;
});
