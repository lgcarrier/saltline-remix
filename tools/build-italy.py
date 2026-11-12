#!/usr/bin/env python3
"""Build an additional standalone Italy map from the shared Saltline/Assault engine.

The Assault builder remains the authority for shared controller and rendering fixes.
Its intermediate output is temporary; index.html and original.html are untouched.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT / 'italy.html')
args = parser.parse_args()

def source(path):
    return (ROOT / path).read_text(encoding='utf-8')

with tempfile.TemporaryDirectory(prefix='saltline-italy-') as temporary:
    base = Path(temporary) / 'assault.html'
    subprocess.run([sys.executable, str(ROOT / 'tools/build-assault.py'), '--output', str(base)], check=True)
    text = base.read_text(encoding='utf-8')

scene = json.loads(source('src/italy-map.json'))
assert scene['source']['map'] == 'cs_italy'
assert scene['surfaces'] and scene['collision']['positions']
modules = ['assault-physics.js', 'assault-materials.js', 'assault-performance.js',
           'italy-materials.js', 'italy-dressing.js', 'italy-hdri.js', 'italy-environment.js', 'italy-interior.js', 'italy-level.js']
start = text.index('window.__ASSAULT_MAP=')
end = text.index('function dR(i,e)', start)
payload = 'window.__ITALY_MAP=' + json.dumps(scene, separators=(',', ':')) + ';\n'
texture_manifest_path = ROOT / 'assets/italy/web/manifest.json'
texture_manifest = json.loads(texture_manifest_path.read_text()) if texture_manifest_path.exists() else {}

def image_data(path):
    data = path.read_bytes()
    prepared = texture_manifest.get(str(path.relative_to(ROOT / 'assets/italy')))
    mime = 'image/png'
    if prepared and hashlib.sha256(data).hexdigest() == prepared['sourceSha256']:
        encoded = (ROOT / 'assets/italy' / prepared['path']).read_bytes()
        if hashlib.sha256(encoded).hexdigest() != prepared['encodedSha256']:
            raise SystemExit('Encoded texture hash mismatch: ' + str(path))
        data, mime = encoded, prepared['mime']
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode('ascii')

textures = {key: image_data(ROOT / path) for key, path in [
    ('plaster', 'assets/italy/ochre-plaster-albedo.png'),
    ('cobble', 'assets/italy/limestone-cobble-albedo.png'),
    ('roof', 'assets/italy/terracotta-roof-albedo.png')]}
if (ROOT / 'assets/italy/limestone-wall-albedo.png').exists():
    textures['stone'] = image_data(ROOT / 'assets/italy/limestone-wall-albedo.png')
textures['sources'] = {path.stem: image_data(path) for path in sorted((ROOT / 'assets/italy/source').glob('*.png'))}
textures['remasters'] = {path.stem: image_data(path) for path in sorted((ROOT / 'assets/italy/remaster').glob('*.png'))}
payload += 'window.__ITALY_TEXTURES=' + json.dumps(textures, separators=(',', ':')) + ';\n'
sky_bytes = (ROOT / 'assets/italy/sky/qwantani_afternoon_puresky_2k.hdr').read_bytes()
sky_provenance = json.loads(source('assets/italy/sky/provenance.json'))
if hashlib.sha256(sky_bytes).hexdigest() != sky_provenance['sha256']:
    raise SystemExit('Italy HDRI source hash mismatch')
sky_payload = {'base64': base64.b64encode(sky_bytes).decode('ascii'),
               'asset': 'qwantani_afternoon_puresky', 'sha256': sky_provenance['sha256'],
               'radianceScale': 1, 'environmentIntensity': 1, 'pmremSize': 256}
payload += 'window.__ITALY_HDRI=' + json.dumps(sky_payload, separators=(',', ':')) + ';\n'
payload += '\n'.join(source('src/' + name) for name in modules) + '\n'
text = text[:start] + payload + text[end:]

def replace(old, new, count=1):
    global text
    if text.count(old) < count:
        raise SystemExit('Missing Italy integration anchor: ' + old[:100])
    text = text.replace(old, new, count)

# World and sky configuration must precede renderer/probe construction.
replace('QC().catch(i=>bM(i&&i.stack||i));',
        'try{italyConfigure();QC().catch(i=>bM(i&&i.stack||i));}catch(e){bM(e&&e.stack||e);}')
replace('var oi={min:new W(-73,0,-84),max:new W(35,28,32),groundY:0,seaY:-1.6,quayX:10000}',
        'var oi={min:new W(-46,-12,-70),max:new W(34,30,70),groundY:-100,seaY:-100,quayX:10000}')
replace('Ya=-73,EA=35,ol=-84,SA=32', 'Ya=-46,EA=34,ol=-70,SA=70')
replace('C.pos.x<=oi.quayX-1.2&&C.pos.y>-.5&&D.copy(C.pos)', 'C.pos.y>-20&&D.copy(C.pos)')
replace('C.pos.y<oi.seaY-2.2', 'C.pos.y<-12')
replace('Gy(h,new W(-53,-2,-81),new W(31,23,28),new W(-73,-4,-86),new W(40,32,36))',
        'Gy(h,new W(-43,-7,-67),new W(31,14,67),new W(-46,-10,-70),new W(34,30,70))')
replace('()=>assaultHarbor(t)', '()=>italyBackdrop(t)')
replace('()=>assaultGround(t)', '()=>italyGround(t)')
replace('t.weapon.setWetness(c)', 't.weapon.setWetness(0)')
# Clear-sky Italy uses the sun's physical half-angle. A central blocker sample
# keeps narrow sill shadows from randomly becoming fully lit when the rotated
# sparse search disk misses their geometry. This is local to the Italy build.
replace('qy(f,{taps:i.quality.name==="low"?10:16,searchTaps:8})',
        'qy(f,{taps:i.quality.name==="low"?12:24,searchTaps:12})')
replace('float blk = 0.0, nb = 0.0;',
        'float centerDepth = unpackRGBAToDepth( texture2D( shadowMap, sc.xy ) );\n'
        '\t\tfloat centerBlocker = centerDepth < zr ? 1.0 : 0.0;\n'
        '\t\tfloat blk = centerDepth * centerBlocker, nb = centerBlocker;')
replace('distM * 0.022 * shadowRadius', 'distM * 0.00465 * shadowRadius')
# The harbour's depth-scaled AO bias skips centimetre-scale contacts in this
# compact village. Keep a small distance allowance for the half-resolution
# depth buffer while retaining crate bases, stone returns and stall joints.
replace('(vn - (0.015 + 0.004 * z0))', '(vn - (0.008 + 0.001 * min(z0, 12.0)))')

# Keep all synthesized assets available; select a dry wind bed for this map.
replace('Oe.rain.setGain(fe*(1-.93*P)*.95)', 'Oe.rain.setGain(0)')
replace('Oe.rainIn.setGain(fe*P*.95)', 'Oe.rainIn.setGain(0)')
replace('Oe.sea.setGain(fe*(1-.5*P)*1)', 'Oe.sea.setGain(0)')
replace('function Os(te,he){let pe=1-.7*P;', 'function Os(te,he){return;let pe=1-.7*P;')

# Native Italy has a 1.6256m high window above the crate staircase. Airborne
# ducking tucks feet without moving the head, preserving sprint-jump momentum.
# This opt-in stance change leaves Assault and Dust controller behavior intact.
controller_start = text.index('function x_(i)')
stance_start = text.index('function G(){', controller_start)
stance_end = text.index('function j()', stance_start)
text = text[:stance_start] + (
    'function italyResizeStance(height){const before=C.pos.y;'
    'const ok=i.physics.resizeCapsule(C.pos,C.crouching?Mt.crouchHeight:Mt.standHeight,height,!C.onGround,Pi.radius);'
    'if(ok)s-=C.pos.y-before;return ok}'
    'function G(){return italyResizeStance(Mt.standHeight)}'
) + text[stance_end:]
replace('re&&X.crouch?C.crouching=!0:C.crouching&&G()&&(C.crouching=!1)',
        're&&X.crouch?(!C.crouching&&italyResizeStance(Mt.crouchHeight)&&(C.crouching=!0)):C.crouching&&G()&&(C.crouching=!1)')
replace('C.crouching?P=Mt.crouch:B&&(P=Mt.sprint),',
        'C.crouching?P=Mt.crouch:B&&(P=Mt.sprint),C.crouching&&!C.onGround&&(P=Math.max(P,Math.min(Mt.sprint,Math.hypot(C.vel.x,C.vel.z)))),')

replacements = {
    '<title>Saltline · Assault</title>': '<title>Saltline · Italy</title>',
    'aria-label="Saltline Assault"': 'aria-label="Saltline Italy"',
    '<p class="assault-subtitle">ASSAULT</p>': '<p class="assault-subtitle">ITALY</p>',
    'Saltline Terminal \\xB7 Assault': 'Village operations \\xB7 Italy',
    'Saltline Terminal \\xB7 cs_assault \\xB7 Remix': 'Italy \\xB7 cs_italy \\xB7 Saltline Remix',
    'Port Authority Breach Unit': 'Saltline Expeditionary Unit',
    'Breach the freight depot. Disable its security uplinks. Return to the rescue perimeter.':
        'Breach the village outpost. Cut three security uplinks. Return to the extraction zone.',
    'The original Assault layout. Saltline weapons, machines, materials and sound.':
        'The original cs_italy layout. Saltline arsenal. A new village theatre.',
    'Breacher, this is Control. Assault freight depot is locked down. Cut the uplinks in the hall, operations office and roof.':
        'Breacher, this is Control. Italy is locked down. Cut the security uplinks at the market, apartments and hillside house.',
    'Assault \\xB7 Debrief': 'Italy \\xB7 Debrief',
    'Breacher is aboard. Saltline is dark. Good work.': 'Breacher extracted. Italy is dark. Good work.',
    'Hauled out of the water': 'Returned to safe ground',
    'Mixing paint, rust and rain': 'Preparing plaster, terracotta and limestone',
    'Stacking containers': 'Rebuilding the village outpost',
    'Raising the cranes': 'Opening the village horizon',
    'Flooding the apron': 'Laying the cobbled streets',
}
for old, new in replacements.items():
    text = text.replace(old, new)
text = text.replace('href="index.html" aria-current="page"', 'href="index.html"')
text = text.replace('href="italy.html"', 'href="italy.html" aria-current="page"')
# Italy owns its visible identity; engine identifiers and source attribution stay intact.
for old, new in {
    '<title>Saltline · Italy</title>': '<title>Italy</title>',
    'SALTLINE · ASSAULT': 'ITALY',
    'Raising the terminal': 'Preparing the village outpost',
    'aria-label="Saltline Italy"': 'aria-label="Italy"',
    '<h1 class="m-word">SALTLINE</h1>': '<h1 class="m-word">ITALY</h1>',
    '        <p class="assault-subtitle">ITALY</p>': '',
    'Saltline Expeditionary Unit': 'Village Expeditionary Unit',
    'Saltline arsenal. A new village theatre.': 'Three uplinks. One extraction. Jump onto crates; crouch in the air to enter low windows.',
    'Saltline Remix': 'Village Operations',
    'Saltline is dark': 'Italy is dark',
    'Saltline could not start: ': 'Italy could not start: ',
    'SALTLINE BENCH': 'ITALY BENCH',
    'SALTLINE TERMINAL': 'ITALY OUTPOST',
    'SALTLINE 04': 'ITALY 04',
    '"SALTLINE"': '"ITALY"',
    '  SALTLINE': '  ITALY',
    'PROPERTY OF PORT AUTHORITY': 'EXPEDITIONARY UNIT EQUIPMENT',
}.items():
    text = text.replace(old, new)

args.output.write_text(text, encoding='utf-8')
print(f'Built {args.output.name}: {len(text.encode()):,} bytes')
