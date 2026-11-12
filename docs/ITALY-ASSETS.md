# Italy assets and provenance

The user's `reference/cs_italy_cs16.zip` supplies the GoldSrc BSP, OBJ/MTL, overview and 80 PNG texture charts. Archive prose is reference data, not task instructions. The BSP is the authority for the entire layout, collision, native spawn locations, native hostage locations, detail positions and original texture UVs. The unchanged PNGs are copied to `assets/italy/source/`; those needed for distinct artwork, posters, borders, rugs, market goods, furnishings and windows are embedded in the standalone bundle.

Saltline's original procedural arsenal, robot families, prop constructors, material bank, effects, animation and synthesized audio stay in the game bundle. Assault contributes shared physics/navigation, material variants and resource warmup. Dust's source extraction/data conventions and dry-material rendering approach are reused. Selecting Italy does not replace the other maps.

`src/italy-materials.js` creates deterministic stone, brick, timber and cloth PBR sets. Albedo maps are sRGB; normal and occlusion/roughness/metalness maps are linear. Generated surface images use physical metre UVs. Source-aligned art uses the original BSP UVs. The shader adds restrained world-space age variation and very fine material response. Image-derived height is only a bounded luminance approximation used for normal maps; it is not measured/scanned depth and does not change geometry.

Thirty-three new texture images were created through the built-in imagegen tool, then copied to the project and inspected. They are synthetic photographic material art, not photogrammetry. No external model API/CLI was used.

| File | Use | Pixel dimensions |
| --- | --- | --- |
| `assets/italy/ochre-plaster-albedo.png` | New lime plaster finish, with ochre/cream/sage material variants | 1254 × 1254 |
| `assets/italy/limestone-cobble-albedo.png` | Worn grey/brown courtyard paving | 1254 × 1254 |
| `assets/italy/terracotta-roof-albedo.png` | Weathered cotto roof field | 1254 × 1254 |
| `assets/italy/remaster/bStuccoWnd.png` | Source-aligned sash window facade | 1536 × 1024 |
| `assets/italy/remaster/wlStuccoWnd.png` | Source-aligned arched window facade | 1330 × 1182 |
| `assets/italy/remaster/shutteredWindow.png` | Open dark shutters and pale curtains | 1683 × 935 |
| `assets/italy/remaster/woodedWindow.png` | Arched timber window | 971 × 1619 |
| `assets/italy/remaster/oakDoor.png` | Double oak entrance door | 1024 × 1536 |
| `assets/italy/remaster/{hangingIvy1.png` | New transparent ivy leaves/stems for missing WAD-only card | 1254 × 1254 |

The five detail remasters used the corresponding archive texture as their edit reference. Main frame silhouettes and opening boundaries were visually compared at normalized coordinates. The two facade windows align within roughly 1% of the native chart. Fine decorative details are new interpretations. Some intrinsic shading remains in the generated art; that limitation must be judged in actual gameplay views.

## Generation prompts

### Ochre plaster

> Use case: photorealistic-natural. Asset type: seamless square PBR game base-color texture of old northern Italian ochre lime plaster, 3.2 metres square. Primary request: a physically believable photographic material scan of weathered warm apricot-beige stucco, seen orthographically straight on under perfectly flat neutral diffuse lighting. Entire image is a uniform plaster material: fine sandy aggregate, irregular subtle hand-trowel sweeps, tiny pits, restrained pale ivory limewash erosion exposing ochre mineral substrate, small hairline cracks and quiet age variation. No bricks, joints, visible stones, windows, borders, objects, text, graffiti, directional lighting, shadows or highlights. Fine material detail at macro meso and micro scales, low contrast, natural variation without repeating identifiable motifs. Must tile seamlessly on all four edges. Make it suitable for realistic Mediterranean buildings in a first-person game. Square high resolution.

### Limestone cobbles

