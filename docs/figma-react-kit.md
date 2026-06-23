# Figma → React kit

A portable toolkit for turning a finished Figma design into React, with an agent
doing the synthesis. This document explains the system and how to run it in a
**clean repo** from the exported kit (see `scripts/export-kit.py`).

## The idea in one breath

A Figma export has two halves that generalize very differently:

- **Layer 1 — Acquisition (deterministic, general).** A Figma plugin exports
  assets (SVG/PNG, classified + deduped) + a structural JSON, plus a flat
  ground-truth render. Node scripts turn that into a **role-tagged IR** and a
  renderable **scene**. This runs on any screen.
- **Layer 2 — Synthesis (agent, per-screen judgment).** An agent follows the
  `replicate-screen` **skill** to reconstruct the screen: render the scene as a
  **baked fidelity base**, then **promote** regions to structured/interactive
  React components where it's confident, reusing the project's component library.

"Different screens need different logic" is a curse for a hand-written emitter and
a non-issue for an agent — so Layer 2 is a *procedure for an agent*, not a program.

## Architecture

```
Figma plugin (figma-plugin/)         ← runs in Figma; not rate-limited
  exports:  structure/<screen>.json   (JSON_REST_V1)
            manifest.json             (nodeId → asset path, deduped)
            chrome.json               (text-less component backgrounds)
            svg/ png/                 (assets, SVG vs PNG by content)
            render/<screen>.png       (flat ground-truth render)
        │
        ▼
scripts/import-figma-export.mjs       ← unpack the bundle to a dir
        │
        ├── scripts/build-ir.mjs            → role-tagged IR (component|content|layout|interactive|asset)
        └── scripts/build-section-scene.mjs → scene.json (rect|img|text nodes, 1:1 coords)
        │
        ▼
<SceneRenderer> (src/components/)     ← renders scene.json 1:1 in React (the baked base)
        +  promoted overlays           ← reused/created components on top (structure, data, interaction)
        │
        ▼
scripts/verify-screen.mjs             ← screenshot vs render/<screen>.png (pixel diff gate)
```

## Layer 1 — the deterministic tools

