# Chrome Reflow Fix + Normalized SVG Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide chrome text via opacity (no auto-layout reflow), and dedupe visually-identical SVGs (not just byte-identical) — both small `figma-plugin/code.js` changes.

**Architecture:** Add a `svgDedupKey` normaliser + a `contentKey(r)` helper; use `contentKey` for the dedup hash in both `emitWhole` and `exportChrome` (SVGs hash normalised, PNGs hash exact bytes). In `exportChrome`, hide TEXT with `opacity = 0` (save/restore) instead of `visible = false` so auto-layout instances don't reflow.

**Tech Stack:** Figma Plugin API, plain JS (`figma-plugin/code.js`, no bundler).

## Global Constraints

- Changes are in `figma-plugin/code.js` only (+ a docs checklist update).
- The dedup normaliser affects only the **hash key**; the stored file is always the **original** SVG bytes.
- Normalise SVG only (`ext === "svg"`); PNG keeps exact-byte hashing.
- Hide text by `opacity = 0` and restore each text's **saved** opacity in `finally` (not a hard-coded value); mutation-safety (save before `try`, restore on throw) is preserved.
- No automated test (plugin runs in the Figma sandbox, single hand-written `code.js`, no bundler). Automated gate = `node --check`; functional validation = manual re-export (Task 2 checklist), run by the user.
- No change to the IR builder, scene generator, or app. The generator follows the manifest, so fewer/shared asset paths just work.

---

## File Structure

- Modify `figma-plugin/code.js` — add `svgDedupKey` + `contentKey`; use `contentKey` in `emitWhole` and `exportChrome`; switch `exportChrome` text-hiding to opacity.
- Modify `docs/components.map.md` — update the "Manual validation: chrome export" checklist for the reflow + dedup changes.

---

## Task 1: Plugin — normalized SVG dedup + opacity-based text hiding

**Files:**
- Modify: `figma-plugin/code.js` (add helpers after `hashStr` ~line 130; `emitWhole` hash line ~161; `exportChrome` ~190-211)

**Interfaces:**
- Consumes (existing): `hashStr(string) -> string`, `renderWhole(node) -> {kind, ext, data}`, `visibleTextDescendants(node) -> node[]`.
- Produces: `svgDedupKey(string) -> string`, `contentKey({ext,data}) -> string`; behavior change in `exportChrome` (opacity hide).

- [ ] **Step 1: Add `svgDedupKey` + `contentKey` helpers**

In `figma-plugin/code.js`, immediately AFTER the `hashStr` function, insert:

```js
// Normalised SVG dedup key: strip random element ids + their references and
// sub-pixel coordinate jitter, so visually-identical SVGs (which differ only in
// that noise across exports) collapse to one file. Used ONLY for the dedup hash
// — the stored file is always the original SVG. Genuinely different art keeps
// its distinct geometry/colours and never collides.
function svgDedupKey(data) {
  return data
    .replace(/\sid="[^"]*"/g, "")
    .replace(/url\(#[^)]*\)/g, "url()")
    .replace(/(xlink:)?href="#[^"]*"/g, "")
    .replace(/-?\d+\.\d+/g, (m) => (+m).toFixed(1))
    .replace(/\s+/g, " ")
    .trim();
}

// Content-hash key for a rendered asset. SVGs hash their normalised form (above)
// so near-duplicates dedup; PNGs hash exact bytes.
function contentKey(r) {
  return r.ext + ":" + hashStr(r.ext === "svg" ? svgDedupKey(r.data) : r.data);
}
```

- [ ] **Step 2: Use `contentKey` in `emitWhole`**

In `figma-plugin/code.js`, inside `emitWhole`, replace:

```js
  const h = r.ext + ":" + hashStr(r.data);
```

with:

```js
  const h = contentKey(r);
```

(Note: there are two such lines — this step is the one inside `emitWhole`, ~line 161. The `exportChrome` one is handled in Step 4.)

- [ ] **Step 3: Switch `exportChrome` text-hiding to opacity**

In `figma-plugin/code.js`, in `exportChrome`, replace:

```js
  if (!texts.length) return; // qualifying rule: only text-bearing instances
  for (const t of texts) t.visible = false;
```

with:

