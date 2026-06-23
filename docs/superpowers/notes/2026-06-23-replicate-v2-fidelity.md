# Replicate v2 fidelity — two issues, two verdicts (2026-06-23)

After re-running the replicate on a baked fidelity base (v4 export), two visual
issues were reported on the 当前活动时间 / progress-card region. Investigated both
to root cause (no patch/pray).

## Issue A — washed-out "flashbang" chrome → REAL BUG, FIXED

`gradientCss` emitted `radial-gradient(circle, …)` with **no center or size**, so
CSS defaulted to a full-bleed circle. A small Figma sheen highlight (e.g. a corner
glint at `at 94% 88%` sized `15% 53%`) was therefore stretched across the whole
element, washing it out. With 177 radial fills on this screen, the cumulative
effect was a hazy, low-contrast card.

**Root fix:** use the Figma gradient handles `[center, r1, r2]` to emit a
positioned, sized ellipse — `radial-gradient(rx% ry% at cx% cy%, …)`. Extracted
`rgba` + `gradientCss` to the shared lib (`scripts/lib/figma.mjs`) with 3 unit
tests. Commit `526ff42`. Validated: the card/button render crisp.

## Issue B — star decoration over the header text → NOT A BUG (faithful)

The star (`Frame 1410162713`) sits **5px over the text's left edge**, is **layered
above** the text, and its container **`clipsContent = false`** — so Figma itself
renders the star slightly over "当". We reproduce this faithfully. There is **no
logic error**.

A "text always paints on top of decorative siblings" rule was considered and
**rejected**: it would make us *deviate* from the Figma design (which deliberately
layers the star over the text) — a patch that reduces fidelity, not a fix.

### CORRECTION — it is NOT a font-substitution fallback (verified)
An earlier draft of this note blamed font substitution. **That was wrong** —
verified with `document.fonts` in the running app:
- "当前活动时间" renders in **YouSheBiaoTiHei via the loaded full CDN `@font-face`**
  (`U+0–10FFFF`), not a PingFang fallback.
- The **local subset** `@font-face` (reliable, no-network) stays `[unloaded]` —
  the full CDN face already covers those glyphs, so the browser never triggers
  the subset. The CDN face is network-dependent and has **no 700 weight**, so the
  heading is rendered **faux-bold from the 400 face** — a minor metric difference
  from Figma's true 700, not a wholesale substitution.

So the 5px star-over-text overlap is **faithful to Figma**; there is **no
confirmed "ours is worse" bug**. Any perceived extra overlap is at most the
faux-bold weight imperfection or an image-scale difference between the reference
and our screenshot — not a paint-order or missing-font error.

## Proposed fix (minor — the font is already sourced)

The font is already wired (subset + CDN). The only real improvement is making it
**reliable + weight-correct** instead of leaning on the network CDN at the wrong
weight:

1. **Recommended — make the local subset win + carry the weight.** Add the missing
   display glyphs to the local subset woff2, declare it `font-weight: 700`, and
   give the CDN fallback a `unicode-range` that *excludes* the subset's glyphs (so
   the reliable local face renders the headings and the CDN only fills gaps). This
   removes the network dependency and the faux-bold. Needs the full font to
   re-subset from.
2. **Otherwise accept.** The overlap is faithful and the heading already renders in
   the right family; the residual is a faux-bold weight nuance only.

Do **not** patch paint order — the overlap is correct.

## Skill consequence

`replicate-screen` SKILL.md updated (§4 Verify) with a **fidelity-discipline**
rule: distinguish a real reconstruction bug from a faithful reproduction before
"fixing" anything; never deviate from the design to look nicer; log font/asset
artifacts as known limitations instead of patching them.
