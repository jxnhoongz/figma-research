---
name: figma-replicate
description: Replicate a Figma screen/section 1:1 in React from a local plugin export — no REST API or rate limits. Use when reproducing a Figma design (screen, section, multi-theme variants) as pixel-faithful code, when "the positioning is off" / "fonts/colors are wrong" in a Figma rebuild, or when building the export→scene→render pipeline for design replication.
---

# Figma Replicate

## Overview

Reproduce a Figma screen in React with high fidelity by **exporting rendered
assets + structure locally from a Figma plugin**, then **reconstructing the
screen from exact node coordinates** — never by eyeballing positions. A Figma
plugin runs in-sandbox (no REST API, no token, no rate limit), so it can dump
the full node tree (`JSON_REST_V1`) plus every asset as SVG/PNG in one bundle.

The core insight that makes this faithful: **the structure JSON has the exact
absolute box for every node**, so positioning is correct *by construction*. A
generator places each exported asset at its node's coordinate in paint order,
overlays loose text, and paints container backgrounds.

## The Pipeline (4 stages)

```
Figma plugin (assets/figma-plugin/)   →  figma-export.json  (structure/ + svg/ + png/ + manifest.json)
  ↓ scripts/import-figma-export.mjs
unpacked dir (structure/, svg/, png/, manifest.json, export-stats.json, failed.json)
  ↓ scripts/build-section-scene.mjs   (per screen — follows manifest.json)
scene.json  +  copied assets
  ↓ assets/SceneRenderer.tsx          (generic, data-driven)
React screen
```

`manifest.json` (nodeId → asset path) is the contract between plugin and
generator. Dedup happens once, in the plugin, by rendered-content hash.

### Stage 1 — Export (in Figma)
1. Open the Figma file, install the plugin from `assets/figma-plugin/` (Plugins →
   Development → Import plugin from manifest → pick `manifest.json`).
2. **Select the SECTION (or screen) frame**, run the plugin. It produces ONE
   `figma-export.json` containing `structure/<root>.json` (full tree) + deduped
   `svg/` + `png/` assets + `export-stats.json` + (if any) `failed.json`.
3. Export the WHOLE section once — dedup makes multi-theme efficient (identical
   art is shared; only genuinely different art is duplicated).

**Trust but verify the export:** read `export-stats.json` (counts are
success-only) and `failed.json` (each entry has node `id`, `box`, `fills`,
`reason` — fetch by id or reconstruct simple fills from JSON). `failed: 0` and
`missing: 0` (from stage 3) is the goal.

### Stage 2 — Unpack
```
node scripts/import-figma-export.mjs ~/Downloads/figma-export.json <unpackDir>
```
`<unpackDir>` is throwaway (gitignore `figma-export*/`). Curated assets get
copied into the project by stage 3.

### Stage 3 — Build the scene (per screen variant)
```
node scripts/build-section-scene.mjs <unpackDir> "<exact screen frame name>" \
  src/assets/<section>/img  src/screens/<Screen>/scenes/<variant>.json
```
- Replays the plugin's dedup classification to map each on-screen node to its
  asset file, normalises coordinates to the screen origin, emits an ordered
  `scene.json`, and copies referenced assets.
- For **N theme variants**, run once per variant into the SAME `img` dir (assets
  accumulate + dedupe) and one `scenes/<theme>.json` each.
- Check the printed `missing: 0`. Any `missing` lists nodes with no asset
  (re-export or reconstruct from JSON).

### Stage 4 — Render
- Copy `assets/SceneRenderer.tsx` into the project's components.
- Screen component: glob the asset dir + scenes, pass the chosen scene +
  `assetUrl` resolver to `<SceneRenderer>`. See `references/screen-example.tsx`.

## Critical Fidelity Rules (learned the hard way)

Read `references/gotchas.md` for the full list with rationale. The essentials:

1. **Position from coordinates, never by eye.** Every node's `absoluteBoundingBox`
   is the source of truth. If positioning is "off", the generator/coords are
   wrong, not your guess.
2. **Composite ALL text fills — don't pick the first.** Text often layers a
   colour + a translucent black overlay; `fills[0]` alone renders too bright.
   Composite bottom→top with per-fill opacity (the generator does this).
3. **Capture text strokes.** `strokes` + `strokeWeight` → `-webkit-text-stroke`
   + `paint-order: stroke fill`. Missing this = no outline (e.g. white-stroked titles).
4. **Apply `fontFamily` + self-host non-system fonts.** Subset CJK display fonts
   to the glyphs used (`pyftsubset --text=...`), serve from `public/fonts/` (NOT
   a CSS relative url — Tailwind/Lightning CSS may drop it), scope with
   `unicode-range`. `<img src>` SVGs can't inherit `currentColor`.
5. **Dedup is by RENDERED-CONTENT hash, not a guessed signature.** The plugin
   renders each candidate, hashes the actual bytes, and collapses only
   byte-identical output — so theme recolours, reward-grid cards, and icon-only
   differences ALL stay distinct automatically, with no per-section patching.
   The plugin writes `manifest.json` (nodeId → asset path); the generator just
   reads it. (Earlier versions guessed a name/area/colour/text signature and
   broke on every new section — don't reintroduce that.)
6. **`DECOR_MIN_AREA = 16`, not 500.** 500 (~22×22) drops real small icons (step
   dots, +/− markers, list bullets). The sub-pixel guard is `exportable()`.
7. **Never approximate non-rectangles as CSS rects.** Only `RECTANGLE`/`FRAME`
   get a `rect` background; ellipses/booleans/vectors MUST come through as SVG
   (a rect turns a circle into a square, a "+" union into crossing bars).
8. **Baked vs loose text.** Text inside a whole-exported decor group is baked
   into the asset (font-as-paths, always correct) — don't overlay it. Loose text
   is rendered live. The generator stops at whole-export boundaries to avoid
   double-rendering.

## Known Limitation: per-theme recolour is NOT algorithmic

Multi-theme Figma sections are often **distinct palettes**, not one accent
swapped (verify with a colour diff: e.g. 24 vs 10 unique colours between two
themes, no clean 1:1 map). So the "swap one accent → `currentColor`" trick does
NOT generalise. Get each theme's real pixels by exporting all variants (the
plugin is local — re-export is cheap) and letting `colorSig` keep them distinct.
Don't waste effort on a CSS-recolour shortcut unless a colour diff proves it's a
single-accent swap.

## Architecture note: the manifest removes plugin/generator coupling

The plugin owns dedup (by rendered-content hash) and emits `manifest.json`
(nodeId → asset path). The generator FOLLOWS the manifest — it does not classify
or re-derive any dedup key. This is what ended the "patch the signature, then
re-export every section" loop. Keep it that way: if a new section needs
different behaviour, change WHAT the plugin exports (classification:
`DECOR_MIN_AREA`, which node types) — never reintroduce a content signature the
generator has to mirror.

## Resources

- `assets/figma-plugin/` — the exporter plugin (code.js, ui.html, manifest.json).
- `scripts/import-figma-export.mjs` — unpacks a bundle to disk.
- `scripts/build-section-scene.mjs` — builds a scene.json from a screen.
- `assets/SceneRenderer.tsx` — generic absolute-positioned renderer.
- `references/gotchas.md` — every fidelity rule with the bug it prevents.
- `references/screen-example.tsx` — wiring a multi-variant screen + theme switch.
