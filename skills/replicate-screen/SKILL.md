---
name: replicate-screen
description: Use when replicating a finished Figma screen into React for THIS repo. Drives an agent to reconstruct the screen from a plugin export (role-tagged IR + assets) as a baked fidelity base with structured overlays promoted on top — reusing the existing component library + design tokens, creating and registering new components where none fit, keeping the rest baked, and verifying against a ground-truth render.
---

# replicate-screen

Reconstruct one Figma screen as React by **reasoning over the IR**, not by a
fixed emitter. **Start from the baked scene as a fidelity base, then promote
regions to structured, interactive overlays where you are confident.** Reuse
first, create-and-register second, keep-baked otherwise — never omit. Prove the
result against the ground-truth render.

> **Why a baked base (the calibration lesson).** The first calibration composed
> *pure components in a flow layout* and dropped ~48 decorative/background
> elements — the screen came out a bare skeleton. The baked scene is the floor:
> render the whole screen faithfully first, then overlay structure where it adds
> value. Fidelity is never traded for structure; structure is added on top.
> `src/screens/Section3Structured` is the reference pattern — a baked
> `<SceneRenderer>` base with an editable component overlaid at its region box.

**Announce at start:** "Using replicate-screen to reconstruct <screen>."

## Prerequisites (stop with a precise message if any is missing)

- An export dir with: `structure/<screen>.json` (run `node scripts/build-ir.mjs`
  to get the role-tagged IR), `manifest.json`, `chrome.json`, and
  `render/<screen>.png` (the ground-truth render; if absent, screenshot the
  baked scene as an interim reference and say so in the log).
- `docs/components.map.md` (the reuse catalog) and `src/index.css` `@theme`.
- The Vite app + `npx playwright` for the verify loop.

## 1. Inventory

Build the IR (`node scripts/build-ir.mjs <exportDir> "<screen>"`) and read it —
the IR is already compact and LLM-readable. List the screen's regions with their
`role` (component | content | layout | interactive | asset), Figma name, and box.
This is your work list.

## 2. Decide per region — confidence ladder

The baked scene already renders **every** region faithfully (see §3). So this
step decides only which regions to **promote** to a structured overlay on top of
that base. Choose one disposition per region and record a one-line justification
in the synthesis log:

- **REUSE** — the Figma name/structure matches a row in `docs/components.map.md`.
  Overlay `<Component …>` with data/props extracted from the IR (text → props,
  repeated children → a typed data array), positioned at the region's box. Justify
  with the matched row.
- **CREATE + REGISTER** — no match but it is structured UI (text, layout,
  token-able fill, a repeated pattern) worth promoting. Build a new component under
  `src/components/<Name>/` (one folder, `<Name>.tsx`, co-located `<Name>.test.tsx`
  asserting via `data-variant`, props-in/JSX-out, `@theme` tokens not hex), then
  append a row to `docs/components.map.md`. Justify why nothing fit.
- **KEEP BAKED** — genuine art, decorative chrome, or anything you are not
  confident you can structure faithfully. Do **nothing** — it stays visible in the
  baked base. This is the default. Never emit an `<img>` to re-bake it (the base
  already shows it) and **never omit it**.

Tie-breakers: REUSE > CREATE > KEEP BAKED. Promote a region only when the overlay
adds real value — editable data, an interaction seam, or a themeable token. When
in doubt, KEEP BAKED: the base is already faithful, so a skipped promotion costs
nothing, while a bad overlay costs fidelity.

## 2b. Integration-ready seams (every run, screen-agnostic)

- Content regions expose a **typed data interface** (props in).
- Interactive regions (`interactive` role) expose **typed event-callback props**
  (`onClaim?(id)`, `onClick?()`, controlled `active` + `onChange`). Wire NOTHING.
  A REUSE inherits the component's existing callbacks; a CREATE must add them.

