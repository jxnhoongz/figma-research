# Figma → Code component map

Lightweight stand-in for Figma Code Connect. When the MCP returns a Figma
instance whose name matches the left column, reuse the right-column component.

| Figma layer name      | Code component | Key props |
|-----------------------|----------------|-----------|
| `Button`              | `<Button>`     | `ButtonHTMLAttributes` + `variant?: 'primary'\|'secondary'\|'disabled'`, `size?: 'md'\|'lg'`. `disabled` forces resolved variant `disabled`. CSS-based (uses `.bg-cta` gradient) so text is dynamic. Exposes `data-variant`. |
| `Tab switch`          | `<TabSwitch>`  | `tabs: {id,label}[]`, `active: string`, `onChange: (id) => void`, `className?`. `role="tablist"`/`"tab"`, `aria-selected`; active tab uses `.bg-tab-active`. `data-variant` = `active`\|`inactive`. |
| `Status Icon`         | `<StatusIcon>` | `status: 'locked'\|'active'\|'done'\|'fail'`, `className?`. Renders the REAL section2 SVG inline (`role="img"`, `aria-label="step <status>"`, `data-variant`). `done` (passed) carries the themeable accent (`currentColor`); `active`=gold star, `locked`/`fail`=grey (semantic, frozen). |
| `Bobi Level_banner`   | `<Banner>`     | `title?: string` (alt text only — art is baked into the PNG), `src?: string` (defaults to bundled `banner.png`), `className?`. Image-based `<header><img/></header>`. |
| `Reward Card`         | `<RewardCard>` | Generic label/amount card. `label: string`, `amount: string`, `claimed?: boolean`, `className?`. Brown label (`text-text-brown`), amount (`text-text-amount`), `rounded-card`, `.bg-card-grad`; claimed ⇒ reduced opacity. `data-testid="reward-card"`, `data-variant` = `claimed`\|`unclaimed`. |
| `Frame 1410102067` (nav bar) | `<NavHeader>` | White nav bar above the banner. `title: string`, `onBack?: () => void`, `className?`. Status-bar spacer + left back chevron (`aria-label="back"`) + centered navy title (`text-nav-title` = `#110940`). `data-testid="nav-header"`, `data-variant="with-statusbar"`. |
| `Frame 1410107570` (rewards table, node `1:1197`) | `<RewardTable>` | 活动详情 rewards grid. Generic, data-driven: `columns: {id,label,align?,width?}[]`, `rows: {id,cells:string[],highlightCells?:number[],highlight?}[]` (positional — `cells.length` must equal `columns.length` or it throws), `className?`. `width` (e.g. `'22.8%'`) renders a `<colgroup>` (Figma label col 80/350, value cols 45.5/350). Accent-driven header (`bg-table-header` → `var(--theme-accent)`) with white text; the striped body (`bg-table-stripe`) and cell borders (`border-table-border`) are `color-mix` tints of the same accent, so the WHOLE table recolors on theme switch (not just the header); `rounded-table`. **Highlight is per-CELL, not per-row** — `highlightCells` lists column indices to render in `text-table-highlight` (fixed blue #0943D5, fw-400); Figma highlights ONLY 第一关/2倍 (8元), node 1:1227. `highlight:true` is a convenience that lights up cell index 2. Semantic `<table>`/`<th scope=col>`/`<td>`. `data-testid="reward-table"`; each `<tr data-testid="reward-row-<id>" data-stripe="odd\|even" data-highlight>`; highlighted `<td data-highlight="true">`. |
| `Steps List` (frame `1:1020`, the 闯关排列 box) | `<StepsContainer>` | The frosted container frame that wraps ALL step cards. NOT a registered Figma component (a copy-pasted plain frame) — captured from the screen structure, not the master list. Props: `title: string` (header pill, 闯关排列), `children: ReactNode` (the `<li>` step cards), `className?`. Renders a frosted gradient box (`.bg-steps-container`, 3px `white/60` border, `rounded-card`) with the title pill straddling the top edge, the real serpentine map path (`<AllPieces>`) as an absolute `z-0` background layer, and the cards in a `z-10` `<ol>` overlapping it. `data-testid="steps-container"`. |
| `Component 38`        | `<StepCard>`   | The repeated STEP CARD (Figma id 1:5062), rendered with the REAL section2 SVG chrome as the card background (rounded body + map-path pointer tab + right reward wedge) and content overlaid. Props: `status`, `title`, `requirement`, `statusText`, `amount`, `side?: 'left'\|'right'` (which way the pointer tab juts), `active?`, `claimable?`, `claimed?`, `stats?: {label,value,unit?}[]`, `onClaim?`, `className?`. `passed` chrome carries the themeable accent (`currentColor`); `current`=orange active card with stats on the white panel; `locked`/`fail`=grey. `data-testid="step-card"`, `data-variant` = `active`\|`default`, `data-side`. |

## Section 3 Replicated — 点击领取 (click to claim)

| Figma layer name | Code component | Key props |
|------------------|----------------|-----------|
| `Frame 1410162775` (progress card area) | `<ProgressCard>` | Created for Section 3 replicated. `data: ProgressData` (currentBet, nextTierGap, target, progressRatio 0–1, claimAmount), `onClaim?`, `claimed?`, `className?`. Three stat columns + progress bar + claim button. Button disables on `claimed`. `data-testid="progress-card"`, `data-variant="unclaimed\|claimed"`. |
| `Frame 1410162776` → `Frame 1410162753` (4×3 reward card grid) | `<RewardGrid>` | Created for Section 3 replicated. `items: RewardGridItem[]` (`{id, src, alt, current?}`), `className?`. 4-column CSS grid of baked PNG reward card images. Optional `current` flag overlays a 当前 badge. `data-testid="reward-grid"`, `data-variant="grid"`. |

## Section 5 — 中秋大转盘 (Moon Festival lottery wheel)

| Figma layer name | Code component | Key props |
|------------------|----------------|-----------|
| _(any plugin-export screen frame)_ | `<SceneRenderer>` | Generic, data-driven reconstruction of a screen. `scene: Scene` (from `scripts/build-section-scene.mjs`), `assetUrl: (src) => string \| undefined` (resolves a scene `src` filename to a bundled URL), `className?`. Renders each node absolutely at its exact Figma coordinate (`rect` = container fill incl. CSS gradients, `img` = exported asset, `text` = loose/overlay text). Array order = paint order. Single-line text gets symmetric horizontal slack so system-font width doesn't mis-wrap CJK labels. `data-testid="scene"`; text nodes `data-testid="scene-text"`. |
| `3. 中秋大转盘-Moon Festival 17` | `<MoonFestival>` | Section 5 screen, reconstructed 1:1 from `scene.json` via `<SceneRenderer>`. Presentational, `className?`. Art is baked (no per-theme recolor). Regenerate: `node scripts/build-section-scene.mjs <exportDir> "3. 中秋大转盘-Moon Festival 17" src/assets/section5/img src/screens/MoonFestival/scene.json`. |
| `升级模式-theme1`…`-theme6` (frames) | `<Section6>` | Section 6 screen (升级模式, upgrade mode), reconstructed 1:1 from per-theme `scenes/themeN.json` via `<SceneRenderer>`. Presentational, `className?`, `themeId?` (selects the variant scene). 6 genuinely distinct palettes — art is baked, no algorithmic recolor. Regenerate per theme: `node scripts/build-section-scene.mjs <exportDir> "升级模式-themeN" src/assets/section6/img src/screens/Section6/scenes/themeN.json`. |
| `贵宾会员晋级奖-领取彩金` ×6 (sibling frames) | `<Section7>` | Section 7 screen (VIP promotion reward — claim bonus), reconstructed 1:1 from per-theme `scenes/themeN.json` via `<SceneRenderer>`. Presentational, `className?`, `themeId?` (selects the variant scene). 6 sibling frames share one name, so regenerate per theme by node id: `node scripts/build-section-scene.mjs <exportDir> "<frameId>" src/assets/section7/img src/screens/Section7/scenes/themeN.json` (ids theme1…6 = `2:33909`, `2:37357`, `2:40805`, `2:44253`, `2:47701`, `2:51149`). |

`scripts/build-section-scene.mjs` replays the exporter's dedup classification to
map every on-screen node occurrence back to its deduped asset file, normalises
positions to the screen origin, and emits an ordered `scene.json` + copied
assets. Reusable path for any future section: export →
`import-figma-export.mjs` → `build-section-scene.mjs` → `<SceneRenderer>`.

## Theming + generated SVGs

The kit SVGs (status-icon, component-38, tab-switch, map-pattern) are converted
to themeable React components by `scripts/gen-svg-components.mjs` (output in
`src/components/svg/generated/`, re-exported from `src/components/svg/index.ts`).
The script swaps the accent slot `#9A41FE` → `currentColor` and namespaces all
SVG ids so multiple instances never collide. A parent that sets
`color: var(--theme-accent)` recolors every accent live. The 6 themes live in
`src/lib/themes.ts`; the screen takes a `themeId` prop and sets
`--theme-accent`/`--theme-bg` (also driving `--color-screen` + `--color-table-header`).
The switcher UI lives in `src/App.tsx`. Semantic colors (locked grey, current
gold, CTA orange) are baked into the SVGs and never theme.

## Structured mode (experimental) — `build-ir.mjs`

`scripts/build-ir.mjs <unpackDir> "<screen id|name>" ir.json` turns an export
into a semantic IR (roles: layout/component/content/interactive/asset) — the
foundation for emitting componentized, data-driven code (vs the flat scene the
renderer uses today). Pure analysis; no code emission yet. Shares fill/box
helpers with the scene generator via `scripts/lib/figma.mjs`. Spec:
`docs/superpowers/specs/2026-06-22-semantic-ir-foundation-design.md`.

The plugin also emits `chrome.json` (`instanceId → text-less image path`): each
text-bearing instance rendered with its TEXT hidden, so a generated component can
overlay live data-driven text on a clean background (the basis for editable
cards). Additive — `manifest.json` and the scene pipeline are unchanged. Spec:
`docs/superpowers/specs/2026-06-22-plugin-chrome-export-design.md`.

## Manual validation: chrome export

The plugin runs in the Figma sandbox and has no automated test. After changing
chrome-export logic, the user validates by re-exporting:

1. Reload the plugin in Figma (Plugins → Development), run it on the Section 3 frame.
2. Unpack the bundle; confirm `chrome.json` exists and maps the reward-card and
   button instance ids to `chrome/…` paths.
3. Open a reward-card `chrome/…` image: background + icon present, **text gone**.
4. **Reflow:** open the button (`立即领取`) chrome image — the coin icon sits in
   its real position (next to where the amount goes), **not** re-centered.
5. **Dedup:** `export-stats.json` shows a higher `deduped` count and fewer files
   in `svg/` than a pre-dedup export; spot-check that two identical icons now map
   to the SAME path in `manifest.json`. (Asset filenames in `manifest.json` /
   regenerated scenes may change vs the pre-dedup export — they still render
   identically, since only visually-identical SVGs are merged.)
