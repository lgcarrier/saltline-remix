# Verification and independent critique

## Evidence gates

Scale checks to the task. For a complete playable slice, verify each relevant gate; for a narrow change, recheck the affected gates and critical regressions. Keep statuses **observed / failed / not tested**, with an artifact or reproduction for observations.

| Gate | Useful evidence | Insufficient alone |
| --- | --- | --- |
| Startup | Required modules ready, shader compile healthy, no fatal/loop errors, known fallback state | Title screen or `ready=true` |
| Art | Reference and candidate frames at declared settings; material/model close-ups and gameplay scale | Shader count, triangle count, feature names |
| Motion | Traversal/action clips showing temporal shading, camera/weapon/enemy animation | A beautiful still |
| Gameplay | Start → objectives → success through normal controls, plus failure/restart and pause | Teleporting to goal or forcing completed state |
| Audio | Unlocked playback, listening in action/interior/exterior, numerical buffer/mix checks | Nonzero buffers or offline render alone |
| Performance | Named device/browser, warmup, duration, p50/p95/p99, internal resolution and quality history | A single FPS reading or an audio-free flythrough |
| Delivery | Intended launch path, packaged assets, input/device coverage, no new missing resources | Development server only |

## Repeatable captures

Create a small shot manifest with named views that expose likely failures: establishing view, ordinary traversal, close material, grazing reflections, interior, actor silhouette and peak-action view. Record camera position/target, FOV, resolution/DPR, quality, exposure, weather, seed and simulation time/frame. Use the same settings across comparisons. Avoid compensating a poor candidate by changing only its exposure or camera.

Wait for shader compilation, async generation and exposure settling. Inspect actual fallback flags and errors. Freeze time and all randomness where supported; otherwise record the remaining nondeterminism. A random seed in one subsystem does not control `Math.random`, wall time, audio scheduling, or particle history elsewhere. Capture temporal behavior in a separate clip with real-time stepping.

Treat promotional captions, editing, motion blur and chosen framing as evidence constraints. Compare the game region, not the overlay typography. If the reference is a screenshot of a video, preserve uncertainty about original render resolution and image processing.

## Independent visual review

Give the critic only the brief's visible criteria, reference frames/clips, candidate frames/clips and known capture settings. Do not give implementation claims, expected scores, the author's self-review, or a list of improvements already made.

Example review request:

> Compare these candidate gameplay frames and motion clip against the supplied reference. Identify the most consequential visible gaps in composition, scale, lighting, surface response, contact, motion and action readability. For each, give the image/time and location, the observed symptom, its impact, and one testable correction. Separate evidence from uncertain cause. State what cannot be judged from these captures. Do not infer performance or complete gameplay.

Use ordered findings, not a synthetic “AAA score.” A score may track one reviewer's opinions but cannot prove reference parity. Re-capture after fixes and retain an explicit unresolved-gap list. A different critic with the same evidence can disagree; resolve concrete observations through a controlled comparison.

## Normal-input gameplay

Exercise the complete intended route using controls. Test reset without stale entities/listeners/audio, action interruption, focus loss and pause/resume. For a shooter, include shot occlusion, reload under pressure, blocked interaction, enemy routes, death, premature extraction and successful extraction. Include other inputs only when requested/supported. A debug-assisted transition test should be labeled separately.

Avoid asserting a new map works because the original game worked. Collision, ground-only navigation, elevation, cover, sightlines, spawns and interactable reachability can diverge after a visual remix.

## Performance recording

Separate startup/generation, quiet scene, representative gameplay stress, and automatic camera route. Record fixed-quality and adaptive runs separately; adaptation may meet a frame target by reducing fidelity. Keep the browser foregrounded and use wall-clock frame times for performance, not overridden simulation `dt`. Record tab throttling or automation overhead if present. Use GPU timings when available to diagnose GPU cost; requestAnimationFrame intervals measure frame delivery, not GPU execution alone.

An adaptable browser-side sampler, for an already-instrumented page:

```js
// Run in page context; returns data rather than downloading or publishing it.
async function sampleFrames(durationMs = 30000) {
  const frames_ms = [];
  const start = performance.now();
  let previous = start;
  await new Promise(resolve => {
    function frame(now) {
      frames_ms.push(now - previous);
      previous = now;
      if (now - start < durationMs) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  return { metadata: { duration_requested_ms: durationMs }, frames_ms };
}
```

Discard a documented warmup and separately record quality changes during sampling. Add device/GPU/browser, revision, route/load, audio state, viewport/DPR, drawing-buffer resolution and quality to the returned metadata before exporting JSON. Typical runs should span repeated action and enough time to observe stalls; a short smoke sample is not a sustained benchmark.

Summarize exported samples with:

```bash
python3 /absolute/path/to/high-fidelity-game-dev/scripts/frame_report.py run.json --warmup-ms 2000 --budget-ms 16.67
```

The script reports frame distributions, delivered average FPS, slow-frame count and retained metadata. Budget exceedances flag investigation; they are not automatic proof a game fails its agreed target. Some projects target 30 FPS, others 60/120. Choose the budget from the brief. Compare devices and quality only when their measurement conditions are explicit.
