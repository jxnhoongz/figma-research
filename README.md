# figma-research

An experiment in **fast, high-fidelity Figma → React replication**. Given a
Figma section, a local plugin exports the design once; a generator reconstructs
each screen from the exact node coordinates; a generic renderer paints it. The
goal is **~90% visual accuracy on the first pass, in minutes, with almost no
hand-positioning** — efficiency over everything else. A second, **agent-driven
layer** (the `replicate-screen` skill) then turns that baked output into
**structured, integration-ready React** — reusing a component library and exposing
typed props + callbacks — all packaged as a portable kit.

> **Demo:** [`demo/`](demo/) contains a screen recording of the running app
> (tab nav across the replicated sections + per-theme switching).

> **Pipeline + portable kit:** [`docs/figma-react-kit.md`](docs/figma-react-kit.md)
> documents the full system (Layer 1 acquisition + the Layer 2 `replicate-screen`
> agent skill). Run `python3 scripts/export-kit.py` to bundle the plugin, tools,
> renderer, and skill into `figma-react-kit/` for use in a clean repo.

## TL;DR — how to use it

**A. Package the kit** (once, from this repo):

```
python3 scripts/export-kit.py --zip     # → figma-react-kit.zip  (~56K, capability only)
```

**B. Use it in any project** (clean *or* existing):

1. **Unzip the kit** into the repo.
2. **Export from Figma:** open the plugin ([`figma-plugin/`](figma-plugin/) → Plugins →
   Development → Import from manifest), **select a screen frame**, run it, save the
   bundle JSON.
3. **Point your coding agent at the skill:** "follow `skills/replicate-screen/SKILL.md`."
   Claude Code loads it automatically; **Codex / OpenCode / Cursor** read `AGENTS.md`;
   **Gemini** reads `GEMINI.md` — all the same procedure.

The agent then, on its own: **adapts to the project** (initializes a fresh app or
follows your existing structure) → imports the export → builds the scene + IR →
renders a **baked fidelity base** → **promotes** structured/interactive components
on top (reusing your component library, exposing typed props + `onX` callbacks) →
**verifies** against the Figma render.

**Prefer to run it by hand?** The pipeline is four plain commands:

```
node scripts/import-figma-export.mjs <bundle.json> <exportDir>
node scripts/build-section-scene.mjs <exportDir> "<screenId>" <assetsDir> <sceneOut.json>
# mount <SceneRenderer scene={sceneJson} …/> in a React app, then:
node scripts/verify-screen.mjs <url> <exportDir>/render/<screen>.png <outDir>
```

## What's replicated

Five real promo screens, each with its theme variants, all driven from one
plugin export per section:

| Tab | Screen | Variants | How it's built |
|-----|--------|----------|----------------|
| 波币大闯关 | `BobiLevelTheme1` | 6 themes | Hand-built reusable components (the original approach) |
| 中秋大转盘 | `MoonFestival` | 6 themes | Pipeline (export → scene → render) |
| 点击领取 | `Section3` | 8 themes | Pipeline |
| 升级模式 | `Section6` | 6 themes | Pipeline |
| 领取彩金 | `Section7` | 6 themes | Pipeline |

The first screen is the original component-by-component rebuild; the rest use the
**pipeline** below, which is what this project is really about.

## The pipeline (efficiency-first)

```
Figma plugin (local: no REST API, no token, no rate limit)
  └─ exports ONE bundle: structure/<root>.json (full JSON_REST_V1 tree)
                          + svg/ + png/ (deduped assets)
                          + manifest.json (nodeId → asset path)
                          + chrome/ + chrome.json (text-less instance images, for data-driven components)
  ↓ scripts/import-figma-export.mjs        unpack bundle to disk
  ↓ scripts/build-section-scene.mjs        per screen → scene.json + copied assets
  ↓ src/components/SceneRenderer           generic, data-driven renderer
React screen
```

> **Structured / agent mode:** `scripts/build-ir.mjs` produces a semantic IR
> (role-tagged tree) from the same export. It's the input the **`replicate-screen`
> agent skill** (Layer 2 below) uses to emit componentized, data-driven,
> integration-ready code — instead of a flat baked scene.

**Why it's fast and faithful:**

- **Positioning is correct by construction.** Every node's exact
  `absoluteBoundingBox` is read from the structure JSON and normalised to the
  screen origin — no eyeballing, no nudging.
- **Assets are rendered by Figma itself**, so icons/art are pixel-perfect.
- **Dedup is by rendered-content hash**, not a guessed signature. Identical art
  is shared; anything that differs (theme recolours, reward-grid cards, icon-only
  differences) stays distinct — automatically, with no per-section patching.
- **The plugin writes a manifest**; the generator just follows it, so the two
  can't drift.

See [`docs/components.map.md`](docs/components.map.md) for the Figma-layer →
component map and per-screen regeneration commands.

## Layer 2 — agent-driven synthesis (`replicate-screen` skill)

