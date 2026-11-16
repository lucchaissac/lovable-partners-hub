"""Rebuild the web loops from Luc's original MP4 directory.

Usage: python3 scripts/optimize-gallery.py /path/to/MP4
Requires imageio-ffmpeg. Originals stay outside the repository.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys

import imageio_ffmpeg

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'public' / 'gallery'
target.mkdir(parents=True, exist_ok=True)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()


def encode(number):
    original = source / f'DADA_Lovable_motion4K_{number}_loop.mp4'
    for size in (480, 960):
        output = target / f'motion-{number}-{size}.mp4'
        subprocess.run([
            ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(original),
            '-map', '0:v:0', '-an', '-sn', '-dn', '-map_metadata', '-1',
            '-vf', f'scale={size}:{size}:flags=lanczos,fps=24',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
            '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-threads', '2',
            '-movflags', '+faststart', str(output),
        ], check=True)
        print(f'{output.name}: {output.stat().st_size:,} bytes', flush=True)
    subprocess.run([
        ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(original),
        '-frames:v', '1', '-vf', 'scale=960:960:flags=lanczos',
        '-c:v', 'libwebp', '-quality', '80', str(target / f'motion-{number}.webp'),
    ], check=True)


with ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(encode, (3, 4, 8)))
