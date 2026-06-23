# Fill-split rule (Layer 1) — themeable chrome — Design

**Date:** 2026-06-23
**Status:** Approved (design)
**Phase:** Track 1 — Layer 1 hardening. A narrow, reversible **spike** with a
measurement gate before any widening.

## Context & motivation

The `replicate-screen` calibration (see
`docs/superpowers/notes/2026-06-23-section3-replication-log.md`) showed the agent
could not theme or structure buttons/bars/cards because the **export had already
baked them to pixels**. The 立即领取 button is exported as one PNG
(`Button_1-32314.png`) — an orange gradient pill + a coin icon + text flattened
together — because the plugin's `walk()` renders every `INSTANCE` whole
(`figma-plugin/code.js:262`), and `deepHasImage` forces PNG. Its colour is locked
in pixels; nothing downstream can recolour it.

The fix: when a node's **own** fill is a token-able gradient/solid but it bakes
only because of a **raster child**, stop baking it whole. Recurse instead, so the
gradient becomes a CSS-reconstructable rect and the raster child exports as its
own asset. This is "Layer 1 gates Layer 2b" applied — exposing structure the
agent can then theme.

This spec is a **narrow spike**: split only simple pills/bars, measure fidelity
against the new ground-truth render, then decide separately whether to widen to
reward cards.

## Key discovery (why this is a one-file change)

The scene generator already reconstructs a non-baked container's fill:
- `RECT_BG_TYPES` includes `INSTANCE` and `COMPONENT`
  (`scripts/build-section-scene.mjs:47`).
- `walk()` paints a node's own fill as a CSS `rect` via `bgFromFills` **whenever
  there is no `manifest[n.id]` entry** (`scripts/build-section-scene.mjs:203-217`).

The button's gradient is lost today **only** because the plugin writes a manifest
entry for it (→ `placeAsset`, which stops before the rect path). Remove that one
bake and the generator paints the gradient automatically. Likewise `build-ir`
roles a non-baked instance as `component`-with-children and no `asset.src`.

**Therefore the entire change is in the plugin's `walk()`. The generator and IR
need zero edits.** (This is asserted as a precondition and verified empirically in
the spike, not modified.)

## Goal

A narrow fill-split rule in the Figma export plugin so that simple gradient/solid
"chrome" instances (buttons, the progress bar) export as a CSS-reconstructable
background + separate raster children + text, instead of one baked PNG — making
their colour themeable and their structure visible to the agent. Validated by a
fidelity diff against the ground-truth render.

## Non-goals

- **Reward cards** (gradient bg + coin-icon group behind a `Subtract`/mask
  silhouette) — explicitly deferred. The mask/boolean guard excludes them. Whether
  to widen is a post-spike decision driven by the measured button fidelity.
- **Generator / IR changes** — none. The downstream already handles recursed
  instances (see Key discovery). If the spike disproves this, that is a finding to
  escalate, not a change to bundle here.
- **Token mapping** — the rule exposes the gradient as CSS (`linear-gradient(...)`
  with literal colours); mapping those colours to `@theme` tokens is the agent's
  job in Layer 2b, not the plugin's.
- **Recovering baked effects** — a drop shadow/blur flattened into the PNG is lost
  when we stop baking. Accepted; the diff measures impact.

## The rule

### Trigger — `isFillSplittable(node)` (pure, in `figma-plugin/code.js`)

Returns true only when **every** condition holds; otherwise the node bakes as
today (safety over coverage):

1. `node.type === "INSTANCE" || node.type === "COMPONENT"` — the cases `walk()`
   currently bakes whole.
2. **Own fill is token-able:** `node.fills` is an array, has ≥1 visible paint, and
   **every** visible paint is `SOLID` or starts with `GRADIENT` (no `IMAGE` paint
   on the node itself).
3. **Has a raster descendant:** `deepHasImage(node)` is true — this is *why* it
   bakes, and the chrome we want to free.
4. **Not a grid panel:** `!isGridPanel(node)` (tables keep their existing whole
   bake).
5. **Simple silhouette (the narrowing guard):** no direct child has `isMask` true
   and no direct child is a `BOOLEAN_OPERATION`. This excludes reward cards (whose
   outline is a `Subtract`) and other masked shapes.

Helpers (also pure): `ownFillTokenable(node)` for (2), `hasMaskOrBoolean(node)`
for (5). `deepHasImage` and `isGridPanel` already exist in the file.

### Behavior — recurse instead of bake

