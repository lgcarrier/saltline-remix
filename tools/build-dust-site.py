#!/usr/bin/env python3
"""Package the verified games unchanged, with Dust as the Site entry point."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT / 'dist')
args = parser.parse_args()
output = args.output.resolve()
if output == ROOT or ROOT.is_relative_to(output):
    raise SystemExit('Use a dedicated static output directory')
(output / 'game').mkdir(parents=True, exist_ok=True)
records = {}
for name in ('dust.html', 'index.html', 'original.html'):
    source = ROOT / name
    target = output / 'game' / name
    shutil.copyfile(source, target)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
    records['game/' + name] = {'sha256': digest, 'bytes': source.stat().st_size}

# Keeping the existing filenames together preserves every map-selector href
# and each verified HTML hash. Only this small entry document is new.
(output / 'index.html').write_text('''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Saltline · Dust</title>
<meta name="description" content="Play Dust, an additional Saltline mission with a complete desert map, robotic enemies and three uplinks.">
<meta http-equiv="refresh" content="0;url=game/dust.html">
<style>body{margin:0;background:#101416;color:#eee6d5;font:18px system-ui;min-height:100vh;display:grid;place-items:center}main{padding:32px;max-width:36rem}a{color:#e6b767}h1{font-size:2.5rem}p{line-height:1.6}</style>
<script>
const destination=new URL('game/dust.html',location.href);
destination.search=location.search;destination.hash=location.hash;
location.replace(destination.href);
</script>
</head>
<body><main><h1>Saltline · Dust</h1><p><a href="game/dust.html">Launch Dust</a></p><p><a href="game/index.html">Assault</a> · <a href="game/original.html">Saltline original</a></p></main></body>
</html>
''', encoding='utf-8')
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
manifest = {'source_commit': commit, 'entry': 'game/dust.html', 'files': records}
(output / 'build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(output), **manifest}, indent=2))