```js
  if (!texts.length) return; // qualifying rule: only text-bearing instances
  // Hide via opacity, NOT visibility: an opacity-0 node keeps its auto-layout
  // slot, so siblings (icons) don't reflow. visible=false removes it from the
  // layout flow and re-centers the rest (the button-coin bug).
  const prevOpacity = texts.map((t) => t.opacity);
  for (const t of texts) t.opacity = 0;
```

and replace the `finally` block:

```js
  } finally {
    for (const t of texts) t.visible = true;
  }
```

with:

```js
  } finally {
    texts.forEach((t, i) => (t.opacity = prevOpacity[i]));
  }
```

- [ ] **Step 4: Use `contentKey` in `exportChrome`**

In `figma-plugin/code.js`, inside `exportChrome`, replace:

```js
    const h = r.ext + ":" + hashStr(r.data);
```

with:

```js
    const h = contentKey(r);
```

- [ ] **Step 5: Verify syntax**

Run: `node --check figma-plugin/code.js`
Expected: no output (valid JS).

- [ ] **Step 6: Self-review against constraints**

Confirm by reading the diff:
- `svgDedupKey` is used ONLY inside `contentKey` (for the hash) — no call site writes a file from the normalised string. The stored `data` in `files.push` is still `r.data` (original).
- Both `emitWhole` and `exportChrome` now compute `h` via `contentKey(r)`; no `hashStr(r.data)` call remains except inside `contentKey`/`svgDedupKey`.
- `exportChrome` sets `t.opacity = 0` (not `visible`), saves `prevOpacity` BEFORE the `try`, and the `finally` restores each text's saved opacity even on throw.
- `grep -n "visible = false\|visible = true" figma-plugin/code.js` returns nothing inside `exportChrome` (the opacity approach replaced it).

- [ ] **Step 7: Commit**

```bash
git add figma-plugin/code.js
git commit -m "fix: chrome hides text via opacity (no auto-layout reflow); normalized SVG dedup"
```

---

## Task 2: Update the manual-validation checklist

**Files:**
- Modify: `docs/components.map.md`

- [ ] **Step 1: Replace the validation checklist**

In `docs/components.map.md`, find the "## Manual validation: chrome export" section and replace its numbered list (steps 1-4) with:

```markdown
1. Reload the plugin in Figma (Plugins → Development), run it on the Section 3 frame.
2. Unpack the bundle; confirm `chrome.json` exists and maps the reward-card and
   button instance ids to `chrome/…` paths.
3. Open a reward-card `chrome/…` image: background + icon present, **text gone**.
4. **Reflow:** open the button (`立即领取`) chrome image — the coin icon sits in
   its real position (next to where the amount goes), **not** re-centered.
5. **Dedup:** `export-stats.json` shows a higher `deduped` count and fewer files
   in `svg/` than a pre-dedup export; spot-check that two identical icons now map
   to the SAME path in `manifest.json`. (Asset filenames in `manifest.json` /
   regenerated scenes may change vs the pre-dedup export — they still render
   identically, since only visually-identical SVGs are merged.)
```

- [ ] **Step 2: Commit**

```bash
git add docs/components.map.md
git commit -m "docs: update chrome-export validation checklist (reflow + dedup)"
```

---

## Self-Review

**Spec coverage:**
- Fix 1 opacity hide (no reflow), save/restore opacity in finally → Task 1 Step 3. ✓
- Fix 2 normalized SVG dedup, key-only (store original), SVG-only, both paths → Task 1 Steps 1/2/4. ✓
- PNG unchanged → `contentKey` branches on `ext === "svg"`. ✓
- No downstream change → only `code.js` + docs touched. ✓
- Validation (manual; node --check gate) → Global Constraints + Task 2. ✓
- Risk (over-normalization, opacity-already-0) → spec; no code action. ✓

**Placeholder scan:** none — every step has literal code/commands; the empty `catch` (pre-existing) is intentional and untouched.

**Type consistency:** `svgDedupKey(data: string) -> string` and `contentKey(r: {ext,data}) -> string` are defined once (Step 1) and called identically in `emitWhole` (Step 2) and `exportChrome` (Step 4). `prevOpacity` is created and consumed within `exportChrome` (Steps 3).
