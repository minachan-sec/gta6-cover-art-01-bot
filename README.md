# Flamingo Key Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/minachan-sec/gta6-cover-art-01-bot/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/minachan-sec/gta6-cover-art-01-bot/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your own photos and a caption into a
multi-panel poster in the style of GTA 6 cover art — sunset and neon
grades, bold display lettering, a badge ribbon and a heat meter — and
exports it as a PNG in the sizes people actually post. It runs entirely
in the browser from static files: photos are read on your machine and
never uploaded anywhere.

## What it does

- **Six layouts** — Hero Grid, Nine Panel, Tilted Snaps, Full Bleed,
  Split Duo and Comic Strip — each with its own panel geometry and
  caption block.
- **Six colour grades** — Vice Sunset, Neon Nights, Gold Hour, Teal
  Heat, Midnight and Noir Pop — applied per panel as a filter plus
  gradient washes in blend modes.
- **Any photo, any panel** — drop in as many photos as you like, click
  a panel to fill it, drag inside a panel to reposition, scroll or use
  the slider to zoom, or fill every panel with one photo.
- **Caption editing** — title, script subtitle, badge ribbon text and a
  five-star heat rating, all live in the preview.
- **One-step export** — PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080,
  or all three at once. Undo and redo cover every change.
- **Original art** — every frame, gradient, halftone dot and grain
  speckle is drawn in code. No Rockstar logo, artwork or font is used;
  the lettering is Anton and Pacifico, both under the SIL Open Font
  License (see `app/fonts/OFL.txt`).

## Try it

```sh
node serve.ts
```

Then open <http://localhost:8080/> in desktop Chrome. No build step,
no network: `app/` is plain static files.

## Handing it in

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with
the kit's `buildDossier`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout of the repo

- `app/index.html` — the editor page
- `app/styles.css` — the editor chrome
- `app/cover.js` — the cover engine: layouts, grades, lettering, grain
- `app/editor.js` — photos, panels, crop, history, export, shot modes
- `app/fonts/` — Anton and Pacifico (SIL OFL)
- `app/samples/` — two sample photos (made with an image model, free to use)
- `screenshots/` — the entry's screenshots: the app at work and covers it exported
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

---

<sub>Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on [make.fun](https://make.fun) · MIT licensed</sub>