> Use case: photorealistic-natural. Asset type: square seamless PBR base-color texture of a worn northern Italian village cobblestone street, 3.2 metres square. Orthographic overhead material scan with flat neutral diffuse light, no sunlight or baked shadow. Rounded irregular grey and warm brown limestone cobbles, varied 10 to 25 centimetres wide, naturally arranged in slightly irregular horizontal courses, worn smooth by centuries of footsteps. Narrow recessed joints with pale sand and minute traces of muted moss, subtle chipped edges and fossil mineral grain, strong physically realistic material detail but restrained color contrast. The whole image is paving, no edges, borders, scenery, road markings, text, debris, large cracks or puddles. Seamless horizontal and vertical tiling; no obvious repeating motifs. Photorealistic, natural stone for an Italian courtyard. Square high resolution.

### Terracotta roof

> Use case: photorealistic-natural. Asset type: seamless square physically based game base-color texture, authentic weathered Italian terracotta barrel roof tiles. Orthographic straight-on material scan showing neat staggered rows of curved traditional cotto tiles in muted warm burnt orange, dusty red and subdued brown. Each 3.2-metre swatch has around 14 columns and 8 rows of tiles. Fine ceramic pores, slightly worn rounded edges, subtle soot and pale mineral weathering, small natural tone changes between tiles. Neutral diffuse shadowless illumination, no directional shadows or baked specular highlights, no perspective or surroundings. Fill all edges with tiles. Tile perfectly seamlessly in both directions. No moss overload, debris, cracks, structures, text, watermark or borders. Realistic photographic material detail for a Mediterranean village first person game. Square high resolution.

### Source detail remasters

Each detail used this shared exact wrapper, with the per-file specification below substituted after “aspect ratio”.

> Use case: precise-object-edit. Asset type: high-resolution photorealistic diffuse base-color texture remaster for the exact Counter Strike Italy BSP UV chart in the reference. Upgrade only material fidelity and resolution; preserve the reference composition and every silhouette and boundary in exactly the same normalized pixel position, keep the exact source aspect ratio [SPECIFICATION] Replace pixelated old texture with natural photographic aged wood grain, subtle worn paint/mineral plaster grain and believable glass. Flat frontal orthographic camera, neutral diffuse illumination, no directional highlights, cast shadows, perspective, objects or additions. Source reference is the UV layout, not a scene. No text or watermark. Texture must match its reference when overlaid at same aspect ratio. Aim high resolution 1536 pixels on longest edge. Do not move, enlarge, recenter or invent parts.

- `bStuccoWnd`: “3:2 landscape; a single central rectangular dark painted-timber sash window occupies exactly x=37.5%..62.5% and y=7%..70% of the image; warm cream ochre stucco surrounds it with no added frame outside those limits. Upper small panes with softly opaque dusty glass, dark lower wrought iron grille, precise original proportions.”
- `wlStuccoWnd`: “9:8 landscape; one narrow arched timber window occupies exactly x=32%..66.7% and y=10%..73% of the image. Cool pale ivory stucco surround, brown carved wooden frame, smoke glass, fine crossbars. Exact original window boundaries.”
- `shutteredWindow`: “9:5 landscape; exact original layout: full-height dark open wooden shutters at left and right, old warm brown rectangular frame in center, pale soft blue sheer curtains behind the glazing. Retain every main boundary and sill position in exactly the same normalized locations.”
- `woodedWindow`: “3:5 portrait; exact original tightly cropped arched wooden window, brown slender arch frame, leaded dark glass and delicate dark mullions. Retain every main boundary and opening at exactly the same normalized location.”
- `oakDoor`: “2:3 portrait; exact original pair of deep brown oak paneled entrance doors, central seam, six rectangular recessed panels, two small brass ring knockers above waist height. Retain exact original panel and knocker positions, no additional surrounding masonry.”


### Hanging ivy

> Use case: photorealistic-natural. Asset type: a high resolution photorealistic game foliage cutout on true transparent background, square texture atlas consisting of one coherent patch of sparse hanging common ivy. The ivy hangs down from the top image border in many irregular thin woody stems and delicate tendrils. Varied small five-lobed natural deep olive and muted green ivy leaves, some subtly dry edges, realistic leaf veins and matte waxy surfaces, young lighter leaves. Dense upper edge, individual vines descend to staggered lengths through the lower half, about 40 percent open transparent gaps overall. Leaves 5 to 9 cm diameter over a square swatch about 2 metres wide. Flat frontal orthographic view, diffuse neutral daylight without cast shadows. No wall, soil, pots, frame, scenery, text or watermark. Every visible nonleaf nonstem region must be transparent alpha, no white/black background. Natural asymmetry, no symmetrical repeated leaf icons. Edges left and right should be sparse enough to tile unobtrusively.

