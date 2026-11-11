# Assault V8 — hall containers and material refinement

V8 addresses the hybrid wood/container stack identified in the user's screenshot and refines the original Saltline materials. Photorealistic AAA quality remains the target, not an achieved claim.

## Hall stack

The assembly at `[12.192,0,-56.896]` to `[15.4432,9.3472,-50.3936]` now uses three original Saltline `container20` instances, with doors, locking bars, corner castings and corrugated panels. The grey, red and blue containers replace the entire wooden base and flat blue/red upper block. They use interior material variants and face the open aisle.

Twenty original faces (45 triangles) and six generated timber panels were removed. The adjacent separate wooden tower remains. The container assets are scaled to the historical BSP cover envelope; these are not exact ISO dimensions. All 5,867 source collision triangles and their insertion order are preserved. Matching cargo triangles now report metal for impacts and surface queries.

## Materials

- Structural steel uses quiet mill-scale variation and localized dull oxidation. Zinc has restrained broad bloom/runoff while retaining the original fine texture.
- Timber retains the original grain and knots, with individual board colour variation, mineral streaks and darker low contact areas.
- Puddles retain their original authored locations but now have warped shorelines and raised asphalt islands. The same modified depth mask drives shading, rain and footsteps. Static checks found no sheltered-water leaks or sampled CPU/texture depth mismatches; no extra runtime texture reads or reflection passes were added.
- Truck-specific original material variants separate painted steel, canvas, glass, rubber and hardware. Road dirt concentrates low around the wheels. Native truck surfaces are transferred into material batches without moving their vertices; glazing, seals and wipers add 438 triangles. Attached grille, headlamp lenses, bumper and panel seams add another 316 triangles. The truck has eleven batches, with its original collision and cover envelope.

## Validation conditions

Art captures are staged at 1600×900, DPR 1, High/native, FOV 74, seed 4207, presentation time 18 and exposure 1 with adaptation disabled. Actors, weapon and UI are hidden. Matched V7 reference images preserve the previous build; the new hall-stack camera directly shows the reported assembly. Cosmetic particles retain some nondeterminism.

Normal-input mission testing is separate. It keeps enemies, damage, original controls, automatic exposure and audio active. Timings cover playing intervals after a two-second warmup and exclude loading/title/pause states. They measure browser frame delivery, not GPU execution directly. Hardware: Apple M1 Max, 64 GiB; Chrome 157 headless, ANGLE Metal. Other agent browsers are closed; the user's visible Chrome remains untouched during tests. Caches may be warm from earlier inspection. No subjective audio listening was performed; the delivery movement video is silent and is not a benchmark.

All 15 physics/navigation checks, 12 actual-map ladder simulations and two resource-preparation restoration scenarios passed. These simulations are separate from the complete browser route.

## First integrated candidate

Candidate SHA256: `fc5e2bf2e206a7fe0e655ebee8e20f5bd51f8382e0cb61454c7bb077a5477dc4`.

Eleven matched captures compiled with no runtime errors. Actual browser puddle refinement took 56 ms during loading; standing-water mask coverage changed from 236.5 to 221.9 m². Resource preparation completed in 251.9 ms with restoration verified and no gameplay updates.

The first normal-input mission completed all three relays, both ladder ascents/descents and extraction. It measured 7,492 playing intervals over 124.8614 seconds at 60.0025 FPS, p95 16.7 ms, p99/max 16.8 ms. No measured interval exceeded 25 ms. Live damage and regeneration occurred; no position, health, objective or invulnerability overrides were used. The original completion handler enables invulnerability at extraction. Read-only collision probes against each of the three container layers hit the original x=12.192 cover plane and reported metal.

Evidence: `output/playwright/assault/v8-first-*`, `v8-tests/art-boot.json`, and `v8-tests/candidate/`. This candidate predates the final truck-front refinement and is not substituted for final-build testing.

## Final build and review

Final HTML SHA256: `5dc8a384cf898364ae76df0b572ebb710fe88d76e4514fde0b9c40565c9ee79c` (4,332,882 bytes). A separate rebuild matches byte-for-byte. The original Saltline HTML remains unchanged.

All eleven final art captures share this hash and have no runtime/shader errors. The independent critic confirmed the three-container replacement, stronger truck recognition and material separation, and less regular puddle boundaries without obvious halos. No major new geometry intersection or missing surface was visible.

Remaining limits are the truck's relatively uniform paint, modest timber-wear variation, some straight pale streaks on hall metal, and roof corrugation repetition. Native map silhouettes and scaled cargo dimensions remain constraints. The wider environment does not yet reach photorealistic AAA presentation.

The final full mission completed all objectives, both ladder climbs/descents and extraction, with three additional office laps. It measured 9,859 playing intervals across 164.3599 seconds: 59.984 FPS, p95 16.7 ms and p99 16.8 ms. Three 33.3 ms intervals clustered on the lower rear ramp during the return; these are retained rather than hidden by the average. Resource/program counts and recorded shadow-bake count were unchanged across that cluster, which does not establish a cause.

The office portion measured 52.0479 seconds at 60.002 FPS, maximum 16.8 ms. The dedicated three-lap subset measured 2,354 intervals, also 60.002 FPS with a 16.8 ms maximum. Live damage and regeneration remained active. The mission was an evasion route with zero shots, not a combat-balance test.

High settings remained native 1600×900, 4×MSAA, 4096 sun shadows, three 1024 local shadow maps, original AO/bloom/motion blur/rain and the existing reflection configuration. No adaptive resolution was used. Final boot preparation took 258.8 ms and verified restoration with no gameplay updates.

Restart reset objectives/breakables, restored health and disabled completion invulnerability. The same standalone HTML launched through `file://` and passed the approach/container aisles, firing six shots, reloading to 30 rounds, crouch/jump and pause, with no runtime errors. The separate video is a control/motion check; another paused browser remained open, so it is not a performance result.

Evidence: `output/playwright/assault/v8-final-*`, `v8-tests/final/mission-performance.json`, `gameplay-result.json`, `v8-office-loop.json`, `boot-residency.json`, `delivery-check.json` and `gameplay-motion.webm`. Puddle verification is recorded separately in `v8-tests/ground-static-check.json`.

The fresh-page repeat completed the same extended mission: 9,829 measured intervals over 163.8436 seconds, 59.990 FPS, p95 16.7 ms and p99 16.8 ms. The hall and office had no interval above 16.8 ms. Two 33.3 ms intervals occurred on the roof instead; the earlier rear-ramp cluster did not reproduce. Neither run establishes a perfectly locked 60 Hz presentation or the cause of the sporadic missed frames.

| Final-build run | Measured play | Mean FPS | p99 | Maximum | Intervals above 25 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Extended mission | 164.3599 s | 59.984 | 16.8 ms | 33.3 ms | 3, hall return |
| Fresh-page extended repeat | 163.8436 s | 59.990 | 16.8 ms | 33.3 ms | 2, roof |

Both office traversals, including three extra laps per mission, remained at 60.002 FPS with a maximum 16.8 ms interval (52.05 and 51.55 measured seconds). The repeat's evidence is in `v8-tests/final-repeat/`. Counts above 25 ms are computed from raw intervals; the older report field named `over33ms` used a 33.4 ms threshold and therefore did not count 33.3 ms intervals. Future summaries name both thresholds explicitly. Older nested per-light snapshot arrays may reflect later values; the diagnosis uses primitive shadow-bake counts and resource counters only.

The requested container replacement and this material iteration are delivered. Sustained average performance is near 60 FPS at the stated settings; occasional dropped frames and the documented visual limitations remain.
