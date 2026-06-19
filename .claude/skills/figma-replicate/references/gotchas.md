# Fidelity gotchas — each rule and the bug it prevents

Every item here cost a debugging cycle on a real replication. Read before
changing the generator or plugin.

## Positioning

- **Coordinates, not eyes.** `node.absoluteBoundingBox` (x, y, w, h) is exact.
  Normalise to the screen frame's origin: `x - screen.x`, `y - screen.y`. If a
  thing looks mispositioned, the coord read or the screen origin is wrong — do
  not nudge by hand.
- **Paint order = document order.** Figma `children[0]` is painted first
  (bottom); last is on top. A pre-order DFS yields correct stacking. Render scene
  nodes in array order so later nodes stack on top.
- **Null bounding boxes exist** (some boolean/mask nodes). Guard `box()` →
  descend into children instead of crashing.

## Text

- **Composite fills.** Figma paints `fills` bottom→top. Text frequently has
  `[colour, #000000 @ 0.3–0.4]` — a translucent black overlay that darkens the
  colour. Picking `fills[0]` renders it too bright/washed. Composite with
  source-over alpha; result for `#81ccd1 + 40% black` ≈ `#4d7a7d`.
- **Strokes.** `node.strokes` (paint) + `node.strokeWeight`. Render with
  `-webkit-text-stroke-color/width` + `paint-order: stroke fill` so the stroke
  sits behind the fill and the glyph stays crisp. `strokeAlign` is usually
  OUTSIDE; visible weight ≈ `strokeWeight`.
- **Per-character colour runs.** A two-tone title (e.g. 活动**详情** — 活动 dark,
  详情 accent-orange) stores the accent in `characterStyleOverrides` (a per-char
  array of style ids) + `styleOverrideTable[id].fills`; `node.fills[0]` is only
  the BASE. Reading `fills[0]` alone flattens the title to one colour. Split into
  runs: for each char, `fills = styleOverrideTable[ov[i]]?.fills ?? node.fills`,
  composite, coalesce equal-colour neighbours, emit `runs:[{text,color}]` (null
  when uniform). Render as inline `<span style={{color}}>`. Symptom: "the
  highlighted half of a heading is the wrong colour / all one colour".
- **Font family.** `style.fontFamily`. System CJK faces (PingFang SC, DIN
  Alternate) render on macOS but not elsewhere — always emit the family + a
  fallback stack. Non-system display faces (e.g. YouSheBiaoTiHei / 优设标题黑)
  must be self-hosted.
- **Subsetting fonts.** A CJK display font is multi-MB; you usually need a few
  header glyphs. `pyftsubset font.ttf --text="活动详情细则" --flavor=woff2
  --output-file=out.woff2` → ~1KB. Verify glyphs with fontTools cmap.
- **Serve fonts from `public/`, not a CSS relative url.** Tailwind v4 / Lightning
  CSS silently dropped a relative `url("./assets/fonts/x.woff2")` from the build.
  `public/fonts/x.woff2` + `url("/fonts/x.woff2")` is reliable (copied verbatim).
- **Scope subset fonts with `unicode-range`** so the same family name can pull
  the local subset for those glyphs and a fuller source for the rest.
- **`<img src>` SVGs are isolated** — they do NOT inherit `currentColor` or page
  CSS. The section-2 "swap accent → currentColor" trick only works for INLINED
  `<svg>`. With the asset/`<img>` model, recolour means distinct assets.
- **Baked vs loose text.** If a TEXT node sits inside a whole-exported decor
  group, its glyphs are already in that SVG (as paths) — do NOT also overlay live
  text (double render, wrong font). The generator stops descending at
  whole-export boundaries, so only genuinely-loose text is emitted.
- **Single-line slack.** System fonts measure a hair wider than Figma's tight
  box and wrap CJK labels (活动详情 → 活动详/情). Add symmetric horizontal slack
  (≈ `0.6 * fontSize`) to single-line text; keep multi-line (`\n`) exact.

## Dedup — by rendered content, never by a guessed signature

- **The lesson:** guessing whether two nodes render the same (from name, area,
  colour, text…) ALWAYS misses a case eventually — each new section found a new
  collapse (theme recolours, then reward-grid text overrides). Stop guessing.
- **Render → hash the bytes → dedup on that.** The plugin already renders every
  asset; hash the SVG string / PNG base64 and collapse only byte-identical
  output. Ground truth: theme recolours, reward-grid cards (28¥/88¥/188¥… one
  component, different overrides), and icon-only differences all stay distinct
  automatically. `exportAsync` renders an instance WITH its overrides, so each
  distinct instance produces distinct bytes.
- **Plugin writes `manifest.json` (nodeId → asset path); generator reads it.**
  The generator never re-derives a dedup key, so it can't drift from the plugin
  and there's no signature to keep "byte-identical" across two files.
- **Symptom of the OLD content-blind dedup:** "all cards same icon/amount",
  "missing texts", "background always <one theme>" — all one cause (distinct
  instances collapsed to the first). If you ever see it again, the manifest /
  content-hash path regressed.
