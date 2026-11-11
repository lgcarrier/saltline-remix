/* Ship-only finish over the original Saltline material maps. No new maps,
 * geometry, lights or draw calls; authored decals and labels remain intact. */
function assaultHarborMaterials(i,root){
  const cache=new Map(),stats={version:2,materials:0,meshes:0,extraTextureReads:0};
  function variant(source){
    if(cache.has(source))return cache.get(source);
    const name=source.name;
    if(!['hull_paint','hull_red'].includes(name))return source;
    const mat=source.clone(),uniforms={};
    mat.defines={...source.defines};
    for(const [key,entry]of Object.entries(source.userData.sl))uniforms[key]=key==='uSlWet'?entry:{value:entry.value?.clone?entry.value.clone():entry.value};
    mat.userData={...source.userData,sl:uniforms,assaultShipFinish:true};
    uniforms.uSlMacro.value.set(.025,.025,uniforms.uSlMacro.value.z,.035);
    uniforms.uSlWetP.value.set(.12,.83,.18,0);
    mat.normalScale.multiplyScalar(.25);
    mat.metalness=0;mat.roughness=1;
    const compile=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source);
    mat.onBeforeCompile=shader=>{
      compile(shader);Object.assign(shader.uniforms,uniforms);
      function patch(anchor,replacement){if(!shader.fragmentShader.includes(anchor))throw new Error('Ship finish anchor missing: '+anchor);shader.fragmentShader=shader.fragmentShader.replace(anchor,replacement);}
      const sampling='slORM = texture2D(roughnessMap, slUv);';
      // Gravity-aligned weathering is continuous over the hull instead of
      // repeating a high-contrast orange island in every original 4 m tile.
      patch(sampling,sampling+`
        float portAge=slN3(vec3(vSlPos.x*.13,vSlPos.y*.16,vSlPos.z*.21)+vec3(7.2,2.8,9.1));
        float portRun=slN3(vec3(vSlPos.x*1.7,vSlPos.y*.17,vSlPos.z*2.4)+vec3(3.8,7.1,2.2));
        float portSourceRust=smoothstep(.025,.12,sampledDiffuseColor.r-sampledDiffuseColor.g);
        float portDeckRun=smoothstep(6.0,13.0,vSlPos.y);
        float portRust=portSourceRust*smoothstep(.43,.74,portAge)*.78;
        portRust=max(portRust,smoothstep(.64,.84,portRun)*smoothstep(.45,.72,portAge)*(.08+.22*portDeckRun));
        float portChalk=smoothstep(1.0,13.0,vSlPos.y)*(.45+.55*portAge);
        float portSplash=(1.0-smoothstep(-.6,2.8,vSlPos.y))*(.45+.55*portRun);
        vec3 portCoat=${name==='hull_red'?'vec3(.105,.027,.020)':'vec3(.038,.055,.065)'};
        portCoat*=mix(.82,1.13,portAge);
        float portMicro=clamp(dot(sampledDiffuseColor.rgb,vec3(.30,.59,.11))/.18,.65,1.35);
        portCoat*=mix(1.0,portMicro,.24);
        portCoat*=1.0-smoothstep(.50,.78,portRun)*smoothstep(.36,.70,portAge)*.17;
        portCoat=mix(portCoat,portCoat*1.15,portChalk*.42);
        portCoat*=1.0-portSplash*.26;
        vec3 portFinish=mix(portCoat,vec3(.105,.047,.020),portRust);
        slORM.g=mix(.49+.16*portAge+.055*portRun,.91,portRust);
        slORM.b=0.0;
      `);
      // Apply after the source tint branch, before its original wet response.
      const tint='#if SL_TINT == 1\n  diffuseColor.rgb = sampledDiffuseColor.rgb + diffuse * sampledDiffuseColor.a;';
      patch(tint,'#if SL_TINT == 1\n  diffuseColor.rgb = portFinish;');
      patch('roughnessFactor = clamp(roughnessFactor, 0.045, 1.0);','roughnessFactor = clamp(roughnessFactor, 0.045, 1.0);\nroughnessFactor=max(roughnessFactor,.48);');
      // Original vertex colors encode plate age. Compress their extreme
      // differences on hull plates without losing the painted cargo palette.
      patch('#include <color_fragment>',
        '#ifdef USE_COLOR\n diffuseColor.rgb *= mix(vec3(1.0),vColor,.38);\n#endif');
    };
    mat.customProgramCacheKey=()=>key()+'|assault-ship-finish-2|'+name;
    cache.set(source,mat);stats.materials++;return mat;
  }
  root.traverse(o=>{if(!o.isMesh)return;const before=o.material;
    o.material=Array.isArray(before)?before.map(variant):variant(before);
    if(o.material!==before)stats.meshes++;
  });
  return stats;
}
