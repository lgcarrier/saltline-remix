// Same fixed cameras with supplied native source textures for layout review.
const source=await (await import('node:fs/promises')).readFile(process.cwd()+'/tools/qa/italy-capture.cjs','utf8');
globalThis.italyCapturePrefix='source';
const result=await new Function('page','context','errors','return (async()=>{'+source.replace('&capture=', '&italyMaterials=source&capture=')+'})()')(page,context,errors);
return result;
