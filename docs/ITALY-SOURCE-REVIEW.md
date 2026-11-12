# Italy source migration and collision review

The supplied `reference/cs_italy_cs16.zip` is treated as source data. Its bundled README describes provenance and export conventions; it is not executed or treated as task instructions. The migration reads the BSP, not only the OBJ, so brush entities remain part of the scene.

Source BSP: GoldSrc version 30, 2,303,480 bytes, SHA-256 `2a5a16044d69481a9fb3c623407fb0ba9d6b8863f30db35451992d2879c1ca9d`. Coordinates map native `(X,Y,Z)` to metres `(X,Z,-Y)` at 0.0254 m/unit. Source bounds are `[-42.2656,-6.096,-65.8368]` to `[29.6672,13.0048,65.024]`.

## Observed source contents

- 102 BSP brush models: worldspawn, 74 `func_wall`, 20 `func_illusionary`, five `func_breakable`, and two trigger volumes. There are no moving doors or ladders in this BSP.
- 201 static material groups, 19,278 nondegenerate static render triangles; the radio adds 20 visible breakable triangles. The worldspawn alone has 80 materials and 7,176 source faces. Its 17,985 emitted triangles omit 1,597 zero-area/collinear triangles from the OBJ's 19,582 raw fan count; source face coverage is unchanged.
- 20,908 static collision triangles plus 68 breakable triangles. Collision includes source sky/clip boundaries, excludes nonsolid illusionary geometry, and retains tool-textured bottle/chicken breakable proxies. Those proxies remain invisible; they are not opaque architecture.
- Ten native CT starts, ten native T starts, four hostage points across two house floors, and one native rescue point. Entity properties and target relationships are retained.
- The BSP names 102 texture records but embeds no mip pixels. The supplied archive provides 80 PNG textures for the worldspawn. Native model and sound references (scientists, chickens, wine bottles, opera/guitar/sheep audio) are metadata; the corresponding MDL/WAV files are not in this archive. New runtime replacements are separate authored assets, not those absent source files.

`tools/extract-italy.py` reuses the GoldSrc decoder in `tools/extract-dust.py`. All source surfaces retain hard face normals, native projected UVs, metre UVs, baked vertex RGB lighting, material names and face placement metadata. Render mode/amount/color and visibility are explicit. Italy-specific materials classify continuous plaster, roof tile, stone, cobble, brick and wood separately from source-aligned windows, doors, posters, murals, market tiles and other details. Collision surface ranges classify timber and metal for shared impact/footstep audio.

## Playable placement contract

All positions below are player feet in metres, Y up. Native entity origins are generally above their supporting floor and must be grounded before spawning.

| Location | X | Y | Z |
| --- | ---: | ---: | ---: |
| First native CT start | -19.5072 | -6.096 | 47.1424 |
| Native rescue / extraction | -17.4752 | -6.096 | 50.8 |
| Market uplink candidate | 23.8 | -3.8608 | 3 |
| Apartment uplink candidate | -26 | 0.2032 | -29 |
| Upper hostage-house uplink candidate | 21.1328 | 3.2512 | -59.3344 |
| First native T start | 6.9088 | 0 | -55.0672 |
| Lower house hostage | 24.7904 | 0 | -61.7728 |

Both hostage floors remain at Y=0 and Y=3.2512. The three uplink candidates each have a supporting source floor, 1.8 m headroom, 0.7 m terminal clearance, and connected navigation from CT. The gameplay uses Saltline's existing uplink loop; retained hostage metadata alone does not implement Counter-Strike hostage escort or team rounds.

The runtime navigation grid contract is X=-46 to 34, Z=-70 to 70, cell 0.75 m, dimensions rounded as in the bundled engine. Physics tests use that same origin and phase.

## Observed verification

`ITALY_REPORT=1 node tools/test-italy-physics.mjs` passes fifteen grouped checks covering metadata, all source finish normals/UVs, trigger/illusionary semantics, all 20 native starts, all four hostage points, rescue reachability, uplink floor/clearance, stacked floors, and actual capsule movement on six routes. The capsule follows navigation waypoints at 120 Hz with 3.8 m/s motion, gravity, the normal 0.42 m step limit and 0.13 m waypoint tolerance; positions are not reset between waypoints. Routes include CT → market → apartments → upper house → rescue, plus CT → T and CT → lower hostages. These are controller simulations, not browser-input playthroughs.

The CT approach exposed a shared controller defect: five-point foot support missed narrow diagonal curb contact on sloped paving, allowing a capsule to catch on a climbable lip. The correction uses a cached 16-direction footprint near sloped source floors; flat floors retain the original five-point checks. It changes neither map geometry nor navigation acceptance tolerances. The full route test fails without this correction.

The Assault 15 physics/navigation checks, 12 ladder controller checks, prewarm success/failure checks, and Dust nine source/controller checks passed after this change. Regenerating Assault and Dust scene JSON produced byte-identical outputs. The small decoder correction retains `aaatrigger` collision only on solid `func_breakable` brushes; ordinary trigger volumes stay nonsolid.

