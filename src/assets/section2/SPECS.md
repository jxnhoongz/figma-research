# Section 2 component-kit specs

Source: Figma file `Kzxlo4FmH0RzgnZqhZc3In`, Section 2 = node `1:108`.
Extracted via `figma-code-context` MCP (`export_svg`, `get_component_variants`, `get_node`).

> **Themeable color slot convention:** the master fill `#9A41FE` (and the
> purple-family `#8A38F5` master border, already stripped) is the per-theme
> accent. In the 6 themed screens this slot is recolored per theme. Status
> colors (grey for locked/fail, gold/orange for current) are *semantic* and do
> NOT change per theme.

---

## Status Icon — set `1:5015` (4 variants)

- Variant nodes: Passed `1:5016`, Locked `1:5028`, Fail `1:5043`, Current `1:5055`.
- Frame: `width: 51px`, fit-content height, `display:flex; flex-direction:column; align-items:center; padding:1px 0`.
- Rendered SVG viewBox ~`57 x 52` (drop-shadow + offset bleed).
- Structure: stacked discs — outer white ellipse (rx 25.5 / ry 22) with inner
  shadow, a mid 3D "puck" (rx 21.5 / ry 17), and a top circle (r 15) holding the glyph (r 8.5).
- Drop shadow: `dx:6 dy:2`, `rgba(0,0,0,0.15)`. Inner highlight on top disc.
- **Themeable slot:** `#9A41FE` (Passed only — the puck + glyph circles + check stroke `#F6FCFC`).
- Status (NOT themeable) colors:
  - Locked: greys/blues — fill gradient `#C2D4E3 → #3F6075`, border `#A9C2DE → #AABDD7`, padlock `#7897BA`.
  - Fail: same grey body as Locked, white "X" glyph.
  - Current: gold/orange star — body gradient `#FFA102 → #FE5302`, star fill `#8D4F00 → #F57601`, star stroke `#F9B33D → #FFF9C2`, top disc `#FFEB66 → #F9AC2D`.

## Component 38 (step card) — set `1:5062` (6 variants: status × side)

- Variant nodes: passed-left `1:5063`, passed-right `1:5070`, current-left `1:5077`,
  current-right `1:5088`, locked-left `1:5099`, locked-right `1:5106`.
- Layout: `flex:1 0 0; align-self:stretch; display:flex; flex-direction:row; align-items:center`.
- Rendered card ~`235–245 x 60`, radius `10` outer / `8` inner, 1px gradient border.
- A little triangular "tab" pointer juts out left (left variants) or right (right variants),
  `rotate 45°` arrow, gradient `#E57811 → #FDBD39`.
- The current variant card body gradient: `#FB6924 → #FBA136` (the orange "active" highlight).
  Inner panel `#FDFDFD`; right wedge layered fills `#FDECC9 / #FDA11C / #FF7545 / (#FF9A68→#FE9000)`.
- **Themeable slot:** `#9A41FE` (appears in the passed variants' vector accents; 4 uses).
- **RASTER NOTE:** passed-left/right and locked-left/right SVGs each embed a
  base64 `<image>` (a baked-in bobi mascot photo) inside a `<pattern>` fill.
  These are NOT pure vector — they are self-contained SVG-wrapped raster.
  The `current-*` variants ARE pure vector (~2 KB each).

## Tab switch — set `1:5113` (2 variants)

- Variant nodes: 昨日闯关 (yesterday) `1:5114`, 今日闯关 (today) `1:5127`.
- Frame: `width: 362px`, `flex-direction:row; gap:2px; justify-content:space-between; align-items:center; overflow:hidden`.
- Pill toggle, warm orange/gold palette: `#FF3B00 #FF6100 #FF8400 #FFB200 #F46D00`
  with cream highlights `#FFFDF3 #FFF6D3 #FFF6C5 #FFF4C5 #FDFBEE`.
- Pure vector (no embedded raster).
- **Themeable slot:** this control is rendered in the warm/gold theme as exported;
  the purple `#9A41FE` does NOT appear here — the active-tab fill is the slot that
  recolors per theme (orange gradient stack above).

## Map pattern-bg — set `1:6034` (5 path pieces)

- Pieces (top-level COMPONENT variants): Start, Mid-right-to-left, Mid-left-to-right,
  End-left-to-right, End-right-to-left.
- Set frame: `339 x 390`, radius `5`, `flex-col`, padding `20`, clipped.
- Each piece: a filled "lane" path (`#9A41FE` then `white @0.95` overlay) plus a
  dashed centre line (`stroke #9A41FE width:3 dasharray:10 15`, with a
  `white @0.25` dashed overlay). End pieces use an alpha mask with a
  `#807AFF` linear-gradient fade.
- **Themeable slot:** `#9A41FE` (every lane fill + dashed line). The `#807AFF`
  gradient on End pieces is a secondary accent.
- Files: `all-pieces.svg` (full 339x390 composition, master dashed border stripped),
  `start.svg` + `mid-right-to-left.svg` (clean origin-normalized 299x70 standalones).

## Bobi Level_banner — set `1:5140` (6 variants) — NOT EXPORTED (blocked)

- Variants theme1..theme6, each COMPONENT `390 x 240`, radius `5`, clipped,
  `shadow 0 4 4 rgba(255,255,255,0.25)`.
- These are RASTER photo composites (multiple `<img>` fills with imageRefs:
  e.g. `7130770449...`, `017740acb...`, `a6a8fd2d...`) — must be exported as PNG@2x
  via `framelink download_figma_images`, NOT as SVG.
- **BLOCKED:** framelink returned a hard `429` (account/seat-level rate limit,
  retry-after ~4.6 days, "Viewer/starter plan limited API access"). Could not
  fetch the 6 variant node IDs or their imageRefs. Banner PNGs are pending a
  rate-limit reset or a higher-tier Figma seat.
