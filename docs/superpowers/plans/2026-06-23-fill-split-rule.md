# Fill-split rule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the plugin baking simple gradient/solid chrome (the 立即领取 button) to one PNG; recurse it instead so its colour becomes a themeable CSS rect and its raster children export as their own assets.

**Architecture:** A narrow, conservative predicate (`isFillSplittable`) added to `figma-plugin/code.js`, plus one branch in `walk()` that recurses qualifying nodes instead of `emitWhole`+`exportChrome`. No generator/IR changes — the scene generator already paints a non-baked instance's gradient (`RECT_BG_TYPES` includes `INSTANCE`). Validated empirically by a re-export + diff against the Task 1 ground-truth render.

**Tech Stack:** Figma Plugin API (`code.js`, runs in the Figma sandbox — no Node test harness), Node ESM build scripts, `scripts/verify-screen.mjs` + `diffPngs` for the fidelity gate.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-23-fill-split-rule-design.md`.
- **Plugin-only change.** Do NOT edit `scripts/build-section-scene.mjs` or `scripts/build-ir.mjs`. If the spike shows the generator mis-paints a recursed instance, that is a finding to escalate, not a change to bundle here.
- **Conservative predicate:** any uncertainty → return false → bake as today. The rule must never make a node worse than the current baseline.
- The plugin runs in the Figma sandbox; its logic is verified by `node --check figma-plugin/code.js` plus the empirical spike (consistent with the existing untested helpers `isGridPanel`, `deepHasImage`, `partialStroke`). Do NOT add a Node unit test for `code.js`.
- Helpers that already exist in `figma-plugin/code.js` and must be reused, not redefined: `deepHasImage` (line 65), `isGridPanel` (line 123), `hasImageFill` (line 62).
- Commit messages: short conventional-commit, body ending exactly `Co-Authored-By: Claude <noreply@anthropic.com>`.
- This is a **spike**: Task 2 ends with a written widen/hold decision, not a guaranteed "ship it".

---

### Task 1: Fill-split predicate + recurse branch in the plugin

**Files:**
- Modify: `figma-plugin/code.js` — add three pure functions after `isGridPanel` (ends line 126), add `split: 0` to the `stats` object (line 39), add one branch in `walk()` before the `COMPONENT` branch (line 258).

**Interfaces:**
- Produces: `isFillSplittable(node) -> boolean` (+ helpers `ownFillTokenable(node)`, `hasMaskOrBoolean(node)`). When true, `walk()` recurses the node instead of baking it whole; the node gets no `manifest` entry and no `exportChrome`. `stats.split` counts decompositions, reported in `export-stats.json`.
- Consumes (existing, do not redefine): `deepHasImage`, `isGridPanel`.

- [ ] **Step 1: Add `split: 0` to the stats object**

In `figma-plugin/code.js` line 39, change:

```js
const stats = { components: 0, instances: 0, decor: 0, grids: 0, images: 0, deduped: 0, chrome: 0, chromeDeduped: 0, failed: 0 };
```

to:

```js
const stats = { components: 0, instances: 0, decor: 0, grids: 0, images: 0, split: 0, deduped: 0, chrome: 0, chromeDeduped: 0, failed: 0 };
```

- [ ] **Step 2: Add the predicate functions after `isGridPanel`**

In `figma-plugin/code.js`, immediately after the `isGridPanel` function (it ends at line 126, just before the `hashStr` djb2 comment), insert:

```js
// A node whose OWN fill is a token-able gradient/solid — no image paint on the
// node itself — so it can be reconstructed as a CSS background downstream.
function ownFillTokenable(node) {
  const fills = Array.isArray(node.fills) ? node.fills.filter((f) => f.visible !== false) : [];
  return fills.length > 0 && fills.every((f) => f.type === "SOLID" || f.type.startsWith("GRADIENT"));
}
// A direct child that defines a non-rectangular silhouette (a clip mask or a
// boolean subtract) — the reward-card case the narrow rule defers.
function hasMaskOrBoolean(node) {
  return Array.isArray(node.children) && node.children.some((c) => c.isMask === true || c.type === "BOOLEAN_OPERATION");
}
// "Fill-split": an instance/component that bakes whole ONLY because of a raster
// child, but whose own background is a token-able fill on a simple (rectangular)
// silhouette. Recursing it lets the background become a themeable CSS rect and
// the raster child its own asset, instead of one flat PNG. Conservative — any
// uncertainty returns false, so the node bakes exactly as before.
function isFillSplittable(node) {
  return (
    (node.type === "INSTANCE" || node.type === "COMPONENT") &&
    ownFillTokenable(node) &&
    deepHasImage(node) &&
    !isGridPanel(node) &&
    !hasMaskOrBoolean(node)
  );
}
```

- [ ] **Step 3: Add the recurse branch in `walk()`**

In `figma-plugin/code.js`, in `walk()`, find the `COMPONENT` branch (line 258):

```js
    if (node.type === "COMPONENT") {
      await emitWhole(node, files, () => stats.components++);
      return; // whole — don't recurse
    }
