// Run in the browser workbench after gameplay starts. No simulation mutations.
return await page.evaluate(()=>{
 const G=__G,gl=G.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 const r=window.__qaPerformance={metadata:{duration_requested_ms:30000,mode:'normal keyboard traversal, live enemies and audio, fixed high quality',browser:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],quality:G.quality,audio:G.audio?.debug(),stubs:Object.fromEntries(['mats','physics','props','level','ground','enemies','weapon','audio'].map(n=>[n,!!G[n]?.stub])),startPlayer:G.player.pos.toArray(),startStats:__stats(),recording:false},frames_ms:[],qualityHistory:[]};
 let start=null,last=null;
 function frame(now){if(last===null){start=last=now;requestAnimationFrame(frame);return;}r.frames_ms.push(now-last);last=now;if(r.frames_ms.length%60===0)r.qualityHistory.push({t:now-start,stats:__stats(),alive:G.enemies.list.filter(e=>e.alive).length});if(now-start<30000)requestAnimationFrame(frame);else{r.metadata.endStats=__stats();r.metadata.endAudio=G.audio?.debug();r.metadata.completed=true;}}
 requestAnimationFrame(frame);return {started:true,metadata:r.metadata};
});
