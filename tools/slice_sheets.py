#!/usr/bin/env python3
"""Cut Kaiten's painted contact sheets into the single images the game loads.

Usage: python3 tools/slice_sheets.py

Put each finished sheet in art/sheets/ named sheet-NN-anything.png (or .jpg/.webp), where NN is the
sheet number from docs/art-brief.md. Missing sheets are skipped. Each cell is cut from an even grid,
its cream gutter trimmed off, then scaled and saved under the name the game expects.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / 'art' / 'sheets'

CHEFS = ['chef-0', 'chef-1', 'chef-2', 'chef-3']
REGS = [f'reg-r{i}' for i in range(1, 13)]
SHEET3 = ['nigiri-tuna', 'nigiri-toro', 'nigiri-salmon', 'nigiri-aburi', 'nigiri-eel', 'nigiri-shrimp',
          'nigiri-egg', 'nigiri-pair', 'maki-tuna', 'maki-salmon', 'maki-cucumber', 'uramaki', 'futomaki',
          'roll-rainbow', 'roll-dragon', None]
SHEET4 = ['sashimi-tuna', 'sashimi-toro', 'sashimi-salmon', 'sashimi-ebi', 'sashimi-mixed', 'sashimi-boat',
          'bowl-chirashi', 'bowl-unadon', 'bowl-kaisen', 'omakase', 'tempura', 'chawanmushi']
INGS = ['ing-R', 'ing-N', 'ing-T', 'ing-S', 'ing-U', 'ing-E', 'ing-W', None]
STATIONS = ['st-market', 'st-pantry', 'st-belt', 'st-prep', 'st-head', 'st-door', 'st-staff', None]
TEXTURES = ['tex-table', 'tex-tray', 'tex-noren', 'tex-belt', 'tex-ice', 'tex-paper']

# sheet number -> grid, output edge in px, and cell names in reading order
SPECS = {
    1: dict(cols=2, rows=2, size=256, cells=CHEFS),
    2: dict(cols=4, rows=3, size=192, cells=REGS),
    3: dict(cols=4, rows=4, size=320, cells=[f'dish-{c}' if c else None for c in SHEET3], key=True),
    4: dict(cols=4, rows=3, size=320, cells=[f'dish-{c}' for c in SHEET4], key=True),
    5: dict(cols=4, rows=2, size=128, cells=INGS, key=True),
    6: dict(cols=4, rows=2, size=128, cells=STATIONS, key=True),
    7: dict(cols=3, rows=2, size=512, cells=TEXTURES, texture=True),
    8: dict(cols=2, rows=1, size=512, cells=['icon', 'maskable'], icon=True),
}


def is_gutter(px):
    r, g, b = px[:3]
    return r > 225 and g > 215 and b > 195 and max(r, g, b) - min(r, g, b) < 40


def trim_gutter(cell):
    """Shave cream gutter rows and columns off the cell edges (at most 8% per side)."""
    w, h = cell.size
    px = cell.load()

    def line_is_gutter(coords):
        return sum(is_gutter(px[x, y]) for x, y in coords) > 0.92 * len(coords)

    left, top, right, bottom = 0, 0, w, h
    while left < w * 0.08 and line_is_gutter([(left, y) for y in range(0, h, 4)]):
        left += 1
    while right > w * 0.92 and line_is_gutter([(right - 1, y) for y in range(0, h, 4)]):
        right -= 1
    while top < h * 0.08 and line_is_gutter([(x, top) for x in range(0, w, 4)]):
        top += 1
    while bottom > h * 0.92 and line_is_gutter([(x, bottom - 1) for x in range(0, w, 4)]):
        bottom -= 1
    return cell.crop((left, top, right, bottom))


def key_out(cell, tol=26):
    """Make the plain background around the subject transparent, then crop to the subject.

    The background colour is read from the cell border; only background-coloured pixels that
    connect to the border are removed, so cream rice or white plates inside the subject stay.
    """
    a = np.asarray(cell.convert('RGB')).astype(np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.abs(a - bg).max(axis=2)
    cand = dist < tol
    region = np.zeros_like(cand)
    region[0, :], region[-1, :], region[:, 0], region[:, -1] = cand[0, :], cand[-1, :], cand[:, 0], cand[:, -1]
    while True:
        grown = region.copy()
        grown[1:] |= region[:-1]; grown[:-1] |= region[1:]
        grown[:, 1:] |= region[:, :-1]; grown[:, :-1] |= region[:, 1:]
        grown &= cand
        if (grown == region).all():
            break
        region = grown
    # soft edge: fade pixels that are close to the background colour near the cut line
    soft = np.clip((dist - tol * 0.5) / (tol * 1.5), 0, 1)
    alpha = np.where(region, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2))
    alpha = np.minimum(np.asarray(alpha_img), np.where(region, 0, np.maximum(soft * 255, np.asarray(alpha_img)))).astype(np.uint8)
    rgba = np.dstack([a.astype(np.uint8), alpha])
    out = Image.fromarray(rgba, 'RGBA')
    box = Image.fromarray((alpha > 24).astype(np.uint8) * 255).getbbox()
    if box:
        out = out.crop(box)
    # centre on a square transparent canvas with a little breathing room
    s = int(max(out.size) * 1.06)
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    canvas.paste(out, ((s - out.width) // 2, (s - out.height) // 2))
    return canvas


def square(img):
    w, h = img.size
    s = min(w, h)
    return img.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def find_sheet(n):
    for ext in ('png', 'jpg', 'jpeg', 'webp'):
        hits = sorted(SHEETS.glob(f'sheet-{n:02d}-*.{ext}'))
        if hits:
            return hits[0]
    return None


def main():
    done = 0
    for n, spec in SPECS.items():
        path = find_sheet(n)
        if not path:
            print(f'sheet {n:02d}: not found, skipped')
            continue
        sheet = Image.open(path).convert('RGB')
        W, H = sheet.size
        cw, ch = W / spec['cols'], H / spec['rows']
        for i, name in enumerate(spec['cells']):
            if not name:
                continue
            c, r = i % spec['cols'], i // spec['cols']
            cell = sheet.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            if spec.get('texture'):
                # trim the gutters, then a hair more, so the tile edges are pure texture
                cell = trim_gutter(cell)
                m = int(min(cell.size) * 0.012)
                cell = square(cell.crop((m, m, cell.width - m, cell.height - m)))
            elif spec.get('key'):
                cell = trim_gutter(cell)
                m = int(min(cell.size) * 0.03)  # drop any tinted gutter line the trim left behind
                cell = key_out(cell.crop((m, m, cell.width - m, cell.height - m)))
            else:
                cell = square(trim_gutter(cell))
            if spec.get('icon'):
                out = ROOT / 'icons'
                out.mkdir(exist_ok=True)
                sizes = {'icon': [('icon-512', 512), ('icon-192', 192), ('apple-touch-icon', 180), ('favicon-32', 32)],
                         'maskable': [('maskable-512', 512), ('maskable-192', 192)]}[name]
                for fname, s in sizes:
                    cell.resize((s, s), Image.LANCZOS).save(out / f'{fname}.png')
                done += len(sizes)
                continue
            cell.resize((spec['size'], spec['size']), Image.LANCZOS).save(ROOT / 'art' / f'{name}.webp', quality=88)
            done += 1
        print(f'sheet {n:02d}: cut from {path.name}')
    print(f'{done} files written. Set ART_EXT to "webp" in index.html to use the painted art.')


if __name__ == '__main__':
    main()
