#!/usr/bin/env python3
"""Build an additional standalone Dust map from the shared Saltline/Assault engine.

The Assault builder remains the authority for shared controller and rendering fixes.
Its intermediate output is temporary; index.html and original.html are untouched.
"""
from pathlib import Path
import argparse
import base64
import json
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT / 'dust.html')
args = parser.parse_args()

def source(path):
    return (ROOT / path).read_text(encoding='utf-8')

with tempfile.TemporaryDirectory(prefix='saltline-dust-') as temporary:
    base = Path(temporary) / 'assault.html'
    subprocess.run([sys.executable, str(ROOT / 'tools/build-assault.py'), '--output', str(base)], check=True)
    text = base.read_text(encoding='utf-8')

scene = json.loads(source('src/dust-map.json'))
assert scene['source']['map'] == 'de_dust'
assert scene['surfaces'] and scene['collision']['positions']
modules = ['assault-physics.js', 'assault-materials.js', 'assault-performance.js',
           'dust-materials.js', 'dust-dressing.js', 'dust-environment.js', 'dust-level.js']
start = text.index('window.__ASSAULT_MAP=')
end = text.index('function dR(i,e)', start)
payload = 'window.__DUST_MAP=' + json.dumps(scene, separators=(',', ':')) + ';\n'
textures = {key: 'data:image/png;base64,' + base64.b64encode((ROOT / path).read_bytes()).decode('ascii')
            for key, path in [('plaster', 'assets/dust/lime-plaster-albedo.png'), ('road', 'assets/dust/desert-road-albedo.png')]}
payload += 'window.__DUST_TEXTURES=' + json.dumps(textures, separators=(',', ':')) + ';\n'
payload += '\n'.join(source('src/' + name) for name in modules) + '\n'
text = text[:start] + payload + text[end:]

def replace(old, new, count=1):
    global text
    if text.count(old) < count:
        raise SystemExit('Missing Dust integration anchor: ' + old[:100])
    text = text.replace(old, new, count)

# World and sky configuration must precede renderer/probe construction.
replace('QC().catch(i=>bM(i&&i.stack||i));', 'dustConfigure();QC().catch(i=>bM(i&&i.stack||i));')
replace('var oi={min:new W(-73,0,-84),max:new W(35,28,32),groundY:0,seaY:-1.6,quayX:10000}',
        'var oi={min:new W(-75,-12,-104),max:new W(70,24,56),groundY:-100,seaY:-100,quayX:10000}')
replace('Ya=-73,EA=35,ol=-84,SA=32', 'Ya=-75,EA=70,ol=-104,SA=56')
replace('C.pos.x<=oi.quayX-1.2&&C.pos.y>-.5&&D.copy(C.pos)', 'C.pos.y>-20&&D.copy(C.pos)')
replace('C.pos.y<oi.seaY-2.2', 'C.pos.y<-12')
replace('Gy(h,new W(-53,-2,-81),new W(31,23,28),new W(-73,-4,-86),new W(40,32,36))',
        'Gy(h,new W(-73,-7,-102),new W(68,13,54),new W(-75,-10,-104),new W(70,24,56))')
replace('()=>assaultHarbor(t)', '()=>dustBackdrop(t)')
replace('()=>assaultGround(t)', '()=>dustGround(t)')
replace('t.weapon.setWetness(c)', 't.weapon.setWetness(0)')

# Keep all synthesized assets available; select a dry wind bed for this map.
replace('Oe.rain.setGain(fe*(1-.93*P)*.95)', 'Oe.rain.setGain(0)')
replace('Oe.rainIn.setGain(fe*P*.95)', 'Oe.rainIn.setGain(0)')
replace('Oe.sea.setGain(fe*(1-.5*P)*1)', 'Oe.sea.setGain(0)')
replace('function Os(te,he){let pe=1-.7*P;', 'function Os(te,he){return;let pe=1-.7*P;')

replacements = {
    '<title>Saltline · Assault</title>': '<title>Saltline · Dust</title>',
    'aria-label="Saltline Assault"': 'aria-label="Saltline Dust"',
    '<p class="assault-subtitle">ASSAULT</p>': '<p class="assault-subtitle">DUST</p>',
    'Saltline Terminal \\xB7 Assault': 'Desert operations \\xB7 Dust',
    'Saltline Terminal \\xB7 cs_assault \\xB7 Remix': 'Dust \\xB7 de_dust \\xB7 Saltline Remix',
    'Port Authority Breach Unit': 'Saltline Expeditionary Unit',
    'Breach the freight depot. Disable its security uplinks. Return to the rescue perimeter.':
        'Breach the desert outpost. Cut three security uplinks. Return to the extraction zone.',
    'The original Assault layout. Saltline weapons, machines, materials and sound.':
        'The original de_dust layout. Saltline arsenal. A new desert theatre.',
    'Breacher, this is Control. Assault freight depot is locked down. Cut the uplinks in the hall, operations office and roof.':
        'Breacher, this is Control. Dust is locked down. Cut the security uplinks at sites A, B and the tunnel junction.',
    'Assault \\xB7 Debrief': 'Dust \\xB7 Debrief',
    'Breacher is aboard. Saltline is dark. Good work.': 'Breacher extracted. Dust is dark. Good work.',
    'Hauled out of the water': 'Returned to safe ground',
    'Mixing paint, rust and rain': 'Preparing sandstone, timber and steel',
    'Stacking containers': 'Rebuilding the desert outpost',
    'Raising the cranes': 'Opening the desert horizon',
    'Flooding the apron': 'Settling the sand',
}
for old, new in replacements.items():
    text = text.replace(old, new)
text = text.replace('href="index.html" aria-current="page"', 'href="index.html"')
text = text.replace('href="dust.html"', 'href="dust.html" aria-current="page"')
args.output.write_text(text, encoding='utf-8')
print(f'Built {args.output.name}: {len(text.encode()):,} bytes')
