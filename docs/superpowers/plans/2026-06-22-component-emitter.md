# Component Emitter + Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deterministic emitter turns the IR + chrome export into `RewardCard.tsx` + `rewards.ts` + `RewardGrid.tsx`, and a `Section3Structured` screen renders baked vs generated grids with a live-edit control.

**Architecture:** `scripts/emit-component.mjs` builds the IR in-process (`buildIR`), selects the recurring component, extracts shared slots + per-card data (pure `extractComponent`), and generates three files via string templates; it copies the chrome + baked images. A hand-written demo screen consumes the generated files and overlays editable text on the text-less chrome via the shared `PositionedText`.

**Tech Stack:** Node ESM scripts, React 19 + Vite (`import.meta.glob`) + Vitest.

## Global Constraints

- The emitter reuses `buildIR` (from `scripts/build-ir.mjs`) — no separate `ir.json` file.
- Component selection = the `component`-role key with the most instances; require `instanceCount ≥ 2`, else emit nothing.
- Slots (positions + style) come from the FIRST instance, made **card-relative** (subtract the instance box origin). Field key = `fieldKey(name, text, index)`: the layer name if it's a valid JS identifier and ≠ its text, else `text<index+1>`.
- `bakedImage` / `chromeImage` are copied into `<outDir>/img/` with **path-flattened names** (`png/Card_1-5.png` → `png-Card_1-5.png`, `chrome/Card_1-5.png` → `chrome-Card_1-5.png`) to avoid basename collisions; `rewards.ts` stores those flattened filenames.
- Overlay text renders via the shared `PositionedText` (Plan 1). `content.style` fields with no `PositionedText` prop (`alignVertical`, `fontPostScriptName`, `fontStyle`) are dropped for now (fontFamily + weight + size suffice); per-slot `runs` are dropped (values are per-instance; reward amounts are single-colour).
- Editing a field updates the generated grid only; the baked grid is frozen.

---

## File Structure

- Create `scripts/emit-component.mjs` — `extractComponent` (pure) + `genRewardsTs`/`genRewardCardTsx`/`genRewardGridTsx` + CLI.
- Create `scripts/emit-component.test.mjs` — extractComponent + codegen tests (uses the existing `scripts/__fixtures__/reward-grid.*`).
- Create (generated, committed) `src/screens/Section3Structured/generated/{rewards.ts,RewardCard.tsx,RewardGrid.tsx,img/*}`.
- Create `src/screens/Section3Structured/Section3Structured.tsx` — demo screen + live control.
- Create `src/screens/Section3Structured/Section3Structured.test.tsx` — live-edit test.
- Modify `src/App.tsx` — add the `点击领取 (structured)` tab.

---

## Task 1: The emitter (`scripts/emit-component.mjs`)

**Files:**
- Create: `scripts/emit-component.mjs`
- Create: `scripts/emit-component.test.mjs`

**Interfaces:**
- Consumes: `buildIR(doc, screen, manifest)` from `./build-ir.mjs`.
- Produces:
  - `extractComponent(ir, chrome, manifest) -> { key, card:{w,h}, grid:{gap,padding,width}, slots:[{key,x,y,w,h,style}], items:[{id,bakedImage,chromeImage,fields}] } | null`
  - `genRewardsTs(model) -> string`, `genRewardCardTsx(model) -> string`, `genRewardGridTsx(model) -> string`

- [ ] **Step 1: Write the failing extractComponent test**