| Tool | Does |
|---|---|
| `figma-plugin/code.js` | Exports assets (SVG for vectors, PNG for raster — content-hash deduped), the structure JSON, text-less `chrome`, and a flat full-screen `render`. Includes the **fill-split rule**: a simple gradient pill/bar with a raster child is decomposed (gradient → CSS, icon → its own asset) instead of baked, so its colour stays themeable. |
| `scripts/import-figma-export.mjs` | Unpacks an export bundle JSON to a directory. |
| `scripts/build-ir.mjs` | structure → compact role-tagged IR (LLM-readable; the agent's work-list). |
| `scripts/build-section-scene.mjs` | structure + manifest → `scene.json`. Reconstructs fills as CSS (alpha-aware; radial gradients use the Figma handles for a positioned/sized ellipse), strokes, gradients; places assets; keeps text as text. |
| `scripts/lib/figma.mjs` | Shared pure helpers (`gradientCss`, `compositeFills`, `textStyle`, …). Unit-tested. |
| `src/components/SceneRenderer` + `PositionedText` | Render `scene.json` 1:1 (rect = CSS fill/gradient, img = asset, text = styled text with per-char colour runs). |

## Layer 2 — the agent skill

`skills/replicate-screen/SKILL.md` is the procedure. Its non-obvious rules, each
learned from a real failure:

1. **Baked fidelity base, then promote.** Render the *whole* scene first (nothing
   is ever missing), then overlay structure where it adds value — never compose
   pure components and drop the rest. (A pure-component first run dropped ~48
   decorations.)
2. **Confidence ladder.** REUSE a library component (match `docs/components.map.md`)
   → CREATE + REGISTER a new one → KEEP BAKED. Never omit.
3. **Integration-ready seams.** Interactive nodes get typed `onX` callbacks;
   content gets typed data props. The skill guarantees *seams*, never behaviour.
4. **Verify against the ground-truth render** (not the baked scene — that's
   circular). A high diff = a mis-placed overlay, not a missing region.
5. **Fidelity discipline — adapt cautiously.** Distinguish a real bug from a
   *faithful reproduction* before "fixing". A decoration layered over text, or a
   slightly-off glyph from **font substitution**, may be exactly how Figma draws
   it — never deviate from the design to look "nicer"; log it instead.

The deterministic `scripts/emit-component.mjs` is a **frozen proof** that
structured output is achievable (it emits one data-driven component from the IR).
It is a reference, not a dependency — the agent + skill supersede it.

## Running it (commands)

```bash
# 1. (in Figma) run the plugin on a screen frame → save the bundle JSON
# 2. unpack
node scripts/import-figma-export.mjs <bundle.json> <exportDir>
# 3. build the renderable scene (and/or the IR)
node scripts/build-section-scene.mjs <exportDir> "<screenId>" <assetsOutDir> <sceneOut.json>
node scripts/build-ir.mjs <exportDir> "<screenId>"            # IR to stdout
# 4. render: mount <SceneRenderer scene={sceneJson} assetUrl={…}> in a Vite+React app
# 5. verify against the ground truth
node scripts/verify-screen.mjs <url> <exportDir>/render/<screen>.png <outDir>
```

Then invoke the **replicate-screen** skill and follow it: baked base → promote →
seams → verify → log.

## Integrating logic / data into a replicated screen

- **Behaviour is a prop-swap.** A replicated screen's interactive seam is a local
  mock (`useState`); lift it to controlled props (`claimed` + `onClaim`) and wire
  `onClaim` to a real `fetch`. Library components are already callback-driven.
- **Data binding means promoting that region — and there are two cases.** A value
  can be in one of three states:
  1. **Baked pixel** (inside an exported asset, e.g. the reward amounts `28¥` are
     in the card PNGs). You *cannot* bind an API value to a pixel — it must first
     be un-baked (the fill-split / card-WIDEN work) or rebuilt as a structured
     component.
  2. **Live but hardcoded text** (a `<text>` node in `scene.json` with a literal
     string, e.g. the progress numbers `266 / 734 / 1000`). It's real, editable
     text — but a constant, not bound to data.
  3. **Data-driven** (extracted into a typed component prop fed from your API).
  Promoting means moving a region from state 1 or 2 → state 3: overlay a typed
  component (e.g. `<ProgressCard data={api}>`) over the baked base and feed it.
  `src/screens/Section3Structured` is the reference for an editable, data-bound
  overlay; `Section3Replicated` is the baked-base + interaction-seam reference
  (with 8 themed variants). **The agent should promote obviously-dynamic content
  (amounts, counts, currency, progress, user/session values) by default — see the
  skill's §2 rule — not leave it hardcoded.**

## Using the exported kit in a clean repo

`python3 scripts/export-kit.py` produces `figma-react-kit/` (and optionally a zip)
containing the plugin, the Node tools + tests, the renderer components, the skill,
the token + component-map templates, and config starters — everything Layer 1 + 2
needs, minus the section-specific screens.

In the clean repo:
1. Copy the kit in; `npm install` (deps listed in the kit's `package.json`).
2. Drop your Figma **section export JSON(s)** anywhere.
3. Run the Layer-1 commands above to get a `scene.json` + IR.
4. Invoke `replicate-screen` and let the agent build the screen against the
   ground-truth render.

The clean-repo run is the real generality test: how much the agent reuses vs
creates vs keeps-baked, measured by its synthesis log.

## File inventory (what the kit ships)

- `figma-plugin/` — exporter (`code.js`, `manifest.json`, `ui.html`)
- `scripts/` — `import-figma-export`, `build-ir`, `build-section-scene`,
  `emit-component`, `verify-screen`, `nudge-section3-header`, `lib/figma`,
  `lib/visual-diff` (+ their `*.test.mjs` and `__fixtures__/`)
- `src/components/SceneRenderer`, `src/components/PositionedText`, `src/lib/cn.ts`
- `src/index.css` — Tailwind `@theme` token starter
- `skills/replicate-screen/` — `SKILL.md` (+ test)
- `docs/components.map.md` — reuse-catalog template; `docs/figma-react-kit.md` — this doc
- `package.json`, `tsconfig*.json`, `vite.config.ts` — config starters
