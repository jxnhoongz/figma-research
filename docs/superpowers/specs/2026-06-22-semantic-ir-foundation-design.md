# Semantic IR Foundation (P1 + P2) — Design

**Date:** 2026-06-22
**Status:** Approved (design) — pending spec review
**Phase:** Structured-output upgrade, sub-project 1 of N

## Context & motivation

The export → scene → render pipeline replicates Figma screens fast (~90% first
pass), but its output is a flat `scene.json` of absolutely-positioned nodes
rendered by a generic `<SceneRenderer>`, with text/numbers **baked into image
assets**. A PM reviewing the work asked the two questions this output fails:

1. How's the output **code structure**?
2. Is it **easy to customize and integrate with logic/API**?

Both are weak today: no components, no editable data, no behavior hooks, no
responsive layout. The next research phase ("structured-output upgrade") aims to
emit componentized, data-driven, hookable, responsive code for any section.

That phase decomposes into:

- **P1 — Semantic IR** ← this spec
- **P2 — Split rule (asset vs structure)** ← this spec
- P3 — Content/data extraction
- P4 — Component synthesis
- P5 — Layout → flex/grid
- P6 — Behavior hooks
- P7 — Code emitter

Every later part consumes the IR, so it is built first, in isolation. **This
spec covers P1 + P2 only.**

## Goal

A standalone analysis step that turns a plugin export into a **semantic
intermediate representation (IR)** — a tree that tags every node with a role and
captures the data later phases need. No code generation, no data files, no app
changes. Pure, testable foundation.

## Non-goals (explicitly deferred)

- No `.tsx` / component emission (P7).
- No extracted `data.ts` files (P3).
- No flex/grid translation depth or responsiveness (P5).
- No `onClick`/state wiring (P6) — we only *tag* interactive nodes here.
- No behavioral changes to the existing scene pipeline or the running app. The
  fast scene mode and the new structured mode coexist. (The one allowed edit to
  `build-section-scene.mjs` is a **behavior-preserving** extraction of shared
  helpers into `scripts/lib/figma.mjs` — verified by the unchanged existing
  tests and identical regenerated scenes.)

## Inputs & output

- **Inputs:** the unpacked export dir (same as `build-section-scene.mjs`):
  `structure/<root>.json` (JSON_REST_V1 tree) + `manifest.json` (nodeId → asset
  path).
- **Invocation:** `node scripts/build-ir.mjs <unpackDir> "<screen id|name>" <out.json>`
  (screen matched by id OR name, like the scene generator).
- **Output:** `ir.json` — `{ name, width, height, root: IRNode }`, coordinates
  normalised to the screen's top-left.

## Role taxonomy

Every IR node has exactly one `role`:

| Role | Detected from | Later becomes |
|------|---------------|---------------|
| `layout` | FRAME/GROUP/SECTION container not baked whole | a `<div>` / flex container |
| `component` | INSTANCE or COMPONENT (esp. recurring `componentId`) | a reusable component + data |
| `content` | TEXT node | an editable text prop |
| `interactive` | name/type heuristic (button/btn/cta/tab/claim/领取/立即/提交/submit) | a node with `onClick`/state |
| `asset` | decorative subtree the plugin baked (in `manifest`) | an `<img>` (stays pixels) |

## The split rule (P2, conservative/hybrid)

**Principle:** *a node bakes to `asset` only when it is decorative* — in the
manifest **and** not carrying meaning (not text, instance/component, or
interactive). Everything meaningful gets a structured role.

**Classification order** (pre-order walk; skip nodes failing `exportable()` —
`visible === false` or `w<1||h<1`, matching the scene generator):

1. `node.type === "TEXT"` → **`content`** (leaf; capture text + style).
2. `node.type` is `INSTANCE` or `COMPONENT` → **`component`** (see dual-capture
   below; recurse into children to tag nested content).
3. interactive heuristic matches (name regex OR clickable instance) →
   **`interactive`** (capture `kind`, `label`; recurse children).
4. `node.id` in `manifest` (plugin baked it) → **`asset`** (leaf; capture
   `src`; do not descend — its subtree is in the image).
