# Lessons Learned — Figma → React with AI

Captured 2026-06-10, after a first end-to-end pass at converting the
波币大闯关 theme1 campaign screen. We deliberately did NOT get it right in one
go — these are the lessons from where it fell short.

## TL;DR

Getting AI to convert Figma well needs **three** things, and we only did the
first one:

1. **Structured data** → gets the right *components* (reuse, tokens). ✅ did this
2. **Mirror the file's OWN component library** → don't invent a kit. ⚠️ partial
3. **A visual reference + build→compare→fix loop** → gets the right *look*. ❌ skipped

Structured data alone gets you reuse-correct components in roughly the right
place. It does **not** get you fidelity. Fidelity comes from seeing the target
and iterating against it.

## What worked

- **Structured data beats a `.fig` binary or a screenshot.** A `.fig` is opaque
  bytes; a screenshot is pixels with no component identity. Framelink's
  structured data carries component names + design tokens, which is what makes
  reuse possible at all.
- **Token discipline held.** Zero hardcoded hex/gradients in components — all
  centralized in `src/index.css`. The reuse-enforcement layer (`CLAUDE.md` +
  `docs/components.map.md`) worked: the screen composed from kit components.
- **Real assets > CSS reconstruction** for artwork. Exporting `banner.png` and
  the status-icon SVGs via `download_figma_images` was faithful and cheap.
- **Framelink removed the quota wall** (hosted MCP = 6/month; Framelink REST =
  ~10/min on a Full seat).

## What went wrong (the fidelity gap)

The rendered result was "nowhere near" the Figma design. Concretely, vs the
real frame:

- Missing the **nav header** (status bar + back arrow + centered title).
- Missing **`Map pattern-bg`** — a tiled background component instanced **4×**
  that gives the design its layered depth. We ignored it entirely → flat look.
- Missing **`Component 38`** — the real step-card container, instanced **6×**.
  We hand-rolled a generic flexbox row instead of mirroring it.
- Missing the **活动详情 rewards table** (充值档位 × 关卡 × 倍数 grid).
- No **visual hierarchy** — the claimable step (第三关) is a prominent
  highlighted block in Figma; ours was just another uniform row.
- Looser, more generic spacing throughout.

## Root causes (systematic, not symptoms)

1. **Framelink is structure-only — it returns NO image.** We assembled the
   screen from 6,274 lines of coordinates with an agent that never *saw* the
   target, and never ran a compare loop. Reconstructing a layout blind from
   numbers always drifts.

2. **We invented a kit instead of mirroring the file's component library.** The
   Figma file *already declares* its components as component sets:

   | Component set | ID | Instanced in screen | We handled it |
   |---|---|---|---|
   | `Status Icon` | `1:5015` | yes | ✅ mirrored |
   | `Tab switch` | `1:5113` | yes | ✅ mirrored |
   | `Bobi Level_banner` | `1:5140` | yes | ✅ mirrored |
   | `Map pattern-bg` | `1:6034` | ×4 | ❌ missed |
   | `Component 38` (step card) | `1:5062` | ×6 | ❌ hand-rolled |
   | `Reward Card` | `1:40176` | yes | ⚠️ loose |
   | `Button` | `1:31316` | yes | ✅ |

   The framelink data tags screen nodes with `type: INSTANCE` + `componentSetId`.
   The screen is a **stack of component instances layered on the z-axis**, not
   freeform shapes. We mirrored 3, approximated 2, and ignored 2 — then composed
   it as a flat list instead of instancing the real components with their
   layering.

## The corrected pipeline (what we'll do next)

1. **Enumerate the file's component sets first** (don't design a kit top-down).
2. For each master component, read its **full definition** with
   `get_context_for_code_connect` (returns variants + properties + descendant
   tree — built for exactly this). Build each kit component from that, including
   the two we missed (`Map pattern-bg`, `Component 38`).
3. **Compose by instancing**, respecting absolute positioning and z-order:
   background pattern behind → step cards stacked → decorations on top.
4. **Render the real frame to a reference PNG** (`download_figma_images` on the
   frame node — free) and run a **build → screenshot → diff → fix** loop until
   it matches.
5. Add the missing structural pieces: nav header + a `Table` kit component for
   the rewards grid.

## Tooling reality: the "free" route still has a hard ceiling

We hit `429 Too Many Requests` on the Figma REST API mid-rebuild — locked out
of image exports for **~4.6 days**. The error: *"Your seat type (Viewer or
Collaborator) has a lower API rate limit. Your starter plan has limited API
access."*

Correction to an earlier assumption: **a Full seat does NOT reliably get
~10 req/min on a Starter plan.** The underlying Figma REST API throttles
Starter accounts hard — especially Tier-1 endpoints (GET file / nodes /
images). Framelink removes the *hosted-MCP* 6/month cap but is still bound by
these REST limits, and a Starter account can exhaust them and get locked out
for days. "Free + open-source MCP" ≠ "unlimited."

Practical implications:
- **Budget API calls even on Framelink.** Pull the structured data ONCE, cache
  it (we saved `bobi-theme1.framelink.yaml`), and render reference images
  sparingly. Don't batch-render many nodes.
- **Manual export bypasses the REST limit entirely.** Exporting a layer as
  SVG/PNG from the Figma *UI* is client-side — it does NOT hit the REST rate
  limit. For a quota-locked Starter account, manual export is the reliable way
  to get assets.
- For real volume, this needs a **paid plan** (Pro+, Full/Dev seat) — the free
  route is fine for learning/prototyping, not for converting dozens of screens
  in a sitting.

## Principles to carry forward

- **Mirror the design system, don't reinterpret the screen.** The components
  exist in the file; reproduce them, then instance them.
- **You must let the model SEE the target.** Structure tells you *what*; the
  image tells you *how it should look*. Pull a reference render and iterate.
- **Composition is layered, not linear.** Respect z-order and absolute
  positioning; don't flatten everything into a vertical flow.
- **Reuse compounds — but only if the kit is faithful.** A loose kit makes every
  downstream screen loose too.
