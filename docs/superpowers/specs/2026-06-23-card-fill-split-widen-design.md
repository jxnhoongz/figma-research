# Card fill-split WIDEN — themeable masked chrome — Design

**Date:** 2026-06-23
**Status:** Approved (design) — Approach A (CSS mask)
**Phase:** Track 1 — Layer 1 hardening. The WIDEN follow-up to the narrow
fill-split spike (`docs/superpowers/specs/2026-06-23-fill-split-rule-design.md`),
itself a reversible **spike** with a measurement gate.

## Context & motivation

The narrow fill-split rule decomposed simple gradient pills/bars (the 立即领取
button) into themeable CSS — verified working (`docs/superpowers/notes/2026-06-23-fill-split-spike.md`,
decision WIDEN). Its `hasMaskOrBoolean` guard deliberately excluded the **reward
cards**, which are the bigger prize: the calibration baked all 12 of them.

A reward card (e.g. `INSTANCE Frame 1410162759`, baked today as one PNG) is:
- a **body** = a `BOOLEAN_OPERATION "Subtract"` (a rounded rect **minus two side
  ellipses** — a ticket/coupon silhouette with side-notch cutouts) whose fill is a
  **`GRADIENT_LINEAR`** — themeable colour locked behind a non-rectangular shape;
- a small **corner gradient badge** (当前 tag), decorative **star** shapes, a
  **coin** icon group, and **amount + label** text.

