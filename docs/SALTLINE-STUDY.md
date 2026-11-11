# What Saltline teaches us about building games with Codex

Study date: November 10, 2026. Source: `original.html` from repository commit `8b40731cbd855b1ab0c3e3be46d019fecda4e458`. The repository identifies this as the original; the hosted artifact was not independently byte-verified. Both game HTML files remain unchanged by this study.

**The reusable advantage is a production workflow: narrow scope, coherent art direction, shared system contracts, procedural assets, inspection tools, and repeated correction.** A short prompt can initiate that workflow. The final artifact cannot prove how many prompts, revisions, agents, or human interventions produced it.

The resulting Codex skill is [high-fidelity-game-dev](../skills/high-fidelity-game-dev/SKILL.md). It targets ambitious real-time 3D games, with Saltline-quality small slices as a concrete reference. It preserves the chosen engine, genre and asset strategy. It does not promise that a skill file by itself produces a complete AAA title.

## What “one prompt” does and does not tell us

Your screenshots show a short outer request followed by a written map, parallel subsystem work, integration/testing, screenshot critique and an independent visual critic. Taken on their own terms, they describe an extended development process. They do not describe a single model response containing the finished game.

[Felix Rieseberg's post](https://x.com/felixrieseberg/status/2119925633564463609), accessible here through a [mirror of his feed](https://nitter.gq/felixrieseberg), reports about eight hours, approximately $550 at API pricing, 2.7 million output tokens, and 445 million heavily cached input tokens, with one prompt and no human feedback. These figures remain author-reported. Direct X and hosted-artifact access through the research tool failed; no original agent transcript was available.

That makes the headline plausible as a claim about **human instructions**, while leaving many internal generations, tool calls, test runs and revisions. The source supports modular engineering and built-in inspection. It cannot authenticate the original run. The displayed prompt begins “also,” but that word alone cannot tell us what earlier context existed or whether it affected the result. Nothing in this study establishes deceptive marketing or an independently reproduced one-prompt result.

The local history contains one import/remix commit, not eight hours of development history. The surviving CSS comment credits a Game agent. The exact twelve-agent count, chronology, self-review and separate critic remain claims in the supplied screenshots.

## What is actually in the artifact

| Headline | Source-grounded interpretation |
| --- | --- |
| 27 procedural textures | 27 surface shader programs, 29 bake recipes and 48 named materials. These are different inventory units. |
| One GPU pass | One multiple-render-target surface pass creates colour, ORM and height; copies and normal generation add passes. |
| Models are stacks of primitives | They also use bevels, extruded profiles, holes and custom surfaces. Silhouette and proportions receive substantial work. |
| Everything merges into one mesh | Compatible geometry is batched. Moving pieces, material groups and transparent parts remain separate as needed. |
| 57 sounds plus reverbs / 93 sounds | The registry has 57 entries **including** two IRs. The precise count is 55 sound/music types → 91 variants, plus two IRs = 93 buffers. |
| No oscillators | No WebAudio oscillator nodes; mathematical sine oscillations are still used to write samples. |
| 53,136-triangle rifle | Runtime reproduced that aggregate viewmodel count, which includes hands and accessories, across 13 meshes. |
| 2.9 million triangles | A plausible accumulated per-frame draw counter, including rendering passes; not a unique-geometry budget or proof of speed. |
| The same map controls water and footsteps | A common base field coordinates them; shader noise/filtering means boundaries are approximate. |
| Everything is code | Game surfaces, geometry and audio are generated. Three.js is bundled, and Google Fonts are external dependencies. |

Exact symbols and line anchors are in the [evidence reference](../skills/high-fidelity-game-dev/references/saltline-evidence.md). The full subsystem reviews are [rendering](saltline-study/rendering.md), [game systems and audio](saltline-study/systems.md), and [development-process evidence](saltline-study/process.md).

## Why the visual result works

**The setting fits the production method.** Containers, cranes, pallets and machinery reuse hard-surface construction patterns. Robotic enemies suit rigid mechanical bones. A compact environment concentrates detail and lets a single lighting concept carry much of the presentation. This is a useful choice for this demo, not evidence that every subject is equally easy to generate procedurally.

**Material detail describes a physical history.** Paint reveals primer and steel; exposed steel rusts; runoff follows gravity; protected undersides receive less rain. The same masks affect colour, roughness, metalness and relief. Macro variation breaks repetition, while fine grain controls highlights. Normal strength uses physical tile and height units, so increasing texture resolution does not silently change surface relief.

**Expensive static work is moved out of the frame loop.** Procedural surface functions bake into cached maps. Runtime shaders add dynamic wetness and world variation. This trades startup work and texture memory against per-frame computation. It still requires budgeting: the inspected main scene reported about 111.6 MB of generated surface textures and 45.8 MB of decals in its own estimates.

**Lighting is coordinated across systems.** The sky, sun, environment maps, wet reflections, particles and atmosphere agree. Interior probe capture changes reflective response under shelter. Contact shadows and bevels make objects sit in the scene. The post chain finishes that work; bloom or grain alone would not reproduce it.

**The player-facing view receives dedicated treatment.** World and viewmodel camera/depth behavior are coordinated. Recoil, reload phases, hand poses, flashes, sound, impacts and enemy hearing share action state. A detailed rifle becomes convincing through synchronized behavior as well as geometry.

**Combat is scheduled.** Attack-token limits, telegraphs, staggered spawns and bounded pools shape pressure. Rendering many enemies is only one part of making the fight readable. The original navigation also has assumptions: a ground-plane system does not automatically support the remix's catwalks and stairs.

## The development techniques worth keeping

1. **Specify an observable target.** Turn “AAA-like” into reference frames, gameplay views, motion criteria, a complete loop and a hardware/frame-time budget. Separate visual ambition from the breadth of a full commercial production.
2. **Set cross-system contracts before parallel work.** Agree on units, axes, camera spaces, material packing, physical tile scale, event payloads, environment queries, lifecycle and reset ownership.
3. **Build one representative playable scene.** Establish the hardest shared decisions there, then multiply content. Keep an integrated playable build throughout.
4. **Delegate bounded systems.** Give each worker owned files, inputs, outputs, budgets and an acceptance scene. Keep shared configuration and integration under one owner. Use available concurrency rather than copying the claimed twelve-agent arrangement.
5. **Build tools for looking at the work.** Materials, enemies, weapon poses, effects and audio need isolated inspection paths. Named cameras and diagnostic state reduce the cost of every iteration.
6. **Critique actual outputs.** Give a separate visual reviewer frames/clips and references without the implementation story. Fix observable defects and compare the same views again. Treat audio, playability and performance as separate review subjects.
7. **Gate completion on evidence.** Required systems working, normal-input completion, failure/restart, visual and temporal review, sound checks, and measured frame-time distributions answer different questions.

This sequence is our derived production method. It is not a claimed reconstruction of the author's private run.

## Small implementation details with large consequences

The artifact contains useful capture and testing seams, but they need careful use:

- `?bench=1` activates the flythrough; bare `?bench` does not, because an empty query-string value is false.
- `?shot=1` silently selects reduced `test` quality unless `q=high` or another explicit preset is supplied.
- `__ready` is set after two frames. Optional modules may have failed into stubs, or the renderer may have fallen back. Check error and module state too.
- Showcase omissions are intentional; missing required modules in the real game are not a successful result.
- Fixed camera, seed and timestep do not guarantee fully deterministic frames; some paths still use unseeded randomness or real time.
- Benchmark mode disables audio and follows a cinematic path. It is not representative combat performance.
- The shared scene/debug objects contain large geometry buffers. Export compact counters, not the whole scene graph.

## Checks actually performed

The original was opened in Chrome 157 on an Apple M1 Max through ANGLE Metal. At 1600×900 and high quality, its advanced renderer and soft shadows were active, with no game errors, fatal state or missing-module stubs. The material viewer was inspected separately at 512-pixel texture resolution. A favicon request returned 404; it did not affect the game systems.

Runtime confirmed 48 material names, 93 generated audio buffers with both IRs, the 53,136-triangle / 13-mesh viewmodel counter, and enemy counters of 13,788 for Gull and 17,344 for Hound. The main scene lazily loaded 24 baked texture sets, so the runtime count is not the 29-recipe catalog size.

The two built-in 10-second offline audio tests completed with `over=0` and `nan=0`. Peaks were 0.810 outdoors and 0.789 indoors. This checks numerical output for scripted scenarios; it does not establish subjective audio quality. The captured FPS was a paused-scene snapshot and is not reported as a benchmark.

Artifacts: [runtime observations](../output/playwright/original-runtime.json), [material viewer](../output/playwright/original-materials.png), [port capture](../output/playwright/original-port.png).

No full mission playthrough, subjective listening, sustained combat measurement or independent AAA-parity judgment was performed. Those belong to the next use of the skill on an actual development target. The existing remix's collision, pathing and extraction remain unverified, as its README already states.

## What the skill contains

The [entrypoint](../skills/high-fidelity-game-dev/SKILL.md) routes to focused guidance for architecture, art/rendering, gameplay/audio, and verification. Two reusable templates record the production brief and review evidence. A dependency-free Python script summarizes exported frame times, including warmup, percentiles and slow frames, while retaining device and quality metadata.

The skill deliberately leaves room for authored models, Blender, recordings, and other engines when they fit the requested game. Its central requirement is coherent, observable quality. This is a foundation for repeatable production, not a claim that an untested skill has already reproduced Saltline from scratch.


The [validation record](saltline-study/skill-validation.md) includes package/link checks, executed utility checks, and an independent planning trial on a Godot salvage game. That trial preserved the engine, third-person design, imported models, recorded audio and native 1080p requirement. It validates workflow portability at the planning level; a full game-production trial remains future work.
