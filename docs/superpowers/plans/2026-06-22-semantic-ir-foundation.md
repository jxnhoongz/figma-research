# Semantic IR Foundation (P1+P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `build-ir.mjs` analysis step that turns a plugin export (structure JSON + manifest) into a semantic IR tree (`ir.json`) — roles + data, no codegen, no app changes.

**Architecture:** Extract the fill/box/screen helpers shared with the scene generator into `scripts/lib/figma.mjs`, then build `buildIR(doc, screenName, manifest)` on top: a pre-order walk that tags each node `content | interactive | component | asset | layout` per the spec's conservative split rule, with dual-capture for components. A thin CLI wrapper writes `ir.json`. Validated against a committed fixture.

**Tech Stack:** Node ESM (`.mjs`), Vitest (already in project), no new dependencies.

## Global Constraints

- Node ESM modules (`.mjs`), no TypeScript in scripts.
- No new npm dependencies.
- No behavioral change to `build-section-scene.mjs` or the app — only a behavior-preserving helper extraction.
- IR coordinates are normalised to the screen's top-left.
- Classification order (verbatim from spec): `content` → `interactive` → `component` → `asset` → `layout` → skip.
- Interactive heuristic: `/(button|btn|cta|tab|claim|submit|领取|立即|提交)/i` AND node is `INSTANCE`/`COMPONENT` or in the manifest.

---

## File Structure

- Create `scripts/lib/figma.mjs` — shared pure helpers: `exportable`, `area`, `hex`, `compositeFills`, `gradientCss`, `bgFromFills`, `makeBox`, `findScreen`.
- Create `scripts/lib/figma.test.mjs` — unit tests for the helpers.
- Modify `scripts/build-section-scene.mjs` — import the helpers, delete the local copies (behavior-preserving).
- Create `scripts/__fixtures__/reward-grid.structure.json` — trimmed JSON_REST_V1 fixture.
- Create `scripts/__fixtures__/reward-grid.manifest.json` — matching manifest.
- Create `scripts/build-ir.mjs` — `buildIR()` + CLI wrapper.
- Create `scripts/build-ir.test.mjs` — fixture-based structural assertions.
- Modify `docs/components.map.md` and `README.md` — document the structured-mode step.

---

## Task 1: Shared Figma helpers library

**Files:**
- Create: `scripts/lib/figma.mjs`
- Create: `scripts/lib/figma.test.mjs`
- Modify: `scripts/build-section-scene.mjs`

**Interfaces:**
- Produces:
  - `exportable(node) -> boolean`
  - `area(node) -> number`
  - `hex({r,g,b}) -> string`
  - `compositeFills(fills) -> string | null`
  - `gradientCss(fill) -> string`
  - `bgFromFills(node) -> { bg, opacity } | null`
  - `makeBox(ox, oy) -> (node) => {x,y,w,h} | null`
  - `findScreen(doc, idOrName) -> node | null`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/figma.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { exportable, area, hex, compositeFills, bgFromFills, makeBox, findScreen } from './figma.mjs'

const solid = (r, g, b, opacity) => ({ type: 'SOLID', color: { r, g, b }, ...(opacity !== undefined ? { opacity } : {}) })

