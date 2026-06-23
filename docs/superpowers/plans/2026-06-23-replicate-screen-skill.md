# replicate-screen Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an agent-driven `replicate-screen` skill that synthesizes a Figma screen into React by reusing/creating library components against a ground-truth render, plus the small supporting tooling it needs.

**Architecture:** Layer 1 (plugin + `build-ir`) already turns Figma into a role-tagged IR + assets. This plan adds (a) a flat full-screen ground-truth PNG to the plugin export, (b) a pure pixel-diff helper + a Playwright screenshot CLI for the skill's verify loop, and (c) the `skills/replicate-screen/SKILL.md` procedure the agent follows. The skill is a *procedure for an agent*, not a deterministic emitter; the supporting scripts are deterministic and unit-tested.

**Tech Stack:** Node ESM scripts, Vitest, Figma Plugin API (`code.js`, sandbox), Playwright (via `npx`), `pixelmatch` + `pngjs` (new devDeps), React 19 + Tailwind v4.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-replicate-screen-skill.md` (the source of truth for the procedure).
- The skill guarantees **integration-ready seams, never behavior** — interactive components expose typed `onX` callbacks; the skill wires nothing. The single mock interaction lives only in the demo wrapper.
- Confidence ladder per region: **REUSE** (matches `docs/components.map.md`) → **CREATE + REGISTER** (build under `src/components/<Name>/`, add a row to `docs/components.map.md`) → **BAKE** (`asset`-role art → `<img>`). Prefer REUSE > CREATE > BAKE.
- Styling: Tailwind `@theme` tokens from `src/index.css`; **never hardcode hex/spacing**. Missing token → add to `@theme` first.
- Components: one component per folder, co-located `*.test.tsx`, assert behavior via `data-variant`, immutable props-in/JSX-out.
- Commits: short conventional-commit messages, ending `Co-Authored-By: Claude <noreply@anthropic.com>`.
- The skill never claims 1:1 if the diff says otherwise; unresolved regions are reported, not hidden.

---

### Task 1: Plugin emits a flat full-screen ground-truth render

**Files:**
- Modify: `figma-plugin/code.js:312` (inside the `for (const root of sel)` loop in `run()`, right after `await walk(root, files);`)

**Interfaces:**
- Produces: a new export file per selected root at `render/<safeName(root)>.png` (`kind: "base64"`). The importer (`scripts/import-figma-export.mjs:32`) already writes `kind:"base64"` files to disk — **no importer change needed**. Downstream (the skill's verify loop) reads `render/<name>.png` as the ground-truth reference.

The plugin runs in the Figma sandbox and has no Node test harness in this repo, so this task is verified by `node --check` (syntax) plus a documented manual re-export. `PNG_SCALE` (=2) and `safeName` already exist in the file.

- [ ] **Step 1: Add the full-screen render inside the export loop**

In `figma-plugin/code.js`, change the loop body in `run()` from:

```js
    await walk(root, files);
  }
```

to:

```js
    await walk(root, files);
    // Flat full-screen render = the ground-truth reference the replicate-screen
    // skill diffs generated output against (diffing our own baked scene would be
    // circular). Best-effort: on failure, skip — the rest of the export stands.
    try {
      files.push({
        path: `render/${safeName(root)}.png`,
        kind: "base64",
        data: figma.base64Encode(
          await root.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: PNG_SCALE } }),
        ),
      });
    } catch (e) {
      figma.ui.postMessage({ type: "log", msg: "full-screen render failed: " + (e && e.message) });
    }
  }
```

- [ ] **Step 2: Verify the file parses**

Run: `node --check figma-plugin/code.js`
Expected: no output, exit 0.

- [ ] **Step 3: Document the manual re-export check**

The render only appears when the plugin runs in Figma. Note in the commit body: "verify by re-exporting any screen and confirming `render/<name>.png` is a full-screen image." Do not block the plan on a live Figma run; downstream tasks fall back to a baked-scene screenshot as an interim reference (Task 5).

- [ ] **Step 4: Commit**

```bash
git add figma-plugin/code.js
git commit -m "feat: plugin exports a flat full-screen ground-truth render

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Pure pixel-diff helper (`diffPngs`)

**Files:**
- Create: `scripts/lib/visual-diff.mjs`
- Test: `scripts/lib/visual-diff.test.mjs`
- Modify: `package.json` (add `pixelmatch` + `pngjs` devDeps)

**Interfaces:**
- Produces: `diffPngs(aBuffer: Buffer, bBuffer: Buffer, opts?: { threshold?: number }) -> { ratio: number, changed: number, total: number, diffBuffer: Buffer }`. `ratio` = changed pixels / total pixels (0..1). Throws on dimension mismatch with a message naming both sizes. Consumed by Task 3's CLI.

