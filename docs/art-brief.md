# Kaiten art brief

The game currently uses the flat SVG placeholders in `art/`. This brief replaces them with painted art in
a warm, hand-painted, Miyazaki-inspired animated-film look. That means a cosy little sushi bar, glossy
fresh fish, round friendly faces and soft afternoon light.

**How to use it with ChatGPT.** Ask for **contact sheets, not single images**. One image holds a
whole set in a grid. That is far faster than one picture per prompt, and sets made together come out
consistent (same faces, line weight, light and colours). Paste the **style brief** once, then send one
sheet request at a time. Save each finished sheet as `art/sheets/sheet-NN-name.png` and run
`python3 tools/slice_sheets.py`. It cuts every cell out and saves it under the file name listed here,
which is the name the game already loads.

> A note on wording: image tools often refuse or water down prompts that name a studio or a living
> artist. The brief below describes the look instead of naming it. That gets you there more reliably.

---

## Style brief (paste this first)

> You are illustrating **Kaiten**, a cosy board game set in a small neighbourhood conveyor-belt sushi
> bar in Japan. Chefs in white coats and coloured headbands work behind a hinoki-wood counter while
> plates glide past on a steel belt.
>
> **Look**: hand-painted animated-film storybook art. Soft gouache and watercolour texture, gentle
> hand-drawn ink outlines of varying weight, warm late-afternoon light from the upper left, soft
> painted shadows, a little paper grain. Food looks glossy, fresh and delicious: translucent fish with
> visible grain and a wet highlight, rice with individual plump grains, crisp dark nori. Characters are
> round-faced, warm and expressive, with simple shapes and big kind eyes. Cosy, nostalgic and
> slightly whimsical. **Not** 3D-rendered, **not** photorealistic, **not** flat vector or clip art,
> **not** chibi-sticker style.
>
> **Palette**: hinoki wood `#E6CD9F`, deep indigo `#21385B`, vermilion lacquer `#C2342A`,
> nori green `#21362A`, salmon `#F07A35`, tuna red `#C11F3B`, wasabi green `#8DBB42`,
> warm cream `#FCF7EC`. Team colours for the chefs' headbands and aprons: blue `#2F62C4`,
> red `#D24A2F`, yellow `#D9A51A`, teal `#1F9488`.
>
> **Contact sheets**: always deliver a set as ONE contact sheet: a single image holding a strict grid
> of equal cells separated by thin, even cream gutters, filled left to right, top to bottom, in the
> order given. Every cell is a complete, separate illustration. Nothing crosses into a neighbouring
> cell. Leave spare cells plain cream.
>
> **Inside each cell**: one subject, centred, filling about 75% of the cell, on a plain flat
> background in the colour asked for (no scenery, no props unless listed, no drop shadow running off
> the edge). **No text, letters, numbers, kanji, captions, labels, borders, frames, watermarks or
> logos anywhere.** Each image must still read clearly when shown small (food at 48 px, faces at
> 32 px).
>
> **Consistency**: same painting style, outline weight, lighting and palette across every cell and
> every sheet. Characters are original invented people.

### How to ask for each sheet

> Using the style brief, make **one contact sheet**: a [COLS] × [ROWS] grid of square cells on a
> [W] × [H] image, thin cream gutters, filled left to right, top to bottom in this order:
> [paste the cell list].

If one cell comes out wrong, ask for the whole sheet again with a note ("cell 6 needs a nori band")
rather than a single replacement, so the set stays consistent.

---

## Sheet 1: The chefs

Grid **2 × 2**, 1024 × 1024. Background: warm cream `#FCF7EC`.
Head-and-shoulders, three-quarter view, white chef's coat, a twisted **hachimaki headband and apron in
their team colour**, holding nothing. These are the player pieces, shown as round tokens down to 24 px,
so keep faces large and clear.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | You, blue team: young chef, short black hair, determined grin | `art/chef-0.webp` |
| 2 | Hana, red team: black hair in a high bun, cheerful | `art/chef-1.webp` |
| 3 | Ren, yellow team: spiky brown hair, cheeky smile | `art/chef-2.webp` |
| 4 | Ito, teal team: older master chef, grey hair at the sides, neat white moustache, calm smile | `art/chef-3.webp` |

## Sheet 2: The regulars

