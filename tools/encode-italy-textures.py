#!/usr/bin/env python3
"""Encode generated opaque PNG art as quality-92 JPEG for the standalone build.

Original art is preserved. True-alpha cutouts remain PNG. Uses macOS sips or
Pillow when available; this optional asset preparation step is separate from
the dependency-free game build. Dimensions and image composition are unchanged.
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/italy'
OUT = ART / 'web'
OUT.mkdir(exist_ok=True)
manifest_path = OUT / 'manifest.json'
previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
manifest = {}
sips = shutil.which('sips')
for image in sorted(ART.rglob('*.png')):
    relative = image.relative_to(ART)
    if relative.parts[0] in ('source', 'web'):
        continue
    digest = hashlib.sha256(image.read_bytes()).hexdigest()
    encoded = OUT / relative.with_suffix('.jpg')
    key = str(relative)
    old = previous.get(key, {})
    if old.get('sourceSha256') == digest and encoded.exists():
        manifest[key] = old
        continue
    if sips:
        metadata = subprocess.check_output([sips, '-g', 'hasAlpha', str(image)], text=True)
        if 'hasAlpha: yes' in metadata:
            continue
        encoded.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([sips, '-s', 'format', 'jpeg', '-s', 'formatOptions', '92', str(image), '--out', str(encoded)], check=True, stdout=subprocess.DEVNULL)
    else:
        from PIL import Image
        with Image.open(image) as source:
            if 'A' in source.getbands() and source.getchannel('A').getextrema()[0] < 255:
                continue
            encoded.parent.mkdir(parents=True, exist_ok=True)
            source.convert('RGB').save(encoded, quality=92, subsampling=0, optimize=True)
    manifest[key] = {'sourceSha256': digest, 'encodedSha256': hashlib.sha256(encoded.read_bytes()).hexdigest(),
                     'path': str(encoded.relative_to(ART)), 'mime': 'image/jpeg', 'quality': 92,
                     'sourceBytes': image.stat().st_size, 'encodedBytes': encoded.stat().st_size}
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'images': len(manifest), 'sourceBytes': sum(x['sourceBytes'] for x in manifest.values()),
                  'encodedBytes': sum(x['encodedBytes'] for x in manifest.values())}))
