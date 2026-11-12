# Dust source and independent frame review

Reviewed 2026-11-11. This record separates source migration, controller simulation, and visible image findings. It does not certify the photorealistic target or a complete normal-input playthrough.

## Source accounting

The supplied `reference/de_dust_cs16.zip` is preserved. Its BSP identifies itself as GoldSrc version 30, “DUST by Dave Johnston - for CounterStrike.” Remote provenance was not independently re-verified during this review.

| Item | Observed value |
| --- | --- |
| Archive SHA-256 | `fdaf0d41331fd67032edac0987019b0a74db500384b9b12e2020e8131ec826ce` |
| BSP SHA-256 | `ac94fbda94e4a170b971f05936fe8706cb9aa895e55f7797916dc160171cab11` |
| BSP records | 6,891 vertices; 5,550 faces; 48 brush models |
| Complete face accounting | 4,482 visible face records + 1,044 invisible solid sky faces + 24 trigger faces = 5,550 |
| Brush model accounting | 1 world + 29 illusionary + 14 trigger-only breakable crates + 2 bomb targets + 2 buyzones = 48 |
| Rendered source geometry | 10,228 static triangles + 176 crate triangles = 10,404 |
| Source collision | 12,782 world/sky triangles + 176 crate triangles = 12,958 |
| Other retained metadata | 16 CT and 16 T starts, 7 local lights, 1 environment light, original entities and both bombsite bounds |
| Visible world texture names | All 19 retained, plus brush-entity texture names |
| Coordinate conversion | GoldSrc `(X,Y,Z)` to `(X,Z,-Y) × 0.0254`, metres, Y up |

The extractor preserves original projected `uvSource`, physical `uvMeters`, hard normals and sampled vertex-light data. Two collinear face-fan slivers became microscopic off-plane triangles after metre rounding; they are discarded by projected area. No finite source face area is intentionally removed.

Sky faces remain solid boundaries and are not rendered. Illusionary geometry remains nonsolid. Bomb targets and buyzones remain metadata rather than collision. The stock crate `spawnflags=1` means trigger-only destruction: these 14 models remain cover during Saltline gunfire. The game retains Saltline's uplink mission; Counter-Strike buying, planting and team-round rules are not implemented.

Collision ranges preserve triangle order and identify dirt, masonry, timber and metal for surface response. A final taxonomy check corrected `-2Sand` to `dust_sand`, `generic011` lamp hardware to original `steel_dark`, and `+0~fifties_lgt2` to `dust_lamp`.

## Geometry and controller checks

Run `DUST_REPORT=1 node tools/test-dust-physics.mjs`. Nine checks pass, covering source accounting, texture coordinates and outward winding, all 32 spawn floors/headroom, both sites, underpass relay clearance, separated vertical layers, and navigation/controller agreement. The report is [source-physics.json](../output/playwright/dust/source-physics.json).

Six routes use the actual capsule solver at 120 Hz, without changing position between waypoints: CT→T, CT→A, CT→B, A→B, T→underpass C, and C→B. Together they execute 19,517 simulation ticks, about 162.6 simulated seconds. This is controller simulation with explicit velocity input, not browser-keyboard gameplay or a performance benchmark.

The source-derived grid uses 0.75 m cells and contains 28,929 nodes, including stacked surfaces. Disconnected source roof/sky regions are retained as separate components. Runtime scene readiness separately verifies its actual grid, objective paths and spawn list.

Both reviewed extraction centers, `[41.1,-3.2512,-85.6]` and `[41.2,-3.2512,-86.56]`, have source support at `Y=-3.25119996` and 0.7 m center clearance. For each, all 64 samples around radii 2.65 m and 2.8 m have the same support and standing-capsule clearance. Separate A/B/C return-route simulations reached both centers; all six finished within 0.4 m horizontally. The scene uses a 2.8 m extraction radius and a 2.55–2.65 m visible ring. The integrator selects the final center; both validated alternatives are safe within these tests.

Five outdoor aerial spawn volumes also pass nine XZ samples covering ±1.2 m spawn jitter, with a 0.65 m radius and 1.2 m vertical body envelope. Indoor ground spawns must not be reused as aerial locations.

