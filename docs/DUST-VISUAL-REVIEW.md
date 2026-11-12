# Dust visual review — 2026-11-11

**Photorealistic AAA art gate: not met.** The final frames show a readable desert remake with improved materials and recognizable Dust spaces. They still read as simplified game architecture rather than photographed physical environments. This is an art acceptance result, separate from geometry migration, mission testing and performance.

## Evidence and review independence

A fresh-context visual critic inspected the five final frames, their five preserved before frames, and the source overview. The critic received the visible target, images and capture settings, without source code or the implementation narrative. The scene integrator assembled this report from that critique and the capture manifests.

- [Final capture manifest](../output/playwright/dust/final-captures.json)
- [Preserved before manifest](../output/playwright/dust/before/candidate-captures.json)
- [Source map overview](../output/playwright/dust/reference-overview.png)
- Final HTML SHA-256: `808de0be78478c64ed92410170f2beb71633378e41d1cff4c40ed2c29be259b5`
- Source BSP SHA-256: `ac94fbda94e4a170b971f05936fe8706cb9aa895e55f7797916dc160171cab11`

The overview is an original-map layout reference. It is not a photorealistic target photograph or a source gameplay frame at a matching camera. Exact visual parity with the original has therefore not been established by this image review.

## Capture conditions

The images are staged, paused environment captures with the weapon and HUD hidden. They are not normal-input gameplay evidence.

| Setting | Recorded value |
| --- | --- |
| Viewport and actual render buffer | 1600 × 900 |
| Browser | Headless Chrome 157 |
| GPU reported by browser | ANGLE Metal Renderer: Apple M1 Max |
| Seed | 4207 |
| Quality | High; render scale 1; MSAA 4; shadows 4096 |
| FOV / exposure multiplier | 74° / 1 |
| AO / bloom / motion blur setting | Enabled / enabled / enabled; paused stills cannot judge motion blur |
| Rain | 0 |
| Render path | Advanced pipeline, soft shadows enabled |
| Final capture time | 4.216–9.532 simulation seconds across the five frames |

The paired camera transforms, FOV, exposure multiplier and quality settings match exactly. Simulation times differ between the before and final captures, so moving enemy placement is not a controlled before/after comparison. The recorded instantaneous FPS values do not establish sustained performance.

| View | Camera position → target | Before / final |
| --- | --- | --- |
| T spawn | `(29, -1.55, -86.6)` → `(4, 1.8, -86)` | [Before](../output/playwright/dust/before/candidate-t_spawn.png) / [Final](../output/playwright/dust/final-t_spawn.png) |
| Underpass | `(-26, -3.2, -26)` → `(-26, -2, -52)` | [Before](../output/playwright/dust/before/candidate-underpass.png) / [Final](../output/playwright/dust/final-underpass.png) |
| Tunnel | `(0.2, 2.5, -45)` → `(1, 2.2, -31)` | [Before](../output/playwright/dust/before/candidate-tunnel.png) / [Final](../output/playwright/dust/final-tunnel.png) |
| Site B | `(33, 1.68, -16)` → `(49, 2, -16)` | [Before](../output/playwright/dust/before/candidate-site_b.png) / [Final](../output/playwright/dust/final-site_b.png) |
| Site A | `(1, 3.3, 35)` → `(12, 3.2, 44)` | [Before](../output/playwright/dust/before/candidate-site_a.png) / [Final](../output/playwright/dust/final-site_a.png) |

## Observed improvement

The final plaster surfaces and dusty road give the setting a clearer desert identity than the previous nearly continuous block wall and grey pavement treatment. Crate rims and corner fittings are more legible, and the tunnel floor and arch are easier to distinguish. The sun direction and major shadow placement remain coherent across the exterior views. These improvements do not establish the requested overall fidelity target.

## Ranked remaining findings

1. **Architecture lacks close-range construction detail.** In the final T-spawn frame, the foreground left corner and both wall tops remain perfectly straight, sharp planes. The foreground tunnel arch is similarly planar. These are visible fidelity limitations. Add restrained bevels, localized chips and plaster thickness within the existing silhouette and collision envelope. Re-capture close and grazing-angle views: edges should catch believable highlights without changing opening widths, cover heights or route boundaries.

2. **Materials remain too uniform across large surfaces.** The right façade at site B and the long T-spawn walls show similar plaster variation across their full height. Foreground crates in the underpass and tunnel have broad, nearly uniform dark boards. Add dust and weathering tied to ledges and exposure, restrained plaster repairs, wood grain and wear concentrated around joints. Check both gameplay and close distances; variation should follow construction without obvious repeated patches or reduced opponent visibility.

