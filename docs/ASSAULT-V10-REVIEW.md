# Assault V10 — hull, buildings and placement

V10 improves maritime surface response, exposes more cargo through the western opening, and audits ladder/fence/prop mounting. Photorealistic AAA remains an unmet visual target.

## Changes

The ship uses targeted variants of its original hull paint and red antifouling materials. Broad painted surfaces, restrained plate variation, localized oxidation, gravity-aligned runoff and varied roughness replace the strongly repeating orange rust pattern. Original maps, labels and decals remain; no textures, render passes or lights were added. The first candidate made shipboard cargo too clean. Its original accommodation/cargo materials were restored, and moderate hull normal relief and original texture detail retained in the final version.

Concrete and brick receive low-contrast exposure variation, runoff and lower-wall dirt. Architectural glass has calmer source mottling and stable pane variation. No façade silhouettes or gameplay glazing were changed. The broader concrete surfaces remain visually simple.

Five previously hidden eastern containers were relocated into the western vista. There are still 93 containers: east 52, west 33, north 8. Shorter inner stacks expose the second row. The ship gangway keeps a 12.31 m clear corridor; cargo and bollards clear the original moorings. The quay extends north 7 m. CPU sightline samples including native and cargo occlusion found more visible assets: western road 5→13, western roof 0→10. These sample counts are geometric checks, not a complete screen-visibility metric; rendered comparisons separately show the improvement.

## Placement audit

All eight original ladder climb planes and the controller remain unchanged. Mounts now reach their actual support surfaces:

- Ladder 13's former 0.4134 m bracket-to-wall gap is closed.
- Ladder 38 and ladder 28 brackets point toward the wall/duct.
- Ladder 26 has a gallery-supported steel frame connected to the duct lip; it is no longer supported only by floating stubs.
- Ladder 65 attaches to the source vertical jambs with visible fixing plates.
- Ladders 45, 69 and 78 attach to their source crate/container/duct surfaces.

All three source chain-link panels have posts, baseplates and rails following their actual planes, including the diagonal panel. The pipe rack and red barrel were moved clear of that fence. Placement checks now include full footprint corners and visual fence intersections, including non-colliding source fence sheets. Three unsupported prop candidates remain rejected. The runtime accepted 47 dressing props, versus 46 in V9; fence/ladder geometry and restored pipe placement increased dressing from 318,312 to 347,738 triangles and 93 to 94 meshes. Harbor geometry remains essentially unchanged: 664,130 triangles/63 meshes.

The numeric audit is `output/playwright/assault/v10-tests/placement-audit.json`; terminal clearance/sightline checks are in `terminal-sightlines.json`. They are source/geometry checks, distinct from browser traversal. Source map collision and navigation files are unchanged. Decorative mounts retain the existing decorative-geometry collision policy.

## Verification conditions

Final HTML SHA256: `439315bbe983481a9c8670e477b29b8fc13d60298a7c969071ebcc87061ffaf4` (4,353,681 bytes). A separate rebuild matches. The untouched original Saltline file is retained. Fifteen physics/navigation checks, twelve actual-map ladder controller simulations and two prewarm restoration scenarios passed. Diff and syntax checks passed.

Fifteen final art frames compiled without runtime/shader errors at 1600×900, DPR 1, High/native, FOV 74, seed 4207, time 18, manual exposure 1, actors/UI/weapon hidden. They are staged art evidence. The original broad-window/roof repetition and some simple ship cargo silhouettes remain. Independent comparison accepted the hull, glass and cargo improvements and confirmed the first candidate's cargo-material regression was corrected.

The test harness now adds a cache-busting query to fresh navigation; hashes are checked against the tested executable. An initial material inspection returned cached V9 and was excluded from V10 evidence.

Normal-input route and performance results follow below. Measurement uses headless Chrome 157, M1 Max/ANGLE Metal, fixed 1600×900 High, dynamic resolution disabled, original 4×MSAA/4096 sun shadows, AO, rain, bloom, motion blur and prior reflection settings. Frame intervals measure browser delivery, not GPU time. Loading/title/pause and the first two playing seconds are excluded. Existing user browser tabs remain untouched. Audio is active in normal play but was not subjectively reviewed; any motion recording is silent and separate from performance measurement.

Independent placement review found the first ladder 45 view obscured by its crate; a second view is used below. It also identified doubled diamond patterns on the fences. Chain-link source brushes already contain opposed outward-facing sheets, so their material now uses front-face culling. The matched frame shows a single diamond sheet, with the fence frame and opposite-side visibility preserved.

The first integrated route attempt died in combat before reaching the office relay. Its 46.35 measured seconds averaged 59.981 FPS with one 33.3 ms hall interval; it is retained in `v10-tests/first-attempt/` and is not counted as route completion. That attempt predates only the final chain-link culling correction.

## Final runtime result

The final-hash normal-input mission completed all three uplinks, both vent ladder climbs/descents and extraction with health 86. Native completion enables invulnerability; no health, position, objective or enemy overrides were used. This was an evasion run with zero shots, not a combat-balance test. It measured 7,477 playing intervals over 124.6283 seconds: **59.994 FPS**, p95 16.7 ms, p99 16.8 ms, maximum 33.3 ms. One interval above 25 ms occurred on the roof; hall (59.20 s), office (12.42 s), yard and vent all remained at or below 16.8 ms. The result does not establish a perfectly locked 60 Hz presentation. Evidence: `v10-tests/final/mission-performance.json` and `gameplay-result.json`.

The western ramp approach and nine-second panorama passed through normal controls with health 100 and invulnerability disabled. It measured 35.6153 seconds at 60.002 FPS, maximum 16.8 ms, with no runtime errors. The normal-input screenshot shows both new cargo rows and the ship from the reached road; evidence is in `v10-tests/harbor-walk/`.

The exterior ladder 13 was also reached from spawn through normal controls, climbed onto the sloping roof (feet Y=10.36), and descended below the last rung (feet Y=0.79, released). Health remained 100, invulnerability false, and no errors occurred. Combined with the complete mission's 26/28 traversal and all 12 controller simulations, this checks the affected routes without teleporting. Other ladders have source-mount/visual audits rather than individual normal-input climbs. Evidence: `v10-tests/exterior-ladder/result.json`.

The final opposite-side ladder 45 capture clearly shows its crate-face mounts and floor contact. Independent review accepted the corrected fence sheet, grounded posts and cargo clearance with no new blocking placement defect. All 15 refreshed frames share the final 439315… hash and report no runtime/shader errors. The standalone file launched and restarted through normal buttons with health 100, zero objectives and invulnerability false. HTTP delivery matches the final executable hash. At completion of local validation, GitHub Pages still served V9. This V10 review records the build subsequently approved for publication.
