/* Preserve the light inventory and every nonzero lighting contribution while
 * avoiding BRDF evaluation for finite-range lights that contribute exactly 0.
 * Install before the level is compiled. The A/B switch is for paused profiling;
 * it invalidates shader programs, so compilation/settling is not benchmark time.
 */
function assaultPerformance(i) {
  if (i.assaultPerformance) return i.assaultPerformance;
  const chunks = i.THREE.ShaderChunk;
  const original = chunks.lights_fragment_begin;
  const marker = 'ASSAULT_ZERO_LIGHT_GUARD';
  const directCall = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  if (original.includes(marker)) throw new Error('Assault direct-light guard installed twice');
  let optimized = original;
  for (const [family, next] of [['POINT', 'SPOT'], ['SPOT', 'DIR']]) {
    const start = optimized.indexOf('#if ( NUM_' + family + '_LIGHTS > 0 ) && defined( RE_Direct )');
    const end = optimized.indexOf('#if ( NUM_' + next + '_LIGHTS > 0 ) && defined( RE_Direct )', start);
    if (start < 0 || end <= start) throw new Error('Missing ' + family + ' light shader section');
    const section = optimized.slice(start, end);
    if (section.split(directCall).length !== 2) throw new Error('Unexpected ' + family + ' direct-light call count');
    // Three already defines visible from the attenuated RGB value. The shadow
    // path uses that same predicate. Keep all shadow/map/attenuation work and
    // guard only the BRDF's accumulation into reflectedLight: a zero light adds
    // zero diffuse/specular energy. Do not change directional or indirect light.
    const guarded = section.replace(directCall,
      '// ' + marker + '_' + family + '\n\t\tif ( directLight.visible ) {\n\t\t\t' + directCall + '\n\t\t}');
    optimized = optimized.slice(0, start) + guarded + optimized.slice(end);
  }

  const registered = new WeakSet();
  const materialRevisions = new WeakMap();
  const diagnostics = {
    version: 1,
    enabled: String(i.params?.directlightguard ?? '1') !== '0',
    guardedFamilies: ['point', 'spot'],
    changedLightCounts: false,
    changedQuality: false,
    programRevision: 0,
    registeredMaterials: 0,
    invalidatedMaterials: 0
  };
  function register(material) {
    if (!material) return;
    if (registered.has(material)) {
      // A cached bank material may have been absent from the scene during an
      // A/B switch. Invalidate it on reuse before its old program can render.
      if (materialRevisions.get(material) !== diagnostics.programRevision) {
        material.needsUpdate = true;
        materialRevisions.set(material, diagnostics.programRevision);
      }
      return;
    }
    registered.add(material);
    // Preserve material/lighting-specific cache keys and hooks. Including the
    // mode prevents Three from reusing the other A/B branch's compiled program.
    const previous = material.customProgramCacheKey;
    material.customProgramCacheKey = function () {
      return previous.call(this) + '|assault-zero-light-' + Number(diagnostics.enabled);
    };
    material.needsUpdate = true;
    materialRevisions.set(material, diagnostics.programRevision);
    diagnostics.registeredMaterials++;
  }
  function registerScene(invalidate) {
    const seen = new Set();
    i.scene.traverse(object => {
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        if (seen.has(material)) continue;
        seen.add(material); register(material);
      }
    });
    if (invalidate) diagnostics.invalidatedMaterials = seen.size;
  }
  // Original material-bank objects may be created after initial compilation
  // (for example an enemy or a weapon). Register them when requested, without
  // altering their textures, uniforms, shader hooks, identity, or return value.
  const getMaterial = i.mats.get;
  i.mats.get = function (...args) {
    const material = getMaterial.apply(this, args); register(material); return material;
  };
  chunks.lights_fragment_begin = diagnostics.enabled ? optimized : original;
  registerScene(false);
  const api = {
    diagnostics,
    setEnabled(enabled) {
      enabled = !!enabled;
      if (enabled === diagnostics.enabled) return diagnostics;
      diagnostics.enabled = enabled;
      diagnostics.programRevision++;
      chunks.lights_fragment_begin = enabled ? optimized : original;
      registerScene(true);
      return diagnostics;
    },
    // Can be checked before rendering: exactly two guards and unchanged
    // directional/indirect sections are required, independently of frame rate.
    verify() {
      const source = chunks.lights_fragment_begin;
      const suffix = '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )';
      return {
        enabled: diagnostics.enabled,
        guards: source.split(marker).length - 1,
        expectedGuards: diagnostics.enabled ? 2 : 0,
        directionalAndIndirectUnchanged: source.slice(source.indexOf(suffix)) === original.slice(original.indexOf(suffix))
      };
    }
  };
  i.assaultPerformance = api;
  return api;
}

