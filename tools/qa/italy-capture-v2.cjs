globalThis.italyCapturePrefix='v2';
const source=await (await import('node:fs/promises')).readFile(process.cwd()+'/tools/qa/italy-capture.cjs','utf8');
return await new Function('page','context','errors','return (async()=>{'+source+'})()')(page,context,errors);
