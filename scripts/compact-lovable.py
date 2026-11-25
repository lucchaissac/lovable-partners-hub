#!/usr/bin/env python3
"""Fit an existing audited handoff below a 20 MB upload limit.

Keep all application files, original identities, fonts and editable geometry.
Only re-encode video media, selected raster visuals and the grain texture. Reorder the
offline city dictionary losslessly to improve standard ZIP compression.
Requires the repository's sharp dependency and imageio-ffmpeg for packaging.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import io
import json
import shutil
import subprocess
import sys
import zipfile

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).expanduser().resolve()
target = Path(sys.argv[2]).expanduser().resolve()
if target.exists():
    raise SystemExit('Choose a new compact output directory.')
manifest = json.loads((source / 'docs/SOURCE_MANIFEST.json').read_text())
entries = manifest['files']
for entry in entries:
    rel = Path(entry['path'])
    src = source / rel
    if rel.is_absolute() or '..' in rel.parts or src.is_symlink():
        raise SystemExit('Unsafe source path.')
    if hashlib.sha256(src.read_bytes()).hexdigest() != entry['sha256']:
        raise SystemExit('Source changed after its audit: '+str(rel))
for entry in entries:
    dest = target / entry['path']
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / entry['path'], dest)

def video_info(path):
    reader = imageio_ffmpeg.read_frames(str(path))
    try:
        info = next(reader)
        return {k: info[k] for k in ['size', 'fps', 'duration', 'codec']}
    finally:
        reader.close()

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
videos = sorted(path for path in target.rglob('*.mp4'))
media_report = {}

def encode_video(item):
    dest, crf = item
    rel = str(dest.relative_to(target))
    src = source / rel
    temporary = dest.with_suffix('.encoding.mp4')
    subprocess.run([
        ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src),
        '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264',
        '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p',
        '-threads', '2', '-c:a', 'copy', '-movflags', '+faststart',
        '-map_metadata', '-1', str(temporary),
    ], check=True)
    before, after = video_info(src), video_info(temporary)
    if before['size'] != after['size'] or before['fps'] != after['fps'] or abs(before['duration']-after['duration']) > .02:
        raise RuntimeError('Video geometry or timing changed: '+rel)
    if temporary.stat().st_size < src.stat().st_size:
        temporary.replace(dest)
    else:
        temporary.unlink()
        shutil.copyfile(src, dest)
    print(f'{rel}: {src.stat().st_size:,} -> {dest.stat().st_size:,} bytes', flush=True)
    return rel, {'originalBytes': src.stat().st_size, 'compactBytes': dest.stat().st_size, 'video': before}

grain = 'public/tech-blog/assets/40e245aedce7ea2c.webp'
node_script = """
const sharp=require(process.argv[1]);
(async()=>{
 const input=process.argv[2],output=process.argv[3];
 const before=await sharp(input).metadata();
 const bytes=await sharp(input).webp({quality:86,alphaQuality:50,effort:6}).toBuffer();
 const after=await sharp(bytes).metadata();
 if(before.width!==after.width||before.height!==after.height||before.hasAlpha!==after.hasAlpha)throw Error('Texture geometry changed');
 await require('node:fs/promises').writeFile(output,bytes);
})().catch(e=>{console.error(e.message);process.exit(1);});
"""
subprocess.run(['node', '-e', node_script, str(ROOT/'node_modules/sharp'), str(source/grain), str(target/grain)], check=True)
media_report[grain] = {'originalBytes': (source/grain).stat().st_size, 'compactBytes': (target/grain).stat().st_size, 'dimensionsPreserved': True, 'transparencyPreserved': True}

# These four large editorial visuals benefit from ordinary WebP recompression.
# Keep their full dimensions and lossless alpha; do not touch PNG export masters.
visual_script = node_script.replace('quality:86,alphaQuality:50,effort:6', 'quality:82,alphaQuality:100,effort:6')
for name in ['mediterranean-materials.webp', 'paper-collage.webp', 'malaga-makers.webp', 'flash-light.webp']:
    rel = 'public/ambassadors/library/'+name
    subprocess.run(['node', '-e', visual_script, str(ROOT/'node_modules/sharp'), str(source/rel), str(target/rel)], check=True)
    if (target/rel).stat().st_size >= (source/rel).stat().st_size:
        shutil.copyfile(source/rel, target/rel)
    media_report[rel] = {'originalBytes': (source/rel).stat().st_size, 'compactBytes': (target/rel).stat().st_size, 'dimensionsPreserved': True, 'losslessAlpha': True}

cities_path = target/'public/ambassadors/assets/cities.json'
original = json.loads(cities_path.read_text())
grouped = {**original, 'cities': dict(sorted(original['cities'].items(), key=lambda item: (*item[1], item[0])))}
assert grouped == original
cities_path.write_text(json.dumps(grouped, ensure_ascii=False, separators=(',', ':'))+'\n')

def update_metadata(crf):
    report = {
        'version': 1,
        'uploadLimitBytes': 20_000_000,
        'videoEncoding': {'codec': 'h264', 'crf': crf, 'dimensionsAndTiming': 'preserved'},
        'changes': media_report,
        'offlineCities': {'allEntriesPreserved': True, 'attributionPreserved': True, 'change': 'dictionary key order only'},
        'applicationSource': 'unchanged',
        'originalVectorsFontsAndPngMasters': 'unchanged',
    }
    (target/'docs/COMPACT_MEDIA.json').write_text(json.dumps(report, indent=2)+'\n')
    (target/'docs/COMPACT_PACKAGE.md').write_text('''# Compact upload package

This self-contained archive is sized for an upload limit of 20,000,000 bytes.
All application code, agent instructions, constraints, original vectors, fonts,
editable templates and PNG masters are retained. No remote asset downloads or
additional archive are required.

Gallery videos use stronger H.264 compression, preserving every video's native
dimensions, frame rate and complete duration. The decorative Tech blog grain
texture retains its dimensions and transparency with compressed alpha detail.
Four large library visuals are recompressed as WebP at their original dimensions
with lossless alpha. Their content, crops and editable placement are unchanged.
The offline city lookup retains every entry and attribution; only dictionary
key ordering changes to improve ZIP compression.

See COMPACT_MEDIA.json for the exact media inventory and SOURCE_MANIFEST.json
for the integrity hashes. All other source files match the audited full package.
''')
    files = sorted(path for path in target.rglob('*') if path.is_file() and path != target/'docs/SOURCE_MANIFEST.json')
    content = {'version': 1, 'files': [{'path': str(path.relative_to(target)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in files]}
    (target/'docs/SOURCE_MANIFEST.json').write_text(json.dumps(content, indent=2)+'\n')

def archive_size():
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(target.rglob('*')):
            if path.is_file():
                archive.write(path, 'lovable-brand-hub/'+str(path.relative_to(target)))
    return output.tell()

for crf in [33]:
    with ThreadPoolExecutor(max_workers=3) as pool:
        media_report.update(dict(pool.map(encode_video, [(path, crf) for path in videos])))
    update_metadata(crf)
    size = archive_size()
    print(f'Estimated standard ZIP size: {size:,} bytes', flush=True)
    if size < 19_500_000:
        break
else:
    raise SystemExit('The compact package still exceeds the target. Review media before archiving.')
print(f'Compact source prepared at {target}', flush=True)
