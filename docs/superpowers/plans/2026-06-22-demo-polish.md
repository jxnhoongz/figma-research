# Demo Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Section3Structured demo PM-ready — matched side-by-side grids, readable field names, trimmed emitter output.

**Architecture:** Extend the emitter (`scripts/emit-component.mjs`) with a value-based field-name heuristic, slot-index key alignment, a trimmed slot style, grid-layout first-match, and `GRID_*` exports. Regenerate Section 3's files and update `Section3Structured.tsx` so the baked grid is constrained to the card size and shares the generated grid's container (with a uniform `zoom`).

**Tech Stack:** Node ESM scripts, React 19 + Vitest.

## Global Constraints

- The slot-name heuristic resolution order: valid JS-identifier layer name (incl. `$`) ≠ its text → that; else `valueKey(text)`; else `text<i+1>`; de-duped per card (`amount`, `amount2`, …).
- `valueKey`: `¥/￥/$` → `currency`; pure digits/commas → `amount`; a number followed by `万`/`元` (optional `+`) → `requirement`; else `null`.
- Item `fields` are keyed by **slot index → slot.key** (computed once from the first instance) so keys are uniform across cards and match `RewardCard`'s `SLOTS`.
- Emitted slot `style` carries ONLY: `fontFamily, fontSize, fontWeight, color, align, lineHeight, letterSpacing, stroke`.
- Both grids render identical: card size `CARD_W×CARD_H`, container `gap=GRID_GAP padding=GRID_PADDING width=GRID_WIDTH`, with a uniform `zoom` on the comparison row.
- No automated test for the plugin (unchanged here); the emitter + screen ARE unit/render-tested. Visual match is validated by screenshot after merge.

---

## File Structure

- Modify `scripts/emit-component.mjs` — `valueKey` (new, exported), `fieldKey` (heuristic + dedup, exported), `extractComponent` (slot-index keying + `pickStyle` trim + grid first-match), `genRewardGridTsx` (export `GRID_*`).
- Modify `scripts/emit-component.test.mjs` — heuristic + trim + grid-export assertions.
- Regenerate `src/screens/Section3Structured/generated/{rewards.ts,RewardCard.tsx,RewardGrid.tsx}` (run the emitter).
- Modify `src/screens/Section3Structured/Section3Structured.tsx` — matched baked grid + zoom.

---

## Task 1: Emitter — field names, trimmed style, grid exports

**Files:**
- Modify: `scripts/emit-component.mjs`
- Modify: `scripts/emit-component.test.mjs`

**Interfaces:**
- Produces (newly exported): `valueKey(text) -> 'amount'|'currency'|'requirement'|null`, `fieldKey(name, text, i, used) -> string`.
- `extractComponent` return shape unchanged, but slots carry a trimmed `style` and item `fields` are slot-index-keyed; `model.grid` is first-match.
- `genRewardGridTsx(model)` output now exports `GRID_GAP`, `GRID_PADDING`, `GRID_WIDTH`.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/emit-component.test.mjs` (extend the import to include `valueKey, fieldKey`):

```js
import { valueKey, fieldKey } from './emit-component.mjs'

describe('field naming', () => {
  it('valueKey classifies common reward values', () => {
    expect(valueKey('28')).toBe('amount')
    expect(valueKey('1,000')).toBe('amount')
    expect(valueKey('¥')).toBe('currency')
    expect(valueKey('5万+')).toBe('requirement')
    expect(valueKey('1000元+')).toBe('requirement')
    expect(valueKey('投注')).toBeNull() // generic label → no value class
  })

  it('fieldKey prefers a valid layer name, falls back to value, then positional, de-duped', () => {
    const used = new Set()
    expect(fieldKey('label', '投注', 0, used)).toBe('label') // valid name ≠ text
    expect(fieldKey('5万+', '5万+', 1, used)).toBe('requirement') // name == text → value
    expect(fieldKey('', '28', 2, used)).toBe('amount')
    expect(fieldKey('', '188', 3, used)).toBe('amount2') // de-dup
    expect(fieldKey('', '投注', 4, used)).toBe('text5') // no class → positional
  })
})

