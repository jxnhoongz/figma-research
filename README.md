# figma-research

An experiment in **fast, high-fidelity Figma → React replication**. Given a
Figma section, a local plugin exports the design once; a generator reconstructs
each screen from the exact node coordinates; a generic renderer paints it. The
goal is **~90% visual accuracy on the first pass, in minutes, with almost no
hand-positioning** — efficiency over everything else.

> **Demo:** [`demo/`](demo/) contains a screen recording of the running app
> (tab nav across the replicated sections + per-theme switching).

> **Pipeline + portable kit:** [`docs/figma-react-kit.md`](docs/figma-react-kit.md)
> documents the full system (Layer 1 acquisition + the Layer 2 `replicate-screen`
> agent skill). Run `python3 scripts/export-kit.py` to bundle the plugin, tools,
> renderer, and skill into `figma-react-kit/` for use in a clean repo.

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

> **Structured mode (WIP):** `scripts/build-ir.mjs` produces a semantic IR
> (role-tagged tree) from the same export — the foundation for componentized,
> data-driven, API-ready output. See the limitations section.

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

## The `figma-replicate` skill

The full playbook lives in [`.claude/skills/figma-replicate/`](.claude/skills/figma-replicate/)
— SKILL.md (workflow), `references/gotchas.md` (every fidelity rule + the bug it
prevents), and the bundled plugin + scripts + renderer. It's project-scoped so a
fresh agent session inherits all the hard-won lessons.

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

1. **Static only — no interactivity or animation.** The output is a faithful
   *still*: the wheel doesn't spin, tabs don't switch, no hover/press/scroll
   states, no transitions. Anything dynamic in the design is not captured.
   *Improve:* layer behaviour on top by hand, or extend the scene schema with
   interaction/animation hints.

2. **Assets are baked pixels, not editable.** Text/colour inside an exported
   asset (component, instance, decor, grid panel) is rendered to SVG paths or
   PNG. You cannot change copy, recolour, localise, or restyle it without
   re-exporting from Figma. Only *loose* text nodes stay live.
   *Improve:* optionally recurse instances to emit live text + separate icon
   images instead of one baked asset (trades fidelity/effort for editability).

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

11. **No component reuse / data-binding in pipeline screens.** A pipeline screen
    is a flat scene of assets, not composable React with props — you can't drive
    reward amounts or copy from data (contrast the hand-built `BobiLevelTheme1`,
    which is fully componentised). This is the deliberate efficiency tradeoff.

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
  build-section-scene.mjs    build a scene.json from one screen (follows manifest)
src/
  components/SceneRenderer/   generic absolute-positioned renderer
  screens/<Screen>/           scene(s).json + screen component
  assets/<section>/img/       exported, deduped assets
  App.tsx                     tab nav + per-page theme switcher
.claude/skills/figma-replicate/  the replication playbook (skill)
docs/components.map.md        Figma layer → component map + regen commands
demo/                         screen recording of the running app
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
