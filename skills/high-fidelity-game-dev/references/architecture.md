# Architecture and parallel production

Read this when creating a game slice, splitting substantial work among agents, or repairing integration boundaries. Adapt the structure to the existing engine; a narrow polish task does not need a new architecture.

## Start from the playable promise

Turn the brief into a small observable loop: player verb, obstacle, feedback, progression, success, failure, and restart. Name the target platform, input method, representative camera views, desired session length, and performance envelope. Record assumptions that materially affect implementation.

Build one representative playable scene before multiplying content. It should exercise the hardest shared decisions: scale, traversal, a representative interaction, lighting, material response, audio feedback, and framing. For an FPS this might be one lane, one enemy, one weapon, and one objective; another genre needs a different slice.

Use the scene to settle the common visual language. Parallel workers should receive a defined target frame or current reference scene, not independently invent exposure, palette, dimensions, and detail density. A successful composition can then become a reusable content pattern.

## Freeze the interfaces that cross ownership boundaries

Write a compact contract in the project's own documentation. Prefer existing engine conventions and name the owning module for each shared decision.

| Boundary | Specify before parallel implementation |
| --- | --- |
| World | Units, up/forward axes, handedness, origin, traversable bounds, ground/water levels, player dimensions, collision tolerances. |
| Time | Simulation tick or variable step, units, pause semantics, interpolation, maximum catch-up, source of elapsed/real time. |
| Randomness | Seed source, subsystem streams, reset behavior, which cosmetic effects may remain nondeterministic. |
| Rendering | Main/view-model layers, color space, tone mapping, exposure owner, light/environment owner, transparency and shadow policy. |
| Materials | Texture channel packing, color versus data maps, normal orientation, world/UV scale, parameter ranges, cache ownership. |
| Events | Names and payloads, units, ordering expectations, authoritative producer, subscription/unsubscription lifetime. |
| Scene | Placement data, collision proxies, navigation, objectives, spawn zones, acoustic/interior regions, capture cameras. |
| Lifecycle | Creation dependencies, readiness, reset, update, disposal, resource ownership, capability/failure reporting. |

Version interface changes explicitly enough that workers can identify stale assumptions. Have the integrator decide shared changes, then notify affected workers. Do not let two workers independently repair the same shared API.

Distinguish simulation from presentation. A fixed capture timestep should not silently change weapon rate, enemy decisions, or mission timing. Visual interpolation and camera effects can consume render time while gameplay consumes its declared clock. Keep pause and restart behavior consistent across both.

## Make the level export gameplay data

Treat geometry placement and gameplay metadata as one authored scene. A compact contract can look like this; adapt the fields and value types to the project rather than introducing a second incompatible schema:

```ts
type SceneDefinition = {
  bounds: Bounds;
  playerStart: Transform;
  placements: Placement[];       // stable id, asset, transform, variation seed
  colliders: Collider[];         // proxy shape, surface, gameplay flags
  navigation: NavigationData;
  objectives: Objective[];       // stable id, interaction region, completion rule
  spawns: SpawnZone[];           // actor capabilities, access/visibility constraints
  exits: ExitRegion[];
  environments: EnvironmentZone[];
  cameras: CaptureCamera[];      // stable name, transform, projection
};
```

Use the same placement transform for render geometry and collision/navigation inputs. Route gameplay surface queries and audiovisual responses through the same authoritative environment data where practical. A visually wet patch and a footstep system should not maintain unrelated approximations without a stated reason.

Validate reachability and interaction clearances on the representative scene before adding decorative clutter. Identify objects that affect movement or sight lines. A change to level placement can require navigation and encounter validation even when all mesh and material code is unchanged.

Keep authoring sources separate from distribution output. Work in readable modules and reproducible scene data; generate a bundled HTML or executable at packaging time. Do not use bundle size or line count as evidence of development effort. When modifying an existing bundle-only artifact, document extraction/mapping and preserve an untouched comparison copy.

## Delegate through bounded handoffs

Use the available concurrency. Favor a few independent workstreams with clean interfaces over a fixed number of workers. Group dependent work or schedule it in waves when capacity is limited.

An initial wave can establish the renderer/material contract, playable controller/interaction loop, and representative environment. Later waves can expand props, animation, audio, encounters, and effects against those settled interfaces. The integrator keeps the application running between waves.

Each assignment should include:

- **Outcome:** a concrete in-game behavior or visual target, with reference frames where relevant.
- **Allowed edits:** explicit files/directories, plus shared files the worker must request through the integrator.
- **Inputs/outputs:** the contract version, exported API, events, asset identifiers, dimensions, and dependencies.
- **Acceptance demo:** a runnable isolated view or scenario that exercises the delivered behavior.
- **Budget:** relevant draw-call, memory, startup, simulation, or frame-time limits and how to measure them.
- **Handoff:** changed files, run command, observations, unresolved issues, and integration needs.

The integrator owns startup order, shared configuration, scene wiring, cross-system event definitions, packaging, and final integration checks. Workers own their assigned implementations. Avoid simultaneous edits to a central entrypoint; ask workers to return a small proposed integration patch when direct ownership is unclear.

A useful handoff is “this enemy runs its locomotion and attack cycle in the showroom and emits the specified hit event,” rather than “the enemy code is finished.” Capture evidence at the agreed quality and camera so the next reviewer can compare it.

## Keep partial builds inspectable without hiding omissions

Interface-compatible stubs let one subsystem run while another is being built. Give every stub or degraded implementation an observable status and reason. Required gameplay or visual systems still fail their acceptance gate while stubbed.

Distinguish an intentional reduced-quality capability path from an accidental missing implementation. The application may remain usable after a shader or audio failure, but its diagnostics must report the active fallback. A successful boot is not sufficient to claim the intended rendering or gameplay path passed.

Build an inspection entrypoint for modules that benefit from isolated review: material gallery, prop turntable, character cycle, weapon pose, timed effect, or audio audition. Keep shared lighting and scale available so isolated work can also be judged under the actual scene conditions.

## Expose a small diagnostic adapter

Provide a development-only adapter or equivalent engine tooling with these observable capabilities:

| Capability | Useful contract |
| --- | --- |
| Readiness | Boot stage, required resources ready, first frame rendered, active modules, fallback/stub status. |
| Errors | Startup and runtime errors, shader failures, unhandled rejections, with bounded storage and timestamps. |
| State | Current game mode, objective progress, player/actor summaries, simulation tick, seed, quality preset. |
| Capture | Named camera, explicit projection/exposure/quality, fixed simulation step or controlled time, optional pose/effect age. |
| Metrics | Actual drawing-buffer size, DPR, render scale, active passes, calls/triangles, memory estimates, frame-time samples. |
| Scenarios | Start/reset a named scenario and report completion conditions without bypassing the behavior under test. |

Keep readiness stages distinct: DOM loaded, renderer initialized, scene ready, shader warmup complete, and gameplay running are different milestones. Have capture and verification tools wait for the milestone they need and reject unexpected fallbacks.

Parse diagnostic query flags deliberately. Treat bare flags consistently, validate numeric values, and display the effective options. Avoid capture modes silently selecting lower texture or shadow quality than the reference target.

Make capture controls reproducible enough for comparisons, and state the remaining nondeterminism. Fixed camera and timestep alone do not freeze unseeded random effects, asynchronous resources, temporal accumulation, or wall-clock inputs. Record the actual configuration alongside the image or performance sample.

Do not confuse debug state manipulation with player-path verification. Teleporting to an exit can test the completion transition; it cannot prove the player can traverse the level, complete objectives, and reach that exit through normal controls.
