# Holdout

A tap-only zombie survival game for iPhone Safari: an idle camp builder (AdVenture Capitalist style) plus side-scrolling squad assaults (Autumn War style).

This is the first playable slice: the camp (buildings, hiring, managers, offline earnings, saving) and battles on the 10 × 10 sector map. Battle characters and effects are original painted sprites in `sprites.png`; camp art is still placeholder.

## Battle sprites
`sprites.png` is generated. Edit `tools/sprites/draw.js`, then run `node tools/sprites/build.cjs` (needs Playwright and Python with Pillow). If the muzzle positions it prints change, update `MUZZLE` in `game.js`.

## Play
Open the GitHub Pages link in Safari, then Share → Add to Home Screen for full-screen, offline play. Battles are played with the phone sideways.

## Run locally
Any static server works, for example `python3 -m http.server` in this folder.
