# Figma → React: research findings & recommendation

**Audience:** PM / decision-maker · **Status:** research arc complete · **Date:** 2026-06

## TL;DR

We set out to find AI workflows that make producing campaign UI (React + Tailwind)
faster and better. We built a working pipeline and learned where the real value
is. **Bottom line:**

- A **deterministic pipeline** replicates a finished Figma screen to React at
  **~90% visual fidelity on the first pass, in minutes** — and it's packaged as a
  portable, cross-agent kit anyone can run.
- The **differentiating idea** — an agent layer that turns the replica into
  **structured, reusable, integration-ready components** (reusing an existing
  component library, exposing typed props + callbacks) — is **architecturally
  real but under-delivered** in practice.
- A **public competitor (`figma2react`)** already does the *rendering* half
  **better than us** (97.7% pixel fidelity, effects, exact geometry) — but does
  **not** attempt the structuring/integration half at all.

**Recommendation:** don't compete on the renderer (it's open-source and ahead).
If we continue, **adopt a best-in-class renderer as the foundation and invest only
in the integration layer** — the one thing nobody else is doing and the one the
business actually needs. If we don't continue, the **learnings + the kit stand on
their own** as a re-usable internal asset.

## What we built

A two-layer system, all driven from a single local Figma-plugin export (no REST
API, no rate limits):

1. **Layer 1 — Acquisition (deterministic).** A Figma plugin exports
   classified/deduped assets + a structural model + a ground-truth render; Node
   scripts turn it into a renderable scene. Reconstructs layout, assets, gradients,
   strokes, multi-theme variants. **~90% first-pass fidelity.**
2. **Layer 2 — Synthesis (agent-driven).** A reusable **skill** drives an agent to
   render that scene as a baked fidelity base and **promote** structured /
   interactive components on top — reusing the project's component library and
   exposing typed props + `onX` callbacks, so wiring real logic/API is a prop-swap.

Both are bundled as a **portable, cross-agent kit** (`scripts/export-kit.py` →
`figma-react-kit.zip`) that works with Claude, Codex, OpenCode, Cursor, or Gemini —
drop it into any repo and the agent adapts to that project's structure.

## What genuinely works

- **Fast, faithful first pass** — ~90% visual accuracy in minutes, positioning
  correct by construction (exact Figma coordinates), assets pixel-perfect (rendered
  by Figma), no hand-nudging.
- **Multi-theme at near-zero marginal cost** — 8 themes of one screen from one
  export.
- **Portable + agent-agnostic** — capability ships as a kit; not tied to one tool.
- **The integration *architecture* is sound** — components expose clean seams;
  "integration-ready, not pre-wired."

## Honest limitations (no spin)

- **Fidelity is ~90%, not best-in-class.** We deliberately optimized for speed and
  approximated (CSS gradients, baked complex art, bounding-box positioning) and
  **dropped effects** (shadows/blur). A cleaner, more faithful path exists (below).
- **The integration layer is under-delivered.** In practice the agent kept most
  regions "baked" and promoted little; the "structured + API-ready" claim is proven
  *in principle* (a couple of seams), not *richly demonstrated* on a full screen.
- **Some values are baked into artwork** (e.g. reward amounts inside card images)
  and can't be data-bound without further un-baking work.
- **Font fidelity is manual** (display fonts need subsetting), and the occasional
  mask/boolean needs a backfill.

## The competitor finding (`figma2react`, open-source)

A public project does the **rendering half** materially better:

| | figma2react | Ours |
|---|---|---|
| Visual fidelity | **97.7%** (measured) | ~90% |
| Geometry / effects / transforms / Figma variables | Captured + rendered exactly | Approximated / dropped |
| Output | **One flat, pixel-faithful component** | Lower-fidelity scene |
| Reusable components / props / data-binding / library reuse | **None** | **Yes (the architecture)** |
| Run model | One deterministic command | Needs an agent for Layer 2 |

They win the renderer; they **don't attempt** the structuring/integration layer.
We're **not really competitors — we're complementary.** Their renderer would make a
far better *foundation* for our integration layer.

**Why we landed behind on the renderer:** we optimized locally (each problem as it
arose) instead of doing an up-front "what's the complete Figma data model + the most
faithful render primitive?" pass. They started from that thesis. It's a fixable
process lesson, not a talent gap.

## The decision (for the PM)

Three honest options:

1. **Continue as a product — own the integration layer.** Adopt a best-in-class
   renderer (figma2react-style, open) as Layer 1; pour engineering into the
   **structuring + data-binding layer that nobody else does**, and prove it on a
   real screen (data drives the UI, real API wired). *Cost:* real eng investment.
   *Payoff:* a genuinely differentiated design→production-code tool.
2. **Bank as research (recommended if no strong product mandate).** We've answered
   the research question and the open-source landscape covers the renderer. Keep the
   **~90% kit as an internal asset** for fast campaign-UI first drafts; don't chase
   the frontier. *Cost:* ~0. *Payoff:* the learnings + a working internal tool.
3. **Narrow internal tool.** Use the pipeline as-is to speed up internal campaign
   builds (it's good enough for first drafts), without competing externally.
   *Cost:* low maintenance. *Payoff:* faster internal builds today.

**My recommendation:** **Option 1 only if there's a real mandate to build a
product** — and then strictly as "the integration layer on top of the best
renderer," not a renderer of our own. Otherwise **Option 2** — the honest, low-cost
close: the research succeeded, the kit is a useful internal asset, and we don't
out-build an open-source renderer that's already ahead.

## What's usable today, regardless

- The **portable kit** (`figma-react-kit.zip`) — ~90% Figma→React first drafts in
  any repo, any agent.
- The **multi-theme demo** (5 sections, theme variants) and the documented pipeline.
- The **learnings** — what's faithful-by-construction, what must be baked, where the
  integration value lives, and the adopt-vs-build call.
