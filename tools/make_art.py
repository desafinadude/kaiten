# Generates Kaiten's illustration set as standalone SVG files.
# Flat, outlined, slightly chunky style: one outline colour, flat fills, small highlights.
import os, sys, math

OUT_DIR = sys.argv[1]
os.makedirs(OUT_DIR, exist_ok=True)

INK = "#3a2616"
SW = 2.4
RICE = "#fffdf6"
GRAIN = "#e8e0cc"
NORI = "#21362a"
NORI_HI = "#3b5a44"


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w*3}" height="{h*3}">'
            f'{body}</svg>')


def o(extra=""):
    import re
    m = re.search(r"stroke-width='([0-9.]+)'", extra)
    w = m.group(1) if m else SW
    extra = re.sub(r"stroke-width='[0-9.]+'", "", extra)
    return f'stroke="{INK}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round" {extra}'


def shadow(cx, cy, rx, ry=None):
    ry = ry or rx * 0.18
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#000" fill-opacity="0.16"/>'


def grains(pts, rot=20):
    return "".join(f'<ellipse cx="{x}" cy="{y}" rx="2.2" ry="1.1" fill="{GRAIN}" transform="rotate({rot if i % 2 else -rot} {x} {y})"/>'
                   for i, (x, y) in enumerate(pts))


def save(name, w, h, body):
    with open(os.path.join(OUT_DIR, name + ".svg"), "w") as f:
        f.write(svg(w, h, body))


# ---------------------------------------------------------------- ingredients (48x48)
def ing_rice():
    b = shadow(24, 42, 16)
    b += f'<path d="M8 35 C8 22 15 11 24 11 C33 11 40 22 40 35 C40 40 33 42 24 42 C15 42 8 40 8 35Z" fill="{RICE}" {o()}/>'
    b += grains([(17, 22), (26, 18), (31, 27), (20, 31), (28, 35), (14, 34), (34, 36), (23, 26)])
    b += '<path d="M15 20 C17 16 20 14 23 14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>'
    return b


def ing_nori():
    b = shadow(24, 42, 15)
    b += f'<g transform="rotate(-8 24 25)"><rect x="9" y="10" width="30" height="30" rx="3" fill="{NORI}" {o()}/>'
    b += "".join(f'<path d="M{x} 13 L{x} 37" stroke="{NORI_HI}" stroke-width="1.4"/>' for x in (15, 21, 27, 33))
    b += '<path d="M12 14 L20 14" stroke="#5f8a6b" stroke-width="2" stroke-linecap="round"/></g>'
    return b


def block(top, front, side, extra=""):
    b = shadow(25, 41, 18)
    b += f'<path d="M6 21 L30 14 L43 21 L19 28Z" fill="{top}" {o()}/>'
    b += f'<path d="M6 21 L19 28 L19 38 L6 31Z" fill="{side}" {o()}/>'
    b += f'<path d="M19 28 L43 21 L43 31 L19 38Z" fill="{front}" {o()}/>'
    return b + extra


def ing_tuna():
    sinew = ('<path d="M12 21 Q21 17 31 17" fill="none" stroke="#f6b6c1" stroke-width="1.6" stroke-linecap="round"/>'
             '<path d="M17 24 Q27 20 37 20" fill="none" stroke="#f6b6c1" stroke-width="1.6" stroke-linecap="round"/>'
             '<path d="M23 31 Q31 27 40 26" fill="none" stroke="#e98394" stroke-width="1.4" stroke-linecap="round"/>')
    return block("#e34a65", "#c11f3b", "#931229", sinew)


def ing_salmon():
    st = "".join(f'<path d="M{x} {y} l7 -3" stroke="#fff3e8" stroke-width="2" stroke-linecap="round"/>'
                 for x, y in ((11, 21), (17, 23), (23, 20), (29, 18)))
    st += "".join(f'<path d="M{x} 36 l3 -9" stroke="#ffd9bf" stroke-width="2" stroke-linecap="round"/>' for x in (24, 31, 38))
    return block("#ffa166", "#f07a35", "#c95b1f", st)


def ing_eel():
    b = shadow(24, 41, 18)
    b += f'<path d="M5 27 C5 19 13 15 24 15 C35 15 43 19 43 27 C43 34 35 37 24 37 C13 37 5 34 5 27Z" fill="#7b411c" {o()}/>'
    b += '<path d="M10 23 C16 19 30 18 38 21" fill="none" stroke="#c07b3d" stroke-width="3" stroke-linecap="round"/>'
    b += "".join(f'<path d="M{x} 20 l-4 14" stroke="#4a230c" stroke-width="2" stroke-linecap="round"/>' for x in (16, 25, 34))
    b += '<ellipse cx="30" cy="22" rx="4" ry="1.5" fill="#fff" fill-opacity="0.6"/>'
    return b


def shrimp_body(tx=0, ty=0, s=1.0, raw=False):
    body = "#ffb2a0" if raw else "#f47c5e"
    stripe = "#fff5ef"
    g = f'<g transform="translate({tx} {ty}) scale({s})">'
    g += f'<path d="M34 11 C45 17 43 34 30 38 C22 41 13 37 11 30" fill="none" stroke="{INK}" stroke-width="15" stroke-linecap="round"/>'
    g += f'<path d="M34 11 C45 17 43 34 30 38 C22 41 13 37 11 30" fill="none" stroke="{body}" stroke-width="10.4" stroke-linecap="round"/>'
    for (x1, y1, x2, y2) in ((36, 15, 31, 20), (41, 24, 34, 25), (38, 33, 32, 29), (29, 38, 27, 31), (19, 37, 21, 31)):
        g += f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{stripe}" stroke-width="2" stroke-linecap="round"/>'
    g += f'<path d="M12 30 L3 23 L4 36 Z" fill="#e2412f" {o()}/>'
    g += '</g>'
    return g


