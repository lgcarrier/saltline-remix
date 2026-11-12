# Saltline · Dust production brief

Add the supplied Counter-Strike 1.6 **de_dust**, preserving its entire BSP layout and the existing Assault and original Saltline games. Reuse the original weapon, robotic enemies, props, animation, effects, audio, PBR renderer and the Assault controller/navigation improvements. New dry desert materials and architectural details must preserve the source's recognizable silhouettes and traversable routes.

The playable loop is Saltline's single-player mission: deploy, traverse and fight, disable three uplinks, extract, fail or complete and restart. This is a map migration into Saltline, not a Counter-Strike multiplayer rules implementation. The original A and B sites remain landmarks. A third relay makes the tunnel route part of the mission.

Target: desktop WebGL2, keyboard/mouse, 1600×900 reference viewport at DPR 1, fixed high quality for visual comparisons; 1920×1080 checked separately where practical. Desired frame budget 16.67 ms, with real measured frame delivery reported. Minimum physical hardware has not been specified and cannot be certified from browser automation.

## Shared contract

- Source GoldSrc inches convert at 0.0254 m/unit. Source X,Y,Z maps to Saltline X,Z,-Y. Y is up; player positions are feet, standing height 1.8 m, radius .32 m.
- Source BSP geometry owns playable topology, ramps, tunnel ceiling, cover and sky boundaries. The underpass is below Y=0, so no implicit ground plane at zero is allowed.
- `src/dust-map.json` uses the Assault extraction schema with original source UVs, bombsite bounds and entity metadata. Trigger volumes are gameplay metadata, not visible geometry or walls. `func_illusionary` geometry remains non-solid.
- Shared `sAP` physics owns triangle collision and navigation with multiple vertical layers. Render meshes and collision derive from the same transformed scene.
- `dustMaterials(i,map)` owns new desert textures/materials. `dustDress(i,b,map)` adds decorations without blocking the original routes. `dustConfigure()` runs before renderer initialization. `C1(i)` owns the Dust level lifecycle and objective placement.
- The game retains its original timing and event contracts. Visual comparison seed is 4207. Cinematic/random FX are not assumed deterministic merely because a seed is supplied.
- All original asset constructors stay bundled. Map dressing selects assets appropriate to the scene rather than placing the original harbor across Dust's routes.
- New `dust.html` is additional. `index.html` remains Assault; `original.html` remains untouched. Both remixes expose map links.

## Acceptance

Check full geometry counts and source hash; native spawn floors; overlapping bridge/underpass navigation; reachable objectives and extraction; enemy routes; actual input movement/combat/reload/interactions; failure/retry/pause; resource readiness, shaders and errors; and fixed-quality frame pacing. Capture gameplay-scale exterior, tunnel, arch and material views. Independent review must assess actual visible fidelity. “Photorealistic AAA” remains an acceptance target, not a claim conferred by passing code tests.
