# Figma → React Pipeline — Design Spec

**Date:** 2026-06-10
**Status:** Approved (brainstorming complete, pending spec review)
**Stack:** Vite + React + TypeScript + Tailwind + CVA

---

## 1. Purpose

Build a React + Tailwind workspace that proves a **reuse-enforcing
Figma → code pipeline**. The deliverable is not just one converted screen —
it is a repeatable workflow where the AI **reuses an existing component kit
and design tokens** instead of reinventing components from scratch.

This project is the artifact for an internal exploration into using AI to
convert campaign UI (mobile gaming/promo screens) into React + Tailwind
faster and more consistently.

### The problem this solves

Feeding a model unreadable or unstructured input (a `.fig` binary, or a bare
screenshot) gives it no component identity, so it redraws every element
inline — "reinventing the wheel." The fix is structural, not a better
one-shot prompt:

1. Give the model **structured design data** (component names, tokens, layout)
   via the Figma MCP — not pixels, not binary.
2. Give it an **existing component library** in the repo to reuse.
3. Give it **explicit reuse rules** (CLAUDE.md) + a **component mapping**
   (docs/components.map.md) so it knows Figma `Tab switch` → `<TabSwitch>`.

## 2. Scope

**In scope (definition of done):**

- Git repo + Vite scaffold (React / TS / Tailwind / CVA / Vitest) running.
- `CLAUDE.md` with component-reuse rules.
- `docs/workflow.md` — the Figma→React pipeline writeup (meeting artifact).
- `docs/components.map.md` — Figma layer-name ↔ code component mapping.
- A 5-component reusable kit built from structured Figma data, with design
  tokens wired into Tailwind and variant unit tests passing.
- One full screen — **波币大闯关 theme1** (`node 1:969`) — composed by
  **reusing** the kit (visible proof reinvention is gone).
- A short writeup contrasting readable structured data vs the unreadable
  `.fig` binary (the demo).

**Out of scope (for now):**

- Official Figma Code Connect publishing (likely plan-blocked on Starter;
  deferred, structure left upgrade-ready).
- The other campaign families (Lucky Wheel, Upgrade ladder, VIP bonus,
  Click-to-claim) — converted later once the pipeline is proven.
- Heavy E2E / pixel-matching tests.
- Backend / data wiring — these are static presentational screens.

## 3. Architecture

```
figma_learning/
├── CLAUDE.md                     # enforcement layer (reuse rules)
├── docs/
│   ├── superpowers/specs/        # this design doc
│   ├── workflow.md               # Figma→React pipeline writeup
│   └── components.map.md         # Figma layer-name ↔ code component
├── src/
│   ├── components/               # the reusable kit
│   │   ├── Button/
│   │   ├── TabSwitch/
│   │   ├── StatusIcon/
│   │   ├── Banner/
│   │   └── RewardCard/
│   ├── screens/
│   │   └── BobiLevelTheme1/      # composed from the kit
│   ├── tokens/                   # mirrors Figma variables
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.ts            # tokens wired here (no hardcoded hex)
├── vite.config.ts
└── package.json
```

### Component boundaries

Each kit component lives in its own folder with: the component, its CVA
variant definition, and a co-located test. Components are **presentational
and immutable** — props in, JSX out, no internal mutation. Each answers:
what it does, how to use it, what it depends on (tokens only).

| Component    | Figma source (instance name) | Purpose |
|--------------|------------------------------|---------|
| `Button`     | `Button`                     | CTA / claim actions, variants |
| `TabSwitch`  | `Tab switch`                 | Top tab toggle |
| `StatusIcon` | `Status Icon`                | Step status (locked/active/done) |
| `Banner`     | `Bobi Level_banner`          | Header banner |
| `RewardCard` | `Reward Card`                | Prize/reward display |

Screen-specific compositions (Step Block, Steps List) are assembled in
`screens/`, not added to the shared kit, unless they prove reusable.

## 4. Data flow — MCP read plan (quota-aware)

The account is on Figma **Starter = 6 MCP reads/month**. We conserve by
using the already-cached `get_metadata` dump (free) and spending reads only
on what the cache lacks.

| # | Call | Gives us | Cost |
|---|------|----------|------|
| 0 | `get_metadata` | structure, all names/hierarchy/sizes | cached, free |
| 1 | `get_screenshot` (`1:969`) | the visual to match | 1 read |
| 2 | `get_design_context` (`1:969`) | real CSS/layout + token usage for screen + instances | 1 read |
| 3 | `get_variable_defs` | named design tokens | 1 read |

**~3 reads total.** Risk: a 1611px screen's `get_design_context` may exceed
the token limit — if so it spills to a file and is queried with `jq`
(no extra reads), the same pattern already used for the metadata dump.

## 5. The reuse mechanism (kills reinvention)

Three layers, all free on Starter:

1. **`CLAUDE.md` rule:** "Before building any screen, check
   `src/components/` and `docs/components.map.md`. Reuse existing components
   and tokens. Only create new if none exists; match existing prop APIs.
   Never hardcode hex/spacing — use Tailwind tokens."
2. **`docs/components.map.md`:** table mapping Figma layer names →
   code component + props. Lightweight stand-in for Code Connect.
3. **Tokens in `tailwind.config.ts`:** semantic classes (`bg-primary`),
   never `bg-[#FF5A1F]`.

## 6. Testing

Scaled to an exploratory UI workspace (intentionally lighter than full
80%-all-types):

- **Vitest + React Testing Library** for the kit: each component renders and
  its CVA variants resolve correctly.
- No heavy E2E / pixel-matching yet — low value while tinkering. Playwright
  can be added once the pipeline stabilizes.

## 7. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| MCP monthly quota (6/month) | cache-first + ~3 strategic reads; spill large output to file |
| `get_design_context` output too large | write to file, query with `jq`, target sub-nodes if needed |
| Code Connect blocked on Starter | use lightweight local mapping; structure upgrade-ready |
| Node version compatibility | verify Node ≥ 18 before scaffolding Vite |
| Bespoke gaming visuals (vectors) | export assets / approximate with CSS; flag any unrecoverable art |

## 8. Open follow-ups (post-MVP)

- Convert remaining theme variants (2–6) reusing the kit.
- Convert other campaign families.
- Upgrade lightweight mapping → official Code Connect if account goes Pro.
- Consider Framelink MCP (free PAT, ~10 reads/min) to escape the 6/month cap.
