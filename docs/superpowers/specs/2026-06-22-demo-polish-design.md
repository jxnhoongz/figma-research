# Demo Polish (PM-ready Section3Structured) — Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Phase:** Structured-output upgrade — polish the editability demo for showing the PM

## Context & motivation

The component emitter + `Section3Structured` demo works (editing data updates the
generated grid live). But for showing the PM it has rough edges found in review +
the screenshot:

1. **Grids don't line up.** Baked `<img>` renders at the PNG's intrinsic 2× size
   (~160px, 2 columns) while generated cards are 80px (4 columns) — so the
   side-by-side doesn't read as "the same design."
2. **Emitter residue.** Emitted slot `style` includes `alignVertical`,
   `fontPostScriptName`, `fontStyle` that `PositionedText` never consumes.
3. **Cryptic field names.** `rewards.ts` reads `{ text1, text2, … }` — weak for
   the "good code structure" story.
4. **Grid-detection last-wins.** The emitter's grid-layout lookup keeps the last
   matching layout node, not the first.

This slice fixes all four — small changes to `scripts/emit-component.mjs`, the
generated `RewardGrid` template, and `Section3Structured.tsx`.

## Goal

A clean, matched side-by-side: two identical 4-column grids of the real Figma
layout, the only visible difference being that the generated (right) grid updates
when you edit a field; and generated code (`rewards.ts`, `RewardCard.tsx`) that
reads cleanly.

## Non-goals

- No new Figma re-export (re-runs the emitter on the existing v3 export).
- No responsive/auto-layout depth (P5), no behavior hooks (P6).
- No change to the IR builder, chrome export, or other screens.

## Fix 1 — Matched grids

- **Constrain baked images** to the card's Figma size: render
  `<img style={{ width: CARD_W, height: CARD_H }}>` (CARD_W/CARD_H are already
  exported from the generated `RewardCard`).
- **Share the grid container.** The emitter's `genRewardGridTsx` exports the
  layout constants `GRID_GAP`, `GRID_PADDING`, `GRID_WIDTH`. `Section3Structured`
  renders the **baked** grid with the same `display:flex; flexWrap:wrap; gap;
  padding; width` so columns/spacing match the generated `<RewardGrid>` exactly.
- **Uniform zoom for visibility.** Wrap each grid (or the comparison row) in a
  container with `zoom: 1.4` applied **equally** to both, so the cards are
  comfortably sized without the two sides diverging. (`zoom` is widely supported
  in the Chromium/WebKit browsers this demo runs in; it reflows, so no manual
  space reservation is needed.)

## Fix 2 — Trim emitted slot style

In `extractComponent`, each slot's `style` is reduced to exactly the fields
`PositionedText` consumes: `fontFamily, fontSize, fontWeight, color, align,
lineHeight, letterSpacing, stroke`. `alignVertical`, `fontPostScriptName`, and
`fontStyle` are dropped from the slot (the IR keeps them; the emitter just
doesn't forward them). The generated `RewardCard`'s `SLOTS` constant is then
exactly what's used.

## Fix 3 — Readable field names

Extend `fieldKey(name, text, i, used)` with a value heuristic and de-duplication.
Resolution order:

1. The layer name, if it's a valid JS identifier (incl. `$`) AND ≠ its text.
2. Else a value heuristic `valueKey(text)`:
   - all digits / commas → `amount`
   - `¥` / `￥` / `$` → `currency`
   - matches `投注|累计|充值|达到` or ends with `万+`/`元+`/`万`/`元` → `requirement`
   - else `null`.
3. Else positional `text<i+1>`.

De-duplicate within a card by suffixing (`amount`, `amount2`, …).

**Key alignment:** compute the keys ONCE from the first instance's `content`
order; every item's `fields` are keyed by **slot index → slot.key** (not
recomputed per item), so `rewards.ts` keys are uniform across all cards and always
match the `SLOTS` of `RewardCard`.

## Fix 4 — Grid detection first-match

The grid-layout lookup stops at the **first** `layout` node that directly holds
`component` children (a `found` flag), instead of letting later siblings
overwrite it.

## Testing

- **Emitter unit tests** (extend `scripts/emit-component.test.mjs`):
  - `fieldKey` value heuristic: `"28"→amount`, `"¥"→currency`, `"5万+"→requirement`,
    a generic CJK label → positional; de-dup gives `amount2`.
  - Slot `style` no longer contains `alignVertical`/`fontPostScriptName`/`fontStyle`.
  - `genRewardGridTsx` output exports `GRID_GAP`/`GRID_PADDING`/`GRID_WIDTH`.
  - Item `fields` keys equal the `slots` keys (alignment), uniform across items.
- **Regenerate** Section 3's files by re-running the emitter on the v3 export.
- **Demo screen test:** the baked grid and generated grid render the same number
  of cards; the live edit still updates the generated grid (existing test holds).
- **Visual validation:** screenshot the matched side-by-side; confirm both grids
  line up (same size, same columns) and an edit updates only the generated side.

## Risks

- **Field heuristic is best-effort.** A value that fits no pattern (a CJK label
  like `投注`) falls back to positional — acceptable; the common `amount` /
  `requirement` / `currency` cases read well.
- **`zoom`** is non-standard CSS; fine for this in-browser demo, not for
  cross-engine production. Documented.
