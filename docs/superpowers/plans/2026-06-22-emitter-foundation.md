# Emitter Foundation (IR text enrichment + PositionedText) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the IR `content` role with the full text metadata the emitter needs, and extract a shared `<PositionedText>` from `SceneRenderer` — the two foundations the component emitter (next plan) builds on.

**Architecture:** Lift `textStyle`/`textRuns` into `scripts/lib/figma.mjs` and use them in `build-ir.mjs` so `content` carries full font/align/spacing/stroke/colour + per-character runs. Extract `SceneRenderer`'s text-node rendering into `src/components/PositionedText/PositionedText.tsx` (behavior-preserving) so the generated card and the scene renderer share one text renderer.

**Tech Stack:** Node ESM scripts, React 19 + Vitest + Testing Library.

## Global Constraints

- Node ESM (`.mjs`) scripts; React/TSX in `src`.
- `build-section-scene.mjs` keeps identical rendered output (only behavior-preserving helper reuse).
- `PositionedText` extraction is **behavior-preserving** — `SceneRenderer`'s output is unchanged, verified by the existing `SceneRenderer.test.tsx`.
- Composited colour = ALL fills layered with opacity (never `fills[0]`); per-character runs come from `characterStyleOverrides` + `styleOverrideTable`.

---

## File Structure

- Modify `scripts/lib/figma.mjs` — add `textStyle(node)` and `textRuns(node)`.
- Modify `scripts/lib/figma.test.mjs` — unit tests for both.
- Modify `scripts/build-ir.mjs` — use lib `textStyle`/`textRuns` for `content`; delete the local `textStyle`.
- Modify `scripts/build-ir.test.mjs` — assert the enriched `content.style` + `runs`.
- Create `src/components/PositionedText/PositionedText.tsx` — shared positioned-text renderer.
- Create `src/components/PositionedText/PositionedText.test.tsx` — render tests.
- Modify `src/components/SceneRenderer/SceneRenderer.tsx` — render text via `<PositionedText>`.

---

## Task 1: Enrich IR `content` with full text metadata

**Files:**
- Modify: `scripts/lib/figma.mjs`
- Modify: `scripts/lib/figma.test.mjs`
- Modify: `scripts/build-ir.mjs`
- Modify: `scripts/build-ir.test.mjs`

**Interfaces:**
- Consumes (existing in lib): `compositeFills(fills) -> string|null`, `hex(c) -> string`.
- Produces:
  - `textStyle(node) -> { fontFamily, fontPostScriptName, fontStyle, fontWeight, fontSize, align, alignVertical, letterSpacing, lineHeight, color, stroke }`
  - `textRuns(node) -> { text: string, color: string }[] | null`
  - `build-ir` `content` node becomes `{ text, style: <textStyle>, runs: <textRuns> }`.

- [ ] **Step 1: Write the failing lib tests**

Add to `scripts/lib/figma.test.mjs` (extend the existing import to include `textStyle, textRuns`):

```js
import { textStyle, textRuns } from './figma.mjs'

const textNode = (over = {}) => ({
  characters: '28',
  style: { fontFamily: 'DIN Alternate', fontPostScriptName: 'DINAlternate-Bold', fontStyle: 'Bold', fontWeight: 700, fontSize: 20, textAlignHorizontal: 'CENTER', textAlignVertical: 'CENTER', letterSpacing: 0.5, lineHeightPx: 23.3 },
  fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.8, b: 0.82 } }],
  strokes: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
  strokeWeight: 1.44,
  ...over,
})

describe('textStyle', () => {
  it('captures the full text style incl. align V, spacing, line-height, stroke', () => {
    const s = textStyle(textNode())
    expect(s).toMatchObject({
      fontFamily: 'DIN Alternate', fontPostScriptName: 'DINAlternate-Bold', fontStyle: 'Bold',
      fontWeight: 700, fontSize: 20, align: 'center', alignVertical: 'center',
      letterSpacing: 0.5, lineHeight: 23, color: '#80ccd1',
    })
    expect(s.stroke).toEqual({ color: '#ffffff', width: 1.44 })
  })

  it('returns null stroke when there is no visible stroke', () => {
    expect(textStyle(textNode({ strokes: [] })).stroke).toBeNull()
  })
})

describe('textRuns', () => {
  it('returns null when every character is one colour', () => {
    expect(textRuns(textNode())).toBeNull()
  })

  it('splits per-character colour overrides into runs', () => {
    const n = textNode({
      characters: 'AB',
      characterStyleOverrides: [0, 7],
      styleOverrideTable: { 7: { fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] } },
    })
    expect(textRuns(n)).toEqual([
      { text: 'A', color: '#80ccd1' },
      { text: 'B', color: '#ff0000' },
    ])
  })
})
```

