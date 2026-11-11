# Art, materials, and rendering

Use this reference when developing a scene's visual quality or diagnosing a rendering gap.
Keep the user's engine, genre, art direction, and asset strategy. These principles apply to
authored assets, procedural assets, and hybrids; they do not require a custom engine or an all-code pipeline.

## Establish the scene's physical and visual contract

- Fix world units, up/forward axes, player or camera scale, asset pivots, and viewing distances.
- Define the target display size, internal resolution, hardware class, and frame-time budget.
- Name a few representative views: establishing composition, typical play, close detail,
  difficult lighting, and a worst-case encounter. Preserve camera transforms for comparison.
- Select a coherent palette and light direction. Describe where the eye should go and how
  important objects remain readable against the background in both still frames and motion.
- Establish a small reference scene before expanding the asset catalog. Include neutral forms,
  a representative hero object, ground contact, shadow edges, and a surface viewed at grazing angles.

## Build form at the scale where it is seen

- Spend geometry on silhouette, openings, edge curvature, and forms that produce meaningful
  parallax or shadows. Use normals for detail that does not need to alter the silhouette.
- Preserve recognizable proportions before adding fasteners, grooves, wear, or surface noise.
  Size bevels to catch the intended lighting at the intended viewing distance.
- Separate macro form, meso construction details, and micro surface response. A dense mesh with
  weak proportions or uniform materials will still read as an unfinished object.
- For procedural assemblies, use a small set of construction helpers with explicit dimensions,
  transforms, material slots, collision metadata, and seeds. Parameterize meaningful variations.
- Merge static geometry by compatible material and spatial region, or instance repeated assets.
  Avoid a single level-wide mesh that prevents useful culling. Keep animated parts, independent
  interaction targets, transparent sorting, and collision representation separate where needed.
- Count draw calls, shadow work, overdraw, and memory alongside triangles. Geometry reduction
  does not necessarily improve a frame dominated by fill rate, shader cost, or draw submission.

## Author material behavior, not noise coverage

- Define texture scale in physical units and relief strength independently of map resolution.
  A resolution change should not make corrugation, fabric weave, or normal strength change size.
- Document channel packing once. A common **ORM** convention is **R = ambient occlusion,
  G = roughness, B = metalness**; adapt to the engine instead of assuming every pack uses it.
- Keep base-color transfer encoding distinct from data maps. Roughness, metalness, AO, height,
  masks, and normals are data; do not accidentally apply the base-color color-space conversion.
- Choose macro variation for placement and age, meso patterns for construction and damage,
  and micro variation for grain and reflection breakup. Retain quiet areas between details.
- Make wear causal: paint chips reveal primer and substrate; exposed metal can oxidize;
  dirt gathers at contacts and recesses; runoff follows gravity; repeated contact polishes.
  Change roughness, normal relief, and metalness consistently with the visible material layer.
- Use orientation, exposure, shelter, height, and gameplay state to drive environmental response.
  Wetness may darken diffuse color, smooth small normals, and lower roughness by different amounts
  on different materials. A wet crate, painted metal panel, and puddle should not share one gloss value.
- Break obvious repetition with world or object masks, seeded variation, decals, and selective
  vertex variation. Keep frequency and contrast low enough that nearby detail remains legible.
- Test tile seams, physical scale, grazing highlights, magnification, and distant minification.
  Address shimmer through mipmaps, appropriate filtering, normal-variance roughness, or reduced
  subpixel detail before trying to conceal it with blur or grain.

## Separate static generation from runtime response

- Bake expensive static procedures when their results can be reused. Keep time-dependent effects,
  damage state, wetness, animation, and interactions in the runtime portion of the material.
- A GPU bake can compute related outputs together with multiple render targets where supported.
  Account for later conversions, copies, mip generation, and upload costs when reporting startup work.
- Cache by the parameters that actually affect the result, including seed, resolution, and format.
  Reuse shader programs and immutable textures; dispose of intermediate targets after their last use.
- Derive normal slopes using the physical height scale and sample spacing. Increasing texture
  resolution without compensating for spacing can silently alter the apparent relief.
