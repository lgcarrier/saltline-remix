const fs=await import('node:fs/promises'),repo=process.cwd();
globalThis.italyCapturePrefix='v5';
const captureSource=await fs.readFile(repo+'/tools/qa/italy-capture.cjs','utf8');
const capture=await new Function('page','context','errors','require','return (async()=>{'+captureSource+'})()')(page,context,errors,require);
console.log('CAPTURES COMPLETE',capture.documentSha256,'errors',capture.errors.length);
const missionSource=await fs.readFile(repo+'/tools/qa/italy-mission.cjs','utf8');
const mission=await new Function('page','context','errors','require','return (async()=>{'+missionSource+'})()')(page,context,errors,require);
return {captureHash:capture.documentSha256,captureErrors:capture.errors,mission};