describe('slot style is trimmed to PositionedText props', () => {
  it('drops alignVertical / fontPostScriptName / fontStyle from slots', () => {
    const s = model.slots[0].style
    expect(s).toHaveProperty('fontFamily')
    expect(s).toHaveProperty('color')
    expect(s).not.toHaveProperty('alignVertical')
    expect(s).not.toHaveProperty('fontPostScriptName')
    expect(s).not.toHaveProperty('fontStyle')
  })
})

describe('RewardGrid exports layout constants', () => {
  it('emits GRID_GAP / GRID_PADDING / GRID_WIDTH', () => {
    const out = genRewardGridTsx(model)
    expect(out).toContain('export const GRID_GAP')
    expect(out).toContain('export const GRID_PADDING')
    expect(out).toContain('export const GRID_WIDTH')
  })
})
```

(The existing `extractComponent` test still expects `model.slots[0].key === 'amount'` — the fixture layer is named `amount`, a valid identifier ≠ its text `28¥`, so that path is unchanged.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: FAIL — `valueKey`/`fieldKey` not exported; slot still has `alignVertical`; no `GRID_*`.

- [ ] **Step 3: Implement the emitter changes**

In `scripts/emit-component.mjs`:

(a) Replace the `fieldKey` function with:

```js
// Classify a text value into a semantic field name, or null if it fits no class.
export function valueKey(text) {
  const t = (text || "").trim();
  if (/^[¥￥$]$/.test(t)) return "currency";
  if (/^\d[\d,]*$/.test(t)) return "amount";
  if (/\d\s*[万元][+＋]?$/.test(t)) return "requirement";
  return null;
}

// Field key for a content node: a valid-identifier layer name (≠ its text), else
// a value-based name, else positional — de-duped within the card via `used`.
export function fieldKey(name, text, i, used) {
  const s = (name || "").trim();
  const valid = /^[A-Za-z$_][A-Za-z0-9$_]*$/.test(s);
  const base = (valid && s !== text && s) || valueKey(text) || "text" + (i + 1);
  let key = base;
  let n = 2;
  while (used && used.has(key)) key = base + n++;
  if (used) used.add(key);
  return key;
}

// Keep only the style fields PositionedText consumes (drop alignVertical /
// fontPostScriptName / fontStyle residue from the IR).
function pickStyle(s) {
  return {
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: s.color,
    align: s.align,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    stroke: s.stroke,
  };
}
```

(b) In `extractComponent`, replace the `slots` + `items` + `grid` blocks with:

```js
  const first = instances[0];
  const used = new Set();
  const firstContent = collect(first, "content");
  const slots = firstContent.map((c, i) => ({
    key: fieldKey(c.name, c.content.text, i, used),
    x: c.box.x - first.box.x,
    y: c.box.y - first.box.y,
    w: c.box.w,
    h: c.box.h,
    style: pickStyle(c.content.style),
  }));

  const items = instances.map((inst) => {
    const cs = collect(inst, "content");
    const fields = {};
    slots.forEach((s, i) => {
      fields[s.key] = cs[i] ? cs[i].content.text : "";
    });
    return {
      id: inst.id,
      bakedImage: flat(manifest[inst.id]) || null,
      chromeImage: flat(chrome[inst.id]) || null,
      fields,
    };
  });

  // Grid layout = the FIRST layout node that directly holds component children.
  let grid = { gap: 0, padding: 0, width: null };
  let foundGrid = false;
  (function w(n) {
    if (foundGrid) return;
    if (n.role === "layout" && (n.children || []).some((c) => c.role === "component")) {
      grid = { gap: n.layout?.gap || 0, padding: n.layout?.padding?.left || 0, width: n.box.w };
      foundGrid = true;
      return;
    }
    (n.children || []).forEach(w);
  })(ir.root);
```

(c) In `genRewardGridTsx`, add the constant exports above the component. Replace the function's returned template's header lines:

```js
import { RewardCard } from './RewardCard'
import type { RewardItem } from './rewards'