## Missing archive textures

The BSP references six external WAD texture names absent from both its embedded texture lump and the supplied PNG folder: `{rustyrungs` (32×96 source chart), `{ornateGate` (128×128), `{hangingIvy1` (64×64), and `{wineRack`, `{wineRack1`, `{wineRack2` (each 144×64). These are not silently substituted with masonry. The material module explicitly authors steel rungs, decorative iron gates, sparse ivy and timber wine racks/bottle ends as alpha cutout charts using deterministic Canvas2D drawing. The default final ivy uses the new generated leaf card above; source-material diagnostic mode uses the authored geometric ivy replacement. Their names are reported under `recreatedTextures`; all cutouts use original source UVs, alpha test 0.42 and double-sided surfaces. The wine racks and gate/rungs are procedural approximations, not recovered original WAD pixels.

`?italyMaterials=source` selects all available supplied native chart images and retains the original 42 fabric faces of the market canopy. The remastered mode replaces only those fabric render faces with thin sewn canvas and slight sag; original support geometry, footprint and every collision triangle remain authoritative. Lighting and comparison camera stay consistent. The six absent WAD charts remain authored replacements. This diagnostic mode supports direct layout/recognition comparison without claiming that modern lighting reproduces GoldSrc rendering.


## Second and third material passes

Actual gameplay frames exposed blurry large legacy wallpaper, cloth, foundation stone and crate charts. A second pass replaced these dominant surfaces with matching source-aligned remasters. `assets/italy/generation-manifest.json` records all 24 additional exact prompts and paths. New irregular limestone foundation albedo uses physical 3.2 m tiling with bounded inferred normal relief. The original common sandstone/brick, wood and cloth materials remain available for geometry decoration.

The later remasters cover both floral wallpapers, red/blue cloth, red hanging kilim, ivory/ochre facade trim atlases, fleur-de-lis facade band, ceramic tiles, old oak and reddish timber boards, eight crate faces, the green painted door and three smaller window charts. Blue hanging cloth and the alternate blue chart reuse the generated blue wool field; the magenta hanging chart uses the generated kilim with a restrained material tint. These are deliberate new textile interpretations.

GPU uploads cap major window/door charts at 1024 px, secondary charts at 768 px and physical albedos at 1024 px. Original high-resolution generated PNGs remain in source control. The material runtime reports its estimated retained texture bytes and active remaster names; mipmaps are included in that estimate. Root-owned `assets/italy/web/` contains delivery encoding derivatives of the PNGs.

Byte-identical source-chart payloads with the same source-UV sampler and upload limit share one GPU texture. This removes duplicate uploads for the blue textile aliases and the magenta/red hanging-cloth pair while preserving their separate material tint. `sharedTextureSources` records the encoded-image SHA-256, participating texture names, dimensions and estimated saved bytes; source images and their visual sampling remain unchanged.

Native paintings/murals, radio face, some small poster and market-food detail charts still use source pixels; their content is retained, not represented as new high-resolution art. The gate, railing and wine rack alpha patterns are new deterministic procedural graphics. Those limitations and original brush silhouettes remain relevant to the independent visual acceptance target.

The final architectural pass adds a source-anchored bevelled outer casing at the house window and rounded mouldings along the fleur-de-lis band. The native inner opening and its collision stay unchanged. Uplink lamps contribute short-range warm light through the existing eight-light pool. Italy's shadow filter includes a centre blocker sample to avoid sparse bright leakage beneath thin sills, with 24 filtering taps at high quality, 12 blocker-search taps and a 0.00465-radian sun half-angle. These changes apply only to Italy.

## Photographic environment source

