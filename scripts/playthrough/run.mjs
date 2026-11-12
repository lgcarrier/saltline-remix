#!/usr/bin/env node
// Saltline Remix — headless scripted playthrough runner.
//
//   node run.mjs [--god] [--inf-ammo] [--max-frames 36000] [--shot-every 2]
//                [--out out] [--video] [--width 960 --height 540] [--seed 4207]
//                [--order relay_a,relay_c,relay_b] [--chrome /path/to/chrome] [--headed]
//
// Loads ../../index.html?dbg=1&noaudio=1 in Chromium (SwiftShader is fine — no GPU
// needed), injects bot.js, and steps the game at a fixed 1/60 s timestep until the
// mission is complete, the player dies, or the frame budget runs out. Screenshots
// are taken every --shot-every seconds of *simulated* time. Prints a JSON summary
// and exits 0 only if all relays were cut and the extraction was reached.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = n => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const cfg = {
  god: flag('god'),
  infAmmo: flag('inf-ammo'),
  maxFrames: +opt('max-frames', 36000),          // 10 min of game time at 60 Hz
  shotEvery: +opt('shot-every', 2),
  out: resolve(opt('out', join(here, 'out'))),
  video: flag('video'),
  width: +opt('width', 960), height: +opt('height', 540),
  seed: opt('seed', '4207'),
  order: opt('order', '') ? opt('order').split(',') : null,
  chrome: opt('chrome', process.env.CHROME_PATH || ''),
  headed: flag('headed'),
  page: resolve(opt('page', join(here, '..', '..', 'index.html'))),
};
const DT = 1 / 60;
const t0 = Date.now();
const elapsed = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
const logLine = s => console.error(`[${elapsed()}] ${s}`);

mkdirSync(cfg.out, { recursive: true });
for (const f of readdirSync(cfg.out)) if (/^f\d+\.png$/.test(f)) rmSync(join(cfg.out, f));

const browser = await chromium.launch({
  headless: !cfg.headed,
  ...(cfg.chrome ? { executablePath: cfg.chrome } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
let exitCode = 1;
const summary = { ok: false, config: { ...cfg, chrome: cfg.chrome || 'playwright-chromium' }, events: [] };
try {
  const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text().slice(0, 300)); });

  const url = pathToFileURL(cfg.page).href + `?dbg=1&noaudio=1&seed=${encodeURIComponent(cfg.seed)}`;
  logLine(`loading ${url}`);
  await page.goto(url);
  await page.waitForFunction(() => window.__dbg || window.__fatal, null, { timeout: 300000 });
  const fatal = await page.evaluate(() => window.__fatal);
  if (fatal) throw new Error('game failed to boot: ' + fatal);
  logLine('booted; injecting bot');
  await page.addScriptTag({ path: join(here, 'bot.js') });
  await page.evaluate(o => { window.__bot = window.__createBot(o); }, { god: cfg.god, infAmmo: cfg.infAmmo, order: cfg.order });

  let shot = 0, st = null, nextShot = 0;
  const snap = async () => {
    await page.evaluate(() => window.__dbg.draw());
    await page.screenshot({ path: join(cfg.out, `f${String(shot++).padStart(5, '0')}.png`) });
  };
  const budgetT = cfg.maxFrames * DT;
  while (true) {
    const res = await page.evaluate(t => window.__bot.run(t), Math.min(nextShot, budgetT));
    st = res.st;
    for (const e of res.log) { summary.events.push(e); logLine(`t=${e.t}s ${e.msg}`); }
    if (st.t >= nextShot - 1e-6) {
      await snap();
      nextShot += cfg.shotEvery;
      if (shot % 15 === 1) logLine(`t=${st.t.toFixed(1)}s pos=${st.pos.map(v => v.toFixed(1))} hp=${st.hp} ammo=${st.ammo}/${st.reserve} cut=${st.cut}/${st.total} enemies=${st.enemiesAlive}`);
    }
    if (st.state !== 'playing' || st.frame >= cfg.maxFrames || st.t >= budgetT) break;
  }
  // let the debrief / death screen come up for the final frames
  if (st.state === 'complete' || st.state === 'dead') {
    for (let k = 0; k < 3; k++) { await page.evaluate(() => window.__bot.settle(1.5)); await snap(); }
    st = await page.evaluate(() => window.__dbg.st());
  }
  const botStats = await page.evaluate(() => window.__bot.stats);
  summary.ok = st.won && st.cut === st.total;
  summary.result = st.won ? 'extracted' : st.lost ? 'died' : st.state !== 'playing' ? st.state : 'frame budget exhausted';
  Object.assign(summary, {
    simFrames: st.frame, simSeconds: st.t, missionSeconds: st.runTime,
    relaysCut: `${st.cut}/${st.total}`, hpEnd: st.hp, kills: st.kills, shots: st.shots, hits: st.hits,
    accuracy: st.shots ? +(st.hits / st.shots).toFixed(3) : null,
    finalPos: st.pos, screenshots: shot, outDir: cfg.out, wallSeconds: +((Date.now() - t0) / 1000).toFixed(1),
    bot: botStats, pageErrors: pageErrors.slice(0, 10),
  });
  if (!summary.ok) {
    const left = st.relays.filter(r => !r.cut).map(r => r.id);
    summary.why = st.lost ? `player died at ${JSON.stringify(st.pos)} with relays left: ${left.join(',') || 'none'}`
      : left.length ? `relays not cut within budget: ${left.join(',')} (last pos ${JSON.stringify(st.pos)})`
      : `all relays cut but extraction not reached (last pos ${JSON.stringify(st.pos)})`;
  }
  exitCode = summary.ok ? 0 : 2;
} catch (e) {
  summary.error = String(e && e.stack || e);
  exitCode = 3;
} finally {
  await browser.close();
}

if (cfg.video && summary.screenshots) {
  const ff = spawnSync('ffmpeg', ['-version']);
  if (ff.status === 0) {
    const fps = opt('video-fps', '8');
    const mp4 = join(cfg.out, 'playthrough.mp4'), gif = join(cfg.out, 'playthrough.gif');
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', fps, '-i', join(cfg.out, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', mp4], { stdio: 'inherit' });
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', fps, '-i', join(cfg.out, 'f%05d.png'), '-vf', 'scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer', gif], { stdio: 'inherit' });
    if (existsSync(mp4)) summary.video = mp4;
    if (existsSync(gif)) summary.gif = gif;
  } else summary.video = 'ffmpeg not found — skipped';
}
writeFileSync(join(cfg.out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (exitCode !== 0) logLine(`FAIL: ${summary.why || summary.error || summary.result}`);
else logLine(`PASS: ${summary.relaysCut} relays cut, extracted at t=${summary.missionSeconds}s (${summary.simFrames} frames)`);
process.exit(exitCode);
