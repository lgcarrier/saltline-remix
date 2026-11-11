// Diagnostic instrumentation only; never included in the acceptance FPS run.
return await page.evaluate(()=>{
 const G=__G,gl=G.renderer.getContext();
 const r=window.__hitchDiagnostics={start:performance.now(),frames:[],slowCalls:[],longTasks:[],events:[],active:true};
 let costs={},last=performance.now(),frameNumber=0;
 const wrap=(obj,key,name,threshold=4)=>{
  const fn=obj?.[key];if(typeof fn!=='function')return;
  obj[key]=function(...args){const t=performance.now();try{return fn.apply(this,args);}finally{
   if(r.active){const ms=performance.now()-t;costs[name]=(costs[name]||0)+ms;
    if(ms>threshold)r.slowCalls.push({name,ms,t,frame:frameNumber,pos:G.player.pos.toArray(),stack:ms>20?new Error().stack:undefined});}
  }};
 };
 for(const system of ['render','enemies','physics','level','weapon','ground','fx','audio','player','game'])
  for(const key of Object.keys(G[system]||{}))if(typeof G[system][key]==='function'&&!['stats','debug','diagnostics'].includes(key))wrap(G[system],key,system+'.'+key,8);
 for(const key of ['texImage2D','texSubImage2D','texImage3D','bufferData','bufferSubData','compileShader','linkProgram','getProgramParameter','getShaderParameter','readPixels','finish'])wrap(gl,key,'gl.'+key,3);
 if(window.PerformanceObserver)try{new PerformanceObserver(list=>{if(r.active)r.longTasks.push(...list.getEntries().map(e=>({t:e.startTime,ms:e.duration,name:e.name})));}).observe({type:'longtask',buffered:true});}catch{}
 const old=G.render.frame;
 G.render.frame=function(dt){const t=performance.now();old(dt);if(r.active){
  r.frames.push({t,frameMs:t-last,costs,frame:frameNumber++,state:G.game.state,pos:G.player.pos.toArray(),programs:G.renderer.info.programs.length,textures:G.renderer.info.memory.textures,geometries:G.renderer.info.memory.geometries,shadowBakes:G.level.stats.lighting.shadowBakes,health:G.player.health});
  costs={};last=t;
 }};
 return {instrumented:true,quality:G.quality};
});
