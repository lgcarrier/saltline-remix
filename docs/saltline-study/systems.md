# Saltline systems audit — static source evidence

Scope: `/Users/lgcarrier/Developer/saltline-remix/original.html`, repository snapshot inspected 2026-11-10. `index.html` is a remix. This audit read code; it did not play the game, listen to audio, or prove historical tests passed. Bundling leaves very long lines; line + function/symbol is the most precise locator. Original source file/module names are generally not retained, so names from screenshots are not fabricated as bundle markers.

## What the source proves

### The sound-count discrepancy is accounting

`original.html:5926`, registry `Go`, has **57 named entries total**, including `ir_outdoor` and `ir_shed`. Summing each entry's `n` gives **93 variants/buffers**, also including the two IRs. Thus the clearest accounting is **55 sound/music types, generating 91 variants, plus two impulse responses = 93 total buffers**. The screenshot's “93 sounds” and user's “57 sounds plus two reverb profiles” are not two competing source versions: 93 is a variant/buffer count; 57 already includes the reverbs. Count reproducibly by slicing `Go={...}` through the following `i_={step:` and extracting each `name:{gen:...,n:N,...}`.

Five music stems are registered: `music_drone`, `music_ost`, `music_perc`, `music_brass`, `music_motif`. Screenshot's three labels are a simplification, not a complete inventory.

### Audio is generated sample data with a production-oriented playback layer

`original.html:5926`:

- `ao` is seeded random generation; `Kb` hashes the sound name; generator seed is `Kb(name) + variant*7919`. Sound variants are repeatable even though runtime selection/environment activity also uses `Math.random`.
- Helpers construct `Float32Array`s: `Qn` noise, `tn` biquad filters, `di` varying filter, `ei` decaying chirp, `dn` resonant partials, `lo` envelopes, `Wo` tanh distortion, `em` endpoint fades, `Rv` loop crossfade. No `createOscillator`/`OscillatorNode` call exists in the artifact.
- Rifle generator `KR` layers several short high-pass cracks, filtered body noise, a low decaying chirp, and delayed metal partials; it then gain-scales and distorts. Separate indoor/outdoor tails avoid baking every environment into the close shot.
- `u_` creates AudioBuffers, copies generated channels into them and plays through `createBufferSource`; the claim “no oscillators” should mean no WebAudio oscillator nodes, because sine oscillation is still written mathematically into samples.
- Boot-priority sounds generate immediately; remaining work runs incrementally, yielding after approximately 6 ms and scheduling another batch after 12 ms. Requested sounds move forward in the queue. This is startup responsiveness, not background-worker synthesis.
- A routing graph separates `world`, `near`, `amb`, `dry`, `music`, two convolution reverbs, filtering, compressor, gain staging and waveshaping. Voice priorities/limits and capped nearby enemy loops prevent unlimited audio work. HRTF is used for selected loops; not every voice pays its cost.
- `lu` derives interior membership from level `interiorBoxes`, smooths crossfades, and changes rain/wind/reverb. Combat state controls layer gain. The lesson is environment/state coherence, not simply “add more sounds.”

### Geometry is richer than boxes, and not universally one mesh

`original.html:4178`, helpers `Wi`, `sa`: beveled box generation; geometry merging checks compatible index/attribute layouts. `original.html:5440`, `Gi`/`PROP_SIZES`: explicit meter-scale prop dimensions (e.g. 20-foot container 6.06 × 2.59 × 2.44; 40-foot 12.19 × 2.59 × 2.44). The dimensions are authoring choices here, not independently verified engineering specifications.

`original.html:5926`, `w_`, `mi`, `xr`, `qo`, `Cn`, `Vv`: weapon parts use extruded profiles (including holes), bevels, custom rings/lofts, cylinders, and explicit assembly dimensions. Hands use procedural palm/finger/sleeve surfaces and a trigger-finger morph between two geometries. “Stacks of primitives” misses the custom silhouette work.

