# Kaiten 回転寿司

A small-box worker-placement and set-collection card game about running a stall at a conveyor-belt
sushi bar. 2–4 players, about 30 minutes.

- **Play it:** open `index.html` in a browser (you against 1–3 bot chefs). It fits one screen on phone,
  tablet and desktop, and can be installed to a home screen. Music, restaurant ambience and sound
  effects are synthesised in the browser (toggle them in the menu).
- **Rules and card list:** [RULES.md](RULES.md)
- **Balance check:** `node sim.cjs 1000` plays bot-vs-bot games and reports scores, seat win rates and
  per-card win rates.
- **Art:** `art/*.webp` is the painted art cut from the sheets in `art/sheets/`; `art/*.svg` are the older drawn placeholders (`python3 tools/make_art.py art`).
  [docs/art-brief.md](docs/art-brief.md) is the brief that produced the painted contact sheets;
  `python3 tools/slice_sheets.py` cuts them into the game's files.

## Print and play

`print/` holds a printable version of the game, generated from the same data and art as the app:

- `kaiten-cards-A4.pdf`: 59 cards (36 dishes, 4 chefs with a player aid on the back, 12 regulars, 7 events) at poker size, 63 × 88 mm, 9 per A4 page. Fronts and backs alternate; print double-sided, flipping on the long edge.
- `kaiten-tokens-A4.pdf`: 22 mm round tokens for every ingredient (48 fish, 30 Rice, 20 Nori, 35 Wasabi), VP (1, 3, 5, 10), 16 chef workers, and the first-player and round markers.
- `kaiten-board-A3.pdf` (or `kaiten-board-2xA4.pdf` to print on two A4 pages): the belt, the fish on the ice, the seven stations with chef spots, and the round track.
- `contact-*.jpg`: overview images of every face.

Rebuild with `node tools/make_print.cjs`. Add `--singles` to also write each card face as a 300 dpi PNG with 3 mm bleed for print-on-demand services.