describe('figma helpers', () => {
  it('hex formats a color', () => {
    expect(hex({ r: 1, g: 1, b: 1 })).toBe('#ffffff')
  })

  it('compositeFills layers a translucent black over a base (teal + 40% black -> darker teal)', () => {
    // #81ccd1 = (0.506, 0.8, 0.82)
    const c = compositeFills([solid(0.506, 0.8, 0.82), solid(0, 0, 0, 0.4)])
    expect(c).toBe('#4d7a7d')
  })

  it('compositeFills returns null when there are no solid fills', () => {
    expect(compositeFills([{ type: 'IMAGE' }])).toBeNull()
  })

  it('exportable rejects hidden and sub-pixel nodes', () => {
    expect(exportable({ visible: false, absoluteBoundingBox: { width: 10, height: 10 } })).toBe(false)
    expect(exportable({ absoluteBoundingBox: { width: 0.5, height: 10 } })).toBe(false)
    expect(exportable({ absoluteBoundingBox: { width: 10, height: 10 } })).toBe(true)
  })

  it('area multiplies the bounding box', () => {
    expect(area({ absoluteBoundingBox: { width: 4, height: 5 } })).toBe(20)
    expect(area({})).toBe(0)
  })

  it('bgFromFills picks the first visible non-image fill', () => {
    expect(bgFromFills({ fills: [solid(1, 0, 0)] })).toEqual({ bg: '#ff0000', opacity: 1 })
    expect(bgFromFills({ fills: [] })).toBeNull()
  })

  it('makeBox normalises to the given origin', () => {
    const box = makeBox(100, 200)
    expect(box({ absoluteBoundingBox: { x: 110, y: 220, width: 30, height: 40 } })).toEqual({ x: 10, y: 20, w: 30, h: 40 })
    expect(box({})).toBeNull()
  })

  it('findScreen matches by id or name', () => {
    const doc = { id: '0:0', children: [{ id: '1:1', name: 'A', children: [{ id: '1:2', name: 'Target' }] }] }
    expect(findScreen(doc, '1:2').name).toBe('Target')
    expect(findScreen(doc, 'A').id).toBe('1:1')
    expect(findScreen(doc, 'nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/figma.test.mjs`
Expected: FAIL — `Failed to resolve import "./figma.mjs"` (file doesn't exist yet).

- [ ] **Step 3: Create the helpers module**

Create `scripts/lib/figma.mjs`:

```js
// Shared, pure Figma-JSON helpers used by both the scene generator and the IR
// builder. Keeping them in one place stops the two from drifting.

export const exportable = (n) => {
  if (n.visible === false) return false;
  const b = n.absoluteBoundingBox;
  if (b && (b.width < 1 || b.height < 1)) return false;
  return true;
};

export const area = (n) => {
  const b = n.absoluteBoundingBox;
  return b ? b.width * b.height : 0;
};

export const hex = (c) =>
  "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// Composite a stack of SOLID fills (Figma paints array index 0 = bottom, last =
// top) into one resolved colour, honouring per-fill opacity. Returns null if no
// solid fills.
export function compositeFills(fills) {
  const solids = (fills || []).filter((f) => f.type === "SOLID" && f.visible !== false);
  if (!solids.length) return null;
  let r = 0, g = 0, b = 0, a = 0;
  for (const f of solids) {
    const sa = f.opacity === undefined ? 1 : f.opacity;
    const na = sa + a * (1 - sa);
    if (na > 0) {
      r = (f.color.r * sa + r * a * (1 - sa)) / na;
      g = (f.color.g * sa + g * a * (1 - sa)) / na;
      b = (f.color.b * sa + b * a * (1 - sa)) / na;
    }
    a = na;
  }
  const to = (v) => Math.round(v * 255);
  if (a >= 0.999) return hex({ r, g, b });
  return `rgba(${to(r)}, ${to(g)}, ${to(b)}, ${a.toFixed(3)})`;
}

export function gradientCss(f) {
  const stops = (f.gradientStops || []).map((s) => `${hex(s.color)} ${Math.round(s.position * 100)}%`).join(", ");
  if (f.type === "GRADIENT_RADIAL") return `radial-gradient(circle, ${stops})`;
  const [p0, p1] = f.gradientHandlePositions || [{ x: 0, y: 0 }, { x: 0, y: 1 }];
  const ang = Math.round((Math.atan2(p1.x - p0.x, -(p1.y - p0.y)) * 180) / Math.PI);
  return `linear-gradient(${ang}deg, ${stops})`;
}

export function bgFromFills(n) {
  const f = (Array.isArray(n.fills) ? n.fills : []).find((x) => x.visible !== false && x.type !== "IMAGE");
  if (!f) return null;
  if (f.type === "SOLID") return { bg: hex(f.color), opacity: f.opacity ?? 1 };
  if (f.type.startsWith("GRADIENT")) return { bg: gradientCss(f), opacity: f.opacity ?? 1 };
  return null;
}

// Box normalised to a screen origin (ox, oy). Returns null when the node has no
// absolute box.
export const makeBox = (ox, oy) => (n) => {
  const b = n.absoluteBoundingBox;
  if (!b) return null;
  return { x: Math.round(b.x - ox), y: Math.round(b.y - oy), w: Math.round(b.width), h: Math.round(b.height) };
};

// Find a node by id OR name (sibling theme frames often share a name; an id is
// unambiguous).
export function findScreen(node, idOrName) {
  if (node.id === idOrName || node.name === idOrName) return node;
  for (const c of node.children || []) {
    const r = findScreen(c, idOrName);
    if (r) return r;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/figma.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Refactor `build-section-scene.mjs` to import the helpers**

In `scripts/build-section-scene.mjs`, add this import directly below the existing `node:path` import line:

```js
import { exportable, hex, compositeFills, gradientCss, bgFromFills, makeBox, findScreen } from "./lib/figma.mjs";
```

Then DELETE the now-duplicated local definitions from that file:
- the `const area = …` and `const exportable = …` block,
- the `const hex = …` line,
- the `function compositeFills(…) { … }` block,
- the `function gradientCss(…) { … }` block,
- the `function bgFromFills(…) { … }` block.

Replace the inline screen finder:

```js
const screen = (function find(n) { … })(doc);
```

with:

```js
const screen = findScreen(doc, screenName);
```

Replace the inline `const box = (n) => { … }` definition with:

```js
const box = makeBox(ox, oy);
```

(Leave `RECT_BG_TYPES`, `area` usage, and all scene-specific logic intact. Note: `area` is no longer used by the scene generator after the manifest refactor — if there are no remaining references, do not re-import it.)

- [ ] **Step 6: Verify nothing broke**

Run: `node --check scripts/build-section-scene.mjs`
Expected: no output (valid).

Run: `npx vitest run`
Expected: PASS — all existing tests (68) plus the 7 new helper tests.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/figma.mjs scripts/lib/figma.test.mjs scripts/build-section-scene.mjs
git commit -m "refactor: extract shared figma helpers into scripts/lib/figma.mjs"
```

---

## Task 2: IR test fixture

**Files:**
- Create: `scripts/__fixtures__/reward-grid.structure.json`
- Create: `scripts/__fixtures__/reward-grid.manifest.json`

**Interfaces:**
- Produces: a minimal `{ document }` tree + manifest exercising every role: a background (`asset`), a title (`content`), a flex grid (`layout`) of 3 same-component cards (`component` with text children), and a CTA instance (`interactive`).

- [ ] **Step 1: Create the structure fixture**

Create `scripts/__fixtures__/reward-grid.structure.json`:

```json
{
  "document": {
    "id": "0:0",
    "name": "Document",
    "type": "DOCUMENT",
    "children": [
      {
        "id": "1:1",
        "name": "opt1_点击领取 theme1",
        "type": "FRAME",
        "layoutMode": "NONE",
        "absoluteBoundingBox": { "x": 0, "y": 0, "width": 390, "height": 400 },
        "fills": [{ "type": "SOLID", "color": { "r": 0.506, "g": 0.8, "b": 0.82 } }],
        "children": [
          {
            "id": "1:2",
            "name": "bg-deco",
            "type": "VECTOR",
            "absoluteBoundingBox": { "x": 0, "y": 0, "width": 390, "height": 400 },
            "fills": []
          },
          {
            "id": "1:3",
            "name": "奖励预览-title",
            "type": "TEXT",
            "characters": "奖励预览",
            "absoluteBoundingBox": { "x": 20, "y": 20, "width": 120, "height": 30 },
            "style": { "fontFamily": "YouSheBiaoTiHei", "fontSize": 24, "fontWeight": 700, "textAlignHorizontal": "LEFT" },
            "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1 } }]
          },
          {
            "id": "1:4",
            "name": "grid",
            "type": "FRAME",
            "layoutMode": "HORIZONTAL",
            "itemSpacing": 10,
            "paddingLeft": 10, "paddingRight": 10, "paddingTop": 10, "paddingBottom": 10,
            "absoluteBoundingBox": { "x": 10, "y": 60, "width": 370, "height": 120 },
            "children": [
              {
                "id": "1:5", "name": "Card", "type": "INSTANCE", "componentId": "C:1",
                "absoluteBoundingBox": { "x": 20, "y": 70, "width": 80, "height": 100 },
                "children": [
                  { "id": "1:5:t", "name": "amount", "type": "TEXT", "characters": "28¥",
                    "absoluteBoundingBox": { "x": 40, "y": 130, "width": 40, "height": 16 },
                    "style": { "fontSize": 14, "fontWeight": 700, "textAlignHorizontal": "CENTER" },
                    "fills": [{ "type": "SOLID", "color": { "r": 0.9, "g": 0.3, "b": 0.2 } }] }
                ]
              },
              {
                "id": "1:6", "name": "Card", "type": "INSTANCE", "componentId": "C:1",
                "absoluteBoundingBox": { "x": 110, "y": 70, "width": 80, "height": 100 },
                "children": [
                  { "id": "1:6:t", "name": "amount", "type": "TEXT", "characters": "88¥",
                    "absoluteBoundingBox": { "x": 130, "y": 130, "width": 40, "height": 16 },
                    "style": { "fontSize": 14, "fontWeight": 700, "textAlignHorizontal": "CENTER" },
                    "fills": [{ "type": "SOLID", "color": { "r": 0.9, "g": 0.3, "b": 0.2 } }] }
                ]
              },
              {
                "id": "1:7", "name": "Card", "type": "INSTANCE", "componentId": "C:1",
                "absoluteBoundingBox": { "x": 200, "y": 70, "width": 80, "height": 100 },
                "children": [
                  { "id": "1:7:t", "name": "amount", "type": "TEXT", "characters": "188¥",
                    "absoluteBoundingBox": { "x": 220, "y": 130, "width": 40, "height": 16 },
                    "style": { "fontSize": 14, "fontWeight": 700, "textAlignHorizontal": "CENTER" },
                    "fills": [{ "type": "SOLID", "color": { "r": 0.9, "g": 0.3, "b": 0.2 } }] }
                ]
              }
            ]
          },
          {
            "id": "1:8", "name": "立即领取-button", "type": "INSTANCE", "componentId": "C:2",
            "absoluteBoundingBox": { "x": 20, "y": 200, "width": 350, "height": 50 },
            "children": [
              { "id": "1:8:t", "name": "label", "type": "TEXT", "characters": "立即领取",
                "absoluteBoundingBox": { "x": 160, "y": 215, "width": 80, "height": 20 },
                "style": { "fontSize": 16, "fontWeight": 700, "textAlignHorizontal": "CENTER" },
                "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1 } }] }
            ]
          }
        ]
      }
    ]
  },
  "components": {
    "C:1": { "key": "cardkey", "name": "Reward Card" },
    "C:2": { "key": "btnkey", "name": "Button" }
  }
}
```

- [ ] **Step 2: Create the manifest fixture**

Create `scripts/__fixtures__/reward-grid.manifest.json`:

```json
{
  "1:2": "png/bg-deco_1-2.png",
  "1:5": "png/Card_1-5.png",
  "1:6": "png/Card_1-6.png",
  "1:7": "png/Card_1-7.png",
  "1:8": "svg/Button_1-8.svg"
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/__fixtures__/reward-grid.structure.json scripts/__fixtures__/reward-grid.manifest.json
git commit -m "test: add reward-grid IR fixture (structure + manifest)"
```

---

## Task 3: `buildIR` + CLI

**Files:**
- Create: `scripts/build-ir.mjs`
- Create: `scripts/build-ir.test.mjs`

**Interfaces:**
- Consumes: `findScreen`, `makeBox`, `exportable`, `compositeFills` from `scripts/lib/figma.mjs`.
- Produces: `buildIR(doc, screenIdOrName, manifest) -> { name, width, height, root: IRNode } | null`, where `IRNode = { id, name, role, box, [layout|component|content|interactive|asset], children? }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/build-ir.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildIR } from './build-ir.mjs'

const fx = (f) => JSON.parse(readFileSync(join('scripts/__fixtures__', f), 'utf8'))
const doc = fx('reward-grid.structure.json').document
const manifest = fx('reward-grid.manifest.json')

// Depth-first collect of every IR node.
function flatten(node, acc = []) {
  acc.push(node)
  ;(node.children || []).forEach((c) => flatten(c, acc))
  return acc
}

describe('buildIR', () => {
  const ir = buildIR(doc, '1:1', manifest)
  const all = flatten(ir.root)

  it('normalises dimensions to the screen', () => {
    expect(ir.width).toBe(390)
    expect(ir.height).toBe(400)
    expect(ir.root.role).toBe('layout')
  })

  it('tags the background vector as an asset (baked), not layout', () => {
    const bg = all.find((n) => n.id === '1:2')
    expect(bg.role).toBe('asset')
    expect(bg.asset.src).toBe('png/bg-deco_1-2.png')
    expect(bg.children).toBeUndefined()
  })

  it('tags the title as content', () => {
    const title = all.find((n) => n.id === '1:3')
    expect(title.role).toBe('content')
    expect(title.content.text).toBe('奖励预览')
    expect(title.content.style.fontFamily).toBe('YouSheBiaoTiHei')
  })

  it('tags the grid as a flex-row layout', () => {
    const grid = all.find((n) => n.id === '1:4')
    expect(grid.role).toBe('layout')
    expect(grid.layout.mode).toBe('flex')
    expect(grid.layout.direction).toBe('row')
    expect(grid.layout.gap).toBe(10)
  })

  it('tags each card as a recurring component with baked asset + text content', () => {
    const cards = all.filter((n) => n.role === 'component' && n.component.key === 'C:1')
    expect(cards).toHaveLength(3)
    for (const c of cards) {
      expect(c.component.instanceCount).toBe(3)
      expect(c.asset.src).toMatch(/^png\/Card_/)
    }
    const amounts = all.filter((n) => n.role === 'content' && n.content.text.endsWith('¥')).map((n) => n.content.text)
    expect(amounts).toEqual(expect.arrayContaining(['28¥', '88¥', '188¥']))
  })

  it('tags the CTA instance as interactive (not component)', () => {
    const cta = all.find((n) => n.id === '1:8')
    expect(cta.role).toBe('interactive')
    expect(cta.interactive.kind).toBe('button')
    expect(cta.interactive.label).toBe('立即领取')
    expect(cta.asset.src).toBe('svg/Button_1-8.svg')
  })

  it('does NOT mistag the screen frame as interactive despite "领取" in its name', () => {
    expect(ir.root.role).toBe('layout')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/build-ir.test.mjs`
Expected: FAIL — `Failed to resolve import "./build-ir.mjs"`.

- [ ] **Step 3: Implement `build-ir.mjs`**

Create `scripts/build-ir.mjs`:

```js
// Builds a semantic IR (intermediate representation) from a plugin export:
// a role-tagged tree (content | interactive | component | asset | layout) that
// downstream codegen consumes. No code emission here — pure analysis.
//
// Usage:
//   node scripts/build-ir.mjs <unpackedExportDir> "<screen id|name>" <out.json>

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { exportable, makeBox, findScreen, compositeFills } from "./lib/figma.mjs";

const INTERACTIVE_RE = /(button|btn|cta|tab|claim|submit|领取|立即|提交)/i;
const isContainer = (t) => t === "FRAME" || t === "GROUP" || t === "SECTION";

function textStyle(n) {
  const st = n.style || {};
  return {
    fontFamily: st.fontFamily || null,
    fontSize: Math.round(st.fontSize || 14),
    fontWeight: st.fontWeight || 400,
    color: compositeFills(n.fills) || "#000",
    align: (st.textAlignHorizontal || "LEFT").toLowerCase(),
  };
}

function layoutInfo(n) {
  if (!n.layoutMode || n.layoutMode === "NONE") return { mode: "absolute" };
  return {
    mode: "flex",
    direction: n.layoutMode === "HORIZONTAL" ? "row" : "column",
    gap: n.itemSpacing || 0,
    padding: {
      top: n.paddingTop || 0,
      right: n.paddingRight || 0,
      bottom: n.paddingBottom || 0,
      left: n.paddingLeft || 0,
    },
  };
}

function interactiveKind(name) {
  const s = (name || "").toLowerCase();
  if (/tab/.test(s)) return "tab";
  return "button";
}

function firstText(n) {
  let found = null;
  (function w(x) {
    if (found) return;
    if (x.type === "TEXT" && x.characters) { found = x.characters; return; }
    (x.children || []).forEach(w);
  })(n);
  return found;
}

export function buildIR(doc, screenIdOrName, manifest = {}) {
  const screen = findScreen(doc, screenIdOrName);
  if (!screen) return null;
  const ob = screen.absoluteBoundingBox;
  const box = makeBox(ob.x, ob.y);

  // Count componentId occurrences within the screen for instanceCount.
  const instanceCounts = {};
  (function count(n) {
    if (n.componentId) instanceCounts[n.componentId] = (instanceCounts[n.componentId] || 0) + 1;
    (n.children || []).forEach(count);
  })(screen);

  // Interactive only fires on instances/components or baked nodes (guard) so a
  // container whose name merely contains a keyword isn't treated as a button.
  const isInteractive = (n) =>
    INTERACTIVE_RE.test(n.name || "") &&
    (n.type === "INSTANCE" || n.type === "COMPONENT" || manifest[n.id]);

  const buildChildren = (n) => (n.children || []).map(build).filter(Boolean);

  function build(n) {
    if (!exportable(n)) return null;
    const b = box(n);
    if (!b) return null;
    const base = { id: n.id, name: n.name || n.type, box: b };
    const src = manifest[n.id];

    if (n.type === "TEXT") {
      return { ...base, role: "content", content: { text: n.characters || "", style: textStyle(n) } };
    }
    if (isInteractive(n)) {
      return {
        ...base, role: "interactive",
        interactive: { kind: interactiveKind(n.name), label: firstText(n) },
        ...(src ? { asset: { src } } : {}),
        children: buildChildren(n),
      };
    }
    if (n.type === "INSTANCE" || n.type === "COMPONENT") {
      return {
        ...base, role: "component",
        component: { key: n.componentId || n.id, instanceCount: instanceCounts[n.componentId] || 1 },
        ...(src ? { asset: { src } } : {}),
        children: buildChildren(n),
      };
    }
    if (src) {
      return { ...base, role: "asset", asset: { src } };
    }
    if (isContainer(n.type)) {
      return { ...base, role: "layout", layout: layoutInfo(n), children: buildChildren(n) };
    }
    return null; // decorative leaf, not baked — no contribution
  }

  const root = build(screen);
  const sb = box(screen);
  return { name: screenIdOrName, width: sb.w, height: sb.h, root };
}

// --- CLI ---
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/build-ir.mjs")) {
  const [, , exportDir, screenName, outPath] = process.argv;
  if (!exportDir || !screenName || !outPath) {
    console.error('usage: build-ir.mjs <exportDir> "<screen id|name>" <out.json>');
    process.exit(1);
  }
  const structDir = join(exportDir, "structure");
  const doc = JSON.parse(
    readFileSync(join(structDir, readdirSync(structDir).find((f) => f.endsWith(".json"))), "utf8"),
  ).document;
  const manifestPath = join(exportDir, "manifest.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  const ir = buildIR(doc, screenName, manifest);
  if (!ir) { console.error("screen not found:", screenName); process.exit(1); }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(ir, null, 2));
  const counts = {};
  (function tally(node) {
    counts[node.role] = (counts[node.role] || 0) + 1;
    (node.children || []).forEach(tally);
  })(ir.root);
  console.log(`IR: ${JSON.stringify(counts)} -> ${outPath}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/build-ir.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-ir.mjs scripts/build-ir.test.mjs
git commit -m "feat: build-ir — semantic IR from a plugin export (P1+P2)"
```

---

## Task 4: Document the structured mode

**Files:**
- Modify: `docs/components.map.md`
- Modify: `README.md`

- [ ] **Step 1: Add an IR note to `docs/components.map.md`**

Append this section to the end of `docs/components.map.md`:

```markdown
## Structured mode (experimental) — `build-ir.mjs`

`scripts/build-ir.mjs <unpackDir> "<screen id|name>" ir.json` turns an export
into a semantic IR (roles: layout/component/content/interactive/asset) — the
foundation for emitting componentized, data-driven code (vs the flat scene the
renderer uses today). Pure analysis; no code emission yet. Shares fill/box
helpers with the scene generator via `scripts/lib/figma.mjs`. Spec:
`docs/superpowers/specs/2026-06-22-semantic-ir-foundation-design.md`.
```

- [ ] **Step 2: Add a line to the README pipeline section**

In `README.md`, immediately after the fenced pipeline diagram block in the
"## The pipeline (efficiency-first)" section, add:

```markdown
> **Structured mode (WIP):** `scripts/build-ir.mjs` produces a semantic IR
> (role-tagged tree) from the same export — the foundation for componentized,
> data-driven, API-ready output. See the limitations section.
```

- [ ] **Step 3: Commit**

```bash
git add docs/components.map.md README.md
git commit -m "docs: document experimental structured (IR) mode"
```

---

## Self-Review

**Spec coverage:**
- Goal (standalone IR step, no codegen) → Task 3. ✓
- Inputs/invocation/output shape → Task 3 CLI + `buildIR`. ✓
- Role taxonomy (5 roles) → Task 3 `build()`. ✓
- Split rule order (content → interactive → component → asset → layout → skip) → Task 3 `build()`. ✓
- Interactive heuristic + guard → Task 3 `isInteractive`. ✓
- Dual-capture (component keeps asset.src + children) → Task 3 component branch + test. ✓
- IR schema fields → Task 3 + asserted in Task 3 test. ✓
- Detection signals (layoutMode, componentId, style) → Task 3 `layoutInfo`/`textStyle`/counts. ✓
- Validation via committed fixture → Tasks 2 + 3. ✓
- Shared-helper extraction (in-scope refactor) → Task 1. ✓
- Coexists with scene pipeline, no behavior change → Task 1 verified by full test run. ✓

**Placeholder scan:** none — every step has literal code/commands.

**Type consistency:** `buildIR(doc, screenIdOrName, manifest)` signature, IR node keys (`role`, `box`, `content.style`, `component.key`/`instanceCount`, `interactive.kind`/`label`, `asset.src`, `layout.mode`/`direction`/`gap`/`padding`) are identical between Task 3's implementation and Task 3's test, and the fixture (Task 2) ids/values match the test's assertions.
