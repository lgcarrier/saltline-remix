# Assault — exterior finish and softer interior shadows

V6 continues the original Saltline asset approach and supplied Assault geometry. It improves the exterior and interior contacts; it does not establish photorealistic AAA quality.

## Changes

The exterior now has folded gutters tied to the existing downpipes, lap flashing, a supported receiving canopy, roof joints, repair sheets and fixings. The distant district has a second boiler-house/sawtooth layer. These additions total 3,498 triangles, retaining the same 16 architecture batches and three non-shadow skyline batches. No navigation or collision was added. The nine original Saltline maritime containers remain.

Original corrugated textures gain restrained sheet variation, runoff discoloration and broad wet/dry roughness variation on roofs. The original truck finish gains canvas sag and tension folds, pressed bed rails, tailgate hinges and a visibly bracketed step. These refinements preserve the source truck and original material library.

Interior shadows now derive a penumbra from perspective blocker distance and fixture size. Close contacts retain bilinear filtering; separated shadows use a 12-point disk. A four-probe blocker search includes the centre. The no-blocker fallback still evaluates contact visibility so thin chair legs retain shadows. All three local maps remain 1024; the original 4096 sun map and sun filter remain unchanged. This is an area-shadow approximation, not ray tracing.

Cached environmental shadow maps now invalidate individually using changed caster bounds and the actual light frustum. Removed or moved-away casters clear their old shadow. Dirty state survives the existing 8 Hz refresh throttle. Moving actors remain excluded from these environmental caches and retain the original sun-shadow behavior. Static diffuse illumination remains a baked approximation.

Point and spot lighting skips BRDF evaluation only when Three has already established that the attenuated light contributes exactly zero RGB. The light inventory, nonzero contributions, directional/indirect paths and all quality settings remain intact. A diagnostic A/B toggle changes shader programs and requires settling; it is not used during mission timing.

## Visual review

The independent critic found more credible exterior construction and no obvious new architecture intersections. The first truck step appeared detached; visible L brackets replaced its thin supports. The roof's initially uniform response received broader wet/dry variation after that review. The critic rechecked the final images and confirmed the step attachment and subtle roof-sheen improvement without a new visible artifact.

The interior comparison found smoother desk-shadow edges with desk legs, chair feet and cabinet still grounded. Lower and upper hall contacts retained readable silhouettes, with no new detached shadow or excessive blur in the reviewed frames. The existing darker rear/upper hall at fixed exposure remains. Procedural repetition, simplified vehicles and source-map silhouettes still limit realism.

The final `v6-final-*` images use 1600×900, DPR 1, High, FOV 74, seed 4207, presentation time 18, manual exposure 1 and automatic exposure disabled. Weapon/UI/actors are hidden for art review; cosmetic randomness remains. Normal gameplay uses automatic exposure and live actors. Intermediate `v6-first-*` and `v6-soft-*` captures preserve the review sequence.

## Verification boundaries

All 15 physics/navigation checks and 12 actual-map ladder simulations pass. Nine targeted non-browser cache checks cover relevant office casters, irrelevant truck changes, removal/reset, old bounds, throttling and actor restoration. Actual browser route and performance results are recorded separately below.

The previous build was remeasured before the changes. Three normal-input office laps completed at 60.002 FPS over 40.60 active seconds, p99 16.8 ms, with live enemies, damage/regeneration and no health or position overrides. The old 54 FPS office result did not reproduce under this run's conditions. Consequently, a new 60 FPS result alone does not quantify an optimization gain over V5.

A staged GPU-query diagnostic produced raw 26–33 ms values while observed frame delivery remained 16.66 ms. These ANGLE/Metal query values are retained but not treated as validated GPU busy time or evidence of gains. Shot mode also refreshes sun shadows every frame, unlike ordinary High gameplay. Staged CPU submission timings and normal-input RAF measurements are reported separately.