def ing_shrimp():
    return shadow(24, 43, 15) + shrimp_body()


def ing_wasabi():
    b = shadow(24, 42, 15)
    b += f'<path d="M9 38 C7 28 13 14 24 11 C35 14 41 28 39 38 C34 41 14 41 9 38Z" fill="#8dbb42" {o()}/>'
    b += "".join(f'<circle cx="{x}" cy="{y}" r="1.4" fill="#5f8b25"/>' for x, y in ((17, 28), (24, 23), (30, 31), (21, 34), (28, 18), (33, 25)))
    b += '<path d="M16 22 C18 17 21 15 23 14" fill="none" stroke="#d6eda6" stroke-width="2.6" stroke-linecap="round"/>'
    return b


for n, f in (("ing-R", ing_rice), ("ing-N", ing_nori), ("ing-T", ing_tuna), ("ing-S", ing_salmon),
             ("ing-U", ing_eel), ("ing-E", ing_shrimp), ("ing-W", ing_wasabi)):
    save(n, 48, 48, f())

# ---------------------------------------------------------------- dishes (100x80)
RICE_BASE = "M21 55 C21 45 31 40 50 40 C69 40 79 45 79 55 C79 64 69 67 50 67 C31 67 21 64 21 55Z"
TOP = "M11 47 C11 33 29 27 51 27 C73 27 90 33 88 45 C86 54 72 51 51 51 C31 51 13 59 11 47Z"


def nigiri_core(fill, deco="", band=False, tx=0, ty=0, s=1.0):
    g = f'<g transform="translate({tx} {ty}) scale({s})">'
    g += f'<path d="{RICE_BASE}" fill="{RICE}" {o()}/>'
    g += grains([(32, 60), (45, 63), (60, 61), (70, 57), (27, 55)])
    g += f'<path d="{TOP}" fill="{fill}" {o()}/>'
    g += deco
    if band:
        g += f'<path d="M44 27.5 L57 27.5 L57 66 C53 67 48 67 44 66 Z" fill="{NORI}" {o()}/>'
        g += f'<path d="M47 31 L47 62" stroke="{NORI_HI}" stroke-width="1.5"/>'
    g += '</g>'
    return g


def topping_hi(color):
    return f'<path d="M22 37 C30 32 44 30 60 31" fill="none" stroke="{color}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/>'


def salmon_stripes():
    return "".join(f'<path d="M{x} 30 Q{x+5} 40 {x+1} 50" fill="none" stroke="#fff1e6" stroke-width="2.6" stroke-linecap="round"/>'
                   for x in (24, 36, 48, 60, 72))


def tuna_deco():
    return topping_hi("#f2788c") + '<path d="M30 44 Q46 39 66 41" fill="none" stroke="#a5122c" stroke-width="1.6" stroke-linecap="round"/>'


def toro_deco():
    return "".join(f'<path d="M{x} 31 Q{x+8} 38 {x+3} 48" fill="none" stroke="#fde3e8" stroke-width="2.2" stroke-linecap="round"/>'
                   for x in (20, 32, 44, 56, 68)) + topping_hi("#fff")


def eel_deco():
    return ('<path d="M18 38 C30 32 52 30 78 34" fill="none" stroke="#c07b3d" stroke-width="3.5" stroke-linecap="round"/>'
            + "".join(f'<path d="M{x} 31 l-4 16" stroke="#4a230c" stroke-width="2.2" stroke-linecap="round"/>' for x in (28, 66, 78))
            + '<ellipse cx="70" cy="34" rx="5" ry="1.6" fill="#fff" fill-opacity="0.6"/>')


def shrimp_nigiri_deco():
    d = "".join(f'<path d="M{x} 29 Q{x+4} 40 {x} 51" fill="none" stroke="#f26a4b" stroke-width="5" stroke-linecap="round"/>'
                for x in (22, 36, 50, 64))
    d += f'<path d="M86 40 L97 30 L97 50 Z" fill="#e2412f" {o()}/>'
    return d


def aburi_deco():
    return salmon_stripes() + '<path d="M18 36 C34 29 58 28 82 33" fill="none" stroke="#8a3d12" stroke-width="4" stroke-linecap="round" stroke-opacity="0.55"/>' \
        + "".join(f'<circle cx="{x}" cy="{y}" r="1.6" fill="#5b2508" fill-opacity="0.6"/>' for x, y in ((30, 33), (46, 31), (62, 32), (74, 36)))


def dish(name, body):
    save("dish-" + name, 100, 80, body)


