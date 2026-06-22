# Plugin Chrome Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The exporter plugin additionally renders a text-less "chrome" image for every text-bearing instance and records it in a new `chrome.json`, enabling downstream data-driven components.

**Architecture:** A small, additive change to the single existing plugin (`figma-plugin/code.js`): in the `INSTANCE` branch of the walk, after the normal full bake, hide the instance's TEXT descendants, render again, content-hash dedup into a `chrome/` dir, and record `instanceId → path` in `chromeManifest`; restore visibility in `finally`. `run()` writes `chrome.json`. Nothing existing changes.

**Tech Stack:** Figma Plugin API (`figma.*`, `exportAsync`), plain JS (`figma-plugin/code.js`, no bundler).

## Global Constraints

- Purely **additive**: `manifest.json`, `export-stats.json` existing fields, the asset files, and any regenerated scene must be byte-identical to before.
- Output goes to a NEW file `chrome.json` (`{ instanceId: "chrome/<name>.<ext>" }`) and a NEW `chrome/` dir — do NOT change `manifest.json`'s schema.
- Qualifying rule: only an `INSTANCE` with ≥1 **visible** `TEXT` descendant produces chrome.
- Restore every hidden TEXT's `visible = true` in a `finally` — the document must never be left mutated, even on render failure.
- Best-effort: on render failure, skip (instance absent from `chrome.json`); do NOT route through `recordFailure`/`failed.json`.
- Chrome dedup uses its OWN `chromeSeen` map (content-hash), separate from `seenHash`.
- No automated test (plugin runs in the Figma sandbox, single hand-written `code.js`, no bundler — see spec "Validation"). Automated gate = `node --check`; functional validation = the manual re-export checklist (Task 2), performed by the user after merge.

---

## File Structure

- Modify `figma-plugin/code.js` — add chrome state, `visibleTextDescendants` + `exportChrome`, wire into the INSTANCE branch, write `chrome.json` in `run()`.
- Modify `README.md` — add `chrome/` + `chrome.json` to the bundle outputs.
- Modify `docs/components.map.md` — note `chrome.json` in the Structured mode section.

---

## Task 1: Add text-less chrome export to the plugin

**Files:**
- Modify: `figma-plugin/code.js` (state decls ~34-37, after `emitWhole` ~170, INSTANCE branch ~194-197, `run()` ~246)

**Interfaces:**
- Consumes (existing in `code.js`): `renderWhole(node) -> {kind, ext, data}`, `safeName(node) -> string`, `hashStr(string) -> string`, the `files` array, the `stats` object.
- Produces: `chrome.json` (`{ [instanceId]: "chrome/<name>.<ext>" }`) and `chrome/` assets in the bundle; `stats.chrome` / `stats.chromeDeduped` counters.

- [ ] **Step 1: Add chrome state + stats counters**

In `figma-plugin/code.js`, replace the state declaration block (the four `const` lines for `seenHash`, `manifest`, `failures`, `stats`):

```js
const seenHash = new Map(); // contentHash → asset path
const manifest = {}; // nodeId → asset path (incl. deduped nodes → shared path)
const failures = []; // structured, identifiable: { id, name, type, box, fills, visible, reason }
const stats = { components: 0, instances: 0, decor: 0, grids: 0, images: 0, deduped: 0, failed: 0 };
```

with:

```js
const seenHash = new Map(); // contentHash → asset path
const manifest = {}; // nodeId → asset path (incl. deduped nodes → shared path)
const chromeSeen = new Map(); // contentHash → text-less chrome asset path
const chromeManifest = {}; // instanceId → chrome asset path (TEXT hidden)
const failures = []; // structured, identifiable: { id, name, type, box, fills, visible, reason }
const stats = { components: 0, instances: 0, decor: 0, grids: 0, images: 0, deduped: 0, chrome: 0, chromeDeduped: 0, failed: 0 };
```

- [ ] **Step 2: Add `visibleTextDescendants` + `exportChrome`**

In `figma-plugin/code.js`, immediately AFTER the `emitWhole` function and BEFORE `function exportable(node) {`, insert:

```js
// All visible TEXT descendants of a node (including inside nested instances).
function visibleTextDescendants(node) {
  const out = [];
  (function rec(n) {
    if (n.type === "TEXT" && n.visible !== false) out.push(n);
    if ("children" in n && n.children) n.children.forEach(rec);
  })(node);
  return out;
}

// Render a text-less "chrome" image of an instance (its TEXT hidden) so a
// downstream component can overlay live, data-driven text on a clean
// background. Best-effort + additive: on render failure, skip (the instance is
// simply absent from chrome.json — its full bake already succeeded, so we never
// pollute failed.json). ALWAYS restores visibility in `finally` — the document
// must never be left mutated.
async function exportChrome(node, files) {
  const texts = visibleTextDescendants(node);
  if (!texts.length) return; // qualifying rule: only text-bearing instances
  for (const t of texts) t.visible = false;
  try {
    const r = await renderWhole(node);
    const h = r.ext + ":" + hashStr(r.data);
    let path = chromeSeen.get(h);
    if (path) {
      stats.chromeDeduped++;
    } else {
      path = `chrome/${safeName(node)}.${r.ext}`;
      files.push({ path, kind: r.kind, data: r.data });
      chromeSeen.set(h, path);
      stats.chrome++;
    }
    chromeManifest[node.id] = path;
  } catch (e) {
    // best-effort: leave this instance out of chrome.json
  } finally {
    for (const t of texts) t.visible = true;
  }
}
```