- [ ] **Step 2: Run the lib tests to verify they fail**

Run: `npx vitest run scripts/lib/figma.test.mjs`
Expected: FAIL — `textStyle`/`textRuns` are not exported.

- [ ] **Step 3: Add `textStyle` + `textRuns` to `scripts/lib/figma.mjs`**

Append to `scripts/lib/figma.mjs`:

```js
// Full text style for a TEXT node — everything needed to render overlay text
// identically to Figma's baked text. Colour is composited across all fills.
export function textStyle(node) {
  const st = node.style || {};
  const strokePaint = (node.strokes || []).find((x) => x.type === "SOLID" && x.visible !== false);
  return {
    fontFamily: st.fontFamily || null,
    fontPostScriptName: st.fontPostScriptName || null,
    fontStyle: st.fontStyle || null,
    fontWeight: st.fontWeight || 400,
    fontSize: Math.round(st.fontSize || 14),
    align: (st.textAlignHorizontal || "LEFT").toLowerCase(),
    alignVertical: (st.textAlignVertical || "TOP").toLowerCase(),
    letterSpacing: st.letterSpacing ? Math.round(st.letterSpacing * 100) / 100 : 0,
    lineHeight: st.lineHeightPx ? Math.round(st.lineHeightPx) : null,
    color: compositeFills(node.fills) || "#000",
    stroke:
      strokePaint && node.strokeWeight
        ? { color: hex(strokePaint.color), width: Math.round(node.strokeWeight * 100) / 100 }
        : null,
  };
}

// Per-character colour runs from Figma's characterStyleOverrides (index into
// styleOverrideTable; 0 = base). Returns null when the whole string is one
// colour (so single-colour text stays a plain string downstream).
export function textRuns(node) {
  const ov = node.characterStyleOverrides;
  if (!Array.isArray(ov) || !ov.length) return null;
  const tbl = node.styleOverrideTable || {};
  const chars = Array.from(node.characters || "");
  const colorAt = (i) => {
    const sid = ov[i] || 0;
    const fills = sid && tbl[sid] && tbl[sid].fills ? tbl[sid].fills : node.fills;
    return compositeFills(fills) || "#000";
  };
  const runs = [];
  for (let i = 0; i < chars.length; i++) {
    const c = colorAt(i);
    const last = runs[runs.length - 1];
    if (last && last.color === c) last.text += chars[i];
    else runs.push({ text: chars[i], color: c });
  }
  return new Set(runs.map((r) => r.color)).size > 1 ? runs : null;
}
```

- [ ] **Step 4: Run the lib tests to verify they pass**

Run: `npx vitest run scripts/lib/figma.test.mjs`
Expected: PASS.

- [ ] **Step 5: Use the lib helpers in `build-ir.mjs`**

In `scripts/build-ir.mjs`:

1. Extend the lib import (line 10) to:

```js
import { exportable, makeBox, findScreen, compositeFills, textStyle, textRuns } from "./lib/figma.mjs";
```

