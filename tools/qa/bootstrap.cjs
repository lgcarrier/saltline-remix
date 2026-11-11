globalThis.fs=await import('node:fs/promises');
globalThis.sleep=ms=>new Promise(r=>setTimeout(r,ms));
globalThis.REPO=process.cwd();
globalThis.ROOT=REPO+'/output/playwright/assault';
globalThis.drive=(await import((await import('node:url')).pathToFileURL(REPO+'/tools/drive-route.cjs').href)).default;
globalThis.routeEvidence=[];
const response=await page.goto('http://127.0.0.1:8767/?q=high&dynres=0&seed=4207',{waitUntil:'domcontentloaded'});
globalThis.testDocumentHash=(await import('node:crypto')).createHash('sha256').update(await response.body()).digest('hex');
await page.waitForFunction(()=>window.__ready||window.__fatal,null,{timeout:90000});
await page.waitForFunction(()=>document.querySelector('#boot').hidden);
await page.waitForTimeout(1000); // Let the existing ready-overlay transition finish.
return {hash:testDocumentHash,...await page.evaluate(()=>({ready:__ready,errors:__errors,state:__G.game.state}))};
