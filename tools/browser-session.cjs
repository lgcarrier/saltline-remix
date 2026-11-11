// Local Playwright workbench. JSON-lines commands keep one real browser alive.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

if (process.argv.includes('--help')) {
  console.log(`Usage: node tools/browser-session.cjs [--headless] [--check]

Uses a locally resolvable playwright or playwright-core package.
SALTLINE_PLAYWRIGHT can name an existing package or its absolute directory.
SALTLINE_BROWSER_CHANNEL defaults to chrome; use bundled for Playwright Chromium.
SALTLINE_RECORD_VIDEO optionally names a directory for a 1600x900 WebM recording.
--check resolves the optional browser dependency without launching a browser.

Send one JSON object per line: {"id":"name","code":"return await page.title()"}.
A filename field runs a local JavaScript snippet; {"close":true} exits.
The game build and physics tests do not require Playwright.`);
  process.exit(0);
}

function loadPlaywright() {
  const override = process.env.SALTLINE_PLAYWRIGHT;
  const candidates = override ? [override.startsWith('.') || path.isAbsolute(override) ? path.resolve(override) : override] : ['playwright', 'playwright-core'];
  for (const candidate of candidates) {
    let resolved;
    try { resolved = require.resolve(candidate); }
    catch (error) { if (error.code === 'MODULE_NOT_FOUND') continue; throw error; }
    const runtime = require(resolved);
    if (!runtime.chromium?.launch) throw new Error(`Playwright dependency at ${resolved} does not expose chromium.launch().`);
    return { runtime, resolved };
  }
  throw new Error(override
    ? `Cannot resolve SALTLINE_PLAYWRIGHT=${override}. Set it to an existing Playwright package directory or module name.`
    : 'Optional browser tooling is unavailable. Resolve playwright or playwright-core locally (for example: npm install --no-save playwright), or set SALTLINE_PLAYWRIGHT to an existing package directory. No browser dependency is needed for npm run build or npm test.');
}

(async () => {
  const { runtime, resolved } = loadPlaywright();
  if (process.argv.includes('--check')) {
    console.log(JSON.stringify({ available: true, module: resolved }));
    return;
  }
  const channel = process.env.SALTLINE_BROWSER_CHANNEL || 'chrome';
  const browser = await runtime.chromium.launch({ ...(channel === 'bundled' ? {} : { channel }), headless: process.argv.includes('--headless') });
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1,
      ...(process.env.SALTLINE_RECORD_VIDEO ? {recordVideo:{dir:path.resolve(process.env.SALTLINE_RECORD_VIDEO),size:{width:1600,height:900}}}: {}) });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 500)); });
    console.log(JSON.stringify({ ready: true }));
    for await (const line of readline.createInterface({ input: process.stdin })) {
      let cmd;
      try {
        cmd = JSON.parse(line);
        console.log(JSON.stringify({ running: cmd.id }));
        if (cmd.close) break;
        const code = cmd.filename ? fs.readFileSync(cmd.filename, 'utf8') : cmd.code;
        if (typeof code !== 'string') throw new Error('Command requires a code string, filename, or close:true.');
        const fn = new Function('page', 'context', 'errors', `return (async()=>{${code}})()`);
        const result = await fn(page, context, errors);
        console.log(JSON.stringify({ id: cmd.id, result }));
      } catch (e) { console.log(JSON.stringify({ id: cmd?.id, error: e.message })); }
    }
    await context.close();
  } finally { await browser.close(); }
})().catch(error => {
  console.error(JSON.stringify({ ready: false, error: error.message }));
  process.exitCode = 1;
});
