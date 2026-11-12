# Saltline · Dust verification

The full supplied Dust layout is migrated into an additional Saltline game. This record separates source verification, simulated controller tests, real browser controls, visual assessment and performance. The photorealistic AAA acceptance target has **not** been established.

## Delivery

- Run `npm start`; open `http://127.0.0.1:8767/dust.html`, or use the map links on the Assault title screen.
- `npm run build` rebuilds Assault and Dust. `npm run build:dust` rebuilds Dust alone. `npm test` runs the existing Assault physics/ladder/resource-warmup checks and the nine new Dust source/controller checks.
- `original.html` was hash-compared with its Git HEAD version and remains unchanged. Assault gameplay source is unchanged; its generated title screen now links to Dust and the original game.
- Direct `file://` launch passed with embedded geometry, generated textures and engine assets. The only external requests were the original Google Fonts stylesheet/font files; this is not a claim of fully offline typography. The three map links and an actual Assault → Dust navigation passed. The final delivered hash was separately reopened directly from disk with warmup complete and no errors; see [verified-file.json](../output/playwright/dust/verified-file.json).
- Dust is Saltline single-player gameplay on the original Dust layout. It does not implement Counter-Strike multiplayer, teams, economy or planting/defusing rules.
- Publication is tracked separately in [DUST-DEPLOYMENT.md](DUST-DEPLOYMENT.md); the gameplay and rendering evidence here records the tested build before hosting.

## Source and simulation

All 48 models and 5,550 BSP faces are accounted for. Rendered source geometry is 10,404 triangles; solid collision is 12,958 triangles including invisible sky boundaries and native crate cover. All 32 starts, both sites, source lights, UVs and trigger metadata are retained. The source hash and exact accounting are in [DUST-SOURCE-REVIEW.md](DUST-SOURCE-REVIEW.md).

Nine source checks pass. Six routes through the actual capsule solver cover both starts, both sites and the underpass objective. Additional extraction checks cover the full ring and return paths. These use explicit simulation velocity, not browser input. Runtime readiness separately verifies all three objective paths, eleven ground spawn positions and five exterior drone spawn positions.

## Browser gameplay

Recorded in isolated Chrome 157 on Apple M1 Max at 1600×900, DPR 1, fixed high quality, seed 4207. The driver reads navigation/enemy telemetry and sends actual keyboard/mouse input. It never changes position, health, ammunition or objective state. Pause between test stages prevents unobserved combat while checking results.

The first attempt reached and disabled C and B, fired/reloaded and destroyed four robots, then ran out of ammunition and died before A. That failed attempt is preserved as `normal-input-attempt1.json`; it is not a successful complete-loop test. The Retry button reset all relays, health, ammunition and position, confirmed in `retry.json`. A revised driver uses controlled aimed fire and body hit volumes rather than distant sensor points.

The second run **completed the mission** in 117.25 simulated gameplay seconds: A → B → C → extraction, 22 shots, 22 hits, five robots destroyed, health 100. Every objective and extraction was reached through browser keyboard/mouse controls. Telemetry-assisted aiming reads actual hit volumes, so this is functional verification rather than a human difficulty assessment. The game sets invulnerability itself after successful extraction; it was false throughout active play. See [normal-input-mission.json](../output/playwright/dust/normal-input-mission.json).

The successful run used build SHA-256 `808de0be78478c64ed92410170f2beb71633378e41d1cff4c40ed2c29be259b5`. Later changes affect material contact fields, decorative architecture, the distant environment and ambient-occlusion tuning; objective, collision, enemy and input logic remain identical. Redeploy restored all three relays, 100 health, 30/150 ammunition and the original start without stale combat state; see `redeploy.json`.

The standalone-file check separately reached the extraction ring before cutting any relays and confirmed the mission did not complete. It fired and reloaded (29/150 → 30/149), jumped 0.94 m above the sampled floor, crouched and stood, then paused with zero player displacement under movement input and resumed. See [delivery.json](../output/playwright/dust/delivery.json); this control check used the subsequent `f89fb078…` material build and reported no console or runtime errors.

[The silent 32-second gameplay excerpt](../output/playwright/dust/gameplay-motion.mp4) comes from the successful browser run. It contains normal movement/combat, not a staged camera flight, and predates the final scenery/AO polish. Raw recording is retained locally under the ignored `automated-video/` directory.

## Visual evidence

