// Collision-derived floor plans and route probes. Does not start the game.
// Run: node tools/inspect-assault-map.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z,isVector3:true});}clone(){return new V(this.x,this.y,this.z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}}
const context=vm.createContext({W:V,u1:.42,f3:v=>v.isVector3?v.clone():new V(...v),console,Math,Float64Array,Int32Array,Uint8Array,Map,Infinity});
vm.runInContext(fs.readFileSync(path.join(root,'src/assault-physics.js'),'utf8')+';globalThis.make=sAP;',context);
const map=JSON.parse(fs.readFileSync(path.join(root,'src/assault-map.json'),'utf8'));
const grid={minX:-73,minZ:-84,w:144,h:155,cell:.75,blocked:new Uint8Array(144*155)};
const p=context.make({boxes:[],raycast:()=>null,groundHeight:()=>-Infinity,build(){},nav:{cell:.75,_grid:()=>grid}},{});
const positions=new Float32Array(map.collision.positions);
p.addTriangles(positions,Uint32Array.from({length:positions.length/3},(_,i)=>i));
p.build();
const panels=[
  {title:'01  GROUND APPROACH',subtitle:'Floors ≤ 0.85 m · CT spawn, open yard, main hall',bounds:[-70,32,-81,30],maxY:.85,slice:1.7,cell:.5},
  {title:'02  WAREHOUSE FLOOR',subtitle:'Floors ≤ 4 m · 0.81 m loading ledge and sloped floor',bounds:[-32,25,-80,-32],maxY:4,slice:4.7,cell:.25},
  {title:'03  OFFICE / REAR RAMP',subtitle:'Floors ≤ 9 m · rear ramp leads to 8.53 m office',bounds:[-32,25,-80,-32],maxY:9,slice:10,cell:.25},
  {title:'04  ROOF / VENTS',subtitle:'Floors ≤ 14.5 m · use ladders to reach roof',bounds:[-32,25,-80,-32],maxY:14.5,slice:14.5,cell:.25}
];
for(const panel of panels){
 const [minX,maxX,minZ,maxZ]=panel.bounds;
 panel.w=Math.ceil((maxX-minX)/panel.cell);panel.h=Math.ceil((maxZ-minZ)/panel.cell);panel.cells=[];
 for(let j=0;j<panel.h;j++)for(let i=0;i<panel.w;i++){
  const x=minX+(i+.5)*panel.cell,z=minZ+(j+.5)*panel.cell;
  const floors=p.assaultDebug.floorsAt(x,z).filter(y=>y<=panel.maxY+.002);
  const y=floors.at(-1);
  panel.cells.push(y===undefined?null:[Math.round(y*100),p.canStand(new V(x,y,z))?1:0]);
 }
 panel.walls=[];
 for(let k=0;k<positions.length;k+=9){
  const points=[Array.from(positions.slice(k,k+3)),Array.from(positions.slice(k+3,k+6)),Array.from(positions.slice(k+6,k+9))],cuts=[];
  for(let n=0;n<3;n++){
   const a=points[n],b=points[(n+1)%3];
   if((a[1]<panel.slice&&b[1]>panel.slice)||(a[1]>panel.slice&&b[1]<panel.slice)){
    const t=(panel.slice-a[1])/(b[1]-a[1]);cuts.push([a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t]);
   }
  }
  if(cuts.length===2)panel.walls.push(cuts);
 }
}
const waypointRoutes={
 approach:[[16.256,0,-4.064],[16.625,0,-7.875],[13.625,0,-10.875],[7.625,0,-10.875],[6.125,0,-13.125],[6.125,0,-28.125],[18.875,0,-40.875],[18.875,0,-55.125],[17.375,0,-55.875],[15.875,0,-54.375],[15.875,0,-49.875],[4.625,0,-49.875],[0,0,-52]],
 jump:[[8,0,-54],[8,0,-56],[8,.8128,-58],[8,.8128,-60]],
 office:[]
};
const officePath=p.nav.findPath(new V(8,.8128,-60),new V(-26,8.5344,-65.8368))||[];
for(let i=0;i<officePath.length;i++){
 const a=officePath[i-1],b=officePath[i],c=officePath[i+1];
 if(!a||!c||Math.abs((b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x))>.01||Math.abs((b.y-a.y)-(c.y-b.y))>.15)waypointRoutes.office.push([b.x,+b.y.toFixed(4),b.z]);
}
const markers=[
 {name:'CT SPAWN',pos:[16.256,0,-4.064]},
 {name:'YARD VIEW',pos:[0,0,-30]},
 {name:'A · LOADING',pos:[0,0,-52]},
 {name:'JUMP 0.81m',pos:[8,.8128,-57.5]},
 {name:'B · OFFICE',pos:[-26,8.5344,-65.8368]},
 {name:'REAR RAMP',pos:[2,5.5,-74.625]},
 {name:'C · ROOF',pos:[12,13.0048,-49]},
];
const cameras=[
 {name:'yard',cam:[0,1.7,-30,0,6,-44]},
 {name:'loading-door',cam:[-23,1.7,-44,-8,4,-51]},
 {name:'side-door',cam:[20,1.7,-50,17.5,2,-56.8]},
 {name:'loading-hall',cam:[0,1.7,-52,0,5,-65]},
 {name:'office',cam:[-14,10.2344,-65,-26,9.6,-65.8]},
 {name:'roof',cam:[0,14.7048,-49,0,13,-64]}
].map(c=>({...c,feetCanStand:p.canStand(new V(c.cam[0],c.cam[1]-1.7,c.cam[2])),floors:p.assaultDebug.floorsAt(c.cam[0],c.cam[2])}));
const report={note:'Geometry/nav probes only. Jump and ladder routes require normal-input testing. Door geometry excluded from these static probes.',waypointRoutes,cameras,markers,
 relayProbes:markers.filter(m=>m.name.includes(' · ')).map(m=>({...m,canStand:p.canStand(new V(...m.pos)),floors:p.assaultDebug.floorsAt(m.pos[0],m.pos[2])})),
 ladders:map.ladders};