The skill guarantees seams, never behavior — no handlers, state, or data sources
in the library components.

## 3. Assemble

Build a `[data-testid="scene-root"]` wrapper that is `position: relative` and
sized to the screen's natural box (e.g. 390×H). Then, in two layers:

1. **Baked base (z-0, fidelity floor).** Render the whole screen faithfully —
   either `<SceneRenderer>` over the scene JSON from
   `node scripts/build-section-scene.mjs <exportDir> "<screen>" <assetsOut> <sceneOut>`,
   or the `render/<screen>.png` as a single `<img>`. This guarantees the screen is
   visually complete before any structure is added. Model on
   `src/screens/Section3Structured/Section3Structured.tsx`.
2. **Promoted overlays (z-10).** Place each REUSE/CREATE component
   absolutely (`position: absolute; left/top` = its IR region box) over its baked
   counterpart, which it covers. `@theme` tokens only; a missing token is added to
   `@theme` first — never inline hex/spacing.

Because the base is the full baked scene, nothing is ever missing; overlays add
structure, editability, and interaction without subtracting fidelity.

## 4. Verify

Render the screen in the app, then:

`node scripts/verify-screen.mjs <url> <exportDir>/render/<screen>.png <outDir>`

Read the printed `ratio` and inspect `<outDir>/diff.png`. With a baked base the
screen is complete by construction, so a high diff means an **overlay is
mis-positioned or mis-coloured**, not that a region is missing — fix the overlay's
box/colour. Also eyeball actual vs reference for any overlay that fails to cover
its baked counterpart. Fix the largest, re-run. Stop when `ratio <= 0.05` or after
a fixed iteration cap; report residual diffs honestly — never claim 1:1 against a
worse ratio.

**Fidelity discipline — adapt cautiously.** Before "fixing" anything that *looks*
off, decide whether it is a real reconstruction bug or a **faithful reproduction
of the design**. Check the IR/structure: a decoration overlapping text, an element
layered over another, or a slightly-off position may be exactly how Figma draws it
(e.g. an accent deliberately layered above a heading). **Never deviate from the
design to make it look "nicer"** — that lowers fidelity, it doesn't raise it. Two
common non-bugs to recognise and *log* rather than patch:
- **Font substitution.** Proprietary display fonts are usually unavailable, so
  text renders in a fallback at a different width/position; fixed-coordinate
  decorations can then read as colliding with text. This is a known limitation
  (`docs/research-tracks.md`), not a paint-order bug — do not reorder paint to
  hide it.
- **Faithful overlaps / z-order.** If a sibling is layered over text *in the
  design*, reproducing that is correct.

Only fix genuine logic errors: a gradient that's wrong, a position that disagrees
with the IR box, a missing region, an overlay that doesn't cover its baked
counterpart. Record faithful-but-imperfect cosmetics (font, etc.) as known
artifacts in the synthesis log.

## 5. Mock interaction (demo wrapper only)

Outside the library components, the screen's demo wrapper wires exactly ONE
interaction to a mock handler to prove the seam — e.g. clicking 立即领取 calls
`onClaim`, which a local `useState` marks claimed / advances progress. Clearly
mock (comment + local-only state, no network). Real integration = swap this one
handler for a `fetch`.

## 6. Output

Deliver: the screen component (baked base + promoted overlays), any new
`src/components/*`, the updated `docs/components.map.md`, the one mock-wired demo
interaction, and the synthesis log (per-region disposition + justification + final
`ratio`). The log's reuse-vs-create-vs-keep-baked counts are the research result —
they measure how much of the screen got promoted to structure this run.

## Failure handling

- Missing prerequisite → stop, name what's missing and how to produce it.
- No confident disposition → KEEP BAKED (the base renders it faithfully) and log
  it as a gap to promote later. NEVER omit — omitting drops fidelity the base
  already provides.
- Diff won't converge within the cap → stop, report residual ratio + the overlays
  still off.