## Independent review of the initial frames

Evidence: `candidate-t_spawn.png`, `candidate-underpass.png`, `candidate-tunnel.png`, `candidate-site_b.png`, `candidate-site_a.png`, and the supplied `reference-overview.png`, under [output/playwright/dust](../output/playwright/dust/). Candidate screenshots are 1600×900. Actual internal rendering resolution and complete capture settings were not independently measured by this image review.

The initial frames do **not** meet the photorealistic target. Ranked findings:

1. **High — road appearance:** the foreground in T spawn and both sites is a cool, cloudy gray slab. The source overview reads as warm broken masonry and packed sand. Add warmer restrained aggregate/cobble structure, dusty joints, edge deposits and local traffic wear; reduce broad cloudlike contrast.
2. **High — uniform architecture:** long walls repeat pristine rectangular courses, while corners and caps remain perfectly straight. Use selective plaster loss, stone variation, contact deposits and restrained edge/cap relief without altering passages.
3. **High — unfinished military crates:** green cover reads as nearly featureless blocks with vertical lines. Add frames, hardware, edge response and contact grime on the original collision envelopes.
4. **Medium — outdoor palette:** cool gray-green light/materials obscure the source's warm desert identity. Warm sunlit material response modestly while preserving cooler shaded regions; compare identical cameras.
5. **Medium — tunnel readability:** the near arch, floor and crate surfaces are uniformly very dark while the lamp creates a small bright hotspot. Add restrained warm bounce and local material definition without flattening the dark-to-light transition.
6. **Medium — parapet artifacts:** dotted or striped lines appear along high caps in site A/B. Overlapping coplanar layers are a possible cause, not established from images. Inspect the same full-resolution view and remove or separate coincident surfaces.

Arches, lanes, underpass and courtyard composition are readable. No gross missing geometry is evident in these views, but a top-down reference alone cannot prove exact three-dimensional parity. These stills do not establish animation quality, weapon/combat presentation, audio, frame pacing or complete playability. Revised frames require a separate comparison before closing the visual gate.

## Follow-up comparison of revised frames

The five `final-*.png` images were inspected at the same named cameras. Their [capture manifest](../output/playwright/dust/final-captures.json) identifies document SHA-256 `808de0be78478c64ed92410170f2beb71633378e41d1cff4c40ed2c29be259b5`, seed 4207, FOV 74°, exposure 1, high quality, and 1600×900 drawing-buffer resolution. They are staged paused captures. Actor poses and simulation times differ between views; static surfaces are the useful comparison here. The manifest's FPS values are not a sustained benchmark.

Visible improvements are substantial: the road has warm stone/granular structure, plaster separates broad walls from masonry trims, green crates have frames and corner hardware, and tunnel surfaces read more clearly outside the lamp hotspot. These address the initial review's largest material and palette problems.

The photorealistic gate remains open. The largest remaining visible gaps are:

1. **Architecture silhouette and contact:** T-spawn ramp corners, wall caps and tunnel arch remain perfectly sharp, simple source forms. Restrained bevels, cap thickness and selected chipped edges would supply highlights and physical contact at gameplay distance.
2. **Ground transitions:** site B and underpass have ruler-straight, clean road/sand borders. Irregular dust accumulation should cross selected borders and collect along walls and crate feet; preserve walkable clearances.
3. **Uniform wall aging:** plaster now has convincing small-scale variation, but broad walls receive similar detail everywhere. A few larger runoff, repair or plaster-loss regions would communicate construction and exposure more clearly than additional uniform noise.
4. **Close crate surfaces:** framing improves weight, but broad paint/timber faces remain flat and evenly treated. Local joint dirt, a few worn contact edges and differentiated roughness would improve close-range response.
5. **Small artifacts:** thin dotted cap/parapet lines remain visible above the site A windows and near site B's upper-right corner. Speckled markings directly below some site B windows also read as pixel noise. Inspect these layers at the recorded camera and remove coincident or excessively fine detail.

No inference about complete gameplay, audio quality, temporal stability or frame pacing is made from these images. The revised result has a clearer desert identity and stronger material presentation; these frames still do not establish photorealistic AAA parity.
