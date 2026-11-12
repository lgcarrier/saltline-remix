# Italy migration review

The supplied `cs_italy.bsp` layout is playable as an additional Saltline mission. The final v10 build passed continuous keyboard/mouse play from CT through the north stairs, three crate jumps and crouched upper-house window, then C → B → A → extraction and Redeploy. This passed both with Chrome Energy Saver enabled and disabled.

**The requested photorealistic AAA visual target remains unmet.** The [final independent visual review](ITALY-VISUAL-CRITIQUE-4.md) confirms improved window depth, coherent plaster, house/passage construction, market lighting and interior joints, with the observed rendering regressions resolved. Repetition, flat stone corners and sparse construction/furnishing still limit the result. A playable migration does not establish AAA visual quality.

## Final build

- `italy.html`: 54,471,285 bytes; SHA-256 `ea8b6f1f0aaf06e1fef494c3cf8cb4c8ec5cba2de3e0773973a0f867defa0e15`.
- Run `npm start`, then open `http://127.0.0.1:8767/italy.html`. The standalone file also launches directly. Assault, Dust and the untouched Saltline original retain separate entry points.
- `npm run build:italy` rebuilds from the preserved archive, readable modules and local assets. No publication is claimed.

## Source and authored work

The [source review](ITALY-SOURCE-REVIEW.md) accounts for all 102 GoldSrc brush models, native spawn/hostage/rescue metadata, 19,278 static visible triangles plus the radio, and 20,908 static plus 68 breakable collision triangles. Scale is 0.0254 m per native unit, `(X,Y,Z)` → `(X,Z,-Y)`. Source BSP SHA-256: `2a5a16044d69481a9fb3c623407fb0ba9d6b8863f30db35451992d2879c1ca9d`. Illusionary brushes remain nonsolid, triggers remain metadata, and hidden collision proxies stay hidden. This BSP has no moving doors or ladders.

Render substitutions preserve source collision and playable openings. Thin sewn canvas replaces 42 market fabric faces within the source footprint/profile. There are 101 closed window recesses, 404 reveals and matching opaque backs; incomplete windows and native moulding artwork survive the plaster partitions. House coping, corner stones, framed motifs and passage masonry follow the source structure. The final scene reports 23,808 source-render triangles, 201,452 dressing triangles, 13,104 interior-trim triangles and 36,756 distant-backdrop triangles. These are construction counts, not per-frame GPU measurements.

The [final geometry audit](../output/playwright/italy/final-geometry-audit.json) verifies area conservation, partial artwork, interpolated attributes, unchanged collision and native apertures. It also checks the roof-eave lighting correction: exterior façades remain exterior while sampled rooms remain interior. The [interior audit](../output/playwright/italy/final-interior-audit.json) verifies 437 closed profiles with positive winding/volume, supported wall edges, bounded 24 mm projection and no crouch-window intrusion. Original collision still owns bullet impacts, so an impact on recessed glass may appear up to 18 cm ahead of its visual back plane.

[Asset provenance](ITALY-ASSETS.md) distinguishes 80 supplied charts, generated Italy surfaces/remasters, six recreated missing WAD textures, inferred PBR relief and the CC0 photographic HDR environment. Saltline supplies the arsenal, robots, asset constructors, renderer, effects and synthesized audio; Assault and Dust supply shared integration/extraction conventions. Material texture sharing saves 7.5 MiB. The estimated Italy materials + HDR + PMREM total is about 158.4 MiB, excluding shared assets and render targets.

## Verification