3. **Ground transitions read as adjacent texture assignments.** At site B, the road-to-pale-sidewalk diagonal across the lower left is abrupt and mechanically straight; the left edge of the underpass road has the same issue. The ground remains visibly flat despite its improved texture. Add shallow edge breakup, localized sand accumulation and restrained microrelief while preserving the walkable surface. Low-angle captures should show coherent transitions and contact at walls and crates with unchanged traversal.

4. **Contact shading and interior light still need refinement.** The tunnel's left arch junction has a large dark vertical wedge, and the ceiling edges carry broad dark bands. The lamp makes a concentrated glow against relatively uniform dim fill. Similar heavy seams appear at the underpass bridge's upper wall joins. The images establish this appearance issue, not its rendering cause. Inspect the joins under several light directions, reduce excessive seam darkening and refine localized indirect light. A moving-camera capture should retain contact without broad black smears while keeping crates and exits readable.

5. **The surrounding world is sparse.** Much of the upper half of site A and site B contains a smooth sky above clean rooflines, with little distant context. Add restrained distant architecture, atmospheric depth and noninteractive roof detail outside tactical sightlines. Matched wide views should suggest a continuous place while preserving native landmark silhouettes and visibility.

All five findings are art-production or rendering-quality gaps. None is labeled a verified gameplay or runtime defect. The architecture remains visibly consistent between the paired captures, but these five views and the overview cannot certify complete layout or dimension fidelity.

## Limits of this review

No image establishes collision, traversal, objective reachability, combat fairness, enemy navigation, audio quality, frame pacing or a complete mission. Temporal shimmer, animation, dynamic shadow stability and texture minification during movement require clips or live play. No physical display/device test was performed by this visual critic. A matching photographic reference set is still needed for a defensible photorealism comparison.

The visible remaining issues are art and rendering gaps. The stills do not prove a new runtime bug or justify hiding the incomplete art gate behind successful startup or automated geometry checks.

## Third pass — bounded follow-up on the polished captures

The same fresh-context critic performed a read-only follow-up; the scene integrator also inspected the captures. This follow-up preserves the preceding independent assessment of the earlier snapshot. It inspects only [site B](../output/playwright/dust/polished-site_b.png), [underpass](../output/playwright/dust/polished-underpass.png) and [T spawn](../output/playwright/dust/polished-t_spawn.png), against the corresponding `final-` frames. It does not reassess the tunnel, site A, motion or gameplay.

The [polished capture manifest](../output/playwright/dust/polished-captures.json) records HTML SHA-256 `f89fb0780efa806704b7e4cb598ba7a749c862819cd48548b18bf187b33f1cee`. All three camera transforms, FOV, exposure multiplier and quality presets match the preceding snapshot; the actual render buffer remains 1600 × 900. The frames remain paused captures with different simulation times, so actor positions are excluded from the comparison.

- **Ground transitions improved.** Site B's lower-left road edge now blends into the pale surface through a narrow dusty transition. The underpass's left road edge likewise reads less like a perfectly cut texture boundary. This partially addresses finding 3; it does not add visible three-dimensional breakup to the flat ground.
- **Contact is stronger, with a remaining caution.** The foreground underpass crate's base and lower boards appear better grounded. Some darkening remains a broad band across the boards; another view is needed to judge whether it follows natural contact.
- **Shadow improvement is modest.** T spawn retains a clear sun/shade boundary and a readable route, with no major new shadow defect visible in these three frames. Stills do not establish temporal stability or prove the cause of a previous artifact.
- **The main art gaps remain.** T-spawn corners and wall tops remain sharply planar, plaster and crate faces still lack convincing location-specific wear, and the wide site B view retains sparse roof and distant-world context. The heavy wall/bridge join at the underpass remains visible. The uninspected tunnel finding is unchanged pending a matched follow-up.

**Photorealistic AAA art gate remains not met.** The latest pass improves specific ground and shading defects. It does not materially change the overall assessment of geometry detail, large-surface variation and environmental density.

## Release snapshot — five-view follow-up

The fresh-context critic and scene integrator inspected all five release frames. This assessment preserves the earlier snapshots rather than retroactively changing their findings. The [release manifest](../output/playwright/dust/release-captures.json) records HTML SHA-256 `0217a300608800dc75a2360f9d135680c7840710f0b160bf8a8fe26e3ed227ee`. These remain staged, paused captures at the same five camera transforms, 1600 × 900 render buffer, 74° FOV, exposure multiplier 1 and high preset. Simulation times span 4.165–9.431 seconds; moving actors are excluded from the comparison.