The narrow rule can't widen by just dropping its guard: recursing would lose the
notches (a plain CSS rect can't cut the side circles) and the gradient lives on a
boolean op, not a simple frame fill. The card needs its **silhouette** preserved
*and* its **colour** freed.

## Goal

A reward card's notched gradient **body** renders as a **themeable CSS gradient
behind a mask** (the exported silhouette), with its coin/text/badge as structured
overlays — instead of one baked PNG. Validated by a fidelity diff against the
ground-truth render and a recolour check, on one card first.

## Approach A — CSS mask (chosen)

Split the card body into two separable facts: **shape** (the notched silhouette)
and **colour** (the gradient). Export the shape as an alpha mask; keep the colour
as CSS data; composite them with `mask-image`.

```
baked today:           Frame_…_card.png  (shape + gradient + coin + text, flat)
after WIDEN:           <div bg=linear-gradient(…)  mask=url(silhouette.svg)>   ← themeable body
                       + coin <img>  + amount/label text  + badge   (overlays)
```

### Why not the alternatives
- **B (keep silhouette baked, extract only content):** colour stays baked — fails
  the themeable goal. Rejected.
- **C (clip-path polygon):** can't faithfully cut the *curved* ellipse notches.
  Rejected.

## The change (three layers; a real multi-part build, unlike the narrow rule)

### 1. Plugin (`figma-plugin/code.js`) — masked fill-split
A new path, sibling to `isFillSplittable`, for a **masked gradient body**: a
`BOOLEAN_OPERATION`/masked node whose fill is token-able (gradient/solid). When
the card instance is walked, instead of baking it whole:
- For the body Subtract: export its **silhouette as an alpha-mask SVG** — the
  boolean shape rendered as opaque black, fill stripped (`exportAsync` SVG, then
  drop paint so it is a pure shape) — and record the body's gradient fill in the
  structure (already present in `node.fills`).
- Recurse the card's content children (coin group, text, badge) so they export as
  their own assets / stay as text (the narrow rule's recursion behaviour).
- Record the body in the manifest as a **mask asset** (a new manifest shape:
  `{ mask: "<path>.svg", fill: <gradient> }` or a parallel `masks.json`, decided
  in the plan) and bump a new `stats.maskSplit`.

Detection predicate `isMaskedFillSplittable(node)` (pure): the node is a card-like
instance/component that `isFillSplittable` rejected **only** because of
`hasMaskOrBoolean`, AND its silhouette-defining child (the `BOOLEAN_OPERATION`)
carries a token-able fill. Conservative — anything else still bakes.

### 2. Scene generator (`scripts/build-section-scene.mjs`)
Emit a new node form for a masked body: extend `rect` with an optional `mask`
field, or add `kind: "masked-rect"`:
`{ kind: "rect", ...box, bg: gradientCss, mask: "<silhouette.svg url>", radius }`.
The gradient comes from the existing `bgFromFills`/`gradientCss`; the mask from the
new manifest entry. Content children recurse as today (coin → `img`, text →
`text`).

### 3. SceneRenderer (`src/components/SceneRenderer/SceneRenderer.tsx`)
When a `rect` node has a `mask`, render the div with
`maskImage`/`WebkitMaskImage: url(<mask>)`, `maskSize: '100% 100%'`,
`maskRepeat: 'no-repeat'` — so the CSS gradient shows through the notched
silhouette. No mask → unchanged.

The IR (`build-ir.mjs`) gets the analogous treatment only if needed for the
agent; the **scene path is what renders**, so the IR change is optional and
deferred unless the plan shows the agent needs it.

## Data flow

card instance → plugin masked fill-split → silhouette mask SVG (asset) + gradient
(structure) + recursed coin/text/badge → generator emits a masked `rect`
(gradient + mask) + child `img`/`text` → SceneRenderer paints a gradient div
clipped by the mask, content on top.

## Validation — the spike (gate)

1. Re-export section 3 with the updated plugin (manual hand-off, as with the
   narrow rule). Expect `stats.maskSplit` ≥ 1 and no whole reward-card PNG for the
   split card(s).
2. Rebuild the scene; confirm the card body is a `rect` with a `mask` + gradient,
   and the coin/text are separate nodes.
3. Render; **diff one reward card** against the ground-truth render. Record ratio.
4. **Recolour check:** change the card body's gradient (or its `@theme` token) and
   confirm the card recolours with the **notches intact** — proving shape and
   colour are now separable.
5. **Decision gate:** acceptable fidelity (notches crisp, gradient faithful,
   content aligned) → ship + roll to all cards. Poor (mask edges aliased, gradient
   angle off, content shifted) → record why and keep cards baked.

## Error handling

- Predicate uncertainty → false → bake the card as today (never worse than
  baseline).
- Mask export fails → fall back to baking that card whole; log it.
- A browser lacking unprefixed `mask-image` → the `-webkit-` prefix covers
  Chromium (the render/verify target); note as a known support caveat.

## Testing

- **Plugin** (`isMaskedFillSplittable`, mask export) — empirical, via the spike +
  `node --check` (sandbox, consistent with existing untested plugin helpers).
- **Generator** — unit-testable: feed a structure fixture with a masked-gradient
  body + a manifest mask entry; assert the emitted scene node carries `mask` +
  `bg` gradient and the content children are separate nodes. New test in
  `scripts/build-section-scene` (or a small fixture under `scripts/__fixtures__`).
- **SceneRenderer** — unit-testable: render a `rect` node with a `mask` and assert
  the element gets `maskImage`/`WebkitMaskImage` set; a `rect` without `mask` is
  unchanged. New case in the SceneRenderer test.

## Risks

- **Mask edge quality.** A `mask-image` SVG scaled to the card box may alias on the
  curved notches; the diff measures it. Mitigation: export the mask at 2× like
  other assets.
- **Gradient compositing.** The body has layered fills (SOLID×3 + GRADIENT);
  `bgFromFills` already composites these to stacked CSS layers — confirm the
  composite reads correctly once the mask is applied (the diff catches it).
- **Silhouette node vs instance.** The gradient + mask live on the inner
  `Subtract`, not the card instance — the predicate and export must target the
  body node, not the wrapper. Pinned down in the plan against the real ids.
- **Scope creep.** Only the reward-card pattern (gradient body + Subtract
  silhouette + content) is in scope; arbitrary masked art is not. The predicate
  stays narrow; widening further is a later decision.
- **Re-export dependency.** Validation needs a manual Figma re-export (the plugin
  is sandbox-only), same hand-off as the narrow spike.