Grid **4 × 3**, 2048 × 1536. Background: pale washi `#F3EAD6`.
Head-and-shoulders customers waiting at the door, three-quarter view, looking hungry and happy.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | Salaryman: navy suit, loosened red tie, tired but hopeful | `art/reg-r1.webp` |
| 2 | Roll Fanatic: young, red cap, green hoodie, chopsticks ready | `art/reg-r2.webp` |
| 3 | Purist: elderly gentleman, white beard, dark kimono, stern | `art/reg-r3.webp` |
| 4 | Food Critic: black beret, round glasses, curled moustache, notebook | `art/reg-r4.webp` |
| 5 | Tuna Devotee: fisherman's bucket hat, red jacket, sun-tanned | `art/reg-r5.webp` |
| 6 | Salmon Devotee: long auburn hair, orange sweater | `art/reg-r6.webp` |
| 7 | Eel Devotee: grandmother, grey bun, glasses, brown cardigan | `art/reg-r7.webp` |
| 8 | Shrimp Devotee: small child, pink cap, yellow T-shirt | `art/reg-r8.webp` |
| 9 | Big Spender: slicked hair, sunglasses, purple suit, gold chain | `art/reg-r9.webp` |
| 10 | Family Table: parent and small child side by side | `art/reg-r10.webp` |
| 11 | Ocean Medley: sailor cap, striped shirt, weathered smile | `art/reg-r11.webp` |
| 12 | Lunch Date: young couple leaning together | `art/reg-r12.webp` |

## Sheet 3: Nigiri and maki

Grid **4 × 4**, 2048 × 2048. Background: plate cream `#FFFDF8`. These sit in the middle of a kaiten
plate, so no plate, board or garnish under them. Three-quarter top view, the same camera angle for all.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | Tuna nigiri (deep red maguro) | `art/dish-nigiri-tuna.webp` |
| 2 | Fatty tuna nigiri (pale pink, marbled otoro) | `art/dish-nigiri-toro.webp` |
| 3 | Salmon nigiri (orange with white fat lines) | `art/dish-nigiri-salmon.webp` |
| 4 | Seared salmon nigiri (torched edges, a little char) | `art/dish-nigiri-aburi.webp` |
| 5 | Eel nigiri (glazed unagi, grill marks, nori band) | `art/dish-nigiri-eel.webp` |
| 6 | Shrimp nigiri (striped ebi, red tail) | `art/dish-nigiri-shrimp.webp` |
| 7 | Sweet omelette nigiri (tamago, nori band) | `art/dish-nigiri-egg.webp` |
| 8 | Two nigiri side by side, tuna and salmon | `art/dish-nigiri-pair.webp` |
| 9 | Three tuna maki pieces | `art/dish-maki-tuna.webp` |
| 10 | Three salmon maki pieces | `art/dish-maki-salmon.webp` |
| 11 | Three cucumber maki pieces | `art/dish-maki-cucumber.webp` |
| 12 | Three inside-out California rolls with sesame | `art/dish-uramaki.webp` |
| 13 | One thick futomaki slice with egg, cucumber, pink fish flakes | `art/dish-futomaki.webp` |
| 14 | Rainbow roll: a row of pieces topped with tuna, salmon, eel, shrimp | `art/dish-roll-rainbow.webp` |
| 15 | Dragon roll: eel and avocado scales, a cute dragon face at one end | `art/dish-roll-dragon.webp` |
| 16 | (empty) | |

## Sheet 4: Sashimi and specials

Grid **4 × 3**, 2048 × 1536. Background: plate cream `#FFFDF8`. Same camera angle as sheet 3.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | Tuna sashimi: three slices fanned on a shiso leaf, daikon threads | `art/dish-sashimi-tuna.webp` |
| 2 | Fatty tuna sashimi, marbled pink, shiso leaf | `art/dish-sashimi-toro.webp` |
| 3 | Salmon sashimi, three slices, shiso leaf | `art/dish-sashimi-salmon.webp` |
| 4 | Sweet raw shrimp (amaebi), two translucent shrimps with tails | `art/dish-sashimi-ebi.webp` |
| 5 | Mixed sashimi: tuna, salmon and eel slices with shiso | `art/dish-sashimi-mixed.webp` |
| 6 | Little wooden sashimi boat loaded with assorted slices | `art/dish-sashimi-boat.webp` |
| 7 | Chirashi bowl: red lacquer bowl, colourful fish, salmon roe, egg | `art/dish-bowl-chirashi.webp` |
| 8 | Unadon: lacquer bowl of rice topped with glazed eel | `art/dish-bowl-unadon.webp` |
| 9 | Kaisendon: bowl heaped with salmon, tuna and glistening roe | `art/dish-bowl-kaisen.webp` |
| 10 | Omakase: small wooden geta board with four different nigiri | `art/dish-omakase.webp` |
| 11 | Tempura platter: two golden shrimp tempura on folded paper | `art/dish-tempura.webp` |
| 12 | Chawanmushi: lidded porcelain cup, lid tilted, silky yellow custard | `art/dish-chawanmushi.webp` |

