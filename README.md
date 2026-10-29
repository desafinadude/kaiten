# Kaiten 回転寿司

A small-box worker-placement and set-collection card game about running a stall at a conveyor-belt
sushi bar. 2–4 players, about 30 minutes.

- **Play it:** open `index.html` in a browser (you against 1–3 bot chefs). It fits one screen on phone,
  tablet and desktop, and can be installed to a home screen.
- **Rules and card list:** [RULES.md](RULES.md)
- **Balance check:** `node sim.cjs 1000` plays bot-vs-bot games and reports scores, seat win rates and
  per-card win rates.
- **Art:** `art/*.webp` is the painted art cut from the sheets in `art/sheets/`; `art/*.svg` are the older drawn placeholders (`python3 tools/make_art.py art`).
  [docs/art-brief.md](docs/art-brief.md) is the brief for the painted art for painted contact sheets;
  `python3 tools/slice_sheets.py` cuts them into the game's files.