- [ ] **Step 3: Wire `exportChrome` into the INSTANCE branch**

In `figma-plugin/code.js`, replace the INSTANCE branch:

```js
    if (node.type === "INSTANCE") {
      await emitWhole(node, files, () => stats.instances++);
      return; // whole — don't recurse
    }
```

with:

```js
    if (node.type === "INSTANCE") {
      await emitWhole(node, files, () => stats.instances++);
      // Additive: also render a text-less "chrome" variant so the instance can
      // become a data-driven component downstream. No-op if it has no text.
      await exportChrome(node, files);
      return; // whole — don't recurse
    }
```

- [ ] **Step 4: Write `chrome.json` in `run()`**

In `figma-plugin/code.js`, find the line that pushes `manifest.json`:

```js
  files.push({ path: "manifest.json", kind: "text", data: JSON.stringify(manifest) });
```

and add a line immediately after it:

```js
  files.push({ path: "chrome.json", kind: "text", data: JSON.stringify(chromeManifest) });
```

- [ ] **Step 5: Verify syntax**

Run: `node --check figma-plugin/code.js`
Expected: no output (valid JS).

- [ ] **Step 6: Self-review against the constraints**

Confirm by reading the diff (no command needed):
- `chromeManifest` is written as `chrome.json`, separate from `manifest.json` (which is unchanged).
- `exportChrome` restores `t.visible = true` for every hidden text in `finally`.
- The catch block is empty (best-effort) and does NOT call `recordFailure`.
- `chromeSeen` is a distinct map from `seenHash`.
- The INSTANCE branch still calls `emitWhole` exactly as before (the full bake is unchanged) and only ADDS the `exportChrome` call.

- [ ] **Step 7: Commit**

```bash
git add figma-plugin/code.js
git commit -m "feat: plugin exports text-less chrome images for instances (chrome.json)"
```

---

## Task 2: Document the new output + manual validation checklist

**Files:**
- Modify: `README.md`
- Modify: `docs/components.map.md`

- [ ] **Step 1: Add `chrome/` + `chrome.json` to the README bundle outputs**

In `README.md`, find the pipeline code block line:

```
                          + manifest.json (nodeId → asset path)
```

and add a line immediately after it (same indentation):

```
                          + chrome/ + chrome.json (text-less instance images, for data-driven components)
```

- [ ] **Step 2: Note `chrome.json` in the Structured mode section**

In `docs/components.map.md`, find the "## Structured mode (experimental)" section and append this paragraph to it:

```markdown
The plugin also emits `chrome.json` (`instanceId → text-less image path`): each
text-bearing instance rendered with its TEXT hidden, so a generated component can
overlay live data-driven text on a clean background (the basis for editable
cards). Additive — `manifest.json` and the scene pipeline are unchanged. Spec:
`docs/superpowers/specs/2026-06-22-plugin-chrome-export-design.md`.
```

- [ ] **Step 3: Add the manual validation checklist for the user**

Append this section to the END of `docs/components.map.md`:

```markdown
## Manual validation: chrome export

The plugin runs in the Figma sandbox and has no automated test. After changing
chrome-export logic, the user validates by re-exporting:

1. Reload the plugin in Figma (Plugins → Development), run it on the Section 3 frame.
2. Unpack the bundle; confirm `chrome.json` exists and maps the 9 reward-card
   instance ids to `chrome/…` paths.
3. Open one `chrome/…` image: the card background + icon are present and the
   **text is gone**.
4. Confirm `manifest.json` is unchanged and a regenerated scene
   (`build-section-scene.mjs`) is byte-identical to before (the change is additive).
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/components.map.md
git commit -m "docs: document chrome.json output + manual validation checklist"
```

---

## Self-Review

**Spec coverage:**
- Capability: text-less chrome per qualifying instance → Task 1 Step 2/3. ✓
- Qualifying rule (instance + visible TEXT descendant) → `exportChrome` early return. ✓
- Mechanics (hide → render → dedup → record → restore in finally) → Task 1 Step 2. ✓
- Output: `chrome/` dir + `chrome.json`, additive → Task 1 Step 2/4. ✓
- Separate `chromeSeen` content-hash dedup → Task 1 Step 1/2. ✓
- Stats `chrome` + `chromeDeduped` → Task 1 Step 1. ✓
- Best-effort failure (skip, not failed.json) → Task 1 Step 2 catch. ✓
- Validation (manual, no automated test) → Global Constraints + Task 2 Step 3. ✓
- Text-metadata sibling requirement → explicitly out of scope for this slice (implemented in the emitter sub-project); not a task here. ✓
- Auto-layout reflow risk → documented in spec; no code action this slice. ✓

**Placeholder scan:** none — every code/doc step has literal content; the empty `catch` is intentional (documented best-effort), not a placeholder.

**Type consistency:** `chromeSeen` (Map), `chromeManifest` (object), `stats.chrome`/`stats.chromeDeduped`, and the `chrome/<safeName>.<ext>` path are used identically across Steps 1, 2, 4. `exportChrome(node, files)` matches its single call site in the INSTANCE branch.