dish("nigiri-tuna", shadow(50, 69, 36) + nigiri_core("#d1284a", tuna_deco()))
dish("nigiri-toro", shadow(50, 69, 36) + nigiri_core("#ec8b9a", toro_deco()))
dish("nigiri-salmon", shadow(50, 69, 36) + nigiri_core("#f58a4b", salmon_stripes()))
dish("nigiri-aburi", shadow(50, 69, 36) + nigiri_core("#f08144", aburi_deco()))
dish("nigiri-eel", shadow(50, 69, 36) + nigiri_core("#7b411c", eel_deco(), band=True))
dish("nigiri-shrimp", shadow(50, 69, 36) + nigiri_core("#fff0e9", shrimp_nigiri_deco()))
dish("nigiri-egg", shadow(50, 69, 36) + nigiri_core("#f6cf45", '<path d="M16 40 C30 34 60 33 84 38" fill="none" stroke="#fde98e" stroke-width="3" stroke-linecap="round"/>', band=True))
dish("nigiri-pair", shadow(50, 70, 40) + nigiri_core("#d1284a", tuna_deco(), tx=-6, ty=8, s=0.62)
     + nigiri_core("#f58a4b", salmon_stripes(), tx=42, ty=14, s=0.62))


def roll_piece(cx, cy, r, center, outer=NORI, inner=RICE, sesame=False, ring=None, fill_parts=None):
    ry = r * 0.62
    h = r * 0.55
    g = f'<path d="M{cx-r} {cy} L{cx-r} {cy+h} A{r} {ry} 0 0 0 {cx+r} {cy+h} L{cx+r} {cy} Z" fill="{outer}" {o()}/>'
    g += f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{ry}" fill="{outer}" {o()}/>'
    g += f'<ellipse cx="{cx}" cy="{cy}" rx="{r-3.5}" ry="{ry-2.5}" fill="{inner}"/>'
    if ring:
        g += f'<ellipse cx="{cx}" cy="{cy}" rx="{r*0.55}" ry="{ry*0.55}" fill="none" stroke="{ring}" stroke-width="2"/>'
    if fill_parts:
        n = len(fill_parts)
        for i, col in enumerate(fill_parts):
            a0 = 2 * math.pi * i / n
            a1 = 2 * math.pi * (i + 1) / n
            rr, rry = r * 0.42, ry * 0.42
            x0, y0 = cx + rr * math.cos(a0), cy + rry * math.sin(a0)
            x1, y1 = cx + rr * math.cos(a1), cy + rry * math.sin(a1)
            g += f'<path d="M{cx} {cy} L{x0:.1f} {y0:.1f} A{rr:.1f} {rry:.1f} 0 0 1 {x1:.1f} {y1:.1f} Z" fill="{col}"/>'
    else:
        g += f'<ellipse cx="{cx}" cy="{cy}" rx="{r*0.38}" ry="{ry*0.38}" fill="{center}" {o("stroke-width=\'1.6\'")}/>'
    if inner == RICE:
        g += grains([(cx - r * 0.6, cy - ry * 0.2), (cx + r * 0.55, cy + ry * 0.25), (cx - r * 0.1, cy - ry * 0.65), (cx + r * 0.2, cy + ry * 0.6)])
    if sesame:
        g += "".join(f'<ellipse cx="{cx+dx:.1f}" cy="{cy+dy:.1f}" rx="1" ry="0.6" fill="#c9a86a"/>'
                     for dx, dy in ((-r*.75, 0), (r*.7, -ry*.3), (0, -ry*.8), (-r*.3, ry*.7), (r*.4, ry*.75)))
    return g


def maki_trio(center):
    return (shadow(50, 72, 40) + roll_piece(30, 50, 17, center) + roll_piece(70, 50, 17, center) + roll_piece(50, 32, 17, center))


dish("maki-tuna", maki_trio("#d1284a"))
dish("maki-salmon", maki_trio("#f58a4b"))
dish("maki-cucumber", maki_trio("#6aae3a"))
dish("uramaki", shadow(50, 72, 40)
     + roll_piece(30, 50, 17, None, outer=RICE, inner=RICE, sesame=True, ring=NORI, fill_parts=["#f58a4b", "#7fbf4d", "#ffd2c4"])
     + roll_piece(70, 50, 17, None, outer=RICE, inner=RICE, sesame=True, ring=NORI, fill_parts=["#f58a4b", "#7fbf4d", "#ffd2c4"])
     + roll_piece(50, 32, 17, None, outer=RICE, inner=RICE, sesame=True, ring=NORI, fill_parts=["#f58a4b", "#7fbf4d", "#ffd2c4"]))
dish("futomaki", shadow(50, 72, 38) + roll_piece(50, 44, 30, None, fill_parts=["#f6cf45", "#6aae3a", "#f29bb0", "#7b411c", "#f6cf45", "#6aae3a"]))


def log_roll(slices, face=False):
    b = shadow(50, 70, 44)
    b += f'<path d="M8 50 C8 36 14 30 22 30 L80 30 C88 30 92 38 92 50 C92 60 86 64 78 64 L22 64 C14 64 8 60 8 50Z" fill="{RICE}" {o()}/>'
    b += grains([(20, 58), (34, 60), (52, 59), (68, 60), (82, 56)])
    x = 12
    for col in slices:
        b += f'<path d="M{x} 44 C{x} 32 {x+6} 25 {x+11} 25 C{x+16} 25 {x+19} 32 {x+19} 44 C{x+14} 47 {x+5} 47 {x} 44Z" fill="{col}" {o()}/>'
        b += f'<path d="M{x+5} 31 C{x+7} 28 {x+10} 27 {x+12} 27" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="2" stroke-linecap="round"/>'
        x += 13
    if face:
        b += f'<circle cx="86" cy="40" r="3" fill="#fff" {o("stroke-width=\'1.6\'")}/><circle cx="87" cy="40" r="1.4" fill="{INK}"/>'
        b += f'<path d="M90 50 l6 -2" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>'
    return b


