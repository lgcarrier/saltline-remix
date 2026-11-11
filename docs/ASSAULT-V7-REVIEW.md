# Assault V7 — resource preparation, surface separation and rear-hall light

V7 retains High quality and the original Saltline asset library. It improves material response and rear-hall lighting while moving first-use GPU resource work into loading. Photorealistic AAA quality remains unmet.

## Hall-hitch diagnosis and change

V6 recorded four hall intervals of 133–167 ms. A new instrumented replay of that unchanged build did not reproduce them: its 2,616 playing intervals peaked at 19.5 ms. It did confirm first-impact allocation of three decal textures and two geometries, plus staggered bone-texture uploads as enemies became active. First-impact CPU rendering was 8.6 ms; a separate 91.3 ms initial render occurred before the playing sample. The historical stalls' exact cause is therefore **not established**. The diagnostic route reached A but died during the ascent toward B; it is preserved as a failed gameplay attempt, not a complete-route pass.

The new boot pass uploads the already-created resources before Deploy. It draws to an 8×8 HDR target matching the game’s RGBA half-float format and 4×MSAA, then waits for a GPU fence. It preserves the light inventory and restores visibility, culling, callbacks, matrices, skeleton values, viewport, targets and shadow flags. It calls no gameplay update, spawn or emission function. A private UUID random stream prevents this preparation from consuming gameplay/cosmetic random values. Normal completion and injected GPU failure both pass restoration tests.

This is preventive first-use resource preparation, not proof of what caused all four V6 stalls. Full-route results below determine whether the new build meets the observed frame-pacing target. Quality settings, effects, rain, textures, sun/local shadow resolutions and scene geometry are retained. The preparation adds loading work and earlier GPU residency; it does not reduce runtime visual quality.

Diagnostic evidence: `output/playwright/assault/v7-tests/v6-hitch-diagnostics.json` and `v6-hall-cpu-profile.json`. `?prewarm=0` disables only the resource-preparation pass for diagnosis.

## Materials and lighting

- Concrete slabs use a finer original texture scale than walls, without extra mesh batches. Wall paint is quieter, while restrained traffic polish changes floor roughness along the actual circulation route.
- Interior worn steel has a broader matte response. The first V7 capture exposed glitter-like fine texture under the added light; the final material correction removes that artifact while preserving illumination.
- Original wet-asphalt assets now separate damp aggregate, soaked film and standing water more clearly. Localized cargo-yard depressions and shorter approach puddles break the uniform reflective band. The shared mask still drives rain, shelter, puddles and footsteps; container roofs/feet retain their existing shelter behavior.
- Eight existing source-map fixtures at the rear gallery now contribute baked, occluded light. They use the same four fixture batches. Warm lower recesses and cooler upper fixtures improve separation without adding runtime lights or shadow maps.
- Denser hall probes resolve the elevated floors. RGBA16F irradiance preserves weak bounce and avoids the earlier clipping near fixtures; runtime texture-read count remains unchanged. The field remains a static diffuse approximation, not dynamic ray tracing.

The independent critic confirmed clearer concrete/paint/metal separation, softer grounded furniture contacts, removal of the metallic speckles, and more visible wet/dry pavement transitions, without an obvious new rendering artifact in the reviewed stills. Remaining limits include plain broad metal surfaces, similar crate colouring/wear, smooth puddle boundaries and the truck’s dark, simplified material appearance.

## Evidence conditions

Final `v7-final-*` captures use 1600×900, DPR 1, High/native, FOV 74, seed 4207, fixed presentation time 18, exposure 1 with adaptation disabled. UI, actors, weapon and effects are hidden for art comparison. Normal-input mission testing is separate, with live enemies, automatic exposure and audio active. No subjective audio listening was performed; the standalone movement video is silent and is not a performance measurement.

Hardware remains Apple M1 Max with 64 GiB RAM; Chrome 157 headless, ANGLE Metal. The user's existing visible Chrome tab is left untouched during testing. No other agent browser is running. Shader/runtime caches have been warmed by prior diagnostics/captures; results are not a cold-start or other-device guarantee.

All 15 physics/navigation checks, 12 actual-map ladder simulations and 2 resource-restoration scenarios pass. Embedded shaders and the real browser captures compile without errors. Original source/attachments are unchanged.

## Frozen-build results

Game document SHA256: `af7abcac640cd07d24c70ccca1a74ea6f7f48b19bb854dfa4d3485588e6268a8`.

The final boot checks prepared 40 textures (including 18 bone textures) and 40 geometries in 244.1–244.8 ms, with all three formerly cold decal textures resident before Deploy. The temporary target was disposed. Scene-state restoration and readiness passed with no runtime errors. The separately baked light field took approximately 425–445 ms, all during loading.

The first V7 walk-only mission reached A, then died under enemy fire on the ramps. Its 40.132 active seconds stayed at 60.002 FPS, with p99/max 16.8 ms. The failed attempt is retained in `v7-tests/run1` and is not counted as a completed mission.

A retry using the original sprint control for longer exposed stretches completed A, B, C, both ladder climbs/descents and extraction. All enemies, collision and damage/regeneration remained active; no position, health, objective or invulnerability overrides were used. The original success handler enables invulnerability after extraction. This was an evasion route with zero shots, not a combat-balance test. Captures were taken while paused, outside active timing.

The completed run measured 8,025 active intervals over 133.7445 seconds: **60.002 FPS**, p95 16.7 ms, p99/max 16.8 ms. No hall hitch or frame interval above 25 ms occurred. Hall time was 62.4808 seconds, office 12.5328 seconds. Data: `v7-tests/run2/mission-performance.json` and `gameplay-result.json`.

A fresh-page repeat completed the same mission with all three uplinks, both ladder climbs/descents and extraction. It measured 7,565 active intervals over 126.0784 seconds: **60.002 FPS**, p95 16.7 ms, p99/max 16.8 ms, with no interval above 25 ms. Hall time was 60.1308 seconds and office time 12.683 seconds. Both completed runs retained native 1600×900 rendering, High settings, 4×MSAA, 4096 sun shadows and three 1024 local shadow maps. These are browser animation-frame intervals, not direct GPU timings. Data: `v7-tests/run3/mission-performance.json`, `gameplay-result.json` and `boot-residency.json`.

Timing includes only the playing state and excludes the first two seconds of gameplay, plus title, loading and pause states. The routes themselves were completed from spawn through extraction; startup frame pacing is not covered by the timing table.

| Completed mission | Measured playing time | Mean FPS | Hall max interval | Office max interval | Intervals above 25 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Retry after failed walk-only attempt | 133.7445 s | 60.002 | 16.8 ms | 16.8 ms | 0 |
| Fresh-page repeat | 126.0784 s | 60.002 | 16.8 ms | 16.8 ms | 0 |

The final delivery check used the real restart control and verified cleared objectives/breakables, health 100 and invulnerability disabled. A separate `file://` launch of the same standalone HTML passed loading, normal-input movement through the spawn route and container aisles, firing seven shots, reloading to 30 rounds, and pausing, with no runtime errors. This recorded movement pass is not a benchmark: a paused browser remained open alongside it. Evidence: `v7-tests/run3/delivery-check.json`, `gameplay-motion.webm` and `final-title.png`.

No hall hitches occurred in either completed V7 mission. Because the unchanged V6 diagnostic also failed to reproduce its historical stalls, the evidence supports the observed V7 result and removal of confirmed first-use allocations; it does not establish that every possible stall is fixed. Photorealistic AAA quality remains an art target, with the material and geometry limits described above.
