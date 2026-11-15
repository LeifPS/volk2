#!/usr/bin/env python3
"""Bringt ein von Leif erzeugtes Bild auf 2000x400 WebP (mittiger Zuschnitt auf 5:1).
Aufruf: python3 tools/banner-zuschneiden.py <eingabe> [ausgabe.webp]   (braucht Pillow: pip3 install pillow)"""
import sys
from PIL import Image
ein = sys.argv[1]; aus = sys.argv[2] if len(sys.argv) > 2 else 'hub-eintrag/volk-wallpaper.webp'
im = Image.open(ein).convert('RGB')
w, h = im.size
ziel = 5.0
if w / h > ziel:
    nw = int(h * ziel); x = (w - nw) // 2; im = im.crop((x, 0, x + nw, h))
else:
    nh = int(w / ziel); y = (h - nh) // 2; im = im.crop((0, y, w, y + nh))
im = im.resize((2000, 400), Image.LANCZOS)
im.save(aus, 'WEBP', quality=90)
print('geschrieben:', aus)
