#!/usr/bin/env python3
"""Rebuild the standalone Assault remix without changing the original game."""
from pathlib import Path
import json
import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=Path, help="Output HTML path (default: repository index.html)")
args = parser.parse_args()

ROOT = Path(__file__).resolve().parent.parent
def source(relative):
    path = ROOT / relative
    if not path.is_file():
        raise SystemExit(f'Missing required build input: {relative}')
    return path.read_text(encoding='utf-8')

text = source('reference/grok-assault.html')
start = text.index('window.__ASSAULT=')
end = text.index('function dR(i,e)', start)
scene = json.loads(source('src/assault-map.json'))
if not scene.get('surfaces') or not scene.get('collision', {}).get('positions'):
    raise SystemExit('Required Assault map has no render or collision geometry')
modules = ['assault-physics.js', 'assault-dressing.js', 'assault-ground.js', 'assault-harbor-water.js', 'assault-terminal.js', 'assault-harbor-materials.js', 'assault-harbor.js', 'assault-vehicle.js', 'assault-materials.js', 'assault-office.js', 'assault-architecture.js', 'assault-lighting.js', 'assault-performance.js', 'assault-level.js']
# The draft's encoded geometry, relays and lights have all been replaced by the
# BSP extraction and authored level. Do not ship its unused duplicate payload.
payload = 'window.__ASSAULT_MAP=' + json.dumps(scene,separators=(',',':')) + ';\n'
for name in modules:
    payload += source('src/' + name) + '\n'
ui_css = source('src/assault-ui.css')
text = text[:start] + payload + text[end:]

def replace(old,new,count=1):
    global text
    if text.count(old) < count:
        raise SystemExit(f'Upstream anchor missing: {old[:90]}')
    text = text.replace(old,new,count)

replace('<title>SALTLINE · ASSAULT</title>','<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<link rel="icon" href="data:,">\n<title>Saltline · Assault</title>')
replace('Gy(h,new W(-41,-.2,-33),new W(37,32,31),new W(-41,-3,-64),new W(72,36,34))','Gy(h,new W(-53,-2,-81),new W(31,23,28),new W(-73,-4,-86),new W(40,32,36))')
replace('function G(){let F=i.physics&&i.physics.boxes;', 'function G(){if(i.physics.canStand&&!i.physics.canStand(C.pos,Mt.standHeight,Pi.radius))return false;let F=i.physics&&i.physics.boxes;')
replace('function H(){a(i.enemies,"clear"),','function H(){s.reset&&s.reset();a(i.enemies,"clear"),')
# The level owns AO tuning; refresh uniforms after initialization as it already
# does for the other post-process settings.
replace('z.uniforms.uAspect.value=Re,l(z,y.aoA)','z.uniforms.uAspect.value=Re,z.uniforms.uRadius.value=g.aoRadius,z.uniforms.uIntensity.value=g.aoIntensity,l(z,y.aoA)')
replace('be.uVolOn.value=dt?1:0,l(U,y.scene)','be.uVolOn.value=dt?1:0,be.uAoStrength.value=g.aoStrength,l(U,y.scene)')
replace('()=>({stub:!1,update(){}})','()=>assaultGround(t)')
replace('let a=0;if(window.__stats=', 'await assaultPrewarm(t);let a=0;if(window.__stats=')
replace('()=>Eb(t,{only:"sky"})','()=>assaultHarbor(t)')
replace('t.backdrop&&t.backdrop.skyline&&(t.backdrop.skyline.visible=!1),t.backdrop&&t.backdrop.gulls&&(t.backdrop.gulls.visible=!1),','')
replace('Math.abs((Y.o.pos.y||0)-n.pos.y)>2.5||','Math.abs((Y.o.pos.y||0)-n.pos.y)>2.5||!i.physics.lineOfSight(n.eye,new W(Y.o.pos.x,Y.o.pos.y+1.25,Y.o.pos.z))||')
# Preserve the input loop but report the actual Assault setting and objective.
text=text.replace('Every surface, machine and sound is generated in your browser. Nothing is downloaded.','The original Assault layout. Saltline weapons, machines, materials and sound.')
text=text.replace('The port\\u2019s security net has gone feral. Cut its three uplinks. Reach the boat.','Breach the freight depot. Disable its security uplinks. Return to the rescue perimeter.')
text=text.replace('Breacher, this is Control. The Harbormaster holds the berth. Cut its three uplinks \\u2014 yard, shed, quay.','Breacher, this is Control. Assault freight depot is locked down. Cut the uplinks in the hall, operations office and roof.')
text=text.replace('All three dark. The boat is holding at the quay ladder, south end. Run.','All three dark. Return to the marked rescue perimeter at the approach. Move.')
text=text.replace('Relays still live \\u2014 the boat will not wait under fire','Relays still live \\u2014 disable all three uplinks before extraction')
text=text.replace('<p class="m-dim">ASSAULT</p>','<p class="assault-subtitle">ASSAULT</p>')
text=text.replace('Berth 4 \\xB7 Debrief','Assault \\xB7 Debrief')
# Multi-storey navigation needs actor height at every legacy walkability call.
for old,new in [('me.isWalkable($,ue)','me.isWalkable($,ue,m.pos.y)'),('me.isWalkable($,m.pos.z)','me.isWalkable($,m.pos.z,m.pos.y)'),('me.isWalkable(m.pos.x,ue)','me.isWalkable(m.pos.x,ue,m.pos.y)'),('s.physics.nav.isWalkable(Q.x,Q.z)','s.physics.nav.isWalkable(Q.x,Q.z,Q.y)'),('i.physics.nav.isWalkable(fe.x+le,fe.z+R)','i.physics.nav.isWalkable(fe.x+le,fe.z+R,fe.y)')]:
    replace(old,new,text.count(old) or 1)
# Exterior rescue point replaces boat wording inherited from the original mission.
for old,new in [('Get to the boat','Return to the rescue perimeter'),('Reach the boat','Reach the rescue perimeter'),('Board the boat','Reach extraction'),('Boat inbound','Rescue inbound')]: text=text.replace(old,new)
replace('</style>',ui_css+'\n</style>')
replace('<p class="assault-subtitle">ASSAULT</p>', '<p class="assault-subtitle">ASSAULT</p>\n<nav class="map-select" aria-label="Choose a map"><a href="index.html" aria-current="page">Assault</a><a href="dust.html">Dust</a><a href="original.html">Saltline original</a></nav>')
replace('</style>', '.map-select{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}.map-select a{color:var(--bone-dim);font:12px var(--f-mono);text-decoration:none;padding:8px 12px;border:1px solid var(--line);background:rgba(11,13,15,.45)}.map-select a:hover,.map-select a:focus-visible{color:var(--bone);border-color:var(--signal)}.map-select a[aria-current]{color:var(--signal);border-color:var(--signal)}\n</style>')
output = args.output.resolve() if args.output else ROOT / 'index.html'
output.write_text(text, encoding='utf-8')
print(f'Built {output.name}: {len(text.encode()):,} bytes')