A same-camera light-guard A/B preserved the office image to rounding precision: five pixels out of 1,440,000 differed, with mean RGB-channel difference 0.00000139 and maximum single-channel difference 2 on the 0–255 scale. Two guard-off images were identical. Repeated staged CPU render submission remained about 4.2 ms in both modes; this comparison does **not** demonstrate a measurable CPU or GPU speedup. The guard removes mathematically zero contributions; selective shadow refresh is a separate optimization.

Audio assets are unchanged. No subjective audio listening was performed in this iteration. Recorded video is silent and is not used as a performance benchmark.

## Final build and normal-input results

Game document SHA256: `f6566964278549f1f1967dca910d010b1ccc280f3f2811bad982e349cffc9c00`.

The office endurance test passed five normal-input laps, including repeated doorway approaches and full turns, with live enemies and actual damage/regeneration. It measured 4,041 active frame intervals over 67.347 seconds: **60.002 FPS**, p50/p95 16.7 ms, p99/max 16.8 ms. No health, position, objective or invulnerability overrides were used. Every lap succeeded; runtime errors were empty. Evidence: `output/playwright/assault/v6-tests/v6-office-loop.json`.

During those laps, local shadow refresh counts changed by `[0, 0, 61]`: only the office light rebaked. Each office refresh submitted 166 depth draws, compared with 412 draws for refreshing all three maps. This reduces depth submissions for an office-only refresh by about 60%, preserving map resolution and the relevant casters. These counts describe submissions, not measured GPU milliseconds.

Measurements use Apple M1 Max / 64 GiB, Chrome 157 headless / ANGLE Metal, 1600×900 actual drawing buffer, DPR 1, High/native scale 1, 4×MSAA, 4096 sun map, 1024 textures, three 1024 local maps, 24 volume steps, AO, reflections, bloom, motion blur and rain. The user's existing Chrome tab was left untouched. There were no agent art browsers or video recording during the performance sample. This is a warmed shader/runtime test, not a cold-start or cross-device guarantee. Checkpoint captures occur while paused, outside active timing.

The full normal-input mission passed on the same document: deploy, yard and side door, hall uplink A, platform jump, both ramps, office uplink B and five office endurance laps, crouched vent and both ladders to rooftop uplink C, reverse ladder/vent route, ramps, yard and extraction. All collision and enemy behavior remained active. The evasion route fired no shots, so this is not a combat-balance test. The original completion handler enabled invulnerability only after extraction; reset is checked separately.

| Area | Active seconds | Mean FPS | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Whole extended mission | 217.19 | 59.86 | 16.7 ms | 16.8 ms |
| Yard | 35.10 | 60.00 | 16.7 ms | 16.8 ms |
| Hall | 70.96 | 59.55 | 16.8 ms | 16.8 ms |
| Office | 80.68 | 60.00 | 16.7 ms | 16.8 ms |
| Vent | 16.77 | 60.00 | 16.7 ms | 16.8 ms |
| Roof | 13.68 | 60.00 | 16.8 ms | 16.8 ms |

13,000 active frame intervals were retained. Four hall intervals exceeded 33.4 ms; the worst was 166.6 ms. Their cause was not isolated, so the complete route is not claimed to be hitch-free. Every sampled office interval stayed at or below 16.8 ms. The office total includes its 67-second endurance section. Runtime errors remained empty. Evidence: `v6-tests/mission-performance.json`, `gameplay-result.json`, `qa-route.json` and `qa-extraction.png`.

The standalone `file://` game also passed: ready with all 48 original materials and 36 prop builders, normal input from spawn through both container aisles, four shots, reload to 30 rounds, crouch, jump and pause. Redeploy reset the objectives, health, invulnerability, breakables and ladder state. No runtime errors occurred. `v6-tests/delivery-check.json` records it; `v6-tests/gameplay-motion.webm` is the separate silent movement recording. Recording was outside performance timing.

Play the generated repository-root `index.html` locally at `http://127.0.0.1:8767/?q=high&dynres=0&v=6`. Original source and attachments are unchanged. These improvements and test results are a new playable revision, not a claim that the photorealistic AAA target is met.