// Resource residency is separate from shader compilation. Three's compileAsync
// does not upload the hidden decal atlas, dormant skinning textures, or the
// vertex buffers of invisible pools. Draw the already-created objects once
// during loading, before the game loop starts. No effects or actors are spawned.
let assaultWarmupSerial = 0;
async function assaultPrewarm(i) {
  const api = i.assaultPerformance || assaultPerformance(i);
  if (api.warmup?.complete) return api.warmup;
  if (String(i.params?.prewarm ?? '1') === '0') return api.warmup = { complete: false, skipped: true, reason: 'prewarm=0 diagnostic baseline' };
  if (i.game && !['title', 'boot', 'loading'].includes(i.game.state)) {
    throw new Error('Assault resource warmup must run before Deploy');
  }
  const T = i.THREE, renderer = i.renderer, scene = i.scene;
  const started = performance.now(), objects = [], materials = new Set(), textures = new Set(), skeletons = new Set();
  const diagnostics = api.warmup = {
    complete: false, meshes: 0, texturesInitialized: 0, skeletonTexturesCreated: 0,
    fxTextures: [], before: { ...renderer.info.memory }, after: null,
    restored: false, elapsedMs: 0, gameplayUpdates: 0, offscreenSize: [8, 8], samples: i.quality.msaa | 0
  };
  // Three allocates UUIDs with Math.random. Use a private stream only inside
  // synchronous resource-construction/upload blocks; restore the native stream
  // before yielding. Neither the gameplay RNG nor cosmetic RNG is advanced.
  let uuidState = (0x51a17e00 + ++assaultWarmupSerial) >>> 0;
  function resourceWork(work) {
    const random = Math.random;
    Math.random = () => {
      uuidState = (Math.imul(uuidState, 1664525) + 1013904223) >>> 0;
      return uuidState / 4294967296;
    };
    try { return work(); } finally { Math.random = random; }
  }
  function collectTexture(value) {
    if (Array.isArray(value)) { value.forEach(collectTexture); return; }
    if (value?.isTexture && !value.isRenderTargetTexture && !value.isDepthTexture && value.image) textures.add(value);
  }
  function resident(texture) { return !!renderer.properties.get(texture).__webglTexture; }
  scene.traverse(object => {
    let effectiveVisible = true;
    for (let parent = object; parent; parent = parent.parent) effectiveVisible &&= parent.visible;
    objects.push({ object, visible: object.visible, effectiveVisible, frustumCulled: object.frustumCulled,
      before: object.onBeforeRender, after: object.onAfterRender, matrix: object.matrix.clone(),
      world: object.matrixWorld.clone(), matrixWorldNeedsUpdate: object.matrixWorldNeedsUpdate,
      bind: object.bindMatrix?.clone(), bindInverse: object.bindMatrixInverse?.clone() });
    if (object.isSkinnedMesh && object.skeleton) skeletons.add(object.skeleton);
    if (object.isMesh || object.isLine || object.isPoints) diagnostics.meshes++;
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) materials.add(material);
  });
  const materialCallbacks = [];
  for (const material of materials) {
    materialCallbacks.push([material, material.onBeforeRender]);
    Object.values(material).forEach(collectTexture);
    for (const uniform of Object.values(material.uniforms || {})) collectTexture(uniform.value);
    if (material.name === 'fx_decals' || material.name === 'fx_lit' || material.name === 'fx_add') {
      const unique = new Set();
      for (const value of [...Object.values(material), ...Object.values(material.uniforms || {}).map(u => u.value)]) {
        if (value?.isTexture && !unique.has(value)) {
          unique.add(value); diagnostics.fxTextures.push({ material: material.name, texture: value.name || value.uuid,
            before: resident(value), after: false, reference: value });
        }
      }
    }
  }
  const saved = {
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
    viewport: renderer.getViewport(new T.Vector4()), scissor: renderer.getScissor(new T.Vector4()),
    scissorTest: renderer.getScissorTest(), autoClear: renderer.autoClear,
    shadowAuto: renderer.shadowMap.autoUpdate, shadowNeeds: renderer.shadowMap.needsUpdate,
    xr: renderer.xr.enabled
  };
  const noCallback = () => {};
  const skeletonMatrices = new Map([...skeletons].map(skeleton => [skeleton, skeleton.boneMatrices.slice()]));
  const owned = resourceWork(() => ({
    target: new T.WebGLRenderTarget(8, 8, { type: T.HalfFloatType, format: T.RGBAFormat, minFilter: T.NearestFilter,
      magFilter: T.NearestFilter, generateMipmaps: false, depthBuffer: true, stencilBuffer: false, samples: i.quality.msaa | 0 }),
    cameras: [i.camera, i.render.viewCamera].filter(Boolean).map(camera => camera.clone())
  }));
  let fence = null;
  const gl = renderer.getContext();
  try {
    for (const record of objects) {
      const object = record.object;
      // Keep the exact light inventory. Hidden ancestors of pooled meshes may
      // be revealed for the warm draw, but must not reveal additional lights.
      object.visible = object.isLight ? record.effectiveVisible : true;
      object.frustumCulled = false;
      object.onBeforeRender = object.onAfterRender = noCallback;
    }
    for (const [material] of materialCallbacks) material.onBeforeRender = noCallback;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = false;
    renderer.xr.enabled = false;
    renderer.autoClear = true;
    resourceWork(() => {
      for (const skeleton of skeletons) {
        if (!skeleton.boneTexture) { skeleton.computeBoneTexture(); diagnostics.skeletonTexturesCreated++; }
        collectTexture(skeleton.boneTexture);
      }
      for (const texture of textures) {
        if (!resident(texture)) { renderer.initTexture(texture); diagnostics.texturesInitialized++; }
      }
      renderer.setRenderTarget(owned.target);
      renderer.setViewport(0, 0, 8, 8);
      renderer.setScissorTest(false);
      for (const camera of owned.cameras) renderer.render(scene, camera);
      fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
    });
    if (!fence) throw new Error('Could not fence the Assault resource warmup');
    const deadline = performance.now() + 10000;
    for (;;) {
      const status = gl.clientWaitSync(fence, 0, 0);
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) break;
      if (status === gl.WAIT_FAILED || performance.now() > deadline) throw new Error('Assault resource warmup did not finish');
      await new Promise(resolve => setTimeout(resolve, 4));
    }
    diagnostics.complete = true;
  } finally {
    if (fence) gl.deleteSync(fence);
    for (const record of objects) {
      const object = record.object;
      object.visible = record.visible; object.frustumCulled = record.frustumCulled;
      object.onBeforeRender = record.before; object.onAfterRender = record.after;
      object.matrix.copy(record.matrix); object.matrixWorld.copy(record.world); object.matrixWorldNeedsUpdate = record.matrixWorldNeedsUpdate;
      if (record.bind) object.bindMatrix.copy(record.bind);
      if (record.bindInverse) object.bindMatrixInverse.copy(record.bindInverse);
    }
    for (const [skeleton, values] of skeletonMatrices) skeleton.boneMatrices.set(values);
    for (const [material, callback] of materialCallbacks) material.onBeforeRender = callback;
    renderer.shadowMap.autoUpdate = saved.shadowAuto;
    renderer.shadowMap.needsUpdate = saved.shadowNeeds;
    renderer.xr.enabled = saved.xr; renderer.autoClear = saved.autoClear;
    renderer.setRenderTarget(saved.target, saved.face, saved.mip);
    renderer.setViewport(saved.viewport); renderer.setScissor(saved.scissor); renderer.setScissorTest(saved.scissorTest);
    owned.target.dispose();
    for (const entry of diagnostics.fxTextures) { entry.after = resident(entry.reference); delete entry.reference; }
    diagnostics.after = { ...renderer.info.memory };
    diagnostics.restored = objects.every(record => record.object.visible === record.visible &&
      record.object.frustumCulled === record.frustumCulled && record.object.onBeforeRender === record.before && record.object.onAfterRender === record.after);
    diagnostics.elapsedMs = Math.round((performance.now() - started) * 100) / 100;
  }
  return diagnostics;
}
