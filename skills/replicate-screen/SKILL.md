---
name: replicate-screen
description: Use when replicating a finished Figma screen into React for THIS repo. Drives an agent to reconstruct the screen from a plugin export (role-tagged IR + assets), reusing the existing component library + design tokens, creating and registering new components where none fit, baking only genuine art, and verifying against a ground-truth render.
---

# replicate-screen

Reconstruct one Figma screen as React by **reasoning over the IR**, not by a
fixed emitter. Reuse first, create-and-register second, bake art last. Prove the
result against the ground-truth render.

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

Choose exactly one disposition per region and record a one-line justification in
the synthesis log:

- **REUSE** — the Figma name/structure matches a row in `docs/components.map.md`.
  Emit `<Component …>` with data/props extracted from the IR (text → props,
  repeated children → a typed data array). Justify with the matched row.
- **CREATE + REGISTER** — no match but it is structured UI (text, layout,
  token-able fill, a repeated pattern). Build a new component under
  `src/components/<Name>/` (one folder, `<Name>.tsx`, co-located `<Name>.test.tsx`
  asserting via `data-variant`, props-in/JSX-out, `@theme` tokens not hex), then
  append a row to `docs/components.map.md`. Justify why nothing fit.
- **BAKE** — `asset`-role genuine art (mascot, decorative vectors), no text, no
  token-able fill. Emit `<img src=…>` from the manifest. Justify as art.

Tie-breakers: REUSE > CREATE > BAKE; prefer CREATE over BAKE whenever the region
carries text or a token-able fill.

## 2b. Integration-ready seams (every run, screen-agnostic)

- Content regions expose a **typed data interface** (props in).
- Interactive regions (`interactive` role) expose **typed event-callback props**
  (`onClaim?(id)`, `onClick?()`, controlled `active` + `onChange`). Wire NOTHING.
  A REUSE inherits the component's existing callbacks; a CREATE must add them.

The skill guarantees seams, never behavior — no handlers, state, or data sources
in the library components.

## 3. Assemble

Compose the screen component from the dispositions, positioned per the IR layout,
inside a `[data-testid="scene-root"]` wrapper at the screen's natural size (the
verify loop screenshots this element). `@theme` tokens only; a missing token is
added to `@theme` first — never inline hex/spacing.

## 4. Verify

Render the screen in the app, then:

`node scripts/verify-screen.mjs <url> <exportDir>/render/<screen>.png <outDir>`

Read the printed `ratio` and inspect `<outDir>/diff.png`. Also eyeball actual vs
reference and list discrepancies (wrong colour, mis-position, missing region,
overflow). Fix the largest, re-run. Stop when `ratio <= 0.05` or after a fixed
iteration cap; report residual diffs honestly — never claim 1:1 against a worse
ratio.

## 5. Mock interaction (demo wrapper only)

Outside the library components, the screen's demo wrapper wires exactly ONE
interaction to a mock handler to prove the seam — e.g. clicking 立即领取 calls
`onClaim`, which a local `useState` marks claimed / advances progress. Clearly
mock (comment + local-only state, no network). Real integration = swap this one
handler for a `fetch`.

## 6. Output

Deliver: the screen component, any new `src/components/*`, the updated
`docs/components.map.md`, the one mock-wired demo interaction, and the synthesis
log (per-region disposition + justification + final `ratio`). The log's
reuse-vs-create-vs-bake counts are the research result.

## Failure handling

- Missing prerequisite → stop, name what's missing and how to produce it.
- No confident disposition → BAKE and log it as a GAP (never silently omit).
- Diff won't converge within the cap → stop, report residual ratio + the regions
  still off.