| Release view | Bounded visual observation |
| --- | --- |
| [T spawn](../output/playwright/dust/release-t_spawn.png) | The route, warm plaster and dusty ground remain readable. Near corners, wall tops and long façades retain conspicuously sharp edges and broadly uniform treatment. |
| [Underpass](../output/playwright/dust/release-underpass.png) | The improved road-edge blend and crate grounding remain visible. Heavy bridge-junction shading and the dark band across the crate's bottom boards persist. |
| [Tunnel](../output/playwright/dust/release-tunnel.png) | The floor, arch and exit are readable, but the large dark wedge beside the left arch and broad ceiling/base bands remain conspicuous. This is an unresolved rendering-quality defect; the still does not establish its cause. |
| [Site B](../output/playwright/dust/release-site_b.png) | Secondary buildings and a tower now suggest a settlement beyond the wall. Sky remains visible above the native foreground rooflines; no dominant smooth terrain sheet crowds this view. The foreground right façade and distant blocks still read as simplified geometry. |
| [Site A](../output/playwright/dust/release-site_a.png) | Towers, a dome and distant rooflines improve continuity beyond the perimeter. Their simple forms and similar tones provide only limited depth and atmospheric separation. |

The previous sparse-surroundings finding is partially addressed. The added settlement is secondary to the foreground map, and the reviewed release views show no obvious new foreground obstruction or material regression. The rejected intermediate `architecture-` terrain captures are not the release evidence. These five stills cannot establish exact native silhouette, scale or route preservation.

The remaining work, ranked by visible impact, is:

1. **Physical architecture and asset fidelity:** near wall corners, parapets, bridge joins and tunnel arches remain planar and mechanically sharp. Background buildings and foreground crates need convincing construction thickness, restrained edge detail and component variation.
2. **Interior contact and light:** the tunnel's black arch wedge and broad ceiling/base darkening remain a prominent rendering defect. A controlled lighting comparison and moving-camera check are needed before claiming this corrected; more texture detail would not resolve it.
3. **Material behavior and ground relief:** large plaster and timber surfaces remain too uniform, and weathering does not consistently follow exposure, joints, repairs or handling. Dust blends now soften road boundaries, but shallow relief and localized sand accumulation remain limited.
4. **Distant depth:** the settlement improves place continuity, but its simple geometry, sparse secondary detail and similar tonal treatment do not yet supply convincing atmospheric depth.

**Photorealistic AAA art gate: still not met.** The release materially improves the perimeter context while preserving the preceding road/contact improvements. It remains a recognizable, playable-looking desert game environment with visible architecture, material and lighting gaps. “Playable-looking” is only a visual description: this review certifies no gameplay, collision, mission, audio, performance or temporal-rendering result. Those require separate evidence.

## Verified snapshot — bounded AO correction

A controlled same-session tunnel comparison tested [original AO](../output/playwright/dust/ao-original.png), [restrained AO](../output/playwright/dust/ao-restrained.png) and [AO disabled](../output/playwright/dust/ao-disabled.png). The scene integrator and independent critic both prefer the restrained treatment: the conspicuous black arch wedge and wide floor/ceiling bands recede, while subtle wall-floor, ceiling-corner and crate-frame separation remains. Disabling AO removes the bands but makes these contacts visibly flatter. The restrained parameters are radius `0.28`, intensity `0.65`, strength `0.50`, replacing `0.5`, `1`, `0.8`.

The [verified capture manifest](../output/playwright/dust/verified-captures.json) records the rebuilt HTML SHA-256 `51771948991e36bbffad514db2405da1d62c245581021bc28f50abcc88800cc7`. The scene integrator inspected [T spawn](../output/playwright/dust/verified-t_spawn.png), [underpass](../output/playwright/dust/verified-underpass.png), [tunnel](../output/playwright/dust/verified-tunnel.png), [site B](../output/playwright/dust/verified-site_b.png) and [site A](../output/playwright/dust/verified-site_a.png). Camera transforms, 1600 × 900 buffer, 74° FOV, exposure multiplier 1 and high preset match the release snapshot; simulation times are 4.197–9.447 seconds. The tunnel in this rebuilt set is darker overall than the same-session diagnostic images, so that experiment's brighter appearance is not attributed to the rebuild.

The independent critic also compared the rebuilt tunnel, underpass and site B directly with their release frames. The rebuilt tunnel substantially reduces the left arch wedge and broad ceiling/base bands. Underpass wall-junction seams and the foreground crate's heavy bottom-board band are reduced; the crate is less artificially outlined, with slightly weaker ground contact. Site B's dark vertical façade seam is reduced, while ground blending, skyline and route readability remain consistent. The five exterior/interior views show no obvious new foreground obstruction or material regression. This addresses much of the specific excessive-contact-shading finding at these cameras; it does not prove that every contact artifact or motion-dependent AO issue is fixed.

**Photorealistic AAA art gate remains not met.** The leading visible gaps are now physical construction and edge detail, location-specific plaster/wood variation, shallow ground relief and distant atmospheric depth. The preceding release findings remain valid for their recorded snapshot; the excessive-band finding is reduced in this later snapshot. All still-image limits above continue to apply.