export function RewardGrid({
```

with:

```js
import { RewardCard } from './RewardCard'
import type { RewardItem } from './rewards'

export const GRID_GAP = ${model.grid.gap}
export const GRID_PADDING = ${model.grid.padding}
export const GRID_WIDTH = ${model.grid.width ?? "undefined"}

export function RewardGrid({
```

and update the grid `<div>` style in that template to use the constants:

```jsx
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: GRID_GAP, padding: GRID_PADDING, width: GRID_WIDTH }}>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: PASS. `node --check scripts/emit-component.mjs` clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/emit-component.mjs scripts/emit-component.test.mjs
git commit -m "feat: emitter — semantic field names, trimmed slot style, grid constants"
```

---

## Task 2: Regenerate + matched demo grids

**Files:**
- Regenerate: `src/screens/Section3Structured/generated/{rewards.ts,RewardCard.tsx,RewardGrid.tsx}`
- Modify: `src/screens/Section3Structured/Section3Structured.tsx`

- [ ] **Step 1: Re-run the emitter on the v3 export**

Run:
```bash
node scripts/import-figma-export.mjs ~/Downloads/figma-export-section3-v3.json figma-export-section3-v3
node scripts/emit-component.mjs figma-export-section3-v3 "1:33188" src/screens/Section3Structured/generated
rm -rf figma-export-section3-v3
```
Expected: the generated files update — `rewards.ts` now has semantic keys (e.g. `amount`/`requirement`/…), `RewardGrid.tsx` exports `GRID_*`, slot styles are trimmed. (`img/` is unchanged.)

If the bundle is missing, report BLOCKED.

- [ ] **Step 2: Update the demo screen for matched grids**

In `src/screens/Section3Structured/Section3Structured.tsx`:

1. Replace the generated imports (lines 2-3) with:

```tsx
import { rewards, type RewardItem } from './generated/rewards'
import { RewardGrid, GRID_GAP, GRID_PADDING, GRID_WIDTH } from './generated/RewardGrid'
import { CARD_W, CARD_H } from './generated/RewardCard'
```

2. Replace the comparison row (the `<div className="flex gap-6 p-3">` block, lines 65-80) with:

```tsx
      <div className="flex gap-6 p-3" style={{ zoom: 1.4 } as React.CSSProperties}>
        <section>
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">Baked (v1) — frozen pixels</h3>
          <div
            data-testid="baked-grid"
            style={{ display: 'flex', flexWrap: 'wrap', gap: GRID_GAP, padding: GRID_PADDING, width: GRID_WIDTH }}
          >
            {items.map((r) =>
              r.bakedImage ? (
                <img key={r.id} src={assetUrl(r.bakedImage)} alt="" style={{ width: CARD_W, height: CARD_H }} />
              ) : null,
            )}
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">Generated — editable data</h3>
          <div data-testid="generated-grid">
            <RewardGrid items={items} assetUrl={assetUrl} />
          </div>
        </section>
      </div>
```

(The `as React.CSSProperties` cast lets the non-standard `zoom` through TypeScript.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors (the `GRID_*`/`CARD_*` imports resolve from the regenerated files).

- [ ] **Step 4: Run the demo + emitter + full suite**

Run: `npx vitest run`
Expected: PASS — the existing `Section3Structured.test.tsx` (baked count + live edit) still holds with the new field keys, plus the Task 1 emitter tests.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Section3Structured/
git commit -m "feat: matched baked/generated grids (constrained images, shared container, zoom)"
```

---

## Self-Review

**Spec coverage:**
- Fix 1 matched grids (constrain baked to CARD size, shared GRID_* container, zoom) → Task 2 Step 2. ✓
- Fix 2 trim slot style → Task 1 `pickStyle`. ✓
- Fix 3 field-name heuristic + slot-index keying → Task 1 `valueKey`/`fieldKey` + `extractComponent`. ✓
- Fix 4 grid first-match → Task 1 `foundGrid`. ✓
- Tests for heuristic, trim, GRID_* export → Task 1 Step 1. ✓
- Regenerate + visual validation → Task 2 + post-merge screenshot. ✓

**Placeholder scan:** none — literal code + commands. (Task 2 Step 1 runs the real emitter; BLOCKED path documented.)

**Type consistency:** `valueKey`/`fieldKey` signatures match between Task 1's implementation, its tests, and `extractComponent`'s call (`fieldKey(name, text, i, used)`). `GRID_GAP`/`GRID_PADDING`/`GRID_WIDTH` (Task 1 codegen) are the exact names imported by the demo screen (Task 2). `CARD_W`/`CARD_H` are the existing exports from `RewardCard`.
