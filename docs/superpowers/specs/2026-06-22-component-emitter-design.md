# Component Emitter (data-driven RewardCard) — Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Phase:** Structured-output upgrade — the editability payoff (consumes the IR + chrome export)

## Context & motivation

The PM's two questions — *good code structure?* and *easy to customize / integrate?* —
are what this slice answers with a live demo. The pieces are in place:

- `build-ir.mjs` produces `ir.json` (roles: layout/component/content/asset).
- The plugin exports text-less **chrome** backgrounds (`chrome.json`) for instances.
- `SceneRenderer` already renders positioned text with composited colour, strokes,
  fonts, and per-character runs.
- A clean v3 Section 3 export exists (`~/Downloads/figma-export-section3-v3.json`).

This slice generates, from the **recurring reward-card component**, a real React
component + editable data, and renders it **side by side** with the baked v1,
with a **live edit control** that updates the generated grid on screen.

## Goal

A deterministic emitter turns the IR + chrome export into:
- `RewardCard.tsx` — presentational, props-driven (chrome background + overlaid
  editable text rendered with full Figma styling),
- `rewards.ts` — extracted, editable per-card data,
- `RewardGrid.tsx` — maps the data to cards in the captured layout,

and a `Section3Structured` demo screen renders **baked grid │ generated grid +
live edit control**. Editing a value updates the generated grid instantly; the
baked grid stays frozen.

## Non-goals

- Only the **single recurring component with the highest `instanceCount`** (the
  reward card). Not the banner, buttons, or whole-screen synthesis.
- No responsive/auto-layout depth beyond a flex container (P5, later).
- No `onClick`/behavior hooks (P6, later) — the live control lives in the demo
  screen, not in the generated component.
- No new Figma re-export (everything runs on the v3 export + existing IR).

## Architecture & data flow

```
v3 export (structure/ + chrome.json + manifest.json)
  → build-ir.mjs        [ENRICH content.style: full text metadata]      → ir.json
  → emit-component.mjs   [NEW deterministic emitter]
        ├─ rewards.ts      RewardItem[] { id, bakedImage, chromeImage, fields }
        ├─ RewardCard.tsx  chrome <img> + positioned editable text (slots)
        └─ RewardGrid.tsx  rewards.map → RewardCard, in a flex container
  → src/screens/Section3Structured/   baked grid │ generated grid + live edit
```

## Part A — Enrich the IR `content` role (full text metadata)

The chrome-export spec deferred this here: the overlaid text must render
**identically** to the baked text. Today `content.style` is a subset; enrich it
to the full set, reusing/lifting shared helpers into `scripts/lib/figma.mjs`:

`content.style` becomes:
```
{
  fontFamily, fontPostScriptName, fontStyle,   // family/face
  fontWeight, fontSize,
  align,                                        // textAlignHorizontal (lowercased)
  alignVertical,                                // textAlignVertical (lowercased)
  letterSpacing,                                // px (0 if none)
  lineHeight,                                   // px (null if none)
  color,                                        // composited (all fills + opacity)
  stroke,                                       // { color, width } | null
}
content.runs                                    // per-char colour runs | null
```

- Lift `textRuns(node)` and a new `textStyle(node)` into `scripts/lib/figma.mjs`
  (reusing the existing `compositeFills`). `build-ir.mjs` uses them for `content`.
- `build-section-scene.mjs` keeps its current behaviour; where its text logic is
  byte-identical to a lifted helper, import the helper (behavior-preserving,
  guarded by the existing scene tests). Do not change its rendered output.

## Part B — The emitter (`scripts/emit-component.mjs`)

```
node scripts/emit-component.mjs <unpackDir> "<screen id|name>" <outDir>
```

1. Build the IR in-process: `import { buildIR } from "./build-ir.mjs"`, read the
   structure JSON + `chrome.json` + `manifest.json` from `<unpackDir>`, and call
   `buildIR(doc, screen, manifest)`. (No separate `ir.json` file is required —
   one command does export-dir → emitted files.)
2. **Select the component:** among `component`-role nodes, group by
   `component.key`; pick the key with the most instances (require
   `instanceCount ≥ 2`). That is "the card."