- Track generation time, retained texture memory, temporary peak memory, and shader compilation.
  Use progress feedback or staged prewarming when startup work is noticeable.
- Treat procedural materials as one asset option. Prefer existing engine tools or authored assets
  when they achieve the desired result with less complexity or better art control.

## Make lighting and surface response agree

- Align key lights, sky highlights, environment illumination, fog, reflective surfaces, and particles.
  A bright sky opening and an unrelated directional light can make individually good assets look wrong.
- Give metals something meaningful to reflect. Test diffuse and reflective reference objects together.
- Avoid counting a bright light source twice through both its environment representation and an
  explicit light; use the renderer's established approach to environment and direct illumination.
- For materially different interiors, evaluate local probes or the engine's local illumination
  facilities. An outdoor environment reflected unchanged inside a closed room often breaks the scene.
- Tune contact, penumbra, bias, and shadow range together. More shadow samples cannot repair
  an inappropriate light frustum or badly scaled bias.
- Custom shadow patches are an optional response to a demonstrated limitation. If used, pin and
  check the dependency interface, test compilation, restore state on failure, and retain a fallback.

## Integrate the render chain deliberately

- Preserve a clear order: scene lighting in linear/HDR space, relevant lighting composites and
  optical effects, exposure/tone mapping, then display encoding and appropriate final treatment.
  Avoid duplicate tone mapping or color-space conversion between passes.
- Add effects to solve visible problems. Compare each costly pass enabled and disabled from the
  same camera before keeping it. Bloom, haze, grading, and grain cannot replace good form or lighting.
- Use depth-aware filtering when reducing the resolution of AO or volumetrics. Inspect contact
  edges, thin geometry, foreground silhouettes, and bright surfaces for halos or light leakage.
- Match motion blur and temporal effects to available motion information. Camera reprojection
  alone does not describe independently moving objects; test those objects explicitly.
- For first-person games, define the relationship between world and viewmodel cameras, FOVs,
  depth, lighting, and post effects. A near-depth convention or separate pass must be understood
  by AO, blur, reflections, and compositing so the weapon does not contaminate world effects.
- Choose reflection methods for the scene. Planar reflections suit largely flat surfaces but
  add scene-render cost and clipping constraints. Probe and screen-space approaches have different gaps.
- Keep stable shader identifiers, meaningful error reporting, and subsystem toggles. Test a basic
  forward or reduced-effects path when advanced features depend on fragile capabilities.

## Share environmental meaning with gameplay

- Define a common surface query for material category, wetness, water depth, or other relevant state.
  Use it for footsteps, impacts, particles, and interaction logic instead of unrelated approximations.
- Let visual detail enrich the shared field without claiming pixel-perfect agreement. If shaders add
  detail or use different filtering, define a tolerance and test boundaries that players can notice.
- Share the parameters of animated surfaces when gameplay depends on them. For example, buoyancy
  or floating props should sample a compatible wave model rather than an unrelated sine animation.

## Profile and degrade quality predictably

- Record hardware/browser or engine build, viewport, internal resolution, quality settings, scene
  state, warmup, and frame-time distribution. Separate CPU/GPU timings when the tools support it.
- Distinguish unique scene geometry from accumulated triangles rendered across shadows, reflections,
  and other passes. A frame's triangle counter alone is not a performance target.
- Establish where time is spent before optimizing. Lowering resolution mainly helps pixel work;
  it will not resolve every simulation, submission, startup, or memory bottleneck.
- Build quality tiers around expensive subsystems: reflection resolution, volumetric steps, shadow
  resolution/update rate, AO, particle density, and render scale. Protect gameplay and HUD readability.
- Adaptive resolution needs warmup, a measurement window, separate up/down thresholds, and slower
  recovery after degradation. Add a floor and an intentional response when the floor is insufficient.
- Disable adaptation for controlled visual comparisons, then test it during ordinary play. Report
  the actual internal resolution and tier beside results so adaptive changes do not hide regressions.
- Judge temporal stability, exposure transitions, readability, and frame pacing separately from
  screenshot appeal. Save representative before/after captures and measured costs for accepted changes.