```

Insert this block immediately BEFORE it:

```js
    // Fill-split: decompose simple gradient/solid chrome (e.g. a button pill, a
    // progress bar) instead of baking it whole, so its colour becomes a themeable
    // CSS rect (the generator paints a non-baked instance's fill) and its raster
    // children export as their own assets. Narrow + conservative — see
    // isFillSplittable; anything that doesn't qualify falls through and bakes below.
    if (isFillSplittable(node)) {
      stats.split++;
      if ("children" in node) {
        for (const c of node.children) await walk(c, files);
      }
      return; // decomposed — no whole bake, no chrome variant, no manifest entry
    }
```

- [ ] **Step 4: Verify the file parses**

Run: `node --check figma-plugin/code.js`
Expected: no output, exit 0.

- [ ] **Step 5: Sanity-check the predicate logic against the spec's button case**

The plugin can't run in Node, but verify the logic by reading the inserted code against the spec's button (`INSTANCE`, orange gradient own-fill, coin-icon raster child, rounded rect, no mask child): trace each `isFillSplittable` clause returns true. Confirm a counter-case (a plain image-fill `RECTANGLE`, or an instance with a `BOOLEAN_OPERATION` child) returns false. Note the trace in the commit body.

- [ ] **Step 6: Commit**

```bash
git add figma-plugin/code.js
git commit -m "feat: fill-split rule — decompose simple gradient chrome instead of baking

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Spike validation — re-export, verify decomposition, decide

This is an **empirical milestone with a manual hand-off**: the plugin only runs in Figma, so a human must re-export section 3 with the updated plugin. The controller pauses here, asks the user to re-export, then resumes. The task ends with a written widen/hold decision — it does not change product code.

**Files:**
- Create: `docs/superpowers/notes/2026-06-23-fill-split-spike.md` (findings + decision).
- Use (throwaway, gitignored): a fresh `figma-export-section3-v4/` export dir + a temp scene at `/tmp/section3-split.scene.json`.

**Interfaces:**
- Consumes: Task 1 (the updated plugin), `scripts/import-figma-export.mjs`, `scripts/build-section-scene.mjs`, `scripts/lib/visual-diff.mjs`.

- [ ] **Step 1: (Manual hand-off) Ask the user to re-export**

Pause and request: "Load the updated `figma-plugin/code.js` in Figma, select the section-3 screen frame, run the export, and save the JSON to `~/Downloads/figma-export-section3-v4.json`." Wait for confirmation before continuing. (The controller does not proceed until the file exists.)

- [ ] **Step 2: Unpack and confirm the split happened**

```bash
node scripts/import-figma-export.mjs ~/Downloads/figma-export-section3-v4.json figma-export-section3-v4
cat figma-export-section3-v4/export-stats.json
ls figma-export-section3-v4/render/
```
Expected: `export-stats.json` shows `"split"` ≥ 1; a `render/<screen>.png` exists (Task 1 ground-truth render). Record the `split` count.

- [ ] **Step 3: Confirm the button is no longer baked, the gradient is now structural**

Find the claim-button node id, then verify it is absent from the manifest and its coin child is present:

```bash
node -e '
const fs=require("fs");
const m=JSON.parse(fs.readFileSync("figma-export-section3-v4/manifest.json","utf8"));
const ids=Object.keys(m);
console.log("manifest entries:", ids.length);
console.log("any Button_*.png still emitted?", Object.values(m).some(p=>/Button/i.test(p)));
'
```
Expected: no `Button_*.png` for the claim button (it decomposed). If a Button PNG remains, the predicate did not fire — record which clause failed and stop (BLOCKED → revisit Task 1).

