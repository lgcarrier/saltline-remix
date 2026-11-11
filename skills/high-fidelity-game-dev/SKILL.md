---
name: high-fidelity-game-dev
description: Build or improve visually ambitious real-time 3D games and playable vertical slices, with coordinated art, rendering, gameplay, audio, and measured quality. Use for game development targeting strong presentation, including procedural browser games; preserve the user's engine, genre, and asset choices.
---

# High Fidelity Game Development

Turn a visual ambition into a small, complete, measured game experience. Saltline informs the techniques here; its port setting, FPS mechanics, and all-code assets are examples, not defaults for every project. “AAA-like” describes a presentation target that must be compared with references, not a certification or a promise of full AAA production scope.

## Establish the target

Inspect the current project and reference before proposing architecture. Preserve existing work. For a small fix, use only the relevant parts of this skill; do not restart the game's production process.

For a new slice, record a short brief using [the production brief](assets/production-brief.md) when helpful:

- The player fantasy, core action, pressure, progression, failure, and completion.
- Target engine/platform, controls, minimum device, viewport, actual rendering resolution, frame-time target, startup and memory constraints. Declare assumptions when these are missing; do not invent measurements.
- A compact spatial plan: scale, axes, traversable volumes, sightlines, landmarks, objective route, collision, and enemy navigation.
- Reference frames and visible success criteria: silhouette, material response, lighting, depth, motion, and readable action. Use gameplay views as well as the best hero view.
- Asset strategy: procedural, authored, generated, licensed, or mixed. Choose it for the content and delivery constraints. Code-only production is useful for repeatable industrial forms; do not force it onto faces, complex organic animation, or an existing asset pipeline.

Concentrate density and craft inside the agreed scope. Do not silently reduce the requested world, genre, or mechanics to fit Saltline's format; explain a staged implementation when necessary.

## Build a contract and a working slice

Read [architecture and coordination](references/architecture.md) for multi-system work. Establish units, coordinate conventions, timing, module interfaces, resource ownership, and typed or documented event payloads before parallel implementations diverge.

Create a runnable shell and one complete interaction early. A shooter example is move → aim → hit → enemy response → objective → success/failure → restart. Adapt this to the requested genre. Keep a functioning integrated build while improving its presentation.

Delegate independent systems when useful and available. Assign bounded files, inputs, outputs, visual examples, budgets, and an executable acceptance scene. Size parallelism to the actual agent capacity; twelve agents is a historical demo claim, not a target. The integrator owns shared contracts and cross-system fixes. Reuse idle agents for independent review.

Represent incomplete systems visibly in development. Optional stubs can unblock integration, but report them and fail acceptance for missing required features. A boot screen disappearing does not establish a functioning game.

## Produce coherent presentation

Read [procedural art and rendering](references/art-rendering.md) when developing materials, models, lighting, or the render pipeline. Establish one representative asset at real gameplay scale and light it well before multiplying variants.

Make geometry, material response, lighting, motion, and sound describe the same physical object. Derive related effects from common state: wet surfaces and footstep type; muzzle events and recoil/audio/tracers; enemy state and warning cues; interior zones and reflections/reverb. Allow approximations, but inspect boundary disagreements.

Read [game feel and audio](references/gameplay-audio.md) when implementing control, enemies, animation, or sound. Visual polish must survive player input and ordinary combat, not only a frozen frame.

Use effects for an observed purpose. Diagnose exposure, scale, composition, surface response, and contact first. Fog, bloom, grain, and motion blur should support clarity; adding every named post effect is not a quality goal.

## Inspect, measure, improve

Read [verification and critique](references/verification.md) before accepting a slice. Add small inspection scenes or equivalent editor modes for materials, models, enemies, effects, and sound. Expose readiness, errors, active fallbacks, and performance counters.

Capture representative fixed camera views with recorded seed, time, FOV, lighting, quality, and internal resolution. Capture motion and normal input separately. Disable adaptation for comparisons; evaluate adaptation in a separate performance run. A fixed timestep alone does not freeze a frame or seed every random source.

For visually substantial work, ask an independent critic to review actual frames or clips and reference images without the implementation narrative. Request visible defects, locations, severity, and a concrete correction. Review geometry, gameplay, audio, and performance with their own evidence; an image critic cannot validate them.

Fix the largest observed quality deficit, re-capture the same views, and recheck affected gameplay/performance. Preserve before/after evidence. Continue until the agreed gates pass, a real constraint blocks progress, or the user changes scope. Do not declare quality from a self-awarded score or a green build.

Use [the review record](assets/review-record.md) for substantial slices. The included [frame report script](scripts/frame_report.py) summarizes exported frame times; it does not certify hardware performance or visual quality.

## Deliver with evidence

Provide the runnable result, controls, complete-loop verification, representative images, measured settings, and material limitations. Distinguish normal-input tests from teleports, invulnerability, and forced state changes. Say whether audio was heard, whether a physical device was tested, and whether a reference match was actually assessed.

For source-study tasks, keep statements labeled as observed code, observed runtime, source-author report, or inference. Read [Saltline evidence](references/saltline-evidence.md) only when studying Saltline or applying its exact inspection hooks. Do not infer prompt count, human intervention, historical test success, or original training/provenance from the final bundle.