In `walk()`, before the existing `COMPONENT` (`:258`) and `INSTANCE` (`:262`)
branches, add:

```
if ((node.type === "INSTANCE" || node.type === "COMPONENT") && isFillSplittable(node)) {
  stats.split = (stats.split || 0) + 1;
  if ("children" in node) for (const c of node.children) await walk(c, files);
  return; // decomposed: bg → rect downstream, raster kids → their own assets, text → text
}
```

The split node is **not** written to `manifest` and gets **no** `exportChrome`
(no whole bake to strip text from). Its children flow through the normal `walk()`
classification: the coin icon (an `INSTANCE` or image-fill node) is emitted as its
own asset; text nodes are left for the generator/IR.

`stats.split` is reported in `export-stats.json` so the bundle shows how many
nodes were decomposed.

## Data flow

`walk()` reaches a qualifying button → recurses (no manifest entry) → its coin
child → `emitWhole` (own asset + manifest entry) → its text child → untouched.
Downstream: `build-section-scene` sees no manifest entry for the button, so it
paints the button's gradient as a `rect` (radius from `cornerRadius`) and recurses
to place the coin asset + text; `build-ir` roles the button `component` with
children and no `asset.src`.

## Validation — the spike (this is the deliverable's gate)

1. Re-export section 3 from Figma with the updated plugin. The bundle now also
   contains `render/<screen>.png` (the Task 1 ground-truth render) and a non-zero
   `stats.split`.
2. Rebuild the scene: `node scripts/build-section-scene.mjs <exportDir> "<screen>"
   <assetsOut> <sceneOut>`.
3. Render the screen and screenshot the **button region**; diff it against the
   same region of `render/<screen>.png` using `scripts/verify-screen.mjs` /
   `diffPngs`. Record the ratio.
4. Confirm **recolour** works: change the relevant `@theme` token (or the rect's
   gradient) and verify the button recolours live (proving colour is now data, not
   pixels).
5. **Decision gate:** if button/bar fidelity is acceptable (low diff, no obvious
   breakage), recommend widening to cards (drop the mask guard, handle the
   `Subtract` silhouette) as a follow-up spec. If fidelity is poor (gradient angle,
   lost shadow, shifted icon), keep the rule off for that shape and record why.

The spike's output is a short findings note appended to the calibration log or a
new `docs/superpowers/notes/2026-06-23-fill-split-spike.md`: the diff ratio, a
before/after of the button, and the widen/hold decision.

## Error handling

- **Predicate uncertainty** → return false → bake as today. The rule never makes
  a node *worse* than the current baseline; the worst case is "no change."
- **Recursion exports nothing useful** (e.g. the gradient is actually on a child,
  not the instance) → still safe: the child rect gets painted by the generator; if
  truly empty, the node simply contributes a bg rect with no children — visible in
  the diff, not a crash.
- **A split node throws mid-recurse** → the existing `walk()` `try/catch`
  (`figma-plugin/code.js:287`) records the failure identifiably, same as today.

## Testing

The plugin runs in the Figma sandbox and has **no Node test harness** (its
existing helpers `isGridPanel`, `partialStroke`, `deepHasImage` are likewise
validated empirically, not unit-tested). Consistent with that:

- `isFillSplittable` and its helpers are written as small pure functions and
  verified by `node --check figma-plugin/code.js` (syntax) plus the empirical
  spike (steps 1-4 above), using the ground-truth render as the objective gate.
- No generator/IR tests change, because no generator/IR code changes. If the spike
  reveals the generator mis-paints a recursed instance, that becomes a *new*,
  separately-specced Layer-1 task with its own unit tests in
  `scripts/build-section-scene` — out of scope here.

## Risks

- **Gradient angle approximation.** `gradientCss` derives the angle from Figma
  handle positions; a rotated/!90° gradient may render slightly off. The diff
  measures it; if material, the node holds (bakes).
- **Lost effects.** Shadows/blurs baked into the PNG vanish. Measured by the diff;
  if a button depends on a shadow, that shape can be excluded (it would need the
  effect reconstructed as CSS — a separate concern).
- **Icon positioning.** If the button used auto-layout, the recursed coin's
  absolute box should still be correct (the export carries absolute geometry), but
  the spike confirms it visually.
- **Over-narrow.** The mask/boolean guard may exclude a borderline-simple shape
  that would have split fine. Acceptable for a spike — widening is the explicit
  next decision, informed by data.
