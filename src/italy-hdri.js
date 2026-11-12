/* Italy photographic sky integration. Radiance RGBE scanlines are decoded
 * locally from the embedded original HDR; there is no runtime network access.
 * Format/API conventions checked against Three.js r180 HDRLoader (MIT):
 * https://github.com/mrdoob/three.js/blob/r180/examples/jsm/loaders/HDRLoader.js
 * The decoder below is deliberately strict about the supplied -Y/+X layout. */
function italyDecodeHDRI(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);let cursor=0;
  function line(){const start=cursor;while(cursor<bytes.length&&bytes[cursor]!==10)cursor++;if(cursor===bytes.length)throw new Error('Italy HDR: truncated header');const value=String.fromCharCode(...bytes.subarray(start,cursor)).replace(/\r$/,'');cursor++;return value;}
  if(!/^#\?(RADIANCE|RGBE)$/.test(line()))throw new Error('Italy HDR: unsupported Radiance signature');
  let format='',resolution=null,headerLines=0;
  while(cursor<bytes.length&&headerLines++<80){const value=line();if(value.startsWith('FORMAT='))format=value.slice(7);const match=value.match(/^-Y (\d+) \+X (\d+)$/);if(match){resolution=[Number(match[2]),Number(match[1])];break;}}
  if(format!=='32-bit_rle_rgbe'||!resolution)throw new Error('Italy HDR: expected 32-bit RGBE with -Y/+X axes');
  const[width,height]=resolution;if(width<8||width>32767||height<1||width*height>33554432)throw new Error('Italy HDR: unsupported dimensions');
  const data=new Float32Array(width*height*4),scanline=new Uint8Array(width*4);
  const need=n=>{if(cursor+n>bytes.length)throw new Error('Italy HDR: truncated pixel data');};
  for(let y=0;y<height;y++){
    need(4);if(bytes[cursor]!==2||bytes[cursor+1]!==2||((bytes[cursor+2]<<8)|bytes[cursor+3])!==width)throw new Error('Italy HDR: invalid RLE scanline '+y);cursor+=4;
    for(let channel=0;channel<4;channel++){let x=0;while(x<width){need(1);const token=bytes[cursor++],count=token>128?token-128:token;if(count<1||x+count>width)throw new Error('Italy HDR: invalid RLE packet');
      if(token>128){need(1);scanline.fill(bytes[cursor++],channel*width+x,channel*width+x+count);}else{need(count);scanline.set(bytes.subarray(cursor,cursor+count),channel*width+x);cursor+=count;}x+=count;
    }}
    for(let x=0;x<width;x++){const j=(y*width+x)*4,e=scanline[width*3+x],factor=e?Math.pow(2,e-128)/255:0;for(let c=0;c<3;c++)data[j+c]=scanline[c*width+x]*factor;data[j+3]=1;}
  }
  if(cursor!==bytes.length)throw new Error('Italy HDR: trailing data or unsupported encoding');
  return{width,height,data,encodedBytes:bytes.length};
}
function italyMeasureHDRISun(decoded){
  const{width,height,data}=decoded,lum=j=>data[j]*.2126+data[j+1]*.7152+data[j+2]*.0722;let peak=0,peakIndex=0,weightedSum=0,weight=0;
  const sampleLuminance=[];
  for(let y=0;y<height/2;y++)for(let x=0;x<width;x++){const j=(y*width+x)*4,l=lum(j),cosLatitude=Math.sin(Math.PI*(y+.5)/height);if(l>peak){peak=l;peakIndex=y*width+x;}weightedSum+=l*cosLatitude;weight+=cosLatitude;if(x%8===0&&y%4===0)sampleLuminance.push(l);}
  if(!(peak>0))throw new Error('Italy HDR: no luminous upper hemisphere');
  sampleLuminance.sort((a,b)=>a-b);const p95=sampleLuminance[Math.floor(sampleLuminance.length*.95)],threshold=Math.max(peak*.18,p95*10),vector=[0,0,0];let solarWeight=0,solarPixels=0;
  for(let y=0;y<height/2;y++)for(let x=0;x<width;x++){const j=(y*width+x)*4,l=lum(j);if(l<threshold)continue;const az=((x+.5)/width-.5)*Math.PI*2,el=(.5-(y+.5)/height)*Math.PI,c=Math.cos(el),w=l*c;vector[0]+=Math.cos(az)*c*w;vector[1]+=Math.sin(el)*w;vector[2]+=Math.sin(az)*c*w;solarWeight+=w;solarPixels++;}
  if(!solarPixels){const x=peakIndex%width,y=Math.floor(peakIndex/width),az=((x+.5)/width-.5)*Math.PI*2,el=(.5-(y+.5)/height)*Math.PI;vector[0]=Math.cos(el)*Math.cos(az);vector[1]=Math.sin(el);vector[2]=Math.cos(el)*Math.sin(az);}
  const length=Math.hypot(...vector);for(let c=0;c<3;c++)vector[c]/=length;
  return{direction:vector,azimuth:Math.atan2(vector[2],vector[0]),elevation:Math.asin(vector[1]),peakLuminance:peak,skyP95:p95,upperMeanLuminance:weightedSum/weight,solarPixels,solarWeight};
}
function italyMeasureHDRISky(decoded,sun){
  const{width,height,data}=decoded,regions={upper:{sum:[0,0,0],weight:0},horizon:{sum:[0,0,0],weight:0},toward:{sum:[0,0,0],weight:0},away:{sum:[0,0,0],weight:0},zenith:{sum:[0,0,0],weight:0}};
  // A sparse solid-angle-weighted measurement is enough for fog colour; the
  // photographic texture itself is retained at its original 2K resolution.
  for(let y=0;y<height/2+height/90;y+=2){const elevation=(.5-(y+.5)/height)*Math.PI,cosine=Math.cos(elevation);for(let x=0;x<width;x+=4){const j=(y*width+x)*4,azimuth=((x+.5)/width-.5)*Math.PI*2,toward=Math.cos(azimuth-sun.azimuth),dot=cosine*Math.cos(azimuth)*sun.direction[0]+Math.sin(elevation)*sun.direction[1]+cosine*Math.sin(azimuth)*sun.direction[2];if(dot>Math.cos(Math.PI/90))continue;
    const names=[];if(elevation>0)names.push('upper');if(elevation>70*Math.PI/180)names.push('zenith');if(elevation>-2*Math.PI/180&&elevation<6*Math.PI/180){names.push('horizon');if(toward>.707)names.push('toward');if(toward<-.707)names.push('away');}
    for(const name of names){const region=regions[name];region.weight+=cosine;for(let c=0;c<3;c++)region.sum[c]+=data[j+c]*cosine;}
  }}
  return Object.fromEntries(Object.entries(regions).map(([name,region])=>[name,region.sum.map(v=>v/Math.max(region.weight,.0001))]));
}
function italyPrepareHDRI(T,targetSun,payload=window.__ITALY_HDRI){
  if(!payload?.base64)throw new Error('Italy HDR payload is missing');
  const started=performance.now(),binary=atob(payload.base64),bytes=new Uint8Array(binary.length);for(let n=0;n<bytes.length;n++)bytes[n]=binary.charCodeAt(n);
  const decoded=italyDecodeHDRI(bytes),sun=italyMeasureHDRISun(decoded),sky=italyMeasureHDRISky(decoded,sun),targetAzimuth=Math.atan2(targetSun.z,targetSun.x),yawOffset=sun.azimuth-targetAzimuth;
  const scale=Number(payload.radianceScale??1);if(!(scale>0&&scale<=16))throw new Error('Italy HDR radianceScale must be positive and <=16');
  const half=new Uint16Array(decoded.data.length);let clampedComponents=0;
  for(let n=0;n<half.length;n++){const value=n%4===3?1:decoded.data[n]*scale;if(value>65504)clampedComponents++;half[n]=T.DataUtils.toHalfFloat(Math.min(value,65504));}
  const texture=new T.DataTexture(half,decoded.width,decoded.height,T.RGBAFormat,T.HalfFloatType);texture.name='italy/photographic-HDR-sky';texture.colorSpace=T.LinearSRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.generateMipmaps=false;texture.flipY=true;texture.needsUpdate=true;
  const cosine=Math.cos(sun.elevation),sunDirection=new T.Vector3(cosine*Math.cos(targetAzimuth),Math.sin(sun.elevation),cosine*Math.sin(targetAzimuth));
  const solarLimit=Math.max(sun.skyP95*1.35,.25)*scale,visibleSolarLimit=64;
  const uniforms={tItalyHDR:{value:texture},uItalyHDRYaw:{value:yawOffset},uItalySolarLimit:{value:solarLimit},uItalyVisibleSolarLimit:{value:visibleSolarLimit}};
  const fragmentShader=`// SALTLINE_SKY photographic Italy
    precision highp float;
    varying vec3 vDir;
    uniform sampler2D tItalyHDR;
    uniform float uItalyHDRYaw,uItalySolarLimit,uItalyVisibleSolarLimit,uEnv,uTime,uFlash;
    uniform vec3 uSunDir;
    void main(){
      vec3 d=normalize(vDir);
      vec2 uv=vec2(fract(atan(d.z,d.x)*.15915494309189535+.5+uItalyHDRYaw*.15915494309189535),asin(clamp(d.y,-1.,1.))*.3183098861837907+.5);
      vec3 radiance=texture2D(tItalyHDR,uv).rgb;
      // The directional sun owns solar lighting. During environment capture,
      // remove only the disk/inner aureole, keeping photographic cloud energy.
      float solarCone=smoothstep(.999390827,.999847695,dot(d,normalize(uSunDir)));
      float luminance=max(dot(radiance,vec3(.2126,.7152,.0722)),.0001);
      vec3 ambientRadiance=radiance*min(1.,uItalySolarLimit/luminance);
      // Keep the visible solar disc bright without allowing the photograph's
      // 22EV peak to flood the game's bloom pass. Ordinary sky stays untouched.
      vec3 visibleRadiance=radiance*min(1.,uItalyVisibleSolarLimit/luminance);
      radiance=mix(visibleRadiance,ambientRadiance,uEnv*solarCone);
      gl_FragColor=vec4(max(radiance,vec3(0.)),1.);
    }`;
  const stats={version:1,asset:payload.asset||'embedded-HDRI',sha256:payload.sha256||null,sourceSize:[decoded.width,decoded.height],encodedBytes:decoded.encodedBytes,textureBytes:half.byteLength,decodeMs:Math.round(performance.now()-started),radianceScale:scale,solarLimit,visibleSolarLimit,solarRemovalConeDegrees:[1,2],sourceSunDegrees:{azimuth:sun.azimuth*180/Math.PI,elevation:sun.elevation*180/Math.PI},worldSunDegrees:{azimuth:targetAzimuth*180/Math.PI,elevation:sun.elevation*180/Math.PI},worldSunDirection:sunDirection.toArray(),yawDegrees:yawOffset*180/Math.PI,peakLuminance:sun.peakLuminance,skyP95:sun.skyP95,upperMeanLuminance:sun.upperMeanLuminance,skyMeanRGB:sky,solarPixels:sun.solarPixels,halfFloatClampedComponents:clampedComponents,environmentIntensity:Number(payload.environmentIntensity??1),pmremSize:Math.max(128,Math.min(512,Number(payload.pmremSize)||256)),fallback:false,pmremReady:false};
  return{T,texture,uniforms,fragmentShader,sunDirection,stats};
}
function italyCaptureHDRI(renderer,sky,state){
  const T=state.T,generator=new T.PMREMGenerator(renderer),captureScene=new T.Scene(),material=sky.material.clone();
  // Uniform cloning otherwise creates a second Texture object for the same
  // large HDR data. Both visible sky and probe deliberately own one source.
  material.uniforms.tItalyHDR.value=state.texture;material.uniforms.tNoise.value=sky.material.uniforms.tNoise.value;material.uniforms.uEnv.value=1;
  const mesh=new T.Mesh(sky.geometry,material);mesh.frustumCulled=false;captureScene.add(mesh);
  try{const target=generator.fromScene(captureScene,0,.1,100,{size:state.stats.pmremSize});state.stats.pmremReady=true;state.stats.pmremDimensions=[target.width,target.height];return target;}finally{material.dispose();generator.dispose();}
}