Create `scripts/emit-component.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildIR } from './build-ir.mjs'
import { extractComponent, genRewardsTs, genRewardCardTsx, genRewardGridTsx } from './emit-component.mjs'

const fx = (f) => JSON.parse(readFileSync(join('scripts/__fixtures__', f), 'utf8'))
const doc = fx('reward-grid.structure.json').document
const manifest = fx('reward-grid.manifest.json')
const chrome = { '1:5': 'chrome/Card_1-5.png', '1:6': 'chrome/Card_1-6.png', '1:7': 'chrome/Card_1-7.png' }
const ir = buildIR(doc, '1:1', manifest)
const model = extractComponent(ir, chrome, manifest)

describe('extractComponent', () => {
  it('selects the recurring card component (3 instances)', () => {
    expect(model).not.toBeNull()
    expect(model.items).toHaveLength(3)
    expect(model.card).toEqual({ w: 80, h: 100 })
  })

  it('derives one slot keyed by the meaningful layer name, card-relative', () => {
    expect(model.slots).toHaveLength(1)
    const s = model.slots[0]
    expect(s.key).toBe('amount')          // layer "amount" is a valid identifier ≠ its text
    expect(s.x).toBe(20)                   // 40 (content) - 20 (card origin)
    expect(s.style.fontWeight).toBe(700)
  })

  it('extracts per-card data with flattened image filenames + field values', () => {
    expect(model.items.map((i) => i.fields.amount)).toEqual(['28¥', '88¥', '188¥'])
    expect(model.items[0].bakedImage).toBe('png-Card_1-5.png')
    expect(model.items[0].chromeImage).toBe('chrome-Card_1-5.png')
  })
})

describe('codegen', () => {
  it('rewards.ts exports a typed RewardItem array with the data', () => {
    const out = genRewardsTs(model)
    expect(out).toContain('export interface RewardItem')
    expect(out).toContain('export const rewards: RewardItem[]')
    expect(out).toContain('"amount": "28¥"')
    expect(out).toContain('chrome-Card_1-5.png')
  })

  it('RewardCard.tsx imports PositionedText and renders a slot per field', () => {
    const out = genRewardCardTsx(model)
    expect(out).toContain("from '../../../components/PositionedText/PositionedText'")
    expect(out).toContain('const SLOTS')
    expect(out).toContain('<PositionedText')
    expect(out).toContain("text={fields['amount']")
  })

  it('RewardGrid.tsx maps items to RewardCard', () => {
    const out = genRewardGridTsx(model)
    expect(out).toContain('items.map')
    expect(out).toContain('<RewardCard')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/emit-component.mjs`**

Create `scripts/emit-component.mjs`:

```js
// Deterministic component emitter. Builds the IR in-process, selects the
// recurring component (a reward card), extracts shared slots + per-card data,
// and generates a presentational <RewardCard> + editable data + a <RewardGrid>.
// Overlay text renders via the shared PositionedText over the text-less chrome.
//
// Usage:
//   node scripts/emit-component.mjs <unpackedExportDir> "<screen id|name>" <outDir>

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { buildIR } from "./build-ir.mjs";

// --- pure core ---

function collect(node, role) {
  const out = [];
  (function w(n) {
    if (n.role === role) out.push(n);
    (n.children || []).forEach(w);
  })(node);
  return out;
}

function fieldKey(name, text, i) {
  const s = (name || "").trim();
  const valid = /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
  return valid && s !== text ? s : "text" + (i + 1);
}

// "png/Card_1-5.png" -> "png-Card_1-5.png" (avoid basename collisions in one dir)
const flat = (p) => (p ? p.replace(/\//g, "-") : null);

export function extractComponent(ir, chrome = {}, manifest = {}) {
  const comps = collect(ir.root, "component");
  if (!comps.length) return null;
  const byKey = {};
  for (const c of comps) (byKey[c.component.key] = byKey[c.component.key] || []).push(c);
  const [key, instances] = Object.entries(byKey).sort((a, b) => b[1].length - a[1].length)[0];
  if (instances.length < 2) return null;

  const first = instances[0];
  const slots = collect(first, "content").map((c, i) => ({
    key: fieldKey(c.name, c.content.text, i),
    x: c.box.x - first.box.x,
    y: c.box.y - first.box.y,
    w: c.box.w,
    h: c.box.h,
    style: c.content.style,
  }));

  const items = instances.map((inst) => {
    const fields = {};
    collect(inst, "content").forEach((c, i) => {
      fields[fieldKey(c.name, c.content.text, i)] = c.content.text;
    });
    return {
      id: inst.id,
      bakedImage: flat(manifest[inst.id]) || null,
      chromeImage: flat(chrome[inst.id]) || null,
      fields,
    };
  });

  // Grid layout = the first layout node that directly holds component children.
  let grid = { gap: 0, padding: 0, width: null };
  (function w(n) {
    if (n.role === "layout" && (n.children || []).some((c) => c.role === "component")) {
      grid = { gap: n.layout?.gap || 0, padding: n.layout?.padding?.left || 0, width: n.box.w };
      return;
    }
    (n.children || []).forEach(w);
  })(ir.root);

  return { key, card: { w: first.box.w, h: first.box.h }, grid, slots, items };
}

// --- codegen (deterministic string templates) ---

export function genRewardsTs(model) {
  const lines = model.items.map(
    (it) =>
      `  { id: ${JSON.stringify(it.id)}, bakedImage: ${JSON.stringify(it.bakedImage)}, ` +
      `chromeImage: ${JSON.stringify(it.chromeImage)}, fields: ${JSON.stringify(it.fields)} },`,
  );
  return `// GENERATED by scripts/emit-component.mjs — do not edit by hand.
