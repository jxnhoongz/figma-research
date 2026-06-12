# Research Tracks — AI for Campaign UI

The purpose of this repo is to find AI workflows that make producing campaign
UI (React + Tailwind) faster and better. There are two distinct tracks. We are
focusing on **Track 1 first**.

See also: [workflow.md](./workflow.md) (the pipeline) and
[lessons-learned.md](./lessons-learned.md) (what we've learned the hard way).

---

## Track 1 — Design → Code (1:1 replica)  ← CURRENT FOCUS

**Prerequisite:** the Figma design already exists and is finished. We are *only*
converting an existing design to code. No design generation.

**Goal:** a 1:1 replica of the Figma screens in React + Tailwind.

**Why 1:1 (even though production would accept ~95%):** it's a forcing function.
Holding the bar at pixel-fidelity exposes exactly where the pipeline leaks
(missing components, wrong layering, asset gaps). It's a research tool, not a
production SLA.

### The two inputs a 1:1 replica needs
1. **Assets** — every artwork piece, labeled + downloaded, classified SVG vs PNG.
2. **LLM-readable structure** — what each screen contains (layout, component
   instances, tokens) in a form the model can actually read.

### Key efficiency principle: library-once + theme-deltas
The N themed screens are **NOT N separate designs** — they are **one shared
component library, recolored**. So the efficient unit of work is:

```
1 × shared component kit        (extract ONCE)
+ M × theme token sets          (just colors/gradients — small)
+ per-theme raster art          (banners/photos that genuinely differ)
= all M screens
```

Extracting "per screen" repeats the same work M times. Extract the library
once; screens 2..M become mostly token swaps + their banner art.

### Tool split (beats the rate limit)
Use the right tool for each input — do NOT push both through the rate-limited API:

| Input | Tool | Why |
|---|---|---|
| **Assets** (bulk, one-time) | **Client-side export** (Figma UI / batch-export plugin) | Not rate-limited; layer names → filenames = auto-labeled |
| **Screen structure** (small) | **API structured data** (Framelink `get_figma_data` → YAML) | Cheap, few reads; this is what the LLM reads |

### Asset classification (SVG vs PNG)
- **SVG** = vector pieces that **recolor across themes** (icons, status badges,
  the map path, decorative vectors). Export as SVG, then process fills →
  `currentColor` / CSS variables so they're **themeable**. Raw export alone is
  not themeable — the fill-swap is a required step.
- **PNG** = raster/photographic art that does NOT recolor (mascot photos,
  freepik backgrounds, gift box, ingot). Per-theme.
- **Pure CSS** (no asset) = gradients, rectangles, text — reconstruct with tokens.

### The pipeline (smallest-first)
1. **Inventory + classify** the component library (done for this file — see
   lessons-learned). No API.
2. Pick **ONE theme**, run the full clean loop end-to-end:
   a. **Bulk-export** its assets client-side (SVG themeable + PNG raster), labeled.
   b. **One structured read** for its layout (Framelink YAML).
   c. **Build** the kit + screen; wire tokens; reuse-enforced (`CLAUDE.md`).
   d. **Visual-compare loop**: render → screenshot → diff vs reference → fix.
3. Extract the reusable kit; verify 1:1.
4. Scale to remaining themes via token swaps + per-theme banner art.

### Status
- Component inventory + SVG/PNG classification: done (cached data, no API).
- theme1: ~85–90% via reconstruction; NOT yet asset-faithful (map-path is CSS
  stand-in). Blocked on client-side asset export.
- **Next concrete step:** client-side bulk export of theme1's real assets.

### Known constraints
- Figma **Starter plan REST API is harshly rate-limited** (429 lockouts for
  days). Client-side export sidesteps it. See lessons-learned.
- Proprietary display fonts need sourcing or baking into raster.

---

## Track 2 — From Scratch (AI-generated assets)  ← LATER

**Premise:** no finished Figma design. Generate the screens — including artwork
(hero images, mascots, decorative illustrations) — with AI.

**Open problem:** find a good tool/workflow for generating *campaign-quality*
assets that are consistent (same mascot/style across screens) and usable
(transparent backgrounds, correct dimensions, themeable where needed).

**Candidate pieces to research (not yet evaluated):**
- Image models for hero/illustration generation (consistency across a set is
  the hard part — character/style locking).
- Vector/SVG generation or raster→SVG for themeable pieces.
- A layout/structure source (generate the component structure, not just pixels).
- Tie-in with the Track 1 kit: generated assets drop into the same themeable
  component library.

**Parked** until Track 1's design→code pipeline is solid. The kit + token
architecture from Track 1 is the substrate Track 2 will fill with generated art.
