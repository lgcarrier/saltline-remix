# Assault remake — review record

Date: 2026-11-10. Scope: the supplied CS 1.6 Assault map reconstructed inside Saltline's desktop WebGL2 single-player FPS.

## Result and quality gate

The remake is playable and its complete mission loop has been exercised through keyboard controls. **The requested photorealistic AAA visual gate is not met.** Three independent image reviews drove successive corrections, but the final result remains a procedural remaster. Broad source building silhouettes, insufficient architectural detail at medium scale, repeated surface patterns, the dark upper warehouse, and simplified vehicle construction remain visible gaps. A polished relay alcove does not establish a fully dressed office environment.

The supplied BSP provides the warehouse, loading platform, two ramps, operations office, roof, vents, surrounding streets, and truck. The complete original Saltline material/prop/weapon/enemy/effects/audio library is retained in the bundle; selected original props dress the new environment. Its three-uplink mission and robot opponents remain the gameplay loop.

## Implemented and corrected

- Re-extracted the BSP with hard face normals, physical-scale UVs, source light samples, and correct entity origins. Preserved 93 models, 6,343 static render triangles, 5,867 static collision triangles, three doors, twelve breakables and eight ladders.
- Replaced flat navigation and draft collision with a spatial triangle index, capsule corner/ceiling tests, step/ramp support, and separate navigation layers. Added component rejection and path caching.
- Made doors animate and clear their collision, made glass/grilles destructible, and restored them on mission restart.
- Added a ladder grip with collision-tested ascent, roof-edge mounting, descent, crouch clearance, lateral/jump release, and idle holding. Actual keyboard tests found two edge cases that simulations alone had missed; both now have regressions.
- Relocated the roof uplink onto a supported roof surface and corrected the A/B/C labels on the original relay assets. Interaction now checks line of sight.
- Added architectural trim, windows, ladder rods, trusses, fixtures, signs, services, original industrial props, and a geometry finish for the source truck. Its original destructible surveillance dish remains intact.
- Restored the original wet asphalt/reflection/rain system on actual exterior pavement, with shared shelter/puddle masks. Indoor reflections skip correctly.
- Reduced excessive wall-weathering contrast and corner AO; corrected fixture lighting and removed the original harbor backdrop's floating lights.

## Gameplay evidence

`output/playwright/assault/gameplay-result.json` and `qa-route.json` record the complete mission. `qa-extraction.png` shows the debrief.

| Check | Observation |
| --- | --- |
| Deploy, side alley and door | Passed with actual UI and keyboard input |
| Uplink A | Reached and disabled with held E |
| Loading-platform jump | Passed with Space and forward movement |
| Both ramps and office doors | Passed at their distinct elevations |
| Uplink B | Reached and disabled with held E |
| Rear ladder and crouched vent | Passed through actual movement/crouch controls |
| Roof ladder and uplink C | Passed; C disabled with held E |
| Both ladders descending | Passed after fixing edge mounting and off-axis alignment |
| Return ramps, alley and extraction | Passed; game entered `complete` with all three cut |
| Damage and regeneration | Observed during the normal route |
| Pause/resume | Used at checkpoints through actual controls |
| Death transition | Observed on an earlier unassisted attempt (`qa-failure.png`) |
| Redeploy/reset | Checked separately through actual UI |

The complete run used no teleports, health overrides, enemy clearing, forced objectives, or invulnerability overrides. The original completion handler enables invulnerability **after** extraction; the final `invulnerable: true` state is a success transition, not a test aid. The route driver stops when completion triggers inside the extraction radius, before its remaining center-point waypoints, so the saved final driver result says `reason: complete`.

Focused diagnostics are labeled separately in `mechanics-staged.json`, `glass-combat-staged.json`, and `enemy-combat-staged.json`. These stage the **player position**, then use real firing/reload/aim keys. They observed truck windshield destruction, magazine reload, three enemy hits and one kill, and rejection of premature extraction. No valid close obstructed relay pose was found for a separate runtime occlusion test; the line-of-sight patch and raycast tests were inspected, but that specific interaction gate remains unobserved. The front-facade glass test struck an intervening solid source wall; the separate unobstructed truck-glass test passed.