export interface RewardItem {
  id: string
  bakedImage: string | null
  chromeImage: string | null
  fields: Record<string, string>
}

export const rewards: RewardItem[] = [
${lines.join("\n")}
]
`;
}

export function genRewardCardTsx(model) {
  const slots = JSON.stringify(model.slots, null, 2).replace(/^/gm, "  ").trim();
  const slotJsx = `        <PositionedText
          key={s.key}
          x={s.x}
          y={s.y}
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
        />`;
  return `// GENERATED by scripts/emit-component.mjs — do not edit by hand.
import { PositionedText } from '../../../components/PositionedText/PositionedText'

export const CARD_W = ${model.card.w}
export const CARD_H = ${model.card.h}

const SLOTS = ${slots} as const

export function RewardCard({ chrome, fields }: { chrome: string; fields: Record<string, string> }) {
  return (
    <div style={{ position: 'relative', width: CARD_W, height: CARD_H }}>
      <img src={chrome} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {SLOTS.map((s) => (
${slotJsx}
      ))}
    </div>
  )
}
`;
}

export function genRewardGridTsx(model) {
  return `// GENERATED by scripts/emit-component.mjs — do not edit by hand.
import { RewardCard } from './RewardCard'
import type { RewardItem } from './rewards'

export function RewardGrid({
  items,
  assetUrl,
}: {
  items: RewardItem[]
  assetUrl: (f: string) => string | undefined
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: ${model.grid.gap}, padding: ${model.grid.padding}, width: ${model.grid.width ?? "undefined"} }}>
      {items.map((r) => (
        <RewardCard key={r.id} chrome={(r.chromeImage && assetUrl(r.chromeImage)) || ''} fields={r.fields} />
      ))}
    </div>
  )
}
`;
}

// --- CLI ---
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/emit-component.mjs")) {
  const [, , exportDir, screen, outDir] = process.argv;
  if (!exportDir || !screen || !outDir) {
    console.error('usage: emit-component.mjs <exportDir> "<screen id|name>" <outDir>');
    process.exit(1);
  }
  const structDir = join(exportDir, "structure");
  const doc = JSON.parse(
    readFileSync(join(structDir, readdirSync(structDir).find((f) => f.endsWith(".json"))), "utf8"),
  ).document;
  const read = (f) => (existsSync(join(exportDir, f)) ? JSON.parse(readFileSync(join(exportDir, f), "utf8")) : {});
  const manifest = read("manifest.json");
  const chrome = read("chrome.json");
  const ir = buildIR(doc, screen, manifest);
  const model = extractComponent(ir, chrome, manifest);
  if (!model) {
    console.error("no recurring component (instanceCount >= 2) found");
    process.exit(1);
  }
  const imgDir = join(outDir, "img");
  mkdirSync(imgDir, { recursive: true });
  for (const it of model.items) {
    for (const [rel, flatName] of [
      [manifest[it.id], it.bakedImage],
      [chrome[it.id], it.chromeImage],
    ]) {
      if (rel && flatName) copyFileSync(join(exportDir, rel), join(imgDir, flatName));
    }
  }
  writeFileSync(join(outDir, "rewards.ts"), genRewardsTs(model));
  writeFileSync(join(outDir, "RewardCard.tsx"), genRewardCardTsx(model));
  writeFileSync(join(outDir, "RewardGrid.tsx"), genRewardGridTsx(model));
  console.log(`emitted ${model.items.length} cards, ${model.slots.length} slots -> ${outDir}`);
}
```

