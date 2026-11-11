# Gameplay, motion and audio coherence

Use this reference when implementing or reviewing interaction feel, enemies, animated actors or sound. Adapt the techniques to the chosen engine, genre and asset strategy. Procedural geometry and sample synthesis are options, not prerequisites for fidelity.

## Prove a complete playable loop

- Describe the shortest satisfying run: enter, learn the action, face resistance, make progress, reach an outcome, retry or exit. Keep that route playable while art systems evolve.
- Define transitions and their owners. For each action, identify what starts it, what commits its gameplay effect, what cancels it and what reset must restore.
- Keep collision, damage, objective progress and inventory authoritative in gameplay state. Animation presents that state; a missing visual effect must not secretly change the rules.
- Exercise completion using normal inputs. Teleportation, invulnerability and forced objective completion are useful subsystem probes, but do not establish that the route is reachable or fair.
- Test interruption where the game allows it: pause during an action, lose input focus, die during progress, retry after failure and restart after success. Check for stale timers, held inputs, voices and pooled actors.
- Select input support from the actual target devices. Where pointer capture is required, test refusal, release and reacquisition; controls existing in source is not evidence that they work on hardware.

## Control and animation under variable frame time

- Separate input intent, simulation state and rendered pose. Sample input consistently; apply each input edge once even when the simulation advances through multiple substeps.
- Express speeds and rates in time units. For smoothing toward a target, use a time-aware factor such as `1 - exp(-rate * dt)` instead of a constant per-frame blend.
- Integrate springs and collision with a suitable fixed step or bounded substeps. Cap catch-up work deliberately and specify what happens after a long stall; clamping delta time alone silently slows the simulation.
- Verify at low, target and high frame rates. Compare travel distance, jump height, action duration, fire cadence, recoil settling and collision outcomes rather than only checking average FPS.
- Derive footsteps from distance and contact state, not an independent timer. Suppress them in the air; connect landing impulse to actual descent/contact.
- Use coyote time or input buffering when they improve the intended control style. Treat their durations as tuning choices, not mandatory features for every game.
- Layer motion with clear ownership: locomotion, aim, action, recoil, landing and secondary motion. Define precedence and blend weights so two layers do not fight over a transform.
- Keep camera motion and model motion separately tunable. Test target readability during fast movement, recoil and damage; motion reduction should preserve the information the player needs.

For a first-person viewmodel, define world-camera and viewmodel-camera spaces explicitly. Aiming, hit tests, muzzle position, tracer start and shell ejection must agree after FOV changes. A camera-origin hitscan with a muzzle-origin tracer needs close-wall and muzzle-occlusion tests; apparent precision at long range does not establish correct behavior near cover.

## One action, synchronized responses

Use shared action state or semantic events to drive animation, sound, particles, lighting and UI. Specify payload meaning and coordinate spaces before assigning subsystems to different agents.

| Event or state | Useful contract | Failure to check |
| --- | --- | --- |
| Action committed | Actor, action ID, simulation time, origin/direction or target | Effect fires before the gameplay action, or twice during catch-up |
| Named action phase | Action ID, phase, phase time, relevant variant | Audio and animation use unrelated timers |
| Surface contact | Position, normal, surface, contact strength | Footstep sound disagrees with the visible surface |
| Damage/impact | Target, amount, point, normal, source | Camera shake, hit marker and damage refer to different hits |
| State transition | Previous state, next state, cause | Pause/retry leaves active effects or repeats a one-shot cue |

Choose the commit point deliberately. A reload might transfer ammunition when the magazine seats; another game may commit on completion. Interrupted actions must respect that choice. Avoid replaying earlier one-shot events when seeking an animation for inspection.

Build inspectable poses or animation-time snapshots for important actions. Review contact, silhouettes, clipping and timing at the action's critical phases, then inspect motion continuously. A good still frame does not prove a good transition.

## Enemy pressure and navigation

- Give threats readable anticipation, attack and recovery. Visual and audible telegraphs should convey the same impending action and give the intended reaction window.
- Budget simultaneous pressure as well as enemy count. Attack tokens, cooldowns, burst limits or role scheduling can keep several visible actors from attacking at once.
- Ensure scheduling cannot starve a role indefinitely. Release reservations on death, loss of target, cancellation and pooling reset.
- Separate detection, memory, investigation and engagement where the design benefits. Bound sensing frequency and use distance/visibility filters before expensive queries.
- Make spawning constraints explicit: valid surface, usable route, minimum distance, exposure to the player and capacity. A delayed spawn is preferable to placing an actor inside collision.
- Preserve behavior under limits. When a pool fills, decide whether to defer a spawn, retire an inactive object or reject it; never silently reuse a live actor with stale state.
- Test navigation after every meaningful layout change. A visually accessible staircase, doorway or catwalk is not necessarily traversable by the collision and navigation representations.
- Check agent clearance, step height, slopes, overhead space and turning radius. Multi-floor layouts need navigation that distinguishes vertically overlapping surfaces; a ground-plane grid cannot supply that distinction by appearance alone.
- Verify routes from every spawn to relevant encounter areas, and from the player start to objectives and the exit. Include narrow passages, dynamic blockers, stuck recovery and moving targets.
- A route found by the planner is only part of the check: run the actual controller along it, including transitions between navigation surfaces.

