/* Architectural material finish for Assault. Original Saltline texture objects,
 * normal/ORM data, wetness control and shader hooks remain the source of truth.
 * Props keep their original materials. This cache owns only map-surface variants.
 * Input UVs are metres (including the level's existing concrete-wall .75 scale).
 * Generated geometry can pass {vertexColors:false}; timber can additionally
 * pass {grainAxis:'v'} when its longitudinal UV follows V rather than U.
 */
const assaultMaterialCaches = new WeakMap();
function assaultMaterial(i, name, inside, transparent = false, options = {}) {
  let cache = assaultMaterialCaches.get(i);
  if (!cache) { cache = new Map(); assaultMaterialCaches.set(i, cache); }
  const vertexColors=options.vertexColors!==false, grainAxis=options.grainAxis==='v'?'v':'u';
  const key = name + ':' + !!inside + ':' + !!transparent + ':' + vertexColors + ':' + grainAxis;
  if (cache.has(key)) return cache.get(key);
  const T = i.THREE, source = i.mats.get(name, {interior: inside, vertexColors});
  if (!source?.userData?.sl) throw new Error('Original Saltline material unavailable: ' + name);
  const mat = source.clone();
  // MeshStandardMaterial.copy does not preserve custom defines or callbacks.
  mat.defines = {...source.defines};
  const uniforms = {};
  for (const [uniform, entry] of Object.entries(source.userData.sl)) {
    uniforms[uniform] = uniform === 'uSlWet' ? entry : {
      value: entry.value?.clone ? entry.value.clone() : entry.value
    };
  }
  mat.userData = {...source.userData, sl: uniforms, assaultSurface: {version: 7, source: name, vertexColors, grainAxis}};
  mat.side = T.DoubleSide;
  const concrete = /^concrete/.test(name), brick = name === 'brick';
  const masonry = concrete || brick, corrugated = name === 'corrugated_roof';
  const wood = name === 'wood_pallet' || name === 'wood_dark';
  const paintedSteel = name === 'hull_paint';
  const galvanized = name === 'steel_galv', wornSteel = name === 'steel_worn';
  const canvas = name === 'tarp', staticAsphalt = name === 'asphalt';
  const architectural = masonry || corrugated || wood || paintedSteel || galvanized || wornSteel || canvas || staticAsphalt;
  if (architectural) {
    // Dry masonry stays diffuse; wet masonry darkens slightly and retains a
    // broad lobe. The original droplet sparkle belongs on close props and water.
    uniforms.uSlMacro.value.x = corrugated ? .035 : .025;
    uniforms.uSlMacro.value.y = .025;
    uniforms.uSlMacro.value.w = .035;
    // Wet darkening, wet roughness multiplier, vertical exposure, texture AO,
    // normal strength: distinct responses for sheet metal, fabric and masonry.
    const response = corrugated ? [.025,.85,.42,.40,.28]
      : paintedSteel ? [.035,.92,.32,.32,.10]
      : wood ? [.10,.94,.18,.25,.085]
      : galvanized ? [.025,.94,.30,.24,.18]
      : wornSteel ? [.025,.93,.30,.28,.20]
      : canvas ? [.16,.98,.20,.28,.055]
      : staticAsphalt ? [.16,.86,.20,.28,.18]
      : [.14,.74,.22,inside?.4:.55,brick?.52:.34];
    uniforms.uSlWetP.value.x=response[0];uniforms.uSlWetP.value.y=response[1];uniforms.uSlWetP.value.z=response[2];
    uniforms.uSlWetP.value.w = 0;
    if (inside) uniforms.uSlX.value.x = 0;
    mat.aoMapIntensity=response[3];mat.normalScale.multiplyScalar(response[4]);
    if(wood){
      // Original 44 growth rings per 1.2m tile read as corrugations on large
      // shipping cases. Sawn timber has millimetre grain, not centimetre waves.
      uniforms.uSlUv.value.x=.8;uniforms.uSlUv.value.y=8;
      mat.metalness=0;mat.roughness=1.05;
    }
    if(paintedSteel){
      // This original ship-hull set is also mapped onto the native truck.
      // Scale its 4m plates to 1.6m truck panels and retain the supplied blue
      // paint tint; coated steel and rust both have a dielectric surface.
      uniforms.uSlUv.value.x=2.5;uniforms.uSlUv.value.y=2.5;
      mat.metalness=0;mat.roughness=1.12;
    }
    if(galvanized){
      // HVAC zinc spangle is millimetre-scale and nearly flat; construction
      // panel joins are already supplied by actual geometry.
      uniforms.uSlUv.value.x=6;uniforms.uSlUv.value.y=6;
    }
    if(wornSteel){uniforms.uSlUv.value.x=2;uniforms.uSlUv.value.y=2;}
    if(canvas){
      // The vehicle mesh provides drape and tension. This map contributes
      // surface weave, not a second set of centimetre-deep liquid waves.
      uniforms.uSlUv.value.x=3;uniforms.uSlUv.value.y=3;
      mat.metalness=0;mat.roughness=1.3;
    }
    if(staticAsphalt)mat.metalness=0;
  }
  if (transparent) { mat.transparent = true; mat.opacity = .3; mat.depthWrite = false; }
  const sourceCompile = source.onBeforeCompile, sourceKey = source.customProgramCacheKey.bind(source);
  mat.onBeforeCompile = shader => {
    sourceCompile(shader);
    Object.assign(shader.uniforms, uniforms);
    if (!architectural) return;
    function patch(anchor, replacement) {
      if (!shader.fragmentShader.includes(anchor)) throw new Error('Assault surface shader anchor missing: ' + name + ' / ' + anchor.slice(0, 65));
      shader.fragmentShader = shader.fragmentShader.replace(anchor, replacement);
    }
    if(wood&&grainAxis==='v')patch('slUv = vMapUv * uSlUv.xy;', 'slUv = vMapUv.yx * uSlUv.xy;');
    const sampling = 'slORM = texture2D(roughnessMap, slUv);';
    let finish = `
      float assaultWorldPixel=max(length(dFdx(vSlPos)),length(dFdy(vSlPos)));
      float assaultContact=1.0-smoothstep(.08,1.35,max(vSlPos.y,0.0));
      float assaultDetail=1.0-smoothstep(.012,.075,assaultWorldPixel);
    `;
    if (galvanized) {
      finish += `
        sampledDiffuseColor.rgb=mix(vec3(.50,.525,.55),sampledDiffuseColor.rgb,.18);
        slORM.g=mix(.55,slORM.g,.22);
        slORM.b=mix(.92,slORM.b,.18);
      `;
    } else if (wornSteel) {
      finish += `
        sampledDiffuseColor.rgb*=.12;
        sampledDiffuseColor.a=mix(.80,.94,sampledDiffuseColor.a);
        slORM.g=mix(.60,slORM.g,.28);
      `;
    } else if (canvas) {
      finish += `
        sampledDiffuseColor.rgb*=.18;
        sampledDiffuseColor.a=mix(.82,.93,sampledDiffuseColor.a);
      `;
    } else if (staticAsphalt) {
      // The original low-roughness seal mask identifies the conspicuous loop
      // repairs. Retain their placement, with a shallow matte charcoal repair
      // instead of a black, shiny cord drawn across every warehouse floor.
      finish += `
        float assaultSeal=1.0-smoothstep(.48,.68,slORM.g);
        sampledDiffuseColor.rgb=mix(vec3(.045,.046,.048),sampledDiffuseColor.rgb,.44);
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,vec3(.034,.035,.037),assaultSeal*.88);
      `;
    } else if (paintedSteel) {
      // The original seam corrosion remains visible as local discoloration,
      // rather than large exposed ship-hull islands over the entire truck bed.
      finish += `
        sampledDiffuseColor.rgb*=mix(.12,.24,assaultContact);
        sampledDiffuseColor.a=mix(.84,.96,sampledDiffuseColor.a);
      `;
    } else if (wood) {
      // The supplied grain and knots remain, compressed around a weathered
      // pale-timber substrate. Fine grain carries color; the face stays planar.
      finish += `sampledDiffuseColor.rgb=mix(vec3(.245,.188,.130),sampledDiffuseColor.rgb,.38);`;
    } else if (brick) {
      // Offsets are whole bricks and even row counts. Mortar courses stay
      // aligned while the source tile's broad stains lose their periodic motif.
      finish += `
        vec3 assaultBrickB=texture2D(map,slUv+vec2(.375,.5)).rgb;
        vec3 assaultBrickC=texture2D(map,slUv+vec2(.625,.25)).rgb;
        float assaultBlend=slN3(vSlPos*.09+vec3(3.7,1.2,8.9));
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,
          mix(assaultBrickB,assaultBrickC,assaultBlend),.64);
      `;
    } else if (concrete) {
      finish += `
        sampledDiffuseColor.rgb=mix(vec3(.225,.216,.197),sampledDiffuseColor.rgb,.40);
      `;
      if (name === 'concrete_painted') {
        // A continuous paint film with local abrasion at the plinth. The
        // original chip/aggregate mask is retained at a restrained contribution.
        finish += `sampledDiffuseColor.a=1.0-(1.0-sampledDiffuseColor.a)*mix(.035,.13,assaultContact);`;
      }
    } else if (corrugated) {
      finish += `
        vec2 assaultRibUv=slUv*vec2(10.0,1.0);
        float assaultRibPixel=max(length(dFdx(assaultRibUv)),length(dFdy(assaultRibUv)));
        assaultDetail=1.0-smoothstep(.10,.45,assaultRibPixel);
        // Steel ribs carry relief through normals. Their base color must not
        // alternate white/black once the pitch approaches a screen pixel.
        sampledDiffuseColor.rgb=mix(vec3(.39,.425,.46),sampledDiffuseColor.rgb,
          mix(.16,.58,assaultDetail));
      `;
    }
    patch(sampling, sampling + finish);
    if (name === 'concrete_painted') {
      patch('float slL = clamp(dot(sampledDiffuseColor.rgb, vec3(0.3333)) / 0.19, 0.55, 1.35);',
        'float slL = clamp(dot(sampledDiffuseColor.rgb, vec3(0.3333)) / 0.215, 0.90, 1.075);');
    }
    // Rain exposure is directional. Wall moisture is primarily the splash
    // band at ground contact; random tall wet columns no longer tile the facade.
    patch('slWetK = slW * mix(uSlWetP.z * (0.55 + 0.9 * slStreak), 0.75 + 0.5 * slMac, slUp);',
      `slWetK = slW * mix(uSlWetP.z * (.32 + .68 * assaultContact), .88, slUp);`);
    patch('slWetK += slW * slLow * 0.6;', 'slWetK += slW * slLow * .24;');
    // Geometric normal remains intact. Only unresolved texture relief is
    // reduced, with its energy moved into roughness instead of specular aliasing.
    patch('mapN.xy *= normalScale * (1.0 - 0.45 * slWetK * slUp);',
      'mapN.xy *= normalScale * mix(.12,1.0,assaultDetail) * (1.0 - 0.45 * slWetK * slUp);');
    const roughness = 'roughnessFactor = clamp(roughnessFactor, 0.045, 1.0);';
    patch(roughness, roughness + (galvanized
      ? '\nroughnessFactor=max(roughnessFactor,.50);'
      : wornSteel
      ? '\nroughnessFactor=max(roughnessFactor,.57);'
      : canvas
      ? '\nroughnessFactor=max(roughnessFactor,.84);'
      : staticAsphalt
      ? '\nroughnessFactor=max(roughnessFactor,'+(inside?'.84':'.68')+');'
      : paintedSteel
      ? '\nroughnessFactor=max(roughnessFactor,.64);'
      : wood
      ? '\nroughnessFactor=max(roughnessFactor,.86);'
      : corrugated
      ? '\nroughnessFactor=max(roughnessFactor,mix(.75,.57,assaultDetail));'
      : '\nroughnessFactor=max(roughnessFactor,mix(.69,.60,slWetK));'));
  };
  mat.customProgramCacheKey = () => sourceKey() + '|assault-surface-7|' + (architectural ? name : 'original') + (wood?':'+grainAxis:'') + (staticAsphalt?':'+!!inside:'');
  cache.set(key, mat);
  return mat;
}
