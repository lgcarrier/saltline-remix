# Assault V9 — maritime surroundings

V9 surrounds the native Assault layout with the original Saltline crane, KITTIWAKE cargo ship, container terminal and animated ocean. The visual target remains photorealistic AAA; this iteration establishes maritime landmarks and measured playability, not that broader quality claim.

## Environment

- The original `z1` gantry is scaled uniformly to 84 m and anchored at `[60,0,40]`. Its rails and quay extend underneath the complete bogie footprint. The southern position gives a recognizable boom, mast and cable silhouette from the warehouse roof.
- The original `vb` KITTIWAKE ship is moored on the west, with its original bridge, lifeboat, hull, cargo, gangway, radar and navigation lights. Its authored scale is retained.
- Ninety-three original `container40` assets surround the map: 57 east, 28 in two west rows, and eight north. Corrugation, corner castings, locking bars, wear and labels are retained. Regional material batches and a shared label atlas keep the terminal to 36 meshes. The atlas retains the source font-load refresh.
- The original ocean geometry, wave/detail textures, sun response, foam and clock are reused for two basins. Both remain excluded from the existing apron reflection pass. The west wave/foam domain follows the rotated ship. No additional reflection target or light is introduced.
- Generic skyline blocks and their land slabs were removed. Native playable architecture, collision, doors, ladders, mission objectives and navigation remain unchanged. The additional dock geometry is decorative and beyond the native boundary.

The harbour totals 664,126 triangles in 63 meshes, including cargo and original asset navigation lamps. Water and quay skirts add 53,324 triangles and four draws. These are submitted scene resources, not a claim that all are visible in each frame. Crane spreader sway, radar rotation and navigation-light blink use the original expressions.

## Sightlines and review

Initial inspection exposed several invalid viewpoints: some cameras were inside buildings or outside the spawn-connected navigation component. They are not used as playable evidence. The crane was moved south after its original east placement appeared as cropped legs behind the boundary buildings.

An independent visual critic reviewed the actual frames and confirmed the improved crane silhouette. A separate source review checked quay/rail clearance, original collision ownership, water transforms and animation updates. It caught a bollard intersecting a new cargo row and a missing atlas-refresh callback; both were corrected before final testing.

Final staged captures use 1600×900, DPR 1, High/native, FOV 74, seed 4207, time 18, manual exposure 1 and hidden actors/UI/weapon. They are art comparisons, not normal-input or performance evidence. Cosmetic particles retain some nondeterminism. Normal-input screenshots retain the weapon, HUD, enemies and automatic exposure.

The western elevated road and warehouse roof provide the principal views. Existing buildings naturally occlude parts of the port from other alleys. Broad façades, repeated windows and large-scale hull rust still look procedural; the world does not yet reach AAA photorealism.

## Verification

Final HTML SHA256: `4fb9473e186e471f3dd33f01dd98b60ae01f9aa14e0dd78a124fd07b430af4da` (4,342,025 bytes). A separate build matches byte-for-byte. `original.html` remains unchanged. Fifteen physics/navigation checks, twelve actual-map ladder simulations and two prewarm-restoration scenarios passed; JavaScript syntax and diff checks passed.

An earlier candidate reached both indoor relays but died during additional office loops. Its report is retained in `v9-tests/candidate-incomplete/`; it is not counted as a complete route. It measured 70.56 playing seconds at 60.002 FPS, maximum 16.8 ms, before death. Its hash differs from the final build because the bollard and atlas callback were subsequently corrected.

Final runtime results are recorded below after the complete input-only route and western-ramp check. Audio remains active in normal play, but no subjective listening was performed. Any recorded WebM is silent and separate from performance measurement.

A second, final-hash exposure run reached all three relays and walked to the crane viewpoint using ordinary controls, then died while holding/turning on the exposed roof. Its normal-input screenshot proves the view is reachable; the run does not count as successful extraction. Over 100.38 measured seconds it averaged 59.983 FPS with p99 16.8 ms and two 33.3–33.4 ms roof intervals. The office measured 25.55 seconds at 60.002 FPS, maximum 16.8 ms. Evidence: `v9-tests/roof-exposure-incomplete/`.

Performance conditions: headless Chrome 157, Apple M1 Max through ANGLE Metal, native drawing buffer 1600×900, DPR 1, High, dynamic resolution disabled, 4×MSAA, 4096 sun shadows, original AO/bloom/motion blur/rain and the prior apron-reflection configuration. Timings are browser frame delivery, not direct GPU timings; loading, title, pause and the first two playing seconds are excluded. The user's existing browser was left untouched. Separate staged reviews are not measured as gameplay. Occasional missed frames remain possible.

The final complete mission passed all three relays, both ladder ascents and descents, and extraction. No position, objective, health, enemy or invulnerability overrides were used; the original success handler enables invulnerability on completion. It was an evasion route with zero shots, not a combat-balance test. It measured 7,492 playing intervals over 124.9117 seconds: **59.978 FPS**, p95 16.7 ms, p99 16.8 ms. Three 33.3–33.4 ms intervals occurred on the roof. Hall (59.51 s), office (12.43 s), yard and vent intervals all remained at or below 16.8 ms. Evidence: `v9-tests/final/mission-performance.json` and `gameplay-result.json`.

The separate western approach passed through the native ramp to feet `[-44.12,6.5024,-54.94]` with browser movement/turning inputs, health 100 and invulnerability disabled. The screenshot `v9-tests/harbor-walk/ship-playable.png` shows the ship and stacked cargo from that reached road. The approach and nine-second panorama measured 35.68 playing seconds at 60.003 FPS, maximum 16.8 ms, with no runtime errors. This is an exploration check, not another completed mission. A first automation attempt started before the intro finished; the helper now explicitly waits for `playing`, and the zero-sample attempt is preserved separately.

The standalone `file://` build launched without errors and passed the starting approach, container aisles, firing seven shots, reloading to 30, crouch/jump and pause. Restart restored a playing state with health 100, zero objectives and invulnerability disabled. Evidence: `v9-tests/delivery/delivery-check.json` and the silent `gameplay-motion.webm`. This recording ran separately with another paused browser and is not a benchmark.

Eight final art captures share the final HTML hash, compile without runtime/shader errors, and are listed in `v9-final-capture-manifest.json`. The tested executable is the local `index.html`; the existing V8 GitHub Pages release is unchanged by this iteration.

Final independent frame review accepted crane/ship/cargo landmark visibility, including the normal-input west-road screenshot, with no new blocking visual defect. It retained the limits of repetitive hull rust, uniform façade windows and restricted sightlines into deeper container rows. The local HTTP-served HTML hash also matches the tested build.

Read-only title-screen observation verified the original radar and spreader transforms changed over 1.2 seconds; both relocated water shaders reported successful adaptation with no errors. The lamp clock is closure-owned, so the material-uniform probe did not expose its value; lamp animation preservation is established by source inspection, not that probe. Evidence: `v9-tests/animation.json`.
