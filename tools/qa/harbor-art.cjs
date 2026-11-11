// Staged player-height inspection, separate from input-only route evidence.
// These positions were chosen from source roof/road surfaces, not free-camera
// vista locations beyond the spawn-connected navigation component.
globalThis.capturePrefix='v9-final';
globalThis.captureShots=[
 ['crane-roof',[-12,14.7,-49,60,35,40]],
 ['ship-road',[-44.125,8.1824,-55.125,-85,12,-40]],
 ['ship-roof',[-12,14.7,-49,-87,8,-40]],
 ['cargo-yard',[3,1.7,-22,-7,2.5,-32]],
 ['hall-stack',[6.5,2.5,-60,13.8,4.7,-53.5]],
 ['hall',[3,1.7,-52,0,4,-65]],
 ['office',[-20,10.2144,-66,-20.5,10,-60]],
 ['truck',[15.5,1.3,-3.7,9.8,1.3,-8.3]]
];
return await runQA('capture-final');
