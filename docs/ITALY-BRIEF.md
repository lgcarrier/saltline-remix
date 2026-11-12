# Italy production brief

Add the complete supplied Counter-Strike 1.6 `cs_italy` BSP as an additional Saltline map. Preserve Assault, Dust and the original Saltline. The source layout owns the market, alleys, apartments, tunnel, terraces and two-storey hostage house. Architectural detail must respect those silhouettes and traversable openings.

The playable loop uses the existing single-player Saltline rules: deploy at the CT approach, fight security robots, disable three security uplinks in different parts of the village, return to extraction, and restart after success or failure. The native hostage positions and rescue zone remain source metadata; Counter-Strike multiplayer rounds and hostage AI are not part of the existing engine. Weapons, robot families, animation, effects, audio and the procedural prop bank are reused across maps.

The presentation target is photorealistic AAA fidelity, assessed in actual gameplay views. It is a target, not a certification inferred from a successful build. New Italy materials cover lime plaster, terracotta, limestone, cobbles, timber, shutters, interiors and market details. The material pipeline combines generated imagery, procedural PBR channels and source-aligned detail textures. Generated/inferred normals are not scanned surface measurements.

## Contract

- Desktop WebGL2, keyboard and mouse; 1600×900 at DPR 1, fixed high quality and seed 4207 for reference captures. Desired frame time 16.67 ms. Actual hardware and drawing buffer are recorded during testing; no unspecified minimum hardware is certified.
- One GoldSrc unit is 0.0254 metres; source `(X,Y,Z)` becomes `(X,Z,-Y)`. Y is up. Player positions represent feet; standing height 1.8 m, capsule radius .32 m.
- Source geometry supplies collision, layered navigation, source texture UVs, metres UVs and baked-light reference data. Trigger brushes are metadata, illusionary brushes are nonsolid, and hidden collision proxies remain hidden.
- `italyMaterials(i,map)` owns surface appearance. `italyDress(i,b,map)` owns nonblocking architectural detail; `italyInteriorFinish(i,map,root)` adds source-supported interior joints. `italyConfigure()` sets the photographic sky and sun before renderer creation. `italyLighting(i,map,root)` owns interior fixtures and local market bounce. `C1(i)` owns level lifecycle and mission placement.
- `italy.html` is a reproducible standalone build. Existing map menus provide navigation to Italy. Original asset constructors remain available; only setting-appropriate assets are placed in the village.
- Italy preserves standing jumps and ground crouching, and adds an airborne duck tuck with conserved horizontal momentum for native crate-to-window access. Hull expansion must respect overhead geometry and the floor. Space jumps; C or Ctrl crouches.
- Required systems must not silently fall back to stubs. Startup diagnostics, render settings, source counts, paths and objective checks are exposed.

## Acceptance evidence

Verify complete BSP extraction and all brush classes; native spawns, rescue zone, hostage floors, elevation changes and alternate routes; enemy and objective reachability; real browser-input combat, reload, interaction and full extraction; pause, failure and retry; resource/shader health; fixed-quality timing and representative exterior/interior/material views. Debug camera captures and controller simulations are labeled separately from normal-input play. Independent visual criticism evaluates actual images. Audio numerics and audible listening are reported separately.
