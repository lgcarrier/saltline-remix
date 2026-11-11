/* Assault collision adapter. Metres, Y-up, capsule position is the feet.
 * Geometry and navigation use the same BSP triangles. The graph retains a node
 * for every walkable vertical layer instead of flattening the warehouse roofs.
 */
function sAP(o, i) {
  const tris = [], bins = new Map(), CELL = 2, EPS = 0.002;
  const STEP = typeof u1 === 'number' ? u1 : 0.42;
  const counters = { rays: 0, rayTriangles: 0, movements: 0, substeps: 0, navSearches: 0, navExpanded: 0, navCacheHits: 0, navDisconnected: 0 };
  const clock = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const pathCache = new Map();
  const navTiming = { rasterMs: 0, prewarmMs: 0, edges: 0, components: 0, totalMs: 0 };
  const key = (x, z) => x + ',' + z;
  const vec = (x, y, z) => new W(x, y, z);
  const boxes = () => o.boxes || [];
  let stamp = 0, marks = [], navNodes = [], navCells = [], navGrid = null;
  function addBin(x, z, id) {
    const k = key(x, z); let ids = bins.get(k);
    if (!ids) bins.set(k, ids = []);
    ids.push(id);
  }
  function rectangle(minx, maxx, minz, maxz) {
    const out = [], token = ++stamp;
    for (let z = Math.floor(minz / CELL); z <= Math.floor(maxz / CELL); z++)
      for (let x = Math.floor(minx / CELL); x <= Math.floor(maxx / CELL); x++) {
        const ids = bins.get(key(x, z)); if (!ids) continue;
        for (const id of ids) if (marks[id] !== token) { marks[id] = token; out.push(id); }
      }
    return out;
  }
  function local(x, z, r = 0) { return rectangle(x-r, x+r, z-r, z+r); }
  o.addTriangles = function (pos, idx, surface = 'concrete') {
    for (let k = 0; k < idx.length; k += 3) {
      const a = idx[k]*3, b = idx[k+1]*3, c = idx[k+2]*3;
      const T = { ax:pos[a], ay:pos[a+1], az:pos[a+2], bx:pos[b], by:pos[b+1], bz:pos[b+2], cx:pos[c], cy:pos[c+1], cz:pos[c+2], surface };
      const ux=T.bx-T.ax, uy=T.by-T.ay, uz=T.bz-T.az, vx=T.cx-T.ax, vy=T.cy-T.ay, vz=T.cz-T.az;
      const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx, len=Math.hypot(nx,ny,nz);
      if (len < 1e-9) continue;
      Object.assign(T, {nx:nx/len, ny:ny/len, nz:nz/len,
        minx:Math.min(T.ax,T.bx,T.cx), maxx:Math.max(T.ax,T.bx,T.cx),
        miny:Math.min(T.ay,T.by,T.cy), maxy:Math.max(T.ay,T.by,T.cy),
        minz:Math.min(T.az,T.bz,T.cz), maxz:Math.max(T.az,T.bz,T.cz)});
      const id=tris.length; tris.push(T);
      for(let z=Math.floor(T.minz/CELL);z<=Math.floor(T.maxz/CELL);z++)
        for(let x=Math.floor(T.minx/CELL);x<=Math.floor(T.maxx/CELL);x++) addBin(x,z,id);
    }
    return tris.length;
  };
  o.ladders = [];
  o.addLadder = (min,max) => { const L={min:f3(min),max:f3(max)};o.ladders.push(L);return L; };

  // Amanatides-Woo traversal visits only grid cells crossed by the ray.
  function rayCandidates(origin, dir, limit) {
    let x=Math.floor(origin.x/CELL), z=Math.floor(origin.z/CELL);
    const sx=Math.sign(dir.x), sz=Math.sign(dir.z), dx=sx?CELL/Math.abs(dir.x):Infinity, dz=sz?CELL/Math.abs(dir.z):Infinity;
    let tx=sx?((x+(sx>0?1:0))*CELL-origin.x)/dir.x:Infinity;
    let tz=sz?((z+(sz>0?1:0))*CELL-origin.z)/dir.z:Infinity;
    const out=[], token=++stamp;
    for(let steps=0;steps<2048;steps++) {
      const ids=bins.get(key(x,z));
      if(ids) for(const id of ids) if(marks[id]!==token){marks[id]=token;out.push(id);}
      if(Math.min(tx,tz)>limit || (!sx&&!sz)) break;
      if(tx<tz){x+=sx;tx+=dx;}else{z+=sz;tz+=dz;}
    }
    return out;
  }
  function rayTriangles(origin, dir, limit, ids, predicate) {
    let best=limit, hit=null;
    for(const id of ids) {
      const T=tris[id]; if(predicate&&!predicate(T))continue;
      const ux=T.bx-T.ax,uy=T.by-T.ay,uz=T.bz-T.az,vx=T.cx-T.ax,vy=T.cy-T.ay,vz=T.cz-T.az;
      const px=dir.y*vz-dir.z*vy,py=dir.z*vx-dir.x*vz,pz=dir.x*vy-dir.y*vx, det=ux*px+uy*py+uz*pz;
      if(Math.abs(det)<1e-9)continue;
      const inv=1/det,ax=origin.x-T.ax,ay=origin.y-T.ay,az=origin.z-T.az;
      const u=(ax*px+ay*py+az*pz)*inv;if(u < -1e-7 || u > 1+1e-7)continue;
      const qx=ay*uz-az*uy,qy=az*ux-ax*uz,qz=ax*uy-ay*ux;
      const v=(dir.x*qx+dir.y*qy+dir.z*qz)*inv;if(v < -1e-7 || u+v > 1+1e-7)continue;
      const d=(vx*qx+vy*qy+vz*qz)*inv;
      if(d>1e-5&&d<best){best=d;hit=T;}
    }
    return hit?{dist:best,point:vec(origin.x+dir.x*best,origin.y+dir.y*best,origin.z+dir.z*best),normal:vec(hit.nx,hit.ny,hit.nz),surface:hit.surface,box:null,tri:hit}:null;
  }
  const originalRay=o.raycast.bind(o), originalGround=o.groundHeight.bind(o);
  o.raycast=function(origin,dir,maxd=500){
    const old=originalRay(origin,dir,maxd),cap=old?old.dist:maxd,ids=rayCandidates(origin,dir,cap);
    counters.rays++;counters.rayTriangles+=ids.length;
    const hit=rayTriangles(origin,dir,cap,ids);return hit||old;
  };
  function heightOn(T,x,z) {
    if(x<T.minx-EPS||x>T.maxx+EPS||z<T.minz-EPS||z>T.maxz+EPS||Math.abs(T.ny)<1e-7)return null;
    const ax=T.bx-T.ax,az=T.bz-T.az,bx=T.cx-T.ax,bz=T.cz-T.az,px=x-T.ax,pz=z-T.az,det=ax*bz-az*bx;
    if(Math.abs(det)<1e-10)return null;
    const u=(px*bz-pz*bx)/det,v=(ax*pz-az*px)/det;
    if(u< -1e-6||v< -1e-6||u+v>1+1e-6)return null;
    return T.ay-((x-T.ax)*T.nx+(z-T.az)*T.nz)/T.ny;
  }
  function floorAt(x,z,ceiling,ids,realOnly=false) {
    let y=realOnly?-Infinity:originalGround(x,z,ceiling),surface='concrete';
    for(const id of ids||local(x,z)) {
      const T=tris[id];if(T.ny<0.65||T.miny>ceiling+EPS)continue;
      const h=heightOn(T,x,z);if(h!==null&&h<=ceiling+EPS&&h>y){y=h;surface=T.surface;}
    }
    if(realOnly)for(const b of boxes())if(!b.bulletOnly&&!b.noNav&&x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z&&b.max.y<=ceiling+EPS&&b.max.y>y){y=b.max.y;surface=b.surface;}
    return {y,surface};
  }
  function ceilingAt(x,z,minimum,ids,ignoreNoNav=false) {
    let y=Infinity;
    for(const id of ids||local(x,z)){
      const T=tris[id];if(T.ny>-.65||T.maxy<minimum-EPS)continue;
      const h=heightOn(T,x,z);if(h!==null&&h>=minimum-EPS&&h<y)y=h;
    }
    for(const b of boxes())if(!b.bulletOnly&&!(ignoreNoNav&&b.noNav)&&x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z&&b.min.y>=minimum-EPS&&b.min.y<y)y=b.min.y;
    return y;
  }
  o.groundHeight=(x,z,ceiling=50)=>floorAt(x,z,ceiling).y;
  o.groundHeightTriOnly=(x,z,ceiling=50)=>{
    let y=-Infinity;for(const id of local(x,z)){const T=tris[id];if(T.ny<.65)continue;const h=heightOn(T,x,z);if(h!==null&&h<=ceiling+EPS&&h>y)y=h;}
    return Number.isFinite(y)?y:null;
  };
  // Triangle/vertical-slice intersection. Unlike the draft, triangle edges and
  // corners collide too; projection outside a triangle is not discarded.
  function slice(T,y) {
    const pts=[],p=[[T.ax,T.ay,T.az],[T.bx,T.by,T.bz],[T.cx,T.cy,T.cz]];
    for(let k=0;k<3;k++){
      const a=p[k],b=p[(k+1)%3];
      if(Math.abs(a[1]-y)<1e-7)pts.push([a[0],a[2]]);
      if((a[1]<y&&b[1]>y)||(a[1]>y&&b[1]<y)){const t=(y-a[1])/(b[1]-a[1]);pts.push([a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t]);}
    }
    if(!pts.length)return null;
    let a=pts[0],b=a,d=0;for(const p of pts){const q=(p[0]-a[0])**2+(p[1]-a[1])**2;if(q>d){d=q;b=p;}}
    return [a,b];
  }
  function wallContact(T,x,y,z,r,h) {
    if(Math.abs(T.ny)>.65||T.maxy<=y+EPS||T.miny>=y+h-EPS||x<T.minx-r||x>T.maxx+r||z<T.minz-r||z>T.maxz+r)return null;
    const lo=Math.max(y+.015,T.miny),hi=Math.min(y+h-.015,T.maxy);
    if(hi<lo)return null;
    const heights=[lo,hi,(lo+hi)*.5];
    for(const v of [T.ay,T.by,T.cy])if(v>lo&&v<hi)heights.push(v);
    let best=null;
    for(const sy of heights){
      const seg=slice(T,sy);if(!seg)continue;const [a,b]=seg,dx=b[0]-a[0],dz=b[1]-a[1],len=dx*dx+dz*dz;
      const t=len?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/len)):0;
      let nx=x-a[0]-dx*t,nz=z-a[1]-dz*t,d=Math.hypot(nx,nz);if(d>=r)continue;
      if(d>1e-7){nx/=d;nz/=d;}else{const l=Math.hypot(T.nx,T.nz);nx=T.nx/l;nz=T.nz/l;}
      if(!best||d<best.d)best={nx,nz,d,push:r-d+EPS};
    }
    return best;
  }
  function blockedAt(x,y,z,r,h,ids,ignoreNoNav=false) {
    for(const id of ids||local(x,z,r))if(wallContact(tris[id],x,y,z,r,h))return true;
    for(const b of boxes()){
      if(b.bulletOnly||(ignoreNoNav&&b.noNav)||b.max.y<=y+EPS||b.min.y>=y+h-EPS)continue;
      const dx=x-Math.max(b.min.x,Math.min(b.max.x,x)),dz=z-Math.max(b.min.z,Math.min(b.max.z,z));
      if(dx*dx+dz*dz<r*r)return true;
    }
    return false;
  }
  o.moveCapsule=function(pos,vel,dt,rad=.32,height=1.8,stepUp=true){
    counters.movements++;
    const out={onGround:false,hitWall:false,hitCeil:false,surface:'concrete'};
    if(!(dt>0))return out;
    // Include vertical travel: falling and jumping must not tunnel through slabs.
    const count=Math.min(256,Math.max(1,Math.ceil(Math.hypot(vel.x,vel.y,vel.z)*dt/Math.max(.04,rad*.4))));
    const tick=dt/count, samples=[[0,0],[rad,0],[-rad,0],[0,rad],[0,-rad]];
    for(let sub=0;sub<count;sub++){
      counters.substeps++;
      const oldY=pos.y,oldX=pos.x,oldZ=pos.z,wasRising=vel.y>0;
      let support=-Infinity;
      for(const [dx,dz] of samples) support=Math.max(support,floorAt(oldX+dx,oldZ+dz,oldY+.025).y);
      const grounded=!wasRising&&oldY-support<.06;
      pos.x+=vel.x*tick;pos.z+=vel.z*tick;
      let ids=local(pos.x,pos.z,rad+.02);
      // A horizontal ceiling edge also blocks entry when the body cannot fit;
      // it need not have a separate vertical trim triangle at the opening.
      let entryCeil=Infinity;for(const [dx,dz] of samples)entryCeil=Math.min(entryCeil,ceilingAt(pos.x+dx,pos.z+dz,oldY+.025,ids));
      if(entryCeil<oldY+height-EPS&&ceilingAt(oldX,oldZ,oldY+.025)-oldY>=height-EPS){pos.x=oldX;pos.z=oldZ;vel.x=vel.z=0;out.hitWall=true;ids=local(pos.x,pos.z,rad+.02);}
      const lift=grounded&&stepUp?STEP:EPS;
      let floor=-Infinity,surface='concrete';
      for(const [dx,dz] of samples){const f=floorAt(pos.x+dx,pos.z+dz,oldY+lift,ids);if(f.y>floor){floor=f.y;surface=f.surface;}}
      let ceil=Infinity;for(const [dx,dz] of samples)ceil=Math.min(ceil,ceilingAt(pos.x+dx,pos.z+dz,oldY+height-.02,ids));
      // Step only from support and with enough headroom. No mid-air floor snap.
      if(grounded&&stepUp&&floor>oldY+EPS&&floor<=oldY+STEP+EPS&&floor+height<ceil-EPS)pos.y=floor;
      for(let pass=0;pass<4;pass++){
        let moved=false;
        for(const id of ids){const c=wallContact(tris[id],pos.x,pos.y,pos.z,rad,height);if(!c)continue;pos.x+=c.nx*c.push;pos.z+=c.nz*c.push;const vn=vel.x*c.nx+vel.z*c.nz;if(vn<0){vel.x-=c.nx*vn;vel.z-=c.nz*vn;}out.hitWall=moved=true;}
        for(const b of boxes()){
          if(b.bulletOnly||b.max.y<=pos.y+EPS||b.min.y>=pos.y+height-EPS)continue;
          const cx=Math.max(b.min.x,Math.min(b.max.x,pos.x)),cz=Math.max(b.min.z,Math.min(b.max.z,pos.z));
          let nx=pos.x-cx,nz=pos.z-cz,d=Math.hypot(nx,nz);if(d>=rad)continue;
          if(d>1e-7){nx/=d;nz/=d;pos.x+=nx*(rad-d+EPS);pos.z+=nz*(rad-d+EPS);}else{
            const sides=[pos.x-b.min.x,b.max.x-pos.x,pos.z-b.min.z,b.max.z-pos.z],m=Math.min(...sides),k=sides.indexOf(m);nx=k===0?-1:k===1?1:0;nz=k===2?-1:k===3?1:0;pos.x+=nx*(m+rad+EPS);pos.z+=nz*(m+rad+EPS);
          }
          const vn=vel.x*nx+vel.z*nz;if(vn<0){vel.x-=nx*vn;vel.z-=nz*vn;}out.hitWall=moved=true;
        }
        if(!moved)break;
      }
      const after=local(pos.x,pos.z,rad+.02);floor=-Infinity;ceil=Infinity;
      for(const [dx,dz] of samples){const f=floorAt(pos.x+dx,pos.z+dz,Math.max(oldY,pos.y)+(grounded&&stepUp?STEP:EPS),after);if(f.y>floor){floor=f.y;surface=f.surface;}ceil=Math.min(ceil,ceilingAt(pos.x+dx,pos.z+dz,oldY+height-.025,after));}
      const next=pos.y+vel.y*tick;
      if(wasRising&&next+height>=ceil){pos.y=ceil-height-EPS;vel.y=0;out.hitCeil=true;out.onGround=false;}
      else if(!wasRising&&(next<=floor+EPS||(grounded&&stepUp&&next-floor<.1))){pos.y=floor;vel.y=0;out.onGround=true;out.surface=surface;}
      else {pos.y=next;out.onGround=false;}
    }
    return out;
  };

  const originalBuild=o.build.bind(o),originalGrid=o.nav._grid.bind(o.nav);
  const NAV_RADIUS=.32,NAV_HEIGHT=1.5;
  function cellIndex(x,z){if(!navGrid)return -1;const a=Math.floor((x-navGrid.minX)/navGrid.cell),b=Math.floor((z-navGrid.minZ)/navGrid.cell);return a<0||b<0||a>=navGrid.w||b>=navGrid.h?-1:b*navGrid.w+a;}
  function nearest(x,y,z,range=2){
    const cell=cellIndex(x,z);if(cell<0)return null;
    let best=null,score=Infinity;const cx=cell%navGrid.w,cz=Math.floor(cell/navGrid.w),r=Math.ceil(range/navGrid.cell);
    for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
      const xx=cx+dx,zz=cz+dz;if(xx<0||zz<0||xx>=navGrid.w||zz>=navGrid.h)continue;
      for(const id of navCells[zz*navGrid.w+xx]||[]){const n=navNodes[id],dy=Math.abs(n.y-y);if(dy>1.3)continue;const s=(n.x-x)**2+(n.z-z)**2+dy*dy*4;if(s<score){score=s;best=n;}}
    }return best;
  }
  function walkSegment(a,b){
    const d=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(d/.22));let prev=a.y;
    for(let k=1;k<=steps;k++){
      const t=k/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,ids=local(x,z,NAV_RADIUS);
      const f=floorAt(x,z,prev+STEP+.015,ids,true).y;
      if(!Number.isFinite(f)||f<prev-.5||Math.abs(f-(a.y+(b.y-a.y)*t))>1||ceilingAt(x,z,f+.05,ids,true)-f<NAV_HEIGHT||blockedAt(x,f+STEP+.01,z,NAV_RADIUS,NAV_HEIGHT-STEP-.02,ids,true))return false;
      prev=f;
    }return Math.abs(prev-b.y)<.15;
  }
  function neighbours(n){
    if(n.edges)return n.edges;const out=[],cx=n.cell%navGrid.w,cz=Math.floor(n.cell/navGrid.w);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dz)continue;const x=cx+dx,z=cz+dz;if(x<0||z<0||x>=navGrid.w||z>=navGrid.h)continue;
      for(const id of navCells[z*navGrid.w+x]||[]){const q=navNodes[id];if(Math.abs(q.y-n.y)>navGrid.cell*1.25+.1)continue;if(walkSegment(n,q))out.push(id);}
    }n.edges=out;return out;
  }
  o.build=function(){
    const started=clock();pathCache.clear();
    originalBuild();const g=originalGrid();navGrid=g;navCells=Array.from({length:g.w*g.h},()=>[]);navNodes=[];
    g.blocked.fill(1);
    for(let cz=1;cz<g.h-1;cz++)for(let cx=1;cx<g.w-1;cx++){
      const cell=cz*g.w+cx,x=g.minX+(cx+.5)*g.cell,z=g.minZ+(cz+.5)*g.cell,ids=local(x,z,NAV_RADIUS),heights=[];
      for(const id of ids){const T=tris[id];if(T.ny<.65)continue;const h=heightOn(T,x,z);if(h!==null&&!heights.some(y=>Math.abs(y-h)<.025))heights.push(h);}
      for(const b of boxes())if(!b.bulletOnly&&!b.noNav&&x>b.min.x&&x<b.max.x&&z>b.min.z&&z<b.max.z&&!heights.some(y=>Math.abs(y-b.max.y)<.025))heights.push(b.max.y);
      for(const y of heights){
        if(ceilingAt(x,z,y+.025,ids,true)-y<NAV_HEIGHT||blockedAt(x,y+STEP+.01,z,NAV_RADIUS,NAV_HEIGHT-STEP-.02,ids,true))continue;
        const n={id:navNodes.length,cell,x,y,z,edges:null,component:-1};navNodes.push(n);navCells[cell].push(n.id);g.blocked[cell]=0;
      }
    }
    navTiming.rasterMs=clock()-started;
    // Warm geometric edge checks while the loading screen is still visible.
    // Weak components provide a safe rejection test even if a future ledge
    // produces a one-way edge: different components can never have a route.
    const parent=Int32Array.from({length:navNodes.length},(_,k)=>k);
    const root=id=>{while(parent[id]!==id){parent[id]=parent[parent[id]];id=parent[id];}return id;};
    let edgeCount=0;
    for(const n of navNodes)for(const id of neighbours(n)){
      edgeCount++;const a=root(n.id),b=root(id);if(a!==b)parent[b]=a;
    }
    const labels=new Map();
    for(const n of navNodes){const id=root(n.id);if(!labels.has(id))labels.set(id,labels.size);n.component=labels.get(id);}
    navTiming.edges=edgeCount;navTiming.components=labels.size;
    navTiming.totalMs=clock()-started;navTiming.prewarmMs=navTiming.totalMs-navTiming.rasterMs;
  };
  const ensure=()=>{if(!navGrid)o.build();};
  o.nav={
    cell:o.nav.cell,
    isWalkable(x,z,y){ensure();const c=cellIndex(x,z);if(c<0)return false;return (navCells[c]||[]).some(id=>y===undefined||Math.abs(navNodes[id].y-y)<.8);},
    findPath(from,to){
      ensure();const start=nearest(from.x,from.y,from.z),goal=nearest(to.x,to.y,to.z);if(!start||!goal)return null;
      if(start.component!==goal.component){counters.navDisconnected++;return null;}
      const cacheKey=start.id+':'+goal.id;
      if(pathCache.has(cacheKey)){
        const ids=pathCache.get(cacheKey);pathCache.delete(cacheKey);pathCache.set(cacheKey,ids);counters.navCacheHits++;
        return ids===null?null:ids.map(id=>{const n=navNodes[id];return vec(n.x,n.y,n.z);});
      }
      const remember=ids=>{pathCache.set(cacheKey,ids);if(pathCache.size>128)pathCache.delete(pathCache.keys().next().value);};
      counters.navSearches++;
      const costs=new Float64Array(navNodes.length);costs.fill(Infinity);const prev=new Int32Array(navNodes.length);prev.fill(-1);const closed=new Uint8Array(navNodes.length),heap=[];
      const heuristic=n=>Math.hypot(n.x-goal.x,n.z-goal.z)+Math.abs(n.y-goal.y);
      const push=(id,f)=>{let k=heap.length;heap.push({id,f});while(k){const p=(k-1)>>1;if(heap[p].f<=f)break;heap[k]=heap[p];k=p;}heap[k]={id,f};};
      const pop=()=>{const out=heap[0],last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let c=k*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[k]=heap[c];k=c;}heap[k]=last;}return out.id;};
      costs[start.id]=0;push(start.id,heuristic(start));let visits=0;
      while(heap.length&&visits++<18000){const id=pop();if(closed[id])continue;if(id===goal.id)break;closed[id]=1;const n=navNodes[id];
        for(const next of neighbours(n)){if(closed[next])continue;const q=navNodes[next],cost=costs[id]+Math.hypot(q.x-n.x,q.z-n.z)+Math.abs(q.y-n.y)*.5;if(cost<costs[next]){costs[next]=cost;prev[next]=id;push(next,cost+heuristic(q));}}
      }
      counters.navExpanded+=visits;
      if(!Number.isFinite(costs[goal.id])){remember(null);return null;}
      const path=[];for(let id=goal.id;id!==start.id&&id>=0;id=prev[id])path.push(id);path.reverse();
      if(!path.length)path.push(goal.id);remember(path);
      return path.map(id=>{const n=navNodes[id];return vec(n.x,n.y,n.z);});
    },
    randomPoint(from,radius){ensure();const start=nearest(from.x,from.y,from.z);if(!start)return null;for(let k=0;k<30;k++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*radius,n=nearest(from.x+Math.cos(a)*r,from.y,from.z+Math.sin(a)*r,.8);if(n&&n.component===start.component&&Math.abs(n.y-from.y)<.8)return vec(n.x,n.y,n.z);}return vec(start.x,start.y,start.z);},
    clearLine(from,to){ensure();return walkSegment(from,to);},
    _grid(){ensure();return {...navGrid,layered:true,nodeCount:navNodes.length};}
  };
  o.canStand=(pos,height=1.8,rad=.32)=>{
    const ids=local(pos.x,pos.z,rad);
    if(blockedAt(pos.x,pos.y+.015,pos.z,rad,height-.03,ids))return false;
    for(const [dx,dz] of [[0,0],[rad,0],[-rad,0],[0,rad],[0,-rad]]) if(ceilingAt(pos.x+dx,pos.z+dz,pos.y+.015,ids)-pos.y<height-.01)return false;
    return true;
  };
  o.assaultDebug={
    stats:()=>({...counters,triangles:tris.length,bins:bins.size,navNodes:navNodes.length,navLayers:navCells.filter(a=>a.length>1).length,navTiming:{...navTiming},cachedPaths:pathCache.size}),
    floorsAt:(x,z)=>{const out=[];for(const id of local(x,z)){const T=tris[id];if(T.ny<.65)continue;const y=heightOn(T,x,z);if(y!==null&&!out.some(h=>Math.abs(h-y)<.025))out.push(y);}return out.sort((a,b)=>a-b);},
    capsuleBlocked:(x,y,z,r=.32,h=1.8)=>blockedAt(x,y,z,r,h)||ceilingAt(x,z,y+.01)-y<h,
    navigationReport:(from,targets=[])=>{ensure();const start=nearest(from.x,from.y,from.z),seen=new Set(),queue=start?[start.id]:[];if(start)seen.add(start.id);for(let k=0;k<queue.length;k++)for(const id of neighbours(navNodes[queue[k]]))if(!seen.has(id)){seen.add(id);queue.push(id);}return {reachable:seen.size,targets:targets.map(t=>{const goal=nearest(t.x,t.y,t.z);let best=null,d=Infinity;for(const id of seen){const n=navNodes[id],ds=Math.hypot(n.x-t.x,n.y-t.y,n.z-t.z);if(ds<d){d=ds;best=n;}}return {target:t,reachable:!!goal&&seen.has(goal.id),closest:best?{x:best.x,y:best.y,z:best.z,distance:d}:null};})};},
    nearestNav:(x,y,z)=>{ensure();const n=nearest(x,y,z);return n?{x:n.x,y:n.y,z:n.z,id:n.id,component:n.component}:null;}
  };
  return o;
}