- [ ] **Step 4: Run the emitter test to verify it passes**

Run: `npx vitest run scripts/emit-component.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/emit-component.mjs scripts/emit-component.test.mjs
git commit -m "feat: emit-component — generate data-driven RewardCard from IR + chrome"
```

---

## Task 2: Generate Section 3 + demo screen + wiring

**Files:**
- Create (generated): `src/screens/Section3Structured/generated/{rewards.ts,RewardCard.tsx,RewardGrid.tsx,img/*}`
- Create: `src/screens/Section3Structured/Section3Structured.tsx`
- Create: `src/screens/Section3Structured/Section3Structured.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: generated `rewards`/`RewardItem`/`RewardGrid` and the shared `PositionedText`.

- [ ] **Step 1: Unpack the v3 export and run the emitter**

Run:
```bash
node scripts/import-figma-export.mjs ~/Downloads/figma-export-section3-v3.json figma-export-section3-v3
node scripts/emit-component.mjs figma-export-section3-v3 "1:33188" src/screens/Section3Structured/generated
rm -rf figma-export-section3-v3
```
Expected: `emitted 9 cards, … slots -> src/screens/Section3Structured/generated`, and `generated/` now has `rewards.ts`, `RewardCard.tsx`, `RewardGrid.tsx`, `img/` (chrome + baked PNGs).

If the export bundle isn't present, report BLOCKED (the generated files require it).

- [ ] **Step 2: Typecheck the generated files**

Run: `npx tsc -b`
Expected: no errors (the generated `.tsx` import `PositionedText` and resolve).

- [ ] **Step 3: Write the failing demo screen test**

Create `src/screens/Section3Structured/Section3Structured.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section3Structured } from './Section3Structured'
import { rewards } from './generated/rewards'