A browser-input attempt later exposed a distinct graph API problem after approach drift near the apartment basement corner. The player was at `[-27.5179149,-3.8608000,-46.5434520]`; the planner snapped to the reachable graph node `[-26.875,-3.8608,-46.375]` but omitted it from the returned route, so the next point remained behind the corner. `findPath` now includes that starting connector only when the direct first segment is blocked and the snapped node is reachable. Both fresh and cached routes are checked against the caller's actual position. A recorded-position regression traverses the corner in 157 simulation ticks, with no position reset.

The shared graph retains its 1.5 m actor clearance policy. The selected player routes are separately exercised with the actual 1.8 m capsule; source reachability alone is not a claim that every graph route fits a standing player. No new navigation clearance tolerance was introduced for the corner correction.

Source-grounded camera checks reject the former house view at feet `[5,0,-45]` (no floor or nearby nav node) and apartment view at feet `[-24,0.2032,-27]` (4.064 m above its floor). Valid gameplay-height eyes include market `[7.8,-2.384,14]`, apartment interior `[-26,1.8832,-29]`, western alley `[-36.5,1.68,-28]`, native T courtyard `[6.9088,1.68,-55.0672]`, and upper house `[21.1328,4.9312,-59.3344]`. Ground support, standing clearance and navigation were checked; final composition still requires rendered inspection.

The detailed simulation record is `output/playwright/italy/source-physics.json`. Runtime frame rate, actual keyboard/mouse traversal, combat, audio listening and visual-reference quality are separate acceptance evidence and cannot be established by these source tests.


## Jump and crouch access

Italy keeps the standing jump apex at 1 m (gravity 21 m/s², impulse √42 ≈6.4807 m/s), standing/crouched hull heights 1.8/1.15 m and radius 0.32 m. Source keyboard bindings are Space for jump and C or either Ctrl for crouch. The original controller shrank its hull from the feet, so it could crouch under a low opening but could not tuck its feet up to reach the classic house window.

The new opt-in `physics.resizeCapsule` keeps the physical head position fixed when the airborne hull shrinks. Standing expansion lowers the feet only to a valid support floor and rejects a blocked hull; ground crouching keeps feet fixed. It stores no accumulated offset. Italy's controller can preserve existing horizontal air momentum while crouched and compensate its eye offset during a stance transition; the standing jump height remains unchanged. Other maps' controllers do not call the new resize API.

The source geometry simulations now verify:

- Ordinary jumps climb the native west-house crate sequence from `[9.6,0,-57.1]` to low `[10.7442,0.8382,-57.0992]`, middle `[12,1.651,-56.896]` and top `[12,2.4638,-58.6]`.
- The native west window has its sill at Y=3.8608 and 1.6256 m central clearance. A standing capsule cannot fit; a crouched capsule can. From top-crate launch `[12.5,2.4638,-59.85]`, a sprint jump with crouch at 80 ms reaches the sill and upper-house floor Y=3.2512. An otherwise equivalent standing jump fails the opening and falls to the courtyard.
- The apartment radio/furniture perch at `[-7.3152,1.8288,-19.1516]` has 1.6256 m clearance under the source ceiling. A jump-tuck from apartment floor `[-9,0.2032,-19.1516]` reaches it; standing is blocked on the perch. This is an optional furniture perch, not an invented tunnel.
- Releasing crouch under the window cannot force the head into its lintel or lower feet through the sill. Airborne stance reversal is reversible in free space, and normal ground crouching does not move the feet.

These action traces use the actual capsule solver, 120 Hz half-step gravity and original ground/air acceleration (34/9 m/s²); their explicit initial run velocity is recorded. They are source-controller simulations. Browser Space/C input validation is recorded separately by the integration work.


### Observed browser-input native access

`tools/qa/italy-native-movement.cjs` completed the entire route from fresh CT deployment through real keyboard and mouse events, with no player-position/velocity writes, teleport, invulnerability or forced objective state. The run passed all ten stages: real mouse calibration, CT-to-crates traversal, both C and Ctrl crouch bindings, three native crate jumps, top-crate lineup, sprint duck-jump, blocked standing under the lintel, and upper-house entry. It finished standing on the upper source floor at `[14.27077,3.25120,-63.22723]`, health 100, invulnerability false, with zero runtime errors. Wall-clock duration was approximately 50 seconds on the local test browser.

The window test landed crouched on Y=3.8608. Releasing C correctly left the player crouched because standing clearance was unavailable. Holding Ctrl carried the player through the opening; releasing it inside allowed a standing pose at Y=3.2512. This is actual browser-input traversal evidence, distinct from the source-controller simulations above. It does not claim human playtesting or a physical mobile/controller test.

Real mouse movement requires a real canvas click after Deploy to acquire pointer lock. A URL flag alone does not grant mouse capture. Calibration with three target yaws showed angular errors below 0.0011 rad after capture. Rapid airborne steering used actual mouse movement; the final grounded exit used keyboard alignment.

