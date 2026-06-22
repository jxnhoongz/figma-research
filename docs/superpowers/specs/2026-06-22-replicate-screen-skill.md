# `replicate-screen` — agent-driven Figma→React synthesis (Layer 2b) — Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Phase:** Track 1 (Design→Code) — pivot from a deterministic emitter to an
agent-driven synthesis skill.

## Context & motivation

The structured-output upgrade proved, end-to-end, that a Figma export can become
**structured, editable** React (the `Section3Structured` reward grid: typed data
+ slot tree + live inspector). But it did so with a **deterministic emitter**
(`scripts/emit-component.mjs`) tuned to one screen: grid detection, slot trees,
field-name heuristics. Extending it to the next pattern (a detail table, a
themeable button) means hand-writing a new detector each time. That is a
treadmill that never reaches *general* UI — different screens need different
logic, and encoding that logic by hand does not scale.

The pipeline has **two layers** that generalize very differently:

- **Layer 1 — Acquisition (general, keep investing).** The Figma plugin, SVG/PNG
  classification, the chrome (text-less) split, content-hash dedup, and
  `scripts/build-ir.mjs` (role-tagged IR). This runs on *any* screen. It is the
  reusable substrate.
- **Layer 2 — Synthesis (IR → React).** Turning the IR into components. Done as a
  deterministic emitter, this is the section-specific treadmill. Done by an
  **agent**, "different screens need different logic" becomes per-screen
  *reasoning* (what LLMs are good at) rather than per-screen *code we maintain*.

This spec designs **Layer 2b**: a skill that drives an agent to synthesize a
screen from the Layer-1 IR + assets, **reusing the project's component library
and design tokens**, creating + registering new library components when no match
exists, and baking only genuine art. The deterministic emitter is **banked as a
finished proof** — frozen, not extended.

## Goal

A repeatable skill, `replicate-screen`, that takes a Figma export (IR + assets +
chrome + a ground-truth render) for one screen and produces:
1. a screen component composed of **reused** library components where they match,
2. **new, registered** library components where they do not, and
3. baked `<img>` assets only for genuine art,
verified against a ground-truth render via a render→screenshot→diff loop.

## Non-goals

- **Portability / packaging** (running in an arbitrary external repo, publishing
  the plugin as an installable tool) — deferred. This skill lives in *this* repo
  and targets *this* repo's `src/components/`, `docs/components.map.md`, and
  `src/index.css` `@theme`.
- **Behavior / logic / API wiring** (P6) — deferred. The skill emits presentational,
  editable components; interactive nodes are reused/created as components but not
  wired to handlers or data sources. (No API examples exist yet.)
- **Replacing Layer 1.** The plugin/IR keep their current design; this spec only
  *adds* a ground-truth full-screen render to the export (see Verification).
- **Not a deterministic emitter.** The skill is a *procedure for an agent*, not a
  program that parses the IR into code by fixed rules.
- **Not pixel-perfect.** Output is "hybrid by confidence"; the diff loop holds a
  defined visual bar, not exact equality.

## Architecture

```
Layer 1 (exists, general)                 Layer 2b (this skill)
┌─────────────────────────────┐           ┌──────────────────────────────┐
│ figma-plugin/code.js         │  export   │ skills/replicate-screen/      │
│  → assets (svg/png) + chrome │ ───────►  │   SKILL.md  (agent procedure) │
│ scripts/build-ir.mjs         │  IR.json  │                              │
│  → role-tagged IR            │  manifest │ reads: IR, manifest, chrome,  │
│ + full-screen render (NEW)   │  render   │   components.map.md, @theme,  │
└─────────────────────────────┘           │   ground-truth render         │
                                           │ writes: screen component,     │
   reference repo state:                   │   new library components,     │
   src/components/ , components.map.md ,    │   updated components.map.md   │
   src/index.css @theme                    └──────────────────────────────┘
```

The skill is the only new long-lived artifact. The deterministic emitter
(`scripts/emit-component.mjs`, `Section3Structured`) stays as-is — a reference,
not a dependency.

## Inputs / prerequisites

The skill refuses to run unless these are present (fail fast, explicit message):

1. **Export dir** containing: the role-tagged `IR.json` (`build-ir` output), the
   `manifest.json` (node id → asset path, SVG/PNG-classified), `chrome.json`
   (text-less backgrounds), and a **ground-truth screen render** PNG (see
   Verification).
2. **Target component catalog** — `docs/components.map.md` (Figma layer name →
   `<Component>` + props).