describe('Section3Structured', () => {
  it('renders the baked grid and the generated grid', () => {
    render(<Section3Structured />)
    // baked grid: one <img> per reward with a baked image
    const baked = document.querySelectorAll('[data-testid="baked-grid"] img')
    expect(baked.length).toBe(rewards.filter((r) => r.bakedImage).length)
    // generated grid present
    expect(screen.getByTestId('generated-grid')).toBeInTheDocument()
  })

  it('live edit updates the generated grid text, not the baked images', () => {
    render(<Section3Structured />)
    const firstKey = Object.keys(rewards[0].fields)[0]
    const input = screen.getByTestId('edit-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ZZZ' } })
    // the generated grid now shows the new value somewhere
    expect(screen.getByTestId('generated-grid').textContent).toContain('ZZZ')
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/screens/Section3Structured/Section3Structured.test.tsx`
Expected: FAIL — `Section3Structured` not found.

- [ ] **Step 5: Create the demo screen**

Create `src/screens/Section3Structured/Section3Structured.tsx`:

```tsx
import { useState } from 'react'
import { rewards, type RewardItem } from './generated/rewards'
import { RewardGrid } from './generated/RewardGrid'

// Bundle the generated card images (chrome + baked); resolve filename → URL.
const urls = import.meta.glob('./generated/img/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const byName: Record<string, string> = {}
for (const [p, u] of Object.entries(urls)) byName[p.split('/').pop()!] = u
const assetUrl = (f: string) => byName[f]

/**
 * Demo: the SAME data renders two ways — left = baked v1 images (frozen), right =
 * the generated <RewardGrid> (text overlaid on text-less chrome). The live
 * control edits a field and the generated grid updates; the baked side doesn't.
 */
export function Section3Structured({ className }: { className?: string }) {
  const [items, setItems] = useState<RewardItem[]>(rewards)
  const [sel, setSel] = useState(0)
  const fieldKeys = Object.keys(rewards[0].fields)
  const [field, setField] = useState(fieldKeys[0])

  const setVal = (value: string) =>
    setItems((prev) => prev.map((it, i) => (i === sel ? { ...it, fields: { ...it.fields, [field]: value } } : it)))

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 p-3 text-sm">
        <span className="font-semibold">Live edit:</span>
        <select
          data-testid="edit-card"
          value={sel}
          onChange={(e) => setSel(Number(e.target.value))}
          className="rounded border px-2 py-1"
        >
          {items.map((it, i) => (
            <option key={it.id} value={i}>
              card {i + 1}
            </option>
          ))}
        </select>
        <select
          data-testid="edit-field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="rounded border px-2 py-1"
        >
          {fieldKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          data-testid="edit-input"
          value={items[sel].fields[field] ?? ''}
          onChange={(e) => setVal(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </div>

      <div className="flex gap-6 p-3">
        <section>
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">Baked (v1) — frozen pixels</h3>
          <div data-testid="baked-grid" className="flex flex-wrap gap-2" style={{ width: 360 }}>
            {items.map((r) =>
              r.bakedImage ? <img key={r.id} src={assetUrl(r.bakedImage)} alt="" /> : null,
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
    </div>
  )
}
```

- [ ] **Step 6: Run the demo test to verify it passes**

Run: `npx vitest run src/screens/Section3Structured/Section3Structured.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Add the tab to `src/App.tsx`**

In `src/App.tsx`:

1. Add the import near the other screen imports:

```tsx
import { Section3Structured } from './screens/Section3Structured/Section3Structured'
```

2. Add to the `PAGES` array (after the `section3` entry):

```tsx
  { id: 'section3s', label: '点击领取 (structured)' },
```

3. Add the render branch alongside the other `page === …` blocks:

```tsx
      {page === 'section3s' && (
        <Section3Structured className="mx-auto mt-4 w-[820px] rounded-xl bg-white shadow-xl" />
      )}
```

- [ ] **Step 8: Full suite + typecheck**

Run: `npx vitest run` (all green) then `npx tsc -b` (no errors).

- [ ] **Step 9: Commit**

```bash
git add src/screens/Section3Structured/ src/App.tsx
git commit -m "feat: Section3Structured — baked vs generated grid with live-edit demo"
```

---

## Self-Review

**Spec coverage (Parts B + D):**
- Emitter selects recurring component, extracts slots (card-relative) + per-card data → Task 1 `extractComponent`. ✓
- Field naming layer-name→positional → `fieldKey`. ✓
- Generates RewardCard (chrome `<img>` + PositionedText slots) / rewards.ts / RewardGrid → Task 1 codegen. ✓
- Flattened image filenames (no basename collision) → `flat()`. ✓
- Copies chrome + baked into `img/` → CLI. ✓
- Demo screen: baked grid │ generated grid + live control; edit updates generated only → Task 2. ✓
- New App tab → Task 2 Step 7. ✓
- Dropped-fields note (alignVertical/postscript/style/runs) → Global Constraints. ✓

**Placeholder scan:** none — complete code + commands. (Task 2 Step 1 runs the real emitter against the v3 bundle; BLOCKED path documented if absent.)

**Type consistency:** `extractComponent` returns `{ key, card, grid, slots, items }`; the three gen functions consume exactly those fields; `RewardItem` shape (`id/bakedImage/chromeImage/fields`) is identical in `genRewardsTs`, `RewardGrid`, and the demo screen. `PositionedText` props passed by the generated `RewardCard` match Plan 1's `PositionedTextProps`.