`original.html:6052`, `dm` builds separate meshes for material batches, bolt, magazine, round, markings, optic, muzzle flash, hands and finger. It is not a single mesh. `weapon.info.tris` is computed from weapon parts **plus hands, markings and an optic contribution**; do not label that aggregate as a rifle-only count. The exact screenshot number 53,136 was not reproduced here. `__G.weapon.info` can expose current runtime tris/mesh count.

`original.html:6052`, `iu`, `pm`, `Z_`, `j_`: each procedural enemy part is bound to one named bone (one nonzero weight), merged into material slots, then bound as a SkinnedMesh. Hound has 8 named body/head/turret/antenna/beacon bones plus 3 per leg = 20. Gull has body/root, 4 rotor bones, gimbal/ball/lamp/gun and 3 strobes = 13; a second transparent mesh shares its skeleton for rotor discs and light cone. This is an economical rigid mechanical rig, not a soft character-skinning pipeline.

`q_` implements analytic leg IK with reach clamps; Hound stance/gait stores foot world positions and emits `enemy:step` on planted feet. Model design, rig, motion and sound are deliberately coupled. Read geometry close-up and in silhouette before adding fine bolts.

### First-person feel is a stack of coordinated responses

`original.html:5926`, player tuning `Mt` / `x_`: walk/sprint/ADS/crouch speeds, ground/air acceleration, jump apex, 0.12 s coyote time, 0.13 s jump buffer, stance headroom checks, stride-distance footsteps, landing dip/shake, FOV/look scaling, health feedback and regeneration. Capsule motion is provided by `physics.moveCapsule` (`5440`). Footsteps are distance-driven rather than timed independently of movement.

`original.html:6052`, `dm`, `ma`, `Be`, `Xe`: camera recoil and model recoil are separate; damped springs are substepped for long frames. ADS, sprint, idle breath, stride bob, landing impulse, muzzle flash/light, heat/smoke, shell ejection and recoil bloom all derive from shared action state. A firing event also drives sound and enemy hearing. The hitscan ray starts from camera/player eye; tracer starts at viewmodel muzzle, whose transform corrects for separate world/viewmodel FOV. This FOV/aim-space agreement is an important contract.

Reloads have named phase events (`start`, `magout`, `magin`, `bolt`, `done`), distinct tactical/empty durations (2.1/2.72 s) and authored hand poses. Ammo transfers at `magin`; reload sound follows events, not an unrelated timer. Inspection is a quiet idle behavior rather than a gameplay prerequisite. These are source facts, not a claim they feel good without playtesting.

### Enemy AI is bounded, legible combat choreography

`original.html:6052`, tune `Ui`: pools of 10 Gulls/8 Hounds, max 5 wrecks, max 32 bolts; patrol/investigate/engage/search modes; hearing radius, LOS, sight cone, sight memory, exposure accumulation. `original.html:6074`, `requestToken`: at most 2 attackers normally / 3 when crowded; 1.25 s token gap and bias against starving the opposite enemy type. Individual attack windups/telegraphs precede projectiles or a Hound lunge. This is a concrete way to make growing waves readable without making every actor shoot simultaneously.

`original.html:5440`, `d3`: a 0.5 m navigation grid, walkability, route search and straight-line route simplification. Hound (`6052`) replans, samples firing positions, accounts for other Hounds, checks LOS, and uses stuck handling. **This nav abstraction is primarily a ground-plane system.** Adding catwalks/stairs/multiple floors in a remix requires explicit navigation/playtesting; rendering new walkable-looking geometry does not make it navigable.

### Shared environment truth connects sensory effects

`original.html:5926`, player helper `j`, sound `player:step` subscriber, FX `player:step` subscriber all query `ground.isPuddle(x,z)` or consume surface-tagged events. Bullet impacts can be reclassified as water near the apron. Same world data drives visible splash and footstep choice. Interior boxes affect audio (`5926`) and weapon wetness (`6180`). Prefer one surface/zone authority over separate noise masks and duplicated definitions.

### Small scope includes a full end-to-end loop