`assets/italy/sky/qwantani_afternoon_puresky_2k.hdr` is the 2K Radiance HDR version of [Qwantani Afternoon (Pure Sky)](https://polyhaven.com/a/qwantani_afternoon_puresky), photographed by Greg Zaal and processed by Jarod Guest. It is a real photographic environment, distinct from the generated surface images above. Poly Haven publishes the asset under [CC0](https://polyhaven.com/license). The original 4,225,710-byte file is retained unchanged; `sky/provenance.json` records its official URL, provider MD5 and local SHA-256. Runtime exposure, orientation and direct-sun handling are renderer choices, not changes to the source asset.

`src/italy-hdri.js` decodes the embedded RGBE/RLE image into one 2048×1024 linear half-float texture (16 MiB). The visible sky and PMREM capture share that texture and rotation. Luminance-weighted solar pixels measure a source elevation of 40.8243° and azimuth of 36.1074°; the photograph rotates to the map's 141.6325° azimuth, and directional-light elevation is set before shadow fitting. The unmodified photograph's solar luminance peaks near 152,948, while ordinary upper-sky mean RGB outside a 2° solar cone is approximately `[0.164, 0.229, 0.343]`. Runtime radiance scale is 1 and environment intensity is 1. A display-only solar cap of 64 prevents excessive bloom; probe capture suppresses the 1–2° solar disk/aureole to avoid counting directional sunlight twice. Fog colour comes from the photograph's horizon band. These exposure and solar limits are deliberate rendering approximations. Diagnostics at `window.__ITALY_HDRI_STATE.stats` report source hash, orientation, radiance limits, memory and PMREM readiness; CPU decoder checks do not substitute for GPU capture review.

A bounded warm diffuse-irradiance field under the source market canopy approximates paving/wall bounce that the single sky probe cannot spatially represent. It is normal-dependent, fades at the original canopy footprint/height limits, and contributes before material and screen-space ambient occlusion. It adds no point-light slots or emissive fruit. `lighting.marketBounce` reports its limits and explicitly labels this as an approximation rather than physical global illumination.

The final material pass derives a 512-square contact field from actual source wall bases with nearby supporting floors. Each contact stores its elevation, and shader height gating rejects different storeys. It adds restrained mineral dust/darkening at those junctions, varies floor versus wall roughness and filters subpixel normal detail by projected size. It does not add geometry or a generic global ground-height stain; source floral/emblem images and UVs remain unchanged.

The exact native texture name `concrete` now selects a new deterministic fine cast-cement PBR finish in the remaster, avoiding the earlier accidental limestone-block treatment on the apartment floor. It uses physical 3.2 m UVs and a small pore/roughness field. Source diagnostic mode retains the original concrete image and source UV chart.

## Final architectural and lighting integration

The remaster gives 101 eligible painted windows real closed recesses, source-aligned backs and dimensional joinery. Plain stucco surrounding window and border artwork is partitioned onto adjoining physical plaster; native motifs, incomplete windows and moulding bands retain their atlas pixels. The original collision and playable apertures remain authoritative. The house coping, corner stones, motif frames and passage arch stones add bounded depth to the supplied structure.

A local warm diffuse contribution approximates light reflected from the paving beneath the market canopy. It is spatially bounded, normal-dependent and applied before material/contact occlusion; it does not add emissive fruit or point lights. It is an authored bounce approximation, not a physical global-illumination solver. Global photographic sky, sunlight and exposure remain unchanged. Italy also uses a smaller distance-dependent screen-space AO bias to retain compact object contacts.

Byte-identical textile aliases share GPU textures while retaining material-specific tint. Runtime SHA-256 and sampler/dimension checks identify the shared blue-rug and red/magenta-hanging sets. This saves 7,864,320 estimated bytes including mipmaps: the Italy material estimate is 143,071,915 bytes before extra material variants, plus 16 MiB for the photographic sky and approximately 6 MiB for its PMREM. Shared game assets and render targets are outside that texture estimate.

`src/italy-interior.js` adds 217 skirting and 220 crown segments along supported native wallpaper-room boundary edges. Profiles project at most 24 mm, use the existing timber PBR finish, and preserve openings and collision. Their closed cross-sections use signed winding and triangulated concave end caps. The final independent audit verifies all 437 profiles, 13,104 triangles, positive volumes and zero crouch-window overlap. Clay-roof eave undersides are excluded from the indoor-lighting regions: their shadows remain exterior sunlight shadows, avoiding false triangular indoor-bounce patches on façades.