const out=path.join(root,'output/playwright/assault');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'map-route-probes.json'),JSON.stringify(report,null,2)+'\n');
const html=`<!doctype html><html><meta charset="utf-8"><title>Assault collision-derived map plans</title><style>body{margin:0;background:#101821;color:#edf0ed;font:15px system-ui,sans-serif}header{padding:24px 30px 8px}h1{font-size:26px;margin:0 0 8px}p{margin:4px 0;color:#b1c3c7}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:20px 30px}article{background:#18232d;padding:16px;border:1px solid #35434b;border-radius:8px}h2{font-size:18px;margin:0 0 5px}small{color:#b1c3c7}canvas{display:block;margin-top:12px;background:#090e14}.legend{display:flex;gap:20px;padding:0 30px 24px;flex-wrap:wrap}.swatch{display:inline-block;width:13px;height:13px;vertical-align:-2px;margin-right:5px}.note{padding:0 30px 22px;font-size:12px}</style><header><h1>CS_ASSAULT · COLLISION FLOOR PLANS</h1><p>Native map geometry, metres · X right, −Z toward warehouse · hard floor / headroom probes</p></header><div class="grid"></div><div class="legend"></div><p class="note">Coloured cells support a standing capsule. Dim cells are obstructed at this height. Dark lines intersect the labelled slice. Doors are omitted from collision probes. Pink line: loading ledge jump. White line: static navigation route; ladder / jump gameplay remains a separate test.</p><script>
const panels=${JSON.stringify(panels)},routes=${JSON.stringify(waypointRoutes)},markers=${JSON.stringify(markers)},ladders=${JSON.stringify(map.ladders)};
const colors=[[0,'#367a95'],[.8128,'#4cb7a5'],[3.2512,'#d5bd65'],[6.5024,'#d68d56'],[8.5344,'#b190d1'],[13.0048,'#8cbbdb']];
const color=y=>colors.reduce((a,b)=>Math.abs(a[0]-y)<Math.abs(b[0]-y)?a:b)[1];
document.querySelector('.legend').innerHTML=colors.map(([y,c])=>'<span><i class="swatch" style="background:'+c+'"></i>'+y.toFixed(2)+' m</span>').join('')+'<span>◆ ladder</span>';
panels.forEach((p,n)=>{const a=document.createElement('article');a.innerHTML='<h2>'+p.title+'</h2><small>'+p.subtitle+'</small><canvas width="540" height="560"></canvas>';document.querySelector('.grid').append(a);const c=a.querySelector('canvas'),x=c.getContext('2d'),[x0,x1,z0,z1]=p.bounds,s=Math.min(500/(x1-x0),520/(z1-z0)),ox=(540-(x1-x0)*s)/2,oz=(560-(z1-z0)*s)/2;const xy=(xx,zz)=>[ox+(xx-x0)*s,oz+(zz-z0)*s];x.save();x.beginPath();x.rect(ox,oz,(x1-x0)*s,(z1-z0)*s);x.clip();p.cells.forEach((cell,i)=>{if(!cell)return;const xx=i%p.w,j=Math.floor(i/p.w);x.fillStyle=color(cell[0]/100);x.globalAlpha=cell[1]?1:.22;x.fillRect(ox+xx*p.cell*s,oz+j*p.cell*s,p.cell*s+.3,p.cell*s+.3)});x.globalAlpha=1;x.strokeStyle='#061015';x.lineWidth=1.3;p.walls.forEach(([a,b])=>{x.beginPath();x.moveTo(...xy(...a));x.lineTo(...xy(...b));x.stroke()});x.strokeStyle='#ffffff24';x.lineWidth=.6;for(let q=Math.ceil(x0/10)*10;q<x1;q+=10){x.beginPath();x.moveTo(...xy(q,z0));x.lineTo(...xy(q,z1));x.stroke()}for(let q=Math.ceil(z0/10)*10;q<z1;q+=10){x.beginPath();x.moveTo(...xy(x0,q));x.lineTo(...xy(x1,q));x.stroke()}
function route(points,c){x.strokeStyle=c;x.lineWidth=2;x.beginPath();points.forEach((p,i)=>{const pt=xy(p[0],p[2]);i?x.lineTo(...pt):x.moveTo(...pt)});x.stroke()}if(n===0)route(routes.approach,'#fff');if(n===1||n===2){route(routes.office.filter(q=>q[1]<=p.maxY+.1),'#fff');route(routes.jump,'#ff74b9')}
ladders.forEach(l=>{const a=l.bounds.min,b=l.bounds.max,pt=xy((a[0]+b[0])/2,(a[2]+b[2])/2);x.fillStyle='#fdf6d6';x.font='bold 14px sans-serif';x.fillText('◆',pt[0]-5,pt[1]+5)});
markers.forEach(m=>{const visible=n===0?m.pos[1]<1:n===1?m.pos[1]<4:n===2?m.pos[1]>4&&m.pos[1]<10:m.name.includes('ROOF');if(!visible)return;const pt=xy(m.pos[0],m.pos[2]);x.fillStyle='#fff';x.beginPath();x.arc(...pt,3,0,Math.PI*2);x.fill();x.font='bold 11px sans-serif';x.strokeStyle='#081018';x.lineWidth=3;const tx=Math.min(430,Math.max(8,pt[0]+7)),ty=pt[1]-7;x.strokeText(m.name,tx,ty);x.fillText(m.name,tx,ty);x.font='10px monospace';const label='['+m.pos.map(v=>v.toFixed(1)).join(',')+']';x.strokeText(label,tx,ty+12);x.fillText(label,tx,ty+12)});x.restore();x.fillStyle='#b7c6c9';x.font='10px monospace';for(let q=Math.ceil(x0/10)*10;q<x1;q+=10)x.fillText('X '+q,xy(q,z0)[0],oz-5);for(let q=Math.ceil(z0/10)*10;q<z1;q+=10)x.fillText(q,2,xy(x0,q)[1]);});
</script></html>`;
fs.writeFileSync(path.join(out,'map-floor-plans.html'),html);
console.log(JSON.stringify({html:path.join(out,'map-floor-plans.html'),report:path.join(out,'map-route-probes.json'),cameras},null,2));