dish("roll-rainbow", log_roll(["#d1284a", "#f58a4b", "#fff0e9", "#7b411c", "#d1284a", "#f58a4b"]))
dish("roll-dragon", log_roll(["#7fbf4d", "#7b411c", "#7fbf4d", "#7b411c", "#7fbf4d", "#7b411c"], face=True))


def shiso(x, y, rot):
    return (f'<g transform="rotate({rot} {x} {y})"><path d="M{x} {y-22} C{x+14} {y-12} {x+14} {y+10} {x} {y+20} C{x-14} {y+10} {x-14} {y-12} {x} {y-22}Z" fill="#5fa043" {o()}/>'
            f'<path d="M{x} {y-18} L{x} {y+16}" stroke="#3f7a2c" stroke-width="1.6"/></g>')


def daikon(x, y):
    return f'<path d="M{x-14} {y} C{x-10} {y-12} {x+10} {y-12} {x+14} {y} Z" fill="#fff" {o()}/>' + \
        "".join(f'<path d="M{x+dx} {y-2} l2 -7" stroke="#ddd" stroke-width="1.2"/>' for dx in (-8, -3, 2, 7))


def slab(x, y, rot, fill, deco_col=None, marbling=False):
    g = f'<g transform="rotate({rot} {x} {y})"><rect x="{x-8}" y="{y-20}" width="16" height="38" rx="5" fill="{fill}" {o()}/>'
    if deco_col:
        g += "".join(f'<path d="M{x-6} {y-12+k*9} l12 -4" stroke="{deco_col}" stroke-width="2.2" stroke-linecap="round"/>' for k in range(4))
    if marbling:
        g += "".join(f'<path d="M{x-5} {y-14+k*8} q5 3 10 0" fill="none" stroke="#fde3e8" stroke-width="1.6"/>' for k in range(4))
    g += f'<path d="M{x-4} {y-15} L{x-4} {y-4}" stroke="#fff" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round"/></g>'
    return g


def sashimi(slabs):
    b = shadow(50, 72, 40) + shiso(26, 40, -25) + daikon(74, 64)
    for args in slabs:
        b += slab(*args)
    return b


dish("sashimi-tuna", sashimi([(44, 42, -22, "#d1284a"), (56, 40, -8, "#d1284a"), (68, 40, 8, "#c11f3b")]))
dish("sashimi-toro", sashimi([(44, 42, -22, "#ec8b9a", None, True), (56, 40, -8, "#ec8b9a", None, True), (68, 40, 8, "#e7788a", None, True)]))
dish("sashimi-salmon", sashimi([(44, 42, -22, "#f58a4b", "#fff1e6"), (56, 40, -8, "#f58a4b", "#fff1e6"), (68, 40, 8, "#f07a35", "#fff1e6")]))
dish("sashimi-mixed", sashimi([(44, 42, -22, "#d1284a"), (56, 40, -8, "#f58a4b", "#fff1e6"), (68, 40, 8, "#7b411c")]))
dish("sashimi-ebi", shadow(50, 72, 40) + shiso(26, 40, -25) + daikon(76, 64)
     + shrimp_body(28, 14, 0.85, raw=True) + shrimp_body(46, 22, 0.75, raw=True))
dish("sashimi-boat", shadow(50, 74, 46)
     + f'<path d="M4 46 L96 46 L86 66 L16 66 Z" fill="#c88b4d" {o()}/><path d="M10 52 L90 52" stroke="#8f5a26" stroke-width="2"/>'
     + f'<path d="M80 46 L94 28 L96 46 Z" fill="#b97a3d" {o()}/>'
     + slab(26, 32, -20, "#d1284a") + slab(38, 30, -6, "#f58a4b", "#fff1e6") + slab(50, 30, 6, "#7b411c") + slab(62, 32, 18, "#ec8b9a", None, True)
     + shiso(74, 36, 20))


def bowl(toppings):
    b = shadow(50, 74, 38)
    b += f'<path d="M10 40 C12 62 28 72 50 72 C72 72 88 62 90 40 Z" fill="#8f1f17" {o()}/>'
    b += '<path d="M18 50 C24 62 36 67 50 67" fill="none" stroke="#c2342a" stroke-width="3" stroke-linecap="round"/>'
    b += f'<ellipse cx="50" cy="40" rx="40" ry="9" fill="{RICE}" {o()}/>'
    b += toppings
    return b


def mound(x, y, col, w=12, h=8):
    return f'<ellipse cx="{x}" cy="{y}" rx="{w}" ry="{h}" fill="{col}" {o()}/>'


def ikura(pts):
    return "".join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="#ff7a2e" {o("stroke-width=\'1.2\'")}/><circle cx="{x-0.8}" cy="{y-0.8}" r="0.8" fill="#fff"/>' for x, y in pts)


dish("bowl-chirashi", bowl(mound(30, 36, "#d1284a") + mound(50, 33, "#f58a4b") + mound(70, 36, "#f6cf45", 10, 7)
                           + shrimp_body(34, 16, 0.5) + ikura([(44, 42), (50, 44), (56, 42)]) + shiso(78, 30, 40)))
