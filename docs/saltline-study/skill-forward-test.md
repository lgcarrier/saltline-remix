# Storm-dock salvage slice — production and acceptance brief

Planning only; no prior deliverables existed. No runtime inspection or measurements occurred. Proposed contracts require project audit.

## Intent and playable loop

Preserve the existing Godot 4 project, third-person controller, imported GLB pipeline, and recorded audio. Build a compact stormy dock where the player operates one crane, avoids one roaming inspection robot, retrieves salvage, and extracts. Target an informed successful run of 105–135 seconds; two minutes is pacing, not a forced failure timer. Falling into water adds recovery time.

Proposed route: arrival and visual orientation (15 seconds), approach crane while learning the robot’s patrol (25), align and lower the hook onto a marked salvage container, then raise and transfer it to the landing pad (45), claim salvage and traverse to extraction (25), extraction feedback (10). Retain existing movement/look/interaction bindings; document crane axes and cancel. Audit supported input devices.

Crane alignment and hoist position determine pickup validity; indicators explain rejection. Use guided motion with authored limits. The robot patrols, investigates, and gives a visible/audible scan warning. Sustained detection temporarily interrupts crane operation for four seconds, then allows retry; it never removes completed salvage. Cover breaks detection. These pressure rules are assumptions.

Water entry cancels interaction, fades briefly, restores the player at the latest verified safe anchor, clears velocity/input latches, and resumes play. Preserve completed crane progress and collected salvage; reset an unfinished transfer to its last stable crane pose. Extraction requires collected salvage and deliberate interaction. Success offers replay; replay resets all mission, robot, crane, weather, audio, and transient state.

## Space, presentation, and budgets

Proposed coordinates: metres, +Y up, forward along −Z; origin at arrival. Fit a roughly 40 × 25 metre playable dock, with deck at Y=0 and the recovery trigger below it. Arrival → crane → landing pad → extraction forms one readable route with a shorter return sightline. Provide sufficient third-person camera and robot clearance; preserve imported mesh transforms and author matching collision/navigation proxies. Validate crane sweep clearance and every actual traversable connection before decorating.

Establish a representative wet-deck/crane scene using existing assets. Storm light, wetness, footstep selection, rain exposure, and recorded ambience share zone/surface data. Keep the objective legible through rain and glare. Prioritize contact, coherent roughness, stable highlights, and restrained fog. Gameplay, material, and storm-light references remain missing; select them before look approval.

Target native 1920×1080 internal rendering at 100% scale and 60 FPS (16.67 ms frame budget). Dynamic resolution/upscaling cannot satisfy this native-resolution gate. Preserve the current renderer until audited. Provisional engineering budgets: CPU critical path ≤10 ms; GPU ≤14 ms, measured separately. Provisional delivery gate: delivered average ≥59 FPS, p95 ≤18 ms, p99 ≤25 ms, no gameplay stall >100 ms across three warmed runs. Ratify thresholds on the actual laptop. Startup, memory, draw, shadow, particle, and voice budgets require a measured baseline.

## Two-agent allocation and interface contract v0.1

Map proposed paths to existing conventions before editing.

| Owner | Bounded ownership | Handoff and acceptance |
|---|---|---|
| Agent A, integrator | `slice/contracts/`, `slice/gameplay/`, main scene wiring, crane, recovery, mission, packaging | Runnable crane/recovery scenario; normal-input complete loop; startup/reset authority |
| Agent B | `slice/robot/`, `slice/presentation/`, asset instances, recorded-audio routing, local inspection scenes | Patrol/scan scenario; representative material/lighting scene; audio audition and motion capture |

A owns shared interfaces/wiring; B submits integration changes through A. There is no third implementer. Waves: audit/first interaction → robot/presentation → integration; reuse the idle agent for independent review.

Gameplay owns authoritative state. Proposed signals carry `run_id`, `event_id`, simulation tick, stable actor/object ID, state, and world-space position where relevant: `crane_phase_changed`, `salvage_committed`, `robot_scan_changed`, `water_entered`, `recovery_finished`, `mission_changed`. Effects subscribe once and clear on reset; commit events are idempotent within a run. Fixed simulation timing, pause semantics, random subsystem seeds, and capture clocks must follow audited project conventions. A owns lifecycle/readiness, surface/zone authority, and reset order; B owns presentation resources and voice cleanup. Required stubs/fallbacks remain visible and fail acceptance.

## Evidence matrix and capture plan

All gates currently **not tested**.

| Gate | Required evidence |
|---|---|
| Startup/delivery | Packaged launch; assets ready; shader/errors/fallback report; cold-start timing |
| Gameplay | Uncut normal-input start → crane → salvage → extraction; premature extraction rejected; blocked crane attempt; robot warning/escape |
| Recovery/lifecycle | Falls before/during/after transfer, pause/focus loss, repeated recovery, success/replay; no stale state or duplicate audio |
| Art/motion | Named arrival, crane-closeup, grazing-deck, robot-warning, recovery, extraction captures; ordinary traversal/turning clip |
| Audio | Actual headphone/speaker listening, warning clarity over storm, threshold transitions; clipping/voice-count checks separately |
| Performance | Named CPU/GPU/RAM/OS/driver, Godot version/renderer, power mode; audio enabled; three full runs after documented warmup; raw frame times, p50/p95/p99, resolution/quality history |

For every capture record revision, camera transform/FOV, exposure, seed, simulation time, weather, internal resolution, and quality. Freeze reproducible stills; capture motion separately. Record remaining nondeterminism. An independent critic reviews references/captures without implementation claims, returning located defects, testable fixes, and matching before/after comparisons. Debug teleports and forced states are labeled subsystem probes. GPU identity, asset inventory, project conventions, references, and target input remain missing; completion and hardware performance cannot yet be certified.

## Skill application note

The skill requests project/reference inspection before architecture; this test explicitly restricted reads to the skill and relevant references. The brief therefore labels architecture provisional and makes audit the first implementation prerequisite. Browser-specific diagnostic examples require Godot equivalents but do not mandate browser technology. No other contradiction arose.
