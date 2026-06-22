# Full-Screen Demo + Inspector (structured slots, overlap fix) — Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Phase:** Structured-output upgrade — the editable component shown inside the real screen, with a control panel

## Context & motivation

The current `Section3Structured` demo shows the reward grid as an isolated
fragment in a side-by-side, and long values overlap (`1888¥`) because the emitter
flattens each card's text into fixed-position slots taken from the first card
(`28`). The envisioned demo is: the **whole 点击领取 screen** with the reward grid
**editable in its real position**, plus a **control panel (inspector)** to adjust
each component's text **and** position live.

This slice: (A) the emitter emits a structured **slot tree** that preserves Figma
auto-layout (so the amount row grows and never overlaps) and a `gridBox`;
(B) `RewardCard` renders that tree + accepts position overrides; (C) a full-screen
demo overlays the editable grid on the baked screen, with an inspector.

## Goal

A demo screen showing the full baked 点击领取 screen with the reward grid as a
live, editable, overlap-free component, and an inspector to edit each card's text
and nudge slot positions.

## Non-goals

- No new Figma re-export (uses the v3 export + existing Section 3 scene).
- Not a general full-screen structured emitter — only the reward grid is
  structured/editable; the rest of the screen is the baked scene.
- No per-card independent positioning — position overrides are **component-level**
  (a slot moves on all cards). Per-card overrides are a future option.

## Part A — Emitter: structured slot tree + gridBox

`extractComponent` returns the existing fields plus a structured `slots` tree and
`gridBox`:

```
Slot =
  | { kind:'text',  key, x, y, w, h, style }            // absolute text
  | { kind:'group', key, x, y, direction, gap, children: Slot[] }  // flex container

extractComponent(...) -> { key, card:{w,h}, grid, gridBox:{x,y,w,h}, slots:Slot[], items }
```

**Walk** the first instance's subtree (preserving structure, not flattening):
- `content` (TEXT) node → a `text` slot: `{ kind:'text', key, x, y, w, h, style }`,
  box made **card-relative** (subtract the card instance box origin), `style` via
  the existing trimmed `pickStyle`, `key` via the existing `fieldKey`.
- `layout` node with `layout.mode === 'flex'` (Figma auto-layout) → a `group`
  slot: `{ kind:'group', key, x, y, direction, gap, children:[…] }`, position
  card-relative, `direction`/`gap` from the IR layout; recurse its children into
  `children`. Group children are `text` slots (rendered inline by flex — see Part
  B — so their absolute x/y is unused but harmless).
- `layout` node without flex → passthrough (recurse; its children become slots at
  the current level).
- nested `asset`/`component` → skip (the chrome image covers them).

**Keys:** every slot (text AND group) gets a `key` (group key = its layer name
sanitized, or `group<n>`). Field keys for `items` are collected from all `text`
slots in tree order (so per-card `fields` are unchanged in spirit, just gathered
from the tree).

**`gridBox`** = the grid layout node's box (already screen-relative in the IR) —
the position to overlay the editable grid on the baked screen. Output it from the
existing first-match grid lookup.

This fixes the overlap: amount + `¥` live in a `group` (flex row) that grows with
the number, so they never collide regardless of digit count.

## Part B — RewardCard renders the slot tree + position overrides

The generated `RewardCard` walks `SLOTS`:
- `text` slot → `<PositionedText>` (absolute), as today.
- `group` slot → an absolutely-positioned `flex` `<div>` (`left/top` from the
  slot, `flexDirection` from `direction`, `gap`) whose children are styled
  `<span>`s (auto width, so they grow) using the child slot's font/color/stroke.

`RewardCard` accepts `slotOverrides?: Record<string, { x?: number; y?: number }>`.
For each slot, the rendered `left/top` is the slot's base position plus the
override for that slot's `key` (if any). This lets the inspector nudge any slot
(or the whole amount group) live, for all cards.

The shared text styling (font stack, color, `-webkit-text-stroke`) used by both
`PositionedText` and the group `<span>`s is factored into a small `textStyleCss`
helper so the two render paths stay consistent.

## Part C — Full-screen demo + inspector

The current `Section3Structured` body (the baked-vs-generated side-by-side and
its `baked-grid`/`generated-grid` test) is **replaced** by this full-screen +
inspector view, keeping the same `点击领取 (structured)` tab. The new screen
component:
- **Baked screen:** render the full Section 3 scene via `SceneRenderer`
  (`src/screens/Section3/scenes/theme1.json` + its assets) at 390×H.
- **Editable grid overlay:** absolutely position `<RewardGrid>` at `gridBox`
  (`left: gridBox.x, top: gridBox.y`) over the baked screen; the chrome card
  backgrounds cover the baked reward cards.
- **Inspector panel** beside the screen:
  - a **card selector**; for the selected card, a **text input per field**.
  - **position controls**: per slot `key`, an `x` and `y` number input that writes
    to `slotOverrides` (component-level), updating all cards live.
  - State: `items` (per-card text) + `slotOverrides` (shared positions). Edits are
    immutable.

## Testing

- **Emitter:** the structured walk produces a `group` slot (flex, with two `text`
  children) for the auto-layout amount row, plus top-level `text` slots; `gridBox`
  is the grid's screen-relative box; field keys gathered from the tree.
- **RewardCard render:** a `group` slot renders as a `flex` div whose children are
  spans (a long value like `8888` does not overflow a fixed width — the row grows);
  a `slotOverrides[key] = {x:10}` shifts that slot's `left` by 10.
- **Demo:** the baked scene renders (one `[data-testid="scene"]`); the editable
  grid is overlaid; editing a field updates the overlaid card; a position input
  updates the slot's offset.

## Risks

- **Overlay coverage.** If a chrome card background isn't fully opaque, a baked
  card could peek behind the editable one. Mitigation: validate by screenshot; if
  it peeks, draw an opaque rect (panel background colour) over `gridBox` beneath
  the editable grid.
- **gridBox alignment.** The overlay assumes the editable grid's internal layout
  matches the baked grid's position. Validate by screenshot; the grid container
  (`GRID_*`) + `gridBox` should line up, but a small offset may need tuning.
- **Group-child styling** is via `<span>` (not `PositionedText`), so single-line
  slack / multi-line handling differs slightly; acceptable for short inline values
  (amount + currency).