dish("bowl-unadon", bowl(f'<path d="M18 38 C18 28 30 24 50 24 C70 24 82 28 82 38 C82 44 70 46 50 46 C30 46 18 44 18 38Z" fill="#7b411c" {o()}/>'
                         + '<path d="M24 32 C36 27 60 27 76 31" fill="none" stroke="#c07b3d" stroke-width="3.5" stroke-linecap="round"/>'
                         + "".join(f'<path d="M{x} 27 l-3 15" stroke="#4a230c" stroke-width="2.2" stroke-linecap="round"/>' for x in (34, 50, 66))))
dish("bowl-kaisen", bowl(mound(28, 37, "#f58a4b") + mound(46, 33, "#d1284a") + mound(66, 34, "#f58a4b")
                         + ikura([(36, 42), (42, 44), (56, 43), (62, 41), (74, 42), (50, 40)]) + shiso(80, 32, 35)))
dish("omakase", shadow(50, 74, 46)
     + f'<rect x="4" y="44" width="92" height="20" rx="3" fill="#d9a865" {o()}/><rect x="12" y="64" width="8" height="8" fill="#a8763a" {o()}/><rect x="80" y="64" width="8" height="8" fill="#a8763a" {o()}/>'
     + nigiri_core("#d1284a", tuna_deco(), tx=-2, ty=12, s=0.42) + nigiri_core("#f58a4b", salmon_stripes(), tx=22, ty=12, s=0.42)
     + nigiri_core("#7b411c", eel_deco(), band=True, tx=46, ty=12, s=0.42) + nigiri_core("#fff0e9", shrimp_nigiri_deco(), tx=68, ty=12, s=0.36))


def tempura_piece(x, y, rot):
    return (f'<g transform="rotate({rot} {x} {y})"><path d="M{x-28} {y} C{x-28} {y-10} {x-16} {y-13} {x} {y-12} C{x+16} {y-11} {x+24} {y-7} {x+24} {y} C{x+24} {y+8} {x+14} {y+11} {x} {y+11} C{x-16} {y+11} {x-28} {y+9} {x-28} {y}Z" fill="#f1b84a" {o()}/>'
            + "".join(f'<circle cx="{x+dx}" cy="{y+dy}" r="2" fill="#f8d684"/>' for dx, dy in ((-18, -4), (-8, 3), (4, -5), (14, 2), (-2, 6)))
            + f'<path d="M{x+23} {y} L{x+34} {y-8} L{x+33} {y+8} Z" fill="#e2412f" {o()}/></g>')


dish("tempura", shadow(50, 74, 42)
     + f'<path d="M10 40 L84 30 L90 66 L16 72 Z" fill="#fffaf0" {o()}/><path d="M20 46 L80 38" stroke="#e7dccb" stroke-width="1.5"/>'
     + tempura_piece(46, 44, -12) + tempura_piece(44, 58, -6))
dish("chawanmushi", shadow(50, 74, 30)
     + f'<path d="M24 34 L28 66 C30 71 70 71 72 66 L76 34 Z" fill="#e9e1cf" {o()}/>'
     + '<path d="M30 44 L70 44" stroke="#7aa2c8" stroke-width="3"/><path d="M31 52 L69 52" stroke="#7aa2c8" stroke-width="1.5"/>'
     + f'<ellipse cx="50" cy="34" rx="26" ry="6" fill="#f6d566" {o()}/><circle cx="44" cy="33" r="2.4" fill="#6aae3a"/><circle cx="56" cy="34" r="2" fill="#f58a4b"/>'
     + f'<g transform="rotate(-18 72 22)"><ellipse cx="72" cy="24" rx="24" ry="6" fill="#e9e1cf" {o()}/><path d="M50 24 C52 14 92 14 94 24" fill="#e9e1cf" {o()}/><circle cx="72" cy="13" r="3" fill="#e9e1cf" {o()}/></g>')

# ---------------------------------------------------------------- chefs (60x72)
PCOL = ["#2f62c4", "#d24a2f", "#d9a51a", "#1f9488"]
SKIN = ["#f4cfab", "#e9b48b", "#c98d5f", "#f1c9a3"]
HAIR = ["#22180f", "#1b1310", "#6b3d1d", "#c9c4bb"]


