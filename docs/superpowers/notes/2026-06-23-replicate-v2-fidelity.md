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

### The real (cosmetic) cause: font substitution
We lack the proprietary display font (e.g. `YouSheBiaoTiHei`), so "当前活动时间"
renders in a fallback CJK font at a slightly different width/position. The star is
pinned to fixed Figma coordinates, so when our glyphs shift under it, the faithful
5px overlap *reads* as more. This is a **known limitation** (see
`docs/research-tracks.md` — "Proprietary display fonts need sourcing or baking"),
not a generator bug.

## Proposed fix (for Issue B's cosmetics)

1. **Recommended — source the display font.** Obtain the real font (or a close
   licensed substitute) and load it via `@font-face` in `src/index.css`. This
   fixes **all** text fidelity (width, weight, position), not just this header,
   and removes the shifted-glyph collision. Gate: font availability/licensing.
2. **Fallback — bake decoration+text headers whole.** A plugin rule (like the
   grid-panel rule) that bakes a small "decorative header" frame (text + accent
   over it) to one asset, so text is rendered at the correct font with no
   collision. Cost: that header loses text editability + needs a re-export.
3. **Otherwise accept.** It is faithful; the overlap matches the design data.

Recommendation: pursue (1) when a font is available; until then **accept** — do
not patch paint order.

## Skill consequence

`replicate-screen` SKILL.md updated (§4 Verify) with a **fidelity-discipline**
rule: distinguish a real reconstruction bug from a faithful reproduction before
"fixing" anything; never deviate from the design to look nicer; log font/asset
artifacts as known limitations instead of patching them.
