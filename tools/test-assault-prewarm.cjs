// Warmup must preserve gameplay/render state on completion and GPU failure.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function exercise(fail=false){
 let nativeRandomCalls=0,callbackCalls=0,disposed=0,draws=0,context;
 class Matrix{constructor(v=1){this.elements=[v]}clone(){return new Matrix(this.elements[0])}copy(m){this.elements=m.elements.slice();return this}}
 class Vector4{constructor(){this.values=[2,3,4,5]}}
 const node=(name,extra={})=>({name,visible:true,frustumCulled:true,matrix:new Matrix(2),matrixWorld:new Matrix(3),matrixWorldNeedsUpdate:true,onBeforeRender(){callbackCalls++},onAfterRender(){callbackCalls++},children:[],...extra});
 const texture={isTexture:true,name:'atlas',image:{width:2,height:2}};
 const mat={name:'fx_decals',map:texture,normalMap:texture,onBeforeRender(){callbackCalls++}};
 const skeleton={boneMatrices:new Float32Array([1,2,3,4]),boneTexture:null,computeBoneTexture(){context.Math.random();this.boneMatrices=new Float32Array([...this.boneMatrices,0,0,0,0]);this.boneTexture={isTexture:true,image:{width:4,height:4}}}};
 const root=node('scene'),hidden=node('hidden',{visible:false}),mesh=node('mesh',{isMesh:true,isSkinnedMesh:true,skeleton,material:mat,bindMatrix:new Matrix(4),bindMatrixInverse:new Matrix(5)}),light=node('hiddenlight',{isLight:true});
 root.children=[hidden];hidden.parent=root;hidden.children=[mesh,light];mesh.parent=hidden;light.parent=hidden;
 root.traverse=fn=>{function visit(o){fn(o);o.children.forEach(visit)}visit(root)};
 const properties=new WeakMap(),memory={geometries:0,textures:0};
 const renderer={info:{memory},properties:{get(t){if(!properties.has(t))properties.set(t,{});return properties.get(t)}},shadowMap:{autoUpdate:true,needsUpdate:true},xr:{enabled:true},autoClear:false,target:{name:'prior'},face:2,mip:3,viewport:new Vector4(),scissor:new Vector4(),scissorTest:true,
 getRenderTarget(){return this.target},getActiveCubeFace(){return this.face},getActiveMipmapLevel(){return this.mip},getViewport(v){v.values=this.viewport.values.slice();return v},getScissor(v){v.values=this.scissor.values.slice();return v},getScissorTest(){return this.scissorTest},setRenderTarget(t,f=0,m=0){this.target=t;this.face=f;this.mip=m},setViewport(v){this.viewport=v instanceof Vector4?v:{values:[...arguments]}},setScissor(v){this.scissor=v},setScissorTest(v){this.scissorTest=v},initTexture(t){this.properties.get(t).__webglTexture={};memory.textures++},render(s,c){context.Math.random();assert.equal(hidden.visible,true);assert.equal(light.visible,false);assert.equal(this.shadowMap.needsUpdate,false);assert.equal(this.shadowMap.autoUpdate,false);assert.equal(this.xr.enabled,false);s.onBeforeRender();mesh.onBeforeRender();mat.onBeforeRender();mesh.matrix.elements[0]=99;mesh.matrixWorld.elements[0]=98;mesh.bindMatrixInverse.elements[0]=97;skeleton.boneMatrices[0]=96;draws++},getContext(){return gl}};
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,fenceSync(){return{}},flush(){},clientWaitSync(){return fail?4:3},deleteSync(){}};
 const camera={clone(){context.Math.random();return{layers:{mask:1}}}};
 class Target{constructor(width,height,options){assert.equal(width,8);assert.equal(height,8);assert.equal(options.samples,4);context.Math.random()}dispose(){disposed++}}
 const game={assaultPerformance:{},params:{},quality:{msaa:4},game:{state:'title',update(){throw Error('simulation advanced')}},THREE:{Vector4,WebGLRenderTarget:Target,HalfFloatType:1,NearestFilter:1},renderer,scene:root,camera,render:{viewCamera:camera}};
 context={performance,setTimeout,Math:Object.assign(Object.create(Math),{random(){nativeRandomCalls++;return.5}})};vm.createContext(context);vm.runInContext(fs.readFileSync('src/assault-performance.js','utf8'),context);
 const oldRandom=context.Math.random;
 if(fail)await assert.rejects(()=>context.assaultPrewarm(game),/did not finish/);else await context.assaultPrewarm(game);
 assert.equal(hidden.visible,false);assert.equal(mesh.visible,true);assert.equal(light.visible,true);assert.equal(mesh.frustumCulled,true);assert.equal(mesh.matrix.elements[0],2);assert.equal(mesh.matrixWorld.elements[0],3);assert.equal(mesh.bindMatrixInverse.elements[0],5);assert.equal(skeleton.boneMatrices[0],1);
 assert.equal(renderer.target.name,'prior');assert.equal(renderer.face,2);assert.equal(renderer.mip,3);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(renderer.shadowMap.needsUpdate,true);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.autoClear,false);assert.equal(renderer.scissorTest,true);
 assert.deepEqual(renderer.viewport.values,[2,3,4,5]);assert.deepEqual(renderer.scissor.values,[2,3,4,5]);
 assert.equal(callbackCalls,0);assert.equal(nativeRandomCalls,0);assert.equal(context.Math.random,oldRandom);assert.equal(disposed,1);assert.equal(draws,2);assert.equal(game.assaultPerformance.warmup.restored,true);
 assert.equal(game.assaultPerformance.warmup.fxTextures[0].after,true);assert(!('reference' in game.assaultPerformance.warmup.fxTextures[0]));
 return {failureInjected:fail,restoration:true,noSimulationUpdates:true,nativeRandomCalls,fxResident:true};
}
(async()=>console.log(JSON.stringify([await exercise(),await exercise(true)])))().catch(e=>{console.error(e);process.exit(1)});