The pipeline above is **Layer 1**: deterministic, faithful, but it produces a
*flat baked scene*. **Layer 2** turns that into **structured, integration-ready
React** by handing the IR + scene to an agent that follows the
[`replicate-screen`](skills/replicate-screen/SKILL.md) skill. "Different screens
need different logic" is a curse for a hand-written emitter and a non-issue for an
agent, so synthesis is a *procedure for an agent*, not a program. Its rules (each
learned from a real failure):

- **Baked fidelity base, then promote.** Render the whole scene first (nothing is
  ever missing), then overlay structured/interactive components where confident —
  REUSE a library component → CREATE + REGISTER one → KEEP BAKED. Never omit.
- **Integration-ready seams.** Interactive nodes get typed `onX` callbacks; data
  gets typed props. Wiring real logic/API is a prop-swap, not a rewrite.
- **Verify against the ground-truth render**, and **adapt cautiously** — never
  deviate from the design to look "nicer" (a decoration over text may be faithful).

The **fill-split rule** in the plugin supports this: it decomposes simple gradient
chrome (buttons/bars) into themeable CSS instead of baking it. The deterministic
`scripts/emit-component.mjs` is a frozen *proof* that structured output is
achievable; the agent + skill supersede it.

The three section-3 tabs show the progression:

| Tab | What it is |
|---|---|
| `点击领取` | baked pipeline (Layer 1, flat scene) |
| `点击领取 (structured)` | editable, data-bound component overlaid on the baked base |
| `点击领取 (replicated)` | the skill's baked-base + interactive claim seam, **8 themes** |

### Portable kit

`python3 scripts/export-kit.py` bundles the plugin, Node tools, scene renderer,
and the `replicate-screen` skill into `figma-react-kit/` (+ optional zip) — for
running the whole pipeline in a **clean repo**. Full guide:
[`docs/figma-react-kit.md`](docs/figma-react-kit.md).

## Replicate a new section

1. In Figma: install the plugin from [`figma-plugin/`](figma-plugin/) (Plugins →
   Development → Import plugin from manifest), **select the section frame**, run
   it, save `figma-export.json`.
2. Unpack: `node scripts/import-figma-export.mjs ~/Downloads/figma-export.json figma-export-tmp`
3. Build a scene per screen/variant (match by frame **id** when sibling frames
   share a name):
   ```
   node scripts/build-section-scene.mjs figma-export-tmp "<frameName|id>" \
     src/assets/<section>/img  src/screens/<Screen>/scenes/<theme>.json
   ```
4. Add a screen component that globs its scenes + assets and renders
   `<SceneRenderer>` (see `src/screens/Section3/Section3.tsx`), then wire it into
   `src/App.tsx`.

Health checks: the generator prints `missing: 0` and the export reports
`failed: 0`. Treat anything else (plus a screenshot diff) as the punch-list.

## The two skills

- **`.claude/skills/figma-replicate/`** — the **Layer-1** playbook: export → scene
  → render, with `references/gotchas.md` (every fidelity rule + the bug it
  prevents). Use it to faithfully replicate a screen as a baked scene.
- **`skills/replicate-screen/`** — the **Layer-2** agent skill: baked fidelity
  base → promote structured/interactive overlays → verify against the ground-truth
  render. Use it to turn a screen into structured, integration-ready React.

Both are project-scoped, so a fresh agent session inherits the hard-won lessons.

## Accuracy: ~90%, and what the last 10% costs

Correct out of the box: layout, asset fidelity, dedup, per-theme variants,
composited text colours, strokes, two-tone titles, and table/grid panels.