3. **Slots (shared layout):** from the FIRST instance, walk its `content`
   children → a slot list: `{ key, box (card-relative), style, runs }`. Box is
   made **card-relative** by subtracting the instance's box origin from the
   content box. Field `key` = sanitized layer name if it's a valid, meaningful
   identifier, else `text<n>` by order (real layers are usually named after their
   default text, so expect mostly positional keys).
4. **Per-card data:** for each instance → `RewardItem`:
   ```
   { id, bakedImage: manifest[id], chromeImage: chrome[id],
     fields: { <key>: <text value>, … } }
   ```
   (Skip instances missing a `chrome[id]` — fall back to baked-only; log them.)
5. **Copy assets:** copy each referenced chrome + baked image into
   `<outDir>/img/` (deduped by filename).
6. **Emit** (deterministic string templates):
   - `rewards.ts` — the `RewardItem` type + `export const rewards: RewardItem[]`.
   - `RewardCard.tsx` — props `{ chrome: string, fields: Record<string,string> }`;
     renders `<div relative w×h>` → `<img src={chrome} fill>` → one
     `<PositionedText>` per slot (slot positions/styles are emitted as a constant
     in the file; values come from `fields[key]`).
   - `RewardGrid.tsx` — props `{ rewards, assetUrl }`; renders the flex container
     (gap/padding from the grid's IR layout) mapping `rewards` →
     `<RewardCard chrome={assetUrl(r.chromeImage)} fields={r.fields} />`.

The emitter's core (select + extract → `{ slots, items }`) is a **pure function**
returning data; codegen is string templates over it — both unit-testable.

## Part C — Shared `<PositionedText>`

Extract the text-node rendering from `SceneRenderer` into
`src/components/PositionedText/PositionedText.tsx` (props: box, `text` or `runs`,
full style — the same fields `content.style` carries). `SceneRenderer` renders
its `text` nodes through it; the generated `RewardCard` uses it for slots. DRY,
and guarded by the existing `SceneRenderer` tests (behavior-preserving extraction).

## Part D — Demo screen `Section3Structured`

- Imports the generated `rewards.ts` / `RewardGrid`; resolves image filenames via
  `import.meta.glob` (same pattern as `MoonFestival`/`Section3`).
- State: `const [data, setData] = useState(rewards)` (editable copy).
- **Two grids, same layout:**
  - Left — *Baked (v1)*: `data.map(r => <img src={assetUrl(r.bakedImage)}>)`.
  - Right — *Generated (editable)*: `<RewardGrid rewards={data} assetUrl={…} />`.
- **Live edit control:** a card selector + field selector + text input; on change,
  update `data[i].fields[key]` immutably → `setData` → the right grid updates, the
  left stays baked.
- New tab in `src/App.tsx` (`点击领取 (structured)`).

## Field naming

`sanitize(layerName)` → a valid JS identifier (ASCII letter/digit/underscore,
not starting with a digit) **and** not equal to its default text; otherwise
`text<n>` by document order. Expect mostly positional in practice. Keys are
stable across cards (same component), so the data array is uniform.

## Testing

- **lib:** unit tests for `textStyle(node)` and `textRuns(node)` (e.g. composite
  colour, a stroke, a two-tone runs case, a single-colour → `runs: null`).
- **build-ir:** extend the fixture test to assert the new `content.style` fields
  + `runs`.
- **emitter:** feed a fixture `ir.json` + chrome map to the emitter's pure core;
  assert the `RewardItem[]` (ids, fields, image paths) and the slot list
  (card-relative boxes, keys). Assert the generated `RewardCard.tsx` string
  contains the slot constant and a `<PositionedText>` per slot.
- **render:** `PositionedText` renders text + style; `RewardCard` renders the
  chrome `<img>` + slots, and changing a `fields` value changes the rendered text.
- **app:** the new tab mounts both grids; the live control updates the generated
  grid (state change reflected) but not the baked images.

## Risks / open

- **Slot positions assume uniform instances.** If some cards genuinely differ in
  text geometry (not just value), slots from the first instance may be slightly
  off for outliers. Acceptable for the reward grid (uniform); note if a card
  looks misaligned.
- **PositionedText extraction** could regress `SceneRenderer`. Mitigated by the
  existing scene tests; the extraction must be behavior-preserving.
- **Editing changes overlay text, not the chrome.** The chrome (icon/background)
  is fixed per card; only text is data-driven — exactly the editability this
  slice proves. Icon-as-data is a future slice.