def chef(i):
    col, skin, hair = PCOL[i], SKIN[i], HAIR[i]
    b = shadow(30, 69, 20, 3)
    # body: white coat, apron in team colour
    b += f'<path d="M11 70 C11 54 18 47 30 47 C42 47 49 54 49 70 Z" fill="#fffaf0" {o()}/>'
    b += f'<path d="M30 47 L23 58 M30 47 L37 58" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>'
    b += f'<path d="M19 60 L41 60 L42 70 L18 70 Z" fill="{col}" {o()}/>'
    # hands
    b += f'<circle cx="13" cy="64" r="4" fill="{skin}" {o()}/><circle cx="47" cy="64" r="4" fill="{skin}" {o()}/>'
    if i == 1:  # bun behind the head
        b += f'<circle cx="30" cy="9" r="7" fill="{hair}" {o()}/>'
    b += f'<circle cx="30" cy="29" r="17" fill="{skin}" {o()}/>'
    # hair
    if i == 0:
        b += f'<path d="M13 27 C13 14 22 10 30 10 C40 10 47 15 47 27 C42 22 36 20 30 20 C24 20 18 22 13 27Z" fill="{hair}" {o()}/>'
    elif i == 1:
        b += f'<path d="M13 30 C12 16 21 11 30 11 C39 11 48 16 47 30 C45 24 40 19 30 19 C20 19 15 24 13 30Z" fill="{hair}" {o()}/>'
    elif i == 2:
        b += f'<path d="M13 27 L15 15 L20 19 L23 9 L28 16 L33 8 L37 16 L42 11 L44 19 L47 27 C40 22 20 22 13 27Z" fill="{hair}" {o()}/>'
    else:
        b += f'<path d="M13 30 C12 24 14 21 17 20 L18 30Z M47 30 C48 24 46 21 43 20 L42 30Z" fill="{hair}" {o()}/>'
    # hachimaki headband with knot
    b += f'<path d="M13.5 23 C20 19 40 19 46.5 23 L46 28 C40 24.5 20 24.5 14 28 Z" fill="{col}" {o()}/>'
    b += f'<path d="M46 25 L54 20 L53 28 Z" fill="{col}" {o()}/><path d="M46 26 L53 31 L47 32 Z" fill="{col}" {o()}/>'
    # face
    if i == 3:
        b += f'<path d="M23 34 Q25 32 27 34 M33 34 Q35 32 37 34" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>'
        b += f'<path d="M22 40 C26 37 29 39 30 40 C31 39 34 37 38 40 C35 43 25 43 22 40Z" fill="#e8e3d9" {o("stroke-width=\'1.6\'")}/>'
    else:
        b += f'<ellipse cx="24" cy="33" rx="2" ry="2.6" fill="{INK}"/><ellipse cx="36" cy="33" rx="2" ry="2.6" fill="{INK}"/>'
        b += f'<path d="M26 40 Q30 43.5 34 40" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>'
    b += '<ellipse cx="19.5" cy="38" rx="3" ry="1.8" fill="#f28c8c" fill-opacity="0.55"/><ellipse cx="40.5" cy="38" rx="3" ry="1.8" fill="#f28c8c" fill-opacity="0.55"/>'
    return b


for i in range(4):
    save(f"chef-{i}", 60, 72, chef(i))

# ---------------------------------------------------------------- regulars (64x64 busts)


def bust(cx, cy, r, skin, hair_path, shirt, extra_back="", extra_front="", face="smile", scale=1.0):
    g = f'<g transform="translate({cx} {cy}) scale({scale}) translate({-32} {-34})">'
    g += extra_back
    g += f'<path d="M10 66 C10 52 19 46 32 46 C45 46 54 52 54 66 Z" fill="{shirt}" {o()}/>'
    g += f'<circle cx="32" cy="30" r="{r}" fill="{skin}" {o()}/>'
    g += hair_path
    if face == "smile":
        g += f'<ellipse cx="26.5" cy="31" rx="1.8" ry="2.3" fill="{INK}"/><ellipse cx="37.5" cy="31" rx="1.8" ry="2.3" fill="{INK}"/>'
        g += f'<path d="M28 37 Q32 40 36 37" fill="none" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>'
    elif face == "closed":
        g += f'<path d="M24.5 31 Q26.5 29 28.5 31 M35.5 31 Q37.5 29 39.5 31" fill="none" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>'
        g += f'<path d="M28 37 Q32 40 36 37" fill="none" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>'
    elif face == "stern":
        g += f'<ellipse cx="26.5" cy="31" rx="1.6" ry="1.8" fill="{INK}"/><ellipse cx="37.5" cy="31" rx="1.6" ry="1.8" fill="{INK}"/>'
        g += f'<path d="M23 27 L29 28.5 M41 27 L35 28.5" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M29 38 L35 38" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>'
    g += '<ellipse cx="22.5" cy="35" rx="2.6" ry="1.5" fill="#f28c8c" fill-opacity="0.45"/><ellipse cx="41.5" cy="35" rx="2.6" ry="1.5" fill="#f28c8c" fill-opacity="0.45"/>'
    g += extra_front
    g += '</g>'
    return g


def frame(bg, inner):
    return f'<circle cx="32" cy="32" r="30" fill="{bg}"/>' + f'<g clip-path="url(#c)">{inner}</g>' + f'<circle cx="32" cy="32" r="30" fill="none" {o()}/>'


def portrait(bg, inner):
    return f'<defs><clipPath id="c"><circle cx="32" cy="32" r="30"/></clipPath></defs>' + frame(bg, inner)


short_black = f'<path d="M16 28 C16 17 23 13 32 13 C42 13 48 18 48 28 C46 22 40 19 33 20 L30 24 C26 21 20 23 16 28Z" fill="#1b1310" {o()}/>'
tie = f'<path d="M26 47 L32 54 L38 47" fill="#fff" {o()}/><path d="M32 50 L29.5 64 L32 66 L34.5 64 Z" fill="#c2342a" {o("stroke-width=\'1.6\'")}/>'
glasses = f'<circle cx="26.5" cy="31" r="4.5" fill="#fff" fill-opacity="0.25" {o("stroke-width=\'1.8\'")}/><circle cx="37.5" cy="31" r="4.5" fill="#fff" fill-opacity="0.25" {o("stroke-width=\'1.8\'")}/><path d="M31 31 L33 31" stroke="{INK}" stroke-width="1.8"/>'
shades = f'<path d="M21 28 L31 28 L30 34 C28 36 23 36 22 34 Z M33 28 L43 28 L42 34 C40 36 35 36 34 34 Z" fill="#111" {o("stroke-width=\'1.6\'")}/><path d="M31 29 L33 29" stroke="{INK}" stroke-width="1.6"/>'

