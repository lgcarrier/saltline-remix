/* Relocate Saltline's original ocean asset to the two non-playable harbors.
 * The original mesh identity, material, wave clock and reflection exclusion
 * remain intact. No new water renderer, texture, light or render target. */
function assaultHarborWater(i,ground) {
  const T=i.THREE,sea=ground.sea,skirt=ground.root.children.find(o=>o.name==='quaySkirt');
  if(!sea?.geometry?.index||!sea.material?.onBeforeCompile||!skirt)
    throw new Error('Original Saltline sea and quay skirt must exist before harbor adaptation');
  const geometry=sea.geometry,position=geometry.attributes.position,index=geometry.index;
  const shoreline=75,sourceEdge=27.5,sourceQuay=29.88;
  const retained=[],min=new T.Vector3(Infinity,Infinity,Infinity),max=new T.Vector3(-Infinity,-Infinity,-Infinity);
  // kb appends three enormous western wraparound quads after its adaptive
  // eastern grid. Discard those triangles; translating them would put ocean
  // beneath Assault's playable pavement and beyond the new dock's land side.
  for(let k=0;k<index.count;k+=3) {
    const a=index.getX(k),b=index.getX(k+1),c=index.getX(k+2);
    if(Math.min(position.getX(a),position.getX(b),position.getX(c))<sourceEdge-.001)continue;
    retained.push(a,b,c);
    for(const j of [a,b,c]) {
      min.x=Math.min(min.x,position.getX(j));max.x=Math.max(max.x,position.getX(j));
      min.y=Math.min(min.y,position.getY(j));max.y=Math.max(max.y,position.getY(j));
      min.z=Math.min(min.z,position.getZ(j));max.z=Math.max(max.z,position.getZ(j));
    }
  }
  if(!retained.length||Math.abs(min.x-sourceEdge)>.001||index.count-retained.length!==18)
    throw new Error('Saltline sea topology changed: expected one eastern grid and six wraparound triangles');
  const removedTriangles=(index.count-retained.length)/3;
  geometry.setIndex(retained);
  // Bounds must exclude the now unreferenced wraparound vertices and include
  // the original 14.2 cm swell. Keep the sea's original culling policy.
  geometry.boundingBox=new T.Box3(min.clone().addScalar(-.16),max.clone().addScalar(.16));
  geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
  const material=sea.material,compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey;
  const east={shorelineX:75,sourceOffset:[45,0,-25],yaw:0,shipFoam:false,shaderPatched:false,
    worldBounds:{min:[75,min.y,min.z-25],max:[max.x+47.5,max.y,max.z-25]}};
  const west={shorelineX:-75,sourceOffset:[-45,0,-82.5],yaw:Math.PI,shipFoam:true,shaderPatched:false,
    worldBounds:{min:[-max.x-47.5,min.y,-max.z-82.5],max:[-75,max.y,-min.z-82.5]}};
  sea.position.set(shoreline-sourceEdge,0,-25);sea.updateMatrix();
  skirt.position.set(shoreline-sourceQuay,0,-25);skirt.updateMatrix();skirt.updateMatrixWorld(true);
  // Parent the west mesh to the original sea: zb's existing exclusion toggles
  // this parent, so both basins disappear during the apron reflection pass.
  // Geometry and texture/uniform storage are shared; the west program rotates
  // source-space waves and the hull foam to match the relocated original ship.
  const westSea=sea.clone(false);westSea.name='assault-west-sea';westSea.material=material.clone();
  westSea.position.set(-2*(shoreline-sourceEdge),0,-57.5);westSea.rotation.y=Math.PI;westSea.updateMatrix();
  sea.add(westSea);sea.updateMatrixWorld(true);
  const westSkirt=skirt.clone(false);westSkirt.name='assault-west-quay-skirt';
  westSkirt.position.set(-shoreline+sourceQuay,0,-82.5);westSkirt.rotation.y=Math.PI;westSkirt.updateMatrix();
  ground.root.add(westSkirt);westSkirt.updateMatrixWorld(true);
  function patchWater(target,side,mirrored) {
    target.onBeforeCompile=function(shader,renderer) {
      compile.call(this,shader,renderer);
      const worldAnchor='vec3 swp = (modelMatrix * vec4(transformed, 1.0)).xyz;';
      const displacement='transformed += sdisp * vSAmp;';
      const fragmentAnchor='vec2 sxz = vGWorld.xz;';
      const normalAnchor='normal = normalize(mat3(viewMatrix) * normalize(vec3(-gNxz.x, 1.0, -gNxz.y)));';
      const foamAnchor='float de = min(dq, dh);';
      if(!shader.vertexShader.includes(worldAnchor)||!shader.vertexShader.includes(displacement)||
         !shader.fragmentShader.includes(fragmentAnchor)||!shader.fragmentShader.includes(normalAnchor)||
         !shader.fragmentShader.includes(foamAnchor)||(shader.vertexShader.match(/swp\.xz/g)||[]).length!==5)
        throw new Error('Original Saltline sea shader anchors changed');
      // vGWorld stays in world space: camera distance, sun glitter, fog and
      // lighting must use the actual harbor, while wave/foam coordinates move.
      const sourceXZ=mirrored?'-(swp.xz - vec2(-45.0, -82.5))':'swp.xz - vec2(45.0, -25.0)';
      shader.vertexShader=shader.vertexShader.replaceAll('swp.xz','harborWaveXZ')
        .replace(worldAnchor,worldAnchor+'\n  vec2 harborWaveXZ = '+sourceXZ+';')
        .replace(displacement,displacement+'\n  transformed.x = max(transformed.x, 27.5);');
      shader.fragmentShader=shader.fragmentShader.replace(fragmentAnchor,
        'vec2 sxz = '+sourceXZ.replace('swp.xz','vGWorld.xz')+';');
      if(mirrored)shader.fragmentShader=shader.fragmentShader.replace(normalAnchor,
        'normal = normalize(mat3(viewMatrix) * normalize(vec3(gNxz.x, 1.0, gNxz.y)));');
      else shader.fragmentShader=shader.fragmentShader.replace(foamAnchor,'float de = dq;');
      side.shaderPatched=true;
    };
    target.customProgramCacheKey=function(){return cacheKey.call(this)+'-assault-harbor-'+(mirrored?'west':'east')+'-2';};
    target.needsUpdate=true;
  }
  patchWater(material,east,false);patchWater(westSea.material,west,true);
  const seaHeight=ground.seaHeight.bind(ground);
  ground.seaHeight=(x,z)=>{
    const side=x>=75?east:x<=-75?west:null;
    if(!side||x<side.worldBounds.min[0]||x>side.worldBounds.max[0]||
       z<side.worldBounds.min[2]||z>side.worldBounds.max[2])return -Infinity;
    return side===east?seaHeight(x-45,z+25):seaHeight(-x-45,-z-82.5);
  };
  return {system:'original Saltline kb ocean',seaY:+min.y.toFixed(6),basins:{east,west},
    triangles:retained.length/3*2+4,removedWraparoundTriangles:removedTriangles,
    drawCalls:4,sharedSeaGeometry:true,sharedSkirtGeometry:true,extraTextureReads:0,
    extraRenderTargets:0,extraLights:0,extraUpdateCallbacks:0,
    originalTimeUniform:true,originalReflectionExclusion:true};
}