What still needs a touch (documented, so it's a short punch-list, not a spiral):
non-system fonts need subsetting + a `unicode-range` entry; the occasional
mask/boolean lands in `failed.json` and needs a backfill; font-metric drift on
CJK; classification thresholds may need tuning on a novel layout.

## Limitations & disadvantages (by design — and where to improve)

This pipeline optimises for **speed and first-pass fidelity**, and pays for it
elsewhere. These are the real tradeoffs, kept here so we improve deliberately
rather than rediscover them.

### Fundamental (consequences of "export rendered assets + place by coords")

1. **Static by default — Layer 1 is a still.** The bare pipeline output doesn't
   spin the wheel or switch tabs. *Now:* the Layer-2 `replicate-screen` skill adds
   **integration-ready seams** (typed `onX` callbacks), so behaviour is a
   prop-swap away (see `docs/figma-react-kit.md`); animation/transitions are still
   out of scope.

2. **Baked assets — but chrome can be un-baked.** Text/colour inside an exported
   asset is rendered to SVG/PNG; only *loose* text stays live in Layer 1. *Now:*
   the **fill-split rule** un-bakes simple gradient chrome (buttons/bars) into
   themeable CSS, and Layer-2 **structured overlays** make chosen regions editable
   / data-bound. Complex masked art (e.g. notched cards) is still baked — see
   `docs/superpowers/specs/2026-06-23-card-fill-split-widen-design.md`.

3. **Not responsive.** Fixed 390 px, absolutely-positioned canvas. No breakpoints,
   reflow, or fluid layout. *Improve:* infer auto-layout/constraints from the
   structure JSON to emit flex/grid containers instead of absolute coords.

4. **One-way, not round-trip.** Figma is the source of truth; the code is a
   snapshot. Any design change means re-export + regenerate. The code can't be
   edited back into Figma.

5. **N copies of assets per theme.** Themes are genuinely distinct palettes (not
   a single swappable accent — verified), so each theme ships its own asset set.
   Five sections × 6–8 themes = hundreds of files / hundreds of MB (this repo is
   already large). *Improve:* detect true single-accent sections and use
   `currentColor` recolour there; share cross-theme-identical assets more
   aggressively (already deduped, but PNGs dominate size).

### Fidelity gaps

6. **Effects are dropped.** Figma drop/inner shadows, layer blur, and background
   blur are not read — they appear only if baked into an exported asset; loose
   rects/text get none. *Improve:* read `effects[]` → CSS `box-shadow`/`filter`.

7. **Heuristic classification.** `DECOR_MIN_AREA`, the grid-panel detector, and
   "what counts as a whole-export" are tuned thresholds, not universal. A novel
   layout can surface a new case (grid panels were one).

8. **Font fidelity is manual.** Non-system display fonts must be downloaded,
   subsetted, and added to the `@font-face` `unicode-range` per new glyph set.
   System CJK fonts also measure slightly differently than Figma (a slack
   heuristic compensates approximately).

9. **Export gaps.** Some mask/boolean nodes throw on `exportAsync` and land in
   `failed.json`. Usually negligible/off-canvas; occasionally a real visual that
   needs REST `images?ids=` backfill or JSON reconstruction.

### Engineering / DX

10. **Accessibility is minimal.** Scenes are absolutely-positioned
    `<div>`/`<img>` with `aria-hidden` — no headings, landmarks, alt text, or
    sensible tab order. It's a visual shell, not accessible markup. *Improve:*
    emit semantic roles for known patterns (nav, headings, lists).

11. **Layer-1 screens are flat (Layer 2 fixes this).** A bare pipeline screen is a
    scene of assets, not composable React with props. *Now:* the
    `replicate-screen` skill reuses library components + promotes regions to
    data-bound overlays on the baked base. The **reuse-vs-create-vs-keep-baked
    ratio** (from each run's synthesis log) is the research metric — and it's
    capped by how much structure Layer 1 exposes (un-baking is the lever).

12. **Manual orchestration.** You run the generator once per screen *and* per
    theme, hand-mapping frame ids → theme names, and hand-wire `App.tsx`.
    Error-prone for many variants. *Improve:* a section-level driver script +
    auto-discovery of variant frames.

13. **Plugin is manual / not headless.** A human must open Figma, select the
    frame, and run the plugin — can't be run in CI. Content-hash dedup also
    renders *every* candidate (no skip), so export time scales with node count.

14. **Payload/perf.** Hundreds of absolutely-positioned DOM nodes + large
    SVG/PNG per screen, no lazy loading or responsive images.

## Project structure

```
figma-plugin/                exporter plugin (code.js, ui.html, manifest.json)
scripts/
  import-figma-export.mjs    unpack a bundle to disk
  build-section-scene.mjs    structure → scene.json (Layer 1)
  build-ir.mjs               structure → role-tagged IR (agent input)
  emit-component.mjs         frozen "proof" emitter (IR → one component)
  verify-screen.mjs          screenshot vs ground-truth render (pixel-diff gate)
  nudge-section3-header.mjs   example deliberate-deviation tool
  lib/figma.mjs              shared pure helpers (gradientCss, compositeFills, …)
  lib/visual-diff.mjs        diffPngs pixel-diff helper
  export-kit.py              bundle the portable kit for a clean repo
src/
  components/SceneRenderer/   generic absolute-positioned renderer
  components/PositionedText/   shared text rendering (font/stroke/colour runs)
  screens/Section3/            baked pipeline screen
  screens/Section3Structured/  editable overlay over the baked base
  screens/Section3Replicated/  baked-base + claim seam, 8 themes (Layer 2)
  assets/<section>/img/        exported, deduped assets
  App.tsx                      tab nav + per-page theme switcher
skills/replicate-screen/      Layer-2 agent skill (baked base + promote + verify)
.claude/skills/figma-replicate/  Layer-1 deterministic replication playbook
docs/
  figma-react-kit.md          full pipeline + portable-kit guide
  components.map.md            Figma layer → component map + regen commands
  superpowers/specs|plans|notes/  design docs, plans, findings
demo/                          screen recording of the running app
```

## Commands

```
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm test          # vitest run
```

## Demo

Opus 4.8 building all 6 themes of `贵宾会员晋级奖-领取彩金` (Section 7) in ~7 minutes:

https://github.com/user-attachments/assets/76bebc01-8c91-4b3b-a961-6328b69b2933

<sub>(A compressed copy also lives at [demo/section7-6-themes.mp4](demo/section7-6-themes.mp4).)</sub>
