/* Local headed QA workbench. Use PLAYWRIGHT_MODULE to select an installed
 * Playwright package. Requires an isolated browser listening on localhost:9224.
 * Run: node tools/qa/run-italy.cjs tools/qa/italy-capture.cjs
 */
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
  const videoName=process.env.ITALY_QA_VIDEO;
  let context=videoName||process.env.ITALY_QA_FRESH==='1'?await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1,...(videoName?{recordVideo:{dir:path.resolve('output/playwright/italy'),size:{width:960,height:540}}}:{})}):browser.contexts().find(c=>c.pages().some(p=>p.url().includes('italy.html')))||browser.contexts().find(c=>c.pages().length);
  if(!context)context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const page=context.pages().find(p=>p.url().includes('italy.html'))||context.pages()[0]||await context.newPage();
  await page.bringToFront();
  const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/net::ERR_|Failed to load resource/.test(m.text()))errors.push(m.text());});
  const script=path.resolve(process.argv[2]);
  if(!script.startsWith(path.resolve('tools/qa')+path.sep))throw Error('QA scripts must be in tools/qa');
  const source=await fs.readFile(script,'utf8');
  const result=await new Function('page','context','errors','require','return (async()=>{'+source+'})()')(page,context,errors,require);
  if(videoName){const video=page.video();await context.close();const file=path.resolve('output/playwright/italy',path.basename(videoName));await video.saveAs(file);result.video={file,audioRecorded:false,performanceBenchmark:false};}
  console.log(JSON.stringify(result,null,2));
  process.exit(errors.length||result?.ok===false?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