| Check | Result and evidence | Scope |
| --- | --- | --- |
| Build / controller | `npm run build:italy`, `npm test` and `git diff --check` pass. The test suite has 51 passing grouped checks plus prewarm scenarios. | Includes source floors/routes, all native spawn routes, low-clearance constraints, jumping, airborne ducking and the observed accelerating diagonal-stair regression. |
| Complete mission | Final [continuous traversal](../output/playwright/italy/traversal-mission.json) passes CT → native window → C/B/A → extraction, then real Redeploy. The uncapped run finished with health 100, seven kills and 18 hits from 18 shots; no runtime errors. | Telemetry selects routes/aim; gameplay uses real keys/mouse, without teleport, forced hits, health or objective writes. Invulnerability is off during play; the engine enables it after completion. |
| Jump / crouch | All ten [native movement stages](../output/playwright/italy/native-movement.json) pass, including both C/Ctrl bindings, three crate landings, sprint duck-jump, blocked standing under the lintel and standing inside at Y=3.2512. | Supported drag-mouse fallback was active. Standing-jump negative control and apartment-perch access also have controller-simulation evidence. No human/mobile/controller playtest is claimed. |
| Failure / restart | Earlier preserved [v4 failure/Retry](../output/playwright/italy/v4-input-mission.json) and v5 failure evidence validate natural death and Retry. Final v10 validates Redeploy resets health, ammunition, objectives and counters. | Older evidence remains labeled by build; no new final-build death test is claimed. |
| Delivery / audio | [Standalone check](../output/playwright/italy/delivery.json) records file launch, early-extraction prevention, fire/reload, jump/crouch, pause/resume, all four map links and two offline audio mix checks. | Audio numerics are separate from audible listening, which is not signed off. UI fonts still request Google Fonts; gameplay assets are embedded. |
| Visuals | [V10 fixed captures](../output/playwright/italy/v10-captures.json): five source-floor-validated views, 1600×900, high, FOV 74, exposure 1, seed 4207; no shader/resource errors. | Staged paused views. Independent review does not establish photorealistic AAA fidelity. |

## Performance conditions

The final [60-second live traversal/combat sample](../output/playwright/italy/frame-report.json) uses Chrome 157 / ANGLE Metal Apple M1 Max, fixed high quality, 1600×900 at DPR 1, MSAA 4, 4096 shadows and live 48 kHz audio. No video or checkpoint screenshots were recorded during sampling. Scale stayed 1, sampled game states stayed playing, and no required module stubs or runtime errors were reported.

With Energy Saver disabled, after a two-second warmup: **119.93 FPS average**, mean 8.338 ms, p50 8.3 ms, p95 9.7 ms, p99 10.2 ms, maximum 33.4 ms. One of 6,956 measured intervals exceeded 16.67 ms (0.01%). The same artifact's [Energy Saver sample](../output/playwright/italy/v10-capped-frame-report.json) delivered 30 FPS, mean 33.333 ms. Both complete mission runs passed.

The isolated QA profile had Energy Saver enabled at the low-battery threshold. Disabling only that test-profile setting restored the higher frame rate; it was restored afterward, as recorded in [power-profile evidence](../output/playwright/italy/power-profile.json). Chrome documents that [Energy Saver reduces display refresh rate](https://developer.chrome.com/blog/memory-and-energy-saver-mode). These are hardware/settings-specific observations, not minimum-device certification.

## Controls and remaining scope

WASD moves, mouse looks, Shift sprints, Space jumps, C or Ctrl crouches, R reloads and E disables an uplink. For the upper-house shortcut, jump up the crate staircase, sprint-jump toward the west window and crouch in the air. Releasing crouch under the low opening does not force standing; the player can stand once inside. Native sill and opening dimensions are retained.

This is a Saltline mission on the migrated Italy layout. Counter-Strike team rounds, buying, networking and hostage-follow/rescue AI are absent. Four hostage positions and the rescue region remain metadata. Original NPC models and referenced opera/guitar/sheep/chicken WAV files were absent from the archive; new chicken/bottle geometry and shared Saltline audio do not claim original-media parity.

Earlier v3–v9 captures, failed attempts and audits remain versioned. The old `italy-native-route.webm` records a failed v5 staircase attempt, not final acceptance. Final acceptance is tied to the v10 hash above and [build record](../output/playwright/italy/build.json).