`original.html:6180`, `Yi`, `mM`: title/intro/playing/paused/dead/complete states, three relays with hold interaction, cancellation/decay, three increasing wave compositions, maxAlive 9, staggered spawns biased toward distance/occlusion, extraction gated on all relays, pursuit, death/retry/redeploy, debrief. `debugCut` is a test convenience, not proof a player can reach/interact with a relay normally. Source implementation supports a focused vertical slice; it does not establish full AAA production scope.

Input (`5926`) supports pointer lock plus a drag/edge-turn fallback, keyboard look, touch, gamepad, action ownership across devices and focus/visibility resets. Menus (`6180`) handle settings, focus restoration, keyboard tabs, ARIA state and pause. For a skill, retain explicit target-device testing rather than treating the presence of controls as tested support.

## High-value test seams already present

All at `original.html:6180` unless indicated:

- Showcase registry: `mats`, `level`, `backdrop`, `ground`, `fx`, `weapon`, `enemies`, `props`, `render`. Each subsystem can boot against stubs.
- `window.__G`, `__ready`, `__fatal`, `__errors`, `__frames`, `__stats`, `__setShot({cam,fov,exposure})` enable external inspection. `__ready` is set after two frames, so it does **not** mean every optional subsystem succeeded or that the scene is converged.
- Optional module boot failures can log an error and fall back to a stub. Loop failures log only once. A success gate must check required modules and errors in addition to readiness; never count a working fallback as the requested visual system passing.
- `?seed=...`, `?dt=...`, `?shot=...`, `?cam=...`, `?show=...` aid captures. Seed alone does not make the whole simulation deterministic because several runtime paths use `Math.random`; fixed `dt` alone does not define screenshot frame/time.
- `?bench=1` disables audio, autostarts and moves a camera on a 30-second route. It reports frame median/p99/mean and renderer information. It is not a full interactive-combat-plus-audio benchmark.
- Weapon showcase (`6052`) has side/right/top/hands/muzzle/optic/lower viewpoints, hip/ADS/sprint/fire/reload/empty poses, reload-time snapshots and freeze. This enables visual checks of the exact action states players see.
- Enemy debug (`6074`) exposes pooled actors, wrecks, bolts and triangle counts. Isolated inspection helps distinguish model defects from scene lighting defects.
- `audio.selfTest({seconds:10,interior:false})` and `interior:true` (`5926`) await buffers, run a scripted combat scene in OfflineAudioContext and return peak/over/nan/RMS buckets/voice debug. A strong numerical test seam, but it neither listens nor proves spatial mix or subjective sound quality.

## Reusable skill decisions supported by this audit

1. Establish meter scale, coordinate conventions, camera/viewmodel spaces, shared surface queries, event payloads, lifecycle/ownership and budget contracts before parallel specialist work. Agent-owned CSS comment at line 6 and coherent subsystem interfaces support modular integration, not a reconstruction of the historical transcript.
2. Keep one complete, playable loop while specialists improve one art/feel system at a time. Couple each action's gameplay state, animation, sound and FX through one event/state source.
3. Author procedural assets for their material/animation behavior: bevels for highlight readability, real profile variation for silhouettes, material batching for draw calls, mechanical rigs for rigid actors. Choose procedural generation where its repeated structures suit the subject; do not force it on every genre.
4. Build isolated material/model/animation/audio views and stable scene viewpoints alongside the systems. Give an independent reviewer actual captures and the intended visual goals; don't tell it the desired score.
5. Test normal input completion separately from debug-driven state checks. Cover occlusion, navigation, relapse/retry/reset, interrupted action, pointer-lock refusal and target-device input.
6. Measure startup synthesis, shader readiness, GPU memory/draw cost, sustained combat, p99 stalls and sound voices. Report audio-disabled flythrough separately from representative gameplay.
7. Gate completion on required modules working, healthy error logs, visible result review, complete gameplay and measured performance. Numerical tests, screenshots and human play/listening answer different questions.