Ground enemies remain on their connected walking surfaces; they do not perform the player's loading-platform jump or climb ladders. Flying enemies provide elevated pursuit. Navigation tests explicitly distinguish this from a missing walking route.

## Rendering and performance

`performance-final.json` and `performance-report.json` contain the raw frame intervals and summary. Conditions:

- Apple M1 Max, 64 GB RAM, arm64 macOS / Darwin 25.6.0.
- Chrome 157 headless, ANGLE Metal renderer.
- 1600×900 viewport and drawing buffer, DPR 1, fixed high quality, native scale 1, advanced renderer, soft shadows, 4× MSAA, 4096 shadow map, 1024 textures.
- 30 seconds of actual keyboard traversal with live enemies and unlocked audio; first 2 seconds discarded. No video recording during this sample.
- Delivered average **60.0 FPS**; p50 **16.7 ms**, p95 **16.8 ms**, p99 **16.8 ms** over 1,680 retained intervals. The 16.67 ms budget comparison is affected by browser timestamp rounding around 60 Hz.

This is a wall-clock browser frame-delivery sample, not a GPU timer or a guarantee for other hardware, browsers, viewports, or sustained peak combat. Art captures overlapped part of the run and the separate visible player window remained open. No adaptive-quality claim is made.

## Audio

The live AudioContext ran at 48 kHz with 93 generated buffers. Two ten-second offline sequences exercised exterior/interior footsteps, firing, impacts, enemy audio, explosions, reverb and music. Peak amplitudes were 0.811 and 0.817; both had zero clipped or non-finite samples (`audio-numerical.json`). These are numerical checks; the assistant did **not** perform subjective listening. The browser motion recording is silent and is not audio evidence.

## Visual comparison

Before/after images and settings are preserved under `output/playwright/assault/`:

- `v1-*`: initial integration.
- `v2-*`: wet-ground, architecture and fixture-lighting corrections; original port reference included.
- `v3-*`: quieter masonry, narrower AO, improved truck; manifests record actual source document SHA.
- Art captures are 1600×900, high/native scale, FOV 74, exposure 1, seed 4207, presentation time 18. Enemies/effects/UI/weapon were hidden and the camera staged for comparison. Residual unseeded cosmetics and exposure settling are documented in each manifest.
- `qa-*` and `gameplay-motion.webm` are separate gameplay evidence; fixed-camera art shots do not prove input, combat or performance.

The independent final review found improved concrete, office contact shading, and truck wheels/attachments. It still rejected photorealistic AAA parity with the supplied original-port comparison. No synthetic quality score was used.

## Build and delivery checks

`npm test` passes fifteen physics/navigation checks and twelve tests executing the actual ladder controller against actual map collision. The tests cover ray/wall/corner queries, ramps, jump/ceiling behavior, stacked floors, dynamic doors, caching, crouch, ladder ascent/descent and reset.

The build is deterministic, requires all integration modules, and the embedded JavaScript passes Node syntax checking. The final standalone `file://` launch passed, with 48 materials and 36 prop builders available, no fatal/runtime errors, and normal movement, crouch, jump, fire and reload recorded. Restart restored the broken windshield, zeroed objective progress and released the ladder grip. `original.html` has no Git diff. User source attachments are preserved under `reference/`; prose inside those attachments was not used as instructions. Stale draft geometry and fallback physics are no longer embedded.

Full normal-input mission and final v3 frames used document SHA `cde3bbb0c4756fda92945d98dc7953816d9158987b7d2665cd479a85d03a0d46`. The delivery bundle SHA is `5c8a6cd69bce7a0adca39e22bb50aa7af628d6db905864877c81a76c78e4cd09`; the subsequent changes only make the existing dressing call mandatory and correct inspection-only vantage coordinates. The final standalone file launch and short normal-input motion run are recorded in `delivery-check.json`.

Desktop mouse/keyboard and automated Chrome input were exercised. Touch, gamepad, physical mobile devices, Safari/Firefox, subjective audio, and prolonged combat balancing remain unverified. The game requests Google Fonts, with local font fallbacks; geometry, textures, models and sounds require no external downloads.