## Mechanical rigs and procedural actors

Rigid mechanical actors can bind each part to a single named bone and merge compatible geometry into material batches. This often suits rotors, turrets and articulated limbs; deforming characters may need weighted skinning and authored assets instead.

- Establish local axes, joint pivots, parent relationships and rest pose before decorating the model. Build the silhouette and articulation envelope first.
- Merge parts only when material, visibility, animation and lifetime remain compatible. A moving magazine or transparent rotor surface may need a separate batch.
- Validate geometry attributes and index conventions before merging. Recompute or preserve bounds that include animation extremes so parts do not disappear under culling.
- For planted feet, keep contact targets in world space and solve the leg toward them. Clamp reachable distances and bend direction; check slopes, stepping, turning and unreachable targets.
- Tie contact sounds and dust/splashes to the contact event. Avoid presenting a planted foot while its sound cadence continues independently.
- Inspect rest pose, movement extremes, attack, damage and death. Reset all transforms and transient state when an actor returns to a pool.

## Sound strategy and generation

Choose recorded, synthesized or hybrid audio according to the sound and project constraints. Procedural synthesis is particularly useful for repeatable machine tones, impacts and stylized effects; it does not guarantee convincing voices, music or complex natural sound.

For sample synthesis, think in perceptual layers: a transient establishes contact, a low body supplies weight, resonant partials identify material, and a tail locates the event in space. Design each layer's frequency range, envelope and delay before combining them. Apply gain staging and distortion intentionally rather than normalizing every layer to maximum amplitude.

- Give variants a shared identity with bounded changes to pitch, envelope, spectral balance and timing. A deterministic seed makes generation reproducible; random playback selection is a separate concern.
- Avoid clicks with appropriate onset/ending envelopes; build and inspect seamless loops. Check sample rate, channel layout, finite samples, DC offset and peak headroom.
- Count sound types, variants, music stems and impulse responses separately. A registry of names and a cache of generated buffers answer different inventory questions.
- Measure synthesis time and memory. Generate critical interaction sounds first, and time-slice, cache or move costly work off the main thread when startup or frame pacing requires it.
- Never drop the first critical action merely because its sound is not ready. Define readiness, prioritization or an acceptable fallback for that case.

## Playback, environment and mix

- Route meaningful buses such as near-player, world, ambience, music and UI. Keep independent volume control where useful; reserve mix headroom for peak gameplay.
- Limit concurrent voices by both category and priority. Protect critical warnings and action feedback; deprioritize distant, masked or repeated detail before increasing the global cap.
- Pool or reuse playback infrastructure when appropriate, but stop and disconnect expired sources. Bound persistent loops and update only nearby audible emitters.
- Smooth gain, pitch, filter and environment changes to avoid discontinuities. Synchronize music stems on a common clock; crossfade intensity from gameplay state rather than restarting music on every event.
- Use one world-space surface/zone authority for visuals, collision meaning and sound selection. If puddles derive from a height mask, footsteps and impacts must sample the matching transform and threshold.
- Keep interior/exterior zones consistent across ambience, reverberation and weather exposure. Check boundaries and vertically stacked areas; an XZ-only zone test can misclassify a roof or upper floor.
- Validate spatial cues with the real listener orientation and source positions. Use expensive spatialization selectively and test mono/stereo or other supported output modes.
- Respect browser/device audio activation and visibility rules. Test mute, volume changes, suspend/resume, focus loss and replay without accumulating sound sources.

## Evidence required for completion

Automated offline rendering can detect nonfinite samples, clipping, unexpected silence, duration/loop defects and excessive voices. Include representative quiet, action-heavy and environment-transition sequences; record peaks, RMS or loudness measures and resource counts. These checks do not assess convincing timbre, intelligibility, localization or a fatiguing mix.

Listen to the important sounds individually and in representative gameplay when playback is available. Review motion and normal-input play separately from debug state tests. State which checks ran and which remain unverified. An audio-disabled flythrough, a numerical mix test and a complete interactive session are different pieces of evidence.