regs = {
    "r1": portrait("#cfe0f2", bust(32, 34, 14, "#f4cfab", short_black, "#2c3e63", extra_front=tie)),
    "r2": portrait("#d8efd0", bust(32, 34, 14, "#e9b48b",
                                   f'<path d="M16 26 C16 15 24 12 32 12 C41 12 48 16 48 26 Z" fill="#c2342a" {o()}/><path d="M46 24 L56 26 L47 28Z" fill="#c2342a" {o()}/>',
                                   "#3f8a4a", extra_front=f'<path d="M15 26 C13 30 13 34 16 36 M49 26 C51 30 51 34 48 36" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')),
    "r3": portrait("#ece3d2", bust(32, 34, 14, "#f1c9a3",
                                   f'<path d="M17 30 C16 24 18 21 21 20 L21 30Z M47 30 C48 24 46 21 43 20 L43 30Z" fill="#e8e3d9" {o()}/>',
                                   "#3a3a46", face="stern",
                                   extra_front=f'<path d="M24 40 C26 50 38 50 40 40 C36 43 28 43 24 40Z" fill="#e8e3d9" {o("stroke-width=\'1.6\'")}/><path d="M26 47 L32 56 L38 47" fill="none" stroke="#fff" stroke-width="2"/>')),
    "r4": portrait("#f2d9d9", bust(32, 34, 14, "#f4cfab",
                                   f'<path d="M14 22 C14 14 28 10 40 12 C48 13 52 18 48 22 C40 20 24 20 14 22Z" fill="#1b1310" {o()}/><circle cx="36" cy="11" r="2" fill="#1b1310"/>',
                                   "#7a1f2a", extra_front=glasses + f'<path d="M26 37 C28 35 31 36 32 37 C33 36 36 35 38 37" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>'
                                   + f'<path d="M20 50 C26 56 38 56 44 50 L44 56 C38 60 26 60 20 56Z" fill="#c9a24a" {o("stroke-width=\'1.6\'")}/>')),
    "r5": portrait("#f6d4da", bust(32, 34, 14, "#c98d5f",
                                   f'<path d="M14 24 C14 13 24 10 32 10 C41 10 50 13 50 24 L56 26 L8 26 Z" fill="#244a73" {o()}/>',
                                   "#b0243a", face="closed")),
    "r6": portrait("#fde3cf", bust(32, 34, 14, "#f4cfab",
                                   f'<path d="M15 44 C12 30 14 14 32 13 C50 14 52 30 49 44 C47 36 47 26 44 22 C38 24 26 24 20 22 C17 26 17 36 15 44Z" fill="#8a4b22" {o()}/>',
                                   "#f07a35")),
    "r7": portrait("#e5dccb", bust(32, 34, 14, "#f1c9a3",
                                   f'<circle cx="32" cy="12" r="6" fill="#bdb6aa" {o()}/><path d="M16 30 C15 18 22 15 32 15 C42 15 49 18 48 30 C45 24 40 21 32 21 C24 21 19 24 16 30Z" fill="#bdb6aa" {o()}/>',
                                   "#7b5236", extra_front=glasses)),
    "r8": portrait("#fbe0e6", bust(32, 36, 12, "#e9b48b",
                                   f'<path d="M18 28 C18 18 25 15 32 15 C40 15 46 18 46 28 Z" fill="#ea8f9f" {o()}/><path d="M18 27 L8 29 L18 31Z" fill="#ea8f9f" {o()}/>',
                                   "#f6cf45", scale=0.95)),
    "r9": portrait("#e7dcf4", bust(32, 34, 14, "#f4cfab",
                                   f'<path d="M16 26 C16 14 26 11 34 12 C44 13 48 18 48 26 C42 20 30 18 16 26Z" fill="#1b1310" {o()}/>',
                                   "#5b2b86", extra_front=shades + f'<path d="M22 50 C26 58 38 58 42 50" fill="none" stroke="#d2a43c" stroke-width="3"/>')),
    "r10": portrait("#e2efe1",
                    bust(24, 32, 13, "#f1c9a3", f'<path d="M17 28 C17 17 24 13 32 13 C41 13 47 17 47 28 C42 22 22 22 17 28Z" fill="#3a2a1d" {o()}/>', "#2f62c4", scale=0.85)
                    + bust(44, 42, 11, "#f4cfab", f'<path d="M19 30 C18 18 26 16 32 16 C38 16 46 18 45 30 C42 24 22 24 19 30Z" fill="#1b1310" {o()}/><circle cx="20" cy="22" r="4" fill="#1b1310" {o()}/><circle cx="44" cy="22" r="4" fill="#1b1310" {o()}/>', "#f07a35", scale=0.62)),
    "r11": portrait("#d6ecf3", bust(32, 34, 14, "#e9b48b",
                                    f'<path d="M15 22 C15 16 49 16 49 22 L49 25 L15 25 Z" fill="#fff" {o()}/><path d="M22 16 C24 10 40 10 42 16Z" fill="#fff" {o()}/><path d="M15 23 L49 23" stroke="#244a73" stroke-width="2.2"/>',
                                    "#fff", extra_front="".join(f'<path d="M{x} 52 L{x} 66" stroke="#244a73" stroke-width="2.6"/>' for x in (16, 24, 32, 40, 48)))),
    "r12": portrait("#f9e1d0",
                    bust(22, 36, 13, "#f4cfab", f'<path d="M15 42 C12 28 14 14 32 13 C50 14 52 28 49 42 C47 34 46 26 42 22 C36 25 26 25 22 22 C18 26 17 34 15 42Z" fill="#1b1310" {o()}/>', "#d24a2f", face="closed", scale=0.8)
                    + bust(43, 36, 13, "#c98d5f", short_black, "#2f3b52", scale=0.8)),
}
for k, v in regs.items():
    save("reg-" + k, 64, 64, v)