## Sheet 5: Ingredients

Grid **4 × 2**, 2048 × 1024. Background: plate cream `#FFFDF8`. One ingredient per cell, shown simply
and centred. These appear tiny (16–46 px), so give each a bold, instantly readable silhouette.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | Rice: a small mound of glossy sushi rice | `art/ing-R.webp` |
| 2 | Nori: one square sheet, slightly curled corner | `art/ing-N.webp` |
| 3 | Tuna: a neat block (saku) of deep red tuna | `art/ing-T.webp` |
| 4 | Salmon: a block of salmon with white fat stripes | `art/ing-S.webp` |
| 5 | Eel: a glazed grilled eel fillet | `art/ing-U.webp` |
| 6 | Shrimp: one curled cooked shrimp with tail | `art/ing-E.webp` |
| 7 | Wasabi: a small green mound, grated texture | `art/ing-W.webp` |
| 8 | (empty) | |

## Sheet 6: Station signs

Grid **4 × 2**, 2048 × 1024. Background: warm cream `#FCF7EC`. Small object vignettes used as the icon on
each wooden station board.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | Fish Market: a whole fresh fish on crushed ice | `art/st-market.webp` |
| 2 | Pantry: a tied rice sack with a wooden scoop | `art/st-pantry.webp` |
| 3 | Kaiten Belt: two coloured plates on a short stretch of conveyor | `art/st-belt.webp` |
| 4 | Prep Counter: cutting board with a sushi knife | `art/st-prep.webp` |
| 5 | Head Chef: a folded white chef's cap and a long yanagiba knife | `art/st-head.webp` |
| 6 | Front Door: an indigo noren curtain in a wooden doorway | `art/st-door.webp` |
| 7 | Staff Room: a white chef's coat and red apron on a wall hook | `art/st-staff.webp` |
| 8 | (empty) | |

## Sheet 7: Textures

Grid **3 × 2**, 1536 × 1024. **Each cell is a seamless, tileable texture**: it repeats with no visible
edge, has no objects, no light falloff, no vignette, and has an even, low-contrast pattern so text stays
readable on top. Same painted style as everything else.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | Table: pale hinoki wood, fine straight grain, warm `#E6CD9F` | `art/tex-table.webp` |
| 2 | Your counter tray: darker oiled wood `#A87B45`, visible grain | `art/tex-tray.webp` |
| 3 | Noren: indigo-dyed cotton `#21385B`, soft weave, faint dye variation | `art/tex-noren.webp` |
| 4 | Conveyor belt: brushed steel plates `#8D989B` with joints running vertically | `art/tex-belt.webp` |
| 5 | Crushed ice for the fish market, cool white-blue | `art/tex-ice.webp` |
| 6 | Washi paper for tickets and cards, cream `#FCF7EC`, soft fibres | `art/tex-paper.webp` |

## Sheet 8: App icon

Grid **2 × 1**, 2048 × 1024.

| Cell | Subject | Save as |
| --- | --- | --- |
| 1 | App icon: one salmon nigiri on a cream kaiten plate with red rims, seen from slightly above, centred on a deep indigo `#21385B` ground with a hint of noren cloth texture. Bold and simple so it reads at 32 px. | `icons/icon-512.png` (and the smaller sizes) |
| 2 | The same icon with the plate shrunk to the central 60% (safe zone for Android's masked icons), ground filling the whole cell | `icons/maskable-512.png` |

---

## After slicing

`tools/slice_sheets.py` writes every file above. To switch the game over from the SVG placeholders,
change `ART_EXT` near the top of the UI script in `index.html` from `'svg'` to `'webp'`.
The textures (`tex-*.webp`) and the new icons can then be wired into the CSS and `manifest.webmanifest`.
