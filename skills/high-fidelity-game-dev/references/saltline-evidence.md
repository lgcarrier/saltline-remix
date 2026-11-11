# Saltline: evidence and exact inspection routes

Read this only for Saltline source study or inspection. The other references are reusable engineering guidance derived from the artifact, not a reconstruction of its development transcript.

## Source identity and limits

Audited on 2026-11-10, local `saltline-remix` commit `8b40731cbd855b1ab0c3e3be46d019fecda4e458`. The repository calls `original.html` the unmodified original; `index.html` changes the map. We did not byte-compare the local original to the current hosted artifact.

- [Pinned source bundle](https://github.com/lgcarrier/saltline-remix/blob/8b40731cbd855b1ab0c3e3be46d019fecda4e458/original.html)
- Original SHA-256: `f7081ef7b2fde5880e3c58184c720b2aa3b9115efe58ff71b48f6820d4f16f90`
- 1,423,413 bytes / 6,189 lines; many JavaScript functions occupy very long lines.
- [Published original](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp)
- [Author's post](https://x.com/felixrieseberg/status/2119925633564463609), read via a [mirror](https://nitter.gq/felixrieseberg) because direct access failed: reports one human prompt without feedback, about eight hours, roughly $550 at API pricing, 2.7M output and 445M heavily cached input tokens. These are author-reported historical figures, not measured by this audit.

The supplied screenshots claim a written plan, twelve parallel agents, integration, self-critique and a separate image critic. The bundle is consistent with a modular tool-assisted workflow. It does not prove agent count, original context, no human edits, actual historical test runs, effort settings, or cost. The phrase “also build me” in the displayed prompt cannot establish what earlier context was present or relevant. One initial human instruction can launch many internal model/tool calls and revisions.

The local Git history has one import/remix commit. It is not the original production history. `game/ui.css — owned by the Game agent` survives at line 6. No original contract file, planning transcript or agent logs were found in this checkout.

## Verified inventory and construction

All line anchors below refer to the pinned original. Search symbols as well because bundling compresses modules onto long lines.

| Finding | Evidence / qualification |
| --- | --- |
| 27 surface GLSL programs | `Tn.asphalt` … `Tn.water`, lines 4820–5263 |
| 29 bake recipes, 48 named materials | `c3`, `l1`, line 5281; materials can share shaders and baked sets |
| Three intermediate bake targets | Outputs at 4737 and `emit` at 4778; `Gg` at 5440 then copies textures and derives normals in additional passes |
| ORM convention | R=AO, G=roughness, B=metalness; albedo transfer and packed height have their own conversion |
| Physically scaled normals | Lines 5270–5277 and 5440; relief millimeters and tile meters compensate for resolution |
| Coherent procedural sky, light and probes | `SALTLINE_SKY` 4194; renderer `Hg`/`jy` 4731; environment capture avoids double-counting sun |
| Custom soft shadow patch with fallback | `SALTLINE_SHADOW` 4283–4336; startup checks and stock PCF restoration at 4731 |
| HDR post chain and viewmodel handling | `SALTLINE_POST` 4336–4731; separate camera/depth treatment |
| Shared puddle base field | `Rb`, `U1`, `Li` at 5461; shader 5500–5620; CPU query 5812; visual detail/filtering means approximate boundaries |
| Geometry built in code | Helpers 4178, props/level 5440, weapon 5926/6052; bevels, profiles, custom surfaces and primitives, not only boxes |
| Animated batches | Weapon `dm` 6052 keeps moving components and material batches separate; mechanical skinning uses named bones and rigid weights |
| Sound inventory | `Go` at 5926: 57 registry entries include 2 IRs; 55 sound/music types generate 91 variants, plus 2 IRs = 93 buffers |
| Raw sample synthesis | Noise, filters, chirps, partials, envelopes and distortion at 5926; playback uses AudioBufferSource, no WebAudio oscillator nodes |
| Music | Five named stems, not only the three labels shown in one screenshot |
| Encounter limits | Actor pools and attack-token scheduling at 6052/6074; mission/waves at 6180 |
| Partial integration | `dr` stubs at 4178; boot catches optional module failures at 6180 |

The embedded Three.js engine is a dependency. Google Fonts are requested at lines 3–4. “All game assets generated in code” does not mean every dependency is original or that literally nothing is downloaded.

## Diagnostic routes and traps

Showcase keys at line 6180: `mats`, `level`, `backdrop`, `ground`, `fx`, `weapon`, `enemies`, `props`, `render`.

```text
/original.html?show=mats&q=high
/original.html?show=enemies&q=high
/original.html?show=weapon&q=high
/original.html?shot=1&q=high&seed=4207&cam=-25,1.7,6,10,3,4
/original.html?bench=1&q=high
```

- Use `bench=1`, not bare `?bench`: the implementation tests string truthiness. `#bench` also works. Other truthy flags need a value.
- `shot=1` defaults to reduced `test` quality unless `q` is set. Record the effective quality and drawing buffer.
- Show/shot modes suppress dynamic resolution. They support comparison; separately test normal adaptive gameplay.
- `__ready` means two animation loops. Check `__fatal`, `__errors`, required `__G` module stubs and renderer mode too. Showcases intentionally omit irrelevant modules.
- `__stats()` is a function, not a stored result. Its FPS is a snapshot; `tris` counts accumulated draw work, not unique scene geometry.
- `__setShot({cam, fov, exposure})` controls capture; the weapon viewer has additional pose inspection. Fixed `dt` and seed do not eliminate all unseeded random/time paths.
- `__G.weapon.info`, `__G.enemies.debug.tris`, `__G.mats.stats()`, and `__G.audio.debug()` provide compact counters. Do not serialize `__G` or the entire enemy debug object: they include the scene graph and large geometry buffers.
- `__G.audio.selfTest({seconds:10, interior:false})` and `interior:true` run offline numerical mix tests. They do not listen to the mix.
- Benchmark mode disables audio and flies a cinematic camera. It cannot establish performance in normal combat with audio.

## Observed runtime in this study

Original ran in Chrome 157 / ANGLE Metal on an Apple M1 Max, viewport and drawing buffer 1600×900, high quality. Startup reported no game errors/fatal state, no missing-module stubs, advanced rendering and soft shadows active. A missing favicon returned HTTP 404 separately. The material viewer was also inspected at `tex=512`.

Runtime reproduced 48 material names, 93 generated audio buffers with two IRs, and a viewmodel counter of **53,136 triangles / 13 meshes**. Source calculation includes hands and accessories: this is not a rifle-only triangle count. Enemy debug counters were Gull 13,788 and Hound 17,344. Main-scene lazy generation had 24 baked sets loaded, rather than every defined recipe.

Two 10-second offline mix tests returned zero `over` and `nan` counts, peaks 0.810 outdoors / 0.789 indoors. Here `over` tests samples at or above 0.999, and `nan` is the implementation's invalid/extreme-sample counter. These observations support numerical mix health for those scenarios only.

No normal-input mission playthrough, sustained combat benchmark, subjective listening, physical-device control test, or independently established AAA visual parity was completed in this source-study task. A paused-scene FPS snapshot is intentionally not promoted to a performance result.