# ---------------------------------------------------------------- stations (48x48)
st = {}
st["market"] = (shadow(24, 42, 18)
                + f'<path d="M4 26 C10 16 26 14 36 22 L44 15 L43 33 L36 28 C26 36 10 35 4 26Z" fill="#7aa0b8" {o()}/>'
                + '<path d="M8 27 C16 31 28 31 35 27" fill="none" stroke="#d9e8f0" stroke-width="2.4" stroke-linecap="round"/>'
                + f'<circle cx="11" cy="23" r="2.4" fill="#fff" {o("stroke-width=\'1.4\'")}/><circle cx="11.4" cy="23" r="1" fill="{INK}"/>'
                + '<path d="M20 20 C22 24 22 28 20 31" fill="none" stroke="#56788d" stroke-width="1.6"/>')
st["pantry"] = (shadow(24, 43, 15)
                + f'<path d="M12 17 C10 26 9 34 11 40 C18 43 30 43 37 40 C39 34 38 26 36 17 C30 20 18 20 12 17Z" fill="#e3c98f" {o()}/>'
                + f'<path d="M12 17 C14 12 18 9 24 12 C30 9 34 12 36 17" fill="{RICE}" {o()}/>'
                + f'<path d="M14 19 C20 22 28 22 34 19" fill="none" stroke="#a7783b" stroke-width="3"/>'
                + '<circle cx="24" cy="31" r="5" fill="none" stroke="#c2342a" stroke-width="2.2"/>')
st["belt"] = (f'<rect x="3" y="27" width="42" height="12" rx="6" fill="#8d989b" {o()}/>'
              + "".join(f'<path d="M{x} 29 L{x} 37" stroke="#6e797c" stroke-width="1.6"/>' for x in (12, 20, 28, 36))
              + f'<ellipse cx="15" cy="25" rx="9" ry="4" fill="#fff" {o()}/><ellipse cx="15" cy="25" rx="5" ry="2" fill="#c8392b"/>'
              + f'<ellipse cx="34" cy="25" rx="9" ry="4" fill="#fff" {o()}/><ellipse cx="34" cy="25" rx="5" ry="2" fill="#2c5a39"/>')
st["prep"] = (shadow(24, 42, 18)
              + f'<rect x="5" y="22" width="38" height="16" rx="3" fill="#e2c48e" {o()}/>'
              + f'<path d="M8 18 L34 10 L36 14 L11 22 Z" fill="#dfe6ea" {o()}/><path d="M34 10 L44 7 L45 11 L36 14 Z" fill="#7a532b" {o()}/>'
              + '<path d="M12 19 L32 13" stroke="#fff" stroke-width="1.4"/>')
st["head"] = (shadow(24, 43, 14)
              + f'<path d="M14 24 C14 14 34 14 34 24 L36 30 L12 30 Z" fill="#fff" {o()}/>'
              + f'<path d="M12 30 L36 30 L35 36 L13 36 Z" fill="#fff" {o()}/><path d="M18 22 C18 16 30 16 30 22" fill="none" stroke="#e8e0cc" stroke-width="2"/>'
              + f'<path d="M14 40 L38 40" stroke="{INK}" stroke-width="3" stroke-linecap="round"/><path d="M14 40 L30 40" stroke="#dfe6ea" stroke-width="1.5"/>')
st["door"] = (f'<rect x="6" y="6" width="36" height="5" rx="2" fill="#7a532b" {o()}/>'
              + "".join(f'<path d="M{x} 11 L{x+10} 11 L{x+10} 32 L{x} 32 Z" fill="#21385b" {o()}/>' for x in (7, 19, 31))
              + '<circle cx="24" cy="20" r="4.5" fill="none" stroke="#fff" stroke-width="2"/>'
              + f'<path d="M6 44 L42 44" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>')
st["staff"] = (f'<path d="M24 6 L24 11" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="6" r="2" fill="#7a532b" {o("stroke-width=\'1.4\'")}/>'
               + f'<path d="M14 14 L24 11 L34 14 L38 42 L10 42 Z" fill="#fffaf0" {o()}/>'
               + f'<path d="M16 26 L32 26 L33 42 L15 42 Z" fill="#c2342a" {o()}/><path d="M24 11 L20 20 M24 11 L28 20" stroke="{INK}" stroke-width="1.6"/>')
for k, v in st.items():
    save("st-" + k, 48, 48, v)

print("\n".join(sorted(os.listdir(OUT_DIR))))