5. container type (`FRAME`/`GROUP`/`SECTION`) not in manifest → **`layout`**
   (capture layout info; recurse children).
6. fallback: in manifest → `asset`; else skip (no renderable contribution).

Order matters: TEXT, component, and interactive are checked **before** the
manifest/asset test, so a meaningful node that also happens to be baked is still
structured.

### Dual-capture (the key design move)

A `component` node (e.g. a reward card) is *both* an instance *and* present in
the manifest (a per-card baked image, distinct thanks to content-hash dedup). We
capture **both**:

- `asset.src` — the baked image (fidelity fallback; guarantees we never lose the
  pixels), and
- structured `children` — recursed, so nested TEXT overrides surface as
  `content` and nested decoration as `asset`.

The IR holds both representations; downstream codegen (P4/P7) decides whether to
render the baked image or the reconstructed structure. P1 just records both.

## IR node schema

```
IRNode = {
  id: string,
  role: 'layout' | 'component' | 'content' | 'interactive' | 'asset',
  name: string,
  box: { x, y, w, h },                       // normalised to screen origin
  // role-specific (only the relevant key is present):
  layout?: {
    mode: 'flex' | 'absolute',               // from layoutMode
    direction?: 'row' | 'column',            // HORIZONTAL/VERTICAL
    gap?: number,                            // itemSpacing
    padding?: { top, right, bottom, left },
  },
  component?: { key: string, instanceCount: number },  // key = componentId
  content?: { text: string, style: TextStyle },        // style: family/size/weight/color/align
  interactive?: { kind: string, label: string | null },
  asset?: { src: string },                   // manifest path
  children?: IRNode[],                       // present for layout/component/interactive
}
```

`instanceCount` = number of times this node's `componentId` appears within the
screen (so P4 can decide "recurring → emit one component + data array").

## Detection signals (from JSON_REST_V1)

- **Layout:** `layoutMode` (`HORIZONTAL`/`VERTICAL`/`NONE`), `itemSpacing`,
  `paddingLeft/Right/Top/Bottom`, `primaryAxisAlignItems`,
  `counterAxisAlignItems`. `NONE`/absent → `mode: 'absolute'`.
- **Component:** `node.type` ∈ {INSTANCE, COMPONENT}; `componentId` for the key;
  count occurrences for `instanceCount`.
- **Content style:** reuse the scene generator's helpers (`compositeFills`,
  font family/size/weight, align) so colours match what we already render.
- **Interactive:** name regex
  `/(button|btn|cta|tab|claim|submit|领取|立即|提交)/i` on the node or its
  component name. (Figma `interactions`/`transitionNodeID`, if present, is an
  optional stronger signal — recorded as a TODO, not required.)

## Validation & testing

P1+P2 produce no UI, so validation is **structural assertions on the IR**:

- Commit a small trimmed **fixture** structure JSON + manifest (the Section 3
  reward-grid subtree) under `scripts/__fixtures__/`. Keeps the test isolated
  and fast (the full export dirs are gitignored).
- A vitest test (`scripts/build-ir.test.mjs` or co-located) runs the builder on
  the fixture and asserts:
  - the reward card → a `component` role with `instanceCount >= 9`,
  - each card's `content` children include the distinct amount strings
    (28/88/188…),
  - a background → `asset`,
  - a header (奖励预览) → `content`,
  - a CTA (立即领取) → `interactive`.
- Additionally, a smoke run on all 5 unpacked sections (manual / scripted) to
  confirm no crashes and sane role distributions; not a committed test (depends
  on gitignored exports).

## Risks / open questions

- **Interactive detection is heuristic.** Name-based matching will miss
  unconventionally-named buttons. Acceptable for the foundation; P6 can refine.
- **Reused helpers:** `build-ir.mjs` and `build-section-scene.mjs` will share
  fill/style logic. To avoid drift, extract the shared helpers
  (`compositeFills`, `box`, `exportable`, gradient) into a small
  `scripts/lib/figma.mjs` both import. (Small refactor, in scope for this spec.)
- **Component children depth:** capturing full nested children for every
  component could be verbose. For P1 we cap at capturing `content` + `asset`
  descendants (skip deep decorative nesting beyond the first baked boundary).
