# theme1 Fidelity Issues (from user review, 2026-06-12)

Comparing our render (v4) against the real Figma theme1. Two problems.

## Issue 1 (small) — Banner + table don't recolor on theme switch
- **Banner:** stays theme1's photo across all themes. Partly known (the other 5
  banner PNGs are export-blocked) — but also a raster photo can't be recolored;
  each theme needs its OWN banner art.
- **Table (活动详情):** the rewards table colors do NOT follow the theme accent
  on switch — they stay static. Bug: the table's tokens aren't wired to
  `--theme-accent` (despite the build claiming the header recolors). Fix: drive
  table header/stripe/border off the theme accent like the rest of the chrome.

## Issue 2 (MAJOR) — Theme/asset structural mismatch

### 2a. Missing the "闯关排列" container frame
- The real design wraps ALL the step cards inside a single **frosted rounded
  container box** (with the "闯关排列" title pill as its header). We rendered the
  step cards as separate full-width cards with no wrapping container.
- **Root cause (important lesson):** this container is **NOT a registered Figma
  component** — so it did NOT appear in the Section-2 component-masters list we
  extracted from. It's a plain frame, **copy-pasted across all 6 themes**.
- **Implication:** extracting only the registered component masters MISSES
  reused-but-not-componentized frames. We must extract from the actual SCREEN
  structure (the theme frames), not just the component library. Anything that
  visually repeats across themes is "a component" for our purposes even if Figma
  didn't formalize it.

### 2b. Step "bridges" are layered/arranged wrong
- We render the map-pattern connectors ("bridges") as separate strips **below**
  each card. In the real design the path sits **behind** the cards — the cards
  overlap and sit ON the path, in a **serpentine/zigzag** arrangement with the
  status icons protruding to alternating sides.
- Fix: the map path is a background layer (z-behind); cards overlap it; layout
  is serpentine, not a flat vertical stack with bridges between rows.

## Fix plan (when we tackle it)
1. **Re-read the actual theme1 SCREEN frame structure** (not the component
   masters) to capture the 闯关排列 container + the real serpentine step layout +
   z-order. Reads are available now (frugally).
2. Build the missing container frame as a component; nest the step cards inside.
3. Re-layer: map path behind, cards overlapping, serpentine arrangement.
4. Wire the table colors to `--theme-accent`.
5. Per-theme banner art (blocked on export quota).
