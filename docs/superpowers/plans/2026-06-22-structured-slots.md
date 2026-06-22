# Structured Slots + RewardCard (Plan 1 of full-screen demo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The emitter produces a structured slot TREE (text + flex `group` slots) + `gridBox`, and `RewardCard` renders it (flex groups grow → no overlap) with live position overrides.

**Architecture:** Replace the flat slot extraction with a structured walk that turns Figma auto-layout rows into `group` slots. `RewardCard` renders `text` slots via `PositionedText` and `group` slots as absolute `flex` `<div>`s of styled `<span>`s, applying `slotOverrides`. Shared text CSS is exported from `PositionedText`.

**Tech Stack:** Node ESM scripts, React 19 + Vitest.

## Global Constraints

- `Slot = { kind:'text', key, x, y, w, h, style } | { kind:'group', key, x, y, direction, gap, children: Slot[] }`.
- The walk: `content`→text slot (box card-relative); flex `layout`→`group` slot (recurse); non-flex `layout`→passthrough; nested asset/component→skip.
- Field keys gathered from ALL text slots in pre-order; item `fields` map flat content (pre-order) to those keys by index.
- `gridBox` = the grid layout node's (screen-relative) box.
- `RewardCard` accepts `slotOverrides?: Record<string,{x?:number;y?:number}>`; a slot's rendered `left/top` = base + override.
- Group children render as `<span>` (auto width, so the row grows); shared styling via `textStyleCss` exported from `PositionedText`.

---

## File Structure

- Modify `scripts/__fixtures__/reward-grid.structure.json` — add a flex `amountRow` group + a `requirement` text to each card.
- Modify `scripts/emit-component.mjs` — `buildSlots` (structured walk), `groupKey`, `extractComponent` (slot tree + `gridBox` + field keys from tree), `genRewardCardTsx` (render tree + overrides).
- Modify `scripts/emit-component.test.mjs` — slot-tree, gridBox, key, codegen assertions.
- Modify `src/components/PositionedText/PositionedText.tsx` — export `textStyleCss`; use it internally.
- Regenerate `src/screens/Section3Structured/generated/{RewardCard.tsx,rewards.ts,RewardGrid.tsx}`.
- Create `src/screens/Section3Structured/generated/RewardCard.render.test.tsx` — render test (group flex + override).

---

## Task 1: Emitter — structured slot tree + gridBox

**Files:**
- Modify: `scripts/__fixtures__/reward-grid.structure.json`
- Modify: `scripts/emit-component.mjs`
- Modify: `scripts/emit-component.test.mjs`

**Interfaces:**
- Produces: `extractComponent(...) -> { key, card, grid, gridBox:{x,y,w,h}, slots: Slot[], items }` where `Slot` is the tree above; item `fields` keyed by all text-slot keys.

- [ ] **Step 1: Rework the fixture cards (flex amount row + requirement)**

In `scripts/__fixtures__/reward-grid.structure.json`, replace EACH of the three card instances' `children` (cards `1:5`, `1:6`, `1:7`) so each card has a flex `amountRow` group + a `requirement` text. Card `1:5` (amount `28`):

```json
        "children": [
          {
            "id": "1:5:row", "name": "amountRow", "type": "FRAME",
            "layoutMode": "HORIZONTAL", "itemSpacing": 2,
            "absoluteBoundingBox": { "x": 30, "y": 120, "width": 50, "height": 20 },
            "children": [
              { "id": "1:5:amt", "name": "amount", "type": "TEXT", "characters": "28",
                "absoluteBoundingBox": { "x": 30, "y": 122, "width": 24, "height": 16 },
                "style": { "fontSize": 16, "fontWeight": 700, "textAlignHorizontal": "CENTER" },
                "fills": [{ "type": "SOLID", "color": { "r": 0.9, "g": 0.3, "b": 0.2 } }] },
              { "id": "1:5:yen", "name": "currency", "type": "TEXT", "characters": "¥",
                "absoluteBoundingBox": { "x": 56, "y": 124, "width": 12, "height": 14 },
                "style": { "fontSize": 12, "fontWeight": 700, "textAlignHorizontal": "LEFT" },
                "fills": [{ "type": "SOLID", "color": { "r": 0.9, "g": 0.3, "b": 0.2 } }] }
            ]
          },
          { "id": "1:5:req", "name": "requirement", "type": "TEXT", "characters": "投注 5万+",
            "absoluteBoundingBox": { "x": 20, "y": 145, "width": 60, "height": 12 },
            "style": { "fontSize": 10, "fontWeight": 400, "textAlignHorizontal": "CENTER" },
            "fills": [{ "type": "SOLID", "color": { "r": 0.5, "g": 0.5, "b": 0.5 } }] }
        ]
```

