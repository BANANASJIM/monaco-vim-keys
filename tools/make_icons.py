#!/usr/bin/env python3
"""Generate simple extension icons: dark rounded square with a green 'V'."""
import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
BG = (21, 21, 21, 255)       # #151515, matches leetgpu dark theme
FG = (76, 175, 80, 255)      # green


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = max(2, size // 6)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
    # Draw a "V" as two thick strokes.
    w = max(2, size // 8)
    m = size * 0.24
    top_l = (m, m)
    top_r = (size - m, m)
    bottom = (size / 2, size - m)
    d.line([top_l, bottom], fill=FG, width=w)
    d.line([top_r, bottom], fill=FG, width=w)
    os.makedirs(OUT_DIR, exist_ok=True)
    img.save(os.path.join(OUT_DIR, f"icon-{size}.png"))


for s in (16, 48, 96):
    make_icon(s)
print("icons written to", os.path.abspath(OUT_DIR))
