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
  mat.userData = {...source.userData, sl: uniforms, assaultSurface: {version: 11, source: name, vertexColors, grainAxis}};
  // Source chain-link brushes already have outward-facing front/back sheets.
  // Drawing both sides doubles the diamonds and creates a moire pattern.
  mat.side = name==='chainlink'?T.FrontSide:T.DoubleSide;
  const concrete = /^concrete/.test(name), brick = name === 'brick';
  const facadeGlass = name === 'glass' && !inside;
  const masonry = concrete || brick, corrugated = name === 'corrugated_roof';
  const wood = name === 'wood_pallet' || name === 'wood_dark';
  const paintedSteel = name === 'hull_paint';
  const galvanized = name === 'steel_galv', wornSteel = name === 'steel_worn';
  const canvas = name === 'tarp', staticAsphalt = name === 'asphalt';
  const architectural = facadeGlass || masonry || corrugated || wood || paintedSteel || galvanized || wornSteel || canvas || staticAsphalt;
  if (architectural) {
    // Dry masonry stays diffuse; wet masonry darkens slightly and retains a
    // broad lobe. The original droplet sparkle belongs on close props and water.
    uniforms.uSlMacro.value.x = corrugated ? .035 : .025;
    uniforms.uSlMacro.value.y = .025;
    uniforms.uSlMacro.value.w = .035;
    // Wet darkening, wet roughness multiplier, vertical exposure, texture AO,
    // normal strength: distinct responses for sheet metal, fabric and masonry.
    const response = facadeGlass ? [.025,.94,.12,.10,.06]
      : corrugated ? [.025,.85,.42,.40,.28]
      : paintedSteel ? [.035,.92,.32,.32,.10]
      : wood ? [.10,.94,.18,.25,.085]
      : galvanized ? [.025,.94,.30,.24,.18]
      : wornSteel ? [.025,.93,.30,.28,inside?.045:.20]
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
    if(facadeGlass){mat.metalness=0;mat.roughness=.70;}
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
    if(concrete){
      // Original concrete maps remain the asset. Orientation selects a finer
      // cast/slab texture scale without splitting the existing draw batches.
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying float vAssaultConcreteUp;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvAssaultConcreteUp=abs(normalize(mat3(modelMatrix)*normal).y);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying float vAssaultConcreteUp;
        float assaultTraffic(vec2 p,vec2 a,vec2 b){
          vec2 d=b-a;float t=clamp(dot(p-a,d)/dot(d,d),0.0,1.0);
          return 1.0-smoothstep(.35,1.8,length(p-a-t*d));
        }
      `);
      patch('slUv = vMapUv * uSlUv.xy;',
        'slUv = vMapUv * uSlUv.xy * mix(1.0,2.25,smoothstep(.65,.96,vAssaultConcreteUp));');
    }
    if(wood&&grainAxis==='v')patch('slUv = vMapUv * uSlUv.xy;', 'slUv = vMapUv.yx * uSlUv.xy;');
    const sampling = 'slORM = texture2D(roughnessMap, slUv);';
    let finish = `
      float assaultWorldPixel=max(length(dFdx(vSlPos)),length(dFdy(vSlPos)));
      float assaultContact=1.0-smoothstep(.08,1.35,max(vSlPos.y,0.0));
      float assaultDetail=1.0-smoothstep(.012,.075,assaultWorldPixel);
    `;
    if(facadeGlass){
      finish += `
        vec3 portPaneNormal=abs(normalize(cross(dFdx(vSlPos),dFdy(vSlPos))));
        float portPaneU=portPaneNormal.x>portPaneNormal.z?vSlPos.z:vSlPos.x;
        float portPane=slH(vec3(floor((portPaneU+1.6)/3.2),floor((vSlPos.y+1.725)/3.45),11.8));
        sampledDiffuseColor.rgb=mix(vec3(.14,.19,.22),sampledDiffuseColor.rgb,.10)*mix(.68,1.14,portPane);
        sampledDiffuseColor.a=.62+.20*portPane;
        slORM.g=.28+.22*portPane;slORM.b=0.0;
      `;
    } else if (galvanized) {
      finish += `
        sampledDiffuseColor.rgb=mix(vec3(.50,.525,.55),sampledDiffuseColor.rgb,.18);
        // Low-contrast zinc bloom and dull runoff are broad enough to remain
        // stable in motion. The original fine spangle stays in the source map.
        float assaultZinc=slN3(vSlPos*vec3(1.7,.28,1.7)+vec3(4.2,7.1,1.6));
        float assaultZincBloom=smoothstep(.48,.77,assaultZinc);
        sampledDiffuseColor.rgb*=mix(.94,1.035,assaultZinc);
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,vec3(.43,.465,.48),assaultZincBloom*.18);
        slORM.g=mix(.55,slORM.g,.22)+assaultZincBloom*.09;
        slORM.b=mix(.92,slORM.b,.18);
      `;
    } else if (wornSteel) {
      finish += (inside ? `
        sampledDiffuseColor.rgb=mix(vec3(.040,.047,.048),sampledDiffuseColor.rgb*.12,.24);
        slORM.b=mix(.42,slORM.b,.20);
      ` : `sampledDiffuseColor.rgb*=.12;`) + `
        sampledDiffuseColor.a=mix(.80,.94,sampledDiffuseColor.a);
        slORM.g=mix(.60,slORM.g,.28);
        // Worn structural steel: quiet mill-scale fields with isolated dull
        // oxidation, rather than fine bright scratches on every visible pixel.
        float assaultSteelAge=slN3(vSlPos*vec3(.48,.22,.48)+vec3(7.2,1.5,9.4));
        float assaultSteelRun=slN3(vSlPos*vec3(3.4,.32,3.4)+vec3(2.8,8.1,4.6));
        float assaultSteelOxide=smoothstep(.57,.77,assaultSteelAge)*smoothstep(.46,.72,assaultSteelRun);
        sampledDiffuseColor.rgb*=mix(.84,1.13,assaultSteelAge);
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,vec3(.067,.038,.022),assaultSteelOxide*.65);
        slORM.b*=1.0-assaultSteelOxide*.85;
        slORM.g=mix(slORM.g,.91,assaultSteelOxide);
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
      // Sawn boards age individually; original grain/knots remain visible.
      // Mineral streaks follow the timber rather than random black speckles.
      finish += `
        vec2 assaultTimberUv=${grainAxis==='v'?'vMapUv.yx':'vMapUv'};
        float assaultBoard=slH(vec3(floor(assaultTimberUv.y/.16),floor(assaultTimberUv.x/2.4),3.8));
        float assaultTimberAge=slN3(vSlPos*.38+vec3(3.4,8.9,2.7));
        float assaultTimberStreak=slN3(vec3(assaultTimberUv*vec2(.65,11.0),6.2));
        float assaultTimberDirt=smoothstep(.51,.76,assaultTimberAge)*smoothstep(.45,.75,assaultTimberStreak);
        vec3 assaultTimberBase=mix(vec3(.212,.151,.090),vec3(.236,.216,.174),assaultBoard*.75);
        sampledDiffuseColor.rgb=mix(assaultTimberBase,sampledDiffuseColor.rgb,.44)*mix(.86,1.08,assaultBoard);
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,vec3(.088,.071,.044),assaultTimberDirt*.40);
        sampledDiffuseColor.rgb*=1.0-assaultContact*.09;
        slORM.g=mix(slORM.g,.94,assaultTimberDirt*.55);
      `;
    } else if (brick) {
      // Offsets are whole bricks and even row counts. Mortar courses stay
      // aligned while the source tile's broad stains lose their periodic motif.
      finish += `
        vec3 assaultBrickB=texture2D(map,slUv+vec2(.375,.5)).rgb;
        vec3 assaultBrickC=texture2D(map,slUv+vec2(.625,.25)).rgb;
        float assaultBlend=slN3(vSlPos*.09+vec3(3.7,1.2,8.9));
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,
          mix(assaultBrickB,assaultBrickC,assaultBlend),.64);
        // Kiln color and mortar stay in the original maps. A continuous broad
        // exposure field breaks the facade into weathered and sheltered bays.
        float portBrickAge=slN3(vSlPos*vec3(.13,.18,.13)+vec3(1.8,4.2,8.7));
        sampledDiffuseColor.rgb*=mix(.88,1.08,portBrickAge);
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,sampledDiffuseColor.rgb*vec3(.67,.71,.67),assaultContact*.24);
        slORM.g=mix(slORM.g,.89,.18+assaultContact*.20);
      `;
    } else if (concrete) {
      finish += `
        float assaultSlab=smoothstep(.65,.96,vAssaultConcreteUp);
        float assaultWalk=max(assaultTraffic(vSlPos.xz,vec2(-18.2,-65.6),vec2(-23.5,-62.6)),
          assaultTraffic(vSlPos.xz,vec2(-23.5,-62.6),vec2(-26.0,-64.5)));
        assaultWalk=max(assaultWalk,assaultTraffic(vSlPos.xz,vec2(8.0,-59.0),vec2(-2.0,-70.0)));
        assaultWalk*=assaultSlab;
        sampledDiffuseColor.rgb=mix(mix(vec3(.225,.216,.197),vec3(.222,.218,.207),assaultSlab),
          sampledDiffuseColor.rgb,mix(.20,.30,assaultSlab));
        sampledDiffuseColor.rgb*=1.0-.055*assaultWalk;
        slORM.g=mix(slORM.g,mix(.84,.64,assaultWalk),.65);
        // Exterior coatings age in broad, gravity-aligned fields. Keep this
        // off interior slabs so their existing lighting/material response stays.
        ${inside?'':`
        float portWallAge=slN3(vSlPos*vec3(.22,.09,.22)+vec3(8.4,1.7,3.2));
        float portWallRun=slN3(vSlPos*vec3(2.3,.16,2.3)+vec3(3.4,8.2,1.9));
        float portWallDirt=smoothstep(.43,.72,portWallAge)*smoothstep(.48,.79,portWallRun)*(1.0-assaultSlab);
        sampledDiffuseColor.rgb*=mix(.94,1.06,portWallAge)*(1.0-portWallDirt*.15);
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,vec3(.105,.108,.092),assaultContact*.12*(1.0-assaultSlab));
        slORM.g=mix(slORM.g,.92,portWallDirt*.45);
        `}

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
      if(!inside)finish += `
        // Individual sheets age differently. Slow runoff streaks interrupt
        // the rib repetition without introducing another normal-map scale.
        float assaultSheet=slH(vec3(floor(vMapUv.x/1.05),floor(vMapUv.y/4.2),7.3));
        float assaultRunoff=slN3(vSlPos*vec3(1.8,.12,1.8)+vec3(13.7,4.8,1.2));
        float assaultOxide=slN3(vSlPos*.17+vec3(6.2,2.9,8.1));
        float assaultAge=smoothstep(.42,.79,assaultRunoff)*(.28+.72*assaultOxide);
        float assaultRoofFacing=abs(normalize(cross(dFdx(vSlPos),dFdy(vSlPos))).y);
        float assaultRoofDamp=smoothstep(.36,.68,assaultOxide)*smoothstep(.65,.95,assaultRoofFacing);
        sampledDiffuseColor.rgb*=mix(.90,1.055,assaultSheet);
        sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,
          sampledDiffuseColor.rgb*vec3(.66,.62,.56),assaultAge*.38);
        slORM.g=mix(slORM.g,.90,assaultAge*.32);
        sampledDiffuseColor.rgb*=1.0-assaultRoofDamp*.12;
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
    patch(roughness, roughness + (facadeGlass
      ? '\nroughnessFactor=max(roughnessFactor,.18);'
      : galvanized
      ? '\nroughnessFactor=max(roughnessFactor,.50);'
      : wornSteel
      ? '\nroughnessFactor=max(roughnessFactor,'+(inside?'.72':'.57')+');'
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
    if(corrugated&&!inside)patch('roughnessFactor=max(roughnessFactor,mix(.75,.57,assaultDetail));',
      'roughnessFactor=max(roughnessFactor,mix(.75,.57,assaultDetail));\nroughnessFactor=mix(roughnessFactor,.39,assaultRoofDamp*.68);');
    if(concrete)patch('roughnessFactor=max(roughnessFactor,mix(.69,.60,slWetK));',
      'roughnessFactor=max(roughnessFactor,mix(.69,.60,slWetK));\nroughnessFactor=mix(max(roughnessFactor,.80),mix(.76,.61,assaultWalk),assaultSlab);');
  };
  mat.customProgramCacheKey = () => sourceKey() + '|assault-surface-11|' + (architectural ? name : 'original') + (wood?':'+grainAxis:'') + ((staticAsphalt||corrugated||wornSteel)?':'+!!inside:'');
  cache.set(key, mat);
  return mat;
}