- [ ] **Step 4: Rebuild the scene and confirm a gradient rect at the button box**

```bash
node scripts/build-section-scene.mjs figma-export-section3-v4 "1:33188" /tmp/section3-split-assets /tmp/section3-split.scene.json
node -e '
const fs=require("fs");
const s=JSON.parse(fs.readFileSync("/tmp/section3-split.scene.json","utf8"));
const rects=s.nodes.filter(n=>n.kind==="rect" && /gradient/i.test(n.bg||""));
// the claim button sits around x27 y492 w332 h45 (per the spec)
const near=rects.find(n=>Math.abs(n.x-27)<8 && Math.abs(n.y-492)<8);
console.log("gradient rect at button box?", !!near, near&&near.bg);
'
```
Expected: a gradient `rect` appears at ~{27,492} — the button background is now data, not a baked PNG.

- [ ] **Step 5: Visual fidelity diff against the ground-truth render**

Temporarily point the existing Section 3 tab at the rebuilt scene (or add a throwaway tab), run the dev server, and diff the button region against the ground-truth render:

```bash
# crop the button region (x27 y492 w332 h45, ×2 for retina render) from the ground truth
# and from a screenshot of the rebuilt scene, then:
node -e '
const fs=require("fs");
const {diffPngs}=await import("./scripts/lib/visual-diff.mjs");
const out=diffPngs(fs.readFileSync("/tmp/btn-ref.png"), fs.readFileSync("/tmp/btn-actual.png"));
console.log("button diff ratio:", out.ratio);
'
```
Expected: a button-region diff ratio. Record it. (If wiring the temp scene into the app is heavy, the controller may screenshot the button via a small throwaway Playwright script as in the calibration; the goal is one honest fidelity number for the button.)

- [ ] **Step 6: Confirm recolour works**

In the rebuilt scene or a quick render, change the button rect's gradient (or the mapped `@theme` token) and confirm the button recolours — proving its colour is now data, not pixels. Capture a before/after thumbnail.

- [ ] **Step 7: Write the findings note + widen/hold decision**

Create `docs/superpowers/notes/2026-06-23-fill-split-spike.md` with: the `split` count, the button diff ratio, the before/after recolour thumbnail description, any fidelity loss (gradient angle, lost shadow, shifted icon), and an explicit decision — **WIDEN** (recommend a follow-up spec to drop the mask guard and handle the card `Subtract` silhouette) or **HOLD** (keep narrow; record why). Then clean up:

```bash
rm -rf figma-export-section3-v4
```

- [ ] **Step 8: Commit the findings**

```bash
git add docs/superpowers/notes/2026-06-23-fill-split-spike.md
git commit -m "docs: fill-split spike findings + widen/hold decision

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- Trigger predicate (5 conditions) → Task 1 Step 2 (`isFillSplittable` + `ownFillTokenable` + `hasMaskOrBoolean`, reusing `deepHasImage`/`isGridPanel`). ✓
- Recurse-instead-of-bake behavior + `stats.split` + no chrome/manifest → Task 1 Steps 1, 3. ✓
- No generator/IR change → Global Constraints + Task 2 verifies the generator paints the gradient unmodified. ✓
- Validation spike (re-export → diff vs ground-truth render → recolour → decide) → Task 2 Steps 1-7. ✓
- Manual Figma re-export hand-off → Task 2 Step 1. ✓
- Empirical-only testing (no Node test for the sandbox plugin) → Global Constraints + Task 1 Steps 4-5. ✓
- Findings note + widen/hold decision → Task 2 Steps 7-8. ✓

**2. Placeholder scan:** No TBD/TODO; all code steps show complete code; commands are concrete. The one soft spot (Step 5 cropping coordinates) is bounded with exact box values and an allowed fallback (throwaway Playwright screenshot), not a placeholder. ✓

**3. Type consistency:** `isFillSplittable`/`ownFillTokenable`/`hasMaskOrBoolean` names are consistent between Task 1 and the Interfaces blocks; `stats.split` is the same key in Steps 1, 3, and Task 2 Step 2; `diffPngs` matches the Task-2 signature shipped on main. ✓