- [ ] **Step 1: Install the diff libraries**

Run: `npm install -D pixelmatch pngjs`
Expected: both added under `devDependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

Create `scripts/lib/visual-diff.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { diffPngs } from './visual-diff.mjs'

// Build a solid-colour W×H PNG buffer.
function solid(w, h, [r, g, b]) {
  const png = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = r
    png.data[i * 4 + 1] = g
    png.data[i * 4 + 2] = b
    png.data[i * 4 + 3] = 255
  }
  return PNG.sync.write(png)
}
// Build a PNG that is `red` on the left half, `blue` on the right half.
function halfHalf(w, h) {
  const png = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const left = x < w / 2
      png.data[i] = left ? 255 : 0
      png.data[i + 1] = 0
      png.data[i + 2] = left ? 0 : 255
      png.data[i + 3] = 255
    }
  return PNG.sync.write(png)
}

describe('diffPngs', () => {
  it('reports zero ratio for identical images', () => {
    const a = solid(4, 4, [255, 0, 0])
    const out = diffPngs(a, solid(4, 4, [255, 0, 0]))
    expect(out.ratio).toBe(0)
    expect(out.total).toBe(16)
  })

  it('reports the changed fraction for a half-changed image', () => {
    const out = diffPngs(solid(4, 4, [255, 0, 0]), halfHalf(4, 4))
    // right half (8 of 16 px) changed from red to blue
    expect(out.changed).toBe(8)
    expect(out.ratio).toBeCloseTo(0.5, 5)
    expect(out.diffBuffer.length).toBeGreaterThan(0)
  })

  it('throws on dimension mismatch naming both sizes', () => {
    expect(() => diffPngs(solid(4, 4, [0, 0, 0]), solid(8, 8, [0, 0, 0]))).toThrow(/4x4.*8x8/)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run scripts/lib/visual-diff.test.mjs`
Expected: FAIL — `Cannot find module './visual-diff.mjs'`.

- [ ] **Step 4: Implement `diffPngs`**

Create `scripts/lib/visual-diff.mjs`:

```js
// Pure pixel-diff of two PNG buffers — the objective gate for the
// replicate-screen verify loop. Wraps pixelmatch; no I/O, no Playwright.
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

export function diffPngs(aBuffer, bBuffer, { threshold = 0.1 } = {}) {
  const a = PNG.sync.read(aBuffer)
  const b = PNG.sync.read(bBuffer)
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`diffPngs: size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`)
  }
  const diff = new PNG({ width: a.width, height: a.height })
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold })
  const total = a.width * a.height
  return { ratio: changed / total, changed, total, diffBuffer: PNG.sync.write(diff) }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run scripts/lib/visual-diff.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/visual-diff.mjs scripts/lib/visual-diff.test.mjs package.json package-lock.json
git commit -m "feat: diffPngs pixel-diff helper for the verify loop

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Screenshot + diff CLI (`verify-screen.mjs`)

**Files:**
- Create: `scripts/verify-screen.mjs`

**Interfaces:**
- Consumes: `diffPngs` from `scripts/lib/visual-diff.mjs`.
- Produces: a CLI `node scripts/verify-screen.mjs <url> <referencePng> <outDir>` that screenshots `<url>`'s `[data-testid="scene-root"]` element (full screen container), writes `<outDir>/actual.png` + `<outDir>/diff.png`, prints a JSON line `{"ratio":<n>,"changed":<n>,"total":<n>}`, and exits non-zero if `ratio > 0.05`. Playwright is invoked via the repo's existing `npx playwright` availability. The skill's assembled screen must mount a `[data-testid="scene-root"]` wrapper at the screen's natural size.

This task is verified by running it against two known PNGs (no unit test — it shells out to a browser).

- [ ] **Step 1: Implement the CLI**

Create `scripts/verify-screen.mjs`:

```js
// Screenshot a rendered screen and diff it against a ground-truth render.
// Usage: node scripts/verify-screen.mjs <url> <referencePng> <outDir>
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { diffPngs } from './lib/visual-diff.mjs'

const [, , url, referencePng, outDir] = process.argv
if (!url || !referencePng || !outDir) {
  console.error('usage: verify-screen.mjs <url> <referencePng> <outDir>')
  process.exit(2)
}
const FAIL_RATIO = 0.05

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  await page.goto(url, { waitUntil: 'networkidle' })
  const el = await page.waitForSelector('[data-testid="scene-root"]', { timeout: 10000 })
  const actual = await el.screenshot()
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'actual.png'), actual)
  const { ratio, changed, total, diffBuffer } = diffPngs(readFileSync(referencePng), actual)
  writeFileSync(join(outDir, 'diff.png'), diffBuffer)
  console.log(JSON.stringify({ ratio, changed, total }))
  process.exit(ratio > FAIL_RATIO ? 1 : 0)
} finally {
  await browser.close()
}
```

- [ ] **Step 2: Smoke-test the diff path against two known images**

Run (creates two solid PNGs, expects a high ratio + non-zero exit):

```bash
node -e '
import("pngjs").then(({PNG})=>{
  const mk=(c)=>{const p=new PNG({width:8,height:8});for(let i=0;i<64;i++){p.data[i*4]=c;p.data[i*4+1]=0;p.data[i*4+2]=0;p.data[i*4+3]=255;}return PNG.sync.write(p);}
  require("node:fs").writeFileSync("/tmp/ref.png",mk(255));
  require("node:fs").writeFileSync("/tmp/act.png",mk(0));
  const {diffPngs}=await import("./scripts/lib/visual-diff.mjs");
  const r=diffPngs(require("node:fs").readFileSync("/tmp/ref.png"),require("node:fs").readFileSync("/tmp/act.png"));
  console.log("ratio",r.ratio); process.exit(r.ratio>0.05?0:1);
});'
```

Expected: prints `ratio 1` and exits 0 (the helper path works). This exercises `diffPngs` end-to-end without a browser; the Playwright path is exercised live in Task 5.

- [ ] **Step 3: Verify the CLI arg-guard**

Run: `node scripts/verify-screen.mjs`
Expected: prints the usage line, exits 2.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-screen.mjs
git commit -m "feat: verify-screen CLI (screenshot + diff vs ground truth)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Author `skills/replicate-screen/SKILL.md`

**Files:**
- Create: `skills/replicate-screen/SKILL.md`
- Test: `skills/replicate-screen/SKILL.test.mjs`

**Interfaces:**
- Produces: the skill procedure document. Consumed by a human/agent invoking the skill. The test asserts the doc contains the required structural sections so the procedure can't silently lose a step.

- [ ] **Step 1: Write the failing structure test**

Create `skills/replicate-screen/SKILL.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const doc = readFileSync(new URL('./SKILL.md', import.meta.url), 'utf8')

describe('replicate-screen SKILL.md', () => {
  it('has frontmatter name + description', () => {
    expect(doc).toMatch(/^---\nname: replicate-screen\n/)
    expect(doc).toMatch(/\ndescription: .+\n/)
  })

  it('documents the full procedure: inventory → ladder → seams → assemble → verify → mock', () => {
    for (const heading of [
      '## 1. Inventory',
      '## 2. Decide per region',
      '## 2b. Integration-ready seams',
      '## 3. Assemble',
      '## 4. Verify',
      '## 5. Mock interaction',
      '## 6. Output',
    ]) {
      expect(doc).toContain(heading)
    }
  })

  it('encodes the confidence ladder + reuse-first + tokens-not-hex rules', () => {
    expect(doc).toContain('REUSE')
    expect(doc).toContain('CREATE + REGISTER')
    expect(doc).toContain('BAKE')
    expect(doc).toMatch(/components\.map\.md/)
    expect(doc).toMatch(/@theme/)
    expect(doc).toMatch(/verify-screen\.mjs/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run skills/replicate-screen/SKILL.test.mjs`
Expected: FAIL — cannot read `./SKILL.md`.

- [ ] **Step 3: Write the SKILL.md**

Create `skills/replicate-screen/SKILL.md`:

```markdown
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

## 6. Output + report

Deliver: the screen component, any new `src/components/*`, the updated
`docs/components.map.md`, the one mock-wired demo interaction, and the synthesis
log (per-region disposition + justification + final `ratio`). The log's
reuse-vs-create-vs-bake counts are the research result.

## Failure handling

- Missing prerequisite → stop, name what's missing and how to produce it.
- No confident disposition → BAKE and log it as a GAP (never silently omit).
- Diff won't converge within the cap → stop, report residual ratio + the regions
  still off.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run skills/replicate-screen/SKILL.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/replicate-screen/SKILL.md skills/replicate-screen/SKILL.test.mjs
git commit -m "feat: replicate-screen SKILL.md procedure + structure test

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Calibration run on section 3 (empirical acceptance)

This is an **integration milestone**, not a unit test: it exercises the whole skill on a screen whose components already exist, proving the REUSE path and the verify loop. Drive it by invoking the skill; do not write new deterministic code.

**Files:**
- Create (skill output): `src/screens/Section3Replicated/Section3Replicated.tsx` (+ its `*.test.tsx` and demo wrapper), reusing existing `src/components/*`.
- Modify: `src/App.tsx` (add a `点击领取 (replicated)` tab so the verify loop can screenshot it), `docs/components.map.md` (only if a CREATE happens).
- Use: `figma-export-section3-v3` (re-unpack from `~/Downloads/figma-export-section3-v3.json` via `node scripts/import-figma-export.mjs`).

**Interfaces:**
- Consumes: Tasks 1–4 (ground-truth render if available, `verify-screen.mjs`, the SKILL.md procedure).
- Produces: a reconstructed section-3 screen + a synthesis log committed at `docs/superpowers/notes/2026-06-23-section3-replication-log.md`.

- [ ] **Step 1: Prepare inputs**

```bash
node scripts/import-figma-export.mjs ~/Downloads/figma-export-section3-v3.json figma-export-section3-v3
node scripts/build-ir.mjs figma-export-section3-v3 "1:33188" > /tmp/section3.ir.json
```
Expected: IR JSON on disk. If `figma-export-section3-v3/render/*.png` is absent (export predates Task 1), set the reference to a one-off screenshot of the existing baked `点击领取` tab and note "interim reference (baked scene)" in the log.

- [ ] **Step 2: Invoke the skill**

Follow `skills/replicate-screen/SKILL.md` end-to-end against the section-3 IR. Expected dispositions (acceptance):
- REUSE `<Button>` for 立即领取, `<RewardTable>` for the 活动详情 table, `<SectionHeader>`/`<NavHeader>` where they match `docs/components.map.md`.
- REUSE or CREATE the reward grid (the deterministic emitter's `RewardCard` is a reference, not a dependency — the agent may reuse the existing `<RewardCard>` library component).
- BAKE only the banner/mascot art.
Record every disposition + justification in the log.

- [ ] **Step 3: Wire the one mock interaction**

In the demo wrapper only, wire 立即领取 `onClaim` → local `useState` that marks a reward claimed and advances the progress value. Add a test asserting the click updates state (`data-variant`/text changes).

- [ ] **Step 4: Run the verify loop**

```bash
npx vite --port 4350 &
node scripts/verify-screen.mjs http://localhost:4350/?tab=section3r <reference.png> /tmp/section3-verify
```
Expected: `ratio <= 0.05`, or an honest log entry of residual regions if not. Iterate per the SKILL.md verify step.

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc -b`
Expected: all green, tsc exit 0. New components meet the repo bar (co-located tests, `data-variant`, tokens not hex).

- [ ] **Step 6: Write the synthesis log + commit**

Create `docs/superpowers/notes/2026-06-23-section3-replication-log.md` with the per-region table (disposition, justification, source component) and the final ratio + reuse/create/bake counts.

```bash
git add src/screens/Section3Replicated src/App.tsx docs/components.map.md docs/superpowers/notes/2026-06-23-section3-replication-log.md
git commit -m "feat: replicate section 3 via replicate-screen skill (calibration)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 7: Clean up the throwaway export**

Run: `rm -rf figma-export-section3-v3`
Expected: gitignored dir removed (it is covered by `figma-export-section*/` in `.gitignore`).

---

## Self-Review

**1. Spec coverage:**
- Inputs/prerequisites → Task 4 SKILL.md "Prerequisites" + Task 5 Step 1. ✓
- Inventory → SKILL.md §1. ✓
- Confidence ladder (reuse/create+register/bake) → SKILL.md §2 + Global Constraints. ✓
- Integration-ready seams → SKILL.md §2b; validated in Task 5 Step 3. ✓
- Assemble + tokens-not-hex → SKILL.md §3 + Global Constraints. ✓
- Verify loop + pixel-diff gate → Tasks 2, 3; SKILL.md §4. ✓
- Ground-truth render (Layer-1 add) → Task 1. ✓
- Mock interaction → SKILL.md §5; Task 5 Step 3. ✓
- Output + synthesis log → SKILL.md §6; Task 5 Step 6. ✓
- Error handling (missing prereq, no disposition, non-convergence) → SKILL.md "Failure handling". ✓
- Testing on section 3 (calibration) → Task 5. The "different screen" generality test is intentionally a **follow-up** run of the same skill (no new code), so it is out of this plan's build scope and noted here as the next validation.
- Risks → encoded as the verify gate (Task 3 FAIL_RATIO), justifications-in-log (SKILL.md §2), and the repo-bar requirement on CREATE outputs (Global Constraints).

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; the SKILL.md body is given in full. ✓

**3. Type consistency:** `diffPngs(aBuffer, bBuffer, opts) -> { ratio, changed, total, diffBuffer }` is defined in Task 2 and consumed unchanged in Task 3. `render/<name>.png` (Task 1) is the reference path used in Task 3/Task 5. `[data-testid="scene-root"]` is defined as the screenshot target in Task 3 and required by SKILL.md §3. ✓
