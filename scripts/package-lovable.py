#!/usr/bin/env python3
"""Archive only the declared and verified source handoff, never arbitrary folders."""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).expanduser().resolve()
target = Path(sys.argv[2]).expanduser().resolve()
if target.exists():
    raise SystemExit('Choose a new archive path.')
manifest = json.loads((source / 'docs/SOURCE_MANIFEST.json').read_text())
paths = [entry['path'] for entry in manifest['files']] + ['docs/SOURCE_MANIFEST.json']
for entry in manifest['files']:
    path = source / entry['path']
    if path.is_symlink() or not path.is_relative_to(source) or '..' in Path(entry['path']).parts:
        raise SystemExit('Unsafe source path.')
    if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
        raise SystemExit('Source changed after export: '+entry['path'])

# Compare actual private values in memory without printing or saving any value.
private_values = []
env_file = ROOT / '.env.local'
if env_file.exists():
    for line in env_file.read_text().splitlines():
        match = re.match(r'\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$', line)
        if match and re.search(r'(?:KEY|TOKEN|SECRET|PASSWORD)', match[1]):
            value = match[2].strip('"\'')
            if len(value) >= 16:
                private_values.append(value.encode())

pattern = re.compile(rb'(?i)(?:OPENAI_API_KEY|COMMUNITY_CODEX|COMMUNITY_OPENAI|COMMUNITY_BUDGET|BLOB_READ_WRITE_TOKEN|api\.openai\.com|\bcodex\b|/Users/|/Applications/ChatGPT|lucchaissac|lovable-brands\.vercel\.app|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')
for rel in paths:
    parts=Path(rel).parts
    if any(part in {'.git','.vercel','node_modules','dist','examples'} for part in parts) or (Path(rel).name.startswith('.env') and rel != '.env.example'):
        raise SystemExit('Excluded file in manifest: '+rel)
    data=(source / rel).read_bytes()
    if any(value in data for value in private_values) or pattern.search(data):
        raise SystemExit('Privacy audit failed in: '+rel)

target.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for rel in sorted(paths):
        info=zipfile.ZipInfo('lovable-brand-hub/'+rel, date_time=(2026,1,1,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=0o100644 << 16
        archive.writestr(info,(source / rel).read_bytes(),compresslevel=9)
with zipfile.ZipFile(target) as archive:
    bad=archive.testzip()
    if bad:
        raise SystemExit('ZIP integrity check failed: '+bad)
digest=hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.zip.sha256').write_text(f'{digest}  {target.name}\n')
print(json.dumps({'archive':str(target),'files':len(paths),'bytes':target.stat().st_size,'sha256':digest,'privacyAudit':'passed','integrity':'passed'},indent=2))