2. DELETE the local `function textStyle(n) { … }` block (it's now in the lib; the local one is the old subset).

3. Replace the content-node return:

```js
      return { ...base, role: "content", content: { text: n.characters || "", style: textStyle(n) } };
```

with:

```js
      return { ...base, role: "content", content: { text: n.characters || "", style: textStyle(n), runs: textRuns(n) } };
```

(`compositeFills` may now be unused in `build-ir.mjs` — if so, drop it from the import.)

- [ ] **Step 6: Update the build-ir test for the enriched content**

In `scripts/build-ir.test.mjs`, add inside the `describe('buildIR', …)` block:

```js
  it('captures full text style + runs on content nodes', () => {
    const title = all.find((n) => n.id === '1:3')
    expect(title.role).toBe('content')
    expect(title.content.style).toMatchObject({
      fontFamily: 'YouSheBiaoTiHei', fontSize: 24, align: 'left', alignVertical: 'top',
    })
    expect(title.content.style).toHaveProperty('letterSpacing')
    expect(title.content.style).toHaveProperty('lineHeight')
    expect(title.content.style).toHaveProperty('stroke')
    expect(title.content).toHaveProperty('runs') // null for single-colour text
  })
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS (all existing tests + the new lib + build-ir assertions). `node --check scripts/build-ir.mjs` clean.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/figma.mjs scripts/lib/figma.test.mjs scripts/build-ir.mjs scripts/build-ir.test.mjs
git commit -m "feat: enrich IR content with full text metadata (textStyle/textRuns in lib)"
```

---

## Task 2: Extract `<PositionedText>` from SceneRenderer

**Files:**
- Create: `src/components/PositionedText/PositionedText.tsx`
- Create: `src/components/PositionedText/PositionedText.test.tsx`
- Modify: `src/components/SceneRenderer/SceneRenderer.tsx`

**Interfaces:**
- Produces:
  - `PositionedTextProps = { x, y, w, h, text, runs?, fontFamily, fontSize, fontWeight, color, align, lineHeight, letterSpacing, stroke? }`
  - `<PositionedText {...props} />` — absolutely-positioned text box with font stack, single-line slack, optional stroke, optional per-character runs.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing PositionedText test**

Create `src/components/PositionedText/PositionedText.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PositionedText } from './PositionedText'

const base = {
  x: 10, y: 20, w: 40, h: 16, fontFamily: 'PingFang SC', fontSize: 14,
  fontWeight: 700, color: '#222', align: 'center', lineHeight: 16, letterSpacing: 0,
}

describe('PositionedText', () => {
  it('renders the text absolutely positioned with the colour', () => {
    render(<PositionedText {...base} text="28¥" />)
    const el = screen.getByText('28¥')
    expect(el).toHaveStyle({ position: 'absolute', top: '20px', color: '#222' })
  })

  it('renders per-character runs as coloured spans', () => {
    render(<PositionedText {...base} text="AB" runs={[{ text: 'A', color: '#f00' }, { text: 'B', color: '#00f' }]} />)
    expect(screen.getByText('A')).toHaveStyle({ color: '#f00' })
    expect(screen.getByText('B')).toHaveStyle({ color: '#00f' })
  })

  it('applies a text stroke when provided', () => {
    render(<PositionedText {...base} text="X" stroke={{ color: '#fff', width: 1 }} />)
    const el = screen.getByText('X')
    expect(el).toHaveStyle({ WebkitTextStrokeColor: '#fff' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/PositionedText/PositionedText.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `PositionedText.tsx`**

Create `src/components/PositionedText/PositionedText.tsx` (this is the text-rendering logic lifted verbatim from `SceneRenderer`, incl. the font stack and single-line slack):

```tsx
// Absolutely-positioned text box that renders Figma text faithfully: font stack,
// composited colour (or per-character runs), optional outline stroke, and a
// symmetric single-line slack so CJK labels don't mis-wrap. Shared by
// SceneRenderer (scene text) and generated components (card overlays).
export interface TextRun {
  text: string
  color: string
}
export interface PositionedTextProps {
  x: number
  y: number
  w: number
  h: number
  text: string
  runs?: TextRun[] | null
  fontFamily: string | null
  fontSize: number
  fontWeight: number
  color: string
  align: string
  lineHeight: number | null
  letterSpacing: number
  stroke?: { color: string; width: number } | null
}

const FONT_STACKS: Record<string, string> = {
  YouSheBiaoTiHei: '"YouSheBiaoTiHei", "PingFang SC", system-ui, sans-serif',
  'PingFang SC': '"PingFang SC", system-ui, sans-serif',
  'DIN Alternate': '"DIN Alternate", "PingFang SC", system-ui, sans-serif',
  'SF Pro': 'system-ui, -apple-system, sans-serif',
}
function fontStack(family: string | null): string | undefined {
  if (!family) return undefined
  return FONT_STACKS[family] ?? `"${family}", system-ui, sans-serif`
}

export function PositionedText(n: PositionedTextProps) {
  const slack = n.text.includes('\n') ? 0 : Math.ceil(n.fontSize * 0.6)
  return (
    <div
      data-testid="scene-text"
      style={{
        position: 'absolute',
        left: n.x - slack / 2,
        top: n.y,
        width: n.w + slack,
        fontFamily: fontStack(n.fontFamily),
        fontSize: n.fontSize,
        fontWeight: n.fontWeight,
        color: n.color,
        textAlign: n.align as 'left' | 'center' | 'right',
        lineHeight: n.lineHeight ? `${n.lineHeight}px` : undefined,
        letterSpacing: n.letterSpacing ? `${n.letterSpacing}px` : undefined,
        whiteSpace: 'pre-wrap',
        ...(n.stroke
          ? {
              WebkitTextStrokeColor: n.stroke.color,
              WebkitTextStrokeWidth: `${n.stroke.width}px`,
              paintOrder: 'stroke fill',
            }
          : {}),
      }}
    >
      {n.runs
        ? n.runs.map((r, j) => (
            <span key={j} style={{ color: r.color }}>
              {r.text}
            </span>
          ))
        : n.text}
    </div>
  )
}
```

- [ ] **Step 4: Run the PositionedText test to verify it passes**

Run: `npx vitest run src/components/PositionedText/PositionedText.test.tsx`
Expected: PASS.

- [ ] **Step 5: Render SceneRenderer text via `<PositionedText>`**

In `src/components/SceneRenderer/SceneRenderer.tsx`:

1. Add the import at the top:

```tsx
import { PositionedText } from '../PositionedText/PositionedText'
```

2. DELETE the local `FONT_STACKS` constant and the `fontStack` function (now in `PositionedText`).

3. Replace the entire `text`-node render branch (the block starting with the `// Our system font renders a hair wider…` comment and the `slack` line through the closing `</div>` and `)` of that branch) with:

```tsx
        return (
          <PositionedText
            key={i}
            x={n.x}
            y={n.y}
            w={n.w}
            h={n.h}
            text={n.text}
            runs={n.runs}
            fontFamily={n.fontFamily}
            fontSize={n.fontSize}
            fontWeight={n.fontWeight}
            color={n.color}
            align={n.align}
            lineHeight={n.lineHeight}
            letterSpacing={n.letterSpacing}
            stroke={n.stroke}
          />
        )
```

(The `pos` object is no longer used by the text branch; leave it for the rect/img branches. If TypeScript flags `pos` as unused only in this branch, that's fine — it's still used by the others.)

- [ ] **Step 6: Run the full suite (SceneRenderer behavior preserved)**

Run: `npx vitest run`
Expected: PASS — `SceneRenderer.test.tsx` (unchanged) still passes, proving the extraction is behavior-preserving, plus the new `PositionedText` tests.

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/PositionedText/ src/components/SceneRenderer/SceneRenderer.tsx
git commit -m "refactor: extract PositionedText from SceneRenderer (shared text renderer)"
```

---

## Self-Review

**Spec coverage (Parts A + C of the emitter spec):**
- IR `content.style` enriched to the full field set + `runs` → Task 1. ✓
- Shared helpers lifted to `scripts/lib/figma.mjs` → Task 1. ✓
- `build-section-scene.mjs` behaviour unchanged → not touched this plan (it keeps its own text logic; PositionedText extraction is in the React renderer, whose tests guard it). ✓
- `<PositionedText>` extracted, behavior-preserving → Task 2 (guarded by `SceneRenderer.test.tsx`). ✓
- Parts B (emitter) + D (demo screen) → the NEXT plan; out of scope here. ✓

**Placeholder scan:** none — all steps have literal code/commands.

**Type consistency:** `textStyle`/`textRuns` signatures match between lib (Task 1 Step 3), the lib tests (Step 1), and `build-ir`'s usage (Step 5). `PositionedTextProps` fields match `SceneTextNode`'s fields (`SceneRenderer` passes them through in Task 2 Step 5), so the prop names align.
