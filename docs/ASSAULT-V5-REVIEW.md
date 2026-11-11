# Assault — architecture and freight-yard revision

This revision keeps the supplied BSP routes and Saltline gameplay while improving the architecture, materials and lighting. The photorealistic AAA target remains a visual acceptance criterion for the user; successful tests do not certify that target.

## Visible changes

- The enormous exterior wooden stack beside the loading entrance is replaced by three original Saltline maritime containers. The west-yard flat container block is replaced by two more. Their visible geometry is fitted to the native cover envelopes; source collision and overall cover heights remain unchanged. These historical map proportions differ from standard ISO dimensions.
- Three original containers occupy the western side of the central freight yard. The earlier southwest container remains. The resulting nine containers retain original procedural corrugation, corner castings, door hardware, markings and material assets. New containers use original prop collision; one affected enemy spawn moves into the open aisle. Rain shelter and pavement masks include the container roofs.
- Structural bays, facade piers, window depth, platform trim and timber construction give the source brushwork physical detail. The office has a desk, chair, terminal, task lamp and electrical cabinet outside the objective route.
- Map-specific material variants preserve original source textures while reducing oversized wood grain, aggressive concrete stains, metallic spangle, tarp gloss and asphalt crack contrast. Galvanized ducts are smoother and visually separate from masonry. Original prop materials remain available.
- Interior lighting uses visible fixtures and an occlusion-tested static diffuse volume. Three existing lights add cached local shadows for environmental objects. The sun retains its original soft-shadow path. Local maps exclude moving actors, refresh when doors/breakables change, and limit animated refreshes to 8 Hz. These are approximations, not path tracing or fully dynamic global illumination.
- A distant freight district adds warehouse/silo silhouettes in three merged batches outside the playable boundary. It adds no collision or local lights.

## Evidence boundaries

Fixed-camera art captures hide the weapon, UI, enemies and effects. They use high quality, 1600×900 at DPR 1, FOV 74, seed 4207, presentation time 18, manual exposure 1 and **automatic exposure disabled**. Residual cosmetic randomness remains. Normal-input gameplay and measured frame delivery are separate artifacts.

Earlier v1–v4 captures described as exposure 1 generally retained automatic adaptation: 1 was the manual multiplier, not a fixed exposure. The v4lighting2 bounce A/B and explicitly labeled v5 fixed captures disable adaptation. The v3 performance/result record is historical and does not measure this revision.

The assistant has not subjectively listened to this revision's audio. Prior numerical audio checks remain baseline evidence only. The unchanged original Saltline source and supplied attachments remain preserved.

## Independent image review

The critic viewed the final 74° captures and original-port reference, without making gameplay/performance claims. Containers improve freight identity and construction detail, the skyline adds depth, materials are calmer, and furniture is grounded. The photorealistic AAA target is **not met**. Remaining visible limitations are limited upper/rear hall separation at fixed exposure 1, hard angular office-shadow edges, dense regular corrugation, the simplified source truck silhouette, and sparse distant context.

An initial claim of an interior-lighting regression was retracted after checking the exposure metadata: earlier V4 room images used adaptation. The comparable controlled lower-hall frames have broadly similar readability. Normal gameplay retains automatic exposure, so the fixed-exposure findings alone do not characterize every gameplay view.

`v5-menu-fov50-*` preserves an intermediate capture mistake: the menu camera forced FOV 50. The final capture script explicitly enables shot mode, records actual FOV, and fails if it differs from 74. `v5-final-*` is the corrected controlled set. These images share the delivered game document SHA recorded in their manifest.


## Final route and performance

Game document SHA256: `07b2a7d7deb860ac7212acbfa04610de0b5930f4600cceab2cd42b92794ec1be`.

The full mission passed through actual browser keyboard input: deploy, yard/side door, A, loading-platform jump, both ramps, office doors/B, both ladders and crouched vent/C, both ladder descents, return ramps/yard, extraction. There were no teleports, cleared enemies, forced objectives, health overrides or invulnerability overrides. Damage and regeneration occurred. The completion handler enables invulnerability after extraction. This route used evasion, with zero shots; it is not a combat-balance test.

The first attempt is preserved under `output/playwright/assault/v5-attempt-1/`. Its return driver stopped downward input one update before the ladder grip released, then flat-look forward input climbed back up. The controller audit confirmed the cause. The test now requires the bottom height and an inactive grip before continuing; no ladder gameplay code changed. A fresh mission from the actual Restart button completed successfully. The passed evidence is `v5-tests/qa-route.json`, `v5-tests/gameplay-result.json` and `v5-tests/qa-extraction.png`.

Performance uses wall-clock requestAnimationFrame delivery during normal gameplay, excluding pause/title and the first two seconds. Hardware: Apple M1 Max, 64 GiB RAM. Chrome 157 headless, ANGLE Metal, viewport/drawing buffer 1600×900, DPR 1, High/native scale 1, 4×MSAA, 4096 sun shadow, 1024 local shadow maps, 1024 material textures. Automatic exposure and live enemies/audio remain active. Art browsers were closed. The user's existing Chrome playtest tab was left untouched. Room-checkpoint screenshots can add scheduling overhead; no video was recorded during this sample. This is not a direct GPU timer or a guarantee for other hardware.

| Sample | Active duration | Average FPS | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Passed complete mission | 155.2 s | 57.9 | 16.8 ms | 33.4 ms |
| Yard | 35.8 s | 59.9 | 16.7 ms | 16.8 ms |
| Hall | 73.0 s | 56.7 | 33.3 ms | 33.4 ms |
| Office | 14.5 s | 54.0 | 33.3 ms | 33.4 ms |
| Vents | 17.9 s | 60.0 | 16.7 ms | 16.8 ms |
| Roof | 14.0 s | 60.0 | 16.7 ms | 16.8 ms |

8,980 active frame intervals were retained; worst interval 50 ms. The first incomplete mission averaged 58.2 FPS over 122.4 active seconds, with office 52.9 and roof 54.9 FPS; it remains available rather than being discarded as an inconvenient result. The passed run is a warmed restart, not a cold-start benchmark. This revision does not meet a strict sustained 60 FPS target across every area. The data is in `v5-tests/mission-performance.json`; the separate initial 30-second traversal is in `v5-tests/performance-30s.json`.

Cached environmental shadows refresh on doors/breakables, capped at 8 Hz. Earlier controlled tests verified stable idle caching and repeated door invalidation. Final normal gameplay exercised this with zero runtime errors. Remaining performance candidates include skipping zero-contribution direct-light BRDF work and narrowing moving-occluder invalidation; neither unmeasured proposal is included in the delivered build.

The deterministic builder and embedded JavaScript syntax check pass. All 15 physics/navigation checks and 12 actual-map ladder-controller simulations pass. Original source remains unchanged. Independent visual acceptance and performance acceptance remain separate: neither green tests nor container replacement certifies photorealistic AAA quality.

## Standalone delivery and cargo-aisle check

`v5-tests/delivery-check.json` verifies the same document through `file://`: 48 original materials and 36 prop builders available, no fatal/runtime errors, actual movement from spawn, both new container aisles traversed, four shots, reload to 30 rounds, crouch, jump and pause. Redeploy reset objectives to 0, health to 100, invulnerability to false, breakables and ladder state. `v5-tests/gameplay-motion.webm` records the separate normal-input cargo traversal; it has no audio and is not a performance sample. Its recording/browser overlap makes the instantaneous title FPS unsuitable as benchmark evidence.

The current runnable deliverable is repository-root `index.html`, served locally at `http://127.0.0.1:8767/`. The original Saltline file and source attachments remain untouched.