Preserved passing evidence: `output/playwright/italy/v3-native-movement.json`, with tested standalone HTML SHA-256 `4e8b19463676bb3732a038cb1f5f83cdb0985a3c961982abcc56e6d7dd98d13c`. The prior partial window attempt is retained as `native-movement-window-attempt.json`; its final test-cursor failure is not counted as a completed entry. A later v5 recorded attempt stopped on the north staircase before the crates; its preserved `v5-attempt1-native-movement.json` and `italy-native-route.webm` are failure evidence, not a completed access run. The final v6 `native-movement.json` passes all ten stages after the stair-support fix, including the same approach, three crate jumps, ducked window landing and standing inside the upper house. Its HTML SHA-256 is `8739fe1f58efbaa4c86f0d30b0b2c8bd4a6670f1274b12fd7b104ec2a5bb0392`; health remains 100, invulnerability is off and runtime errors are empty.

That later attempt revealed a diagonal stair-contact defect at `[19.1254723,-1.2192,-37.9000722]`. The capsule could touch a 0.4064 m riser before any cardinal floor probe reached its tread. Ordinary controller acceleration from rest then stalled; the earlier constant-speed route simulation crossed the narrow probe gap and did not reproduce it. The solver now adds probes along the exact horizontal normals of nearby climbable risers while retaining its existing five probes on flat floors. An 18-case regression traverses from both recorded contact positions with actual acceleration and half-step gravity at 120, 60 and 30 Hz, including small heading errors. No step height, source geometry, collision radius or waypoint tolerance was relaxed. Browser acceptance of this corrected build is tracked separately.


Measured from the passing browser-input telemetry, the three ordinary crate jumps peaked 0.99913 m, 0.99922 m and 0.99922 m above their launch floors. The sprint duck-jump launched at Y=2.46380 with 6.4 m/s horizontal speed and reached a sampled foot peak of Y=4.11311: approximately 1.64931 m above launch, comprising the unchanged 1 m ballistic jump and the 0.65 m airborne hull tuck. This does not represent an increased jump impulse. No separate frame-time benchmark isolated the stance transition; frame-pacing evidence belongs to the main runtime performance record.

The controller audit confirms that tuck resizing runs only on a standing→crouched transition, not on every frame while C/Ctrl is held. Rejected expansion preserves both the crouched state and position; free-space stance reversal restores the original feet position, and source-floor clamping prevents downward penetration. Reset restores the ordinary player pose and eye state, with no separately stored tuck offset. Existing regressions cover these geometry-sensitive cases; no additional cumulative-tuck or ceiling defect was found in this final audit.

### V7 closed-window render recess audit

Twelve closed CT façade windows now have 18 cm visual recesses. The render-only clip removes 32.22217877 m² against a planned 32.22216765 m²; triangle winding, interpolated UVs and source light attributes pass independent checks. Each cut has an opaque back and four cavity-facing reveals. All twelve legacy flat panes are uniquely suppressed, and 216 sampled casing/sash face normals point outward after correcting reversed bevel returns. Source JSON, collision and the traversable house aperture remain unchanged. Source-material diagnostic mode keeps the original façade triangles.

The original collision plane still owns weapon impacts: particles or decals may sit up to 18 cm ahead of recessed glass. This is a documented visual approximation, not a new traversable opening or changed hit surface. Geometry audits establish closure and attribute correctness; the separate v7 captures establish rendered appearance.

### Whole-map window and façade audit

The subsequent pass extends the same closed-window construction to 101 eligible windows across five native chart families: 24 `bStuccoWnd`, 63 `wlStuccoWnd`, 12 `shutteredWindow`, one `floweredWindow` and one `windowWhite`. There are 101 opaque backs, 404 reveals and 101 unique suppressions of old flat panes. Incomplete charts remain intact. An independent area audit measures 262.56002678 m² removed against 262.56005805 m² planned; the 0.00003127 m² difference is numerical precision. The source JSON and collision remain byte-identical.

Plain plaster is partitioned away from window and border artwork and uses the same physical material as adjoining walls. All 31 surviving partial-window triangles retain the native atlas. The final border pass preserves 313.79961426 m² of cream moulding artwork and 182.56323720 m² of ochre artwork, with no lost artwork and negligible overlap into plain plaster. The [v9 audit](../output/playwright/italy/v9-geometry-audit.json) checks 19,341 interpolated vertices against their original triangles, with maximum attribute error below 3×10⁻¹². Source-material diagnostic mode bypasses these render partitions.

The house gains 31 coping blocks, 20 corner returns, 22 framed existing motifs, and 18 arch stones plus 12 jamb blocks at the adjacent passage. Projection is bounded at 5.5 cm on solid source faces. Independent projected-triangle checks find no passage intrusion and only the existing Float32 rounding at the crouch-window boundary. These checks do not replace browser-input traversal or visual review.

The [final geometry/classification audit](../output/playwright/italy/final-geometry-audit.json) also guards the observed CT lighting regression: fourteen render fragments on each of faces 6779 and 6780 now classify consistently as exterior after excluding clay-roof eaves from room-ceiling bounds. Sampled upper-house and apartment rooms remain interior. The [interior audit](../output/playwright/italy/final-interior-audit.json) verifies 437 closed source-supported skirting/crown profiles, positive winding/volume, bounded 24 mm projection and unchanged crouch aperture. These are render-only corrections; the original collision remains unchanged.