3. **Design tokens** — `src/index.css` `@theme` block.
4. **A render harness** — a way to mount the generated screen and screenshot it
   (the existing Vite app + Playwright, as used in this repo's validation).

## The procedure (the body of SKILL.md)

The agent executes these steps in order, announcing each.

### 1. Inventory
Read `IR.json`. Produce a flat **region list**: for each significant node, record
`{ figmaName, role, box, hasText, assetClass }`. Roles come straight from the IR
(`component | content | layout | interactive | asset`). This is the agent's work
list.

### 2. Decide per region — the confidence ladder
For each region, choose exactly one disposition and **record a one-line
justification** (kept in a synthesis log the user can read):

- **REUSE** — the region's Figma name or structure matches a row in
  `components.map.md`. Emit `<Component …>` with props/data extracted from the IR
  (text → props, repeated children → a data array). Justify with the matched row.
- **CREATE + REGISTER** — no catalog match, but the region is structured UI (text,
  layout, gradient/solid fills, a repeated pattern). Build a new component under
  `src/components/<Name>/` following repo conventions (one folder, `Name.tsx`,
  co-located `Name.test.tsx`, `data-variant`, props-in/JSX-out, tokens not hex),
  then **append a row to `components.map.md`**. Justify why no existing component
  fit.
- **BAKE** — the region is `asset`-role genuine art (mascot photo, decorative
  vector cluster) with no text and no token-able fill. Emit `<img src=…>` from the
  manifest asset. Justify as art.

Tie-breakers: prefer REUSE over CREATE; prefer CREATE over BAKE whenever the
region carries text or a token-able fill (so the output trends toward real
components, not pixels).

### 3. Assemble
Compose the screen component from the dispositions, positioning regions per the
IR layout. Tokens from `@theme` only; if a needed token is missing, add it to
`@theme` first (never hardcode hex/spacing — repo rule).

### 4. Verify (the trust gate)
Render the assembled screen via the harness, screenshot it, and compare to the
**ground-truth render**:
- **Visual compare** — the agent inspects both images and lists discrepancies
  (wrong color, mis-position, missing region, overflow).
- **Pixel-diff gate** — compute a difference ratio (e.g. `pixelmatch`); a region
  is "regressed" if its local diff exceeds a stated threshold. The threshold is a
  guardrail against silent drift, not a pass/fail SLA.
Fix the largest discrepancies and repeat until no discrepancy exceeds the bar or a
fixed iteration cap is hit. Report residual diffs honestly (never claim 1:1 if
the diff says otherwise).

### 5. Output + report
Deliver: the screen component, any new `src/components/*`, the updated
`components.map.md`, and a synthesis log (per-region disposition + justification +
final diff). The log is the research artifact — it shows *how much was reused vs
created vs baked*.

## Data flow

`IR.json` (+ manifest/chrome) → region list → per-region disposition → component
tree → rendered screenshot → diff vs ground-truth render → fixes → final
components + log. No mutation of Layer-1 outputs; the skill only reads them and
writes into `src/`.

## Verification reference — the ground-truth render (Layer-1 add)

Diffing against the **baked scene** (`build-section-scene` output) is circular —
it is *our* reconstruction, so it would grade the agent against our own possibly-
wrong pixels. The honest reference is what Figma actually shows. The plugin
already renders nodes; this spec adds a one-time **flat full-screen PNG export**
of the screen frame to the plugin output (`<screen>.render.png`). This is the
only Layer-1 change and is a hard prerequisite of step 4.

## Error handling

- **Missing prerequisite** (no IR / no render / no `components.map.md`) → stop with
  a precise message naming what is missing and how to produce it. Never proceed on
  partial input.
- **No confident disposition** for a region → default to BAKE and **log it as a
  gap** (so silent omission can't masquerade as success). The log must surface it.
- **Diff never converges** within the iteration cap → stop, report the residual
  diff and the regions still off. A truthful "85%, these 3 regions differ" beats a
  false "done".
- **New token needed** → add to `@theme` and note it; never inline a hex value to
  dodge the rule.

## Testing — how we validate the *skill*

The skill is a procedure, so validation is empirical, on two screens:

1. **Section 3 (calibration).** We already have its IR, assets, existing
   components (`Button`, `RewardTable`, …), and can produce its ground-truth
   render. Run the skill; success = it **reuses** the existing components (not
   re-creates them), composes the screen, and the diff loop lands within bar.
   This proves the reuse path and the verification loop.
2. **A different screen (generality).** Point the skill at a screen it has not
   seen (e.g. a section with an unseen component). Success = it **creates +
   registers** the genuinely-new components, reuses the shared ones, and lands
   within bar. The synthesis log's reuse-vs-create-vs-bake ratio **is the research
   result** — it measures how much the library compounds.

Component-level: every CREATE + REGISTER output must itself meet the repo bar — a
co-located `*.test.tsx` asserting behavior via `data-variant`, tokens not hex.

## Risks

- **Agent reliability / non-determinism.** Codegen varies run-to-run. Mitigation:
  the diff loop is the gate; the iteration cap + honest residual report prevent
  false "done". The defined visual + pixel-diff bar is the objective check.
- **Reuse matching is fuzzy.** `components.map.md` is prose; matching is by name +
  structure. Mitigation: the map stays the single source of truth; every REUSE
  decision carries a justification in the log, so wrong matches are auditable.
- **Created components could be sloppy.** Mitigation: CREATE + REGISTER must meet
  the same bar as hand-written (tests, tokens, `data-variant`); the verify loop
  catches visual failures, the tests catch behavioral ones.
- **Ground-truth render fidelity.** If the plugin's full-screen render itself is
  imperfect (font substitution, unrenderable masks), the bar inherits that error.
  Mitigation: note known render limitations in the log; the render is still closer
  to truth than our baked reconstruction.
- **Scope creep into Layer 1.** The only sanctioned Layer-1 change here is the
  full-screen render. Deeper plugin work (e.g. the gradient-button fill-split for
  themeable colors) is valuable but tracked separately, not bundled into this
  skill.
