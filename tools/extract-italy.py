#!/usr/bin/env python3
"""Extract the complete supplied cs_italy BSP using the shared GoldSrc decoder.

The archive is input data, never executable build instructions. Native world and
brush geometry, source UVs, baked vertex lighting, collision and entity metadata
are retained. Additional render metadata distinguishes transparent decoration
and intentionally invisible interaction proxies from opaque architecture.
"""
from __future__ import annotations
import argparse
import importlib.util
import json
import math
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('saltline_goldsrc', ROOT / 'tools/extract-dust.py')
bsp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bsp)


def classify(name):
    t = name.lower()
    # Preserve source-aligned authored details before broad facade families.
    if any(x in t for x in ('wnd', 'window', 'door', 'mural', 'painting', 'rug', 'crate', 'barrel', 'pileo', 'fishbox', 'radio', 'drawers', 'sheep', 'spadish', 'spade', 'light', 'flower', 'wlpaper', 'post', 'brdr', 'mktfloor', 'grouttiles')):
        return 'italy_detail'
    if 'steel' in t or 'generic64b' in t:
        return 'steel_dark'
    if 'clayroof' in t:
        return 'italy_roof'
    if any(x in t for x in ('cobble', 'brickpath', 'mktfloor', 'grouttiles')):
        return 'italy_cobble'
    if any(x in t for x in ('sandybrick', 'rwallgbrick', 'brickgrass')):
        return 'italy_brick'
    if 'rock' in t or 'stone' in t or 'concrete' in t or 'ccwall' in t:
        return 'italy_stone'
    if 'grystucco' in t:
        return 'italy_plaster_sage'
    if 'wlstucco' in t:
        return 'italy_plaster_cream'
    if 'bstucco' in t:
        return 'italy_plaster_ochre'
    if 'wood' in t:
        return 'italy_wood'
    return 'italy_detail'


def surface_category(name):
    t = name.lower()
    if any(k in t for k in ('wood', 'door', 'crate', 'barrel', 'drawers')):
        return 'wood'
    if 'steel' in t:
        return 'metal'
    return 'concrete'


def extract(blob, source_name):
    bsp.classify = classify
    scene = bsp.extract(blob, source_name, surface_category=surface_category)
    scene['source'].update({'map': 'cs_italy', 'originalTitle': 'cs_italy'})
    # The BSP and archive do not encode an individual map-author credit.
    scene['source'].pop('author', None)
    scene['source']['attribution'] = 'Counter-Strike / Valve source assets supplied by user; original map authorship not encoded in BSP'
    scene['bombsites'] = []
    scene['hostages'] = [e for e in scene['entities'] if e['classname'] == 'hostage_entity']
    scene['rescueZones'] = [e for e in scene['entities'] if e['classname'] in ('info_hostage_rescue', 'func_hostage_rescue')]
    by_model = {int(e['properties']['model'][1:]): e['properties'] for e in scene['entities'] if e['properties'].get('model', '').startswith('*')}
    for s in scene['surfaces'] + [s for d in scene['breakables'] + scene['doors'] for s in d['surfaces']]:
        p = by_model.get(s['modelId'], {})
        s['renderMode'] = int(p.get('rendermode', '0'))
        s['renderAmount'] = int(p.get('renderamt', '0' if s['renderMode'] else '255'))
        s['renderColor'] = [float(v) / 255 for v in p.get('rendercolor', '255 255 255').split()]
        s['targetname'] = p.get('targetname', '')
        # GoldSrc uses rendermode 2 + absent renderamt for invisible proxies.
        s['visible'] = not (s['renderMode'] in (1, 2, 3, 5) and s['renderAmount'] == 0)
    for d in scene['breakables']:
        d['visible'] = any(s['visible'] for s in d['surfaces'])
        d['target'] = d['properties'].get('target', '')
    scene['stats']['visibleStaticGroups'] = sum(s['visible'] for s in scene['surfaces'])
    scene['stats']['hostages'] = len(scene['hostages'])
    scene['stats']['nativeSpawns'] = {c: sum(e['classname'] == c for e in scene['entities']) for c in ('info_player_start', 'info_player_deathmatch')}
    return scene


def validate(scene):
    assert scene['source']['map'] == 'cs_italy'
    assert scene['stats']['models'] == 102
    assert not scene['doors'] and not scene['ladders']
    assert len(scene['breakables']) == 5
    assert len(scene['hostages']) == 4 and len(scene['rescueZones']) == 1
    assert all(n == 10 for n in scene['stats']['nativeSpawns'].values())
    for surface in scene['surfaces'] + [s for d in scene['doors'] + scene['breakables'] for s in d['surfaces']]:
        v = len(surface['positions']) // 3
        assert len(surface['positions']) == len(surface['normals']) == len(surface['vertexLight'])
        assert len(surface['uvMeters']) == len(surface['uvSource']) == v * 2
        assert v == surface['triangles'] * 3
        assert all(math.isfinite(x) for key in ('positions', 'normals', 'uvMeters', 'uvSource', 'vertexLight') for x in surface[key])
    triggers = {e['modelId'] for e in scene['triggers']}
    assert all(s['modelId'] not in triggers for s in scene['surfaces'])
    for c in [scene['collision']] + [b['collision'] for b in scene['breakables']]:
        cursor = 0
        for run in c['ranges']:
            assert run['start'] == cursor and run['count'] % 3 == 0
            cursor += run['count']
        assert cursor * 3 == len(c['positions'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'reference/cs_italy_cs16.zip')
    parser.add_argument('--output', type=Path, default=ROOT / 'src/italy-map.json')
    args = parser.parse_args()
    with zipfile.ZipFile(args.source) as archive:
        scene = extract(archive.read('cs_italy.bsp'), args.source.name)
    validate(scene)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(scene, separators=(',', ':'), ensure_ascii=True) + '\n')
    print(json.dumps({'output': str(args.output), 'bytes': args.output.stat().st_size, 'bounds': scene['bounds'], 'stats': scene['stats']}, indent=2))


if __name__ == '__main__':
    main()
