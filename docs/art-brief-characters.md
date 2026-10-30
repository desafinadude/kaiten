# Kaiten character redraw: chefs and regulars

Two prompts for ChatGPT's image generator, one per contact sheet. Paste **Prompt A**, attach the old
chefs sheet (`art/sheets/sheet-01-*`) and send. Then paste **Prompt B**, attach the old regulars sheet
(`art/sheets/sheet-02-*`) and send. Save the results over the old sheets with the same names and run
`python3 tools/slice_sheets.py`. The grid, size and cell order are unchanged, so nothing else needs
to change.

The style paragraph is the same in both prompts. Keep it word for word so the two sheets match.

---

## Prompt A: the chefs (sheet 1)

> I've attached the previous chefs sheet. **Use it only for the format**: keep exactly the same grid
> (2 × 2 square cells), the same 1024 × 1024 image size, the same thin, even cream gutters, the same
> plain warm cream background `#FCF7EC` in every cell, and the same cell order. **Redraw every
> character from scratch in a new style.** Don't copy the old faces or the old anime look.
>
> **Style**: sweet, cosy cartoon storybook illustration, like a modern children's picture book.
> Rounded, simple, chunky shapes, slightly oversized heads, soft gouache and watercolour texture,
> warm hand-drawn outlines that are a little thick and wobbly, rosy cheeks, gentle warm light from the
> upper left, a little paper grain. Faces are friendly and expressive with small, simple eyes (dots
> or small ovals with one tiny highlight), simple noses and big warm smiles. **Not anime or manga**:
> no large glossy anime eyes, no sharp pointed chins, no spiky anime hair, no glamour shading.
> **Not** 3D, **not** photoreal, **not** flat vector clip art.
>
> **Range and diversity**: every character must look clearly different at a glance. Vary skin tone
> (from very light to very dark), ethnicity, age, face shape, body build, height and hair texture
> (straight, wavy, curly, coily, braided, bald). They work together in one friendly neighbourhood
> sushi bar in Japan. Everyone is warm and likeable, and nobody is a caricature or a stereotype.
>
> **Every cell**: head and shoulders, three-quarter view, one person, centred, filling about 75% of
> the cell. White chef's coat, with a twisted **hachimaki headband and an apron in their team
> colour**. Hands empty. These are game tokens shown as small as 24 px, so keep faces big and clear,
> with strong simple silhouettes. **No text, letters, numbers, kanji, labels, borders, frames or
> watermarks anywhere.**
>
> Cells, left to right, top to bottom:
>
> 1. **Sora**, blue team `#2F62C4`. The fishmonger: a young Black man in his twenties, close-cropped
>    hair, broad shoulders, a big confident grin, a few freckles.
> 2. **Hana**, red team `#D24A2F`. The hostess: a Japanese woman in her thirties, black hair in a
>    tidy high bun, round cheerful face, a welcoming wide smile.
> 3. **Ren**, yellow team `#D9A51A`. The rice master: a round, jolly Pacific Islander man in his
>    forties, curly black hair and a short beard, chubby cheeks, laughing.
> 4. **Ito**, teal team `#1F9488`. The old master: an elderly Japanese man, bald on top with white hair
>    at the sides, bushy white eyebrows and a neat white moustache, small round glasses, a calm,
>    kind smile.

---

## Prompt B: the regulars (sheet 2)

> I've attached the previous regulars sheet. **Use it only for the format**: keep exactly the same
> grid (4 columns × 3 rows of square cells), the same 2048 × 1536 image size, the same thin, even
> cream gutters, the same plain pale washi background `#F3EAD6` in every cell, and the same cell
> order. **Redraw every character from scratch in a new style.** Don't copy the old faces or the old
> anime look.
>
> **Style**: sweet, cosy cartoon storybook illustration, like a modern children's picture book.
> Rounded, simple, chunky shapes, slightly oversized heads, soft gouache and watercolour texture,
> warm hand-drawn outlines that are a little thick and wobbly, rosy cheeks, gentle warm light from the
> upper left, a little paper grain. Faces are friendly and expressive with small, simple eyes (dots
> or small ovals with one tiny highlight), simple noses and big warm smiles. **Not anime or manga**:
> no large glossy anime eyes, no sharp pointed chins, no spiky anime hair, no glamour shading.
> **Not** 3D, **not** photoreal, **not** flat vector clip art.
>
> **Range and diversity**: every character must look clearly different at a glance. Vary skin tone
> (from very light to very dark), ethnicity, age (toddler to great-grandparent), face shape, body
> build and hair texture (straight, wavy, curly, coily, braided, bald). They are regular customers at
> a friendly neighbourhood sushi bar in Japan. Everyone is warm and likeable, and nobody is a
> caricature or a stereotype.
>
> **Every cell**: head and shoulders, three-quarter view, centred, filling about 75% of the cell,
> looking hungry and happy as if waiting at the door. Each person's outfit has one bold colour so
> they read at 32 px. **No text, letters, numbers, kanji, labels, borders, frames or watermarks
> anywhere** (the notebook in cell 4 is blank).
>
> Cells, left to right, top to bottom:
>
> 1. **Salaryman**: a middle-aged Korean man, navy suit, loosened red tie, square glasses, tired but
>    hopeful smile.
> 2. **Roll Fanatic**: a Latina teenage girl, red cap worn backwards, green hoodie, braces on her
>    teeth, beaming.
> 3. **Purist**: a very old Japanese gentleman, thin white beard, dark indigo kimono, stern but with
>    a twinkle.
> 4. **Food Critic**: a Black woman in her fifties, black beret, red cat-eye glasses, silk scarf,
>    holding a small blank notebook, one eyebrow raised.
> 5. **Tuna Devotee**: a big, burly Samoan fisherman, bucket hat, red rain jacket, thick beard,
>    huge grin.
> 6. **Salmon Devotee**: a Norwegian woman in her twenties, long wavy ginger hair, lots of freckles,
>    chunky orange knit sweater.
> 7. **Eel Devotee**: an Indian grandmother, grey hair in a bun, round glasses, brown cardigan over
>    a patterned sari border, gentle smile.
> 8. **Shrimp Devotee**: a small mixed-race child of about five, curly hair in two puffs, pink cap,
>    yellow T-shirt, gap-toothed grin.
> 9. **Big Spender**: a Middle Eastern man in his forties, slicked-back hair, sunglasses pushed up on
>    his head, purple suit, gold chain, smug grin.
> 10. **Family Table**: a Filipino dad with a toddler on his shoulders, both laughing; the pair fits
>     together inside the one cell.
> 11. **Ocean Medley**: a weathered old Irish sailor, white captain's cap, blue-and-white striped
>     shirt, bushy grey sideburns, crinkly-eyed smile.
> 12. **Lunch Date**: a young couple leaning their heads together: a Malaysian woman in a pastel
>     hijab and a Nigerian man with short twists, both smiling shyly.

---

### If something comes out wrong

Ask for the **whole sheet again** with a short note, not a single replacement, so the set stays
consistent. For example: "Same sheet, but cell 3 needs a darker skin tone and the eyes in every cell
should be smaller and simpler, less anime."