Five staged, paused camera views of the delivered build are in [verified-captures.json](../output/playwright/dust/verified-captures.json): T approach, underpass, central tunnel, B and A. Each uses FOV 74, 1600×900 actual drawing buffer, high quality, 4096-pixel directional shadows, four-sample MSAA, fixed render scale 1 and manual exposure multiplier 1. The renderer's automatic exposure remains active; the capture waits one second per view. Presentation time and unseeded cosmetic sources are not fully frozen. Weapon/HUD are hidden for these environment views; normal gameplay screenshots and video are separate.

Delivered HTML SHA-256: `51771948991e36bbffad514db2405da1d62c245581021bc28f50abcc88800cc7` (16,237,609 bytes). This capture reached the ready title in 5.450 seconds, including generation and warmup on the test machine. GPU warmup took 164.8 ms, restored its state and performed zero gameplay updates. This is one warm-browser launch observation, not a cold-download benchmark.

The first view set exposed cold cloudy roads, repeated masonry and plain crates. Two generated albedos, physical crate frames, facade matching and warm tunnel bounce address those observed gaps. Later passes soften road/sand joins and add supported wall-foot weathering. Source-derived construction adds 278 chamfered coping stones, 30 broken plaster/masonry regions and 86 supported fragments (17,720 added triangles). The distant environment adds 19 buildings, two slender towers and three limestone masses (19,226 triangles in six batches). All backdrop vertices stay outside the source's bounding rectangle expanded by 8 m. A rejected smooth, oversized ridge iteration is preserved in the `architecture-` frames; the delivered revision restores the native skyline's prominence.

Verified captures have no startup/runtime/shader errors. Generated material construction took 1.490 seconds. Texture accounting estimates about 157.3 MiB for the new texture sets and contact fields including mipmaps; this is not total game or peak memory.

A controlled same-camera comparison identified the broad tunnel bands as excessive screen-space ambient occlusion. The delivered radius/intensity/strength are .28/.65/.50, reducing the dark wedge while retaining local contact. The original, restrained and disabled comparisons are preserved as `ao-*.png`; automatic exposure remains a comparison limit.

See [DUST-VISUAL-REVIEW.md](DUST-VISUAL-REVIEW.md) for independent final image findings. Faithful old BSP silhouettes, shallow surface relief and repetitive construction remain material limits; images do not prove photorealistic AAA parity.

## Audio

The live AudioContext ran at 48 kHz with all 93 synthesized buffers ready. Two ten-second numerical mixes exercised exterior and interior action. Peaks were .829 and .824, with zero clipped and zero nonfinite samples. See [audio-numerical.json](../output/playwright/dust/audio-numerical.json). Dust suppresses rain, sea and harbor calls and retains dry wind, weapon, machine, movement, music and interaction audio. These are numerical checks, not subjective listening. Browser video does not include audio.

## Performance and coverage

The delivered hash was sampled in isolated Headless Chrome 157 using the Apple M1 Max Metal backend, DPR 1, **1920 × 1080 actual drawing buffer**, fixed high quality, MSAA 4, 4096 shadows, AO/bloom/motion blur enabled and no video recording. The live 48 kHz audio mix and enemies remained active. Normal keyboard/mouse traversal, aiming and combat reached and disabled relay A. All recorded quality-history states were `playing`; scale remained 1 and no module stubs or runtime errors were present.

| Measurement | Result |
| --- | --- |
| Requested wall-clock sample | 30 seconds |
| Warmup discarded / retained | 2.005 s / 27.999 s |
| Delivered average | 60.0 FPS |
| Frame p50 / p95 / p99 | 16.7 / 16.7 / 16.8 ms |
| Maximum retained frame | 16.8 ms |
| Frames over 33.34 ms | 0 |

See [raw final sample](../output/playwright/dust/performance-verified.json) and [frame summary](../output/playwright/dust/performance-verified-summary.json). The earlier 1600 × 900 sample also delivered 60 FPS; its older material-build hash is recorded in `performance-baseline.json`. Browser timestamp rounding puts many 16.7 ms intervals just above the nominal 16.67 ms budget; that counter is retained rather than interpreted as dropped 60 Hz frames. These measurements cover a short automated traversal, not maximum GPU throughput, all encounters, long-session thermal behavior or other hardware.

One sampler attempt remained paused because the harness did not use the Resume button; `performance-paused-attempt.json` is retained and excluded from gameplay performance results. The harness now waits for pause completion, clicks Resume and checks successful traversal.

The final full rebuild reproduced the delivered HTML hash. `npm test`, source syntax checks and `git diff --check` passed. Fixed-quality performance sampling is separate from still screenshots and controller simulation. Human playtesting, subjective audio, gamepad, touch, Safari and Firefox coverage remain unverified. The original material/prop/weapon/enemy constructors stay bundled; original harbor structures are not placed across Dust's routes.