- **Cost:** the plugin renders all candidates instead of skipping dupes (seconds,
  local). Worth it — it's the difference between "works on any section" and
  "patch + re-export per section".

## Instances with overrides (reward grids, repeated cards)

- A repeated card/row is usually ONE component instanced N times with per-item
  text + icon overrides. The export model exports an instance WHOLE (baked text +
  icon), then STOPS — so per-card content lands in the asset, NOT as loose text.
  That's correct *as long as dedup keeps the cards distinct* (see `nodeSig`).
- Symptom of the bug: "all cards show the same icon/amount", "missing texts",
  "background always purple". All three are one cause — content-blind instance
  dedup collapsing distinct instances to the first. Content-hash dedup (current)
  fixes it: distinct overrides → distinct rendered bytes → distinct assets.

## Decor / shapes

- **`DECOR_MIN_AREA = 16`.** 500 (~22×22) silently dropped real small icons. The
  real noise guard is `exportable()` (rejects <1px w/h).
- **Only `RECTANGLE`/`FRAME` get a CSS `rect` background.** Approximating an
  ellipse, boolean union, or vector with a rect produces a square instead of a
  circle, or crossing bars instead of a "+". Those shapes MUST be exported SVGs.
- **Hidden / zero-area nodes throw on `exportAsync`.** Skip `visible === false`
  and `w<1 || h<1` (the plugin's `exportable()`).
- **Mask groups & some booleans fail to export.** They land in `failed.json`
  with full id + box + fills. Many are off-canvas or have invisible fills (check
  `fill.visible === false`) and can be ignored; the rest fetch by id via REST
  `images?ids=` or reconstruct simple fills from JSON.

## Container fills & borders (rects we descend through)

- **Layer ALL fills, don't pick `fills[0]`.** Figma stacks fills bottom→top and
  uses translucent overlays as an idiom: a base colour + `#000 @ 0.10` = a darker
  band; base + `#fff @ 0.93` = a lighter band. Taking the first fill flattens
  both to the base. Emit a CSS `background` with one layer per fill (SOLID →
  `linear-gradient(c,c)` so it can stack), reversed (CSS paints the first layer on
  top). Fast-path a single opaque solid to a flat hex.
- **Gradients must be alpha-aware.** A frame's background is often
  `[SOLID base, GRADIENT white α0.6→α0.2]` — a translucent sheen over a solid.
  If `gradientCss` drops the stop alpha it renders opaque white and **occludes the
  whole background** (symptom: "why is everything white?" when the export clearly
  has colour). Convert stops with `rgba(stop.color, stop.color.a * fill.opacity)`,
  and keep the solid base as a lower layer (never "gradient wins, drop solids").
- **Per-side strokes via `individualStrokeWeights`.** Table cells stroke only the
  sides that form a *shared* divider (`{left:0.5}`, or `{left:0.5,right:0.5}`),
  with `top/bottom:0`. A uniform 4-side `border` boxes every cell and doubles up
  on shared edges — the classic "table looks weird, can't describe it". Read
  `individualStrokeWeights` and emit per-side widths
  (`borderTop/Right/Bottom/LeftWidth`); fall back to `strokeWeight` (all sides)
  only when it's absent. Use `box-sizing: border-box` so a sub-px line doesn't
  shift the grid.

## Tables / grids — bake, don't reconstruct

- **The lesson (cost: 4 rounds).** A table's grid is often NOT real lines:
  vertical dividers are 0.5px per-side cell strokes, and *horizontal* separators
  are frequently just **1–4% opacity fill bands** (`white @ 0.93` body vs
  `white @ 0.97` row) — invisible under faithful CSS reconstruction, crisp only in
  Figma's native renderer. Reconstructing cell-by-cell will always look subtly
  wrong ("missing the horizontal lines").
- **Why a hand-built table "just worked":** it was a bespoke `<table>` component
  with real CSS borders — not reconstructed from the node tree. The pipeline-
  consistent equivalent is to **render the whole grid frame to ONE asset** so you
  get Figma's exact pixels (lines, bands, merged cells) for free.
- **Plugin rule (`isGridPanel`):** whole-export a FRAME/GROUP whose subtree is a
  *pure grid* — no instances/components/image-fills/vectors (those are their own
  exportables) — and holds ≥ `GRID_MIN_CELLS` (6) descendants with
  `individualStrokeWeights`. Place before the children-descend in `walk` (once you
  recurse, the grid is lost). The purity check makes it fire at the table/card
  level, never on the screen frame (which contains the banner image + card
  instances). Validate on the structure JSON first: simulate the walk and confirm
  it bakes the table(s) and nothing larger.
- **The two-tone section header is a sibling, not inside the grid** — it stays
  live (per-character runs), so baking the table doesn't re-bake the heading.

## Plugin accounting

- **Count successes, not attempts.** Increment stats AFTER `exportAsync`
  resolves, else a green-looking stats block hides failures.
- **Failures must be identifiable.** Log node `id` (+ box, fills, reason), not
  just `name` — names repeat heavily across theme variants, making name-only logs
  useless. Synthesize a real reason; Figma export errors often have no `.message`.
