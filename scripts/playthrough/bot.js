/*
 * Saltline Remix — scripted playthrough bot.
 *
 * Runs inside the page (index.html?dbg=1) and drives the player through the whole
 * mission using window.__dbg: walk to each uplink relay, cut it, fight whatever
 * shows up, then run for the boat on the south pier.
 *
 * Everything is fixed-timestep (dt = 1/60 s), so a run is reproducible and does not
 * depend on how fast the machine can render. Navigation uses the game's own nav grid
 * (physics.nav.findPath), the same one the Hounds path on.
 *
 * Pattern borrowed from wquguru/fable52-fps-repro (scripts/rec/auto04.js, MIT).
 */
(() => {
  const TAU = Math.PI * 2;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const hyp = (x, z) => Math.hypot(x, z);

  function createBot(opts = {}) {
    const D = window.__dbg;
    if (!D) throw new Error('window.__dbg missing — load index.html with ?dbg=1');
    const G = D.G, nav = D.nav, phys = G.physics, P = G.player;
    const o = {
      dt: 1 / 60,
      stepsPerDecision: 2,          // decide at 30 Hz
      god: false,
      infAmmo: false,
      order: null,                  // e.g. ['relay_a','relay_c','relay_b']; null = nearest next
      engageRange: 28,
      turnRate: 7,                  // rad/s, so the camera does not snap
      ...opts,
    };
    const V = (x, y, z) => new G.THREE.Vector3(x, y, z);
    const log = [];
    const say = (msg, extra = {}) => log.push({ t: +G.time.t.toFixed(2), msg, ...extra });

    G.events.on('objective:done', e => say(`relay cut: ${e.id} (${e.index}/${e.total})`, { ev: 'cut', id: e.id }));
    G.events.on('objective:all', () => say('all relays dark — heading for the boat', { ev: 'allCut' }));
    G.events.on('extraction:reached', () => say('extraction reached — breacher aboard', { ev: 'extracted' }));
    G.events.on('player:dead', () => say('player died', { ev: 'dead' }));
    G.events.on('player:rescued', () => say('fell in the water, rescued', { ev: 'rescued' }));
    G.events.on('enemy:killed', e => say(`killed ${e && e.enemy ? e.enemy.type : 'enemy'}`, { ev: 'kill' }));

    D.set({ god: o.god, infAmmo: o.infAmmo });
    D.start();

    let yaw = P.yaw, pitch = 0;
    let path = null, pathFor = null, pathT = -99;
    let lastProg = { t: 0, x: P.pos.x, z: P.pos.z }, stuckN = 0, unstickT = 0, unstickDir = 1;
    let target = null, cutting = false, firing = 0;
    const stats = { stuckEvents: 0, repaths: 0, minHp: 100, damageTaken: 0 };
    G.events.on('player:hit', e => { stats.damageTaken += (e && e.amount) || 0; });

    function nextGoal(st) {
      if (st.allCut) return { kind: 'extract', id: 'extract', pos: V(...st.extraction.pos), r: 1.6 };
      const live = st.relays.filter(r => !r.cut);
      let pick = target && target.kind === 'relay' && live.find(r => r.id === target.id); // sticky
      if (pick) return target;
      if (o.order) pick = o.order.map(id => live.find(r => r.id === id)).find(Boolean);
      if (!pick) {
        live.sort((a, b) => hyp(a.pos[0] - P.pos.x, a.pos[2] - P.pos.z) - hyp(b.pos[0] - P.pos.x, b.pos[2] - P.pos.z));
        pick = live[0];
      }
      return pick && { kind: 'relay', id: pick.id, pos: V(...pick.pos), r: 1.5 };
    }

    function repath(goal) {
      const p = nav.findPath(V(P.pos.x, 0, P.pos.z), V(goal.pos.x, 0, goal.pos.z));
      stats.repaths++;
      path = p && p.length ? p.map(w => ({ x: w.x, z: w.z })) : [{ x: goal.pos.x, z: goal.pos.z }];
      pathFor = goal.id; pathT = G.time.t;
    }

    function pickEnemy() {
      const eye = P.eye;
      let best = null, bd = 1e9;
      for (const e of D.enemies()) {
        const ay = e.p[1] + (e.type === 'hound' ? 0.6 : 0);
        const d = Math.hypot(e.p[0] - eye.x, ay - eye.y, e.p[2] - eye.z);
        if (d > o.engageRange) continue;
        let los = true;
        try { los = phys.lineOfSight(eye, V(e.p[0], ay, e.p[2])); } catch {}
        if (!los) continue;
        const score = d * (e.type === 'hound' ? 0.6 : 1); // hounds bite: prioritise
        if (score < bd) { bd = score; best = { ...e, aim: [e.p[0], ay, e.p[2]], d }; }
      }
      return best;
    }

    function turnToward(ty, tp, dtDec) {
      const max = o.turnRate * dtDec;
      const dy = wrap(ty - yaw);
      yaw += Math.max(-max, Math.min(max, dy));
      pitch += Math.max(-max, Math.min(max, tp - pitch));
      return Math.abs(dy);
    }

    // world direction (wx,wz) -> local move stick for the current yaw
    function stickFor(wx, wz) {
      const s = Math.sin(yaw), c = Math.cos(yaw), L = Math.hypot(wx, wz) || 1;
      wx /= L; wz /= L;
      return { x: wx * c - wz * s, y: -(wx * s + wz * c) };
    }

    function decide() {
      const dtDec = o.dt * o.stepsPerDecision;
      const st = D.st();
      if (st.state !== 'playing') return st;
      stats.minHp = Math.min(stats.minHp, st.hp);
      const goal = nextGoal(st);
      if (!goal) return st;
      if (!target || target.id !== goal.id) { target = goal; path = null; cutting = false; say(`goal → ${goal.id}`); }

      const px = P.pos.x, pz = P.pos.z;
      const gd = hyp(goal.pos.x - px, goal.pos.z - pz);
      const enemy = pickEnemy();
      const cmd = { fire: false, ads: false, sprint: false, interact: false, move: { x: 0, y: 0 } };

      // ---- movement target (path following) ----
      let wx = 0, wz = 0, moving = false;
      const atGoal = goal.kind === 'relay' ? gd < goal.r : gd < goal.r;
      if (!atGoal) {
        if (!path || pathFor !== goal.id || G.time.t - pathT > 1.5) repath(goal);
        while (path.length > 1 && hyp(path[0].x - px, path[0].z - pz) < 0.45) path.shift();
        const w = path[0];
        wx = w.x - px; wz = w.z - pz;
        if (hyp(wx, wz) < 0.05) { wx = goal.pos.x - px; wz = goal.pos.z - pz; }
        moving = true;
      }

      // ---- stuck detection ----
      if (moving && G.time.t - lastProg.t > 1.5) {
        const moved = hyp(px - lastProg.x, pz - lastProg.z);
        if (moved < 0.4) {
          stuckN++; stats.stuckEvents++; unstickT = 0.6; unstickDir = -unstickDir; path = null;
          say('stuck — unsticking', { pos: st.pos, stuckN });
        } else stuckN = 0;
        lastProg = { t: G.time.t, x: px, z: pz };
      }
      if (!moving) lastProg = { t: G.time.t, x: px, z: pz };

      // ---- combat or travel facing ----
      const fighting = enemy && !(cutting && o.god);
      if (fighting) {
        const [ex, ey, ez] = enemy.aim, eye = P.eye;
        const dx = ex - eye.x, dy = ey - eye.y, dz = ez - eye.z;
        const ty = Math.atan2(-dx, -dz), tp = Math.atan2(dy, Math.hypot(dx, dz));
        const err = turnToward(ty, tp, dtDec);
        const tol = Math.max(0.025, Math.atan2(0.45, enemy.d));
        cmd.ads = err < 0.35;
        cmd.fire = err < tol && st.ammo > 0;
        // keep walking (slowly, aimed) unless something is right on top of us
        if (moving && !(enemy.type === 'hound' && enemy.d < 6 && !o.god)) cmd.move = stickFor(wx, wz);
        if (!o.god && enemy.d < 8 && enemy.type === 'hound') { const s = stickFor(-dx, -dz); cmd.move = { x: s.x * 0.6, y: s.y * 0.6 }; }
      } else if (moving) {
        const ty = Math.atan2(-wx, -wz);
        const err = turnToward(ty, 0, dtDec);
        cmd.move = stickFor(wx, wz);
        cmd.sprint = err < 0.3 && hyp(wx, wz) > 1.5;
        if (err > 1.2) cmd.move = { x: cmd.move.x * 0.3, y: cmd.move.y * 0.3 };
      } else if (goal.kind === 'relay') {
        // at the relay: face it and hold USE
        const dx = goal.pos.x - P.eye.x, dz = goal.pos.z - P.eye.z, dy = goal.pos.y + 0.9 - P.eye.y;
        const err = turnToward(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)), dtDec);
        cmd.interact = err < 0.5;
      }
      // cut whenever we are in range and facing it (also while shooting if god)
      if (goal.kind === 'relay' && gd < 2.0) {
        const facing = (goal.pos.x - px) * P.forward.x + (goal.pos.z - pz) * P.forward.z;
        if (facing / Math.max(gd, 0.2) > 0.5 && (!fighting || o.god)) { cmd.interact = true; cmd.fire = false; }
      }
      cutting = cmd.interact;

      if (unstickT > 0) {
        unstickT -= dtDec;
        const s = stickFor(-wz * unstickDir, wx * unstickDir); // sidestep
        cmd.move = { x: s.x, y: s.y * 0.5 };
        if (stuckN >= 2) cmd.jump = true;
      }

      // reload when empty, or topping up when quiet
      if (st.weapon !== 'reloading' && (st.ammo === 0 || (st.ammo < 12 && !enemy))) cmd.reload = true;

      D.set({ yaw, pitch, ...cmd });
      return D.step(o.dt, o.stepsPerDecision);
    }

    return {
      opts: o, log, stats,
      // run decisions until sim time >= tUntil or the run is over
      run(tUntil) {
        let st = D.st();
        while (st.state === 'playing' && st.t < tUntil) st = decide();
        if (st.state !== 'playing') {   // let the end screen settle a bit
          D.set({ move: { x: 0, y: 0 }, fire: false, ads: false, interact: false });
        }
        return { st, log: log.splice(0) };
      },
      settle(sec) { D.set({ move: { x: 0, y: 0 }, fire: false, interact: false }); return D.step(o.dt, Math.round(sec / o.dt)); },
    };
  }
  window.__createBot = createBot;
})();
