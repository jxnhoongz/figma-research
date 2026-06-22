# Chrome Reflow Fix + Normalized SVG Dedup — Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Phase:** Structured-output upgrade — refinements to the plugin (found during chrome-export validation)

## Context & motivation

Validating the chrome-export re-export surfaced two issues:

1. **Auto-layout reflow.** The chrome export hides an instance's TEXT with
   `visible = false`. For absolutely-positioned instances (reward cards) that's
   fine, but a **button is auto-layout** (`layoutMode=HORIZONTAL, align=CENTER`):
   hiding the text removes it from the layout flow, so the remaining content (the
   coin icon) **re-centers**. The chrome image then has the icon in the wrong
   place vs the real design. Confirmed on `Button 1:39286`.

2. **SVG storage waste.** Dedup hashes **exact bytes**, so two exports of the
   *same* icon differ only by random element ids + sub-pixel coordinate noise and
   do NOT collapse. Measured on the Section 3 export: **310 SVGs, all unique by
   exact bytes, but only 139 unique by visual content → 171 (55%) are
   near-duplicates** the dedup missed (~20% bytes, 55% fewer files).

Both are small `figma-plugin/code.js` changes shipped together (one re-export).

## Goal

- Chrome export hides text **without reflowing auto-layout**, so chrome geometry
  matches the full bake for every instance (auto-layout or not).
- SVG dedup collapses **visually-identical** SVGs (not just byte-identical),
  cutting asset count/size, while never merging visually-different art.

## Non-goals

- No change to the IR builder, the scene generator, the emitter, or the app.
- No new automated test infrastructure for the plugin (see Validation).
- PNG dedup is unchanged (rasters don't have id-noise; exact bytes already
  collapse identical PNGs).

## Fix 1 — opacity-based text hiding (reflow)

In `exportChrome`, hide each text with **`opacity = 0`** instead of
`visible = false`, saving and restoring the original opacity:

- An opacity-0 node is invisible in the export **but keeps its layout slot**, so
  auto-layout does not reflow and siblings (icons) stay in their real positions.
- Collect the same nodes as today (`visible !== false` TEXT descendants); for
  each, save `node.opacity`, set `node.opacity = 0`, and in the existing
  `finally` restore each to its saved value (not a hard-coded `1`).
- Mutation-safety is unchanged: the save happens before the `try`; the `finally`
  restores every touched node even if `renderWhole` throws.

Rationale: opacity does not participate in Figma auto-layout sizing; visibility
does. This is the documented auto-layout caveat from the chrome-export spec, now
fixed rather than merely noted.

## Fix 2 — normalized SVG dedup

Dedup currently keys on `r.ext + ":" + hashStr(r.data)`. Change the **SVG** case
to hash a **normalized** form of the SVG string (PNG unchanged):

```
svgDedupKey(data) =
  data
   .replace(/\sid="[^"]*"/g, "")          // random per-export element ids
   .replace(/url\(#[^)]*\)/g, "url()")     // refs to those ids
   .replace(/(xlink:)?href="#[^"]*"/g, "") // refs to those ids
   .replace(/-?\d+\.\d+/g, m => (+m).toFixed(1))  // sub-pixel coordinate noise
   .replace(/\s+/g, " ")
   .trim()
```

- The hash key uses `svgDedupKey(data)` for `ext === "svg"`, else the raw `data`.
- **The stored file is always the original** SVG — only the *dedup key* is
  normalized. Near-duplicates collapse to the first-seen original (visually
  identical, so serving the first for all is correct).
- Applies to BOTH dedup paths: `emitWhole` (`seenHash`) and `exportChrome`
  (`chromeSeen`) — same helper.

**Why it's safe (not a fragile heuristic):** normalization strips only random
ids, their reference plumbing, and sub-0.1px coordinate jitter. The visual
content — path geometry, colours, gradient stops — stays in the normalized
string. So a false merge would require two **visually identical** SVGs (which is
exactly what we want to merge); genuinely different icons have different geometry
and never collide. This is consistent with the project's "dedupe on real
content" principle (here: the *visual* content of the SVG, with non-visual noise
removed), not a guess about semantics.

**No downstream change:** the plugin writes `manifest.json` / `chrome.json`
(nodeId → path); the generator FOLLOWS the manifest and never re-derives a key,
so fewer files + more shared paths just work. Confirmed by the manifest
architecture.

## Validation

Plugin runs in the Figma sandbox — manual, consistent with prior plugin slices:

1. `node --check figma-plugin/code.js`.
2. Re-export Section 3.
3. **Reflow:** open the `Button 1:39286` chrome image — the coin icon is in its
   real (non-centered) position, matching the full bake minus text.
4. **Dedup:** `export-stats.json` shows a higher `deduped` count and fewer SVG
   files than the previous export; spot-check that two previously-separate
   identical icons now map to one path in `manifest.json`.
5. The reward-card chrome still looks correct (text gone, icon/background intact).

No automated test (single hand-written `code.js`, no bundler — can't import into
Vitest). The pure `svgDedupKey` regex is simple and covered by the manual dedup
check; node --check is the automated gate.

## Risk

- **Over-normalization** would merge different art. Mitigated by keeping all
  visual content in the key (only ids/refs/sub-pixel precision removed). If a
  future case shows a wrong merge, the fallback is rasterize-and-hash (render to
  pixels, dedupe on the image) — deferred unless needed.
- **opacity already 0 on a visible text** (rare): collecting it and setting 0 is
  a no-op; restore puts back the saved 0. Harmless.