For card `1:6`: same structure with ids `1:6:row`/`1:6:amt`/`1:6:yen`/`1:6:req`, amount `88`, requirement `投注 50万+`. For card `1:7`: ids `1:7:*`, amount `188`, requirement `投注 100万+`. (Keep each card's own `id`/`absoluteBoundingBox`/`componentId` as they are.)

- [ ] **Step 2: Write the failing emitter tests**

Replace the existing `describe('extractComponent', …)` block in `scripts/emit-component.test.mjs` with:

```js
describe('extractComponent', () => {
  it('selects the recurring card component (3 instances)', () => {
    expect(model).not.toBeNull()
    expect(model.items).toHaveLength(3)
    expect(model.card).toEqual({ w: 80, h: 100 })
  })

  it('emits a flex group slot for the auto-layout amount row', () => {
    const group = model.slots.find((s) => s.kind === 'group')
    expect(group).toBeTruthy()
    expect(group.direction).toBe('row')
    expect(group.gap).toBe(2)
    expect(group.x).toBe(10) // 30 (row) - 20 (card origin)
    expect(group.children.map((c) => c.key)).toEqual(['amount', 'currency'])
  })

  it('emits a top-level text slot for the requirement', () => {
    const req = model.slots.find((s) => s.kind === 'text' && s.key === 'requirement')
    expect(req).toBeTruthy()
    expect(req.style.fontWeight).toBe(400)
  })

  it('keys per-card fields from all text slots and exposes gridBox', () => {
    expect(model.items.map((i) => i.fields.amount)).toEqual(['28', '88', '188'])
    expect(model.items[0].fields.currency).toBe('¥')
    expect(model.items[0].fields.requirement).toBe('投注 5万+')
    expect(model.gridBox).toEqual({ x: 10, y: 60, w: 370, h: 120 })
  })
})
```

(Also update the existing `codegen` test that asserted `text={fields['amount']` / `SLOTS.map` — see Task 2; for now the `genRewardsTs` assertion `"amount": "28"` replaces `"amount": "28¥"`.)

Update the `genRewardsTs` codegen assertion in the same file from `"amount": "28¥"` to `"amount": "28"`.

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: FAIL — no `group` slot; `gridBox` undefined; fields shape changed.

- [ ] **Step 4: Implement the structured walk**

In `scripts/emit-component.mjs`, add a `groupKey` helper next to `fieldKey`:

```js
// Key for a group slot: a valid-identifier layer name, else "group", de-duped.
function groupKey(name, used) {
  const s = (name || "").trim();
  const base = /^[A-Za-z$_][A-Za-z0-9$_]*$/.test(s) ? s : "group";
  let key = base;
  let n = 2;
  while (used.has(key)) key = base + n++;
  used.add(key);
  return key;
}

// Walk a component instance's IR subtree into a slot tree, preserving Figma
// auto-layout rows as flex `group` slots (so they grow and never overlap).
function buildSlots(node, origin, used, ctr) {
  const slots = [];
  for (const c of node.children || []) {
    if (c.role === "content") {
      slots.push({
        kind: "text",
        key: fieldKey(c.name, c.content.text, ctr.i++, used),
        x: c.box.x - origin.x,
        y: c.box.y - origin.y,
        w: c.box.w,
        h: c.box.h,
        style: pickStyle(c.content.style),
      });
    } else if (c.role === "layout" && c.layout && c.layout.mode === "flex") {
      slots.push({
        kind: "group",
        key: groupKey(c.name, used),
        x: c.box.x - origin.x,
        y: c.box.y - origin.y,
        direction: c.layout.direction || "row",
        gap: c.layout.gap || 0,
        children: buildSlots(c, origin, used, ctr),
      });
    } else if (c.role === "layout") {
      slots.push(...buildSlots(c, origin, used, ctr)); // non-flex: passthrough
    }
    // nested asset/component → skip (chrome covers them)
  }
  return slots;
}
```

In `extractComponent`, replace the `slots` + `items` + `grid` blocks with:

```js
  const first = instances[0];
  const used = new Set();
  const slots = buildSlots(first, first.box, used, { i: 0 });

  // All text-slot keys in pre-order — the per-card field keys.
  const textKeys = [];
  (function w(ss) {
    for (const s of ss) {
      if (s.kind === "text") textKeys.push(s.key);
      else if (s.kind === "group") w(s.children);
    }
  })(slots);

  const items = instances.map((inst) => {
    const cs = collect(inst, "content"); // flat content, pre-order (same shape across instances)
    const fields = {};
    textKeys.forEach((k, i) => {
      fields[k] = cs[i] ? cs[i].content.text : "";
    });
    return {
      id: inst.id,
      bakedImage: flat(manifest[inst.id]) || null,
      chromeImage: flat(chrome[inst.id]) || null,
      fields,
    };
  });

  // Grid layout + its screen-relative box (FIRST layout node holding components).
  let grid = { gap: 0, padding: 0, width: null };
  let gridBox = null;
  let foundGrid = false;
  (function w(n) {
    if (foundGrid) return;
    if (n.role === "layout" && (n.children || []).some((c) => c.role === "component")) {
      grid = { gap: n.layout?.gap || 0, padding: n.layout?.padding?.left || 0, width: n.box.w };
      gridBox = { x: n.box.x, y: n.box.y, w: n.box.w, h: n.box.h };
      foundGrid = true;
      return;
    }
    (n.children || []).forEach(w);
  })(ir.root);

  return { key, card: { w: first.box.w, h: first.box.h }, grid, gridBox, slots, items };
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: the new `extractComponent` tests pass. The `codegen` `RewardCard` test may still fail (handled in Task 2) — that's expected; confirm only the `extractComponent` + `genRewardsTs` ones are green here. `node --check scripts/emit-component.mjs` clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/__fixtures__/reward-grid.structure.json scripts/emit-component.mjs scripts/emit-component.test.mjs
git commit -m "feat: emitter — structured slot tree (flex groups) + gridBox"
```

---

## Task 2: RewardCard renders the slot tree + overrides

**Files:**
- Modify: `src/components/PositionedText/PositionedText.tsx`
- Modify: `scripts/emit-component.mjs` (`genRewardCardTsx`)
- Modify: `scripts/emit-component.test.mjs` (codegen assertions)
- Regenerate: `src/screens/Section3Structured/generated/{RewardCard.tsx,rewards.ts,RewardGrid.tsx}`
- Create: `src/screens/Section3Structured/generated/RewardCard.render.test.tsx`

**Interfaces:**
- Produces: `textStyleCss(style) -> React.CSSProperties` from `PositionedText`; generated `RewardCard({ chrome, fields, slotOverrides? })`.

- [ ] **Step 1: Export `textStyleCss` from PositionedText**

In `src/components/PositionedText/PositionedText.tsx`, add (and have `PositionedText` reuse it for the font/colour/stroke part):

```tsx
// The font/colour/stroke CSS for Figma text (no positioning) — shared by
// PositionedText and generated flex-group spans so both render identically.
export function textStyleCss(s: {
  fontFamily: string | null
  fontSize: number
  fontWeight: number
  color: string
  letterSpacing: number
  stroke?: { color: string; width: number } | null
}): React.CSSProperties {
  return {
    fontFamily: fontStack(s.fontFamily),
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: s.color,
    letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
    whiteSpace: 'pre',
    ...(s.stroke
      ? {
          WebkitTextStrokeColor: s.stroke.color,
          WebkitTextStrokeWidth: `${s.stroke.width}px`,
          paintOrder: 'stroke fill',
        }
      : {}),
  }
}
```

(Add `import type { CSSProperties } from 'react'` if needed, or use `React.CSSProperties` — the file already returns JSX, so `React` types are available via the JSX runtime; use `import type React from 'react'` at top if `tsc` complains.)

- [ ] **Step 2: Write the failing codegen test**

Replace the `RewardCard.tsx` codegen test in `scripts/emit-component.test.mjs` with:

```js
  it('RewardCard.tsx renders text + group slots and accepts slotOverrides', () => {
    const out = genRewardCardTsx(model)
    expect(out).toContain("from '../../../components/PositionedText/PositionedText'")
    expect(out).toContain('slotOverrides')
    expect(out).toContain("kind === 'group'") // group branch
    expect(out).toContain('<PositionedText')   // text branch
    expect(out).toContain('flexDirection')
  })
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: FAIL — `genRewardCardTsx` doesn't emit the group branch / `slotOverrides` yet.

- [ ] **Step 4: Rewrite `genRewardCardTsx`**

In `scripts/emit-component.mjs`, replace `genRewardCardTsx` with:

```js
export function genRewardCardTsx(model) {
  const slots = JSON.stringify(model.slots, null, 2).replace(/^/gm, "  ").trim();
  return `// GENERATED by scripts/emit-component.mjs — do not edit by hand.
import { PositionedText, textStyleCss } from '../../../components/PositionedText/PositionedText'

export const CARD_W = ${model.card.w}
export const CARD_H = ${model.card.h}

type Slot =
  | { kind: 'text'; key: string; x: number; y: number; w: number; h: number; style: any }
  | { kind: 'group'; key: string; x: number; y: number; direction: 'row' | 'column'; gap: number; children: Slot[] }

const SLOTS: Slot[] = ${slots}

type Overrides = Record<string, { x?: number; y?: number }>

function renderSlot(s: Slot, fields: Record<string, string>, ov: Overrides) {
  const o = ov[s.key] || {}
  const left = s.x + (o.x ?? 0)
  const top = s.y + (o.y ?? 0)
  if (s.kind === 'group') {
    return (
      <div
        key={s.key}
        style={{ position: 'absolute', left, top, display: 'flex', flexDirection: s.direction, gap: s.gap, alignItems: 'baseline' }}
      >
        {s.children.map((c) =>
          c.kind === 'text' ? (
            <span key={c.key} style={textStyleCss(c.style)}>{fields[c.key] ?? ''}</span>
          ) : null,
        )}
      </div>
    )
  }
  return (
    <PositionedText
      key={s.key}
      x={left}
      y={top}
      w={s.w}
      h={s.h}
      text={fields[s.key] ?? ''}
      runs={null}
      fontFamily={s.style.fontFamily}
      fontSize={s.style.fontSize}
      fontWeight={s.style.fontWeight}
      color={s.style.color}
      align={s.style.align}
      lineHeight={s.style.lineHeight}
      letterSpacing={s.style.letterSpacing}
      stroke={s.style.stroke}
    />
  )
}

export function RewardCard({
  chrome,
  fields,
  slotOverrides = {},
}: {
  chrome: string
  fields: Record<string, string>
  slotOverrides?: Overrides
}) {
  return (
    <div style={{ position: 'relative', width: CARD_W, height: CARD_H }}>
      <img src={chrome} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {SLOTS.map((s) => renderSlot(s, fields, slotOverrides))}
    </div>
  )
}
`;
}
```

Also update `genRewardGridTsx` to forward an optional `slotOverrides` so the grid can pass it to every card. In its template, change the component signature + the `RewardCard` usage:

```jsx
export function RewardGrid({
  items,
  assetUrl,
  slotOverrides,
}: {
  items: RewardItem[]
  assetUrl: (f: string) => string | undefined
  slotOverrides?: Record<string, { x?: number; y?: number }>
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: GRID_GAP, padding: GRID_PADDING, width: GRID_WIDTH }}>
      {items.map((r) => (
        <RewardCard key={r.id} chrome={(r.chromeImage && assetUrl(r.chromeImage)) || ''} fields={r.fields} slotOverrides={slotOverrides} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run the emitter tests**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: PASS. `node --check scripts/emit-component.mjs` clean.

- [ ] **Step 6: Regenerate Section 3's files**

Run:
```bash
node scripts/import-figma-export.mjs ~/Downloads/figma-export-section3-v3.json figma-export-section3-v3
node scripts/emit-component.mjs figma-export-section3-v3 "1:33188" src/screens/Section3Structured/generated
rm -rf figma-export-section3-v3
```
Expected: `RewardCard.tsx` now has the `Slot`/group rendering + `slotOverrides`; `RewardGrid.tsx` forwards `slotOverrides`. If the bundle is missing, report BLOCKED.

- [ ] **Step 7: Write the RewardCard render test**

Create `src/screens/Section3Structured/generated/RewardCard.render.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RewardCard } from './RewardCard'
import { rewards } from './rewards'

const fieldsOf = (i: number) => rewards[i].fields

describe('generated RewardCard', () => {
  it('renders a long amount in a flex row without a fixed-width overflow', () => {
    render(<RewardCard chrome="" fields={{ ...fieldsOf(0), amount: '8888' }} />)
    const el = screen.getByText('8888')
    // group child spans render in a flex container (auto width), not a fixed PositionedText box
    expect(el.tagName.toLowerCase()).toBe('span')
    expect((el.parentElement as HTMLElement).style.display).toBe('flex')
  })

  it('applies a slotOverride to shift a slot', () => {
    const { container } = render(
      <RewardCard chrome="" fields={fieldsOf(0)} slotOverrides={{ amountRow: { x: 10 } }} />,
    )
    const group = container.querySelector('div[style*="flex"]') as HTMLElement
    // base group x is 10 (from extract) + override 10 = 20
    expect(group.style.left).toBe('20px')
  })
})
```

(If the regenerated group key is not `amountRow`, read it from the generated `RewardCard.tsx` SLOTS and use that key — note any change in your report.)

- [ ] **Step 8: Run the full suite + typecheck**

Run: `npx vitest run` (all green) then `npx tsc -b` (no errors).

- [ ] **Step 9: Commit**

```bash
git add src/components/PositionedText/PositionedText.tsx scripts/emit-component.mjs scripts/emit-component.test.mjs src/screens/Section3Structured/generated/
git commit -m "feat: RewardCard renders slot tree (flex groups) + position overrides"
```

---

## Self-Review

**Spec coverage (Parts A + B):**
- Structured slot tree (text/group), card-relative, flex from auto-layout → Task 1 `buildSlots`. ✓
- `gridBox` output → Task 1. ✓
- Field keys from all text slots; items by index → Task 1. ✓
- RewardCard renders text (PositionedText) + group (flex spans) → Task 2 `genRewardCardTsx`. ✓
- `slotOverrides` (base + override) → Task 2. ✓
- Shared `textStyleCss` → Task 2. ✓
- Overlap fix verified (long value in flex row) → Task 2 render test. ✓
- Part C (full-screen demo + inspector) → Plan 2; out of scope. ✓

**Placeholder scan:** none — literal code/commands; regenerate path has a BLOCKED fallback.

**Type consistency:** `Slot` shape is identical in `buildSlots` (Task 1), the `genRewardCardTsx` `Slot` type, and the render test. `slotOverrides: Record<string,{x?,y?}>` matches between `RewardCard`, `RewardGrid`, and the test. `textStyleCss` signature (Task 2 Step 1) matches its call in the generated group span.
